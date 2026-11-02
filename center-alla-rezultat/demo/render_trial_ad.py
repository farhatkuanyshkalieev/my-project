"""Demo Reels ad (scenario 1: "1 hour, 8 devices", trial visit offer).

Motion graphics: hour progress bar, diagnostics checklist, measuring tape,
eight animated method cards, guarantee and offer end card, synthesized beat.

Usage: python3 render_trial_ad.py OUT.mp4 [--preview DIR [--preview-only]]
"""
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
DUR = 27.5
N = int(FPS * DUR)
FONT_DIR = "/usr/share/fonts/opentype/inter/"

TEAL = (11, 75, 72)
TEAL_D = (7, 52, 50)
MINT = (127, 216, 207)
MINT_L = (214, 243, 239)
WHITE = (255, 255, 255)
SKIN = (238, 190, 168)
CORAL = (242, 120, 110)
FAT = (250, 226, 160)

T_DIAG, T_TAPE, T_DEV, T_RES, T_CTA = 2.5, 5.5, 7.5, 19.5, 23.0
CARD = 1.5

METHODS = [
    ("Вакуумный массаж", "кровоток и лимфоток"),
    ("RF-лифтинг", "упругость кожи"),
    ("Ультразвук", "тонус и коллаген"),
    ("Лазерный липолиз", "проблемные зоны"),
    ("Миостимуляция", "мышцы без нагрузки"),
    ("Лимфодренаж", "минус отёчность"),
    ("Микротоки", "тонус тканей"),
    ("Неинвазивная липосакция", "объёмы без операций"),
]

_fonts = {}


def font(name, size):
    key = (name, size)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT_DIR + name, size)
    return _fonts[key]


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def gradient(top, bot):
    g = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    arr = np.array(top, np.float32) * (1 - g) + np.array(bot, np.float32) * g
    arr = np.repeat(arr, W, axis=1)
    return Image.fromarray(arr.astype(np.uint8)).convert("RGBA")


BG_MINT = gradient((238, 250, 248), (158, 222, 213))
BG_TEAL = gradient((16, 92, 88), (6, 46, 44))

CIRCLE_R = 330
ICON = CIRCLE_R * 2
CIRCLE_MASK = Image.new("L", (ICON, ICON), 0)
ImageDraw.Draw(CIRCLE_MASK).ellipse((0, 0, ICON - 1, ICON - 1), fill=255)
SHADOW = Image.new("RGBA", (ICON + 160, ICON + 160), (0, 0, 0, 0))
ImageDraw.Draw(SHADOW).ellipse((80, 100, 80 + ICON, 100 + ICON), fill=(11, 75, 72, 70))
SHADOW = SHADOW.filter(ImageFilter.GaussianBlur(28))


def text(d, xy, s, f, fill, anchor="mm", spacing=0):
    if spacing:
        widths = [d.textlength(c, font=f) + spacing for c in s]
        total = sum(widths) - spacing
        x = xy[0] - total / 2
        for c, cw in zip(s, widths):
            d.text((x, xy[1]), c, font=f, fill=fill, anchor="lm")
            x += cw
    else:
        d.text(xy, s, font=f, fill=fill, anchor=anchor)


def with_alpha(layer, a):
    if a >= 0.999:
        return layer
    out = layer.copy()
    out.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    return out


# ------------------------------------------------------------------ icons
def icon_canvas():
    im = Image.new("RGBA", (ICON, ICON), WHITE + (255,))
    return im, ImageDraw.Draw(im)


