"""Environment sets (locations). Each set is drawn in its own world space (1080x1920 at zoom 1).

Static parts are recorded once into skia Pictures (fast replay); animated parts (lamp flicker, clock hands,
steam, city lights) are drawn per frame.  Geography is fixed here so every shot agrees on where things are.

Kitchen floor plan (top view):      N (window, clock, hallway doorway in NW corner)
                                W  [Arman]--table--[Mom]  E (cabinets, kettle)
                                    S (camera side for the wide two-shot)
"""
import functools
import math

import skia

from .core import (W, H, clamp, lerp, hexc, mix, with_alpha, shade, fill, stroke, radial, linear, glow,
                   path_poly, rrect, vnoise, fbm, font, draw_text)

WARM = "#ffb661"
COLD = "#5f8fd6"


def _record(fn, w=W, h=H):
    rec = skia.PictureRecorder()
    c = rec.beginRecording(skia.Rect.MakeWH(w, h))
    fn(c)
    return rec.finishRecordingAsPicture()


# =========================================================================================== shared props
def draw_clock(c, x, y, r, t, hour=23, minute=17, sec0=8.0):
    c.drawCircle(x, y + 6, r + 6, fill(with_alpha(hexc("#000000"), 0.35), blur=8))
    c.drawCircle(x, y, r + 6, fill(hexc("#3a2a1e")))
    c.drawCircle(x, y, r, fill(hexc("#efe6d6"), shader=radial(x - r * 0.3, y - r * 0.3, r * 1.6,
                                                               [hexc("#fbf5ea"), hexc("#d9ccb6")])))
    for i in range(12):
        a = i / 12 * 2 * math.pi
        l = 0.18 if i % 3 == 0 else 0.1
        c.drawLine(x + math.sin(a) * r * (0.9 - l), y - math.cos(a) * r * (0.9 - l), x + math.sin(a) * r * 0.9,
                   y - math.cos(a) * r * 0.9, stroke(hexc("#2a221c"), 4 if i % 3 == 0 else 2.2))
    secs = sec0 + t
    mins = minute + secs / 60.0
    hrs = (hour % 12) + mins / 60.0
    for ang, ln, wd, col in ((hrs / 12, 0.5, 7, "#1d1712"), (mins / 60, 0.74, 5, "#1d1712"),
                             (math.floor(secs) / 60 + 0.004 * math.exp(-12 * (secs % 1)) * 0, 0.82, 2, "#c0262d")):
        a = ang * 2 * math.pi
        c.drawLine(x - math.sin(a) * r * 0.12, y + math.cos(a) * r * 0.12, x + math.sin(a) * r * ln,
                   y - math.cos(a) * r * ln, stroke(hexc(col), wd))
    c.drawCircle(x, y, 5, fill(hexc("#c0262d")))
    c.drawCircle(x - r * 0.35, y - r * 0.45, r * 0.5, fill(with_alpha(hexc("#ffffff"), 0.12), blur=r * 0.2))


def draw_mug(c, x, y, s=1.0, t=0.0, steam=1.0, color="#d42a2f"):
    """Red mug standing on a surface at (x, y) = bottom centre."""
    w, h = 54 * s, 62 * s
    col = hexc(color)
    c.drawOval(skia.Rect.MakeXYWH(x - w * 0.75, y - 6 * s, w * 1.5, 14 * s), fill(with_alpha(hexc("#000"), 0.35), blur=5 * s))
    # handle
    c.drawArc(skia.Rect.MakeXYWH(x + w * 0.32, y - h * 0.78, w * 0.5, h * 0.5), -90, 180, False, stroke(shade(col, 0.75), 9 * s))
    body = skia.Path()
    body.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x - w / 2, y - h, w, h), 9 * s, 9 * s))
    c.drawPath(body, fill(col, shader=linear(x - w / 2, 0, x + w / 2, 0, [shade(col, 1.25), col, shade(col, 0.55)], [0, 0.35, 1])))
    c.drawOval(skia.Rect.MakeXYWH(x - w / 2, y - h - 6 * s, w, 12 * s), fill(shade(col, 0.6)))
    c.drawOval(skia.Rect.MakeXYWH(x - w / 2 + 4 * s, y - h - 3 * s, w - 8 * s, 8 * s), fill(hexc("#5a3018")))
    c.drawLine(x - w * 0.28, y - h * 0.82, x - w * 0.28, y - h * 0.2, stroke(with_alpha(hexc("#fff"), 0.35), 5 * s))
    if steam > 0:
        for i in range(3):
            p = skia.Path()
            ph = t * 0.9 + i * 0.37
            x0 = x - 12 * s + i * 12 * s
            p.moveTo(x0, y - h - 8 * s)
            for k in range(1, 7):
                yy = y - h - 8 * s - k * 16 * s
                xx = x0 + math.sin(ph * 3 + k * 0.9) * 7 * s * (k / 6 + 0.3)
                p.lineTo(xx, yy)
            a = 0.16 * steam * (0.7 + 0.3 * math.sin(t * 2 + i))
            c.drawPath(p, stroke(with_alpha(hexc("#ffffff"), a), 7 * s, blur=4 * s))


