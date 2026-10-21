// Мастерская Марка: cobalt walls, rainy window, canvases, string lights, lime sofa.
import React from 'react';
import {rand} from '../lib/anim';
import {P} from '../lib/design';

const f = (n: number) => n.toFixed(1);

// A bold abstract painting, deterministic per seed
export const Painting: React.FC<{x: number; y: number; w: number; h: number; seed: number; drain?: number}> = ({x, y, w, h, seed, drain = 0}) => {
  const cols = [P.pink, P.lime, P.autumn, P.cobalt, P.gold, '#7FD4C1', '#FF7AB6'];
  const strokes = Array.from({length: 9}).map((_, i) => {
    const sx = x + rand(seed + i) * w * 0.8;
    const sy = y + rand(seed + i * 2) * h * 0.85;
    const len = w * (0.25 + rand(seed + i * 3) * 0.5);
    const th = h * (0.06 + rand(seed + i * 4) * 0.12);
    const c = cols[Math.floor(rand(seed + i * 5) * cols.length)];
    return (
      <path
        key={i}
        d={`M${f(sx)},${f(sy)} q${f(len * 0.5)},${f(-th * 1.5)} ${f(len)},${f(th * 0.4)}`}
        stroke={c}
        strokeWidth={th}
        strokeLinecap="round"
        fill="none"
        opacity={0.92}
      />
    );
  });
  return (
    <g style={{filter: `saturate(${1 - drain})`}}>
      <rect x={x - 10} y={y - 10} width={w + 20} height={h + 20} fill="#2A1E1A" />
      <rect x={x} y={y} width={w} height={h} fill="#FBF3E6" />
      <clipPath id={`pt-${seed}`}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#pt-${seed})`}>
        <circle cx={x + w * 0.7} cy={y + h * 0.35} r={h * 0.28} fill={cols[seed % cols.length]} opacity={0.85} />
        {strokes}
      </g>
      <rect x={x} y={y} width={w} height={h} fill="#000" opacity={0.06} />
    </g>
  );
};

export const StudioSet: React.FC<{frame: number; drain?: number}> = ({frame, drain = 0}) => (
  <g>
    <defs>
      <linearGradient id="st-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3D4BB8" />
        <stop offset="1" stopColor="#5464D6" />
      </linearGradient>
      <linearGradient id="st-night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1B1D4A" />
        <stop offset="1" stopColor="#3B3F86" />
      </linearGradient>
      <radialGradient id="st-lamp">
        <stop offset="0" stopColor="#FFE2A8" stopOpacity="0.95" />
        <stop offset="0.4" stopColor="#FFB86B" stopOpacity="0.35" />
        <stop offset="1" stopColor="#FF9A5A" stopOpacity="0" />
      </radialGradient>
      <filter id="st-b8" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <pattern id="st-tile" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="#E9EEFB" />
        <path d="M30,6 C40,18 40,42 30,54 C20,42 20,18 30,6 Z M6,30 C18,20 42,20 54,30 C42,40 18,40 6,30 Z" fill="#4E5FD8" opacity="0.8" />
        <circle cx="30" cy="30" r="5" fill="#E9EEFB" />
        <rect width="60" height="60" fill="none" stroke="#C9D0EE" strokeWidth="2" />
      </pattern>
    </defs>
    <rect x={-600} y={-300} width={3200} height={1700} fill="url(#st-wall)" />
    {/* wainscot of blue-white tiles */}
    <rect x={-600} y={640} width={3200} height={500} fill="url(#st-tile)" />
    <rect x={-600} y={632} width={3200} height={14} fill="#F4F0FA" />
    {/* window with rain */}
    <g>
      <rect x={110} y={110} width={520} height={520} fill="#F4F0FA" />
      <rect x={130} y={130} width={480} height={480} fill="url(#st-night)" />
      {Array.from({length: 26}).map((_, i) => (
        <circle key={i} cx={150 + rand(i * 3) * 440} cy={360 + rand(i * 5) * 240} r={8 + rand(i) * 18} fill={i % 3 ? '#FFC873' : '#FF8AB8'} opacity={0.35 + 0.25 * Math.sin(frame / 30 + i)} filter="url(#st-b8)" />
      ))}
      {Array.from({length: 70}).map((_, i) => {
        const x = 130 + rand(i * 7.3) * 480;
        const sp = 9 + rand(i) * 8;
        const y = 130 + ((frame * sp + rand(i * 2.2) * 480) % 480);
        return <line key={i} x1={x} y1={y} x2={x - 3} y2={y + 22} stroke="#C9D6FF" strokeWidth={1.6} opacity={0.5} />;
      })}
      {Array.from({length: 22}).map((_, i) => {
        const x = 140 + rand(i * 11) * 460;
        const y = 140 + ((rand(i * 13) * 460 + frame * (0.3 + rand(i) * 0.5)) % 460);
        return <ellipse key={`d${i}`} cx={x} cy={y} rx={3.5} ry={5} fill="#E7EEFF" opacity={0.65} />;
      })}
      <rect x={364} y={130} width={12} height={480} fill="#F4F0FA" />
      <rect x={130} y={364} width={480} height={12} fill="#F4F0FA" />
    </g>
    {/* canvases */}
    <Painting x={760} y={150} w={250} h={320} seed={4} drain={drain} />
    <Painting x={1060} y={210} w={180} h={180} seed={9} drain={drain} />
    {/* easel with the exhibition painting */}
    <g>
      <path d="M1560,190 L1480,900 M1560,190 L1640,900 M1560,190 L1560,900" stroke="#6B4A33" strokeWidth={14} />
      <Painting x={1380} y={240} w={360} h={420} seed={21} drain={drain} />
      <rect x={1370} y={660} width={380} height={18} fill="#6B4A33" />
    </g>
    {/* floor lamp glow */}
    <circle cx={1840} cy={300} r={360} fill="url(#st-lamp)" />
    <path d="M1800,240 L1880,240 L1900,330 L1780,330 Z" fill="#F5D7A8" />
    <rect x={1836} y={330} width={8} height={700} fill="#2B2230" />
    {/* string lights */}
    <path d="M-100,70 Q480,150 1000,70 T2100,80" stroke="#2B2230" strokeWidth={3} fill="none" />
    {Array.from({length: 26}).map((_, i) => {
      const t = i / 25;
      const x = -100 + t * 2200;
      const y = 70 + Math.sin(t * Math.PI * 2) * 38 + 10;
      const tw = 0.6 + 0.4 * Math.sin(frame / 12 + i * 1.7);
      return (
        <g key={i}>
          <circle cx={x} cy={y + 10} r={18} fill="#FFD27F" opacity={0.35 * tw} filter="url(#st-b8)" />
          <circle cx={x} cy={y + 10} r={6} fill="#FFF1C9" opacity={tw} />
        </g>
      );
    })}
    {/* monstera */}
    <g transform="translate(60 640)">
      <rect x={-40} y={60} width={110} height={120} rx={10} fill="#E46A3A" />
      {[-60, -20, 20, 55, 90].map((a, i) => (
        <path key={i} d="M0,60 C10,-40 40,-140 0,-220 C-50,-140 -20,-40 0,60 Z" fill={i % 2 ? '#3F8F5B' : '#2E7A4C'} transform={`rotate(${a} 0 60)`} />
      ))}
    </g>
  </g>
);

