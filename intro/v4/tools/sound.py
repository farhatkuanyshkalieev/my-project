"""THERMINAL intro v3: atmospheric music bed + sound effects, all derived from timeline.json.
No samples, no voice, no rhythmic pulse. The customer's voice is meant to sit on top later.

    python3 tools/sound.py

Writes exports/audio/THERMINAL_intro_v4_mix.wav (9.0 s, faded end), ..._mix_tail.wav,
exports/audio/stems/0N_<group>.wav, assets/audio/intro_v4_mix.mp3 and assets/audio/cues.json.
Needs numpy, scipy, ffmpeg.
"""
import json, pathlib, subprocess, wave, re
import numpy as np
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'timeline.json').read_text(encoding='utf-8'))
A = TL['audio']
SR, DUR, TAIL = A['sampleRate'], TL['duration'], A['tail']
N = int((DUR + TAIL) * SR)
rng = np.random.default_rng(20261105)
CUES = []
cue = lambda t, name, stem: CUES.append({'t': round(t, 3), 'name': name, 'stem': stem})

# ---------------------------------------------------------------- primitives
tt = lambda n: np.arange(n) / SR
noise = lambda n: rng.standard_normal(n)
db = lambda x: 10 ** (x / 20)


def mixs(*xs):
    """sum mono arrays of different length"""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out


def filt(x, kind, f, order=2):
    if kind == 'bp':
        return signal.sosfilt(signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], 'bandpass', output='sos'), x)
    return signal.sosfilt(signal.butter(order, f / (SR / 2), kind, output='sos'), x)


def sweep_bp(x, f0, f1, q=2.0, curve=1.0):
    n = len(x); k = np.linspace(0, 1, n) ** curve
    g = np.tan(np.pi * (f0 * (f1 / f0) ** k) / SR); r = 1 / q
    y = np.zeros(n); s1 = s2 = 0.0
    for i in range(n):
        gi = g[i]; hp = (x[i] - (r + gi) * s1 - s2) / (1 + r * gi + gi * gi)
        bp = gi * hp + s1; s1 = gi * hp + bp; lp = gi * bp + s2; s2 = gi * bp + lp; y[i] = bp
    return y


def env(n, a, d, shape=4.0):
    t = tt(n)
    return np.where(t < a, np.sin(np.pi / 2 * t / max(a, 1e-4)) ** 2, np.exp(-(t - a) * shape / max(d, 1e-4)))


def pan(x, p):
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def pan_glide(x, p0, p1):
    a = (np.linspace(p0, p1, len(x)) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def reverb(st, seconds=2.0, damp=6000, wet=0.3, pre=0.012):
    n = int(seconds * SR); e = np.exp(-np.linspace(0, 1, n) * 6.5); irs = []
    for _ in range(2):
        ir = np.concatenate([np.zeros(int(pre * SR)), filt(noise(n), 'low', damp) * e]); irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return st * (1 - wet) + np.stack([signal.fftconvolve(st[c], irs[c])[:st.shape[1]] for c in range(2)]) * wet


class Bus:
    def __init__(self, name): self.name, self.buf = name, np.zeros((2, N))
    def add(self, st, t, g=0.0):
        i = int(max(0, t) * SR)
        if i >= N: return
        st = st[:, :N - i]; self.buf[:, i:i + st.shape[1]] += st * db(g)


music, cuts, text, gfx, trans, logo = (Bus(n) for n in ['music', 'cuts', 'text', 'graphics', 'transitions', 'logo'])

# ---------------------------------------------------------------- sound vocabulary
def tick(freq, length=0.2, bright=1.0, air=True):
    n = int(length * SR); t = tt(n)
    out = filt(noise(n), 'bp', (2200, 7500)) * env(n, 0.0008, 0.02, 5) * 0.5 * bright
    out += (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t)) * env(n, 0.003, length, 5.5) * 0.32
    if air:
        pre = int(0.1 * SR); out = np.concatenate([filt(noise(pre), 'bp', (3000, 9000)) * np.linspace(0, 1, pre) ** 2 * 0.1, out])
    return out, (0.1 if air else 0.0)


def thump(f0=70, f1=42, length=0.6, click=0.3):
    n = int(length * SR); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * 14)) / SR) * env(n, 0.004, length, 4.5)
    return x + filt(noise(n), 'bp', (1500, 6000)) * env(n, 0.0005, 0.015, 6) * click


