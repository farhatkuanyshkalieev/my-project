import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import type { Shot } from "./Edit";
import { DISPLAY, ORANGE, WHITE, sec } from "./theme";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Media: React.FC<{ shot: Shot; style?: React.CSSProperties }> = ({ shot, style }) =>
  shot.media === "video" ? (
    <Video src={staticFile(shot.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
  ) : (
    <Img src={staticFile(shot.src)} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
  );

// Крупная надпись в стиле вставок референса (Comfortaa), с мягким свечением
const FxText: React.FC<{
  text: string;
  color: string;
  size: number;
  p: number;
  glow?: boolean;
  style?: React.CSSProperties;
}> = ({ text, color, size, p, glow = true, style }) => (
  <div
    style={{
      fontFamily: DISPLAY,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.05,
      color,
      WebkitTextStroke: `${Math.round(size / 30)}px ${color}`,
      opacity: p,
      scale: String(0.8 + 0.2 * p),
      whiteSpace: "nowrap",
      textAlign: "center",
      textShadow: glow
        ? `0 0 ${18 * p}px ${color}aa, 0 0 ${46 * p}px ${color}66, 0 6px 26px rgba(0,0,0,0.7)`
        : "0 6px 26px rgba(0,0,0,0.7)",
      ...style,
    }}
  >
    {text}
  </div>
);

// SVG-фильтры для разложения на каналы (RGB split)
const ChannelFilters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="chR">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
    </filter>
    <filter id="chGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
    </filter>
  </svg>
);

/* 1. «коран усмана»: вспышка + RGB split на входе, затемнённые края, свечение */
export const QuranFx: React.FC<{ shot: Shot; atText: number }> = ({ shot, atText }) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const split = interpolate(f, [0, 10], [26, 0], { ...clamp, easing: ease });
  const zoom = interpolate(f, [0, 8], [1.3, 1.08], { ...clamp, easing: ease }) * interpolate(f, [8, dur], [1, 1.06], clamp);
  const flash = interpolate(f, [0, 1, 6], [0, 0.9, 0], clamp);
  const t1 = sec(atText - shot.start);
  const p1 = interpolate(f, [t1 - 2, t1 + 4], [0, 1], { ...clamp, easing: ease });
  const p2 = interpolate(f, [t1 + 6, t1 + 12], [0, 1], { ...clamp, easing: ease });
  const shake = f < 10 ? (random(`q${f}`) - 0.5) * 16 * (1 - f / 10) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <ChannelFilters />
      <AbsoluteFill style={{ scale: String(zoom), translate: `${shake}px 0px` }}>
        <AbsoluteFill style={{ filter: "url(#chR)", translate: `${-split}px 0px` }}>
          <Media shot={shot} />
        </AbsoluteFill>
        <AbsoluteFill style={{ filter: "url(#chGB)", translate: `${split}px 0px`, mixBlendMode: "screen" }}>
          <Media shot={shot} />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* затемнение краёв + тёплый свет в центре */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 60% 42% at 50% 42%, rgba(255,150,40,0.10) 0%, transparent 55%), radial-gradient(ellipse 80% 65% at 50% 45%, transparent 35%, rgba(0,0,0,0.78) 100%)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", top: 520 }}>
        <FxText text="коран" color={ORANGE} size={110} p={p1} />
        <FxText text="усмана" color={WHITE} size={150} p={p2} style={{ marginTop: 6 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </AbsoluteFill>
  );
};

