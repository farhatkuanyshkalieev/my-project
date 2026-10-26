"""1Fit ad: music + sound design, synthesized from scratch (no samples), mixed under the voiceover.

A bright workout house-pop track, 125 BPM, A minor (Am – F – C – G). The hook
is a build: a filtered pluck arpeggio opens up over the glossy card, a hit
on «Один», a burst on «все виды спорта», a snare roll and one breath of
silence, then the downbeat lands on «Зал». From there four-on-the-floor,
claps, open hats, a pumping supersaw and an octave bass. Every sport cut has
its own sound: plate clank, splash with bubbles, singing bowl, disco
sparkle, punch, kettlebell thud. Map pins ping up a scale, the counter
ticks, the phone taps and beeps through the scan, a success chime with a
crash, coins for the instalments, paper swishes for guest passes, a beat of
silence and the big logo hit, then the groove rides out to a final chord.
The music is ducked under the voice.

usage: python3 score_fit.py build/events.json vo/vo.wav build/sound.wav
"""
import json
import re
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
_cues = open('vo/cues.js').read()
DUR = float(re.search(r'DUR = ([\d.]+)', _cues).group(1))
VO0 = float(re.search(r'VO0 = ([\d.]+)', _cues).group(1))
C = {k: float(v) for k, v in re.findall(r'(\w+): ([\d.]+)', re.search(r'C = \{([^}]*)\}', _cues).group(1))}
N = int(SR * DUR)
BPM = 125
BEAT = 60 / BPM
G0 = C['gym']                          # the downbeat lands on «Зал»
rng = np.random.default_rng(7)
mus = np.zeros((2, N)); chords = np.zeros((2, N)); fx = np.zeros((2, N)); vo = np.zeros((2, N))
rev = np.zeros((2, N)); big = np.zeros((2, N))


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
    s = thump(180, 50, 0.4, 0.12, 0.022)
    s[:int(0.005 * SR)] += filt(noise(0.005), 'high', 3000) * 0.4
    return norm(np.tanh(s * 2.0))


def clap():
    out = np.zeros(int(0.3 * SR))
    for i, dt in enumerate((0, 0.009, 0.018, 0.027)):
        bl = filt(noise(0.25), 'bp', (1000, 6000)) * np.exp(-T(0.25) / (0.011 if i < 3 else 0.075))
        j = int(dt * SR); out[j:j + len(bl)] += bl[:len(out) - j]
    return norm(out)


def snare(d=0.18):
    return norm(filt(noise(d), 'bp', (1500, 9000)) * np.exp(-T(d) / 0.045) + 0.6 * osc(210, d) * np.exp(-T(d) / 0.03))


def hat(open_=False):
    d = 0.24 if open_ else 0.045
    return norm(filt(noise(d), 'high', 7800) * np.exp(-T(d) / (0.08 if open_ else 0.01)))


def crash(d=2.4):
    t = T(d)
    s = filt(noise(d), 'high', 4200) * np.exp(-t / 0.8) + 0.25 * sum(osc(f, d, rng.uniform(0, 6)) for f in (3120, 4370, 5810, 7260)) * np.exp(-t / 0.55)
    return norm(s * np.minimum(1, t / 0.002))


def whoosh(d, f0, f1, shape=2.0):
    t = T(d); k = t / d
    out = np.zeros(len(t)); x = noise(d); seg = int(0.01 * SR)
    for i in range(0, len(t), seg):
        fc = f0 * (f1 / f0) ** (i / len(t))
        out[i:i + seg] = filt(x[max(0, i - seg * 4):i + seg], 'bp', (fc * 0.6, fc * 1.6))[-len(out[i:i + seg]):]
    return norm(out * np.sin(np.pi * np.clip(k, 0, 1)) ** shape)


def riser(d, f0=300, f1=6000):
    t = T(d); k = t / d
    nz = whoosh(d, f0, f1, 0.4) * k ** 2
    tone = osc(midi(57) * 2 ** (2 * k), d) * 0.25 * k ** 3
    return norm(nz + tone)


def metal(fs, d=0.7, tau=0.25):
    t = T(d)
    s = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / (tau * (1.3 - 0.2 * i))) for i, (f, a) in enumerate(fs))
    return norm(s * np.minimum(1, t / 0.0008))


