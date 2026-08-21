from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from bisect import bisect_right
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path("tmp/confessions-links-2026-07-30")


def tokens(value: str) -> list[str]:
    folded = unicodedata.normalize("NFD", value.lower())
    folded = "".join(character for character in folded if unicodedata.category(character) != "Mn")
    folded = folded.replace("j", "i").replace("v", "u")
    return re.findall(r"[a-z]+", folded)


def fill_positions(mapping: list[int | None], target_length: int) -> list[int]:
    known = [index for index, value in enumerate(mapping) if value is not None]
    if not known:
        raise RuntimeError("Aucun bloc commun entre les deux témoins latins")
    first = known[0]
    for index in range(first):
        mapping[index] = max(0, mapping[first] - (first - index))
    previous = first
    for current in known[1:]:
        if current > previous + 1:
            left, right = mapping[previous], mapping[current]
            for index in range(previous + 1, current):
                ratio = (index - previous) / (current - previous)
                mapping[index] = round(left + ratio * (right - left))
        previous = current
    for index in range(previous + 1, len(mapping)):
        mapping[index] = min(target_length - 1, mapping[previous] + (index - previous))
    return [int(value) for value in mapping]


standard_payload = json.loads((ROOT / "standard-latin-paragraphs.json").read_text(encoding="utf-8"))
ccel_payload = json.loads((ROOT / "ccel-scripture-candidates.json").read_text(encoding="utf-8"))
local_paragraphs = json.loads((ROOT / "paragraphs.json").read_text(encoding="utf-8"))

local_books = []
local_chapters = defaultdict(list)
for paragraph in local_paragraphs:
    if paragraph["book"] not in local_books:
        local_books.append(paragraph["book"])
    if paragraph["chapter"] not in local_chapters[paragraph["book"]]:
        local_chapters[paragraph["book"]].append(paragraph["chapter"])

local_by_key = defaultdict(list)
for paragraph in local_paragraphs:
    book = local_books.index(paragraph["book"]) + 1
    chapter = local_chapters[paragraph["book"]].index(paragraph["chapter"]) + 1
    local_by_key[(book, chapter)].append(paragraph)
standard_by_key = defaultdict(list)
for section in standard_payload["sections"]:
    standard_by_key[(section["book"], section["chapter"])].append(section)

section_alignment = {}
chapter_reports = []
for key in sorted(standard_by_key):
    sections = standard_by_key[key]
    paragraphs = local_by_key[key]
    standard_tokens = []
    section_spans = []
    for section in sections:
        start = len(standard_tokens)
        standard_tokens.extend(tokens(section["latin"]))
        section_spans.append((start, len(standard_tokens)))
    local_tokens = []
    paragraph_spans = []
    for paragraph in paragraphs:
        start = len(local_tokens)
        local_tokens.extend(tokens(paragraph["latin"] or ""))
        paragraph_spans.append((start, len(local_tokens)))
    matcher = SequenceMatcher(None, standard_tokens, local_tokens, autojunk=False)
    position_map: list[int | None] = [None] * len(standard_tokens)
    matched = 0
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            position_map[block.a + offset] = block.b + offset
        matched += block.size
    mapped = fill_positions(position_map, len(local_tokens))
    local_ends = [end for _, end in paragraph_spans]
    for section, (start, end) in zip(sections, section_spans, strict=True):
        local_start = mapped[start] if start < len(mapped) else len(local_tokens) - 1
        local_end = mapped[end - 1] + 1 if end else local_start + 1
        first_index = min(len(paragraphs) - 1, bisect_right(local_ends, local_start))
        selected = []
        for index in range(first_index, len(paragraphs)):
            paragraph_start, paragraph_end = paragraph_spans[index]
            if paragraph_start >= local_end and selected:
                break
            if paragraph_end > local_start and paragraph_start < local_end:
                selected.append(paragraphs[index])
        section_key = (section["book"], section["chapter"], section["standard_paragraph"])
        section_alignment[section_key] = {
            "coverage": sum(1 for position in position_map[start:end] if position is not None) / max(1, end - start),
            "local_paragraphs": selected,
        }
    chapter_reports.append({
        "book": key[0],
        "chapter": key[1],
        "standard_tokens": len(standard_tokens),
        "local_tokens": len(local_tokens),
        "matching_tokens": matched,
        "coverage": matched / max(1, len(standard_tokens)),
    })

aligned_occurrences = []
unmapped = []
chapter_by_book_paragraph = {
    (section["book"], section["standard_paragraph"]): section["chapter"]
    for section in standard_payload["sections"]
}
for occurrence in ccel_payload["occurrences"]:
    canonical_chapter = chapter_by_book_paragraph.get(
        (occurrence["book"], occurrence["standard_paragraph"]), occurrence["chapter"]
    )
    key = (occurrence["book"], canonical_chapter, occurrence["standard_paragraph"])
    alignment = section_alignment.get(key)
    if alignment is None:
        unmapped.append(occurrence)
        continue
    aligned_occurrences.append({
        **occurrence,
        "chapter": canonical_chapter,
        "latin_alignment_coverage": alignment["coverage"],
        "local_candidates": [{
            "book": paragraph["book"],
            "chapter": paragraph["chapter"],
            "paragraph": paragraph["paragraph"],
            "first_segment": paragraph["first_segment"],
            "last_segment": paragraph["last_segment"],
            "french": paragraph["french"],
            "latin": paragraph["latin"],
        } for paragraph in alignment["local_paragraphs"]],
    })

report = {
    "counts": {
        "standard_sections": len(standard_payload["sections"]),
        "local_paragraphs": len(local_paragraphs),
        "ccel_occurrences": len(ccel_payload["occurrences"]),
        "aligned_occurrences": len(aligned_occurrences),
        "unmapped_occurrences": len(unmapped),
    },
    "coverage": {
        "minimum_chapter": min(row["coverage"] for row in chapter_reports),
        "mean_chapter": sum(row["coverage"] for row in chapter_reports) / len(chapter_reports),
        "chapters_below_95_percent": [row for row in chapter_reports if row["coverage"] < 0.95],
        "sections_below_90_percent": sum(1 for value in section_alignment.values() if value["coverage"] < 0.90),
    },
    "unmapped": unmapped,
    "chapter_reports": chapter_reports,
}
payload = {"report": report, "occurrences": aligned_occurrences}
body = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
path = ROOT / "aligned-scripture-candidates.json"
path.write_text(body, encoding="utf-8")
(ROOT / "aligned-scripture-candidates.json.sha256").write_text(
    f"{hashlib.sha256(body.encode('utf-8')).hexdigest().upper()}  {path.name}\n",
    encoding="utf-8",
)
print(json.dumps(report["counts"] | report["coverage"], ensure_ascii=False, indent=2))
