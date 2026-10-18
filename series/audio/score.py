"""Procedural score + sound design for an episode.

Reads the episode cue sheet and writes two stems next to the voiceover:
  music.wav  - the score (ducked later under the voice)
  sfx.wav    - every hit, whoosh and foley cue

Usage: python3 audio/score.py src/episodes/ep01/cues.json public/ep01
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- basics
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_ad(n, a, d, curve=4.0):
    """Attack (s) then exponential decay over d seconds, n samples long."""
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = np.exp(-curve * np.clip(t - a, 0, None) / max(d, 1e-4))
    return att * dec


def lp(x, fc, order=2):
    fc = min(fc, SR * 0.45)
    return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)


def sweep_filter(x, f0, f1, kind="low", block=256):
    """Block-wise time varying butterworth (cheap filter sweep)."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for i in range(nb):
        f = f0 * (f1 / f0) ** (i / max(nb - 1, 1))
        sos = signal.butter(2, min(f, SR * 0.45), kind, fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg = x[i * block:(i + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[i * block:i * block + len(seg)] = y
    return out


def noise(n):
    return rng.standard_normal(n)


def saw(freq, t, detune=0.0):
    ph = (freq * (1 + detune)) * t + rng.random()
    return 2 * (ph % 1) - 1


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


class Track:
    def __init__(self, dur):
        self.buf = np.zeros((2, int(dur * SR) + SR))

    def add(self, x, at, gain=1.0, pan=0.0):
        x = np.asarray(x)
        if x.ndim == 1:
            l = np.cos((pan + 1) * np.pi / 4)
            r = np.sin((pan + 1) * np.pi / 4)
            x = np.vstack([x * l * 1.414, x * r * 1.414])
        i = int(at * SR)
        if i < 0:
            x = x[:, -i:]
            i = 0
        n = min(x.shape[1], self.buf.shape[1] - i)
        if n > 0:
            self.buf[:, i:i + n] += x[:, :n] * gain


# ---------------------------------------------------------------- instruments
def kick(punch=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_ad(n, 0.001, 0.38, 3.2)
    click = hp(noise(n), 3000) * env_ad(n, 0.0005, 0.012, 5) * 0.5
    return np.tanh((body + click) * 1.6 * punch)


def snare():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 185 * t) * env_ad(n, 0.001, 0.08, 4)
    nz = bp(noise(n), 1500, 9000) * env_ad(n, 0.001, 0.2, 5)
    return np.tanh((tone * 0.6 + nz * 0.9) * 1.4)


def clap():
    n = int(0.4 * SR)
    out = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022, 0.034]):
        i = int(off * SR)
        m = n - i
        out[i:] += bp(noise(m), 900, 5000) * env_ad(m, 0.0005, 0.03 if k < 3 else 0.25, 5)
    return out * 0.8


def hat(open_=False):
    n = int((0.3 if open_ else 0.06) * SR)
    return hp(noise(n), 7000, 4) * env_ad(n, 0.0005, 0.25 if open_ else 0.035, 5) * 0.5


def bass808(freq, dur, glide_from=None):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.full(n, freq)
    if glide_from:
        f = freq + (glide_from - freq) * np.exp(-t * 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_ad(n, 0.003, dur * 1.2, 2.2)
    return np.tanh(x * 2.2) * 0.8


def pluck(freq, dur=1.2, bright=0.5, decay=0.996):
    """Karplus-Strong via lfilter (fast)."""
    n = int(dur * SR)
    N = max(2, int(SR / freq))
    exc = np.zeros(n)
    burst = lp(noise(N), 1500 + 6000 * bright)
    exc[:N] = burst
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -0.5 * decay
    a[N + 1] = -0.5 * decay
    y = signal.lfilter([1.0], a, exc)
    return norm(y, 0.6) * env_ad(n, 0.001, dur, 2)


def pad(freqs, dur, cutoff=900, detune=0.006, attack=0.6):
    t = t_axis(dur)
    x = np.zeros_like(t)
    for f in freqs:
        for d in (-detune, 0, detune):
            x += saw(f, t, d)
    x = lp(x / (3 * len(freqs)), cutoff, 2)
    n = len(t)
    e = np.clip(t / attack, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)
    return x * e


def keys(freqs, dur):
    """Soft electric-piano chord (sine + tine + tremolo)."""
    t = t_axis(dur)
    x = np.zeros_like(t)
    for f in freqs:
        x += np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)
    trem = 1 + 0.18 * np.sin(2 * np.pi * 4.5 * t)
    return x / len(freqs) * env_ad(len(t), 0.01, dur, 2.0) * trem


def braam(dur=3.0):
    t = t_axis(dur)
    x = sum(saw(midi(m), t, d) for m in (26, 38, 45, 50) for d in (-0.004, 0.004))
    x = sweep_filter(x / 8, 150, 1400, "low")
    x = np.tanh(x * 3) * env_ad(len(t), 0.02, dur, 2.4)
    sub = np.sin(2 * np.pi * midi(26) * t) * env_ad(len(t), 0.01, dur, 2)
    return x * 0.7 + sub * 0.6


# ---------------------------------------------------------------- sfx
def whoosh(dur=0.5, up=True, bright=1.0):
    n = int(dur * SR)
    x = noise(n)
    f0, f1 = (300, 6000 * bright) if up else (6000 * bright, 300)
    x = sweep_filter(x, f0, f1, "low")
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return norm(x * e, 0.8)


def impact(size=1.0):
    n = int(2.2 * size * SR)
    t = np.arange(n) / SR
    f = 32 + 90 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.002, 1.6 * size, 2.6)
    crack = lp(noise(n), 4000) * env_ad(n, 0.001, 0.25, 4)
    tail = lp(noise(n), 500) * env_ad(n, 0.01, 1.8 * size, 3) * 0.4
    return norm(np.tanh((boom * 1.4 + crack * 0.6 + tail) * 1.5), 0.95)


