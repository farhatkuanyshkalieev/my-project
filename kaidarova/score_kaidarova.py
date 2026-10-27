"""Kaidarova «MAHABBAT / Завёрнутые в любовь»: a warm ethno-house track + sound design, synthesized from scratch.

120 BPM, D minor. A vocal hook sings «ma-hab-bat» (formant chops) over a dombra qağys riff, a rolling bass
and a soft four-on-the-floor; the qobyz carries the feather and the steppe; throat singing and the frame
drum tell the tumar. The drop lands as the camera dives through the MAHABBAT ribbon (4.0 s); the knitting
carriage ticks stitch by stitch; the logo lands at 15.7 s. If vo/whisper.wav exists, a whispered
«Махаббат» (ElevenLabs, voice Soldani) sits on the logo.

usage: python3 score_kaidarova.py build/events.json build/sound.wav [build/sfx_only.wav]
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
DUR = 18.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM
S16 = BEAT / 4
rng = np.random.default_rng(11)
mus = np.zeros((2, N)); fx = np.zeros((2, N)); rev = np.zeros((2, N)); big = np.zeros((2, N))


# ------------------------------------------------------------------ helpers
def T(d):
    return np.arange(int(d * SR)) / SR


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


def osc(f, d, ph=0.0):
    f = np.broadcast_to(np.asarray(f, dtype=float), (int(d * SR),))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)


def noise(d):
    return rng.standard_normal(int(d * SR))


def filt(x, kind, f, order=2):
    if kind == 'bp':
        sos = signal.butter(order, [f[0] / (SR / 2), min(f[1], SR * 0.45) / (SR / 2)], btype='band', output='sos')
    else:
        sos = signal.butter(order, f / (SR / 2), btype=kind, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def put(bus, sig, t0, g=1.0, pan=0.0, r=0.0, b=0.0, width=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if sig.ndim == 1:
        th = (pan + 1) * np.pi / 4
        st = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
        if width:
            sh = int(SR * 0.008 * width)
            st[1] = np.concatenate([np.zeros(sh), st[1][:len(st[1]) - sh]])
    else:
        st = sig.copy()
    if i0 < 0:
        st = st[:, -i0:]; i0 = 0
    n = min(st.shape[1], N - i0)
    st = st[:, :n] * g
    bus[:, i0:i0 + n] += st
    if r:
        rev[:, i0:i0 + n] += st * r
    if b:
        big[:, i0:i0 + n] += st * b


def M(sig, t0, g=1.0, pan=0.0, r=0.0, b=0.0, width=0.0):
    put(mus, sig, t0, g, pan, r, b, width)


def F(sig, t0, g=1.0, pan=0.0, r=0.0, b=0.0, width=0.0):
    put(fx, sig, t0, g, pan, r, b, width)


def reverb_ir(d, tau, seed0=1):
    k = T(d)
    out = []
    for seed in (seed0, seed0 + 1):
        r = np.random.default_rng(seed)
        hi = filt(r.standard_normal(len(k)), 'low', 7000) * np.exp(-k / (tau * 0.55))
        lo = filt(r.standard_normal(len(k)), 'low', 1800) * np.exp(-k / tau)
        ir = (hi * 0.6 + lo) * np.minimum(1, k / 0.01)
        ir = np.concatenate([np.zeros(int(0.02 * SR)), ir])
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


# ------------------------------------------------------------------ instruments
def thump(f0, f1, d, tau, ptau):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t / ptau)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * np.minimum(1, t / 0.001))


def kick():
    s = thump(150, 46, 0.42, 0.14, 0.02)
    s[:int(0.004 * SR)] += filt(noise(0.004), 'high', 3000) * 0.3
    return norm(np.tanh(s * 1.6))


def rim():
    t = T(0.06)
    return norm(np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.008) + 0.5 * filt(noise(0.06), 'bp', (2000, 7000)) * np.exp(-t / 0.006))


def snap():
    t = T(0.12)
    return norm(filt(noise(0.12), 'bp', (1400, 5200)) * np.exp(-t / 0.018) * np.minimum(1, t / 0.0008))


def hat(open_=False):
    d = 0.22 if open_ else 0.04
    return norm(filt(noise(d), 'high', 8200) * np.exp(-T(d) / (0.07 if open_ else 0.009)))


def crash(d=2.6):
    t = T(d)
    s = filt(noise(d), 'high', 4200) * np.exp(-t / 0.9) + 0.25 * sum(osc(f, d, rng.uniform(0, 6)) for f in (3120, 4370, 5810, 7260)) * np.exp(-t / 0.6)
    return norm(s * np.minimum(1, t / 0.002))


def ks(f, d=1.0, decay=0.996, bright=4200, pick=0.0):
    n = max(2, int(round(SR / f)))
    x = np.zeros(int(d * SR))
    exc = filt(rng.standard_normal(n), 'low', bright)
    if pick:
        exc = exc - np.roll(exc, int(n * pick))
    x[:n] = exc
    a = np.zeros(n + 2); a[0] = 1; a[n] = -decay * 0.5; a[n + 1] = -decay * 0.5
    y = signal.lfilter([1.0], a, x)
    return norm(y * np.clip((d - T(d)) / 0.05, 0, 1))


def dombra(m, d=0.7):
    """Two-string dombra pluck: unison pair, slight detune, bright attack."""
    f = midi(m)
    s = ks(f, d, 0.995, 5200, 0.3) + 0.7 * ks(f * 1.003, d, 0.994, 4200, 0.2)
    return norm(s)


def pizz(m, d=0.45):
    """String pizzicato: soft round pluck with a wooden body resonance."""
    f = midi(m); t = T(d)
    s = ks(f, d, 0.985, 2400) * 0.8 + 0.4 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12)
    body = filt(s, 'bp', (250, 1400)) * 0.6
    return norm((s + body) * np.minimum(1, t / 0.003))


def cello(m, d, att=0.4, rel=0.6):
    t = T(d); f = midi(m) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(ph * h) / h ** 1.1 for h in range(1, 14))
    s = filt(s, 'bp', (90, 2400)) + 0.05 * filt(noise(d), 'bp', (400, 3000))
    return norm(s) * np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)


def epiano(notes, d=1.8):
    t = T(d); out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        mod = 1.2 * np.exp(-t / 0.4) * np.sin(2 * np.pi * f * t)
        out += np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 1.3) + 0.12 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.02)
    return norm(out * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.15, 0, 1))


def pad(notes, d, cut=1500, att=0.4, rel=0.8):
    t = T(d); L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for i, dt in enumerate((-8, -3, 3, 8)):
            f = midi(m) * 2 ** (dt / 1200); ph = rng.uniform(0, 6)
            s = sum(np.sin(2 * np.pi * f * h * t + ph * h) / h for h in range(1, 8))
            (L if i % 2 else R)[:] += s
    env_ = np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)
    return np.vstack([filt(L, 'low', cut), filt(R, 'low', cut)]) * env_ / (len(notes) * 4)


def bass(m, d=0.3):
    f = midi(m); t = T(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.05)
    return norm(np.tanh(1.4 * s) * np.exp(-t / 0.22) * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.03, 0, 1))


def bell(m, d=1.6, bright=1.0):
    f = midi(m); t = T(d)
    mod = (2.0 * bright) * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * 3.5 * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.7) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.3)
    return norm(s * np.minimum(1, t / 0.0015))


def power_chord(root=50, d=1.1):
    """A rock power chord (root, fifth, octave) on a distorted guitar."""
    t = T(d); s = np.zeros(len(t))
    for i, m in enumerate((root, root + 7, root + 12)):
        for j, dt in enumerate((0, 0.012, 0.024)):          # a strum
            sh = int(dt * SR + i * 0.006 * SR)
            k = ks(midi(m) * (1 + 0.002 * j), d, 0.998, 3500)
            s[sh:] += k[:len(s) - sh]
    s = np.tanh(s * 6.0)                                        # fuzz
    s = filt(s, 'low', 3600) + 0.3 * filt(s, 'bp', (700, 1600))  # cabinet
    return norm(s * np.clip((d - t) / 0.25, 0, 1))


def whoosh(d, f0, f1, shape=2.0):
    t = T(d); k = t / d
    out = np.zeros(len(t)); x = noise(d); seg = int(0.01 * SR)
    for i in range(0, len(t), seg):
        fc = f0 * (f1 / f0) ** (i / len(t))
        out[i:i + seg] = filt(x[max(0, i - seg * 4):i + seg], 'bp', (fc * 0.6, fc * 1.6))[-len(out[i:i + seg]):]
    return norm(out * np.sin(np.pi * np.clip(k, 0, 1)) ** shape)


def silk(d=1.6):
    """Satin rustle: band-limited noise with slow, uneven swells."""
    t = T(d)
    env_ = np.abs(np.sin(np.pi * t / d)) * (0.6 + 0.4 * np.sin(2 * np.pi * 2.3 * t + 1) ** 2)
    return norm(filt(noise(d), 'bp', (1800, 9000)) * env_)


def flap(d=0.5, rate=22):
    t = T(d)
    return norm(filt(noise(d), 'bp', (300, 3000)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * rate * t))) * np.exp(-t / (d * 0.6)))


def blip(f, d=0.06):
    t = T(d)
    return norm(np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t / 0.01))) * np.exp(-t / 0.02) * np.minimum(1, t / 0.001))


def wood(f=1400, d=0.07):
    t = T(d)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + 0.4 * filt(noise(d), 'bp', (f * 0.8, f * 2.5)) * np.exp(-t / 0.004))


def plop(f=420, d=0.12):
    t = T(d)
    f_ = f * (1 + 1.5 * np.exp(-t / 0.012))
    return norm(np.sin(2 * np.pi * np.cumsum(f_) / SR) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001))


def boing(f0=140, f1=420, d=0.45):
    t = T(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.07)) + 25 * np.sin(2 * np.pi * 15 * t) * np.exp(-t / 0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14) * np.minimum(1, t / 0.003))


def tick():
    t = T(0.03)
    return norm(np.sin(2 * np.pi * 3600 * t) * np.exp(-t / 0.003) + 0.3 * filt(noise(0.03), 'high', 5000) * np.exp(-t / 0.002))


def kiss():
    t = T(0.16)
    s = filt(noise(0.16), 'bp', (500, 3500)) * np.exp(-t / 0.02) + 0.8 * np.sin(2 * np.pi * np.cumsum(900 * (1 + 2 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.03)
    return norm(s * np.minimum(1, t / 0.002))


def rain_bed(d):
    t = T(d)
    s = filt(noise(d), 'bp', (1500, 9000)) * 0.6 + filt(noise(d), 'low', 600) * 0.3
    drops = np.zeros(len(t))
    for _ in range(int(d * 40)):
        j = int(rng.uniform(0, d - 0.05) * SR); b = blip(rng.uniform(1800, 4200), 0.03) * rng.uniform(0.2, 0.7)
        drops[j:j + len(b)] += b
    env_ = np.minimum(1, t / 0.25) * np.clip((d - t) / 0.3, 0, 1)
    return norm(s + 0.5 * drops) * env_


def wind_bed(d):
    t = T(d); out = np.zeros(len(t)); x = noise(d); seg = int(0.02 * SR)
    for i in range(0, len(t), seg):
        fc = 500 + 900 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * i / SR)) + 400 * np.sin(2 * np.pi * 2.7 * i / SR)
        out[i:i + seg] = filt(x[max(0, i - seg * 4):i + seg], 'bp', (fc * 0.7, fc * 1.4))[-len(out[i:i + seg]):]
    return norm(out) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) ** 2) * np.minimum(1, t / 0.2) * np.clip((d - t) / 0.3, 0, 1)


def neon_hum(d):
    t = T(d)
    s = sum(np.sin(2 * np.pi * 100 * h * t) / h for h in (1, 2, 3, 5)) + 0.2 * filt(noise(d), 'high', 6000)
    return norm(s) * np.minimum(1, t / 0.05) * np.clip((d - t) / 0.05, 0, 1)


def brr(d=0.45):
    t = T(d)
    return norm(filt(noise(d), 'bp', (200, 2500)) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t)) * np.sin(np.pi * t / d))


def chatter(d=0.9):
    out = np.zeros(int(d * SR))
    for i in range(int(d / 0.045)):
        w = wood(rng.uniform(2200, 2800), 0.03) * rng.uniform(0.4, 1)
        j = int(i * 0.045 * SR); out[j:j + len(w)] += w[:len(out) - j]
    return norm(out)


def ahh(notes, d=1.4):
    t = T(d); out = np.zeros(len(t))
    for m in notes:
        f = midi(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))
        src = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in range(1, 24))
        out += sum(g * filt(src, 'bp', (fc * 0.85, fc * 1.15)) for fc, g in ((750, 1.0), (1150, 0.6), (2600, 0.25)))
    return norm(out * np.minimum(1, t / 0.03) * np.clip((d - t) / 0.5, 0, 1))


# ------------------------------------------------------------------ the track: runway house, 120 BPM, D minor
# Buses: kick and sub go straight; everything else musical is side-chained to the kick («pumping»).
drums = np.zeros((2, N)); pump_bus = np.zeros((2, N)); KICKS = []


def D(sig, t0, g=1.0, pan=0.0, r=0.0, b=0.0, width=0.0):
    put(drums, sig, t0, g, pan, r, b, width)


def P(sig, t0, g=1.0, pan=0.0, r=0.0, b=0.0, width=0.0):
    put(pump_bus, sig, t0, g, pan, r, b, width)


def snare(d=0.12):
    t = T(d)
    return norm(filt(noise(d), 'bp', (1500, 9000)) * np.exp(-t / 0.04) + 0.6 * np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.03))


def kick909():
    t = T(0.5)
    f = 54 + 150 * np.exp(-t / 0.028) + 40 * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    click = filt(noise(0.5), 'bp', (2500, 9000)) * np.exp(-t / 0.0025) * 0.5
    return norm(np.tanh(2.2 * (body + click)) * np.minimum(1, t / 0.0008))


def clap2():
    d = 0.45; t = T(d); out = np.zeros(len(t))
    for i, dt in enumerate((0, 0.007, 0.015, 0.024)):
        tail = 0.009 if i < 3 else 0.11
        bl = filt(noise(d), 'bp', (900, 7000)) * np.exp(-t / tail)
        j = int(dt * SR); out[j:] += bl[:len(out) - j]
    return norm(out + 0.25 * filt(noise(d), 'bp', (180, 400)) * np.exp(-t / 0.03))


def shaker():
    t = T(0.07)
    return norm(filt(noise(0.07), 'bp', (5000, 12000)) * np.sin(np.pi * np.clip(t / 0.06, 0, 1)) ** 2)


def ohat():
    t = T(0.3)
    s = filt(noise(0.3), 'high', 7000) + 0.3 * sum(osc(f, 0.3, rng.uniform(0, 6)) for f in (5400, 7900, 10300))
    return norm(filt(s, 'high', 6000) * np.exp(-t / 0.09))


def chat():
    t = T(0.05)
    return norm(filt(noise(0.05), 'high', 8500) * np.exp(-t / 0.008))


def saw_bass(m, d=0.22, cut0=2200, cut1=260):
    """Rolling house bass: detuned saws through a plucked low-pass, plus a clean sub."""
    f = midi(m); t = T(d)
    saw = sum(2 * ((f * (1 + dt) * t + ph) % 1) - 1 for dt, ph in ((0, 0), (0.006, 0.3), (-0.005, 0.6))) / 3
    out = np.zeros(len(t)); seg = int(0.004 * SR)
    for i in range(0, len(t), seg):   # filter envelope, stepped
        fc = cut1 + (cut0 - cut1) * np.exp(-(i / SR) / 0.045)
        out[i:i + seg] = filt(saw[max(0, i - seg * 6):i + seg], 'low', fc)[-len(out[i:i + seg]):]
    sub = np.sin(2 * np.pi * f * t)
    env_ = np.minimum(1, t / 0.003) * np.clip((d - t) / 0.02, 0, 1)
    return norm(filt(np.tanh(1.6 * (0.9 * out + 0.5 * sub)) * env_, 'high', 38))


def stab(notes, d=0.32, cut=2600, voices=7, spread=18):
    """Detuned supersaw chord stab (the hook's rhythm)."""
    t = T(d); L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for j in range(voices):
            dt = (j - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            f = midi(m) * 2 ** (dt / 1200); ph = rng.uniform(0, 1)
            saw = 2 * ((f * t + ph) % 1) - 1
            (L if j % 2 else R)[:] += saw
            if j == voices // 2:
                L += saw * 0.6; R += saw * 0.6
    env_ = np.minimum(1, t / 0.003) * np.exp(-t / (d * 0.45)) * np.clip((d - t) / 0.03, 0, 1)
    st = np.vstack([filt(L, 'low', cut), filt(R, 'low', cut)]) * env_
    return st / (np.max(np.abs(st)) + 1e-9)


def chop(m, vowel='a', d=0.22):
    """Vocal chop: a sung formant syllable, short, slightly pitched up at the start (like a sliced sample)."""
    t = T(d); f = midi(m) * (1 + 0.03 * np.exp(-t / 0.02))
    src = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in range(1, 30))
    F_ = {'a': ((800, 1.0), (1200, 0.7), (2700, 0.3)), 'o': ((500, 1.0), (850, 0.6), (2600, 0.2)),
          'e': ((450, 1.0), (1900, 0.6), (2700, 0.35)), 'u': ((330, 1.0), (750, 0.4), (2400, 0.15))}[vowel]
    out = sum(g * filt(src, 'bp', (fc * 0.88, fc * 1.12)) for fc, g in F_)
    out += 0.08 * filt(noise(d), 'bp', (4000, 9000)) * np.exp(-t / 0.02)   # breath on the attack
    return norm(out * np.minimum(1, t / 0.005) * np.clip((d - t) / 0.05, 0, 1))


def lead_pluck(m, d=0.3):
    f = midi(m); t = T(d)
    s = sum(np.sin(2 * np.pi * f * h * t + h) / h ** 0.9 for h in range(1, 10)) + 0.5 * np.sin(2 * np.pi * f * 2.004 * t)
    e = np.exp(-t / 0.09) * np.minimum(1, t / 0.002)
    return norm(filt(s * e, 'low', 5200))


def riser(d, f0=300, f1=9000):
    t = T(d); k = t / d
    nz = whoosh(d, f0, f1, 0.3) * k ** 2.2
    tone = sum(np.sin(2 * np.pi * np.cumsum(midi(62) * 2 ** (2.5 * k) * r) / SR) for r in (1, 1.5, 2)) * 0.12 * k ** 3
    return norm(nz + tone)


def impact():
    t = T(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 70 * np.exp(-t / 0.07)) / SR) * np.exp(-t / 0.6)
    air = filt(noise(2.2), 'bp', (200, 5000)) * np.exp(-t / 0.35) * 0.4
    return norm(np.tanh(1.8 * (boom + air)))


