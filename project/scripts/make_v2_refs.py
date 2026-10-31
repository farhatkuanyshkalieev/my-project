"""V2 («concept») reference images: character sheets + set plates, rendered by rig2/sets2 + look post."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, skia
from PIL import Image
from engine.core import W, H, new_surface, surface_rgba, hexc, fill, stroke, radial, linear, font, draw_text, with_alpha, rrect
from engine.rig2 import RIGS2, CONCEPT
from engine.rig import emotion
from engine import sets2 as S2
from engine.sets import K
from engine.look import concept_look

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_C = os.path.join(ROOT, "characters", "v2"); OUT_B = os.path.join(ROOT, "backgrounds", "v2")
os.makedirs(OUT_C, exist_ok=True); os.makedirs(OUT_B, exist_ok=True)

INFO = {"arman": ("АРМАН · v2 «concept»", "Матово-чёрная голова · тёплый золотой контур · белые тонкие брови · «подозрительные» глаза · чёрная рубашка, бежевый галстук"),
        "double": ("ДВОЙНИК · v2 «concept»", "Тот же силуэт · красный контур и ореол · бело-красные светящиеся глаза · тёмно-красный галстук"),
        "mom": ("МАМА · v2 «concept»", "Фарфоровое лицо · тёмно-каштановый пучок, пробор, пряди у висков · уши · аниме-глаза · бежевый верх, графитовый фартук")}
BG = {"arman": ("#3a2a20", "#120c08", (0.8, -0.6), None), "double": ("#2a0c0c", "#070303", (0, -1), None),
      "mom": ("#5a3a22", "#1a110b", (0.6, -0.8), None)}
RULES = {"arman": ["ПРАВИЛА:", "голова — круг R; рост ≈ 5.3R; торс 1.25R;", "шея короткая, голова сидит на воротнике;",
                   "глаза в нижней половине головы,", "верхнее веко срезает 16% (двойник 33%);", "контур — цвет ключевого света сцены;",
                   "руки — крупные перчатки с пальцами."],
         "mom": ["ПРАВИЛА:", "пробор по центру, пучок сзади-сверху;", "пряди у висков, уши видны;", "глаза большие, тёмно-карие, с ресницами;",
                 "фартук графитовый поверх бежевого;", "контур тёплый, мягкий."]}
SOURCE = "Источник: references/concept/original_concept.png + references/v2/ai_canva/*"
SUFFIX = "v2_reference_sheet"
EMOS = [("neutral", "нейтрально"), ("joy", "радость"), ("surprise", "удивление"), ("fear", "страх"),
        ("irritation", "раздражение"), ("suspicion", "подозрение")]


def sheet(name):
    SW, SH = 2400, 2000
    s = new_surface(SW, SH); c = s.getCanvas()
    top, bot, rim_dir, _ = BG[name]
    c.drawRect(skia.Rect.MakeWH(SW, SH), fill(0, shader=radial(SW * 0.35, 700, 1700, [hexc(top), hexc(bot)])))
    rig = RIGS2[name]
    views = [("СПЕРЕДИ", dict(bt=0, ht=0.08)), ("3/4", dict(bt=0.45, ht=0.45)), ("СБОКУ", dict(bt=0.95, ht=0.93)),
             ("СЗАДИ", dict(bt=0, ht=0, back=True))]
    for i, (lb, v) in enumerate(views):
        x = 250 + i * 360
        e = emotion("joy", squint=0.95, smile=0.7, mouth_open=0) if name == "mom" and i == 0 else emotion("neutral", smile=0.3 if name == "mom" else 0)
        rig.draw(c, dict(x=x, y=760, s=1.25, rim_dir=rim_dir, key=(-0.3, -0.7), warm=1, look=(0.5, 0.05) if name == "arman" else (0, 0.1), **v, **e))
    for i, (e, lb) in enumerate(EMOS):
        x = 200 + i * 330
        c.save(); c.clipRect(skia.Rect.MakeXYWH(x - 160, 1180, 320, 440))
        es = 1.2 / CONCEPT[name]["height"]   # emotion heads at the same on-sheet size for every character
        rig.draw(c, dict(x=x, y=1780 - (40 if CONCEPT[name].get("child") else 0), s=es, ht=0.12 if i % 2 else -0.12, rim_dir=rim_dir,
                         key=(-0.3, -0.7), warm=1, **emotion(e)), passes=("body", "head"))
        c.restore()
    img = concept_look(surface_rgba(s)[:, :, :3], warm=0.0 if name == "double" else 1.0, cold=0.3 if name == "double" else 0.0, grain=0.02)
    s2 = new_surface(SW, SH); c2 = s2.getCanvas()
    c2.drawImage(skia.Image.fromarray(np.dstack([img, np.full(img.shape[:2], 255, np.uint8)])), 0, 0)
    t, d = INFO[name]
    draw_text(c2, t, 70, 110, font("russo", 72), hexc("#ffffff"))
    draw_text(c2, d, 72, 165, font("rubik", 30, 400), hexc("#d0c7bd"))
    for i, (lb, v) in enumerate(views):
        draw_text(c2, lb, 250 + i * 360, 1100, font("rubik", 30, 600), hexc("#d0c7bd"), align="center")
    for i, (e, lb) in enumerate(EMOS):
        draw_text(c2, lb, 200 + i * 330, 1660, font("rubik", 30, 500), hexc("#d0c7bd"), align="center")
    # palette
    cs = CONCEPT[name]
    keys = [k for k in ("head", "rim", "eye", "brow", "iris", "hair", "shirt", "tie", "apron", "pants", "shoes") if cs.get(k)]
    draw_text(c2, "ПАЛИТРА", 1720, 300, font("rubik", 30, 700), hexc("#ffffff"))
    for j, k in enumerate(keys):
        col = cs[k][1] if isinstance(cs[k], tuple) else cs[k]
        y = 330 + j * 52
        c2.drawRRect(rrect(1720, y, 64, 40, 8), fill(hexc(col))); c2.drawRRect(rrect(1720, y, 64, 40, 8), stroke(with_alpha(hexc("#fff"), 0.35), 2))
        draw_text(c2, f"{k}  {col}", 1800, y + 30, font("rubik", 28, 400), hexc("#d0c7bd"))
    rules = RULES.get(name, RULES["arman"])
    for j, r in enumerate(rules):
        draw_text(c2, r, 1720, 980 + j * 42, font("rubik", 27, 600 if j == 0 else 400), hexc("#c9c0b6"))
    draw_text(c2, SOURCE, 70, 1950, font("rubik", 24, 400), hexc("#8a8178"))
    s2.makeImageSnapshot().save(os.path.join(OUT_C, f"{name}_{SUFFIX}.png"), skia.kPNG)


def plate(fn, path, warm=1.0, cold=0.0):
    s = new_surface(); c = s.getCanvas(); fn(c)
    Image.fromarray(concept_look(surface_rgba(s)[:, :, :3], warm=warm, cold=cold)).save(path)


if __name__ == "__main__":
    for n in ("arman", "double", "mom"):
        sheet(n); print("sheet", n)
    plate(lambda c: S2.kitchen_north_v2(c, 8.0, 1.0), os.path.join(OUT_B, "kitchen_v2_wide.png"))
    plate(lambda c: S2.kitchen_west_v2_bg(c, 8.0, 1.0), os.path.join(OUT_B, "kitchen_v2_behind_arman.png"))
    plate(lambda c: S2.corridor_v2(c, 0.0, 1.0, red=0.3), os.path.join(OUT_B, "corridor_v2.png"), warm=0.3, cold=1.0)
    print("plates ok")
