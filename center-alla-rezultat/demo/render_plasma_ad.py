"""Demo Reels ad (scenario 2: cold plasma ASMR) for the content pitch.

Procedural motion graphics: macro "skin", plasma probe with arcs and glow,
brand-coloured text cards, synthesized crackle/hum/pad soundtrack.

Usage: python3 render_plasma_ad.py OUT.mp4 [--preview DIR]
"""
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 18
N = FPS * DUR
HW, HH = W // 2, H // 2
FONT_DIR = "/usr/share/fonts/opentype/inter/"

TEAL = (11, 75, 72)
MINT_TOP = np.array([236, 249, 247], np.float32)
MINT_BOT = np.array([150, 220, 211], np.float32)

rng = np.random.default_rng(7)


def font(name, size):
    return ImageFont.truetype(FONT_DIR + name, size)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def window(t, a, b, fi=0.45, fo=0.45):
    if t < a or t > b:
        return 0.0
    return min(ease((t - a) / fi), ease((b - t) / fo))


# ---------------------------------------------------------------- textures
def noise(w, h, blur, seed):
    r = np.random.default_rng(seed).random((h, w)).astype(np.float32)
    im = Image.fromarray((r * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(im).astype(np.float32)
    return (a - a.mean()) / (a.std() + 1e-6)


def make_skin():
    sw, sh = 1500, 2600
    n1, n2, n3 = noise(sw, sh, 0.9, 1), noise(sw, sh, 3, 2), noise(sw, sh, 60, 3)
    lum = 1 + 0.012 * n2 + 0.025 * n3 + 0.01 * n1
    lum -= 0.14 * np.clip(n1 - 2.3, 0, None)          # pores
    base = np.array([232, 184, 160], np.float32)
    return Image.fromarray(np.clip(base * lum[..., None], 0, 255).astype(np.uint8))


SKIN = make_skin()
yy, xx = np.mgrid[0:HH, 0:HW].astype(np.float32)
fy, fx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGNETTE = np.clip(1.15 - 0.9 * (((fx - W / 2) / W) ** 2 + ((fy - H / 2) / H) ** 2) * 2.2, 0.25, 1)[..., None]

grad = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
MINT = MINT_TOP * (1 - grad) + MINT_BOT * grad
# soft floating orbs on the mint background
ORBS = []
for i in range(5):
    ORBS.append((rng.uniform(0.1, 0.9) * W, rng.uniform(0.1, 0.9) * H, rng.uniform(180, 380), rng.uniform(0, 6.28)))

# ---------------------------------------------------------------- text layers
def text_layer(lines, shadow=True):
    """lines: list of (text, font, fill, y, letter_spacing). Returns (rgba ndarray crop, x0, y0)."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for text, f, fill, y, ls in lines:
        if ls:
            widths = [d.textlength(c, font=f) + ls for c in text]
            x = (W - sum(widths) + ls) / 2
            for c, cw in zip(text, widths):
                d.text((x, y), c, font=f, fill=fill)
                x += cw
        else:
            tw = d.textlength(text, font=f)
            d.text(((W - tw) / 2, y), text, font=f, fill=fill)
    if shadow:
        a = im.split()[3].filter(ImageFilter.GaussianBlur(10))
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh.putalpha(a.point(lambda v: int(v * 0.55)))
        sh.alpha_composite(im)
        im = sh
    x0, y0, x1, y1 = im.getbbox()
    arr = np.asarray(im.crop((x0, y0, x1, y1))).astype(np.float32) / 255
    return arr, x0, y0


def comp(frame, layer, alpha, dy=0):
    if alpha <= 0:
        return
    arr, x0, y0 = layer
    y0 = int(y0 + dy)
    h, w = arr.shape[:2]
    y_a, y_b = max(y0, 0), min(y0 + h, H)
    if y_b <= y_a:
        return
    sub = arr[y_a - y0:y_b - y0]
    a = sub[..., 3:4] * alpha
    region = frame[y_a:y_b, x0:x0 + w]
    region[:] = region * (1 - a) + sub[..., :3] * 255 * a


WHITE = (255, 255, 255, 255)
T_HOOK = text_layer([("Звук, после которого", font("InterDisplay-Bold.otf", 84), WHITE, 300, 0),
                     ("кожа сияет", font("InterDisplay-Bold.otf", 84), WHITE, 400, 0)])
T_PLASMA = text_layer([("Холодная плазма", font("InterDisplay-Bold.otf", 98), WHITE, 270, 0)])
T_PLASMA2 = text_layer([("кислород и обновление кожи", font("InterDisplay-Light.otf", 54), WHITE, 400, 0)])
T_SUB = text_layer([("ХОЛОДНАЯ ПЛАЗМА", font("Inter-Medium.otf", 40), TEAL + (255,), 640, 8)], shadow=False)
T_NO1 = text_layer([("Без уколов.", font("InterDisplay-Bold.otf", 120), TEAL + (255,), 760, 0)], shadow=False)
T_NO2 = text_layer([("Без операций.", font("InterDisplay-Bold.otf", 120), TEAL + (255,), 920, 0)], shadow=False)
T_BRAND = text_layer([("ЦЕНТР АЛЛЫ КАЗАНИНОЙ · АЛМАТЫ", font("Inter-Medium.otf", 34), TEAL + (255,), 470, 6)], shadow=False)
T_TITLE = text_layer([("NEO PLASMA", font("InterDisplay-Black.otf", 132), TEAL + (255,), 640, 4)], shadow=False)
T_TAG = text_layer([("Лицо без операций и уколов", font("InterDisplay-Light.otf", 56), TEAL + (255,), 860, 0)], shadow=False)
T_DEMO = text_layer([("демо-концепт ролика", font("Inter-Regular.otf", 28), (40, 90, 88, 170), 1830, 0)], shadow=False)


def cta_layer():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = font("InterDisplay-SemiBold.otf", 54)
    label = "Запись в WhatsApp  →"
    tw = d.textlength(label, font=f)
    bw, bh = tw + 140, 132
    x0, y0 = (W - bw) / 2, 1240
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=bh / 2, fill=TEAL + (255,))
    d.text(((W - tw) / 2, y0 + 30), label, font=f, fill=WHITE)
    bx0, by0, bx1, by1 = im.getbbox()
    return np.asarray(im.crop((bx0, by0, bx1, by1))).astype(np.float32) / 255, bx0, by0


T_CTA = cta_layer()

TOP_SHADE = np.clip(1 - fy / (H * 0.38), 0, 1)[..., None] ** 1.5 * 0.55

# ---------------------------------------------------------------- plasma
PARTS = np.column_stack([rng.uniform(-1, 1, 90), rng.uniform(0, 1, 90), rng.uniform(0.3, 1, 90)])


def probe_tip(t):
    if t < 3.2:
        return W * 0.5, H * 0.58
    p = (t - 3.2) / 7.0
    return W * (0.5 + 0.22 * math.sin(p * 2.6 * math.pi / 2 + 0.0) * min(1, (t - 3.2) / 0.8)), \
        H * (0.58 + 0.06 * math.sin(p * 3.1 * math.pi))


def draw_probe(frame, px, py):
    """Stylised white handpiece coming from the upper right."""
    ang = math.radians(-28)
    ux, uy = math.cos(ang), math.sin(ang)        # along body (up-right)
    nx, ny = -uy, ux                             # normal
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def pt(s, r):
        return (px + ux * s + nx * r, py + uy * s + ny * r)

    d.polygon([pt(10, -7), pt(140, -30), pt(140, 30), pt(10, 7)], fill=(205, 210, 216, 255))
    d.polygon([pt(140, -44), pt(1900, -52), pt(1900, 52), pt(140, 44)], fill=(232, 236, 239, 255))
    d.polygon([pt(140, -44), pt(1900, -52), pt(1900, -34), pt(140, -30)], fill=(250, 252, 253, 255))
    d.polygon([pt(140, 30), pt(1900, 36), pt(1900, 52), pt(140, 44)], fill=(178, 186, 194, 255))
    d.polygon([pt(150, -46), pt(170, -46), pt(170, 46), pt(150, 46)], fill=(127, 216, 207, 255))  # mint ring
    d.polygon([pt(2, -4), pt(14, -9), pt(14, 9), pt(2, 4)], fill=(120, 126, 140, 255))
    arr = np.asarray(im).astype(np.float32) / 255
    a = arr[..., 3:4]
    frame[:] = frame * (1 - a) + arr[..., :3] * 255 * a


def plasma_layer(px, py, inten, t, frame_idx):
    hx, hy = px / 2, py / 2
    d = np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2)
    flick = 1 + 0.18 * math.sin(t * 53) + 0.12 * math.sin(t * 31.7 + 1) + 0.08 * rng.standard_normal()
    core = np.exp(-(d / 5) ** 2)
    h1 = np.exp(-d / (16 * flick)) * 0.9
    h2 = np.exp(-d / 70) * 0.35
    rgb = (core[..., None] * np.array([255, 250, 255]) +
           h1[..., None] * np.array([170, 120, 255]) +
           h2[..., None] * np.array([80, 120, 255])) * inten

    arc = Image.new("L", (HW, HH), 0)
    ad = ImageDraw.Draw(arc)
    r = np.random.default_rng(frame_idx * 31 + 5)
    for _ in range(6):
        a0 = r.uniform(0.15, 2.95)                 # mostly downward / sideways
        length = r.uniform(16, 46)
        pts = [(hx, hy)]
        for k in range(1, 7):
            s = length * k / 6
            j = r.normal(0, 3.2)
            pts.append((hx + math.cos(a0) * s - math.sin(a0) * j, hy + math.sin(a0) * s + math.cos(a0) * j))
        ad.line(pts, fill=int(110 * inten), width=3)
        ad.line(pts, fill=int(255 * inten), width=1)
    # particles
    for i, (ox, oy, sp) in enumerate(PARTS):
        life = (oy + t * 0.35 * sp) % 1.0
        x = hx + ox * 70 * (0.3 + life)
        y = hy - life * 160 + 20
        b = int(200 * inten * (1 - life) * sp)
        if b > 8:
            ad.ellipse((x - 1.2, y - 1.2, x + 1.2, y + 1.2), fill=b)
    arc_sharp = np.asarray(arc.filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    arc_glow = np.asarray(arc.filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    rgb += arc_sharp[..., None] * np.array([240, 230, 255]) + arc_glow[..., None] * np.array([150, 110, 255]) * 1.6
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    return np.asarray(img).astype(np.float32)


# ---------------------------------------------------------------- scenes
def scene_dark(t, i):
    base = np.zeros((H, W, 3), np.float32) + np.array([6, 7, 14], np.float32)
    px, py = probe_tip(t)
    inten = ease((t - 0.25) / 0.6)
    draw_probe(base, px, py)
    if inten > 0:
        base += plasma_layer(px, py, inten, t, i)
    return base


def scene_skin(t, i):
    p = (t - 3.0) / 7.2
    k = 1.32 - 0.16 * p                          # slow push-in
    cw, ch = W * k, H * k
    cx = SKIN.width / 2 + 60 * math.sin(p * 2)
    cy = SKIN.height / 2 - 80 * p
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    skin = np.asarray(SKIN.resize((W, H), Image.BILINEAR, box=box)).astype(np.float32)
    px, py = probe_tip(t)
    dist = np.sqrt((fx - px) ** 2 + (fy - py) ** 2)[..., None]
    light = 0.55 + 0.7 * np.exp(-dist / 450)
    tint = np.exp(-dist / 260) * np.array([40, 10, 90], np.float32)
    frame = skin * light * VIGNETTE + tint
    # shadow of the probe on skin
    draw_probe(frame, px, py)
    frame += plasma_layer(px, py, 1.0, t, i)
    frame = frame * (1 - TOP_SHADE)
    return frame


def scene_mint(t):
    frame = MINT.copy()
    for ox, oy, r, ph in ORBS:
        x = ox + 40 * math.sin(t * 0.6 + ph)
        y = oy + 50 * math.cos(t * 0.5 + ph)
        g = np.exp(-((fx[::4, ::4] - x) ** 2 + (fy[::4, ::4] - y) ** 2) / (2 * r * r))
        g = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255
        frame = frame * (1 - 0.35 * g[..., None]) + 255 * 0.35 * g[..., None]
    return frame


def render_frame(i):
    t = i / FPS
    if t < 3.0:
        frame = scene_dark(t, i)
    elif t < 3.5:
        a = ease((t - 3.0) / 0.5)
        frame = scene_dark(t, i) * (1 - a) + scene_skin(t, i) * a
    elif t < 10.2:
        frame = scene_skin(t, i)
    elif t < 10.8:
        a = ease((t - 10.2) / 0.6)
        frame = scene_skin(t, i) * (1 - a) + scene_mint(t) * a
    else:
        frame = scene_mint(t)

    a = window(t, 0.7, 3.1); comp(frame, T_HOOK, a, (1 - ease((t - 0.7) / 0.5)) * 30)
    a = window(t, 3.6, 9.9); comp(frame, T_PLASMA, a, (1 - ease((t - 3.6) / 0.5)) * 30)
    a = window(t, 4.2, 9.9); comp(frame, T_PLASMA2, a, (1 - ease((t - 4.2) / 0.5)) * 30)
    a = window(t, 10.7, 13.9); comp(frame, T_SUB, a)
    a = window(t, 11.0, 13.9); comp(frame, T_NO1, a, (1 - ease((t - 11.0) / 0.4)) * 40)
    a = window(t, 12.0, 13.9); comp(frame, T_NO2, a, (1 - ease((t - 12.0) / 0.4)) * 40)
    a = window(t, 14.1, 18.5); comp(frame, T_BRAND, a)
    a = window(t, 14.3, 18.5); comp(frame, T_TITLE, a, (1 - ease((t - 14.3) / 0.5)) * 40)
    a = window(t, 14.8, 18.5); comp(frame, T_TAG, a)
    a = window(t, 15.4, 18.5); comp(frame, T_CTA, a, (1 - ease((t - 15.4) / 0.4)) * 30 + 4 * math.sin(t * 5))
    a = window(t, 14.1, 18.5); comp(frame, T_DEMO, a)
    return np.clip(frame, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- audio
def render_audio(path):
    sr = 44100
    n = sr * DUR
    t = np.arange(n) / sr
    r = np.random.default_rng(11)
    out = np.zeros((n, 2), np.float32)

    gate = np.clip((t - 0.3) / 0.5, 0, 1) * np.clip((10.4 - t) / 0.4, 0, 1)
    # crackle: sparse decaying noise bursts
    times = np.cumsum(r.exponential(1 / 45, 2000))
    times = times[times < DUR]
    for ts in times:
        g = gate[min(int(ts * sr), n - 1)]
        if g <= 0:
            continue
        ln = int(sr * r.uniform(0.002, 0.009))
        s = int(ts * sr)
        e = min(s + ln, n)
        burst = r.standard_normal(e - s) * np.exp(-np.arange(e - s) / (ln / 4)) * r.pareto(2.5) * 0.12 * g
        burst = np.diff(np.concatenate([[0], burst]))  # high-pass
        pan = r.uniform(0.3, 0.7)
        out[s:e, 0] += burst * (1 - pan) * 2
        out[s:e, 1] += burst * pan * 2
    hiss = np.diff(np.concatenate([[0], r.standard_normal(n)])).astype(np.float32) * 0.012 * gate
    out += hiss[:, None]
    hum = (np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.3 + np.sin(2 * np.pi * 300 * t) * 0.15)
    out += (hum * 0.025 * gate)[:, None]

    # whoosh at the transition
    wn = r.standard_normal(n).astype(np.float32)
    wn = np.convolve(wn, np.ones(40) / 40, mode="same")
    env = np.exp(-((t - 10.4) / 0.35) ** 2)
    out += (wn * env * 0.5)[:, None]

    # soft pad (Fmaj7) for the brand part
    pad_env = np.clip((t - 10.2) / 1.6, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
    pad = sum(np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.003 * t)
              for f in (174.61, 220.0, 261.63, 329.63)) / 8
    out[:, 0] += pad * pad_env * 0.22
    out[:, 1] += np.roll(pad, 300) * pad_env * 0.22
    # chime on the end card
    for f0, ts in ((659.25, 14.3), (987.77, 14.42)):
        e = np.where(t >= ts, np.exp(-(t - ts) * 2.2), 0)
        out += (np.sin(2 * np.pi * f0 * t) * e * 0.12)[:, None]

    out /= np.abs(out).max() / 0.85
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


def main():
    out = Path(sys.argv[1])
    preview = Path(sys.argv[sys.argv.index("--preview") + 1]) if "--preview" in sys.argv else None
    wav = out.with_suffix(".wav")
    render_audio(wav)
    if preview:
        preview.mkdir(parents=True, exist_ok=True)
        for sec in (1.8, 6.0, 12.6, 16.5):
            Image.fromarray(render_frame(int(sec * FPS))).save(preview / f"frame_{sec:04.1f}.png")
        if "--preview-only" in sys.argv:
            return
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE)
    for i in range(N):
        ff.stdin.write(render_frame(i).tobytes())
        if i % 60 == 0:
            print(f"frame {i}/{N}", flush=True)
    ff.stdin.close()
    ff.wait()
    wav.unlink()
    print("done", out)


if __name__ == "__main__":
    main()
