from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PAGES = sorted((ROOT / "pages").glob("page-*.png"))
CONTACTS = ROOT / "contacts"
CONTACTS.mkdir(exist_ok=True)

blank = []
near_edge = []
sizes = {}
font = ImageFont.load_default()

thumb_w, thumb_h = 298, 421
cols, rows = 4, 3
sheet_w, sheet_h = cols * thumb_w, rows * (thumb_h + 24)

for start in range(0, len(PAGES), cols * rows):
    sheet = Image.new("RGB", (sheet_w, sheet_h), "white")
    draw = ImageDraw.Draw(sheet)
    for slot, path in enumerate(PAGES[start : start + cols * rows]):
        page_no = start + slot + 1
        with Image.open(path) as im:
            sizes[im.size] = sizes.get(im.size, 0) + 1
            gray = im.convert("L")
            ink = ImageChops.invert(gray).point(lambda p: 255 if p > 24 else 0)
            bbox = ink.getbbox()
            if bbox is None:
                blank.append(page_no)
            else:
                left, top, right, bottom = bbox
                if left < 12 or top < 12 or right > im.width - 12 or bottom > im.height - 12:
                    near_edge.append((page_no, bbox, im.size))
            preview = im.convert("RGB")
            preview.thumbnail((thumb_w, thumb_h))
            x = (slot % cols) * thumb_w
            y = (slot // cols) * (thumb_h + 24)
            sheet.paste(preview, (x, y))
            draw.text((x + 4, y + thumb_h + 5), f"Page {page_no}", fill="black", font=font)
    sheet.save(CONTACTS / f"contact-{start + 1:04d}-{min(start + cols * rows, len(PAGES)):04d}.jpg", quality=88)

print(f"PAGES={len(PAGES)}")
print(f"SIZES={sizes}")
print(f"BLANK={blank}")
print(f"NEAR_EDGE={near_edge}")
print(f"CONTACTS={len(list(CONTACTS.glob('contact-*.jpg')))}")
