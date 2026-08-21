import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function chargerEnv(path) {
  const values = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return values
}

const root = resolve(import.meta.dirname, '..', '..')
const env = chargerEnv(resolve(root, '.env.local'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Configuration Supabase absente.')

const pilot = readFileSync(resolve(root, 'work', 'fillion', 'marc1_pilot_draft.sql'), 'utf8')
  .replace(/^\s*begin;\s*$/im, '')
  .replace(/^\s*commit;\s*$/im, '')
const marker = 'FILLION_MARC1_DRY_RUN_ROLLBACK'
const sql = `${pilot}
do $rollback$ begin raise exception '${marker}'; end $rollback$;`
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
const body = await response.text()
if (response.ok || !body.includes(marker)) {
  throw new Error(`L’essai transactionnel n’a pas atteint son annulation (HTTP ${response.status}) : ${body.slice(0, 1800)}`)
}

for (const [table, query] of [
  ['bible_text_sources', 'select=id&source_code=eq.fillion-t07-mrk-pilot'],
  ['bible_edition_assets', 'select=id&asset_key=eq.fillion-t07-p0202-i01'],
]) {
  const check = await fetch(`${url}/rest/v1/${table}?${query}`, { headers })
  if (!check.ok) throw new Error(`Contrôle ${table} impossible (HTTP ${check.status}).`)
  if ((await check.json()).length !== 0) throw new Error(`${table} subsiste après annulation.`)
}

console.log('Pilote Marc 1 accepté par PostgreSQL puis intégralement annulé.')
