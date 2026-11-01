"""Sets v4 — КАФЕ, УЛИЦА, КОМНАТА НАБЛЮДЕНИЯ in the approved series look.
Geography follows the v1 references (backgrounds/cafe.png, street_night.png, observation_room.png and
engine/sets_future.py): café = big window on the left, menu board + shelves + coffee machine + counter on the right,
small table by the window, warm pendant lamps; street = night city, neon КАФЕ / 24/7 / АПТЕКА, wet asphalt, street lamp;
observation room = dark blue, 3×4 wall of monitors, desk. Everything that changes in the story (customers, monitor feeds,
the erasure) is drawn live; the rest is cached as pictures.
"""
import functools
import math
import random

import skia

from .core import W, H, lerp, clamp, hexc, with_alpha, shade, fill, stroke, radial, linear, path_poly, rrect, glow, font, draw_text
from .sets import _record, draw_mug, draw_clock
from .sets2 import lamp_v2, AMBER

NEON = {"pink": "#ff4fd8", "cyan": "#3ad6ff", "green": "#4cff8a"}


def _mottle(c, rect, seed, n=180, col="#000000", a=(0.03, 0.08), r=(8, 40)):
    c.save()
    c.clipRect(rect)
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.uniform(rect.left(), rect.right()), rnd.uniform(rect.top(), rect.bottom())
        c.drawCircle(x, y, rnd.uniform(*r), fill(with_alpha(hexc(col), rnd.uniform(*a)), blur=rnd.uniform(4, 14)))
    c.restore()


# =========================================================================== КАФЕ
WIN = (40, 300, 420, 1100)            # big window (left), as in v1
COUNTER_Y = 1120


def _cafe_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [hexc("#2a1a12"), hexc("#4a3020"), hexc("#21140c")])))
    _mottle(c, skia.Rect.MakeWH(W, H), 51)
    # wainscot
    c.drawRect(skia.Rect.MakeLTRB(0, 1100, W, 1600), fill(0, shader=linear(0, 1100, 0, 1600, [hexc("#3a2414"), hexc("#20140b")])))
    for x in range(0, W, 70):
        c.drawLine(x, 1110, x, 1600, stroke(with_alpha(hexc("#000"), 0.25), 3))
    # menu board + shelves (right)
    c.drawRRect(rrect(520, 260, 480, 300, 16), fill(hexc("#16201a")))
    c.drawRRect(rrect(520, 260, 480, 300, 16), stroke(hexc("#5a3a22"), 10))
    for i, ln in enumerate(["ЭСПРЕССО   150", "КАПУЧИНО   220", "ЛАТТЕ   240", "КАК ОБЫЧНО?   —"]):
        draw_text(c, ln, 560, 330 + i * 62, font("rubik", 38, 500), hexc("#efe6d0" if i < 3 else "#ffb35c"))
    for y in (640, 760):
        c.drawRect(skia.Rect.MakeXYWH(520, y, 480, 14), fill(hexc("#6a4a32")))
        for k in range(6):
            col = hexc(["#e8e2d6", "#c45a3a", "#3a6a8a"][k % 3])
            c.drawRRect(rrect(540 + k * 76, y - 70, 52, 70, 10), fill(col, shader=linear(0, y - 70, 0, y, [shade(col, 1.1), shade(col, 0.6)])))
    # coffee machine
    c.drawRRect(rrect(560, 860, 300, 260, 24), fill(0, shader=linear(560, 0, 860, 0, [hexc("#d9dde3"), hexc("#8a929e"), hexc("#4a505a")])))
    c.drawRRect(rrect(600, 900, 220, 90, 14), fill(hexc("#2a2e36")))
    for k in range(2):
        c.drawRRect(rrect(640 + k * 110, 1000, 40, 60, 8), fill(hexc("#1a1c22")))
    # counter (right)
    c.drawRect(skia.Rect.MakeLTRB(460, COUNTER_Y, W, COUNTER_Y + 40), fill(hexc("#c08a5a")))
    c.drawRect(skia.Rect.MakeLTRB(470, COUNTER_Y + 40, W, 1600), fill(0, shader=linear(0, COUNTER_Y, 0, 1600, [hexc("#8a5a34"), hexc("#3a2414")])))
    for x in range(500, W, 90):
        c.drawLine(x, COUNTER_Y + 50, x, 1590, stroke(with_alpha(hexc("#000"), 0.2), 3))
    # floor
    c.drawRect(skia.Rect.MakeLTRB(0, 1600, W, H), fill(0, shader=linear(0, 1600, 0, H, [hexc("#4a3020"), hexc("#1a0f08")])))
    for i in range(-8, 9):
        c.drawLine(W / 2 + i * 70, 1600, W / 2 + i * 200, H, stroke(with_alpha(hexc("#000"), 0.22), 3))
    # window frame (contents drawn live)
    c.drawRect(skia.Rect.MakeLTRB(*WIN), stroke(hexc("#1c120c"), 18))
    c.drawLine((WIN[0] + WIN[2]) / 2, WIN[1], (WIN[0] + WIN[2]) / 2, WIN[3], stroke(hexc("#1c120c"), 12))


