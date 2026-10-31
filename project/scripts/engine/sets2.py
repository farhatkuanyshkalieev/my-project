"""Sets v2 — «concept» look.  Geography is unchanged from engine/sets.py (same floor plan, same positions of
table, chairs, window, doorway, clock), only the dressing, palette and light follow the key art:
dark warm plaster, cream pendant shade, sheer curtains glowing, shelves, deep shadows, cold blue accents.
"""
import functools
import math
import random

import skia

from .core import W, H, lerp, hexc, with_alpha, shade, fill, stroke, radial, linear, path_poly, rrect, glow
from .sets import K, draw_clock, draw_mug, draw_plant, _record, _chair, _table

CREAM = "#f6dfb4"
AMBER = "#ffb35c"


def lamp_v2(c, x, y, power, s=1.0, cord_top=-50):
    """Pendant lamp with a cream fabric shade (key art)."""
    c.drawLine(x, cord_top, x, y - 95 * s, stroke(hexc("#0d0a08"), 4 * s))
    shade_p = skia.Path()
    shade_p.moveTo(x - 46 * s, y - 95 * s)
    shade_p.lineTo(x + 46 * s, y - 95 * s)
    shade_p.lineTo(x + 92 * s, y)
    shade_p.quadTo(x, y + 14 * s, x - 92 * s, y)
    shade_p.close()
    lit = with_alpha(hexc(CREAM), 1.0)
    c.drawPath(shade_p, fill(lit, shader=linear(x, y - 95 * s, x, y, [hexc("#d9b98a"), hexc("#fbe8c4")])))
    if power > 0.02:
        c.drawPath(shade_p, fill(with_alpha(hexc("#fff3d6"), 0.55 * power)))
        glow(c, x, y - 40 * s, 230 * s, hexc(AMBER), 0.55 * power)
        glow(c, x, y + 10 * s, 90 * s, hexc("#fff4dc"), 0.75 * power)
        # warm light cone down to the table
        cone = path_poly([(x - 80 * s, y), (x + 80 * s, y), (x + 330 * s, y + 470 * s), (x - 330 * s, y + 470 * s)])
        c.drawPath(cone, fill(0, shader=linear(0, y, 0, y + 470 * s, [with_alpha(hexc(AMBER), 0.28 * power),
                                                                      with_alpha(hexc(AMBER), 0.0)]),
                              blur=26 * s, blend=skia.BlendMode.kPlus))


def sheer_curtains(c, x0, y0, x1, y1, t=0.0, warm=1.0):
    """Window with sheer curtains glowing amber, night city faintly behind."""
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(0, shader=linear(0, y0, 0, y1, [hexc("#0f1a33"), hexc("#26314f")])))
    rnd = random.Random(5)
    for i in range(30):
        xx, yy = rnd.uniform(x0, x1), rnd.uniform(y0 + 40, y1 - 20)
        c.drawCircle(xx, yy, rnd.uniform(4, 10), fill(with_alpha(hexc(rnd.choice(["#ffd27a", "#9fc4ff"])), 0.45), blur=4))
    for k in range(9):  # folds
        fx = lerp(x0 - 20, x1 + 20, k / 8)
        c.drawRect(skia.Rect.MakeLTRB(fx - 26, y0 - 10, fx + 26, y1 + 30),
                   fill(0, shader=linear(fx - 26, 0, fx + 26, 0, [with_alpha(hexc("#ffc27a"), 0.10 * warm),
                                                                  with_alpha(hexc("#ffe2b0"), 0.24 * warm),
                                                                  with_alpha(hexc("#ffc27a"), 0.10 * warm)])))
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(with_alpha(hexc("#ffb366"), 0.07 * warm), blend=skia.BlendMode.kPlus))
    c.drawRect(skia.Rect.MakeLTRB(x0 - 18, y0 - 18, x1 + 18, y1 + 18), stroke(hexc("#2a1b12"), 18))


def _wall(c, x0, y0, x1, y1, top="#2a1c14", bot="#1a110b"):
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(0, shader=linear(0, y0, 0, y1, [hexc(top), hexc(bot)])))
    rnd = random.Random(int(x0 + y0))
    for i in range(160):  # plaster mottling
        xx, yy = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        c.drawCircle(xx, yy, rnd.uniform(20, 70), fill(with_alpha(hexc(rnd.choice(["#3a2a1e", "#140c08"])), 0.12), blur=30))


