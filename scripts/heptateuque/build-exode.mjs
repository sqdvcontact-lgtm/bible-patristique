// Pipeline Exode (Livre II) — pages 419-477 (section s2 de la 419).
// DRAFT : structure + chapitres romanisés ; corrections OCR à venir (agents).
import { Document, Packer, Paragraph, TextRun, HeadingLevel, FootnoteReferenceRun } from "docx";
import { readFileSync, writeFileSync } from "fs";
import { enRomain, versEntier } from "./romains.mjs";

const romVal = versEntier;
function refRomain(ref) {
  return ref.replace(/^(\s*(?:[A-ZÉa-zéÎ0-9]+\.?)\s+)(\d+)/, (m, pre, ch) => pre + (enRomain(ch) || ch));
}

// ── Corrections vérifiées au fac-similé (contrôle image intégral, 10 agents) ──
// ⟦sic⟧ = coquille réellement imprimée par l'édition, conservée.
const CORR = [
  ["puisqu’ il", "puisqu’il"],
  // p419-424
  ["(Ib. 2, 11-12.) ''Moise tue", "(Ib. 2, 12.) ''Moïse tue"],
  ["devant le peupla.", "devant le peuple."],
  ["langue fût embarrassée.", "langue fût embarrasée ⟦sic⟧."],
  ["Psa. 85,1-2", "Psa. 85, 1, 2"],
  ["(Ib. 5, 22-23.)", "(Ib. 5, 22, 23.)"],
  ["grec porte du ''", "grec porte ''"],
  ["– 2 n’est point", "– Il n’est point"],
  ["avaient été déjà été mentionnés", "avaient été déjà été ⟦sic⟧ mentionnés"],
  ["mais ta troisième, celle de Lévi", "mais ta ⟦sic⟧ troisième, celle de Lévi"],
  ["J’endurcirai, dit-il, le cœur de Pharaon, et j’accomplirai", "J’enplirai durcirai ⟦sic⟧, dit-il, le cœur de Pharaon, et j’accomplirai"],
  ["issu du libre choix de la volonté", "issu du libre libre ⟦sic⟧ choix de la volonté"],
  ["ne dépend, pas de l’homme", "ne dépend pas de l’homme"],
  ["et on les hommes craignant Dieu", "et où les hommes craignant Dieu"],
  ["celui qui, méprise la fortune", "celui qui méprise la fortune"],
  ["le serpenta pu dévorer", "le serpent a pu dévorer"],
  ["parlé de c es prestiges", "parlé de ces prestiges"],
  ["déterminées parleurs qualités", "déterminées par leurs qualités"],
  ["sont propres.C'est pourquoi", "sont propres. C'est pourquoi"],
  ["2 Cor. 11, 16", "2 Cor. 11, 15"],
  // p425-430
  ["Ps. 25, 2-3", "Ps. 25, 2, 3"],
  ["Lc. 11, 10", "Lc. 11, 20"],
  ["en sang. 2 est difficile", "en sang. Il est difficile"],
  ["se sert de ces expressions", "se sert de ces exprsesions ⟦sic⟧"],
  ["gentilité n’on point connu", "gentilité n’on ⟦sic⟧ point connu"],
  ["''Permission dérisoire''", "''Permision ⟦sic⟧ dérisoire''"],
  ["Didym.liv. 1 sur l’Esp. St.", "Didym. liv. 1 sur l’Esp. St."],
  ["il est dit de Pharaon « Mais en ce temps", "il est dit de Pharaon : « Mais en ce temps"],
  ["ne lisons pas de cœur de Pharaon", "ne lisons pas : le cœur de Pharaon"],
  ["fut endurci, mais « Pharaon endurcit", "fut endurci, mais : « Pharaon endurcit"],
  ["Et il ajoute « Mais si Dieu", "Et il ajoute : « Mais si Dieu"],
  ["(Ib. 9, ##Rem 19, 6,20.)", "(Ib. 9, 19, 6, 20.)"],
  ["d’une grêle désastreuse", "d’une grêle désastrueuse ⟦sic⟧"],
  ["Moise élève", "Moïse élève"],
  ["Rom. 9, 22-23", "Rom. 9, 22, 23"],
  ["Ps. 58, 11-12", "Ps. 58, 11, 12"],
  ["(Ib. 9, 27-30.)", "(Ib. 9, 27, 30.)"],
  ["(Ib. 10, 21-22.)", "(Ib. 10, 21, 22.)"],
  ["il est dit à Moïse « Étends", "il est dit à Moïse : « Étends"],
  ["Or jamais Aaron son", "Or jamais Araon ⟦sic⟧ son"],
  ["sa con-chambrière ou", "sa conchambrière ou"],
  ["(Ib. 12, 10-46.)", "(Ib. 12, 10, 46.)"],
  ["agneaux, où, à son défaut", "agneaux, où ⟦sic⟧, à son défaut"],
  ["ou mensuelle, ou annuelle", "ou mensuelle, on ⟦sic⟧ annuelle"],
  ["Jos. 6, 3-4", "Jos. 6, 3, 4"],
  ["divine prescience, à la sortie de l’Égypte, et durée de leur servitude qu’il y eût", "divine prescience, qu’il y eût"],
  ["(Ib. 12, 35-36.)", "(Ib. 12, 35, 36.)"],
  ["; elle Seigneur rendit", "; et le Seigneur rendit"],
  ["partirent de Ramsès", "partirent de Ramessès"],
  ["de porter tes armes", "de porter les armes"],
  ["régnèrent plutôt qu’ils ne furent", "régnèrent plutôt qu’il ⟦sic⟧ ne furent"],
  ["sous son, règne", "sous son règne"],
  ["depuis l’arrivée de son père", "depuis l’arrivé ⟦sic⟧ de son père"],
  ["cette hypothèse ou ne trouverait", "cette hypothèse ou ⟦sic⟧ ne trouverait"],
  ["in Regular. Lib.", "in Regular. lib. 5."],
  // p431-436
  ["vocation d’Abra ham et lapromesse divine", "vocation d’Abraham et la promesse divine"],
  ["jusqu’à l’époque que où Israël descendit", "jusqu’à l’époque où Israël descendit"],
  ["Chroniq an du monde", "Chroniq. an du monde"],
  ["années on, soustrait les vingt-cinq", "années on soustrait les vingt-cinq"],
  ["dans le pays de Chaman aussi bien", "dans le pays de Chanaan aussi bien"],
  ["elle sera.réduiteen servitude", "elle sera réduite en servitude"],
  ["qui vol, aient actuellement les Égyptiens", "qui voyaient actuellement les Égyptiens"],
  ["(lb, 14, 15.)", "(Ib. 14, 15.)"],
  ["(Ib. 15, ##Rem 10, 8.)", "(Ib. 15, 10, 8.)"],
  ["engloutis, par elles", "engloutis par elles"],
  ["(Ib. 15, 23-24.)", "(Ib. 15, 23, 24.)"],
  ["parce quelle donne au lieu", "parce qu’elle donne au lieu"],
  ["semblent, plus favorables", "semblent plus favorables"],
  ["Celui qui.l'acréé et qui l’a montré", "Celui qui l’a créé et qui l’a montré"],
  ["l’Esprit-Saint que, tu as menti", "l’Esprit-Saint que tu as menti"],
  ["manne planée devant Dieu", "manne placée devant Dieu"],
  ["et quelle arche d’alliance n’était", "et que l’arche d’alliance n’était"],
  ["en réservé devant le tabernacle", "en réserve devant le tabernacle"],
  ["serait placé ?car où Dieu", "serait placé ? car où Dieu"],
  ["qu’ils.vinssentdans la terre", "qu’ils vinssent dans la terre"],
  // (« passage du Jourdain » : l'OCR est déjà conforme, rien à corriger.)
  ["à manquer, il, n’y eût", "à manquer, il n’y eût"],
  ["(Ib, 16, 35.)", "(Ib. 16, 35.)"],
  ["<ref> palmier.</ref>", "<ref>Φοῖνιξ, palmier.</ref>"],
  ["atteint les ; régions habitées", "atteint les régions habitées"],
  ["c’est contré ces aberrations", "c’est contre ces aberrations"],
  ["« Araon et tous les anciens", "« Araon ⟦sic⟧ et tous les anciens"],
  ["un pareillangage.setrouve dans", "un pareil langage se trouve dans"],
  ["(Ib. 18, 18-19.)", "(Ib. 18, 18, 19.)"],
  ["(Ib. 18, 19-20.)", "(Ib. 18, 19, 20.)"],
  // p437-442
  ["d’humilité dans là personne de Moïse", "d’humilité dans la personne de Moïse"],
  ["écrite du doigt de Dieu.surdes tables de pierres", "écrite du doigt de Dieu sur des tables de pierres"],
  ["de même.dansle nouveau Testament", "de même dans le nouveau Testament"],
  ["à la première clarification font", "à la première clasification ⟦sic⟧ font"],
  ["En disant ; « Tu ne commettras", "En disant : « Tu ne commettras"],
  ["que bute fornication est un adultère", "que toute fornication est un adultère"],
  ["[[Bible_Crampon_1923| Mt. 5, 12,]]", "[[Bible_Crampon_1923| Mt. 5, 32]]"],
  ["La crainte, caractère : principal", "La crainte, caractère principal"],
  ["car Dieu, est venu à vous", "car Dieu est venu à vous"],
  ["avec une alêne, contre un poteau ; l’oreille", "avec une alène, contre une poteau ⟦sic⟧, l’oreille"],
  ["sans qu’il en puise tirer d’argent", "sans qu’il en puise ⟦sic⟧ tirer d’argent"],
  ["expriment parle mot ''ὁιχέτνς''", "expriment par le mot ''οἰκέτης''"],
  ["''ἀπολυτρῶσετει''", "''ἀπολυτρῶσει''"],
  ["réunis ces deux extrêmes Dieu, dont", "réunis ces deux extrêmes : Dieu, dont"],
  ["le meurtrier paiera l’indemnité que", "le meurtrier paiera l’idemnité ⟦sic⟧ que"],
  ["en vue.quela défense", "en vue que la défense"],
  ["dans une rixe avec cette femme", "dans un rixe ⟦sic⟧ avec cette femme"],
  ["du pardon ! Comment aurait-on pu dire", "du pardon ? comment aurait-on pu dire"],
  ["''μετὰ ἀξίωμὰτος''", "''μετὰ ἀξίωμᾶτος''"],
  ["[[Bible_Crampon_1923| Exo. 16, 24-25]]", "[[Bible_Crampon_1923| Exo. 16, 24, 25]]"],
  // p443-448
  ["(Ib. 21-35.)", "(Ib. 21, 35.)"],
  ["nombre, ouqui pensent", "nombre, ou qui pensent"],
  ["(Ib. 23 19.)", "(Ib. 23, 19.)"],
  ["Ne les nourrit-il pas lui-même", "Ne les nourrit-t-il ⟦sic⟧ pas lui-même"],
  ["cuire « l’agneau", "cuire l’agneau"],
  ["(Ib. 23, 20-21.)", "(Ib. 23, 20, 21.)"],
  ["(Ibi 23, 25-27.)", "(Ib. 23, 25-27.)"],
  ["le peuple né montera", "le peuple ne montera"],
  ["écouterons tout, ce que le Seigneur", "écouterons tout ce que le Seigneur"],
  ["(Ib. 24, 4.) Sur l’autel élevé par Moïse au pied du Sinaï.", "(Ib. 24, 4.) ''Sur l’autel élevé par Moïse au pied du Sinaï''."],
  ["le Palmiste dans ces mots", "le Palmiste ⟦sic⟧ dans ces mots"],
  ["(Ib. 24, 6). ''Premier", "(Ib. 24, 6.) ''Premier"],
  ["''Nouvelle répétition''", "''Nouvelle répétion ⟦sic⟧''"],
  ["Moïse monta ; ainsi que Aaron", "Moïse monta, ainsi que Aaron"],
  ["(Ib. 24, 10-11.)", "(Ib. 24, 11, 10.)"],
  ["CIIL", "CIII"],
  ["(Ib. 25, 11-12.)", "(Ib. 25, 11, 12.)"],
  ["Ces symaises affectaient", "Ces symaises ⟦sic⟧ affectaient"],
  ["Isaac et, Jacob", "Isaac et Jacob"],
  ["doit être de vingt-huit coudées", "doit être de ving-huit ⟦sic⟧ coudées"],
  ["de poils de Chèvre, etc", "de poils de Chèvres etc"],
  ["symbole de la transgression", "symbole de la trangression ⟦sic⟧"],
  // p449-454
  ["couverts parla grâce donnée", "couverts par la grâce donnée"],
  ["Heureux ceux à. qui les iniquités", "Heureux ceux à qui les iniquités"],
  ["peaux de béliers teintes en ronge.", "peaux de béliers teintes en ''rouge''."],
  ["coins qui assujettissaient les colonnes", "coins qui assujétissaient les colonnes"],
  ["« Tu feras deux bases à chacune des colonnes.", "Tu feras « deux bases à chacune des colonnes."],
  ["''' CXI.''' (Ib. 26, 23.)", "''' CXI.''' (Ib. 26, 25.)"],
  ["le Saint des Saints » en d’autres termes", "le Saint des Saints ; » en d’autres termes"],
  ["ces deux parties de Tabernacle", "ces deux parties du Tabernacle"],
  ["contenait l’Arche d’alliance ; au-dehors", "contenait l’Arche-d’alliance ; au-dehors"],
  ["''' 2.''' Sur les vêtements sacerdotaux,", "''' 2.''' ''Sur les vêtements sacerdotaux'',"],
  ["(Ib. 28, 4,16, 9,10.)", "(Ib. 28, 4, 16, 9, 10.)"],
  ["''muraenulas''", "''murœnulas''"],
  ["Le rationnal aura une palme", "Le rationnal ⟦sic⟧ aura une palme"],
  ["des Grecs.''Logos'' en grec", "des Grecs. ''Logos'' en grec"],
  ["Là Doctrine et la Vérité étaient-elles", "La Doctrine et la Vérité étaient-elles"],
  ["difficile à résoudre, Plu sieurs interprètes", "difficile à résoudre, Plusieurs interprètes"],
  ["ces mots « Aaron portera", "ces mots : « Aaron portera"],
  ["quelque vraisemblance que ces mots", "quelque vraissemblance ⟦sic⟧ que ces mots"],
  ["une tunique longue » c’est-à-dire", "une tunique ''longue'', » c’est-à-dire"],
  ["existera une ouverture » par où la tête", "existera une ouverture, » par où la tête"],
  ["et ces mots afin qu’il ne meure point » indiquent", "et ces mots : « afin qu’il ne meure point, » indiquent"],
  ["sonnettes sont une image le la vie édifiante", "sonnettes sont une image de la vie édifiante"],
  ["Tit. 2, 7]]</ref> » et encore", "Tit. 2, 7]]</ref> ; » et encore"],
  ["ne font pas entendre une noix.", "ne font pas entendre une ''voix''."],
  ["d’or pur, et surelle tu formeras", "d’or pur, et sur elle tu formeras"],
  ["elle sera mise sur le front d’Aaron, et quelles que soient", "elle sera mise sur le front d’Araon ⟦sic⟧, et quelles que soient"],
  ["enfants d’Israël, Aaron ôtera les péchés des saints", "enfants d’Israël, Araon ⟦sic⟧ ôtera les péchés des saints"],
  ["C’étaient, suivant, quelques interprètes", "C’étaient, suivant quelques interprètes"],
  ["ou, si on l’aime, mieux la ''sanctification", "ou, si on l’aime mieux la ''sanctification"],
  ["prêtre ôtera les péchés des saints. « Quelles que soient", "prêtre ôtera les péchés des saints : « Quelles que soient"],
  ["Ce titre sera mis sur le front d’Aaron, pour leur être", "Ce titre sera mis sur le front d’Araon ⟦sic⟧, pour leur être"],
  ["à l’onction d’Argon et de ses fils", "à l’onction d’Aaron et de ses fils"],
  ["depuis les reins jusqu’aux cuisses.", "depuis les reins jusqu’au ⟦sic⟧ cuisses."],
  ["Si tin vêtement en est le type", "Si un vêtement en est le type"],
  ["en parlant des fils d’Aaron « Tu les revêtiras", "en parlant des fils d’Aaron : « Tu les revêtiras"],
  ["point destinée a couvrir la tête, Le texte", "point destinée a couvrir la tête. Le texte"],
  ["objet qui, servit, non pas au corps", "objet qui servit, non pas au corps"],
  ["expliqué en quel sans l’Écriture", "expliqué en quel sens l’Écriture"],
  ["et elle sera sans repentante", "et elle sera sans repentance"],
  ["c’est par ce qu’aucune limite", "c’est parce qu’aucune limite"],
  ["éternelles ; quoi qu’il en soit", "éternelles ; quoiqu’il en soit"],
  ["Il ne s’en repentira pas » c’est afin", "Il ne s’en repentira pas, » c’est afin"],
  ["(Ib. 29, 10.) Suite du précédent.", "(Ib. 29, 10.) ''Suite du précédent''."],
  ["témoignage, et Araon et ses enfants mettront", "témoignage, et Araon ⟦sic⟧ et ses enfants mettront"],
  ["agréable à Dieu, en, raison des choses qu’il, symbolise", "agréable à Dieu, en raison des choses qu’il symbolise"],
  // « CXXVIIL » = mauvaise lecture OCR d'un « CXXVIII. » correct au scan, et les
  // délimiteurs de gras avaient sauté : la question était donc invisible au découpage.
  ["CXXVIIL (Ib. 29, 26.)", "''' CXXVIII.''' (Ib. 29, 26.)"],
  ["qui est la part d’Aaron » c’est-à-dire", "qui est la part d’Aaron, » c’est-à-dire"],
  ["Le vêtement dit Saint, qui est à Aaron", "Le vêtement du Saint, qui est à Aaron"],
  ["qui lui succédera en qualité de prêtre", "qui lui succèdera en qualité de prêtre"],
  ["Le prêtre qui lui succédera portera ces vêtements pendant sept jours » en d’autres termes, il portera tous les vêtements", "Le prêtre qui lui sucèdera ⟦sic⟧ portera ces vêtements pendant sept jours ; » en d’autres termes, il portera tout ⟦sic⟧ les vêtements"],
  ["question du successeur d’Aaron lui-même", "question du succeseur ⟦sic⟧ d’Aaron lui-même"],
  ["pour s’acquitter u de ses fonctions dans le ''Saint'' » puisqu’on", "pour s’acquitter « de ses fonctions dans le ''Saint'', » puisqu’on"],
  ["dans le ''Saint des Saints'' » la question serait tranchée", "dans le ''Saint des Saints'', » la question serait tranchée"],
  ["partie du Tabernacle, oit était déposée", "partie du Tabernacle, où était déposée"],
  ["pour officier dans ''le Saint'' » l’Écriture", "pour officier dans ''le Saint'', » l’Écriture"],
  ["de Notre-Seigneur Jésus-Christ. Autre remarque sur le Saint des Saints au-dessus de l’Arche", "de Notre-Seigneur Jésus-Christ<ref>[[Bible_Crampon_1923| Héb. 9, 7-11]]</ref>. Autre remarque sur le Saint des Saints : au-dessus de l’Arche"],
  ["signification symbolique n’apparaît dans le vêtement", "signification symbolique m’apparaît dans le vêtement"],
  ["sanctifié pendant sept-jours, l’autel sera saint", "sanctifié pendant sept jours, l’autel sera saint"],
  ["placé en dehors du voile est devenu saint de saint", "placé en dehors du voile, est devenu saint de saint"],
  ["''' CXXXI.''' (Ib. 30, 3-4.)", "''' CXXXI.''' (Ib. 30, 3, 4.)"],
  ["sous la couronne qui, régnera autour ; tu les feras pour deux, côtés, sur deux côtés »", "sous la couronne qui règnera autour ; tu les feras pour deux côtés, sur deux côtés, »"],
  ["ils feront sur deux côtés » en d’autres termes", "ils feront sur deux côtés, » en d’autres termes"],
  ["(Ib. 30, 4.) Même sujet.", "(Ib. 30, 4.) ''Même sujet''."],
  ["le terme ''thecae''", "le terme ''thecæ''"],
  ["(Ib. 30, 8-10)", "(Ib. 30, 8-10.)"],
  ["serait renouvelé chaque, jour", "serait renouvelé chaque jour"],
  ["''exilasmos'', Comprenons ce passage", "''exilasmos''. Comprenons ce passage"],
  ["Ce qui suit confirme, parfaitement notre interprétation", "Ce qui suit confirme parfaitement notre interprétation"],
  ["était, non, pas en dehors, mais en dedans du voilé, l’autel", "était, non pas en dehors, mais en dedans du voile, l’autel"],
  ["(Ib. XXX ; 26-33.)", "(Ib. XXX, 26-33.)"],
  ["Dieu donne (ordre d’oindre", "Dieu donne l’ordre d’oindre"],
  ["devenait par là même Saint des saints ?", "devenait par la ⟦sic⟧ même Saint des saints ?"],
  ["de l’au tel des sacrifices, auquel", "de l’autel des sacrifices, auquel"],
  ["Quiconque le touchera, sera sanctifié » de même", "Quiconque le touchera, sera sanctifié ; » de même"],
  // p455-460
  ["Il leur défend d’en taire de semblables", "Il leur défend d’en faire de semblables"],
  ["que c’était une, huile propre à faire", "que c’était une huile propre à faire"],
  ["se résument dans ces ceux-ci, l’amour de Dieu", "se résument dans ces deux-ci, l’amour de Dieu"],
  ["pour qu’il leur en lasse des dieux", "pour qu’il leur en fasse des dieux"],
  ["que ne fit.ilauprès du Seigneur", "que ne fit-il auprès du Seigneur"],
  ["dans notre ouvrage contré Fauste, le manichéen", "dans notre ouvrage contre Fauste, le manichéen"],
  ["Cont, Faust.liv. 22, ch. 93.", "Cont. Faust. liv. 22, ch. 93."],
  ["(Ib. 32, 31-32.)", "(Ib. 32, 31, 32.)"],
  ["« Ce peuple à commis un grand péché", "« Ce peuple a commis un grand péché"],
  ["toi et tort peuple, que tu as tiré", "toi et ''ton'' peuple, que tu as tiré"],
  ["il pouvait, malgré.sonserviteur, exercer", "il pouvait, malgré son serviteur, exercer"],
  ["dans un pays ou coulent le lait", "dans un pays ou ⟦sic⟧ coulent le lait"],
  ["(Ib. 33, 12,17.)", "(Ib. 33, 12, 17.)"],
  ["après que Moise lui a dit", "après que Moïse lui a dit"],
  ["qu’à celui qui es mort à la vie", "qu’à celui qui est mort à la vie"],
  ["et voici la suitede.sondiscours", "et voici la suite de son discours"],
  ["ce qui veut dire du te tiendras", "ce qui veut dire tu te tiendras"],
  ["Elle amis après ce qui devait", "Elle a mis après ce qui devait"],
  ["le Christ « furent « touchés de componction", "le Christ « furent touchés de componction"],
  ["Ps. 30, 1, 4-5", "Ps. 30, 1, 4, 5"],
  // p461-466
  ["tu.me verras", "tu me verras"],
  ["monde.àmon Père", "monde à mon Père"],
  ["de faire – pénitence", "de faire pénitence"],
  ["la.rémissionde leurs", "la rémission de leurs"],
  ["le Palmiste ajoute", "le Palmiste ⟦sic⟧ ajoute"],
  ["n’a-t-il pas dans sa bouche", "n’ont-il pas dans sa bouche"],
  ["34, 13-15", "34, 13, 15"],
  ["l’avons.rencontréeni remarquée", "l’avons rencontrée ni remarquée"],
  ["de.quoinous étonner", "de quoi nous étonner"],
  ["venait du, mot", "venait du mot"],
  ["évangéliques.ilsrapportent", "évangéliques : ils rapportent"],
  ["Tu ne paraîtras par les mains vides", "Tu ne paraîtras par ⟦sic⟧ les mains vides"],
  ["n’est cependant par douteux", "n’est cependant par ⟦sic⟧ douteux"],
  ["d’eau, n le sens", "d’eau, » le sens"],
  ["avait dit. « Écris", "avait dit : « Écris"],
  ["Id. 32, 15-16", "Ib. 32, 15, 16"],
  ["mais parla main", "mais par la main"],
  ["Gal. V. 6", "Gal. V, 6"],
  ["Phil. 2, 12-13", "Phil. 2, 12, 13"],
  ["permet de douter. Si c’est", "permet de douter si c’est"],
  ["de là sanctification", "de la sanctification"],
  ["tables de, pierre", "tables de pierre"],
  ["qui nous a « été donné", "qui nous a été donné"],
  ["40, 9,-10", "40, 9, 10"],
  ["les autres,.avant", "les autres, avant"],
  ["au-dessus:»", "au-dessus. »"],
  ["40, 34-35", "40, 34, 35"],
  ["Lorsque là nuée", "Lorsque la nuée"],
  ["quine fût", "qui ne fût"],
  ["s’agit dont pas", "s’agit donc pas"],
  ["en ces termes Tu feras", "en ces termes : « Tu feras"],
  ["du côté ou il se joint", "du côté ou ⟦sic⟧ il se joint"],
  ["celui-ci, quittent le milieu", "celui-ci, qui tient le milieu"],
  // p467-472 (les « Id. » → « Ib. » sont traités par NORM, plus bas)
  ["et la largueur d’un tapis de quatre", "et la largueur ⟦sic⟧ d’un tapis de quatre"],
  ["de poils tommes les tapis", "de poils commes ⟦sic⟧ les tapis"],
  ["seront étendues sur les côtes du tabernacle", "seront étendues sur les côtes ⟦sic⟧ du tabernacle"],
  ["une coudée ce chaque côté", "une coudée ce ⟦sic⟧ chaque côté"],
  ["derrière le tao bernacle", "derrière le tabernacle"],
  ["passe par.lemilieu des colonnes", "passe par le milieu des colonnes"],
  ["de faire de anneaux, dans lesquels", "de faire de ⟦sic⟧ anneaux, dans lesquels"],
  ["des barres.8.''Sur le voile", "des barres.\n''' 8.''' ''Sur le voile"],
  ["dans leurs versionsle mot", "dans leurs versions le mot"],
  ["trouve un eu surplus", "trouve un en surplus"],
  ["quatre coudées eu moins", "quatre coudées en moins"],
  ["et à l’Occident : de cette manière", "et à l’Ocident ⟦sic⟧ : de cette manière"],
  ["et les basses revêtues d’argent", "et les basses ⟦sic⟧ revêtues d’argent"],
  ["ne seront donc par unis ensemble", "ne seront donc par ⟦sic⟧ unis ensemble"],
  ["formaient.unintervalle d’égale", "formaient un intervalle d’égale"],
  ["également de quinzecoudées, avec", "également de quinze coudées, avec"],
  ["la hauteur des leutures. Car", "la hauteur des tentures. Car"],
  ["quand on les étend, Et dans", "quand on les étend. Et dans"],
  ["colonnes d’airain, leurs anneaux d’argent", "colonnes d’airain, leur anneaux d’argent"],
  ["comp, la Vulgate", "comp. la Vulgate"],
  ["dix colonnes et dix bases.<ref>[[Bible_Crampon_1923|Id]]", "dix colonnes et dix bases.<ref>[[Bible_Crampon_1923|Ibid]]"],
  ["et leur trois bases.<ref>[[Bible_Crampon_1923|Id]]", "et leur trois bases.<ref>[[Bible_Crampon_1923|Ibid.]]"],
  ["couvertes d’argent.<ref>[[Bible_Crampon_1923|Id]]", "couvertes d’argent.<ref>[[Bible_Crampon_1923|Ibid.]]"],
  // p473-477
  ["1, 9-18]]</ref> ##Rem. »", "1, 9-18]]</ref> »"],
  ["La partie où cinq tapis, sont unis ensemble", "La partie où cinq tapis sont unis ensemble"],
  ["examiner dans quel ordre les tapis étaient reliés", "examiner dans quel ordre les lapis ⟦sic⟧ étaient reliés"],
  ["le sixième lapis devait de cette manière", "le sixième lapis ⟦sic⟧ devait de cette manière"],
  ["coudées de développement, longueur égale", "coudées de dévelloppement ⟦sic⟧, longueur égale"],
  ["autre-chose est le surplus", "autre chose est le surplus"],
  ["d’une longueur totale de vingt coudées, sur la série", "d’une longueur totale de vingts ⟦sic⟧ coudées, sur la série"],
  ["à la partie postérieure. Mais il", "à la partie postéreure ⟦sic⟧. Mais il"],
  ["enceindre les vingt coudées de tapis", "enceindre les vingts ⟦sic⟧ coudées de tapis"],
  ["les deux côtés de plus prolonge, le nord", "les deux côtés le plus prolongés, le nord"],
  ["que se partagent, à parts égales", "que se partagent, à part égale"],
  ["à couvrir les vingt colonnes du parvis", "à couvrir les vingts ⟦sic⟧ colonnes du parvis"],
  ["c’est-à-dire, cent coudées chacun, deux cents", "c’est-à-dire, cent coudées à chacun, deux cents"],
  ["tabernacle intérieur, mai si l’on prolonge", "tabernacle intérieur, mais si l’on prolonge"],
  ["et une coudée de l’autre » le côté oriental", "et un ⟦sic⟧ coudée de l’autre ; » le côté oriental"],
  ["provenant de ses huit colonnes", "provenant de ses huits ⟦sic⟧ colonnes"],
  ["que je puis en juge le but de ces mots", "que je puis en juge ⟦sic⟧, le but de ces mots"],
  ["de couvrir de part et d’autre » car au défaut", "de couvrir de part et d’autre, » car au défaut"],
  ["qui occupait le milieu du.côtépar où l’on entrait", "qui occupait le milieu du côté par où l’on entrait"],
  ["et en face, du côté du midi ; le chandelier", "et en face, du côté du midi, le chandelier"],
  ["pouvaient pénétrer jusque-là,", "pouvaient pénétrer jusque là."],
  ["la verge d’Aaron et un vase", "la verge d’Araon ⟦sic⟧ et un vase"],
  ["deux chérubins tournés l’un vers l’autre", "deux chérubins tournées ⟦sic⟧ l’un vers l’autre"],
  ["entre l’arche et le voile étain dressé l’autel", "entre l’arche et le voile était dressé l’autel"],
  ["avec du sang, pour purifier, l’autel", "avec du sang, pour purifier l’autel"],
  ["aux côtés du tabernacle intérieur car ils avaient", "aux côtés du tabernacle intérieur : car ils avaient"],
  ["les seules qui fussent de ce côté ces deux colonnes", "les seules qui fussent de ce côté : ces deux colonnes"],
  ["le sens de la porte et trois seules côtés", "le sens de la porte et trois sur les côtés"],
  ["les côtés obliques, oui étaient trois colonnes", "les côtés obliques, où étaient trois colonnes"],
  ["sur une longueur de quinze coudées, Or, les tapis", "sur une longueur de quinze coudées. Or, les tapis"],
  // Le scan imprime bien « 32 ». Le correctif Wikisource « 28 » est
  // écarté : la leçon de l’édition est conservée et signalée.
  ["{{corr|32|28}}", "32 ⟦sic⟧"],
];

