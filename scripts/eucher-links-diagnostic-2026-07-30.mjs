import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const WORK_ID = 'A0418O0003'
const OUT = 'tmp/eucher-links-2026-07-30'
mkdirSync(OUT, { recursive: true })
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
const parseNotes = value => {
  if (!value) return {}
  if (typeof value === 'object') return value
  const out = {}
  for (const match of String(value).matchAll(/\[\[([A-Z0-9]+)\]\]\s*([\s\S]*?)(?=\s*\[\[[A-Z0-9]+\]\]|$)/g)) out[match[1]] = match[2].trim()
  return out
}

const segments = await must(db.from('segments')
  .select('id,segment_numero,segment_texte,ref_niv1,nature,notes,paragraphe,rang,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).in('nature', ['texte', 'citation'])
  .order('segment_numero'), 'segments')
const links = []
for (let index = 0; index < segments.length; index += 300) {
  links.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(index, index + 300).map(segment => segment.id)), 'liens'))
}

const byArticle = new Map()
for (const segment of segments) {
  const article = segment.ref_niv1 ?? ''
  if (!byArticle.has(article)) byArticle.set(article, [])
  byArticle.get(article).push(segment)
}
let markdown = '# Eucher — relevé intégral pour constitution des liens\n\n'
for (const [article, rows] of byArticle) {
  markdown += `## Article ${article}\n\n`
  for (const row of rows) {
    const noteMap = parseNotes(row.notes)
    markdown += `- [seg ${row.segment_numero} · id ${row.id} · p${row.paragraphe} r${row.rang} · ${row.nature}] ${row.segment_texte}\n`
    for (const [number, note] of Object.entries(noteMap)) markdown += `  - Note ${number} : ${note}\n`
  }
  markdown += '\n'
}
writeFileSync(`${OUT}/eucher-body-with-notes.md`, markdown, 'utf8')

const noteRows = segments.flatMap(segment => Object.entries(parseNotes(segment.notes))
  .map(([number, note]) => ({ segment_id: segment.id, segment_numero: segment.segment_numero, article: segment.ref_niv1, number, note })))
const report = {
  work_id: WORK_ID,
  body_segments: segments.length,
  articles: byArticle.size,
  notes: noteRows,
  existing_links: links,
  reviewed_segments: segments.filter(segment => segment.liens_revus_le).length,
  markers: {
    guillemets: segments.filter(segment => /[«»]/.test(segment.segment_texte)).map(segment => segment.segment_numero),
    annonces: segments.filter(segment => /il est écrit|écriture|evangile|évangile|apostre|apôtre|prophete|prophète|david|salomon|dit le seigneur|dit jesus|dit jésus/i.test(segment.segment_texte)).map(segment => segment.segment_numero),
  },
}
writeFileSync(`${OUT}/diagnostic.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  body_segments: report.body_segments,
  articles: report.articles,
  notes: noteRows.length,
  existing_links: links.length,
  reviewed_segments: report.reviewed_segments,
  guillemets: report.markers.guillemets.length,
  annonces: report.markers.annonces.length,
  output: `${OUT}/eucher-body-with-notes.md`,
}, null, 2))
console.log('\nNOTES\n' + noteRows.map(row => `#${row.segment_numero} article ${row.article} note ${row.number}: ${row.note}`).join('\n'))
