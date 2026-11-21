"""Sound for the habits teaser: voiceover (vo.mp3 at +0.2 s), pops, a thump on «срыв», beat.
Usage: python3 audio.py OUT.wav"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np
SR, DUR, VO_OFF = 44100, 23.6, 0.2
T = dict(ours=8.2, chart=15.6, end=19.7)
n = int(SR * DUR); out = np.zeros(n, np.float32); r = np.random.default_rng(5)
def add(sig, t, g=1.0):
    s = int(t * SR); e = min(n, s + len(sig))
    if s < n: out[s:e] += sig[:e - s] * g
def tone(f, d, dec):
    x = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * x) * np.exp(-x * dec) * np.clip(x / .003, 0, 1)
def pop(f=880): return tone(f, .12, 30) * .5 + tone(f * 1.5, .12, 40) * .3
def thump():
    x = np.arange(int(.4 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-x * 20)) / SR) * np.exp(-x * 8)
for t in (2.0, 2.75): add(pop(660), t, .7)
add(thump(), 4.1, .8); add(tone(330, .5, 5) * .3, 4.15)          # срыв
add(tone(392, .35, 6) * .3, 5.5); add(tone(311, .5, 5) * .3, 5.7)  # «−0 кг»
for d in (2.3, 4.0, 5.75, 6.6): add(pop(), T['ours'] + d)
add(tone(523.25, .8, 3) * .25, T['chart'] + 1.0); add(tone(659.25, .9, 3) * .2, T['chart'] + 1.6); add(tone(784, 1.0, 3) * .18, T['chart'] + 2.4)
add(tone(1046.5, 1.2, 3) * .25, T['end'] + .1); add(tone(1568, 1.0, 3) * .18, T['end'] + .25)
beat, t, k = .55, .2, 0
while t < DUR - .6:
    happy = t >= T['ours']
    xk = np.arange(int(.25 * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-xk * 30)) / SR) * np.exp(-xk * 10), t, .3 if happy else .2)
    if happy:
        hl = int(.04 * SR); add(np.diff(np.concatenate([[0], r.standard_normal(hl)])) * np.exp(-np.arange(hl) / (hl / 6)) * .06, t + beat / 2)
    chords = [261.63, 329.63, 392.0, 493.88] if happy else [220.0, 261.63, 196.0, 246.94]
    add(tone(chords[k % 4], .5, 5) * .07, t); t += beat; k += 1
out[-int(.6 * SR):] *= np.linspace(1, 0, int(.6 * SR))
out /= np.abs(out).max() / .85
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
