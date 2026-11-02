"""Demo Reels ad (scenario 3: "Ленивый спорт", meme format).

Scene 1 "Я: собираюсь в зал третий месяц" (calendar of Mondays, dusty dumbbell),
record scratch, scene 2 "Тоже я:" (lying on the couch with EMS pads),
product card, CTA. Synthesized sad intro + bouncy beat.

Usage: python3 render_lazy_ad.py OUT.mp4 [--preview DIR [--preview-only]]
The end card is added afterwards with tools/add_outro.py.
"""
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from render_trial_ad import (BG_MINT, BG_TEAL, CORAL, MINT, MINT_L, SKIN, TEAL, TEAL_D, WHITE,  # noqa: E402
                             ease, ease_out, font, text, with_alpha)

W, H, FPS = 1080, 1920, 30
DUR = 14.5
N = int(FPS * DUR)
T_ME2, T_PROD, T_CTA = 3.6, 6.8, 10.6
GREY_BG = (226, 228, 232)
MONTHS = ["СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ"]


def layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


# ------------------------------------------------------------------ scene 1
def scene_me1(t):
    frame = Image.new("RGBA", (W, H), GREY_BG + (255,))
    d = ImageDraw.Draw(frame)
    a = ease(t / 0.3)
    text(d, (W / 2, 300), "Я:", font("InterDisplay-Black.otf", 110), (60, 64, 72))
    text(d, (W / 2, 430), "собираюсь в зал", font("InterDisplay-Bold.otf", 84), (60, 64, 72))
    text(d, (W / 2, 530), "третий месяц", font("InterDisplay-Bold.otf", 84), (60, 64, 72))
    # tear-off calendar flipping through Mondays
    period = 1.0
    k = min(int(t / period), 2)
    lt = t - k * period
    flip = 1.0
    if k < 2 and lt > period - 0.18:
        flip = max(0.02, (period - lt) / 0.18)
    elif k > 0 and lt < 0.18:
        flip = max(0.02, lt / 0.18)
    cx, cy, cw, ch = W / 2, 1000, 460, 500
    hh = ch * flip
    top = cy - ch / 2
    d.rounded_rectangle((cx - cw / 2 + 12, top + 18, cx + cw / 2 + 12, top + ch + 18), radius=36, fill=(200, 202, 208))
    d.rounded_rectangle((cx - cw / 2, top, cx + cw / 2, top + hh), radius=36, fill=WHITE)
    if hh > 120:
        d.rounded_rectangle((cx - cw / 2, top, cx + cw / 2, top + 120), radius=36, fill=CORAL)
        d.rectangle((cx - cw / 2, top + 80, cx + cw / 2, top + 120), fill=CORAL)
        d.text((cx, top + 62), MONTHS[k], font=font("Inter-SemiBold.otf", 46), fill=WHITE, anchor="mm")
    if hh > 330:
        d.text((cx, top + 270), "ПН", font=font("InterDisplay-Black.otf", 190), fill=(60, 64, 72), anchor="mm")
        d.text((cx, top + 420), "начну с понедельника", font=font("Inter-Regular.otf", 34), fill=(120, 124, 132), anchor="mm")
    for x in (cx - 120, cx + 120):
        d.rounded_rectangle((x - 14, top - 30, x + 14, top + 30), radius=14, fill=(150, 154, 160))
    # dusty dumbbell with a cobweb
    by = 1500
    d.rounded_rectangle((W / 2 - 200, by - 14, W / 2 + 200, by + 14), radius=12, fill=(150, 154, 160))
    for x in (W / 2 - 200, W / 2 + 160):
        d.rounded_rectangle((x - 10, by - 70, x + 50, by + 70), radius=16, fill=(105, 110, 118))
    wx, wy = W / 2 + 230, by - 90
    for r in (30, 55, 80):
        d.arc((wx - r, wy - r, wx + r, wy + r), 90, 180, fill=(170, 174, 180), width=3)
    for ang in (95, 125, 155, 178):
        d.line((wx, wy, wx + math.cos(math.radians(ang)) * 85, wy + math.sin(math.radians(ang)) * 85),
               fill=(170, 174, 180), width=3)
    if a < 1:
        frame = Image.blend(Image.new("RGBA", (W, H), GREY_BG + (255,)), frame, a)
    return frame


