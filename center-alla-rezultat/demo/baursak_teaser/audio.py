"""Sound for the chat teaser: message pops, send whooshes, typing ticks, block sound, light beat.
Usage: python3 audio.py OUT.wav"""
import sys, wave
import numpy as np
SR, DUR = 44100, 16.0
n = int(SR * DUR); out = np.zeros(n, np.float32); r = np.random.default_rng(2)
def add(sig, t, g=1.0):
    s = int(t * SR); e = min(n, s + len(sig))
    if s < n: out[s:e] += sig[:e - s] * g
def tone(f, d, dec):
    x = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * x) * np.exp(-x * dec) * np.clip(x / .003, 0, 1)
def pop_in():   return tone(880, .12, 30) * .5 + tone(1320, .12, 40) * .3
def pop_out():
    ln = int(.18 * SR); x = np.arange(ln) / SR
    f = 500 + 900 * (x / x[-1])
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14) * .35
def tick():     return tone(2400, .02, 300) * .12
# card pops and stopwatch ticks
for t in [0.6, 2.2, 4.6, 7.0]:
    add(pop_in(), t + .05)
for t0 in [2.9, 5.3, 7.7]:
    for k in range(12): add(tick(), t0 + k * .12)
for t in [9.4, 9.55, 9.7]: add(pop_out(), t)
# drop on the baursak and the total
x = np.arange(int(.4 * SR)) / SR
add(np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-x * 20)) / SR) * np.exp(-x * 8), 1.1, .8)
add(np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-x * 20)) / SR) * np.exp(-x * 8), 10.1, .8)
# relief at «или просто полежать»
add(tone(523.25, .5, 4) * .3, 11.4); add(tone(659.25, .6, 4) * .3, 11.55)
# end chime
add(tone(1046.5, 1.2, 3) * .25, 13.3); add(tone(1568, 1.0, 3) * .18, 13.45)
# light beat 100 bpm under everything
beat = .6; t = .3; k = 0
while t < DUR - .6:
    xk = np.arange(int(.25 * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-xk * 30)) / SR) * np.exp(-xk * 10), t, .35)
    hl = int(.04 * SR); add(np.diff(np.concatenate([[0], r.standard_normal(hl)])) * np.exp(-np.arange(hl) / (hl / 6)) * .06, t + beat / 2)
    chord = [261.63, 329.63, 392.0, 493.88][k % 4]
    add(tone(chord, .5, 5) * .07, t); t += beat; k += 1
out[-int(.6 * SR):] *= np.linspace(1, 0, int(.6 * SR))
out /= np.abs(out).max() / .85
st = np.stack([out, out], 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('done')
