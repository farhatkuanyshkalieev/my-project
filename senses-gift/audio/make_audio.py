"""Original soundtrack + SFX for the SENSES gift video, synthesized from scratch.
120 BPM (1 beat = 15 frames at 30 fps), so every cut lands on a beat.
Outputs public/audio/music.wav and public/audio/sfx.wav (stereo, 44.1 kHz)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
LEN = 21.5
N = int(SR * LEN)
BEAT = 0.5
BAR = 2.0
rng = np.random.default_rng(7)

def t_(d):
    return np.arange(int(SR * d)) / SR

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def filt(x, kind, f):
    sos = butter(2, f, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)

def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i : i + len(sig)] += sig * gain * l
    buf[1, i : i + len(sig)] += sig * gain * r

def make_ir(dur=2.4, decay=3.2, tone=5000):
    t = t_(dur)
    ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))]) * np.exp(-t * decay)
    ir = np.stack([filt(ch, "low", tone) for ch in ir])
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))

def reverb(buf, wet, ir):
    out = np.stack([fftconvolve(buf[c], ir[c])[: buf.shape[1]] for c in range(2)])
    return buf + out * wet

# ---------------------------------------------------------------- instruments
def pad_note(m, d):
    t = t_(d + 1.4)
    f = mtof(m)
    sig = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.07):
        ff = f * 2 ** (det / 12)
        for k in range(1, 7):
            sig += np.sin(2 * np.pi * ff * k * t + rng.uniform(0, 6)) / k ** 1.7
    env = np.minimum(t / 0.7, 1.0) * np.where(t > d, np.exp(-(t - d) * 3), 1.0)
    return filt(sig * env, "low", 1600) * 0.05

def epiano(m, vel=1.0, d=1.6):
    t = t_(d)
    f = mtof(m)
    idx = 2.2 * np.exp(-t * 7) + 0.35
    mod = np.sin(2 * np.pi * f * t) * idx
    tine = np.sin(2 * np.pi * f * 14 * t) * 0.6 * np.exp(-t * 40)
    sig = np.sin(2 * np.pi * f * t + mod + tine)
    env = np.minimum(t / 0.004, 1) * np.exp(-t * 2.6)
    return sig * env * vel * 0.16

def bass(m, d):
    t = t_(d)
    f = mtof(m)
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(t / 0.02, 1) * np.exp(-t * 1.1) * np.minimum((d - t) / 0.05, 1)
    return sig * env * 0.32

def kick():
    t = t_(0.45)
    f = 45 + 75 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * 0.55

def snap():
    t = t_(0.25)
    n = filt(rng.standard_normal(len(t)), "band", [1400, 5200])
    return n * np.exp(-t * 26) * 0.16

def shaker(acc):
    t = t_(0.07)
    n = filt(rng.standard_normal(len(t)), "high", 6500)
    return n * np.minimum(t / 0.006, 1) * np.exp(-t * 60) * (0.05 if acc else 0.028)

def bell(m, vel=1.0, d=3.0):
    t = t_(d)
    f = mtof(m)
    sig = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec)
              for r, a, dec in ((1, 1, 1.6), (2.76, 0.45, 3.5), (5.4, 0.25, 7), (8.9, 0.12, 12)))
    return sig * np.minimum(t / 0.002, 1) * vel * 0.12

def noise_sweep(d, f0, f1, shape="rise"):
    """Filtered-noise whoosh with a time-varying band-pass (chunked)."""
    n = int(SR * d)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    hop = 512
    for i in range(0, n, hop):
        p = i / n
        fc = f0 * (f1 / f0) ** p
        seg = x[max(0, i - 2048) : i + hop]
        y = filt(seg, "band", [fc * 0.6, min(fc * 1.6, SR / 2 - 100)])
        out[i : i + hop] = y[-len(out[i : i + hop]) :]
    tt = np.linspace(0, 1, n)
    env = {"rise": tt ** 2.2, "fall": (1 - tt) ** 2, "swell": np.sin(np.pi * tt) ** 1.5}[shape]
    return out * env

# ---------------------------------------------------------------- music
music = np.zeros((2, N))
CH = {
    "D": [50, 57, 61, 64, 66],
    "Bm": [47, 54, 57, 61, 62],
    "G": [43, 50, 54, 57, 59],
    "A": [45, 55, 59, 62, 64],
}
prog = ["D", "Bm", "G", "A"] * 3
ROOT = {"D": 38, "Bm": 35, "G": 31, "A": 33}
ARP = [0, 2, 4, 3, 1, 3, 2, 4]

def drums_on(t):
    return 2.0 <= t < 11.0 or 15.0 <= t < 20.0

for b in range(11):
    t0 = b * BAR
    ch = CH[prog[b]]
    for i, m in enumerate(ch):
        place(music, pad_note(m, BAR), t0, 1.0, pan=(i - 2) * 0.25)
    top = [m + 12 for m in ch]
    for e in range(8):
        tt = t0 + e * BEAT / 2
        if b == 0 and e % 2:  # sparse intro
            continue
        if 14.0 <= tt < 15.0:  # breath before the reveal
            continue
        vel = (0.9 if e % 2 == 0 else 0.6) * rng.uniform(0.85, 1.0)
        place(music, epiano(top[ARP[e]], vel), tt + rng.uniform(0, 0.008), 1.0, pan=rng.uniform(-0.4, 0.4))
    if b >= 1 and not (14.0 <= t0 < 15.0):
        place(music, bass(ROOT[prog[b]], 1.4), t0)
        place(music, bass(ROOT[prog[b]] + 7, 0.4), t0 + 1.25, 0.6)
    for s in range(16):
        tt = t0 + s * BEAT / 4 + (0.02 if s % 2 else 0)
        if drums_on(tt) or 11.0 <= tt < 14.0:
            place(music, shaker(s % 4 == 2), tt, 1.0, pan=0.3)
    for q in range(4):
        tt = t0 + q * BEAT
        if drums_on(tt):
            if q in (0, 2):
                place(music, kick(), tt)
            if q in (1, 3):
                place(music, snap(), tt, 1.0, pan=-0.1)
        elif 11.0 <= tt < 14.0 and q in (1, 3):
            place(music, snap(), tt, 0.5)
    if drums_on(t0 + 1.25) and b % 2:
        place(music, kick(), t0 + 1.25, 0.6)

# riser into the reveal + final ring-out chord
place(music, noise_sweep(1.0, 400, 9000, "rise"), 14.0, 0.05)
for i, m in enumerate([74, 78, 81, 85, 86]):
    place(music, bell(m, 0.8, 1.5), 20.0 + i * 0.06, 1.0, pan=(i - 2) * 0.3)
place(music, kick(), 20.0, 0.8)

ir = make_ir()
music = reverb(music, 0.35, ir)
fade = np.ones(N)
fade[-int(0.8 * SR):] = np.linspace(1, 0, int(0.8 * SR)) ** 2
music *= fade

# ---------------------------------------------------------------- sfx
sfx = np.zeros((2, N))

def tap(f=950, g=1.0):
    t = t_(0.15)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + filt(rng.standard_normal(len(t)), "high", 3000) * np.exp(-t * 300) * 0.3) * g * 0.35

def drop():
    t = t_(0.4)
    f = 600 + 900 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.4

def pop():
    t = t_(0.12)
    f = 520 + 500 * (1 - np.exp(-t * 80))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.35

def thump():
    t = t_(0.6)
    return np.sin(2 * np.pi * 52 * t) * np.exp(-t * 6) * 0.4

def rustle(d):
    n = filt(rng.standard_normal(int(SR * d)), "band", [2200, 7500])
    tt = np.arange(len(n)) / SR
    am = (0.35 + 0.65 * np.abs(np.sin(tt * 2 * np.pi * 1.0))) * (0.6 + 0.4 * rng.random(len(n)).cumsum() % 1 * 0)
    env = np.minimum(tt / 0.3, 1) * np.minimum((d - tt) / 0.4, 1)
    return n * am * env * 0.07

# hook: each word lands on a beat
for i, t in enumerate((0.0, 0.5, 1.0)):
    place(sfx, tap(880 + i * 140), t + 0.02)
# soft whooshes on the wipes
for t in (2.0, 5.0, 8.0, 11.0, 18.0):
    place(sfx, noise_sweep(0.45, 500, 6000, "swell"), t - 0.15, 0.18, pan=-0.3)
place(sfx, rustle(3.0), 2.0)                      # satin ribbon
place(sfx, drop(), 6.0)                           # touch
place(sfx, noise_sweep(0.9, 300, 5000, "swell"), 8.05, 0.2)  # bloom
for i, m in enumerate((93, 97, 100)):
    place(sfx, bell(m, 0.5, 1.2), 8.45 + i * 0.09, 1.0, pan=(i - 1) * 0.5)
place(sfx, tap(420, 0.8), 11.05)                  # eye opens
for t in (13.07, 13.22):                          # blink
    place(sfx, tap(1300, 0.6), t)
place(sfx, noise_sweep(0.55, 300, 8000, "rise"), 13.45, 0.35)  # zoom into the pupil
place(sfx, thump(), 14.0, 0.8)
for i, t in enumerate((14.0, 14.27, 14.5, 14.73)):  # sense words land
    place(sfx, tap(700 + i * 120, 0.8), t, 1.0, pan=(-0.5, 0.5, -0.3, 0.3)[i])
for i, m in enumerate((86, 90, 93, 98)):          # certificate reveal
    place(sfx, bell(m, 0.9, 3.0), 15.0 + i * 0.045, 1.0, pan=(i - 1.5) * 0.3)
place(sfx, thump(), 15.0)
place(sfx, pop(), 19.5)                           # CTA button

sfx = reverb(sfx, 0.3, make_ir(1.6, 4.0, 7000))

def norm(x, peak_db):
    return x / np.abs(x).max() * 10 ** (peak_db / 20)

music = norm(music, -4.0)
sfx = norm(sfx, -8.0)  # moderate: a few dB under the music
for name, x in (("music", music), ("sfx", sfx)):
    wavfile.write(f"public/audio/{name}.wav", SR, (x.T * 32767).astype(np.int16))
print("ok")
