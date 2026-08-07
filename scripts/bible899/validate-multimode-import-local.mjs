import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildPlan } from "./import-multimode-tr0009.mjs";

const root = process.cwd();
const moduleArgument = process.argv.indexOf("--pglite-module");
const modulePath = moduleArgument >= 0 ? process.argv[moduleArgument + 1] : null;
const pgliteModule = modulePath
  ? await import(pathToFileURL(path.resolve(modulePath)).href)
  : await import("@electric-sql/pglite");
const { PGlite } = pgliteModule;

const migration = await readFile(path.join(root, "sql", "20260807_bible_multimode_model.sql"), "utf8");
const source = {
  trad_id: "TRFIX",
  source_code: "fixture-multimode",
  title: "Témoin fictif multimode",
  source_kind: "manuscript",
  version_label: "fixture-1",
  source_uri: "fixture.xml",
  source_sha256: "a".repeat(64),
  metadata: { modernized_imported: false, canonical_alignment_imported: false },
};
const units = [
  ["f295v_a_l01", 1, "fixture-0295-v", 295, "v", "f295v_a", "a", 1, "295", 295, "INFERRED", true],
  ["f296r_a_l01", 2, "fixture-0296-r", 296, "r", "f296r_a", "a", 1, "297", 297, "VISIBLE", false],
  ["f371v_b_l40", 3, "fixture-0371-v", 371, "v", "f371v_b", "b", 40, "372", 372, "INFERRED", false],
].map(([source_unit_key, material_order, surface_key, material_leaf_sequence, side, column_id, column_label, line_no, native_folio_raw, native_folio_number, native_folio_status, break_no]) => ({
  source_unit_key, unit_type: "line", material_order, surface_key,
  material_leaf_sequence, side, column_id, column_label, line_no,
  native_folio_raw, native_folio_number, native_folio_status, break_no,
  has_unclear: source_unit_key === "f296r_a_l01", has_gap: false,
  material_features: { fixture: true, native_face_label: `${native_folio_number}${side}` },
}));
const layers = [
  { layer_code: "diplomatic", label: "Diplomatique", layer_kind: "diplomatic", validation_status: "validated", transformation_rules: { method: "fixture" } },
  { layer_code: "expanded", label: "Développée", layer_kind: "expanded", validation_status: "validated", transformation_rules: { method: "fixture" } },
];
const texts = units.flatMap((unit) => layers.map((layer) => ({
  source_unit_key: unit.source_unit_key,
  layer_code: layer.layer_code,
  text_content: layer.layer_code === "diplomatic" ? "q̃ fixture" : "que fixture",
  source_markup: layer.layer_code === "diplomatic" ? `<l xml:id="${unit.source_unit_key}">q̃ fixture</l>` : null,
  text_features: { fixture: true },
})));
const divisions = [
  {
    stable_key: "book:01", parent_stable_key: null, division_kind: "book",
    sequence_no: 1, sequence_in_parent: 1, label_diplomatic: "Livre fictif",
    proposed_book_code: "FIX", manuscript_number_raw: null, manuscript_number: null,
    expected_sequence: null, marker_type: "book_boundary", marker_status: null,
    number_status: null, confidence: "high", requires_review: false,
    validation_status: "validated", is_public: true, start_unit_key: units[0].source_unit_key,
    end_unit_key: units[2].source_unit_key, notes: "fixture", metadata: {},
  },
  {
    stable_key: "chapter:01:001", parent_stable_key: "book:01", division_kind: "chapter",
    sequence_no: 2, sequence_in_parent: 1, label_diplomatic: null,
    proposed_book_code: "FIX", manuscript_number_raw: "I", manuscript_number: 1,
    expected_sequence: 1, marker_type: "numéro romain", marker_status: "NUMBER_AND_INITIAL",
    number_status: "READ", confidence: "high", requires_review: false,
    validation_status: "validated", is_public: true, start_unit_key: units[1].source_unit_key,
    end_unit_key: units[2].source_unit_key, notes: "fixture", metadata: {},
  },
];
const provenanceRecords = [
  { provenance_key: "image:primary:fixture.png", provenance_type: "facsimile", role: "PRIMARY", uri: "/fixture.png", locator: "fixture.png", sha256: "b".repeat(64), metadata: { public_path: "fixture.png", width: 10, height: 20 } },
  { provenance_key: "image:alternative:fixture-alt.png", provenance_type: "facsimile", role: "ALTERNATIVE", uri: "/fixture-alt.png", locator: "fixture-alt.png", sha256: "c".repeat(64), metadata: { public_path: "fixture-alt.png", width: 10, height: 20, alternative_for: "fixture.png" } },
];
const provenanceLinks = [
  { provenance_key: provenanceRecords[0].provenance_key, target_type: "source_unit", target_key: units[0].source_unit_key, relation_type: "facsimile_primary", metadata: {} },
  { provenance_key: provenanceRecords[1].provenance_key, target_type: "source_unit", target_key: units[0].source_unit_key, relation_type: "facsimile_alternative", metadata: {} },
];
const dataset = {
  source, units, layers, texts, divisions, provenanceRecords, provenanceLinks,
  counts: { units: 3, texts: 6, native_divisions: 2, books: 1, chapters: 1, unclear_units: 1, gap_units: 0, break_no_units: 1, primary_images: 1, alternative_images: 1, provenance_records: 2, provenance_links: 2 },
};

