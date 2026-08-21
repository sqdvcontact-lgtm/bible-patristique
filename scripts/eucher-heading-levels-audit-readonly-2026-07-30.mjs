import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve('tmp/eucher-import-2026-07-30');
const WORK_ID = 'A0418O0003';
const APPARATUS_LEVELS = new Set([
  'Abrégé de la vie de saint Eucher',
  'Avertissement',
  'Approbation des docteurs',
  'Extrait du privilège du Roy',
]);
const expected = Array.from({ length: 60 }, (_, index) => String(index + 1));
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
};
const [workRows, segments, rpcRows] = await Promise.all([
  must(db.from('oeuvres').select('id_oeuvre,titre,niveaux_sommaire,profondeur_sommaire,niveaux_corps').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('segments').select('segment_numero,ref_niv1,paragraphe,rang,nature').eq('id_oeuvre', WORK_ID).order('segment_numero').range(0, 999), 'segments'),
  must(db.rpc('get_niv1_list', { p_id_oeuvre: WORK_ID }), 'get_niv1_list'),
]);
const body = segments.filter((row) => row.nature === 'texte' || row.nature === 'citation');
const bodyLevels = [...new Set(body.map((row) => row.ref_niv1))];
const rpcAll = rpcRows.map((row) => row.ref_niv1).filter(Boolean);
const rpcText = rpcAll.filter((level) => !APPARATUS_LEVELS.has(level));
const paragraphKeys = new Set(body.map((row) => `${row.ref_niv1}|${row.paragraphe}`));
const rankErrors = [];
for (const [key, rows] of Map.groupBy(body, (row) => `${row.ref_niv1}|${row.paragraphe}`)) {
  const ranks = rows.map((row) => row.rang).sort((a, b) => a - b);
  if (ranks.some((rank, index) => rank !== index + 1)) rankErrors.push({ key, ranks });
}
const checks = {
  one_work: workRows.length === 1,
  body_segments_547: body.length === 547,
  body_levels_1_to_60: JSON.stringify(bodyLevels) === JSON.stringify(expected),
  rpc_returns_all_64_levels: rpcAll.length === 64,
  page_filter_yields_60_text_levels: JSON.stringify(rpcText) === JSON.stringify(expected),
  body_paragraphs_61: paragraphKeys.size === 61,
  article_57_has_two_paragraphs: JSON.stringify([...new Set(body.filter((row) => row.ref_niv1 === '57').map((row) => row.paragraphe))]) === JSON.stringify([1, 2]),
  ranks_contiguous_by_level_and_paragraph: rankErrors.length === 0,
  display_depths_enabled: workRows[0]?.niveaux_sommaire === 1 && workRows[0]?.profondeur_sommaire === 1 && workRows[0]?.niveaux_corps === 1,
  candidate_has_same_levels: JSON.stringify([...new Set(candidate.filter((row) => row.nature === 'texte' || row.nature === 'citation').map((row) => row.ref_niv1))]) === JSON.stringify(expected),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = { audited_at: new Date().toISOString(), work_id: WORK_ID, checks, failed, rpc_all_levels: rpcAll, page_text_levels: rpcText, body_paragraphs: paragraphKeys.size, rank_errors: rankErrors };
writeFileSync(resolve(ROOT, 'eucher-heading-levels-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
