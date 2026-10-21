// Крыша на закате. Two backdrops: looking toward the sun (behind Mira) and the reverse
// (dusky sky, water tower, string lights) behind Timur. Flat angular style, vertical world.
import React from 'react';
import {fbm, rand} from '../lib/anim';
import {INK_DARK} from '../lib/design';

const f = (n: number) => n.toFixed(1);

const skyline = (seed: number, y0: number, hMin: number, hMax: number, x0: number, x1: number, color: string, windows?: string) => {
  const out: React.ReactNode[] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = 60 + rand(seed + i) * 110;
    const h = hMin + rand(seed + i * 3) * (hMax - hMin);
    const top = y0 - h;
    const roof = rand(seed + i * 5);
    out.push(
      <g key={i}>
        <path
          d={roof > 0.75 ? `M${f(x)},${y0} L${f(x)},${f(top + 30)} L${f(x + w / 2)},${f(top)} L${f(x + w)},${f(top + 30)} L${f(x + w)},${y0} Z` : `M${f(x)},${y0} L${f(x)},${f(top)} L${f(x + w)},${f(top)} L${f(x + w)},${y0} Z`}
          fill={color}
        />
        {roof < 0.2 && <rect x={x + w * 0.4} y={top - 60} width={4} height={60} fill={color} />}
        {windows &&
          Array.from({length: Math.floor(h / 34)}).map((_, r) =>
            Array.from({length: Math.floor(w / 26)}).map((__, c) =>
              rand(seed * 3 + i * 17 + r * 5 + c) > 0.72 ? <rect key={`${r}-${c}`} x={x + 10 + c * 26} y={top + 18 + r * 34} width={10} height={14} fill={windows} /> : null,
            ),
          )}
      </g>,
    );
    x += w + 4;
    i++;
  }
  return out;
};

// Toward the sun. horizon ~ y 1180
export const RoofSunset: React.FC<{frame: number; dusk?: number}> = ({frame, dusk = 0}) => (
  <g>
    <defs>
      <linearGradient id="rs-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3E3388" />
        <stop offset="0.35" stopColor="#9C5FA8" />
        <stop offset="0.55" stopColor="#EE7470" />
        <stop offset="0.68" stopColor="#FF9A4C" />
        <stop offset="0.78" stopColor="#FFD27A" />
      </linearGradient>
    </defs>
    <rect x={-700} y={-400} width={2500} height={1800} fill="url(#rs-sky)" />
    {/* sun with flat halo rings */}
    {[340, 260, 200].map((r, i) => (
      <circle key={r} cx={860} cy={1150} r={r + Math.sin(frame / 50 + i) * 6} fill="#FFE7A8" opacity={0.12 + i * 0.06} />
    ))}
    <circle cx={860} cy={1150} r={150} fill="#FFEBB5" />
    <circle cx={860} cy={1150} r={150} fill="#FFF6D8" opacity={0.6} transform="translate(-24 -24) scale(0.7)" style={{transformOrigin: '860px 1150px'}} />
    {/* angular clouds */}
    {[0, 1, 2, 3, 4].map((i) => {
      const x = ((i * 470 + frame * (0.25 + i * 0.05)) % 2400) - 700;
      const y = 300 + i * 150;
      return (
        <g key={i} opacity={0.9}>
          <path d={`M${f(x)},${y} L${f(x + 120)},${y - 40} L${f(x + 260)},${y - 30} L${f(x + 380)},${y - 70} L${f(x + 520)},${y} Z`} fill={i % 2 ? '#F7A1A0' : '#FFC08A'} />
          <path d={`M${f(x + 40)},${y} L${f(x + 160)},${y - 18} L${f(x + 420)},${y - 10} L${f(x + 500)},${y} Z`} fill="#FFE1C2" opacity={0.7} />
        </g>
      );
    })}
    {/* birds */}
    {[0, 1, 2].map((i) => {
      const x = ((frame * (1.1 + i * 0.3) + i * 380) % 1900) - 400;
      const y = 700 + i * 60 + Math.sin(frame / 40 + i) * 12;
      const fl = Math.sin(frame / (5 + i)) * 10;
      return <path key={i} d={`M${f(x - 18)},${f(y - fl)} L${f(x)},${f(y)} L${f(x + 18)},${f(y - fl)}`} stroke="#4A2A55" strokeWidth={4} fill="none" strokeLinejoin="round" />;
    })}
    {/* layered skyline */}
    <g>{skyline(3, 1250, 80, 260, -700, 1800, '#D86A86')}</g>
    <g>{skyline(11, 1330, 120, 380, -700, 1800, '#8E3F78', '#FFD27A')}</g>
    <g>{skyline(23, 1430, 160, 420, -700, 1800, '#4C2459', '#FFB86A')}</g>
    <rect x={-700} y={1430} width={2500} height={600} fill="#3A1C48" />
    {dusk > 0 && <rect x={-700} y={-400} width={2500} height={2400} fill="#1B1240" opacity={dusk} />}
  </g>
);

