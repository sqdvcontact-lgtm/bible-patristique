import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseBible899Tei } from "../../app/manuscrits/bible-899/_lib/tei";
import {
  EXPECTED,
  buildFoliationIndex,
  buildNativeDivisions,
  buildUnits,
  parseCsv,
  sha256,
  toCsv,
  validateDataset,
} from "./multimode-dataset.mjs";

const ROOT = process.cwd();
const DEFAULT_SOURCE_ROOT = path.resolve(ROOT, "..", "bible-patristique", "work", "bible899");
const OUTPUT_ROOT = path.resolve(ROOT, "work", "bible899", "multimode");
const SOURCE_ROOT = path.join(OUTPUT_ROOT, "source");
const PREPARED_ROOT = path.join(OUTPUT_ROOT, "prepared");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : path.resolve(process.argv[index + 1]);
}

const INPUTS = {
  tei: argument("--tei", path.resolve(ROOT, "data", "manuscrits", "bible-899", "Bible_899_master.xml")),
  manifest: argument("--manifest", path.resolve(ROOT, "data", "manuscrits", "bible-899", "manifest.json")),
  books: argument("--books", path.join(DEFAULT_SOURCE_ROOT, "architecture_control", "package_stage", "BIBLE_899_NATIVE_BOOKS_FINAL.csv")),
  chapters: argument("--chapters", path.join(DEFAULT_SOURCE_ROOT, "architecture_control", "package_stage", "BIBLE_899_NATIVE_CHAPTERS_FINAL.csv")),
  foliation: argument("--foliation", path.join(DEFAULT_SOURCE_ROOT, "foliation_correction_control", "BIBLE_899_FOLIATION_MODEL.csv")),
};

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ndjson(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function extractLineMarkup(xml) {
  const byId = new Map();
  for (const match of xml.matchAll(/<l\b[^>]*\bxml:id="([^"]+)"[^>]*>[\s\S]*?<\/l>/gu)) {
    if (byId.has(match[1])) throw new Error(`Balisage de ligne dupliqué : ${match[1]}`);
    byId.set(match[1], match[0]);
  }
  return byId;
}

function buildTexts(units, markupById) {
  const texts = [];
  for (const unit of units) {
    const sourceMarkup = markupById.get(unit.source_unit_key);
    if (!sourceMarkup) throw new Error(`Balisage TEI introuvable : ${unit.source_unit_key}`);
    texts.push({
      source_unit_key: unit.source_unit_key,
      layer_code: "diplomatic",
      text_content: unit.diplomatic,
      source_markup: sourceMarkup,
      text_features: {
        ...unit.text_features,
        representation: "diplomatic",
        unclear_element_count: (sourceMarkup.match(/<unclear\b/gu) ?? []).length,
        gap_element_count: (sourceMarkup.match(/<gap\b/gu) ?? []).length,
        unclear_preserved: unit.has_unclear,
        gap_preserved: unit.has_gap,
      },
    });
    texts.push({
      source_unit_key: unit.source_unit_key,
      layer_code: "expanded",
      text_content: unit.expanded,
      source_markup: null,
      text_features: {
        ...unit.text_features,
        representation: "expanded",
        derivation: "tei_choice_abbr_expan_only",
        unclear_preserved: unit.has_unclear,
        gap_preserved: unit.has_gap,
      },
    });
  }
  return texts;
}

