import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hardening = readFileSync("sql/20260807_bible_multimode_verified_alignments_only.sql", "utf8");
const publication = readFileSync("sql/20260807_publish_tr0009_multimode.sql", "utf8");

describe("publication multimode Bible 899", () => {
  it("n'expose que les alignements vérifiés", () => {
    expect(hardening).toContain("verification_status = 'verified'");
    expect(hardening).not.toMatch(/verification_status\s+in\s*\([^)]*review/iu);
    expect(hardening).toContain("security_invoker = true");
    expect(hardening).not.toContain("TR0009");
  });

  it("publie exactement les trois capacités autorisées dans une transaction gardée", () => {
    expect(publication.trimStart().toLowerCase()).toContain("begin;");
    expect(publication.trimEnd().toLowerCase()).toMatch(/commit;$/u);
    expect(publication).toContain("layer_code in ('diplomatic', 'expanded')");
    expect(publication).toContain("affected <> 696");
    expect(publication).toContain("mode_code in ('diplomatic', 'expanded', 'native')");
    expect(publication).toContain("mode_code in ('paragraph', 'verse', 'modernized')");
    expect(publication).not.toMatch(/insert\s+into\s+public\.(versets_v2|bible_canonical_alignments|bible_editorial_segment)/iu);
  });
});
