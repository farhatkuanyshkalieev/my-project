"""New Year campaign videos and covers.

  python3 render_newyear.py gift  OUT.mp4   # gift certificate ad (gift-certificate-vo.mp3)
  python3 render_newyear.py focus OUT.mp4   # "Фокус-группа" announcement (focus-group-vo.mp3)
  python3 render_newyear.py covers DIR      # reality episode covers, weeks 1-4
  add --preview DIR [--preview-only] to dump a few frames.
The end card is added afterwards with tools/add_outro.py.
"""
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
from render_trial_ad import (CORAL, MINT, MINT_L, TEAL, TEAL_D, WHITE,  # noqa: E402
                             ease, ease_out, font, gradient, text, with_alpha)

W, H, FPS = 1080, 1920, 30
GOLD = (228, 192, 120)
GOLD_D = (190, 150, 80)
BG_NIGHT = gradient((14, 70, 68), (4, 30, 30))
BG_MINT_NY = gradient((236, 249, 247), (170, 226, 218))

rng = np.random.default_rng(12)
SNOW = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(40, 120), rng.uniform(3, 9), rng.uniform(0, 6.28))
        for _ in range(110)]


def layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def pop(lt, dur=0.35):
    return ease(lt / dur), (1 - ease_out(lt / (dur + 0.1))) * 50


def snow(frame, t, alpha=200, color=WHITE):
    lay, ld = layer()
    for x0, y0, sp, r, ph in SNOW:
        y = (y0 + t * sp) % (H + 40) - 20
        x = x0 + math.sin(t * 0.8 + ph) * 25
        ld.ellipse((x - r, y - r, x + r, y + r), fill=color + (alpha,))
    frame.alpha_composite(lay)


def sparkle(d, x, y, s, col=GOLD):
    d.polygon([(x, y - s), (x + s * 0.25, y - s * 0.25), (x + s, y), (x + s * 0.25, y + s * 0.25),
               (x, y + s), (x - s * 0.25, y + s * 0.25), (x - s, y), (x - s * 0.25, y - s * 0.25)], fill=col)


def gift_box(d, cx, cy, w, h, body, ribbon=GOLD):
    d.rounded_rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), radius=int(w * 0.06), fill=body)
    d.rounded_rectangle((cx - w / 2 - 8, cy - h / 2 - h * 0.22, cx + w / 2 + 8, cy - h / 2 + 4), radius=int(w * 0.05), fill=body)
    d.rectangle((cx - w * 0.07, cy - h / 2 - h * 0.22, cx + w * 0.07, cy + h / 2), fill=ribbon)
    d.rectangle((cx - w / 2, cy - h * 0.05, cx + w / 2, cy + h * 0.07), fill=ribbon)
    by = cy - h / 2 - h * 0.22
    d.ellipse((cx - w * 0.32, by - w * 0.2, cx, by + 4), outline=ribbon, width=int(max(4, w * 0.05)))
    d.ellipse((cx, by - w * 0.2, cx + w * 0.32, by + 4), outline=ribbon, width=int(max(4, w * 0.05)))


def button(lay_d, y, label, sub=None, fill=MINT, fg=TEAL_D, pulse=1.0):
    bw, bh = 860 * pulse, (150 if sub else 140) * pulse
    lay_d.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=fill)
    if sub:
        lay_d.text((W / 2, y - 18), label, font=font("InterDisplay-Black.otf", 56), fill=fg, anchor="mm")
        lay_d.text((W / 2, y + 38), sub, font=font("InterDisplay-Medium.otf", 38), fill=fg, anchor="mm")
    else:
        lay_d.text((W / 2, y), label, font=font("InterDisplay-Bold.otf", 54), fill=fg, anchor="mm")


