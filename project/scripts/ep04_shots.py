"""Episode 04 «КАК ОБЫЧНО?» — shots.  Same engine and series standard as ep. 2–3 (ep01_shots helpers, rig2, concept look,
Arman's blue rim). New in this episode, drawn by the same rig/sets: the Barista and the Operator (rig2 CONCEPT, v3 ports of
the v1 sheets) and the café / street / observation room (engine/sets4.py, v1 geography)."""
import json
import math
import os
import sys

import skia

sys.path.insert(0, os.path.dirname(__file__))
import ep04_timeline as TL  # noqa: E402
import ep01_shots as E  # noqa: E402
from engine.core import (W, H, clamp, lerp, ramp, fbm, hexc, with_alpha, fill, stroke, radial, linear, rrect,  # noqa: E402
                         font, draw_text, new_surface, surface_rgba, ease_in_out, ease_out, ease_out_back)
from engine.rig import emotion, blend_emotions  # noqa: E402
from engine import sets as S, sets2 as S2, sets4 as S4  # noqa: E402
from engine import ui as UI  # noqa: E402
from engine.look import concept_look  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
E.RIM_MODE = "standard"
_lp = os.path.join(ROOT, "ep04", "compositions", "lipsync.json")
E.LIPS = json.load(open(_lp)) if os.path.exists(_lp) else {}
UI.KEYWORDS_RED = ("ПОМНИШЬ?", "ПОМНЮ.")
EV = TL.EV
ARMAN = E.ARMAN
GIRL, BARISTA, OPERATOR = E.V2Rig("girl"), E.V2Rig("barista"), E.V2Rig("operator")
pose, life, cam, grade = E.pose, E.life, E.cam, E.grade

TABLE = (250, 1330)                    # Arman's window table (v1 position)
SEAT = dict(x=255, y=1440, s=1.15)     # Arman seated behind it


def glide(u):
    """Camera move profile: eased, but never at rest inside a shot (keeps every 60 fps frame in motion)."""
    return 0.4 * u + 0.6 * ease_in_out(u)


def erase_k(T):
    """Café erasure progress (0 before the order, 1 = gone)."""
    return ease_in_out(ramp(T, EV["erase"] + 0.4, 37.4))


def coldness(T):
    sid = shot_at(T)[0]
    if sid in ("S08", "S09", "S17"):
        return 0.95
    if sid in ("S13", "S14", "S15", "S16", "S18"):
        return 0.6
    return 0.15 + 0.35 * erase_k(T)


def girl_life(T, seed=4):
    L = life("girl", T, seed)
    L["hair_sway"] = 0.6 * math.sin(T * 1.7) + 0.4 * fbm(T * 0.8, 40)
    return L


# =========================================================================================== café
def cafe_world(c, T, z=1.0, cx=540, cy=960, chars_back=(), chars_front=(), table=True, blur=0.0, shake=2.5, power=None):
    k = erase_k(T)
    power = TL.flicker(T) if power is None else power
    cust = tuple(1.0 - clamp((T - t0) / 0.4) for t0 in TL.ERASE_ORDER)
    c.save()
    cam(c, cx, cy, z, T=T, shake=shake)
    if blur > 0:
        E.layer_blur(c, blur)
    S4.cafe(c, T, power=power, white=0.0, customers=cust)
    if blur > 0:
        c.restore()
    for rig, p in chars_back:
        rig.draw(c, p)
    if table:
        S4.cafe_table(c, TABLE[0], TABLE[1], T)
    for rig, p in chars_front:
        rig.draw(c, p)
    E.light_multiply(c, "#8a7c80", [(250, 400, 900, "#ffd09a", 0.5 * power), (700, 500, 800, "#ffd09a", 0.4 * power),
                                    (230, 700, 600, "#9f8fff", 0.2)])
    c.restore()
    if k > 0:
        erase_overlay(c, T, k, chars=list(chars_back) + list(chars_front), cam_args=(cx, cy, z), shake=shake)


