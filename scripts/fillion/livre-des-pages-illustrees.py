# -*- coding: utf-8 -*-
"""Le livre de chaque page se lit dans son TITRE COURANT.

⛔ La page IMPRIMÉE ne suffit pas : le tome I et le tome VII partagent les mêmes
numéros, si bien qu'une page 211 est aussi bien la Genèse que saint Marc. Fillion
imprime en revanche un titre courant — « S. MARC, IV, 19-27. » — et c'est lui qui
tranche, page par page, sans supposer aucune frontière de livre.

⚠️ L'OCR de ces titres est médiocre (« MATTEI », « O. JEAN ») : les motifs tolèrent
les espaces parasites, et ce qui reste illisible se comble par la CONTINUITÉ — une
page entourée de deux pages du même livre lui appartient, jamais au delà.
"""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
OCR = RACINE / "tmp" / "pdfs" / "fillion" / "lasaintebibletex07fill_djvu.xml"
AUDIT = RACINE / "tmp" / "pdfs" / "fillion" / "overnight-illustration-audit-60dpi"

E = r"[\s.,]*"          # l'OCR sème des espaces et des points dans les titres
LIVRES = [
    (rf"M{E}A{E}T{E}T", "MAT"),
    (rf"M{E}A{E}R{E}C", "MRK"),
    (rf"L{E}U{E}C\b", "LUK"),
    (rf"J{E}E{E}A{E}N", "JHN"),
    (rf"A{E}C{E}T{E}E{E}S", "ACT"),
]

pages = sorted(int(re.search(r"(\d+)\.jpg$", f.name).group(1)) for f in AUDIT.glob("*.jpg"))
voulues = {p + 1 for p in pages}          # feuillet -> page OCR
titres = {}

courant = 0
for _ev, el in ET.iterparse(OCR, events=("end",)):
    if el.tag != "OBJECT":
        continue
    courant += 1
    if courant in voulues:
        hauteur = int(el.attrib.get("height", "0"))
        mots = []
        for m in el.iter("WORD"):
            c = m.attrib.get("coords", "").split(",")
            if len(c) == 4 and min(int(c[1]), int(c[3])) < hauteur * 0.06:
                mots.append(m.text or "")
        titres[courant - 1] = " ".join(mots).upper()
    el.clear()
    if courant > max(voulues):
        break

sortie = []
for f in pages:
    t = titres.get(f, "")
    livre = "?"
    for motif, code in LIVRES:
        if re.search(motif, t):
            livre = code
            break
    sortie.append({"feuillet": f, "page": f - 2, "livre": livre, "titre": t[:70]})

# La continuité : on ne comble qu'entre deux pages du MÊME livre.
connus = [i for i, x in enumerate(sortie) if x["livre"] != "?"]
for i, x in enumerate(sortie):
    if x["livre"] != "?":
        continue
    av = [j for j in connus if j < i]
    ap = [j for j in connus if j > i]
    g = sortie[av[-1]]["livre"] if av else None
    d = sortie[ap[0]]["livre"] if ap else None
    if g and g == d:
        x["livre"] = g
        x["livre_deduit"] = True

compte = {}
for x in sortie:
    compte[x["livre"]] = compte.get(x["livre"], 0) + 1
print("par livre :", compte)
print("lus au titre :", sum(1 for x in sortie if x["livre"] != "?" and not x.get("livre_deduit")))
print("déduits      :", sum(1 for x in sortie if x.get("livre_deduit")))
print("indécis      :", compte.get("?", 0))

(RACINE / "work" / "fillion" / "COLLECTE_TOME_VII_PAGES.json").write_text(
    json.dumps(sortie, ensure_ascii=False, indent=1), encoding="utf-8")
print("écrit · 191 pages")
