from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--per-sheet", type=int, default=12)
args = parser.parse_args()

source = Path(args.input).resolve()
target = Path(args.output).resolve()
target.mkdir(parents=True, exist_ok=True)
pages = sorted(source.glob("*.png"), key=lambda item: int("".join(filter(str.isdigit, item.stem)) or 0))
if not pages:
    raise SystemExit("Aucune page PNG.")

columns = 4
rows = (args.per_sheet + columns - 1) // columns
thumb_w, thumb_h = 280, 395
label_h = 25
font = ImageFont.load_default()
for sheet_index in range(0, len(pages), args.per_sheet):
    subset = pages[sheet_index:sheet_index + args.per_sheet]
    canvas = Image.new("RGB", (columns * thumb_w, rows * (thumb_h + label_h)), "#dddddd")
    draw = ImageDraw.Draw(canvas)
    for local_index, page in enumerate(subset):
        with Image.open(page) as image:
            image = image.convert("RGB")
            image.thumbnail((thumb_w - 8, thumb_h - 8), Image.Resampling.LANCZOS)
            x = (local_index % columns) * thumb_w + (thumb_w - image.width) // 2
            y = (local_index // columns) * (thumb_h + label_h) + 4
            canvas.paste(image, (x, y))
        label = f"page Word {sheet_index + local_index + 1} — {page.name}"
        draw.text(((local_index % columns) * thumb_w + 6, (local_index // columns) * (thumb_h + label_h) + thumb_h + 4), label, fill="black", font=font)
    output = target / f"contact_{sheet_index + 1:03d}_{sheet_index + len(subset):03d}.png"
    canvas.save(output, optimize=True)
print(f"{len(pages)} pages, {(len(pages) + args.per_sheet - 1) // args.per_sheet} planches")
