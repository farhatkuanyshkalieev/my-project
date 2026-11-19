# Установка — всё ставит сам скилл

У пользователя есть **только Blender и MCP-мост к Blender**. Всё остальное скилл проверяет и ставит сам,
без прав администратора, ничего не спрашивая про технические детали (сообщай коротко, что ставишь).

## Порядок (Шаг 0)
1. **Путь к Blender — из моста.** Выполни через MCP: `result = {"bin": bpy.app.binary_path, "ver": bpy.app.version_string}`.
   Если мост не отвечает — попроси пользователя открыть Blender (мост включается автоматически при старте).
   Нужна версия 5.1+; если старее — попроси обновить Blender (https://www.blender.org/download/).
2. **Bootstrap** (Node.js, ffmpeg, MPFB + MakeHuman, базовые ассеты):
   - Windows: `powershell -ExecutionPolicy Bypass -File "<SKILL>/scripts/bootstrap.ps1" -Blender "<bin>"`
   - Mac/Linux: `bash "<SKILL>/scripts/bootstrap.sh" "<bin>"`
   Скрипт сначала пробует winget/Homebrew, а если их нет — качает портативные Node.js и ffmpeg в
   `~/.real3d-shorts/bin` и добавляет в PATH пользователя. Пакет MakeHuman ~280 МБ, ассеты ~150 МБ —
   предупреди, что первый запуск займёт 5–15 минут.
3. В текущей сессии оболочки PATH мог не обновиться: добавь строку `PATH_ADD=…` из вывода в начало PATH
   перед вызовами `node`/`ffmpeg` (PowerShell: `$env:Path = "<PATH_ADD>;" + $env:Path`, bash: `export PATH="<PATH_ADD>:$PATH"`).
4. Проверка: `node "<SKILL>/scripts/check_setup.mjs"` — все пункты ✅. Что ❌ — повтори bootstrap; если снова ❌,
   покажи пользователю текст ошибки и предложи ручную установку по ссылке из таблицы ниже.
5. Remotion и whisper ставятся сами в проекте: `npm install` в `<PROJECT>/edit` (whisper.cpp и модель ~470 МБ
   скачаются при первом `tools/whisper.mjs`).

## Что и откуда
| Компонент | Как ставится | Ручная установка (если авто не вышло) |
|---|---|---|
| Node.js LTS | winget / brew / портативный zip с nodejs.org | https://nodejs.org |
| ffmpeg | winget / brew / портативный (gyan.dev, evermeet.cx, johnvansickle) | https://ffmpeg.org/download.html |
| MPFB | `install_mpfb.py` из extensions.blender.org + сохранение настроек | Blender → Edit → Preferences → Get Extensions → «MPFB» |
| MakeHuman CC0 | `install_mpfb.py` скачивает и подключает | MPFB → Apply assets → Load pack |
| Poly Haven | `fetch_assets.mjs` по требованию | https://polyhaven.com |
| Remotion, whisper | `npm install` в проекте | — |

## Грабли установки
- **MPFB должен быть сохранён в настройках** (`wm.save_userpref`), иначе фоновый Blender (`-b`) его не видит:
  «addon does not exist» / `TypeError: 'NoneType' object is not subscriptable` в logservice. Скрипт это делает.
- Не запускай Blender с `--factory-startup` для постановки — так отключаются расширения (MPFB).
- В Windows путь с пробелами ломает установщик whisper из Remotion — `tools/whisper.mjs` уже обходит это.

## Озвучка — ElevenLabs или бесплатно
- ElevenLabs работает через Claude in Chrome (браузерное расширение) и аккаунт пользователя. Если расширения нет —
  предложи поставить (https://claude.ai/chrome) или используй бесплатный Piper (`tools/tts_piper.mjs`, ставится сам).
