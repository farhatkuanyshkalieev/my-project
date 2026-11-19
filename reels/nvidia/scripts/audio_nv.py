"""Audio stage for a single-narrator reel (adapted from voxel-reel/scripts/audio_pipeline.py).
The voice is one continuous ElevenLabs take, so it is not cut into clips: robot FX + loudness on the whole take,
word times from faster-whisper (audio/fw.json, word timestamps) mapped onto the script words by character position.
  python3 audio_nv.py <project_dir>
Writes audio/voice_timeline.wav (-14 LUFS, <= -1 dBTP), audio/timing.json, audio/timing_table.md, audio/lines.json."""
import subprocess, re, json, os, sys
P = os.path.abspath(sys.argv[1]); A = os.path.join(P, "audio")
S = json.load(open(os.path.join(P, "script.json"), encoding="utf-8")); FPS = S["fps"]; PRE = S["pre"]; POST = S["post"]
def run(cmd): r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace"); return r.stdout + r.stderr
def ff(*a): return run(["ffmpeg", "-hide_banner", "-y", *a])
def dur(f): return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).strip())
src = os.path.join(P, S["sources"]["ai"]); w48 = os.path.join(A, "ai.wav"); fx = os.path.join(A, "ai_fx.wav")
ff("-i", src, "-ac", "1", "-ar", "48000", w48)
# robot FX from audio_pipeline.py (dry + bitcrush 0.18 + ring-mod 55 Hz 0.12)
ff("-i", w48, "-f", "lavfi", "-i", "sine=frequency=55:sample_rate=48000", "-filter_complex",
   "[0:a]highpass=f=120,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,asplit=3[d][c][r];"
   "[c]acrusher=bits=11:mode=log:aa=1:samples=1:mix=1[cr];[r][1:a]amultiply[rm];"
   "[d][cr][rm]amix=inputs=3:weights=1 0.18 0.12:duration=first:normalize=0", "-ar", "48000", "-ac", "1", fx)
VD = dur(fx); TOTAL = PRE + VD + POST
raw = os.path.join(A, "voice_raw.wav"); d = int(PRE * 1000)
ff("-i", fx, "-af", f"adelay={d},apad=whole_dur={TOTAL:.3f}", "-ar", "48000", "-ac", "1", raw)
meas = run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
j = json.loads(meas[meas.rfind("{"):meas.rfind("}") + 1])
ff("-i", raw, "-af", f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true",
   "-ar", "48000", os.path.join(A, "voice_timeline.wav"))
chk = run(["ffmpeg", "-hide_banner", "-i", os.path.join(A, "voice_timeline.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"])
I = re.findall(r"I:\s+(-?[\d.]+) LUFS", chk)[-1]; TP = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", chk)[-1]
# ---- word timing ----
NUM = {"115": "стопятнадцать"}
LAT = {"nvidia": "нвидиа", "chatgpt": "чатджипити", "gpt": "джипити"}
def norm(s):
    s = s.lower().replace("ё", "е"); n = re.sub(r"[^a-zа-я0-9]", "", s)
    return NUM.get(n, LAT.get(n, n))
FW = json.load(open(os.path.join(A, "fw.json"), encoding="utf-8"))
toks = [(w, a, b) for s in FW for w, a, b in s["w"] if norm(w)]
ct = []                                                     # char -> (t0, t1)
for w, a, b in toks:
    n = norm(w)
    for i in range(len(n)): ct.append((a + (b - a) * i / len(n), a + (b - a) * (i + 1) / len(n)))
lines = S["lines"]; allw = []
for ln in lines:
    for w in ln["text"].split():
        if norm(w): allw.append((ln["id"], w))
tot = sum(len(norm(w)) for _, w in allw); T = len(ct); pos = 0; WORDS = {ln["id"]: [] for ln in lines}
for lid, w in allw:
    n = len(norm(w)); c0 = min(T - 1, int(round(pos / tot * T))); c1 = min(T - 1, max(c0, int(round((pos + n) / tot * T)) - 1)); pos += n
    WORDS[lid].append([w, PRE + ct[c0][0], PRE + ct[c1][1]])
MIN = 3 / FPS
for lid in WORDS:
    ws = WORDS[lid]
    for k in range(len(ws)):
        if k and ws[k][1] < ws[k - 1][2]: ws[k][1] = ws[k - 1][2]
        ws[k][2] = max(ws[k][2], ws[k][1] + MIN)
def fr(x): return int(round(x * FPS))
placed = [(ln["id"], WORDS[ln["id"]][0][1]) for ln in lines]
sched = []
for k, sc in enumerate(S["scenes"]):
    a = WORDS[sc["lines"][0]][0][1] - (PRE if k == 0 else 0.12)
    if k == 0: a = 0.0
    sched.append([sc["name"], a, None])
for k in range(len(sched)): sched[k][2] = sched[k + 1][1] if k + 1 < len(sched) else TOTAL
info = {ln["id"]: dict(who="ai", text=ln["text"], start=WORDS[ln["id"]][0][1], end=WORDS[ln["id"]][-1][2]) for ln in lines}
json.dump(info, open(os.path.join(A, "lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(fps=FPS, total=TOTAL, scenes=sched, placed=placed, words={k: [(w, round(a, 3), round(b, 3)) for w, a, b in v] for k, v in WORDS.items()}),
          open(os.path.join(A, "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
md = [f"# Таймлайн — {TOTAL:.2f} с = {fr(TOTAL)} кадров @ {FPS} fps\n", f"Голос: **{I} LUFS**, true peak **{TP} dBTP**.\n", "| Сцена | Кадры | Время, с | Длит., с |", "|---|---|---|---|"]
for name, a, b in sched: md.append(f"| {name} | {fr(a)}–{fr(b) - 1} | {a:.2f}–{b:.2f} | {b - a:.2f} |")
md.append("\n## Реплики и слова (кадр начала–конца слова)\n")
for sc, (name, a, b) in zip(S["scenes"], sched):
    md.append(f"### Сцена {name}  (кадры {fr(a)}–{fr(b) - 1})")
    for lid in sc["lines"]:
        ws = WORDS[lid]; md.append(f"- **{lid} · Claude:** «{info[lid]['text']}» — кадры {fr(ws[0][1])}–{fr(ws[-1][2])}")
        md.append("  - " + " · ".join(f"{w} `{fr(x)}–{fr(y)}`" for w, x, y in ws))
    md.append("")
open(os.path.join(A, "timing_table.md"), "w", encoding="utf-8").write("\n".join(md))
print("TOTAL", round(TOTAL, 2), "s", fr(TOTAL), "frames  LUFS", I, "TP", TP)
