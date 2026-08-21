import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(ROOT, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const questions = Array.from({ length: 18 }, (_, i) => `Question ${i + 22}`);
const segments = [];
for (const question of questions) {
  segments.push(...await must(
    sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
      .eq('ref_niv2', question).order('segment_numero'),
    `segments ${question}`,
  ));
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);
const ids = segments.map((s) => s.id);
const links = [];
for (let i = 0; i < ids.length; i += 100) {
  links.push(...await must(
    sb.from('liens_bibliques').select('*').in('segment_id', ids.slice(i, i + 100))
      .eq('type', 4).eq('fiabilite', 'vérifié').order('id'),
    `liens ${i}`,
  ));
}
links.sort((a, b) => a.id - b.id);
const canonIds = [...new Set(links.map((l) => l.canon_id).filter(Boolean))];
const witnessIds = [...new Set([...canonIds, 'EXO.20.1', 'EXO.20.2', 'EXO.20.17'])];
const witnesses = witnessIds.length ? await must(
  sb.from('versets_lecture').select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', witnessIds),
  'témoins',
) : [];
const affectedSegmentIds = [...new Set(links.map((l) => l.segment_id))];
const allLinksOnAffectedSegments = affectedSegmentIds.length ? await must(
  sb.from('liens_bibliques').select('*').in('segment_id', affectedSegmentIds).order('id'),
  'tous liens des segments concernés',
) : [];
const output = { exported_at: new Date().toISOString(), questions, segments, links, witnesses, all_links_on_affected_segments: allLinksOnAffectedSegments };
writeFileSync(`${ROOT}/SS-Q22-39-TYPE4-LIVE.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ segments: segments.length, type4_verifies: links.length, targets: canonIds.length, witnesses: witnesses.length, all_links_on_affected_segments: allLinksOnAffectedSegments.length }, null, 2));
