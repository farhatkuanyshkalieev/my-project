// Title + end card: Russian Braille cells pop in, then resolve into the serif title.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease, lerp, rand, springT} from '../lib/anim';
export const _l = lerp;
import {fonts, P} from '../lib/design';

// Russian Braille, dots 1-6 (1-2-3 left column top→bottom, 4-5-6 right column)
const BR: Record<string, number[]> = {
  О: [1, 3, 5], П: [1, 2, 3, 4], И: [2, 4], Ш: [1, 5, 6], М: [1, 3, 4], Н: [1, 3, 4, 5], Е: [1, 5],
};
const WORD = ['О', 'П', 'И', 'Ш', 'И', ' ', 'М', 'Н', 'Е'];

const dotXY = (d: number): [number, number] => [d <= 3 ? 0 : 1, (d - 1) % 3];

export const BrailleWord: React.FC<{frame: number; start: number; x: number; y: number; cell?: number; color?: string; out?: number}> = ({frame, start, x, y, cell = 54, color = P.peach, out = 0}) => {
  const step = cell * 1.75;
  const total = (WORD.length - 1) * step + cell * 0.7;
  return (
    <g transform={`translate(${x - total / 2} ${y})`}>
      {WORD.map((ch, i) => {
        if (ch === ' ') return null;
        return BR[ch].map((d, k) => {
          const [cx, cy] = dotXY(d);
          const t0 = start + i * 6 + k * 2;
          const s = springT(frame, t0, 260, 14);
          const sc = out > 0 ? 1 - ease.inCubic(clamp(out - (i * 0.04))) : s;
          const px = i * step + cx * cell * 0.7;
          const py = cy * cell * 0.7;
          return (
            <g key={`${i}-${k}`}>
              <circle cx={px} cy={py} r={cell * 0.24 * Math.max(0, sc) * 1.9} fill={color} opacity={0.18 * clamp(sc)} />
              <circle cx={px} cy={py} r={cell * 0.24 * Math.max(0, sc)} fill={color} />
            </g>
          );
        });
      })}
    </g>
  );
};

export const TitleCard: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / 60;
  const titleK = clamp((s - 2.3) / 1.2);
  const subK = clamp((s - 3.3) / 0.9);
  const outK = clamp((s - 5.6) / 0.6);
  const letters = [...'Опиши мне'];
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #2A1B4A 0%, #120B22 70%)'}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {Array.from({length: 26}).map((_, i) => (
          <circle key={i} cx={rand(i) * 1080} cy={(rand(i * 3) * 1920 - frame * (0.2 + rand(i) * 0.4)) % 1920 + (rand(i * 3) * 1920 - frame * 0.3 < 0 ? 1920 : 0)} r={2 + rand(i * 5) * 4} fill={P.peach} opacity={0.15 + rand(i * 7) * 0.25} />
        ))}
        <BrailleWord frame={frame} start={18} x={540} y={760} out={clamp((s - 2.2) / 0.8) * 1.4} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 820, textAlign: 'center', fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 168, color: '#FFE3C2', letterSpacing: '0.01em', textShadow: '0 0 40px rgba(255,150,80,0.45)'}}>
        {letters.map((ch, i) => {
          const k = ease.outCubic(clamp((titleK - i * 0.07) / 0.45));
          return (
            <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: k * (1 - outK), transform: `translateY(${(1 - k) * 40}px)`, filter: `blur(${(1 - k) * 10}px)`}}>
              {ch}
            </span>
          );
        })}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {/* the braille dots settle into a dotted rule under the title */}
        {Array.from({length: 13}).map((_, i) => {
          const k = ease.outCubic(clamp((s - 2.8 - i * 0.03) / 0.5));
          return <circle key={i} cx={540 + (i - 6) * 34} cy={1078} r={6 * k} fill={P.lime} opacity={1 - outK} />;
        })}
      </svg>
      <div style={{position: 'absolute', left: 120, right: 120, top: 1120, textAlign: 'center', fontFamily: fonts.sans, fontWeight: 600, fontSize: 34, lineHeight: 1.4, color: '#E8D9F2', opacity: ease.outCubic(subK) * (1 - outK), transform: `translateY(${(1 - ease.outCubic(subK)) * 16}px)`}}>
        о девушке, которая перестала видеть мир —
        <br />и не перестала видеть его
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: fonts.cond, fontWeight: 500, fontSize: 24, letterSpacing: '0.4em', color: '#8E7DB0', opacity: ease.outCubic(subK) * (1 - outK)}}>
        КОРОТКИЙ ФИЛЬМ
      </div>
    </AbsoluteFill>
  );
};

// Ending: the title returns as braille only, then the last dot goes dark
export const EndCard: React.FC<{frame: number; t: number}> = ({frame, t}) => {
  const fade = clamp((t - 2.4) / 0.6);
  const titleK = ease.outCubic(clamp((t - 0.2) / 1.0));
  return (
    <AbsoluteFill style={{background: '#0B0814'}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <BrailleWord frame={frame} start={Math.round((t - 0) * -60) + frame} x={540} y={900} color={P.lime} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center', fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 110, color: '#FFE3C2', opacity: titleK * (1 - fade)}}>
        Опиши мне
      </div>
      <AbsoluteFill style={{background: '#000', opacity: fade}} />
    </AbsoluteFill>
  );
};
