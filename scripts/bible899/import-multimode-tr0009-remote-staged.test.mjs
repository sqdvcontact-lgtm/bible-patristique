import { describe, expect, test } from "vitest";

import { BATCH_SIZES, buildRemoteRows, uuidV5, validateRemoteRows } from "./import-multimode-tr0009-remote-staged.mjs";

const dataset = {
  source: { trad_id: "TR0009", source_code: "test", version_label: "v1", source_sha256: "a".repeat(64), title: "T", source_kind: "manuscript", source_uri: "x", metadata: {} },
  layers: [{ layer_code: "diplomatic", label: "D", layer_kind: "diplomatic", validation_status: "validated", transformation_rules: {} }],
  units: [{ source_unit_key: "l1", unit_type: "line", material_order: 1, surface_key: "s", material_leaf_sequence: 1, side: "r", column_id: "c", column_label: "a", line_no: 1, native_folio_raw: "1", native_folio_number: 1, native_folio_status: "VISIBLE", break_no: false, has_unclear: false, has_gap: false, material_features: {} }],
  texts: [{ source_unit_key: "l1", layer_code: "diplomatic", text_content: "texte", source_markup: null, text_features: {} }],
  divisions: [{ stable_key: "b1", parent_stable_key: null, division_kind: "book", sequence_no: 1, sequence_in_parent: 1, label_diplomatic: "B", proposed_book_code: "GEN", manuscript_number_raw: null, manuscript_number: null, expected_sequence: null, marker_type: "book", marker_status: null, number_status: null, confidence: "high", requires_review: false, start_unit_key: "l1", end_unit_key: "l1", validation_status: "validated", notes: null, metadata: {} }],
  provenanceRecords: [{ provenance_key: "p1", provenance_type: "tei", role: "SOURCE", uri: "x", locator: "x", sha256: "b".repeat(64), metadata: {} }],
  provenanceLinks: [{ provenance_key: "p1", target_type: "source_unit", target_key: "l1", relation_type: "source", metadata: {} }],
  counts: { units: 1, texts: 1, native_divisions: 1, provenance_records: 1, provenance_links: 1 },
};

describe("import distant résumable Bible 899", () => {
  test("produit des UUID v5 déterministes", () => {
    expect(uuidV5("c5944f13-ad71-5f3d-a91f-b020df128fc8", "x")).toBe(uuidV5("c5944f13-ad71-5f3d-a91f-b020df128fc8", "x"));
    expect(uuidV5("c5944f13-ad71-5f3d-a91f-b020df128fc8", "x")).not.toBe(uuidV5("c5944f13-ad71-5f3d-a91f-b020df128fc8", "y"));
  });

  test("force l'état caché et conserve les relations", () => {
    const rows = buildRemoteRows(dataset);
    expect(rows.bible_text_sources[0].status).toBe("review");
    expect(rows.bible_text_layers[0].is_public).toBe(false);
    expect(rows.bible_native_divisions[0].is_public).toBe(false);
    expect(rows.bible_source_unit_texts[0].unit_id).toBe(rows.bible_source_units[0].id);
    expect(rows.bible_provenance_links[0].unit_id).toBe(rows.bible_source_units[0].id);
    expect(BATCH_SIZES.bible_source_unit_texts).toBeLessThanOrEqual(150);
    expect(validateRemoteRows(dataset, rows)).toBe(true);
  });

  test("refuse modernized", () => {
    expect(() => buildRemoteRows({ ...dataset, layers: [{ layer_code: "modernized" }] })).toThrow(/modernized/u);
  });
});
