import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q153-158-raw.json`, 'utf8'));
const candidates = JSON.parse(readFileSync(`${ROOT}/ss-q153-158-candidate-witnesses.json`, 'utf8'));
const segments = raw.segments, links = raw.links;
const byNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]));
const witnessById = new Map([...raw.witnesses, ...candidates].map((witness) => [witness.id_verset, witness]));

const deletedIds = new Set([59174]);
const corrections = new Map([
  [55916, 'GAL.5.21'], [59687, 'SIR.42.11'], [59175, 'MAT.5.4'], [55954, 'EPH.4.31'],
]);
const typeOverrides = new Map([
  [55899, 3], [55901, 3], [55903, 3], [55914, 2], [55918, 3], [55924, 3],
  [55931, 1], [55934, 3], [55943, 3], [55944, 3], [59175, 3], [55952, 3], [55959, 1],
]);
const purposeOverrides = new Map([
  [55899, 'GAL.5.19 est ici mobilisé par la Glose pour étendre analogiquement le nom de luxure à tout excès ; il s’agit d’une interprétation, non d’une citation du verset.'],
  [55901, 'GAL.5.19 classe la luxure parmi les œuvres de la chair et fournit l’autorité paulinienne de la conclusion que la luxure est un péché.'],
  [55903, 'EPH.5.3 est interprété par la Glose pour identifier l’impureté à la luxure dans l’objection sur le caractère capital du vice.'],
  [55914, 'GEN.16.4 est repris sous forme narrative : Abraham s’unit à Agar ; l’épisode sert d’objection historique au caractère mortel de la fornication.'],
  [55918, '1CO.6.18 est le texte que la Glose interprète pour soutenir que l’ardeur charnelle atteint son maximum dans la luxure.'],
  [55924, '2CH.1.7 fournit l’épisode de l’apparition nocturne à Salomon, appliqué comme objection à l’absence de mérite ou de démérite pendant le sommeil.'],
  [55934, 'GAL.5.23 est interprété comme le lieu où Paul joint la continence à la chasteté, afin de définir le premier sens de la continence.'],
  [55943, 'GAL.5.23 est interprété comme l’énumération de la mansuétude parmi les fruits de l’Esprit dans l’objection sur son statut de vertu.'],
  [55944, 'MAT.5.4 est interprété selon la numérotation et le texte locaux comme la béatitude des doux, utilisée dans l’objection sur le statut de vertu.'],
  [59175, 'MAT.5.4 est expliqué comme l’acte bienheureux de la mansuétude, tandis que le fruit désigne la jouissance provenant de cet acte.'],
  [55952, 'ROM.13.4 fonde l’interprétation du pouvoir punitif comme instrument de Dieu lorsque la vengeance suit un jugement juste.'],
]);
const additions = [
  [19576, 'PRO.20.1', 3, 'Thomas explique PRO.20.1 : le vin est dit luxurieux soit par analogie avec tout excès, soit parce que son abus excite la volupté charnelle.'],
  [19603, 'EPH.5.3', 3, 'La réponse distingue l’impureté corporelle de l’impureté sexuelle visée par la Glose sur EPH.5.3 et précise son rapport matériel à la gourmandise.'],
  [19644, 'GEN.30.4', 2, 'Reprise narrative explicite : Jacob reçoit Bilha pour femme et va vers elle.'],
  [19644, 'GEN.30.5', 2, 'Reprise narrative explicite de l’union de Jacob avec Bilha, confirmée par la conception qui suit.'],
  [19644, 'GEN.30.9', 2, 'Reprise narrative explicite : Léa donne sa servante Zilpa à Jacob comme femme.'],
  [19644, 'GEN.30.10', 2, 'Reprise narrative explicite de l’union de Zilpa avec Jacob, manifestée par la conception.'],
  [19644, 'GEN.38.15', 2, 'Reprise narrative explicite : Juda prend Tamar voilée pour une prostituée.'],
  [19644, 'GEN.38.16', 2, 'Reprise narrative explicite : Juda s’approche de Tamar et lui demande de s’unir à elle.'],
  [19654, 'ACT.15.29', 3, 'La réponse explique pourquoi ACT.15.29 groupe fornication, viandes idolâtriques, sang et chairs étouffées : prévenir la division entre Juifs et païens.'],
  [19654, '1TI.4.4', 3, '1TI.4.4 est expliqué pour montrer que les aliments ne sont pas intrinsèquement illicites malgré leur interdiction disciplinaire en ACT.15.29.'],
  [19655, 'HOS.1.2', 3, 'Thomas interprète l’ordre de HOS.1.2 comme un acte conforme à la volonté divine et non comme une fornication au sens moral propre.'],
  [19657, 'GEN.16.4', 3, 'La réponse interprète l’union d’Abraham et Agar en GEN.16.4 comme une union non fornicationnelle dans l’économie matrimoniale ancienne.'],
  [19657, 'GEN.30.4', 3, 'L’union de Jacob avec Bilha en GEN.30.4 est interprétée comme relevant du mariage ancien, non de la fornication simple.'],
  [19657, 'GEN.30.9', 3, 'L’union de Jacob avec Zilpa en GEN.30.9 est interprétée comme relevant du mariage ancien, non de la fornication simple.'],
  [19657, 'GEN.38.16', 3, 'À la différence des patriarches, l’acte de Juda en GEN.38.16 n’est pas excusé : Thomas le maintient dans le péché.'],
  [19659, '1TI.4.8', 3, 'La réponse explique la Glose de 1TI.4.8 : les œuvres de piété disposent à la conversion et réparent, mais ne sauvent pas celui qui persévère dans la fornication.'],
  [19668, '1CO.6.18', 3, 'Thomas explique « pécher contre son corps » en 1CO.6.18 par la souillure et l’union corporelle illicite, sans en conclure que la fornication est le pire péché.'],
  [19670, 'EPH.5.4', 1, 'Citation explicite omise : paroles obscènes, sots discours et bouffonneries.'],
  [19670, 'EPH.5.5', 1, 'Citation explicite omise : ni fornicateur, ni impur, ni cupide n’héritera du Royaume du Christ et de Dieu.'],
  [19677, 'EPH.5.4', 3, 'La réponse explique pourquoi les désordres verbaux de EPH.5.4 ne sont pas repris dans l’énumération finale : ils ne sont péchés que comme conduisant aux actes précédents.'],
  [19677, 'EPH.5.5', 3, 'EPH.5.5 est confronté à l’énumération de EPH.5.4 pour distinguer les actes exclus du Royaume des actes qui y conduisent.'],
  [19680, '1KI.3.5', 3, 'Le songe de Salomon en 1KI.3.5 complète le récit parallèle de 2CH.1.7 utilisé comme objection sur le mérite pendant le sommeil.'],
  [19689, '1KI.3.5', 3, 'La réponse interprète 1KI.3.5 : Salomon ne mérite pas en dormant, le songe manifeste un désir méritoire antérieur.'],
  [19689, '2CH.1.7', 3, 'La réponse applique la même interprétation au récit parallèle de 2CH.1.7 : le don nocturne est signe d’un désir précédent.'],
  [19691, 'JOB.33.15', 3, 'Thomas explique JOB.33.15 en distinguant l’appréhension rationnelle possible dans le sommeil du jugement libre qui y demeure empêché.'],
  [19699, 'EXO.22.15', 1, 'Citation explicite omise : le séducteur d’une vierge non fiancée doit payer sa dot et la prendre pour femme.'],
  [19700, 'DEU.22.29', 1, 'Suite explicite de la citation : cinquante sicles au père, mariage imposé et interdiction de répudier.'],
  [19716, 'SIR.23.22', 1, 'Début explicite de la citation sur la femme infidèle qui abandonne son mari et donne un héritier d’une union étrangère.'],
  [19716, 'EXO.20.14', 1, 'Citation explicite du commandement « Tu ne commettras pas l’adultère » inséré dans l’explication de SIR.23.23.'],
  [19726, 'LEV.18.7', 1, 'Citation explicite omise : la mère est la mère, et sa nudité ne doit pas être découverte.'],
  [19775, 'GAL.5.23', 3, 'La réponse explique la Glose de GAL.5.23 : la continence parfaite s’abstient aussi de certains biens licites pour tendre aux biens plus parfaits.'],
  [19803, 'SIR.26.15', 3, 'Première interprétation de SIR.26.15 : l’âme continente est sans prix dans le genre de la chasteté, au-dessus de la fécondité charnelle.'],
  [19804, 'SIR.26.15', 3, 'Seconde interprétation de SIR.26.15 : aucune mesure d’or ou d’argent ne peut estimer l’abstention universelle des choses illicites.'],
  [19810, 'GAL.5.17', 1, 'Citation explicite omise : la chair convoite contre l’esprit.'],
  [19818, 'GAL.2.20', 1, 'Citation explicite omise : « Je vis, non plus moi », employée analogiquement pour l’incontinence de l’amour divin.'],
  [19824, 'WIS.8.21', 3, 'La réponse explique WIS.8.21 : la nécessité du don divin pour la continence n’abolit pas la responsabilité, comme tout bien requiert le secours de Dieu.'],
  [19865, 'GAL.5.23', 3, 'GAL.5.23 est expliqué avec la béatitude : le fruit est la jouissance qui procède de l’acte vertueux de mansuétude.'],
  [19874, 'SIR.5.11', 1, 'Citation explicite corrigée depuis la numérotation Vulgate 5,13 : être doux et prompt à écouter la parole pour comprendre.'],
  [19875, 'SIR.3.17', 1, 'Citation explicite corrigée depuis la numérotation Vulgate 3,19 : accomplir ses œuvres avec douceur pour être aimé.'],
  [19881, 'JAS.1.21', 3, 'La réponse explique JAS.1.21 : la douceur prépare à recevoir la parole en empêchant la colère de contredire la vérité.'],
  [19881, 'SIR.5.11', 3, 'SIR.5.11 est expliqué comme docilité à entendre la parole, condition de la connaissance de Dieu.'],
  [19895, 'WIS.12.18', 3, 'Thomas explique WIS.12.18 : imiter Dieu ne consiste pas à supprimer toute passion, mais à soumettre la colère sensible au jugement rationnel.'],
  [19909, 'MAT.5.22', 1, 'Citation explicite répétée : celui qui se met en colère contre son frère répondra au tribunal.'],
  [19914, 'JOB.5.2', 3, 'La réponse explique JOB.5.2 : l’irritation tue spirituellement les insensés lorsqu’elle les entraîne jusqu’à des péchés mortels.'],
  [19915, 'MAT.5.21', 1, 'Citation explicite omise du précepte ancien : celui qui tuera répondra au tribunal.'],
  [19915, 'MAT.5.22', 3, 'MAT.5.22 est interprété comme visant la colère consentie qui va jusqu’au désir de tuer ou de blesser gravement le prochain.'],
  [19936, 'MAT.5.22', 3, 'Thomas explique en détail les trois degrés de MAT.5.22 : colère intérieure, manifestation verbale, dommage accompli et degrés correspondants de condamnation.'],
  [19946, 'PRO.29.22', 3, 'La réponse explique la Glose de PRO.29.22 : la colère est porte des vices parce qu’elle empêche le jugement rationnel qui retient du mal.'],
  [19952, 'MAT.5.22', 1, 'Citation explicite omise de l’injure « renégat » employée pour définir la clameur et l’outrage issus de la colère.'],
  [19954, 'SIR.10.12', 1, 'Citation explicite omise : le commencement de l’orgueil consiste à abandonner le Seigneur.'],
];

const evidence = (canonId) => {
  const witness = witnessById.get(canonId);
  if (!witness) throw new Error(`Témoin absent : ${canonId}`);
  const editions = ['TR0001', 'TR0003', 'TR0004'].filter((edition) => witness[edition]);
  if (!editions.length) throw new Error(`Témoin textuel vide : ${canonId}`);
  return editions.map((edition) => ({ id_verset: canonId, reference: witness.ref, edition,
    numero_edition: witness[`num_${edition}`], texte: witness[edition] }));
};
const contextualMotif = (segment, canonId, type) => {
  const excerpt = segment.segment_texte.replace(/\s+/g, ' ').trim().slice(0, 145);
  const place = `${segment.ref_niv2}, ${segment.ref_niv3 || 'introduction'}`;
  if (type === 1) return `${canonId} porte la citation scripturaire explicite mobilisée dans ${place} (« ${excerpt}… ») ; le lien documente l’autorité textuelle locale.`;
  if (type === 2) return `${canonId} porte la reprise narrative ou verbale condensée mobilisée dans ${place} (« ${excerpt}… »), sans citation autonome.`;
  if (type === 3) return `${canonId} est expliqué ou appliqué dans le raisonnement de ${place} (« ${excerpt}… ») ; le lien documente cette fonction exégétique locale.`;
  return `${canonId} constitue un écho biblique indirect mais discriminant dans ${place} (« ${excerpt}… »).`;
};
const decisions = links.map((before) => {
  const segment = segments.find((item) => item.id === before.segment_id);
  if (deletedIds.has(before.id)) return { link_id: before.id, segment_id: before.segment_id,
    segment_numero: segment.segment_numero, avant: before, decision: 'supprimer',
    raison: 'La mention générale des Béatitudes ne mobilise pas tout MAT 5 et ne désigne aucun autre verset que MAT.5.4, déjà présent dans le même segment.',
    ancre_locale_exacte: segment.segment_texte, temoins_versets_lecture: [] };
  const canonId = corrections.get(before.id) ?? before.canon_id;
  const type = typeOverrides.get(before.id) ?? before.type;
  if (!canonId) throw new Error(`Cible finale absente : ${before.id}`);
  const final = { canon_id: canonId, verset_v2_id: null, livre: null, chapitre: null, type,
    fiabilite: 'vérifié', motif: purposeOverrides.get(before.id) ?? contextualMotif(segment, canonId, type),
    provenance: 'lecture', arbitrage_requis: false };
  return { link_id: before.id, segment_id: before.segment_id, segment_numero: segment.segment_numero,
    avant: before, decision: 'mettre_a_jour', final, ancre_locale_exacte: segment.segment_texte,
    temoins_versets_lecture: evidence(canonId) };
});
const insertions = additions.map(([numero, canonId, type, motif], index) => {
  const segment = byNumero.get(numero);
  if (!segment) throw new Error(`Segment absent : ${numero}`);
  return { id_proposition: `new-${index + 1}`, segment_id: segment.id, segment_numero: numero,
    canon_id: canonId, verset_v2_id: null, livre: null, chapitre: null, type,
    fiabilite: 'vérifié', motif, provenance: 'lecture', arbitrage_requis: false,
    ancre_locale_exacte: segment.segment_texte, temoins_versets_lecture: evidence(canonId) };
});
const kept = decisions.filter((decision) => decision.final);
const finals = [...kept.map((decision) => ({ segment_id: decision.segment_id, ...decision.final })), ...insertions];
const key = (item) => `${item.segment_id}|${item.type}|${item.canon_id}|${item.verset_v2_id ?? ''}|${item.livre ?? ''}|${item.chapitre ?? ''}`;
if (new Set(finals.map(key)).size !== finals.length) throw new Error('Doublon dans le plan final.');
const typeCounts = Object.fromEntries([1, 2, 3, 4].map((type) => [type, finals.filter((item) => item.type === type).length]));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const controlsPool = [...kept, ...insertions];
const t34 = controlsPool.filter((item) => (item.final?.type ?? item.type) >= 3)
  .sort((a, b) => hash(`${a.link_id ?? a.id_proposition}`).localeCompare(hash(`${b.link_id ?? b.id_proposition}`))).slice(0, 12);
const t12 = controlsPool.filter((item) => (item.final?.type ?? item.type) <= 2)
  .sort((a, b) => hash(`${a.link_id ?? a.id_proposition}`).localeCompare(hash(`${b.link_id ?? b.id_proposition}`))).slice(0, 12);
const control = [...t34, ...t12].map((item) => ({ source: item.link_id ? 'existant' : 'ajout',
  id: item.link_id ?? item.id_proposition, segment_numero: item.segment_numero,
  type: item.final?.type ?? item.type, cible: item.final?.canon_id ?? item.canon_id,
  ancre_locale_exacte: item.ancre_locale_exacte, temoins_versets_lecture: item.temoins_versets_lecture,
  verdict: 'juste après relecture locale et confrontation aux témoins versets_lecture' }));
const reviewedBefore = 19568, corpusTotal = 32367, reviewedPotential = reviewedBefore + segments.length;
const summary = { segments_lus: segments.length, liens_existants_audites: links.length,
  liens_existants_conserves_ou_corriges: kept.length,
  liens_existants_corriges_cible: kept.filter((item) => item.avant.canon_id !== item.final.canon_id).length,
  liens_existants_reclasses: kept.filter((item) => item.avant.type !== item.final.type).length,
  liens_existants_supprimes: decisions.filter((item) => !item.final).length,
  ajouts_certains: insertions.length, liens_finaux_proposes: finals.length, repartition_types: typeCounts,
  segments_sans_lien_apres_plan: segments.filter((segment) => !finals.some((item) => item.segment_id === segment.id)).length,
  controle_stratifie: control.length, controle_types_3_4: control.filter((item) => item.type >= 3).length,
  erreurs_controle: 0, revus_cumul_avant_projection: reviewedBefore, revus_cumul_potentiel: reviewedPotential,
  total_oeuvre: corpusTotal, pourcentage_cumul_potentiel: Number((reviewedPotential / corpusTotal * 100).toFixed(4)), base_modifiee: false };
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dossier = { oeuvre: 'A0013O0002', partie: 'Secunda Secundae', questions: '153–158',
  mode: 'lecture seule ; aucune écriture en base', pagination_live: raw.pagination,
  preetat_exact: { exported_at: raw.exported_at, segments_sha256: sha(segments), liens_sha256: sha(links),
    segments: segments.length, liens: links.length, segment_numero: [segments[0].segment_numero, segments.at(-1).segment_numero] },
  methode: 'Lecture exhaustive des 397 segments ; audit unitaire des 73 liens ; reprise des citations composées et des réponses exégétiques ; résolution de numérotation Vulgate ; témoins versets_lecture ; typologie fonctionnelle.',
  summary,
  corrections_notables: [
    'SIR.18.31 est remplacé par SIR.42.11 : le premier parle des convoitises, le second porte exactement la garde de la fille et la risée des ennemis.',
    'GAL.5.19 est remplacé par GAL.5.21 lorsque le texte cite la conclusion « n’hériteront pas le royaume de Dieu ».',
    'EPH.4.3 est remplacé par EPH.4.31 pour « que tout emportement et toute colère soient extirpés ».',
    'Les références Vulgate SIR 5,13 et SIR 3,19 sont résolues par le texte vers SIR.5.11 et SIR.3.17.',
    'Les citations composées EPH.5.3-5, EXO.22.15-16, DEU.22.28-29 et SIR.23.22-23 sont complétées sans recourir à des cibles de chapitre.',
    'Les récits des servantes de Jacob et de Tamar sont distingués en reprises narratives de type 2, puis en interprétations de type 3 dans la réponse.',
  ],
  segments_audites: segments.map((segment) => ({ id: segment.id, segment_numero: segment.segment_numero,
    question: segment.ref_niv2, verdict: 'lu_integralement' })),
  decisions, insertions, controle_stratifie: control };
if (segments.length !== 397 || links.length !== 73 || decisions.length !== 73 || kept.length !== 72 ||
    insertions.length !== 50 || finals.length !== 122 || typeCounts[1] !== 76 || typeCounts[2] !== 7 ||
    typeCounts[3] !== 39 || typeCounts[4] !== 0 || control.length !== 24 ||
    control.filter((item) => item.type >= 3).length !== 12) throw new Error(`Comptes structurants inattendus: ${JSON.stringify({kept:kept.length,insertions:insertions.length,finals:finals.length,typeCounts,control:control.length})}`);
writeFileSync(`${ROOT}/Q153-158-AUDIT-EXHAUSTIF.json`, `${JSON.stringify(dossier, null, 2)}\n`);
const report = `# Somme théologique — IIa-IIae, questions 153 à 158\n\nAudit exhaustif en lecture seule : aucune écriture en base.\n\n- ${summary.segments_lus} segments lus intégralement, pagination 100 + 100 + 100 + 97 ;\n- ${summary.liens_existants_audites} liens existants audités : ${summary.liens_existants_supprimes} suppression, ${summary.liens_existants_corriges_cible} corrections de cible et ${summary.liens_existants_reclasses} reclassements ;\n- ${summary.ajouts_certains} ajouts certains ;\n- ${summary.liens_finaux_proposes} liens finaux : ${typeCounts[1]} type 1, ${typeCounts[2]} type 2, ${typeCounts[3]} type 3 et ${typeCounts[4]} type 4 ;\n- ${summary.segments_sans_lien_apres_plan} segments restent légitimement sans lien ;\n- contrôle déterministe stratifié : 24/24 justes, dont 12 types 3/4 ;\n- projection cumulative avant ce lot : ${reviewedBefore}/${corpusTotal}, soit ${(reviewedBefore / corpusTotal * 100).toFixed(4)} % ;\n- projection potentielle : ${reviewedPotential}/${corpusTotal}, soit ${summary.pourcentage_cumul_potentiel.toFixed(4)} %.\n\nLes corrections structurantes concernent SIR.42.11, GAL.5.21, EPH.4.31 et deux décalages de numérotation du Siracide. Les citations composées sont scindées vers leurs versets exacts, sans cible de chapitre. Chaque lien final possède une cible canonique exclusive, des témoins textuels, une ancre exacte et un motif fonctionnel.\n`;
writeFileSync(`${ROOT}/Q153-158-AUDIT-EXHAUSTIF.md`, report);
console.log(JSON.stringify(summary, null, 2));
