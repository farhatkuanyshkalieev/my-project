#!/usr/bin/env python3
"""Build 'pasta la vista' intro: vertical (9:16) and horizontal (16:9)."""
import os, subprocess, sys, glob
import numpy as np
from scipy import signal
from scipy.io import wavfile

UP = "/root/.claude/uploads/2ba40106-8790-5187-88f6-7ee4e4a01f99"
S = os.path.dirname(os.path.abspath(__file__))
W_DIR = os.path.join(S, "work"); os.makedirs(W_DIR, exist_ok=True)
OUT_DIR = "/home/user/my-project/intro"; os.makedirs(OUT_DIR, exist_ok=True)
SRC = {
    "A": os.path.join(UP, "69df2033-IMG_2948.mov"),            # top-down table, 4K60
    "B": glob.glob(os.path.join(UP, "8c02ec05-*.mov"))[0],      # friends at table, 1080p30
    "C": glob.glob(os.path.join(UP, "a57b8956-*"))[0],          # vertical reel (no audio used)
}
FONT = os.path.join(S, "fonts", "pf500_conv.ttf")
SR = 48000
FPS = 30

# (src, start, source_duration, speed, crop_center_x for vertical, audio spec)
# audio spec: (src, start, dur, reverse) — C's own soundtrack is dropped (music)
SEGS = [
    ("C", 0.00, 1.10, 1.0, 0.5,  ("B", 0.00, 1.10, False)),   # dining room
    ("A", 0.10, 1.40, 1.0, 0.5,  ("A", 0.10, 1.40, False)),   # table top-down
    ("C", 3.30, 1.70, 1.0, 0.5,  ("B", 2.70, 1.70, False)),   # cocktail pour
    ("B", 1.55, 1.20, 1.0, 0.56, ("B", 1.55, 1.20, False)),   # girl waving
    ("C", 5.80, 1.20, 1.0, 0.5,  ("B", 2.70, 1.20, True)),    # pizza cut
    ("B", 4.55, 1.45, 1.0, 0.52, ("B", 4.55, 1.45, False)),   # guy with tea
    ("A", 1.60, 1.30, 1.0, 0.5,  ("A", 1.60, 1.30, False)),   # table, more food
    ("C", 1.20, 1.50, 1.0, 0.5,  ("B", 0.00, 1.50, True)),    # diners
    ("B", 6.50, 1.65, 0.5, 0.62, ("B", 6.50, 1.65, False)),   # wide hall, slow-mo -> title
]
FADE_OUT = 1.0
TAIL_BLACK = 0.35


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(" ".join(cmd)); print(r.stderr[-3000:]); sys.exit(1)
    return r


def seg_durs():
    return [round(d / sp, 3) for (_, _, d, sp, _, _) in SEGS]


# ---------------------------------------------------------------- video
def grade(src):
    if src == "C":
        return "null"
    # phone footage -> a touch warmer/contrastier to sit next to the graded reel
    return ("eq=contrast=1.07:saturation=1.06:gamma=0.97,"
            "colorbalance=rs=0.03:gs=0.0:bs=-0.03:rm=0.02:bm=-0.02:rh=0.01:bh=-0.02")


def render_segment(i, seg, W, H, tag):
    src, ss, d, sp, cx, _ = seg
    out_d = d / sp
    nfr = int(round(out_d * FPS))
    out = os.path.join(W_DIR, f"{tag}_{i:02d}.mp4")
    W2, H2 = W * 2, H * 2  # oversample so the push-in zoom is smooth
    zoom_amt = 0.05 if sp == 1.0 else 0.08
    pre = []
    if sp != 1.0:
        pre.append("minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1")
        pre.append(f"setpts=PTS/{sp}")
    pre.append(f"fps={FPS}")
    vertical = H > W
    if src == "C" and not vertical:
        # vertical reel in a 16:9 frame: blurred fill + centred foreground
        base = ",".join(pre)
        fc = (f"[0:v]{base},split[a][b];"
              f"[a]scale={W2}:{H2}:force_original_aspect_ratio=increase,crop={W2}:{H2},"
              f"gblur=sigma=40,eq=brightness=-0.12:saturation=0.8[bg];"
              f"[b]scale=-2:{H2}:flags=lanczos[fg];"
              f"[bg][fg]overlay=(W-w)/2:0,setsar=1[c];")
        zin = "[c]"
    else:
        if vertical and src in ("A", "B"):
            # crop a 9:16 window out of the 16:9 frame
            crop = (f"crop=w=ih*9/16:h=ih:x='min(max(0,iw*{cx}-ih*9/32),iw-ih*9/16)':y=0,")
        else:
            crop = ""
        fc = (f"[0:v]{','.join(pre)},{crop}scale={W2}:{H2}:force_original_aspect_ratio=increase:flags=lanczos,"
              f"crop={W2}:{H2},setsar=1[c];")
        zin = "[c]"
    fc += (f"{zin}zoompan=z='1+{zoom_amt}*on/{nfr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
           f"d=1:s={W}x{H}:fps={FPS},{grade(src)},format=yuv420p[v]")
    if os.path.exists(out) and os.environ.get("REUSE"):
        return out
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{ss}", "-t", f"{d + 0.1}", "-i", SRC[src],
           "-filter_complex", fc, "-map", "[v]", "-frames:v", str(nfr), "-an",
           "-c:v", "libx264", "-preset", "fast", "-crf", "10", "-r", str(FPS), out]
    run(cmd)
    return out


