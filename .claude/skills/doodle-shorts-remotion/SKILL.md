---
name: doodle-shorts-remotion
description: >
  Делает готовый вертикальный шортс (YouTube Shorts / Reels / TikTok, 40–65 с) по идее пользователя
  ТОЛЬКО на Remotion (без Blender): рисованные человечки-дудлы (белое лицо-круг, тело-капсула, ноги-палочки)
  живут в 3D-локациях three.js с мягким светом, тенями, размытием фона и движущейся камерой; голос
  (ElevenLabs или бесплатный Piper), субтитры как у Ricks Clips, фоновая музыка. Используй, когда просят
  «сделай шортс/рилс/ролик про…», «объясни (тему) в видео», «ролик как у Ricks Clips», «дудлы в 3D».
---

# Doodle Shorts (Remotion) — шортс от идеи до mp4 одним файлом

Всё нужное — в этом файле: правила стиля, порядок работы и **весь код** проекта (его надо записать
на диск как есть). Работай строго по шагам. Пользователь может ничего не знать про видео и 3D —
объясняй простыми словами. `<P>` — папка ролика (латиница, без пробелов, напр. `short-pizza`).

---

## Шаг 0. Проверка окружения
Нужны **Node.js 18+** и **ffmpeg** (больше ничего — Blender не нужен).
- `node -v` → если нет: https://nodejs.org (кнопка LTS), установить, ПЕРЕЗАПУСТИТЬ Claude/терминал.
- `ffmpeg -version` → если нет: Windows `winget install Gyan.FFmpeg`; Mac — https://brew.sh, затем `brew install ffmpeg`.
- Для голоса ElevenLabs — расширение «Claude» для Chrome (Chrome Web Store) и аккаунт elevenlabs.io
  (вход делает сам пользователь). Без них — бесплатный голос Piper.
- Интернет нужен при установке и при рендере (шрифт субтитров грузится из Google Fonts).

Частые проблемы: `node`/`npx` не найдены после установки → перезапустить терминал; рендер падает на WebGL →
в `remotion.config.ts` поменять `"angle"` на `"swiftshader"` (медленнее, но работает везде);
whisper на Windows ругается на `Expand-Archive` → уже обходится в `tools/whisper.mjs`.

## Шаг 1. Идея и язык
Ролик — на языке пользователя. Если язык неясен — спроси. Если идея размыта — предложи 3 темы-хука по
одной строке и попроси выбрать.

## Шаг 2. Сценарий (ОБЯЗАТЕЛЬНО прочитай «Приложение А: эталонные сценарии» в конце файла)
Пиши в той же манере и на том же уровне, **копировать нельзя** — повторяй структуру и подачу.

**Формат:** 110–160 слов (40–60 с), **6–9 абзацев = шотов** (каждый 4–8 с). Фразы 5–18 слов; после длинной —
короткая (2–5 слов). Новая картинка каждые 1–2 фразы.

**Структура:**
1. **Хук (первая фраза, ≤2.5 с):** парадокс / контринтуитивное утверждение / прямой вызов зрителю. Сразу даёт
   картинку. Без «Привет», без «сегодня расскажу».
2. **«Представь…» / «Ты…»** — зритель становится героем; дальше во втором лице.
3. **Смешные конкретные детали** (числа, предметы, повторы-ритм) вместо общих слов.
4. **«Ружьё»** — деталь, которая вернётся в финале.
5. **Вопрос вслух** ~на 40%: «Как такое возможно?» — ответ не сразу.
6. **Бытовая аналогия** из жизни каждого.
7. **Механизм простыми словами + один реальный факт/число** (правда! не уверен — смягчи формулировку).
8. **Финал-«кнопка»**: закольцовка с «ружьём» или короткое масштабное последствие, ≤10 слов. Без морали и CTA.

Короткие реплики героев («Опять 40 секунд!») — в кавычках внутри текста диктора: они дают поводы для эмоций.

**Покажи пользователю** текст + раскадровку таблицей (абзац → что в кадре → кто что делает/эмоция) и спроси
«Сценарий ок?». **Дальше — только после явного одобрения.** Используй 2–4 локации на ролик.

## Шаг 3. Создать проект
1. Создай `<P>` и запиши в него **все файлы из «Приложения Б»** ровно как есть (пути — как в заголовках).
2. `cd <P>` → `npm install` (1–3 мин).
3. Запиши текст для озвучки в `script/voice.txt` (абзацы через пустую строку, можно теги эмоций
   ElevenLabs вида `[shouting]`) и тот же текст для субтитров в `script/voice_display.txt` (без тегов,
   числа цифрами: «40 секунд», «85%»).

## Шаг 4. Голос
**Правила:** без согласия пользователя нигде не регистрироваться, ничего не покупать, не вводить карту/пароли.
Перед генерацией в ElevenLabs назови расход кредитов (≈ символы × 0.5 для v4 Turbo; генерируется 2 варианта)
и спроси разрешения. **Для монетизации бесплатный тариф ElevenLabs не подходит** (нет коммерческой лицензии) —
предупреди.

**A. ElevenLabs через браузер (лучше):** новая вкладка `https://elevenlabs.io/app/speech-synthesis/text-to-speech` →
Voice: русский мужской «Stanislav – Deep, Empathetic and Warm» (англ. — «Adam»/«Brian»; нет в списке —
Voice Library → Add) → Model: **Eleven v4 Turbo** (нет — Multilingual v2) → Stability 0.45, Similarity 0.8,
Style 0.25, Speed 1.0 → вставить текст → Generate → выбрать живой вариант → ↓ скачать. Если в Chrome включено
«Спрашивать, куда сохранять», файл висит как `.tmp` в папке загрузок — возьми самый свежий по размеру.
Ускорь на 10% без смены тона: `ffmpeg -y -i скачанный.mp3 -af atempo=1.1 public/voice.mp3`.

**B. Бесплатно, без регистрации — Piper** (честно: роботизированнее, без эмоций; для черновиков и роликов без
монетизации): `node tools/tts_piper.mjs script/voice.txt public/voice.wav ru_RU-dmitri-medium 1.08`
(голоса: `ru_RU-irina-medium`, `en_US-ryan-high`, `de_DE-thorsten-medium`, `es_ES-davefx-medium`…).
Тогда в `script/edit.json`: `{"voice": "voice.wav"}`.

**Тайминги слов (обязательно):** `node tools/whisper.mjs public/voice.mp3 ru` (язык ролика) → `audio/words.json`
и список «секунда слово». По нему: **начало каждого шота = время первого слова абзаца**; время ударных слов =
моменты эмоций, жестов и «бонков». Затем: `node tools/plan.mjs` (субтитры) и
`node tools/music.mjs <длина_сек+3> playful` (музыка без лицензий; настроения `playful|tense|calm`).

## Шаг 5. Шоты — правишь ТОЛЬКО `src/Video.tsx`
Файл уже содержит рабочий пример из 2 шотов (холл с лифтом) — **прочитай его целиком** и замени на свои шоты.
Всё время в секундах ГОЛОСА. Шот = `{ t0, t1, el: <Scene3D …>…</Scene3D> }`.

**Набор (`src/kit.tsx`):**
- Локация: `<Room wall floor wain ceil window sky />` (комната 6×4×3 м, задняя стена z=−2, окно слева),
  `<Box p s c />` (любой предмет-коробка с обводкой рёбер), `<Desk/> <Chair/> <Shelf/> <Plant/> <Bench/>
  <Monitor/> <Mirror/> <Door/> <Lamp/> <Clock hh mm/> <Sign text bg fg/>` (таблички, вывески, постеры).
  Для улицы/транспорта/кафе — собирай из `Box` + `Sign` по тем же правилам.
- Персонаж: объект `Actor` → `<Doodle a={…} />`. Поля: `pos` [x,0,z], `look` {body, hair: bowl|spiky|long|slick,
  tie, lanyard}, `seed`, `expr` [[сек, эмоция], …], `handF/handB` ключи рук [[сек, x, z], …], `pointKeys(сек, dx, dz,
  удержание, "f"|"b")` — жест «указать», `lean`, `talk` [[с, по], …] — рот на репликах, `walk` — перемещение
  [[сек, x, z], …], `hidden` [[с, по]] — скрыть (ракурс «от лица» героя).
  Эмоции: neutral, smug, proud, grin, laugh, nervous, shock, realize, blank, holdlaugh, stern.
- Шот: `<Scene3D t0 cam={[[сек,[x,y,z],[куда смотрит],fov], …]} focus={[x,y,z]} light="day|night|studio">`.
- Предмет «бонкает» на ударном слове: `scale={bonkAt(useSec(), секунда)}` (внутри компонента сцены).

**Правила постановки (каждое — исправленная ошибка):**
- **Эмоции меняются часто** — у каждого героя смена каждые 1–2 с по словам; «бонк» головы срабатывает сам на
  смене. Нельзя случайных периодических «бонков» (головы «дёргаются»).
- **Указывать рукой со стороны цели:** цель справа на экране → `"b"` (правая/задняя), слева → `"f"`.
  Иначе рука идёт через лицо.
- Руки не проводить через лицо; «поправить волосы» — кисть сбоку головы (x ≈ ±0.36, z ≈ HEAD_Z+0.1).
- **Жест и его цель — в одном кадре.** Никаких наездов-зумов на предмет.
- **Больше общих и средних планов**: камера в 1.5–2.5 м от героев, высота 1.2–1.35, fov 70–78; камера всегда
  медленно дрейфует (0.2–0.4 м за шот).
- **Фокус (`focus`) — на говорящем/главном герое**: фон и передний план размываются сами.
- Расставляй героев **под каждый шот** там, где действие (у зеркала, у двери); все участники — в кадре.
- **8–15 предметов в кадре** общего плана, надписи на предметах — на языке ролика. Пустая комната = «нейрослоп».
- **Свет мягкий, без полос жалюзи** (пользователь их забраковал). Не ставь ярких ламп близко к камере — пересвет.
- Зеркала/стекло — стилизованные (`Mirror`), не «настоящие» отражения.

## Шаг 6. Проверка кадров и рендер
- **Кадры (обязательно после каждого шота):** `npx remotion still src/index.ts Video checks/s1.png --frame=<кадр>`
  (кадр = секунда × 30). Открой PNG и пройди «Чек-лист» ниже. Исправь → снова кадр.
- **Превью (по умолчанию):** `npx remotion render src/index.ts Video out/preview.mp4 --scale=0.5 --concurrency=4`
  (540×960, ~1–2 мин на ролик). Скажи пользователю, что это превью.
