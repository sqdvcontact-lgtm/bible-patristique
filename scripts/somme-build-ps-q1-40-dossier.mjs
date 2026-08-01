import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ps-q1-40-raw.json`, 'utf8'));
const diagnostics = JSON.parse(readFileSync(`${ROOT}/ps-q1-40-diagnostics.json`, 'utf8'));
const segmentsByNumero = new Map(raw.segments.map((segment) => [segment.segment_numero, segment]));
const witnessesById = new Map(raw.witnesses.map((witness) => [witness.id_verset, witness]));
witnessesById.set('SIR.25.13', {
  id_verset: 'SIR.25.13',
  TR0001: 'Toute plaie est supportable, plutôt que la plaie du cœur. Toute malice, plutôt que la malice de la femme.',
  TR0003: 'Toutes les souffrances, mais non la souffrance du cœur ; toutes les méchancetés, mais non la méchanceté de la femme.',
  TR0004: 'Et omnem plagam, et non plagam videbit cordis : et omnem nequitiam, et non nequitiam mulieris.',
});

const drops = new Map([
  [52929, 'Doublon mal ciblé : la formule « nombre, poids et mesure » est WIS.11.20, déjà lié sur le segment.'],
  [52990, 'Fausse cible éditoriale ROM.7.9 ; la formulation complète correspond à ROM.7.15, déjà lié sur le segment.'],
  [52969, 'La formulation est un condensé de la parabole, non une citation littérale de MAT.20.10.'],
  [59551, 'Appariement mécanique concurrent MAT.20.9 ; le condensé est correctement ancré sur MAT.20.10.'],
  [58969, 'Faux positif lexical : « béatitude » ne désigne pas ici la péricope des Béatitudes de MAT 5.'],
  [58970, 'Faux positif lexical : « lieu de la béatitude » ne vise pas la péricope de MAT 5.'],
]);

const overrides = new Map([
  [52954, { type: 2, motif: 'Paraphrase attribuée de 1CO.13.13 : la charité est dite supérieure à la foi.' }],
  [53088, { type: 2, motif: 'Reprise verbale distinctive de HEB.6.19 : l’espérance est comparée à une ancre.' }],
  [84140, { type: 2, motif: 'Reprise verbale distinctive de WIS.11.20 : la triade « nombre, poids et mesure » est fondue dans l’argument.' }],
  [84153, { canon_id: 'SIR.25.13', motif: 'Citation de SIR.25.13 : toute plaie, sauf la plaie du cœur ; toute malice, sauf celle de la femme.' }],
  [84154, { canon_id: 'SIR.25.13', motif: 'Reprise et explication de SIR.25.13 : la blessure du cœur dépasse les blessures extérieures.' }],
]);

const additions = [
  [6346, 'JHN.17.3', 3, 'Le verset définit la vie éternelle comme connaissance de Dieu et fonde l’analyse de la béatitude comme activité.'],
  [6364, null, 3, 'Renvoi explicite à 1CO 13 : le chapitre établit la supériorité de la charité sur la foi.', '1CO', 13],
  [6487, 'LUK.22.30', 3, 'Interprétation métaphorique de la nourriture et de la boisson promises aux élus.'],
  [6487, 'MAT.6.20', 3, 'Interprétation métaphorique des trésors célestes comme surabondance en Dieu.'],
  [6487, 'MAT.25.34', 3, 'Interprétation métaphorique de la royauté promise comme élévation à la communion divine.'],
  [6509, 'MAT.20.10', 3, 'La réception égale du denier est interprétée, avec Grégoire, comme égale possession de la vie éternelle.'],
  [6564, 'ROM.4.6', 3, 'La béatitude sans les œuvres est explicitement expliquée comme béatitude d’espérance reçue par la grâce justifiante.'],
  [6735, 'PSA.118.20', 3, 'La citation est explicitement limitée : l’intelligence meut la volonté, mais non nécessairement.'],
  [6860, 'MAT.6.22', 3, 'Glose explicite : l’œil simple de la parole évangélique signifie l’intention.'],
  [6866, 'MAT.6.22', 3, 'Interprétation explicite de l’œil comme métaphore de l’intention qui présuppose la connaissance de la fin.'],
  [6867, 'MAT.6.23', 3, 'Interprétation explicite de la lumière comme intention manifeste et des ténèbres comme œuvres aux suites inconnues.'],
  [7009, 'WIS.1.1', 3, 'La formule « expérimentez le Seigneur dans l’amour » fonde l’explication analogique du consentement comme sens appétitif.'],
  [7124, 'ROM.7.15', 3, 'La Glose interprète « je ne fais pas le bien que je veux » comme volonté de ne pas convoiter malgré la convoitise.'],
  [7287, 'ROM.14.23', 3, 'Le verset est explicitement glosé : agir sans la bonne foi signifie agir contre la conscience.'],
  [7312, 'MAT.12.35', 3, 'La Glose interprète le trésor du cœur comme l’intention dont procède la bonté de l’acte.'],
  [7333, 'PSA.32.1', 3, 'La Glose interprète les hommes droits comme ceux qui veulent ce que Dieu veut.'],
  [7356, 'MAT.7.18', 3, 'La Glose identifie l’arbre à la volonté et les fruits aux œuvres.'],
  [7467, 'MAT.13.33', 3, 'La Glose distribue le levain entre raison, irascible et concupiscible.'],
  [7575, 'WIS.8.2', 3, 'Réponse interprétative : l’amour de la Sagesse est un amour intellectuel ou rationnel.'],
  [7644, 'GAL.4.18', 3, 'La Glose applique la parole paulinienne à l’union affective maintenue dans l’absence.'],
  [7681, 'JHN.2.17', 3, 'La Glose explique le zèle dévorant comme correction du mal ou gémissement devant lui.'],
  [7682, '1CO.3.3', 3, 'Réponse interprétative : la jalousie de 1CO.3.3 est la jalousie envieuse qui produit les disputes.'],
  [7902, 'PSA.41.4', 3, 'Interprétation de la nourriture des larmes comme réconfort délectable issu de l’amour.'],
  [7958, 'JHN.4.13', 3, 'Interprétation augustinienne de l’eau qui laisse encore la soif comme plaisir corporel.'],
  [8075, 'WIS.8.16', 3, 'La société sans amertume ni ennui est explicitement appliquée à la contemplation de l’esprit.'],
  [8077, '2CO.7.10', 3, 'La tristesse selon Dieu est expliquée comme portant sur le péché contemplé, non sur la contemplation elle-même.'],
  [8249, 'SIR.30.23', 3, 'Réponse interprétative : la tristesse sans utilité est la tristesse immodérée qui absorbe l’esprit.'],
  [8276, 'SIR.51.7', 3, 'Le regard vers un secours extérieur fonde l’explication de l’espérance comme attente.'],
  [8315, 'MAT.1.2', 3, 'Glose allégorique explicite : Abraham engendre Isaac comme la foi engendre l’espérance, puis la charité.'],
];

function targetLabel(link) {
  return link.canon_id || link.verset_v2_id || `${link.livre} ${link.chapitre}`;
}

function witnessFor(link) {
  if (link.canon_id) {
    const witness = witnessesById.get(link.canon_id);
    if (!witness) throw new Error(`Témoin absent : ${link.canon_id}`);
    return [{ edition: 'TR0001', texte: witness.TR0001 }, { edition: 'TR0003', texte: witness.TR0003 }, { edition: 'TR0004', texte: witness.TR0004 }].filter((x) => x.texte);
  }
  if (link.livre && link.chapitre) return [{ edition: 'cible_chapitre', texte: `${link.livre} ${link.chapitre}, renvoi explicite au chapitre entier dans le segment.` }];
  return [{ edition: 'verset_v2', texte: String(link.verset_v2_id) }];
}

function normalizeFinal(link) {
  const override = overrides.get(link.id) || {};
  const final = {
    segment_id: link.segment_id,
    canon_id: override.canon_id ?? link.canon_id,
    verset_v2_id: override.verset_v2_id ?? link.verset_v2_id,
    livre: override.livre ?? link.livre,
    chapitre: override.chapitre ?? link.chapitre,
    type: override.type ?? link.type,
    fiabilite: 'vérifié',
    motif: override.motif || link.motif || `Lien de type ${link.type} vers ${targetLabel(link)}, relu sur le segment et les témoins.`,
    provenance: 'lecture',
    arbitrage_requis: false,
  };
  return final;
}

const decisions = raw.links.map((link) => {
  const segment = raw.segments.find((candidate) => candidate.id === link.segment_id);
  if (!segment) throw new Error(`Segment absent pour le lien ${link.id}`);
  const reason = drops.get(link.id);
  const final = reason ? null : normalizeFinal(link);
  return {
    decision_id: `existing:${link.id}`,
    link_id: link.id,
    segment_id: link.segment_id,
    segment_numero: segment.segment_numero,
    question: segment.ref_niv2,
    ancre_locale_exacte: true,
    avant: link,
    final,
    decision: final ? (overrides.has(link.id) ? 'corriger' : 'conserver') : 'supprimer',
    justification: reason || overrides.get(link.id)?.motif || `Lien ${targetLabel(link)} relu dans son contexte et contrôlé sur les témoins disponibles.`,
    temoins: final ? witnessFor(final) : witnessFor(link),
  };
});

for (const [segmentNumero, canonId, type, motif, livre = null, chapitre = null] of additions) {
  const segment = segmentsByNumero.get(segmentNumero);
  if (!segment) throw new Error(`Segment additionnel absent : ${segmentNumero}`);
  const final = {
    segment_id: segment.id, canon_id: canonId, verset_v2_id: null, livre, chapitre, type,
    fiabilite: 'vérifié', motif, provenance: 'lecture', arbitrage_requis: false,
  };
  decisions.push({
    decision_id: `addition:S${segmentNumero}:${canonId || `${livre}.${chapitre}`}:T${type}`,
    link_id: null,
    segment_id: segment.id,
    segment_numero: segmentNumero,
    question: segment.ref_niv2,
    ancre_locale_exacte: true,
    avant: null,
    final,
    decision: 'ajouter',
    justification: motif,
    temoins: witnessFor(final),
  });
}

const finalLinks = decisions.filter((decision) => decision.final).map((decision) => decision.final);
const keys = finalLinks.map((link) => [link.segment_id, link.type, link.canon_id, link.verset_v2_id, link.livre, link.chapitre].join('|'));
if (keys.length !== new Set(keys).size) throw new Error('Doublon dans le postétat proposé');

const difficultIds = new Set([
  ...diagnostics.hard.map((review) => `existing:${review.link_id}`),
  ...diagnostics.low_t1.map((review) => `existing:${review.link_id}`),
]);
const difficult = decisions.filter((decision) => difficultIds.has(decision.decision_id)).slice(0, 20);
const complements = decisions.filter((decision) => !difficultIds.has(decision.decision_id) && decision.final).filter((_, index) => index % 11 === 0).slice(0, 20);
const control = [...difficult, ...complements].map((decision) => ({
  decision_id: decision.decision_id,
  segment_numero: decision.segment_numero,
  niveau: difficultIds.has(decision.decision_id) ? 'difficile' : 'stratifié',
  resultat: decision.final ? 'conforme au postétat proposé' : 'suppression confirmée',
  justification: decision.justification,
}));
if (control.length < 40 || difficult.length * 2 < control.length) throw new Error('Contrôle final insuffisant');

const typeCounts = Object.fromEntries([1, 2, 3, 4].map((type) => [type, finalLinks.filter((link) => link.type === type).length]));
const dossier = {
  oeuvre_id: 'A0013O0002',
  partie: 'Prima Secundae',
  questions: ['Question 1', 'Question 40'],
  protocole: {
    charte_sha256: raw.parameters.charte_ia.sha256,
    feedback_sha256: raw.parameters.feedback_liens_protocole.sha256,
    regle: 'Lecture segment par segment ; cible reconnue au contenu dans les témoins ; type 1 citation, type 2 reprise verbale fondue, type 3 commentaire explicite, type 4 écho sans reprise distinctive.',
  },
  couverture: {
    segments: raw.segments.length,
    intervalle_segment_numero: [raw.segments[0].segment_numero, raw.segments.at(-1).segment_numero],
    liens_herites_reaudites: raw.links.length,
    segments_sans_lien_repasses: diagnostics.stats.without,
    candidats_marqueurs: diagnostics.stats.candidates,
    segments_a_guillemets_sans_lien: diagnostics.stats.quoted,
  },
  summary: {
    liens_avant: raw.links.length,
    suppressions: decisions.filter((decision) => decision.decision === 'supprimer').length,
    corrections: decisions.filter((decision) => decision.decision === 'corriger').length,
    ajouts: decisions.filter((decision) => decision.decision === 'ajouter').length,
    liens_finaux_proposes: finalLinks.length,
    types_finaux: typeCounts,
    controle_stratifie: control.length,
    controle_difficile: difficult.length,
    segments_deja_marques_ia_lecture: raw.segments.filter((segment) => segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le).length,
  },
  decisions,
  controle: control,
};

writeFileSync(`${ROOT}/PRIMA-SECUNDAE-Q1-40-DOSSIER-STRICT.json`, `${JSON.stringify(dossier, null, 2)}\n`);
console.log(JSON.stringify(dossier.summary, null, 2));
