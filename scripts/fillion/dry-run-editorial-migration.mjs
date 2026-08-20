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

const root = resolve(import.meta.dirname, '..', '..')
const env = chargerEnv(resolve(root, '.env.local'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Configuration Supabase absente.')

const migrationPath = resolve(
  root,
  'supabase',
  'migrations',
  '20260820093045_bible_fillion_editorial_model.sql',
)
const migration = readFileSync(migrationPath, 'utf8')
  .replace(/^\s*begin;\s*$/im, '')
  .replace(/^\s*commit;\s*$/im, '')
const bootstrap = readFileSync(
  resolve(root, 'work', 'fillion', 'bootstrap_draft.sql'),
  'utf8',
)
  .replace(/^\s*begin;\s*$/im, '')
  .replace(/^\s*commit;\s*$/im, '')
const verificationSql = readFileSync(
  resolve(root, 'sql', 'tests', '20260820_bible_fillion_editorial_model_verification.sql'),
  'utf8',
)
const rollbackMarker = 'FILLION_EDITORIAL_DRY_RUN_ROLLBACK'
const sql = `${migration}
${verificationSql}
${bootstrap}
do $rollback$
begin
  raise exception '${rollbackMarker}';
end
$rollback$;`

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
}
const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ sql }),
})
const responseText = await response.text()
if (response.ok || !responseText.includes(rollbackMarker)) {
  throw new Error(
    `L'essai transactionnel n'a pas atteint son marqueur d'annulation `
    + `(HTTP ${response.status}) : ${responseText.slice(0, 1200)}`,
  )
}

const verification = await fetch(
  `${url}/rest/v1/bible_edition_families?select=id&limit=1`,
  { headers },
)
if (verification.status !== 404) {
  throw new Error(`La relation d'essai reste exposée après l'annulation (HTTP ${verification.status}).`)
}

const translationVerification = await fetch(
  `${url}/rest/v1/traductions?select=trad_id&trad_id=in.(TR0010,TR0011)`,
  { headers },
)
if (!translationVerification.ok) {
  throw new Error(`Contrôle REST des traductions impossible (HTTP ${translationVerification.status}).`)
}
const translations = await translationVerification.json()
if (translations.length !== 0) {
  throw new Error('TR0010 ou TR0011 subsiste après l’annulation transactionnelle.')
}

console.log('Migration Fillion acceptée par PostgreSQL puis intégralement annulée.')
console.log('Amorçage Fillion accepté puis annulé avec la migration.')
console.log('Contrôle REST postérieur : schéma absent et TR0010/TR0011 non créées.')