- **Финал (полное качество 1080×1920) — по команде пользователя «финальный рендер»:**
  `npx remotion render src/index.ts Video out/final.mp4 --concurrency=4` (≈ 3–4 с рендера на секунду видео).
  Ничего не урезать ради скорости.
- Скопируй результат в корень `<P>` под понятным именем и сообщи **полный путь** к файлу.

## Чек-лист перед отдачей
- [ ] Кадр 1: уже действие/герой, хук звучит с 0.0–0.2 с, первый субтитр в первые 0.3 с.
- [ ] Герои: белые лица-круги, жирная обводка, руки-шарики, крупные головы; лица живые (эмоции меняются, моргают,
      взгляд двигается); головы не дёргаются без причины.
- [ ] Жесты понятны, рука не через лицо, жест и цель в одном кадре.
- [ ] Свет мягкий, без пересвета; фон размыт, герой резкий; 8–15 предметов, есть цветовой акцент.
- [ ] Каждый шот начинается на первом слове абзаца (±0.2 с); эмоции/жесты — на ударных словах.
- [ ] Субтитры: Montserrat Black, белые с чёрной обводкой, 1–3 слова, центр-низ, текст = сценарий.
- [ ] Только голос и музыка (без звуковых эффектов), музыка тише голоса (0.11, макс 0.18).
- [ ] 40–65 с, 1080×1920 (финал), файл открывается целиком.

## Правки пользователя
Меняй только нужное: эмоция/жест/камера — массивы этого шота в `Video.tsx`; текст — новый голос →
`whisper` → сдвинуть `t0/t1` и ключи шотов после правки → `plan.mjs`; субтитры/музыка — `edit.json`/`music.mjs`.
Перерендер быстрый, поэтому рендерь ролик целиком (превью), показывай кадры «до/после».

## Нельзя (анти-«нейрослоп»)
Сгенерированные нейросетью персонажи; пустые локации; статичная камера и наезды на каждый объект; одна эмоция
на весь шот; случайные «дёрганья» головой; плашки-титры кроме субтитров; звуковые эффекты; музыка громче голоса.

---

# Приложение Б: файлы проекта (записать как есть)

### `package.json`
```json
{
  "name": "doodle-remotion-short",
  "private": true,
  "type": "module",
  "dependencies": {
    "@react-three/fiber": "8.17.10",
    "@react-three/postprocessing": "2.16.3",
    "@remotion/cli": "4.0.250",
    "@remotion/google-fonts": "4.0.250",
    "@remotion/install-whisper-cpp": "4.0.250",
    "@remotion/three": "4.0.250",
    "postprocessing": "6.36.4",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "remotion": "4.0.250",
    "three": "0.169.0"
  },
  "optionalDependencies": { "sherpa-onnx-node": "1.12.15" },
  "devDependencies": { "@types/three": "0.169.0", "@types/react": "18.3.12" }
}
```

### `tsconfig.json`
```json
{ "compilerOptions": { "target": "ES2022", "module": "ES2022", "jsx": "react-jsx", "strict": false, "moduleResolution": "bundler",
  "esModuleInterop": true, "skipLibCheck": true, "resolveJsonModule": true, "lib": ["dom", "ES2022"] } }
```

### `remotion.config.ts`
```ts
import { Config } from "@remotion/cli/config";
Config.setChromiumOpenGlRenderer("angle");
```

### `src/index.ts`
```ts
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
```

### `src/Root.tsx`
```tsx
import React from "react";
import { Composition } from "remotion";
import { Video, TOTAL } from "./Video";
export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />;
```

### `src/doodle.ts`
```ts
// Персонаж-дудл на Canvas 2D — порт kit/chars.py: тот же дизайн и та же мимика.
// Локальные координаты в метрах: x вправо, z вверх, 0 = пол. Плоскость PLANE_W × PLANE_H.
export type Look = { body: string; hair: "bowl" | "spiky" | "long" | "slick"; tie?: string; lanyard?: boolean };
export type Pose = {
  expr: string; blink: boolean; bonk: number; breathe: number; lookX?: number; talk?: number;
  lean?: number; tilt?: number; squash?: number; hip?: number;
  handF?: [number, number]; handB?: [number, number]; bendF?: number; bendB?: number;
};

const INK = "#2a1d1a";
export const PLANE_W = 1.4, PLANE_H = 2.1;
export const CW = 560, CH = Math.round((CW * PLANE_H) / PLANE_W);
const K = CW / PLANE_W;
const X = (x: number) => CW / 2 + x * K;
const Y = (z: number) => CH - z * K;
const R0 = 0.27, W = 0.27, H = 0.36, HIP = 0.4;

const EXPR: Record<string, { eyes: string; brow: [number, number]; mouth: [string, number]; sweat?: boolean; cheeks?: boolean; shake?: boolean; look?: number }> = {
  neutral: { eyes: "oval", brow: [0, 0], mouth: ["flat", 0] },
  smug: { eyes: "lid", brow: [0.25, 0.015], mouth: ["smirk", 0.6] },
  proud: { eyes: "happy", brow: [0.2, 0.02], mouth: ["grin", 0.8] },
  grin: { eyes: "oval", brow: [-0.15, 0], mouth: ["grin", 1] },
  laugh: { eyes: "happy", brow: [0.25, 0.03], mouth: ["open", 0.85], shake: true },
  nervous: { eyes: "wide", brow: [0.4, 0.03], mouth: ["squiggle", 0], sweat: true, look: -0.35 },
  shock: { eyes: "wide", brow: [0.55, 0.06], mouth: ["open", 0.95], sweat: true, shake: true },
  realize: { eyes: "wide", brow: [0.45, 0.05], mouth: ["o", 0.7] },
  blank: { eyes: "lid", brow: [0, -0.01], mouth: ["o", 0.3] },
  holdlaugh: { eyes: "squeeze", brow: [0.3, 0], mouth: ["pressed", 0], cheeks: true, shake: true },
  stern: { eyes: "lid", brow: [-0.45, -0.02], mouth: ["flat", -0.2] },
};

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k)).join(",")})`;
};

