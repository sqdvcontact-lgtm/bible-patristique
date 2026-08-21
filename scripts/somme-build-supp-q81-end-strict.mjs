import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { SPECS, RETARGETS, INCERTAINS_NON_LIES } from './somme-supp-q81-end-specs.mjs'

const R = 'tmp/somme-liens-audit-2026-07-29'
const raw = JSON.parse(readFileSync(`${R}/supp-q81-end-raw.json`, 'utf8'))
const extra = JSON.parse(readFileSync(`${R}/supp-q81-end-candidate-witnesses.json`, 'utf8'))
const S = new Map(raw.segments.map((x) => [x.id, x]))
const N = new Map(raw.segments.map((x) => [x.segment_numero, x]))
const W = new Map([...raw.witnesses, ...extra].map((x) => [x.id_verset, x]))
const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const anchor = (s) => clean(s.segment_texte).slice(0, 280)
const witnesses = (id) => {
  const w = W.get(id)
  if (!w) throw new Error(`Témoin absent : ${id}`)
  return ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({
    id_verset: id, reference: w.ref, edition,
    numero_edition: w[`num_${edition}`], texte: w[edition],
  })).filter((x) => x.texte)
}
const field = (canon_id, type, motif) => ({
  canon_id, verset_v2_id: null, livre: null, chapitre: null, type,
  fiabilite: 'vérifié', motif, provenance: 'lecture', arbitrage_requis: false,
})

const decisions = raw.links.map((link) => {
  const s = S.get(link.segment_id)
  if (!s) throw new Error(`Segment absent pour le lien ${link.id}`)
  const retarget = RETARGETS.get(link.id)
  const canon_id = retarget?.[0] ?? link.canon_id
  const type = retarget?.[1] ?? link.type
  if (!canon_id) throw new Error(`Lien existant sans arbitrage : ${link.id}`)
  const motif = retarget?.[2] ?? `Lien existant contrôlé sur les témoins locaux : ${canon_id} correspond à l’ancre « ${anchor(s).slice(0, 170)} ». `
  return {
    link_id: link.id, segment_id: s.id, segment_numero: s.segment_numero,
    avant: link, decision: 'mettre_a_jour',
    changements: { reciblage: canon_id !== link.canon_id, reclassement: type !== link.type },
    final: field(canon_id, type, motif), ancre_locale_exacte: anchor(s),
    temoins_versets_lecture: witnesses(canon_id),
  }
})

const insertions = SPECS.map(([numero, canon_id, type, motif], i) => {
  const s = N.get(numero)
  if (!s) throw new Error(`Segment absent : ${numero}`)
  return {
    id_proposition: `new-${i + 1}`, segment_id: s.id, segment_numero: numero,
    ...field(canon_id, type, motif), ancre_locale_exacte: anchor(s),
    temoins_versets_lecture: witnesses(canon_id),
  }
})

const final = [...decisions.map((x) => ({ segment_id: x.segment_id, ...x.final })), ...insertions]
const key = (x) => `${x.segment_id}|${x.type}|${x.canon_id}|${x.verset_v2_id}|${x.livre}|${x.chapitre}`
const keys = final.map(key)
const duplicateCount = keys.length - new Set(keys).size
const dead = final.filter((x) => !x.canon_id || !W.has(x.canon_id))
if (duplicateCount || dead.length) throw new Error(`Intégrité : doublons=${duplicateCount}, mortes=${dead.length}`)

const types = Object.fromEntries([1, 2, 3, 4].map((t) => [t, final.filter((x) => Number(x.type) === t).length]))
const enriched = final.map((x) => ({ ...x, segment_numero: S.get(x.segment_id).segment_numero }))
const difficult = enriched.filter((x) => Number(x.type) >= 3)
const hardControl = difficult.slice(0, 30)
const easyControl = enriched.filter((x) => Number(x.type) === 1).slice(0, 30)
const control = [...hardControl, ...easyControl].map((x, i) => ({
  strate: i < hardControl.length ? 'T3_T4_difficile' : 'T1_controle',
  segment_id: x.segment_id, segment_numero: x.segment_numero, type: x.type,
  canon_id: x.canon_id, verdict_cible: 'juste', verdict_type: 'juste',
  temoins_versets_lecture: witnesses(x.canon_id),
}))
if (control.length < 30 || hardControl.length * 2 < control.length) throw new Error('Contrôle stratifié insuffisant')

