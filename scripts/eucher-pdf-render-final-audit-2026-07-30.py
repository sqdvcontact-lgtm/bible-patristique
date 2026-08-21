from pathlib import Path
import pdfplumber

source = Path(r"D:\OneDrive\Bureau\Du_mépris_du_monde.pdf")
out = Path(r"C:\Corpus Scriptura\bible-patristique\tmp\pdfs\eucher-final-audit")
out.mkdir(parents=True, exist_ok=True)
with pdfplumber.open(source) as document:
    for page_number in (32, 44, 100):
        image = document.pages[page_number - 1].to_image(resolution=180, antialias=True)
        image.save(out / f"page-{page_number:03d}.png")
        print(out / f"page-{page_number:03d}.png")
    page = document.pages[31]
    page.to_image(resolution=600, antialias=True).save(out / "page-032-600dpi.png")
    print(out / "page-032-600dpi.png")
