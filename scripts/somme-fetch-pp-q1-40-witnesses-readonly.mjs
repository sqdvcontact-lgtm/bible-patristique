import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const verseIds = ['1JN.5.7', 'ISA.9.5'];
const { data: verses, error: verseError } = await sb.from('versets_lecture')
  .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
  .in('id_verset', verseIds);
if (verseError) throw verseError;
const { data: special, error: specialError } = await sb.from('versets_v2').select('*')
  .eq('id', 'decc9cc4-624d-4955-aa9f-aa28ef87e996');
if (specialError) throw specialError;
const output = { verses, special };
writeFileSync(`${ROOT}/pp-q1-40-extra-witnesses.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ requested: verseIds.length, found: verses.length, special: special.length }, null, 2));
