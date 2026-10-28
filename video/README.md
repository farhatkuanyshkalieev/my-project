# Dent Line — рекламный ролик (Reels 9:16)

Готовый файл: `out/dentline-ad.mp4` — 1080×1920, 30 fps, ~26.7 с, громкость −14 LUFS.

## Структура
- `public/footage/clinic.mp4` — кадры клиники, очищенные от интерфейса Instagram (кроп + апскейл).
- `public/audio/vo.mp3` — озвучка (ElevenLabs v4, голос «Maxim»), `vo.words.json` — тайминги слов.
- `scripts/build_timeline.py` — привязывает сцены, субтитры и SFX к словам озвучки → `src/timeline.json`.
- `scripts/mix_audio.py` — синтезирует звуковые эффекты и музыку и сводит их с голосом → `public/audio/soundtrack.wav`.
- `src/` — Remotion-композиция (сцены в `scenes.tsx`).

## Пересборка
```bash
npm install
python3 scripts/build_timeline.py public/audio/vo.words.json
python3 -I scripts/mix_audio.py public/audio/vo.wav
npx remotion render src/index.ts DentLineAd out/raw.mp4
ffmpeg -i out/raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.0:LRA=7 -c:a aac -b:a 256k out/dentline-ad.mp4
```

Шрифты Oswald и Montserrat (Google Fonts) распространяются по лицензии SIL Open Font License 1.1.
