import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { strFromU8, unzipSync } from 'fflate'

const TRAD = 'TR0002'
const SEED = 'SEGOND-TR0002-2026-07-29-DEEP-01'
const SAMPLE_PER_BOOK = 10
const OUT_JSON = 'audit/segond_deep_random_audit.json'
const OUT_MD = 'audit/segond_deep_random_audit.md'
const SOURCE_URL = 'https://ebible.org/Scriptures/fraLSG_usfm.zip'
const ECCLESIASTES_WITNESS_URL = 'https://fr.wikisource.org/wiki/Bible_Segond_1910/Eccl%C3%A9siaste'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function fetchAll(table, columns, apply = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(db.from(table).select(columns)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

function key(book, chapter, verse) {
  return `${book}.${Number(chapter)}.${Number(verse)}`
}

function keyOf(row) {
  return key(row.livre, row.ch_orig, row.v_orig)
}

function parseKey(value) {
  const [book, chapter, verse] = value.split('.')
  return { book, chapter: Number(chapter), verse: Number(verse) }
}

function sourceKeySort(a, b) {
  const left = parseKey(a)
  const right = parseKey(b)
  return left.book.localeCompare(right.book) || left.chapter - right.chapter || left.verse - right.verse
}

function sourceSort(a, b) {
  return a.ch_orig - b.ch_orig || a.v_orig - b.v_orig || String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? '')) || (a.ordre_slot ?? 0) - (b.ordre_slot ?? 0) || String(a.id).localeCompare(String(b.id))
}

function normalizeWords(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replaceAll('œ', 'oe')
    .replaceAll('Œ', 'OE')
    .toLocaleLowerCase('fr')
    .match(/[\p{L}\p{N}]+/gu)
    ?.join(' ') ?? ''
}

function exactTypography(value) {
  return String(value ?? '').normalize('NFC').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
}

function compactLetters(value) {
  return normalizeWords(value).replaceAll(' ', '')
}