def reverse_cym(d=0.9):
    c = crash(d)[::-1]
    return norm(c * np.linspace(0, 1, len(c)) ** 2)


def sweep_lowpass(x, t0, t1, f0, f1):
    """Time-varying low-pass on a bus segment (the intro opening up / the mountains closing)."""
    i0, i1 = int(t0 * SR), int(t1 * SR); seg = int(0.01 * SR)
    for ch in range(2):
        y = x[ch, i0:i1].copy(); o = np.zeros_like(y)
        for i in range(0, len(y), seg):
            fc = f0 * (f1 / f0) ** (i / max(1, len(y)))
            o[i:i + seg] = filt(y[max(0, i - seg * 8):i + seg], 'low', fc)[-len(o[i:i + seg]):]
        x[ch, i0:i1] = o


# ------------------------------------------------------------------ ethno instruments
def kobyz(m, d, att=0.25, rel=0.4, vib=6.0):
    """Qobyz: a bowed horsehair fiddle — nasal, breathy, with a wide vibrato."""
    t = T(d); f = midi(m) * (1 + 0.012 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.4))
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    s = filt(saw, 'bp', (500, 900)) * 1.0 + filt(saw, 'bp', (1300, 2200)) * 0.6 + filt(saw, 'bp', (2800, 3600)) * 0.25
    s += 0.12 * filt(noise(d), 'bp', (1500, 5000)) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t))   # bow hair
    return norm(s) * np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)