// Numéros que l'ÉDITION imprime fautivement (vérifié au fac-similé) → [sic] au
// titre, discriminés par (libellé + début de réf) pour ne pas toucher les vrais.
// p422 : deux « XII » consécutifs, puis saut à XIV (le second vaut XIII).
// p464 : « CLVII » à Ex. XXXV, 1, entre CLVI et CLXVIII (vaut CLXVII).
const LABEL_SIC = [["XII", "(Ib. 5, 1"], ["CLVII", "(Ib. 35, 1"]];

// Formes grecques confrontées au fac-similé sur toute la plage p419-477.
// Le troisième élément est le nombre exact d’occurrences attendu après CORR.
const GREC = [
  ["''ἀυτὴς''", "''αὐτῆς''", 1], ["''ἀυτοῦ''", "''αὐτοῦ''", 2],
  ["''αἲώνιον''", "''αἰώνιον''", 1], ["''άποσχυἠν''", "''ἀποσκευήν''", 3],
  ["''γενεἀς''", "''γενεάς''", 1],
  ["''ἀπολυτρῶσεται''", "''ἀπολυτρώσεται''", 2], ["''ἀπολυτρῶσει''", "''ἀπολυτρώσει''", 1],
  ["''ὴθέτησεν''", "''ἠθέτησεν''", 1], ["''ὁμιλιαν''", "''ὁμιλίαν''", 1],
  ["''μετὰ ἀξίωμᾶτος''", "''μετὰ ἀξιώματος''", 1],
  ["''δουλεύσης''", "''δουλεύσῃς''", 1], ["''λατρεὐσης''", "''λατρεύσῃς''", 1],
  ["''διχαιώματα''", "''δικαιώματα''", 1], ["''strepta''", "''στρεπτά''", 1],
  ["''aistheseos''", "''αἰσθήσεως''", 1], ["''aisthesis''", "''αἴσθησις''", 1], ["''aspida''", "''ἀσπίδα''", 1],
  ["''logion''", "''λόγιον''", 4], ["''logikon''", "''λογικόν''", 2], ["''Logos''", "''Λόγος''", 1], ["''logia''", "''λόγια''", 1], ["''peristomion''", "''περιστόμιον''", 1],
  ["''agiasma''", "''ἁγίασμα''", 1],
  ["''eis ta duo klite poieseis en tois dusipleurois''", "''εἰς τὰ δύο κλίτη ποιήσεις ἐν τοῖς δυσὶ πλευροῖς''", 1],
  ["''klite''", "''κλίτη''", 2], ["''pleura''", "''πλευρά''", 1], ["''mere''", "''μέρη''", 1],
  ["''psalides''", "''ψαλίδες''", 1], ["''exilasmos''", "''ἐξιλασμός''", 1],
  ["''gnosto''", "''γνωστῶ''", 1], ["''phaneros''", "''φανερῶς''", 1], ["''eleeso''", "''ἐλεήσω''", 1], ["''oikteireso''", "''οἰκτειρήσω''", 1], ["''open''", "''ὀπήν''", 1],
  ["''aphairema''", "''ἀφαίρεμα''", 1],
  ["''aulaias''", "''αὐλαίας''", 5], ["''aulas''", "''αὐλάς''", 3], ["''aulen''", "''αὐλήν''", 3], ["''aulaian''", "''αὐλαίαν''", 1], ["''aule''", "''αὐλή''", 1],
  ["''Pi''", "''Π''", 1], ["''pi''", "''π''", 1], ["''plagia''", "''πλάγια''", 4],
];

