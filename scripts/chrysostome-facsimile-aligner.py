"""Aligne les retraits matériels du PDF avec les débuts de segments du corpus."""
import json
import re
import sys
import unicodedata
from pathlib import Path
from rapidfuzz import fuzz, process


def norm(s):
    s = str(s or "").replace("ſ", "s").replace("’", "'")
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


segments = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
candidats = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
sortie = Path(sys.argv[3])
prefixes = [norm(s["segment_texte"]) for s in segments]
alignes = []

plages = [
    (10, 13, {"Épître dédicatoire"}),
    (14, 19, {"Avertissement historique"}),
    (27, 29, {"Préface du traducteur", "Approbation", "Privilège du roi"}),
]
debuts_homelies = [30,55,79,102,118,142,162,174,184,198,213,226,242,254,270,284,301,316,331,347,365,382,409,426,442]
for numero in range(1, 25):
    romains = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV"]
    plages.append((debuts_homelies[numero-1], debuts_homelies[numero]-1, {f"Homélie {romains[numero-1]}"}))

for no, c in enumerate(candidats):
    n = norm(c["texte"])[:110]
    if len(n) < 12:
        continue
    divisions = next((d for p1, p2, d in plages if p1 <= c["page_pdf"] <= p2), None)
    if not divisions:
        continue
    choix = {i: p for i, p in enumerate(prefixes) if segments[i]["ref_niv1"] in divisions}
    meilleurs = process.extract(n, choix, scorer=fuzz.partial_ratio, limit=2, score_cutoff=0)
    _, score, i = meilleurs[0]
    second = meilleurs[1][1] if len(meilleurs) > 1 else 0
    score /= 100
    second /= 100
    emplacement = fuzz.partial_ratio_alignment(n, prefixes[i])
    alignes.append({
        **c,
        "segment_numero": segments[i]["segment_numero"],
        "segment_debut": segments[i]["segment_texte"][:160],
        "score": round(score, 4),
        "ecart_second": round(score - second, 4),
        "debut_normalise": emplacement.dest_start,
    })

sortie.write_text(json.dumps(alignes, ensure_ascii=False, indent=2), encoding="utf-8")
for seuil in (0.60, 0.70, 0.75, 0.80, 0.85, 0.90):
    bons = [x for x in alignes if x["score"] >= seuil]
    uniques = len({x["segment_numero"] for x in bons})
    print(f">={seuil:.2f}: {len(bons)} candidats, {uniques} segments uniques")