def throat(m, d, att=0.4, rel=0.5, sweep=None):
    """Kömeı (throat singing): a buzzing drone with a whistled overtone that walks over the harmonics."""
    t = T(d); f = midi(m)
    pulse = sum(np.sin(2 * np.pi * f * h * t) / h ** 0.7 for h in range(1, 40))
    body = filt(pulse, 'bp', (90, 900))
    hs = sweep or [8, 9, 10, 12, 10, 9]
    seg = len(t) // len(hs); whistle = np.zeros(len(t))
    for i, h in enumerate(hs):
        a, b = i * seg, (i + 1) * seg if i < len(hs) - 1 else len(t)
        fc = f * h; whistle[a:b] = filt(pulse, 'bp', (fc * 0.97, fc * 1.03))[a:b]
    whistle = filt(whistle, 'low', 4000)
    return norm(0.8 * body + 1.6 * norm(whistle)) * np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)


def dauyl(low=True):
    """Dauylpaz / frame drum: a skin thump with a slap."""
    t = T(0.35)
    f = (70 if low else 130) * (1 + 0.8 * np.exp(-t / 0.02))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.18 if low else 0.1))
    s += 0.4 * filt(noise(0.35), 'bp', (700, 4000)) * np.exp(-t / 0.015)
    return norm(s)


