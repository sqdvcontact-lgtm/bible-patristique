import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const patterns = process.argv.slice(2)
if (!patterns.length) throw new Error('Passer au moins un fragment textuel.')
for (const pattern of patterns) {
  const clauses = ['TR0001', 'TR0003', 'TR0004'].map((c) => `${c}.ilike.%${pattern}%`).join(',')
  const { data, error } = await sb.from('versets_lecture')
    .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
    .or(clauses).limit(40)
  if (error) throw error
  console.log(JSON.stringify({ pattern, results: data }, null, 2))
}
