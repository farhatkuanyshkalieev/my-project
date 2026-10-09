"""Звук притчи: голос + кинематографичная музыка + эффекты, синхронные с хореографией.
python3 build_audio.py out.wav"""
import json, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); SR = 44100
TL = json.load(open(f"{HERE}/audio/timeline.json")); PH = TL["phrases"]; TOTAL = TL["total"]; N = int((TOTAL + 2) * SR)
rng = np.random.default_rng(33)
P = lambda i: PH[i]["t0"]; PE = lambda i: PH[i]["t1"]

def ma(x, w):
    w = int(w); c = np.cumsum(np.concatenate([np.zeros(w // 2 + 1), x.astype(np.float64), np.zeros(w - w // 2)]))
    return ((c[w:w + len(x)] - c[:len(x)]) / w).astype(np.float32)
def read_wav(p):
    with wave.open(p) as w: x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    return x if sr == SR else np.interp(np.linspace(0, len(x) - 1, int(len(x) * SR / sr)), np.arange(len(x)), x)
def band(n, lo, hi):
    s = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); s[(f < lo) | (f > hi)] = 0; x = np.fft.irfft(s, n); return (x / np.abs(x).max()).astype(np.float32)
NB = {k: band(N, lo, hi) for k, (lo, hi) in {"low": (80, 500), "mid": (500, 2500), "high": (2500, 12000), "air": (6000, 16000), "body": (150, 1500)}.items()}
def add(tr, sig, t, g=1.0):
    i = int(t * SR)
    if i < 0: sig = sig[-i:]; i = 0
    if i >= len(tr): return
    sig = sig[:len(tr) - i]; tr[i:i + len(sig)] += sig * g
tv = lambda d: np.arange(int(d * SR)) / SR
def seg(k, n): o = rng.integers(0, N - n); return NB[k][o:o + n]
def reverb(x, wet=0.25, tail=2.2, damp=3500):
    n = int(tail * SR); t = np.arange(n) / SR; ir = rng.standard_normal(n) * np.exp(-t * (6.9 / tail)); ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    sp = np.fft.rfft(ir); f = np.fft.rfftfreq(n, 1 / SR); sp *= 1 / (1 + (f / damp) ** 2); ir = np.fft.irfft(sp, n); ir /= np.abs(ir).sum() * 0.04
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)].astype(np.float32); return x * (1 - wet * 0.5) + y * wet
def lowpass(x, fc):
    s = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); s *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(s, len(x)).astype(np.float32)

# ---------- эффекты ----------
def impact(d=2.4, k=1.0):
    t = tv(d); sub = np.sin(2 * np.pi * (32 + 55 * np.exp(-t * 13)) * t) * np.exp(-t * 2.2); n = len(t)
    return ((sub * 1.2 + seg("high", n) * np.exp(-t * 6) * 0.5 + seg("mid", n) * np.exp(-t * 10) * 0.5 + np.exp(-t * 280) * seg("air", n) * 0.6) * k).astype(np.float32)
def whoosh(d=0.6, up=True, k=0.8):
    t = tv(d); x = t / d; x = x if up else 1 - x; n = len(t)
    return ((seg("low", n) * np.exp(-((x - 0.25) / 0.28) ** 2) * 0.5 + seg("mid", n) * np.exp(-((x - 0.5) / 0.26) ** 2) * 0.8 + seg("high", n) * np.exp(-((x - 0.78) / 0.24) ** 2) * 0.6) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5 * k).astype(np.float32)
def riser(d=1.5, k=0.7):
    t = tv(d); x = t / d; n = len(t); f = 160 * (2 ** (x * 4.0)); ph = 2 * np.pi * np.cumsum(f) / SR
    return ((seg("mid", n) * x ** 2 * 0.5 + seg("high", n) * x ** 3 * 0.8 + seg("air", n) * x ** 4 * 0.5 + (np.sin(ph) + 0.5 * np.sin(ph * 2.01)) * x ** 2.2 * 0.2) * k).astype(np.float32)
def step_dirt(k=0.6):
    d = 0.16; t = tv(d); n = len(t); return ((seg("low", n) * np.exp(-t * 38) * 0.9 + seg("mid", n) * np.exp(-t * 55) * 0.5 + np.sin(2 * np.pi * 85 * t) * np.exp(-t * 30) * 0.7) * k).astype(np.float32)
