// Essai transactionnel générique d'une migration : PostgreSQL exécute le DDL,
// les contrôles de cohérence passent dans la même transaction, puis une
// exception finale annule l'ensemble. Rien n'est laissé dans la base.
//
//   node scripts/fillion/dry-run-migration.mjs <migration.sql> [verification.sql]
//
// Le script ne remplace pas l'application réelle : il établit seulement que la
// migration est acceptée telle quelle par la base de production.

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

// Une migration jouée dans une transaction d'essai ne porte pas ses propres
// bornes : c'est le bloc d'annulation qui les remplace.
function sansBornes(sql) {
  return sql.replace(/^\s*begin;\s*$/im, '').replace(/^\s*commit;\s*$/im, '')
}

const root = resolve(import.meta.dirname, '..', '..')
const env = chargerEnv(resolve(root, '.env.local'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Configuration Supabase absente.')

const [migrationArg, verificationArg] = process.argv.slice(2)
if (!migrationArg) throw new Error('Chemin de migration attendu en premier argument.')

const migration = sansBornes(readFileSync(resolve(root, migrationArg), 'utf8'))
const verification = verificationArg
  ? readFileSync(resolve(root, verificationArg), 'utf8')
  : ''

const marqueur = 'MIGRATION_DRY_RUN_ROLLBACK'
const sql = `${migration}
${verification}
do $rollback$
begin
  raise exception '${marqueur}';
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
if (response.ok || !responseText.includes(marqueur)) {
  throw new Error(
    `L'essai transactionnel n'a pas atteint son marqueur d'annulation `
    + `(HTTP ${response.status}) : ${responseText.slice(0, 1200)}`,
  )
}

console.log(`Migration acceptée puis intégralement annulée : ${migrationArg}`)
if (verificationArg) console.log(`Contrôles passés dans la transaction : ${verificationArg}`)
