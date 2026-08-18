import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type AlternativeManifestImageInfo,
  type Bible899Edition,
  type Bible899ReaderEdition,
  type Bible899Statistics,
  type FacsimileReference,
  type ManifestImageInfo,
  TeiValidationError,
  parseBible899Tei,
  sha256Text,
} from "./tei";
import { initialColumnKey } from "./readingModes";

export const MANUSCRIPT_ID = "bible-899";
export const TEI_RELATIVE_PATH = "data/manuscrits/bible-899/Bible_899_master.xml";
export const MANIFEST_RELATIVE_PATH = "data/manuscrits/bible-899/manifest.json";
export const PUBLIC_IMAGE_DIRECTORY = "public/manuscrits/bible-899";
export const PUBLIC_IMAGE_URL = "/manuscrits/bible-899";

export type Bible899Manifest = {
  schemaVersion: 1;
  manuscriptId: string;
  editorialVersion: string;
  teiPath: string;
  teiSha256: string;
  generatedAt: string;
  counts: Bible899Statistics;
  images: ManifestImageInfo[];
  alternativeImages?: AlternativeManifestImageInfo[];
  foliation?: {
    materialLeaves: number;
    materialFaces: number;
    firstNativeFolio: number;
    lastNativeFolio: number;
    omittedNativeFolioNumbers: number[];
  };
};

type ReaderSource = {
  edition: Bible899Edition;
  manifest: Bible899Manifest;
};

let readerSourceCache: {
  key: string;
  promise: Promise<ReaderSource>;
} | null = null;

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/");
}

