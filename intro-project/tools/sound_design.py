"""Небесный саунд-дизайн для интро. Всё привязано к кадрам (60 fps)."""
import numpy as np
from scipy import signal
import sys, os

SR = 48000
FPS = 60
DUR = 800 / FPS + 1.2  # хвост реверба
N = int(DUR * SR)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))

dry = np.zeros((N, 2))
wet = np.zeros((N, 2))  # посыл в реверб


def at(frame):
    return int(frame / FPS * SR)


def place(buf, x, frame, gain=1.0, pan=0.0, send=0.5):
    """x: mono или stereo; pan -1..1 (equal power)"""
    i = at(frame)
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1)
    n = min(len(x), N - i)
    if n <= 0:
        return
    dry[i:i + n] += x[:n] * gain
    wet[i:i + n] += x[:n] * gain * send


def env(n, a, d, curve=4.0):
    """атака a сек, экспоненциальное затухание к концу"""
    t = np.arange(n) / SR
    e = np.exp(-t * curve / max(d, 1e-3))
    na = max(1, int(a * SR))
    e[:na] *= np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    return e


def note(name):
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[n] + (o - 4) * 12) / 12)


# ---------------- инструменты ----------------
def bell(f, dur=2.5, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    partials = [(1, 1.0, 1.0), (2.0, 0.45, 1.6), (2.76, 0.3 * bright, 2.2), (4.07, 0.18 * bright, 3.0), (5.43, 0.08 * bright, 4.0)]
    for ratio, amp, dec in partials:
        if f * ratio > 16000:
            continue
        ph = rng.uniform(0, 2 * np.pi)
        out += amp * np.sin(2 * np.pi * f * ratio * t + ph) * np.exp(-t * dec * 2.2 / dur)
    return out * env(n, 0.004, dur, 1.0)


def glass(f, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.002 * np.sin(2 * np.pi * 5 * t)
    out = np.sin(2 * np.pi * f * vib * t)
    if f * 2 < 16000:
        out += 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 6)
    if f * 3.01 < 16000:
        out += 0.15 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 9)
    return out * env(n, 0.003, dur, 4.5)


def pluck(f, dur=1.8, damp=0.996):
    """Karplus-Strong: арфа/калимба"""
    n = int(dur * SR)
    p = int(SR / f)
    buf = rng.uniform(-1, 1, p)
    buf = signal.lfilter([0.5, 0.5], [1], buf)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(n, 0.002, dur, 2.5)


def pluck_fast(f, dur=1.6):
    # быстрая аддитивная «калимба»
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.3 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 12) + 0.12 * np.sin(2 * np.pi * f * 5.95 * t) * np.exp(-t * 20)
    return out * env(n, 0.002, dur, 0.5)


def pad(freqs, dur=3.0, attack=0.6, release=1.5, bright=0.4):
    """ангельский пэд: детюн синусы + лёгкое дыхание"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    L = np.zeros(n)
    R = np.zeros(n)
    for f in freqs:
        for d in (-0.35, 0.0, 0.35):
            fr = f * 2 ** (d * 7 / 1200)
            lfo = 1 + 0.0025 * np.sin(2 * np.pi * rng.uniform(4.5, 5.5) * t + rng.uniform(0, 6))
            ph = rng.uniform(0, 2 * np.pi)
            s = np.sin(2 * np.pi * fr * lfo * t + ph) + bright * 0.3 * np.sin(2 * np.pi * 2 * fr * t + ph) + bright * 0.12 * np.sin(2 * np.pi * 3 * fr * t)
            pan = d / 0.35 * 0.6
            L += s * np.cos((pan + 1) * np.pi / 4)
            R += s * np.sin((pan + 1) * np.pi / 4)
    e = np.ones(n)
    na, nr = int(attack * SR), int(release * SR)
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    out = np.stack([L, R], 1) * e[:, None]
    # дыхание хора
    breath = band_noise(n, 1800, 3500) * 0.05
    out += np.stack([breath, np.roll(breath, 300)], 1) * e[:, None]
    return out / (len(freqs) * 3)


def band_noise(n, lo, hi):
    x = rng.standard_normal(n)
    sos = signal.butter(2, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def air_whoosh(dur, f0, f1, peak=0.5, width=0.6, stereo_sweep=(0, 0)):
    """воздушный пролёт: шум с движущейся полосой (STFT-маска)"""
    n = int(dur * SR)
    x = rng.standard_normal(n)
    f, tt, Z = signal.stft(x, SR, nperseg=1024)
    fc = np.exp(np.interp(tt / dur, [0, 1], [np.log(f0), np.log(f1)]))
    mask = np.exp(-0.5 * (np.log(np.maximum(f[:, None], 20) / fc[None, :]) / width) ** 2)
    _, y = signal.istft(Z * mask, SR, nperseg=1024)
    y = y[:n]
    tt2 = np.linspace(0, 1, n)
    e = np.where(tt2 < peak, (tt2 / peak) ** 2, ((1 - tt2) / (1 - peak)) ** 1.5)
    y = y * e
    y /= np.max(np.abs(y)) + 1e-9
    p = np.linspace(stereo_sweep[0], stereo_sweep[1], n)
    return np.stack([y * np.cos((p + 1) * np.pi / 4), y * np.sin((p + 1) * np.pi / 4)], 1)


def sub(f=55, dur=1.2, drop=2.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f * (1 + drop * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * env(n, 0.003, dur, 3.5)


def drop_sound(f0=900, f1=1500, dur=0.35):
    """капля / «бульк» — синус с быстрым подъёмом тона"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f0 + (f1 - f0) * (1 - np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * env(n, 0.002, dur, 7.0)


