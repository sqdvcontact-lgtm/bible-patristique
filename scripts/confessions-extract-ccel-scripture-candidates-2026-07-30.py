from __future__ import annotations

import hashlib
import json
import re
import ssl
import urllib.request
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from lxml import html

BASE = "https://www.ccel.org/ccel/augustine/confessions"
OUT = Path("tmp/confessions-links-2026-07-30")
ROMAN_SECTIONS = ["iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"]


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Corpus-Scriptura-link-audit/1.0"})
    try:
        return urllib.request.urlopen(request, timeout=45).read()
    except Exception as exc:
        # Le certificat actuellement servi par CCEL est signalé expiré par le
        # runtime Python. Le contenu reste un témoin secondaire public et sera
        # contrôlé contre le latin CSEL et l'ossature locale avant toute écriture.
        if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
            raise
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return urllib.request.urlopen(request, timeout=45, context=context).read()


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def body_text(element) -> str:
    clone = deepcopy(element)
    for unwanted in clone.xpath(".//*[contains(concat(' ', normalize-space(@class), ' '), ' mnote ') or contains(concat(' ', normalize-space(@class), ' '), ' Note ') or contains(concat(' ', normalize-space(@class), ' '), ' Footnote ')]"):
        unwanted.drop_tree()
    return clean_text(clone.text_content())


def reference(anchor) -> dict:
    onclick = anchor.get("onclick", "")
    match = re.search(r"goBible\('[^']*','([^']+)','(\d+)','(\d+)','(\d+)','(\d+)'\)", onclick)
    if match:
        book, chapter_start, verse_start, chapter_end, verse_end = match.groups()
        return {
            "source_book_code": book,
            "chapter_start": int(chapter_start),
            "verse_start": int(verse_start),
            "chapter_end": int(chapter_end),
            "verse_end": int(verse_end),
            "display": clean_text(anchor.text_content()),
        }
    href = anchor.get("href", "")
    match = re.search(r"\.([^.]+)\.(\d+)\.html#[^.]+\.(\d+)", href)
    if not match:
        raise RuntimeError(f"Référence CCEL illisible: {html.tostring(anchor, encoding='unicode')}")
    book, chapter, verse = match.groups()
    return {
        "source_book_code": book,
        "chapter_start": int(chapter),
        "verse_start": int(verse),
        "chapter_end": int(chapter),
        "verse_end": int(verse),
        "display": clean_text(anchor.text_content()),
    }


occurrences = []
body_paragraphs = []
book_number = 0
for section in ROMAN_SECTIONS:
    url = f"{BASE}/confessions.{section}.html"
    document = html.fromstring(fetch(url))
    current_book = book_number
    current_chapter = None
    current_standard_paragraph = None
    current_body = None
    elements = document.xpath("//*[@id='theText']//*[self::p or self::a]")
    for element in elements:
        if element.tag == "p":
            classes = set((element.get("class") or "").split())
            text = clean_text(element.text_content())
            upper = text.upper()
            book_match = re.fullmatch(r"BOOK\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN)", upper)
            if book_match:
                names = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN"]
                current_book = names.index(book_match.group(1)) + 1
                book_number = max(book_number, current_book)
                current_chapter = None
                current_standard_paragraph = None
            chapter_match = re.fullmatch(r"CHAPTER\s+([IVXLCDM]+)", upper)
            if chapter_match:
                values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
                total = 0
                previous = 0
                for character in reversed(chapter_match.group(1)):
                    value = values[character]
                    total += -value if value < previous else value
                    previous = max(previous, value)
                current_chapter = total
            if "body" in classes:
                current_body = element
                standard_match = re.match(r"\s*(\d+)\.\s", body_text(element))
                if standard_match:
                    current_standard_paragraph = int(standard_match.group(1))
                if current_book >= 1 and current_chapter is not None:
                    body_paragraphs.append({
                        "book": current_book,
                        "chapter": current_chapter,
                        "standard_paragraph": current_standard_paragraph,
                        "ccel_section": section,
                        "ccel_body_id": element.get("id"),
                        "context_english": body_text(element),
                    })
        elif "scripRef" in set((element.get("class") or "").split()):
            body_ancestors = element.xpath("ancestor::p[contains(concat(' ', normalize-space(@class), ' '), ' body ')][1]")
            source_body = body_ancestors[0] if body_ancestors else current_body
            if source_body is None or current_book < 1 or current_chapter is None:
                continue
            item = {
                "book": current_book,
                "chapter": current_chapter,
                "standard_paragraph": current_standard_paragraph,
                "ccel_section": section,
                "ccel_anchor": element.get("id"),
                "ccel_body_id": source_body.get("id"),
                "ccel_url": f"{url}#{element.get('id')}",
                "context_english": body_text(source_body),
                "in_editorial_note": bool(element.xpath("ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' Footnote ') or contains(concat(' ', normalize-space(@class), ' '), ' mnote ')]")),
                **reference(element),
            }
            occurrences.append(item)

if sorted(set(item["book"] for item in occurrences)) != list(range(1, 14)):
    raise SystemExit("Les treize livres ne sont pas tous représentés dans l'index CCEL")

payload = {
    "source": {
        "title": "Confessions and Enchiridion, translated and edited by Albert C. Outler",
        "url": f"{BASE}.toc.html",
        "role": "témoin secondaire de rappel; aucune cible n'est écrite sans lecture du français, du latin CSEL et de versets_lecture",
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    },
    "counts": {
        "occurrences": len(occurrences),
        "body_paragraphs": len(body_paragraphs),
        "books": 13,
        "by_book": {str(book): sum(1 for item in occurrences if item["book"] == book) for book in range(1, 14)},
        "editorial_note_occurrences": sum(1 for item in occurrences if item["in_editorial_note"]),
    },
    "body_paragraphs": body_paragraphs,
    "occurrences": occurrences,
}
OUT.mkdir(parents=True, exist_ok=True)
body = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
path = OUT / "ccel-scripture-candidates.json"
path.write_text(body, encoding="utf-8")
(OUT / "ccel-scripture-candidates.json.sha256").write_text(
    f"{hashlib.sha256(body.encode('utf-8')).hexdigest().upper()}  {path.name}\n",
    encoding="utf-8",
)
print(json.dumps(payload["counts"], ensure_ascii=False, indent=2))