function resolveInside(rootDirectory: string, relativePath: string): string {
  const root = path.resolve(rootDirectory);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Chemin hors du projet refusé : ${relativePath}`);
  }
  return resolved;
}

async function sha256File(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function pngDimensions(buffer: Buffer): { width: number; height: number } | null {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  return null;
}

async function imageDimensions(filePath: string): Promise<{ width: number | null; height: number | null }> {
  const buffer = await readFile(filePath);
  const dimensions = pngDimensions(buffer) ?? jpegDimensions(buffer);
  return dimensions ?? { width: null, height: null };
}

function assertManifestShape(value: unknown, manifestPath: string): asserts value is Bible899Manifest {
  if (!value || typeof value !== "object") {
    throw new Error(`${manifestPath} : manifeste JSON invalide`);
  }
  const manifest = value as Partial<Bible899Manifest>;
  if (manifest.schemaVersion !== 1) {
    throw new Error(`${manifestPath} : schemaVersion doit valoir 1`);
  }
  if (manifest.manuscriptId !== MANUSCRIPT_ID) {
    throw new Error(`${manifestPath} : manuscriptId attendu : ${MANUSCRIPT_ID}`);
  }
  if (!manifest.teiPath || !manifest.teiSha256 || !manifest.counts || !Array.isArray(manifest.images)) {
    throw new Error(`${manifestPath} : champs obligatoires manquants`);
  }
  const countKeys: Array<keyof Bible899Statistics> = [
    "folios",
    "columns",
    "lines",
    "choice",
    "gap",
    "unclear",
    "add",
    "catchword",
  ];
  if (countKeys.some((key) => !Number.isInteger(manifest.counts?.[key]))) {
    throw new Error(`${manifestPath} : comptages structurels absents ou invalides`);
  }
}

function sameCounts(actual: Bible899Statistics, expected: Bible899Statistics): boolean {
  return (Object.keys(expected) as Array<keyof Bible899Statistics>).every(
    (key) => actual[key] === expected[key],
  );
}

function referencedImagesMatch(edition: Bible899Edition, images: ManifestImageInfo[]): boolean {
  const actual = [...edition.control.usedImageReferences].sort();
  const expected = images.map((image) => image.reference).sort();
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function buildBible899Manifest(
  rootDirectory = process.cwd(),
  generatedAt = new Date().toISOString(),
): Promise<{ edition: Bible899Edition; manifest: Bible899Manifest }> {
  const teiPath = resolveInside(rootDirectory, TEI_RELATIVE_PATH);
  const xml = await readFile(teiPath, "utf8");
  const preliminaryEdition = parseBible899Tei(xml, {
    sourcePath: teiPath,
    publicImageBase: PUBLIC_IMAGE_URL,
  });
  const images: ManifestImageInfo[] = [];
  const filesSeen = new Map<string, string>();

  for (const reference of preliminaryEdition.control.usedImageReferences) {
    const file = path.posix.basename(reference.replace(/\\/gu, "/"));
    const previousReference = filesSeen.get(file);
    if (previousReference && previousReference !== reference) {
      throw new Error(
        `${teiPath} : deux références d’image différentes utilisent le même nom de fichier : ${previousReference} et ${reference}`,
      );
    }
    filesSeen.set(file, reference);
    const publicPath = normalizeRelativePath(path.posix.join(PUBLIC_IMAGE_DIRECTORY, file));
    const absoluteImagePath = resolveInside(rootDirectory, publicPath);
    if (!existsSync(absoluteImagePath)) {
      throw new Error(`${teiPath} : fac-similé référencé introuvable : ${reference} (${absoluteImagePath})`);
    }
    const dimensions = await imageDimensions(absoluteImagePath);
    images.push({
      reference,
      file,
      publicPath,
      publicUrl: `${PUBLIC_IMAGE_URL}/${file}`,
      sha256: await sha256File(absoluteImagePath),
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  const imageReferences = new Set(images.map((image) => image.reference));
  const edition = parseBible899Tei(xml, {
    sourcePath: teiPath,
    publicImageBase: PUBLIC_IMAGE_URL,
    manifestImages: images,
    imageExists: (reference) => imageReferences.has(reference),
  });
  return {
    edition,
    manifest: {
      schemaVersion: 1,
      manuscriptId: MANUSCRIPT_ID,
      editorialVersion: edition.manuscript.version,
      teiPath: TEI_RELATIVE_PATH,
      teiSha256: sha256Text(xml),
      generatedAt,
      counts: edition.statistics,
      images,
    },
  };
}

export async function writeBible899Manifest(
  rootDirectory = process.cwd(),
  generatedAt = new Date().toISOString(),
): Promise<Bible899Manifest> {
  const { manifest } = await buildBible899Manifest(rootDirectory, generatedAt);
  const manifestPath = resolveInside(rootDirectory, MANIFEST_RELATIVE_PATH);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function readBible899Manifest(rootDirectory = process.cwd()): Promise<Bible899Manifest> {
  const manifestPath = resolveInside(rootDirectory, MANIFEST_RELATIVE_PATH);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`${manifestPath} : manifeste absent ou illisible`, { cause: error });
  }
  assertManifestShape(value, manifestPath);
  return value;
}

export async function loadBible899Edition(rootDirectory = process.cwd()): Promise<Bible899Edition> {
  const manifest = await readBible899Manifest(rootDirectory);
  const manifestPath = resolveInside(rootDirectory, MANIFEST_RELATIVE_PATH);
  const teiPath = resolveInside(rootDirectory, manifest.teiPath);
  const xml = await readFile(teiPath, "utf8");
  const actualSha256 = sha256Text(xml);
  if (actualSha256 !== manifest.teiSha256) {
    throw new Error(
      `${teiPath} : empreinte SHA-256 différente du manifeste ${manifestPath}. Exécuter npm run bible899:manifest après validation éditoriale explicite.`,
    );
  }

  const imageByReference = new Map(manifest.images.map((image) => [image.reference, image]));
  for (const image of manifest.images) {
    const imagePath = resolveInside(rootDirectory, image.publicPath);
    if (!existsSync(imagePath)) {
      throw new Error(`${manifestPath} : image absente : ${image.publicPath}`);
    }
    const actualImageSha256 = await sha256File(imagePath);
    if (actualImageSha256 !== image.sha256) {
      throw new Error(`${manifestPath} : empreinte d’image différente : ${image.publicPath}`);
    }
  }

  let edition: Bible899Edition;
  try {
    edition = parseBible899Tei(xml, {
      sourcePath: teiPath,
      publicImageBase: PUBLIC_IMAGE_URL,
      manifestImages: manifest.images,
      imageExists: (reference) => imageByReference.has(reference),
    });
  } catch (error) {
    if (error instanceof TeiValidationError) throw error;
    throw new Error(`${teiPath} : échec de lecture du TEI`, { cause: error });
  }

  if (!sameCounts(edition.statistics, manifest.counts)) {
    throw new Error(`${manifestPath} : les comptages ne correspondent plus au TEI`);
  }
  if (!referencedImagesMatch(edition, manifest.images)) {
    throw new Error(`${manifestPath} : la liste des images ne correspond plus au TEI`);
  }
  if (edition.manuscript.version !== manifest.editorialVersion) {
    throw new Error(`${manifestPath} : la version éditoriale ne correspond plus au TEI`);
  }
  return edition;
}

function alternativeFacsimile(image: AlternativeManifestImageInfo): FacsimileReference {
  return {
    sourceReference: image.reference,
    imageReference: image.reference,
    publicUrl: image.publicUrl,
    zoneId: null,
    coordinates: null,
    coordinatesPresent: false,
    width: image.width,
    height: image.height,
  };
}

async function loadBible899ReaderSource(rootDirectory: string): Promise<ReaderSource> {
  const manifest = await readBible899Manifest(rootDirectory);
  const teiPath = resolveInside(rootDirectory, manifest.teiPath);
  const teiStat = await stat(teiPath);
  const cacheKey = `${teiPath}:${manifest.teiSha256}:${teiStat.size}:${teiStat.mtimeMs}`;
  if (readerSourceCache?.key === cacheKey) return readerSourceCache.promise;

  const promise = (async () => {
    const xml = await readFile(teiPath, "utf8");
    if (sha256Text(xml) !== manifest.teiSha256) {
      throw new Error(
        `${teiPath} : empreinte SHA-256 différente du manifeste. Régénérer le manifeste après validation éditoriale explicite.`,
      );
    }
    const imageReferences = new Set(manifest.images.map((image) => image.reference));
    const edition = parseBible899Tei(xml, {
      sourcePath: teiPath,
      publicImageBase: PUBLIC_IMAGE_URL,
      manifestImages: manifest.images,
      imageExists: (reference) => imageReferences.has(reference),
    });
    if (!sameCounts(edition.statistics, manifest.counts)) {
      throw new Error(`${MANIFEST_RELATIVE_PATH} : les comptages ne correspondent plus au TEI`);
    }
    return { edition, manifest };
  })();

  readerSourceCache = { key: cacheKey, promise };
  try {
    return await promise;
  } catch (error) {
    if (readerSourceCache?.promise === promise) readerSourceCache = null;
    throw error;
  }
}

export async function loadBible899ReaderEdition(
  requestedColumn: string | undefined,
  rootDirectory = process.cwd(),
): Promise<Bible899ReaderEdition> {
  const { edition, manifest } = await loadBible899ReaderSource(rootDirectory);
  const selectedKey = initialColumnKey(edition, requestedColumn);
  const selectedColumn = edition.columns.find((column) => column.key === selectedKey) ?? edition.columns[0];
  if (!selectedColumn) throw new Error("Le TEI Bible 899 ne contient aucune colonne à afficher.");

  const alternativeImages = manifest.alternativeImages ?? [];
  const primaryReferences = new Set(selectedColumn.facsimiles.map((item) => item.imageReference));
  const selectedAlternativeFacsimiles = alternativeImages
    .filter((image) => image.alternativeFor !== null && primaryReferences.has(image.alternativeFor))
    .map(alternativeFacsimile);

  return {
    manuscript: edition.manuscript,
    conventions: edition.conventions,
    folios: edition.folios,
    columns: [selectedColumn],
    columnIndex: edition.columns.map(({ key, folio, column }) => ({ key, folio, column })),
    statistics: edition.statistics,
    totalLines: edition.totalLines,
    teiSha256: edition.teiSha256,
    materialLeaves: manifest.foliation?.materialLeaves ?? Math.ceil(edition.folios.length / 2),
    materialFaces: manifest.foliation?.materialFaces ?? edition.folios.length,
    hasModernizedText: edition.columns.some((column) => column.modernizedParagraphs.length > 0),
    alternativeImages,
    selectedAlternativeFacsimiles,
  };
}