export function drawDoodle(ctx: CanvasRenderingContext2D, look: Look, p: Pose, rnd: () => number) {
  ctx.clearRect(0, 0, CW, CH);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const E = EXPR[p.expr] ?? EXPR.neutral;
  const sq = (p.squash ?? 1) * (1 + p.breathe) * (1 - 0.07 * p.bonk);
  const hip = (p.hip ?? HIP);
  const lean = p.lean ?? 0;
  const bh = H * sq, bw = W / Math.sqrt(sq);
  // точка на теле (x,z от таза) → локальные координаты с наклоном
  const B = (x: number, z: number): [number, number] => {
    const c = Math.cos(lean), s = Math.sin(lean);
    return [x * c + z * s, hip - x * s + z * c];
  };
  const stroke = (w: number, col = INK) => { ctx.strokeStyle = col; ctx.lineWidth = w * K; };
  // тень
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(X(0), Y(0.01), W * 0.85 * K, 0.03 * K, 0, 0, Math.PI * 2); ctx.fill();
  const limb = (a: [number, number], b: [number, number], bend: number) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const cx = (a[0] + b[0]) / 2 - dz * bend, cz = (a[1] + b[1]) / 2 + dx * bend;
    stroke(0.032); ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.quadraticCurveTo(X(cx), Y(cz), X(b[0]), Y(b[1])); ctx.stroke();
  };
  const hand = (h: [number, number]) => {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(X(h[0]), Y(h[1]), 0.05 * K, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(X(h[0] - 0.017), Y(h[1] + 0.017), 0.009 * K, 0.006 * K, 0.6, 0, Math.PI * 2); ctx.fill();
  };
  // ноги
  for (const s of [1, -1]) {
    limb(B(s * W * 0.2, 0.05), [s * 0.08, 0.03], s * 0.04);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(X(s * 0.08 + 0.015), Y(0.022), 0.05 * K, 0.026 * K, 0, 0, Math.PI * 2); ctx.fill();
  }
  const shB = B(W * 0.44, bh * 0.7), shF = B(-W * 0.44, bh * 0.7);
  const hB = p.handB ?? [W * 0.75, HIP + 0.06], hF = p.handF ?? [-W * 0.75, HIP + 0.06];
  limb(shB, hB, p.bendB ?? -0.12); hand(hB);
  // тело
  ctx.save();
  const o = B(0, 0); ctx.translate(X(o[0]), Y(o[1])); ctx.rotate(lean);
  const body = () => { ctx.beginPath(); ctx.roundRect(-bw / 2 * K, -bh * K, bw * K, bh * K, bw * 0.45 * K); };
  ctx.fillStyle = look.body; body(); ctx.fill();
  ctx.save(); body(); ctx.clip(); ctx.fillStyle = shade(look.body, 0.62); ctx.fillRect(bw * 0.2 * K, -bh * K, bw * K, bh * K); ctx.restore();
  stroke(0.028); body(); ctx.stroke();
  ctx.fillStyle = "#f7f7f2"; stroke(0.01);
  ctx.beginPath(); ctx.moveTo(-W * 0.2 * K, -bh * K); ctx.lineTo(0, -bh * 0.62 * K); ctx.lineTo(W * 0.2 * K, -bh * K); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (look.tie) {
    ctx.fillStyle = look.tie; ctx.beginPath(); ctx.moveTo(-W * 0.035 * K, -bh * 0.95 * K); ctx.lineTo(W * 0.035 * K, -bh * 0.95 * K);
    ctx.lineTo(W * 0.05 * K, -bh * 0.55 * K); ctx.lineTo(0, -bh * 0.48 * K); ctx.lineTo(-W * 0.05 * K, -bh * 0.55 * K); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (look.lanyard) {
    stroke(0.018, "#2f6fd6"); ctx.beginPath(); ctx.moveTo(-W * 0.16 * K, -bh * 0.98 * K); ctx.lineTo(-W * 0.2 * K, -bh * 0.44 * K); ctx.stroke();
    ctx.fillStyle = "#fff"; stroke(0.008); ctx.fillRect(-W * 0.3 * K, -bh * 0.44 * K, W * 0.2 * K, bh * 0.22 * K); ctx.strokeRect(-W * 0.3 * K, -bh * 0.44 * K, W * 0.2 * K, bh * 0.22 * K);
  }
  stroke(0.008); ctx.beginPath(); ctx.moveTo(W * 0.12 * K, -bh * 0.5 * K); ctx.lineTo(W * 0.36 * K, -bh * 0.5 * K); ctx.stroke();
  ctx.restore();
  // голова
  const top = B(0, bh + R0 * 0.78);
  const hr = R0 * (1 + 0.14 * p.bonk);
  const shk = E.shake ? (rnd() - 0.5) * 0.012 : 0;
  ctx.save();
  ctx.translate(X(top[0] + shk), Y(top[1] + shk)); ctx.rotate(lean * 0.7 + (p.tilt ?? 0) + 0.06 * p.bonk);
  const r = hr * K;
  ctx.fillStyle = "#f5f1ea"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#d8d2c8"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.arc(-r * 0.1, -r * 0.08, r * 0.82, 0, Math.PI * 2, true); ctx.fill("evenodd");
  ctx.restore();
  stroke(0.028); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  // волосы (чёлка выше бровей)
  ctx.fillStyle = "#1b1615"; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, Math.PI, Math.PI * 2);
  const fr = look.hair === "slick" ? 0.55 : 0.46;
  ctx.lineTo(r * 0.85, -r * (fr - 0.04)); ctx.lineTo(r * 0.45, -r * (fr + 0.02)); ctx.lineTo(-r * 0.2, -r * (fr + 0.06)); ctx.lineTo(-r * 0.8, -r * fr);
  ctx.closePath(); ctx.fill(); stroke(0.022); ctx.stroke();
  ctx.fillStyle = "#1b1615";
  if (look.hair === "spiky") for (let i = 0; i < 6; i++) { const a = Math.PI * (1.08 + i * 0.17);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.9); ctx.lineTo(Math.cos(a + 0.08) * r * 1.28, Math.sin(a + 0.08) * r * 1.22); ctx.lineTo(Math.cos(a + 0.17) * r, Math.sin(a + 0.17) * r * 0.9); ctx.fill(); }
  if (look.hair === "long") { ctx.fillRect(-r * 1.06, -r * 0.1, r * 0.22, r * 1.15); ctx.fillRect(r * 0.84, -r * 0.1, r * 0.22, r * 1.15); }
  stroke(0.012, "#ffffff"); ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.2, r * 0.75, Math.PI * 1.25, Math.PI * 1.5); ctx.stroke();
  // глаза
  let eyes = E.eyes;
  if (p.blink && ["oval", "wide", "lid"].includes(eyes)) eyes = "closed";
  const lx = ((p.lookX ?? 0) + (E.look ? 0 : 0)) * r;
  const [bt, bhh] = E.brow;
  for (const s of [-1, 1]) {
    const ex = s * r * 0.34, ey = -r * 0.02;
    ctx.fillStyle = INK;
    if (eyes === "oval") {
      ctx.beginPath(); ctx.ellipse(ex + lx * 0.06, ey, r * 0.095, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ex + lx * 0.06 - r * 0.03, ey - r * 0.05, r * 0.03, r * 0.035, 0, 0, Math.PI * 2); ctx.fill();
    } else if (eyes === "wide") {
      ctx.fillStyle = "#fff"; stroke(0.016); ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.19, r * 0.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + lx * 0.09, ey + (E.look ?? 0) * -r * 0.1, r * 0.045, r * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    } else if (eyes === "lid") {
      ctx.beginPath(); ctx.ellipse(ex + lx * 0.05, ey + r * 0.02, r * 0.09, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      stroke(0.018); ctx.beginPath(); ctx.moveTo(ex - r * 0.14, ey - r * 0.045); ctx.lineTo(ex + r * 0.14, ey - r * 0.045); ctx.stroke();
    } else if (eyes === "happy") {
      stroke(0.022); ctx.beginPath(); ctx.arc(ex, ey + r * 0.07, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (eyes === "closed") {
      stroke(0.018); ctx.beginPath(); ctx.arc(ex, ey - r * 0.08, r * 0.11, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    } else if (eyes === "squeeze") {
      stroke(0.022); ctx.beginPath(); ctx.moveTo(ex - s * r * 0.13, ey - r * 0.08); ctx.lineTo(ex + s * r * 0.09, ey); ctx.lineTo(ex - s * r * 0.13, ey + r * 0.08); ctx.stroke();
    }
    const by = ey - r * 0.27 - bhh * r * 2 - (eyes === "wide" ? 0.04 * r : 0);
    const inner = ex - s * r * 0.13, outer = ex + s * r * 0.15;
    stroke(0.028); ctx.beginPath(); ctx.moveTo(outer, by + bt * r * 0.07); ctx.lineTo((inner + outer) / 2, by - r * 0.02); ctx.lineTo(inner, by - bt * r * 0.14); ctx.stroke();
  }
  if (E.cheeks) { ctx.fillStyle = "#f0b3a4"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.55, r * 0.3, r * 0.2, r * 0.14, 0, 0, Math.PI * 2); ctx.fill(); } }
  // рот
  let [mt, mp] = E.mouth;
  const tk = p.talk ?? 0;
  if (tk > 0.15 && ["flat", "smirk", "squiggle", "pressed"].includes(mt)) { mt = "open"; mp = 0.4 + 0.6 * tk; }
  const my = r * 0.45, mx = lx * 0.04;
  stroke(0.018);
  if (mt === "flat") { ctx.beginPath(); ctx.moveTo(mx - r * 0.17, my); ctx.quadraticCurveTo(mx, my - mp * r * 0.12, mx + r * 0.17, my); ctx.stroke(); }
  else if (mt === "smirk") { ctx.beginPath(); ctx.moveTo(mx - r * 0.14, my); ctx.quadraticCurveTo(mx + r * 0.05, my + r * 0.12, mx + r * 0.22, my - r * 0.08); ctx.stroke(); }
  else if (mt === "squiggle") { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const x = -r * 0.22 + (i / 16) * r * 0.44; const yy = my + Math.sin((x / r) * 20) * r * 0.045; i ? ctx.lineTo(mx + x, yy) : ctx.moveTo(mx + x, yy); } ctx.stroke(); }
  else if (mt === "pressed") { stroke(0.022); ctx.beginPath(); ctx.moveTo(mx - r * 0.13, my); ctx.lineTo(mx + r * 0.13, my); ctx.stroke(); }
  else if (mt === "o") { ctx.fillStyle = "#5e1f22"; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.07 * (0.7 + mp), r * 0.09 * (0.7 + mp), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (mt === "grin") {
    const mw = r * 0.36;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(mx - mw, my - r * 0.05); ctx.quadraticCurveTo(mx, my + r * 0.36 * mp, mx + mw, my - r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    stroke(0.008); for (const k of [-0.5, -0.17, 0.17, 0.5]) { ctx.beginPath(); ctx.moveTo(mx + k * mw, my - r * 0.04); ctx.lineTo(mx + k * mw * 0.95, my + r * 0.13 * mp); ctx.stroke(); }
  } else if (mt === "open") {
    const mw = r * 0.24, mh = r * 0.08 + r * 0.24 * mp;
    ctx.fillStyle = "#5e1f22"; ctx.beginPath(); ctx.moveTo(mx - mw, my - r * 0.05); ctx.quadraticCurveTo(mx, my - r * 0.05 + mh * 1.9, mx + mw, my - r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d66a6c"; ctx.beginPath(); ctx.ellipse(mx, my + mh * 0.6, mw * 0.5, mh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    stroke(0.024, "#fff"); ctx.beginPath(); ctx.moveTo(mx - mw * 0.75, my - r * 0.025); ctx.lineTo(mx + mw * 0.75, my - r * 0.025); ctx.stroke();
  }
  if (E.sweat) { ctx.fillStyle = "#c9e6ff"; stroke(0.01, "#3d7fd0"); ctx.beginPath(); ctx.moveTo(r * 0.98, -r * 0.5); ctx.quadraticCurveTo(r * 1.1, -r * 0.25, r * 0.98, -r * 0.18); ctx.quadraticCurveTo(r * 0.86, -r * 0.25, r * 0.98, -r * 0.5); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  // передняя рука поверх
  limb(shF, hF, p.bendF ?? 0.12); hand(hF);
}
```

### `src/kit.tsx`
```tsx
// Набор для сцен в стиле «дудлы в 3D» на three.js внутри Remotion.
// Всё в метрах: x вправо, y вверх, z к камере. Задняя стена комнаты при z = −d/2.
import React, { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, DepthOfField, Bloom, Vignette } from "@react-three/postprocessing";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { CH, CW, PLANE_H, PLANE_W, drawDoodle, Look, Pose } from "./doodle";

export const FPS = 30;
export const LINE = "#20180f";
type V3 = [number, number, number];

// ------------------------------------------------------------------ время шота
// Каждый шот получает t0 — секунду голоса, с которой он начинается. sec() = текущая секунда ГОЛОСА.
const ShotCtx = createContext<{ t0: number; cam: THREE.Vector3 }>({ t0: 0, cam: new THREE.Vector3() });
export const useSec = () => { const f = useCurrentFrame(); const { t0 } = useContext(ShotCtx); return t0 + f / FPS; };

// ------------------------------------------------------------------ обводка рёбер (как Line Art)
let lineMat: LineMaterial | null = null;
const getLineMat = (w: number, h: number) => {
  if (!lineMat) lineMat = new LineMaterial({ color: LINE, linewidth: 3.2, worldUnits: false });
  lineMat.resolution.set(w, h);
  return lineMat;
};

export const Box: React.FC<{ p: V3; s: V3; c: string; r?: number; rot?: V3; e?: string; ei?: number; metal?: number;
  line?: boolean; shadow?: boolean; map?: THREE.Texture | null }> =
  ({ p, s, c, r = 0.75, rot = [0, 0, 0], e, ei = 0, metal = 0, line = true, shadow = true, map = null }) => {
    const { size } = useThree();
    const edges = useMemo(() => {
      if (!line) return null;
      const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(...s));
      return new LineSegments2(new LineSegmentsGeometry().setPositions(eg.attributes.position.array as Float32Array), getLineMat(size.width, size.height));
    }, [line, s[0], s[1], s[2]]);
    return (
      <group position={p} rotation={rot}>
        <mesh castShadow={shadow} receiveShadow>
          <boxGeometry args={s} />
          <meshStandardMaterial color={c} roughness={r} metalness={metal} emissive={e ?? "#000"} emissiveIntensity={ei} map={map} />
        </mesh>
        {edges ? <primitive object={edges} /> : null}
      </group>
    );
  };

// ------------------------------------------------------------------ текстуры из Canvas (надписи, часы)
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
export const label = (txt: string, bg: string, fg: string, w = 512, h = 176, sz = 110) => canvasTex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `900 ${sz}px Arial Black, Arial, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 4);
});

// Плоская табличка/вывеска/постер на стене (смотрит на камеру, +z). glow — подсветка.
export const Sign: React.FC<{ p: V3; w: number; h: number; text: string; bg: string; fg: string; glow?: number; rotY?: number; sz?: number }> =
  ({ p, w, h, text, bg, fg, glow = 0.25, rotY = 0, sz }) => {
    const tex = useMemo(() => label(text, bg, fg, 512, Math.round((512 * h) / w), sz ?? Math.min(110, Math.round(((512 * h) / w) * 0.6))), [text, bg, fg, w, h]);
    return <mesh position={p} rotation={[0, rotY, 0]}><planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={glow} /></mesh>;
  };

// Настенные часы: hh:mm. bonk — масштаб всей группы (НЕ только циферблата).
export const Clock: React.FC<{ p: V3; r?: number; hh?: number; mm?: number; scale?: number }> = ({ p, r = 0.17, hh = 10, mm = 10, scale = 1 }) => {
  const tex = useMemo(() => canvasTex(256, 256, (g) => {
    g.fillStyle = "#fbf7ea"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#1d1f23"; g.lineWidth = 14; g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = i % 3 ? 4 : 8; g.beginPath();
      g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 106, 128 - Math.cos(a) * 106); g.stroke(); }
    g.font = "900 30px Arial"; g.fillStyle = "#1d1f23"; g.textAlign = "center"; g.textBaseline = "middle";
    [["12", 0], ["3", 3], ["6", 6], ["9", 9]].forEach(([n, i]) => { const a = ((i as number) * Math.PI) / 6; g.fillText(n as string, 128 + Math.sin(a) * 70, 128 - Math.cos(a) * 70); });
    const ha = (((hh % 12) + mm / 60) / 12) * Math.PI * 2, ma = (mm / 60) * Math.PI * 2;
    g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ha) * 55, 128 - Math.cos(ha) * 55); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ma) * 85, 128 - Math.cos(ma) * 85); g.stroke();
  }), [hh, mm]);
  return <mesh position={p} scale={[scale, scale, 1]}><circleGeometry args={[r, 40]} />
    <meshStandardMaterial map={tex} emissive="#fff7e0" emissiveMap={tex} emissiveIntensity={0.35} /></mesh>;
};

// ------------------------------------------------------------------ реквизит
export const Desk: React.FC<{ p: V3; rotY?: number; w?: number }> = ({ p, rotY = 0, w = 1.4 }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <Box p={[0, 0.75, 0]} s={[w, 0.05, 0.7]} c="#b8784a" r={0.6} />
    {[-1, 1].map((s) => <Box key={s} p={[s * (w / 2 - 0.2), 0.37, 0]} s={[0.36, 0.72, 0.63]} c="#7a4a2c" />)}
    {[-1, 1].flatMap((s) => [0.2, 0.45, 0.65].map((z) => <Box key={s + "" + z} p={[s * (w / 2 - 0.2), z, 0.33]} s={[0.12, 0.025, 0.02]} c="#c9ccd1" metal={0.8} r={0.3} line={false} />))}
  </group>
);
export const Chair: React.FC<{ p: V3; rotY?: number; c?: string }> = ({ p, rotY = 0, c = "#2f9e9a" }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <Box p={[0, 0.48, 0]} s={[0.48, 0.08, 0.46]} c={c} /><Box p={[0, 0.85, -0.22]} s={[0.48, 0.6, 0.07]} c={c} />
    <Box p={[0, 0.24, 0]} s={[0.07, 0.44, 0.07]} c="#2a2d33" /><Box p={[0, 0.03, 0]} s={[0.5, 0.05, 0.5]} c="#2a2d33" />
  </group>
);
export const Shelf: React.FC<{ p: V3; rotY?: number; w?: number; h?: number }> = ({ p, rotY = 0, w = 1.0, h = 1.8 }) => {
  const cols = ["#d64545", "#2f6fd6", "#f2c230", "#3f8a4b", "#2f9e9a", "#e46b2b", "#efe6d2"];
  const books: JSX.Element[] = [];
  for (let k = 0; k < 4; k++) { let x = -w / 2 + 0.06, i = 0; while (x < w / 2 - 0.1) {
    const bw = 0.04 + ((k * 7 + i * 13) % 6) * 0.01, bh = 0.22 + ((k * 5 + i * 3) % 5) * 0.03;
    books.push(<Box key={k + "_" + i} p={[x + bw / 2, 0.05 + (k * h) / 4 + bh / 2 + 0.015, 0]} s={[bw, bh, 0.24]} c={cols[(k + i) % 7]} line={bh > 0.3} />);
    x += bw + 0.005; i++; } }
  return (<group position={p} rotation={[0, rotY, 0]}>
    {[-1, 1].map((s) => <Box key={s} p={[(s * w) / 2, h / 2, 0]} s={[0.04, h, 0.32]} c="#7a4a2c" />)}
    {[0, 1, 2, 3].map((k) => <Box key={k} p={[0, 0.05 + (k * h) / 4, 0]} s={[w, 0.03, 0.32]} c="#7a4a2c" />)}{books}
  </group>);
};
export const Plant: React.FC<{ p: V3; h?: number }> = ({ p, h = 0.6 }) => (
  <group position={p}>
    <Box p={[0, 0.15, 0]} s={[0.26, 0.3, 0.26]} c="#b5653a" />
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i) * 0.07, 0.3 + h * 0.4, Math.sin(i) * 0.07]} rotation={[Math.sin(i) * 0.45, i, Math.cos(i) * 0.45]} castShadow>
      <boxGeometry args={[0.07, h * 0.8, 0.02]} /><meshStandardMaterial color="#3f8a4b" /></mesh>)}
  </group>
);
export const Bench: React.FC<{ p: V3; rotY?: number; c?: string; w?: number }> = ({ p, rotY = 0, c = "#d07a3a", w = 1.6 }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <Box p={[0, 0.45, 0]} s={[w, 0.06, 0.45]} c={c} r={0.6} /><Box p={[0, 0.75, -0.22]} s={[w, 0.4, 0.06]} c={c} r={0.6} />
    {[-1, 1].map((s) => <Box key={s} p={[(s * (w - 0.2)) / 2, 0.22, 0]} s={[0.06, 0.44, 0.4]} c="#8d939b" />)}
  </group>
);
export const Monitor: React.FC<{ p: V3; rotY?: number; screen?: string }> = ({ p, rotY = 0, screen = "#3d7bd6" }) => (
  <group position={p} rotation={[0, rotY, 0]}>
    <Box p={[0, 0.32, 0]} s={[0.55, 0.34, 0.04]} c="#2a2d33" />
    <mesh position={[0, 0.32, 0.022]}><planeGeometry args={[0.5, 0.29]} /><meshBasicMaterial color={new THREE.Color(screen).multiplyScalar(1.4)} toneMapped={false} /></mesh>
    <Box p={[0, 0.1, -0.03]} s={[0.05, 0.2, 0.05]} c="#2a2d33" /><Box p={[0, 0.01, -0.02]} s={[0.25, 0.02, 0.18]} c="#2a2d33" />
  </group>
);
// Зеркало — СТИЛИЗОВАННОЕ (светлое стекло + блики). Настоящее отражение = тёмная «дыра».
export const Mirror: React.FC<{ p: V3; w?: number; h?: number; scale?: number }> = ({ p, w = 0.8, h = 1.2, scale = 1 }) => (
  <group position={p} scale={[scale, scale, scale]}>
    <Box p={[0, 0, 0]} s={[w + 0.1, h + 0.1, 0.05]} c="#c8a24a" r={0.35} metal={0.5} />
    <mesh position={[0, 0, 0.03]}><planeGeometry args={[w, h]} /><meshStandardMaterial color="#cfe3f2" emissive="#e8f4ff" emissiveIntensity={0.4} roughness={0.15} /></mesh>
    {[-0.12, 0.05].map((dx, i) => <mesh key={i} position={[dx * w * 4, 0.05, 0.035]} rotation={[0, 0, 0.45]}><planeGeometry args={[i ? 0.035 : 0.08, h * 0.85]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.75} /></mesh>)}
  </group>
);
export const Door: React.FC<{ p: V3; c?: string; number?: string }> = ({ p, c = "#4f7aa6", number }) => (
  <group position={p}>
    <Box p={[0, 1.05, 0]} s={[0.95, 2.1, 0.06]} c={c} r={0.4} />
    <Box p={[-0.52, 1.08, 0]} s={[0.08, 2.16, 0.1]} c="#8d939b" /><Box p={[0.52, 1.08, 0]} s={[0.08, 2.16, 0.1]} c="#8d939b" /><Box p={[0, 2.18, 0]} s={[1.12, 0.08, 0.1]} c="#8d939b" />
    <Box p={[0.33, 1.0, 0.06]} s={[0.18, 0.04, 0.05]} c="#c9ccd1" metal={0.8} r={0.3} />
    {number ? <Sign p={[-0.75, 1.6, 0.02]} w={0.3} h={0.16} text={number} bg="#f6f3ea" fg="#222" glow={0.1} /> : null}
  </group>
);
export const Lamp: React.FC<{ p: V3; len?: number; glow?: number }> = ({ p, len = 1.4, glow = 1.02 }) => (
  <mesh position={p}><boxGeometry args={[len, 0.04, 0.16]} /><meshBasicMaterial color={[glow, glow * 0.96, glow * 0.88]} toneMapped={false} /></mesh>
);

// Комната: пол, потолок, задняя и боковые стены (с рёбрами-обводкой), панель снизу, окно слева (небо-плоскость).
export const Room: React.FC<{ w?: number; d?: number; h?: number; wall?: string; floor?: string; wain?: string; ceil?: string; window?: boolean; sky?: string }> =
  ({ w = 6, d = 4, h = 3, wall = "#4f8f95", floor = "#2f4fa8", wain = "#3f7479", ceil = "#d9d4c8", window = true, sky = "#bfe0ff" }) => {
    const L = -w / 2, B = -d / 2;
    return (<>
      <Box p={[0, -0.05, 0]} s={[w, 0.1, d]} c={floor} line={false} r={0.8} />
      <Box p={[0, h + 0.05, 0]} s={[w, 0.1, d]} c={ceil} />
      <Box p={[0, h / 2, B - 0.05]} s={[w, h, 0.1]} c={wall} r={0.85} />
      <Box p={[-L + 0.05, h / 2, 0]} s={[0.1, h, d]} c={wall} r={0.85} />
      {window ? (<>
        <Box p={[L - 0.05, h / 2, B + (d / 2 - 0.7) / 2]} s={[0.1, h, d / 2 - 0.7]} c={wall} />
        <Box p={[L - 0.05, h / 2, (1.1 + d / 2) / 2]} s={[0.1, h, d / 2 - 1.1]} c={wall} />
        <Box p={[L - 0.05, 0.475, 0.2]} s={[0.1, 0.95, 1.8]} c={wall} />
        <Box p={[L - 0.05, (2.35 + h) / 2, 0.2]} s={[0.1, h - 2.35, 1.8]} c={wall} />
        <mesh position={[L - 1.6, 1.6, 0.2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[5, 4]} /><meshBasicMaterial color={sky} /></mesh>
      </>) : <Box p={[L - 0.05, h / 2, 0]} s={[0.1, h, d]} c={wall} />}
      <Box p={[0, 0.45, B + 0.02]} s={[w, 0.9, 0.04]} c={wain} />
      <Box p={[-L - 0.02, 0.45, 0]} s={[0.04, 0.9, d]} c={wain} />
      <Box p={[0, 0.92, B + 0.05]} s={[w, 0.04, 0.05]} c="#e9e2cf" />
    </>);
  };

// ------------------------------------------------------------------ персонажи
type Key = [number, number, number];   // [секунда голоса, x, z] — точка руки в метрах (x вправо, z вверх от пола)
export const HIP = 0.4;
export const REST_F: [number, number] = [-0.2, HIP + 0.06], REST_B: [number, number] = [0.2, HIP + 0.06];
export const HEAD_Z = HIP + 0.36 + 0.27 * 0.78;                       // центр головы
const track = (t: number, keys: Key[]): [number, number] => {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i];
    const k = Easing.out(Easing.back(1.8))((t - a[0]) / Math.max(1e-6, b[0] - a[0]));   // выброс с перелётом
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  const l = keys[keys.length - 1]; return [l[1], l[2]];
};
export type Actor = {
  pos: V3; look: Look; seed: number;
  expr: [number, string][];                 // [[секунда, эмоция], ...] — бонк на каждой смене
  handF?: Key[]; handB?: Key[]; lean?: Key[]; talk?: [number, number][]; walk?: Key[]; hidden?: [number, number][];
};
// Жест «указать» в сторону (dx, dz) от плеча: замах → выброс → удержание → возврат.
export const pointKeys = (t: number, dx: number, dz: number, hold = 1.0, side: "f" | "b" = "f"): Key[] => {
  const rest = side === "f" ? REST_F : REST_B, sh = side === "f" ? -0.12 : 0.12;
  return [[t - 0.35, ...rest], [t - 0.12, sh * 0.2, HEAD_Z + 0.15], [t, sh + dx * 0.6, HIP + 0.25 + dz * 0.6], [t + hold, sh + dx * 0.6, HIP + 0.25 + dz * 0.6], [t + hold + 0.25, ...rest]];
};

export const Doodle: React.FC<{ a: Actor }> = ({ a }) => {
  const sec = useSec();
  const { cam } = useContext(ShotCtx);
  const { canvas, tex } = useMemo(() => {
    const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { canvas: cv, tex: t };
  }, []);
  const f2 = Math.floor(sec * FPS / 2) * 2;                              // по двойкам
  const t = f2 / FPS;
  if (a.hidden?.some(([s, e]) => t >= s && t < e)) return null;
  let ex = a.expr[0][1], tc = -10;
  for (const [tt, e] of a.expr) if (t >= tt) { ex = e; tc = tt; }
  const tb = (t - tc) * FPS;
  const bonk = tc > -10 && tb >= 0 ? Math.exp(-tb / 3.5) * Math.cos(tb * 1.25) : 0;
  let sd = a.seed * 9301 + f2 * 49297; const rnd = () => ((sd = (sd * 233280 + 49297) % 233280) / 233280);
  const dart = Math.sin(t * 1.7 + a.seed * 2) > 0.6 ? 0.9 : Math.sin(t * 1.3 + a.seed) < -0.7 ? -0.9 : 0;
  const talking = a.talk?.some(([s, e]) => t >= s && t < e);
  const pose: Pose = {
    expr: ex, blink: (f2 + a.seed * 37) % 79 < 3, bonk, breathe: Math.sin(f2 / 14) * 0.012, lookX: dart,
    talk: talking ? 0.25 + 0.75 * Math.abs(Math.sin(t * FPS * Math.PI / 3.5)) : 0,
    handF: a.handF ? track(t, a.handF) : REST_F, handB: a.handB ? track(t, a.handB) : REST_B,
    lean: a.lean ? track(t, a.lean)[0] : 0, tilt: Math.sin(t * 1.1 + a.seed) * 0.03,
  };
  drawDoodle(canvas.getContext("2d")!, a.look, pose, rnd);
  tex.needsUpdate = true;
  const pos = a.walk ? (() => { const [x, z] = track(t, a.walk!); return [x, a.pos[1], z] as V3; })() : a.pos;
  const yaw = Math.atan2(cam.x - pos[0], cam.z - pos[2]);
  return (
    <mesh position={[pos[0], pos[1] + PLANE_H / 2, pos[2]]} rotation={[0, yaw, 0]} receiveShadow>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshLambertMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.5} transparent alphaTest={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ------------------------------------------------------------------ камера и сцена
export type CamKey = [number, V3, V3, number?];   // [секунда, позиция, куда смотрит, fov]
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const camAt = (t: number, keys: CamKey[]) => {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i], k = Easing.inOut(Easing.ease)((t - a[0]) / (b[0] - a[0]));
    return [t, lerp3(a[1], b[1], k), lerp3(a[2], b[2], k), (a[3] ?? 74) + ((b[3] ?? 74) - (a[3] ?? 74)) * k] as CamKey;
  }
  return keys[keys.length - 1];
};
const CamRig: React.FC<{ pos: THREE.Vector3; look: THREE.Vector3; fov: number }> = ({ pos, look, fov }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.copy(pos); c.lookAt(look); c.fov = fov; c.near = 0.05; c.far = 25;   // far=25 — иначе размытие не работает
  c.updateProjectionMatrix();
  return null;
};

export type LightPreset = "day" | "night" | "studio";
const Lights: React.FC<{ preset: LightPreset; windowX: number }> = ({ preset, windowX }) => (
  preset === "day" ? (<>
    <hemisphereLight args={["#d6e6ff", "#3a3a5a", 0.9]} />
    <directionalLight position={[windowX - 3, 4.5, 1.5]} intensity={2.6} color="#ffd9a8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
      shadow-radius={8} shadow-bias={-0.0005} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
    <directionalLight position={[3, 2.5, 5]} intensity={0.7} color="#cfe0ff" />
    <pointLight position={[0.4, 2.75, -0.3]} intensity={5} decay={1.4} color="#fff0d8" />
  </>) : preset === "night" ? (<>
    <hemisphereLight args={["#5a6fb0", "#0c1430", 0.5]} />
    <directionalLight position={[windowX - 3, 4, 1]} intensity={1.4} color="#7d95ff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-radius={8}
      shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
    <pointLight position={[0.5, 1.6, 0.4]} intensity={7} decay={1.3} color="#ffc477" castShadow />
  </>) : (<>
    <hemisphereLight args={["#cfd8ff", "#141a33", 0.5]} />
    <spotLight position={[-1, 6, 2]} angle={0.5} penumbra={0.6} intensity={60} decay={1} color="#ff8a7a" castShadow />
    <spotLight position={[1.5, 6, 2]} angle={0.5} penumbra={0.6} intensity={60} decay={1} color="#7af0ff" castShadow />
  </>)
);

// Сцена-шот: камера по ключам (в секундах голоса), свет-пресет, постобработка (размытие фона, свечение, виньетка).
export const Scene3D: React.FC<{ t0: number; cam: CamKey[]; focus: V3; light?: LightPreset; bg?: string; windowX?: number; children: React.ReactNode }> =
  ({ t0, cam, focus, light = "day", bg = "#9fbfe0", windowX = -3, children }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const t = t0 + frame / FPS;
    const [, p, l, fov] = camAt(t, cam);
    const pos = new THREE.Vector3(...p);
    pos.x += Math.sin(frame / 23) * 0.012; pos.y += Math.sin(frame / 17) * 0.008;   // «ручная» камера
    return (
      <ShotCtx.Provider value={{ t0, cam: pos }}>
        <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{ toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.25, antialias: false }} style={{ backgroundColor: bg }}>
          <ShotCtx.Provider value={{ t0, cam: pos }}>
            <CamRig pos={pos} look={new THREE.Vector3(...l)} fov={fov ?? 74} />
            <Lights preset={light} windowX={windowX} />
            {children}
            <EffectComposer multisampling={4}>
              <DepthOfField target={focus} focalLength={0.012} bokehScale={7} height={1080} />
              <Bloom luminanceThreshold={1.0} intensity={0.35} mipmapBlur />
              <Vignette eskil={false} offset={0.25} darkness={0.45} />
            </EffectComposer>
          </ShotCtx.Provider>
        </ThreeCanvas>
      </ShotCtx.Provider>
    );
  };

// «Бонк» предмета на ударном слове: масштаб 1→1.35→0.85→1.
export const bonkAt = (sec: number, t: number, amt = 0.35) => {
  const tb = (sec - t) * FPS;
  return tb > 0 ? 1 + amt * Math.exp(-tb / 3.5) * Math.cos(tb * 1.25) : 1;
};
```

### `src/Video.tsx`
```tsx
// РОЛИК: шоты по таймингам голоса + голос + музыка + субтитры. Всё время — в секундах ГОЛОСА.
// Для нового ролика меняется только массив SHOTS (и сами шоты ниже).
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import plan from "./plan.json";
import { FPS, Scene3D, Room, Box, Sign, Clock, Mirror, Bench, Plant, Lamp, Desk, Monitor, Doodle, Actor, pointKeys, bonkAt, useSec, HIP } from "./kit";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin", "cyrillic"] });

// ===================================================================== ШОТЫ (пример: «Зеркало в лифте»)
// Шот 1 (0–5.1 с): холл, клерки довольны у лифта. Шот 2 (5.1–11.4 с): клерки злые, один тычет в часы «Опять 40 секунд!».
const Elevator: React.FC<{ floor: string }> = ({ floor }) => {
  const sec = useSec();
  return (<>
    <Box p={[0.4, 1.15, -1.97]} s={[1.5, 2.3, 0.08]} c="#5d6670" r={0.4} />
    <Box p={[0.08, 1.05, -1.91]} s={[0.62, 2.1, 0.04]} c="#b9c0c8" r={0.3} metal={0.5} />
    <Box p={[0.72, 1.05, -1.91]} s={[0.62, 2.1, 0.04]} c="#b9c0c8" r={0.3} metal={0.5} />
    <group position={[0.4, 2.45, -1.92]} scale={bonkAt(sec, 1.7)}><Sign p={[0, 0, 0]} w={0.5} h={0.22} text={sec < 1.7 ? floor : "6"} bg="#15151a" fg="#ff3b2f" glow={1.2} /></group>
    <Sign p={[-1.0, 2.45, -1.99]} w={0.7} h={0.24} text="ЛИФТ" bg="#20354f" fg="#ffffff" />
  </>);
};

const Lobby: React.FC<{ shot: 1 | 2 }> = ({ shot }) => {
  const sec = useSec();
  return (<>
    <Room wall="#c96f4a" wain="#8a4630" />
    <Elevator floor="7" />
    <Clock p={[1.6, 2.35, -1.99]} hh={8} mm={59} scale={bonkAt(sec, 9.95, 0.3)} />
    <Mirror p={[-0.9, 1.35, -1.95]} scale={shot === 1 ? 1 : 0.0001} />
    <Bench p={[-1.75, 0, -1.55]} /><Plant p={[-2.65, 0, -1.5]} /><Plant p={[2.6, 0, -1.5]} h={0.8} />
    <Sign p={[2.3, 1.6, -1.99]} w={0.5} h={0.7} text="Q3" bg="#2fe0c8" fg="#f6f3ea" glow={0.15} />
    <Lamp p={[0.4, 2.97, -0.3]} />
  </>);
};

const C1: Actor = { pos: [-0.25, 0, -0.95], seed: 1, look: { body: "#4a90d9", hair: "spiky" },
  expr: [[0, "grin"], [0.9, "proud"], [3.0, "smug"], [5.1, "stern"], [9.9, "shout"], [11.0, "stern"]],
  handB: pointKeys(9.9, 0.9, 0.9, 1.0, "b"), talk: [[9.9, 11.0]] };   // цель справа → указывает ПРАВОЙ (задней, "b") рукой
const C2: Actor = { pos: [0.5, 0, -0.8], seed: 2, look: { body: "#d65a7a", hair: "long" },
  expr: [[0, "smug"], [1.3, "grin"], [3.0, "laugh"], [4.0, "proud"], [5.1, "nervous"], [10.0, "shock"]] };
const C3: Actor = { pos: [1.2, 0, -1.05], seed: 3, look: { body: "#6aa84f", hair: "slick", tie: "#7a3b22", lanyard: true },
  expr: [[0, "proud"], [1.7, "realize"], [2.5, "grin"], [3.5, "smug"], [5.1, "stern"], [7.9, "nervous"]],
  handF: [[0, -0.2, HIP + 0.06], [3.45, -0.2, HIP + 0.06], [3.65, -0.42, HIP + 0.52], [4.4, -0.42, HIP + 0.52], [4.6, -0.2, HIP + 0.06]],
  handB: [[0, 0.2, HIP + 0.06], [3.45, 0.2, HIP + 0.06], [3.65, 0.42, HIP + 0.52], [4.4, 0.42, HIP + 0.52], [4.6, 0.2, HIP + 0.06]] };

const SHOTS: { t0: number; t1: number; el: React.ReactNode }[] = [
  { t0: 0.0, t1: 5.1, el: (
    <Scene3D t0={0} cam={[[0, [1.85, 1.32, 1.85], [0.1, 1.12, -1.2], 76], [5.1, [1.5, 1.28, 1.55], [0.1, 1.12, -1.2], 76]]} focus={[0.45, 1.25, -0.9]}>
      <Lobby shot={1} />{[C1, C2, C3].map((a, i) => <Doodle key={i} a={a} />)}
    </Scene3D>) },
  { t0: 5.1, t1: 11.4, el: (
    <Scene3D t0={5.1} cam={[[5.1, [-1.5, 1.25, 1.8], [0.5, 1.2, -1.4], 76], [11.4, [-1.2, 1.25, 1.6], [0.5, 1.25, -1.4], 76]]} focus={[0.4, 1.25, -0.9]}>
      <Lobby shot={2} />{[C1, C2, C3].map((a, i) => <Doodle key={i} a={a} />)}
    </Scene3D>) },
];

// ===================================================================== субтитры (как в эталоне)
const Caption: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = plan.groups.find((x) => f >= x.start && f < Math.max(x.end, x.start + 6));
  if (!g) return null;
  const s = spring({ frame: f - g.start, fps, config: { damping: 11, stiffness: 240, mass: 0.55 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 600 }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 92, lineHeight: 1.05, color: "white", textAlign: "center", maxWidth: 920,
        transform: `scale(${interpolate(s, [0, 1], [0.72, 1])})`, WebkitTextStroke: "16px black", paintOrder: "stroke fill",
        textShadow: "0 6px 0 rgba(0,0,0,0.55)" }}>{g.text}</div>
    </AbsoluteFill>
  );
};

export const TOTAL = Math.round(SHOTS[SHOTS.length - 1].t1 * FPS);
export const Video: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={Math.round(s.t0 * FPS)} durationInFrames={Math.round((s.t1 - s.t0) * FPS)}>{s.el}</Sequence>
      ))}
      <Audio src={staticFile(plan.voice)} />
      <Audio src={staticFile("music.wav")} loop
        volume={(f) => interpolate(f, [0, 20, durationInFrames - 45, durationInFrames], [0, 0.11, 0.11, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Caption />
    </AbsoluteFill>
  );
};
```

### `tools/whisper.mjs`
```js
// Пословные тайминги голоса (локальный whisper.cpp, бесплатно, без интернета после первой загрузки ~470 МБ).
//   node tools/whisper.mjs public/voice.mp3 <язык: ru|en|...>  → audio/words.json  [{t, s, e}]
// Грабли: в Windows установщик Remotion ломается на пробелах в пути (Expand-Archive) — поэтому распаковываем сами.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from "@remotion/install-whisper-cpp";

const src = path.resolve(process.argv[2] ?? "public/voice.mp3");
const lang = process.argv[3] ?? "ru";
const WDIR = path.join(os.homedir(), ".doodle-shorts", "whisper");   // без пробелов, общий для всех проектов
const MODEL = "small";
fs.mkdirSync(path.dirname(WDIR), { recursive: true });   // саму WDIR не создавать: установщик Remotion требует, чтобы её не было
const wav = path.join(os.tmpdir(), "doodle_voice_16k.wav");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", wav]);
const exe = process.platform === "win32" ? "main.exe" : "main";
if (!fs.existsSync(path.join(WDIR, exe))) {
  try {
    await installWhisperCpp({ to: WDIR, version: "1.5.5" });
  } catch (e) {
    const zip = fs.readdirSync(process.cwd()).find((f) => f.startsWith("whisper-bin") && f.endsWith(".zip"));
    if (process.platform === "win32" && zip) {
      execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${path.resolve(zip)}' -DestinationPath '${WDIR}'`]);
      fs.rmSync(zip);
    } else throw e;
  }
}
await downloadWhisperModel({ model: MODEL, folder: WDIR });
const { transcription } = await transcribe({ inputPath: wav, whisperPath: WDIR, model: MODEL, tokenLevelTimestamps: true, language: lang });
const { captions } = toCaptions({ whisperCppOutput: { transcription } });
// токены → слова (новое слово начинается с пробела)
const words = [];
for (const c of captions) {
  const s = c.text;
  if (!s.trim()) continue;
  if (/^[\s]*[.,!?:;%—-]+$/.test(s) && words.length) { words[words.length - 1].t += s.trim(); continue; }
  if (/^\s/.test(s) || !words.length) words.push({ t: s.trim(), s: +(c.startMs / 1000).toFixed(2), e: +(c.endMs / 1000).toFixed(2) });
  else { words[words.length - 1].t += s; words[words.length - 1].e = +(c.endMs / 1000).toFixed(2); }
}
fs.mkdirSync(path.resolve("audio"), { recursive: true });
fs.writeFileSync(path.resolve("audio/words.json"), JSON.stringify(words, null, 1));
console.log(words.length, "слов →", path.resolve("audio/words.json"));
console.log(words.map((w) => w.s.toFixed(1) + " " + w.t).join(" | "));
```

### `tools/plan.mjs`
```js
// Монтажный план: субтитры (слова СЦЕНАРИЯ ← время из whisper через выравнивание; ошибки распознавания
// в субтитры не попадают) + громкости. Звуковых эффектов нет — только голос и музыка.
//   node tools/plan.mjs   (читает script/voice.txt, audio/words.json, script/edit.json)
import fs from "node:fs";

