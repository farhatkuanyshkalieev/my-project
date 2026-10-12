# FOLD — 15 s motion showreel

**Concept:** one vermilion square is folded, beat by beat, into type, form, space, data and finally its own name.

- 120 BPM · 30 beats · 1920×1080 · 60 fps · loops (last frame = first frame)
- Geist (Black / Medium) · black, white, vermilion `#FF4A1C`, cobalt `#2D3BFF`
- Camera: locked, frontal lens; it only moves along its own axis (push-ins, a dolly-zoom flatten), and each scene is found inside a detail of the last.

| Beats | Time | Technique |
|---|---|---|
| 1–6 | 0–3 s | Kinetic type (beats 1–4 = hook): square → band → split-flap → slot roll → tracking snap → push through the A's counter |
| 7–12 | 3–6 s | Shape morph: FORM's outlines → primitives → orbit swap → paper flip → diamonds → one square → 4×4 floor plan |
| 13–18 | 6–9 s | 2D → 3D: floor tips back, extrudes, orbits, waves, flattens (dolly-zoom) into a row of bars that flip white |
| 19–24 | 9–12 s | Data / UI: card unfolds, counter rolls, bars sort, trend + tooltip, toggle bends bars into a radial chart → ring |
| 25–30 | 12–15 s | End title: ring becomes the O, four full-frame perspective page folds (strongest bar), lockup folds back into the square |

## Files
- `src/reel.html` — the piece. `window.seek(t)` draws any frame from `t` alone (springs + exponential easing as functions of time; motion blur re-samples the layer across the shutter so it follows speed and direction). `window.renderAudio()` writes the soundtrack with an `OfflineAudioContext` (kick every beat, riser 10–12 s, hits on each scene change) and returns a WAV.
- `reel.html` — built single file (fonts and glyph outlines inlined).
- `tools/build.mjs` — extracts Geist outlines with opentype.js and inlines everything.
- `tools/render.mjs` — Playwright renderer: 180 subframes/s → ffmpeg `tmix` (3 per frame) → 60 fps, then muxes the audio.
- `out/fold-showreel.mp4` — the final render. `out/soundtrack.wav` — the soundtrack. `out/stills/contact.png` — one frame per beat.

```sh
npm i
npm run build
npm run stills    # one frame per beat + contact sheet
npm run render    # full render → out/fold-showreel.mp4
```

Geist is © Vercel, licensed under the SIL Open Font License (`fonts/LICENSE.TXT`).
