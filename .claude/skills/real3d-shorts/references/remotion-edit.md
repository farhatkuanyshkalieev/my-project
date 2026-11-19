# Монтаж в Remotion (`<PROJECT>/edit`)

```
cd <PROJECT>/edit
npm install                          # один раз
node tools/plan.mjs                  # субтитры (текст сценария × тайминги whisper) + звуки из ../audio/cues.json → src/plan.json
npm run animatic                     # out/animatic.mp4 (видео renders/animatic)
npx remotion render src/index.ts Short out/short.mp4
ffmpeg -y -i out/short.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/final.mp4
```

## Субтитры (стиль)
- 2–3 слова на экране, разбиение по знакам препинания, слова не переносятся посередине.
- Шрифт Montserrat 900 (Google Fonts, кириллица), белый, обводка 14 px чёрная + тень, ~88 px.
- Позиция: нижняя треть (отступ снизу 620 px из 1920), не закрывать лица.
- Появление пружиной (scale 0.72 → 1). Между группами без «мигания» (до 0.4 с держим предыдущую).
- Текст — из `script/voice_display.txt`, тайминги — из `audio/words.json`.

## public/
`video.mp4` (финал из renders/final), `animatic.mp4`, `voice.mp3`, `music.wav`, `amb_wind.wav`, `sfx_*.wav`.
