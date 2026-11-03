#!/usr/bin/env bash
# Обработка голоса с телефона: очистка, EQ, компрессия, сжатие пауз, лёгкое ускорение.
# Использование: scripts/process_voice.sh <вход.m4a> <выход.wav>
set -euo pipefail
in="$1"; out="$2"; tmp="$(mktemp -d)"
# 1) гул <85 Гц, мягкий шумодав, минус «коробка» 320 Гц, тепло 140 Гц, разборчивость 3.6 кГц, воздух 9 кГц, де-эссер, компрессор
ffmpeg -v error -y -i "$in" -af "highpass=f=85:poles=2,afftdn=nr=10:nf=-50:tn=1,equalizer=f=320:t=q:w=1.1:g=-3.5,equalizer=f=140:t=q:w=1:g=1.5,equalizer=f=3600:t=q:w=1.2:g=3.5,highshelf=f=9000:g=2.5,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:makeup=4dB:knee=4" -ar 48000 -ac 1 "$tmp/enh.wav"
# 2) паузы длиннее 0.24 с сжимаются до 0.24 с, тишина по краям срезается
python3 "$(dirname "$0")/tighten.py" "$tmp/enh.wav" "$tmp/tight.wav" 0.24
# 3) темп +6% без изменения высоты, лимитер
ffmpeg -v error -y -i "$tmp/tight.wav" -af "atempo=1.06,alimiter=limit=0.89:attack=2:release=40" -ar 48000 "$out"
rm -rf "$tmp"
