import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  MANIFEST_RELATIVE_PATH,
  TEI_RELATIVE_PATH,
  loadBible899Edition,
  loadBible899ReaderEdition,
  readBible899Manifest,
} from "./manifest";
import {
  GAP_MARKER,
  MARGINAL_ADDITION_PREFIX,
  UNCLEAR_PREFIX,
  TeiValidationError,
  parseBible899Tei,
  sha256Text,
} from "./tei";

const fixtureDirectory = path.join(__dirname, "fixtures");
const fixture = (name: string) => readFileSync(path.join(fixtureDirectory, name), "utf8");
const prototypeXml = fixture("prototype-v0.4.xml");

function count(text: string, marker: string): number {
  return text.split(marker).length - 1;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function captureValidation(xml: string, sourcePath: string, imageExists = () => true): TeiValidationError {
  try {
    parseBible899Tei(xml, { sourcePath, imageExists });
  } catch (error) {
    if (error instanceof TeiValidationError) return error;
    throw error;
  }
  throw new Error("Le TEI de test aurait dû être refusé");
}

describe("parseur TEI généralisé", () => {
  it("accepte un seul folio, une seule colonne et un nombre variable de lignes", () => {
    const edition = parseBible899Tei(fixture("single-column.xml"), {
      sourcePath: "single-column.xml",
      imageExists: () => true,
    });
    expect(edition.statistics).toEqual({
      folios: 1,
      columns: 1,
      lines: 3,
      choice: 1,
      gap: 1,
      unclear: 1,
      add: 0,
      catchword: 0,
    });
    expect(edition.columns[0].modernizedParagraphs).toEqual([]);
    expect(edition.columns[0].diplomaticContinuous).toContain("coupé");
    expect(edition.columns[0].diplomaticContinuous).not.toContain("cou pé");
    expect(edition.control.missingCoordinates).toEqual(["1r_a"]);
  });

  it("préserve l’ordre de plusieurs folios et ne reconstruit pas une couche modernisée absente", () => {
    const edition = parseBible899Tei(fixture("multiple-folios.xml"), {
      sourcePath: "multiple-folios.xml",
      imageExists: () => true,
    });
    expect(edition.folios.map((folio) => folio.n)).toEqual(["1r", "1v"]);
    expect(edition.columns.map((column) => column.lines.length)).toEqual([1, 2]);
    expect(edition.columns[0].modernizedParagraphs).toEqual(["Couche modernisée de fixture."]);
    expect(edition.columns[1].modernizedParagraphs).toEqual([]);
  });

  it("accepte les jalons lb imbriqués et conserve break=no", () => {
    const edition = parseBible899Tei(fixture("milestone-lines.xml"), {
      sourcePath: "milestone-lines.xml",
      imageExists: () => true,
    });
    expect(edition.statistics.lines).toBe(3);
    expect(edition.columns[0].lines.map((line) => line.xmlId)).toEqual([
      "milestone_l1",
      "milestone_l2",
      "milestone_l3",
    ]);
    expect(edition.columns[0].lines[0].breakAfter).toBe("no");
    expect(edition.columns[0].diplomaticContinuous).toBe("préfixe suite");
  });

  it("résout une zone d’image sans inventer de coordonnées", () => {
    const edition = parseBible899Tei(fixture("zone-reference.xml"), {
      sourcePath: "zone-reference.xml",
      imageExists: () => true,
    });
    const facsimile = edition.columns[0].facsimiles[0];
    expect(facsimile.imageReference).toBe("zone.png");
    expect(facsimile.zoneId).toBe("zone_test");
    expect(facsimile.coordinates).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    expect(edition.control.missingCoordinates).toEqual([]);
  });

  it("signale précisément une référence d’image manquante", () => {
    const error = captureValidation(
      fixture("missing-image.xml"),
      "missing-image.xml",
      () => false,
    );
    expect(error.issues).toContainEqual(expect.objectContaining({
      code: "missing-image",
      sourcePath: "missing-image.xml",
      folio: "3r",
      column: "a",
    }));
  });

  it("refuse un identifiant de ligne dupliqué avec son emplacement", () => {
    const error = captureValidation(fixture("duplicate-id.xml"), "duplicate-id.xml");
    expect(error.issues).toContainEqual(expect.objectContaining({
      code: "duplicate-line-id",
      folio: "4r",
      column: "a",
      line: 2,
      xmlId: "duplicate_l1",
    }));
  });

  it("localise abbr sans expan, gap non qualifié, unclear vide et ligne sans identifiant", () => {
    const error = captureValidation(fixture("invalid-elements.xml"), "invalid-elements.xml");
    expect(error.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing-line-id",
      "incomplete-choice",
      "unqualified-gap",
      "empty-unclear",
    ]));
    for (const issue of error.issues) {
      expect(issue).toEqual(expect.objectContaining({
        sourcePath: "invalid-elements.xml",
        folio: "5r",
        column: "c",
        line: 1,
      }));
    }
  });

  it("conserve un ajout marginal dans les trois modes sans l’intégrer silencieusement au texte", () => {
    const edition = parseBible899Tei(fixture("marginal-addition.xml"), {
      sourcePath: "marginal-addition.xml",
      imageExists: () => true,
    });
    const line = edition.columns[0].lines[0];
    expect(edition.statistics.add).toBe(1);
    expect(line.marginalAdditions).toEqual([{ place: "margin", text: "mathusale" }]);
    expect(line.statuses).toContain("marginal-addition");
    expect(line.diplomatic).toBe("[ajout marginal : mathusale] uesqui");
    expect(line.expanded).toBe("[ajout marginal : mathusale] uesqui");
    expect(edition.columns[0].modernizedParagraphs).toEqual([
      "[ajout marginal : Mathusalem] vécut",
    ]);
    for (const mode of [
      line.diplomatic,
      line.expanded,
      ...edition.columns[0].modernizedParagraphs,
    ]) {
      expect(count(mode, MARGINAL_ADDITION_PREFIX)).toBe(1);
    }
  });

  it("refuse un ajout sans place, vide ou placé ailleurs que dans la marge", () => {
    const error = captureValidation(fixture("invalid-additions.xml"), "invalid-additions.xml");
    expect(error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing-add-place", xmlId: "invalid_add_l1" }),
      expect.objectContaining({ code: "empty-add", xmlId: "invalid_add_l2" }),
      expect.objectContaining({ code: "unsupported-add-place", xmlId: "invalid_add_l3" }),
    ]));
  });

  it("conserve une réclame fw séparée des lignes du corps et ne la modernise pas implicitement", () => {
    const edition = parseBible899Tei(fixture("catchword.xml"), {
      sourcePath: "catchword.xml",
      imageExists: () => true,
    });
    const column = edition.columns[0];
    expect(edition.statistics.catchword).toBe(1);
    expect(edition.statistics.lines).toBe(1);
    expect(column.lines).toHaveLength(1);
    expect(column.catchwords).toEqual([
      expect.objectContaining({
        xmlId: "catchword_test",
        type: "catchword",
        place: "bottom",
        diplomatic: "[lecture incertaine : les oeilles ua]",
        expanded: "[lecture incertaine : les oeilles ua]",
        statuses: expect.arrayContaining(["uncertain"]),
      }),
    ]);
    expect(column.modernizedParagraphs).toEqual(["Corps modernisé de test."]);
    expect(column.modernizedParagraphs.join(" ")).not.toContain("les oeilles ua");
  });
});

