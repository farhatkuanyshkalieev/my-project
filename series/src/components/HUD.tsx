import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {clamp, ease, fmtMoney, track, noise1} from '../lib/anim';

type Props = {
  t: number;
  visible: [number, number];
  suspicion: number[][];
  day: string;
  /** clock reading (minutes past midnight) when the HUD appears */
  clockStart?: number;
  /** [start, end] windows where the HUD is hidden (e.g. title cards) */
  hideRanges?: number[][];
  /** [[t, dollars], ...] cash on hand over time */
  cash?: number[][];
};

const Cell: React.FC<{label: string; value: string; color?: string; children?: React.ReactNode; flex?: number}> = ({
  label,
  value,
  color = '#fff',
  children,
  flex = 1,
}) => (
  <div
    style={{
      flex,
      background: 'rgba(14,12,20,0.72)',
      border: '2px solid rgba(255,255,255,0.12)',
      borderRadius: 18,
      padding: '14px 20px 16px',
      backdropFilter: 'blur(6px)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 19, letterSpacing: 3, color: 'rgba(255,255,255,0.55)'}}>{label}</div>
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 38, color, marginTop: 6, letterSpacing: -0.5}}>{value}</div>
    {children}
  </div>
);

export const HUD: React.FC<Props> = ({t, visible, suspicion, day, clockStart = 3 * 60 + 14, hideRanges = [], cash = [[0, 10_000_000]]}) => {
  const [a, b] = visible;
  if (t < a - 0.01 || t > b + 0.3) return null;
  if (hideRanges.some(([h0, h1]) => t >= h0 && t < h1)) return null;
  const pin = ease.outExpo(clamp((t - a) / 0.5));
  const pout = ease.inCubic(clamp((t - b) / 0.25));
  const s = track(t, suspicion, ease.outExpo);
  const sCol = s > 60 ? C.red : s > 25 ? C.amber : '#fff';
  const blink = s > 90 ? (Math.floor(t * 6) % 2 ? 1 : 0.35) : 1;
  const jitter = s > 60 ? noise1(t * 30, 4) * 2 : 0;
  const clock = clockStart + Math.floor((t - a) * 1.6);
  const hh = String(Math.floor(clock / 60) % 24).padStart(2, '0');
  const mm = String(clock % 60).padStart(2, '0');
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 170,
          left: 40,
          right: 40,
          display: 'flex',
          gap: 14,
          transform: `translateY(${(1 - pin) * -140 - pout * 160}px)`,
          opacity: pin * (1 - pout),
        }}
      >
        <Cell label="НАЛИЧНЫЕ" value={fmtMoney(track(t, cash, ease.outExpo))} flex={1.5} />
        <Cell label="ЧИСТЫЕ" value="$0" flex={0.8} />
        <Cell label="РОЗЫСК" value={`${Math.round(s)}%`} color={sCol} flex={1}>
          <div style={{position: 'absolute', left: 0, bottom: 0, height: 6, width: `${s}%`, background: sCol, opacity: blink}} />
          <div
            style={{position: 'absolute', inset: 0, background: C.red, opacity: s > 90 ? (1 - blink) * 0.25 : 0, transform: `translateX(${jitter}px)`}}
          />
        </Cell>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 312,
          left: 40,
          display: 'flex',
          gap: 10,
          opacity: pin * (1 - pout),
          transform: `translateX(${(1 - pin) * -200}px)`,
        }}
      >
        <div
          style={{
            background: C.magenta,
            color: '#fff',
            fontFamily: F.mono,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 3,
            padding: '6px 14px',
            borderRadius: 8,
          }}
        >
          {day}
        </div>
        <div
          style={{
            background: 'rgba(14,12,20,0.72)',
            color: '#fff',
            fontFamily: F.mono,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 3,
            padding: '6px 14px',
            borderRadius: 8,
          }}
        >
          <span style={{color: C.red}}>●</span> {hh}:{mm}
        </div>
      </div>
    </AbsoluteFill>
  );
};
