import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { loadPrepared } from "./import-multimode-tr0009.mjs";
import { sha256 } from "./multimode-dataset.mjs";

const ROOT = process.cwd();
const AUTHORIZATION = "ALLOW_REMOTE_BIBLE899_STAGED_IMPORT";
const EXPECTED_PROJECT = "oucotpxcjalwgetylfbz";
const DEFAULT_PROGRESS = path.resolve(
  ROOT,
  "work",
  "bible899",
  "multimode",
  "remote-staging",
  "REMOTE_IMPORT_PROGRESS.json",
);
const UUID_NAMESPACE = "c5944f13-ad71-5f3d-a91f-b020df128fc8";

export const BATCH_SIZES = Object.freeze({
  bible_text_sources: 1,
  bible_text_layers: 2,
  bible_source_units: 200,
  bible_source_unit_texts: 150,
  bible_native_divisions: 100,
  bible_provenance_records: 100,
  bible_provenance_links: 200,
});

const PHASES = [
  "bible_text_sources",
  "bible_text_layers",
  "bible_source_units",
  "bible_source_unit_texts",
  "bible_native_divisions",
  "bible_provenance_records",
  "bible_provenance_links",
];

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function uuidBytes(uuid) {
  const compact = uuid.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/iu.test(compact)) throw new Error(`UUID invalide : ${uuid}`);
  return Buffer.from(compact, "hex");
}