def air_puff(length=0.35, lo=1500, hi=9000, rev=False):
    n = int(length * SR); x = filt(noise(n), 'bp', (lo, hi)) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return x[::-1] * np.linspace(0.3, 1, n) if rev else x


def whoosh(length, f0, f1, q=1.4):
    n = int(length * SR)
    return sweep_bp(noise(n), f0, f1, q, 0.8) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5


def shimmer(length=0.8, base=2637):
    n = int(length * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * base * r * t + rng.uniform(0, 6)) * env(n, 0.01, length * d, 5) * a
               for r, d, a in [(1, 1, .1), (1.335, .8, .07), (1.5, .7, .06), (2.0, .6, .04)])


def latch():
    """metallic bolt: two short damped resonances + low knock"""
    n = int(0.5 * SR); t = tt(n)
    knock = thump(90, 50, 0.35, 0.6)
    ring = sum(np.sin(2 * np.pi * f * t) * env(n, 0.001, d, 6) * a for f, d, a in [(820, .25, .25), (1370, .18, .18), (2310, .12, .12)])
    k2 = np.zeros(n); off = int(0.07 * SR); k2[off:] = (filt(noise(n - off), 'bp', (800, 3500)) * env(n - off, 0.0005, 0.03, 6) * 0.6)
    return mixs(knock, ring, k2)


def glass_ping():
    n = int(1.2 * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * f * t) * env(n, 0.002, d, 5) * a for f, d, a in [(3520, 1.0, .16), (5274, .7, .1), (7040, .5, .06)])


# ---------------------------------------------------------------- music bed (atmospheric, no pulse)
def note(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)


def pad(chord, length, cutoff0, cutoff1, gain=1.0):
    n = int(length * SR); t = tt(n); x = np.zeros(n)
    for m in chord:
        f = note(m)
        for det in (-0.06, 0.0, 0.07):
            ph = rng.uniform(0, 6)
            saw = 2 * ((f * (1 + det / 100 * 12) * t + ph / 6) % 1) - 1
            x += saw * 0.12 + np.sin(2 * np.pi * f * (1 + det / 100) * t + ph) * 0.25
    # slow filter opening, done in blocks
    out = np.zeros(n); blk = 2048
    for i in range(0, n, blk):
        c = cutoff0 + (cutoff1 - cutoff0) * (i / n)
        out[i:i + blk] = filt(x[max(0, i - 4096):i + blk], 'low', c, 2)[-len(x[i:i + blk]):]
    return out / len(chord) * gain


# chord plan (midi): D minor colour -> Bb -> F/A -> resolve on F major add9 at the logo
chords = [(0.0, 3.0, [50, 57, 62, 64, 69], 500, 1100),      # Dm(add9)
          (2.75, 4.75, [46, 53, 58, 62, 69], 700, 1300),     # Bbmaj7 under the sheet
          (4.75, 6.0, [43, 50, 55, 58, 65], 450, 650),       # Gm, darker under the hook
          (5.9, 8.4, [45, 53, 57, 60, 64], 800, 1900),       # F/A, opens up on the products
          (8.2, 10.0, [41, 53, 57, 60, 67], 1200, 900)]      # Fadd9, warm resolve on the logo
for a, b, ch, c0, c1 in chords:
    L = b - a + 0.8
    x = pad(ch, L, c0, c1)
    n = len(x); fade = np.minimum(1, np.minimum(np.arange(n) / (0.6 * SR), (n - np.arange(n)) / (0.7 * SR)))
    x = x * fade
    music.add(np.stack([x, np.roll(x, 240)]), a - 0.1, 0)
nb = N
air = filt(noise(nb), 'bp', (2500, 7000)) * 0.05 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * tt(nb)))
sub = np.zeros(nb)
for a, b, ch, _, _ in chords:
    i0, i1 = int(max(0, a) * SR), min(nb, int((b + 0.5) * SR)); tl = tt(i1 - i0)
    sub[i0:i1] += np.sin(2 * np.pi * note(ch[0] - 12) * tl) * np.minimum(1, np.minimum(tl / 0.5, (tl[-1] - tl) / 0.5)) * 0.35