def bell(m, d=2.0, bright=1.0):
    f = midi(m); t = T(d)
    mod = (2.0 * bright) * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * 3.5 * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.8) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.3)
    return norm(s * np.minimum(1, t / 0.0015))


def bowl(m, d=2.4):
    f = midi(m); t = T(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t / tau) for r, a, tau in ((1, 1, 1.4), (2.71, 0.5, 0.9), (5.12, 0.25, 0.5)))
    return norm(s * (1 + 0.25 * np.sin(2 * np.pi * 4.2 * t)) * np.minimum(1, t / 0.006))


def pluck(m, d=0.35, cut=3500):
    f = midi(m); t = T(d)
    s = sum(np.sin(2 * np.pi * f * h * t + h) / h for h in range(1, 12)) + 0.6 * np.sin(2 * np.pi * f * 2.003 * t)
    e = np.exp(-t / 0.12) * np.minimum(1, t / 0.002)
    return norm(filt(s * e, 'low', cut) + 0.2 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.25))


def bassp(m, d=0.22):
    f = midi(m); t = T(d)
    s = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 9))
    return norm(filt(s, 'low', 1000) * np.exp(-t / 0.1) * np.minimum(1, t / 0.003) + 0.9 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.14))


def sub(m, d=0.8):
    t = T(d)
    s = np.sin(2 * np.pi * midi(m) * t * (1 + 0.5 * np.exp(-t / 0.03))) * np.exp(-t / 0.35) * np.minimum(1, t / 0.003)
    return np.tanh(1.8 * s)


def supersaw(notes, d, cut=2400, att=0.01, rel=0.08, voices=5, spread=14):
    t = T(d); L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for j in range(voices):
            dt = (j - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            f = midi(m) * 2 ** (dt / 1200)
            ph = rng.uniform(0, 1)
            saw = 2 * ((f * t + ph) % 1) - 1
            (L if j % 2 else R)[:] += saw
            if j == voices // 2:
                L += saw * 0.5; R += saw * 0.5
    env_ = np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)
    return np.vstack([filt(L, 'low', cut), filt(R, 'low', cut)]) * env_ / (len(notes) * voices)


def pad(notes, d, cut=1400, att=0.4, rel=0.6):
    t = T(d); L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for i, dt in enumerate((-8, -3, 3, 8)):
            f = midi(m) * 2 ** (dt / 1200); ph = rng.uniform(0, 6)
            s = sum(np.sin(2 * np.pi * f * h * t + ph * h) / h for h in range(1, 8))
            (L if i % 2 else R)[:] += s
    env_ = np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)
    return np.vstack([filt(L, 'low', cut), filt(R, 'low', cut)]) * env_ / (len(notes) * 4)


def ahh(notes, d=0.6):
    t = T(d); out = np.zeros(len(t))
    for m in notes:
        f = midi(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))
        src = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in range(1, 24))
        out += sum(g * filt(src, 'bp', (fc * 0.85, fc * 1.15)) for fc, g in ((750, 1.0), (1150, 0.6), (2600, 0.25)))
    return norm(out * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.2, 0, 1))


def blip(f, d=0.06):
    t = T(d)
    return norm(np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t / 0.01))) * np.exp(-t / 0.02) * np.minimum(1, t / 0.001))


def plop(f=420, d=0.12):
    t = T(d)
    f_ = f * (1 + 1.5 * np.exp(-t / 0.012))
    return norm(np.sin(2 * np.pi * np.cumsum(f_) / SR) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001))


def splash(d=0.9):
    t = T(d)
    s = filt(noise(d), 'bp', (600, 9000)) * (np.exp(-t / 0.18) * np.minimum(1, t / 0.01))
    s += 0.5 * filt(noise(d), 'low', 500) * np.exp(-t / 0.08)
    return norm(s)


def punch():
    s = thump(140, 45, 0.35, 0.09, 0.015) * 1.0
    n_ = filt(noise(0.12), 'bp', (300, 3000)) * np.exp(-T(0.12) / 0.02)
    s[:len(n_)] += 0.8 * n_
    return norm(np.tanh(s * 2.5))


