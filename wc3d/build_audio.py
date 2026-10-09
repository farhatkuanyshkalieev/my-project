"""Звук: озвучка + музыка (с автоматизацией по сценам) + звуковые эффекты, синхронные с 3D-анимацией.
python3 build_audio.py out.wav"""
import json, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
TL = json.load(open(f"{HERE}/audio/timeline.json"))
TOTAL = TL["total"]
N = int((TOTAL + 2) * SR)
rng = np.random.default_rng(2026)
S = {s["name"]: s for s in TL["scenes"]}


def P(scene, i):  # время начала i-й фразы (абсолютное)
    return S[scene]["phrases"][i]["t0"]


def PE(scene, i):
    return S[scene]["phrases"][i]["t1"]


def at(scene, local):
    return S[scene]["start"] + local


def ma(x, w):
    """скользящее среднее за O(N), режим same"""
    w = int(w); c = np.cumsum(np.concatenate([np.zeros(w // 2 + 1, np.float64), x.astype(np.float64), np.zeros(w - w // 2, np.float64)]))
    return ((c[w:w + len(x)] - c[:len(x)]) / w).astype(np.float32)


def read_wav(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    if sr != SR:
        x = np.interp(np.linspace(0, len(x) - 1, int(len(x) * SR / sr)), np.arange(len(x)), x)
    return x


def band_noise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return (x / np.abs(x).max()).astype(np.float32)


NB = {"low": band_noise(N, 120, 700), "mid": band_noise(N, 600, 2800), "high": band_noise(N, 2500, 12000), "air": band_noise(N, 6000, 16000), "body": band_noise(N, 200, 1800)}


def add(track, sig, t, gain=1.0):
    i = int(t * SR)
    if i < 0:
        sig = sig[-i:]; i = 0
    if i >= len(track):
        return
    sig = sig[:len(track) - i]
    track[i:i + len(sig)] += sig * gain


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR * decay).astype(np.float32)


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


# ---------- эффекты ----------
def impact(dur=2.2):
    t = tvec(dur)
    sub = np.sin(2 * np.pi * (34 + 60 * np.exp(-t * 14)) * t) * np.exp(-t * 2.3)
    sub2 = np.sin(2 * np.pi * 62 * t) * np.exp(-t * 4) * 0.5
    off = rng.integers(0, N - len(t))
    crash = NB["high"][off:off + len(t)] * np.exp(-t * 5.5) * 0.55 + NB["mid"][off:off + len(t)] * np.exp(-t * 9) * 0.5
    click = np.exp(-t * 300) * NB["air"][off:off + len(t)] * 0.7
    return (sub * 1.2 + sub2 + crash + click).astype(np.float32)


def whoosh(dur=0.7, up=True, k=0.9):
    t = tvec(dur); x = t / dur; off = rng.integers(0, N - len(t))
    if not up:
        x = 1 - x
    lo = NB["low"][off:off + len(t)] * np.exp(-((x - 0.25) / 0.28) ** 2)
    mid = NB["mid"][off:off + len(t)] * np.exp(-((x - 0.5) / 0.26) ** 2)
    hi = NB["high"][off:off + len(t)] * np.exp(-((x - 0.78) / 0.24) ** 2)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return ((lo * 0.5 + mid * 0.8 + hi * 0.7) * env * k).astype(np.float32)


def riser(dur=1.5, k=0.8):
    t = tvec(dur); x = t / dur; off = rng.integers(0, N - len(t))
    n = NB["mid"][off:off + len(t)] * x ** 2 * 0.6 + NB["high"][off:off + len(t)] * x ** 3 * 0.9 + NB["air"][off:off + len(t)] * x ** 4 * 0.5
    f = 180 * (2 ** (x * 4.2)); ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.5 * np.sin(ph * 2.01)) * x ** 2.2 * 0.22
    return ((n + tone) * k).astype(np.float32)


def tick(freq=1600, dur=0.07, k=0.5):
    t = tvec(dur); return (np.sin(2 * np.pi * freq * t) * np.exp(-t * 55) * k + np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 90) * k * 0.3).astype(np.float32)


def pop(freq=600, dur=0.12, k=0.6):
    t = tvec(dur); return (np.sin(2 * np.pi * (freq * (1 + 1.3 * np.exp(-t * 60))) * t) * np.exp(-t * 28) * k).astype(np.float32)


def thunk(freq=95, dur=0.4, k=0.9):
    t = tvec(dur); off = rng.integers(0, N - len(t))
    return (np.sin(2 * np.pi * (freq + 80 * np.exp(-t * 40)) * t) * np.exp(-t * 11) * k + NB["mid"][off:off + len(t)] * np.exp(-t * 60) * 0.25).astype(np.float32)


def sparkle(base=1318.5, n=5, dur=0.9, k=0.35):
    t = tvec(dur); out = np.zeros_like(t)
    for i in range(n):
        f = base * [1, 1.5, 2, 2.5, 3, 4][i % 6] * (1 + 0.003 * i); d = 0.02 * i
        tt = np.clip(t - d, 0, None); out += np.sin(2 * np.pi * f * tt) * np.exp(-tt * (5 + i)) * (t >= d) * (0.5 ** (i * 0.35))
    return (out * k).astype(np.float32)


def chime(f, dur=1.6, k=0.4):
    t = tvec(dur); return ((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 2.6) * (1 - np.exp(-t * 400)) * k).astype(np.float32)


def fw_boom(dur=1.6, k=0.8):
    t = tvec(dur); off = rng.integers(0, N - len(t))
    return (NB["low"][off:off + len(t)] * np.exp(-t * 5) * 0.9 + np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 6) * 0.8 + NB["high"][off:off + len(t)] * np.exp(-t * 14) * 0.3).astype(np.float32) * k


def fw_whistle(dur=0.55, k=0.12):
    t = tvec(dur); x = t / dur; f = 700 + 1900 * x ** 1.5
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * x ** 1.2 * k).astype(np.float32)


