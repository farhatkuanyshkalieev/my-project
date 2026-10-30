"""Episode 01 sound: voice processing, lip-sync envelopes, synthesized SFX, original score, final mix.

Everything except the dialogue is synthesized here (no third-party samples), so the score and effects are
original and free to publish.  Outputs:
  voices/processed/<LINE>.wav       processed dialogue (48 kHz mono)
  compositions/lipsync.json         per-line mouth envelopes at 60 fps
  sound_effects/*.wav               every synthesized effect (for reuse in later episodes)
  music/ep01_score.wav              score stem
  renders/ep01_mix.wav              final stereo mix (48 kHz) before loudness normalisation
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as T  # noqa: E402

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = lambda *a: os.path.join(ROOT, *a)  # noqa: E731
rng = np.random.default_rng(1701)
N = int(T.DURATION * SR)


# ============================================================================ io / dsp helpers
def load_mp3(path):
    pcm = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32).astype(np.float64)


def ff_filter(x, af):
    """Run a mono float signal through an ffmpeg audio filter chain."""
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f64le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", af,
                        "-f", "f64le", "-ar", str(SR), "-ac", "1", "-"], input=x.astype(np.float64).tobytes(),
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float64).copy()


def write_wav(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.asarray(x, np.float32)
    ch = 1 if x.ndim == 1 else x.shape[1]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-",
                    "-c:a", "pcm_s24le", path], input=x.tobytes(), check=True)


def sos(kind, f, order=4):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def filt(x, kind, f, order=4):
    return signal.sosfilt(sos(kind, f, order), x)


def env_adsr(n, a=0.005, d=0.1, s=0.0, r=0.05, sus_len=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    sus_n = max(0, n - a_n - d_n - r_n) if sus_len is None else int(sus_len * SR)
    e = np.concatenate([np.linspace(0, 1, a_n, False), np.linspace(1, s, d_n, False), np.full(sus_n, s),
                        np.linspace(s, 0, r_n)])
    out = np.zeros(n)
    out[:min(n, len(e))] = e[:n]
    return out


def expdec(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def t_(n):
    return np.arange(n) / SR


def db(x):
    return 10 ** (x / 20)


def make_ir(rt=1.2, pre=0.01, bright=6000, seed=0, stereo=True):
    r = np.random.default_rng(seed)
    n = int(rt * SR)
    chans = []
    for ch in range(2 if stereo else 1):
        e = r.standard_normal(n) * np.exp(-np.arange(n) / SR / (rt / 6.9))
        e = filt(e, "low", bright, 2)
        e[: int(pre * SR)] = 0
        for k in range(6):  # early reflections
            i = int((pre + 0.004 + r.random() * 0.03) * SR)
            e[i] += (0.6 - k * 0.08) * (1 if r.random() > 0.5 else -1)
        chans.append(e / np.sqrt(np.sum(e ** 2)))
    return np.stack(chans, 1) if stereo else chans[0]


IR_ROOM = make_ir(0.45, 0.004, 5000, 1)
IR_HALL = make_ir(1.6, 0.02, 4000, 2)
IR_BIG = make_ir(3.8, 0.03, 3500, 3)


def reverb(x, ir, wet=0.25):
    """mono x -> stereo (dry centre + wet stereo)."""
    w = np.stack([signal.fftconvolve(x, ir[:, 0])[: len(x)], signal.fftconvolve(x, ir[:, 1])[: len(x)]], 1)
    return np.stack([x, x], 1) * (1 - wet * 0.3) + w * wet


def pan(x, p=0.0):
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1) if x.ndim == 1 else x


class Bus:
    def __init__(self):
        self.x = np.zeros((N + SR * 4, 2))

    def add(self, t, sig, gain_db=0.0, p=0.0):
        if sig.ndim == 1:
            sig = pan(sig, p)
        i = int(round(t * SR))
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(len(self.x), i + len(sig))
        self.x[i:j] += sig[: j - i] * db(gain_db)

    def out(self):
        return self.x[:N]


# ============================================================================ dialogue
def process_voices():
    os.makedirs(P("voices", "processed"), exist_ok=True)
    qc = json.load(open(P("voices", "qc_report.json")))
    clips, lips = {}, {}
    for lid, take in T.TAKES.items():
        x = load_mp3(P("voices", "raw", take + ".mp3"))
        on, off = qc[take]["onset"], qc[take]["offset"]
        a, b = max(0, int((on - 0.06) * SR)), min(len(x), int((off + 0.22) * SR))
        x = x[a:b]
        x *= np.concatenate([np.linspace(0, 1, int(0.01 * SR)), np.ones(len(x) - int(0.03 * SR)),
                             np.linspace(1, 0, int(0.02 * SR))])[: len(x)]
        fx = T.LINES[lid]["fx"]
        base = "highpass=f=75,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=2"
        if fx == "phone":
            x = ff_filter(x, base + ",highpass=f=320,lowpass=f=3300,equalizer=f=1700:t=q:w=1.2:g=5,"
                                   "acrusher=bits=11:mix=0.25,volume=0.9")
        elif fx.startswith("double"):
            x = ff_filter(x, base + ",rubberband=pitch=0.928:formant=preserved,equalizer=f=180:t=q:w=1:g=2.5,"
                                   "equalizer=f=4200:t=q:w=1:g=-3")
        else:
            x = ff_filter(x, base)
        x = x / (np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) + 1e-9) * db(-19)  # speech RMS ~ -19 dBFS
        if fx == "whisper":
            x *= db(-3)
        clips[lid] = x
        write_wav(P("voices", "processed", lid + ".wav"), x)
        # lip-sync envelope (60 fps), aligned so that index 0 = clip start (= onset - 0.06 s)
        hop = SR // 60
        fr = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
        fr = fr / (np.percentile(fr, 92) + 1e-9)
        fr = np.clip(fr, 0, 1.2) ** 0.75
        sm = np.zeros_like(fr)
        for i in range(len(fr)):  # fast attack, slower release
            prev = sm[i - 1] if i else 0
            k = 0.65 if fr[i] > prev else 0.3
            sm[i] = prev + (fr[i] - prev) * k
        sm[sm < 0.08] = 0
        lips[lid] = dict(start=round(T.LINES[lid]["t"] - 0.06, 4), who=T.LINES[lid]["who"],
                         env=[round(float(v), 3) for v in sm])
    json.dump(lips, open(P("compositions", "lipsync.json"), "w"))
    return clips


# ============================================================================ SFX synthesis
def sfx_ping():
    out = np.zeros(int(0.9 * SR))
    for k, (f, dt) in enumerate([(1318.5, 0.0), (1975.5, 0.09)]):
        n = len(out) - int(dt * SR)
        tt = t_(n)
        tone = sum(a * np.sin(2 * np.pi * f * m * tt) * expdec(n, 0.28 / m ** 0.7) for m, a in [(1, 1), (2.76, 0.28), (5.4, 0.08)])
        out[int(dt * SR):] += tone * env_adsr(n, 0.002, 0.0, 1, 0.01)
    return out * 0.5


def sfx_vibe(dur=0.55, table=True):
    n = int(dur * SR)
    tt = t_(n)
    motor = np.tanh(4 * np.sin(2 * np.pi * 172 * tt + 0.3 * np.sin(2 * np.pi * 23 * tt)))
    rattle = filt(rng.standard_normal(n), "band", [180, 900], 2) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 86 * tt)))
    e = env_adsr(n, 0.02, 0.0, 1, 0.04)
    x = (motor * 0.5 + (rattle * 0.6 if table else 0)) * e
    return filt(x, "low", 2500, 2) * 0.55


def marimba(f, dur=0.5):
    n = int(dur * SR)
    tt = t_(n)
    x = np.sin(2 * np.pi * f * tt) * expdec(n, 0.25) + 0.35 * np.sin(2 * np.pi * f * 3.93 * tt) * expdec(n, 0.05) \
        + 0.12 * np.sin(2 * np.pi * f * 9.2 * tt) * expdec(n, 0.015)
    return x * env_adsr(n, 0.002, 0, 1, 0.02)


def sfx_ringtone(dur):
    """Original 8-note marimba ringtone loop through a phone speaker, with vibration."""
    notes = [659.3, 784.0, 987.8, 880.0, 784.0, 659.3, 587.3, 659.3]
    n = int(dur * SR)
    x = np.zeros(n + SR)
    cycle = 2.2
    t0 = 0.0
    while t0 < dur:
        for k, f in enumerate(notes):
            i = int((t0 + k * 0.15) * SR)
            if i < n:
                m = marimba(f, 0.5)
                x[i:i + len(m)] += m[: len(x) - i]
        t0 += cycle
    x = x[:n]
    x = filt(filt(x, "high", 550, 2), "low", 6500, 2)
    x = np.tanh(x * 1.6) * 0.45
    v = np.zeros(n)
    t0 = 0.0
    while t0 < dur:
        b = sfx_vibe(0.9, table=False)
        i = int(t0 * SR)
        v[i:i + len(b)] += b[: n - i] * 0.6
        t0 += cycle
    return x + v


def sfx_glitch(dur=0.9):
    n = int(dur * SR)
    x = np.zeros(n)
    pos = 0
    r = np.random.default_rng(5)
    while pos < n:
        ln = int(r.uniform(0.012, 0.06) * SR)
        kind = r.integers(0, 4)
        tt = t_(ln)
        if kind == 0:
            seg = r.standard_normal(ln)
        elif kind == 1:
            seg = np.sign(np.sin(2 * np.pi * r.uniform(200, 2400) * tt))
        elif kind == 2:
            seg = np.sin(2 * np.pi * np.cumsum(np.linspace(r.uniform(100, 3000), r.uniform(50, 800), ln)) / SR)
        else:
            seg = np.zeros(ln)
        seg = np.round(seg * 6) / 6  # bitcrush
        x[pos:pos + ln] = seg[: n - pos] * r.uniform(0.3, 1.0)
        pos += ln
    hold = np.repeat(x[::6], 6)[:n]  # sample-rate reduction
    x = (0.6 * hold + 0.4 * x) * env_adsr(n, 0.005, 0, 1, 0.08)
    # tape-stop tone + sub thump at the end
    m = int(0.5 * SR)
    f = np.linspace(420, 30, m)
    stop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.linspace(1, 0, m) ** 1.5
    thump = np.sin(2 * np.pi * 52 * t_(m)) * expdec(m, 0.18)
    tail = np.zeros(n + m)
    tail[:n] = x * 0.55
    tail[n - int(0.15 * SR): n - int(0.15 * SR) + m] += stop * 0.5 + thump * 0.9
    return tail


def sfx_reverse_swell(dur=1.2):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    x = filt(x, "band", [300, 3000], 2) * np.linspace(0, 1, n) ** 3
    return x * 0.5


def sfx_clink():
    n = int(0.6 * SR)
    tt = t_(n)
    x = sum(a * np.sin(2 * np.pi * f * tt) * expdec(n, d) for f, a, d in
            [(2350, 0.5, 0.12), (3870, 0.35, 0.08), (5610, 0.2, 0.05), (7130, 0.1, 0.03)])
    thud = filt(rng.standard_normal(n), "low", 300, 2) * expdec(n, 0.03) * 2.0
    return (x + thud) * 0.35


def sfx_creak(dur=0.45, f0=380):
    n = int(dur * SR)
    tt = t_(n)
    jitter = np.cumsum(rng.standard_normal(n)) * 0.002
    fr = f0 * (1 + 0.15 * np.sin(2 * np.pi * 3 * tt) + jitter)
    pulses = (np.sin(2 * np.pi * np.cumsum(fr / 6) / SR) > 0.97).astype(float)
    x = signal.lfilter([1], [1, -1.6 * np.cos(2 * np.pi * f0 * 2 / SR), 0.81], pulses)
    x = filt(x, "band", [250, 3000], 2)
    return x / (np.abs(x).max() + 1e-9) * env_adsr(n, 0.05, 0, 1, 0.12) * 0.25


def sfx_cloth(dur=0.5):
    n = int(dur * SR)
    x = filt(rng.standard_normal(n), "band", [900, 6000], 2) * env_adsr(n, 0.12, 0, 1, 0.25) * (0.6 + 0.4 * rng.random(n))
    return x * 0.12


def sfx_tap(level=1.0):
    n = int(0.06 * SR)
    x = filt(rng.standard_normal(n), "high", 2500, 2) * expdec(n, 0.004)
    hap = np.sin(2 * np.pi * 140 * t_(n)) * expdec(n, 0.012)
    return (x * 0.5 + hap * 0.35) * level


def sfx_swoosh(dur=0.3, up=True):
    """Noise through a swept one-pole band (no block artefacts)."""
    n = int(dur * SR)
    x = rng.standard_normal(n)
    u = np.linspace(0, 1, n)
    fc = 500 + 4500 * (u if up else 1 - u)
    a = np.exp(-2 * np.pi * fc / SR)
    lp = np.zeros(n)
    hp_state = 0.0
    y = 0.0
    for i in range(n):
        y = (1 - a[i]) * x[i] + a[i] * y
        lp[i] = y
    band = filt(lp, "high", 250, 2)
    return band * env_adsr(n, dur * 0.4, 0, 1, dur * 0.5) * 0.9


def sfx_pop():
    n = int(0.12 * SR)
    f = np.linspace(700, 1250, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(n, 0.03) * 0.35


def sfx_call_end():
    x = np.zeros(int(1.0 * SR))
    for k in range(3):
        n = int(0.14 * SR)
        i = int(k * 0.26 * SR)
        x[i:i + n] += np.sin(2 * np.pi * 425 * t_(n)) * env_adsr(n, 0.005, 0, 1, 0.01)
    return filt(x, "band", [300, 3400], 2) * 0.25


def sfx_tick(tock=False):
    n = int(0.03 * SR)
    x = filt(rng.standard_normal(n), "band", [1800, 4200] if not tock else [1300, 3000], 2) * expdec(n, 0.003)
    return x * 0.5


def sfx_heartbeat():
    n = int(0.9 * SR)
    x = np.zeros(n)
    for dt, a in ((0.0, 1.0), (0.22, 0.7)):
        m = int(0.18 * SR)
        f = np.linspace(70, 38, m)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(m, 0.05) * a
        i = int(dt * SR)
        x[i:i + m] += b
    return x * 0.9


def sfx_boom(dur=3.0):
    n = int(dur * SR)
    f = 46 * np.exp(-t_(n) * 0.25)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(n, 0.9)
    x += filt(rng.standard_normal(n), "low", 180, 2) * expdec(n, 0.12) * 1.5
    return x * 0.8


def sfx_footstep():
    n = int(0.35 * SR)
    x = filt(rng.standard_normal(n), "low", 400, 2) * expdec(n, 0.03) * 2
    x += sfx_creak(0.35, 520)[:n] * 0.6
    return x * 0.5


def sfx_whoosh(dur=0.45):
    return sfx_swoosh(dur, up=True) * 1.4


def lamp_buzz(t0, t1, flick):
    n = int((t1 - t0) * SR)
    tt = t_(n)
    hum = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(100, 1), (200, 0.5), (300, 0.3), (500, 0.15)])
    crackle = filt(rng.standard_normal(n), "high", 3000, 2) * (rng.random(n) > 0.995)
    fk = np.array([flick(t0 + i / SR) for i in range(0, n, 240)])
    fk = np.repeat(fk, 240)[:n]
    dfk = np.abs(np.gradient(fk)) * SR / 240
    return (hum * 0.08 * (0.3 + dfk.clip(0, 3)) + crackle * 0.5 * (dfk > 0.5)) * 0.6


def room_tone(n):
    b = np.cumsum(rng.standard_normal(n))
    b = filt(b - np.convolve(b, np.ones(4801) / 4801, "same"), "low", 280, 2)
    b /= np.abs(b).max() + 1e-9
    hum = sum(a * np.sin(2 * np.pi * f * t_(n)) for f, a in [(50, 1), (100, 0.4), (150, 0.15)])
    return b * 0.05 + hum * 0.004


# ============================================================================ score (original)
A4 = 440.0


def nf(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    return A4 * 2 ** ((names[name[:-1]] + 12 * (int(name[-1]) - 4)) / 12)


def pad(freqs, dur, att=1.5, rel=2.0, bright=1800):
    n = int(dur * SR)
    tt = t_(n)
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            ph = rng.random() * 6.28
            x += sum((1 / h) * np.sin(2 * np.pi * ff * h * tt + ph * h) for h in range(1, 7)) / 3
    x = filt(x, "low", bright, 2)
    return x / (np.abs(x).max() + 1e-9) * env_adsr(n, att, 0, 1, rel)


def piano(f, dur=3.0, vel=1.0):
    n = int(dur * SR)
    tt = t_(n)
    B = 0.0004
    x = sum((0.8 ** (h - 1)) * np.sin(2 * np.pi * f * h * np.sqrt(1 + B * h * h) * tt) * expdec(n, 1.6 / h ** 0.6)
            for h in range(1, 9))
    ham = filt(rng.standard_normal(n), "band", [800, 5000], 2) * expdec(n, 0.006) * 0.3
    return (x * 0.35 + ham) * vel * env_adsr(n, 0.003, 0, 1, 0.3)


def musicbox(f, dur=2.0):
    n = int(dur * SR)
    tt = t_(n)
    return (np.sin(2 * np.pi * f * tt) * expdec(n, 0.7) + 0.3 * np.sin(2 * np.pi * f * 4.1 * tt) * expdec(n, 0.12)) * 0.4


def sub_pulse(f, dur):
    n = int(dur * SR)
    tt = t_(n)
    x = np.sin(2 * np.pi * f * tt) + 0.3 * np.tanh(3 * np.sin(2 * np.pi * f * tt))
    return filt(x, "low", 400, 2) * expdec(n, 0.18) * env_adsr(n, 0.004, 0, 1, 0.05)


def drone(f, dur, lfo=0.1):
    n = int(dur * SR)
    tt = t_(n)
    x = np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.5 * tt + 1) + 0.25 * np.sin(2 * np.pi * f * 2.01 * tt)
    return x * (0.75 + 0.25 * np.sin(2 * np.pi * lfo * tt)) * env_adsr(n, 2.0, 0, 1, 2.0) * 0.4


def harmonic(f, dur):
    n = int(dur * SR)
    tt = t_(n)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * tt)
    return np.sin(2 * np.pi * f * np.cumsum(vib) / SR) * env_adsr(n, dur * 0.6, 0, 1, dur * 0.35) * 0.25


def cluster(dur):
    n = int(dur * SR)
    tt = t_(n)
    fs = [nf(x) for x in ("A2", "A#2", "E3", "F3", "B3", "C4", "F#4", "G4")]
    x = sum(np.sin(2 * np.pi * f * tt * (1 + 0.002 * np.sin(2 * np.pi * (0.3 + i * 0.07) * tt))) for i, f in enumerate(fs))
    return x / len(fs) * np.linspace(0, 1, n) ** 2.2


def build_score():
    mus = Bus()
    E = T.EV
    # --- cue 1: cozy-uneasy (0 - ring)
    mus.add(0.5, musicbox(nf("E6"), 2.5), -8)
    mus.add(1.1, musicbox(nf("C6"), 2.5), -10)
    mus.add(1.7, musicbox(nf("B5"), 2.5), -10)
    mus.add(2.6, musicbox(nf("G#5"), 3.0), -9)          # the series motif E-C-B-G#
    mus.add(0.3, drone(nf("A1"), 12.0), -14)
    mus.add(4.0, pad([nf("A2"), nf("E3"), nf("B3"), nf("C4")], 8.2, 2.5, 1.5, 1200), -16)
    # --- cue 2: tension pulse (ring -> vanish)
    bpm = 84
    beat = 60 / bpm
    t = E["ring_start"] + 0.2
    k = 0
    while t < E["vanish"]:
        f = nf("A1") if (k // 8) % 2 == 0 else nf("F1")
        mus.add(t, sub_pulse(f, beat * 0.9), -9 + min(4, k * 0.12))
        if k % 2 == 1:
            mus.add(t, sub_pulse(f * 2, beat * 0.4), -18)
        t += beat / 2 if k % 4 == 3 else beat
        k += 1
    mus.add(E["ring_start"], pad([nf("A2"), nf("C3"), nf("E3"), nf("G#3")], E["vanish"] - E["ring_start"] + 0.3, 3, 0.2, 900), -17)
    mus.add(17.5, harmonic(nf("E6"), 8.5), -16)
    mus.add(E["flicker_start"], sfx_reverse_swell(E["vanish"] - E["flicker_start"]), -6)
    # --- cue 3: aftermath, unsettled (after vanish -> msg1)
    mus.add(E["vanish_end"] + 0.4, drone(nf("D#2"), 16.5, 0.07), -12)
    for i, (tt, n_) in enumerate([(28.2, "E5"), (29.6, "C5"), (31.0, "B4"), (33.4, "G#4"), (37.0, "E5"), (39.0, "D#5"),
                                   (41.0, "B4")]):
        mus.add(tt, piano(nf(n_), 4.0, 0.8), -14)
    mus.add(36.0, harmonic(nf("D#6"), 6.0), -20)
    # --- cue 4: second pulse, faster (msg1 -> music_drop)
    bpm = 96
    beat = 60 / bpm
    t = E["msg1"] + 0.3
    k = 0
    while t < E["music_drop"]:
        mus.add(t, sub_pulse(nf("A#1") if k % 16 < 8 else nf("G#1"), beat * 0.8), -10 + min(3, k * 0.1))
        mus.add(t + beat / 2, sfx_tick(True) * 0.6, -16)
        t += beat
        k += 1
    mus.add(E["msg1"], pad([nf("A#2"), nf("C#3"), nf("F3"), nf("A3")], E["music_drop"] - E["msg1"] + 0.2, 2.0, 0.15, 1000), -17)
    mus.add(E["msg2"] - 0.1, harmonic(nf("F6"), 3.0), -15)
    # --- near silence before the double; then the reveal
    mus.add(E["music_drop"], drone(nf("A0") * 2, 3.5, 0.2), -24)
    mus.add(E["reveal"] - 1.8, cluster(1.8 + (E["cut_black"] - E["reveal"])), -9)
    mus.add(E["reveal"], drone(nf("A1"), E["cut_black"] - E["reveal"] + 1), -10)
    # hard cut
    x = mus.out()
    c = int(E["cut_black"] * SR)
    x[c:] = 0
    # --- end sting
    end = Bus()
    end.add(E["end_card"] + 0.05, piano(nf("E3"), 3.2, 1.0) + piano(nf("E2"), 3.2, 0.8), -6)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        end.add(E["end_card"] + 0.9 + i * 0.42, musicbox(nf(n_), 2.0), -9)
    wet = reverb(end.out()[:, 0], IR_BIG, 0.6)
    x[: len(wet)] += wet[: len(x)]
    write_wav(P("music", "ep01_score.wav"), x)
    return x


# ============================================================================ flicker curve (shared idea with picture)
def flicker(t):
    return T.flicker(t)


# ============================================================================ mix
def duck_key(D, look=0.08, att=0.03, rel=0.45):
    """0..1 ducking key from the dialogue bus: 80 ms look-ahead, 30 ms attack, 450 ms release (no pumping)."""
    hop = SR // 1000
    lvl = np.abs(D).max(1)
    n = len(lvl) // hop
    act = (lvl[: n * hop].reshape(n, hop).max(1) > 0.008).astype(float)
    k = np.zeros(n)
    a_a, a_r = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    for i in range(1, n):
        c = a_a if act[i] > k[i - 1] else a_r
        k[i] = act[i] + (k[i - 1] - act[i]) * c
    k = np.roll(k, -int(look * 1000))
    k[-int(look * 1000):] = k[-int(look * 1000) - 1]
    out = np.interp(np.arange(len(lvl)), np.arange(n) * hop, k)
    return np.clip(out * 1.2, 0, 1)


def limiter(x, ceil, release=0.08):
    """Peak limiter with 2 ms look-ahead (gain computed on the max of both channels)."""
    la = int(0.002 * SR)
    pk = np.abs(x).max(1)
    pk = np.maximum.accumulate(np.lib.stride_tricks.sliding_window_view(np.pad(pk, (0, la)), la + 1).max(1)[None, :], 0)[0]
    g = np.minimum(1.0, ceil / (pk + 1e-9))
    a = np.exp(-1 / (release * SR))
    out = g.copy()
    for i in range(1, len(g)):  # instant attack, smooth release
        out[i] = g[i] if g[i] < out[i - 1] else out[i - 1] * a + g[i] * (1 - a)
    return x * out[:, None]


def main():
    clips = process_voices()
    E = T.EV
    dia, sfx, amb = Bus(), Bus(), Bus()
    pans = {"arman": -0.12, "mom": 0.12, "mom_phone": 0.0, "double": 0.35}
    for lid, x in clips.items():
        L = T.LINES[lid]
        fx = L["fx"]
        if fx in ("room", "room_close", "whisper"):
            st = reverb(x, IR_ROOM, 0.12 if fx != "room_close" else 0.07)
            st = st * np.array([[1 - pans[L["who"]] * 0.5, 1 + pans[L["who"]] * 0.5]])
        elif fx == "phone":
            st = pan(x, 0.0) * 0.9
        elif fx == "double_offscreen":
            st = reverb(x, IR_HALL, 0.55) * np.array([[0.75, 1.15]])
        else:
            st = reverb(x, IR_HALL, 0.32) * np.array([[0.95, 1.05]])
        dia.add(L["t"] - 0.06, st)
    D = dia.out()

    # ---- SFX placement
    S = {}
    S["ping"] = sfx_ping(); S["vibe"] = sfx_vibe(); S["ring"] = sfx_ringtone(E["answer"] - E["ring_start"])
    S["glitch"] = sfx_glitch(); S["clink"] = sfx_clink(); S["creak"] = sfx_creak(); S["cloth"] = sfx_cloth()
    S["tap"] = sfx_tap(); S["swoosh"] = sfx_swoosh(); S["pop"] = sfx_pop(); S["call_end"] = sfx_call_end()
    S["tick"] = sfx_tick(); S["tock"] = sfx_tick(True); S["heartbeat"] = sfx_heartbeat(); S["boom"] = sfx_boom()
    S["footstep"] = sfx_footstep(); S["whoosh"] = sfx_whoosh(); S["reverse_swell"] = sfx_reverse_swell()
    for k, v in S.items():
        write_wav(P("sound_effects", f"{k}.wav"), v)

    sfx.add(E["phone_wake"], sfx_tap(0.6), -10)
    sfx.add(E["notif"], S["ping"], -6)
    sfx.add(E["notif"] + 0.02, S["vibe"], -10)
    sfx.add(E["mug_down"], S["clink"], -8, 0.25)
    sfx.add(4.62, S["cloth"], -6, -0.2)                      # Arman lifts his head
    sfx.add(E["show_phone"], S["cloth"], -4, -0.2)
    sfx.add(E["show_phone"] + 0.1, S["creak"], -10, -0.3)
    # ringtone: louder in inserts (S04, S12), softer in close-ups
    ring = S["ring"].copy()
    tt = E["ring_start"] + t_(len(ring))
    g = np.where(((tt >= 11.9) & (tt < 14.4)) | ((tt >= 30.3) & (tt < 32.0)), 1.0, 0.55)
    g = np.where((tt >= E["vanish_end"]) & (tt < 30.1), 0.22, g)   # shock: the ring recedes after Mom vanishes
    g = signal.lfilter([0.002], [1, -0.998], g) / 1.0
    ring_bus = Bus()
    ring_bus.add(E["ring_start"], ring * g, -9)
    sfx.add(E["answer"] - 0.02, sfx_tap(1.0), -6)
    for c0 in (E["flicker_a"], E["flicker_b"]):
        sfx.add(c0, lamp_buzz(c0, c0 + 0.5, flicker), 0)
    sfx.add(E["flicker_start"], lamp_buzz(E["flicker_start"], E["vanish_end"] + 0.3, flicker), 2)
    sfx.add(E["vanish"] - 0.05, S["glitch"], -3)
    sfx.add(E["vanish"] + 0.2, sfx_boom(1.5), -10)
    sfx.add(E["startle"], sfx_creak(0.3, 300), -6, -0.3)
    sfx.add(E["startle"], S["cloth"], -4, -0.3)
    sfx.add(32.1, S["cloth"], -6, -0.2)                      # phone to ear
    sfx.add(E["call_end"], S["call_end"], -8)
    sfx.add(E["msg1"], S["vibe"], -7)
    sfx.add(E["msg1"] + 0.05, S["pop"], -9)
    n_chars = len(T.TYPED)
    for i in range(n_chars):
        tk = E["type_start"] + i * (E["type_end"] - E["type_start"]) / (n_chars - 1)
        sfx.add(tk, sfx_tap(0.8 + 0.2 * rng.random()), -10)
    sfx.add(E["send"], S["swoosh"], -8)
    sfx.add(E["msg2"], S["vibe"], -9)
    sfx.add(E["msg2"] + 0.05, S["pop"], -8)
    for i in range(3):
        sfx.add(E["msg2"] + 0.75 + i * 0.78, S["heartbeat"], -12 + i)
    sfx.add(E["turn"], S["whoosh"], -12, 0.3)
    sfx.add(E["turn"] + 0.05, sfx_creak(0.4, 340), -8, -0.2)
    sfx.add(E["reveal"], S["boom"], -11)
    sfx.add(E["step"], S["footstep"], -6, 0.2)
    # wall clock ticks (more audible when it is quiet)
    t = 0.0
    k = 0
    while t < E["cut_black"]:
        quiet = (30.9 <= t < 32.6) or (51.0 <= t < 54.4)
        sfx.add(t + 0.0, S["tock"] if k % 2 else S["tick"], -16 if quiet else -27, -0.2)
        t += 1.0
        k += 1
    # ambience: kitchen room tone, cuts to nothing at the hard cut
    rt = room_tone(N)
    rt[int(E["cut_black"] * SR):] = 0
    amb.add(0.0, np.stack([rt, np.roll(rt, 2400)], 1), -6)

    # ---- dialogue-keyed ducking (dialogue must sit >= 10 dB above everything else)
    key = duck_key(D)
    sfx_duck = 1 - 0.6 * key        # ~ -8 dB
    ring_duck = 1 - 0.78 * key      # ~ -13 dB
    M = build_score()
    M = M - 0.5 * signal.sosfilt(sos("low", 110, 2), M, axis=0)      # tame sub-bass (~ -6 dB below 110 Hz)
    M = signal.sosfilt(sos("high", 32, 2), M, axis=0) * db(-4)
    # duck music under dialogue
    duck = 1 - 0.72 * key           # ~ -11 dB
    SFX = sfx.out() * db(-2) * sfx_duck[:, None] + ring_bus.out() * db(-2) * ring_duck[:, None]
    mix = D * db(0) + SFX + amb.out() + M * db(-3) * duck[:, None]
    mix = limiter(mix, db(-3))
    end = int(E["cut_black"] * SR)
    mix[end:int(E["end_card"] * SR)] = 0
    write_wav(P("renders", "ep01_mix_premaster.wav"), mix)
    for nm, st in (("dialogue", D), ("sfx", SFX), ("ambience", amb.out()), ("music", M * db(-3) * duck[:, None])):
        write_wav(P("renders", "stems", f"ep01_stem_{nm}.wav"), st)
    print("mix peak dB", 20 * np.log10(np.abs(mix).max()))


if __name__ == "__main__":
    main()
