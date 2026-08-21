// LIENS À PARTIR DES RÉFÉRENCES DONNÉES PAR L'ÉDITION (charte §25.1).
//
// C'est la passe qui précède toutes les autres : quand l'édition écrit
// « (1 Co 1, 10) », le lien est DÉJÀ ÉTABLI. On ne devine plus, on lit. Aucune
// méthode d'appariement n'approche cette fiabilité — sur la Somme théologique,
// une seule passe a produit plus de liens que tout l'appariement sur Job.
//
// Ces liens partent en `provenance = 'editeur'` : ce sont des faits de source.
//
//   node scripts/liens-references-editoriales.mjs A0013O0002 --dry
//   node scripts/liens-references-editoriales.mjs A0013O0002
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliser, versEntier, RENVOIS_INTERNES, RE_PARENTHESE, RE_REF, RE_PAREN_NUM,
  citationAdjacente, versetsDe, VULGATE_A_CONVERTIR, NUMEROTATION_HEBRAIQUE,
  chargerAbrev, chargerOssature, creerResolveur, verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
// Restreindre à une partie (ref_niv1), p. ex. --partie="Prima Pars".
const PARTIE = (process.argv.find(a => a.startsWith('--partie=')) || '').split('=').slice(1).join('=') || null
if (!OEUVRE) { console.error('usage : node scripts/liens-references-editoriales.mjs <id_oeuvre> [--dry] [--partie="Prima Pars"]'); process.exit(1) }

// Dictionnaire d'abréviations + ossature + résolveur : socle commun (§ _liens-commun).
const ABREV = await chargerAbrev(sb)
console.log(`abréviations : ${ABREV.size} formes connues`)
const { canon, chapitres, parHebreu, unChapitre } = await chargerOssature(sb)
const { codeLivre, livreEnAmont } = creerResolveur({ ABREV, canon, chapitres, parHebreu, unChapitre })
console.log(`ossature : ${canon.size} créneaux · ${unChapitre.size} livres à un chapitre`)

const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, segment_numero, segment_texte, texte_original')
    .eq('id_oeuvre', OEUVRE).eq('nature', 'texte')
  if (PARTIE) q = q.eq('ref_niv1', PARTIE)
  const { data } = await q.order('id').range(from, from + 999)
  if (!data?.length) break
  segs.push(...data); if (data.length < 1000) break
}
// Lire le texte D'ORIGINE si le corps a été nettoyé (Passe 6) : les références y
// sont intactes, donc l'extraction reste idempotente même après nettoyage.
for (const s of segs) s.src = s.texte_original ?? s.segment_texte
console.log(`${segs.length} segments${PARTIE ? ` (partie « ${PARTIE} »)` : ''}`)

// ── Deux formes de référence ────────────────────────────────────────────────
// (a) livre DANS la parenthèse : « (1 Co 3, 10) », « (cf. Jn 13, 35 et Lc 10, 20) ».
// (b) livre HORS la parenthèse, qui ne porte alors que « ch, v » : « aux
//     Proverbes (9, 3) », « dit Isaïe (64, 3) », « l'Ecclésiastique (3, 23) ».
//     Sans (b), plus de la moitié des références d'une édition comme la Somme —
//     où le nom du livre est intégré à la phrase — passaient à la trappe.
// Regex, résolveur (codeLivre/livreEnAmont), citationAdjacente et VULGATE_A_CONVERTIR
// viennent du socle commun (_liens-commun.mjs) — source unique, partagée avec le
// nettoyage et le re-typage pour qu'une correction vaille partout.

const liens = []
const aConvertir = new Map()   // cibles Vulgate mises de côté
const stats = { refs: 0, type1: 0, aConstituer: 0, chapitres: 0, plages: 0, horsOssature: 0, renvoisInternes: 0, vulgate: 0 }
const inconnus = new Map()
const vus = new Set()

