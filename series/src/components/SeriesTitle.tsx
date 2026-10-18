import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {lerp, prog, ease, shake} from '../lib/anim';
import {SlamText, TypeLabel} from './FX';

/** «ГРЯЗНЫЕ МИЛЛИОНЫ» title card: rotating $ outline, light streak, letter slam, echo outlines. */
export const SeriesTitle: React.FC<{t: number; at: number; label: string; subtitle: string}> = ({t, at: a, label, subtitle}) => {
  const sh = shake(t, a, 26, 6);
  const push = lerp(1.0, 1.07, prog(t, a, 2.6, ease.outCubic));
  const streak = prog(t, a, 0.5);
  const echo = prog(t, a + 0.45, 0.9, ease.outCubic);
  return (
    <AbsoluteFill style={{background: '#07060b', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${push}) rotate(${sh.r}deg)`}}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -54%) rotate(${(t - a) * 12}deg) scale(${1.2 - 0.2 * streak})`,
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 1300,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `4px ${C.magenta}`,
            opacity: 0.2,
          }}
        >
          $
        </div>
        <div
          style={{
            position: 'absolute',
            top: 958,
            left: 0,
            right: 0,
            height: 4,
            transform: `scaleX(${streak})`,
            background: `linear-gradient(90deg, transparent, ${C.magenta}, #fff, ${C.magenta}, transparent)`,
            boxShadow: `0 0 40px 10px ${C.magenta}88`,
          }}
        />
        <div style={{position: 'absolute', top: 600, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.25} text={label} color="#fff" size={30} />
        </div>
        <div style={{position: 'absolute', top: 700, left: 0, right: 0}}>
          <SlamText t={t} at={a + 0.02} text="ГРЯЗНЫЕ" size={108} stagger={0.03} />
        </div>
        <div style={{position: 'absolute', top: 852, left: 0, right: 0}}>
          <SlamText t={t} at={a + 0.28} text="МИЛЛИОНЫ" size={108} color={C.magenta} stagger={0.03} />
        </div>
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              top: 852 + echo * 120 * k,
              left: 0,
              right: 0,
              opacity: (1 - echo) * 0.5 * (1 - k * 0.2) * (t > a + 0.45 ? 1 : 0),
            }}
          >
            <SlamText t={t} at={a} text="МИЛЛИОНЫ" size={108} stroke={C.magenta} stagger={0} />
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            top: 1060,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: F.mono,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 6,
            color: 'rgba(255,255,255,0.75)',
            opacity: prog(t, a + 0.9, 0.4),
            transform: `translateY(${(1 - prog(t, a + 0.9, 0.6)) * 20}px)`,
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
