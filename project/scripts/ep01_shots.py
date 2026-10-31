"""Episode 01 «НЕ ОТВЕЧАЙ» — shot-by-shot animation.

render_frame(T) -> RGBA numpy array (1080x1920) for global time T (seconds).
Each shot is a function of (canvas, local time u, global time T).  All timing comes from ep01_timeline.
"""
import json
import math
import os
import sys

import numpy as np
import skia

sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as TL  # noqa: E402
from engine.core import (W, H, clamp, lerp, ramp, Track, fbm, vnoise, blink_curve, hexc, mix, with_alpha, shade,  # noqa: E402
                         fill, stroke, radial, linear, rrect, path_poly, font, draw_text, new_surface, surface_rgba,
                         ease_out_back, ease_in_out, ease_out, ease_in, _hash)
from engine.rig import RIGS, emotion, blend_emotions  # noqa: E402
from engine.rig2 import RIGS2  # noqa: E402
from engine import sets2 as S2  # noqa: E402
from engine.look import concept_look  # noqa: E402
from engine import sets as S  # noqa: E402
from engine.ui import Phone  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LIPS = json.load(open(os.path.join(ROOT, "compositions", "lipsync.json")))
EV = TL.EV
PHONE = Phone()
_SCENE = {"cold": 0.0}   # per-frame scene light state (set in render_frame)


class V2Rig:
    """Approved v2 «concept» look: wraps rig2 and derives rim colour / phone uplight from the scene light."""

    def __init__(self, name):
        self.r = RIGS2[name]
        self.name = name

    def _p(self, pose):
        p = dict(pose)
        if self.name == "arman":
            if not p.get("rim_col"):
                p["rim_col"] = mix(hexc("#ffae55"), hexc("#8fb4ff"), clamp(_SCENE["cold"] * 1.2))
                p["rim_col"] = "#%02x%02x%02x" % (skia.ColorGetR(p["rim_col"]), skia.ColorGetG(p["rim_col"]), skia.ColorGetB(p["rim_col"]))
            p["uplight"] = p.get("uplight", 0.0) * 0.35
        if self.name == "mom" and p.get("rim_col") == "#9fbfff":
            p["rim_col"] = "#ffd29a" if _SCENE["cold"] < 0.4 else "#9fbfff"
        return p

    def draw(self, c, pose, passes=("legs", "body", "head", "arms")):
        self.r.draw(c, self._p(pose), passes)

    def head_pos(self, pose):
        return self.r.head_pos(self._p(pose))

    def shoulder_pos(self, pose, side="a"):
        return self.r.shoulder_pos(self._p(pose), side)


ARMAN, MOM, DOUBLE = V2Rig("arman"), V2Rig("mom"), V2Rig("double")


# =============================================================================================== helpers
def lip(who, T):
    """Mouth opening for a speaker at global time T (from the real voice track)."""
    best = 0.0
    for lid, d in LIPS.items():
        if d["who"] != who:
            continue
        i = int((T - d["start"]) * 60)
        if 0 <= i < len(d["env"]):
            best = max(best, d["env"][i])
    return best


def talking(who, T):
    for lid, d in LIPS.items():
        if d["who"] == who and d["start"] <= T < d["start"] + len(d["env"]) / 60 + 0.1:
            return True
    return False


def flicker(T):
    return TL.flicker(T)


def coldness(T):
    return 0.15 + 0.6 * ramp(T, EV["vanish"], EV["vanish"] + 1.0) + 0.25 * ramp(T, EV["msg1"], EV["reveal"])


def saccade(T, seed, amp=0.12, period=0.9):
    k = math.floor(T / period + _hash(seed) * 0.5)
    f = (T / period + _hash(seed) * 0.5) - k
    a = (_hash(k * 7 + seed), _hash(k * 13 + seed * 3))
    b = (_hash((k - 1) * 7 + seed), _hash((k - 1) * 13 + seed * 3))
    u = clamp(f / 0.07)
    return (lerp(b[0], a[0], u) * amp, lerp(b[1], a[1], u) * amp * 0.6)


def life(who, T, seed, talk_gain=1.0, extra_blinks=()):
    m = lip(who, T) * talk_gain
    sx, sy = saccade(T, seed)
    return dict(
        blink=blink_curve(T, seed, period=3.3, extra=extra_blinks),
        breath=T * 0.27 + seed * 0.1,
        hdx=fbm(T * 0.35, seed) * 0.025,
        hdy=fbm(T * 0.45, seed + 3) * 0.012 - m * 0.018,
        tilt=fbm(T * 0.3, seed + 5) * 2.2 + m * 2.0 * fbm(T * 2.7, seed + 9),
        mouth_open=m, mouth_w=1.0 - 0.25 * m + 0.18 * fbm(T * 7, seed + 13),
        _sacc=(sx, sy),
    )


def pose(base, *layers, **over):
    p = dict(base)
    sacc = (0.0, 0.0)
    for L in layers:
        L = dict(L)
        sacc = L.pop("_sacc", sacc)
        for k, v in L.items():
            if k in ("tilt", "hdx", "hdy") and k in p:
                p[k] = p[k] + v
            else:
                p[k] = v
    p.update(over)
    lx, ly = p.get("look", (0.0, 0.0))
    p["look"] = (clamp(lx + sacc[0], -1, 1), clamp(ly + sacc[1], -1, 1))
    return p


def cam(c, cx, cy, z, rot=0.0, shake=0.0, T=0.0, seed=0):
    sx = fbm(T * 0.6, 101 + seed) * shake
    sy = fbm(T * 0.5, 202 + seed) * shake
    sr = fbm(T * 0.45, 303 + seed) * shake * 0.04
    c.translate(W / 2, H / 2)
    c.rotate(rot + sr)
    c.scale(z, z)
    c.translate(-(cx + sx), -(cy + sy))


def layer_blur(c, sigma, dim=1.0):
    p = skia.Paint()
    if sigma > 0.25:
        p.setImageFilter(skia.ImageFilters.Blur(sigma, sigma))
    if dim < 1.0:
        p.setColorFilter(skia.ColorFilters.Matrix([dim, 0, 0, 0, 0, 0, dim, 0, 0, 0, 0, 0, dim * 1.05, 0, 0, 0, 0, 0, 1, 0]))
    c.saveLayer(None, p)


def light_multiply(c, ambient, pools):
    p = skia.Paint()
    p.setBlendMode(skia.BlendMode.kMultiply)
    c.saveLayer(None, p)
    c.drawColor(hexc(ambient))
    for (x, y, r, col, a) in pools:
        c.drawCircle(x, y, r, fill(0, shader=radial(x, y, r, [with_alpha(hexc(col), a), with_alpha(hexc(col), 0)]),
                                   blend=skia.BlendMode.kPlus))
    c.restore()


def grade(c, T, warm=0.0, cold=0.0, vig=0.6, red=0.0):
    if warm > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#ff9a40"), 0.10 * warm), blend=skia.BlendMode.kSoftLight))
    if cold > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#3a6aff"), 0.16 * cold), blend=skia.BlendMode.kSoftLight))
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#0a1430"), 0.10 * cold)))
    if red > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#ff1a2a"), 0.18 * red), blend=skia.BlendMode.kSoftLight))
    S.vignette(c, vig * 0.7)


