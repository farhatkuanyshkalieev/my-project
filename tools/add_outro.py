"""Append the "made by @frht.work" end card to a video.

Every finished video must end with this card (see CLAUDE.md).

Usage: python3 tools/add_outro.py IN.mp4 OUT.mp4 [--seconds 2]
The card is rendered at the input's resolution and frame rate.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HANDLE = "@frht.work"
FONT_DIR = "/usr/share/fonts/opentype/inter/"


def probe(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=width,height,r_frame_rate", "-of", "json", str(path)])
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return s["width"], s["height"], float(num) / float(den)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def render_card(w, h, fps, seconds, out_path):
    n = int(round(fps * seconds))
    unit = min(w, h) / 1080
    f_small = ImageFont.truetype(FONT_DIR + "Inter-Light.otf", int(46 * unit))
    f_big = ImageFont.truetype(FONT_DIR + "InterDisplay-Bold.otf", int(104 * unit))
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
        "-r", f"{fps}", "-i", "-", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-shortest", str(out_path)], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / fps
        a = ease(t / 0.5)
        fade_out = min(1.0, (seconds - t) / 0.3)
        im = Image.new("RGB", (w, h), (0, 0, 0))
        d = ImageDraw.Draw(im)
        dy = (1 - a) * 30 * unit
        g = int(255 * a * fade_out)
        d.text((w / 2, h / 2 - 60 * unit + dy), "made by", font=f_small, fill=(g, g, g), anchor="mm")
        d.text((w / 2, h / 2 + 30 * unit + dy), HANDLE, font=f_big, fill=(g, g, g), anchor="mm")
        lw = 160 * unit * a
        d.line((w / 2 - lw / 2, h / 2 + 120 * unit + dy, w / 2 + lw / 2, h / 2 + 120 * unit + dy),
               fill=(g, g, g), width=max(2, int(4 * unit)))
        ff.stdin.write(im.tobytes())
    ff.stdin.close()
    ff.wait()


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    seconds = float(sys.argv[sys.argv.index("--seconds") + 1]) if "--seconds" in sys.argv else 2.0
    w, h, fps = probe(src)
    with tempfile.TemporaryDirectory() as tmp:
        card = Path(tmp) / "card.mp4"
        render_card(w, h, fps, seconds, card)
        subprocess.check_call([
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-i", str(card), "-filter_complex",
            "[0:v]setsar=1[v0];[1:v]setsar=1[v1];"
            "[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];"
            "[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];"
            "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(dst)])
    print("done", dst)


if __name__ == "__main__":
    main()