def erase_overlay(c, T, k, chars, cam_args, shake=2.5):
    """White-grid erasure of the set, then the characters redrawn on top (they are not erased)."""
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#eef1f6"), 0.82 * k)))
    S4.grid(c, skia.Rect.MakeWH(W, H), k)
    cx, cy, z = cam_args
    c.save()
    cam(c, cx, cy, z, T=T, shake=shake)
    for rig, p in chars:
        rig.draw(c, p)
    E.light_multiply(c, "#9aa0b0", [(540, 700, 1100, "#ffffff", 0.4)])
    c.restore()


def arman_seated(T, emo, look=(0.3, 0.0), **over):
    return pose(dict(SEAT, bt=0.55, ht=0.4, sit=1, key=(0.4, -0.8), rim_dir=(0.6, -1), rim_k=1.2,
                     hand_a=(0.95, -0.62), hand_b=(1.15, -0.6), elbow_a=1, elbow_b=1, warm=0.8),
                emo, life("arman", T, 1), look=look, **over)


def barista_pose(T, emo, x=760, y=1300, s=1.25, look=(-0.6, 0.1), frozen=False, **over):
    L = life("barista", T if not frozen else EV["erase"], 9)
    if frozen:
        L["blink"] = 0.0
    p = pose(dict(x=x, y=y, s=s, bt=-0.45, ht=-0.4, key=(0.4, -0.8), rim_dir=(-0.6, -1), rim_k=1.0, warm=0.8,
                  hand_a=None, hand_b=None), emo, L, look=look, **over)
    return p


def s01(c, u, T):
    """Black → a sharp inhale: Arman jerks awake at the café table; rain, neon; the clock says 23:17."""
    up = ease_out_back(ramp(T, EV["wake"], EV["wake"] + 0.45))
    emo = blend_emotions(emotion("neutral", lid=0.9), emotion("surprise", pupil_k=0.6, brow_raise=0.9, mouth_open=0.3), up)
    a = arman_seated(T, emo, look=(lerp(0.0, -0.6, ramp(T, 1.4, 1.9)), 0.0), nod=lerp(1.0, 0.0, up), hdy=lerp(0.32, 0.0, up),
                     hand_a=(0.85, -0.45), hand_b=(1.05, -0.42))
    a["blink"] = 0.0
    cafe_world(c, T, z=lerp(1.04, 1.14, glide(u)), cx=500, cy=960, chars_back=[(ARMAN, a)])
    if T < EV["wake"] + 0.4:   # slow fade in from black from the first frame (no flash, never static)
        c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#000"), 0.85 - 0.2 * ramp(T, 0.0, EV["wake"]) - 0.65 * ramp(T, EV["wake"], EV["wake"] + 0.4))))
    grade(c, T, warm=0.6, vig=0.82)


def arman_cu(c, T, u, emo, look, z0=3.0, z1=3.2, **over):
    a = arman_seated(T, emo, look=look, **over)
    hx, hy, R = ARMAN.head_pos(a)
    cafe_world(c, T, z=lerp(z0, z1, glide(u)), cx=hx + 40, cy=hy + 110, chars_back=[(ARMAN, a)], blur=0.0)


def s02(c, u, T):
    """CU: he looks around — where is he?"""
    sweep = math.sin((T - 3.0) * 2.2)
    emo = emotion("worried", brow_raise=0.7, brow_angle=-0.6, pupil_k=0.7)
    arman_cu(c, T, u, emo, look=(0.7 * sweep, -0.1), ht=0.4 + 0.25 * sweep, breath=T * 0.9)
    grade(c, T, warm=0.55, vig=0.85)


