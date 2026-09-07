// AUDIT STRUCTUREL DES VERSETS — « au moins une divergence de versets, un verset absent ».
//
//   node scripts/audit-structure-versets.mjs              # rapport + CSV dans audit/
//   node scripts/audit-structure-versets.mjs --trad TR0001
//   node scripts/audit-structure-versets.mjs --points     # + les points sensibles proposés
//
// L'outil ne CORRIGE rien et n'écrit rien en base. Il lit `versets_canon` et `versets_v2`
// et rend l'inventaire des versets dont l'OSSATURE cloche : créneau absent, versets
// regroupés, verset scindé, verset surnuméraire, numérotation qui rompt son régime.
//
// Il complète `audit-versets.mjs`, qui regarde le TEXTE (longueurs, scories) et ne
// connaît que les cinq traductions historiques. Celui-ci ne présuppose aucune liste :
// il audite toutes les traductions présentes dans `versets_v2` — AELF et Bible du
// XIIIe siècle comprises.
//
// Les règles vivent dans `_audit-structure-regles.mjs` (module pur, testé) : les seuils
// s'y discutent sans relancer un audit complet.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  SEUIL_SYSTEMATIQUE, absences, compresserChapitres, compresserReference, couperCanonId,
  decalages, partagerParLot, regroupements, scissions, surnumeraires,
} from './_audit-structure-regles.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const arg = (nom, def) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : def }
const TRAD = arg('--trad', null)
const POINTS = process.argv.includes('--points')
const TAILLE_PAGE = 1000 // l'API de données plafonne là ; on pagine jusqu'à épuisement
const STAMP = new Date().toISOString().slice(0, 10)

// ── Chargement ───────────────────────────────────────────────────────────────
async function pager(table, colonnes, filtres = q => q, tri = 'id') {
  const lignes = []
  for (let debut = 0; ; debut += TAILLE_PAGE) {
    const { data, error } = await filtres(sb.from(table).select(colonnes))
      .order(tri, { ascending: true }).range(debut, debut + TAILLE_PAGE - 1)
    if (error) throw new Error(`Lecture de ${table} : ${error.message}`)
    lignes.push(...data)
    process.stdout.write(`\r  ${table} : ${lignes.length} lignes…`)
    if (data.length < TAILLE_PAGE) break
  }
  process.stdout.write('\n')
  return lignes
}

// ── Noms lisibles ────────────────────────────────────────────────────────────
async function chargerNoms() {
  const { data, error } = await sb.from('traductions').select('trad_id, nom')
  if (error) throw new Error(`Lecture de traductions : ${error.message}`)
  return new Map(data.map(t => [t.trad_id, t.nom]))
}

// ── Mise en cas : un cas = une traduction, un livre, un phénomène ─────────────
// La liste des points sensibles se tient au CAS, non au verset : c'est ainsi qu'elle
// est lisible, et c'est ainsi que la Polyglotte la relit (une référence, un libellé).
function enCas(lot, { type, statut, phrase, parChapitre = false, horsOssature = false }, coordsDe) {
  const parLot = new Map()
  for (const c of lot) {
    const cle = `${c.trad_id}|${c.livre}`
    let e = parLot.get(cle)
    if (!e) { e = { trad_id: c.trad_id, livre: c.livre, cas: [] }; parLot.set(cle, e) }
    e.cas.push(c)
  }
  // ⚠️ Un constat qui porte sur le CHAPITRE se rend en chapitres entiers : écrire
  // « 9:1 » ne teindrait que le premier verset d'un chapitre à relire d'un bout à l'autre.
  const rendre = (livre, coords, max) => parChapitre
    ? compresserChapitres(livre, coords.map(c => c.ch), max)
    : compresserReference(livre, coords, max)
  return [...parLot.values()].map(e => {
    // ⛔ Un SURNUMÉRAIRE n'a pas de coordonnée canonique — c'est sa définition. Lui
    // donner une référence que la Polyglotte relit teindrait le créneau qui porte par
    // hasard le même numéro dans l'édition. Sa désignation reste donc en clair, et ses
    // coordonnées d'ORIGINE vont aux notes, où rien ne les prend pour du canon.
    if (horsOssature) {
      const origines = e.cas.map(c => c.origine).sort()
      return {
        trad_id: e.trad_id, livre: e.livre, type, statut, nombre: e.cas.length,
        reference: `${e.livre} — hors ossature, ${origines.length} verset${origines.length > 1 ? 's' : ''} de l'édition (coordonnées en notes)`,
        reference_complete: `${e.livre} (numérotation de l'édition source) ${origines.join(' ; ')}`,
        phrase: phrase(e.cas.length, e.livre),
      }
    }
    const coords = e.cas.map(coordsDe).filter(Boolean)
    return {
      trad_id: e.trad_id, livre: e.livre, type, statut,
      nombre: e.cas.length,
      reference: rendre(e.livre, coords, 40),
      reference_complete: rendre(e.livre, coords, Number.MAX_SAFE_INTEGER),
      phrase: phrase(e.cas.length, e.livre),
    }
  }).sort((a, b) => b.nombre - a.nombre || a.trad_id.localeCompare(b.trad_id) || a.livre.localeCompare(b.livre))
}

