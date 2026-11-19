"""Reel #1 sound: synthesised music + SFX + ambience (all generated here, no external samples), ducking under speech,
full mix -14 LUFS / <= -1 dBTP.  python sound_build.py"""
import json, wave, subprocess, re, os, numpy as np
R = r"E:\3д Рилсики ЛоуПоли\reel01"; A = R + r"\audio"; SR = 48000; FPS = 30
E = json.load(open(R + r"\animatic\events.json", encoding="utf-8"))
SCN = {k: tuple(v) for k, v in E["scenes"].items()}; FEND = E["fend"]
rng = np.random.default_rng(7)
def run(c): r = subprocess.run(c, capture_output=True, text=True, encoding="utf-8", errors="replace"); return r.stdout + r.stderr
def rd(p):
    with wave.open(p) as f:
        n = f.getnframes(); a = np.frombuffer(f.readframes(n), {2: np.int16, 4: np.int32}[f.getsampwidth()]).astype(np.float32)
        a /= np.iinfo({2: np.int16, 4: np.int32}[f.getsampwidth()]).max
        if f.getnchannels() > 1: a = a.reshape(-1, f.getnchannels()).mean(1)
    return a
def wr(p, a):
    a = np.clip(a, -1, 1);
    with wave.open(p, "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((a * 32767).astype(np.int16).tobytes())
def lufs(p):
    o = run(["ffmpeg", "-hide_banner", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"])
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", o)[-1])
def S(f): return int(round(f / FPS * SR))
voice = rd(A + r"\voice_timeline.wav"); N = max(len(voice), S(FEND + 1)); voice = np.pad(voice, (0, N - len(voice)))
t_all = np.arange(N) / SR
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def lp_fast(x, fc):   # O(n) low-pass: two passes of a moving average (cut-off ~fc)
    w = max(1, int(SR / (2.2 * fc)))
    for _ in range(2):
        c = np.cumsum(np.pad(x.astype(np.float64), (w // 2, w - w // 2)))
        x = ((c[w:] - c[:-w]) / w)[:len(x)].astype(np.float32)
    return x
def hp(x, fc): return x - lp_fast(x, fc)
def add(buf, at, sig):
    if at >= len(buf): return
    e = min(len(buf), at + len(sig)); buf[max(0, at):e] += sig[max(0, -at):e - at]

# ======================= music: 100 BPM, Am-F-C-G =======================
BPM = 100; beat = 60 / BPM; bar = 4 * beat
mus = np.zeros(N, np.float32)
roots = [110.0, 87.31, 130.81, 98.0]; chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
def kick():
    n = int(0.28 * SR); x = np.arange(n) / SR; f = 45 + 70 * np.exp(-x / 0.03); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-x / 0.12)).astype(np.float32)
def snare():
    n = int(0.2 * SR); return (hp(noise(n), 1500) * env(n, 0.001, 0.06) * 0.6 + np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env(n, 0.001, 0.04) * 0.4).astype(np.float32)
def hat(d=0.03):
    n = int(0.08 * SR); return (hp(noise(n), 7000) * env(n, 0.0005, d) * 0.5).astype(np.float32)
def bass(f0, dur):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f0 * x) + 0.35 * np.sin(4 * np.pi * f0 * x) + 0.15 * np.sign(np.sin(2 * np.pi * f0 * x))
    return (s * env(n, 0.005, dur * 0.6) * 0.5).astype(np.float32)
def pluck(fs, dur, soft=1.0):
    n = int(dur * SR); x = np.arange(n) / SR; s = sum(2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * x)) for f in fs) / len(fs)
    return (s * env(n, 0.004, 0.18 * soft) * 0.35).astype(np.float32)
def pad(fs, dur):
    n = int(dur * SR); x = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * x + 0.3 * np.sin(2 * np.pi * 0.2 * x)) for f in fs) / len(fs)
    a = np.minimum(1, x / 0.4) * np.minimum(1, (dur - x) / 0.4)
    return (s * a * 0.25).astype(np.float32)
