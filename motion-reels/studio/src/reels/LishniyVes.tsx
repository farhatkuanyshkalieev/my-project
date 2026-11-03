import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { countEase, countTicks, ringEase, s2f } from "../lib/anim";
import { C, fontsLoaded } from "../lib/theme";
import { Phrase } from "../components/Phrase";
import { Arcs, Blob, DarkBg, LightBg } from "../components/Graphics";
import { Chocolate, Counter, Folder, Notification, Phone, ResearchCard, StepRing, Tree } from "../components/Widgets";
import { DrinkItem } from "../components/Drinks";
import { Cue, SfxTrack } from "../components/Sfx";
import PLAN from "./lishniy-ves.vo.json";
import WORDS from "./lishniy-ves.words.json";
import DUCK from "./lishniy-ves.duck.json";

/**
 * Рилс №1 — «Лишний вес». Сценарий: motion-reels/reels/01-lishniy-ves/SCENARIO.md
 *
 * Синхронизация с голосом: каждое слово на экране появляется в момент, когда его произносят.
 *   w("16", 6) — абсолютная секунда 6-го слова клипа 16 (= старт клипа из lishniy-ves.vo.json + время слова из расшифровки).
 * Перезаписал клип → process_voice.sh → расшифровка → build_vo.py — тайминги пересчитаются сами.
 */
type ClipId = keyof typeof PLAN.clips;
const w = (clip: ClipId, i: number) => PLAN.clips[clip] + (WORDS[clip].words[i][1] as number);
const ws = (clip: ClipId, ...idx: number[]) => idx.map((i) => w(clip, i));
const range = (clip: ClipId, a: number, b: number) => ws(clip, ...Array.from({ length: b - a + 1 }, (_, k) => a + k));
const clipEnd = (clip: ClipId) => PLAN.clips[clip] + WORDS[clip].dur;

export const NICK = "@nickname"; // TODO: ник автора
export const DURATION_S = PLAN.duration;

// Бит «Amnesia» вступает на 24.06 с трека — ставим его ровно на «стоит»
const MUSIC_START = 24.06 - w("15", 5);

// Тёмная сцена (причина №3): клякса после «даже не замечая», обратно — после «в день»
const BLOB_IN = clipEnd("20") + 0.1;
const BLOB_OUT = clipEnd("21") + 0.35;
const DARK_FROM = BLOB_IN + 0.5;
const DARK_TO = BLOB_OUT + 0.5;

// Пауза без голоса: напитки + блок «+100 ккал × 365» (сюда ляжет клип 18, когда будет записан)
const DRINKS_AT = clipEnd("17") + 0.15;
const SLOT18 = DRINKS_AT + 2.9;

const CTA_DING = w("23", 0) - 0.35;

/** Звук начисления: «вычисляющий» цифровой фон + тики по кривой счётчика + «готово» в конце */
const countSfx = (at: number, dur: number, n: number, ease: (t: number) => number = countEase): Cue[] => {
  const ticks = countTicks(at, dur, n, ease);
  const names = ["tick", "tick2", "tick3"] as const;
  return [
    [at, "compute", 0.2, dur + 0.15],
    ...ticks.map((t, i): Cue => [t, names[i % 3], 0.3 + 0.12 * (i / ticks.length)]),
    [at + dur, "done", 0.32],
  ];
};

const C7700 = { at: w("16", 6), dur: w("16", 7) - w("16", 6) };
const C47 = { at: SLOT18 + 2.0, dur: 0.9 };
const C385 = { at: w("20", 3), dur: w("20", 7) - w("20", 3) };
const RING = { at: w("21", 12) - 0.25, fillAt: w("21", 14) + 0.05, fillEnd: w("21", 16) + 0.25 };