def _shelves(c, x, y, w, h):
    wood = hexc("#3b2618")
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), fill(hexc("#1c120b")))
    for k in range(3):
        yy = y + 40 + k * (h - 60) / 3
        c.drawRect(skia.Rect.MakeXYWH(x, yy + 70, w, 12), fill(wood))
        rnd = random.Random(k + 11)
        xx = x + 14
        while xx < x + w - 50:
            bw = rnd.randint(26, 52)
            bh = rnd.randint(36, 70)
            col = hexc(rnd.choice(["#d8c7a0", "#9a6a44", "#c25a3a", "#6f8796", "#e8dcc4"]))
            c.drawRRect(rrect(xx, yy + 70 - bh, bw, bh, 7), fill(col, shader=linear(xx, 0, xx + bw, 0, [shade(col, 1.15), shade(col, 0.55)])))
            xx += bw + rnd.randint(6, 14)
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), stroke(hexc("#0e0805"), 10))


# =========================================================================== KITCHEN v2 — wide (north wall)
def _kitchen_north_v2_static(c):
    wf = K["wall_floor"]
    _wall(c, 0, 0, W, wf)
    # lower wall panelling
    c.drawRect(skia.Rect.MakeXYWH(0, 1070, W, wf - 1070), fill(hexc("#1d130d")))
    c.drawRect(skia.Rect.MakeXYWH(0, 1064, W, 10), fill(hexc("#3d2a1d")))
    # floor
    c.drawRect(skia.Rect.MakeXYWH(0, wf, W, H - wf), fill(0, shader=linear(0, wf, 0, H, [hexc("#2a1a10"), hexc("#3a2414"), hexc("#140c07")], [0, 0.4, 1])))
    for i in range(-14, 15):
        c.drawLine(540 + i * 70, wf, 540 + i * 260, H, stroke(with_alpha(hexc("#000"), 0.28), 3))
    # doorway (NW) — dark hallway with a faint cold light
    x0, y0, x1, y1 = K["door"]
    c.drawRect(skia.Rect.MakeLTRB(x0 - 22, y0 - 22, x1 + 22, y1), fill(hexc("#24170f")))
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(0, shader=linear(0, y0, 0, y1, [hexc("#0a0f18"), hexc("#05070b")])))
    c.drawRect(skia.Rect.MakeLTRB(x0 + 80, y0 + 120, x1 - 70, y1 - 130), fill(with_alpha(hexc("#3a5a8a"), 0.18), blur=20))
    # window with sheer curtains
    wx0, wy0, wx1, wy1 = K["window"]
    sheer_curtains(c, wx0, wy0, wx1, wy1)
    c.drawRect(skia.Rect.MakeLTRB(wx0 - 40, wy1 + 10, wx1 + 40, wy1 + 32), fill(hexc("#3a281b")))
    # open shelves between door and clock
    _shelves(c, 300, 560, 330, 300)


@functools.lru_cache(maxsize=None)
def pic_kitchen_north_v2():
    return _record(_kitchen_north_v2_static)


@functools.lru_cache(maxsize=None)
def pic_north_furniture_v2():
    def f(c):
        _chair(c, K["arman_x"] + 10, K["seat_y"], K["floor_feet"] + 10, +1, 0.8)
        _chair(c, K["mom_x"] - 10, K["seat_y"], K["floor_feet"] + 10, -1, 0.8)
    return _record(f)


def kitchen_north_v2(c, t, power=1.0, chars_fn=None, table=True):
    """Full wide set; chars_fn(c, stage) draws characters at 'behind_table' and 'arms' stages."""
    c.drawPicture(pic_kitchen_north_v2())
    lx, ly = K["lamp_x"], K["lamp_y"]
    # warm pool on the wall
    c.drawCircle(lx, ly + 120, 700, fill(0, shader=radial(lx, ly + 120, 700, [with_alpha(hexc(AMBER), 0.38 * power),
                                                                          with_alpha(hexc(AMBER), 0.10 * power),
                                                                          with_alpha(hexc(AMBER), 0)], [0, 0.45, 1]),
                                           blend=skia.BlendMode.kPlus))
    cx, cy, r = K["clock"]
    draw_clock(c, cx, cy - 40, r * 0.9, t)
    draw_plant(c, K["window"][0] + 70, K["window"][3] + 12, 0.75, t)
    c.drawPicture(pic_north_furniture_v2())
    if chars_fn:
        chars_fn(c, "behind_table")
    if table:
        c.save()
        _table(c)
        c.restore()
        draw_mug(c, *K["mom_mug"], s=0.9, t=t)
    if chars_fn:
        chars_fn(c, "arms")
    lamp_v2(c, lx, ly, power)
    # shadow falloff (deep shadows at the edges like the key art)
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(lx, ly + 300, 1150, [with_alpha(hexc("#000"), 0.0),
                                                                              with_alpha(hexc("#000"), 0.25),
                                                                              with_alpha(hexc("#000"), 0.78)], [0, 0.5, 1])))


# =========================================================================== KITCHEN v2 — behind Arman (west wall, test shot)
WEST2 = dict(door=(760, 300, 1100, 1700), window=(80, 330, 420, 980), sideboard=(40, 1080, 520, 1500))