def s03(c, u, T):
    """The barista puts a cup down: «Как обычно? Двойной, без сахара.»"""
    walk = ease_out(ramp(T, 5.6, 6.0))
    put = ease_in_out(ramp(T, 5.85, EV["clink"])) * (1 - ease_in_out(ramp(T, 6.7, 7.2)))
    b = barista_pose(T, emotion("neutral", smile=0.35), x=lerp(980, 640, walk), y=1290, s=1.25,
                     step=0.8 * math.sin((T - 5.6) * 12) * (1 - walk), hand_b=(lerp(-0.3, -1.25, put), lerp(-0.2, 0.25, put)), elbow_b=1)
    a = arman_seated(T, emotion("worried", brow_raise=0.6, pupil_k=0.75), look=(0.8, -0.4), ht=0.6)
    cafe_world(c, T, z=lerp(1.32, 1.42, glide(u)), cx=440, cy=1150, chars_back=[(ARMAN, a), (BARISTA, b)])
    grade(c, T, warm=0.55, vig=0.82)


def s04(c, u, T):
    emo = emotion("worried", brow_raise=0.8, brow_angle=-0.7, pupil_k=0.75)
    arman_cu(c, T, u, emo, look=(0.8, -0.45), ht=0.6, z0=3.1, z1=3.3)
    grade(c, T, warm=0.55, vig=0.85)


def barista_cu(c, T, u, emo, frozen=False, z0=2.9, z1=3.1, look=(-0.4, 0.05), **over):
    b = barista_pose(T, emo, x=640, y=1290, frozen=frozen, look=look, **over)
    hx, hy, R = BARISTA.head_pos(b)
    cafe_world(c, T, z=lerp(z0, z1, glide(u)), cx=hx - 30, cy=hy + 120, chars_back=[(BARISTA, b)], table=False)


def s05(c, u, T):
    """«Каждый вечер. Ровно в одиннадцать семнадцать.» — the smile stays a beat too long."""
    emo = emotion("neutral", smile=0.45, squint=0.1)
    barista_cu(c, T, u, emo)
    grade(c, T, warm=0.55, vig=0.84)


def cafe_bokeh(c, T):
    E.layer_blur(c, 24)
    c.save(); cam(c, 500, 900, 1.5, T=T, shake=3)
    S4.cafe(c, T, power=1.0)
    c.restore(); c.restore()
    c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#05060a"), 0.4)))


def chat_items(T):
    items = []
    if T >= EV["msg1"]:
        items.append(dict(side="in", text=TL.MSG1, appear_t=T - EV["msg1"]))
    if T >= EV["send"]:
        items.append(dict(side="out", text=TL.TYPED, appear_t=T - EV["send"]))
    return items


def chat_state(T):
    t0, t1 = EV["typing"], EV["send"] - 0.3
    kb = ramp(T, t0 - 0.4, t0 - 0.1, "out") * (1 - ramp(T, EV["send"] + 0.15, EV["send"] + 0.45))
    n = len(TL.TYPED)
    typed, pressed = "", None
    if t0 <= T < EV["send"]:
        kt = (T - t0) / ((t1 - t0) / (n - 1))
        k = min(n, int(kt) + 1)
        typed = TL.TYPED[:k]
        if kt - math.floor(kt) < 0.45 and k <= n:
            pressed = TL.TYPED[k - 1]
    return kb, typed, pressed


def phone_chat(c, T, s, x, y):
    kb, typed, pressed = chat_state(T)
    empty = T < EV["msg1"]

    def content(cc):
        E.PHONE.chat(cc, T, chat_items(T), input_text=typed, show_keyboard=kb, pressed=pressed)
        if empty:
            draw_text(cc, "Сообщений нет", UI.Phone.SW / 2, 640, font("rubik", 40, 500), hexc("#6a7390"), align="center")
            draw_text(cc, "история очищена", UI.Phone.SW / 2, 690, font("rubik", 30, 400), hexc("#4a5270"), align="center")
    vib = 1.0 if EV["msg1"] - 0.1 < T < EV["msg1"] + 0.45 else 0.0
    E.draw_phone_insert(c, T, content, x=x, y=y, rot=-2, s=s, shake=vib * 0.8 + 0.15)


def s06(c, u, T):
    cafe_bokeh(c, T)
    phone_chat(c, T, lerp(1.24, 1.3, u), 220, lerp(-120, -150, u))
    grade(c, T, warm=0.3, vig=0.8)


