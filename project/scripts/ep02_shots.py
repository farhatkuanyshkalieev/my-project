"""Episode 02 «НЕ СЛУШАЙ ЕГО» — shots.  Built on the approved ep. 1 engine (ep01_shots helpers) with the
series standard: Arman's blue rim (RIM_MODE="standard"), Mom v3 stickman geometry, v2 sets, concept look."""
import json
import math
import os
import sys

import numpy as np
import skia

sys.path.insert(0, os.path.dirname(__file__))
import ep02_timeline as TL  # noqa: E402
import ep01_shots as E  # noqa: E402
from engine.core import (W, H, clamp, lerp, ramp, fbm, hexc, mix, with_alpha, fill, stroke, radial, linear, rrect,  # noqa: E402
                         font, draw_text, new_surface, surface_rgba, ease_in_out, ease_out, ease_out_back)
from engine.rig import emotion, blend_emotions  # noqa: E402
from engine import sets as S, sets2 as S2  # noqa: E402


def glide(u):
    """Camera move profile: eased, but never at rest inside a shot (keeps every 60 fps frame in motion)."""
    return 0.4 * u + 0.6 * ease_in_out(u)
from engine import ui as UI  # noqa: E402
from engine.look import concept_look  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
E.RIM_MODE = "standard"
_lp = os.path.join(ROOT, "ep02", "compositions", "lipsync.json")
E.LIPS = json.load(open(_lp)) if os.path.exists(_lp) else {}
UI.KEYWORDS_RED = ("НЕ СЛУШАЙ", "НЕ ОНА", "ПРОБЛЕМА", "ТЫ.")
EV = TL.EV
ARMAN, MOM, DOUBLE = E.ARMAN, E.MOM, E.DOUBLE
pose, life, cam, grade = E.pose, E.life, E.cam, E.grade


def coldness(T):
    # corridor = cold; the kitchen at the end is warm again (deceptively)
    return 0.85 * (1 - ramp(T, 44.4, 44.8)) + 0.15


# =========================================================================================== corridor (looking in)
def corridor_world(c, T, power=0.95, red=0.5, double=None, arman_fg=None, flare=0.0):
    S2.corridor_v2(c, T, power, red=red)
    if double:
        c.drawOval(skia.Rect.MakeXYWH(double["x"] - 130 * double["s"] / 1.45, 1640, 260 * double["s"] / 1.45, 50),
                   fill(with_alpha(hexc("#000"), 0.55), blur=12))
        DOUBLE.draw(c, double)
    if arman_fg:
        ARMAN.draw(c, arman_fg)
    pools = [(540, 820, 900, "#c8d6ff", 0.55 * power), (300, 1700, 700, "#ffcf9a", 0.35)]
    if double:
        pools.append((double["x"], 1050, 520, "#ffb0b0", 0.4 + 0.25 * flare))
    E.light_multiply(c, "#7a8098", pools)
    if double:
        hx, hy, R = DOUBLE.head_pos(double)
        for ex in (-0.37, 0.37):
            S2.glow(c, hx + (ex + double.get("ht", 0) * 0.48) * R, hy + 0.2 * R, R * (0.3 + 0.2 * flare), hexc("#ff2030"), 0.3 + 0.4 * flare)


def double_pose(T, x=700, y=1405, s=1.45, bt=-0.2, ht=-0.15, emo=None, **over):
    d = pose(dict(x=x, y=y, s=s, bt=bt, ht=ht, key=(0, -1), rim_dir=(0.2, -1), rim_k=1.5, hand_a=None, hand_b=None),
             emo or emotion("calm_smirk", lid=0.3), life("double", T, 7), look=(-0.3, 0.05))
    d["glow_k"] = 0.6
    d.update(over)
    return d


