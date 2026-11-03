# Библия сериала — Stickman Animation (YouTube Shorts)

Статус: **этап 1 — черновик на утверждение.** Блоки помечены статусом:
🔒 зафиксировано · 📝 черновик, ждёт утверждения · ⏳ решение не принято.

Блоки в `text`-рамках — это готовые английские фрагменты промптов. В промпты их вставляют **дословно**, без сокращений вроде «same character» или «as before».

---

## 1. Формат 🔒

| Параметр | Значение |
|---|---|
| Платформа | YouTube Shorts |
| Соотношение | 9:16 (вертикаль) |
| Длительность эпизода | 60 с |
| Структура | 6 самостоятельных клипов по ~10 с |
| Режим скилла | A · Director (`directing-stickman-videos`) |
| Стиль | **A4 · Style 4 Cozy Storytelling, светлая минималистичная вариация** |
| Целевая видеомодель | Gemini Omni Flash / Omni 1.1 Flash (запасные: Kling 3 Omni, Veo 3.1) |
| Технические цели клипа | ~10 с, 9:16, 720p и выше, 24 fps, синхронный звук |
| Финальный экспорт | 1080×1920, H.264, AAC, громкость около −14 LUFS |

## 2. Визуальный стиль 📝

**База:** персонаж и правила Style 4 без изменений. Белая залитая голова и туловище, чёрные конечности-линии, простое выразительное лицо.

**Наша вариация:** вместо полноцветных сцен окружение светлое и почти монохромное. Скилл разрешает подбирать цвета окружения под тему, поэтому это не ломает стиль.

Фрагмент окружения (вставляется в каждый промпт и дополняется локацией конкретной сцены):

```text
Light minimalist 2D cartoon environment: a soft warm off-white background with very pale gray tones; scenery and props drawn with clean black and light-gray outlines and flat soft fills; a gentle soft shadow under the character's feet; subtle depth through overlapping planes, scale and foreground elements; plenty of clean negative space. The location is recognizable but sparse, showing only the furniture and props the story needs. Smooth, fluid, high-quality 2D character animation with natural body, head, arm and facial motion.
```

Формулировка для визуальной плотности (из контракта скилла). Важно, что там сказано «scene changes», а не «style changes», иначе модель начнёт менять стиль рисовки:

```text
rapid scene changes, kinetic motion-graphic transformations, and frequent visual events, while preserving an identical stick-figure design, constant line weight, and strict temporal consistency
```

## 3. Палитра ⏳

| Роль | Цвет | Статус |
|---|---|---|
| Фон | soft warm off-white, very pale gray | 📝 |
| Персонаж | white fill, black outline and limbs | 🔒 |
| Предметы и декор | black and light-gray outlines, flat pale fills | 📝 |
| Акценты (до 3 на эпизод) | ⏳ ваш выбор: строго ч/б **или** 1–3 цвета на предметах, например vivid red = тревога/опасность, warm gold = находка/успех, calm blue = спокойствие | ⏳ |

Правило: цвета называем только обычными словами, без HEX, RGB или Pantone. Иначе модель может нарисовать эти коды прямо в кадре.

## 4. Персонажи

| ID | Роль | Файл | Статус |
|---|---|---|---|
| `hero` | Главный герой (рабочее имя ⏳) | [`characters/hero/character.md`](characters/hero/character.md) | 📝 описание готово, референсы на этапе 2 |

Второстепенных персонажей добавляем только под конкретный эпизод. Для каждого — свой полный паспорт по той же схеме и минимум два отличия от героя, не связанных с цветом. Фоновых прохожих и клонов без плана не допускаем.

## 5. Камера и композиция 9:16 📝

