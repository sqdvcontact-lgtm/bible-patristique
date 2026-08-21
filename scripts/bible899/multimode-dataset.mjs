import { createHash } from "node:crypto";

export const EXPECTED = Object.freeze({
  teiSha256: "b081a252ea3a705a4575c790a8a01a22267d6c83be65a9be76bdad329d6a3ec3",
  manifestSha256: "aec437d1bbeecda804f5da3545dc5bd0c9694cc87eee9a590ee37c8a7e21c192",
  units: 58_314,
  texts: 116_628,
  books: 24,
  chapters: 672,
  primaryImages: 1_484,
  alternativeImages: 4,
  unclearElements: 662,
  unclearUnits: 661,
  gapElements: 8,
  gapUnits: 8,
  breakNo: 12_256,
});

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV invalide : guillemet non fermé");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  const nonEmpty = rows.filter((candidate) => candidate.some((value) => value !== ""));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((value) => value.replace(/^\uFEFF/u, ""));
  return nonEmpty.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV invalide à la ligne ${rowIndex + 2} : ${values.length} champs au lieu de ${headers.length}`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

export function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows, columns) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

export function technicalLocation(lineId) {
  const match = lineId.match(/^(f\d+)([rv])_([ab])_l(\d+)$/u);
  if (!match) throw new Error(`line_id non conforme : ${lineId}`);
  return {
    faceId: `${match[1]}${match[2]}`,
    side: match[2],
    columnLabel: match[3],
    lineNo: Number(match[4]),
  };
}

export function buildFoliationIndex(rows, expected = { faces: 742, omitted296: 1 }) {
  const index = new Map();
  let omitted296 = 0;
  for (const row of rows) {
    if (row.native_folio_status === "OMITTED_IN_SOURCE") {
      if (row.native_folio_number !== "296" || row.side !== "") {
        throw new Error("La seule lacune de foliotage permise doit être le numéro natif 296 sans face");
      }
      omitted296 += 1;
      continue;
    }
    if (!row.current_folio_id || !row.side) throw new Error(`Face de foliotation incomplète : ${JSON.stringify(row)}`);
    if (index.has(row.current_folio_id)) throw new Error(`Face de foliotation dupliquée : ${row.current_folio_id}`);
    index.set(row.current_folio_id, {
      sourceUnitId: row.source_unit_id,
      materialLeafSequence: Number(row.material_leaf_sequence),
      side: row.side,
      currentFolioId: row.current_folio_id,
      nativeFolioRaw: row.native_folio_raw,
      nativeFolioNumber: row.native_folio_number === "" ? null : Number(row.native_folio_number),
      nativeFolioStatus: row.native_folio_status,
      pdfPage: row.pdf_page === "" ? null : Number(row.pdf_page),
      pdfHalf: row.pdf_half || null,
      notes: row.notes || null,
    });
  }
  if (index.size !== expected.faces || omitted296 !== expected.omitted296) {
    throw new Error(`Modèle de foliotation inattendu : ${index.size} faces et ${omitted296} lacune 296`);
  }
  return index;
}

export function buildUnits(edition, foliationIndex) {
  const units = [];
  const seen = new Set();
  for (const column of edition.columns) {
    for (const line of column.lines) {
      if (seen.has(line.xmlId)) throw new Error(`line_id dupliqué : ${line.xmlId}`);
      seen.add(line.xmlId);
      const location = technicalLocation(line.xmlId);
      const foliation = foliationIndex.get(location.faceId);
      if (!foliation) throw new Error(`Foliotation absente pour ${line.xmlId} (${location.faceId})`);
      const expectedNativeFace = foliation.nativeFolioNumber === null
        ? null
        : `${foliation.nativeFolioNumber}${foliation.side}`;
      if (expectedNativeFace !== column.folio) {
        throw new Error(`Foliotation TEI/modèle divergente pour ${line.xmlId} : ${column.folio} / ${expectedNativeFace}`);
      }
      const primary = line.facsimiles[0];
      if (!primary) throw new Error(`Fac-similé principal absent pour ${line.xmlId}`);
      units.push({
        source_unit_key: line.xmlId,
        unit_type: "line",
        material_order: units.length + 1,
        surface_key: foliation.sourceUnitId,
        material_leaf_sequence: foliation.materialLeafSequence,
        side: foliation.side,
        column_id: `${location.faceId}_${location.columnLabel}`,
        column_label: location.columnLabel,
        line_no: location.lineNo,
        native_folio_raw: foliation.nativeFolioRaw,
        native_folio_number: foliation.nativeFolioNumber,
        native_folio_status: foliation.nativeFolioStatus,
        break_no: line.breakAfter === "no",
        has_unclear: line.statuses.includes("uncertain"),
        has_gap: line.statuses.includes("lacuna"),
        material_features: {
          technical_face_id: location.faceId,
          native_face_label: expectedNativeFace,
          primary_image_reference: primary.imageReference,
          pdf_page: foliation.pdfPage,
          pdf_half: foliation.pdfHalf,
        },
        diplomatic: line.diplomatic,
        expanded: line.expanded,
        text_features: {
          statuses: [...line.statuses],
          marginal_additions: line.marginalAdditions,
        },
        primary_image_reference: primary.imageReference,
      });
    }
  }
  return units;
}

function normalizedBound(rawLineId, lineIndex, remaps, context) {
  let lineId = rawLineId;
  if (!lineIndex.has(lineId)) {
    const terminalMatch = lineId.match(/^f372([rv]_[ab]_l\d+)$/u);
    if (!terminalMatch) throw new Error(`${context} référence une ligne absente non remappable : ${lineId}`);
    const candidate = `f371${terminalMatch[1]}`;
    if (!lineIndex.has(candidate)) throw new Error(`${context} : remappage terminal impossible ${lineId} -> ${candidate}`);
    remaps.push({ context, source_line_id: lineId, normalized_line_id: candidate, reason: "terminal_repeat_removed_material_identity_preserved" });
    lineId = candidate;
  }
  return lineIndex.get(lineId);
}

export function buildNativeDivisions(bookRows, chapterRows, units) {
  const lineIndex = new Map(units.map((unit) => [unit.source_unit_key, unit]));
  const remaps = [];
  const divisions = [];
  const bookKeys = new Map();
  for (const row of bookRows) {
    const start = normalizedBound(row.start_line_id, lineIndex, remaps, `book:${row.sequence_no}:start`);
    const end = normalizedBound(row.end_line_id, lineIndex, remaps, `book:${row.sequence_no}:end`);
    if (start.material_order > end.material_order) throw new Error(`Bornes inversées pour le livre ${row.sequence_no}`);
    const divisionKey = `book:${String(row.sequence_no).padStart(2, "0")}`;
    bookKeys.set(row.sequence_no, divisionKey);
    divisions.push({
      stable_key: divisionKey,
      parent_stable_key: null,
      division_kind: "book",
      sequence_no: Number(row.sequence_no),
      sequence_in_parent: Number(row.sequence_no),
      label_diplomatic: row.book_label_diplomatic || null,
      proposed_book_code: row.proposed_book_code || null,
      manuscript_number_raw: null,
      manuscript_number: null,
      expected_sequence: null,
      marker_type: "book_boundary",
      marker_status: null,
      number_status: null,
      confidence: row.confidence,
      requires_review: row.confidence !== "high",
      validation_status: "validated",
      is_public: true,
      start_unit_key: start.source_unit_key,
      end_unit_key: end.source_unit_key,
      notes: row.notes || null,
      metadata: {
        start_native_folio: start.material_features.native_face_label,
        end_native_folio: end.material_features.native_face_label,
        source_notes: row.notes || null,
      },
    });
  }
  let globalOrder = bookRows.length;
  for (const row of chapterRows) {
    const start = normalizedBound(row.line_id, lineIndex, remaps, `chapter:${row.book_sequence}:${row.chapter_sequence_in_book}:start`);
    const bookKey = bookKeys.get(row.book_sequence);
    if (!bookKey) throw new Error(`Livre parent absent pour le chapitre ${row.book_sequence}/${row.chapter_sequence_in_book}`);
    const book = divisions.find((division) => division.stable_key === bookKey);
    if (!book || start.material_order < lineIndex.get(book.start_unit_key).material_order || start.material_order > lineIndex.get(book.end_unit_key).material_order) {
      throw new Error(`Chapitre hors des bornes du livre : ${row.book_sequence}/${row.chapter_sequence_in_book}`);
    }
    globalOrder += 1;
    divisions.push({
      stable_key: `chapter:${String(row.book_sequence).padStart(2, "0")}:${String(row.chapter_sequence_in_book).padStart(3, "0")}`,
      parent_stable_key: bookKey,
      division_kind: "chapter",
      sequence_no: globalOrder,
      sequence_in_parent: Number(row.chapter_sequence_in_book),
      label_diplomatic: null,
      proposed_book_code: row.proposed_book_code || null,
      manuscript_number_raw: row.manuscript_number_raw || null,
      manuscript_number: row.manuscript_chapter_number === "" ? null : Number(row.manuscript_chapter_number),
      expected_sequence: row.expected_sequence === "" ? null : Number(row.expected_sequence),
      marker_type: row.marker_type || null,
      marker_status: row.native_marker_status || null,
      number_status: row.number_status || null,
      confidence: row.confidence,
      requires_review: row.requires_review === "true",
      validation_status: "validated",
      is_public: true,
      start_unit_key: start.source_unit_key,
      end_unit_key: start.source_unit_key,
      notes: row.notes || null,
      metadata: {
        opening_text: row.opening_text,
        evidence_path: row.evidence_path || null,
        source_notes: row.notes || null,
        native_folio: start.material_features.native_face_label,
      },
    });
  }
  const chapters = divisions.filter((division) => division.division_kind === "chapter");
  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const parent = divisions.find((division) => division.stable_key === chapter.parent_stable_key);
    const next = chapters.slice(index + 1).find((candidate) => candidate.parent_stable_key === chapter.parent_stable_key);
    chapter.end_unit_key = next
      ? units[lineIndex.get(next.start_unit_key).material_order - 2].source_unit_key
      : parent.end_unit_key;
  }
  return { divisions, remaps };
}

export function validateDataset(dataset) {
  const { units, texts, layers, divisions, provenanceRecords, provenanceLinks } = dataset;
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push(message); };
  expect(units.length === EXPECTED.units, `unités ${units.length}/${EXPECTED.units}`);
  expect(texts.length === EXPECTED.texts, `textes ${texts.length}/${EXPECTED.texts}`);
  expect(layers.length === 2 && layers.every((layer) => ["diplomatic", "expanded"].includes(layer.layer_code)), "couches autres que diplomatic/expanded");
  expect(!layers.some((layer) => layer.layer_code === "modernized"), "modernized interdite");
  expect(divisions.filter((division) => division.division_kind === "book").length === EXPECTED.books, "24 livres requis");
  expect(divisions.filter((division) => division.division_kind === "chapter").length === EXPECTED.chapters, "672 chapitres requis");
  expect(units.filter((unit) => unit.has_unclear).length === EXPECTED.unclearUnits, "661 unités has_unclear requises");
  expect(units.filter((unit) => unit.has_gap).length === EXPECTED.gapUnits, "8 unités has_gap requises");
  expect(units.filter((unit) => unit.break_no).length === EXPECTED.breakNo, "12256 break=no requis");
  expect(!units.some((unit) => unit.native_folio_number === 296), "folio natif 296 fabriqué");
  expect(units.at(-1)?.material_features.native_face_label === "372v", "dernière cote native différente de 372v");
  expect(new Set(units.map((unit) => unit.source_unit_key)).size === units.length, "source_unit_key dupliqué");
  expect(units.every((unit, index) => unit.material_order === index + 1), "ordre matériel non continu");
  expect(provenanceRecords.filter((record) => record.provenance_type === "facsimile" && record.role === "PRIMARY").length === EXPECTED.primaryImages, "1484 images PRIMARY requises");
  expect(provenanceRecords.filter((record) => record.provenance_type === "facsimile" && record.role === "ALTERNATIVE").length === EXPECTED.alternativeImages, "4 images ALTERNATIVE requises");
  expect(provenanceLinks.every((link) => link.target_type !== "canonical_alignment"), "alignement canonique interdit");
  if (errors.length > 0) throw new Error(`Validation multimode en échec :\n- ${errors.join("\n- ")}`);
  return {
    source: 1,
    units: units.length,
    layers: layers.length,
    texts: texts.length,
    native_divisions: divisions.length,
    books: EXPECTED.books,
    chapters: EXPECTED.chapters,
    primary_images: EXPECTED.primaryImages,
    alternative_images: EXPECTED.alternativeImages,
    provenance_records: provenanceRecords.length,
    provenance_links: provenanceLinks.length,
    unclear_elements: EXPECTED.unclearElements,
    unclear_units: EXPECTED.unclearUnits,
    gap_elements: EXPECTED.gapElements,
    gap_units: EXPECTED.gapUnits,
    break_no_units: EXPECTED.breakNo,
  };
}
