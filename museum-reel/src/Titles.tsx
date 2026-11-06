import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { GOLD, IVORY, SANS, SERIF, goldGradient, sec, softShadow } from "./theme";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Общая огибающая: появление + исчезновение
const useEnvelope = (len: number, inF = 10, outF = 8) => {
  const f = useCurrentFrame();
  const i = interpolate(f, [0, inF], [0, 1], { ...clamp, easing: ease });
  const o = interpolate(f, [len - outF, len], [1, 0], clamp);
  return { f, i, o, v: Math.min(i, o) };
};

const GoldText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      backgroundImage: goldGradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.6))",
      ...style,
    }}
  >
    {children}
  </span>
);

// Тонкая золотая линия, раскрывающаяся от центра
const Rule: React.FC<{ p: number; width?: number }> = ({ p, width = 360 }) => (
  <div
    style={{
      width: width * p,
      height: 2,
      background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      margin: "0 auto",
    }}
  />
);

/* ——— 1. «Коран Усмана» ——— */
const QuranTitle: React.FC<{ len: number }> = ({ len }) => {
  const { f, v } = useEnvelope(len, 14, 8);
  const spacing = interpolate(f, [0, 40], [28, 10], { ...clamp, easing: ease });
  const line = interpolate(f, [6, 26], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 430, opacity: v }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 10, color: IVORY, textShadow: softShadow, opacity: line }}>
        ОДНА ИЗ ДРЕВНЕЙШИХ РУКОПИСЕЙ
      </div>
      <div style={{ height: 18 }} />
      <Rule p={line} width={520} />
      <div style={{ height: 14 }} />
      <GoldText
        style={{
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: 118,
          letterSpacing: spacing,
          lineHeight: 1.05,
          textAlign: "center",
          display: "block",
          scale: String(interpolate(f, [0, 30], [1.08, 1], { ...clamp, easing: ease })),
        }}
      >
        КОРАН
        <br />
        УСМАНА
      </GoldText>
      <div style={{ height: 14 }} />
      <Rule p={line} width={520} />
    </AbsoluteFill>
  );
};

/* ——— 2. «VII век» ——— */
const CenturyBadge: React.FC<{ len: number }> = ({ len }) => {
  const { f, v } = useEnvelope(len, 10, 8);
  const ring = interpolate(f, [0, 24], [0, 1], { ...clamp, easing: ease });
  const R = 170;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 380, opacity: v }}>
      <div style={{ position: "relative", width: 420, height: 420 }}>
        <svg width={420} height={420} style={{ position: "absolute", inset: 0, rotate: `${-90 + f * 0.6}deg` }}>
          <circle cx={210} cy={210} r={R} fill="rgba(10,8,4,0.35)" stroke={GOLD} strokeWidth={3}
            strokeDasharray={C} strokeDashoffset={C * (1 - ring)} />
          <circle cx={210} cy={210} r={R - 16} fill="none" stroke={GOLD} strokeOpacity={0.45}
            strokeWidth={1.5} strokeDasharray="4 10" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <GoldText style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1, scale: String(0.85 + 0.15 * ring) }}>
            VII
          </GoldText>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, letterSpacing: 14, color: IVORY, textShadow: softShadow, marginTop: 6 }}>
            ВЕК
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ——— 3/4. Счётчики «1000+ лет», «3000+ артефактов» ——— */
const Counter: React.FC<{ len: number; to: number; label: string; top?: number }> = ({
  len,
  to,
  label,
  top = 430,
}) => {
  const { f, v } = useEnvelope(len, 8, 8);
  const n = Math.round(interpolate(f, [0, 26], [0, to], { ...clamp, easing: Easing.bezier(0.2, 0.7, 0.2, 1) }));
  const plus = interpolate(f, [24, 32], [0, 1], { ...clamp, easing: ease });
  const line = interpolate(f, [10, 30], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: "center", top, opacity: v }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <GoldText style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 190, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {n}
        </GoldText>
        <GoldText style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 120, opacity: plus, scale: String(0.6 + 0.4 * plus), marginLeft: 6 }}>
          +
        </GoldText>
      </div>
      <Rule p={line} width={480} />
      <div style={{ height: 16 }} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, letterSpacing: 12, color: IVORY, textShadow: softShadow, opacity: line }}>
        {label}
      </div>
    </AbsoluteFill>
  );
};

/* ——— 5. Медицина / Математика / Астрономия ——— */
const BigWord: React.FC<{ len: number; word: string; index: number }> = ({ len, word, index }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 7], [0, 1], { ...clamp, easing: ease });
  const o = interpolate(f, [len - 3, len], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: Math.min(p, o) }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: 10, color: IVORY, textShadow: softShadow, marginBottom: 14 }}>
        {`0${index}`}
      </div>
      <GoldText
        style={{
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: 98,
          letterSpacing: 2,
          scale: String(1.25 - 0.25 * p),
          translate: `0px ${(1 - p) * 30}px`,
        }}
      >
        {word}
      </GoldText>
    </AbsoluteFill>
  );
};