function buildProvenance(manifest, inputHashes, units, divisions) {
  const records = [
    {
      provenance_key: "source:tei-active",
      provenance_type: "tei",
      role: "SOURCE",
      uri: "data/manuscrits/bible-899/Bible_899_master.xml",
      locator: "TEI active 2.0-phase1-foliation",
      sha256: inputHashes.tei,
      metadata: { editorial_version: manifest.editorialVersion },
    },
    {
      provenance_key: "source:manifest-active",
      provenance_type: "manifest",
      role: "SOURCE",
      uri: "data/manuscrits/bible-899/manifest.json",
      locator: "Manifeste actif",
      sha256: inputHashes.manifest,
      metadata: { schema_version: manifest.schemaVersion },
    },
    ...[
      ["books", "BIBLE_899_NATIVE_BOOKS_FINAL.csv"],
      ["chapters", "BIBLE_899_NATIVE_CHAPTERS_FINAL.csv"],
      ["foliation", "BIBLE_899_FOLIATION_MODEL.csv"],
    ].map(([key, file]) => ({
      provenance_key: `source:${key}`,
      provenance_type: key === "foliation" ? "foliation_model" : "native_structure",
      role: "SOURCE",
      uri: `work/bible899/multimode/source/${file}`,
      locator: key,
      sha256: inputHashes[key],
      metadata: {},
    })),
  ];
  const imageKeyByReference = new Map();
  for (const [role, images] of [["PRIMARY", manifest.images], ["ALTERNATIVE", manifest.alternativeImages]]) {
    for (const image of images) {
      const key = `image:${role.toLowerCase()}:${image.file}`;
      if (imageKeyByReference.has(image.reference)) throw new Error(`Image dupliquée dans le manifeste : ${image.reference}`);
      imageKeyByReference.set(image.reference, key);
      records.push({
        provenance_key: key,
        provenance_type: "facsimile",
        role,
        uri: image.publicUrl,
        locator: image.reference,
        sha256: image.sha256,
        metadata: {
          public_path: image.publicPath,
          width: image.width,
          height: image.height,
          classification: image.classification ?? null,
          alternative_for: image.alternativeFor ?? null,
          source_unit_id: image.sourceUnitId ?? null,
          pdf_page: image.pdfPage ?? null,
          pdf_half: image.pdfHalf ?? null,
        },
      });
    }
  }
  const links = [];
  for (const unit of units) {
    const provenanceKey = imageKeyByReference.get(unit.primary_image_reference);
    if (!provenanceKey) throw new Error(`Image principale sans provenance : ${unit.primary_image_reference}`);
    links.push({
      provenance_key: provenanceKey,
      target_type: "source_unit",
      target_key: unit.source_unit_key,
      relation_type: "facsimile_primary",
      metadata: {},
    });
  }
  for (const division of divisions) {
    links.push({
      provenance_key: division.division_kind === "book" ? "source:books" : "source:chapters",
      target_type: "native_division",
      target_key: division.stable_key,
      relation_type: "structural_source",
      metadata: {},
    });
  }
  for (const image of manifest.alternativeImages) {
    if (!image.alternativeFor) continue;
    const primaryReference = image.alternativeFor;
    const alternativeKey = imageKeyByReference.get(image.reference);
    const matchingUnits = units.filter((unit) => unit.primary_image_reference === primaryReference);
    if (matchingUnits.length === 0) throw new Error(`Image alternative sans unité primaire correspondante : ${image.reference}`);
    for (const unit of matchingUnits) {
      links.push({
        provenance_key: alternativeKey,
        target_type: "source_unit",
        target_key: unit.source_unit_key,
        relation_type: "facsimile_alternative",
        metadata: { alternative_for: primaryReference },
      });
    }
  }
  return { records, links };
}

async function writeAndHash(file, content, hashes) {
  const target = path.join(PREPARED_ROOT, file);
  await writeFile(target, content, "utf8");
  hashes[file] = sha256(content);
}

