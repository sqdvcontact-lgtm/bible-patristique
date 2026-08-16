from __future__ import annotations

import argparse
import hashlib
import io
import json
import zipfile
from pathlib import Path

from lxml import etree


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"
NS = {"w": W_NS}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def paragraph_text(paragraph: etree._Element) -> str:
    return "".join(node.text or "" for node in paragraph.xpath(".//w:t", namespaces=NS))


def patch_document_xml(xml_bytes: bytes) -> tuple[bytes, dict[str, object]]:
    parser = etree.XMLParser(remove_blank_text=False)
    root = etree.fromstring(xml_bytes, parser)

    text_replacements = 0
    for text_node in root.xpath("//w:t[contains(text(), 'inso¬')]", namespaces=NS):
        before = text_node.text or ""
        after = before.replace("inso¬", "insolence.")
        text_replacements += before.count("inso¬")
        text_node.text = after

    removed_paragraphs = 0
    for paragraph in list(root.xpath("//w:body/w:p", namespaces=NS)):
        if paragraph_text(paragraph).strip() != "PRO":
            continue
        style = paragraph.xpath("./w:pPr/w:pStyle/@w:val", namespaces=NS)
        if not style or style[0] not in {"Versancien", "VersAncien", "Vers ancien"}:
            raise RuntimeError(f"Paragraphe PRO inattendu, style={style!r}")
        paragraph.getparent().remove(paragraph)
        removed_paragraphs += 1

    if text_replacements != 1:
        raise RuntimeError(f"Une occurrence inso¬ attendue, {text_replacements} remplacée(s).")
    if removed_paragraphs != 1:
        raise RuntimeError(f"Un paragraphe PRO attendu, {removed_paragraphs} supprimé(s).")

    output = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone="yes")
    visible_text = "".join(root.xpath("//w:t/text()", namespaces=NS))
    if "¬" in visible_text:
        raise RuntimeError("Le caractère ¬ subsiste dans le corps Word.")
    if any(paragraph_text(p).strip() == "PRO" for p in root.xpath("//w:body/w:p", namespaces=NS)):
        raise RuntimeError("Le faux vers PRO subsiste dans le corps Word.")
    if "brauons son insolence." not in visible_text:
        raise RuntimeError("La correction insolence. n’est pas présente dans le Word.")

    return output, {
        "text_replacements": text_replacements,
        "removed_false_verse_paragraphs": removed_paragraphs,
        "remaining_not_sign_count": visible_text.count("¬"),
        "remaining_exact_pro_paragraph_count": 0,
        "insolence_present": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    source_bytes = args.source.resolve().read_bytes()
    buffer = io.BytesIO()
    patch_report: dict[str, object] | None = None
    with zipfile.ZipFile(io.BytesIO(source_bytes), "r") as archive_in, zipfile.ZipFile(buffer, "w") as archive_out:
        for item in archive_in.infolist():
            data = archive_in.read(item.filename)
            if item.filename == "word/document.xml":
                data, patch_report = patch_document_xml(data)
            archive_out.writestr(item, data)

    if patch_report is None:
        raise RuntimeError("word/document.xml absent du DOCX.")

    output_bytes = buffer.getvalue()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(output_bytes)
    report = {
        "status": "PASS",
        "source_file": args.source.name,
        "source_sha256": sha256_bytes(source_bytes),
        "output_file": args.output.name,
        "output_sha256": sha256_bytes(output_bytes),
        "patch": patch_report,
        "preservation": "Tous les composants OOXML autres que word/document.xml sont recopiés sans modification.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
