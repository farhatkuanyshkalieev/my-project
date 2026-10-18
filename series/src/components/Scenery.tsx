import React from 'react';
import {C} from '../lib/theme';
import {rand} from '../lib/anim';

const Pine: React.FC<{x: number; y: number; h: number; fill: string}> = ({x, y, h, fill}) => {
  const w = h * 0.42;
  const tiers = 5;
  return (
    <g>
      <rect x={x - h * 0.025} y={y - h * 0.12} width={h * 0.05} height={h * 0.14} fill={fill} />
      {Array.from({length: tiers}).map((_, i) => {
        const ty = y - h * 0.1 - (i * h * 0.85) / tiers;
        const tw = w * (1 - i / (tiers + 1));
        return <polygon key={i} points={`${x - tw / 2},${ty} ${x + tw / 2},${ty} ${x},${ty - h * 0.32}`} fill={fill} />;
      })}
    </g>
  );
};

/** Night forest, 1080x1920. `light` (0..1) floods the scene with headlights from the right. */
export const Forest: React.FC<{t: number; light?: number; children?: React.ReactNode}> = ({t, light = 0, children}) => (
  <g>
    <defs>
      <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#05070f" />
        <stop offset="0.55" stopColor="#0c1a24" />
        <stop offset="1" stopColor="#0a1411" />
      </linearGradient>
      <radialGradient id="fmoon">
        <stop offset="0" stopColor="#dfe9ff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#dfe9ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="beam" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#fff6d0" stopOpacity="0.85" />
        <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x={-300} y={-300} width={1680} height={2520} fill="url(#fsky)" />
    <circle cx={260} cy={360} r={260} fill="url(#fmoon)" />
    <circle cx={260} cy={360} r={56} fill="#e9efff" />
    {/* three depth layers of pines */}
    {[
      {n: 9, base: 1130, h: 640, fill: '#0f2028', seed: 1},
      {n: 8, base: 1240, h: 820, fill: '#0a161b', seed: 2},
      {n: 6, base: 1380, h: 1100, fill: '#060d10', seed: 3},
    ].map((L) =>
      Array.from({length: L.n}).map((_, i) => (
        <Pine
          key={`${L.seed}-${i}`}
          x={-120 + (i + rand(i + L.seed * 7) * 0.6) * (1320 / L.n)}
          y={L.base + rand(i + L.seed) * 40}
          h={L.h * (0.8 + rand(i * 3 + L.seed) * 0.4)}
          fill={L.fill}
        />
      ))
    )}
    {/* fog */}
    <rect x={-300} y={1060} width={1680} height={260} fill="#9fb7c9" opacity={0.07 + 0.02 * Math.sin(t)} />
    <rect x={-300} y={1300} width={1680} height={700} fill="#0b1310" />
    <path d="M -300 1310 Q 540 1260 1380 1320 L 1380 1360 L -300 1360 Z" fill="#14201b" />
    {/* headlights */}
    {light > 0 && (
      <g opacity={light} style={{mixBlendMode: 'screen'}}>
        <polygon points="1180,1160 -300,820 -300,1700" fill="url(#beam)" />
        <polygon points="1180,1220 -300,1200 -300,2000" fill="url(#beam)" opacity={0.7} />
        <rect x={-300} y={-300} width={1680} height={2520} fill="#fff4cc" opacity={0.12} />
      </g>
    )}
    {children}
    {/* fireflies of dust in the light */}
    {Array.from({length: 26}).map((_, i) => (
      <circle
        key={i}
        cx={(rand(i) * 1200 + t * 12) % 1200 - 60}
        cy={900 + rand(i + 4) * 700 + Math.sin(t + i) * 12}
        r={1.5 + rand(i + 9) * 2.5}
        fill="#fff6d0"
        opacity={(0.1 + 0.4 * rand(i + 2)) * (0.3 + light)}
      />
    ))}
  </g>
);

/** Back yard of the motel at sunrise, 1080x1920. */
export const DawnYard: React.FC<{t: number; children?: React.ReactNode}> = ({t, children}) => (
  <g>
    <defs>
      <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a1b4a" />
        <stop offset="0.35" stopColor="#8a3a6e" />
        <stop offset="0.6" stopColor="#f08a5d" />
        <stop offset="0.75" stopColor="#ffd08a" />
      </linearGradient>
      <pattern id="brick" width="120" height="60" patternUnits="userSpaceOnUse">
        <rect width="120" height="60" fill="#3a2430" />
        <path d="M 0 30 L 120 30 M 60 0 L 60 30 M 0 30 L 0 60 M 120 30 L 120 60" stroke="#2a1820" strokeWidth="5" />
      </pattern>
    </defs>
    <rect x={-300} y={-300} width={1680} height={1400} fill="url(#dawn)" />
    <circle cx={760} cy={1010} r={120} fill="#ffe3a0" opacity={0.9} />
    <circle cx={760} cy={1010} r={220} fill="#ffe3a0" opacity={0.2} />
    {/* far rooftops */}
    <path d="M -300 1060 L 120 1060 L 120 990 L 300 990 L 300 1040 L 560 1040 L 560 960 L 680 960 L 680 1060 L 1380 1060 L 1380 1120 L -300 1120 Z" fill="#3b2240" opacity={0.85} />
    {/* motel back wall */}
    <rect x={-300} y={1080} width={1680} height={900} fill="url(#brick)" />
    <rect x={-300} y={1080} width={1680} height={900} fill="#ff9a6a" opacity={0.08 + 0.02 * Math.sin(t * 0.5)} />
    <rect x={120} y={1180} width={190} height={330} fill="#1b1016" stroke="#120a0e" strokeWidth={8} />
    <rect x={140} y={1200} width={150} height={120} fill="#ffcf8a" opacity={0.25} />
    <text x={215} y={1170} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={700} fontSize={26} fill="#d8c2b0">
      СЛУЖЕБНЫЙ
    </text>
    {/* dumpster */}
    <g transform="translate(830 1460)">
      <path d="M -170 -140 L 170 -140 L 150 40 L -150 40 Z" fill="#2f5a46" stroke={C.ink} strokeWidth={8} />
      <path d="M -180 -150 L 180 -150 L 170 -180 L -170 -180 Z" fill="#244636" stroke={C.ink} strokeWidth={6} />
      <rect x={-60} y={-100} width={120} height={40} rx={6} fill="#1c3a2c" />
    </g>
    <rect x={-300} y={1500} width={1680} height={500} fill="#2a2228" />
    <ellipse cx={420} cy={1620} rx={200} ry={26} fill="#f6a07a" opacity={0.25} />
    {children}
  </g>
);