- Глубина вместо горизонтали: передний, средний и задний планы, герой движется к камере или от неё.
- Вертикальные раскрытия: тилт вверх или вниз, предмет падает или поднимается через кадр.
- Проходы на переднем плане (дверь, лист, рука, предмет) — вытеснение кадра (wipe) для склейки.
- Внутри 10-секундной сцены 2–3 смены плана: общий → средний → крупный по лицу ради эмоции.
- Наезды и отъезды мотивированы действием, а не просто «зумом по картинке».
- Верхние ~15 % и нижние ~20 % кадра держим чистыми под интерфейс Shorts и субтитры.

## 6. Анимация и актёрская игра 📝

- Каждые 2–3 секунды происходит заметное визуальное событие. Персонаж никогда не стоит без дела.
- Только конкретные физические действия (бежит, хватает, открывает, роняет). Никаких абстрактных «перетеканий» предметов друг в друга: на них видеомодели дёргаются и теряют кадры.
- Эмоция = глаза + брови + рот + поза тела + тайминг. Короткая реакционная пауза допустима, неподвижный «говорящий» кадр — нет.
- В кадре по-прежнему 2 руки и 2 ноги: двигающаяся конечность заменяет прежнюю позу, а не дублирует её.
- Эффекты (линии скорости, искры, значки) рисуются на предметах или отдельно от тела, а не шлейфом от конечностей.
- Никакого текста в кадре: пузыри сообщений, экраны и часы — только значками. Надписи добавляются на монтаже.

## 7. Звук ⏳

**Голос.** Один закадровый рассказчик на весь эпизод, а лучше на весь сериал. Губы не синхронизируются, реплик персонажей нет, если отдельно не утвердим иное. Окончательный профиль утверждается на этапе 3 (Phase A).

Черновик по умолчанию — мужской блок, который проверен в скилле на слух. Если выберете другой голос (женский, русский и т. п.), составлю новый полный блок.

```text
One off-screen adult male narrator throughout. General American accent, warm clean baritone, medium-low pitch, gentle chest resonance, no raspiness or breathiness. Calm conversational delivery, restrained pitch variation, steady speaking pace, and close, dry studio sound. Keep the same vocal timbre, register, accent, pace, and recording quality throughout. Emotional progression belongs to the visuals and music; do not change the narrator's voice or switch to character dialogue.
```

Для стабильности между клипами рекомендую записать одну цельную дорожку озвучки в ElevenLabs и подложить её при монтаже. Звук видеомодели оставляем для эффектов.

**Музыка** 📝 — единая тема сериала: лёгкий щипковый пиццикато, мягкое пианино, тихие перкуссии, 90–100 BPM. Клип 1 задаёт тему, клипы 2–6 обязаны её продолжать (тот же темп и инструменты).

**Эффекты** — короткие и чёткие на каждом физическом действии (шаг, хлопок, «поп» появления значка, свист).

## 8. Общие запреты (negative) 📝

```text
No photorealism, no 3D CGI or 3D humanoid rendering, no realistic skin, no detailed irises or pupils, no lips, no nose, no hair, no clothing or accessories on the character, no extra or duplicated limbs, no retained previous limb poses, no changing head or body proportions, no broken or changing line weight, no unintended extra characters or clones, no paper texture, no sketchbook border, no white card frame, no visible words, letters, numbers, captions, subtitles, logos or watermarks, no speech bubbles or dialogue boxes, no abstract liquid morphing of objects, no static image with only a zoom; the character must be fully animated.
```

## 9. Конвейер эпизода

1. Phase A — предложение режиссёра: раскадровка 6×10 с, английская озвучка ~120–150 слов с переводом, голос, музыка, связки между сценами. → **утверждение**.
2. Phase B — 6 самостоятельных промптов и гайд по склейке.
3. Тестовый клип 1 → проверка по [`qa-checklist.md`](qa-checklist.md) → клипы 2–6.
4. Монтаж (ffmpeg): обрезка, кроссфейды, озвучка и музыка, субтитры, экспорт.
5. По желанию: обложка и тексты для публикации.

Файлы эпизода: `series/episodes/epXX-<slug>/` (`proposal.md`, `prompts.md`, `continuity-log.md`, `clips/`, `final/`).
