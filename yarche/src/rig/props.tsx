// Props: the paper cup with Mark's marker doodle, hands, marker, phone.
import React from 'react';
import {clamp} from '../lib/anim';
import {P, SKIN} from '../lib/design';

type Pt = [number, number];

// Catmull-Rom -> dense polyline
const smooth = (pts: Pt[], closed = false, seg = 10): Pt[] => {
  const out: Pt[] = [];
  const n = pts.length;
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(closed ? pts[0] : pts[n - 1]);
  return out;
};

const ell = (cx: number, cy: number, rx: number, ry: number, n = 14, chin = 0): Pt[] =>
  Array.from({length: n}).map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const yy = Math.sin(a);
    return [cx + Math.cos(a) * rx * (yy > 0.6 ? 1 - chin * (yy - 0.6) : 1), cy + yy * ry];
  });

// The doodle: her portrait + a heart, in cup-local coordinates
const RAW: {pts: Pt[]; closed?: boolean}[] = [
  {pts: ell(0, 120, 31, 41, 16, 0.9), closed: true},
  {pts: [[-4, 76], [-30, 84], [-42, 112], [-44, 150], [-46, 186]]},
  {pts: [[4, 76], [30, 84], [42, 112], [44, 150], [46, 186]]},
  {pts: [[-21, 115], [-14, 106], [-6, 114]]},
  {pts: [[6, 114], [14, 106], [21, 115]]},
  {pts: [[-11, 139], [-5, 134], [0, 137], [5, 134], [11, 139], [0, 147], [-11, 139]]},
  {pts: [[40, 66], [34, 56], [42, 50], [48, 58], [54, 50], [62, 56], [56, 66], [48, 76], [40, 66]]},
  {pts: [[-50, 60], [-44, 70]]},
  {pts: [[-58, 76], [-48, 78]]},
];
const STROKES = RAW.map((s) => {
  const pts = smooth(s.pts, s.closed);
  let len = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cum.push(len);
  }
  return {pts, len, cum};
});
const TOTAL = STROKES.reduce((a, s) => a + s.len, 0);

// Marker tip position for a given draw progress (cup-local)
export const doodleTip = (p: number): Pt => {
  let L = clamp(p) * TOTAL;
  for (const s of STROKES) {
    if (L <= s.len) {
      let i = 1;
      while (i < s.cum.length - 1 && s.cum[i] < L) i++;
      const t = (L - s.cum[i - 1]) / Math.max(0.0001, s.cum[i] - s.cum[i - 1]);
      return [s.pts[i - 1][0] + (s.pts[i][0] - s.pts[i - 1][0]) * t, s.pts[i - 1][1] + (s.pts[i][1] - s.pts[i - 1][1]) * t];
    }
    L -= s.len;
  }
  const last = STROKES[STROKES.length - 1];
  return last.pts[last.pts.length - 1];
};