def draw_plant(c, x, y, s=1.0, t=0.0):
    leaf = hexc("#3e7a4a")
    for i, (ang, ln) in enumerate([(-60, 95), (-35, 120), (-10, 135), (15, 118), (40, 100), (65, 80), (-80, 70)]):
        a = math.radians(ang + 3 * math.sin(t * 0.8 + i))
        tipx, tipy = x + math.sin(a) * ln * s, y - 40 * s - math.cos(a) * ln * s
        p = skia.Path()
        p.moveTo(x, y - 40 * s)
        mx, my = (x + tipx) / 2, (y - 40 * s + tipy) / 2
        nx, ny = -(tipy - (y - 40 * s)), tipx - x
        n = math.hypot(nx, ny) or 1
        p.quadTo(mx + nx / n * 18 * s, my + ny / n * 18 * s, tipx, tipy)
        p.quadTo(mx - nx / n * 18 * s, my - ny / n * 18 * s, x, y - 40 * s)
        c.drawPath(p, fill(shade(leaf, 0.8 + 0.08 * (i % 3))))
    pot = path_poly([(x - 40 * s, y - 55 * s), (x + 40 * s, y - 55 * s), (x + 30 * s, y), (x - 30 * s, y)])
    c.drawPath(pot, fill(hexc("#b8653c"), shader=linear(x - 40 * s, 0, x + 40 * s, 0, [hexc("#d98a5a"), hexc("#8a4426")])))
    c.drawRect(skia.Rect.MakeXYWH(x - 44 * s, y - 62 * s, 88 * s, 12 * s), fill(hexc("#c97448")))


def draw_lamp(c, x, y, power, s=1.0, cord_top=-50):
    """Pendant lamp: shade bottom-centre at (x, y)."""
    c.drawLine(x, cord_top, x, y - 70 * s, stroke(hexc("#141210"), 4 * s))
    shade_p = path_poly([(x - 18 * s, y - 72 * s), (x + 18 * s, y - 72 * s), (x + 105 * s, y), (x - 105 * s, y)])
    c.drawPath(shade_p, fill(hexc("#2f4a3c"), shader=linear(x - 105 * s, 0, x + 105 * s, 0,
                                                            [hexc("#4c6e5a"), hexc("#2a4134"), hexc("#16241c")])))
    c.drawRect(skia.Rect.MakeXYWH(x - 105 * s, y - 4 * s, 210 * s, 6 * s), fill(hexc("#b08a4a")))
    bulb = mix(hexc("#5a4a30"), hexc("#fff3d0"), clamp(power))
    c.drawOval(skia.Rect.MakeXYWH(x - 40 * s, y - 14 * s, 80 * s, 26 * s), fill(bulb))
    if power > 0.02:
        glow(c, x, y, 160 * s, hexc(WARM), 0.55 * power)
        glow(c, x, y, 60 * s, hexc("#fff0c8"), 0.6 * power)


def light_cone(c, x, y, w_top, w_bot, h, power, col=WARM):
    if power <= 0.01:
        return
    p = path_poly([(x - w_top, y), (x + w_top, y), (x + w_bot, y + h), (x - w_bot, y + h)])
    c.drawPath(p, fill(0, shader=linear(0, y, 0, y + h, [with_alpha(hexc(col), 0.22 * power), with_alpha(hexc(col), 0.0)]),
                       blur=30, blend=skia.BlendMode.kPlus))


def vignette(c, k=0.75, cx=W / 2, cy=H / 2):
    r = math.hypot(W, H) * 0.62
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(cx, cy, r, [with_alpha(hexc("#000"), 0), with_alpha(hexc("#000"), 0),
                                                                     with_alpha(hexc("#000"), k)], [0, 0.55, 1])))


def bokeh(c, pts, t, col, a=0.5):
    for i, (x, y, r) in enumerate(pts):
        tw = 0.75 + 0.25 * math.sin(t * 1.3 + i * 1.7)
        c.drawCircle(x, y, r, fill(with_alpha(hexc(col), a * tw), blur=r * 0.25))


