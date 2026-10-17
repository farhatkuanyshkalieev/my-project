# От идеи к движению: motion showreel

## v3 (current): 3D, a live voice, a film score

`ot-idei-k-dvizheniyu_v3.mp4`: 49 s, 1920×1080, 60 fps.

- **3D (three.js / WebGL, rendered frame by frame):** all type is volumetric. Letters are extruded from the real Inter Display and Playfair outlines with bevels and lit sides, cast soft shadows, and enter as kinetic letters (flip, pop, drop, spin). Wilting letters on «умирают». The mascot is a glossy 3D ball with eyes. Its bites show a cut face like an orange slice. The monsters are jelly 3D creatures: a purple one with a clock, a blue drop with a pen, and a 3D vortex funnel. Also in 3D: a Notes window the camera dives into, a clock and tabs orbiting in space, the slingshot and a trail tube that becomes a ring, cone and cube, a curved wall of frames, a bezier tube with handles, a timeline with keyframe crystals, a tilted code editor, an Ae tile struck through, the finale and a capsule button with confetti.
- **Voice:** re-recorded with emotional direction (ElevenLabs «Andrey Permikin», eleven_v4). It has sadness, a chuckle, irritation, a long sigh, an exhale, a sudden «Стоп.», a whisper, a laugh and pride.
- **Music as a film score (`score3.py`):** an «idea» leitmotif of four notes goes through the whole story. It starts as a tentative minor on felt piano, becomes a celesta at the dot's birth, then turns to villain pizzicato, reed, «wah» and theremin for the monsters. At midnight a detuned piano breaks off into silence and the flatline. «Стоп» brings a record scratch, then a rewind and a snare roll. The drop on «смотри!» states the theme confidently in F major. The code section whispers on a music box, and the finale resolves on brass, choir and drums. Every transition has its own sound.

Build: `./build_v3.sh`, which installs three and opentype.js via npm.

---

## v2: bright style, lively voice

`ot-idei-k-dvizheniyu_v2.mp4`: 46 s, 1920×1080, 60 fps. It was rebuilt from scratch in the style of the reference. The design uses light, airy canvases, one hero orange, and night scenes in indigo and purple. Type pairs a heavy grotesk with italic serif accents (Playfair Display) and handwritten notes (Caveat). The star is a mascot ball, the idea itself, with squash & stretch, eyes, a blink and a wink. The story is told through UI cards. A lively, expressive male voice (ElevenLabs «Andrey Permikin», with sighs, irony and a whisper) drives every cut. Every word lands on its frame.

| VO | Scene |
|---|---|
| «Знаешь, где умирают лучшие идеи? В заметках.» | Kinetic hook, then a Notes window springs up. A handwritten «(вздох)» appears. The idea hides between «купить хлеб» and «позвонить маме». |
| «А ведь всё начиналось с точки. Маленькой. Тёплой. Живой.» | Zoom-through into the dot. The ball shrinks, glows, then opens its eyes and hops. |
| «Дедлайн откусил половину. Правки — ещё кусок. Сомнения доели остальное.» | Monsters with teeth notches eat into the ball: a purple clock-blob, a blue drop with a red pen and a pink vortex. The counter goes 100% → 50% → 30% → 0%. |
| «И вот — полночь. Четырнадцать вкладок… и ноль движения.» | The vortex swallows the screen into night. A clock spins to midnight, 14 tabs orbit in 3D, then everything freezes and falls, and an ECG goes flat. |
| «А теперь — смотри! …линией! …формой. …ритмом.» | An orange circle wipe with a burst. A slingshot launch draws a line, the line morphs into a circle, triangle and square, and they bounce to the beat over an equaliser. |
| «Каждый кадр. Каждый изгиб. Каждая секунда…» | A 3D wall of frames, a bezier pen tool, then a timeline with keyframes. Everything returns to the ball, which winks. |
| «…сделано кодом. Без After Effects.» | A code editor types the real API, and an Ae tile is circled and struck out. |
| «Это — моушн-дизайн. От идеи… к движению.» | Letter cascade. The «…» dots merge into the ball, which jumps down to become the period. |
| «Нужен такой же? Пиши — сделаем.» | CTA pill, a cursor click and a confetti burst. |

