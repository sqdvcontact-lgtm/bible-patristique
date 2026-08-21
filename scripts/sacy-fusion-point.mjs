// Localise le verset d'une édition qui fusionne DEUX versets du canon.
// Principe : à partir du point de fusion, la correspondance se décale d'un rang. On teste
// donc chaque position de rupture possible et on retient celle qui maximise l'accord global.
//   node scripts/sacy-fusion-point.mjs NUM nom_ 11 20 23 25 26
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const [CODE, PREFIXE, ...CHS] = process.argv.slice(2)
const S = JSON.parse(readFileSync(D+PREFIXE+'transcrit.json','utf8'))
const cr = new Map()
for (const r of await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').like('canon_id',CODE+'.%').order('canon_id')))
  cr.set(r.canon_id, r.texte)

const sig = t => new Set(((t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/f/g,'s')
  .toLowerCase().match(/[a-z]{4,}|\d+/g)||[]))
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.min(a.size,b.size) }

for (const ch of CHS.map(Number)){
  const sv = S.filter(v=>v.ch===ch).sort((a,b)=>a.v-b.v)
  const cv = []
  for (let n=1; cr.has(`${CODE}.${ch}.${n}`); n++) cv.push({ n, t: cr.get(`${CODE}.${ch}.${n}`) })
  if (!sv.length || !cv.length) { console.log(`\n${CODE} ${ch} : données manquantes`); continue }
  if (cv.length !== sv.length + 1) { console.log(`\n${CODE} ${ch} : écart de ${cv.length - sv.length}, non traité ici`); continue }

  // rupture après le verset Sacy k : 1..k alignés 1:1, k+1..fin décalés de +1
  let best = null
  for (let k = 1; k <= sv.length; k++){
    let som = 0, n = 0
    for (let i = 0; i < sv.length; i++){
      const cible = i < k ? sv[i].v : sv[i].v + 1
      const c = cv.find(x => x.n === cible)
      if (!c) continue
      som += jac(sig(sv[i].texte), sig(c.t)); n++
    }
    const moy = n ? som / n : 0
    if (!best || moy > best.moy) best = { k, moy }
  }
  const sansRupture = (() => { let s=0,n=0; for(const v of sv){ const c=cv.find(x=>x.n===v.v); if(c){ s+=jac(sig(v.texte),sig(c.t)); n++ } } return n?s/n:0 })()
  console.log(`\n${CODE} ${ch} — Sacy ${sv.length} v. / canon ${cv.length} v.`)
  console.log(`   accord sans décalage        : ${sansRupture.toFixed(3)}`)
  console.log(`   meilleure rupture : après v.${best.k} → accord ${best.moy.toFixed(3)}`)
  const gain = best.moy - sansRupture
  console.log(`   gain : ${gain >= 0 ? '+' : ''}${gain.toFixed(3)}  ${gain > 0.05 ? '✓ fusion probable au v.'+best.k : '✗ non concluant'}`)
  if (gain > 0.05){
    const f = sv.find(v => v.v === best.k)
    if (f) console.log(`   v.${best.k} : ${f.texte.replace(/<\/?i>/g,'').slice(0,110)}`)
  }
}