# =========================================================================================== KITCHEN NORTH (wide two-shot)
K = dict(  # geography of the wide set
    wall_floor=1330, floor_feet=1405, table_top=1252, table_x0=395, table_x1=685,
    arman_x=318, mom_x=762, seat_y=1300, lamp_x=540, lamp_y=835, clock=(470, 470, 66),
    window=(690, 410, 1010, 930), door=(40, 560, 262, 1330),
    mom_mug=(628, 1248), arman_mug=None,
)


def _kitchen_north_static(c):
    wf = K["wall_floor"]
    # wall
    c.drawRect(skia.Rect.MakeWH(W, wf), fill(hexc("#5a4434"), shader=linear(0, 0, 0, wf, [hexc("#2b2019"), hexc("#5e4636"), hexc("#4a382b")], [0, 0.6, 1])))
    for i in range(0, W, 46):  # subtle wallpaper stripes
        c.drawRect(skia.Rect.MakeXYWH(i, 0, 20, wf), fill(with_alpha(hexc("#000"), 0.05)))
    # wainscot panel lower wall
    c.drawRect(skia.Rect.MakeXYWH(0, 1060, W, wf - 1060), fill(hexc("#3d2d22")))
    c.drawRect(skia.Rect.MakeXYWH(0, 1052, W, 12), fill(hexc("#6a4f3b")))
    for i in range(0, W, 120):
        c.drawRect(skia.Rect.MakeXYWH(i + 14, 1085, 92, wf - 1110), stroke(with_alpha(hexc("#000"), 0.25), 3))
    # baseboard + floor
    c.drawRect(skia.Rect.MakeXYWH(0, wf - 18, W, 18), fill(hexc("#2a1d15")))
    c.drawRect(skia.Rect.MakeXYWH(0, wf, W, H - wf), fill(hexc("#6b4a33"), shader=linear(0, wf, 0, H, [hexc("#4a3222"), hexc("#7a5539"), hexc("#3a281b")], [0, 0.45, 1])))
    vp_x = 540
    for i in range(-14, 15):  # floor planks in perspective
        x0 = vp_x + i * 70
        x1 = vp_x + i * 260
        c.drawLine(x0, wf, x1, H, stroke(with_alpha(hexc("#000"), 0.22), 3))
    for j, yy in enumerate([1375, 1440, 1530, 1650, 1800]):
        c.drawLine(0, yy, W, yy, stroke(with_alpha(hexc("#000"), 0.1), 2))
    # doorway (NW) to hallway
    x0, y0, x1, y1 = K["door"]
    c.drawRect(skia.Rect.MakeLTRB(x0 - 22, y0 - 22, x1 + 22, y1), fill(hexc("#3b2a1f")))
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(hexc("#06080d"), shader=linear(0, y0, 0, y1, [hexc("#0b0f17"), hexc("#05070b"), hexc("#0c1018")])))
    # faint corridor depth inside doorway
    c.drawRect(skia.Rect.MakeLTRB(x0 + 70, y0 + 90, x1 - 60, y1 - 120), fill(hexc("#0d131d")))
    c.drawRect(skia.Rect.MakeLTRB(x0 + 92, y0 + 140, x1 - 82, y1 - 140), stroke(hexc("#161d2a"), 4))
    # window
    wx0, wy0, wx1, wy1 = K["window"]
    c.drawRect(skia.Rect.MakeLTRB(wx0 - 24, wy0 - 24, wx1 + 24, wy1 + 34), fill(hexc("#e8dccb")))
    c.drawRect(skia.Rect.MakeLTRB(wx0, wy0, wx1, wy1), fill(hexc("#0d1a33"), shader=linear(0, wy0, 0, wy1, [hexc("#06101f"), hexc("#14284a"), hexc("#2a3f66")])))
    # city silhouette outside
    import random
    rnd = random.Random(7)
    x = wx0
    while x < wx1:
        bw = rnd.randint(30, 70)
        bh = rnd.randint(120, 330)
        c.drawRect(skia.Rect.MakeLTRB(x, wy1 - bh, min(x + bw, wx1), wy1), fill(hexc("#0a1222")))
        for yy in range(int(wy1 - bh + 14), int(wy1 - 10), 22):
            for xx in range(int(x + 6), int(min(x + bw, wx1) - 6), 14):
                if rnd.random() < 0.22:
                    c.drawRect(skia.Rect.MakeXYWH(xx, yy, 6, 9), fill(with_alpha(hexc(rnd.choice(["#ffd27a", "#9fc4ff", "#ffe9b0"])), 0.75)))
        x += bw + rnd.randint(0, 8)
    c.drawCircle(wx1 - 70, wy0 + 80, 26, fill(hexc("#e9eefc")))
    c.drawCircle(wx1 - 70, wy0 + 80, 80, fill(0, shader=radial(wx1 - 70, wy0 + 80, 80, [with_alpha(hexc("#cfe0ff"), 0.4), with_alpha(hexc("#cfe0ff"), 0)])))
    # frame & cross
    c.drawRect(skia.Rect.MakeLTRB(wx0, wy0, wx1, wy1), stroke(hexc("#e8dccb"), 14))
    c.drawLine((wx0 + wx1) / 2, wy0, (wx0 + wx1) / 2, wy1, stroke(hexc("#e8dccb"), 12))
    c.drawLine(wx0, wy0 + (wy1 - wy0) * 0.38, wx1, wy0 + (wy1 - wy0) * 0.38, stroke(hexc("#e8dccb"), 12))
    c.drawRect(skia.Rect.MakeLTRB(wx0 - 40, wy1 + 10, wx1 + 40, wy1 + 34), fill(hexc("#d8cab5")))
    # curtains
    for side in (-1, 1):
        cx = wx0 - 30 if side < 0 else wx1 + 30
        p = skia.Path()
        p.moveTo(cx - 45 * side * -1, wy0 - 50)
        p.lineTo(cx + 45 * -side * -1 + side * 0, wy0 - 50)
        cp = path_poly([(cx - 55, wy0 - 50), (cx + 55, wy0 - 50), (cx + 40, wy1 + 60), (cx - 40, wy1 + 60)])
        c.drawPath(cp, fill(hexc("#8a3a33"), shader=linear(cx - 55, 0, cx + 55, 0, [hexc("#5a2420"), hexc("#9a4a40"), hexc("#6a2a24"), hexc("#a14d42"), hexc("#5a2420")])))
    c.drawRect(skia.Rect.MakeXYWH(wx0 - 110, wy0 - 60, (wx1 - wx0) + 220, 10), fill(hexc("#2a1d15")))
    # shelf with jars (between door and clock)
    c.drawRect(skia.Rect.MakeXYWH(320, 640, 280, 14), fill(hexc("#6a4a32")))
    for i, (xx, hh, col) in enumerate([(340, 60, "#c9a66b"), (390, 80, "#7aa0b8"), (445, 52, "#d9d2c0"), (500, 70, "#b85a3a"), (555, 46, "#e0c98a")]):
        c.drawRRect(rrect(xx, 640 - hh, 40, hh, 8), fill(hexc(col), shader=linear(xx, 0, xx + 40, 0, [shade(hexc(col), 1.2), shade(hexc(col), 0.7)])))
        c.drawRect(skia.Rect.MakeXYWH(xx + 4, 640 - hh - 10, 32, 10), fill(hexc("#3a2a20")))
    # framed photo on wall above wainscot right of clock
    c.drawRect(skia.Rect.MakeXYWH(560, 600, 0, 0), fill(0))