def table_band(c, ty, light=1.0, col="#8a5a34"):
    wood = hexc(col)
    c.drawRect(skia.Rect.MakeLTRB(-400, ty, W + 400, H + 600), fill(wood, shader=linear(0, ty, 0, ty + 500, [shade(wood, 1.15), shade(wood, 0.55)])))
    for i in range(1, 9):
        y = ty + i * i * 9
        c.drawLine(-400, y, W + 400, y + 6, stroke(with_alpha(hexc("#3a1e0c"), 0.22), 2))
    c.drawRect(skia.Rect.MakeLTRB(-400, ty, W + 400, ty + 6), fill(with_alpha(hexc("#ffd9a8"), 0.35 * light)))


def front_chair(c, x, seat_y, s=1.0):
    wood = hexc("#6e4528")
    c.drawRRect(rrect(x - 150 * s, seat_y - 330 * s, 300 * s, 46 * s, 14 * s), fill(wood))
    c.drawRRect(rrect(x - 150 * s, seat_y - 250 * s, 300 * s, 30 * s, 12 * s), fill(shade(wood, 0.9)))
    for sx in (-140, 128):
        c.drawRect(skia.Rect.MakeXYWH(x + sx * s, seat_y - 330 * s, 14 * s, 330 * s), fill(shade(wood, 0.8)))


def phone_back(c, x, y, s=1.0, rot=0.0):
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    c.drawRRect(rrect(-80 * s, -160 * s, 160 * s, 320 * s, 26 * s), fill(hexc("#1a1c24"), shader=linear(-80 * s, 0, 80 * s, 0, [hexc("#2c303c"), hexc("#111318")])))
    c.drawRRect(rrect(-62 * s, -140 * s, 56 * s, 70 * s, 14 * s), fill(hexc("#0a0b0e")))
    c.drawCircle(-46 * s, -122 * s, 11 * s, fill(hexc("#2a3550")))
    c.drawCircle(-22 * s, -96 * s, 11 * s, fill(hexc("#2a3550")))
    c.restore()


def black_hand(c, x, y, s=1.0, rot=0.0, rim=0.6, thumb=(0, 0)):
    """Arman's hand gripping a phone from below/left (screen space)."""
    c.save()
    c.translate(x, y)
    c.rotate(rot)
    col = hexc("#121318")
    sleeve = hexc("#161515")
    c.drawRRect(rrect(-150 * s, 120 * s, 260 * s, 600 * s, 110 * s), fill(sleeve, shader=linear(-150 * s, 0, 110 * s, 0, [shade(sleeve, 1.25), shade(sleeve, 0.6)])))
    c.drawRRect(rrect(-150 * s, 120 * s, 260 * s, 70 * s, 30 * s), fill(shade(sleeve, 0.7)))
    c.drawCircle(-30 * s, 60 * s, 130 * s, fill(col))
    c.drawCircle(-30 * s, 60 * s, 130 * s, stroke(with_alpha(hexc("#ffae55"), 0.45 * rim), 6 * s, blur=4 * s))
    tx, ty = thumb
    c.drawRRect(rrect(-150 * s + tx, -90 * s + ty, 70 * s, 170 * s, 35 * s), fill(col))
    c.restore()


def draw_phone_insert(c, T, content_fn, x=220, y=280, rot=-3.0, s=1.0, shake=0.0, glow=1.0):
    """Phone close-up: hand + phone + content drawn by content_fn(canvas)."""
    jx = (math.sin(T * 2 * math.pi * 23) * 1.6 + math.sin(T * 2 * math.pi * 31) * 0.9) * shake
    jy = math.cos(T * 2 * math.pi * 27) * 1.2 * shake
    c.save()
    c.translate(x + jx + Phone.SW / 2, y + jy + Phone.SH / 2)
    c.rotate(rot + fbm(T * 0.5, 77) * 1.2)
    c.scale(s, s)
    c.translate(-Phone.SW / 2, -Phone.SH / 2)
    PHONE.body(c, glow)
    PHONE.screen_begin(c)
    content_fn(c)
    PHONE.screen_end(c)
    # fingers on the right edge + thumb on the left/bottom
    col = hexc("#121318")
    for i in range(3):
        c.drawRRect(rrect(Phone.SW - 6, 620 + i * 120, 78, 96, 40), fill(col))
        c.drawRRect(rrect(Phone.SW - 6, 620 + i * 120, 78, 96, 40), stroke(with_alpha(hexc("#ffae55"), 0.35), 3))
    c.restore()


def kitchen_bokeh_bg(c, T, zoom=2.3, cx=540, cy=1050, blur=26, power=1.0, mom=True, mom_alpha=1.0, cold=0.0):
    """Defocused kitchen behind a phone insert (wide set re-used, so lights match)."""
    layer_blur(c, blur)
    c.save()
    cam(c, cx, cy, zoom, T=T, shake=4)
    north_world(c, T, power, cold, arman=None, mom=(north_mom_idle(T) if mom else None), mom_alpha=mom_alpha)
    c.restore()
    c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#05060a"), 0.45)))


# =============================================================================================== NORTH (wide) world
K = S.K
A_BASE = dict(x=K["arman_x"], y=K["seat_y"], s=0.95, bt=0.7, ht=0.5, sit=1, key=(0.6, -0.6), rim_dir=(-1, -0.25),
              warm=0.8, hand_a=(1.2, -0.75), hand_b=(1.05, -0.62), phone="a", phone_rot=-18, phone_glow=1.0,
              uplight=0.35, elbow_a=1, elbow_b=1)
M_BASE = dict(x=K["mom_x"], y=K["seat_y"], s=0.95, bt=-0.7, ht=-0.5, sit=1, key=(-0.6, -0.6), rim_dir=(1, -0.25),
              warm=0.9, hand_a=(-1.0, -0.62), hand_b=(-1.2, -0.66), rim_col="#9fbfff", elbow_a=-1, elbow_b=-1)


def north_mom_idle(T):
    return pose(M_BASE, emotion("neutral", smile=0.45, squint=0.12), life("mom", T, 2), look=(-0.6, 0.05))


