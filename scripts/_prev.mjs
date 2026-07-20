import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await sb.from('travaux_alignement').select('*').eq('cle','sir_align')
if (error) { console.log('ERR', error.message); process.exit(1) }
console.log(JSON.stringify(data).length, 'octets')
console.log(JSON.stringify(data, null, 1))