def _chair(c, x, seat_y, floor_y, facing, k=1.0):
    wood = shade(hexc("#7a4e2e"), k)
    dark = shade(wood, 0.7)
    back_x = x - facing * 70
    c.drawRect(skia.Rect.MakeLTRB(back_x - 9, seat_y - 210, back_x + 9, floor_y), fill(dark))
    for yy in (seat_y - 200, seat_y - 150, seat_y - 100):
        c.drawRect(skia.Rect.MakeLTRB(min(back_x, back_x + facing * 18) - 2, yy, max(back_x, back_x + facing * 18) + 2, yy + 14), fill(wood))
    c.drawRect(skia.Rect.MakeLTRB(x - 78, seat_y, x + 78, seat_y + 16), fill(wood))
    c.drawRect(skia.Rect.MakeLTRB(x + facing * 62 - 8, seat_y + 10, x + facing * 62 + 8, floor_y), fill(wood))


def _table(c):
    x0, x1, ty = K["table_x0"], K["table_x1"], K["table_top"]
    ff = K["floor_feet"]
    wood = hexc("#8a5a34")
    c.drawOval(skia.Rect.MakeLTRB(x0 - 40, ff - 22, x1 + 40, ff + 26), fill(with_alpha(hexc("#000"), 0.45), blur=16))
    for lx in (x0 + 30, x1 - 30):
        c.drawRect(skia.Rect.MakeLTRB(lx - 13, ty, lx + 13, ff), fill(shade(wood, 0.6)))
    c.drawRect(skia.Rect.MakeLTRB(x0 + 20, ty + 22, x1 - 20, ty + 52), fill(shade(wood, 0.55)))
    top = path_poly([(x0 + 18, ty - 34), (x1 - 18, ty - 34), (x1, ty), (x0, ty)])
    c.drawPath(top, fill(wood, shader=linear(0, ty - 34, 0, ty, [hexc("#a8724a"), hexc("#8a5a34")])))
    for i in range(1, 4):
        yy = ty - 34 + i * 8.5
        c.drawLine(x0 + 18 - i * 4, yy, x1 - 18 + i * 4, yy, stroke(with_alpha(hexc("#4a2a14"), 0.25), 1.5))
    c.drawRect(skia.Rect.MakeLTRB(x0, ty, x1, ty + 24), fill(shade(wood, 0.75)))


