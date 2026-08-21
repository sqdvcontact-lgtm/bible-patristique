import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function page(table, select, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    if (order) query = query.order(order);
    const { data, error } = await query;
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const oeuvres = await page('oeuvres', '*', 'id_oeuvre');
const segments = await page('segments', 'id,id_oeuvre,liens_revus_le,liens_revus_par', 'id');
const stats = new Map(oeuvres.map((o) => [o.id_oeuvre, { segments: 0, reviewed: 0, links: 0, types: {}, reliability: {}, provenance: {}, arbitration: 0 }]));
for (const segment of segments) {
  const stat = stats.get(segment.id_oeuvre) ?? { segments: 0, reviewed: 0, links: 0, types: {}, reliability: {}, provenance: {}, arbitration: 0 };
  stat.segments++;
  if (segment.liens_revus_le) stat.reviewed++;
  stats.set(segment.id_oeuvre, stat);
}
for (let offset = 0; offset < segments.length; offset += 250) {
  const batch = segments.slice(offset, offset + 250);
  const workBySegment = new Map(batch.map((segment) => [segment.id, segment.id_oeuvre]));
  const { data, error } = await db.from('liens_bibliques').select('segment_id,type,fiabilite,provenance,arbitrage_requis').in('segment_id', batch.map(({ id }) => id));
  if (error) throw error;
  for (const link of data) {
    const stat = stats.get(workBySegment.get(link.segment_id));
    stat.links++;
    stat.types[link.type] = (stat.types[link.type] ?? 0) + 1;
    stat.reliability[link.fiabilite ?? '∅'] = (stat.reliability[link.fiabilite ?? '∅'] ?? 0) + 1;
    stat.provenance[link.provenance ?? '∅'] = (stat.provenance[link.provenance ?? '∅'] ?? 0) + 1;
    if (link.arbitrage_requis) stat.arbitration++;
  }
}

console.log('OEUVRE_KEYS', Object.keys(oeuvres[0] ?? {}).join(','));
console.log(JSON.stringify(oeuvres.map((o) => ({ oeuvre: o, ...stats.get(o.id_oeuvre) })), null, 2));