const cues: Cue[] = [
  // 1. хук
  [w("15", 0) - 0.1, "whoosh_fast"],
  [w("15", 3) - 0.12, "glitch"],
  [w("15", 5), "boom"],
  [w("15", 5) + 0.05, "whoosh_line"],
  [w("15", 6) - 0.25, "notify"],
  [w("15", 8), "soft_wipe"],
  // 2. цифра
  ...countSfx(C7700.at, C7700.dur, 18),
  [C7700.at + C7700.dur, "boom"],
  ...[0, 1, 2, 3, 4, 5, 6].map((i): Cue => [w("16", 9) + i * 0.1, "pop", 0.28]),
  [w("17", 3), "swoosh"],
  // 3. напитки
  [w("17", 6), "whoosh_line"],
  [w("17", 13), "bass_hit"],
  [DRINKS_AT, "whoosh_fast", 0.35],
  [DRINKS_AT + 0.05, "pop", 0.4],
  [DRINKS_AT + 0.35, "whoosh_fast", 0.3],
  [DRINKS_AT + 0.4, "pop", 0.4],
  [DRINKS_AT + 0.7, "whoosh_fast", 0.3],
  [DRINKS_AT + 0.75, "pop", 0.4],
  [C47.at - 0.15, "rise"],
  ...countSfx(C47.at, C47.dur, 16),
  [C47.at + C47.dur, "boom"],
  // 4. сон
  [w("19", 2), "whoosh_line"],
  [w("19", 9), "glitch"],
  [w("19", 10) - 0.2, "whoosh_line"],
  [w("19", 10), "pop", 0.35],
  [w("19", 17) - 0.2, "whoosh_line", 0.35],
  [w("19", 17), "pop", 0.35],
  ...countSfx(C385.at, C385.dur, 16),
  [C385.at + C385.dur, "boom"],
  [C385.at + C385.dur + 0.2, "object"],
  // 5. движение (тёмная сцена)
  [BLOB_IN + 0.25, "deep_whoosh"],
  [DARK_FROM, "boom"],
  [w("21", 2), "whoosh_line", 0.3],
  [RING.at, "pop", 0.3],
  ...countSfx(RING.fillAt, RING.fillEnd - RING.fillAt, 22, ringEase),
  [w("21", 22), "boom"],
  [w("21", 22) + 0.4, "object"],
  [BLOB_OUT + 0.25, "deep_whoosh", 0.6],
  // 6. вывод
  [w("22", 12) - 0.25, "pop"],
  [w("22", 12) - 0.05, "pop"],
  [w("22", 12), "boom"],
  [w("22", 12) + 0.15, "pop"],
  // 7. призыв
  [CTA_DING, "notify", 0.7],
  [CTA_DING + 0.25, "swoosh"],
  [w("23", 7) - 0.3, "whoosh_fast"],
  [w("23", 9), "bass_hit", 0.4],
];

