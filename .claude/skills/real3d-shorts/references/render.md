# Рендер: аниматик Workbench → финал EEVEE

Оба режима — `scripts/blender/render.py`. Кадры пишутся в `<PROJECT>/renders/<mode>/f_####.jpg`,
перезапуск дорендеривает только недостающие кадры (`use_overwrite=False`, плейсхолдеры).

## 1. Аниматик (Workbench) — контроль движения
```
"<BLENDER>" -b "<PROJECT>/scene.blend" --python "<SKILL>/scripts/blender/render.py" -- "<PROJECT>" animatic
```
- 720×1280, движок Workbench, Solid, освещение Studio, цвет по материалу (видно героя/реквизит),
  тени и полость включены, объёмы (пар, дымка) скрыты, рентген — полупрозрачный по viewport display.
- ≈ 0,1–0,2 с/кадр → 45 с ролика за 2–5 минут.
- Затем `cd edit && npm run animatic` — склейка с голосом и субтитрами в `out/animatic.mp4`.
- Проверь: каждый шот начинается в нужный момент фразы, камеры не врезаются в геометрию, герой не
  проваливается в землю, руки не проходят сквозь тело, склейки на действии, динамика по directing.md §3.

## 2. Финал (EEVEE)
```
"<BLENDER>" -b "<PROJECT>/scene.blend" --python "<SKILL>/scripts/blender/render.py" -- "<PROJECT>" final
```
- 1080×1920, 30 fps, 32 сэмпла, объёмы (тайлы 2 px, 96 сэмплов), глубина резкости, моушен-блюр 0.5,
  AgX Medium High Contrast, экспозиция −0.3.
- ≈ 7–9 с/кадр на RTX-уровне → 45 с ≈ 2,5–3,5 ч. Сообщи время заранее. Запускай в фоне
  (`run_in_background`), следи за числом кадров в папке, не опрашивай чаще раза в 5–10 минут.
- Через MCP-мост рендер всегда «таймаутит» — это нормально, Blender продолжает. Проверяй по файлам.

## 3. После рендера
```
ffmpeg -framerate 30 -i renders/final/f_%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 16 edit/public/video.mp4
```
Контактный лист для самопроверки:
`ffmpeg -i out/final.mp4 -vf "fps=0.5,scale=180:320,tile=12x2" -frames:v 1 checks/final_sheet.jpg`.