def tick(f=3200, dur=0.06):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = band_noise(n, 1500, 7000) * np.exp(-t * 120) * 0.6 + np.sin(2 * np.pi * f * t) * np.exp(-t * 90) * 0.5
    return x


def keytap(i):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (180 + 20 * i) * t) * np.exp(-t * 60)
    click = band_noise(n, 2000, 6000) * np.exp(-t * 200) * 0.5
    tone = np.sin(2 * np.pi * note(['D6', 'E6', 'F#6', 'A6', 'B6', 'D7'][i % 6]) * t) * np.exp(-t * 25) * 0.25
    return body * 0.6 + click + tone


def sparkle(dur=1.2, density=28, lo=2400, hi=7000):
    hi = min(hi, 6500); lo = min(lo, 5000)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for _ in range(int(density * dur)):
        f = rng.uniform(lo, hi)
        s = glass(f, 0.5) * rng.uniform(0.1, 0.35)
        i = int(rng.uniform(0, 1) ** 0.7 * (n - len(s)))
        p = rng.uniform(-0.9, 0.9)
        out[i:i + len(s), 0] += s * np.cos((p + 1) * np.pi / 4)
        out[i:i + len(s), 1] += s * np.sin((p + 1) * np.pi / 4)
    return out


def reverse_swell(freqs, dur=0.9):
    x = pad(freqs, dur, attack=0.02, release=0.02, bright=0.8)
    e = np.linspace(0, 1, len(x)) ** 3
    return x * e[:, None]


def load_pack(name):
    a = np.fromfile(os.path.join(HERE, name + '.f32'), dtype=np.float32).reshape(-1, 2).astype(float)
    return a / (np.max(np.abs(a)) + 1e-9)


