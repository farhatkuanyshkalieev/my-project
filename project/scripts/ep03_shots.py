"""Episode 03 «ДВЕРЬ 048» — shots.  Same engine and series standard as ep. 2 (ep01_shots helpers, rig2, concept look,
Arman's blue rim). New in this episode, drawn by the same rig/sets: the Girl (rig2 CONCEPT["girl"], v3 port of the v1
sheet) and the stairwell (engine/sets3.py, v1 geography)."""
import json
import math
import os
import sys

import skia

sys.path.insert(0, os.path.dirname(__file__))
import ep03_timeline as TL  # noqa: E402
import ep01_shots as E  # noqa: E402
from engine.core import (W, H, clamp, lerp, ramp, fbm, hexc, with_alpha, fill, stroke, radial, linear, rrect,  # noqa: E402
                         font, draw_text, new_surface, surface_rgba, ease_in_out, ease_out)
from engine.rig import emotion, blend_emotions  # noqa: E402
from engine import sets as S, sets2 as S2, sets3 as S3  # noqa: E402
from engine import ui as UI  # noqa: E402
from engine.look import concept_look  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
E.RIM_MODE = "standard"
_lp = os.path.join(ROOT, "ep03", "compositions", "lipsync.json")
E.LIPS = json.load(open(_lp)) if os.path.exists(_lp) else {}
UI.KEYWORDS_RED = ("НЕ ВОЗВРАЩАЙСЯ", "НЕ СЛУШАЙ", "НЕ ОНА", "ТЫ.", "ВОЗВРАЩАЙСЯ", "НЕ")   # chat wraps "НЕ / ВОЗВРАЩАЙСЯ." onto two lines
EV = TL.EV
ARMAN, MOM, DOUBLE = E.ARMAN, E.MOM, E.DOUBLE
GIRL = E.V2Rig("girl")
pose, life, cam, grade = E.pose, E.life, E.cam, E.grade


def glide(u):
    """Camera move profile: eased, but never at rest inside a shot (keeps every 60 fps frame in motion)."""
    return 0.4 * u + 0.6 * ease_in_out(u)


def coldness(T):
    if T < TL.SHOTS[3][1]:                 # kitchen (deceptively warm)
        return 0.15
    if 48.4 <= T < 51.4:                   # through the crack: the kitchen again
        return 0.2
    return 0.85


def hit_shake(T, t0, amp=14.0, dur=0.5):
    """Decaying camera kick (door slam)."""
    if T < t0 or T > t0 + dur:
        return 0.0, 0.0
    k = 1 - (T - t0) / dur
    return amp * k * k * math.sin((T - t0) * 70), amp * 0.6 * k * k * math.cos((T - t0) * 55)


def girl_life(T, seed=4):
    L = life("girl", T, seed)
    L["hair_sway"] = 0.6 * math.sin(T * 1.7) + 0.4 * fbm(T * 0.8, 40)
    return L


def red_eyes(c, rig, p, k, r=0.3):
    if k <= 0:
        return
    hx, hy, R = rig.head_pos(p)
    for ex in (-0.36, 0.36):
        S2.glow(c, hx + (ex + p.get("ht", 0) * 0.48) * R, hy + 0.18 * R, R * r, hexc("#ff2030"), 0.75 * k)
        c.drawCircle(hx + (ex + p.get("ht", 0) * 0.48) * R, hy + 0.18 * R, R * 0.09, fill(with_alpha(hexc("#ff3040"), 0.85 * k)))


# =========================================================================================== kitchen (cold open)
def s01(c, u, T):
    """Mom CU: a smile that is too even; her head tilts a little too far."""
    tilt = ease_in_out(ramp(T, EV["head_tilt"], EV["head_tilt"] + 1.1))
    emo = emotion("neutral", smile=0.62, squint=0.1, brow_raise=0.1)
    mom = E.mom_cu_pose(T, emo, look=(lerp(-0.3, 0.0, tilt), 0.05))
    mom["tilt"] += 16 * tilt
    mom["blink"] = 0.0 if T > 1.2 else mom["blink"]          # stops blinking
    z = lerp(1.28, 1.4, glide(u))
    E.east_world(c, T, 1.0, 0.15, mom=mom, cam_args=(555, 1140, z), bg_blur=9, show_phone_back=(300, 1660, -8))
    grade(c, T, warm=0.7, vig=0.78)