# ---------------------------------------------------------------- audio
def load_audio(src):
    p = os.path.join(W_DIR, f"aud_{src}.wav")
    run(["ffmpeg", "-y", "-v", "error", "-i", SRC[src], "-vn", "-ac", "2", "-ar", str(SR),
         "-c:a", "pcm_f32le", p])
    _, a = wavfile.read(p)
    return a.astype(np.float32)


def stretch_audio(src, ss, d, sp):
    p = os.path.join(W_DIR, f"aud_stretch.wav")
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(ss), "-t", str(d), "-i", SRC[src], "-vn",
         "-ac", "2", "-ar", str(SR), "-af", f"atempo={sp}", "-c:a", "pcm_f32le", p])
    _, a = wavfile.read(p)
    return a.astype(np.float32)


def env_fade(n, fi, fo):
    e = np.ones(n, np.float32)
    fi, fo = min(fi, n), min(fo, n)
    if fi: e[:fi] = np.linspace(0, 1, fi)
    if fo: e[-fo:] = np.minimum(e[-fo:], np.linspace(1, 0, fo))
    return e


rng = np.random.default_rng(7)


def bandnoise_sweep(dur, f0, f1, bands=14, q=1.2):
    """Noise whose band centre glides from f0 to f1 (log), built from crossfaded bands."""
    n = int(dur * SR)
    noise = rng.standard_normal(n).astype(np.float64)
    centers = np.geomspace(min(f0, f1) * 0.8, max(f0, f1) * 1.2, bands)
    traj = np.geomspace(f0, f1, n)
    out = np.zeros(n)
    lc = np.log(centers)
    width = (lc[1] - lc[0]) * 1.1
    for c, l in zip(centers, lc):
        lo, hi = c / (1 + 0.5 / q), min(c * (1 + 0.5 / q), SR / 2 - 100)
        sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        b = signal.sosfilt(sos, noise)
        w = np.exp(-0.5 * ((np.log(traj) - l) / width) ** 2)
        out += b * w
    return out / (np.max(np.abs(out)) + 1e-9)


def whoosh(dur=0.55, f0=500, f1=3500, peak=0.6, pan=True):
    n = int(dur * SR)
    x = bandnoise_sweep(dur, f0, f1)
    t = np.linspace(0, 1, n)
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-7 * (t - peak) / (1 - peak)))
    x = x * env
    p = np.linspace(-0.6, 0.6, n) if pan else np.zeros(n)
    L = x * np.sqrt((1 - p) / 2); R = x * np.sqrt((1 + p) / 2)
    return np.stack([L, R], 1)


def riser(dur=1.5):
    n = int(dur * SR)
    x = bandnoise_sweep(dur, 300, 7000, bands=18)
    t = np.linspace(0, 1, n)
    env = t ** 2.6
    env[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(110, 440, n)) / SR) * 0.15
    y = (x * 0.85 + tone) * env
    return np.stack([y, y * 0.92], 1)


def reverb_ir(dur=1.8, decay=3.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-decay * t)[:, None]
    sos = signal.butter(2, 5000, "low", fs=SR, output="sos")
    ir = signal.sosfilt(sos, ir, axis=0)
    return ir / np.sqrt(np.sum(ir ** 2, 0, keepdims=True))


