"""Demo Reels ad (scenario 4: founder story, kinetic typography + narrator).

The narrator speaks in the third person ("Ей говорили…"); the real ad would be
Alla on camera. Scene times follow founder-story-vo.mp3 (placed at +0.2 s).

Usage: python3 render_founder_ad.py OUT.mp4 [--preview DIR [--preview-only]]
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
from render_trial_ad import (BG_MINT, CORAL, MINT, MINT_L, TEAL, TEAL_D, WHITE,  # noqa: E402
                             ease, ease_out, font, gradient, text, with_alpha)

W, H, FPS = 1080, 1920, 30
DUR = 31.2
N = int(FPS * DUR)
VO_FILE = Path(__file__).with_name("founder-story-vo.mp3")
VO_OFFSET = 0.2
T_STORY, T_PATH, T_TODAY, T_CTA = 7.2, 13.8, 21.5, 26.7
BG_DARK = gradient((22, 30, 34), (8, 12, 14))

QUOTES = [(0.2, "Ей говорили:", "InterDisplay-Light.otf", 64, (200, 210, 212)),
          (1.5, "«Это невозможно»", "InterDisplay-Black.otf", 96, WHITE),
          (2.95, "«Враньё»", "InterDisplay-Black.otf", 96, WHITE),
          (4.15, "«Уколы или операция»", "InterDisplay-Black.otf", 84, WHITE)]
T_STRIKE = 5.9


def layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def pop(lt, dur=0.35):
    return ease(lt / dur), (1 - ease_out(lt / (dur + 0.1))) * 50


def scene_quotes(t):
    frame = BG_DARK.copy()
    for i, (t0, s, fname, size, col) in enumerate(QUOTES):
        a, dy = pop(t - t0)
        if a <= 0:
            continue
        lay, ld = layer()
        y = 620 + i * 190 + dy
        f = font(fname, size)
        text(ld, (W / 2, y), s, f, col)
        if i > 0:
            p = ease_out((t - T_STRIKE - (i - 1) * 0.18) / 0.35)
            if p > 0:
                tw = ld.textlength(s, font=f)
                x0 = W / 2 - tw / 2 - 20
                ld.line((x0, y + 4, x0 + (tw + 40) * p, y + 4), fill=CORAL, width=12)
        frame.alpha_composite(with_alpha(lay, a))
    return frame


def scene_story(t):
    lt = t - T_STORY
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 330 + dy), "Но", font("InterDisplay-Light.otf", 70), TEAL)
    text(ld, (W / 2, 450 + dy), "Алла Казанина", font("InterDisplay-Black.otf", 110), TEAL)
    text(ld, (W / 2, 560 + dy), "основатель центра, нутрициолог", font("InterDisplay-Light.otf", 46), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    # weight counter 128 -> 57
    p = ease((lt - 2.2) / 3.0)
    kg = int(round(128 - 71 * p))
    a2, dy2 = pop(lt - 1.2)
    if a2:
        lay, ld = layer()
        ld.text((W / 2 + 40, 900 + dy2), str(kg), font=font("InterDisplay-Black.otf", 300), fill=TEAL, anchor="rm")
        ld.text((W / 2 + 70, 960 + dy2), "кг", font=font("InterDisplay-Light.otf", 110), fill=TEAL, anchor="lm")
        # scale bar
        bx0, bx1, by = 170, W - 170, 1130 + dy2
        ld.rounded_rectangle((bx0, by - 14, bx1, by + 14), radius=14, fill=WHITE)
        fill_w = (bx1 - bx0) * (kg / 128)
        ld.rounded_rectangle((bx0, by - 14, bx0 + fill_w, by + 14), radius=14, fill=TEAL)
        frame.alpha_composite(with_alpha(lay, a2))
    a3 = ease((lt - 5.6) / 0.3)
    if a3:
        lay, ld = layer()
        s = 1 + 0.2 * max(0.0, 1 - (lt - 5.6) / 0.25)
        f = font("InterDisplay-Black.otf", int(96 * s))
        label = "−71 кг"
        tw = ld.textlength(label, font=f)
        y = 1370
        ld.rounded_rectangle((W / 2 - tw / 2 - 60, y - 80 * s, W / 2 + tw / 2 + 60, y + 80 * s), radius=int(80 * s), fill=CORAL)
        ld.text((W / 2, y), label, font=f, fill=WHITE, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a3))
    return frame


PATH = [(0.1, "Медицинское образование", None),
        (2.9, "Диетолог-нутрициолог", None),
        (4.3, "Своя методика", "аппараты · питание · психология")]


def scene_path(t):
    lt = t - T_PATH
    frame = BG_MINT.copy()
    d = ImageDraw.Draw(frame)
    text(d, (W / 2, 330), "ЕЁ ПУТЬ", font("Inter-SemiBold.otf", 38), TEAL, spacing=10)
    # vertical timeline
    x = 230
    top, bot = 520, 1450
    prog = ease((lt - 0.1) / 5.0)
    d.line((x, top, x, bot), fill=WHITE, width=10)
    d.line((x, top, x, top + (bot - top) * prog), fill=TEAL, width=10)
    for i, (t0, title, sub) in enumerate(PATH):
        a, dy = pop(lt - t0)
        y = top + i * 400
        if a <= 0:
            d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=WHITE)
            continue
        lay, ld = layer()
        ld.ellipse((x - 34, y - 34, x + 34, y + 34), fill=TEAL)
        ld.ellipse((x - 14, y - 14, x + 14, y + 14), fill=MINT)
        ld.rounded_rectangle((290, y - 90 + dy, W - 70, y + (110 if sub else 90) + dy), radius=40, fill=WHITE)
        ld.text((335, y - (22 if sub else 0) + dy), title, font=font("InterDisplay-Bold.otf", 48), fill=TEAL, anchor="lm")
        if sub:
            ld.text((335, y + 50 + dy), sub, font=font("InterDisplay-Light.otf", 40), fill=TEAL, anchor="lm")
        frame.alpha_composite(with_alpha(lay, a))
    return frame


STATS = [(0.2, "2017", "год основания"), (1.5, "3", "центра в Алматы"), (2.7, "20+", "центров в СНГ")]


def scene_today(t):
    lt = t - T_TODAY
    frame = BG_TODAY.copy()
    d = ImageDraw.Draw(frame)
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 340 + dy), "Сегодня", font("InterDisplay-Black.otf", 120), WHITE)
    text(ld, (W / 2, 450 + dy), "по её методике работают", font("InterDisplay-Light.otf", 52), MINT)
    frame.alpha_composite(with_alpha(lay, a))
    for i, (t0, big, small) in enumerate(STATS):
        a, dy = pop(lt - t0)
        if a <= 0:
            continue
        lay, ld = layer()
        y = 700 + i * 330 + dy
        ld.rounded_rectangle((120, y - 130, W - 120, y + 130), radius=50, fill=(255, 255, 255, 30), outline=MINT, width=4)
        ld.text((200, y), big, font=font("InterDisplay-Black.otf", 140), fill=WHITE, anchor="lm")
        tw = ld.textlength(big, font=font("InterDisplay-Black.otf", 140))
        ld.text((240 + tw, y + 10), small, font=font("InterDisplay-Light.otf", 50), fill=MINT_L, anchor="lm")
        frame.alpha_composite(with_alpha(lay, a))
    return frame


BG_TODAY = gradient((16, 92, 88), (6, 46, 44))


def scene_cta(t):
    lt = t - T_CTA
    frame = BG_MINT.copy()
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 420 + dy), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ · АЛМАТЫ", font("Inter-Medium.otf", 32), TEAL, spacing=5)
    text(ld, (W / 2, 640 + dy), "Начните свой путь", font("InterDisplay-Black.otf", 104), TEAL)
    text(ld, (W / 2, 770 + dy), "с первого визита", font("InterDisplay-Light.otf", 80), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 2.0)
    if a2:
        lay, ld = layer()
        pulse = 1 + 0.03 * math.sin(lt * 6)
        bw, bh = 820 * pulse, 140 * pulse
        y = 1080 + dy2
        ld.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=TEAL)
        ld.text((W / 2, y), "Запись в WhatsApp  →", font=font("InterDisplay-SemiBold.otf", 54), fill=WHITE, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a2))
    d = ImageDraw.Draw(frame)
    text(d, (W / 2, 1830), "демо-концепт ролика", font("Inter-Regular.otf", 28), (40, 90, 88, 170))
    return frame


SCENES = [(0.0, scene_quotes), (T_STORY, scene_story), (T_PATH, scene_path), (T_TODAY, scene_today), (T_CTA, scene_cta)]


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
    tt = np.arange(n) / sr
    out = np.zeros(n, np.float32)

    def note(f, start, dur, gain, decay=1.6):
        s = int(start * sr)
        ln = min(int(dur * sr), n - s)
        if ln <= 0:
            return
        x = np.arange(ln) / sr
        sig = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 2 * f * x) + 0.12 * np.sin(2 * np.pi * 3 * f * x))
        out[s:s + ln] += sig * np.exp(-x * decay) * np.clip(x / 0.01, 0, 1) * gain

    # tense minor intro (A minor arpeggio), then major from the story onwards
    for k in range(int(T_STORY / 0.6)):
        note([220.0, 261.63, 329.63, 261.63][k % 4], k * 0.6, 1.2, 0.18, 2.5)
    note(110.0, 0.0, 6.0, 0.25, 0.4)
    prog = [(T_STORY, [261.63, 329.63, 392.0]), (T_STORY + 3.3, [220.0, 277.18, 329.63]),
            (T_PATH, [174.61, 220.0, 261.63]), (T_PATH + 3.8, [196.0, 246.94, 293.66]),
            (T_TODAY, [261.63, 329.63, 392.0]), (T_CTA, [174.61, 220.0, 261.63, 329.63])]
    for i, (st, chord) in enumerate(prog):
        end = prog[i + 1][0] if i + 1 < len(prog) else DUR
        for f in chord:
            note(f / 2, st, end - st + 0.5, 0.12, 0.35)
        k = 0
        t0 = st
        while t0 < end - 0.1:
            note(chord[k % len(chord)] * 2, t0, 0.8, 0.07, 3.0)
            t0 += 0.45
            k += 1
    # soft pulse in the "today" part
    t0 = T_TODAY
    while t0 < DUR - 0.5:
        x = np.arange(int(0.25 * sr)) / sr
        kick = np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-x * 30)) / sr) * np.exp(-x * 10) * 0.35
        s = int(t0 * sr)
        out[s:s + len(kick)] += kick[:max(0, n - s)]
        t0 += 0.6
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
    duck = 1 - 0.6 * np.clip(active * 1.5, 0, 1)
    vo *= 0.9 / (np.abs(vo).max() + 1e-6)
    mix = out * 0.5 * duck + vo
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    st = np.stack([mix, mix], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


SECS = (5.0, 6.6, 10.5, 13.5, 19.5, 25.0, 30.0)


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