@functools.lru_cache(maxsize=None)
def pic_cafe():
    return _record(_cafe_static)


def cafe_window(c, T, white=0.0):
    x0, y0, x1, y1 = WIN
    c.save()
    c.clipRect(skia.Rect.MakeLTRB(x0, y0, x1, y1))
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(0, shader=linear(0, y0, 0, y1, [hexc("#0e1430"), hexc("#2a2a5a")])))
    rnd = random.Random(9)
    for i in range(16):          # neon bokeh from the street
        cx, cy = rnd.uniform(x0, x1), rnd.uniform(y0 + 60, y1 - 40)
        col = hexc(rnd.choice(["#ffcf8a", "#ff6fd8", "#7fd0ff"]))
        c.drawCircle(cx, cy, rnd.uniform(10, 24), fill(with_alpha(col, 0.5 + 0.15 * math.sin(T * 1.3 + i)), blur=8))
    for i in range(40):          # rain streaks
        rx = x0 + (i * 53 % (x1 - x0))
        ry = y0 + ((T * 900 + i * 137) % (y1 - y0 + 200)) - 100
        c.drawLine(rx, ry, rx - 6, ry + 46, stroke(with_alpha(hexc("#cfe0ff"), 0.25), 2))
    if white > 0:
        c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(with_alpha(hexc("#f4f6fb"), white)))
        grid(c, skia.Rect.MakeLTRB(x0, y0, x1, y1), white, 40)
    c.restore()


def grid(c, rect, a, step=60):
    for x in range(int(rect.left()), int(rect.right()) + 1, step):
        c.drawLine(x, rect.top(), x, rect.bottom(), stroke(with_alpha(hexc("#9aa4b8"), 0.5 * a), 2))
    for y in range(int(rect.top()), int(rect.bottom()) + 1, step):
        c.drawLine(rect.left(), y, rect.right(), y, stroke(with_alpha(hexc("#9aa4b8"), 0.5 * a), 2))


def customer(c, x, y, s, alpha=1.0, facing=1):
    """Background café customer: a seated dark silhouette (same stickman language, no face)."""
    if alpha <= 0.01:
        return
    c.saveLayerAlpha(None, int(255 * alpha))
    col = hexc("#120c08")
    c.drawCircle(x, y - 210 * s, 62 * s, fill(col))
    c.drawCircle(x, y - 210 * s, 62 * s, stroke(with_alpha(hexc(AMBER), 0.35), 4 * s, blur=3))
    c.drawRRect(rrect(x - 55 * s, y - 150 * s, 110 * s, 150 * s, 30 * s), fill(col))
    c.drawLine(x + facing * 40 * s, y - 110 * s, x + facing * 110 * s, y - 70 * s, stroke(col, 26 * s))
    c.restore()


