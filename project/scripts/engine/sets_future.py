"""Locations for later episodes (reference versions, same drawing language as engine/sets.py)."""
import math
import random

import skia

from .core import W, H, lerp, hexc, with_alpha, shade, fill, stroke, radial, linear, path_poly, rrect, font, draw_text
from .sets import draw_plant, draw_mug, draw_lamp, glow


def stairwell(c, t=0.0):
    """ПОДЪЕЗД: grey-blue walls, cold light, identical doors in perspective, door 048."""
    vx, vy = 540, 860
    c.drawRect(skia.Rect.MakeWH(W, H), fill(hexc("#2a3442")))
    ex0, ey0, ex1, ey1 = 420, 640, 660, 1080
    c.drawPath(path_poly([(0, 0), (W, 0), (ex1, ey0), (ex0, ey0)]), fill(hexc("#1c2430")))
    c.drawPath(path_poly([(0, 0), (ex0, ey0), (ex0, ey1), (0, H)]), fill(0, shader=linear(0, 0, ex0, 0, [hexc("#3a4656"), hexc("#56657a")])))
    c.drawPath(path_poly([(W, 0), (ex1, ey0), (ex1, ey1), (W, H)]), fill(0, shader=linear(W, 0, ex1, 0, [hexc("#36404f"), hexc("#526075")])))
    c.drawPath(path_poly([(0, H), (ex0, ey1), (ex1, ey1), (W, H)]), fill(0, shader=linear(0, ey1, 0, H, [hexc("#4a4f55"), hexc("#23262b")])))
    c.drawRect(skia.Rect.MakeLTRB(ex0, ey0, ex1, ey1), fill(hexc("#5c6a7e")))
    # paint line (lower wall darker green-grey, Soviet style)
    for side in (-1, 1):
        xa, xb = (0, ex0) if side < 0 else (W, ex1)
        c.drawPath(path_poly([(xa, 1180), (xb, lerp(ey0, ey1, 0.55)), (xb, ey1), (xa, H)]), fill(with_alpha(hexc("#2f4a48"), 0.85)))
    # doors on both walls (receding)
    nums = ["044", "046", "048", "045", "047"]
    for k, (u, side, num) in enumerate([(0.08, -1, "044"), (0.45, -1, "046"), (0.72, 1, "048"), (0.2, 1, "045"), (0.55, 1, "047")]):
        def P(uu, hh):
            xa = 0 if side < 0 else W
            xb = ex0 if side < 0 else ex1
            x = lerp(xa, xb, uu)
            top = lerp(0, ey0, uu)
            bot = lerp(H, ey1, uu)
            return x, lerp(bot, top, hh)
        w = 0.16 * (1 - u * 0.5)
        pts = [P(u, 0.62), P(u + w, 0.62), P(u + w, 0.0), P(u, 0.0)]
        col = "#3a2a20" if num != "048" else "#5a1e1e"
        c.drawPath(path_poly(pts), fill(hexc(col)))
        c.drawPath(path_poly(pts), stroke(hexc("#14100c"), 4))
        cx, cy = P(u + w * 0.5, 0.52)
        sz = 40 * (1 - u * 0.7) * (1.6 if num == "048" else 1)
        draw_text(c, num, cx, cy, font("russo", sz), hexc("#e8d8a0" if num == "048" else "#b0a080"), align="center")
    # ceiling lamps
    for u in (0.15, 0.5, 0.8):
        x, y = 540, lerp(0, ey0, u) + 20
        c.drawOval(skia.Rect.MakeXYWH(x - 60 * (1 - u * 0.6), y - 10, 120 * (1 - u * 0.6), 20), fill(hexc("#dfe9ff")))
        c.drawCircle(x, y + 150, 480 * (1 - u * 0.5), fill(0, shader=radial(x, y + 150, 480 * (1 - u * 0.5), [with_alpha(hexc("#a8c0ff"), 0.22), with_alpha(hexc("#a8c0ff"), 0)]), blend=skia.BlendMode.kPlus))


