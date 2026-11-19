"""Sound for the toi teaser: voiceover (vo.mp3 at +0.2 s), pops, stopwatch ticks, thumps, beat.
Scene times match T in index.html. Usage: python3 audio.py OUT.wav"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np
SR, DUR, VO_OFF = 44100, 20.4, 0.2
T = dict(dress=2.6, zip=6.0, count=8.7, zipped=13.1, end=15.4)
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
def zipsound(d, up=True):
    ln = int(d * SR); x = np.arange(ln) / SR
    clicks = (np.sin(2 * np.pi * (60 if up else 30) * x * (1 + x / d)) > .9).astype(np.float32)
    return clicks * r.standard_normal(ln).astype(np.float32) * .35 * np.exp(-((x - d / 2) / d) ** 2)
add(pop(), .1); add(pop(), .25)                       # notification
add(tone(700, .12, 25) * .3, T['dress'] + .1)         # hanger
for k in range(3): add(zipsound(.25, up=False), T['zip'] + .7 + k * .45)   # zipper stuck
add(thump(), T['zip'] + 1.6, .6)
for i in range(16): add(tick(), T['count'] + .3 + i * .21)                 # countdown
for i in range(9): add(pop(), T['count'] + 2.2 + i * .19, .6)              # sessions
add(zipsound(.7), T['zipped'] + .2)                                        # zip up!
for i in range(3): add(pop(), T['zipped'] + .9 + i * .12)
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