async function main() {
  await mkdir(SOURCE_ROOT, { recursive: true });
  await mkdir(PREPARED_ROOT, { recursive: true });
  const [teiBuffer, manifestBuffer, booksBuffer, chaptersBuffer, foliationBuffer] = await Promise.all(
    Object.values(INPUTS).map((file) => readFile(file)),
  );
  const inputHashes = {
    tei: createHash("sha256").update(teiBuffer).digest("hex"),
    manifest: createHash("sha256").update(manifestBuffer).digest("hex"),
    books: createHash("sha256").update(booksBuffer).digest("hex"),
    chapters: createHash("sha256").update(chaptersBuffer).digest("hex"),
    foliation: createHash("sha256").update(foliationBuffer).digest("hex"),
  };
  if (inputHashes.tei !== EXPECTED.teiSha256) throw new Error(`SHA TEI inattendu : ${inputHashes.tei}`);
  if (inputHashes.manifest !== EXPECTED.manifestSha256) throw new Error(`SHA manifeste inattendu : ${inputHashes.manifest}`);
  const teiXml = teiBuffer.toString("utf8");
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  if (manifest.teiSha256 !== inputHashes.tei || manifest.images.length !== EXPECTED.primaryImages || manifest.alternativeImages.length !== EXPECTED.alternativeImages) {
    throw new Error("Le manifeste ne correspond pas au TEI ou à l’inventaire 1484+4 attendu");
  }
  const books = parseCsv(booksBuffer.toString("utf8"));
  const chapters = parseCsv(chaptersBuffer.toString("utf8"));
  const foliation = parseCsv(foliationBuffer.toString("utf8"));
  if (books.length !== EXPECTED.books || chapters.length !== EXPECTED.chapters) throw new Error("Structure native source incomplète");
  const edition = parseBible899Tei(teiXml, {
    sourcePath: INPUTS.tei,
    manifestImages: manifest.images,
  });
  const unitsWithText = buildUnits(edition, buildFoliationIndex(foliation));
  const markupById = extractLineMarkup(teiXml);
  const texts = buildTexts(unitsWithText, markupById);
  const { divisions, remaps } = buildNativeDivisions(books, chapters, unitsWithText);
  const { records: provenanceRecords, links: provenanceLinks } = buildProvenance(manifest, inputHashes, unitsWithText, divisions);
  const source = {
    source_code: "bible899",
    trad_id: "TR0009",
    source_kind: "manuscript",
    version_label: "2.0-phase1-foliation",
    title: "Bible française du XIIIe siècle, Français 899",
    source_uri: "data/manuscrits/bible-899/Bible_899_master.xml",
    status: "published",
    source_sha256: inputHashes.tei,
    metadata: {
      manuscript_id: "bible-899",
      manifest_sha256: inputHashes.manifest,
      modernized_legacy_status: "legacy-unverified",
      modernized_imported: false,
      canonical_alignment_imported: false,
      tei_counts: edition.statistics,
      catchwords: edition.columns.flatMap((column) => column.catchwords).map((catchword) => ({
        xml_id: catchword.xmlId,
        type: catchword.type,
        place: catchword.place,
        diplomatic: catchword.diplomatic,
        expanded: catchword.expanded,
        statuses: catchword.statuses,
        facsimiles: catchword.facsimiles.map((facsimile) => facsimile.imageReference),
      })),
    },
  };
  const layers = [
    { layer_code: "diplomatic", label: "Transcription diplomatique", layer_kind: "diplomatic", validation_status: "validated", is_public: true, transformation_rules: { method: "tei_diplomatic", source_version: "2.0-phase1-foliation" } },
    { layer_code: "expanded", label: "Abréviations développées", layer_kind: "expanded", validation_status: "validated", is_public: true, transformation_rules: { method: "tei_choice_abbr_expan_only", source_version: "2.0-phase1-foliation" } },
  ];
  const internalUnitFields = new Set(["diplomatic", "expanded", "text_features", "primary_image_reference"]);
  const units = unitsWithText.map((unit) => Object.fromEntries(
    Object.entries(unit).filter(([field]) => !internalUnitFields.has(field)),
  ));
  const dataset = { source, units, layers, texts, divisions, provenanceRecords, provenanceLinks };
  const lineUnclearElements = texts
    .filter((text) => text.layer_code === "diplomatic")
    .reduce((total, text) => total + text.text_features.unclear_element_count, 0);
  const lineGapElements = texts
    .filter((text) => text.layer_code === "diplomatic")
    .reduce((total, text) => total + text.text_features.gap_element_count, 0);
  const catchwordUnclearElements = source.metadata.catchwords.filter((catchword) => catchword.statuses.includes("uncertain")).length;
  if (edition.statistics.unclear !== EXPECTED.unclearElements || lineUnclearElements + catchwordUnclearElements !== EXPECTED.unclearElements) {
    throw new Error(`Conservation unclear impossible : TEI=${edition.statistics.unclear}, lignes=${lineUnclearElements}, réclame=${catchwordUnclearElements}`);
  }
  if (edition.statistics.gap !== EXPECTED.gapElements || lineGapElements !== EXPECTED.gapElements) {
    throw new Error(`Conservation gap impossible : TEI=${edition.statistics.gap}, lignes=${lineGapElements}`);
  }
  const counts = validateDataset(dataset);
  const sourceSnapshots = [
    ["BIBLE_899_NATIVE_BOOKS_FINAL.csv", booksBuffer],
    ["BIBLE_899_NATIVE_CHAPTERS_FINAL.csv", chaptersBuffer],
    ["BIBLE_899_FOLIATION_MODEL.csv", foliationBuffer],
  ];
  for (const [name, buffer] of sourceSnapshots) await writeFile(path.join(SOURCE_ROOT, name), buffer);
  await writeFile(
    path.join(SOURCE_ROOT, "SOURCE_SHA256SUMS.txt"),
    `${sourceSnapshots.map(([name, buffer]) => `${createHash("sha256").update(buffer).digest("hex")}  ${name}`).join("\n")}\n`,
    "utf8",
  );
  const hashes = {};
  await writeAndHash("source.json", stableJson(source), hashes);
  await writeAndHash("layers.json", stableJson(layers), hashes);
  await writeAndHash("units.ndjson", ndjson(units), hashes);
  await writeAndHash("texts.ndjson", ndjson(texts), hashes);
  await writeAndHash("native_divisions.ndjson", ndjson(divisions), hashes);
  await writeAndHash("provenance_records.ndjson", ndjson(provenanceRecords), hashes);
  await writeAndHash("provenance_links.ndjson", ndjson(provenanceLinks), hashes);
  await writeAndHash("counts.json", stableJson({ ...counts, input_sha256: inputHashes }), hashes);
  const byLayer = Object.fromEntries(layers.map((layer) => [
    layer.layer_code,
    texts.filter((text) => text.layer_code === layer.layer_code),
  ]));
  const recompose = (layerCode) => {
    const rows = byLayer[layerCode];
    const lineDelimited = rows.map((row) => row.text_content).join("\n");
    const continuous = rows.map((row, index) => `${row.text_content}${index === rows.length - 1 || units[index].break_no ? "" : " "}`).join("");
    return {
      rows: rows.length,
      line_delimited_sha256: sha256(lineDelimited),
      continuous_sha256: sha256(continuous),
      first_10: rows.slice(0, 10).map((row) => [row.source_unit_key, row.text_content]),
      middle_10: rows.slice(Math.floor(rows.length / 2) - 5, Math.floor(rows.length / 2) + 5).map((row) => [row.source_unit_key, row.text_content]),
      last_10: rows.slice(-10).map((row) => [row.source_unit_key, row.text_content]),
    };
  };
  await writeAndHash("RECOMPOSITION_CONTROL.json", stableJson({
    diplomatic: recompose("diplomatic"),
    expanded: recompose("expanded"),
    source_equality: {
      diplomatic: unitsWithText.every((unit, index) => byLayer.diplomatic[index].text_content === unit.diplomatic),
      expanded: unitsWithText.every((unit, index) => byLayer.expanded[index].text_content === unit.expanded),
    },
    unclear: {
      line_elements: lineUnclearElements,
      catchword_elements: catchwordUnclearElements,
      total_tei_elements: edition.statistics.unclear,
      catchword_xml_id: source.metadata.catchwords[0]?.xml_id ?? null,
    },
  }), hashes);
  await writeAndHash("PROVENANCE_IMAGE_CONTROL.json", stableJson({
    primary_records: provenanceRecords.filter((record) => record.provenance_type === "facsimile" && record.role === "PRIMARY").length,
    alternative_records: provenanceRecords.filter((record) => record.provenance_type === "facsimile" && record.role === "ALTERNATIVE").length,
    unique_image_sha256: new Set(provenanceRecords.filter((record) => record.provenance_type === "facsimile").map((record) => record.sha256)).size,
    primary_unit_links: provenanceLinks.filter((link) => link.relation_type === "facsimile_primary").length,
    alternative_unit_links: provenanceLinks.filter((link) => link.relation_type === "facsimile_alternative").length,
    alternatives_without_surface: manifest.alternativeImages.filter((image) => !image.alternativeFor).map((image) => image.file),
  }), hashes);
  await writeAndHash(
    "TERMINAL_NATIVE_REMAP.csv",
    toCsv(remaps, ["context", "source_line_id", "normalized_line_id", "reason"]),
    hashes,
  );
  const checksumText = `${Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right)).map(([file, hash]) => `${hash}  ${file}`).join("\n")}\n`;
  await writeFile(path.join(PREPARED_ROOT, "SHA256SUMS.txt"), checksumText, "utf8");
  console.log(JSON.stringify({ output: PREPARED_ROOT, counts, remaps, sha256: hashes }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
