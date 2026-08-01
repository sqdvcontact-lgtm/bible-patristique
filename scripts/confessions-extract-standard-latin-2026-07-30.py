from __future__ import annotations

import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from lxml import html

BASE = "https://faculty.georgetown.edu/jod/conf"
OUT = Path("tmp/confessions-links-2026-07-30")


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


sections = []
for book in range(1, 14):
    url = f"{BASE}/text{book}.html"
    request = urllib.request.Request(url, headers={"User-Agent": "Corpus-Scriptura-link-audit/1.0"})
    source = urllib.request.urlopen(request, timeout=45).read().decode("latin-1")
    anchors = list(re.finditer(rf'<a\s+name=["\']?(TB{book}C(\d+)S(\d+))["\']?\s*>', source, re.I))
    if book == 4 and not anchors:
        document = html.fromstring(source)
        labels = document.xpath("//p[contains(concat(' ', normalize-space(@class), ' '), ' p3 ')]")
        for label in labels:
            match = re.fullmatch(r"4\.(\d+)\.(\d+)", clean(label.text_content()))
            if not match:
                continue
            chapter, standard_paragraph = map(int, match.groups())
            paragraphs = label.xpath("following-sibling::p[contains(concat(' ', normalize-space(@class), ' '), ' p4 ')][1]")
            if not paragraphs:
                raise RuntimeError(f"Texte absent après 4.{chapter}.{standard_paragraph}")
            anchor_name = f"TB4C{chapter}S{standard_paragraph}"
            sections.append({
                "book": 4,
                "chapter": chapter,
                "standard_paragraph": standard_paragraph,
                "anchor": anchor_name,
                "url": f"{url}#{anchor_name}",
                "latin": clean(paragraphs[0].text_content()),
            })
        continue
    for index, anchor in enumerate(anchors):
        anchor_name, chapter, standard_paragraph = anchor.groups()
        chapter, standard_paragraph = int(chapter), int(standard_paragraph)
        end = anchors[index + 1].start() if index + 1 < len(anchors) else len(source)
        block = source[anchor.end():end]
        paragraph_match = re.search(r"<p[^>]*>(.*?)</p>", block, re.I | re.S)
        if not paragraph_match:
            raise RuntimeError(f"Texte absent après {anchor_name}")
        paragraph = html.fragment_fromstring(f"<div>{paragraph_match.group(1)}</div>")
        sections.append({
            "book": book,
            "chapter": chapter,
            "standard_paragraph": standard_paragraph,
            "anchor": anchor_name,
            "url": f"{url}#{anchor_name}",
            "latin": clean(paragraph.text_content()),
        })

chapters = {(row["book"], row["chapter"]) for row in sections}
expected_chapters = sum([20, 10, 12, 16, 14, 16, 21, 12, 13, 43, 31, 32, 38])
if len(chapters) != expected_chapters:
    raise SystemExit(f"{expected_chapters} chapitres attendus, {len(chapters)} extraits")
if sorted({row["book"] for row in sections}) != list(range(1, 14)):
    raise SystemExit("Livres incomplets")

payload = {
    "source": {
        "title": "Augustine's Confessions, complete Latin text with standard book/chapter/paragraph numbering",
        "url": "https://faculty.georgetown.edu/jod/latinconf/latinconf.html",
        "editorial_notice": "freeware text identified by J. J. O'Donnell as probably Knöll's editio minor (1898); used only to transfer standard paragraph boundaries to the CSEL witness",
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    },
    "counts": {
        "sections": len(sections),
        "chapters": len(chapters),
        "characters": sum(len(row["latin"]) for row in sections),
        "by_book": {str(book): sum(1 for row in sections if row["book"] == book) for book in range(1, 14)},
    },
    "sections": sections,
}
OUT.mkdir(parents=True, exist_ok=True)
body = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
path = OUT / "standard-latin-paragraphs.json"
path.write_text(body, encoding="utf-8")
(OUT / "standard-latin-paragraphs.json.sha256").write_text(
    f"{hashlib.sha256(body.encode('utf-8')).hexdigest().upper()}  {path.name}\n",
    encoding="utf-8",
)
print(json.dumps(payload["counts"], ensure_ascii=False, indent=2))
