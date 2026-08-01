import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const R = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(R, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = [...new Set([
  'MAT.26.12','WIS.2.20','JHN.19.40','JHN.19.41','MAT.27.60','GEN.3.19','PSA.29.10','1PE.3.19','JOB.17.16','1PE.3.20','SIR.11.21','GEN.2.17','GEN.3.3','JHN.8.56','ZEC.9.11','LUK.16.24','ROM.5.15','PSA.138.2','ROM.6.9','MAT.27.52','MAT.27.53','ACT.2.29','ACT.2.31','PSA.40.11','LUK.24.39','1CO.15.50','JHN.20.27','1TI.2.12','GEN.3.6','JHN.20.18','MRK.16.6','1CO.15.7','MAT.26.32','MAT.28.7','MAT.28.10','2CO.6.15','JHN.3.13','TOB.12.19','MAT.28.9','JHN.20.17','MAT.28.2','MRK.16.5','JHN.20.12','LUK.24.4','1CO.15.44','1CO.15.52','ROM.13.1','ACT.1.3','JHN.20.29','LUK.24.27','MRK.16.19','ACT.9.3','SIR.7.6','JHN.5.22','DAN.7.13','DAN.7.14','HEB.4.16','JOB.36.17','REV.3.21','ROM.11.6','LUK.12.13','LUK.12.14','MAT.25.34','MAT.25.41','LUK.23.43','LUK.16.23','SIR.30.4','GEN.28.22',
  ...Array.from({length:17},(_,i)=>`EXO.20.${i+1}`)
])];
const cols = 'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"';
const witnesses = [];
for (let from=0; from<ids.length; from+=100) {
  const { data, error } = await sb.from('versets_lecture').select(cols).in('id_verset', ids.slice(from, from+100));
  if (error) throw error;
  witnesses.push(...data);
}
const { data: special, error: specialError } = await sb.from('versets_v2').select('*').eq('id','23602da4-340f-4e00-98bf-a7c666ef83c9').single();
if (specialError) throw specialError;
const got = new Set(witnesses.map(x=>x.id_verset)), missing = ids.filter(x=>!got.has(x));
if (missing.length) throw Error(`cibles mortes: ${missing.join(',')}`);
const out = { exported_at:new Date().toISOString(), requested:ids.length, witnesses, special_v2:[special] };
writeFileSync(`${R}/tp-q51-60-candidate-witnesses.json`, JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({requested:ids.length,witnesses:witnesses.length,special_v2:1,missing},null,2));
