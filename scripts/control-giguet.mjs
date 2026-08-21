// Contrôle des divergences Giguet (LXX) vs ossature canonique (AELF). Lecture seule.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1], m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
// giguet[code] = [{ch, versets:[...]}] → gigCount[code][ch] = nb versets
const gigCount = {}
for (const [code, chs] of Object.entries(gig)) {
  gigCount[code] = {}
  for (const c of chs) gigCount[code][c.ch] = c.versets.length
}

// ossature : nb versets par (livre, ch_canon)
const canon = {}
let from = 0
while (true) {
  const { data, error } = await sb.from('versets_canon').select('livre, ch_canon').order('id').range(from, from+999)
  if (error) throw new Error(error.message)
  for (const r of data) { (canon[r.livre] ??= {}); canon[r.livre][r.ch_canon] = (canon[r.livre][r.ch_canon]||0)+1 }
  if (data.length < 1000) break
  from += 1000
}

const exact = [], proche = [], divergent = []
for (const code of Object.keys(gigCount)) {
  const g = gigCount[code], c = canon[code]
  if (!c) { divergent.push({ code, note: 'absent de l’ossature (ex. LJE intégré à BAR)' }); continue }
  const chapsG = Object.keys(g).map(Number), chapsC = Object.keys(c).map(Number)
  const maxG = Math.max(...chapsG), maxC = Math.max(...chapsC)
  const diffs = []
  const allCh = new Set([...chapsG, ...chapsC])
  for (const ch of [...allCh].sort((a,b)=>a-b)) {
    const vg = g[ch] ?? 0, vc = c[ch] ?? 0
    if (vg !== vc) diffs.push(`${ch}:(${vg}/${vc})`)
  }
  const totG = chapsG.reduce((s,ch)=>s+g[ch],0), totC = chapsC.reduce((s,ch)=>s+c[ch],0)
  const info = { code, maxG, maxC, diffs: diffs.length, delta: totG-totC, exemples: diffs.slice(0,8) }
  if (diffs.length === 0) exact.push(info)
  else if (maxG === maxC && diffs.length <= 3 && Math.abs(totG-totC) <= 4) proche.push(info)
  else divergent.push(info)
}

const fmt = a => a.map(x => `${x.code}${x.maxG!==undefined?` (${x.maxG}ch, Δ${x.delta>=0?'+':''}${x.delta})`:''}`).join(', ')
console.log(`\n=== SANS DIVERGENCE (${exact.length}) — intégration par identité ===`)
console.log(fmt(exact))
console.log(`\n=== PROCHES (${proche.length}) — 1-3 chapitres à écart minime ===`)
proche.forEach(x => console.log(`  ${x.code} (${x.maxG}ch, Δ${x.delta}) : ch ${x.exemples.join(' ')}`))
console.log(`\n=== DIVERGENTS (${divergent.length}) — traitement verset par verset ===`)
divergent.forEach(x => console.log(`  ${x.code}${x.note?' — '+x.note:` (Gig ${x.maxG}ch / canon ${x.maxC}ch, Δ${x.delta}, ${x.diffs} ch. différents) ex: ${x.exemples.join(' ')}`}`))