export function uuidV5(namespace, name) {
  const digest = createHash("sha1").update(uuidBytes(namespace)).update(String(name), "utf8").digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function fingerprint(checksums) {
  return sha256(JSON.stringify(Object.entries(checksums).sort(([a], [b]) => a.localeCompare(b))));
}

function provenanceKind(value) {
  return ["tei", "facsimile", "editorial_decision", "algorithm", "secondary_witness", "other"].includes(value)
    ? value
    : "other";
}

function ids(dataset) {
  const sourceSeed = `${dataset.source.trad_id}|${dataset.source.source_code}|${dataset.source.version_label}|${dataset.source.source_sha256}`;
  const sourceId = uuidV5(UUID_NAMESPACE, `source:${sourceSeed}`);
  const layerId = (code) => uuidV5(UUID_NAMESPACE, `${sourceId}:layer:${code}`);
  const unitId = (key) => uuidV5(UUID_NAMESPACE, `${sourceId}:unit:${key}`);
  const divisionId = (key) => uuidV5(UUID_NAMESPACE, `${sourceId}:division:${key}`);
  const provenanceId = (key) => uuidV5(UUID_NAMESPACE, `${sourceId}:provenance:${key}`);
  return { sourceId, layerId, unitId, divisionId, provenanceId };
}

export function buildRemoteRows(dataset) {
  if (dataset.source.trad_id !== "TR0009") throw new Error("Le dataset distant doit viser TR0009");
  if (dataset.layers.some((row) => row.layer_code === "modernized")) throw new Error("Couche modernized interdite");
  const stable = ids(dataset);
  const source = [{
    id: stable.sourceId,
    trad_id: dataset.source.trad_id,
    source_code: dataset.source.source_code,
    title: dataset.source.title,
    source_kind: dataset.source.source_kind,
    version_label: dataset.source.version_label,
    source_uri: dataset.source.source_uri,
    source_sha256: dataset.source.source_sha256,
    status: "review",
    metadata: dataset.source.metadata,
  }];
  const layers = dataset.layers.map((row) => ({
    id: stable.layerId(row.layer_code),
    source_id: stable.sourceId,
    layer_code: row.layer_code,
    label: row.label,
    layer_kind: row.layer_kind,
    validation_status: row.validation_status,
    is_public: false,
    transformation_rules: row.transformation_rules,
  }));
  const units = dataset.units.map((row) => ({
    id: stable.unitId(row.source_unit_key),
    source_id: stable.sourceId,
    source_unit_key: row.source_unit_key,
    unit_kind: row.unit_type,
    material_order: row.material_order,
    surface_key: row.surface_key,
    material_leaf_sequence: row.material_leaf_sequence,
    side: row.side,
    column_id: row.column_id,
    column_label: row.column_label,
    line_no: row.line_no,
    native_folio_raw: row.native_folio_raw,
    native_folio_number: row.native_folio_number,
    native_folio_status: row.native_folio_status,
    break_no: row.break_no,
    has_unclear: row.has_unclear,
    has_gap: row.has_gap,
    material_features: row.material_features,
  }));
  const texts = dataset.texts.map((row) => ({
    id: uuidV5(UUID_NAMESPACE, `${stable.sourceId}:text:${row.source_unit_key}:${row.layer_code}`),
    source_id: stable.sourceId,
    unit_id: stable.unitId(row.source_unit_key),
    layer_id: stable.layerId(row.layer_code),
    layer_code: row.layer_code,
    text_content: row.text_content,
    source_markup: row.source_markup,
    text_features: row.text_features,
  }));
  const orderedDivisions = [
    ...dataset.divisions.filter((row) => row.division_kind === "book"),
    ...dataset.divisions.filter((row) => row.division_kind !== "book"),
  ];
  const divisions = orderedDivisions.map((row) => ({
    id: stable.divisionId(row.stable_key),
    source_id: stable.sourceId,
    parent_id: row.parent_stable_key ? stable.divisionId(row.parent_stable_key) : null,
    division_kind: row.division_kind,
    sequence_no: row.sequence_no,
    sequence_in_parent: row.sequence_in_parent,
    stable_key: row.stable_key,
    label_diplomatic: row.label_diplomatic,
    proposed_book_code: row.proposed_book_code,
    manuscript_number_raw: row.manuscript_number_raw,
    manuscript_number: row.manuscript_number,
    expected_sequence: row.expected_sequence,
    marker_type: row.marker_type,
    marker_status: row.marker_status,
    number_status: row.number_status,
    confidence: row.confidence,
    requires_review: row.requires_review,
    start_unit_id: stable.unitId(row.start_unit_key),
    end_unit_id: stable.unitId(row.end_unit_key),
    validation_status: row.validation_status,
    is_public: false,
    notes: row.notes,
    metadata: row.metadata,
  }));
  const provenanceRecords = dataset.provenanceRecords.map((row) => ({
    id: stable.provenanceId(row.provenance_key),
    source_id: stable.sourceId,
    provenance_key: row.provenance_key,
    provenance_kind: provenanceKind(row.provenance_type),
    citation: row.locator || row.uri,
    locator: row.locator,
    uri: row.uri,
    file_path: row.metadata.public_path ?? null,
    sha256: row.sha256,
    width_px: row.metadata.width ?? null,
    height_px: row.metadata.height ?? null,
    asset_role: ["PRIMARY", "ALTERNATIVE"].includes(row.role) ? row.role : null,
    details: { ...row.metadata, original_kind: row.provenance_type, source_role: row.role },
  }));
  const provenanceLinks = dataset.provenanceLinks.map((row) => {
    const unitId = row.target_type === "source_unit" ? stable.unitId(row.target_key) : null;
    const divisionId = row.target_type === "native_division" ? stable.divisionId(row.target_key) : null;
    return {
      id: uuidV5(UUID_NAMESPACE, `${stable.sourceId}:provenance-link:${row.provenance_key}:${row.target_type}:${row.target_key}`),
      source_id: stable.sourceId,
      provenance_id: stable.provenanceId(row.provenance_key),
      role: row.relation_type === "facsimile_alternative" ? "evidence" : "source",
      unit_id: unitId,
      division_id: divisionId,
      segment_id: null,
      alignment_id: null,
    };
  });
  return {
    bible_text_sources: source,
    bible_text_layers: layers,
    bible_source_units: units,
    bible_source_unit_texts: texts,
    bible_native_divisions: divisions,
    bible_provenance_records: provenanceRecords,
    bible_provenance_links: provenanceLinks,
  };
}

export function validateRemoteRows(dataset, rowsByTable) {
  const sourceId = rowsByTable.bible_text_sources[0]?.id;
  if (!sourceId) throw new Error("Source distante préparée absente");
  for (const table of PHASES) {
    const rows = rowsByTable[table];
    const uniqueIds = new Set(rows.map((row) => row.id));
    if (uniqueIds.size !== rows.length) throw new Error(`${table} : UUID déterministe dupliqué`);
    if (rows.some((row) => row.source_id && row.source_id !== sourceId)) throw new Error(`${table} : source_id divergent`);
  }
  const unitIds = new Set(rowsByTable.bible_source_units.map((row) => row.id));
  const layerIds = new Set(rowsByTable.bible_text_layers.map((row) => row.id));
  const divisionIds = new Set(rowsByTable.bible_native_divisions.map((row) => row.id));
  const provenanceIds = new Set(rowsByTable.bible_provenance_records.map((row) => row.id));
  if (rowsByTable.bible_source_unit_texts.some((row) => !unitIds.has(row.unit_id) || !layerIds.has(row.layer_id))) {
    throw new Error("Texte préparé avec unité ou couche absente");
  }
  if (rowsByTable.bible_native_divisions.some((row) => !unitIds.has(row.start_unit_id) || !unitIds.has(row.end_unit_id) || (row.parent_id && !divisionIds.has(row.parent_id)))) {
    throw new Error("Division préparée avec borne ou parent absent");
  }
  if (rowsByTable.bible_provenance_links.some((row) => !provenanceIds.has(row.provenance_id) || Number(Boolean(row.unit_id)) + Number(Boolean(row.division_id)) !== 1)) {
    throw new Error("Lien de provenance préparé invalide");
  }
  if (rowsByTable.bible_text_sources.some((row) => row.status !== "review") || rowsByTable.bible_text_layers.some((row) => row.is_public) || rowsByTable.bible_native_divisions.some((row) => row.is_public)) {
    throw new Error("Préparation distante non cachée");
  }
  const expected = {
    bible_text_sources: 1,
    bible_text_layers: dataset.layers.length,
    bible_source_units: dataset.counts.units,
    bible_source_unit_texts: dataset.counts.texts,
    bible_native_divisions: dataset.counts.native_divisions,
    bible_provenance_records: dataset.counts.provenance_records,
    bible_provenance_links: dataset.counts.provenance_links,
  };
  for (const [table, count] of Object.entries(expected)) {
    if (rowsByTable[table].length !== count) throw new Error(`${table} : ${rowsByTable[table].length}/${count}`);
  }
  return true;
}

function initialProgress(dataset, rows) {
  const datasetFingerprint = fingerprint(dataset.checksums);
  return {
    mode: "staged_resumable_remote_import",
    project_id: EXPECTED_PROJECT,
    dataset_fingerprint: datasetFingerprint,
    dataset_checksums: dataset.checksums,
    source_id: rows.bible_text_sources[0].id,
    source_created: false,
    layers_created: 0,
    last_material_order: 0,
    diplomatic_texts: 0,
    expanded_texts: 0,
    last_division: 0,
    last_provenance_record: 0,
    last_provenance_link: 0,
    remote_batches_validated: 0,
    completed: false,
    phases: Object.fromEntries(PHASES.map((phase) => [phase, { next_index: 0, total: rows[phase].length }])),
  };
}

async function saveProgress(progressPath, progress) {
  await mkdir(path.dirname(progressPath), { recursive: true });
  const temporary = `${progressPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ ...progress, updated_at: new Date().toISOString() }, null, 2)}\n`, "utf8");
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(temporary, progressPath);
      break;
    } catch (error) {
      if (error?.code !== "EPERM" || attempt >= 8) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 40));
    }
  }
}

