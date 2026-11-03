# Моушн рилсы — студия (Remotion)

```bash
npm i
npx remotion studio                       # превью
npx remotion render LishniyVes out/01-lishniy-ves.mp4 --crf=18
```

- `src/reels/LishniyVes.tsx` — таймлайн рилса №1: фразы, графика, звуковые события, громкость музыки.
- `src/components/Phrase.tsx` — фразы слово за словом. Разметка: `*акцент*`, `~скрипт~`, `|` — перенос.
- `src/components/Graphics.tsx` — фоны, бордовые дуги, переход-клякса.
- `src/components/Widgets.tsx` — уведомление, счётчик, папки, дерево, карточка исследования, кольцо шагов, 3D-айфон.
- `src/components/Sfx.tsx` — звуки из пака (пик звука выравнивается на событие).
- `public/sfx`, `public/music` — выборка из звукового пака; `public/fonts` — Inter Tight + Great Vibes (OFL).
