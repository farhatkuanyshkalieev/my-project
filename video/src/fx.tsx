import React from 'react';
import { AbsoluteFill, interpolate, random } from 'remotion';
import { smooth } from './thermal';

export const W = 1920;
export const H = 1080;
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const FONT = 'Figtree, sans-serif';
export const LIGHT_BG = 'radial-gradient(ellipse at 50% 45%, #eeedf0 0%, #e0dfe3 50%, #b4b3b9 100%)';

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- Фон / оверлеи ----------

export const Grain: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 0.16 }) => (
  <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity, pointerEvents: 'none' }}>
    <svg width="100%" height="100%">
      <filter id="grainf">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 24} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grainf)" />
    </svg>
  </AbsoluteFill>
);

export const Vignette: React.FC<{ strength?: number; inner?: number }> = ({ strength = 0.4, inner = 45 }) => (
  <AbsoluteFill
    style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) ${inner}%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none' }}
  />
);

// Глобальные SVG-фильтры (направленный motion blur)
export const FilterDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      {[6, 14, 30, 60].map((s) => (
        <filter key={s} id={`hblur${s}`} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation={`${s} 0`} />
        </filter>
      ))}
    </defs>
  </svg>
);

// ---------- Текст ----------

export const Cursor: React.FC<{ f: number; type: 'block' | 'bar'; size: number; color: string; blink?: boolean }> = ({
  f,
  type,
  size,
  color,
  blink = true,
}) => (
  <span
    style={{
      display: 'inline-block',
      width: type === 'block' ? size * 0.42 : size * 0.07,
      height: size * 0.82,
      marginLeft: size * (type === 'block' ? 0.35 : 0.55),
      background: color,
      verticalAlign: 'middle',
      transform: `translateY(-${size * 0.05}px)`,
      opacity: !blink || Math.floor(f / 7) % 2 === 0 ? 1 : 0,
    }}
  />
);

export const Label: React.FC<{
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  weight?: number;
  anchor?: 'left' | 'center' | 'right';
  blur?: number;
  opacity?: number;
  cursor?: React.ReactNode;
  spacing?: number;
  rotate?: number;
}> = ({ text, x, y, size, color, weight = 700, anchor = 'left', blur = 0, opacity = 1, cursor, spacing = -0.035, rotate = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(${anchor === 'left' ? 0 : anchor === 'center' ? -50 : -100}%, -50%) rotate(${rotate}deg)`,
      fontFamily: FONT,
      fontWeight: weight,
      fontSize: size,
      color,
      letterSpacing: size * spacing,
      whiteSpace: 'pre',
      filter: blur ? `blur(${blur}px)` : undefined,
      opacity,
      lineHeight: 1,
    }}
  >
    {text}
    {cursor}
  </div>
);

// ---------- Штрихи от руки ----------

// Путь, который «рисуется»: p 0..1, затем fade
export const Stroke: React.FC<{
  d: string;
  p: number;
  color?: string;
  width?: number;
  opacity?: number;
  blur?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  tail?: number; // стирание хвоста 0..1
}> = ({ d, p, color = '#111', width = 4, opacity = 1, blur = 0, x = 0, y = 0, scale = 1, rotate = 0, tail = 0 }) => {
  if (p <= 0 || opacity <= 0) return null;
  const len = Math.max(0, Math.min(1, p) - tail);
  return (
    <svg
      width={W}
      height={H}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: blur ? `blur(${blur}px)` : undefined, opacity }}
    >
      <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width / scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${len} 2`}
          strokeDashoffset={-tail}
        />
      </g>
    </svg>
  );
};

export const SCRIBBLES = {
  // подпись «Cmmf»
  sig: 'M 40 70 C 10 40, 40 0, 70 20 M 70 20 C 40 30, 0 110, 30 120 C 60 128, 80 80, 100 70 L 110 92 L 130 64 L 140 92 L 160 66 C 170 60, 168 90, 180 84 L 196 30 L 186 130 M 176 76 C 200 60, 220 70, 240 56 L 232 96',
  loop: 'M 0 10 C 80 40, 210 40, 250 120 C 290 210, 220 260, 160 210 C 120 175, 90 150, 40 190 M 40 190 C 20 200, 0 190, 10 180',
  zig: 'M 50 0 L 0 140 L 30 100 L 14 170',
  under: 'M 0 26 C 8 6, 18 30, 24 14 L 300 6 L 330 10',
  arcTop: 'M 0 60 C 60 0, 160 -10, 220 40',
  smallLoop: 'M 0 30 C 10 0, 50 0, 40 30 C 30 50, 0 40, 10 20',
  arrow: 'M 0 0 C 40 20, 100 40, 170 70 M 0 0 L 18 -8 M 0 0 L 8 18',
  sCurve: 'M 0 0 C 60 -40, 120 20, 80 80 C 40 140, 120 180, 180 140',
  jHook: 'M 0 0 C 80 -30, 160 10, 150 70 C 140 120, 90 110, 100 80',
  squig: 'M 0 40 C 20 0, 40 80, 60 40 C 80 0, 100 80, 120 40 C 140 0, 150 60, 170 30',
};

// Неровная петля вокруг точки (красные каракули финала)
export const loopPath = (cx: number, cy: number, rx: number, ry: number, seed: string, turns = 1.3, jitter = 0.35, rot = 0) => {
  const pts: [number, number][] = [];
  const n = 24;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i <= n * turns; i++) {
    const a = (i / n) * Math.PI * 2 + random(seed) * 6;
    const j = 1 + (random(`${seed}-${i}`) - 0.5) * jitter;
    const ex = Math.cos(a) * rx * j, ey = Math.sin(a) * ry * j;
    pts.push([cx + ex * cr - ey * sr, cy + ex * sr + ey * cr]);
  }
  return smooth(pts, false);
};

