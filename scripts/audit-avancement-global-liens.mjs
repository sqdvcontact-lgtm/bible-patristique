import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const queries = await Promise.all([
  db.from('oeuvres').select('id_oeuvre', { count: 'exact', head: true }),
  db.from('segments').select('id', { count: 'exact', head: true }),
  db.from('segments').select('id', { count: 'exact', head: true }).not('liens_revus_le', 'is', null),
  db.from('liens_bibliques').select('id', { count: 'exact', head: true }),
  db.from('liens_bibliques').select('id', { count: 'exact', head: true }).eq('fiabilite', 'à constituer'),
  db.from('oeuvres').select('id_oeuvre,titre').in('id_oeuvre', ['A0010O0004', 'A0010O0002', 'A0012O0002']),
])
for (const result of queries) if (result.error) throw result.error
const [works, segments, reviewed, links, unresolved, controls] = queries
console.log(JSON.stringify({
  oeuvres: works.count,
  segments: segments.count,
  segments_revus: reviewed.count,
  segments_a_relire: segments.count - reviewed.count,
  avancement_pct: Number((100 * reviewed.count / segments.count).toFixed(2)),
  liens: links.count,
  liens_a_constituer: unresolved.count,
  controle_cibles: controls.data,
}, null, 2))
