// Finishing layer: film grain, vignette, warm light leaks, bloom-ish glow.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {rand} from '../lib/anim';
import {FLAGS} from '../lib/flags';

export const Grain: React.FC<{frame: number; amount?: number}> = ({frame, amount = 0.07}) => {
  if (FLAGS.noGrain) return null;
  const i = Math.floor(frame / 2) % 8;
  const ox = Math.floor(rand(frame * 1.3) * 512);
  const oy = Math.floor(rand(frame * 2.7) * 512);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile(`grain/g${i}.png`)})`,
        backgroundPosition: `${ox}px ${oy}px`,
        mixBlendMode: 'overlay',
        opacity: amount * 4,
        pointerEvents: 'none',
      }}
    />
  );
};

export const Vignette: React.FC<{strength?: number; color?: string}> = ({strength = 0.45, color = '20,10,30'}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(${color},0) 50%, rgba(${color},${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

export const LightLeak: React.FC<{frame: number; strength?: number; hue?: 'warm' | 'pink' | 'cool'}> = ({frame, strength = 0.35, hue = 'warm'}) => {
  const c = hue === 'warm' ? '255,170,90' : hue === 'pink' ? '255,110,170' : '140,170,255';
  const x = 10 + Math.sin(frame / 90) * 8;
  const y = 18 + Math.cos(frame / 120) * 10;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 55% 60% at ${x}% ${y}%, rgba(${c},${strength}) 0%, rgba(${c},0) 70%)`,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

// Cheap letterbox-free "lens" polish: slight chromatic fringe at the edges
export const Fringe: React.FC = () => (
  <AbsoluteFill
    style={{
      boxShadow: 'inset 0 0 160px rgba(255,80,140,0.08), inset 0 0 60px rgba(60,80,255,0.06)',
      pointerEvents: 'none',
    }}
  />
);

export const Flash: React.FC<{v: number; color?: string}> = ({v, color = '#fff'}) =>
  v > 0.001 ? <AbsoluteFill style={{background: color, opacity: v, pointerEvents: 'none'}} /> : null;

export {Img};