# =========================================================================================== corridor reverse (looking back to the kitchen)
@__import__("functools").lru_cache(maxsize=None)
def _rev_static():
    def f(c):
        c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, W, 0, [hexc("#0b0e0d"), hexc("#1b211e"), hexc("#0a0c0b")])))
        c.drawRect(skia.Rect.MakeXYWH(0, 1300, W, 620), fill(0, shader=linear(0, 1300, 0, H, [hexc("#1c1712"), hexc("#0a0705")])))
        # coat hooks + jackets on the corridor wall (left)
        c.drawRect(skia.Rect.MakeXYWH(40, 600, 230, 14), fill(hexc("#2a1d14")))
        for i, col in enumerate(["#3a1414", "#14202e"]):
            x = 90 + i * 110
            c.drawPath(E.path_poly([(x - 30, 612), (x + 30, 612), (x + 58, 900), (x - 58, 900)]), fill(hexc(col)))
    return S._record(f)


def corridor_reverse_bg(c, T, power=1.0, cold=0.8):
    c.drawPicture(_rev_static())
    # kitchen doorway (warm, defocused) — the same kitchen as the wide set
    dx0, dy0, dx1, dy1 = 470, 360, 980, 1500
    c.drawRect(skia.Rect.MakeLTRB(dx0 - 28, dy0 - 28, dx1 + 28, dy1), fill(hexc("#24170f")))
    c.save()
    c.clipRect(skia.Rect.MakeLTRB(dx0, dy0, dx1, dy1))
    p = skia.Paint(); p.setImageFilter(skia.ImageFilters.Blur(9, 9))
    c.saveLayer(None, p)
    c.translate(dx0 - 120, dy0 - 420); c.scale(0.95, 0.95)
    c.drawPicture(S2.pic_kitchen_north_v2())
    S2.lamp_v2(c, S.K["lamp_x"], S.K["lamp_y"], power)
    c.restore()
    c.restore()
    c.drawCircle((dx0 + dx1) / 2, 800, 700, fill(0, shader=radial((dx0 + dx1) / 2, 800, 700, [with_alpha(hexc(S2.AMBER), 0.28 * power),
                                                                                         with_alpha(hexc(S2.AMBER), 0)]),
                                                   blend=skia.BlendMode.kPlus))
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 420, 0, [with_alpha(hexc("#5f8fd6"), 0.18 * cold), with_alpha(hexc("#5f8fd6"), 0)]),
                                            blend=skia.BlendMode.kPlus))


def arman_standing_cu(T, emo, look=(0.3, 0.05), **over):
    return pose(dict(x=540, y=1700, s=2.15, bt=0.0, ht=0.1, key=(0.3, -0.7), rim_dir=(-0.6, -0.8), rim_k=1.3,
                     hand_a=None, hand_b=(0.55, -0.85), phone="b", phone_rot=-14, phone_glow=0.25, elbow_b=1),
                emo, life("arman", T, 1), look=look, **over)


def reverse_world(c, T, arman, cam_args=(540, 1060, 1.05), power=1.0, cold=0.8, shake=3.0, rot=0.0, blur=6.0):
    cx, cy, z = cam_args
    c.save()
    cam(c, cx, cy, z * 0.95 + 0.05, rot=rot, T=T, shake=shake * 0.5)
    E.layer_blur(c, blur)
    corridor_reverse_bg(c, T, power, cold)
    c.restore()
    c.restore()
    c.save()
    cam(c, cx, cy, z, rot=rot, T=T, shake=shake)
    ARMAN.draw(c, arman)
    E.light_multiply(c, "#7a8098", [(725, 820, 900, "#ffd2a0", 0.45 * power), (100, 900, 700, "#9fb5e0", 0.3 * cold),
                                    (540, 1300, 500, "#cfe0ff", 0.3 * arman.get("uplight", 0))])
    c.restore()


