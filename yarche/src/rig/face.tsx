// Reusable SVG face parts: eye, brow, mouth. All drawn around a local origin.
import React from 'react';
import {clamp, lerp} from '../lib/anim';

const f = (n: number) => n.toFixed(2);

export type EyeStyle = {
  w: number; // eye width
  h: number; // half opening
  tiltOuter: number; // outer corner lift (px)
  iris: [string, string]; // inner, outer
  irisR: number;
  liner: string;
  linerW: number;
  wing: number; // winged liner length
  lashes: number; // 0..1
  lidSkin: string;
  crease: string;
  sclera: string;
  heavyLid: number; // permanent lid weight 0..1 (sleepy look)
};

export const Eye: React.FC<{
  id: string;
  x: number;
  y: number;
  side: -1 | 1; // -1 screen-left eye, +1 screen-right eye
  st: EyeStyle;
  lid: number;
  squint: number;
  gazeX: number;
  gazeY: number;
  scaleX?: number;
}> = ({id, x, y, side, st, lid, squint, gazeX, gazeY, scaleX = 1}) => {
  const hw = (st.w / 2) * scaleX;
  const h = st.h;
  const ix = -side * hw; // inner corner (toward nose)
  const ox = side * hw;
  const iy = 2;
  const oy = -st.tiltOuter;
  const L = clamp(lid + st.heavyLid * 0.35, -0.35, 1);
  // upper edge control heights: open -> closed onto lower edge
  const upY = lerp(-h * 1.3, h * 0.62, L);
  const upY2 = lerp(-h * 1.18, h * 0.58, L);
  const sq = clamp(squint, 0, 1);
  const loY = lerp(h * 0.78, -h * 0.05, sq * 0.75);
  const loY2 = lerp(h * 0.7, -h * 0.08, sq * 0.75);
  const dx = ox - ix;
  const upper = `M${f(ix)},${f(iy)} C${f(ix + dx * 0.22)},${f(upY)} ${f(ix + dx * 0.7)},${f(upY2)} ${f(ox)},${f(oy)}`;
  const lower = `C${f(ix + dx * 0.72)},${f(Math.max(loY2, upY2 * 0.9))} ${f(ix + dx * 0.28)},${f(Math.max(loY, upY * 0.9))} ${f(ix)},${f(iy)}`;
  const opening = `${upper} ${lower} Z`;
  const irisX = gazeX * hw * 0.42;
  const irisY = gazeY * h * 0.45 + h * 0.08;
  const r = st.irisR;
  const openAmt = 1 - clamp(L, 0, 1);
  // crease follows the lid but travels less
  const crY = lerp(-h * 2.1, -h * 0.9, clamp(L, 0, 1) * 0.6);
  const crease = `M${f(ix + dx * 0.05)},${f(iy - h * 0.6)} C${f(ix + dx * 0.25)},${f(crY)} ${f(ix + dx * 0.75)},${f(crY + 1)} ${f(ox + side * 4)},${f(oy - h * 0.5)}`;
  const wingPath = `M${f(ox - side * 6)},${f(oy - 1)} L${f(ox + side * st.wing)},${f(oy - st.wing * 0.55)} L${f(ox - side * 2)},${f(oy + 3)} Z`;
  const lashes = [] as React.ReactNode[];
  if (st.lashes > 0) {
    for (let i = 0; i < 7; i++) {
      const t = 0.35 + i * 0.1;
      // point on the upper bezier
      const bx = bez(ix, ix + dx * 0.22, ix + dx * 0.7, ox, t);
      const by = bez(iy, upY, upY2, oy, t);
      const len = st.lashes * (6 + i * 1.6) * (0.4 + 0.6 * openAmt);
      lashes.push(
        <path
          key={i}
          d={`M${f(bx)},${f(by)} q${f(side * len * 0.5)},${f(-len * 0.6)} ${f(side * len)},${f(-len * 0.9)}`}
          stroke={st.liner}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />,
      );
    }
  }
  return (
    <g transform={`translate(${f(x)},${f(y)})`}>
      <defs>
        <filter id={`${id}-lidb`} x="-50%" y="-80%" width="200%" height="260%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <path d={opening} />
        </clipPath>
        <radialGradient id={`${id}-iris`} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor={st.iris[0]} />
          <stop offset="1" stopColor={st.iris[1]} />
        </radialGradient>
        <linearGradient id={`${id}-scl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B99A95" />
          <stop offset="0.45" stopColor={st.sclera} />
          <stop offset="1" stopColor={st.sclera} />
        </linearGradient>
      </defs>
      {/* lid shading under crease */}
      <path d={crease} stroke={st.crease} strokeWidth={3} fill="none" opacity={0.55} strokeLinecap="round" />
      <ellipse cx={side * hw * 0.15} cy={-h * 1.25} rx={hw * 1.05} ry={h * 1.15} fill={st.lidSkin} opacity={0.32} filter={`url(#${id}-lidb)`} />
      {openAmt > 0.02 && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect x={-hw - 10} y={-h * 3} width={hw * 2 + 20} height={h * 6} fill={`url(#${id}-scl)`} />
          <circle cx={irisX} cy={irisY} r={r} fill={`url(#${id}-iris)`} />
          <circle cx={irisX} cy={irisY} r={r} fill="none" stroke="#1d1016" strokeOpacity={0.55} strokeWidth={2} />
          <circle cx={irisX} cy={irisY} r={r * 0.42} fill="#120A0E" />
          <circle cx={irisX - r * 0.35} cy={irisY - r * 0.4} r={r * 0.22} fill="#fff" opacity={0.95} />
          <circle cx={irisX + r * 0.4} cy={irisY + r * 0.35} r={r * 0.09} fill="#fff" opacity={0.7} />
          {/* lid cast shadow */}
          <path d={upper} stroke="#3a1a1a" strokeOpacity={0.35} strokeWidth={h * 0.9} fill="none" />
        </g>
      )}
      {/* lower lash line */}
      <path d={`M${f(ox)},${f(oy)} ${lower}`} stroke={st.liner} strokeOpacity={0.35} strokeWidth={1.6} fill="none" />
      {/* upper liner */}
      <path d={upper} stroke={st.liner} strokeWidth={st.linerW} fill="none" strokeLinecap="round" />
      {st.wing > 0 && <path d={wingPath} fill={st.liner} />}
      {lashes}
    </g>
  );
};

const bez = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

export const Brow: React.FC<{
  x: number;
  y: number;
  side: -1 | 1;
  len: number;
  thickIn: number;
  thickOut: number;
  arch: number;
  raise: number;
  inner: number;
  color: string;
  angular?: boolean;
  scaleX?: number;
}> = ({x, y, side, len, thickIn, thickOut, arch, raise, inner, color, angular, scaleX = 1}) => {
  const L = len * scaleX;
  const ix = -side * L * 0.42;
  const ox = side * L * 0.58;
  const ry = -raise * 16;
  const iy = ry - inner * 22;
  const oy = ry + inner * 6 + 6;
  const peakX = ix + (ox - ix) * (angular ? 0.62 : 0.55);
  const peakY = ry - arch;
  const top = angular
    ? `M${f(ix)},${f(iy - thickIn / 2)} L${f(peakX)},${f(peakY - thickOut * 0.75)} L${f(ox)},${f(oy - 1)}`
    : `M${f(ix)},${f(iy - thickIn / 2)} Q${f(peakX)},${f(peakY - thickOut * 1.2)} ${f(ox)},${f(oy - 1)}`;
  const bottom = angular
    ? `L${f(ox - side * 3)},${f(oy + 2)} L${f(peakX)},${f(peakY + thickOut * 0.6)} L${f(ix)},${f(iy + thickIn / 2)} Z`
    : `Q${f(peakX)},${f(peakY + thickOut * 0.7)} ${f(ix)},${f(iy + thickIn / 2)} Z`;
  return (
    <g transform={`translate(${f(x)},${f(y)})`}>
      <path d={`${top} ${bottom}`} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {/* hair texture */}
      {[0.15, 0.3, 0.45, 0.6, 0.75].map((t, i) => {
        const px = lerp(ix, ox, t);
        const py = lerp(iy, oy, t) - Math.sin(t * Math.PI) * arch * 0.9;
        return (
          <path
            key={i}
            d={`M${f(px)},${f(py + thickIn * 0.3)} l${f(side * 9)},${f(-thickIn * 0.55)}`}
            stroke="#ffffff"
            strokeOpacity={0.1}
            strokeWidth={1.5}
          />
        );
      })}
    </g>
  );
};

export type MouthStyle = {
  hw: number; // half width
  upper: number; // upper lip thickness
  lower: number; // lower lip thickness
  lip: [string, string]; // light, dark
  line: string;
  gloss: number;
};

export const Mouth: React.FC<{
  id: string;
  x: number;
  y: number;
  st: MouthStyle;
  open: number;
  smile: number;
  wide: number;
  scaleX?: number;
}> = ({id, x, y, st, open, smile, wide, scaleX = 1}) => {
  const o = clamp(open, 0, 1.2);
  const s = clamp(smile, -1, 1.2);
  const hw = st.hw * scaleX * (1 + 0.14 * wide + 0.1 * Math.max(0, s)) * (1 - 0.22 * Math.max(0, -wide));
  const cy = -s * st.hw * (s < 0 ? 0.42 : 0.26); // corner height
  const oh = o * st.hw * 0.95 * (1 + 0.35 * Math.max(0, -wide));
  const ut = st.upper * (1 - o * 0.18);
  const lt = st.lower * (1 - o * 0.12);
  const lift = o * 3; // upper lip lifts a touch when open
  const upperTop = `M${f(-hw)},${f(cy)} C${f(-hw * 0.7)},${f(cy - ut * 0.55)} ${f(-hw * 0.38)},${f(-ut * 1.12 - lift)} ${f(-hw * 0.16)},${f(-ut - lift)} Q0,${f(-ut * 0.62 - lift)} ${f(hw * 0.16)},${f(-ut - lift)} C${f(hw * 0.38)},${f(-ut * 1.12 - lift)} ${f(hw * 0.7)},${f(cy - ut * 0.55)} ${f(hw)},${f(cy)}`;
  // seam (upper lip bottom edge), dips at centre for a smile
  const seamMid = 2 - lift + s * 2;
  const upperBottomRev = `C${f(hw * 0.55)},${f(cy * 0.35 + seamMid - o * 2)} ${f(hw * 0.2)},${f(seamMid)} 0,${f(seamMid)} C${f(-hw * 0.2)},${f(seamMid)} ${f(-hw * 0.55)},${f(cy * 0.35 + seamMid - o * 2)} ${f(-hw)},${f(cy)} Z`;
  const lowTopMid = 2 + oh;
  const lowerTop = `M${f(-hw)},${f(cy)} C${f(-hw * 0.6)},${f(cy * 0.3 + lowTopMid * 0.85)} ${f(-hw * 0.25)},${f(lowTopMid)} 0,${f(lowTopMid)} C${f(hw * 0.25)},${f(lowTopMid)} ${f(hw * 0.6)},${f(cy * 0.3 + lowTopMid * 0.85)} ${f(hw)},${f(cy)}`;
  const lowBot = lowTopMid + lt * 1.25;
  const lowerBottomRev = `C${f(hw * 0.75)},${f(cy * 0.2 + lowBot * 0.8)} ${f(hw * 0.4)},${f(lowBot)} 0,${f(lowBot)} C${f(-hw * 0.4)},${f(lowBot)} ${f(-hw * 0.75)},${f(cy * 0.2 + lowBot * 0.8)} ${f(-hw)},${f(cy)} Z`;
  const opening = `M${f(-hw)},${f(cy)} C${f(-hw * 0.55)},${f(cy * 0.35 + seamMid - o * 2)} ${f(-hw * 0.2)},${f(seamMid)} 0,${f(seamMid)} C${f(hw * 0.2)},${f(seamMid)} ${f(hw * 0.55)},${f(cy * 0.35 + seamMid - o * 2)} ${f(hw)},${f(cy)} C${f(hw * 0.6)},${f(cy * 0.3 + lowTopMid * 0.85)} ${f(hw * 0.25)},${f(lowTopMid)} 0,${f(lowTopMid)} C${f(-hw * 0.25)},${f(lowTopMid)} ${f(-hw * 0.6)},${f(cy * 0.3 + lowTopMid * 0.85)} ${f(-hw)},${f(cy)} Z`;
  const teethH = Math.min(oh * 0.5, st.upper * 0.9) + (s > 0.4 ? 3 : 0);
  return (
    <g transform={`translate(${f(x)},${f(y)})`}>
      <defs>
        <linearGradient id={`${id}-lip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={st.lip[1]} />
          <stop offset="1" stopColor={st.lip[0]} />
        </linearGradient>
        <linearGradient id={`${id}-lipL`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={st.lip[0]} />
          <stop offset="1" stopColor={st.lip[1]} />
        </linearGradient>
        <filter id={`${id}-msb`} x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id={`${id}-in`}>
          <path d={opening} />
        </clipPath>
      </defs>
      {/* soft shadow under the lower lip */}
      <ellipse cx={0} cy={lowBot + 10} rx={hw * 0.5} ry={8} fill="#7a2a20" opacity={0.22} filter={`url(#${id}-msb)`} />
      {oh > 0.6 && (
        <g clipPath={`url(#${id}-in)`}>
          <rect x={-hw} y={-40} width={hw * 2} height={120} fill="#3B0F1A" />
          <path
            d={`M${f(-hw * 0.7)},${f(seamMid - 8)} L${f(hw * 0.7)},${f(seamMid - 8)} L${f(hw * 0.66)},${f(seamMid + teethH * 0.7)} Q0,${f(seamMid + teethH * 1.15)} ${f(-hw * 0.66)},${f(seamMid + teethH * 0.7)} Z`}
            fill="#FBF3EC"
          />
          <path d={`M${f(-hw * 0.7)},${f(seamMid + teethH * 0.15)} Q0,${f(seamMid + teethH * 0.55)} ${f(hw * 0.7)},${f(seamMid + teethH * 0.15)}`} stroke="#D9C6BE" strokeWidth={1.2} fill="none" opacity={0.6} />
          <ellipse cx={0} cy={lowTopMid + 4} rx={hw * 0.5} ry={Math.max(3, oh * 0.32)} fill="#C2475A" />
        </g>
      )}
      <path d={`${upperTop} ${upperBottomRev}`} fill={`url(#${id}-lip)`} />
      <path d={`${lowerTop} ${lowerBottomRev}`} fill={`url(#${id}-lipL)`} />
      {/* seam line */}
      <path
        d={`M${f(-hw)},${f(cy)} C${f(-hw * 0.55)},${f(cy * 0.35 + seamMid - o * 2)} ${f(-hw * 0.2)},${f(seamMid)} 0,${f(seamMid)} C${f(hw * 0.2)},${f(seamMid)} ${f(hw * 0.55)},${f(cy * 0.35 + seamMid - o * 2)} ${f(hw)},${f(cy)}`}
        stroke={st.line}
        strokeWidth={oh > 0.6 ? 1.2 : 2.6}
        fill="none"
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* gloss */}
      <ellipse cx={-hw * 0.18} cy={lowTopMid + lt * 0.5} rx={hw * 0.28} ry={lt * 0.28} fill="#fff" opacity={st.gloss} />
      <ellipse cx={hw * 0.2} cy={-ut * 0.7 - lift} rx={hw * 0.12} ry={ut * 0.18} fill="#fff" opacity={st.gloss * 0.7} />
      {/* corner dimples */}
      <circle cx={-hw - 2} cy={cy} r={2.2} fill={st.line} opacity={0.45} />
      <circle cx={hw + 2} cy={cy} r={2.2} fill={st.line} opacity={0.45} />
    </g>
  );
};