describe("manifeste de la source maîtresse", () => {
  it("charge le TEI uniquement lorsque le manifeste, les images et les comptages concordent", async () => {
    const manifest = await readBible899Manifest();
    const edition = await loadBible899Edition();
    expect(edition.teiSha256).toBe(manifest.teiSha256);
    expect(edition.statistics).toEqual(manifest.counts);
    expect(edition.control.usedImageReferences).toEqual(manifest.images.map((image) => image.reference));
  }, 20_000);

  it("ne transmet au lecteur que la colonne demandée et normalise le préfixe f", async () => {
    const edition = await loadBible899ReaderEdition("f297r_a");
    expect(edition.columns).toHaveLength(1);
    expect(edition.columns[0].key).toBe("297r_a");
    expect(edition.columnIndex.filter((column) => column.folio === "297r"))
      .toEqual([
        { key: "297r_a", folio: "297r", column: "a" },
        { key: "297r_b", folio: "297r", column: "b" },
      ]);
    expect(edition.materialLeaves).toBe(371);
    expect(edition.materialFaces).toBe(742);
    expect(edition.alternativeImages).toHaveLength(4);
    expect(JSON.stringify(edition).length).toBeLessThan(250_000);
  }, 20_000);

  it("rattache le second scan à la dernière surface matérielle", async () => {
    const edition = await loadBible899ReaderEdition("f372v_b");
    expect(edition.selectedAlternativeFacsimiles.map((image) => image.publicUrl))
      .toContain("/manuscrits/bible-899/f372v_b.png");
  }, 20_000);

  it("refuse une modification du TEI tant que le manifeste n’a pas été régénéré", async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "bible899-manifest-test-"));
    const targetTei = path.join(temporaryRoot, TEI_RELATIVE_PATH);
    const targetManifest = path.join(temporaryRoot, MANIFEST_RELATIVE_PATH);
    mkdirSync(path.dirname(targetTei), { recursive: true });
    writeFileSync(targetTei, prototypeXml.replace("de ethiope", "texte modifié"), "utf8");
    writeFileSync(targetManifest, readFileSync(path.join(process.cwd(), MANIFEST_RELATIVE_PATH)));
    await expect(loadBible899Edition(temporaryRoot)).rejects.toThrow(/empreinte SHA-256 différente/);
  });
});

