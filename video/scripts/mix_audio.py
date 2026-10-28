"""Synthesize SFX + music bed and mix them with the voiceover into soundtrack.wav.

Everything except the voice is generated here from scratch (no samples), so the
whole soundtrack is free to use. SFX hit times come from src/timeline.json.

usage: python3 -I scripts/mix_audio.py public/audio/vo.wav
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)
TL = json.load(open("src/timeline.json"))
FPS = TL["fps"]
DUR = TL["total"] / FPS


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a, d, curve=4.0):
    """Attack (s) then exponential-ish decay over the rest of n samples."""
    x = np.ones(n)
    na = max(1, int(a * SR))
    x[:na] = np.linspace(0, 1, na)
    rest = n - na
    if rest > 0:
        x[na:] = np.exp(-curve * np.linspace(0, 1, rest) * (d if d else 1))
    return x


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be an array for sweeps."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def norm(x, peak=0.9):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


# ---------------- SFX ----------------

def whoosh(length=0.55):
    n = int(length * SR)
    noise = rng.standard_normal(n)
    sweep = np.geomspace(300, 6000, n // 2)
    sweep = np.concatenate([sweep, sweep[::-1]])[:n]
    if len(sweep) < n:
        sweep = np.pad(sweep, (0, n - len(sweep)), mode="edge")
    body = highpass(lowpass(noise, sweep), 200)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2.2
    # peak lands at the middle of the sound (the cut)
    return norm(body * shape, 0.8)


def swoosh():
    return whoosh(0.32)


def riser(length=1.0):
    n = int(length * SR)
    x = t(length)
    noise = lowpass(rng.standard_normal(n), np.geomspace(400, 9000, n))
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(180, 900, n)) / SR) * 0.3
    shape = np.linspace(0, 1, n) ** 2.5
    return norm((noise + tone) * shape, 0.7)


def impact():
    length = 1.3
    n = int(length * SR)
    x = t(length)
    f = 38 + 70 * np.exp(-x * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3.2)
    click = lowpass(rng.standard_normal(n), 2500) * np.exp(-x * 40) * 0.9
    tail = lowpass(rng.standard_normal(n), 900) * np.exp(-x * 5) * 0.25
    return norm(np.tanh(1.8 * (sub + click + tail)), 0.95)


def pop():
    length = 0.18
    x = t(length)
    f = 900 * np.exp(-x * 25) + 320
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 30)
    click = rng.standard_normal(len(x)) * np.exp(-x * 400) * 0.3
    return norm(s + click, 0.8)


def bell(freqs, length=1.4, decay=3.0):
    x = t(length)
    out = np.zeros_like(x)
    for i, f in enumerate(freqs):
        for k, (ratio, amp) in enumerate([(1, 1), (2.01, 0.45), (3.98, 0.2), (5.4, 0.12)]):
            out += amp * np.sin(2 * np.pi * f * ratio * x) * np.exp(-x * decay * (1 + k * 0.6))
    out *= np.minimum(1, x / 0.004)
    return norm(out, 0.7)


def ding():
    return bell([1318.5], 1.2, 3.5)


def shine():
    # quick upward sparkle arpeggio
    notes = [1760, 2217, 2637, 3520]
    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate(notes):
        b = bell([f], 0.9, 5) * (0.8 - i * 0.1)
        o = int(i * 0.055 * SR)
        out[o:o + len(b)] += b[: len(out) - o]
    shimmer = highpass(rng.standard_normal(len(out)), 6000) * env(len(out), 0.05, 1, 5) * 0.12
    return norm(out + shimmer, 0.6)


def tick():
    length = 0.04
    x = t(length)
    return norm(np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 160), 0.6)


def click():
    length = 0.12
    x = t(length)
    a = np.sin(2 * np.pi * 1700 * x) * np.exp(-x * 90)
    b = highpass(rng.standard_normal(len(x)), 3000) * np.exp(-x * 220) * 0.6
    return norm(a + b, 0.85)


def printer():
    # receipt printer: buzzy motor bursts
    length = 0.6
    x = t(length)
    motor = np.sign(np.sin(2 * np.pi * 95 * x)) * 0.4 + lowpass(rng.standard_normal(len(x)), 3000) * 0.8
    gate = (np.sin(2 * np.pi * 26 * x) > -0.2).astype(float)
    return norm(highpass(motor * gate, 300) * env(len(x), 0.01, 1, 1.5), 0.55)


def cash():
    # "cha-ching": metallic hit followed by a bright bell
    hit = highpass(rng.standard_normal(int(0.15 * SR)), 2500) * np.exp(-t(0.15) * 35)
    b = bell([2093, 2637], 1.3, 2.6)
    out = np.zeros(int(1.4 * SR))
    out[: len(hit)] += hit * 0.8
    o = int(0.11 * SR)
    out[o:o + len(b)] += b[: len(out) - o]
    return norm(out, 0.8)


def drop():
    length = 0.5
    x = t(length)
    f = 700 * np.exp(-x * 9) + 90
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.005, 1, 6)
    return norm(s, 0.75)


SFX = {
    "whoosh": whoosh,
    "swoosh": swoosh,
    "riser": riser,
    "impact": impact,
    "pop": pop,
    "ding": ding,
    "shine": shine,
    "tick": tick,
    "click": click,
    "print": printer,
    "cash": cash,
    "drop": drop,
}
# Sounds whose loudest moment is in the middle are placed so that moment hits the cue.
CENTERED = {"whoosh": 0.5, "swoosh": 0.5}


# ---------------- Music ----------------

BPM = 116
BEAT = 60 / BPM


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def music(total):
    n = int(total * SR)
    out = np.zeros((n, 2))

    def put(sig, at, pan=0.0, gain=1.0):
        i = int(at * SR)
        if i >= n:
            return
        sig = sig[: n - i]
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        out[i:i + len(sig), 0] += sig * gain * l
        out[i:i + len(sig), 1] += sig * gain * r

    x = t(0.45)
    kick = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-x * 30)) / SR) * np.exp(-x * 7)
    kick = np.tanh(kick * 2.2) * 0.9
    clap_n = int(0.25 * SR)
    clap = highpass(lowpass(rng.standard_normal(clap_n), 5000), 900)
    clap *= np.exp(-t(0.25) * 22) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t(0.25)) > 0))
    hat = highpass(rng.standard_normal(int(0.06 * SR)), 8000) * np.exp(-t(0.06) * 90)

    # vi–IV–I–V in A major: F#m, D, A, E
    prog = [[54, 57, 61], [50, 54, 57], [45, 49, 52], [52, 56, 59]]
    roots = [42, 38, 45, 40]

    plucks = {}

    def pluck(midi, length):
        if (midi, length) in plucks:
            return plucks[(midi, length)]
        xx = t(length)
        f = note(midi)
        saw = 2 * ((f * xx) % 1) - 1
        saw2 = 2 * ((f * 1.006 * xx) % 1) - 1
        cut = 500 + 3500 * np.exp(-xx * 9)
        plucks[(midi, length)] = lowpass((saw + saw2) * 0.5, cut) * np.exp(-xx * 3.5)
        return plucks[(midi, length)]

    def bass(midi, length):
        xx = t(length)
        f = note(midi)
        s = np.sin(2 * np.pi * f * xx) + 0.3 * np.sin(4 * np.pi * f * xx)
        return s * np.minimum(1, xx / 0.01) * np.exp(-xx * 2.2)

    def pad(chord, length):
        xx = t(length)
        s = sum(np.sin(2 * np.pi * note(m + 12) * xx + k) for k, m in enumerate(chord))
        return s * np.minimum(1, xx / 0.4) * np.minimum(1, (length - xx) / 0.4) / 3

    beats = int(total / BEAT) + 1
    for b in range(beats):
        at = b * BEAT
        bar = b // 4
        chord = prog[bar % 4]
        intro = at < 0.6  # let the intro riser/impact breathe
        if not intro:
            put(kick, at, 0, 0.85)
            if b % 2 == 1:
                put(clap, at, 0.0, 0.32)
            put(hat, at + BEAT / 2, 0.35, 0.22)
            put(hat, at + BEAT * 0.75, -0.35, 0.1)
        if b % 4 == 0:
            put(pad(chord, BEAT * 4), at, 0, 0.12)
        # eighth-note bass, root on the beat and octave on the off-beat
        put(bass(roots[bar % 4], BEAT * 0.48), at, 0, 0.38)
        put(bass(roots[bar % 4] + 12, BEAT * 0.45), at + BEAT / 2, 0, 0.2)
        # syncopated chord stabs
        for off in (0.5, 1.5) if b % 2 == 0 else (0.75,):
            for k, m in enumerate(chord):
                put(pluck(m + 12, BEAT * 0.9), at + off * BEAT, -0.4 + 0.4 * k, 0.09)

    # gentle fade out over the end card
    fade = np.ones(n)
    fl = int(1.4 * SR)
    fade[-fl:] = np.linspace(1, 0, fl)
    return out * fade[:, None]


# ---------------- Mix ----------------

def read_wav(path):
    w = wave.open(path)
    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    a = a.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        idx = np.arange(int(len(a) * SR / sr)) * sr / SR
        a = np.interp(idx, np.arange(len(a)), a)
    return a


def main():
    total = DUR
    n = int(total * SR)
    vo = np.zeros(n)
    v = read_wav(sys.argv[1])
    o = int(TL["voOffset"] * SR)
    vo[o:o + len(v)] = v[: n - o]
    # presence: light high-shelf by mixing in a high-passed copy, then normalise
    vo = norm(vo + 0.25 * highpass(vo, 3500), 0.95)

    mus = music(total)
    # duck the bed under the voice (envelope follower on the VO)
    level = np.abs(vo)
    k = int(0.12 * SR)
    level = np.convolve(level, np.ones(k) / k, mode="same")
    duck = 1 - 0.55 * np.clip(level / 0.12, 0, 1)
    mus = mus * duck[:, None]
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * 0.42

    sfx = np.zeros((n, 2))
    cache = {}
    for ev in TL["sfx"]:
        name = ev["name"]
        if name not in cache:
            cache[name] = SFX[name]()
        s = np.asarray(cache[name], dtype=np.float64)
        at = ev["t"] / FPS - CENTERED.get(name, 0) * len(s) / SR
        i = max(0, int(at * SR))
        s = s[: max(0, n - i)] * ev["gain"]
        pan = 0.25 * np.sin(ev["t"])  # slight stereo spread
        sfx[i:i + len(s), 0] += s * (1 - pan)
        sfx[i:i + len(s), 1] += s * (1 + pan)

    mix = mus + sfx * 0.55 + vo[:, None] * 1.0
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # soft limiter
    mix = mix / np.max(np.abs(mix)) * 0.97
    pcm = (mix * 32767).astype(np.int16)
    w = wave.open("public/audio/soundtrack.wav", "w")
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
    w.close()
    print(f"soundtrack.wav {total:.2f}s, {len(TL['sfx'])} sfx cues")


main()
