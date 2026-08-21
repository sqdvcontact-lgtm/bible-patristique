import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

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
const key = link => `${link.segment_id}|${link.canon_id ?? link.verset_v2_id ?? `${link.livre}.${link.chapitre}`}|${link.type}`

const allSegments = await must(db.from('segments')
  .select('id,segment_numero,segment_texte,nature,notes,ref_niv1,paragraphe,rang,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).order('segment_numero'), 'segments')
const body = allSegments.filter(s => ['texte', 'citation'].includes(s.nature))
const bodyIds = new Set(body.map(s => s.id))
const links = []
for (let index = 0; index < body.length; index += 300) {
  links.push(...await must(db.from('liens_bibliques')
    .select('id,segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', body.slice(index, index + 300).map(s => s.id)), 'liens'))
}
const linksBySegment = new Map()
for (const link of links) {
  if (!linksBySegment.has(link.segment_id)) linksBySegment.set(link.segment_id, [])
  linksBySegment.get(link.segment_id).push(link)
}
const canonicalTargets = [...new Set(links.map(l => l.canon_id).filter(Boolean))]
const verseTargets = [...new Set(links.map(l => l.verset_v2_id).filter(Boolean))]
const canonicalRows = canonicalTargets.length
  ? await must(db.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', canonicalTargets), 'cibles canoniques')
  : []
const verseRows = verseTargets.length
  ? await must(db.from('versets_v2').select('id').in('id', verseTargets), 'cibles surnuméraires')
  : []
const canonicalFound = new Set(canonicalRows.map(v => v.id_verset))
const verseFound = new Set(verseRows.map(v => v.id))
const duplicateKeys = [...new Set(links.map(key))].filter(k => links.filter(l => key(l) === k).length > 1)
const noteRows = body.flatMap(segment => Object.entries(parseNotes(segment.notes)).map(([number, note]) => ({ segment, number, note })))
const biblicalNote = note => /\b(?:Gen|Luc|Matth|Cor|Eph|Tim|Psal|Malach|Joan|Pet|Rom|Philip)\b/i.test(note)
const biblicalNotesWithoutLink = noteRows.filter(row => biblicalNote(row.note) && !(linksBySegment.get(row.segment.id)?.length))
  .map(row => ({ segment_numero: row.segment.segment_numero, note: row.note }))
const nonBiblicalNotesWithLink = noteRows.filter(row => !biblicalNote(row.note) && linksBySegment.get(row.segment.id)?.length)
  .map(row => ({ segment_numero: row.segment.segment_numero, note: row.note, links: linksBySegment.get(row.segment.id).map(key) }))
const quoteSegments = body.filter(s => /[«»]/.test(s.segment_texte))
const quoteSegmentsWithoutLink = quoteSegments.filter(s => !linksBySegment.get(s.id))
  .map(s => ({ segment_numero: s.segment_numero, text: s.segment_texte, notes: parseNotes(s.notes) }))
const announcementRe = /il est écrit|écriture|evangile|évangile|apostre|apôtre|prophete|prophète|david|salomon|dit le seigneur|dit jesus|dit jésus/i
const announcementWithoutLink = body.filter(s => announcementRe.test(s.segment_texte) && !linksBySegment.get(s.id))
  .map(s => ({ segment_numero: s.segment_numero, text: s.segment_texte }))
const textHash = createHash('sha256').update(body.map(s => `${s.segment_numero}\t${s.segment_texte}`).join('\n')).digest('hex').toUpperCase()
const previousSnapshot = JSON.parse(readFileSync(`${OUT}/pre-links-snapshot.json`, 'utf8'))
const report = {
  work_id: WORK_ID,
  audited_at: new Date().toISOString(),
  counts: {
    all_segments: allSegments.length,
    body_segments: body.length,
    links: links.length,
    linked_segments: linksBySegment.size,
    notes: noteRows.length,
    biblical_notes: noteRows.filter(row => biblicalNote(row.note)).length,
    quote_segments: quoteSegments.length,
  },
  types: links.reduce((acc, l) => ({ ...acc, [l.type]: (acc[l.type] ?? 0) + 1 }), {}),
  reliability: links.reduce((acc, l) => ({ ...acc, [l.fiabilite]: (acc[l.fiabilite] ?? 0) + 1 }), {}),
  invalid: {
    foreign_segments: links.filter(l => !bodyIds.has(l.segment_id)).map(l => l.id),
    invalid_types: links.filter(l => ![1, 2, 3, 4].includes(l.type)).map(l => l.id),
    invalid_reliability: links.filter(l => !['à constituer', 'douteux', 'probable', 'vérifié'].includes(l.fiabilite)).map(l => l.id),
    missing_motifs: links.filter(l => !String(l.motif ?? '').trim()).map(l => l.id),
    duplicate_keys: duplicateKeys,
    dead_canonical_targets: canonicalTargets.filter(id => !canonicalFound.has(id)),
    dead_extra_targets: verseTargets.filter(id => !verseFound.has(id)),
    multiple_target_kinds: links.filter(l => [l.canon_id, l.verset_v2_id, l.livre && l.chapitre].filter(Boolean).length !== 1).map(l => l.id),
    verified_requiring_arbitration: links.filter(l => l.fiabilite === 'vérifié' && l.arbitrage_requis).map(l => l.id),
    doubtful_without_arbitration: links.filter(l => l.fiabilite === 'douteux' && !l.arbitrage_requis).map(l => l.id),
    type1_without_material_citation: links.filter(l => l.type === 1 && !/[«»]/.test(body.find(s => s.id === l.segment_id)?.segment_texte ?? '')).map(l => l.id),
    biblical_notes_without_link: biblicalNotesWithoutLink,
    non_biblical_notes_with_link: nonBiblicalNotesWithLink,
    unreviewed_body_segments: body.filter(s => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture').map(s => s.segment_numero),
  },
  review_queue: {
    doubtful_links: links.filter(l => l.fiabilite === 'douteux').map(l => ({ id: l.id, segment_id: l.segment_id, canon_id: l.canon_id, type: l.type, motif: l.motif })),
    quote_segments_without_link: quoteSegmentsWithoutLink,
    announcement_segments_without_link: announcementWithoutLink,
  },
  integrity: {
    text_hash_before: previousSnapshot.text_hash,
    text_hash_now: textHash,
    text_unchanged: previousSnapshot.text_hash === textHash,
  },
}
writeFileSync(`${OUT}/final-independent-audit.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
const hardFailures = Object.entries(report.invalid).filter(([name, value]) => !['biblical_notes_without_link', 'non_biblical_notes_with_link'].includes(name) && value.length)
if (hardFailures.length || biblicalNotesWithoutLink.length || nonBiblicalNotesWithLink.length || !report.integrity.text_unchanged || body.length !== 547 || links.length !== 40) process.exitCode = 1
