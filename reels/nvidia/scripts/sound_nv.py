"""NVIDIA reel sound: synthesised music + SFX (adapted from voxel-reel/scripts/lib/sound_build.py; no external samples),
ducking -9 dB under the voice, music stem ~-22 LUFS, full mix -14 LUFS / <= -1 dBTP.   python3 sound_nv.py"""
import json, wave, subprocess, re, os, numpy as np
R = "/home/user/my-project/reels/nvidia"; A = R + "/audio"; SR = 48000; FPS = 30
E = json.load(open(R + "/animatic/events.json", encoding="utf-8"))
SCN = {k: tuple(v) for k, v in E["scenes"].items()}; FEND = E["fend"]
rng = np.random.default_rng(7)
def run(c): r = subprocess.run(c, capture_output=True, text=True, encoding="utf-8", errors="replace"); return r.stdout + r.stderr
def rd(p):
    with wave.open(p) as f:
        n = f.getnframes(); sw = f.getsampwidth(); a = np.frombuffer(f.readframes(n), {2: np.int16, 4: np.int32}[sw]).astype(np.float32)
        a /= np.iinfo({2: np.int16, 4: np.int32}[sw]).max
        if f.getnchannels() > 1: a = a.reshape(-1, f.getnchannels()).mean(1)
    return a
def wr(p, a):
    a = np.clip(a, -1, 1)
    with wave.open(p, "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((a * 32767).astype(np.int16).tobytes())
def lufs(p):
    o = run(["ffmpeg", "-hide_banner", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"])
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", o)[-1])
def S(f): return int(round(f / FPS * SR))
voice = rd(A + "/voice_timeline.wav"); N = max(len(voice), S(FEND + 1)); voice = np.pad(voice, (0, N - len(voice)))
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def lp_fast(x, fc):
    w = max(1, int(SR / (2.2 * fc)))
    for _ in range(2):
        c = np.cumsum(np.pad(x.astype(np.float64), (w // 2, w - w // 2)))
        x = ((c[w:] - c[:-w]) / w)[:len(x)].astype(np.float32)
    return x
def hp(x, fc): return x - lp_fast(x, fc)
def add(buf, at, sig):
    if at >= len(buf) or at + len(sig) <= 0: return
    e = min(len(buf), at + len(sig)); buf[max(0, at):e] += sig[max(0, -at):e - at]
# ---------- instruments (from sound_build.py) ----------
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
# ---------- music: 112 BPM, Am - F - C - G; sections follow the scenes ----------
BPM = 112; beat = 60 / BPM; bar = 4 * beat
mus = np.zeros(N, np.float32)
roots = [110.0, 87.31, 130.81, 98.0]; chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
K, SN, H = kick(), snare(), hat()
t3, t4, t5, t6, t7, t8, t9 = (SCN[k][0] / FPS for k in "3456789")
def section(t):
    if t < t3: return "drive"
    if t < t4: return "room"
    if t < t5: return "break"
    if t < t8: return "drive" if t < t6 or t >= t7 else "build"
    if t < t9: return "calm"
    return "outro"
t = 0.0; b = 0
while t < N / SR:
    ci = b % 4
    for q in range(4):
        tq = t + q * beat; sec = section(tq); i0 = int(tq * SR)
        if sec in ("drive", "build"):
            lvl = 1.0 if sec == "drive" else 1.0 + 0.5 * (tq - t6) / (t7 - t6)
            add(mus, i0, K * 0.9 * lvl)
            if q in (1, 3): add(mus, i0, SN * 0.5 * lvl)
            for h in range(4 if sec == "build" else 2): add(mus, int((tq + h * beat / (4 if sec == "build" else 2)) * SR), H * (0.3 if h % 2 else 0.45) * lvl)
            for e8 in range(2): add(mus, int((tq + e8 * beat / 2) * SR), bass(roots[ci] * (2 if e8 else 1) / 2, beat / 2) * lvl)
            if q in (1, 3): add(mus, int((tq + beat / 2) * SR), pluck(chords[ci], beat, 1) * lvl)
        elif sec == "room":                                  # lighter groove in the room: kick on 1, plucks
            if q == 0: add(mus, i0, K * 0.6)
            add(mus, i0, H * 0.3); add(mus, int((tq + beat / 2) * SR), pluck([c * 2 for c in chords[ci]], beat, 1.2) * 0.6)
            if q in (0, 2): add(mus, i0, bass(roots[ci] / 2, beat) * 0.6)
        elif sec == "calm":
            if q == 0: add(mus, i0, pad(chords[ci], bar + 0.3) * 0.8); add(mus, i0, bass(roots[ci] / 2, bar * 0.9) * 0.35)
            if q in (0, 2): add(mus, int((tq + beat / 2) * SR), pluck([c * 2 for c in chords[ci]], beat, 1.6) * 0.45)
        elif sec == "outro":
            if q == 0: add(mus, i0, pad(chords[ci], bar + 0.3) * 0.7)
    t += bar; b += 1
# break (scene 4): riser into the cut, silence of the beat, big hit on the cut
a4, a5 = S(SCN["4"][0]), S(SCN["5"][0]); n4 = a5 - a4
mus[a4:a5] *= np.linspace(1, 0.2, n4)
mus[a4:a5] += hp(noise(n4), 900) * np.linspace(0, 0.25, n4) ** 1.6
# outro: big chord on "зелёного", ring out
fg = [e["f"] for e in E["events"] if e["kind"] == "impact"][-1]
add(mus, S(fg), pad([220, 261.6, 329.6, 440], 3.2) * 2.0)
wr(A + "/music_raw.wav", mus * 0.3); Im, _ = lufs(A + "/music_raw.wav"); mus = mus * 0.3 * 10 ** ((-22 - Im) / 20)
v_env = np.sqrt(np.convolve(voice ** 2, np.ones(960) / 960, "same"))
gate = (v_env > 0.02).astype(np.float32); g = np.empty_like(gate); s = 0.0
aA, aR = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.3 * SR))
for i in range(0, N, 48):
    tgt = gate[i]; c = aA ** 48 if tgt > s else aR ** 48; s = tgt + (s - tgt) * c; g[i:i + 48] = s
mus *= 10 ** (-9 * g / 20)
# ---------- SFX ----------
sfx = np.zeros(N, np.float32)
def whoosh(d=0.35, f0=400, f1=3000, amp=0.5):
    n = int(d * SR); x = np.arange(n) / SR; nz = noise(n); y = lp_fast(nz, f0) * (1 - x / d) + lp_fast(nz, f1) * (x / d)
    return (y * np.sin(np.pi * x / d) ** 2 * amp * 3).astype(np.float32)
def thump():
    n = int(0.3 * SR); x = np.arange(n) / SR; f = 55 + 90 * np.exp(-x / 0.02)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.1) * 0.9 + lp_fast(noise(n), 1200) * np.exp(-x / 0.05) * 1.2).astype(np.float32)
def servo(dur):
    n = int(dur * SR); x = np.arange(n) / SR; f = 420 + 260 * np.minimum(1, x / max(dur * 0.6, 0.01))
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    s *= 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 70 * x)); a = np.minimum(1, x / 0.01) * np.minimum(1, (dur - x) / 0.02)
    return (lp_fast(s.astype(np.float32), 2500) * a * 0.1).astype(np.float32)
