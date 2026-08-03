import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  MANIFEST_RELATIVE_PATH,
  PUBLIC_IMAGE_DIRECTORY,
  TEI_RELATIVE_PATH,
  writeBible899Manifest,
} from "../../app/manuscrits/bible-899/_lib/manifest";
import { parseBible899Tei, sha256Text } from "../../app/manuscrits/bible-899/_lib/tei";

function usage(): never {
  throw new Error(
    "Usage : npm run bible899:import -- <chemin-vers-le-TEI.xml>\nLes images référencées doivent déjà se trouver dans public/manuscrits/bible-899.",
  );
}

function runNpm(argumentsList: string[]): void {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("Impossible de localiser npm pour exécuter les vérifications");
  const result = spawnSync(process.execPath, [npmCli, ...argumentsList], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Commande npm en échec : npm ${argumentsList.join(" ")}`);
  }
}

async function readOptional(filePath: string): Promise<Buffer | null> {
  return existsSync(filePath) ? readFile(filePath) : null;
}

async function restore(filePath: string, content: Buffer | null): Promise<void> {
  if (content !== null) {
    await writeFile(filePath, content);
  } else if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

async function main(): Promise<void> {
try {
  const candidateArgument = process.argv[2] ?? usage();
  const candidatePath = path.resolve(candidateArgument);
  if (!existsSync(candidatePath)) throw new Error(`TEI candidat introuvable : ${candidatePath}`);
  if (path.extname(candidatePath).toLowerCase() !== ".xml") {
    throw new Error(`Le fichier candidat doit porter l’extension .xml : ${candidatePath}`);
  }

  const candidateBuffer = await readFile(candidatePath);
  const candidateXml = candidateBuffer.toString("utf8");
  const candidateEdition = parseBible899Tei(candidateXml, { sourcePath: candidatePath });
  const availableImages = new Set<string>();
  for (const reference of candidateEdition.control.usedImageReferences) {
    const file = path.posix.basename(reference.replace(/\\/gu, "/"));
    const publicPath = path.resolve(PUBLIC_IMAGE_DIRECTORY, file);
    if (!existsSync(publicPath)) {
      throw new Error(
        `${candidatePath} : fac-similé référencé introuvable pour ${reference}. Fichier attendu : ${publicPath}`,
      );
    }
    availableImages.add(reference);
  }
  parseBible899Tei(candidateXml, {
    sourcePath: candidatePath,
    imageExists: (reference) => availableImages.has(reference),
  });

  if (candidateEdition.control.missingCoordinates.length > 0) {
    console.warn(
      `Coordonnées détaillées absentes pour : ${candidateEdition.control.missingCoordinates.join(", ")}`,
    );
  }

  const targetTeiPath = path.resolve(TEI_RELATIVE_PATH);
  const targetManifestPath = path.resolve(MANIFEST_RELATIVE_PATH);
  const previousTei = await readOptional(targetTeiPath);
  const previousManifest = await readOptional(targetManifestPath);

  try {
    await writeFile(targetTeiPath, candidateBuffer);
    const writtenBuffer = await readFile(targetTeiPath);
    if (sha256Text(writtenBuffer.toString("utf8")) !== sha256Text(candidateXml)) {
      throw new Error("Le TEI écrit diffère du fichier candidat, import annulé");
    }
    const manifest = await writeBible899Manifest();
    console.log(`TEI importé sans transformation : ${manifest.teiSha256}`);
    runNpm(["test"]);
    runNpm(["run", "build"]);
    console.log("Import Bible 899 validé, testé et compilé avec succès");
  } catch (error) {
    await restore(targetTeiPath, previousTei);
    await restore(targetManifestPath, previousManifest);
    throw new Error("Import annulé et fichiers maîtres restaurés", { cause: error });
  }
} catch (error) {
  const message = error instanceof Error
    ? [error.message, error.cause instanceof Error ? error.cause.message : ""].filter(Boolean).join("\n")
    : String(error);
  console.error(message);
  process.exitCode = 1;
}
}

void main();
