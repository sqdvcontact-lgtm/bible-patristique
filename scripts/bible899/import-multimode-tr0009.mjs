import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { sha256 } from "./multimode-dataset.mjs";

const ROOT = process.cwd();
const PREPARED = path.resolve(ROOT, "work", "bible899", "multimode", "prepared");
const VALIDATION = path.resolve(ROOT, "work", "bible899", "multimode", "validation");
const MIGRATION = path.resolve(ROOT, "sql", "20260807_bible_multimode_model.sql");
const AUTHORIZATION = "ALLOW_REMOTE_BIBLE899_MULTIMODE";
const MAX_ATOMIC_SQL_BYTES = 128 * 1024 * 1024;
export const TR0009_PUBLIC_STATUS = "Transcription intégrale du manuscrit. Première campagne de relecture achevée ; certaines lectures demeurent signalées comme incertaines. Les modes diplomatique, abréviations développées et structure native sont disponibles. L’alignement canonique en versets reste à établir.";

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Nombre SQL invalide : ${value}`);
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function chunks(rows, size) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

function assertNoForbiddenWrite(sql) {
  const normalized = sql.replace(/--.*$/gmu, " ").replace(/\s+/gu, " ").toLowerCase();
  for (const table of ["versets_v2", "bible_canonical_alignments"]) {
    if (new RegExp(`\\b(insert\\s+into|update|delete\\s+from|merge\\s+into|truncate(?:\\s+table)?)\\s+(?:public\\.)?${table}\\b`, "u").test(normalized)) {
      throw new Error(`Écriture interdite détectée vers ${table}`);
    }
  }
}

export function unitBatchSql(source, rows) {
  const values = rows.map((row) => `(${[
    row.source_unit_key, row.unit_type, row.material_order, row.surface_key,
    row.material_leaf_sequence, row.side, row.column_id, row.column_label,
    row.line_no, row.native_folio_raw, row.native_folio_number,
    row.native_folio_status, row.break_no, row.has_unclear, row.has_gap,
  ].map(sqlLiteral).join(",")},${jsonLiteral(row.material_features)})`).join(",\n");
  return `insert into public.bible_source_units (
    source_id, source_unit_key, unit_kind, material_order, surface_key,
    material_leaf_sequence, side, column_id, column_label, line_no,
    native_folio_raw, native_folio_number, native_folio_status,
    break_no, has_unclear, has_gap, material_features
  )
  select s.id, v.* from public.bible_text_sources s
  cross join (values ${values}) as v(
    source_unit_key, unit_kind, material_order, surface_key,
    material_leaf_sequence, side, column_id, column_label, line_no,
    native_folio_raw, native_folio_number, native_folio_status,
    break_no, has_unclear, has_gap, material_features
  )
  where s.trad_id=${sqlLiteral(source.trad_id)} and s.source_code=${sqlLiteral(source.source_code)} and s.version_label=${sqlLiteral(source.version_label)};`;
}

export function textBatchSql(source, rows) {
  const values = rows.map((row) => `(${sqlLiteral(row.source_unit_key)},${sqlLiteral(row.layer_code)},${sqlLiteral(row.text_content)},${sqlLiteral(row.source_markup)},${jsonLiteral(row.text_features)})`).join(",\n");
  return `insert into public.bible_source_unit_texts (
    source_id, unit_id, layer_id, layer_code, text_content, source_markup, text_features
  )
  select s.id, u.id, l.id, v.layer_code, v.text_content, v.source_markup, v.text_features
  from public.bible_text_sources s
  cross join (values ${values}) as v(source_unit_key, layer_code, text_content, source_markup, text_features)
  join public.bible_source_units u on u.source_id=s.id and u.source_unit_key=v.source_unit_key
  join public.bible_text_layers l on l.source_id=s.id and l.layer_code=v.layer_code
  where s.trad_id=${sqlLiteral(source.trad_id)} and s.source_code=${sqlLiteral(source.source_code)} and s.version_label=${sqlLiteral(source.version_label)};`;
}

export function divisionBatchSql(source, rows) {
  const values = rows.map((row) => `(${[
    row.parent_stable_key, row.division_kind, row.sequence_no, row.sequence_in_parent,
    row.stable_key, row.label_diplomatic, row.proposed_book_code,
    row.manuscript_number_raw, row.manuscript_number, row.expected_sequence,
    row.marker_type, row.marker_status, row.number_status, row.confidence,
    row.requires_review, row.validation_status, row.is_public, row.start_unit_key,
    row.end_unit_key, row.notes,
  ].map(sqlLiteral).join(",")},${jsonLiteral(row.metadata)})`).join(",\n");
  return `insert into public.bible_native_divisions (
    source_id, parent_id, division_kind, sequence_no, sequence_in_parent, stable_key,
    label_diplomatic, proposed_book_code, manuscript_number_raw, manuscript_number,
    expected_sequence, marker_type, marker_status, number_status, confidence,
    requires_review, validation_status, is_public, start_unit_id, end_unit_id, notes, metadata
  )
  select s.id, parent.id, v.division_kind, v.sequence_no, v.sequence_in_parent, v.stable_key,
    v.label_diplomatic, v.proposed_book_code, v.manuscript_number_raw, v.manuscript_number::integer,
    v.expected_sequence::integer, v.marker_type, v.marker_status, v.number_status, v.confidence,
    v.requires_review, v.validation_status, false, first_unit.id, last_unit.id, v.notes, v.metadata
  from public.bible_text_sources s
  cross join (values ${values}) as v(
    parent_stable_key, division_kind, sequence_no, sequence_in_parent, stable_key,
    label_diplomatic, proposed_book_code, manuscript_number_raw, manuscript_number,
    expected_sequence, marker_type, marker_status, number_status, confidence,
    requires_review, validation_status, is_public, start_unit_key, end_unit_key, notes, metadata
  )
  left join public.bible_native_divisions parent on parent.source_id=s.id and parent.stable_key=v.parent_stable_key
  join public.bible_source_units first_unit on first_unit.source_id=s.id and first_unit.source_unit_key=v.start_unit_key
  join public.bible_source_units last_unit on last_unit.source_id=s.id and last_unit.source_unit_key=v.end_unit_key
  where s.trad_id=${sqlLiteral(source.trad_id)} and s.source_code=${sqlLiteral(source.source_code)} and s.version_label=${sqlLiteral(source.version_label)};`;
}

function provenanceKind(record) {
  return ["tei", "facsimile", "editorial_decision", "algorithm", "secondary_witness", "other"].includes(record.provenance_type)
    ? record.provenance_type
    : "other";
}

export function provenanceBatchSql(source, rows) {
  const values = rows.map((row) => `(${[
    row.provenance_key, provenanceKind(row), row.locator || row.uri,
    row.locator, row.uri, row.metadata.public_path ?? null, row.sha256,
    row.metadata.width ?? null, row.metadata.height ?? null,
    ["PRIMARY", "ALTERNATIVE"].includes(row.role) ? row.role : null,
  ].map(sqlLiteral).join(",")},${jsonLiteral({ ...row.metadata, original_kind: row.provenance_type, source_role: row.role })})`).join(",\n");
  return `insert into public.bible_provenance_records (
    source_id, provenance_key, provenance_kind, citation, locator, uri, file_path,
    sha256, width_px, height_px, asset_role, details
  )
  select s.id, v.* from public.bible_text_sources s
  cross join (values ${values}) as v(
    provenance_key, kind, citation, locator, uri, file_path,
    sha256, width_px, height_px, asset_role, details
  )
  where s.trad_id=${sqlLiteral(source.trad_id)} and s.source_code=${sqlLiteral(source.source_code)} and s.version_label=${sqlLiteral(source.version_label)};`;
}

export function provenanceLinkBatchSql(source, rows) {
  const values = rows.map((row) => `(${sqlLiteral(row.provenance_key)},${sqlLiteral(row.target_type)},${sqlLiteral(row.target_key)},${sqlLiteral(row.relation_type === "facsimile_alternative" ? "evidence" : "source")},${jsonLiteral(row.metadata)})`).join(",\n");
  return `insert into public.bible_provenance_links (
    source_id, provenance_id, role, unit_id, division_id, segment_id, alignment_id
  )
  select s.id, p.id, v.role,
    case when v.target_type='source_unit' then u.id end,
    case when v.target_type='native_division' then d.id end,
    null, null
  from public.bible_text_sources s
  cross join (values ${values}) as v(provenance_key, target_type, target_key, role, details)
  join public.bible_provenance_records p on p.source_id=s.id and p.provenance_key=v.provenance_key
  left join public.bible_source_units u on v.target_type='source_unit' and u.source_id=s.id and u.source_unit_key=v.target_key
  left join public.bible_native_divisions d on v.target_type='native_division' and d.source_id=s.id and d.stable_key=v.target_key
  where s.trad_id=${sqlLiteral(source.trad_id)} and s.source_code=${sqlLiteral(source.source_code)} and s.version_label=${sqlLiteral(source.version_label)};`;
}

async function readNdjson(file) {
  const text = await readFile(path.join(PREPARED, file), "utf8");
  return text.trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

export async function loadPrepared() {
  const checksums = Object.fromEntries((await readFile(path.join(PREPARED, "SHA256SUMS.txt"), "utf8"))
    .trim().split(/\r?\n/u).map((line) => {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
      if (!match) throw new Error(`Ligne SHA256SUMS invalide : ${line}`);
      return [match[2], match[1]];
    }));
  for (const [file, expected] of Object.entries(checksums)) {
    const actual = sha256(await readFile(path.join(PREPARED, file)));
    if (actual !== expected) throw new Error(`Empreinte préparée divergente : ${file}`);
  }
  return {
    source: JSON.parse(await readFile(path.join(PREPARED, "source.json"), "utf8")),
    layers: JSON.parse(await readFile(path.join(PREPARED, "layers.json"), "utf8")),
    units: await readNdjson("units.ndjson"),
    texts: await readNdjson("texts.ndjson"),
    divisions: await readNdjson("native_divisions.ndjson"),
    provenanceRecords: await readNdjson("provenance_records.ndjson"),
    provenanceLinks: await readNdjson("provenance_links.ndjson"),
    counts: JSON.parse(await readFile(path.join(PREPARED, "counts.json"), "utf8")),
    checksums,
  };
}

async function validateMigrationContract() {
  const sql = await readFile(MIGRATION, "utf8");
  const lower = sql.toLowerCase();
  const required = [
    "create table public.bible_text_sources",
    "create table public.bible_source_units",
    "source_unit_key text not null",
    "native_folio_number integer",
    "create table public.bible_source_unit_texts",
    "layer_id uuid not null",
    "create table public.bible_native_divisions",
    "create table public.bible_provenance_records",
    "provenance_kind text not null",
    "create table public.bible_provenance_links",
    "num_nonnulls(unit_id, division_id, segment_id, alignment_id) = 1",
    "with (security_invoker = true)",
    "notify pgrst, 'reload schema'",
  ];
  for (const fragment of required) if (!lower.includes(fragment)) throw new Error(`Contrat de migration incomplet : ${fragment}`);
  if (lower.includes("security definer")) throw new Error("SECURITY DEFINER interdit dans la migration multimode");
  if (/trad_id\s*=\s*'tr0009'/u.test(lower)) throw new Error("Contrainte TR0009 codée en dur dans le schéma générique");
  for (const target of ["versets_v2", "versets_canon", "traductions"]) {
    if (new RegExp(`\\b(insert\\s+into|update|delete\\s+from|truncate(?:\\s+table)?)\\s+(?:public\\.)?${target}\\b`, "u").test(lower)) {
      throw new Error(`Migration additive violée : écriture vers ${target}`);
    }
  }
  return { path: path.relative(ROOT, MIGRATION).replaceAll("\\", "/"), sha256: sha256(sql) };
}

function sourceAndLayersSql(source, layers) {
  const layerValues = layers.map((layer) => `(${sqlLiteral(layer.layer_code)},${sqlLiteral(layer.label)},${sqlLiteral(layer.layer_kind)},${sqlLiteral(layer.validation_status)},false,${jsonLiteral(layer.transformation_rules)})`).join(",");
  return `do $bible899_stage$ declare sid uuid; begin
    if exists(select 1 from public.versets_v2 where trad_id=${sqlLiteral(source.trad_id)}) then raise exception 'TR0009 présent dans versets_v2'; end if;
    if exists(select 1 from public.bible_text_sources where trad_id=${sqlLiteral(source.trad_id)}) then raise exception 'Source TR0009 multimode déjà présente'; end if;
    insert into public.bible_text_sources(trad_id,source_code,title,source_kind,version_label,source_uri,source_sha256,status,metadata)
    values(${sqlLiteral(source.trad_id)},${sqlLiteral(source.source_code)},${sqlLiteral(source.title)},${sqlLiteral(source.source_kind)},${sqlLiteral(source.version_label)},${sqlLiteral(source.source_uri)},${sqlLiteral(source.source_sha256)},'draft',${jsonLiteral(source.metadata)}) returning id into sid;
    insert into public.bible_text_layers(source_id,layer_code,label,layer_kind,validation_status,is_public,transformation_rules)
    select sid,v.* from (values ${layerValues}) v(layer_code,label,layer_kind,validation_status,is_public,transformation_rules);
  end $bible899_stage$;`;
}

function finalizationSql(source, counts) {
  return `do $bible899_publish$ declare sid uuid; n bigint; begin
    select id into strict sid from public.bible_text_sources where trad_id=${sqlLiteral(source.trad_id)} and source_code=${sqlLiteral(source.source_code)} and version_label=${sqlLiteral(source.version_label)} and status='draft';
    select count(*) into n from public.bible_source_units where source_id=sid; if n<>${counts.units} then raise exception 'unités: %',n; end if;
    select count(*) into n from public.bible_source_unit_texts where source_id=sid; if n<>${counts.texts} then raise exception 'textes: %',n; end if;
    select count(*) into n from public.bible_text_layers where source_id=sid; if n<>2 then raise exception 'couches: %',n; end if;
    select count(*) into n from public.bible_source_unit_texts where source_id=sid and layer_code='diplomatic'; if n<>${counts.units} then raise exception 'textes diplomatic: %',n; end if;
    select count(*) into n from public.bible_source_unit_texts where source_id=sid and layer_code='expanded'; if n<>${counts.units} then raise exception 'textes expanded: %',n; end if;
    select count(*) into n from public.bible_native_divisions where source_id=sid and division_kind='book'; if n<>${counts.books} then raise exception 'livres: %',n; end if;
    select count(*) into n from public.bible_native_divisions where source_id=sid and division_kind='chapter'; if n<>${counts.chapters} then raise exception 'chapitres: %',n; end if;
    select count(*) into n from public.bible_native_divisions where source_id=sid; if n<>${counts.native_divisions} then raise exception 'divisions: %',n; end if;
    select count(*) into n from public.bible_source_units where source_id=sid and has_unclear; if n<>${counts.unclear_units} then raise exception 'unités unclear: %',n; end if;
    select count(*) into n from public.bible_source_units where source_id=sid and has_gap; if n<>${counts.gap_units} then raise exception 'unités gap: %',n; end if;
    select count(*) into n from public.bible_source_units where source_id=sid and break_no; if n<>${counts.break_no_units} then raise exception 'break_no: %',n; end if;
    if exists(select 1 from public.bible_source_units where source_id=sid and native_folio_number=296) then raise exception 'folio natif 296 fabriqué'; end if;
    if not exists(select 1 from public.bible_source_units where source_id=sid and material_order=${counts.units} and native_folio_number=372 and side='v') then raise exception 'dernière cote native différente de 372v'; end if;
    if exists(select 1 from public.bible_source_unit_texts t left join public.bible_source_units u on u.source_id=t.source_id and u.id=t.unit_id where t.source_id=sid and u.id is null) then raise exception 'texte orphelin'; end if;
    if exists(select 1 from public.bible_native_divisions d left join public.bible_source_units u on u.source_id=d.source_id and u.id=d.start_unit_id where d.source_id=sid and u.id is null) then raise exception 'division orpheline'; end if;
    select count(*) into n from public.bible_provenance_records where source_id=sid and provenance_kind='facsimile' and asset_role='PRIMARY'; if n<>${counts.primary_images} then raise exception 'images primary: %',n; end if;
    select count(*) into n from public.bible_provenance_records where source_id=sid and provenance_kind='facsimile' and asset_role='ALTERNATIVE'; if n<>${counts.alternative_images} then raise exception 'images alternatives: %',n; end if;
    select count(*) into n from public.bible_provenance_records where source_id=sid; if n<>${counts.provenance_records} then raise exception 'provenances: %',n; end if;
    select count(*) into n from public.bible_provenance_links where source_id=sid; if n<>${counts.provenance_links} then raise exception 'liens provenance: %',n; end if;
    if exists(select 1 from public.versets_v2 where trad_id=${sqlLiteral(source.trad_id)}) then raise exception 'TR0009 présent dans versets_v2'; end if;
    if exists(select 1 from public.bible_canonical_alignments where source_id=sid) then raise exception 'alignement canonique TR0009 interdit'; end if;
    update public.bible_text_layers set is_public=true where source_id=sid and layer_code in ('diplomatic','expanded') and validation_status='validated';
    update public.bible_native_divisions set is_public=true where source_id=sid and validation_status='validated';
    update public.bible_text_sources set status='published' where id=sid;
    update public.traductions set statut_corpus_public=${sqlLiteral(TR0009_PUBLIC_STATUS)} where trad_id=${sqlLiteral(source.trad_id)};
    get diagnostics n=row_count; if n<>1 then raise exception 'fiche traduction: %',n; end if;
  end $bible899_publish$;`;
}

export function buildPlan(dataset) {
  if (dataset.layers.some((layer) => layer.layer_code === "modernized")) {
    throw new Error("La couche modernized ne doit jamais être importée");
  }
  const books = dataset.divisions.filter((row) => row.division_kind === "book");
  const chapters = dataset.divisions.filter((row) => row.division_kind === "chapter");
  const statements = [sourceAndLayersSql(dataset.source, dataset.layers)];
  statements.push(...chunks(dataset.units, 250).map((rows) => unitBatchSql(dataset.source, rows)));
  statements.push(...chunks(dataset.texts, 150).map((rows) => textBatchSql(dataset.source, rows)));
  statements.push(...chunks(books, 100).map((rows) => divisionBatchSql(dataset.source, rows)));
  statements.push(...chunks(chapters, 100).map((rows) => divisionBatchSql(dataset.source, rows)));
  statements.push(...chunks(dataset.provenanceRecords, 200).map((rows) => provenanceBatchSql(dataset.source, rows)));
  statements.push(...chunks(dataset.provenanceLinks, 250).map((rows) => provenanceLinkBatchSql(dataset.source, rows)));
  statements.push(finalizationSql(dataset.source, dataset.counts));
  for (const statement of statements) assertNoForbiddenWrite(statement);
  const atomicSql = `begin;\n${statements.join("\n")}\ncommit;\n`;
  const atomicBytes = Buffer.byteLength(atomicSql, "utf8");
  return {
    statements,
    atomicSql,
    summary: {
      mode: "single_rpc_atomic_transaction",
      rpc_calls_on_apply: 1,
      statements: statements.length,
      statement_sha256: sha256(atomicSql),
      atomic_sql_bytes: atomicBytes,
      atomic_sql_limit_bytes: MAX_ATOMIC_SQL_BYTES,
      apply_allowed_by_size: atomicBytes <= MAX_ATOMIC_SQL_BYTES,
      maximum_statement_bytes: Math.max(...statements.map((statement) => Buffer.byteLength(statement, "utf8"))),
      units: dataset.units.length,
      texts: dataset.texts.length,
      divisions: dataset.divisions.length,
      provenance_records: dataset.provenanceRecords.length,
      provenance_links: dataset.provenanceLinks.length,
      forbidden_targets: ["public.versets_v2", "public.bible_canonical_alignments", "modernized"],
    },
  };
}

async function executePlan(plan) {
  if (!process.argv.includes("--apply")) return;
  const tokenIndex = process.argv.indexOf("--authorization-token");
  if (process.argv[tokenIndex + 1] !== AUTHORIZATION || process.env.BIBLE899_MULTIMODE_REMOTE_WRITE_AUTHORIZED !== AUTHORIZATION) {
    throw new Error("--apply refusé : double autorisation explicite absente");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase service-role absentes");
  if (Buffer.byteLength(plan.atomicSql, "utf8") > MAX_ATOMIC_SQL_BYTES) {
    throw new Error(`--apply refusé : transaction SQL supérieure à ${MAX_ATOMIC_SQL_BYTES} octets`);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.rpc("exec_sql", { sql: plan.atomicSql });
  if (error) throw new Error(`Transaction atomique annulée : ${error.message}`);
}

async function main() {
  const dataset = await loadPrepared();
  const migration = await validateMigrationContract();
  const plan = buildPlan(dataset);
  const report = {
    generated_from: PREPARED,
    dry_run: !process.argv.includes("--apply"),
    remote_write_executed: false,
    migration,
    ...plan.summary,
    prepared_sha256: dataset.checksums,
  };
  await import("node:fs/promises").then(({ mkdir }) => mkdir(VALIDATION, { recursive: true }));
  await writeFile(path.join(VALIDATION, "IMPORT_DRY_RUN.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(VALIDATION, "TR0009_ATOMIC_IMPORT.sql"), plan.atomicSql, "utf8");
  await writeFile(path.join(VALIDATION, "TR0009_ATOMIC_IMPORT_SHA256.txt"), `${plan.summary.statement_sha256}  TR0009_ATOMIC_IMPORT.sql\n`, "utf8");
  const statusPatch = `-- Préparé uniquement ; déjà inclus dans la transaction atomique future.\nupdate public.traductions\nset statut_corpus_public=${sqlLiteral(TR0009_PUBLIC_STATUS)}\nwhere trad_id='TR0009';\n`;
  await writeFile(path.join(VALIDATION, "TR0009_STATUS_UPDATE_PREPARED.sql"), statusPatch, "utf8");
  console.log(JSON.stringify(report, null, 2));
  await executePlan(plan);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
