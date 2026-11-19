"""Stack the two head passes (Claude on top, me below) into 540x960 with the matching slice of the voice timeline."""
import json, subprocess, os
R = r"E:\3д Рилсики ЛоуПоли\reel01"; D = R + r"\lipsync_test"; FPS = 30
T = json.load(open(R + r"\audio\timing.json", encoding="utf-8"))
F0 = int(round([s for s in T["scenes"] if s[0].startswith("7")][0][1] * FPS))
n = len([f for f in os.listdir(D) if f.startswith("me_") and f.endswith(".png")])
font = "C\\:/Windows/Fonts/consola.ttf"
vf = ("[0][1]vstack=2,drawtext=fontfile='%s':text='%%{eif\\:n+%d\\:d}':x=10:y=8:fontsize=16:fontcolor=white@0.55[v]" % (font, F0))
cmd = ["ffmpeg", "-hide_banner", "-y",
       "-framerate", str(FPS), "-start_number", str(F0), "-i", D + r"\cl_%04d.png",
       "-framerate", str(FPS), "-start_number", str(F0), "-i", D + r"\me_%04d.png",
       "-ss", "%.4f" % (F0 / FPS), "-t", "%.4f" % (n / FPS), "-i", R + r"\audio\voice_timeline.wav",
       "-filter_complex", vf, "-map", "[v]", "-map", "2:a",
       "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", R + r"\lipsync_test_540x960.mp4"]
r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
print(r.stderr[-600:])
