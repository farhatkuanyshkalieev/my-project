#!/usr/bin/env bash
# Full build of the Qazaq Republic reel (flat + 3D garments): cue sheet → sound → 4 parallel render workers → mux.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules/three ] || npm install --silent
mkdir -p build
SCENE=qr3g.html node render.js events build/events.json
python3 score_qr.py build/events.json build/sound.wav
FR=600; Q=$((FR / 4))
for i in 0 1 2 3; do
  SCENE=qr3g.html node render.js segment build/seg$i.mp4 $((i * Q)) $(((i + 1) * Q)) 2> build/seg$i.log &
done
wait
printf "file 'seg%d.mp4'\n" 0 1 2 3 > build/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/list.txt -i build/sound.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -tune film -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest qazaq_republic_reel_3d_garments.mp4
echo "done: qazaq_republic_reel_3d_garments.mp4"
