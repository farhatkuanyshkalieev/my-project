// Transition overlays. Each takes p in 0..1; the cut happens at p = 0.5 (fully covered).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease, rand} from '../lib/anim';
import {P} from '../lib/design';

// Three giant paint strokes sweep across, cover, then wipe away.
export const BrushWipe: React.FC<{p: number; colors?: string[]; seed?: number}> = ({p, colors = [P.pink, P.lime, P.cobalt], seed = 1}) => {
  if (p <= 0 || p >= 1) return null;
  const strokes = [0, 1, 2, 3, 4];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080}>
        <defs>
          <filter id={`bw-rough-${seed}`} x="-10%" y="-20%" width="120%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.08" numOctaves={3} seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale={70} />
          </filter>
        </defs>
        <g filter={`url(#bw-rough-${seed})`}>
          {strokes.map((i) => {
            const d0 = i * 0.03;
            const grow = ease.inOutCubic(clamp((p - d0) / 0.36));
            const shrink = ease.inOutCubic(clamp((p - 0.5 - d0) / 0.38));
            const y = 60 + i * 250 + (rand(seed + i) - 0.5) * 50;
            const len = 2600;
            const vis = len * grow;
            const off = len * shrink;
            return (
              <path
                key={i}
                d={`M-300,${y + 80} C400,${y - 60} 1300,${y + 120} 2250,${y - 40}`}
                stroke={colors[i % colors.length]}
                strokeWidth={470}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${Math.max(0.01, vis - off)} ${len * 2}`}
                strokeDashoffset={-off}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// Horizontal whip: directional motion blur (SVG filter) + short slide; outgoing p<0.5, incoming p>=0.5
export const whip = (p: number, dir = 1) => {
  const out = p < 0.5;
  const k = out ? ease.inCubic(p / 0.5) : 1 - ease.outCubic((p - 0.5) / 0.5);
  return {
    transform: `translateX(${(out ? -1 : 1) * dir * k * 220}px) scale(${1 + k * 0.3})`,
    filter: 'url(#whip-blur)',
  } as React.CSSProperties;
};

export const WhipFilter: React.FC<{p: number}> = ({p}) => {
  const k = p < 0.5 ? ease.inCubic(p / 0.5) : 1 - ease.outCubic((p - 0.5) / 0.5);
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <filter id="whip-blur" x="-10%" y="0%" width="120%" height="100%">
        <feGaussianBlur stdDeviation={`${(k * 90).toFixed(1)} 0`} />
      </filter>
    </svg>
  );
};

export const WhipStreaks: React.FC<{p: number}> = ({p}) => {
  const k = 1 - Math.abs(p - 0.5) * 2;
  if (k <= 0) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: k}}>
      <svg width={1920} height={1080}>
        {Array.from({length: 14}).map((_, i) => (
          <rect key={i} x={-200 + rand(i * 3) * 400} y={rand(i * 7) * 1080} width={2400} height={4 + rand(i) * 30} fill="#fff" opacity={0.08 + rand(i * 2) * 0.12} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// Corporate grid of grey slats closing over the frame
export const Slats: React.FC<{p: number; color?: string}> = ({p, color = '#8E949F'}) => {
  if (p <= 0 || p >= 1) return null;
  const n = 12;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080}>
        {Array.from({length: n}).map((_, i) => {
          const d = i * 0.025;
          const inK = ease.inOutQuart(clamp((p - d) / 0.4));
          const outK = ease.inOutQuart(clamp((p - 0.5 - d) / 0.4));
          const h = 1080 / n;
          return <rect key={i} x={0} y={i * h + (h * outK)} width={1920} height={h * inK * (1 - outK) + 1} fill={i % 2 ? color : '#A3A9B4'} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Paint splatter burst (title accent)
export const Splat: React.FC<{t: number; x: number; y: number; colors?: string[]; seed?: number; scale?: number}> = ({t, x, y, colors = [P.pink, P.lime, P.cobalt, P.autumn], seed = 3, scale = 1}) => {
  if (t <= 0) return null;
  return (
    <g>
      {Array.from({length: 26}).map((_, i) => {
        const a = rand(seed + i) * Math.PI * 2;
        const sp = 120 + rand(seed + i * 2) * 340;
        const k = ease.outExpo(clamp(t / 0.6));
        const r = (5 + rand(seed + i * 3) * 18) * scale * (1 - clamp((t - 0.7) / 0.8) * 0.6);
        const g = t * t * 60;
        return <circle key={i} cx={x + Math.cos(a) * sp * k * scale} cy={y + Math.sin(a) * sp * k * scale * 0.7 + g} r={r} fill={colors[i % colors.length]} opacity={1 - clamp((t - 1.2) / 0.6)} />;
      })}
    </g>
  );
};
