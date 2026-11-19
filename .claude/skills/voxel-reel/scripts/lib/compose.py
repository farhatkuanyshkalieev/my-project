"""Reel #1: 2D graphics on top of rendered frames (step counter, render bar, white flash) + final mix -> MP4.
python compose.py <frames_pattern> <width> <mode animatic|preview|final> <out.mp4> [start_number]"""
import json, subprocess, sys
R = r"E:\3д Рилсики ЛоуПоли\reel01"; FPS = 30
pat, Wd, mode, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
start = int(sys.argv[5]) if len(sys.argv) > 5 else 0
E = json.load(open(R + r"\animatic\events.json", encoding="utf-8")); SCN = {k: tuple(v) for k, v in E["scenes"].items()}
k = Wd / 1080.0; H = int(1920 * k)
FONT = "C\\:/Windows/Fonts/arialbd.ttf"
num = sorted((int(n), f) for n, f in E["step_num"].items())
f_end6 = SCN["6"][1]
flt = []
# step counter: "ШАГ N/12", top-right inside the safe zone (top 220, right 140), bold white with a dark outline, hop on change
for i, (n, f0) in enumerate(num):
    f1 = num[i + 1][1] - 1 if i + 1 < len(num) else f_end6
    size = "%d*(1+0.28*max(0\\,1-(n-%d)/5))" % (int(64 * k), f0)
    flt.append("drawtext=fontfile='%s':text='ШАГ %d/12':fontsize=%s:fontcolor=white:borderw=%d:bordercolor=0x1A1A1E:"
               "x=%d-text_w:y=%d-%d*max(0\\,1-(n-%d)/5):enable='between(n\\,%d\\,%d)'"
               % (FONT, n, size, max(2, int(5 * k)), int((1080 - 140 - 30) * k), int(250 * k), int(18 * k), f0, f0, f1))
# render bar (scene 6, on "рендер"): 97 % -> 100 % by the end of the line
fr = E["step_subj"]["12"]; fe = f_end6 - 30
bx, by, bw, bh = int(60 * k), int(1300 * k), int(960 * k), int(52 * k)
flt.append("drawbox=x=%d:y=%d:w=%d:h=%d:color=0x2A2A2E@0.92:t=fill:enable='between(n\\,%d\\,%d)'" % (bx, by, bw, bh, fr, f_end6))
flt.append("drawbox=x=%d:y=%d:w=%d:h=%d:color=white@0.9:t=%d:enable='between(n\\,%d\\,%d)'" % (bx, by, bw, bh, max(1, int(3 * k)), fr, f_end6))
# sweep 0 -> 97 % in the first 12 frames
for i in range(12):
    flt.append("drawbox=x=%d:y=%d:w=%d:h=%d:color=0xD97757:t=fill:enable='eq(n\,%d)'" % (bx + int(6 * k), by + int(6 * k), max(1, int((bw - 12 * k) * (i + 1) * 97 / 1200)), bh - int(12 * k), fr + i))
fr = fr + 12
for p in range(97, 101):
    a = fr + (fe - fr) * (p - 97) // 3; b = (fr + (fe - fr) * (p - 96) // 3 - 1) if p < 100 else f_end6
    flt.append("drawbox=x=%d:y=%d:w=%d:h=%d:color=0xD97757:t=fill:enable='between(n\\,%d\\,%d)'"
               % (bx + int(6 * k), by + int(6 * k), int((bw - 12 * k) * p / 100), bh - int(12 * k), a, b))
    flt.append("drawtext=fontfile='%s':text='РЕНДЕР %d%%%%':fontsize=%d:fontcolor=white:borderw=%d:bordercolor=0x1A1A1E:x=%d:y=%d:enable='between(n\\,%d\\,%d)'"
               % (FONT, p, int(40 * k), max(2, int(4 * k)), bx, by - int(56 * k), a, b))
# white flash, 4 frames, into scene 8
f8 = SCN["8"][0]
for i, al in enumerate((1.0, 1.0, 0.7, 0.35)):
    flt.append("drawbox=x=0:y=0:w=iw:h=ih:color=white@%.2f:t=fill:enable='eq(n\\,%d)'" % (al, f8 + i))
if mode == "animatic":   # guides: safe zones, scene name, frame number
    flt.append("drawbox=x=0:y=%d:w=iw:h=2:color=red@0.6:t=fill" % int(220 * k))
    flt.append("drawbox=x=0:y=%d:w=iw:h=2:color=red@0.6:t=fill" % int((1920 - 400) * k))
    flt.append("drawbox=x=%d:y=0:w=2:h=ih:color=red@0.6:t=fill" % int((1080 - 140) * k))
    for s, (a, b) in SCN.items():
        flt.append("drawtext=fontfile='%s':text='СЦЕНА %s':fontsize=%d:fontcolor=yellow:x=8:y=%d:enable='between(n\\,%d\\,%d)'" % (FONT, s, int(34 * k), int(1830 * k), a, b))
    flt.append("drawtext=fontfile='%s':text='%%{eif\\:n\\:d}':fontsize=%d:fontcolor=yellow:x=8:y=8" % (FONT, int(30 * k)))
GLF = sorted(set(E.get("glitch", []) + [e["f"] for e in E["events"] if e["kind"] == "glitch"]))
if GLF:
    en = "+".join("eq(n\,%d)" % g for g in GLF)
    flt.append("rgbashift=rh=%d:bh=%d:enable='%s'" % (int(14 * k), -int(10 * k), en))
vf = ",".join(flt)
cmd = ["ffmpeg", "-hide_banner", "-y", "-framerate", str(FPS), "-start_number", str(start), "-i", pat, "-i", R + r"\audio\final_mix.wav",
       "-vf", vf, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]
r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
print(r.stderr[-800:])
