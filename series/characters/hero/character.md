# Паспорт персонажа — `hero` (главный герой)

Статус: 📝 **описание на утверждение.** Референсы генерируются на этапе 2 после вашего «да» и при наличии кредитов.

Рабочее имя: ⏳ (предложите или оставим `hero`).

## 1. Описание персонажа (вставляется дословно) 📝

После утверждения этот блок замораживается. Он вставляется **дословно в каждый промпт**, где появляется герой. Действия, камера и предметы описываются отдельно и в этот блок не попадают.

```text
One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black line mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. Keep the same head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Expressions change only the eyes, eyebrows and mouth, never the head shape or character design.
```

Основа — проверенное описание персонажа Style 4. Изменены только цвета: dark → black, потому что у нас ч/б герой; брови и рот описаны явно. Отличительная деталь (шарф и т. п.) ⏳ — не добавлена, ждёт вашего решения.

## 2. Пропорции (ориентир для референсов, не для видеопромптов)

Числовые пропорции **не вставляются** в видеопромпты: скилл предупреждает, что они провоцируют искажения. Они нужны только для проверки референсов и клипов на глаз.

- Полный рост ≈ 4 высоты головы: голова 1, туловище ≈ 1,3, ноги ≈ 1,7.
- Ширина головы чуть больше ширины плеч туловища — милый, но не «чиби».
- Глаза — вертикальные овалы на уровне середины головы, расстояние между ними ≈ ширина одного глаза.
- Брови — короткие штрихи над глазами, наклон бровей несёт эмоцию.
- Рот — одна линия ниже глаз; при радости или удивлении может открываться в простую чёрную форму.
- Кисти — маленькие круглые точки чуть толще линии руки; стопы — короткие скруглённые штрихи вперёд.
- Носа, ушей, волос, одежды нет.

## 3. Ракурсы (turnaround)

| Вид | Что должно быть видно | Чего быть не должно |
|---|---|---|
| **Спереди** | Оба глаза, обе брови, рот по центру; руки слегка разведены, ноги на ширине плеч | Нос, зрачки, асимметрия головы |
| **Сбоку** (профиль вправо) | Один глаз ближе к переднему краю головы, одна бровь, рот выходит к контуру; туловище узкое; одна рука перекрывает другую | Второй глаз «на затылке», нос-выступ |
| **Сзади** | Чистая белая голова **без черт лица**, тот же контур; руки и ноги симметричны | Любые черты лица, волосы |
| 3/4 (по желанию) | Оба глаза, дальний чуть уже и ближе к краю | Перекошенная голова |

## 4. Лист эмоций

| Эмоция | Глаза | Брови | Рот | Поза |
|---|---|---|---|---|
| Нейтральная | Обычные овалы | Ровные | Короткая прямая | Расслабленная стойка |
| Радость | Овалы или дуги «^ ^» | Приподняты | Широкая дуга вверх, может быть открыта | Руки вверх, лёгкий подпрыгивающий шаг |
| Удивление | Увеличенные овалы | Высоко подняты | Маленький круг | Отклон назад, руки в стороны |
| Злость | Чуть сужены | Резко вниз к переносице | Дуга вниз или зигзаг | Наклон вперёд, кулаки |
| Грусть | Опущены | Внутренние концы вверх | Дуга вниз | Сутулость, голова вниз |
| Тревога / страх | Расширены, смотрят в сторону | Подняты домиком | Волнистая линия | Сжатые плечи, руки к груди |
| Задумчивость | Смотрят вверх-в сторону | Одна выше другой | Маленькая боковая линия | Рука у подбородка |

## 5. Промпты для этапа 2 (черновики, пока не запускались)

Целевая модель для картинок: Seedream 5 Lite (сильна в 2D) или Nano Banana 2. Каждую картинку лучше генерировать отдельно: отдельные виды держат стиль надёжнее, чем один большой лист.

**5.1 Лист ракурсов (16:9):**

```text
Character turnaround reference sheet on a plain soft warm off-white background, three full-body views of the same character standing side by side with equal height and scale: front view, right-side profile view, back view. [ANCHOR] Front view shows both eyes, both eyebrows and the mouth with a calm neutral expression. Side profile faces right and shows one eye near the front edge of the head, one eyebrow and the mouth reaching the outline. Back view shows the plain white back of the head with no facial features. Arms relaxed slightly away from the body, legs straight. Clean flat 2D cartoon line art, consistent black line weight, soft small shadow under each figure. No text, no labels, no numbers, no grid, no extra characters, no clothing, no hair, no 3D, no photorealism.
```

**5.2 Лист эмоций (1:1, сетка 3×3, только головы и плечи):**

```text
Facial expression reference sheet of the same character on a plain soft warm off-white background, a 3 by 3 grid of head-and-shoulders portraits with identical head size and outline weight: neutral, happy, surprised, angry, sad, anxious, thinking, determined, laughing. [ANCHOR] Only the eyes, eyebrows and mouth change between portraits; the head shape, white fill and line weight stay identical. Clean flat 2D cartoon line art. No text, no labels, no numbers, no extra characters, no hair, no nose, no 3D.
```

**5.3 Лист поз (16:9):**

```text
Action pose reference sheet of the same character on a plain soft warm off-white background, four full-body poses at equal scale in a row: walking mid-step, running with arms swinging, jumping with arms raised, pointing forward with a confident expression. [ANCHOR] Exactly two arms and two legs in every pose, each limb shown only in its current pose. Clean flat 2D cartoon line art, consistent black line weight, soft shadow under each figure. No motion trails on limbs, no text, no labels, no extra characters, no 3D.
```

`[ANCHOR]` заменяется на блок из раздела 1 целиком.

## 6. Как использовать референсы в видео

- Утверждённые картинки кладём в `series/characters/hero/refs/` (`front.png`, `side.png`, `back.png`, `expressions.png`, `poses.png`).
- В видеомодели используем режим **element-to-video** (картинка как образец персонажа) и прикладываем 1–3 вида к **каждому** клипу.
- Лист ракурсов **нельзя** подавать как первый кадр (image-to-video), иначе ролик начнётся с этой таблицы.
- Для стыковки сцен можно отдельно генерировать первый и последний кадр сцены с героем в нужной позе и использовать режим start/end-frame.
- Референс **дополняет** полный текстовый промпт, а не заменяет его. Описание персонажа в промпте остаётся целиком.
