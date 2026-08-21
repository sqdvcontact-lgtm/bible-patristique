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
        p
        for p in root.xpath("//w:body/w:p", namespaces=NS)
        if paragraph_text(p).startswith(start)
    ]
    if len(matches) != 1:
        raise RuntimeError(f"Paragraphe introuvable ou ambigu : {start!r} ({len(matches)})")
    return matches[0]


def make_text_run(text: str) -> etree._Element:
    run = etree.Element(qn("r"))
    node = etree.SubElement(run, qn("t"))
    if text.startswith(" ") or text.endswith(" "):
        node.set(f"{{{XML}}}space", "preserve")
    node.text = text
    return run


def make_note_reference(note_id: int) -> etree._Element:
    run = etree.Element(qn("r"))
    rpr = etree.SubElement(run, qn("rPr"))
    style = etree.SubElement(rpr, qn("rStyle"))
    style.set(qn("val"), "FootnoteReference")
    ref = etree.SubElement(run, qn("footnoteReference"))
    ref.set(qn("id"), str(note_id))
    return run


def insert_note_after_text(paragraph: etree._Element, anchor: str, note_id: int) -> None:
    full = paragraph_text(paragraph)
    start = full.find(anchor)
    if start < 0 or full.find(anchor, start + 1) >= 0:
        raise RuntimeError(f"Ancre introuvable ou ambiguë : {anchor!r}")
    target = start + len(anchor)
    cursor = 0
    for text_node in paragraph.xpath(".//w:t", namespaces=NS):
        value = text_node.text or ""
        next_cursor = cursor + len(value)
        if cursor <= target <= next_cursor:
            offset = target - cursor
            parent_run = text_node.getparent()
            if parent_run.tag != qn("r") or len(parent_run.xpath("./w:t", namespaces=NS)) != 1:
                raise RuntimeError(f"Structure de run non prise en charge pour {anchor!r}")
            before, after = value[:offset], value[offset:]
            text_node.text = before
            if before.startswith(" ") or before.endswith(" "):
                text_node.set(f"{{{XML}}}space", "preserve")
            elif f"{{{XML}}}space" in text_node.attrib:
                del text_node.attrib[f"{{{XML}}}space"]
            parent = parent_run.getparent()
            pos = parent.index(parent_run) + 1
            parent.insert(pos, make_note_reference(note_id))
            if after:
                after_run = copy.deepcopy(parent_run)
                after_node = after_run.xpath("./w:t", namespaces=NS)[0]
                after_node.text = after
                if after.startswith(" ") or after.endswith(" "):
                    after_node.set(f"{{{XML}}}space", "preserve")
                elif f"{{{XML}}}space" in after_node.attrib:
                    del after_node.attrib[f"{{{XML}}}space"]
                parent.insert(pos + 1, after_run)
            return
        cursor = next_cursor
    raise RuntimeError(f"Impossible d'insérer la note après {anchor!r}")


def set_note_text(footnotes: etree._Element, note_id: int, text: str) -> None:
    notes = footnotes.xpath(f'//w:footnote[@w:id="{note_id}"]', namespaces=NS)
    if len(notes) != 1:
        raise RuntimeError(f"Note {note_id} introuvable")
    text_nodes = notes[0].xpath(".//w:t", namespaces=NS)
    if not text_nodes:
        raise RuntimeError(f"Note {note_id} sans texte")
    text_nodes[-1].text = " " + text
    text_nodes[-1].set(f"{{{XML}}}space", "preserve")


def add_note(footnotes: etree._Element, template: etree._Element, note_id: int, text: str) -> None:
    if footnotes.xpath(f'//w:footnote[@w:id="{note_id}"]', namespaces=NS):
        raise RuntimeError(f"Identifiant de note déjà utilisé : {note_id}")
    note = copy.deepcopy(template)
    note.set(qn("id"), str(note_id))
    text_nodes = note.xpath(".//w:t", namespaces=NS)
    text_nodes[-1].text = " " + text
    text_nodes[-1].set(f"{{{XML}}}space", "preserve")
    footnotes.append(note)


