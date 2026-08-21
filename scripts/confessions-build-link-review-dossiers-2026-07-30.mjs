import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OUT = 'tmp/confessions-links-2026-07-30'
const BOOK_CODES = {
  Gen: 'GEN', Exod: 'EXO', Lev: 'LEV', Deut: 'DEU', Josh: 'JOS', Job: 'JOB',
  Ps: 'PSA', Prov: 'PRO', Wis: 'WIS', Sir: 'SIR', Isa: 'ISA', Jer: 'JER', Hos: 'HOS',
  Matt: 'MAT', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM', iCor: '1CO',
  iiCor: '2CO', Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL', iThess: '1TH',
  iTim: '1TI', iiTim: '2TI', Titus: 'TIT', Heb: 'HEB', Jas: 'JAS', iPet: '1PE',
  iJohn: '1JN', Rev: 'REV',
}
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
const aligned = JSON.parse(readFileSync(`${OUT}/aligned-scripture-candidates.json`, 'utf8')).occurrences
const paragraphs = JSON.parse(readFileSync(`${OUT}/paragraphs.json`, 'utf8'))
const paragraphByKey = new Map(paragraphs.map(row => [[row.book, row.chapter, row.paragraph].join('|'), row]))

const rangeIds = occurrence => {
  const prefix = BOOK_CODES[occurrence.source_book_code]
  if (!prefix) throw new Error(`Code biblique CCEL inconnu: ${occurrence.source_book_code}`)
  if (occurrence.chapter_start !== occurrence.chapter_end) {
    return [`${prefix}.${occurrence.chapter_start}.${occurrence.verse_start}`]
  }
  const ids = []
  for (let verse = occurrence.verse_start; verse <= occurrence.verse_end; verse++) {
    ids.push(`${prefix}.${occurrence.chapter_start}.${verse}`)
  }
  return ids
}
const requested = new Set()
for (const occurrence of aligned) {
  occurrence.proposed_ids = rangeIds(occurrence)
  for (const id of occurrence.proposed_ids) {
    requested.add(id)
    if (id.startsWith('PSA.')) {
      const [, chapter, verse] = id.split('.')
      if (Number(chapter) > 1) requested.add(`PSA.${Number(chapter) - 1}.${verse}`)
      requested.add(`PSA.${Number(chapter) + 1}.${verse}`)
    }
  }
}
const verses = []
const ids = [...requested]
for (let offset = 0; offset < ids.length; offset += 250) {
  verses.push(...await must(db.from('versets_lecture')
    .select('id_verset,"TR0001","TR0003","TR0004"')
    .in('id_verset', ids.slice(offset, offset + 250)), `versets:${offset}`))
}
const verseById = new Map(verses.map(row => [row.id_verset, row]))
const groups = new Map()
for (const occurrence of aligned) {
  const key = [occurrence.book, occurrence.chapter, occurrence.standard_paragraph].join('|')
  if (!groups.has(key)) groups.set(key, { ...occurrence, occurrences: [] })
  groups.get(key).occurrences.push(occurrence)
}
const candidatesByLocal = new Map()
for (const group of groups.values()) {
  for (const candidate of group.local_candidates) {
    const key = [candidate.book, candidate.chapter, candidate.paragraph].join('|')
    if (!candidatesByLocal.has(key)) candidatesByLocal.set(key, [])
    candidatesByLocal.get(key).push(group)
  }
}
const summaries = []
mkdirSync(`${OUT}/review-dossiers`, { recursive: true })
mkdirSync(`${OUT}/full-reading`, { recursive: true })
const localBooks = [...new Set(paragraphs.map(row => row.book))]
for (let book = 1; book <= 13; book++) {
  const selected = [...groups.values()].filter(group => group.book === book)
    .sort((a, b) => a.chapter - b.chapter || a.standard_paragraph - b.standard_paragraph)
  const lines = [`# Confessions — livre ${book} — dossier de lecture des liens`, '',
    `Signalements secondaires : ${selected.reduce((sum, group) => sum + group.occurrences.length, 0)} ; unités augustiniennes : ${selected.length}.`,
    '', 'Chaque signalement est un candidat de rappel. Le français d’Andilly, le latin CSEL et les témoins locaux décident seuls.', '']
  for (const group of selected) {
    lines.push(`## ${book}.${group.chapter}.${group.standard_paragraph}`, '')
    lines.push(`CCEL : ${group.context_english}`, '')
    lines.push('Références candidates :')
    for (const occurrence of group.occurrences) {
      lines.push(`- ${occurrence.source_book_code} ${occurrence.display} → ${occurrence.proposed_ids.join(', ')}`)
      for (const id of occurrence.proposed_ids) {
        const alternatives = [id]
        if (id.startsWith('PSA.')) {
          const [, chapter, verse] = id.split('.')
          if (Number(chapter) > 1) alternatives.push(`PSA.${Number(chapter) - 1}.${verse}`)
          alternatives.push(`PSA.${Number(chapter) + 1}.${verse}`)
        }
        for (const alternative of alternatives) {
          const witness = verseById.get(alternative)
          if (!witness) continue
          lines.push(`  - ${alternative} — TR0001: ${witness.TR0001 ?? '∅'} | TR0003: ${witness.TR0003 ?? '∅'} | TR0004: ${witness.TR0004 ?? '∅'}`)
        }
      }
    }
    lines.push('', `Alignement latin : ${(group.latin_alignment_coverage * 100).toFixed(2)} %`, '')
    for (const candidate of group.local_candidates) {
      const paragraph = paragraphByKey.get([candidate.book, candidate.chapter, candidate.paragraph].join('|'))
      lines.push(`### ${candidate.book} / ${candidate.chapter} / paragraphe ${candidate.paragraph} — segments ${candidate.first_segment}-${candidate.last_segment}`, '')
      for (const segment of paragraph?.segments ?? []) lines.push(`- [${segment.number}; rang ${segment.rank}] ${segment.text}`)
      lines.push('', `Latin : ${candidate.latin}`, '')
    }
  }
  const path = `${OUT}/review-dossiers/book-${String(book).padStart(2, '0')}.md`
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8')
  const fullLines = [`# Confessions — livre ${book} — lecture intégrale`, '']
  for (const paragraph of paragraphs.filter(row => row.book === localBooks[book - 1])) {
    const key = [paragraph.book, paragraph.chapter, paragraph.paragraph].join('|')
    const localGroups = candidatesByLocal.get(key) ?? []
    fullLines.push(`## ${paragraph.book} / ${paragraph.chapter} / paragraphe ${paragraph.paragraph} — segments ${paragraph.first_segment}-${paragraph.last_segment}`, '')
    if (localGroups.length) {
      fullLines.push('Rappels secondaires :')
      for (const group of localGroups) {
        const refs = group.occurrences.flatMap(item => item.proposed_ids).join(', ')
        fullLines.push(`- ${group.book}.${group.chapter}.${group.standard_paragraph} → ${refs}`)
      }
      fullLines.push('')
    }
    for (const segment of paragraph.segments) fullLines.push(`- [${segment.number}; rang ${segment.rank}] ${segment.text}`)
    fullLines.push('', `Latin : ${paragraph.latin}`, '')
  }
  writeFileSync(`${OUT}/full-reading/book-${String(book).padStart(2, '0')}.md`, `${fullLines.join('\n')}\n`, 'utf8')
  summaries.push({
    book,
    units: selected.length,
    occurrences: selected.reduce((sum, group) => sum + group.occurrences.length, 0),
    dossier: path,
  })
}
const report = {
  created_at: new Date().toISOString(),
  requested_targets: ids.length,
  found_targets: verses.length,
  missing_primary_targets: [...new Set(aligned.flatMap(row => row.proposed_ids))].filter(id => !verseById.has(id)),
  books: summaries,
}
writeFileSync(`${OUT}/review-dossiers/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
