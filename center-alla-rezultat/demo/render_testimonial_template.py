"""Template for scenario 6 (client video testimonial).

Not a testimonial: every place where the real client footage goes is a marked
placeholder. Renders a layout video plus transparent PNG overlays for editing
the real footage in CapCut / Premiere.

Usage: python3 render_testimonial_template.py OUT.mp4 OVERLAY_DIR [--preview DIR [--preview-only]]
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
DUR = 30.0
N = int(FPS * DUR)
T_TITLE = 2.5
QUESTIONS = [(4.0, "Что вы пробовали", "до центра?"),
             (11.5, "Что было", "на первом визите?"),
             (19.0, "Что изменилось", "через месяц?")]
Q_CARD, ANSWER = 1.5, 6.0
T_CTA = 26.5
PLACEHOLDER_BG = gradient((58, 64, 70), (32, 36, 40))


def layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def pop(lt, dur=0.35):
    return ease(lt / dur), (1 - ease_out(lt / (dur + 0.1))) * 50


def dashed_rect(d, box, dash=40, gap=24, fill=(200, 205, 210), width=5):
    x0, y0, x1, y1 = box
    for x in np.arange(x0, x1, dash + gap):
        d.line((x, y0, min(x + dash, x1), y0), fill=fill, width=width)
        d.line((x, y1, min(x + dash, x1), y1), fill=fill, width=width)
    for y in np.arange(y0, y1, dash + gap):
        d.line((x0, y, x0, min(y + dash, y1)), fill=fill, width=width)
        d.line((x1, y, x1, min(y + dash, y1)), fill=fill, width=width)


def placeholder(t, label, hint):
    frame = PLACEHOLDER_BG.copy()
    d = ImageDraw.Draw(frame)
    dashed_rect(d, (60, 60, W - 60, H - 60))
    cx, cy = W / 2, 760
    d.rounded_rectangle((cx - 120, cy - 80, cx + 90, cy + 80), radius=24, outline=(200, 205, 210), width=8)
    d.polygon([(cx + 100, cy - 40), (cx + 170, cy - 80), (cx + 170, cy + 80), (cx + 100, cy + 40)], outline=(200, 205, 210), width=8)
    if int(t * 2) % 2 == 0:
        d.ellipse((cx - 95, cy - 55, cx - 65, cy - 25), fill=CORAL)
    text(d, (W / 2, 960), label, font("InterDisplay-Bold.otf", 64), (230, 232, 235))
    text(d, (W / 2, 1040), hint, font("InterDisplay-Light.otf", 42), (170, 176, 182))
    return frame


# ------------------------------------------------------------------ overlays (also exported as PNG)
def overlay_subtitle(sample="Субтитры: ответ клиентки"):
    lay, ld = layer()
    f = font("InterDisplay-Bold.otf", 58)
    tw = ld.textlength(sample, font=f)
    y = 1430
    ld.rounded_rectangle((W / 2 - tw / 2 - 40, y - 56, W / 2 + tw / 2 + 40, y + 56), radius=24, fill=(255, 255, 255, 235))
    ld.text((W / 2, y), sample, font=f, fill=TEAL_D, anchor="mm")
    return lay


def overlay_lower_third():
    lay, ld = layer()
    x0, y0 = 70, 1580
    ld.rounded_rectangle((x0, y0, x0 + 720, y0 + 150), radius=30, fill=TEAL + (240,))
    ld.rectangle((x0, y0, x0 + 16, y0 + 150), fill=MINT)
    ld.text((x0 + 50, y0 + 50), "Имя, возраст", font=font("InterDisplay-Bold.otf", 50), fill=WHITE, anchor="lm")
    ld.text((x0 + 50, y0 + 108), "клиентка центра · N недель", font=font("InterDisplay-Light.otf", 38), fill=MINT_L, anchor="lm")
    return lay


def overlay_question(i, l1, l2):
    lay, ld = layer()
    ld.rectangle((0, 0, W, H), fill=(0, 0, 0, 0))
    text(ld, (W / 2, 780), f"ВОПРОС {i + 1} / 3", font("Inter-SemiBold.otf", 40), TEAL, spacing=10)
    text(ld, (W / 2, 920), l1, font("InterDisplay-Black.otf", 104), TEAL)
    text(ld, (W / 2, 1040), l2, font("InterDisplay-Black.otf", 104), CORAL)
    return lay


def overlay_hook_quote():
    lay, ld = layer()
    ld.rounded_rectangle((90, 260, W - 90, 560), radius=40, fill=(255, 255, 255, 235))
    ld.text((125, 250), "«", font=font("InterDisplay-Black.otf", 110), fill=CORAL, anchor="lt")
    text(ld, (W / 2 + 50, 380), "Самая сильная фраза", font("InterDisplay-Bold.otf", 60), TEAL_D)
    text(ld, (W / 2 + 50, 460), "клиентки — первые 2 сек", font("InterDisplay-Light.otf", 50), TEAL_D)
    return lay


OV_SUB = overlay_subtitle()
OV_LOWER = overlay_lower_third()
OV_QUOTE = overlay_hook_quote()
OV_Q = [overlay_question(i, a, b) for i, (_, a, b) in enumerate(QUESTIONS)]


# ------------------------------------------------------------------ scenes
def scene_hook(t):
    frame = placeholder(t, "ВИДЕО КЛИЕНТКИ: ХУК", "самый эмоциональный момент отзыва")
    a, dy = pop(t - 0.2)
    frame.alpha_composite(with_alpha(OV_QUOTE, a), (0, int(dy)))
    return frame


def scene_title(t):
    lt = t - T_TITLE
    frame = BG_MINT.copy()
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 800 + dy), "«Я пыталась", font("InterDisplay-Black.otf", 110), TEAL)
    text(ld, (W / 2, 930 + dy), "худеть сама…»", font("InterDisplay-Black.otf", 110), TEAL)
    text(ld, (W / 2, 1060 + dy), "история клиентки центра", font("InterDisplay-Light.otf", 52), TEAL)
    frame.alpha_composite(with_alpha(lay, a))
    return frame


def scene_question(t, i):
    lt = t - QUESTIONS[i][0]
    frame = BG_MINT.copy()
    a, dy = pop(lt)
    frame.alpha_composite(with_alpha(OV_Q[i], a), (0, int(dy)))
    return frame


def scene_answer(t, i):
    lt = t - QUESTIONS[i][0] - Q_CARD
    frame = placeholder(t, f"ВИДЕО КЛИЕНТКИ: ОТВЕТ {i + 1}", f"до {int(ANSWER)} сек · говорящая голова, свет из окна")
    if i == 0:
        a, dy = pop(lt - 0.3)
        frame.alpha_composite(with_alpha(OV_LOWER, a), (int((1 - a) * -200), 0))
    a2, dy2 = pop(lt - 0.6)
    frame.alpha_composite(with_alpha(OV_SUB, a2), (0, int(dy2 * 0.5)))
    return frame


def scene_cta(t):
    lt = t - T_CTA
    frame = gradient((16, 92, 88), (6, 46, 44))
    a, dy = pop(lt)
    lay, ld = layer()
    text(ld, (W / 2, 640 + dy), "Хотите так же?", font("InterDisplay-Black.otf", 110), WHITE)
    text(ld, (W / 2, 770 + dy), "Начните с пробного визита", font("InterDisplay-Light.otf", 60), MINT)
    frame.alpha_composite(with_alpha(lay, a))
    a2, dy2 = pop(lt - 0.6)
    if a2:
        lay, ld = layer()
        pulse = 1 + 0.03 * math.sin(lt * 6)
        bw, bh = 820 * pulse, 140 * pulse
        y = 1020 + dy2
        ld.rounded_rectangle((W / 2 - bw / 2, y - bh / 2, W / 2 + bw / 2, y + bh / 2), radius=bh / 2, fill=MINT)
        ld.text((W / 2, y), "Запись в WhatsApp  →", font=font("InterDisplay-Bold.otf", 54), fill=TEAL_D, anchor="mm")
        frame.alpha_composite(with_alpha(lay, a2))
    d = ImageDraw.Draw(frame)
    text(d, (W / 2, 1760), "ЦЕНТР АЛЛЫ КАЗАНИНОЙ · АЛМАТЫ", font("Inter-Medium.otf", 30), MINT, spacing=5)
    text(d, (W / 2, 1840), "шаблон для съёмки отзыва", font("Inter-Regular.otf", 28), (150, 200, 195))
    return frame


def frame_at(t):
    if t < T_TITLE:
        return scene_hook(t)
    if t < QUESTIONS[0][0]:
        return scene_title(t)
    if t >= T_CTA:
        return scene_cta(t)
    i = max(k for k, q in enumerate(QUESTIONS) if q[0] <= t)
    if t < QUESTIONS[i][0] + Q_CARD:
        return scene_question(t, i)
    return scene_answer(t, i)


CUTS = [T_TITLE, QUESTIONS[0][0], T_CTA] + [q[0] for q in QUESTIONS[1:]] + [q[0] + Q_CARD for q in QUESTIONS]


def render_frame(i):
    t = i / FPS
    f = frame_at(t)
    for c in CUTS:
        if c <= t < c + 0.25:
            f = Image.blend(frame_at(c - 0.01), f, ease((t - c) / 0.25))
    return f.convert("RGB")


# ------------------------------------------------------------------ audio: soft piano bed
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
        sig = np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2 * f * x)
        out[s:s + ln] += sig * np.exp(-x * decay) * np.clip(x / 0.008, 0, 1) * gain

    chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
    t0, k = 0.0, 0
    while t0 < DUR - 0.5:
        ch = chords[(k // 8) % 4]
        if k % 4 == 0:
            note(ch[0] / 2, t0, 2.4, 0.2, 0.9)
        note(ch[k % 3] * 2, t0, 1.0, 0.06, 2.8)
        t0 += 0.5
        k += 1
    for q in QUESTIONS:
        note(1318.5, q[0], 1.5, 0.08, 3)
    out[-int(0.8 * sr):] *= np.linspace(1, 0, int(0.8 * sr))
    out /= np.abs(out).max() / 0.6
    st = np.stack([out, out], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def export_overlays(d):
    d.mkdir(parents=True, exist_ok=True)
    OV_SUB.save(d / "subtitle-bar.png")
    OV_LOWER.save(d / "lower-third-name.png")
    OV_QUOTE.save(d / "hook-quote.png")
    for i, ov in enumerate(OV_Q):
        card = BG_MINT.copy()
        card.alpha_composite(ov)
        card.convert("RGB").save(d / f"question-{i + 1}.png")
    scene_cta(T_CTA + 2.0).convert("RGB").save(d / "cta-card.png")


SECS = (1.5, 3.5, 4.8, 8.0, 27.5)


def main():
    out, ov_dir = Path(sys.argv[1]), Path(sys.argv[2])
    if "--preview" in sys.argv:
        pdir = Path(sys.argv[sys.argv.index("--preview") + 1])
        pdir.mkdir(parents=True, exist_ok=True)
        for sec in SECS:
            render_frame(int(sec * FPS)).save(pdir / f"f_{sec:04.1f}.png")
        if "--preview-only" in sys.argv:
            return
    export_overlays(ov_dir)
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
