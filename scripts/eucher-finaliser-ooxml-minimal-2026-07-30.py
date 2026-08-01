from __future__ import annotations

import hashlib
import os
import zipfile
from pathlib import Path

from docx import Document


MASTER = Path(r"C:\Corpus Scriptura\CS - Espace travail IA\Saint_Eucher_Du_mepris_du_monde_1672_transcription.docx")
BACKUP = MASTER.with_name(f"{MASTER.stem}_avant_correction_audit_2026-07-30.docx")
TEMP = MASTER.with_suffix(".minimal.tmp.docx")
EXPECTED_BACKUP_SHA256 = "59AECCA3C1FAE633FB87BF51A5F6B27FEAE760F6343EEEF3700574C4F1DC3F27"
REPLACEMENTS = {
    "A. Darrera Curé de S. André.": "A. Debreda Curé de S. André.",
    "Gremet Curé de S. Benoist.": "Grenet Curé de S. Benoist.",
    "N. Gorillon Curé de S. Laurent.": "N. Gobillon Curé de S. Laurent.",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


if sha256(BACKUP) != EXPECTED_BACKUP_SHA256:
    raise SystemExit("La sauvegarde Word n’est plus l’original attendu.")

with zipfile.ZipFile(BACKUP, "r") as source, zipfile.ZipFile(TEMP, "w") as target:
    for info in source.infolist():
        payload = source.read(info.filename)
        if info.filename == "word/document.xml":
            for old, new in REPLACEMENTS.items():
                old_bytes = old.encode("utf-8")
                new_bytes = new.encode("utf-8")
                if payload.count(old_bytes) != 1:
                    raise SystemExit(f"Occurrence OOXML inattendue : {old!r}")
                payload = payload.replace(old_bytes, new_bytes)
        target.writestr(info, payload)

os.replace(TEMP, MASTER)
document = Document(MASTER)
corpus = "\n".join(paragraph.text for paragraph in document.paragraphs)
for old, new in REPLACEMENTS.items():
    if old in corpus or corpus.count(new) != 1:
        raise SystemExit(f"Contrôle Word échoué : {old!r} -> {new!r}")

with zipfile.ZipFile(BACKUP) as before, zipfile.ZipFile(MASTER) as after:
    changed = [name for name in before.namelist() if before.read(name) != after.read(name)]
if changed != ["word/document.xml"]:
    raise SystemExit(f"Parties OOXML modifiées en excès : {changed}")

print(f"after_sha256={sha256(MASTER)}")
print(f"changed_parts={changed}")
