import React from 'react';

// Палитра в духе референса
const PAL: Record<string, string> = {
  k: '#141418', // контур
  b: '#2b2b33', // тёмно-серый
  w: '#f7f6f2', // белый
  W: '#d3d3d0', // белый в тени
  s: '#c8ccd2', // серебро
  S: '#7d838c', // серебро тёмное
  r: '#e0231c', // красный
  R: '#9c120c', // красный тень
  h: '#f2703a', // оранжевый блик сердца
  y: '#ffcf2e', // золото
  Y: '#d08a00', // золото тень
  g: '#4fae3a', // зелень листьев
  G: '#88d64a', // зелень светлая
  M: '#6cc24a', // купюры
  m: '#3f8a2e', // купюры тень
  p: '#e9d6a6', // бумажная лента
  c: '#a6d4f2', // горшок
  C: '#5c97c4', // горшок тень
  N: '#262a66', // хлопушка тёмная
  B: '#5a5fe0', // хлопушка синяя
  l: '#a8b86a', // наклейка книги
  P: '#f1c9d6', // страницы
  e: '#ffd84a', // глаза кота
  o: '#7a4a24', // земля
  u: '#3b82f6',
  v: '#474752',
};

type Grid = string[];
const fn = (w: number, h: number, f: (x: number, y: number) => string): Grid =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)).join(''));

