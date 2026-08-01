import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const fromQ = Number(process.argv[2]);
const toQ = Number(process.argv[3]);
if (!Number.isInteger(fromQ) || !Number.isInteger(toQ) || fromQ > toQ) {
  throw new Error('Usage : node scripts/somme-audit-ss-range-readonly.mjs <question-début> <question-fin>');
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const questions = Array.from({ length: toQ - fromQ + 1 }, (_, index) => `Question ${fromQ + index}`);
const segments = [];
for (let from = 0; ; from += 500) {
  const page = await must(sb.from('segments').select('id,segment_numero,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').in('ref_niv2', questions)
    .order('segment_numero').range(from, from + 499), `segments ${from}`);
  segments.push(...page); if (page.length < 500) break;
}
const links = [];
for (let offset = 0; offset < segments.length; offset += 100) {
  const ids = segments.slice(offset, offset + 100).map((segment) => segment.id);
  for (let from = 0; ; from += 500) {
    const page = await must(sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 499), `liens ${offset}/${from}`);
    links.push(...page); if (page.length < 500) break;
  }
}
const canonIds = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const witnessed = new Set();
for (let offset = 0; offset < canonIds.length; offset += 100) {
  const rows = await must(sb.from('versets_lecture').select('id_verset').in('id_verset', canonIds.slice(offset, offset + 100)), `témoins ${offset}`);
  rows.forEach((row) => witnessed.add(row.id_verset));
}
const chapterTargets = [...new Map(links.filter((link) => !link.canon_id && link.livre && link.chapitre != null)
  .map((link) => [`${link.livre}.${link.chapitre}`, { livre: link.livre, chapitre: link.chapitre }])).values()];
const missingChapters = [];
for (const target of chapterTargets) {
  const rows = await must(sb.from('versets_canon').select('id').eq('livre', target.livre).eq('ch_canon', target.chapitre).limit(1), `chapitre ${target.livre}.${target.chapitre}`);
  if (!rows.length) missingChapters.push(`${target.livre}.${target.chapitre}`);
}
const targetKey = (link) => link.canon_id ? `c:${link.canon_id}` : link.verset_v2_id ? `v:${link.verset_v2_id}` : link.livre ? `h:${link.livre}:${link.chapitre}` : 'vide';
const keys = new Set();
const duplicates = [];
for (const link of links) { const key = `${link.segment_id}|${link.type}|${targetKey(link)}`; if (keys.has(key)) duplicates.push({ id: link.id, key }); keys.add(key); }
const failures = {
  review_mark: segments.filter((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture').map((segment) => segment.segment_numero),
  state: links.filter((link) => link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis !== false).map((link) => link.id),
  motif: links.filter((link) => !link.motif?.trim()).map((link) => link.id),
  target: links.filter((link) => !link.canon_id && !link.verset_v2_id && !(link.livre && link.chapitre != null)).map((link) => link.id),
  ambiguous_target: links.filter((link) => [Boolean(link.canon_id), Boolean(link.verset_v2_id), Boolean(link.livre || link.chapitre != null)].filter(Boolean).length !== 1).map((link) => link.id),
  dead_witness: links.filter((link) => link.canon_id && !witnessed.has(link.canon_id)).map((link) => link.id),
  missing_chapters: missingChapters,
  duplicates,
};
const ok = Object.values(failures).every((items) => items.length === 0);
console.log(JSON.stringify({ ok, scope: `Secunda Secundae, questions ${fromQ}–${toQ}`, segments: segments.length,
  range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero], links: links.length,
  type_counts: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  canon_targets: canonIds.length, chapter_targets: chapterTargets, failures }, null, 2));
if (!ok) process.exitCode = 1;