@functools.lru_cache(maxsize=None)
def pic_kitchen_north_bg():
    return _record(_kitchen_north_static)


@functools.lru_cache(maxsize=None)
def pic_kitchen_north_chairs():
    def f(c):
        _chair(c, K["arman_x"] + 10, K["seat_y"], K["floor_feet"] + 10, +1)
        _chair(c, K["mom_x"] - 10, K["seat_y"], K["floor_feet"] + 10, -1)
    return _record(f)


@functools.lru_cache(maxsize=None)
def pic_kitchen_north_table():
    return _record(_table)


def kitchen_north_lights_back(c, t, power, cold=0.0):
    """Light layers behind characters: lamp glow on wall, window spill."""
    wx0, wy0, wx1, wy1 = K["window"]
    # window cold spill on wall + floor
    c.drawRect(skia.Rect.MakeLTRB(wx0, wy0, wx1, wy1), fill(with_alpha(hexc(COLD), 0.10 + 0.05 * cold), blend=skia.BlendMode.kPlus))
    p = path_poly([(wx0, wy1 + 40), (wx1, wy1 + 40), (wx1 - 40, K["wall_floor"] + 400), (wx0 - 260, K["wall_floor"] + 400)])
    c.drawPath(p, fill(0, shader=linear(0, wy1, 0, K["wall_floor"] + 400, [with_alpha(hexc(COLD), 0.16), with_alpha(hexc(COLD), 0)]), blur=40, blend=skia.BlendMode.kPlus))
    # warm lamp pool on wall
    lx, ly = K["lamp_x"], K["lamp_y"]
    c.drawCircle(lx, ly + 160, 620, fill(0, shader=radial(lx, ly + 160, 620, [with_alpha(hexc(WARM), 0.42 * power), with_alpha(hexc(WARM), 0.12 * power), with_alpha(hexc(WARM), 0)], [0, 0.5, 1]), blend=skia.BlendMode.kPlus))


def kitchen_north_lamp(c, t, power):
    draw_lamp(c, K["lamp_x"], K["lamp_y"], power)
    light_cone(c, K["lamp_x"], K["lamp_y"], 100, 330, 470, power)


def kitchen_north_animated(c, t, power):
    cx, cy, r = K["clock"]
    draw_clock(c, cx, cy, r, t)
    # plant on the window sill
    draw_plant(c, K["window"][0] + 70, K["window"][3] + 12, 0.75, t)


def darkness(c, k):
    if k > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#03040a"), k)))


