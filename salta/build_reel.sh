#!/usr/bin/env bash
# Full build of the SALTA clip: cue sheet → sound → 4 parallel render workers → mux.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
node render.js events build/events.json
python3 score_salta.py build/events.json build/sound.wav build/sfx_only.wav
FR=990; Q=$(((FR + 3) / 4))
for i in 0 1 2 3; do
  E=$(((i + 1) * Q)); [ $E -gt $FR ] && E=$FR
  node render.js segment build/seg$i.mp4 $((i * Q)) $E 2> build/seg$i.log &
done
wait
printf "file 'seg%d.mp4'\n" 0 1 2 3 > build/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/list.txt -i build/sound.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -tune film -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest salta_addict_reel.mp4
echo "done: salta_addict_reel.mp4"
ffmpeg -y -loglevel error -i salta_addict_reel.mp4 -i build/sfx_only.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 \
  -movflags +faststart -shortest salta_addict_reel_no_music.mp4
echo "done: salta_addict_reel_no_music.mp4 (effects only, for a licensed track in Instagram)"
