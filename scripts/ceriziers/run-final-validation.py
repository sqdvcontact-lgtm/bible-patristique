#!/usr/bin/env python3
"""Validation autonome, en lecture seule, de la livraison Ceriziers 1646."""

from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def fail(message: str) -> None:
    ERRORS.append(message)


def read_json(relative: str):
    path = ROOT / relative
    if not path.is_file():
        fail(f"fichier absent: {relative}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - diagnostic autonome
        fail(f"JSON invalide {relative}: {exc}")
        return None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def validate_checksums() -> None:
    sums = ROOT / "SHA256SUMS.txt"
    if not sums.is_file():
        fail("SHA256SUMS.txt absent")
        return
    raw = sums.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        fail("SHA256SUMS.txt contient un BOM")
    declared: set[str] = set()
    for line_number, line in enumerate(raw.decode("utf-8").splitlines(), 1):
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9A-F]{64})  (.+)", line)
        if not match:
            fail(f"ligne SHA256 invalide: {line_number}")
            continue
        expected, name = match.groups()
        declared.add(name)
        if "\\" in name or re.match(r"^[A-Za-z]:", name) or name.startswith("/"):
            fail(f"chemin non portable: {name}")
            continue
        target = ROOT / Path(*name.split("/"))
        if not target.is_file():
            fail(f"fichier déclaré absent: {name}")
        elif sha256(target) != expected:
            fail(f"empreinte divergente: {name}")
    actual = {path.relative_to(ROOT).as_posix() for path in ROOT.rglob("*")
              if path.is_file() and path.name != "SHA256SUMS.txt" and "__pycache__" not in path.parts}
    if declared != actual:
        for name in sorted(actual - declared):
            fail(f"fichier non déclaré: {name}")
        for name in sorted(declared - actual):
            fail(f"déclaration sans fichier: {name}")


def validate_docx() -> None:
    relative = "02_DOCUMENT_FINAL/boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL.docx"
    path = ROOT / relative
    if not path.is_file():
        fail(f"DOCX absent: {relative}")
        return
    try:
        with zipfile.ZipFile(path) as archive:
            bad = archive.testzip()
            if bad:
                fail(f"entrée DOCX corrompue: {bad}")
            document = ET.fromstring(archive.read("word/document.xml"))
            footnotes = ET.fromstring(archive.read("word/footnotes.xml"))
    except Exception as exc:
        fail(f"DOCX illisible: {exc}")
        return
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = ["".join(node.text or "" for node in paragraph.findall(".//w:t", namespace)).strip()
                  for paragraph in document.findall(".//w:p", namespace)]
    continuous = "\n".join(paragraphs)
    if "inso¬" in continuous or "¬" in continuous:
        fail("caractère ¬ présent dans le DOCX")
    if continuous.count("brauons son insolence.") != 1:
        fail("lecture ‘brauons son insolence.’ absente ou dupliquée dans le DOCX")
    if any(paragraph == "PRO" for paragraph in paragraphs):
        fail("faux paragraphe PRO présent dans le DOCX")
    ids = []
    for note in footnotes.findall("w:footnote", namespace):
        value = note.attrib.get(f"{{{namespace['w']}}}id")
        if value and int(value) > 0:
            ids.append(int(value))
    if sorted(ids) != [1, 2, 3, 4]:
        fail(f"notes DOCX inattendues: {sorted(ids)}")


def validate_segmentation_and_notes() -> None:
    manifest = read_json("04_SEGMENTATION_NOTES/ceriziers_segmentation_manifest.json")
    notes_doc = read_json("04_SEGMENTATION_NOTES/ceriziers_notes.json")
    if not manifest or not notes_doc:
        return
    segments = manifest.get("segments", [])
    if len(segments) != 1880:
        fail(f"segments: {len(segments)} au lieu de 1880")
    if sum(item.get("espace_textuel") == "corps" for item in segments) != 1823:
        fail("le corps ne contient pas 1823 segments")
    if sum(item.get("nature") == "vers" for item in segments) != 1213:
        fail("le manifeste ne contient pas 1213 vers")
    if any(item.get("segment_texte") == "PRO" or "¬" in str(item.get("segment_texte", "")) for item in segments):
        fail("PRO ou ¬ présent dans la segmentation")
    passage = [item for item in segments if item.get("segment_key", "").endswith("CER-B01-D06-B001-U001:s009")]
    if len(passage) != 1 or not passage[0].get("segment_texte", "").endswith("brauons son insolence."):
        fail("segment d’insolence non conforme")
    notes = notes_doc.get("notes", [])
    if [len(notes), len(notes_doc.get("blocks", [])), len(notes_doc.get("anchors", []))] != [4, 4, 4]:
        fail("comptages notes/blocs/ancres non conformes")
    by_key = {note.get("note_key"): note for note in notes}
    expected = {
        "CER-NOTE-003": ("II. PROSE.", "III. PROSE.", "V"),
        "CER-NOTE-004": ("V. PROSE.", "VI. PROSE.", "XI"),
    }
    for key, values in expected.items():
        metadata = by_key.get(key, {}).get("metadata", {})
        actual = (metadata.get("printed_reading"), metadata.get("semantic_reading"), metadata.get("canonical_division_ref"))
        if actual != values or metadata.get("validated_human") is not False:
            fail(f"métadonnées non conformes: {key}")