def _kitchen_west_v2_static(c):
    _wall(c, 0, 0, W, H, "#2c1d14", "#140c07")
    wx0, wy0, wx1, wy1 = WEST2["window"]
    sheer_curtains(c, wx0, wy0, wx1, wy1)
    # sideboard with table lamp + plant (key art, left of the hero)
    sx0, sy0, sx1, sy1 = WEST2["sideboard"]
    c.drawRect(skia.Rect.MakeLTRB(sx0, sy0, sx1, sy1), fill(0, shader=linear(0, sy0, 0, sy1, [hexc("#3a2616"), hexc("#160d07")])))
    c.drawRect(skia.Rect.MakeLTRB(sx0 - 10, sy0 - 14, sx1 + 10, sy0 + 6), fill(hexc("#5a3a22")))
    draw_plant(c, 300, sy0 - 4, 1.2)
    # family photo on the wall (story continuity with ep. 1)
    c.drawRect(skia.Rect.MakeXYWH(470, 560, 190, 150), fill(hexc("#140c07")))
    c.drawRect(skia.Rect.MakeXYWH(482, 572, 166, 126), fill(hexc("#6a5038")))
    c.drawCircle(540, 620, 24, fill(hexc("#d9c4ae")))
    c.drawCircle(595, 640, 18, fill(hexc("#121111")))
    # hallway doorway (right) — cold, dark
    x0, y0, x1, y1 = WEST2["door"]
    c.drawRect(skia.Rect.MakeLTRB(x0 - 26, y0 - 26, x1, y1), fill(hexc("#24170f")))
    c.drawRect(skia.Rect.MakeLTRB(x0, y0, x1, y1), fill(0, shader=linear(0, y0, 0, y1, [hexc("#0b1220"), hexc("#06080d")])))
    c.drawRect(skia.Rect.MakeLTRB(x0 + 70, y0 + 160, x1 - 30, y1 - 300), fill(with_alpha(hexc("#4a6a9a"), 0.16), blur=30))
    c.drawRect(skia.Rect.MakeLTRB(x0 + 110, y0 + 220, x1 - 60, y1 - 340), stroke(with_alpha(hexc("#6a86b0"), 0.25), 4))


@functools.lru_cache(maxsize=None)
def pic_kitchen_west_v2():
    return _record(_kitchen_west_v2_static)


def table_lamp(c, x, y, power, s=1.0):
    """Small table lamp with a glowing cream shade (key art hero)."""
    c.drawRect(skia.Rect.MakeXYWH(x - 6 * s, y - 120 * s, 12 * s, 120 * s), fill(hexc("#3a2a1c")))
    c.drawOval(skia.Rect.MakeXYWH(x - 40 * s, y - 12 * s, 80 * s, 22 * s), fill(hexc("#2a1c12")))
    sh = path_poly([(x - 40 * s, y - 210 * s), (x + 40 * s, y - 210 * s), (x + 72 * s, y - 110 * s), (x - 72 * s, y - 110 * s)])
    c.drawPath(sh, fill(0, shader=linear(0, y - 210 * s, 0, y - 110 * s, [hexc("#f2d39c"), hexc("#ffe9c2")])))
    glow(c, x, y - 150 * s, 260 * s, hexc(AMBER), 0.45 * power)
    glow(c, x, y - 150 * s, 80 * s, hexc("#fff0d0"), 0.45 * power)


def kitchen_west_v2_bg(c, t, power=1.0, hall_red=0.0):
    c.drawPicture(pic_kitchen_west_v2())
    table_lamp(c, 470, WEST2["sideboard"][1] - 10, power, 1.25)
    # warm key from the left (lamp) + warm pendant from above-front
    c.drawCircle(470, 950, 900, fill(0, shader=radial(470, 950, 900, [with_alpha(hexc(AMBER), 0.32 * power), with_alpha(hexc(AMBER), 0)]),
                                     blend=skia.BlendMode.kPlus))
    c.drawCircle(560, 700, 760, fill(0, shader=radial(560, 700, 760, [with_alpha(hexc("#ffcf8a"), 0.22 * power), with_alpha(hexc("#ffcf8a"), 0)]),
                                     blend=skia.BlendMode.kPlus))
    if hall_red > 0:
        x0, y0, x1, y1 = WEST2["door"]
        c.drawCircle((x0 + x1) / 2, y0 + 800, 420, fill(0, shader=radial((x0 + x1) / 2, y0 + 800, 420,
                                                                          [with_alpha(hexc("#ff1a2a"), 0.35 * hall_red),
                                                                           with_alpha(hexc("#ff1a2a"), 0)]),
                                                           blend=skia.BlendMode.kPlus))