mus_env = np.clip(tt(nb) / 1.2, 0, 1) ** 1.5
# duck under the hook, lift on the products, settle on the logo
mus_env *= 1 - 0.35 * np.exp(-((tt(nb) - 5.1) / 0.45) ** 2) + 0.18 * np.exp(-((tt(nb) - 6.6) / 0.8) ** 2)
music.buf += np.stack([air + sub, air[::-1] + sub]) * mus_env
music.buf *= mus_env
music.buf = reverb(music.buf, 3.0, 5000, 0.45)
cue(0.0, 'Музыкальная основа: Dm(add9) → B♭ → Gm под хуком → F/A → F(add9) на знаке', '01_music')

# ---------------------------------------------------------------- cuts (each cut has its own sound by type)
shots = TL['shots']
for s in shots:
    t0, kind = s['from'], s['cut']
    if kind == 'flyin':
        land = s['object'][1]['t']
        n = int((land - 0.05) * SR); w = sweep_bp(noise(n), 180, 5200, 1.3, 2.4) * np.linspace(0, 1, n) ** 3.2
        trans.add(pan_glide(w, 0.45, 0), 0.05, -11)
        cuts.add(pan(mixs(thump(70, 36, 1.8, 0.4), shimmer(1.4, 2093) * 0.6), 0), land, -8)
        gfx.add(reverb(pan(shimmer(2.0, 3520) * 0.35, -0.2), 2.5, 9000, 0.5), 0.0, -24)
        cue(0.05, 'Подлёт из космоса: нарастающий свист', '05_transitions'); cue(land, 'Приземление профиля: удар и блеск', '02_cuts')
    elif kind == 'start':
        cuts.add(pan(thump(64, 38, 1.6, 0.0) * 0.9, 0), t0, -9); cue(t0, 'Начало: мягкий низкий удар', '02_cuts')
    elif kind == 'hard':
        cuts.add(pan(thump(80, 50, 0.3, 0.5) * 0.6, 0), t0, -17); cue(t0, f'Склейка в {s["id"]}: короткий щелчок', '02_cuts')
    elif kind == 'dark-light':
        cuts.add(reverb(pan(air_puff(0.32), 0.1), 0.8, 8000, 0.25), t0 - 0.06, -16); cue(t0, f'Склейка тёмный→светлый в {s["id"]}: воздух', '02_cuts')
    elif kind == 'light-dark':
        cuts.add(pan(air_puff(0.3, 600, 4000, rev=True), -0.1), t0 - 0.24, -18); cuts.add(pan(thump(60, 40, 0.5, 0.2), 0), t0, -15)
        cue(t0, f'Склейка светлый→тёмный в {s["id"]}: обратный воздух и удар', '02_cuts')
    elif kind == 'whip':
        trans.add(pan_glide(whoosh(0.32, 400, 4200), 0.3, -0.2), t0 - 0.14, -12); cue(t0, 'Резкий наезд сверху: свист', '05_transitions')
    elif kind == 'flash':
        fl = TL['flashes'][0]['t']
        n = int(0.42 * SR); r = sweep_bp(noise(n), 300, 7000, 1.6, 1.6) * np.linspace(0, 1, n) ** 2.6
        trans.add(np.stack([r, r[::-1] * 0.4 + r * 0.6]), fl[1] - 0.42, -13)
        hit = mixs(thump(50, 38, 1.2, 0.0), shimmer(1.2, 2637) * 0.8, filt(noise(int(1.2 * SR)), 'bp', (1500, 9000)) * env(int(1.2 * SR), 0.002, 0.3, 6) * 0.3)
        trans.add(reverb(pan(hit, 0), 2.2, 7500, 0.42), fl[1], -10); cue(fl[1], 'Засветка в лист: подъём и воздушный удар', '05_transitions')
    elif kind == 'match':
        trans.add(reverb(pan(mixs(thump(56, 36, 0.9, 0.1), shimmer(0.6, 1760) * 0.5), 0), 1.6, 5000, 0.3), t0, -10)
        n = int(0.58 * SR); z = sweep_bp(noise(n), 300, 2600, 1.2, 2.0) * np.linspace(0, 1, n) ** 2
        trans.add(pan(z, 0), t0 - 0.58, -16); cue(t0, 'Склейка по форме: наезд в зону и глухой удар', '05_transitions')

