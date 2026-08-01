import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK_ID = 'A0010O0001'
const OUT = 'tmp/confessions-links-2026-07-30'
const BODY_NATURES = ['texte', 'citation']

const env = Object.fromEntries(readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error, count } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return { data: data ?? [], count }
}
const fetchPaged = async (factory, label, pageSize = 1000) => {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data } = await must(factory(from, from + pageSize - 1), `${label}:${from}`)
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}
const tally = (rows, field) => rows.reduce((acc, row) => {
  const key = String(row[field] ?? 'null')
  acc[key] = (acc[key] ?? 0) + 1
  return acc
}, {})
const sha256 = value => createHash('sha256').update(value).digest('hex').toUpperCase()

mkdirSync(OUT, { recursive: true })
const segments = await fetchPaged((from, to) => db.from('segments')
  .select('id,segment_numero,segment_texte,texte_original,nature,ref_niv1,ref_niv2,ref_niv3,paragraphe,rang,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).order('segment_numero').range(from, to), 'segments')
const segmentIds = segments.map(row => row.id)
const links = []
for (let offset = 0; offset < segmentIds.length; offset += 250) {
  const { data } = await must(db.from('liens_bibliques')
    .select('id,segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', segmentIds.slice(offset, offset + 250)), `links:${offset}`)
  links.push(...data)
}

const body = segments.filter(row => BODY_NATURES.includes(row.nature))
const apparatus = segments.filter(row => !BODY_NATURES.includes(row.nature))
const byId = new Map(segments.map(row => [row.id, row]))
const paragraphs = []
let current = null
for (const row of body) {
  const key = [row.ref_niv1, row.ref_niv2, row.paragraphe].join('\u001f')
  if (!current || current.key !== key) {
    current = {
      key,
      book: row.ref_niv1,
      chapter: row.ref_niv2,
      paragraph: row.paragraphe,
      first_segment: row.segment_numero,
      last_segment: row.segment_numero,
      segments: [],
      french: '',
      latin: null,
    }
    paragraphs.push(current)
  }
  current.last_segment = row.segment_numero
  current.segments.push({
    id: row.id,
    number: row.segment_numero,
    rank: row.rang,
    text: row.segment_texte,
  })
  current.french += `${current.french ? ' ' : ''}${row.segment_texte.replace(/^\*|\*$/g, '')}`
  if (row.texte_original) current.latin = `${current.latin ? `${current.latin} ` : ''}${row.texte_original}`
}

const callRows = segments.flatMap(row => [...String(row.segment_texte ?? '').matchAll(/\[\[([^\]]+)\]\]/g)]
  .map(match => ({ segment: row.segment_numero, key: match[1] })))
const definitionRows = segments.flatMap(row => [...String(row.notes ?? '').matchAll(/^\[\[([^\]]+)\]\]/gm)]
  .map(match => ({ segment: row.segment_numero, key: match[1] })))
const quoteSegments = body.filter(row => /[«»“”"]/.test(row.segment_texte))
const parentheticalReferenceSegments = body.filter(row => /\((?:[1-3]\s*)?[A-ZÀ-Ÿ][A-Za-zÀ-ÿ.]+\s+\d+(?:\s*[,.:]\s*\d+)?\)/.test(row.segment_texte))
const targetIds = [...new Set(links.map(row => row.canon_id).filter(Boolean))]
const verseIds = []
for (let offset = 0; offset < targetIds.length; offset += 250) {
  const { data } = await must(db.from('versets_lecture').select('id_verset').in('id_verset', targetIds.slice(offset, offset + 250)), `targets:${offset}`)
  verseIds.push(...data.map(row => row.id_verset))
}
const verseSet = new Set(verseIds)
const duplicateKey = row => [row.segment_id, row.canon_id ?? '', row.verset_v2_id ?? '', row.livre ?? '', row.chapitre ?? '', row.type].join('|')
const duplicateCounts = links.reduce((map, row) => map.set(duplicateKey(row), (map.get(duplicateKey(row)) ?? 0) + 1), new Map())
const books = [...new Set(body.map(row => row.ref_niv1))]
const bookStats = books.map(book => {
  const rows = body.filter(row => row.ref_niv1 === book)
  const ids = new Set(rows.map(row => row.id))
  return {
    book,
    segments: rows.length,
    paragraphs: new Set(rows.map(row => `${row.ref_niv2}\u001f${row.paragraphe}`)).size,
    chapters: new Set(rows.map(row => row.ref_niv2)).size,
    links: links.filter(link => ids.has(link.segment_id)).length,
    reviewed: rows.filter(row => row.liens_revus_le && row.liens_revus_par === 'IA-lecture').length,
  }
})
const report = {
  audited_at: new Date().toISOString(),
  work_id: WORK_ID,
  counts: {
    segments: segments.length,
    body_segments: body.length,
    apparatus_segments: apparatus.length,
    paragraphs: paragraphs.length,
    books: books.length,
    chapters: new Set(body.map(row => `${row.ref_niv1}\u001f${row.ref_niv2}`)).size,
    links: links.length,
    reviewed_body_segments: body.filter(row => row.liens_revus_le && row.liens_revus_par === 'IA-lecture').length,
    note_calls: callRows.length,
    note_definitions: definitionRows.length,
    quote_segments: quoteSegments.length,
    parenthetical_reference_segments: parentheticalReferenceSegments.length,
  },
  natures: tally(segments, 'nature'),
  link_types: tally(links, 'type'),
  link_reliability: tally(links, 'fiabilite'),
  link_provenance: tally(links, 'provenance'),
  arbitrations: links.filter(row => row.arbitrage_requis).length,
  links_without_target: links.filter(row => !row.canon_id && !row.verset_v2_id && !(row.livre && row.chapitre)).length,
  links_without_motif: links.filter(row => !String(row.motif ?? '').trim()).length,
  dead_canon_targets: targetIds.filter(id => !verseSet.has(id)),
  duplicate_keys: [...duplicateCounts].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count })),
  note_calls: callRows,
  note_definitions: definitionRows,
  book_stats: bookStats,
  text_sha256: sha256(segments.map(row => `${row.segment_numero}\t${row.segment_texte}\t${row.texte_original ?? ''}`).join('\n')),
}
const enrichedLinks = links.map(link => ({
  ...link,
  segment_numero: byId.get(link.segment_id)?.segment_numero ?? null,
  segment_texte: byId.get(link.segment_id)?.segment_texte ?? null,
  book: byId.get(link.segment_id)?.ref_niv1 ?? null,
  chapter: byId.get(link.segment_id)?.ref_niv2 ?? null,
}))
writeFileSync(`${OUT}/initial-audit.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
writeFileSync(`${OUT}/initial-links.json`, `${JSON.stringify(enrichedLinks, null, 2)}\n`, 'utf8')
writeFileSync(`${OUT}/paragraphs.json`, `${JSON.stringify(paragraphs, null, 2)}\n`, 'utf8')
writeFileSync(`${OUT}/pre-links-text.sha256`, `${report.text_sha256}  segments-and-latin\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
