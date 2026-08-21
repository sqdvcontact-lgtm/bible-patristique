import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildPlan, loadPrepared, TR0009_PUBLIC_STATUS } from "./import-multimode-tr0009.mjs";
import { sha256 } from "./multimode-dataset.mjs";

const root = process.cwd();
const moduleArgument = process.argv.indexOf("--pglite-module");
const modulePath = moduleArgument >= 0 ? process.argv[moduleArgument + 1] : null;
const pgliteModule = modulePath
  ? await import(pathToFileURL(path.resolve(modulePath)).href)
  : await import("@electric-sql/pglite");
const { PGlite } = pgliteModule;

const preparedDirectory = path.join(root, "work", "bible899", "multimode", "prepared");
const validationDirectory = path.join(root, "work", "bible899", "multimode", "validation");
const migration = await readFile(path.join(root, "sql", "20260807_bible_multimode_model.sql"), "utf8");
const expectedRecomposition = JSON.parse(await readFile(path.join(preparedDirectory, "RECOMPOSITION_CONTROL.json"), "utf8"));
const expectedImageControl = JSON.parse(await readFile(path.join(preparedDirectory, "PROVENANCE_IMAGE_CONTROL.json"), "utf8"));
const dataset = await loadPrepared();
const plan = buildPlan(dataset);

assert.equal(plan.summary.rpc_calls_on_apply, 1);
assert.equal(plan.summary.apply_allowed_by_size, true);
assert.equal(plan.atomicSql.startsWith("begin;\n"), true);
assert.equal(plan.atomicSql.endsWith("commit;\n"), true);

const db = new PGlite();
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table public.traductions (
    trad_id text primary key,
    statut_corpus_public text,
    schema_numerotation text
  );
  create table public.versets_canon (id text primary key);
  create table public.versets_v2 (
    id bigint generated always as identity primary key,
    trad_id text not null
  );
  insert into public.traductions(trad_id) values ('TR0009');
`);
await db.exec(migration);

const startedAt = new Date().toISOString();
await db.exec(plan.atomicSql);

const cardinalityResult = await db.query(`
  select
    (select count(*)::integer from public.bible_text_sources where trad_id='TR0009') as sources,
    (select count(*)::integer from public.bible_source_units) as units,
    (select count(*)::integer from public.bible_text_layers) as layers,
    (select count(*)::integer from public.bible_source_unit_texts) as texts,
    (select count(*)::integer from public.bible_native_divisions) as native_divisions,
    (select count(*)::integer from public.bible_native_divisions where division_kind='book') as books,
    (select count(*)::integer from public.bible_native_divisions where division_kind='chapter') as chapters,
    (select count(*)::integer from public.bible_source_units where has_unclear) as unclear_units,
    (select count(*)::integer from public.bible_source_units where has_gap) as gap_units,
    (select count(*)::integer from public.bible_source_units where break_no) as break_no_units,
    (select count(*)::integer from public.bible_provenance_records where provenance_kind='facsimile' and asset_role='PRIMARY') as primary_images,
    (select count(*)::integer from public.bible_provenance_records where provenance_kind='facsimile' and asset_role='ALTERNATIVE') as alternative_images,
    (select count(*)::integer from public.bible_provenance_records) as provenance_records,
    (select count(*)::integer from public.bible_provenance_links) as provenance_links,
    (select count(*)::integer from public.versets_v2 where trad_id='TR0009') as forbidden_verses,
    (select count(*)::integer from public.bible_canonical_alignments) as forbidden_alignments,
    (select count(*)::integer from public.bible_text_layers where layer_kind='modernized') as modernized_layers