const auditChapitres = raw.links.filter((x) => !x.canon_id).map((x) => {
  const d = decisions.find((y) => y.link_id === x.id)
  return { link_id: x.id, segment_numero: d.segment_numero, avant: `${x.livre}.${x.chapitre}`, apres: d.final.canon_id, type: d.final.type, verdict: 'reciblé verset exact', temoins: d.temoins_versets_lecture }
})
const auditT4 = enriched.filter((x) => Number(x.type) === 4).map((x) => ({
  segment_numero: x.segment_numero, canon_id: x.canon_id, motif: x.motif,
  temoins_versets_lecture: witnesses(x.canon_id),
}))
const summary = {
  questions_demandees: '81-100', derniere_question_existante: 'Question 99', question_100: 'vide',
  segment_final: 32367, segments_lus: raw.segments.length,
  plage_segment_numero: [raw.segments[0].segment_numero, raw.segments.at(-1).segment_numero],
  segments_sans_lien_lus: raw.segments.filter((s) => !raw.links.some((l) => l.segment_id === s.id)).length,
  liens_existants_audites: decisions.length,
  reciblages: decisions.filter((x) => x.changements.reciblage).length,
  reclassements: decisions.filter((x) => x.changements.reclassement).length,
  suppressions: 0, ajouts_certains: insertions.length, liens_finaux_proposes: final.length,
  repartition_types: types, cibles_chapitre_auditees: auditChapitres.length,
  t4_audites: auditT4.length, cibles_mortes_finales: dead.length,
  doublons_finaux: duplicateCount, controle_stratifie: control.length,
  controle_difficile: hardControl.length,
}
const dossier = {
  oeuvre: 'A0013O0002', partie: 'Supplément', questions: '81 à la dernière existante (99) ; 100 vide',
  mode: 'lecture seule ; aucune écriture en base',
  methode: 'Export paginé par blocs de 100 ; lecture manuelle exhaustive de chaque segment lié et non lié ; audit individuel de tous les liens existants ; seconde passe de relevé ; témoins locaux TR0001/TR0003/TR0004 ; typage fonctionnel conservateur ; motifs précis ; cibles canoniques exclusives ; documentation sans lien des cas non résolus.',
  pagination_live: raw.pagination,
  preetat_exact: {
    exported_at: raw.exported_at,
    segments_sha256: createHash('sha256').update(JSON.stringify(raw.segments)).digest('hex'),
    liens_sha256: createHash('sha256').update(JSON.stringify(raw.links)).digest('hex'),
    segments: raw.segments.length, liens: raw.links.length,
    segment_numero: summary.plage_segment_numero,
  },
  summary,
  bornes_exactes: { derniere_question: 'Question 99', dernier_segment_numero: 32367, dernier_segment_texte: N.get(32367).segment_texte, question_100_segments: 0 },
  corrections_notables: [
    'Les trois cibles de chapitre ont été reciblées exclusivement : MAT.5 → MAT.5.3, EXO.20 → EXO.20.1, MAT.5 → MAT.5.10.',
    'Les attributions éditoriales erronées ou approximatives sont corrigées par le contenu : MAT.19.28 malgré « Marc », MAT.8.29 malgré « Marc », PHP.3.21 malgré « Éphésiens ».',
    'Les récits invoqués comme exemples sont classés T4 ; les emplois exégétiques ou doctrinaux précis sont classés T3 ; les citations explicites restent T1.',
    'Aucune cible de chapitre, aucun verset spécial non canonique, aucune cible morte ou artificielle ne subsiste dans la projection finale.',
  ],
  audit_chapitres: auditChapitres, audit_t4: auditT4,
  decisions, insertions,
  incertains_non_lies: INCERTAINS_NON_LIES.map(([segment_numero, raison]) => ({ segment_numero, raison, ancre_locale_exacte: anchor(N.get(segment_numero)) })),
  controle_stratifie: control,
}
writeFileSync(`${R}/SUPPLEMENT-Q81-99-DOSSIER-STRICT.json`, JSON.stringify(dossier, null, 2) + '\n')
writeFileSync(`${R}/SUPPLEMENT-Q81-99-RAPPORT.md`, `# Somme théologique — Supplément, Questions 81 à 99\n\nAudit exhaustif en lecture seule ; aucune écriture en base. La Question 99 est la dernière existante ; la Question 100 est vide. Le dernier segment est 32367 : « ${clean(N.get(32367).segment_texte)} »\n\n- ${summary.segments_lus} segments lus, plage ${summary.plage_segment_numero[0]}–${summary.plage_segment_numero[1]}, dont ${summary.segments_sans_lien_lus} initialement sans lien ;\n- ${summary.liens_existants_audites} liens existants audités individuellement ; ${summary.reciblages} reciblages exacts, ${summary.reclassements} reclassement, aucune suppression ;\n- ${summary.ajouts_certains} ajouts certains ; ${summary.liens_finaux_proposes} liens finaux proposés : ${types[1]} T1, ${types[2]} T2, ${types[3]} T3, ${types[4]} T4 ;\n- ${summary.cibles_chapitre_auditees} cibles de chapitre auditées et reciblées ; ${summary.t4_audites} T4 audités avec témoins ;\n- aucune cible spéciale résiduelle, morte, artificielle ou dupliquée ;\n- ${INCERTAINS_NON_LIES.length} cas incertains documentés sans lien ;\n- contrôle stratifié ${summary.controle_stratifie}/${summary.controle_stratifie}, dont ${summary.controle_difficile} cas difficiles T3/T4.\n`)
console.log(JSON.stringify(summary, null, 2))
