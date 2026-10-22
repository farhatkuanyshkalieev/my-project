"""BASQA reel: music + sound design, synthesized from scratch (no samples).

A dombra riff (Karplus–Strong, two strings tuned D3 / G3, wooden body) opens
in near silence over vinyl crackle; each Kazakh word lands with a hit and a
rising strum; the wordmark stutters on 16ths over a riser; a hard gap of
silence; then the drop: an 808 half-time beat (kick, clap on 3, rolling
hats) with the dombra riff looping on top. Every visual event has its own
sound: sticker slaps, a whip, letters dropping, the hanger clinking on the
rail, a rubber stamp, the zoom-through and a final strum that rings out.

usage: python3 score_basqa.py build/events.json build/sound.wav
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
S16 = 60 / BPM / 4          # one 16th = 0.125 s
rng = np.random.default_rng(7)
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


def dombra_note(m, d=1.2, vel=1.0):
    """One plucked gut/nylon string on a hollow wooden body."""
    f = midi(m)
    s = ks(f, d, 0.9965, 2600 + 2400 * vel) + 0.55 * ks(f * 1.0018, d, 0.995, 3000)
    body = s + 0.9 * filt(s, 'bp', (170, 320)) + 0.45 * filt(s, 'bp', (850, 1500))
    pick = filt(noise(0.012), 'high', 2500) * np.exp(-T(0.012) / 0.002)
    body[:len(pick)] += pick * 0.6
    return norm(body) * vel


def strum(notes, t0, g=1.0, down=True, d=1.2, bus=M, r=0.12, b=0.0, vel=1.0):
    order = notes if down else notes[::-1]
    for i, m in enumerate(order):
        bus(dombra_note(m, d, vel), t0 + i * 0.011, g * (1 if i == 0 else 0.8), pan=-0.18 + 0.36 * i / max(1, len(notes) - 1), r=r, b=b)


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


def slap():
    """Vinyl sticker slapped onto a surface: plastic snap + low thud + air."""
    d = 0.22
    s = filt(noise(d), 'bp', (700, 4200)) * np.exp(-T(d) / 0.018)
    s += 0.8 * thump(120, 55, d, 0.05, 0.01)
    pre = filt(noise(0.05), 'high', 3000) * np.linspace(0, 1, int(0.05 * SR)) ** 2 * 0.25
    return norm(np.concatenate([pre, s]))


def crackle(d):
    out = filt(noise(d), 'bp', (500, 6000)) * 0.03
    k = int(d * 38)
    for _ in range(k):
        i = rng.integers(0, len(out) - 200)
        out[i:i + 120] += filt(rng.standard_normal(120), 'high', 1500) * np.hanning(120) * rng.uniform(0.2, 1.0)
    return out


# ------------------------------------------------------------------ cues
def cue(e):
    t, k = e['t'], e['type']
    if k == 'room':
        F(crackle(DUR), 0, 0.22, width=1)
        # low D drone that swells under the intro and fades at the first word
        d = 1.05
        s = (osc(midi(38), d) + 0.4 * osc(midi(50), d) + 0.15 * osc(midi(57), d)) * np.sin(np.pi * np.clip(T(d) / d, 0, 1)) ** 1.5
        M(s, 0, 0.18, r=0.2)
    elif k == 'stringsIn':
        F(whoosh(0.32, 2500, 600, 1.5), t, 0.18, r=0.2)
    elif k == 'pluck':
        down = len(e['notes']) > 1
        strum(e['notes'], t, 0.9, down=down, d=1.3, bus=F, r=0.22, vel=1.0 if down else 0.85)
    elif k == 'bend':
        d = e['end'] - t + 0.05
        f = midi(57) * (2 ** (np.linspace(0, 3, int(d * SR)) / 12))
        s = np.tanh(2 * osc(f, d) * np.exp(-T(d) / 0.3) + 0.3 * osc(f * 2, d) * np.exp(-T(d) / 0.15))
        F(filt(s, 'low', 2600), t, 0.25, r=0.2)
        F(whoosh(d, 300, 3000, 1.0), t, 0.16)
    elif k == 'snap':
        F(norm(filt(noise(0.05), 'high', 1800) * np.exp(-T(0.05) / 0.006)), t, 0.6, r=0.3)
        F(metal([(2400, 1), (3900, 0.6), (6100, 0.3)], 0.3, 0.06), t, 0.25, r=0.3)
    elif k == 'word':
        i = e['i']
        F(kick(), t, 0.72)
        F(eight08([38, 41, 45][i], 0.45), t, 0.48)
        F(clap(), t, 0.32, r=0.3, b=0.1)
        strum([[50, 57, 62], [53, 60, 65], [55, 62, 67]][i], t, 0.42, d=0.9, bus=F, r=0.25, b=0.1)
        F(whoosh(0.2, 6000, 900, 1.0), t - 0.16, 0.22)   # suck-in before the cut
    elif k == 'sketch':
        d = e['end'] - t
        s = filt(noise(d), 'bp', (2500, 7000)) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * T(d)))) * np.sin(np.pi * T(d) / d)
        F(s, t, 0.08, pan=-0.3)
    elif k == 'spin':
        F(whoosh(0.4, 400, 2200, 1.5), t, 0.3, pan=0.4, r=0.15)
    elif k == 'tick':
        F(wood(2600 if e['i'] % 4 == 0 else 3400, 0.04), t, 0.3, pan=0.5 * np.sin(e['i']), r=0.1)
    elif k == 'riser':
        d = e['end'] - t
        s = whoosh(d, 300, 9000, 0.6) * np.linspace(0.2, 1, int(d * SR)) ** 1.5
        F(s, t, 0.42, r=0.2, width=1)
        f = 180 * (8 ** (T(d) / d))
        F(np.tanh(osc(f, d) * 2) * np.linspace(0, 1, int(d * SR)) ** 2, t, 0.12)
        # snare roll accelerating into the gap
        tt, step = 2.44, 0.125
        while tt < e['end'] - 0.01:
            F(snare(0.12), tt, 0.12 + 0.35 * (tt - 2.44) / 0.5, pan=0.1)
            step = max(0.022, step * 0.8); tt += step
    elif k == 'stutter':
        i = [2.5, 2.625, 2.75, 2.875].index(round(t, 3))
        F(eight08(50 + [0, 3, 7, 12][i], 0.11), t, 0.55)
        F(norm(filt(noise(0.06), 'bp', (1200, 9000)) * np.exp(-T(0.06) / 0.015)), t, 0.3)
        F(kick(), t, 0.5)
    elif k == 'drop':
        F(kick(), t, 1.0)
        F(norm(thump(110, 32, 1.6, 0.5, 0.06)), t, 0.8, b=0.25)
        F(crash(2.6), t, 0.42, r=0.2, b=0.3, width=1)
        F(whoosh(0.9, 7000, 300, 0.7), t, 0.3, width=1)
        strum([50, 57, 62], t, 0.7, d=1.6, bus=F, r=0.2, b=0.25)
    elif k == 'slap':
        F(slap(), t - 0.05, 0.75, pan={3.5: 0.0, 4.0: -0.35, 4.5: 0.35}[round(t, 2)], r=0.12)
    elif k == 'whip':
        F(whoosh(0.3, 900, 7000, 1.2), t - 0.04, 0.55, width=1)
    elif k == 'letter':
        i = e['i']
        F(thump(150 + 25 * i, 60, 0.25, 0.06, 0.01), t, 0.45)
        F(wood(1200 + 200 * i, 0.05), t, 0.25)
    elif k == 'fall':
        d = e['end'] - t
        F(filt(whoosh(d + 0.04, 300, 1600, 0.8), 'low', 3000), t, 0.32)
    elif k == 'clink':
        F(metal([(2130, 1), (3370, 0.7), (5210, 0.45), (7900, 0.25)], 0.7, 0.22), t, 0.42, pan=0.05, r=0.2)
        F(metal([(1890, 1), (3020, 0.6), (4700, 0.3)], 0.4, 0.1), t + 0.07, 0.22, pan=-0.1)
        F(metal([(2210, 1), (3510, 0.5)], 0.3, 0.07), t + 0.15, 0.12)
        F(thump(220, 120, 0.2, 0.05, 0.01), t, 0.25)
    elif k == 'stamp':
        F(norm(thump(160, 55, 0.35, 0.08, 0.012)), t, 0.65)
        F(norm(filt(noise(0.08), 'bp', (400, 2500)) * np.exp(-T(0.08) / 0.012)), t, 0.4)
    elif k == 'zoom':
        d = e['end'] - t
        s = whoosh(d + 0.02, 400, 8000, 0.5) * np.linspace(0.3, 1, int((d + 0.02) * SR)) ** 2
        F(s, t, 0.5, width=1)
        # reversed cymbal
        rc = crash(d)[::-1] * np.linspace(0, 1, int(d * SR)) ** 2
        F(rc, t, 0.3, width=1)
    elif k == 'final':
        F(kick(), t, 1.0)
        F(eight08(38, 1.3), t, 0.9)
        F(norm(thump(120, 34, 1.4, 0.45, 0.06)), t, 0.55, b=0.3)
        F(crash(2.0), t, 0.4, b=0.35, width=1)
        strum([50, 57, 62, 69], t + 0.01, 0.75, d=1.5, bus=F, r=0.25, b=0.35)
        # warm low pad carrying the tag line
        d = 1.5
        pad = sum(osc(midi(m) * (1 + dt), d) for m in (50, 57, 62, 66) for dt in (-0.002, 0.002))
        pad = filt(pad, 'low', 1400) * np.minimum(1, T(d) / 0.25) * np.clip((d - T(d)) / 0.6, 0, 1)
        F(pad, t + 0.1, 0.05, b=0.4, width=1)
    elif k == 'type':
        F(wood(4200 + 300 * (e['i'] % 3), 0.025), t, 0.1, pan=-0.4 + e['i'] * 0.06)
    elif k == 'handles':
        strum([69], t + 0.2, 0.35, d=1.0, bus=F, r=0.3, b=0.3, vel=0.8)
        strum([74], t + 0.45, 0.32, d=1.1, bus=F, r=0.3, b=0.3, vel=0.8)


# ------------------------------------------------------------------ the beat after the drop
RIFF = [(2, [57]), (3, [57]), (4, [60]), (5, [57]), (6, [55]), (7, [53]), (8, [52]), (10, [50, 57]), (12, [57]), (13, [60]), (14, [62])]


def beat(t0=3.0, t1=6.25):
    bars = [(3.0, 0), (5.0, 1)]
    for bt, bi in bars:
        st = lambda s: bt + s * S16
        kicks = [0, 7, 10] if bi == 0 else [0, 6, 11]
        b808 = [(0, 38, 0.8, None), (7, 41, 0.36, None), (10, 36, 0.6, 38)] if bi == 0 else [(0, 38, 0.72, None), (6, 33, 0.6, None), (11, 36, 0.5, 38)]
        for s in kicks:
            if st(s) < t1 and st(s) > t0 - 0.001 and st(s) != 3.0:
                M(kick(), st(s), 0.8)
        for s, m, d, to in b808:
            if st(s) < t1 and st(s) != 3.0:
                M(eight08(m, d, to), st(s), 0.75)
        if st(8) < t1:
            M(clap(), st(8), 0.55, r=0.25)
            M(snare(), st(8), 0.25)
        for s in range(16):
            if st(s) >= t1:
                break
            g = 0.16 if s % 2 == 0 else 0.09
            if bi == 0 and s in (12, 13):    # triplet roll
                for j in range(3):
                    M(hat(), st(s) + j * S16 * 2 / 3, 0.12, pan=0.25)
                continue
            if bi == 1 and s == 14:
                M(hat(True), st(s), 0.13, pan=0.25); continue
            M(hat(), st(s), g, pan=0.25)
        for s in (3, 11):
            if st(s) < t1:
                M(wood(1500, 0.05), st(s), 0.12, pan=-0.4, r=0.1)
        # dombra riff on top
        for s, notes in RIFF:
            if st(s) < t1:
                strum(notes, st(s), 0.32, d=0.7, r=0.15, vel=0.9)


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    beat()
    irL, irR = reverb_ir(1.2, 0.22)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = reverb_ir(3.2, 0.7, 5)
    rb = np.vstack([signal.fftconvolve(big[0], bL)[:N], signal.fftconvolve(big[1], bR)[:N]])
    mix = mus + fx + 0.5 * rv + 0.45 * rb
    # the gap before the drop: hard silence (3 ms ramps)
    tt = np.arange(N) / SR
    gate = np.clip((np.abs(tt - 2.9705) - 0.0265) / 0.003, 0, 1)
    mix = signal.sosfilt(signal.butter(2, 28 / (SR / 2), 'high', output='sos'), mix, axis=1)
    mix *= gate
    pk = np.percentile(np.abs(mix), 99.9)
    mix = np.tanh(mix / pk * 1.15) / np.tanh(1.15)
    mix *= np.clip((DUR - tt) / 0.15, 0, 1)
    mix *= np.clip(tt / 0.01, 0, 1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1.0 / 20)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')


if __name__ == '__main__':
    main()
