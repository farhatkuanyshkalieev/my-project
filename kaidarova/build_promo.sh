#!/usr/bin/env bash
# Full build of the Kaidarova fashion promo: clip frames → cue sheet → sound → 4 parallel render workers → mux.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build/frames
for f in promo/clips/*.mp4; do
  id=$(basename "$f" .mp4); mkdir -p build/frames/$id
  [ -f build/frames/$id/0001.jpg ] || ffmpeg -y -loglevel error -i "$f" -q:v 2 build/frames/$id/%04d.jpg
done
export SCENE=promo.html
node render.js events build/promo_events.json
python3 score_promo.py build/promo_events.json build/promo_sound.wav build/promo_sfx_only.wav
FR=1080; Q=$(((FR + 3) / 4)); PIDS=()
for i in 0 1 2 3; do
  E=$(((i + 1) * Q)); [ $E -gt $FR ] && E=$FR
  node render.js segment build/pseg$i.mp4 $((i * Q)) $E 2> build/pseg$i.log & PIDS+=($!)
done
for p in "${PIDS[@]}"; do wait "$p" || { echo "render worker failed, see build/pseg*.log"; exit 1; }; done
printf "file 'pseg%d.mp4'\n" 0 1 2 3 > build/plist.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/plist.txt -i build/promo_sound.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -tune film -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest kaidarova_promo.mp4
echo "done: kaidarova_promo.mp4"
ffmpeg -y -loglevel error -i kaidarova_promo.mp4 -i build/promo_sfx_only.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 \
  -movflags +faststart -shortest kaidarova_promo_no_music.mp4
echo "done: kaidarova_promo_no_music.mp4 (effects only, for a licensed track in Instagram)"