const coordCreneau = c => couperCanonId(c.canon_id)

// ── Marche ───────────────────────────────────────────────────────────────────
const canon = await pager('versets_canon', 'id, livre, ch_canon, v_canon, ordre')
const lignes = await pager(
  'versets_v2',
  'trad_id, livre, ch_orig, v_orig, v_orig_suffixe, canon_id, canon_id_fin',
  q => (TRAD ? q.eq('trad_id', TRAD) : q),
)
const noms = await chargerNoms()

const abs = absences(canon, lignes)
const partAbs = partagerParLot(abs)
const reg = regroupements(lignes)
const partReg = partagerParLot(reg)
const sci = scissions(lignes)
const sur = surnumeraires(lignes)
const partSur = partagerParLot(sur.map(s => ({ ...s, canon_id: null })))
const dec = decalages(canon, lignes)
const partDec = partagerParLot(dec.versets.map(v => ({ ...v, canon_id: `${v.livre}.${v.ch_canon}.${v.v_canon}` })))

// Les versets touchés, tous phénomènes confondus : c'est le compte que demande la file.
const touches = new Set()
for (const a of abs) touches.add(`${a.trad_id}|${a.canon_id}`)
for (const r of reg) touches.add(`${r.trad_id}|${r.canon_id}`)
for (const s of sci) touches.add(`${s.trad_id}|${s.canon_id}`)
for (const v of dec.versets) touches.add(`${v.trad_id}|${v.livre}.${v.ch_canon}.${v.v_canon}`)

