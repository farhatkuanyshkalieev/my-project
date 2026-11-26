"""Находит кадры-«плитки» (сбой захвата Chrome): кадр повторяет свой угол сеткой 3x3."""
import subprocess, sys
import numpy as np
path = sys.argv[1]
w, h = 192, 108
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(float)
bad = []
tw, th = round(w * 390 / 960), round(h * 190 / 540)
for i, x in enumerate(fr):
    a = x[:th, :tw]
    if np.abs(a - x[:th, tw:2 * tw]).mean() < 1.5 and np.abs(a - x[th:2 * th, :tw]).mean() < 1.5:
        bad.append(i)
print(' '.join(map(str, bad)))
