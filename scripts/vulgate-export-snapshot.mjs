// Export exhaustif et stable de TR0004 avant toute écriture en base.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const output = process.argv[2] ?? 'tmp/vulgate-preflight-2026-07-29/TR0004-before.json';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
  const i = line.indexOf('=');
  return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const rows = [];
for (let start = 0; ; start += 1000) {
  const { data, error } = await supabase.from('versets_v2').select('*').eq('trad_id', 'TR0004').order('id').range(start, start + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
const stable = rows.map(row => Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key]])));
const payload = `${JSON.stringify(stable, null, 2)}\n`;
writeFileSync(output, payload);
const sha256 = createHash('sha256').update(payload).digest('hex');
writeFileSync(`${output}.sha256`, `${sha256}  ${output.replaceAll('\\', '/')}\n`);
console.log(JSON.stringify({ rows: rows.length, bytes: Buffer.byteLength(payload), sha256, output }, null, 2));
