#!/usr/bin/env python3
"""Construit et vérifie la livraison finale Ceriziers 1646."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "work/boece/ceriziers_1646_corrections_alignement_fin"
PACKAGE_PARENT = REPO / "work/boece/ceriziers_final_package"
PACKAGE_NAME = "boece_ceriziers_1646_CORRECTIONS_TEXTE_ALIGNEMENT_FIN_IMPORT_PRIVE"
PACKAGE = PACKAGE_PARENT / PACKAGE_NAME
ARCHIVE = REPO / "livraisons" / f"{PACKAGE_NAME}.zip"
VERIFY_PARENT = REPO / "work/boece/ceriziers_final_verify"
VERIFY_ROOT = VERIFY_PARENT / PACKAGE_NAME


def guarded_reset(path: Path, expected_parent: Path) -> None:
    resolved = path.resolve()
    if resolved.parent != expected_parent.resolve() or not resolved.name:
        raise RuntimeError(f"Refus de réinitialiser le chemin : {resolved}")
    if resolved.exists():
        shutil.rmtree(resolved)
    resolved.mkdir(parents=True)


def copy_file(source: Path | str, destination: str) -> None:
    source_path = Path(source)
    if not source_path.is_absolute():
        source_path = REPO / source_path
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    destination_path = PACKAGE / destination
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_path, destination_path)


def copy_tree(source: Path | str, destination: str, *, include=None) -> None:
    source_path = Path(source)
    if not source_path.is_absolute():
        source_path = REPO / source_path
    for path in sorted(source_path.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(source_path)
        if "__pycache__" in relative.parts or "node_modules" in relative.parts:
            continue
        if include and not include(path, relative):
            continue
        copy_file(path, str(Path(destination) / relative))


guarded_reset(PACKAGE, PACKAGE_PARENT)

# 00 — rapport.
copy_tree(WORK / "working/00_RAPPORT_FINAL", "00_RAPPORT_FINAL")

# 01 — sources opaques, inchangées.
copy_file(REPO / "livraisons/boece_ceriziers_1646_SEGMENTATION_ALIGNEMENT_MIRANDOL_IMPORT_PRIVE.zip",
          "01_SOURCE_IMMUABLE/boece_ceriziers_1646_SEGMENTATION_ALIGNEMENT_MIRANDOL_IMPORT_PRIVE.zip")
copy_file(WORK / "source_extracted/01_SOURCE/boece_ceriziers_1646_OCR_CORRIGE_DOCX_PRET_GPT.zip",
          "01_SOURCE_IMMUABLE/boece_ceriziers_1646_OCR_CORRIGE_DOCX_PRET_GPT.zip")

# 02 — documents finaux.
copy_file(WORK / "working/01_LIVRABLE/boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL.docx",
          "02_DOCUMENT_FINAL/boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL.docx")
copy_file(WORK / "working/01_LIVRABLE/boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL_PREUVE.pdf",
          "02_DOCUMENT_FINAL/boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL_PREUVE.pdf")

DATA = WORK / "working/02_DONNEES_CORRIGEES"
for name in [
    "lecture_structuree_corrigee.json",
    "ceriziers_source_blocks_corriges.json", "ceriziers_source_blocks_corriges.csv",
    "ceriziers_source_units_corrigees.json", "ceriziers_source_units_corrigees.csv",
    "ceriziers_source_corrections.json", "ceriziers_source_corrections.csv",
    "ceriziers_bibliographie_1646.json", "ceriziers_source_sha256.txt",
]:
    copy_file(DATA / name, f"03_COUCHE_DERIVEE_CORRIGEE/{name}")

portable_reading_path = PACKAGE / "03_COUCHE_DERIVEE_CORRIGEE/lecture_structuree_corrigee.json"
portable_reading = json.loads(portable_reading_path.read_text(encoding="utf-8"))
portable_reading["source_project"] = "boece_ceriziers_1646_OCR_COLLATIONNE_CANDIDAT.json"
portable_reading_path.write_text(json.dumps(portable_reading, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

for name in [
    "ceriziers_segmentation_manifest.json", "ceriziers_segmentation_manifest.csv",
    "ceriziers_segmentation_summary.json", "ceriziers_segmentation_changes.csv",
    "ceriziers_segmentation_uncertain.md", "ceriziers_recomposition_tests.json",
    "ceriziers_notes.json", "ceriziers_canonical_divisions.csv",
    "ceriziers_divisions_review.json",
]:
    copy_file(DATA / name, f"04_SEGMENTATION_NOTES/{name}")

for name in [
    "ceriziers_mirandol_alignment_set_corrige.json",
    "ceriziers_mirandol_alignment_groups_corriges.json",
    "ceriziers_mirandol_alignment_groups_corriges.csv",
    "ceriziers_mirandol_alignment_members_corriges.json",
    "ceriziers_mirandol_alignment_members_corriges.csv",
    "ceriziers_mirandol_alignment_coverage_corrige.json",
    "ceriziers_mirandol_alignment_divisions_corrigees.json",
    "ceriziers_mirandol_alignment_boundary_review.csv",
    "ceriziers_mirandol_alignment_exceptions.csv",
    "ceriziers_mirandol_alignment_uncertain_corrige.md",
    "ceriziers_mirandol_alignment_review_context_corrige.json",
]:
    copy_file(DATA / name, f"05_ALIGNEMENT_FIN/{name}")

# 06 — base vivante, migrations, preuves et réversibilité.
copy_tree(WORK / "01_SNAPSHOT_AVANT", "06_SUPABASE/01_SNAPSHOTS_AVANT")
for name in [
    "20260811103000_texte_alignements_intertextuels.sql",
    "20260811112000_optimiser_alignements_intertextuels.sql",
    "20260811112500_corriger_ordre_index_alignements_intertextuels.sql",
    "20260811130000_corriger_ceriziers_1646_texte_alignement_fin.sql",
    "20260811131500_configurer_timeout_correction_ceriziers_1646.sql",
    "20260811132000_preserver_niveaux_oeuvre_boece_correction_ceriziers.sql",
]:
    copy_file(REPO / "supabase/migrations" / name, f"06_SUPABASE/02_MIGRATIONS/{name}")
copy_file(DATA / "ceriziers_correction_import_payload.json", "06_SUPABASE/03_IMPORT/ceriziers_correction_import_payload.json")
copy_file(DATA / "ceriziers_correction_import_payload_manifest.json", "06_SUPABASE/03_IMPORT/ceriziers_correction_import_payload_manifest.json")
copy_tree(WORK / "working/02_PREUVES/supabase_correction", "06_SUPABASE/03_IMPORT/PREUVES")
copy_tree(WORK / "02_SNAPSHOT_APRES", "06_SUPABASE/04_SNAPSHOTS_APRES")
copy_tree(WORK / "working/03_REQUETES_CONTROLE", "06_SUPABASE/05_CONTROLES")
copy_file(WORK / "working/07_ADVISORS/advisors_summary.json", "06_SUPABASE/05_CONTROLES/advisors_summary.json")
copy_file(REPO / "scripts/ceriziers/rollback-corrected-import-supabase.mjs",
          "06_SUPABASE/06_ROLLBACK_NON_EXECUTE/rollback-corrected-import-supabase.mjs")
copy_tree(WORK / "working/04_SCRIPTS_RETOUR_ARRIERE", "06_SUPABASE/06_ROLLBACK_NON_EXECUTE/SCRIPTS_ANTERIEURS")

# 07 — contrôles documentaires, sémantiques et interface.
copy_file(WORK / "working/04_CONTROLES_DOCX/controle_docx_pdf.json", "07_CONTROLES/DOCX/controle_docx_pdf.json")
copy_tree(WORK / "working/04_CONTROLES_DOCX/contact_sheets", "07_CONTROLES/DOCX/contact_sheets")
for page in [1, 13, 25, 43, 46, 82, 83, 86]:
    copy_file(WORK / f"working/04_CONTROLES_DOCX/pdf_pages/page-{page:02d}.png",
              f"07_CONTROLES/DOCX/pages_ciblees/page-{page:02d}.png")
copy_tree(WORK / "working/04_PREUVES_FACSIMILE", "07_CONTROLES/FACSIMILE")
copy_tree(WORK / "working/03_REVUE_ALIGNEMENT/controle_final", "07_CONTROLES/ALIGNEMENT/controle_final")
copy_file(WORK / "working/03_REVUE_ALIGNEMENT/RETEX_OUTIL_SEMANTIQUE.md", "07_CONTROLES/ALIGNEMENT/RETEX_OUTIL_SEMANTIQUE.md")
copy_file(WORK / "working/03_REVUE_ALIGNEMENT/REVUE_SEMANTIQUE_CONTINUE_CORRIGEE.md", "07_CONTROLES/ALIGNEMENT/REVUE_SEMANTIQUE_CONTINUE_CORRIGEE.md")

PAIR = WORK / "working/03_REVUE_ALIGNEMENT/claude_pairs"
for path in sorted(PAIR.glob("review_*.json")):
    copy_file(path, f"07_CONTROLES/ALIGNEMENT/revues_fines/{path.name}")
for name in ["index.json", "manual_overrides.json", "targeted_override_size_repairs.json", "repair_02.json", "repair_04.json"]:
    copy_file(PAIR / name, f"07_CONTROLES/ALIGNEMENT/revues_fines/{name}")
copy_tree(PAIR / "rejected", "07_CONTROLES/ALIGNEMENT/revues_fines/rejected")

copy_tree(WORK / "working/05_CONTROLES_LECTEUR", "07_CONTROLES/LECTEUR",
          include=lambda path, relative: path.suffix.lower() in {".png", ".md", ".json"})
copy_tree(WORK / "working/06_DIFF_BORNE", "07_CONTROLES/DIFF_BORNE")

# 08 — scripts et code lecteur nécessaires à la reproduction.
for name in [
    "apply-corrected-import-supabase.mjs", "build-corrected-import-payload.mjs",
    "build-correction-layer.mjs", "build-segmentation-corrected.mjs",
    "build-targeted-size-overrides.mjs", "compare-correction-snapshots.mjs",
    "generate-final-alignment-control-sample.mjs", "make-pdf-contact-sheets.py",
    "merge-alignment-ai-reviews.mjs", "patch-final-docx.py",
    "prepare-alignment-ai-review.mjs", "rollback-corrected-import-supabase.mjs",
    "run-alignment-ai-review-all.mjs", "run-alignment-ai-review-batch.mjs",
    "snapshot-ceriziers.mjs", "snapshot-mirandol.mjs",
    "validate-corrected-document.py",
]:
    copy_file(REPO / "scripts/ceriziers" / name, f"08_SCRIPTS/ceriziers/{name}")
copy_file(REPO / "scripts/ceriziers/run-final-validation.py", "08_SCRIPTS/run_final_validation.py")
for name in [
    "ComparaisonTraductions.tsx", "comparaisonTraductionsUtils.ts",
    "comparaisonTraductions.test.ts", "OeuvreClient.tsx", "oeuvreTypes.ts", "page.tsx",
]:
    copy_file(REPO / "app/oeuvre/[id]" / name, f"08_SCRIPTS/lecteur/app/oeuvre/[id]/{name}")
copy_file(REPO / "tsconfig.ceriziers.json", "08_SCRIPTS/lecteur/tsconfig.ceriziers.json")


TEXT_EXTENSIONS = {".md", ".txt", ".json", ".csv", ".sql", ".mjs", ".js", ".ts", ".tsx", ".py", ".ps1"}
MOJIBAKE = ("ï»¿", "�", "Ã©", "Ã¨", "Ãª", "Ã ", "Ã§", "â€™", "â€“", "â€”", "Â¬")
ABSOLUTE_PATH = re.compile(r"(?:(?<![A-Za-z])[A-Z]:[\\/]|file://)")
for path in sorted(PACKAGE.rglob("*")):
    if not path.is_file():
        continue
    relative = path.relative_to(PACKAGE).as_posix()
    lowered = relative.lower()
    if "node_modules" in lowered or "__pycache__" in lowered or "/.env" in lowered or lowered.startswith(".env"):
        raise RuntimeError(f"Entrée interdite : {relative}")
    if path.suffix.lower() not in TEXT_EXTENSIONS:
        continue
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        raise RuntimeError(f"BOM interdit : {relative}")
    text = raw.decode("utf-8", errors="strict")
    if any(token in text for token in MOJIBAKE):
        raise RuntimeError(f"Mojibake détecté : {relative}")
    if ABSOLUTE_PATH.search(text):
        raise RuntimeError(f"Chemin absolu détecté : {relative}")
    if re.search(r"(?:sb_secret_|service_role\s*[=:]\s*['\"]eyJ|SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s'\"]{20,})", text):
        raise RuntimeError(f"Secret potentiel détecté : {relative}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def write_checksums() -> None:
    lines = []
    for path in sorted(PACKAGE.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS.txt" and "__pycache__" not in path.parts:
            lines.append(f"{sha256(path)}  {path.relative_to(PACKAGE).as_posix()}")
    (PACKAGE / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


write_checksums()
validator = PACKAGE / "08_SCRIPTS/run_final_validation.py"
validation = subprocess.run([sys.executable, str(validator), str(PACKAGE)], check=True, capture_output=True, text=True, encoding="utf-8")
(PACKAGE / "07_CONTROLES/validation_pre_archive.json").write_text(validation.stdout, encoding="utf-8", newline="\n")
write_checksums()
subprocess.run([sys.executable, str(validator), str(PACKAGE)], check=True)

ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
if ARCHIVE.exists():
    ARCHIVE.unlink()
with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=True) as archive:
    for path in sorted(PACKAGE.rglob("*")):
        if path.is_file():
            archive.write(path, f"{PACKAGE_NAME}/{path.relative_to(PACKAGE).as_posix()}")

guarded_reset(VERIFY_ROOT, VERIFY_PARENT)
with zipfile.ZipFile(ARCHIVE) as archive:
    if archive.testzip() is not None:
        raise RuntimeError("Archive ZIP corrompue")
    names = archive.namelist()
    if any("\\" in name or name.startswith("/") or re.match(r"^[A-Za-z]:", name) for name in names):
        raise RuntimeError("Entrée ZIP non portable")
    archive.extractall(VERIFY_PARENT)
verify = subprocess.run([sys.executable, str(VERIFY_ROOT / "08_SCRIPTS/run_final_validation.py"), str(VERIFY_ROOT)],
                        check=True, capture_output=True, text=True, encoding="utf-8")

print(json.dumps({
    "status": "PASS",
    "archive": str(ARCHIVE),
    "archive_sha256": sha256(ARCHIVE),
    "archive_bytes": ARCHIVE.stat().st_size,
    "files": sum(1 for path in PACKAGE.rglob("*") if path.is_file()),
    "clean_extract_validation": json.loads(verify.stdout),
}, ensure_ascii=False, indent=2))
