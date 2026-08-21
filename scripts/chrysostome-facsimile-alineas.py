"""Relève les premières lignes en retrait dans le fac-similé Google Books.

Produit un cache JSON de candidats matériels. Aucune écriture en base.
"""
import json
import math
import re
import statistics
import sys
from pathlib import Path

import pdfplumber

pdf = Path(sys.argv[1])
sortie = Path(sys.argv[2])
candidats = []


def lignes(page):
    mots = page.extract_words(x_tolerance=2, y_tolerance=3, keep_blank_chars=False)
    groupes = []
    for mot in sorted(mots, key=lambda m: float(m["top"])):
        top = float(mot["top"])
        groupe = next((g for g in reversed(groupes) if abs(top - g[0]) <= 6), None)
        if groupe is None:
            groupe = [top, []]
            groupes.append(groupe)
        groupe[1].append(mot)
        groupe[0] = statistics.median(float(m["top"]) for m in groupe[1])
    resultat = []
    for top, groupe in groupes:
        groupe.sort(key=lambda m: float(m["x0"]))
        resultat.append({
            "top": round(top, 1),
            "x0": float(groupe[0]["x0"]),
            "texte": " ".join(m["text"] for m in groupe),
        })
    return resultat


with pdfplumber.open(pdf) as doc:
    for numero_pdf, page in enumerate(doc.pages, 1):
        if numero_pdf < 8 or numero_pdf > 441:
            continue
        ls = [l for l in lignes(page) if 54 <= l["top"] <= 570 and 45 <= l["x0"] <= 180]
        if len(ls) < 5:
            continue
        # Le corps est justifié : son bord gauche forme le groupe x0 dominant.
        classes = {}
        for l in ls:
            cle = round(l["x0"] / 3) * 3
            classes[cle] = classes.get(cle, 0) + 1
        base = max(classes, key=lambda x: classes[x])
        for i, l in enumerate(ls):
            retrait = l["x0"] - base
            texte = l["texte"].strip()
            # 11 pt tolère l'inclinaison des scans tout en séparant les retraits de 15-20 pt.
            if retrait >= 11 and len(re.sub(r"\W", "", texte)) >= 4:
                candidats.append({
                    "page_pdf": numero_pdf,
                    "page_imprimee": numero_pdf - 29 if numero_pdf >= 30 else None,
                    "top": l["top"],
                    "x0": round(l["x0"], 1),
                    "base": base,
                    "retrait": round(retrait, 1),
                    "texte": texte,
                })

sortie.parent.mkdir(parents=True, exist_ok=True)
sortie.write_text(json.dumps(candidats, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{len(candidats)} premières lignes en retrait relevées dans {sortie}")
