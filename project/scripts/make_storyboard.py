"""Storyboard: key frame of every shot (rendered by the production renderer) + shot list markdown/json."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia, numpy as np
from PIL import Image
import ep01_timeline as TL
from shot_meta import META
from ep01_shots import render_frame
from engine.core import new_surface, save_png, hexc, fill, stroke, font, draw_text, linear, with_alpha

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SB = os.path.join(ROOT, "storyboard")
os.makedirs(os.path.join(SB, "frames"), exist_ok=True)
KEY = {"S01": 2.2, "S02": 9.3, "S09": 25.95, "S12": 31.3, "S16": 44.0, "S17": 47.2, "S18": 50.5, "S20": 54.75, "S21": 58.9, "S23": 62.5}
lines_by_shot = {}
for lid, L in TL.LINES.items():
    for sid, a, b, _ in TL.SHOTS:
        if a <= L["t"] < b:
            lines_by_shot.setdefault(sid, []).append(lid)
text = {lid: t for lid, t, _, _ in TL.SUBTITLES}
rows = []
for sid, a, b, desc in TL.SHOTS:
    T = KEY.get(sid, (a + b) / 2)
    im = Image.fromarray(render_frame(T)[:, :, :3].copy())
    p = os.path.join(SB, "frames", f"{sid}.png")
    im.resize((540, 960), Image.LANCZOS).save(p)
    m = META[sid]
    rows.append(dict(id=sid, start=a, end=b, duration=round(b - a, 2), description=desc, location=m[0], characters=m[1],
                     shot_type=m[2], camera_position=m[3], camera_move=m[4], action=m[5], emotion=m[6],
                     dialogue=[f"{TL.LINES[l]['who']}: {text[l]}" for l in lines_by_shot.get(sid, [])], sfx=m[7],
                     lighting=m[8], transition=m[9],
                     method="процедурная 2.5D-анимация (skia, риг scripts/engine/rig.py), нативные 60 fps",
                     source=f"scripts/ep01_shots.py::{sid.lower()}" if sid not in ("S16", "S17", "S18") else "scripts/ep01_shots.py::s16_18",
                     keyframe=f"storyboard/frames/{sid}.png"))
json.dump(rows, open(os.path.join(SB, "shot_list.json"), "w"), ensure_ascii=False, indent=1)
# markdown
def tc(t): return f"{int(t // 60):02d}:{t % 60:05.2f}"
md = ["# Серия 01 «НЕ ОТВЕЧАЙ» — раскадровка и shot list", "",
      f"Хронометраж: {TL.DURATION:.2f} с · 1080×1920 · 60 fps · {len(rows)} кадров", ""]
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
# contact sheet
cols, tw, th = 6, 300, 533
rws = (len(rows) + cols - 1) // cols
SW, SH = cols * (tw + 24) + 24, rws * (th + 120) + 140
s = new_surface(SW, SH)
c = s.getCanvas()
c.drawRect(skia.Rect.MakeWH(SW, SH), fill(hexc("#16141b")))
draw_text(c, "СЕРИЯ 01 «НЕ ОТВЕЧАЙ» · раскадровка", 24, 80, font("russo", 52), hexc("#fff"))
for i, r in enumerate(rows):
    x = 24 + (i % cols) * (tw + 24)
    y = 120 + (i // cols) * (th + 120)
    im = Image.open(os.path.join(SB, "frames", r["id"] + ".png")).convert("RGBA").resize((tw, th), Image.LANCZOS)
    c.drawImage(skia.Image.fromarray(np.asarray(im)), x, y)
    draw_text(c, f"{r['id']}  {tc(r['start'])}  {r['duration']}с", x, y + th + 34, font("rubik", 26, 600), hexc("#fff"))
    d = r["description"]
    f = font("rubik", 20, 400)
    while f.measureText(d) > tw and len(d) > 4:
        d = d[:-2]
    if d != r["description"]:
        d = d[:-1] + "…"
    draw_text(c, d, x, y + th + 66, f, hexc("#aab"))
save_png(s, os.path.join(SB, "storyboard_sheet.png"))
print("storyboard ok")
