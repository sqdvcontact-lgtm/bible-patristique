import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const raw = JSON.parse(readFileSync('tmp/somme-liens-audit-2026-07-29/ss-q136-141-raw.json', 'utf8'));
const candidates = [
  'PSA.61.5','PSA.61.6','PSA.62.5','PSA.62.6','SIR.5.4','MAT.5.6','MAT.16.23','1PE.5.8',
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
writeFileSync('tmp/somme-liens-audit-2026-07-29/ss-q136-141-candidate-witnesses.json', `${JSON.stringify(witnesses, null, 2)}\n`);
const found = new Set(witnesses.map((witness) => witness.id_verset));
console.log(JSON.stringify({ requested: ids.length, found: witnesses.length, missing: ids.filter((id) => !found.has(id)),
  psalm_candidates: witnesses.filter((witness) => candidates.slice(0, 4).includes(witness.id_verset)),
  additions: witnesses.filter((witness) => candidates.slice(4).includes(witness.id_verset)) }, null, 2));
