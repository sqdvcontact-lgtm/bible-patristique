// Classe chaque chapitre Giguet selon la fiabilité du mappage par LABEL vers le canon.
// CLEAN  : labels = 1..N et N = compte canon → identité.
// GAP    : labels strictement croissants, ⊆ [1..canon], début à 1 → sauts = omissions LXX, label fiable.
// EXTRA  : labels croissants mais max > canon (ou surplus) → ajouts LXX, verset(s) hors ossature.
// GLITCH : labels non monotones (décroissance/doublon/reset) → label douteux, revue manuelle.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// compte canon par livre/chapitre
const canon = {}
let from = 0
while (true) {
  const { data, error } = await sb.from('versets_canon').select('id,livre').order('id').range(from, from+999)
  if (error) throw new Error(error.message)
  for (const r of data) { const ch = +r.id.split('.')[1]; (canon[r.livre] ??= {})[ch] = (canon[r.livre]?.[ch] || 0) + 1 }
  if (data.length < 1000) break; from += 1000
}

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const tally = { CLEAN:0, GAP:0, EXTRA:0, GLITCH:0, NOCANON:0 }
const buckets = { GAP:[], EXTRA:[], GLITCH:[], NOCANON:[] }

for (const [code, chs] of Object.entries(gig)) {
  for (const c of chs) {
    const labels = c.versets.map(v => v.v)
    const cc = canon[code]?.[c.ch]
    if (!cc) { tally.NOCANON++; buckets.NOCANON.push(`${code} ${c.ch} (${labels.length}v)`); continue }
    const monotone = labels.every((n,i) => i===0 || n > labels[i-1])
    const maxL = Math.max(...labels)
    const startsAt1 = labels[0] === 1
    const clean = labels.length === cc && labels.every((n,i) => n === i+1)
    let bucket
    if (clean) bucket = 'CLEAN'
    else if (monotone && startsAt1 && maxL <= cc) bucket = 'GAP'
    else if (monotone && (maxL > cc || labels.length > cc)) bucket = 'EXTRA'
    else bucket = 'GLITCH'
    tally[bucket]++
    if (bucket !== 'CLEAN') buckets[bucket].push(`${code} ${c.ch}: [${labels.join(',')}] canon=${cc}`)
  }
}

console.log('=== RÉPARTITION DES CHAPITRES ===')
for (const [k,v] of Object.entries(tally)) console.log(`  ${k}: ${v}`)
console.log(`  (auto-alignable = CLEAN+GAP = ${tally.CLEAN+tally.GAP})`)
for (const k of ['GLITCH','EXTRA','NOCANON']) {
  console.log(`\n=== ${k} (${buckets[k].length}) ===`)
  for (const l of buckets[k].slice(0,40)) console.log('  '+l)
  if (buckets[k].length>40) console.log(`  … +${buckets[k].length-40}`)
}
writeFileSync('scripts/giguet-classes.json', JSON.stringify(buckets, null, 1))