def strum(notes, d=0.22, up=False):
    """Qağys: one down- or up-stroke over the two dombra strings."""
    out = np.zeros(int(d * SR))
    order = notes[::-1] if up else notes
    for i, m in enumerate(order):
        k = ks(midi(m), d, 0.993, 5600 if not up else 4200, 0.25)
        j = int(i * 0.008 * SR); out[j:] += k[:len(out) - j]
    out += 0.15 * filt(noise(d), 'bp', (2500, 7000)) * np.exp(-T(d) / 0.01)   # nail on the strings
    return norm(out)


def metal_plate(i=0):
    t = T(0.9); base = 1180 + 140 * (i % 5)
    s = sum(a * np.sin(2 * np.pi * base * r * t + rng.uniform(0, 6)) * np.exp(-t / tau) for r, a, tau in ((1, 1, 0.35), (2.41, 0.6, 0.22), (3.87, 0.4, 0.12), (5.3, 0.25, 0.06)))
    return norm(s * np.minimum(1, t / 0.0006))


def zip_(d=0.3, f0=900, f1=4200):
    t = T(d); f = f0 * (f1 / f0) ** (t / d)
    rasp = np.sign(np.sin(2 * np.pi * np.cumsum(f / 6) / SR))
    lo, hi = min(f0, f1), min(max(f0, f1) * 1.5, 16000)
    return norm(filt(noise(d) * (0.5 + 0.5 * rasp), 'bp', (lo, hi)) * np.sin(np.pi * t / d) ** 0.5)


