#!/usr/bin/env bash
# v3 (3D): three.js + canvas frames in 4 workers, film score + sound design, final mux.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules/three ] || npm install --no-audit --no-fund
OUT=${OUT:-build}
mkdir -p "$OUT"
SCENE=reel3.html node render.js events vo3/events.json
python3 score3.py vo3/events.json "$OUT/sound_v3.wav"
for k in 0 1 2 3; do
  SCENE=reel3.html node render.js segment "$OUT/v3_seg$k.mp4" $((k * 741)) $((k * 741 + 741)) &
done
wait
printf "file 'v3_seg%d.mp4'\n" 0 1 2 3 > "$OUT/v3_list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/v3_list.txt" -i "$OUT/sound_v3.wav" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -tune animation -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest ot-idei-k-dvizheniyu_v3.mp4
echo "done: ot-idei-k-dvizheniyu_v3.mp4"
