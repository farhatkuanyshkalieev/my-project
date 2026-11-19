# Озвучка: ElevenLabs через браузер + тайминги слов

## 1. ElevenLabs (основной вариант) — через Claude in Chrome
1. Загрузи инструменты Chrome одним ToolSearch (tabs_context_mcp, navigate, computer, find, form_input,
   javascript_tool). Работай в новой вкладке.
2. `https://elevenlabs.io/app/speech-synthesis/text-to-speech`. Если не вошёл — попроси пользователя войти самому.
3. **Голос:** открой выбор голоса → фильтр языка (Russian для русского) → мужской документальный
   нарратор, глубокий и спокойный (на 28.10.2026 хорошо работал «Alex Bell – Deep and Confident»).
   Не бери голоса другого языка (индийские/английские) для русского текста.
4. В редакторе: клик в текст → Ctrl+A → Delete → набери `script/voice.txt` целиком.
5. Назови пользователю расход (≈ 1 кредит/символ) и нажми **Generate speech**. Получится 2 варианта.
6. **Скачивание** (кнопка ⬇ у варианта). Грабли Chrome:
   - Папка загрузок — из `…/Google/Chrome/User Data/Default/Preferences` → `download.default_directory`.
   - Файл может лечь как `<uuid>.tmp` — проверь `ffprobe` (format=mp3) и переименуй в `voice.mp3`.
   - Если `download.prompt_for_download = true`, Chrome открывает окно «Сохранить как», которое Claude не видит.
     Попроси пользователя один раз: Chrome → Настройки → Скачанные файлы → выключить «Всегда указывать место».
   - Вторая и следующие загрузки с сайта могут блокироваться («Сайт пытается скачать несколько файлов») —
     попроси пользователя нажать «Разрешить» в адресной строке.
   - Blob-аудио со страницы нельзя отправить на localhost (CSP) — не трать на это время.
7. Положи в `<PROJECT>/edit/public/voice.mp3`.

## 2. Без ElevenLabs — Piper (бесплатно, офлайн)
`node tools/tts_piper.mjs script/voice.txt public/voice.wav ru` (мужской русский голос). Честно скажи,
что звучит проще ElevenLabs.

## 3. Тайминги
```
cd <PROJECT>/edit
node tools/whisper.mjs public/voice.mp3 ru     → ../audio/words.json  [{t, s, e}]
node tools/shots.mjs                            → ../audio/shots.json  (фразы, кадры начала/конца шотов)
```
`shots.mjs` сопоставляет фразы из `script/voice.txt` со словами whisper (по порядку слов, устойчив к
ошибкам распознавания) и выдаёт `{fps, total, shots:[{i, text, start, end}]}`. **Текст субтитров всегда
берётся из сценария**, а не из whisper (он ошибается: «тресло», «нару»).
