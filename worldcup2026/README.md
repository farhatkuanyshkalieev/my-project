# Видео «Чемпионат мира 2026»

`worldcup2026.mp4` — 70 с, 1280×720, русская озвучка (Piper, голос Denis).

Пересборка:
1. `python3 narration.py <папка с моделью vits-piper-ru_RU-denis-medium>` — озвучка по сценам (`audio/*.wav`)
2. `python3 build_audio.py mix.wav` — голос + музыка + шум стадиона
3. `python3 render.py silent.mp4` — анимация (Pillow → ffmpeg)
4. `ffmpeg -i silent.mp4 -i mix.wav -c:v copy -c:a aac out.mp4`
