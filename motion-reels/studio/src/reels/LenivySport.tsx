import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { countEase, countTicks, prog, s2f } from "../lib/anim";
import { C, FONT, fontsLoaded, textStyle } from "../lib/theme";
import { makeVo } from "../lib/vo";
import { Phrase } from "../components/Phrase";
import { Arcs, Blob, DarkBg, LightBg } from "../components/Graphics";
import { Counter, Folder, Notification, Phone, ResearchCard } from "../components/Widgets";
import { Cue, SfxTrack } from "../components/Sfx";
import PLAN from "./lenivy-sport.vo.json";
import WORDS from "./lenivy-sport.words.json";
import DUCK from "./lenivy-sport.duck.json";

/**
 * «Ленивый спорт» — ролик клиента, переделанный в стиле №1 (кинетическая типографика).
 * Голос взят из оригинала (отделён от музыки Demucs), тайминги — по расшифровке.
 * Слово i: w(i) — номер в lenivy-sport.words.json.
 */
const { w, ws, duration } = makeVo(PLAN, WORDS);
const v = (i: number) => w("lenivy", i);
export const LENIVY_DURATION_S = duration;
const HANDLE = "@center.alla.rezultat";

// Контраст «я / тоже я»: тёмная сцена
const BLOB_IN = v(6) - 0.25;
const DARK_FROM = BLOB_IN + 0.45;
const BLOB_OUT = v(14) - 0.4;
const DARK_TO = BLOB_OUT + 0.45;
// Бит Amnesia (24.06 с трека) падает на «я» в «тоже я»
const MUSIC_START = 24.06 - v(7);

const countSfx = (at: number, dur: number, n: number): Cue[] => {
  const ticks = countTicks(at, dur, n, countEase);
  const names = ["tick", "tick2", "tick3"] as const;
  return [
    [at, "compute", 0.18, dur + 0.15],
    ...ticks.map((t, i): Cue => [t, names[i % 3], 0.3 + 0.1 * (i / ticks.length)]),
    [at + dur, "done", 0.3],
  ];
};

const MUSCLE = { at: v(12), dur: v(13) + 0.55 - v(12) };

const cues: Cue[] = [
  // хук «я: собираюсь в зал третий месяц»
  [v(0), "whoosh_fast", 0.4],
  [v(4), "whoosh_line"],
  [v(4) + 0.35, "notify", 0.5],
  // «тоже я:» — глитч, клякса, бит
  [v(6) - 0.15, "glitch"],
  [BLOB_IN + 0.25, "deep_whoosh", 0.6],
  [v(7), "boom"],
  // «лежу 30 минут — а мышцы работают»
  [v(9), "pop", 0.35],
  ...countSfx(MUSCLE.at, MUSCLE.dur, 16),
  [MUSCLE.at + MUSCLE.dur, "bass_hit", 0.45],
  // «ленивый спорт»
  [BLOB_OUT + 0.25, "deep_whoosh", 0.5],
  [v(15), "boom"],
  [v(15) + 0.05, "whoosh_line"],
  // папки-преимущества
  [v(16), "pop"],
  [v(18), "pop"],
  [v(20), "pop"],
  [v(22), "pop"],
  // абонемент
  [v(24), "swoosh"],
  [v(26), "bass_hit", 0.4],
  [v(26) + 0.4, "object"],
  // директ
  [v(27) - 0.2, "swoosh"],
  [v(28), "click", 1],
  [v(28) + 0.1, "notify", 0.4],
];