def tick(f=3200):
    t = T(0.03)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.3 * filt(noise(0.03), 'high', 5000) * np.exp(-t / 0.002))


def coin(m):
    f = midi(m); t = T(0.35)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.4 * t) + 0.3 * np.sin(2 * np.pi * f * 3.9 * t)
    return norm(s * np.exp(-t / 0.09) * np.minimum(1, t / 0.0008))


def sparkle(d=0.8):
    out = np.zeros(int(d * SR))
    for i in range(14):
        b = bell(rng.choice([88, 91, 93, 96, 98, 100]), 0.4, 0.6) * 0.5
        j = int(rng.uniform(0, d - 0.4) * SR); out[j:j + len(b)] += b
    return norm(out)


def scan_beep(d):
    t = T(d)
    f = 1400 + 500 * np.sin(2 * np.pi * 1.6 * t)
    s = osc(f, d) * (0.5 + 0.5 * (np.sin(2 * np.pi * 12 * t) > 0)) * 0.25
    return s * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.03, 0, 1)


# ------------------------------------------------------------------ harmony
PROG = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]   # Am F C G


def chord_at(tt):
    bar = int(np.floor((tt - G0) / (4 * BEAT)))
    return PROG[bar % 4]


SCALE = [69, 71, 72, 74, 76, 79, 81, 83, 84, 86, 88, 91]     # A minor pentatonic-ish climb


# ------------------------------------------------------------------ cues
def cue(e):
    ty, t0 = e['type'], e['t']
    if ty == 'cardIn':
        F(whoosh(0.5, 400, 3000, 1.5), t0 - 0.1, 0.35, pan=-0.3, r=0.2)
        F(bell(81, 1.4), t0 + 0.2, 0.15, r=0.4)
    elif ty == 'hit':
        F(sub(33, 0.6), t0, 0.6); F(snare(), t0, 0.3, r=0.3)
    elif ty == 'burst':
        F(crash(1.6), t0, 0.35, r=0.2, b=0.2); F(sub(33, 0.7), t0, 0.7)
        for i, m in enumerate((69, 72, 76, 81, 84, 88)):
            F(pluck(m, 0.3, 5000), t0 + i * 0.035, 0.18, pan=(i - 2.5) / 3, r=0.3)
        F(whoosh(0.6, 2000, 300, 1.2), t0, 0.25, pan=0.4)
    elif ty == 'sport':
        i = e['i']; obj = e['obj']
        F(whoosh(0.22, 600, 5000, 1.2), t0 - 0.12, 0.25, pan=(-1) ** i * 0.5)
        if obj == 'dumbbell':
            F(metal([(310, 1), (847, 0.6), (1520, 0.4), (2650, 0.2)], 0.8, 0.22), t0 + 0.02, 0.35, r=0.3)
            F(metal([(330, 1), (903, 0.5), (1610, 0.3)], 0.6, 0.18), t0 + 0.09, 0.22, pan=0.3, r=0.3)
        elif obj == 'ring':
            F(splash(), t0, 0.4, r=0.3, width=1)
            for j in range(6):
                F(plop(500 + 160 * j + rng.uniform(-40, 40)), t0 + 0.12 + j * 0.06, 0.18, pan=rng.uniform(-0.6, 0.6))
        elif obj == 'mat':
            F(bowl(76, 2.0), t0, 0.3, r=0.4, b=0.3)
        elif obj == 'disco':
            F(sparkle(0.7), t0, 0.28, r=0.4, width=1)
            F(whoosh(0.3, 3000, 8000, 1.0), t0, 0.15, pan=0.3)
        elif obj == 'glove':
            F(punch(), t0 + 0.02, 0.85, r=0.15)
            F(crash(0.6), t0 + 0.02, 0.12)
        elif obj == 'kettle':
            F(thump(90, 40, 0.5, 0.15, 0.03), t0 + 0.05, 0.8)
            F(metal([(220, 1), (590, 0.6), (1040, 0.4)], 0.9, 0.3), t0 + 0.05, 0.25, r=0.3)
    elif ty == 'whip':
        F(whoosh(0.3, 500, 7000, 1.3), t0 - 0.08, 0.45, pan=0.2, r=0.15, width=1)
    elif ty == 'pin':
        i = e['i']
        F(blip(midi(SCALE[i % len(SCALE)]) * 2, 0.07), t0, 0.16, pan=np.sin(i * 1.7) * 0.7, r=0.25)
    elif ty == 'counter':
        k = t0
        while k < e['end']:
            F(tick(2600 + 900 * (k - t0)), k, 0.07, pan=0.1); k += 0.045 + 0.06 * ((k - t0) / (e['end'] - t0)) ** 2
        F(bell(88, 1.0), e['end'], 0.18, r=0.3)
    elif ty == 'pop':
        F(plop(700, 0.15), t0, 0.35, r=0.2); F(blip(1600), t0 + 0.02, 0.12)
    elif ty == 'phoneIn':
        F(whoosh(0.45, 300, 2500, 1.5), t0 - 0.05, 0.3, pan=-0.2)
    elif ty == 'tap':
        F(tick(1800), t0, 0.35); F(plop(900, 0.08), t0, 0.2)
    elif ty == 'scan':
        F(scan_beep(e['end'] - t0 - 0.05), t0, 0.22, pan=0.1)
    elif ty == 'success':
        for i, m in enumerate((76, 81, 85, 88)):
            F(bell(m, 1.4, 0.7), t0 + i * 0.06, 0.22, r=0.35)
        F(crash(2.0), t0, 0.3, b=0.2); F(sub(33, 0.8), t0, 0.7)
    elif ty == 'tick':
        F(coin(84 + (e['j'] % 4) * 3), t0, 0.12, pan=(e['j'] - 5.5) / 7, r=0.2)
    elif ty == 'swoosh':
        F(whoosh(0.4, 900, 6000, 1.4), t0 - 0.1, 0.35, pan=-0.4)
    elif ty == 'ticket':
        F(whoosh(0.25, 2000, 7000, 1.0), t0, 0.2, pan=0.5); F(blip(1900), t0 + 0.25, 0.15, r=0.3)
    elif ty == 'logo':
        F(kick(), t0, 1.0); F(sub(33, 1.2), t0, 0.9); F(crash(2.6), t0, 0.45, r=0.2, b=0.4)
        F(ahh([57, 64, 69, 72], 0.9), t0, 0.35, r=0.3, b=0.4)
        F(whoosh(0.8, 6000, 300, 1.2), t0, 0.2, width=1)


