import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const TRAD = 'TR0003';
const OUT = 'audit/crampon-2026-07-30';
const BEFORE = JSON.parse(readFileSync(`${OUT}/TR0003-before.json`, 'utf8'));
const META_BEFORE = JSON.parse(readFileSync(`${OUT}/metadata-before.json`, 'utf8'));
const PLAN = JSON.parse(readFileSync(`${OUT}/correction-plan.json`, 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const hash = (value) => createHash('sha256').update(value).digest('hex');
async function all(table, select, configure, order = 'id') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    if (configure) query = configure(query);
    if (order) query = query.order(order);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const [after, canon, metadata, otherTranslations] = await Promise.all([
  all('versets_v2', '*', (q) => q.eq('trad_id', TRAD)),
  all('versets_canon', '*', null, 'ordre'),
  db.from('traductions').select('*').eq('trad_id', TRAD).single().then(({ data, error }) => { if (error) throw error; return data; }),
  all('versets_v2', 'id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,texte,canon_id,canon_id_fin,notes,note_edition,note_structure,note_travail,alignement_verifie', (q) => q.neq('trad_id', TRAD)),
]);
const beforeById = new Map(BEFORE.map((row) => [row.id, row]));
const afterById = new Map(after.map((row) => [row.id, row]));
const inserted = after.filter((row) => !beforeById.has(row.id));
const deleted = BEFORE.filter((row) => !afterById.has(row.id));
const comparedFields = ['trad_id', 'livre', 'ch_orig', 'v_orig', 'v_orig_suffixe', 'texte', 'canon_id', 'canon_id_fin', 'notes', 'note_edition', 'note_structure', 'note_travail', 'alignement_verifie'];
const existingDiffs = [];
for (const row of BEFORE) {
  const current = afterById.get(row.id);
  if (!current) continue;
  const fields = comparedFields.filter((field) => JSON.stringify(row[field]) !== JSON.stringify(current[field]));
  if (fields.length) existingDiffs.push({ id: row.id, reference_before: `${row.livre} ${row.ch_orig},${row.v_orig}${row.v_orig_suffixe ?? ''}`, fields, before: Object.fromEntries(fields.map((field) => [field, row[field]])), after: Object.fromEntries(fields.map((field) => [field, current[field]])) });
}
const textDiffs = existingDiffs.filter((item) => item.fields.includes('texte'));
const allowedFields = new Set(['texte', 'notes', 'note_edition', 'v_orig']);
const forbiddenFieldDiffs = existingDiffs.filter((item) => item.fields.some((field) => !allowedFields.has(field)));
const byOrder = new Map(canon.map((row) => [row.id, row.ordre]));
const covered = new Set();
for (const row of after) {
  if (row.canon_id) covered.add(row.canon_id);
  if (!row.canon_id || !row.canon_id_fin) continue;
  const start = byOrder.get(row.canon_id), end = byOrder.get(row.canon_id_fin);
  if (start == null || end == null) continue;
  for (const slot of canon) if (slot.ordre >= start && slot.ordre <= end) covered.add(slot.id);
}
const missing = canon.filter((slot) => !covered.has(slot.id));
const missingReport = missing.map((slot) => ({
  canon_id_manquant: slot.id, livre: slot.livre, chapitre: slot.ch_canon, verset: slot.v_canon,
  cause_presumee: slot.livre === 'SIR' ? 'Différence de recension ou de numérotation dans l’Ecclésiastique.' : 'Différence de recension entre l’ossature canonique et la tradition latine de l’édition.',
  ligne_source_correspondante_eventuelle: null,
  statut: slot.livre === 'SIR' ? 'à revoir' : 'recension',
}));
const suffixSignature = (rows) => rows.filter((row) => row.v_orig_suffixe != null)
  .map((row) => ({ id: row.id, livre: row.livre, ch_orig: row.ch_orig, v_orig: row.v_orig, v_orig_suffixe: row.v_orig_suffixe, canon_id: row.canon_id, canon_id_fin: row.canon_id_fin }))
  .sort((a, b) => a.id.localeCompare(b.id));
const suffixGroups = (rows) => new Set(rows.filter((row) => row.v_orig_suffixe != null).map((row) => `${row.livre} ${row.ch_orig},${row.v_orig}`));
const expectedSuffixGroups = ['1CH 11,32', '1CH 11,46', '1CH 12,4', '1CO 16,23', '3JN 1,14', 'ACT 10,48', 'ACT 14,6', 'ACT 19,40', 'DEU 5,17', 'ECC 7,27', 'HEB 13,24', 'ISA 38,21', 'JDG 21,24', 'JHN 11,56', 'MAT 17,14', 'MRK 4,40', 'MRK 8,38', 'WIS 9,18'];
const regexChecks = {
  apostrophe_space: after.filter((row) => /[\p{L}]’ +[\p{L}]/u.test(row.texte ?? '')).map((row) => row.id),
  hyphen_space: after.filter((row) => /[\p{L}]- +[\p{L}]/u.test(row.texte ?? '')).map((row) => row.id),
  bracket_open_space: after.filter((row) => /\[ +/.test(row.texte ?? '')).map((row) => row.id),
  bracket_close_space: after.filter((row) => / +\]/.test(row.texte ?? '')).map((row) => row.id),
  quote_weld_jhn: after.filter((row) => row.id === '96664528-ad98-4992-84d1-c2f3dbee1caa' && /»Jésus/.test(row.texte)).map((row) => row.id),
  quote_weld_sir: after.filter((row) => row.id === '432983cf-b1f9-429c-9b53-4f53696f064e' && /»et il/.test(row.texte)).map((row) => row.id),
};
const jos21 = after.filter((row) => row.livre === 'JOS' && row.ch_orig === 21);
const josNumbers = [...new Set(jos21.map((row) => row.v_orig))].sort((a, b) => a - b);
const josCanonCounts = Object.fromEntries(Array.from({ length: 10 }, (_, index) => `JOS.21.${index + 36}`).map((id) => [id, after.filter((row) => row.canon_id === id).length]));
const exactChecks = {
  exodus_text_has_note: afterById.get('deacd3e1-bf92-41c6-bc24-a963f3f6b0be').texte.includes('Note'),
  exodus_note_edition: afterById.get('deacd3e1-bf92-41c6-bc24-a963f3f6b0be').note_edition,
  repetitions_absent: {
    first_kings: !afterById.get('cfab7cf5-81ab-4323-94c1-0f0073c8431c').texte.includes('remontés remontés'),
    jeremiah_9: !afterById.get('7a34a88e-95a2-4da6-b0db-c93745aa45a4').texte.includes('dupent dupent'),
    jeremiah_44: !afterById.get('869ab022-9153-4e63-bda9-f05075298559').texte.includes('vos vos'),
  },
  numbers_14_43: afterById.get('aefe635d-33ce-4583-a584-33f80c51d0d8').texte.includes('parce que vous vous êtes'),
  collated: {
    joshua_8_4: afterById.get('1ce7eba9-81ee-4243-89cd-0f292c339d6f').texte.includes('vos gardes'),
    ezekiel_20_43: afterById.get('c596720b-b540-405d-828a-9dfb81ed4929').texte.includes('vous-mêmes'),
    sirach_11_25: afterById.get('746200e2-b9b4-40f9-9f0e-051b85d2617a').texte.includes('dévoilées'),
    sirach_16_27: afterById.get('6238a0f8-9c99-4270-b6af-401278803c52').texte.includes('il la remplit'),
    sirach_16_5: afterById.get('32f3101b-d7fc-4fec-b04a-3fa7881548ab').texte.includes('en ont entendu'),
    second_maccabees_2_26: afterById.get('d738518f-5f8c-432d-9893-619a5dfb5979').texte.includes('tâche agréable'),
    first_corinthians_3_23: afterById.get('1bb1b73f-c623-4961-8358-cf37aadda8c8').texte.includes('mais vous êtes au Christ'),
    esther_10_9: afterById.get('55f811b1-6156-4e8f-80c8-17333bdf79a9').texte.includes('comme il n’est point arrivé'),
  },
};
const metadataDiff = Object.fromEntries(Object.keys(metadata).filter((field) => JSON.stringify(META_BEFORE[field]) !== JSON.stringify(metadata[field])).map((field) => [field, { before: META_BEFORE[field], after: metadata[field] }]));
const otherHashAfter = hash(JSON.stringify(otherTranslations));
const seed = 20260730;
let state = seed;
const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const unchanged = after.filter((row) => beforeById.has(row.id) && !existingDiffs.some((item) => item.id === row.id));
const randomSample = [...unchanged].sort(() => random() - 0.5).slice(0, 30).map((row) => ({ id: row.id, reference: `${row.livre} ${row.ch_orig},${row.v_orig}`, exact_match: comparedFields.every((field) => JSON.stringify(beforeById.get(row.id)[field]) === JSON.stringify(row[field])) }));
const checks = {
  rows_35594: after.length === 35594,
  books_73: new Set(after.map((row) => row.livre)).size === 73,
  no_null_text: after.every((row) => row.texte != null),
  no_empty_text: after.every((row) => String(row.texte).trim()),
  existing_uuids_preserved: deleted.length === 0,
  exactly_two_insertions: inserted.length === 2 && inserted.every((row) => PLAN.inserted_rows.some((item) => item.id === row.id)),
  source_only_102: after.filter((row) => row.canon_id == null).length === 102,
  source_only_all_documented: after.filter((row) => row.canon_id == null).every((row) => String(row.note_structure ?? '').trim()),
  uncovered_73: missing.length === 73,
  uncovered_distribution: JSON.stringify(Object.fromEntries(['JDT', 'SIR', 'TOB'].map((book) => [book, missing.filter((row) => row.livre === book).length]))) === JSON.stringify({ JDT: 29, SIR: 43, TOB: 1 }),
  suffix_groups_18_expected: suffixGroups(after).size === 18 && expectedSuffixGroups.every((key) => suffixGroups(after).has(key)),
  suffix_structure_unchanged: JSON.stringify(suffixSignature(BEFORE)) === JSON.stringify(suffixSignature(after)),
  regex_zero: Object.values(regexChecks).every((rows) => rows.length === 0),
  jos21_numbers_1_to_45: josNumbers.length === 45 && josNumbers.every((value, index) => value === index + 1),
  jos21_canon_36_to_45_exactly_once: Object.values(josCanonCounts).every((count) => count === 1),
  text_rows_modified_315: textDiffs.length === 315,
  numbering_fields_modified_8: existingDiffs.filter((item) => item.fields.includes('v_orig')).length === 8,
  no_forbidden_existing_field_changes: forbiddenFieldDiffs.length === 0,
  generic_notes_zero: after.every((row) => row.notes == null),
  note_structure_preserved: after.filter((row) => row.note_structure != null).length === 193,
  note_travail_preserved: after.filter((row) => row.note_travail != null).length === 37,
  metadata_est_referent_unchanged: metadata.est_referent === META_BEFORE.est_referent,
  metadata_sources_present: Boolean(metadata.source_edition && metadata.source_url && metadata.import_maj_le),
  no_other_translation_touched: otherHashAfter === PLAN.baseline.other_translations_sha256,
  random_unchanged_sample_30_of_30: randomSample.length === 30 && randomSample.every((item) => item.exact_match),
  targeted_checks_pass: !exactChecks.exodus_text_has_note && exactChecks.exodus_note_edition === 'Yahweh-Nessi, c.-à-d. Yahweh - ma - bannière.' && exactChecks.numbers_14_43 && Object.values(exactChecks.repetitions_absent).every(Boolean) && Object.values(exactChecks.collated).every(Boolean),
};
const report = {
  generated_at: new Date().toISOString(), translation: TRAD, result: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  counts: {
    rows_before: BEFORE.length, rows_after: after.length, books: new Set(after.map((row) => row.livre)).size,
    existing_rows_changed: existingDiffs.length, text_rows_modified: textDiffs.length, inserted_rows: inserted.length,
    numbering_fields_modified: existingDiffs.filter((item) => item.fields.includes('v_orig')).length,
    generic_notes_before: BEFORE.filter((row) => row.notes != null).length, generic_notes_after: after.filter((row) => row.notes != null).length,
    note_edition_after: after.filter((row) => row.note_edition != null).length, note_structure_after: after.filter((row) => row.note_structure != null).length, note_travail_after: after.filter((row) => row.note_travail != null).length,
    source_only: after.filter((row) => row.canon_id == null).length, uncovered_slots: missing.length, suffix_groups: suffixGroups(after).size,
  },
  checks, regex_checks: Object.fromEntries(Object.entries(regexChecks).map(([key, rows]) => [key, { count: rows.length, ids: rows }])),
  targeted_checks: exactChecks, josua_21: { native_numbers: josNumbers, canonical_counts_36_45: josCanonCounts },
  inserted_rows: inserted, numbering_changes: existingDiffs.filter((item) => item.fields.includes('v_orig')),
  pending_collation_cases: [], collation_pages: [80, 232, 245, 560, 605, 927, 934, 935, 936, 1262, 1550, 1632],
  metadata_diff: metadataDiff, other_translations: { rows: otherTranslations.length, sha256_before: PLAN.baseline.other_translations_sha256, sha256_after: otherHashAfter },
  diff: { deleted_rows: deleted, forbidden_field_diffs: forbiddenFieldDiffs, existing_diffs: existingDiffs }, random_control: { seed, sample: randomSample },
};
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/TR0003-after.json`, `${JSON.stringify(after, null, 2)}\n`, 'utf8');
writeFileSync(`${OUT}/metadata-after.json`, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
writeFileSync(`${OUT}/uncovered-canonical-slots.json`, `${JSON.stringify(missingReport, null, 2)}\n`, 'utf8');
writeFileSync(`${OUT}/final-audit.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: report.result, counts: report.counts, checks, metadata_fields_changed: Object.keys(metadataDiff), pending_collation_cases: report.pending_collation_cases }, null, 2));
if (report.result !== 'PASS') process.exit(1);
