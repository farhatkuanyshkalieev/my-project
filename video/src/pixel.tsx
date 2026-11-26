import React from 'react';

// Палитра пиксельных иконок
const PAL: Record<string, string> = {
  k: '#17171c',
  w: '#f6f6f4',
  W: '#cfd2d6',
  G: '#b4ff2e',
  g: '#58c41c',
  r: '#ea2a1f',
  R: '#a6150f',
  y: '#ffd23f',
  Y: '#d48f00',
  o: '#b8682a',
  O: '#7d4114',
  s: '#c3c8cf',
  S: '#858b94',
  b: '#2a2a33',
  p: '#f3e8c9',
  B: '#3b82f6',
  m: '#6b3a1e',
};

const circle = (n: number, fn: (d: number, x: number, y: number) => string) => {
  const c = (n - 1) / 2;
  const rows: string[] = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) row += fn(Math.hypot(x - c, y - c), x - c, y - c);
    rows.push(row);
  }
  return rows;
};

export const ICONS: Record<string, string[]> = {
  coin: circle(14, (d, x, y) => {
    if (d > 6.6) return '.';
    if (d > 5.7) return 'Y';
    if (x > -1.2 && x < 1.2 && y > -3.5 && y < 3.5) return 'Y';
    if (x < -2 && y < -2 && d > 3.2) return 'w';
    return 'y';
  }),
  vinyl: circle(16, (d, x, y) => {
    if (d > 7.6) return '.';
    if (d < 0.9) return 'w';
    if (d < 2.6) return 'r';
    if (Math.abs(d - 4.6) < 0.35 || Math.abs(d - 6.2) < 0.35) return 'S';
    if (x > 1 && y < -1 && d > 3.4 && d < 7) return 's';
    return 'b';
  }),
  heart: [
    '..kkk...kkk..',
    '.krrrk.krrrk.',
    'krwwrrkrrrrrk',
    'krwrrrrrrrrRk',
    'krrrrrrrrrrRk',
    'krrrrrrrrrrRk',
    '.krrrrrrrrRk.',
    '..krrrrrrRk..',
    '...krrrrRk...',
    '....krrRk....',
    '.....kRk.....',
    '......k......',
  ],
  sneaker: [
    '.......kkkk......',
    '......kwwwwk.....',
    '.....kwGwwwk.....',
    '....kwwGwwwwk....',
    '...kwwwwGwwwwk...',
    '.kkwwwwwwGwwwwk..',
    'kwwwwwwwwwwwwwwkk',
    'kWWWWWWWWWWWWWWWk',
    'kGGGGGGGGGGGGGGGk',
    '.kkkkkkkkkkkkkkk.',
  ],
  book: [
    '.kkkkkkkkkkkk.',
    'krrrrrrrrrrrRk',
    'krryyyyyyyyrRk',
    'krrrrrrrrrrrRk',
    'krrrryyyyrrrRk',
    'krrrrrrrrrrrRk',
    'krrrrrrrrrrrRk',
    'krrrrrrrrrrrRk',
    'krrrrrrrrrrrRk',
    'kpppppppppppRk',
    'kpWpWpWpWpWpRk',
    '.kkkkkkkkkkkk.',
  ],
  headphones: [
    '....kkkkkk....',
    '..kkbbbbbbkk..',
    '.kbbkkkkkkbbk.',
    '.kbk......kbk.',
    'kbk........kbk',
    'kbk........kbk',
    'kGGk......kGGk',
    'kGGbk....kbGGk',
    'kGGbk....kbGGk',
    'kGGbk....kbGGk',
    '.kkk......kkk.',
  ],
  coffee: [
    '...s...s....',
    '....s.s.....',
    '.kkkkkkkkkk.',
    'kwwwwwwwwwwk',
    '.kwwwwwwwwk.',
    '.kGGGGGGGGk.',
    '.kGgGGGGGGk.',
    '.kwwwwwwwwk.',
    '..kwwwwwwk..',
    '..kwwwwwwk..',
    '..kkkkkkkk..',
  ],
  laptop: [
    '.kkkkkkkkkkkkkk.',
    '.kbbbbbbbbbbbbk.',
    '.kbGGGGGbbbbbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kbGGGbbGGGGbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kkkkkkkkkkkkkk.',
    'kssssssssssssssk',
    'kSSSSSSSSSSSSSSk',
    '.kkkkkkkkkkkkkk.',
  ],
  dumbbell: [
    '.kkk..........kkk.',
    'kbbbk........kbbbk',
    'kbsbkkkkkkkkkkbsbk',
    'kbsbssssssssssbsbk',
    'kbbbkkkkkkkkkkbbbk',
    'kbbbk........kbbbk',
    '.kkk..........kkk.',
  ],
  plant: [
    '.....g..g.....',
    '....gGg.gG....',
    '..g.gGggGGg.g.',
    '.ggGGggGGgGGgg',
    '..gGgggGgggg..',
    '....ggggggg...',
    '.kkkkkkkkkkkk.',
    '.koooooooooOk.',
    '..kooooooOOk..',
    '..kooooooOOk..',
    '...kooooOOk...',
    '...kkkkkkkk...',
  ],
  gamepad: [
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    'kwwkwwwwwwwwrwwk',
    'kwkkkwwwwwwBwGwk',
    'kwwkwwwwwwwwywwk',
    'kwwwwwkkkkwwwwwk',
    '.kwwwk....kwwwk.',
    '..kkk......kkk..',
  ],
  floppy: [
    'kkkkkkkkkkkkkk',
    'kGGkssssssskGk',
    'kGGksssssbskGk',
    'kGGksssssbskGk',
    'kGGkkkkkkkkkGk',
    'kGGGGGGGGGGGGk',
    'kGGwwwwwwwwGGk',
    'kGGwSSSSSSwGGk',
    'kGGwwwwwwwwGGk',
    'kGGwSSSSSSwGGk',
    'kgGwwwwwwwwGgk',
    'kkkkkkkkkkkkkk',
  ],
};

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))),
  );
  return `rgb(${c.join(',')})`;
};

