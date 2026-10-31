"""Sets v3 — ПОДЪЕЗД (stairwell, кв. 048) in the approved series look.
Geography follows the v1 reference (backgrounds/stairwell_048.png, engine/sets_future.stairwell): a long landing in
one-point perspective, doors 044/046 on the left wall, 045/047/048 on the right wall, cold ceiling lamps, two-tone
Soviet paint. Added for ep. 3 in the same geography: the flight of stairs at the landing's near end (reverse angle)
and a frontal view of door 048. Door numbers are drawn live (they change in the story), everything else is cached.
"""
import functools
import math
import random

import skia

from .core import W, H, lerp, hexc, with_alpha, shade, fill, stroke, radial, linear, path_poly, rrect, glow, font, draw_text
from .sets import _record
from .sets2 import AMBER

COLD = "#a8c0ff"
EX0, EY0, EX1, EY1 = 420, 640, 660, 1080          # far end of the landing (vanishing box), as in v1
DOORS = [(0.08, -1, "044"), (0.45, -1, "046"), (0.2, 1, "045"), (0.55, 1, "047"), (0.72, 1, "048")]
LAMPS_U = [0.8, 0.5, 0.25, 0.08]                    # far → near (index matches ep03_timeline.stair_light)


def _mottle(c, path, seed, n=220, col="#000000", a=(0.03, 0.08), r=(8, 40), box=(0, 0, W, H)):
    c.save()
    c.clipPath(path, doAntiAlias=True)
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.uniform(box[0], box[2]), rnd.uniform(box[1], box[3])
        c.drawCircle(x, y, rnd.uniform(*r), fill(with_alpha(hexc(col), rnd.uniform(*a)), blur=rnd.uniform(4, 14)))
    c.restore()


def _wall_pt(side, u, h):
    """Point on a side wall: u along the depth (0 near … 1 far), h height (0 floor … 1 ceiling)."""
    xa = 0 if side < 0 else W
    xb = EX0 if side < 0 else EX1
    return lerp(xa, xb, u), lerp(lerp(H, EY1, u), lerp(0, EY0, u), h)


def door_quad(side, u, w=None):
    w = 0.16 * (1 - u * 0.5) if w is None else w
    return [_wall_pt(side, u, 0.62), _wall_pt(side, u + w, 0.62), _wall_pt(side, u + w, 0.0), _wall_pt(side, u, 0.0)]