const FPS = 30;
const P = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const raw = fs.readFileSync("script/voice.txt", "utf8");
const words = P("audio/words.json").filter((w) => w.t.replace(/[^\p{L}\p{N}]/gu, ""));
const cfg = fs.existsSync("script/edit.json") ? P("script/edit.json") : {};
const norm = (w) => w.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]/gu, "");
// текст для субтитров: без тегов эмоций [..], без кавычек; числа можно писать цифрами в voice_display.txt
const disp = fs.existsSync("script/voice_display.txt") ? fs.readFileSync("script/voice_display.txt", "utf8") : raw;
const paras = disp.replace(/\[[^\]]+\]\s*/g, "").replace(/[«»"]/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const mine = [];
paras.forEach((p, pi) => p.replace(/\s[—–-]\s/g, " ").split(/\s+/).filter(Boolean).forEach((w) => mine.push({ text: w, para: pi })));

const sim = (a, b) => {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  let k = 0; while (k < Math.min(a.length, b.length) && a[k] === b[k]) k++;
  return k >= 3 || (k >= 2 && Math.min(a.length, b.length) <= 3) ? 0.7 : 0;
};
const n = mine.length, m = words.length;
const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
const B = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
for (let i = 1; i <= n; i++) { D[i][0] = -0.4 * i; B[i][0] = 1; }
for (let j = 1; j <= m; j++) { D[0][j] = -0.4 * j; B[0][j] = 2; }
for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
  const s = sim(mine[i - 1].text, words[j - 1].t);
  const c = [D[i - 1][j - 1] + (s > 0 ? s : -0.6), D[i - 1][j] - 0.4, D[i][j - 1] - 0.4];
  const k = c.indexOf(Math.max(...c)); D[i][j] = c[k]; B[i][j] = k;
}
const at = new Array(n).fill(null);
for (let i = n, j = m; i > 0 || j > 0;) {
  const k = B[i][j];
  if (i > 0 && j > 0 && k === 0) { if (sim(mine[i - 1].text, words[j - 1].t) > 0) at[i - 1] = words[j - 1].s; i--; j--; }
  else if (i > 0 && (j === 0 || k === 1)) i--; else j--;
}
const endT = words.length ? words[words.length - 1].e ?? words[words.length - 1].s + 0.6 : 10;
for (let i = 0; i < n; i++) if (at[i] == null) {
  let a = i - 1; while (a >= 0 && at[a] == null) a--;
  let b = i + 1; while (b < n && at[b] == null) b++;
  const ta = a >= 0 ? at[a] : 0, tb = b < n ? at[b] : endT;
  at[i] = ta + ((tb - ta) * (i - a)) / (b - a);
}
const W = mine.map((w, i) => ({ text: w.text, start: Math.round(at[i] * FPS), end: Math.round((i + 1 < n ? at[i + 1] : at[i] + 0.6) * FPS) }));
const groups = [];
let cur = [];
W.forEach((w, k) => {
  cur.push(w);
  const len = cur.reduce((s, x) => s + x.text.length, 0);
  if (/[.,:!?…]$/.test(w.text) || cur.length >= 3 || len > 13 || k === W.length - 1 || mine[k + 1]?.para !== mine[k].para) {
    groups.push({ text: cur.map((x) => x.text).join(" "), start: cur[0].start, end: Math.min(cur[cur.length - 1].end, cur[0].start + 75), words: cur });
    cur = [];
  }
});
const total = Math.round((endT + (cfg.tail ?? 0.7)) * FPS);
const plan = {
  fps: FPS, total,
  video: cfg.video ?? "video.mp4", voice: cfg.voice ?? "voice.mp3", music: cfg.music === false ? null : "music.wav",
  mix: { voice: 1.0, music: cfg.music_volume ?? 0.11 },   // голос ВСЕГДА громче музыки
  caption: { size: 92, stroke: 16, bottom: 600, highlight: cfg.highlight ?? null },
  groups,
};
fs.writeFileSync("src/plan.json", JSON.stringify(plan, null, 1));
console.log(`план: ${(total / FPS).toFixed(1)} с, ${groups.length} групп субтитров`);
console.log(groups.slice(0, 6).map((g) => `${(g.start / FPS).toFixed(1)} «${g.text}»`).join(" | "));
```

### `tools/music.mjs`
```js
// Процедурная фоновая музыка (без внешних файлов и лицензий — можно монетизировать). Звуковых эффектов нет.
//   node tools/music.mjs <durationSec> [playful|tense|calm]   → public/music.wav
import fs from "node:fs";
import path from "node:path";

const SR = 44100;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MOODS = {
  playful: { bpm: 118, root: 60, prog: [[0, "maj"], [-3, "min"], [-7, "maj"], [-5, "maj"]], pad: 0.18, pluck: 0.45, bass: 0.3, kick: 0.35, hat: 0.25, bright: 0.8 },
  tense: { bpm: 96, root: 50, prog: [[0, "min"], [-2, "maj"], [-4, "maj"], [-5, "maj"]], pad: 0.3, pluck: 0.3, bass: 0.4, kick: 0.4, hat: 0.2, bright: 0.45 },
  calm: { bpm: 84, root: 55, prog: [[0, "maj"], [-3, "min"], [-5, "maj"], [-7, "maj"]], pad: 0.3, pluck: 0.4, bass: 0.18, kick: 0, hat: 0, bright: 0.7 },
};
const chord = (root, type) => (type === "min" ? [0, 3, 7, 10] : [0, 4, 7, 11]).map((x) => root + x);

export const writeWav = (file, floatChannels) => {
  const len = floatChannels[0].length, ch = floatChannels.length;
  const buf = Buffer.alloc(44 + len * ch * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + len * ch * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(len * ch * 2, 40);
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, floatChannels[c][i])) * 32767), o); o += 2; }
  fs.writeFileSync(file, buf);
};