def crackle(dur=1.2, k=0.3):
    t = tvec(dur); out = np.zeros_like(t)
    for _ in range(26):
        s = rng.uniform(0.05, dur - 0.05); i = int(s * SR); l = int(0.012 * SR)
        out[i:i + l] += rng.standard_normal(l) * np.exp(-np.arange(l) / SR * 300) * rng.uniform(0.3, 1)
    return (out * k * np.exp(-t * 2.2)).astype(np.float32)


def roar(dur, k=0.5, swell=0.35):
    t = tvec(dur); off = rng.integers(0, N - len(t))
    env = np.minimum(t / (dur * swell), 1) ** 1.5 * np.clip((dur - t) / (dur * 0.35), 0, 1)
    return ((NB["body"][off:off + len(t)] * 0.8 + NB["mid"][off:off + len(t)] * 0.5 + NB["high"][off:off + len(t)] * 0.2) * env * k * (0.75 + 0.25 * np.sin(2 * np.pi * 5.5 * t + np.sin(t * 2)))).astype(np.float32)


def whistle(dur=0.8, k=0.22):
    t = tvec(dur); return (np.sin(2 * np.pi * (2850 + 70 * np.sin(2 * np.pi * 27 * t)) * t) * np.minimum(t / 0.015, 1) * np.exp(-np.maximum(t - 0.55, 0) * 15) * k).astype(np.float32)


def reverb(x, wet=0.25, tail=2.2, damp=3500):
    n = int(tail * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * (6.9 / tail)) ; ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    spec = np.fft.rfft(ir); f = np.fft.rfftfreq(n, 1 / SR); spec *= 1 / (1 + (f / damp) ** 2)
    ir = np.fft.irfft(spec, n); ir /= np.abs(ir).sum() * 0.04
    L = len(x) + n; sp = np.fft.rfft(x, L) * np.fft.rfft(ir, L)
    y = np.fft.irfft(sp, L)[:len(x)].astype(np.float32)
    return x * (1 - wet * 0.5) + y * wet