def step_wood(k=0.7):
    d = 0.22; t = tv(d); n = len(t); return ((np.sin(2 * np.pi * (140 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 20) * 0.9 + seg("mid", n) * np.exp(-t * 70) * 0.5 + np.sin(2 * np.pi * 310 * t) * np.exp(-t * 35) * 0.3) * k).astype(np.float32)
def creak(d=0.9, k=0.4):
    t = tv(d); f0 = rng.uniform(170, 330); f = f0 + 70 * np.sin(2 * np.pi * rng.uniform(2, 5) * t) + 90 * t / d; ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sign(np.sin(ph)) * 0.4 + np.sin(ph) * 0.6) * (0.55 + 0.45 * np.sin(2 * np.pi * rng.uniform(14, 30) * t)); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (lowpass(s.astype(np.float32), 1500) * env * k).astype(np.float32)
def snap(k=0.9):
    d = 0.5; t = tv(d); n = len(t); return ((seg("high", n) * np.exp(-t * 120) * 0.9 + seg("mid", n) * np.exp(-t * 40) * 0.6 + np.sin(2 * np.pi * (110 + 80 * np.exp(-t * 30)) * t) * np.exp(-t * 9) * 0.9) * k).astype(np.float32)
def rumble(d=2.0, k=0.7):
    t = tv(d); n = len(t); return (seg("low", n) * np.minimum(t / 0.2, 1) * np.exp(-t * 1.6) * k + np.sin(2 * np.pi * 42 * t) * np.exp(-t * 2) * 0.5 * k).astype(np.float32)
def splash(d=2.0, k=1.0):
    t = tv(d); n = len(t); body = (seg("mid", n) * np.exp(-t * 4.5) + seg("high", n) * np.exp(-t * 8) * 0.7 + seg("low", n) * np.exp(-t * 3) * 0.9) * np.minimum(t / 0.01, 1)
    out = np.concatenate([body, np.zeros(int(0.3 * SR), np.float32)]).astype(np.float32)
    for _ in range(26):
        s = rng.uniform(0.05, d * 0.7); f = rng.uniform(500, 1500); l = int(0.05 * SR); i = int(s * SR); tt = np.arange(l) / SR
        out[i:i + l] += np.sin(2 * np.pi * (f * (1 + 4 * tt)) * tt) * np.exp(-tt * 70) * 0.3 * np.exp(-s * 1.2)
    return (out * k).astype(np.float32)
def bubbles(d=2.0, k=0.3, n_=18):
    out = np.zeros(int((d + 0.3) * SR), np.float32)
    for _ in range(n_):
        s = rng.uniform(0, d - 0.1); f = rng.uniform(300, 1100); l = int(0.06 * SR); i = int(s * SR); tt = np.arange(l) / SR
        out[i:i + l] += np.sin(2 * np.pi * (f * (1 + 6 * tt)) * tt) * np.exp(-tt * 55) * rng.uniform(0.3, 1)
    return out * k
def clink(n_=6, d=1.2, k=0.4):
    out = np.zeros(int((d + 0.3) * SR), np.float32)
    for _ in range(n_):
        s = rng.uniform(0, d * 0.7); f = rng.uniform(2800, 6200); l = int(0.18 * SR); i = int(s * SR); tt = np.arange(l) / SR
        out[i:i + l] += (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.47 * tt) + 0.3 * np.sin(2 * np.pi * f * 2.09 * tt)) * np.exp(-tt * rng.uniform(20, 40)) * rng.uniform(0.3, 1)
    return out * k
def thump(k=0.8):
    t = tv(0.35); return (np.sin(2 * np.pi * (52 + 40 * np.exp(-t * 40)) * t) * np.exp(-t * 15) * k).astype(np.float32)
def chime(f, d=2.2, k=0.35):
    t = tv(d); return ((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 2.2) * (1 - np.exp(-t * 300)) * k).astype(np.float32)