def s02(c, u, T):
    """Arman ECU: backing away from the table."""
    back = ease_out(ramp(T, 3.3, 4.4))
    emo = emotion("fear", brow_raise=0.85, brow_angle=-0.8, mouth_open=0, smile=-0.5, pupil_k=0.6)
    a = E.arman_cu_pose(T, emo, look=(0.25, 0.05), phone_glow=1.0, uplight=0.5, hand_b=(0.38, -0.55), phone_rot=-12,
                        lean=-5 * back, hdy=0.04 * back)
    E.west_world(c, T, 1.0, 0.15, a, cam_args=(560, 1150, lerp(2.2, 2.0, glide(u)) - 0.08 * back), fg_mom=True, bg_blur=12)
    grade(c, T, warm=0.45, vig=0.88)


def s03(c, u, T):
    """Mom CU: «Я здесь. Я всегда здесь.» — the lamp sags, her eyes slowly fill with red."""
    red = ease_in_out(ramp(T, EV["eyes_red"], EV["eyes_red"] + 1.4))
    emo = emotion("neutral", smile=0.55 - 0.25 * red, squint=0.05, brow_raise=0.05, lid=0.08 * red)
    mom = E.mom_cu_pose(T, emo, look=(0.0, 0.05))
    mom["tilt"] += 10 * (1 - ramp(T, 6.0, 7.0))
    mom["blink"] = 0.0
    z = lerp(1.36, 1.6, glide(u))
    E.east_world(c, T, TL.flicker(T), 0.15, mom=mom, cam_args=(555, 1120, z), bg_blur=10, show_phone_back=None)
    c.save(); cam(c, 555, 1120, z, T=T, shake=3.0)
    red_eyes(c, MOM, mom, red * (0.8 + 0.2 * math.sin(T * 3.0)))
    c.restore()
    grade(c, T, warm=0.6 * (1 - 0.5 * red), red=0.25 * red, vig=0.82 + 0.08 * red)


# =========================================================================================== run → stairwell
def s04(c, u, T):
    """Corridor: Arman runs to the front door, it swings open into cold light."""
    run = ramp(T, EV["run"], EV["door_open"] + 0.6)
    k = ease_in_out(run)
    ph = (T - EV["run"]) * 2 * math.pi * 2.6
    sw = math.sin(ph)
    a = dict(x=lerp(560, 540, k), y=lerp(1860, 1300, k) - 22 * abs(math.cos(ph)), s=lerp(1.6, 0.92, k), back=True, bt=0.0,
             step=0.95 * sw, hand_a=(-0.55 + 0.35 * sw, -0.25), hand_b=(0.55 - 0.35 * sw, -0.25), elbow_a=1, elbow_b=-1,
             key=(0, -1), rim_dir=(0, -1), rim_k=1.3, lean=4 * sw, alpha=1.0 if T > EV["run"] else 0.0)
    door = ease_out(ramp(T, EV["door_open"], EV["door_open"] + 0.5))
    c.save()
    cam(c, 540, 980, lerp(1.08, 1.2, glide(u)), T=T, shake=4.0)
    S2.corridor_v2(c, T, 0.8 + 0.7 * door, red=0.0)
    if door > 0:     # cold stairwell light flooding through the opened front door
        S2.glow(c, 540, 900, 300 + 300 * door, hexc("#bcd2ff"), 0.45 * door)
    ARMAN.draw(c, a)
    E.light_multiply(c, "#7a8098", [(540, 820, 900, "#c8d6ff", 0.55 + 0.3 * door), (540, 1700, 700, "#ffcf9a", 0.3)])
    c.restore()
    grade(c, T, cold=0.65, vig=0.85)


def door_world(c, T, z=1.0, cx=540, cy=1000, light=1.0, crack=0.0, warm_scene=None, handle_turn=0.0, shake=2.5,
               chars=(), blur=0.0, kick=(0.0, 0.0)):
    c.save()
    cam(c, cx + kick[0], cy + kick[1], z, T=T, shake=shake)
    if blur > 0:
        E.layer_blur(c, blur)
    S3.door048(c, T, light=light, crack=crack, warm_scene=warm_scene, handle_turn=handle_turn)
    if blur > 0:
        c.restore()
    for rig, p in chars:
        c.drawOval(skia.Rect.MakeXYWH(p["x"] - 120 * p["s"], p["y"] + 1.75 * 100 * p["s"] * (0.72 if rig is GIRL else 1.0), 240 * p["s"], 46 * p["s"]),
                   fill(with_alpha(hexc("#000"), 0.45), blur=14))
        rig.draw(c, p)
    E.light_multiply(c, "#76809a", [(540, 200, 1100, "#cfe0ff", 0.55 * light), (S3.DX + S3.DW, 1100, 700 + 500 * crack, "#ffcf9a", 0.6 * crack)])
    c.restore()