# =========================================================================== WIDE: the landing in perspective
def _stairwell_wide_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(hexc("#151b24")))
    ceil = path_poly([(0, 0), (W, 0), (EX1, EY0), (EX0, EY0)])
    c.drawPath(ceil, fill(0, shader=linear(0, 0, 0, EY0, [hexc("#0b0f15"), hexc("#1d2532")])))
    for side in (-1, 1):
        xa, xb = (0, EX0) if side < 0 else (W, EX1)
        wall = path_poly([(xa, 0), (xb, EY0), (xb, EY1), (xa, H)])
        c.drawPath(wall, fill(0, shader=linear(xa, 0, xb, 0, [hexc("#1e2633"), hexc("#3a4859")])))
        _mottle(c, wall, 11 + side, col="#000000")
        _mottle(c, wall, 21 + side, n=90, col="#9fb4d0", a=(0.015, 0.04))
        # two-tone paint: lower wall green-grey, with a darker dividing stripe
        lower = path_poly([(xa, 1180), (xb, lerp(EY0, EY1, 0.55)), (xb, EY1), (xa, H)])
        c.drawPath(lower, fill(0, shader=linear(xa, 0, xb, 0, [hexc("#17241f"), hexc("#2c4640")])))
        c.drawLine(xa, 1180, xb, lerp(EY0, EY1, 0.55), stroke(hexc("#0f1714"), 6))
    floor = path_poly([(0, H), (EX0, EY1), (EX1, EY1), (W, H)])
    c.drawPath(floor, fill(0, shader=linear(0, EY1, 0, H, [hexc("#2a2c30"), hexc("#111214")])))
    for i in range(-7, 8):    # tile lines converging to the vanishing point
        c.drawLine(lerp(EX0, EX1, (i + 7) / 14), EY1, W / 2 + i * 220, H, stroke(with_alpha(hexc("#000"), 0.28), 3))
    for k in range(1, 9):
        y = lerp(EY1, H, (k / 9) ** 1.8)
        x0 = lerp(EX0, 0, (y - EY1) / (H - EY1))
        c.drawLine(x0, y, W - x0, y, stroke(with_alpha(hexc("#000"), 0.22), 2))
    # far wall: window onto the night (cold) + radiator
    c.drawRect(skia.Rect.MakeLTRB(EX0, EY0, EX1, EY1), fill(0, shader=linear(0, EY0, 0, EY1, [hexc("#2a3442"), hexc("#1d252f")])))
    c.drawRect(skia.Rect.MakeLTRB(EX0 + 60, EY0 + 70, EX1 - 60, EY0 + 260), fill(0, shader=linear(0, EY0 + 70, 0, EY0 + 260, [hexc("#2c4a7a"), hexc("#16233d")])))
    c.drawLine(W / 2, EY0 + 70, W / 2, EY0 + 260, stroke(hexc("#0d1118"), 6))
    c.drawRect(skia.Rect.MakeLTRB(EX0 + 60, EY0 + 70, EX1 - 60, EY0 + 260), stroke(hexc("#0d1118"), 8))
    for i in range(7):
        c.drawRRect(rrect(EX0 + 70 + i * 15, EY1 - 120, 10, 70, 4), fill(hexc("#30394a")))
    # doors (padded leatherette, brass numbers drawn live)
    for u, side, num in DOORS:
        q = door_quad(side, u)
        col = "#5a1e1e" if num == "048" else "#33241c"
        c.drawPath(path_poly(q), fill(0, shader=linear(q[0][0], 0, q[1][0], 0, [shade(hexc(col), 1.15), hexc(col), shade(hexc(col), 0.7)])))
        c.drawPath(path_poly(q), stroke(hexc("#0c0907"), 5))
        for k in range(1, 4):   # quilted padding lines
            a, b = _wall_pt(side, u + 0.02, 0.62 * k / 4), _wall_pt(side, u + (0.16 * (1 - u * 0.5)) - 0.02, 0.62 * k / 4)
            c.drawLine(a[0], a[1], b[0], b[1], stroke(with_alpha(hexc("#000"), 0.3), 2))
        hx, hy = _wall_pt(side, u + 0.16 * (1 - u * 0.5) * (0.82 if side > 0 else 0.18), 0.3)
        c.drawCircle(hx, hy, 9 * (1 - u * 0.7), fill(hexc("#b8924a")))
    # ceiling lamp fittings
    for u in LAMPS_U:
        x, y = W / 2, lerp(0, EY0, u) + 18
        s = 1 - u * 0.6
        c.drawRRect(rrect(x - 4, y - 30 * s, 8, 30 * s, 3), fill(hexc("#0b0d10")))


@functools.lru_cache(maxsize=None)
def pic_stairwell_wide():
    return _record(_stairwell_wide_static)


def door_number_k(T, i, flip_t0, every=0.32):
    """0 → original number, 1 → '048' (each door flips in turn, a 0.18 s glitch each)."""
    if flip_t0 is None:
        return 0.0
    t0 = flip_t0 + i * every
    return min(1.0, max(0.0, (T - t0) / 0.18))