# 3D glints: metallic shine
for s in shots:
    if s['type'] == '3d' and s.get('glint', 0) >= 1.2:
        mid = (s['from'] + s['to']) / 2
        gfx.add(reverb(pan(shimmer(0.7, 3136) * 0.6, 0.2), 1.2, 9000, 0.3), mid - 0.15, -20)
        cue(mid - 0.15, f'Блик по алюминию в {s["id"]}', '04_graphics')

# ---------------------------------------------------------------- text
base = [1318.5, 1568.0, 1760.0, 1975.5]
for k, tx in enumerate(TL['texts']):
    st = tx['style']
    for i, w in enumerate(tx['words']):
        if st == 'hook':
            if '?' in w['text']:
                text.add(pan(latch(), 0), w['t'], -9); text.add(pan(thump(48, 34, 1.0, 0.0), 0), w['t'], -10)
                cue(w['t'], f'Хук «{w["text"]}»: удар и щелчок засова', '03_text')
            elif w['text'].endswith('.'):
                x, pre = tick(1046.5, 0.5, 0.4); text.add(reverb(pan(mixs(x, air_puff(0.5, 2000, 8000) * 0.5), 0), 1.6, 6000, 0.35), w['t'] - pre, -12)
                cue(w['t'], f'Ответ «{w["text"]}»: мягкий выдох', '03_text')
            else:
                text.add(pan(thump(70, 45, 0.4, 0.6) * 0.8, 0), w['t'], -13); cue(w['t'], f'Хук «{w["text"]}»: акцент', '03_text')
            continue
        f = base[i % 4] * (0.75 if st in ('small', 'top', 'tag', 'sub') else 1.0)
        length, bright, g = {'cap': (0.22, 1.0, -15), 'small': (0.16, 0.6, -21), 'top': (0.18, 0.8, -18),
                             'tag': (0.12, 0.5, -23), 'word': (0.3, 0.6, -19), 'sub': (0.14, 0.5, -24)}[st]
        x, pre = tick(f, length, bright)
        text.add(reverb(pan(x, -0.3 + 0.12 * i), 1.2, 6500, 0.25), w['t'] - pre, g)
        cue(w['t'], f'Текст «{w["text"]}»', '03_text')

# ---------------------------------------------------------------- graphics
def snap(g=1.0):
    n = int(0.08 * SR)
    return (filt(noise(n), 'bp', (1800, 5200)) * env(n, 0.0005, 0.03, 6) + np.sin(2 * np.pi * 620 * tt(n)) * env(n, 0.001, 0.05, 6) * 0.4) * g


for gr in TL['graphics']:
    ty = gr['type']
    if ty == 'arrow':
        a, b = gr['draw']; n = int((b - a + 0.12) * SR)
        sw = sweep_bp(noise(n) * (0.6 + 0.4 * np.abs(filt(noise(n), 'low', 30))), 1100, 4200, 3.0, 0.8) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
        gfx.add(pan_glide(sw, -0.4, 0.2), a, -14); cue(a, 'Стрелка: шорох пера', '04_graphics')
    elif ty == 'callout':
        n = int(0.16 * SR); pop = np.sin(2 * np.pi * np.cumsum(1300 - 500 * np.linspace(0, 1, n)) / SR) * env(n, 0.002, 0.12, 5)
        gfx.add(reverb(pan(pop, 0.15), 0.9, 7000, 0.2), gr['t'], -17)
        n = int(0.34 * SR); gfx.add(pan(sweep_bp(noise(n), 2500, 5500, 4, 1) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.45, 0.2), gr['t'] + 0.06, -24)
        cue(gr['t'], f'Выноска «{" ".join(gr["label"])}»', '04_graphics')
    elif ty == 'brackets':
        for i in range(4): gfx.add(pan(snap(0.7), -0.3 + 0.2 * i), gr['t'] + 0.04 * i, -20)
        cue(gr['t'], 'Рамка-прицел вокруг камеры: четыре щелчка', '04_graphics')
    elif ty == 'tagline':
        x, _ = tick(2093, 0.12, 0.5, air=False); gfx.add(pan(x, -0.3), gr['t'], -23)
    elif ty == 'rule':
        n = int(0.4 * SR); gfx.add(pan(sweep_bp(noise(n), 3000, 6000, 4, 1) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.35, 0), gr['t'], -26)
    elif ty == 'logo':
        n = int(3.2 * SR); t = tt(n); bell = np.zeros(n)
        for b0, am in [(349.23, 1.0), (523.25, 0.55), (659.25, 0.35)]:
            for r, a, d in [(1, 1, 2.4), (2.0, .3, 1.3), (2.76, .15, 1.0), (4.07, .06, .6)]:
                bell += np.sin(2 * np.pi * b0 * r * t) * a * am * env(n, 0.006, d, 4)
        logo.add(reverb(np.stack([bell * 0.9 + np.sin(2 * np.pi * 43.65 * t) * env(n, 0.02, 1.6, 4) * 0.6, bell]), 2.8, 6000, 0.42), gr['t'], -16)
        cue(gr['t'], 'Знак THERMINAL: тёплый аккорд', '06_logo')
