import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { strFromU8, unzipSync } from 'fflate'
import yaml from 'js-yaml'

const TRAD = 'TR0002'
const MANIFEST = 'C:/Users/SBASTI~1/Downloads/CODEX_SEGOND(2).md'
const OUT_DIR = 'audit'
const JSON_PATH = `${OUT_DIR}/segond_audit.json`
const MD_PATH = `${OUT_DIR}/segond_audit.md`
const AMENDMENT_PATH = 'scripts/segond-registry-amendment-2026-07-29.json'

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

function loadRegistry() {
  const markdown = readFileSync(MANIFEST, 'utf8')
  const match = markdown.match(
    /<!-- BEGIN SEGOND MODIFICATION REGISTRY -->[\s\S]*?```yaml\s*([\s\S]*?)```[\s\S]*?<!-- END SEGOND MODIFICATION REGISTRY -->/,
  )
  if (!match) throw new Error('Registre YAML introuvable dans CODEX_SEGOND(2).md')
  const registry = yaml.load(match[1])
  if (registry.translation !== TRAD) throw new Error(`Traduction inattendue : ${registry.translation}`)
  if (registry.items.length !== registry.entry_count) {
    throw new Error(`Registre incomplet : ${registry.items.length}/${registry.entry_count}`)
  }
  const ids = registry.items.map((item) => item.id)
  if (new Set(ids).size !== ids.length) throw new Error('Identifiants en double dans le registre')
  const amendmentText = readFileSync(AMENDMENT_PATH, 'utf8')
  const amendment = JSON.parse(amendmentText)
  for (const [id, patch] of Object.entries(amendment.changes)) {
    const item = registry.items.find((candidate) => candidate.id === id)
    if (!item) throw new Error(`Amendement sans entrée de registre : ${id}`)
    Object.assign(item, patch)
  }
  return { registry, markdown, amendment, amendmentText }
}

async function fetchAll(table, columns = '*', apply = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const query = apply(db.from(table).select(columns)).range(from, from + 999)
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

function sourceKey(book, chapter, verse) {
  return `${book}.${Number(chapter)}.${Number(verse)}`
}

function sourceKeyOf(row) {
  return sourceKey(row.livre, row.ch_orig, row.v_orig)
}

function sourceSort(a, b) {
  return (
    a.ch_orig - b.ch_orig ||
    a.v_orig - b.v_orig ||
    String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? ''), 'fr') ||
    (a.ordre_slot ?? 0) - (b.ordre_slot ?? 0) ||
    String(a.id).localeCompare(String(b.id))
  )
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

