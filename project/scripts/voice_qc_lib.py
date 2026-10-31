"""Shared helpers for the Whisper voice QC scripts."""
import re, subprocess
import numpy as np


def load(path):
    pcm = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(pcm, np.float32)


def norm(s):
    s = s.lower().replace("ё", "е")
    return re.sub(r"[^а-я ]", "", re.sub(r"\s+", " ", s)).strip()