# ---------- голос ----------
voice = np.zeros(N, np.float32)
v = read_wav(f"{HERE}/audio/voice.wav"); voice[:len(v)] = v[:N]
voice *= 0.95 / np.abs(voice).max()
venv = ma(np.abs(voice), 0.1 * SR)
duck_v = 1 - 0.55 * np.clip(venv / 0.1, 0, 1)
duck_v = ma(duck_v, 0.12 * SR)

# ---------- музыка ----------
bpm = 118; beat = 60 / bpm; bar = beat * 4
tt = np.arange(N) / SR
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [(45, [57, 60, 64]), (41, [53, 57, 60]), (36, [55, 60, 64]), (43, [55, 59, 62])]   # Am F C G
mus = {k: np.zeros(N, np.float32) for k in ("pad", "bass", "kick", "hat", "clap", "arp", "lead")}
# интенсивность слоёв по времени: список (t_from, t_to, {layer: gain})
INT = []
def lay(scene, a, b, **g):  # локальные секунды сцены
    INT.append((at(scene, a), at(scene, b), g))
lay("title", 0, S["title"]["len"], pad=0.7, bass=0.0, kick=0.0, hat=0, clap=0, arp=0.0, lead=0)
lay("title", 0.86, S["title"]["len"], pad=1.0, bass=0.9, kick=1.0, hat=0.6, clap=0.0, arp=0.5, lead=0)
lay("hosts", 0, S["hosts"]["len"], pad=0.8, bass=1.0, kick=1.0, hat=0.8, clap=0.8, arp=0.6, lead=0.0)
lay("numbers", 0, S["numbers"]["len"], pad=0.7, bass=1.0, kick=1.0, hat=1.0, clap=1.0, arp=0.9, lead=0.5)
lay("cities", 0, S["cities"]["len"], pad=0.8, bass=1.0, kick=1.0, hat=1.0, clap=0.9, arp=1.0, lead=0.0)
lay("opening", 0, S["opening"]["len"], pad=1.0, bass=0.9, kick=0.0, hat=0.4, clap=0.0, arp=0.6, lead=0.7)
lay("opening", 0, 3.6, pad=1.0, bass=1.0, kick=1.0, hat=0.8, clap=0.8, arp=0.7, lead=0.8)
lay("format", 0, S["format"]["len"], pad=0.8, bass=1.0, kick=1.0, hat=1.0, clap=1.0, arp=1.0, lead=0.6)
lay("final", 0, S["final"]["len"], pad=1.0, bass=0.5, kick=0.0, hat=0.0, clap=0.0, arp=0.3, lead=0)
lay("final", P("final", 3) - S["final"]["start"], S["final"]["len"], pad=1.2, bass=1.1, kick=1.0, hat=1.0, clap=1.0, arp=1.0, lead=1.0)
lay("outro", 0, S["outro"]["len"], pad=1.1, bass=0.8, kick=0.7, hat=0.5, clap=0.4, arp=0.8, lead=1.0)
lay("outro", 0, 0.6, pad=1.0, bass=1.0, kick=1.0, hat=0.8, clap=0.8, arp=1.0, lead=1.0)

# огибающие слоёв (сглаженные)
layer_env = {k: np.zeros(N, np.float32) for k in mus}
for a, b, g in INT:
    ia, ib = int(a * SR), min(N, int(b * SR))
    for k, v_ in g.items():
        layer_env[k][ia:ib] = v_
for k in layer_env:
    layer_env[k] = ma(layer_env[k], 0.25 * SR)

def seg_t(t0, dur):
    i0 = int(t0 * SR); i1 = min(N, int((t0 + dur) * SR)); return i0, i1