def peck_bed(d):
    out = np.zeros(int(d * SR))
    for i in range(int(d / 0.035)):
        w = wood(rng.uniform(1700, 2600), 0.03) * rng.uniform(0.3, 1.0)
        j = int((i * 0.035 + rng.uniform(0, 0.01)) * SR); out[j:j + len(w)] += w[:len(out) - j]
    return norm(out)


# ------------------------------------------------------------------ the track: ethno house, 120 BPM, D minor
PROG = [(38, [62, 65, 69]), (34, [62, 65, 70]), (36, [60, 64, 67]), (38, [62, 65, 69])]   # Dm B♭ C Dm, one per bar
RIFF = [(0, 74, 0), (2, 74, 1), (3, 77, 0), (4, 79, 1), (6, 81, 0), (7, 79, 1), (8, 77, 0), (10, 74, 1), (11, 72, 0), (12, 74, 0), (14, 77, 1), (15, 76, 0)]   # 16th, top note, up-stroke
DRONE = [50, 57]    # the open strings, D3 and A3
HOOK = [(0, 74, 'a'), (2, 72, 'a'), (3, 69, 'a'), (8, 74, 'a'), (10, 77, 'a'), (11, 76, 'a'), (14, 72, 'o')]   # «ma-hab-bat · ma-hab-bat»


