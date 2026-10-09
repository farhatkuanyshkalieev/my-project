"""Звук притчи: голос + кинематографичная музыка + эффекты, синхронные с хореографией.
python3 build_audio.py out.wav"""
import json, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); SR = 44100
TL = json.load(open(f"{HERE}/audio/timeline.json")); PH = TL["phrases"]; TOTAL = TL["total"]; N = int((TOTAL + 2) * SR)
rng = np.random.default_rng(77)
P = lambda i: PH[i]["t0"]; PE = lambda i: PH[i]["t1"]
T_COL = P(7); T_REL = PE(10) + 0.5; T_HAUL = T_REL + 1.4; T_SIT = T_HAUL + 2.2; T_WALK = P(13) - 0.2

def ma(x, w):
    w = int(w); c = np.cumsum(np.concatenate([np.zeros(w // 2 + 1), x.astype(np.float64), np.zeros(w - w // 2)]))
    return ((c[w:w + len(x)] - c[:len(x)]) / w).astype(np.float32)
def read_wav(p):
    with wave.open(p) as w: x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    return x if sr == SR else np.interp(np.linspace(0, len(x) - 1, int(len(x) * SR / sr)), np.arange(len(x)), x)
def band(n, lo, hi):
    s = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); s[(f < lo) | (f > hi)] = 0; x = np.fft.irfft(s, n); return (x / np.abs(x).max()).astype(np.float32)
NB = {k: band(N, lo, hi) for k, (lo, hi) in {"low": (80, 500), "mid": (500, 2500), "high": (2500, 12000), "air": (6000, 16000), "body": (150, 1500)}.items()}
def add(tr, sig, t, g=1.0):
    i = int(t * SR)
    if i < 0: sig = sig[-i:]; i = 0
    if i >= len(tr): return
    sig = sig[:len(tr) - i]; tr[i:i + len(sig)] += sig * g
tv = lambda d: np.arange(int(d * SR)) / SR
def seg(k, n): o = rng.integers(0, N - n); return NB[k][o:o + n]
def reverb(x, wet=0.25, tail=2.2, damp=3500):
    n = int(tail * SR); t = np.arange(n) / SR; ir = rng.standard_normal(n) * np.exp(-t * (6.9 / tail)); ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    sp = np.fft.rfft(ir); f = np.fft.rfftfreq(n, 1 / SR); sp *= 1 / (1 + (f / damp) ** 2); ir = np.fft.irfft(sp, n); ir /= np.abs(ir).sum() * 0.04
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)].astype(np.float32); return x * (1 - wet * 0.5) + y * wet
def lowpass(x, fc):
    s = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); s *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(s, len(x)).astype(np.float32)

# ---------- эффекты ----------
def impact(d=2.4, k=1.0):
    t = tv(d); sub = np.sin(2 * np.pi * (32 + 55 * np.exp(-t * 13)) * t) * np.exp(-t * 2.2); n = len(t)
    return ((sub * 1.2 + seg("high", n) * np.exp(-t * 6) * 0.5 + seg("mid", n) * np.exp(-t * 10) * 0.5 + np.exp(-t * 280) * seg("air", n) * 0.6) * k).astype(np.float32)
def whoosh(d=0.6, up=True, k=0.8):
    t = tv(d); x = t / d; x = x if up else 1 - x; n = len(t)
    return ((seg("low", n) * np.exp(-((x - 0.25) / 0.28) ** 2) * 0.5 + seg("mid", n) * np.exp(-((x - 0.5) / 0.26) ** 2) * 0.8 + seg("high", n) * np.exp(-((x - 0.78) / 0.24) ** 2) * 0.6) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5 * k).astype(np.float32)
def riser(d=1.5, k=0.7):
    t = tv(d); x = t / d; n = len(t); f = 160 * (2 ** (x * 4.0)); ph = 2 * np.pi * np.cumsum(f) / SR
    return ((seg("mid", n) * x ** 2 * 0.5 + seg("high", n) * x ** 3 * 0.8 + seg("air", n) * x ** 4 * 0.5 + (np.sin(ph) + 0.5 * np.sin(ph * 2.01)) * x ** 2.2 * 0.2) * k).astype(np.float32)
