import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const manifestPath = process.argv.find(arg => arg.endsWith('.json'))
if (!manifestPath) throw new Error('Usage : node scripts/confessions-apply-book-links-2026-07-30.mjs <manifest.json> [--write]')
const config = JSON.parse(readFileSync(manifestPath, 'utf8'))
const WRITE = process.argv.includes('--write')
const VERIFIED = 'vérifié'
mkdirSync(config.out, { recursive: true })

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data ?? []
}
const segments = []
for (let offset = 0; ; offset += 1000) {
  const page = await must(db.from('segments')
    .select('id,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', config.work_id).eq('ref_niv1', config.book)
    .in('nature', ['texte', 'citation']).order('segment_numero')
    .range(offset, offset + 999), `segments:${offset}`)
  segments.push(...page)
  if (page.length < 1000) break
}
if (segments.length !== config.expected_segments || segments[0]?.segment_numero !== config.first_segment || segments.at(-1)?.segment_numero !== config.last_segment) {
  throw new Error(`Précondition segments rompue : ${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero}`)
}
const byNumber = new Map(segments.map(row => [row.segment_numero, row]))
const existing = []
for (let offset = 0; offset < segments.length; offset += 250) {
  existing.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(offset, offset + 250).map(row => row.id)), `liens:${offset}`))
}
if (existing.length) throw new Error(`Précondition rompue : ${existing.length} liens existent déjà dans ${config.book}`)
const targets = [...new Set(config.links.map(row => row[1]))]
const witnesses = []
for (let offset = 0; offset < targets.length; offset += 250) {
  witnesses.push(...await must(db.from('versets_lecture').select('id_verset')
    .in('id_verset', targets.slice(offset, offset + 250)), `cibles:${offset}`))
}
const found = new Set(witnesses.map(row => row.id_verset))
const missing = targets.filter(target => !found.has(target))
if (missing.length) throw new Error(`Cibles absentes : ${missing.join(', ')}`)
const rows = [
  ...config.links.map(([number, canon_id, type, motif]) => ({
    segment_id: byNumber.get(number)?.id, canon_id, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: VERIFIED, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...config.unresolved.map(([number, type, motif]) => ({
    segment_id: byNumber.get(number)?.id, canon_id: null, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: 'à constituer', motif, provenance: 'lecture', arbitrage_requis: true,
  })),
]
if (rows.some(row => !row.segment_id)) throw new Error('Un segment visé est absent')
const key = row => `${row.segment_id}|${row.canon_id ?? ''}|${row.type}|${row.motif}`
if (new Set(rows.map(key)).size !== rows.length) throw new Error('Doublon interne')
const textHash = createHash('sha256').update(segments.map(row => `${row.segment_numero}\t${row.segment_texte}`).join('\n')).digest('hex').toUpperCase()
writeFileSync(`${config.out}/pre-write.json`, `${JSON.stringify({
  work_id: config.work_id, book: config.book, created_at: new Date().toISOString(), segments,
  proposed_links: rows, text_hash: textHash,
}, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  mode: WRITE ? 'write' : 'dry', book: config.book, segments: segments.length, links: rows.length,
  types: rows.reduce((acc, row) => ({ ...acc, [row.type]: (acc[row.type] ?? 0) + 1 }), {}),
  unresolved: config.unresolved.length, text_hash: textHash,
}, null, 2))
if (!WRITE) process.exit(0)
for (let offset = 0; offset < rows.length; offset += 100) {
  await must(db.from('liens_bibliques').insert(rows.slice(offset, offset + 100)), `insert:${offset}`)
}
const reviewedAt = new Date().toISOString()
for (let offset = 0; offset < segments.length; offset += 200) {
  await must(db.from('segments').update({ liens_revus_le: reviewedAt, liens_revus_par: 'IA-lecture' })
    .in('id', segments.slice(offset, offset + 200).map(row => row.id)), `review:${offset}`)
}
console.log(`${config.book} écrit : ${rows.length} liens ; ${segments.length} segments marqués relus.`)
