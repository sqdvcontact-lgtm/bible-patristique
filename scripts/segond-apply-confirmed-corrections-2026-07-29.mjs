import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { strFromU8, unzipSync } from 'fflate'

const TRAD = 'TR0002'
const SOURCE_URL = 'https://ebible.org/Scriptures/fraLSG_usfm.zip'
const AUDIT_PATH = 'audit/segond_deep_random_audit.json'
const DRY_RUN_PATH = 'audit/segond_corrections_dry_run_2026-07-29.json'
const BACKUP_PATH = 'audit/segond_corrections_backup_2026-07-29.json'
const APPLY = process.argv.includes('--apply')

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

function sourceKey(book, chapter, verse) {
  return `${book}.${Number(chapter)}.${Number(verse)}`
}

function sourceKeyOf(row) {
  return sourceKey(row.livre, row.ch_orig, row.v_orig)
}

function sourceSort(a, b) {
  return a.ch_orig - b.ch_orig || a.v_orig - b.v_orig || String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? ''), 'fr') || (a.ordre_slot ?? 0) - (b.ordre_slot ?? 0) || String(a.id).localeCompare(String(b.id))
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

function stripWhitespace(value) {
  return [...String(value ?? '')].filter((char) => !/\s/u.test(char)).join('')
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
        if (cleaned) map.set(sourceKey(book, chapter, verse), cleaned)
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
  return { map, sha256: createHash('sha256').update(bytes).digest('hex') }
}

