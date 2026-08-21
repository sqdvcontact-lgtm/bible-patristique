import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = Path(r"C:\Corpus Scriptura\Sources\Basile\Basile_Homelies_discours_lettres_Auger_Lyon_1827.pdf")
BACKUP = ROOT / "audit" / "hexameron-2026-07-30" / "before.json"
OUT = ROOT / "audit" / "hexameron-2026-07-30" / "pdf-db-comparison.json"

HOMILIES = [
    ("Première homélie", 385, 403),
    ("Deuxième homélie", 404, 422),
    ("Troisième homélie", 423, 442),
    ("Quatrième homélie", 443, 456),
    ("Cinquième homélie", 457, 474),
    ("Sixième homélie", 475, 500),
    ("Septième homélie", 501, 516),
    ("Huitième homélie", 517, 537),
    ("Neuvième homélie", 538, 555),
    ("Dixième homélie (apocryphe)", 556, 583),
]

WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:[’'][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*")


def sans_accents(value):
    return "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")


def cle(value):
    value = sans_accents(value.lower().replace("’", "'")).replace("æ", "ae").replace("œ", "oe")
    return value


def equivalence_ancienne(source, moderne):
    """N'accepte que des transformations graphiques attestées au XIXe siècle."""
    candidats = {source}
    for valeur in list(candidats):
        candidats.add(re.sub(r"oient$", "aient", valeur))
        candidats.add(re.sub(r"oit$", "ait", valeur))
        candidats.add(re.sub(r"ois$", "ais", valeur))
        candidats.add(re.sub(r"emens$", "ements", valeur))
        candidats.add(re.sub(r"ans$", "ants", valeur))
        candidats.add(re.sub(r"tems$", "temps", valeur))
        candidats.add(valeur.replace("connoi", "connai"))
        candidats.add(valeur.replace("foibl", "faibl"))
        candidats.add(valeur.replace("paroi", "parai"))
        candidats.add(valeur.replace("payement", "paiement"))
    # Une deuxième composition couvre reconnoît, s'affoiblissait, etc.
    for valeur in list(candidats):
        candidats.add(re.sub(r"oient$", "aient", valeur))
        candidats.add(re.sub(r"oit$", "ait", valeur))
        candidats.add(re.sub(r"ois$", "ais", valeur))
        candidats.add(re.sub(r"emens$", "ements", valeur))
        candidats.add(re.sub(r"ans$", "ants", valeur))
        candidats.add(valeur.replace("connoi", "connai"))
        candidats.add(valeur.replace("foibl", "faibl"))
        candidats.add(valeur.replace("paroi", "parai"))
    return moderne in candidats and source != moderne


def page_tokens(reader, page_number):
    raw = reader.pages[page_number - 1].extract_text() or ""
    raw = raw.replace("\xad", "")
    raw = re.sub(r"(?<=[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ])-\s+(?=[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ])", "", raw)
    return [{"word": m.group(0), "key": cle(m.group(0)), "page": page_number} for m in WORD_RE.finditer(raw)]


def db_tokens(segments):
    rows = []
    for segment in segments:
        text = re.sub(r"\[\[\d+\]\]", "", segment.get("segment_texte") or "")
        for token_index, match in enumerate(WORD_RE.finditer(text)):
            rows.append({
                "word": match.group(0),
                "key": cle(match.group(0)),
                "segment_numero": segment["segment_numero"],
                "token_index": token_index,
                "start": match.start(),
                "end": match.end(),
            })
    return rows


payload = json.loads(BACKUP.read_text(encoding="utf-8"))
segments = payload["segments"]
reader = PdfReader(str(PDF))
report = {"pdf": str(PDF), "homilies": []}

# Première passe : apprendre seulement les couples univoques qui répondent aux
# transformations graphiques ci-dessus. On itère, car un couple nouvellement
# reconnu rétablit parfois l'alignement du couple voisin.
prepared = []
for name, first_page, last_page in HOMILIES:
    source = []
    for page in range(first_page, last_page + 1):
        source.extend(page_tokens(reader, page))
    body_segments = [s for s in segments if s.get("ref_niv1") == name]
    prepared.append((name, first_page, last_page, source, db_tokens(body_segments), body_segments))

learned = {}
for _ in range(8):
    additions = 0
    for _, _, _, source, target, _ in prepared:
        source_keys = [learned.get(t["key"], t["key"]) for t in source]
        matcher = SequenceMatcher(None, source_keys, [t["key"] for t in target], autojunk=False)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "replace" and i2 - i1 == 1 and j2 - j1 == 1:
                skey, dkey = source[i1]["key"], target[j1]["key"]
                if skey not in learned and equivalence_ancienne(skey, dkey):
                    learned[skey] = dkey
                    additions += 1
    if additions == 0:
        break

for name, first_page, last_page, source, target, body_segments in prepared:
    matcher = SequenceMatcher(None, [learned.get(t["key"], t["key"]) for t in source], [t["key"] for t in target], autojunk=False)
    opcodes = matcher.get_opcodes()
    anomalies = []
    equal = 0
    graphies = []
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == "equal":
            equal += i2 - i1
            for source_token, db_token in zip(source[i1:i2], target[j1:j2]):
                if source_token["key"] in learned and source_token["word"] != db_token["word"]:
                    graphies.append({
                        "page": source_token["page"],
                        "segment_numero": db_token["segment_numero"],
                        "token_index": db_token["token_index"],
                        "source": source_token["word"],
                        "database": db_token["word"],
                        "start": db_token["start"],
                        "end": db_token["end"],
                    })
            continue
        left = source[i1:i2]
        right = target[j1:j2]
        anomalies.append({
            "tag": tag,
            "source_pages": sorted({x["page"] for x in left}),
            "segments": sorted({x["segment_numero"] for x in right}),
            "source": " ".join(x["word"] for x in left),
            "database": " ".join(x["word"] for x in right),
            "source_count": len(left),
            "database_count": len(right),
        })
    report["homilies"].append({
        "name": name,
        "pdf_pages": [first_page, last_page],
        "source_tokens": len(source),
        "database_tokens": len(target),
        "equal_tokens": equal,
        "ratio": matcher.ratio(),
        "graphies_anciennes": graphies,
        "anomalies": anomalies,
    })

report["equivalences_apprises"] = learned
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "out": str(OUT),
    "homilies": [{
        "name": h["name"],
        "ratio": round(h["ratio"], 4),
        "source_tokens": h["source_tokens"],
        "database_tokens": h["database_tokens"],
        "anomalies": len(h["anomalies"]),
        "graphies_anciennes": len(h["graphies_anciennes"]),
    } for h in report["homilies"]],
    "equivalences_apprises": len(learned),
}, ensure_ascii=False, indent=2))