# =========================================================================================== KITCHEN EAST (behind Mom)
def _kitchen_east_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(hexc("#4a382b"), shader=linear(0, 0, 0, H, [hexc("#1e1712"), hexc("#4e3a2c"), hexc("#2a1f17")])))
    # upper cabinets
    for i in range(4):
        x = 30 + i * 260
        c.drawRRect(rrect(x, 250, 240, 420, 10), fill(hexc("#d9cfbf"), shader=linear(0, 250, 0, 670, [hexc("#cfc3b0"), hexc("#a99c88")])))
        c.drawRRect(rrect(x + 22, 272, 196, 376, 8), stroke(with_alpha(hexc("#000"), 0.18), 4))
        c.drawRRect(rrect(x + 200 if i % 2 else x + 24, 440, 14, 60, 7), fill(hexc("#8a7a64")))
    # backsplash tiles
    c.drawRect(skia.Rect.MakeXYWH(0, 690, W, 330), fill(hexc("#c8d1cc")))
    for yy in range(690, 1020, 40):
        off = 0 if ((yy - 690) // 40) % 2 == 0 else 40
        c.drawLine(0, yy, W, yy, stroke(with_alpha(hexc("#6a7570"), 0.5), 2))
        for xx in range(-off, W, 80):
            c.drawLine(xx, yy, xx, yy + 40, stroke(with_alpha(hexc("#6a7570"), 0.5), 2))
    # countertop + lower cabinets
    c.drawRect(skia.Rect.MakeXYWH(0, 1020, W, 40), fill(hexc("#3a3430")))
    c.drawRect(skia.Rect.MakeXYWH(0, 1060, W, 600), fill(hexc("#6a5644"), shader=linear(0, 1060, 0, 1660, [hexc("#6e5946"), hexc("#3a2c22")])))
    for i in range(5):
        c.drawRRect(rrect(20 + i * 214, 1090, 196, 500, 8), stroke(with_alpha(hexc("#000"), 0.25), 4))
    # kettle
    kx, ky = 250, 1020
    c.drawRRect(rrect(kx - 70, ky - 150, 140, 150, 40), fill(hexc("#c7cdd6"), shader=linear(kx - 70, 0, kx + 70, 0, [hexc("#eef2f7"), hexc("#9aa3b0"), hexc("#5c6470")])))
    c.drawArc(skia.Rect.MakeXYWH(kx - 50, ky - 210, 100, 110), 180, 180, False, stroke(hexc("#2a2a2e"), 12))
    c.drawLine(kx + 70, ky - 110, kx + 120, ky - 150, stroke(hexc("#9aa3b0"), 16))
    # cutting board, bread
    c.drawRRect(rrect(560, 880, 150, 140, 20), fill(hexc("#b07a48")))
    c.drawCircle(635, 905, 12, fill(hexc("#3a2a1e")))
    # utensil jar
    c.drawRRect(rrect(800, 930, 80, 90, 10), fill(hexc("#e8e2d6")))
    for i, a in enumerate([-12, 0, 10, 20]):
        c.drawLine(820 + i * 14, 940, 820 + i * 14 + a, 840, stroke(hexc("#5a4a3a"), 8))
    # under-cabinet light strip (warm)
    c.drawRect(skia.Rect.MakeXYWH(30, 670, 1020, 8), fill(hexc("#fff0c8")))


@functools.lru_cache(maxsize=None)
def pic_kitchen_east():
    return _record(_kitchen_east_static)


def kitchen_east_lights(c, t, power, cold=0.0):
    c.drawRect(skia.Rect.MakeXYWH(0, 678, W, 340), fill(0, shader=linear(0, 678, 0, 1018, [with_alpha(hexc(WARM), 0.35 * power), with_alpha(hexc(WARM), 0)]), blend=skia.BlendMode.kPlus))
    c.drawCircle(540, 300, 900, fill(0, shader=radial(540, 300, 900, [with_alpha(hexc(WARM), 0.3 * power), with_alpha(hexc(WARM), 0)]), blend=skia.BlendMode.kPlus))
    # cold window light from the left (north)
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 500, 0, [with_alpha(hexc(COLD), 0.18 + 0.1 * cold), with_alpha(hexc(COLD), 0)]), blend=skia.BlendMode.kPlus))


# =========================================================================================== KITCHEN WEST (behind Arman) + hallway opening on the right
WEST = dict(door=(735, 260, 1080, 1640))


