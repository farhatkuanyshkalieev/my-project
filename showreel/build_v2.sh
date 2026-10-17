#!/usr/bin/env bash
# v2 (bright style): frames from reel.html in 4 workers, voice-forward soundtrack, final mux.
set -euo pipefail
cd "$(dirname "$0")"
OUT=${OUT:-build}
mkdir -p "$OUT"
SCENE=reel.html node render.js events vo2/events.json
python3 reel_audio.py vo2/events.json "$OUT/sound_v2.wav"
for k in 0 1 2 3; do
  SCENE=reel.html node render.js segment "$OUT/v2_seg$k.mp4" $((k * 690)) $((k * 690 + 690)) &
done
wait
printf "file 'v2_seg%d.mp4'\n" 0 1 2 3 > "$OUT/v2_list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/v2_list.txt" -i "$OUT/sound_v2.wav" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -tune animation -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest ot-idei-k-dvizheniyu_v2.mp4
echo "done: ot-idei-k-dvizheniyu_v2.mp4"
