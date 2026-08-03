from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent / "qa-master-render-final-2026-08-02"
pages = sorted(ROOT.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
out = ROOT / "planches"
out.mkdir(exist_ok=True)
for start in range(0, len(pages), 12):
    group = pages[start:start + 12]
    sheet = Image.new("RGB", (1200, 1600), "white")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(group):
        image = Image.open(path).convert("RGB")
        image.thumbnail((280, 360))
        x = 10 + (index % 4) * 300 + (280 - image.width) // 2
        y = 28 + (index // 4) * 520
        sheet.paste(image, (x, y))
        draw.text((10 + (index % 4) * 300, y - 20), f"page {start + index + 1}", fill="black")
    sheet.save(out / f"planche-{start + 1:03d}-{start + len(group):03d}.jpg", quality=88)
print(f"{len(pages)} pages, {len(list(out.glob('*.jpg')))} planches")
