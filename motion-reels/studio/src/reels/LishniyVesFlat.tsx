import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { countEase, countTicks, prog, s2f } from "../lib/anim";
import { fontsLoaded } from "../lib/theme";
import { makeVo } from "../lib/vo";
import { Cue, SfxTrack } from "../components/Sfx";
import { Chocolate } from "../components/Widgets";
import { DrinkItem } from "../components/Drinks";
import {
  Calendar,
  Chip,
  CtaButton,
  Eyebrow,
  F,
  FlatBg,
  Figure,
  FText,
  Icon,
  Meter,
  Pill,
  Plate,
  PopIn,
  Scale,
  StatCard,
  Stamp,
  Transform,
  Wipe,
  font,
  wipeCovered,
} from "../flat/kit";
import PLAN from "./lishniy-ves-flat.vo.json";
import WORDS from "./lishniy-ves.words.json";
import DUCK from "./lishniy-ves-flat.duck.json";

/**
 * Рилс №1, версия в стиле №2 («инфографика-мем», второй референс).
 * Тот же голос, но: мем-хук с зацикленным гэгом, персонаж-силуэт, карточки с цифрами,
 * плашки на каждое слово, шторки, сканер «до → после», оффер с кнопкой.
 */
const { w, ws, range, clipEnd, duration } = makeVo(PLAN, WORDS);
export const FLAT_DURATION_S = duration;
export const NICK_FLAT = "@nickname"; // TODO: ник автора

// ── ключевые моменты ──
const WIPE_1 = w("15", 6) - 0.45; // серое «проблема» → мятное «решение» на «разбор»
const CALM_END = wipeCovered(WIPE_1);
const MUSIC_START = 10.98 - CALM_END; // бит Sit Back вступает ровно на смене сцены
const WIPE_2 = w("17", 4) - 0.45; // «так откуда берётся вес?» → причина №1
const DRINKS_AT = clipEnd("17") + 0.15;
const SLOT18 = DRINKS_AT + 2.9;
const WIPE_3 = PLAN.clips["19"] - 0.5;
const WIPE_4 = PLAN.clips["21"] - 0.55;
const WIPE_5 = PLAN.clips["22"] - 0.55;
const WIPE_6 = w("23", 0) - 0.6;
const FLIPS = [1.98, 2.36, 2.72];

const countSfx = (at: number, dur: number, n: number): Cue[] => {
  const ticks = countTicks(at, dur, n, countEase);
  const names = ["tick", "tick2", "tick3"] as const;
  return [
    [at, "compute", 0.14, dur + 0.15],
    ...ticks.map((t, i): Cue => [t, names[i % 3], 0.24 + 0.1 * (i / ticks.length)]),
    [at + dur, "done", 0.3],
  ];
};

const C = {
  kcal7700: { at: w("16", 6), dur: w("16", 7) - w("16", 6) + 0.2 },
  full100: { at: w("17", 15), dur: 0.7 },
  s1: SLOT18 + 0.5,
  s2: SLOT18 + 1.3,
  s3: SLOT18 + 2.1,
  k385: { at: w("20", 3), dur: w("20", 7) - w("20", 3) },
  steps5: { at: w("21", 12), dur: 0.45 },
  steps10: { at: w("21", 16), dur: 0.5 },
  offer: w("23", 6) + 0.3,
};

