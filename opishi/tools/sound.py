"""Score + sound design + mix for «Опиши мне». Voices are ElevenLabs; everything else is synthesised.

Rule for this film: no effects under dialogue. Only on-screen, motivated sounds between lines.
Output: public/audio/mix.wav (48 kHz stereo, 100 s). Timings mirror src/lib/timeline.ts.
"""
import json, os, re, subprocess
import numpy as np
from scipy import signal

SR = 48000
DUR = 100.0
N = int(SR * DUR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(2026)

LINE_AT = {
    "T1": 9.4, "M1": 12.9, "T2": 18.6, "M2": 23.2, "T3": 29.4, "M3": 33.2, "T4": 42.4, "M4": 45.3,
    "T5": 49.2, "M5": 52.8, "MN": 61.4, "M6": 73.6, "T6": 76.0, "M7": 83.6, "T7": 88.2, "M8": 90.0,
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


# ---------------------------------------------------------------- new voices for this score
def felt_piano(f, dur=3.0, vel=0.6):
    """Soft 'felt' piano: muted hammer, warm low-passed tone, gentle release."""
    x = piano(f, dur, vel * 0.9, bright=0.6)
    x = lp(x, 2200 + vel * 1500)
    n = len(x)
    t = t_axis(n)
    felt = lp(noise(int(0.04 * SR)), 900) * np.exp(-t_axis(int(0.04 * SR)) / 0.012) * 0.05 * vel
    x[: len(felt)] += felt
    return x * (1 + 0.0 * t)


def strings(freqs, dur, vel=0.18, cutoff=1800, attack=1.6, release=2.0):
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.12, -0.04, 0.05, 0.13):
            vib = 1 + 0.0035 * np.sin(2 * np.pi * (5.1 + d) * t + rng.random() * 6)
            ph = np.cumsum(2 * np.pi * f * (1 + d / 100) * vib / SR)
            out += signal.sawtooth(ph) * 0.25
    out = lp(out, cutoff, 2)
    out = hp(out, 90)
    e = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, (dur - t)) / release)
    return out * e * vel / max(1, len(freqs))


def celesta(f, dur=2.0, vel=0.5):
    n = int(dur * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.1) + 0.4 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.2)
    return x * np.minimum(1, t / 0.002) * vel * 0.22


def shutter():
    n = int(0.18 * SR)
    t = t_axis(n)
    a = bp(noise(n), 1500, 7000) * np.exp(-t / 0.01)
    b = np.zeros(n)
    k = int(0.07 * SR)
    b[k:] = bp(noise(n - k), 1200, 6000) * np.exp(-t_axis(n - k) / 0.012) * 0.8
    clunk = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.02) * 0.4
    return a + b + clunk


def film_wind():
    n = int(0.45 * SR)
    t = t_axis(n)
    x = bp(noise(n), 600, 3000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * t)))
    return x * np.sin(np.pi * t / 0.45) * 0.35


def polaroid_eject():
    n = int(0.9 * SR)
    t = t_axis(n)
    motor = (signal.sawtooth(2 * np.pi * (110 + 20 * np.sin(2 * np.pi * 6 * t)) * t) * 0.3 + bp(noise(n), 400, 1800) * 0.4)
    return lp(motor, 2500) * np.minimum(1, t / 0.03) * np.minimum(1, (0.9 - t) / 0.1)


def paper(dur=0.6):
    n = int(dur * SR)
    x = np.zeros(n)
    idx = rng.integers(0, n, int(dur * 260))
    x[idx] = rng.standard_normal(len(idx))
    x = bp(signal.lfilter([1], [1, -0.7], x), 900, 7000)
    x += bp(noise(n), 1500, 6000) * 0.15
    return x * np.sin(np.pi * t_axis(n) / dur) ** 0.6