def cafe_table(c, x, y, T, mug=True, s=1.0):
    """Small round café table by the window (v1 position), top at y."""
    c.drawRect(skia.Rect.MakeXYWH(x - 10 * s, y + 10 * s, 20 * s, 300 * s), fill(hexc("#2a1a0e")))
    c.drawOval(skia.Rect.MakeXYWH(x - 170 * s, y - 28 * s, 340 * s, 70 * s), fill(0, shader=linear(0, y - 28 * s, 0, y + 42 * s, [hexc("#a8744a"), hexc("#5a3a22")])))
    c.drawOval(skia.Rect.MakeXYWH(x - 170 * s, y - 28 * s, 340 * s, 56 * s), fill(hexc("#9a6a42")))
    if mug:
        draw_mug(c, x + 120 * s, y - 8 * s, 0.75 * s, T, 1.0, "#f2f2f2")


def cafe(c, T, power=1.0, white=0.0, customers=(1.0, 1.0, 1.0), clock=True):
    c.drawPicture(pic_cafe())
    cafe_window(c, T, white)
    if clock:
        draw_clock(c, 430, 180, 70, T, hour=23, minute=17, sec0=0.0)
    # background customers at the counter (drawn live: they are erased)
    for (x, y, s, f), a in zip([(600, 1340, 0.62, 1), (760, 1345, 0.62, 1), (990, 1340, 0.62, -1)], customers):   # on bar stools
        customer(c, x, y, s, a, f)
    for x, yy in ((250, 210), (700, 230), (950, 220)):
        lamp_v2(c, x, yy, power, s=0.75, cord_top=-20)
    glow(c, 230, 700, 520, hexc("#6f6fd8"), 0.12)
    if white > 0:       # the erased café: everything outside the characters fades to a white grid
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#eef1f6"), 0.85 * white)))
        grid(c, skia.Rect.MakeWH(W, H), white)


# =========================================================================== УЛИЦА
def _street_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, 1300, [hexc("#070b1c"), hexc("#1a1f4a"), hexc("#3a2a5a")])))
    rnd = random.Random(3)
    for layer, (base, dark) in enumerate([(1100, "#141832"), (1220, "#0e1126")]):
        x = -40
        while x < W + 40:
            bw = rnd.randint(110, 230)
            bh = rnd.randint(420, 900) - layer * 120
            c.drawRect(skia.Rect.MakeLTRB(x, base - bh, x + bw, base + 400), fill(0, shader=linear(x, 0, x + bw, 0, [shade(hexc(dark), 1.3), hexc(dark)])))
            for yy in range(base - bh + 30, base, 46):
                for xx in range(x + 14, x + bw - 14, 30):
                    if rnd.random() < 0.3:
                        c.drawRect(skia.Rect.MakeXYWH(xx, yy, 12, 20), fill(with_alpha(hexc(rnd.choice(["#ffd27a", "#9fc4ff", "#ff8fd8"])), 0.7)))
            x += bw + rnd.randint(6, 30)
    # pavement + street
    c.drawRect(skia.Rect.MakeLTRB(0, 1290, W, 1330), fill(hexc("#3a3c4a")))
    c.drawRect(skia.Rect.MakeLTRB(0, 1330, W, H), fill(0, shader=linear(0, 1330, 0, H, [hexc("#1c1e2e"), hexc("#090a12")])))
    for i in range(-6, 7):
        c.drawLine(W / 2 + i * 60, 1330, W / 2 + i * 260, H, stroke(with_alpha(hexc("#000"), 0.25), 3))
    # street lamp (right), post only — the light is live
    c.drawLine(940, 1310, 940, 520, stroke(hexc("#1a1c26"), 18))
    c.drawLine(940, 520, 840, 520, stroke(hexc("#1a1c26"), 12))
    c.drawRRect(rrect(800, 516, 80, 22, 8), fill(hexc("#2a2c36")))


@functools.lru_cache(maxsize=None)
def pic_street():
    return _record(_street_static)


SIGNS = [(180, 820, "КАФЕ", "pink"), (760, 700, "24/7", "cyan"), (560, 980, "АПТЕКА", "green")]


