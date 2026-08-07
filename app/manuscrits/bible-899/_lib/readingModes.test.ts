import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseBible899Tei, type Bible899Edition } from "./tei";
import { availableReadingModes } from "./readingModes";

function editionWithModernizedStatus(status: string): Bible899Edition {
  return {
    manuscript: {
      repository: "",
      shelfmark: "",
      date: "",
      sample: "",
      version: "test",
      status: "",
      technicalStatus: "",
      modernizedStatus: status,
    },
    conventions: { gap: "", unclear: "", marginalAddition: "" },
    folios: [],
    columns: [{
      key: "1r_a",
      xmlId: null,
      folio: "1r",
      column: "a",
      lines: [],
      diplomaticContinuous: "texte",
      expandedContinuous: "texte",
      modernizedParagraphs: ["texte historique"],
      catchwords: [],
      facsimiles: [],
    }],
    statistics: { folios: 1, columns: 1, lines: 0, choice: 0, gap: 0, unclear: 0, add: 0, catchword: 0 },
    totalLines: 0,
    teiSha256: "",
    control: { usedImageReferences: [], missingCoordinates: [], unmatchedModernizedUnits: [] },
  };
}

describe("modes publics du lecteur Bible 899", () => {
  it.each(["legacy-unverified", "provisional", ""])(
    "ne propose pas la graphie modernisée lorsque la couche porte le statut %j",
    (status) => {
      expect(availableReadingModes(editionWithModernizedStatus(status)).map((mode) => mode.value))
        .toEqual(["diplomatic", "expanded"]);
    },
  );

  it("ne propose la graphie modernisée que lorsque la couche est explicitement validée", () => {
    expect(availableReadingModes(editionWithModernizedStatus("validated")).map((mode) => mode.value))
      .toEqual(["diplomatic", "expanded", "modernized"]);
  });

  it("masque la couche historique non validée du TEI actif", () => {
    const activeXml = readFileSync(
      path.join(process.cwd(), "data/manuscrits/bible-899/Bible_899_master.xml"),
      "utf8",
    );
    const edition = parseBible899Tei(activeXml, { imageExists: () => true });
    expect(edition.manuscript.modernizedStatus).toBe("legacy-unverified");
    expect(edition.columns.some((column) => column.modernizedParagraphs.length > 0)).toBe(true);
    expect(availableReadingModes(edition).map((mode) => mode.value))
      .toEqual(["diplomatic", "expanded"]);
  });
});
