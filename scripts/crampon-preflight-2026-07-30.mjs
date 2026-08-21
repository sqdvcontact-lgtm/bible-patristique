import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const TRAD = 'TR0003';
const OUT = 'audit/crampon-2026-07-30';
const FIELDS = ['id', 'trad_id', 'livre', 'ch_orig', 'v_orig', 'v_orig_suffixe', 'texte', 'canon_id', 'canon_id_fin', 'notes', 'note_edition', 'note_structure', 'note_travail', 'alignement_verifie'];
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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

const csvCell = (value) => value == null ? '' : `"${String(value).replaceAll('"', '""')}"`;
const csv = (rows) => [FIELDS.join(','), ...rows.map((row) => FIELDS.map((field) => csvCell(row[field])).join(','))].join('\r\n') + '\r\n';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const coveredSlots = (rows, canon) => {
  const byOrder = new Map(canon.map((row) => [row.id, row.ordre]));
  const covered = new Set();
  for (const row of rows) {
    if (row.canon_id) covered.add(row.canon_id);
    if (!row.canon_id || !row.canon_id_fin) continue;
    const start = byOrder.get(row.canon_id), end = byOrder.get(row.canon_id_fin);
    if (start == null || end == null) continue;
    for (const slot of canon) if (slot.ordre >= start && slot.ordre <= end) covered.add(slot.id);
  }
  return covered;
};

mkdirSync(OUT, { recursive: true });
const [rows, canon, metadata, charter] = await Promise.all([
  all('versets_v2', FIELDS.join(','), (q) => q.eq('trad_id', TRAD)),
  all('versets_canon', '*', null, 'ordre'),
  db.from('traductions').select('*').eq('trad_id', TRAD).single().then(({ data, error }) => { if (error) throw error; return data; }),
  db.from('parametres').select('cle,valeur,mis_a_jour').eq('cle', 'charte_ia').single().then(({ data, error }) => { if (error) throw error; return data; }),
]);
const csvText = csv(rows);
const covered = coveredSlots(rows, canon);
const missing = canon.filter((slot) => !covered.has(slot.id));
const suffixGroups = new Map();
for (const row of rows.filter((item) => item.v_orig_suffixe != null)) {
  const key = `${row.livre} ${row.ch_orig},${row.v_orig}`;
  if (!suffixGroups.has(key)) suffixGroups.set(key, []);
  suffixGroups.get(key).push(row);
}
const apostrophe = /[\p{L}]’ +[\p{L}]/gu;
const hyphen = /[\p{L}]- +[\p{L}]/gu;
const bracketOpen = /\[ +/g;
const bracketClose = / +\]/g;
const regexStats = (regex) => {
  let lines = 0, occurrences = 0;
  for (const row of rows) {
    const matches = [...String(row.texte ?? '').matchAll(regex)];
    if (matches.length) lines++;
    occurrences += matches.length;
  }
  return { lines, occurrences };
};
const targetedIds = [
  'deacd3e1-bf92-41c6-bc24-a963f3f6b0be', '96664528-ad98-4992-84d1-c2f3dbee1caa', '432983cf-b1f9-429c-9b53-4f53696f064e',
  '4a199a62-e3b5-457b-a465-76167419d9fb', '26478a6a-a36b-4c4a-88bd-20435d6601b8', '33095b98-3351-4e31-808d-22acff8a9885',
  'fca1cd31-05cd-49a5-8b6e-554f9b5ac3ab', '162b71d2-66ca-435e-929a-9295c2becd6f', 'e4deae7b-d3e6-4c5b-816f-3c7befade0cb',
  '6c4d06d2-d754-46f3-abb5-2f429cd825eb', '366a8b5f-4995-4f8f-99b6-484887a7c423',
  '7ef41261-75f3-425f-a9ef-11b40cbb7279', '18d0d945-df7f-4d05-a16b-0ceb7e34b9a0', '64695790-203b-49f4-8208-7efabbb376a2',
  'b14af086-ce21-4555-90ad-bef4c1efe85c', '7f242712-485b-4322-a26a-8c93a8f6ccfb', 'e0fa95e1-02d5-4fb4-987f-f31b529c2c46',
  'f3975203-86cf-40ac-b50a-83fef297cada', 'a5f4007e-bac6-48bc-929f-9a82658e2ad1', 'ccb00451-4452-4199-980f-2c321226cc75',
  'cfab7cf5-81ab-4323-94c1-0f0073c8431c', '7a34a88e-95a2-4da6-b0db-c93745aa45a4', '869ab022-9153-4e63-bda9-f05075298559',
  'aefe635d-33ce-4583-a584-33f80c51d0d8',
];
const report = {
  generated_at: new Date().toISOString(), mode: 'read_only_preflight', translation: TRAD,
  export: { fields: FIELDS, rows: rows.length, csv_sha256: hash(csvText), json_sha256: hash(JSON.stringify(rows)) },
  counts: {
    rows: rows.length, books: new Set(rows.map((row) => row.livre)).size,
    null_text: rows.filter((row) => row.texte == null).length,
    empty_text: rows.filter((row) => !String(row.texte ?? '').trim()).length,
    source_only: rows.filter((row) => row.canon_id == null).length,
    source_only_without_structure_note: rows.filter((row) => row.canon_id == null && !String(row.note_structure ?? '').trim()).length,
    uncovered_canonical_slots: missing.length,
    notes: rows.filter((row) => row.notes != null).length,
    note_edition: rows.filter((row) => row.note_edition != null).length,
    note_structure: rows.filter((row) => row.note_structure != null).length,
    note_travail: rows.filter((row) => row.note_travail != null).length,
    suffix_groups: suffixGroups.size,
  },
  regex: { apostrophe_space: regexStats(apostrophe), hyphen_space: regexStats(hyphen), bracket_open_space: regexStats(bracketOpen), bracket_close_space: regexStats(bracketClose) },
  missing_by_book: Object.fromEntries([...new Set(missing.map((row) => row.livre))].map((book) => [book, missing.filter((row) => row.livre === book).length])),
  missing_slots: missing,
  suffix_groups: Object.fromEntries([...suffixGroups].map(([key, group]) => [key, group])),
  targeted_rows: rows.filter((row) => targetedIds.includes(row.id)),
  missing_targeted_ids: targetedIds.filter((id) => !rows.some((row) => row.id === id)),
  metadata,
  charter: { mis_a_jour: charter.mis_a_jour, length: String(charter.valeur ?? '').length, sha256: hash(String(charter.valeur ?? '')) },
};
writeFileSync(`${OUT}/TR0003-before.csv`, csvText, 'utf8');
writeFileSync(`${OUT}/TR0003-before.json`, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
writeFileSync(`${OUT}/metadata-before.json`, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
writeFileSync(`${OUT}/charte-before.md`, String(charter.valeur ?? ''), 'utf8');
writeFileSync(`${OUT}/preflight.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: OUT, export: report.export, counts: report.counts, regex: report.regex, missing_by_book: report.missing_by_book, missing_targeted_ids: report.missing_targeted_ids, charter: report.charter }, null, 2));
