// Петербургская набережная, золотой час. Camera looks from the river at the parapet.
import React from 'react';
import {fbm, rand} from '../lib/anim';

const f = (n: number) => n.toFixed(1);

export const EmbSky: React.FC<{frame: number}> = ({frame}) => (
  <g>
    <defs>
      <linearGradient id="emb-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#C9B6E8" />
        <stop offset="0.45" stopColor="#F4C1C4" />
        <stop offset="0.8" stopColor="#FAD6BE" />
        <stop offset="1" stopColor="#FCE7D3" />
      </linearGradient>
      <filter id="emb-cloud" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="18" />
      </filter>
      <radialGradient id="emb-sun">
        <stop offset="0" stopColor="#FFF4DA" stopOpacity="1" />
        <stop offset="0.3" stopColor="#FFE1B8" stopOpacity="0.7" />
        <stop offset="1" stopColor="#FFC9A8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x={-800} y={-600} width={3520} height={2000} fill="url(#emb-sky)" />
    <circle cx={330} cy={300} r={420} fill="url(#emb-sun)" />
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const x = ((i * 430 + frame * (0.12 + i * 0.02)) % 2800) - 500;
      return (
        <g key={i} filter="url(#emb-cloud)" opacity={0.75}>
          <ellipse cx={x} cy={110 + (i % 3) * 70} rx={170 + i * 20} ry={34} fill="#FFF1EE" />
          <ellipse cx={x + 90} cy={96 + (i % 3) * 70} rx={110} ry={30} fill="#FBE0E6" />
        </g>
      );
    })}
  </g>
);

// Isaac-style golden dome + Peter & Paul spire far away
export const EmbLandmarks: React.FC<{frame: number}> = ({frame}) => {
  const glint = 0.55 + 0.45 * Math.sin(frame / 30);
  return (
    <g opacity={0.92}>
      <defs>
        <linearGradient id="emb-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B07A22" />
          <stop offset="0.35" stopColor="#F6D27A" />
          <stop offset="0.55" stopColor="#FFF0B8" />
          <stop offset="1" stopColor="#9C6A1C" />
        </linearGradient>
        <linearGradient id="emb-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6D3CC" stopOpacity="0" />
          <stop offset="1" stopColor="#F6D3CC" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g transform="translate(1290 0)">
        {/* drum with colonnade */}
        <rect x={-150} y={250} width={300} height={130} fill="#E4D2C4" />
        {Array.from({length: 13}).map((_, i) => (
          <rect key={i} x={-142 + i * 23} y={262} width={9} height={112} fill="#C8B3A4" />
        ))}
        <rect x={-165} y={240} width={330} height={16} fill="#EFE2D6" />
        <rect x={-165} y={376} width={330} height={14} fill="#CDB9AA" />
        {/* dome */}
        <path d="M-140,242 C-140,90 140,90 140,242 Z" fill="url(#emb-gold)" />
        {[-100, -55, 0, 55, 100].map((x) => (
          <path key={x} d={`M${x * 0.2},${112} C${x * 0.7},140 ${x},200 ${x * 1.02},242`} stroke="#9C6A1C" strokeWidth={3} fill="none" opacity={0.5} />
        ))}
        <ellipse cx={-38} cy={150} rx={22} ry={46} fill="#FFF7D6" opacity={0.35 * glint} />
        {/* lantern */}
        <rect x={-22} y={64} width={44} height={46} fill="#EFE2D6" />
        <path d="M-26,66 C-26,30 26,30 26,66 Z" fill="url(#emb-gold)" />
        <rect x={-3} y={0} width={6} height={36} fill="#E8C060" />
        <rect x={-12} y={10} width={24} height={5} fill="#E8C060" />
        {/* side belfries */}
        {[-230, 230].map((x) => (
          <g key={x} transform={`translate(${x} 300)`}>
            <rect x={-30} y={0} width={60} height={90} fill="#DCC8B8" />
            <path d="M-34,2 C-34,-50 34,-50 34,2 Z" fill="url(#emb-gold)" />
            <rect x={-2} y={-70} width={4} height={30} fill="#E8C060" />
          </g>
        ))}
      </g>
      {/* spire */}
      <g transform="translate(420 0)">
        <rect x={-34} y={300} width={68} height={120} fill="#E3CBB8" />
        <rect x={-24} y={240} width={48} height={64} fill="#EAD7C6" />
        <path d="M-16,244 L0,40 L16,244 Z" fill="url(#emb-gold)" />
        <path d="M-2,40 L0,-20 L2,40 Z" fill="#F6D27A" />
        <circle cx={0} cy={-24} r={6} fill="#F6D27A" opacity={glint} />
      </g>
      <rect x={-600} y={180} width={3200} height={260} fill="url(#emb-haze)" />
    </g>
  );
};

