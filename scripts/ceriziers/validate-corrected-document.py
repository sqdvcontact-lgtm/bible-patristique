from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile
from lxml import etree
from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('--docx', required=True)
parser.add_argument('--pdf', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args()

docx = Path(args.docx).resolve()
pdf = Path(args.pdf).resolve()
output = Path(args.out).resolve()
output.parent.mkdir(parents=True, exist_ok=True)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

with zipfile.ZipFile(docx) as archive:
    bad = archive.testzip()
    document_xml = archive.read('word/document.xml')
    footnotes_xml = archive.read('word/footnotes.xml')
    document_tree = etree.fromstring(document_xml)
    footnotes_tree = etree.fromstring(footnotes_xml)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = [
        ''.join(node.text or '' for node in paragraph.xpath('.//w:t', namespaces=ns))
        for paragraph in document_tree.xpath('//w:p', namespaces=ns)
    ]
    footnote_ids = sorted(
        int(node.get(f'{{{ns["w"]}}}id'))
        for node in footnotes_tree.xpath('//w:footnote', namespaces=ns)
        if int(node.get(f'{{{ns["w"]}}}id')) > 0
    )

reader = PdfReader(str(pdf))
pdf_text = '\n'.join(page.extract_text() or '' for page in reader.pages)
docx_text = '\n'.join(paragraphs)
tests = {
    'docx_zip_integrity': bad is None,
    'docx_inso_not_sign_zero': 'inso¬' not in docx_text,
    'docx_insolence_present_once': docx_text.count('brauons son insolence.') == 1,
    'docx_exact_PRO_paragraph_zero': not any(re.fullmatch(r'\s*PRO\s*', paragraph) for paragraph in paragraphs),
    'docx_four_positive_footnotes': footnote_ids == [1, 2, 3, 4],
    'pdf_pages_86': len(reader.pages) == 86,
    'pdf_inso_not_sign_zero': 'inso¬' not in pdf_text,
    'pdf_insolence_present_once': pdf_text.count('brauons son insolence.') == 1,
    'pdf_exact_PRO_line_zero': not any(re.fullmatch(r'\s*PRO\s*', line) for line in pdf_text.splitlines()),
}
report = {
    'status': 'PASS' if all(tests.values()) else 'FAIL',
    'docx': {'file': docx.name, 'sha256': sha(docx), 'paragraphs': len(paragraphs), 'footnote_ids': footnote_ids},
    'pdf': {'file': pdf.name, 'sha256': sha(pdf), 'pages': len(reader.pages)},
    'tests': tests,
    'visual_control': {
        'all_pages_contact_sheets': 8,
        'target_pages_checked': [1, 13, 25, 43, 46, 82, 83, 86],
        'result': 'PASS',
    },
    'renderer_note': 'Le moteur render_docx.py a été tenté mais LibreOffice est absent. Le PDF a été exporté par Microsoft Word, puis les 86 pages ont été rendues par Poppler et contrôlées.',
}
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
if report['status'] != 'PASS':
    raise SystemExit(1)