def stamp():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (80 + 120 * np.exp(-t * 40)) * t) * env_ad(n, 0.001, 0.18, 4)
    slap = bp(noise(n), 400, 3500) * env_ad(n, 0.0005, 0.05, 5)
    return norm(np.tanh((thud + slap) * 2), 0.9)


def pop(freq=900):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.001, 0.08, 5) * 0.6


def tick():
    """Clean tonal click (woodblock-like) - no noise component."""
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1850 * t) + 0.5 * np.sin(2 * np.pi * 2900 * t)) * np.exp(-t * 160) * 0.45


def type_burst(dur, rate=22):
    out = np.zeros(int(dur * SR) + SR // 10)
    tt = 0.0
    while tt < dur:
        i = int(tt * SR)
        k = tick() * rng.uniform(0.5, 1.0)
        out[i:i + len(k)] += k
        tt += rng.uniform(0.6, 1.4) / rate
    return out


def cash_riffle(dur=1.2):
    """Bill-counter flutter: dense filtered ticks with rising rate."""
    out = np.zeros(int(dur * SR) + SR // 10)
    tt = 0.0
    while tt < dur:
        i = int(tt * SR)
        n = int(0.012 * SR)
        k = bp(noise(n), 1800, 7000) * env_ad(n, 0.0003, 0.006, 5)
        out[i:i + n] += k * rng.uniform(0.4, 1.0)
        tt += 1 / (30 + 40 * tt / dur)
    return out * 0.9


def chaching():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    bell = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((1568, 3), (2349, 4), (3136, 5), (4699, 7)))
    clank = bp(noise(n), 2000, 9000) * env_ad(n, 0.0005, 0.05, 5)
    out = np.zeros(int(1.6 * SR))
    out[:n] += clank * 0.6
    out[int(0.09 * SR):int(0.09 * SR) + n] += bell * 0.25
    return out


def sparkle(dur=1.5):
    out = np.zeros(int(dur * SR) + SR)
    for _ in range(14):
        at = rng.uniform(0, dur)
        f = rng.choice([2093, 2349, 2637, 3136, 3520, 4186])
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        k = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) * 0.12
        i = int(at * SR)
        out[i:i + n] += k
    return out


def tape_stop(x, dur=0.55):
    """Slow a stereo/mono chunk to a halt (resample with decreasing rate)."""
    n = int(dur * SR)
    rate = np.linspace(1, 0, n) ** 1.3
    pos = np.cumsum(rate)
    pos = pos[pos < x.shape[-1] - 1]
    i0 = pos.astype(int)
    fr = pos - i0
    y = x[..., i0] * (1 - fr) + x[..., i0 + 1] * fr
    return y * np.linspace(1, 0, len(pos)) ** 0.5