def north_world(c, T, power, cold, arman=None, mom=None, mom_alpha=1.0, mug=True, mom_mug_in_hand=False,
                mom_layer_fn=None, extra_after=None):
    c.drawPicture(S2.pic_kitchen_north_v2())
    lx0, ly0 = K["lamp_x"], K["lamp_y"]
    c.drawCircle(lx0, ly0 + 120, 700, fill(0, shader=radial(lx0, ly0 + 120, 700, [with_alpha(hexc(S2.AMBER), 0.38 * power),
                                                                              with_alpha(hexc(S2.AMBER), 0.10 * power),
                                                                              with_alpha(hexc(S2.AMBER), 0)], [0, 0.45, 1]),
                                           blend=skia.BlendMode.kPlus))
    wx0, wy0, wx1, wy1 = K["window"]
    c.drawRect(skia.Rect.MakeLTRB(wx0, wy0, wx1, wy1), fill(with_alpha(hexc("#5f8fd6"), 0.10 + 0.12 * cold), blend=skia.BlendMode.kPlus))
    S.draw_clock(c, K["clock"][0], K["clock"][1] - 40, K["clock"][2] * 0.9, T)
    S.draw_plant(c, K["window"][0] + 70, K["window"][3] + 12, 0.75, T)
    c.drawPicture(S2.pic_north_furniture_v2())
    if arman:
        ARMAN.draw(c, arman, passes=("legs", "body", "head"))
    if mom and mom_alpha > 0:
        if mom_layer_fn:
            mom_layer_fn(c, mom, ("legs", "body", "head"))
        else:
            MOM.draw(c, dict(mom, alpha=mom_alpha), passes=("legs", "body", "head"))
    c.drawPicture(S.pic_kitchen_north_table())
    if mug and not mom_mug_in_hand:
        S.draw_mug(c, *K["mom_mug"], s=0.9, t=T)
    if arman:
        ARMAN.draw(c, arman, passes=("arms",))
    if mom and mom_alpha > 0:
        if mom_layer_fn:
            mom_layer_fn(c, mom, ("arms",))
        else:
            MOM.draw(c, dict(mom, alpha=mom_alpha), passes=("arms",))
        if mom_mug_in_hand:
            hx, hy, R = MOM.shoulder_pos(mom, "b")
            mx = mom["x"] + mom["hand_b"][0] * R
            my = mom["y"] + mom["hand_b"][1] * R
            S.draw_mug(c, mx - 8, my + 30, s=0.9, t=T)
    if extra_after:
        extra_after(c)
    S2.lamp_v2(c, K["lamp_x"], K["lamp_y"], power)
    lx, ly = K["lamp_x"], K["lamp_y"]
    light_multiply(c, "#8a7c80" if cold < 0.5 else "#6e7896",
                   [(lx, ly + 260, 900, "#ffd09a", 0.5 * power), (lx, ly + 420, 480, "#ffe6c4", 0.25 * power),
                    (850, 650, 560, "#8fb0ff", 0.35 + 0.2 * cold), (150, 900, 420, "#52648f", 0.2)])


# =============================================================================================== EAST (mom CU) world
MOM_CU = dict(x=540, y=1560, s=1.75, bt=0.0, ht=-0.12, key=(0.15, -0.75), rim_dir=(-1, -0.3), rim_col="#9fbfff",
              warm=0.9, hand_a=(-0.78, -0.3), hand_b=(0.82, -0.3), elbow_a=1, elbow_b=-1, look=(-0.35, 0.08))
EAST_TABLE_Y = 1485


def east_world(c, T, power, cold, mom=None, mom_alpha=1.0, bg_blur=7.0, cam_args=(540, 1180, 1.25), fg_arman=True,
               show_phone_back=None, mug=True, shake=3.0, mug_in_hand=False, before_table=None):
    cx, cy, z = cam_args
    c.save()
    cam(c, cx, cy, z * 0.94 + 0.06, T=T, shake=shake * 0.5)
    layer_blur(c, bg_blur)
    c.drawPicture(S2.pic_kitchen_east_v2())
    S2.kitchen_east_v2_lights(c, T, power, cold)
    front_chair(c, 540, 1560, 1.0)
    c.restore()
    c.restore()
    c.save()
    cam(c, cx, cy, z, T=T, shake=shake)
    if before_table:
        before_table(c)
    if mom and mom_alpha > 0:
        MOM.draw(c, dict(mom, alpha=mom_alpha), passes=("legs", "body", "head"))
    table_band(c, EAST_TABLE_Y, power)
    if mug and not mug_in_hand:
        S.draw_mug(c, 770, 1560, s=1.5, t=T)
    if mom and mom_alpha > 0:
        MOM.draw(c, dict(mom, alpha=mom_alpha), passes=("arms",))
        if mug_in_hand:
            R = 100 * mom["s"] * 0.97
            S.draw_mug(c, mom["x"] + mom["hand_b"][0] * R - 10, mom["y"] + mom["hand_b"][1] * R + 62, s=1.5, t=T)
    light_multiply(c, "#8a7c80" if cold < 0.5 else "#6e7896",
                   [(560, 800, 1250, "#ffcf9a", 0.45 * power), (540, 1500, 750, "#ffe0bb", 0.2 * power),
                    (-100, 1000, 750, "#8fb0ff", 0.3 + 0.25 * cold)])
    c.restore()
    if fg_arman:
        c.save()
        cam(c, cx, cy, z, T=T, shake=shake * 1.4)
        layer_blur(c, 10, dim=0.55)
        ARMAN.draw(c, dict(x=60, y=2620, s=3.0, back=True, bt=0.15, rim_dir=(1, -0.6), rim_k=1.1, hand_a=None, hand_b=None, key=(0.5, -0.5)),
                   passes=("body", "head"))
        if show_phone_back is not None:
            px, py, prot = show_phone_back
            phone_back(c, px, py, 1.15, prot)
            black_hand(c, px - 70, py + 150, 0.55, prot)
        c.restore()
        c.restore()


# =============================================================================================== WEST (Arman CU) world
ARM_CU = dict(x=540, y=1580, s=1.75, bt=0.0, ht=0.12, key=(-0.25, -0.75), rim_dir=(1, -0.25), warm=0.8,
              hand_a=(-0.42, -0.42), hand_b=(0.45, -0.45), phone="b", phone_rot=-8, phone_glow=0.0, uplight=0.55,
              elbow_a=-1, elbow_b=1, look=(0.35, 0.08))
WEST_TABLE_Y = 1505


def west_world(c, T, power, cold, arman, bg_blur=7.0, cam_args=(540, 1200, 1.25), fg_mom=True, hall_red=0.0,
               shake=3.0, rot=0.0, mom_fg_alpha=1.0, phone_ui=None):
    cx, cy, z = cam_args
    c.save()
    cam(c, cx, cy, z * 0.94 + 0.06, rot=rot, T=T, shake=shake * 0.5)
    layer_blur(c, bg_blur)
    S2.kitchen_west_v2_bg(c, T, power, hall_red)
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(W, 0, W - 520, 0, [with_alpha(hexc("#5f8fd6"), 0.12 + 0.12 * cold),
                                                                            with_alpha(hexc("#5f8fd6"), 0)]), blend=skia.BlendMode.kPlus))
    front_chair(c, 540, 1580, 1.0)
    c.restore()
    c.restore()
    c.save()
    cam(c, cx, cy, z, rot=rot, T=T, shake=shake)
    if arman:
        ARMAN.draw(c, arman, passes=("legs", "body", "head"))
    table_band(c, WEST_TABLE_Y, power)
    if arman:
        ARMAN.draw(c, arman, passes=("arms",))
    arman = arman or {}
    light_multiply(c, "#8a7c80" if cold < 0.5 else "#6e7896",
                   [(420, 750, 1300, "#ffd2a0", 0.5 * power), (1080, 900, 700, "#8fb0ff", 0.3 + 0.3 * cold),
                    (540, 1250, 520, "#cfe0ff", 0.3 * arman.get("uplight", 0))])
    c.restore()
    if fg_mom and mom_fg_alpha > 0:
        c.save()
        cam(c, cx, cy, z, rot=rot, T=T, shake=shake * 1.4)
        layer_blur(c, 11, dim=0.3)
        MOM.draw(c, dict(x=1060, y=2650, s=3.0, back=True, bt=-0.15, rim_dir=(-1, -0.6), rim_k=0.6, key=(-0.5, -0.5),
                         alpha=mom_fg_alpha), passes=("body", "head"))
        c.restore()
        c.restore()