def step_dirt(k=0.6):
    d = 0.16; t = tv(d); n = len(t); return ((seg("low", n) * np.exp(-t * 38) * 0.9 + seg("mid", n) * np.exp(-t * 55) * 0.5 + np.sin(2 * np.pi * 85 * t) * np.exp(-t * 30) * 0.7) * k).astype(np.float32)
def step_wood(k=0.7):
    d = 0.22; t = tv(d); n = len(t); return ((np.sin(2 * np.pi * (140 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 20) * 0.9 + seg("mid", n) * np.exp(-t * 70) * 0.5 + np.sin(2 * np.pi * 310 * t) * np.exp(-t * 35) * 0.3) * k).astype(np.float32)
def creak(d=0.9, k=0.4):
    t = tv(d); f0 = rng.uniform(170, 330); f = f0 + 70 * np.sin(2 * np.pi * rng.uniform(2, 5) * t) + 90 * t / d; ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sign(np.sin(ph)) * 0.4 + np.sin(ph) * 0.6) * (0.55 + 0.45 * np.sin(2 * np.pi * rng.uniform(14, 30) * t)); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (lowpass(s.astype(np.float32), 1500) * env * k).astype(np.float32)
def snap(k=0.9):
    d = 0.5; t = tv(d); n = len(t); return ((seg("high", n) * np.exp(-t * 120) * 0.9 + seg("mid", n) * np.exp(-t * 40) * 0.6 + np.sin(2 * np.pi * (110 + 80 * np.exp(-t * 30)) * t) * np.exp(-t * 9) * 0.9) * k).astype(np.float32)
def rumble(d=2.0, k=0.7):
    t = tv(d); n = len(t); return (seg("low", n) * np.minimum(t / 0.2, 1) * np.exp(-t * 1.6) * k + np.sin(2 * np.pi * 42 * t) * np.exp(-t * 2) * 0.5 * k).astype(np.float32)
def splash(d=2.0, k=1.0):
    t = tv(d); n = len(t); body = (seg("mid", n) * np.exp(-t * 4.5) + seg("high", n) * np.exp(-t * 8) * 0.7 + seg("low", n) * np.exp(-t * 3) * 0.9) * np.minimum(t / 0.01, 1)
    out = np.concatenate([body, np.zeros(int(0.3 * SR), np.float32)]).astype(np.float32)
    for _ in range(26):
        s = rng.uniform(0.05, d * 0.7); f = rng.uniform(500, 1500); l = int(0.05 * SR); i = int(s * SR); tt = np.arange(l) / SR
        out[i:i + l] += np.sin(2 * np.pi * (f * (1 + 4 * tt)) * tt) * np.exp(-tt * 70) * 0.3 * np.exp(-s * 1.2)
    return (out * k).astype(np.float32)
def bubbles(d=2.0, k=0.3, n_=18):
    out = np.zeros(int((d + 0.3) * SR), np.float32)
    for _ in range(n_):
        s = rng.uniform(0, d - 0.1); f = rng.uniform(300, 1100); l = int(0.06 * SR); i = int(s * SR); tt = np.arange(l) / SR
        out[i:i + l] += np.sin(2 * np.pi * (f * (1 + 6 * tt)) * tt) * np.exp(-tt * 55) * rng.uniform(0.3, 1)
    return out * k
def clink(n_=6, d=1.2, k=0.4):
    out = np.zeros(int((d + 0.3) * SR), np.float32)
    for _ in range(n_):
        s = rng.uniform(0, d * 0.7); f = rng.uniform(2800, 6200); l = int(0.18 * SR); i = int(s * SR); tt = np.arange(l) / SR
        out[i:i + l] += (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.47 * tt) + 0.3 * np.sin(2 * np.pi * f * 2.09 * tt)) * np.exp(-tt * rng.uniform(20, 40)) * rng.uniform(0.3, 1)
    return out * k
