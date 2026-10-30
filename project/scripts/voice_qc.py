"""QC every voice take: Whisper transcription vs. script, speech span, loudness. Writes voices/qc_report.json."""
import json, os, re, subprocess, sys, difflib
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from voice_takes import LINES
from faster_whisper import WhisperModel

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "voices", "raw")
MODEL_DIR = sys.argv[1]

def load(path):
    pcm = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(pcm, np.float32)

def norm(s):
    s = s.lower().replace("ё", "е")
    return re.sub(r"[^а-я ]", "", re.sub(r"\s+", " ", s)).strip()

m = WhisperModel("small", device="cpu", compute_type="int8", download_root=MODEL_DIR)
rep = {}
for lid, (spk, text, prompt, takes, notes) in LINES.items():
    for tk in takes:
        x = load(os.path.join(RAW, tk + ".mp3"))
        env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, "same"))
        thr = max(env.max() * 0.06, 1e-3)
        idx = np.where(env > thr)[0]
        on, off = (idx[0] / 48000, idx[-1] / 48000) if len(idx) else (0, 0)
        x16 = x[::3].astype(np.float32)  # 48k -> 16k (speech band only)
        segs, _ = m.transcribe(x16, language="ru", beam_size=5)
        hyp = " ".join(s.text for s in segs).strip()
        sim = difflib.SequenceMatcher(None, norm(hyp), norm(text)).ratio()
        rep[tk] = dict(line=lid, expected=text, heard=hyp, similarity=round(float(sim), 3), dur=round(len(x) / 48000, 3),
                       onset=round(float(on), 3), offset=round(float(off), 3), peak_db=round(float(20 * np.log10(np.abs(x).max() + 1e-9)), 1))
        print(f"{lid} {tk} sim={sim:.2f} span={on:.2f}-{off:.2f} heard='{hyp}'")
json.dump(rep, open(os.path.join(ROOT, "voices", "qc_report.json"), "w"), ensure_ascii=False, indent=1)