K, SN, H = kick(), snare(), hat()
t_s7, t_s8 = SCN["7"][0] / FPS, SCN["8"][0] / FPS; t_s6 = SCN["6"][0] / FPS
t = 0.0; b = 0
while t < N / SR:
    ci = b % 4
    if t < t_s7 - 0.01:                                   # scenes 1-6: beat
        build = 0.0 if t < t_s6 else (t - t_s6) / (t_s7 - t_s6)
        lvl = 1.0 + 0.6 * build
        for q in range(4):
            tq = t + q * beat
            if tq >= t_s7: break
            add(mus, int(tq * SR), K * 0.9 * lvl)
            if q in (1, 3): add(mus, int(tq * SR), SN * 0.55 * lvl)
            subdiv = 4 if build > 0.05 else 2
            for h in range(subdiv):
                th = tq + h * beat / subdiv
                if th < t_s7: add(mus, int(th * SR), H * (0.35 if h % 2 else 0.5) * lvl)
            for e8 in range(2):
                tb = tq + e8 * beat / 2
                if tb < t_s7: add(mus, int(tb * SR), bass(roots[ci] * (2 if e8 else 1) / 2, beat / 2) * lvl)
            if q in (1, 3) and tq + beat / 2 < t_s7: add(mus, int((tq + beat / 2) * SR), pluck(chords[ci], beat, 1) * lvl)
    elif t >= t_s8:                                       # scene 8: calm — pad + soft plucks, no drums
        add(mus, int(t * SR), pad(chords[ci], bar + 0.3) * 0.8)
        for q in (0, 2): add(mus, int((t + q * beat + beat / 2) * SR), pluck([c * 2 for c in chords[ci]], beat, 1.6) * 0.45)
        add(mus, int(t * SR), bass(roots[ci] / 2, bar * 0.9) * 0.35)
    t += bar; b += 1
mus[S(SCN["7"][0]):S(SCN["8"][0])] = 0                     # music cut at the pause scene, returns with the flash
s6a, s6b = S(SCN["6"][0]), S(SCN["7"][0])                  # rising noise sweep under the overload
sw = hp(noise(s6b - s6a), 800) * np.linspace(0, 0.18, s6b - s6a) ** 1.5; mus[s6a:s6b] += sw
wr(A + r"\music_raw.wav", mus * 0.3)
Im, _ = lufs(A + r"\music_raw.wav"); mus = mus * 0.3 * 10 ** ((-22 - Im) / 20)
# ducking under speech: -9 dB when the voice is present (attack 40 ms, release 300 ms)
v_env = np.sqrt(np.convolve(voice ** 2, np.ones(960) / 960, "same"))
gate = (v_env > 0.02).astype(np.float32); g = np.empty_like(gate); s = 0.0
aA, aR = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.3 * SR))
for i in range(0, N, 48):
    tgt = gate[i]; c = aA ** 48 if tgt > s else aR ** 48; s = tgt + (s - tgt) * c; g[i:i + 48] = s
duck = 10 ** (-9 * g / 20); mus *= duck

# ======================= SFX =======================
sfx = np.zeros(N, np.float32)
def whoosh(d=0.35, f0=400, f1=3000, amp=0.5):
    n = int(d * SR); x = np.arange(n) / SR; nz = noise(n)
    fc = f0 * (f1 / f0) ** (x / d); y = np.zeros(n, np.float32); st = 0.0
    for i in range(n): a_ = np.exp(-2 * np.pi * fc[i] / SR); st = (1 - a_) * nz[i] + a_ * st; y[i] = st
    y = nz - y if f1 > 6000 else y
    return y * np.sin(np.pi * x / d) ** 2 * amp * 3
def click():
    n = int(0.04 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2200 * x) * np.exp(-x / 0.006) * 0.5 + noise(n) * np.exp(-x / 0.002) * 0.3).astype(np.float32)
def thump():
    n = int(0.25 * SR); x = np.arange(n) / SR; f = 60 + 90 * np.exp(-x / 0.02)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.08) * 0.8 + lp(noise(n), 1200) * np.exp(-x / 0.05) * 1.5).astype(np.float32)
