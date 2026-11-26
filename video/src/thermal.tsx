import React from 'react';

type Pt = [number, number];

// Сглаживание ломаной в кривую (Catmull-Rom -> Bezier), замкнутый контур
const smooth = (pts: Pt[]) => {
  const n = pts.length;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d + ' Z';
};

const HEAD: Pt[] = [
  [20, 520], [60, 440], [120, 405], [168, 392], [160, 350], [140, 335], [128, 318], [118, 304],
  [124, 296], [112, 288], [120, 278], [114, 268], [92, 252], [84, 242], [100, 232], [110, 214],
  [112, 192], [116, 160], [128, 118], [160, 82], [200, 62], [246, 58], [290, 72], [330, 104],
  [352, 150], [356, 200], [346, 250], [326, 296], [312, 336], [318, 380], [370, 412], [420, 450],
  [440, 520],
];

const HAND: Pt[] = [
  [170, 640], [166, 470], [150, 430], [112, 392], [72, 352], [56, 322], [70, 308], [100, 322],
  [134, 350], [140, 300], [128, 200], [126, 150], [142, 138], [158, 152], [168, 260], [176, 128],
  [188, 108], [206, 116], [210, 250], [222, 140], [238, 126], [254, 140], [244, 268], [264, 186],
  [280, 176], [292, 190], [276, 300], [272, 390], [262, 470], [258, 640],
];

const Thermal: React.FC<{
  pts: Pt[];
  vb: [number, number];
  width: number;
  frame: number;
  id: string;
  core: [number, number];
  style?: React.CSSProperties;
}> = ({ pts, vb, width, frame, id, core, style }) => {
  const path = smooth(pts);
  const seed = Math.floor(frame / 2);
  return (
    <svg width={width} height={(width * vb[1]) / vb[0]} viewBox={`0 0 ${vb[0]} ${vb[1]}`} style={{ overflow: 'visible', ...style }}>
      <defs>
        <radialGradient id={`${id}-g`} cx={core[0]} cy={core[1]} r="0.75">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.18" stopColor="#ffd34a" />
          <stop offset="0.42" stopColor="#ff8a1c" />
          <stop offset="0.68" stopColor="#f0391a" />
          <stop offset="1" stopColor="#8a0f1a" />
        </radialGradient>
        <filter id={`${id}-f`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves={2} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={3.2} />
        </filter>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={26} />
        </filter>
      </defs>
      <path d={path} fill="#ff5a1f" opacity={0.45} filter={`url(#${id}-glow)`} />
      <path d={path} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  );
};

export const ThermalHead: React.FC<{ width: number; frame: number; style?: React.CSSProperties }> = (p) => (
  <Thermal pts={HEAD} vb={[460, 520]} id="head" core={[0.42, 0.62]} {...p} />
);

export const ThermalHand: React.FC<{ width: number; frame: number; style?: React.CSSProperties }> = (p) => (
  <Thermal pts={HAND} vb={[340, 640]} id="hand" core={[0.6, 0.62]} {...p} />
);