const db = new PGlite();
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table public.traductions (trad_id text primary key, statut_corpus_public text, schema_numerotation text);
  create table public.versets_canon (id text primary key);
  create table public.versets_v2 (id bigint generated always as identity primary key, trad_id text not null);
  insert into public.traductions(trad_id) values ('TRFIX');
`);
await db.exec(migration);
const plan = buildPlan(dataset);
assert.equal(plan.summary.rpc_calls_on_apply, 1);
assert.equal(plan.atomicSql.startsWith("begin;\n"), true);
assert.equal(plan.atomicSql.endsWith("commit;\n"), true);
await db.exec(plan.atomicSql);

const counts = await db.query(`
  select
    (select count(*)::integer from public.bible_source_units) as units,
    (select count(*)::integer from public.bible_source_unit_texts) as texts,
    (select count(*)::integer from public.bible_native_divisions) as divisions,
    (select count(*)::integer from public.bible_provenance_records) as provenance_records,
    (select count(*)::integer from public.bible_provenance_links) as provenance_links,
    (select count(*)::integer from public.versets_v2 where trad_id='TRFIX') as forbidden_verses,
    (select count(*)::integer from public.bible_canonical_alignments) as forbidden_alignments
`);
assert.deepEqual(counts.rows[0], {
  units: 3, texts: 6, divisions: 2, provenance_records: 2,
  provenance_links: 2, forbidden_verses: 0, forbidden_alignments: 0,
});
const capabilities = await db.query(`
  select mode_code from public.v_bible_reading_capabilities
  where trad_id='TRFIX' and is_available order by display_order
`);
assert.deepEqual(capabilities.rows.map((row) => row.mode_code), ["diplomatic", "expanded", "native"]);
const foliation = await db.query("select native_folio_number from public.bible_source_units order by material_order");
assert.deepEqual(foliation.rows.map((row) => row.native_folio_number), [295, 297, 372]);

const rollbackDb = new PGlite();
await rollbackDb.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table public.traductions (trad_id text primary key, statut_corpus_public text, schema_numerotation text);
  create table public.versets_canon (id text primary key);
  create table public.versets_v2 (id bigint generated always as identity primary key, trad_id text not null);
  insert into public.traductions(trad_id) values ('TRFIX');
`);
await rollbackDb.exec(migration);
const invalidPlan = buildPlan({ ...dataset, counts: { ...dataset.counts, units: 4 } });
await assert.rejects(rollbackDb.exec(invalidPlan.atomicSql), /unit/u);
await rollbackDb.exec("rollback;");
const rolledBack = await rollbackDb.query("select count(*)::integer as sources from public.bible_text_sources where trad_id='TRFIX'");
assert.equal(rolledBack.rows[0].sources, 0);
await rollbackDb.close();

const report = {
  local_migration_applied: true,
  fictional_witness_imported: true,
  publication_atomic_guard_passed: true,
  failed_final_guard_rolled_back_entire_transaction: true,
  counts: counts.rows[0],
  available_modes: capabilities.rows.map((row) => row.mode_code),
  native_foliation: foliation.rows.map((row) => row.native_folio_number),
  source_status: "published",
  modernized_imported: false,
};
const validationDirectory = path.join(root, "work", "bible899", "multimode", "validation");
await mkdir(validationDirectory, { recursive: true });
await writeFile(path.join(validationDirectory, "FICTIONAL_WITNESS_IMPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
await db.close();