# =========================================================================== CORRIDOR v2
def _corridor_v2_static(c):
    ex0, ey0, ex1, ey1 = 360, 560, 720, 1220
    wall_l, wall_r = hexc("#202620"), hexc("#1c211d")
    c.drawPath(path_poly([(0, 0), (W, 0), (ex1, ey0), (ex0, ey0)]), fill(0, shader=linear(0, 0, 0, ey0, [hexc("#07090a"), hexc("#151a18")])))
    c.drawPath(path_poly([(0, 0), (ex0, ey0), (ex0, ey1), (0, H)]), fill(0, shader=linear(0, 0, ex0, 0, [hexc("#0b0e0c"), wall_l])))
    c.drawPath(path_poly([(W, 0), (ex1, ey0), (ex1, ey1), (W, H)]), fill(0, shader=linear(W, 0, ex1, 0, [hexc("#0a0c0b"), wall_r])))
    c.drawPath(path_poly([(0, H), (ex0, ey1), (ex1, ey1), (W, H)]), fill(0, shader=linear(0, ey1, 0, H, [hexc("#1c1712"), hexc("#0a0705")])))
    for i in range(-6, 7):
        c.drawLine(lerp(ex0, ex1, (i + 6) / 12), ey1, W / 2 + i * 260, H, stroke(with_alpha(hexc("#000"), 0.35), 3))
    # wainscot (soviet two-tone paint)
    for side in (-1, 1):
        xa, xb = (0, ex0) if side < 0 else (W, ex1)
        c.drawPath(path_poly([(xa, 1300), (xb, lerp(ey0, ey1, 0.6)), (xb, ey1), (xa, H)]), fill(with_alpha(hexc("#16201c"), 0.9)))
    # end wall + front door ajar with cold blue light
    c.drawRect(skia.Rect.MakeLTRB(ex0, ey0, ex1, ey1), fill(hexc("#1a201e")))
    dx0, dx1 = ex0 + 95, ex1 - 95
    c.drawRect(skia.Rect.MakeLTRB(dx0, ey0 + 90, dx1, ey1), fill(hexc("#3d5a92")))
    c.drawPath(path_poly([(dx0, ey0 + 90), (dx0 + 120, ey0 + 110), (dx0 + 120, ey1 - 10), (dx0, ey1)]), fill(hexc("#141a19")))  # door leaf
    c.drawCircle(dx0 + 105, ey0 + 420, 6, fill(hexc("#c9a35a")))
    # coat + shoe rack silhouettes
    c.drawPath(path_poly([(70, 900), (190, 860), (215, 1230), (60, 1320)]), fill(hexc("#0c0d0c")))
    c.drawPath(path_poly([(60, 1500), (250, 1330), (250, 1380), (60, 1580)]), fill(hexc("#120d09")))
    # doorway frame (we look out of the kitchen)
    c.drawRect(skia.Rect.MakeXYWH(0, 0, 64, H), fill(hexc("#1e140d")))
    c.drawRect(skia.Rect.MakeXYWH(W - 64, 0, 64, H), fill(hexc("#1e140d")))
    c.drawRect(skia.Rect.MakeXYWH(0, 0, W, 54), fill(hexc("#1e140d")))


@functools.lru_cache(maxsize=None)
def pic_corridor_v2():
    return _record(_corridor_v2_static)


def corridor_v2(c, t, power=1.0, red=0.0):
    c.drawPicture(pic_corridor_v2())
    ex0, ey0, ex1, ey1 = 360, 560, 720, 1220
    # cold light from the open front door spilling down the corridor
    c.drawPath(path_poly([(ex0 + 95, ey1), (ex1 - 95, ey1), (W / 2 + 330, H), (W / 2 - 330, H)]),
               fill(0, shader=linear(0, ey1, 0, H, [with_alpha(hexc("#7fa6e6"), 0.18 * power), with_alpha(hexc("#7fa6e6"), 0)]),
                    blur=30, blend=skia.BlendMode.kPlus))
    glow(c, W / 2, ey0 + 500, 420, hexc("#6f96d8"), 0.22 * power)
    # weak ceiling bulb
    c.drawOval(skia.Rect.MakeXYWH(510, 300, 60, 22), fill(hexc("#d9e2ff")))
    glow(c, 540, 320, 260, hexc("#9fb5e0"), 0.25 * power)
    # warm kitchen spill in the foreground
    c.drawPath(path_poly([(64, H), (W - 64, H), (W / 2 + 220, 1350), (W / 2 - 220, 1350)]),
               fill(0, shader=linear(0, H, 0, 1350, [with_alpha(hexc(AMBER), 0.3), with_alpha(hexc(AMBER), 0)]), blur=30,
                    blend=skia.BlendMode.kPlus))
    if red > 0:
        glow(c, W / 2, 1050, 620, hexc("#ff1a2a"), 0.3 * red)
