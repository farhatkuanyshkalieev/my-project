"""Synthesises the 21 s soundtrack for the reel (numpy only) and writes a 48 kHz stereo WAV.

Cues line up with the scene cuts in index.html: 0 city, 4.5 night, 8.5 homes,
13.5 district plan, 16.5 end card.
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 21.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(start, end, attack, release):
    e = np.clip((T - start) / attack, 0, 1) * np.clip((end + release - T) / release, 0, 1)
    return np.where((T >= start) & (T <= end + release), e, 0.0) ** 2


def band(sig, lo, hi):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(sig))


L = np.zeros(N)
R = np.zeros(N)


def add(sig, pan=0.0, gain=1.0):
    global L, R
    L += sig * gain * np.sqrt((1 - pan) / 2)
    R += sig * gain * np.sqrt((1 + pan) / 2)


# Chords: (start, end, bass, voices)
CHORDS = [
    (0.0, 4.5, 38, [57, 62, 66, 69, 76]),    # Dmaj9
    (4.5, 8.5, 35, [54, 59, 62, 66, 73]),    # Bm9
    (8.5, 13.5, 31, [55, 59, 62, 66, 69]),   # Gmaj7
    (13.5, 16.5, 33, [57, 62, 64, 66, 69]),  # A6sus
    (16.5, 21.0, 38, [62, 66, 69, 73, 76]),  # Dmaj9, lifted
]

pad = np.zeros(N)
padL = np.zeros(N)
padR = np.zeros(N)
for i, (s, e, bass, voices) in enumerate(CHORDS):
    ev = env(s, e, 0.9 if i else 0.4, 1.4)
    for j, m in enumerate(voices):
        f = hz(m)
        tone = sum(np.sin(2 * np.pi * f * (1 + d) * T + rng.uniform(0, 6.28)) for d in (-0.0035, 0, 0.0035))
        tone += 0.22 * np.sin(2 * np.pi * 2 * f * T) + 0.07 * np.sin(2 * np.pi * 3 * f * T)
        pan = -0.6 + 1.2 * j / (len(voices) - 1)
        padL += tone * ev * 0.045 * np.sqrt((1 - pan) / 2)
        padR += tone * ev * 0.045 * np.sqrt((1 + pan) / 2)
    b = np.sin(2 * np.pi * hz(bass) * T) + 0.25 * np.sin(2 * np.pi * hz(bass + 12) * T)
    pad += b * env(s, e, 0.6, 1.0) * 0.16
trem = 1 + 0.12 * np.sin(2 * np.pi * 0.25 * T)
L += padL * trem + pad
R += padR * trem + pad

# Arpeggio plucks (eighths at 100 bpm) from the night scene to the end card
step = 0.3
arp = np.zeros(N)
k = 0
t0 = 4.5
while t0 < 16.4:
    chord = next(c for c in CHORDS if c[0] <= t0 < c[1])
    m = chord[3][[0, 2, 4, 1, 3, 2][k % 6]] + 12
    n0 = int(t0 * SR)
    tt = T[: N - n0]
    note = (np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt / 0.32) + 0.3 * np.sin(2 * np.pi * 2 * hz(m) * tt) * np.exp(-tt / 0.12))
    arp[n0:] += note * (0.06 if t0 < 8.5 else 0.075)
    t0 += step
    k += 1
d = int(0.375 * SR)
arpL = arp.copy()
arpR = arp.copy()
arpR[d:] += 0.38 * arp[:-d]
arpL[2 * d:] += 0.22 * arp[: -2 * d]
L += arpL
R += arpR

# Soft heartbeat kick in the homes and plan scenes
for bt in np.arange(8.5, 16.4, 0.6):
    n0 = int(bt * SR)
    tt = T[: N - n0]
    f = 45 + 75 * np.exp(-tt / 0.05)
    kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.22)
    add(np.concatenate([np.zeros(n0), kick]), 0, 0.22)

# Whooshes into each cut
noise = rng.standard_normal(N)
for cut in (8.5, 13.5, 16.5):
    rise = np.clip((T - (cut - 0.7)) / 0.7, 0, 1) ** 2 * (T < cut) + np.exp(-(T - cut) / 0.12) * (T >= cut)
    w = band(noise * rise, 600, 6000) * 0.09
    add(w, -0.3, 1)
    add(np.roll(w, 900), 0.3, 1)

# Opening glint chime
for m, g_ in ((86, 0.05), (93, 0.03), (98, 0.018)):
    tt = np.clip(T - 0.25, 0, None)
    add(np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt / 1.2) * (T >= 0.25), 0.2, g_)

# End-card impact
tt = np.clip(T - 16.5, 0, None)
on = T >= 16.5
boom = np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-tt / 0.15)) / SR) * np.exp(-tt / 1.1) * on
add(boom, 0, 0.45)
add(band(noise * np.exp(-tt / 0.25) * on, 40, 900), 0, 0.18)
for m, g_ in ((86, 0.03), (93, 0.022), (102, 0.012)):
    add(np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt / 2.2) * on, 0.1, g_)

# Cheap reverb: convolve with a decaying noise tail
ir_len = int(2.2 * SR)
ir_t = np.arange(ir_len) / SR
size = 1 << int(np.ceil(np.log2(N + ir_len)))
for ch_i, ch in enumerate((L, R)):
    ir = np.random.default_rng(100 + ch_i).standard_normal(ir_len) * np.exp(-ir_t / 0.55)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = np.fft.irfft(np.fft.rfft(ch, size) * np.fft.rfft(ir, size), size)[:N]
    ch += 0.28 * wet

mix = np.stack([L, R], axis=1)
fade = np.clip(T / 0.15, 0, 1) * np.clip((DUR - T) / 1.6, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.2)
mix *= 0.89 / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else "out/music.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out)