def servo(dur):
    n = int(dur * SR); x = np.arange(n) / SR; f = 420 + 260 * np.minimum(1, x / max(dur * 0.6, 0.01))
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    s *= 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 70 * x)); a = np.minimum(1, x / 0.01) * np.minimum(1, (dur - x) / 0.02)
    return (lp(s.astype(np.float32), 2500) * a * 0.12).astype(np.float32)
def beep():
    n = int(0.075 * SR); x = np.arange(n) / SR; return (np.sin(2 * np.pi * 1320 * x) * np.minimum(1, x / 0.003) * np.minimum(1, (0.075 - x) / 0.01) * 0.18).astype(np.float32)
def blip(f0, f1, d=0.12, amp=0.2):
    n = int(d * SR); x = np.arange(n) / SR; f = f0 + (f1 - f0) * x / d
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / (d / 2.5)) * amp).astype(np.float32)
def psh():
    n = int(0.6 * SR); x = np.arange(n) / SR; return (hp(noise(n), 2500) * np.minimum(1, x / 0.005) * np.exp(-x / 0.15) * 0.45).astype(np.float32)
def clatter(d=0.5, amp=0.25):
    n = int(d * SR); y = np.zeros(n, np.float32)
    for k in range(18):
        at = int(rng.uniform(0, d - 0.06) * SR); m = int(0.05 * SR); xx = np.arange(m) / SR
        y[at:at + m] += (np.sin(2 * np.pi * rng.uniform(300, 1200) * xx) * np.exp(-xx / 0.012) * rng.uniform(0.3, 1)).astype(np.float32)
    return y * amp
def zap():
    n = int(0.09 * SR); x = np.arange(n) / SR; f = 1800 - 1500 * x / 0.09
    return (np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-x / 0.03) * 0.22 + hp(noise(n), 4000) * np.exp(-x / 0.01) * 0.3).astype(np.float32)
def crackle():
    n = int(0.22 * SR); y = np.zeros(n, np.float32)
    for k in range(40):
        at = int(rng.uniform(0, 0.2) * SR); m = int(0.004 * SR); y[at:at + m] += (noise(m) * rng.uniform(0.3, 1.0)).astype(np.float32)
    return hp(y, 2000) * 0.35
def scanhum(dur):
    n = int(dur * SR); x = np.arange(n) / SR; f = 90 + 60 * x / dur
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR) + 0.2 * np.sin(2 * np.pi * 1100 * x) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * x))
    a = np.minimum(1, x / 0.05) * np.minimum(1, (dur - x) / 0.08); return (s * a * 0.14).astype(np.float32)
def fallwhoosh(dur):
    n = int(dur * SR); x = np.arange(n) / SR; nz = noise(n); u = (x / dur) ** 2; y = lp_fast(nz, 300) * (1 - u) + lp_fast(nz, 2500) * u
    return (y * np.minimum(1, x / 0.1) * 0.6).astype(np.float32)
def landing():
    return np.concatenate([thump() * 1.4, clatter(0.6, 0.35)[:int(0.6 * SR)]]).astype(np.float32) if False else (np.pad(thump() * 1.4, (0, int(0.6 * SR) - len(thump()) if len(thump()) < int(0.6 * SR) else 0)) + clatter(0.6, 0.35)[:int(0.6 * SR)])
