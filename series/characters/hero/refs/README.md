# Референсы героя (`hero`)

Сюда кладутся **утверждённые** изображения. Отбракованные варианты в репозиторий не попадают: их ID записываются в журнал ниже.

## Ожидаемые файлы

| Файл | Промпт | Формат | Статус |
|---|---|---|---|
| `front.png` | [1. Front view](prompts.md#1-front-view--мастер-референс) — мастер-референс | 3:4 | ⏳ |
| `three-quarter.png` | [2. Three-quarter view](prompts.md#2-three-quarter-view) | 3:4 | ⏳ |
| `side.png` | [3. Side view](prompts.md#3-side-view) | 3:4 | ⏳ |
| `back.png` | [4. Back view](prompts.md#4-back-view) | 3:4 | ⏳ |
| `expressions.png` | [5. Expression sheet](prompts.md#5-expression-sheet--12-эмоций) | 4:3 | ⏳ |
| `poses.png` | [6. Action pose sheet](prompts.md#6-action-pose-sheet) | 3:2 | ⏳ |

Статусы: ⏳ не сгенерирован · 🔍 на проверке · ✅ утверждён · 🔁 переделать.

## Порядок генерации

1. `front.png`: text2image, 4 варианта → выбор → проверка по таблице 2.1 паспорта → утверждение.
2. `three-quarter.png`, `side.png`, `back.png`: image2image с `front.png`.
3. `expressions.png`, `poses.png`: image2image с `front.png` (+ `side.png` для поз).

Пока `front.png` не утверждён, следующие шаги не запускаем.

## Журнал генерации

| Дата | Файл | Модель / режим | Настройки | Референсы | ID задания OpenArt | Кредиты | Результат |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |
