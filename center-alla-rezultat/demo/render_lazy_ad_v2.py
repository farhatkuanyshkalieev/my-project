"""«Ленивый спорт» v2: client feedback applied.

- girl instead of the gender-neutral character;
- the centre's logo pinned in the top-left corner for the whole video;
- brand look from the logo: turquoise, graphite text, translucent circles;
- «ДО / ПОСЛЕ» silhouette of a girl in the product scene;
- same humour, voiceover and timings as v1 (audio reused from render_lazy_ad.py).

Usage: python3 render_lazy_ad_v2.py OUT.mp4 [--preview DIR [--preview-only]]
The end card is added afterwards with tools/add_outro.py.
"""
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from render_lazy_ad import DUR, MONTHS, T_CTA, T_ME2, T_PROD, render_audio  # noqa: E402
from render_trial_ad import CORAL, WHITE, ease, ease_out, font, text, with_alpha  # noqa: E402

W, H, FPS = 1080, 1920, 30
N = int(FPS * DUR)

# brand colours sampled from the logo
TURQ = (60, 224, 215)
TURQ_D = (30, 187, 176)
TURQ_DD = (18, 140, 132)
AQUA_L = (222, 249, 246)
GRAPHITE = (55, 52, 53)
SKIN = (241, 200, 178)
HAIR = (92, 58, 44)
LIPS = (226, 110, 110)
GREY_TEXT = (90, 94, 102)

LOGO_SRC = Image.open(HERE.parent / "brand" / "logo.png").convert("RGBA")
LOGO = LOGO_SRC.resize((500, int(500 * LOGO_SRC.height / LOGO_SRC.width)), Image.LANCZOS)


def layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def pop(lt, dur=0.35):
    return ease(lt / dur), (1 - ease_out(lt / (dur + 0.1))) * 50


def brand_bg(top, bottom, circle_rgb, strength=1.0):
    g = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    arr = np.array(top, np.float32) * (1 - g) + np.array(bottom, np.float32) * g
    bg = Image.fromarray(np.repeat(arr, W, axis=1).astype(np.uint8)).convert("RGBA")
    circles, cd = layer()
    # logo motif: large soft rings and a small disc
    for (cx, cy, r, a) in [(W + 60, 1500, 620, 60), (W + 60, 1500, 470, 40), (-140, 420, 380, 45), (860, 300, 90, 55)]:
        cd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=circle_rgb + (int(a * strength),))
    bg.alpha_composite(circles.filter(ImageFilter.GaussianBlur(2)))
    return bg


BG_BRAND = brand_bg((255, 255, 255), AQUA_L, TURQ)
BG_SAD = brand_bg((236, 237, 240), (214, 216, 221), (170, 174, 182), strength=0.8)


def pin_logo(frame):
    frame.alpha_composite(LOGO, (30, 30))


def chip(ld, cx, cy, label, size=50, fill=WHITE, fg=GRAPHITE, check=TURQ_D):
    f = font("InterDisplay-SemiBold.otf", size)
    tw = ld.textlength(label, font=f)
    w = tw + 150
    ld.rounded_rectangle((cx - w / 2, cy - 50, cx + w / 2, cy + 50), radius=50, fill=fill, outline=TURQ, width=3)
    x = cx - w / 2 + 52
    ld.ellipse((x - 24, cy - 24, x + 24, cy + 24), fill=check)
    ld.line((x - 11, cy, x - 2, cy + 10, x + 13, cy - 10), fill=WHITE, width=6, joint="curve")
    ld.text((x + 40, cy), label, font=f, fill=fg, anchor="lm")


