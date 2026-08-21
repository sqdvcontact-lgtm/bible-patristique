import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const questions = Array.from({ length: 6 }, (_, index) => `Question ${171 + index}`), segments = [], pagination = [];
for (let from = 0; ; from += 100) {
  const { data, error } = await sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002')
    .eq('ref_niv1', 'Secunda Secundae').in('ref_niv2', questions).order('segment_numero').range(from, from + 99);
  if (error) throw error;
  pagination.push({ objet: 'segments', range: [from, from + 99], lignes: data.length,
    segment_numero: data.length ? [data[0].segment_numero, data.at(-1).segment_numero] : null });
  segments.push(...data); if (data.length < 100) break;
}
const links = [];
for (let offset = 0; offset < segments.length; offset += 100) {
  const ids = segments.slice(offset, offset + 100).map((segment) => segment.id);
  for (let from = 0; ; from += 100) {
    const { data, error } = await sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 99);
    if (error) throw error;
    pagination.push({ objet: 'liens_bibliques', lot_segments: [offset, offset + ids.length - 1], range: [from, from + 99], lignes: data.length });
    links.push(...data); if (data.length < 100) break;
  }
}
links.sort((a, b) => a.id - b.id);
const targetIds = [...new Set(links.map((link) => link.canon_id).filter(Boolean))], witnesses = [];
for (let from = 0; from < targetIds.length; from += 100) {
  const { data, error } = await sb.from('versets_lecture').select('*').in('id_verset', targetIds.slice(from, from + 100)).order('ordre');
  if (error) throw error; witnesses.push(...data);
}
const output = { exported_at: new Date().toISOString(), questions, pagination, segments, links, witnesses };
writeFileSync('tmp/somme-liens-audit-2026-07-29/ss-q171-176-raw.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ segments: segments.length, range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length, marked: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  by_question: Object.fromEntries(questions.map((question) => [question, segments.filter((segment) => segment.ref_niv2 === question).length])), pagination }, null, 2));