# =========================================================================================== shots
def s01(c, u, T):
    """Corridor: the double steps out of the dark; Arman (foreground) whispers."""
    stp = ramp(T, EV["step"], EV["step"] + 0.6)
    emerge = ramp(T, 0.0, 0.8)
    d = double_pose(T, x=lerp(740, 705, stp), y=1405 + 16 * stp, s=lerp(1.38, 1.46, stp), bt=-0.45, ht=-0.35,
                    step=0.6 * math.sin(stp * math.pi))
    d["alpha"] = 0.35 + 0.65 * emerge
    fear = ramp(T, 0.3, 0.7)
    a = pose(dict(x=310, y=1600, s=2.15, bt=0.62, ht=0.5, key=(0.4, -0.6), rim_dir=(0.9, -0.5), rim_k=1.2,
                  hand_a=(0.95, -0.95), elbow_a=1, hand_b=None, phone="a", phone_rot=-28, phone_glow=0.25, lean=-4 * fear),
             emotion("fear", brow_raise=0.7, brow_angle=-0.6, mouth_open=0, smile=-0.3, pupil_k=0.7), life("arman", T, 1), look=(0.85, 0.0))
    z = lerp(1.06, 1.12, glide(u))
    c.save()
    cam(c, 540, 1000, z, T=T, shake=2.5)
    corridor_world(c, T, 0.95, 0.5 + 0.2 * emerge, double=d, arman_fg=a)
    c.restore()
    grade(c, T, cold=0.7, red=0.25, vig=0.85)


def s02(c, u, T):
    """Double MCU: «Видишь? Опять… первым.» — points at Arman's phone."""
    point = ramp(T, 3.55, 3.95, "back") * (1 - ramp(T, 5.7, 6.2))
    flare = ramp(T, 5.15, 5.4) * (1 - 0.4 * ramp(T, 5.8, 6.4))
    d = double_pose(T, x=560, y=1700, s=2.3, bt=-0.25, ht=-0.2,
                    emo=emotion("calm_smirk", lid=0.3 - 0.12 * flare, smile=0.35 + 0.25 * point),
                    hand_b=(lerp(0.5, -1.2, point), lerp(-0.2, -1.5, point)), elbow_b=-1)
    d["tilt"] += -7 * ramp(T, 3.5, 4.1) + 5 * flare
    d["glow_k"] = 0.6 + 0.6 * flare
    c.save()
    cam(c, 560, 1000, lerp(1.05, 1.15, glide(u)), T=T, shake=2.0)
    E.layer_blur(c, 5); S2.corridor_v2(c, T, 0.9, red=0.6 + 0.3 * flare); c.restore()
    DOUBLE.draw(c, d)
    E.light_multiply(c, "#7a8098", [(540, 820, 900, "#c8d6ff", 0.5), (560, 1000, 600, "#ffb0b0", 0.45 + 0.25 * flare)])
    hx, hy, R = DOUBLE.head_pos(d)
    for ex in (-0.37, 0.37):
        S2.glow(c, hx + (ex + d["ht"] * 0.48) * R, hy + 0.2 * R, R * (0.3 + 0.2 * flare), hexc("#ff2030"), 0.3 + 0.4 * flare)
    c.restore()
    grade(c, T, cold=0.7, red=0.3 + 0.3 * flare, vig=0.85)


def chat_items(T, msg2=False):
    items = [dict(side="in", text="ТЫ ОТВЕТИЛ. ТЕПЕРЬ У НАС ПРОБЛЕМА.", appear_t=None),
             dict(side="out", text="КТО ТЫ?", appear_t=None),
             dict(side="in", text=TL.PREV_MSG, appear_t=None)]
    if T >= EV["msg1"]:
        items.append(dict(side="in", text=TL.MSG1, appear_t=T - EV["msg1"]))
    if msg2 and T >= EV["msg2"]:
        items.append(dict(side="in", text=TL.MSG2, appear_t=T - EV["msg2"]))
    return items


def corridor_bokeh(c, T, red=0.5):
    E.layer_blur(c, 24)
    c.save(); cam(c, 560, 1000, 1.6, T=T, shake=3)
    S2.corridor_v2(c, T, 0.9, red=red)
    c.restore(); c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#05060a"), 0.4)))


