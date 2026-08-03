from __future__ import annotations

import hashlib
import html
import re
import shutil
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCES = [
    ROOT / "Genese_draft_v7.docx",
    ROOT / "Exode_draft_v3.docx",
    ROOT / "Levitique_draft.docx",
    ROOT / "Nombres_draft.docx",
    ROOT / "Deuteronome_draft.docx",
    ROOT / "Josue_draft.docx",
    ROOT / "Juges_draft.docx",
]
DEST_DIR = Path(r"D:\OneDrive\Bureau\Nuage\Corpus Scriptura - Textes maîtres\Questions sur l’Heptateuque - Augustin (1866)")
DEST = DEST_DIR / "Questions sur l’Heptateuque - Augustin - Pognon 1866 - MASTER.docx"
NOTICE = (
    "Œuvres complètes de saint Augustin, éd. Raulx, t. IV, Bar-le-Duc, "
    "L. Guérin & Cie, 1866. Traduction de l’abbé Pognon. Texte complet "
    "des Questions sur l’Heptateuque, pages 383-597 du scan, contrôle image "
    "intégral effectué. Les [sic] signalent les coquilles de l’édition "
    "conservées ; les fautes d’OCR sont corrigées silencieusement contre le fac-similé."
)


def load_part(path: Path, member: str) -> str:
    with zipfile.ZipFile(path) as zf:
        return zf.read(member).decode("utf-8")


def body_without_sect(document_xml: str) -> str:
    body = re.search(r"<w:body>([\s\S]*?)</w:body>", document_xml)
    if not body:
        raise RuntimeError("w:body introuvable")
    return re.sub(r"<w:sectPr\b[\s\S]*?</w:sectPr>\s*$", "", body.group(1))


def sect_pr(document_xml: str) -> str:
    match = re.search(r"<w:sectPr\b[\s\S]*?</w:sectPr>", document_xml)
    if not match:
        raise RuntimeError("w:sectPr introuvable")
    return match.group(0)


def from_first_heading1(body_xml: str) -> str:
    for paragraph in re.finditer(r"<w:p\b[\s\S]*?</w:p>", body_xml):
        if re.search(r'<w:pStyle\b[^>]*w:val="Heading1"', paragraph.group(0)):
            return body_xml[paragraph.start():]
    raise RuntimeError("Heading1 introuvable dans un livre")


def replace_notice(base_body: str) -> str:
    paragraphs = list(re.finditer(r"<w:p\b[\s\S]*?</w:p>", base_body))
    if len(paragraphs) < 2:
        raise RuntimeError("Notice initiale introuvable")
    paragraph = paragraphs[1].group(0)
    text_nodes = list(re.finditer(r"<w:t\b([^>]*)>[\s\S]*?</w:t>", paragraph))
    if not text_nodes:
        raise RuntimeError("Texte de notice introuvable")
    first = text_nodes[0]
    replacement = f"<w:t{first.group(1)}>{html.escape(NOTICE)}</w:t>"
    rebuilt = paragraph[:first.start()] + replacement + paragraph[first.end():]
    rebuilt = re.sub(r"<w:t\b[^>]*>[\s\S]*?</w:t>", "<w:t></w:t>", rebuilt, count=max(0, len(text_nodes) - 1))
    return base_body[:paragraphs[1].start()] + rebuilt + base_body[paragraphs[1].end():]


def positive_footnotes(footnotes_xml: str) -> list[tuple[int, str]]:
    result = []
    for match in re.finditer(r'<w:footnote\b[^>]*w:id="(-?\d+)"[^>]*>[\s\S]*?</w:footnote>', footnotes_xml):
        note_id = int(match.group(1))
        if note_id > 0:
            result.append((note_id, match.group(0)))
    return result


def renumber_ids(xml: str, offset: int) -> str:
    return re.sub(
        r'(w:id=")([1-9]\d*)(")',
        lambda m: f"{m.group(1)}{int(m.group(2)) + offset}{m.group(3)}",
        xml,
    )


