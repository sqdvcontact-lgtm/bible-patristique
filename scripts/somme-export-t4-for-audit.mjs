import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const offset = Number(process.argv[2] ?? 0);
const limit = Number(process.argv[3] ?? 45);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function all(table, select, order) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    if (table === 'segments') query = query.eq('id_oeuvre', 'A0013O0002');
    if (order) query = query.order(order);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const segments = await all('segments', 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3', 'segment_numero');
const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
const links = (await all('liens_bibliques', '*', 'id'))
  .filter((link) => link.type === 4 && segmentById.has(link.segment_id))
  .map((link) => ({ ...link, segment: segmentById.get(link.segment_id) }))
  .sort((a, b) => a.segment.segment_numero - b.segment.segment_numero || a.id - b.id);

for (const [index, link] of links.slice(offset, offset + limit).entries()) {
  const segment = link.segment;
  console.log(`\n[${offset + index + 1}] ${link.id}|#${segment.segment_numero}|${segment.ref_niv1}/${segment.ref_niv2}/${segment.ref_niv3}|${link.canon_id ?? `${link.livre}.${link.chapitre}`}\n${segment.segment_texte}`);
}
console.log(`TOTAL ${links.length}`);
