from __future__ import annotations

import difflib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from docx import Document


DOCX = Path(r"C:\Corpus Scriptura\Sources\Basile\BKV_Homelies_sur_Hexaemeron_Auger_1827.docx")
BACKUP = Path(r"C:\Corpus Scriptura\bible-patristique\audit\hexameron-2026-07-30\before.json")
PDF_REPORT = Path(r"C:\Corpus Scriptura\bible-patristique\audit\hexameron-2026-07-30\pdf-db-comparison.json")
OUTPUT = Path(r"C:\Corpus Scriptura\bible-patristique\audit\hexameron-2026-07-30\bkv-db-comparison.json")

HOMILIES = {
    "Première homélie": 1,
    "Deuxième homélie": 2,
    "Troisième homélie": 3,
    "Quatrième homélie": 4,
    "Cinquième homélie": 5,
    "Sixième homélie": 6,
    "Septième homélie": 7,
    "Huitième homélie": 8,
    "Neuvième homélie": 9,
}


def plain(value: str) -> str:
    value = value.lower().replace("œ", "oe").replace("æ", "ae")
    value = "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z]+", "", value)


def tokens(value: str, equivalences: dict[str, str]) -> list[str]:
    result = []
    for raw in re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+", value):
        token = plain(raw)
        result.append(equivalences.get(token, token))
    return result


def bkv_homilies() -> dict[int, str]:
    result: dict[int, list[str]] = defaultdict(list)
    current = None
    in_body = False
    for paragraph in Document(DOCX).paragraphs:
        text = re.sub(r"\s+", " ", paragraph.text).strip()
        style = paragraph.style.name if paragraph.style else ""
        if style == "Heading 2":
            match = re.search(r"HOMÉLIE\s+(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME)", text)
            names = {
                "PREMIÈRE": 1, "DEUXIÈME": 2, "TROISIÈME": 3, "QUATRIÈME": 4,
                "CINQUIÈME": 5, "SIXIÈME": 6, "SEPTIÈME": 7, "HUITIÈME": 8,
                "NEUVIÈME": 9,
            }
            current = names[match.group(1)] if match else None
            in_body = False
            continue
        if current is None:
            continue
        if style == "Heading 3":
            in_body = bool(re.fullmatch(r"\d+\.", text))
            continue
        if in_body and text:
            result[current].append(text)
    return {number: " ".join(parts) for number, parts in result.items()}


def main() -> None:
    backup = json.loads(BACKUP.read_text(encoding="utf-8"))
    learned = json.loads(PDF_REPORT.read_text(encoding="utf-8"))["equivalences_apprises"]
    # The learned map is source-old -> database-modern; normalize keys/values again defensively.
    equivalences = {plain(key): plain(value) for key, value in learned.items()}
    db_parts: dict[int, list[str]] = defaultdict(list)
    db_segment_parts: dict[int, list[tuple[int, str]]] = defaultdict(list)
    for segment in backup["segments"]:
        number = HOMILIES.get(segment["ref_niv1"])
        if number:
            db_parts[number].append(segment["segment_texte"])
            db_segment_parts[number].append((segment["segment_numero"], segment["segment_texte"]))
    bkv = bkv_homilies()
    report = []
    for number in range(1, 10):
        source_tokens = tokens(bkv[number], equivalences)
        db_tokens = tokens(" ".join(db_parts[number]), equivalences)
        db_owners = []
        for segment_number, segment_text in db_segment_parts[number]:
            db_owners.extend([segment_number] * len(tokens(segment_text, equivalences)))
        if len(db_owners) != len(db_tokens):
            raise RuntimeError(f"Token ownership mismatch in homily {number}")
        matcher = difflib.SequenceMatcher(None, source_tokens, db_tokens, autojunk=False)
        differences = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                continue
            differences.append(
                {
                    "tag": tag,
                    "bkv": source_tokens[i1:i2],
                    "db": db_tokens[j1:j2],
                    "bkv_position": [i1, i2],
                    "db_position": [j1, j2],
                    "db_segment_numbers": sorted(set(db_owners[j1:j2] or db_owners[max(0, j1 - 1):j1 + 1])),
                    "bkv_context": source_tokens[max(0, i1 - 12):min(len(source_tokens), i2 + 12)],
                    "db_context": db_tokens[max(0, j1 - 12):min(len(db_tokens), j2 + 12)],
                }
            )
        item = {
            "homily": number,
            "bkv_tokens": len(source_tokens),
            "db_tokens": len(db_tokens),
            "ratio": matcher.ratio(),
            "substantial_differences": differences,
        }
        report.append(item)
        print(f"H{number}: BKV={len(source_tokens)} DB={len(db_tokens)} ratio={matcher.ratio():.6f} differences={len(differences)}")
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