def kitchen_through_gap(T, double_turn=0.0, blur=7, ox=None, oy=None, sc=0.95):
    """What is behind door 048: the same kitchen (wide set), Mom and the double at the table."""
    def f(c):
        c.save()
        c.translate(S3.DX + S3.DW - 520 if ox is None else ox, S3.DY - 260 if oy is None else oy)
        c.scale(sc, sc)
        E.layer_blur(c, blur)
        mom = pose(E.M_BASE, emotion("neutral", smile=0.5, squint=0.1), life("mom", T, 2), look=(-0.6, 0.05))
        dbl = pose(dict(E.A_BASE, phone=None, phone_glow=0.0, uplight=0.0, hand_a=(1.15, -0.62), hand_b=(1.0, -0.6),
                        rim_k=1.4, ht=lerp(0.5, -0.1, double_turn), bt=lerp(0.7, 0.4, double_turn)),
                   emotion("calm_smirk", lid=0.3), life("double", T, 7), look=(lerp(0.6, -0.2, double_turn), 0.05))
        dbl["glow_k"] = 0.8
        E.north_world(c, T, 1.0, 0.1, arman=None, mom=mom, extra_after=lambda cc: DOUBLE.draw(cc, dbl))
        c.restore()
        c.restore()
    return f


def arman_at_door(T, emo, x=540, y=1580, s=1.6, look=(0.0, 0.05), **over):
    return pose(dict(x=x, y=y, s=s, bt=0.0, ht=0.0, key=(0.2, -0.9), rim_dir=(0.3, -1), rim_k=1.3, hand_a=None, hand_b=None),
                emo, life("arman", T, 1), look=look, **over)


def s05(c, u, T):
    """The door slams; Arman presses his back against it, breathing hard."""
    shut = ease_out(ramp(T, 11.6, EV["door_slam"]))
    kick = hit_shake(T, EV["door_slam"])
    pant = math.sin(T * 2 * math.pi * 1.5)
    emo = emotion("fear", brow_raise=0.8, brow_angle=-0.7, mouth_open=0.3 + 0.15 * pant, smile=-0.4, pupil_k=0.6)
    a = arman_at_door(T, emo, x=560, y=1600, s=1.7, look=(lerp(-0.4, 0.3, ramp(T, 12.6, 13.4)), 0.1), lean=-3 + 1.2 * pant,
                      hand_a=(-0.9, 0.1), hand_b=(0.95, 0.15), breath=T * 1.5)
    a["hdy"] += 0.02 * pant
    door_world(c, T, z=lerp(1.12, 1.2, glide(u)), cy=1080, crack=0.45 * (1 - shut), chars=[(ARMAN, a)], kick=kick, shake=3.5,
               warm_scene=kitchen_through_gap(T))
    grade(c, T, cold=0.7, vig=0.85)


def chat_items(T):
    items = [dict(side="in", text="ТЫ. ТОЛЬКО Я УЖЕ ПРОХОДИЛ ЭТО.", appear_t=None),
             dict(side="in", text="НЕ СЛУШАЙ ЕГО. ОН ХОЧЕТ ЗАНЯТЬ ТВОЁ МЕСТО.", appear_t=None),
             dict(side="in", text=TL.LAST_EP2_MSG, appear_t=None)]
    if T >= EV["msg1"]:
        items.append(dict(side="in", text=TL.MSG1, appear_t=T - EV["msg1"]))
    return items


def stair_bokeh(c, T, door=True):
    E.layer_blur(c, 24)
    c.save(); cam(c, 560, 900, 1.5, T=T, shake=3)
    if door:
        S3.door048(c, T)
    else:
        S3.stairs(c, T)
    c.restore(); c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#05060a"), 0.4)))


def s06(c, u, T):
    stair_bokeh(c, T)
    vib = 1.0 if EV["msg1"] - 0.1 < T < EV["msg1"] + 0.45 else 0.0

    def content(cc):
        E.PHONE.chat(cc, T, chat_items(T))
    E.draw_phone_insert(c, T, content, x=220, y=lerp(-200, -240, u), rot=-2, s=lerp(1.28, 1.34, u), shake=vib * 0.8 + 0.15)
    grade(c, T, cold=0.7, vig=0.8)