# ------------------------------------------------------------------ music
def hook():
    """Build-up over the card: pad, opening pluck arpeggio, riser, snare roll, a breath of silence."""
    M(pad([57, 60, 64], G0 + 0.1, 1100, 0.6, 0.4), 0.05, 0.4, r=0.3)
    s16 = BEAT / 4
    k = G0 - 16 * s16 * 2
    arp = [69, 72, 76, 81, 76, 72]
    i = 0
    while k < G0 - 0.12:
        if k > 0.15:
            prog_ = np.clip(k / G0, 0, 1)
            M(pluck(arp[i % len(arp)], 0.25, 900 + 4500 * prog_ ** 2), k, 0.18 + 0.1 * prog_, pan=0.3 * np.sin(i), r=0.25)
        k += s16; i += 1
    M(riser(1.3), G0 - 1.35, 0.35, width=1)
    # snare roll accelerating into the drop
    k = G0 - 2 * BEAT
    while k < G0 - 0.11:
        M(snare(0.12), k, 0.12 + 0.25 * (1 - (G0 - k) / (2 * BEAT)), r=0.15)
        k += BEAT / (4 if k < G0 - BEAT else 8)


def groove(t0, t1, g=1.0, saw=True):
    s16 = BEAT / 4
    n0 = int(np.ceil((t0 - G0) / s16 - 1e-6))
    s = n0
    while G0 + s * s16 < t1 - 1e-6:
        tt = G0 + s * s16
        q = s % 16
        if q % 4 == 0:
            M(kick(), tt, 0.8 * g)
        if q in (4, 12):
            M(clap(), tt, 0.38 * g, r=0.2)
        if q % 4 == 2:
            M(hat(True), tt, 0.11 * g, pan=0.25)
        M(hat(), tt, (0.04 if s % 2 else 0.07) * g, pan=-0.2)
        root, notes = chord_at(tt)
        if q % 4 in (2, 3) or q in (0, 8):
            M(bassp(root + (12 if q % 4 == 3 else 0)), tt, 0.5 * g)
        if saw and q % 4 == 2:                 # off-beat supersaw stabs
            put(chords, supersaw(notes, BEAT * 0.45, 2600), tt, 0.5 * g, r=0.15)
        if q in (0, 3, 6, 10, 13) and saw:     # top-line pluck hook
            mel = {0: 0, 3: 2, 6: 1, 10: 3, 13: 2}[q]
            M(pluck(notes[min(mel, 3)] + 12, 0.25, 4200), tt, 0.09 * g, pan=-0.3, r=0.3)
        s += 1