# ------------------------------------------------------------------ the girl (lying, side view)
def draw_girl_lying(d, t, ox=0, oy=0, s=1.0):
    def P(x, y):
        return (ox + x * s, oy + y * s)

    def R(x0, y0, x1, y1):
        return (*P(x0, y0), *P(x1, y1))

    w = lambda v: max(1, int(v * s))  # noqa: E731
    # couch
    d.rounded_rectangle(R(110, 1060, 970, 1130), radius=w(30), fill=TURQ_D)
    for x in (170, 880):
        d.rounded_rectangle(R(x, 1120, x + 30, 1230), radius=w(12), fill=TURQ_DD)
    d.rounded_rectangle(R(120, 1005, 340, 1070), radius=w(32), fill=WHITE)              # pillow
    # long hair spread over the pillow
    d.ellipse(R(120, 975, 300, 1060), fill=HAIR)
    d.polygon([P(140, 1010), P(70, 1060), P(95, 1095), P(190, 1060)], fill=HAIR)
    # legs (leggings) and sneakers
    d.rounded_rectangle(R(640, 990, 920, 1048), radius=w(28), fill=GRAPHITE)
    d.rounded_rectangle(R(900, 960, 965, 1050), radius=w(22), fill=WHITE)
    d.line((*P(912, 985), *P(955, 985)), fill=TURQ, width=w(6))
    # hips / bottom curve
    d.ellipse(R(560, 975, 700, 1058), fill=GRAPHITE)
    # torso: bare midriff with EMS pads + sports top with bust
    d.rounded_rectangle(R(430, 985, 600, 1055), radius=w(30), fill=SKIN)
    d.rounded_rectangle(R(305, 975, 470, 1058), radius=w(36), fill=TURQ)
    d.ellipse(R(360, 948, 455, 1012), fill=TURQ)                                          # bust
    pulse = abs(math.sin(t * math.pi * 2.5))
    for x in (450, 525):
        d.rounded_rectangle(R(x, 978, x + 62, 1006), radius=w(10), fill=WHITE)
        r = 26 + pulse * 34
        cx, cy = x + 31, 965
        d.arc(R(cx - r, cy - r, cx + r, cy + r), 205, 335, fill=CORAL, width=w(5))
    # head (face up), ponytail, lashes, lips, blush
    d.ellipse(R(205, 935, 330, 1060), fill=SKIN)
    d.pieslice(R(195, 925, 335, 1065), 110, 250, fill=HAIR)
    d.ellipse(R(160, 960, 215, 1015), fill=HAIR)                                          # bun on the pillow
    d.arc(R(262, 960, 300, 990), 20, 160, fill=GRAPHITE, width=w(4))                      # closed eye
    for k in range(3):
        a = math.radians(40 + k * 40)
        x0, y0 = 281 + math.cos(a) * 19, 975 + math.sin(a) * 15
        d.line((*P(x0, y0), *P(x0 + math.cos(a) * 9, y0 + math.sin(a) * 9)), fill=GRAPHITE, width=w(3))
    d.ellipse(R(292, 995, 316, 1012), fill=(244, 170, 160))                               # blush
    d.arc(R(300, 1015, 324, 1035), 200, 340, fill=LIPS, width=w(5))                       # smile
    # arm up, scrolling the phone
    d.line((*P(345, 985), *P(330, 900), *P(300, 860)), fill=SKIN, width=w(26), joint="curve")
    glow = int(150 + 60 * math.sin(t * 6))
    d.rounded_rectangle(R(250, 790, 320, 870), radius=w(12), fill=GRAPHITE)
    d.rounded_rectangle(R(257, 798, 313, 862), radius=w(8), fill=(glow, 235, 230))
    # side table with a smoothie
    d.rounded_rectangle(R(1000, 980, 1050, 1230), radius=w(10), fill=(200, 210, 212))
    d.rounded_rectangle(R(960, 960, 1090, 990), radius=w(12), fill=(200, 210, 212))
    d.polygon([P(990, 860), P(1060, 860), P(1050, 960), P(1000, 960)], fill=(250, 210, 200))
    d.line((*P(1035, 820), *P(1025, 900)), fill=TURQ_D, width=w(8))


