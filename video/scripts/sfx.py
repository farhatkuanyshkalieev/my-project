"""Саунд-дизайн под референс: озвучка (Kokoro TTS) + музыка + ~60 эффектов.
Только numpy + ffmpeg. Результат: public/mix.wav (44.1 кГц, стерео)."""
import os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
FPS = 30
TOTAL = 621
N = int(TOTAL / FPS * SR) + SR
rng = np.random.default_rng(11)
music = np.zeros((N, 2))
fx = np.zeros((N, 2))
vo = np.zeros((N, 2))


def T(n):
    return np.arange(n) / SR


def F(frame):
    return frame / FPS


def place(bus, sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if sig.ndim == 1:
        sig = np.stack([sig * np.sqrt((1 - pan) / 2), sig * np.sqrt((1 + pan) / 2)], 1)
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), N - i)
    if n > 0:
        bus[i:i + n] += sig[:n] * gain


def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if hi:
        m /= 1 + (f / hi) ** 4
    if lo:
        m /= 1 + (lo / np.maximum(f, 1)) ** 4
    return np.fft.irfft(X * m, len(x))


def env(n, a=0.002, d=0.1):
    t = T(n)
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def chirp(f0, f1, n, curve=1.0):
    k = np.linspace(0, 1, n) ** curve
    return np.cumsum(f0 * (f1 / f0) ** k) / SR * 2 * np.pi


def noise(n):
    return rng.standard_normal(n)


# ---------- эффекты ----------

def whoosh(dur=0.5, up=True, bright=1.0):
    n = int(dur * SR)
    x = noise(n)
    k = np.linspace(0, 1, n)
    lowp, highp = filt(x, hi=600), filt(x, lo=2000, hi=9000 * bright)
    mix = k if up else 1 - k
    shape = np.sin(np.pi * k) ** 1.5
    s = (lowp * (1 - mix) * 1.7 + highp * mix * 0.7) * shape
    return np.stack([s * (1 - 0.7 * k), s * (0.3 + 0.7 * k)], 1)


def swish(dur=0.25):
    n = int(dur * SR)
    k = np.linspace(0, 1, n)
    s = filt(noise(n), lo=3000, hi=11000) * np.sin(np.pi * k) ** 3
    return s * 0.7


def impact(dur=1.2, pitch=140, gain=1.0):
    n = int(dur * SR)
    sub = np.sin(chirp(pitch, 38, n, 0.25)) * env(n, 0.001, 0.35)
    body = filt(noise(n), hi=1500) * env(n, 0.001, 0.08)
    return np.tanh((sub * 1.4 + body * 0.7) * 1.8) * 0.8 * gain


def pen(dur=0.3, strokes=5):
    n = int(dur * SR)
    x = filt(noise(n), lo=1200, hi=5000)
    am = np.zeros(n)
    for _ in range(strokes):
        c = rng.integers(0, n)
        w = int(rng.uniform(0.02, 0.07) * SR)
        a, b = max(0, c - w), min(n, c + w)
        am[a:b] += np.hanning(b - a) * rng.uniform(0.5, 1)
    return x * np.clip(am, 0, 1.2) * 0.35


def beep(dur, f=880):
    n = int(dur * SR)
    e = np.ones(n)
    r = int(0.004 * SR)
    e[:r] = np.linspace(0, 1, r)
    e[-r:] = np.linspace(1, 0, r)
    return np.sin(2 * np.pi * f * T(n)) * e * 0.22


def zap():
    n = int(0.16 * SR)
    s = np.sign(np.sin(chirp(1600, 90, n, 0.5))) * 0.5 + noise(n) * 0.5
    s = np.repeat(s[::30], 30)[:n]
    return np.tanh(s * 2) * env(n, 0.001, 0.07) * 0.45


def shing(dur=0.9, base=2100):
    n = int(dur * SR)
    t = T(n)
    s = sum(np.sin(2 * np.pi * base * r * t + rng.random() * 6) / (i + 1) for i, r in enumerate([1, 1.52, 2.21, 2.93, 3.71]))
    s = s * env(n, 0.003, 0.25)
    s += filt(noise(n), lo=5000) * np.linspace(1, 0, n) ** 3 * 0.25
    return s * 0.25