def soften(x, cutoff=6000):
    sos = signal.butter(2, cutoff, fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


WH = soften(load_pack('whoosh'), 7000)
EWH = soften(load_pack('ewhoosh'), 6000)
BWH = soften(load_pack('bigwhoosh'), 5000)

DMAJ9 = [note('D3'), note('A3'), note('C#4'), note('E4'), note('F#4'), note('A4')]
HIGH = [note('D5'), note('F#5'), note('A5'), note('C#6'), note('E6')]

# ================= 1. Figma «H» (0–42) =================
place(dry, glass(note('A6'), 0.8), 2, 0.25, 0.0, 0.6)
place(dry, air_whoosh(0.35, 800, 3000, 0.5, 0.5, (-0.6, 0.2)), 4, 0.22, send=0.4)
place(dry, air_whoosh(0.35, 1000, 3500, 0.5, 0.5, (0.2, 0.6)), 16, 0.18, send=0.4)
place(dry, reverse_swell(HIGH, 0.6), 4, 0.6, send=0.5)
place(dry, bell(note('D6'), 3.0), 40, 0.35, -0.2, 0.9)
place(dry, bell(note('A6'), 3.0), 40, 0.22, 0.3, 0.9)
place(dry, sparkle(0.9, 20), 40, 0.35, send=0.8)
place(dry, sub(50, 1.0, 1.5), 40, 0.35, send=0.1)

# ================= 2. Hi + рука (42–110) =================
place(dry, air_whoosh(0.25, 1500, 600, 0.3, 0.5, (0.7, 0.0)), 42, 0.25, send=0.3)
place(dry, drop_sound(700, 1250, 0.3), 45, 0.35, 0.1, 0.5)
for j, nn in enumerate(['F#5', 'A5', 'D6']):
    place(dry, pluck_fast(note(nn), 1.4), 48 + j * 5, 0.32, 0.3 + j * 0.15, 0.6)
for j, fr in enumerate([66, 78, 90]):
    place(dry, glass(note(['E7', 'C#7', 'F#7'][j]), 0.8), fr, 0.12, 0.6 - j * 0.3, 0.9)
place(dry, sub(45, 0.8, 2.5), 98, 0.45, send=0.05)
place(dry, tick(5200, 0.05), 98, 0.25, -0.3, 0.3)
place(dry, tick(4200, 0.05), 100, 0.2, 0.3, 0.3)

# ================= 3. I'm (110–180) =================
place(dry, EWH, 104, 0.22, send=0.5)
place(dry, pad(DMAJ9, 2.2, attack=0.15, release=1.4, bright=0.5), 110, 0.55, send=0.8)
place(dry, bell(note('F#5'), 2.5), 111, 0.22, 0.0, 0.8)
place(dry, tick(3600), 128, 0.25, -0.2, 0.4)
place(dry, keytap(0), 144, 0.35, -0.1, 0.3)
place(dry, glass(note('B6'), 0.6), 144, 0.1, 0.2, 0.7)
place(dry, air_whoosh(0.45, 2500, 500, 0.35, 0.6, (0.0, 0.0)), 162, 0.35, send=0.5)
place(dry, sub(60, 0.6, 1.0), 182, 0.25, send=0.1)

# ================= 4. Имя (192–290) =================
for i in range(6):
    place(dry, keytap(i), 110 + 82 + i * 5, 0.42, -0.2 + i * 0.08, 0.35)
place(dry, glass(note('D7'), 1.2), 110 + 112, 0.12, 0.3, 0.9)
# буквы падают — арфа вниз
for j, nn in enumerate(['A6', 'F#6', 'E6', 'D6', 'A5']):
    place(dry, pluck_fast(note(nn), 1.5), 110 + 156 + j * 4, 0.28, 0.5 - j * 0.2, 0.7)
# кольцо появляется
place(dry, bell(note('D6'), 2.8), 110 + 184, 0.3, -0.1, 0.9)
place(dry, sparkle(0.6, 25, 3000, 8000), 110 + 184, 0.3, send=0.9)

# ================= 5. Your + точка (308–370) =================
place(dry, air_whoosh(0.3, 900, 2200, 0.5, 0.5, (-0.7, 0.0)), 110 + 197, 0.25, send=0.4)
place(dry, air_whoosh(0.3, 900, 2200, 0.5, 0.5, (0.7, 0.0)), 110 + 199, 0.22, send=0.4)
place(dry, drop_sound(500, 900, 0.3), 110 + 206, 0.35, 0.0, 0.5)
place(dry, drop_sound(700, 1400, 0.35), 110 + 213, 0.4, 0.0, 0.6)  # прыжок
place(dry, pluck_fast(note('A5'), 1.0), 110 + 229, 0.3, 0.0, 0.6)  # приземление
place(dry, drop_sound(900, 1600, 0.3), 110 + 229, 0.3, 0.0, 0.6)
place(dry, pluck_fast(note('D6'), 1.2), 110 + 241, 0.28, 0.0, 0.7)
place(dry, glass(note('F#7'), 1.0), 110 + 243, 0.1, 0.2, 0.9)
place(dry, EWH, 110 + 240, 0.3, send=0.5)

# ================= 6. Глаз (370–470) =================
place(dry, pad([note('A3'), note('E4'), note('B4'), note('C#5')], 1.6, 0.25, 1.0, 0.3), 370, 0.4, send=0.8)
place(dry, drop_sound(400, 800, 0.4), 371, 0.3, 0.0, 0.5)
place(dry, air_whoosh(0.22, 1500, 3000, 0.5, 0.4, (-0.3, 0.5)), 378, 0.15, send=0.4)
place(dry, tick(2600, 0.05), 400, 0.18, 0.0, 0.5)  # моргание
place(dry, tick(2200, 0.05), 405, 0.14, 0.0, 0.5)
place(dry, air_whoosh(0.25, 2500, 1200, 0.5, 0.4, (0.5, -0.5)), 412, 0.18, send=0.4)
# буквы в зрачке — стеклянная восходящая гамма
for j, nn in enumerate(['D6', 'E6', 'F#6', 'G#6', 'A6', 'B6', 'C#7', 'D7']):
    place(dry, glass(note(nn), 0.9), 370 + 60 + 3 * j + 3, 0.14, -0.6 + j * 0.17, 0.85)
# подъём в «Creative»
riser = air_whoosh(0.75, 300, 6000, 0.95, 0.5)
place(dry, riser, 425, 0.35, send=0.7)
place(dry, reverse_swell(DMAJ9 + HIGH, 0.75), 425, 0.6, send=0.7)

# ================= 7. Creative ___ (470–580) =================
place(dry, pad(DMAJ9 + [note('D5')], 3.4, 0.03, 2.5, 0.7), 470, 0.55, send=0.9)
place(dry, bell(note('A5'), 3.5), 470, 0.3, -0.3, 0.9)
place(dry, bell(note('D6'), 3.5), 470, 0.25, 0.3, 0.9)
place(dry, sub(44, 1.4, 1.2), 470, 0.4, send=0.05)
place(dry, sparkle(1.4, 22), 470, 0.32, send=0.9)
place(dry, air_whoosh(0.4, 2500, 5000, 0.6, 0.35, (-0.5, 0.4)), 474, 0.12, send=0.4)  # подчёркивание
for k, (fr, nn) in enumerate([(510, ['E5', 'G#5', 'B5']), (532, ['F#5', 'A5', 'C#6']), (554, ['A5', 'C#6', 'E6'])]):
    for j, x in enumerate(nn):
        place(dry, bell(note(x), 1.8, 0.6), fr, 0.17, -0.4 + j * 0.4, 0.8)
    place(dry, sub(52, 0.5, 1.0), fr, 0.25, send=0.05)
    place(dry, glass(note(nn[-1]) * 2, 0.7), fr + 1, 0.08, 0.5, 0.9)

# ================= 8. Логотип (580–800) =================
L0 = 580
# схлопывание: всасывающий обратный свелл в точку
place(dry, reverse_swell([note('D4'), note('A4'), note('E5'), note('F#5')], 0.25), L0, 0.5, send=0.6)
place(dry, air_whoosh(0.25, 4000, 600, 0.85, 0.5), L0, 0.3, send=0.5)
place(dry, glass(note('D7'), 1.5), L0 + 14, 0.2, 0.0, 0.9)
place(dry, sub(48, 0.7, 0.6), L0 + 16, 0.35, send=0.05)
place(dry, sub(48, 0.7, 0.6), L0 + 22, 0.25, send=0.05)
# рывок на орбиту + комета (панорама за кометой)
place(dry, air_whoosh(0.18, 800, 4000, 0.4, 0.5, (0.0, 0.5)), L0 + 24, 0.3, send=0.4)
comet = air_whoosh(0.95, 600, 5000, 0.55, 0.45, (0.6, -0.7))
place(dry, comet, L0 + 30, 0.32, send=0.7)
place(dry, sparkle(0.95, 45, 3000, 9000), L0 + 30, 0.35, send=0.9)
place(dry, BWH, L0 + 32, 0.18, send=0.6)
# приземления букв f r h t — тёплые удары + колокол по аккорду
for i, nn in enumerate(['D5', 'F#5', 'A5', 'D6']):
    fr = L0 + 52 + i * 6 + 7
    place(dry, sub(55, 0.5, 1.5), fr, 0.35, send=0.05)
    place(dry, bell(note(nn), 2.4, 0.7), fr, 0.26, -0.6 + i * 0.3, 0.8)
    place(dry, tick(3000, 0.04), fr, 0.12, -0.6 + i * 0.3, 0.3)
# подъём к вспышке
place(dry, reverse_swell(DMAJ9 + HIGH, 0.7), L0 + 42, 0.7, send=0.6)
place(dry, air_whoosh(0.7, 400, 8000, 0.97, 0.5), L0 + 42, 0.25, send=0.7)
# ВСПЫШКА — главный «небесный» удар
F = L0 + 84
place(dry, pad(DMAJ9 + HIGH + [note('D2')], 4.6, 0.02, 3.6, 0.9), F, 0.85, send=1.0)
for j, nn in enumerate(['D6', 'F#6', 'A6', 'C#7', 'E7']):
    place(dry, bell(note(nn), 4.0, 1.0), F, 0.22, -0.8 + j * 0.4, 1.0)
place(dry, sub(40, 2.0, 1.0), F, 0.55, send=0.1)
place(dry, sparkle(2.4, 30, 3500, 10000), F, 0.4, send=1.0)
place(dry, air_whoosh(1.2, 6000, 900, 0.08, 0.6), F, 0.25, send=0.8)  # ударная волна
# точка падает на место «.»
place(dry, drop_sound(600, 1300, 0.4), L0 + 96, 0.4, 0.1, 0.6)
place(dry, pluck_fast(note('A6'), 1.4), L0 + 104, 0.28, 0.1, 0.8)
# work — восходящие стеклянные капли
for i, nn in enumerate(['E6', 'F#6', 'A6', 'B6']):
    place(dry, glass(note(nn), 1.2), L0 + 100 + i * 5 + 4, 0.16, 0.2 + i * 0.15, 0.9)
# блики по хрому — мерцающие проходы
for fr in (L0 + 122, L0 + 168):
    place(dry, air_whoosh(0.5, 5000, 11000, 0.5, 0.3, (-0.7, 0.7)), fr, 0.1, send=0.8)
    place(dry, sparkle(0.5, 30, 5000, 11000), fr, 0.22, send=1.0)
# мерцание звезды и финальная нота
place(dry, bell(note('D7'), 3.0, 0.5), L0 + 150, 0.12, 0.5, 1.0)
place(dry, pad([note('D3'), note('A3'), note('F#4'), note('A4'), note('E5')], 3.2, 1.0, 2.2, 0.4), L0 + 150, 0.35, send=1.0)

# ================= Реверб (собор) =================
def make_ir(sec=3.4):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for c in range(2):
        x = rng.standard_normal(n) * np.exp(-t * 6.9 / sec)
        x = signal.sosfilt(signal.butter(1, 7500, fs=SR, output='sos'), x)
        x[: int(0.012 * SR)] = 0  # pre-delay
        ir[:, c] = x
    return ir / np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))

