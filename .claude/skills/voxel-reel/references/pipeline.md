# Пайплайн — команды и что откуда берётся

Обозначения: `B` = `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"`, `PY` = `"…\Blender 5.2\5.2\python\bin\python.exe"`, `SK` = папка скилла, `PRJ` = папка проекта (`project/`), `RND` = папка рендеров на диске с местом.

## Папки проекта
```
PRJ/ script.json  voice_*.{ogg,mp3}  faces/  audio/  scripts/  animatic/  _report/  _old/
RND/ stills/  prev/  final/  subs/
```

## 1. Лица и персонажи
```
B -b --python SK/scripts/face_from_photo.py -- in=PRJ/photo_me.jpg out=PRJ/faces/face_me_1024.png
```
Печатает тон кожи (hex) — подставь в `script.json` → `characters.me.skin`. Для героя из эталона: в сцене замени картинку в материале `Face_Photo` (см. `reference_reel01/r2_core.py` → `build_photo_mouth()` режет губы и добавляет виземы автоматически) и цвета `CH_Tee/CH_Jeans/CH_Hair/CH_Skin` под фото. NPC: `build_npc(name, cfg, col, faces_dir)` из `lib/npc_build.py`; `cfg.kind` ∈ stroller | suit | teen | grandma | scooter | courier | bg, `face` — имя текстуры `face_<face>_1024.png`.

## 2. Аудио
```
PY SK/scripts/audio_pipeline.py PRJ
```
→ `PRJ/audio/timing.json`, `timing_table.md`, `voice_timeline.wav`, `clips/*.wav`, `lines.json`. Первый запуск печатает сегменты whisper — сверь с репликами, при необходимости проставь `seg`.

## 3. Тест липсинга
Скопируй `reference_reel01/lipsync_test.py` в `PRJ/scripts/`, поправь пути (`R`), id реплик (в образце `C10` и `M5`) и кадр позы. Запуск: `B -b SK/assets/Template_Room.blend --python PRJ/scripts/lipsync_test.py -- render`, затем `PY PRJ/scripts/lipsync_compose.py` → `lipsync_test_540x960.mp4`. Проверь полосы рта: `ffmpeg -start_number N -i me_%04d.png -frames:v 18 -vf "crop=…,tile=6x3"`.

## 4. Сцена
`PRJ/scripts/reel_build.py` (копия `reference_reel01/reel2_build.py`) exec'ит по очереди:
- `r2_core.py` — тайминг → кадры (`wf`), подготовка эталона, улица (`build()`), NPC и их пути/походка, анимация героя (позы `POSE`, веса `W`, походка, взгляд `LOOK`, эмоции, виземы, моргания), телефон.
- `r2_claude.py` — Claude: цвет, без ног, маршрут `WP`/`CIRC`, повороты ступеньками, глаза, рот.
- `r2_fx.py` — голограммы шагов, рентген-скан (`XRayFX`), разбор города (чанки `S["chunks"]`), волна материалов (`MatWave`), цикл света, штатив, звуковая волна.
- `r2_cams.py` — все шоты `shot(name, f0, f1, pos, tgt, lens, …)`, шум камеры, whip; заполняет `LOOK`/`CAM_FACE`/`CAMPOS`.
- `bake_claude(); bake_me(); bake_phone(); bake_cams(); bake_holos()` — запекание в ключи.
- `r2_end.py` — концовка (подпись канала из вокселей, карточка).
- `r2_look.py` — финальный свет (солнце/небо/фонари, комната днём), пресет FAST.
Сохраняет `RND/reel_scene.blend` и `PRJ/animatic/events.json` (события для звука и композа). Запуск с проверкой кадров: `B -b SK/assets/Template_Room.blend --python PRJ/scripts/reel_build.py -- stills 6,110,330,… out=RND/stills`.

## 5. Аниматик + QA
```
B -b RND/reel_scene.blend --python SK/scripts/reference_reel01/animatic2_render.py      (Workbench → RND/animatic/a_%04d.png)
PY SK/scripts/lib/sound_build.py        (читает events.json + timing.json → audio/final_mix.wav; все SFX и музыка синтезируются)
PY SK/scripts/lib/compose.py "RND/animatic/a_%04d.png" 540 animatic RND/animatic.mp4
B -b RND/reel_scene.blend --python SK/scripts/lib/qa_reel2.py   → animatic/qa2.json
```
В `sound_build.py`/`compose.py`/`qa_reel2.py` путь `R` — папка проекта; поправь константу вверху файла.

## 6–7. Стоп-кадры и превью
`reel_build.py -- stills …` (EEVEE FAST, 540 или 1080) и
```
B -b RND/reel_scene.blend --python SK/scripts/lib/render2.py -- res=540 out=RND/prev
PY SK/scripts/lib/compose.py "RND/prev/f_%04d.png" 540 preview RND/preview_540.mp4
```

## 8. Финал
Цикл с докачкой (render2 пропускает готовые кадры: `use_overwrite=False`):
```
for try in 1..8: [ $(ls RND/final | grep -c png) -ge N ] && break; B -b RND/reel_scene.blend --python render2.py -- res=1080 out=RND/final; done
PY compose.py "RND/final/f_%04d.png" 1080 final RND/final_1080.mp4
```
Проверка: `ffprobe`, `ebur128` (−14 LUFS, ≤ −1 dBTP), контакт-лист.

## 9. Субтитры (Remotion)
```
cd RND && npx -y create-video@latest --yes --blank --no-tailwind subs && cd subs
npx remotion add @remotion/media && npx remotion add @remotion/google-fonts
copy SK/scripts/subs/*.tsx src/ ; copy RND/final_1080.mp4 public/final.mp4
```
Страницы: сгенерируй `public/pages.json` из `timing.json` (≤4 слов, разрыв на паузе >0,35 с и знаках препинания, концы страниц не пересекаются) — генератор в `reference_reel01/` (`subs_pages` фрагмент в `pipeline` образца) или напиши 20 строк на Python. Рендер: `npx remotion render Subs ../final_subs_v.mp4 --codec h264 --crf 18`, затем **верни исходный звук**: `ffmpeg -i final_subs_v.mp4 -i final_1080.mp4 -map 0:v -map 1:a -c copy final_subs.mp4` (Remotion пересжимает звук громче).

## Производительность
Сцена образца (1700 объектов, 425 чанков, объёмная дымка): 540 → ~1 с/кадр, 1080 → ~1,3 с/кадр на RTX-класса GPU. Сборка сцены ~100 с. PNG compression 15. Если рендер падает — цикл докачки продолжит с места падения.