def splat():
    n = int(0.22 * SR)
    blob = np.sin(chirp(420, 70, n, 0.3)) * env(n, 0.001, 0.05)
    wet = filt(noise(n), lo=200, hi=2500) * env(n, 0.001, 0.03)
    return (blob * 0.8 + wet * 0.6) * 0.7


def boom():
    n = int(0.7 * SR)
    s = filt(noise(n), hi=900) * env(n, 0.002, 0.12) * 1.2
    s += np.sin(chirp(110, 40, n, 0.4)) * env(n, 0.001, 0.2)
    crackle = np.zeros(n)
    idx = rng.integers(0, int(0.4 * SR), 60)
    crackle[idx] = rng.standard_normal(60)
    s += filt(crackle, lo=2000) * 2
    return np.tanh(s * 1.5) * 0.6


def bitglitch(dur=0.25):
    n = int(dur * SR)
    step = int(0.025 * SR)
    s = np.zeros(n)
    for i in range(0, n, step):
        f = rng.choice([220, 330, 440, 660, 880, 1320])
        s[i:i + step] = np.sign(np.sin(2 * np.pi * f * T(min(step, n - i))))
    return s * 0.12 * env(n, 0.001, dur * 0.8)


def shutter():
    n = int(0.12 * SR)
    c = np.zeros(n)
    for at, a in ((0, 1.0), (int(0.035 * SR), 0.7)):
        m = int(0.012 * SR)
        c[at:at + m] += filt(noise(m), lo=1500, hi=8000) * env(m, 0.0002, 0.003) * a
    return c * 1.2


def scratch(dur=0.5):
    n = int(dur * SR)
    t = T(n)
    rate = 400 + 350 * np.sin(2 * np.pi * 5 * t) * np.sin(2 * np.pi * 1.3 * t)
    ph = np.cumsum(np.abs(rate)) / SR * 2 * np.pi
    s = np.sin(ph) * 0.4 + filt(noise(n), lo=500, hi=3000) * (np.abs(np.sin(2 * np.pi * 5 * t)) * 0.6)
    return s * np.sin(np.pi * np.linspace(0, 1, n)) * 0.5


def plink(f):
    n = int(0.5 * SR)
    t = T(n)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)
    return s * env(n, 0.002, 0.15) * 0.22


def swell(dur=0.6):
    n = int(dur * SR)
    k = np.linspace(0, 1, n)
    s = filt(noise(n), lo=2000, hi=12000) * k ** 3 * 0.5
    s += np.sin(chirp(300, 900, n, 1.5)) * k ** 3 * 0.1
    return s


