// Props in the show style: film camera, polaroid, the lime sunglasses as an object,
// white cane, Timur seen from behind (for over-the-shoulder shots).
import React from 'react';
import {INK, INK_DARK, P, SKIN} from '../lib/design';
import {soft} from './cel';

export const FilmCamera: React.FC = () => (
  <g>
    <path d={soft([[-150, -80], [150, -80], [160, 90], [-160, 90]], 0.12)} fill="#1E1C22" stroke={INK_DARK} strokeWidth={5} />
    <path d={soft([[-150, -80], [150, -80], [152, -30], [-152, -30]], 0.1)} fill="#C9C6CE" stroke={INK_DARK} strokeWidth={4} />
    <rect x={-120} y={-118} width={70} height={40} rx={6} fill="#C9C6CE" stroke={INK_DARK} strokeWidth={4} />
    <rect x={70} y={-110} width={50} height={32} rx={6} fill="#2A2830" stroke={INK_DARK} strokeWidth={4} />
    <circle cx={0} cy={20} r={70} fill="#2A2830" stroke={INK_DARK} strokeWidth={5} />
    <circle cx={0} cy={20} r={48} fill="#14121A" stroke="#4A4656" strokeWidth={6} />
    <circle cx={0} cy={20} r={26} fill="#3B2E6E" />
    <path d="M-14,4 L4,-6 L-2,10 Z" fill="#fff" opacity={0.7} />
    <circle cx={115} cy={-50} r={12} fill={P.sunset} />
  </g>
);

export const Polaroid: React.FC<{w?: number; dev?: number; children?: React.ReactNode; id: string; caption?: string}> = ({w = 300, dev = 1, children, id, caption}) => {
  const h = w * 1.2;
  const iw = w * 0.86;
  const ih = iw;
  return (
    <g>
      <rect x={-w / 2 + 8} y={-h / 2 + 12} width={w} height={h} fill="#000" opacity={0.25} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#FBF8F1" stroke={INK_DARK} strokeWidth={4} />
      <defs>
        <clipPath id={`${id}-pc`}>
          <rect x={-iw / 2} y={-h / 2 + w * 0.07} width={iw} height={ih} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-pc)`}>
        {children}
        <rect x={-iw / 2} y={-h / 2 + w * 0.07} width={iw} height={ih} fill="#1A1424" opacity={1 - dev} />
      </g>
      {caption && (
        <text x={0} y={h / 2 - w * 0.08} textAnchor="middle" fontFamily='"Great Vibes", cursive' fontSize={w * 0.12} fill={INK}>
          {caption}
        </text>
      )}
    </g>
  );
};

export const LimeGlasses: React.FC<{scale?: number}> = ({scale = 1}) => (
  <g transform={`scale(${scale})`}>
    {[-1, 1].map((sd) => (
      <path
        key={sd}
        d={soft(
          [
            [sd * 188, -76],
            [sd * 26, -54],
            [sd * 20, -2],
            [sd * 50, 36],
            [sd * 136, 36],
            [sd * 170, -6],
          ],
          0.2,
        )}
        fill="#2B2150"
        stroke={P.lime}
        strokeWidth={17}
        strokeLinejoin="round"
      />
    ))}
    <path d="M-22,-40 Q0,-56 22,-40" stroke={P.lime} strokeWidth={12} fill="none" />
    <path d="M-150,30 L-110,-60 L-96,-60 L-136,30 Z M50,30 L90,-60 L104,-60 L64,30 Z" fill="#fff" opacity={0.45} />
    <path d="M-188,-76 L-250,-40 M188,-76 L250,-40" stroke={P.lime} strokeWidth={10} strokeLinecap="round" />
  </g>
);

export const Cane: React.FC<{len?: number}> = ({len = 700}) => (
  <g>
    <rect x={-7} y={0} width={14} height={len} rx={7} fill="#F4F4F2" stroke={INK_DARK} strokeWidth={3} />
    <rect x={-7} y={len - 120} width={14} height={110} fill="#D8343F" />
    <rect x={-9} y={-10} width={18} height={60} rx={8} fill="#1E1C22" />
  </g>
);

// Timur from behind: curls + long neck + jacket. Used in the over-the-shoulder opener.
export const TimurBack: React.FC<{frame: number; cameraUp?: number}> = ({frame, cameraUp = 0}) => (
  <g>
    <path d={soft([[-90, 540], [-240, 560], [-318, 620], [-340, 760], [-350, 1060], [350, 1060], [340, 760], [318, 620], [240, 560], [90, 540]], 0.12)} fill="#1C1A21" stroke={INK_DARK} strokeWidth={5} />
    <path d={soft([[-110, 520], [110, 520], [140, 590], [-140, 590]], 0.3)} fill="#2A2731" stroke={INK_DARK} strokeWidth={4} />
    <path d={soft([[-56, 150], [56, 150], [60, 420], [80, 540], [-80, 540], [-60, 420]], 0.12)} fill={SKIN.timur.shade} stroke={INK} strokeWidth={4} />
    <path d="M56,170 L60,420 L80,540" stroke="#FFB27A" strokeWidth={6} fill="none" />
    <path d={soft([[-140, -100], [-150, -240], [-90, -310], [0, -334], [90, -310], [150, -240], [140, -100], [100, 40], [0, 120], [-100, 40]], 0.18)} fill="#120D12" stroke={INK_DARK} strokeWidth={5} />
    {Array.from({length: 18}).map((_, i) => {
      const a = (i / 18) * Math.PI * 2;
      const r = 26 + (i % 3) * 5;
      const x = Math.cos(a) * 110;
      const y = -150 + Math.sin(a) * 140 + Math.sin(frame / 30 + i) * 1;
      return (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#17121A" stroke={i < 9 ? '#FF9A5A' : INK_DARK} strokeWidth={i < 9 ? 5 : 4} />
          <path d={`M${x - r * 0.5},${y} A${r * 0.5},${r * 0.5} 0 1 1 ${x + r * 0.2},${y + r * 0.4}`} stroke="#4A3E5A" strokeWidth={4} fill="none" />
        </g>
      );
    })}
    <path d="M-20,-150 A30,30 0 1 1 20,-130" stroke="#3B3346" strokeWidth={4} fill="none" />
    {/* arms raised holding camera */}
    <g opacity={cameraUp}>
      <path d={soft([[-300, 640], [-200, 360], [-120, 330], [-150, 420], [-230, 660]], 0.2)} fill="#1C1A21" stroke={INK_DARK} strokeWidth={5} />
      <path d={soft([[300, 640], [200, 360], [120, 330], [150, 420], [230, 660]], 0.2)} fill="#1C1A21" stroke={INK_DARK} strokeWidth={5} />
      <g transform="translate(0 300) scale(0.9)">
        <path d={soft([[-170, -60], [170, -60], [170, 70], [-170, 70]], 0.12)} fill="#1E1C22" stroke={INK_DARK} strokeWidth={5} />
        <path d={soft([[-170, -60], [170, -60], [170, -20], [-170, -20]], 0.1)} fill="#C9C6CE" stroke={INK_DARK} strokeWidth={4} />
      </g>
    </g>
  </g>
);

// Folded note
export const Note: React.FC<{open?: number}> = ({open = 1}) => (
  <g>
    <path d={soft([[-210, -150], [210, -160], [220, 150 * open], [-200, 160 * open]], 0.05)} fill="#FBF6EC" stroke={INK_DARK} strokeWidth={4} />
    {open > 0.5 && <path d="M-200,0 L215,-6" stroke="#E1D8C8" strokeWidth={3} />}
  </g>
);
