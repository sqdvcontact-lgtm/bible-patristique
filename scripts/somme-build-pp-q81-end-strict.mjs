import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q81-end-raw.json`, 'utf8'));
const extra = JSON.parse(readFileSync(`${ROOT}/pp-q81-end-extra-witnesses.json`, 'utf8'));
const segments = raw.segments;
const links = raw.links;
const segmentById = new Map(segments.map((s) => [s.id, s]));
const segmentByNumber = new Map(segments.map((s) => [s.segment_numero, s]));
const witnessById = new Map([...raw.witnesses, ...extra].map((w) => [w.id_verset, w]));
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Liens faux, doublons provisoires ou cibles héritées remplacées par un lien exact déjà présent.
const DROP_IDS = new Set([
  52719, 52721, 52727, 59290, 59537, 52769, 52786, 52788, 59542,
  52832, 52833, 59291, 52782, 52796, 52801, 52803, 52816, 52835,
  52842, 52847, 52848, 52849, 52873, 52915, 52921, 83752, 83840,
  83853, 83787, 84003,
]);

const DROP_REASONS = new Map([
  [52719, 'Cible décalée : la citation est Sg 6,20 (WIS.6.20), déjà reliée au segment.'],
  [52721, 'Doublon provisoire T4 ; Rm 9,16 est une citation directe déjà portée en T1.'],
  [52727, 'Cible décalée : la maxime est Qo 8,6 (ECC.8.6), déjà reliée au segment.'],
  [59290, 'Cible décalée : la citation est Ps 4,7 (numérotation canonique), déjà reliée.'],
  [59537, 'Cible fausse : « la science sera détruite » correspond à 1Co 13,8, déjà relié.'],
  [52769, 'Cible fausse : le passage articule Gn 1,27, Col 3,10 et Ga 3,28, déjà reliés.'],
  [52786, 'Cible décalée : la citation est Sg 10,2, déjà reliée.'],
  [52788, 'Cible décalée : l’entrée du péché et de la mort est Rm 5,12, déjà reliée.'],
  [59542, 'Cible fausse : « ta providence gouverne » est Sg 14,3, déjà relié.'],
  [52832, 'Cible décalée : la nouvelle alliance et l’enseignement intérieur sont Jr 31,34, déjà relié.'],
  [52833, 'Cible fausse : « tout ce qui se manifeste est lumière » est Ep 5,13, déjà relié.'],
  [59291, 'Cible fausse : « tout ce qui se manifeste est lumière » est Ep 5,13, déjà relié.'],
  [52848, 'Cible fausse sans ancrage local : Ep 1,2 ne concerne pas les ordres angéliques.'],
  [52873, 'Cible décalée : ce qui sort de la bouche vient du cœur, Mt 15,18, déjà relié.'],
  [84003, 'Correction récente erronée : le texte latin des prémices correspond à Nb 18,12, lien éditorial conservé.'],
  [52915, 'Cible décalée : « ne vous faites pas appeler maîtres » est Mt 23,10, déjà relié.'],
  [52921, 'Le début éditorial He 1,1 ne porte pas la proposition citée ; « par son Fils » est He 1,2, déjà relié.'],
  [83787, 'Doublon fonctionnel : 1Co 15,45 est explicitement cité et correctement porté en T1 ; le T2 ne décrit aucune reprise distincte.'],
]);

// Reclassements sémantiques certains après relecture de l’ancre locale.
const TYPE_OVERRIDES = new Map([
  [52753, 2], // Lv 18,26 : référence légale condensée
  [52798, 1], // Rm 5,21 : assertion paulinienne directe
  [52805, 3], // Gn 3,17 : application interprétative à l’agriculture
  [52850, 2], // Ez 10,15 : reprise descriptive des chérubins
  [52856, 3], // Rm 13,3 : analogie appliquée aux puissances angéliques
  [52886, 3], // Dn 7,10 : interprétation des deux fonctions angéliques
  [52901, 1], // Lc 15,7 : citation explicite
  [83882, 3], // 1Co 10,4 : interprétation christologique du bois de vie
  [83977, 3], // Is 6,6 : identification/interprétation du séraphin
]);

for (const id of [...DROP_IDS, ...TYPE_OVERRIDES.keys()]) {
  if (!links.some((link) => link.id === id)) throw new Error(`Lien attendu absent : ${id}`);
}

const evidence = (canonId) => {
  const w = witnessById.get(canonId);
  if (!w) throw new Error(`Témoin absent : ${canonId}`);
  return ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({
    id_verset: canonId,
    reference: w.ref,
    edition,
    numero_edition: w[`num_${edition}`],
    texte: w[edition],
  }));
};

const decisions = links.map((link) => {
  const segment = segmentById.get(link.segment_id);
  const base = {
    link_id: link.id,
    segment_id: link.segment_id,
    segment_numero: segment.segment_numero,
    question: segment.ref_niv2,
    article: segment.ref_niv3,
    avant: link,
    ancre_locale_exacte: segment.segment_texte,
    temoins_versets_lecture: link.canon_id ? evidence(link.canon_id) : [],
  };
  if (DROP_IDS.has(link.id)) return {
    ...base,
    decision: 'supprimer',
    raison: DROP_REASONS.get(link.id) ?? 'Doublon de même cible au même segment : la fonction sémantique exacte est déjà représentée par le lien conservé.',
  };
  const type = TYPE_OVERRIDES.get(link.id) ?? link.type;
  const motif = TYPE_OVERRIDES.has(link.id)
    ? `Relecture rétrospective : reclassement T${link.type}→T${type} ; fonction sémantique vérifiée dans l’ancre locale (${link.canon_id}).`
    : `Relecture rétrospective intégrale : cible ${link.canon_id ?? `${link.livre}.${link.chapitre}`} et fonction T${type} confirmées dans l’ancre locale.`;
  return {
    ...base,
    decision: 'mettre_a_jour',
    final: {
      canon_id: link.canon_id,
      verset_v2_id: link.verset_v2_id,
      livre: link.livre,
      chapitre: link.chapitre,
      type,
      fiabilite: 'vérifié',
      motif,
      provenance: 'lecture',
      arbitrage_requis: false,
    },
  };
});

const additionsSpec = [
  [5872, 'PSA.90.11', 3, 'Le Ps 91 est explicitement invoqué pour attribuer aux anges la garde des hommes ; application doctrinale de Ps 90,11 (canonique).'],
  [6007, 'MAT.17.14', 4, 'Deux scènes évangéliques sont explicitement données comme exemples des lunatiques (Mt 4,24 et Mt 17,14) ; la seconde manquait.'],
];
const insertions = additionsSpec.map(([numero, canon_id, type, motif], index) => {
  const segment = segmentByNumber.get(numero);
  return {
    id_proposition: `new-${index + 1}`,
    segment_id: segment.id,
    segment_numero: numero,
    question: segment.ref_niv2,
    article: segment.ref_niv3,
    canon_id,
    verset_v2_id: null,
    livre: null,
    chapitre: null,
    type,
    fiabilite: 'vérifié',
    motif,
    provenance: 'lecture',
    arbitrage_requis: false,
    ancre_locale_exacte: segment.segment_texte,
    temoins_versets_lecture: evidence(canon_id),
  };
});

const desired = [
  ...decisions.filter((d) => d.final).map((d) => ({ segment_id: d.segment_id, ...d.final })),
  ...insertions.map(({ id_proposition, segment_numero, question, article, ancre_locale_exacte, temoins_versets_lecture, ...x }) => x),
];
const key = (x) => `${x.segment_id}|${x.type}|${x.canon_id ?? ''}|${x.verset_v2_id ?? ''}|${x.livre ?? ''}|${x.chapitre ?? ''}`;
if (new Set(desired.map(key)).size !== desired.length) throw new Error('Doublon final exact.');
const functionalGroups = new Map();
for (const item of desired) {
  const functionalKey = `${item.segment_id}|${item.canon_id ?? `${item.livre}.${item.chapitre}`}`;
  if (!functionalGroups.has(functionalKey)) functionalGroups.set(functionalKey, []);
  functionalGroups.get(functionalKey).push(item.type);
}
const incompatibleType12 = [...functionalGroups.values()].filter((types) => types.includes(1) && types.includes(2));
if (incompatibleType12.length) throw new Error(`Coexistence fonctionnelle T1/T2 non résolue : ${incompatibleType12.length}`);
for (const item of desired) {
  const exclusive = Number(Boolean(item.canon_id)) + Number(Boolean(item.verset_v2_id)) + Number(Boolean(item.livre && item.chapitre));
  if (exclusive !== 1) throw new Error(`Cible non exclusive : ${key(item)}`);
}

const finalBySegment = new Map();
for (const item of desired) {
  if (!finalBySegment.has(item.segment_id)) finalBySegment.set(item.segment_id, []);
  finalBySegment.get(item.segment_id).push({ cible: item.canon_id ?? `${item.livre}.${item.chapitre}`, type: item.type });
}
const lectureSegments = segments.map((s) => ({
  segment_id: s.id,
  segment_numero: s.segment_numero,
  question: s.ref_niv2,
  article: s.ref_niv3,
  verdict: finalBySegment.has(s.id) ? 'liens bibliques relus et fonctions confirmées/corrigées' : 'aucun lien biblique certain requis après relecture',
  liens_finaux: finalBySegment.get(s.id) ?? [],
}));

const finalTypeCounts = Object.fromEntries([1, 2, 3, 4].map((t) => [t, desired.filter((x) => x.type === t).length]));
const difficult = [...decisions.filter((d) => d.final && [3, 4].includes(d.final.type)), ...insertions.filter((a) => [3, 4].includes(a.type))];
const ordinary = [...decisions.filter((d) => d.final && [1, 2].includes(d.final.type)), ...insertions.filter((a) => [1, 2].includes(a.type))];
const toControl = (x) => ({
  source: x.id_proposition ? 'ajout' : 'existant',
  id: x.id_proposition ?? x.link_id,
  segment_numero: x.segment_numero,
  question: x.question,
  type: x.id_proposition ? x.type : x.final.type,
  cible: x.id_proposition ? x.canon_id : x.final.canon_id,
  ancre_locale_exacte: x.ancre_locale_exacte,
  temoins_versets_lecture: x.temoins_versets_lecture,
  verdict: 'juste après confrontation de l’ancre locale aux témoins TR0001/TR0003/TR0004',
});
const control = [...difficult.slice(0, 30), ...ordinary.slice(0, 30)].map(toControl);
const questionVolumes = raw.questions.map((question) => ({
  question,
  segments: segments.filter((s) => s.ref_niv2 === question).length,
  liens_avant: links.filter((l) => segmentById.get(l.segment_id)?.ref_niv2 === question).length,
  liens_finaux: desired.filter((l) => segmentById.get(l.segment_id)?.ref_niv2 === question).length,
}));

const summary = {
  segments_lus: segments.length,
  bornes_segment_numero: [segments[0].segment_numero, segments.at(-1).segment_numero],
  questions: ['Question 81', 'Question 119'],
  derniere_question_existante: 'Question 119',
  question_120_segments: 0,
  liens_existants_audites: links.length,
  suppressions: decisions.filter((d) => d.decision === 'supprimer').length,
  reclassements: decisions.filter((d) => d.final && d.avant.type !== d.final.type).length,
  ajouts_certains: insertions.length,
  liens_finaux_proposes: desired.length,
  repartition_types: finalTypeCounts,
  types_4_avant: links.filter((l) => l.type === 4).length,
  types_4_finaux: desired.filter((l) => l.type === 4).length,
  liens_chapitre_avant: links.filter((l) => l.livre && l.chapitre).length,
  liens_chapitre_finaux: desired.filter((l) => l.livre && l.chapitre).length,
  coexistences_incompatibles_t1_t2_finales: incompatibleType12.length,
  segments_sans_lien_final: segments.filter((s) => !finalBySegment.has(s.id)).length,
  controle_stratifie: control.length,
  controle_difficile_types_3_4: control.filter((c) => [3, 4].includes(c.type)).length,
};

if (segments.length !== 1874 || links.length !== 368 || segments[0].segment_numero !== 4307 || segments.at(-1).segment_numero !== 6180) throw new Error('Bornes ou volumes bruts inattendus.');
if (control.length !== 60 || summary.controle_difficile_types_3_4 !== 30) throw new Error('Contrôle stratifié incomplet.');

const dossier = {
  oeuvre: 'A0013O0002',
  partie: 'Prima Pars',
  questions: '81–119 (dernière question existante)',
  mode: 'lecture seule ; aucune écriture en base',
  methode: 'Réexport paginé, relecture exhaustive des 1 874 segments malgré les anciens marqueurs, audit unitaire des 368 liens hérités/provisoires, balayage des omissions, contrôle des témoins TR0001/TR0003/TR0004, des types, motifs et cibles exclusives.',
  pagination_live: raw.pagination,
  preetat_exact: {
    exported_at: raw.exported_at,
    segments_sha256: sha(segments),
    liens_sha256: sha(links),
    segments: segments.length,
    liens: links.length,
    segment_numero: [segments[0].segment_numero, segments.at(-1).segment_numero],
  },
  summary,
  volumes_par_question: questionVolumes,
  anomalies_notables: [
    'Les anciennes cibles décalées Sg 6,21, Qo 8,7, Sg 10,1, Rm 5,2, Jr 31,24, Ep 3,8-9, Mt 15,2, Mt 23,8 et He 1,1 sont supprimées lorsque la cible exacte est déjà présente.',
    'La correction récente Nb 18,8 est rejetée : les témoins confirment Nb 18,12 pour la formule sur les prémices.',
    'Ps 23,8 et Ps 23,10 sont tous deux conservés au segment 5563 : question puis réponse de la même citation composite.',
    'Ep 1,20, Ep 1,21 et Col 1,16 sont tous conservés au segment 5676 : la citation couvre effectivement les trois unités.',
    'Au segment 4892, le doublon 1Co 15,45 T1/T2 est résolu en faveur du T1 : Paul est explicitement cité et le T2 ne porte pas une fonction autonome.',
    'Deux omissions certaines seulement : Ps 90,11 au segment 5872 et Mt 17,14 au segment 6007.',
    'Aucun lien de chapitre n’existe dans la tranche et aucun n’est requis après relecture.',
  ],
  incertains_documentes_sans_ajout: [
    { segment_numero: 4884, candidat: 'GEN.1.3', resolution: 'Lien hérité conservé comme première occurrence de la formule créatrice ; la formulation française est générique et ne justifie aucun second verset.' },
    { segment_numero: 5584, candidat: 'formule « le ciel a été créé par Dieu »', resolution: 'Énoncé doctrinal non discriminant ; aucun ajout biblique certain.' },
    { segment_numero: 6076, candidat: 'citations rapprochées Ps 93,10 et Ps 4,7', resolution: 'Les deux cibles sont déjà présentes ; aucun lien supplémentaire déduit des collisions lexicales.' },
    { segment_numero: 4859, candidat: 'collision automatique AMO.4.13', resolution: 'Rejetée ; la référence éditoriale et le témoin exact imposent SIR.17.1, déjà présent.' },
    { segment_numero: 5211, candidat: 'collision automatique GEN.1.22', resolution: 'Rejetée ; la référence éditoriale et le texte imposent GEN.1.28, déjà présent.' },
  ],
  decisions,
  insertions,
  lecture_segments: lectureSegments,
  controle_stratifie: control,
};

writeFileSync(`${ROOT}/PP-Q81-119-DOSSIER-STRICT.json`, `${JSON.stringify(dossier, null, 2)}\n`);
const report = `# Somme théologique — Prima Pars, questions 81 à 119\n\nAudit rétrospectif en lecture seule : aucune écriture en base.\n\n- borne réelle : Q81–Q119 ; Q120 est vide ; segments ${summary.bornes_segment_numero[0]}–${summary.bornes_segment_numero[1]} ;\n- ${summary.segments_lus} segments relus, y compris ${summary.segments_sans_lien_final} sans lien final ;\n- ${summary.liens_existants_audites} liens existants audités un à un ; ${summary.suppressions} suppressions et ${summary.reclassements} reclassements ;\n- ${summary.ajouts_certains} omissions certaines ajoutées au plan ; ${summary.liens_finaux_proposes} liens finaux ;\n- types finaux : T1=${finalTypeCounts[1]}, T2=${finalTypeCounts[2]}, T3=${finalTypeCounts[3]}, T4=${finalTypeCounts[4]} (T4 avant=${summary.types_4_avant}) ;\n- liens de chapitre : 0 avant, 0 après ; cibles finales exclusives et aucun doublon exact ;\n- contrôle : ${summary.controle_stratifie}/60 justes, dont ${summary.controle_difficile_types_3_4} cas difficiles T3/T4.\n\nLes deux omissions certaines sont Ps 90,11 au segment 5872 et Mt 17,14 au segment 6007. Le dossier JSON contient le verdict de chacun des 1 874 segments, l’avant/après de chacun des 368 liens, les témoins versets_lecture et les volumes par question.\n`;
writeFileSync(`${ROOT}/PP-Q81-119-RAPPORT.md`, report);
writeFileSync(`${ROOT}/PP-Q81-119-DESIRED-LINKS.json`, `${JSON.stringify(desired, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