def chord_at(tt):
    return PROG[int(np.floor(tt / 2.0 + 1e-9)) % 4]


def beat(t0, t1, g=1.0, kick=True, clap=True, hats=True, bassline=True, riff=True, toms=False, halftime=False, octave=False):
    s = int(round(t0 / S16))
    while s * S16 < t1 - 1e-6:
        tt = s * S16; q = s % 16; sw = 0.014 if q % 2 else 0.0
        root, ch = chord_at(tt)
        if kick and (q % 4 == 0) and (not halftime or q in (0, 8)):
            D(kick909(), tt, 0.85 * g); KICKS.append(tt)
        if clap and q in (4, 12):
            P(clap2(), tt, 0.5 * g, r=0.22, pan=0.05)
        if hats:
            if q % 4 == 2:
                P(ohat(), tt + sw, 0.17 * g, pan=0.2)
            P(shaker(), tt + sw, (0.1 if q % 2 else 0.05) * g, pan=0.4)
            P(chat(), tt + sw, 0.06 * g, pan=-0.3)
        if toms and q in (6, 9, 13, 14):
            P(dauyl(q != 13), tt + sw, 0.35 * g, pan=-0.3 if q % 2 else 0.3, r=0.15)
        if bassline and q in (0, 3, 6, 8, 10, 11, 14):
            P(saw_bass(root + (12 if q in (6, 14) else 0), 0.22), tt + sw, 0.5 * g)
        if riff:
            for r16, m, up in RIFF:
                if q == r16:
                    P(strum([DRONE[0] + (0 if root in (38, 36) else -2), m - 12, m], 0.25, bool(up)), tt + sw, 0.3 * g, pan=-0.15, r=0.18)
                    if octave:
                        P(dombra(m, 0.3), tt + sw, 0.14 * g, pan=0.3, r=0.2)
        s += 1


def snare_roll(t0, t1, g0, g1):
    mid = (t0 + t1) / 2; tt = t0
    while tt < t1 - 0.005:
        k = (tt - t0) / (t1 - t0)
        P(snare(0.1), tt, g0 + (g1 - g0) * k, r=0.22)
        tt += S16 if tt < mid else S16 / 2


