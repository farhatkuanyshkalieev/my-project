"""Generic audio stage for a voxel reel.  Reads project/script.json, cuts every line out of the voice files with whisper
(ffmpeg whisper filter), applies per-character FX (robot voice for the AI character), builds the voice timeline from the
scene schedule, writes timing.json / timing_table.md (frame of every word) and voice_timeline.wav (-14 LUFS, <= -1 dBTP).

  python audio_pipeline.py <project_dir>      (needs: ffmpeg >= 8 with the whisper filter, a ggml whisper model)

script.json (see references/script_format.md):
{ "fps": 30, "whisper_model": "C:/models/ggml-medium.bin", "language": "ru",
  "characters": {"me": {"name": "Я", "voice_fx": "none", "tempo": 1.0}, "ai": {"name": "Claude", "voice_fx": "robot", "tempo": 1.0}},
  "sources": {"me": "voice_me.ogg", "ai": "voice_ai.mp3"},
  "lines": [{"id": "M1", "char": "me", "text": "Да как они делают эти рилсы?!", "src": "me", "seg": [0], "tempo": 1.0}, ...],
  "scenes": [{"name": "1 ХУК", "items": [["pre", 0.15], ["M1"], ["post", 0.10]]}, ...] }
"seg" = indexes of the whisper segments (in the source file) that form this line; omit it and the lines of each source
are assigned to the whisper segments in order.  "tempo" > 1 speeds a line up without changing pitch (atempo)."""
import subprocess, re, json, os, sys, wave
import numpy as np
P = os.path.abspath(sys.argv[1]); A = os.path.join(P, "audio"); os.makedirs(os.path.join(A, "clips"), exist_ok=True)
S = json.load(open(os.path.join(P, "script.json"), encoding="utf-8")); FPS = S.get("fps", 30); LANG = S.get("language", "ru")
MODEL = S["whisper_model"]
def run(cmd): r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace"); return r.stdout + r.stderr
def ff(*a): return run(["ffmpeg", "-hide_banner", "-y", *a])
def dur(f): return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).strip())
def srt(path):
    txt = open(path, encoding="utf-8", errors="replace").read().replace("\r", ""); out = []
    for bl in re.split(r"\n\n+", txt.strip()):
        L = bl.split("\n")
        if len(L) < 3: continue
        m = re.findall(r"(\d+):(\d+):(\d+),(\d+)", L[1]); ts = [int(h) * 3600 + int(mi) * 60 + int(s) + int(ms) / 1000 for h, mi, s, ms in m]
        out.append((ts[0], ts[1], " ".join(L[2:]).strip()))
    return out
def silences(f, noise=-35, d=0.06):
    out = ff("-i", f, "-af", f"silencedetect=noise={noise}dB:d={d}", "-f", "null", "-")
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]; en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    T = dur(f); return list(zip(st, en + [T] * (len(st) - len(en))))
def islands(f, noise=-38, d=0.12):
    sil = silences(f, noise, d); T = dur(f); sp = []; t = 0.0
    for a, b in sil:
        if a > t + 0.02: sp.append((t, a))
        t = max(t, b)
    if t < T - 0.02: sp.append((t, T))
    return sp
# ---- 1. sources -> 48k mono wav + whisper segments ----
SEG = {}; SIL = {}; ISL = {}
for key, src in S["sources"].items():
    w = os.path.join(A, key + ".wav"); ff("-i", os.path.join(P, src), "-ac", "1", "-ar", "48000", w)
    ff("-i", w, "-af", f"aresample=16000,whisper=model={MODEL}:language={LANG}:queue=30:destination={os.path.join(A, key + '_seg.srt')}:format=srt", "-f", "null", "-")
    SEG[key] = srt(os.path.join(A, key + "_seg.srt")); SIL[key] = silences(w); ISL[key] = islands(w)
    print("SRC", key, "segments:", [(round(a, 2), round(b, 2), t[:40]) for a, b, t in SEG[key]])
# auto-assign segments in order when "seg" is missing
nxt = {k: 0 for k in SEG}
for ln in S["lines"]:
    if "seg" not in ln: ln["seg"] = [nxt[ln["src"]]]; nxt[ln["src"]] += 1
