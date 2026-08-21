from __future__ import annotations

import concurrent.futures
import html
import json
import re
import time
import urllib.request
from pathlib import Path

from lxml import html as lxml_html

BASE = 'https://bkv.unifr.ch'
VERSION = '/fr/works/cpl-251/versions/aug-conf-moreau'
FIRST = f'{BASE}{VERSION}/divisions/3'
OUT = Path('tmp/confessions-latin-csel-2026-07-29/confessions-moreau-bridge.json')
USER_AGENT = 'Corpus-Scriptura-editorial-alignment/1.0 (+https://corpus-scriptura.fr)'


def fetch(url: str, attempts: int = 3) -> str:
    last_error = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read().decode('utf-8')
        except Exception as error:
            last_error = error
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f'Échec {url}: {last_error}')


def normalize(value: str) -> str:
    return re.sub(r'\s+', ' ', value.replace('\u00a0', ' ')).strip()


first_html = fetch(FIRST)
first_doc = lxml_html.fromstring(first_html)
tree_elements = first_doc.xpath('//collapsible-tree')
raw_tree = []
if tree_elements:
    value = tree_elements[0].attrib.get(':data') or tree_elements[0].attrib.get('data')
    if value:
        raw_tree = [value]
if not raw_tree:
    match = re.search(r'<collapsible-tree\s+[^>]*:data="([^"]+)"', first_html, re.S)
    if not match:
        raise SystemExit('Arbre Moreau introuvable')
    tree = json.loads(html.unescape(match.group(1)))
else:
    tree = json.loads(html.unescape(raw_tree[0]))
chapters = [node for node in tree if node.get('depth') == 2 and node.get('has_valid_content')]
if len(chapters) != 278:
    raise SystemExit(f'278 chapitres attendus, {len(chapters)} trouvés')


def extract(node: dict) -> dict:
    division_id = int(node['division_id'])
    url = f'{BASE}{VERSION}/divisions/{division_id}'
    page = first_html if division_id == 3 else fetch(url)
    doc = lxml_html.fromstring(page)
    containers = doc.xpath("//div[contains(concat(' ', normalize-space(@class), ' '), ' division-view-container ')]//div[h3 and p]")
    if len(containers) != 1:
        raise RuntimeError(f'Conteneur ambigu : {url}')
    container = containers[0]
    paragraphs = [normalize(' '.join(element.xpath('.//text()'))) for element in container.xpath('./p')]
    return {
        'order': chapters.index(node) + 1,
        'division_id': division_id,
        'source_url': url,
        'heading': normalize(' '.join(container.xpath('./h3[1]//text()'))),
        'paragraphs': [paragraph for paragraph in paragraphs if paragraph],
    }


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    payload = list(executor.map(extract, chapters))
payload.sort(key=lambda item: item['order'])
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({
    'ok': True,
    'chapters': len(payload),
    'paragraphs': sum(len(item['paragraphs']) for item in payload),
    'paragraph_counts': {str(count): sum(1 for item in payload if len(item['paragraphs']) == count) for count in sorted({len(item['paragraphs']) for item in payload})},
}, ensure_ascii=False, indent=2))
