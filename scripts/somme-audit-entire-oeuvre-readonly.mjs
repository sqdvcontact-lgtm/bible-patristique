import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const segments = [];
for (let from = 0; ; from += 500) {
  const page = await must(sb.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,nature,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', 'A0013O0002').order('segment_numero').range(from, from + 499), `segments ${from}`);
  segments.push(...page);
  if (page.length < 500) break;
}
const links = [];
for (let offset = 0; offset < segments.length; offset += 100) {
  const ids = segments.slice(offset, offset + 100).map((segment) => segment.id);
  for (let from = 0; ; from += 500) {
    const page = await must(sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 499), `liens ${offset}/${from}`);
    links.push(...page);
    if (page.length < 500) break;
  }
}
const fetchExisting = async (table, column, ids) => {
  const found = new Set();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const rows = await must(sb.from(table).select(column).in(column, ids.slice(offset, offset + 100)), `${table} ${offset}`);
    rows.forEach((row) => found.add(row[column]));
  }
  return found;
};
const canonIds = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const versetV2Ids = [...new Set(links.map((link) => link.verset_v2_id).filter(Boolean))];
const witnessedCanon = await fetchExisting('versets_lecture', 'id_verset', canonIds);
const witnessedV2 = await fetchExisting('versets_v2', 'id', versetV2Ids);
const chapterTargets = [...new Map(links.filter((link) => !link.canon_id && !link.verset_v2_id && link.livre && link.chapitre != null)
  .map((link) => [`${link.livre}.${link.chapitre}`, { livre: link.livre, chapitre: link.chapitre }])).values()];
const missingChapters = [];
for (const target of chapterTargets) {
  const rows = await must(sb.from('versets_canon').select('id').eq('livre', target.livre).eq('ch_canon', target.chapitre).limit(1), `chapitre ${target.livre}.${target.chapitre}`);
  if (!rows.length) missingChapters.push(`${target.livre}.${target.chapitre}`);
}
const targetKey = (link) => link.canon_id ? `c:${link.canon_id}` : link.verset_v2_id ? `v:${link.verset_v2_id}` : link.livre ? `h:${link.livre}:${link.chapitre}` : 'vide';
const seen = new Set();
const duplicateLinks = [];
for (const link of links) {
  const key = `${link.segment_id}|${link.type}|${targetKey(link)}`;
  if (seen.has(key)) duplicateLinks.push(link.id);
  seen.add(key);
}
const targetCount = (link) => [Boolean(link.canon_id), Boolean(link.verset_v2_id), Boolean(link.livre && link.chapitre != null)].filter(Boolean).length;
const missingNumbers = [];
for (let number = 1; number <= 32367; number += 1) {
  if (segments[number - 1]?.segment_numero !== number) missingNumbers.push(number);
}
const failures = {
  review_mark: segments.filter((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture').map((segment) => segment.segment_numero),
  state: links.filter((link) => link.provenance !== 'lecture'
    || (link.fiabilite === 'probable' && link.arbitrage_requis !== false)
    || (link.fiabilite === 'à constituer' && link.arbitrage_requis !== true)
    || !['probable', 'à constituer'].includes(link.fiabilite)).map((link) => link.id),
  motif: links.filter((link) => !link.motif?.trim()).map((link) => link.id),
  target: links.filter((link) => link.fiabilite === 'à constituer' ? targetCount(link) !== 0 : targetCount(link) === 0).map((link) => link.id),
  ambiguous_target: links.filter((link) => link.fiabilite === 'à constituer' ? targetCount(link) !== 0 : targetCount(link) !== 1).map((link) => link.id),
  dead_canon_witness: links.filter((link) => link.canon_id && !witnessedCanon.has(link.canon_id)).map((link) => link.id),
  dead_verset_v2: links.filter((link) => link.verset_v2_id && !witnessedV2.has(link.verset_v2_id)).map((link) => link.id),
  missing_chapters: missingChapters,
  duplicates: duplicateLinks,
  segment_number_gaps: missingNumbers,
};
const counts = Object.fromEntries(Object.entries(failures).map(([key, values]) => [key, values.length]));
const samples = Object.fromEntries(Object.entries(failures).filter(([, values]) => values.length).map(([key, values]) => [key, values.slice(0, 30)]));
const unreviewedGroups = Object.entries(segments.filter((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture')
  .reduce((groups, segment) => {
    const key = `${segment.ref_niv1 ?? '(vide)'} / ${segment.ref_niv2 ?? '(vide)'}`;
    groups[key] = [...(groups[key] ?? []), segment.segment_numero];
    return groups;
  }, {})).map(([scope, numbers]) => ({ scope, count: numbers.length, range: [Math.min(...numbers), Math.max(...numbers)] }));
const ok = Object.values(counts).every((count) => count === 0) && segments.length === 32367;
console.log(JSON.stringify({
  ok,
  oeuvre: 'A0013O0002',
  segments: segments.length,
  segment_range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length,
  type_counts: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  canon_targets: canonIds.length,
  verset_v2_targets: versetV2Ids.length,
  chapter_targets: chapterTargets,
  failure_counts: counts,
  failure_samples: samples,
  unreviewed_groups: unreviewedGroups,
}, null, 2));
if (!ok) process.exitCode = 1;
