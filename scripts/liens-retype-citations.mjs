// RE-TYPAGE — promouvoir en type 1 les liens editeur « à constituer » qui sont
// en réalité des CITATIONS DIRECTES, ce que l'heuristique initiale ratait quand
// la référence est ENCHÂSSÉE dans la citation (« … dit la Genèse (1, 1), … »).
//
// Lit le TEXTE D'ORIGINE (texte_original si le corps a été nettoyé, sinon
// segment_texte) : la référence doit y être encore présente pour être re-jugée.
// N'écrit QUE des UPDATE de type (aucun nouveau lien), sur les liens editeur
// type 4 / « à constituer » seulement — les échos réels (hors citation) restent.
//
//   node scripts/liens-retype-citations.mjs A0013O0002 --dry [--partie="..."]
//   node scripts/liens-retype-citations.mjs A0013O0002
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliser, RENVOIS_INTERNES, RE_PARENTHESE, RE_REF, RE_PAREN_NUM,
  citationAdjacente, chargerAbrev, chargerOssature, creerResolveur } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
const PARTIE = (process.argv.find(a => a.startsWith('--partie=')) || '').split('=').slice(1).join('=') || null
if (!OEUVRE) { console.error('usage : node scripts/liens-retype-citations.mjs <id_oeuvre> [--dry] [--partie="..."]'); process.exit(1) }

const ABREV = await chargerAbrev(sb)
const { canon, chapitres, parHebreu, unChapitre } = await chargerOssature(sb)
const { codeLivre, livreEnAmont, cibleDe } = creerResolveur({ ABREV, canon, chapitres, parHebreu, unChapitre })

// Pour chaque segment : les cibles qui sont des CITATIONS (heuristique corrigée).
function ciblesCitees(texte) {
  const out = new Set()
  for (const par of texte.matchAll(RE_PARENTHESE)) {
    for (const m of par[1].matchAll(RE_REF)) {
      const [, rang, nom, chBrut, v] = m
      if (RENVOIS_INTERNES.has(normaliser(nom))) continue
      const livre = codeLivre(rang, nom); if (!livre) continue
      const cible = cibleDe(livre, chBrut, v)
      if (cible && citationAdjacente(texte, par.index, par.index + par[0].length)) out.add(cible)
    }
  }
  for (const m of texte.matchAll(RE_PAREN_NUM)) {
    const livre = livreEnAmont(texte, m.index); if (!livre) continue
    const cible = cibleDe(livre, m[1], m[2])
    if (cible && citationAdjacente(texte, m.index, m.index + m[0].length)) out.add(cible)
  }
  return out
}

// ── Segments + liens editeur « à constituer » ─────────────────────────────────
const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, segment_numero, segment_texte, texte_original').eq('id_oeuvre', OEUVRE).eq('nature', 'texte')
  if (PARTIE) q = q.eq('ref_niv1', PARTIE)
  const { data } = await q.order('id').range(from, from + 999)
  if (!data?.length) break; segs.push(...data); if (data.length < 1000) break
}
const srcById = new Map(segs.map(s => [s.id, s.texte_original ?? s.segment_texte]))
const ids = segs.map(s => s.id)

const candidats = []   // liens editeur type 4 « à constituer »
for (let i = 0; i < ids.length; i += 300) {
  const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, livre, chapitre, type, fiabilite, provenance')
    .in('segment_id', ids.slice(i, i + 300)).eq('provenance', 'editeur')
  for (const l of data ?? []) if (l.type === 4 && l.fiabilite === 'à constituer') candidats.push(l)
}
console.log(`${segs.length} segments · ${candidats.length} liens editeur « à constituer » à réexaminer`)

// Cache des cibles citées par segment.
const cacheCitees = new Map()
const aPromouvoir = []
for (const l of candidats) {
  const src = srcById.get(l.segment_id); if (!src) continue
  if (!cacheCitees.has(l.segment_id)) cacheCitees.set(l.segment_id, ciblesCitees(src))
  const cible = l.canon_id ?? `${l.livre}.${l.chapitre}`
  if (cacheCitees.get(l.segment_id).has(cible)) aPromouvoir.push(l)
}
console.log(`${aPromouvoir.length} liens à promouvoir en type 1 (citation enchâssée / adjacente ratée)`)

if (DRY) {
  for (const l of aPromouvoir.slice(0, 15)) {
    const s = segs.find(x => x.id === l.segment_id)
    console.log(`  seg ${s.segment_numero}  ${l.canon_id ?? l.livre + '.' + l.chapitre}  t4→t1`)
  }
  console.log('\n(--dry : rien écrit)'); process.exit(0)
}

let ok = 0
for (const l of aPromouvoir) {
  const { error } = await sb.from('liens_bibliques').update({
    type: 1, fiabilite: 'probable', arbitrage_requis: false,
    motif: (l.motif ? l.motif + ' ' : '') + '[re-typé : citation directe, référence enchâssée dans la citation]'
  }).eq('id', l.id)
  if (error) throw error; ok++
}
console.log(`\n✓ ${ok} liens promus en type 1`)