// Reverse angle: dusky sky, water tower, string lights, warm-lit facades
export const RoofReverse: React.FC<{frame: number}> = ({frame}) => (
  <g>
    <defs>
      <linearGradient id="rr-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2C2770" />
        <stop offset="0.6" stopColor="#6E4A9C" />
        <stop offset="1" stopColor="#B86B9E" />
      </linearGradient>
    </defs>
    <rect x={-700} y={-400} width={2500} height={2600} fill="url(#rr-sky)" />
    {Array.from({length: 40}).map((_, i) => (
      <circle key={i} cx={rand(i) * 2200 - 600} cy={rand(i * 3) * 700} r={1.5 + rand(i * 5) * 2} fill="#fff" opacity={0.3 + 0.5 * Math.abs(Math.sin(frame / 40 + i))} />
    ))}
    <g>{skyline(41, 1400, 200, 520, -700, 1800, '#5B3576', '#FFC77A')}</g>
    {/* water tower */}
    <g transform="translate(-80 520)">
      <path d="M-30,380 L0,180 M250,380 L220,180 M40,380 L60,180 M180,380 L160,180" stroke={INK_DARK} strokeWidth={10} />
      <path d="M-10,180 L230,180 L220,20 L0,20 Z" fill="#3A2550" stroke={INK_DARK} strokeWidth={5} />
      <path d="M-20,20 L110,-80 L240,20 Z" fill="#2B1B3E" stroke={INK_DARK} strokeWidth={5} />
      <path d="M150,30 L210,30 L205,170 L160,170 Z" fill="#FF9E5A" opacity={0.55} />
    </g>
    {/* string lights */}
    {[0, 1].map((row) => {
      const y0 = 300 + row * 220;
      return (
        <g key={row}>
          <path d={`M-400,${y0} Q540,${y0 + 160} 1500,${y0}`} stroke="#1A1028" strokeWidth={3} fill="none" />
          {Array.from({length: 18}).map((_, i) => {
            const t = i / 17;
            const x = -400 + t * 1900;
            const y = y0 + 4 * 160 * t * (1 - t) * 0.5 + 6;
            const tw = 0.7 + 0.3 * Math.sin(frame / 14 + i * 1.3 + row);
            return (
              <g key={i}>
                <circle cx={x} cy={y + 8} r={22} fill="#FFD27F" opacity={0.25 * tw} />
                <path d={`M${f(x - 7)},${f(y)} L${f(x + 7)},${f(y)} L${f(x + 5)},${f(y + 16)} L${f(x - 5)},${f(y + 16)} Z`} fill="#FFF1C9" opacity={tw} />
              </g>
            );
          })}
        </g>
      );
    })}
    <rect x={-700} y={1380} width={2500} height={800} fill="#2A1838" />
  </g>
);

// Parapet ledge characters sit on (front face toward camera)
export const Ledge: React.FC<{y?: number; warm?: number}> = ({y = 1500, warm = 1}) => (
  <g>
    <rect x={-700} y={y} width={2500} height={34} fill={warm ? '#E58A6A' : '#8A7A8C'} stroke={INK_DARK} strokeWidth={4} />
    <rect x={-700} y={y + 34} width={2500} height={700} fill={warm ? '#7A3550' : '#4A3C52'} stroke={INK_DARK} strokeWidth={4} />
    {Array.from({length: 16}).map((_, i) => (
      <rect key={i} x={-700 + i * 170} y={y + 34} width={4} height={700} fill="#000" opacity={0.18} />
    ))}
    <rect x={-700} y={y + 34} width={2500} height={26} fill="#000" opacity={0.25} />
  </g>
);

export const Wind: React.FC<{frame: number}> = ({frame}) => (
  <g opacity={0.35}>
    {[0, 1, 2, 3].map((i) => {
      const x = ((frame * (6 + i) + i * 600) % 2400) - 600;
      const y = 400 + i * 260 + fbm(frame / 50, i) * 40;
      return <path key={i} d={`M${f(x)},${f(y)} q60,-20 140,0 t140,0`} stroke="#FFF2E0" strokeWidth={3} fill="none" strokeLinecap="round" />;
    })}
  </g>
);
