from pathlib import Path
import re
import sys
import pdfplumber

sys.stdout.reconfigure(encoding="utf-8")

PDF = Path(r"D:\OneDrive\Bureau\Du_mépris_du_monde.pdf")
patterns = [
    re.compile(r"2\.?\s*Cor", re.I),
    re.compile(r"Eph\.?\s*6", re.I),
    re.compile(r"Malach", re.I),
    re.compile(r"aimer encore", re.I),
    re.compile(r"fin de n[oô]tre course|fin de nostre course", re.I),
    re.compile(r"gressus|rectos|pedibus|cursus", re.I),
    re.compile(r"disceſſ|discess|exitum|propheta|pr[aeæ]par", re.I),
]

with pdfplumber.open(PDF) as pdf:
    print(f"pages={len(pdf.pages)}")
    for page_number, page in enumerate(pdf.pages, 1):
        text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
        flat = re.sub(r"\s+", " ", text)
        if any(pattern.search(flat) for pattern in patterns):
            print(f"\n=== PDF page {page_number} ===")
            for pattern in patterns:
                for match in pattern.finditer(flat):
                    start = max(0, match.start() - 260)
                    end = min(len(flat), match.end() + 420)
                    print(flat[start:end])
