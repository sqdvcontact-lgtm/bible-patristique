import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const index = line.indexOf('=');
  if (index < 1) continue;
  const key = line.slice(0, index).trim();
  let value = line.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  if (!(key in process.env)) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Configuration Supabase de service absente.');

const work = path.join(root, 'work', 'boece', 'ceriziers_1646_segmentation_alignement');
const payloadPath = path.join(work, '02_DONNEES', 'ceriziers_import_payload.json');
const payloadBytes = fs.readFileSync(payloadPath);
const payloadSha256 = crypto.createHash('sha256').update(payloadBytes).digest('hex').toUpperCase();
const payload = JSON.parse(payloadBytes.toString('utf8'));
const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { 'X-Client-Info': 'codex-ceriziers-private-import/1.0' } },
});

const startedAt = new Date().toISOString();
const { data, error } = await client.rpc('importer_ceriziers_1646_prive', {
  p_payload: payload,
  p_payload_sha256: payloadSha256,
});
if (error) throw new Error(`Import Supabase refuse: ${error.message}`);

const report = {
  status: 'PASS',
  started_at_utc: startedAt,
  completed_at_utc: new Date().toISOString(),
  rpc_result: data,
  payload_path: '02_DONNEES/ceriziers_import_payload.json',
  payload_sha256: payloadSha256,
};
const reportName = data?.status === 'ALREADY_IMPORTED'
  ? 'resultat_test_idempotence.json'
  : 'resultat_import_transactionnel.json';
const out = path.join(work, '02_PREUVES', '05_IMPORT_SUPABASE', reportName);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