def blip():
    n = int(0.14 * SR)
    a = np.sign(np.sin(2 * np.pi * 988 * T(n // 2)))
    b = np.sign(np.sin(2 * np.pi * 1319 * T(n - n // 2)))
    return np.concatenate([a, b]) * env(n, 0.001, 0.1) * 0.12


def tick():
    n = int(0.05 * SR)
    return filt(noise(n), lo=2500, hi=7000) * env(n, 0.0005, 0.01) * 0.25


def hum(dur=0.5):
    n = int(dur * SR)
    t = T(n)
    s = np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 220.7 * t)
    return s * np.sin(np.pi * np.linspace(0, 1, n)) * 0.18


# ---------- партитура эффектов (кадры = референс) ----------
place(fx, whoosh(0.35, False), 0.0, gain=0.8)
place(fx, pen(0.18, 3), F(4), gain=1.0)
for i, d in enumerate([0.03, 0.09, 0.03, 0.09, 0.09, 0.03, 0.03, 0.03, 0.12]):
    place(fx, beep(d, 900), F(12) + i * 0.07, gain=0.7)
place(fx, pen(0.25, 6), F(18), gain=1.0)
for at in (24, 30, 36, 41):
    place(fx, pen(0.18, 4), F(at), pan=rng.uniform(-0.4, 0.4), gain=0.9)
place(fx, zap(), F(54), gain=1.1)
place(fx, shing(1.0), F(58), pan=-0.5, gain=1.0)
place(fx, whoosh(0.5, True), F(58), gain=0.5)
place(fx, swell(0.4), F(96), gain=0.5)
place(fx, impact(1.4, 120), F(108), gain=0.8)
place(fx, whoosh(0.5, True), F(106), gain=0.9)
place(fx, whoosh(0.35, False), F(112), pan=0.4, gain=0.7)
place(fx, swish(0.2), F(128), pan=0.4, gain=0.9)
place(fx, swish(0.3), F(138), pan=0.3, gain=1.0)
place(fx, swell(0.4), F(160), gain=0.6)
place(fx, whoosh(0.4, True), F(169), gain=0.6)
place(fx, whoosh(0.4, False), F(184), gain=0.5)
place(fx, bitglitch(0.17), F(189), gain=1.0)
place(fx, impact(1.0, 160), F(193), gain=0.7)
for at, p in ((198, -0.3), (209, 0.4), (225, -0.2)):
    place(fx, splat(), F(at), pan=p, gain=0.9)
place(fx, whoosh(1.5, True, 0.6), F(196), gain=0.35)
place(fx, boom(), F(210), pan=0.5, gain=0.9)
place(fx, boom(), F(228), pan=-0.5, gain=0.9)
place(fx, impact(0.9, 150), F(243), gain=0.7)
place(fx, shing(0.7, 2600), F(243), pan=-0.2, gain=0.9)
place(fx, whoosh(0.3, True), F(256), gain=0.5)
place(fx, whoosh(0.4, False), F(270), gain=0.9)
for at in (277, 287):
    place(fx, swish(0.18), F(at), pan=0.5, gain=0.7)
place(fx, impact(0.8, 130), F(294), gain=0.6)
place(fx, whoosh(0.45, True), F(294), pan=-0.3, gain=0.8)
place(fx, pen(0.2, 3), F(298), gain=0.6)
place(fx, whoosh(0.3, False), F(313), gain=0.5)
place(fx, whoosh(0.35, True), F(320), gain=1.1)
place(fx, scratch(0.45), F(328), gain=1.0)
for at, fr in ((331, 1046.5), (336, 1318.5), (337.5, 1568.0), (342, 880.0), (346, 1174.7)):
    place(fx, plink(fr), F(at), pan=rng.uniform(-0.5, 0.5), gain=1.0)
place(fx, whoosh(0.5, True), F(349), gain=1.1)
place(fx, splat(), F(360), gain=0.8)
place(fx, whoosh(0.4, False), F(364), gain=0.6)
for at in (374, 378, 383, 386, 392, 395):
    place(fx, splat(), F(at), pan=rng.uniform(-0.6, 0.6), gain=0.7)
for at in (376, 377):
    place(fx, pen(0.25, 5), F(at), pan=rng.uniform(-0.5, 0.5), gain=0.8)
place(fx, whoosh(0.6, True), F(404), gain=1.1)
place(fx, shing(0.8, 1700), F(410), gain=0.5)
for at in (425, 437):
    place(fx, tick(), F(at), gain=0.8)
for i in range(6):
    place(fx, plink(2637 + i * 200) * 0.25, F(430 + i * 6), pan=rng.uniform(-0.6, 0.6))
place(fx, zap(), F(463), gain=0.6)
place(fx, whoosh(0.4, True), F(466), gain=0.9)
place(fx, blip(), F(474), gain=1.0)
place(fx, impact(0.6, 90), F(480), gain=0.6)
place(fx, shutter(), F(484), gain=1.2)
place(fx, hum(0.3), F(488), gain=1.0)
place(fx, impact(0.6, 120), F(493), gain=0.8)
place(fx, scratch(0.35), F(498), gain=1.0)
place(fx, swell(0.35), F(505), gain=0.9)
place(fx, whoosh(0.45, True), F(512), gain=1.1)
for at in (532, 546, 560, 572, 578, 583, 587, 590, 593, 596, 598, 600):
    place(fx, pen(0.17, 3), F(at), pan=rng.uniform(-0.6, 0.6), gain=0.45)
place(fx, swell(0.25), F(601), gain=0.8)
place(fx, pen(0.2, 8), F(603), gain=1.0)
place(fx, impact(0.5, 150), F(609), gain=0.8)
place(fx, whoosh(0.3, False), F(613), gain=0.8)

# ---------- музыка: эмбиент-пад + мягкое пианино ----------
def piano(f, dur):
    n = int(dur * SR)
    t = T(n)
    s = sum(np.sin(2 * np.pi * f * h * t) * a * np.exp(-t * (1.5 + h)) for h, a in ((1, 1), (2, 0.4), (3, 0.15), (4, 0.06)))
    return s * env(n, 0.004, 10) * 0.16


def pad(freqs, dur):
    n = int(dur * SR)
    t = T(n)
    s = np.zeros(n)
    for fr in freqs:
        for det in (-0.2, 0.0, 0.25):
            ph = 2 * np.pi * fr * (1 + det / 100) * t + rng.random() * 6
            s += 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = filt(s, hi=900)
    return s * np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6) * 0.035


chords = [[146.8, 185.0, 220.0, 277.2], [123.5, 146.8, 185.0, 220.0], [98.0, 146.8, 185.0, 246.9], [110.0, 138.6, 164.8, 220.0]]
bar = 2.5
for b in range(9):
    t0 = b * bar
    ch = chords[b % 4]
    place(music, pad(ch, bar + 0.8), t0 - 0.4)
    for i, fr in enumerate([ch[0] * 2, ch[2] * 2, ch[3] * 2, ch[1] * 4]):
        place(music, piano(fr, 2.2), t0 + i * bar / 4 + 0.02, pan=(i - 1.5) * 0.25)

# ---------- озвучка ----------
VO = [('p1', 0.03, 0.88), ('p2', 3.44, 1), ('p3', 5.08, 1), ('p4', 7.8, 1), ('p5', 9.45, 1), ('p6', 10.98, 1), ('p7', 13.15, 0.8)]


def load(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768
        return x.reshape(-1, w.getnchannels()).mean(1)


tmp = os.path.join(ROOT, 'public', 'vo', '_tmp.wav')
voenv = np.zeros(N)
for name, at, tempo in VO:
    src = os.path.join(ROOT, 'public', 'vo', f'{name}.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f'atempo={tempo}', '-ar', str(SR), '-ac', '1', tmp], check=True)
    x = load(tmp)
    x = x / (np.abs(x).max() + 1e-9) * 0.8
    place(vo, x, at)
    i = int(at * SR)
    voenv[i:i + len(x)] = 1
os.remove(tmp)

# лёгкая «комнатная» реверберация на голос и эффекты
def reverb(bus, mix=0.15, dec=0.3):
    ir_n = int(1.2 * SR)
    ir = filt(noise(ir_n) * np.exp(-T(ir_n) / dec), hi=5000)
    ir /= np.abs(ir).sum() / 6
    L = 1 << int(np.ceil(np.log2(N + ir_n)))
    I = np.fft.rfft(ir, L)
    for c in range(2):
        bus[:, c] += np.fft.irfft(np.fft.rfft(bus[:, c], L) * I, L)[:N] * mix

reverb(fx, 0.18)
reverb(vo, 0.06, 0.2)

# дакинг музыки под голос
k = int(0.15 * SR)
sm = np.convolve(voenv, np.ones(k) / k, 'same')
duck = 1 - 0.5 * sm

mix = music * duck[:, None] * 0.9 + fx * 0.85 + vo * 1.0
mix = np.tanh(mix * 1.15)
mix /= np.abs(mix).max() / 0.92
mix = mix[: int(TOTAL / FPS * SR)]
fade = int(0.02 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
out = os.path.join(ROOT, 'public', 'mix.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', round(len(mix) / SR, 2), 's')
