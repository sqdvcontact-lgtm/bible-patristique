import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit" / "hexameron-2026-07-30"
BEFORE = json.loads((AUDIT / "before.json").read_text(encoding="utf-8"))
COMPARISON = json.loads((AUDIT / "pdf-db-comparison.json").read_text(encoding="utf-8"))
OUT = AUDIT / "orthography-proposal.json"
WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:[’'][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*")

segments = {s["segment_numero"]: s for s in BEFORE["segments"]}
changes = defaultdict(list)
pages = Counter()
homilies = Counter()
source_forms = defaultdict(Counter)


def cle(value):
    value = "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")
    return value.lower().replace("’", "'").replace("æ", "ae").replace("œ", "oe")

for homily in COMPARISON["homilies"]:
    for item in homily["graphies_anciennes"]:
        normalized = item["source"].replace("'", "’")
        changes[item["segment_numero"]].append({**item, "source": normalized})
        source_forms[cle(normalized)][normalized.lower()] += 1
        pages[item["page"]] += 1
        homilies[homily["name"]] += 1

rows = []
pair_counts = Counter()
reverse = defaultdict(list)
for source_key, database_key in COMPARISON["equivalences_apprises"].items():
    reverse[database_key].append(source_key)


def forme_source(database_word):
    database_key = cle(database_word)
    candidates = reverse.get(database_key, [])
    if not candidates:
        return None
    source_key = max(candidates, key=lambda key: sum(source_forms[key].values()))
    formes = {database_word}
    for _ in range(2):
        for value in list(formes):
            formes.add(re.sub(r"aient$", "oient", value, flags=re.IGNORECASE))
            formes.add(re.sub(r"ait$", "oit", value, flags=re.IGNORECASE))
            formes.add(re.sub(r"ais$", "ois", value, flags=re.IGNORECASE))
            formes.add(re.sub(r"ements$", "emens", value, flags=re.IGNORECASE))
            formes.add(re.sub(r"ants$", "ans", value, flags=re.IGNORECASE))
            formes.add(re.sub(r"temps$", "tems", value, flags=re.IGNORECASE))
            formes.add(value.replace("conna", "conno").replace("Conna", "Conno"))
            formes.add(value.replace("faibl", "foibl").replace("Faibl", "Foibl"))
            formes.add(value.replace("para", "paro").replace("Para", "Paro"))
            formes.add(value.replace("paiement", "payement").replace("Paiement", "Payement"))
    matches = [value for value in formes if cle(value) == source_key]
    if not matches:
        return None
    return min(matches, key=lambda value: (value == database_word, len(value)))


for numero, segment in sorted(segments.items()):
    before = segments[numero]["segment_texte"]
    tokens = list(WORD_RE.finditer(before))
    replacement_by_index = {}
    for idx, token in enumerate(tokens):
        source = forme_source(token.group(0))
        if source and source != token.group(0) and cle(source) != cle(token.group(0)):
            replacement_by_index[idx] = source
            pair_counts[(token.group(0), source)] += 1

    pieces = []
    cursor = 0
    for idx, token in enumerate(tokens):
        pieces.append(before[cursor:token.start()])
        pieces.append(replacement_by_index.get(idx, token.group(0)))
        cursor = token.end()
    pieces.append(before[cursor:])
    after = "".join(pieces)
    if after == before:
        continue
    if re.findall(r"\[\[\d+\]\]", before) != re.findall(r"\[\[\d+\]\]", after):
        raise RuntimeError(f"Segment {numero}: les appels de notes ont changé")
    rows.append({
        "id": segments[numero]["id"],
        "segment_numero": numero,
        "before": before,
        "after": after,
        "replacements": len(replacement_by_index),
        "pages": sorted({item["page"] for item in changes.get(numero, [])}),
    })

payload = {
    "source": COMPARISON["pdf"],
    "segments_modifies": len(rows),
    "remplacements": sum(r["replacements"] for r in rows),
    "par_homelie": dict(homilies),
    "par_page": dict(sorted(pages.items())),
    "paires": [{"database": a, "source": b, "count": n} for (a, b), n in pair_counts.most_common()],
    "rows": rows,
}
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: payload[k] for k in ("segments_modifies", "remplacements", "par_homelie")}, ensure_ascii=False, indent=2))
print(OUT)