def icon_vacuum(t):
    im, d = icon_canvas()
    c = ICON / 2
    bulge = 40 + 70 * abs(math.sin(t * math.pi * 2.2))
    base = c + 110
    pts = [(0, ICON), (0, base)]
    for i in range(61):
        x = c - 300 + i * 10
        u = (x - c) / 150
        y = base - (bulge * (math.cos(u * math.pi / 2) ** 2) if abs(u) < 1 else 0)
        pts.append((x, y))
    pts += [(ICON, base), (ICON, ICON)]
    d.polygon(pts, fill=SKIN)
    d.rounded_rectangle((c - 160, c - 200, c + 160, base + 6), radius=80, outline=TEAL, width=14)
    d.rectangle((c - 146, base - 2, c + 146, base + 20), fill=SKIN)
    d.polygon(pts, fill=SKIN)
    d.rectangle((c - 22, c - 260, c + 22, c - 200), fill=TEAL)
    for k in range(3):
        y = c - 40 - ((t * 160 + k * 50) % 150)
        d.line((c - 20, y + 20, c, y, c + 20, y + 20), fill=MINT, width=8)
    return im


def icon_rf(t):
    im, d = icon_canvas()
    c = ICON / 2
    for k in range(5):
        p = (t * 0.9 + k / 5) % 1
        r = 40 + p * 270
        col = tuple(int(v * (1 - p) + 255 * p) for v in TEAL)
        d.ellipse((c - r, c - r, c + r, c + r), outline=col, width=10)
    d.ellipse((c - 46, c - 46, c + 46, c + 46), fill=TEAL)
    d.ellipse((c - 18, c - 18, c + 18, c + 18), fill=MINT)
    return im


def icon_ultra(t):
    im, d = icon_canvas()
    c = ICON / 2
    for k, (amp, freq, col, w) in enumerate([(70, 3.0, TEAL, 12), (45, 4.5, MINT, 10), (25, 6.0, (90, 170, 165), 8)]):
        pts = []
        for i in range(0, ICON + 1, 6):
            x = i
            env = math.sin(math.pi * i / ICON)
            y = c + (k - 1) * 110 + amp * env * math.sin((i / ICON) * freq * 2 * math.pi - t * 9)
            pts.append((x, y))
        d.line(pts, fill=col, width=w, joint="curve")
    return im