describe("non-régression du prototype v0.4", () => {
  it("conserve l’empreinte du fichier éditorial historique", () => {
    // L’empreinte éditoriale de référence a été calculée sur le fichier LF.
    // Normaliser uniquement les fins de ligne rend ce garde-fou reproductible
    // dans un worktree Windows sans masquer la moindre variation XML.
    expect(sha256Text(prototypeXml.replace(/\r\n/g, "\n"))).toBe(
      "90b0fb0ab81ef5f36f9d1ae20e0786202dd4df3183314e1ce48d11066f996a84",
    );
  });

  it("conserve 120 lignes, trois colonnes de 40 lignes, 58 choice, 8 gap et 2 unclear", () => {
    const edition = parseBible899Tei(prototypeXml, {
      sourcePath: "prototype-v0.4.xml",
      imageExists: () => true,
    });
    expect(edition.statistics).toEqual({
      folios: 2,
      columns: 3,
      lines: 120,
      choice: 58,
      gap: 8,
      unclear: 2,
      add: 0,
      catchword: 0,
    });
    expect(edition.columns.map((column) => column.lines.length)).toEqual([40, 40, 40]);
    expect(edition.columns.reduce((sum, column) => sum + column.modernizedParagraphs.length, 0)).toBe(3);
  });

  it("reproduit exactement les 120 lignes diplomatiques et développées de référence", () => {
    const edition = parseBible899Tei(prototypeXml);
    const referenceLines = edition.columns.flatMap((column) =>
      column.lines.map((line) => ({
        n: line.n,
        diplomatic: line.diplomatic,
        expanded: line.expanded,
        break_after: line.breakAfter,
        statuses: line.statuses,
      })),
    );
    const hash = createHash("sha256").update(canonicalJson(referenceLines), "utf8").digest("hex");
    expect(hash).toBe("d281ed6efb1bc04c579ff32e7300d6699810a10874fbf30524828b981cda1820");
  });

  it("conserve les lacunes, les lectures incertaines et les coupures internes dans les trois modes", () => {
    const edition = parseBible899Tei(prototypeXml);
    const diplomatic = edition.columns.flatMap((column) => column.lines.map((line) => line.diplomatic)).join("\n");
    const expanded = edition.columns.flatMap((column) => column.lines.map((line) => line.expanded)).join("\n");
    const modernized = edition.columns.flatMap((column) => column.modernizedParagraphs).join("\n");
    for (const mode of [diplomatic, expanded, modernized]) {
      expect(count(mode, GAP_MARKER)).toBe(8);
      expect(count(mode, UNCLEAR_PREFIX)).toBe(2);
    }
    expect(edition.columns[0].lines[3].breakAfter).toBe("no");
    expect(edition.columns[0].diplomaticContinuous).toContain("el paradis");
    expect(edition.columns[0].diplomaticContinuous).not.toContain("el pa radis");
  });
});
