import { createHash } from "node:crypto";
import path from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";

export const GAP_MARKER = "[lacune : déchirure]";
export const UNCLEAR_PREFIX = "[lecture incertaine : ";
export const MARGINAL_ADDITION_PREFIX = "[ajout marginal : ";

type ModeSource = "diplomatic" | "expanded";
type XmlNode = Record<string, unknown>;
type XmlAttributes = Record<string, string>;

export type TeiLocation = {
  folio?: string;
  column?: string;
  line?: string | number;
  xmlId?: string;
};

export type TeiValidationIssue = TeiLocation & {
  code: string;
  message: string;
  sourcePath: string;
};

export class TeiValidationError extends Error {
  readonly issues: TeiValidationIssue[];

  constructor(issues: TeiValidationIssue[]) {
    super(issues.map(formatValidationIssue).join("\n"));
    this.name = "TeiValidationError";
    this.issues = issues;
  }
}

export type FacsimileCoordinates = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ManifestImageInfo = {
  reference: string;
  file: string;
  publicPath: string;
  publicUrl: string;
  sha256: string;
  width: number | null;
  height: number | null;
};

export type FacsimileReference = {
  sourceReference: string;
  imageReference: string;
  publicUrl: string;
  zoneId: string | null;
  coordinates: FacsimileCoordinates | null;
  coordinatesPresent: boolean;
  width: number | null;
  height: number | null;
};

export type Bible899Line = {
  xmlId: string;
  n: number | string;
  diplomatic: string;
  expanded: string;
  breakAfter: "yes" | "no";
  statuses: string[];
  marginalAdditions: MarginalAddition[];
  facsimiles: FacsimileReference[];
};

export type MarginalAddition = {
  place: "margin";
  text: string;
};

export type Bible899Catchword = {
  xmlId: string;
  type: "catchword";
  place: string | null;
  diplomatic: string;
  expanded: string;
  statuses: string[];
  facsimiles: FacsimileReference[];
};

export type Bible899Column = {
  key: string;
  xmlId: string | null;
  folio: string;
  column: string;
  lines: Bible899Line[];
  diplomaticContinuous: string;
  expandedContinuous: string;
  modernizedParagraphs: string[];
  catchwords: Bible899Catchword[];
  facsimiles: FacsimileReference[];
};

export type Bible899Folio = {
  n: string;
  columnKeys: string[];
};

export type Bible899Statistics = {
  folios: number;
  columns: number;
  lines: number;
  choice: number;
  gap: number;
  unclear: number;
  add: number;
  catchword: number;
};

export type Bible899Edition = {
  manuscript: {
    repository: string;
    shelfmark: string;
    date: string;
    sample: string;
    version: string;
    status: string;
    technicalStatus: string;
  };
  conventions: {
    gap: string;
    unclear: string;
    marginalAddition: string;
  };
  folios: Bible899Folio[];
  columns: Bible899Column[];
  statistics: Bible899Statistics;
  totalLines: number;
  teiSha256: string;
  control: {
    usedImageReferences: string[];
    missingCoordinates: string[];
    unmatchedModernizedUnits: string[];
  };
};

export type ParseBible899Options = {
  sourcePath?: string;
  publicImageBase?: string;
  manifestImages?: ManifestImageInfo[];
  imageExists?: (imageReference: string) => boolean;
};

type ZoneDefinition = {
  imageReference: string;
  coordinates: FacsimileCoordinates | null;
};

type TemporaryLine = Bible899Line & {
  breakBefore: "yes" | "no";
};

type TemporaryColumn = Omit<Bible899Column, "lines" | "diplomaticContinuous" | "expandedContinuous" | "modernizedParagraphs"> & {
  lines: TemporaryLine[];
};

const STRUCTURAL_ELEMENTS = new Set(["pb", "cb", "l", "lb", "fw"]);
const INLINE_ELEMENTS = new Set(["choice", "gap", "unclear", "add", "abbr", "expan"]);

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function formatValidationIssue(issue: TeiValidationIssue): string {
  const context = [
    issue.folio ? `folio ${issue.folio}` : "",
    issue.column ? `colonne ${issue.column}` : "",
    issue.line !== undefined ? `ligne ${issue.line}` : "",
    issue.xmlId ? `xml:id=${issue.xmlId}` : "",
  ].filter(Boolean);
  return `${issue.sourcePath}${context.length ? ` — ${context.join(", ")}` : ""} : ${issue.message}`;
}

