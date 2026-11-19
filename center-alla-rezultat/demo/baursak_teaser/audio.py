"""Sound for the baursak teaser: voiceover (vo.mp3 at +0.2 s), pops, stopwatch ticks, thumps, beat.
Scene times match T in index.html. Usage: python3 audio.py OUT.wav"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np
SR, DUR, VO_OFF = 44100, 20.6, 0.2
T = dict(c1=2.7, c2=4.6, c3=7.4, tw=10.5, lazy=14.5, end=17.4)
n = int(SR * DUR); out = np.zeros(n, np.float32); r = np.random.default_rng(2)
def add(sig, t, g=1.0):
    s = int(t * SR); e = min(n, s + len(sig))
    if s < n: out[s:e] += sig[:e - s] * g
def tone(f, d, dec):
    x = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * x) * np.exp(-x * dec) * np.clip(x / .003, 0, 1)
def pop(): return tone(880, .12, 30) * .5 + tone(1320, .12, 40) * .3
def tick(): return tone(2400, .02, 300) * .12
def thump():
    x = np.arange(int(.4 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-x * 20)) / SR) * np.exp(-x * 8)
add(pop(), .6); add(thump(), 1.1, .7)
for k in ('c1', 'c2', 'c3'):
    add(pop(), T[k] + .05)
    for i in range(12): add(tick(), T[k] + .7 + i * .12)
for i in range(3): add(pop(), T['tw'] + i * .15)
add(thump(), T['tw'] + .7, .7)
add(tone(523.25, .5, 4) * .3, T['lazy']); add(tone(659.25, .6, 4) * .3, T['lazy'] + .15)
add(tone(1046.5, 1.2, 3) * .25, T['end'] + .1); add(tone(1568, 1.0, 3) * .18, T['end'] + .25)
beat, t, k = .6, .3, 0
while t < DUR - .6:
    xk = np.arange(int(.25 * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-xk * 30)) / SR) * np.exp(-xk * 10), t, .35)
    hl = int(.04 * SR); add(np.diff(np.concatenate([[0], r.standard_normal(hl)])) * np.exp(-np.arange(hl) / (hl / 6)) * .06, t + beat / 2)
    add(tone([261.63, 329.63, 392.0, 493.88][k % 4], .5, 5) * .07, t); t += beat; k += 1
out[-int(.6 * SR):] *= np.linspace(1, 0, int(.6 * SR))
out /= np.abs(out).max() / .85
# voiceover + ducking
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(Path(__file__).with_name('vo.mp3')), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'])
src = np.frombuffer(raw, np.float32); vo = np.zeros_like(out)
a = int(VO_OFF * SR); b = min(n, a + len(src)); vo[a:b] = src[:b - a]
env = np.sqrt(np.convolve(vo ** 2, np.ones(int(.05 * SR)) / int(.05 * SR), mode='same'))
kk = int(.25 * SR); act = np.convolve((env > .01).astype(np.float32), np.ones(kk) / kk, mode='same')
vo *= .9 / (np.abs(vo).max() + 1e-6)
mix = out * .5 * (1 - .6 * np.clip(act * 1.5, 0, 1)) + vo
mix /= max(1.0, np.abs(mix).max() / .95)
st = np.stack([mix, mix], 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('done')
