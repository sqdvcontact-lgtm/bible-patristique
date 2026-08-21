from __future__ import annotations

import concurrent.futures
import hashlib
import html
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from lxml import html as lxml_html

BASE = 'https://bkv.unifr.ch'
VERSION = '/de/works/cpl-251/versions/aug-conf-csel'
FIRST_DIVISION = f'{BASE}{VERSION}/divisions/3'
OUT = Path('tmp/confessions-latin-csel-2026-07-29')
USER_AGENT = 'Corpus-Scriptura-editorial-alignment/1.0 (+https://corpus-scriptura.fr)'


def fetch(url: str, attempts: int = 3) -> str:
    error = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status != 200:
                    raise RuntimeError(f'HTTP {response.status}')
                return response.read().decode('utf-8')
        except Exception as exc:  # pragma: no cover - réseau
            error = exc
            time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f'Échec de téléchargement {url}: {error}')


def normalize_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value.replace('\u00a0', ' ')).strip()


def roman_to_int(value: str) -> int:
    numbers = {'I': 1, 'V': 5, 'X': 10}
    total = 0
    previous = 0
    for character in reversed(value):
        current = numbers[character]
        total += -current if current < previous else current
        previous = max(previous, current)
    return total


first_html = fetch(FIRST_DIVISION)
first_doc = lxml_html.fromstring(first_html)
tree_elements = first_doc.xpath('//collapsible-tree')
tree_values = []
if tree_elements:
    value = tree_elements[0].attrib.get(':data') or tree_elements[0].attrib.get('data')
    if value:
        tree_values = [value]
if not tree_values:
    match = re.search(r'<collapsible-tree\s+[^>]*:data="([^"]+)"', first_html, re.S)
    if not match:
        raise SystemExit('Arbre des divisions BKV introuvable')
    tree_json = html.unescape(match.group(1))
else:
    tree_json = html.unescape(tree_values[0])
nodes = json.loads(tree_json)
by_node_id = {node['id']: node for node in nodes}
chapter_nodes = [node for node in nodes if node.get('depth') == 2 and node.get('has_valid_content')]
if len(chapter_nodes) != 278:
    raise SystemExit(f'278 chapitres attendus, {len(chapter_nodes)} trouvés')


def extract_chapter(node: dict) -> dict:
    division_id = int(node['division_id'])
    url = f'{BASE}{VERSION}/divisions/{division_id}'
    page = first_html if division_id == 3 else fetch(url)
    doc = lxml_html.fromstring(page)
    containers = doc.xpath("//div[contains(concat(' ', normalize-space(@class), ' '), ' division-view-container ')]//div[h3 and p]")
    if len(containers) != 1:
        raise RuntimeError(f'{url}: conteneur de chapitre ambigu ({len(containers)})')
    container = containers[0]
    heading = normalize_text(' '.join(container.xpath('./h3[1]//text()')))
    paragraphs = [normalize_text(' '.join(p.xpath('.//text()'))) for p in container.xpath('./p')]
    paragraphs = [paragraph for paragraph in paragraphs if paragraph]
    if heading != node['title'] or len(paragraphs) != 1:
        raise RuntimeError(f'{url}: titre={heading!r}, paragraphes HTML={len(paragraphs)}')
    parent = by_node_id[node['parent']]
    text = paragraphs[0]
    return {
        'order': chapter_nodes.index(node) + 1,
        'book_latin': parent['title'],
        'book_number': roman_to_int(re.search(r'\b([IVX]+)\b', parent['title']).group(1)),
        'chapter_latin': heading,
        'chapter_number': int(re.search(r'\d+', heading).group()),
        'division_id': division_id,
        'source_url': url,
        'text': text,
        'sha256': hashlib.sha256(text.encode('utf-8')).hexdigest().upper(),
    }


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    chapters = list(executor.map(extract_chapter, chapter_nodes))
chapters.sort(key=lambda item: item['order'])

expected_counts = [20, 10, 12, 16, 14, 16, 21, 12, 13, 43, 31, 32, 38]
actual_counts = [sum(1 for chapter in chapters if chapter['book_number'] == book) for book in range(1, 14)]
if actual_counts != expected_counts:
    raise SystemExit(f'Chapitres par livre inattendus : {actual_counts}')
if any(not chapter['text'] for chapter in chapters):
    raise SystemExit('Un chapitre latin est vide')

payload = {
    'source': {
        'version_url': 'https://bkv.unifr.ch/en/works/cpl-251/versions/aug-conf-csel',
        'copyright_notice_url': 'https://bkv.unifr.ch/en/about/copyrights',
        'bibliographic_reference': 'Sancti Aurelii Augustini opera. Sectio 1, pars 1, Sancti Aureli Augustini Confessionum libri tredecim, recensuit et commentario critico instruxit Pius Knöll, CSEL 33, 1896.',
        'extracted_at': datetime.now(timezone.utc).isoformat(),
    },
    'counts': {
        'books': 13,
        'chapters': len(chapters),
        'characters': sum(len(chapter['text']) for chapter in chapters),
        'chapters_by_book': actual_counts,
    },
    'chapters': chapters,
}
OUT.mkdir(parents=True, exist_ok=True)
body = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
(OUT / 'confessions-csel-chapters.json').write_text(body, encoding='utf-8')
(OUT / 'confessions-csel-chapters.json.sha256').write_text(
    f"{hashlib.sha256(body.encode('utf-8')).hexdigest().upper()}  confessions-csel-chapters.json\n",
    encoding='utf-8',
)
print(json.dumps({'ok': True, **payload['counts'], 'output': str(OUT / 'confessions-csel-chapters.json')}, ensure_ascii=False, indent=2))