def footer(d, demo=True):
    text(d, (W / 2, 1760), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ · АЛМАТЫ", font("Inter-Medium.otf", 30), MINT, spacing=5)
    if demo:
        text(d, (W / 2, 1840), "демо-концепт ролика", font("Inter-Regular.otf", 28), (150, 200, 195))


# ================================================================== gift certificate
G = dict(DUR=17.9, T_TIME=4.5, T_CERT=7.1, T_CTA=13.0, VO="gift-certificate-vo.mp3", VO_OFFSET=0.2)
BOXES = [(-260, 0.3, 230, 200, MINT), (250, 0.6, 210, 240, CORAL), (0, 0.9, 260, 220, WHITE),
         (-120, 1.3, 170, 150, (210, 240, 236)), (170, 1.6, 160, 170, GOLD)]


def g_scene_question(t):
    frame = BG_NIGHT.copy()
    snow(frame, t)
    d = ImageDraw.Draw(frame)
    floor = 1480
    for dx, t0, w, h, col in BOXES:
        p = ease_out((t - t0) / 0.6)
        if p <= 0:
            continue
        y = -300 + (floor - h / 2 - (-300)) * p
        if dx == 0:
            y -= 150 * p
        gift_box(d, W / 2 + dx, y, w, h, col)
    a, dy = pop(t - 0.2)
    lay, ld = layer()
    text(ld, (W / 2, 380 + dy), "Что подарить той,", font("InterDisplay-Black.otf", 92), WHITE)
    text(ld, (W / 2, 490 + dy), "у которой всё есть?", font("InterDisplay-Black.otf", 92), GOLD)
    frame.alpha_composite(with_alpha(lay, a))
    return frame


def envelope(d, cx, cy, open_p, card_p, label):
    ew, eh = 640, 420
    x0, y0, x1, y1 = cx - ew / 2, cy - eh / 2, cx + ew / 2, cy + eh / 2
    apex_y = (cy + 40) + (y0 - 220 - (cy + 40)) * open_p

    def flap():
        col = (245, 248, 247) if open_p < 0.5 else (214, 224, 222)
        d.polygon([(x0, y0), (x1, y0), (cx, apex_y)], fill=col)

    d.rectangle((x0, y0, x1, y1), fill=(232, 238, 236))      # back
    if open_p >= 0.5:
        flap()                                                # opened flap sits behind the card
    if card_p > 0:
        ch = 360
        top = y0 + 20 - card_p * 260
        d.rounded_rectangle((x0 + 50, top, x1 - 50, top + ch), radius=24, fill=WHITE, outline=GOLD, width=6)
        if card_p > 0.4:
            d.text((cx, top + 100), label, font=font("InterDisplay-Black.otf", 64), fill=TEAL, anchor="mm")
            sparkle(d, x0 + 110, top + 100, 22)
            sparkle(d, x1 - 110, top + 100, 22)
    d.polygon([(x0, y0 + 40), (cx, cy + 60), (x1, y0 + 40), (x1, y1), (x0, y1)], fill=WHITE)   # pocket
    d.line((x0, y1, cx, cy + 40, x1, y1), fill=(220, 228, 226), width=4)
    if open_p < 0.5:
        flap()
    d.rectangle((x0, cy + 70, x1, cy + 110), fill=MINT)       # ribbon on the pocket
    d.ellipse((cx - 70, cy + 60, cx, cy + 120), outline=MINT, width=16)
    d.ellipse((cx, cy + 60, cx + 70, cy + 120), outline=MINT, width=16)


def g_scene_time(t):
    lt = t - G["T_TIME"]
    frame = BG_MINT_NY.copy()
    snow(frame, t, alpha=255, color=(255, 255, 255))
    d = ImageDraw.Draw(frame)
    envelope(d, W / 2, 1300, ease_out((lt - 0.1) / 0.6), ease_out((lt - 0.5) / 0.9), "для тебя")
    a, dy = pop(lt - 0.05)
    lay, ld = layer()
    text(ld, (W / 2, 420 + dy), "Время", font("InterDisplay-Black.otf", 150), TEAL)
    text(ld, (W / 2, 560 + dy), "для себя", font("InterDisplay-Light.otf", 110), CORAL)
    frame.alpha_composite(with_alpha(lay, a))
    return frame


def g_scene_cert(t):
    lt = t - G["T_CERT"]
    frame = BG_NIGHT.copy()
    snow(frame, t, alpha=150)
    a, dy = pop(lt)
    lay, ld = layer()
    cx0, cy0, cx1, cy1 = 110, 520, W - 110, 1180
    ld.rounded_rectangle((cx0, cy0 + dy, cx1, cy1 + dy), radius=40, fill=(250, 248, 242))
    ld.rounded_rectangle((cx0 + 24, cy0 + 24 + dy, cx1 - 24, cy1 - 24 + dy), radius=28, outline=GOLD, width=5)
    text(ld, (W / 2, cy0 + 130 + dy), "ПОДАРОЧНЫЙ", font("Inter-SemiBold.otf", 44), GOLD_D, spacing=12)
    text(ld, (W / 2, cy0 + 250 + dy), "Сертификат", font("InterDisplay-Black.otf", 120), TEAL)
    text(ld, (W / 2, cy0 + 360 + dy), "в центр Аллы Казаниной", font("InterDisplay-Light.otf", 50), TEAL)
    for x in (cx0 + 90, cx1 - 90):
        sparkle(ld, x, cy0 + 130 + dy, 26)
    ld.line((cx0 + 140, cy0 + 450 + dy, cx1 - 140, cy0 + 450 + dy), fill=GOLD, width=3)
    text(ld, (W / 2, cy0 + 540 + dy), "№ 2026 · Новый год", font("Inter-Medium.otf", 36), GOLD_D)
    frame.alpha_composite(with_alpha(lay, a))
    for i, (t0, label) in enumerate([(3.0, "Процедуры для лица"), (3.6, "Процедуры для тела")]):
        a2, dy2 = pop(lt - t0)
        if a2 <= 0:
            continue
        lay, ld = layer()
        y = 1330 + i * 140 + dy2
        f = font("InterDisplay-SemiBold.otf", 56)
        tw = ld.textlength(label, font=f)
        ld.rounded_rectangle((W / 2 - tw / 2 - 60, y - 55, W / 2 + tw / 2 + 60, y + 55), radius=55, fill=MINT)
        ld.text((W / 2, y), label, font=f, fill=TEAL_D, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a2))
    return frame


