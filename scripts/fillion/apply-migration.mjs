// Applique une migration par la fonction serveur `exec_sql`, puis l'inscrit au
// journal des migrations et joue ses contrôles.
//
//   node scripts/fillion/apply-migration.mjs <migration.sql> [verification.sql]
//
// ⚠️ L'inscription au journal n'est pas un détail. Une migration appliquée sans
// elle laisse le dépôt et la base raconter deux histoires : un `supabase db push`
// la rejouerait, et la plupart de nos migrations ne sont pas idempotentes.
// Passer par l'essai transactionnel avant d'appeler ce script :
//   node scripts/fillion/dry-run-migration.mjs <migration.sql> [verification.sql]

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

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

// `exec_sql` passe par EXECUTE, qui refuse les commandes de transaction. L'appel
// de fonction est déjà lui-même une transaction : retirer les bornes ne rend
// donc pas la migration partielle.
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

// Le nom de fichier porte la version et le nom : c'est lui qui fait foi au journal.
const nomFichier = basename(migrationArg, '.sql')
const decoupe = nomFichier.match(/^(\d{14})_(.+)$/)
if (!decoupe) throw new Error(`Nom de migration inattendu : ${nomFichier}`)
const [, version, nom] = decoupe

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
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

// `exec_sql` ne rend pas les lignes d'un `select` : la garde doit donc lever
// elle-même, côté base, plutôt que de s'en remettre à une réponse à lire.
await executerSql(
  `do $garde$
   begin
     if exists (
       select 1 from supabase_migrations.schema_migrations where version = '${version}'
     ) then
       raise exception 'La migration ${version} figure déjà au journal ; rien n''est rejoué.';
     end if;
   end
   $garde$;`,
  'Garde du journal',
)

await executerSql(sansBornes(readFileSync(resolve(root, migrationArg), 'utf8')), `Migration ${version}`)
await executerSql(
  `insert into supabase_migrations.schema_migrations (version, name)
   values ('${version}', '${nom}') on conflict (version) do nothing;`,
  'Inscription au journal',
)

if (verificationArg) {
  await executerSql(readFileSync(resolve(root, verificationArg), 'utf8'), 'Vérification')
}

console.log(`Migration appliquée et inscrite au journal : ${version} · ${nom}`)
if (verificationArg) console.log(`Contrôles postérieurs réussis : ${verificationArg}`)
