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

## Reel нұсқасы (2 минут, динамикалық)

- `reel/lines.json` — сценарий + әр кадрдың (shot) сипаттамасы
- `reel/tts.py` — эмоциялы қазақша дауыс (Microsoft kk-KZ-DauletNeural, edge-tts), сөздердің уақыт белгілерімен
- `reel/timeline.py` → `src/reel/reel.json`; `reel/sound.py` — 124 BPM музыка мен SFX
- `src/reel/` — Remotion композициясы `Reel`

```bash
npx remotion render src/index.ts Reel out/ihg_reel_kk_2min.mp4 --codec=h264 --crf=20
```
