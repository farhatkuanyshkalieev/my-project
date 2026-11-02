"""Demo Reels ad (scenario 5: postpartum recovery program for moms).

Warm motion graphics with a narrator addressing the mom ("Мама, полчаса —
только для себя"). Scene times follow moms-vo.mp3 (placed at +0.2 s).

Usage: python3 render_moms_ad.py OUT.mp4 [--preview DIR [--preview-only]]
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
from render_lazy_ad import draw_lying_person  # noqa: E402
from render_trial_ad import (BG_MINT, CORAL, MINT, MINT_L, TEAL, TEAL_D, WHITE,  # noqa: E402
                             ease, ease_out, font, gradient, text, with_alpha)

W, H, FPS = 1080, 1920, 30
DUR = 22.4
N = int(FPS * DUR)
VO_FILE = Path(__file__).with_name("moms-vo.mp3")
VO_OFFSET = 0.2
T_REST, T_NOGYM, T_PROG = 4.0, 11.4, 14.6
PINK = (246, 196, 196)
BG_WARM = gradient((253, 244, 240), (236, 214, 208))

CHIPS = [(7.17, "Тонус мышц"), (8.17, "Подтянутая кожа"), (9.59, "Коррекция фигуры")]


def layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def pop(lt, dur=0.35):
    return ease(lt / dur), (1 - ease_out(lt / (dur + 0.1))) * 50


def heart(d, cx, cy, r, fill):
    d.ellipse((cx - r, cy - r, cx, cy), fill=fill)
    d.ellipse((cx, cy - r, cx + r, cy), fill=fill)
    d.polygon([(cx - r * 0.97, cy - r * 0.35), (cx + r * 0.97, cy - r * 0.35), (cx, cy + r * 0.95)], fill=fill)


def stroller(d, cx, cy, s, t):
    rock = math.sin(t * 2.2) * 6 * s
    # basket
    d.pieslice((cx - 220 * s, cy - 230 * s + rock, cx + 220 * s, cy + 210 * s + rock), 0, 180, fill=MINT)
    d.rectangle((cx - 220 * s, cy - 12 * s + rock, cx + 220 * s, cy + 6 * s + rock), fill=MINT)
    # hood
    hx, hy, hr = cx - 30 * s, cy + rock, 190 * s
    d.pieslice((hx - hr, hy - hr, hx + hr, hy + hr), 180, 270, fill=TEAL)
    for k in range(3):
        a = math.radians(202 + k * 23)
        d.line((hx, hy, hx + math.cos(a) * hr, hy + math.sin(a) * hr), fill=TEAL_D, width=int(5 * s))
    # handle
    d.line((cx + 200 * s, cy + rock, cx + 300 * s, cy - 200 * s), fill=TEAL_D, width=int(16 * s))
    d.rounded_rectangle((cx + 270 * s, cy - 230 * s, cx + 350 * s, cy - 190 * s), radius=int(18 * s), fill=TEAL_D)
    # wheels
    for wx in (cx - 130 * s, cx + 130 * s):
        d.ellipse((wx - 62 * s, cy + 190 * s, wx + 62 * s, cy + 314 * s), fill=TEAL_D)
        d.ellipse((wx - 22 * s, cy + 230 * s, wx + 22 * s, cy + 274 * s), fill=MINT_L)
    d.line((cx - 130 * s, cy + 140 * s + rock, cx - 130 * s, cy + 200 * s), fill=TEAL_D, width=int(10 * s))
    d.line((cx + 130 * s, cy + 140 * s + rock, cx + 130 * s, cy + 200 * s), fill=TEAL_D, width=int(10 * s))


def floating_hearts(d, t, x0, y0, spread=260, n=6, rise=420):
    for k in range(n):
        p = (t * 0.35 + k / n) % 1
        x = x0 + math.sin(k * 2.1 + t) * spread * 0.5
        y = y0 - p * rise
        r = 22 + 10 * math.sin(k)
        a = math.sin(p * math.pi)
        col = tuple(int(c * a + 255 * (1 - a)) for c in CORAL)
        heart(d, x, y, r, col)


def scene_hook(t):
    frame = BG_WARM.copy()
    d = ImageDraw.Draw(frame)
    a, dy = pop(t - 0.2)
    lay, ld = layer()
    text(ld, (W / 2, 380 + dy), "Мама,", font("InterDisplay-Light.otf", 90), TEAL)
    text(ld, (W / 2, 520 + dy), "полчаса —", font("InterDisplay-Black.otf", 130), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(t - 2.05)
    if a2:
        lay, ld = layer()
        text(ld, (W / 2, 660 + dy2), "только для себя", font("InterDisplay-Bold.otf", 96), CORAL)
        frame.alpha_composite(with_alpha(lay, a2))
    d = ImageDraw.Draw(frame)
    stroller(d, W / 2 - 60, 1180, 1.0, t)
    floating_hearts(d, t, W / 2 - 60, 1000)
    return frame


def scene_rest(t):
    lt = t - T_REST
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    a, dy = pop(lt - 0.2)
    lay, ld = layer()
    text(ld, (W / 2, 330 + dy), "Вы отдыхаете —", font("InterDisplay-Bold.otf", 90), TEAL)
    text(ld, (W / 2, 440 + dy), "аппараты работают", font("InterDisplay-Light.otf", 72), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    d = ImageDraw.Draw(frame)
    draw_lying_person(d, lt, ox=-60, oy=-120, scale=1.0)
    floating_hearts(d, lt, 330, 800, spread=120, n=4, rise=220)
    for i, (t0, label) in enumerate(CHIPS):
        a, dy = pop(t - t0)
        if a <= 0:
            continue
        lay, ld = layer()
        f = font("InterDisplay-SemiBold.otf", 56)
        tw = ld.textlength(label, font=f)
        y = 1300 + i * 140 + dy
        ld.rounded_rectangle((W / 2 - tw / 2 - 110, y - 55, W / 2 + tw / 2 + 50, y + 55), radius=55, fill=WHITE)
        cx = W / 2 - tw / 2 - 55
        ld.ellipse((cx - 28, y - 28, cx + 28, y + 28), fill=TEAL)
        ld.line((cx - 13, y, cx - 3, y + 11, cx + 15, y - 11), fill=WHITE, width=6, joint="curve")
        ld.text((W / 2 - tw / 2, y), label, font=f, fill=TEAL, anchor="lm")
        frame.alpha_composite(with_alpha(lay, a))
    return frame


def scene_nogym(t):
    lt = t - T_NOGYM
    frame = BG_WARM.copy()
    d = ImageDraw.Draw(frame)
    # crossed dumbbell
    cy = 760
    d.rounded_rectangle((W / 2 - 230, cy - 18, W / 2 + 230, cy + 18), radius=16, fill=(170, 160, 160))
    for x in (W / 2 - 240, W / 2 + 180):
        d.rounded_rectangle((x, cy - 90, x + 60, cy + 90), radius=18, fill=(130, 120, 122))
    p = ease_out((lt - 0.3) / 0.4)
    if p > 0:
        d.line((W / 2 - 280, cy - 200, W / 2 - 280 + 560 * p, cy - 200 + 400 * p), fill=CORAL, width=26)
    a, dy = pop(lt - 0.1)
    lay, ld = layer()
    text(ld, (W / 2, 1150 + dy), "Без спортзала", font("InterDisplay-Black.otf", 112), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 1.2)
    if a2:
        lay, ld = layer()
        text(ld, (W / 2, 1290 + dy2), "и без нагрузки", font("InterDisplay-Light.otf", 90), TEAL)
        frame.alpha_composite(with_alpha(lay, a2))
    return frame


BG_PROG = gradient((16, 92, 88), (6, 46, 44))


def scene_prog(t):
    lt = t - T_PROG
    frame = BG_PROG.copy()
    d = ImageDraw.Draw(frame)
    stroller(d, W / 2 - 50, 470, 0.62, t)
    floating_hearts(d, t, W / 2 - 50, 380, spread=160, n=4)
    a, dy = pop(lt - 0.2)
    lay, ld = layer()
    text(ld, (W / 2, 840 + dy), "ПРОГРАММА", font("Inter-SemiBold.otf", 36), MINT, spacing=10)
    text(ld, (W / 2, 950 + dy), "Восстановление", font("InterDisplay-Black.otf", 110), WHITE)
    text(ld, (W / 2, 1070 + dy), "после родов", font("InterDisplay-Black.otf", 110), WHITE)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 2.3)
    if a2:
        lay, ld = layer()
        text(ld, (W / 2, 1210 + dy2), "для мам с малышами", font("InterDisplay-Light.otf", 56), MINT_L)
        text(ld, (W / 2, 1285 + dy2), "от 3 месяцев до 2 лет", font("InterDisplay-Medium.otf", 56), MINT_L)
        frame.alpha_composite(with_alpha(lay, a2))
    a3, dy3 = pop(lt - 5.8)
    if a3:
        lay, ld = layer()
        pulse = 1 + 0.03 * math.sin(lt * 6)
        bw, bh = 820 * pulse, 140 * pulse
        y = 1500 + dy3
        ld.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=MINT)
        ld.text((W / 2, y), "Запись в WhatsApp  →", font=font("InterDisplay-Bold.otf", 54), fill=TEAL_D, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a3))
    d = ImageDraw.Draw(frame)
    text(d, (W / 2, 1760), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ · АЛМАТЫ", font("Inter-Medium.otf", 30), MINT, spacing=5)
    text(d, (W / 2, 1840), "демо-концепт ролика", font("Inter-Regular.otf", 28), (150, 200, 195))
    return frame


SCENES = [(0.0, scene_hook), (T_REST, scene_rest), (T_NOGYM, scene_nogym), (T_PROG, scene_prog)]


def render_frame(i):
    t = i / FPS
    idx = max(k for k, (st, _) in enumerate(SCENES) if st <= t)
    st, fn = SCENES[idx]
    f = fn(t)
    if idx > 0 and t < st + 0.3:
        f = Image.blend(SCENES[idx - 1][1](t), f, ease((t - st) / 0.3))
    return f.convert("RGB")


# ------------------------------------------------------------------ audio
def render_audio(path):
    sr = 44100
    n = int(sr * DUR)
    out = np.zeros(n, np.float32)

    def note(f, start, dur, gain, decay=2.0):
        s = int(start * sr)
        ln = min(int(dur * sr), n - s)
        if ln <= 0:
            return
        x = np.arange(ln) / sr
        sig = np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2 * f * x) + 0.08 * np.sin(2 * np.pi * 3 * f * x)
        out[s:s + ln] += sig * np.exp(-x * decay) * np.clip(x / 0.008, 0, 1) * gain

    # gentle lullaby-like music box in 3/4, I-vi-IV-V
    chords = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]]
    melody = [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.0, 523.25, 587.33]
    beat = 0.42
    t0, k = 0.0, 0
    while t0 < DUR - 0.5:
        ch = chords[(k // 6) % 4]
        if k % 3 == 0:
            note(ch[0] / 2, t0, 1.6, 0.18, 1.2)
        note(ch[(k % 3)] , t0, 0.8, 0.07, 3.0)
        if k % 2 == 0:
            note(melody[(k // 2) % len(melody)] * 2, t0, 0.9, 0.06, 3.5)
        t0 += beat
        k += 1
    out[-int(0.8 * sr):] *= np.linspace(1, 0, int(0.8 * sr))
    out /= np.abs(out).max() / 0.85

    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(VO_FILE), "-ac", "1", "-ar", str(sr),
                                   "-f", "f32le", "-"])
    src = np.frombuffer(raw, np.float32)
    vo = np.zeros_like(out)
    a = int(VO_OFFSET * sr)
    b = min(n, a + len(src))
    vo[a:b] = src[:b - a]
    env = np.sqrt(np.convolve(vo ** 2, np.ones(int(0.05 * sr)) / int(0.05 * sr), mode="same"))
    k = int(0.25 * sr)
    active = np.convolve((env > 0.01).astype(np.float32), np.ones(k) / k, mode="same")
    duck = 1 - 0.55 * np.clip(active * 1.5, 0, 1)
    vo *= 0.9 / (np.abs(vo).max() + 1e-6)
    mix = out * 0.5 * duck + vo
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    st = np.stack([mix, mix], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


SECS = (3.2, 9.8, 13.5, 17.5, 21.5)


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
