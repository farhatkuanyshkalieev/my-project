"""Sound for the stop-the-video teaser: voice pieces from vo.mp3, a click on every card, beat.
Usage: python3 audio.py OUT.wav"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np
SR, DUR = 44100, 18.0
T = dict(cards=4.8, ask=11.8, end=14.6); STEP = 0.2
VO = [(0.0, 4.45, 0.2), (5.40, 8.30, 11.9), (9.18, 11.84, 14.8)]   # (src start, src end, video start)
n = int(SR * DUR); out = np.zeros(n, np.float32); r = np.random.default_rng(3)
def add(sig, t, g=1.0):
    s = int(t * SR); e = min(n, s + len(sig))
    if s < n: out[s:e] += sig[:e - s] * g
def tone(f, d, dec):
    x = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * x) * np.exp(-x * dec) * np.clip(x / .003, 0, 1)
def click(): return tone(1800, .04, 160) * .25 + tone(900, .04, 120) * .15
add(tone(880, .15, 25) * .5, .25); add(tone(660, .2, 20) * .4, .4)          # stop sign
t = T['cards']
while t < T['ask'] - .01: add(click(), t); t += STEP                           # card flips
ln = int(.35 * SR); x = np.arange(ln) / SR                                     # stop whoosh
add(np.convolve(r.standard_normal(ln), np.ones(20) / 20, mode='same') * np.sin(np.pi * x / x[-1]) * .5, T['ask'] - .1)
add(tone(1046.5, 1.2, 3) * .25, T['end'] + .1); add(tone(1568, 1.0, 3) * .18, T['end'] + .25)
beat, t, k = .5, .2, 0
while t < DUR - .6:
    xk = np.arange(int(.25 * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-xk * 30)) / SR) * np.exp(-xk * 10), t, .35 if T['cards'] <= t < T['ask'] else .25)
    hl = int(.04 * SR); add(np.diff(np.concatenate([[0], r.standard_normal(hl)])) * np.exp(-np.arange(hl) / (hl / 6)) * .06, t + beat / 2)
    add(tone([293.66, 369.99, 440.0, 554.37][k % 4], .45, 5) * .07, t); t += beat; k += 1
out[-int(.6 * SR):] *= np.linspace(1, 0, int(.6 * SR))
out /= np.abs(out).max() / .85
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(Path(__file__).with_name('vo.mp3')), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'])
src = np.frombuffer(raw, np.float32); vo = np.zeros_like(out)
for s0, s1, v0 in VO:
    p = src[int(s0 * SR):int(s1 * SR)].copy(); f = int(.02 * SR)
    p[:f] *= np.linspace(0, 1, f); p[-f:] *= np.linspace(1, 0, f)
    a = int(v0 * SR); b = min(n, a + len(p)); vo[a:b] += p[:b - a]
env = np.sqrt(np.convolve(vo ** 2, np.ones(int(.05 * SR)) / int(.05 * SR), mode='same'))
kk = int(.25 * SR); act = np.convolve((env > .01).astype(np.float32), np.ones(kk) / kk, mode='same')
vo *= .9 / (np.abs(vo).max() + 1e-6)
mix = out * .5 * (1 - .6 * np.clip(act * 1.5, 0, 1)) + vo
mix /= max(1.0, np.abs(mix).max() / .95)
st = np.stack([mix, mix], 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('done')
