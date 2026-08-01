import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const source = JSON.parse(readFileSync(`${ROOT}/ss-q34-39-propositions.json`, 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const segments = await must(
  sb.from('segments').select('id,id_oeuvre,segment_numero,segment_texte,ref_niv1,ref_niv2,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
    .in('ref_niv2', Array.from({ length: 6 }, (_, i) => `Question ${i + 34}`)).order('segment_numero'),
  'segments',
);
const links = [];
for (let i = 0; i < segments.length; i += 100) {
  links.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 100).map((s) => s.id)).order('id'), `liens ${i}`));
}
links.sort((a, b) => a.id - b.id);
const canonIds = [...new Set(links.map((l) => l.canon_id).filter(Boolean))];
for (const candidate of ['ACT.23.7', '2KI.17.12']) if (!canonIds.includes(candidate)) canonIds.push(candidate);
const witnesses = [];
for (let i = 0; i < canonIds.length; i += 100) {
  witnesses.push(...await must(
    sb.from('versets_lecture').select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', canonIds.slice(i, i + 100)),
    `témoins ${i}`,
  ));
}
writeFileSync(`${ROOT}/ss-q34-39-quarantine-live.json`, `${JSON.stringify({
  exported_at: new Date().toISOString(), source_summary: source.summary, segments, links, witnesses,
}, null, 2)}\n`);
console.log(JSON.stringify({
  segments: segments.length,
  links: links.length,
  canon_targets: canonIds.length,
  witnesses: witnesses.length,
  marked_segments: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length,
  reliability: Object.fromEntries([...new Set(links.map((l) => l.fiabilite))].map((v) => [v, links.filter((l) => l.fiabilite === v).length])),
  arbitration: Object.fromEntries([...new Set(links.map((l) => String(l.arbitrage_requis)))].map((v) => [v, links.filter((l) => String(l.arbitrage_requis) === v).length])),
}, null, 2));
