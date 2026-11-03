# Промпты референсов героя — этап 2 (CHARACTER REFERENCES)

Статус: 📝 **подготовлены, не запускались.** Кредиты не расходовались.

Источник: утверждённое описание персонажа (ред. 3) и Character Consistency System из [`../character.md`](../character.md). Эти промпты заменяют черновики из раздела 7 паспорта: там был общий лист трёх видов, здесь — отдельные виды и ¾.

## Общие правила для всех 6 промптов

- `autoEnhancePrompt = false` — **обязательно**. Иначе OpenArt перепишет промпт и потеряет зафиксированные формулировки.
- Одна модель на весь набор, одни настройки фона и освещения.
- Отдельные виды: формат 3:4, герой целиком, по центру, занимает ≈ 75 % высоты кадра.
- Промпт 1 (Front) генерируется **без референса** (text2image) и становится мастер-референсом.
- Промпты 2–6 генерируются **с мастер-референсом** (image2image, поле `visualReferences`). К ним добавляется префикс REFERENCE LOCK.

### REFERENCE LOCK (префикс для промптов 2–6)

```text
Use the attached reference image as the exact character design: identical round head shape and size, identical head-to-body proportions, identical eye size, height and spacing, identical eyebrow and mouth style, identical white fill and identical black line weight. Change only what this prompt asks for.
```

---

## 1. Front view — мастер-референс

Статус: ✅ **окончательная версия для Dreamina (Seedream 5.0 Lite).** Стопы направлены вперёд, как в паспорте (таблица 2.1); мягкая серая тень под ногами сохранена, как разрешает библия (§2).

Режим: **text2image** · 3:4 · максимальное бесплатное разрешение · 4 варианта на выбор

```text
Full-body front view character reference of a single character, standing upright, facing the viewer directly, centered, the figure filling about three quarters of the image height. One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. The eyes always sit at the same height and spacing on the face. Keep the same head shape, head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Only the facial expression and the pose of the head, body and limbs change; the character design never changes. Head turns, head tilts and torso bends only animate the existing shape: the head keeps the same round shape and size from every angle, the torso bends as one piece without stretching, shrinking or changing its proportions, and the silhouette stays instantly recognizable while the motion stays fluid and natural. The full standing figure is about four head-heights tall, and the head is slightly wider than the top of the torso. Both eyes sit side by side on the horizontal middle line of the head, separated by about one eye width; the eyebrows sit just above them; the mouth is a short straight line below the eyes. Calm neutral expression. Arms hang relaxed slightly away from the torso, legs straight and about torso-width apart, short rounded feet pointing forward toward the viewer. Clean flat 2D cartoon line art, consistent black line weight, plain soft warm off-white background, a small soft gray shadow under the feet, even soft lighting. No text, no labels, no numbers, no watermark, no grid lines, no extra characters, no nose, no ears, no pupils, no lips, no 3D, no photorealism, no paper texture, no distorted or stretched head or torso.
```

### 1c. Компактная версия для Dreamina (лимит 2000 символов) — использовать её

В Dreamina поле промпта ограничено 2000 символами, а полная версия выше длиннее (~2 240). Компактная версия — 1 607 символов. Все визуальные характеристики героя из паспорта (таблица 2.1) сохранены. Убраны только фразы про анимацию (повороты, наклоны, сменяющиеся позы), которые для статичного кадра не нужны, и повторы. Добавлены уточнения «no body turn» и «the head is a perfect circle» — они следуют из паспорта. Полное описание персонажа по-прежнему вставляется дословно во все видеопромпты.

```text
Full-body front view character reference of one single character, standing upright, facing the viewer directly, no body turn, centered, filling about three quarters of the image height. A minimalist 2D cartoon stickman with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Exactly two arms and two legs, each a black single-line stroke of constant medium weight; hands are small black rounded shapes; feet are short black rounded strokes. No hair, no clothing, no accessories. The full figure is about four head-heights tall, and the head is slightly wider than the top of the torso. The head is a perfect circle. Both eyes sit side by side on the horizontal middle line of the head, separated by about one eye width; the eyebrows sit just above them; the mouth is a short straight line below the eyes. Calm neutral expression. Arms hang relaxed slightly away from the torso, legs straight and about torso-width apart, short rounded feet pointing forward toward the viewer. Clean flat 2D cartoon line art, the same black line weight on head, torso, arms and legs, plain soft warm off-white background, a small soft gray shadow under the feet, even soft lighting. No text, no labels, no numbers, no watermark, no grid lines, no extra characters, no props, no nose, no ears, no pupils, no lips, no fingers, no motion lines, no 3D, no photorealism, no paper texture, no distorted or stretched head or torso.
```

### 1a. Negative prompt (Dreamina, отдельное поле)

