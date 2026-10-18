import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {clamp, ease, rand, springAt} from '../lib/anim';

/** Soft vignette, always on top. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 60% at 50% 48%, transparent 55%, rgba(0,0,0,0.5) 100%)'}}
  />
);

/** Full-frame flash (white or coloured) that decays. */
export const Flash: React.FC<{t: number; at: number; color?: string; dur?: number; max?: number}> = ({
  t,
  at,
  color = '#fff',
  dur = 0.22,
  max = 0.9,
}) => {
  const x = (t - at) / dur;
  if (x < 0 || x > 1) return null;
  return <AbsoluteFill style={{background: color, opacity: max * Math.pow(1 - x, 2), mixBlendMode: 'screen', pointerEvents: 'none'}} />;
};

/** Horizontal slice glitch over the frame for a moment. */
export const GlitchBars: React.FC<{t: number; at: number; dur?: number; color?: string}> = ({t, at, dur = 0.25, color = C.magenta}) => {
  const x = (t - at) / dur;
  if (x < 0 || x > 1) return null;
  const f = Math.floor(t * 60);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      {Array.from({length: 9}).map((_, i) => {
        const r = rand(f * 13 + i);
        if (r > 0.6) return null;
        const top = rand(f * 7 + i * 3) * 1920;
        const h = 8 + rand(f + i) * 90;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: h,
              background: i % 3 === 0 ? color : i % 3 === 1 ? '#29e6ff' : 'rgba(255,255,255,0.6)',
              opacity: 0.45 * (1 - x),
              transform: `translateX(${(rand(f + i * 5) - 0.5) * 220}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Letters that slam in one by one (scale-down + blur + overshoot). */
export const SlamText: React.FC<{
  t: number;
  at: number;
  text: string;
  size: number;
  color?: string;
  stagger?: number;
  font?: string;
  weight?: number;
  stroke?: string;
  style?: React.CSSProperties;
  letterSpacing?: number;
}> = ({t, at, text, size, color = '#fff', stagger = 0.035, font = F.display, weight = 900, stroke, style, letterSpacing = -2}) => (
  <div style={{display: 'flex', justifyContent: 'center', whiteSpace: 'pre', ...style}}>
    {text.split('').map((ch, i) => {
      const st = at + i * stagger;
      const p = clamp((t - st) / 0.22);
      const s = springAt(t, st, 22, 0.42);
      const sc = t < st ? 0 : 2.4 - 1.4 * s;
      return (
        <span
          key={i}
          style={{
            display: 'inline-block',
            fontFamily: font,
            fontWeight: weight,
            fontSize: size,
            lineHeight: 1,
            letterSpacing,
            color: stroke ? 'transparent' : color,
            WebkitTextStroke: stroke ? `3px ${stroke}` : undefined,
            opacity: ease.outCubic(p),
            transform: `scale(${sc})`,
            filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
          }}
        >
          {ch}
        </span>
      );
    })}
  </div>
);

/** Rubber-stamp style label that slams in rotated. */
export const Stamp: React.FC<{t: number; at: number; text: string; color?: string; size?: number; rotate?: number; sub?: string}> = ({
  t,
  at,
  text,
  color = C.magenta,
  size = 64,
  rotate = -7,
  sub,
}) => {
  if (t < at) return null;
  const s = springAt(t, at, 26, 0.3);
  const sc = 3 - 2 * s;
  const o = clamp((t - at) / 0.06);
  return (
    <div
      style={{
        display: 'inline-block',
        transform: `rotate(${rotate}deg) scale(${sc})`,
        opacity: o,
        border: `7px solid ${color}`,
        borderRadius: 14,
        padding: '8px 26px 10px',
        color,
        fontFamily: F.display,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: 1,
        lineHeight: 1.05,
        textAlign: 'center',
        whiteSpace: 'pre',
        boxShadow: `0 0 40px ${color}55, inset 0 0 22px ${color}33`,
        background: 'rgba(0,0,0,0.12)',
      }}
    >
      {text}
      {sub && <div style={{fontFamily: F.mono, fontSize: size * 0.32, letterSpacing: 4, marginTop: 4, fontWeight: 700}}>{sub}</div>}
    </div>
  );
};

/** Mono label typed out with a blinking caret. */
export const TypeLabel: React.FC<{t: number; at: number; text: string; color?: string; size?: number; cps?: number}> = ({
  t,
  at,
  text,
  color = C.magenta,
  size = 26,
  cps = 30,
}) => {
  const n = Math.max(0, Math.floor((t - at) * cps));
  if (t < at) return null;
  const caret = n < text.length || Math.floor(t * 3) % 2 === 0;
  return (
    <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: size, letterSpacing: size * 0.22, color, whiteSpace: 'pre'}}>
      {text.slice(0, n)}
      <span style={{opacity: caret ? 1 : 0}}>▍</span>
    </div>
  );
};

export const Bokeh: React.FC<{t: number; n?: number; colors?: string[]; seed?: number}> = ({
  t,
  n = 18,
  colors = [C.magenta, C.amber, '#8a5cff'],
  seed = 0,
}) => (
  <AbsoluteFill>
    {Array.from({length: n}).map((_, i) => {
      const r = 40 + rand(i + seed) * 140;
      const x = rand(i * 3 + seed) * 1080 + Math.sin(t * 0.3 + i) * 30;
      const y = rand(i * 7 + seed) * 1920 - ((t * (10 + rand(i) * 20)) % 200);
      const col = colors[i % colors.length];
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${col}66 0%, ${col}22 45%, transparent 70%)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