async function loadProgress(progressPath, expected) {
  try {
    const existing = JSON.parse(await readFile(progressPath, "utf8"));
    if (existing.dataset_fingerprint !== expected.dataset_fingerprint) {
      throw new Error("Empreinte du dataset différente : reprise distante bloquée");
    }
    if (existing.project_id !== EXPECTED_PROJECT || existing.source_id !== expected.source_id) {
      throw new Error("Projet ou source de progression différent : reprise distante bloquée");
    }
    return existing;
  } catch (error) {
    if (error?.code === "ENOENT") return expected;
    throw error;
  }
}

function selectColumns(rows) {
  return Object.keys(rows[0]).join(",");
}

async function fetchExact(db, table, rows) {
  if (rows.length === 0) return;
  const { data, error } = await db.from(table).select(selectColumns(rows)).in("id", rows.map((row) => row.id));
  if (error) throw new Error(`${table} : relecture distante impossible : ${error.message}`);
  if (data.length !== rows.length) throw new Error(`${table} : ${data.length}/${rows.length} lignes relues`);
  const byId = new Map(data.map((row) => [row.id, row]));
  for (const expected of rows) {
    const actual = byId.get(expected.id);
    if (!actual || !same(actual, expected)) {
      throw new Error(`${table} : divergence distante pour ${expected.id}`);
    }
  }
}

