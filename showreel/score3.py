"""Film score + sound design for «От идеи к движению» v3.

The music tells the same story as the picture. A four-note «idea» leitmotif
moves through the film:
  hook: tentative minor on felt piano · birth: celesta and a warm pad ·
  monsters: villain pizzicato, a reed, a muted «wah» trumpet, a theremin ·
  midnight: a detuned piano that never finishes the phrase, then silence ·
  «Стоп»: record scratch · «А теперь»: rewind and riser · «смотри!»: the drop,
  with the theme confident in F major · code: a whispering music box ·
  finale: brass, choir and drums resolve the theme · CTA: a playful reprise.
Every cue in vo3/events.json also gets its own designed sound.

usage: python3 score3.py vo3/events.json out.wav
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

import audio as A
from audio import T, norm, osc, noise, env, filt, svf, click, ping, fm_pluck, thump, kick, whoosh, saw_add, midi, metal, debris, rev_swell, fade_tail

SR = A.SR
DUR = 49.4
N = int(SR * DUR)
V0 = 0.6
rng = np.random.default_rng(11)
fx = np.zeros((2, N)); mus = np.zeros((2, N)); vo = np.zeros((2, N)); rev = np.zeros((2, N)); rev_big = np.zeros((2, N))


def v(s):
    return V0 + s


def put(bus, sig, t0, g=1.0, pan=0.0, r=0.0, width=0.0, big=0.0):
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
    if big:
        rev_big[:, i0:i0 + n] += st * big


def sfx(sig, t0, g=1.0, pan=0.0, r=0.0, width=0.0, big=0.0):
    put(fx, sig, t0, g, pan, r, width, big)


def mu(sig, t0, g=1.0, pan=0.0, r=0.0, width=0.0, big=0.0):
    put(mus, sig, t0, g, pan, r, width, big)


def glide(f0, f1, d, tau=None):
    k = T(d) / d
    f = f0 * (f1 / f0) ** k
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return s * (np.exp(-T(d) / tau) if tau else 1)


def adsr(d, a=0.01, r=0.2):
    t = T(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0, 1)


# ------------------------------------------------------------------ instruments
def piano(f, d=2.6, vel=1.0, felt=True, detune=0.0):
    t = T(d)
    s = np.zeros(len(t))
    B = 0.00035
    f = f * 2 ** (detune / 1200)
    for k in range(1, 12):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2:
            break
        amp = vel / k ** 1.15 * (1 if k < 3 else 0.7)
        tau1, tau2 = 0.12 / (1 + 0.2 * k), 1.8 / (1 + 0.35 * k)
        e = 0.55 * np.exp(-t / tau1) + 0.45 * np.exp(-t / tau2)
        s += amp * np.sin(2 * np.pi * fk * t + k) * e
    ham = filt(noise(0.03), 'low', 2500) * np.exp(-T(0.03) / 0.006) * 0.25
    s[:len(ham)] += ham
    s *= np.minimum(1, t / 0.002) * np.clip((d - t) / 0.15, 0, 1)
    if felt:
        s = filt(s, 'low', 2200)
    return norm(s)


def celesta(f, d=2.0):
    t = T(d)
    mod = 1.6 * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * 3.5 * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.9) + 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.4)
    return norm(s * np.minimum(1, t / 0.002))


def ks(f, d=0.6, decay=0.993, bright=4000):
    n = max(2, int(round(SR / f)))
    x = np.zeros(int(d * SR))
    x[:n] = filt(rng.standard_normal(n), 'low', bright)
    a = np.zeros(n + 2); a[0] = 1; a[n] = -decay * 0.5; a[n + 1] = -decay * 0.5
    y = signal.lfilter([1.0], a, x)
    return norm(y * np.clip((d - T(d)) / 0.05, 0, 1))


def pizz(f, d=0.45):
    s = ks(f, d, 0.985, 2500) * np.exp(-T(d) / 0.18)
    return norm(filt(s, 'bp', (max(60, f * 0.8), 5000)))


def supersaw(notes, d, cut=1800, att=0.6, rel=0.8, voices=5, spread=12):
    L = np.zeros(int(d * SR)); R = np.zeros(int(d * SR))
    for m in notes:
        for j in range(voices):
            dt = (j - (voices - 1) / 2) / ((voices - 1) / 2 + 1e-9) * spread
            sw = saw_add(midi(m) * 2 ** (dt / 1200), d, 14, 0.7)
            if j % 2:
                L += sw
            else:
                R += sw
    e = adsr(d, att, rel)
    L, R = filt(L, 'low', cut) * e, filt(R, 'low', cut) * e
    m = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
    return np.vstack([L, R]) / m


def choir(notes, d, att=0.8, rel=1.0):
    t = T(d)
    out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        for dt in (-6, 0, 7):
            vib = 1 + 0.006 * np.sin(2 * np.pi * (5 + dt * 0.05) * t + dt)
            ph = 2 * np.pi * np.cumsum(f * 2 ** (dt / 1200) * vib) / SR
            src = sum(np.sin(k * ph) / k for k in range(1, 30) if k * f < 9000)
            out += src
    v1 = filt(out, 'bp', (650, 950)) + 0.7 * filt(out, 'bp', (1000, 1300)) + 0.25 * filt(out, 'bp', (2600, 3100))
    return norm(v1 * adsr(d, att, rel))


def brass(notes, d, att=0.08):
    t = T(d)
    out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        for dt in (-5, 5):
            out += saw_add(f * 2 ** (dt / 1200), d, 18, 1.2)
    cut = 500 + 2600 * (1 - np.exp(-t / 0.12)) * (0.75 + 0.25 * np.exp(-t / 0.5))
    s = svf(out, cut, 0.9, 'lp')
    return norm(s * adsr(d, att, 0.3))


def reed(f, d):
    t = T(d)
    vib = 1 + 0.008 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    s = sum(np.sin(k * ph) / k for k in range(1, 22, 2))
    return norm(filt(s, 'low', 1600) * adsr(d, 0.04, 0.1))


def wah(f, d):
    t = T(d)
    src = saw_add(f, d, 24, 1.0)
    cut = 500 + 1500 * (0.5 - 0.5 * np.cos(2 * np.pi * t / d * 2))
    return norm(svf(src, cut, 3.0, 'bp') * adsr(d, 0.03, 0.12))


def theremin(f0, f1, d):
    t = T(d)
    f = f0 * (f1 / f0) ** (t / d) * (1 + 0.025 * np.sin(2 * np.pi * 6 * t))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(d, 0.2, 0.4))


def timpani(f=70, d=1.6):
    s = thump(f * 1.6, f, d, 0.6, 0.05) + 0.3 * filt(noise(d), 'low', 600) * np.exp(-T(d) / 0.15)
    return norm(s)


def snare(d=0.25):
    s = filt(noise(d), 'bp', (1200, 7500)) * np.exp(-T(d) / 0.07) + 0.5 * osc(190, d) * np.exp(-T(d) / 0.04)
    return norm(s)


def crash(d=3.5):
    t = T(d)
    s = filt(noise(d), 'high', 4500) * np.exp(-t / 1.1) + 0.3 * sum(osc(f, d, rng.uniform(0, 6)) for f in (3120, 4370, 5810, 7260)) * np.exp(-t / 0.8)
    return norm(s * np.minimum(1, t / 0.002))


def tom(f, d=0.5):
    return norm(thump(f * 1.5, f, d, 0.2, 0.03) + 0.2 * filt(noise(d), 'bp', (200, 2000)) * np.exp(-T(d) / 0.05))


def hat(d=0.04, open_=False):
    d = 0.2 if open_ else d
    return norm(filt(noise(d), 'high', 7000) * np.exp(-T(d) / (0.07 if open_ else 0.012)))


def clap():
    out = np.zeros(int(0.25 * SR))
    for i, dt in enumerate((0, 0.009, 0.018)):
        b = filt(noise(0.2), 'bp', (900, 5200)) * np.exp(-T(0.2) / (0.02 if i < 2 else 0.07))
        j = int(dt * SR); out[j:j + len(b)] += b[:len(out) - j]
    return norm(out)


def bassp(f, d=0.24):
    s = filt(saw_add(f, d, 12), 'low', 1000) * np.exp(-T(d) / 0.1) * np.minimum(1, T(d) / 0.003)
    return norm(s + 0.7 * osc(f, d) * np.exp(-T(d) / 0.14))


def lead(f, d):
    t = T(d)
    s = sum(saw_add(f * 2 ** (dt / 1200), d, 16, 1.0) for dt in (-8, 0, 8)) + 0.5 * saw_add(f * 2, d, 10, 1.0)
    cut = 1200 + 3000 * np.exp(-t / 0.15)
    return norm(svf(s, cut, 1.0, 'lp') * adsr(d, 0.01, 0.12))


def musicbox(f, d=1.4):
    t = T(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6) + 0.5 * np.sin(2 * np.pi * f * 4.07 * t) * np.exp(-t / 0.12) + 0.2 * np.sin(2 * np.pi * f * 9.3 * t) * np.exp(-t / 0.05)
    return norm(s * np.minimum(1, t / 0.001))


def pop(f=900, d=0.06):
    s = glide(f * 1.6, f, d, d / 3) + 0.3 * glide(f * 3.2, f * 2, d, d / 4)
    return norm(s * np.minimum(1, T(d) / 0.0015))


def marimba(f, d=0.6):
    t = T(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)
    return norm(s * np.minimum(1, t / 0.002))


def boing(f0=180, f1=620, d=0.35):
    t = T(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.08)) + 30 * np.sin(2 * np.pi * 18 * t) * np.exp(-t / 0.15)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14) * np.minimum(1, t / 0.003))


def crunch(d=0.4, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR))
    for _ in range(26):
        i = int(r.uniform(0, 0.55) ** 1.4 * len(out))
        L = int(r.uniform(0.006, 0.02) * SR)
        g = filt(r.standard_normal(L), 'bp', (r.uniform(1500, 3000), r.uniform(6000, 10000))) * np.hanning(L) * r.uniform(0.3, 1)
        out[i:i + L] += g[:len(out) - i]
    return norm(out)


# ------------------------------------------------------------------ sound effects (one per cue)
def cue(e):
    ty, t = e['type'], e['t']
    if ty == 'pop':
        if e.get('anim') == 'drop':
            sfx(tom(rng.uniform(140, 220), 0.25), t + 0.05, 0.12)
        else:
            sfx(pop(rng.uniform(800, 1200), 0.045), t, 0.05, pan=rng.uniform(-0.3, 0.3))
    elif ty == 'popAccent':
        sfx(pop(rng.uniform(1100, 1500), 0.08), t, 0.09, pan=rng.uniform(-0.25, 0.25), r=0.15)
        sfx(whoosh(0.18, 2500, 6000, 1.2, 1.4), t - 0.12, 0.05, width=1)
    elif ty == 'notesIn':
        sfx(whoosh(0.45, 300, 2500, 0.9, 1.3), t - 0.1, 0.18, r=0.1)
        sfx(norm(filt(noise(0.12), 'bp', (400, 2500)) * env(0.12, 0.002, 0.03)), t + 0.32, 0.12)
    elif ty == 'scribble':
        d = 0.5; k = T(d)
        s = filt(noise(d), 'bp', (2500, 7000)) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * k)) ** 2 * np.sin(np.pi * k / d)
        sfx(norm(s), t, 0.05, pan=0.4)
    elif ty == 'key':
        sfx(norm(click(0.012, 2500) + 0.6 * thump(380, 190, 0.012, 0.004)), t, 0.08, pan=rng.uniform(-0.2, 0.2))
    elif ty == 'key2':
        sfx(norm(click(0.01, 2800) + 0.4 * thump(420, 200, 0.01, 0.003)), t, 0.04, pan=rng.uniform(-0.4, 0.4))
    elif ty == 'dotPop':
        sfx(pop(1300, 0.08), t, 0.1, r=0.3)
    elif ty == 'chuckle':
        mu(pizz(midi(79)), t + 0.05, 0.12, pan=0.3, r=0.2)
        mu(pizz(midi(74)), t + 0.2, 0.1, pan=0.3, r=0.2)
    elif ty == 'push':
        d = e['end'] - t
        sfx(norm(svf(noise(d), 200 * 6 ** (T(d) / d), 1.2, 'bp') * (T(d) / d) ** 2), t, 0.15, width=1)
    elif ty == 'dive':
        d = e['end'] - t; k = T(d) / d
        sfx(np.vstack([norm(svf(noise(d), 500 * 12 ** k, 1.5, 'bp') * k ** 2)] * 2), t, 0.25, r=0.2)
        sfx(norm(glide(200, 1400, 0.12, 0.05)), e['end'], 0.18, r=0.3)
        sfx(thump(120, 45, 0.9, 0.3), e['end'], 0.45)
    elif ty == 'boing':
        sfx(boing(160, 520, 0.4), t, 0.2, r=0.15); sfx(thump(110, 55, 0.3, 0.07), t, 0.25)
    elif ty == 'shrink':
        sfx(norm(glide(1200, 400, 0.3, 0.2)), t, 0.08, r=0.2)
    elif ty == 'warm':
        d = 1.2; k = T(d) / d
        s = sum(osc(midi(m), d, rng.uniform(0, 6)) for m in (77, 81, 84, 89)) * np.sin(np.pi * k) ** 2
        sfx(norm(s), t, 0.05, r=0.5, width=1)
    elif ty == 'eyes':
        sfx(celesta(midi(96)), t, 0.1, pan=-0.2, r=0.3); sfx(celesta(midi(100)), t + 0.07, 0.08, pan=0.2, r=0.3)
    elif ty in ('land', 'land2'):
        sfx(thump(130, 60, 0.3, 0.07), t, 0.28)
    elif ty == 'hops':
        for i in range(4):
            sfx(boing(120, 300, 0.25), t + i * 0.2, 0.12, pan=0.5 - i * 0.1)
    elif ty in ('chomp', 'chomp2'):
        sfx(crunch(0.45, 3 if ty == 'chomp' else 5), t, 0.5, width=1, r=0.12)
        sfx(thump(170, 80, 0.25, 0.06, 0.02), t, 0.4)
        for j in range(3):   # chewing
            sfx(crunch(0.12, 20 + j), t + 0.35 + j * 0.16, 0.15)
        sfx(debris(0.6, 30, 3000, 11), t + 0.05, 0.08, width=1)
    elif ty == 'splat':
        sfx(norm(filt(noise(0.25), 'low', 1500) * env(0.25, 0.001, 0.05)), t, 0.3)
        sfx(norm(glide(520, 110, 0.22, 0.08)), t, 0.22)
    elif ty == 'vortex':
        d = e['end'] - t; k = T(d)
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 1.4 * k)
        s = svf(noise(d), 500 + 1700 * lfo, 3.0, 'bp') * np.minimum(1, k / 0.5)
        sfx(np.vstack([norm(s) * (0.6 + 0.4 * lfo), norm(s) * (1 - 0.4 * lfo)]), t, 0.08, r=0.3)
    elif ty == 'suck':
        d = 0.85; k = T(d) / d
        sfx(norm(svf(noise(d), 300 * 12 ** k, 4, 'bp') * np.sin(np.pi * k)), t, 0.25, r=0.2)
        sfx(norm(glide(200, 900, 0.15, 0.05)), t + 0.82, 0.18)
    elif ty == 'swallow':
        d = e['end'] - t + 0.3
        sfx(whoosh(d, 2800, 100, 1.0, 1.5), t, 0.3, r=0.3, width=1)
        sfx(thump(80, 28, 1.8, 0.7), e['end'], 0.6, big=0.4)
    elif ty == 'clockSpin':
        tt, gap = t, 0.03
        while tt < e['end']:
            sfx(norm(click(0.006, 3000) + 0.5 * osc(2400, 0.006) * np.exp(-T(0.006) / 0.002)), tt, 0.07, pan=0.2); tt += gap; gap *= 1.14
    elif ty == 'dong':
        sfx(ping(196, 5.0, 2.0, ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.1))), t, 0.3, big=0.6)
    elif ty == 'tabs':
        for i in range(14):
            tt = t + i * 0.035
            sfx(norm(osc(2600 + i * 90, 0.05) * np.exp(-T(0.05) / 0.012)), tt, 0.03, pan=rng.uniform(-0.8, 0.8), r=0.2)
            sfx(whoosh(0.22, 800, 4000, 1.2, 1.4), tt, 0.04, pan=rng.uniform(-0.9, 0.9))
        d = e['end'] - t; k = T(d)
        sfx(norm(svf(noise(d), 700 + 500 * np.sin(2 * np.pi * 1.1 * k), 2.0, 'bp')) * np.minimum(1, k / 0.3) * np.clip((d - k) / 0.2, 0, 1), t, 0.06, width=1)
    elif ty == 'fall':
        sfx(whoosh(0.9, 2500, 200, 1.0, 1.2), t, 0.15, width=1)
    elif ty == 'flatline':
        for b in (0.0, 0.12):
            sfx(norm(osc(1000, 0.09) * np.minimum(1, T(0.09) / 0.004)), t - 0.02 + b, 0.07)
        d = e['end'] - t - 0.1
        sfx(osc(1000, d) * np.minimum(1, T(d) / 0.005) * np.clip((d - T(d)) / 0.02, 0, 1), t + 0.4, 0.06)
    elif ty == 'stop':
        d = 0.35; k = T(d)
        fc = 600 + 2200 * np.abs(np.sin(2 * np.pi * 7 * k))
        s = svf(noise(d), fc, 2.5, 'bp') * np.sin(np.pi * k / d) ** 0.5
        sfx(norm(s), t - 0.05, 0.3)
        sfx(thump(140, 40, 0.6, 0.2), t + 0.02, 0.4, big=0.3)
    elif ty == 'rewind':
        d = e['end'] - t
        for i in range(10):
            tt = t + d * (1 - (1 - i / 10) ** 1.6)
            sfx(norm(glide(800 + 300 * i, 2400 + 400 * i, 0.06, 0.03)), tt, 0.04, pan=0.4 * (-1) ** i)
        k = T(d) / d
        sfx(norm(svf(noise(d), 600 * 8 ** k, 2.0, 'bp') * k ** 1.5), t, 0.12, width=1)
    elif ty == 'wipe':
        sfx(rev_swell(0.45, 2000), t - 0.45, 0.3, width=1)
        sfx(thump(120, 36, 1.6, 0.5), t, 0.85, big=0.3)
        sfx(crash(3.0), t, 0.18, width=1, r=0.2)
    elif ty == 'pop2':
        sfx(pop(800, 0.12), t, 0.22, r=0.2); sfx(boing(200, 700, 0.35), t + 0.03, 0.12)
    elif ty == 'stretch':
        d = e['end'] - t; k = T(d) / d
        f = 90 * 3 ** k + 6 * np.sin(2 * np.pi * 9 * T(d))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR + 1.6 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)) * k ** 1.2
        sfx(norm(s), t, 0.1, r=0.1)
    elif ty == 'launch':
        d = 0.6
        sfx(norm(np.sin(2 * np.pi * np.cumsum(80 + 260 * np.exp(-T(d) / 0.05)) / SR) * np.exp(-T(d) / 0.2)), t, 0.45)
        w = whoosh(0.8, 2500, 400, 1.1, 1.0); k = T(0.8) / 0.8
        sfx(np.vstack([w * (1 - k), w * k]) / np.max(np.abs(w)), t, 0.35, r=0.2)
    elif ty == 'morph':
        d = 0.6
        sfx(norm(filt(saw_add(midi(53) * 2 ** (T(d) / d), d, 10), 'low', 2500) * np.sin(np.pi * T(d) / d)), t, 0.1, r=0.3, width=1)
        for i, m in enumerate((77, 81, 84, 89)):
            sfx(celesta(midi(m)), t + i * 0.08, 0.05, r=0.3)
    elif ty == 'shapePop':
        sfx(pop(rng.choice([600, 800]), 0.1), t, 0.2, r=0.2); sfx(thump(160, 80, 0.25, 0.06), t, 0.18)
    elif ty == 'whip':
        w = whoosh(0.3, 5000, 500, 1.0, 1.0)
        sfx(np.vstack([w, np.roll(w, 200)]) / np.max(np.abs(w)), t - 0.18, 0.35)
    elif ty == 'whoosh':
        sfx(whoosh(0.4, 600, 4000, 1.0, 1.4), t - 0.1, 0.16, width=1)
    elif ty == 'drag':
        d = e['end'] - t
        sfx(norm(filt(noise(d), 'bp', (800, 2500)) * (0.6 + 0.4 * np.sin(2 * np.pi * 25 * T(d)))) * np.sin(np.pi * T(d) / d), t, 0.04)
        sfx(click(0.01, 2000), t, 0.12)
    elif ty == 'panel':
        sfx(whoosh(0.35, 400, 3000, 1.0, 1.3), t - 0.1, 0.16); sfx(thump(120, 60, 0.3, 0.08), t + 0.2, 0.2)
    elif ty == 'kf':
        sfx(marimba(midi(84 + int(rng.integers(0, 4)) * 2)), t, 0.05, pan=rng.uniform(-0.5, 0.5), r=0.15)
    elif ty == 'wink':
        sfx(celesta(midi(101)), t, 0.12, r=0.4)
    elif ty == 'aePop':
        sfx(pop(700, 0.1), t, 0.18, r=0.2)
    elif ty == 'marker':
        d = e['end'] - t + 0.1
        sfx(norm(filt(noise(d), 'bp', (1500, 5000)) * (0.6 + 0.4 * np.sin(2 * np.pi * 20 * T(d)))) * np.sin(np.pi * T(d) / d) ** 0.5, t, 0.13)
    elif ty == 'stamp':
        sfx(thump(110, 45, 0.5, 0.12), t, 0.45); sfx(norm(filt(noise(0.12), 'bp', (500, 3000)) * env(0.12, 0.001, 0.03)), t, 0.2)
    elif ty == 'slam':
        sfx(thump(100, 32, 1.4, 0.45), t, 0.8, big=0.3); sfx(snare(0.4), t, 0.3, r=0.3); sfx(crash(3.0), t, 0.12, width=1)
    elif ty == 'plink':
        notes = [69, 72, 74, 77, 81, 84, 86, 89, 93, 96, 98, 101, 105]
        sfx(marimba(midi(notes[e['i'] % len(notes)])), t, 0.05, pan=-0.6 + 1.2 * e['i'] / 12, r=0.2)
    elif ty == 'dots':
        for i in range(3):
            sfx(pop(900 + i * 300, 0.05), t + i * 0.09, 0.1)
    elif ty == 'merge':
        sfx(norm(glide(300, 900, 0.12, 0.05)), t, 0.15)
    elif ty == 'jump':
        sfx(whoosh(0.5, 500, 3000, 1.0, 1.2), t, 0.16); sfx(boing(220, 760, 0.4), t + 0.05, 0.1)
    elif ty == 'finalHit':
        sfx(thump(110, 30, 3.5, 1.2, 0.08), t, 0.75, big=0.4)
        sfx(crash(4.5), t, 0.22, width=1, r=0.3)
        sfx(debris(1.2, 60, 5000, 31), t, 0.08, width=1, r=0.3)
    elif ty == 'pillPop':
        sfx(pop(650, 0.12), t, 0.22, r=0.2)
    elif ty == 'click':
        sfx(norm(click(0.015, 1500) + 0.6 * thump(900, 500, 0.015, 0.004)), t, 0.28)
    elif ty == 'confetti':
        sfx(norm(filt(noise(0.15), 'bp', (1000, 6000)) * env(0.15, 0.001, 0.03)), t, 0.3)
        for i in range(34):
            sfx(celesta(midi(int(rng.choice([84, 88, 91, 96, 100, 103])))), t + rng.uniform(0, 1.0), 0.02, pan=rng.uniform(-0.9, 0.9), r=0.3)


# ------------------------------------------------------------------ the score
MOTIF_MIN = [69, 74, 76, 77]           # A D E F: tentative, minor
MOTIF_MAJ = [69, 72, 74, 77, 81]       # A C D F A: confident, F major
GRID0 = v(26.72)                        # the drop on «смотри!» is a downbeat
BEAT = 0.5


def grid(a, b, step=BEAT, off=0.0):
    k = int(np.ceil((a - GRID0 - off) / step - 1e-9))
    out = []
    while GRID0 + off + k * step < b - 1e-9:
        out.append((GRID0 + off + k * step, k)); k += 1
    return out


PROG = {0: [41, 53, 57, 60, 65], 1: [36, 52, 55, 60, 64], 2: [38, 50, 57, 62, 65], 3: [34, 50, 53, 58, 62]}   # F C Dm Bb


def chord(t):
    return PROG[int(np.floor((t - GRID0) / 2.0)) % 4]


def score():
    # A. hook + notes: felt piano carries the tentative motif, a hush of pad
    for tt, m in zip([v(0.1), v(0.64), v(1.12), v(1.6)], MOTIF_MIN):
        mu(piano(midi(m), 2.8, 0.8), tt, 0.16, pan=-0.1, r=0.35)
    for tt, ch in ((v(2.88), [50, 57, 62, 65]), (v(5.0), [46, 53, 58, 62]), (v(6.96), [43, 50, 55, 58])):
        for i, m in enumerate(ch):
            mu(piano(midi(m), 3.0, 0.5), tt + i * 0.03, 0.08, pan=-0.3 + 0.2 * i, r=0.4)
    mu(supersaw([50, 57, 62], v(8.2) - 1.0, 900, 1.5, 1.2), 1.0, 0.05, r=0.3)
    # B. the dot is born: celesta arpeggio + warm pad + «живой!» shimmer
    for i in range(14):
        tt = v(8.3) + i * 0.27
        m = [65, 69, 72, 77, 81, 77, 72, 69][i % 8] + 12
        mu(celesta(midi(m)), tt, 0.06 + 0.02 * (i % 4 == 0), pan=0.4 * np.sin(i), r=0.35)
    mu(supersaw([53, 60, 65, 69], v(12.7) - v(9.2), 1400, 1.2, 0.6), v(9.2), 0.07, r=0.4, width=1)
    for i, m in enumerate([77, 81, 84, 89, 93, 96, 101]):   # harp-like gliss on «живой!»
        mu(ks(midi(m), 1.2, 0.997, 6000), v(12.0) + i * 0.035, 0.07, pan=-0.5 + i * 0.15, r=0.4)
    mu(choir([65, 69, 72, 77], 1.8, 0.4, 0.8), v(12.08), 0.08, r=0.5, width=1)
    # C. the bites: sneaky villain pizzicato in D minor + reed motif + timpani
    pat = [38, 45, 50, 48, 38, 45, 49, 45]
    tt, i = v(12.75), 0
    while tt < v(20.2):
        if not (v(18.1) < tt < v(18.9)):      # the music holds its breath for the long sigh
            mu(pizz(midi(pat[i % 8])), tt, 0.16 if i % 2 == 0 else 0.11, pan=-0.2, r=0.15)
            if i % 4 == 2:
                mu(pizz(midi(pat[i % 8] + 24)), tt, 0.05, pan=0.3, r=0.2)
        tt += 0.3; i += 1
    for k2, m in enumerate([62, 61, 60, 59]):   # deadline: descending reed
        mu(reed(midi(m), 0.32), v(13.36) + k2 * 0.3, 0.09, pan=0.3, r=0.25)
    mu(timpani(73.4), v(14.2), 0.4, big=0.3); mu(timpani(55), v(16.5), 0.35, big=0.3)
    mu(wah(midi(58), 0.5), v(15.7), 0.1, pan=-0.3, r=0.2); mu(wah(midi(56), 0.7), v(16.2), 0.1, pan=-0.3, r=0.2)   # edits: «wah-wah»
    mu(theremin(midi(74), midi(70), 1.8), v(17.3), 0.07, pan=0.4, r=0.5)   # doubts
    mu(theremin(midi(70), midi(62), 1.5), v(19.1), 0.07, pan=0.4, r=0.5)
    mu(brass([38, 44, 50, 53], 1.4), v(19.6), 0.14, r=0.4, big=0.3)       # «доели»: low cluster stinger
    # D. midnight: drone, slow ticking, a detuned piano that never finishes the phrase
    d = v(24.3) - v(20.75)
    dr = (osc(midi(26), d) + 0.6 * osc(midi(33), d) + 0.2 * osc(midi(38) * 1.004, d)) * adsr(d, 0.8, 1.0)
    mu(norm(dr), v(20.75), 0.12, r=0.3, width=1)
    tt = v(21.0)
    while tt < v(24.2):
        mu(norm(click(0.008, 1800) + 0.4 * osc(1500, 0.008) * np.exp(-T(0.008) / 0.003)), tt, 0.06, pan=0.25); tt += 0.5
    for tt, m, dt in ((v(21.6), 69, -25), (v(22.4), 74, -35), (v(23.2), 76, -45)):
        mu(piano(midi(m), 3.0, 0.6, True, dt), tt, 0.13, pan=-0.2, r=0.6)
    # E/F. «Стоп» (scratch is an sfx) … «А теперь» riser + snare roll into the drop
    a, b = v(26.08), GRID0
    n = 24
    for j in range(n):
        tt = a + (b - a) * (1 - (1 - j / n) ** 1.7)
        mu(snare(0.12), tt, 0.04 + 0.12 * (j / n) ** 2, pan=0.15 * (-1) ** j)
    d = b - a; k = T(d) / d
    mu(np.vstack([norm(svf(noise(d), 400 * 20 ** k, 1.6, 'bp') * k ** 2)] * 2), a, 0.15, r=0.2)
    # G/H. the drop: four-on-the-floor in F major, the motif becomes a confident lead
    for (a, b, lvl, full) in ((GRID0, v(31.95), 1.0, 1), (v(31.95), v(35.66), 0.85, 0)):
        for tt, k2 in grid(a, b, BEAT):
            mu(kick(), tt, 0.4 * lvl)
            if k2 % 2 == 1:
                mu(clap(), tt, 0.16 * lvl, r=0.25)
            mu(hat(0.2, True), tt + BEAT / 2, 0.04 * lvl, pan=-0.2)
        for tt, k2 in grid(a, b, BEAT / 4):
            mu(hat(0.03), tt, (0.025 if k2 % 2 else 0.04) * lvl, pan=0.3)
        for tt, k2 in grid(a, b, BEAT / 2):
            ch = chord(tt)
            mu(bassp(midi(ch[0] - 12 + (12 if k2 % 2 else 0))), tt, 0.17 * lvl)
            if full and k2 % 2 == 1:
                mu(supersaw(ch[1:], 0.22, 4000, 0.005, 0.12), tt, 0.06, r=0.25, width=1)
        for tt, k2 in grid(a, b, BEAT / 4):
            ch = chord(tt)
            m = [ch[1], ch[2], ch[3], ch[4], ch[3], ch[2]][k2 % 6] + 12
            mu(ks(midi(m), 0.3, 0.98, 5000), tt, 0.035, pan=0.5 * (-1) ** k2, r=0.2)
    for j, m in enumerate(MOTIF_MAJ):           # «линией!»: the theme, now sure of itself
        mu(lead(midi(m + 12), 0.25 if j < 4 else 0.9), v(29.2) + j * 0.25, 0.08, r=0.35)
    for j, m in enumerate(MOTIF_MAJ):           # echoed on «ритмом!»
        mu(lead(midi(m + 12), 0.2 if j < 4 else 0.5), v(31.36) + j * 0.125, 0.06, r=0.35)
    for j in range(4):                          # fill into the craft section
        mu(tom(180 - j * 30), v(31.6) + j * 0.09, 0.2)
    # I. code: lo-fi whisper, music box plays the theme
    a, b = v(35.66), v(39.55)
    for tt, k2 in grid(a, b, BEAT):
        mu(norm(filt(kick(), 'low', 250)), tt, 0.16)
    for j, m in enumerate(MOTIF_MAJ + [77, 72]):
        mu(musicbox(midi(m + 12)), v(35.9) + j * 0.36, 0.06, pan=0.3 * np.sin(j), r=0.5)
    crack = filt(noise(b - a), 'high', 3000) * (rng.random(int((b - a) * SR)) > 0.9995)
    mu(norm(crack + 1e-9), a, 0.04)
    mu(pizz(midi(79)), v(38.2), 0.12, r=0.3); mu(pizz(midi(84)), v(38.32), 0.12, r=0.3)   # after the laugh: «ta-da»
    # J. finale: brass + choir + drums carry the theme to its resolution
    a = v(39.6)
    mu(supersaw([41, 53, 60, 65, 69], v(43.3) - a, 2400, 0.3, 0.3), a, 0.08, r=0.4, width=1)
    mu(choir([65, 69, 72, 77], v(43.4) - a, 0.5, 0.4), a, 0.07, r=0.5, width=1)
    for tt, k2 in grid(a, v(43.3), BEAT):
        mu(kick(), tt, 0.38)
        if k2 % 2 == 1:
            mu(snare(0.25), tt, 0.14, r=0.3)
        mu(tom(90 + 20 * (k2 % 3), 0.4), tt + BEAT / 2, 0.1)
    for j, m in enumerate(MOTIF_MAJ):
        mu(brass([m, m - 12], 0.32 if j < 4 else 1.2), v(40.24) + j * 0.22, 0.12, r=0.4)
    n = 18
    for j in range(n):   # build into «к движению»
        tt = v(42.0) + 0.8 * (1 - (1 - j / n) ** 1.5)
        mu(snare(0.1), tt, 0.04 + 0.1 * j / n)
    LAND = v(43.3)
    for m, p in ((29, 0), (41, 0), (53, -0.3), (60, 0.3), (65, -0.2), (69, 0.2), (72, 0.1), (79, -0.1)):
        mu(brass([m], 3.5), LAND, 0.06, pan=p, r=0.5, big=0.3)
    mu(choir([65, 69, 72, 77, 81], 4.0, 0.05, 2.0), LAND, 0.1, r=0.5, big=0.3, width=1)
    # K. CTA: playful reprise, cadence C → F on «Сделаем»
    for j, m in enumerate([69, 72, 74, 77, 74, 77, 81]):
        mu(celesta(midi(m + 12)), v(43.7) + j * 0.24, 0.06, r=0.4)
        mu(pizz(midi(m - 12)), v(43.7) + j * 0.24, 0.08, r=0.2)
    mu(supersaw([48, 55, 60, 64], 0.9, 2000, 0.05, 0.3), v(44.75), 0.06, r=0.4, width=1)
    tc = v(45.6)
    for m, p in ((41, 0), (53, -0.3), (60, 0.3), (65, -0.2), (69, 0.2), (72, 0.1), (77, 0)):
        mu(piano(midi(m), 4.0, 0.8, False), tc + 0.02, 0.07, pan=p, r=0.5)
    mu(supersaw([53, 60, 65, 69, 72], DUR - tc - 0.1, 1800, 0.4, 2.0), tc, 0.07, r=0.5, width=1)
    # room tone glue
    rt = filt(noise(DUR), 'low', 400)
    mu(np.vstack([norm(rt), norm(np.roll(rt, 9000))]) * 0.5, 0, 0.012)


def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    score()
    r = wave.open('vo3/vo.wav')
    x = np.frombuffer(r.readframes(r.getnframes()), np.int16) / 32768.0
    x = filt(x, 'high', 80)
    x = x + 0.22 * filt(x, 'high', 3200)
    lv = np.sqrt(signal.sosfilt(signal.butter(1, 12 / (SR / 2), 'low', output='sos'), x ** 2) + 1e-9)
    thr = np.percentile(lv[lv > 1e-3], 55)
    x = norm(x * np.where(lv > thr, (thr / lv) ** (1 - 1 / 3.0), 1.0))
    put(vo, x, V0, 1.0, r=0.035)
    venv = np.abs(vo[0]) + np.abs(vo[1])
    venv = signal.sosfilt(signal.butter(1, 5 / (SR / 2), 'low', output='sos'), venv)
    venv = np.clip(venv / (np.percentile(venv[venv > 1e-4], 70) + 1e-9), 0, 1)
    duck = 1 - 0.45 * venv
    irL, irR = A.reverb_ir(1.6, 0.28)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])
    bL, bR = A.reverb_ir(3.4, 0.6)
    rb = np.vstack([signal.fftconvolve(rev_big[0], bL)[:N], signal.fftconvolve(rev_big[1], bR)[:N]])

    def rms(a):
        return np.sqrt(np.mean(a[np.abs(a) > 1e-5] ** 2) + 1e-12)
    g = 1 / rms(vo)
    mix = vo * g + fx * g * 0.6 + mus * duck * g * 0.82 + rv * g * 0.42 + rb * g * 0.32
    mix = signal.sosfilt(signal.butter(2, 30 / (SR / 2), 'high', output='sos'), mix, axis=1)
    pk = np.percentile(np.abs(mix), 99.95)
    mix = np.tanh(mix / pk * 1.1) / np.tanh(1.1)
    k = np.arange(N) / SR
    mix *= np.clip((DUR - k) / 0.8, 0, 1) ** 1.5
    mix = mix / np.max(np.abs(mix)) * 10 ** (-0.8 / 20)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')
    for name, b in (('vo', vo * g), ('fx', fx * g * 0.6), ('mus', mus * duck * g)):
        print(name, f'{20 * np.log10(np.sqrt(np.mean(b ** 2)) + 1e-9):.1f} dB')


if __name__ == '__main__':
    main()
