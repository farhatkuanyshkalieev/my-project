import React from 'react';
import {C} from '../lib/theme';
import {noise1, rand} from '../lib/anim';
import {Bundle, Duffel} from './Props';

/** Neon flicker multiplier in [0.55, 1]. */
export const neonFlicker = (t: number) => {
  const n = noise1(t * 9, 5);
  const drop = rand(Math.floor(t * 12)) > 0.94 ? 0.55 : 1;
  return Math.min(1, 0.86 + n * 0.14) * drop;
};

export const BAGS: [number, number, number][] = [
  [560, 1060, -4],
  [800, 1035, 5],
  [985, 1110, -3],
  [720, 1215, 2],
];

type Props = {
  t: number;
  /** stripes colour override (sirens) */
  stripe?: string;
  stripeOpacity?: number;
  lampOn?: number;
  children?: React.ReactNode;
};

/** Cheap motel room at night, 1080x1920 world. Children render on top (foreground). */
export const MotelRoom: React.FC<Props> = ({t, stripe = C.magenta, stripeOpacity = 1, lampOn = 1, children}) => {
  const fl = neonFlicker(t);
  return (
    <g>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c1533" />
          <stop offset="1" stopColor="#170b1e" />
        </linearGradient>
        <pattern id="stripes" width="54" height="54" patternUnits="userSpaceOnUse">
          <rect width="27" height="54" fill="#fff" opacity="0.03" />
        </pattern>
        <pattern id="floral" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect width="120" height="120" fill="#5b2a3a" />
          {[
            [30, 30],
            [90, 90],
          ].map(([x, y]) => (
            <g key={x}>
              <ellipse cx={x - 14} cy={y + 12} rx={12} ry={6} fill="#3f4a30" transform={`rotate(-30 ${x - 14} ${y + 12})`} />
              <ellipse cx={x + 14} cy={y + 12} rx={12} ry={6} fill="#3f4a30" transform={`rotate(30 ${x + 14} ${y + 12})`} />
              <circle cx={x} cy={y} r={15} fill="#8c3f55" />
              <circle cx={x - 7} cy={y - 4} r={8} fill="#a85a6a" />
              <circle cx={x + 2} cy={y + 2} r={4} fill="#d9a35f" />
            </g>
          ))}
          <circle cx={90} cy={28} r={3} fill="#d9a35f" opacity="0.6" />
          <circle cx={28} cy={92} r={3} fill="#d9a35f" opacity="0.6" />
        </pattern>
        <pattern id="carpet" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="#24111b" />
          <path d="M 40 4 L 76 40 L 40 76 L 4 40 Z" fill="none" stroke="#311824" strokeWidth="4" />
          <circle cx="40" cy="40" r="5" fill="#3a1c2a" />
        </pattern>
        <linearGradient id="win" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.magentaHot} />
          <stop offset="1" stopColor={C.magenta} />
        </linearGradient>
        <radialGradient id="lampGlow">
          <stop offset="0" stopColor={C.amber} stopOpacity="0.75" />
          <stop offset="0.4" stopColor={C.amber} stopOpacity="0.22" />
          <stop offset="1" stopColor={C.amber} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="winGlow">
          <stop offset="0" stopColor={C.magenta} stopOpacity="0.55" />
          <stop offset="1" stopColor={C.magenta} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
        <clipPath id="beam">
          <polygon points="610,220 1000,220 1180,1700 -200,1700" />
        </clipPath>
      </defs>

      {/* wall + floor */}
      <rect x={-400} y={-300} width={1880} height={1545} fill="url(#wall)" />
      <rect x={-400} y={-300} width={1880} height={1545} fill="url(#stripes)" />
      <rect x={-400} y={1236} width={1880} height={1200} fill="url(#carpet)" />
      <rect x={-400} y={1236} width={1880} height={1200} fill="url(#floorShade)" />
      <rect x={-400} y={1226} width={1880} height={20} fill="#10070d" />

      {/* window with blinds */}
      <ellipse cx={800} cy={470} rx={420} ry={420} fill="url(#winGlow)" opacity={fl} />
      <rect x={596} y={206} width={408} height={528} fill="#0d0610" rx={6} />
      <rect x={616} y={226} width={368} height={488} fill="url(#win)" opacity={0.6 + 0.4 * fl} />
      {Array.from({length: 13}).map((_, i) => (
        <g key={i}>
          <rect x={608} y={232 + i * 37} width={384} height={22} fill="#3d1239" />
          <rect x={608} y={232 + i * 37} width={384} height={3} fill={C.magentaHot} opacity={0.5 * fl} />
        </g>
      ))}
      <rect x={588} y={198} width={424} height={16} rx={6} fill="#1a0b18" />

      {/* door */}
      <g>
        <rect x={20} y={330} width={270} height={905} fill="#3a2026" stroke="#1a0b10" strokeWidth={8} />
        <rect x={56} y={380} width={198} height={330} rx={6} fill="none" stroke="#2a161b" strokeWidth={8} />
        <rect x={56} y={760} width={198} height={400} rx={6} fill="none" stroke="#2a161b" strokeWidth={8} />
        <circle cx={250} cy={790} r={14} fill="#b48a4a" />
        <rect x={130} y={430} width={52} height={64} rx={8} fill="#b48a4a" />
        <text x={156} y={479} textAnchor="middle" fontFamily="Unbounded" fontWeight={900} fontSize={40} fill="#3a2026">
          7
        </text>
      </g>

      {/* crooked picture */}
      <g transform="rotate(5 470 540)">
        <rect x={395} y={470} width={150} height={120} fill="#1e0f18" stroke="#6b4a2c" strokeWidth={8} />
        <path d="M 405 580 L 450 520 L 480 555 L 505 530 L 535 580 Z" fill="#3c2a3a" />
      </g>

      {/* nightstand + lamp */}
      <rect x={300} y={1060} width={150} height={220} fill="#2b1716" stroke="#140a0a" strokeWidth={6} />
      <rect x={315} y={1120} width={120} height={60} fill="none" stroke="#1c0e0d" strokeWidth={5} />
      <ellipse cx={375} cy={980} rx={430 * lampOn} ry={430 * lampOn} fill="url(#lampGlow)" />
      <rect x={366} y={990} width={18} height={72} fill="#1c1210" />
      <ellipse cx={375} cy={1062} rx={46} ry={10} fill="#1c1210" />
      <path d="M 315 900 L 435 900 L 460 995 L 290 995 Z" fill={lampOn ? '#ffd38a' : '#5a4630'} stroke="#3a2614" strokeWidth={5} />

      {/* bed */}
      <rect x={430} y={760} width={680} height={220} rx={24} fill="#3b1f1c" stroke="#1d0d0c" strokeWidth={8} />
      <path d="M 470 790 L 470 960 M 620 790 L 620 960 M 770 790 L 770 960 M 920 790 L 920 960" stroke="#2c1614" strokeWidth={8} />
      <path d="M 410 960 L 1120 960 L 1150 1330 L 330 1330 Z" fill="url(#floral)" stroke="#2a121a" strokeWidth={8} />
      <path d="M 330 1330 L 1150 1330 L 1150 1460 L 330 1460 Z" fill="url(#floral)" />
      <path d="M 330 1330 L 1150 1330 L 1150 1460 L 330 1460 Z" fill="#000" opacity={0.42} />
      <path d="M 330 1330 Q 360 1400 330 1460" stroke="#2a121a" strokeWidth={6} fill="none" />
      <rect x={470} y={905} width={220} height={78} rx={34} fill="#e6d6c6" stroke="#2a121a" strokeWidth={6} />
      <rect x={740} y={900} width={220} height={82} rx={34} fill="#e6d6c6" stroke="#2a121a" strokeWidth={6} />

      {/* scattered cash */}
      {[
        [470, 1210, -18],
        [900, 1250, 14],
        [610, 1290, 32],
        [1040, 1240, -8],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <Bundle w={74} />
        </g>
      ))}

      {/* duffels */}
      {BAGS.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(0.82)`}>
          <Duffel open={i !== 2} color={i % 2 ? '#202536' : '#272c3e'} />
        </g>
      ))}

      {/* blind stripes projected across the room */}
      <g clipPath="url(#beam)" style={{mixBlendMode: 'screen'}} opacity={0.24 * fl * stripeOpacity}>
        {Array.from({length: 19}).map((_, i) => {
          const y = 560 + i * 74;
          return <polygon key={i} points={`-200,${y + 260} 1200,${y - 300} 1200,${y - 268} -200,${y + 300}`} fill={stripe} />;
        })}
      </g>

      {/* dust in the light */}
      {Array.from({length: 42}).map((_, i) => {
        const x = (rand(i) * 1200 + t * (8 + rand(i + 5) * 14)) % 1200 - 60;
        const y = 300 + rand(i + 9) * 1300 + Math.sin(t * 0.8 + i) * 20;
        return <circle key={i} cx={x} cy={y} r={1.5 + rand(i + 3) * 3} fill="#ffc4e2" opacity={0.15 + 0.35 * rand(i + 11)} />;
      })}

      {children}
    </g>
  );
};