def arman_cu_pose(T, emo, look=(0.35, 0.08), seed=1, **over):
    return pose(ARM_CU, emo, life("arman", T, seed), look=look, **over)


def mom_cu_pose(T, emo, look=(-0.35, 0.08), seed=2, **over):
    return pose(MOM_CU, emo, life("mom", T, seed), look=look, **over)


# =============================================================================================== SHOTS
def s01(c, u, T):
    """Black -> phone wakes -> notification -> rack focus to Mom across the table."""
    rack = ramp(T, 3.25, 4.25, "io")
    # background: Mom (east set) out of focus -> in focus
    c.save()
    bg_alpha = ramp(T, 0.15, 1.0)
    c.saveLayerAlpha(None, int(255 * bg_alpha))
    mom = mom_cu_pose(T, emotion("neutral", smile=0.5, squint=0.15), look=(-0.2, 0.15 - 0.15 * rack))
    mom["hand_b"] = (0.42, -1.72)  # holding the mug near her lips
    mom["elbow_b"] = 1
    cam_cy = lerp(1350, 1180, rack)
    layer_blur(c, lerp(16, 0.0, rack))
    east_world(c, T, 1.0, 0.0, mom=mom, cam_args=(540, cam_cy, lerp(1.35, 1.25, rack)), fg_arman=False,
               mug_in_hand=True, shake=2.0)
    c.restore()
    c.restore()
    c.restore()
    # foreground phone
    notif_t = T - EV["notif"]
    wake = ramp(T, EV["phone_wake"], EV["phone_wake"] + 0.25, "out")
    fg_blur = lerp(0, 14, rack)
    py = lerp(250, 1250, ease_in_out(rack))
    layer_blur(c, fg_blur)

    def content(cc):
        PHONE.lock(cc, T, notif_t if notif_t > 0 else None,
                   msg="НЕ ОТВЕЧАЙ МАМЕ. ОНА СЕЙЧАС СИДИТ НАПРОТИВ.")
        if wake < 1:
            cc.drawRect(skia.Rect.MakeWH(Phone.SW, Phone.SH), fill(with_alpha(hexc("#000"), 1 - wake)))

    vib = 1.0 if 0 < notif_t < 0.5 else 0.0
    push = ease_in_out(ramp(T, EV["notif"] + 0.3, 3.25))
    draw_phone_insert(c, T, content, x=220, y=py + lerp(0, 60, push), rot=lerp(-3, -8, rack) + lerp(0, 1.5, push),
                      s=lerp(1.0, 1.12, push) + lerp(0, 0.05, rack), shake=vib, glow=wake)
    c.restore()
    if T < EV["phone_wake"]:
        c.drawColor(hexc("#000"))
    grade(c, T, warm=0.6, vig=0.75)


def s02(c, u, T):
    """Two-shot at the table."""
    t0 = 4.40
    look_up = ramp(T, 4.55, 4.95, "back")
    dip = math.sin(clamp((T - 4.5) / 0.25) * math.pi) * 0.12 if T < 4.75 else 0
    ext = ramp(T, EV["show_phone"], EV["show_phone"] + 0.55, "back")
    a_emo = blend_emotions(emotion("neutral", lid=0.05), emotion("surprise", brow_raise=0.45, mouth_open=0, pupil_k=0.9, lid=-0.1), look_up * 0.6)
    arman = pose(A_BASE, a_emo, life("arman", T, 1),
                 nod=lerp(0.65, 0.0, look_up) + dip, look=(lerp(0.3, 0.8, look_up), lerp(0.7, 0.0, look_up)),
                 tilt=lerp(0, -5, look_up),
                 hand_a=(lerp(1.2, 1.95, ext), lerp(-0.75, -1.0, ext)), phone_rot=lerp(-18, -70, ext),
                 lean=lerp(0, 6, ext))
    # Mom: sips, puts the mug down (6.45), answers curious
    down = ramp(T, EV["mug_down"] - 0.45, EV["mug_down"], "io")
    curious = ramp(T, 7.0, 7.5)
    m_emo = blend_emotions(emotion("neutral", smile=0.5, squint=0.18), emotion("neutral", smile=0.25, brow_raise=0.35, brow_angle=-0.2), curious)
    mom = pose(M_BASE, m_emo, life("mom", T, 2), look=(-0.7, 0.05),
               hand_b=(lerp(-0.35, -1.25, down), lerp(-1.95, -0.6, down)), tilt=lerp(0, 7, curious),
               nod=lerp(-0.1, 0.0, down))
    in_hand = T < EV["mug_down"]
    z = lerp(1.5, 1.6, u)
    c.save()
    cam(c, 540, 1120, z, T=T, shake=3)
    north_world(c, T, flicker(T), coldness(T), arman, mom, mom_mug_in_hand=in_hand)
    c.restore()
    grade(c, T, warm=0.7, vig=0.7)


def s03(c, u, T):
    """Mom reads the screen; smile fades."""
    fade = ramp(T, EV["smile_fade"], EV["smile_fade"] + 0.8)
    read = (math.sin((T - EV["read"]) * 5.5) * 0.25) if T < EV["smile_fade"] + 0.2 else 0
    emo = blend_emotions(emotion("neutral", smile=0.35, squint=0.1, brow_raise=0.25),
                         emotion("worried", brow_raise=0.5, lid=-0.05, smile=-0.25), fade)
    mom = mom_cu_pose(T, emo, look=(-0.15 + read, 0.45 - 0.35 * fade), nod=lerp(0.25, 0.0, fade))
    mom["tilt"] += lerp(-4, 0, fade)
    z = lerp(1.32, 1.42, u)
    east_world(c, T, flicker(T), coldness(T), mom=mom, cam_args=(560, 1150, z),
               show_phone_back=(330, 1530 - 30 * math.sin(T * 2), -12))
    grade(c, T, warm=0.6, vig=0.7)


