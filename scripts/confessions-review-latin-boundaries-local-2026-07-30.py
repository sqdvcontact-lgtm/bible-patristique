from __future__ import annotations

import json
import os
import re
import sys
import ctypes
from collections import defaultdict
from pathlib import Path

_dll_handles = []
for _relative in ('nvidia/cublas/bin', 'nvidia/cuda_runtime/bin', 'nvidia/cuda_nvrtc/bin'):
    _directory = Path(sys.prefix) / 'Lib' / 'site-packages' / _relative
    if _directory.exists():
        _dll_handles.append(os.add_dll_directory(_directory))
for _library in ('cudart64_12.dll', 'cublas64_12.dll', 'cublasLt64_12.dll'):
    ctypes.CDLL(_library)

from llama_cpp import Llama

ROOT = Path('tmp/confessions-import-2026-07-29')
LATIN_ROOT = Path('tmp/confessions-latin-csel-2026-07-29')
MODEL_PATH = Path('tmp/confessions-local-llm-xet/Qwen3-4B-Q4_K_M.gguf')

latin_payload = json.loads((LATIN_ROOT / 'confessions-csel-chapters.json').read_text(encoding='utf-8'))
source_map = json.loads((ROOT / 'confessions-source-map.json').read_text(encoding='utf-8'))
moreau = json.loads((LATIN_ROOT / 'confessions-moreau-bridge.json').read_text(encoding='utf-8'))
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
    chapter for chapter in latin_payload['chapters']
    if not selectors or f"{chapter['book_number']}.{chapter['chapter_number']}" in selectors
]

llm = Llama(
    model_path=str(MODEL_PATH),
    n_ctx=32768,
    n_threads=8,
    n_batch=512,
    n_gpu_layers=-1,
    verbose=False,
)


def extract_json(text: str) -> dict:
    text = re.sub(r'<think>[\s\S]*?</think>', '', text).strip()
    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        raise ValueError(f'Objet JSON absent : {text[:300]}')
    return json.loads(match.group())


def validate(chapter: dict, markers: list[str], paragraph_count: int) -> list[int]:
    if len(markers) != paragraph_count:
        raise ValueError(f'{len(markers)} marqueurs pour {paragraph_count} paragraphes')
    offsets = []
    cursor = 0
    for index, marker in enumerate(markers):
        if not isinstance(marker, str) or len(marker) < 5:
            raise ValueError(f'Marqueur {index + 1} invalide')
        offset = chapter['text'].find(marker, cursor)
        if offset < 0:
            raise ValueError(f'Marqueur {index + 1} introuvable : {marker}')
        if index == 0 and offset != 0:
            raise ValueError('Le premier marqueur ne commence pas le chapitre')
        offsets.append(offset)
        cursor = offset + len(marker)
    return offsets


def review_chapter(chapter: dict) -> dict:
    paragraphs = paragraphs_by_chapter[chapter_keys[chapter['order'] - 1]]
    bridge = moreau[chapter['order'] - 1]
    french = [
        {'n': index + 1, 'style': item['style'], 'text': item['source_clean']}
        for index, item in enumerate(paragraphs)
    ]
    prompt = f"""Tu es latiniste et éditeur de textes patristiques. Aligne les paragraphes d'une traduction française libre des Confessions avec le latin, d'après le sens exact.

Pour chacun des {len(french)} paragraphes D'ANDILLY, copie le début exact du passage LATIN correspondant.

Contraintes absolues :
- Réponds seulement par un objet JSON de forme {{"markers":["...", "..."]}}.
- Il faut exactement {len(french)} marqueurs, dans l'ordre.
- Chaque marqueur contient 4 à 10 mots consécutifs copiés à l'identique dans LATIN, ponctuation et casse comprises.
- Le premier marqueur commence au premier caractère de LATIN.
- Une frontière française peut couper une phrase latine.
- Les lignes françaises de style « Vers » correspondent chacune à un membre distinct du poème latin.
- MOREAU est seulement un témoin français auxiliaire : ses paragraphes ne commandent pas ceux de D'Andilly.
- Décide par le sens, jamais par la longueur.

LATIN :
{chapter['text']}

D'ANDILLY :
{json.dumps(french, ensure_ascii=False)}

MOREAU :
{json.dumps(bridge['paragraphs'], ensure_ascii=False)}

/no_think"""
    last_error = None
    for attempt in range(3):
        print(f"  inférence tentative {attempt + 1}", flush=True)
        response = llm.create_chat_completion(
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0 if attempt == 0 else 0.15,
            top_p=0.9,
            max_tokens=700,
        )
        raw = response['choices'][0]['message']['content'] or ''
        print(f"  réponse reçue : {len(raw)} caractères", flush=True)
        try:
            payload = extract_json(raw)
            markers = payload['markers']
            offsets = validate(chapter, markers, len(french))
            return {
                'order': chapter['order'],
                'book_number': chapter['book_number'],
                'chapter_number': chapter['chapter_number'],
                'markers': markers,
                'offsets': offsets,
                'attempt': attempt + 1,
            }
        except Exception as error:
            last_error = str(error)
            print(f"  réponse invalide : {raw[:500]!r}", flush=True)
            prompt += f"\n\nTa réponse précédente est invalide : {last_error}. Corrige-la et recopie exclusivement des sous-chaînes exactes du LATIN."
    raise RuntimeError(f"Livre {chapter['book_number']}, chapitre {chapter['chapter_number']} : {last_error}")


results = []
for index, chapter in enumerate(selected, 1):
    result = review_chapter(chapter)
    results.append(result)
    print(f"{index}/{len(selected)} : livre {chapter['book_number']}, chapitre {chapter['chapter_number']} validé", flush=True)

suffix = '-prototype' if selectors else ''
output = {
    'model': 'Qwen/Qwen3-4B-GGUF Q4_K_M',
    'chapters': results,
}
(LATIN_ROOT / f'confessions-latin-local-boundaries{suffix}.json').write_text(
    json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
print(json.dumps({'ok': True, 'chapters': len(results)}, ensure_ascii=False))
