// Préflight strict et intégralement en lecture seule du bundle Vulgate TR0004.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const bundleDir = process.argv[2] ?? 'tmp/vulgate-preflight-2026-07-29/bundle';
const reportPath = process.argv[3] ?? 'tmp/vulgate-preflight-2026-07-29/preflight-report.json';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
  const i = line.indexOf('=');
  return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const json = name => JSON.parse(readFileSync(`${bundleDir}/${name}`, 'utf8'));
const manifest = json('vulgate_master_manifest_2026-07-28.json');
const round1 = json('vulgate_actions_confirmed_2026-07-28.json');
const round2 = json('vulgate_actions_confirmed_round2_2026-07-28.json');
const round3 = json('vulgate_actions_confirmed_round3_tobit_judith_2026-07-28.json');
const round4 = json('vulgate_actions_confirmed_round4_sirach_2026-07-28.json');
const round5a = json('vulgate_actions_round5a_psalm_titles_2026-07-28.json');
const round5b = json('vulgate_actions_round5b_psalm_body_2026-07-28.json');

const report = { generated_at: new Date().toISOString(), mode: 'read_only', bundle_dir: bundleDir, checks: [], errors: [], warnings: [] };
const check = (name, actual, expected, severity = 'error') => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  report.checks.push({ name, ok, actual, expected, severity });
  if (!ok) report[severity === 'warning' ? 'warnings' : 'errors'].push(name);
};

for (const [name, expected] of Object.entries(manifest.package_hashes_sha256)) {
  const actual = createHash('sha256').update(readFileSync(`${bundleDir}/${name}`)).digest('hex');
  check(`sha256:${name}`, actual, expected);
}

