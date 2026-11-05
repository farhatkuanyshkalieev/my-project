"""THERMINAL intro v4: atmospheric music bed + the customer's sound effects, placed from timeline.json.
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
_S = {x['id']: x for x in TL['shots']}
_hook, _prod, _logo = _S['s4']['from'], _S['s6']['from'], _S['s8']['from']
chords = [(0.0, _S['s2']['from'], [50, 57, 62, 64, 69], 500, 1100),                 # Dm(add9): space and the hero
          (_S['s2']['from'] - 0.1, _S['s3']['from'], [46, 53, 58, 62, 69], 700, 1300),  # Bbmaj7 under the drawing
          (_S['s3']['from'] - 0.1, _prod, [43, 50, 55, 58, 65], 450, 650),         # Gm, darker under the hook
          (_prod - 0.1, _logo, [45, 53, 57, 60, 64], 800, 1900),                     # F/A opens on the products
          (_logo - 0.1, TL['duration'] + TAIL, [41, 53, 57, 60, 67], 1200, 900)]     # Fadd9 on the logo
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
mus_env *= 1 - 0.35 * np.exp(-((tt(nb) - (_hook + 0.6)) / 0.55) ** 2) + 0.18 * np.exp(-((tt(nb) - (_prod + 0.7)) / 0.9) ** 2)
music.buf += np.stack([air + sub, air[::-1] + sub]) * mus_env
music.buf *= mus_env
music.buf = reverb(music.buf, 3.0, 5000, 0.45)
cue(0.0, 'Музыкальная основа: Dm(add9) → B♭ → Gm под хуком → F/A → F(add9) на знаке', '01_music')

# ---------------------------------------------------------------- user sound library
# Sound effects come from the customer's library (Google Drive "звуки / Саунд Етап"), stored in ../sfx_lib/raw.
# Each placement: file, event time, alignment (onset: sound starts at the event, peak: loudest moment hits it),
# gain in dB, pan, optional segment [from, to] in seconds inside the file.
LIB = ROOT.parent / 'sfx_lib'
_cache = {}


def sample(name):
    if name not in _cache:
        src = next((LIB / 'raw').glob(name + '.*'))
        raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(src), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).T.astype(np.float64)
        e = np.sqrt(np.convolve((x ** 2).mean(0), np.ones(480) / 480, 'same'))
        _cache[name] = (x, int(np.argmax(e > e.max() * 0.1)), int(e.argmax()))
    return _cache[name]


def place(bus, name, t, align='onset', gain=0.0, panp=0.0, seg=None, fade=0.01, label=None):
    x, on, pk = sample(name)
    if seg:
        a, b = int(seg[0] * SR), int(seg[1] * SR); x = x[:, a:b]; on, pk = max(0, on - a), max(0, pk - a)
        n = x.shape[1]; f = int(fade * SR)
        if f: x = x.copy(); x[:, :f] *= np.linspace(0, 1, f); x[:, -f:] *= np.linspace(1, 0, f)
    ref = {'onset': on, 'peak': pk, 'start': 0}[align] / SR
    if panp:
        g = (panp + 1) * np.pi / 4; x = x * np.array([[np.cos(g) * 1.414], [np.sin(g) * 1.414]])
    t0 = t - ref
    if t0 < 0:
        x = x[:, int(-t0 * SR):]; t0 = 0
    bus.add(x, t0, gain)
    if label: cue(t, label, bus.name)


shots = TL['shots']; S = {s['id']: s for s in shots}
T = {tx['words'][0]['text']: tx for tx in TL['texts']}

# fly-in from space and landing
s1 = shots[0]; land = s1['object'][1]['t']
place(trans, 'long_woosh', land - 0.02, 'peak', -9, 0.3, label='Подлёт из космоса: Long Woosh')
place(trans, 'riser_metallic', land, 'peak', -7, 0.0, label='Подлёт: Riser Metallic до приземления')
place(cuts, 'zoom_impact', land, 'peak', -5, 0.0, label='Приземление: Zoom Impact')
place(cuts, 'bass', land, 'onset', -9, 0.0, label='Приземление: Bass')

# words appear: pops
pops = ['pop_up_04', 'pop_up_05']
for tx in TL['texts']:
    st = tx['style']
    for i, w in enumerate(tx['words']):
        if st == 'hook':
            continue
        if st in ('tag', 'sub'):
            place(text, 'mouse_click', w['t'], 'peak', 4, -0.2, label=f'Строка «{w["text"]}»: клик')
        else:
            place(text, pops[i % 2], w['t'], 'peak', {'cap': -11, 'top': -14, 'word': -12}.get(st, -12), -0.25 + 0.15 * i,
                  label=f'Слово «{w["text"]}»: Pop Up')

# hooks
hk = T['Дверь']
place(cuts, 'whip_whoosh_large_2', S['s4']['from'], 'peak', -6, 0.0, label='Склейка на хук: Whip Whoosh Large')
place(text, 'pop_up_05', hk['words'][0]['t'], 'peak', -11, 0.0)
place(text, 'hard', hk['words'][1]['t'], 'onset', -5, 0.0, label='«от сейфа?»: Hard')
place(text, 'bass', hk['words'][1]['t'], 'onset', -13, 0.0)
pc = T['Почти.']
place(cuts, 'soft_wipe', S['s5']['from'], 'peak', -9, 0.1, label='Склейка на «Почти.»: Soft Wipe')
place(text, 'pop_up_03', pc['words'][0]['t'], 'peak', -12, 0.0, label='«Почти.»: Pop Up')

# graphics
for g in TL['graphics']:
    if g['type'] == 'arrow':
        x, on, pk = sample('arrow')
        place(gfx, 'arrow', g['draw'][1], 'peak', -9, 0.15, seg=[pk / SR - 0.55, pk / SR + 0.35], fade=0.04, label='Стрелка: Arrow Sound Effect')
    elif g['type'] == 'callout':
        place(gfx, 'pop_up_02', g['t'], 'peak', -14, 0.2, label=f'Выноска «{" ".join(g["label"])}»: Pop Up')
        if g['label'][0].startswith('стеклопакет'):
            gfx.add(reverb(pan(glass_ping(), 0.3), 1.6, 9000, 0.3), g['t'] + 0.02, -20)
    elif g['type'] == 'brackets':
        for i in range(4): place(gfx, 'mouse_click', g['t'] + 0.04 * i, 'peak', 2, -0.3 + 0.2 * i)
        cue(g['t'], 'Рамка-прицел: четыре клика', gfx.name)
    elif g['type'] == 'logo':
        place(logo, 'chimes_01', g['t'], 'onset', 8, 0.0, label='Знак: Chimes')
        place(logo, 'bass', g['t'] - 0.04, 'onset', -14, 0.0)

# transitions and cuts
for s in shots[1:]:
    t0, kind = s['from'], s['cut']
    if kind == 'flash':
        place(trans, 'cinematic_whoosh_4', t0, 'peak', -7, 0.0, label='Засветка в лист: Cinematic Whoosh 4')
        place(trans, 'light_up', t0 + 0.02, 'peak', -10, 0.0, label='Засветка: Light Up')
    elif kind == 'match':
        place(trans, 'zoom_in_v2', t0, 'peak', -7, 0.0, label='Наезд в камеру: Zoom In')
        place(cuts, 'hard', t0, 'onset', -9, 0.0, label='Склейка по форме: Hard')
    elif kind == 'dark-light':
        place(cuts, 'whoosh2_fast_airy', t0, 'peak', -9, 0.2, label=f'Склейка в {s["id"]}: Whoosh Fast Airy')
    elif kind == 'light-dark':
        place(cuts, 'whoosh1_slow_thick', t0, 'peak', -11, -0.2, label=f'Склейка в {s["id"]}: Whoosh Slow Thick')
    elif kind == 'hard' and s['type'] == 'logo':
        place(cuts, 'fast_swish', t0, 'peak', -11, 0.0, label='Склейка на знак: Fast Swish')
    for i, im in enumerate(s.get('images', [])):
        if 'enter' in im:
            place(gfx, ['fast_swipe_right', 'fast_swipe'][i % 2], im['enter']['t'][0] + 0.02, 'onset', -12, -0.4 if i == 0 else 0.4,
                  label=f'Въезд изделия {i + 1}: Fast Swipe')

# sheet: dimension clicks and a quiet synthesized pen texture (the library has no pencil sound)
SH = next(s for s in shots if s['type'] == 'sheet')
for dm in SH['dims']:
    place(gfx, 'mouse_click', dm['t'], 'peak', 4, -0.2); place(gfx, 'mouse_click', dm['t'] + 0.26, 'peak', 4, 0.2)
    cue(dm['t'], 'Размерная линия: клики', gfx.name)
d0, d1 = SH['draw']; n = int((d1 - d0) * SR); ge = np.zeros(n)
for k in rng.integers(0, max(1, n - 2400), int((d1 - d0) * 40)):
    Ln = int(rng.uniform(0.01, 0.05) * SR); ge[k:k + Ln] += np.hanning(Ln)[:len(ge[k:k + Ln])] * rng.uniform(0.4, 1)
shp = np.clip(np.linspace(0, 1, n) / 0.1, 0, 1) * np.clip((1 - np.linspace(0, 1, n)) / 0.2, 0, 1)
gfx.add(np.stack([filt(noise(n), 'bp', (2400, 6500)) * ge * shp, filt(noise(n), 'bp', (2400, 6500)) * ge * shp]) * 0.7, d0, -20)
cue(d0, 'Прорисовка сечения: тихое перо (синтез)', gfx.name)

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
