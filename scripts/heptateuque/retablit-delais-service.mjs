import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { error } = await sb.rpc('exec_sql', {
  sql: "alter role service_role set statement_timeout = '8s'; alter role service_role set lock_timeout = '8s'; alter function public.exec_sql(text) set statement_timeout = '8s'; alter function public.rafraichir_versets_lecture() set statement_timeout = '8s'; drop function if exists public.rafraichir_versets_lecture_long(); notify pgrst, 'reload config'; notify pgrst, 'reload schema';",
})
if (error) throw error
console.log('✓ délais service rétablis à 8 s')