Вставляется в поле Negative prompt, если оно есть. Если поля нет, ничего не добавляется: основные запреты уже стоят в конце промпта. Блок дополнительно защищает от поворота корпуса и линий движения, которые могут подсказать фразы об анимации в описании персонажа.

```text
text, letters, numbers, labels, watermark, logo, signature, grid lines, frame, border, extra characters, multiple figures, props, objects, accessories, hat, hair, clothing, nose, ears, pupils, irises, lips, teeth, fingers, extra limbs, extra arms, extra legs, motion lines, speed lines, turned body, side view, three-quarter view, tilted head, squash and stretch, stretched or flattened head, oval head, distorted torso, uneven line weight, sketchy lines, shading gradients, 3D, CGI, photorealism, realistic skin, paper texture, colored background, busy background
```

### 1b. Настройки Dreamina

| Настройка | Значение |
|---|---|
| Раздел | Генерация изображений, текст → картинка |
| Модель | Seedream 5.0 Lite |
| Формат | 3:4 |
| Разрешение | Максимальное из бесплатно доступных |
| Количество | 4 |
| Улучшение промпта (Auto Enhance / Prompt optimization / ✨) | Выключено |
| Референс / режим Character | Не используется |
| Стиль / пресет | Нет (None / Default) |
| Seed | Случайный; seed выбранного варианта записать в журнал `README.md` |

Перед запуском: проверить стоимость и дневной баланс, а также что промпт не обрезан лимитом символов. Если обрезан, промпт самим не сокращать, а сообщить точный лимит.

## 2. Three-quarter view

Режим: **image2image** + мастер Front · 3:4 · 2K · 2 варианта

```text
[REFERENCE LOCK] Full-body three-quarter view character reference of the same single character, body and head turned about 45 degrees toward the right side of the image, centered, the figure filling about three quarters of the image height. One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. The eyes always sit at the same height and spacing on the face. Keep the same head shape, head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Only the facial expression and the pose of the head, body and limbs change; the character design never changes. Head turns, head tilts and torso bends only animate the existing shape: the head keeps the same round shape and size from every angle, the torso bends as one piece without stretching, shrinking or changing its proportions, and the silhouette stays instantly recognizable while the motion stays fluid and natural. The head remains a perfect circle of the same size as in the reference; both eyes stay on the same horizontal middle line, shifted toward the right side of the face, with the farther eye slightly narrower; the eyebrows and the short mouth shift with them. The torso is seen at an angle but keeps its length and width. Calm neutral expression, arms relaxed, legs straight. Clean flat 2D cartoon line art, consistent black line weight, plain soft warm off-white background, a small soft gray shadow under the feet, even soft lighting. No text, no labels, no numbers, no watermark, no extra characters, no nose, no ears, no pupils, no lips, no 3D, no photorealism, no distorted or stretched head or torso.
```

## 3. Side view

Режим: **image2image** + мастер Front (+ утверждённый ¾ при желании) · 3:4 · 2K · 2 варианта

```text
[REFERENCE LOCK] Full-body side profile view character reference of the same single character, facing to the right of the image, centered, the figure filling about three quarters of the image height. One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. The eyes always sit at the same height and spacing on the face. Keep the same head shape, head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Only the facial expression and the pose of the head, body and limbs change; the character design never changes. Head turns, head tilts and torso bends only animate the existing shape: the head keeps the same round shape and size from every angle, the torso bends as one piece without stretching, shrinking or changing its proportions, and the silhouette stays instantly recognizable while the motion stays fluid and natural. In profile the head is still a perfect circle of the same size; only one eye is visible, placed near the front right edge of the head on the same horizontal middle line; one eyebrow above it; the short mouth reaches the front outline of the head. The torso appears narrower from the side but keeps its length. The near arm hangs in front of the far arm, the near leg slightly overlaps the far leg, and both feet point to the right. Calm neutral expression. Clean flat 2D cartoon line art, consistent black line weight, plain soft warm off-white background, a small soft gray shadow under the feet, even soft lighting. No text, no labels, no numbers, no watermark, no extra characters, no second eye on the back of the head, no nose, no ears, no pupils, no lips, no 3D, no photorealism, no distorted or stretched head or torso.
```

## 4. Back view

Режим: **image2image** + мастер Front · 3:4 · 2K · 2 варианта

```text
[REFERENCE LOCK] Full-body back view character reference of the same single character, standing upright with its back to the viewer, centered, the figure filling about three quarters of the image height. One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. The eyes always sit at the same height and spacing on the face. Keep the same head shape, head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Only the facial expression and the pose of the head, body and limbs change; the character design never changes. Head turns, head tilts and torso bends only animate the existing shape: the head keeps the same round shape and size from every angle, the torso bends as one piece without stretching, shrinking or changing its proportions, and the silhouette stays instantly recognizable while the motion stays fluid and natural. Seen from behind, the head is the same perfect white circle with a clean black outline and absolutely no facial features, eyes, eyebrows or mouth visible. The torso has the same length and width as from the front. Arms hang relaxed slightly away from the torso, legs straight and about torso-width apart, matching the front view pose in mirror. Clean flat 2D cartoon line art, consistent black line weight, plain soft warm off-white background, a small soft gray shadow under the feet, even soft lighting. No text, no labels, no numbers, no watermark, no extra characters, no face on the back of the head, no hair, no 3D, no photorealism, no distorted or stretched head or torso.
```

