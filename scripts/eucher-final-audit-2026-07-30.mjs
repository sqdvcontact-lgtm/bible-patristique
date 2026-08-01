import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve('tmp/eucher-import-2026-07-30');
const WORK_ID = 'A0418O0003';
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'eucher-metadata-candidate.json'), 'utf8'));
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const columns = Object.keys(candidate[0]);
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const json = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const canonical = (rows) => rows.map((row) => Object.fromEntries(columns.map((key) => [key, row[key] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const [works, notices, segments] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', WORK_ID)
    .eq('id_traduction', metadata.catalogue_notice.id_traduction), 'notice'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero'), 'segments'),
]);
const actual = canonical(segments);
const expected = canonical(candidate);
const allText = actual.map((row) => row.segment_texte).join('\n');
const noteCalls = [...allText.matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]));
const noteDefinitions = actual.flatMap((row) => [...String(row.notes ?? '').matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1])));
const main = actual.filter((row) => row.nature !== 'apparat_critique');
const apparatus = actual.filter((row) => row.nature === 'apparat_critique');
const paragraphKeys = (rows) => new Set(rows.map((row) => `${row.ref_niv1 ?? ''}|${row.ref_niv2 ?? ''}|${row.ref_niv3 ?? ''}|${row.ref_niv4 ?? ''}|${row.paragraphe}`));
const rankErrors = [];
for (const rows of [main, apparatus]) {
  const groups = Map.groupBy(rows, (row) => `${row.ref_niv1 ?? ''}|${row.ref_niv2 ?? ''}|${row.ref_niv3 ?? ''}|${row.ref_niv4 ?? ''}|${row.paragraphe}`);
  for (const [key, group] of groups) {
    const ranks = group.map((row) => row.rang).sort((a, b) => a - b);
    if (ranks.some((rank, index) => rank !== index + 1)) rankErrors.push({ key, ranks });
  }
}
const ids = segments.map((row) => row.id);
let links = 0;
for (let i = 0; i < ids.length; i += 200) {
  links += (await must(db.from('liens_bibliques').select('id').in('segment_id', ids.slice(i, i + 200)), 'liens')).length;
}
const natureCounts = Object.fromEntries([...Map.groupBy(actual, (row) => row.nature)].map(([key, rows]) => [key, rows.length]));
const bodyLevels = [...new Set(main.map((row) => row.ref_niv1))];
const checks = {
  one_work: works.length === 1,
  one_notice: notices.length === 1,
  published: notices[0]?.presence_sur_le_site === true && Boolean(works[0]?.date_mise_en_ligne),
  public_note_installed: works[0]?.note === metadata.oeuvre_apres_publication.note,
  exact_candidate_reproduction: json(actual) === json(expected),
  segment_count_625: actual.length === 625,
  body_levels_1_to_60: json(bodyLevels) === json(Array.from({ length: 60 }, (_, index) => String(index + 1))),
  body_paragraphs_61: paragraphKeys(main).size === 61,
  apparatus_paragraphs_19: paragraphKeys(apparatus).size === 19,
  nature_counts_expected: natureCounts.texte === 533 && natureCounts.citation === 14 && natureCounts.apparat_critique === 78,
  ranks_contiguous: rankErrors.length === 0,
  note_calls_1_to_22: json([...new Set(noteCalls)].sort((a, b) => a - b)) === json(Array.from({ length: 22 }, (_, i) => i + 1)),
  note_definitions_1_to_22: json([...new Set(noteDefinitions)].sort((a, b) => a - b)) === json(Array.from({ length: 22 }, (_, i) => i + 1)),
  calls_before_punctuation_and_quotes: !/[.,;:!?…»]\[\[\d+\]\]/u.test(allText),
  title_page_excluded: !allText.includes('S. Eucher du mépris du monde'),
  colophon_excluded: !allText.includes(metadata.bibliographic_colophon),
  no_legacy_links: actual.every((row) => !row.lien_1 && !row.lien_2 && !row.lien_3 && !row.lien_4),
  links_not_reviewed: actual.every((row) => !row.liens_revus_le && !row.liens_revus_par),
  no_biblical_links: links === 0,
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = {
  audited_at: new Date().toISOString(),
  work_id: WORK_ID,
  notice_id: notices[0]?.id,
  notice_line: notices[0]?.id_ligne,
  candidate_sha256: sha(json(expected)),
  database_sha256: sha(json(actual)),
  structure: {
    segments: actual.length,
    body_levels: bodyLevels.length,
    body_paragraphs: paragraphKeys(main).size,
    apparatus_paragraphs: paragraphKeys(apparatus).size,
    notes: noteDefinitions.length,
    nature_counts: natureCounts,
    links,
  },
  checks,
  failed,
};
writeFileSync(resolve(ROOT, 'eucher-final-database-audit.json'), json(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
