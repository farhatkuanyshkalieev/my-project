"""Tile QA stills into one labelled contact sheet: python3 scripts/sheet.py out/qa out/sheet.jpg [cols]"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
files = sorted(glob.glob(os.path.join(sys.argv[1], "*.jpg")))
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
w, h = 360, 640
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "black")
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((w, h))
    d = ImageDraw.Draw(im)
    label = os.path.basename(f)[1:-4]
    d.rectangle([0, 0, 90, 30], fill="black")
    d.text((6, 3), label, fill="yellow", font=font)
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(sys.argv[2], quality=85)
