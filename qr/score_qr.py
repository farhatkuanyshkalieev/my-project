"""Qazaq Republic reel: music + sound design, synthesized from scratch (no samples).

Bright and friendly, C major, 120 BPM. The intro is played by the dot:
each bounce rings a marimba note (G4, C5, E5) and the letters pop out of
the floor. From the first day a four-on-the-floor groove kicks in (claps on
2 and 4, off-beat hats, a plucked octave bass), and the week climbs the
scale: Monday C5, Tuesday D5 … Sunday B5, so the drop on the tiles lands on
the octave C6. «jaqsy» / «kúnder.» are sung by a formant «ah» stab, the
badge spins up, the circle wipe pulls the beat out, and the dot lands as
the period of the logo on the final C major chord.

usage: python3 score_qr.py build/events.json build/sound.wav
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
DUR = 10.0
N = int(SR * DUR)
BPM = 120
S16 = 60 / BPM / 4
rng = np.random.default_rng(21)
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
        sos = signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype='band', output='sos')
    else:
        sos = signal.butter(order, f / (SR / 2), btype=kind, output='sos')
    return signal.sosfilt(sos, x)


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
def ks(f, d=1.2, decay=0.996, bright=3800):
    n = max(2, int(round(SR / f)))
    x = np.zeros(int(d * SR))
    x[:n] = filt(rng.standard_normal(n), 'low', bright)
    a = np.zeros(n + 2); a[0] = 1; a[n] = -decay * 0.5; a[n + 1] = -decay * 0.5
    y = signal.lfilter([1.0], a, x)
    return y * np.clip((d - T(d)) / 0.06, 0, 1)




def thump(f0, f1, d, tau, ptau):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t / ptau)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * np.minimum(1, t / 0.001))


def kick():
    s = thump(170, 48, 0.42, 0.13, 0.025)
    s[:int(0.006 * SR)] += filt(noise(0.006), 'high', 2500) * 0.35
    return norm(np.tanh(s * 1.8))



def clap():
    out = np.zeros(int(0.3 * SR))
    for i, dt in enumerate((0, 0.008, 0.017, 0.026)):
        bl = filt(noise(0.25), 'bp', (900, 5500)) * np.exp(-T(0.25) / (0.012 if i < 3 else 0.08))
        j = int(dt * SR); out[j:j + len(bl)] += bl[:len(out) - j]
    return norm(out)


def snare(d=0.2):
    return norm(filt(noise(d), 'bp', (1500, 8000)) * np.exp(-T(d) / 0.05) + 0.6 * osc(200, d) * np.exp(-T(d) / 0.035))


def hat(open_=False):
    d = 0.22 if open_ else 0.045
    return norm(filt(noise(d), 'high', 7500) * np.exp(-T(d) / (0.07 if open_ else 0.011)))


def crash(d=2.6):
    t = T(d)
    s = filt(noise(d), 'high', 4000) * np.exp(-t / 0.9) + 0.25 * sum(osc(f, d, rng.uniform(0, 6)) for f in (3120, 4370, 5810, 7260)) * np.exp(-t / 0.6)
    return norm(s * np.minimum(1, t / 0.002))


def wood(f=1800, d=0.06):
    t = T(d)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + 0.4 * filt(noise(d), 'bp', (f * 0.8, f * 2.5)) * np.exp(-t / 0.004))


def whoosh(d, f0, f1, shape=2.0):
    t = T(d); k = t / d
    out = np.zeros(len(t))
    x = noise(d)
    seg = int(0.01 * SR)
    for i in range(0, len(t), seg):   # stepped band-pass sweep
        fc = f0 * (f1 / f0) ** (i / len(t))
        out[i:i + seg] = filt(x[max(0, i - seg * 4):i + seg], 'bp', (fc * 0.6, min(fc * 1.6, SR * 0.45)))[-len(out[i:i + seg]):]
    return norm(out * np.sin(np.pi * np.clip(k, 0, 1)) ** shape)


def metal(fs, d=0.7, tau=0.25):
    t = T(d)
    s = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / (tau * (1.3 - 0.2 * i))) for i, (f, a) in enumerate(fs))
    return norm(s * np.minimum(1, t / 0.0008))

def bell(m, d=2.2, bright=1.0):
    """Icy FM bell (inharmonic, glassy)."""
    f = midi(m); t = T(d)
    mod = (2.2 * bright) * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * 3.5 * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.9) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.3)
    return norm(s * np.minimum(1, t / 0.0015))

def epiano(notes, d=1.6):
    """Warm FM electric piano chord (the «soul» colour)."""
    t = T(d); out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        mod = 1.3 * np.exp(-t / 0.35) * np.sin(2 * np.pi * f * t)
        out += np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 1.1) + 0.15 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.02)
    return norm(out * np.minimum(1, t / 0.004))

def pad(notes, d, cut=1600, att=0.3, rel=0.6):
    t = T(d); L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for i, dt in enumerate((-9, -3, 3, 9)):
            f = midi(m) * 2 ** (dt / 1200)
            ph = rng.uniform(0, 6)
            s = sum(np.sin(2 * np.pi * f * h * t + ph * h) / h for h in range(1, 9))
            (L if i % 2 else R)[:] += s
    env_ = np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)
    return np.vstack([filt(L, 'low', cut), filt(R, 'low', cut)]) * env_ / (len(notes) * 4)

def sub(m, d=0.45):
    t = T(d)
    s = np.sin(2 * np.pi * midi(m) * t) * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.05, 0, 1)
    return np.tanh(1.6 * s)


def marimba(m, d=0.9, bright=1.0):
    f = midi(m); t = T(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.4 * bright * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.06) + 0.15 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.015)
    return norm(s * np.minimum(1, t / 0.0015))


def pluck(m, d=0.5, cut=3500):
    """Bright synth pluck (the week's melody)."""
    f = midi(m); t = T(d)
    s = sum(np.sin(2 * np.pi * f * h * t + h) / h for h in range(1, 12)) + 0.6 * np.sin(2 * np.pi * f * 2.003 * t)
    e = np.exp(-t / 0.16) * np.minimum(1, t / 0.002)
    return norm(filt(s * e, 'low', cut) + 0.2 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.3))