def chirp(k=0.12):
    d = 0.25; t = tv(d); f = rng.uniform(3000, 5200); return (np.sin(2 * np.pi * (f * (1 + 0.25 * np.sin(2 * np.pi * rng.uniform(14, 26) * t))) * t) * np.sin(np.pi * t / d) ** 2 * k).astype(np.float32)
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
def pluck(m, d=1.6, k=0.12):
    t = tv(d); f = mf(m); return ((np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 2.4) * (1 - np.exp(-t * 400)) * k).astype(np.float32)
def padnote(m, d, k=0.04):
    t = tv(d); f = mf(m); a = np.minimum(t / 1.0, 1) * np.clip((d - t) / 1.2, 0, 1)
    return ((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.003 * f * t) + 0.25 * np.sin(2 * np.pi * 0.997 * f * t + 1) + 0.15 * np.sign(np.sin(2 * np.pi * 1.002 * f * t))) * a * k).astype(np.float32)

# ---------- голос ----------
voice = np.zeros(N, np.float32); v = read_wav(f"{HERE}/audio/voice.wav"); voice[:len(v)] = v[:N]; voice *= 0.95 / np.abs(voice).max()
duck = 1 - 0.5 * np.clip(ma(np.abs(voice), 0.1 * SR) / 0.1, 0, 1); duck = ma(duck, 0.12 * SR)

# ---------- музыка: бодрый хаус 122 bpm ----------
bpm = 122; beat = 60 / bpm; bar = beat * 4; tt = np.arange(N) / SR
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; roots = [45, 41, 36, 43]
mus = {k: np.zeros(N, np.float32) for k in ("kick", "clap", "hat", "bass", "stab", "arp", "pad")}
def ph_start(i): return PH[i]["t0"]
nb = int(TOTAL / bar) + 3
for b in range(nb):
    t0 = b * bar; r = roots[b % 4]; ch = chords[b % 4]
    for k in range(4):
        tk = t0 + k * beat; n = int(0.3 * SR); ts = np.arange(n) / SR
        mus["kick"][int(tk * SR):int(tk * SR) + n] += (np.sin(2 * np.pi * (46 * ts + 100 * (1 - np.exp(-ts * 30)) / 30)) * np.exp(-ts * 13) * 0.8)[:max(0, N - int(tk * SR))][:n].astype(np.float32) if int(tk * SR) + n < N else 0
        if k in (1, 3):
            i0 = int(tk * SR); n2 = int(0.2 * SR); o = rng.integers(0, N - n2); ts2 = np.arange(n2) / SR
            if i0 + n2 < N: mus["clap"][i0:i0 + n2] += (NB["mid"][o:o + n2] * (np.exp(-ts2 * 28) + 0.6 * np.exp(-np.abs(ts2 - 0.012) * 90)) * 0.3).astype(np.float32)
    for k in range(8):
        tk = t0 + (k + 0.5) * beat / 2; n = int(0.05 * SR); i0 = int(tk * SR)
        if i0 + n < N and k % 2 == 1: o = rng.integers(0, N - n); mus["hat"][i0:i0 + n] += (NB["air"][o:o + n] * np.exp(-np.arange(n) / SR * 80) * 0.14).astype(np.float32)
    for k in range(8):   # бас с синкопой
        tk = t0 + k * beat / 2 + (beat / 4 if k % 2 else 0) * 0; n = int(0.28 * SR); i0 = int(tk * SR)
        if i0 + n < N and k % 2 == 1: ts = np.arange(n) / SR; mus["bass"][i0:i0 + n] += (np.sin(2 * np.pi * mf(r) * ts) * np.exp(-ts * 6) * 0.4 + np.sin(2 * np.pi * mf(r + 12) * ts) * np.exp(-ts * 9) * 0.12).astype(np.float32)
    for k in (0, 3, 5):   # аккордовые «стабы»
        tk = t0 + k * beat / 2; n = int(0.4 * SR); i0 = int(tk * SR)
        if i0 + n < N:
            ts = np.arange(n) / SR; sg = sum(np.sign(np.sin(2 * np.pi * mf(m + 12) * ts)) * 0.4 + np.sin(2 * np.pi * mf(m + 12) * ts) * 0.6 for m in ch)
            mus["stab"][i0:i0 + n] += (sg * np.exp(-ts * 9) * 0.045).astype(np.float32)
    for k in range(8):   # арпеджио восьмыми
        tk = t0 + k * beat / 2; i0 = int(tk * SR); n = int(0.25 * SR)
        if i0 + n < N: ts = np.arange(n) / SR; m = ch[k % 3] + 24; mus["arp"][i0:i0 + n] += ((np.sin(2 * np.pi * mf(m) * ts) + 0.4 * np.sin(2 * np.pi * 2 * mf(m) * ts)) * np.exp(-ts * 14) * 0.05).astype(np.float32)
    i0 = int(t0 * SR); n = int((bar + 0.3) * SR)
    if i0 + n < N: ts = np.arange(n) / SR; env = np.minimum(ts / 0.4, 1) * np.exp(-np.maximum(ts - bar, 0) * 8); mus["pad"][i0:i0 + n] += (sum(np.sin(2 * np.pi * mf(m) * ts) + 0.4 * np.sin(2 * np.pi * 2.003 * mf(m) * ts) for m in ch) * env * 0.03).astype(np.float32)