function sameText(a, b) {
  return normalizeWords(a) === normalizeWords(b)
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function compactRow(row) {
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

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return `'${String(value).replaceAll("'", "''")}'`
}

function inRange(row, start, end) {
  const [sc, sv] = start.split(':').map(Number)
  const [ec, ev] = end.split(':').map(Number)
  const position = row.ch_orig * 10000 + row.v_orig
  return position >= sc * 10000 + sv && position <= ec * 10000 + ev
}

function countByStatus(items) {
  return Object.fromEntries(['PASS', 'FAIL', 'INDETERMINATE'].map((status) => [status, items.filter((x) => x.status === status).length]))
}

async function loadSource() {
  const commitResponse = await fetch('https://api.github.com/repos/BibleNLP/ebible/commits/main', {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Corpus-Scriptura-Segond-audit' },
  })
  if (!commitResponse.ok) throw new Error(`GitHub commit: HTTP ${commitResponse.status}`)
  const commit = await commitResponse.json()
  const sha = commit.sha
  const base = `https://raw.githubusercontent.com/BibleNLP/ebible/${sha}`
  const [refResponse, textResponse, usfmResponse] = await Promise.all([
    fetch(`${base}/metadata/vref.txt`),
    fetch(`${base}/corpus/fra-fraLSG.txt`),
    fetch('https://ebible.org/Scriptures/fraLSG_usfm.zip'),
  ])
  if (!refResponse.ok || !textResponse.ok || !usfmResponse.ok) {
    throw new Error(`Source eBible inaccessible : vref=${refResponse.status}, texte=${textResponse.status}, usfm=${usfmResponse.status}`)
  }
  const [refText, corpusText, usfmBuffer] = await Promise.all([refResponse.text(), textResponse.text(), usfmResponse.arrayBuffer()])
  const refs = refText.split(/\r?\n/)
  const texts = corpusText.split(/\r?\n/)
  const alignedMap = new Map()
  for (let index = 0; index < refs.length; index += 1) {
    const match = refs[index].match(/^(\S+) (\d+):(\d+)$/)
    if (!match) continue
    const text = texts[index] ?? ''
    if (nonempty(text) && text !== '<range>') alignedMap.set(sourceKey(match[1], match[2], match[3]), text.trim())
  }

  const cleanUsfm = (value) => String(value ?? '')
    .replace(/\\x\s[\s\S]*?\\x\*/g, ' ')
    .replace(/\\f\s[\s\S]*?\\f\*/g, ' ')
    .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*?)?\\\+?w\*/g, '$1')
    .replace(/\\zaln-[se]\s+[^\\]*?\\\*/g, ' ')
    .replace(/\\[a-z][a-z0-9-]*\*?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const map = new Map()
  const archive = unzipSync(new Uint8Array(usfmBuffer))
  for (const [filename, bytes] of Object.entries(archive)) {
    if (!filename.toLowerCase().endsWith('.usfm')) continue
    const text = strFromU8(bytes)
    const book = text.match(/^\\id\s+(\S+)/m)?.[1]
    if (!book) continue
    let chapter = null
    let verse = null
    let parts = []
    const flush = () => {
      if (chapter !== null && verse !== null) {
        const cleaned = cleanUsfm(parts.join(' '))
        if (nonempty(cleaned)) map.set(sourceKey(book, chapter, verse), cleaned)
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
      if (verse !== null && /^\\(?:s\d*|r|ms\d*|mr|sr|d|sp|cl|mt\d*|imt\d*|is\d*|ip|iot|io\d*|iex|ie)\b/.test(line)) {
        continue
      }
      if (verse !== null) parts.push(line)
    }
    flush()
  }
  return {
    available: true,
    map,
    commit: sha,
    repository: 'https://github.com/BibleNLP/ebible',
    files: [`${base}/metadata/vref.txt`, `${base}/corpus/fra-fraLSG.txt`, 'https://ebible.org/Scriptures/fraLSG_usfm.zip'],
    witnesses: {
      primary: 'eBible.org USFM Louis Segond 1910 (numérotation native et texte complet)',
      secondary: 'BibleNLP/ebible corpus parallèle (alignement vref, incomplet aux 56 restaurations)',
      primary_verse_count: map.size,
      secondary_verse_count: alignedMap.size,
    },
    hashes: {
      vref_sha256: createHash('sha256').update(refText).digest('hex'),
      corpus_sha256: createHash('sha256').update(corpusText).digest('hex'),
      usfm_zip_sha256: createHash('sha256').update(new Uint8Array(usfmBuffer)).digest('hex'),
    },
  }
}

function buildIndexes(state) {
  const byBook = new Map()
  const bySource = new Map()
  for (const row of state.verses) {
    if (!byBook.has(row.livre)) byBook.set(row.livre, [])
    byBook.get(row.livre).push(row)
    const key = sourceKeyOf(row)
    if (!bySource.has(key)) bySource.set(key, [])
    bySource.get(key).push(row)
  }
  for (const rows of byBook.values()) rows.sort(sourceSort)
  for (const rows of bySource.values()) rows.sort(sourceSort)
  const canonById = new Map(state.canon.map((row) => [row.id, row]))
  const canonByBook = new Map()
  for (const row of state.canon) {
    if (!canonByBook.has(row.livre)) canonByBook.set(row.livre, [])
    canonByBook.get(row.livre).push(row)
  }
  for (const rows of canonByBook.values()) rows.sort((a, b) => a.ordre - b.ordre)
  return { byBook, bySource, canonById, canonByBook }
}

function sourceNeighbors(rows, selected) {
  if (!selected.length) return { before: null, after: null }
  const ids = new Set(selected.map((row) => row.id))
  const positions = rows.map((row, index) => (ids.has(row.id) ? index : -1)).filter((index) => index >= 0)
  const first = Math.min(...positions)
  const last = Math.max(...positions)
  return { before: compactRow(rows[first - 1]), after: compactRow(rows[last + 1]) }
}

function referenceCounts(canonId, state) {
  return {
    versets_v2_canon_id: state.verses.filter((row) => row.canon_id === canonId).length,
    versets_v2_canon_id_fin: state.verses.filter((row) => row.canon_id_fin === canonId).length,
    liens_bibliques: state.links.filter((row) => row.canon_id === canonId).length,
    pericope_debut: state.pericopes.filter((row) => row.canon_id_debut === canonId).length,
    pericope_fin: state.pericopes.filter((row) => row.canon_id_fin === canonId).length,
    concordance_glaire: state.concordance.filter((row) => row.canon_id === canonId).length,
  }
}

function makeResult(item, status, sql, observed, evidence, notes = null) {
  return {
    id: item.id,
    livre: item.livre ?? null,
    reference_source: item.source ? `${item.source.chapter},${item.source.verse}` : null,
    type: item.test,
    status,
    sql,
    observed,
    expected: item.expected ?? null,
    evidence,
    notes,
  }
}

function auditItem(item, state, indexes, source) {
  const { byBook, bySource, canonById, canonByBook } = indexes

  if (item.test === 'book_validation') {
    const rows = byBook.get(item.livre) ?? []
    const observed = {
      rows_examined: rows.length,
      unique_uuid_count: new Set(rows.map((row) => row.id)).size,
      unverified_rows: rows.filter((row) => !row.alignement_verifie).length,
      empty_text_rows: rows.filter((row) => !nonempty(row.texte)).length,
      canon_id_fin_rows: rows.filter((row) => row.canon_id_fin !== null).length,
      invalid_source_coordinates: rows.filter((row) => !Number.isInteger(row.ch_orig) || !Number.isInteger(row.v_orig)).length,
    }
    const pass =
      observed.rows_examined > 0 &&
      observed.unique_uuid_count === observed.rows_examined &&
      observed.unverified_rows === item.expected.unverified_rows &&
      observed.empty_text_rows === item.expected.empty_text_rows &&
      observed.canon_id_fin_rows === item.expected.canon_id_fin_rows &&
      observed.invalid_source_coordinates === 0
    const sql = `select count(*) as rows_examined, count(distinct id) as unique_uuid_count, count(*) filter (where not alignement_verifie) as unverified_rows, count(*) filter (where nullif(btrim(texte),'') is null) as empty_text_rows, count(*) filter (where canon_id_fin is not null) as canon_id_fin_rows from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)};`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? `Les ${rows.length} lignes du livre satisfont les invariants demandés.` : 'Au moins un invariant de validation du livre est violé.')
  }

  if (item.test === 'split_source_verse') {
    const key = sourceKey(item.livre, item.source.chapter, item.source.verse)
    const rows = bySource.get(key) ?? []
    const expected = item.expected_fragments
    const structurePass =
      rows.length === expected.length &&
      expected.every((fragment, index) => {
        const row = rows[index]
        return row && row.v_orig_suffixe === fragment.suffix && row.canon_id === fragment.canon_id && row.ordre_slot === fragment.ordre_slot && row.canon_id_fin === null && nonempty(row.texte)
      })
    const sourceText = source.map?.get(key) ?? null
    const nextSourceKey = sourceKey(item.livre, item.source.chapter, item.source.verse + 1)
    const nextSourceText = source.map?.get(nextSourceKey) ?? null
    const recomposedText = rows.map((row) => row.texte).join(' ')
    const sourceEqual = sourceText === null ? null : sameText(recomposedText, sourceText)
    const equalsSourcePlusNext = sourceText && nextSourceText ? sameText(recomposedText, `${sourceText} ${nextSourceText}`) : false
    const observed = {
      row_count: rows.length,
      rows: rows.map(compactRow),
      recomposed_text: recomposedText,
      source_text: sourceText,
      normalized_source_equal: sourceEqual,
      next_source_ref: nextSourceText ? `${item.livre} ${item.source.chapter},${item.source.verse + 1}` : null,
      next_source_text: nextSourceText,
      normalized_equal_to_source_plus_next_verse: equalsSourcePlusNext,
      neighbors: sourceNeighbors(byBook.get(item.livre) ?? [], rows),
    }
    const status = !structurePass || sourceEqual === false ? 'FAIL' : sourceEqual === null ? 'INDETERMINATE' : 'PASS'
    const sql = `select id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,ordre_slot,texte,alignement_verifie from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and ch_orig=${item.source.chapter} and v_orig=${item.source.verse} order by v_orig_suffixe nulls first, ordre_slot nulls first;`
    return makeResult(item, status, sql, observed, status === 'PASS' ? 'Les fragments, leur ordre, leurs cibles et leur recomposition textuelle correspondent au registre et à la source.' : status === 'FAIL' && equalsSourcePlusNext ? `Le fragment final appartient au verset source suivant (${item.livre} ${item.source.chapter},${item.source.verse + 1}), et non au verset annoncé par le registre.` : status === 'FAIL' ? 'La structure ou la recomposition textuelle ne correspond pas à l’attendu.' : 'La structure est plausible, mais le texte source n’est pas disponible.', null)
  }

  if (item.test === 'native_reference_pair') {
    const observedRows = item.expected_rows.map((expected) => {
      const key = sourceKey(item.livre, expected.chapter, expected.verse)
      const rows = bySource.get(key) ?? []
      const sourceText = source.map?.get(key) ?? null
      return {
        expected,
        row_count: rows.length,
        row: compactRow(rows[0]),
        structure: rows[0] ? { v_orig_suffixe: rows[0].v_orig_suffixe, canon_id: rows[0].canon_id, canon_id_fin: rows[0].canon_id_fin, ordre_slot: rows[0].ordre_slot, texte_non_vide: nonempty(rows[0].texte) } : null,
        source_text: sourceText,
        normalized_source_equal: rows.length === 1 && sourceText !== null ? sameText(rows[0].texte, sourceText) : sourceText === null ? null : false,
        neighbors: sourceNeighbors(byBook.get(item.livre) ?? [], rows),
      }
    })
    const structural = observedRows.every(({ expected, row_count: count, structure }) => count === 1 && structure.v_orig_suffixe === expected.suffix && structure.canon_id === expected.canon_id && structure.ordre_slot === expected.ordre_slot && structure.canon_id_fin === null && structure.texte_non_vide)
    const sourceAvailable = observedRows.every((entry) => entry.source_text !== null)
    const sourceEqual = observedRows.every((entry) => entry.normalized_source_equal === true)
    const status = !structural || (sourceAvailable && !sourceEqual) ? 'FAIL' : !sourceAvailable ? 'INDETERMINATE' : 'PASS'
    const predicates = item.expected_rows.map((expected) => `(ch_orig=${expected.chapter} and v_orig=${expected.verse})`).join(' or ')
    const sql = `select id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,ordre_slot,texte,alignement_verifie from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and (${predicates}) order by ch_orig,v_orig,v_orig_suffixe nulls first;`
    return makeResult(item, status, sql, { rows: observedRows }, status === 'PASS' ? 'Les deux références natives distinctes, leurs textes et leurs cibles canoniques sont conformes au témoin Segond.' : status === 'FAIL' ? 'La paire de références natives ne correspond pas à l’amendement du registre.' : 'La structure est conforme, mais le témoin source manque.')
  }

  if (item.test === 'source_only') {
    const key = sourceKey(item.livre, item.source.chapter, item.source.verse)
    const rows = bySource.get(key) ?? []
    const row = rows[0]
    const sourceText = source.map?.get(key) ?? null
    const sourceEqual = row && sourceText ? sameText(row.texte, sourceText) : sourceText === null ? null : false
    const structural =
      rows.length === 1 &&
      row.canon_id === null &&
      row.canon_id_fin === null &&
      nonempty(row.texte) &&
      row.alignement_verifie === true
    const observed = {
      row_count: rows.length,
      row: compactRow(row),
      source_text: sourceText,
      normalized_source_equal: sourceEqual,
      links_by_verset_v2_id: row ? state.links.filter((link) => link.verset_v2_id === row.id).map((link) => link.id) : [],
      neighbors: sourceNeighbors(byBook.get(item.livre) ?? [], rows),
    }
    const status = !structural || sourceEqual === false ? 'FAIL' : sourceEqual === null ? 'INDETERMINATE' : 'PASS'
    const sql = `select id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,ordre_slot,texte,alignement_verifie,note_structure from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and ch_orig=${item.source.chapter} and v_orig=${item.source.verse};`
    return makeResult(item, status, sql, observed, status === 'PASS' ? 'Une ligne source-only unique, non vide et fidèle à la source est présente.' : status === 'FAIL' ? 'La ligne source-only viole au moins un critère attendu.' : 'La structure est conforme, mais le témoin source manque.')
  }

  if (item.test === 'canon_deleted') {
    const refs = referenceCounts(item.canon_id, state)
    const observed = { canon_row_count: canonById.has(item.canon_id) ? 1 : 0, ...refs }
    const pass = Object.values(observed).every((value) => value === 0)
    const sql = `select ${sqlLiteral(item.canon_id)} as canon_id, (select count(*) from versets_canon where id=${sqlLiteral(item.canon_id)}) as canon_row_count, (select count(*) from versets_v2 where canon_id=${sqlLiteral(item.canon_id)} or canon_id_fin=${sqlLiteral(item.canon_id)}) as references_in_versets_v2, (select count(*) from liens_bibliques where canon_id=${sqlLiteral(item.canon_id)}) as references_in_links, (select count(*) from pericope_occurrences where canon_id_debut=${sqlLiteral(item.canon_id)} or canon_id_fin=${sqlLiteral(item.canon_id)}) as references_in_pericopes, (select count(*) from concordance_glaire where canon_id=${sqlLiteral(item.canon_id)}) as references_in_concordance_glaire;`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? 'Le faux créneau est absent et aucune dépendance résiduelle ne le vise.' : 'Le faux créneau ou une dépendance résiduelle subsiste.')
  }

  if (item.test === 'restored_row') {
    const key = sourceKey(item.livre, item.source.chapter, item.source.verse)
    const rows = bySource.get(key) ?? []
    const row = rows[0]
    const sourceText = source.map?.get(key) ?? null
    const sourceEqual = row && sourceText ? sameText(row.texte, sourceText) : sourceText === null ? null : false
    const structural =
      rows.length === item.expected.row_count &&
      row?.canon_id === item.expected.canon_id &&
      row?.canon_id_fin === null &&
      nonempty(row?.texte) &&
      row?.alignement_verifie === item.expected.verified
    const duplicateCanon = rows.length ? state.verses.filter((candidate) => candidate.canon_id === item.expected.canon_id && candidate.id !== row.id).map(compactRow) : []
    const observed = {
      row_count: rows.length,
      row: compactRow(row),
      source_text: sourceText,
      database_text: row?.texte ?? null,
      normalized_source_equal: sourceEqual,
      other_occupants_of_canon_slot: duplicateCanon,
      neighbors: sourceNeighbors(byBook.get(item.livre) ?? [], rows),
    }
    const status = !structural || sourceEqual === false ? 'FAIL' : sourceEqual === null ? 'INDETERMINATE' : 'PASS'
    const sql = `select id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,ordre_slot,texte,alignement_verifie from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and ch_orig=${item.source.chapter} and v_orig=${item.source.verse};`
    return makeResult(item, status, sql, observed, status === 'PASS' ? 'La ligne restaurée est unique, correctement rattachée et textuellement conforme à la source Segond.' : status === 'FAIL' ? 'La restauration ne correspond pas entièrement au registre ou à la source.' : 'La structure est conforme, mais la source Segond n’est pas accessible.')
  }

  if (item.test === 'range_mapping') {
    const bookRows = byBook.get(item.livre) ?? []
    const rows = bookRows.filter((row) => inRange(row, item.source_start, item.source_end))
    const canonStart = item.canon_start.includes('.') ? item.canon_start : `${item.livre}.${item.canon_start.replace(':', '.')}`
    const canonRows = canonByBook.get(item.livre) ?? []
    const startIndex = canonRows.findIndex((row) => row.id === canonStart)
    const expectedIds = startIndex < 0 ? [] : canonRows.slice(startIndex, startIndex + item.expected_count).map((row) => row.id)
    const actualIds = rows.map((row) => row.canon_id)
    const exact = rows.length === item.expected_count && expectedIds.length === item.expected_count && actualIds.every((id, index) => id === expectedIds[index])
    const observed = {
      row_count: rows.length,
      expected_count: item.expected_count,
      expected_canon_ids: expectedIds,
      actual_canon_ids: actualIds,
      first_row: compactRow(rows[0]),
      last_row: compactRow(rows.at(-1)),
      neighbors: sourceNeighbors(bookRows, rows),
      mismatch_indexes: actualIds.map((id, index) => (id === expectedIds[index] ? null : index)).filter((value) => value !== null),
    }
    const [sc, sv] = item.source_start.split(':').map(Number)
    const [ec, ev] = item.source_end.split(':').map(Number)
    const sql = `select id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,canon_id_fin,ordre_slot,texte from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and (ch_orig,v_orig) between (${sc},${sv}) and (${ec},${ev}) order by ch_orig,v_orig,v_orig_suffixe nulls first,ordre_slot nulls first;`
    return makeResult(item, exact ? 'PASS' : 'FAIL', sql, observed, exact ? `Les ${rows.length} lignes de la plage suivent exactement la séquence canonique attendue.` : 'La cardinalité ou la séquence canonique de la plage est incorrecte.')
  }

  if (item.test === 'metadata_value') {
    const rows = bySource.get(sourceKey(item.livre, item.source.chapter, item.source.verse)) ?? []
    const row = rows[0]
    const observed = { row_count: rows.length, id: row?.id ?? null, field: item.field, value: row?.[item.field] ?? null, neighbors: sourceNeighbors(byBook.get(item.livre) ?? [], rows) }
    const pass = rows.length === 1 && row[item.field] === item.expected
    const sql = `select id,livre,ch_orig,v_orig,${item.field} from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and ch_orig=${item.source.chapter} and v_orig=${item.source.verse};`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? `La métadonnée ${item.field} porte la valeur attendue.` : `La métadonnée ${item.field} ne porte pas la valeur attendue.`)
  }

  if (item.test === 'link_remap') {
    const rows = bySource.get(sourceKey(item.livre, item.source.chapter, item.source.verse)) ?? []
    const row = rows[0]
    const links = row ? state.links.filter((link) => link.verset_v2_id === row.id) : []
    const observed = {
      source_row_count: rows.length,
      source_row_uuid: row?.id ?? null,
      source_row_canon_id: row?.canon_id ?? null,
      link_count: links.length,
      links: links.map((link) => ({ id: link.id, segment_id: link.segment_id, canon_id: link.canon_id, verset_v2_id: link.verset_v2_id })),
    }
    const pass = rows.length === 1 && row.canon_id === item.expected.canon_id && links.length === item.expected.verset_v2_link_count && links.every((link) => link.canon_id === null)
    const sql = `select l.id,l.segment_id,l.canon_id,l.verset_v2_id from liens_bibliques l where l.verset_v2_id in (select id from versets_v2 where trad_id='${TRAD}' and livre=${sqlLiteral(item.livre)} and ch_orig=${item.source.chapter} and v_orig=${item.source.verse});`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? 'Les liens attendus visent exclusivement l’UUID de la ligne source-only.' : 'Le nombre ou la cible des liens remappés est incorrect.')
  }

  if (item.test === 'dependent_remap') {
    const deleted = item.scope.filter((id) => !canonById.has(id))
    const retained = item.scope.filter((id) => canonById.has(id))
    const counts = Object.fromEntries(item.scope.map((id) => [id, referenceCounts(id, state)]))
    const deletedClean = deleted.every((id) => Object.values(counts[id]).every((value) => value === 0))
    const retainedExist = retained.length > 0
    const observed = { deleted_canon_ids: deleted, retained_canon_ids: retained, reference_counts: counts }
    const pass = deletedClean && retainedExist
    const sql = `select canon_id, 'liens_bibliques' as dependency, count(*) as n from liens_bibliques where canon_id in (${item.scope.map(sqlLiteral).join(',')}) group by canon_id union all select canon_id, 'concordance_glaire', count(*) from concordance_glaire where canon_id in (${item.scope.map(sqlLiteral).join(',')}) group by canon_id;`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? 'Les faux créneaux de la portée sont sans dépendance et les créneaux de destination existent.' : 'Une dépendance résiduelle ou une destination manquante a été détectée.')
  }

  if (item.test === 'global_state') {
    const observed = {
      rows: state.verses.length,
      verified: state.verses.filter((row) => row.alignement_verifie).length,
      books: new Set(state.verses.map((row) => row.livre)).size,
      empty_text: state.verses.filter((row) => !nonempty(row.texte)).length,
      canon_id_fin: state.verses.filter((row) => row.canon_id_fin !== null).length,
      source_only: state.verses.filter((row) => row.canon_id === null).length,
      suffix_rows: state.verses.filter((row) => row.v_orig_suffixe !== null).length,
    }
    const pass = Object.entries(item.expected).every(([field, value]) => observed[field] === value)
    const sql = `select count(*) as rows,count(*) filter(where alignement_verifie) as verified,count(distinct livre) as books,count(*) filter(where nullif(btrim(texte),'') is null) as empty_text,count(*) filter(where canon_id_fin is not null) as canon_id_fin,count(*) filter(where canon_id is null) as source_only,count(*) filter(where v_orig_suffixe is not null) as suffix_rows from versets_v2 where trad_id='${TRAD}';`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? 'Tous les compteurs globaux correspondent au registre.' : 'Au moins un compteur global diffère du registre.')
  }

  if (item.test === 'multiple_slots_exact_set') {
    const expected = (item.expected_canon_ids ?? ['GEN.25.19', 'GEN.46.33', 'LEV.7.19', 'NUM.11.10', 'NUM.12.2', 'NUM.21.18', 'NUM.29.9', 'DEU.34.1', 'JOS.19.10', 'LUK.4.19', 'JHN.16.5', 'ACT.18.20', 'ROM.3.3', '2CO.2.13', 'REV.20.7', 'REV.20.9']).sort()
    const groups = new Map()
    for (const row of state.verses.filter((candidate) => candidate.canon_id !== null)) {
      if (!groups.has(row.canon_id)) groups.set(row.canon_id, [])
      groups.get(row.canon_id).push(row)
    }
    const actual = [...groups.entries()].filter(([, rows]) => rows.length > 1).map(([id]) => id).sort()
    const details = Object.fromEntries(actual.map((id) => [id, groups.get(id).sort(sourceSort).map(compactRow)]))
    const pass = actual.length === item.expected_count && JSON.stringify(actual) === JSON.stringify(expected) && actual.every((id) => details[id].length === 2 && details[id][0].ordre_slot === 1 && details[id][1].ordre_slot === 2)
    const observed = { count: actual.length, actual, expected, details }
    const sql = `select canon_id,count(*) as n,string_agg(concat(livre,' ',ch_orig,',',v_orig,coalesce(v_orig_suffixe,'')),'; ' order by ordre_slot,ch_orig,v_orig,v_orig_suffixe) as refs,string_agg(coalesce(ordre_slot::text,'NULL'),', ' order by ordre_slot) as ordres from versets_v2 where trad_id='${TRAD}' and canon_id is not null group by canon_id having count(*)>1 order by canon_id;`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? `L’ensemble exact des ${expected.length} créneaux doubles et leurs ordres_slot sont conformes.` : 'L’ensemble ou l’ordre des créneaux multiples diffère de l’attendu.')
  }

  if (item.test === 'monotonicity') {
    const violations = []
    for (const [book, rows] of byBook.entries()) {
      let previous = null
      for (const row of rows.filter((candidate) => candidate.canon_id !== null)) {
        const canon = canonById.get(row.canon_id)
        if (!canon) {
          violations.push({ type: 'canon_missing', row: compactRow(row) })
          continue
        }
        if (previous && canon.ordre < previous.ordre) violations.push({ livre: book, previous: compactRow(previous.row), current: compactRow(row), previous_ordre: previous.ordre, current_ordre: canon.ordre })
        previous = { ordre: canon.ordre, row }
      }
    }
    const observed = { violations_count: violations.length, violations }
    const pass = violations.length === item.expected_violations
    const sql = `with x as (select v.id,v.livre,v.ch_orig,v.v_orig,v.v_orig_suffixe,vc.ordre,lag(vc.ordre) over(partition by v.livre order by v.ch_orig,v.v_orig,coalesce(v.v_orig_suffixe,''),coalesce(v.ordre_slot,0)) as prev_ordre from versets_v2 v join versets_canon vc on vc.id=v.canon_id where v.trad_id='${TRAD}') select * from x where prev_ordre is not null and ordre<prev_ordre;`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? 'Aucune rupture de monotonie canonique n’a été trouvée.' : `${violations.length} rupture(s) de monotonie ont été trouvées.`)
  }

  if (item.test === 'duplicate_source_refs') {
    const groups = new Map()
    for (const row of state.verses) {
      const key = `${sourceKeyOf(row)}.${row.v_orig_suffixe ?? ''}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    }
    const duplicates = [...groups.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => ({ key, rows: rows.map(compactRow) }))
    const observed = { unexplained_duplicates: duplicates.length, duplicates }
    const pass = duplicates.length === item.expected_unexplained_duplicates
    const sql = `select livre,ch_orig,v_orig,coalesce(v_orig_suffixe,'') as suffixe,count(*) as n from versets_v2 where trad_id='${TRAD}' group by livre,ch_orig,v_orig,coalesce(v_orig_suffixe,'') having count(*)>1 order by livre,ch_orig,v_orig,suffixe;`
    return makeResult(item, pass ? 'PASS' : 'FAIL', sql, observed, pass ? 'Aucun doublon de référence source suffixée n’a été trouvé.' : `${duplicates.length} doublon(s) inexpliqué(s) ont été trouvé(s).`)
  }

  return makeResult(item, 'INDETERMINATE', '/* type non pris en charge */', {}, `Type de test non pris en charge : ${item.test}`)
}

function markdownReport(report) {
  const lines = []
  lines.push(`# Contre-audit de la Segond 1910 (${TRAD})`, '')
  lines.push(`Audit complet : ${report.summary.controlled}/${report.summary.expected} modifications contrôlées`)
  lines.push(`PASS : ${report.summary.PASS}`)
  lines.push(`FAIL : ${report.summary.FAIL}`)
  lines.push(`INDETERMINATE : ${report.summary.INDETERMINATE}`, '')
  lines.push(`- Exécution : ${report.generated_at}`)
  lines.push(`- Mode : lecture seule`)
  lines.push(`- Registre : version ${report.registry.version}, SHA-256 ${report.registry.sha256}`)
  lines.push(`- Amendement post-correction : ${report.registry.amendment.version}, SHA-256 ${report.registry.amendment.sha256}`)
  lines.push(`- Source Segond : ${report.source.available ? `BibleNLP/ebible, commit ${report.source.commit}` : `indisponible (${report.source.error})`}`, '')
  lines.push('## Synthèse par livre', '')
  lines.push('| Livre | Contrôles | PASS | FAIL | INDETERMINATE |', '|---|---:|---:|---:|---:|')
  const books = [...new Set(report.items.map((item) => item.livre).filter(Boolean))].sort()
  for (const book of books) {
    const items = report.items.filter((item) => item.livre === book)
    const counts = countByStatus(items)
    lines.push(`| ${book} | ${items.length} | ${counts.PASS} | ${counts.FAIL} | ${counts.INDETERMINATE} |`)
  }
  const transverse = report.items.filter((item) => !item.livre)
  const transverseCounts = countByStatus(transverse)
  lines.push(`| Transversal | ${transverse.length} | ${transverseCounts.PASS} | ${transverseCounts.FAIL} | ${transverseCounts.INDETERMINATE} |`, '')
  for (const status of ['FAIL', 'INDETERMINATE']) {
    lines.push(`## ${status}`, '')
    const items = report.items.filter((item) => item.status === status)
    if (!items.length) lines.push('Aucune entrée.', '')
    for (const item of items) lines.push(`- **${item.id}** (${item.type}) : ${item.evidence}`, '')
  }
  lines.push('## Détail des 234 entrées', '')
  for (const item of report.items) {
    lines.push(`### ${item.id} — ${item.status}`, '')
    lines.push(`- Type : \`${item.type}\``)
    if (item.livre) lines.push(`- Livre : \`${item.livre}\``)
    if (item.reference_source) lines.push(`- Référence source : ${item.reference_source}`)
    lines.push(`- Conclusion : ${item.evidence}`, '')
    lines.push('```sql', item.sql, '```', '')
    lines.push('```json', JSON.stringify(item.observed, null, 2), '```', '')
  }
  return `${lines.join('\n')}\n`
}

async function main() {
  const { registry, markdown, amendment, amendmentText } = loadRegistry()
  const [verses, canon, links, concordance, pericopes] = await Promise.all([
    fetchAll('versets_v2', '*', (query) => query.eq('trad_id', TRAD).order('id')),
    fetchAll('versets_canon', '*', (query) => query.order('ordre')),
    fetchAll('liens_bibliques', '*', (query) => query.order('id')),
    fetchAll('concordance_glaire', 'canon_id,livre', (query) => query.order('canon_id')),
    fetchAll('pericope_occurrences', 'id,canon_id_debut,canon_id_fin', (query) => query.order('id')),
  ])
  const state = { verses, canon, links, concordance, pericopes }
  const indexes = buildIndexes(state)
  let source
  try {
    source = await loadSource()
  } catch (error) {
    source = { available: false, map: null, error: error.message }
  }
  const items = registry.items.map((item) => auditItem(item, state, indexes, source))
  if (items.length !== registry.items.length) throw new Error(`Audit incomplet : ${items.length}/${registry.items.length}`)
  const allowed = new Set(['PASS', 'FAIL', 'INDETERMINATE'])
  for (const item of items) {
    if (!item.id || !allowed.has(item.status) || !item.sql || item.observed === undefined) throw new Error(`Preuve manquante ou statut invalide pour ${item.id ?? 'entrée inconnue'}`)
  }
  const counts = countByStatus(items)
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'strictement en lecture seule',
    translation: TRAD,
    registry: {
      version: registry.registry_version,
      expected_entries: registry.entry_count,
      sha256: createHash('sha256').update(markdown).digest('hex'),
      source_file: 'C:/Users/Sébastien/Downloads/CODEX_SEGOND(2).md',
      amendment: {
        version: amendment.amendment_version,
        reason: amendment.reason,
        source_file: AMENDMENT_PATH,
        sha256: createHash('sha256').update(amendmentText).digest('hex'),
      },
    },
    source: source.available
      ? { available: true, repository: source.repository, commit: source.commit, files: source.files, witnesses: source.witnesses, hashes: source.hashes }
      : { available: false, error: source.error },
    summary: { expected: registry.entry_count, controlled: items.length, ...counts },
    items,
  }
  mkdirSync(OUT_DIR, { recursive: true })
  const json = `${JSON.stringify(report, null, 2)}\n`
  const md = markdownReport(report)
  writeFileSync(JSON_PATH, json)
  writeFileSync(MD_PATH, md)
  console.log(JSON.stringify({
    output: [JSON_PATH, MD_PATH],
    summary: report.summary,
    report_sha256: createHash('sha256').update(json).digest('hex'),
    source: report.source,
    failures: items.filter((item) => item.status === 'FAIL').map((item) => item.id),
    indeterminate: items.filter((item) => item.status === 'INDETERMINATE').map((item) => item.id),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