def score():
    # 0–2 · úki: a warm chord, the qobyz, a breath of air
    M(epiano([50, 57, 60, 64, 69], 2.2), 0.08, 0.4, r=0.4, b=0.3)
    M(kobyz(76, 1.8, 0.6, 0.4), 0.3, 0.42, r=0.35, b=0.3, pan=0.1)
    M(pad([50, 57, 62, 65], 2.0, 1400, 0.6, 0.3), 0.0, 0.6, b=0.3)
    # 2–4 · wrapped in love: the vocal hook arrives filtered, a roll, a riser, one breath of silence
    beat(2.0, 3.94, 0.75, kick=False, clap=False, bassline=False, riff=False)
    for bar in (2.0, 3.0):
        for s16, m, v in HOOK:
            P(chop(m, v, 0.22), bar + s16 * S16, 0.55, r=0.35, pan=0.1)
    sweep_lowpass(pump_bus, 2.0, 3.94, 500, 9000)
    snare_roll(3.0, 3.94, 0.06, 0.4)
    P(riser(1.5, 300, 10000), 2.45, 0.42, width=1)
    M(epiano([46, 57, 62, 65, 69], 2.0), 2.0, 0.45, r=0.4)
    M(pad([46, 57, 62, 65], 2.0, 1600, 0.2, 0.3), 2.0, 0.8, b=0.3)
    # 4–7 · MAHABBAT: the drop — beat, bass, dombra qağys and the «ma-hab-bat» hook
    D(impact(), 4.0, 0.8); P(crash(2.4), 4.0, 0.3, r=0.2, b=0.3)
    beat(4.0, 7.0, 1.0)
    for bar in np.arange(4.0, 7.0, 1.0):
        for s16, m, v in HOOK:
            P(chop(m, v, 0.22), bar + s16 * S16, 0.36, r=0.3, pan=0.12)
    # 7–10.5 · Oyu: the knitting groove, the carriage ticks along
    beat(7.0, 10.5, 1.0, toms=True)
    for bar in np.arange(8.0, 10.5, 1.0):
        for s16, m, v in HOOK[:4]:
            P(chop(m + 12, v, 0.18), bar + s16 * S16, 0.18, r=0.4, pan=-0.2)
    # 10.5–12.5 · the cardigan in the steppe: the qobyz sings over the groove
    D(impact(), 10.5, 0.55)
    beat(10.5, 12.5, 0.95, octave=True)
    M(kobyz(81, 0.95, 0.08, 0.3), 10.5, 0.32, r=0.35, pan=0.15); M(kobyz(77, 1.0, 0.08, 0.4), 11.5, 0.3, r=0.35, pan=0.15)
    # 12.5–14.5 · tumar: half-time, throat singing and the frame drum, gold shimmer
    beat(12.5, 14.4, 0.9, halftime=True, riff=True, toms=True)
    M(throat(38, 2.0, 0.2, 0.3, [8, 9, 10, 12, 10, 9]), 12.5, 0.45, r=0.3, b=0.3)
    sweep_lowpass(pump_bus, 13.4, 14.4, 900, 10000)
    snare_roll(13.95, 14.4, 0.08, 0.35)
    # 14.5–18 · Kaidarova: the feather falls on a held breath, the logo lands at 15.7, the groove rides out
    M(epiano([50, 57, 62, 65, 69, 72], 1.2), 14.5, 0.5, r=0.45, b=0.4)
    M(kobyz(74, 1.2, 0.2, 0.4), 14.5, 0.5, r=0.4, b=0.3)
    M(pad([50, 57, 62, 65, 69], 1.25, 1800, 0.1, 0.2), 14.5, 0.9, b=0.3)
    beat(14.5, 15.65, 0.6, kick=False, clap=False, bassline=False, riff=True)
    P(riser(1.15, 500, 9000), 14.55, 0.35, width=1)
    D(impact(), 15.7, 0.9); D(kick909(), 15.7, 0.9); KICKS.append(15.7); P(crash(2.6), 15.7, 0.35, r=0.2, b=0.4)
    beat(16.0, 17.5, 0.85)
    for s16, m, v in HOOK:
        P(chop(m, v, 0.24), 16.0 + s16 * S16, 0.3, r=0.35)
    D(impact(), 17.5, 0.55); P(crash(2.0), 17.5, 0.22, r=0.3, b=0.4)
    M(strum([50, 57, 62, 69], 1.6), 17.5, 0.4, r=0.35, b=0.35)
    M(epiano([50, 57, 62, 65, 69], 0.5), 17.5, 0.3, r=0.45, b=0.4)


