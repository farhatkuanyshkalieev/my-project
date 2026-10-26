"""SALTA ADDICT «Стильная странность»: a runway-house track + sound design, synthesized from scratch, plus one real laugh.

The track: 120 BPM, D minor (Dm7 – B♭maj7 – Gm – A7, one chord per hour of the day). A 909-style
kick and a side-chained («pumping») bus with claps, swung hats and shakers, a rolling saw bass,
detuned supersaw chord stabs and a vocal-chop hook. Intro: the loop through a closed low-pass that
opens with the satin, a snare roll, a riser and one breath of silence; the drop lands on the cloth
yank (2.0 s). The party hour adds percussion and a dombra doubling the hook (Salta's «East and
West»); the mountains close the filter into cold air; the letters get a breakdown and a build; the
second drop hits on the logo. Scene effects (clock, rain, wind, neon, snow, kisses, the rock power
chord on the horns 🤘, the laugh «ha-ha» by ElevenLabs voice Soldani) sit under the music.
Master: glue compression, tilt EQ, soft-clip limiter (~−9 dBFS RMS).

usage: python3 score_salta.py build/events.json build/sound.wav [build/sfx_only.wav]
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
DUR = 16.5
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


PROG = [(38, [62, 65, 69, 72]), (34, [62, 65, 69, 70]), (31, [62, 65, 67, 70]), (33, [61, 64, 67, 69])]   # Dm7 B♭maj7 Gm A7 (one per bar = one per hour)
HOOK = [(0, 74, 'a'), (3, 77, 'o'), (6, 76, 'a'), (8, 74, 'e'), (10, 72, 'o'), (12, 69, 'a'), (14, 72, 'u')]   # 16th, note, vowel


def chord_at(tt):
    return PROG[int(np.floor(tt / 2.0 + 1e-9)) % 4]


def beat(t0, t1, g=1.0, kick=True, clap=True, hats=True, bassline=True, stabs=True, hook=False, perc=False, halftime=False):
    s = int(round(t0 / S16))
    while s * S16 < t1 - 1e-6:
        tt = s * S16; q = s % 16; sw = 0.012 if q % 2 else 0.0      # a little swing on the off 16ths
        root, ch = chord_at(tt)
        if kick and (q % 4 == 0) and (not halftime or q in (0, 8)):
            D(kick909(), tt, 0.8 * g); KICKS.append(tt)
        if clap and q in (4, 12):
            P(clap2(), tt, 0.55 * g, r=0.22, pan=0.05)
        if hats:
            if q % 4 == 2:
                P(ohat(), tt + sw, 0.2 * g, pan=0.2)
            P(chat(), tt + sw, (0.12 if q % 2 else 0.08) * g, pan=-0.25)
            P(shaker(), tt + sw, (0.1 if q % 4 in (1, 3) else 0.05) * g, pan=0.4)
        if perc and q in (3, 7, 11, 14):
            P(rim(), tt + sw, 0.14 * g, pan=-0.45 if q % 2 else 0.45)
        if bassline and q in (2, 3, 6, 7, 10, 11, 14, 15):
            m = root + (12 if q in (7, 15) else 0)
            P(saw_bass(m, 0.2), tt + sw, 0.5 * g)
        if stabs and q in (0, 3, 6, 10, 12):
            P(stab(ch, 0.28 if q != 12 else 0.4, 4200), tt, 0.34 * g, r=0.15, width=1)
        if hook:
            for h16, m, v in HOOK:
                if q == h16:
                    P(chop(m, v, 0.2), tt + sw, 0.34 * g, r=0.3, pan=0.15)
                    P(lead_pluck(m - 12, 0.25), tt + sw, 0.12 * g, pan=-0.2, r=0.2)
        s += 1


def snare_roll(t0, t1, g0, g1):
    """Accelerating roll: 16ths for the first half, 32nds after."""
    mid = (t0 + t1) / 2; tt = t0
    while tt < t1 - 0.005:
        k = (tt - t0) / (t1 - t0)
        P(snare(0.1), tt, g0 + (g1 - g0) * k, r=0.22)
        tt += S16 if tt < mid else S16 / 2


def score():
    # 0–2: intro — the loop through a closed low-pass that opens with the satin; snare roll, riser, one breath of silence
    beat(0.0, 1.94, 0.85, kick=False, clap=False)
    snare_roll(1.0, 1.94, 0.08, 0.4)
    P(riser(1.4), 0.54, 0.4, width=1)
    P(reverse_cym(0.8), 1.15, 0.25)
    # 2–8: the drop — full beat; the vocal hook comes in on the second bar
    beat(2.0, 4.0, 1.0)
    beat(4.0, 8.0, 1.0, hook=True)
    # 8–10: the party peak — extra percussion, the hook doubled by the dombra (the East in the club)
    beat(8.0, 10.0, 1.08, hook=True, perc=True)
    for rep in (0, 1):
        for h16, m, v in HOOK:
            P(dombra(m - 12, 0.5), 8.0 + rep * 1.0 + h16 * S16, 0.2, pan=-0.4, r=0.2)
    # 10–12: the mountains — the beat keeps going, the music closes into cold air and opens again
    beat(10.0, 11.94, 1.0, hook=True)
    P(reverse_cym(0.9), 11.04, 0.28)
    # 12–14: breakdown under the letters — no kick, held chords, a build with a snare roll and a riser
    P(pad([50, 57, 62, 65, 69], 2.0, 2400, 0.05, 0.3), 12.0, 1.1, b=0.3)
    P(stab([50, 62, 65, 69, 72], 1.0, 1600) * 0.6, 12.0, 0.5, r=0.4)
    P(stab([46, 62, 65, 69, 70], 1.0, 1600) * 0.6, 13.0, 0.5, r=0.4)
    beat(12.0, 13.0, 0.7, kick=False, clap=False, bassline=False, stabs=False)
    snare_roll(13.0, 13.94, 0.1, 0.45)
    P(riser(1.0, 400, 11000), 12.95, 0.5, width=1)
    # 14–16: the second drop on the logo, then the final chord rings out
    D(impact(), 14.0, 0.8)
    P(crash(2.6), 14.0, 0.35, r=0.2, b=0.3)
    beat(14.0, 16.0, 1.05, hook=True, perc=True)
    P(stab([50, 62, 65, 69, 72], 0.9, 2200), 16.0, 0.4, r=0.4, b=0.4)
    D(kick909(), 16.0, 0.9); KICKS.append(16.0)
    P(pad([50, 57, 62, 65, 69, 74], 0.5, 2400, 0.01, 0.4), 16.0, 0.9, b=0.5)
    # filter moves
    sweep_lowpass(pump_bus, 0.0, 1.94, 320, 7000)
    sweep_lowpass(pump_bus, 10.0, 11.0, 9000, 1100)
    sweep_lowpass(pump_bus, 11.0, 11.94, 1100, 9000)


def cue(e):
    ty, t0 = e['type'], e['t']
    if ty == 'satin':
        F(silk(1.8), t0, 0.22, width=1, r=0.2)
    elif ty == 'title':
        F(bell(86, 1.4, 0.6), t0, 0.1, r=0.5, pan=0.2)
    elif ty == 'blink':
        F(wood(1500 if t0 < 1.3 else 1750), t0, 0.22, pan=0.4)
    elif ty == 'hop':
        F(boing(150, 460), t0, 0.35, pan=0.4)
    elif ty == 'yank':
        F(whoosh(0.5, 300, 6000, 1.0), t0, 0.55, width=1, r=0.2); F(flap(0.45, 26), t0 + 0.05, 0.3, pan=0.2)
        F(crash(1.8), 2.0, 0.22, r=0.2)
    elif ty == 'scene':
        k = e['k']
        if k == 'meet':
            for i in range(16):
                F(tick(), t0 + 0.05 + i * BEAT / 2, 0.06 if i % 2 else 0.1, pan=-0.5)
        elif k == 'rain':
            F(rain_bed(2.1), t0 - 0.1, 0.3, width=1)
        elif k == 'wind':
            F(wind_bed(2.1), t0 - 0.05, 0.4, width=1)
        elif k == 'party':
            F(neon_hum(1.85), t0, 0.06)
            for i in range(6):
                F(blip(1200 + 400 * (i % 3), 0.02), t0 + i * 0.05, 0.08)
        elif k == 'snow':
            F(wind_bed(1.9) * 0.6, t0, 0.18, width=1)
            for i, m in enumerate((86, 89, 93, 98, 93)):
                F(bell(m, 1.0, 0.4), t0 + 0.2 + i * 0.3, 0.07, pan=np.sin(i * 2), r=0.5)
    elif ty == 'peek':
        F(plop(520), t0, 0.3, pan=0.5)
    elif ty == 'glint':
        F(bell(96, 0.9, 0.5), t0 + 0.15, 0.16, pan=0.5, r=0.4)
    elif ty == 'clock':
        F(whoosh(0.35, 600, 4000, 1.4), t0, 0.35, pan=-0.3)
        for i in range(5):
            F(tick(), t0 + i * 0.06, 0.12)
    elif ty == 'shake':
        F(brr(0.45), t0, 0.5, pan=0.5); F(rain_bed(0.5) * np.linspace(1, 0, int(0.5 * SR)), t0 + 0.05, 0.3, pan=0.4)
    elif ty == 'slats':
        F(whoosh(0.32, 1500, 6000, 1.3), t0, 0.4, pan=0.3, width=1)
    elif ty == 'tumble':
        t = T(0.5); F(np.sin(2 * np.pi * np.cumsum(1600 * 2 ** (-1.5 * t / 0.5)) / SR) * np.sin(np.pi * t / 0.5) * 0.6, t0, 0.18, pan=-0.6)
    elif ty == 'grab':
        F(plop(260, 0.15), t0, 0.4, pan=0.4); F(flap(1.0, 18), t0 + 0.05, 0.22, pan=0.4)
    elif ty == 'swipe':
        F(whoosh(0.35, 400, 5000, 1.2), t0, 0.45, width=1)
    elif ty == 'kiss':
        F(kiss(), t0, 0.45, pan=-0.4 if t0 < 9 else 0.4, r=0.2)
    elif ty == 'horns':
        F(power_chord(50, 1.1 if not e.get('big') else 1.5), t0, 0.5 if not e.get('big') else 0.55, r=0.15, b=0.15 if e.get('big') else 0)
    elif ty == 'blackout':
        F(wood(900, 0.05), t0, 0.4); t = T(0.3); F(np.sin(2 * np.pi * np.cumsum(300 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.1), t0 + 0.02, 0.25)
    elif ty == 'goggles':
        F(wood(2100, 0.05), t0, 0.35, pan=0.5); F(bell(93, 1.2, 0.8), t0 + 0.05, 0.15, pan=0.5, r=0.4)
    elif ty == 'curtain':
        F(whoosh(0.6, 5000, 300, 1.2), t0, 0.45, width=1); F(silk(1.2), t0 + 0.1, 0.18, width=1)
    elif ty == 'letter':
        i = e['i']; chord = [[62, 69], [65, 72], [69, 76], [72, 77], [74, 81]][i]
        F(epiano(chord, 0.6), t0, 0.28, pan=(i - 2) / 3, r=0.3)
        F(pizz(chord[0] - 12, 0.35), t0, 0.35, pan=(i - 2) / 3)
        F(thump(120, 50, 0.25, 0.07, 0.02), t0, 0.3)
    elif ty == 'logo':
        F(kick(), t0, 1.0); F(thump(90, 38, 1.0, 0.4, 0.05), t0, 0.7); F(crash(2.8), t0, 0.4, r=0.2, b=0.4)
        F(whoosh(0.9, 6000, 400, 1.2), t0, 0.15, width=1)
    elif ty == 'land':
        F(boing(110, 330, 0.5), t0, 0.45); F(thump(160, 60, 0.2, 0.06, 0.02), t0, 0.35)
    elif ty == 'haha':
        r = wave.open('vo/laugh.wav')
        x = np.frombuffer(r.readframes(r.getnframes()), np.int16) / 32768.0
        x = filt(x, 'high', 90)
        F(norm(x), t0, 1.3, r=0.12)
    elif ty == 'slogan':
        F(bell(98, 1.4, 0.4), t0, 0.08, r=0.6, pan=-0.2)


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
    duck = 1 - 0.45 * np.clip(prog_arr(tt, 15.05, 15.15) - prog_arr(tt, 16.2, 16.5), 0, 1)
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