const music = (mood, dur) => {
  const m = MOODS[mood] ?? MOODS.playful;
  const n = Math.floor(dur * SR), L = new Float32Array(n), R = new Float32Array(n);
  const beat = 60 / m.bpm, bar = beat * 4;
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let lpL = 0, lpR = 0;
  const alpha = 0.02 + m.bright * 0.08;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const [off, type] = m.prog[Math.floor(t / bar) % m.prog.length];
    const notes = chord(m.root + off, type);
    let s = 0;
    if (m.pad) { let p = 0; for (const nn of notes) for (const det of [-0.4, 0, 0.4]) { const ph = (t * (midi(nn) + det)) % 1; p += (2 * ph - 1) * 0.08; } s += p * m.pad * (0.8 + 0.2 * Math.sin(t * 0.7)); }
    if (m.bass) { const f = midi(m.root + off - 12); const g = Math.pow(0.5, (t % beat) / 0.35); s += (Math.sin(2 * Math.PI * f * t) * 0.8 + Math.sin(4 * Math.PI * f * t) * 0.15) * m.bass * (0.6 + 0.4 * g); }
    if (m.pluck) { const st = beat / 2, k = Math.floor(t / st), tt = t - k * st; const f = midi(notes[[0, 2, 1, 3, 2, 0, 3, 1][k % 8]] + 12); s += (2 * Math.abs(2 * ((t * f) % 1) - 1) - 1) * Math.exp(-tt * (6 + m.bright * 6)) * m.pluck * 0.5; }
    if (m.kick) { const tt = t % beat; s += Math.sin(2 * Math.PI * (48 * Math.exp(-tt * 30) + 48) * tt) * Math.exp(-tt * 12) * m.kick * 0.9; }
    if (m.hat) { const st = beat / 2, tt = t % st; if (Math.floor(t / st) % 2 === 1) s += (rnd() * 2 - 1) * Math.exp(-tt * 60) * m.hat * 0.5; }
    lpL += alpha * (s - lpL); lpR += alpha * 1.05 * (s - lpR);
    const fade = Math.min(1, t / 1.5, (dur - t) / 2.5);
    L[i] = lpL * fade; R[i] = lpR * fade;
  }
  const d1 = Math.floor(0.231 * SR), d2 = Math.floor(0.347 * SR);
  for (let i = 0; i < n; i++) { if (i >= d1) L[i] += R[i - d1] * 0.28; if (i >= d2) R[i] += L[i - d2] * 0.28; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.45 / (peak || 1); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  return [L, R];
};

