// Valide chaque verset Sacy extrait en comparant son contenu à la Crampon (TR0003)
// au même canon_id. Sacy et Crampon traduisent le même verset : les noms propres et
// les nombres doivent coïncider. Ce qui ne coïncide pas est écarté, pas deviné.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const crampon = new Map()
for (const r of await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').like('canon_id','GEN.%').order('canon_id')))
  crampon.set(r.canon_id, r.texte)

const sacy = JSON.parse(readFileSync(D+'sacy_t1.json','utf8')).filter(v=>v.livreIdx===0)

// mots significatifs : noms propres (majuscule) et nombres, insensibles à l'OCR
const STOP = new Set(['le','la','les','de','des','du','et','en','a','au','aux','il','elle','ils','que','qui','se','sa','son','ses','dans','pour','par','sur','ne','pas','plus','tout','tous','vous','nous','je','me','mon','ma','mes','leur','lui','ce','cet','cette','est','sont','fut','avoit','etoit','avec','comme','mais','car','donc','ainsi','toute','toutes'])
const sig = t => new Set(((t||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/f/g,'s').toLowerCase().match(/[a-z]{4,}|\d+/g)||[]).filter(w=>!STOP.has(w)))
function jaccard(a,b){ if(!a.size||!b.size) return 0
  let inter=0; for(const w of a) if(b.has(w)) inter++
  return inter/Math.min(a.size,b.size) }

const ok=[], douteux=[], sansRef=[]
for (const v of sacy){
  const cid = `GEN.${v.ch}.${v.v}`
  const ref = crampon.get(cid)
  if(!ref){ sansRef.push({...v, cid}); continue }
  const score = jaccard(sig(v.texte), sig(ref))
  if(score>=0.34) ok.push({...v, cid, score})
  else {
    // la bonne référence est peut-être dans le voisinage : on cherche le meilleur candidat
    let best=null
    for(let d=-6; d<=6; d++){
      const c2=`GEN.${v.ch}.${v.v+d}`, r2=crampon.get(c2)
      if(!r2) continue
      const s2=jaccard(sig(v.texte), sig(r2))
      if(s2>=0.34 && (!best||s2>best.score)) best={cid:c2, score:s2, decalage:d}
    }
    douteux.push({...v, cid, score, suggestion:best})
  }
}

writeFileSync(D+'genese_valide.json', JSON.stringify(ok,null,1))
writeFileSync(D+'genese_douteux.json', JSON.stringify(douteux,null,1))

console.log('versets Sacy extraits (Genèse) : '+sacy.length)
console.log('  référence CONFIRMÉE par la Crampon : '+ok.length+'  ('+Math.round(100*ok.length/sacy.length)+'%)')
console.log('  douteux : '+douteux.length+'   dont recalables ailleurs : '+douteux.filter(d=>d.suggestion).length)
console.log('  hors canon (n° de verset inexistant) : '+sansRef.length)
const chOk = new Set(ok.map(v=>v.ch))
console.log('\nchapitres avec au moins un verset confirmé : '+chOk.size+'/50')
console.log('\nexemples de décalages détectés :')
douteux.filter(d=>d.suggestion).slice(0,8).forEach(d=>
  console.log('  '+d.cid+' → devrait être '+d.suggestion.cid+' (décalage '+(d.suggestion.decalage>0?'+':'')+d.suggestion.decalage+', score '+d.suggestion.score.toFixed(2)+')'))
