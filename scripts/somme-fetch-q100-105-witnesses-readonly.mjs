import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const raw = JSON.parse(readFileSync('tmp/somme-liens-audit-2026-07-29/ss-q100-105-raw.json', 'utf8'));
const candidates = [
  'ACT.8.18','ACT.8.19','ACT.8.20','2KI.5.13','2KI.5.20','1SA.9.7','1KI.14.3',
  'GEN.23.8','GEN.23.11','GEN.23.16','GEN.25.31','EXO.20.12','2CO.12.14',
  'MAT.15.3','MAT.15.5','MAT.8.21','MAT.8.22','LUK.9.59','LUK.9.60','EXO.32.26','EXO.32.27',
  'HEB.13.7','HEB.13.17','1PE.2.17','REV.22.8','REV.22.9','TIT.3.1',
  'MAT.9.29','MAT.9.30','MAT.9.31','COL.3.20','COL.3.22','ACT.5.29',
  'MAT.17.2','MAT.17.26','1PE.2.13','1PE.2.14','1SA.15.22','1SA.15.23',
  'ROM.5.10','ROM.5.19','SIR.15.14','TOB.1.16'
];
const ids = [...new Set([...raw.links.map((link) => link.canon_id).filter(Boolean), ...candidates])];
const witnesses = [];
for (let index = 0; index < ids.length; index += 100) {
  const { data, error } = await sb.from('versets_lecture')
    .select('id_verset,ref,ordre,TR0001,TR0003,TR0004,num_TR0001,num_TR0003,num_TR0004')
    .in('id_verset', ids.slice(index, index + 100)).order('ordre');
  if (error) throw error;
  witnesses.push(...data);
}
writeFileSync('tmp/somme-liens-audit-2026-07-29/ss-q100-105-candidate-witnesses.json', `${JSON.stringify(witnesses, null, 2)}\n`);
const found = new Set(witnesses.map((witness) => witness.id_verset));
console.log(JSON.stringify({ requested: ids.length, found: witnesses.length, missing: ids.filter((id) => !found.has(id)) }, null, 2));