const [, , a, b] = process.argv;
fs.mkdirSync("public", { recursive: true });
writeWav("public/music.wav", music(b ?? "playful", Number(a ?? 65)));
console.log("music -> public/music.wav");
```

### `tools/tts_piper.mjs`
```js
// БЕСПЛАТНАЯ озвучка без регистрации: Piper (sherpa-onnx), работает офлайн на Windows/Mac.
// Звучит заметно «роботизированнее», чем ElevenLabs (честно), но разборчиво — годится для черновиков и
// роликов без монетизации. Голоса: ru_RU-dmitri-medium (муж.), ru_RU-irina-medium (жен.), en_US-ryan-high …
//   node tools/tts_piper.mjs script/voice.txt public/voice.wav [voice] [speed]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [, , txtFile, out = "public/voice.wav", voice = "ru_RU-dmitri-medium", speed = "1.08"] = process.argv;
const DIR = path.join(os.homedir(), ".doodle-shorts", "tts");
const vdir = path.join(DIR, `vits-piper-${voice}`);
if (!fs.existsSync(path.join(vdir, "tokens.txt"))) {
  fs.mkdirSync(DIR, { recursive: true });
  const name = `vits-piper-${voice}.tar.bz2`;
  console.log("↓ голос", voice, "(~70 МБ, один раз)");
  execFileSync("curl", ["-sL", "-f", "-o", name, `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${name}`], { cwd: DIR, stdio: "inherit" });
  const winTar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
  execFileSync(process.platform === "win32" && fs.existsSync(winTar) ? winTar : "tar", ["xjf", name], { cwd: DIR, stdio: "inherit" });
  fs.rmSync(path.join(DIR, name), { force: true });
}
const sherpa = require("sherpa-onnx-node");
const onnx = fs.readdirSync(vdir).find((f) => f.endsWith(".onnx"));
const tts = new sherpa.OfflineTts({
  model: { vits: { model: path.join(vdir, onnx), tokens: path.join(vdir, "tokens.txt"), dataDir: path.join(vdir, "espeak-ng-data"),
    noiseScale: 0.6, noiseScaleW: 0.7, lengthScale: 1.0 }, numThreads: 2, provider: "cpu" }, maxNumSentences: 1 });