def bassp(m, d=0.2):
    f = midi(m); t = T(d)
    s = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 9))
    return norm(filt(s, 'low', 900) * np.exp(-t / 0.09) * np.minimum(1, t / 0.003) + 0.8 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.13))


def ahh(notes, d=0.45):
    """Formant «ah» stab: a sung-sounding chord."""
    t = T(d); out = np.zeros(len(t))
    for m in notes:
        f = midi(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))
        src = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in range(1, 24))
        out += sum(g * filt(src, 'bp', (fc * 0.85, fc * 1.15)) for fc, g in ((750, 1.0), (1150, 0.6), (2600, 0.25)))
    return norm(out * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.12, 0, 1))


def blip(f, d=0.05):
    t = T(d)
    return norm(np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t / 0.01))) * np.exp(-t / 0.018) * np.minimum(1, t / 0.001))


def boing(f0=160, f1=520, d=0.4):
    t = T(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.07)) + 25 * np.sin(2 * np.pi * 16 * t) * np.exp(-t / 0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13) * np.minimum(1, t / 0.003))


def plop(f=420, d=0.12):
    t = T(d)
    f_ = f * (1 + 1.5 * np.exp(-t / 0.012))
    return norm(np.sin(2 * np.pi * np.cumsum(f_) / SR) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001))


def whistle(f0, f1, d):
    t = T(d); f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 0.6


