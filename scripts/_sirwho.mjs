import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const {data}=await sb.from('versets_v2').select('trad_id').eq('livre','SIR')
const c={}; for(const r of data) c[r.trad_id]=(c[r.trad_id]||0)+1
console.log('trads SIR:',c)
const {data:k}=await sb.from('versets_canon').select('*').eq('canon_id','SIR.3.19').limit(1)
console.log('canon row:',JSON.stringify(k))
