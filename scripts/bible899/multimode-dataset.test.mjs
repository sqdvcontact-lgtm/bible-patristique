import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildFoliationIndex,
  buildNativeDivisions,
  buildUnits,
  parseCsv,
  technicalLocation,
} from "./multimode-dataset.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/multimode-witness/witness.json", import.meta.url), "utf8"));

describe("pipeline multimode Bible 899", () => {
  it("parse les CSV avec virgules et guillemets sans dépendance implicite", () => {
    expect(parseCsv('a,b\n1,"deux, trois"\n')).toEqual([{ a: "1", b: "deux, trois" }]);
  });

  it("conserve identifiant technique, ordre matériel et foliotage natif séparés", () => {
    const foliation = buildFoliationIndex(fixture.foliation, { faces: 3, omitted296: 1 });
    const units = buildUnits(fixture.edition, foliation);
    expect(units.map((unit) => unit.source_unit_key)).toEqual(["f295v_a_l01", "f296r_a_l01", "f371v_b_l40"]);
    expect(units.map((unit) => unit.native_folio_number)).toEqual([295, 297, 372]);
    expect(units.some((unit) => unit.native_folio_number === 296)).toBe(false);
    expect(units[1]).toMatchObject({ material_leaf_sequence: 296, side: "r", has_unclear: true });
  });

  it("n’autorise que le remappage terminal f372 vers la vraie unité technique f371", () => {
    const units = buildUnits(fixture.edition, buildFoliationIndex(fixture.foliation, { faces: 3, omitted296: 1 }));
    const { divisions, remaps } = buildNativeDivisions(fixture.books, fixture.chapters, units);
    expect(remaps).toEqual([expect.objectContaining({ source_line_id: "f372v_b_l40", normalized_line_id: "f371v_b_l40" })]);
    expect(divisions[0]).toMatchObject({ start_unit_key: "f295v_a_l01", end_unit_key: "f371v_b_l40", stable_key: "book:01" });
    expect(divisions[1]).toMatchObject({ start_unit_key: "f296r_a_l01", end_unit_key: "f371v_b_l40" });
  });

  it("refuse toute autre référence absente", () => {
    const units = buildUnits(fixture.edition, buildFoliationIndex(fixture.foliation, { faces: 3, omitted296: 1 }));
    expect(() => buildNativeDivisions([{ ...fixture.books[0], end_line_id: "f999v_b_l40" }], fixture.chapters, units)).toThrow(/absente non remappable/u);
  });

  it("valide strictement le format des line_id", () => {
    expect(technicalLocation("f371v_b_l40")).toEqual({ faceId: "f371v", side: "v", columnLabel: "b", lineNo: 40 });
    expect(() => technicalLocation("372v-b-40")).toThrow(/non conforme/u);
  });
});
