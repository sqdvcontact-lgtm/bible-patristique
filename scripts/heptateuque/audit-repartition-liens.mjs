import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const segments = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('segments').select('id,ref_niv1')
    .eq('id_oeuvre', OEUVRE).order('segment_numero').range(from, from + 999)
  if (error) throw error
  segments.push(...data)
  if (data.length < 1000) break
}
const links = []
// Retrieval is chunked by segment ids to avoid URL limits.
for (let i = 0; i < segments.length; i += 200) {
  const ids = segments.slice(i, i + 200).map((row) => row.id)
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('liens_bibliques').select('segment_id')
      .in('segment_id', ids).range(from, from + 999)
    if (error) throw error
    links.push(...data)
    if (data.length < 1000) break
  }
}
const bookBySegment = new Map(segments.map((row) => [row.id, row.ref_niv1]))
const result = {}
for (const link of links) {
  const book = bookBySegment.get(link.segment_id) ?? '(sans niveau 1)'
  result[book] = (result[book] ?? 0) + 1
}
console.log(JSON.stringify({ total: links.length, par_livre: result }, null, 2))
