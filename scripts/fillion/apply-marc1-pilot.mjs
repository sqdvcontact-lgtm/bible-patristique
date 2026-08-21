import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function chargerEnv(path) {
  const values = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    values[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2')
  }
  return values
}

function sansBornesTransactionnelles(sql) {
  return sql.replace(/^\s*begin;\s*$/im, '').replace(/^\s*commit;\s*$/im, '')
}

const root = resolve(import.meta.dirname, '..', '..')
const env = chargerEnv(resolve(root, '.env.local'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !serviceKey) throw new Error('Configuration Supabase absente.')
const verifyOnly = process.argv.includes('--verify-only')

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
}
const storagePath = 'fillion/t07/mrk/1/fillion-t07-p0202-i01/master.png'
const masterPath = resolve(
  root,
  '..',
  'bible-patristique',
  'work',
  'fillion',
  'pilot_illustrations',
  'page_0202',
  'fillion-t07-p0202-i01',
  'master.png',
)
const master = readFileSync(masterPath)
const masterSha256 = createHash('sha256').update(master).digest('hex')
if (masterSha256 !== '4e6cec8d83d15a176dcd438fac73f69cf0d16bd06c7c7f4c580d7ca98e3144ea') {
  throw new Error(`Master inattendu : ${masterSha256}`)
}

async function lire(table, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers })
  const body = await response.text()
  if (!response.ok) throw new Error(`${table} illisible (HTTP ${response.status}) : ${body.slice(0, 1200)}`)
  return JSON.parse(body)
}

async function lirePublic(table, query) {
  const publicHeaders = { apikey: anonKey, authorization: `Bearer ${anonKey}` }
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: publicHeaders })
  const body = await response.text()
  if (!response.ok) throw new Error(`${table} publiquement illisible (HTTP ${response.status}) : ${body.slice(0, 1200)}`)
  return JSON.parse(body)
}

const uploadUrl = `${url}/storage/v1/object/bible-illustrations-master/${storagePath}`
if (!verifyOnly) {
  const sourcesAvant = await lire(
    'bible_text_sources',
    'select=id&source_code=eq.fillion-t07-mrk-pilot&trad_id=in.(TR0010,TR0011)',
  )
  const assetsAvant = await lire(
    'bible_edition_assets',
    'select=id&asset_key=eq.fillion-t07-p0202-i01',
  )
  if (sourcesAvant.length || assetsAvant.length) {
    throw new Error('Précondition refusée : le pilote Marc ou son illustration existe déjà.')
  }

  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'image/png',
      'x-upsert': 'false',
    },
    body: master,
  })
  const uploadBody = await upload.text()
  if (!upload.ok) {
    throw new Error(`Téléversement du master refusé (HTTP ${upload.status}) : ${uploadBody.slice(0, 1200)}`)
  }

  let sqlApplied = false
  try {
    const sql = sansBornesTransactionnelles(readFileSync(
      resolve(root, 'work', 'fillion', 'marc1_pilot_draft.sql'),
      'utf8',
    ))
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql }),
    })
    const body = await response.text()
    if (!response.ok) {
      throw new Error(`Import SQL refusé (HTTP ${response.status}) : ${body.slice(0, 1800)}`)
    }
    sqlApplied = true
  } finally {
    if (!sqlApplied) {
      await fetch(uploadUrl, {
        method: 'DELETE',
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      })
    }
  }
}

const sources = await lire(
  'bible_text_sources',
  'select=id,trad_id,status&source_code=eq.fillion-t07-mrk-pilot&order=trad_id',
)
const family = (await lire('bible_edition_families', 'select=id&family_code=eq.fillion-bible'))[0]
const notes = await lire(
  'bible_verse_notes',
  'select=id,note_key,canon_id,validation_status&note_key=eq.mrk-001-001-note-01-pilot',
)
const sourceIds = sources.map((row) => row.id).join(',')
const noteIds = notes.map((row) => row.id).join(',')

const verificationSql = readFileSync(
  resolve(root, 'sql', 'tests', '20260820_fillion_marc1_pilot_verification.sql'),
  'utf8',
)
const verificationResponse = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ sql: verificationSql }),
})
const verificationBody = await verificationResponse.text()
if (!verificationResponse.ok) {
  throw new Error(`Vérification SQL du pilote refusée (HTTP ${verificationResponse.status}) : ${verificationBody.slice(0, 1800)}`)
}

const [units, segments, alignments, blocks, anchors, assets, files, catalogue] = await Promise.all([
  lire('bible_source_units', `select=id,source_id,source_unit_key&source_id=in.(${sourceIds})`),
  lire('bible_editorial_segments', `select=id,source_id,segment_key&source_id=in.(${sourceIds})`),
  lire('bible_canonical_alignments', `select=id,source_id,verification_status&source_id=in.(${sourceIds})`),
  lire('bible_editorial_body_blocks', 'select=id,block_key,block_kind,scope_kind,placement,validation_status&family_id=eq.' + family.id),
  lire('bible_verse_note_anchors', `select=id,anchor_key,target_source_id&note_id=in.(${noteIds})`),
  lire('bible_edition_assets', 'select=id,asset_key,canon_id_start,placement,validation_status,is_public&asset_key=eq.fillion-t07-p0202-i01'),
  lire('bible_edition_asset_files', 'select=variant_role,storage_bucket,storage_path,sha256,validation_status,is_public&storage_path=eq.' + storagePath),
  lirePublic('v_bible_edition_catalog', 'select=family_id&family_code=eq.fillion-bible'),
])

if (sources.length !== 2 || sources.some((row) => row.status !== 'review')) throw new Error('Sources pilotes invalides.')
if (units.length !== 46) throw new Error(`Nombre d’unités inattendu : ${units.length}`)
if (segments.length !== 46) throw new Error(`Nombre de segments inattendu : ${segments.length}`)
if (alignments.length !== 40 || alignments.some((row) => row.verification_status !== 'review')) {
  throw new Error('Les quarante alignements pilotes ne sont pas tous en revue.')
}
if (blocks.length !== 6 || blocks.some((row) => row.validation_status !== 'review' || row.placement !== 'before')) {
  throw new Error('Les six blocs de corps pilotes sont invalides.')
}
if (notes.length !== 1 || anchors.length !== 2) throw new Error('La note bilingue pilote est incomplète.')
if (assets.length !== 1 || assets[0].is_public || assets[0].validation_status !== 'review') {
  throw new Error('L’illustration pilote n’est pas confinée en revue privée.')
}
if (files.length !== 1 || files[0].sha256 !== masterSha256 || files[0].is_public) {
  throw new Error('Le fichier master privé ne correspond pas au manifeste.')
}
if (catalogue.length !== 0) throw new Error('Le catalogue public expose le pilote Fillion.')

const download = await fetch(uploadUrl, {
  headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
})
if (!download.ok) throw new Error(`Master privé illisible après import (HTTP ${download.status}).`)
const downloadedSha256 = createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex')
if (downloadedSha256 !== masterSha256) throw new Error('Le master privé diffère après téléversement.')

console.log(JSON.stringify({
  pilot: 'MRK I, 1-20',
  sources: sources.map((row) => `${row.trad_id}:${row.status}`),
  source_units: units.length,
  editorial_segments: segments.length,
  canonical_alignments: 40,
  body_blocks: blocks.length,
  verse_notes: notes.length,
  bilingual_note_anchors: anchors.length,
  illustration: assets[0].asset_key,
  master_sha256_verified: true,
  web_candidate_uploaded: false,
  public_catalog_rows: catalogue.length,
}, null, 2))