const FACADES = [
  {w: 330, h: 470, c: '#F3A3BC', roof: '#7E8C8A'},
  {w: 280, h: 520, c: '#F4D27C', roof: '#6F7C7A'},
  {w: 360, h: 455, c: '#A6D6C3', roof: '#7E8C8A'},
  {w: 300, h: 505, c: '#A9B9F0', roof: '#6F7C7A'},
  {w: 340, h: 480, c: '#F6BC93', roof: '#7E8C8A'},
  {w: 290, h: 515, c: '#F3A3BC', roof: '#6F7C7A'},
  {w: 330, h: 470, c: '#F4D27C', roof: '#7E8C8A'},
  {w: 300, h: 500, c: '#A6D6C3', roof: '#6F7C7A'},
];

export const EmbFacades: React.FC<{frame: number}> = ({frame}) => {
  let x = -520;
  const base = 760;
  return (
    <g>
      <defs>
        <linearGradient id="emb-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3C3F7A" />
          <stop offset="1" stopColor="#6B6FB0" />
        </linearGradient>
        <linearGradient id="emb-facadeShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#3a1f3a" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {FACADES.concat(FACADES.slice(0, 2)).map((b, i) => {
        const bx = x;
        x += b.w + 6;
        const top = base - b.h;
        const cols = Math.floor((b.w - 40) / 62);
        const rows = 4;
        const winW = 30;
        const gap = (b.w - cols * winW) / (cols + 1);
        const wins = [] as React.ReactNode[];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = bx + gap + c * (winW + gap);
            const wy = top + 70 + r * 96;
            const lit = rand(i * 31 + r * 7 + c) > 0.82;
            const refl = 0.25 + 0.2 * Math.sin(frame / 50 + i + c);
            wins.push(
              <g key={`${r}-${c}`}>
                {r === 0 && <path d={`M${wx - 8},${wy - 6} L${wx + winW / 2},${wy - 26} L${wx + winW + 8},${wy - 6} Z`} fill="#fff" opacity={0.75} />}
                <rect x={wx - 5} y={wy - 5} width={winW + 10} height={64} fill="#FFF8F2" />
                <rect x={wx} y={wy} width={winW} height={54} fill={lit ? '#FFD991' : 'url(#emb-glass)'} />
                <rect x={wx + winW / 2 - 1.5} y={wy} width={3} height={54} fill="#FFF8F2" />
                <rect x={wx} y={wy + 20} width={winW} height={3} fill="#FFF8F2" />
                <rect x={wx + 3} y={wy + 3} width={8} height={48} fill="#fff" opacity={lit ? 0.2 : refl} />
                <rect x={wx - 7} y={wy + 58} width={winW + 14} height={6} fill="#fff" opacity={0.8} />
              </g>,
            );
          }
        }
        return (
          <g key={i}>
            <rect x={bx} y={top} width={b.w} height={b.h} fill={b.c} />
            <rect x={bx} y={top} width={b.w} height={b.h} fill="url(#emb-facadeShade)" />
            <path d={`M${bx - 10},${top} L${bx + b.w / 2},${top - 46} L${bx + b.w + 10},${top} Z`} fill={b.roof} />
            <rect x={bx + b.w * 0.2} y={top - 70} width={22} height={50} fill="#9A8C88" />
            <rect x={bx - 8} y={top - 6} width={b.w + 16} height={16} fill="#FFFFFF" opacity={0.85} />
            <rect x={bx} y={top + 46} width={b.w} height={6} fill="#FFFFFF" opacity={0.5} />
            <rect x={bx} y={base - 140} width={b.w} height={10} fill="#FFFFFF" opacity={0.55} />
            {wins}
            <rect x={bx + b.w - 6} y={top} width={6} height={b.h} fill="#000" opacity={0.08} />
          </g>
        );
      })}
    </g>
  );
};

