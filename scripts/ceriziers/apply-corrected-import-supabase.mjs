import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const name of ['payload', 'out']) if (!values[name]) throw new Error(`Argument manquant : --${name}`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}
const options = args();
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
const bytes = fs.readFileSync(options.payload);
const payload = JSON.parse(bytes.toString('utf8'));
const payloadSha256 = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { 'X-Client-Info': 'codex-ceriziers-fine-correction/1.0' } },
});
const started = new Date().toISOString();
const { data, error } = await client.rpc('appliquer_correction_ceriziers_1646_alignement_fin', {
  p_payload: payload, p_payload_sha256: payloadSha256,
});
if (error) throw new Error(`Correction Supabase refusée : ${error.message}`);
const report = {
  status: 'PASS', started_at_utc: started, completed_at_utc: new Date().toISOString(),
  rpc_result: data, payload_file: path.basename(options.payload), payload_sha256: payloadSha256,
};
fs.mkdirSync(options.out, { recursive: true });
const name = data?.status === 'ALREADY_CORRECTED' ? 'resultat_idempotence.json' : 'resultat_correction_transactionnelle.json';
fs.writeFileSync(path.join(options.out, name), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
