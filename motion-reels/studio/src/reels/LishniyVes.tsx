import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { s2f } from "../lib/anim";
import { C, fontsLoaded } from "../lib/theme";
import { Phrase } from "../components/Phrase";
import { Arcs, Blob, DarkBg, LightBg } from "../components/Graphics";
import { Chocolate, Counter, Folder, Notification, Phone, ResearchCard, StepRing, Tree } from "../components/Widgets";
import { Cue, SfxTrack } from "../components/Sfx";

/**
 * Рилс №1 — «Лишний вес». Сценарий: motion-reels/reels/01-lishniy-ves/SCENARIO.md
 * Все тайминги — в секундах. Музыка: «Amnesia» с 22.41 с, чтобы бит вступил ровно на «стоит» (1.65 с).
 */
export const NICK = "@nickname"; // TODO: ник автора
export const DURATION_S = 58.3;

const MUSIC_START = 22.41;
const DARK_FROM = 36.0; // клякса закрыла кадр
const DARK_TO = 46.9; // светлая клякса закрыла кадр

const cues: Cue[] = [
  // 1. хук
  [0.15, "whoosh_fast"],
  [1.2, "glitch"],
  [1.65, "boom"],
  [1.7, "whoosh_line"],
  [2.05, "notify"],
  [3.4, "soft_wipe"],
  // 2. цифра
  [6.65, "boom"],
  [6.65, "tick", 0.12],
  ...[0, 1, 2, 3, 4, 5, 6].map((i): Cue => [7.9 + i * 0.1, "pop", 0.28]),
  [12.4, "swoosh"],
  // 3. напитки
  [13.15, "whoosh_line"],
  [16.7, "bass_hit"],
  [17.5, "pop"],
  [17.85, "pop"],
  [18.2, "pop"],
  [22.0, "rise"],
  [23.05, "boom"],
  // 4. сон
  [24.6, "whoosh_line"],
  [27.86, "glitch"],
  [28.7, "whoosh_line"],
  [29.1, "pop", 0.35],
  [29.3, "pop", 0.35],
  [32.6, "boom"],
  [32.8, "object"],
  // 5. движение (тёмная сцена)
  [35.75, "deep_whoosh"],
  [36.0, "boom"],
  [36.75, "whoosh_line", 0.3],
  ...Array.from({ length: 14 }, (_, i): Cue => [41.3 + i * 0.1, "tick"]),
  [42.6, "pop"],
  [44.67, "boom"],
  [45.0, "object"],
  [46.65, "deep_whoosh", 0.6],
  // 6. вывод
  [50.5, "pop"],
  [50.7, "pop"],
  [50.85, "boom"],
  [50.9, "pop"],
  // 7. призыв
  [52.5, "notify", 0.7],
  [52.75, "swoosh"],
  [55.2, "whoosh_fast"],
  [55.6, "bass_hit", 0.4],
];