# ------------------------------------------------------------------ cues
SCALE = [72, 74, 76, 77, 79, 81, 83, 84]          # C5 … B5, C6
CHORD_AT = [(0.0, [60, 64, 67, 71]), (3.0, [65, 69, 72, 76]), (4.0, [57, 60, 64, 67]), (5.0, [55, 59, 62, 65]), (5.5, [60, 64, 67, 72]), (6.5, [65, 69, 72, 76]), (7.0, [67, 71, 74, 77]), (8.0, [60, 64, 67, 72])]
ROOTS = [(0.0, 36), (3.0, 41), (4.0, 33), (5.0, 31), (5.5, 36), (6.5, 41), (7.0, 43), (8.0, 36)]


def at(table, t):
    v = table[0][1]
    for tt, x in table:
        if t >= tt - 1e-6:
            v = x
    return v


def cue(e):
    t, k = e['t'], e['type']
    if k == 'fall':
        d = e['end'] - t
        F(whistle(1800, 500, d), t, 0.16)
    elif k == 'bounce':
        F(marimba([67, 72, 76][e['i']], 1.2), t, 0.7, r=0.2, b=0.15)
        F(norm(thump(140, 60, 0.25, 0.06, 0.012)), t, 0.5)
        if e['i'] < 2:
            F(whistle(500, 900 + 300 * e['i'], 0.5), t + 0.02, 0.06)
    elif k == 'stamp':
        F(plop(380 + 120 * e['i']), t + 0.01, 0.5)
    elif k == 'caption':
        for j in range(6):
            F(blip(3000 + 200 * j, 0.03), t + j * 0.03, 0.08)
    elif k == 'swell':
        d = e['end'] - t
        F(whoosh(d + 0.03, 400, 5000, 0.6) * np.linspace(0.2, 1, int((d + 0.03) * SR)), t, 0.3, width=1)
    elif k == 'day':
        i = e['i']
        F(pluck(SCALE[i], 0.6), t, 0.55, pan=-0.2 + 0.07 * i, r=0.25, b=0.1)
        F(epiano(at(CHORD_AT, t), 0.35), t, 0.3, r=0.2)
        shapes = [(900, 6000), (300, 3000), (5000, 900), (600, 4000), (800, 7000), (400, 2500), (2000, 6000)]
        f0, f1 = shapes[i]
        F(whoosh(0.22, f0, f1, 1.4), t - 0.06, 0.28, pan=[0, 0, -0.3, 0, 0.3, 0, 0.4][i], width=1)
    elif k == 'hop':
        F(marimba(SCALE[e['i']] + 12, 0.4, 1.2), t, 0.18, pan=-0.4 + 0.13 * e['i'])
    elif k == 'item':
        F(plop(300 + 40 * e['i'], 0.1), t, 0.3)
    elif k == 'tiles':
        F(crash(2.2), t, 0.3, b=0.3, width=1)
        F(pluck(84, 0.9), t, 0.6, r=0.3, b=0.2)
        for j in range(36):
            F(blip(900 + 2600 * rng.random(), 0.04), t + 0.28 * (j / 36) ** 0.8 + 0.01 * rng.random(), 0.12, pan=rng.uniform(-0.7, 0.7))
    elif k == 'band':
        F(boing(120, 360, 0.3), t, 0.35)
    elif k == 'word':
        F(ahh([72, 76, 79] if e['i'] == 0 else [74, 77, 81], 0.42), t, 0.45, r=0.25, b=0.2, width=1)
        F(whoosh(0.2, 600, 4000, 1.3), t - 0.06, 0.22)
    elif k == 'badge':
        F(whoosh(0.45, 300, 6000, 0.9), t, 0.35, width=1)
        F(bell(91, 1.5), t + 0.2, 0.3, r=0.3, b=0.3)
        F(ahh([67, 72, 76], 0.45), t, 0.35, r=0.25, b=0.2)
    elif k == 'wipe':
        F(whoosh(0.5, 300, 7000, 0.8), t - 0.2, 0.5, width=1)
        rc = crash(0.3)[::-1] * np.linspace(0, 1, int(0.3 * SR)) ** 2
        F(rc, t - 0.3, 0.3, width=1)
    elif k == 'slide':
        F(whoosh(0.25, 3000, 700, 1.4), t, 0.3, pan=[-0.5, 0.5][e['i']])
    elif k == 'dotFall':
        d = e['end'] - t
        F(whistle(2400, 600, d), t, 0.16)
    elif k == 'final':
        F(kick(), t, 1.0)
        F(crash(2.0), t, 0.4, b=0.35, width=1)
        F(boing(140, 420, 0.4), t, 0.4)
        for j, m in enumerate([60, 64, 67, 72, 76]):
            F(marimba(m, 1.6), t + j * 0.018, 0.45, pan=-0.4 + 0.2 * j, r=0.25, b=0.3)
        F(pad([48, 60, 64, 67, 71], 2.0, 2200, 0.05, 0.9), t, 0.95, b=0.3)
        F(bell(96, 2.0), t + 0.05, 0.25, r=0.3, b=0.4)
    elif k == 'tick':
        F(blip(2600 + 90 * e['i'], 0.025), t, 0.08, pan=-0.4 + 0.06 * e['i'])
    elif k == 'tick2':
        for j in range(4):
            F(blip(3400, 0.025), t + j * 0.04, 0.08)
    elif k == 'pop':
        F(plop(520, 0.12), t, 0.45)
        F(marimba(84, 0.6), t, 0.25, r=0.2)
    elif k == 'label':
        F(norm(filt(noise(0.09), 'bp', (800, 5000)) * np.exp(-T(0.09) / 0.02)), t, 0.35)
        F(plop(700, 0.08), t + 0.18, 0.3)
    elif k == 'pulse':
        F(norm(thump(120, 55, 0.25, 0.06, 0.01)), t, 0.35)
        F(marimba(79 if t < 9.2 else 84, 0.8), t, 0.25, r=0.25, b=0.2)