nbars = int(TOTAL / bar) + 3
for b in range(nbars):
    t0 = b * bar; root, tri = chords[b % 4]
    i0, i1 = seg_t(t0, bar + 0.35)
    if i0 >= N: break
    seg = tt[i0:i1] - t0
    env = np.minimum(seg / 0.35, 1) * np.exp(-np.maximum(seg - bar, 0) * 7)
    pad = sum(np.sin(2 * np.pi * mf(m) * seg) + 0.45 * np.sin(2 * np.pi * mf(m) * 2.004 * seg) + 0.25 * np.sin(2 * np.pi * mf(m + 12) * 0.997 * seg) for m in tri)
    mus["pad"][i0:i1] += (pad * env * 0.05).astype(np.float32)
    # бас: восьмые с сайдчейном
    for k in range(8):
        i0b, i1b = seg_t(t0 + k * beat / 2, beat / 2)
        if i0b >= N: break
        s = tt[i0b:i1b] - (t0 + k * beat / 2)
        wv = np.sin(2 * np.pi * mf(root) * s) + 0.35 * np.sign(np.sin(2 * np.pi * mf(root) * s)) * 0.5
        mus["bass"][i0b:i1b] += (wv * np.exp(-s * 5) * 0.34).astype(np.float32)
    for k in range(4):
        i0k, i1k = seg_t(t0 + k * beat, 0.3)
        if i0k >= N: break
        s = tt[i0k:i1k] - (t0 + k * beat)
        mus["kick"][i0k:i1k] += (np.sin(2 * np.pi * (48 * s + 95 * (1 - np.exp(-s * 32)) / 32)) * np.exp(-s * 13) * 0.75).astype(np.float32)
        if k in (1, 3):
            i0c, i1c = seg_t(t0 + k * beat, 0.2); s2 = tt[i0c:i1c] - (t0 + k * beat)
            off = rng.integers(0, N - (i1c - i0c))
            mus["clap"][i0c:i1c] += (NB["mid"][off:off + (i1c - i0c)] * (np.exp(-s2 * 26) + 0.6 * np.exp(-np.abs(s2 - 0.012) * 90)) * 0.28).astype(np.float32)
    for k in range(8):
        i0h, i1h = seg_t(t0 + (k + 0.5) * beat / 2, 0.06)
        if i0h >= N: break
        s = tt[i0h:i1h] - (t0 + (k + 0.5) * beat / 2); off = rng.integers(0, N - (i1h - i0h))
        mus["hat"][i0h:i1h] += (NB["air"][off:off + (i1h - i0h)] * np.exp(-s * 80) * (0.12 if k % 2 else 0.07)).astype(np.float32)
    # арпеджио 16-ми
    for k in range(16):
        m = tri[k % 3] + (12 if k % 6 >= 3 else 0) + (12 if k % 8 == 7 else 0)
        i0a, i1a = seg_t(t0 + k * beat / 4, 0.3)
        if i0a >= N: break
        s = tt[i0a:i1a] - (t0 + k * beat / 4)
        sw = (np.sin(2 * np.pi * mf(m) * s) + 0.5 * np.sin(2 * np.pi * mf(m) * 2 * s) + 0.25 * np.sign(np.sin(2 * np.pi * mf(m) * s)))
        mus["arp"][i0a:i1a] += (sw * np.exp(-s * 11) * 0.075).astype(np.float32)
    # лид: длинные ноты верхнего голоса
    if b % 2 == 0:
        m = tri[2] + 12 + (3 if b % 4 == 2 else 0)
        i0l, i1l = seg_t(t0, bar * 2)
        s = tt[i0l:i1l] - t0
        mus["lead"][i0l:i1l] += (np.sin(2 * np.pi * mf(m) * s + 0.8 * np.sin(2 * np.pi * 5.2 * s) * np.minimum(s, 1) * 0.0) * np.minimum(s / 0.25, 1) * np.exp(-np.maximum(s - bar * 1.6, 0) * 4) * 0.07 + np.sin(2 * np.pi * mf(m) * 1.004 * s) * np.minimum(s / 0.25, 1) * 0.05).astype(np.float32)

