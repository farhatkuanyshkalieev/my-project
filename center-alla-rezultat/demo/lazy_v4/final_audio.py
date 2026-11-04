"""Audio for the final 'Lazy sport' cut.

Music and timings from render_lazy_ad.py; voice lines 1 and 3 from the original
recording, lines 2 and 4 re-recorded (45 minutes, leave a request by phone).

Usage: python3 lazy_v4/final_audio.py OUT.wav   (run from center-alla-rezultat/demo)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

DEMO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(DEMO))
import render_lazy_ad as r  # noqa: E402

# (file, start in source, end in source, start in video)
PLACEMENTS = [
    ("lazy-sport-vo.mp3", 0.0, 4.45, 0.15),       # Я: собираюсь в зал… третий месяц
    ("lazy-sport-vo-fix.mp3", 0.0, 4.30, 4.78),   # Тоже я: лежу сорок пять минут — а мышцы работают
    ("lazy-sport-vo.mp3", 10.38, 16.12, 9.10),    # Ленивый спорт: без нагрузки, …
    ("lazy-sport-vo-fix.mp3", 5.80, 9.87, 14.95), # Абонемент на месяц. Оставьте заявку — номер на экране!
]


def load(name, sr):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(DEMO / name), "-ac", "1", "-ar", str(sr),
                                   "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32)


def mix_voiceover(music, sr):
    vo = np.zeros_like(music)
    cache = {}
    for name, s0, s1, v0 in PLACEMENTS:
        src = cache.setdefault(name, load(name, sr))
        piece = src[int(s0 * sr):int(s1 * sr)].copy()
        piece /= (np.abs(piece).max() + 1e-6)          # same loudness for old and new lines
        fade = int(0.02 * sr)
        piece[:fade] *= np.linspace(0, 1, fade)
        piece[-fade:] *= np.linspace(1, 0, fade)
        a = int(v0 * sr)
        b = min(len(vo), a + len(piece))
        vo[a:b] += piece[:b - a]
    env = np.sqrt(np.convolve(vo ** 2, np.ones(int(0.05 * sr)) / int(0.05 * sr), mode="same"))
    k = int(0.25 * sr)
    active = np.convolve((env > 0.01).astype(np.float32), np.ones(k) / k, mode="same")
    duck = 1 - 0.65 * np.clip(active * 1.5, 0, 1)
    vo *= 0.9 / (np.abs(vo).max() + 1e-6)
    out = music * 0.55 * duck + vo
    return out / max(1.0, np.abs(out).max() / 0.95)


if __name__ == "__main__":
    r.mix_voiceover = mix_voiceover
    r.render_audio(Path(sys.argv[1]))
    print("done", sys.argv[1])