def s07(c, u, T):
    cafe_bokeh(c, T)
    phone_chat(c, T, lerp(1.1, 1.15, u), 180, 120)
    grade(c, T, warm=0.3, vig=0.8)


# =========================================================================================== observation room
def operator_back(T, look_k=0.0):
    p = pose(dict(x=540, y=1520, s=1.55, bt=0.0, ht=lerp(0.0, 0.45, look_k), back=True, sit=1, key=(0, -1), rim_dir=(0, -1),
                  hand_a=(-0.6, -0.55), hand_b=(0.6, -0.55)), life("operator", T, 11))
    p["glow_k"] = 0.8
    return p


def obs_world(c, T, z=1.0, cx=540, cy=900, alerts=None, red=(), focus=None, op=None, shake=1.5):
    c.save()
    cam(c, cx, cy, z, T=T, shake=shake)
    S4.observation_room(c, T, alerts=alerts, red=red, focus=focus)
    c.drawRRect(rrect(400, 1180, 280, 340, 60), fill(hexc("#04060c")))   # chair back
    if op:
        OPERATOR.draw(c, op)
    c.restore()


def s08(c, u, T):
    """The wall of monitors; CAM 04 — the café: «ПАМЯТЬ СОХРАНЕНА»."""
    al = {4: "ПАМЯТЬ СОХРАНЕНА"} if T > EV["alert"] else {}
    obs_world(c, T, z=lerp(1.0, 1.35, glide(u)), cx=lerp(540, 520, u), cy=lerp(900, 760, u), alerts=al,
              red=(4,) if T > EV["alert"] else (), focus=4, op=operator_back(T))
    grade(c, T, cold=0.9, vig=0.85)


def s09(c, u, T):
    """Operator CU (front): «Удалите кафе.» — lids narrow."""
    order = ramp(T, 25.9, 26.3)
    p = pose(dict(x=540, y=1760, s=2.6, bt=0.0, ht=0.0, key=(0, -0.4), rim_dir=(0, -1), rim_k=1.8,
                  lid=0.35 * order, hand_a=None, hand_b=None), life("operator", T, 11), look=(0.0, 0.1))
    p["glow_k"] = 1.0
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(540, 700, 1200, [hexc("#0c1838"), hexc("#02040a")])))
    for i, (x, y) in enumerate([(160, 300), (920, 360), (120, 1100), (960, 1000)]):   # monitor glows behind (defocused, slowly pulsing)
        S2.glow(c, x + 30 * math.sin(T * 0.8 + i), y, 260, hexc("#3aa0ff" if i != 1 else "#ff2a3a"), 0.18 + 0.06 * math.sin(T * 1.7 + i))
    c.save()
    cam(c, 540 + 25 * math.sin(T * 0.6), 1000, lerp(1.0, 1.16, glide(u)), T=T, shake=3.0)
    OPERATOR.draw(c, p)
    E.light_multiply(c, "#7080c0", [(540, 600, 900, "#bfe3ff", 0.6)])
    c.restore()
    grade(c, T, cold=1.0, vig=0.9)


def s17(c, u, T):
    """CAM 07 — the street: «СВИДЕТЕЛЬ ОБНАРУЖЕН»; the operator turns to it."""
    on = T > EV["sys_witness"]
    al = {8: "СВИДЕТЕЛЬ НАЙДЕН"} if on else {}
    obs_world(c, T, z=lerp(1.25, 1.5, glide(u)), cx=lerp(700, 720, u), cy=lerp(900, 820, u), alerts=al, red=(8,) if on else (),
              focus=8, op=operator_back(T, ease_in_out(ramp(T, 51.3, 52.1))))
    grade(c, T, cold=0.9, red=0.15 * on, vig=0.85)


