import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {clamp, ease, lerp, prog} from '../lib/anim';
import {SlamText, TypeLabel} from './FX';

type Props = {
  t: number;
  start: number;
  /** number of the episode being announced */
  episode: number;
  epAt: number;
  question: string;
  followAt: number;
  outAt: number;
  tease?: {at: number; text: string; from: string};
};

/** "Продолжение · СЕРИЯ N" card with the episode track, follow CTA and an optional notification tease. */
export const NextEpisode: React.FC<Props> = ({t, start: a, episode, epAt: ep, question, followAt, outAt, tease: teaseCfg}) => {
  const up = prog(t, ep - 0.1, 0.5, ease.inOutQuint);
  const line = prog(t, ep + 0.3, 0.8, ease.inOutCubic);
  const cursorP = prog(t, followAt - 0.7, 0.65, ease.inOutCubic);
  const press = t >= followAt ? 1 - 0.08 * Math.sin(clamp((t - followAt) / 0.18) * Math.PI) : 1;
  const followed = t >= followAt + 0.09;
  const bell = t >= followAt + 0.25 ? Math.sin((t - followAt - 0.25) * 30) * 18 * Math.exp(-(t - followAt - 0.25) * 3) : 0;
  const outP = prog(t, outAt, 0.45, ease.inCubic);
  const tease = teaseCfg ? prog(t, teaseCfg.at, 0.45, ease.outExpo) : 0;
  const buzz = teaseCfg && t >= teaseCfg.at && t < teaseCfg.at + 0.8 ? Math.sin(t * 90) * 5 : 0;
  const done = episode - 1;
  const lineFrom = 240 + (done - 1) * 150;
  return (
    <AbsoluteFill style={{background: '#06040a'}}>
      <AbsoluteFill style={{opacity: 1 - outP}}>
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 42%, ${C.magenta}33, transparent 60%)`, opacity: up}} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '44%',
            transform: `translate(-50%, -50%) rotate(${(t - a) * 6}deg)`,
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 1100,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `3px ${C.magenta}`,
            opacity: 0.12 * up,
          }}
        >
          $
        </div>
        <div style={{position: 'absolute', top: 380, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 44, color: '#fff', opacity: up}}>
          ГРЯЗНЫЕ <span style={{color: C.magenta}}>МИЛЛИОНЫ</span>
        </div>
        <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.05} text="ПРОДОЛЖЕНИЕ" color="rgba(255,255,255,0.7)" size={30} />
        </div>
        <div style={{position: 'absolute', top: 640, left: 0, right: 0}}>
          <SlamText t={t} at={ep} text={`СЕРИЯ ${episode}`} size={176} stagger={0.045} letterSpacing={-6} />
        </div>
        {t > ep &&
          [1, 2].map((k) => {
            const p = clamp((t - ep - 0.25) / 0.9);
            return (
              <div key={k} style={{position: 'absolute', top: 640 + p * 70 * k, left: 0, right: 0, opacity: (1 - p) * 0.6}}>
                <SlamText t={t} at={ep - 1} text={`СЕРИЯ ${episode}`} size={176} stroke={C.magenta} stagger={0} letterSpacing={-6} />
              </div>
            );
          })}
        <div style={{position: 'absolute', top: 1060, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={ep + 0.6} text={question} color={C.magentaHot} size={46} cps={18} />
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', opacity: up}}>
          <line x1={240} y1={1200} x2={840} y2={1200} stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
          <line x1={240} y1={1200} x2={lerp(lineFrom, lineFrom + 150, line)} y2={1200} stroke={C.magenta} strokeWidth={6} />
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 240 + i * 150;
            const cur = i === episode - 1;
            const isDone = i < episode - 1;
            const pulse = cur ? 1 + 0.15 * Math.sin(t * 6) : 1;
            return (
              <g key={i} transform={`translate(${x} 1200) scale(${pulse})`}>
                <circle r={26} fill={isDone ? C.magenta : '#06040a'} stroke={isDone || cur ? C.magenta : 'rgba(255,255,255,0.25)'} strokeWidth={6} />
                <text y={10} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={26} fill={isDone ? '#fff' : cur ? C.magenta : 'rgba(255,255,255,0.35)'}>
                  {isDone ? '✓' : i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        {t >= followAt - 1.0 && (
          <div style={{position: 'absolute', top: 1470, left: 0, right: 0, textAlign: 'center', opacity: prog(t, followAt - 1.0, 0.3)}}>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, letterSpacing: 3, color: 'rgba(255,255,255,0.8)', marginBottom: 22}}>
              подпишись, чтобы не пропустить
            </div>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 22, transform: `scale(${press})`}}>
              <div style={{fontSize: 64, transform: `rotate(${bell}deg)`, transformOrigin: '50% 10%'}}>🔔</div>
              <div
                style={{
                  fontFamily: F.display,
                  fontWeight: 800,
                  fontSize: 40,
                  color: '#fff',
                  padding: '24px 46px',
                  borderRadius: 999,
                  background: followed ? '#2a2630' : C.magenta,
                  border: followed ? '3px solid rgba(255,255,255,0.3)' : `3px solid ${C.magenta}`,
                  boxShadow: followed ? 'none' : `0 0 40px ${C.magenta}88`,
                }}
              >
                {followed ? 'ВЫ ПОДПИСАНЫ ✓' : 'ПОДПИСАТЬСЯ'}
              </div>
            </div>
          </div>
        )}
        {cursorP > 0 && t < followAt + 1.2 && (
          <svg
            width={120}
            height={140}
            style={{
              position: 'absolute',
              left: lerp(1000, 640, cursorP),
              top: lerp(1850, 1580, cursorP),
              transform: `scale(${t >= followAt && t < followAt + 0.18 ? 0.85 : 1})`,
              opacity: 1 - prog(t, followAt + 0.8, 0.3),
            }}
          >
            <path d="M 10 6 L 10 100 L 34 78 L 52 118 L 70 110 L 52 72 L 86 72 Z" fill="#fff" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          </svg>
        )}
        {teaseCfg && tease > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 50,
              right: 50,
              top: lerp(-200, 170, tease),
              transform: `translateX(${buzz}px)`,
              background: 'rgba(30,32,44,0.96)',
              borderRadius: 34,
              padding: '22px 28px',
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 18,
                background: '#2a3350',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: F.display,
                fontWeight: 900,
                fontSize: 36,
                color: '#8fa3d9',
              }}
            >
              {teaseCfg.from[0]}
            </div>
            <div>
              <div style={{fontFamily: F.caption, fontWeight: 900, fontSize: 28, color: '#fff'}}>{teaseCfg.from} · сейчас</div>
              <div style={{fontFamily: F.caption, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,0.85)', marginTop: 4}}>{teaseCfg.text}</div>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