def door_close():
    n = int(0.7 * SR)
    t = t_axis(n)
    latch = bp(noise(n), 2000, 6000) * np.exp(-t / 0.008) * 0.8
    body = np.sin(2 * np.pi * (85 + 40 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.12)
    rattle = np.zeros(n)
    k = int(0.05 * SR)
    rattle[k:] = bp(noise(n - k), 1500, 4000) * np.exp(-t_axis(n - k) / 0.015) * 0.4
    return latch + body + rattle


def cloth(dur=0.5):
    n = int(dur * SR)
    return bp(noise(n, "pink"), 500, 3000) * np.sin(np.pi * t_axis(n) / dur) ** 2 * 0.5


def roof_wind(n):
    t = t_axis(n)
    w = bp(noise(n, "pink"), 200, 1200) * (0.4 + 0.35 * np.sin(2 * np.pi * 0.09 * t + 1) ** 2)
    city_far = lp(noise(n, "brown"), 250) * 0.5
    return w * 0.5 + city_far


def tinnitus(dur):
    n = int(dur * SR)
    t = t_axis(n)
    return np.sin(2 * np.pi * 6200 * t) * np.minimum(1, t / dur) ** 2 * 0.05


# ---------------------------------------------------------------- build
def build():
    vo, music, amb, sfx = Bus(), Bus(), Bus(), Bus()
    data = json.loads(open(os.path.join(ROOT, "src", "data", "vo.ts")).read().split("VoLine> = ")[1].rstrip().rstrip(";"))
    vo_env = np.zeros(N)

    room = {k: (IR_OUT, 0.14) for k in ("T1", "M1", "T2", "M2", "M6", "T6", "M7", "T7", "M8")}
    room.update({k: (IR_ROOM, 0.16) for k in ("T3", "M3", "T4", "M4", "T5", "M5")})
    room["MN"] = (IR_HALL, 0.22)  # the note, read in her voice, like a memory
    for lid, at in LINE_AT.items():
        x = load_audio(os.path.join(ROOT, "audio_src", "vo", f"{lid}.mp3"))
        x = x[int(data[lid]["trim"][0] * SR):]
        x = hp(x, 85)
        rms = np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) + 1e-9
        x = x / rms * db(-20)
        ir, wet = room[lid]
        g = {"M5": 1.2, "M8": 1.1, "T7": 1.15, "MN": 0.95}.get(lid, 1.0)
        vo.add(reverb(x, ir, wet) * g, at)
        e = lp(np.abs(x), 8)
        i = int(at * SR)
        vo_env[i:i + len(e)] = np.maximum(vo_env[i:i + len(e)], e[: N - i])
    vo_env = np.clip(vo_env / (np.percentile(vo_env[vo_env > 0], 95) + 1e-9), 0, 1)
    duck = 1 - 0.5 * lp(vo_env, 2.5)

    def bed(x, a, b, gain, fade=0.6):
        n = int((b - a) * SR)
        x = x[:n]
        f = int(fade * SR)
        e = np.ones(n)
        e[:f] = np.linspace(0, 1, f)
        e[-f:] = np.linspace(1, 0, f)
        amb.add(np.stack([x * e, np.roll(x, 911) * e], axis=1), a, gain)

    # ---- ambience: quiet, always under the scene, never on top of a line
    bed(roof_wind(int(21 * SR)), 6.0, 27.0, 0.12)
    bed(lp(noise(int(11.6 * SR), "pink"), 1500) * 0.15, 27.0, 35.4, 0.25)
    bed(lp(noise(int(19.6 * SR), "pink"), 2500) * 0.12, 38.5, 58.0, 0.22)
    bed(lp(rain(int(10.6 * SR)), 5000), 58.0, 68.6, 0.08)
    bed(roof_wind(int(31 * SR)), 68.4, 97.6, 0.12)

    # ---- motivated spot effects (between lines only)
    for k, ch in enumerate(["О", "П", "И", "Ш", "И", "М", "Н", "Е"]):
        pitch = ["A5", "C6", "E6", "D6", "C6", "E6", "G6", "A6"][k]
        music.add(celesta(hz(pitch), 2.4, 0.5), 0.3 + (k if k < 5 else k + 1) * 0.1, 0.8, (k - 4) * 0.08)
    sfx.add(shutter() + np.concatenate([np.zeros(int(0.05 * SR)), film_wind()[: int(0.13 * SR)]]), 8.6, 0.32, 0.1)
    sfx.add(shutter(), 9.0, 0.3, 0.1)
    sfx.add(shutter(), 25.95, 0.35)
    sfx.add(polaroid_eject(), 26.05, 0.16)
    sfx.add(whoosh(0.6, 300, 3500), 26.7, 0.28)
    for k in range(3):
        sfx.add(footstep(), 27.2 + k * 0.42, 0.10, -0.2)
    sfx.add(thud(95, 0.5, 1.0) + np.concatenate([cloth(0.3), np.zeros(int(0.2 * SR))]), 28.6, 0.42, -0.3)
    sfx.add(lp(heartbeat(), 120), 35.6, 0.5)
    sfx.add(lp(heartbeat(), 120), 36.55, 0.55)
    sfx.add(lp(heartbeat(), 120), 37.4, 0.6)
    sfx.add(tinnitus(2.6), 35.4, 1.0)
    sfx.add(paper(0.7), 38.5, 0.35, 0.1)
    sfx.add(cloth(0.6), 45.45, 0.18)
    sfx.add(whoosh(1.4, 120, 1600), 55.0, 0.22)
    sfx.add(door_close(), 58.75, 0.5, -0.4)
    sfx.add(paper(0.6), 60.7, 0.3)
    for k in range(5):
        sfx.add(footstep(), 69.6 + k * 0.42, 0.11, -0.4 + k * 0.1)
    sfx.add(cloth(0.5), 71.75, 0.25, -0.2)
    sfx.add(cloth(0.4), 94.6, 0.14)

    # ---- score: one theme ("describe it to me"), told five ways
    theme = ["A4", "C5", "E5", "D5", "C5", "A4", "G4", "A4"]
    # title pad
    music.add(strings([hz("F3"), hz("A3"), hz("C4")], 6.6, 0.12, 1400, 2.0, 1.0), 0.0, 1.0)
    # ch.1 — warm F major arpeggios, the theme on top
    prog = [["F3", "A3", "C4", "E4"], ["C3", "G3", "C4", "E4"], ["D3", "A3", "D4", "F4"], ["A#2", "F3", "A#3", "D4"]]
    t = 6.6
    bar = 2.5
    while t < 26.6:
        for ci, ch in enumerate(prog):
            if t >= 26.6:
                break
            notes = [hz(n) for n in ch]
            music.add(felt_piano(notes[0] / 2, 3.2, 0.5), t, 0.9, -0.1)
            for k, nn in enumerate([0, 1, 2, 3, 2, 1]):
                music.add(felt_piano(notes[nn], 2.2, 0.38), t + k * bar / 6, 0.75, 0.15 * ((k % 3) - 1))
            music.add(strings(notes[:3], bar + 0.4, 0.07, 1300, 0.6, 0.6), t, 1.0)
            t += bar
    for i, nn in enumerate(theme):
        music.add(felt_piano(hz(nn) * 2, 2.6, 0.32), 14.0 + i * 0.62, 0.8, 0.2)
    # ch.2 — night, thinner
    for i, (nn, v) in enumerate([("D4", 0.35), ("A4", 0.3), ("F4", 0.28), ("A4", 0.25), ("A#3", 0.32), ("F4", 0.28), ("D4", 0.25)]):
        music.add(felt_piano(hz(nn), 3.0, v), 27.2 + i * 1.1, 0.8)
    music.add(strings([hz("D3"), hz("A3")], 8.6, 0.08, 900, 2.0, 1.5), 27.0, 1.0)
    # ch.3 — cold: low cello line, tension under the split screen
    music.add(strings([hz("A2"), hz("E3")], 10.5, 0.12, 700, 3.0, 1.5), 38.6, 1.0)
    music.add(strings([hz("F2"), hz("C3"), hz("A3")], 6.0, 0.14, 900, 1.0, 2.0), 49.0, 1.0)
    for i, nn in enumerate(["E4", "C4", "A3", "B3"]):
        music.add(felt_piano(hz(nn), 3.5, 0.3), 42.0 + i * 2.6, 0.75)
    # silence after "мне и надо уйти" — then one low note under the split tearing apart
    music.add(felt_piano(hz("A1"), 5.0, 0.45), 55.0, 0.9)
    # ch.4 — the theme alone, slow, in the empty flat
    for i, nn in enumerate(theme):
        music.add(reverb(felt_piano(hz(nn), 3.6, 0.36), IR_HALL, 0.4), 59.0 + i * 1.05, 0.85, 0.1)
    music.add(strings([hz("A2"), hz("E3"), hz("C4")], 9.6, 0.09, 1000, 2.5, 2.0), 59.0, 1.0)
    # ch.5 — the ch.1 progression returns, slower; strings rise under his description
    t = 69.0
    bar = 3.4
    for ch in prog * 2:
        if t > 94.0:
            break
        notes = [hz(n) for n in ch]
        music.add(felt_piano(notes[0] / 2, 4.0, 0.42), t, 0.85)
        for k, nn in enumerate([0, 2, 3, 2]):
            music.add(felt_piano(notes[nn], 3.0, 0.3), t + k * bar / 4, 0.7, 0.12 * (k - 1.5))
        t += bar
    music.add(strings([hz("F3"), hz("A3"), hz("C4"), hz("E4")], 8.0, 0.13, 1600, 3.0, 2.0), 76.0, 1.0)
    for i, nn in enumerate(theme):
        music.add(celesta(hz(nn) * 2, 2.6, 0.32), 79.2 + i * 0.52, 0.9, 0.2)
    # handover: celesta theme, then the final F add9 chord under the green light
    for i, nn in enumerate(theme[:5]):
        music.add(celesta(hz(nn) * 2, 2.6, 0.4), 94.5 + i * 0.36, 1.0, 0.0)
    music.add(strings([hz("F3"), hz("C4"), hz("G4"), hz("A4")], 5.0, 0.16, 2000, 0.6, 2.5), 96.0, 1.0)
    for k, ch in enumerate(["О", "П", "И", "Ш", "И", "М", "Н", "Е"]):
        music.add(celesta(hz(["A5", "C6", "E6", "D6", "C6", "E6", "G6", "A6"][k]), 2.0, 0.3), 97.7 + k * 0.1, 0.8)

    # ---- mix
    m_st = music.stereo()
    m_st = np.stack([reverb(m_st[:, c], IR_HALL, 0.28)[:N, c] for c in range(2)], axis=1)
    a_st = amb.stereo()
    s_st = sfx.stereo()
    v_st = vo.stereo()
    d = duck[:, None]
    mix = v_st * 1.0 + m_st * db(-3) * (0.4 + 0.6 * d) + a_st * (0.5 + 0.5 * d) + s_st * db(-1)
    lvl = np.maximum(lp(np.abs(mix).max(axis=1), 6), 1e-6)
    gr = np.where(lvl > db(-12), (db(-12) / (lvl + 1e-9)) ** 0.35, 1.0)
    mix *= gr[:, None]
    mix *= db(-1) / (np.max(np.abs(mix)) + 1e-9)
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))[:, None]

    import soundfile as sf
    os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
    sf.write(os.path.join(ROOT, "public", "audio", "mix.wav"), mix.astype(np.float32), SR, subtype="PCM_24")
    # report: what plays under each line (to keep dialogue clean)
    for lid, at in LINE_AT.items():
        a, b = int(at * SR), int((at + data[lid]["dur"]) * SR)
        sx = np.sqrt(np.mean(s_st[a:b] ** 2)) * db(-1)
        vv = np.sqrt(np.mean(v_st[a:b] ** 2))
        print(f"{lid}: voice {20*np.log10(vv+1e-9):6.1f} dB | spot fx {20*np.log10(sx+1e-9):6.1f} dB")
    print("peak", np.max(np.abs(mix)), "rms dB", 20 * np.log10(np.sqrt(np.mean(mix ** 2))))


if __name__ == "__main__":
    build()