function normalize(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

function elementName(node: XmlNode): string | null {
  return (
    Object.keys(node).find(
      (key) => key !== ":@" && key !== "#text" && !key.startsWith("?"),
    ) ?? null
  );
}

function children(node: XmlNode): XmlNode[] {
  const name = elementName(node);
  if (!name) return [];
  const value = node[name];
  return Array.isArray(value) ? (value as XmlNode[]) : [];
}

function attributes(node: XmlNode): XmlAttributes {
  const value = node[":@"];
  return value && typeof value === "object" ? (value as XmlAttributes) : {};
}

function descendants(nodes: XmlNode[], wantedName?: string): XmlNode[] {
  const found: XmlNode[] = [];
  for (const node of nodes) {
    const name = elementName(node);
    if (name && (!wantedName || name === wantedName)) found.push(node);
    found.push(...descendants(children(node), wantedName));
  }
  return found;
}

function findDescendant(
  nodes: XmlNode[],
  wantedName: string,
  predicate: (node: XmlNode) => boolean = () => true,
): XmlNode | undefined {
  return descendants(nodes, wantedName).find(predicate);
}

function directChild(node: XmlNode, wantedName: string): XmlNode | undefined {
  return children(node).find((child) => elementName(child) === wantedName);
}

function rawText(nodes: XmlNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (typeof node["#text"] === "string") result += node["#text"];
    result += rawText(children(node));
  }
  return result;
}

function orderedDiplomaticStream(nodes: XmlNode[]): XmlNode[] {
  const stream: XmlNode[] = [];
  for (const node of nodes) {
    const name = elementName(node);
    if (!name || STRUCTURAL_ELEMENTS.has(name) || INLINE_ELEMENTS.has(name)) {
      stream.push(node);
    } else {
      stream.push(...orderedDiplomaticStream(children(node)));
    }
  }
  return stream;
}

function lineNumber(value: string | undefined, fallback: number): number | string {
  if (!value) return fallback;
  return /^\d+$/u.test(value) ? Number(value) : value;
}

function markerForGap(node: XmlNode): string {
  const attrs = attributes(node);
  if (attrs["@_cause"] === "tear") return GAP_MARKER;
  return `[lacune : ${attrs["@_cause"] ?? attrs["@_reason"] ?? "non précisée"}]`;
}

function markerForMarginalAddition(node: XmlNode): string {
  return `${MARGINAL_ADDITION_PREFIX}${normalize(rawText(children(node)))}]`;
}

function marginalAdditions(nodes: XmlNode[]): MarginalAddition[] {
  return descendants(nodes, "add").map((node) => ({
    place: "margin",
    text: normalize(rawText(children(node))),
  }));
}

function renderInline(nodes: XmlNode[], mode: ModeSource): string {
  let result = "";
  for (const node of nodes) {
    if (typeof node["#text"] === "string") {
      result += node["#text"];
      continue;
    }
    const name = elementName(node);
    if (!name) continue;
    if (name === "choice") {
      const selected = directChild(node, mode === "diplomatic" ? "abbr" : "expan");
      result += selected ? rawText(children(selected)) : "";
    } else if (name === "gap") {
      result += markerForGap(node);
    } else if (name === "unclear") {
      result += `${UNCLEAR_PREFIX}${normalize(rawText(children(node)))}]`;
    } else if (name === "add") {
      result += markerForMarginalAddition(node);
    } else {
      result += renderInline(children(node), mode);
    }
  }
  return normalize(result);
}

function continuous(lines: Bible899Line[], field: "diplomatic" | "expanded"): string {
  return lines
    .map((line, index) => {
      const separator = index === lines.length - 1 || line.breakAfter === "no" ? "" : " ";
      return line[field] + separator;
    })
    .join("");
}

function splitFacsimileReferences(value: string | undefined): string[] {
  return value?.trim().split(/\s+/u).filter(Boolean) ?? [];
}