# =========================================================================================== café erasure + escape
def s10(c, u, T):
    """The café is being deleted: customers vanish, the window goes white, the barista freezes."""
    b = barista_pose(T, emotion("neutral", smile=0.35), x=700, y=1290, frozen=True, hand_b=(-0.6, -0.3), elbow_b=1)
    a = arman_seated(T, emotion("fear", brow_raise=0.9, pupil_k=0.6), look=(math.sin((T - 28.6) * 2.5), -0.2),
                     ht=0.4 + 0.3 * math.sin((T - 28.6) * 2.5))
    cafe_world(c, T, z=lerp(1.08, 1.2, glide(u)), cx=480, cy=1000, chars_back=[(ARMAN, a), (BARISTA, b)])
    grade(c, T, warm=0.4, cold=0.3, vig=0.84)


def s11(c, u, T):
    """Barista CU, quietly: «Тебе лучше уйти. Прямо сейчас.»"""
    emo = emotion("neutral", smile=0.15, brow_raise=0.25, lid=0.05)
    barista_cu(c, T, u, emo, z0=3.1, z1=3.35, look=(-0.6, 0.0))
    grade(c, T, warm=0.35, cold=0.3, vig=0.86)


def s12(c, u, T):
    """He jumps up and runs for the door (right)."""
    st = T > EV["stand"]
    run = ease_in_out(ramp(T, EV["stand"] + 0.2, EV["door"] + 0.6))
    ph = (T - EV["stand"]) * 2 * math.pi * 2.6
    a = pose(dict(x=lerp(255, 1250, run), y=1440 if not st else 1300, s=1.15, bt=0.7 if st else 0.55, ht=0.6, sit=0 if st else 1,
                  key=(0.4, -0.8), rim_dir=(0.6, -1), rim_k=1.2, step=0.9 * math.sin(ph) * (run > 0),
                  hand_a=(-0.4 + 0.3 * math.sin(ph), -0.3), hand_b=(0.5 - 0.3 * math.sin(ph), -0.3)),
             emotion("fear", brow_raise=0.8, mouth_open=0.2), life("arman", T, 1), look=(0.8, 0.0))
    b = barista_pose(T, emotion("neutral", smile=0.15), x=700, y=1290, frozen=True, look=(-0.2, 0.0))
    cafe_world(c, T, z=lerp(1.0, 1.1, glide(u)), cx=560, cy=960, chars_back=[(BARISTA, b), (ARMAN, a)])
    grade(c, T, warm=0.3, cold=0.4, vig=0.84)


# =========================================================================================== street
def street_erase(T):
    return clamp(lerp(0.12, 0.62, (T - 37.4) / (54.0 - 37.4)) + 0.4 * ease_in_out(ramp(T, 54.0, 56.4)))


def street_world(c, T, z=1.0, cx=540, cy=960, chars=(), shake=2.5, blur=0.0):
    c.save()
    cam(c, cx, cy, z, T=T, shake=shake)
    if blur > 0:
        E.layer_blur(c, blur)
    S4.street(c, T, lamp=1.0, erase=street_erase(T))
    if blur > 0:
        c.restore()
    for rig, p in chars:
        c.drawOval(skia.Rect.MakeXYWH(p["x"] - 100 * p["s"], p["y"] + 175 * p["s"] * (0.72 if rig is GIRL else 1.0), 200 * p["s"], 40 * p["s"]),
                   fill(with_alpha(hexc("#000"), 0.45), blur=12))
        rig.draw(c, p)
    E.light_multiply(c, "#6a7090", [(840, 700, 700, "#ffcf8a", 0.55), (180, 1100, 600, "#ff6fd8", 0.3),
                                    (760, 1000, 600, "#3ad6ff", 0.25)])
    c.restore()


def girl_street(T, emo, x=760, y=1340, s=1.4, look=(-0.6, 0.0), **over):
    return pose(dict(x=x, y=y + 186 * s * 0.28, s=s, bt=-0.35, ht=-0.35, key=(0.5, -0.8), rim_dir=(0.6, -1), rim_k=1.0),
                emo, girl_life(T), look=look, **over)


