"""THERMINAL intro: sound design synthesised from timeline.json (no samples, no voice).

    python3 tools/sound.py

Writes
    exports/audio/THERMINAL_intro_sfx_mix.wav            6.6 s, fade at the cut, for the video
    exports/audio/THERMINAL_intro_sfx_mix_tail.wav       with the logo tail, for editing
    exports/audio/stems/0N_<group>.wav                   one stem per sound group (with tail)
    assets/audio/intro_sfx_mix.mp3                       preview for the prototype
    assets/audio/cues.json                               cue sheet shown on the page
Needs numpy, scipy, ffmpeg (loudness measurement and mp3).
"""
import json, pathlib, subprocess, wave, re
import numpy as np
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'timeline.json').read_text(encoding='utf-8'))
SR = TL['audio']['sampleRate']
DUR = TL['duration']
TAIL = TL['audio']['tail']
N = int((DUR + TAIL) * SR)
rng = np.random.default_rng(20261105)
CUES = []


def cue(t, name, stem, end=None):
    CUES.append({'t': round(t, 3), 'end': round(end, 3) if end else None, 'name': name, 'stem': stem})


# ---------------------------------------------------------------- primitives
def tt(n):
    return np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def sos(kind, f, order=2):
    if kind == 'bp':
        return signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], 'bandpass', output='sos')
    return signal.butter(order, f / (SR / 2), kind, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def sweep_filter(x, f0, f1, q=2.0, curve=1.0):
    """state-variable band-pass with a cutoff gliding from f0 to f1"""
    n = len(x)
    k = np.linspace(0, 1, n) ** curve
    fc = f0 * (f1 / f0) ** k
    g = np.tan(np.pi * fc / SR)
    r = 1 / q
    y = np.zeros(n)
    s1 = s2 = 0.0
    for i in range(n):
        gi = g[i]
        hp = (x[i] - (r + gi) * s1 - s2) / (1 + r * gi + gi * gi)
        bp = gi * hp + s1
        s1 = gi * hp + bp
        lp = gi * bp + s2
        s2 = gi * bp + lp
        y[i] = bp
    return y


def adsr(n, a, d, shape=4.0):
    """attack a s (sine-shaped), exponential decay over the rest"""
    t = tt(n)
    e = np.where(t < a, np.sin(np.pi / 2 * t / max(a, 1e-4)) ** 2, np.exp(-(t - a) * shape / max(d, 1e-4)))
    return e


def swell(n, curve=3.0):
    return np.linspace(0, 1, n) ** curve


def pan(x, p):
    """p in -1..1, constant power"""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def pan_glide(x, p0, p1):
    p = np.linspace(p0, p1, len(x))
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def reverb(st, seconds=2.2, damp=5000, wet=0.35, pre=0.012):
    """stereo convolution with a synthetic decaying room"""
    n = int(seconds * SR)
    env = np.exp(-np.linspace(0, 1, n) * 6.5)
    irs = []
    for ch in range(2):
        ir = filt(noise(n), 'low', damp) * env
        ir = np.concatenate([np.zeros(int(pre * SR)), ir])
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    out = np.stack([signal.fftconvolve(st[c], irs[c])[:st.shape[1]] for c in range(2)])
    return st * (1 - wet) + out * wet


def db(x):
    return 10 ** (x / 20)


class Bus:
    def __init__(self, name):
        self.name = name
        self.buf = np.zeros((2, N))

    def add(self, st, t, gain_db=0.0):
        i = int(t * SR)
        if i >= N:
            return
        st = st[:, :N - i]
        self.buf[:, i:i + st.shape[1]] += st * db(gain_db)


# ---------------------------------------------------------------- sound groups
low, txt, arrow, trans, draw, logo = (Bus(n) for n in ['low', 'text', 'arrow', 'transition', 'drawing', 'logo'])
s1 = TL['scene1']
tr = TL['transition']
cut = tr['cut']

# 1. soft low-frequency accent at the start + dark bed under scene 1
t0 = s1['fadeIn'][0]
n = int(2.6 * SR)
t = tt(n)
f = 38 + 26 * np.exp(-t * 7)
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(n, 0.018, 1.5, 3.6)
boom += 0.25 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR) * adsr(n, 0.01, 0.6, 4)
thump = filt(noise(n), 'low', 160, 4) * adsr(n, 0.004, 0.25, 6) * 0.6
low.add(pan(boom + thump, 0), t0, -13)
cue(t0, 'Низкий мягкий удар: начало, проявление профиля', '01_low')
nb = int((cut - 0.1) * SR)
t = tt(nb)
bed = (np.sin(2 * np.pi * 55 * t) + np.sin(2 * np.pi * 55.35 * t + 1.3) + 0.4 * np.sin(2 * np.pi * 82.5 * t)) / 2.4
room = filt(noise(nb), 'low', 420, 2) * 0.5
bedenv = np.clip(t / 1.2, 0, 1) ** 2 * (1 + 0.6 * np.clip((t - 2.2) / 0.9, 0, 1))
fadeout = np.clip((nb / SR - t) / 0.25, 0, 1)
low.add(np.stack([(bed + room) * bedenv * fadeout, (bed + 0.92 * room[::-1]) * bedenv * fadeout]), 0.1, -29)