def icon_laser(t):
    im, d = icon_canvas()
    c = ICON / 2
    d.rectangle((0, c + 140, ICON, ICON), fill=SKIN)
    glow = Image.new("RGBA", (ICON, ICON), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for k in range(4):
        x = c - 165 + k * 110
        fl = 0.6 + 0.4 * abs(math.sin(t * 13 + k * 1.7))
        gd.line((x, c - 120, x, c + 145), fill=CORAL + (int(110 * fl),), width=34)
        gd.ellipse((x - 40, c + 115, x + 40, c + 175), fill=CORAL + (int(120 * fl),))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    for k in range(4):
        x = c - 165 + k * 110
        d.line((x, c - 120, x, c + 145), fill=(255, 235, 230), width=6)
    d.rounded_rectangle((c - 230, c - 210, c + 230, c - 110), radius=30, fill=TEAL)
    for k in range(4):
        x = c - 165 + k * 110
        d.ellipse((x - 16, c - 140, x + 16, c - 108), fill=CORAL)
    return im


def icon_myo(t):
    im, d = icon_canvas()
    c = ICON / 2
    pulse = abs(math.sin(t * math.pi * 3))
    for k in range(5):
        y = c + 90 + k * 42
        half = 210 - pulse * 45 * (1 - abs(k - 2) / 3)
        d.rounded_rectangle((c - half, y - 14, c + half, y + 14), radius=14, fill=(232, 150, 140) if k % 2 else (220, 128, 120))
    s = 1 + 0.15 * pulse
    bolt = [(30, -150), (-55, 10), (5, 10), (-30, 130), (70, -40), (8, -40), (45, -150)]
    pts = [(c + x * s, c - 70 + y * s) for x, y in bolt]
    d.polygon(pts, fill=TEAL)
    if pulse > 0.6:
        for a in range(0, 360, 45):
            r0, r1 = 175, 205
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            d.line((c + ca * r0, c - 70 + sa * r0, c + ca * r1, c - 70 + sa * r1), fill=MINT, width=8)
    return im


def icon_lymph(t):
    im, d = icon_canvas()
    c = ICON / 2
    n = 6
    for k in range(n):
        y1 = c + 230 - k * 78
        phase = t * 4 - k * 0.8
        v = max(0.0, math.cos(phase)) ** 2
        col = tuple(int(MINT_L[i] * (1 - v) + TEAL[i] * v) for i in range(3))
        wdt = 120 - k * 6 + v * 10
        d.rounded_rectangle((c - wdt, y1 - 70, c + wdt, y1), radius=26, fill=col)
    ay = c - 250 + ((t * 120) % 60)
    d.line((c - 30, ay + 30, c, ay, c + 30, ay + 30), fill=TEAL, width=10)
    return im


def icon_micro(t):
    im, d = icon_canvas()
    c = ICON / 2
    for x in (c - 200, c + 200):
        d.ellipse((x - 60, c - 60, x + 60, c + 60), fill=TEAL)
        d.ellipse((x - 26, c - 26, x + 26, c + 26), fill=MINT)
    for k in range(14):
        p = (t * 0.8 + k / 14) % 1
        x = c - 140 + p * 280
        y = c + 70 * math.sin(p * 2 * math.pi) * (1 if k % 2 else -1)
        r = 9 + 5 * math.sin(p * math.pi)
        d.ellipse((x - r, y - r, x + r, y + r), fill=MINT if k % 3 else TEAL)
    return im


CELLS = [(0, 0, 58)] + [(math.cos(a) * 118, math.sin(a) * 118, 54) for a in np.linspace(0, 2 * np.pi, 7)[:-1]] + \
    [(math.cos(a) * 225, math.sin(a) * 225, 48) for a in np.linspace(0, 2 * np.pi, 13)[:-1] + 0.26]


def icon_lipo(t):
    im, d = icon_canvas()
    c = ICON / 2
    k = 1 - 0.45 * ease(t / 1.2)
    for x, y, r in CELLS:
        rr = r * k
        d.ellipse((c + x - rr, c + y - rr, c + x + rr, c + y + rr), fill=FAT, outline=(225, 185, 100), width=5)
    return im


ICONS = [icon_vacuum, icon_rf, icon_ultra, icon_laser, icon_myo, icon_lymph, icon_micro, icon_lipo]


# ------------------------------------------------------------------ overlays
def progress_bar(frame, t):
    if not (T_DIAG <= t < T_RES):
        return
    p = (t - T_DIAG) / (T_RES - T_DIAG)
    mins = int(round(p * 60))
    d = ImageDraw.Draw(frame)
    x0, x1, y = 90, W - 90, 150
    d.rounded_rectangle((x0, y - 9, x1, y + 9), radius=9, fill=(255, 255, 255, 255))
    d.rounded_rectangle((x0, y - 9, x0 + max(18, (x1 - x0) * p), y + 9), radius=9, fill=TEAL)
    d.text((x0, y - 40), "1 ЧАС В ЦЕНТРЕ", font=font("Inter-SemiBold.otf", 34), fill=TEAL, anchor="ls")
    d.text((x1, y - 40), f"{mins} мин", font=font("InterDisplay-Bold.otf", 44), fill=TEAL, anchor="rs")


def scene_hook(t):
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    glow = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    ImageDraw.Draw(glow).ellipse((W / 2 - 420, 520, W / 2 + 420, 1360), fill=(255, 255, 255, 170))
    frame.alpha_composite(glow.filter(ImageFilter.GaussianBlur(90)))
    a = ease((t - 0.7) / 0.5)
    if a > 0:
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        dy = (1 - ease_out((t - 0.7) / 0.5)) * 50
        text(ld, (W / 2, 820 + dy), "Что можно успеть", font("InterDisplay-Bold.otf", 104), TEAL)
        text(ld, (W / 2, 950 + dy), "за 1 час?", font("InterDisplay-Black.otf", 150), TEAL)
        frame.alpha_composite(with_alpha(lay, a))
    a2 = ease((t - 1.3) / 0.4)
    if a2 > 0:
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        text(ImageDraw.Draw(lay), (W / 2, 1110), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ", font("Inter-Medium.otf", 36), TEAL, spacing=7)
        frame.alpha_composite(with_alpha(lay, a2))
    # doors
    open_ = ease_out((t - 0.15) / 0.9)
    off = open_ * (W / 2 + 40)
    for side in (-1, 1):
        x_edge = W / 2 + side * off
        if side < 0:
            box = (x_edge - W / 2, 0, x_edge, H)
        else:
            box = (x_edge, 0, x_edge + W / 2, H)
        d.rectangle(box, fill=(248, 252, 251))
        hx = box[2] - 70 if side < 0 else box[0] + 50
        d.rounded_rectangle((hx, 880, hx + 20, 1040), radius=10, fill=TEAL)
        ex = box[2] if side < 0 else box[0]
        d.line((ex, 0, ex, H), fill=(200, 230, 226), width=4)
    return frame


DIAG_ITEMS = ["Состав тела", "Питание и привычки", "Причины набора веса", "Противопоказания"]


def scene_diag(t):
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    lt = t - T_DIAG
    a = ease(lt / 0.3)
    dy = (1 - ease_out(lt / 0.35)) * 60
    text(d, (W / 2, 330 + dy), "Сначала — диагностика", font("InterDisplay-Bold.otf", 80), TEAL)
    text(d, (W / 2, 425 + dy), "разбираем, почему вес не уходит", font("InterDisplay-Light.otf", 48), TEAL)
    cx0, cy0, cx1, cy1 = 120, 560 + dy, W - 120, 1480 + dy
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((cx0, cy0 + 20, cx1, cy1 + 20), radius=60, fill=(11, 75, 72, 60))
    frame.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((cx0, cy0, cx1, cy1), radius=60, fill=WHITE)
    d.rounded_rectangle((cx0 + 60, cy0 + 70, cx0 + 320, cy0 + 100), radius=15, fill=MINT_L)
    for i, item in enumerate(DIAG_ITEMS):
        y = cy0 + 210 + i * 175
        p = ease_out((lt - 0.35 - i * 0.42) / 0.3)
        box = (cx0 + 70, y - 45, cx0 + 160, y + 45)
        d.rounded_rectangle(box, radius=24, fill=TEAL if p > 0.5 else MINT_L)
        if p > 0.5:
            d.line((box[0] + 22, y, box[0] + 40, y + 20, box[0] + 70, y - 22), fill=WHITE, width=10, joint="curve")
        d.text((cx0 + 200, y), item, font=font("InterDisplay-Medium.otf", 48), fill=TEAL, anchor="lm")
        d.rounded_rectangle((cx0 + 200, y + 40, cx0 + 200 + 380 * p, y + 50), radius=5, fill=MINT)
    if a < 1:
        frame = Image.blend(BG_MINT, frame, a)
    return frame


def scene_tape(t):
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    lt = t - T_TAPE
    dy = (1 - ease_out(lt / 0.35)) * 60
    text(d, (W / 2, 360 + dy), "Замеры до процедур", font("InterDisplay-Bold.otf", 84), TEAL)
    text(d, (W / 2, 460 + dy), "чтобы результат был в цифрах", font("InterDisplay-Light.otf", 48), TEAL)
    y0, y1 = 860, 1060
    d.rectangle((0, y0, W, y1), fill=(255, 246, 214))
    d.line((0, y0, W, y0), fill=(225, 205, 150), width=4)
    d.line((0, y1, W, y1), fill=(225, 205, 150), width=4)
    shift = ease_out(lt / 1.6) * 1400
    px_per_cm = 70
    start = int((shift - W) / px_per_cm) - 2
    for cm in range(start, start + int(2 * W / px_per_cm) + 4):
        x = W / 2 + cm * px_per_cm - shift
        if x < -50 or x > W + 50:
            continue
        d.line((x, y0, x, y0 + 80), fill=TEAL, width=5)
        d.line((x, y1, x, y1 - 50), fill=TEAL, width=4)
        for mm in range(1, 10):
            xm = x + mm * px_per_cm / 10
            ln = 40 if mm == 5 else 24
            d.line((xm, y0, xm, y0 + ln), fill=(70, 120, 115), width=2)
        if cm >= 0:
            d.text((x, y0 + 125), str(cm), font=font("InterDisplay-Bold.otf", 48), fill=TEAL, anchor="mm")
    d.polygon([(W / 2 - 34, y0 - 70), (W / 2 + 34, y0 - 70), (W / 2, y0 - 10)], fill=CORAL)
    d.line((W / 2, y0 - 10, W / 2, y1 + 40), fill=CORAL, width=6)
    return frame


def scene_device(t):
    frame = BG_MINT.copy()
    idx = min(int((t - T_DEV) / CARD), 7)
    lt = t - T_DEV - idx * CARD
    name, desc = METHODS[idx]
    slide = (1 - ease_out(lt / 0.28)) * W * 0.7
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    text(ld, (W / 2, 300), "МЕТОДИКА", font("Inter-SemiBold.otf", 34), TEAL, spacing=8)
    ld.text((W / 2, 400), f"{idx + 1}", font=font("InterDisplay-Black.otf", 120), fill=TEAL, anchor="rm")
    ld.text((W / 2 + 8, 412), " / 8", font=font("InterDisplay-Light.otf", 70), fill=TEAL, anchor="lm")
    cy = 920
    lay.alpha_composite(SHADOW, (int(W / 2 - CIRCLE_R - 80), int(cy - CIRCLE_R - 100)))
    icon = ICONS[idx](lt)
    icon.putalpha(CIRCLE_MASK)
    lay.alpha_composite(icon, (int(W / 2 - CIRCLE_R), int(cy - CIRCLE_R)))
    ld = ImageDraw.Draw(lay)
    ld.ellipse((W / 2 - CIRCLE_R, cy - CIRCLE_R, W / 2 + CIRCLE_R, cy + CIRCLE_R), outline=MINT, width=8)
    fsize = 76 if len(name) < 18 else 62
    text(ld, (W / 2, 1380), name, font("InterDisplay-Bold.otf", fsize), TEAL)
    text(ld, (W / 2, 1470), desc, font("InterDisplay-Light.otf", 50), TEAL)
    # dots
    for k in range(8):
        x = W / 2 - 7 * 26 + k * 52
        r = 11 if k == idx else 7
        ld.ellipse((x - r, 1620 - r, x + r, 1620 + r), fill=TEAL if k <= idx else (255, 255, 255, 220))
    frame.alpha_composite(lay, (int(slide), 0))
    if slide > 1 and idx > 0:
        pass
    return frame


def scene_result(t):
    frame = BG_TEAL.copy()
    d = ImageDraw.Draw(frame)
    lt = t - T_RES
    flash = max(0.0, 1 - lt / 0.25)
    n = int(round(15 * ease_out(lt / 0.9)))
    s = 1 + 0.08 * max(0.0, 1 - lt / 0.3)
    f = font("InterDisplay-Black.otf", int(250 * s))
    d.text((W / 2, 820), f"−{n} см", font=f, fill=WHITE, anchor="mm")
    a = ease((lt - 0.5) / 0.4)
    if a > 0:
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        text(ld, (W / 2, 1010), "в объёме за 1 визит", font("InterDisplay-Medium.otf", 64), WHITE)
        frame.alpha_composite(with_alpha(lay, a))
    a = ease((lt - 1.1) / 0.4)
    if a > 0:
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        f2 = font("InterDisplay-Bold.otf", 58)
        label = "или вернём деньги"
        tw = ld.textlength(label, font=f2)
        y = 1190 + (1 - ease_out((lt - 1.1) / 0.4)) * 40
        ld.rounded_rectangle((W / 2 - tw / 2 - 60, y - 60, W / 2 + tw / 2 + 60, y + 60), radius=60, fill=MINT)
        ld.text((W / 2, y), label, font=f2, fill=TEAL_D, anchor="mm")
        text(ld, (W / 2, 1330), "гарантия центра", font("Inter-Regular.otf", 36), MINT)
        frame.alpha_composite(with_alpha(lay, a))
    # tape motif
    d = ImageDraw.Draw(frame)
    y0 = 1560
    d.rectangle((0, y0, W, y0 + 90), fill=(255, 246, 214, 255))
    off = (lt * 120) % 60
    for k in range(-1, 20):
        x = k * 60 - off
        d.line((x, y0, x, y0 + (45 if k % 5 == 0 else 25)), fill=TEAL, width=4)
    if flash > 0:
        frame = Image.blend(frame, Image.new("RGBA", (W, H), WHITE + (255,)), flash * 0.8)
    return frame


CHECKS = ["Диагностика и протокол", "План питания", "До 8 методик за 1 час"]


def scene_cta(t):
    frame = BG_MINT.copy()
    lt = t - T_CTA
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)

    def step(delay):
        return ease((lt - delay) / 0.35), (1 - ease_out((lt - delay) / 0.4)) * 40

    a, dy = step(0.0)
    if a:
        l2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(l2)
        text(d2, (W / 2, 330 + dy), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ · АЛМАТЫ", font("Inter-Medium.otf", 32), TEAL, spacing=5)
        text(d2, (W / 2, 470 + dy), "Пробный визит", font("InterDisplay-Bold.otf", 96), TEAL)
        lay.alpha_composite(with_alpha(l2, a))
    a, dy = step(0.25)
    if a:
        l2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        text(ImageDraw.Draw(l2), (W / 2, 640 + dy), "35 000 ₸", font("InterDisplay-Black.otf", 180), TEAL)
        lay.alpha_composite(with_alpha(l2, a))
    for i, c in enumerate(CHECKS):
        a, dy = step(0.6 + i * 0.25)
        if a:
            l2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            d2 = ImageDraw.Draw(l2)
            y = 860 + i * 105 + dy
            d2.ellipse((215, y - 30, 275, y + 30), fill=TEAL)
            d2.line((230, y, 242, y + 13, 262, y - 13), fill=WHITE, width=7, joint="curve")
            d2.text((305, y), c, font=font("InterDisplay-Medium.otf", 54), fill=TEAL, anchor="lm")
            lay.alpha_composite(with_alpha(l2, a))
    a, dy = step(1.5)
    if a:
        l2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(l2)
        pulse = 1 + 0.03 * math.sin(lt * 6)
        bw, bh = 860 * pulse, 150 * pulse
        y = 1340 + dy
        d2.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=TEAL)
        d2.text((W / 2, y - 18), "Напишите «ПРОБНЫЙ»", font=font("InterDisplay-Bold.otf", 52), fill=WHITE, anchor="mm")
        d2.text((W / 2, y + 36), "в WhatsApp", font=font("InterDisplay-Light.otf", 40), fill=MINT_L, anchor="mm")
        lay.alpha_composite(with_alpha(l2, a))
    text(ld, (W / 2, 1830), "демо-концепт ролика", font("Inter-Regular.otf", 28), (40, 90, 88, 170))
    frame.alpha_composite(lay)
    return frame


def render_frame(i):
    t = i / FPS
    if t < T_DIAG:
        frame = scene_hook(t)
    elif t < T_TAPE:
        frame = scene_diag(t)
    elif t < T_DEV:
        frame = scene_tape(t)
    elif t < T_RES:
        frame = scene_device(t)
    elif t < T_CTA:
        frame = scene_result(t)
    else:
        frame = scene_cta(t)
        if t < T_CTA + 0.3:
            frame = Image.blend(scene_result(t), frame, ease((t - T_CTA) / 0.3))
    progress_bar(frame, t)
    return frame.convert("RGB")


# ------------------------------------------------------------------ audio
def render_audio(path):
    sr = 44100
    n = int(sr * DUR)
    t = np.arange(n) / sr
    r = np.random.default_rng(3)
    out = np.zeros(n, np.float32)
    beat = 0.5

    def add(sig, start):
        s = int(start * sr)
        e = min(n, s + len(sig))
        if s < n:
            out[s:e] += sig[:e - s]

    def kick():
        tt = np.arange(int(0.35 * sr)) / sr
        f = 50 + 90 * np.exp(-tt * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt * 9) * 0.9

    def hat(level=0.18):
        ln = int(0.05 * sr)
        x = np.diff(np.concatenate([[0], r.standard_normal(ln)]))
        return x * np.exp(-np.arange(ln) / (ln / 6)) * level

    def tick():
        ln = int(0.03 * sr)
        tt = np.arange(ln) / sr
        return np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 200) * 0.35

    def whoosh(dur=0.25, level=0.35):
        ln = int(dur * sr)
        x = np.convolve(r.standard_normal(ln), np.ones(25) / 25, mode="same")
        env = np.sin(np.linspace(0, np.pi, ln)) ** 2
        return x * env * level

    def bass(freq, dur=0.45):
        tt = np.arange(int(dur * sr)) / sr
        x = sum(np.sin(2 * np.pi * freq * k * tt) / k for k in (1, 2, 3))
        return x * np.exp(-tt * 4) * 0.28

    # hook: clock ticks + door whoosh
    for k in range(5):
        add(tick(), 0.1 + k * beat)
    add(whoosh(0.8, 0.5), 0.1)
    # main beat 2.5 .. 19.5
    roots = [55.0, 43.65, 65.41, 49.0]
    bt = T_DIAG
    k = 0
    while bt < T_RES - 1e-6:
        add(kick(), bt)
        add(hat(), bt + beat / 2)
        if k % 3 == 0:
            add(bass(roots[(k // 3) % 4]), bt)
        bt += beat
        k += 1
    for j in range(8):
        add(whoosh(0.22, 0.3), T_DEV + j * CARD - 0.08)
    add(whoosh(0.3, 0.3), T_TAPE - 0.1)
    # riser
    rs, re_ = 17.6, T_RES
    ln = int((re_ - rs) * sr)
    tt = np.arange(ln) / sr
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 900 * (tt / tt[-1]) ** 2) / sr)
    noise = np.convolve(r.standard_normal(ln), np.ones(8) / 8, mode="same")
    add((sweep * 0.12 + noise * 0.25) * (tt / tt[-1]) ** 2, rs)
    # impact
    tt = np.arange(int(1.2 * sr)) / sr
    add(np.sin(2 * np.pi * 45 * tt) * np.exp(-tt * 3) * 1.0 + r.standard_normal(len(tt)) * np.exp(-tt * 25) * 0.3, T_RES)
    # pad from result to end
    pad_env = np.clip((t - T_RES) / 1.0, 0, 1) * np.clip((DUR - t) / 1.0, 0, 1)
    pad = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.004 * t) for f in (220.0, 277.18, 329.63, 415.3)) / 8
    out += pad * pad_env * 0.25
    # half-time soft kick under CTA
    bt = T_RES + 1.0
    while bt < DUR - 1.0:
        add(kick() * 0.5, bt)
        bt += 1.0
    for f0, ts in ((880.0, T_CTA + 0.25), (1318.5, T_CTA + 0.4)):
        e = np.where(t >= ts, np.exp(-(t - ts) * 2.5), 0)
        out += np.sin(2 * np.pi * f0 * t) * e * 0.12

    out /= np.abs(out).max() / 0.85
    st = np.stack([out, out], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


SECS = (1.6, 4.4, 6.6, 8.4, 11.6, 14.3, 17.3, 18.9, 21.2, 25.5)


def main():
    out = Path(sys.argv[1])
    if "--preview" in sys.argv:
        pdir = Path(sys.argv[sys.argv.index("--preview") + 1])
        pdir.mkdir(parents=True, exist_ok=True)
        for sec in SECS:
            render_frame(int(sec * FPS)).save(pdir / f"f_{sec:04.1f}.png")
        if "--preview-only" in sys.argv:
            return
    wav = out.with_suffix(".wav")
    render_audio(wav)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE)
    for i in range(N):
        ff.stdin.write(render_frame(i).tobytes())
        if i % 120 == 0:
            print(f"frame {i}/{N}", flush=True)
    ff.stdin.close()
    ff.wait()
    wav.unlink()
    print("done", out)


if __name__ == "__main__":
    main()
