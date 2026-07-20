import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ON = JSON.parse(readFileSync('scripts/_sironline.json','utf8'))
const norm = s => (s||'').replace(/<[^>]+>/g,'').replace(/[«»"'’‘""\[\]—–\-,;:.!?()]/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
const words = s => norm(s).split(' ').filter(Boolean)
const sim = (a,b)=>{const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let i=0;for(const w of A)if(B.has(w))i++;return i/Math.min(A.size,B.size)}
for(const ch of Object.keys(ON).map(Number).sort((a,b)=>a-b)){
  const {data} = await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','SIR').like('canon_id',`SIR.${ch}.%`)
  const db={}; for(const r of data) db[+r.canon_id.split('.')[2]]=r.texte
  const nOn=Math.max(...Object.keys(ON[ch]).map(Number)), nDb=Math.max(...Object.keys(db).map(Number))
  // test A : sans décalage (db[k] ~ on[k]) ; test B : avec décalage (db[k] ~ on[k-1])
  let a=0,b=0,n=0, worstA=[]
  for(let k=1;k<=nOn;k++){ if(!db[k]||!db[k].trim())continue; n++
    const sA=sim(db[k],ON[ch][k]); const sB=ON[ch][k-1]?sim(db[k],ON[ch][k-1]):0
    a+=sA; b+=sB; if(sA<0.5) worstA.push(`v${k}(${sA.toFixed(2)})`) }
  console.log(`SIR ${ch}: canon max ${nDb} | Crampon en ligne ${nOn} | manque ${nDb-nOn} | sim sans décalage ${(a/n).toFixed(3)} vs avec décalage ${(b/n).toFixed(3)}${worstA.length?'  faibles: '+worstA.join(' '):''}`)
}
