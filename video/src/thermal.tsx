import React from 'react';

type Pt = [number, number];

const smooth = (pts: Pt[], closed = true) => {
  const n = pts.length;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d + (closed ? ' Z' : '');
};

// Профиль головы, лицом влево (кудрявые волосы — зубчатый контур сверху)
const HEAD: Pt[] = [
  [186, 262], [176, 230], [168, 200], [158, 176], [168, 152], [160, 130], [182, 114], [188, 92],
  [212, 88], [222, 66], [250, 72], [264, 50], [294, 60], [312, 44], [338, 62], [364, 56], [372, 80],
  [400, 76], [408, 102], [434, 110], [428, 138], [452, 150], [446, 178], [464, 200], [448, 224],
  [458, 250], [444, 272], [438, 300], [430, 330], [414, 364], [404, 404], [406, 452], [424, 492], [480, 530], [560, 572],
  [620, 640], [640, 760], [170, 760], [196, 690], [214, 620], [222, 566], [224, 520], [214, 486],
  [190, 470], [170, 462], [158, 446], [156, 428], [148, 414], [154, 404], [146, 394], [150, 384],
  [144, 374], [140, 360], [126, 346], [114, 336], [116, 322], [134, 306], [146, 290], [160, 276],
];

// Рука тянется вверх: большой палец влево, пальцы веером
const HAND: Pt[] = [
  [196, 820], [204, 650], [200, 548], [168, 512], [104, 500], [44, 494], [34, 478], [48, 468],
  [104, 466], [160, 462], [172, 440], [126, 344], [96, 278], [94, 258], [110, 254], [130, 270],
  [176, 352], [198, 398], [202, 300], [206, 196], [214, 170], [230, 170], [238, 200], [240, 300],
  [242, 392], [270, 300], [304, 214], [318, 204], [330, 214], [322, 246], [290, 334], [272, 414],
  [312, 362], [348, 322], [362, 324], [358, 344], [306, 432], [290, 486], [278, 548], [284, 650],
  [304, 820],
];

const Thermal: React.FC<{
  pts: Pt[];
  vb: [number, number];
  width: number;
  frame: number;
  id: string;
  dark?: number; // 0..1 — переход в тёмный силуэт
  style?: React.CSSProperties;
}> = ({ pts, vb, width, frame, id, dark = 0, style }) => {
  const path = smooth(pts);
  const seed = Math.floor(frame / 2);
  return (
    <svg width={width} height={(width * vb[1]) / vb[0]} viewBox={`0 0 ${vb[0]} ${vb[1]}`} style={{ overflow: 'visible', ...style }}>
      <defs>
        <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8261a" />
          <stop offset="0.3" stopColor="#ee4a1c" />
          <stop offset="0.55" stopColor="#ff7a22" />
          <stop offset="0.75" stopColor="#ffad33" />
          <stop offset="0.9" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#fff6dc" />
        </linearGradient>
        <radialGradient id={`${id}-hot`} cx="0.45" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-f`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves={3} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={3} />
        </filter>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      <g opacity={1 - dark}>
        <path d={path} fill="#ff4a14" opacity={0.35} filter={`url(#${id}-glow)`} />
        <path d={path} fill={`url(#${id}-v)`} filter={`url(#${id}-f)`} />
        <path d={path} fill={`url(#${id}-hot)`} filter={`url(#${id}-f)`} />
      </g>
      {dark > 0 ? <path d={path} fill="#2a2426" opacity={dark} filter={`url(#${id}-f)`} /> : null}
    </svg>
  );
};

// смягчаем зубцы волос: усредняем соседние точки в зоне причёски (индексы 2..26)
const HEAD_SOFT: Pt[] = HEAD.map((p, i) => {
  if (i < 2 || i > 26) return p;
  const a = HEAD[i - 1], b = HEAD[i + 1];
  return [p[0] * 0.72 + (a[0] + b[0]) * 0.14, p[1] * 0.72 + (a[1] + b[1]) * 0.14];
});

export const ThermalHead: React.FC<{ width: number; frame: number; dark?: number; style?: React.CSSProperties }> = (p) => (
  <Thermal pts={HEAD_SOFT} vb={[640, 760]} id="head" {...p} />
);

export const ThermalHand: React.FC<{ width: number; frame: number; dark?: number; style?: React.CSSProperties }> = (p) => (
  <Thermal pts={HAND} vb={[400, 820]} id="hand" {...p} />
);

export { smooth };