def impact():
    dur = 2.4; n = int(dur * SR); t = np.arange(n) / SR
    f = 38 + 45 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    click = rng.standard_normal(n) * np.exp(-t * 90)
    click = signal.sosfilt(signal.butter(2, 2500, "low", fs=SR, output="sos"), click)
    body = signal.sosfilt(signal.butter(2, [80, 600], "band", fs=SR, output="sos"),
                          rng.standard_normal(n)) * np.exp(-t * 9)
    dry = boom * 1.0 + click * 0.5 + body * 0.6
    dry = np.tanh(dry * 1.4)
    st = np.stack([dry, dry], 1)
    wet = signal.fftconvolve(st, reverb_ir(), axes=0)[:n] * 0.12
    y = st + wet
    return y / np.max(np.abs(y))


def clink():
    dur = 1.0; n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for f, d, a in [(2350, 3.0, 1.0), (2362, 3.0, 0.6), (3720, 4.5, 0.6), (5180, 6, 0.45), (6890, 9, 0.3)]:
        y += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
    y += rng.standard_normal(n) * np.exp(-t * 600) * 0.4
    st = np.stack([y * 0.8, y], 1)
    wet = signal.fftconvolve(st, reverb_ir(1.0, 5), axes=0)[:n] * 0.08
    y = st + wet
    return y / np.max(np.abs(y))


def shimmer(dur=1.6):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = rng.standard_normal((n, 2))
    x = signal.sosfilt(signal.butter(4, [5000, 12000], "band", fs=SR, output="sos"), x, axis=0)
    env = np.where(t < 0.35, (t / 0.35) ** 2, np.exp(-4 * (t - 0.35)))
    return (x * env[:, None]) / np.max(np.abs(x))


def db(x): return 10 ** (x / 20)


