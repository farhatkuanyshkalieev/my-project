# project/script.json — единый источник правды

```json
{
  "title": "reel01",
  "fps": 30,
  "language": "ru",
  "whisper_model": "D:/models/ggml-medium.bin",
  "safe_zones": {"top": 220, "bottom": 400, "right": 140},
  "characters": {
    "me":  {"name": "Я",      "kind": "hero",   "face": "faces/face_me_1024.png", "skin": "#E8AD8F", "voice_fx": "none",  "tempo": 1.0},
    "ai":  {"name": "Claude", "kind": "mascot", "voice_fx": "robot", "tempo": 1.0},
    "npc_suit": {"name": "мужчина в костюме", "kind": "npc", "face": "faces/face_suit_1024.png", "npc_kind": "suit"}
  },
  "sources": {"me": "voice_me.ogg", "ai": "voice_ai.mp3"},
  "lines": [
    {"id": "M1", "char": "me", "text": "Да как они делают эти рилсы?!", "src": "me", "seg": [0]},
    {"id": "C1", "char": "ai", "text": "Запрос получен. Показываю.",    "src": "ai", "seg": [0]},
    {"id": "C9", "char": "ai", "text": "Восемь свет девять камера …",  "src": "ai", "seg": [8], "tempo": 1.4}
  ],
  "scenes": [
    {"name": "1 ХУК",     "location": "street", "items": [["pre", 0.15], ["M1"], ["post", 0.10]],
     "action": "иду, смотрю в телефон, поднимаю голову, кричу", "camera": "крупно телефон → crash zoom на общий → crash in", "fx": "экран телефона"},
    {"name": "2 ПРОХОЖИЕ","location": "street", "items": [["pre", 1.20]], "action": "3 крупных плана, головы поворачиваются ко мне", "camera": "push-in + whip"},
    {"name": "8 ФИНАЛ",   "location": "room",   "items": [["pre", 0.43], ["M5"], ["gap", 0.30], ["C11"], ["post", 1.50]],
     "action": "сижу у ноутбука 3/4 к камере, Claude у плеча", "camera": "dolly-in 0.4 м + орбит", "fx": "@handle из вокселей, карточка"}
  ],
  "cues": {"steps": {"1": ["C2", 1], "2": ["C3", 1]}, "notes": "кадр события = начало слова: [id реплики, индекс слова]"}
}
```

- `items`: `["pre", сек]` пауза до, `["gap", сек]` между репликами, `["post", сек]` после, `["<id>"]` — реплика. Длительность сцены = сумма пауз + реальные длины клипов.
- `seg` — индексы сегментов whisper в исходном файле (печатаются при первом запуске `audio_pipeline.py` как `SRC … segments:`). Можно не указывать — реплики источника берутся по порядку.
- `tempo` — ускорение без изменения высоты (atempo). Для героя — только с разрешения.
- `cues` — любые события, привязанные к словам; в коде сцены они превращаются в кадры через `wf(lid, i)`.
- Всё, что пользователь утвердил (таблица сцен), хранится здесь; правки — только через этот файл и пересборку.
