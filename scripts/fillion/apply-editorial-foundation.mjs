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

async function lireRest(path) {
  return fetch(`${url}/rest/v1/${path}`, { headers })
}

async function executerSql(sql, label) {
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`${label} refusé (HTTP ${response.status}) : ${body.slice(0, 1600)}`)
  }
  return body
}

const relationAvant = await lireRest('bible_edition_families?select=id&limit=1')
if (relationAvant.status !== 404) {
  throw new Error(`Précondition refusée : bible_edition_families répond HTTP ${relationAvant.status}.`)
}
const traductionsAvant = await lireRest('traductions?select=trad_id&trad_id=in.(TR0010,TR0011)')
if (!traductionsAvant.ok) throw new Error(`Précondition traductions illisible (HTTP ${traductionsAvant.status}).`)
if ((await traductionsAvant.json()).length !== 0) {
  throw new Error('Précondition refusée : TR0010 ou TR0011 existe déjà.')
}

const migration = sansBornesTransactionnelles(readFileSync(
  resolve(root, 'supabase', 'migrations', '20260820093045_bible_fillion_editorial_model.sql'),
  'utf8',
))
await executerSql(migration, 'Migration Fillion')

const verification = readFileSync(
  resolve(root, 'sql', 'tests', '20260820_bible_fillion_editorial_model_verification.sql'),
  'utf8',
)
await executerSql(verification, 'Vérification Fillion')

let relationApres
for (let attempt = 0; attempt < 10; attempt += 1) {
  relationApres = await lireRest('bible_edition_families?select=id&limit=1')
  if (relationApres.ok) break
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
}
if (!relationApres?.ok) {
  throw new Error(`Schéma Fillion non exposé après rechargement (HTTP ${relationApres?.status}).`)
}
const familles = await relationApres.json()
if (familles.length !== 0) throw new Error('La migration a créé une famille alors qu’elle devait rester vide.')

const catalogue = await lireRest('v_bible_edition_catalog?select=family_id&limit=1')
if (!catalogue.ok) throw new Error(`Vue de catalogue illisible (HTTP ${catalogue.status}).`)
if ((await catalogue.json()).length !== 0) throw new Error('Le catalogue public ne devait contenir aucune ligne.')

console.log('Migration Fillion appliquée et vérifiée.')
console.log('Schéma exposé, catalogue public vide, TR0010/TR0011 encore absentes.')
