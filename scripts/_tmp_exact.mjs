import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003')
  .in('canon_id',['JDG.21.24','ISA.38.21','WIS.9.18','DEU.5.17'])
for(const r of data||[]) console.log('\n### '+r.canon_id+'\n'+r.texte)
const { data: c1 } = await sb.from('versets_canon').select('*').limit(1)
console.log('\n--- colonnes versets_canon ---\n', Object.keys(c1?.[0]||{}).join(', '))
console.log(JSON.stringify(c1?.[0]))