def s04(c, u, T):
    """Insert: incoming call «МАМА»."""
    rt = T - EV["ring_start"]
    kitchen_bokeh_bg(c, T, zoom=2.0, cx=650, cy=1080, power=flicker(T))

    def content(cc):
        if rt < 0:
            PHONE.lock(cc, T, 2.0, msg="НЕ ОТВЕЧАЙ МАМЕ. ОНА СЕЙЧАС СИДИТ НАПРОТИВ.")
        else:
            PHONE.call(cc, T)
            if rt < 0.12:
                cc.drawRect(skia.Rect.MakeWH(Phone.SW, Phone.SH), fill(with_alpha(hexc("#fff"), 0.12 * (1 - rt / 0.12))))

    vib = 1.0 if rt > 0 and ((rt % 2.2) < 0.9) else 0.0
    draw_phone_insert(c, T, content, x=220, y=lerp(300, 270, u), rot=-2, s=lerp(1.0, 1.04, u), shake=vib * 0.9 + 0.15)
    grade(c, T, warm=0.3, cold=0.2, vig=0.75)


def s05(c, u, T):
    """Arman MCU, ringing phone in hand: «Это что… прикол какой-то?»"""
    nerv = ramp(T, 14.6, 15.1)
    emo = blend_emotions(emotion("neutral"), emotion("fear", mouth_open=0, brow_raise=0.4, smile=0.2, lid=0.0, pupil_k=0.85), nerv)
    look_phone = 1 - ramp(T, 14.55, 14.8, "out")
    look = (lerp(0.35, 0.05, look_phone), lerp(0.08, 0.75, look_phone))
    a = arman_cu_pose(T, emo, look=look, nod=0.35 * look_phone, phone_glow=1.0, uplight=0.75 + 0.15 * math.sin(T * 9),
                      hand_b=(0.38, -0.55), phone_rot=-12)
    a["smile"] = lerp(a.get("smile", 0), 0.45, ramp(T, 14.75, 15.0)) if T < 16.0 else lerp(0.45, -0.1, ramp(T, 16.0, 17.2))
    a["tilt"] += 6 * ramp(T, 15.6, 16.3) * (1 - ramp(T, 17.3, 17.9))
    a["hdx"] += 0.04 * math.sin(T * 3) * nerv
    z = lerp(1.25, 1.33, u)
    west_world(c, T, flicker(T), coldness(T), a, cam_args=(540, 1170, z))
    grade(c, T, warm=0.55, vig=0.7)


def s06(c, u, T):
    """Mom: «Не отвечай» — quiet, serious."""
    lean = ramp(T, 18.0, 18.5)
    emo = blend_emotions(emotion("worried"), emotion("worried", brow_raise=0.15, brow_angle=-0.45, lid=0.12, smile=-0.35), lean)
    mom = mom_cu_pose(T, emo, look=(-0.3, 0.05), hdy=-0.02 * lean)
    mom["s"] = 1.75
    mom["lean"] = -3 * lean
    z = lerp(1.38, 1.5, ease_in_out(u))
    east_world(c, T, flicker(T), coldness(T), mom=mom, cam_args=(555, 1140, z), bg_blur=9,
               show_phone_back=(300, 1640, -8))
    grade(c, T, warm=0.45, cold=0.1, vig=0.8)


def s07(c, u, T):
    emo = emotion("fear", brow_raise=0.55, brow_angle=-0.5, mouth_open=0, smile=-0.3, lid=-0.05)
    a = arman_cu_pose(T, emo, look=(0.4, 0.05), phone_glow=1.0, uplight=0.8, hand_b=(0.38, -0.55), phone_rot=-12)
    a["tilt"] += -4
    west_world(c, T, flicker(T), coldness(T), a, cam_args=(540, 1150, lerp(1.32, 1.36, u)))
    grade(c, T, warm=0.5, vig=0.72)


def s08(c, u, T):
    """Mom: «Потому что я тоже… ответила.»"""
    down = ramp(T, 21.3, 21.7) * (1 - ramp(T, 22.9, 23.3))
    emo = emotion("sad", lid=0.2, brow_raise=0.3, smile=-0.35)
    mom = mom_cu_pose(T, emo, look=(-0.2, lerp(0.1, 0.7, down)), nod=0.25 * down)
    z = lerp(1.45, 1.62, ease_in_out(u))
    p = flicker(T)
    east_world(c, T, p, coldness(T), mom=mom, cam_args=(550, 1120, z), bg_blur=10, show_phone_back=(300, 1660, -8))
    grade(c, T, warm=0.35, cold=0.2 * ramp(T, 24.0, 24.5), vig=0.82)


def _glitch_mom_drawer(T):
    """Returns a drawer that renders Mom with slice-displacement + RGB split (disappearance)."""
    g = ramp(T, EV["vanish"] - 0.35, EV["vanish_end"], "lin")
    alpha = 1.0 - ramp(T, EV["vanish"] + 0.12, EV["vanish_end"], "in")

    def drawer(c, mom, passes):
        if alpha <= 0:
            return
        if g <= 0:
            MOM.draw(c, mom, passes=passes)
            return
        bounds = skia.Rect.MakeXYWH(mom["x"] - 260, mom["y"] - 560, 520, 760)
        rec = skia.PictureRecorder()
        rc = rec.beginRecording(bounds)
        MOM.draw(rc, mom, passes=passes)
        pic = rec.finishRecordingAsPicture()
        k = int(T * 30)
        n = 14
        for i in range(n):
            y0 = bounds.top() + bounds.height() * i / n
            hh = bounds.height() / n
            off = (_hash(k * 31 + i) * 60 * g) * (1 if _hash(i * 7 + k) > 0 else -1)
            c.save()
            c.clipRect(skia.Rect.MakeXYWH(bounds.left() - 200, y0, bounds.width() + 400, hh + 1))
            for dx, col in ((-14 * g, "#ff2a3a"), (14 * g, "#2ad6ff")):
                p = skia.Paint()
                p.setColorFilter(skia.ColorFilters.Blend(with_alpha(hexc(col), 1.0), skia.BlendMode.kSrcIn))
                p.setAlphaf(0.5 * alpha * g)
                p.setBlendMode(skia.BlendMode.kPlus)
                c.saveLayer(None, p)
                c.translate(off + dx, 0)
                c.drawPicture(pic)
                c.restore()
            p = skia.Paint()
            p.setAlphaf(alpha * (0.35 if _hash(k * 3 + i) > 0.6 * g else 1.0))
            c.saveLayer(None, p)
            c.translate(off, 0)
            c.drawPicture(pic)
            c.restore()
            c.restore()
    return drawer


def s09(c, u, T):
    """Wide: lamp flickers, Mom glitches out of existence."""
    pwr = flicker(T)
    startle = ramp(T, EV["startle"], EV["startle"] + 0.18, "out") * (1 - 0.4 * ramp(T, 26.5, 26.9))
    a_emo = blend_emotions(emotion("fear", mouth_open=0, brow_raise=0.4, smile=-0.3), emotion("surprise", mouth_open=0.4, pupil_k=0.6), startle)
    arman = pose(A_BASE, a_emo, life("arman", T, 1), look=(0.8, 0.0), lean=-9 * startle, hdx=-0.06 * startle,
                 hand_a=(1.25, -0.8), phone_rot=-20, phone_glow=1.0, squash=-0.04 * startle)
    mom = pose(M_BASE, emotion("sad", lid=0.15, smile=-0.3), life("mom", T, 2), look=(-0.75, 0.05))
    z = lerp(1.42, 1.5, u) + 0.04 * startle
    shake = 3 + 10 * ramp(T, EV["vanish"] - 0.1, EV["vanish"]) * (1 - ramp(T, EV["vanish_end"], EV["vanish_end"] + 0.4))
    c.save()
    cam(c, 540, 1120, z, T=T, shake=shake)
    gd = _glitch_mom_drawer(T)
    north_world(c, T, pwr, coldness(T), arman, mom if T < EV["vanish_end"] else None, mom_layer_fn=gd)
    c.restore()
    if EV["vanish"] - 0.05 < T < EV["vanish"] + 0.06:
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#cfe0ff"), 0.35), blend=skia.BlendMode.kScreen))
    grade(c, T, warm=0.4 * pwr, cold=coldness(T), vig=0.8)