const NORM = [
  // Raccord p447/448 : apostrophe en fin de page, sans espace.
  [/puisqu’ il/g, "puisqu’il"],
  [/ non seulement /g, " non-seulement "],
  // Le fac-similé imprime toujours « Ib. » ; le robot OCR a mis « Id. » partout.
  // Vérifié : les 59 occurrences sont toutes dans un lien Crampon, aucun « Idem »
  // de prose n'est touché. Les 3 « Ibid » de la p472 sont traités en CORR, avant.
  [/(\[\[Bible_Crampon_1923\|\s*)Id\. /g, "$1Ib. "],
  [/(\[\[Bible_Crampon_1923\|\s*)Id(\]\])/g, "$1Ib$2"],
  // Artefact du robot, absent du scan.
  [/\s*##Rem\.?\s*/g, " "],
];

function pageBody(n) {
  let t = readFileSync(`ws/p${n}.txt`, "utf8");
  t = t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "");
  // L'Exode commence à la section s2 de la p419 (avant = fin de la Genèse).
  if (n === 419) { const c = t.indexOf("<section begin=s2"); if (c !== -1) t = t.slice(c); }
  t = t.replace(/<section\b[^>]*>/g, "");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");
  t = t.replace(/<nowiki\s*\/?>/g, "");
  t = t.replace(/<br\s*\/?>/g, "\n");
  return t.trim();
}
let raw = "";
for (let n = 419; n <= 477; n++) {
  const b = pageBody(n);
  if (!b) continue;
  if (raw && /[\p{L}]$/u.test(raw) && /^[a-zéèêàç-]/u.test(b)) raw += (raw.endsWith("-") ? "" : " ");
  else if (raw) raw += "\n";
  raw += b;
}
const misses = [];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const [a, b] of CORR) {
  const pat = escRe(a).replace(/ +/g, "\\s+"); // tolérant aux sauts de ligne
  if (!new RegExp(pat).test(raw)) { misses.push(a); continue; }
  raw = raw.replace(new RegExp(pat, "g"), () => b);
}
const greekMisses = [];
for (const [a, b, attendu] of GREC) {
  const trouve = raw.split(a).length - 1;
  if (trouve !== attendu) greekMisses.push(`${JSON.stringify(a)} : ${trouve}/${attendu}`);
  raw = raw.split(a).join(b);
}
for (const [re, b] of NORM) raw = raw.replace(re, b);
raw = raw.replace(/\{\{lang\|grc\|([\s\S]*?)\}\}/g, "$1");
raw = raw.replace(/<br\s*\/?>/g, "\n");

// En-têtes du livre (à retirer)
raw = raw.replace(/=+'*LIVRE DEUXIÈME\.?'*=+\s*/, "");
raw = raw.replace(/==QUESTIONS SUR L’EXODE==\s*/, "");

// Découpage en questions (pas d'introduction). Q1 = « QUESTION PREMIÈRE ».
const parts = raw.split(/'''\s*(–\s*)?(QUESTION PREMIÈRE|PREMIÈRE QUESTION|[IVXLCDM]+|\d+)\.?\s*'''/);
const questions = [];
let cur = null;
for (let i = 1; i < parts.length; i += 3) {
  const label = parts[i + 1];
  const content = (parts[i + 2] || "").trim();
  const isSub = /^\d+$/.test(label);
  if (isSub && cur) { cur.subs.push({ num: label, content }); }
  else {
    const num = /QUESTION/.test(label) ? 1 : romVal(label);
    cur = { num, label, content, subs: [] };
    questions.push(cur);
  }
}

let fnCount = 0;
const footnotes = {};
function buildInlineRuns(text) {
  const runs = [];
  const re = /''([\s\S]*?)''|⟦sic⟧/g;
  let last = 0, m;
  const pushText = (s) => { if (s) runs.push(new TextRun(s.replace(/\n+/g, " ").replace(/\s+/g, " "))); };
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[0] === "⟦sic⟧") runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
    else runs.push(new TextRun({ text: m[1].replace(/\s+/g, " "), italics: true }));
    last = re.lastIndex;
  }
  pushText(text.slice(last));
  return runs;
}
function buildRuns(text) {
  const runs = [];
  const re = /<ref>([\s\S]*?)<\/ref>|''([\s\S]*?)''|⟦sic⟧/g;
  let last = 0, m;
  const pushText = (s) => { if (s) runs.push(new TextRun(s.replace(/\n+/g, " ").replace(/\s+/g, " "))); };
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[0] === "⟦sic⟧") runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
    else if (m[1] !== undefined) {
      let nt = m[1].replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1").trim();
      if (/^[A-Za-zÉéÎ0-9]+\.?\s+\d+/.test(nt)) nt = refRomain(nt);
      fnCount++; footnotes[fnCount] = { children: [new Paragraph({ children: buildInlineRuns(nt) })] };
      runs.push(new FootnoteReferenceRun(fnCount));
    } else runs.push(new TextRun({ text: m[2].replace(/\s+/g, " "), italics: true }));
    last = re.lastIndex;
  }
  pushText(text.slice(last));
  return runs;
}
function splitTitle(content) {
  // Tiret parasite avant la réf, ou ponctuation restée collée au numéro dans la
  // source (« '''XXXVII.'''. ») : sinon la réf reste dans le corps, non romanisée.
  content = content.replace(/^\s*[.,;:–—-]\s*/, "");
  let ref = "", rest = content.trim();
  const mr = rest.match(/^\s*\(([^)]*)\)\s*/);
  if (mr) { ref = refRomain(mr[1].trim()); rest = rest.slice(mr[0].length).trim(); }
  let summary = "", body = rest;
  const s = rest.match(/^''(.+?)''\s*(\.?)\s*[–—-]\s+/);
  if (s) { summary = (s[1] + (s[2] || "")).replace(/\s+/g, " ").trim(); body = rest.slice(s[0].length).trim(); }
  return { summary, ref, body };
}
function buildSubtitleRuns(ref) {
  const parts = ref.replace(/''/g, "").split("⟦sic⟧");
  const runs = [];
  parts.forEach((part, i) => {
    if (part) runs.push(new TextRun({ text: part, italics: true, color: "7a746d" }));
    if (i < parts.length - 1) runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
  });
  return runs;
}
const SOUS = (ref) => new Paragraph({ spacing: { after: 60 }, children: buildSubtitleRuns(ref) });

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Questions sur l’Heptateuque")] }),
  new Paragraph({ children: [new TextRun({ text: "Œuvres complètes de saint Augustin, éd. Raulx, t. IV, Bar-le-Duc, L. Guérin & Cie, 1866. Traduction de l’abbé Pognon. DRAFT de relecture — Exode (pages 419-477 du scan), contrôle image intégral effectué. Les [sic] signalent des coquilles de l’édition conservées ; les fautes d’OCR sont corrigées silencieusement contre le fac-similé.", italics: true })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Livre deuxième — Questions sur l’Exode")] }),
];
for (const q of questions) {
  const hchildren = [new TextRun("Question " + (q.num === 1 ? "I" : q.label))];
  const labSic = LABEL_SIC.some(([lab, rs]) => q.label === lab && q.content.replace(/^\s+/, "").startsWith(rs));
  if (labSic) hchildren.push(new TextRun(" ["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 20 }, children: hchildren }));
  const { summary, ref, body: qbody } = splitTitle(q.content);
  if (summary) body.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: summary, italics: true })] }));
  if (ref) body.push(SOUS(ref));
  body.push(new Paragraph({ children: buildRuns(qbody) }));
  for (const sub of q.subs) body.push(new Paragraph({ children: [new TextRun({ text: sub.num + ". ", bold: true }), ...buildRuns(splitTitle(sub.content).body || sub.content)] }));
}

const doc = new Document({ footnotes, sections: [{ children: body }] });
const buf = await Packer.toBuffer(doc);
writeFileSync("Exode_draft_v3.docx", buf);
console.log("Questions Exode :", questions.length);
console.log("Labels :", questions.map(q => q.label + (q.subs.length ? `(+${q.subs.length})` : "")).join(" "));
console.log("Notes :", fnCount, "| DOCX :", buf.length, "octets");
if (misses.length) {
  console.log(`\n⚠️ Corrections NON appliquées (cible introuvable) : ${misses.length}`);
  for (const m of misses) console.log("   ✗ " + JSON.stringify(m.length > 70 ? m.slice(0, 70) + "…" : m));
} else console.log("✓ Toutes les corrections CORR ont été appliquées.");
if (greekMisses.length) {
  console.log(`\n⚠️ Grec : ${greekMisses.length} comptage(s) inattendu(s)`);
  for (const m of greekMisses) console.log("   ✗ " + m);
} else console.log("✓ Toutes les formes grecques ont été restaurées avec le comptage attendu.");
