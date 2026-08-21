import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

from docx import Document
from lxml import etree

sys.stdout.reconfigure(encoding='utf-8')

MASTER = Path(r'C:\Corpus Scriptura\Augustin\Confessions-Saint-Augustin-Andilly-1649-MASTER.docx')
OUT = Path(r'C:\Corpus Scriptura\bible-patristique\tmp\confessions-import-2026-07-29\docx-inventory.json')
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

doc = Document(MASTER)
paragraphs = []
for index, paragraph in enumerate(doc.paragraphs):
    paragraphs.append({
        'index': index,
        'style': paragraph.style.name,
        'text': paragraph.text,
        'runs': [
            {
                'text': run.text,
                'bold': bool(run.bold),
                'italic': bool(run.italic),
                'superscript': bool(run.font.superscript),
                'small_caps': bool(run.font.small_caps),
            }
            for run in paragraph.runs
        ],
    })

all_text = '\n'.join(p['text'] for p in paragraphs)
char_counter = Counter(all_text)
with zipfile.ZipFile(MASTER) as archive:
    footnotes_root = etree.fromstring(archive.read('word/footnotes.xml'))
    document_root = etree.fromstring(archive.read('word/document.xml'))
footnotes = {}
for node in footnotes_root.xpath('//w:footnote', namespaces=NS):
    note_id = node.get(f'{{{NS["w"]}}}id')
    if note_id and int(note_id) > 0:
        footnotes[note_id] = ''.join(node.xpath('.//w:t/text()', namespaces=NS))
anchors = []
for p_index, node in enumerate(document_root.xpath('//w:body/w:p', namespaces=NS)):
    linear = []
    note_ids = []
    for child in node.xpath('.//w:r/*', namespaces=NS):
        local = etree.QName(child).localname
        if local == 't':
            linear.append(child.text or '')
        elif local == 'tab':
            linear.append('\t')
        elif local in ('br', 'cr'):
            linear.append('\n')
        elif local == 'footnoteReference':
            note_id = child.get(f'{{{NS["w"]}}}id')
            linear.append(f'[[WORD_FOOTNOTE_{note_id}]]')
            note_ids.append(note_id)
    if note_ids:
        anchors.append({'paragraph_index': p_index, 'linear_text': ''.join(linear), 'note_ids': note_ids})

result = {
    'master': str(MASTER),
    'paragraph_count': len(paragraphs),
    'style_counts': Counter(p['style'] for p in paragraphs),
    'character_counts': {key: char_counter[key] for key in ['«', '»', '“', '”', '"', "'", '’', '…', '–', '—', '\u00a0', '\u202f', '�']},
    'paragraph_anomalies': {
        'double_spaces': [p['index'] for p in paragraphs if re.search(r' {2,}', p['text'])],
        'straight_apostrophes': [p['index'] for p in paragraphs if "'" in p['text']],
        'quote_paragraphs': [p['index'] for p in paragraphs if any(q in p['text'] for q in '«»“”"')],
        'control_characters': [p['index'] for p in paragraphs if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]', p['text'])],
    },
    'footnotes': footnotes,
    'footnote_anchors': anchors,
    'paragraphs': paragraphs,
}
OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in result.items() if key != 'paragraphs'}, ensure_ascii=False, indent=2))
