import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { blurOut, prog, s2f } from "../lib/anim";
import { C, FONT, textStyle } from "../lib/theme";

/**
 * Иллюстрации напитков в стилистике ролика: мягкий «продуктовый» свет, стеклянные блики,
 * бордовые акценты из палитры. Все размеры в координатах viewBox 300×480.
 */

const Glass: React.FC<{ id: string; children: React.ReactNode; top?: number }> = ({ id, children, top = 70 }) => (
  <>
    <defs>
      <clipPath id={`${id}-in`}>
        <path d={`M 62 ${top} L 238 ${top} L 222 440 Q 221 452 208 452 L 92 452 Q 79 452 78 440 Z`} />
      </clipPath>
      <linearGradient id={`${id}-glass`} x1="0" x2="1">
        <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
        <stop offset="0.18" stopColor="rgba(255,255,255,0.05)" />
        <stop offset="0.8" stopColor="rgba(255,255,255,0.02)" />
        <stop offset="1" stopColor="rgba(255,255,255,0.4)" />
      </linearGradient>
    </defs>
    <g clipPath={`url(#${id}-in)`}>{children}</g>
    {/* стекло */}
    <path
      d={`M 58 ${top - 6} L 242 ${top - 6} L 225 442 Q 223 458 207 458 L 93 458 Q 77 458 75 442 Z`}
      fill={`url(#${id}-glass)`}
      stroke="rgba(30,28,31,0.16)"
      strokeWidth={2.5}
    />
    <ellipse cx={150} cy={top - 6} rx={92} ry={9} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
    <path d={`M 80 ${top + 20} L 92 430`} stroke="rgba(255,255,255,0.75)" strokeWidth={9} strokeLinecap="round" />
    <path d={`M 104 ${top + 30} L 110 300`} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" />
  </>
);

export const Latte: React.FC = () => (
  <svg viewBox="0 0 300 480" width="100%" height="100%">
    <defs>
      <linearGradient id="lt-coffee" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#C89B72" />
        <stop offset="0.45" stopColor="#9C6B45" />
        <stop offset="1" stopColor="#6E4529" />
      </linearGradient>
      <linearGradient id="lt-milk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E9D7C2" />
        <stop offset="1" stopColor="#F6EEE4" />
      </linearGradient>
      <linearGradient id="lt-straw" x1="0" x2="1">
        <stop offset="0" stopColor="#B3485E" />
        <stop offset="1" stopColor={C.wine} />
      </linearGradient>
    </defs>
    {/* трубочка за стеклом */}
    <rect x={176} y={6} width={18} height={300} rx={9} fill="url(#lt-straw)" transform="rotate(12 185 150)" />
    <Glass id="lt" top={86}>
      <rect x={0} y={80} width={300} height={400} fill="url(#lt-milk)" />
      <path d="M 0 210 Q 75 196 150 212 T 300 206 L 300 340 Q 225 356 150 340 T 0 344 Z" fill="url(#lt-coffee)" />
      <path d="M 0 330 Q 75 346 150 336 T 300 338 L 300 360 Q 225 372 150 360 T 0 364 Z" fill="rgba(110,69,41,0.35)" />
      <rect x={0} y={80} width={300} height={70} fill="#FBF7F1" />
      <path d="M 0 150 Q 60 166 150 154 T 300 156 L 300 214 Q 225 198 150 212 T 0 210 Z" fill="#E7D2BB" />
      {/* карамельный сироп */}
      <path
        d="M 96 150 C 104 200, 88 240, 108 300 M 196 152 C 186 210, 208 250, 188 320 M 146 156 C 152 196, 140 230, 150 270"
        stroke="rgba(176,104,52,0.75)"
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
    </Glass>
    {/* пенная шапка */}
    <path d="M 62 82 Q 70 50 110 58 Q 130 34 160 50 Q 195 36 214 60 Q 244 58 238 84 Z" fill="#FFFDF9" />
    <path d="M 98 64 Q 140 46 190 60" stroke="rgba(176,104,52,0.8)" strokeWidth={6} fill="none" strokeLinecap="round" />
  </svg>
);

export const Juice: React.FC = () => (
  <svg viewBox="0 0 300 480" width="100%" height="100%">
    <defs>
      <linearGradient id="jc-juice" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFC35A" />
        <stop offset="0.5" stopColor="#F79A2A" />
        <stop offset="1" stopColor="#E3761A" />
      </linearGradient>
      <radialGradient id="jc-slice" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFD27A" />
        <stop offset="0.82" stopColor="#F7A12E" />
        <stop offset="0.88" stopColor="#FFF4DC" />
        <stop offset="1" stopColor="#F08A1C" />
      </radialGradient>
    </defs>
    <rect x={92} y={0} width={16} height={260} rx={8} fill="#F3EFE9" stroke="rgba(30,28,31,0.12)" strokeWidth={2} transform="rotate(-14 100 130)" />
    <rect x={95} y={20} width={10} height={240} rx={5} fill={C.wine} opacity={0.75} transform="rotate(-14 100 130)" />
    <Glass id="jc" top={96}>
      <rect x={0} y={128} width={300} height={360} fill="url(#jc-juice)" />
      <path d="M 0 128 Q 75 120 150 130 T 300 126 L 300 146 Q 225 152 150 144 T 0 148 Z" fill="rgba(255,236,190,0.7)" />
      {[
        [120, 240, 6],
        [170, 300, 4],
        [140, 370, 5],
        [190, 220, 3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="rgba(255,240,200,0.6)" />
      ))}
    </Glass>
    {/* долька апельсина на краю */}
    <g transform="translate(214 92) rotate(18)">
      <circle r={50} fill="url(#jc-slice)" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1={0}
          y1={0}
          x2={Math.cos((i * Math.PI) / 4) * 40}
          y2={Math.sin((i * Math.PI) / 4) * 40}
          stroke="#FFF1D2"
          strokeWidth={3}
        />
      ))}
      <rect x={-6} y={-2} width={12} height={60} fill="#E9E5DF" />
    </g>
  </svg>
);

