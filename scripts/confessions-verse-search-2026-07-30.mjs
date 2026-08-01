import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const needle = process.argv.slice(2).join(' ').trim()
if (!needle) throw new Error('Usage: node scripts/confessions-verse-search-2026-07-30.mjs <fragment>')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const columns = ['TR0004', 'TR0001', 'TR0003']
const out = []
for (const column of columns) {
  const { data, error } = await db.from('versets_lecture')
    .select(`id_verset,${column}`).ilike(column, `%${needle}%`).limit(50)
  if (error) throw new Error(`${column}: ${error.message}`)
  out.push(...(data ?? []).map(row => ({ column, ...row })))
}
console.log(JSON.stringify(out, null, 2))