def street(c, T, lamp=1.0, erase=0.0, erase_x=None):
    """erase 0..1: the world is being deleted from the far end — buildings/signs above a falling wavefront turn to a
    white grid; the boundary is a ragged pixel edge (blocks) so it reads as 'unwritten', not as a flash."""
    c.drawPicture(pic_street())
    for x, y, txt, col in SIGNS:
        f = font("russo", 64)
        a = 0.85 + 0.15 * math.sin(T * 2.1 + x)
        c.drawString(txt, x - f.measureText(txt) / 2, y, f, fill(with_alpha(hexc(NEON[col]), 0.6 * a), blur=18))
        draw_text(c, txt, x, y, f, with_alpha(hexc(NEON[col]), a), align="center")
        c.drawRect(skia.Rect.MakeXYWH(x - 60, 1340, 120, 520), fill(0, shader=linear(0, 1340, 0, 1860, [with_alpha(hexc(NEON[col]), 0.3 * a),
                                                                                                    with_alpha(hexc(NEON[col]), 0)]), blur=14))
    # lamp light + pool on the pavement
    glow(c, 840, 545, 260, hexc("#ffcf8a"), 0.6 * lamp)
    c.drawOval(skia.Rect.MakeXYWH(620, 1290, 440, 80), fill(with_alpha(hexc("#ffcf8a"), 0.22 * lamp), blur=24, blend=skia.BlendMode.kPlus))
    # rain
    for i in range(70):
        rx = (i * 157) % W
        ry = ((T * 1100 + i * 211) % (H + 300)) - 150
        c.drawLine(rx, ry, rx - 8, ry + 60, stroke(with_alpha(hexc("#cfe0ff"), 0.18), 2))
    if erase > 0:
        erase_world(c, T, erase)


def erase_world(c, T, k, top_first=True):
    """White-grid erasure advancing from the top/far end down to y_front (blocky ragged edge)."""
    y_front = lerp(-100, H + 200, k)
    blk = 60
    rnd = random.Random(int(T * 12))   # edge crawls (changes ~12×/s, small blocks only — no full-frame flashing)
    path = skia.Path()
    path.addRect(skia.Rect.MakeLTRB(-50, -50, W + 50, max(-50, y_front - blk * 2)))
    for x in range(0, W, blk):
        for row in range(3):
            y = y_front - blk * (2 - row)
            if rnd.random() < 0.75 - 0.25 * row:
                path.addRect(skia.Rect.MakeXYWH(x, y, blk, blk))
    c.save()
    c.clipPath(path)
    c.drawRect(skia.Rect.MakeWH(W, H), fill(hexc("#eef1f6")))
    grid(c, skia.Rect.MakeWH(W, H), 1.0, blk)
    c.restore()


# =========================================================================== КОМНАТА НАБЛЮДЕНИЯ
MON = [(70 + k * 320, 230 + r * 270) for r in range(4) for k in range(3)]   # 3×4 wall, as in v1 (x, y of each screen)
MW, MH = 280, 210


def _obs_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [hexc("#03060f"), hexc("#0a1530"), hexc("#02040a")])))
    for x, y in MON:
        c.drawRRect(rrect(x - 10, y - 10, MW + 20, MH + 20, 12), fill(hexc("#0a0d18")))
        c.drawRRect(rrect(x - 10, y - 10, MW + 20, MH + 20, 12), stroke(hexc("#1a2236"), 4))
    c.drawRect(skia.Rect.MakeLTRB(0, 1420, W, 1480), fill(0, shader=linear(0, 1420, 0, 1480, [hexc("#1c2640"), hexc("#0e1424")])))
    c.drawRect(skia.Rect.MakeLTRB(0, 1480, W, H), fill(hexc("#05070e")))
    # keyboard on the desk
    c.drawRRect(rrect(360, 1400, 360, 34, 8), fill(hexc("#141a2c")))
    for i in range(12):
        c.drawRect(skia.Rect.MakeXYWH(372 + i * 28, 1408, 20, 16), fill(hexc("#26304a")))


@functools.lru_cache(maxsize=None)
def pic_obs():
    return _record(_obs_static)


