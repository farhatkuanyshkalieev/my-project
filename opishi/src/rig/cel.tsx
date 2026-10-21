// Angular cel-shading toolkit: soft-cornered polygons, eyes, brows, mouth in the show style.
import React from 'react';
import {clamp, lerp} from '../lib/anim';

export type Pt = [number, number];
const f = (n: number) => n.toFixed(1);

// Polygon with softly rounded corners (r = fraction of each edge used for the round-off)
export const soft = (pts: Pt[], r = 0.2, closed = true): string => {
  const n = pts.length;
  if (n < 3) return '';
  let d = '';
  const at = (i: number) => pts[(i + n) % n];
  const start = closed ? 0 : 1;
  const end = closed ? n : n - 1;
  if (!closed) d += `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = start; i < end; i++) {
    const p = at(i);
    const a = at(i - 1);
    const b = at(i + 1);
    const s: Pt = [p[0] + (a[0] - p[0]) * r, p[1] + (a[1] - p[1]) * r];
    const e: Pt = [p[0] + (b[0] - p[0]) * r, p[1] + (b[1] - p[1]) * r];
    d += `${d === '' ? 'M' : 'L'}${f(s[0])},${f(s[1])} Q${f(p[0])},${f(p[1])} ${f(e[0])},${f(e[1])}`;
  }
  if (!closed) d += ` L${f(pts[n - 1][0])},${f(pts[n - 1][1])}`;
  return closed ? d + 'Z' : d;
};

export const poly = (pts: Pt[]) => 'M' + pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' L') + 'Z';

// Cel eye: almond with thick lash line, flat iris, sharp catch-lights. Lid closes onto the lower edge.
export const CelEye: React.FC<{
  x: number;
  y: number;
  side: -1 | 1;
  w: number;
  h: number;
  lid: number;
  squint: number;
  gazeX: number;
  gazeY: number;
  iris: string;
  irisDark: string;
  ink: string;
  sclera?: string;
  wing?: number;
  heavy?: number;
  cloudy?: number;
  sx?: number;
  id: string;
}> = ({x, y, side, w, h, lid, squint, gazeX, gazeY, iris, irisDark, ink, sclera = '#FBF4EE', wing = 0, heavy = 0, cloudy = 0, sx = 1, id}) => {
  const hw = (w / 2) * sx;
  const ix = -side * hw;
  const ox = side * hw;
  const L = clamp(lid + heavy * 0.4, -0.3, 1);
  const top = lerp(-h * 1.15, h * 0.55, L);
  const bot = lerp(h * 0.85, h * 0.1, clamp(squint) * 0.8);
  const upper: Pt[] = [[ix, 3], [ix + (ox - ix) * 0.3, top], [ix + (ox - ix) * 0.72, top * 0.92 - 2], [ox, -h * 0.28]];
  const lower: Pt[] = [[ox, -h * 0.28], [ix + (ox - ix) * 0.68, Math.max(bot, top + 1)], [ix + (ox - ix) * 0.25, Math.max(bot * 0.9, top + 1)], [ix, 3]];
  const shape = 'M' + [...upper, ...lower.slice(1)].map((p) => `${f(p[0])},${f(p[1])}`).join(' L') + 'Z';
  const r = h * 0.95;
  const gx = gazeX * hw * 0.45;
  const gy = gazeY * h * 0.35 + h * 0.15;
  const open = 1 - clamp(L);
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      <defs>
        <clipPath id={`${id}-c`}>
          <path d={shape} />
        </clipPath>
      </defs>
      {open > 0.04 && (
        <g clipPath={`url(#${id}-c)`}>
          <rect x={-hw - 5} y={-h * 2} width={hw * 2 + 10} height={h * 4} fill={sclera} />
          <circle cx={gx} cy={gy} r={r} fill={iris} />
          <path d={`M${f(gx - r)},${f(gy)} A${f(r)},${f(r)} 0 0 1 ${f(gx + r)},${f(gy)} Z`} fill={irisDark} opacity={0.75} />
          <circle cx={gx} cy={gy} r={r * 0.45} fill="#0D0709" />
          {cloudy > 0 && <circle cx={gx} cy={gy} r={r * 1.02} fill="#DCE6EE" opacity={cloudy * 0.6} />}
          <rect x={gx - r * 0.55} y={gy - r * 0.62} width={r * 0.42} height={r * 0.32} fill="#fff" transform={`rotate(-20 ${f(gx)} ${f(gy)})`} />
          <circle cx={gx + r * 0.42} cy={gy + r * 0.38} r={r * 0.12} fill="#fff" opacity={0.85} />
          {/* lid shadow */}
          <path d={'M' + upper.map((p) => `${f(p[0])},${f(p[1])}`).join(' L')} stroke="#000" strokeOpacity={0.25} strokeWidth={h * 0.7} fill="none" />
        </g>
      )}
      <path d={'M' + upper.map((p) => `${f(p[0])},${f(p[1])}`).join(' L')} stroke={ink} strokeWidth={h * 0.32} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {wing > 0 && <path d={`M${f(ox - side * 4)},${f(-h * 0.28)} L${f(ox + side * wing)},${f(-h * 0.28 - wing * 0.5)} L${f(ox - side * 2)},${f(-h * 0.05)} Z`} fill={ink} />}
      <path d={'M' + lower.map((p) => `${f(p[0])},${f(p[1])}`).join(' L')} stroke={ink} strokeWidth={2} strokeOpacity={0.45} fill="none" />
    </g>
  );
};