def s10(c, u, T):
    """Arman alone: «Мам?»"""
    emo = emotion("fear", brow_raise=0.8, brow_angle=-0.75, lid=-0.2, mouth_open=0, smile=-0.45, pupil_k=0.6)
    look = (lerp(0.5, 0.25, ramp(T, 27.2, 27.5)), 0.1)
    a = arman_cu_pose(T, emo, look=look, phone_glow=1.0, uplight=0.8, hand_b=(0.38, -0.55), phone_rot=-12)
    a["tilt"] += 3 * math.sin(T * 1.3)
    a["hdy"] += -0.02
    west_world(c, T, flicker(T), coldness(T), a, cam_args=(540, 1150, lerp(1.3, 1.42, ease_in_out(u))), fg_mom=False)
    grade(c, T, warm=0.25, cold=coldness(T), vig=0.82)


def s11(c, u, T):
    """POV: the empty chair; steam still rising from her mug."""
    z = lerp(1.18, 1.36, ease_in_out(u))
    rock = 2.2 * math.exp(-(T - 28.7) * 1.6) * math.sin((T - 28.7) * 9)

    def chair(cc):
        cc.save()
        cc.translate(540, 1560)
        cc.rotate(rock)
        cc.translate(-540, -1560)
        front_chair(cc, 540, 1560, 1.12)
        cc.restore()
    east_world(c, T, flicker(T), coldness(T), mom=None, cam_args=(560, 1250, z), bg_blur=4.0, fg_arman=True,
               show_phone_back=(320, 1660, -10), shake=2.5, before_table=chair)
    grade(c, T, warm=0.15, cold=coldness(T), vig=0.86)


def s12(c, u, T):
    """Insert: thumb answers the call."""
    at = T - EV["answer"]
    kitchen_bokeh_bg(c, T, zoom=2.0, cx=650, cy=1080, power=flicker(T), mom=False, cold=coldness(T))

    def content(cc):
        PHONE.call(cc, T, answered_t=at if at > 0 else None)

    vib = 1.0 if at < 0 and (((T - EV["ring_start"]) % 2.2) < 0.9) else 0.0
    draw_phone_insert(c, T, content, x=220, y=280, rot=-2, s=lerp(1.02, 1.07, u), shake=vib * 0.8 + 0.2)
    # thumb travelling to the green button
    tx = lerp(150, 760, ease_in_out(ramp(T, 30.5, EV["answer"] - 0.05)))
    ty = lerp(1900, 1355, ease_out(ramp(T, 30.4, EV["answer"] - 0.05))) + (12 if 0 < at < 0.15 else 0)
    c.save()
    c.translate(tx, ty)
    c.rotate(-28)
    c.drawCircle(40, 430, 210, fill(hexc("#121318")))                       # palm
    c.drawRRect(rrect(-58, -40, 116, 360, 58), fill(hexc("#121318")))        # thumb
    c.drawRRect(rrect(-58, -40, 116, 360, 58), stroke(with_alpha(hexc("#ffae55"), 0.45), 4, blur=3))
    c.drawOval(skia.Rect.MakeXYWH(-30, -22, 60, 70), fill(with_alpha(hexc("#3a4258"), 0.9)))  # nail
    c.drawLine(-40, 150, 40, 140, stroke(with_alpha(hexc("#2a3042"), 0.9), 4))              # knuckle crease
    c.restore()
    grade(c, T, cold=coldness(T), vig=0.78)


def s13(c, u, T):
    """Arman with the phone at his ear; Mom's voice from the phone."""
    raise_ = ramp(T, 32.0, 32.35, "out")
    emo = blend_emotions(emotion("fear", mouth_open=0, brow_raise=0.6, smile=-0.3, lid=-0.1, pupil_k=0.7),
                         emotion("surprise", mouth_open=0.15, pupil_k=0.6, brow_raise=0.9), ramp(T, 32.6, 33.2))
    look = (lerp(0.2, 0.75, ramp(T, 34.3, 34.7)), lerp(0.05, 0.15, ramp(T, 34.3, 34.7)))
    a = arman_cu_pose(T, emo, look=look, phone="a", phone_glow=0.0, uplight=0.15, ht=lerp(0.12, 0.38, ramp(T, 34.4, 35.2)),
                      hand_a=(lerp(-0.6, -1.3, raise_), lerp(-0.3, -1.92, raise_)), phone_rot=lerp(0, 22, raise_),
                      hand_b=(0.5, -0.36), elbow_a=1)
    a["tilt"] += -6 * raise_ - 4 * ramp(T, 34.4, 35.2)
    a["hdy"] += 0.03 * math.exp(-max(0.0, T - 35.0) * 6) * (T > 35.0)   # small swallow/flinch
    west_world(c, T, flicker(T), coldness(T), a, cam_args=(lerp(540, 600, ease_in_out(u)), 1150, lerp(1.3, 1.48, ease_in_out(u))),
               fg_mom=False)
    grade(c, T, warm=0.2, cold=coldness(T), vig=0.8)


def s14(c, u, T):
    """«Ты же… только что здесь сидела.»"""
    emo = emotion("fear", mouth_open=0, brow_raise=0.7, brow_angle=-0.9, smile=-0.5, lid=0.0, pupil_k=0.65)
    a = arman_cu_pose(T, emo, look=(0.8, 0.15), phone="a", phone_glow=0.0, uplight=0.12, hand_a=(-1.3, -1.92),
                      phone_rot=22, hand_b=(0.5, -0.36), elbow_a=1, ht=0.38)
    a["tilt"] += -10 + 1.5 * math.sin(T * 13) * 0.3  # trembling
    a["hdx"] += 0.006 * math.sin(T * 23)
    # tight close-up, Dutch angle, camera on the empty-chair side: a clear change of size + axis vs S13
    west_world(c, T, flicker(T), coldness(T), a, cam_args=(lerp(570, 560, u), lerp(1185, 1195, u), lerp(1.95, 2.08, ease_in_out(u))),
               fg_mom=False, rot=-5.0, bg_blur=11)
    grade(c, T, warm=0.2, cold=coldness(T), vig=0.84)