# интенсивность по фразам: интро без бита, затем полный драйв, брейк на P4 (макро), финальный подъём
layers = {k: np.zeros(N, np.float32) for k in mus}
def lay(a, b, **g):
    for k, vv in g.items(): layers[k][int(a * SR):int(b * SR)] = vv
lay(0, TOTAL + 1, pad=0.8)
lay(0, ph_start(1) - 0.05, kick=0.0, clap=0, hat=0, bass=0.0, stab=0, arp=0.5)
lay(ph_start(1) - 0.05, ph_start(4) - 0.05, kick=1, clap=1, hat=1, bass=1, stab=1, arp=0.8)
lay(ph_start(4) - 0.05, ph_start(5) - 0.05, kick=0.0, clap=0.5, hat=0.8, bass=0.8, stab=0.3, arp=1.0)
lay(ph_start(5) - 0.05, TOTAL + 1, kick=1, clap=1, hat=1, bass=1, stab=1, arp=1.0)
for k in layers: layers[k] = ma(layers[k], 0.12 * SR)
kick_env = ma(np.abs(mus["kick"]), 0.02 * SR); side = ma(1 - 0.5 * np.clip(kick_env / 0.15, 0, 1), 0.04 * SR)
music = sum(mus[k] * layers[k] * (side if k in ("bass", "pad", "stab") else 1.0) for k in mus)
music = reverb(music, 0.12, 1.4) * duck

# ---------- эффекты ----------
sfx = np.zeros(N, np.float32)
def cloth(d=0.7, k=0.6):
    t = tv(d); n = len(t); x = t / d; return (seg("mid", n) * np.sin(np.pi * x) ** 2 * 0.6 + seg("body", n) * np.sin(np.pi * x) ** 1.5 * 0.5) * k
def popc(f, d=0.12, k=0.5):
    t = tv(d); return (np.sin(2 * np.pi * (f * (1 + 1.2 * np.exp(-t * 60))) * t) * np.exp(-t * 28) * k).astype(np.float32)
SEG_T = [PH[1]["t0"] - 0.05, PH[2]["t0"] - 0.05, PH[2]["t0"] + (PH[2]["t1"] - PH[2]["t0"]) * 0.34, PH[2]["t0"] + (PH[2]["t1"] - PH[2]["t0"]) * 0.62, PH[3]["t0"] - 0.05]
for fr in (0.2, 0.37, 0.55, 0.64, 0.73, 0.82): SEG_T.append(PH[3]["t0"] + (PH[3]["t1"] - PH[3]["t0"]) * fr)
SEG_T += [PH[3]["t1"] - 0.3, PH[4]["t0"] - 0.05, PH[5]["t0"] - 0.05] + [PH[5]["t0"] + (PH[5]["t1"] - PH[5]["t0"]) * f for f in (0.26, 0.52, 0.76)] + [PH[6]["t0"] - 0.05]
# падение первой футболки: свист ткани и мягкий приземлённый удар
add(sfx, cloth(1.3, 0.8), 0.15); add(sfx, whoosh(1.1, False, 0.5), 0.2); add(sfx, thump(0.8), 1.5)
for i, tc in enumerate(SEG_T):
    add(sfx, whoosh(0.3, True, 0.5), tc - 0.14); add(sfx, popc(520 + 40 * (i % 6), 0.12, 0.45), tc); add(sfx, tick_(1600 + 90 * (i % 7)) if False else popc(1500 + 90 * (i % 7), 0.08, 0.2), tc + 0.02)