def stairwell_wide(c, T, lights=(1, 1, 1, 1), flip_t0=None, door048_open=0.0):
    c.drawPicture(pic_stairwell_wide())
    order = [0, 2, 1, 3]   # flip order by door index in DOORS (044, 045, 046, 047)
    for i, (u, side, num) in enumerate(DOORS):
        k = 0.0 if num == "048" else door_number_k(T, order.index(i) if i in order else 0, flip_t0)
        cx, cy = _wall_pt(side, u + 0.16 * (1 - u * 0.5) * 0.5, 0.52)
        sz = 40 * (1 - u * 0.7) * (1.6 if num == "048" else 1.3)
        f = font("russo", sz)
        if 0.0 < k < 1.0:     # glitch: both numbers, offset, chromatic
            for dx, col, a in ((-4, "#ff2a3a", 0.6), (4, "#2ad6ff", 0.6)):
                draw_text(c, num if k < 0.5 else "048", cx + dx, cy, f, with_alpha(hexc(col), a), align="center")
        txt = "048" if k >= 0.5 else num
        col = "#f0d8a0" if txt == "048" else "#b8a684"
        draw_text(c, txt, cx, cy, f, hexc(col), align="center", shadow=(8, 0, with_alpha(hexc("#000"), 0.6)))
    # lamps: bulbs + pools of cold light on walls/floor
    for i, u in enumerate(LAMPS_U):
        p = lights[i]
        x, y = W / 2, lerp(0, EY0, u) + 18
        s = 1 - u * 0.6
        c.drawOval(skia.Rect.MakeXYWH(x - 62 * s, y - 8 * s, 124 * s, 22 * s), fill(with_alpha(hexc("#e8f0ff"), 0.25 + 0.75 * p)))
        if p > 0.01:
            glow(c, x, y + 10 * s, 160 * s, hexc("#dfe8ff"), 0.5 * p)
            fy = lerp(H, EY1, u)
            c.drawOval(skia.Rect.MakeXYWH(x - 520 * s, fy - 140 * s, 1040 * s, 280 * s),
                       fill(with_alpha(hexc(COLD), 0.16 * p), blur=60 * s, blend=skia.BlendMode.kPlus))
            glow(c, x, y + 260 * s, 560 * s, hexc(COLD), 0.16 * p)
    if door048_open > 0:
        u, side, _ = DOORS[4]
        q = door_quad(side, u)
        c.drawPath(path_poly(q), fill(with_alpha(hexc(AMBER), 0.5 * door048_open), blur=8, blend=skia.BlendMode.kPlus))
    dark = 1 - sum(lights) / 4
    if dark > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#03050a"), 0.82 * dark ** 1.3)))


# =========================================================================== DOOR 048 (frontal, on the right wall)
DX, DY, DW, DH = 300, 520, 480, 1060          # door leaf rectangle (frame around it); floor line at DY + DH


def _door048_static(c):
    wall = path_poly([(0, 0), (W, 0), (W, H), (0, H)])
    c.drawPath(wall, fill(0, shader=linear(0, 0, W, 0, [hexc("#283241"), hexc("#3a4859"), hexc("#2a3443")])))
    _mottle(c, wall, 31)
    _mottle(c, wall, 32, n=120, col="#9fb4d0", a=(0.015, 0.035))
    lower = path_poly([(0, 1180), (W, 1180), (W, H), (0, H)])
    c.drawPath(lower, fill(0, shader=linear(0, 1180, 0, H, [hexc("#2b443e"), hexc("#16231f")])))
    c.drawLine(0, 1180, W, 1180, stroke(hexc("#0f1714"), 7))
    c.save(); c.clipPath(lower); _mottle(c, lower, 33, n=140); c.restore()
    fl = DY + DH
    c.drawRect(skia.Rect.MakeLTRB(0, fl, W, H), fill(0, shader=linear(0, fl, 0, H, [hexc("#2c2e33"), hexc("#121316")])))
    for i in range(-6, 7):
        c.drawLine(W / 2 + i * 120, fl, W / 2 + i * 260, H, stroke(with_alpha(hexc("#000"), 0.28), 3))
    # door frame + recess (dark gap where the leaf swings in)
    c.drawRect(skia.Rect.MakeLTRB(DX - 34, DY - 34, DX + DW + 34, fl), fill(hexc("#1b1512")))
    c.drawRect(skia.Rect.MakeLTRB(DX - 34, DY - 34, DX + DW + 34, fl), stroke(hexc("#0a0807"), 6))
    # doorbell + electricity box
    c.drawRRect(rrect(DX + DW + 70, 900, 46, 62, 8), fill(hexc("#d8d4c8")))
    c.drawCircle(DX + DW + 93, 931, 11, fill(hexc("#2a2a2a")))
    c.drawRRect(rrect(60, 380, 170, 230, 8), fill(0, shader=linear(0, 380, 0, 610, [hexc("#4a5463"), hexc("#2c333d")])))
    c.drawRRect(rrect(60, 380, 170, 230, 8), stroke(hexc("#141820"), 5))


