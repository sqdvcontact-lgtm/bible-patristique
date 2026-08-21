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
  return sql
    .replace(/^\s*begin;\s*$/im, '')
    .replace(/^\s*commit;\s*$/im, '')
}

const root = resolve(import.meta.dirname, '..', '..')
const env = chargerEnv(resolve(root, '.env.local'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Configuration Supabase absente.')

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
}

async function lire(table, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers })
  const body = await response.text()
  if (!response.ok) throw new Error(`${table} illisible (HTTP ${response.status}) : ${body.slice(0, 1000)}`)
  return JSON.parse(body)
}

const [traductionsAvant, famillesAvant] = await Promise.all([
  lire('traductions', 'select=trad_id&trad_id=in.(TR0010,TR0011)'),
  lire('bible_edition_families', 'select=id&family_code=eq.fillion-bible'),
])
if (traductionsAvant.length !== 0 || famillesAvant.length !== 0) {
  throw new Error('Précondition refusée : un objet Fillion existe déjà.')
}

const bootstrap = sansBornesTransactionnelles(readFileSync(
  resolve(root, 'work', 'fillion', 'bootstrap_draft.sql'),
  'utf8',
))
const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ sql: bootstrap }),
})
const responseBody = await response.text()
if (!response.ok) {
  throw new Error(`Amorçage Fillion refusé (HTTP ${response.status}) : ${responseBody.slice(0, 1600)}`)
}

const familles = await lire(
  'bible_edition_families',
  'select=id,family_code,status&family_code=eq.fillion-bible',
)
if (familles.length !== 1 || familles[0].status !== 'draft') {
  throw new Error('Famille Fillion absente ou non brouillon après amorçage.')
}
const familyId = familles[0].id
const [traductions, membres, composants, catalogue] = await Promise.all([
  lire('traductions', 'select=trad_id,schema_numerotation,statut_corpus_public&trad_id=in.(TR0010,TR0011)&order=trad_id'),
  lire('bible_edition_members', `select=trad_id,status,display_order,desktop_position,mobile_order&family_id=eq.${familyId}&order=display_order`),
  lire('bible_edition_components', `select=component_code,status,publication_year&family_id=eq.${familyId}&order=material_order`),
  lire('v_bible_edition_catalog', `select=family_id&family_id=eq.${familyId}`),
])
if (traductions.length !== 2 || traductions.some((row) => row.schema_numerotation !== null)) {
  throw new Error('Les deux traductions brouillon n’ont pas été créées avec une numérotation masquée.')
}
if (membres.length !== 2 || membres.some((row) => row.status !== 'draft')) {
  throw new Error('Les deux membres Fillion ne sont pas tous en brouillon.')
}
if (composants.length !== 8 || composants.some((row) => row.status !== 'draft')) {
  throw new Error('Les huit composants bibliographiques ne sont pas tous en brouillon.')
}
if (catalogue.length !== 0) {
  throw new Error('Le catalogue public expose la famille Fillion brouillon.')
}

console.log(JSON.stringify({
  family_code: familles[0].family_code,
  family_status: familles[0].status,
  translations: traductions.map((row) => row.trad_id),
  members: membres.length,
  components: composants.length,
  public_catalog_rows: catalogue.length,
}, null, 2))