def s03(c, u, T):
    corridor_bokeh(c, T, 0.6)
    vib = 1.0 if EV["msg1"] < T < EV["msg1"] + 0.5 else 0.0

    def content(cc):
        E.PHONE.chat(cc, T, chat_items(T))
    E.draw_phone_insert(c, T, content, x=220, y=lerp(-170, -210, u), rot=-2, s=lerp(1.28, 1.34, u), shake=vib * 0.8 + 0.15)
    grade(c, T, cold=0.7, vig=0.8)


def s04(c, u, T):
    emo = emotion("fear", brow_raise=0.6, brow_angle=-0.6, mouth_open=0, smile=-0.3, pupil_k=0.7)
    look = (lerp(0.2, 0.75, ramp(T, 9.5, 9.7)), lerp(0.6, 0.0, ramp(T, 9.5, 9.7)))
    a = arman_standing_cu(T, emo, look=look, nod=0.3 * (1 - ramp(T, 9.5, 9.7)), uplight=0.35)
    reverse_world(c, T, a, cam_args=(540, 1060, lerp(1.1, 1.2, glide(u))))
    grade(c, T, cold=0.6, vig=0.82)


def s05(c, u, T):
    lean = ramp(T, 13.0, 13.6)
    d = double_pose(T, x=540, y=1760, s=2.55, bt=0.0, ht=-0.05, emo=emotion("calm_smirk", lid=0.32, smile=0.3 + 0.2 * ramp(T, 15.3, 15.8)))
    d["tilt"] += 5 * lean
    c.save()
    cam(c, 540, 980, lerp(1.12, 1.26, glide(u)), T=T, shake=2.0)
    E.layer_blur(c, 7); S2.corridor_v2(c, T, 0.85, red=0.7); c.restore()
    DOUBLE.draw(c, d)
    E.light_multiply(c, "#7a8098", [(540, 820, 900, "#c8d6ff", 0.45), (540, 980, 620, "#ffb0b0", 0.5)])
    hx, hy, R = DOUBLE.head_pos(d)
    for ex in (-0.37, 0.37):
        S2.glow(c, hx + ex * R, hy + 0.2 * R, R * 0.32, hexc("#ff2030"), 0.35)
    c.restore()
    grade(c, T, cold=0.7, red=0.35, vig=0.88)


def s06(c, u, T):
    nodk = ramp(T, 17.9, 18.4) * (1 - ramp(T, 19.0, 19.5))
    d = double_pose(T, x=640, y=1560, s=1.9, bt=-0.35, ht=lerp(-0.2, 0.55, nodk), emo=emotion("calm_smirk", lid=0.3),
                    look=(lerp(-0.4, 0.9, nodk), 0.05))
    d["tilt"] += 8 * nodk
    c.save()
    cam(c, 600, 1000, lerp(1.08, 1.12, u), T=T, shake=2.0)
    corridor_world(c, T, 0.9, 0.6, double=d)
    c.restore()
    grade(c, T, cold=0.7, red=0.3, vig=0.85)


def clock_secs(T):
    """23:17:58.8 … 23:18:00 at clock_turn, rewinds to 23:17:00 after clock_rewind (glitch), then ticks again."""
    if T < EV["clock_rewind"]:
        return 17, 60 + (T - EV["clock_turn"])
    r = ramp(T, EV["clock_rewind"], EV["clock_rewind"] + 0.5, "in")
    if r < 1:
        return 17, lerp(60 + (EV["clock_rewind"] - EV["clock_turn"]), 0.0, r)
    return 17, T - (EV["clock_rewind"] + 0.5)


