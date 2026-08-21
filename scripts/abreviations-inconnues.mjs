// Détecte les abréviations que `abreviations_bibliques` ne connaît PAS encore.
//
// Une abréviation absente de la table est une référence perdue — et perdue en
// silence : rien ne distingue « aucune référence ici » de « je n'ai pas su la
// lire ». Ce script cherche donc, dans les parenthèses du corpus, tout ce qui a
// la forme d'une référence sans être reconnu, et le classe par fréquence.
//
// Il n'écrit rien : il dit ce qu'il faut ajouter à la table.
//
//   node scripts/abreviations-inconnues.mjs              (tout le corpus)
//   node scripts/abreviations-inconnues.mjs A0044O0001   (une œuvre)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))

const normaliser = s => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[\s.]/g, '')

const connues = new Set()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('abreviations_bibliques').select('forme').order('forme').range(from, from + 999)
  if (!data?.length) break
  for (const r of data) connues.add(r.forme)
  if (data.length < 1000) break
}
console.log(`table : ${connues.size} formes connues`)

const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, id_oeuvre, segment_texte').eq('nature', 'texte').order('id').range(from, from + 999)
  if (OEUVRE) q = q.eq('id_oeuvre', OEUVRE)
  const { data } = await q
  if (!data?.length) break
  segs.push(...data); if (data.length < 1000) break
}

// Tout ce qui ressemble à « <mot> <chiffre>, <chiffre> » dans une parenthèse.
// On ratisse large exprès : c'est le tri par fréquence qui fera le ménage.
const RE = /(?:^|[\s;,(]|\bcf\.?\s*|\bet\s+)((?:[1-4]\s*)?[A-ZÉÈÀ][a-zéèêàïôûç]{1,14})\.?\s+(\d{1,3})\s*[,.]\s*\d{1,3}/g
const inconnues = new Map()

for (const s of segs) {
  for (const par of String(s.segment_texte || '').matchAll(/\(([^)]{3,90})\)/g)) {
    for (const m of par[1].matchAll(RE)) {
      const brut = m[1].trim()
      const n = normaliser(brut)
      if (connues.has(n)) continue
      // « 1 Cor » inconnu, mais « Cor » connu ? Alors la forme numérotée se
      // déduit — inutile de la signaler.
      const sansRang = n.replace(/^[1-4]/, '')
      if (sansRang !== n && connues.has(sansRang)) continue
      if (!inconnues.has(n)) inconnues.set(n, { brut, n: 0, oeuvres: new Set(), exemples: [] })
      const e = inconnues.get(n)
      e.n++; e.oeuvres.add(s.id_oeuvre)
      if (e.exemples.length < 2) e.exemples.push(par[1].trim().slice(0, 40))
    }
  }
}

console.log(`${segs.length} segments analysés · ${inconnues.size} forme(s) inconnue(s)\n`)
const tri = [...inconnues.values()].sort((a, b) => b.n - a.n)
if (!tri.length) { console.log('✓ rien à ajouter'); process.exit(0) }

console.log('  occ.  forme            œuvres  exemples')
for (const e of tri.slice(0, 40)) {
  console.log(`  ${String(e.n).padStart(4)}  ${e.brut.padEnd(16)} ${String(e.oeuvres.size).padStart(2)}      ${e.exemples.map(x => JSON.stringify(x)).join(' ')}`)
}
console.log('\nAjouter les formes légitimes dans scripts/abreviations-peupler.mjs (table VARIANTES), puis relancer ce script.')