kick_env = ma(np.abs(mus["kick"]), 0.02 * SR)
side = 1 - 0.55 * np.clip(kick_env / 0.15, 0, 1)
side = ma(side, 0.04 * SR)
music = (mus["pad"] * layer_env["pad"] + mus["bass"] * layer_env["bass"] * side + mus["kick"] * layer_env["kick"] + mus["hat"] * layer_env["hat"]
         + mus["clap"] * layer_env["clap"] + mus["arp"] * layer_env["arp"] * (0.6 + 0.4 * side) + mus["lead"] * layer_env["lead"])
music = reverb(music, 0.14, 1.6) * duck_v * 0.75

# ---------- SFX ----------
sfx = np.zeros(N, np.float32)
# --- переходы между сценами (whip): подъём -> удар -> свуш
names = [s["name"] for s in TL["scenes"]]
for i, nm in enumerate(names[1:], 1):
    tb = S[nm]["start"]
    add(sfx, riser(0.75, 0.7), tb - 0.75)
    add(sfx, impact(2.4), tb - 0.02, 0.8)
    add(sfx, whoosh(0.6, True, 1.0), tb - 0.4)
    add(sfx, whoosh(0.7, False, 0.8), tb - 0.02)
    add(sfx, sparkle(2093, 5, 0.9, 0.18), tb + 0.05)
# --- title
add(sfx, whistle(), 0.1)
add(sfx, riser(0.85, 0.8), 0.05)
b0 = 0.88
for dt, h in ((0, 1.0), (0.94, 0.55), (0.94 + 0.54, 0.28), (0.94 + 0.54 + 0.28, 0.14)):
    add(sfx, thunk(70 + 25 * h, 0.5, 1.0 * h), b0 + dt)
add(sfx, impact(2.8), b0, 1.2)
add(sfx, sparkle(1568, 6, 1.2, 0.3), b0 + 0.02)
for i in range(4):
    add(sfx, chime(mf(69 + [0, 7, 12, 16][i]), 1.4, 0.3), 1.0 + i * 0.075)
    add(sfx, thunk(110, 0.3, 0.5), 1.0 + i * 0.075)
tl0 = P("title", 0) + 0.0
ts = PE("title", 0) - 0.55 - 0.0
add(sfx, whoosh(0.9, True, 1.0), ts - 0.35)
for i in range(14):
    add(sfx, tick(900 + 90 * i, 0.07, 0.25), ts + i * 0.045 + 0.4)
add(sfx, impact(2.0), ts + 0.62, 0.8); add(sfx, sparkle(1760, 6, 1.0, 0.3), ts + 0.62)
# --- hosts
for i, cue in enumerate((1, 2, 3)):
    t0 = P("hosts", cue) - 0.12
    add(sfx, thunk(85, 0.5, 1.0), t0 + 0.05); add(sfx, whoosh(0.7, True, 0.8), t0 + 0.05)
    add(sfx, chime(mf(69 + [0, 4, 7][i] + 12), 1.8, 0.35), t0 + 0.4)
    add(sfx, sparkle(1760 * (1 + 0.12 * i), 6, 1.0, 0.3), t0 + 0.35)
    add(sfx, fw_whistle(0.5, 0.1), t0 + 0.0); add(sfx, fw_boom(1.4, 0.45), t0 + 0.55); add(sfx, crackle(1.0, 0.25), t0 + 0.65)
add(sfx, whoosh(1.8, True, 0.6), P("hosts", 4) - 0.2)
# --- numbers
A0, B0, C0 = P("numbers", 0), P("numbers", 1), P("numbers", 2)
for i in range(32):
    add(sfx, pop(380 + 12 * i, 0.1, 0.22), A0 - 0.05 + i * 0.022 + 0.5)
add(sfx, whoosh(0.9, True, 0.7), A0 - 0.1)
for i in range(16):
    add(sfx, pop(700 + 25 * i, 0.1, 0.25), A0 + 0.95 + i * 0.035 + 0.55); add(sfx, tick(2200 + 60 * i, 0.05, 0.12), A0 + 0.95 + i * 0.035 + 0.55)