def build() -> tuple[Path, dict[str, int | str]]:
    for source in SOURCES:
        if not source.exists():
            raise FileNotFoundError(source)

    base_doc = load_part(SOURCES[0], "word/document.xml")
    base_foot = load_part(SOURCES[0], "word/footnotes.xml")
    body = replace_notice(body_without_sect(base_doc))
    section = sect_pr(base_doc)
    all_notes = positive_footnotes(base_foot)
    note_offset = len(all_notes)
    page_break = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

    for source in SOURCES[1:]:
        document = load_part(source, "word/document.xml")
        appended = from_first_heading1(body_without_sect(document))
        appended = renumber_ids(appended, note_offset)
        body += page_break + appended

        footnotes = load_part(source, "word/footnotes.xml")
        for old_id, note_xml in positive_footnotes(footnotes):
            all_notes.append((old_id + note_offset, renumber_ids(note_xml, note_offset)))
        note_offset = len(all_notes)

    final_doc = re.sub(
        r"<w:body>[\s\S]*?</w:body>",
        lambda _m: f"<w:body>{body}{section}</w:body>",
        base_doc,
        count=1,
    )
    notes_blob = "".join(note_xml for _note_id, note_xml in all_notes)
    final_foot = re.sub(
        r"(<w:footnote\b[^>]*w:id=\"1\"[\s\S]*)</w:footnotes>",
        "</w:footnotes>",
        base_foot,
    )
    first_positive = re.search(r'<w:footnote\b[^>]*w:id="1"', final_foot)
    if first_positive:
        final_foot = final_foot[:first_positive.start()] + "</w:footnotes>"
    final_foot = final_foot.replace("</w:footnotes>", notes_blob + "</w:footnotes>")

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    temp = DEST.with_suffix(".tmp.docx")
    with zipfile.ZipFile(SOURCES[0]) as src_zip, zipfile.ZipFile(temp, "w", zipfile.ZIP_DEFLATED) as out_zip:
        for item in src_zip.infolist():
            data = src_zip.read(item.filename)
            if item.filename == "word/document.xml":
                data = final_doc.encode("utf-8")
            elif item.filename == "word/footnotes.xml":
                data = final_foot.encode("utf-8")
            elif item.filename == "docProps/core.xml":
                core = data.decode("utf-8")
                core = re.sub(r"<dc:title>[\s\S]*?</dc:title>", "<dc:title>Questions sur l’Heptateuque</dc:title>", core)
                data = core.encode("utf-8")
            out_zip.writestr(item, data)
    shutil.move(temp, DEST)

    refs = [int(x) for x in re.findall(r'<w:footnoteReference\b[^>]*w:id="(\d+)"', final_doc)]
    defs = [note_id for note_id, _xml in all_notes]
    headings1 = len(re.findall(r'<w:pStyle\b[^>]*w:val="Heading1"', final_doc))
    headings2 = len(re.findall(r'<w:pStyle\b[^>]*w:val="Heading2"', final_doc))
    stats = {
        "headings1": headings1,
        "headings2": headings2,
        "footnote_refs": len(refs),
        "footnote_defs": len(defs),
        "sha256": hashlib.sha256(DEST.read_bytes()).hexdigest(),
    }
    if headings1 != 7 or headings2 != 653:
        raise RuntimeError(f"Hiérarchie inattendue: {stats}")
    if refs != list(range(1, 901)) or defs != list(range(1, 901)):
        raise RuntimeError("Les 900 notes ne forment pas une suite exacte 1–900")
    if "DRAFT de relecture" in final_doc:
        raise RuntimeError("Une notice DRAFT subsiste")
    return DEST, stats


if __name__ == "__main__":
    try:
        path, stats = build()
    except Exception as exc:
        print(f"ERREUR: {exc}", file=sys.stderr)
        raise
    print(path)
    print(stats)