@functools.lru_cache(maxsize=None)
def pic_door048():
    return _record(_door048_static)


def door048(c, T, light=1.0, crack=0.0, warm_scene=None, handle_turn=0.0, number="048"):
    """Frontal door 048. crack 0..1 opens the leaf inward (hinge on the left); warm_scene(c) paints what is
    behind the door (clipped to the gap)."""
    c.drawPicture(pic_door048())
    fl = DY + DH
    gap = crack * DW * 0.42
    if crack > 0:
        c.save()
        c.clipRect(skia.Rect.MakeLTRB(DX + DW - gap, DY, DX + DW, fl))
        c.drawRect(skia.Rect.MakeLTRB(DX, DY, DX + DW, fl), fill(hexc("#2a1608")))
        if warm_scene:
            warm_scene(c)
        c.restore()
        # warm spill on the floor + wall edge
        c.drawPath(path_poly([(DX + DW - gap, fl), (DX + DW, fl), (DX + DW + 520 * crack + 200, H), (DX + DW - gap - 120, H)]),
                   fill(with_alpha(hexc(AMBER), 0.35 * min(1, crack * 3)), blur=24, blend=skia.BlendMode.kPlus))
        glow(c, DX + DW - gap * 0.5, DY + DH * 0.45, 260 + 400 * crack, hexc(AMBER), 0.22 * min(1, crack * 3))
    # the leaf (foreshortened as it swings in)
    lw = DW - gap
    leaf = skia.Rect.MakeLTRB(DX, DY, DX + lw, fl)
    base = hexc("#5a1e1e")
    c.drawRect(leaf, fill(0, shader=linear(DX, 0, DX + lw, 0, [shade(base, 1.18), base, shade(base, 0.72)])))
    for k in range(1, 6):      # quilted padding with buttons
        y = DY + DH * k / 6
        c.drawLine(DX + 20, y, DX + lw - 20, y, stroke(with_alpha(hexc("#000"), 0.28), 3))
        for j in range(1, 4):
            c.drawCircle(DX + lw * j / 4, y, 6, fill(hexc("#3a1010")))
    c.drawRect(leaf, stroke(hexc("#0c0606"), 6))
    # number plate (brass)
    nx, ny = DX + lw * 0.5, DY + 230
    c.drawRRect(rrect(nx - 95, ny - 70, 190, 96, 14), fill(0, shader=linear(0, ny - 70, 0, ny + 26, [hexc("#e2c27a"), hexc("#9a7a3a")])))
    draw_text(c, number, nx, ny + 6, font("russo", 66), hexc("#2a1a08"), align="center")
    # handle (turns down with handle_turn) + lock
    hx, hy = DX + lw - 70, DY + DH * 0.52
    c.drawCircle(hx, hy, 22, fill(hexc("#b8924a")))
    c.save(); c.translate(hx, hy); c.rotate(28 * handle_turn)
    c.drawRRect(rrect(-90, -11, 96, 22, 11), fill(0, shader=linear(0, -11, 0, 11, [hexc("#e0c070"), hexc("#8a6a2a")])))
    c.restore()
    c.drawRRect(rrect(hx - 9, hy + 60, 18, 34, 6), fill(hexc("#7a5a26")))
    # cold top light from the landing lamp
    glow(c, W / 2, -80, 900, hexc(COLD), 0.22 * light)
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#03050a"), 0.75 * (1 - light))))