def cue(e):
    ty, t0 = e['type'], e['t']
    if ty == 'draw':
        F(zip_(e['end'] - t0, 2500, 6000) * 0.4, t0, 0.12)
    elif ty == 'barbs':
        k = t0
        while k < e['end']:
            F(blip(5200 + 1400 * hash_((k * 100) % 7), 0.03), k, 0.05, pan=0.4); k += 0.045
    elif ty == 'loose':
        F(whoosh(0.9, 400, 5000, 1.6), t0, 0.35, width=1); F(bell(88, 1.4, 0.4), t0 + 0.3, 0.12, r=0.5)
    elif ty == 'ribbon':
        F(whoosh(e['end'] - t0, 300, 3000, 1.4), t0, 0.35, width=1); F(silk(1.2), t0 + 0.1, 0.2, width=1)
    elif ty == 'dive':
        F(whoosh(0.45, 600, 8000, 1.2), t0, 0.5, width=1)
    elif ty == 'drop':
        F(metal_plate(2) * 0.5, t0, 0.2, r=0.3)
    elif ty == 'rise':
        F(whoosh(0.6, 300, 2500, 1.4), t0, 0.3, pan=-0.2)
    elif ty == 'word':
        for i in range(8):
            F(tick(), t0 + i * 0.03, 0.18, pan=(i - 3.5) / 5)
        F(thump(140, 60, 0.3, 0.08, 0.02), t0 + 0.25, 0.4)
    elif ty == 'tick':
        F(bell(93, 1.0, 0.5), t0, 0.1, r=0.4)
    elif ty == 'knitup':
        F(whoosh(0.4, 300, 3000, 1.3), t0, 0.35, width=1)
    elif ty == 'knit':
        k = t0; i = 0
        while k < e['end']:
            F(tick(), k, 0.07 + 0.04 * (i % 4 == 0), pan=-0.5 + (i % 24) / 24); k += 2.3 / (40 * 6); i += 1
        k = t0
        while k < e['end']:
            F(wood(900, 0.05), k, 0.16, pan=0.3); k += 2.3 / 40 * 2
    elif ty == 'match':
        F(whoosh(0.6, 2500, 300, 1.3), t0, 0.35, width=1); F(bell(86, 1.2, 0.5), t0 + 0.55, 0.14, r=0.5)
    elif ty == 'title':
        F(thump(110, 45, 0.5, 0.15, 0.03), t0, 0.4)
    elif ty == 'close':
        F(whoosh(0.5, 4000, 400, 1.2), t0, 0.35, width=1)
    elif ty == 'gold':
        F(bell(81, 1.6, 0.6), t0, 0.16, r=0.5); F(bell(88, 1.6, 0.6), t0 + 0.4, 0.12, r=0.5); F(metal_plate(4) * 0.6, t0 + 0.8, 0.2, r=0.4)
    elif ty == 'open':
        F(whoosh(0.4, 400, 5000, 1.2), t0, 0.35, width=1)
    elif ty == 'fall':
        F(silk(e['end'] - t0), t0, 0.18, width=1)
    elif ty == 'logo':
        F(bell(86, 2.0, 0.6), t0, 0.14, r=0.5, b=0.3)
    elif ty == 'whisper':
        import os
        if os.path.exists('vo/whisper.wav'):
            r = wave.open('vo/whisper.wav'); x = np.frombuffer(r.readframes(r.getnframes()), np.int16) / 32768.0
            F(norm(filt(x, 'high', 90)), t0, 0.9, r=0.25)


def hash_(n):
    x = np.sin(n * 127.1 + 311.7) * 43758.5453
    return x - np.floor(x)


def compress(x, thr_db=-18, ratio=3.0, att=0.005, rel=0.12):
    lv = np.sqrt(np.mean(x ** 2, axis=0))
    a_, r_ = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    env_ = signal.lfilter([1 - r_], [1, -r_], lv)          # smooth level (release-dominated)
    env_ = np.maximum(env_, signal.lfilter([1 - a_], [1, -a_], lv))
    db = 20 * np.log10(env_ + 1e-9); over = np.maximum(0, db - thr_db)
    return x * 10 ** (-(over - over / ratio) / 20)


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    score()
    tt = np.arange(N) / SR
    # side-chain: every kick pushes the music bus down and lets it breathe back
    sc = np.ones(N)
    for tk in KICKS:
        i0 = int(tk * SR); n = min(N - i0, int(0.45 * SR))
        if n > 0:
            sc[i0:i0 + n] = np.minimum(sc[i0:i0 + n], 1 - 0.62 * np.exp(-np.arange(n) / SR / 0.09))
    # duck the music under the laugh
    duck = 1.0
    irL, irR = reverb_ir(1.4, 0.26)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = reverb_ir(3.2, 0.7, 5)
    rb = np.vstack([signal.fftconvolve(big[0], bL)[:N], signal.fftconvolve(big[1], bR)[:N]])
    music = (pump_bus * sc + drums + 0.35 * rv * sc + 0.3 * rb) * duck
    mix = music + fx * 0.42 + mus * 0.5
    mix = signal.sosfilt(signal.butter(3, 34 / (SR / 2), 'high', output='sos'), mix, axis=1)
    mix = mix - 0.42 * filt(mix, 'low', 65) + 0.6 * filt(mix, 'high', 2800) + 0.4 * filt(mix, 'high', 8000)   # tilt: less mud, more bite and air
    # master: glue compression, gentle high shelf for air, soft-clip limiter
    mix = mix / (np.max(np.abs(mix)) + 1e-9)
    mix = compress(mix, -16, 2.5)
    pk = np.percentile(np.abs(mix), 99.7)
    mix = np.tanh(mix / pk * 1.15) / np.tanh(1.15)
    mix *= np.clip((DUR - tt) / 0.5, 0, 1) ** 1.5 * np.clip(tt / 0.01, 0, 1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-0.6 / 20)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')
    if len(sys.argv) > 3:   # an effects-only stem (no music) for posting with a licensed track
        stem = fx * 0.42 + mus * 0.5
        stem = stem / (np.max(np.abs(stem)) + 1e-9) * 10 ** (-3 / 20)
        with wave.open(sys.argv[3], 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((stem.T * 32767).astype(np.int16).tobytes())
        print(f'wrote {sys.argv[3]}')


def prog_arr(t, a, b):
    return np.clip((t - a) / (b - a), 0, 1)


if __name__ == '__main__':
    main()