// Flat angular brow: a tapered bar. notch = slits cut in at the inner end (Timur's barber notches)
export const CelBrow: React.FC<{
  x: number;
  y: number;
  side: -1 | 1;
  len: number;
  thick: number;
  taper?: number;
  raise: number;
  inner: number;
  color: string;
  notch?: string;
  angle?: number;
  sx?: number;
}> = ({x, y, side, len, thick, taper = 0.55, raise, inner, color, notch, angle = 6, sx = 1}) => {
  const L = len * sx;
  const ix = -side * L * 0.45;
  const ox = side * L * 0.55;
  const ry = -raise * 18;
  const iy = ry - inner * 22;
  const oy = ry + inner * 6 + angle;
  const pts: Pt[] = [
    [ix, iy - thick / 2],
    [ix + (ox - ix) * 0.6, (iy + oy) / 2 - thick * 0.62 - 3],
    [ox, oy - thick * taper * 0.5],
    [ox, oy + thick * taper * 0.4],
    [ix + (ox - ix) * 0.55, (iy + oy) / 2 + thick * 0.42],
    [ix, iy + thick / 2],
  ];
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      <path d={soft(pts, 0.12)} fill={color} />
      {notch &&
        [0.16, 0.26].map((t, i) => {
          const px = lerp(ix, ox, t);
          const py = lerp(iy, oy, t);
          return <rect key={i} x={px - 2.2} y={py - thick} width={4.4} height={thick * 2} fill={notch} transform={`rotate(${side * 14} ${f(px)} ${f(py)})`} />;
        })}
    </g>
  );
};

// Show-style mouth: flat lips with an ink line, wide toothy grin when smile+open are high.
export const CelMouth: React.FC<{
  x: number;
  y: number;
  hw: number;
  up: number;
  lo: number;
  open: number;
  smile: number;
  wide: number;
  lip: string;
  lipDark: string;
  ink: string;
  sx?: number;
  id: string;
}> = ({x, y, hw: hw0, up, lo, open, smile, wide, lip, lipDark, ink, sx = 1, id}) => {
  const o = clamp(open, 0, 1.2);
  const s = clamp(smile, -1, 1.2);
  const hw = hw0 * sx * (1 + 0.18 * wide + 0.14 * Math.max(0, s)) * (1 - 0.25 * Math.max(0, -wide));
  const cy = -s * hw0 * (s < 0 ? 0.38 : 0.3);
  const oh = o * hw0 * 0.9 * (1 + 0.3 * Math.max(0, -wide));
  const seam = 1 + s * 3 - o * 3;
  const ut = up * (1 - o * 0.3);
  const lt = lo * (1 - o * 0.15);
  const top: Pt[] = [[-hw, cy], [-hw * 0.45, -ut - o * 2], [-hw * 0.12, -ut * 1.05 - o * 2], [0, -ut * 0.7 - o * 2], [hw * 0.12, -ut * 1.05 - o * 2], [hw * 0.45, -ut - o * 2], [hw, cy]];
  const seamPts: Pt[] = [[hw, cy], [hw * 0.5, seam + cy * 0.3], [0, seam + (s > 0 ? s * 4 : 0)], [-hw * 0.5, seam + cy * 0.3], [-hw, cy]];
  const lowTop: Pt[] = [[-hw, cy], [-hw * 0.5, seam + oh * 0.85 + cy * 0.25], [0, seam + oh], [hw * 0.5, seam + oh * 0.85 + cy * 0.25], [hw, cy]];
  const lowBot: Pt[] = [[hw, cy], [hw * 0.55, seam + oh + lt * 1.05], [0, seam + oh + lt * 1.25], [-hw * 0.55, seam + oh + lt * 1.05], [-hw, cy]];
  const P = (a: Pt[]) => a.map((p) => `${f(p[0])},${f(p[1])}`).join(' L');
  const openShape = `M${P(seamPts.slice().reverse())} L${P(lowTop.slice(1))}Z`;
  const teethH = Math.min(oh * 0.55, up * 1.2) + Math.max(0, s) * 4;
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      <defs>
        <clipPath id={`${id}-o`}>
          <path d={openShape} />
        </clipPath>
      </defs>
      {oh > 1 && (
        <g clipPath={`url(#${id}-o)`}>
          <rect x={-hw} y={-40} width={hw * 2} height={200} fill="#3A0F18" />
          <path d={`M${f(-hw)},${f(seam - 6)} L${f(hw)},${f(seam - 6)} L${f(hw * 0.8)},${f(seam + teethH)} L${f(-hw * 0.8)},${f(seam + teethH)} Z`} fill="#FFF8F2" />
          {s > 0.5 &&
            [-0.45, -0.15, 0.15, 0.45].map((t) => <line key={t} x1={hw * t} y1={seam} x2={hw * t * 0.95} y2={seam + teethH} stroke="#D9C9C4" strokeWidth={1.6} />)}
          <path d={`M${f(-hw * 0.55)},${f(seam + oh + 6)} Q0,${f(seam + oh * 0.45)} ${f(hw * 0.55)},${f(seam + oh + 6)} Z`} fill="#D2566C" />
        </g>
      )}
      <path d={`M${P(top)} L${P(seamPts.slice(1))}Z`} fill={lipDark} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`M${P(lowTop)} L${P(lowBot.slice(1))}Z`} fill={lip} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      {/* hard highlight on lower lip */}
      <path d={`M${f(-hw * 0.32)},${f(seam + oh + lt * 0.55)} L${f(hw * 0.05)},${f(seam + oh + lt * 0.42)} L${f(hw * 0.02)},${f(seam + oh + lt * 0.72)} L${f(-hw * 0.28)},${f(seam + oh + lt * 0.8)} Z`} fill="#fff" opacity={0.3} />
    </g>
  );
};