const musicVolume = (f: number) => {
  const g0 = s2f(v(6) - 0.15);
  if (f >= g0 && f < g0 + 2) return 0; // глитч-обрыв перед «тоже я»
  const outro = interpolate(f, [s2f(duration) - 12, s2f(duration)], [1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vo = (DUCK as number[])[Math.min(f, DUCK.length - 1)] ?? 1;
  return 0.3 * outro * vo; // Amnesia: ≈ −20 LUFS в паузах, ≈ −30 под голосом
};

/** Экран директа: сообщение «ЛЕНЬ» печатается и отправляется */
const DirectScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.round(interpolate(frame, [s2f(v(28)) - 6, s2f(v(28)) + 4], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sent = prog(frame, s2f(v(28)) + 6, 9);
  return (
    <div style={{ padding: "96px 30px 0", fontFamily: `'${FONT}', sans-serif`, color: "white", height: "100%", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: `linear-gradient(135deg,#F2B8C6,${C.wine})` }} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{HANDLE}</div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)" }}>ленивый спорт · Алматы</div>
        </div>
      </div>
      <div style={{ marginTop: 40, maxWidth: 380, padding: "20px 24px", borderRadius: 28, background: "rgba(255,255,255,0.1)", fontSize: 27, lineHeight: 1.3 }}>
        абонемент на месяц: 30 минут за визит, 0 нагрузки ✨
      </div>
      {/* отправленное сообщение */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
        <div
          style={{
            padding: "20px 34px",
            borderRadius: 30,
            background: `linear-gradient(135deg, #B3485E, ${C.wine})`,
            ...textStyle,
            fontSize: 48,
            opacity: sent,
            scale: String(0.7 + 0.3 * sent),
            transformOrigin: "100% 100%",
          }}
        >
          ЛЕНЬ
        </div>
      </div>
      {/* поле ввода */}
      <div
        style={{
          position: "absolute",
          left: 26,
          right: 26,
          bottom: 60,
          height: 84,
          borderRadius: 42,
          border: "2px solid rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          padding: "0 30px",
          fontSize: 32,
          fontWeight: 600,
          color: sent > 0 ? "rgba(255,255,255,0.35)" : "white",
        }}
      >
        {sent > 0 ? "сообщение…" : "ЛЕНЬ".slice(0, typed) || "сообщение…"}
      </div>
    </div>
  );
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const dark = t >= DARK_FROM && t < DARK_TO;
  return (
    <AbsoluteFill>
      {dark ? <DarkBg /> : <LightBg />}

      {/* ── ХУК: «Я: собираюсь в зал третий месяц» ── */}
      <Phrase text="я:" at={v(0)} times={ws("lenivy", 0)} end={v(6) - 0.1} y={680} size={130} />
      <Phrase text="собираюсь в зал" at={v(1)} times={ws("lenivy", 1, 2, 3)} end={v(4) - 0.08} />
      <Phrase text="в *третий месяц*" at={2.26} times={[2.26, v(4), v(5)]} end={v(6) - 0.1} />
      <Arcs at={v(4)} end={v(6) - 0.1} />
      <Notification at={v(4) + 0.35} end={v(6) - 0.15} title="фитнес-клуб" body="мы скучаем 🥲 вас не было 90 дней" avatar="🏋️" />

      {/* ── «Тоже я:» — тёмная сцена ── */}
      <Blob at={BLOB_IN} dur={0.45} color={C.darkMid} />
      <Phrase text="тоже я:" at={v(6)} times={ws("lenivy", 6, 7)} end={v(8) - 0.08} dark size={120} />
      <Phrase text="лежу ~30 минут~" at={v(8)} times={ws("lenivy", 8, 9)} end={BLOB_OUT} dark y={560} scriptSize={110} />
      <Phrase text="а мышцы *работают*" at={v(11)} times={ws("lenivy", 11, 12, 13)} end={BLOB_OUT} dark y={760} />
      <Phrase text="мои усилия" at={v(11)} gap={0.1} end={BLOB_OUT} dark y={960} size={44} />
      <Counter at={v(11)} countDur={0.2} end={BLOB_OUT} to={0} unit="%" y={1060} size={130} color="#6E6A70" />
      <Phrase text="работа мышц" at={v(12)} gap={0.1} end={BLOB_OUT} dark y={1230} size={44} />
      <Counter at={MUSCLE.at} countDur={MUSCLE.dur} end={BLOB_OUT} to={100} unit="%" y={1340} size={170} color="#E07A8F" />
      <Blob at={BLOB_OUT} dur={0.45} color={C.bgCenter} />

      {/* ── «Ленивый спорт» ── */}
      <Phrase text="ленивый ~спорт~" at={v(14)} times={ws("lenivy", 14, 15)} end={v(16) - 0.1} size={120} scriptSize={170} />
      <Arcs at={v(15)} end={v(16) + 0.4} variant={1} />

      {/* ── 4 папки: «без нагрузки, тонус мышц, лимфодренаж и подтянутая кожа» ── */}
      <Phrase text="ленивый спорт" at={v(16) - 0.05} gap={0.05} end={v(24) - 0.1} y={300} size={60} />
      <Folder at={v(16)} end={v(24) - 0.1} x={300} y={650} label="нагрузка" caption="без" captionAccent="нагрузки" />
      <Folder at={v(18)} end={v(24) - 0.1} x={780} y={650} label="тонус" caption="тонус" captionAccent="мышц" />
      <Folder at={v(20)} end={v(24) - 0.1} x={300} y={1110} label="лимфо" caption="лимфо" captionAccent="дренаж" />
      <Folder at={v(22)} end={v(24) - 0.1} x={780} y={1110} label="кожа" caption="подтянутая" captionAccent="кожа" />

      {/* ── «Абонемент на месяц» ── */}
      <Phrase text="абонемент|на *месяц*" at={v(24)} times={ws("lenivy", 24, 25, 26)} end={v(27) - 0.25} y={640} size={104} />
      <ResearchCard at={v(26) + 0.3} end={v(27) - 0.25} y={900} label="ленивый спорт" title="30 минут · 0 нагрузки" sub="можно заморозить на неделю" />

      {/* ── «Напишите «ЛЕНЬ» в директ» ── */}
      <Phone at={v(27) - 0.25} end={duration + 1} y={110} nick={HANDLE} items={[]} screen={<DirectScreen />} />
      <Phrase text="напишите *«лень»*|в директ" at={v(27)} times={ws("lenivy", 27, 28, 29, 30)} end={duration + 1} y={1420} size={78} exit="none" />
      <Phrase text="Алматы · Аксай-1, 10/3 · аль-Фараби, 83" at={v(30) + 0.3} gap={0.04} end={duration + 1} y={1600} size={30} exit="none" />

      <Audio src={staticFile("music/amnesia.mp3")} trimBefore={s2f(MUSIC_START)} volume={musicVolume} />
      <Audio src={staticFile("vo/lenivy-sport.wav")} volume={1} />
      <SfxTrack cues={cues} />
    </AbsoluteFill>
  );
};

export const LenivySport: React.FC = () => {
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