def feed(c, x, y, kind, T, alert=None, red=False):
    """One monitor: a tiny live picture of the experiment + UI lines (kind: cafe/kitchen/stair/door/girl/data)."""
    col = "#ff2a3a" if red else "#3aa0ff"
    c.save()
    c.clipRect(skia.Rect.MakeXYWH(x, y, MW, MH))
    base = {"cafe": ("#3a2416", "#1a0f08"), "kitchen": ("#3a2614", "#140b06"), "stair": ("#1e2836", "#0a0f16"),
            "door": ("#2a1a1a", "#0e0a0a"), "girl": ("#1a2034", "#0a0c18"), "data": ("#06122a", "#020611")}[kind]
    c.drawRect(skia.Rect.MakeXYWH(x, y, MW, MH), fill(0, shader=linear(0, y, 0, y + MH, [hexc(base[0]), hexc(base[1])])))
    if kind == "data":
        for j in range(6):
            w_ = 60 + (j * 53 + int(T * 3) * 17) % 180
            c.drawRect(skia.Rect.MakeXYWH(x + 20, y + 24 + j * 28, w_, 8), fill(with_alpha(hexc(col), 0.6)))
    else:
        fig = {"cafe": "#0c0c0c", "kitchen": "#e2cdb9", "stair": "#0c0c0c", "door": "#5a1e1e", "girl": "#e8d3be"}[kind]
        rim = {"cafe": "#8fb8ff", "kitchen": "#ffd9a6", "stair": "#8fb8ff", "door": "#ff2a2a", "girl": "#ffe0b0"}[kind]
        fx = x + MW * 0.5 + 10 * math.sin(T * 0.7 + x)
        c.drawCircle(fx, y + 95, 30, fill(hexc(fig)))
        c.drawCircle(fx, y + 95, 30, stroke(hexc(rim), 3))
        c.drawRRect(rrect(fx - 24, y + 125, 48, 70, 12), fill(hexc("#151515")))
        if kind == "girl":
            c.drawCircle(fx + 26, y + 80, 12, fill(hexc("#5a3622")))
        draw_text(c, "REC", x + MW - 46, y + 26, font("rubik", 20, 700), with_alpha(hexc("#ff3b44"), 0.6 + 0.4 * (math.sin(T * 4) > 0)))
        draw_text(c, {"cafe": "CAM 04 · КАФЕ", "kitchen": "CAM 01 · КУХНЯ", "stair": "CAM 02 · ПОДЪЕЗД", "door": "CAM 03 · 048",
                      "girl": "CAM 07 · УЛИЦА"}[kind], x + 14, y + 26, font("rubik", 18, 600), with_alpha(hexc("#cfe6ff"), 0.8))
    for y_ in range(int(y), int(y + MH), 5):
        c.drawLine(x, y_, x + MW, y_, stroke(with_alpha(hexc("#000"), 0.12), 1))
    c.drawRect(skia.Rect.MakeXYWH(x, y, MW, MH), fill(with_alpha(hexc(col), 0.08)))
    if alert:
        c.drawRect(skia.Rect.MakeXYWH(x, y + MH - 52, MW, 52), fill(with_alpha(hexc("#ff2a3a"), 0.75)))
        draw_text(c, alert, x + MW / 2, y + MH - 18, font("rubik", 22, 700), hexc("#ffffff"), align="center")
    c.restore()
    glow(c, x + MW / 2, y + MH / 2, 240, hexc(col), 0.1)


FEEDS = ["kitchen", "data", "stair", "data", "cafe", "door", "data", "data", "girl", "data", "data", "data"]


def observation_room(c, T, alerts=None, red=(), focus=None):
    """alerts: {monitor index: text}; red: indices with red tint; focus: index highlighted (operator watching it)."""
    c.drawPicture(pic_obs())
    alerts = alerts or {}
    for i, (x, y) in enumerate(MON):
        feed(c, x, y, FEEDS[i], T, alerts.get(i), i in red)
        if i == focus:
            c.drawRRect(rrect(x - 12, y - 12, MW + 24, MH + 24, 14), stroke(with_alpha(hexc("#bfe3ff"), 0.6 + 0.3 * math.sin(T * 3)), 4))