# glass ping on the double glazing label
for gr in TL['graphics']:
    if gr['type'] == 'callout' and gr['label'][0].startswith('стеклопакет'):
        gfx.add(reverb(pan(glass_ping(), 0.3), 1.6, 9000, 0.3), gr['t'] + 0.02, -16); cue(gr['t'], 'Стеклопакет: звон стекла', '04_graphics')

# sheet: pen texture and dimension snaps
SH = next(s for s in shots if s['type'] == 'sheet')
d0, d1 = SH['draw']; n = int((d1 - d0) * SR); ge = np.zeros(n)
for k in rng.integers(0, max(1, n - 2400), int((d1 - d0) * 48)):
    L = int(rng.uniform(0.01, 0.05) * SR); ge[k:k + L] += np.hanning(L)[:len(ge[k:k + L])] * rng.uniform(0.4, 1)
sh = np.clip(np.linspace(0, 1, n) / 0.1, 0, 1) * np.clip((1 - np.linspace(0, 1, n)) / 0.2, 0, 1)
gfx.add(np.stack([filt(noise(n), 'bp', (2400, 6500)) * ge * sh, filt(noise(n), 'bp', (2400, 6500)) * ge * sh]) * 0.7, d0, -14)
cue(d0, 'Прорисовка сечения: перо по бумаге', '04_graphics')
for dm in SH['dims']:
    gfx.add(pan(snap(0.8), -0.2), dm['t'], -18); gfx.add(pan(snap(1.0), 0.15), dm['t'] + 0.26, -17)
    cue(dm['t'], 'Размерная линия: щелчки засечек', '04_graphics')

# ---------------------------------------------------------------- mix and export
buses = [music, cuts, text, gfx, trans, logo]
music.buf *= db(A['musicGainDb'])
mix = sum(b.buf for b in buses)
out = ROOT / 'exports/audio'; (out / 'stems').mkdir(parents=True, exist_ok=True); (ROOT / 'assets/audio').mkdir(parents=True, exist_ok=True)


def write24(path, st):
    data = (np.clip(st, -1, 1).T * 8388607).astype('<i4').tobytes()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b''.join(data[i:i + 3] for i in range(0, len(data), 4)))


def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])


tmp = out / '_m.wav'; write24(tmp, mix / np.abs(mix).max() * 0.5); i, _ = lufs(tmp); tmp.unlink()
gain = db(A['lufs'] - i) * 0.5 / np.abs(mix).max()
pk = 20 * np.log10(np.abs(mix * gain).max())
if pk > -2.0: gain *= db(-2.0 - pk)
m = mix * gain
write24(out / 'THERMINAL_intro_v4_mix_tail.wav', m)
cut = int(DUR * SR); fade = np.ones(cut); fl = int(0.35 * SR); fade[-fl:] = np.cos(np.linspace(0, np.pi / 2, fl)) ** 2
write24(out / 'THERMINAL_intro_v4_mix.wav', m[:, :cut] * fade)
for k, b in enumerate(buses, 1): write24(out / 'stems' / f'0{k}_{b.name}.wav', b.buf * gain)
i2, tp2 = lufs(out / 'THERMINAL_intro_v4_mix.wav')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(out / 'THERMINAL_intro_v4_mix.wav'), '-c:a', 'libmp3lame', '-b:a', '256k', str(ROOT / 'assets/audio/intro_v4_mix.mp3')], check=True)
CUES.sort(key=lambda c: c['t'])
(ROOT / 'assets/audio/cues.json').write_text(json.dumps(CUES, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'mix {i2:.1f} LUFS, true peak {tp2:.1f} dBFS, {len(CUES)} cues')