def riser(dur=2.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sweep_filter(noise(n), 200, 9000, "band" if False else "low")
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / dur) ** 2) / SR) * 0.25
    e = (t / dur) ** 2
    return norm((x * 0.7 + tone) * e, 0.7)


def glitch(dur=0.25):
    n = int(dur * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        L = int(rng.uniform(0.008, 0.03) * SR)
        f = rng.uniform(150, 3000)
        t = np.arange(L) / SR
        seg = np.sign(np.sin(2 * np.pi * f * t)) * 0.3 if rng.random() < 0.5 else bp(noise(L), 800, 8000) * 0.5
        out[i:i + L] += seg[:max(0, min(L, n - i))]
        i += L
    return out


def beep(freq=1800, dur=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.clip(np.minimum(t, dur - t) / 0.004, 0, 1) * 0.35


def error_buzz(dur=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = signal.square(2 * np.pi * 110 * t) + 0.6 * signal.square(2 * np.pi * 167 * t)
    x = lp(x, 2500) * (signal.square(2 * np.pi * 9 * t) > 0)
    return x * 0.22


def scanner(dur=1.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 600 + 500 * np.sin(2 * np.pi * 1.6 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    x += bp(noise(n), 2000, 6000) * 0.05
    return x * np.clip(np.minimum(t, dur - t) / 0.05, 0, 1)


def ping():
    n = int(1.5 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 4) * 0.3


def heartbeat(bpm_from, bpm_to, dur):
    out = np.zeros(int(dur * SR) + SR)
    tt = 0.0
    while tt < dur:
        bpm = bpm_from + (bpm_to - bpm_from) * tt / dur
        for off, g in ((0, 1.0), (0.17, 0.7)):
            n = int(0.25 * SR)
            t = np.arange(n) / SR
            k = np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 30)) * t) * env_ad(n, 0.004, 0.16, 4)
            i = int((tt + off) * SR)
            out[i:i + n] += k * g
        tt += 60 / bpm
    return np.tanh(out * 1.8) * 0.9


def siren(dur=2.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 700 + 280 * np.sin(2 * np.pi * 0.9 * t)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR)
    x = lp(x, 1600)
    # far away + doppler-ish swell
    e = np.sin(np.pi * t / dur) ** 1.5
    return x * e * 0.25


def knock():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    body = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((95, 22), (180, 30), (310, 45)))
    hit = lp(noise(n), 2500) * env_ad(n, 0.0005, 0.02, 5)
    return norm(np.tanh((body * 0.8 + hit) * 2.5), 0.95)


def click():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 200) + hp(noise(n), 4000) * np.exp(-t * 300)) * 0.4


def ding():
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * g for f, d, g in ((1760, 2.5, 0.3), (2640, 3.5, 0.15), (5280, 6, 0.06)))





