from __future__ import annotations

import difflib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from docx import Document


ROOT = Path(r"C:\Corpus Scriptura\bible-patristique")
DOCX = Path(r"C:\Corpus Scriptura\Sources\Basile\BKV_Homelies_sur_Hexaemeron_Auger_1827.docx")
SNAPSHOT = ROOT / "audit/hexameron-2026-07-30/after-splits.json"
PDF_REPORT = ROOT / "audit/hexameron-2026-07-30/pdf-db-comparison.json"
OUTPUT = ROOT / "audit/hexameron-2026-07-30/structure-proposal.json"

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

TITLES = {
    1: "Au commencement Dieu créa le ciel et la terre",
    2: "La terre étoit invisible et informe",
    3: "Et Dieu dit : Que le firmament soit fait",
    4: "Sur l’assemblage des eaux",
    5: "Sur les productions de la terre",
    6: "Sur la création des corps lumineux",
    7: "Sur les reptiles",
    8: "Des oiseaux",
    9: "Sur les animaux terrestres",
    10: "Sur la création de l’homme",
}


def plain(value: str) -> str:
    value = value.lower().replace("œ", "oe").replace("æ", "ae")
    value = "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z]+", "", value)


def tokenize(value: str, equivalences: dict[str, str]) -> list[str]:
    return [equivalences.get(plain(raw), plain(raw)) for raw in re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+", value)]


def source_paragraphs() -> dict[int, list[dict[str, object]]]:
    result: dict[int, list[dict[str, object]]] = defaultdict(list)
    current_homily = None
    current_section = None
    names = {
        "PREMIÈRE": 1, "DEUXIÈME": 2, "TROISIÈME": 3, "QUATRIÈME": 4,
        "CINQUIÈME": 5, "SIXIÈME": 6, "SEPTIÈME": 7, "HUITIÈME": 8,
        "NEUVIÈME": 9,
    }
    for docx_index, paragraph in enumerate(Document(DOCX).paragraphs):
        text = re.sub(r"\s+", " ", paragraph.text).strip()
        style = paragraph.style.name if paragraph.style else ""
        if style == "Heading 2":
            match = re.search(r"HOMÉLIE\s+(PREMIÈRE|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME|SEPTIÈME|HUITIÈME|NEUVIÈME)", text)
            current_homily = names[match.group(1)] if match else None
            current_section = None
            continue
        if current_homily is None:
            continue
        if style == "Heading 3":
            match = re.fullmatch(r"(\d+)\.", text)
            current_section = int(match.group(1)) if match else None
            continue
        if current_section is not None and text:
            result[current_homily].append(
                {
                    "paragraph": len(result[current_homily]) + 1,
                    "section": current_section,
                    "docx_index": docx_index,
                    "text": text,
                }
            )
    return result


def main() -> None:
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    learned = json.loads(PDF_REPORT.read_text(encoding="utf-8"))["equivalences_apprises"]
    equivalences = {plain(key): plain(value) for key, value in learned.items()}
    source = source_paragraphs()
    segments_by_homily: dict[int, list[dict[str, object]]] = defaultdict(list)
    tenth_segments = []
    for segment in snapshot["segments"]:
        number = HOMILIES.get(segment["ref_niv1"])
        if number:
            segments_by_homily[number].append(segment)
        elif segment["ref_niv1"].startswith("Dixième homélie"):
            tenth_segments.append(segment)

    order_overrides = {900001: 889.5, 900002: 1245.5, 900003: 1421.5}
    for values in segments_by_homily.values():
        values.sort(key=lambda segment: order_overrides.get(segment["segment_numero"], segment["segment_numero"]))

    rows = []
    audit = []
    for homily in range(1, 10):
        source_tokens = []
        source_owners = []
        for paragraph in source[homily]:
            paragraph_tokens = tokenize(str(paragraph["text"]), equivalences)
            source_tokens.extend(paragraph_tokens)
            source_owners.extend([int(paragraph["paragraph"])] * len(paragraph_tokens))

        db_tokens = []
        db_owners = []
        for segment in segments_by_homily[homily]:
            segment_tokens = tokenize(str(segment["segment_texte"]), equivalences)
            db_tokens.extend(segment_tokens)
            db_owners.extend([int(segment["id"])] * len(segment_tokens))

        overlaps: dict[int, Counter[int]] = defaultdict(Counter)
        matcher = difflib.SequenceMatcher(None, source_tokens, db_tokens, autojunk=False)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag != "equal":
                continue
            for source_owner, db_owner in zip(source_owners[i1:i2], db_owners[j1:j2]):
                overlaps[db_owner][source_owner] += 1

        paragraph_meta = {int(item["paragraph"]): item for item in source[homily]}
        assignments = []
        for segment in segments_by_homily[homily]:
            counts = overlaps[int(segment["id"])]
            if not counts:
                raise RuntimeError(f"No paragraph overlap for segment {segment['segment_numero']}")
            paragraph, matched = counts.most_common(1)[0]
            total = sum(counts.values())
            assignments.append((segment, paragraph, matched, total, counts))

        rank_by_paragraph = Counter()
        for segment, paragraph, matched, total, counts in assignments:
            rank_by_paragraph[paragraph] += 1
            meta = paragraph_meta[paragraph]
            rows.append(
                {
                    "id": segment["id"],
                    "segment_numero": segment["segment_numero"],
                    "ref_niv1": segment["ref_niv1"],
                    "ref_niv1_texte": TITLES[homily],
                    "ref_niv2": str(meta["section"]),
                    "ref_niv2_texte": None,
                    "paragraphe": paragraph,
                    "rang": rank_by_paragraph[paragraph],
                    "overlap": dict(counts),
                }
            )
        audit.append(
            {
                "homily": homily,
                "source_paragraphs": len(source[homily]),
                "source_sections": sorted({int(item["section"]) for item in source[homily]}),
                "segments": len(assignments),
                "ratio": matcher.ratio(),
                "cross_paragraph_segments": [
                    {"segment_numero": segment["segment_numero"], "overlap": dict(counts)}
                    for segment, _, _, _, counts in assignments if len(counts) > 1
                ],
                "unrepresented_paragraphs": sorted(set(paragraph_meta) - {paragraph for _, paragraph, _, _, _ in assignments}),
            }
        )

    # The tenth homily has no numbered subsections. Its former ref_niv2 values 1..23
    # reproduce the printed paragraph boundaries.
    tenth_rank = Counter()
    for segment in tenth_segments:
        paragraph = int(segment["ref_niv2"])
        tenth_rank[paragraph] += 1
        rows.append(
            {
                "id": segment["id"],
                "segment_numero": segment["segment_numero"],
                "ref_niv1": "Dixième homélie (attribution discutée)",
                "ref_niv1_texte": TITLES[10],
                "ref_niv2": None,
                "ref_niv2_texte": None,
                "paragraphe": paragraph,
                "rang": tenth_rank[paragraph],
                "overlap": None,
            }
        )
    audit.append(
        {
            "homily": 10,
            "source_paragraphs": 23,
            "source_sections": [],
            "segments": len(tenth_segments),
        }
    )

    payload = {"rows": rows, "audit": audit}
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    print(f"rows={len(rows)}")


if __name__ == "__main__":
    main()