// Un lien à partir d'une référence résolue : citation adjacente → type 1 ; sinon
// cible attestée mais rapport à établir → « à constituer » + arbitrage.
function poser(s, cible, brut, start, end, estVg) {
  const cle = `${s.id}|${cible}`
  if (vus.has(cle)) return
  vus.add(cle)
  const cite = citationAdjacente(s.src, start, end)
  if (cite) stats.type1++; else stats.aConstituer++
  liens.push({
    segment_id: s.id, canon_id: cible,
    type: cite ? 1 : 4,
    fiabilite: cite ? 'probable' : 'à constituer',
    provenance: 'editeur',
    arbitrage_requis: !cite || estVg,
    motif: (cite
      ? `Citation directe, référence de l'édition : ${brut}`
      : `Référence de l'édition (cible attestée, type à établir en lecture) : ${brut}`)
      + (estVg ? ' — numérotation Vulgate, cible à vérifier' : '')
  })
}

for (const s of segs) {
  const texte = String(s.src || '')

  // ── (a) références DANS une parenthèse ──
  for (const par of texte.matchAll(RE_PARENTHESE)) {
    const start = par.index, end = par.index + par[0].length
    const brut = `(${par[1].trim()})`
    for (const m of par[1].matchAll(RE_REF)) {
      const [, rang, nom, chBrut, v, vFin, enumTail] = m
      if (RENVOIS_INTERNES.has(normaliser(nom))) { stats.renvoisInternes++; continue }
      stats.refs++
      const livre = codeLivre(rang, nom)
      if (!livre) { const c = (rang ? rang + ' ' : '') + nom; inconnus.set(c, (inconnus.get(c) ?? 0) + 1); continue }
      poserVersets(s, livre, chBrut, v, vFin, enumTail, brut, start, end, /Vg\b/i.test(par[1]))
    }
  }

  // ── (b) parenthèse numérique + livre en amont ──
  for (const m of texte.matchAll(RE_PAREN_NUM)) {
    const [full, chBrut, v, vFin, enumTail] = m
    const start = m.index, end = m.index + full.length
    const livre = livreEnAmont(texte, start)
    if (!livre) continue          // pas de livre repérable : ce n'est pas une réf biblique
    stats.refs++
    const amont = texte.slice(Math.max(0, start - 30), end).replace(/\s+/g, ' ').trim()
    poserVersets(s, livre, chBrut, v, vFin, enumTail, amont, start, end, /Vg\b/i.test(full))
  }
}

// Une référence peut viser PLUSIEURS versets (plage « v-vFin », énumération
// « . 28 »). Charte : un lien par verset. Le chapitre seul (v absent) passe tel quel.
function poserVersets(s, livre, chBrut, v, vFin, enumTail, brut, start, end, estVg) {
  const versets = versetsDe(v, vFin, enumTail)
  if (!versets.length) { traiter(s, livre, chBrut, undefined, brut, start, end, estVg); return }
  if (versets.length > 1) stats.plages++
  for (const vv of versets) traiter(s, livre, chBrut, String(vv), brut, start, end, estVg)
}

