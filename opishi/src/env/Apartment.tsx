// Их квартира — one set, three lights: night (ch.2), cold day (ch.3), grey dawn (ch.4).
import React from 'react';
import {rand} from '../lib/anim';
import {INK_DARK, P} from '../lib/design';

export type Light = 'night' | 'day' | 'dawn';
const f = (n: number) => n.toFixed(1);

const PAL = {
  night: {wall: '#2E2760', wall2: '#251F50', floor: '#1C173E', trim: '#4A3F86', sky: ['#0F0C2E', '#2B2468'], sofa: '#6A4E9E', sofaD: '#4E3878'},
  day: {wall: '#C9DAE4', wall2: '#B2C8D6', floor: '#9CB1C0', trim: '#EAF2F7', sky: ['#E8F2F8', '#BFD6E6'], sofa: '#8FA3C2', sofaD: '#6F84A6'},
  dawn: {wall: '#8F96A8', wall2: '#7E8598', floor: '#6C7286', trim: '#B5BBC9', sky: ['#9AA2B4', '#C9CDD6'], sofa: '#6E7488', sofaD: '#585D70'},
};

export const Apartment: React.FC<{frame: number; light: Light; door?: number; polaroids?: number; lamp?: boolean}> = ({frame, light, door = 0, polaroids = 3, lamp = true}) => {
  const c = PAL[light];
  return (
    <g>
      <defs>
        <linearGradient id={`ap-sky-${light}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} />
          <stop offset="1" stopColor={c.sky[1]} />
        </linearGradient>
        <radialGradient id="ap-lamp">
          <stop offset="0" stopColor="#FFD98F" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#FFB062" stopOpacity="0.25" />
          <stop offset="1" stopColor="#FF9A50" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-700} y={-400} width={2500} height={2800} fill={c.wall} />
      <rect x={-700} y={1250} width={2500} height={1200} fill={c.floor} />
      <rect x={-700} y={1240} width={2500} height={20} fill={c.trim} stroke={INK_DARK} strokeWidth={3} />
      {/* window */}
      <g>
        <rect x={560} y={240} width={460} height={880} fill={c.trim} stroke={INK_DARK} strokeWidth={5} />
        <rect x={584} y={264} width={412} height={832} fill={`url(#ap-sky-${light})`} />
        {light === 'night' && (
          <>
            <circle cx={900} cy={360} r={44} fill="#F4F0DA" />
            <circle cx={882} cy={350} r={44} fill="#0F0C2E" opacity={0.85} />
            {Array.from({length: 7}).map((_, i) => {
              const bx = 584 + i * 62;
              const bh = 180 + rand(i * 5) * 340;
              return (
                <g key={i}>
                  <rect x={bx} y={1096 - bh} width={58} height={bh} fill="#1A1545" />
                  {Array.from({length: 10}).map((__, k) =>
                    rand(i * 31 + k) > 0.55 ? <rect key={k} x={bx + 10 + (k % 2) * 22} y={1096 - bh + 20 + Math.floor(k / 2) * 40} width={12} height={16} fill="#FFC86E" opacity={0.6 + 0.4 * Math.sin(frame / 60 + k + i)} /> : null,
                  )}
                </g>
              );
            })}
          </>
        )}
        {light === 'day' && [0, 1, 2].map((i) => <path key={i} d={`M${600 + i * 120},${360 + i * 90} l90,-24 l110,16 l-40,20 Z`} fill="#fff" opacity={0.8} />)}
        {light === 'dawn' &&
          Array.from({length: 40}).map((_, i) => {
            const x = 590 + rand(i) * 400;
            const y = 270 + ((frame * (4 + rand(i) * 3) + rand(i * 3) * 820) % 820);
            return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 26} stroke="#E8ECF3" strokeWidth={2} opacity={0.5} />;
          })}
        <rect x={784} y={264} width={14} height={832} fill={c.trim} stroke={INK_DARK} strokeWidth={3} />
        <rect x={584} y={660} width={412} height={14} fill={c.trim} stroke={INK_DARK} strokeWidth={3} />
      </g>
      {light === 'day' &&
        [0, 1].map((i) => <path key={i} d={`M${600 + i * 200},264 L${780 + i * 200},264 L${360 + i * 220},1800 L${100 + i * 220},1800 Z`} fill="#FFFFFF" opacity={0.13} />)}
      {/* doorframe + door */}
      <g>
        <rect x={40} y={360} width={330} height={900} fill="#120E26" stroke={INK_DARK} strokeWidth={5} />
        <rect x={40} y={360} width={330} height={900} fill={light === 'night' ? '#0C0A1C' : light === 'day' ? '#6F7F8E' : '#4A4E5C'} />
        {door > 0.01 && (
          <g transform={`translate(52 372) scale(${f(door)} 1)`}>
            <path d="M0,0 L306,0 L306,876 L0,876 Z" fill={light === 'night' ? '#3A2E6E' : light === 'day' ? '#DCE6EE' : '#9AA0B0'} stroke={INK_DARK} strokeWidth={4} />
            <path d="M30,40 L276,40 L276,400 L30,400 Z M30,460 L276,460 L276,840 L30,840 Z" fill="none" stroke={INK_DARK} strokeWidth={3} opacity={0.5} />
            {door > 0.6 && <circle cx={270} cy={470} r={12} fill={P.gold} />}
          </g>
        )}
        <rect x={20} y={340} width={30} height={920} fill={c.trim} stroke={INK_DARK} strokeWidth={4} />
        <rect x={360} y={340} width={30} height={920} fill={c.trim} stroke={INK_DARK} strokeWidth={4} />
        <rect x={20} y={330} width={370} height={34} fill={c.trim} stroke={INK_DARK} strokeWidth={4} />
      </g>
      {/* polaroid string */}
      <path d="M420,520 Q480,560 540,520" stroke={INK_DARK} strokeWidth={2} fill="none" />
      {Array.from({length: polaroids}).map((_, i) => (
        <g key={i} transform={`translate(${430 + (i % 2) * 58} ${540 + Math.floor(i / 2) * 120}) rotate(${(rand(i) - 0.5) * 16})`}>
          <rect x={-26} y={0} width={52} height={62} fill="#FBF8F2" stroke={INK_DARK} strokeWidth={2} />
          <rect x={-21} y={5} width={42} height={40} fill={[P.sunset, P.lilac, P.lime, P.rose][i % 4]} />
        </g>
      ))}
      {/* lamp */}
      {lamp && (
        <g>
          {light === 'night' && <circle cx={960} cy={1180} r={420} fill="url(#ap-lamp)" />}
          <rect x={956} y={1140} width={8} height={300} fill={INK_DARK} />
          <path d="M900,1080 L1020,1080 L1000,1150 L920,1150 Z" fill={light === 'night' ? '#FFD98F' : '#E8DCC2'} stroke={INK_DARK} strokeWidth={4} />
        </g>
      )}
      {/* plant */}
      <g transform="translate(470 1180)">
        <path d="M-40,0 L40,0 L30,80 L-30,80 Z" fill={light === 'night' ? '#6A3A60' : '#C77B5C'} stroke={INK_DARK} strokeWidth={4} />
        {[-50, -20, 10, 40].map((a, i) => (
          <path key={i} d="M0,0 L-24,-120 L0,-180 L24,-120 Z" fill={light === 'day' ? '#5E9A7A' : light === 'dawn' ? '#5D6E6A' : '#2F5E50'} stroke={INK_DARK} strokeWidth={3} transform={`rotate(${a + Math.sin(frame / 60 + i) * 2})`} />
        ))}
      </g>
    </g>
  );
};

export const Sofa: React.FC<{light: Light}> = ({light}) => {
  const c = PAL[light];
  return (
    <g>
      <path d="M380,1420 L1180,1420 L1180,1900 L380,1900 Z" fill={c.sofa} stroke={INK_DARK} strokeWidth={5} />
      <path d="M340,1520 L420,1500 L420,1900 L340,1900 Z" fill={c.sofaD} stroke={INK_DARK} strokeWidth={4} />
      <path d="M380,1420 L1180,1420 L1180,1450 L380,1450 Z" fill="#fff" opacity={0.12} />
      <path d="M760,1440 L780,1880" stroke={INK_DARK} strokeWidth={3} opacity={0.4} />
    </g>
  );
};

export const Table: React.FC<{light: Light; y?: number}> = ({light, y = 1440}) => (
  <g>
    <path d={`M-700,${y} L1800,${y} L1800,${y + 40} L-700,${y + 40} Z`} fill={light === 'day' ? '#EDE6DA' : '#B9B4AE'} stroke={INK_DARK} strokeWidth={5} />
    <path d={`M-700,${y + 40} L1800,${y + 40} L1800,2400 L-700,2400 Z`} fill={light === 'day' ? '#8C6B55' : '#5E5250'} stroke={INK_DARK} strokeWidth={5} />
  </g>
);