def validate_alignment() -> None:
    groups = read_json("05_ALIGNEMENT_FIN/ceriziers_mirandol_alignment_groups_corriges.json")
    members = read_json("05_ALIGNEMENT_FIN/ceriziers_mirandol_alignment_members_corriges.json")
    coverage = read_json("05_ALIGNEMENT_FIN/ceriziers_mirandol_alignment_coverage_corrige.json")
    if not isinstance(groups, list) or not isinstance(members, list) or not coverage:
        return
    if len(groups) <= 268:
        fail("alignement encore trop grossier")
    if len(members) != 3716:
        fail(f"membres d’alignement: {len(members)} au lieu de 3716")
    aligned = [item for item in members if item.get("role") == "aligned"]
    reference = [item for item in members if item.get("role") == "reference"]
    if len(aligned) != 1821 or len({item.get("segment_key") for item in aligned}) != 1821:
        fail("couverture Ceriziers différente de 1821 segments uniques")
    if len(reference) != 1895 or len({item.get("segment_key") for item in reference}) != 1895:
        fail("couverture Mirandol différente de 1895 segments uniques")
    if any(item.get("status") == "validated_human" for item in groups):
        fail("statut validated_human présent")
    if len({(item.get("book_number"), item.get("canonical_division_order")) for item in groups}) != 78:
        fail("nombre de divisions différent de 78")
    exceptions = [item for item in groups if item.get("exception_to_size_rule")]
    if len(exceptions) != 1:
        fail(f"nombre d’exceptions de taille: {len(exceptions)}")
    else:
        item = exceptions[0]
        if (item.get("division_key"), item.get("left_count"), item.get("right_count")) != ("LIVRE QUATRIÈME|XIII", 1, 6):
            fail("l’unique exception n’est pas IV-XIII 1:6")
    first_poem = [item for item in groups if item.get("book_number") == 1 and item.get("division_roman") == "I"]
    if len(first_poem) <= 1:
        fail("premier poème non subdivisé")
    if coverage.get("status") != "PASS" or coverage.get("crossings") != 0 or coverage.get("duplicate_members") != 0:
        fail("rapport de couverture non conforme")


def validate_mirandol_identity() -> None:
    before = read_json("06_SUPABASE/01_SNAPSHOTS_AVANT/mirandol/mirandol_before_manifest.json")
    after = read_json("06_SUPABASE/04_SNAPSHOTS_APRES/mirandol/mirandol_after_manifest.json")
    if not before or not after:
        return
    before_hashes = before.get("collection_sha256", {})
    after_hashes = after.get("collection_sha256", {})
    if before_hashes != after_hashes:
        fail("empreintes des collections Mirandol modifiées")
    for key, value in before_hashes.items():
        if not isinstance(value, str) or not re.fullmatch(r"[0-9A-F]{64}", value):
            fail(f"empreinte Mirandol invalide: {key}")


def validate_report() -> None:
    report = ROOT / "00_RAPPORT_FINAL/rapport_final.md"
    if not report.is_file():
        fail("rapport final absent")
    elif not report.read_text(encoding="utf-8").rstrip().endswith("INTEGRATION_PRIVEE_CORRIGEE_REUSSIE"):
        fail("conclusion du rapport final absente")


validate_checksums()
validate_docx()
validate_segmentation_and_notes()
validate_alignment()
validate_mirandol_identity()
validate_report()

if ERRORS:
    print(json.dumps({"status": "FAIL", "errors": ERRORS}, ensure_ascii=False, indent=2))
    raise SystemExit(1)
print(json.dumps({"status": "PASS", "root": str(ROOT), "checksums": "PASS", "segments": 1880,
                  "verses": 1213, "ceriziers_aligned": 1821, "mirandol_aligned": 1895,
                  "mirandol_identity": "PASS"}, ensure_ascii=False, indent=2))
