import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { SPECS, RETARGETS } from './somme-supp-q81-end-specs.mjs'

const R = 'tmp/somme-liens-audit-2026-07-29'
const raw = JSON.parse(readFileSync(`${R}/supp-q81-end-raw.json`, 'utf8'))
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ids = [...new Set([
  ...SPECS.map((x) => x[1]),
  ...raw.links.map((x) => RETARGETS.get(x.id)?.[0] ?? x.canon_id).filter(Boolean),
])].sort()
const rows = []
for (let from = 0; from < ids.length; from += 100) {
  const { data, error } = await sb.from('versets_lecture')
    .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
    .in('id_verset', ids.slice(from, from + 100)).order('id_verset')
  if (error) throw error
  rows.push(...data)
}
const got = new Set(rows.map((x) => x.id_verset))
const missing = ids.filter((x) => !got.has(x))
mkdirSync(R, { recursive: true })
writeFileSync(`${R}/supp-q81-end-candidate-witnesses.json`, JSON.stringify(rows, null, 2) + '\n')
console.log(JSON.stringify({ requested: ids.length, witnesses: rows.length, missing }, null, 2))
