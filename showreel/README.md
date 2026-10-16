# От идеи к движению: motion showreel

A 20-second motion piece at 1920×1080, 60 fps, with synchronized sound design. The output file is `ot-idei-k-dvizheniyu.mp4`.

## Storyboard

| Time | Shot |
|---|---|
| 0.0–1.4 | A room at night. Moonlight comes through the window, dust drifts in the beam, steam rises from a mug, and the camera breathes slowly. |
| 1.4 | The monitor powers on with a flash, a flicker, and cold light spilling onto the wall, desk and keyboard. |
| 1.6–2.5 | A short boot log types itself, a cursor blinks and collapses into **a warm dot**. This is the idea and the only warm color in the film. |
| 2.5–3.3 | The dot pulses twice like a heartbeat. |
| 3.0–4.5 | The camera pushes into the screen. The scanlines show the pixel structure, then we pass through the glass. |
| 4.5–8.0 | The dot unfolds into a crosshair, a grid, rings and a dial. Callouts type out: 01 ТОЧКА, 02 ЛИНИЯ, 03 ФОРМА. Primitives (3, 4, 5 and 6 sides) are born on the beat and the center polygon morphs. A timeline, keyframes and an easing graph form the motion designer's toolset. |
| 8.0–12.0 | 04 ОБЪЁМ: the plane tilts into perspective, an icosahedron appears with a point shell, the rings become a gyroscope and a plexus network grows. The lissajous oscilloscope and spiral particles join. 05 РИТМ: a 120 BPM pulse drives the camera. |
| 12.0–15.0 | Kinetic type, one word per beat, with sliced band reveals. A rotating tunnel, glitch hits and camera shake carry it to the peak: ИМПУЛЬС. |
| 15.0–16.0 | Everything collapses into the dot: speed lines and zoom blur, then a moment of near-silence. |
| 16.0 | Impact: a flash, a shockwave and a burst. The harmony turns from D minor to D major. |
| 16.1–17.4 | The dot draws a warm line. The letters of the title rise out of the line where it passes. |
| 17.4–20.0 | **«От идеи к движению»** at full size. The subtitle decodes, a light sweep crosses the title, and the shot fades to black. |

## How it's made

Everything is procedural, with no stock footage, samples or templates.

- `scene.js` is a deterministic Canvas 2D renderer. Each frame is a pure function of `t`, so frames render in parallel. Post-processing adds two-level bloom, zoom blur, glitch slices, a vignette and film grain.
- `render.js` drives headless Chromium through Playwright, which pipes PNG frames into x264 (BT.709, CRF 15). It also exports the **audio cue sheet** (`events.json`) straight from the scene timeline.
- `audio.py` synthesizes the sound in NumPy and SciPy and places every cue on the exact frame of its visual. The layers are room tone, the power-on, the warm ping of the dot, UI ticks, FM plucks, the pulse, a riser, the impact and a Dmaj9 pad. Effects are a ZDF filter, ping-pong delay and a convolution reverb.

## Build

```bash
./build.sh   # requires node + playwright (chromium), python3 + numpy/scipy, ffmpeg
```