def s15(c, u, T):
    """Wide: Arman alone, phone at ear, slow push to the empty chair. «Арман, я ещё на работе.»"""
    lower = ramp(T, EV["call_end"] - 0.1, EV["call_end"] + 0.4)
    arman = pose(A_BASE, emotion("fear", mouth_open=0, brow_raise=0.6, smile=-0.4, pupil_k=0.7), life("arman", T, 1),
                 look=(0.85, 0.05), hand_a=(lerp(-0.18, 1.2, lower), lerp(-2.32, -0.8, lower)),
                 phone_rot=lerp(-10, -20, lower), phone_glow=lower, uplight=0.35 * lower)
    z = lerp(1.42, 1.62, ease_in_out(u))
    cx = lerp(530, 560, ease_in_out(u))
    c.save()
    cam(c, cx, 1135, z, T=T, shake=3)
    north_world(c, T, flicker(T), coldness(T), arman, None)
    c.restore()
    grade(c, T, warm=0.2, cold=coldness(T), vig=0.82)


def chat_items(T):
    items = [dict(side="in", text="НЕ ОТВЕЧАЙ МАМЕ. ОНА СЕЙЧАС СИДИТ НАПРОТИВ.", appear_t=None)]
    if T >= EV["msg1"]:
        items.append(dict(side="in", text="ТЫ ОТВЕТИЛ. ТЕПЕРЬ У НАС ПРОБЛЕМА.", appear_t=T - EV["msg1"]))
    if T >= EV["send"]:
        items.append(dict(side="out", text=TL.TYPED, appear_t=T - EV["send"]))
    if T >= EV["msg2"]:
        items.append(dict(side="in", text="ТЫ. ТОЛЬКО Я УЖЕ ПРОХОДИЛ ЭТО.", appear_t=T - EV["msg2"]))
    return items


def chat_state(T):
    kb = ramp(T, EV["type_start"] - 0.45, EV["type_start"] - 0.15, "out") * (1 - ramp(T, EV["send"] + 0.15, EV["send"] + 0.45))
    n = len(TL.TYPED)
    typed, pressed = "", None
    if EV["type_start"] <= T < EV["send"]:
        k = int((T - EV["type_start"]) / ((EV["type_end"] - EV["type_start"]) / (n - 1))) + 1
        typed = TL.TYPED[:min(n, k)]
        kt = (T - EV["type_start"]) / ((EV["type_end"] - EV["type_start"]) / (n - 1))
        if kt - math.floor(kt) < 0.45 and k <= n:
            pressed = TL.TYPED[k - 1]
    dots = (T - EV["dots"]) if EV["dots"] <= T < EV["msg2"] else None
    return kb, typed, pressed, dots


def s16_18(c, u, T):
    """Chat inserts S16-S18 (one continuous phone set-up, cut by framing)."""
    cold = coldness(T)
    kitchen_bokeh_bg(c, T, zoom=2.1, cx=420, cy=1000, power=flicker(T), mom=False, cold=cold)
    kb, typed, pressed, dots = chat_state(T)

    def content(cc):
        PHONE.chat(cc, T, chat_items(T), typing_dots_t=dots, input_text=typed, show_keyboard=kb, pressed=pressed)

    if T < 45.3:     # S16
        s, x, y, rot = lerp(1.28, 1.34, ramp(T, 42.7, 45.3)), 220, -190, -2
    elif T < 48.3:   # S17 — tighter on the keyboard / input
        s, x, y, rot = lerp(1.12, 1.16, ramp(T, 45.3, 48.3)), 180, 120, -1
    else:            # S18 — slow creep in on the reply
        s, x, y, rot = lerp(1.26, 1.38, ease_in_out(ramp(T, 48.3, 51.5))), 210, lerp(-80, -120, ramp(T, 48.3, 51.5)), -2.5
    vib = 1.0 if (EV["msg1"] < T < EV["msg1"] + 0.5) or (EV["msg2"] < T < EV["msg2"] + 0.45) else 0.0
    draw_phone_insert(c, T, content, x=x, y=y, rot=rot, s=s, shake=vib * 0.8 + 0.15)
    grade(c, T, cold=cold, vig=0.8)


def s19(c, u, T):
    """ECU Arman's eyes; voice from the hallway: «Не верь ему.»"""
    hear = ramp(T, EV["music_drop"] + 0.45, EV["music_drop"] + 0.55, "out")
    snap = ramp(T, TL.LINES["D01"]["t"] + 0.85, TL.LINES["D01"]["t"] + 0.95, "out")
    emo = blend_emotions(emotion("fear", brow_raise=0.7, brow_angle=-0.6, mouth_open=0, smile=-0.4, pupil_k=0.75),
                         emotion("surprise", mouth_open=0.05, pupil_k=0.45, brow_raise=1.0, lid=-0.3), snap)
    look = (lerp(0.05, 1.0, snap), lerp(0.7 - 0.6 * hear, 0.0, snap))
    a = arman_cu_pose(T, emo, look=look, nod=0.25 * (1 - hear), phone_glow=1.0, uplight=0.85, hand_b=(0.38, -0.55),
                      phone_rot=-12, extra_blinks=())
    if T > TL.LINES["D01"]["t"]:
        a["blink"] = 0.0  # frozen stare
    z = lerp(2.3, 2.55, u)
    west_world(c, T, flicker(T) * 0.9, coldness(T), a, cam_args=(560, 1150, z), fg_mom=False, bg_blur=12,
               hall_red=0.25 * ramp(T, TL.LINES["D01"]["t"], TL.LINES["D01"]["t"] + 0.6))
    grade(c, T, cold=coldness(T), vig=0.9)


def s20(c, u, T):
    """Anticipation dip -> fast head turn towards the hallway -> whip pan."""
    t0 = EV["turn"]
    ant = math.sin(clamp((T - t0) / 0.18) * math.pi) * (1 if T < t0 + 0.18 else 0)
    turn = ramp(T, t0 + 0.12, t0 + 0.42, "back")
    emo = blend_emotions(emotion("fear", brow_raise=0.8, mouth_open=0.0, pupil_k=0.5), emotion("surprise", mouth_open=0.5, pupil_k=0.45), turn)
    a = arman_cu_pose(T, emo, look=(1.0, 0.0), phone_glow=1.0, uplight=0.7, hand_b=(0.38, -0.55), phone_rot=-12)
    a.update(ht=lerp(0.25, 0.95, turn), bt=lerp(0.0, 0.45, turn), squash=-0.05 * ant, hdy=0.05 * ant - 0.03 * turn,
             lean=lerp(0, 6, turn))
    whip = ramp(T, 55.25, 55.7, "in")
    cx = lerp(560, 1500, whip)
    rot = lerp(0, 4, whip)
    z = 1.35
    p = skia.Paint()
    if whip > 0.05:
        p.setImageFilter(skia.ImageFilters.Blur(70 * whip, 2))
    c.saveLayer(None, p)
    west_world(c, T, flicker(T), coldness(T), a, cam_args=(cx, 1150, z), fg_mom=False, rot=rot,
               hall_red=0.35 + 0.4 * turn)
    c.restore()
    grade(c, T, cold=coldness(T), red=0.2 * turn, vig=0.85)


