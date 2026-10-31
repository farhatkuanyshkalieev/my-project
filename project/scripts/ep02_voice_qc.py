"""Ep. 2 voice QC: Whisper transcription vs. script, speech span, peak. Writes ep02/voices/qc_report.json."""
import json, os, sys, difflib
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from ep02_timeline import LINES, SUBTITLES
from voice_qc_lib import load, norm
from faster_whisper import WhisperModel

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "ep02", "voices", "raw")
TEXT = {lid: txt for lid, txt, _, _ in SUBTITLES}

m = WhisperModel("small", device="cpu", compute_type="int8", download_root=sys.argv[1])
rep = {}
for lid, L in LINES.items():
    if not L["take"]:
        print(f"{lid} MISSING TAKE")
        continue
    x = load(os.path.join(RAW, L["take"] + ".mp3"))
    env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, "same"))
    idx = np.where(env > max(env.max() * 0.06, 1e-3))[0]
    on, off = (idx[0] / 48000, idx[-1] / 48000) if len(idx) else (0, 0)
    segs, _ = m.transcribe(x[::3].astype(np.float32), language="ru", beam_size=5)
    hyp = " ".join(s.text for s in segs).strip()
    sim = difflib.SequenceMatcher(None, norm(hyp), norm(TEXT[lid])).ratio()
    rep[lid] = dict(take=L["take"], expected=TEXT[lid], heard=hyp, similarity=round(float(sim), 3),
                    dur=round(len(x) / 48000, 3), onset=round(float(on), 3), offset=round(float(off), 3),
                    peak_db=round(float(20 * np.log10(np.abs(x).max() + 1e-9)), 1))
    print(f"{lid} sim={sim:.2f} span={on:.2f}-{off:.2f} heard='{hyp}'")
json.dump(rep, open(os.path.join(ROOT, "ep02", "voices", "qc_report.json"), "w"), ensure_ascii=False, indent=1)
