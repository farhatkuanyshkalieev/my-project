import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { getLength } from "@remotion/paths";
import { inOut, prog, s2f } from "../lib/anim";
import { C } from "../lib/theme";

/** Светлый радиальный фон с виньеткой */
export const LightBg: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 85% 62% at 50% 46%, ${C.bgCenter} 0%, ${C.bgMid} 58%, ${C.bgEdge} 100%)`,
    }}
  />
);

/** Тёмная сцена: графитовый радиальный фон + тонкие белые кривые, которые медленно плывут */
export const DarkBg: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 40) * 30;
  const lines = [
    `M -80 ${420 + d} C 300 ${200 + d}, 640 ${900 - d}, 1180 ${640 + d}`,
    `M 120 -60 C ${260 + d} 600, ${980 - d} 900, 820 2000`,
    `M -60 ${1500 - d} C 400 ${1250 + d}, 700 ${1800 - d}, 1160 ${1350 + d}`,
    `M 1160 ${200 + d} C 800 500, ${300 + d} 1300, -40 1700`,
  ];
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 85% 62% at 50% 46%, ${C.darkCenter} 0%, ${C.darkMid} 60%, ${C.darkEdge} 100%)`,
      }}
    >
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {lines.map((p, i) => (
          <path key={i} d={p} stroke="rgba(255,255,255,0.18)" strokeWidth={2.2} fill="none" />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Переход «клякса»: огромное размытое пятно растекается из центра и заливает кадр.
 * После `at + dur` под ним уже должен быть фон следующей сцены.
 */
export const Blob: React.FC<{ at: number; dur?: number; color: string; x?: number; y?: number }> = ({
  at,
  dur = 0.5,
  color,
  x = 540,
  y = 900,
}) => {
  const frame = useCurrentFrame();
  const f0 = s2f(at);
  const f1 = f0 + s2f(dur);
  if (frame < f0 || frame > f1 + 2) return null;
  const p = prog(frame, f0, f1 - f0, inOut);
  const size = 2600 * p + 40;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          filter: `blur(${interpolate(p, [0, 1], [30, 90])}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Бордовые дуги через весь кадр (trim path), как в референсе */
const ARC_PATHS = [
  "M -60 300 C 300 520, 700 760, 1150 870",
  "M -40 1390 C 320 1010, 700 560, 1130 150",
  "M -80 1640 C 340 1590, 720 1700, 900 2000",
];

const ARC_LEN = ARC_PATHS.map((d) => getLength(d));
const DRAW = 30; // кадров на прорисовку одной дуги (~1 с)
const STAGGER = 6;
const EXIT = 20;
const smooth = Easing.bezier(0.45, 0, 0.15, 1); // мягкий разгон и долгое торможение

/**
 * Бордовые дуги через весь кадр, как в референсе.
 * Вход: линия плавно «рисуется» с ease-in-out и проявляется из лёгкого блюра.
 * Выход: линия стягивается к концу и растворяется — без резких обрезов.
 */
export const Arcs: React.FC<{ at: number; end: number; color?: string; variant?: 0 | 1 }> = ({
  at,
  end,
  color = C.wine,
  variant = 0,
}) => {
  const frame = useCurrentFrame();
  const f0 = s2f(at) - 4; // стартуем чуть раньше акцента, чтобы к нему линия уже «летела»
  const f1 = s2f(end);
  if (frame < f0 || frame > f1 + EXIT + STAGGER * 2) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, scale: variant ? "-1 1" : undefined }}>
      {ARC_PATHS.map((d, i) => {
        const len = ARC_LEN[i];
        const draw = prog(frame, f0 + i * STAGGER, DRAW, smooth);
        const retract = prog(frame, f1 + i * (STAGGER / 2), EXIT, smooth);
        const fadeIn = prog(frame, f0 + i * STAGGER, 10);
        const visibleLen = len * draw;
        const cut = len * retract; // сколько «съедено» с начала линии
        const drift = (frame - f0) * 0.18;
        return (
          <path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`0 ${cut} ${Math.max(0, visibleLen - cut)} ${len * 2}`}
            style={{
              translate: `0 ${drift}px`,
              opacity: fadeIn * (1 - retract * 0.6),
              filter: `blur(${(1 - fadeIn) * 4 + retract * 3}px)`,
            }}
          />
        );
      })}
    </svg>
  );
};