// ── Cas ──────────────────────────────────────────────────────────────────────
const cas = [
  ...enCas(partAbs.systematiques, {
    type: 'absence systématique',
    statut: 'documenté',
    phrase: (n, l) => `${n} créneaux du canon manquent à cette traduction dans ${l}. Au-delà de ${SEUIL_SYSTEMATIQUE} absences dans un même livre, la cause est tenue pour systématique — recension différente, canon plus court, numérotation propre — et le lot est documenté, non corrigé.`,
  }, coordCreneau),
  ...enCas(partAbs.isoles, {
    type: 'verset absent',
    statut: 'a_verifier',
    phrase: (n, l) => `${n} créneau${n > 1 ? 'x' : ''} du canon manque${n > 1 ? 'nt' : ''} à cette traduction dans ${l}, sans cause systématique : le texte existe probablement dans l'édition, rattaché au créneau voisin.`,
  }, coordCreneau),
  ...enCas(partReg.systematiques, {
    type: 'regroupement de versets',
    statut: 'documenté',
    phrase: (n, l) => `${n} créneaux de ${l} réunissent plusieurs versets de l'édition source. Le découpage de l'édition ne suit pas celui du canon ; l'ampleur du lot en fait un trait de l'édition.`,
  }, coordCreneau),
  ...enCas(partReg.isoles, {
    type: 'regroupement de versets',
    statut: 'a_verifier',
    phrase: (n, l) => `${n} créneau${n > 1 ? 'x' : ''} de ${l} réuni${n > 1 ? 'ssent' : 't'} plusieurs versets de l'édition source, isolément : soit l'édition coupe là autrement, soit le créneau est mal placé.`,
  }, coordCreneau),
  ...enCas(sci.map(s => ({ ...s })), {
    type: 'découpage de verset',
    statut: 'a_verifier',
    phrase: (n, l) => `${n} verset${n > 1 ? 's' : ''} de l'édition source ${n > 1 ? 'sont étalés' : 'est étalé'} sur plusieurs créneaux dans ${l} (canon_id_fin).`,
  }, coordCreneau),
  ...enCas(partSur.systematiques, {
    type: 'versets surnuméraires',
    statut: 'documenté',
    horsOssature: true,
    phrase: (n, l) => `${n} versets de l'édition source n'entrent dans aucun créneau du canon dans ${l}. Hors ossature : la Polyglotte les rend en violet, à leur place.`,
  }, coordCreneau),
  ...enCas(partSur.isoles, {
    type: 'versets surnuméraires',
    statut: 'a_verifier',
    horsOssature: true,
    phrase: (n, l) => `${n} verset${n > 1 ? 's' : ''} de l'édition source n'entre${n > 1 ? 'nt' : ''} dans aucun créneau du canon dans ${l}, isolément.`,
  }, coordCreneau),
  ...enCas(partDec.systematiques, {
    type: 'décalage de numérotation',
    statut: 'documenté',
    phrase: (n, l) => `${n} versets de ${l} portent une numérotation d'origine qui rompt le régime de leur chapitre. Le lot est trop nourri pour être accidentel : c'est la numérotation de l'édition qu'il faut lire, chapitre par chapitre.`,
  }, coordCreneau),
  ...enCas(partDec.isoles, {
    type: 'décalage de numérotation',
    statut: 'a_verifier',
    phrase: (n, l) => `${n} verset${n > 1 ? 's' : ''} de ${l} porte${n > 1 ? 'nt' : ''} une numérotation d'origine qui rompt le régime de son chapitre : partout ailleurs l'écart au canon est constant, là il change.`,
  }, coordCreneau),
  ...enCas(dec.chapitres.map(c => ({ ...c, canon_id: `${c.livre}.${c.ch_canon}.1` })), {
    type: 'chapitre sans régime de numérotation',
    statut: 'a_verifier',
    parChapitre: true,
    phrase: (n, l) => `${n} chapitre${n > 1 ? 's' : ''} de ${l} n'${n > 1 ? 'ont' : 'a'} aucun écart de numérotation dominant : moins de la moitié des versets partagent le même écart au canon. Le chapitre entier est à relire.`,
  }, coordCreneau),
]

// ── Rapport ──────────────────────────────────────────────────────────────────
function rapport() {
  const L = []
  const traductions = [...new Set(lignes.map(l => l.trad_id))].sort()
  L.push(`# Audit structurel des versets — ${STAMP}`, '')
  L.push(`Corpus : ${canon.length} créneaux canoniques, ${lignes.length} versets source, ${traductions.length} traductions.`, '')
  L.push(`**${touches.size} couples (traduction, créneau) portent au moins un défaut d'ossature**, répartis en ${cas.length} cas.`, '')

  L.push('## 1. Ce qui a été cherché', '')
  L.push('| Phénomène | Cas | Versets |', '|---|---:|---:|')
  L.push(`| créneau absent d'une traduction qui couvre le livre | ${partAbs.systematiques.length ? '—' : ''} | ${abs.length} |`)
  L.push(`| plusieurs versets source dans un même créneau | | ${reg.length} |`)
  L.push(`| verset source étalé sur plusieurs créneaux | | ${sci.length} |`)
  L.push(`| verset source sans créneau (surnuméraire) | | ${sur.length} |`)
  L.push(`| numérotation qui rompt le régime du chapitre | | ${dec.versets.length} |`)
  L.push(`| chapitre sans régime de numérotation | | ${dec.chapitres.length} |`)
  L.push('')

  L.push('## 2. Par traduction', '')
  L.push('| Traduction | Absents | Regroupés | Scindés | Surnuméraires | Décalés |', '|---|---:|---:|---:|---:|---:|')
  for (const t of traductions) {
    const n = f => f.filter(x => x.trad_id === t).length
    L.push(`| ${t} — ${noms.get(t) ?? '?'} | ${n(abs)} | ${n(reg)} | ${n(sci)} | ${n(sur)} | ${n(dec.versets)} |`)
  }
  L.push('')

  L.push(`## 3. La file à examiner (${cas.filter(c => c.statut === 'a_verifier').length} cas)`, '')
  L.push('| Traduction | Livre | Phénomène | Nb | Référence |', '|---|---|---|---:|---|')
  for (const c of cas.filter(c => c.statut === 'a_verifier')) {
    L.push(`| ${c.trad_id} | ${c.livre} | ${c.type} | ${c.nombre} | ${c.reference} |`)
  }
  L.push('')

  L.push(`## 4. Les lots systématiques — à documenter, non à corriger (${cas.filter(c => c.statut === 'documenté').length} cas)`, '')
  L.push(`Le partage se fait à ${SEUIL_SYSTEMATIQUE} occurrences dans un même livre.`, '')
  L.push('| Traduction | Livre | Phénomène | Nb |', '|---|---|---|---:|')
  for (const c of cas.filter(c => c.statut === 'documenté')) {
    L.push(`| ${c.trad_id} | ${c.livre} | ${c.type} | ${c.nombre} |`)
  }
  L.push('')
  return L.join('\n')
}