// ---------- Чернильная клякса со смазанным шлейфом ----------

export const InkBlob: React.FC<{
  path: (t: number) => [number, number];
  t: number; // 0..1 прогресс по пути
  size: number;
  trail?: number;
  opacity?: number;
}> = ({ path, t, size, trail = 0.18, opacity = 1 }) => {
  if (t < 0 || t > 1.05) return null;
  const n = 10;
  const pts = Array.from({ length: n }, (_, i) => path(Math.max(0, t - (i / n) * trail)));
  const d = smooth(pts.map((p) => [p[0], p[1]]) as [number, number][], false);
  const [x, y] = pts[0];
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity }}>
      <defs>
        <filter id="inkf" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={size * 0.35} />
        </filter>
      </defs>
      <path d={d} fill="none" stroke="#1a1a1e" strokeWidth={size * 0.9} strokeLinecap="round" opacity={0.35} style={{ filter: 'blur(8px)' }} />
      <path d={d} fill="none" stroke="#1a1a1e" strokeWidth={size * 0.45} strokeLinecap="round" opacity={0.55} style={{ filter: 'blur(3px)' }} />
      <circle cx={x} cy={y} r={size / 2} fill="#121214" filter="url(#inkf)" />
    </svg>
  );
};

// Оранжевый взрыв-«удар» с лучами
export const Explosion: React.FC<{ age: number; x: number; y: number; size: number }> = ({ age, x, y, size }) => {
  if (age < 0 || age > 10) return null;
  const s = interpolate(age, [0, 2, 10], [0.4, 1, 1.2], clamp);
  const o = interpolate(age, [0, 1, 7, 10], [0, 1, 0.8, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, transform: `scale(${s})`, opacity: o }}>
      <div style={{ position: 'absolute', inset: '15%', borderRadius: '50%', background: 'radial-gradient(circle, #ffe08a 0%, #ffb02e 35%, rgba(255,140,20,0.6) 60%, rgba(255,120,0,0) 75%)', filter: 'blur(6px)' }} />
      <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = random(`ex${i}${x}`) * Math.PI * 2;
          const r0 = 22, r1 = 40 + random(`exl${i}${x}`) * 10;
          return (
            <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke="#ffb52e" strokeWidth={2.2} strokeLinecap="round" />
          );
        })}
      </svg>
    </div>
  );
};

// Четырёхлучевая звезда-вспышка с вогнутыми гранями
export const sparklePath = (R: number, k = 0.1) => {
  const r = R * k;
  return `M 0 ${-R} C ${r} ${-r}, ${r} ${-r}, ${R} 0 C ${r} ${r}, ${r} ${r}, 0 ${R} C ${-r} ${r}, ${-r} ${r}, ${-R} 0 C ${-r} ${-r}, ${-r} ${-r}, 0 ${-R} Z`;
};

export const Sparkle: React.FC<{
  x: number;
  y: number;
  R: number;
  color: string;
  glow?: string;
  rotate?: number;
  sx?: number;
  sy?: number;
  opacity?: number;
  k?: number;
}> = ({ x, y, R, color, glow, rotate = 0, sx = 1, sy = 1, opacity = 1, k = 0.1 }) => (
  <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity }}>
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${sx} ${sy})`}>
      {glow ? <path d={sparklePath(R * 1.05, k * 1.4)} fill={glow} style={{ filter: 'blur(22px)' }} /> : null}
      <path d={sparklePath(R, k)} fill={color} />
    </g>
  </svg>
);

// Ноты
export const Note: React.FC<{ x: number; y: number; size: number; scale: number; rotate?: number; beamed?: boolean }> = ({
  x,
  y,
  size,
  scale,
  rotate = 0,
  beamed,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, transform: `scale(${scale}) rotate(${rotate}deg)`, overflow: 'visible' }}
  >
    {beamed ? (
      <g fill="#e2231a">
        <ellipse cx={22} cy={82} rx={14} ry={10} transform="rotate(-20 22 82)" />
        <ellipse cx={74} cy={72} rx={14} ry={10} transform="rotate(-20 74 72)" />
        <rect x={32} y={18} width={6} height={64} />
        <rect x={84} y={8} width={6} height={64} />
        <polygon points="32,18 90,8 90,22 32,32" />
        <polygon points="32,36 90,26 90,36 32,46" />
      </g>
    ) : (
      <g fill="#e2231a">
        <ellipse cx={40} cy={82} rx={15} ry={11} transform="rotate(-20 40 82)" />
        <rect x={50} y={10} width={6} height={72} />
        <path d="M 56 10 C 70 24, 82 30, 74 56 C 76 36, 66 30, 56 28 Z" />
      </g>
    )}
  </svg>
);

// Красные «скоростные» линии
export const SpeedLines: React.FC<{ f: number; seed: string; count?: number; color?: string }> = ({ f, seed, count = 7, color = '#e2231a' }) => (
  <>
    {Array.from({ length: count }, (_, i) => {
      const y = 80 + random(`${seed}y${i}`) * 920;
      const len = 200 + random(`${seed}l${i}`) * 500;
      const sp = 90 + random(`${seed}s${i}`) * 80;
      const x = W + 200 - ((f * sp + random(`${seed}x${i}`) * 3000) % (W + 1400));
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: len, height: 3, background: color, opacity: 0.8, borderRadius: 2 }} />;
    })}
  </>
);
