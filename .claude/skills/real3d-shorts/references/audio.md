# Музыка и звуки

## Слои и громкость (Remotion, `src/Short.tsx`)
| Слой | Источник | Громкость |
|---|---|---|
| Голос | `public/voice.mp3` | 1.0 |
| Музыка | `public/music.wav` | 0.12–0.16, фейды 0.7 с / 1.5 с |
| Эмбиент | `public/amb_*.wav` (ветер, город, вода) | 0.2–0.35, приглушать под ключевые фразы |
| Звуки | `public/sfx_*.wav` по событиям в кадре | 0.5–0.9 |

После рендера: `ffmpeg -i out/short.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/final.mp4`.

## Источник 1 — ElevenLabs (лучше)
- Звуки: `https://elevenlabs.io/app/sound-effects` → поле «Describe a sound…» (заполнять через `form_input`,
  обычный ввод может не попасть) → стрелка генерации → 4 варианта → ⬇.
  Промпт: что + материал + среда + характер, на английском: `A heavy split firewood log falling into deep fresh snow, muffled thud, short`.
- Музыка: `https://elevenlabs.io/app/music` → `Instrumental only, no vocals.` + жанр, инструменты, темп,
  динамика по таймингу ролика. Скачать → MP3.
- Грабли загрузок — в voiceover.md §1.6. Если файлы не пришли за 1 минуту — не трать время, переходи к синтезу.

## Источник 2 — локальный синтез (всегда работает, полностью свой)
```
node tools/music.mjs <секунды> <настроение: cold|tense|warm|wonder>   → public/music.wav
node tools/sfx.mjs                                                    → public/sfx_*.wav, amb_wind.wav
```
`sfx.mjs` делает: `amb_wind`, `sfx_thud` (удар о снег/землю), `sfx_puff` (мягкое падение), `sfx_heart`
(сердцебиение), `sfx_whoosh` (переход whip), `sfx_hit` (удар snap_zoom), `sfx_riser` (нарастание к повороту).

## Где ставить звуки
- На каждом `whip` / `snap_zoom` — `whoosh` / `hit`.
- Падения, удары, касания в кадре — точно в кадр контакта (из film.py → `audio/cues.json`).
- Перед поворотом «Понимаете,» — `riser` 1.5–2 с.
- Рентген — низкий гул/сердце под 0.4.
