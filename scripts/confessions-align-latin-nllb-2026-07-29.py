from __future__ import annotations

import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

import torch
import torch.nn.functional as functional
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

ROOT = Path('tmp/confessions-import-2026-07-29')
LATIN_ROOT = Path('tmp/confessions-latin-csel-2026-07-29')
MODEL = 'facebook/nllb-200-distilled-600M'
CACHE = Path('tmp/confessions-nllb-model-cache')


def plain(value: str) -> str:
    value = re.sub(r'\[\[\d+\]\]', '', value)
    return value.replace('*', '').replace('^^', '').replace('++', '')


def measure(value: str) -> int:
    return sum(character.isalpha() for character in plain(value))


def split_latin(value: str, minimum: int) -> list[str]:
    chunks = [chunk.strip() for chunk in re.split(r'(?<=[.!?;:])\s+', value) if chunk.strip()]
    if len(chunks) < minimum:
        chunks = [chunk.strip() for chunk in re.split(r'(?<=[.!?;:,])\s+', value) if chunk.strip()]
    if ' '.join(chunks) != value:
        raise RuntimeError('Découpe latine non conservative')
    return chunks


def embed(texts: list[str], language: str, tokenizer, encoder, batch_size: int = 24) -> torch.Tensor:
    tokenizer.src_lang = language
    vectors = []
    with torch.inference_mode():
        for start in range(0, len(texts), batch_size):
            tokens = tokenizer(
                texts[start:start + batch_size], padding=True, truncation=True,
                max_length=512, return_tensors='pt',
            )
            hidden = encoder(**tokens).last_hidden_state
            mask = tokens['attention_mask'].unsqueeze(-1)
            pooled = (hidden * mask).sum(1) / mask.sum(1).clamp(min=1)
            vectors.append(functional.normalize(pooled, dim=1).cpu())
    return torch.cat(vectors)


latin_payload = json.loads((LATIN_ROOT / 'confessions-csel-chapters.json').read_text(encoding='utf-8'))
source_map = json.loads((ROOT / 'confessions-source-map.json').read_text(encoding='utf-8'))
body = [item for item in source_map if item['nature'] == 'texte']
chapter_keys = []
paragraphs_by_chapter = defaultdict(list)
for item in body:
    key = (item['ref_niv1'], item['ref_niv2'])
    if key not in paragraphs_by_chapter:
        chapter_keys.append(key)
    paragraphs_by_chapter[key].append(item)

selectors = set(sys.argv[1:])
selected = [
    (chapter, paragraphs_by_chapter[key])
    for chapter, key in zip(latin_payload['chapters'], chapter_keys, strict=True)
    if not selectors or f"{chapter['book_number']}.{chapter['chapter_number']}" in selectors
]

all_french = [plain(item['source_clean']) for _, paragraphs in selected for item in paragraphs]
chunk_sets = [split_latin(chapter['text'], len(paragraphs)) for chapter, paragraphs in selected]
all_latin = [chunk for chunks in chunk_sets for chunk in chunks]

print(f'Chargement de {MODEL}…', flush=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL, cache_dir=CACHE)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL, cache_dir=CACHE, low_cpu_mem_usage=True)
model.eval()
encoder = model.get_encoder()
print(f'Encodage de {len(all_french)} paragraphes français et {len(all_latin)} unités latines…', flush=True)
french_vectors = embed(all_french, 'fra_Latn', tokenizer, encoder)
latin_vectors = embed(all_latin, 'lat_Latn', tokenizer, encoder)

results = []
french_cursor = 0
latin_cursor = 0
for (chapter, paragraphs), chunks in zip(selected, chunk_sets, strict=True):
    p, n = len(paragraphs), len(chunks)
    fv = french_vectors[french_cursor:french_cursor + p]
    lv = latin_vectors[latin_cursor:latin_cursor + n]
    french_cursor += p
    latin_cursor += n
    latin_lengths = torch.tensor([measure(chunk) for chunk in chunks], dtype=torch.float32)
    french_lengths = [measure(item['source_clean']) for item in paragraphs]
    chapter_ratio = float(latin_lengths.sum()) / max(1, sum(french_lengths))
    prefix_lengths = torch.cat((torch.zeros(1), latin_lengths.cumsum(0)))
    weighted = lv * latin_lengths.unsqueeze(1)
    prefix_vectors = torch.cat((torch.zeros((1, weighted.shape[1])), weighted.cumsum(0)), dim=0)

    def cost(paragraph_index: int, start: int, end: int) -> float:
        actual = float(prefix_lengths[end] - prefix_lengths[start])
        expected = max(1.0, french_lengths[paragraph_index] * chapter_ratio)
        length_cost = 2.0 * math.log((actual + 1) / (expected + 1)) ** 2
        group = prefix_vectors[end] - prefix_vectors[start]
        group = functional.normalize(group, dim=0)
        similarity = float(torch.dot(group, fv[paragraph_index]))
        return length_cost - 2.5 * similarity

    infinity = float('inf')
    dp = [[infinity] * (n + 1) for _ in range(p + 1)]
    previous = [[None] * (n + 1) for _ in range(p + 1)]
    dp[0][0] = 0.0
    for paragraph_index in range(1, p + 1):
        for end in range(paragraph_index, n - (p - paragraph_index) + 1):
            for start in range(paragraph_index - 1, end):
                value = dp[paragraph_index - 1][start] + cost(paragraph_index - 1, start, end)
                if value < dp[paragraph_index][end]:
                    dp[paragraph_index][end] = value
                    previous[paragraph_index][end] = start
    bounds = [n]
    cursor = n
    for paragraph_index in range(p, 0, -1):
        cursor = previous[paragraph_index][cursor]
        bounds.append(cursor)
    bounds.reverse()
    results.append({
        'order': chapter['order'],
        'book_number': chapter['book_number'],
        'chapter_number': chapter['chapter_number'],
        'bounds': bounds,
        'markers': [chunks[bounds[index]][:80] for index in range(p)],
        'paragraphs': [{
            'source_index': paragraphs[index]['source_index'],
            'french': paragraphs[index]['source_clean'],
            'latin': ' '.join(chunks[bounds[index]:bounds[index + 1]]),
        } for index in range(p)],
    })
    print(f"Livre {chapter['book_number']}, chapitre {chapter['chapter_number']} aligné", flush=True)

suffix = '-prototype' if selectors else ''
(LATIN_ROOT / f'confessions-latin-nllb-alignments{suffix}.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
print(json.dumps({'ok': True, 'chapters': len(results), 'paragraphs': len(all_french), 'latin_chunks': len(all_latin)}))