# ------------------------------------------------------------------ scene 2
def draw_lying_person(d, t, ox=0, oy=0, scale=1.0):
    def P(x, y):
        return (ox + x * scale, oy + y * scale)

    def R(x0, y0, x1, y1):
        return (*P(x0, y0), *P(x1, y1))

    # couch
    d.rounded_rectangle(R(110, 1060, 970, 1130), radius=int(30 * scale), fill=TEAL)
    for x in (170, 880):
        d.rounded_rectangle(R(x, 1120, x + 30, 1230), radius=int(12 * scale), fill=TEAL_D)
    d.rounded_rectangle(R(130, 1010, 330, 1070), radius=int(30 * scale), fill=WHITE)  # pillow
    # body
    d.rounded_rectangle(R(640, 985, 930, 1050), radius=int(30 * scale), fill=TEAL_D)      # legs
    d.ellipse(R(900, 950, 960, 1050), fill=WHITE)                                          # feet
    d.rounded_rectangle(R(300, 965, 670, 1060), radius=int(45 * scale), fill=MINT)        # torso
    d.ellipse(R(190, 930, 320, 1060), fill=SKIN)                                           # head
    d.pieslice(R(185, 925, 325, 1065), 95, 265, fill=(70, 50, 45))                         # hair
    d.rounded_rectangle(R(250, 938, 312, 962), radius=int(10 * scale), fill=(30, 30, 35))  # sunglasses
    d.arc(R(265, 968, 305, 1002), 20, 160, fill=(150, 80, 70), width=max(2, int(5 * scale)))  # smile
    # EMS pads with pulses
    pulse = abs(math.sin(t * math.pi * 2.5))
    for x in (400, 530):
        d.rounded_rectangle(R(x, 975, x + 90, 1015), radius=int(12 * scale), fill=WHITE)
        r = 30 + pulse * 40
        cx, cy = x + 45, 960
        d.arc(R(cx - r, cy - r, cx + r, cy + r), 200, 340, fill=CORAL, width=max(2, int(6 * scale)))
    # side table with a glass of water
    d.rounded_rectangle(R(1000, 980, 1050, 1230), radius=10, fill=(190, 200, 205))
    d.rounded_rectangle(R(960, 960, 1090, 990), radius=12, fill=(190, 200, 205))
    d.polygon([P(990, 860), P(1060, 860), P(1050, 960), P(1000, 960)], fill=(200, 235, 245))
    d.line((*P(1035, 830), *P(1025, 900)), fill=CORAL, width=int(8 * scale))


def scene_me2(t):
    lt = t - T_ME2
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    s = 1 + 0.25 * max(0.0, 1 - lt / 0.2)
    text(d, (W / 2, 360), "Тоже я:", font("InterDisplay-Black.otf", int(130 * s)), TEAL)
    a = ease((lt - 0.6) / 0.35)
    if a:
        lay, ld = layer()
        text(ld, (W / 2, 520), "лежу 30 минут —", font("InterDisplay-Medium.otf", 62), TEAL)
        text(ld, (W / 2, 600), "а мышцы работают", font("InterDisplay-Medium.otf", 62), TEAL)
        frame.alpha_composite(with_alpha(lay, a))
    draw_lying_person(d, lt, ox=-60, oy=120, scale=1.0)
    flash = max(0.0, 1 - lt / 0.15)
    if flash:
        frame = Image.blend(frame, Image.new("RGBA", (W, H), WHITE + (255,)), flash * 0.8)
    return frame


# ------------------------------------------------------------------ product
BENEFITS = ["Без нагрузки и пота", "Тонус мышц", "Лимфодренаж", "Подтянутая кожа"]


def scene_prod(t):
    lt = t - T_PROD
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    dy = (1 - ease_out(lt / 0.35)) * 60
    text(d, (W / 2, 300 + dy), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ", font("Inter-Medium.otf", 34), TEAL, spacing=7)
    text(d, (W / 2, 430 + dy), "Ленивый спорт", font("InterDisplay-Black.otf", 120), TEAL)
    # 30-minute ring
    cx, cy, r = W / 2, 820, 210
    p = ease(lt / 2.5)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=WHITE)
    d.arc((cx - r + 18, cy - r + 18, cx + r - 18, cy + r - 18), 0, 360, fill=MINT_L, width=26)
    if p > 0.005:
        d.arc((cx - r + 18, cy - r + 18, cx + r - 18, cy + r - 18), -90, -90 + 360 * p, fill=TEAL, width=26)
    mins = int(round(30 * p))
    d.text((cx, cy - 10), str(mins), font=font("InterDisplay-Black.otf", 150), fill=TEAL, anchor="mm")
    d.text((cx, cy + 85), "минут", font=font("InterDisplay-Light.otf", 46), fill=TEAL, anchor="mm")
    for i, b in enumerate(BENEFITS):
        a = ease((lt - 0.5 - i * 0.45) / 0.3)
        if not a:
            continue
        lay, ld = layer()
        y = 1170 + i * 110 + (1 - ease_out((lt - 0.5 - i * 0.45) / 0.35)) * 30
        ld.ellipse((230, y - 30, 290, y + 30), fill=TEAL)
        ld.line((245, y, 257, y + 13, 277, y - 13), fill=WHITE, width=7, joint="curve")
        ld.text((320, y), b, font=font("InterDisplay-Medium.otf", 56), fill=TEAL, anchor="lm")
        frame.alpha_composite(with_alpha(lay, a))
    return frame