def s07(c, u, T):
    """Down the stairs (toward camera, out of frame bottom-left)."""
    k = ramp(T, EV["stairs_down"], EV["arrive"])
    st = lerp(8.2, -1.6, k)
    i0 = int(math.floor(max(st, 0)))
    x, y = S3.step_xy(max(st, 0), 0.45)
    if st < 0:
        x, y = S3.step_xy(0, 0.45)
        x += st * 260
        y += -st * 120
    ph = (T - EV["stairs_down"]) * 2 * math.pi * 2.4
    sw = math.sin(ph)
    a = dict(x=x, y=y - 18 * abs(math.cos(ph)), s=lerp(1.25, 2.4, k), bt=-0.55, ht=-0.45, step=0.9 * sw,
             hand_a=(-0.6 + 0.3 * sw, -0.3), hand_b=(0.4 - 0.3 * sw, -0.4), elbow_a=1, elbow_b=-1, key=(0.3, -0.9),
             rim_dir=(0.5, -1), rim_k=1.3, lean=-6, alpha=1.0 if T > EV["stairs_down"] else 0.0,
             **emotion("fear", brow_raise=0.6, mouth_open=0.2, pupil_k=0.7))
    a["look"] = (-0.6, 0.3)
    c.save()
    cam(c, 560, 1050, lerp(1.06, 1.14, glide(u)), T=T, shake=4.0)
    S3.stairs(c, T)
    if i0 >= 0:
        ARMAN.draw(c, a)
    E.light_multiply(c, "#76809a", [(500, 200, 1100, "#dfe8ff", 0.5), (780, 380, 500, "#6f96d8", 0.3)])
    c.restore()
    grade(c, T, cold=0.7, vig=0.85)


def s08(c, u, T):
    """Same door 048. «Так. Спокойно. Это просто… тот же этаж.»"""
    walk = ramp(T, 19.4, 20.0)
    ph = (T - 19.4) * 2 * math.pi * 2.0
    up = ramp(T, 20.2, 20.6)
    laugh = ramp(T, 20.0, 20.4) * (1 - ramp(T, 22.4, 23.0))
    emo = blend_emotions(emotion("fear", brow_raise=0.7, brow_angle=-0.6, smile=-0.3, pupil_k=0.7),
                         emotion("joy", smile=0.45, squint=0.1, brow_raise=0.6, brow_angle=-0.7, mouth_open=0.1), 0.6 * laugh)
    a = arman_at_door(T, emo, x=lerp(120, 380, ease_out(walk)), y=1600, s=1.65, bt=lerp(0.6, 0.2, walk), ht=lerp(0.6, 0.35, up),
                      step=0.8 * math.sin(ph) * (1 - walk), look=(0.35, lerp(0.0, -0.5, up)),
                      hand_a=(-0.5, -0.3) if T < 21.0 else (lerp(-0.5, -0.15, ramp(T, 21.0, 21.4)), lerp(-0.3, -1.85, ramp(T, 21.0, 21.4))),
                      hand_b=None, elbow_a=1)
    door_world(c, T, z=lerp(1.05, 1.16, glide(u)), cx=500, cy=1050, chars=[(ARMAN, a)])
    grade(c, T, cold=0.7, vig=0.82)


def s09(c, u, T):
    """Wide: every number turns into 048."""
    a = dict(x=540, y=1510, s=1.25, bt=0.0, ht=0.6 * math.sin((T - 23.2) * 1.2), key=(0, -1), rim_dir=(0, -1), rim_k=1.3,
             **emotion("fear", brow_raise=0.8, pupil_k=0.6))
    a = pose(a, life("arman", T, 1))
    a["look"] = (0.8 * math.sin((T - 23.2) * 1.2), -0.1)
    c.save()
    cam(c, 540, 1000, lerp(1.0, 1.1, glide(u)), T=T, shake=2.0)
    S3.stairwell_wide(c, T, lights=(0.7, 0.7, 0.7, 0.7), flip_t0=EV["nums_flip"])
    ARMAN.draw(c, a)
    E.light_multiply(c, "#76809a", [(540, 500, 1000, "#dfe8ff", 0.45), (540, 1500, 600, "#a8c0ff", 0.3)])
    c.restore()
    grade(c, T, cold=0.75, vig=0.85)


