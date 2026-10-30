"""Render the episode picture: true 60 fps (every frame drawn at its own time), piped to ffmpeg.

usage: python3 render.py OUT.mp4 [t_start t_end]
Output is a high-quality intermediate (H.264 CRF 12, yuv420p); final mux/encode is done by finalize.py.
"""
import os, subprocess, sys, time
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as TL

FPS = TL.FPS


def work(i):
    from ep01_shots import render_frame
    a = render_frame(i / FPS)
    return a[:, :, :3].tobytes()


if __name__ == "__main__":
    out = sys.argv[1]
    t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
    t1 = float(sys.argv[3]) if len(sys.argv) > 3 else TL.DURATION
    frames = range(int(round(t0 * FPS)), int(round(t1 * FPS)))
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "12",
                           "-pix_fmt", "yuv420p", "-r", str(FPS), out], stdin=subprocess.PIPE)
    st = time.time()
    with Pool(4) as pool:
        for k, buf in enumerate(pool.imap(work, frames, chunksize=4)):
            ff.stdin.write(buf)
            if k % 300 == 0:
                print(f"frame {k}/{len(frames)}  {time.time() - st:.0f}s", flush=True)
    ff.stdin.close()
    ff.wait()
    print("done", time.time() - st)
