"""Insert dramatic pauses into a voiceover take and shift its word timings to match.

Each pause is placed at the quietest 10 ms inside +-80 ms of the requested time,
with 6 ms fades on both sides so the cut never clicks.

    python3 scripts/splice_vo.py take.mp3 words_raw.json out_dir 4.8:0.9 8.42:0.7 3.42-4.82:2.6 ...

`t:gap` inserts `gap` seconds of silence at t; `a-b:gap` replaces the stretch a..b
(e.g. a line that is no longer in the story) with `gap` seconds of silence.

Writes out_dir/vo.mp3 and out_dir/words.json (words in the same format as the other episodes).
"""
import json
import subprocess
import sys

import numpy as np

SR = 44100


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def quietest(x, t, radius=0.08, win=0.01):
    a, b = int((t - radius) * SR), int((t + radius) * SR)
    w = int(win * SR)
    best, best_i = 1e9, int(t * SR)
    for i in range(max(0, a), min(len(x) - w, b), w // 2):
        e = float(np.sqrt(np.mean(x[i:i + w] ** 2)))
        if e < best:
            best, best_i = e, i + w // 2
    return best_i


def main():
    take, words_path, out_dir, *specs = sys.argv[1:]
    ops = []  # (start, end, gap) in take seconds; start == end for a plain insert
    for spec in specs:
        where, gap = spec.split(":")
        a, _, b = where.partition("-")
        ops.append((float(a), float(b or a), float(gap)))
    ops.sort()
    x = load(take)
    fade = int(0.006 * SR)
    pieces, cursor, edits = [], 0, []
    for a, b, gap in ops:
        i = quietest(x, a)
        j = quietest(x, b) if b > a else i
        seg = x[cursor:i].copy()
        seg[-fade:] *= np.linspace(1, 0, fade)
        if cursor:
            seg[:fade] *= np.linspace(0, 1, fade)
        pieces += [seg, np.zeros(int(gap * SR), np.float32)]
        edits.append((i / SR, j / SR, gap))
        cursor = j
    tail = x[cursor:].copy()
    tail[:fade] *= np.linspace(0, 1, fade)
    pieces.append(tail)
    y = np.concatenate(pieces)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "192k", f"{out_dir}/vo.mp3"],
        input=pcm,
        check=True,
    )

    d = json.load(open(words_path))
    ws = d["words"] if isinstance(d, dict) else d
    out = []
    for w in ws:
        text = w["text"]
        if w.get("type", "word") != "word" or text.startswith("[") or text.endswith("]") or text in ("—", "-"):
            continue
        if any(a <= w["start"] < b for a, b, _ in edits):
            continue  # this word was cut out
        shift = sum(gap - (b - a) for a, b, gap in edits if w["start"] >= b)
        out.append({"w": text, "s": round(w["start"] + shift, 3), "e": round(w["end"] + shift, 3)})
    json.dump(out, open(f"{out_dir}/words.json", "w"), ensure_ascii=False, indent=0)
    print(f"{len(out)} words, {len(y) / SR:.2f}s, edits at", [(round(a, 3), round(b, 3)) for a, b, _ in edits])


if __name__ == "__main__":
    main()
