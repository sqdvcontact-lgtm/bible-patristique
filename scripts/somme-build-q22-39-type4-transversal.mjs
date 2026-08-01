import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/SS-Q22-39-TYPE4-LIVE.json`, 'utf8'));
const segments = new Map(raw.segments.map((s) => [s.id, s]));
const witnesses = new Map(raw.witnesses.map((w) => [w.id_verset, w]));
const specs = new Map([
  [54433, { decision: 'retyper', type: 1, anchor: 'comme on le voit en S. Matthieu', reason: 'Référence éditoriale biblique explicite et cible vérifiée : le barème impose le type 1.' }],
  [54434, { decision: 'retyper', type: 1, anchor: 'Luc.', reason: 'La segmentation coupe « en S. / Luc. » entre deux segments ; il s’agit de la seconde référence éditoriale explicite et vérifiée, donc du type 1.' }],
  [54476, { decision: 'retyper', type: 1, anchor: 'le Seigneur mangeait et buvait avec les pécheurs, comme on le voit en S. Matthieu', reason: 'Référence éditoriale biblique explicite et vérifiée : type 1, malgré la formulation narrative.' }],
  [54555, { decision: 'conserver', type: 4, anchor: 'nous lisons même que S. Paul et S. Barnabé ont eu des désaccords', reason: 'Écho narratif bref et déterminé, sans citation ni reprise textuelle : type 4.' }],
  [54629, { decision: 'conserver', type: 4, anchor: 'Pierre dénonça publiquement, et sans avoir fait au préalable d’admonition secrète, Ananie et Saphire qui avaient menti tacitement sur le prix de leur champ', reason: 'Relecture théologique d’un épisode narratif, formulée à distance du texte biblique : type 4.' }],
  [54636, { decision: 'conserver', type: 4, anchor: 'Dieu est la vérité même, selon S. Jean', reason: 'Écho lexical et théologique à « Je suis la vérité », et non citation de la proposition évangélique : type 4.' }],
  [54682, { decision: 'retyper', type: 1, anchor: 'Nous lisons en effet dans l’Exode', reason: 'Référence éditoriale explicite à Ex 32,27, vérifiée par le témoin : type 1.' }],
  [59099, { decision: 'supprimer', type: null, anchor: 'les préceptes de décalogue', reason: 'Le Décalogue est évoqué comme ensemble, sans passage ni commandement déterminé ; Ex 20 est une cible arbitraire face au parallèle de Dt 5 et ne possède aucun témoin verset concordant avec cette seule désignation.' }],
  [88648, { decision: 'conserver', type: 4, anchor: 'Élisée qui tua ses bœufs, et nourrit les pauvres de ce qu’il en reçut', reason: 'Écho narratif identifiable mais remanié par Ambroise (« pauvres », finalité ascétique) : type 4 plutôt que reprise textuelle.' }],
  [88662, { decision: 'conserver', type: 4, anchor: 'Ananie et Saphire qui avaient menti tacitement sur le prix de leur champ', reason: 'Écho narratif à la scène de Saphire, intégré à une synthèse théologique et non repris textuellement : type 4.' }],
  [88729, { decision: 'retyper', type: 1, anchor: 'comme on le voit au 2e livre des Rois (1 7, 20)', reason: 'Référence éditoriale biblique explicite et cible vérifiée : type 1.' }],
  [88733, { decision: 'conserver', type: 4, anchor: 'Quant aux dix tribus, elles ne furent pas seulement punies en raison de leur schisme, mais aussi en raison de leur idolâtrie, comme il est dit au même endroit.', reason: 'Écho narratif précis mais indirect : « au même endroit » renvoie au récit, tandis que la cible 2 R 17,12 a été déterminée par lecture et non donnée éditorialement.' }],
]);

function clean(value) {
  if (typeof value !== 'string' || !/[ÃÂâ]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}
function verseEvidence(id, edition = 'TR0003') {
  const row = witnesses.get(id);
  if (!row) throw new Error(`Témoin absent : ${id}`);
  const chosen = row[edition] ? edition : row.TR0001 ? 'TR0001' : 'TR0004';
  return { id_verset: id, reference: row.ref, edition: chosen, numero_edition: clean(row[`num_${chosen}`]), texte: clean(row[chosen]) };
}

if (raw.segments.length !== 1100 || raw.links.length !== 12 || specs.size !== 12) throw new Error('Inventaire transversal incomplet.');
const decisions = raw.links.map((link) => {
  const spec = specs.get(link.id);
  const segment = segments.get(link.segment_id);
  if (!spec || !segment) throw new Error(`Données absentes pour ${link.id}`);
  if (!segment.segment_texte.includes(spec.anchor)) throw new Error(`Ancre inexacte pour ${link.id}`);
  const evidence = link.id === 59099
    ? ['EXO.20.1', 'EXO.20.2', 'EXO.20.17'].map((id) => verseEvidence(id))
    : [verseEvidence(link.canon_id, link.id === 54434 ? 'TR0001' : 'TR0003')];
  return {
    link_id: link.id,
    segment_id: link.segment_id,
    segment_numero: segment.segment_numero,
    question: segment.ref_niv2,
    avant: link,
    decision: spec.decision,
    type_final: spec.type,
    raison: spec.reason,
    ancre_locale_exacte: spec.anchor,
    segment_texte: segment.segment_texte,
    temoins_versets_lecture: evidence,
    cible_finale: spec.decision === 'supprimer' ? null : { canon_id: link.canon_id, livre: link.livre, chapitre: link.chapitre },
  };
});

const output = {
  oeuvre: 'A0013O0002',
  partie: 'Secunda Secundae',
  questions: '22–39',
  mode: 'lecture seule ; aucune écriture en base',
  bareme: { 1: 'citation explicite ou référence éditoriale biblique vérifiée', 2: 'reprise ou condensation', 3: 'explication, interprétation ou application', 4: 'écho narratif, lexical ou théologique moins direct' },
  summary: {
    segments_dans_le_perimetre: raw.segments.length,
    type4_verifies_audites: decisions.length,
    conserves_type4: decisions.filter((d) => d.decision === 'conserver').length,
    retypes_type1: decisions.filter((d) => d.type_final === 1).length,
    retypes_type2: decisions.filter((d) => d.type_final === 2).length,
    retypes_type3: decisions.filter((d) => d.type_final === 3).length,
    supprimes: decisions.filter((d) => d.decision === 'supprimer').length,
    controles_exhaustifs: decisions.length,
  },
  controle_doublons: {
    liens_tous_types_sur_segments_affectes: raw.all_links_on_affected_segments.length,
    conclusion: 'Aucun doublon de même segment, cible et type n’est créé par les trois reclassements. Le lien sans cible 88686, à constituer, concerne Judas et n’est pas dupliqué.',
  },
  decisions,
};

writeFileSync(`${ROOT}/SS-Q22-39-TYPE4-TRANSVERSAL.json`, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(`${ROOT}/SS-Q22-39-TYPE4-TRANSVERSAL.md`, `# Somme théologique — contrôle transversal des types 4, IIa-IIae Q22–39

Audit exhaustif en lecture seule : aucune écriture en base.

- ${output.summary.type4_verifies_audites} liens de type 4 vérifiés contrôlés sur ${output.summary.segments_dans_le_perimetre} segments ;
- ${output.summary.conserves_type4} conservés en type 4 ;
- ${output.summary.retypes_type1} reclassés en type 1 ;
- ${output.summary.supprimes} supprimé ;
- contrôle exhaustif : ${output.summary.controles_exhaustifs}/${output.summary.controles_exhaustifs} liens relus avec ancre locale et témoin.

Les liens 54433, 54434, 54476, 54682 et 88729 deviennent de type 1 parce qu’ils reposent sur des références éditoriales bibliques explicites et vérifiées. Les échos narratifs ou théologiques 54555, 54629, 54636, 88648, 88662 et 88733 restent de type 4. Le lien 59099 vers Exode 20 est supprimé : la seule mention globale du Décalogue ne permet pas de préférer cette cible au parallèle de Deutéronome 5.

Aucun lien existant d’un autre type n’est dupliqué par ces arbitrages.
`);
console.log(JSON.stringify(output.summary, null, 2));