def g_scene_cta(t):
    lt = t - G["T_CTA"]
    frame = BG_NIGHT.copy()
    snow(frame, t)
    d = ImageDraw.Draw(frame)
    envelope(d, W / 2, 620, 0.0, 0.0, "")
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 980 + dy), "В фирменном конверте", font("InterDisplay-Bold.otf", 80), WHITE)
    text(ld, (W / 2, 1080 + dy), "— к празднику", font("InterDisplay-Light.otf", 70), GOLD)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 1.4)
    if a2:
        lay, ld = layer()
        button(ld, 1330 + dy2, "Напишите «ПОДАРОК»", "в директ", fill=GOLD, fg=TEAL_D, pulse=1 + 0.03 * math.sin(lt * 6))
        frame.alpha_composite(with_alpha(lay, a2))
    footer(ImageDraw.Draw(frame))
    return frame


GIFT_SCENES = [(0.0, g_scene_question), (G["T_TIME"], g_scene_time), (G["T_CERT"], g_scene_cert), (G["T_CTA"], g_scene_cta)]


# ================================================================== focus group (times follow focus-group-vo.mp3)
F = dict(DUR=28.6, T_GROUP=5.9, T_GOAL=14.2, T_REALITY=18.85, T_CTA=24.1, VO="focus-group-vo.mp3", VO_OFFSET=0.2,
         T_ASK=3.15, CHIPS=[9.92, 10.75, 11.75, 12.45], T_EXPRESS=7.74)
CHIPS = ["Аппараты", "Нутрициолог", "Психолог", "Куратор"]


def rec_badge(d, x, y, t, label="РЕАЛИТИ"):
    f = font("Inter-SemiBold.otf", 34)
    tw = d.textlength(label, font=f)
    d.rounded_rectangle((x, y, x + tw + 110, y + 64), radius=32, fill=(0, 0, 0, 120) if False else CORAL)
    if int(t * 2) % 2 == 0:
        d.ellipse((x + 26, y + 20, x + 50, y + 44), fill=WHITE)
    d.text((x + 70, y + 32), label, font=f, fill=WHITE, anchor="lm")