const rows = [];
for (let start = 0; ; start += 1000) {
  const { data, error } = await supabase.from('versets_v2').select('*').eq('trad_id', 'TR0004').order('id').range(start, start + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
const byId = new Map(rows.map(row => [row.id, row]));
const refKey = row => `${row.livre}|${row.ch_orig}|${row.v_orig}`;
const refCounts = new Map();
for (const row of rows) refCounts.set(refKey(row), (refCounts.get(refKey(row)) ?? 0) + 1);
const generic = round1.generic_note_cleanup.where.note_structure_exact;
const pre = {
  rows: rows.length,
  canonical_rows: rows.filter(row => row.canon_id != null).length,
  null_canon_rows: rows.filter(row => row.canon_id == null).length,
  canon_id_fin_rows: rows.filter(row => row.canon_id_fin != null).length,
  verified_rows: rows.filter(row => row.alignement_verifie === true).length,
  subscription_rows: rows.filter(row => row.est_suscription === true).length,
  original_reference_groups: refCounts.size,
  legacy_multirow_reference_groups: [...refCounts.values()].filter(count => count > 1).length,
  false_generic_surnumerary_notes_on_canonical_rows: rows.filter(row => row.canon_id != null && row.note_structure === generic).length,
};
for (const [key, expected] of Object.entries(manifest.pre_state)) check(`pre_state:${key}`, pre[key], expected);
check('trad_id unique', [...new Set(rows.map(row => row.trad_id))], ['TR0004']);

const markerChecks = [];
const addMarker = (source, actionId, uuid, marker, expectedCanon) => {
  const row = byId.get(uuid);
  const count = row ? row.texte.split(marker).length - 1 : 0;
  markerChecks.push({ source, action_id: actionId, uuid, marker, row_found: Boolean(row), marker_count: count, current_canon: row?.canon_id ?? null, expected_canon: expectedCanon ?? null });
};
for (const action of round1.split_actions) addMarker('round1', action.action_id, action.existing_uuid, action.split_marker, action.current_canon);
for (const action of round2.split_actions) addMarker('round2', action.action_id, action.existing_uuid, action.split_marker, action.current_canon);
for (const action of round4.operations.binary_splits) addMarker('round4', action.action_id, action.existing_uuid, action.split_marker, null);
for (const marker of round4.operations.ternary_split.split_markers) addMarker('round4', round4.operations.ternary_split.action_id, round4.operations.ternary_split.existing_uuid, marker, null);
for (const action of round5b.operations.addition_splits) for (const marker of action.split_markers) addMarker('round5b', action.action_id, action.existing_uuid, marker, action.current_canon);
check('marker count', markerChecks.length, manifest.marker_validation.markers_checked);
check('markers unique and rows present', markerChecks.filter(item => !item.row_found || item.marker_count !== 1).length, 0);
check('markers current canon where specified', markerChecks.filter(item => item.row_found && item.expected_canon && item.current_canon !== item.expected_canon).length, 0);

const expectedRows = [];
const addExpected = (source, actionId, uuid, canon) => expectedRows.push({ source, action_id: actionId, uuid, expected_canon: canon });
for (const action of round1.split_actions) addExpected('round1 split', action.action_id, action.existing_uuid, action.current_canon);
for (const action of round1.remap_actions) addExpected('round1 remap', action.action_id, action.existing_uuid, action.current_canon);
for (const action of round2.split_actions) addExpected('round2 split', action.action_id, action.existing_uuid, action.current_canon);
for (const action of round2.remap_actions) addExpected('round2 remap', action.action_id, action.existing_uuid, action.current_canon);
for (const layer of round3.proof_layers) for (const item of layer.items ?? []) addExpected('round3 manual', item.source_ref, item.uuid, item.canon_id);
for (const action of round4.operations.direct_remaps) addExpected('round4 remap', action.action_id, action.existing_uuid, action.current_canon);
for (const action of round4.operations.binary_splits) addExpected('round4 split', action.action_id, action.existing_uuid, null);
addExpected('round4 split', round4.operations.ternary_split.action_id, round4.operations.ternary_split.existing_uuid, null);
for (const action of round4.operations.surnumerary_note_updates) addExpected('round4 note', action.source_ref, action.uuid, action.after_canon_id);
for (const action of round5b.operations.addition_splits) addExpected('round5b split', action.action_id, action.existing_uuid, action.current_canon);
const missingExpected = expectedRows.filter(item => !byId.has(item.uuid));
const wrongCanon = expectedRows.filter(item => item.expected_canon != null && byId.has(item.uuid) && byId.get(item.uuid).canon_id !== item.expected_canon);
check('all action UUIDs present', missingExpected.length, 0);
check('all specified current canon_id values match', wrongCanon.length, 0);

for (const action of round2.split_actions.filter(action => action.original_text)) check(`round2 original text:${action.action_id}`, byId.get(action.existing_uuid)?.texte, action.original_text);
for (const action of round5b.operations.addition_splits.filter(action => action.original_text)) {
  const actual = byId.get(action.existing_uuid)?.texte;
  const normalizedActual = String(actual ?? '').replaceAll('\u00a0', ' ');
  const normalizedExpected = String(action.original_text).replaceAll('\u00a0', ' ');
  check(`round5b normalized original text:${action.action_id}`, normalizedActual, normalizedExpected);
  check(`round5b raw original text typography:${action.action_id}`, actual, action.original_text, normalizedActual === normalizedExpected ? 'warning' : 'error');
}

check('PSA current rows', rows.filter(row => row.livre === 'PSA').length, 2527);
check('SIR current rows', rows.filter(row => row.livre === 'SIR').length, 1599);
check('TOB current rows', rows.filter(row => row.livre === 'TOB').length, 298);
check('JDT current rows', rows.filter(row => row.livre === 'JDT').length, 346);
check('round5A single title candidates', rows.filter(row => row.livre === 'PSA' && row.v_orig === 1 && round5a.inventory.title_only_single_row_psalms?.includes(row.ch_orig)).length, 62);

const { data: sourceRows, error: sourceError } = await supabase.from('editions_sources').select('*').eq('trad_id', 'TR0004');
if (sourceError) throw sourceError;
check('one editions_sources row', sourceRows.length, 1);
report.pre_state = pre;
report.schema_columns = rows[0] ? Object.keys(rows[0]).sort() : [];
report.marker_checks = markerChecks;
report.expected_row_checks = expectedRows.map(item => ({ ...item, found: byId.has(item.uuid), actual_canon: byId.get(item.uuid)?.canon_id ?? null }));
report.editions_sources = sourceRows;
report.files = readdirSync(bundleDir).sort();
report.verdict = report.errors.length ? 'NO-GO' : report.warnings.length ? 'GO_WITH_REQUIRED_ADAPTATION' : 'GO';
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, errors: report.errors, warnings: report.warnings, pre_state: pre, markers: markerChecks.length, action_rows: expectedRows.length, report: reportPath }, null, 2));