function traiter(s, livre, chBrut, v, brut, start, end, estVg) {
  const ch = versEntier(chBrut)
  if (!ch) return

  // Livre à numérotation Vulgate : mis de côté, jamais inséré sur une cible fausse.
  if (VULGATE_A_CONVERTIR.has(livre)) {
    stats.vulgate++
    const cle = `${livre} ${ch}${v !== undefined ? ',' + v : ''}`
    aConvertir.set(cle, (aConvertir.get(cle) ?? 0) + 1)
    return
  }

  // Chapitre seul : viser le chapitre entier plutôt qu'un premier verset arbitraire.
  if (v === undefined) {
    // Livre à un seul chapitre : « 2 Jn 4 » = verset 4 du chapitre unique.
    if (unChapitre.has(livre) && !chapitres.has(`${livre}.${ch}`) && canon.has(`${livre}.1.${ch}`)) {
      poser(s, `${livre}.1.${ch}`, brut, start, end, estVg)
      return
    }
    if (!chapitres.has(`${livre}.${ch}`)) {
      stats.horsOssature++
      inconnus.set(`${livre} ch.${ch} (inexistant)`, (inconnus.get(`${livre} ch.${ch} (inexistant)`) ?? 0) + 1)
      return
    }
    const cle = `${s.id}|${livre}.ch${ch}`
    if (vus.has(cle)) return
    vus.add(cle); stats.chapitres++
    const cite = citationAdjacente(s.src, start, end)
    if (cite) stats.type1++; else stats.aConstituer++
    liens.push({ segment_id: s.id, livre, chapitre: ch,
      type: cite ? 1 : 4, fiabilite: cite ? 'probable' : 'à constituer',
      provenance: 'editeur', arbitrage_requis: !cite,
      motif: `Référence de l'édition, au chapitre entier : ${brut}` })
    return
  }

  const cible = NUMEROTATION_HEBRAIQUE.has(livre)
    ? parHebreu.get(`${livre}.${ch}.${+v}`)
    : `${livre}.${ch}.${+v}`
  if (!cible || !canon.has(cible)) {
    stats.horsOssature++
    inconnus.set(`${livre} ${ch},${v} (hors ossature)`, (inconnus.get(`${livre} ${ch},${v} (hors ossature)`) ?? 0) + 1)
    return
  }
  poser(s, cible, brut, start, end, estVg)
}

console.log(`\n${stats.refs} références résolues`)
console.log(`  type 1 (citation directe) : ${stats.type1}`)
console.log(`  à constituer (type en lecture) : ${stats.aConstituer}${stats.chapitres ? ` · dont ${stats.chapitres} au chapitre` : ''}${stats.plages ? ` · ${stats.plages} plages` : ''}`)
console.log(`  renvois internes écartés  : ${stats.renvoisInternes}`)
console.log(`  hors ossature             : ${stats.horsOssature}`)
console.log(`  Vulgate mis de côté       : ${stats.vulgate}`)
if (aConvertir.size) {
  const top = [...aConvertir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  console.log(`    → ${top.map(([k, n]) => `${k}×${n}`).join(', ')}`)
}
if (inconnus.size) {
  const top = [...inconnus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  console.log(`  non résolues : ${top.map(([k, n]) => `${k}×${n}`).join(', ')}`)
}

if (DRY) {
  console.log('\n── échantillon (12 premiers)')
  for (const l of liens.slice(0, 12)) {
    const c = l.canon_id ?? `${l.livre} ch.${l.chapitre}`
    console.log(`  t${l.type} ${String(l.fiabilite).padEnd(12)} ${c.padEnd(14)} ${l.motif.slice(0, 60)}`)
  }
  console.log('\n(--dry : rien écrit)')
  process.exit(0)
}

// On n'écrit que ce qui manque : la contrainte d'unicité rejetterait tout le lot.
// Une cible « à constituer » n'est pas ré-insérée si le segment porte DÉJÀ un
// lien vers ce verset (déjà typé à la main ou en lecture) : on ne recouvre pas.
const dejaType = new Set()   // segment|cible|type
const dejaCible = new Set()  // segment|cible (tous types)
for (let i = 0; i < segs.length; i += 500) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, livre, chapitre, type')
    .in('segment_id', segs.slice(i, i + 500).map(s => s.id))
  for (const l of data ?? []) {
    const cible = l.canon_id ?? l.livre + '.ch' + l.chapitre
    dejaType.add(`${l.segment_id}|${cible}|${l.type}`)
    dejaCible.add(`${l.segment_id}|${cible}`)
  }
}
const aEcrire = liens.filter(l => {
  const cible = l.canon_id ?? l.livre + '.ch' + l.chapitre
  if (dejaType.has(`${l.segment_id}|${cible}|${l.type}`)) return false
  if (l.fiabilite === 'à constituer' && dejaCible.has(`${l.segment_id}|${cible}`)) return false
  return true
})
aEcrire.forEach(verifierLienMecanique)   // garde-fou : aucun type 3/4 affirmé en mécanique
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500))
  if (error) throw error
}
console.log(`\n✓ ${aEcrire.length} liens écrits (provenance = editeur) · ${liens.length - aEcrire.length} déjà présents/recouverts`)