const cues: Cue[] = [
  // 1. мем-хук (серый, без бита)
  [w("15", 0), "pop", 0.35],
  [w("15", 2), "soft_wipe", 0.3],
  [w("15", 3), "pop", 0.35],
  [w("15", 5), "bass_hit", 0.35],
  ...FLIPS.map((t): Cue => [t, "page_flip", 0.55]),
  ...FLIPS.map((t): Cue => [t + 0.12, "tick", 0.2]),
  [WIPE_1, "whoosh_down"],
  // 2. 7 700 ккал, шоколад
  ...countSfx(C.kcal7700.at, C.kcal7700.dur, 18),
  ...Array.from({ length: 7 }, (_, i): Cue => [w("16", 9) + i * 0.09, "pop", 0.22]),
  [w("16", 16), "bass_hit", 0.35],
  [WIPE_2, "whoosh_down"],
  // 3. напитки
  [w("17", 6), "pop", 0.4],
  [w("17", 11), "bass_hit", 0.35],
  ...countSfx(C.full100.at, C.full100.dur, 12),
  [DRINKS_AT, "whoosh_fast", 0.3],
  [DRINKS_AT + 0.05, "pop", 0.35],
  [DRINKS_AT + 0.4, "pop", 0.35],
  [DRINKS_AT + 0.75, "pop", 0.35],
  ...countSfx(C.s1, 0.6, 10),
  ...countSfx(C.s2, 0.6, 10),
  ...countSfx(C.s3, 0.8, 14),
  [WIPE_3, "whoosh_down"],
  // 4. сон
  [w("19", 2), "pop", 0.4],
  [w("19", 3), "pop", 0.3],
  [w("19", 10), "whoosh_fast", 0.3],
  [w("19", 14), "rise", 0.3],
  [w("19", 17), "whoosh_fast", 0.3],
  [w("19", 19), "soft_wipe", 0.3],
  ...countSfx(C.k385.at, C.k385.dur, 16),
  [WIPE_4, "whoosh_down"],
  // 5. движение
  [w("21", 4), "pop", 0.35],
  [w("21", 5), "bass_hit", 0.35],
  [w("21", 9), "pop", 0.4],
  [w("21", 10), "pop", 0.4],
  [w("21", 11), "pop", 0.4],
  ...countSfx(C.steps5.at, C.steps5.dur, 8),
  ...countSfx(C.steps10.at, C.steps10.dur, 10),
  [w("21", 22), "bass_hit", 0.4],
  [WIPE_5, "whoosh_down"],
  // 6. до → после
  [w("22", 3) - 0.1, "rise", 0.35],
  [w("22", 7), "sparkle", 0.4],
  [w("22", 7) + 0.05, "swoosh", 0.35],
  [w("22", 9), "pop", 0.35],
  [w("22", 10), "pop", 0.35],
  [w("22", 12), "pop", 0.35],
  // 7. оффер
  [WIPE_6, "whoosh_down"],
  ...countSfx(C.offer, 0.7, 10),
  [w("23", 7), "pop", 0.45],
  [w("23", 7) + 0.05, "sparkle", 0.25],
];

