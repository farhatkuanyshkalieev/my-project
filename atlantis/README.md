# Atlantis Dent — рекламный ролик (Reels 9:16)

Статус: моушн, монтаж и SFX готовы; **ждём озвучку** (на текущем аккаунте ElevenLabs кончились кредиты).
`src/timeline.json` и `public/audio/soundtrack.wav` сейчас собраны на *примерных* таймингах без голоса.

## Озвучка
ElevenLabs, модель `eleven_v4`, голос «Maxim - Premium Baritone» (как у ролика Dent Line), ~350 кредитов на дубль:

> [energetic] Атлантис Дент — стоматология для всей семьи в Астане! Имплантация, терапия и ортодонтия — всё в одной клинике. Импланты ставят опытные хирурги: аккуратно, точно и с заботой о каждом пациенте. Выгодная имплантация и улыбка без переплат! Ждём вас на улице Бухар Жырау, тридцать три дробь один. Записывайтесь в Атлантис Дент через ватсап!

## Сборка после получения голоса
1. Положить озвучку в `public/audio/vo.mp3`, сделать `vo.wav` (48 кГц, моно).
2. Получить тайминги слов (faster-whisper, `word_timestamps=True`) → `public/audio/vo.words.json`
   в формате `[{"w": "слово", "s": 0.0, "e": 0.4}, ...]`.
3. ```bash
   python3 scripts/build_timeline.py public/audio/vo.words.json
   python3 -I scripts/mix_audio.py public/audio/vo.wav
   npx remotion render src/index.ts AtlantisAd out/raw.mp4
   ffmpeg -i out/raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.0:LRA=7 -c:a aac -b:a 256k out/atlantis-ad.mp4
   ```

## Сцены
Интро с логотипом → 3 направления (имплантация, терапия, ортодонтия) → нарезка установки импланта
с субтитрами → «Выгодная имплантация» со сборкой импланта и штампом «улыбка без переплат» →
адрес на кадрах команды → запись в WhatsApp (+7 700 711 30 35), @atlantis.dent, «made by f4rh4t._».

Шрифты Oswald и Montserrat (Google Fonts) распространяются по лицензии SIL Open Font License 1.1.
