"""2D pass over the rendered frames (white flash into the data centre, RGB shift on glitches, animatic guides) + final mix -> MP4.
python3 compose_nv.py <frames_pattern> <out_width> <animatic|preview|final> <out.mp4>
Frames are rendered at 540x960; for 1080 output they are upscaled (lanczos + light unsharp)."""
import json, subprocess, sys
R = "/home/user/my-project/reels/nvidia"; FPS = 30
pat, Wd, mode, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
E = json.load(open(R + "/animatic/events.json", encoding="utf-8")); SCN = {k: tuple(v) for k, v in E["scenes"].items()}
k = Wd / 1080.0; H = int(1920 * k)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
flt = ["scale=%d:%d:flags=lanczos" % (Wd, H)]
if Wd > 600: flt.append("unsharp=5:5:0.6:5:5:0.0")
for fl in E["flash"]:
    for i, al in enumerate((1.0, 0.85, 0.55, 0.25)):
        flt.append("drawbox=x=0:y=0:w=iw:h=ih:color=white@%.2f:t=fill:enable='eq(n\\,%d)'" % (al, fl + i))
if E["glitch"]:
    en = "+".join("eq(n\\,%d)" % g for g in E["glitch"])
    flt.append("rgbashift=rh=%d:bh=%d:enable='%s'" % (max(2, int(14 * k)), -max(2, int(10 * k)), en))
if mode == "animatic":
    flt.append("drawbox=x=0:y=%d:w=iw:h=2:color=red@0.6:t=fill" % int(220 * k))
    flt.append("drawbox=x=0:y=%d:w=iw:h=2:color=red@0.6:t=fill" % int((1920 - 400) * k))
    flt.append("drawbox=x=%d:y=0:w=2:h=ih:color=red@0.6:t=fill" % int((1080 - 140) * k))
    for s, (a, b) in SCN.items():
        flt.append("drawtext=fontfile='%s':text='SC %s':fontsize=%d:fontcolor=yellow:x=8:y=%d:enable='between(n\\,%d\\,%d)'" % (FONT, s, int(34 * k), int(1830 * k), a, b))
    flt.append("drawtext=fontfile='%s':text='%%{eif\\:n\\:d}':fontsize=%d:fontcolor=yellow:x=8:y=8" % (FONT, int(30 * k)))
cmd = ["ffmpeg", "-hide_banner", "-y", "-framerate", str(FPS), "-start_number", "0", "-i", pat, "-i", R + "/audio/final_mix.wav",
       "-vf", ",".join(flt), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]
r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
print(r.stderr[-600:])