# ------------------------------------------------------------------ the groove
def groove(t0, t1, g=1.0, kick_from=None):
    s = 0
    while t0 + s * S16 < t1 - 1e-6:
        tt = t0 + s * S16
        if s % 4 == 0 and (kick_from is None or tt >= kick_from):
            M(kick(), tt, 0.75 * g)
        if s % 8 == 4:
            M(clap(), tt, 0.4 * g, r=0.2)
        if s % 4 == 2:
            M(hat(True), tt, 0.12 * g, pan=0.25)
        M(hat(), tt, (0.05 if s % 2 else 0.08) * g, pan=-0.2)
        root = at(ROOTS, tt)
        if s % 4 in (0, 3) or s % 8 == 6:
            M(bassp(root + (12 if s % 4 == 3 else 0), 0.18), tt, 0.5 * g)
        s += 1


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    groove(2.0, 7.4)                        # the week + the tiles
    M(pad([48, 60, 64, 67], 0.5, 1200, 0.05, 0.3), 7.5, 0.35, b=0.3)    # held breath before the landing
    groove(8.0, 9.75, 0.75, kick_from=8.5)  # outro groove
    irL, irR = reverb_ir(1.2, 0.22)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = reverb_ir(2.8, 0.6, 5)
    rb = np.vstack([signal.fftconvolve(big[0], bL)[:N], signal.fftconvolve(big[1], bR)[:N]])
    mix = mus + fx + 0.45 * rv + 0.45 * rb
    tt = np.arange(N) / SR
    mix = signal.sosfilt(signal.butter(2, 28 / (SR / 2), 'high', output='sos'), mix, axis=1)
    pk = np.percentile(np.abs(mix), 99.9)
    mix = np.tanh(mix / pk * 1.1) / np.tanh(1.1)
    mix *= np.clip((DUR - tt) / 0.3, 0, 1) * np.clip(tt / 0.01, 0, 1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1.0 / 20)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')


if __name__ == '__main__':
    main()
