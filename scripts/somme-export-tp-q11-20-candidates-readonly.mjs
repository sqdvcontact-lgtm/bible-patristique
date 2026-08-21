import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const ids = [
  'MAT.17.25', 'MAT.17.26', 'EXO.15.3', 'GEN.1.1', 'HEB.2.18',
  'ROM.5.12', 'JHN.20.27', 'ROM.5.2', '1PE.2.22', 'PHP.2.7',
  'MAL.3.6', 'ROM.1.3', 'JHN.1.14', 'PSA.115.3', 'PSA.113.11', 'LUK.22.44',
  'GAL.3.27', '1CO.2.8', 'MAT.9.6', 'PHP.2.8', 'EZK.14.20',
  'ROM.7.8', 'JHN.2.17', 'ZEC.3.9', 'ISA.11.2', 'LUK.2.52',
  'LUK.2.47', 'JHN.3.31', 'HOS.4.8', 'MAT.26.37', 'JHN.3.14',
  'JHN.14.28', 'MAT.19.17'
];
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.from('versets_lecture')
  .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
  .in('id_verset', ids).order('id_verset');
if (error) throw error;
writeFileSync(`${ROOT}/tp-q11-20-candidate-witnesses.json`, JSON.stringify(data, null, 2) + '\n');
const found = new Set(data.map(x => x.id_verset));
console.log(JSON.stringify({ requested: ids.length, found: data.length, missing: ids.filter(x => !found.has(x)) }, null, 2));
