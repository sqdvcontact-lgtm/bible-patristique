import json
import random
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader
from rapidfuzz import fuzz

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "audit/hexameron-2026-07-30/final-complete"
PDF = Path(r"C:\Corpus Scriptura\Sources\Basile\Basile_Homelies_discours_lettres_Auger_Lyon_1827.pdf")
OUT = ROOT / "audit/hexameron-2026-07-30/random-facsimile-check.json"
SEED = 20260730
MANUAL_REVIEWS = {
    805: "Confirmé visuellement sur la page PDF 480 : la fin du segment correspond exactement au haut de la page ; le début se trouve sur la page précédente.",
}

RANGES = {
    "Première homélie": (385, 403),
    "Deuxième homélie": (404, 422),
    "Troisième homélie": (423, 442),
    "Quatrième homélie": (443, 456),
    "Cinquième homélie": (457, 474),
    "Sixième homélie": (475, 500),
    "Septième homélie": (501, 516),
    "Huitième homélie": (517, 537),
    "Neuvième homélie": (538, 555),
    "Dixième homélie (attribution discutée)": (556, 583),
}


def normalize(value: str) -> str:
    value = value.replace("\xad", "")
    value = re.sub(r"-\s*\n\s*", "", value)
    value = unicodedata.normalize("NFD", value)
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    value = value.lower().replace("œ", "oe").replace("æ", "ae")
    value = re.sub(r"\[\[\d+\]\]", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
body = [row for row in snapshot["segments"] if row["nature"] in {"texte", "citation"}]
reader = PdfReader(str(PDF))
page_text = {
    page: normalize(reader.pages[page - 1].extract_text() or "")
    for start, end in RANGES.values()
    for page in range(start, end + 1)
}

rng = random.Random(SEED)
sample = []
for homily, (start, end) in RANGES.items():
    candidates = [
        row for row in body
        if row["ref_niv1"] == homily and 90 <= len(row["segment_texte"]) <= 900
    ]
    chosen = sorted(rng.sample(candidates, 3), key=lambda row: row["segment_numero"])
    for row in chosen:
        needle = normalize(row["segment_texte"])
        ranked = sorted(
            ((fuzz.partial_ratio(needle, page_text[page]), page) for page in range(start, end + 1)),
            reverse=True,
        )
        score, page = ranked[0]
        sample.append({
            "homily": homily,
            "segment_numero": row["segment_numero"],
            "paragraph": row["paragraphe"],
            "rank": row["rang"],
            "pdf_page": page,
            "score": round(score, 2),
            "text": row["segment_texte"],
            "status": "strong" if score >= 88 else "review" if score >= 72 else "weak",
        })

report = {
    "seed": SEED,
    "sample_size": len(sample),
    "method": "3 segments par homélie, longueur 90–900 caractères; meilleure concordance OCR dans la plage du fac-similé",
    "thresholds": {"strong": ">=88", "review": "72–87.99", "weak": "<72"},
    "counts": {
        status: sum(row["status"] == status for row in sample)
        for status in ("strong", "review", "weak")
    },
    "manual_reviews": [
        {"segment_numero": segment, "result": result}
        for segment, result in MANUAL_REVIEWS.items()
    ],
    "passed": not any(row["status"] == "weak" for row in sample)
    and all(row["segment_numero"] in MANUAL_REVIEWS for row in sample if row["status"] == "review"),
    "sample": sample,
}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "out": str(OUT),
    "seed": SEED,
    "sample_size": len(sample),
    "counts": report["counts"],
    "passed": report["passed"],
    "to_review": [
        {"segment": row["segment_numero"], "page": row["pdf_page"], "score": row["score"]}
        for row in sample if row["status"] != "strong"
    ],
}, ensure_ascii=False, indent=2))