def s13(c, u, T):
    """The girl under the street lamp grabs his hand: «Бежим! Пока они не стёрли улицу.»"""
    run_in = ease_out(ramp(T, 37.4, 37.85))
    ph = (T - 37.4) * 2 * math.pi * 2.6
    a = pose(dict(x=lerp(-80, 470, run_in), y=1340, s=1.4, bt=0.5, ht=0.5, key=(0.4, -0.8), rim_dir=(0.6, -1), rim_k=1.2,
                  step=0.9 * math.sin(ph) * (1 - run_in), hand_a=None, hand_b=(0.6, -0.4)),
             emotion("fear", brow_raise=0.7, mouth_open=0.15), life("arman", T, 1), look=(0.7, 0.1))
    grab = ease_out(ramp(T, EV["grab"], EV["grab"] + 0.3))
    g = girl_street(T, emotion("worried", brow_raise=0.5, brow_angle=-0.6), x=760, hand_a=(lerp(-0.3, -1.6, grab), lerp(-0.2, -0.55, grab)),
                    elbow_a=1, look=(-0.7, -0.3))
    street_world(c, T, z=lerp(1.12, 1.2, glide(u)), cx=600, cy=1080, chars=[(ARMAN, a), (GIRL, g)])
    grade(c, T, cold=0.55, vig=0.84)


def s14(c, u, T):
    """Wide: they run towards camera; behind them the city is deleted into a white grid."""
    k = ease_in_out(u)
    ph = (T - 40.6) * 2 * math.pi * 2.6
    sw = math.sin(ph)
    a = dict(x=lerp(500, 430, k), y=lerp(1320, 1560, k) - 16 * abs(math.cos(ph)), s=lerp(1.0, 1.6, k), bt=0.0, ht=0.1,
             key=(0, -1), rim_dir=(0.3, -1), rim_k=1.3, step=0.95 * sw, hand_a=(-0.5 + 0.35 * sw, -0.25), hand_b=(0.75, -0.6),
             **emotion("fear", brow_raise=0.8, mouth_open=0.3))
    a = pose(a, life("arman", T, 1))
    g = dict(x=lerp(640, 640, k), y=lerp(1320, 1560, k) + 186 * lerp(1.0, 1.6, k) * 0.28 - 14 * abs(math.sin(ph)), s=lerp(1.0, 1.6, k),
             bt=0.0, ht=-0.1, key=(0, -1), rim_dir=(0.3, -1), step=-0.95 * sw, hand_a=(-0.9, -0.55), hand_b=(0.4 - 0.3 * sw, -0.2),
             **emotion("worried", brow_raise=0.6, mouth_open=0.2))
    g = pose(g, girl_life(T))
    street_world(c, T, z=lerp(1.0, 1.08, glide(u)), cx=540, cy=980, chars=[(ARMAN, a), (GIRL, g)], shake=4.0)
    grade(c, T, cold=0.55, vig=0.82)


def s15(c, u, T):
    """Arman CU running: «Кто «они»? Кто ты вообще такая?»"""
    ph = (T - 44.0) * 2 * math.pi * 2.6
    a = pose(dict(x=540, y=1800 - 14 * abs(math.cos(ph)), s=2.4, bt=0.15, ht=0.35, key=(0.3, -0.8), rim_dir=(0.6, -1), rim_k=1.3,
                  hand_a=None, hand_b=None, lean=3 * math.sin(ph)),
             emotion("fear", brow_raise=0.8, brow_angle=-0.7, pupil_k=0.7), life("arman", T, 1), look=(0.7, 0.1))
    c.save()
    cam(c, 540, 1000, 1.0, T=T, shake=5.0)
    E.layer_blur(c, 10)
    c.save(); c.translate(-160 * u, 0); S4.street(c, T, erase=street_erase(T)); c.restore()
    c.restore()
    ARMAN.draw(c, a)
    E.light_multiply(c, "#6a7090", [(840, 700, 800, "#ffcf8a", 0.4), (200, 900, 700, "#ff6fd8", 0.3)])
    c.restore()
    grade(c, T, cold=0.55, vig=0.86)