async function verifyCompletedPrefix(db, rowsByTable, progress) {
  for (const table of PHASES) {
    const imported = progress.phases[table]?.next_index ?? 0;
    for (let index = 0; index < imported; index += 200) {
      await fetchExact(db, table, rowsByTable[table].slice(index, Math.min(index + 200, imported)));
    }
  }
}

function updateSummary(progress, table, batch) {
  if (table === "bible_text_sources") progress.source_created = true;
  if (table === "bible_text_layers") progress.layers_created = progress.phases[table].next_index;
  if (table === "bible_source_units") progress.last_material_order = batch.at(-1)?.material_order ?? progress.last_material_order;
  if (table === "bible_source_unit_texts") {
    progress.diplomatic_texts += batch.filter((row) => row.layer_code === "diplomatic").length;
    progress.expanded_texts += batch.filter((row) => row.layer_code === "expanded").length;
  }
  if (table === "bible_native_divisions") progress.last_division = progress.phases[table].next_index;
  if (table === "bible_provenance_records") progress.last_provenance_record = progress.phases[table].next_index;
  if (table === "bible_provenance_links") progress.last_provenance_link = progress.phases[table].next_index;
}

async function importBatches(db, rowsByTable, progress, progressPath) {
  await verifyCompletedPrefix(db, rowsByTable, progress);
  for (const table of PHASES) {
    const phase = progress.phases[table];
    const rows = rowsByTable[table];
    const size = BATCH_SIZES[table];
    while (phase.next_index < rows.length) {
      const batch = rows.slice(phase.next_index, phase.next_index + size);
      const { error } = await db.from(table).upsert(batch, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(`${table} lot ${phase.next_index} : ${error.message}`);
      await fetchExact(db, table, batch);
      phase.next_index += batch.length;
      progress.remote_batches_validated += 1;
      updateSummary(progress, table, batch);
      await saveProgress(progressPath, progress);
    }
  }
}

async function countRows(db, table, sourceId, extra = undefined) {
  const sourceColumn = table === "bible_text_sources" ? "id" : "source_id";
  let query = db.from(table).select("id", { count: "exact", head: true }).eq(sourceColumn, sourceId);
  if (extra) query = extra(query);
  const { count, error } = await query;
  if (error) throw new Error(`${table} : comptage distant impossible : ${error.message}`);
  return count;
}

async function fetchAll(db, table, columns, filter) {
  const output = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(columns).range(from, from + 999);
    query = filter(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table} : lecture distante impossible : ${error.message}`);
    output.push(...data);
    if (data.length < 1000) return output;
  }
}

async function validateRemote(db, dataset, rowsByTable, progress) {
  const sourceId = progress.source_id;
  const counts = {
    sources: await countRows(db, "bible_text_sources", sourceId),
    layers: await countRows(db, "bible_text_layers", sourceId),
    units: await countRows(db, "bible_source_units", sourceId),
    texts: await countRows(db, "bible_source_unit_texts", sourceId),
    divisions: await countRows(db, "bible_native_divisions", sourceId),
    provenance_records: await countRows(db, "bible_provenance_records", sourceId),
    provenance_links: await countRows(db, "bible_provenance_links", sourceId),
    alignments: await countRows(db, "bible_canonical_alignments", sourceId),
  };
  const expected = {
    sources: 1,
    layers: 2,
    units: dataset.counts.units,
    texts: dataset.counts.texts,
    divisions: dataset.counts.native_divisions,
    provenance_records: dataset.counts.provenance_records,
    provenance_links: dataset.counts.provenance_links,
    alignments: 0,
  };
  if (!same(counts, expected)) throw new Error(`Comptages distants divergents : ${JSON.stringify(counts)}`);

  const remoteUnits = await fetchAll(
    db,
    "bible_source_units",
    "id,material_order,native_folio_number,side,break_no,has_unclear,has_gap",
    (query) => query.eq("source_id", sourceId).order("material_order"),
  );
  if (remoteUnits.some((row) => row.native_folio_number === 296)) throw new Error("Folio natif 296 fabriqué");
  const finalUnit = remoteUnits.at(-1);
  if (finalUnit.material_order !== dataset.counts.units || finalUnit.native_folio_number !== 372 || finalUnit.side !== "v") {
    throw new Error("Dernière cote native distante différente de 372v");
  }
  const semantic = {
    break_no: remoteUnits.filter((row) => row.break_no).length,
    unclear_units: remoteUnits.filter((row) => row.has_unclear).length,
    gap_units: remoteUnits.filter((row) => row.has_gap).length,
  };
  if (semantic.break_no !== dataset.counts.break_no_units || semantic.unclear_units !== dataset.counts.unclear_units || semantic.gap_units !== dataset.counts.gap_units) {
    throw new Error(`Comptages sémantiques distants divergents : ${JSON.stringify(semantic)}`);
  }

  const orderById = new Map(remoteUnits.map((row) => [row.id, row.material_order]));
  const breakById = new Map(remoteUnits.map((row) => [row.id, row.break_no]));
  const recomposition = {};
  for (const layerCode of ["diplomatic", "expanded"]) {
    const texts = await fetchAll(
      db,
      "bible_source_unit_texts",
      "unit_id,text_content",
      (query) => query.eq("source_id", sourceId).eq("layer_code", layerCode),
    );
    texts.sort((a, b) => orderById.get(a.unit_id) - orderById.get(b.unit_id));
    if (texts.some((row) => !orderById.has(row.unit_id))) throw new Error(`${layerCode} : unité orpheline`);
    recomposition[layerCode] = {
      rows: texts.length,
      line_delimited_sha256: sha256(texts.map((row) => row.text_content).join("\n")),
      continuous_sha256: sha256(texts.map((row, index) => `${row.text_content}${index === texts.length - 1 || breakById.get(row.unit_id) ? "" : " "}`).join("")),
    };
  }

  const layers = await fetchAll(db, "bible_text_layers", "layer_code,is_public,validation_status", (query) => query.eq("source_id", sourceId));
  const divisions = await fetchAll(db, "bible_native_divisions", "division_kind,is_public", (query) => query.eq("source_id", sourceId));
  const sources = await fetchAll(db, "bible_text_sources", "status", (query) => query.eq("id", sourceId));
  const capabilities = await fetchAll(db, "v_bible_reading_capabilities", "trad_id,mode_code,is_available", (query) => query.eq("trad_id", "TR0009"));
  const { count: forbiddenVerses, error: verseError } = await db.from("versets_v2").select("id", { count: "exact", head: true }).eq("trad_id", "TR0009");
  if (verseError) throw new Error(`versets_v2 : ${verseError.message}`);
  if (sources[0]?.status !== "review" || layers.some((row) => row.is_public) || divisions.some((row) => row.is_public)) {
    throw new Error("État caché distant non respecté");
  }
  if (capabilities.length !== 0) throw new Error("TR0009 exposé par les capacités publiques");
  if (forbiddenVerses !== 0) throw new Error("TR0009 présent dans versets_v2");
  if (layers.some((row) => row.layer_code === "modernized")) throw new Error("Couche modernized importée");

  const expectedRecomposition = JSON.parse(await readFile(path.resolve(ROOT, "work", "bible899", "multimode", "prepared", "RECOMPOSITION_CONTROL.json"), "utf8"));
  for (const code of ["diplomatic", "expanded"]) {
    const wanted = expectedRecomposition[code];
    if (recomposition[code].line_delimited_sha256 !== wanted.line_delimited_sha256 || recomposition[code].continuous_sha256 !== wanted.continuous_sha256) {
      throw new Error(`Recomposition distante ${code} divergente`);
    }
  }

  return {
    mode: "staged_resumable_remote_import",
    remote_write_executed: true,
    hidden_review_state: true,
    counts,
    semantic,
    tei_unclear_elements: dataset.counts.unclear_elements,
    recomposition,
    public_capabilities_rows: capabilities.length,
    forbidden_versets_v2: forbiddenVerses,
    forbidden_alignments: counts.alignments,
    modernized_layers: 0,
    source_status: sources[0].status,
    public_layers: layers.filter((row) => row.is_public).length,
    public_divisions: divisions.filter((row) => row.is_public).length,
    deterministic_source_id: sourceId,
    exact_rows_verified_per_batch: true,
    passed: true,
  };
}

function assertAuthorization() {
  if (!process.argv.includes("--apply-staged")) return false;
  const token = argument("--authorization-token");
  if (token !== AUTHORIZATION || process.env.BIBLE899_MULTIMODE_REMOTE_WRITE_AUTHORIZED !== AUTHORIZATION) {
    throw new Error("Import distant refusé : double autorisation explicite absente");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase service-role absentes");
  if (!url.includes(EXPECTED_PROJECT)) throw new Error("URL Supabase différente du projet autorisé");
  return true;
}

async function main() {
  const dataset = await loadPrepared();
  const rowsByTable = buildRemoteRows(dataset);
  validateRemoteRows(dataset, rowsByTable);
  const progressPath = path.resolve(argument("--progress", DEFAULT_PROGRESS));
  const fresh = initialProgress(dataset, rowsByTable);
  const validateOnly = process.argv.includes("--validate-only");
  const plan = {
    mode: "staged_resumable_remote_import",
    dry_run: !process.argv.includes("--apply-staged"),
    validate_only: validateOnly,
    project_id: EXPECTED_PROJECT,
    dataset_fingerprint: fresh.dataset_fingerprint,
    source_status: "review",
    layers_public: false,
    divisions_public: false,
    batch_sizes: BATCH_SIZES,
    expected_rows: Object.fromEntries(PHASES.map((table) => [table, rowsByTable[table].length])),
    forbidden_targets: ["public.versets_v2", "public.bible_canonical_alignments", "modernized", "public.traductions"],
    progress_path: progressPath,
  };
  console.log(JSON.stringify(plan, null, 2));
  if (!validateOnly && !assertAuthorization()) return;

  if (validateOnly && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Variables Supabase service-role absentes pour la validation distante");
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const progress = await loadProgress(progressPath, fresh);
  if (!validateOnly) await importBatches(db, rowsByTable, progress, progressPath);
  const validation = await validateRemote(db, dataset, rowsByTable, progress);
  progress.completed = true;
  progress.validation = validation;
  await saveProgress(progressPath, progress);
  const resultPath = path.join(path.dirname(progressPath), "REMOTE_IMPORT_VALIDATION.json");
  await writeFile(resultPath, `${JSON.stringify(validation, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(validation, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
