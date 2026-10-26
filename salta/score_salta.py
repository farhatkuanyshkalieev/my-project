"""SALTA ADDICT «Стильная странность»: music + sound design, synthesized from scratch, plus one real laugh.

An elegant groove at 120 BPM in D minor (Dm9 – B♭maj9 – Gm9 – A7sus – Dm9), one bar per scene of the day.
The motif is played by a dombra (Karplus–Strong, the East) and answered by string pizzicato
(the West): Salta's own «best of East and West». Each hour of the day has its weather in the mix:
clock ticks at 08:00, rain at 13:00, wind at 18:00, neon hum at 21:00, cold air and chimes at
21:30. Twice the elegance is sabotaged by a distorted rock power chord, when the little S shows
the horns 🤘. The finale drops into five stabs for the five letters, a big logo hit, the S lands,
the horns again, and a woman laughs «ha-ha» (ElevenLabs, voice Soldani): the brand's haha emblem.

usage: python3 score_salta.py build/events.json build/sound.wav
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


# ------------------------------------------------------------------ harmony: one bar per hour of the day
CHORDS = {   # bar start → (bass root, chord voicing, motif base)
    2: (38, [57, 60, 64, 65, 69], 62),      # Dm9      08:00
    4: (34, [57, 62, 65, 69, 72], 62),      # B♭maj9   13:00
    6: (43, [58, 62, 65, 69, 70], 67),      # Gm9      18:00
    8: (45, [55, 60, 62, 67, 69], 69),      # A7sus    21:00
    10: (38, [57, 60, 64, 65, 69], 62),     # Dm9      21:30
}
SCALE = [0, 2, 3, 5, 7, 8, 10]   # natural minor


def motif(base, t0, g=1.0, which='dombra'):
    """Four-note dombra phrase with a pizzicato answer (East asks, West answers)."""
    steps = [(0, 0), (3, 2), (6, 4), (8, 3)]     # (16th, scale degree)
    for s16, deg in steps:
        m = base + SCALE[deg % 7] + 12 * (deg // 7)
        M(dombra(m, 0.6), t0 + s16 * S16, 0.32 * g, pan=-0.3, r=0.25)
    for s16, deg in [(12, 2), (14, 0)]:
        m = base + SCALE[deg]
        M(pizz(m + 12, 0.4), t0 + s16 * S16, 0.28 * g, pan=0.35, r=0.3)


def groove(t0, t1, g=1.0, party=False, light=False):
    s = 0
    while t0 + s * S16 < t1 - 1e-6:
        tt = t0 + s * S16; q = s % 16
        bar = 2 * int(tt // 2)
        root, chord, _ = CHORDS.get(bar, CHORDS[2])
        if (q % 4 == 0 and not light) or (light and q in (0, 10)):
            M(kick(), tt, 0.7 * g)
        if q in (4, 12):
            M(snap(), tt, 0.33 * g, r=0.25, pan=0.1)
            if party:
                M(rim(), tt, 0.15 * g, pan=-0.1)
        if q in (6, 15) and not light:
            M(rim(), tt, 0.12 * g, pan=-0.3)
        if q % 2 == 1 or party:
            M(hat(party and q % 4 == 2), tt, (0.05 if q % 2 else 0.035) * g * (1.6 if party else 1), pan=0.25)
        if (q in (0, 3, 7, 10) and not light) or (light and q in (0, 10)):
            M(bass(root + (12 if q == 7 else 0), 0.5 if light else 0.28), tt, 0.5 * g)
        s += 1


def score():
    # prologue: the satin breathes, a cello holds D, the title is a soft E-piano chord
    M(cello(38, 2.1, 0.6, 0.4), 0.05, 0.4, r=0.4, b=0.3)
    M(epiano([62, 65, 69, 72, 76], 2.0), 0.22, 0.22, r=0.4, b=0.3)
    M(pad([50, 57, 62, 65], 1.9, 1100, 0.6, 0.3), 0.1, 0.35, b=0.2)
    # the day: one bar per hour, groove + chord + dombra/pizzicato motif
    for bar, (root, chord, base) in CHORDS.items():
        M(epiano(chord, 1.9), bar, 0.18, r=0.3, pan=0.05)
        M(pad([n - 12 for n in chord[:3]], 2.0, 1300, 0.08, 0.3), bar, 0.18)
        motif(base, bar, 1.0)
    groove(2.0, 8.0)
    groove(8.0, 10.0, 1.15, party=True)
    groove(10.0, 11.75, 1.0, light=True)
    M(pad([62, 69, 74, 76, 81], 2.0, 3200, 0.3, 0.4), 10.0, 1.4, b=0.4)   # cold air: a high open pad
    # finale: breakdown, letters, riser, logo
    M(pad([50, 57, 62, 64, 65, 69], 2.1, 1800, 0.2, 0.4), 12.0, 0.4, b=0.3)
    M(cello(38, 2.0, 0.2, 0.3), 12.0, 0.3, r=0.3)
    rise = whoosh(1.0, 400, 7000, 0.5) * np.linspace(0, 1, int(1.0 * SR)) ** 2
    M(rise, 13.0, 0.5, width=1)
    for i in range(8):
        M(snap(), 13.0 + i * BEAT / 4 + (i > 3) * 0.0, 0.08 + 0.03 * i, r=0.2)
    M(pad([50, 57, 62, 65, 69, 74], 2.6, 2200, 0.02, 1.2), 14.0, 0.42, b=0.45)
    M(ahh([62, 65, 69, 74], 1.6), 14.0, 0.18, r=0.3, b=0.4)
    groove(14.5, 16.0, 0.6, light=True)
    motif(62, 14.5, 0.8)
    M(epiano([50, 62, 65, 69, 72, 76], 1.5), 16.0, 0.25, r=0.4, b=0.4)


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
        F(norm(x), t0, 0.62, r=0.12)
    elif ty == 'slogan':
        F(bell(98, 1.4, 0.4), t0, 0.08, r=0.6, pan=-0.2)


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    score()
    irL, irR = reverb_ir(1.4, 0.26)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = reverb_ir(3.2, 0.7, 5)
    rb = np.vstack([signal.fftconvolve(big[0], bL)[:N], signal.fftconvolve(big[1], bR)[:N]])
    mix = mus * 0.9 + fx * 0.85 + 0.4 * rv + 0.35 * rb
    mix = signal.sosfilt(signal.butter(2, 28 / (SR / 2), 'high', output='sos'), mix, axis=1)
    pk = np.percentile(np.abs(mix), 99.95)
    mix = np.tanh(mix / pk * 1.1) / np.tanh(1.1)
    k = np.arange(N) / SR
    mix *= np.clip((DUR - k) / 0.6, 0, 1) ** 1.5 * np.clip(k / 0.02, 0, 1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-0.8 / 20)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')


if __name__ == '__main__':
    main()
