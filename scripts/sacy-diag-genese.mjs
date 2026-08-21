// Diagnostic fin d'un livre extrait de Sacy : chapitres et versets manquants vs Vulgate.
//   node scripts/sacy-diag-genese.mjs <fichier.json> <livreIdx> <CODE_CANON>
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const [fich, idxArg='0', code='GEN'] = process.argv.slice(2)
const livreIdx = +idxArg
const extrait = JSON.parse(readFileSync(fich,'utf8')).filter(v=>v.livreIdx===livreIdx)

const canon = await all(sb.from('versets_canon').select('ch_canon,v_canon').eq('livre',code).order('ordre'))
const attendu = new Map()
for (const r of canon){ (attendu.get(r.ch_canon) ?? attendu.set(r.ch_canon,new Set()).get(r.ch_canon)).add(r.v_canon) }

const obtenu = new Map()
for (const v of extrait){ (obtenu.get(v.ch) ?? obtenu.set(v.ch,new Set()).get(v.ch)).add(v.v) }

console.log(`${code} — chapitres ${obtenu.size}/${attendu.size} · versets ${extrait.length}/${canon.length}`)
console.log('\nch | extr/att | versets manquants')
console.log('-'.repeat(78))
let totalManq = 0
for (const [ch, vs] of [...attendu].sort((a,b)=>a[0]-b[0])){
  const o = obtenu.get(ch) ?? new Set()
  const manq = [...vs].filter(v=>!o.has(v)).sort((a,b)=>a-b)
  totalManq += manq.length
  if (!manq.length && o.size===vs.size) continue
  const surnum = [...o].filter(v=>!vs.has(v)).sort((a,b)=>a-b)
  console.log(String(ch).padStart(2)+' | '+String(o.size).padStart(3)+'/'+String(vs.size).padEnd(4)+' | '+
    (manq.length? manq.join(',').slice(0,58) : '—') + (surnum.length? '   [en trop: '+surnum.join(',')+']' : ''))
}
console.log('-'.repeat(78))
console.log('total versets manquants : ' + totalManq)
const chManq = [...attendu.keys()].filter(c=>!obtenu.has(c))
if (chManq.length) console.log('chapitres entièrement absents : ' + chManq.join(', '))
