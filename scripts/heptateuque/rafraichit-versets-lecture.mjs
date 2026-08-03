import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const regler = async (delai) => {
  const { error } = await sb.rpc('exec_sql', {
    sql: `alter role service_role set statement_timeout = '${delai}'; alter role service_role set lock_timeout = '${delai}'; notify pgrst, 'reload config';`,
  })
  if (error) throw error
  await new Promise((resolve) => setTimeout(resolve, 1500))
}
await regler('120s')
let erreur
try {
  const resultat = await sb.rpc('rafraichir_versets_lecture')
  erreur = resultat.error
} finally {
  await regler('8s')
}
if (erreur) throw erreur
console.log('✓ versets_lecture rafraîchie ; délai service rétabli à 8 s')
