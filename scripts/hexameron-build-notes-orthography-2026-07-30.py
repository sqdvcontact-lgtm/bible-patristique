from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit" / "hexameron-2026-07-30"
SNAPSHOT = json.loads((AUDIT / "after-greek-gaps.json").read_text(encoding="utf-8"))
COMPARISON = json.loads((AUDIT / "pdf-db-comparison.json").read_text(encoding="utf-8"))
OUTPUT = AUDIT / "notes-orthography-proposal.json"
WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:[’'][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*")


def key(value: str) -> str:
    value = value.lower().replace("’", "'").replace("œ", "oe").replace("æ", "ae")
    return "".join(c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn")


source_forms: dict[str, Counter[str]] = defaultdict(Counter)
reverse: dict[str, list[str]] = defaultdict(list)
for homily in COMPARISON["homilies"]:
    for item in homily["graphies_anciennes"]:
        source_forms[key(item["source"])][item["source"]] += 1
for source_key, database_key in COMPARISON["equivalences_apprises"].items():
    reverse[database_key].append(source_key)


def source_form(word: str) -> str | None:
    candidates = reverse.get(key(word), [])
    if not candidates:
        return None
    source_key = max(candidates, key=lambda candidate: sum(source_forms[candidate].values()))
    forms = {word}
    for _ in range(2):
        for value in list(forms):
            forms.add(re.sub(r"aient$", "oient", value, flags=re.IGNORECASE))
            forms.add(re.sub(r"ait$", "oit", value, flags=re.IGNORECASE))
            forms.add(re.sub(r"ais$", "ois", value, flags=re.IGNORECASE))
            forms.add(re.sub(r"ements$", "emens", value, flags=re.IGNORECASE))
            forms.add(re.sub(r"ants$", "ans", value, flags=re.IGNORECASE))
            forms.add(value.replace("conna", "conno").replace("Conna", "Conno"))
            forms.add(value.replace("faibl", "foibl").replace("Faibl", "Foibl"))
            forms.add(value.replace("para", "paro").replace("Para", "Paro"))
    matches = [value for value in forms if key(value) == source_key]
    return min(matches, key=lambda value: (value == word, len(value))) if matches else None


def restore(text: str) -> tuple[str, int]:
    pieces = []
    cursor = 0
    count = 0
    for match in WORD_RE.finditer(text):
        pieces.append(text[cursor:match.start()])
        before = match.group(0)
        after = source_form(before) or before
        pieces.append(after)
        count += before != after
        cursor = match.end()
    pieces.append(text[cursor:])
    return "".join(pieces), count


manual = [
    ("avaient fait un ouvrage", "avoient fait un ouvrage"),
    ("ils mettaient au bas", "ils mettoient au bas"),
    ("ils pouvaient retoucher", "ils pouvoient retoucher"),
    ("qui avaient raisonna sur la physique", "qui avoient raisonné sur la physique"),
    ("qui avoient raisonna sur la physique", "qui avoient raisonné sur la physique"),
    ("c’était l'opinion", "c’étoit l'opinion"),
    ("qui opposait la naît au jour", "qui opposoit la nuit au jour"),
    ("qui opposoit la naît au jour", "qui opposoit la nuit au jour"),
    ("était bien plus ancienne que les Manichéens", "étoit bien plus ancienne que les Manichéens"),
    ("où il-est s’ils étaient agités", "où il est, s’ils étoient agités"),
    ("où il-est s'ils étaient agités", "où il est, s'ils étoient agités"),
    ("où il-est s'ils étoient agités", "où il est, s'ils étoient agités"),
]

full_notes = {
    18: "[[1]] L'orateur parle ici du système de Straton de Lampsaque, disciple d'Aristote. Suivant ce philosophe, les élémens du monde étoient animés, et avoient en eux un principe de mouvement, dont il étoit résulté, sans aucun concours d'une intelligence suprême, un monde et des êtres tels que nous les voyons. Son système avoit quelque rapport avec celui des atomes d'Epicure dont il est parlé ensuite ; mais il n'étoit pas tout-à-fait le même.",
    38: "[[4]] Tous les philosophes qui ont raisonné sur la physique, ont admis l'éternité de la matière ; plusieurs même, entre autres Aristote, ont soutenu que ce monde visible étoit éternel.",
    310: "[[18]] Le premier jour de la semaine chez les chrétiens, que nous appelons dimanche. Ce qui précède est un peu subtil dans l'orateur ; j'ai tâché de l'expliquer le plus clairement qu'il m'a été possible.",
    501: "[[33]] La voix divine produit la nature, c'est-à-dire, donne aux êtres les caractères qui doivent les distinguer. Saint Basile auroit pu dire que Dieu en créant les eaux, leur avoit donné une qualité fluide ; mais, qu'étant répandues également sur toute la terre, elles restoient tranquilles ; que dès qu'on leur eut creusé des réservoirs, elles coururent d'elles-mêmes les remplir.",
    729: "[[42]] Quelques personnes ont observé… Erreur populaire rejetée par les naturalistes.",
    784: "[[45]] Nous savons que chez les Romains on assistoit aux spectacles la tête couverte ; mais nous voyons ici dans saint Basile, et nous pouvons voir dans St. Jean-Chrysostôme, que chez les Grecs, au moins du temps de ces Pères, on y assistoit la tête nue.",
    887: "[[49]] Saint Basile auroit pu ajouter à toutes ses réflexions, que les noms donnés aux signes du zodiaque étoient des noms arbitraires ; que les signes, par exemple, qu'on a appelés taureau, bélier, auroient pu être appelés également crocodile, rhinocéros.",
    924: "[[51]] Contrées odoriférantes, l'Arabie. Il est vrai de dire que tous les peuples placés au-delà de l'Arabie peuvent jeter leurs ombres vers les régions australes ; mais il ne seroit pas vrai d'ajouter que tous les jettent, tantôt vers le midi, tantôt vers le nord. Les peuples placés au-delà du tropique le plus loin de nous, ne voient jamais leurs ombres à midi que vers les régions australes.",
    1024: "[[57]] Saint Basile semble faire entendre que les poissons n'ont pas besoin d'air pour vivre ; cependant il est démontré qu'ils en ont besoin, et qu'ils sont construits de manière à pouvoir extraire de l'eau l'air nécessaire à leur respiration.",
    1039: "[[58]] On appelle en général cétacées, des animaux d'une grandeur démesurée ; mais on a restreint la signification de ce mot, à désigner de grands poissons de mer qui s'accouplent et se reproduisent à la manière des quadrupèdes. — On prétend… Ce fait n'est point confirmé par les naturalistes.",
    1093: "[[62]] Cela étoit vrai du temps de saint Basile.",
    1145: "[[65]] Les uns ont regardé le corail comme une plante, les autres comme une pierre ; St. Basile prétend qu'il est plante dans la mer, et qu'il devient pierre quand il est dehors. De nouvelles observations ont montré qu'il étoit formé par de petits animaux qui s'attachent à un corps, et qui y établissent leur habitation.",
    1146: "[[66]] Ce poisson méprisable est une espèce d'huître qu'on appelle huître nacrée. Voyez le dictionnaire de M. Valmont de Bomare, article nacre de perles ; et pour la note précédente, article corail. — Certains coquillages, les pinnes-marines. — Une laine d'or, le plus beau byssus, espèce de soie d'un beau jaune ou couleur d'or, que l'on trouve dans la pinne-marine, très-grand coquillage bivalve, du genre des moules. — D'autres enrichissent… Tout le monde sait que l'on trouve la plus belle couleur de pourpre dans le murex, coquillage univalve.",
    1227: "[[72]] Schizoptères, qui ont des ailes divisées en plusieurs parties, tels que les aigles et la plupart des oiseaux. Dermoptères, qui ont des peaux au lieu d'ailes. Ptilotes, qui ont des ailes minces et d'une seule pièce. Quant aux coléoptères, l'exemple que cite saint Basile est juste ; mais l'explication qu'il donne ne l'est pas. Les escarbots ne naissent pas dans les étuis dont ils s'affranchissent ; mais leurs ailes, ainsi que celles d'autres insectes volans, sont renfermées dans des étuis d'où ils les tirent et les développent pour voler. Je ne crois pas non plus qu'on soit satisfait de sa distinction, d'après les livres saints, dit-il, en oiseaux purs et impurs. Au reste, d'après d'anciens naturalistes, il met les insectes volans au nombre des oiseaux.",
    1383: "[[86]] Sont engendrés de la terre. Voilà ce qu'on pensoit du temps de saint Basile et avant lui ; mais des observations postérieures ont démontré que rien ne s'engendroit sans un germe ou un œuf que la chaleur développoit ou faisoit éclore.",
    1706: "[[95]] De son propre travail, sans doute aidé et secondé par la grâce ; c'est ce qu'il faut sous-entendre dans tout ce morceau, et ce que sous-entendoit l'orateur. En général, les Pères grecs de ce temps s'observoient moins dans leurs expressions en parlant du libre arbitre ; ce n'est pas qu'ils ne pensassent très-bien, mais c'est qu'il n'y avoit pas encore eu d'erreur et de contradiction sur cet objet.",
    1776: "[[97]] Dans tout cet article de la faculté visuelle, c'est la même erreur que nous avons remarquée dans l'homélie sixième de saint Basile. L'œil ne va point chercher les objets, comme on se l'imaginoit alors ; ce sont les objets qui viennent se peindre au fond de l'œil.",
}

rows = []
for row in SNAPSHOT["segments"]:
    before = row.get("notes")
    if not before:
        continue
    after, replacements = restore(before)
    corrections = []
    for old, new in manual:
        if old in after:
            after = after.replace(old, new)
            corrections.append({"before": old, "after": new})
    if row["segment_numero"] in full_notes:
        replacement = full_notes[row["segment_numero"]]
        if after != replacement:
            corrections.append({"before": after, "after": replacement, "reason": "note tronquée, fac-similé"})
            after = replacement
    if re.findall(r"\[\[\d+\]\]", before) != re.findall(r"\[\[\d+\]\]", after):
        raise RuntimeError(f"Appel de note modifié au segment {row['segment_numero']}")
    if after != before:
        rows.append({
            "id": row["id"],
            "segment_numero": row["segment_numero"],
            "before": before,
            "after": after,
            "replacements": replacements,
            "corrections": corrections,
        })

payload = {
    "rows": rows,
    "segments": len(rows),
    "replacements": sum(row["replacements"] for row in rows),
    "manual_corrections": sum(len(row["corrections"]) for row in rows),
}
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: payload[key] for key in ("segments", "replacements", "manual_corrections")}, indent=2))