function parseMediaFragment(reference: string): {
  imageReference: string;
  coordinates: FacsimileCoordinates | null;
} {
  const match = reference.match(/^(.*?)#xywh=(?:pixel:)?(\d+),(\d+),(\d+),(\d+)$/u);
  if (!match) return { imageReference: reference, coordinates: null };
  return {
    imageReference: match[1],
    coordinates: {
      x: Number(match[2]),
      y: Number(match[3]),
      width: Number(match[4]),
      height: Number(match[5]),
    },
  };
}

function coordinatesFromZone(node: XmlNode): FacsimileCoordinates | null {
  const attrs = attributes(node);
  const values = ["@_ulx", "@_uly", "@_lrx", "@_lry"].map((name) => Number(attrs[name]));
  if (values.some((value) => !Number.isFinite(value))) return null;
  return {
    x: values[0],
    y: values[1],
    width: values[2] - values[0],
    height: values[3] - values[1],
  };
}

function buildZoneIndex(document: XmlNode[]): Map<string, ZoneDefinition> {
  const zones = new Map<string, ZoneDefinition>();
  for (const surface of descendants(document, "surface")) {
    const graphic = findDescendant(children(surface), "graphic");
    const imageReference = graphic
      ? attributes(graphic)["@_url"] ?? attributes(graphic)["@_facs"] ?? ""
      : "";
    for (const zone of descendants(children(surface), "zone")) {
      const xmlId = attributes(zone)["@_xml:id"];
      if (xmlId) {
        zones.set(xmlId, {
          imageReference: attributes(zone)["@_facs"] ?? imageReference,
          coordinates: coordinatesFromZone(zone),
        });
      }
    }
  }
  return zones;
}

function resolveFacsimiles(
  references: string[],
  zones: Map<string, ZoneDefinition>,
  imageRegistry: Map<string, ManifestImageInfo>,
  publicImageBase: string,
  issues: TeiValidationIssue[],
  sourcePath: string,
  location: TeiLocation,
): FacsimileReference[] {
  return references.flatMap((sourceReference) => {
    let zoneId: string | null = null;
    let imageReference = sourceReference;
    let coordinates: FacsimileCoordinates | null = null;
    if (sourceReference.startsWith("#")) {
      zoneId = sourceReference.slice(1);
      const zone = zones.get(zoneId);
      if (!zone) {
        issues.push({
          code: "missing-zone",
          message: `la zone de fac-similé ${sourceReference} n’existe pas`,
          sourcePath,
          ...location,
        });
        return [];
      }
      imageReference = zone.imageReference;
      coordinates = zone.coordinates;
    } else {
      const media = parseMediaFragment(sourceReference);
      imageReference = media.imageReference;
      coordinates = media.coordinates;
    }
    if (!imageReference) {
      issues.push({
        code: "missing-image-reference",
        message: `la référence ${sourceReference} ne désigne aucune image`,
        sourcePath,
        ...location,
      });
      return [];
    }
    const file = path.posix.basename(imageReference.replace(/\\/gu, "/"));
    const manifestImage = imageRegistry.get(imageReference) ?? imageRegistry.get(file);
    return [{
      sourceReference,
      imageReference,
      publicUrl: manifestImage?.publicUrl ?? `${publicImageBase}/${file}`,
      zoneId,
      coordinates,
      coordinatesPresent: coordinates !== null,
      width: manifestImage?.width ?? null,
      height: manifestImage?.height ?? null,
    }];
  });
}

function validateInlineNodes(
  nodes: XmlNode[],
  issues: TeiValidationIssue[],
  sourcePath: string,
  location: TeiLocation,
): void {
  for (const choice of descendants(nodes, "choice")) {
    if (!directChild(choice, "abbr") || !directChild(choice, "expan")) {
      issues.push({
        code: "incomplete-choice",
        message: "toute abréviation doit contenir abbr et expan",
        sourcePath,
        ...location,
      });
    }
  }
  for (const gap of descendants(nodes, "gap")) {
    const attrs = attributes(gap);
    if (!attrs["@_reason"] && !attrs["@_cause"]) {
      issues.push({
        code: "unqualified-gap",
        message: "tout gap doit posséder au moins un attribut reason ou cause",
        sourcePath,
        ...location,
      });
    }
  }
  for (const unclear of descendants(nodes, "unclear")) {
    if (!normalize(rawText(children(unclear)))) {
      issues.push({
        code: "empty-unclear",
        message: "tout unclear doit conserver un contenu identifiable",
        sourcePath,
        ...location,
      });
    }
  }
  for (const addition of descendants(nodes, "add")) {
    const attrs = attributes(addition);
    if (!attrs["@_place"]) {
      issues.push({
        code: "missing-add-place",
        message: "tout add doit posséder un attribut place",
        sourcePath,
        ...location,
      });
    } else if (attrs["@_place"] !== "margin") {
      issues.push({
        code: "unsupported-add-place",
        message: `valeur place non admise pour add : ${attrs["@_place"]}`,
        sourcePath,
        ...location,
      });
    }
    if (!normalize(rawText(children(addition)))) {
      issues.push({
        code: "empty-add",
        message: "tout add doit conserver un contenu identifiable",
        sourcePath,
        ...location,
      });
    }
  }
}

function optionalText(
  rootChildren: XmlNode[],
  name: string,
  predicate: (node: XmlNode) => boolean = () => true,
): string {
  const node = findDescendant(rootChildren, name, predicate);
  return node ? normalize(rawText(children(node))) : "";
}

export function parseBible899Tei(
  xml: string,
  options: ParseBible899Options = {},
): Bible899Edition {
  const sourcePath = options.sourcePath ?? "TEI Bible 899";
  const publicImageBase = options.publicImageBase ?? "/manuscrits/bible-899";
  const issues: TeiValidationIssue[] = [];
  const xmlValidation = XMLValidator.validate(xml);
  if (xmlValidation !== true) {
    throw new TeiValidationError([{
      code: "invalid-xml",
      message: `XML non conforme : ${xmlValidation.err.msg}, ligne ${xmlValidation.err.line}`,
      sourcePath,
    }]);
  }

  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: false,
    processEntities: false,
  });
  const document = parser.parse(xml) as XmlNode[];
  const tei = findDescendant(document, "TEI");
  if (!tei) {
    throw new TeiValidationError([{
      code: "missing-tei-root",
      message: "élément racine TEI manquant",
      sourcePath,
    }]);
  }
  const rootChildren = children(tei);
  const diplomaticDiv = findDescendant(
    rootChildren,
    "div",
    (node) => attributes(node)["@_type"] === "diplomatic",
  );
  if (!diplomaticDiv) {
    throw new TeiValidationError([{
      code: "missing-diplomatic-layer",
      message: "division TEI de type diplomatic manquante",
      sourcePath,
    }]);
  }

  const editionNode = findDescendant(rootChildren, "edition");
  const editionAttrs = editionNode ? attributes(editionNode) : {};
  const technicalStatus = editionAttrs["@_status"] ?? "";
  const modernizedDiv = findDescendant(
    rootChildren,
    "div",
    (node) => attributes(node)["@_type"] === "modernized",
  );
  const modernized = new Map<string, string[]>();
  const unmatchedModernizedUnits: string[] = [];
  if (modernizedDiv) {
    for (const paragraph of descendants(children(modernizedDiv), "p")) {
      const attrs = attributes(paragraph);
      const key = (attrs["@_corresp"] ?? attrs["@_n"] ?? "").replace(/^#/u, "");
      if (!key) {
        unmatchedModernizedUnits.push("paragraphe sans @n ou @corresp");
        continue;
      }
      validateInlineNodes(children(paragraph), issues, sourcePath, { column: key });
      const list = modernized.get(key) ?? [];
      list.push(renderInline(children(paragraph), "expanded"));
      modernized.set(key, list);
    }
  }

  const zones = buildZoneIndex(document);
  const imageRegistry = new Map<string, ManifestImageInfo>();
  for (const image of options.manifestImages ?? []) {
    imageRegistry.set(image.reference, image);
    imageRegistry.set(image.file, image);
  }

  const columns: TemporaryColumn[] = [];
  const folioOrder: string[] = [];
  const seenColumnKeys = new Set<string>();
  const seenLineIds = new Map<string, TeiLocation>();
  const usedImageLocations = new Map<string, TeiLocation>();
  let currentFolio = "";
  let currentFolioFacs: string[] = [];
  let currentColumn: TemporaryColumn | null = null;
  let pendingMilestone: { attrs: XmlAttributes; content: XmlNode[] } | null = null;

  const recordImageLocations = (facsimiles: FacsimileReference[], location: TeiLocation) => {
    for (const facsimile of facsimiles) {
      if (!usedImageLocations.has(facsimile.imageReference)) {
        usedImageLocations.set(facsimile.imageReference, location);
      }
    }
  };

  const finishColumn = () => {
    if (!currentColumn) return;
    columns.push(currentColumn);
    currentColumn = null;
  };

  const addLine = (attrs: XmlAttributes, content: XmlNode[]) => {
    const fallback = currentColumn ? currentColumn.lines.length + 1 : 1;
    const n = lineNumber(attrs["@_n"], fallback);
    const xmlId = attrs["@_xml:id"] ?? "";
    const location: TeiLocation = {
      folio: currentFolio || undefined,
      column: currentColumn?.column,
      line: n,
      xmlId: xmlId || undefined,
    };
    if (!currentColumn) {
      issues.push({
        code: "line-outside-column",
        message: "ligne rencontrée avant tout jalon cb",
        sourcePath,
        ...location,
      });
      return;
    }
    if (!xmlId) {
      issues.push({
        code: "missing-line-id",
        message: "chaque ligne doit posséder un xml:id stable",
        sourcePath,
        ...location,
      });
    } else if (seenLineIds.has(xmlId)) {
      issues.push({
        code: "duplicate-line-id",
        message: `identifiant de ligne dupliqué : ${xmlId}`,
        sourcePath,
        ...location,
      });
    } else {
      seenLineIds.set(xmlId, location);
    }
    if (attrs["@_break"] && !["yes", "no"].includes(attrs["@_break"])) {
      issues.push({
        code: "invalid-break",
        message: `valeur break non admise : ${attrs["@_break"]}`,
        sourcePath,
        ...location,
      });
    }
    validateInlineNodes(content, issues, sourcePath, location);
    const explicitFacs = splitFacsimileReferences(attrs["@_facs"]);
    const facsimiles = explicitFacs.length
      ? resolveFacsimiles(explicitFacs, zones, imageRegistry, publicImageBase, issues, sourcePath, location)
      : currentColumn.facsimiles;
    recordImageLocations(facsimiles, location);
    const hasUnclear = descendants(content, "unclear").length > 0;
    const hasGap = descendants(content, "gap").length > 0;
    const additions = marginalAdditions(content);
    currentColumn.lines.push({
      xmlId,
      n,
      diplomatic: renderInline(content, "diplomatic"),
      expanded: renderInline(content, "expanded"),
      breakBefore: attrs["@_break"] === "no" ? "no" : "yes",
      breakAfter: "yes",
      statuses: [
        ...(technicalStatus ? [technicalStatus] : []),
        ...(hasUnclear ? ["uncertain"] : []),
        ...(hasGap ? ["lacuna"] : []),
        ...(additions.length > 0 ? ["marginal-addition"] : []),
      ],
      marginalAdditions: additions,
      facsimiles,
    });
  };

  const addCatchword = (attrs: XmlAttributes, content: XmlNode[]) => {
    const xmlId = attrs["@_xml:id"] ?? "";
    const location: TeiLocation = {
      folio: currentFolio || undefined,
      column: currentColumn?.column,
      xmlId: xmlId || undefined,
    };
    if (!currentColumn) {
      issues.push({
        code: "catchword-outside-column",
        message: "réclame fw rencontrée avant tout jalon cb",
        sourcePath,
        ...location,
      });
      return;
    }
    if (attrs["@_type"] !== "catchword") {
      issues.push({
        code: "unsupported-fw-type",
        message: `type de fw non admis : ${attrs["@_type"] ?? "absent"}`,
        sourcePath,
        ...location,
      });
      return;
    }
    if (!xmlId) {
      issues.push({
        code: "missing-catchword-id",
        message: "toute réclame fw doit posséder un xml:id stable",
        sourcePath,
        ...location,
      });
    }
    validateInlineNodes(content, issues, sourcePath, location);
    const diplomatic = renderInline(content, "diplomatic");
    const expanded = renderInline(content, "expanded");
    if (!diplomatic) {
      issues.push({
        code: "empty-catchword",
        message: "toute réclame fw doit conserver un contenu identifiable",
        sourcePath,
        ...location,
      });
    }
    const explicitFacs = splitFacsimileReferences(attrs["@_facs"]);
    const facsimiles = explicitFacs.length
      ? resolveFacsimiles(explicitFacs, zones, imageRegistry, publicImageBase, issues, sourcePath, location)
      : currentColumn.facsimiles;
    recordImageLocations(facsimiles, location);
    currentColumn.catchwords.push({
      xmlId,
      type: "catchword",
      place: attrs["@_place"] ?? null,
      diplomatic,
      expanded,
      statuses: [
        ...(technicalStatus ? [technicalStatus] : []),
        ...(descendants(content, "unclear").length > 0 ? ["uncertain"] : []),
        ...(descendants(content, "gap").length > 0 ? ["lacuna"] : []),
        ...(descendants(content, "add").length > 0 ? ["marginal-addition"] : []),
      ],
      facsimiles,
    });
  };

  const finishPendingMilestone = () => {
    if (!pendingMilestone) return;
    addLine(pendingMilestone.attrs, pendingMilestone.content);
    pendingMilestone = null;
  };

  for (const node of orderedDiplomaticStream(children(diplomaticDiv))) {
    const name = elementName(node);
    if (name === "pb") {
      finishPendingMilestone();
      finishColumn();
      const attrs = attributes(node);
      currentFolio = attrs["@_n"] ?? "";
      if (!currentFolio) {
        issues.push({
          code: "missing-folio-number",
          message: "tout jalon pb doit posséder un attribut n",
          sourcePath,
        });
      } else if (!folioOrder.includes(currentFolio)) {
        folioOrder.push(currentFolio);
      }
      currentFolioFacs = splitFacsimileReferences(attrs["@_facs"]);
    } else if (name === "cb") {
      finishPendingMilestone();
      finishColumn();
      const attrs = attributes(node);
      const column = attrs["@_n"] ?? "";
      if (!currentFolio) {
        issues.push({
          code: "column-outside-folio",
          message: "jalon cb rencontré avant tout jalon pb",
          sourcePath,
          column: column || undefined,
        });
      }
      if (!column) {
        issues.push({
          code: "missing-column-number",
          message: "tout jalon cb doit posséder un attribut n",
          sourcePath,
          folio: currentFolio || undefined,
        });
      }
      const key = `${currentFolio}_${column}`;
      if (seenColumnKeys.has(key)) {
        issues.push({
          code: "duplicate-column-key",
          message: `unité folio-colonne dupliquée : ${key}`,
          sourcePath,
          folio: currentFolio || undefined,
          column: column || undefined,
        });
      }
      seenColumnKeys.add(key);
      const references = splitFacsimileReferences(attrs["@_facs"]);
      const facsimiles = resolveFacsimiles(
        references.length ? references : currentFolioFacs,
        zones,
        imageRegistry,
        publicImageBase,
        issues,
        sourcePath,
        { folio: currentFolio || undefined, column: column || undefined },
      );
      recordImageLocations(facsimiles, { folio: currentFolio, column });
      currentColumn = {
        key,
        xmlId: attrs["@_xml:id"] ?? null,
        folio: currentFolio,
        column,
        lines: [],
        catchwords: [],
        facsimiles,
      };
    } else if (name === "l") {
      finishPendingMilestone();
      addLine(attributes(node), children(node));
    } else if (name === "lb") {
      finishPendingMilestone();
      pendingMilestone = { attrs: attributes(node), content: [] };
    } else if (name === "fw") {
      finishPendingMilestone();
      addCatchword(attributes(node), children(node));
    } else if (pendingMilestone) {
      pendingMilestone.content.push(node);
    } else if (typeof node["#text"] === "string" && normalize(node["#text"] as string)) {
      issues.push({
        code: "text-outside-line",
        message: "contenu textuel rencontré hors d’une ligne l ou lb",
        sourcePath,
        folio: currentFolio || undefined,
        column: currentColumn?.column,
      });
    }
  }
  finishPendingMilestone();
  finishColumn();

  const allTemporaryLines = columns.flatMap((column) => column.lines);
  for (let index = 0; index < allTemporaryLines.length - 1; index += 1) {
    allTemporaryLines[index].breakAfter = allTemporaryLines[index + 1].breakBefore === "no" ? "no" : "yes";
  }

  if (options.imageExists) {
    for (const [imageReference, location] of usedImageLocations) {
      if (!options.imageExists(imageReference)) {
        issues.push({
          code: "missing-image",
          message: `fac-similé référencé introuvable : ${imageReference}`,
          sourcePath,
          ...location,
        });
      }
    }
  }

  const allXmlIdCounts = new Map<string, number>();
  for (const element of descendants(document)) {
    const xmlId = attributes(element)["@_xml:id"];
    if (!xmlId) continue;
    allXmlIdCounts.set(xmlId, (allXmlIdCounts.get(xmlId) ?? 0) + 1);
  }
  for (const [xmlId, occurrences] of allXmlIdCounts) {
    const alreadyReportedAsLine = issues.some(
      (issue) => issue.code === "duplicate-line-id" && issue.xmlId === xmlId,
    );
    if (occurrences > 1 && !alreadyReportedAsLine) {
      issues.push({
        code: "duplicate-xml-id",
        message: `xml:id dupliqué : ${xmlId}`,
        sourcePath,
        ...seenLineIds.get(xmlId),
      });
    }
  }

  if (issues.length) throw new TeiValidationError(issues);

  const finalizedColumns: Bible899Column[] = columns.map((column) => {
    const lines: Bible899Line[] = column.lines.map((line) => ({
      xmlId: line.xmlId,
      n: line.n,
      diplomatic: line.diplomatic,
      expanded: line.expanded,
      breakAfter: line.breakAfter,
      statuses: line.statuses,
      marginalAdditions: line.marginalAdditions,
      facsimiles: line.facsimiles,
    }));
    const lookupKeys = [column.key, column.xmlId].filter((value): value is string => Boolean(value));
    const matchedKey = lookupKeys.find((key) => modernized.has(key));
    return {
      ...column,
      lines,
      diplomaticContinuous: continuous(lines, "diplomatic"),
      expandedContinuous: continuous(lines, "expanded"),
      modernizedParagraphs: matchedKey ? modernized.get(matchedKey) ?? [] : [],
    };
  });
  const matchedModernizedKeys = new Set(
    finalizedColumns.flatMap((column) => [column.key, column.xmlId].filter(Boolean)),
  );
  for (const key of modernized.keys()) {
    if (!matchedModernizedKeys.has(key)) unmatchedModernizedUnits.push(key);
  }

  const folios: Bible899Folio[] = folioOrder.map((folio) => ({
    n: folio,
    columnKeys: finalizedColumns.filter((column) => column.folio === folio).map((column) => column.key),
  }));
  const usedImageReferences = [...usedImageLocations.keys()];
  const missingCoordinates = finalizedColumns
    .filter((column) => column.facsimiles.length > 0 && column.facsimiles.every((item) => !item.coordinatesPresent))
    .map((column) => `${column.folio}_${column.column}`);
  for (const column of finalizedColumns) {
    for (const line of column.lines) {
      const hasExplicitLineFacs = line.facsimiles.some(
        (item) => !column.facsimiles.some((columnItem) => columnItem.sourceReference === item.sourceReference),
      );
      if (hasExplicitLineFacs && line.facsimiles.every((item) => !item.coordinatesPresent)) {
        missingCoordinates.push(line.xmlId);
      }
    }
  }

  const statistics: Bible899Statistics = {
    folios: folios.length,
    columns: finalizedColumns.length,
    lines: finalizedColumns.reduce((sum, column) => sum + column.lines.length, 0),
    choice: descendants(children(diplomaticDiv), "choice").length,
    gap: descendants(children(diplomaticDiv), "gap").length,
    unclear: descendants(children(diplomaticDiv), "unclear").length,
    add: descendants(children(diplomaticDiv), "add").length,
    catchword: descendants(children(diplomaticDiv), "fw")
      .filter((node) => attributes(node)["@_type"] === "catchword").length,
  };

  return {
    manuscript: {
      repository: optionalText(rootChildren, "repository"),
      shelfmark: optionalText(rootChildren, "idno"),
      date: optionalText(rootChildren, "origDate"),
      sample: optionalText(rootChildren, "note", (node) => attributes(node)["@_type"] === "sample"),
      version: editionAttrs["@_n"] ?? "",
      status: editionNode ? normalize(rawText(children(editionNode))) : "",
      technicalStatus,
    },
    conventions: {
      gap: GAP_MARKER,
      unclear: `${UNCLEAR_PREFIX}…]`,
      marginalAddition: `${MARGINAL_ADDITION_PREFIX}…]`,
    },
    folios,
    columns: finalizedColumns,
    statistics,
    totalLines: statistics.lines,
    teiSha256: sha256Text(xml),
    control: {
      usedImageReferences,
      missingCoordinates,
      unmatchedModernizedUnits,
    },
  };
}