def s10(c, u, T):
    """Arman CU; a child's voice off-screen — eyes snap up."""
    snap = ramp(T, EV["look_up"], EV["look_up"] + 0.12, "out")
    emo = blend_emotions(emotion("worried", brow_raise=0.5, brow_angle=-0.6),
                         emotion("surprise", pupil_k=0.5, brow_raise=1.0, lid=-0.3, mouth_open=0.05), snap)
    a = arman_at_door(T, emo, x=540, y=1880, s=2.6, ht=lerp(0.0, 0.35, snap), look=(lerp(0.0, 0.7, snap), lerp(0.2, -0.6, snap)))
    a["blink"] = 0.0 if T > EV["look_up"] else a["blink"]
    door_world(c, T, z=lerp(1.0, 1.06, glide(u)), cx=560, cy=1000, chars=[(ARMAN, a)], blur=0.0)
    grade(c, T, cold=0.7, vig=0.9)


def girl_on_steps(T, emo, step=4, along=0.45, s=1.9, look=(-0.5, 0.1), **over):
    x, y = S3.step_xy(step, along)
    return pose(dict(x=x, y=y, s=s, sit=1.0, bt=-0.25, ht=-0.3, key=(0.2, -1), rim_dir=(0.6, -1), rim_k=1.0,
                     hand_a=(-0.35, -0.15), hand_b=(0.35, -0.15), elbow_a=1, elbow_b=-1),
                emo, girl_life(T), look=look, **over)


def stairs_world(c, T, z=1.0, cx=540, cy=1000, girl=None, arman_fg=None, light=1.0, shake=2.0, blur=0.0):
    c.save()
    cam(c, cx, cy, z, T=T, shake=shake)
    if blur > 0:
        E.layer_blur(c, blur)
    S3.stairs(c, T, light)
    if blur > 0:
        c.restore()
    if girl:
        GIRL.draw(c, girl)
    E.light_multiply(c, "#76809a", [(500, 200, 1100, "#dfe8ff", 0.5 * light), (780, 380, 500, "#6f96d8", 0.3),
                                    (girl["x"] if girl else 600, (girl["y"] if girl else 1200) - 200, 520, "#ffe0b0", 0.25)])
    c.restore()
    if arman_fg:
        c.save()
        cam(c, cx, cy, z, T=T, shake=shake * 1.4)
        E.layer_blur(c, 9, dim=0.6)
        ARMAN.draw(c, arman_fg, passes=("body", "head"))
        c.restore()
        c.restore()


def s11(c, u, T):
    """The girl on the steps. Arman: «Ты… ты кто такая?»"""
    tilt = ramp(T, 29.6, 30.2)
    g = girl_on_steps(T, emotion("neutral", smile=0.25, brow_raise=0.2), look=(-0.7, 0.15), ht=-0.4)
    g["tilt"] += 10 * tilt
    a = dict(x=80, y=2480, s=3.0, back=True, bt=0.25, rim_dir=(1, -0.6), rim_k=1.1, key=(0.5, -0.5), hand_a=None, hand_b=None)
    stairs_world(c, T, z=lerp(1.12, 1.2, glide(u)), cx=600, cy=1050, girl=g, arman_fg=a)
    grade(c, T, cold=0.65, vig=0.82)


def s12(c, u, T):
    """Girl MCU: «Я тут давно. Здесь все двери — твои.»"""
    gest = ramp(T, 33.2, 33.7) * (1 - ramp(T, 34.4, 34.9))
    g = girl_on_steps(T, emotion("neutral", smile=0.15, brow_raise=0.1), look=(-0.6, 0.05), ht=-0.25,
                      hand_b=(lerp(0.35, 1.5, gest), lerp(-0.15, -1.0, gest)), elbow_b=-1)
    stairs_world(c, T, z=lerp(1.9, 2.0, glide(u)), cx=g["x"] - 20, cy=g["y"] - 220, girl=g, blur=0.0)
    grade(c, T, cold=0.6, vig=0.85)


def s13(c, u, T):
    """Girl CU, unexpectedly serious."""
    serious = ramp(T, 35.0, 35.6)
    emo = blend_emotions(emotion("neutral", smile=0.1), emotion("sad", brow_raise=0.25, brow_angle=-0.4, lid=0.15, smile=-0.25), serious)
    g = girl_on_steps(T, emo, look=(-0.35, 0.0), ht=-0.15)
    stairs_world(c, T, z=lerp(2.6, 2.95, glide(u)), cx=g["x"] - 10, cy=g["y"] - 300, girl=g, light=lerp(1.0, 0.85, u))
    grade(c, T, cold=0.65, vig=0.9)