for i in range(16):   # тики счётчика 32 -> 48
    add(sfx, tick(1800 + 50 * i, 0.05, 0.28), A0 + 0.95 + i * 0.0594)
add(sfx, impact(1.8), A0 + 1.9, 0.75); add(sfx, sparkle(1568, 7, 1.2, 0.35), A0 + 1.9); add(sfx, fw_boom(1.4, 0.5), A0 + 1.25)
add(sfx, riser(0.6, 0.6), B0 - 0.55); add(sfx, whoosh(0.7, True, 1.1), B0 - 0.5)
for i in range(40):   # 64 -> 104
    add(sfx, tick(1500 + 22 * i, 0.05, 0.26), B0 + 0.95 + i * 0.0288)
for i in range(13):
    add(sfx, thunk(150 + 8 * i, 0.15, 0.22), B0 - 0.1 + i * 0.03)
for i in range(10):
    add(sfx, pop(900 + 40 * i, 0.1, 0.3), B0 + 0.9 + i * 0.1 + 0.05)
add(sfx, impact(1.8), B0 + 2.1, 0.75); add(sfx, sparkle(1760, 7, 1.2, 0.35), B0 + 2.1)
add(sfx, whoosh(1.6, False, 0.7), C0 - 0.2); add(sfx, chime(mf(81), 2.2, 0.3), C0 + 0.2); add(sfx, chime(mf(88), 2.2, 0.25), C0 + 0.4)
# --- cities
c0 = P("cities", 0) + 0.35
for rnk in range(16):
    add(sfx, pop(420 * (1 + 0.045 * rnk), 0.14, 0.35), c0 + rnk * 0.062)
    add(sfx, tick(2000 + 110 * rnk, 0.06, 0.18), c0 + rnk * 0.062 + 0.02)
add(sfx, whoosh(1.2, True, 0.9), P("cities", 0))
for i, cue in enumerate((1, 2, 3)):
    t0 = P("cities", cue)
    add(sfx, thunk(90, 0.4, 0.7), t0); add(sfx, chime(mf([76, 79, 83][i]), 1.5, 0.35), t0 + 0.05); add(sfx, whoosh(0.5, True, 0.5), t0 - 0.1)
for i in range(11):
    add(sfx, tick(1400 + 40 * i, 0.05, 0.14), P("cities", 1) + 0.15 + i * 0.07)
t4 = P("cities", 4)
add(sfx, riser(1.3, 0.6), t4 - 0.1); add(sfx, whoosh(1.5, True, 0.8), t4); add(sfx, impact(2.2), PE("cities", 4) - 0.2, 0.6); add(sfx, sparkle(1568, 8, 1.4, 0.35), PE("cities", 4) - 0.2)
# --- opening
A, B = P("opening", 0), P("opening", 1)
for i in range(4):
    add(sfx, thunk(70, 0.5, 0.8), at("opening", 0.1 + i * 0.12 + 0.35)); add(sfx, tick(500, 0.1, 0.3), at("opening", 0.1 + i * 0.12 + 0.35))
add(sfx, roar(PE("opening", 0) - P("opening", 0) + 2.0, 0.55, 0.3), at("opening", 0.2))
add(sfx, roar(3.5, 0.6, 0.4), B + 3.0)
for tt_, _p, _c in ((A + 0.2, 0, 0), (A + 0.55, 0, 0), (A + 0.9, 0, 0), (A + 1.35, 0, 0), (A + 1.7, 0, 0), (A + 2.2, 0, 0), (B + 3.0, 0, 0), (B + 3.4, 0, 0), (B + 3.8, 0, 0)):
    add(sfx, fw_whistle(0.55, 0.1), tt_ - 0.55); add(sfx, fw_boom(1.6, 0.6), tt_); add(sfx, crackle(1.2, 0.3), tt_ + 0.1)