export const ICONS: Record<string, Grid> = {
  coin: fn(16, 18, (x, y) => {
    const cx = 7.5, cy = 8.5;
    const d = Math.hypot((x - cx) / 7.6, (y - cy) / 8.6);
    if (d > 1) return '.';
    if (d > 0.86) return 'k';
    if (d > 0.72) return x < cx ? 'y' : 'Y';
    const sx = Math.abs(x - cx), sy = Math.abs(y - cy);
    if (sx <= 2.2 && sy <= 5.2) return sx > 1.2 || sy > 4.3 ? 'k' : 'y';
    if (x < cx - 3 && y < cy - 2) return 'w';
    return 'y';
  }),
  vinyl: fn(18, 18, (x, y) => {
    const c = 8.5;
    const d = Math.hypot(x - c, y - c);
    const a = Math.atan2(y - c, x - c);
    if (d > 8.7) return '.';
    if (d > 8.0) return 'k';
    if (d < 0.9) return 'w';
    if (d < 3.0) return d > 2.4 ? 'R' : 'r';
    if (Math.abs(Math.sin(2 * a)) > 0.85 && d > 3.6) return 'v';
    if (Math.abs(d - 5.5) < 0.3) return 'v';
    return 'b';
  }),
  camera: fn(22, 15, (x, y) => {
    if (y < 2) return x >= 3 && x <= 7 ? (y === 0 ? 'k' : 'S') : x >= 14 && x <= 18 ? (y === 0 ? 'k' : 'b') : '.';
    if (y === 2 || y === 14 || x === 0 || x === 21) return 'k';
    const d = Math.hypot(x - 11, y - 8.5);
    if (d < 1.2) return 'w';
    if (d < 2.6) return x < 11 && y < 8 ? 'S' : 'k';
    if (d < 3.6) return 'b';
    if (d < 4.4) return 'S';
    if (d < 5.2) return 'k';
    if (y <= 4) return x > 16 && x < 19 && y === 4 ? 'w' : 's';
    if (y >= 12) return 's';
    return 'b';
  }),
  heart: [
    '..kkkk....kkkk..',
    '.khhhhk..krrrrk.',
    'khhwwhhkkrrrrrRk',
    'khwwhhhhrrrrrrRk',
    'khhhhhhrrrrrrrRk',
    'khhhhhrrrrrrrrRk',
    'krhhrrrrrrrrrrRk',
    '.krrrrrrrrrrrRk.',
    '..krrrrrrrrrRk..',
    '...krrrrrrrRk...',
    '....krrrrrRk....',
    '.....krrrRk.....',
    '......krRk......',
    '.......kk.......',
  ],
  book: [
    '..kkkkkkkkkkkkkkk.',
    '.krrrrrrrrrrrrrrRk',
    'krrrrrrrrrrrrrrRRk',
    'krrrrllllllllrrRRk',
    'krrrrlllllllRrrRRk',
    'krrrrllllllllrrRRk',
    'krrrrrrrrrrrrrrRRk',
    'krrrrrrrrrrrrrrRRk',
    'krrrrrrrrrrrrrrRRk',
    'kRRRRRRRRRRRRRRRRk',
    'kPwPwPwPwPwPwPwPRk',
    'kwPwPwPwPwPwPwPwRk',
    '.kkkkkkkkkkkkkkkk.',
  ],
  gamepad: [
    '...kkkkkkkkkkkkkkk...',
    '..kwwwwwwwwwwwwwwwk..',
    '.kwwwkwwwwwwwwwwrwwk.',
    'kwwwwkwwwwwwwwwwwwwwk',
    'kwwkkkkkwwkwwkwuwwGwk',
    'kwwwwkwwwwwwwwwwwwwwk',
    'kwwwwkwwwwwwwwwwywwwk',
    'kWwwwwwwwkkkkkwwwwwWk',
    '.kWwwwwWk.....kWwwwk.',
    '..kWWWWk.......kWWWk.',
    '...kkkk.........kkk..',
  ],
  plant: [
    '......g...G.......',
    '...G.gGg.GGg..g...',
    '..gGGgGGgGGgg.GG..',
    '.gGGggGGGGggGGGGg.',
    'gGGgGGGgGGGgGGgGGg',
    '.gggGGgggGGGggGgg.',
    '..gGGggGGgggGGgg..',
    '...ggggggggggggg..',
    '..kkkkkkkkkkkkkk..',
    '..kccccccccccCCk..',
    '...kcccccccccCk...',
    '...kcccccccccCk...',
    '...kcwcccccccCk...',
    '....kccccccCCk....',
    '....kkkkkkkkkk....',
  ],
  money: [
    '.kkkkkkkkkkkkkkkkkkkkk',
    'kMMMMMMMMppppMMMMMMMMk',
    'kMmMMMMMMppppMMMMMMmMk',
    'kMMMMmmMMppppMMmmMMMMk',
    'kMMMmMMMMppppMMMMmMMMk',
    'kMMMMmmMMppppMMmmMMMMk',
    'kMMMMMmMMppppMMMMmMMMk',
    'kMmMmmMMMppppMMmmMMmMk',
    'kmmmmmmmmppppmmmmmmmmk',
    'kMMMMMMMMppppMMMMMMMMk',
    'kmmmmmmmmppppmmmmmmmmk',
    '.kkkkkkkkkkkkkkkkkkkk.',
  ],
  cap: [
    '.......kkkkkk.........',
    '.....kkwwwwwwkk.......',
    '....kwwwwwwwwwwk......',
    '...kwwwwwwwwwwwWk.....',
    '..kwwwwwwwwwwwwWWk....',
    '..kwwwwwwwwwwwwWWk....',
    '.kwwwwwwwwwwwwwWWWk...',
    '.kWWWWWWWWWWWWWWWWkkkk',
    '..kkkkkkkkkkkkkkWWWWWk',
    '................kkkkkk',
  ],
  cat: [
    '.k......k....',
    '.kk....kk....',
    '.kbk..kbk....',
    'kkkkkkkkkk...',
    'kkekkkkekk...',
    'kkkkkkkkkk...',
    '.kkkbbkkk....',
    '..kkkkkk.....',
    '.kkkkkkkk....',
    'kkkkkkkkkk...',
    'kkkkkkkkkkk..',
    'kkkkkkkkkkk.k',
    'kkbkkkkkkkk.k',
    'kkkkkkkkkkkkk',
    '.kk.kk.kk.kk.',
  ],
  skate: [
    '...kkkkkkkkkkkkkkkkkkkk..',
    '..kbbbbbbbbbbbbbbbbbbbbk.',
    '.kbbSbbbbbbbbbbbbbbbbSbbk',
    'kbbbbbbbbbbbbbbbbbbbbbbk.',
    '.kkkkkkkkkkkkkkkkkkkkkk..',
    '....kSk...........kSk....',
    '...krrRk.........krrRk...',
    '...kRRRk.........kRRRk...',
    '....kkk...........kkk....',
  ],
  clapper: [
    'kkkkkkkkkkkkkkkkkkk.',
    'kwwBBBwwwBBBwwwBBBk.',
    'kBBwwwBBBwwwBBBwwwBk',
    'kkkkkkkkkkkkkkkkkkkk',
    'kwwwBBBwwwBBBwwwBBBk',
    'kkkkkkkkkkkkkkkkkkkk',
    'kNNNNNNNNNNNNNNNNNNk',
    'kNBBBBBBNNBBBBBBBBNk',
    'kNNNNNNNNNNNNNNNNNNk',
    'kNBBBBNNBBBBBNNBBBNk',
    'kNNNNNNNNNNNNNNNNNNk',
    'kNBBBBBBBBNNNBBBBBNk',
    'kNNNNNNNNNNNNNNNNNNk',
    'kkkkkkkkkkkkkkkkkkkk',
  ],
};

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))),
  );
  return `rgb(${c.join(',')})`;
};