def s14(c, u, T):
    """Insert: the handle of 048 turns by itself; warm light in the gap."""
    turn = ease_in_out(ramp(T, EV["handle"], EV["handle"] + 1.0))
    crack = 0.12 * ease_out(ramp(T, EV["door_crack"], EV["door_crack"] + 0.8))
    hx, hy = S3.DX + S3.DW - 70, S3.DY + S3.DH * 0.52
    door_world(c, T, z=lerp(2.5, 2.7, glide(u)), cx=hx - 60, cy=hy, handle_turn=turn, crack=crack, shake=1.5,
               warm_scene=kitchen_through_gap(T))
    grade(c, T, cold=0.55, warm=0.3 * crack / 0.12, vig=0.85)


def s15(c, u, T):
    """Arman turns to the door; it opens wider; Mom's voice from inside."""
    turn = ease_in_out(ramp(T, 42.0, 42.7))
    crack = lerp(0.12, 0.38, ease_out(ramp(T, 42.0, 43.5)))
    emo = emotion("fear", brow_raise=0.8, brow_angle=-0.7, smile=-0.5, pupil_k=0.6)
    a = arman_at_door(T, emo, x=250, y=1600, s=1.65, bt=lerp(-0.2, 0.55, turn), ht=lerp(-0.4, 0.8, turn),
                      look=(lerp(-0.6, 0.8, turn), 0.0))
    door_world(c, T, z=lerp(1.05, 1.12, glide(u)), cx=520, cy=1050, crack=crack, warm_scene=kitchen_through_gap(T),
               chars=[(ARMAN, a)])
    grade(c, T, cold=0.5, warm=0.35, vig=0.84)


def s16(c, u, T):
    """The girl grabs his sleeve: «Не заходи. Там уже есть ты.»"""
    grab = ease_out(ramp(T, EV["grab"], EV["grab"] + 0.35))
    turn = ease_in_out(ramp(T, 45.7, 46.3))
    a = arman_at_door(T, emotion("fear", brow_raise=0.7, smile=-0.4, pupil_k=0.65), x=520, y=1600, s=1.65,
                      bt=lerp(0.5, -0.15, turn), ht=lerp(0.8, -0.5, turn), look=(lerp(0.8, -0.6, turn), lerp(0.0, 0.5, turn)),
                      hand_a=(-0.9, -0.1), elbow_a=1)
    g = pose(dict(x=lerp(120, 300, ease_out(ramp(T, 45.4, 45.9))), y=1600 + 1.86 * 100 * 1.65 * (1 - 0.72) , s=1.65, bt=0.45, ht=0.55,
                  key=(0.2, -1), rim_dir=(0.6, -1), hand_a=None, hand_b=(lerp(0.4, 1.65, grab), lerp(-0.2, -1.05, grab)), elbow_b=-1),
             emotion("worried", brow_raise=0.5, brow_angle=-0.7, smile=-0.3), girl_life(T), look=(0.6, -0.6))
    door_world(c, T, z=lerp(1.05, 1.12, glide(u)), cx=480, cy=1080, crack=0.38, warm_scene=kitchen_through_gap(T),
               chars=[(ARMAN, a), (GIRL, g)])
    grade(c, T, cold=0.55, warm=0.3, vig=0.86)


def s17(c, u, T):
    """Through the gap: the double at the kitchen table next to Mom — slowly turns to the door."""
    turn = ease_in_out(ramp(T, EV["double_turn"], EV["double_turn"] + 1.3))
    z = lerp(1.38, 1.55, glide(u))
    c.save()
    cam(c, 560, 1120, z, T=T, shake=2.0)
    kitchen_through_gap(T, double_turn=turn, blur=0, ox=128, oy=250, sc=0.8)(c)   # table centred in the gap
    c.restore()
    # door edges framing the view (dark leaf left, frame right, header + threshold), out of focus
    c.save()
    cam(c, 560, 1000, z * 0.9 + 0.1, T=T, shake=2.6)
    E.layer_blur(c, 10)
    c.drawRect(skia.Rect.MakeLTRB(-200, -200, 250, H + 200), fill(0, shader=linear(0, 0, 250, 0, [hexc("#1a0808"), hexc("#3a1212")])))
    c.drawRect(skia.Rect.MakeLTRB(880, -200, W + 200, H + 200), fill(hexc("#120d0b")))
    c.drawRect(skia.Rect.MakeLTRB(-200, -200, W + 200, 300), fill(hexc("#0f0b09")))
    c.drawRect(skia.Rect.MakeLTRB(-200, 1700, W + 200, H + 200), fill(hexc("#0f0b09")))
    c.restore()
    c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(560, 980, 900, [with_alpha(hexc("#000"), 0.0), with_alpha(hexc("#000"), 0.6)])))
    grade(c, T, warm=0.6, red=0.2 * turn, vig=0.9)