# ------------------------------------------------------------------ silhouette for ДО / ПОСЛЕ
def silhouette(d, cx, top, h, p, fill, hair):
    """Front view of a girl. p=0: before (fuller), p=1: after (slimmer)."""
    b = 1 - p
    outer = [(0.00, 0.055), (0.03, 0.08), (0.07, 0.19 + 0.02 * b), (0.13, 0.19 + 0.03 * b), (0.20, 0.175 + 0.05 * b),
             (0.27, 0.13 + 0.08 * b), (0.33, 0.115 + 0.095 * b), (0.42, 0.19 + 0.07 * b), (0.50, 0.195 + 0.06 * b),
             (0.60, 0.165 + 0.05 * b), (0.74, 0.105 + 0.03 * b), (0.80, 0.095 + 0.02 * b), (0.95, 0.065), (1.00, 0.07)]
    inner = [(1.00, 0.02), (0.80, 0.022), (0.65, 0.012 * p), (0.55, 0.0)]
    right = [(cx + wv * h, top + yv * h) for yv, wv in outer] + [(cx + wv * h, top + yv * h) for yv, wv in inner]
    left = [(cx - x + cx, y) for x, y in reversed(right)]
    d.polygon(right + left, fill=fill)
    for sgn in (-1, 1):
        sx = cx + sgn * (0.185 + 0.02 * b) * h
        hx = cx + sgn * (0.25 + 0.07 * b) * h
        aw = (0.035 + 0.02 * b) * h
        d.polygon([(sx - aw, top + 0.08 * h), (sx + aw, top + 0.08 * h), (hx + aw * 0.6, top + 0.46 * h), (hx - aw * 0.6, top + 0.46 * h)], fill=fill)
    hr = 0.075 * h
    hy = top - 0.05 * h
    d.ellipse((cx - hr * 0.9, hy - hr, cx + hr * 0.9, hy + hr), fill=fill)
    d.ellipse((cx - hr * 0.55, hy - hr * 1.75, cx + hr * 0.55, hy - hr * 0.75), fill=hair)    # bun
    d.pieslice((cx - hr * 0.95, hy - hr * 1.05, cx + hr * 0.95, hy + hr * 0.9), 180, 360, fill=hair)


def sparkle(d, x, y, s, col):
    d.polygon([(x, y - s), (x + s * 0.25, y - s * 0.25), (x + s, y), (x + s * 0.25, y + s * 0.25),
               (x, y + s), (x - s * 0.25, y + s * 0.25), (x - s, y), (x - s * 0.25, y - s * 0.25)], fill=col)


