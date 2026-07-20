import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
let all=[],from=0
while(true){const {data}=await sb.from('versets_canon').select('ch_canon,v_canon').eq('livre','SIR').range(from,from+999);all=all.concat(data);if(data.length<1000)break;from+=1000}
const m={};for(const r of all)m[r.ch_canon]=Math.max(m[r.ch_canon]||0,r.v_canon)
console.log('total',all.length)
console.log(Object.keys(m).sort((a,b)=>a-b).map(c=>c+':'+m[c]).join(' '))
