import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const raw = JSON.parse(readFileSync('tmp/somme-liens-audit-2026-07-29/ss-q153-158-raw.json', 'utf8'));
const candidates = [
  'GEN.30.4','GEN.30.5','GEN.30.9','GEN.30.10','GEN.38.15','GEN.38.16','EXO.20.14','EXO.22.15','EXO.22.17','LEV.18.7','DEU.22.29','1KI.3.5',
  'SIR.3.17','SIR.3.19','SIR.5.10','SIR.5.11','SIR.5.12','SIR.5.13','SIR.10.12','SIR.18.31','SIR.23.22','SIR.23.23','SIR.26.15','SIR.42.11',
  'MAT.5.5','MAT.5.21','MAT.5.22','EPH.4.31','EPH.5.4','EPH.5.5','GAL.2.20','GAL.5.17','GAL.5.21',
];
const ids = [...new Set([...raw.links.map((link) => link.canon_id).filter(Boolean), ...candidates])], witnesses = [];
for (let index = 0; index < ids.length; index += 100) {
  const { data, error } = await sb.from('versets_lecture')
    .select('id_verset,ref,ordre,TR0001,TR0003,TR0004,num_TR0001,num_TR0003,num_TR0004')
    .in('id_verset', ids.slice(index, index + 100)).order('ordre');
  if (error) throw error; witnesses.push(...data);
}
writeFileSync('tmp/somme-liens-audit-2026-07-29/ss-q153-158-candidate-witnesses.json', `${JSON.stringify(witnesses, null, 2)}\n`);
const found = new Set(witnesses.map((witness) => witness.id_verset));
console.log(JSON.stringify({ requested: ids.length, found: witnesses.length, missing: ids.filter((id) => !found.has(id)),
  candidates: witnesses.filter((witness) => candidates.includes(witness.id_verset)) }, null, 2));