# ------------------------------------------------------------------ scenes
def scene_me1(t):
    frame = BG_SAD.copy()
    d = ImageDraw.Draw(frame)
    text(d, (W / 2, 360), "Я:", font("InterDisplay-Black.otf", 110), GREY_TEXT)
    text(d, (W / 2, 480), "собираюсь в зал", font("InterDisplay-Bold.otf", 84), GREY_TEXT)
    text(d, (W / 2, 580), "третий месяц", font("InterDisplay-Bold.otf", 84), GREY_TEXT)
    period = 1.5
    k = min(int(t / period), 2)
    lt = t - k * period
    flip = 1.0
    if k < 2 and lt > period - 0.18:
        flip = max(0.02, (period - lt) / 0.18)
    elif k > 0 and lt < 0.18:
        flip = max(0.02, lt / 0.18)
    cx, cy, cw, ch = W / 2, 1040, 460, 500
    hh = ch * flip
    top = cy - ch / 2
    d.rounded_rectangle((cx - cw / 2 + 12, top + 18, cx + cw / 2 + 12, top + ch + 18), radius=36, fill=(196, 198, 204))
    d.rounded_rectangle((cx - cw / 2, top, cx + cw / 2, top + hh), radius=36, fill=WHITE)
    if hh > 120:
        d.rounded_rectangle((cx - cw / 2, top, cx + cw / 2, top + 120), radius=36, fill=CORAL)
        d.rectangle((cx - cw / 2, top + 80, cx + cw / 2, top + 120), fill=CORAL)
        d.text((cx, top + 62), MONTHS[k], font=font("Inter-SemiBold.otf", 46), fill=WHITE, anchor="mm")
    if hh > 330:
        d.text((cx, top + 270), "ПН", font=font("InterDisplay-Black.otf", 190), fill=GREY_TEXT, anchor="mm")
        d.text((cx, top + 420), "начну с понедельника", font=font("Inter-Regular.otf", 34), fill=(130, 134, 142), anchor="mm")
    for x in (cx - 120, cx + 120):
        d.rounded_rectangle((x - 14, top - 30, x + 14, top + 30), radius=14, fill=(150, 154, 160))
    by = 1540
    d.rounded_rectangle((W / 2 - 200, by - 14, W / 2 + 200, by + 14), radius=12, fill=(150, 154, 160))
    for x in (W / 2 - 200, W / 2 + 160):
        d.rounded_rectangle((x - 10, by - 70, x + 50, by + 70), radius=16, fill=(105, 110, 118))
    wx, wy = W / 2 + 230, by - 90
    for r in (30, 55, 80):
        d.arc((wx - r, wy - r, wx + r, wy + r), 90, 180, fill=(170, 174, 180), width=3)
    for ang in (95, 125, 155, 178):
        d.line((wx, wy, wx + math.cos(math.radians(ang)) * 85, wy + math.sin(math.radians(ang)) * 85), fill=(170, 174, 180), width=3)
    return frame


def scene_me2(t):
    lt = t - T_ME2
    frame = BG_BRAND.copy()
    d = ImageDraw.Draw(frame)
    s = 1 + 0.25 * max(0.0, 1 - lt / 0.2)
    text(d, (W / 2, 400), "Тоже я:", font("InterDisplay-Black.otf", int(130 * s)), GRAPHITE)
    a = ease((lt - 0.6) / 0.35)
    if a:
        lay, ld = layer()
        text(ld, (W / 2, 550), "лежу 30 минут —", font("InterDisplay-Medium.otf", 62), GRAPHITE)
        text(ld, (W / 2, 630), "а мышцы работают", font("InterDisplay-Bold.otf", 62), TURQ_D)
        frame.alpha_composite(with_alpha(lay, a))
    draw_girl_lying(ImageDraw.Draw(frame), lt, ox=-60, oy=160, s=1.0)
    flash = max(0.0, 1 - lt / 0.15)
    if flash:
        frame = Image.blend(frame, Image.new("RGBA", (W, H), WHITE + (255,)), flash * 0.8)
    return frame


BENEFITS = ["Без нагрузки", "Тонус мышц", "Лимфодренаж", "Подтянутая кожа"]