Build: `./build_v2.sh`. The sources are `reel.html`/`reel.js` (scene), `reel_audio.py` (voice-forward mix, designed SFX, a music bed that drops on «смотри!» and sidechain ducking) and `vo2/` (the voice).

---

## v1: night version

A 52-second motion piece at 1920×1080, 60 fps, with a male voiceover and synchronized sound design. The output file is `ot-idei-k-dvizheniyu.mp4`.

Part I (0–19 s) is the wordless opening. Parts II–V (19–52 s) are driven by the voiceover: every word on screen lands on the frame where it is spoken.

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
| 17.4–19.0 | **«От идеи к движению»** at full size. The subtitle decodes and a light sweep crosses the title. |
| 19.0–19.85 | Dive into the dot: it swells until its warmth fills the frame, then a hard cut to black. |
| 20–33.6 | **Voiceover + kinetic type.** Each phrase has its own technique. The dot is the cursor and the period of «точки», sparks fly from «искра», «темноте» goes dark and the dot dies out, «хрупкая» cracks and falls apart, «потерять» dissolves into particles, «движение» rushes in with motion smear and speed lines as the groove starts, «линией» is drawn as an outline and extends into rules, «Формой» drops in inside a morphing frame, and «Ритмом» bounces over an equaliser. A live waveform of the voice runs at the bottom. |
| 34–40.9 | **Obstacles.** Glass walls slam in on each word: СТЕНЫ, СОМНЕНИЯ, ДЕДЛАЙНЫ, ХАОС. On «Но движение не остановить» the dot charges. |
| 40.9–42.6 | **Breakthrough.** The camera rushes forward and the dot smashes through all four walls in rhythm. Shards fly, and «СКВОЗЬ» is flown through into a whiteout. |
| 42.6–45.6 | **Ascent.** A 3D wireframe mountain range under the moon. The dot climbs the ridge leaving a warm trail, with «ВЫШЕ», «БЫСТРЕЕ» and «К ВЕРШИНЕ». |
| 45.6–52 | **Summit.** Impact and god rays. The camera cranes up and «ОТ ИДЕИ / К ДВИЖЕНИЮ» slams in word by word with the voice, the warm rule grows, and the subtitle decodes before the fade. |

## How it's made

Everything is procedural, with no stock footage, samples or templates.

- `scene.js` is a deterministic Canvas 2D renderer. Each frame is a pure function of `t`, so frames render in parallel. Post-processing adds two-level bloom, zoom blur, glitch slices, a vignette and film grain.
- `render.js` drives headless Chromium through Playwright, which pipes PNG frames into x264 (BT.709, CRF 15). It also exports the **audio cue sheet** (`events.json`) straight from the scene timeline.
- `scene2.js` holds parts II–V: kinetic type keyed to word timestamps, walls with shatter shards, a perspective camera over a procedural heightmap, and the final title.
- `vo/` holds the voiceover (ElevenLabs, voice «Maxim — Premium Baritone», eleven_v4) and `env.js`, its per-frame loudness envelope that drives the on-screen waveform. Word timings come from a forced-alignment transcript (scribe).
- `audio.py` synthesizes the sound in NumPy and SciPy and places every cue on the exact frame of its visual. The layers are room tone, the power-on, the warm ping of the dot, UI ticks, FM plucks, the pulse, a riser, the impact and a Dmaj9 pad. Effects are a ZDF filter, ping-pong delay and a convolution reverb. The voice is high-passed, compressed and given presence, and the music bus is sidechain-ducked under it. Every transition has its own designed hit: dive, cut, wall slams, shatters, whiteout, accents, summit and the final chord.

## Build

```bash
./build.sh   # requires node + playwright (chromium), python3 + numpy/scipy, ffmpeg
```