// Un verset par ligne : l'inventaire complet, pour trier et cocher.
function csv() {
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`
  const l = ['phenomene,trad_id,livre,canon_id,detail']
  for (const a of partAbs.systematiques) l.push(['absence-systematique', a.trad_id, a.livre, a.canon_id, `${a.temoins} témoins`].map(q).join(','))
  for (const a of partAbs.isoles) l.push(['absence-isolee', a.trad_id, a.livre, a.canon_id, `${a.temoins} témoins`].map(q).join(','))
  for (const r of reg) l.push(['regroupement', r.trad_id, r.livre, r.canon_id, r.versets.join(' + ')].map(q).join(','))
  for (const s of sci) l.push(['scission', s.trad_id, s.livre, s.canon_id, `${s.origine} → ${s.canon_id_fin}`].map(q).join(','))
  for (const s of sur) l.push(['surnumeraire', s.trad_id, s.livre, '', s.origine].map(q).join(','))
  for (const v of dec.versets) l.push(['decalage', v.trad_id, v.livre, `${v.livre}.${v.ch_canon}.${v.v_canon}`, `${v.ch_orig},${v.v_orig} — écart ${v.ecart}, régime ${v.regime}`].map(q).join(','))
  for (const c of dec.chapitres) l.push(['chapitre-sans-regime', c.trad_id, c.livre, `${c.livre}.${c.ch_canon}.0`, `${c.ecarts} écarts sur ${c.versets} versets, le plus porté n'en tient que ${Math.round(c.part * 100)} %`].map(q).join(','))
  return l.join('\n')
}

// Les lignes à verser dans `points_sensibles`, telles quelles. L'écriture reste un
// geste séparé et délibéré : l'outil propose, il ne touche pas à la base.
function pointsProposes() {
  return cas.map(c => ({
    livre: c.livre,
    reference: c.reference,
    type: c.type,
    description: c.phrase,
    traductions_concernees: `${c.trad_id} (${noms.get(c.trad_id) ?? '?'})`,
    statut: c.statut,
    rencontre_le: STAMP,
    notes: `Relevé par scripts/audit-structure-versets.mjs le ${STAMP} — ${c.nombre} cas. Référence complète : ${c.reference_complete}`,
  }))
}

mkdirSync('audit', { recursive: true })
writeFileSync(`audit/audit-structure-versets-${STAMP}.md`, rapport(), 'utf8')
writeFileSync(`audit/audit-structure-versets-${STAMP}.csv`, csv(), 'utf8')
if (POINTS) writeFileSync(`audit/points-sensibles-proposes-${STAMP}.json`, JSON.stringify(pointsProposes(), null, 2), 'utf8')

console.log('')
console.log(`  créneaux absents        : ${abs.length}  (${partAbs.isoles.length} isolés)`)
console.log(`  créneaux regroupés      : ${reg.length}  (${partReg.isoles.length} isolés)`)
console.log(`  versets scindés         : ${sci.length}`)
console.log(`  versets surnuméraires   : ${sur.length}  (${partSur.isoles.length} isolés)`)
console.log(`  numérotation décalée    : ${dec.versets.length}  (${partDec.isoles.length} isolés)`)
console.log(`  chapitres sans régime   : ${dec.chapitres.length}`)
console.log('')
console.log(`  ${touches.size} couples (traduction, créneau) touchés, en ${cas.length} cas.`)
console.log('')
console.log(`  → audit/audit-structure-versets-${STAMP}.md`)
console.log(`  → audit/audit-structure-versets-${STAMP}.csv`)
if (POINTS) console.log(`  → audit/points-sensibles-proposes-${STAMP}.json`)
