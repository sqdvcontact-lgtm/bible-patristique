import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MARKER_NAME = ".fillion-ocr-disposable.json";
const ALLOWED_CATEGORIES = new Set([
  "full_page_render_cache",
  "crop_image_cache",
  "ocr_engine_cache",
  "visual_qa_cache",
  "scratch",
  "replaced_control_render",
]);
const ALLOWED_MATCHING_EXTENSIONS = new Set([
  ".bmp",
  ".cache",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".tmp",
]);
const ALLOWED_SINGLE_FILE_EXTENSIONS = new Set([".zip", ".xml"]);

function usage() {
  return [
    "Clôture sûre de l’OCR d’un livre Fillion.",
    "",
    "Simulation (obligatoire avant application) :",
    "  node scripts/fillion/close-fillion-book-ocr.mjs --manifest <manifest.json>",
    "",
    "Application après lecture de la simulation :",
    "  node scripts/fillion/close-fillion-book-ocr.mjs --manifest <manifest.json> --apply",
    "",
    "Options :",
    "  --workspace-root <dossier>  Racine du dépôt (réservé aux tests ; racine courante par défaut).",
    "  --help                     Afficher cette aide.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--manifest" || token === "--workspace-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Valeur absente pour ${token}.`);
      args[token.slice(2).replaceAll("-", "_")] = value;
      index += 1;
      continue;
    }
    throw new Error(`Argument inconnu : ${token}`);
  }
  return args;
}

function normalized(filePath) {
  return path.resolve(filePath).toLocaleLowerCase("en-US");
}

function isWithin(candidate, parent, allowEqual = false) {
  const child = normalized(candidate);
  const root = normalized(parent);
  if (child === root) return allowEqual;
  return child.startsWith(`${root}${path.sep}`);
}

function relative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function resolveRelative(root, value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} doit être un chemin relatif non vide.`);
  if (path.isAbsolute(value) || value.includes("\0")) throw new Error(`${label} doit rester relatif à la racine du dépôt : ${value}`);
  const resolved = path.resolve(root, value);
  if (!isWithin(resolved, root)) throw new Error(`${label} sort de la racine du dépôt : ${value}`);
  return resolved;
}

async function exists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} illisible (${filePath}) : ${error.message}`);
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function atomicWriteJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

async function scanTree(root, workspaceRoot) {
  const inventory = [];
  let directoryCount = 0;
  let byteCount = 0;

  async function visit(current) {
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) throw new Error(`Lien symbolique ou jonction refusé dans une cible : ${relative(workspaceRoot, current)}`);
    if (metadata.isDirectory()) {
      directoryCount += 1;
      const entries = await readdir(current, { withFileTypes: true });
      entries.sort((left, right) => left.name.localeCompare(right.name));
      for (const entry of entries) await visit(path.join(current, entry.name));
      return;
    }
    if (!metadata.isFile()) throw new Error(`Type de fichier non pris en charge : ${relative(workspaceRoot, current)}`);
    byteCount += metadata.size;
    inventory.push({ path: relative(workspaceRoot, current), bytes: metadata.size });
  }

  await visit(root);
  const digestInput = inventory.map((item) => `${item.path}\t${item.bytes}`).join("\n");
  return {
    file_count: inventory.length,
    directory_count: directoryCount,
    bytes: byteCount,
    inventory_sha256: sha256Text(digestInput),
    files: inventory,
  };
}