# ---- 2. cut lines on the nearest silences, FX, loudness, per-word tokens ----
info = {}
for ln in S["lines"]:
    src, segs, lid = ln["src"], ln["seg"], ln["id"]; a = SEG[src][segs[0]][0]; b = SEG[src][segs[-1]][1]
    st = [e for s_, e in SIL[src] if e <= a + 0.15]; en = [s_ for s_, e in SIL[src] if s_ >= b - 0.15]
    A0 = max(st) if st else a; B0 = min(en) if en else b
    w = os.path.join(A, src + ".wav"); raw = os.path.join(A, "clips", lid + "_raw.wav"); clean = os.path.join(A, "clips", lid + "_clean.wav"); final = os.path.join(A, "clips", lid + ".wav")
    ff("-ss", f"{max(0, A0 - 0.05):.3f}", "-to", f"{B0 + 0.06:.3f}", "-i", w, "-af", "afade=t=in:d=0.01,areverse,afade=t=in:d=0.02,areverse", raw)
    tempo = ln.get("tempo", S["characters"][ln["char"]].get("tempo", 1.0))
    if abs(tempo - 1.0) > 1e-3: ff("-i", raw, "-af", f"atempo={tempo}", clean)
    else: ff("-i", raw, "-c", "copy", clean)
    fx = S["characters"][ln["char"]].get("voice_fx", "none")
    if fx == "robot":
        ff("-i", clean, "-f", "lavfi", "-i", "sine=frequency=55:sample_rate=48000", "-filter_complex",
           "[0:a]highpass=f=120,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,asplit=3[d][c][r];"
           "[c]acrusher=bits=11:mode=log:aa=1:samples=1:mix=1[cr];[r][1:a]amultiply[rm];"
           "[d][cr][rm]amix=inputs=3:weights=1 0.18 0.12:duration=first:normalize=0,loudnorm=I=-16:TP=-2:LRA=7", final)
    else: ff("-i", clean, "-af", "loudnorm=I=-16:TP=-2:LRA=7", final)
    ff("-i", final, "-ar", "48000", "-ac", "1", final + ".48.wav"); os.replace(final + ".48.wav", final)
    ff("-i", clean, "-af", f"aresample=16000,whisper=model={MODEL}:language={LANG}:queue=30:max_len=1:destination={os.path.join(A, 'clips', lid + '_tok.srt')}:format=srt", "-f", "null", "-")
    info[lid] = dict(who=ln["char"], text=ln["text"], dur=dur(final), isl=islands(clean, -38, 0.08), tok=srt(os.path.join(A, "clips", lid + "_tok.srt")))
    print("LINE", lid, round(info[lid]["dur"], 2), "s")
