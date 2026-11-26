"""Синтез саундтрека: lo-fi бит + все звуковые эффекты, расставленные по timeline.json.
Только numpy. Результат: public/mix.wav (44.1 кГц, стерео, 16 бит)."""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, 'src', 'timeline.json'), encoding='utf-8'))
SR = 44100
FPS = T['fps']
DUR = T['total'] / FPS + 1.5
N = int(DUR * SR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
fx = np.zeros((N, 2))


def t_(n):
    return np.arange(n) / SR


def fr(frame):
    return frame / FPS


def place(bus, sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        sig = np.stack([sig * l, sig * r], 1)
    n = min(len(sig), N - i)
    bus[i:i + n] += sig[:n] * gain


def fft_filter(x, lo=None, hi=None, slope=0.15):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if hi:
        m *= 1 / (1 + (f / hi) ** (2 / slope * 0.1 + 2))
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a=0.002, d=0.1):
    t = t_(n)
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def sweep(f0, f1, n, curve=1.0):
    k = np.linspace(0, 1, n) ** curve
    f = f0 * (f1 / f0) ** k
    return np.cumsum(f) / SR * 2 * np.pi


def square(phase, duty=0.5):
    return np.where((phase / (2 * np.pi)) % 1 < duty, 1.0, -1.0)


# ---------------- инструменты ----------------

def kick():
    n = int(0.45 * SR)
    s = np.sin(sweep(140, 45, n, 0.35)) * env(n, 0.001, 0.16)
    return np.tanh(s * 2.2) * 0.9


def snare():
    n = int(0.25 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=1500, hi=8000) * env(n, 0.001, 0.06)
    tone = np.sin(2 * np.pi * 190 * t_(n)) * env(n, 0.001, 0.04)
    return (noise * 0.6 + tone * 0.5) * 0.8


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    s = fft_filter(rng.standard_normal(n), lo=7000) * env(n, 0.0005, 0.06 if open_ else 0.012)
    return s * 0.35


def pad_chord(freqs, dur):
    n = int(dur * SR)
    t = t_(n)
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.25, 0.0, 0.3):
            ph = 2 * np.pi * f * (1 + det / 100) * t + rng.random() * 6
            s += (2 * ((ph / (2 * np.pi)) % 1) - 1)  # пила
    s = fft_filter(s, hi=1100)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.2)
    wobble = 1 + 0.004 * np.sin(2 * np.pi * 0.6 * t)  # «плёночный» дрейф уже в громкости
    return s * a * wobble * 0.05


def bass(f, dur):
    n = int(dur * SR)
    t = t_(n)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t / (dur * 0.9)) * 0.45


