"""Sound design for «От идеи к движению».

Reads the cue sheet exported from the scene (events.json) so every sound
lands on the exact frame its visual happens, and synthesises everything
from scratch (no samples): room tone, power-on, the warm "idea" ping,
UI ticks, FM plucks, a soft 120 BPM pulse, riser, impact, and a warm
D major resolve under the title.

usage: python3 audio.py events.json out.wav
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(2026)

dry = np.zeros((2, N))
rev_send = np.zeros((2, N))
dly_send = np.zeros((2, N))


# ------------------------------------------------------------------ helpers
def T(d):
    return np.arange(int(d * SR)) / SR


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


def osc(freq, d, phase=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (int(d * SR),))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def noise(d):
    return rng.standard_normal(int(d * SR))


def env(d, a=0.005, tau=0.3, hold=0.0):
    t = T(d)
    e = np.where(t < a, t / max(a, 1e-6), np.exp(-np.maximum(0, t - a - hold) / tau))
    return e


def fade_tail(x, ms=8):
    n = min(len(x), int(SR * ms / 1000))
    if n > 0:
        x[-n:] *= np.linspace(1, 0, n)
    return x


def sos(kind, f, order=2):
    if kind == 'bp':
        return signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype='band', output='sos')
    return signal.butter(order, f / (SR / 2), btype=kind, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def svf(x, fc, q=0.8, mode='bp'):
    """Zero-delay-feedback state variable filter with per-sample cutoff."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR)
    k = 1.0 / q
    a1 = 1 / (1 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    xs, A1, A2, A3 = x.tolist(), a1.tolist(), a2.tolist(), a3.tolist()
    ic1 = ic2 = 0.0
    out = [0.0] * len(xs)
    for n in range(len(xs)):
        v3 = xs[n] - ic2
        v1 = A1[n] * ic1 + A2[n] * v3
        v2 = ic2 + A2[n] * ic1 + A3[n] * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[n] = v1 if mode == 'bp' else (v2 if mode == 'lp' else xs[n] - k * v1 - v2)
    return np.array(out)


def add(sig, t0, g=1.0, pan=0.0, rev=0.0, dly=0.0, width=0.0):
    """Place a mono (or stereo (2,n)) signal at time t0 with constant-power pan."""
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if sig.ndim == 1:
        th = (pan + 1) * np.pi / 4
        st = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
        if width > 0:  # decorrelate slightly with a tiny Haas offset
            sh = int(SR * 0.006 * width)
            st[1] = np.concatenate([np.zeros(sh), st[1][:len(st[1]) - sh]])
    else:
        st = sig
    if i0 < 0:
        st = st[:, -i0:]
        i0 = 0
    n = min(st.shape[1], N - i0)
    st = st[:, :n] * g
    dry[:, i0:i0 + n] += st
    if rev:
        rev_send[:, i0:i0 + n] += st * rev
    if dly:
        dly_send[:, i0:i0 + n] += st * dly


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments
def click(d=0.012, hp=3000):
    x = noise(d) * env(d, 0.0003, 0.0025)
    return norm(filt(x, 'high', hp))


def ping(f, d=2.4, tau=0.9, partials=((1, 1), (2.0, 0.28), (3.0, 0.1), (4.2, 0.05))):
    t = T(d)
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau / (1 + 0.6 * (m - 1)))) for m, a in partials)
    s *= np.minimum(1, t / 0.004)
    return norm(s)


def fm_pluck(f, d=0.9, idx=3.0, ratio=2.0, tau=0.35, itau=0.12):
    t = T(d)
    mod = idx * np.exp(-t / itau) * np.sin(2 * np.pi * f * ratio * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / tau) * np.minimum(1, t / 0.002)
    return norm(s)


def thump(f0=110, f1=42, d=0.6, tau=0.16, ptau=0.04):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t / ptau)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * np.minimum(1, t / 0.001)
    return norm(s)


def kick():
    s = thump(150, 46, 0.5, 0.17, 0.03)
    c = np.zeros_like(s)
    c[:int(0.01 * SR)] = click(0.01, 2500)[:int(0.01 * SR)] * 0.18
    return norm(s + c)


