import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const moduleArgument = process.argv.indexOf("--pglite-module");
const modulePath = moduleArgument >= 0 ? process.argv[moduleArgument + 1] : null;
const pgliteModule = modulePath
  ? await import(pathToFileURL(path.resolve(modulePath)).href)
  : await import("@electric-sql/pglite");
const { PGlite } = pgliteModule;

const migration = await readFile(path.join(root, "sql", "20260807_bible_multimode_model.sql"), "utf8");
const verification = await readFile(
  path.join(root, "sql", "tests", "20260807_bible_multimode_model_verification.sql"),
  "utf8",
);

const db = new PGlite();
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table public.traductions (trad_id text primary key);
  create table public.versets_canon (id text primary key);
`);
await db.exec(migration);
await db.exec(verification);

await db.exec(`
  insert into public.traductions (trad_id) values ('TRFIX');
  insert into public.bible_text_sources
    (id, trad_id, source_code, title, source_kind, version_label, status)
  values
    ('00000000-0000-0000-0000-000000000001', 'TRFIX', 'fixture',
     'Témoin fictif', 'manuscript', 'fixture-1', 'published');

  insert into public.bible_source_units
    (id, source_id, source_unit_key, material_order, surface_key,
     material_leaf_sequence, side, column_id, column_label, line_no,
     native_folio_raw, native_folio_number, native_folio_status, break_no)
  values
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
     'fixture_l01', 1, 'f1r_a', 1, 'r', 'f1r_a', 'a', 1, '1', 1, 'VISIBLE', true),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
     'fixture_l02', 2, 'f1r_a', 1, 'r', 'f1r_a', 'a', 2, '1', 1, 'VISIBLE', false);

  insert into public.bible_text_layers
    (id, source_id, layer_code, label, layer_kind, validation_status, is_public)
  values
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001',
     'diplomatic', 'Diplomatique', 'diplomatic', 'validated', true),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001',
     'expanded', 'Développée', 'expanded', 'validated', true);

  insert into public.bible_source_unit_texts
    (source_id, unit_id, layer_id, layer_code, text_content)
  values
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000021', 'diplomatic', 'brief'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000021', 'diplomatic', 'm̄t'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000022', 'expanded', 'brief'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000022', 'expanded', 'ment');

  insert into public.bible_native_divisions
    (id, source_id, division_kind, sequence_no, sequence_in_parent, stable_key,
     label_diplomatic, start_unit_id, end_unit_id, confidence,
     validation_status, is_public)
  values
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001',
     'book', 1, 1, 'book:1', 'Livre fictif',
     '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012',
     'high', 'validated', true);
`);

const capabilityRows = await db.query(`
  select mode_code, is_available
  from public.v_bible_reading_capabilities
  where trad_id = 'TRFIX'
  order by display_order
`);
const available = capabilityRows.rows
  .filter((row) => row.is_available)
  .map((row) => row.mode_code);
assert.deepEqual(available, ["diplomatic", "expanded", "native"]);

const textRows = await db.query(`
  select layer_code, count(*)::integer as count
  from public.v_bible_source_unit_texts
  where trad_id = 'TRFIX'
  group by layer_code
  order by layer_code
`);
assert.deepEqual(textRows.rows, [
  { layer_code: "diplomatic", count: 2 },
  { layer_code: "expanded", count: 2 },
]);

await db.exec("set role anon");
const anonymousRows = await db.query(
  "select count(*)::integer as count from public.v_bible_source_unit_texts where trad_id = 'TRFIX'",
);
assert.equal(anonymousRows.rows[0].count, 4);
await assert.rejects(
  db.exec("insert into public.bible_text_sources (trad_id, source_code, title, source_kind, version_label) values ('TRFIX', 'forbidden', 'x', 'other', '1')"),
  /permission denied/u,
);
await db.exec("reset role");

console.log(JSON.stringify({
  migration_applied_locally: true,
  verification_sql_passed: true,
  fictional_witness: {
    available_modes: available,
    source_unit_text_rows: 4,
    anonymous_read: true,
    anonymous_write_blocked: true,
  },
}, null, 2));

await db.close();