# ------------------------------------------------------------------ CTA
def scene_cta(t):
    lt = t - T_CTA
    frame = BG_TEAL.copy()
    d = ImageDraw.Draw(frame)
    draw_lying_person(d, lt, ox=170, oy=-470, scale=0.7)
    a = ease(lt / 0.3)
    lay, ld = layer()
    text(ld, (W / 2, 900), "Абонемент на месяц", font("InterDisplay-Bold.otf", 84), WHITE)
    text(ld, (W / 2, 1000), "можно заморозить на неделю", font("InterDisplay-Light.otf", 48), MINT)
    frame.alpha_composite(with_alpha(lay, a))
    a2 = ease((lt - 0.6) / 0.35)
    if a2:
        lay, ld = layer()
        pulse = 1 + 0.03 * math.sin(lt * 6)
        bw, bh = 860 * pulse, 150 * pulse
        y = 1260 + (1 - ease_out((lt - 0.6) / 0.4)) * 40
        ld.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=MINT)
        ld.text((W / 2, y - 18), "Напишите «ЛЕНЬ»", font=font("InterDisplay-Black.otf", 58), fill=TEAL_D, anchor="mm")
        ld.text((W / 2, y + 38), "в директ", font=font("InterDisplay-Medium.otf", 40), fill=TEAL_D, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a2))
    text(d, (W / 2, 1830), "демо-концепт ролика", font("Inter-Regular.otf", 28), (150, 200, 195))
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
    return f.convert("RGB")


# ------------------------------------------------------------------ audio
def render_audio(path):
    sr = 44100
    n = int(sr * DUR)
    r = np.random.default_rng(5)
    out = np.zeros(n, np.float32)

    def add(sig, start, gain=1.0):
        s = int(start * sr)
        e = min(n, s + len(sig))
        if s < n:
            out[s:e] += sig[:e - s] * gain

    def tone(freq, dur, decay=3.0, harm=(1, 0.5, 0.25)):
        tt = np.arange(int(dur * sr)) / sr
        x = sum(a * np.sin(2 * np.pi * freq * (k + 1) * tt) for k, a in enumerate(harm))
        return x * np.exp(-tt * decay) * np.clip(tt / 0.01, 0, 1)

    # scene 1: slow, slightly sad keys
    for st, f in ((0.0, 220.0), (0.5, 261.63), (1.0, 196.0), (1.5, 233.08), (2.0, 174.61), (2.5, 207.65)):
        add(tone(f, 0.9, 2.5), st, 0.25)
        add(tone(f * 1.5, 0.9, 3.0), st + 0.02, 0.1)
    # "wah wah" sad trombone
    for k, (f0, st) in enumerate(((233.08, 2.75), (220.0, 3.0), (207.65, 3.25))):
        tt = np.arange(int(0.25 * sr)) / sr
        vib = np.sin(2 * np.pi * 6 * tt) * 3
        x = np.sin(2 * np.pi * np.cumsum(f0 + vib) / sr)
        x = np.tanh(3 * x) * np.exp(-tt * 3) * 0.25
        add(x, st)
    # record scratch
    ln = int(0.3 * sr)
    tt = np.arange(ln) / sr
    f = 900 * (1 - tt / tt[-1]) ** 2 + 120
    scratch = np.sin(2 * np.pi * np.cumsum(f) / sr) * 0.35 + r.standard_normal(ln) * 0.15
    add(scratch * np.exp(-tt * 4), T_ME2 - 0.12)

    # bouncy beat from T_ME2
    beat = 60 / 118

    def kick():
        tt = np.arange(int(0.3 * sr)) / sr
        fr = 50 + 100 * np.exp(-tt * 30)
        return np.sin(2 * np.pi * np.cumsum(fr) / sr) * np.exp(-tt * 9)

    def clap():
        ln = int(0.12 * sr)
        x = np.diff(np.concatenate([[0], r.standard_normal(ln)]))
        return x * np.exp(-np.arange(ln) / (ln / 5)) * 0.35

    def hat():
        ln = int(0.04 * sr)
        x = np.diff(np.concatenate([[0], r.standard_normal(ln)]))
        return x * np.exp(-np.arange(ln) / (ln / 6)) * 0.15

    melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46]
    bass_notes = [130.81, 130.81, 146.83, 146.83, 174.61, 174.61, 196.0, 196.0]
    t0 = T_ME2 + 0.05
    k = 0
    while t0 < DUR - 0.6:
        add(kick(), t0, 0.8)
        add(hat(), t0 + beat / 2)
        if k % 2 == 1:
            add(clap(), t0)
        add(tone(bass_notes[(k // 2) % 8], beat * 0.9, 5, (1, 0.6, 0.3)), t0, 0.22)
        add(tone(melody[k % 8], beat * 0.45, 7, (1, 0.3)), t0 + beat / 2, 0.09)
        t0 += beat
        k += 1
    out[-int(0.5 * sr):] *= np.linspace(1, 0, int(0.5 * sr))
    out /= np.abs(out).max() / 0.85
    st = np.stack([out, out], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


SECS = (1.5, 2.9, 4.6, 8.8, 12.4)


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