def _kitchen_west_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(hexc("#4a382b"), shader=linear(0, 0, 0, H, [hexc("#211912"), hexc("#55402f"), hexc("#2a1f17")])))
    for i in range(0, W, 46):
        c.drawRect(skia.Rect.MakeXYWH(i, 0, 20, 1200), fill(with_alpha(hexc("#000"), 0.05)))
    c.drawRect(skia.Rect.MakeXYWH(0, 1200, W, 720), fill(hexc("#3d2d22")))
    c.drawRect(skia.Rect.MakeXYWH(0, 1192, W, 12), fill(hexc("#6a4f3b")))
    # family photo: mom + little Arman (story detail)
    fx, fy = 150, 420
    c.drawRect(skia.Rect.MakeXYWH(fx - 14, fy - 14, 268, 228), fill(hexc("#2a1d15")))
    c.drawRect(skia.Rect.MakeXYWH(fx, fy, 240, 200), fill(hexc("#e9d9b8"), shader=linear(0, fy, 0, fy + 200, [hexc("#f3e2c0"), hexc("#c9b48e")])))
    c.drawCircle(fx + 90, fy + 80, 34, fill(hexc("#f1d3b5")))
    c.drawCircle(fx + 90, fy + 40, 16, fill(hexc("#6b3f26")))
    c.drawArc(skia.Rect.MakeXYWH(fx + 56, fy + 46, 68, 50), 180, 180, True, fill(hexc("#6b3f26")))
    c.drawRect(skia.Rect.MakeXYWH(fx + 66, fy + 112, 48, 88), fill(hexc("#9e6e6a")))
    c.drawCircle(fx + 160, fy + 118, 24, fill(hexc("#15161c")))
    c.drawRect(skia.Rect.MakeXYWH(fx + 143, fy + 142, 34, 58), fill(hexc("#2a4a8f")))
    for ex in (-8, 8):
        c.drawCircle(fx + 160 + ex, fy + 116, 5, fill(hexc("#fff")))
    # coat hooks
    c.drawRect(skia.Rect.MakeXYWH(120, 900, 360, 16), fill(hexc("#6a4a32")))
    for i, col in enumerate(["#7a2a2a", "#2a3a5a"]):
        x = 200 + i * 170
        c.drawCircle(x, 912, 8, fill(hexc("#b08a4a")))
        p = path_poly([(x - 30, 915), (x + 30, 915), (x + 55, 1160), (x - 55, 1160)])
        c.drawPath(p, fill(hexc(col), shader=linear(x - 55, 0, x + 55, 0, [shade(hexc(col), 1.2), shade(hexc(col), 0.6)])))
    # hallway opening (right)
    x0, y0, x1, y1 = WEST["door"]
    c.drawRect(skia.Rect.MakeLTRB(x0 - 26, y0 - 26, x1, y1), fill(hexc("#3b2a1f")))
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(hexc("#070a10")))
    vpx, vpy = x0 + 190, y0 + 560
    for (ax, ay) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
        c.drawLine(ax, ay, lerp(ax, vpx, 0.62), lerp(ay, vpy, 0.62), stroke(hexc("#121a26"), 3))
    ex0, ey0 = lerp(x0, vpx, 0.62), lerp(y0, vpy, 0.62)
    ex1, ey1 = lerp(x1, vpx, 0.62), lerp(y1, vpy, 0.62)
    c.drawRect(skia.Rect.MakeLTRB(ex0, ey0, ex1, ey1), fill(hexc("#0c111a")))
    c.drawRect(skia.Rect.MakeLTRB(ex0 + 20, ey0 + 30, ex1 - 18, ey1), fill(hexc("#151b26")))


@functools.lru_cache(maxsize=None)
def pic_kitchen_west():
    return _record(_kitchen_west_static)


def kitchen_west_lights(c, t, power, cold=0.0, hall_red=0.0):
    c.drawCircle(700, 150, 1000, fill(0, shader=radial(700, 150, 1000, [with_alpha(hexc(WARM), 0.33 * power), with_alpha(hexc(WARM), 0)]), blend=skia.BlendMode.kPlus))
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(W, 0, W - 520, 0, [with_alpha(hexc(COLD), 0.16 + 0.12 * cold), with_alpha(hexc(COLD), 0)]), blend=skia.BlendMode.kPlus))
    if hall_red > 0:
        x0, y0, x1, y1 = WEST["door"]
        c.drawCircle(x0 + 200, y0 + 800, 420, fill(0, shader=radial(x0 + 200, y0 + 800, 420, [with_alpha(hexc("#ff1a2a"), 0.35 * hall_red), with_alpha(hexc("#ff1a2a"), 0)]), blend=skia.BlendMode.kPlus))


# =========================================================================================== CORRIDOR (one-point perspective)
CORR = dict(vp=(540, 900), end=(330, 520, 750, 1210), floor_y=1920)


