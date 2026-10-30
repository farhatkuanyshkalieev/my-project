"""Final mastering/encode.
  audio : two-pass EBU R128 loudnorm -> -14 LUFS, TP -1.5 dBTP, AAC 256k, 48 kHz stereo
  video : light temporal film grain, H.264 High@4.2, 2-pass 12 Mb/s (max 16; keeps each file < GitHub 100 MB limit), yuv420p, CFR 60 fps
  outputs final/episode_01_no_subtitles.mp4 and final/episode_01_final.mp4 (burned-in subtitles)
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = lambda *a: os.path.join(ROOT, *a)
PIC = P("renders", "ep01_picture_master.mp4")
MIX = P("renders", "ep01_mix_premaster.wav")
os.makedirs(P("final"), exist_ok=True)


def run(cmd):
    print(" ".join(cmd[:6]), "...", flush=True)
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


# ---- audio master
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", MIX, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
                    "-f", "null", "-"], capture_output=True, text=True)
m = json.loads(re.search(r"\{[^{}]*\}\s*$", r.stderr, re.S).group(0))
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
      "aresample=48000")
run(["ffmpeg", "-y", "-v", "error", "-i", MIX, "-af", af, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le",
     P("renders", "ep01_mix_master.wav")])

# ---- video: subtitles overlay graph
cues = json.load(open(P("subtitles", "cues.json")))


def encode(out, with_subs):
    inputs = ["-i", PIC, "-i", P("renders", "ep01_mix_master.wav")]
    graph = "[0:v]noise=alls=3:allf=t,format=yuv420p[g0]"
    last = "g0"
    if with_subs:
        graph = "[0:v]noise=alls=3:allf=t[g0]"
        for k, c in enumerate(cues):
            inputs += ["-i", P("subtitles", "overlays", c["id"] + ".png")]
            graph += f";[{last}][{k + 2}:v]overlay=0:0:enable='between(t,{c['start']:.3f},{c['end']:.3f})'[g{k + 1}]"
            last = f"g{k + 1}"
        graph += f";[{last}]format=yuv420p[vout]"
        last = "vout"
    vopts = ["-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slow", "-b:v", "12M",
             "-maxrate", "16M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-r", "60", "-fps_mode", "cfr",
             "-g", "120", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
    plog = P("renders", "x264_2pass")
    for ps in (1, 2):
        cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", graph, "-map", f"[{last}]"] + vopts + \
              ["-pass", str(ps), "-passlogfile", plog]
        if ps == 1:
            cmd += ["-an", "-f", "mp4", "/dev/null"]
        else:
            cmd += ["-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
                    "-movflags", "+faststart", "-shortest", out]
        run(cmd)


encode(P("final", "episode_01_no_subtitles.mp4"), False)
encode(P("final", "episode_01_final.mp4"), True)
print("ok")