def bonelight():
    n = int(0.5 * SR); x = np.arange(n) / SR; f = 300 + 900 * x / 0.5
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 14 * x))) * np.exp(-x / 0.3) * 0.2).astype(np.float32)
SRC = {"glitch": lambda e: (zap(), 0.0), "crackle": lambda e: (crackle(), 0.0), "scanhum": lambda e: (scanhum(e.get("dur", 18) / FPS), 0.0),
       "fall": lambda e: (fallwhoosh(e.get("dur", 24) / FPS + 0.1), 0.0), "land": lambda e: (landing(), 0.0), "bonelight": lambda e: (bonelight(), 0.0),
       "whoosh": lambda e: (whoosh(), -0.17), "crashzoom": lambda e: (whoosh(0.4, 300, 2500, 0.6), -0.25), "turn": lambda e: (whoosh(0.15, 800, 4000, 0.18), -0.05),
       "click": lambda e: (click(), 0.0), "hit": lambda e: (thump(), 0.0), "beep": lambda e: (beep(), 0.0),
       "servo": lambda e: (servo(max(2, e.get("dur", 4)) / FPS + 0.05), 0.0), "psh": lambda e: (psh(), 0.0),
       "swap": lambda e: (blip(500, 1400), 0.0), "grow": lambda e: (blip(200, 900, 0.25, 0.25), 0.0),
       "crumble": lambda e: (clatter(0.45), 0.0), "assemble": lambda e: (clatter(0.4, 0.2)[::-1].copy(), 0.0)}
used = set()
for e in E["events"]:
    k = e["kind"]
    if k in SRC:
        sig, off = SRC[k](e); add(sfx, S(e["f"]) + int(off * SR), sig); used.add(k)
# overload hum: rises through scene 6
n6 = s6b - s6a; x6 = np.arange(n6) / SR; f6 = 55 * (2 ** (x6 / (n6 / SR)))
hum = (np.sin(2 * np.pi * np.cumsum(f6) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f6) / SR)) * np.linspace(0.0, 0.22, n6) ** 1.3
sfx[s6a:s6b] += hum.astype(np.float32)
# ambience: quiet street (1-7), room tone (8)
amb = np.zeros(N, np.float32); s8 = S(SCN["8"][0])
street = lp_fast(noise(s8), 900) * 0.6 + lp_fast(noise(s8), 250) * 0.8
for k in range(6):   # distant car passes
    c = int(rng.uniform(0, s8 - SR * 3)); m = int(3 * SR); amb_c = lp_fast(noise(m), 600) * np.sin(np.pi * np.arange(m) / m) ** 2 * 1.2; street[c:c + m] += amb_c
amb[:s8] = street
amb[s8:] = lp_fast(noise(N - s8), 180) * 0.5 + np.sin(2 * np.pi * 100 * t_all[s8:]) * 0.01
wr(A + r"\amb_raw.wav", amb * 0.1); Ia, _ = lufs(A + r"\amb_raw.wav"); amb = amb * 0.1 * 10 ** ((-38 - Ia) / 20)
# ======================= mix =======================
mix = voice + mus + sfx + amb
z0, z1 = S(SCN["7"][0]), S(SCN["7"][0]) + int(0.5 * SR)                  # 0.5 s of full silence in the pause scene
fade = int(0.01 * SR); mix[z0 - fade:z0] *= np.linspace(1, 0, fade); mix[z0:z1] = 0
for nm, a in (("music", mus), ("sfx", sfx), ("ambience", amb)): wr(A + r"\stem_%s.wav" % nm, a)
pk = np.abs(mix).max(); wr(A + r"\mix_raw.wav", mix / pk * 0.9)
# gain to -14 LUFS, then a 4x-oversampled limiter at -1.3 dBFS (true peak <= -1); correct the gain until within 0.15 LU
g_db = -14.0 - lufs(A + r"\mix_raw.wav")[0]
for it in range(4):
    run(["ffmpeg", "-hide_banner", "-y", "-i", A + r"\mix_raw.wav", "-af",
         "volume=%.2fdB,aresample=192000,alimiter=limit=%.4f:attack=1:release=60:level=false,aresample=48000" % (g_db, 10 ** (-1.9 / 20)),
         "-c:a", "pcm_s24le", A + r"\final_mix.wav"])
    I_, TP_ = lufs(A + r"\final_mix.wav")
    if abs(I_ + 14.0) < 0.15: break
    g_db += -14.0 - I_
I, TP = lufs(A + r"\final_mix.wav")
mI, _ = lufs(A + r"\stem_music.wav")
print("MIX I", I, "TP", TP, "music stem", mI, "sfx used", sorted(used))