def street(c, t=0.0):
    """УЛИЦА: stylised evening city, neon signs, silhouettes, wet reflections."""
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, 1200, [hexc("#070b1c"), hexc("#1a1f4a"), hexc("#3a2a5a")])))
    rnd = random.Random(3)
    for layer, (base, dark) in enumerate([(1100, "#141832"), (1200, "#0e1126")]):
        x = -40
        while x < W + 40:
            bw = rnd.randint(110, 230)
            bh = rnd.randint(380, 900) - layer * 100
            c.drawRect(skia.Rect.MakeLTRB(x, base - bh, x + bw, base + 400), fill(hexc(dark)))
            for yy in range(base - bh + 30, base, 46):
                for xx in range(x + 14, x + bw - 14, 30):
                    if rnd.random() < 0.3:
                        c.drawRect(skia.Rect.MakeXYWH(xx, yy, 12, 20), fill(with_alpha(hexc(rnd.choice(["#ffd27a", "#9fc4ff", "#ff8fd8"])), 0.75)))
            x += bw + rnd.randint(6, 30)
    # neon signs
    for (x, y, txt, col) in [(180, 820, "КАФЕ", "#ff4fd8"), (760, 700, "24/7", "#3ad6ff"), (560, 980, "АПТЕКА", "#4cff8a")]:
        f = font("russo", 64)
        c.drawString(txt, x - f.measureText(txt) / 2, y, f, fill(with_alpha(hexc(col), 0.6), blur=18))
        draw_text(c, txt, x, y, f, hexc(col), align="center")
    # street + wet reflections
    c.drawRect(skia.Rect.MakeLTRB(0, 1300, W, H), fill(0, shader=linear(0, 1300, 0, H, [hexc("#1a1c2c"), hexc("#0a0b12")])))
    for (x, col) in [(180, "#ff4fd8"), (760, "#3ad6ff"), (560, "#4cff8a")]:
        c.drawRect(skia.Rect.MakeXYWH(x - 50, 1320, 100, 520), fill(0, shader=linear(0, 1320, 0, 1840, [with_alpha(hexc(col), 0.35), with_alpha(hexc(col), 0)]), blur=12))
    c.drawRect(skia.Rect.MakeLTRB(0, 1290, W, 1320), fill(hexc("#3a3c4a")))
    # passers-by silhouettes
    for (x, s_) in [(300, 0.9), (420, 0.75), (900, 1.0)]:
        c.drawCircle(x, 1080 - 60 * s_, 46 * s_, fill(hexc("#05060c")))
        c.drawRRect(rrect(x - 40 * s_, 1080 - 15 * s_, 80 * s_, 160 * s_, 30 * s_), fill(hexc("#05060c")))
        c.drawRect(skia.Rect.MakeXYWH(x - 28 * s_, 1220, 20 * s_, 80 * s_), fill(hexc("#05060c")))
        c.drawRect(skia.Rect.MakeXYWH(x + 8 * s_, 1220, 20 * s_, 80 * s_), fill(hexc("#05060c")))
    # street lamp
    c.drawLine(980, 1300, 980, 520, stroke(hexc("#1a1c26"), 16))
    c.drawLine(980, 520, 880, 520, stroke(hexc("#1a1c26"), 12))
    glow(c, 880, 540, 260, hexc("#ffcf8a"), 0.6)


def cafe(c, t=0.0):
    """КАФЕ: wooden counter, warm lamps, coffee machine, small tables, big window."""
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [hexc("#2a1a12"), hexc("#5a3a26"), hexc("#2a1a10")])))
    # big window (left)
    c.drawRect(skia.Rect.MakeLTRB(40, 300, 420, 1100), fill(0, shader=linear(0, 300, 0, 1100, [hexc("#0e1430"), hexc("#2a2a5a")])))
    for i in range(14):
        c.drawCircle(80 + (i * 97) % 320, 420 + (i * 173) % 600, 10 + (i % 3) * 6, fill(with_alpha(hexc(["#ffcf8a", "#ff6fd8", "#7fd0ff"][i % 3]), 0.55), blur=6))
    c.drawRect(skia.Rect.MakeLTRB(40, 300, 420, 1100), stroke(hexc("#1c120c"), 18))
    c.drawLine(230, 300, 230, 1100, stroke(hexc("#1c120c"), 12))
    # menu board + shelves
    c.drawRRect(rrect(520, 260, 480, 300, 16), fill(hexc("#16201a")))
    for i, ln in enumerate(["ЭСПРЕССО  150", "КАПУЧИНО  220", "ЛАТТЕ  240", "КАК ОБЫЧНО?  ?"]):
        draw_text(c, ln, 560, 330 + i * 62, font("rubik", 40, 500), hexc("#efe6d0"))
    for y in (640, 760):
        c.drawRect(skia.Rect.MakeXYWH(520, y, 480, 14), fill(hexc("#6a4a32")))
        for k in range(6):
            c.drawRRect(rrect(540 + k * 76, y - 70, 52, 70, 10), fill(hexc(["#e8e2d6", "#c45a3a", "#3a6a8a"][k % 3])))
    # coffee machine
    c.drawRRect(rrect(560, 860, 300, 260, 24), fill(0, shader=linear(560, 0, 860, 0, [hexc("#d9dde3"), hexc("#7a828e")])))
    c.drawRRect(rrect(600, 900, 220, 90, 14), fill(hexc("#2a2e36")))
    draw_mug(c, 700, 1120, 1.0, t, 1.0, "#f2f2f2")
    # counter
    c.drawRect(skia.Rect.MakeLTRB(460, 1120, W, 1160), fill(hexc("#c08a5a")))
    c.drawRect(skia.Rect.MakeLTRB(470, 1160, W, 1600), fill(0, shader=linear(0, 1160, 0, 1600, [hexc("#8a5a34"), hexc("#4a2e1a")])))
    for x in range(500, W, 90):
        c.drawLine(x, 1170, x, 1590, stroke(with_alpha(hexc("#000"), 0.2), 3))
    # small table + floor
    c.drawRect(skia.Rect.MakeLTRB(0, 1600, W, H), fill(0, shader=linear(0, 1600, 0, H, [hexc("#4a3020"), hexc("#20140c")])))
    c.drawOval(skia.Rect.MakeXYWH(80, 1300, 300, 60), fill(hexc("#8a5a34")))
    c.drawRect(skia.Rect.MakeXYWH(220, 1330, 20, 300), fill(hexc("#3a2414")))
    draw_mug(c, 230, 1330, 0.7, t, 0.8)
    # warm pendant lamps
    for x in (250, 700, 950):
        draw_lamp(c, x, 200 + (x % 3) * 20, 1.0, 0.6, cord_top=-20)


