import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve('tmp/eucher-import-2026-07-30');
const NOTICE_ID = 2982;
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-metadata-candidate.json'), 'utf8'));
const expected = candidate.catalogue_notice.niveau_verification;
const oldHash = '59AECCA3C1FAE633FB87BF51A5F6B27FEAE760F6343EEEF3700574C4F1DC3F27';
const newHash = '53D61F41DD610C77875D300F81E0B50E5DE460E133AC215A49776330F706A279';
if (!expected.includes(newHash) || expected.includes(oldHash)) throw new Error('Métadonnée candidate inattendue.');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const fetchNotice = async () => {
  const { data, error } = await db.from('catalogue_notices').select('*').eq('id', NOTICE_ID);
  if (error) throw new Error(error.message);
  if (data.length !== 1) throw new Error('Notice Eucher absente ou dupliquée.');
  return data[0];
};
const before = await fetchNotice();
if (!before.niveau_verification.includes(oldHash)) throw new Error('Empreinte antérieure inattendue dans la notice.');
const snapshot = resolve(ROOT, 'eucher-notice-before-source-hash-update.json');
const body = `${JSON.stringify(before, null, 2)}\n`;
writeFileSync(snapshot, body, 'utf8');
writeFileSync(`${snapshot}.sha256`, `${createHash('sha256').update(body).digest('hex').toUpperCase()}  eucher-notice-before-source-hash-update.json\n`, 'utf8');
const { data, error } = await db.from('catalogue_notices').update({ niveau_verification: expected })
  .eq('id', NOTICE_ID).eq('id_oeuvre_stable', 'A0418O0003').eq('niveau_verification', before.niveau_verification).select('*');
if (error) throw new Error(error.message);
if (data.length !== 1) throw new Error('Mise à jour de notice non appliquée exactement une fois.');
const after = await fetchNotice();
if (after.niveau_verification !== expected) throw new Error('Relecture de la notice différente du candidat.');
console.log(JSON.stringify({ updated: true, notice_id: NOTICE_ID, work_id: after.id_oeuvre_stable, source_hash_updated: true, snapshot }, null, 2));
