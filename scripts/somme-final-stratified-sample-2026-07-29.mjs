import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const segments = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await db.from('segments').select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3')
    .eq('id_oeuvre', 'A0013O0002').order('segment_numero').range(from, from + 499);
  if (error) throw error;
  segments.push(...data);
  if (data.length < 500) break;
}
const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
const links = [];
for (let offset = 0; offset < segments.length; offset += 250) {
  const { data, error } = await db.from('liens_bibliques').select('id,segment_id,canon_id,type,fiabilite,motif')
    .in('segment_id', segments.slice(offset, offset + 250).map(({ id }) => id)).order('id');
  if (error) throw error;
  links.push(...data);
}
const score = (id) => ((BigInt(id) * 1103515245n + 20260729n) % 2147483647n);
for (const type of [1, 2, 3, 4]) {
  const sample = links.filter((link) => link.type === type)
    .sort((a, b) => score(a.id) < score(b.id) ? -1 : 1).slice(0, 8);
  for (const link of sample) {
    const segment = segmentById.get(link.segment_id);
    console.log(`\nT${type}|${link.id}|#${segment.segment_numero}|${segment.ref_niv1}/${segment.ref_niv2}/${segment.ref_niv3}|${link.canon_id}\n${segment.segment_texte}`);
  }
}
console.log(`\nSAMPLE 32 / TOTAL ${links.length}`);