def observation_room(c, t=0.0):
    """КОМНАТА НАБЛЮДЕНИЯ: dark blue, wall of monitors, glowing UI, red system warnings."""
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [hexc("#03060f"), hexc("#0a1530"), hexc("#02040a")])))
    rnd = random.Random(11)
    for r in range(4):
        for k in range(3):
            x, y = 70 + k * 320, 260 + r * 270
            red = (r, k) in ((1, 2), (3, 0))
            col = "#ff2a3a" if red else "#3aa0ff"
            c.drawRRect(rrect(x - 10, y - 10, 300, 230, 12), fill(hexc("#0a0d18")))
            c.drawRRect(rrect(x, y, 280, 210, 8), fill(with_alpha(hexc(col), 0.18)))
            for j in range(6):
                c.drawRect(skia.Rect.MakeXYWH(x + 20, y + 24 + j * 28, rnd.randint(60, 240), 8), fill(with_alpha(hexc(col), 0.6)))
            if red:
                draw_text(c, "ПРЕДУПРЕЖДЕНИЕ", x + 140, y + 200, font("rubik", 26, 700), hexc("#ff4a5a"), align="center")
            else:
                # tiny stickman feed (the experiment)
                c.drawCircle(x + 210, y + 120, 26, fill(with_alpha(hexc("#cfe6ff"), 0.8)))
                c.drawRect(skia.Rect.MakeXYWH(x + 198, y + 146, 24, 50), fill(with_alpha(hexc("#cfe6ff"), 0.8)))
            glow(c, x + 140, y + 105, 240, hexc(col), 0.12)
    # desk + chair silhouette
    c.drawRect(skia.Rect.MakeLTRB(0, 1420, W, 1480), fill(hexc("#121a2e")))
    c.drawRect(skia.Rect.MakeLTRB(0, 1480, W, H), fill(hexc("#05070e")))
    c.drawRRect(rrect(400, 1180, 280, 320, 60), fill(hexc("#04060c")))
    c.drawCircle(540, 1120, 110, fill(hexc("#060a16")))
    c.drawCircle(540, 1120, 110, stroke(with_alpha(hexc("#3d7bff"), 0.7), 6, blur=4))
    for ex in (-36, 36):
        c.drawOval(skia.Rect.MakeXYWH(540 + ex - 20, 1110, 40, 18), fill(hexc("#bfe3ff")))
        glow(c, 540 + ex, 1119, 60, hexc("#3aa0ff"), 0.6)


def white_room(c, t=0.0):
    """БЕЛАЯ КОМНАТА: finale — seamless white space, ring light, one small figure."""
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(540, 900, 1300, [hexc("#ffffff"), hexc("#d9dde6"), hexc("#a9afbd")])))
    c.drawOval(skia.Rect.MakeXYWH(240, 260, 600, 90), stroke(hexc("#ffffff"), 26))
    glow(c, 540, 305, 420, hexc("#ffffff"), 0.6)
    c.drawRect(skia.Rect.MakeLTRB(0, 1250, W, H), fill(0, shader=linear(0, 1250, 0, H, [hexc("#e9ecf2"), hexc("#c9cdd6")])))
    c.drawOval(skia.Rect.MakeXYWH(440, 1265, 200, 30), fill(with_alpha(hexc("#000"), 0.25), blur=10))


FUTURE_SETS = [("ПОДЪЕЗД", "Неожиданные встречи, двери в другие реальности, кв. 048", stairwell),
               ("УЛИЦА", "Сцены с девочкой, неоновые вывески, важные открытия", street),
               ("КАФЕ", "Подсказки и бариста: «как обычно?»", cafe),
               ("КОМНАТА НАБЛЮДЕНИЯ", "Кто-то следит: это эксперимент", observation_room),
               ("БЕЛАЯ КОМНАТА", "Финальные сцены и возможный выход из системы", white_room)]
