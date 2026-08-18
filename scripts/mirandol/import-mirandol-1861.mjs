import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const EXPECTED = Object.freeze({
  archive_sha256: 'B15C5821839EBC7111BED18D62B78452340DC819ECBD3B7DA2394BEFF1F15BEF',
  docx_sha256: '08D01533B44936059C34832281109A753C3A43742ED1956DABF66A8626EE75C4',
  pdf_sha256: 'B5C06E32D6221A060167D41E127B8ED623D2A41B2AF265D9E7E2FBF89DAD7A27',
  notes_sha256: '7A75BDACDB5019A1CC690567F6F30DBED3C80BBED39D52D9B5CCD1CDEE7448F7',
  segmentation_manifest_sha256: '3A008B8C0744458594FE48F9EFFC99837FDA0559DB44E0D5C1A04AEF8E29ECCB',
  source_units_sha256: '8AD132FC78A75D80FB3E1371858FDE4BA4889DA42DF43ADC6F687A495F85E7AB',
  anchors_sha256: 'EABC5ECF410AE3F5F4842D0B6C96F7E670FE94BC040DFCCBE99604DE23F0F0A2',
  logical_relations_sha256: '5F7CEFF8D78438BBE94D317FA6FE6BBB49FF3E7B6638212A172BF427054D2EF8',
})

function argsMap(argv) {
  const result = new Map()
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index]
    if (!key.startsWith('--')) continue
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) result.set(key, true)
    else { result.set(key, next); index += 1 }
  }
  return result
}

function required(args, name) {
  const value = args.get(name)
  if (!value || value === true) throw new Error(`Argument requis : ${name}`)
  return value
}