def build_audio(total, starts, durs):
    n_total = int(round(total * SR))
    mix = np.zeros((n_total, 2))
    aud = {"A": load_audio("A"), "B": load_audio("B")}
    # normalise the two phone sources to similar level
    for k in aud:
        rms = np.sqrt(np.mean(aud[k] ** 2)); aud[k] *= 0.05 / rms
    xf = int(0.03 * SR)
    for i, (seg, st, du) in enumerate(zip(SEGS, starts, durs)):
        src, ss, d, rev = seg[5]
        if seg[3] != 1.0:
            a = stretch_audio(src, ss, d, seg[3])
            a *= 0.05 / (np.sqrt(np.mean(a ** 2)) + 1e-9)
        else:
            a = aud[src][int(ss * SR): int((ss + d) * SR)]
            if rev: a = a[::-1]
        n = min(int(du * SR) + xf, len(a))
        a = a[:n] * env_fade(n, xf, xf)[:, None]
        p = int(st * SR) - (xf // 2 if i else 0)
        p = max(p, 0)
        m = min(n, n_total - p)
        mix[p:p + m] += a[:m]
    # room-tone glue layer: B looped, low-passed, quiet
    bed = np.concatenate([aud["B"], aud["B"][::-1], aud["B"]])[:n_total]
    bed = signal.sosfilt(signal.butter(2, 2500, "low", fs=SR, output="sos"), bed, axis=0)
    mix += bed * db(-11)

    def place(clip, t, gain_db):
        p = int(t * SR); m = min(len(clip), n_total - p)
        if m > 0: mix[p:p + m] += clip[:m] * db(gain_db)

    cut = lambda k: starts[k]
    # SFX (no music)
    place(whoosh(0.5, 2500, 400, 0.15, pan=False), 0.0, -14)          # soft in
    place(whoosh(0.45, 600, 4000), cut(2) - 0.30, -13)                 # into cocktail
    place(clink(), cut(2) + 0.20, -17)                                 # glass
    place(whoosh(0.40, 4000, 700), cut(4) - 0.25, -15)                 # into pizza
    place(whoosh(0.45, 700, 3800), cut(6) - 0.30, -15)                 # into table
    place(riser(durs[7] + 0.05), cut(7) - 0.05, -17)                   # build-up
    place(impact(), cut(8) - 0.02, -14)                                 # drop into slow-mo
    t_title = cut(8) + 0.55
    place(shimmer(1.6), t_title - 0.35, -22)                           # title air

    # slow-mo section: duck the ambience under the title and muffle it towards black
    s8 = int(cut(8) * SR)
    tail = mix[s8:].copy()
    n8 = len(tail)
    # progressive low-pass by crossfading with a filtered copy
    lp = signal.sosfilt(signal.butter(2, 900, "low", fs=SR, output="sos"), tail, axis=0)
    w = np.clip(np.linspace(-0.2, 1.4, n8), 0, 1)[:, None]
    mix[s8:] = tail * (1 - w) + lp * w

    # global fades
    fo_start = total - TAIL_BLACK - FADE_OUT
    e = np.ones(n_total)
    a0, a1 = int(fo_start * SR), int((total - TAIL_BLACK) * SR)
    e[a0:a1] = np.linspace(1, 0, a1 - a0) ** 1.5
    e[a1:] = 0
    e[:int(0.15 * SR)] *= np.linspace(0, 1, int(0.15 * SR))
    mix *= e[:, None]
    # level + safety limiter
    pk = np.max(np.abs(mix)); mix *= db(-1.5) / pk
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    out = os.path.join(W_DIR, "mix.wav")
    wavfile.write(out, SR, mix.astype(np.float32))
    # loudness to ~-16 LUFS with true-peak limit
    out2 = os.path.join(W_DIR, "mix_norm.wav")
    run(["ffmpeg", "-y", "-v", "error", "-i", out, "-af",
         "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true", "-ar", str(SR), out2])
    return out2


# ---------------------------------------------------------------- assemble
def build(tag, W, H, fontsize, audio_path, starts, durs, total):
    parts = [render_segment(i, s, W, H, tag) for i, s in enumerate(SEGS)]
    lst = os.path.join(W_DIR, f"{tag}_list.txt")
    with open(lst, "w") as f:
        for p in parts: f.write(f"file '{p}'\n")
    t0 = starts[8] + 0.55
    fo = total - TAIL_BLACK - FADE_OUT
    txt = (f"drawtext=fontfile={FONT}:text='pasta la vista':fontcolor=white:fontsize={fontsize}:"
           f"x=(w-tw)/2:y=(h-th)/2")
    fc = (
        f"[0:v]tpad=stop_mode=clone:stop_duration={TAIL_BLACK + 0.2},trim=duration={total},"
        f"vignette=angle=PI/6,split[b0][b1];"
        # under the title: background softly defocuses and darkens for legibility
        f"[b1]gblur=sigma={W / 180:.1f},eq=brightness=-0.10:saturation=0.85,format=yuva420p,"
        f"fade=in:st={t0 - 0.35}:d=1.0:alpha=1[soft];"
        f"[b0][soft]overlay=format=auto,noise=alls=3:allf=t,format=yuv420p[base];"
        f"color=c=black@0.0:s={W}x{H}:r={FPS}:d={total},format=rgba,{txt},split[t1][t2];"
        f"[t2]gblur=sigma={fontsize / 6:.1f},colorchannelmixer=aa=0.55[glow];"
        f"[glow][t1]overlay=format=auto,fade=in:st={t0}:d=0.8:alpha=1[title];"
        f"[base][title]overlay=x=0:y='{fontsize * 0.22:.1f}*pow(1-clip((t-{t0})/1.1,0,1),2)':format=auto,"
        f"fade=in:st=0:d=0.25,fade=out:st={fo}:d={FADE_OUT},format=yuv420p[v]"
    )
    out = os.path.join(OUT_DIR, f"pasta_la_vista_intro_{tag}.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", audio_path,
         "-filter_complex", fc, "-map", "[v]", "-map", "1:a", "-t", f"{total}",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "14M", "-bufsize", "28M", "-profile:v", "high", "-pix_fmt", "yuv420p",
         "-r", str(FPS), "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out])
    return out


if __name__ == "__main__":
    durs = seg_durs()
    starts = list(np.cumsum([0] + durs[:-1]))
    total = round(sum(durs) + TAIL_BLACK, 3)
    print("durations", durs, "total", total)
    which = sys.argv[1:] or ["vertical", "horizontal"]
    audio = build_audio(total, starts, durs)
    if "vertical" in which:
        print(build("vertical_1080x1920", 1080, 1920, 86, audio, starts, durs, total))
    if "horizontal" in which:
        print(build("horizontal_1920x1080", 1920, 1080, 92, audio, starts, durs, total))
