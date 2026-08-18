// SCRIPT DE RETOUR ARRIÈRE — NE PAS EXÉCUTER SANS DÉCISION EXPLICITE.
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const name of ['snapshot', 'correction-sha', 'out']) if (!values[name]) throw new Error(`Argument manquant : --${name}`);
  return {
    snapshot: path.resolve(values.snapshot), correctionSha: values['correction-sha'], out: path.resolve(values.out),
  };
}
const options = args();
if (!/^[0-9A-Fa-f]{64}$/u.test(options.correctionSha)) throw new Error('Empreinte de correction invalide.');
const repo = path.resolve(import.meta.dirname, '..', '..');
const envFile = process.env.CERIZIERS_ENV_FILE ? path.resolve(process.env.CERIZIERS_ENV_FILE) : path.join(repo, '.env.local');
for (const raw of (fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').split(/\r?\n/u)) {
  const match = raw.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
  if (!match || process.env[match[1]] !== undefined) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  process.env[match[1]] = value;
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Configurer NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY, ou CERIZIERS_ENV_FILE.');
}
const snapshot = JSON.parse(fs.readFileSync(options.snapshot, 'utf8'));
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const started = new Date().toISOString();
const { data, error } = await client.rpc('restaurer_ceriziers_1646_avant_correction', {
  p_snapshot: snapshot, p_expected_correction_sha256: options.correctionSha,
});
if (error) throw new Error(`Retour arrière refusé : ${error.message}`);
const report = { status: 'PASS', started_at_utc: started, completed_at_utc: new Date().toISOString(), rpc_result: data };
fs.mkdirSync(options.out, { recursive: true });
fs.writeFileSync(path.join(options.out, 'resultat_retour_arriere.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