// абзацы — с паузой 0.45 с между ними
const paras = fs.readFileSync(txtFile, "utf8").replace(/\[[^\]]+\]\s*/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const chunks = [];
let sr = 22050;
for (const p of paras) {
  const a = tts.generate({ text: p, sid: 0, speed: Number(speed) });
  sr = a.sampleRate;
  chunks.push(Float32Array.from(a.samples), new Float32Array(Math.floor(sr * 0.45)));
}
const total = chunks.reduce((s, c) => s + c.length, 0);
const all = new Float32Array(total);
let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const tmp = out.replace(/\.wav$/, "_raw.wav");
// сохраняем с реальной частотой модели, затем ffmpeg приводит к 44.1 кГц
const buf = Buffer.alloc(44 + total * 2);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(total * 2, 40);
for (let i = 0; i < total; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, all[i])) * 32767), 44 + i * 2);
fs.writeFileSync(tmp, buf);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-ar", "44100", out]);
fs.rmSync(tmp);
console.log("голос →", out, (total / sr).toFixed(1), "с");
```

### `script/edit.json` (необязательно)
```json
{"voice": "voice.mp3", "music_volume": 0.11, "highlight": null}
```

Пустые папки, которые нужно создать: `public/`, `audio/`, `script/`, `checks/`, `out/`.


---

# Приложение А: эталонные сценарии (Ricks Clips) с разбором

**Как использовать.** Перед тем как писать сценарий для пользователя, прочитай ВСЕ пять примеров и разборы.
Пиши в той же манере и на том же уровне. **Копировать нельзя** — ни сюжеты, ни фразы. Повторять нужно
структуру и подачу: хук-парадокс, «ты» в истории, смешные конкретные детали, загадку, бытовую аналогию,
реальный факт и финал-«кнопку».

Тексты ниже — оригиналы на английском, без сокращений. Ролик делается на языке пользователя.

---

## 1. Why the Second Draw Always Wins

> The fastest gun in the west had one rule: never draw first. Imagine you're standing in the street at noon, staring down a guy everyone calls Slow Eddie. His hands are at his sides, he hasn't even looked at his gun, and he just nods at you and says, "After you." So you grab for your gun faster than you've ever moved in your life, yet you're face down in the dirt before it clears the holster. How is that possible? Eddie isn't even fast. He'd lose a race to the saloon against a guy carrying two beers, but men ride in from three states away to duel him, and every one of them goes down the exact same way. The only weird thing anyone ever notices is that Eddie never looks at your face — he just stares at your hand. You see, think about the last time your phone slid off a table. You caught it before you even realized it was falling, because you never decided to catch it — your body just did. But when you went for your gun, you had to decide the exact moment to draw, and that tiny decision slowed your hand down. Eddie never decides anything. He just waits for your hand to twitch and lets his body react on its own.

**Разбор.**
- **Хук (1-я фраза, ~2 с):** парадокс-правило: «самый быстрый стрелок никогда не стреляет первым». Противоречие заставляет досмотреть.
- **Сюжет:** «Представь…» → ты стреляешь первым → проигрываешь → «Как такое возможно?» → Эдди даже не быстрый (смешная деталь) → странная примета (смотрит на руку) → бытовая аналогия (телефон со стола) → научное объяснение (реакция быстрее решения) → итоговая формула.
- **Сцен:** ~8: улица в полдень, Эдди кивает, рывок к кобуре, ты в пыли, гонка с пивом, очередь дуэлянтов, взгляд на руку, телефон падает со стола.
- **Длина фраз:** 8–20 слов, после длинной обязательно короткая («How is that possible?», «Eddie isn't even fast.»).
- **Темп:** ~200 слов ≈ 60 с; каждые 1–2 фразы — новая картинка.
- **Финал:** не мораль, а чёткая формула механизма («ждёт, пока дёрнется твоя рука, и тело реагирует само»).
- **Почему работает:** зритель — участник («you»); загадка поставлена на 15-й секунде, ответ дан только в конце; аналогия из жизни зрителя делает науку очевидной.

---

## 2. Every Memory Has a Price

> He sold his happiest memory to a stranger behind a counter. You see, memories are money here. There's a shop on every corner that'll pull one right out of your skull. Landlords take rent in birthdays, and a bag of groceries costs the day you learned to ride a bike. The city is split in two by a giant wall. On one side, the rich just buy everyone else's summers, so some guy over there has been to the Bahamas 300 times without leaving his couch. On the other side, people stare at old photos of themselves smiling with no idea why. And since the rich only want the good stuff, the happier the memory, the more it pays. Jerry only sold his to cover rent, but that same week his little brother gets sick. And every night in the hospital he begs for the same bedtime story: the summer they caught a frog the size of a football at the lake. But the medicine costs way more than rent, so Jerry goes back and sells that summer for a week of it. The best birthday he ever had pays for the surgery, and soon he's selling whole years until his head is mostly bad days and bus rides. His brother keeps getting worse until there's only one good year left, and the guy behind the counter stares at him and says, "Kid, you sell this, there's nothing happy left in there." He sells it anyway. And it pays for everything. A week later his brother sits up in bed cured and says, "Hey Jerry, tell me the frog story." And Jerry has no idea who this kid is. He sold every happy year he ever had.

**Разбор.**
- **Хук:** действие + странность («продал самое счастливое воспоминание незнакомцу за прилавком»).
- **Сюжет:** правила мира в 3–4 смешно-конкретных примерах (аренда днями рождения, Багамы 300 раз с дивана) → герой и ставка (брат болен) → эскалация (продаёт всё больше) → «последний счастливый год» → жертва → твист: брат здоров, но Джерри его не помнит.
- **Сцен:** ~10 (лавка, город со стеной, богатый на диване, фото, больница, озеро с лягушкой, прилавок, кровать брата).
- **Длина фраз:** 6–25 слов; короткие удары в кульминации («He sells it anyway.»).
- **Темп:** ~300 слов ≈ 90 с — длинный формат; для 45–60 с сокращать мир до 2 примеров.
- **Финал:** закольцованная деталь (история про лягушку) превращается в удар — заранее посаженное «ружьё».
- **Почему работает:** мир объяснён через бытовые сделки; эмоция растёт ступенями; деталь из середины стреляет в финале.

---

## 3. He Could Spot Winning Tickets Just by Looking

> Look at these two scratch cards: one's a winner and one's garbage, yet there's a way to tell without scratching either of them. It all started when a guy got fired and spent five bucks on two scratch cards on the way home. He scratches one and wins his five bucks back, but instead of celebrating like a normal person, he gets suspicious: if the lottery decides exactly how many winners get printed, how does the machine know which ones they are? So he does what any sane person would do: he blows his entire severance check on a huge stack, spreads them across his apartment floor, and stares until something jumps out. Every card has little grids of numbers printed right on the front, and most of the numbers show up two or three times, but a few only show up once. And whenever three of those loners line up in a row, it's a winner. Which means this guy just cracked the lottery. He could walk into every gas station in the state and clean them out. So what does he do? He calls the lottery: "Sir, that's impossible." Okay, so he walks into their office with a box full of cards he's never scratched, sorted into winners and losers, and gets 90% of them right. By the end of the week, the game is gone from every store.

**Разбор.**
- **Хук:** обращение к зрителю + вызов («посмотри на эти два билета — один выигрышный, и это можно узнать не стирая»). Зритель сразу пытается угадать.
- **Сюжет:** завязка (уволили, 5 долларов) → подозрение-вопрос → иронично «разумный» поступок (спустил выходное пособие) → открытие (числа-одиночки) → неожиданный выбор (звонит в лотерею, а не грабит) → доказательство (90%) → последствие (игру убрали).
- **Сцен:** ~8.
- **Длина фраз:** средние, с ироничными вставками («like a normal person», «what any sane person would do»).
- **Темп:** ~230 слов ≈ 65 с.
- **Финал:** короткое масштабное последствие («к концу недели игры не было ни в одном магазине»).
- **Почему работает:** реальная история (Мохан Шривастава) подана как анекдот; ирония рассказчика + конкретные цифры.

---

## 4. The Ancient Jar That Warned an Empire

> He put a bronze ball in a dragon's mouth and told the emperor, "If this ever falls out, run." The whole court burst out laughing. You see, there were eight dragons coiled around a giant bronze jar, each holding a ball over a frog's open mouth. But the emperor had the biggest army in the world, and he wasn't about to run from a jar. Weeks later a ball fell, but nothing happened — not even a ripple in the emperor's wine. Now they laughed even harder. The emperor called it the world's most expensive toy and threw the inventor out of the city, jar and all. So he dragged it up a hill outside the walls and lived there alone. Then one night a ball dropped. Then another. Then all eight at once. He ran to the city gates screaming for everyone to get out. "Hey, it's the toy guy! Did your frogs get hungry again?" The guards laughed him all the way back up the hill. The next morning the palace was a pile of rubble. Inside the jar hung a heavy pendulum with a rod pointing at each dragon. The slightest nudge, and the pendulum swung into a rod. The rod snapped the dragon's jaw open and the ball dropped. One ball meant a nudge from far away...

**Разбор.**
- **Хук:** странный предмет + грозное предупреждение («если шар выпадет — беги»).
- **Сюжет:** смех двора → описание прибора (визуально) → ложная тревога → изгнание → ночь, падают все шары → никто не верит (шутка стражи) → катастрофа → объяснение механизма (маятник).
- **Сцен:** ~10 — каждая фраза = картинка.
- **Длина фраз:** нарастающее «стаккато» в кульминации: «Then one night a ball dropped. Then another. Then all eight at once.»
- **Темп:** ~250 слов; объяснение механизма — в самом конце, как награда.
- **Финал:** обрывается на интриге/продолжении («один шар значил толчок издалека…») — повод досмотреть/пересмотреть.
- **Почему работает:** реальный факт (сейсмоскоп Чжан Хэна) рассказан как притча «над ним смеялись — он оказался прав».

---

## 5. Levels of Pirate Cannonballs

> If your ship got hit by a cannonball, you'd actually be one of the lucky ones in the 1700s. The Navy's round shot would smash through a pirate ship's wall and turn it into a storm of splinters that tore through half the crew. The pirates couldn't afford proper ammo, so they fired back with langrage, which is a fancy word for literal garbage. But the Navy had a nastier idea called hot shot: they shoveled cannonballs into a furnace until they glowed red, carried them over with giant tongs, and dropped them in behind a soaking wet plug so the gunpowder wouldn't go off early. The ball buried itself deep in the pirate ship's hull, and a few minutes later the whole ship lit up from the inside like a giant lantern. Not to be outdone, the pirates fired back with the carcass — a hollow cannonball packed with burning tar and punched full of holes so it spat fire the whole way over and turned the entire Navy ship into a torch. Eventually, ships advanced from wood to iron, and the fireballs just bounced off. So America built the Rodman gun, a cannon that fired a single ball weighing over 1,000 lbs, made to punch a hole in an iron warship big enough to sink it in one shot.

**Разбор.**
- **Хук:** контринтуитивное утверждение («если в твой корабль попало ядро — тебе ПОВЕЗЛО»).
- **Сюжет:** формат «уровни» — каждая ступень хуже/круче предыдущей: ядро → мусор → калёное ядро → «каркас» с огнём → железные корабли → пушка Родмана. Противостояние «флот vs пираты» как пинг-понг.
- **Сцен:** по 1–2 на уровень (~8).
- **Длина фраз:** длинные описательные + короткие ироничные пояснения («a fancy word for literal garbage»).
- **Темп:** ~220 слов ≈ 60 с; каждые 7–9 секунд — новый уровень (новая картинка-«вау»).
- **Финал:** максимальный уровень (1000-фунтовое ядро) — гипербола как кульминация.
- **Почему работает:** простая лестница эскалации, каждая ступень визуальна; ирония в словах-пояснениях.

---

## Наш собственный пример (сделан по этой формуле, одобрен пользователем)

> Самого надёжного машиниста Токио считают психом: весь рейс он тычет пальцем в пустоту и разговаривает сам с собой.
>
> Представь: первый день, ты стажёр в его кабине. Светофор — палец. «Зелёный — есть!» Часы — палец. «Двадцать три сорок одна — есть!»
>
> Пустая платформа — «Чисто!» Даже на кота на перроне показал. «Кот — есть!»
>
> Ты еле сдерживаешься, ведь вокруг ни души. Но у этого чудика тридцать лет без единой ошибки.
>
> А ты уже на третий день пролетаешь станцию, хотя смотрел прямо на табличку. Как такое возможно?
>
> Вспомни: ты выходишь из дома и через минуту не помнишь, закрыл ли дверь. Закрыл. Просто мозг сделал это на автопилоте и ничего не записал.
>
> Глаза видят, а голова спит. Чтобы показать пальцем и сказать вслух, мозгу приходится проснуться и по-настоящему заметить.
>
> Японские инженеры проверили: такой спектакль срезает ошибки почти на восемьдесят пять процентов.
>
> Так что на следующий день ты уже стоишь в кабине, тычешь в кота и орёшь: «Кот — есть!»

Хук-парадокс (надёжный = псих) → «Представь, ты стажёр» → смешные повторы-ритм («палец… есть!») → посаженная деталь (кот) → вопрос «Как такое возможно?» → бытовая аналогия (закрыл ли дверь) → механизм → факт (−85%) → финал-кнопка с котом. 9 абзацев = 9 шотов, ~150 слов, ~60 с с голосом ElevenLabs.