`);
const actual = cardinalityResult.rows[0];
assert.deepEqual(actual, {
  sources: 1,
  units: dataset.counts.units,
  layers: 2,
  texts: dataset.counts.texts,
  native_divisions: dataset.counts.native_divisions,
  books: dataset.counts.books,
  chapters: dataset.counts.chapters,
  unclear_units: dataset.counts.unclear_units,
  gap_units: dataset.counts.gap_units,
  break_no_units: dataset.counts.break_no_units,
  primary_images: dataset.counts.primary_images,
  alternative_images: dataset.counts.alternative_images,
  provenance_records: dataset.counts.provenance_records,
  provenance_links: dataset.counts.provenance_links,
  forbidden_verses: 0,
  forbidden_alignments: 0,
  modernized_layers: 0,
});

const capabilitiesResult = await db.query(`
  select mode_code from public.v_bible_reading_capabilities
  where trad_id='TR0009' and is_available order by display_order
`);
const availableModes = capabilitiesResult.rows.map((row) => row.mode_code);
assert.deepEqual(availableModes, ["diplomatic", "expanded", "native"]);

const foliationResult = await db.query(`
  select
    count(*) filter (where native_folio_number=296)::integer as native_296,
    max(material_order)::integer as final_material_order,
    (array_agg(native_folio_number order by material_order desc))[1]::integer as final_native_folio,
    (array_agg(side order by material_order desc))[1] as final_side
  from public.bible_source_units
`);
assert.deepEqual(foliationResult.rows[0], {
  native_296: 0,
  final_material_order: dataset.counts.units,
  final_native_folio: 372,
  final_side: "v",
});

const statusResult = await db.query(`
  select s.status, t.statut_corpus_public
  from public.bible_text_sources s
  join public.traductions t using (trad_id)
  where s.trad_id='TR0009'
`);
assert.deepEqual(statusResult.rows[0], { status: "published", statut_corpus_public: TR0009_PUBLIC_STATUS });

const textResult = await db.query(`
  select u.source_unit_key, u.break_no, t.layer_code, t.text_content
  from public.bible_source_unit_texts t
  join public.bible_source_units u on u.source_id=t.source_id and u.id=t.unit_id
  order by t.layer_code, u.material_order
`);
const recomposition = {};
for (const layerCode of ["diplomatic", "expanded"]) {
  const rows = textResult.rows.filter((row) => row.layer_code === layerCode);
  assert.equal(rows.length, dataset.counts.units);
  const lineDelimited = rows.map((row) => row.text_content).join("\n");
  const continuous = rows.map((row, index) => `${row.text_content}${index === rows.length - 1 || row.break_no ? "" : " "}`).join("");
  recomposition[layerCode] = {
    rows: rows.length,
    line_delimited_sha256: sha256(lineDelimited),
    continuous_sha256: sha256(continuous),
  };
  assert.equal(recomposition[layerCode].line_delimited_sha256, expectedRecomposition[layerCode].line_delimited_sha256);
  assert.equal(recomposition[layerCode].continuous_sha256, expectedRecomposition[layerCode].continuous_sha256);
}

const report = {
  validation: "full_dataset_pglite",
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  migration_applied: true,
  import_executed_as_single_atomic_sql: true,
  remote_write_executed: false,
  atomic_sql_sha256: plan.summary.statement_sha256,
  atomic_sql_bytes: plan.summary.atomic_sql_bytes,
  cardinalities: actual,
  tei_semantic_counts: {
    unclear_elements: dataset.counts.unclear_elements,
    unclear_line_units: dataset.counts.unclear_units,
    unclear_catchwords: dataset.counts.unclear_elements - dataset.counts.unclear_units,
    gap_elements: dataset.counts.gap_elements,
  },
  available_modes: availableModes,
  foliation: foliationResult.rows[0],
  recomposition,
  image_provenance: expectedImageControl,
  status_update_exact: statusResult.rows[0].statut_corpus_public === TR0009_PUBLIC_STATUS,
  forbidden_writes: { versets_v2: 0, bible_canonical_alignments: 0 },
  modernized_imported: false,
  passed: true,
};
await mkdir(validationDirectory, { recursive: true });
await writeFile(path.join(validationDirectory, "FULL_DATASET_PGLITE_VALIDATION.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
await db.close();