function cleanUsfm(value) {
  return String(value ?? '')
    .replace(/\\x\s[\s\S]*?\\x\*/g, ' ')
    .replace(/\\f\s[\s\S]*?\\f\*/g, ' ')
    .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*?)?\\\+?w\*/g, '$1')
    .replace(/\\zaln-[se]\s+[^\\]*?\\\*/g, ' ')
    .replace(/\\[a-z][a-z0-9-]*\*?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function loadOfficialSource() {
  const response = await fetch(SOURCE_URL)
  if (!response.ok) throw new Error(`Source USFM inaccessible : HTTP ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const archive = unzipSync(bytes)
  const map = new Map()
  const bookCounts = new Map()
  for (const [filename, fileBytes] of Object.entries(archive)) {
    if (!filename.toLowerCase().endsWith('.usfm')) continue
    const text = strFromU8(fileBytes)
    const book = text.match(/^\\id\s+(\S+)/m)?.[1]
    if (!book) continue
    let chapter = null
    let verse = null
    let parts = []
    const flush = () => {
      if (chapter !== null && verse !== null) {
        const cleaned = cleanUsfm(parts.join(' '))
        if (cleaned) {
          map.set(key(book, chapter, verse), cleaned)
          bookCounts.set(book, (bookCounts.get(book) ?? 0) + 1)
        }
      }
      verse = null
      parts = []
    }
    for (const line of text.split(/\r?\n/)) {
      const chapterMatch = line.match(/^\\c\s+(\d+)/)
      if (chapterMatch) {
        flush()
        chapter = Number(chapterMatch[1])
        continue
      }
      const verseMatch = line.match(/^\\v\s+(\d+)(?:[-a-z]+)?\s*(.*)$/i)
      if (verseMatch) {
        flush()
        verse = Number(verseMatch[1])
        parts = [verseMatch[2]]
        continue
      }
      if (verse !== null && /^\\(?:s\d*|r|ms\d*|mr|sr|d|sp|cl|mt\d*|imt\d*|is\d*|ip|iot|io\d*|iex|ie)\b/.test(line)) continue
      if (verse !== null) parts.push(line)
    }
    flush()
  }
  return { map, bookCounts, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
}

function seededRandom(seed) {
  let hash = 2166136261
  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  let state = hash >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function deterministicSample(values, count, seed) {
  const random = seededRandom(seed)
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1))
    ;[copy[index], copy[selected]] = [copy[selected], copy[index]]
  }
  return copy.slice(0, Math.min(count, copy.length))
}

function compact(row) {
  if (!row) return null
  return {
    id: row.id,
    source_ref: `${row.livre} ${row.ch_orig},${row.v_orig}${row.v_orig_suffixe ?? ''}`,
    canon_id: row.canon_id,
    canon_id_fin: row.canon_id_fin,
    ordre_slot: row.ordre_slot,
    alignement_verifie: row.alignement_verifie,
    texte: row.texte,
  }
}

function groupDatabase(rows) {
  const groups = new Map()
  for (const row of rows) {
    const sourceKey = keyOf(row)
    if (!groups.has(sourceKey)) groups.set(sourceKey, [])
    groups.get(sourceKey).push(row)
  }
  for (const group of groups.values()) group.sort(sourceSort)
  return groups
}

function compareGroup(sourceKey, rows, official, canonById) {
  const sourceText = official.get(sourceKey) ?? null
  const databaseText = rows.map((row) => row.texte).join(' ')
  const normalizedEqual = sourceText === null ? null : normalizeWords(sourceText) === normalizeWords(databaseText)
  const typographicEqual = sourceText === null ? null : exactTypography(sourceText) === exactTypography(databaseText)
  const structuralErrors = []
  if (rows.some((row) => typeof row.texte !== 'string' || !row.texte.trim())) structuralErrors.push('texte_vide')
  if (rows.some((row) => row.canon_id_fin !== null)) structuralErrors.push('canon_id_fin_non_null')
  if (rows.some((row) => !row.alignement_verifie)) structuralErrors.push('alignement_non_verifie')
  if (rows.some((row) => row.canon_id !== null && !canonById.has(row.canon_id))) structuralErrors.push('canon_id_inexistant')
  if (new Set(rows.map((row) => row.id)).size !== rows.length) structuralErrors.push('uuid_duplique')
  return { sourceText, databaseText, normalizedEqual, typographicEqual, structuralErrors }
}

function markdown(report) {
  const lines = [
    '# Contrôle poussé et sondage aléatoire de la Segond 1910',
    '',
    `- Traduction : \`${TRAD}\``,
    `- Exécution : ${report.generated_at}`,
    '- Mode : lecture seule',
    `- Graine du sondage : \`${report.random.seed}\``,
    `- Échantillon : ${report.random.sample_size} passages, ${report.random.per_book} par livre`,
    '',
    '## Résultats',
    '',
    `- Registre normatif : ${report.normative.controlled}/${report.normative.expected}, ${report.normative.PASS} PASS, ${report.normative.FAIL} FAIL, ${report.normative.INDETERMINATE} INDETERMINATE`,
    `- Comparaison exhaustive : ${report.exhaustive.database_source_groups} références natives en base contre ${report.exhaustive.official_source_groups} versets du témoin`,
    `- Discordances limitées à des espaces manquantes : ${report.exhaustive.spacing_only_text_mismatches.length}`,
    `- Discordances substantielles de texte ou de segmentation : ${report.exhaustive.substantive_text_mismatches.length}`,
    `- Références de base absentes du témoin : ${report.exhaustive.database_refs_absent_from_source.length}`,
    `- Références du témoin absentes de la base : ${report.exhaustive.source_refs_absent_from_database.length}`,
    `- Sondage aléatoire : ${report.random.PASS} PASS, ${report.random.FAIL} FAIL, ${report.random.INDETERMINATE} INDETERMINATE`,
    '',
    '## Conclusion éditoriale après qualification',
    '',
    report.adjudication.confirmed_database_issues.spacing_word_fusions.count
      ? `- Anomalies certaines d’espacement en base : ${report.adjudication.confirmed_database_issues.spacing_word_fusions.count} références, avec des mots soudés.`
      : '- Anomalies certaines d’espacement en base : aucune.',
    report.adjudication.confirmed_database_issues.native_reference_errors.length
      ? `- Erreur certaine de référence native : ${report.adjudication.confirmed_database_issues.native_reference_errors.map((item) => item.scope).join(', ')}.`
      : '- Erreur certaine de référence native : aucune.',
    report.adjudication.confirmed_database_issues.missing_fragments.length
      ? `- Fragments Segond absents de la base : ${report.adjudication.confirmed_database_issues.missing_fragments.map((item) => item.source_ref).join(', ')}.`
      : '- Fragments Segond absents de la base : aucun.',
    `- Faux positifs imputables au témoin USFM : ${report.adjudication.source_witness_anomalies.map((item) => item.scope).join(', ')}. La numérotation de la base est confirmée par l’édition Segond 1910 indépendante.`,
    `- Redistribution éditoriale sans perte textuelle : ${report.adjudication.editorial_redistributions.map((item) => item.scope).join(', ')}. Elle reste à réexaminer au regard de la règle de conservation des coordonnées natives.`,
    '',
    '## Écarts exhaustifs',
    '',
  ]
  lines.push(`Espaces manquantes par livre : ${Object.entries(report.exhaustive.spacing_only_by_book).map(([book, count]) => `${book} ${count}`).join(', ') || 'aucune'}.`, '')
  if (!report.exhaustive.substantive_text_mismatches.length) lines.push('Aucune discordance textuelle substantielle.', '')
  for (const item of report.exhaustive.substantive_text_mismatches) {
    lines.push(`### ${item.source_ref}`, '', `- Base : ${item.database_text}`, `- Source : ${item.source_text}`, '')
  }
  if (report.exhaustive.database_refs_absent_from_source.length) lines.push(`Références présentes seulement en base : ${report.exhaustive.database_refs_absent_from_source.map((item) => item.source_ref).join(', ')}`, '')
  if (report.exhaustive.source_refs_absent_from_database.length) lines.push(`Références présentes seulement dans le témoin : ${report.exhaustive.source_refs_absent_from_database.map((item) => item.source_ref).join(', ')}`, '')
  lines.push('## Échecs du sondage aléatoire', '')
  const failures = report.random.items.filter((item) => item.status !== 'PASS')
  if (!failures.length) lines.push('Aucun.', '')
  for (const item of failures) lines.push(`- **${item.source_ref}** : ${item.failures.join(', ')}`, '')
  lines.push('## Échantillon complet', '')
  lines.push('| Référence | Statut | Cible(s) | Texte | Structure | Voisinage |', '|---|---|---|---|---|---|')
  for (const item of report.random.items) {
    lines.push(`| ${item.source_ref} | ${item.status} | ${item.canon_ids.join(', ') || 'source-only'} | ${item.text_equal === true ? 'conforme' : item.text_equal === false ? 'discordant' : 'indéterminé'} | ${item.structural_errors.length ? item.structural_errors.join(', ') : 'conforme'} | ${item.neighbor_monotonic ? 'conforme' : 'à revoir'} |`)
  }
  return `${lines.join('\n')}\n`
}

async function main() {
  const normative = JSON.parse(readFileSync('audit/segond_audit.json', 'utf8'))
  const [verses, canon, source] = await Promise.all([
    fetchAll('versets_v2', '*', (query) => query.eq('trad_id', TRAD).order('id')),
    fetchAll('versets_canon', 'id,livre,ch_canon,v_canon,ordre', (query) => query.order('ordre')),
    loadOfficialSource(),
  ])
  const books = [...new Set(verses.map((row) => row.livre))].sort()
  const canonById = new Map(canon.map((row) => [row.id, row]))
  const dbGroups = groupDatabase(verses)
  const officialKeys = [...source.map.keys()].filter((sourceKey) => books.includes(parseKey(sourceKey).book)).sort(sourceKeySort)
  const dbKeys = [...dbGroups.keys()].sort(sourceKeySort)

  const mismatches = []
  const absentFromSource = []
  const structuralGroupFailures = []
  for (const sourceKey of dbKeys) {
    const rows = dbGroups.get(sourceKey)
    const compared = compareGroup(sourceKey, rows, source.map, canonById)
    if (compared.sourceText === null) absentFromSource.push({ source_ref: sourceKey, uuids: rows.map((row) => row.id), canon_ids: rows.map((row) => row.canon_id), database_text: compared.databaseText })
    else if (!compared.normalizedEqual) mismatches.push({
      source_ref: sourceKey,
      uuids: rows.map((row) => row.id),
      canon_ids: rows.map((row) => row.canon_id),
      database_text: compared.databaseText,
      source_text: compared.sourceText,
    })
    if (compared.structuralErrors.length) structuralGroupFailures.push({ source_ref: sourceKey, failures: compared.structuralErrors, rows: rows.map(compact) })
  }
  const absentFromDatabase = officialKeys.filter((sourceKey) => !dbGroups.has(sourceKey)).map((sourceKey) => ({ source_ref: sourceKey, source_text: source.map.get(sourceKey) }))
  const spacingOnlyMismatches = mismatches.filter((item) => compactLetters(item.database_text) === compactLetters(item.source_text))
  const substantiveMismatches = mismatches.filter((item) => compactLetters(item.database_text) !== compactLetters(item.source_text))
  const spacingOnlyByBook = {}
  for (const item of spacingOnlyMismatches) {
    const book = parseKey(item.source_ref).book
    spacingOnlyByBook[book] = (spacingOnlyByBook[book] ?? 0) + 1
  }

  const samuel43 = dbGroups.get('1SA.20.43')
  const samuelNativeReferenceCorrect = samuel43?.length === 1 && normalizeWords(samuel43[0].texte) === normalizeWords(source.map.get('1SA.20.43'))
  const adjudication = {
    confirmed_database_issues: {
      spacing_word_fusions: {
        count: spacingOnlyMismatches.length,
        refs: spacingOnlyMismatches.map((item) => item.source_ref),
        by_book: spacingOnlyByBook,
      },
      native_reference_errors: samuelNativeReferenceCorrect ? [] : [{
        scope: '1SA.20.42b / 1SA.20.43',
        finding: 'La phrase « David se leva et s’en alla, et Jonathan rentra dans la ville » est présente en base, mais rattachée à 1SA 20,42b au lieu de la référence native 1SA 20,43 du témoin Segond.',
      }],
      missing_fragments: absentFromDatabase
        .filter((item) => ['MRK.9.51', 'MRK.10.53'].includes(item.source_ref))
        .map((item) => ({ ...item, finding: 'Fragment présent dans le témoin Segond, absent de toutes les lignes de la base.' })),
    },
    source_witness_anomalies: [{
      scope: 'ECC.11.9–12.16 dans le témoin USFM',
      finding: 'Le témoin eBible décale Ecclésiaste 11,9–10 et 12,1–14. La numérotation actuellement stockée en base correspond à l’édition Segond 1910 indépendante et ne doit pas être corrigée d’après ce seul USFM.',
      independent_witness: ECCLESIASTES_WITNESS_URL,
    }],
    editorial_redistributions: [{
      scope: 'LUK.9.42–44',
      finding: 'Les mots du témoin sont conservés, mais certaines phrases ont été déplacées entre trois lignes pour l’alignement canonique. Il s’agit d’un choix éditorial antérieur, non d’une perte de texte.',
    }],
  }

  const byBookKeys = new Map()
  for (const sourceKey of dbKeys) {
    const book = parseKey(sourceKey).book
    if (!byBookKeys.has(book)) byBookKeys.set(book, [])
    byBookKeys.get(book).push(sourceKey)
  }
  const sampleKeys = books.flatMap((book) => deterministicSample(byBookKeys.get(book).sort(sourceKeySort), SAMPLE_PER_BOOK, `${SEED}:${book}`))
  const randomItems = []
  for (const sourceKey of sampleKeys) {
    const rows = dbGroups.get(sourceKey)
    const compared = compareGroup(sourceKey, rows, source.map, canonById)
    const bookKeys = byBookKeys.get(parseKey(sourceKey).book)
    const position = bookKeys.indexOf(sourceKey)
    const previousRows = position > 0 ? dbGroups.get(bookKeys[position - 1]) : []
    const nextRows = position + 1 < bookKeys.length ? dbGroups.get(bookKeys[position + 1]) : []
    const currentOrders = rows.map((row) => row.canon_id ? canonById.get(row.canon_id)?.ordre : null).filter((value) => value !== null && value !== undefined)
    const previousOrders = previousRows.map((row) => row.canon_id ? canonById.get(row.canon_id)?.ordre : null).filter((value) => value !== null && value !== undefined)
    const nextOrders = nextRows.map((row) => row.canon_id ? canonById.get(row.canon_id)?.ordre : null).filter((value) => value !== null && value !== undefined)
    const neighborMonotonic = (!previousOrders.length || !currentOrders.length || Math.max(...previousOrders) <= Math.min(...currentOrders)) && (!nextOrders.length || !currentOrders.length || Math.max(...currentOrders) <= Math.min(...nextOrders))
    const failures = [...compared.structuralErrors]
    if (compared.normalizedEqual === false) failures.push('texte_different_source')
    if (compared.normalizedEqual === null) failures.push('source_absente')
    if (!neighborMonotonic) failures.push('voisinage_canonique_non_monotone')
    randomItems.push({
      source_ref: sourceKey,
      status: failures.includes('source_absente') ? 'INDETERMINATE' : failures.length ? 'FAIL' : 'PASS',
      uuids: rows.map((row) => row.id),
      canon_ids: rows.map((row) => row.canon_id),
      text_equal: compared.normalizedEqual,
      typographic_equal: compared.typographicEqual,
      structural_errors: compared.structuralErrors,
      neighbor_monotonic: neighborMonotonic,
      failures,
      database_text: compared.databaseText,
      source_text: compared.sourceText,
      neighborhood: { previous: previousRows.map(compact), current: rows.map(compact), next: nextRows.map(compact) },
      sql: `select id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,ordre_slot,texte,alignement_verifie from versets_v2 where trad_id='${TRAD}' and livre='${parseKey(sourceKey).book}' and ch_orig=${parseKey(sourceKey).chapter} and v_orig=${parseKey(sourceKey).verse} order by v_orig_suffixe nulls first,ordre_slot nulls first;`,
    })
  }
  const randomCounts = Object.fromEntries(['PASS', 'FAIL', 'INDETERMINATE'].map((status) => [status, randomItems.filter((item) => item.status === status).length]))
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'strictement en lecture seule',
    translation: TRAD,
    source: { url: SOURCE_URL, sha256: source.sha256, bytes: source.bytes, verse_count: source.map.size },
    normative: normative.summary,
    global_structure: {
      rows: verses.length,
      books: books.length,
      unique_uuids: new Set(verses.map((row) => row.id)).size,
      empty_texts: verses.filter((row) => !String(row.texte ?? '').trim()).length,
      unverified: verses.filter((row) => !row.alignement_verifie).length,
      canon_id_fin_non_null: verses.filter((row) => row.canon_id_fin !== null).length,
      missing_canon_targets: verses.filter((row) => row.canon_id !== null && !canonById.has(row.canon_id)).map(compact),
      structural_group_failures: structuralGroupFailures,
    },
    exhaustive: {
      database_source_groups: dbGroups.size,
      official_source_groups: officialKeys.length,
      compared_groups: dbKeys.filter((sourceKey) => source.map.has(sourceKey)).length,
      normalized_text_mismatches: mismatches,
      spacing_only_text_mismatches: spacingOnlyMismatches,
      spacing_only_by_book: spacingOnlyByBook,
      substantive_text_mismatches: substantiveMismatches,
      database_refs_absent_from_source: absentFromSource,
      source_refs_absent_from_database: absentFromDatabase,
    },
    adjudication,
    random: { seed: SEED, per_book: SAMPLE_PER_BOOK, books: books.length, sample_size: randomItems.length, ...randomCounts, items: randomItems },
  }
  if (randomItems.length !== books.length * SAMPLE_PER_BOOK) throw new Error(`Échantillon incomplet : ${randomItems.length}/${books.length * SAMPLE_PER_BOOK}`)
  mkdirSync('audit', { recursive: true })
  const json = `${JSON.stringify(report, null, 2)}\n`
  writeFileSync(OUT_JSON, json)
  writeFileSync(OUT_MD, markdown(report))
  console.log(JSON.stringify({
    outputs: [OUT_JSON, OUT_MD],
    report_sha256: createHash('sha256').update(json).digest('hex'),
    normative: report.normative,
    global_structure: { ...report.global_structure, missing_canon_targets: report.global_structure.missing_canon_targets.length, structural_group_failures: report.global_structure.structural_group_failures.length },
    exhaustive: {
      database_source_groups: report.exhaustive.database_source_groups,
      official_source_groups: report.exhaustive.official_source_groups,
      compared_groups: report.exhaustive.compared_groups,
      normalized_text_mismatches: report.exhaustive.normalized_text_mismatches.length,
      spacing_only_text_mismatches: report.exhaustive.spacing_only_text_mismatches.length,
      spacing_only_by_book: report.exhaustive.spacing_only_by_book,
      substantive_text_mismatches: report.exhaustive.substantive_text_mismatches.map((item) => item.source_ref),
      database_refs_absent_from_source: report.exhaustive.database_refs_absent_from_source.map((item) => item.source_ref),
      source_refs_absent_from_database: report.exhaustive.source_refs_absent_from_database.map((item) => item.source_ref),
    },
    adjudication: {
      spacing_word_fusions: report.adjudication.confirmed_database_issues.spacing_word_fusions.count,
      native_reference_errors: report.adjudication.confirmed_database_issues.native_reference_errors.map((item) => item.scope),
      missing_fragments: report.adjudication.confirmed_database_issues.missing_fragments.map((item) => item.source_ref),
      source_witness_anomalies: report.adjudication.source_witness_anomalies.map((item) => item.scope),
      editorial_redistributions: report.adjudication.editorial_redistributions.map((item) => item.scope),
    },
    random: { seed: SEED, sample_size: randomItems.length, ...randomCounts, failures: randomItems.filter((item) => item.status !== 'PASS').map((item) => item.source_ref) },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