for i in range(7):
    add(sfx, thunk(120 - 8 * i, 0.3, 0.45), A + i * 0.05 + 0.1); add(sfx, tick(1100 + 120 * i, 0.06, 0.2), A + i * 0.05 + 0.1)
add(sfx, impact(2.4), A, 0.9)
for i, o in enumerate((1.5, 2.5, 3.7)):
    tt_ = B + o + (0.2 if i == 2 else 0)
    add(sfx, pop(520 + 120 * i, 0.15, 0.5), tt_); add(sfx, chime(mf([72, 76, 84][i]), 1.8, 0.4), tt_); add(sfx, sparkle(1568 * (1 + 0.2 * i), 6, 1.2, 0.3), tt_ + 0.02)
add(sfx, impact(2.6), B + 3.5, 0.9)
# --- format
fA, fB, fC, fD = (P("format", i) for i in range(4))
for i in range(12):
    add(sfx, whoosh(0.35, True, 0.45), fA + i * 0.09); add(sfx, thunk(160 + 6 * i, 0.15, 0.3), fA + i * 0.09 + 0.45)
for i in range(12):
    add(sfx, pop(700 + 40 * i, 0.1, 0.3), fB + 0.1 + i * 0.075 + 0.1); add(sfx, tick(2400 + 80 * i, 0.05, 0.18), fB + 0.1 + i * 0.075 + 0.1)
for i in range(8):
    add(sfx, pop(900 + 70 * i, 0.12, 0.38), fC + 0.05 + i * 0.11 + 0.1); add(sfx, sparkle(1568 + 90 * i, 3, 0.5, 0.2), fC + 0.05 + i * 0.11 + 0.1)
add(sfx, chime(mf(81), 1.6, 0.35), fB + 0.1); add(sfx, chime(mf(88), 1.6, 0.4), fC + 0.1)
add(sfx, riser(0.9, 0.8), fD - 0.8); add(sfx, impact(2.2), fD, 0.85)
for k in range(32):
    add(sfx, tick(1300 + 40 * k, 0.05, 0.16), fD + 0.1 + k * 0.022 + 0.3)
for r in range(5):
    tr = fD + 0.9 + r * 0.62
    add(sfx, thunk(95 - 6 * r, 0.45, 0.9), tr); add(sfx, whoosh(0.4, False, 0.6), tr - 0.1)
    add(sfx, chime(mf(69 + [0, 4, 7, 12, 16][r]), 1.4, 0.35), tr + 0.1)
    if r < 4:
        for j in range(3):
            add(sfx, tick(260 - 30 * j, 0.1, 0.35), tr + 0.02 + 0.05 * j)
add(sfx, impact(2.6), fD + 0.9 + 4 * 0.62 + 0.3, 1.0); add(sfx, sparkle(1760, 8, 1.6, 0.4), fD + 0.9 + 4 * 0.62 + 0.3)
for dt in (0.3, 0.6, 0.8):
    add(sfx, fw_boom(1.5, 0.5), fD + 0.9 + 4 * 0.62 + dt); add(sfx, crackle(1.0, 0.25), fD + 0.9 + 4 * 0.62 + dt + 0.1)
# --- final
fa, fb, fc, fd = (P("final", i) for i in range(4))
for i in range(6):
    add(sfx, thunk(60, 0.5, 0.45), fa - 0.45 + 0.2 + i * 0.18 + 0.3); add(sfx, whoosh(0.5, True, 0.35), fa - 0.45 + 0.2 + i * 0.18 + 0.3)
add(sfx, riser(fb - fa - 0.4, 0.7), fa + 0.3)
add(sfx, impact(3.0), fb, 1.2); add(sfx, whoosh(0.5, False, 1.0), fb - 0.05)
for i in range(5):
    add(sfx, thunk(105 - 4 * i, 0.4, 0.7), fb + i * 0.06 + 0.1)