// Воксельная иконка: каждый пиксель — кубик с гранью глубины и бликом
export const PixelIcon: React.FC<{ name: string; size: number; style?: React.CSSProperties }> = ({
  name,
  size,
  style,
}) => {
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const d = 0.55; // глубина экструзии в клетках
  const cells: { x: number; y: number; c: string }[] = [];
  rows.forEach((row, y) =>
    row.padEnd(w, '.').split('').forEach((ch, x) => {
      if (PAL[ch]) cells.push({ x, y, c: PAL[ch] });
    }),
  );
  const vbW = w + d + 0.2;
  const vbH = h + d + 0.2;
  return (
    <svg
      width={size}
      height={(size * vbH) / vbW}
      viewBox={`0 0 ${vbW} ${vbH}`}
      shapeRendering="crispEdges"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 18px 14px rgba(0,0,0,0.28))', ...style }}
    >
      {[3, 2, 1].map((s) =>
        cells.map((p, i) => (
          <rect
            key={`d${s}-${i}`}
            x={p.x + (d * s) / 3}
            y={p.y + (d * s) / 3}
            width={1.02}
            height={1.02}
            fill={shade(p.c, 0.45 + s * 0.04)}
          />
        )),
      )}
      {cells.map((p, i) => (
        <g key={i}>
          <rect x={p.x} y={p.y} width={1.02} height={1.02} fill={p.c} />
          <rect x={p.x} y={p.y} width={1.02} height={0.16} fill={shade(p.c, 1.35)} opacity={0.8} />
          <rect x={p.x} y={p.y} width={0.14} height={1.02} fill={shade(p.c, 1.2)} opacity={0.6} />
        </g>
      ))}
    </svg>
  );
};