def write_docx(source: Path, target: Path) -> None:
    with ZipFile(source, "r") as zin:
        entries = [(item, zin.read(item.filename)) for item in zin.infolist()]

    data = dict((item.filename, payload) for item, payload in entries)
    document = etree.fromstring(data["word/document.xml"])
    footnotes = etree.fromstring(data["word/footnotes.xml"])

    # Deux références imprimées avaient été omises ou remplacées.
    set_note_text(footnotes, 1, "Luc. 1. v. 17.")
    set_note_text(footnotes, 11, "1. Cor. 10. 12.")

    template = footnotes.xpath('//w:footnote[@w:id="1"]', namespaces=NS)[0]
    additions = {
        16: "Gen. c. 2. v. 21.",
        17: "1. Pet. 2. 11.",
        18: "S. Clement Pape.",
        19: "S. Gregoire Thaumaturge.",
        20: "S. Gregoire de Nazianze & S. Bazile le grand.",
        21: "S. Paulin Evesque de Nole.",
        22: "Hilaire & Petrone.",
    }
    for note_id, text in additions.items():
        add_note(footnotes, template, note_id, text)

    insert_note_after_text(
        find_paragraph(document, "8. Il n’y a point"),
        "la terre d’où elle a tiré son origine",
        16,
    )
    insert_note_after_text(find_paragraph(document, "32. Clement"), "Clement", 18)
    insert_note_after_text(find_paragraph(document, "33. Gregoire"), "Gregoire", 19)
    insert_note_after_text(find_paragraph(document, "34. Un autre Saint"), "Bazile son amy", 20)
    insert_note_after_text(find_paragraph(document, "35. Paulin"), "Paulin", 21)
    insert_note_after_text(find_paragraph(document, "36. Hilaire"), "Hilaire & Petrone", 22)

    # Coquille OCR rendue certaine par la page imprimée 38 du fac-similé.
    p27 = find_paragraph(document, "27. Aprés avoir parlé")
    # L'appel de note coupe la phrase après « venir » dans l'OOXML.
    old = " le fils de nostre consolation."
    new = " la fin de nostre course."
    changed = 0
    for text_node in p27.xpath(".//w:t", namespaces=NS):
        if old in (text_node.text or ""):
            text_node.text = text_node.text.replace(old, new)
            changed += 1
    if changed != 1:
        raise RuntimeError(f"Correction du § 27 non appliquée exactement une fois ({changed})")

    # Complément des §§ 48-50 : le premier fac-similé sautait ce cahier.
    p48 = find_paragraph(document, "48. Mais il faut reprendre")
    for run in list(p48.xpath("./w:r", namespaces=NS)):
        if not "".join(run.xpath(".//w:t/text()", namespaces=NS)) and not run.xpath(
            ".//w:footnoteReference", namespaces=NS
        ):
            p48.remove(run)

    p48.append(
        make_text_run(
            " point le monde, dit saint Jean ; ni ce qui est dans le monde, parce que leurs "
            "fausses couleurs nous éblouïssent & nous trompent. Les yeux nous estant donnez "
            "pour connoistre la verité par le moyen de la lumiere & nous en servir aux usages "
            "de la vie, ils ne doivent pas nous estre une cause de mort en nous faisant tomber "
            "dans l’erreur. Les passions charnelles, comme le dit si veritablement l’Apostre "
            "S. Pierre, combattent contre l’ame"
        )
    )
    p48.append(make_note_reference(17))
    p48.append(
        make_text_run(
            ", elles conspirent toutes à nostre perte ; elles veillent continuellement pour nous "
            "surprendre, & se fortifient d’autant plus qu’elles nous affoiblissent."
        )
    )

    p49_text = (
        "49. J’ay parlé jusques icy des honneurs, des richesses, & des autres attraits dont le "
        "siecle se sert ainsi que d’autant de pieges pour nous faire tomber dans ses filets, "
        "comme s’il avoit encore pour nous surprendre les mesmes charmes qu’autrefois. Mais "
        "l’image de ces faux biens & de ces faux plaisirs qui nous le rendoient agreable s’est "
        "évanouïe : & s’il ne pouvoit nous tromper par un éclat qui avoit quelque chose de réel ; "
        "comment le pourroit-il maintenant qu’il a perdu cet éclat ? Il n’avoit point alors de "
        "biens solides & durables : & il n’en a pas seulement aujourd’huy de fragiles & de "
        "passagers. Rien n’y est beau mesme pour un temps. Et ainsi si nous ne voulons nous "
        "tromper nous-mesmes ; il est incapable de nous tromper."
    )
    p49 = etree.Element(qn("p"))
    ppr = p48.find(qn("pPr"))
    if ppr is not None:
        p49.append(copy.deepcopy(ppr))
    p49.append(make_text_run(p49_text))
    p48.addnext(p49)

    p50 = p49.getnext()
    if p50 is None or not paragraph_text(p50).startswith("à sa fin."):
        raise RuntimeError("Le début conservé du § 50 n’a pas été retrouvé")
    first_text = p50.xpath(".//w:t", namespaces=NS)[0]
    first_text.text = (
        "50. Mais ce qui me reste à dire est encore beaucoup plus fort. Je n’ay parlé que du "
        "peu de fondement que l’on doit faire sur les biens du monde ; & l’on peut dire que le "
        "monde mesme tend "
        + (first_text.text or "")
    )

    data["word/document.xml"] = etree.tostring(
        document, xml_declaration=True, encoding="UTF-8", standalone="yes"
    )
    data["word/footnotes.xml"] = etree.tostring(
        footnotes, xml_declaration=True, encoding="UTF-8", standalone="yes"
    )

    target.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(target, "w", ZIP_DEFLATED) as zout:
        for item, payload in entries:
            info = ZipInfo(item.filename, item.date_time)
            info.compress_type = ZIP_DEFLATED
            info.comment = item.comment
            info.extra = item.extra
            info.create_system = item.create_system
            info.external_attr = item.external_attr
            info.internal_attr = item.internal_attr
            info.flag_bits = item.flag_bits
            zout.writestr(info, data[item.filename])


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: completer_eucher_docx.py SOURCE.docx CIBLE.docx")
    write_docx(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
