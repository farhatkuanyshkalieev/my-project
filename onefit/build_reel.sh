#!/usr/bin/env bash
# Full build of the 1Fit ad: cue sheet → sound (music + sfx + voiceover) → 4 parallel render workers → mux.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
node render.js events build/events.json
python3 score_fit.py build/events.json vo/vo.wav build/sound.wav
DUR=$(sed -n 's/.*DUR = \([0-9.]*\).*/\1/p' vo/cues.js)
FR=$(python3 -c "print(round($DUR * 60))"); Q=$(((FR + 3) / 4))
for i in 0 1 2 3; do
  E=$(((i + 1) * Q)); [ $E -gt $FR ] && E=$FR
  node render.js segment build/seg$i.mp4 $((i * Q)) $E 2> build/seg$i.log &
done
wait
printf "file 'seg%d.mp4'\n" 0 1 2 3 > build/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/list.txt -i build/sound.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -tune film -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest 1fit_ad.mp4
echo "done: 1fit_ad.mp4"