const musicVolume = (f: number) => {
  // глитч-обрыв в хуке
  const g0 = s2f(w("15", 3) - 0.12);
  if (f >= g0 && f < g0 + 2) return 0;
  // сброс перед призывом: тишина + дзынь, потом тихая подложка
  const duck = interpolate(f, [s2f(CTA_DING) - 3, s2f(CTA_DING), s2f(CTA_DING) + 20, s2f(CTA_DING) + 35], [1, 0, 0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // дакинг под голосом (посчитан build_vo.py по реальной дорожке)
  const vo = (DUCK as number[])[Math.min(f, DUCK.length - 1)] ?? 1;
  return 0.6 * duck * vo;
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const dark = frame >= s2f(DARK_FROM) && frame < s2f(DARK_TO);
  return (
    <AbsoluteFill>
      {dark ? <DarkBg /> : <LightBg />}

      {/* ── 1. ХУК ── «Ты ешь меньше, а вес стоит. Разбор за одну минуту.» */}
      <Phrase text="ты ешь меньше" times={range("15", 0, 2)} at={w("15", 0)} end={w("15", 3) - 0.08} />
      <Phrase text="а вес *стоит*" times={range("15", 3, 5)} at={w("15", 3)} end={w("15", 6) - 0.08} size={92} />
      <Arcs at={w("15", 5)} end={w("16", 0)} />
      <Notification at={w("15", 5) + 0.35} end={w("16", 0) - 0.2} title="мама" body="опять на диете? 😅" avatar="👩" />
      <Phrase text="разбор за ~1 минуту~" times={[w("15", 6), w("15", 7), w("15", 8)]} at={w("15", 6)} end={w("16", 0) - 0.08} />

      {/* ── 2. ЦИФРА ── «Один килограмм жира — это примерно 7700 ккал. Это 14 плиток шоколада, но никто их не съедает.» */}
      <Phrase text="1 кг жира" times={range("16", 0, 2)} at={w("16", 0)} end={w("16", 4) - 0.08} size={92} />
      <Phrase text="это примерно" times={ws("16", 4, 5)} at={w("16", 4)} end={w("16", 8) - 0.1} y={650} />
      <Counter at={C7700.at} countDur={C7700.dur} end={w("16", 8) - 0.1} to={7700} unit="ккал" y={900} />
      <Chocolate at={w("16", 9)} end={clipEnd("16")} y={560} />
      <Phrase text="это 14 плиток шоколада" times={range("16", 8, 11)} at={w("16", 8)} end={w("16", 12) - 0.08} y={1000} />
      <Phrase text="но никто их|не съедает" times={range("16", 12, 16)} at={w("16", 12)} end={clipEnd("16")} y={1000} />

      {/* ── 3. НАПИТКИ ── «Так откуда берётся вес? Причина №1 — напитки. Мозг не считает их едой. Сытости нет, а калории есть.» */}
      <Phrase text="так откуда|берётся *вес?*" times={range("17", 0, 3)} at={w("17", 0)} end={w("17", 4) - 0.08} size={86} />
      <Phrase text="причина №1 ~напитки~" times={ws("17", 4, 5, 6)} at={w("17", 4)} end={w("17", 7) - 0.08} />
      <Arcs at={w("17", 6)} end={w("17", 12)} variant={1} />
      <Phrase text="мозг не считает|их едой" times={range("17", 7, 11)} at={w("17", 7)} end={w("17", 12) - 0.08} />
      <Phrase text="сытости *нет*|а калории *есть*" times={range("17", 12, 16)} at={w("17", 12)} end={DRINKS_AT - 0.05} />
      <DrinkItem kind="latte" at={DRINKS_AT} end={SLOT18 - 0.1} x={200} y={780} w={300} label="латте" kcal="~250 ккал" />
      <DrinkItem kind="juice" at={DRINKS_AT + 0.35} end={SLOT18 - 0.1} x={540} y={780} w={300} label="сок 0,5 л" kcal="~220 ккал" />
      <DrinkItem kind="cola" at={DRINKS_AT + 0.7} end={SLOT18 - 0.1} x={880} y={780} w={300} label="кола 0,5 л" kcal="~210 ккал" />

      {/* Слот клипа 18 (пока без голоса): «всего +100 ккал в день × 365 дней ≈ 4,7 кг за год» */}
      <Phrase text="всего *+100 ккал* в день" at={SLOT18} end={SLOT18 + 1.4} />
      <Phrase text="× 365 дней" at={SLOT18 + 1.5} end={C47.at + C47.dur + 1.2} y={650} />
      <Counter at={C47.at} countDur={C47.dur} end={C47.at + C47.dur + 1.2} to={4.7} decimals={1} prefix="≈ " unit="кг" y={900} color={C.wineText} />
      <Phrase text="за год" at={C47.at + C47.dur + 0.1} end={C47.at + C47.dur + 1.2} y={1110} />

      {/* ── 4. СОН ── «Причина №2 — сон. Меньше 6 часов — и гормоны голода ломаются. Грелина больше — есть хочется сильнее. Лептина меньше — сытость не приходит.» */}
      <Phrase text="причина №2 ~сон~" times={ws("19", 0, 1, 2)} at={w("19", 0)} end={w("19", 3) - 0.08} />
      <Arcs at={w("19", 2)} end={w("19", 9)} />
      <Phrase text="меньше 6 часов|и гормоны голода *ломаются*" times={range("19", 3, 9)} at={w("19", 3)} end={w("19", 10) - 0.35} />
      <Tree
        at={w("19", 10) - 0.4}
        end={clipEnd("19") + 0.15}
        y={640}
        title="недосып"
        left={["грелин ↑", "есть хочется сильнее"]}
        right={["лептин ↓", "сытость не приходит"]}
        cues={{ left: w("19", 10), leftSub: w("19", 14), right: w("19", 17), rightSub: w("19", 19) }}
      />

      {/* «И ты съедаешь +385 ккал в день, даже не замечая.» */}
      <Phrase text="и ты съедаешь" times={range("20", 0, 2)} at={w("20", 0)} end={w("20", 10) - 0.1} y={650} />
      <Counter at={C385.at} countDur={C385.dur} end={w("20", 10) - 0.1} to={385} prefix="+" unit="ккал" y={880} color={C.wineText} />
      <ResearchCard at={w("20", 8)} end={w("20", 10) - 0.1} y={1040} title="Al Khatib et al., 2017" sub="мета-анализ · Eur J Clin Nutr" />
      <Phrase text="в день" times={ws("20", 8, 9)} at={w("20", 8)} end={w("20", 10) - 0.1} y={1230} size={60} />
      <Phrase text="даже не замечая" times={range("20", 10, 12)} at={w("20", 10)} end={BLOB_IN + 0.1} />

      {/* ── 5. ДВИЖЕНИЕ (тёмная сцена) ── «Причина №3 — самое недооценённое. Не зал, а обычное движение. Шаги, лестница, уборка. 5 тысяч шагов или 10 — у разных людей разница до 2 тысяч ккал в день.» */}
      <Blob at={BLOB_IN} dur={0.5} color={C.darkMid} />
      <Phrase text="причина №3|~самое недооценённое~" times={ws("21", 0, 1, 2)} at={w("21", 0)} end={w("21", 4) - 0.08} dark scriptSize={96} />
      <Phrase text="не зал" times={ws("21", 4, 5)} at={w("21", 4)} end={w("21", 6) - 0.06} dark size={92} />
      <Phrase text="а обычное *движение*" times={range("21", 6, 8)} at={w("21", 6)} end={w("21", 9) - 0.08} dark />
      <Phrase text="шаги, лестница, уборка" times={range("21", 9, 11)} at={w("21", 9)} end={RING.at - 0.05} dark />
      <StepRing at={RING.at} fillAt={RING.fillAt} fillDur={RING.fillEnd - RING.fillAt} end={w("21", 17) - 0.08} y={520} from={5000} to={10000} />
      <Phrase text="у разных людей|разница" times={range("21", 17, 20)} at={w("21", 17)} end={w("21", 21) - 0.06} dark />
      <Phrase text="до *2 000 ккал*|в день" times={ws("21", 21, 22, 25, 26)} at={w("21", 21)} end={BLOB_OUT} dark size={86} y={820} />
      <ResearchCard at={w("21", 24)} end={BLOB_OUT} y={1040} title="Levine et al., 1999" sub="Science · бытовая активность" dark />
      <Blob at={BLOB_OUT} dur={0.5} color={C.bgCenter} />

      {/* ── 6. ВЫВОД ── «Лишний вес — это не одна ошибка. Это три маленькие привычки, которые складываются.» */}
      <Phrase text="лишний вес" times={ws("22", 0, 1)} at={w("22", 0)} end={w("22", 3) - 0.08} size={92} />
      <Phrase text="это не одна ошибка" times={range("22", 3, 6)} at={w("22", 3)} end={w("22", 7) - 0.08} />
      <Phrase text="это 3 маленькие|привычки" times={range("22", 7, 10)} at={w("22", 7)} end={w("22", 11) - 0.08} />
      <Phrase text="которые ~складываются~" times={ws("22", 11, 12)} at={w("22", 11)} end={CTA_DING - 0.1} y={620} />
      <Folder at={w("22", 12) - 0.25} end={CTA_DING - 0.1} x={200} y={1010} label="напитки" w={250} />
      <Folder at={w("22", 12) - 0.05} end={CTA_DING - 0.1} x={540} y={1010} label="сон" w={250} />
      <Folder at={w("22", 12) + 0.15} end={CTA_DING - 0.1} x={880} y={1010} label="шаги" w={250} />
      <Arcs at={w("22", 12)} end={CTA_DING - 0.1} variant={1} />

      {/* ── 7. ПРИЗЫВ + ОБРЫВ ── «Хочешь чек-лист из 10 простых замен? Пиши слово "вес" в комментариях и я скину тебе в дире—» */}
      <Phone
        at={CTA_DING + 0.2}
        end={w("23", 7) - 0.3}
        y={130}
        nick={NICK}
        items={["латте без сиропа", "вода вместо колы", "сон 7+ часов", "+3 000 шагов в день", "лестница вместо лифта"]}
      />
      <Phrase text="хочешь чек-лист|из 10 простых замен?" times={ws("23", 0, 1, 3, 4, 5, 6)} at={w("23", 0)} end={w("23", 7) - 0.1} y={1450} size={68} />
      <Phrase text="пиши слово *«вес»*|в комментариях" times={range("23", 7, 11)} at={w("23", 7)} end={w("23", 12) - 0.06} size={84} />
      <Phrase text="и я скину тебе в дире" times={range("23", 12, 17)} at={w("23", 12)} end={999} exit="none" />

      <Audio src={staticFile("music/amnesia.mp3")} trimBefore={s2f(MUSIC_START)} volume={musicVolume} />
      <Audio src={staticFile("vo/lishniy-ves.wav")} volume={1} />
      <SfxTrack cues={cues} />
    </AbsoluteFill>
  );
};

export const LishniyVes: React.FC = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    fontsLoaded
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
  return <Scene />;
};
