"""Render key frames (one per shot, or given times) to PNG — used for storyboard + QC."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as TL
from ep01_shots import render_frame
from PIL import Image

def still(T, path, scale=1.0):
    a = render_frame(T)
    im = Image.fromarray(a[:, :, :3].copy())
    if scale != 1.0:
        im = im.resize((int(1080 * scale), int(1920 * scale)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    return im

if __name__ == "__main__":
    out = sys.argv[1]
    times = [float(x) for x in sys.argv[2:]]
    for T in times:
        still(T, os.path.join(out, f"t{T:06.2f}.png"), 0.4)
