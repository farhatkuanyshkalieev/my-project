"""Environment reference sheets: every location rendered by the production set code (backgrounds/*.png)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia
from PIL import Image
from engine.core import W, H, new_surface, save_png, hexc, fill, stroke, font, draw_text, linear, rrect, with_alpha
from engine import sets as S
from engine.sets_future import FUTURE_SETS
import ep01_shots as E

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BG = os.path.join(ROOT, "backgrounds")


def render(fn, name):
    s = new_surface()
    c = s.getCanvas()
    fn(c)
    S.vignette(c, 0.45)
    save_png(s, os.path.join(BG, name + ".png"))
    return os.path.join(BG, name + ".png")


panels = [
    ("КУХНЯ · ОБЩИЙ (север)", "Главная локация S1. Стол, 2 стула, красная кружка, лампа, окно, часы 23:17, проход в коридор",
     render(lambda c: E.north_world(c, 8.0, 1.0, 0.1), "apartment_kitchen_north_wide")),
    ("КУХНЯ · ВОСТОК (за мамой)", "Шкафы, чайник, фартук-плитка. Реверс для КП мамы",
     render(lambda c: E.east_world(c, 8.0, 1.0, 0.1, mom=None, cam_args=(540, 1180, 1.0), fg_arman=False, bg_blur=0), "apartment_kitchen_east")),
    ("КУХНЯ · ЗАПАД (за Арманом)", "Семейное фото, вешалка, тёмный проход в коридор справа",
     render(lambda c: E.west_world(c, 8.0, 1.0, 0.1, None, cam_args=(540, 1200, 1.0), fg_mom=False, bg_blur=0), "apartment_kitchen_west")),
    ("КОРИДОР КВАРТИРЫ", "Входная дверь, дорожка, холодная лампа. Место двойника",
     render(lambda c: (c.drawPicture(S.pic_corridor()), S.corridor_lights(c, 0, 1.0, red=0.25)), "apartment_corridor")),
]
for title, desc, fn in FUTURE_SETS:
    slug = {"ПОДЪЕЗД": "stairwell_048", "УЛИЦА": "street_night", "КАФЕ": "cafe", "КОМНАТА НАБЛЮДЕНИЯ": "observation_room",
            "БЕЛАЯ КОМНАТА": "white_room"}[title]
    panels.append((title, desc, render(lambda c, fn=fn: fn(c, 1.0), slug)))

# contact sheet 3 columns
cols, pw, ph = 3, 540, 960
rows = (len(panels) + cols - 1) // cols
SW, SH = cols * (pw + 40) + 40, rows * (ph + 170) + 200
s = new_surface(SW, SH)
c = s.getCanvas()
c.drawRect(skia.Rect.MakeWH(SW, SH), fill(0, shader=linear(0, 0, 0, SH, [hexc("#211d26"), hexc("#121016")])))
draw_text(c, "ЛОКАЦИИ · environment reference sheet", 40, 100, font("russo", 64), hexc("#ffffff"))
draw_text(c, "«ТЕБЯ ЗДЕСЬ НЕ БЫЛО» · фиксированная география: все кадры рисуются из этих сетов", 42, 150, font("rubik", 30, 400), hexc("#9aa2b6"))
for i, (title, desc, path) in enumerate(panels):
    x = 40 + (i % cols) * (pw + 40)
    y = 200 + (i // cols) * (ph + 170)
    im = Image.open(path).convert("RGBA").resize((pw, ph), Image.LANCZOS)
    img = skia.Image.fromarray(__import__("numpy").asarray(im))
    c.drawImage(img, x, y)
    c.drawRect(skia.Rect.MakeXYWH(x, y, pw, ph), stroke(with_alpha(hexc("#ffffff"), 0.2), 2))
    draw_text(c, title, x, y + ph + 50, font("russo", 34), hexc("#ffffff"))
    words, line, ly = desc.split(), "", y + ph + 92
    f = font("rubik", 24, 400)
    for wd in words:
        if f.measureText(line + " " + wd) > pw:
            draw_text(c, line, x, ly, f, hexc("#aab")); line, ly = wd, ly + 32
        else:
            line = (line + " " + wd).strip()
    draw_text(c, line, x, ly, f, hexc("#aab"))
save_png(s, os.path.join(ROOT, "references", "environment_reference_sheet.png"))
print("ok", len(panels))
