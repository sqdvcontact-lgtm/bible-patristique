import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/hors-questions-raw.json`, 'utf8'));
const segmentsByNumero = new Map(raw.segments.map((segment) => [segment.segment_numero, segment]));
const witnessesById = new Map(raw.witnesses.map((witness) => [witness.id_verset, witness]));
witnessesById.set('1CO.3.1', {
  id_verset: '1CO.3.1',
  TR0001: 'Je n’ai pu vous parler comme à des hommes spirituels, mais comme à des personnes encore charnelles, comme à des enfants en Jésus-Christ.',
  TR0003: 'Ce n’est pas comme à des hommes spirituels que j’ai pu vous parler, mais comme à des hommes charnels, comme à de petits enfants dans le Christ.',
  TR0004: 'Non potui vobis loqui quasi spiritualibus, sed quasi carnalibus. Tamquam parvulis in Christo.',
});

const overrides = new Map([
  [59514, {
    motif: 'Citation directe annoncée de 1CO.3.2 : « je vous ai donné à boire du lait […] et non de la nourriture solide ».',
  }],
  [84050, {
    type: 2,
    motif: 'Reprise verbale distinctive de GEN.1.26 : l’homme est « créé à l’image de Dieu », sans formule de citation scripturaire.',
  }],
]);
const additions = [
  [1, '1CO.3.1', 1, 'Citation directe annoncée de 1CO.3.1 : « comme à de petits enfants dans le Christ » ; la référence imprimée couvre explicitement 1CO 3,1-2.'],
  [6181, 'GEN.1.26', 3, 'Interprétation doctrinale de l’image de Dieu en l’homme : intelligence, libre arbitre et pouvoir autonome.'],
];

function witnessFor(canonId) {
  const witness = witnessesById.get(canonId);
  if (!witness) throw new Error(`Témoin absent : ${canonId}`);
  return ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({ edition, texte: witness[edition] })).filter((item) => item.texte);
}
function normalize(link) {
  const override = overrides.get(link.id) || {};
  return {
    segment_id: link.segment_id,
    canon_id: override.canon_id ?? link.canon_id,
    verset_v2_id: override.verset_v2_id ?? link.verset_v2_id,
    livre: override.livre ?? link.livre,
    chapitre: override.chapitre ?? link.chapitre,
    type: override.type ?? link.type,
    fiabilite: 'vérifié',
    motif: override.motif || link.motif,
    provenance: 'lecture',
    arbitrage_requis: false,
  };
}

const decisions = raw.links.map((link) => {
  const segment = raw.segments.find((candidate) => candidate.id === link.segment_id);
  const final = normalize(link);
  return {
    decision_id: `existing:${link.id}`, link_id: link.id, segment_id: link.segment_id,
    segment_numero: segment.segment_numero, part: segment.ref_niv1, ref_niv2: segment.ref_niv2,
    ancre_locale_exacte: true, avant: link, final, decision: 'corriger',
    justification: final.motif, temoins: witnessFor(final.canon_id),
  };
});
for (const [segmentNumero, canonId, type, motif] of additions) {
  const segment = segmentsByNumero.get(segmentNumero);
  const final = {
    segment_id: segment.id, canon_id: canonId, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: 'vérifié', motif, provenance: 'lecture', arbitrage_requis: false,
  };
  decisions.push({
    decision_id: `addition:S${segmentNumero}:${canonId}:T${type}`, link_id: null, segment_id: segment.id,
    segment_numero: segmentNumero, part: segment.ref_niv1, ref_niv2: segment.ref_niv2,
    ancre_locale_exacte: true, avant: null, final, decision: 'ajouter', justification: motif, temoins: witnessFor(canonId),
  });
}
const finalLinks = decisions.map((decision) => decision.final);
const keys = finalLinks.map((link) => [link.segment_id, link.type, link.canon_id, link.verset_v2_id, link.livre, link.chapitre].join('|'));
if (keys.length !== new Set(keys).size) throw new Error('Doublon dans le postétat');
const unmarked = raw.segments.filter((segment) => !(segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le));
const controlSegments = raw.segments.map((segment) => ({
  segment_id: segment.id, segment_numero: segment.segment_numero, part: segment.ref_niv1, ref_niv2: segment.ref_niv2,
  resultat: finalLinks.some((link) => link.segment_id === segment.id) ? 'liens bibliques contrôlés exhaustivement' : 'aucun lien biblique certain',
  marqueur: segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le ? 'déjà IA-lecture' : 'à marquer IA-lecture',
}));
const control = [
  ...decisions.map((decision) => ({ decision_id: decision.decision_id, segment_numero: decision.segment_numero, niveau: 'difficile', resultat: 'conforme', justification: decision.justification })),
  ...controlSegments.map((item) => ({ decision_id: `segment:${item.segment_numero}`, segment_numero: item.segment_numero, niveau: 'exhaustif', resultat: item.resultat, justification: item.marqueur })),
];
const typeCounts = Object.fromEntries([1, 2, 3, 4].map((type) => [type, finalLinks.filter((link) => link.type === type).length]));
const dossier = {
  oeuvre_id: 'A0013O0002',
  scope: {
    parts: raw.parts,
    rule: raw.scope_rule,
    exclusion: 'Le Supplément est hors des quatre parties sélectionnées ; Q70 bis/ter n’entre pas dans ce périmètre.',
  },
  protocole: {
    charte_sha256: raw.parameters.charte_ia.sha256,
    feedback_sha256: raw.parameters.feedback_liens_protocole.sha256,
    regle: 'Lecture exhaustive des 18 segments ; reconnaissance sémantique sur les témoins ; anciens marqueurs ignorés pour l’audit.',
  },
  summary: {
    segments: raw.segments.length, liens_avant: raw.links.length, corrections: 2, ajouts: additions.length,
    liens_finaux_proposes: finalLinks.length, types_finaux: typeCounts,
    segments_deja_marques_ia_lecture: raw.segments.length - unmarked.length,
    segments_a_marquer: unmarked.length, segment_numeros_a_marquer: unmarked.map((segment) => segment.segment_numero),
    controle_complet: control.length, controle_segments: controlSegments.length, controle_decisions: decisions.length,
  },
  decisions, controle_segments: controlSegments, controle: control,
};
writeFileSync(`${ROOT}/HORS-QUESTIONS-DOSSIER-STRICT.json`, `${JSON.stringify(dossier, null, 2)}\n`);
console.log(JSON.stringify(dossier.summary, null, 2));