def _corridor_static(c):
    vx, vy = CORR["vp"]
    ex0, ey0, ex1, ey1 = CORR["end"]
    wall = hexc("#3a4558")
    # ceiling
    c.drawPath(path_poly([(0, 0), (W, 0), (ex1, ey0), (ex0, ey0)]), fill(hexc("#1b2230"), shader=linear(0, 0, 0, ey0, [hexc("#0e131c"), hexc("#222b3a")])))
    # left / right walls
    c.drawPath(path_poly([(0, 0), (ex0, ey0), (ex0, ey1), (0, H)]), fill(wall, shader=linear(0, 0, ex0, 0, [hexc("#1d2433"), hexc("#3e4a60")])))
    c.drawPath(path_poly([(W, 0), (ex1, ey0), (ex1, ey1), (W, H)]), fill(wall, shader=linear(W, 0, ex1, 0, [hexc("#1a2030"), hexc("#3a465c")])))
    # floor
    c.drawPath(path_poly([(0, H), (ex0, ey1), (ex1, ey1), (W, H)]), fill(hexc("#2a2620"), shader=linear(0, ey1, 0, H, [hexc("#3a342a"), hexc("#17140f")])))
    for i in range(-6, 7):  # floor boards converge
        c.drawLine(lerp(ex0, ex1, (i + 6) / 12), ey1, W / 2 + i * 260, H, stroke(with_alpha(hexc("#000"), 0.3), 3))
    # runner rug
    c.drawPath(path_poly([(ex0 + 120, ey1 + 2), (ex1 - 120, ey1 + 2), (W / 2 + 300, H), (W / 2 - 300, H)]), fill(hexc("#5a1e22"), shader=linear(0, ey1, 0, H, [hexc("#3a1416"), hexc("#6a2428")])))
    # wainscot line on side walls
    for side in (-1, 1):
        xa = 0 if side < 0 else W
        xb = ex0 if side < 0 else ex1
        c.drawLine(xa, 1330, xb, lerp(ey0, ey1, 0.72), stroke(hexc("#4f5b72"), 6))
    # end wall + front door
    c.drawRect(skia.Rect.MakeLTRB(ex0, ey0, ex1, ey1), fill(hexc("#465169")))
    dx0, dx1 = ex0 + 110, ex1 - 110
    c.drawRect(skia.Rect.MakeLTRB(dx0 - 10, ey0 + 90, dx1 + 10, ey1), fill(hexc("#1c1712")))
    c.drawRect(skia.Rect.MakeLTRB(dx0, ey0 + 100, dx1, ey1), fill(hexc("#3a2a1e"), shader=linear(dx0, 0, dx1, 0, [hexc("#4a3424"), hexc("#2a1d14")])))
    c.drawRect(skia.Rect.MakeLTRB(dx0 + 22, ey0 + 130, dx1 - 22, ey0 + 360), stroke(with_alpha(hexc("#000"), 0.35), 4))
    c.drawRect(skia.Rect.MakeLTRB(dx0 + 22, ey0 + 400, dx1 - 22, ey1 - 30), stroke(with_alpha(hexc("#000"), 0.35), 4))
    c.drawCircle(dx1 - 30, ey0 + 390, 9, fill(hexc("#c9a35a")))
    c.drawCircle((dx0 + dx1) / 2, ey0 + 175, 7, fill(hexc("#c9a35a")))
    c.drawRect(skia.Rect.MakeLTRB(dx0 + 60, ey0 + 220, dx1 - 60, ey0 + 250), fill(hexc("#c9a35a")))
    # shoe rack & coat stand on left wall
    c.drawPath(path_poly([(60, 1500), (250, 1330), (250, 1390), (60, 1590)]), fill(hexc("#4a3424")))
    for i in range(3):
        x = 100 + i * 50
        c.drawOval(skia.Rect.MakeXYWH(x, 1470 - i * 42, 60, 26), fill(hexc(["#e8e8e8", "#3a3a3a", "#b04040"][i])))
    # small framed mirror on right wall
    c.drawPath(path_poly([(880, 640), (980, 590), (980, 900), (880, 920)]), fill(hexc("#1a2232")))
    c.drawPath(path_poly([(880, 640), (980, 590), (980, 900), (880, 920)]), stroke(hexc("#7a6a4a"), 8))
    # doorway frame (we look out of the kitchen into the corridor)
    c.drawRect(skia.Rect.MakeXYWH(0, 0, 70, H), fill(hexc("#2e2118")))
    c.drawRect(skia.Rect.MakeXYWH(W - 70, 0, 70, H), fill(hexc("#2e2118")))
    c.drawRect(skia.Rect.MakeXYWH(0, 0, W, 60), fill(hexc("#2e2118")))


@functools.lru_cache(maxsize=None)
def pic_corridor():
    return _record(_corridor_static)


def corridor_lights(c, t, power, red=0.0):
    # dim ceiling fixture
    vx, vy = CORR["vp"]
    lx, ly = 540, 330
    c.drawOval(skia.Rect.MakeXYWH(lx - 70, ly - 14, 140, 28), fill(mix(hexc("#3a4250"), hexc("#dfe9ff"), power)))
    c.drawCircle(lx, ly + 200, 700, fill(0, shader=radial(lx, ly + 200, 700, [with_alpha(hexc("#9fb8e6"), 0.28 * power), with_alpha(hexc("#9fb8e6"), 0)]), blend=skia.BlendMode.kPlus))
    # warm kitchen light spilling into corridor from behind camera
    c.drawPath(path_poly([(70, H), (W - 70, H), (W / 2 + 220, 1300), (W / 2 - 220, 1300)]), fill(0, shader=linear(0, H, 0, 1300, [with_alpha(hexc(WARM), 0.25), with_alpha(hexc(WARM), 0)]), blur=30, blend=skia.BlendMode.kPlus))
    if red > 0:
        c.drawCircle(540, 1150, 650, fill(0, shader=radial(540, 1150, 650, [with_alpha(hexc("#ff1a2a"), 0.32 * red), with_alpha(hexc("#ff1a2a"), 0)]), blend=skia.BlendMode.kPlus))
