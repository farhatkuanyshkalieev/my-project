"""Собирает звуковую дорожку: голос диктора + музыка + шум стадиона + свисток.

Использование: python3 build_audio.py out.wav
Тайминги сцен берутся из render.py, чтобы звук и картинка совпадали.
"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R

SR = 44100
rng = np.random.default_rng(2026)
N = int(R.TOTAL * SR) + SR


def read_wav(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    n = int(len(x) * SR / sr)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)


def place(track, sig, t0, gain=1.0):
    i = int(t0 * SR)
    track[i:i + len(sig)] += sig[:len(track) - i] * gain


def lowpass_noise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return x / np.abs(x).max()


# --- голос
voice = np.zeros(N, np.float32)
for name in R.ORDER:
    place(voice, read_wav(os.path.join(R.HERE, "audio", f"{name}.wav")), R.STARTS[name] + R.LEAD)
voice = voice / np.abs(voice).max() * 0.9

# --- музыка: Am - F - C - G, бас, мягкий бас-барабан и хэт
bpm = 104
beat = 60 / bpm
chords = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # root, triad (MIDI)
mtr = np.zeros(N, np.float32)
tt = np.arange(N) / SR
f_of = lambda m: 440 * 2 ** ((m - 69) / 12)
nbars = int(R.TOTAL / (beat * 4)) + 2
for b in range(nbars):
    root, tri = chords[b % 4]
    t0 = b * beat * 4
    i0, i1 = int(t0 * SR), min(N, int((t0 + beat * 4 + 0.4) * SR))
    if i0 >= N:
        break
    seg = tt[i0:i1] - t0
    env = np.minimum(seg / 0.5, 1) * np.exp(-np.maximum(seg - beat * 4, 0) * 6)
    pad = sum(np.sin(2 * np.pi * f_of(m) * seg) + 0.5 * np.sin(2 * np.pi * f_of(m) * 2.003 * seg) + 0.3 * np.sin(2 * np.pi * f_of(m + 12) * 0.998 * seg) for m in tri)
    mtr[i0:i1] += (pad * env * 0.045).astype(np.float32)
    for k in (0, 2):                                                # бас
        s0 = int((t0 + k * beat) * SR)
        sl = min(int(beat * 1.6 * SR), N - s0)
        if sl > 0:
            ts = np.arange(sl) / SR
            mtr[s0:s0 + sl] += (np.sin(2 * np.pi * f_of(root - 24) * ts) * np.exp(-ts * 3.5) * 0.28).astype(np.float32)
    for k in range(4):                                              # бас-барабан
        s0 = int((t0 + k * beat) * SR)
        sl = min(int(0.28 * SR), N - s0)
        if sl > 0:
            ts = np.arange(sl) / SR
            ph = 2 * np.pi * (50 * ts + 90 * (1 - np.exp(-ts * 30)) / 30)
            mtr[s0:s0 + sl] += (np.sin(ph) * np.exp(-ts * 14) * 0.5).astype(np.float32)
    for k in range(8):                                              # хэт
        s0 = int((t0 + (k + 0.5) * beat / 2) * SR)
        sl = min(int(0.05 * SR), N - s0)
        if sl > 0 and k % 2 == 1:
            ts = np.arange(sl) / SR
            mtr[s0:s0 + sl] += (np.diff(rng.standard_normal(sl + 1)) * np.exp(-ts * 90) * 0.05).astype(np.float32)

# приглушаем музыку под голосом (дакинг)
env = np.convolve(np.abs(voice), np.ones(int(0.12 * SR)) / int(0.12 * SR), "same")
duck = 1 - 0.62 * np.clip(env / 0.12, 0, 1)
duck = np.convolve(duck, np.ones(int(0.15 * SR)) / int(0.15 * SR), "same")
music = mtr * duck * 0.55

# --- шум стадиона: полоса голосов + медленные «волны» эмоций
crowd = lowpass_noise(N, 250, 1800) * 0.5
sw = 0.55 + 0.45 * np.sin(2 * np.pi * tt / 9 + 1) * np.sin(2 * np.pi * tt / 5.3)
crowd = crowd * sw * 0.07
for name, gain in (("opening", 0.07), ("outro", 0.10), ("title", 0.05)):    # всплески рёва трибун
    t0, T = R.STARTS[name], R.SCENE_T[name]
    sec = np.clip((tt - t0) / 1.5, 0, 1) * np.clip((t0 + T - tt) / 1.0, 0, 1)
    crowd += lowpass_noise(N, 300, 2500) * sec * gain
crowd *= (0.6 + 0.4 * duck)

# --- свисток в начале и «вжух» на стыках сцен
fx = np.zeros(N, np.float32)
w_t = np.arange(int(0.75 * SR)) / SR
whistle = np.sin(2 * np.pi * (2850 + 60 * np.sin(2 * np.pi * 28 * w_t)) * w_t) * np.minimum(w_t / 0.02, 1) * np.exp(-np.maximum(w_t - 0.5, 0) * 14)
place(fx, whistle.astype(np.float32), 0.15, 0.22)
for name in R.ORDER[1:]:
    t0 = R.STARTS[name] - 0.05
    sl = int(0.5 * SR)
    ts = np.arange(sl) / SR
    sw_ = lowpass_noise(sl, 400, 5000) * np.sin(np.pi * ts / 0.5) ** 2
    place(fx, sw_.astype(np.float32), t0, 0.10)

mix = voice + music + crowd + fx
mix[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))
fade = int(1.2 * SR)
end = int(R.TOTAL * SR)
mix[end - fade:end] *= np.linspace(1, 0, fade)
mix[end:] = 0
mix = mix / np.abs(mix).max() * 0.92
mix = mix[:end]
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("audio ok", round(R.TOTAL, 2), "s")
