from __future__ import annotations

import json
import math
import re
import sys
import unicodedata
from bisect import bisect_left
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path('tmp/confessions-import-2026-07-29')
LATIN_ROOT = Path('tmp/confessions-latin-csel-2026-07-29')

LATIN_STOP = set('a ab ad adhuc alio aliquid ante apud autem cum de dum enim ergo est et etiam ex hic hoc iam id igitur in ipsa ipse ipsum ita nam ne nec neque nisi non nunc per post quae quam quia quid quo quod sed si sic sine sit sunt tamen te tu tua ut vel'.split())
FRENCH_STOP = set('afin ainsi alors après au aux avec car ce ces cette comme dans de des donc du elle elles en encore est et eux il ils je la le les leur lui mais me même mes ne ni nous on ou par pas plus pour que qui sa se ses si son sont sur tout tous très tu un une vous'.split())


def plain(value: str) -> str:
    return re.sub(r'\[\[\d+\]\]', '', value).replace('*', '').replace('^^', '').replace('++', '')


def tokens(value: str, language: str) -> set[str]:
    folded = unicodedata.normalize('NFD', plain(value).lower())
    folded = ''.join(character for character in folded if unicodedata.category(character) != 'Mn')
    words = re.findall(r'[a-z]{3,}', folded)
    stop = LATIN_STOP if language == 'la' else FRENCH_STOP
    return {word for word in words if word not in stop}


def measure(value: str) -> int:
    return sum(character.isalpha() for character in plain(value))


def split_units(value: str) -> list[str]:
    units = [part.strip() for part in re.split(r'(?<=[.!?;:,])\s+', value) if part.strip()]
    if ' '.join(units) != value:
        raise RuntimeError('Découpe non conservative')
    return units


latin_payload = json.loads((LATIN_ROOT / 'confessions-csel-chapters.json').read_text(encoding='utf-8'))
source_map = json.loads((ROOT / 'confessions-source-map.json').read_text(encoding='utf-8'))
initial = json.loads((LATIN_ROOT / 'confessions-latin-alignments.json').read_text(encoding='utf-8'))
moreau = json.loads((LATIN_ROOT / 'confessions-moreau-bridge.json').read_text(encoding='utf-8'))

# Le premier corpus d'apprentissage combine l'alignement conservateur d'Andilly
# et le témoin Moreau. Même lorsqu'une frontière est décalée d'une proposition,
# le voisinage lexical du paragraphe reste suffisamment pur pour induire un
# petit lexique de corpus sans dictionnaire externe.
training_pairs = [(item['latin_text'], item['source_clean']) for item in initial]
for chapter, bridge in zip(latin_payload['chapters'], moreau, strict=True):
    latin_units = split_units(chapter['text'])
    paragraphs = bridge['paragraphs']
    latin_lengths = [measure(unit) for unit in latin_units]
    french_lengths = [measure(paragraph) for paragraph in paragraphs]
    ratio = sum(latin_lengths) / max(1, sum(french_lengths))
    prefix = [0]
    for length in latin_lengths:
        prefix.append(prefix[-1] + length)
    n, p = len(latin_units), len(paragraphs)
    # Pour l'induction lexicale, une approximation monotone suffit : les
    # erreurs locales sont diluées par les 1 816 paires d'apprentissage.
    french_prefix = [0]
    for length in french_lengths:
        french_prefix.append(french_prefix[-1] + length)
    bounds = [0]
    for pi in range(1, p):
        target = french_prefix[pi] * ratio
        candidate = bisect_left(prefix, target)
        candidate = max(bounds[-1] + 1, min(candidate, n - (p - pi)))
        bounds.append(candidate)
    bounds.append(n)
    training_pairs.extend((' '.join(latin_units[bounds[i]:bounds[i + 1]]), paragraphs[i]) for i in range(p))

latin_frequency = Counter()
french_frequency = Counter()
cooccurrence: dict[str, Counter] = defaultdict(Counter)
tokenized_pairs = []
for latin, french in training_pairs:
    lt = tokens(latin, 'la')
    ft = tokens(french, 'fr')
    tokenized_pairs.append((lt, ft))
    latin_frequency.update(lt)
    french_frequency.update(ft)
for lt, ft in tokenized_pairs:
    # Les mots les plus rares sont les meilleurs ancres ; limiter chaque côté
    # évite le produit cartésien inutile des très longs paragraphes.
    lt = set(sorted(lt, key=lambda token: latin_frequency[token])[:70])
    ft = set(sorted(ft, key=lambda token: french_frequency[token])[:70])
    # Le poids évite qu'un très long paragraphe écrase les unités courtes.
    weight = 1 / math.sqrt(max(1, len(lt) * len(ft)))
    for latin_token in lt:
        for french_token in ft:
            cooccurrence[latin_token][french_token] += weight

