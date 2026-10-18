import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {clamp, prog, ease, shake, springAt, sumShake} from '../lib/anim';

type Side = {label: string; sub: string; icon: string; at: number};

/** Diagonal split choice card: left (paper) vs right (magenta), "ИЛИ" badge, comments bar. */
export const ChoiceSplit: React.FC<{t: number; left: Side; right: Side; commentsAt?: number; both?: number}> = ({t, left, right, commentsAt, both}) => {
  const lp = clamp(springAt(t, left.at, 16, 0.32), 0, 1.15);
  const rp = clamp(springAt(t, right.at, 16, 0.32), 0, 1.15);
  const commentsP = commentsAt === undefined ? 0 : prog(t, commentsAt, 0.4, ease.outExpo);
  const sh = sumShake(shake(t, left.at, 18, 7), shake(t, right.at, 18, 7), both !== undefined ? shake(t, both, 26, 6) : {x: 0, y: 0, r: 0});
  const bothOn = both !== undefined && t >= both;
  return (
    <AbsoluteFill style={{background: '#07060b'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#f3efe6',
            clipPath: 'polygon(0 0, 62% 0, 38% 100%, 0 100%)',
            transform: `translateX(${(1 - Math.min(1, lp)) * -1080}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: C.magenta,
            clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 38% 100%)',
            transform: `translateX(${(1 - Math.min(1, rp)) * 1080}px)`,
          }}
        />
        {t >= left.at && (
          <div style={{position: 'absolute', left: 56, top: 640, transform: `scale(${lp}) rotate(-6deg)`, transformOrigin: '30% 50%'}}>
            <div style={{fontSize: 110}}>{left.icon}</div>
            <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 70, color: C.ink, letterSpacing: -3}}>{left.label}</div>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: '#6b6457', letterSpacing: 3, marginTop: 6}}>{left.sub}</div>
          </div>
        )}
        {t >= right.at && (
          <div style={{position: 'absolute', right: 50, top: 1010, textAlign: 'right', transform: `scale(${rp}) rotate(-6deg)`, transformOrigin: '70% 50%'}}>
            <div style={{fontSize: 110}}>{right.icon}</div>
            <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 70, color: '#fff', letterSpacing: -3}}>{right.label}</div>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: '#ffe0ee', letterSpacing: 3, marginTop: 6}}>{right.sub}</div>
          </div>
        )}
        {t >= right.at + 0.2 && (
          <div
            style={{
              position: 'absolute',
              left: 460,
              top: 900,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: bothOn ? C.magenta : C.ink,
              border: '8px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: bothOn ? 40 : 46,
              color: '#fff',
              transform: `scale(${clamp(springAt(t, bothOn ? both! : right.at + 0.2, 20, 0.3), 0, 1.2)})`,
            }}
          >
            {bothOn ? '+' : 'ИЛИ'}
          </div>
        )}
      </AbsoluteFill>
      {commentsP > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 90,
            top: 1500,
            transform: `translateY(${(1 - commentsP) * 300}px)`,
            background: 'rgba(10,8,14,0.92)',
            border: '3px solid rgba(255,255,255,0.25)',
            borderRadius: 999,
            padding: '20px 34px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 34,
            color: '#fff',
          }}
        >
          <span style={{fontSize: 44}}>💬</span> ПИШИ В КОММЕНТАРИЯХ
        </div>
      )}
    </AbsoluteFill>
  );
};