async function readBytes(path) {
  return new Uint8Array(await readFile(path))
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase()
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function codepoints(value) {
  return Array.from(value ?? '')
}

function validatePayload(payload) {
  const { units, segments, notes, anchors, logical_groups: groups, logical_relations: logicalRelations } = payload
  assert(units.length === 475, `475 unités attendues, reçu ${units.length}`)
  assert(segments.length === 1896, `1896 segments attendus, reçu ${segments.length}`)
  assert(segments.filter(row => row.nature === 'vers').length === 1092, '1092 vers attendus')
  assert(notes.length === 138, '138 notes attendues')
  assert(anchors.length === 138, '138 ancres attendues')
  assert(groups.length === 1 && groups[0].members.length === 3, 'Groupe de Parménide incomplet')
  assert(logicalRelations.length === 6, '6 relations logiques attendues')

  const unitById = new Map(units.map(unit => [unit.source_unit_id, unit]))
  const segmentByKey = new Map(segments.map(segment => [segment.segment_key, segment]))
  assert(unitById.size === units.length, 'source_unit_id dupliqué')
  assert(segmentByKey.size === segments.length, 'segment_key dupliqué')
  assert(segments.every((row, index) => row.segment_numero === index + 1), 'Numérotation 1–1896 non continue')

  const segmentsByUnit = new Map()
  for (const segment of segments) {
    assert(segment.id_texte === 'TXT_A0064O0001_FR_1861_MIRANDOL', `id_texte invalide au segment ${segment.segment_numero}`)
    assert(segment.id_oeuvre === 'A0064O0001', `id_oeuvre invalide au segment ${segment.segment_numero}`)
    assert(unitById.has(segment.source_unit_id), `Unité absente pour ${segment.segment_key}`)
    const bucket = segmentsByUnit.get(segment.source_unit_id) ?? []
    bucket.push(segment)
    segmentsByUnit.set(segment.source_unit_id, bucket)
  }

  for (const unit of units) {
    const unitText = codepoints(unit.clean_text)
    const members = (segmentsByUnit.get(unit.source_unit_id) ?? [])
      .sort((left, right) => left.source_start_offset_unicode - right.source_start_offset_unicode)
    let cursor = 0
    let rebuilt = ''
    for (const segment of members) {
      const gap = unitText.slice(cursor, segment.source_start_offset_unicode).join('')
      assert(gap === segment.join_before, `join_before invalide : ${segment.segment_key}`)
      const source = unitText.slice(segment.source_start_offset_unicode, segment.source_end_offset_unicode).join('')
      assert(source === segment.segment_text_clean, `Étendue source invalide : ${segment.segment_key}`)
      rebuilt += segment.join_before + segment.segment_text_clean
      cursor = segment.source_end_offset_unicode
    }
    const trailing = unitText.slice(cursor).join('')
    assert(trailing === (unit.segment_trailing_text ?? ''), `Texte final d’unité invalide : ${unit.source_unit_id}`)
    rebuilt += trailing
    assert(rebuilt === unit.clean_text, `Recomposition invalide : ${unit.source_unit_id}`)
    assert(sha256(new TextEncoder().encode(unit.clean_text)) === unit.clean_text_sha256, `SHA unité invalide : ${unit.source_unit_id}`)
  }

  const notesByKey = new Map(notes.map(note => [note.note_key, note]))
  const blocks = notes.flatMap(note => note.blocks.map(block => ({ ...block, note_key: note.note_key })))
  const blockKeys = new Set(blocks.map(block => `${block.note_key}:${block.block_id}`))
  const semanticRelations = blocks.reduce((total, block) => total
    + (block.target_block_id ? 1 : 0)
    + (block.translation_of ? 1 : 0), 0)
  assert(blocks.length === 554, '554 blocs attendus')
  assert(semanticRelations === 161, '161 relations sémantiques attendues')
  for (const block of blocks) {
    if (block.target_block_id) assert(blockKeys.has(`${block.note_key}:${block.target_block_id}`), `Cible absente : ${block.block_id}`)
    if (block.translation_of) assert(blockKeys.has(`${block.note_key}:${block.translation_of}`), `Original absent : ${block.block_id}`)
  }

  for (const anchor of anchors) {
    assert(notesByKey.has(anchor.note_key), `Note absente pour ${anchor.note_key}`)
    const segment = segmentByKey.get(anchor.segment_key)
    const unit = unitById.get(anchor.source_unit_id)
    assert(segment, `Segment d’ancre absent : ${anchor.note_key}`)
    assert(unit, `Unité d’ancre absente : ${anchor.note_key}`)
    assert(segment.segment_numero === anchor.segment_numero, `Numéro d’ancre invalide : ${anchor.note_key}`)
    assert(segment.segment_texte.split(anchor.marker).length === 2, `Marqueur absent ou répété : ${anchor.note_key}`)
    const markerIndex = segment.segment_texte.indexOf(anchor.marker)
    const cleanPrefix = segment.segment_texte.slice(0, markerIndex).replace(/\[\[\d+\]\]/g, '')
    assert(codepoints(cleanPrefix).length === anchor.segment_offset_unicode,
      `Offset de marqueur invalide : ${anchor.note_key}`)
    const unitChars = codepoints(unit.clean_text)
    const left = codepoints(anchor.anchor_text_left)
    const right = codepoints(anchor.anchor_text_right)
    const offset = anchor.source_unit_offset_unicode
    const availableLeft = unitChars.slice(Math.max(0, offset - left.length), offset).join('')
    const availableRight = unitChars.slice(offset, Math.min(unitChars.length, offset + right.length)).join('')
    assert(anchor.anchor_text_left.endsWith(availableLeft),
      `Contexte gauche invalide : ${anchor.note_key}`)
    assert(anchor.anchor_text_right.startsWith(availableRight),
      `Contexte droit invalide : ${anchor.note_key}`)
  }

  for (const group of groups) {
    for (const [unitId] of group.members) assert(unitById.has(unitId), `Membre logique absent : ${unitId}`)
  }
  for (const relation of logicalRelations) {
    assert(segmentByKey.has(relation.source_segment_key), `Source logique absente : ${relation.relation_id}`)
    assert(segmentByKey.has(relation.target_segment_key), `Cible logique absente : ${relation.relation_id}`)
    assert(unitById.has(relation.target_unit_id), `Unité logique absente : ${relation.relation_id}`)
  }

  return {
    units: units.length,
    segments: segments.length,
    verses: 1092,
    notes: notes.length,
    blocks: blocks.length,
    semantic_relations: semanticRelations,
    anchors: anchors.length,
    logical_groups: groups.length,
    logical_members: groups[0].members.length,
    logical_relations: logicalRelations.length,
    recomposition_units_verified: units.length,
  }
}

async function main() {
  const args = argsMap(process.argv)
  const root = required(args, '--source-root')
  const archivePath = required(args, '--archive')
  const notesPath = required(args, '--notes-json')
  const docxPath = required(args, '--docx')
  const pdfPath = required(args, '--pdf')
  const outputPath = args.get('--output')

  const files = {
    archive_sha256: archivePath,
    docx_sha256: docxPath,
    pdf_sha256: pdfPath,
    notes_sha256: notesPath,
    segmentation_manifest_sha256: `${root}/segmentation_manifest_complete_corrigee.json`,
    source_units_sha256: `${root}/source_units_mirandol_complete_corrigee.json`,
    anchors_sha256: `${root}/note_anchor_manifest_complete_corrigee.json`,
    logical_relations_sha256: `${root}/logical_groups_relations.json`,
  }
  const hashes = {}
  for (const [key, path] of Object.entries(files)) {
    hashes[key] = sha256(await readBytes(path))
    assert(hashes[key] === EXPECTED[key], `Empreinte invalide pour ${key}: ${hashes[key]}`)
  }

  const [manifest, unitsDoc, anchorsDoc, logicalDoc, notesDoc] = await Promise.all([
    readJson(files.segmentation_manifest_sha256),
    readJson(files.source_units_sha256),
    readJson(files.anchors_sha256),
    readJson(files.logical_relations_sha256),
    readJson(notesPath),
  ])
  assert(manifest.status === 'segmentation_complete_corrigee_reviewed_not_imported', `Statut manifeste inattendu : ${manifest.status}`)
  assert(notesDoc.status === 'ready_for_supabase_import', `Statut notes inattendu : ${notesDoc.status}`)

  const payload = {
    ...hashes,
    units: unitsDoc.units,
    segments: manifest.segments,
    notes: notesDoc.notes,
    anchors: anchorsDoc.anchors,
    logical_groups: logicalDoc.groups,
    logical_relations: logicalDoc.relations,
  }
  const validation = validatePayload(payload)
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
  const report = {
    schema_version: '1.0.0',
    id_oeuvre: 'A0064O0001',
    id_texte: 'TXT_A0064O0001_FR_1861_MIRANDOL',
    source_hashes: hashes,
    validation,
    payload_bytes: payloadBytes,
    executed: false,
  }

  if (args.has('--execute')) {
    if (typeof process.loadEnvFile === 'function') process.loadEnvFile(args.get('--env') || '.env.local')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    assert(url && key, 'Variables NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absentes')
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const execute = async () => {
      const { data, error } = await client.rpc('importer_mirandol_1861', { p_payload: payload })
      if (error) throw new Error(`RPC importer_mirandol_1861 : ${JSON.stringify(error)}`)
      return data
    }
    const first = await execute()
    const second = args.has('--twice') ? await execute() : null
    if (second) {
      assert(first.segment_id_min === second.segment_id_min && first.segment_id_max === second.segment_id_max,
        'Le second passage a renuméroté les segments')
      assert(first.segments === second.segments && first.blocks === second.blocks,
        'Le second passage a modifié les cardinalités')
    }
    report.executed = true
    report.first_pass = first
    report.second_pass = second
    report.idempotence_verified = Boolean(second)
  }

  if (typeof outputPath === 'string') await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