def scene_prod(t):
    lt = t - T_PROD
    frame = BG_BRAND.copy()
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 340 + dy), "Ленивый спорт", font("InterDisplay-Black.otf", 112), GRAPHITE)
    text(ld, (W / 2, 445 + dy), "30 минут · без нагрузки", font("InterDisplay-Medium.otf", 54), TURQ_D)
    frame.alpha_composite(with_alpha(lay, a))
    d = ImageDraw.Draw(frame)
    top, hgt = 650, 640
    # ДО
    a1, dy1 = pop(lt - 0.3)
    if a1:
        lay, ld = layer()
        silhouette(ld, 290, top + dy1, hgt, 0.0, (176, 196, 198), (130, 140, 142))
        ld.text((290, top + hgt + 70 + dy1), "ДО", font=font("InterDisplay-Black.otf", 64), fill=GREY_TEXT, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a1))
    # arrow
    a2 = ease((lt - 0.7) / 0.3)
    if a2:
        lay, ld = layer()
        y = top + hgt * 0.35
        ld.line((470, y, 590, y), fill=TURQ_D, width=12)
        ld.polygon([(590, y - 26), (630, y), (590, y + 26)], fill=TURQ_D)
        frame.alpha_composite(with_alpha(lay, a2))
    # ПОСЛЕ: morphs from the «before» shape to the slim one
    a3, dy3 = pop(lt - 0.7)
    if a3:
        p = ease((lt - 1.0) / 1.8)
        lay, ld = layer()
        col = tuple(int(c0 * (1 - p) + c1 * p) for c0, c1 in zip((176, 196, 198), TURQ))
        silhouette(ld, 800, top + dy3, hgt, p, col, HAIR if p > 0.5 else (130, 140, 142))
        ld.text((800, top + hgt + 70 + dy3), "ПОСЛЕ", font=font("InterDisplay-Black.otf", 64), fill=TURQ_D, anchor="mm")
        if p > 0.95:
            for k, (sx, sy) in enumerate([(690, top + 60), (930, top + 180), (905, top + 420)]):
                sparkle(ld, sx, sy, 22 + 8 * math.sin(lt * 8 + k), TURQ_D)
        frame.alpha_composite(with_alpha(lay, a3))
    # benefits, in sync with the voice
    for i, b in enumerate(BENEFITS):
        a4, dy4 = pop(lt - 1.4 - i * 1.0)
        if not a4:
            continue
        lay, ld = layer()
        col, row = i % 2, i // 2
        chip(ld, W / 2 + (col - 0.5) * 500, 1520 + row * 130 + dy4 * 0.6, b, size=44)
        frame.alpha_composite(with_alpha(lay, a4))
    return frame


def scene_cta(t):
    lt = t - T_CTA
    frame = BG_BRAND.copy()
    draw_girl_lying(ImageDraw.Draw(frame), lt, ox=170, oy=-80, s=0.7)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 1040 + dy), "Абонемент на месяц", font("InterDisplay-Black.otf", 88), GRAPHITE)
    text(ld, (W / 2, 1140 + dy), "можно заморозить на неделю", font("InterDisplay-Light.otf", 50), TURQ_D)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 1.3)
    if a2:
        lay, ld = layer()
        pulse = 1 + 0.03 * math.sin(lt * 6)
        bw, bh = 860 * pulse, 150 * pulse
        y = 1390 + dy2
        ld.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=TURQ)
        ld.text((W / 2, y - 18), "Напишите «ЛЕНЬ»", font=font("InterDisplay-Black.otf", 58), fill=GRAPHITE, anchor="mm")
        ld.text((W / 2, y + 38), "в директ", font=font("InterDisplay-Medium.otf", 40), fill=GRAPHITE, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a2))
    d = ImageDraw.Draw(frame)
    text(d, (W / 2, 1720), "Алматы · Аксай-1, 10/3 · аль-Фараби, 83", font("Inter-Medium.otf", 34), GRAPHITE)
    text(d, (W / 2, 1840), "демо-концепт ролика", font("Inter-Regular.otf", 28), (120, 150, 150))
    return frame


def render_frame(i):
    t = i / FPS
    if t < T_ME2:
        f = scene_me1(t)
    elif t < T_PROD:
        f = scene_me2(t)
    elif t < T_CTA:
        f = scene_prod(t)
        if t < T_PROD + 0.25:
            f = Image.blend(scene_me2(t), f, ease((t - T_PROD) / 0.25))
    else:
        f = scene_cta(t)
        if t < T_CTA + 0.25:
            f = Image.blend(scene_prod(t), f, ease((t - T_CTA) / 0.25))
    pin_logo(f)
    return f.convert("RGB")


SECS = (1.0, 6.5, 12.5, 15.5, 17.5)


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
    ff.stdin.close()
    ff.wait()
    wav.unlink()
    print("done", out)


if __name__ == "__main__":
    main()
