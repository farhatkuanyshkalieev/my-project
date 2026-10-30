"""Final QC: ffprobe specs, true-60fps check (no duplicated frames), loudness, black-bar check, frame strip."""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as TL
P = lambda *a: os.path.join(ROOT, *a)
rep = {}
for name in ("episode_01_final.mp4", "episode_01_no_subtitles.mp4"):
    f = P("final", name)
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", f],
                                   capture_output=True, text=True).stdout)
    v = [s for s in pr["streams"] if s["codec_type"] == "video"][0]
    a = [s for s in pr["streams"] if s["codec_type"] == "audio"][0]
    nb = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                             "stream=nb_read_frames", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip())
    # duplicate-frame analysis on a 270x480 grey proxy
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", "scale=270:480,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 480, 270).astype(np.int16)
    diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    t = np.arange(1, len(fr)) / 60.0
    content = (t < TL.EV["cut_black"] - 0.02)          # exclude the deliberate black cut + static end card hold
    dup = int(((diff < 0.02) & content).sum())
    # black bars: mean luma of outer 4 px columns/rows over the whole film
    edges = dict(left=float(fr[:, :, :2].mean()), right=float(fr[:, :, -2:].mean()), top=float(fr[:, :2, :].mean()),
                 bottom=float(fr[:, -2:, :].mean()))
    ld = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"],
                        capture_output=True, text=True).stderr
    summ = ld[ld.rfind("Summary"):]
    I = float(summ.split("I:")[1].split("LUFS")[0])
    TP = float(summ.split("Peak:")[1].split("dBFS")[0])
    rep[name] = dict(size_mb=round(os.path.getsize(f) / 1e6, 1), duration=float(pr["format"]["duration"]),
                     bitrate_mbps=round(int(pr["format"]["bit_rate"]) / 1e6, 2),
                     video=dict(codec=v["codec_name"], profile=v.get("profile"), width=v["width"], height=v["height"],
                                pix_fmt=v["pix_fmt"], r_frame_rate=v["r_frame_rate"], avg_frame_rate=v["avg_frame_rate"],
                                frames=nb, bitrate_mbps=round(int(v.get("bit_rate", 0)) / 1e6, 2)),
                     audio=dict(codec=a["codec_name"], sample_rate=int(a["sample_rate"]), channels=a["channels"],
                                bitrate_kbps=round(int(a.get("bit_rate", 0)) / 1e3)),
                     loudness_lufs=I, true_peak_dbfs=TP,
                     motion=dict(transitions_checked=int(content.sum()), duplicated_frames=dup,
                                 duplicated_pct=round(100 * dup / max(1, content.sum()), 2),
                                 median_frame_diff=round(float(np.median(diff[content])), 3)),
                     edge_luma=edges)
    print(name, json.dumps(rep[name], ensure_ascii=False, indent=1))
json.dump(rep, open(P("final", "qc_report.json"), "w"), ensure_ascii=False, indent=1)
# visual strip, every 2 s, with subtitles
os.makedirs(P("renders", "qc"), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", P("final", "episode_01_final.mp4"), "-vf",
                "fps=0.5,scale=216:384,tile=8x4:padding=4", "-frames:v", "1", P("renders", "qc", "strip_every_2s.png")])