def thump(k=0.8):
    t = tv(0.35); return (np.sin(2 * np.pi * (52 + 40 * np.exp(-t * 40)) * t) * np.exp(-t * 15) * k).astype(np.float32)
def chime(f, d=2.2, k=0.35):
    t = tv(d); return ((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 2.2) * (1 - np.exp(-t * 300)) * k).astype(np.float32)
def chirp(k=0.12):
    d = 0.25; t = tv(d); f = rng.uniform(3000, 5200); return (np.sin(2 * np.pi * (f * (1 + 0.25 * np.sin(2 * np.pi * rng.uniform(14, 26) * t))) * t) * np.sin(np.pi * t / d) ** 2 * k).astype(np.float32)
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
def pluck(m, d=1.6, k=0.12):
    t = tv(d); f = mf(m); return ((np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 2.4) * (1 - np.exp(-t * 400)) * k).astype(np.float32)
def padnote(m, d, k=0.04):
    t = tv(d); f = mf(m); a = np.minimum(t / 1.0, 1) * np.clip((d - t) / 1.2, 0, 1)
    return ((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.003 * f * t) + 0.25 * np.sin(2 * np.pi * 0.997 * f * t + 1) + 0.15 * np.sign(np.sin(2 * np.pi * 1.002 * f * t))) * a * k).astype(np.float32)

# ---------- голос ----------
voice = np.zeros(N, np.float32); v = read_wav(f"{HERE}/audio/voice.wav"); voice[:len(v)] = v[:N]; voice *= 0.95 / np.abs(voice).max()
duck = 1 - 0.5 * np.clip(ma(np.abs(voice), 0.1 * SR) / 0.1, 0, 1); duck = ma(duck, 0.15 * SR)

# ---------- музыка ----------
music = np.zeros(N, np.float32)
bar = 3.5
chords_a = [([45, 57, 60, 64], 69), ([41, 53, 57, 60], 65), ([48, 55, 60, 64], 67), ([43, 55, 59, 62], 62)]   # Am F C G
chords_b = [([48, 55, 60, 64], 72), ([43, 55, 59, 62], 67), ([45, 57, 60, 64], 69), ([41, 53, 57, 60], 65)]   # C G Am F (светлее)
b = 0; tcur = 0.0
while tcur < TOTAL + 1:
    hopeful = tcur >= T_REL - 0.3
    ch = (chords_b if hopeful else chords_a)[b % 4]
    gain = 1.0 if tcur < T_COL - 0.2 else (0.0 if tcur < T_REL - 0.3 else 1.1)   # в тревожной части — только дрон и тремоло
    if gain > 0:
        for m in ch[0]: add(music, padnote(m, bar + 0.8, 0.045 if not hopeful else 0.055), tcur, gain)
        for k in range(8):   # арпеджио
            n_ = ch[0][1 + k % 3] + (12 if k % 4 == 3 else 0)
            add(music, pluck(n_, 1.4, 0.10 if not hopeful else 0.12), tcur + k * bar / 8 + 0.02, gain * (0.5 if tcur < 4 else 1))
        if hopeful or tcur > 8: add(music, pluck(ch[1], 2.5, 0.14), tcur, gain)
    tcur += bar; b += 1