def s07(c, u, T):
    """Insert: the kitchen wall clock — 23:18 for a heartbeat, then it rewinds to 23:17."""
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(540, 900, 1100, [hexc("#3a2616"), hexc("#120b06")])))
    E.layer_blur(c, 16)
    c.save(); c.translate(-300, -150); c.scale(1.8, 1.8)
    c.drawPicture(S2.pic_kitchen_north_v2())
    c.restore(); c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#000"), 0.35)))
    mn, secs = clock_secs(T)
    glitch = ramp(T, EV["clock_rewind"] - 0.05, EV["clock_rewind"]) * (1 - ramp(T, EV["clock_rewind"] + 0.5, EV["clock_rewind"] + 0.65))
    z = lerp(1.0, 1.12, glide(u))
    c.save()
    c.translate(540 + 7 * math.sin(T * 0.9) + 3 * math.sin(T * 2.3), 900 + 5 * math.sin(T * 0.7 + 1.0))
    c.rotate(0.6 * math.sin(T * 0.5)); c.scale(z, z)
    if glitch > 0:
        k = int(T * 30)
        c.translate(math.sin(k * 7.1) * 14 * glitch, 0)
    S.draw_clock(c, 0, 0, 330, 0.0, hour=23, minute=mn, sec0=secs)
    E.light_multiply(c, "#8a7460", [(-120, -160, 520, "#ffe0b8", 0.45)])
    if glitch > 0:
        for dx, col in ((-10, "#ff2a3a"), (10, "#2ad6ff")):
            c.drawCircle(dx * glitch, 0, 335, stroke(with_alpha(hexc(col), 0.5 * glitch), 6))
    c.restore()
    # digital readout under the clock (same UI type as the phone)
    txt = "23:18" if EV["clock_turn"] <= T < EV["clock_rewind"] else "23:17"
    f = font("rubik", 72, 600)
    draw_text(c, txt, 540, 1420, f, hexc("#ff3b44") if txt == "23:18" else hexc("#f2f2f2"), align="center",
              shadow=(14, 0, with_alpha(hexc("#ff0010" if txt == "23:18" else "#000000"), 0.6)))
    grade(c, T, warm=0.5, vig=0.8)


def s08(c, u, T):
    emo = emotion("fear", brow_raise=0.9, brow_angle=-0.8, lid=-0.25, mouth_open=0.15, smile=-0.4, pupil_k=0.55)
    a = arman_standing_cu(T, emo, look=(0.1, 0.0), uplight=0.2)
    a["blink"] = 0.0
    reverse_world(c, T, a, cam_args=(540, 980, lerp(1.7, 1.95, glide(u))), power=TL.flicker(T), blur=10)
    grade(c, T, cold=0.6, vig=0.9)


def s09(c, u, T):
    corridor_bokeh(c, T, 0.5)
    rt = T - EV["ring_start"]

    def content(cc):
        if rt < 0:
            E.PHONE.chat(cc, T, chat_items(T))
        else:
            E.PHONE.call(cc, T)
    vib = 1.0 if rt > 0 and ((rt % 2.2) < 0.9) else 0.0
    E.draw_phone_insert(c, T, content, x=220, y=280, rot=-2, s=lerp(1.0, 1.05, u), shake=vib * 0.9 + 0.15)
    grade(c, T, cold=0.6, vig=0.78)


def s10(c, u, T):
    d = double_pose(T, x=540, y=1760, s=2.55, bt=0.0, ht=0.0,
                    emo=emotion("calm_smirk", lid=0.38, smile=0.0, brow_angle=0.3), look=(0.0, 0.05))
    d["tilt"] += -4
    c.save()
    cam(c, 540, 960, lerp(1.25, 1.4, glide(u)), T=T, shake=1.5)
    E.layer_blur(c, 8); S2.corridor_v2(c, T, TL.flicker(T) * 0.85, red=0.8); c.restore()
    DOUBLE.draw(c, d)
    E.light_multiply(c, "#727890", [(540, 820, 900, "#c8d6ff", 0.4), (540, 980, 620, "#ffb0b0", 0.55)])
    hx, hy, R = DOUBLE.head_pos(d)
    for ex in (-0.37, 0.37):
        S2.glow(c, hx + ex * R, hy + 0.2 * R, R * 0.36, hexc("#ff2030"), 0.45)
    c.restore()
    grade(c, T, cold=0.7, red=0.45, vig=0.9)