## 5. Expression sheet — 12 эмоций

Режим: **image2image** + мастер Front · 4:3 · 2K · 2 варианта

Список совпадает с разделом 7.2 паспорта.

```text
[REFERENCE LOCK] Facial expression reference sheet of the same single character: a clean grid of 4 columns and 3 rows, twelve head-and-shoulders portraits of the same character facing the viewer, every portrait with identical head size, identical round head shape, identical eye placement and identical outline weight, evenly spaced on a plain soft warm off-white background. One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. The eyes always sit at the same height and spacing on the face. Keep the same head shape, head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Only the facial expression and the pose of the head, body and limbs change; the character design never changes. Head turns, head tilts and torso bends only animate the existing shape: the head keeps the same round shape and size from every angle, the torso bends as one piece without stretching, shrinking or changing its proportions, and the silhouette stays instantly recognizable while the motion stays fluid and natural. Row one, left to right: neutral with a short straight mouth and level eyebrows; happy with a smile curve and raised eyebrows; laughing with a wide open grin and eyes as upward arcs; surprised with slightly enlarged eyes, high eyebrows and a small round open mouth. Row two: angry with eyebrows slanting sharply down toward the center and a downward mouth curve; sad with eyes looking down, inner eyebrow ends raised and a downward mouth curve; anxious with wide eyes glancing sideways, worried raised eyebrows and a wavy mouth line; thinking with eyes looking up and to the side, one eyebrow higher than the other and a small sideways mouth line. Row three: skeptical with slightly narrowed eyes, one raised eyebrow and a short mouth line pushed to one side; mid-blink with both eyes closed as short horizontal lines and a neutral mouth; looking left with both eyes shifted together slightly toward the left while staying inside the face; looking up with both eyes shifted together slightly upward while staying inside the face. Only the eyes, eyebrows and mouth change between portraits. Clean flat 2D cartoon line art. No text, no labels, no numbers, no captions, no watermark, no extra characters, no hair, no nose, no ears, no pupils, no lips, no 3D, no photorealism, no distorted or stretched head.
```

## 6. Action pose sheet

Режим: **image2image** + мастер Front (+ утверждённый Side) · 3:2 · 2K · 2 варианта

Позы подобраны так, чтобы проверить Consistency System: поворот головы, наклон туловища, руки и ноги в движении.

```text
[REFERENCE LOCK] Action pose reference sheet of the same single character: a clean grid of 3 columns and 2 rows, six full-body poses at exactly the same scale, evenly spaced on a plain soft warm off-white background, each figure with a small soft gray shadow under its feet. One minimalist 2D cartoon stickman protagonist with a white filled circular head outlined in a clean black line, two small solid black oval eyes, two short expressive black eyebrow strokes and a simple black mouth. The torso is a slim closed tapered shape with solid white fill inside its black outline. Both arms and both legs are black single-line strokes with constant medium weight; hands are small black rounded shapes and feet are short black rounded strokes. No hair, no clothing, no accessories. The eyes always sit at the same height and spacing on the face. Keep the same head shape, head-to-body proportions, white head and torso fill, and outline weight in every shot. Exactly two arms and two legs exist; a moving limb replaces its previous pose rather than leaving another limb behind. Only the facial expression and the pose of the head, body and limbs change; the character design never changes. Head turns, head tilts and torso bends only animate the existing shape: the head keeps the same round shape and size from every angle, the torso bends as one piece without stretching, shrinking or changing its proportions, and the silhouette stays instantly recognizable while the motion stays fluid and natural. Row one, left to right: walking mid-step seen from the side, opposite arm and leg forward, calm smile; running seen from the side, body leaning slightly forward, arms swinging, determined eyebrows; jumping with both arms raised high and legs bent, wide open grin. Row two: pointing forward with one arm fully extended and a confident expression; leaning forward with the torso bent as one piece at the hips, hands on knees, curious raised eyebrows; standing and looking back over the shoulder with the head turned toward the viewer, surprised expression. In every pose the head is the same circle of the same size and the torso keeps the same length; only the angles of the head, torso and limbs change. Exactly two arms and two legs in every pose, each limb shown only in its current pose. Clean flat 2D cartoon line art, consistent black line weight. No motion trails on limbs, no speed lines, no text, no labels, no numbers, no watermark, no extra characters, no props, no 3D, no photorealism, no squash and stretch, no stretched or rubbery limbs, no distorted head or torso.
```