# тревожная середина: низкий дрон, дрожащие струны, сердцебиение
tt = np.arange(N) / SR
a0, a1 = T_COL + 0.6, T_REL - 0.2
env = np.clip((tt - a0) / 1.5, 0, 1) * np.clip((a1 - tt) / 1.0, 0, 1)
tens = (np.sin(2 * np.pi * 55 * tt) * 0.5 + np.sin(2 * np.pi * 82.4 * tt) * 0.3 + np.sin(2 * np.pi * mf(81) * tt + 1.5 * np.sin(2 * np.pi * 6 * tt)) * 0.06 * (1 + np.sin(2 * np.pi * 0.2 * tt)) + np.sin(2 * np.pi * mf(82) * tt) * 0.05) * env
music += tens.astype(np.float32) * 0.28
pre = np.clip((tt - P(5)) / 2.0, 0, 1) * np.clip((T_COL - tt) / 0.2, 0, 1)   # нарастание перед обвалом
music += (np.sin(2 * np.pi * (55 + 25 * pre) * tt) * 0.35 + np.sin(2 * np.pi * 110 * tt) * 0.15).astype(np.float32) * pre * 0.35
music = reverb(music, 0.3, 2.4) * duck
# приглушение музыки «под водой»
muf = lowpass(music, 450); w = np.clip((tt - (T_COL + 0.45)) / 0.15, 0, 1) * np.clip((T_REL + 0.2 - tt) / 0.6, 0, 1)
music = music * (1 - w * 0.8) + muf * w * 0.8

# ---------- эффекты ----------
sfx = np.zeros(N, np.float32); amb = np.zeros(N, np.float32)
# ветер, птицы, река
wind = NB["low"] * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 7.3 + 1) ** 2) * 0.10 + NB["body"] * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 4.1))
river = NB["mid"] * (0.05 + 0.07 * np.clip((tt - 4) / 8, 0, 1)) * (0.7 + 0.3 * np.sin(2 * np.pi * tt * 0.6))
sil = 1 - np.clip(1 - np.abs(tt - (T_COL + 0.65)) / 0.5, 0, 1) * 0.0
amb += (wind + river).astype(np.float32)
for _ in range(14): add(sfx, chirp(0.09), rng.uniform(0.2, 9.0))
# шаги по тропе: быстрые, тяжёлый мешок (звон монет)
tw = 0.15
while tw < P(2) + 0.2: add(sfx, step_dirt(0.55), tw); add(sfx, clink(2, 0.3, 0.1), tw + 0.02); tw += 0.515
# старт: удар и свуш в первом кадре
add(sfx, whoosh(0.8, True, 0.5), 0.1); add(sfx, thump(0.8), 0.15)
# смены кадров — лёгкие свуши
cuts = [P(1) - 0.15, P(2) - 0.25, P(3) - 0.2, P(4) - 0.2, P(5) - 0.15, P(5) + 1.3, P(6) - 0.05, T_COL - 0.1, T_COL + 0.9, P(8) - 0.15, P(9) - 0.2, P(10) - 0.2, PE(10) + 0.3, T_HAUL - 0.2, T_SIT - 0.1, P(12) - 0.2, T_WALK + 0.4]
for c in cuts: add(sfx, whoosh(0.28, True, 0.35), c - 0.12)
# мост: шаги, скрип, нарастание
t_ = P(5) - 0.4; k = 0
while t_ < T_COL - 0.1:
    add(sfx, step_wood(0.7), t_); add(sfx, clink(2, 0.3, 0.1), t_ + 0.03)
    if k % 2 == 0: add(sfx, creak(0.8, 0.22 + 0.4 * min(1, (t_ - P(5)) / 5)), t_ + 0.05)
    t_ += 0.44; k += 1