def f_scene_countdown(t):
    frame = BG_NIGHT.copy()
    snow(frame, t)
    a, dy = pop(t - 0.15)
    lay, ld = layer()
    text(ld, (W / 2, 520 + dy), "До Нового года", font("InterDisplay-Light.otf", 80), WHITE)
    weeks = max(1, 12 - int(ease_out((t - 0.3) / 1.2) * 4))
    text(ld, (W / 2, 780 + dy), str(weeks), font("InterDisplay-Black.otf", 380), GOLD)
    text(ld, (W / 2, 1010 + dy), "недель", font("InterDisplay-Bold.otf", 96), WHITE)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(t - F["T_ASK"])
    if a2:
        lay, ld = layer()
        s = 1 + 0.2 * max(0.0, 1 - (t - F["T_ASK"]) / 0.25)
        text(ld, (W / 2, 1260 + dy2), "Успеете?", font("InterDisplay-Black.otf", int(130 * s)), CORAL)
        frame.alpha_composite(with_alpha(lay, a2))
    return frame


def f_scene_group(t):
    lt = t - F["T_GROUP"]
    frame = BG_MINT_NY.copy()
    snow(frame, t, alpha=255)
    d = ImageDraw.Draw(frame)
    rec_badge(d, 90, 200, t)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 420 + dy), "Набираем", font("InterDisplay-Light.otf", 76), TEAL)
    text(ld, (W / 2, 540 + dy), "«Фокус-группу»", font("InterDisplay-Black.otf", 118), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(t - F["T_EXPRESS"])
    if a2:
        lay, ld = layer()
        text(ld, (W / 2, 680 + dy2), "месяц программы «Экспресс слим»", font("InterDisplay-Medium.otf", 54), CORAL)
        frame.alpha_composite(with_alpha(lay, a2))
    for i, (t0, label) in enumerate(zip(F["CHIPS"], CHIPS)):
        a3, dy3 = pop(t - t0)
        if a3 <= 0:
            continue
        lay, ld = layer()
        col, row = i % 2, i // 2
        cx = W / 2 + (col - 0.5) * 470
        cy = 960 + row * 200 + dy3
        ld.rounded_rectangle((cx - 210, cy - 75, cx + 210, cy + 75), radius=40, fill=WHITE)
        ld.ellipse((cx - 180, cy - 30, cx - 120, cy + 30), fill=TEAL)
        ld.line((cx - 165, cy, cx - 153, cy + 13, cx - 133, cy - 13), fill=WHITE, width=7, joint="curve")
        ld.text((cx - 95, cy), label, font=font("InterDisplay-SemiBold.otf", 48), fill=TEAL, anchor="lm")
        frame.alpha_composite(with_alpha(lay, a3))
    return frame


def tree(d, cx, base, h, t):
    for k in range(3):
        w = h * (0.75 - k * 0.18)
        top = base - h * (0.38 + k * 0.28)
        bot = base - h * (0.0 + k * 0.26)
        d.polygon([(cx, top - h * 0.12), (cx - w / 2, bot), (cx + w / 2, bot)], fill=(30, 120, 110))
    d.rectangle((cx - h * 0.05, base, cx + h * 0.05, base + h * 0.1), fill=(120, 80, 60))
    sparkle(d, cx, base - h * 0.95, h * 0.07 * (1 + 0.15 * math.sin(t * 5)))
    for i, (dx, dy) in enumerate([(-0.15, -0.2), (0.12, -0.35), (-0.08, -0.55), (0.2, -0.12), (0.03, -0.72)]):
        on = (int(t * 3) + i) % 2 == 0
        d.ellipse((cx + dx * h - 14, base + dy * h - 14, cx + dx * h + 14, base + dy * h + 14), fill=GOLD if on else CORAL)


def f_scene_goal(t):
    lt = t - F["T_GOAL"]
    frame = BG_NIGHT.copy()
    snow(frame, t)
    d = ImageDraw.Draw(frame)
    tree(d, W / 2, 1560, 420, t)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 360 + dy), "ЦЕЛЬ ПРОГРАММЫ", font("Inter-SemiBold.otf", 40), MINT, spacing=10)
    text(ld, (W / 2, 560 + dy), "−5…10 кг", font("InterDisplay-Black.otf", 190), GOLD)
    text(ld, (W / 2, 720 + dy), "к праздникам", font("InterDisplay-Light.otf", 90), WHITE)
    frame.alpha_composite(with_alpha(lay, a))
    return frame