# 2. a sound for each meaningful caption
def tick(freq, length=0.22, bright=1.0, air=True):
    n = int(length * SR)
    t = tt(n)
    click = filt(noise(n), 'bp', (2200, 7500)) * adsr(n, 0.0008, 0.02, 5) * 0.55 * bright
    ping = (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t)) * adsr(n, 0.003, length, 5.5) * 0.35
    out = click + ping
    if air:
        pre = int(0.12 * SR)
        a = filt(noise(pre), 'bp', (3000, 9000)) * swell(pre, 2.2) * 0.12
        out = np.concatenate([a, out])
    return out, (0.12 if air else 0.0)

notes = [1318.5, 1568.0, 1760.0, 1975.5]
for i, w in enumerate(TL['captions']['words']):
    x, pre = tick(notes[i % 4])
    p = -0.35 + 0.1 * i
    txt.add(reverb(pan(x, p), 1.4, 6500, 0.28), w['t'] - pre, -15)
    cue(w['t'], f'Подпись «{w["text"]}»', '02_text')
for i, line in enumerate(TL['small']['text']):
    tm = TL['small']['in'][0] + i * 0.12
    x, pre = tick(2349.3 - i * 200, 0.16, 0.6)
    txt.add(reverb(pan(x, 0.1), 1.2, 6500, 0.25), tm - pre, -21)
cue(TL['small']['in'][0], 'Малая подпись, две строки', '02_text')
for i, w in enumerate(TL['topCaption']['words']):
    x, pre = tick([1174.7, 1318.5][i % 2], 0.18, 0.8)
    txt.add(reverb(pan(x, -0.2), 1.0, 7000, 0.18), w['t'] - pre, -17)
    cue(w['t'], f'Подпись на листе «{w["text"]}»', '02_text')
for i in range(len(TL['spec']['rows'])):
    x, _ = tick(2637.0, 0.12, 0.5, air=False)
    txt.add(pan(x, -0.3), TL['spec']['t'] + i * 0.08, -24)
cue(TL['spec']['t'], 'Табличка, три строки', '02_text')

# 3. light sound of the arrow
a0, a1 = TL['arrow']['draw']
n = int((a1 - a0 + 0.15) * SR)
src = noise(n) * (0.6 + 0.4 * np.abs(filt(noise(n), 'low', 30)))
sw = sweep_filter(src, 1100, 4200, 3.0, 0.8)
env = np.sin(np.pi * np.clip(tt(n) / (a1 - a0 + 0.15), 0, 1)) ** 1.5
grains = np.zeros(n)
for k in rng.integers(0, n - 200, 26):
    grains[k:k + 120] += np.hanning(120) * rng.uniform(0.3, 1)
grains = filt(grains * noise(n), 'bp', (3000, 8000))
arrow.add(pan_glide((sw * 0.9 + grains * 0.35) * env, -0.4, 0.15), a0, -15)
cue(a0, 'Стрелка: лёгкий шорох пера', '03_arrow', a1)

