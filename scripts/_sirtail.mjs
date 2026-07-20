import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const chaps=[3,5,10,11,13,16,17,18,19,20,22,23,24,25,26,32,33,34,36,41,43,48]
const out={}
for(const c of chaps){
  const {data}=await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','SIR').like('canon_id',`SIR.${c}.%`)
  const r=data.sort((a,b)=>+a.canon_id.split('.')[2]-+b.canon_id.split('.')[2])
  out[c]=r.map(x=>[+x.canon_id.split('.')[2],(x.texte||'').replace(/<[^>]*>/g,'').slice(0,260)])
}
console.log(JSON.stringify(out))