# =========================================================================== STAIRS (reverse angle: flight going up)
def _stairs_static(c):
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [hexc("#1a212c"), hexc("#2c3747")])))
    wall = path_poly([(0, 0), (W, 0), (W, H), (0, H)])
    _mottle(c, wall, 41)
    _mottle(c, wall, 42, n=110, col="#9fb4d0", a=(0.015, 0.035))
    # window at the turn of the stairs (cold night)
    c.drawRect(skia.Rect.MakeLTRB(600, 180, 960, 560), fill(0, shader=linear(0, 180, 0, 560, [hexc("#2a4878"), hexc("#132039")])))
    rnd = random.Random(7)
    for i in range(14):
        c.drawCircle(rnd.uniform(610, 950), rnd.uniform(330, 550), rnd.uniform(3, 8), fill(with_alpha(hexc(rnd.choice(["#ffd27a", "#9fc4ff"])), 0.5), blur=3))
    c.drawLine(780, 180, 780, 560, stroke(hexc("#0d1118"), 8))
    c.drawRect(skia.Rect.MakeLTRB(600, 180, 960, 560), stroke(hexc("#0d1118"), 12))
    # the flight: steps rising from lower-left to upper-right
    n = 9
    for k in range(n):
        x0 = lerp(-80, 560, k / n)
        y0 = lerp(1820, 760, k / n)
        sw, sh = 760, (1820 - 760) / n
        tread = path_poly([(x0, y0), (x0 + sw, y0 - 40), (x0 + sw + 70, y0 - 40 - sh * 0.35), (x0 + 70, y0 - sh * 0.35)])
        riser = path_poly([(x0, y0), (x0 + sw, y0 - 40), (x0 + sw, y0 - 40 + sh * 0.65), (x0, y0 + sh * 0.65)])
        c.drawPath(riser, fill(0, shader=linear(0, y0, 0, y0 + sh * 0.65, [hexc("#2e3036"), hexc("#1a1b1f")])))
        c.drawPath(tread, fill(0, shader=linear(x0, 0, x0 + sw, 0, [hexc("#55575c"), hexc("#3e4045")])))
        c.drawLine(x0, y0, x0 + sw, y0 - 40, stroke(hexc("#6a6c72"), 3))
    # railing: posts + handrail (dark green paint, wooden rail)
    for k in range(0, n + 1, 1):
        x = lerp(-80, 560, k / n) + 740
        y = lerp(1820, 760, k / n) - 40
        c.drawLine(x, y, x, y - 330, stroke(hexc("#1c2a26"), 9))
    rp = skia.Path()
    rp.moveTo(660, 1780 - 370)
    rp.lineTo(1300, 760 - 410)
    c.drawPath(rp, stroke(hexc("#4a2a18"), 26, cap="round"))
    c.drawPath(rp, stroke(with_alpha(hexc("#c08a5a"), 0.35), 6, cap="round"))
    # landing floor at the bottom
    c.drawRect(skia.Rect.MakeLTRB(0, 1800, W, H), fill(hexc("#151619")))


@functools.lru_cache(maxsize=None)
def pic_stairs():
    return _record(_stairs_static)


def step_xy(k, along=0.5):
    """Top surface point of step k (0 = bottom), `along` 0..1 across the step width."""
    n = 9
    x0 = lerp(-80, 560, k / n)
    y0 = lerp(1820, 760, k / n)
    return x0 + 35 + along * 760, y0 - 20 - along * 40 - (1820 - 760) / n * 0.17


def stairs(c, T, light=1.0):
    c.drawPicture(pic_stairs())
    glow(c, 500, 120, 760, hexc("#dfe8ff"), 0.22 * light)
    glow(c, 780, 380, 360, hexc("#6f96d8"), 0.25)
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#03050a"), 0.75 * (1 - light))))