const musicVolume = (f: number) => {
  // глитч-обрыв в хуке
  if (f >= s2f(1.2) && f < s2f(1.27)) return 0;
  // сброс перед призывом: тишина + дзынь, потом тихая подложка
  const duck = interpolate(f, [s2f(52.4), s2f(52.5), s2f(53.3), s2f(53.8)], [1, 0, 0, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return 0.62 * duck;
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const dark = frame >= s2f(DARK_FROM) && frame < s2f(DARK_TO);
  return (
    <AbsoluteFill>
      {dark ? <DarkBg /> : <LightBg />}

      {/* ── 1. ХУК ── */}
      <Phrase text="ты ешь меньше" at={0.15} end={1.2} gap={0.28} />
      <Phrase text="а вес *стоит*" at={1.25} times={[1.25, 1.45, 1.65]} end={2.75} size={92} />
      <Arcs at={1.65} end={4.0} />
      <Notification at={2.0} end={3.7} title="мама" body="опять на диете? 😅" avatar="👩" />
      <Phrase text="разбор за ~1 минуту~" times={[2.85, 3.1, 3.4]} at={2.85} end={4.1} />

      {/* ── 2. ЦИФРА + ИНТРИГА ── */}
      <Phrase text="1 кг жира" at={4.25} gap={0.3} end={5.15} size={92} />
      <Phrase text="это примерно" at={5.25} end={7.5} y={650} />
      <Counter at={5.75} countDur={0.9} end={7.5} to={7700} unit="ккал" y={900} />
      <Chocolate at={7.9} end={9.25} y={560} />
      <Phrase text="это 14 плиток шоколада" at={7.65} end={9.25} y={1000} />
      <Phrase text="но никто не съедает|их за раз" at={9.35} gap={0.25} end={11.0} />
      <Phrase text="так откуда|берётся *вес?*" at={11.1} end={12.4} size={86} />

      {/* ── 3. ПРИЧИНА №1: НАПИТКИ ── */}
      <Phrase text="причина №1 ~напитки~" at={12.55} times={[12.55, 12.8, 13.15]} end={14.2} />
      <Arcs at={13.15} end={14.4} variant={1} />
      <Phrase text="мозг не считает|их едой" at={14.3} end={15.75} />
      <Phrase text="сытости *нет*|калории *есть*" at={15.85} times={[15.85, 16.1, 16.45, 16.7]} end={17.4} />
      <Folder at={17.5} end={19.9} x={200} y={840} label="латте" caption="~250" captionAccent="ккал" />
      <Folder at={17.85} end={19.9} x={540} y={840} label="сок" caption="~220" captionAccent="ккал" />
      <Folder at={18.2} end={19.9} x={880} y={840} label="кола" caption="~210" captionAccent="ккал" />
      <Phrase text="всего *+100 ккал* в день" at={20.0} end={21.5} />
      <Phrase text="× 365 дней" at={21.6} end={23.9} y={650} />
      <Counter at={22.15} countDur={0.9} end={23.9} to={4.7} decimals={1} prefix="≈ " unit="кг" y={900} color={C.wineText} />
      <Phrase text="за год" at={23.15} end={23.9} y={1110} />

      {/* ── 4. ПРИЧИНА №2: СОН ── */}
      <Phrase text="причина №2 ~сон~" at={24.05} times={[24.05, 24.3, 24.6]} end={25.6} />
      <Arcs at={24.6} end={25.8} />
      <Phrase text="меньше 6 часов сна" at={25.7} end={26.95} />
      <Phrase text="и гормоны голода|*ломаются*" at={27.05} end={28.4} />
      <Tree at={28.5} end={31.3} y={640} title="недосып" left={["грелин ↑", "больше голода"]} right={["лептин ↓", "меньше сытости"]} />
      <Phrase text="и ты съедаешь" at={31.4} end={34.3} y={650} />
      <Counter at={31.9} countDur={0.7} end={34.3} to={385} prefix="+" unit="ккал" y={880} color={C.wineText} />
      <ResearchCard at={32.8} end={34.3} y={1040} title="Al Khatib et al., 2017" sub="мета-анализ · Eur J Clin Nutr" />
      <Phrase text="даже не замечая" at={34.4} end={35.45} />

      {/* ── 5. ПРИЧИНА №3: ДВИЖЕНИЕ (тёмная сцена) ── */}
      <Blob at={35.5} dur={0.5} color={C.darkMid} />
      <Phrase text="причина №3|~самая недооценённая~" at={36.15} times={[36.15, 36.4, 36.75]} end={37.9} dark scriptSize={96} />
      <Phrase text="не зал" at={38.0} end={38.65} dark size={92} />
      <Phrase text="а обычное *движение*" at={38.75} end={39.8} dark />
      <Phrase text="шаги, лестница, уборка" at={39.9} end={41.0} dark />
      <StepRing at={41.1} fillDur={1.4} end={43.1} y={520} />
      <Phrase text="у разных людей|разница" at={43.2} end={44.3} dark />
      <Phrase text="до *2 000 ккал*|в день" at={44.4} end={46.4} dark size={86} y={820} />
      <ResearchCard at={45.0} end={46.4} y={1040} title="Levine et al., 1999" sub="Science · бытовая активность" dark />
      <Blob at={46.4} dur={0.5} color={C.bgCenter} />

      {/* ── 6. ВЫВОД ── */}
      <Phrase text="лишний вес" at={47.0} end={47.85} size={92} />
      <Phrase text="это не одна ошибка" at={47.95} end={49.1} />
      <Phrase text="это 3 маленькие|привычки" at={49.2} end={50.4} />
      <Phrase text="которые ~складываются~" at={50.5} times={[50.5, 50.85]} end={52.4} y={620} />
      <Folder at={50.5} end={52.4} x={200} y={1010} label="напитки" w={250} />
      <Folder at={50.7} end={52.4} x={540} y={1010} label="сон" w={250} />
      <Folder at={50.9} end={52.4} x={880} y={1010} label="шаги" w={250} />
      <Arcs at={50.85} end={52.4} variant={1} />

      {/* ── 7. ПРИЗЫВ + ОБРЫВ ── */}
      <Phone
        at={52.6}
        end={55.2}
        y={130}
        nick={NICK}
        items={["латте без сиропа", "вода вместо колы", "сон 7+ часов", "+3 000 шагов в день", "лестница вместо лифта"]}
      />
      <Phrase text="хочешь чек-лист|из 10 простых замен?" at={52.75} end={55.2} y={1450} size={68} />
      <Phrase text="пиши слово *«вес»*|в комментариях" at={55.35} end={56.95} size={84} />
      <Phrase text="и я скину тебе в дире" at={57.05} gap={0.22} end={99} exit="none" />

      <Audio src={staticFile("music/amnesia.mp3")} trimBefore={s2f(MUSIC_START)} volume={musicVolume} />
      <SfxTrack cues={cues} />
    </AbsoluteFill>
  );
};

export const LishniyVes: React.FC = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    fontsLoaded.then(() => continueRender(handle)).catch((e) => {
      console.error(e);
      continueRender(handle);
    });
  }, [handle]);
  return <Scene />;
};