# ---------------------------------------------------------------- build
def build(cues):
    D = cues["duration"]
    B = cues["beats"]
    music = Track(D)
    sfx = Track(D)

    # key: D minor. chord tones (midi)
    Dm, Bb, Gm, A = (50, 53, 57), (46, 50, 53), (43, 46, 50), (45, 49, 52)
    prog = [Dm, Bb, Gm, A]
    bar = 2.55
    beat = bar / 4
    origin = 13.55

    # --- intro (0 - freeze): drone + clock + crackle + neon
    t_freeze = B["freeze"]
    drone = pad([midi(38), midi(45)], t_freeze + 0.6, cutoff=380, attack=0.05)
    intro = Track(t_freeze + 1)
    intro.add(drone, 0, 0.55)
    for i in range(int(t_freeze / beat) + 1):
        intro.add(tick() * (1.0 if i % 2 == 0 else 0.6), i * beat, 0.5, pan=-0.3)
    intro.add(bass808(midi(26), 2.5), 0.0, 0.7)
    intro.add(bass808(midi(26), 1.8), B["cash"] - 0.02, 0.5)
    # "rich" section: warm keys + light groove from 8.0
    rich0 = cues["scenes"]["rich"][0] + 0.05
    for k, ch in enumerate([(53, 57, 60, 64), (46, 50, 53, 57)]):
        intro.add(keys([midi(m) for m in ch], bar), rich0 + k * bar * 0.75, 0.32)
    for i in range(6):
        at = rich0 + i * beat
        if at < t_freeze:
            intro.add(kick(0.7), at, 0.45) if i % 2 == 0 else intro.add(hat(), at, 0.35)
            intro.add(hat(), at + beat / 2, 0.25)
    # tape-stop the whole intro bed at freeze
    ib = intro.buf
    cut = int(t_freeze * SR)
    music.add(ib[:, :cut], 0)
    music.add(tape_stop(ib[:, cut:cut + int(1.2 * SR)]), t_freeze)
    music.add(pad([midi(26), midi(38)], 1.8, cutoff=200, attack=0.4), t_freeze + 0.1, 0.35)

    # --- title: braam + riser into problem one
    music.add(braam(3.2), B["worse"], 0.75)
    music.add(riser(1.6), B["p1Label"] - 1.6, 0.35)

    # --- main beat: 16.1 -> 46.75
    beat_start, beat_end = cues["scenes"]["weight"][0] + 0.1, cues["scenes"]["door"][0]
    tense_from = cues["scenes"]["nerves"][0]
    nbars = int(np.ceil((beat_end - beat_start) / bar))
    for b in range(nbars):
        t0 = beat_start + b * bar
        ch = prog[b % 4]
        tense = t0 >= tense_from - 0.01
        ln = min(bar, beat_end - t0)
        if ln <= 0:
            break
        music.add(pad([midi(m) for m in ch], ln + 0.3, cutoff=700 if not tense else 1100, attack=0.3), t0, 0.32)
        # 808 on root
        root = midi(ch[0] - 24)
        music.add(bass808(root, beat * 2.6, glide_from=root * 1.5 if b % 4 == 3 else None), t0, 0.75)
        if not tense:
            music.add(bass808(root, beat * 1.2), t0 + beat * 2.5, 0.6)
        # drums
        for s in range(16):
            at = t0 + s * beat / 4
            if at >= beat_end:
                break
            if s in ((0, 7, 10) if not tense else (0, 10)):
                music.add(kick(), at, 0.8)
            if s in (8,):
                music.add(clap(), at, 0.55)
                music.add(snare(), at, 0.35)
            hat_on = s % 2 == 0 or (b % 2 == 1 and s >= 12)
            if hat_on and not (tense and s % 4 != 0):
                music.add(hat(), at, 0.32 if s % 4 else 0.42, pan=0.25)
        # dark pluck melody (not in tense part)
        mel = [ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[0] + 12]
        if not tense:
            for k, m in enumerate(mel):
                music.add(pluck(midi(m), 0.9, 0.4), t0 + k * beat / 2, 0.22, pan=-0.35 + 0.1 * (k % 3))
        else:
            # tremolo strings
            t = t_axis(ln)
            x = sum(saw(midi(m + 12), t, d) for m in ch for d in (-0.003, 0.003))
            x = lp(x / 6, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * np.clip(t / 0.2, 0, 1)
            music.add(x, t0, 0.12, pan=0.2)
    # fills on section changes
    for at in (cues["scenes"]["serial"][0], tense_from):
        music.add(impact(0.6), at, 0.35)

    # --- door: music gone, only low drone
    door0 = beat_end
    music.add(pad([midi(26)], cues["scenes"]["end"][0] - door0, cutoff=160, attack=1.0), door0, 0.5)

    # --- end card: Dm pad + slow pluck motif, fade out
    end0 = B["ep2"] - 0.05
    music.add(pad([midi(50), midi(53), midi(57)], D - end0, cutoff=800, attack=0.2) * np.clip((D - end0 - t_axis(D - end0)) / 1.5, 0, 1), end0, 0.35)
    music.add(bass808(midi(26), 3.0), end0, 0.7)
    for k, m in enumerate([62, 65, 69, 67, 65, 62, 64, 61]):
        music.add(pluck(midi(m), 1.6, 0.35), end0 + 0.4 + k * 0.62, 0.2, pan=0.3 * np.sin(k))
    music.add(kick(0.8), end0, 0.6)

    # ================= SFX =================
    S = sfx.add
    S(impact(0.8), 0.02, 0.55)
    S(cash_riffle(1.2), B["tenMillion"], 0.45)
    S(stamp(), B["cash"], 0.7)
    S(whoosh(0.45), B["bags"] - 0.25, 0.35)
    for k in range(4):
        S(pop(700 + 120 * k), B["fourBags"] + k * 0.13, 0.55, pan=-0.4 + 0.27 * k)
    S(whoosh(0.4, bright=1.3), cues["scenes"]["rich"][0] - 0.25, 0.5)
    S(sparkle(2.0), cues["scenes"]["rich"][0] + 0.1, 0.8)
    S(cash_riffle(2.6) * 0.4, cues["scenes"]["rich"][0] + 0.2, 0.4, pan=0.2)
    S(chaching(), B["lifeIsGood"], 0.55)
    S(glitch(0.2), B["freeze"] - 0.02, 0.35)
    S(impact(1.2), B["worse"], 0.75)
    S(glitch(0.3), B["worse"], 0.35)
    S(type_burst(0.9), B["worse"] + 0.3, 0.35)
    S(whoosh(0.5), cues["scenes"]["weight"][0] - 0.2, 0.45)
    S(type_burst(0.8), B["p1Label"] + 0.05, 0.35)
    S(stamp(), B["p1Word"], 0.6)
    S(pop(1100), B["gridStart"], 0.45)
    for k in range(26):
        S(tick(), B["gridStart"] + 0.15 + k * 0.065, 0.35)
    S(cash_riffle(B["countEnd"] - B["countStart"]), B["countStart"], 0.5)
    S(whoosh(0.35, up=False), B["kg"], 0.5)
    S(impact(0.9), B["kgLand"], 0.8)
    S(stamp(), B["kgLand"], 0.5)
    S(whoosh(0.45), cues["scenes"]["stairs"][0] - 0.2, 0.45)
    for k in range(3):
        S(beep(980, 0.12), B["stairsFail"] + k * 0.28, 0.55)
    S(glitch(0.28), cues["scenes"]["serial"][0], 0.45)
    S(type_burst(0.8), B["p2Label"] + 0.05, 0.35)
    S(stamp(), B["p2Word"], 0.6)
    S(scanner(1.5), B["scanStart"], 0.55)
    S(beep(2200, 0.07), B["serialLock"], 0.6)
    S(beep(2200, 0.07), B["serialLock"] + 0.12, 0.6)
    S(type_burst(1.1, 30), B["dbStart"], 0.4)
    S(impact(0.7), B["marked"], 0.6)
    S(stamp(), B["marked"], 0.9)
    S(whoosh(0.45, bright=1.4), cues["scenes"]["register"][0] - 0.2, 0.5)
    S(scanner(0.8), B["registerScan"], 0.5)
    S(error_buzz(0.55), B["registerAlert"], 0.6)
    S(impact(0.8), B["hunted"], 0.6)
    for k in range(3):
        S(ping(), B["hunted"] + 0.2 + k * 0.42, 0.4)
    S(impact(1.0), cues["scenes"]["nerves"][0], 0.65)
    S(stamp(), B["p3Label"] + 0.05, 0.5)
    S(impact(0.5), B["youself"], 0.45)
    S(heartbeat(68, 118, B["knocks"][0] - B["noSleep"]), B["noSleep"], 0.55)
    S(siren(2.8), B["siren"], 0.7, pan=-0.5)
    S(whoosh(0.25, bright=1.5), B["flinch"], 0.55)
    S(knock(), B["knocks"][0], 1.0)
    S(knock(), B["knocks"][1], 0.9)
    S(knock(), B["knocks"][2], 1.0)
    S(impact(1.3), B["cut"], 0.6)
    S(riser(1.2), B["ep2"] - 1.2, 0.35)
    S(impact(0.9), B["ep2"], 0.6)
    S(click(), B["follow"], 0.8)
    S(ding(), B["follow"] + 0.25, 0.6)
    S(glitch(0.35), B["out"], 0.4)
    return music, sfx


def write_wav(path, buf, dur):
    x = buf[:, :int(dur * SR)]
    x = np.clip(x, -1, 1)
    pcm = (x.T * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    cues = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    music, sfx = build(cues)
    D = cues["duration"]
    write_wav(f"{out}/music.wav", norm(music.buf, 0.89), D)
    write_wav(f"{out}/sfx.wav", norm(sfx.buf, 0.89), D)
    print("ok")