export const ColaCan: React.FC = () => (
  <svg viewBox="0 0 300 480" width="100%" height="100%">
    <defs>
      <linearGradient id="cc-body" x1="0" x2="1">
        <stop offset="0" stopColor="#4E1220" />
        <stop offset="0.16" stopColor="#8E2A40" />
        <stop offset="0.32" stopColor="#C2586E" />
        <stop offset="0.42" stopColor="#9E3349" />
        <stop offset="0.78" stopColor="#7A1F2E" />
        <stop offset="1" stopColor="#3E0D18" />
      </linearGradient>
      <linearGradient id="cc-metal" x1="0" x2="1">
        <stop offset="0" stopColor="#8D8A90" />
        <stop offset="0.3" stopColor="#F2F0F4" />
        <stop offset="0.55" stopColor="#B9B6BC" />
        <stop offset="1" stopColor="#6F6C72" />
      </linearGradient>
    </defs>
    {/* верх */}
    <path d="M 84 52 Q 84 38 100 36 L 200 36 Q 216 38 216 52 L 230 86 L 70 86 Z" fill="url(#cc-metal)" />
    <ellipse cx={150} cy={38} rx={50} ry={9} fill="#D9D7DC" stroke="#9E9BA2" strokeWidth={2} />
    <rect x={132} y={30} width={36} height={12} rx={6} fill="#A9A6AD" />
    {/* корпус */}
    <path d="M 70 86 L 230 86 L 232 400 L 70 400 Z" fill="url(#cc-body)" />
    {/* низ */}
    <path d="M 70 400 L 232 400 L 218 438 Q 214 450 200 452 L 102 452 Q 88 450 84 438 Z" fill="url(#cc-metal)" />
    {/* волна и надпись */}
    <path d="M 70 250 Q 120 214 160 248 T 232 236 L 232 262 Q 196 280 160 266 T 70 276 Z" fill="rgba(255,255,255,0.9)" />
    <text
      x={150}
      y={196}
      textAnchor="middle"
      fontFamily={`'${FONT}', sans-serif`}
      fontWeight={800}
      fontSize={62}
      letterSpacing={-3}
      fill="white"
    >
      кола
    </text>
    <text x={150} y={330} textAnchor="middle" fontFamily={`'${FONT}', sans-serif`} fontWeight={600} fontSize={22} fill="rgba(255,255,255,0.7)">
      0,5 л
    </text>
    {/* блики */}
    <rect x={112} y={92} width={14} height={300} rx={7} fill="rgba(255,255,255,0.28)" />
    <rect x={96} y={92} width={5} height={300} rx={2.5} fill="rgba(255,255,255,0.2)" />
    {/* капли */}
    {[
      [180, 140, 5],
      [196, 300, 4],
      [92, 330, 3.5],
      [210, 190, 3],
      [150, 360, 4],
    ].map(([x, y, r], i) => (
      <g key={i}>
        <ellipse cx={x} cy={y} rx={r * 0.8} ry={r} fill="rgba(255,255,255,0.35)" />
        <ellipse cx={x - r * 0.25} cy={y - r * 0.3} rx={r * 0.25} ry={r * 0.35} fill="rgba(255,255,255,0.8)" />
      </g>
    ))}
  </svg>
);

const ART = { latte: Latte, juice: Juice, cola: ColaCan };

/** Напиток: выпрыгивает с поворотом, мягко «плавает», под ним тень и подпись калорий */
export const DrinkItem: React.FC<{
  kind: keyof typeof ART;
  at: number;
  end: number;
  x: number;
  y: number;
  kcal: string;
  label: string;
  w?: number;
}> = ({ kind, at, end, x, y, kcal, label, w = 270 }) => {
  const frame = useCurrentFrame();
  const f0 = s2f(at);
  if (frame < f0 - 1 || frame > s2f(end) + 8) return null;
  const p = prog(frame, f0, 16, Easing.bezier(0.2, 1.35, 0.4, 1));
  const o = blurOut(frame, s2f(end), 8);
  const cap = prog(frame, f0 + 8, 10);
  const float = Math.sin((frame - f0) / 14 + x) * 8;
  const Art = ART[kind];
  const h = w * 1.6;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        opacity: o.opacity * Math.min(1, p * 2),
        filter: `blur(${o.blur + (1 - Math.min(1, p)) * 14}px)`,
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          translate: `0 ${interpolate(p, [0, 1], [120, 0]) + float}px`,
          rotate: `${interpolate(p, [0, 1], [-14, 0]) + Math.sin((frame - f0) / 20 + x) * 1.5}deg`,
          scale: String(interpolate(p, [0, 1], [0.6, 1])),
          filter: "drop-shadow(0 26px 24px rgba(40,30,36,0.18))",
        }}
      >
        <Art />
      </div>
      {/* тень на «полу» */}
      <div
        style={{
          margin: "-6px auto 0",
          width: w * 0.62,
          height: 26,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(30,28,31,0.22), rgba(30,28,31,0))",
          scale: String(1 - float / 120),
          opacity: Math.min(1, p),
        }}
      />
      <div
        style={{
          ...textStyle,
          textAlign: "center",
          marginTop: 18,
          opacity: cap,
          filter: `blur(${(1 - cap) * 10}px)`,
        }}
      >
        <div style={{ fontSize: 40, color: C.ink }}>{label}</div>
        <div style={{ fontSize: 46, color: C.wineText, marginTop: 4 }}>{kcal}</div>
      </div>
    </div>
  );
};
