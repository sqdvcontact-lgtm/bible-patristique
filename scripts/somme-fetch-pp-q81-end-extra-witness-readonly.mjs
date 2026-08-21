import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = ['MAT.17.14', 'PSA.90.11'];
const { data, error } = await sb.from('versets_lecture')
  .select('id_verset,ref,num_TR0001,TR0001,num_TR0003,TR0003,num_TR0004,TR0004,ordre')
  .in('id_verset', ids).order('ordre');
if (error) throw error;
if (data.length !== ids.length) throw new Error(`Témoins incomplets: ${data.length}/${ids.length}`);
writeFileSync('tmp/somme-liens-audit-2026-07-29/pp-q81-end-extra-witnesses.json', `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify(data, null, 2));
