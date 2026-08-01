import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const patterns = [
  'utilitas in sanguine', 'cognovisti sessionem', 'miserere mei et resuscita',
  'ascendit Deus in jubilo', 'Dominus in templo sancto', 'Ascendisti in altum',
  'delectationes in dextera', 'profundissimum inferni', 'causa tua quasi impii',
  'videbar quidem vobiscum', 'subito pauperem', 'in partes inferiores terrae'
  , 'facile est in oculis Dei', 'suscita me', 'facile est coram Deo'
];
for (const pattern of patterns) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset,ref,"num_TR0004","TR0004"').ilike('TR0004', `%${pattern}%`).limit(30);
  if (error) throw error;
  console.log(`\n## ${pattern}\n${JSON.stringify(data, null, 2)}`);
}
const { data: sample, error: sampleError } = await sb.from('versets_v2').select('*').limit(1);
console.log(`\n## v2 sample\n${sampleError ? JSON.stringify(sampleError) : JSON.stringify(sample, null, 2)}`);
for (const [livre, ch, v] of [['SIR',24,45],['JOB',17,16],['JOB',36,17],['TOB',12,19],['SIR',11,22]]) {
  const { data, error } = await sb.from('versets_v2').select('*').eq('trad_id', 'TR0004').eq('livre', livre).eq('ch_orig', ch).eq('v_orig', v).limit(30);
  console.log(`\n## v2 ${livre} ${ch}.${v}\n${error ? JSON.stringify(error) : JSON.stringify(data, null, 2)}`);
}
const { data: sir11, error: sir11Error } = await sb.from('versets_v2').select('id,livre,ch_orig,v_orig,texte,canon_id').eq('trad_id','TR0004').eq('livre','SIR').eq('ch_orig',11).order('v_orig');
console.log(`\n## v2 SIR 11 all\n${sir11Error ? JSON.stringify(sir11Error) : JSON.stringify(sir11, null, 2)}`);