/**
 * Воксельная пиксельная иконка.
 * coarse > 1 — мозаика (пикселизация для переходов).
 * silhouette — заливка чёрным (иконка «превращается в кляксу»).
 */
export const PixelIcon: React.FC<{
  name: string;
  size: number;
  coarse?: number;
  silhouette?: number;
  depth?: number;
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({ name, size, coarse = 1, silhouette = 0, depth = 0.7, shadow = true, style }) => {
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const grid = rows.map((r) => r.padEnd(w, '.'));
  const cells: { x: number; y: number; s: number; c: string }[] = [];
  const step = Math.max(1, Math.round(coarse));
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) {
      // берём доминирующий цвет блока
      const counts: Record<string, number> = {};
      for (let yy = y; yy < Math.min(h, y + step); yy++)
        for (let xx = x; xx < Math.min(w, x + step); xx++) {
          const ch = grid[yy][xx];
          if (PAL[ch]) counts[ch] = (counts[ch] || 0) + 1;
        }
      const keys = Object.keys(counts);
      if (!keys.length) continue;
      const total = keys.reduce((a, k) => a + counts[k], 0);
      if (step > 1 && total < (step * step) / 3) continue;
      const ch = keys.sort((a, b) => counts[b] - counts[a])[0];
      cells.push({ x, y, s: step, c: PAL[ch] });
    }
  const col = (c: string) => (silhouette > 0 ? mix(c, '#0c0c0e', silhouette) : c);
  const d = depth;
  const vbW = w + d + 0.3;
  const vbH = h + d + 0.3;
  return (
    <svg
      width={size}
      height={(size * vbH) / vbW}
      viewBox={`0 0 ${vbW} ${vbH}`}
      shapeRendering="crispEdges"
      style={{
        overflow: 'visible',
        filter: shadow ? 'drop-shadow(0 12px 10px rgba(0,0,0,0.25))' : undefined,
        ...style,
      }}
    >
      {[3, 2, 1].map((k) =>
        cells.map((p, i) => (
          <rect key={`d${k}-${i}`} x={p.x + (d * k) / 3} y={p.y + (d * k) / 3} width={p.s + 0.02} height={p.s + 0.02} fill={col(shade(p.c, 0.42 + k * 0.05))} />
        )),
      )}
      {cells.map((p, i) => (
        <g key={i}>
          <rect x={p.x} y={p.y} width={p.s + 0.02} height={p.s + 0.02} fill={col(p.c)} />
          {step === 1 ? (
            <>
              <rect x={p.x} y={p.y} width={1.02} height={0.15} fill={col(shade(p.c, 1.3))} opacity={0.75} />
              <rect x={p.x} y={p.y} width={0.13} height={1.02} fill={col(shade(p.c, 1.18))} opacity={0.55} />
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
};

function mix(a: string, b: string, t: number) {
  const pa = toRgb(a), pb = toRgb(b);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
function toRgb(c: string): number[] {
  if (c.startsWith('rgb')) return c.match(/\d+/g)!.map(Number);
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