async function matchingFiles(root, workspaceRoot, extensions, recursive) {
  const matches = [];
  let byteCount = 0;

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Lien symbolique ou jonction refusé dans une cible : ${relative(workspaceRoot, entryPath)}`);
      if (entry.isDirectory()) {
        if (recursive) await visit(entryPath);
        continue;
      }
      if (!entry.isFile() || entry.name === MARKER_NAME) continue;
      if (!extensions.has(path.extname(entry.name).toLocaleLowerCase("en-US"))) continue;
      const metadata = await lstat(entryPath);
      byteCount += metadata.size;
      matches.push({ absolute_path: entryPath, path: relative(workspaceRoot, entryPath), bytes: metadata.size });
    }
  }

  await visit(root);
  const digestInput = matches.map((item) => `${item.path}\t${item.bytes}`).join("\n");
  return {
    file_count: matches.length,
    bytes: byteCount,
    inventory_sha256: sha256Text(digestInput),
    files: matches,
  };
}

function validateManifestShape(manifest) {
  if (manifest.schema_version !== 1) throw new Error("Le manifeste de nettoyage doit avoir schema_version = 1.");
  if (!manifest.book || typeof manifest.book.id !== "string" || !manifest.book.id.trim()) throw new Error("Le manifeste doit nommer book.id.");
  if (manifest.status !== "ocr_complete") throw new Error(`Nettoyage refusé : status vaut « ${manifest.status ?? "absent"} », attendu « ocr_complete ».`);
  if (manifest.cleanup_authorized !== true) throw new Error("Nettoyage refusé : cleanup_authorized doit valoir true.");
  if (!Array.isArray(manifest.completion_checks) || manifest.completion_checks.length === 0) throw new Error("Au moins un contrôle de fin d’OCR est requis.");
  const failedChecks = manifest.completion_checks.filter((check) => check?.pass !== true);
  if (failedChecks.length) throw new Error(`Nettoyage refusé : ${failedChecks.length} contrôle(s) de fin d’OCR ne passent pas.`);
  if (!Array.isArray(manifest.required_artifacts) || manifest.required_artifacts.length === 0) throw new Error("Au moins un artefact final protégé est requis.");
  if (!Array.isArray(manifest.cleanup_targets)) throw new Error("cleanup_targets doit être une liste.");
}

async function validateRequiredArtifacts(manifest, workspaceRoot) {
  const artifacts = [];
  for (const [index, item] of manifest.required_artifacts.entries()) {
    const artifactPath = resolveRelative(workspaceRoot, item?.path, `required_artifacts[${index}].path`);
    const metadata = await lstat(artifactPath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`Artefact final invalide : ${item.path}`);
    const observedSha256 = await sha256File(artifactPath);
    if (!/^[a-f0-9]{64}$/u.test(item.sha256 ?? "")) throw new Error(`Empreinte SHA-256 obligatoire pour l’artefact final : ${item.path}`);
    if (observedSha256 !== item.sha256.toLocaleLowerCase("en-US")) throw new Error(`Empreinte finale discordante : ${item.path}`);
    artifacts.push({ path: relative(workspaceRoot, artifactPath), bytes: metadata.size, sha256: observedSha256, role: item.role ?? "final_ocr_artifact" });
  }
  return artifacts;
}

async function validateDirectoryTargetMarker(targetPath, target, bookId, workspaceRoot) {
  const metadata = await lstat(targetPath);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`La cible doit être un répertoire réel : ${target.path}`);
  const canonicalPath = await realpath(targetPath);
  if (!isWithin(canonicalPath, workspaceRoot)) throw new Error(`La cible résolue sort du dépôt : ${target.path}`);
  const markerPath = path.join(targetPath, MARKER_NAME);
  const marker = await readJson(markerPath, "Marqueur de répertoire reproductible");
  if (marker.schema_version !== 1 || marker.reproducible !== true) throw new Error(`Marqueur reproductible invalide : ${relative(workspaceRoot, markerPath)}`);
  if (marker.book_id !== bookId) throw new Error(`Le marqueur ${target.path} appartient à ${marker.book_id ?? "un livre inconnu"}, pas à ${bookId}.`);
  if (marker.category !== target.category) throw new Error(`Catégorie discordante entre manifeste et marqueur : ${target.path}`);
  if (!marker.recreate_with || typeof marker.recreate_with !== "string") throw new Error(`Commande de recréation absente du marqueur : ${target.path}`);
  return {
    path: relative(workspaceRoot, markerPath),
    sha256: await sha256File(markerPath),
    recreate_with: marker.recreate_with,
  };
}

async function validateFileTargetMarker(targetPath, target, bookId, workspaceRoot) {
  const metadata = await lstat(targetPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`La cible doit être un fichier réel : ${target.path}`);
  const extension = path.extname(targetPath).toLocaleLowerCase("en-US");
  if (!ALLOWED_SINGLE_FILE_EXTENSIONS.has(extension)) throw new Error(`Extension de fichier isolé refusée : ${target.path}`);
  if (target.category !== "scratch") throw new Error(`Un fichier isolé doit appartenir à la catégorie scratch : ${target.path}`);
  const canonicalPath = await realpath(targetPath);
  if (!isWithin(canonicalPath, workspaceRoot)) throw new Error(`La cible résolue sort du dépôt : ${target.path}`);
  const markerPath = `${targetPath}${MARKER_NAME}`;
  const markerMetadata = await lstat(markerPath);
  if (!markerMetadata.isFile() || markerMetadata.isSymbolicLink()) throw new Error(`Le marqueur doit être un fichier réel : ${relative(workspaceRoot, markerPath)}`);
  const marker = await readJson(markerPath, "Marqueur de fichier reproductible");
  if (marker.schema_version !== 1 || marker.reproducible !== true) throw new Error(`Marqueur reproductible invalide : ${relative(workspaceRoot, markerPath)}`);
  if (marker.book_id !== bookId) throw new Error(`Le marqueur ${target.path} appartient à ${marker.book_id ?? "un livre inconnu"}, pas à ${bookId}.`);
  if (marker.category !== target.category) throw new Error(`Catégorie discordante entre manifeste et marqueur : ${target.path}`);
  if (!marker.recreate_with || typeof marker.recreate_with !== "string") throw new Error(`Commande de recréation absente du marqueur : ${target.path}`);
  if (marker.target_path !== relative(workspaceRoot, targetPath)) throw new Error(`Chemin de fichier discordant dans le marqueur : ${target.path}`);
  if (!/^[a-f0-9]{64}$/u.test(marker.target_sha256 ?? "")) throw new Error(`Empreinte SHA-256 absente du marqueur : ${target.path}`);
  const observedSha256 = await sha256File(targetPath);
  if (observedSha256 !== marker.target_sha256) throw new Error(`Empreinte discordante avant nettoyage : ${target.path}`);
  if (marker.target_bytes !== metadata.size) throw new Error(`Taille discordante avant nettoyage : ${target.path}`);
  return {
    path: relative(workspaceRoot, markerPath),
    absolute_path: markerPath,
    bytes: markerMetadata.size,
    sha256: await sha256File(markerPath),
    recreate_with: marker.recreate_with,
    target_sha256: observedSha256,
  };
}

async function prepareTargets(manifest, workspaceRoot, manifestPath, reportDirectory, requiredArtifacts) {
  const allowedRoots = [path.join(workspaceRoot, "tmp"), path.join(workspaceRoot, "work", "fillion")];
  const protectedRoots = [
    path.join(workspaceRoot, ".git"),
    path.join(workspaceRoot, "charte"),
    path.join(workspaceRoot, "data"),
    path.join(workspaceRoot, "livraisons"),
    path.join(workspaceRoot, "public"),
    path.join(workspaceRoot, "sources"),
    path.join(workspaceRoot, "supabase"),
  ];
  const prepared = [];
  const seen = new Set();

  for (const [index, target] of manifest.cleanup_targets.entries()) {
    if (!ALLOWED_CATEGORIES.has(target?.category)) throw new Error(`Catégorie de nettoyage refusée à l’index ${index} : ${target?.category ?? "absente"}`);
    if (!new Set(["tree", "matching_files", "file"]).has(target.mode)) throw new Error(`Mode de nettoyage invalide à l’index ${index} : ${target.mode ?? "absent"}`);
    const targetPath = resolveRelative(workspaceRoot, target.path, `cleanup_targets[${index}].path`);
    const key = normalized(targetPath);
    if (seen.has(key)) throw new Error(`Cible répétée : ${target.path}`);
    seen.add(key);
    if (!allowedRoots.some((root) => isWithin(targetPath, root))) throw new Error(`Cible hors des racines de nettoyage autorisées : ${target.path}`);
    if (allowedRoots.some((root) => normalized(targetPath) === normalized(root))) throw new Error(`Une racine de nettoyage ne peut pas être supprimée : ${target.path}`);
    if (protectedRoots.some((root) => isWithin(targetPath, root, true) || isWithin(root, targetPath, true))) throw new Error(`La cible rencontre un espace protégé : ${target.path}`);
    if (isWithin(manifestPath, targetPath, true) || isWithin(reportDirectory, targetPath, true)) throw new Error(`La cible contiendrait le manifeste ou son rapport : ${target.path}`);
    if (!(await exists(targetPath))) {
      if (target.allow_absent === true) {
        prepared.push({ path: relative(workspaceRoot, targetPath), category: target.category, mode: target.mode, status: "already_absent", file_count: 0, bytes: 0 });
        continue;
      }
      throw new Error(`Cible de nettoyage absente : ${target.path}`);
    }
    if (target.mode === "file") {
      const marker = await validateFileTargetMarker(targetPath, target, manifest.book.id, workspaceRoot);
      const protectedSet = new Set(requiredArtifacts.map((artifact) => normalized(path.join(workspaceRoot, artifact.path))));
      if (protectedSet.has(normalized(targetPath)) || protectedSet.has(normalized(marker.absolute_path))) throw new Error(`Un fichier isolé protégé serait supprimé : ${target.path}`);
      const metadata = await lstat(targetPath);
      const files = [
        { absolute_path: targetPath, path: relative(workspaceRoot, targetPath), bytes: metadata.size },
        { absolute_path: marker.absolute_path, path: marker.path, bytes: marker.bytes },
      ];
      const inventorySha256 = sha256Text(files.map((item) => `${item.path}\t${item.bytes}`).join("\n"));
      prepared.push({
        absolute_path: targetPath,
        path: relative(workspaceRoot, targetPath),
        category: target.category,
        mode: target.mode,
        marker,
        file_count: files.length,
        bytes: files.reduce((sum, item) => sum + item.bytes, 0),
        inventory_sha256: inventorySha256,
        files,
        status: "ready",
      });
      continue;
    }
    const marker = await validateDirectoryTargetMarker(targetPath, target, manifest.book.id, workspaceRoot);
    if (target.mode === "tree") {
      const inventory = await scanTree(targetPath, workspaceRoot);
      const protectedInside = requiredArtifacts.filter((artifact) => isWithin(path.join(workspaceRoot, artifact.path), targetPath, true));
      if (protectedInside.length) throw new Error(`Une cible contient des artefacts finaux protégés : ${protectedInside.map((item) => item.path).join(", ")}`);
      prepared.push({
        absolute_path: targetPath,
        path: relative(workspaceRoot, targetPath),
        category: target.category,
        mode: target.mode,
        marker,
        ...inventory,
        status: "ready",
      });
      continue;
    }
    if (!Array.isArray(target.extensions) || target.extensions.length === 0) throw new Error(`extensions est obligatoire pour matching_files : ${target.path}`);
    const extensions = new Set(target.extensions.map((extension) => extension.toLocaleLowerCase("en-US")));
    for (const extension of extensions) {
      if (!ALLOWED_MATCHING_EXTENSIONS.has(extension)) throw new Error(`Extension refusée dans ${target.path} : ${extension}`);
    }
    const inventory = await matchingFiles(targetPath, workspaceRoot, extensions, target.recursive === true);
    if (!inventory.file_count && target.allow_empty !== true) throw new Error(`Aucun fichier ne correspond dans ${target.path}.`);
    const protectedSet = new Set(requiredArtifacts.map((artifact) => normalized(path.join(workspaceRoot, artifact.path))));
    const protectedMatches = inventory.files.filter((item) => protectedSet.has(normalized(item.absolute_path)));
    if (protectedMatches.length) throw new Error(`Des artefacts finaux seraient supprimés : ${protectedMatches.map((item) => item.path).join(", ")}`);
    prepared.push({
      absolute_path: targetPath,
      path: relative(workspaceRoot, targetPath),
      category: target.category,
      mode: target.mode,
      extensions: [...extensions].sort(),
      recursive: target.recursive === true,
      marker,
      ...inventory,
      status: "ready",
    });
  }
  return prepared;
}

function reportSafeTarget(target) {
  const { absolute_path: _absolutePath, files, ...safe } = target;
  if (safe.marker) delete safe.marker.absolute_path;
  return {
    ...safe,
    files: files?.map(({ absolute_path: _absolutePath, ...file }) => file) ?? [],
  };
}

async function applyTargets(targets, report, reportPath) {
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (target.status === "already_absent") continue;
    try {
      if (target.mode === "tree") {
        await rm(target.absolute_path, { recursive: true, force: false, maxRetries: 2, retryDelay: 100 });
        if (await exists(target.absolute_path)) throw new Error("La cible existe encore après suppression.");
      } else {
        for (const file of target.files) await rm(file.absolute_path, { force: false });
        const survivors = [];
        for (const file of target.files) if (await exists(file.absolute_path)) survivors.push(file.path);
        if (survivors.length) throw new Error(`Fichiers encore présents : ${survivors.join(", ")}`);
      }
      report.cleanup_targets[index].status = "deleted";
      report.cleanup_targets[index].deleted_at = new Date().toISOString();
      await atomicWriteJson(reportPath, report);
    } catch (error) {
      report.status = "FAIL_PARTIAL_CLEANUP";
      report.cleanup_targets[index].status = "delete_failed";
      report.cleanup_targets[index].error = String(error?.message ?? error);
      report.finished_at = new Date().toISOString();
      await atomicWriteJson(reportPath, report);
      throw error;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const workspaceRoot = path.resolve(args.workspace_root ?? SCRIPT_ROOT);
  if (!args.manifest) throw new Error("Argument requis : --manifest.");
  const manifestPath = path.isAbsolute(args.manifest) ? path.resolve(args.manifest) : path.resolve(workspaceRoot, args.manifest);
  if (!isWithin(manifestPath, workspaceRoot)) throw new Error("Le manifeste doit se trouver dans la racine de travail.");
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  validateManifestShape(manifest);
  const reportDirectory = resolveRelative(
    workspaceRoot,
    manifest.report_directory ?? relative(workspaceRoot, path.join(path.dirname(manifestPath), "ocr_cleanup_reports")),
    "report_directory",
  );
  const allowedReportRoot = path.join(workspaceRoot, "work", "fillion");
  if (!isWithin(reportDirectory, allowedReportRoot)) throw new Error("Les rapports de nettoyage doivent rester sous work/fillion.");
  const requiredArtifacts = await validateRequiredArtifacts(manifest, workspaceRoot);
  const targets = await prepareTargets(manifest, workspaceRoot, manifestPath, reportDirectory, requiredArtifacts);
  const timestamp = new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
  const mode = args.apply ? "applied" : "dry-run";
  const reportPath = path.join(reportDirectory, `${manifest.book.id.toLocaleLowerCase("en-US")}-ocr-cleanup-${timestamp}-${mode}.json`);
  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    finished_at: null,
    status: args.apply ? "CLEANUP_STARTED" : "PASS_DRY_RUN_NO_DELETION",
    mode,
    book: manifest.book,
    manifest: { path: relative(workspaceRoot, manifestPath), sha256: sha256Text(manifestRaw) },
    completion_checks: manifest.completion_checks,
    required_artifacts: requiredArtifacts,
    cleanup_targets: targets.map(reportSafeTarget),
    totals: {
      files: targets.reduce((sum, target) => sum + (target.file_count ?? 0), 0),
      bytes: targets.reduce((sum, target) => sum + (target.bytes ?? 0), 0),
    },
  };
  await atomicWriteJson(reportPath, report);
  if (args.apply) {
    await applyTargets(targets, report, reportPath);
    const postCleanupArtifacts = await validateRequiredArtifacts(manifest, workspaceRoot);
    const beforeByPath = new Map(requiredArtifacts.map((artifact) => [artifact.path, artifact]));
    const postCleanupMismatches = postCleanupArtifacts.filter((artifact) => {
      const before = beforeByPath.get(artifact.path);
      return !before || before.sha256 !== artifact.sha256 || before.bytes !== artifact.bytes;
    });
    if (postCleanupMismatches.length || postCleanupArtifacts.length !== requiredArtifacts.length) {
      report.status = "FAIL_POST_CLEANUP_ARTIFACT_VERIFICATION";
      report.post_cleanup_required_artifacts = postCleanupArtifacts;
      report.post_cleanup_mismatches = postCleanupMismatches;
      report.finished_at = new Date().toISOString();
      await atomicWriteJson(reportPath, report);
      throw new Error("Les artefacts protégés ont changé pendant le nettoyage.");
    }
    report.post_cleanup_required_artifacts = postCleanupArtifacts;
    report.post_cleanup_mismatches = [];
    report.status = "PASS_CLEANUP_APPLIED";
    report.finished_at = new Date().toISOString();
    await atomicWriteJson(reportPath, report);
  }
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    book: manifest.book.id,
    mode,
    files: report.totals.files,
    bytes: report.totals.bytes,
    report: relative(workspaceRoot, reportPath),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