def s21(c, u, T):
    """Corridor: the double. «Он всегда пишет… первым.»"""
    t0 = EV["reveal"]
    settle = 1 - ramp(T, t0, t0 + 0.35, "out")
    step = ramp(T, EV["step"] - 0.2, EV["step"] + 0.25, "io")
    m = lip("double", T)
    last_word = ramp(T, 58.55, 58.8)
    emo = blend_emotions(emotion("calm_smirk", lid=0.32), emotion("calm_smirk", lid=0.18, smile=0.55, brow_asym=0.6), last_word)
    d = pose(dict(x=540, y=1390, s=1.85, bt=0.0, ht=0.0, key=(0.0, -1.0), rim_dir=(0.0, -1.0), rim_k=1.6,
                  hand_a=None, hand_b=None, step=step * 0.6),
             emo, life("double", T, 7, talk_gain=1.0), look=(-0.15, 0.0))
    d["tilt"] += lerp(0, -9, ramp(T, 57.2, 57.9)) + 4 * last_word
    d["breath"] = T * 0.18
    d["y"] += -12 * step
    d["glow_k"] = 0.45 + 0.4 * last_word
    pc = 0.9 - TL._dip(T, 56.55, 0.35, 0.22) - TL._dip(T, 57.45, 0.25, 0.2) - TL._dip(T, 58.75, 0.4, 0.25) \
        + 0.06 * math.sin(T * 2.1)
    z = lerp(1.08, 1.28, ease_in_out(ramp(T, t0, 59.9))) + 0.06 * last_word
    c.save()
    cam(c, 540 + 30 * settle, lerp(980, 1000, ease_in_out(ramp(T, t0, 59.9))), z, rot=1.5 * settle, T=T, shake=2 + 8 * settle)
    S2.corridor_v2(c, T, pc, red=0.45 + 0.3 * last_word)
    # red floor reflection + shadow
    c.drawOval(skia.Rect.MakeXYWH(360, 1700, 360, 70), fill(with_alpha(hexc("#000"), 0.6), blur=14))
    DOUBLE.draw(c, d)
    light_multiply(c, "#7a8098", [(540, 330, 1000, "#c8d6ff", 0.6 * pc), (540, 1000, 650, "#ffb0b0", 0.3),
                                  (540, 1920, 700, "#ffcf9a", 0.35)])
    # eyes keep glowing above the multiply pass
    hx, hy, R = DOUBLE.head_pos(d)
    for ex in (-0.37, 0.37):
        S.glow(c, hx + ex * R, hy + 0.05 * R, R * (0.32 + 0.2 * last_word), hexc("#ff2030"), 0.3 + 0.35 * last_word)
    c.restore()
    # Arman's shoulder in the foreground (OTS), blurred
    c.save()
    cam(c, 540, 1180, 1.0, T=T, shake=4)
    layer_blur(c, 14, dim=0.5)
    ARMAN.draw(c, dict(x=60, y=2700, s=3.2, back=True, bt=-0.2, rim_dir=(0.6, -1), rim_k=0.8, rim_col="#ff6a6a"), passes=("body", "head"))
    c.restore()
    c.restore()
    grade(c, T, cold=0.6, red=0.2 + 0.3 * last_word, vig=0.9)


def s22(c, u, T):
    c.drawColor(hexc("#000"))


def s23(c, u, T):
    """End card."""
    c.drawColor(hexc("#000"))
    t = T - EV["end_card"]
    f1 = font("russo", 118)
    f2 = font("russo", 140)
    a1 = ramp(t, 0.0, 0.25, "out")
    a2 = ramp(t, 0.55, 0.8, "out")
    jit = (1 - ramp(t, 0.0, 0.4)) * 10
    c.save()
    c.translate(math.sin(t * 90) * jit, 0)
    c.saveLayerAlpha(None, int(255 * a1))
    draw_text(c, "А КОМУ БЫ", W / 2, 860, f1, hexc("#f2f2f2"), align="center", shadow=(18, 0, with_alpha(hexc("#ff2a3a"), 0.35)))
    c.restore()
    c.saveLayerAlpha(None, int(255 * a2))
    w1 = f2.measureText("ПОВЕРИЛ ")
    w2 = f2.measureText("ТЫ?")
    x0 = W / 2 - (w1 + w2) / 2
    draw_text(c, "ПОВЕРИЛ ", x0, 1010, f2, hexc("#f2f2f2"))
    for dx, col in ((-6, "#2ad6ff"), (6, "#ff2a3a")):
        if t < 1.2:
            c.drawString("ТЫ?", x0 + w1 + dx * (1 - ramp(t, 0.6, 1.2)), 1010, f2, fill(with_alpha(hexc(col), 0.6)))
    draw_text(c, "ТЫ?", x0 + w1, 1010, f2, hexc("#ff2a3a"), shadow=(26, 0, with_alpha(hexc("#ff0010"), 0.6)))
    c.restore()
    c.restore()
    a3 = ramp(t, 1.4, 1.9)
    c.saveLayerAlpha(None, int(255 * a3))
    draw_text(c, "ТЕБЯ ЗДЕСЬ НЕ БЫЛО", W / 2, 1180, font("russo", 52), hexc("#bfc6d6"), align="center")
    draw_text(c, "СЕРИЯ 1 · «НЕ ОТВЕЧАЙ»", W / 2, 1245, font("rubik", 36, 500), hexc("#7d8599"), align="center")
    c.restore()
    S.vignette(c, 0.5)


SHOT_FN = {"S01": s01, "S02": s02, "S03": s03, "S04": s04, "S05": s05, "S06": s06, "S07": s07, "S08": s08,
           "S09": s09, "S10": s10, "S11": s11, "S12": s12, "S13": s13, "S14": s14, "S15": s15, "S16": s16_18,
           "S17": s16_18, "S18": s16_18, "S19": s19, "S20": s20, "S21": s21, "S22": s22, "S23": s23}


def shot_at(T):
    for sid, a, b, _ in TL.SHOTS:
        if a <= T < b:
            return sid, a, b
    sid, a, b, _ = TL.SHOTS[-1]
    return sid, a, b


_SURF = None


def render_frame(T):
    global _SURF
    if _SURF is None:
        _SURF = S_new()
    c = _SURF.getCanvas()
    c.clear(hexc("#000"))
    sid, a, b = shot_at(T)
    _SCENE["cold"] = coldness(T) if sid not in ("S21",) else 0.9
    c.save()
    SHOT_FN[sid](c, (T - a) / (b - a), T)
    c.restore()
    rgba = surface_rgba(_SURF)
    if sid in ("S22", "S23"):
        return rgba
    cold = _SCENE["cold"]
    insert = sid in ("S01", "S04", "S12", "S16", "S17", "S18")
    rgb = concept_look(rgba[:, :, :3], t=T, warm=max(0.25, 1.0 - cold), cold=cold, sat=1.2,
                       bloom=0.45 if insert else 0.6, soften=0.25 if insert else 0.6, grain=0.0)
    out = rgba.copy()
    out[:, :, :3] = rgb
    return out


def S_new():
    return new_surface(W, H)
