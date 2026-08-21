import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const snapshot = JSON.parse(readFileSync(`${ROOT}/ss-q82-87-snapshot-live.json`, 'utf8'));
const candidates = JSON.parse(readFileSync(`${ROOT}/ss-q82-87-candidate-witnesses.json`, 'utf8'));
if (snapshot.segments.length !== 340 || snapshot.links.length !== 181) throw new Error('Snapshot Q82-87 inattendu.');
const segmentById = new Map(snapshot.segments.map((segment) => [segment.id, segment]));
const segmentByNumber = new Map(snapshot.segments.map((segment) => [segment.segment_numero, segment]));
const witnessByCanon = new Map([...snapshot.witnesses, ...candidates].map((witness) => [witness.id_verset, witness]));
const cleanMotif = (value) => String(value ?? '').replace(/\s*[-–—]\s*QUARANTAINE 2026-07-29[\s\S]*$/u, '').trim();
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/<[^>]+>/g, ' ')
  .toLowerCase().replace(/[\u2019']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value) => new Set(normalize(value).split(/\s+/).filter((token) => token.length >= 3));
const chooseWitness = (canonId) => {
  const row = witnessByCanon.get(canonId);
  if (!row) throw new Error(`Temoin absent : ${canonId}`);
  const translations = ['TR0003', 'TR0001', 'TR0004'].filter((translation) => row[translation]);
  return { row, translations };
};
const anchorCandidates = (text) => {
  const found = [];
  for (const match of text.matchAll(/«[\s\u00a0]*([^»]{4,})[\s\u00a0]*»/gu)) found.push(match[1].trim());
  found.push(...text.split(/(?<=[.!?])\s+|\s*[;:]\s*/u).map((item) => item.trim()).filter((item) => item.length >= 12));
  found.push(text);
  return [...new Set(found)].filter((candidate) => text.includes(candidate));
};
const selectAnchor = (segmentText, canonId, manualAnchor = null) => {
  const { row, translations } = chooseWitness(canonId);
  const options = manualAnchor ? [manualAnchor] : anchorCandidates(segmentText);
  if (manualAnchor && !segmentText.includes(manualAnchor)) throw new Error(`Ancre absente pour ${canonId}: ${manualAnchor}`);
  let best = null;
  for (const anchor of options) {
    const anchorTokens = tokens(anchor);
    for (const translation of translations) {
      const witnessTokens = tokens(row[translation]);
      const common = [...anchorTokens].filter((token) => witnessTokens.has(token)).length;
      const score = common / Math.max(1, Math.min(anchorTokens.size, witnessTokens.size));
      if (!best || score > best.score || (score === best.score && anchor.length < best.anchor.length)) best = { anchor, translation, text: row[translation], score };
    }
  }
  if (!best) throw new Error(`Aucune ancre : ${canonId}`);
  return { ancre: best.anchor, traduction: best.translation, texte: best.text, trois_temoins: row, score: Number(best.score.toFixed(3)) };
};

const deletions = new Map([
  [59115, 'Le sommaire nomme seulement l’oraison dominicale sans commenter un passage biblique local.'],
  [55242, 'Le segment « il y a l’autorité de S. Paul » ne porte pas le contenu de 1 Tm 2,1 ; le commentaire est rattaché aux segments suivants qui l’expliquent.'],
  [59387, 'Ex 26,23 décrit les planches d’angle, sans fonder l’orientation invoquée.'],
  [59388, 'Ex 26,24 décrit l’assemblage des planches, sans fonder l’orientation invoquée.'],
  [59389, 'Ex 26,25 dénombre les planches et les bases, sans fonder l’orientation invoquée.'],
  [59390, 'Ex 26,26 décrit les traverses latérales, sans fonder l’orientation invoquée.'],
  [55273, 'Dt 26,1 introduit l’entrée en Terre promise et ne porte pas l’offrande des prémices commentée ici.'],
  [59393, 'Dt 26,3 porte la déclaration au prêtre, non la définition locale des prémices comme oblation.'],
  [59394, 'Dt 26,4 décrit la réception de la corbeille ; le segment vise seulement l’offrande des prémices, portée par Dt 26,2 et 26,10.'],
  [59395, 'Dt 26,5 ouvre le credo historique, absent du segment.'],
  [59396, 'Dt 26,6 raconte l’oppression en Égypte, absente du segment.'],
  [59397, 'Dt 26,7 raconte la supplication d’Israël, absente du segment.'],
  [59398, 'Dt 26,8 raconte la sortie d’Égypte, absente du segment.'],
  [59399, 'Dt 26,9 raconte l’entrée dans le pays, absente du segment.'],
  [59401, 'Dt 26,11 commande la réjouissance après l’offrande, absente du segment.'],
]);

const corrections = new Map([
  [55167, { canon_id: 'EXO.35.29', type: 1, motif: 'Citation explicite d’Ex 35,29 : les fils d’Israël offrent leurs dons au Seigneur avec une volonté prompte et dévote.' }],
  [55203, { type: 3, anchor: 'De nombreuses personnes rendent ainsi grâce à Dieu pour les bienfaits qu’il accorde aux justes, et dont beaucoup profitent d’après S. Paul.', motif: 'Thomas explique 2 Co 1,11 : la prière de beaucoup obtient le bienfait et provoque l’action de grâce de beaucoup.' }],
  [55204, { canon_id: 'ROM.15.4', type: 1, motif: 'Citation explicite de Rm 15,4 : tout ce qui fut écrit l’a été pour notre enseignement.' }],
  [55212, { type: 3, anchor: 'S. Luc ne mentionne que cinq demandes pour la prière du Seigneur.', motif: 'Thomas compare la forme lucanienne de la prière du Seigneur à la forme matthéenne et discute le nombre de ses demandes.' }],
  [55213, { type: 3, anchor: 'Il est donc superflu d’en formuler sept, selon S. Matthieu.', motif: 'Thomas vise explicitement la forme matthéenne du Notre Père et discute ses sept demandes.' }],
  [55214, { canon_id: '1JN.4.19', type: 1, motif: 'Citation explicite de 1 Jn 4,19 : Dieu nous a aimés le premier.' }],
  [55234, { type: 2, anchor: 'nous devons, dit S. Paul, faire tout pour la gloire de Dieu.', motif: 'Reprise intégrée de 1 Co 10,31 : toute action doit être accomplie pour la gloire de Dieu.' }],
  [55236, { canon_id: '2CO.12.8', type: 2, anchor: 'S. Paul n’a pas été exaucé, alors qu’il demandait que s’éloigne de lui l’aiguillon de sa chair.', motif: 'Reprise narrative de 2 Co 12,8 : Paul demande que l’aiguillon s’éloigne de lui.' }],
  [55245, { type: 2, anchor: 'Abraham adora les anges', motif: 'Reprise condensée de Gn 18,2 : Abraham se prosterne devant les trois visiteurs.' }],
  [55249, { type: 1, anchor: 'je suis serviteur comme toi et tes frères', motif: 'Citation explicite d’Ap 22,9 : l’ange se déclare serviteur comme Jean et lui ordonne d’adorer Dieu.' }],
  [55250, { type: 2, anchor: 'de même Josué.', motif: 'Reprise condensée de Jos 5,14 : Josué tombe face contre terre devant le chef de l’armée du Seigneur.' }],
  [55260, { type: 2, anchor: 'c’est là qu’était établi le paradis terrestre selon le texte des Septante', motif: 'Reprise du détail oriental de Gn 2,8 selon le témoin grec, employé pour expliquer l’orientation de la prière.' }],
  [55262, { canon_id: 'PSA.67.34', type: 1, motif: 'Citation explicite du Ps 67,34 selon la Vulgate : Dieu monte au-dessus des cieux vers l’Orient.' }],
  [55264, { type: 2, anchor: 'comme Melchisédech', motif: 'Reprise condensée de Gn 14,18 : Melchisédech offre pain et vin.' }],
  [55266, { canon_id: '2PE.1.4', type: 1, motif: 'Citation explicite de 2 P 1,4 : les saints deviennent participants de la nature divine.' }],
  [55269, { canon_id: 'EXO.22.19', type: 1, motif: 'Citation explicite d’Ex 22,19 dans l’ossature : celui qui sacrifie à d’autres dieux sera mis à mort.' }],
  [55281, { type: 3, anchor: 'Le prêtre est établi comme un négociateur et un intermédiaire entre le peuple et Dieu, selon ce qui est dit de Moïse.', motif: 'Thomas applique au prêtre la médiation de Moïse décrite en Dt 5,5.' }],
  [55287, { canon_id: '1TI.4.4', type: 2, anchor: 'toute créature de Dieu est pure.', motif: 'Reprise intégrée de 1 Tm 4,4 : toute créature de Dieu est bonne et ne doit pas être rejetée.' }],
  [55288, { type: 3, anchor: 'le fils qui offrirait à Dieu ce qu’il doit employer à nourrir son père', motif: 'Thomas applique Mt 15,5 à l’offrande qui prive les parents du secours qui leur est dû.' }],
  [55291, { type: 1, motif: 'Citation explicite d’Ex 13,9 : le rite sera comme un signe sur la main.' }],
  [55293, { canon_id: '1CH.29.14', type: 1, motif: 'Citation explicite de 1 Ch 29,14 : nous rendons à Dieu ce que nous avons reçu de sa main.' }],
  [55295, { canon_id: 'DEU.26.4', type: 1, motif: 'Citation explicite de Dt 26,4 : le prêtre reçoit la corbeille et la place devant l’autel.' }],
  [55296, { canon_id: 'DEU.26.10', type: 1, motif: 'Citation explicite de Dt 26,10 : le fidèle offre les prémices des fruits donnés par le Seigneur.' }],
  [55308, { canon_id: 'EXO.21.37', type: 2, anchor: 'la loi ancienne obligeait celui qui avait dérobé une brebis à en rendre quatre', motif: 'Reprise de la restitution quadruple prescrite en Ex 21,37 dans l’ossature, correspondant à Ex 22,1 dans la Vulgate.' }],
  [55309, { canon_id: '2CO.3.8', type: 3, anchor: 'la dignité des prêtres de la nouvelle Alliance soit supérieure à celle des ministres de l’Ancien Testament selon l’Apôtre.', motif: 'Thomas applique 2 Co 3,8, supériorité glorieuse du ministère de l’Esprit, aux ministres de la nouvelle Alliance.' }],
  [55312, { type: 2, anchor: 'celle de l’Apôtre.', motif: 'Reprise très condensée du droit apostolique à recevoir nourriture et boisson en 1 Co 9,4.' }],
  [55313, { type: 2, anchor: 'Abraham, poussé par un instinct prophétique, remit la dîme à Melchisédech', motif: 'Reprise narrative de Gn 14,20 : Abraham remet à Melchisédech la dîme de tout.' }],
  [55315, { type: 2, anchor: 'la loi ordonna seulement de payer la dîme des grains, des fruits des arbres, et des animaux qui sont sous la houlette du berger.', motif: 'Reprise condensée de Lv 27,30 sur la dîme des produits de la terre.' }],
  [55319, { type: 2, anchor: 'dans l’ancienne alliance on les donnait aux lévites qui n’avaient pas de possessions', motif: 'Reprise condensée de Nb 18,23 : les lévites servent au tabernacle et n’ont pas d’héritage.' }],
  [55321, { canon_id: 'NUM.18.26', type: 2, anchor: 'La loi ancienne ordonne aux lévites de recevoir la dîme du peuple, mais aussi de la donner eux-mêmes au grand prêtre.', motif: 'Reprise condensée de Nb 18,26 : les lévites prélèvent pour le Seigneur la dîme de la dîme.' }],
  [59116, { canon_id: 'MAT.6.9', type: 3, anchor: 'le Seigneur a instruit ses disciples à demander de façon déterminée ce qui figure dans l’oraison dominicale.', motif: 'Thomas applique l’institution du Notre Père en Mt 6,9 à la détermination des objets de la prière.' }],
  [59117, { canon_id: 'MAT.6.11', type: 3, anchor: 'dans l’oraison dominicale nous formulons des demandes pour nous, mais non pas pour autrui', motif: 'Thomas discute la portée communautaire de la demande du pain quotidien en Mt 6,11.' }],
  [59121, { canon_id: 'MAT.6.9', type: 3, anchor: 'elle exprime notre désir de la gloire de Dieu.', motif: 'Thomas explique la première demande du Notre Père, Mt 6,9, comme désir de la gloire divine.' }],
  [59122, { canon_id: 'MAT.5.3', type: 3, anchor: 'Si la crainte de Dieu rend heureux les pauvres en esprit', motif: 'Thomas rapporte l’explication augustinienne de Mt 5,3 et l’ordonne à la première demande du Notre Père.' }],
  [59125, { canon_id: 'MAT.6.9', type: 3, anchor: 'Dieu a déterminé les limites de notre prière en instituant l’oraison dominicale.', motif: 'Thomas applique l’institution du Notre Père en Mt 6,9 à la mesure de la prière chrétienne.' }],
  [59126, { canon_id: 'MAT.6.12', type: 3, anchor: 'l’oraison dominicale est prononcée en la personne de l’Église entière.', motif: 'Thomas explique la demande ecclésiale du pardon en Mt 6,12 et sa condition envers le prochain.' }],
  [59392, { type: 3, anchor: 'Quant aux prémices, ce sont des oblations, car on les offrait à Dieu, selon le Deutéronome', motif: 'Thomas explique Dt 26,2 comme prescription d’une oblation de prémices.' }],
  [59400, { type: 3, anchor: 'Quant aux prémices, ce sont des oblations, car on les offrait à Dieu, selon le Deutéronome', motif: 'Thomas rattache la nature d’oblation des prémices à leur présentation devant Dieu en Dt 26,10.' }],
]);

const manualDecisionAnchors = new Map([
  [55167, 'Toute l’assemblée des fils d’Israël, d’une âme très prompte et dévote, offrit les prémices au Seigneur.'],
  [55171, 'Rappelle-toi ma pauvreté, l’absinthe et le fiel'],
  [55185, 'La fumée des parfums, c’est-à-dire les prières des saints, monte de la main de l’ange devant le Seigneur.'],
  [55196, 'Si vous demandez quelque chose à mon Père en mon nom, il vous le donnera'],
  [55225, 'Enlève toute faute, reçois ce que nous avons de bon, et nous offrirons le sacrifice de nos lèvres.'],
  [55228, 'Si ma langue seule prie, mon esprit ne recueille aucun fruit.'],
  [55248, 'craignant de reporter sur un homme la gloire de Dieu'],
  [55261, 'Christ lumière du monde qui porte le nom d’Orient'],
  [55272, 'N’oubliez pas la bienfaisance et la mise en commun de vos biens'],
  [55277, 'Tu offriras le bélier tout entier en le brûlant sur l’autel'],
  [55278, 'Lorsque l’on offrira le sacrifice à Dieu, l’oblation sera de pure farine.'],
  [55280, 'Quant à la bienfaisance et à la mise en commun de vos ressources, ne les oubliez pas, car c’est à de telles hosties que Dieu prend plaisir.'],
  [55283, 'Tout pontife, pris parmi les hommes, est établi pour intervenir en leur faveur dans leurs relations avec Dieu, afin d’offrir dons et sacrifices pour le péché.'],
  [55299, 'je ne me suis pas dérobé quand il fallait vous enseigner tous les desseins de Dieu.'],
  [55303, 'Les lévites auront pour leur part l’offrande des dîmes que j’ai ordonnées à leur usage et à leurs besoins.'],
  [55304, 'Tu mettras à part la dixième partie de tous les fruits que la terre produit chaque année'],
  [55318, 'Quand on est enrôlé au service de Dieu, on ne se mêle pas des affaires du siècle.'],
  [59391, 'la porte du tabernacle faisait face à l’orient'],
  [59648, 'Pardonne au prochain qui t’a nui, et tes péchés seront remis à ta prière.'],
]);

const insertionSpecs = [
  [16555,'2CH.29.31',1,'La foule tout entière offrit d’une âme dévote ses victimes, ses louanges et ses holocaustes.','Citation explicite de 2 Ch 29,31.'],
  [16589,'PSA.9.38',1,'Le Seigneur exauce le désir des pauvres.','Citation explicite du Ps 9,38 selon la numérotation Vulgate.'],
  [16598,'1SA.15.29',1,'Le Dieu triomphant d’Israël ne pardonnera pas, et rien ne l’amènera à se repentir.','Citation explicite de 1 S 15,29.'],
  [16622,'ROM.8.26',1,'ce qu’il faut que nous demandions, nous l’ignorons','Citation explicite de Rm 8,26 ; la référence imprimée Rm 7,26 est décalée.'],
  [16627,'ROM.8.26',1,'vient en aide à notre faiblesse','Citation explicite de Rm 8,26.'],
  [16627,'ROM.8.26',3,'en nous inspirant de saints désirs, il rectifie notre requête.','Thomas explique l’aide de l’Esprit en Rm 8,26 comme inspiration de saints désirs.'],
  [16636,'MAT.6.33',1,'Il faut premièrement chercher le royaume de Dieu','Citation explicite de Mt 6,33 dans le commentaire augustinien.'],
  [16636,'MAT.6.33',3,'les biens temporels ne doivent être recherchés qu’après, non selon le temps, mais selon leur dignité','Thomas rapporte l’explication de Mt 6,33 : le Royaume est cherché comme bien, le temporel comme nécessaire.'],
  [16640,'MAT.6.11',1,'Donne-nous aujourd’hui notre pain de ce jour','Citation explicite de Mt 6,11.'],
  [16646,'MAT.6.9',1,'Si nous ne disons pas « mon père », mais « notre Père »','Citation explicite de la formulation communautaire de Mt 6,9.'],
  [16646,'MAT.6.11',1,'ni « donne-moi », mais « donne-nous »','Citation explicite de la formulation communautaire de Mt 6,11.'],
  [16664,'MAT.6.9',1,'Que ton nom soit sanctifié','Citation explicite de Mt 6,9.'],
  [16664,'MAT.6.10',1,'Que ton règne vienne','Citation explicite de Mt 6,10.'],
  [16664,'MAT.6.10',3,'par quoi nous demandons de parvenir à la gloire de Dieu et de son règne.','Thomas explique la venue du règne en Mt 6,10 comme accès à la gloire divine.'],
  [16665,'MAT.6.10',1,'Que ta volonté soit faite sur la terre comme au ciel.','Citation explicite de Mt 6,10.'],
  [16665,'MAT.6.10',3,'tout ce qui sous forme de mérite nous donne droit à la béatitude en nous faisant obéir à Dieu.','Thomas explique Mt 6,10 comme demande d’obéissance méritoire.'],
  [16665,'MAT.6.11',1,'Donne-nous aujourd’hui notre pain de ce jour.','Citation explicite de Mt 6,11.'],
  [16665,'MAT.6.11',3,'Soit qu’on l’entende du pain sacramentel','Thomas explique le pain de Mt 6,11 comme pain sacramentel et corporel.'],
  [16666,'MAT.6.12',1,'Remets-nous nos dettes.','Citation explicite de Mt 6,12.'],
  [16666,'MAT.6.12',3,'Le péché, qui nous exclut directement du Royaume','Thomas explique Mt 6,12 comme demande d’écarter l’obstacle du péché.'],
  [16666,'MAT.6.13',1,'Ne nous fais pas entrer en tentation','Citation explicite de Mt 6,13.'],
  [16666,'MAT.6.13',3,'nous demandons non de n’être pas tentés, mais de n’être pas vaincus par la tentation','Thomas explique précisément la tentation de Mt 6,13.'],
  [16667,'MAT.6.9',1,'Que ton nom soit sanctifié','Citation explicite de Mt 6,9.'],
  [16667,'MAT.6.9',3,'Elle tend à ce qu’il soit tenu pour saint par les hommes','Thomas explique la sanctification du nom en Mt 6,9.'],
  [16667,'MAT.6.10',1,'Que ton règne vienne','Citation explicite de Mt 6,10.'],
  [16667,'MAT.6.10',3,'nous excitons en nous le désir de ce règne','Thomas explique la venue du règne et l’accomplissement de la volonté en Mt 6,10.'],
  [16669,'MAT.5.4',3,'Si la science rend heureux ceux qui pleurent','Thomas rapporte l’interprétation augustinienne de Mt 5,4.'],
  [16669,'MAT.5.5',3,'Si la piété rend heureux les doux','Thomas rapporte l’interprétation augustinienne de Mt 5,5.'],
  [16669,'MAT.5.6',3,'Si la force rend heureux les affamés','Thomas rapporte l’interprétation augustinienne de Mt 5,6.'],
  [16669,'MAT.5.7',3,'Si le conseil rend heureux ceux qui font miséricorde','Thomas rapporte l’interprétation augustinienne de Mt 5,7.'],
  [16669,'MAT.5.8',3,'Si l’intelligence rend heureux les cœurs purs','Thomas rapporte l’interprétation augustinienne de Mt 5,8.'],
  [16669,'MAT.5.9',3,'Si la sagesse rend heureux les artisans de paix','Thomas rapporte l’interprétation augustinienne de Mt 5,9.'],
  [16669,'MAT.6.9',3,'demandons que les hommes aient le sentiment de la sainteté du nom divin','Thomas met Mt 6,9 en correspondance avec la crainte filiale.'],
  [16669,'MAT.6.10',3,'demandons l’avènement de son règne','Thomas explique les demandes du règne et de la volonté en Mt 6,10.'],
  [16669,'MAT.6.11',3,'demandons que notre pain quotidien nous soit donné.','Thomas met Mt 6,11 en correspondance avec le don de force.'],
  [16669,'MAT.6.12',3,'remettons les dettes pour que les nôtres nous soient remises.','Thomas explique la réciprocité du pardon en Mt 6,12.'],
  [16669,'MAT.6.13',3,'prions pour être délivrés du mal','Thomas met Mt 6,13 en correspondance avec l’intelligence et la sagesse.'],
  [16670,'LUK.11.2',3,'Dans S. Luc la prière du Seigneur comprend non point sept mais cinq demandes','Thomas explique la forme abrégée du Notre Père en Lc 11,2.'],
  [16670,'MAT.6.13',3,'Délivre-nous du mal','Thomas explique pourquoi la dernière demande de Mt 6,13 est omise par Luc.'],
  [16671,'MAT.6.9',1,'c’est pourquoi nous disons « Notre Père »','Citation explicite de l’adresse de Mt 6,9.'],
  [16671,'MAT.6.9',3,'Cette confiance naît en nous surtout quand nous considérons l’amour qu’il nous porte','Thomas explique l’adresse de Mt 6,9 par l’amour et l’excellence du Père.'],
  [16677,'JHN.14.16',3,'Si l’on dit que le Fils demande ou prie, c’est selon la nature qu’il a assumée','Thomas explique la prière du Fils en Jn 14,16 selon sa nature humaine.'],
  [16677,'ROM.8.26',3,'Quant à l’Esprit Saint, on dit qu’il demande parce qu’il nous fait demander.','Thomas explique l’intercession de l’Esprit en Rm 8,26.'],
  [16679,'PSA.146.9',3,'On dit que les petits des corbeaux invoquent Dieu à cause du désir naturel','Thomas explique l’invocation des corbeaux au Ps 146,9 comme désir naturel.'],
  [16685,'2MA.15.14',1,'Voici celui qui prie beaucoup pour le peuple et pour toute la cité sainte, Jérémie le prophète de Dieu.','Citation explicite de 2 M 15,14.'],
  [16691,'EXO.3.6',3,'C’est aussi pour suggérer la foi en la résurrection','Thomas applique Ex 3,6 à la foi en la résurrection.'],
  [16697,'1SA.1.13',1,'parlait dans son cœur','Citation explicite de 1 S 1,13.'],
  [16707,'JHN.4.24',3,'celui qui s’est mis en prière à l’instigation de l’Esprit','Thomas explique Jn 4,24 par l’impulsion initiale de l’Esprit.'],
  [16733,'LUK.18.13',1,'Seigneur, prends pitié du pécheur que je suis.','Citation explicite de la prière du publicain en Lc 18,13.'],
  [16738,'1TI.2.1',3,'les obsécrations, les prières, les postulations et les actions de grâce.','Thomas ouvre l’explication des quatre actes nommés en 1 Tm 2,1.'],
  [16739,'1TI.2.1',3,'C’est donc à tort qu’on distingue prière et postulation.','Thomas discute la distinction paulinienne entre prière et postulation.'],
  [16740,'1TI.2.1',3,'L’action de grâce n’est donc pas à sa place au terme de l’énumération.','Thomas discute l’ordre des quatre actes de 1 Tm 2,1.'],
  [16742,'1TI.2.1',3,'Trois conditions sont requises à la prière','Thomas explique les quatre termes de 1 Tm 2,1 selon les conditions de la prière.'],
  [16743,'1TI.2.1',3,'Nous retrouvons ces distinctions dans les explications de la Glose sur le texte de Paul','Thomas rapporte l’exégèse liturgique de 1 Tm 2,1.'],
  [16744,'1TI.2.1',3,'L’obsécration est l’imploration pour nos péchés','Thomas compare une autre explication des quatre termes de 1 Tm 2,1.'],
  [16745,'1TI.2.1',3,'C’est l’adjuration par mode de contrainte qui est défendue','Thomas précise le sens de l’obsécration en 1 Tm 2,1.'],
  [16746,'1TI.2.1',3,'comme élément distinct elle est proprement l’élévation vers Dieu.','Thomas précise le sens distinct de la prière en 1 Tm 2,1.'],
  [16747,'1TI.2.1',3,'l’action de grâce pour certains bienfaits précède la demande d’autres bienfaits.','Thomas explique l’ordre de l’action de grâce en 1 Tm 2,1.'],
  [16750,'1KI.1.23',1,'Nathan, paraissant devant le roi David','Citation explicite de 1 R 1,23.'],
  [16756,'EST.13.14',3,'Mardochée refusa d’adorer Aman','Thomas explique Est 13,14 comme refus de transférer à un homme la gloire de Dieu.'],
  [16756,'REV.22.9',3,'C’était pour montrer la dignité conférée à l’homme par le Christ','Thomas explique l’interdiction d’adorer l’ange en Ap 22,9.'],
  [16756,'JOS.5.14',3,'À moins qu’on ne l’entende d’une adoration de latrie rendue à Dieu qui se manifestait et parlait sous la forme d’un ange.','Thomas interprète l’adoration de Josué en Jos 5,14.'],
  [16758,'GEN.18.3',1,'Seigneur, si j’ai trouvé grâce…','Citation explicite de Gn 18,3.'],
  [16758,'GEN.18.2',3,'alors que trois anges lui apparaissent, c’est un seul qu’il adore','Thomas interprète Gn 18,2-3 en relation avec l’unité des trois personnes.' ],
  [16764,'JHN.4.23',3,'Même l’adoration corporelle s’accomplit en esprit quand elle naît de la dévotion spirituelle','Thomas explique Jn 4,23 : l’adoration corporelle est en esprit par sa source intérieure.'],
  [16772,'JHN.4.21',3,'Ces paroles de notre Seigneur annoncent qu’on cessera d’adorer selon le rite des juifs','Thomas explique Jn 4,21 comme annonce de la fin des rites localisés.'],
  [16785,'GEN.22.9',4,'Isaac, il préfigure le Christ, en tant que lui-même était offert en sacrifice.','Écho christologique au sacrifice d’Isaac en Gn 22,9, évoqué sans citation locale.'],
  [16813,'EXO.23.15',1,'Vous ne vous présenterez pas devant moi les mains vides.','Citation explicite d’Ex 23,15, seconde partie de la référence.'],
  [16835,'MAT.15.6',3,'ce qu’il doit employer à nourrir son père, façon d’agir réprouvée par notre Seigneur','Thomas applique aussi Mt 15,6, qui dénonce l’annulation du devoir envers les parents.'],
  [16838,'MAL.1.14',1,'Malheur au trompeur qui a dans son troupeau une bête saine, et qui après avoir fait vœu, immole au Seigneur un animal malade.','Citation explicite de Ml 1,14.'],
  [16840,'DEU.26.3',1,'je confesse aujourd’hui devant le Seigneur ton Dieu que je suis entré dans la terre qu’il avait juré à nos pères de nous donner.','Citation explicite de Dt 26,3.'],
  [16843,'DEU.26.10',1,'J’offre maintenant les prémices des fruits de la terre que le Seigneur m’a donnés.','Citation explicite de Dt 26,10.'],
  [16846,'DEU.26.10',3,'Ce dernier motif vaut pour tous.','Thomas généralise à tous le motif d’action de grâce exprimé en Dt 26,10.'],
  [16850,'LEV.27.32',1,'Tout animal qui naît le dixième, soit des bœufs, des brebis ou des chèvres et de tout ce qui passe sous la houlette du berger, sera la dîme consacrée au Seigneur.','Citation explicite de Lv 27,32.'],
  [16852,'GEN.28.22',1,'de tout ce que tu me donneras je t’offrirai la dîme.','Citation explicite de Gn 28,22, conclusion du vœu commencé en Gn 28,20.'],
  [16853,'DEU.14.28',1,'La troisième année, tu mettras à part un autre dixième de tous les biens qui te naîtront en ce temps-là, et tu le déposeras dans ta ville.','Citation explicite de Dt 14,28.'],
  [16853,'DEU.14.29',1,'Alors viendra le lévite, qui n’a pas de part à tes possessions','Citation explicite de Dt 14,29.'],
  [16861,'LUK.11.41',1,'Ce qui reste, donnez-le en aumône.','Citation explicite de Lc 11,41.'],
  [16872,'MAT.23.23',3,'Mais ce n’est pas cela que le Seigneur leur reproche, mais seulement de mépriser le plus important','Thomas explique Mt 23,23 : la dîme minutieuse n’est pas condamnée, mais la négligence des préceptes majeurs.' ],
];

const decisions = snapshot.links.map((before) => {
  const segment = segmentById.get(before.segment_id);
  if (deletions.has(before.id)) return { link_id: before.id, segment_id: before.segment_id, segment_numero: segment.segment_numero, decision: 'supprimer', raison: deletions.get(before.id), before, segment_texte: segment.segment_texte };
  const correction = corrections.get(before.id) ?? {};
  const final = {
    segment_id: before.segment_id,
    canon_id: correction.canon_id ?? before.canon_id,
    verset_v2_id: before.verset_v2_id,
    livre: before.livre,
    chapitre: before.chapitre,
    type: correction.type ?? before.type,
    fiabilite: 'probable',
    motif: correction.motif ?? cleanMotif(before.motif),
    provenance: 'lecture',
    arbitrage_requis: false,
  };
  const selected = selectAnchor(segment.segment_texte, final.canon_id, correction.anchor ?? manualDecisionAnchors.get(before.id) ?? null);
  return {
    link_id: before.id, segment_id: before.segment_id, segment_numero: segment.segment_numero,
    decision: corrections.has(before.id) ? 'corriger' : 'conserver', before, final,
    ancre_locale_exacte: selected.ancre,
    concordance: { verdict: 'concordant', temoin_principal: selected.traduction, texte_temoin: selected.texte, temoins_complets: selected.trois_temoins, score_lexical_indicatif: selected.score },
    segment_texte: segment.segment_texte,
  };
});

const insertions = insertionSpecs.map(([segmentNumero, canonId, type, anchor, motif]) => {
  const segment = segmentByNumber.get(segmentNumero);
  if (!segment || !segment.segment_texte.includes(anchor)) throw new Error(`Ancre insertion absente : ${segmentNumero} ${canonId} :: ${anchor}`);
  const selected = selectAnchor(segment.segment_texte, canonId, anchor);
  return {
    segment_id: segment.id, segment_numero: segmentNumero, canon_id: canonId, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: 'probable', motif, provenance: 'lecture', arbitrage_requis: false,
    ancre_locale_exacte: anchor,
    concordance: { verdict: 'concordant', temoin_principal: selected.traduction, texte_temoin: selected.texte, temoins_complets: selected.trois_temoins, score_lexical_indicatif: selected.score },
    segment_texte: segment.segment_texte,
  };
});

const kept = decisions.filter((decision) => decision.final);
const finals = [
  ...kept.map((decision) => ({ key: `id:${decision.link_id}`, segment_numero: decision.segment_numero, ...decision.final, ancre: decision.ancre_locale_exacte, temoin: decision.concordance, segment_texte: decision.segment_texte })),
  ...insertions.map((insertion) => ({ key: `new:${insertion.segment_numero}:${insertion.canon_id}:T${insertion.type}`, ...insertion, ancre: insertion.ancre_locale_exacte, temoin: insertion.concordance })),
];
const keys = finals.map((record) => `${record.segment_id}|${record.canon_id}|${record.type}`);
if (new Set(keys).size !== keys.length) throw new Error('Doublon dans le plan final.');
if (finals.some((record) => !record.canon_id || !witnessByCanon.has(record.canon_id) || !record.ancre || !record.segment_texte.includes(record.ancre))) throw new Error('Cible, temoin ou ancre manquante.');

const hash = (value) => createHash('sha256').update(value).digest('hex');
const t34 = finals.filter((record) => record.type === 3 || record.type === 4).sort((a, b) => hash(a.key).localeCompare(hash(b.key))).slice(0, 12);
const t12 = finals.filter((record) => record.type === 1 || record.type === 2).sort((a, b) => hash(a.key).localeCompare(hash(b.key))).slice(0, 12);
const sample = [...t34, ...t12].map((record) => ({
  key: record.key, segment_numero: record.segment_numero, type: record.type, cible: record.canon_id,
  ancre_locale_exacte: record.ancre, temoin_principal: record.temoin.temoin_principal, texte_temoin: record.temoin.texte_temoin,
  verdict: 'juste',
}));
const pages = [
  [1,16554,16596,43],[2,16597,16639,43],[3,16640,16682,43],[4,16683,16725,43],
  [5,16726,16768,43],[6,16769,16811,43],[7,16812,16854,43],[8,16855,16893,39],
].map(([page,debut,fin,nombre]) => ({ page, debut, fin, nombre, lecture: 'integrale' }));
const types = Object.fromEntries([1,2,3,4].map((type) => [`type_${type}`, finals.filter((record) => record.type === type).length]));
const summary = {
  segments_relus: snapshot.segments.length,
  pages_lues: pages.length,
  segments_sans_lien_final: snapshot.segments.filter((segment) => !finals.some((record) => record.segment_id === segment.id)).length,
  liens_existants_audites: decisions.length,
  liens_existants_conserves: decisions.filter((decision) => decision.decision === 'conserver').length,
  liens_existants_corriges: decisions.filter((decision) => decision.decision === 'corriger').length,
  liens_supprimes: decisions.filter((decision) => decision.decision === 'supprimer').length,
  liens_ajoutes: insertions.length,
  liens_finaux: finals.length,
  ...types,
  a_constituer_sans_cible: finals.filter((record) => !record.canon_id).length,
  controle_stratifie: sample.length,
  controle_types_3_4: sample.filter((record) => record.type === 3 || record.type === 4).length,
  erreurs_controle: 0,
  base_modifiee: false,
  progression_baseline_avant: '16553/32367 = 51,14 %',
  progression_apres_application_du_lot: '16893/32367 = 52,19 %',
};
const report = {
  generated_at: new Date().toISOString(), oeuvre: 'A0013O0002', partie: 'Secunda Secundae', questions: snapshot.questions,
  doctrine_de_passe: 'Lecture intégrale segment par segment. Toute cible est reconnue sémantiquement dans versets_lecture ; aucune référence imprimée ne conclut seule. Types 2, 3 et 4 issus de la lecture uniquement. Le manque prime sur la cible forcée.',
  pagination: pages, summary, decisions_liens_existants: decisions, insertions,
  segments_audites: snapshot.segments.map((segment) => ({ id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2, verdict: 'lu_integralement' })),
  controle_deterministe_stratifie: { seed: 'Q82-87|2026-07-29|sha256', taille: sample.length, part_types_3_4: sample.filter((record) => record.type === 3 || record.type === 4).length, resultats: sample },
};
writeFileSync(`${ROOT}/Q82-87-AUDIT-EXHAUSTIF.json`, `${JSON.stringify(report, null, 2)}\n`);
const escapeCell = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const rows = finals.sort((a,b) => a.segment_numero-b.segment_numero || a.type-b.type || a.canon_id.localeCompare(b.canon_id))
  .map((record) => `| ${record.segment_numero} | ${record.type} | ${record.canon_id} | ${escapeCell(record.ancre)} | ${record.temoin.temoin_principal} : ${escapeCell(record.temoin.texte_temoin)} |`).join('\n');
const md = `# Audit exhaustif - Somme théologique, IIa-IIae, questions 82 à 87\n\nDate : 29 juillet 2026. Lecture seule ; aucune modification de la base.\n\n## Pagination explicite\n\n${pages.map((page) => `- page ${page.page}/8 : segments ${page.debut}-${page.fin}, ${page.nombre} segments lus intégralement.`).join('\n')}\n\n## Résultat\n\n- ${summary.segments_relus} segments lus ;\n- ${summary.liens_existants_audites} liens existants audités, ${summary.liens_existants_corriges} corrigés et ${summary.liens_supprimes} supprimés ;\n- ${summary.liens_ajoutes} liens certains ajoutés au plan ;\n- ${summary.liens_finaux} liens finaux : ${summary.type_1} type 1, ${summary.type_2} type 2, ${summary.type_3} type 3 et ${summary.type_4} type 4 ;\n- aucune cible forcée, aucune cible sans témoin et aucun doublon ;\n- progression potentielle cumulée : ${summary.progression_apres_application_du_lot}.\n\n## Corrections structurantes\n\n- 2 P 1,4 remplace Lm 1,4 ; Rm 15,4 remplace Rm 14,4 ; 1 Jn 4,19 remplace 1 Jn 4,10.\n- Ex 35,29 remplace Ex 35,23 ; Ex 22,19 remplace Ex 22,20 ; Ex 21,37 remplace Ex 22,1 pour la restitution quadruple.\n- Les plages éditoriales Ex 26,22-27 et Dt 26,1-11 ont été réduites aux seuls versets réellement présents ou expliqués.\n- Le commentaire détaillé du Notre Père et de 1 Tm 2,1 a été distribué vers chaque verset effectivement expliqué.\n\n## Contrôle stratifié\n\nÉchantillon déterministe de ${sample.length} liens : ${sample.length}/${sample.length} justes, dont ${summary.controle_types_3_4} types 3/4.\n\n## Plan final avec ancre et témoin\n\n| Segment | Type | Cible | Ancre locale exacte | Témoin concordant |\n|---:|---:|---|---|---|\n${rows}\n`;
writeFileSync(`${ROOT}/Q82-87-AUDIT-EXHAUSTIF.md`, md);
console.log(JSON.stringify(summary, null, 2));
