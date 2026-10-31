"""Speech-band (300-3400 Hz) SNR of each ep. 2 line over its actual speech span (dialogue stem vs. music+SFX stems)."""
import json, os, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt
sys.path.insert(0, os.path.dirname(__file__))
from ep03_timeline import LINES

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ST = os.path.join(ROOT, "renders", "ep03", "stems")


def ld(p):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "quiet", "-i", p, "-ac", "1", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)


qc = json.load(open(os.path.join(ROOT, "ep03", "voices", "qc_report.json")))
bp = butter(4, [300, 3400], btype="band", fs=48000, output="sos")
d = sosfilt(bp, ld(os.path.join(ST, "ep03_stem_dialogue.wav")))
r = sosfilt(bp, ld(os.path.join(ST, "ep03_stem_music.wav")) + ld(os.path.join(ST, "ep03_stem_sfx.wav")))
out = {}
for lid, L in LINES.items():
    span = qc[lid]["offset"] - qc[lid]["onset"]
    a, b = int(L["t"] * 48000), int((L["t"] + span) * 48000)
    out[lid] = round(float(10 * np.log10((d[a:b] ** 2).mean() / ((r[a:b] ** 2).mean() + 1e-12))), 1)
print(out, "min", min(out.values()))
json.dump(out, open(os.path.join(ROOT, "renders", "ep03", "ep03_dialogue_snr.json"), "w"), indent=1)
