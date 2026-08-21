from __future__ import annotations

import copy
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from lxml import etree


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML = "http://www.w3.org/XML/1998/namespace"
NS = {"w": W}


def qn(local: str) -> str:
    return f"{{{W}}}{local}"


def paragraph_text(paragraph: etree._Element) -> str:
    return "".join(paragraph.xpath(".//w:t/text()", namespaces=NS))


def find_paragraph(root: etree._Element, start: str) -> etree._Element:
    matches = [
        paragraph
        for paragraph in root.xpath("//w:body/w:p", namespaces=NS)
        if paragraph_text(paragraph).startswith(start)
    ]
    if len(matches) != 1:
        raise RuntimeError(f"Paragraphe introuvable ou ambigu : {start!r} ({len(matches)})")
    return matches[0]


def text_run(text: str) -> etree._Element:
    run = etree.Element(qn("r"))
    node = etree.SubElement(run, qn("t"))
    if text.startswith(" ") or text.endswith(" "):
        node.set(f"{{{XML}}}space", "preserve")
    node.text = text
    return run


def replace_text(paragraph: etree._Element, text: str) -> None:
    for child in list(paragraph):
        if child.tag != qn("pPr"):
            paragraph.remove(child)
    paragraph.append(text_run(text))


def paragraph_like(model: etree._Element, text: str) -> etree._Element:
    paragraph = etree.Element(qn("p"))
    properties = model.find(qn("pPr"))
    if properties is not None:
        paragraph.append(copy.deepcopy(properties))
    paragraph.append(text_run(text))
    return paragraph


def write_docx(source: Path, target: Path) -> None:
    with ZipFile(source, "r") as archive:
        entries = [(item, archive.read(item.filename)) for item in archive.infolist()]
    data = {item.filename: payload for item, payload in entries}
    document = etree.fromstring(data["word/document.xml"])

    warning = find_paragraph(document, "Comme il est maintenant difficile")
    if not paragraph_text(warning).endswith("nostre Langue demande une"):
        raise RuntimeError("La lacune attendue à la fin de l’Avertissement n’a pas été retrouvée")
    replace_text(
        warning,
        paragraph_text(warning)
        + " tres-grande clarté. Rien ne sera plus aisé que de conferer l’un avec l’autre "
        + "par le moyen des chiffres que j’ay mis à chaque article du Latin & du François.",
    )
    warning.addnext(
        paragraph_like(
            warning,
            "Quoy que tout ce discours soit tres-élevé il y a quelques endroits si éclatans "
            "que j’ay crû à propos de les marquer à la marge par de doubles virgules, afin "
            "que l’on puisse sans peine les retrouver quand on voudra.",
        )
    )

    heading = find_paragraph(document, "DU MÉPRIS DU MONDE")
    replace_text(
        heading,
        "LETTRE DE S. EUCHER, EVESQUE DE LYON, À VALERE. SUR LE MÉPRIS DU MONDE",
    )

    first = find_paragraph(document, "ces deux causes se rencontrent")
    replace_text(
        first,
        "1. C’est une puissante liaison que celle que forment les liens du sang lorsqu’ils "
        "sont joints avec ceux de l’amitié. Ainsi nous avons sujet de nous réjouïr de la "
        "grace que Dieu nous fait de n’estre pas moins unis par la charité que par la "
        "proximité, & que pour serrer encore plus étroitement cet heureux nœud "
        + paragraph_text(first),
    )

    data["word/document.xml"] = etree.tostring(
        document, xml_declaration=True, encoding="UTF-8", standalone="yes"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for item, payload in entries:
            info = ZipInfo(item.filename, item.date_time)
            info.compress_type = ZIP_DEFLATED
            info.comment = item.comment
            info.extra = item.extra
            info.create_system = item.create_system
            info.external_attr = item.external_attr
            info.internal_attr = item.internal_attr
            info.flag_bits = item.flag_bits
            archive.writestr(info, data[item.filename])


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: reparer_eucher_debut_docx.py SOURCE.docx CIBLE.docx")
    write_docx(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