export const Sofa: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="st-sofa" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F77FB0" />
        <stop offset="1" stopColor="#B8306E" />
      </linearGradient>
    </defs>
    <path d="M300,700 C300,660 330,650 380,650 L1060,650 C1110,650 1140,660 1140,700 L1140,1100 L300,1100 Z" fill="url(#st-sofa)" />
    <path d="M250,760 C250,720 300,716 320,740 L320,1100 L250,1100 Z" fill="#D84F8C" />
    <path d="M1190,760 C1190,720 1140,716 1120,740 L1120,1100 L1190,1100 Z" fill="#D84F8C" />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M${380 + i * 190},670 L${380 + i * 190},1000`} stroke="#8E1F55" strokeWidth={3} opacity={0.5} />
    ))}
    <rect x={300} y={650} width={840} height={14} rx={7} fill="#FFC2DC" opacity={0.5} />
  </g>
);

export const PaintTable: React.FC<{frame: number}> = ({frame}) => (
  <g>
    <rect x={1120} y={760} width={900} height={400} fill="#8C5B3B" />
    <rect x={1120} y={748} width={900} height={22} fill="#A9734E" />
    {[
      [1220, P.pink],
      [1320, P.lime],
      [1420, P.cobalt],
      [1540, P.autumn],
    ].map(([x, c], i) => (
      <g key={i}>
        <rect x={(x as number) - 34} y={690} width={68} height={64} rx={8} fill="#F4F0FA" opacity={0.9} />
        <rect x={(x as number) - 34} y={712} width={68} height={42} rx={6} fill={c as string} />
      </g>
    ))}
    <g transform={`translate(1700 700) rotate(${-14 + Math.sin(frame / 50)})`}>
      <rect x={-40} y={-60} width={80} height={120} rx={12} fill="#E9E0F2" />
      {[-20, 0, 20].map((x, i) => (
        <g key={i} transform={`rotate(${x * 0.6})`}>
          <rect x={x - 3} y={-200} width={6} height={160} fill="#6B4A33" />
          <path d={`M${x - 6},-200 L${x + 6},-200 L${x},-232 Z`} fill={[P.pink, P.lime, P.autumn][i]} />
        </g>
      ))}
    </g>
  </g>
);
