import { describe, expect, it } from "vitest";

import {
  buildPlan,
  textBatchSql,
  unitBatchSql,
} from "./import-multimode-tr0009.mjs";

const source = {
  trad_id: "TR_FIXTURE",
  source_code: "fixture",
  title: "Témoin fictif",
  source_kind: "manuscript",
  version_label: "fixture-1",
  source_uri: "fixture.xml",
  source_sha256: "a".repeat(64),
  metadata: { modernized_imported: false },
};

const unit = {
  source_unit_key: "f296r_a_l01",
  unit_type: "line",
  material_order: 1,
  surface_key: "fixture-0296-r",
  material_leaf_sequence: 296,
  side: "r",
  column_id: "f296r_a",
  column_label: "a",
  line_no: 1,
  native_folio_raw: "297",
  native_folio_number: 297,
  native_folio_status: "VISIBLE",
  break_no: true,
  has_unclear: false,
  has_gap: false,
  material_features: { native_face_label: "297r" },
};

describe("import TR0009 multimode", () => {
  it("prépare l’unité sans fabriquer le folio natif 296", () => {
    const sql = unitBatchSql(source, [unit]);
    expect(sql).toContain("native_folio_number");
    expect(sql).toContain("'297'");
    expect(sql).not.toMatch(/insert\s+into\s+public\.versets_v2/iu);
  });

  it("échappe les textes et conserve le balisage source", () => {
    const sql = textBatchSql(source, [{
      source_unit_key: unit.source_unit_key,
      layer_code: "diplomatic",
      text_content: "l'ome q̃",
      source_markup: '<l xml:id="f296r_a_l01">l\'ome q̃</l>',
      text_features: { unclear_element_count: 0 },
    }]);
    expect(sql).toContain("l''ome q̃");
    expect(sql).toContain("source_markup");
  });

  it("refuse une couche modernized", () => {
    const dataset = {
      source,
      layers: [{ layer_code: "modernized" }],
      units: [], texts: [], divisions: [], provenanceRecords: [], provenanceLinks: [],
      counts: { units: 0, texts: 0, native_divisions: 0, books: 0, chapters: 0, unclear_units: 0, gap_units: 0, break_no_units: 0, primary_images: 0, alternative_images: 0, provenance_records: 0, provenance_links: 0 },
    };
    expect(() => buildPlan(dataset)).toThrow(/modernized/u);
  });

  it("ne prépare aucune écriture vers versets_v2 ou les alignements", () => {
    const dataset = {
      source,
      layers: [{ layer_code: "diplomatic", label: "Diplomatique", layer_kind: "diplomatic", validation_status: "validated", transformation_rules: {} }],
      units: [unit],
      texts: [],
      divisions: [],
      provenanceRecords: [],
      provenanceLinks: [],
      counts: { units: 1, texts: 0, native_divisions: 0, books: 0, chapters: 0, unclear_units: 0, gap_units: 0, break_no_units: 1, primary_images: 0, alternative_images: 0, provenance_records: 0, provenance_links: 0 },
    };
    const sql = buildPlan(dataset).statements.join("\n");
    expect(sql).not.toMatch(/insert\s+into\s+public\.(versets_v2|bible_canonical_alignments)/iu);
    expect(sql).not.toMatch(/update\s+public\.(versets_v2|bible_canonical_alignments)/iu);
    expect(sql).not.toMatch(/delete\s+from\s+public\.(versets_v2|bible_canonical_alignments)/iu);
    expect(buildPlan(dataset).summary.rpc_calls_on_apply).toBe(1);
    expect(buildPlan(dataset).atomicSql).toMatch(/^begin;[\s\S]*commit;\n$/u);
  });
});
