import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0017O0001';
const AVANT = 'Dixième homélie (apocryphe)';
const APRES = 'Dixième homélie (attribution discutée)';
const DRY = process.argv.includes('--dry');

const { count: avant, error: countError } = await db.from('segments')
  .select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).eq('ref_niv1', AVANT);
if (countError) throw countError;
if (avant !== 261) throw new Error(`Garde dixième homélie : 261 segments attendus, ${avant} trouvés`);
console.log(JSON.stringify({ dry: DRY, avant, de: AVANT, vers: APRES }, null, 2));
if (DRY) process.exit(0);

const { error: updateError } = await db.from('segments').update({ ref_niv1: APRES })
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', AVANT);
if (updateError) throw updateError;
const [{ count: restants, error: restError }, { count: apres, error: afterError }] = await Promise.all([
  db.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).eq('ref_niv1', AVANT),
  db.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).eq('ref_niv1', APRES),
]);
if (restError) throw restError;
if (afterError) throw afterError;
if (restants !== 0 || apres !== 261) throw new Error(`Post-contrôle dixième homélie : ${restants}/${apres}`);
console.log(JSON.stringify({ ok: true, restants, apres }, null, 2));
