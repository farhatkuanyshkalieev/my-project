"""Sound design + score + mix for «Ярче». Everything except the voices is synthesised here.

Output: public/audio/mix.wav (48 kHz stereo, 60 s) plus stems in audio_src/stems/.
Timings mirror src/lib/timeline.ts.
"""
import json, os, re, subprocess
import numpy as np
from scipy import signal

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(2026)

LINE_AT = {
    "L1": 6.15, "M1": 10.8, "L2": 14.15, "M2": 15.9, "M3": 18.05, "L3": 21.05, "M4": 24.7,
    "L4": 30.0, "M5": 34.4, "L5": 35.45, "LP": 42.9, "M6": 44.9, "L6": 48.2, "M7": 51.4,
    "L7": 52.3, "M8": 55.2,
}


# ---------------------------------------------------------------- helpers
def t_axis(n):
    return np.arange(n) / SR


def noise(n, color="white"):
    w = rng.standard_normal(n)
    if color == "white":
        return w
    if color == "pink":
        b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
        a = [1, -2.494956002, 2.017265875, -0.522189400]
        return signal.lfilter(b, a, w) * 4
    if color == "brown":
        x = np.cumsum(w)
        x = signal.lfilter([1, -1], [1, -0.995], x)
        return x / (np.max(np.abs(x)) + 1e-9)
    raise ValueError(color)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def env_adsr(n, a=0.005, d=0.1, s=0.0, r=0.0):
    t = t_axis(n)
    e = np.where(t < a, t / max(a, 1e-6), 1.0)
    e = np.where(t >= a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)), e)
    return e


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def db(x):
    return 10 ** (x / 20)


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, x, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N:
            return
        if i < 0:
            x = x[-i:]
            i = 0
        x = x[: N - i]
        gl = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        gr = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        if x.ndim == 2:
            self.L[i:i + len(x)] += x[:, 0] * gain
            self.R[i:i + len(x)] += x[:, 1] * gain
        else:
            self.L[i:i + len(x)] += x * gain * gl
            self.R[i:i + len(x)] += x * gain * gr

    def stereo(self):
        return np.stack([self.L, self.R], axis=1)


def make_ir(length, decay, bright=6000, seed=0, predelay=0.01):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = t_axis(n)
    ir = np.zeros((n, 2))
    for c in range(2):
        x = r.standard_normal(n) * np.exp(-t / decay)
        x = lp(x, bright)
        ir[:, c] = x
    pd = int(predelay * SR)
    ir = np.vstack([np.zeros((pd, 2)), ir])
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) + 1e-9
    return ir


def reverb(x, ir, wet):
    """x mono or stereo -> stereo"""
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    out = np.zeros((len(x) + len(ir) - 1, 2))
    for c in range(2):
        out[:, c] = signal.fftconvolve(x[:, c], ir[:, c])
    out[: len(x)] += x * 0  # placeholder for alignment
    dry = np.vstack([x, np.zeros((len(ir) - 1, 2))])
    return dry * (1 - wet * 0.4) + out * wet


IR_ROOM = make_ir(0.9, 0.18, 7000, 1)
IR_HALL = make_ir(3.2, 0.9, 5000, 2, 0.03)
IR_OUT = make_ir(1.4, 0.35, 4500, 3, 0.04)
IR_SMALL = make_ir(0.5, 0.08, 8000, 4)


