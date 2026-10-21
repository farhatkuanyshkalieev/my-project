// Кухня: olive wall, cobalt tile backsplash, pink fridge. Day (ch.3) and night (ch.5).
import React from 'react';
import {rand} from '../lib/anim';
import {P} from '../lib/design';

export const KitchenSet: React.FC<{frame: number; night?: boolean}> = ({frame, night}) => (
  <g>
    <defs>
      <linearGradient id={`k-wall-${night ? 'n' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={night ? '#4C4A33' : '#CFC862'} />
        <stop offset="1" stopColor={night ? '#5C5A3C' : '#B9B24A'} />
      </linearGradient>
      <linearGradient id={`k-sky-${night ? 'n' : 'd'}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={night ? '#0E1030' : '#BFD3F7'} />
        <stop offset="1" stopColor={night ? '#2A2D60' : '#F3E3EE'} />
      </linearGradient>
      <pattern id="k-tile" width="70" height="70" patternUnits="userSpaceOnUse">
        <rect width="70" height="70" fill="#F2F4FC" />
        <path d="M35,8 L44,26 L62,35 L44,44 L35,62 L26,44 L8,35 L26,26 Z" fill="#4E5FD8" opacity="0.85" />
        <circle cx="35" cy="35" r="6" fill="#F2F4FC" />
        <circle cx="0" cy="0" r="9" fill="#9AA6F2" />
        <circle cx="70" cy="0" r="9" fill="#9AA6F2" />
        <circle cx="0" cy="70" r="9" fill="#9AA6F2" />
        <circle cx="70" cy="70" r="9" fill="#9AA6F2" />
        <rect width="70" height="70" fill="none" stroke="#D6DBF2" strokeWidth="2" />
      </pattern>
      <radialGradient id="k-pend">
        <stop offset="0" stopColor="#FFE7B0" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#FFC06A" stopOpacity="0.25" />
        <stop offset="1" stopColor="#FFB060" stopOpacity="0" />
      </radialGradient>
      <filter id="k-b10" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="10" />
      </filter>
    </defs>
    <rect x={-600} y={-300} width={3200} height={1700} fill={`url(#k-wall-${night ? 'n' : 'd'})`} />
    {/* window */}
    <rect x={1330} y={140} width={460} height={420} fill="#F6F2EA" />
    <rect x={1350} y={160} width={420} height={380} fill={`url(#k-sky-${night ? 'n' : 'd'})`} />
    {night
      ? Array.from({length: 18}).map((_, i) => (
          <rect key={i} x={1360 + rand(i * 3) * 390} y={330 + rand(i * 7) * 190} width={10} height={14} fill="#FFD991" opacity={0.25 + 0.5 * rand(i * 5 + Math.floor(frame / 240))} />
        ))
      : [0, 1, 2].map((i) => <ellipse key={i} cx={1420 + i * 140} cy={240 + i * 30} rx={70} ry={18} fill="#fff" opacity={0.7} filter="url(#k-b10)" />)}
    {night && <circle cx={1680} cy={230} r={26} fill="#F4F0DA" opacity={0.9} />}
    <rect x={1552} y={160} width={16} height={380} fill="#F6F2EA" />
    <path d="M1300,120 C1360,300 1340,480 1320,600 L1290,600 L1290,120 Z" fill={P.pinkSoft} />
    <path d="M1820,120 C1760,300 1780,480 1800,600 L1830,600 L1830,120 Z" fill={P.pinkSoft} />
    {/* upper cabinets + shelf with cups */}
    <rect x={-200} y={110} width={1300} height={210} fill="#F3EBDD" />
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i}>
        <rect x={-180 + i * 258} y={126} width={238} height={178} rx={6} fill="#FBF5EA" stroke="#E2D6C2" strokeWidth={3} />
        <rect x={-180 + i * 258 + 104} y={270} width={30} height={8} rx={4} fill={P.gold} />
      </g>
    ))}
    {/* tile backsplash */}
    <rect x={-600} y={330} width={1880} height={300} fill="url(#k-tile)" />
    <rect x={1270} y={600} width={1400} height={40} fill="url(#k-tile)" />
    {/* hanging pendant */}
    <line x1={1000} y1={-200} x2={1000} y2={120} stroke="#2A2230" strokeWidth={4} />
    <path d="M940,120 L1060,120 L1100,190 L900,190 Z" fill={night ? '#E8D9B5' : P.pink} />
    {night && <circle cx={1000} cy={260} r={420} fill="url(#k-pend)" />}
    {/* pink fridge */}
    <g>
      <rect x={-220} y={300} width={300} height={900} rx={40} fill={night ? '#B98095' : '#F59CC0'} />
      <rect x={-220} y={300} width={300} height={900} rx={40} fill="url(#k-fridgeS)" />
      <rect x={40} y={420} width={14} height={180} rx={7} fill="#F6F2EA" />
      <rect x={-220} y={640} width={300} height={6} fill="#000" opacity={0.12} />
      <circle cx={-120} cy={380} r={20} fill={P.lime} />
      <rect x={-60} y={450} width={60} height={80} fill="#fff" transform="rotate(6 -30 490)" />
      <defs>
        <linearGradient id="k-fridgeS" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </g>
    {/* counter back run */}
    <rect x={-600} y={630} width={3200} height={30} fill="#F3EBDD" />
    <rect x={-600} y={660} width={3200} height={500} fill={night ? '#2F3566' : '#5868D8'} />
    {night && <rect x={-600} y={-300} width={3200} height={1700} fill="#0B0A20" opacity={0.45} />}
  </g>
);

// Foreground island counter (hides lower bodies)
export const Island: React.FC<{night?: boolean; y?: number}> = ({night, y = 760}) => (
  <g>
    <rect x={-600} y={y} width={3200} height={40} fill={night ? '#CFC7BA' : '#FBF4E8'} />
    <rect x={-600} y={y} width={3200} height={8} fill="#fff" opacity={0.6} />
    <rect x={-600} y={y + 40} width={3200} height={600} fill={night ? '#3A2F4A' : '#E4589A'} />
    {Array.from({length: 18}).map((_, i) => (
      <rect key={i} x={-600 + i * 190} y={y + 40} width={4} height={600} fill="#000" opacity={0.12} />
    ))}
  </g>
);

export const Mug: React.FC<{x: number; y: number; c?: string; s?: number}> = ({x, y, c = P.cobalt, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M60,20 C100,20 100,80 60,80" stroke={c} strokeWidth={14} fill="none" />
    <rect x={-50} y={0} width={110} height={120} rx={14} fill={c} />
    <rect x={-40} y={6} width={18} height={100} rx={9} fill="#fff" opacity={0.25} />
    <ellipse cx={5} cy={4} rx={54} ry={10} fill="#4A2A1A" />
  </g>
);