def s11(c, u, T):
    corridor_bokeh(c, T, 0.4)
    at = T - EV["answer"]

    def content(cc):
        E.PHONE.call(cc, T, answered_t=at if at > 0 else None)
    vib = 1.0 if at < 0 and (((T - EV["ring_start"]) % 2.2) < 0.9) else 0.0
    E.draw_phone_insert(c, T, content, x=220, y=280, rot=-2, s=lerp(1.02, 1.07, u), shake=vib * 0.8 + 0.2)
    tx = lerp(150, 760, ease_in_out(ramp(T, 32.3, EV["answer"] - 0.05)))
    ty = lerp(1900, 1355, ease_out(ramp(T, 32.2, EV["answer"] - 0.05))) + (12 if 0 < at < 0.15 else 0)
    c.save(); c.translate(tx, ty); c.rotate(-28)
    c.drawCircle(40, 430, 210, fill(hexc("#121318")))
    c.drawRRect(rrect(-58, -40, 116, 360, 58), fill(hexc("#121318")))
    c.drawRRect(rrect(-58, -40, 116, 360, 58), stroke(with_alpha(hexc("#8fb8ff"), 0.45), 4, blur=3))
    c.drawOval(skia.Rect.MakeXYWH(-30, -22, 60, 70), fill(with_alpha(hexc("#3a4258"), 0.9)))
    c.restore()
    grade(c, T, cold=0.6, vig=0.78)


def s12(c, u, T):
    """Phone at the ear; Mom's voice; he glances back — the corridor is empty."""
    raise_ = ramp(T, 34.0, 34.35, "out")
    back = ramp(T, 36.6, 37.0) * (1 - ramp(T, 37.9, 38.3))
    emo = blend_emotions(emotion("fear", mouth_open=0, brow_raise=0.6, smile=-0.3, pupil_k=0.7),
                         emotion("surprise", pupil_k=0.55, brow_raise=0.95, lid=-0.2), ramp(T, 37.0, 37.3))
    a = arman_standing_cu(T, emo, look=(lerp(0.2, -0.95, back), 0.05), phone="a", phone_glow=0.0, uplight=0.1,
                          hand_a=(lerp(-0.5, -1.3, raise_), lerp(0.2, -1.92, raise_)), phone_rot=lerp(0, 22, raise_),
                          hand_b=None, elbow_a=1, ht=lerp(0.1, -0.55, back), bt=lerp(0.0, -0.25, back))
    reverse_world(c, T, a, cam_args=(540, 1040, lerp(1.15, 1.25, glide(u))))
    grade(c, T, cold=0.6, vig=0.84)


def s13(c, u, T):
    emo = emotion("fear", mouth_open=0, brow_raise=0.7, brow_angle=-0.9, smile=-0.5, pupil_k=0.65)
    a = arman_standing_cu(T, emo, look=(0.6, 0.1), phone="a", phone_glow=0.0, uplight=0.1, hand_a=(-1.3, -1.92), phone_rot=22,
                          hand_b=None, elbow_a=1, ht=0.3)
    a["tilt"] += -8 + 0.6 * math.sin(T * 13)
    reverse_world(c, T, a, cam_args=(560, 1000, lerp(1.6, 1.72, glide(u))), rot=-4.0, blur=10)
    grade(c, T, cold=0.6, vig=0.88)