def pump():
    tt = np.arange(N) / SR
    ph = np.mod(tt - G0, BEAT)
    return 1 - 0.75 * np.exp(-ph / 0.09) * (tt >= G0)


def score():
    hook()
    gap = C['brand'] - BEAT                    # one beat of silence before the logo
    groove(G0, gap)
    groove(C['brand'], C['end'] + 0.3, 0.8)
    M(pad([57, 60, 64, 69], DUR - C['brand'], 1800, 0.05, 1.2), C['brand'], 0.35, b=0.3)
    M(pad([45, 57, 64, 69, 72], DUR - C['end'] + 0.2, 2200, 0.02, 0.9), C['end'] - 0.05, 0.4, b=0.4)
    M(sub(33, 1.2), C['end'] - 0.05, 0.5)


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    score()
    r = wave.open(sys.argv[2])
    assert r.getframerate() == SR
    x = np.frombuffer(r.readframes(r.getnframes()), np.int16) / 32768.0
    if r.getnchannels() == 2:
        x = x.reshape(-1, 2).mean(1)
    x = filt(x, 'high', 80)
    x = x + 0.2 * filt(x, 'high', 3200)        # presence
    lv = np.sqrt(signal.sosfilt(signal.butter(1, 12 / (SR / 2), 'low', output='sos'), x ** 2) + 1e-9)
    thr = np.percentile(lv[lv > 1e-3], 55)
    x = norm(x * np.where(lv > thr, (thr / lv) ** (1 - 1 / 3.0), 1.0))
    put(vo, x, VO0, 1.0, r=0.03)
    venv = np.abs(vo[0]) + np.abs(vo[1])
    venv = signal.sosfilt(signal.butter(1, 5 / (SR / 2), 'low', output='sos'), venv)
    venv = np.clip(venv / (np.percentile(venv[venv > 1e-4], 70) + 1e-9), 0, 1)
    duck = 1 - 0.5 * venv
    music = mus + chords * pump()
    irL, irR = reverb_ir(1.3, 0.24)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = reverb_ir(3.0, 0.6, 5)
    rb = np.vstack([signal.fftconvolve(big[0], bL)[:N], signal.fftconvolve(big[1], bR)[:N]])

    def rms(a):
        return np.sqrt(np.mean(a[np.abs(a) > 1e-5] ** 2) + 1e-12)
    g = 1 / rms(vo)
    mix = vo * g + fx * g * 0.5 + music * duck * g * 0.32 + rv * g * 0.4 + rb * g * 0.3
    mix = signal.sosfilt(signal.butter(2, 30 / (SR / 2), 'high', output='sos'), mix, axis=1)
    pk = np.percentile(np.abs(mix), 99.95)
    mix = np.tanh(mix / pk * 1.1) / np.tanh(1.1)
    k = np.arange(N) / SR
    mix *= np.clip((DUR - k) / 0.5, 0, 1) ** 1.5 * np.clip(k / 0.01, 0, 1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-0.8 / 20)
    with wave.open(sys.argv[3], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[3]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')
    for name, b in (('vo', vo * g), ('fx', fx * g * 0.5), ('mus', music * duck * g * 0.32)):
        print(name, f'{20 * np.log10(np.sqrt(np.mean(b ** 2)) + 1e-9):.1f} dB')


if __name__ == '__main__':
    main()