def crackle(n):
    s = np.zeros(n)
    idx = rng.integers(0, n, n // 2500)
    s[idx] = rng.standard_normal(len(idx)) * 0.5
    hiss = fft_filter(rng.standard_normal(n), lo=3000, hi=9000) * 0.012
    return fft_filter(s, lo=1000) * 0.4 + hiss


# ---------------- эффекты ----------------

def click():
    n = int(0.03 * SR)
    noise = fft_filter(rng.standard_normal(n), lo=2500, hi=9000) * env(n, 0.0003, 0.004)
    tone = np.sin(2 * np.pi * (1600 + rng.random() * 600) * t_(n)) * env(n, 0.0003, 0.006)
    return (noise * 0.7 + tone * 0.3) * (0.5 + rng.random() * 0.25)


def thock():
    n = int(0.12 * SR)
    s = np.sin(sweep(900, 260, n, 0.4)) * env(n, 0.0005, 0.03)
    s += fft_filter(rng.standard_normal(n), lo=1500, hi=5000) * env(n, 0.0003, 0.006) * 0.5
    return s * 0.7


def pop():
    n = int(0.15 * SR)
    s = np.sin(sweep(1100, 280, n, 0.3)) * env(n, 0.0005, 0.04)
    return s * 0.6


def whoosh(dur=0.5, up=True):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    lowp = fft_filter(noise, hi=700)
    highp = fft_filter(noise, lo=2500, hi=9000)
    k = np.linspace(0, 1, n)
    mix = k if up else 1 - k
    shape = np.sin(np.pi * k) ** 1.6
    s = (lowp * (1 - mix) * 1.6 + highp * mix * 0.6) * shape
    return np.stack([s * (1 - k * 0.8), s * (0.2 + k * 0.8)], 1) * 0.9  # панорама слева направо


def ping(step):
    base = 660 * 2 ** (step * 2 / 12)
    out = []
    for f, d in ((base, 0.06), (base * 1.5, 0.16)):
        n = int(d * SR)
        out.append(square(2 * np.pi * f * t_(n), 0.25) * env(n, 0.001, d * 0.6))
    return np.concatenate(out) * 0.22


def glitch():
    n = int(0.16 * SR)
    s = rng.standard_normal(n)
    s = np.repeat(s[::40], 40)[:n]  # даунсэмплинг-хруст
    s += square(sweep(2000, 300, n, 0.5), 0.3) * 0.5
    gate = np.repeat(rng.random(n // 600 + 1) > 0.35, 600)[:n]
    s = np.round(s * 4) / 4 * gate
    return s * env(n, 0.0005, 0.08) * 0.35


def impact(dur=1.6):
    n = int(dur * SR)
    sub = np.sin(sweep(160, 38, n, 0.25)) * env(n, 0.001, 0.45)
    body = fft_filter(rng.standard_normal(n), hi=1800) * env(n, 0.001, 0.12)
    return np.tanh((sub * 1.4 + body * 0.8) * 1.8) * 0.85


def riser(dur):
    n = int(dur * SR)
    k = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    a = fft_filter(noise, lo=300, hi=1500)
    b = fft_filter(noise, lo=3000, hi=10000)
    s = (a * (1 - k) + b * k) * k ** 2 * 0.9
    s += np.sin(sweep(180, 1400, n, 1.4)) * k ** 2.5 * 0.18
    return s


def save_jingle():
    notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    out = []
    for i, f in enumerate(notes):
        d = 0.07 if i < len(notes) - 1 else 0.5
        n = int(d * SR)
        t = t_(n)
        vib = 1 + (0.012 * np.sin(2 * np.pi * 7 * t) if i == len(notes) - 1 else 0)
        ph = np.cumsum(2 * np.pi * f * vib / SR)
        tone = square(ph, 0.5) * 0.6 + square(ph * 0.5, 0.25) * 0.3
        out.append(tone * env(n, 0.001, d * (0.9 if i < len(notes) - 1 else 0.35)))
    return np.concatenate(out) * 0.25


def star():
    n = int(0.22 * SR)
    s = square(sweep(1800, 3600, n, 0.6), 0.5) * env(n, 0.001, 0.07)
    return s * 0.12


# ---------------- партитура ----------------

typ = T['typing']
for key, item in typ.items():
    for i, ch in enumerate(item['text']):
        if ch in ' \n':
            continue
        place(fx, click(), fr(item['start'] + i * item['fpc']), pan=rng.uniform(-0.3, 0.3), gain=0.9)

for p in T['bgIconPops']:
    place(fx, pop(), fr(p), gain=0.45)
for i, p in enumerate(T['carouselPops']):
    place(fx, pop(), fr(p), pan=np.cos(i / 10 * 2 * np.pi) * 0.7, gain=0.6)
for i, p in enumerate(T['carouselPops']):
    if i % 3 == 0:
        place(fx, star(), fr(p), gain=0.8)

place(fx, whoosh(0.55, True), fr(T['swipe']['start']) - 0.08, gain=1.0)
place(fx, whoosh(0.9, True), fr(T['scenes']['s3']) + 0.6, gain=0.4)  # раскрутка карусели
place(fx, whoosh(0.7, False), fr(T['carouselFlyOut']), gain=1.0)
for g in T['glitches']:
    place(fx, glitch(), fr(g), gain=1.0)

for i, d in enumerate(T['drops']):
    place(fx, whoosh(0.3, False), fr(d), gain=0.35)
    land = fr(d + T['dropFall'])
    place(fx, thock(), land, gain=0.8)
    place(fx, ping(i), land + 0.01, gain=1.0)
    place(fx, star(), land, gain=0.6)

s5, s6, s7, s8 = (fr(T['scenes'][k]) for k in ('s5', 's6', 's7', 's8'))
place(fx, whoosh(0.6, True), s5 - 0.05, gain=0.6)
place(fx, riser(s6 - s5 - 0.4), s5 + 0.4, gain=0.9)
place(fx, impact(1.8), s6, gain=1.0)
place(fx, whoosh(0.8, True), fr(T['scenes']['s6'] + 8), gain=0.7)  # пролёт книги

for l in T['letters']:
    place(fx, whoosh(0.18, True), fr(l), gain=0.3)
    place(fx, thock(), fr(l) + 0.2, gain=0.9)
place(fx, pop(), fr(T['dot']), gain=0.7)

place(fx, impact(2.2), fr(T['saveSlam']), gain=1.1)
place(fx, save_jingle(), fr(T['saveSlam']) + 0.12, gain=1.0)
place(fx, thock(), fr(T['check']), gain=0.8)

# lo-fi бит: 96 BPM, Fmaj7 – Em7 – Dm7 – Cmaj7
BPM = 96
beat = 60 / BPM
start = fr(T['typing']['ans']['start']) - beat  # бит входит на ответе «нисколько.»
chords = [[174.6, 220.0, 261.6, 329.6], [164.8, 196.0, 246.9, 293.7], [146.8, 174.6, 220.0, 261.6], [130.8, 164.8, 196.0, 246.9]]
roots = [43.65, 41.2, 36.71, 32.7]
drop_from, drop_to = s6, s7          # брейк на взрыве
stop_at = s8                         # бит обрывается на «сохранено.»


def beat_on(t):
    return t < stop_at and not (drop_from - 0.05 <= t < drop_to)


t = start
b = 0
while t < stop_at:
    bar = b // 4
    pos = b % 4
    if pos == 0:
        ch = chords[bar % 4]
        place(music, pad_chord(ch, beat * 4), t, gain=1.0)
        place(music, bass(roots[bar % 4] * 2, beat * 1.5), t, gain=0.9)
    if pos == 2:
        place(music, bass(roots[bar % 4] * 2, beat * 1.2), t + beat * 0.5, gain=0.7)
    if beat_on(t):
        if pos in (0,) or (pos == 2 and b % 8 == 2):
            place(music, kick(), t, gain=1.0)
        if pos == 2 and b % 8 == 6:
            place(music, kick(), t + beat * 0.5, gain=0.8)
        if pos in (1, 3):
            place(music, snare(), t + 0.012, gain=0.9)
        for h in range(2):
            ht = t + h * beat * 0.5 + (0.04 if h else 0)  # свинг
            place(music, hat(open_=(pos == 3 and h == 1)), ht, pan=0.25, gain=0.8 if h == 0 else 0.5)
    t += beat
    b += 1

# в брейке пэд и бас глушим, оставляя хвост
k0, k1 = int((drop_from + 0.02) * SR), int(drop_to * SR)
music[k0:k1] *= np.linspace(0.15, 0.05, k1 - k0)[:, None]
music[int(stop_at * SR):] = 0

# тихий «воздух» в начале + треск винила на всём ролике
room = fft_filter(rng.standard_normal(N), hi=400) * 0.03
place(music, room, 0)
place(music, crackle(int((stop_at) * SR)), 0, gain=0.8)

# лоу-фай «ламповость» на музыке
for c in range(2):
    music[:, c] = fft_filter(music[:, c], hi=6500)

# простая реверберация на эффектах
ir_n = int(1.2 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-t_(ir_n) / 0.25)
ir = fft_filter(ir, hi=5000)
ir /= np.abs(ir).sum() / 8
L = 1 << int(np.ceil(np.log2(N + ir_n)))
IR = np.fft.rfft(ir, L)
for c in range(2):
    wet = np.fft.irfft(np.fft.rfft(fx[:, c], L) * IR, L)[:N]
    fx[:, c] += wet * 0.18

# сайдчейн: музыка проседает под ударами
duck = np.ones(N)
for at in (s6, fr(T['saveSlam'])):
    i = int(at * SR)
    n = min(int(0.6 * SR), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.7 * np.exp(-t_(n) / 0.2))

mix = music * duck[:, None] * 0.85 + fx
mix = np.tanh(mix * 1.1)
mix /= np.abs(mix).max() / 0.92
mix = mix[: int(T['total'] / FPS * SR) + int(0.0 * SR)]
fade = int(0.05 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

os.makedirs(os.path.join(ROOT, 'public'), exist_ok=True)
out = os.path.join(ROOT, 'public', 'mix.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', out, round(len(mix) / SR, 2), 's')