# 4. cinematic transition: riser, push whoosh, air hit with tail, reverse swell
r0, r1 = tr['push'][0] - 0.3, tr['flash'][1]
n = int((r1 - r0) * SR)
riser = sweep_filter(noise(n), 300, 7000, 1.6, 1.6) * swell(n, 2.6)
t = tt(n)
gl = np.sin(2 * np.pi * np.cumsum(220 * (4 ** (t / t[-1]))) / SR) * swell(n, 3) * 0.18
trans.add(np.stack([riser + gl, sweep_filter(noise(n), 320, 6800, 1.6, 1.6) * swell(n, 2.6) + gl]), r0, -13)
p0, p1 = tr['push']
n = int((p1 - p0 + 0.25) * SR)
wh = sweep_filter(noise(n), 250, 2600, 1.2, 0.7) * np.sin(np.pi * np.clip(tt(n) / (p1 - p0 + 0.25), 0, 1)) ** 2
trans.add(pan_glide(wh, -0.25, 0.25), p0, -11)
cue(r0, 'Подъём перед переходом', '04_transition', r1)
cue(p0, 'Наезд камеры: свист воздуха', '04_transition', p1)
n = int(3.0 * SR)
t = tt(n)
hit = np.sin(2 * np.pi * np.cumsum(46 + 40 * np.exp(-t * 12)) / SR) * adsr(n, 0.006, 0.9, 4) * 0.9
shimmer = sum(np.sin(2 * np.pi * fq * t + rng.uniform(0, 6)) * adsr(n, 0.004, d, 5) * a
              for fq, d, a in [(2637, 1.2, .12), (3520, 1.0, .1), (4186, .9, .08), (5274, .7, .06), (3136, 1.1, .09)])
air = filt(noise(n), 'bp', (1500, 9000)) * adsr(n, 0.002, 0.35, 6) * 0.35
hit_st = reverb(np.stack([hit + shimmer + air, hit + shimmer * 0.9 + air[::-1] * 0.3]), 2.6, 7500, 0.45)
trans.add(hit_st, cut, -8)
pre = int(0.55 * SR)
rev = reverb(np.stack([air[:pre] * 2, air[:pre] * 2]), 1.2, 6000, 1.0)[:, ::-1] * swell(pre, 2)
trans.add(rev, cut - 0.55, -16)
cue(cut, 'Засветка: воздушный удар с хвостом', '04_transition')
n = int(1.2 * SR)
white = filt(noise(n), 'bp', (5000, 12000)) * adsr(n, 0.05, 1.2, 3)
trans.add(pan(white, 0) * 0.6, cut + 0.02, -26)

# 5. technical drawing: pen texture, dimension snaps, callout pops
d0, d1 = TL['sheet']['draw']
n = int((d1 - d0) * SR)
t = tt(n)
grain_env = np.zeros(n)
for k in rng.integers(0, n - 2400, int((d1 - d0) * 34)):
    L = int(rng.uniform(0.012, 0.06) * SR)
    grain_env[k:k + L] += np.hanning(L) * rng.uniform(0.4, 1)
scratch = filt(noise(n), 'bp', (2400, 6500)) * grain_env
body = filt(noise(n), 'bp', (700, 1800)) * grain_env * 0.25
shape = np.clip(t / 0.15, 0, 1) * np.clip((t[-1] - t) / 0.3, 0, 1)
draw.add(np.stack([(scratch + body) * shape, (filt(noise(n), 'bp', (2400, 6500)) * grain_env + body) * shape]) * 0.7, d0, -13)
cue(d0, 'Прорисовка линий: перо по бумаге', '05_drawing', d1)
fr0 = TL['sheet']['frame'][0]
x, _ = tick(880, 0.3, 0.4, air=False)
draw.add(pan(x, 0), fr0, -25)

def snap(gain):
    n = int(0.08 * SR)
    c = filt(noise(n), 'bp', (1800, 5200)) * adsr(n, 0.0005, 0.03, 6)
    c += np.sin(2 * np.pi * 620 * tt(n)) * adsr(n, 0.001, 0.05, 6) * 0.4
    return c * gain

for dm in TL['dims']:
    tt0 = dm['t']
    draw.add(pan(snap(0.8), -0.2), tt0, -18)
    n = int(0.34 * SR)
    draw.add(pan(sweep_filter(noise(n), 2000, 5000, 4, 1) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.5, 0), tt0 + 0.1, -24)
    draw.add(pan(snap(1.0), 0.15), tt0 + 0.38, -17)
    cue(tt0, f'Размерная линия: щелчки засечек', '05_drawing')
