# IHG — қонақ үй брендтерінің халықаралық даму стратегиялары (видео)

Қазақ тіліндегі моушн-графикалық видео, 16:9, 1920×1080, 30 fps, MP4.

- `script/narration.json` — дикторлық мәтін (қазақша)
- `script/tts.py` — дауыс (Piper, ISSAI KazakhTTS моделі `kk_KZ-issai-high`)
- `script/timing.py`, `script/timeline.py` — сөйлем уақыттары мен субтитрлер → `src/timeline.json`
- `script/sound.py` — фондық музыка мен дыбыс эффектілері (синтез; `public/music.wav` осы скриптпен жасалады)
- `src/` — Remotion композициясы (10 сахна)

Рендер:

```bash
npm install
npx remotion render src/index.ts Main out/ihg_strategy_kk.mp4 --codec=h264 --crf=18
```
