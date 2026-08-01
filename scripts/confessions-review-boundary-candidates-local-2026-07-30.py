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
MODEL_PATH = Path('tmp/confessions-local-llm-xet/Qwen3-8B-Q4_K_M.gguf')

latin_payload = json.loads((LATIN_ROOT / 'confessions-csel-chapters.json').read_text(encoding='utf-8'))
source_map = json.loads((ROOT / 'confessions-source-map.json').read_text(encoding='utf-8'))
alignments = json.loads((LATIN_ROOT / 'confessions-latin-alignments.json').read_text(encoding='utf-8'))
moreau = json.loads((LATIN_ROOT / 'confessions-moreau-bridge.json').read_text(encoding='utf-8'))

body = [item for item in source_map if item['nature'] == 'texte']
chapter_keys = []
paragraphs_by_chapter = defaultdict(list)
for item in body:
    key = (item['ref_niv1'], item['ref_niv2'])
    if key not in paragraphs_by_chapter:
        chapter_keys.append(key)
    paragraphs_by_chapter[key].append(item)


def units_with_offsets(text: str) -> list[tuple[int, str]]:
    starts = [0]
    starts.extend(match.end() for match in re.finditer(r'(?<=[.!?;:,])\s+', text))
    return [(start, text[start: starts[index + 1] if index + 1 < len(starts) else len(text)].strip()) for index, start in enumerate(starts)]


def extract_json(text: str):
    text = re.sub(r'<think>[\s\S]*?</think>', '', text)
    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        raise ValueError('JSON absent')
    return json.loads(match.group())


def french_words(value: str) -> set[str]:
    value = value.lower().replace('vostre', 'votre').replace('nostre', 'notre').replace('estoit', 'etait')
    return {word for word in re.findall(r'[a-zà-ÿ]{4,}', value) if word not in {'avec', 'dans', 'pour', 'cette', 'comme', 'mais', 'vous', 'nous', 'leur', 'leurs'}}


selectors = set(sys.argv[1:])
selected = [chapter for chapter in latin_payload['chapters'] if not selectors or f"{chapter['book_number']}.{chapter['chapter_number']}" in selectors]
llm = Llama(model_path=str(MODEL_PATH), n_ctx=24576, n_threads=8, n_batch=512, n_gpu_layers=-1, verbose=False)
results = []

for chapter_index, chapter in enumerate(selected, 1):
    paragraphs = paragraphs_by_chapter[chapter_keys[chapter['order'] - 1]]
    aligned = [item for item in alignments if item['book_number'] == chapter['book_number'] and item['chapter_number'] == chapter['chapter_number']]
    units = units_with_offsets(chapter['text'])
    questions = []
    for boundary in range(1, len(paragraphs)):
        current_offset = chapter['text'].find(aligned[boundary]['latin_text'])
        center = min(range(len(units)), key=lambda index: abs(units[index][0] - current_offset))
        indexes = list(range(max(1, center - 6), min(len(units), center + 7)))
        zone_start = max(0, units[indexes[0]][0] - 120)
        zone_end = min(len(chapter['text']), units[indexes[-1]][0] + 260)
        latin_zone = chapter['text'][zone_start:zone_end]
        for option, unit_index in reversed(list(enumerate(indexes, 1))):
            relative = units[unit_index][0] - zone_start
            latin_zone = latin_zone[:relative] + f' ⟦{option}⟧ ' + latin_zone[relative:]
        questions.append({
            'boundary': boundary,
            'french_after': paragraphs[boundary]['source_clean'][:320],
            'latin_zone': latin_zone,
            'unit_indexes': indexes,
        })
    if not questions:
        results.append({'order': chapter['order'], 'choices': []})
        continue
    choices = []
    offsets = []
    markers = []
    for question_index, question in enumerate(questions, 1):
        public_question = {key: value for key, value in question.items() if key != 'unit_indexes'}
        query_words = french_words(question['french_after'])
        scored_bridge = []
        for bridge_index, bridge_paragraph in enumerate(moreau[chapter['order'] - 1]['paragraphs']):
            bridge_words = french_words(bridge_paragraph)
            score = len(query_words & bridge_words) / max(1, len(query_words | bridge_words))
            scored_bridge.append((score, bridge_index, bridge_paragraph))
        bridge_excerpt = [item[2] for item in sorted(sorted(scored_bridge, reverse=True)[:3], key=lambda item: item[1])]
        prompt = f"""Tu es latiniste. Voici une frontière entre deux paragraphes français des Confessions.
Choisis l'option où commence exactement le paragraphe français donné dans le latin. Appuie-toi d'abord sur ses premiers mots.
Les symboles ⟦n⟧ marquent les débuts latins possibles. Traduis mentalement les deux côtés. Ne choisis jamais selon la longueur.
Réponds uniquement par {{"choice": nombre}}.

Passages voisins du témoin français Moreau : {json.dumps(bridge_excerpt, ensure_ascii=False)}

QUESTION : {json.dumps(public_question, ensure_ascii=False)}"""
        last_error = None
        for attempt in range(3):
            response = llm.create_chat_completion(
                messages=[{'role': 'user', 'content': prompt}], temperature=0, max_tokens=700,
            )
            raw = response['choices'][0]['message']['content'] or ''
            try:
                choice = extract_json(raw)['choice']
                if not isinstance(choice, int) or not 1 <= choice <= len(question['unit_indexes']):
                    raise ValueError(f'Choix hors limites : {choice}')
                unit_index = question['unit_indexes'][choice - 1]
                choices.append(choice)
                offsets.append(units[unit_index][0])
                markers.append(units[unit_index][1][:100])
                break
            except Exception as error:
                last_error = str(error)
                prompt += f'\nTa réponse était invalide ({last_error}). Donne seulement le JSON demandé.'
        else:
            raise RuntimeError(f"L{chapter['book_number']} C{chapter['chapter_number']} frontière {question_index}: {last_error}")
        print(f"  frontière {question_index}/{len(questions)}", flush=True)
    if offsets != sorted(offsets) or len(offsets) != len(set(offsets)):
        raise RuntimeError(f"L{chapter['book_number']} C{chapter['chapter_number']}: choix non monotones")
    results.append({
        'order': chapter['order'], 'book_number': chapter['book_number'],
        'chapter_number': chapter['chapter_number'], 'choices': choices,
        'offsets': [0, *offsets], 'markers': [chapter['text'][:100], *markers],
    })
    print(f"{chapter_index}/{len(selected)} L{chapter['book_number']} C{chapter['chapter_number']}", flush=True)

suffix = '-prototype' if selectors else ''
(LATIN_ROOT / f'confessions-latin-local-candidate-review{suffix}.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
)
print(json.dumps({'ok': True, 'chapters': len(results)}))