def s14(c, u, T):
    """He turns towards the warm kitchen light."""
    turn = ease_in_out(ramp(T, EV["turn_kitchen"], EV["turn_kitchen"] + 1.2))
    emo = emotion("worried", brow_raise=0.5, brow_angle=-0.6)
    a = arman_standing_cu(T, emo, look=(lerp(0.3, 0.9, turn), -0.05), phone="a", phone_glow=0.0, uplight=0.0,
                          hand_a=(lerp(-1.3, -0.4, ramp(T, 43.6, 44.3)), lerp(-1.92, 0.2, ramp(T, 43.6, 44.3))), phone_rot=22,
                          hand_b=None, elbow_a=1, ht=lerp(0.2, 0.95, turn), bt=lerp(0.0, 0.7, turn))
    reverse_world(c, T, a, cam_args=(lerp(540, 640, turn), 1040, lerp(1.2, 1.28, u)), power=1.0 + 0.2 * turn, cold=0.8 - 0.4 * turn)
    grade(c, T, warm=0.3 * turn, cold=0.6 * (1 - turn), vig=0.84)


def s15(c, u, T):
    """Wide kitchen over Arman's shoulder: Mom at the table, steam rising — as if nothing happened."""
    mom = pose(E.M_BASE, emotion("neutral", smile=0.4), life("mom", T, 2), look=(-0.7, 0.05),
               hand_b=(-1.2, -0.62), hand_a=(-1.0, -0.62))
    z = lerp(1.6, 1.75, glide(u))
    c.save()
    cam(c, 660, 1120, z, T=T, shake=2.5)
    E.north_world(c, T, 1.0, 0.15, arman=None, mom=mom)
    c.restore()
    # Arman's back in the doorway (foreground left)
    c.save()
    cam(c, 540, 1110, 1.0, T=T, shake=3)
    E.layer_blur(c, 8, dim=0.6)
    ARMAN.draw(c, dict(x=120, y=2500, s=3.0, back=True, bt=0.2, rim_dir=(1, -0.6), rim_k=1.1, key=(0.5, -0.5)), passes=("body", "head"))
    c.restore()
    c.restore()
    grade(c, T, warm=0.8, vig=0.75)


def s16(c, u, T):
    """Mom CU: «Сынок, садись. Чай остывает.» — a red flash in her eyes."""
    emo = emotion("neutral", smile=0.45, squint=0.12, brow_raise=0.15)
    mom = E.mom_cu_pose(T, emo, look=(-0.3, 0.05))
    g = TL._dip(T, EV["mom_glitch"] - 0.04, 1.0, 0.36)  # single smooth sin² hump, no hard flash (photosensitivity)
    z = lerp(1.3, 1.42, glide(u))
    E.east_world(c, T, TL.flicker(T), 0.15, mom=mom, cam_args=(555, 1140, z), bg_blur=9, show_phone_back=(300, 1660, -8))
    if g > 0:
        c.save(); cam(c, 555, 1140, z, T=T, shake=3.0)
        hx, hy, R = MOM.head_pos(mom)
        for ex in (-0.36, 0.36):
            S2.glow(c, hx + (ex + mom["ht"] * 0.48) * R, hy + 0.2 * R, R * 0.28, hexc("#ff2030"), 0.95 * g)
            c.drawCircle(hx + (ex + mom["ht"] * 0.48) * R, hy + 0.2 * R, R * 0.1, fill(with_alpha(hexc("#ff3040"), g)))
        c.restore()
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#ff1a2a"), 0.06 * g), blend=skia.BlendMode.kPlus))
    grade(c, T, warm=0.7, vig=0.75)


def s17(c, u, T):
    E.kitchen_bokeh_bg(c, T, zoom=2.0, cx=650, cy=1080, power=1.0, mom=True, cold=0.1)
    vib = 1.0 if EV["msg2"] < T < EV["msg2"] + 0.5 else 0.0

    def content(cc):
        E.PHONE.chat(cc, T, chat_items(T, msg2=True))
    E.draw_phone_insert(c, T, content, x=210, y=lerp(-90, -130, u), rot=-2.5, s=lerp(1.28, 1.36, u), shake=vib * 0.8 + 0.15)
    grade(c, T, warm=0.3, vig=0.8)