def load_audio(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


# ---------------------------------------------------------------- instruments
def piano(f, dur=2.5, vel=0.7, bright=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    B = 0.00035
    x = np.zeros(n)
    for k in range(1, 11):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2:
            break
        amp = (1 / k ** (1.35 - 0.25 * bright)) * (0.85 + 0.3 * rng.random())
        dec = 1.0 / (0.9 + k * 0.55 * (1.2 - vel * 0.4))
        x += amp * np.sin(2 * np.pi * fk * t + rng.random() * 6) * np.exp(-t / (dec * (220 / f) ** 0.3 * 1.6))
    # two-stage decay + hammer
    x *= np.minimum(1, t / 0.004)
    ham = bp(noise(int(0.03 * SR)), 1500, 6000) * np.exp(-t_axis(int(0.03 * SR)) / 0.006) * 0.15
    x[: len(ham)] += ham
    rel = np.ones(n)
    rel[-int(0.15 * SR):] = np.linspace(1, 0, int(0.15 * SR))
    return x * rel * vel * 0.32


def music_box(f, dur=2.2, vel=0.6, detune=0.0):
    n = int(dur * SR)
    t = t_axis(n)
    wob = 1 + detune * np.sin(2 * np.pi * 0.7 * t) * 0.01
    x = np.sin(2 * np.pi * f * wob * t) * np.exp(-t / 0.9)
    x += 0.35 * np.sin(2 * np.pi * f * 3.01 * wob * t) * np.exp(-t / 0.25)
    x += 0.18 * np.sin(2 * np.pi * f * 5.43 * t) * np.exp(-t / 0.08)
    x *= np.minimum(1, t / 0.002)
    return x * vel * 0.25


def pad(freqs, dur, vel=0.2, cutoff=1400, attack=1.2, release=1.5):
    n = int(dur * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for f in freqs:
        for d in (-0.08, 0, 0.07):
            ph = 2 * np.pi * f * (1 + d / 100) * t + rng.random() * 6
            x += signal.sawtooth(ph) * 0.3
    x = lp(x, cutoff, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release)
    return x * e * vel / max(1, len(freqs))


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    m = re.match(r"([A-G]#?)(\d)", name)
    k = NOTE[m.group(1)] + (int(m.group(2)) + 1) * 12
    return 440 * 2 ** ((k - 69) / 12)


# ---------------------------------------------------------------- SFX
def marker_squeak(dur):
    n = int(dur * SR)
    t = t_axis(n)
    x = bp(noise(n), 1800, 5200, 2)
    # stroke rhythm: each doodle stroke is a burst; lifts are gaps
    mod = np.clip(0.55 + 0.45 * np.sin(2 * np.pi * 3.1 * t + 2 * np.sin(2 * np.pi * 0.7 * t)), 0, 1)
    gates = np.ones(n)
    for g in (0.62, 1.05, 1.32, 1.5, 1.7, 1.86, 2.0):
        i = int(g * SR)
        gates[i:i + int(0.07 * SR)] = 0.05
    gates = lp(gates, 40)
    squeal = np.sin(2 * np.pi * (2400 + 300 * np.sin(2 * np.pi * 5 * t)) * t) * 0.15
    return (x * 0.6 + squeal * mod) * mod * gates


def whoosh(dur=0.7, lo=300, hi=3000, rev=False):
    n = int(dur * SR)
    t = t_axis(n)
    x = noise(n, "pink")
    out = np.zeros(n)
    steps = 40
    for i in range(steps):
        a, b = i * n // steps, (i + 1) * n // steps
        k = i / steps
        fc = lo + (hi - lo) * np.sin(np.pi * k) ** 2
        seg = bp(x[max(0, a - 2000):b], fc * 0.6, min(fc * 1.6, SR / 2.2))
        out[a:b] = seg[-(b - a):]
    e = np.sin(np.pi * t / dur) ** 2
    out *= e
    return out[::-1] if rev else out


def splat():
    n = int(0.5 * SR)
    t = t_axis(n)
    x = lp(noise(n), 1800) * np.exp(-t / 0.08)
    x += lp(noise(n), 500) * np.exp(-t / 0.15) * 0.6
    bub = np.sin(2 * np.pi * (300 - 200 * t) * t) * np.exp(-t / 0.05) * 0.4
    return x + bub


def bell(f=220, dur=6.0):
    n = int(dur * SR)
    t = t_axis(n)
    ratios = [(0.5, 1.0, 3.5), (1.0, 0.8, 2.5), (1.19, 0.5, 2.0), (1.5, 0.4, 1.6), (2.0, 0.35, 1.2), (2.74, 0.2, 0.8), (3.76, 0.12, 0.5)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in ratios)
    return x * np.minimum(1, t / 0.003)


def gull():
    n = int(0.9 * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for k, start in enumerate((0.0, 0.28, 0.5)):
        seg_t = t - start
        m = (seg_t > 0) & (seg_t < 0.3)
        f = 1900 - 900 * np.clip(seg_t / 0.3, 0, 1) + 150 * np.sin(2 * np.pi * 30 * seg_t)
        ph = np.cumsum(np.where(m, f, 0)) / SR * 2 * np.pi
        x += np.where(m, np.sin(ph) * np.sin(np.pi * np.clip(seg_t / 0.3, 0, 1)), 0) * (1 - 0.25 * k)
    x += 0.3 * bp(x * noise(n) * 0.3, 1500, 4000)
    return x


def rain(n):
    x = hp(noise(n, "pink"), 1200) * 0.25
    drops = np.zeros(n)
    idx = rng.integers(0, n, int(n / SR * 220))
    drops[idx] = rng.random(len(idx)) * 1.2
    drops = bp(signal.lfilter([1], [1, -0.6], drops), 2000, 9000)
    return x + drops * 0.6 + lp(noise(n, "brown"), 200) * 0.3


def city(n):
    t = t_axis(n)
    traffic = lp(noise(n, "brown"), 320) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * t))
    wind = bp(noise(n, "pink"), 300, 1400) * (0.35 + 0.3 * np.sin(2 * np.pi * 0.11 * t + 1) ** 2) * 0.3
    water = lp(noise(n), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.6 * t + np.sin(2 * np.pi * 0.23 * t) * 3) ** 4) * 0.5
    return traffic * 0.8 + wind + water


def hum(n, f=50, harm=(1, 0.5, 0.3, 0.15), noise_amt=0.2):
    t = t_axis(n)
    x = sum(a * np.sin(2 * np.pi * f * (k + 1) * t) for k, a in enumerate(harm))
    return x * 0.3 + lp(noise(n, "pink"), 400) * noise_amt


def tick(strong=1.0):
    n = int(0.05 * SR)
    t = t_axis(n)
    return (bp(noise(n), 2500, 7000) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.006) * 0.5) * strong