ir = make_ir()
rev = np.stack([signal.fftconvolve(wet[:, c], ir[:, c])[:N] for c in range(2)], 1)
# убрать грязь в низах реверба
rev = signal.sosfilt(signal.butter(2, 250, btype='high', fs=SR, output='sos'), rev, axis=0)
mix = dry + rev * 0.55

# мастер: мягкая полка, лимитер
mix = signal.sosfilt(signal.butter(2, 30, btype='high', fs=SR, output='sos'), mix, axis=0)
mix /= np.max(np.abs(mix)) + 1e-9
mix = signal.sosfilt(signal.butter(2, 14000, fs=SR, output='sos'), mix, axis=0)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 10 ** (-1.0 / 20)
# финальное затухание
fade = np.ones(N)
s0, s1 = at(786), at(800) + int(1.0 * SR)
fade[s0:s1] = np.cos(np.linspace(0, np.pi / 2, s1 - s0)) ** 1.5
fade[s1:] = 0
mix *= fade[:, None]

out = os.path.join(sys.argv[1] if len(sys.argv) > 1 else HERE, 'sound_design.wav')
from scipy.io import wavfile
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
rms = np.sqrt(np.mean(mix ** 2))
print('written', out, 'peak', np.max(np.abs(mix)), 'rms dB', 20 * np.log10(rms))