json.dump(info, open(os.path.join(A, "lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# ---- 3. word timing (tokens -> script words, vowel centres on loudness peaks) ----
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
NUM = {"1": "один", "2": "два", "3": "три", "4": "четыре", "5": "пять", "6": "шесть", "7": "семь", "8": "восемь", "9": "девять", "10": "десять", "11": "одиннадцать", "12": "двенадцать"}
LAT = {"claude": "клод", "code": "код", "blender": "блендер"}
def norm(s): return re.sub(r"[^a-zа-я0-9]", "", s.lower().replace("ё", "е"))
def norm_word(w): n = norm(w); return LAT.get(n, n)
def tok_norm(t): n = norm(t); return NUM.get(n, n)
VOW = set("аеёиоуыэюяaeiouy")
def syl(w): return max(1, sum(1 for c in norm_word(w) if c in VOW))
def words_for(lid):
    L = info[lid]; script = [w for w in re.split(r"\s+", L["text"].strip()) if norm(w)]
    toks = [(a, b, tok_norm(t)) for a, b, t in L["tok"] if tok_norm(t)]
    ct = []
    for a, b, t in toks:
        n = len(t)
        for i in range(n): ct.append((a + (b - a) * i / n, a + (b - a) * (i + 1) / n))
    if not ct: ct = [(0.0, L["dur"])]
    Sn = [norm_word(w) for w in script]; total = sum(len(x) for x in Sn); T = len(ct); out = []; pos = 0
    for w, x in zip(script, Sn):
        c0 = int(round(pos / total * T)); c1 = int(round((pos + len(x)) / total * T)) - 1; pos += len(x)
        c0 = min(max(c0, 0), T - 1); c1 = min(max(c1, c0), T - 1); out.append([w, ct[c0][0], ct[c1][1]])
    isl = [(x, y) for x, y in L["isl"] if y - x > 0.03] or [(0.0, L["dur"])]
    s0 = isl[0][0]; s1 = isl[-1][1]
    for w in out: w[1] = min(max(w[1], s0), s1); w[2] = min(max(w[2], s0), s1)
    for k in range(1, len(out)):
        if out[k][1] < out[k - 1][2]: out[k][1] = out[k - 1][2]
    MIN = 3 / FPS; changed = True; guard = 0
    while changed and guard < 20:
        changed = False; guard += 1
        for k, w in enumerate(out):
            if w[2] - w[1] < MIN and len(out) > 1:
                j = k + 1 if k + 1 < len(out) else k - 1; a, b = sorted([k, j]); A_ = out[a][1]; B_ = out[b][2]
                sa, sb = syl(out[a][0]), syl(out[b][0]); m = A_ + (B_ - A_) * sa / (sa + sb); out[a][2] = m; out[b][1] = m; changed = True
                if B_ - A_ < 2 * MIN: out[b][2] = out[a][1] + 2 * MIN
    for w in out:
        if not any(x - 0.01 <= w[1] <= y for x, y in isl):
            nxt_ = [x for x, y in isl if x > w[1]]
            if nxt_ and nxt_[0] < w[2] - MIN: w[1] = nxt_[0]
    for k in range(1, len(out)):
        if out[k][1] < out[k - 1][2]: out[k][1] = out[k - 1][2]
        out[k][2] = max(out[k][2], out[k][1] + MIN)
    out[-1][2] = max(out[-1][2], min(s1, out[-1][2] + 0.15)); return out
# ---- 4. scene schedule -> voice timeline ----
t = 0.0; sched = []; placed = []
for scn in S["scenes"]:
    s0 = t
    for it in scn["items"]:
        if len(it) == 2: t += float(it[1])
        else: placed.append((it[0], t)); t += info[it[0]]["dur"]
    sched.append((scn["name"], s0, t))
TOTAL = t; inp = []; fc = []
for i, (lid, st) in enumerate(placed):
    inp += ["-i", os.path.join(A, "clips", lid + ".wav")]; d = int(round(st * 1000)); fc.append(f"[{i}:a]adelay={d}|{d}[a{i}]")
fc.append("".join(f"[a{i}]" for i in range(len(placed))) + f"amix=inputs={len(placed)}:normalize=0:duration=longest,apad=whole_dur={TOTAL:.3f}[m]")
ff(*inp, "-filter_complex", ";".join(fc), "-map", "[m]", "-ar", "48000", "-ac", "1", os.path.join(A, "voice_raw.wav"))
meas = run(["ffmpeg", "-hide_banner", "-i", os.path.join(A, "voice_raw.wav"), "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"])
j = json.loads(meas[meas.rfind("{"):meas.rfind("}") + 1])
ff("-i", os.path.join(A, "voice_raw.wav"), "-af", f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true", "-ar", "48000", os.path.join(A, "voice_timeline.wav"))
chk = run(["ffmpeg", "-hide_banner", "-i", os.path.join(A, "voice_timeline.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"])
I = re.findall(r"I:\s+(-?[\d.]+) LUFS", chk)[-1]; TP = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", chk)[-1]
def fr(x): return int(round(x * FPS))
WORDS = {}
for lid, st in placed: WORDS[lid] = [(w, st + a, st + b) for w, a, b in words_for(lid)]
md = [f"# Таймлайн — {TOTAL:.2f} с = {fr(TOTAL)} кадров @ {FPS} fps\n", f"Голос: **{I} LUFS**, true peak **{TP} dBTP**.\n", "| Сцена | Кадры | Время, с | Длит., с |", "|---|---|---|---|"]
for name, a, b in sched: md.append(f"| {name} | {fr(a)}–{fr(b) - 1} | {a:.2f}–{b:.2f} | {b - a:.2f} |")
md.append("\n## Реплики и слова (кадр начала–конца слова)\n")
for name, a, b in sched:
    md.append(f"### Сцена {name}  (кадры {fr(a)}–{fr(b) - 1})")
    for lid, st in placed:
        if a <= st < b:
            ws = WORDS[lid]; md.append(f"- **{lid} · {S['characters'][info[lid]['who']]['name']}:** «{info[lid]['text']}» — кадры {fr(ws[0][1])}–{fr(ws[-1][2])}")
            md.append("  - " + " · ".join(f"{w} `{fr(x)}–{fr(y)}`" for w, x, y in ws))
    md.append("")
open(os.path.join(A, "timing_table.md"), "w", encoding="utf-8").write("\n".join(md))
json.dump(dict(fps=FPS, total=TOTAL, scenes=sched, placed=placed, words={k: [(w, round(a, 3), round(b, 3)) for w, a, b in v] for k, v in WORDS.items()}),
          open(os.path.join(A, "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("TOTAL", round(TOTAL, 2), "s", fr(TOTAL), "frames  LUFS", I, "TP", TP)