/* 2. «VII век»: старая плёнка — сепия, зерно, мерцание, царапины, дрожание кадра */
export const OldFilmFx: React.FC<{ shot: Shot; atText: number }> = ({ shot, atText }) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const flicker = 0.88 + random(`fl${f}`) * 0.17;
  const jx = (random(`jx${f}`) - 0.5) * 6;
  const jy = (random(`jy${f}`) - 0.5) * 6;
  const t1 = sec(atText - shot.start);
  const letters = "VII век".split("");
  const scratches = [0, 1, 2].map((i) => ({
    x: random(`sx${i}${Math.floor(f / 3)}`) * 1080,
    o: random(`so${i}${Math.floor(f / 3)}`) > 0.45 ? 0.5 : 0,
  }));
  return (
    <AbsoluteFill style={{ backgroundColor: "#120c05", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          translate: `${jx}px ${jy}px`,
          scale: String(interpolate(f, [0, dur], [1.12, 1.02], clamp)),
          filter: `sepia(0.9) contrast(1.2) brightness(${flicker})`,
        }}
      >
        <Media shot={shot} />
      </AbsoluteFill>
      {/* зерно */}
      <AbsoluteFill style={{ opacity: 0.32, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id={`grain${f}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f} />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain${f})`} />
        </svg>
      </AbsoluteFill>
      {scratches.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.x, top: 0, bottom: 0, width: 2, background: "rgba(255,240,210,0.8)", opacity: s.o }} />
      ))}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 45%, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", top: 560 }}>
        <div style={{ display: "flex" }}>
          {letters.map((ch, i) => {
            const at = t1 + i * 1.5;
            const p = interpolate(f, [at - 1, at + 2], [0, 1], clamp);
            return (
              <FxText key={i} text={ch === " " ? " " : ch} color={ORANGE} size={170} p={p} style={{ scale: "1", opacity: p * flicker }} />
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3. «1000 лет»: счётчик с размытием, сепия → цвет (из прошлого в настоящее), отъезд камеры */
export const CountFx: React.FC<{ shot: Shot; atText: number; to: number; top: string; bottom: string }> = ({
  shot,
  atText,
  to,
  top,
  bottom,
}) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const t1 = Math.max(0, sec(atText - shot.start));
  const cnt = interpolate(f, [t1, t1 + 16], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.6, 0.2, 1) });
  const speed = interpolate(f, [t1, t1 + 6, t1 + 16], [0, 1, 0], clamp);
  const sep = interpolate(f, [0, dur], [1, 0.1], clamp);
  const pTop = interpolate(f, [0, 6], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          scale: String(interpolate(f, [0, dur], [1.3, 1.02], { ...clamp, easing: ease })),
          filter: `sepia(${sep}) saturate(${1.3 - 0.3 * sep}) brightness(0.8)`,
        }}
      >
        <Media shot={shot} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 45% at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 80%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", top: 120 }}>
        <FxText text={top} color={WHITE} size={84} p={pTop} glow={false} />
        <FxText
          text={`${Math.round(cnt * to)}${cnt >= 1 && to === 3000 ? "+" : ""}`}
          color={ORANGE}
          size={200}
          p={interpolate(f, [t1 - 2, t1 + 2], [0, 1], clamp)}
          style={{ filter: `blur(${speed * 5}px)`, fontVariantNumeric: "tabular-nums" }}
        />
        <FxText text={bottom} color={WHITE} size={96} p={interpolate(f, [t1 + 12, t1 + 18], [0, 1], { ...clamp, easing: ease })} glow={false} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 4. «3000+ артефактов»: сетка 3×3 из экспонатов, плитки открываются по одной + счётчик */
export const GridFx: React.FC<{ shot: Shot; atText: number }> = ({ shot, atText }) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const order = [4, 0, 8, 2, 6, 1, 7, 3, 5];
  const t1 = Math.max(0, sec(atText - shot.start));
  const cnt = interpolate(f, [t1, t1 + 14], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.6, 0.2, 1) });
  const band = interpolate(f, [t1 - 2, t1 + 4], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(interpolate(f, [0, dur], [1.0, 1.08], clamp)) }}>
        <Media shot={shot} />
        {order.map((cell, k) => {
          const at = k * 1.2;
          const p = interpolate(f, [at, at + 4], [1, 0], { ...clamp, easing: ease });
          const cx = (cell % 3) * 360;
          const cy = Math.floor(cell / 3) * 640;
          return (
            <div key={cell} style={{ position: "absolute", left: cx, top: cy, width: 360, height: 640, background: "black", scale: String(p), opacity: p > 0.02 ? 1 : 0 }} />
          );
        })}
        {/* тонкая чёрная сетка между плитками */}
        {[360, 720].map((x) => (
          <div key={`v${x}`} style={{ position: "absolute", left: x - 3, top: 0, width: 6, height: 1920, background: "black" }} />
        ))}
        {[640, 1280].map((y) => (
          <div key={`h${y}`} style={{ position: "absolute", top: y - 3, left: 0, height: 6, width: 1080, background: "black" }} />
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.72)",
            padding: "30px 70px 36px",
            borderRadius: 48,
            opacity: band,
            scale: String(0.85 + 0.15 * band),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <FxText text={`${Math.round(cnt * 3000)}${cnt >= 1 ? "+" : ""}`} color={ORANGE} size={190} p={1} style={{ fontVariantNumeric: "tabular-nums" }} />
          <FxText text="артефактов" color={WHITE} size={90} p={interpolate(f, [t1 + 10, t1 + 16], [0, 1], clamp)} glow={false} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