associations: dict[str, dict[str, float]] = {}
for latin_token, related in cooccurrence.items():
    scored = {
        french_token: count / math.sqrt(latin_frequency[latin_token] * french_frequency[french_token])
        for french_token, count in related.items()
        if latin_frequency[latin_token] >= 2 and french_frequency[french_token] >= 2
    }
    associations[latin_token] = dict(sorted(scored.items(), key=lambda pair: pair[1], reverse=True)[:80])
print(f'Lexique induit : {sum(len(value) for value in associations.values())} associations', flush=True)

body_map = [item for item in source_map if item['nature'] == 'texte']
chapter_keys = []
paragraphs_by_chapter = defaultdict(list)
for item in body_map:
    key = (item['ref_niv1'], item['ref_niv2'])
    if key not in paragraphs_by_chapter:
        chapter_keys.append(key)
    paragraphs_by_chapter[key].append(item)

selectors = set(sys.argv[1:])
results = []
for chapter, key in zip(latin_payload['chapters'], chapter_keys, strict=True):
    if selectors and f"{chapter['book_number']}.{chapter['chapter_number']}" not in selectors:
        continue
    paragraphs = paragraphs_by_chapter[key]
    units = split_units(chapter['text'])
    n, p = len(units), len(paragraphs)
    unit_tokens = [tokens(unit, 'la') for unit in units]
    french_tokens = [tokens(item['source_clean'], 'fr') for item in paragraphs]
    latin_lengths = [measure(unit) for unit in units]
    french_lengths = [measure(item['source_clean']) for item in paragraphs]
    ratio = sum(latin_lengths) / max(1, sum(french_lengths))
    prefix = [0]
    for length in latin_lengths:
        prefix.append(prefix[-1] + length)

    unit_scores = []
    for paragraph_index in range(p):
        ft = french_tokens[paragraph_index]
        scores = []
        for lt in unit_tokens:
            matched = [
                max((associations.get(latin_token, {}).get(french_token, 0) for latin_token in lt), default=0)
                for french_token in ft
            ]
            scores.append(sum(matched) / math.sqrt(max(1, len(ft))))
        score_prefix = [0]
        for score in scores:
            score_prefix.append(score_prefix[-1] + score)
        unit_scores.append(score_prefix)

    def lexical_score(paragraph_index: int, start: int, end: int) -> float:
        total = unit_scores[paragraph_index][end] - unit_scores[paragraph_index][start]
        return total / math.sqrt(max(1, end - start))

    def cost(paragraph_index: int, start: int, end: int) -> float:
        actual = prefix[end] - prefix[start]
        expected = max(1, french_lengths[paragraph_index] * ratio)
        length_cost = 1.5 * math.log((actual + 1) / (expected + 1)) ** 2
        return length_cost - 3.5 * lexical_score(paragraph_index, start, end)

    dp = [[float('inf')] * (n + 1) for _ in range(p + 1)]
    previous = [[None] * (n + 1) for _ in range(p + 1)]
    dp[0][0] = 0
    for pi in range(1, p + 1):
        for end in range(pi, n - (p - pi) + 1):
            for start in range(pi - 1, end):
                value = dp[pi - 1][start] + cost(pi - 1, start, end)
                if value < dp[pi][end]:
                    dp[pi][end], previous[pi][end] = value, start
    bounds = [n]
    cursor = n
    for pi in range(p, 0, -1):
        cursor = previous[pi][cursor]
        bounds.append(cursor)
    bounds.reverse()
    results.append({
        'order': chapter['order'],
        'book_number': chapter['book_number'],
        'chapter_number': chapter['chapter_number'],
        'bounds': bounds,
        'paragraphs': [{
            'source_index': paragraphs[index]['source_index'],
            'french': paragraphs[index]['source_clean'],
            'latin': ' '.join(units[bounds[index]:bounds[index + 1]]),
            'marker': units[bounds[index]][:100],
        } for index in range(p)],
    })

suffix = '-prototype' if selectors else ''
(LATIN_ROOT / f'confessions-latin-lexical-alignments{suffix}.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
print(json.dumps({'ok': True, 'training_pairs': len(training_pairs), 'chapters': len(results), 'associations': sum(len(v) for v in associations.values())}))