add(sfx, riser(fd - fc + 0.3, 0.9), fc - 0.3)
add(sfx, roar(2.2, 0.4, 0.8), fc + 0.2)
add(sfx, impact(3.4), fd, 1.4); add(sfx, sparkle(1568, 9, 2.0, 0.5), fd); add(sfx, chime(mf(81), 3.0, 0.5), fd + 0.05); add(sfx, chime(mf(84), 3.0, 0.4), fd + 0.1)
add(sfx, roar(PE("final", 3) - fd + 2.0, 0.8, 0.15), fd)
for dt in (0.1, 0.3, 0.5, 0.9, 1.1):
    add(sfx, fw_whistle(0.5, 0.09), fd + dt - 0.5); add(sfx, fw_boom(1.6, 0.7), fd + dt); add(sfx, crackle(1.4, 0.35), fd + dt + 0.1)
add(sfx, whoosh(1.0, True, 0.5), fd - 0.1)
# --- outro
oa, ob = P("outro", 0), P("outro", 1)
add(sfx, whoosh(1.2, True, 0.7), at("outro", 0.05))
for i in range(16):
    add(sfx, tick(1800 + 70 * (i % 7), 0.06, 0.2), at("outro", 0.5 + i * 0.28)); add(sfx, sparkle(1568 * (1 + 0.1 * (i % 5)), 3, 0.6, 0.12), at("outro", 0.5 + i * 0.28 + 0.2))
for i in range(16):
    tf = oa + 0.6 + i * 0.36
    if tf < TOTAL - 0.6:
        add(sfx, fw_whistle(0.5, 0.08), tf - 0.5); add(sfx, fw_boom(1.5, 0.45), tf); add(sfx, crackle(1.0, 0.22), tf + 0.1)
for i in range(8):
    add(sfx, pop(500 + 90 * i, 0.12, 0.4), ob + 0.1 + i * 0.07 + 0.1)
for i in range(9):
    add(sfx, pop(420 + 70 * i, 0.12, 0.34), ob + 0.5 + i * 0.06 + 0.1)
add(sfx, impact(3.0), ob + 0.15, 1.0); add(sfx, impact(3.0), ob + 0.65, 0.6)
add(sfx, roar(5.0, 0.55, 0.3), ob)
add(sfx, chime(mf(69), 4.0, 0.35), ob + 0.2); add(sfx, chime(mf(76), 4.0, 0.3), ob + 0.3); add(sfx, chime(mf(81), 4.0, 0.3), ob + 0.4)
sfx = reverb(sfx, 0.3, 2.4, 6000)

# ---------- микс ----------
vr = reverb(voice, 0.1, 0.55, 4500)
_m = np.abs(voice) > 0.02
db = lambda a: 20 * np.log10(np.sqrt((a[_m] ** 2).mean()) + 1e-9)
print('bus RMS during speech dB: voice %.1f music %.1f sfx %.1f' % (db(vr), db(music), db(sfx)))
mix = vr * 1.0 + music * 1.15 + sfx * 0.55
end = int(TOTAL * SR)
mix[:int(0.04 * SR)] *= np.linspace(0, 1, int(0.04 * SR))
f = int(1.4 * SR); mix[end - f:end] *= np.linspace(1, 0, f); mix[end:] = 0
# мягкий лимитер
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix[:end]; mix = mix / np.abs(mix).max() * 0.93
st = np.stack([mix, mix], 1)
# лёгкое стерео-расширение: микро-задержка на музыку и эффекты
wide = np.zeros(end, np.float32); sh = int(0.011 * SR)
bus = (music + sfx)[:end] * 0.5
wide[sh:] = bus[:-sh]
L_ = mix + 0.12 * (bus - wide); R_ = mix - 0.12 * (bus - wide)
sig = np.stack([L_, R_], 1); sig = sig / np.abs(sig).max() * 0.93
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sig * 32767).astype(np.int16).tobytes())
print("audio ok", round(TOTAL, 2))
