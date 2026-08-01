from __future__ import annotations

import json
import re
from pathlib import Path

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit" / "hexameron-2026-07-30"
HTML = ROOT / "scripts" / "_hexameron_remacle.htm"
SNAPSHOT = AUDIT / "after-apparatus.json"
OUTPUT = AUDIT / "greek-gaps-proposal.json"

source = HTML.read_text(encoding="utf-8", errors="ignore")
snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
labels = []
for row in snapshot["segments"]:
    if row["nature"] == "texte" and row["ref_niv1"] not in labels:
        labels.append(row["ref_niv1"])


def body_pairs(roman: str, next_roman: str) -> list[tuple[str, str]]:
    start = source.index(f'name="{roman}"')
    end = source.index(f'name="{next_roman}"', start)
    root = html.fromstring(f"<div>{source[start:end]}</div>")
    paragraphs = [" ".join(p.text_content().split()) for p in root.xpath("//p")]
    last_greek = max(
        i for i, text in enumerate(paragraphs)
        if sum("\u0370" <= c <= "\u03ff" or "\u1f00" <= c <= "\u1fff" for c in text) > 10
    )
    greek = [
        text for text in paragraphs[: last_greek + 1]
        if len(text) > 100
        and sum("\u0370" <= c <= "\u03ff" or "\u1f00" <= c <= "\u1fff" for c in text) > 10
    ]
    french = [text for text in paragraphs[last_greek + 1 :] if len(text) > 100]
    if len(greek) != len(french):
        raise RuntimeError(f"Paires grec/français incohérentes pour {roman}: {len(greek)} / {len(french)}")
    return list(zip(greek, french))


def clean_greek(text: str) -> str:
    text = re.sub(r"^\s*[IVX]+\.\s*", "", text)
    text = re.sub(r"\[\d+\]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def first_segment(homily_index: int, paragraph: int) -> dict:
    candidates = [
        row for row in snapshot["segments"]
        if row["nature"] == "texte" and row["ref_niv1"] == labels[homily_index]
        and row["paragraphe"] == paragraph
    ]
    row = min(candidates, key=lambda item: item["rang"])
    if row["rang"] != 1 or row.get("texte_original"):
        raise RuntimeError(f"Cible grecque non vide ou rang inattendu: {row['segment_numero']}")
    return row


# Les recompositions intégrales ont isolé exactement ces trois omissions :
# H I, paires bilingues 5 et 7 ; H III, paire bilingue 7.
specifications = [
    (0, "I", "II", 5, 5),
    (0, "I", "II", 7, 8),
    (2, "III", "IV", 7, 7),
]
rows = []
for homily_index, roman, next_roman, pair_number, paragraph in specifications:
    pairs = body_pairs(roman, next_roman)
    greek, french = pairs[pair_number - 1]
    target = first_segment(homily_index, paragraph)
    rows.append({
        "id": target["id"],
        "segment_numero": target["segment_numero"],
        "ref_niv1": target["ref_niv1"],
        "paragraphe": paragraph,
        "pair_number": pair_number,
        "french_witness_start": french[:240],
        "target_start": target["segment_texte"][:240],
        "texte_original": clean_greek(greek),
    })

OUTPUT.write_text(json.dumps({"rows": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps([
    {"segment": row["segment_numero"], "paragraph": row["paragraphe"], "greek_chars": len(row["texte_original"])}
    for row in rows
], ensure_ascii=False, indent=2))