for c in TL['callouts']:
    n = int(0.16 * SR)
    pop = np.sin(2 * np.pi * np.cumsum(1300 - 500 * tt(n) / tt(n)[-1]) / SR) * adsr(n, 0.002, 0.12, 5)
    draw.add(reverb(pan(pop, 0.1), 0.9, 7000, 0.2), c['t'], -19)
    n = int(0.4 * SR)
    draw.add(pan(sweep_filter(noise(n), 2500, 5500, 4, 1) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.45, 0.2), c['t'] + 0.08, -26)
    cue(c['t'], f'Выноска: мягкий щелчок точки', '05_drawing')
x, _ = tick(1046.5, 0.2, 0.5, air=False)
draw.add(pan(x, 0.3), TL['stamp']['t'], -24)

# 6. soft accent for the logo
lt = TL['logo']['t']
n = int(3.2 * SR)
t = tt(n)
bell = np.zeros(n)
for base, amp in [(440.0, 1.0), (659.25, 0.55)]:
    for ratio, a, d in [(1, 1, 2.4), (2.0, .35, 1.4), (2.76, .18, 1.0), (4.07, .08, .7), (5.4, .04, .5)]:
        bell += np.sin(2 * np.pi * base * ratio * t) * a * amp * adsr(n, 0.006, d, 4)
sub = np.sin(2 * np.pi * 55 * t) * adsr(n, 0.02, 1.6, 4) * 0.8
logo_st = reverb(np.stack([bell * 0.9 + sub, bell + sub]), 2.8, 6000, 0.42)
logo.add(logo_st, lt, -14)
cue(lt, 'Знак THERMINAL: мягкий тёплый акцент', '06_logo')
cue(TL['stamp']['t'], 'Штамп чертежа: тихий щелчок', '05_drawing')

# ---------------------------------------------------------------- mix, loudness, export
buses = [low, txt, arrow, trans, draw, logo]
mix = sum(b.buf for b in buses)
out_dir = ROOT / 'exports/audio'
(out_dir / 'stems').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/audio').mkdir(parents=True, exist_ok=True)


def write24(path, st):
    st = np.clip(st, -1, 1)
    data = (st.T * 8388607).astype('<i4')
    b = data.tobytes()
    b24 = b''.join(b[i:i + 3] for i in range(0, len(b), 4))
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b24)


def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    i = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])
    return i, tp


tmp = out_dir / '_measure.wav'
write24(tmp, mix / max(1e-9, np.abs(mix).max()) * 0.5)
i, tp = lufs(tmp)
gain = db(TL['audio']['lufs'] - i) * 0.5 / max(1e-9, np.abs(mix).max())
peak_db = 20 * np.log10(np.abs(mix * gain).max())
if peak_db > -1.5:
    gain *= db(-1.5 - peak_db)
tmp.unlink()
mix_g = mix * gain
write24(out_dir / 'THERMINAL_intro_sfx_mix_tail.wav', mix_g)
cutn = int(DUR * SR)
fade = np.ones(cutn)
fl = int(0.3 * SR)
fade[-fl:] = np.cos(np.linspace(0, np.pi / 2, fl)) ** 2
write24(out_dir / 'THERMINAL_intro_sfx_mix.wav', mix_g[:, :cutn] * fade)
for k, b in enumerate(buses, 1):
    write24(out_dir / 'stems' / f'0{k}_{b.name}.wav', b.buf * gain)
i2, tp2 = lufs(out_dir / 'THERMINAL_intro_sfx_mix.wav')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(out_dir / 'THERMINAL_intro_sfx_mix.wav'),
                '-c:a', 'libmp3lame', '-b:a', '256k', str(ROOT / 'assets/audio/intro_sfx_mix.mp3')], check=True)
CUES.sort(key=lambda c: c['t'])
(ROOT / 'assets/audio/cues.json').write_text(json.dumps(CUES, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'mix {i2:.1f} LUFS, true peak {tp2:.1f} dBFS, {len(CUES)} cues')