def s18(c, u, T):
    snap = ramp(T, 57.0, 57.12, "out")
    emo = blend_emotions(emotion("fear", brow_raise=0.7, brow_angle=-0.6, mouth_open=0, smile=-0.4, pupil_k=0.7),
                         emotion("surprise", mouth_open=0.05, pupil_k=0.45, brow_raise=1.0, lid=-0.3), snap)
    a = E.arman_cu_pose(T, emo, look=(lerp(0.05, 0.95, snap), lerp(0.65, 0.0, snap)), nod=0.25 * (1 - snap), phone_glow=1.0,
                        uplight=0.6, hand_b=(0.38, -0.55), phone_rot=-12)
    a["blink"] = 0.0 if T > 57.0 else a["blink"]
    E.west_world(c, T, 1.0, 0.15, a, cam_args=(560, 1150, lerp(2.3, 2.55, u)), fg_mom=False, bg_blur=12)
    grade(c, T, warm=0.4, vig=0.9)


def s19(c, u, T):
    c.drawColor(hexc("#000"))


def s20(c, u, T):
    c.drawColor(hexc("#000"))
    t = T - EV["end_card"]
    f1, f2 = font("russo", 118), font("russo", 150)
    a1, a2 = ramp(t, 0.0, 0.25, "out"), ramp(t, 0.55, 0.8, "out")
    jit = (1 - ramp(t, 0.0, 0.4)) * 10
    c.save(); c.translate(math.sin(t * 90) * jit, 0)
    c.saveLayerAlpha(None, int(255 * a1))
    draw_text(c, "ТОГДА", W / 2, 860, f1, hexc("#f2f2f2"), align="center", shadow=(18, 0, with_alpha(hexc("#ff2a3a"), 0.35)))
    c.restore()
    c.saveLayerAlpha(None, int(255 * a2))
    w1, w2 = f2.measureText("КТО "), f2.measureText("ОНА?")
    x0 = W / 2 - (w1 + w2) / 2
    draw_text(c, "КТО ", x0, 1020, f2, hexc("#f2f2f2"))
    for dx, col in ((-6, "#2ad6ff"), (6, "#ff2a3a")):
        if t < 1.2:
            c.drawString("ОНА?", x0 + w1 + dx * (1 - ramp(t, 0.6, 1.2)), 1020, f2, fill(with_alpha(hexc(col), 0.6)))
    draw_text(c, "ОНА?", x0 + w1, 1020, f2, hexc("#ff2a3a"), shadow=(26, 0, with_alpha(hexc("#ff0010"), 0.6)))
    c.restore(); c.restore()
    c.saveLayerAlpha(None, int(255 * ramp(t, 1.4, 1.9)))
    draw_text(c, "ТЕБЯ ЗДЕСЬ НЕ БЫЛО", W / 2, 1190, font("russo", 52), hexc("#bfc6d6"), align="center")
    draw_text(c, "СЕРИЯ 2 · «НЕ СЛУШАЙ ЕГО»", W / 2, 1255, font("rubik", 36, 500), hexc("#7d8599"), align="center")
    c.restore()
    S.vignette(c, 0.5)


SHOT_FN = {f"S{i:02d}": globals()[f"s{i:02d}"] for i in range(1, 21)}
INSERTS = ("S03", "S07", "S09", "S11", "S17")


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
        _SURF = new_surface()
    c = _SURF.getCanvas()
    c.clear(hexc("#000"))
    sid, a, b = shot_at(T)
    E._SCENE["cold"] = coldness(T)
    c.save()
    SHOT_FN[sid](c, (T - a) / (b - a), T)
    c.restore()
    rgba = surface_rgba(_SURF)
    if sid in ("S19", "S20"):
        return rgba
    cold = coldness(T)
    ins = sid in INSERTS
    rgb = concept_look(rgba[:, :, :3], t=T, warm=max(0.25, 1.0 - cold), cold=cold, sat=1.2,
                       bloom=0.45 if ins else 0.6, soften=0.25 if ins else 0.6, grain=0.0)
    out = rgba.copy()
    out[:, :, :3] = rgb
    return out
