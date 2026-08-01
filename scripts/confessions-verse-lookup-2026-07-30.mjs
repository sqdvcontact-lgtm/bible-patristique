import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ids = process.argv.slice(2)
if (!ids.length) throw new Error('Donner au moins un id_verset')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data, error } = await db.from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', ids)
if (error) throw error
const byId = new Map(data.map(row => [row.id_verset, row]))
console.log(JSON.stringify(ids.map(id => byId.get(id) ?? { id_verset: id, missing: true }), null, 2))