def beep():
    n = int(0.075 * SR); x = np.arange(n) / SR; return (np.sin(2 * np.pi * 1320 * x) * np.minimum(1, x / 0.003) * np.minimum(1, (0.075 - x) / 0.01) * 0.12).astype(np.float32)
def blip(f0, f1, d=0.12, amp=0.2):
    n = int(d * SR); x = np.arange(n) / SR; f = f0 + (f1 - f0) * x / d
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / (d / 2.5)) * amp).astype(np.float32)
def zap():
    n = int(0.09 * SR); x = np.arange(n) / SR; f = 1800 - 1500 * x / 0.09
    return (np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-x / 0.03) * 0.2 + hp(noise(n), 4000) * np.exp(-x / 0.01) * 0.3).astype(np.float32)
def riser(dur):
    n = int(dur * SR); x = np.arange(n) / SR; f = 200 * 2 ** (2.5 * x / dur)
    return ((np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + hp(noise(n), 2000) * 0.5) * (x / dur) ** 2 * 0.35).astype(np.float32)
SRC = {"glitch": lambda e: zap(), "whoosh": lambda e: whoosh(), "beep": lambda e: beep(), "impact": lambda e: thump() * 1.3,
       "servo": lambda e: servo(max(2, e.get("dur", 4)) / FPS + 0.05), "pop": lambda e: blip(500, 1400, 0.12, 0.18),
       "flash": lambda e: thump() * 1.6, "rise": lambda e: blip(200, 900, e.get("dur", 20) / FPS, 0.16), "riser": lambda e: riser(e.get("dur", 30) / FPS)}
OFF = {"whoosh": -0.17}
used = set()
for e in E["events"]:
    k = e["kind"]
    if k in SRC: add(sfx, S(e["f"]) + int(OFF.get(k, 0) * SR), SRC[k](e)); used.add(k)
# data-centre hum (fans), room tone in the room
amb = np.zeros(N, np.float32); r3, r5 = S(SCN["3"][0]), S(SCN["5"][0])
t_all = np.arange(N) / SR
dc = lp_fast(noise(N), 700) * 0.6 + np.sin(2 * np.pi * 120 * t_all).astype(np.float32) * 0.05
amb[:] = dc; amb[r3:r5] = lp_fast(noise(r5 - r3), 180) * 0.5
wr(A + "/amb_raw.wav", amb * 0.1); Ia, _ = lufs(A + "/amb_raw.wav"); amb = amb * 0.1 * 10 ** ((-36 - Ia) / 20)
mix = voice + mus + sfx + amb
for nm, a in (("music", mus), ("sfx", sfx), ("ambience", amb)): wr(A + "/stem_%s.wav" % nm, a)
pk = np.abs(mix).max(); wr(A + "/mix_raw.wav", mix / pk * 0.9)
g_db = -14.0 - lufs(A + "/mix_raw.wav")[0]
for it in range(4):
    run(["ffmpeg", "-hide_banner", "-y", "-i", A + "/mix_raw.wav", "-af",
         "volume=%.2fdB,aresample=192000,alimiter=limit=%.4f:attack=1:release=60:level=false,aresample=48000" % (g_db, 10 ** (-1.9 / 20)),
         "-c:a", "pcm_s24le", A + "/final_mix.wav"])
    I_, TP_ = lufs(A + "/final_mix.wav")
    if abs(I_ + 14.0) < 0.15: break
    g_db += -14.0 - I_
I, TP = lufs(A + "/final_mix.wav"); mI, _ = lufs(A + "/stem_music.wav")
print("MIX I", I, "TP", TP, "music stem", mI, "sfx used", sorted(used))