def system_screen(cc, T):
    """The phone screen taken over by the system (operator UI): dark blue, monospace-like readout, progress."""
    t = T - EV["sys_takeover"]
    SW, SH = UI.Phone.SW, UI.Phone.SH
    cc.drawRect(skia.Rect.MakeWH(SW, SH), fill(0, shader=linear(0, 0, 0, SH, [hexc("#06122a"), hexc("#020611")])))
    for y in range(0, SH, 6):
        cc.drawLine(0, y, SW, y, stroke(with_alpha(hexc("#3d7bff"), 0.05), 1))
    a = ramp(t, 0.1, 0.4)
    f1, f2, f3 = font("russo", 64), font("rubik", 34, 600), font("rubik", 30, 500)
    cc.drawCircle(SW / 2, 300, 120, fill(0, shader=radial(SW / 2, 300, 120, [with_alpha(hexc("#3aa0ff"), 0.35 * a), with_alpha(hexc("#3aa0ff"), 0)])))
    for ex in (-38, 38):   # the operator's two glowing eyes as the system emblem
        cc.drawOval(skia.Rect.MakeXYWH(SW / 2 + ex - 26, 290, 52, 18), fill(with_alpha(hexc("#bfe3ff"), a)))
    draw_text(cc, "ОБЪЕКТ 048", SW / 2, 520, f1, with_alpha(hexc("#e6f2ff"), a), align="center")
    draw_text(cc, "СТАТУС: ВНЕ ЗОНЫ", SW / 2, 600, f2, with_alpha(hexc("#ff4a55"), ramp(t, 0.6, 0.9)), align="center")
    cc.drawRRect(rrect(60, 690, SW - 120, 70, 14), fill(with_alpha(hexc("#ff2a3a"), 0.18 * ramp(t, 0.8, 1.1))))
    draw_text(cc, "ПОПЫТКА ПОКИНУТЬ КВАРТИРУ", SW / 2, 738, f3, with_alpha(hexc("#ffb0b6"), ramp(t, 0.8, 1.1)), align="center")
    p = clamp((t - 1.6) / 2.0)
    draw_text(cc, "ПЕРЕЗАПУСК", 60, 880, f2, with_alpha(hexc("#bfe3ff"), ramp(t, 1.4, 1.7)))
    draw_text(cc, f"{int(p * 100):3d}%", SW - 60, 880, f2, with_alpha(hexc("#bfe3ff"), ramp(t, 1.4, 1.7)), align="right")
    cc.drawRRect(rrect(60, 905, SW - 120, 26, 13), fill(with_alpha(hexc("#1a2a4a"), ramp(t, 1.4, 1.7))))
    if p > 0:
        cc.drawRRect(rrect(60, 905, (SW - 120) * p, 26, 13), fill(hexc("#3aa0ff")))
    for i in range(6):     # log lines
        yy = 1010 + i * 44
        txt = ["> loop 23:17 :: active", "> subject 048 :: awake", "> mirror :: seated", "> witness :: unknown",
               "> door :: open", "> restoring state…"][i]
        draw_text(cc, txt, 60, yy, font("rubik", 26, 400), with_alpha(hexc("#6f9fe0"), ramp(t, 1.0 + i * 0.25, 1.2 + i * 0.25)))


def s18(c, u, T):
    stair_bokeh(c, T, door=False)
    t = T - EV["sys_takeover"]
    gl = ramp(t, 0.0, 0.08) * (1 - ramp(t, 0.25, 0.4))   # short slice-glitch while the screen is taken over

    def content(cc):
        x = ramp(t, 0.12, 0.3)          # short dissolve chat → system (no hard luminance jump)
        if x < 1:
            E.PHONE.chat(cc, T, chat_items(T))
        if x > 0:
            cc.saveLayerAlpha(None, int(255 * x))
            system_screen(cc, T)
            cc.restore()
        if gl > 0:
            for i in range(6):
                y = (i * 211 + int(T * 600)) % UI.Phone.SH
                cc.drawRect(skia.Rect.MakeXYWH(0, y, UI.Phone.SW, 30), fill(with_alpha(hexc("#3aa0ff"), 0.25 * gl)))
    E.draw_phone_insert(c, T, content, x=220, y=lerp(-150, -200, u), rot=-2, s=lerp(1.24, 1.32, u), shake=0.15 + 0.6 * gl)
    grade(c, T, cold=0.8, vig=0.82)


