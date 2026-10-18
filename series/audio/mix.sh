#!/usr/bin/env bash
# Final episode mix: voice on top, score ducked under the voice, SFX in between.
# Usage: audio/mix.sh public/ep01 0.15
set -euo pipefail
DIR="$1"
OFFSET_MS=$(python3 -c "print(int(float('${2:-0.15}')*1000))")

ffmpeg -v error -y \
  -i "$DIR/vo.mp3" -i "$DIR/music.wav" -i "$DIR/sfx.wav" \
  -filter_complex "
    [0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${OFFSET_MS}|${OFFSET_MS},
         highpass=f=80,afftdn=nr=18:nf=-50:tn=1,agate=threshold=0.012:ratio=4:attack=3:release=180:range=0.05,equalizer=f=220:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1.5:g=3,
         acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=4,
         apad=whole_dur=60,asplit=2[vo][vokey];
    [1:a]volume=0.42[mus];
    [mus][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[musd];
    [2:a]volume=0.62[fx];
    [vo][musd][fx]amix=inputs=3:normalize=0:duration=first,
         atrim=0:60,loudnorm=I=-14:TP=-1.2:LRA=9[out]" \
  -map "[out]" -ar 48000 -c:a pcm_s16le "$DIR/mix.wav"
echo "mixed -> $DIR/mix.wav"
