"""Ep. 2 storyboard: key frame of every shot taken from the rendered picture master + shot list markdown/json."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia, numpy as np
from PIL import Image
import ep02_timeline as TL
from ep02_shot_meta import META
from engine.core import new_surface, save_png, hexc, fill, font, draw_text

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SB = os.path.join(ROOT, "ep02", "storyboard")
PIC = os.path.join(ROOT, "renders", "ep02", "ep02_picture_master.mp4")
os.makedirs(os.path.join(SB, "frames"), exist_ok=True)
KEY = {"S07": 21.95, "S16": 52.69, "S19": 58.7, "S20": 61.5}


def grab(t, path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", PIC, "-frames:v", "1", "-vf", "scale=540:960", path], check=True)


lines_by_shot = {}
for lid, L in TL.LINES.items():
    for sid, a, b, _ in TL.SHOTS:
        if a <= L["t"] < b:
            lines_by_shot.setdefault(sid, []).append(lid)
text = {lid: t for lid, t, _, _ in TL.SUBTITLES}
rows = []
for sid, a, b, desc in TL.SHOTS:
    grab(KEY.get(sid, (a + b) / 2), os.path.join(SB, "frames", f"{sid}.png"))
    m = META[sid]
    rows.append(dict(id=sid, start=a, end=b, duration=round(b - a, 2), description=desc, location=m[0], characters=m[1],
                     shot_type=m[2], camera_position=m[3], camera_move=m[4], action=m[5], emotion=m[6],
                     dialogue=[f"{TL.LINES[l]['who']}: {text[l]}" for l in lines_by_shot.get(sid, [])], sfx=m[7],
                     lighting=m[8], transition=m[9],
                     method="процедурная 2.5D-анимация (skia, риг scripts/engine/rig2.py, стандарт серии), нативные 60 fps",
                     source=f"scripts/ep02_shots.py::{sid.lower()}", keyframe=f"ep02/storyboard/frames/{sid}.png"))
json.dump(rows, open(os.path.join(SB, "shot_list.json"), "w"), ensure_ascii=False, indent=1)


def tc(t): return f"{int(t // 60):02d}:{t % 60:05.2f}"


md = [f"# Серия 02 «{TL.TITLE}» — раскадровка и shot list", "",
      f"Хронометраж: {TL.DURATION:.2f} с · 1080×1920 · 60 fps · {len(rows)} планов · кадры взяты из renders/ep02/ep02_picture_master.mp4", ""]
for r in rows:
    md += [f"## {r['id']} · {tc(r['start'])}–{tc(r['end'])} ({r['duration']} с) — {r['description']}", "",
           f"![{r['id']}](frames/{r['id']}.png)", "",
           f"- **Локация:** {r['location']}", f"- **Персонажи:** {r['characters']}",
           f"- **План:** {r['shot_type']} · **Камера:** {r['camera_position']} · **Движение:** {r['camera_move']}",
           f"- **Действие:** {r['action']}", f"- **Эмоции:** {r['emotion']}",
           f"- **Диалог:** {' / '.join(r['dialogue']) if r['dialogue'] else '—'}",
           f"- **Звук:** {r['sfx']}", f"- **Свет:** {r['lighting']}", f"- **Переход:** {r['transition']}",
           f"- **Способ:** {r['method']} · **Исходник:** `{r['source']}`", ""]
open(os.path.join(SB, "storyboard.md"), "w").write("\n".join(md))
cols, tw, th = 5, 300, 533
rws = (len(rows) + cols - 1) // cols
SW, SH = cols * (tw + 24) + 24, rws * (th + 120) + 140
s = new_surface(SW, SH)
c = s.getCanvas()
c.drawRect(skia.Rect.MakeWH(SW, SH), fill(hexc("#16141b")))
draw_text(c, f"СЕРИЯ 02 «{TL.TITLE}» · раскадровка", 24, 80, font("russo", 48), hexc("#fff"))
for i, r in enumerate(rows):
    x = 24 + (i % cols) * (tw + 24)
    y = 120 + (i // cols) * (th + 120)
    im = Image.open(os.path.join(SB, "frames", r["id"] + ".png")).convert("RGBA").resize((tw, th), Image.LANCZOS)
    c.drawImage(skia.Image.fromarray(np.asarray(im)), x, y)
    draw_text(c, f"{r['id']}  {tc(r['start'])}  {r['duration']}с", x, y + th + 34, font("rubik", 26, 600), hexc("#fff"))
    d, f = r["description"], font("rubik", 20, 400)
    while f.measureText(d) > tw and len(d) > 4:
        d = d[:-2]
    if d != r["description"]:
        d = d[:-1] + "…"
    draw_text(c, d, x, y + th + 66, f, hexc("#aab"))
save_png(s, os.path.join(SB, "storyboard_sheet.png"))
print("storyboard ok")
