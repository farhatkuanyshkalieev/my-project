#!/usr/bin/env bash
# Full build: frames (4 parallel workers) -> H.264 segments, synthesized audio, final mux.
set -euo pipefail
cd "$(dirname "$0")"
OUT=${OUT:-build}
mkdir -p "$OUT"
node render.js events events.json
python3 audio.py events.json "$OUT/sound.wav"
for k in 0 1 2 3; do
  node render.js segment "$OUT/seg$k.mp4" $((k * 300)) $((k * 300 + 300)) &
done
wait
printf "file 'seg%d.mp4'\n" 0 1 2 3 > "$OUT/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/list.txt" -i "$OUT/sound.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest \
  ot-idei-k-dvizheniyu.mp4
echo "done: ot-idei-k-dvizheniyu.mp4"
