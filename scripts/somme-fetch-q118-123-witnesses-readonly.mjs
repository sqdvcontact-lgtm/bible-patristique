import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const raw = JSON.parse(readFileSync('tmp/somme-liens-audit-2026-07-29/ss-q118-123-raw.json', 'utf8'));
const candidates = [
  '1CO.6.8','1CO.6.18','EPH.5.5','PRO.6.30','PRO.6.31','PRO.6.32','MRK.5.15',
  'ECC.10.19','SIR.42.23','SIR.10.9','SIR.14.5','MAT.19.21','1TI.6.10','1TI.6.17',
  'ISA.11.2','ROM.8.15','WIS.5.5','MAT.5.4','MAT.5.5','MAT.5.6','MAT.5.7',
  'EXO.20.3','EXO.20.4','EXO.20.5','EXO.20.7','EXO.20.8','EXO.20.10','EXO.20.11','EXO.20.12','EXO.20.13','EXO.20.17',
  'DEU.5.11','1MA.2.41','MAT.12.1','WIS.6.20','WIS.6.21','JAS.4.1','2MA.6.30'
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
writeFileSync('tmp/somme-liens-audit-2026-07-29/ss-q118-123-candidate-witnesses.json', `${JSON.stringify(witnesses, null, 2)}\n`);
const found = new Set(witnesses.map((witness) => witness.id_verset));
console.log(JSON.stringify({ requested: ids.length, found: witnesses.length, missing: ids.filter((id) => !found.has(id)) }, null, 2));