EPISODES = ["Точка А", "Первые результаты", "Середина пути", "Финал"]


def f_scene_reality(t):
    lt = t - F["T_REALITY"]
    frame = BG_MINT_NY.copy()
    snow(frame, t, alpha=255)
    d = ImageDraw.Draw(frame)
    rec_badge(d, 90, 200, t)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 420 + dy), "В формате реалити", font("InterDisplay-Black.otf", 96), TEAL)
    text(ld, (W / 2, 530 + dy), "каждую неделю — новый выпуск", font("InterDisplay-Light.otf", 54), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    for i, name in enumerate(EPISODES):
        a2, dy2 = pop(lt - 2.5 - i * 0.35)
        if a2 <= 0:
            continue
        lay, ld = layer()
        x = 95 + i * 230
        y0 = 760 + dy2
        ld.rounded_rectangle((x, y0, x + 200, y0 + 356), radius=28, fill=TEAL)
        ld.rounded_rectangle((x + 14, y0 + 14, x + 186, y0 + 230), radius=18, fill=(40, 120, 115))
        ld.polygon([(x + 80, y0 + 90), (x + 80, y0 + 154), (x + 130, y0 + 122)], fill=WHITE)
        ld.text((x + 100, y0 + 270), f"Неделя {i + 1}", font=font("InterDisplay-Bold.otf", 34), fill=WHITE, anchor="mm")
        f = font("InterDisplay-Light.otf", 26)
        words = name.split()
        if len(words) > 1 and ld.textlength(name, font=f) > 180:
            ld.text((x + 100, y0 + 308), words[0], font=f, fill=MINT_L, anchor="mm")
            ld.text((x + 100, y0 + 338), " ".join(words[1:]), font=f, fill=MINT_L, anchor="mm")
        else:
            ld.text((x + 100, y0 + 318), name, font=f, fill=MINT_L, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a2))
    return frame


def f_scene_cta(t):
    lt = t - F["T_CTA"]
    frame = BG_NIGHT.copy()
    snow(frame, t)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 560 + dy), "Старт", font("InterDisplay-Light.otf", 90), WHITE)
    text(ld, (W / 2, 720 + dy), "10 ноября", font("InterDisplay-Black.otf", 170), GOLD)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 2.1)
    if a2:
        lay, ld = layer()
        button(ld, 1080 + dy2, "Напишите «ФОКУС»", "в директ", fill=GOLD, fg=TEAL_D, pulse=1 + 0.03 * math.sin(lt * 6))
        frame.alpha_composite(with_alpha(lay, a2))
    footer(ImageDraw.Draw(frame))
    return frame


FOCUS_SCENES = [(0.0, f_scene_countdown), (F["T_GROUP"], f_scene_group), (F["T_GOAL"], f_scene_goal),
                (F["T_REALITY"], f_scene_reality), (F["T_CTA"], f_scene_cta)]


# ================================================================== covers
def render_covers(d):
    d.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(EPISODES):
        frame = BG_NIGHT.copy()
        snow(frame, 3.0 + i * 7)
        dr = ImageDraw.Draw(frame)
        rec_badge(dr, W / 2 - 150, 300, 0.0)
        text(dr, (W / 2, 560), "«Фокус-группа»", font("InterDisplay-Black.otf", 110), WHITE)
        text(dr, (W / 2, 660), "реалити центра Аллы Казаниной", font("InterDisplay-Light.otf", 46), MINT)
        text(dr, (W / 2, 900), f"Неделя {i + 1}", font("InterDisplay-Black.otf", 170), GOLD)
        text(dr, (W / 2, 1060), name, font("InterDisplay-Bold.otf", 90), WHITE)
        tree(dr, W / 2, 1600, 360, 0.0)
        frame.convert("RGB").save(d / f"week-{i + 1}.png")