// Autumn trees on the walkway between the houses and the parapet
export const EmbTrees: React.FC<{frame: number}> = ({frame}) => {
  const tree = (cx: number, cy: number, s: number, seed: number) => {
    const sway = fbm(frame / 80, seed) * 4;
    const blobs = Array.from({length: 16}).map((_, i) => {
      const a = rand(seed + i) * Math.PI * 2;
      const r = Math.sqrt(rand(seed + i * 2)) * 150 * s;
      const rr = (60 + rand(seed + i * 3) * 60) * s;
      return <circle key={i} cx={cx + Math.cos(a) * r * 1.3 + sway * (1 + i * 0.05)} cy={cy + Math.sin(a) * r * 0.8} r={rr} fill={`url(#emb-leaf${i % 5})`} />;
    });
    return (
      <g key={seed}>
        <path d={`M${cx - 14 * s},${cy + 40 * s} C${cx - 18 * s},${cy + 200 * s} ${cx - 10 * s},${cy + 300 * s} ${cx - 24 * s},${cy + 420 * s} L${cx + 26 * s},${cy + 420 * s} C${cx + 12 * s},${cy + 300 * s} ${cx + 18 * s},${cy + 200 * s} ${cx + 14 * s},${cy + 40 * s} Z`} fill="#3E2A2A" />
        <path d={`M${cx},${cy + 120 * s} L${cx - 90 * s},${cy + 10 * s} M${cx},${cy + 160 * s} L${cx + 110 * s},${cy + 40 * s}`} stroke="#3E2A2A" strokeWidth={10 * s} />
        {blobs}
        {Array.from({length: 10}).map((_, i) => (
          <circle key={`h${i}`} cx={cx - 60 * s + rand(seed + i * 9) * 120 * s} cy={cy - 80 * s + rand(seed + i * 4) * 60 * s} r={(18 + rand(i + seed) * 22) * s} fill="#FFD27F" opacity={0.55} />
        ))}
      </g>
    );
  };
  const cols = [['#F6A35A', '#D9542E'], ['#FFC877', '#E8743B'], ['#F07A45', '#B9361F'], ['#FFD98A', '#E89A3B'], ['#E9643A', '#A8301E']];
  return (
    <g>
      <defs>
        {cols.map(([a, b], i) => (
          <radialGradient key={i} id={`emb-leaf${i}`} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </radialGradient>
        ))}
      </defs>
      {tree(80, 300, 1.25, 3)}
      {tree(1860, 280, 1.35, 9)}
      {tree(1010, 300, 0.75, 17)}
    </g>
  );
};

// Ornate street lamp standing on the parapet
export const EmbLamp: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-9} y={-380} width={18} height={380} fill="#1E1A24" />
    <rect x={-20} y={-30} width={40} height={30} fill="#1E1A24" />
    <path d="M0,-380 C-60,-380 -80,-420 -70,-450 M0,-380 C60,-380 80,-420 70,-450" stroke="#1E1A24" strokeWidth={8} fill="none" />
    {[-70, 70, 0].map((lx, i) => (
      <g key={i} transform={`translate(${lx} ${i === 2 ? -480 : -460})`}>
        <path d="M-18,0 L18,0 L24,-44 L-24,-44 Z" fill="#FFF0C9" stroke="#1E1A24" strokeWidth={4} />
        <path d="M-28,-44 L28,-44 L0,-64 Z" fill="#1E1A24" />
      </g>
    ))}
  </g>
);