def key_click():
    n = int(0.06 * SR)
    t = t_axis(n)
    x = bp(noise(n), 1500, 6000) * np.exp(-t / 0.008)
    x += np.sin(2 * np.pi * (180 + rng.random() * 60) * t) * np.exp(-t / 0.015) * 0.5
    return x


def ping(f1=1318.5, f2=1760, gap=0.11):
    n = int(0.9 * SR)
    t = t_axis(n)
    a = np.sin(2 * np.pi * f1 * t) * np.exp(-t / 0.18) + 0.3 * np.sin(2 * np.pi * f1 * 2 * t) * np.exp(-t / 0.06)
    tb = np.clip(t - gap, 0, None)
    b = (np.sin(2 * np.pi * f2 * tb) * np.exp(-tb / 0.25) + 0.3 * np.sin(2 * np.pi * f2 * 2 * tb) * np.exp(-tb / 0.08)) * (t > gap)
    return (a + b) * 0.5


def buzz(dur, on=0.35, off=0.15):
    n = int(dur * SR)
    t = t_axis(n)
    gate = ((t % (on + off)) < on).astype(float)
    gate = lp(gate, 60)
    x = signal.square(2 * np.pi * 160 * t) * 0.3 + np.sin(2 * np.pi * 80 * t)
    rattle = bp(noise(n), 800, 3000) * 0.4 * (np.sin(2 * np.pi * 160 * t) > 0.6)
    return lp(x + rattle, 2500) * gate


def ringtone(dur):
    out = np.zeros(int(dur * SR))
    seq = ["E6", "B5", "G#5", "B5", "E6", "F#6"]
    for i, nn in enumerate(seq * 3):
        st = i * 0.14
        if st > dur - 0.2:
            break
        x = music_box(hz(nn), 0.4, 0.8)
        a = int(st * SR)
        out[a:a + len(x)] += x[: len(out) - a]
    return out


