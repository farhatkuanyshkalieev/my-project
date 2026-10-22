"""soultustik reel: music + sound design, synthesized from scratch (no samples).

Cold and minimal, like the brand's «cold minded.»: a northern wind runs under
everything; an icy bell motif (E minor) rings while the compass finds north;
«soul» lands warm (electric piano), «soltüstik» lands cold (glass + gust);
pins ping as the region's towns appear, the temperature ticks down over a
riser and creeping ice crackle; a hard gap; then the drop: a deep 4x4 house
beat with an off-beat sub, a frozen pad and the bell motif. The sweatshirt
rises and spins with fabric swishes; the finale resolves warm under the snow.

usage: python3 score_soul.py build/events.json build/sound.wav
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
DUR = 8.0
N = int(SR * DUR)
BPM = 120
S16 = 60 / BPM / 4
rng = np.random.default_rng(13)
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


def eight08(m, d=0.8, to=None, glide_t=0.08):
    t = T(d)
    f0 = midi(m)
    f = f0 * np.ones_like(t)
    if to is not None:
        k = np.clip((t - (d - glide_t * 2.5)) / glide_t, 0, 1)
        f = f0 * (midi(to) / f0) ** k
    f = f * (1 + 1.6 * np.exp(-t / 0.018))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.minimum(1, t / 0.002) * np.exp(-t / (d * 0.75)) * np.clip((d - t) / 0.03, 0, 1)
    return norm(np.tanh(2.4 * s * e))


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



def crackle(d):
    out = filt(noise(d), 'bp', (500, 6000)) * 0.03
    k = int(d * 38)
    for _ in range(k):
        i = rng.integers(0, len(out) - 200)
        out[i:i + 120] += filt(rng.standard_normal(120), 'high', 1500) * np.hanning(120) * rng.uniform(0.2, 1.0)
    return out


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


def wind(d):
    """Northern wind: noise through a slowly wandering band-pass, gusting."""
    x = noise(d); n = len(x); out = np.zeros(n)
    seg = int(0.02 * SR)
    t = np.arange(0, n, seg) / SR
    fc = 700 + 330 * np.sin(t * 1.3) + 200 * np.sin(t * 3.1 + 1)
    for j, i in enumerate(range(0, n, seg)):
        a = max(0, i - seg * 6)
        out[i:i + seg] = filt(x[a:i + seg], 'bp', (fc[j] * 0.55, fc[j] * 1.8))[-len(out[i:i + seg]):]
    gust = 0.65 + 0.35 * np.sin(np.arange(n) / SR * 2.2) ** 2
    return out * gust


def ice(d, n=60, seed=0):
    """Ice cracking: a spray of tiny glassy ticks."""
    r = np.random.default_rng(seed); out = np.zeros(int(d * SR))
    for _ in range(n):
        i = int(r.uniform(0, 1) ** 0.7 * (len(out) - 600))
        f = r.uniform(2500, 9000); L = int(r.uniform(0.003, 0.012) * SR)
        tt = np.arange(L) / SR
        out[i:i + L] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.002) * r.uniform(0.2, 1)
    return norm(out)


# ------------------------------------------------------------------ cues
MOTIF = [76, 83, 79, 88]   # E5 B5 G5 E6


def needle_angle(t):   # same motion as the scene (radians of swing → ratchet ticks)
    settle = 0.75
    k = np.clip((t - 0.45) / (settle - 0.45), 0, 1)
    swing = 2.4 * np.exp(-t * 2.6) * np.cos(2 * np.pi * 1.55 * t) * (1 - k ** 3)
    rest = 0.035 * np.exp(-(t - settle) * 9) * np.sin((t - settle) * 60)
    return np.where(t >= settle, rest, swing)


def cue(e):
    t, k = e['t'], e['type']
    if k == 'wind':
        w = wind(DUR)
        tt = np.arange(N) / SR
        g = np.interp(tt, [0, 0.9, 1.0, 2.0, 2.94, 3.0, 4.5, 6.5, 8.0], [0.9, 0.9, 0.35, 0.5, 1.1, 0.25, 0.4, 0.55, 0.45])
        F(w * g, 0, 0.5, width=1)
    elif k == 'ringIn':
        F(whoosh(0.35, 6000, 1800, 1.5), t, 0.12, r=0.3)
    elif k == 'bell':
        F(bell(MOTIF[e['i']]), t, 0.42, pan=[-0.3, 0.3, -0.15, 0.15][e['i']], r=0.3, b=0.35)
    elif k == 'needle':
        tt = np.arange(int(t * SR), int(e['end'] * SR) + int(0.25 * SR)) / SR
        a = needle_angle(tt); step = 2 * np.pi / 72
        idx = np.floor(a / step); hits = np.where(np.diff(idx) != 0)[0]
        for h in hits:
            F(wood(3800, 0.02), tt[h], 0.14, pan=0.2, r=0.05)
    elif k == 'north':
        F(bell(88, 2.5, 1.4), t, 0.5, r=0.3, b=0.4)
        F(bell(95, 2.0, 1.0), t + 0.01, 0.25, r=0.3, b=0.4)
        F(norm(thump(90, 40, 0.6, 0.2, 0.03)), t, 0.4)
    elif k == 'dive':
        d = e['end'] - t
        F(whoosh(d + 0.02, 500, 7000, 0.7), t, 0.45, width=1)
    elif k == 'soul':
        F(kick(), t, 0.45)
        F(epiano([52, 59, 62, 66, 71]), t, 0.42, r=0.25, b=0.2, width=1)
        F(sub(40, 0.6), t, 0.3)
    elif k == 'solt':
        F(kick(), t, 0.5)
        for j, m in enumerate((88, 91, 95)):
            F(bell(m, 1.6, 1.6), t + j * 0.012, 0.2, pan=-0.3 + 0.3 * j, r=0.3, b=0.3)
        F(whoosh(0.4, 400, 3000, 1.2), t - 0.05, 0.35, width=1)
        F(sub(40, 0.5), t, 0.28)
    elif k == 'merge':
        d = e['end'] - t
        F(whoosh(d, 1200, 5000, 0.6) * np.linspace(0.3, 1, int(d * SR)), t, 0.3)
    elif k == 'logo2d':
        F(norm(filt(noise(0.04), 'high', 2500) * np.exp(-T(0.04) / 0.006)), t, 0.4)
        F(bell(76, 1.5), t, 0.3, r=0.3, b=0.2)
    elif k == 'draw':
        d = e['end'] - t
        s = filt(noise(d), 'bp', (2000, 6000)) * np.sin(np.pi * T(d) / d) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * T(d)))
        F(s, t, 0.1, pan=-0.2)
    elif k == 'pin':
        F(bell([88, 91, 93, 95, 98][e['i']], 1.0, 0.8), t, 0.32, pan=-0.4 + 0.2 * e['i'], r=0.25, b=0.15)
    elif k == 'tempTick':
        F(wood(5200, 0.012), t, 0.05, pan=0.4)
    elif k == 'riser':
        d = e['end'] - t
        F(whoosh(d, 300, 9000, 0.6) * np.linspace(0.2, 1, int(d * SR)) ** 1.5, t, 0.4, r=0.2, width=1)
        f = 160 * (8 ** (T(d) / d))
        F(np.tanh(osc(f, d) * 2) * np.linspace(0, 1, int(d * SR)) ** 2, t, 0.1)
        tt, step = 2.5, 0.125
        while tt < e['end'] - 0.01:
            F(hat(), tt, 0.1 + 0.3 * (tt - 2.5) / 0.44, pan=0.2)
            step = max(0.02, step * 0.8); tt += step
    elif k == 'frost':
        d = e['end'] - t
        F(ice(d, 90, 3) * np.linspace(0.2, 1, int(d * SR)) ** 2, t, 0.35, width=1)
    elif k == 'drop':
        F(kick(), t, 1.0)
        F(norm(thump(110, 32, 1.6, 0.5, 0.06)), t, 0.8, b=0.25)
        F(crash(2.6), t, 0.38, r=0.2, b=0.3, width=1)
        F(ice(0.8, 140, 5), t, 0.45, width=1, b=0.2)
        F(whoosh(0.9, 7000, 300, 0.7), t, 0.25, width=1)
        F(bell(88, 2.5, 1.5), t, 0.35, r=0.3, b=0.4)
    elif k == 'word':
        F(whoosh(0.28, 900, 6000, 1.3), t - 0.08, 0.3, pan=[-0.3, 0.3][e['i']], width=1)
        F(bell([83, 79][e['i']], 1.2, 1.2), t, 0.22, r=0.3, b=0.2)
    elif k == 'whip':
        F(whoosh(0.3, 600, 6500, 1.2), t - 0.04, 0.5, width=1)
    elif k == 'rise':
        F(filt(whoosh(0.35, 250, 1400, 1.0), 'low', 3000), t, 0.35)
    elif k == 'settle':
        F(norm(thump(120, 60, 0.3, 0.07, 0.01)), t, 0.35)
    elif k == 'spin':
        F(filt(whoosh(0.32, 300, 2400, 1.0), 'low', 4000), t - 0.02, 0.5, width=1)
        F(norm(filt(noise(0.05), 'bp', (500, 3000)) * np.exp(-T(0.05) / 0.01)), t + 0.27, 0.35)
    elif k == 'zoom':
        d = e['end'] - t
        F(whoosh(d + 0.02, 400, 8000, 0.5) * np.linspace(0.3, 1, int((d + 0.02) * SR)) ** 2, t, 0.5, width=1)
        F(crash(d)[::-1] * np.linspace(0, 1, int(d * SR)) ** 2, t, 0.28, width=1)
    elif k == 'final':
        F(kick(), t, 1.0)
        F(sub(40, 1.3) * np.exp(-T(1.3) / 0.7), t, 0.8)
        F(norm(thump(120, 34, 1.4, 0.45, 0.06)), t, 0.5, b=0.3)
        F(crash(2.0), t, 0.36, b=0.35, width=1)
        for j, m in enumerate((76, 79, 83, 86, 90)):
            F(bell(m, 2.0, 1.0), t + j * 0.03, 0.22, pan=-0.4 + 0.2 * j, r=0.3, b=0.4)
        F(epiano([52, 59, 62, 66, 71], 1.5), t + 0.05, 0.5, r=0.25, b=0.3, width=1)
        F(pad([40, 52, 59, 62, 66], 1.5, 1400, 0.2, 0.7), t + 0.05, 0.85, b=0.3)
    elif k == 'compass':
        F(bell(100, 1.0, 0.7), t, 0.2, r=0.3, b=0.3)


# ------------------------------------------------------------------ the beat after the drop
def beat(t0=3.0, t1=6.25):
    M(pad([40, 52, 59, 62, 66, 71], t1 - t0 + 0.3, 1300, 0.05, 0.4), t0, 0.7, b=0.2)
    arp = [76, 79, 83, 86, 83, 79, 88, 83]
    s = 0
    while t0 + s * S16 < t1:
        tt = t0 + s * S16
        if s % 4 == 0 and tt != 3.0:
            M(kick(), tt, 0.85)
        if s % 8 == 4:
            M(clap(), tt, 0.45, r=0.25)
        if s % 4 == 2:
            M(hat(True), tt, 0.14, pan=0.25)
            M(sub(40 if (s // 8) % 2 == 0 else 43, 0.22), tt, 0.55)
        M(hat(), tt, 0.06 if s % 2 else 0.09, pan=-0.2)
        if s % 2 == 0:
            M(bell(arp[(s // 2) % 8], 0.9, 0.7), tt, 0.13, pan=0.35 * np.sin(s), r=0.3, b=0.15)
        s += 1


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    beat()
    irL, irR = reverb_ir(1.4, 0.26)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = reverb_ir(3.6, 0.8, 5)
    rb = np.vstack([signal.fftconvolve(big[0], bL)[:N], signal.fftconvolve(big[1], bR)[:N]])
    mix = mus + fx + 0.5 * rv + 0.5 * rb
    tt = np.arange(N) / SR
    mix = signal.sosfilt(signal.butter(2, 28 / (SR / 2), 'high', output='sos'), mix, axis=1)
    mix *= np.clip((np.abs(tt - 2.9705) - 0.0265) / 0.003, 0, 1)   # the gap before the drop
    pk = np.percentile(np.abs(mix), 99.9)
    mix = np.tanh(mix / pk * 1.15) / np.tanh(1.15)
    mix *= np.clip((DUR - tt) / 0.15, 0, 1) * np.clip(tt / 0.01, 0, 1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1.0 / 20)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')


if __name__ == '__main__':
    main()