def s16(c, u, T):
    """Girl CU under the lamp: «Я — свидетель. Я помню все твои круги.»"""
    g = girl_street(T, blend_emotions(emotion("neutral"), emotion("sad", brow_raise=0.25, brow_angle=-0.4, lid=0.15, smile=-0.2), 0.7),
                    x=760, look=(-0.4, -0.1), ht=-0.2)
    hx, hy, R = GIRL.head_pos(g)
    street_world(c, T, z=lerp(4.0, 4.3, glide(u)), cx=hx - 20, cy=hy + 90, chars=[(GIRL, g)], shake=1.8)
    grade(c, T, cold=0.5, warm=0.2, vig=0.9)


def s18(c, u, T):
    """The white reaches them: he pulls her close — everything goes white, then dark."""
    pull = ease_out(ramp(T, 54.6, 55.2))
    a = pose(dict(x=lerp(470, 560, pull), y=1340, s=1.4, bt=lerp(0.5, -0.3, pull), ht=lerp(0.5, -0.4, pull), key=(0.4, -0.8),
                  rim_dir=(0.6, -1), rim_k=1.3, hand_a=None, hand_b=(lerp(0.6, 1.3, pull), lerp(-0.4, -0.5, pull))),
             emotion("fear", brow_raise=0.9, mouth_open=0.2), life("arman", T, 1), look=(lerp(0.6, -0.3, pull), -0.7))
    g = girl_street(T, emotion("fear", brow_raise=0.8), x=lerp(760, 690, pull), look=(-0.2, -0.8), hand_a=(-1.2, -0.6), elbow_a=1)
    street_world(c, T, z=lerp(1.15, 1.3, glide(u)), cx=600, cy=1060, chars=[(ARMAN, a), (GIRL, g)], shake=3.0)
    wv = TL.whiteness(T)
    if wv > 0:
        if T < EV["white_peak"]:
            c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#e9edf5"), 0.92 * wv)))
        else:   # after the peak the white sinks into darkness (a fade, not a cut)
            c.drawRect(skia.Rect.MakeWH(W, H), fill(hexc("#05060a")))
            c.drawRect(skia.Rect.MakeWH(W, H), fill(with_alpha(hexc("#e9edf5"), 0.92 * wv)))
    grade(c, T, cold=0.5, vig=0.85)


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
    draw_text(c, "ЧТО ПОМНИШЬ", W / 2, 880, f1, hexc("#f2f2f2"), align="center", shadow=(18, 0, with_alpha(hexc("#3aa0ff"), 0.35)))
    c.restore()
    c.saveLayerAlpha(None, int(255 * a2))
    for dx, col in ((-6, "#2ad6ff"), (6, "#ff2a3a")):
        if t < 1.2:
            draw_text(c, "ТЫ?", W / 2 + dx * (1 - ramp(t, 0.6, 1.2)), 1040, f2, with_alpha(hexc(col), 0.6), align="center")
    draw_text(c, "ТЫ?", W / 2, 1040, f2, hexc("#ff2a3a"), align="center", shadow=(26, 0, with_alpha(hexc("#ff0010"), 0.6)))
    c.restore(); c.restore()
    c.saveLayerAlpha(None, int(255 * ramp(t, 1.4, 1.9)))
    draw_text(c, "ТЕБЯ ЗДЕСЬ НЕ БЫЛО", W / 2, 1210, font("russo", 52), hexc("#bfc6d6"), align="center")
    draw_text(c, "СЕРИЯ 4 · «КАК ОБЫЧНО?»", W / 2, 1275, font("rubik", 36, 500), hexc("#7d8599"), align="center")
    c.restore()
    S.vignette(c, 0.5)


SHOT_FN = {f"S{i:02d}": globals()[f"s{i:02d}"] for i in range(1, 21)}
INSERTS = ("S06", "S07")


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