def thud(f=70, dur=0.6, amt=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * (f + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.15)
    x += lp(noise(n), 900) * np.exp(-t / 0.03) * 0.5
    return x * amt


def slide(dur=0.55):
    n = int(dur * SR)
    t = t_axis(n)
    x = bp(noise(n), 300, 2500) * (0.3 + 0.7 * np.sin(np.pi * t / dur)) * (0.7 + 0.3 * np.sin(2 * np.pi * 40 * t))
    return x


def shimmer(dur=1.2, base=2000):
    n = int(dur * SR)
    out = np.zeros(n)
    for i in range(14):
        st = rng.random() * dur * 0.7
        f = base * (1 + rng.random() * 2)
        x = np.sin(2 * np.pi * f * t_axis(int(0.4 * SR))) * np.exp(-t_axis(int(0.4 * SR)) / 0.08)
        a = int(st * SR)
        out[a:a + len(x)] += x[: n - a] * 0.3
    return out


def boom():
    n = int(3.0 * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * (45 + 30 * np.exp(-t / 0.2)) * t) * np.exp(-t / 0.9)
    x += lp(noise(n, "brown"), 120) * np.exp(-t / 0.5) * 0.5
    ring = np.sin(2 * np.pi * 3150 * t) * np.exp(-t / 1.2) * 0.03 * np.minimum(1, t / 0.3)
    return x + ring


def car_pass(dur=4.0):
    n = int(dur * SR)
    t = t_axis(n)
    x = lp(noise(n, "pink"), 700)
    e = np.exp(-((t - dur / 2) / (dur / 5)) ** 2)
    return x * e


def crinkle(dur=0.5):
    n = int(dur * SR)
    x = np.zeros(n)
    idx = rng.integers(0, n, 140)
    x[idx] = rng.standard_normal(140)
    return bp(signal.lfilter([1], [1, -0.5], x), 1500, 8000) * np.sin(np.pi * t_axis(n) / dur)


def footstep():
    n = int(0.25 * SR)
    t = t_axis(n)
    return lp(noise(n), 1200) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.05) * 0.6


def drip():
    n = int(0.3 * SR)
    t = t_axis(n)
    return np.sin(2 * np.pi * (900 + 1400 * t) * t) * np.exp(-t / 0.04)


def heartbeat():
    out = np.zeros(int(1.0 * SR))
    for st, amp in ((0.0, 1.0), (0.22, 0.7)):
        x = thud(48, 0.4, amp)
        a = int(st * SR)
        out[a:a + len(x)] += x[: len(out) - a]
    return lp(out, 150)


