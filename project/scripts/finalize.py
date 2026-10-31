"""Final mastering/encode.
  audio : two-pass EBU R128 loudnorm -> -14 LUFS, TP -2.0 dBTP before AAC (≤ -1.5 dBTP after the AAC encode), AAC 256k, 48 kHz stereo
  SUBS_ONLY=1 re-encodes only the subtitled file; AUDIO_ONLY=1 re-masters the audio and remuxes the existing finals (video stream copied, not re-encoded)
  video : light temporal film grain, H.264 High@4.2, 2-pass 12 Mb/s (max 16; keeps each file < GitHub 100 MB limit), yuv420p, CFR 60 fps
  outputs final/episode_NN_no_subtitles.mp4 and final/episode_NN_final.mp4 (burned-in subtitles); EP=NN selects the episode
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from episode_paths import P, PIC, MIX, MIX_MASTER, SUBS, RENDERS, FINAL, FINAL_NOSUB
os.makedirs(P("final"), exist_ok=True)


def run(cmd):
    print(" ".join(cmd[:6]), "...", flush=True)
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


# ---- audio master
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", MIX, "-af", "loudnorm=I=-14:TP=-2.0:LRA=11:print_format=json",
                    "-f", "null", "-"], capture_output=True, text=True)
m = json.loads(re.search(r"\{[^{}]*\}\s*$", r.stderr, re.S).group(0))
af = (f"loudnorm=I=-14:TP=-2.0:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
      "aresample=192000,alimiter=limit=0.75:attack=2:release=60:level=disabled,aresample=48000")   # 4x-oversampled peak guard
run(["ffmpeg", "-y", "-v", "error", "-i", MIX, "-af", af, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le",
     MIX_MASTER])

# ---- video: subtitles overlay graph
cues = json.load(open(os.path.join(SUBS, "cues.json")))


def encode(out, with_subs):
    inputs = ["-i", PIC, "-i", MIX_MASTER]
    graph = "[0:v]noise=alls=3:allf=t,format=yuv420p[g0]"
    last = "g0"
    if with_subs:
        graph = "[0:v]noise=alls=3:allf=t[g0]"
        for k, c in enumerate(cues):
            inputs += ["-i", os.path.join(SUBS, "overlays", c["id"] + ".png")]
            graph += f";[{last}][{k + 2}:v]overlay=0:0:enable='between(t,{c['start']:.3f},{c['end']:.3f})'[g{k + 1}]"
            last = f"g{k + 1}"
        graph += f";[{last}]format=yuv420p[vout]"
        last = "vout"
    vopts = ["-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slow", "-b:v", "12M",
             "-maxrate", "16M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-r", "60", "-fps_mode", "cfr",
             "-g", "120", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
    plog = os.path.join(RENDERS, "x264_2pass")
    for ps in (1, 2):
        cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", graph, "-map", f"[{last}]"] + vopts + \
              ["-pass", str(ps), "-passlogfile", plog]
        if ps == 1:
            cmd += ["-an", "-f", "mp4", "/dev/null"]
        else:
            cmd += ["-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
                    "-movflags", "+faststart", "-shortest", out]
        run(cmd)


if os.environ.get("AUDIO_ONLY"):
    for out in (FINAL_NOSUB, FINAL):
        tmp = out + ".tmp.mp4"
        run(["ffmpeg", "-y", "-v", "error", "-i", out, "-i", MIX_MASTER, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
             "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", "-shortest", tmp])
        os.replace(tmp, out)
elif os.environ.get("SUBS_ONLY"):          # subtitle fix: re-encode only the subtitled version
    encode(FINAL, True)
else:
    encode(FINAL_NOSUB, False)
    encode(FINAL, True)
print("ok")