# ================================================================== audio + render
def festive_music(dur, sr):
    n = int(sr * dur)
    out = np.zeros(n, np.float32)
    r = np.random.default_rng(4)

    def note(f, start, d, gain, decay=3.0):
        s = int(start * sr)
        ln = min(int(d * sr), n - s)
        if ln <= 0:
            return
        x = np.arange(ln) / sr
        sig = np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * 2.76 * f * x) * np.exp(-x * 6)  # bell partial
        out[s:s + ln] += sig * np.exp(-x * decay) * np.clip(x / 0.004, 0, 1) * gain

    chords = [[293.66, 369.99, 440.0], [246.94, 293.66, 369.99], [196.0, 246.94, 293.66], [220.0, 277.18, 329.63]]
    beat = 0.25
    t0, k = 0.0, 0
    while t0 < dur - 0.4:
        ch = chords[(k // 16) % 4]
        note(ch[k % 3] * 2, t0, 0.6, 0.06, 5.0)
        if k % 8 == 0:
            note(ch[0] / 2, t0, 2.0, 0.16, 1.2)
        if k % 2 == 1:  # sleigh-bell shaker
            ln = int(0.06 * sr)
            s = int(t0 * sr)
            sh = np.diff(np.concatenate([[0], r.standard_normal(ln)])) * np.exp(-np.arange(ln) / (ln / 5)) * 0.08
            out[s:s + ln] += sh[:max(0, n - s)]
        t0 += beat
        k += 1
    out[-int(0.8 * sr):] *= np.linspace(1, 0, int(0.8 * sr))
    return out / (np.abs(out).max() / 0.85)


def mix_vo(music, sr, vo_path, offset):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(vo_path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"])
    src = np.frombuffer(raw, np.float32)
    vo = np.zeros_like(music)
    a = int(offset * sr)
    b = min(len(vo), a + len(src))
    vo[a:b] = src[:b - a]
    env = np.sqrt(np.convolve(vo ** 2, np.ones(int(0.05 * sr)) / int(0.05 * sr), mode="same"))
    k = int(0.25 * sr)
    active = np.convolve((env > 0.01).astype(np.float32), np.ones(k) / k, mode="same")
    duck = 1 - 0.6 * np.clip(active * 1.5, 0, 1)
    vo *= 0.9 / (np.abs(vo).max() + 1e-6)
    mix = music * 0.5 * duck + vo
    return mix / max(1.0, np.abs(mix).max() / 0.95)


def make_render_frame(scenes):
    def render_frame(i):
        t = i / FPS
        idx = max(k for k, (st, _) in enumerate(scenes) if st <= t)
        st, fn = scenes[idx]
        f = fn(t)
        if idx > 0 and t < st + 0.3:
            f = Image.blend(scenes[idx - 1][1](t), f, ease((t - st) / 0.3))
        return f.convert("RGB")
    return render_frame


def render_video(cfg, scenes, out, preview=None, preview_only=False, secs=()):
    render_frame = make_render_frame(scenes)
    if preview:
        preview.mkdir(parents=True, exist_ok=True)
        for s in secs:
            render_frame(int(s * FPS)).save(preview / f"f_{s:04.1f}.png")
        if preview_only:
            return
    sr = 44100
    music = festive_music(cfg["DUR"], sr)
    vo_path = HERE / cfg["VO"]
    audio = mix_vo(music, sr, vo_path, cfg["VO_OFFSET"]) if vo_path.exists() else music * 0.8
    wav = out.with_suffix(".wav")
    st = np.stack([audio, audio], axis=1)
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE)
    for i in range(int(cfg["DUR"] * FPS)):
        ff.stdin.write(render_frame(i).tobytes())
    ff.stdin.close()
    ff.wait()
    wav.unlink()
    print("done", out)


def main():
    mode, out = sys.argv[1], Path(sys.argv[2])
    preview = Path(sys.argv[sys.argv.index("--preview") + 1]) if "--preview" in sys.argv else None
    only = "--preview-only" in sys.argv
    if mode == "gift":
        render_video(G, GIFT_SCENES, out, preview, only, secs=(2.5, 6.2, 11.5, 16.0))
    elif mode == "focus":
        render_video(F, FOCUS_SCENES, out, preview, only, secs=(4.0, 13.0, 16.0, 22.5, 27.5))
    elif mode == "covers":
        render_covers(out)


if __name__ == "__main__":
    main()
