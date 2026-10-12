#!/usr/bin/env bash
# Builds out/bi-group-reel.mp4 (1080x1920, 30 fps, H.264 + AAC) from index.html and music.py.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
python3 music.py out/music.wav
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.cjs video out/video.mp4
ffmpeg -y -loglevel error -i out/video.mp4 -i out/music.wav \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/bi-group-reel.mp4
rm out/video.mp4 out/music.wav
echo "done: out/bi-group-reel.mp4"