for tc in np.linspace(P(6) + 0.2, T_COL - 0.3, 6): add(sfx, creak(0.7, 0.55), tc)
for tc in (P(6) + 1.2, P(6) + 2.1, T_COL - 0.45): add(sfx, snap(0.35), tc)
add(sfx, riser(T_COL - P(6) - 0.2, 0.5), P(6))
# сердцебиение перед обвалом
t_ = P(6); gap = 0.75
while t_ < T_COL - 0.1: add(sfx, thump(0.7), t_); add(sfx, thump(0.5), t_ + 0.2); gap = max(0.42, gap - 0.05); t_ += gap
# обвал
for i, tc in enumerate((0.0, 0.08, 0.17, 0.3, 0.46)): add(sfx, snap(0.9 - 0.1 * i), T_COL + tc)
add(sfx, rumble(2.0, 0.9), T_COL); add(sfx, impact(2.0, 0.6), T_COL + 0.05)
add(sfx, splash(2.2, 1.0), T_COL + 0.38); add(sfx, clink(14, 1.4, 0.5), T_COL + 0.4); add(sfx, bubbles(2.5, 0.3, 24), T_COL + 0.55)
# тишина после — потом тяжёлое «подводное» состояние: сердцебиение и пузыри
t_ = T_COL + 1.4
while t_ < T_REL - 0.5: add(sfx, thump(0.55), t_); add(sfx, thump(0.4), t_ + 0.22); t_ += 0.8 if t_ < P(10) else 0.62
for tc in np.arange(T_COL + 1.0, T_REL, 1.7): add(sfx, bubbles(1.5, 0.18, 8), tc)
for tc in np.arange(P(8), T_REL - 0.4, 0.55): add(sfx, splash(0.7, 0.18), tc)
# старик бежит, падает на колени
for j in range(4): add(sfx, step_dirt(0.65), P(9) + j * 0.19)
add(sfx, whoosh(0.5, True, 0.5), P(9) + 0.1); add(sfx, step_dirt(0.9), P(9) + 0.85)
# отпускание: звон, плюх, тишина, потом тёплый аккорд
add(sfx, clink(16, 1.6, 0.5), T_REL - 0.55); add(sfx, splash(1.2, 0.5), T_REL - 0.5); add(sfx, bubbles(2.0, 0.25, 14), T_REL - 0.4)
add(sfx, whoosh(1.4, False, 0.5), T_REL - 0.2)
add(sfx, impact(3.0, 0.5), T_REL + 0.45)
for i, m in enumerate((72, 76, 79, 84)): add(sfx, chime(mf(m), 3.0, 0.3), T_REL + 0.5 + i * 0.12)
# хватка рук и подъём на берег
add(sfx, thump(1.0), T_HAUL - 0.35); add(sfx, step_wood(0.6), T_HAUL - 0.35)
add(sfx, splash(1.8, 0.7), T_HAUL + 0.8); add(sfx, whoosh(0.9, True, 0.6), T_HAUL + 0.5)
add(sfx, step_dirt(0.9), T_HAUL + 1.7); add(sfx, step_dirt(0.7), T_HAUL + 1.9)
# финал: шаги по траве, птицы
t_ = T_WALK + 0.2
while t_ < TOTAL - 1.2: add(sfx, step_dirt(0.4), t_); t_ += 0.5
for _ in range(10): add(sfx, chirp(0.1), rng.uniform(T_REL + 2, TOTAL - 1))
add(sfx, impact(3.0, 0.5), P(13) + 0.05); add(sfx, chime(mf(84), 4.0, 0.3), P(13) + 0.1)
sfx = reverb(sfx, 0.22, 1.8, 5000)

# ---------- микс ----------
mix = voice * 1.0 + music * 1.9 + sfx * 0.8 + amb * 1.0
end = int(TOTAL * SR); mix[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR)); f = int(1.6 * SR); mix[end - f:end] *= np.linspace(1, 0, f); mix[end:] = 0
mix = np.tanh(mix * 1.15) / np.tanh(1.15); mix = mix[:end]; mix = mix / np.abs(mix).max() * 0.93
bus = (music + sfx + amb)[:end] * 0.5; wide = np.zeros(end, np.float32); sh = int(0.012 * SR); wide[sh:] = bus[:-sh]
Lc = mix + 0.14 * (bus - wide); Rc = mix - 0.14 * (bus - wide); sig = np.stack([Lc, Rc], 1); sig = sig / np.abs(sig).max() * 0.93
with wave.open(sys.argv[1], "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sig * 32767).astype(np.int16).tobytes())
_m = np.abs(voice) > 0.02; db = lambda a: 20 * np.log10(np.sqrt((a[_m] ** 2).mean()) + 1e-9)
print("bus RMS during speech dB: voice %.1f music %.1f sfx %.1f amb %.1f" % (db(voice), db(music * 1.35), db(sfx * 0.62), db(amb * 0.9)), "audio ok", round(TOTAL, 2))
