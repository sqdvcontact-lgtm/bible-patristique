import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(ROOT, { recursive: true });
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q15-21-raw.json`, 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = ['JDT.9.17+', 'JOB.42.13', 'EXO.20.1', 'MAT.5.1', 'MAT.6.1'];
const out = [];
for (let i = 0; i < ids.length; i += 100) {
  const { data, error } = await db.from('versets_lecture')
    .select('id_verset,ref,num_TR0001,TR0001,num_TR0003,TR0003,num_TR0004,TR0004')
    .in('id_verset', ids.slice(i, i + 100));
  if (error) throw error;
  out.push(...data);
}
writeFileSync(`${ROOT}/ss-q15-21-candidate-witnesses.json`, JSON.stringify(out, null, 2) + '\n');
const { data: v2, error: v2Error } = await db.from('versets_v2').select('*')
  .eq('id', '9b08b917-7502-4fd8-a281-68978988c317').single();
if (v2Error) throw v2Error;
writeFileSync(`${ROOT}/ss-q15-21-jdt9-17-v2.json`, JSON.stringify(v2, null, 2) + '\n');
console.log(JSON.stringify({ ids: ids.length, witnesses: out.length, missing: ids.filter(id => !out.some(w => w.id_verset === id)), verset_v2: { id: v2.id, trad_id: v2.trad_id, canon_id: v2.canon_id, alignement_verifie: v2.alignement_verifie } }, null, 2));