# ---------------------------------------------------------------- build
def build():
    vo, music, amb, sfx = Bus(), Bus(), Bus(), Bus()
    data = json.loads(open(os.path.join(ROOT, "src", "data", "vo.ts")).read().split("VoLine> = ")[1].rstrip().rstrip(";"))
    vo_env = np.zeros(N)

    # ---- dialogue
    room = {
        "L1": (IR_OUT, 0.18, -0.12), "M1": (IR_OUT, 0.18, 0.12), "L2": (IR_OUT, 0.18, -0.12), "M2": (IR_OUT, 0.18, 0.12),
        "M3": (IR_ROOM, 0.22, 0.15), "L3": (IR_ROOM, 0.2, -0.1), "M4": (IR_ROOM, 0.2, 0.1),
        "L4": (IR_SMALL, 0.22, -0.1), "M5": (IR_SMALL, 0.22, 0.1), "L5": (IR_SMALL, 0.22, -0.1),
        "LP": (IR_SMALL, 0.05, 0.08), "M6": (IR_ROOM, 0.18, 0.0),
        "L6": (IR_SMALL, 0.14, -0.08), "M7": (IR_SMALL, 0.14, 0.08), "L7": (IR_SMALL, 0.12, -0.05), "M8": (IR_SMALL, 0.14, 0.05),
    }
    for lid, at in LINE_AT.items():
        x = load_audio(os.path.join(ROOT, "audio_src", "vo", f"{lid}.mp3"))
        t0 = data[lid]["trim"][0]
        x = x[int(t0 * SR):]
        x = hp(x, 90)
        rms = np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) + 1e-9
        x = x / rms * db(-20)
        if lid == "LP":  # through the phone
            x = bp(x, 380, 3300, 3)
            x = np.tanh(x * 3) / 3 * 1.4
            x = x + 0.004 * hp(noise(len(x)), 3000)
        ir, wet, pan = room[lid]
        y = reverb(x, ir, wet)
        g = {"L7": 1.15, "M8": 1.1, "M7": 1.0}.get(lid, 1.0)
        vo.add(y * g, at, 1.0, 0)
        if pan:
            pass
        e = np.abs(signal.hilbert(x)) if len(x) < SR * 8 else np.abs(x)
        e = lp(e, 8)
        i = int(at * SR)
        vo_env[i:i + len(e)] = np.maximum(vo_env[i:i + len(e)], e[: N - i])
    vo_env = np.clip(vo_env / (np.percentile(vo_env[vo_env > 0], 95) + 1e-9), 0, 1)
    duck = 1 - 0.55 * lp(vo_env, 3)

    # ---- ambience beds
    def bed(x, a, b, gain, fade=0.4, pan_noise=True):
        n = int((b - a) * SR)
        x = x[:n]
        f = int(fade * SR)
        e = np.ones(n)
        e[:f] = np.linspace(0, 1, f)
        e[-f:] = np.linspace(1, 0, f)
        if pan_noise:
            st = np.stack([x * e, np.roll(x, 777) * e], axis=1)
            amb.add(st, a, gain)
        else:
            amb.add(x * e, a, gain)

    room_tone = lp(noise(int(4.3 * SR), "pink"), 2500) * 0.05
    bed(room_tone, 0.0, 4.3, 0.6)
    bed(city(int(14.2 * SR)), 3.9, 18.0, 0.32)
    bed(lp(rain(int(10.8 * SR)), 7000), 17.6, 28.3, 0.11)
    bed(lp(noise(int(10.8 * SR), "brown"), 150) * 0.6, 17.6, 28.3, 0.25)
    birds = np.zeros(int(12.9 * SR))
    for k in range(10):
        c = gull() * 0.15
        c = signal.resample(c, int(len(c) * 0.55))
        a = int(rng.random() * (len(birds) - len(c)))
        birds[a:a + len(c)] += c
    bed(hum(int(12.9 * SR), 50, noise_amt=0.15) * 0.5 + hp(birds, 2500), 28.1, 41.0, 0.22)
    office = hum(int(7.4 * SR), 100, (0.4, 0.6, 0.2, 0.1), 0.35) + bp(noise(int(7.4 * SR), "pink"), 300, 1800) * 0.25
    bed(office, 40.7, 48.1, 0.15)
    night = hum(int(12.2 * SR), 50, (1, 0.3, 0.1, 0.05), 0.08) * 0.6
    bed(night, 47.9, 57.8, 0.18)

    # ---- title / chapter 1 spot effects
    sfx.add(marker_squeak(2.1), 0.25, 0.22, 0.1)
    sfx.add(crinkle(0.3), 0.2, 0.15)
    sfx.add(whoosh(1.2, 200, 4000, rev=True), 1.15, 0.22)
    sfx.add(splat(), 2.2, 0.35, 0.3)
    sfx.add(reverb(shimmer(1.4, 2500), IR_HALL, 0.5), 2.75, 0.2)
    sfx.add(whoosh(0.9, 250, 2600), 3.55, 0.5, -0.3)
    sfx.add(splat(), 3.95, 0.28, 0.2)
    sfx.add(reverb(bell(196, 7.0), IR_HALL, 0.7) * 0.6, 4.4, 0.08, -0.4)
    for at, pan in ((5.0, 0.6), (9.4, -0.5), (13.9, 0.4), (16.6, -0.2)):
        sfx.add(reverb(gull(), IR_OUT, 0.4), at, 0.08, pan)
    for at in (6.0, 10.2):
        sfx.add(crinkle(0.35), at, 0.18, -0.2)
    sfx.add(whoosh(0.9, 300, 3000), 17.25, 0.45, 0.3)
    sfx.add(splat(), 17.68, 0.32, -0.2)

    # ---- chapter 2
    sfx.add(thud(90, 0.5, 0.8), 17.85, 0.35, 0.6)
    for k, at in enumerate((17.9, 18.15, 18.38)):
        sfx.add(footstep(), at, 0.25, 0.6 - k * 0.15)
    sfx.add(ping(), 18.3, 0.18, 0.4)
    sfx.add(reverb(lp(noise(int(4 * SR), "brown"), 90) * np.exp(-t_axis(int(4 * SR)) / 1.2), IR_HALL, 0.4), 19.6, 0.25)
    for k in range(3):
        sfx.add(drip(), 27.6 + k * 0.17, 0.1, 0.1)
    sfx.add(whoosh(0.5, 400, 5000), 27.9, 0.55)

    # ---- chapter 3
    sfx.add(buzz(0.7), 28.45, 0.16)
    sfx.add(ping(1046.5, 1568), 28.5, 0.16)
    sfx.add(boom(), 38.95, 0.26)

    # shutters into the office
    for k in range(12):
        sfx.add(np.concatenate([tick(1.0), np.zeros(1440)]) + thud(400 + k * 30, 0.08, 0.3), 40.5 + k * 0.025, 0.25, (k % 2) * 0.4 - 0.2)

    # ---- chapter 4
    tt = 40.85
    while tt < 42.0:
        sfx.add(key_click(), tt, 0.16 + rng.random() * 0.06, -0.1)
        tt += 0.06 + rng.random() * 0.12
    for k in range(41, 48):
        sfx.add(tick(1.0), k + 0.0, 0.06, 0.5)
    sfx.add(buzz(0.75, 0.3, 0.12), 42.0, 0.2, 0.3)
    sfx.add(ringtone(0.75), 42.0, 0.12, 0.3)
    sfx.add(tick(1.5), 42.62, 0.2)
    sfx.add(slide(0.55), 47.25, 0.3)
    sfx.add(thud(110, 0.5, 1.0), 47.78, 0.45)

    # ---- chapter 5
    sfx.add(crinkle(0.6), 48.15, 0.12, -0.2)
    sfx.add(car_pass(4.0), 49.5, 0.06, -0.6)
    for k in range(48, 58):
        sfx.add(tick(0.6), k + 0.5, 0.025, 0.4)
    for at in (55.0, 56.1):
        sfx.add(heartbeat(), at, 0.35)
    sfx.add(reverb(shimmer(0.8, 3000), IR_HALL, 0.6), 59.15, 0.12)

    # ---- score
    def chord_seq(start, bar, chords, vel=0.5, pattern=(0, 1, 2), mb=None):
        t = start
        for ch in chords:
            notes = [hz(n) for n in ch]
            music.add(piano(notes[0] / 2, 2.4, vel * 0.9), t, 0.9, -0.15)
            for i, p in enumerate(pattern):
                music.add(piano(notes[p % len(notes)], 1.6, vel * (0.75 if i else 0.9)), t + i * bar / 3, 0.8, 0.1 * (i - 1))
            t += bar

    def melody(start, notes, step, vel=0.6, inst=music_box, detune=0.0):
        for i, nn in enumerate(notes):
            if nn is None:
                continue
            x = inst(hz(nn), 1.8, vel, detune) if inst is music_box else inst(hz(nn), 2.0, vel)
            music.add(x, start + i * step, 1.0, 0.2)

    motif = ["D6", "F#6", "A6", "B6", "A6", "F#6", "G6", "F#6", "E6", "D6"]
    melody(0.3, motif, 0.34, 0.55)
    chord_seq(4.0, 2.0, [["D4", "F#4", "A4"], ["A3", "C#4", "E4"], ["B3", "D4", "F#4"], ["G3", "B3", "D4"],
                         ["D4", "F#4", "A4"], ["A3", "C#4", "E4"], ["G3", "B3", "D4"]], 0.55)
    melody(8.0, ["A5", "F#5", "D5", None, "B5", "A5", "F#5", None, "G5", "F#5", "E5", "D5"], 0.5, 0.35)
    music.add(pad([hz("D3"), hz("A3"), hz("F#4")], 14, 0.12, 1800, 2.0), 4.0, 1.0)
    # ch2: same warmth, then it stops dead at "а деньги?"
    chord_seq(17.8, 1.9, [["D4", "F#4", "A4"], ["B3", "D4", "F#4"]], 0.5)
    music.add(pad([hz("D3"), hz("F#3"), hz("A3"), hz("C#4")], 4.6, 0.14, 1600, 1.2, 0.3), 17.8, 1.0)
    music.add(pad([hz("B2"), hz("F#3")], 5.6, 0.12, 700, 0.8, 1.5), 22.6, 1.0)
    music.add(piano(hz("B2"), 3.5, 0.35), 24.8, 1.0)
    # ch3: minor, sparse
    for i, nn in enumerate(["B4", "F#4", "D5", "C#5", "B4", "F#4", "G4", "F#4"]):
        music.add(piano(hz(nn), 2.2, 0.32), 28.4 + i * 1.15, 0.9, 0.15)
    music.add(pad([hz("B2"), hz("D3"), hz("F#3")], 9.4, 0.13, 900, 2.0, 1.0), 28.3, 1.0)
    # (silence after "хватит играть в художника" — only the boom)
    # ch4: a single dull pulse
    for k in range(6):
        music.add(lp(piano(hz("F#2"), 1.2, 0.25), 600), 41.0 + k * 1.0, 0.7)
    # ch5: solo piano in the dark
    for at, nn, v in ((48.3, "B3", 0.4), (48.6, "F#4", 0.3), (49.4, "D5", 0.32), (50.6, "C#5", 0.28), (51.8, "B4", 0.3),
                      (52.4, "G3", 0.32), (53.2, "D4", 0.25), (54.0, "F#4", 0.25), (54.9, "E4", 0.22)):
        music.add(reverb(piano(hz(nn), 3.0, v, 0.7), IR_HALL, 0.45), at, 0.95, 0.1)
    music.add(pad([hz("G2"), hz("D3")], 5.5, 0.08, 500, 2.0, 2.0), 52.4, 1.0)
    # end: the motif returns on a broken music box, slower, and never resolves
    for i, nn in enumerate(["D6", "F#6", "A6", "B6", "A6", "F#6", "G6", "F#6", "E6"]):
        x = music_box(hz(nn) * (1 - 0.006 * i), 2.2, 0.42 - i * 0.02, detune=1.5)
        music.add(reverb(x, IR_HALL, 0.5), 57.75 + i * 0.25, 1.0, 0.0)

    # ---- mix
    m_st = music.stereo()
    m_st = np.stack([reverb(m_st[:, c], IR_HALL, 0.22)[:N, c] for c in range(2)], axis=1)
    a_st = amb.stereo()
    s_st = sfx.stereo()
    v_st = vo.stereo()
    d = duck[:, None]
    mix = v_st * 1.0 + m_st * db(-4) * (0.45 + 0.55 * d) + a_st * (0.6 + 0.4 * d) + s_st * db(-1)
    # gentle bus compression
    lvl = lp(np.abs(mix).max(axis=1), 6)
    gr = np.where(lvl > db(-12), (db(-12) / (lvl + 1e-9)) ** 0.35, 1.0)
    mix *= gr[:, None]
    mix *= db(-1) / (np.max(np.abs(mix)) + 1e-9)
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    # fade out the very end
    mix[-int(0.15 * SR):] *= np.linspace(1, 0, int(0.15 * SR))[:, None]

    os.makedirs(os.path.join(ROOT, "audio_src", "stems"), exist_ok=True)
    import soundfile as sf
    sf.write(os.path.join(ROOT, "public", "audio", "mix.wav"), mix.astype(np.float32), SR, subtype="PCM_24")
    for name, st in (("vo", v_st), ("music", m_st), ("amb", a_st), ("sfx", s_st)):
        sf.write(os.path.join(ROOT, "audio_src", "stems", f"{name}.wav"), (st / (np.max(np.abs(st)) + 1e-9) * 0.9).astype(np.float32), SR, subtype="PCM_16")
    print("peak", np.max(np.abs(mix)), "rms dB", 20 * np.log10(np.sqrt(np.mean(mix ** 2))))


if __name__ == "__main__":
    build()