/* ——— 6. «2026» ——— */
const YearReveal: React.FC<{ len: number }> = ({ len }) => {
  const { f, v } = useEnvelope(len, 6, 8);
  const digits = "2026".split("");
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 470, opacity: v }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, letterSpacing: 12, color: IVORY, textShadow: softShadow }}>
        ОТКРЫЛСЯ В
      </div>
      <div style={{ display: "flex", overflow: "hidden", height: 250, marginTop: 4 }}>
        {digits.map((d, i) => {
          const p = interpolate(f, [i * 3, i * 3 + 12], [0, 1], { ...clamp, easing: ease });
          return (
            <GoldText key={i} style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 240, lineHeight: 1.04, translate: `0px ${(1 - p) * 240}px`, display: "inline-block" }}>
              {d}
            </GoldText>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ——— 7. Рекорд Гиннесса ——— */
const RecordBadge: React.FC<{ len: number }> = ({ len }) => {
  const { f, v } = useEnvelope(len, 12, 10);
  const p = interpolate(f, [0, 18], [0, 1], { ...clamp, easing: ease });
  const shine = interpolate(f, [12, 40], [-120, 220], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 420, opacity: v }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "34px 54px 30px",
          borderRadius: 28,
          border: `2.5px solid ${GOLD}`,
          background: "rgba(14,10,4,0.55)",
          backdropFilter: "blur(6px)",
          textAlign: "center",
          scale: String(0.85 + 0.15 * p),
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: 9, color: IVORY }}>
          КНИГА РЕКОРДОВ
        </div>
        <GoldText style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 96, lineHeight: 1.1, display: "block" }}>
          ГИННЕССА
        </GoldText>
        <div style={{ height: 10 }} />
        <Rule p={p} width={420} />
        <div style={{ height: 12 }} />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: 9, color: IVORY }}>
          № 1 В МИРЕ
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${shine}%`,
            width: "35%",
            background: "linear-gradient(100deg, transparent, rgba(255,240,200,0.28), transparent)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ——— 8. Геометка «Ташкент» ——— */
const LocationPin: React.FC<{ len: number }> = ({ len }) => {
  const { f, v } = useEnvelope(len, 10, 10);
  const drop = interpolate(f, [0, 14], [-90, 0], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  const text = interpolate(f, [8, 22], [0, 1], { ...clamp, easing: ease });
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 520, opacity: v }}>
      <div style={{ position: "relative", width: 120, height: 150 }}>
        <div
          style={{
            position: "absolute",
            left: 60 - 50 * (0.4 + pulse),
            top: 132 - 14 * (0.4 + pulse),
            width: 100 * (0.4 + pulse),
            height: 28 * (0.4 + pulse),
            borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            opacity: 1 - pulse,
          }}
        />
        <svg width={120} height={140} viewBox="0 0 24 28" style={{ translate: `0px ${drop}px`, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))" }}>
          <defs>
            <linearGradient id="pin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFE7A8" />
              <stop offset="1" stopColor="#C9963A" />
            </linearGradient>
          </defs>
          <path d="M12 1C6.5 1 2.5 5.1 2.5 10.3 2.5 17.2 12 27 12 27s9.5-9.8 9.5-16.7C21.5 5.1 17.5 1 12 1z" fill="url(#pin)" />
          <circle cx={12} cy={10.3} r={3.6} fill="#2a1d08" />
        </svg>
      </div>
      <div style={{ opacity: text, translate: `0px ${(1 - text) * 20}px`, textAlign: "center" }}>
        <GoldText style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 110, lineHeight: 1.05, display: "block" }}>
          Ташкент
        </GoldText>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, letterSpacing: 10, color: IVORY, textShadow: softShadow, marginTop: 8 }}>
          УЗБЕКИСТАН
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Мягкое затемнение под титром, чтобы золото читалось на любом фоне
const Scrim: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, len - 8, len], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background:
          "radial-gradient(ellipse 75% 22% at 50% 33%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)",
      }}
    />
  );
};

const T: React.FC<{ from: number; to: number; name: string; children: (len: number) => React.ReactNode }> = ({
  from,
  to,
  name,
  children,
}) => {
  const len = sec(to) - sec(from);
  return (
    <Sequence name={name} from={sec(from)} durationInFrames={len}>
      <Scrim len={len} />
      {children(len)}
    </Sequence>
  );
};

export const Titles: React.FC = () => (
  <AbsoluteFill>
    <T name="Коран Усмана" from={7.0} to={8.8}>{(l) => <QuranTitle len={l} />}</T>
    <T name="VII век" from={10.4} to={11.8}>{(l) => <CenturyBadge len={l} />}</T>
    <T name="1000+ лет" from={13.9} to={16.9}>{(l) => <Counter len={l} to={1000} label="ЛЕТ ИСТОРИИ" />}</T>
    <T name="3000+ артефактов" from={22.3} to={24.5}>{(l) => <Counter len={l} to={3000} label="АРТЕФАКТОВ" />}</T>
    <T name="Медицина" from={36.2} to={37.0}>{(l) => <BigWord len={l} word="МЕДИЦИНА" index={1} />}</T>
    <T name="Математика" from={37.0} to={37.6}>{(l) => <BigWord len={l} word="МАТЕМАТИКА" index={2} />}</T>
    <T name="Астрономия" from={37.6} to={39.0}>{(l) => <BigWord len={l} word="АСТРОНОМИЯ" index={3} />}</T>
    <T name="2026" from={42.1} to={43.3}>{(l) => <YearReveal len={l} />}</T>
    <T name="Рекорд Гиннесса" from={44.3} to={47.95}>{(l) => <RecordBadge len={l} />}</T>
    <T name="Ташкент" from={49.4} to={51.5}>{(l) => <LocationPin len={l} />}</T>
  </AbsoluteFill>
);