def s19(c, u, T):
    """The lamps go out, far to near. Arman and the girl look up."""
    lights = tuple(TL.stair_light(T, i) for i in range(4))
    up = ramp(T, 55.3, 55.9)
    a = pose(dict(x=600, y=1520, s=1.25, bt=-0.2, ht=-0.1, key=(0, -1), rim_dir=(0, -1), rim_k=1.3),
             emotion("fear", brow_raise=0.8, pupil_k=0.6), life("arman", T, 1), look=(-0.2, lerp(0.0, -0.8, up)))
    g = pose(dict(x=470, y=1520 + 186 * 1.25 * 0.28, s=1.25, bt=0.3, ht=0.2, key=(0, -1), rim_dir=(0, -1),
                  hand_b=(0.9, -0.9), elbow_b=-1),
             emotion("worried", brow_raise=0.6), girl_life(T), look=(0.2, lerp(0.0, -0.8, up)))
    c.save()
    cam(c, 540, 1080, lerp(1.04, 1.28, glide(u)), T=T, shake=3.0)   # keeps creeping in after the last lamp dies
    S3.stairwell_wide(c, T, lights=lights, flip_t0=-100.0, door048_open=0.25)
    ARMAN.draw(c, a)
    GIRL.draw(c, g)
    L = sum(lights) / 4
    E.light_multiply(c, "#3a4256", [(540, 500, 1000, "#dfe8ff", 0.5 * L), (540, 1500, 600, "#a8c0ff", 0.35 * L),
                                    (800, 1100, 500, "#ffcf9a", 0.2), (560, 1300, 420, "#8fb8ff", 0.25 * (1 - L))])
    c.restore()
    grade(c, T, cold=0.8, vig=0.85 + 0.1 * (1 - L))


def s20(c, u, T):
    c.drawColor(hexc("#000"))


def s21(c, u, T):
    c.drawColor(hexc("#000"))
    t = T - EV["end_card"]
    f1, f2 = font("russo", 104), font("russo", 112)
    a1, a2 = ramp(t, 0.0, 0.25, "out"), ramp(t, 0.55, 0.8, "out")
    jit = (1 - ramp(t, 0.0, 0.4)) * 10
    c.save(); c.translate(math.sin(t * 90) * jit, 0)
    c.saveLayerAlpha(None, int(255 * a1))
    draw_text(c, "СКОЛЬКО РАЗ", W / 2, 840, f1, hexc("#f2f2f2"), align="center", shadow=(18, 0, with_alpha(hexc("#3aa0ff"), 0.35)))
    c.restore()
    c.saveLayerAlpha(None, int(255 * a2))
    draw_text(c, "ТЫ УЖЕ ЭТО", W / 2, 980, f2, hexc("#f2f2f2"), align="center")
    for dx, col in ((-6, "#2ad6ff"), (6, "#ff2a3a")):
        if t < 1.2:
            draw_text(c, "ВИДЕЛ?", W / 2 + dx * (1 - ramp(t, 0.6, 1.2)), 1110, f2, with_alpha(hexc(col), 0.6), align="center")
    draw_text(c, "ВИДЕЛ?", W / 2, 1110, f2, hexc("#ff2a3a"), align="center", shadow=(26, 0, with_alpha(hexc("#ff0010"), 0.6)))
    c.restore(); c.restore()
    c.saveLayerAlpha(None, int(255 * ramp(t, 1.4, 1.9)))
    draw_text(c, "ТЕБЯ ЗДЕСЬ НЕ БЫЛО", W / 2, 1250, font("russo", 52), hexc("#bfc6d6"), align="center")
    draw_text(c, "СЕРИЯ 3 · «ДВЕРЬ 048»", W / 2, 1315, font("rubik", 36, 500), hexc("#7d8599"), align="center")
    c.restore()
    S.vignette(c, 0.5)


SHOT_FN = {f"S{i:02d}": globals()[f"s{i:02d}"] for i in range(1, 22)}
INSERTS = ("S06", "S14", "S18")


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
    if sid in ("S20", "S21"):
        return rgba
    cold = coldness(T)
    ins = sid in INSERTS
    rgb = concept_look(rgba[:, :, :3], t=T, warm=max(0.25, 1.0 - cold), cold=cold, sat=1.2,
                       bloom=0.45 if ins else 0.6, soften=0.25 if ins else 0.6, grain=0.0)
    out = rgba.copy()
    out[:, :, :3] = rgb
    return out
