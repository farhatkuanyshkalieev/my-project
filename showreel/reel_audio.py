"""Sound for «От идеи к движению» v2: voice-forward, bright and playful.

Every cue in the sheet exported from reel.js (vo2/events.json) gets a designed
sound. A light pop bed follows the story: curious → bouncy (the bites) →
silence at midnight → the drop on «смотри!» → whisper → the final hit.
The music bus is sidechain-ducked under the voice.

usage: python3 reel_audio.py vo2/events.json out.wav
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

import audio as A   # synthesis helpers (osc, noise, filters, plucks, thumps…)
from audio import T, norm, osc, noise, env, filt, svf, click, ping, fm_pluck, thump, kick, whoosh, saw_add, midi, metal, debris, rev_swell, fade_tail

SR = A.SR
DUR = 46.0
N = int(SR * DUR)
V0 = 0.6
rng = np.random.default_rng(7)

fx = np.zeros((2, N))
mus = np.zeros((2, N))
vo = np.zeros((2, N))
rev = np.zeros((2, N))


def v(s):
    return V0 + s


def put(bus, sig, t0, g=1.0, pan=0.0, r=0.0, width=0.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if sig.ndim == 1:
        th = (pan + 1) * np.pi / 4
        st = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
        if width:
            sh = int(SR * 0.007 * width)
            st[1] = np.concatenate([np.zeros(sh), st[1][:len(st[1]) - sh]])
    else:
        st = sig.copy()
    if i0 < 0:
        st = st[:, -i0:]
        i0 = 0
    n = min(st.shape[1], N - i0)
    st = st[:, :n] * g
    bus[:, i0:i0 + n] += st
    if r:
        rev[:, i0:i0 + n] += st * r


def sfx(sig, t0, g=1.0, pan=0.0, r=0.0, width=0.0):
    put(fx, sig, t0, g, pan, r, width)


def music(sig, t0, g=1.0, pan=0.0, r=0.0, width=0.0):
    put(mus, sig, t0, g, pan, r, width)


def glide(f0, f1, d, tau=None, curve='exp'):
    k = T(d) / d
    f = f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return s * (np.exp(-T(d) / tau) if tau else 1)


def pop(f=900, d=0.06, bright=1.0):
    s = glide(f * 1.6, f, d, d / 3) + 0.3 * glide(f * 3.2, f * 2, d, d / 4)
    s *= np.minimum(1, T(d) / 0.0015)
    return norm(s + 0.15 * bright * click(d, 3000)[:len(s)])


def marimba(f, d=0.6):
    t = T(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03) + 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / 0.01)
    return norm(s * np.minimum(1, t / 0.002))


def boing(f0=180, f1=620, d=0.35):
    t = T(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.08)) + 30 * np.sin(2 * np.pi * 18 * t) * np.exp(-t / 0.15)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14) * np.minimum(1, t / 0.003))


def crunch(d=0.35, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR))
    for _ in range(18):
        i = int(r.uniform(0, 0.6) * len(out))
        g = filt(r.standard_normal(int(0.02 * SR)), 'bp', (1500, 8000)) * np.hanning(int(0.02 * SR)) * r.uniform(0.3, 1)
        out[i:i + len(g)] += g[:len(out) - i]
    return norm(out)


# ------------------------------------------------------------------ sound effects
def cue(e):
    ty, t = e['type'], e['t']
    if ty == 'pop':
        sfx(pop(rng.uniform(700, 1100), 0.05), t, 0.07, pan=rng.uniform(-0.3, 0.3))
    elif ty == 'popAccent':
        sfx(pop(rng.uniform(1100, 1500), 0.08), t, 0.13, pan=rng.uniform(-0.25, 0.25), r=0.15)
        sfx(marimba(midi(rng.choice([77, 81, 84, 89]))), t, 0.05, r=0.2)
    elif ty == 'slideUp':
        sfx(whoosh(0.4, 300, 3500, 1.0, 1.2), t - 0.15, 0.22, r=0.1)
        sfx(thump(140, 70, 0.3, 0.08), t + 0.18, 0.18)
    elif ty == 'scribble':
        d = 0.45
        k = T(d)
        s = filt(noise(d), 'bp', (2500, 7000)) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * k)) ** 2 * np.sin(np.pi * k / d)
        sfx(norm(s), t, 0.07, pan=0.4)
    elif ty == 'key':
        sfx(norm(click(0.012, 2500) + 0.5 * thump(400, 200, 0.03, 0.01)[:int(0.012 * SR)]), t, 0.09, pan=rng.uniform(-0.2, 0.2))
    elif ty == 'key2':
        sfx(click(0.008, 3000), t, 0.05, pan=rng.uniform(-0.4, 0.4))
    elif ty == 'blip':
        sfx(norm(osc(1760, 0.12) * env(0.12, 0.002, 0.04)), t, 0.06, r=0.3)
    elif ty == 'zoomThrough':
        d = e['end'] - t
        k = T(d) / d
        w = svf(noise(d), 400 * 15 ** k, 1.3, 'bp') * k ** 2
        sfx(np.vstack([norm(w), norm(np.roll(w, 300))]), t, 0.28, r=0.2)
        sfx(thump(120, 40, 0.8, 0.25), e['end'], 0.6)
        sfx(pop(600, 0.1), e['end'], 0.25, r=0.3)
    elif ty == 'boing':
        sfx(boing(160, 520, 0.4), t, 0.3, r=0.15)
        sfx(thump(110, 55, 0.3, 0.07), t, 0.3)
    elif ty == 'shrink':
        sfx(norm(glide(1100, 300, 0.3, 0.2)), t, 0.12, r=0.2)
    elif ty == 'warm':
        d = 1.0
        k = T(d) / d
        s = sum(osc(f, d, rng.uniform(0, 6)) for f in (midi(77), midi(81), midi(84), midi(89))) * np.sin(np.pi * k) ** 2
        sfx(norm(s), t, 0.07, r=0.5, width=1)
    elif ty == 'eyes':
        sfx(marimba(midi(96)), t, 0.12, pan=-0.2, r=0.3)
        sfx(marimba(midi(100)), t + 0.07, 0.10, pan=0.2, r=0.3)
    elif ty in ('land', 'land2'):
        sfx(thump(130, 60, 0.3, 0.07), t, 0.3)
        sfx(norm(filt(noise(0.08), 'low', 1500) * env(0.08, 0.001, 0.02)), t, 0.1)
    elif ty == 'hops':
        for i in range(4):
            sfx(boing(140, 320, 0.25), t + i * 0.22, 0.14, pan=0.5 - i * 0.1)
    elif ty in ('chomp', 'chomp2'):
        sfx(crunch(0.4, 3 if ty == 'chomp' else 5), t, 0.45, width=1, r=0.15)
        sfx(thump(160, 70, 0.3, 0.08, 0.02), t, 0.5)
        d = 0.3
        nom = np.sin(2 * np.pi * np.cumsum(140 + 30 * np.sin(2 * np.pi * 35 * T(d))) / SR) * env(d, 0.01, 0.08)
        sfx(norm(nom), t + 0.03, 0.18)
        sfx(debris(0.6, 30, 2500, 11), t + 0.05, 0.12, width=1)
    elif ty == 'splat':
        sfx(norm(filt(noise(0.25), 'low', 1800) * env(0.25, 0.001, 0.05)), t, 0.35)
        sfx(norm(glide(500, 120, 0.2, 0.08)), t, 0.25)
    elif ty == 'vortex':
        d = e['end'] - t
        k = T(d)
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 1.6 * k)
        s = svf(noise(d), 600 + 1800 * lfo, 3.0, 'bp')
        s = s * np.minimum(1, k / 0.4)
        sfx(np.vstack([norm(s) * (0.6 + 0.4 * lfo), norm(s) * (1 - 0.4 * lfo)]), t, 0.10, r=0.3)
        sfx(norm(glide(300, 900, d) * np.minimum(1, k / 0.5)), t, 0.03, r=0.3)
    elif ty == 'suck':
        d = 0.8
        k = T(d) / d
        s = svf(noise(d), 300 * 12 ** k, 4, 'bp') * np.sin(np.pi * k)
        sfx(norm(s), t, 0.28, r=0.2)
        sfx(norm(glide(200, 900, 0.15, 0.05)), t + 0.78, 0.2)
    elif ty == 'swallow':
        d = e['end'] - t + 0.3
        sfx(whoosh(d, 3000, 120, 1.0, 1.5), t, 0.35, r=0.3, width=1)
        sfx(thump(90, 30, 1.6, 0.6), e['end'], 0.7, r=0.3)
    elif ty == 'clockSpin':
        tt, gap = t, 0.03
        while tt < e['end']:
            sfx(click(0.006, 3500), tt, 0.09, pan=0.2)
            tt += gap
            gap *= 1.12
    elif ty == 'dong':
        sfx(ping(220, 4.0, 1.6, ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.1))), t, 0.32, r=0.6)
    elif ty == 'tabs':
        for i in range(14):
            tt = t + i * 0.04 + rng.uniform(0, 0.02)
            sfx(whoosh(0.25, 800, 4000, 1.2, 1.4), tt, 0.05, pan=rng.uniform(-0.9, 0.9))
        d = e['end'] - t
        k = T(d)
        sw = svf(noise(d), 700 + 500 * np.sin(2 * np.pi * 1.25 * k), 2.0, 'bp')
        sfx(norm(sw) * np.minimum(1, k / 0.3), t, 0.08, width=1)
    elif ty == 'freeze':
        sfx(norm(glide(900, 60, 0.4, 0.2)), t - 0.05, 0.2)
    elif ty == 'flatline':
        for b in (0.0, 0.11):
            sfx(norm(osc(1000, 0.09) * np.minimum(1, T(0.09) / 0.004)), t - 0.08 + b, 0.08)
        d = 1.5
        s = osc(1000, d) * np.minimum(1, T(d) / 0.005) * np.clip((d - T(d)) / 0.4, 0, 1)
        sfx(s, t + 0.35, 0.07)
    elif ty == 'wipe':
        sfx(rev_swell(0.45, 2000), t - 0.45, 0.35, width=1)
        sfx(thump(120, 38, 1.4, 0.45), t, 0.9)
        sfx(norm(filt(noise(1.6), 'high', 4000) * env(1.6, 0.002, 0.5)), t, 0.2, r=0.4, width=1)
        sfx(norm(filt(noise(0.2), 'bp', (800, 5000)) * env(0.2, 0.001, 0.05)), t, 0.35)
    elif ty == 'pop2':
        sfx(pop(800, 0.12), t, 0.3, r=0.2)
        sfx(boing(200, 700, 0.35), t + 0.03, 0.16)
    elif ty == 'stretch':
        d = e['end'] - t
        k = T(d) / d
        f = 90 * 3 ** k + 6 * np.sin(2 * np.pi * 9 * T(d))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR + 1.6 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)) * k ** 1.2
        sfx(norm(s), t, 0.13, r=0.1)
    elif ty == 'launch':
        d = 0.6
        tw = np.sin(2 * np.pi * np.cumsum(80 + 260 * np.exp(-T(d) / 0.05)) / SR) * np.exp(-T(d) / 0.2)
        sfx(norm(tw), t, 0.5)
        w = whoosh(0.7, 2500, 400, 1.1, 1.0)
        k = T(0.7) / 0.7
        sfx(np.vstack([w * (1 - k), w * k]) / np.max(np.abs(w)), t, 0.4, r=0.2)
    elif ty == 'morph':
        d = 0.55
        s = filt(saw_add(midi(53) * 2 ** (T(d) / d), d, 10), 'low', 2500) * np.sin(np.pi * T(d) / d)
        sfx(norm(s), t, 0.12, r=0.3, width=1)
    elif ty == 'shapePop':
        sfx(pop(rng.choice([600, 800]), 0.1), t, 0.25, r=0.2)
        sfx(thump(160, 80, 0.25, 0.06), t, 0.2)
    elif ty == 'whip':
        w = whoosh(0.3, 5000, 500, 1.0, 1.0)
        sfx(np.vstack([w, np.roll(w, 200)]) / np.max(np.abs(w)), t - 0.18, 0.4)
    elif ty == 'whoosh':
        sfx(whoosh(0.4, 600, 4000, 1.0, 1.4), t - 0.1, 0.2, width=1)
    elif ty == 'drag':
        d = e['end'] - t
        s = filt(noise(d), 'bp', (800, 2500)) * (0.6 + 0.4 * np.sin(2 * np.pi * 25 * T(d)))
        sfx(norm(s) * np.sin(np.pi * T(d) / d), t, 0.05)
        sfx(click(0.01, 2000), t, 0.15)
    elif ty == 'panel':
        sfx(whoosh(0.35, 400, 3000, 1.0, 1.3), t - 0.1, 0.2)
        sfx(thump(120, 60, 0.3, 0.08), t + 0.2, 0.25)
    elif ty == 'kf':
        sfx(marimba(midi(84 + int(rng.integers(0, 3)) * 2)), t, 0.06, pan=rng.uniform(-0.5, 0.5), r=0.15)
    elif ty == 'wink':
        sfx(ping(midi(100), 1.2, 0.35, ((1, 1), (2.0, 0.3))), t, 0.14, r=0.4)
    elif ty == 'aePop':
        sfx(pop(700, 0.1), t, 0.22, r=0.2)
    elif ty == 'marker':
        d = e['end'] - t + 0.1
        s = filt(noise(d), 'bp', (1500, 5000)) * (0.6 + 0.4 * np.sin(2 * np.pi * 20 * T(d)))
        sfx(norm(s) * np.sin(np.pi * T(d) / d) ** 0.5, t, 0.16)
    elif ty == 'stamp':
        sfx(thump(110, 45, 0.5, 0.12), t, 0.5)
        sfx(norm(filt(noise(0.12), 'bp', (500, 3000)) * env(0.12, 0.001, 0.03)), t, 0.25)
    elif ty == 'slam':
        sfx(kick(), t, 0.8)
        sfx(norm(filt(noise(0.3), 'bp', (1200, 7000)) * env(0.3, 0.001, 0.07)), t, 0.4, r=0.3, width=1)
        sfx(thump(100, 34, 1.2, 0.4), t, 0.6)
    elif ty == 'plink':
        notes = [65, 69, 72, 77, 81, 84, 89, 81, 84, 89, 93, 96, 101]
        sfx(marimba(midi(notes[e['i'] % len(notes)])), t, 0.07, pan=-0.6 + 1.2 * e['i'] / 12, r=0.2)
    elif ty == 'dots':
        for i in range(3):
            sfx(pop(900 + i * 300, 0.05), t + i * 0.08, 0.12)
    elif ty == 'jump':
        sfx(whoosh(0.5, 500, 3000, 1.0, 1.2), t, 0.2)
        sfx(boing(220, 760, 0.4), t + 0.05, 0.14)
    elif ty == 'finalHit':
        sfx(thump(110, 30, 3.5, 1.2, 0.08), t, 0.6, r=0.3)
        sfx(kick(), t, 0.4)
        sfx(norm(filt(noise(3.0), 'high', 3500) * env(3.0, 0.003, 0.9)), t, 0.22, r=0.5, width=1)
        for m, p in ((53, -0.4), (60, 0.4), (65, -0.2), (69, 0.2), (72, 0.0), (79, 0.3)):
            sfx(ping(midi(m + 12), 5.0, 2.0), t + 0.01, 0.05, pan=p, r=0.5)
        sfx(debris(1.2, 60, 5000, 31), t, 0.1, width=1, r=0.3)
    elif ty == 'pillPop':
        sfx(pop(650, 0.12), t, 0.3, r=0.2)
        sfx(boing(250, 600, 0.3), t + 0.02, 0.1)
    elif ty == 'click':
        sfx(norm(click(0.015, 1500) + 0.6 * thump(900, 500, 0.015, 0.004)), t, 0.3)
    elif ty == 'confetti':
        sfx(norm(filt(noise(0.15), 'bp', (1000, 6000)) * env(0.15, 0.001, 0.03)), t, 0.35)
        for i in range(30):
            sfx(marimba(midi(int(rng.choice([84, 88, 91, 96, 100, 103])))), t + rng.uniform(0, 0.9), 0.025, pan=rng.uniform(-0.9, 0.9), r=0.3)
        sfx(debris(1.4, 70, 6000, 41), t, 0.08, width=1)


# ------------------------------------------------------------------ music bed
BEAT = 0.5
GRID0 = v(24.13)          # the drop on «смотри!» lands on a downbeat
CH = {'F': [53, 57, 60, 65], 'Dm': [50, 53, 57, 62], 'Bb': [46, 50, 53, 58], 'C': [48, 52, 55, 60], 'Gm': [43, 50, 55, 58]}
PROG = ['F', 'Dm', 'Bb', 'C']


def beats(a, b, step=BEAT, off=0.0):
    k0 = int(np.ceil((a - GRID0 - off) / step - 1e-9))
    out = []
    k = k0
    while GRID0 + off + k * step < b - 1e-9:
        out.append((GRID0 + off + k * step, k))
        k += 1
    return out


def chord_at(t):
    bar = int(np.floor((t - GRID0) / 2.0))
    return CH[PROG[bar % 4]]


def hat(d=0.04, open_=False):
    d = 0.18 if open_ else d
    return norm(filt(noise(d), 'high', 7000) * env(d, 0.0005, 0.06 if open_ else 0.01))


def clap():
    out = np.zeros(int(0.25 * SR))
    for i, dt in enumerate((0, 0.008, 0.017)):
        b = filt(noise(0.2), 'bp', (900, 5000)) * env(0.2, 0.0005, 0.02 if i < 2 else 0.07)
        j = int(dt * SR)
        out[j:j + len(b)] += b[:len(out) - j]
    return norm(out)


def pluckbass(f, d=0.22):
    s = filt(saw_add(f, d, 12), 'low', 900) * np.exp(-T(d) / 0.09) * np.minimum(1, T(d) / 0.003)
    return norm(s + 0.6 * osc(f, d) * np.exp(-T(d) / 0.12))


def stab(notes, d=0.25):
    s = sum(saw_add(midi(m) * 2 ** (dd / 1200), d, 10) for m in notes for dd in (-8, 8))
    s = filt(s, 'low', 3200) * np.exp(-T(d) / 0.1) * np.minimum(1, T(d) / 0.004)
    return norm(s)


def music_bed():
    S = dict(hook=(0, v(2.58)), notes=(v(2.58), v(7.22)), dot=(v(7.22), v(11.70)), bites=(v(11.70), v(18.90)),
             night=(v(18.90), v(24.10)), impulse=(v(24.13), v(29.74)), craft=(v(29.74), v(33.54)),
             code=(v(33.54), v(36.58)), title=(v(36.58), v(40.18)), cta=(v(40.18), 44.4))
    # curious intro: marimba 8ths + soft shaker, bass on the bar
    for t, k in beats(0.3, S['bites'][0], BEAT / 2):
        ch = chord_at(t)
        n = [ch[0] + 24, ch[2] + 12, ch[1] + 24, ch[3] + 12][k % 4]
        music(marimba(midi(n)), t, 0.07 if k % 2 == 0 else 0.045, pan=0.3 * (-1) ** k, r=0.2)
    for t, k in beats(1.0, S['bites'][0], BEAT / 4):
        music(hat(0.03), t, 0.02 + 0.015 * (k % 2 == 0), pan=0.35)
    for t, k in beats(S['dot'][0], S['bites'][0], BEAT):
        if k % 2 == 0:
            music(kick(), t, 0.22)
    for t, k in beats(0.3, S['bites'][0], 2.0):
        music(norm(osc(midi(chord_at(t)[0] - 12), 2.0) * np.minimum(1, T(2.0) / 0.05) * np.clip((2.0 - T(2.0)) / 0.3, 0, 1)), t, 0.12)
    # bites: bouncy pizz bass, kick + clap
    a, b = S['bites']
    for t, k in beats(a, b, BEAT):
        music(kick(), t, 0.32 if k % 2 == 0 else 0.22)
        if k % 2 == 1:
            music(clap(), t, 0.14, r=0.2)
    for t, k in beats(a, b, BEAT / 2):
        ch = chord_at(t)
        music(pluckbass(midi(ch[0] - 12 + (7 if k % 4 == 3 else 0))), t, 0.16)
        music(hat(0.03), t + BEAT / 4, 0.03, pan=0.3)
    # midnight: only a low pad
    a, b = S['night']
    d = v(22.4) - a
    pad = sum(saw_add(midi(m), d, 6, 0.5) for m in (38, 45, 50, 53))
    pad = filt(pad, 'low', 600) * np.minimum(1, T(d) / 0.6) * np.clip((d - T(d)) / 0.12, 0, 1)
    music(norm(pad), a, 0.12, r=0.4, width=1)
    # the drop
    for (a, b, full) in ((S['impulse'][0], S['impulse'][1], 1), (S['craft'][0], S['craft'][1], 0.8), (S['title'][0] + 0.02, S['cta'][1], 1)):
        for t, k in beats(a, b, BEAT):
            music(kick(), t, 0.42 * full)
            if k % 2 == 1:
                music(clap(), t, 0.2 * full, r=0.25)
            music(hat(0.18, True), t + BEAT / 2, 0.05 * full, pan=-0.2)
        for t, k in beats(a, b, BEAT / 4):
            music(hat(0.03), t, (0.035 if k % 2 else 0.05) * full, pan=0.3)
        for t, k in beats(a, b, BEAT / 2):
            ch = chord_at(t)
            music(pluckbass(midi(ch[0] - 12 + (12 if k % 2 else 0))), t, 0.2 * full)
            if k % 2 == 1 and full == 1:
                music(stab([n + 12 for n in ch[1:]]), t, 0.07, r=0.3, width=1)
        for t, k in beats(a, b, BEAT / 4):
            ch = chord_at(t)
            n = [ch[0], ch[1], ch[2], ch[3], ch[2], ch[1]][k % 6] + 24
            music(fm_pluck(midi(n), 0.3, 1.4, 2.0, 0.09, 0.03), t, 0.035, pan=0.5 * (-1) ** k, r=0.2)
    # whisper: soft filtered pulse only
    a, b = S['code']
    for t, k in beats(a, b, BEAT):
        music(norm(filt(kick(), 'low', 300)), t, 0.18)
    d = b - a
    pad = sum(saw_add(midi(m), d, 6, 0.5) for m in (53, 57, 60, 64))
    music(norm(filt(pad, 'low', 900) * np.minimum(1, T(d) / 0.4)), a, 0.06, r=0.4, width=1)
    # last chord
    tc = S['cta'][1]
    for m, p in ((41, 0), (53, -0.3), (60, 0.3), (65, -0.2), (69, 0.2), (72, 0.1)):
        music(ping(midi(m + 12), 2.8, 1.2), tc, 0.08, pan=p, r=0.5)


# ------------------------------------------------------------------ mix
def main():
    events = json.load(open(sys.argv[1]))
    for e in events:
        cue(e)
    music_bed()
    # voice: high-pass, gentle compression, presence, a touch of room
    r = wave.open('vo2/vo.wav')
    x = np.frombuffer(r.readframes(r.getnframes()), np.int16) / 32768.0
    x = filt(x, 'high', 80)
    x = x + 0.25 * filt(x, 'high', 3000)
    lv = np.sqrt(signal.sosfilt(signal.butter(1, 12 / (SR / 2), 'low', output='sos'), x ** 2) + 1e-9)
    thr = np.percentile(lv[lv > 1e-3], 55)
    x = norm(x * np.where(lv > thr, (thr / lv) ** (1 - 1 / 3.5), 1.0))
    put(vo, x, V0, 1.0, r=0.04)

    venv = np.abs(vo[0]) + np.abs(vo[1])
    venv = signal.sosfilt(signal.butter(1, 5 / (SR / 2), 'low', output='sos'), venv)
    venv = np.clip(venv / (np.percentile(venv[venv > 1e-4], 70) + 1e-9), 0, 1)
    duck = 1 - 0.5 * venv

    irL, irR = A.reverb_ir(1.8, 0.3)
    rv = np.vstack([signal.fftconvolve(rev[0], irL)[:N], signal.fftconvolve(rev[1], irR)[:N]])

    # balance the buses by loudness: voice on top, sfx under it, music under both
    def rms(a):
        return np.sqrt(np.mean(a[np.abs(a) > 1e-5] ** 2) + 1e-12)
    vo_n = vo / rms(vo)
    mix = vo_n * 1.0 + fx / rms(vo) * 0.62 + mus * duck / rms(vo) * 0.95 + rv / rms(vo) * 0.4
    mix = signal.sosfilt(signal.butter(2, 30 / (SR / 2), 'high', output='sos'), mix, axis=1)
    pk = np.percentile(np.abs(mix), 99.95)
    mix = np.tanh(mix / pk * 1.1) / np.tanh(1.1)
    k = np.arange(N) / SR
    mix *= np.clip((DUR - k) / 0.6, 0, 1) ** 1.5
    mix = mix / np.max(np.abs(mix)) * 10 ** (-0.8 / 20)
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'wrote {sys.argv[2]}  rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS')


if __name__ == '__main__':
    main()