async function fetchAllVerses() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('versets_v2').select('*').eq('trad_id', TRAD).order('id').range(from, from + 999)
    if (error) throw new Error(`versets_v2 : ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

function groupRows(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = sourceKeyOf(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  for (const group of groups.values()) group.sort(sourceSort)
  return groups
}

function restoreMissingWhitespace(rows, sourceText, sourceRef) {
  const aggregate = []
  rows.forEach((row, rowIndex) => {
    if (rowIndex) aggregate.push({ char: ' ', rowIndex: null, localIndex: null })
    ;[...row.texte].forEach((char, localIndex) => aggregate.push({ char, rowIndex, localIndex }))
  })
  const sourceChars = [...sourceText]
  const dbPositions = aggregate.map((item, index) => (/\s/u.test(item.char) ? null : index)).filter((index) => index !== null)
  const sourcePositions = sourceChars.map((char, index) => (/\s/u.test(char) ? null : index)).filter((index) => index !== null)
  const dbFlat = dbPositions.map((index) => aggregate[index].char).join('')
  const sourceFlat = sourcePositions.map((index) => sourceChars[index]).join('')
  if (dbFlat !== sourceFlat) throw new Error(`${sourceRef} : différences autres que les espaces`)

  const insertsByRow = rows.map(() => new Set())
  for (let index = 0; index < dbPositions.length - 1; index += 1) {
    const dbGap = aggregate.slice(dbPositions[index] + 1, dbPositions[index + 1]).map((item) => item.char).join('')
    const sourceGap = sourceChars.slice(sourcePositions[index] + 1, sourcePositions[index + 1]).join('')
    if (/\s/u.test(sourceGap) && !/\s/u.test(dbGap)) {
      const owner = aggregate[dbPositions[index]]
      if (owner.rowIndex === null) throw new Error(`${sourceRef} : insertion sans ligne propriétaire`)
      insertsByRow[owner.rowIndex].add(owner.localIndex)
    }
  }

  const updates = rows.map((row, rowIndex) => {
    let texte = ''
    ;[...row.texte].forEach((char, localIndex) => {
      texte += char
      if (insertsByRow[rowIndex].has(localIndex)) texte += ' '
    })
    return { id: row.id, source_ref: sourceRef, before: row.texte, after: texte, spaces_added: insertsByRow[rowIndex].size }
  }).filter((item) => item.before !== item.after)
  const afterById = new Map(updates.map((item) => [item.id, item.after]))
  const recomposed = rows.map((row) => afterById.get(row.id) ?? row.texte).join(' ')
  if (normalizeWords(recomposed) !== normalizeWords(sourceText)) throw new Error(`${sourceRef} : la correction proposée ne rétablit pas les mots de la source`)
  return updates
}

function requireOne(rows, predicate, label) {
  const found = rows.filter(predicate)
  if (found.length !== 1) throw new Error(`${label} : ${found.length} ligne(s), une attendue`)
  return found[0]
}

async function guardedUpdate(id, before, patch) {
  let query = db.from('versets_v2').update(patch).eq('id', id)
  for (const [field, value] of Object.entries(before)) query = value === null ? query.is(field, null) : query.eq(field, value)
  const { data, error } = await query.select('*')
  if (error) throw new Error(`UPDATE ${id} : ${error.message}`)
  if (data.length !== 1) throw new Error(`UPDATE ${id} : précondition non satisfaite`)
  return data[0]
}

async function main() {
  const audit = JSON.parse(readFileSync(AUDIT_PATH, 'utf8'))
  const [rows, source] = await Promise.all([fetchAllVerses(), loadOfficialSource()])
  const groups = groupRows(rows)
  const auditedRefs = audit.exhaustive.spacing_only_text_mismatches.map((item) => item.source_ref)
  if (auditedRefs.length !== 168 || new Set(auditedRefs).size !== 168) throw new Error(`Registre des espaces inattendu : ${auditedRefs.length}`)

  const textUpdates = []
  for (const sourceRef of auditedRefs) {
    const group = groups.get(sourceRef)
    const sourceText = source.map.get(sourceRef)
    if (!group?.length || !sourceText) throw new Error(`${sourceRef} : source ou base absente`)
    if (sourceRef === 'REV.2.7') {
      const row = requireOne(group, (item) => item.texte.includes(`del${String.fromCodePoint(0x2019)}arbre`), sourceRef)
      const after = row.texte.replace(`del${String.fromCodePoint(0x2019)}arbre`, `de l${String.fromCodePoint(0x2019)}arbre`)
      if (after === row.texte) throw new Error(`${sourceRef} : correction sans effet`)
      textUpdates.push({ id: row.id, source_ref: sourceRef, before: row.texte, after, spaces_added: 1 })
    } else {
      textUpdates.push(...restoreMissingWhitespace(group, sourceText, sourceRef))
    }
  }
  if (new Set(textUpdates.map((item) => item.id)).size !== textUpdates.length) throw new Error('Une ligne recevrait plusieurs corrections textuelles')
  if (textUpdates.reduce((sum, item) => sum + item.spaces_added, 0) !== 190) throw new Error('Nombre inattendu d’espaces à rétablir')

  const sam42 = requireOne(rows, (row) => row.id === 'bd75be56-b2e9-41a5-992f-956cce99a3c8' && row.v_orig === 42 && row.v_orig_suffixe === 'a', '1SA 20,42a')
  const sam43 = requireOne(rows, (row) => row.id === 'e3432fb0-92f3-4923-bd5a-4a5572c7fd66' && row.v_orig === 42 && row.v_orig_suffixe === 'b', '1SA 20,42b')
  if (normalizeWords(source.map.get('1SA.20.42')) !== normalizeWords(sam42.texte) || normalizeWords(source.map.get('1SA.20.43')) !== normalizeWords(sam43.texte)) throw new Error('1SA 20,42-43 : mots différents du témoin source')

  const mark950 = requireOne(rows, (row) => row.livre === 'MRK' && row.ch_orig === 9 && row.v_orig === 50, 'MRK 9,50')
  const mark1052 = requireOne(rows, (row) => row.livre === 'MRK' && row.ch_orig === 10 && row.v_orig === 52, 'MRK 10,52')
  if (groups.has('MRK.9.51') || groups.has('MRK.10.53')) throw new Error('Les fragments de Marc sont déjà présents')
  const insertedRows = [
    {
      id: randomUUID(), trad_id: TRAD, livre: 'MRK', ch_orig: 9, v_orig: 51, v_orig_suffixe: null,
      est_suscription: false, texte: source.map.get('MRK.9.51'), canon_id: 'MRK.9.50', canon_id_fin: null,
      ordre_slot: 2, notes: null, alignement_verifie: true,
      note_edition: null, note_structure: 'Verset source Segond 9,51 ; seconde partie du créneau canonique MRK.9.50.', note_travail: null,
    },
    {
      id: randomUUID(), trad_id: TRAD, livre: 'MRK', ch_orig: 10, v_orig: 53, v_orig_suffixe: null,
      est_suscription: false, texte: source.map.get('MRK.10.53'), canon_id: 'MRK.10.52', canon_id_fin: null,
      ordre_slot: 2, notes: null, alignement_verifie: true,
      note_edition: null, note_structure: 'Verset source Segond 10,53 ; seconde partie du créneau canonique MRK.10.52.', note_travail: null,
    },
  ]
  if (insertedRows.some((row) => !row.texte)) throw new Error('Texte source manquant pour Marc')

  const structuralUpdates = [
    {
      id: sam42.id,
      before: { v_orig: 42, v_orig_suffixe: 'a', canon_id: '1SA.20.42' },
      patch: { v_orig_suffixe: null, ordre_slot: null, note_structure: null },
      reason: 'Rétablissement de la référence native Segond 1SA 20,42.',
    },
    {
      id: sam43.id,
      before: { v_orig: 42, v_orig_suffixe: 'b', canon_id: '1SA.21.1' },
      patch: { v_orig: 43, v_orig_suffixe: null, ordre_slot: null, notes: null, note_structure: 'Verset source Segond 20,43 ; correspond au créneau canonique 1SA.21.1.' },
      reason: 'Rétablissement de la référence native Segond 1SA 20,43.',
    },
    {
      id: mark950.id,
      before: { ch_orig: 9, v_orig: 50, canon_id: 'MRK.9.50', ordre_slot: mark950.ordre_slot },
      patch: { ordre_slot: 1, note_structure: 'Verset source Segond 9,50 ; première partie du créneau canonique MRK.9.50.' },
      reason: 'Ouverture du créneau partagé avec le verset source Segond 9,51.',
    },
    {
      id: mark1052.id,
      before: { ch_orig: 10, v_orig: 52, canon_id: 'MRK.10.52', ordre_slot: mark1052.ordre_slot },
      patch: { ordre_slot: 1, note_structure: 'Verset source Segond 10,52 ; première partie du créneau canonique MRK.10.52.' },
      reason: 'Ouverture du créneau partagé avec le verset source Segond 10,53.',
    },
  ]

  const touchedIds = new Set([...textUpdates.map((item) => item.id), ...structuralUpdates.map((item) => item.id)])
  const beforeRows = rows.filter((row) => touchedIds.has(row.id))
  const plan = {
    generated_at: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', translation: TRAD,
    source: { url: SOURCE_URL, sha256: source.sha256 },
    baseline: { rows: rows.length, spacing_refs: auditedRefs.length },
    text_updates: textUpdates,
    structural_updates: structuralUpdates,
    inserted_rows: insertedRows,
    untouched_by_decision: [
      { scope: 'ECC.11.9–12.16', reason: 'Faux positif du témoin USFM ; la base concorde avec l’édition Segond 1910 indépendante.' },
      { scope: 'LUK.9.42–44', reason: 'Redistribution éditoriale documentée ; aucune perte textuelle et aucune correction certaine autorisée par la charte.' },
    ],
  }
  mkdirSync('audit', { recursive: true })
  if (!APPLY) {
    writeFileSync(DRY_RUN_PATH, `${JSON.stringify(plan, null, 2)}\n`)
    console.log(JSON.stringify({ mode: 'dry-run', output: DRY_RUN_PATH, text_rows: textUpdates.length, spacing_refs: auditedRefs.length, spaces_added: textUpdates.reduce((sum, item) => sum + item.spaces_added, 0), structural_updates: structuralUpdates.length, inserts: insertedRows.length }, null, 2))
    return
  }

  const backup = { ...plan, before_rows: beforeRows }
  const backupJson = `${JSON.stringify(backup, null, 2)}\n`
  writeFileSync(BACKUP_PATH, backupJson)
  const backupSha256 = createHash('sha256').update(backupJson).digest('hex')
  const { data: journal, error: journalError } = await db.from('journal_ia').insert({
    sujet: 'Correction Segond 1910 - audit approfondi du 29 juillet 2026',
    probleme: 'Sauvegarde préalable aux corrections certaines : espaces manquantes, références natives de 1 Samuel 20,42-43 et fragments Segond Marc 9,51 et 10,53.',
    reponse: JSON.stringify({ backup_path: BACKUP_PATH, backup_sha256: backupSha256, source_sha256: source.sha256, before_rows: beforeRows, planned_inserts: insertedRows }),
    statut: 'sauvegarde',
  }).select('*').single()
  if (journalError) throw new Error(`journal_ia : ${journalError.message}`)

  for (const item of textUpdates) await guardedUpdate(item.id, { texte: item.before }, { texte: item.after })
  for (const item of structuralUpdates) await guardedUpdate(item.id, item.before, item.patch)
  const { data: inserted, error: insertError } = await db.from('versets_v2').insert(insertedRows).select('*')
  if (insertError) throw new Error(`INSERT Marc : ${insertError.message}`)
  if (inserted.length !== 2) throw new Error(`INSERT Marc incomplet : ${inserted.length}/2`)

  const afterRows = await fetchAllVerses()
  const afterGroups = groupRows(afterRows)
  const failures = []
  for (const sourceRef of auditedRefs) {
    const text = afterGroups.get(sourceRef)?.map((row) => row.texte).join(' ')
    if (normalizeWords(text) !== normalizeWords(source.map.get(sourceRef))) failures.push(`${sourceRef}:texte`)
  }
  for (const sourceRef of ['1SA.20.42', '1SA.20.43', 'MRK.9.51', 'MRK.10.53']) {
    const group = afterGroups.get(sourceRef)
    if (!group || normalizeWords(group.map((row) => row.texte).join(' ')) !== normalizeWords(source.map.get(sourceRef))) failures.push(`${sourceRef}:source`)
  }
  const mark950After = afterRows.filter((row) => row.canon_id === 'MRK.9.50').sort((a, b) => a.ordre_slot - b.ordre_slot)
  const mark1052After = afterRows.filter((row) => row.canon_id === 'MRK.10.52').sort((a, b) => a.ordre_slot - b.ordre_slot)
  if (afterRows.length !== rows.length + 2) failures.push(`total:${afterRows.length}`)
  if (mark950After.length !== 2 || mark950After.map((row) => row.ordre_slot).join(',') !== '1,2') failures.push('MRK.9.50:slots')
  if (mark1052After.length !== 2 || mark1052After.map((row) => row.ordre_slot).join(',') !== '1,2') failures.push('MRK.10.52:slots')
  if (failures.length) throw new Error(`Contre-vérification échouée après écriture : ${failures.join(', ')}`)

  console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, backup: BACKUP_PATH, backup_sha256: backupSha256, text_rows_updated: textUpdates.length, spacing_refs_corrected: auditedRefs.length, spaces_added: textUpdates.reduce((sum, item) => sum + item.spaces_added, 0), structural_rows_updated: structuralUpdates.length, rows_inserted: inserted.length, final_rows: afterRows.length }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
