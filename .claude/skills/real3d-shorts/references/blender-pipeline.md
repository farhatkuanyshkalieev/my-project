# Постановка в Blender: проект, kit, грабли

## 1. Структура проекта
```
<PROJECT>/
  project.json          {"skill_dir": "...", "blender": "...", "title": "...", "lang": "ru", "fps": 30}
  script/voice.txt      текст для TTS (числа словами)
  script/voice_display.txt  текст субтитров (числа цифрами)
  script/shots.md       shot list из directing.md §4
  film.py               постановка (копия templates/blender/film.py, переписанная под сценарий)
  scene.blend           результат film.py
  audio/words.json, audio/shots.json, audio/cues.json
  assets/               скачанное fetch_assets.mjs (Poly Haven), кэш общий в ~/.real3d-shorts
  renders/animatic/, renders/final/, checks/
  edit/                 Remotion (копия templates/remotion)
```
Запуск постановки: `"<BLENDER>" -b --python "<PROJECT>/film.py" -- "<PROJECT>"` (без `--factory-startup`:
нужно расширение MPFB). Опции: `--keys` — отрендерить по ключевому кадру каждого шота в `checks/keys.jpg`
(Workbench, 30 с) для быстрой проверки.

## 2. kit (`<SKILL>/scripts/blender/kit`)
```python
import sys; sys.path.insert(0, SKILL + "/scripts/blender")
from kit import core, mats, sets, people, fx, cam, rig
```
| Модуль | Главное |
|---|---|
| `core` | `reset()`, `coll()`, `empty()`, `shots_from_json()`, `keyset()`, `fcurves()`, `const_keys()` |
| `mats` | `pbr(name, tex)`, `simple()`, `parka()`, `knit()`, `leather()`, `stubble()`, `endgrain()`, `splitwood()` |
| `sets` | `world(hdri, strength)`, `fog_box()`, `ground(kind)`, `woodpile()`, `shed()`, `pines()`, `forest(origin)`, `night_lights()`, `room(w,d,h, wall_tex, floor_tex)`, `poly_model(name, loc)` |
| `people` | `human(name, gender, age, weight, muscle, skin, hair, brows, clothes)`, `outfit_winter(hero)`, `outfit_from_pack(hero, items)` |
| `rig` | `ik_hands(rig)`, `cup_hands(rig)`, `pose_track(rig, phases, f_end, shiver, sway)` (позы `cold/still/kneel` + свои dict), `hand_path()`, `rub_keys()`, `relocate(objs, spans)`, `slide()` |
| `face` | **мимика**: `face_track(rig, segments, f_end, blinks, saccades, chatter)`, выражения `EXPR` (neutral, cold, pain, fear, surprise, drowsy, relief, focus, sad, smile), `apply()`, `face_test_grid()` |
| `fx` | `breath(hero, f0, f1)`, `snow(f_end)`, `xray_limb(hero, side, origin)`, `xray_animate(...)`, `flush_light()`, `frost(mat)` |
| `cam` | `shot_camera(name, keys, focus, fstop, handheld)`, `move(kind, ...)` (каталог directing.md §2), `bind_markers(shots)` |

Персонажи — **только** MPFB (MakeHuman CC0) + одежда кодом/из пакета. Никаких нейросетевых моделей людей.
Локации — примитивы + Poly Haven (текстуры, HDRI, модели CC0). Для новой темы сначала поищи модели:
`node <SKILL>/scripts/fetch_assets.mjs search models <слово>`.

## 2.1 Мимика — обязательна в каждом шоте с лицом, и она ГИПЕРБОЛИЗИРОВАННАЯ
Лицо без мимики выглядит манекеном. Реалистичная мимика на телефоне тоже не читается. В этом жанре эмоции
**преувеличены**: страх — глаза распахнуты, брови до упора вверх, рот открыт; боль — сильный прищур, оскал;
холод — сжатые зубы, брови сведены, дрожь челюсти. Зритель должен понять эмоцию за долю секунды без звука.
`face.INTENSITY = 1.7` по умолчанию (1.0 — «как в жизни», 1.6–1.9 — норма жанра), пределы `face.LIMITS`
не дают сломать лицо. Ниже 1.5 не опускай без причины. На каждую фразу с героем в кадре — своё выражение:
```python
face.face_track(rig, [(1, "cold", 1), (S[4][0], "drowsy", 40), (S[5][0], "relief", 30), (S[8][0], "pain", 20)],
                total, blinks=True, saccades=True, chatter=lambda f: 1.0 if f < S[4][0] else 0.0)
```
- Вызывай **после** `rig.pose_track()` (тот очищает анимацию рига).
- Моргание каждые 2–5 с и саккады включены всегда; стук зубов — только для холода/страха.
- Переход между выражениями 20–40 кадров, на ударном слове — 6–10 (резкая смена).
- Перед постановкой: `face.face_test_grid(rig, "<PROJECT>/checks/face.png")` — проверь, что выражения читаются
  на этом персонаже (веки не протыкают кожу, брови не залезают под шапку). При необходимости правь `face.UNITS`.
- Крупные планы лица: камера 45–55 мм, фокус на глазах, лёгкий наезд — мимика должна «играть».

## 3. Грабли (проверено на практике)
1. **MPFB хранит фигуру в шейпкеях.** `data.vertices` — базовая сетка без них. Одежду-оболочки снимай
   со смешанных координат (`people.mixed_coords`), иначе шапка окажется на глазах.
2. **Привязки к костям — в позе покоя.** Перед `parent_type='BONE'` ставь `rig.data.pose_position='REST'`,
   после — обратно `'POSE'`. Иначе шарф/источник пара уезжают.
3. **Ориентиры для камер считай при кадре 1 и от `bone.head_local`**, а не от `matrix_world` на текущем кадре:
   если герой в другом шоте перенесён, все камеры «уедут».
4. **Переносы героя между локациями — через `delta_location`** с CONSTANT-ключами (rig + цели IK + полюса).
   Склейка прячет телепорт.
5. **World Volume глушит объектные объёмы в EEVEE** (пар, рентген-туман). Дымка — `sets.fog_box()`.
6. **Mantaflow-кеш в EEVEE может не подхватиться** и не любит отрицательные кадры. Пар — `fx.breath()`
   (процедурные объёмные клубы с 4D-шумом), это надёжно.
7. Пар **не направлять в камеру**, если она ближе 1 м: замыливает весь кадр. Выдох — вбок-вверх.
8. Поленница/реквизит: без случайных наклонов, иначе «хаос»; поворот только вокруг оси бревна.
9. EEVEE: `Rim.data.volume_factor = 0.15`, иначе контровой рисует световой конус в дымке.
10. **Шапка + гиперболизированные брови:** `brow_up` при INTENSITY 1.7 протыкает лоб сквозь край шапки.
    Для героя в шапке — либо `EXPR[...]["brow_up"]` ≤ 0.5, либо `outfit_winter` с шапкой выше (край +1 см).
11. MCP-мост таймаутит на больших скриптах — скрипт продолжает выполняться; проверяй состояние отдельным вызовом.

## 4. Чек-лист кадра (смотри каждый ключевой кадр крупно, ≥ 40% разрешения)
- Герой в пространстве: ноги на земле, не проваливается, перекрывается предметами правильно.
- Лицо читается, не обрезано (если не задумано), глаза в фокусе.
- Руки не проходят сквозь тело/одежду, кисти не выкручены.
- Свет: герой отделён от фона, есть тёплый/холодный контраст.
- Эффект шота (пар/снег/рентген/вспышка) виден и не закрывает лицо.
- Камера движется и не врезается в геометрию.
