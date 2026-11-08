"""Мягкий саунд-дизайн из живых звуков: пак пользователя + звуки, вырезанные из референса."""
import numpy as np, subprocess, os, sys
from scipy import signal
from scipy.io import wavfile

SR = 48000
FPS = 60
N = int((800 / FPS + 1.0) * SR)
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '../intro/public/sfx/')
dry = np.zeros((N, 2))
send = np.zeros((N, 2))


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(float)
    return x / (np.max(np.abs(x)) + 1e-9)


def lp(x, fc):
    return signal.sosfilt(signal.butter(2, fc, fs=SR, output='sos'), x, axis=0)


def hp(x, fc):
    return signal.sosfilt(signal.butter(2, fc, btype='high', fs=SR, output='sos'), x, axis=0)


def trim(x, a, b=None):
    y = x[int(a * SR): int(b * SR) if b else None].copy()
    n = min(int(0.03 * SR), len(y) // 3)
    y[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    m = min(int(0.003 * SR), len(y) // 4)
    y[:m] *= np.linspace(0, 1, m)[:, None]
    return y


def pitch(x, semis):
    r = 2 ** (semis / 12)
    n = int(len(x) / r)
    return signal.resample(x, n, axis=0)


def panx(x, p):
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    return np.stack([x[:, 0] * l * 1.414, x[:, 1] * r * 1.414], 1) if abs(p) > 0.01 else x


def place(x, frame, gain, pan=0.0, rev=0.15, align=0.0):
    """align — сдвиг (сек) точки звука, которая должна совпасть с кадром (напр. пик вуша)"""
    i = int(frame / FPS * SR - align * SR)
    x = panx(x, pan) * gain
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), N - i)
    dry[i:i + n] += x[:n]
    send[i:i + n] += x[:n] * rev


def pan_sweep(x, p0, p1):
    p = np.linspace(p0, p1, len(x))
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    m = x.mean(1)
    return np.stack([m * l, m * r], 1) * 1.2


# ---------- звуки ----------
click = lp(load(P + 'click.mp3'), 9000)
cut = hp(lp(load(P + 'cut.mp3'), 7000), 140)
whoosh = hp(lp(load(P + 'whoosh.wav'), 6500), 140)
ewhoosh = hp(lp(load(P + 'ewhoosh.wav'), 6500), 160)
bigw = lp(hp(load(P + 'bigwhoosh.mp3'), 150), 5500)
riser = hp(lp(load(P + 'riser.mp3'), 7000), 150)
bulk = [lp(load(P + f'bulk{i}.wav'), 9000) for i in range(1, 6)]
xp = lp(load(P + 'xp.mp3'), 8000)
typing = lp(load(P + 'typing.mp3'), 9000)
tpk = np.load(os.path.join(HERE, 'typing_peaks.npy'))
keys = [trim(typing, p / SR - 0.012, p / SR + 0.13) for p in tpk[:24]]

R = lambda n: load(os.path.join(HERE, n + '.wav'))
bloop_a, bloop_b, bloop_c = R('ref_bloop_a'), R('ref_bloop_b'), R('ref_bloop_c')
mal_a, mal_b, mal_c = R('ref_mallet_a'), R('ref_mallet_b'), R('ref_mallet_c')
ref_logo = R('ref_logo')
mallet1 = trim(mal_c, 0.0, 0.14)  # одиночный мягкий удар

# ================= 1. «H» =================
place(click, 2, 0.22, 0.0, 0.1)
place(trim(whoosh, 0.55), 12, 0.10, -0.3, 0.15, align=0.46)
place(trim(whoosh, 0.6), 26, 0.08, 0.3, 0.15, align=0.41)
place(ewhoosh, 40, 0.28, 0.0, 0.25, align=0.59)
place(bloop_c, 40, 0.30, 0.0, 0.2)

# ================= 2. Hi + рука =================
place(bloop_a, 44, 0.42, 0.15, 0.2)
place(cut, 98, 0.10, 0.0, 0.1)

# ================= 3. I'm =================
place(trim(whoosh, 0.5), 110, 0.13, 0.0, 0.2, align=0.51)
place(keys[3], 128, 0.22, -0.1, 0.05)
place(keys[5], 144, 0.30, -0.1, 0.05)
place(trim(bigw, 1.5), 172, 0.10, 0.0, 0.2, align=0.77)

# ================= 4. Имя =================
for i in range(6):
    place(keys[i + 6], 110 + 82 + i * 5, 0.42, -0.15 + i * 0.06, 0.05)
for j in range(5):  # буквы падают — мягкие бульки вниз по тону
    place(pitch(bulk[1 + (j % 4)], -j * 1.5), 110 + 156 + j * 4, 0.20, 0.4 - j * 0.2, 0.15)
place(bloop_c, 110 + 184, 0.40, 0.0, 0.2)

# ================= 5. Your + точка =================
place(trim(whoosh, 0.6), 110 + 199, 0.08, -0.4, 0.15, align=0.41)
place(trim(whoosh, 0.6), 110 + 201, 0.07, 0.4, 0.15, align=0.41)
place(bloop_b, 110 + 211, 0.45, 0.0, 0.2)
place(pitch(bloop_c, 3), 110 + 239, 0.25, 0.0, 0.2)
place(ewhoosh, 110 + 252, 0.25, 0.2, 0.25, align=0.59)

# ================= 6. Глаз =================
place(bulk[0], 371, 0.30, 0.0, 0.2, align=0.1)
place(trim(whoosh, 0.7), 378, 0.06, -0.3, 0.15, align=0.31)
place(click, 400, 0.10, 0.0, 0.1)
place(trim(whoosh, 0.7), 418, 0.06, 0.3, 0.15, align=0.31)
for j in range(8):
    place(keys[14 + j], 370 + 60 + 3 * j + 3, 0.16, -0.4 + j * 0.1, 0.08)
place(trim(riser, 0.95), 470, 0.15, 0.0, 0.2, align=0.74)

# ================= 7. Creative ___ =================
place(cut, 470, 0.12, 0.0, 0.15)
place(trim(whoosh, 0.75), 478, 0.05, -0.3, 0.1, align=0.26)
place(mal_a, 510, 0.50, -0.15, 0.15)
place(mal_b, 532, 0.50, 0.0, 0.15)
place(mal_c, 554, 0.50, 0.15, 0.15)

# ================= 8. Логотип (Apple-style) =================
L0 = 580
suck = ewhoosh[::-1].copy()
place(suck, L0 + 24, 0.22, 0.0, 0.25, align=len(suck) / SR - 0.59)   # карточка сжимается в точку
place(pitch(bloop_c, 2), L0 + 24, 0.22, 0.0, 0.3)                      # точка родилась
place(trim(whoosh, 0.6), L0 + 46, 0.07, -0.3, 0.2, align=0.41)          # точка уходит на старт орбиты
orbit = pan_sweep(trim(bigw, 0.6), -0.6, 0.6)
place(orbit, L0 + 108, 0.09, 0.0, 0.35, align=len(orbit) / SR - 0.05)   # прорисовка орбиты
for i, s_ in enumerate([0, 3, 5, 7]):                                   # буквы frht — мягкие щипки
    place(pitch(mallet1, s_), L0 + 62 + i * 7 + 6, 0.26, -0.4 + i * 0.25, 0.3)
place(ref_logo, L0 + 76, 0.50, 0.35, 0.4)                               # звезда
place(bloop_b, L0 + 126, 0.30, 0.1, 0.3)                                # точка садится в «.»
place(trim(xp, 0.35, 1.6), L0 + 132, 0.07, 0.1, 0.35, align=0.16)
for i in range(4):                                                      # .work
    place(keys[i + 2], L0 + 120 + i * 5 + 4, 0.10, 0.2 + i * 0.12, 0.15)
place(trim(whoosh, 0.55), L0 + 168, 0.04, -0.5, 0.4, align=0.46)        # свет по тексту

# ---------- лёгкий «зал» для склейки ----------
def room_ir(sec=1.1):
    n = int(sec * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(3)
    ir = np.stack([rng.standard_normal(n) * np.exp(-t * 6.9 / sec) for _ in range(2)], 1)
    ir = lp(ir, 6000)
    ir[: int(0.008 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))

ir = room_ir()
rev = np.stack([signal.fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
rev = hp(rev, 300)
mix = dry + rev * 0.5
mix = hp(mix, 35)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
fade = np.ones(N)
a, b = int(786 / FPS * SR), int(800 / FPS * SR) + int(0.8 * SR)
fade[a:b] = np.cos(np.linspace(0, np.pi / 2, b - a)) ** 1.5
fade[b:] = 0
mix *= fade[:, None]
out = sys.argv[1]
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('ok', out)
