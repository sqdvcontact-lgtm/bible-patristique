import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
let all=[]
for(let off=0;;off+=1000){
  const {data,error}=await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','SIR').range(off,off+999)
  if(error){console.log('ERR',error.message);break}
  all=all.concat(data); if(data.length<1000)break
}
all.sort((a,b)=>{const[,c1,v1]=a.canon_id.split('.'),[,c2,v2]=b.canon_id.split('.');return +c1-+c2||+v1-+v2})
const byCh={}
for(const r of all){const ch=+r.canon_id.split('.')[1];(byCh[ch]??=[]).push(r)}
for(const ch of Object.keys(byCh).map(Number).sort((a,b)=>a-b)){
  const rows=byCh[ch]; const vides=rows.filter(r=>!r.texte||!r.texte.trim()).map(r=>r.canon_id.split('.')[2])
  console.log(`SIR ${ch}: ${rows.length} créneaux, max v${rows.at(-1).canon_id.split('.')[2]}, vides=[${vides.join(',')}]`)
}
console.log('TOTAL', all.length, 'vides', all.filter(r=>!r.texte||!r.texte.trim()).length)