export const Doodle: React.FC<{progress: number; color?: string; width?: number; opacity?: number}> = ({
  progress,
  color = P.pink,
  width = 3.4,
  opacity = 1,
}) => {
  let L = clamp(progress) * TOTAL;
  return (
    <g opacity={opacity}>
      {STROKES.map((s, i) => {
        const vis = Math.max(0, Math.min(s.len, L));
        L -= s.len;
        if (vis <= 0) return null;
        return (
          <polyline
            key={i}
            points={s.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${s.len} ${s.len + 10}`}
            strokeDashoffset={s.len - vis}
          />
        );
      })}
    </g>
  );
};

// Paper cup, origin = top centre of the body (under the lid). ~140 wide, 230 tall.
export const Cup: React.FC<{id: string; doodle?: number; doodleColor?: string; doodleOpacity?: number; steam?: number; frame?: number}> = ({
  id,
  doodle = 0,
  doodleColor = P.pink,
  doodleOpacity = 1,
  steam = 0,
  frame = 0,
}) => (
  <g>
    <defs>
      <linearGradient id={`${id}-cup`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#D9CFC8" />
        <stop offset="0.25" stopColor="#FFFDF9" />
        <stop offset="0.6" stopColor="#F4ECE4" />
        <stop offset="1" stopColor="#BDB1A9" />
      </linearGradient>
      <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#E9E3DE" />
        <stop offset="0.3" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#C9C0BA" />
      </linearGradient>
    </defs>
    {steam > 0 &&
      [0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${-20 + i * 20},-30 C${-30 + i * 20 + Math.sin(frame / 20 + i) * 10},-70 ${-10 + i * 20},-90 ${-20 + i * 20 + Math.sin(frame / 15 + i) * 12},-130`}
          stroke="#fff"
          strokeWidth={8}
          fill="none"
          opacity={steam * 0.25}
          strokeLinecap="round"
        />
      ))}
    <path d="M-70,0 L70,0 L52,232 C40,240 -40,240 -52,232 Z" fill={`url(#${id}-cup)`} />
    <path d="M-70,0 L70,0 L68,22 L-68,22 Z" fill="#000" opacity={0.06} />
    <g transform="translate(0 0)">
      <Doodle progress={doodle} color={doodleColor} opacity={doodleOpacity} />
    </g>
    <rect x={-80} y={-14} width={160} height={18} rx={7} fill={`url(#${id}-lid)`} />
    <path d="M-66,-14 C-60,-34 60,-34 66,-14 Z" fill={`url(#${id}-lid)`} />
    <rect x={18} y={-30} width={22} height={6} rx={3} fill="#CFC6C0" />
  </g>
);

// A hand wrapped around something: fingers to the right of the palm edge, sleeve cuff on the left.
export const HandWrap: React.FC<{who: 'lisa' | 'mark'; flip?: boolean; rings?: boolean; sleeve?: string}> = ({who, flip, rings, sleeve}) => {
  const S = SKIN[who];
  const nail = who === 'lisa' ? '#D11E3F' : S.light;
  const fw = who === 'lisa' ? 30 : 36;
  const cuff = sleeve ?? (who === 'lisa' ? P.pink : '#3A2620');
  return (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      <path d={`M-120,-40 C-70,-70 -30,-62 -16,-44 C-4,-10 -4,${fw * 3} -14,${fw * 3 + 20} C-40,${fw * 3 + 46} -100,${fw * 3 + 40} -130,${fw * 3 + 10} Z`} fill={S.shade} />
      <path d={`M-110,-30 C-70,-56 -36,-50 -24,-36`} stroke={S.light} strokeWidth={6} opacity={0.5} fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => {
        const y = -50 + i * fw;
        const len = [86, 94, 88, 72][i];
        const h = fw - 4;
        return (
          <g key={i}>
            <path d={`M-34,${y} L${len - 30 - h / 2},${y} A${h / 2},${h / 2} 0 0 1 ${len - 30 - h / 2},${y + h} L-34,${y + h} Z`} fill={S.base} />
            <path d={`M-34,${y + h * 0.62} L${len - 34 - h / 2},${y + h * 0.62}`} stroke={S.shade} strokeWidth={h * 0.32} opacity={0.45} />
            <path d={`M-28,${y + 4} L${len * 0.62},${y + 4}`} stroke={S.light} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
            <path d={`M${len - 30 - h / 2 - 6},${y + 3} q${h / 2 + 4},0 ${h / 2 + 4},${h / 2 - 3} q0,${h / 2 - 3} -${h / 2 + 4},${h / 2 - 3} Z`} fill={nail} />
            <path d={`M${len - 30 - h / 2 - 2},${y + 6} q6,0 8,4`} stroke="#fff" strokeWidth={2} opacity={0.5} fill="none" />
            {rings && (i === 1 || i === 2) && <rect x={0} y={y - 1} width={11} height={h + 2} rx={4} fill={P.gold} />}
            {i < 3 && <path d={`M-34,${y + h + 2} L${len - 40},${y + h + 2}`} stroke={S.deep} strokeWidth={2} opacity={0.35} />}
          </g>
        );
      })}
      <path d={`M-200,-70 C-150,-90 -120,-80 -110,-50 C-104,10 -104,${fw * 3} -116,${fw * 3 + 40} C-160,${fw * 3 + 60} -210,${fw * 3 + 60} -240,${fw * 3 + 30} Z`} fill={cuff} />
      {Array.from({length: 6}).map((_, i) => (
        <path key={i} d={`M${-200 + i * 16},-70 L${-196 + i * 16},${fw * 3 + 50}`} stroke="#000" strokeOpacity={0.15} strokeWidth={4} />
      ))}
    </g>
  );
};

// Marker pen, tip at origin pointing down-left
export const Marker: React.FC<{cap?: boolean}> = ({cap}) => (
  <g>
    <path d="M0,0 L10,-14 L18,-8 Z" fill="#E63E86" />
    <rect x={8} y={-150} width={26} height={150} rx={8} transform="rotate(34 8 -10)" fill="#1C1622" />
    <rect x={12} y={-140} width={6} height={120} rx={3} transform="rotate(34 8 -10)" fill="#fff" opacity={0.2} />
    <rect x={8} y={-150} width={26} height={36} rx={8} transform="rotate(34 8 -10)" fill={P.pink} />
    {cap && <rect x={6} y={-40} width={30} height={48} rx={8} transform="rotate(34 8 -10)" fill={P.pink} />}
  </g>
);

export const Phone: React.FC<{children?: React.ReactNode; glow?: number}> = ({children, glow = 1}) => (
  <g>
    <rect x={-120} y={-250} width={240} height={500} rx={36} fill="#16131C" />
    <rect x={-110} y={-240} width={220} height={480} rx={30} fill="#0E0C12" />
    <g clipPath="url(#phone-screen)">{children}</g>
    <defs>
      <clipPath id="phone-screen">
        <rect x={-108} y={-238} width={216} height={476} rx={28} />
      </clipPath>
    </defs>
    <rect x={-36} y={-230} width={72} height={18} rx={9} fill="#000" />
    <rect x={-108} y={-238} width={216} height={476} rx={28} fill="#fff" opacity={0.04 * glow} />
  </g>
);