export const EmbParapet: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="emb-granite" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#D8C3C6" />
        <stop offset="0.25" stopColor="#B99FA6" />
        <stop offset="1" stopColor="#8B7380" />
      </linearGradient>
      <pattern id="emb-speck" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="1.2" fill="#6F5C66" opacity="0.5" />
        <circle cx="10" cy="9" r="0.9" fill="#F2E3E6" opacity="0.6" />
      </pattern>
    </defs>
    <rect x={-700} y={700} width={3320} height={36} fill="#E6D3D5" />
    <rect x={-700} y={700} width={3320} height={8} fill="#FFF3F2" opacity={0.7} />
    <rect x={-700} y={736} width={3320} height={110} fill="url(#emb-granite)" />
    <rect x={-700} y={700} width={3320} height={146} fill="url(#emb-speck)" />
    <rect x={-700} y={736} width={3320} height={14} fill="#4B3442" opacity={0.25} />
    {Array.from({length: 22}).map((_, i) => (
      <rect key={i} x={-700 + i * 160} y={738} width={3} height={108} fill="#6E5866" opacity={0.5} />
    ))}
  </g>
);

export const EmbRiver: React.FC<{frame: number}> = ({frame}) => (
  <g>
    <defs>
      <linearGradient id="emb-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5162C9" />
        <stop offset="0.4" stopColor="#6F82E0" />
        <stop offset="1" stopColor="#9DB0F5" />
      </linearGradient>
      <filter id="emb-wb" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
    <rect x={-700} y={846} width={3320} height={600} fill="url(#emb-water)" />
    {/* parapet reflection */}
    <rect x={-700} y={846} width={3320} height={70} fill="#5A4A6E" opacity={0.45} filter="url(#emb-wb)" />
    {Array.from({length: 60}).map((_, i) => {
      const y = 870 + rand(i * 3.3) * 300;
      const len = 40 + rand(i * 1.7) * 160;
      const x = ((rand(i * 9.1) * 2600 + frame * (0.4 + rand(i) * 0.6)) % 2800) - 500;
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(frame / 20 + i));
      return (
        <rect key={i} x={x} y={y + Math.sin(frame / 25 + i) * 3} width={len} height={3 + rand(i * 2) * 3} rx={2} fill={i % 4 === 0 ? '#FFE2C8' : '#D7E0FF'} opacity={0.5 * tw} />
      );
    })}
  </g>
);

// Falling leaves (world-space particles)
export const Leaves: React.FC<{frame: number; count?: number; seed?: number; scale?: number; area?: [number, number, number, number]}> = ({
  frame,
  count = 26,
  seed = 1,
  scale = 1,
  area = [-300, -100, 2500, 1200],
}) => (
  <g>
    {Array.from({length: count}).map((_, i) => {
      const r0 = rand(seed * 100 + i);
      const speed = 0.9 + rand(seed * 50 + i * 3) * 1.4;
      const [x0, y0, x1, y1] = area;
      const h = y1 - y0;
      const t = (frame * speed + r0 * h) % h;
      const y = y0 + t;
      const x = x0 + rand(seed + i * 7) * (x1 - x0) + Math.sin((frame + i * 40) / 45) * 60 - t * 0.25;
      const rot = frame * (2 + r0 * 3) + i * 40;
      const flip = Math.cos((frame + i * 20) / 18);
      const col = ['#E8743B', '#F5B655', '#D9542E', '#F29B4B'][i % 4];
      const s = (0.7 + rand(i * 5) * 0.8) * scale;
      return (
        <g key={i} transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)} ${f(s * flip)})`}>
          <path d="M0,-14 C10,-8 10,8 0,14 C-10,8 -10,-8 0,-14 Z" fill={col} />
          <path d="M0,-14 L0,14" stroke="#8A3A1E" strokeWidth={1.2} opacity={0.6} />
        </g>
      );
    })}
  </g>
);

export const Gulls: React.FC<{frame: number}> = ({frame}) => (
  <g>
    {[0, 1, 2].map((i) => {
      const x = ((frame * (1.3 + i * 0.3) + i * 500) % 2600) - 300;
      const y = 150 + i * 50 + Math.sin(frame / 40 + i) * 14;
      const flap = Math.sin(frame / (5 + i)) * 10;
      return (
        <path key={i} d={`M${f(x - 22)},${f(y - flap)} Q${f(x - 10)},${f(y - 10)} ${f(x)},${f(y)} Q${f(x + 10)},${f(y - 10)} ${f(x + 22)},${f(y - flap)}`} stroke="#3B2E45" strokeWidth={3} fill="none" opacity={0.75} />
      );
    })}
  </g>
);