def whoosh(d, f0, f1, q=1.2, shape=2.0, curve='exp'):
    t = T(d)
    k = t / d
    fc = f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k
    x = svf(noise(d), fc, q, 'bp')
    e = np.sin(np.pi * np.clip(k, 0, 1)) ** shape
    return norm(x * e)


def saw_add(f, d, nh=14, bright=1.0):
    t = T(d)
    s = np.zeros_like(t)
    for h in range(1, nh + 1):
        s += np.sin(2 * np.pi * f * h * t + h * 0.7) / h * np.exp(-(h - 1) / (4 * bright))
    return s


# ------------------------------------------------------------------ cue handlers
def cue(e):
    ty, t = e['type'], e['t']
    if ty == 'powerOn':
        add(click(0.02, 1500), t - 0.03, 0.35, rev=0.15)                     # switch
        add(thump(90, 40, 0.8, 0.22, 0.05), t, 0.38)                          # body
        z = filt(noise(0.35), 'bp', (1800, 7000)) * env(0.35, 0.002, 0.07)
        add(norm(z), t, 0.22, rev=0.3, width=1)                               # zap
        for _ in range(26):                                                   # crackle
            tt = t + rng.uniform(0, 0.55) ** 1.6
            add(click(0.006, 2500), tt, rng.uniform(0.03, 0.12), pan=rng.uniform(-0.6, 0.6))
        d = 3.1
        tone = (osc(220, d) + 0.5 * osc(330.5, d) + 0.25 * osc(441.3, d)) * np.minimum(1, T(d) / 0.25) * np.exp(-T(d) / 1.2)
        add(norm(tone), t + 0.04, 0.05, rev=0.6, width=1)                     # glow tone
        w = osc(9800, d) * np.minimum(1, T(d) / 0.05) * np.exp(-T(d) / 0.8)
        add(w, t, 0.008)                                                      # coil whine
    elif ty == 'tick':
        add(click(0.006, 4500), t, 0.07 * e.get('g', 1), pan=rng.uniform(-0.35, 0.35), rev=0.08)
    elif ty == 'dot':
        add(ping(midi(74), 3.0, 1.1), t, 0.30, rev=0.55, dly=0.25)           # D5, warm bell
        add(ping(midi(81), 2.0, 0.6), t + 0.003, 0.08, pan=0.2, rev=0.5)      # A5 shimmer
        add(thump(80, 36.7, 1.2, 0.5, 0.08), t, 0.40)                          # sub D1
    elif ty == 'heartbeat':
        add(thump(75, 38, 0.5, 0.12, 0.03), t, 0.42 * e['g'], rev=0.1)
    elif ty == 'push':
        d = e['end'] - t
        w = whoosh(d, 140, 5200, 1.0, 1.0)
        k = T(d) / d
        w *= k ** 1.6
        add(np.vstack([w, np.roll(w, 211)]), t, 0.32, rev=0.25)
        rise = osc(90 * (4.0 ** k), d) * k ** 2
        add(norm(rise), t, 0.10, rev=0.2)
        pop = osc(1400 * np.exp(-T(0.12) / 0.03) + 500, 0.12) * env(0.12, 0.001, 0.03)
        add(norm(pop), e['end'], 0.18, rev=0.4, dly=0.2)
        add(click(0.01, 2000), e['end'], 0.15)
    elif ty == 'cross':
        for pan, dt, g in ((-0.85, 0, 0.22), (0.85, 0.01, 0.22), (0, 0.08, 0.12)):
            s = filt(noise(0.35), 'high', 2500) * env(0.35, 0.004, 0.07)
            add(norm(s), t + dt, g, pan=pan, rev=0.3)
        add(ping(midi(93), 1.2, 0.35), t, 0.06, rev=0.5, dly=0.3)
    elif ty == 'circle':
        d = 0.9
        k = T(d) / d
        s = osc(440 * 2 ** k, d) * np.sin(np.pi * k) ** 1.5
        add(norm(s), t, 0.10, rev=0.6, width=1)
        add(fm_pluck(midi(86), 1.2, 1.5, 3.0, 0.4), t + 0.75, 0.08, pan=-0.3, rev=0.5, dly=0.4)
    elif ty == 'ring':
        add(fm_pluck(midi([81, 86][e['n']]), 1.2, 1.2, 3.0, 0.45), t, 0.12, pan=[0.4, -0.4][e['n']], rev=0.5, dly=0.35)
    elif ty == 'blip':
        s = osc(2400 - 900 * np.minimum(1, T(0.06) / 0.04), 0.06) * env(0.06, 0.001, 0.02)
        add(norm(s), t, 0.07, pan=rng.uniform(-0.4, 0.4), rev=0.3)
    elif ty == 'pluck':
        notes = [74, 77, 81, 84]   # D5 F5 A5 C6 — Dm7, airy and cold
        add(fm_pluck(midi(notes[e['n']]), 1.4, 3.2, 2.0, 0.42), t, 0.24, pan=[-0.5, 0.5, -0.25, 0.25][e['n']], rev=0.45, dly=0.45)
    elif ty == 'morph':
        s = osc(1900 * np.exp(-T(0.08) / 0.03) + 700, 0.08) * env(0.08, 0.001, 0.03)
        add(norm(s), t, 0.06, rev=0.4)
    elif ty == 'ico':
        d = 1.2
        s = filt(noise(d), 'bp', (300, 3000)) * np.exp(-T(d) / 0.35) * np.minimum(1, T(d) / 0.01)
        add(norm(s), t, 0.14, rev=0.6, width=1)
        add(ping(midi(62), 2.5, 1.0), t, 0.16, rev=0.6)
    elif ty == 'kick':
        add(kick(), t, 0.55, rev=0.04)
    elif ty == 'hat':
        d = 0.05
        s = filt(noise(d), 'high', 7500) * env(d, 0.0005, 0.012)
        add(norm(s), t, 0.085 * e['g'], pan=0.25 if e['g'] == 1 else -0.25, rev=0.1)
    elif ty == 'arp':
        bar = int((t - 8.0) // 2.0)
        chords = {1: [70, 74, 77, 82], 2: [67, 70, 74, 79], 3: [69, 73, 76, 81]}   # Bb, Gm, A
        ch = chords.get(bar, [74, 77, 81, 86])
        pat = [0, 2, 1, 3, 2, 1, 3, 2]
        n = ch[pat[e['i'] % 8]] + (12 if (e['i'] // 8) % 2 and t > 12 else 0)
        add(fm_pluck(midi(n), 0.4, 1.4, 2.0, 0.11, 0.05), t, 0.085, pan=0.45 if e['i'] % 2 else -0.45, rev=0.25, dly=0.3)
    elif ty == 'bass':
        roots = [38, 34, 31, 33]   # D2 Bb1 G1 A1
        d = 2.0
        f = midi(roots[e['bar']])
        s = filt(saw_add(f, d, 10), 'low', 420)
        k = T(d)
        pulse = 1.0 if t < 10 else (0.55 + 0.45 * np.exp(-((k % 0.25) / 0.09)))   # 8th-note drive once the arp enters
        s *= np.minimum(1, k / 0.04) * np.minimum(1, (d - k) / 0.05) * pulse
        s += 0.6 * osc(f / 2, d) * np.minimum(1, k / 0.05) * np.minimum(1, (d - k) / 0.05)
        add(norm(s), t, 0.20, rev=0.05)
    elif ty == 'word':
        s = filt(noise(0.3), 'bp', (900, 4500)) * env(0.3, 0.001, 0.06)
        add(norm(s), t, 0.20, pan=[-0.3, 0.3][e['i'] % 2], rev=0.35)
        add(thump(220, 90, 0.3, 0.06, 0.015), t, 0.18, rev=0.2)
        pre = whoosh(0.22, 800, 6000, 1.2, 1.0) * np.linspace(0, 1, int(0.22 * SR)) ** 2
        add(pre, t - 0.22, 0.10, pan=[0.4, -0.4][e['i'] % 2])
        if e['i'] == 5:
            add(ping(midi(69), 1.6, 0.5), t, 0.1, rev=0.6, dly=0.4)
    elif ty == 'glitch':
        d = 0.09
        k = T(d)
        sq = np.sign(np.sin(2 * np.pi * (300 + 2600 * rng.random()) * k))
        hold = np.repeat(sq[::24], 24)[:len(k)]
        add(hold * env(d, 0.001, 0.03), t, 0.07, pan=rng.uniform(-0.6, 0.6), rev=0.15)
    elif ty == 'riser':
        d = e['end'] - t
        k = T(d) / d
        nz = svf(noise(d), 500 * 16 ** k, 1.4, 'bp') * k ** 2.2
        add(np.vstack([norm(nz), norm(np.roll(nz, 333))]), t, 0.32, rev=0.3)
        sh = sum(osc(midi(57 + 12 * o) * 2 ** k, d) * np.sin(np.pi * (o + k) / 3) ** 2 for o in range(3))
        add(fade_tail(norm(sh) * k ** 1.5), t, 0.10, rev=0.4, width=1)
    elif ty == 'suck':
        d = e['end'] - t
        k = T(d) / d
        x = filt(noise(d), 'low', 2500) * (np.exp(k * 5) - 1) / (np.e ** 5 - 1)
        add(fade_tail(norm(x), 6), t, 0.24, rev=0.2, width=1)
    elif ty == 'impact':
        add(thump(120, 34, 3.0, 0.9, 0.09), t, 1.0, rev=0.25)
        add(norm(filt(noise(0.6), 'low', 1200) * env(0.6, 0.001, 0.12)), t, 0.32, rev=0.5, width=1)
        add(norm(filt(noise(0.15), 'high', 3000) * env(0.15, 0.0005, 0.03)), t, 0.22, rev=0.6)
        for m, p in ((62, -0.3), (66, 0.3), (69, 0.0), (74, 0.15)):                # D major bell: the warm turn
            add(ping(midi(m + 12), 4.0, 1.6), t + 0.01, 0.07, pan=p, rev=0.6, dly=0.3)
    elif ty == 'swoosh':
        d = e['end'] - t + 0.1
        add(whoosh(d, 400, 2400, 1.0, 1.2), t, 0.13, pan=-0.4, rev=0.3)
    elif ty == 'write':
        d = e['end'] - t
        k = T(d) / d
        pen = svf(noise(d), 2500 + 1500 * k, 2.5, 'bp') * np.sin(np.pi * k) ** 0.8
        add(np.vstack([pen * (1 - k), pen * k]) / np.max(np.abs(pen)), t, 0.07, rev=0.3)
        g = osc(midi(62) * 2 ** (k * 1.0), d) * np.sin(np.pi * k) ** 1.2
        add(norm(g), t, 0.05, rev=0.5)
    elif ty == 'letter':
        scale = [74, 76, 78, 81, 83, 86, 88, 90]   # D major pentatonic
        n = scale[e['i'] % len(scale)]
        add(fm_pluck(midi(n), 0.8, 0.8, 3.0, 0.25, 0.04), t, 0.055, pan=-0.6 + 1.2 * e['i'] / 18, rev=0.45, dly=0.2)
    elif ty == 'shine':
        d = e['end'] - t + 0.6
        k = T(d) / d
        s = sum(osc(f, d, rng.uniform(0, 6)) for f in (2349, 2960, 3520, 4699)) * np.sin(np.pi * k) ** 2
        add(np.vstack([norm(s) * (1 - k), norm(s) * k]) * 1.4, t, 0.035, rev=0.6)
    elif ty == 'pad':
        d = e['end'] - t
        k = T(d)
        voices = [50, 57, 66, 73, 76]   # Dmaj9: D3 A3 F#4 C#5 E5
        L = np.zeros(len(k))
        R = np.zeros(len(k))
        for m in voices:
            f = midi(m)
            L += saw_add(f * 2 ** (-6 / 1200), d, 8, 0.6)
            R += saw_add(f * 2 ** (6 / 1200), d, 8, 0.6)
        L, R = filt(L, 'low', 1600), filt(R, 'low', 1600)
        e2 = np.minimum(1, k / 0.9) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * k))
        m = max(np.max(np.abs(L)), np.max(np.abs(R)))
        add(np.vstack([L, R]) * e2 / m, t + 0.05, 0.2, rev=0.5)


def beds():
    # room tone: dark air, fades as we dive into the screen
    d = 5.2
    k = T(d)
    rt = filt(noise(d), 'low', 380, 2)
    e = np.minimum(1, k / 1.0) * np.clip((5.0 - k) / 0.6, 0, 1)
    add(np.vstack([norm(rt), norm(np.roll(rt, 4800))]) * e, 0.0, 0.05)
    air = filt(noise(d), 'bp', (3000, 9000))
    add(norm(air) * e, 0.0, 0.006, width=1)
    # monitor hum after power-on
    d = 3.2
    k = T(d)
    hum = osc(50, d) + 0.5 * osc(100, d) + 0.3 * osc(150, d)
    add(norm(hum) * np.minimum(1, k / 0.2) * np.clip((d - k) / 0.4, 0, 1), 1.4, 0.022)
    # cold drone inside the screen world (D + A), brightening toward the drop
    d = 11.5
    k = T(d)
    dr = osc(midi(38), d) + 0.6 * osc(midi(45), d) + 0.25 * osc(midi(50) * 1.003, d) + 0.15 * osc(midi(57) * 0.997, d)
    e = np.minimum(1, k / 1.5) * np.clip((d - k) / 0.3, 0, 1) * (0.7 + 0.3 * k / d)
    add(norm(dr) * e, 4.45, 0.07, rev=0.3, width=1)


# ------------------------------------------------------------------ mix
def reverb_ir(d=2.6, tau=0.42):
    k = T(d)
    out = []
    for seed in (1, 2):
        r = np.random.default_rng(seed)
        hi = filt(r.standard_normal(len(k)), 'low', 7000) * np.exp(-k / (tau * 0.55))
        lo = filt(r.standard_normal(len(k)), 'low', 1800) * np.exp(-k / tau)
        ir = hi * 0.6 + lo
        ir *= np.minimum(1, k / 0.01)
        ir = np.concatenate([np.zeros(int(0.022 * SR)), ir])
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


def main():
    ev = json.load(open(sys.argv[1]))
    beds()
    for e in ev:
        cue(e)

    # ping-pong delay (dotted eighth at 120 BPM)
    dt = int(0.375 * SR)
    mono = filt(dly_send[0] + dly_send[1], 'low', 5000)
    wet = np.zeros((2, N))
    g = 0.42
    for i in range(1, 6):
        sh = dt * i
        if sh >= N:
            break
        ch = (i - 1) % 2
        wet[ch, sh:] += mono[:N - sh] * g ** i
    dry[:] += wet * 0.6
    rev_send[:] += wet * 0.3

    irL, irR = reverb_ir()
    rv = np.vstack([signal.fftconvolve(rev_send[0], irL)[:N], signal.fftconvolve(rev_send[1], irR)[:N]])
    mix = dry + rv * 0.55

    # master: DC/rumble cut, gentle glue, soft clip, fade, normalise
    mix = signal.sosfilt(signal.butter(2, 28 / (SR / 2), 'high', output='sos'), mix, axis=1)
    mix = mix / np.max(np.abs(mix)) * 1.15
    mix = np.tanh(mix) / np.tanh(1.15)
    k = np.arange(N) / SR
    mix *= np.clip((20.0 - k) / 0.55, 0, 1) ** 1.5
    mix *= np.minimum(1, k / 0.05)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1.0 / 20)

    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    rms = np.sqrt(np.mean(mix ** 2))
    print(f'wrote {sys.argv[2]}  peak -1.0 dBFS  rms {20 * np.log10(rms):.1f} dBFS')


if __name__ == '__main__':
    main()
