import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease} from '../lib/anim';

export type Tr = 'cut' | 'fade' | 'whipLeft' | 'whipUp' | 'zoomIn' | 'zoomOut' | 'iris' | 'slideUp';

type Props = {
  t: number;
  range: [number, number];
  enter?: Tr;
  exit?: Tr;
  inDur?: number;
  outDur?: number;
  children: (local: number) => React.ReactNode;
  z?: number;
};

const style = (kind: Tr, p: number, dir: 1 | -1): React.CSSProperties => {
  // p: 0 = fully hidden, 1 = fully shown
  const q = 1 - p;
  switch (kind) {
    case 'fade':
      return {opacity: p};
    case 'whipLeft':
      return {transform: `translateX(${q * 1080 * dir}px) skewX(${q * -8 * dir}deg)`, filter: q > 0.02 ? `blur(${q * 26}px)` : undefined};
    case 'whipUp':
      return {transform: `translateY(${q * 1920 * dir}px)`, filter: q > 0.02 ? `blur(${q * 22}px)` : undefined};
    case 'slideUp':
      return {transform: `translateY(${q * 1920 * dir}px)`};
    case 'zoomIn':
      return {
        transform: `scale(${dir === 1 ? 1 + q * 0.6 : 1 - q * 0.3})`,
        opacity: clamp(p * 1.6),
        filter: q > 0.02 ? `blur(${q * 18}px)` : undefined,
      };
    case 'zoomOut':
      return {transform: `scale(${dir === 1 ? 1 - q * 0.4 : 1 + q * 2.4})`, opacity: clamp(p * 1.5)};
    case 'iris':
      return {clipPath: `circle(${p * 120}% at 50% 50%)`};
    default:
      return {};
  }
};

/** Mounts a scene inside its [start, end] window and drives its in / out transition. */
export const Scene: React.FC<Props> = ({t, range, enter = 'cut', exit = 'cut', inDur = 0.28, outDur = 0.28, children, z}) => {
  const [a, b] = range;
  if (t < a || t >= b) return null;
  const pin = enter === 'cut' ? 1 : ease.inOutQuint(clamp((t - a) / inDur));
  const pout = exit === 'cut' ? 1 : ease.inOutQuint(clamp((b - t) / outDur));
  const si = pin < 1 ? style(enter, pin, 1) : {};
  const so = pout < 1 ? style(exit, pout, -1) : {};
  return (
    <AbsoluteFill style={{zIndex: z, overflow: 'hidden'}}>
      <AbsoluteFill style={si}>
        <AbsoluteFill style={so}>{children(t - a)}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