const musicVolume = (f: number) => {
  // тихое вступление на серой сцене, бит — со шторкой
  const intro = interpolate(f, [0, s2f(CALM_END)], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = interpolate(f, [s2f(duration) - 18, s2f(duration)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vo = (DUCK as number[])[Math.min(f, DUCK.length - 1)] ?? 1;
  // Sit Back ≈ −8.6 LUFS: 0.27 → ≈ −20 LUFS в паузах, ×0.3 под голосом → ≈ −30 LUFS
  return 0.27 * intro * outro * vo;
};

/** Персонаж, который незаметно полнеет, пока идёт фраза */
const GrowingFigure: React.FC<{ at: number; end: number; y: number; h: number }> = ({ at, end, y, h }) => {
  const frame = useCurrentFrame();
  const fat = interpolate(prog(frame, s2f(at), s2f(end - at), (t) => t), [0, 1], [0.3, 0.75]);
  return (
    <PopIn at={at} end={end} style={{ left: 540 - (h * 400) / 900 / 2, top: y }}>
      <Figure fat={fat} tone="grey" h={h} />
    </PopIn>
  );
};

/** Гантеля с паутиной (зал, в который «не ходят») */
const Dumbbell: React.FC<{ size?: number }> = ({ size = 360 }) => (
  <svg width={size} height={size * 0.5} viewBox="0 0 200 100">
    <rect x={10} y={20} width={26} height={60} rx={8} fill="#62656D" />
    <rect x={164} y={20} width={26} height={60} rx={8} fill="#62656D" />
    <rect x={36} y={44} width={128} height={12} rx={6} fill="#7D8088" />
    <g stroke="#A9ACB4" strokeWidth={1.4} fill="none">
      <path d="M164 20 L196 2 M164 20 L198 22 M164 20 L182 0" />
      <path d="M172 16 Q180 12 186 6 M176 22 Q186 18 194 14 M168 12 Q174 8 178 2" />
    </g>
  </svg>
);

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const grey = t < CALM_END;
  const lbl = { fontFamily: "'Montserrat', sans-serif", fontWeight: 700, letterSpacing: 0, fontSize: 36, color: F.ink };
  const kcl = { fontFamily: "'Montserrat', sans-serif", fontWeight: 900, letterSpacing: 0, fontSize: 44, color: F.teal };

  return (
    <AbsoluteFill>
      <FlatBg mode={grey ? "grey" : "mint"} />

      {/* ── 1. МЕМ-ХУК ── «Ты ешь меньше, а вес стоит» + гэг: недели листаются, весы показывают одно и то же */}
      <FText text="Ты:" at={w("15", 0)} times={ws("15", 0)} end={w("15", 3) - 0.08} y={210} size={120} />
      <FText text="ешь меньше" at={w("15", 1)} times={ws("15", 1, 2)} end={w("15", 3) - 0.08} y={370} size={70} weight={700} color="#5A5C63" />
      <Plate at={w("15", 0) + 0.1} end={w("15", 3) - 0.08} x={540} y={820} shrinkAt={w("15", 2)} />
      <FText text="А вес:" at={w("15", 3)} times={ws("15", 3, 4)} end={WIPE_1 + 0.3} y={210} size={120} />
      <FText text="стоит" at={w("15", 5)} times={ws("15", 5)} end={WIPE_1 + 0.3} y={370} size={70} weight={700} color="#5A5C63" />
      <Calendar
        at={w("15", 3) + 0.05}
        end={WIPE_1 + 0.3}
        x={540}
        y={760}
        pages={[
          { head: "НЕДЕЛЯ 1", big: "ПН", sub: "ем меньше" },
          { head: "НЕДЕЛЯ 2", big: "ПН", sub: "ем меньше" },
          { head: "НЕДЕЛЯ 3", big: "ПН", sub: "ем меньше" },
          { head: "НЕДЕЛЯ 4", big: "ПН", sub: "ем меньше" },
        ]}
        flips={FLIPS}
      />
      <Scale at={w("15", 5)} end={WIPE_1 + 0.3} x={540} y={1250} value="72,0" blinkAt={FLIPS} />

      {/* ── «Разбор за 1 минуту» ── */}
      <FText text="Разбор|за *1_минуту*" at={w("15", 6)} times={ws("15", 6, 7, 8)} end={PLAN.clips["16"] - 0.1} y={700} size={110} />

      {/* ── 2. «1 кг жира — это примерно 7 700 ккал» ── */}
      <FText text="1 кг жира" at={w("16", 0)} times={range("16", 0, 2)} end={w("16", 8) - 0.1} y={300} size={110} />
      <FText text="это примерно" at={w("16", 4)} times={ws("16", 4, 5)} end={w("16", 8) - 0.1} y={460} size={56} weight={600} color={F.sub} />
      <StatCard
        at={w("16", 4)}
        end={w("16", 8) - 0.1}
        y={640}
        cols={[
          { label: "жир", to: 1, text: "1 кг", color: F.ink },
          { label: "энергия", to: 7700, suffix: " ккал", countAt: C.kcal7700.at, countDur: C.kcal7700.dur },
        ]}
      />
      {/* «Это 14 плиток шоколада, но никто их не съедает» */}
      <FText text="Это 14 плиток|шоколада" at={w("16", 8)} times={range("16", 8, 11)} end={clipEnd("16") + 0.1} y={250} size={84} />
      <Chocolate at={w("16", 9)} end={clipEnd("16") + 0.1} y={620} />
      <FText text="но никто их не съедает" at={w("16", 12)} times={range("16", 12, 16)} end={clipEnd("16") + 0.1} y={1020} size={52} weight={700} color={F.sub} />
      <Stamp at={w("16", 16)} end={clipEnd("16") + 0.1} x={540} y={760} ok={false} size={170} />

      {/* ── 3. «Так откуда берётся вес?» → «Причина №1 — напитки» ── */}
      <FText text="Так откуда|берётся *вес?*" at={w("17", 0)} times={range("17", 0, 3)} end={WIPE_2 + 0.3} y={720} size={110} />
      <Eyebrow text="Причина №1" at={w("17", 4)} end={DRINKS_AT - 0.1} y={230} />
      <FText text="Напитки" at={w("17", 6)} times={ws("17", 6)} end={DRINKS_AT - 0.1} y={290} size={120} />
      {/* «Мозг не считает их едой» */}
      <DrinkItem kind="colaCoral" at={w("17", 7)} end={w("17", 12) - 0.1} x={460} y={780} w={300} label="" kcal="" />
      <PopIn at={w("17", 9)} end={w("17", 12) - 0.1} style={{ left: 600, top: 560 }}>
        <div style={{ ...font(800, 40, F.ink), background: F.white, padding: "18px 30px", borderRadius: 30, boxShadow: "0 14px 34px rgba(30,80,90,0.12)" }}>это еда?</div>
      </PopIn>
      <Stamp at={w("17", 11)} end={w("17", 12) - 0.1} x={760} y={760} ok={false} size={130} />
      <FText text="мозг не считает их едой" at={w("17", 7)} times={range("17", 7, 11)} end={w("17", 12) - 0.1} y={1150} size={50} weight={700} color={F.sub} />
      {/* «Сытости нет, а калории есть» — карточка 0% против 100% (как «мои усилия / работа мышц») */}
      <FText text="Сытости нет —|а калории *есть*" at={w("17", 12)} times={range("17", 12, 16)} end={DRINKS_AT - 0.1} y={560} size={72} />
      <StatCard
        at={w("17", 12)}
        end={DRINKS_AT - 0.1}
        y={820}
        numSize={110}
        cols={[
          { label: "Сытость", to: 0, suffix: "%", color: F.greyFig },
          { label: "Калории", to: 100, suffix: "%", countAt: C.full100.at, countDur: C.full100.dur },
        ]}
      />
      {/* Напитки и их калорийность (пауза в голосе) */}
      <Eyebrow text="Скрытые калории" at={DRINKS_AT} end={SLOT18 - 0.1} y={300} />
      <DrinkItem kind="latte" at={DRINKS_AT} end={SLOT18 - 0.1} x={200} y={760} w={300} label="латте" kcal="~250 ккал" labelStyle={lbl} kcalStyle={kcl} />
      <DrinkItem kind="juice" at={DRINKS_AT + 0.35} end={SLOT18 - 0.1} x={540} y={760} w={300} label="сок 0,5 л" kcal="~220 ккал" labelStyle={lbl} kcalStyle={kcl} />
      <DrinkItem kind="colaCoral" at={DRINKS_AT + 0.7} end={SLOT18 - 0.1} x={880} y={760} w={300} label="кола 0,5 л" kcal="~210 ккал" labelStyle={lbl} kcalStyle={kcl} />
      {/* Слот клипа 18 (пока без голоса): +100 ккал × 365 дней ≈ 4,7 кг */}
      <FText text="Всего *+100_ккал*|в день" at={SLOT18} end={WIPE_3 + 0.3} y={330} size={84} />
      <StatCard
        at={SLOT18 + 0.3}
        end={WIPE_3 + 0.3}
        y={700}
        numSize={80}
        labelTop={false}
        cols={[
          { label: "ккал в день", prefix: "+", to: 100, countAt: C.s1, countDur: 0.6 },
          { label: "дней", to: 365, countAt: C.s2, countDur: 0.6 },
          { label: "кг за год", prefix: "≈", to: 4.7, decimals: 1, countAt: C.s3, countDur: 0.8, color: F.coral },
        ]}
      />

      {/* ── 4. СОН ── «Причина №2 — сон. Меньше 6 часов — и гормоны голода ломаются…» */}
      <Eyebrow text="Причина №2" at={w("19", 0)} end={clipEnd("19") + 0.1} y={200} />
      <FText text="Сон" at={w("19", 2)} times={ws("19", 2)} end={clipEnd("19") + 0.1} y={260} size={120} />
      <PopIn at={w("19", 2)} end={clipEnd("19") + 0.1} style={{ left: 0, right: 0, top: 450, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, background: F.white, borderRadius: 40, padding: "22px 40px", boxShadow: "0 18px 40px rgba(30,80,90,0.10)" }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", background: F.tealPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="moon" size={56} color={F.tealDark} />
          </div>
          <div style={{ ...font(900, 64, F.ink), opacity: prog(frame, s2f(w("19", 3)), 8) }}>
            &lt; 6 <span style={{ ...font(700, 44, F.sub) }}>часов</span>
          </div>
        </div>
      </PopIn>
      <FText text="и гормоны голода *ломаются*" at={w("19", 6)} times={range("19", 6, 9)} end={clipEnd("19") + 0.1} y={650} size={50} weight={800} color={F.ink} />
      <Meter at={w("19", 10)} end={clipEnd("19") + 0.1} y={800} title="Грелин" hint="есть хочется сильнее" from={35} to={92} moveAt={w("19", 14)} up />
      <Meter at={w("19", 17)} end={clipEnd("19") + 0.1} y={1020} title="Лептин" hint="сытость не приходит" from={80} to={22} moveAt={w("19", 19)} up={false} />

      {/* «И ты съедаешь +385 ккал в день, даже не замечая» — персонаж незаметно полнеет */}
      <FText text="И ты съедаешь" at={w("20", 0)} times={range("20", 0, 2)} end={w("20", 10) - 0.08} y={220} size={84} />
      <FText text="даже *не_замечая*" at={w("20", 10)} times={ws("20", 10, 11)} end={WIPE_4 + 0.3} y={220} size={84} />
      <GrowingFigure at={w("20", 0)} end={WIPE_4 + 0.3} y={400} h={720} />
      <StatCard
        at={w("20", 3) - 0.1}
        end={WIPE_4 + 0.3}
        y={1170}
        numSize={100}
        cols={[{ label: "незаметно, каждый день", prefix: "+", to: 385, suffix: " ккал", countAt: C.k385.at, countDur: C.k385.dur, color: F.coral }]}
      />

      {/* ── 5. ДВИЖЕНИЕ ── «Причина №3 — самое недооценённое. Не зал, а обычное движение. Шаги, лестница, уборка.» */}
      <Eyebrow text="Причина №3" at={w("21", 0)} end={w("21", 4) - 0.08} y={230} />
      <FText text="Самое|*недооценённое*" at={w("21", 2)} times={ws("21", 2, 3)} end={w("21", 4) - 0.08} y={300} size={96} />
      <FText text="Не зал —|а обычное *движение*" at={w("21", 4)} times={range("21", 4, 8)} end={w("21", 12) - 0.08} y={240} size={84} />
      <PopIn at={w("21", 4)} end={w("21", 9) - 0.1} style={{ left: 360, top: 690 }}>
        <Dumbbell />
      </PopIn>
      <Stamp at={w("21", 5)} end={w("21", 9) - 0.1} x={540} y={780} ok={false} size={150} />
      <Chip at={w("21", 9)} end={w("21", 12) - 0.08} x={270} y={620} w={540} icon="steps" label="Шаги" />
      <Chip at={w("21", 10)} end={w("21", 12) - 0.08} x={270} y={770} w={540} icon="stairs" label="Лестница" />
      <Chip at={w("21", 11)} end={w("21", 12) - 0.08} x={270} y={920} w={540} icon="broom" label="Уборка" />
      {/* «5 тысяч шагов или 10 — у разных людей разница до 2 тысяч ккал в день» */}
      <Eyebrow text="Шагов в день" at={w("21", 12)} end={WIPE_5 + 0.3} y={250} />
      <StatCard
        at={w("21", 12)}
        end={WIPE_5 + 0.3}
        y={330}
        numSize={96}
        labelTop={false}
        cols={[
          { label: "один человек", to: 5000, countAt: C.steps5.at, countDur: C.steps5.dur, color: F.greyFig },
          { label: "другой", from: 5000, to: 10000, countAt: C.steps10.at, countDur: C.steps10.dur },
        ]}
      />
      <FText text="у разных людей разница" at={w("21", 17)} times={range("21", 17, 20)} end={WIPE_5 + 0.3} y={690} size={52} weight={700} color={F.sub} />
      <FText text="до *2_000_ккал*|в день" at={w("21", 21)} times={ws("21", 21, 22, 25, 26)} end={WIPE_5 + 0.3} y={790} size={110} />
      <Chip at={w("21", 24)} end={WIPE_5 + 0.3} x={190} y={1110} w={700} icon="check" label="Levine et al., Science, 1999" />

      {/* ── 6. ДО → ПОСЛЕ ── «Лишний вес — это не одна ошибка. Это три маленькие привычки, которые складываются.» */}
      <FText text="Лишний вес —|не одна ошибка" at={w("22", 0)} times={ws("22", 0, 1, 4, 5, 6)} end={w("22", 7) - 0.08} y={180} size={84} />
      <FText text="3 маленькие привычки,|которые *складываются*" at={w("22", 8)} times={ws("22", 8, 9, 10, 11, 12)} end={WIPE_6 + 0.3} y={180} size={64} />
      <Transform at={w("22", 0)} scanAt={w("22", 3)} splitAt={w("22", 7)} end={WIPE_6 + 0.3} y={400} h={700} />
      <Pill at={w("22", 7) + 0.3} end={WIPE_6 + 0.3} x={310} y={1120} text="ДО" />
      <Pill at={w("22", 7) + 0.45} end={WIPE_6 + 0.3} x={770} y={1120} text="ПОСЛЕ" filled />
      <Chip at={w("22", 9)} end={WIPE_6 + 0.3} x={50} y={1230} w={310} icon="cup" label="Напитки" />
      <Chip at={w("22", 10)} end={WIPE_6 + 0.3} x={385} y={1230} w={310} icon="moon" label="Сон" />
      <Chip at={w("22", 12)} end={WIPE_6 + 0.3} x={720} y={1230} w={310} icon="steps" label="Шаги" />

      {/* ── 7. ОФФЕР ── «Хочешь чек-лист из 10 простых замен? Пиши слово "вес" в комментариях и я скину тебе в директ.» */}
      <Eyebrow text="Чек-лист" at={w("23", 0)} end={duration + 1} y={300} />
      <FText text="10 простых|замен" at={w("23", 4)} times={ws("23", 4, 5, 6)} end={duration + 1} y={370} size={110} />
      <FText text="минус 100 ккал в день — без диет" at={w("23", 6) + 0.2} end={duration + 1} gap={0.05} y={640} size={40} weight={500} color={F.sub} greyIn={false} />
      <StatCard
        at={C.offer}
        end={duration + 1}
        y={740}
        numSize={84}
        labelTop={false}
        cols={[
          { label: "замен", to: 10, countAt: C.offer, countDur: 0.7 },
          { label: "ккал в день", prefix: "−", to: 100, countAt: C.offer, countDur: 0.7 },
          { label: "диет", to: 0, text: "0" },
        ]}
      />
      <CtaButton at={w("23", 7)} end={duration + 1} y={1080} title="Пиши «ВЕС»" sub="в комментариях — скину в директ" />
      <PopIn at={w("23", 12)} end={duration + 1} style={{ left: 0, right: 0, top: 1330, textAlign: "center" }}>
        <div style={{ ...font(600, 34, F.sub) }}>{NICK_FLAT}</div>
      </PopIn>


      {/* шторки поверх всех сцен */}
      <Wipe at={WIPE_1} />
      <Wipe at={WIPE_2} />
      <Wipe at={WIPE_3} />
      <Wipe at={WIPE_4} />
      <Wipe at={WIPE_5} />
      <Wipe at={WIPE_6} />

      <Audio src={staticFile("music/sit_back.mp3")} trimBefore={s2f(MUSIC_START)} volume={musicVolume} />
      <Audio src={staticFile("vo/lishniy-ves-flat.wav")} volume={1} />
      <SfxTrack cues={cues} />
    </AbsoluteFill>
  );
};

export const LishniyVesFlat: React.FC = () => {
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