add(sfx, impact(2.0, 0.9), PH[1]["t0"] - 0.05); add(sfx, riser(0.9, 0.6), PH[1]["t0"] - 0.9)
# слова «БАЗОВАЯ ФУТБОЛКА» — удары по буквам
for i in range(15): add(sfx, popc(300 + 25 * i, 0.1, 0.25), PH[1]["t0"] + i * 0.035)
# цвета: нарастающие тики и подъём перед стеной
add(sfx, riser(1.2, 0.6), PH[3]["t0"] + (PH[3]["t1"] - PH[3]["t0"]) * 0.55 - 0.6)
wallT0 = PH[3]["t0"] + (PH[3]["t1"] - PH[3]["t0"]) * 0.83 + 0.05
add(sfx, impact(1.8, 0.8), wallT0); add(sfx, sparkle_(1760) if False else chime(mf(84), 2.0, 0.3), wallT0 + 0.05)
for i in range(21): add(sfx, popc(500 + 34 * i, 0.09, 0.3), wallT0 + i * 0.018)
# макро: аннотации — щелчки и «пинги»
for i, o in enumerate((0.2, 0.9, 1.6)): add(sfx, popc(900 + 200 * i, 0.12, 0.5), PH[4]["t0"] + o); add(sfx, chime(mf(88 + 2 * i), 1.2, 0.2), PH[4]["t0"] + o + 0.05)
add(sfx, whoosh(1.5, True, 0.5), PH[4]["t0"] + 0.1)
# финал: дождь футболок — мягкие «шлёп», затем аккорд и клик кнопки
for i in range(10): add(sfx, thump(0.5) * 0.6, PH[6]["t0"] + 0.4 + i * 0.12 + 0.35 * (i % 3) * 0.1); add(sfx, cloth(0.4, 0.4), PH[6]["t0"] + 0.15 + i * 0.12)
add(sfx, impact(2.4, 0.9), PH[6]["t0"]); 
for i, m in enumerate((72, 76, 79, 84)): add(sfx, chime(mf(m), 2.6, 0.3), PH[6]["t0"] + 0.05 + i * 0.1)
add(sfx, popc(900, 0.15, 0.6), PH[6]["t0"] + 1.1); add(sfx, chime(mf(91), 2.0, 0.3), PH[6]["t0"] + 1.1)
add(sfx, impact(3.0, 0.7), PH[6]["t1"] + 0.3); add(sfx, chime(mf(84), 3.5, 0.3), PH[6]["t1"] + 0.3)
sfx = reverb(sfx, 0.2, 1.6, 5500)

# ---------- микс ----------
mix = voice * 1.0 + music * 1.15 + sfx * 0.7
end = int(TOTAL * SR); mix[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR)); f = int(1.2 * SR); mix[end - f:end] *= np.linspace(1, 0, f); mix[end:] = 0
mix = np.tanh(mix * 1.15) / np.tanh(1.15); mix = mix[:end]; mix = mix / np.abs(mix).max() * 0.93
bus = (music + sfx)[:end] * 0.5; wide = np.zeros(end, np.float32); sh = int(0.012 * SR); wide[sh:] = bus[:-sh]
Lc = mix + 0.14 * (bus - wide); Rc = mix - 0.14 * (bus - wide); sig = np.stack([Lc, Rc], 1); sig = sig / np.abs(sig).max() * 0.93
with wave.open(sys.argv[1], "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sig * 32767).astype(np.int16).tobytes())
_m = np.abs(voice) > 0.02; db = lambda a: 20 * np.log10(np.sqrt((a[_m] ** 2).mean()) + 1e-9)
print("speech RMS dB: voice %.1f music %.1f sfx %.1f" % (db(voice), db(music * 1.7), db(sfx * 0.75)), "ok", round(TOTAL, 2))
