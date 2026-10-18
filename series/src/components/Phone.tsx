import React from 'react';
import {C, F} from '../lib/theme';
import {clamp, ease, springAt} from '../lib/anim';

export type Msg = {at: number; text: React.ReactNode};

/** Messenger screen with an unknown sender, typing dots, then bubbles popping in. ~560x1080 px. */
export const Phone: React.FC<{t: number; on: number; msgs: Msg[]; clock: string; sender?: string}> = ({
  t,
  on,
  msgs,
  clock,
  sender = 'Неизвестный номер',
}) => {
  const glow = clamp((t - on) / 0.25);
  const next = msgs.find((m) => t < m.at);
  const typing = next && t > next.at - 0.55 && t > on + 0.2;
  return (
    <div
      style={{
        width: 560,
        height: 1080,
        borderRadius: 78,
        background: '#09090d',
        border: '10px solid #2a2a35',
        boxShadow: `0 0 ${120 * glow}px ${40 * glow}px rgba(80,150,255,${0.35 * glow}), 0 40px 80px rgba(0,0,0,0.6)`,
        padding: 18,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 60,
          overflow: 'hidden',
          background: `linear-gradient(180deg, #121a2e, #0b0f1c)`,
          opacity: 0.15 + 0.85 * glow,
          position: 'relative',
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '26px 40px 0', fontFamily: F.caption, fontWeight: 800, fontSize: 26, color: '#fff'}}>
          <span>{clock}</span>
          <span style={{letterSpacing: 2}}>●●● ▮</span>
        </div>
        <div style={{position: 'absolute', top: 18, left: '50%', width: 150, height: 40, marginLeft: -75, borderRadius: 20, background: '#000'}} />
        <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '34px 34px 22px', borderBottom: '2px solid rgba(255,255,255,0.08)'}}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: '#2a3350',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 40,
              color: '#8fa3d9',
            }}
          >
            ?
          </div>
          <div>
            <div style={{fontFamily: F.caption, fontWeight: 900, fontSize: 32, color: '#fff'}}>{sender}</div>
            <div style={{fontFamily: F.mono, fontWeight: 500, fontSize: 20, color: typing ? '#7fe08a' : 'rgba(255,255,255,0.45)', marginTop: 4}}>
              {typing ? 'печатает…' : 'в сети'}
            </div>
          </div>
        </div>
        <div style={{padding: '30px 30px', display: 'flex', flexDirection: 'column', gap: 18}}>
          {msgs.map((m, i) => {
            if (t < m.at) return null;
            const s = clamp(springAt(t, m.at, 18, 0.32), 0, 1.15);
            return (
              <div
                key={i}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '88%',
                  background: '#22293d',
                  color: '#fff',
                  fontFamily: F.caption,
                  fontWeight: 800,
                  fontSize: 40,
                  lineHeight: 1.18,
                  padding: '22px 28px',
                  borderRadius: '34px 34px 34px 10px',
                  transform: `scale(${s})`,
                  transformOrigin: '0% 100%',
                  opacity: ease.outCubic(clamp((t - m.at) / 0.12)),
                }}
              >
                {m.text}
              </div>
            );
          })}
          {typing && (
            <div style={{alignSelf: 'flex-start', background: '#22293d', borderRadius: 30, padding: '20px 26px', display: 'flex', gap: 10}}>
              {[0, 1, 2].map((k) => (
                <div
                  key={k}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#9aa6c7',
                    transform: `translateY(${Math.sin(t * 12 - k) * 5}px)`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{position: 'absolute', inset: 0, borderRadius: 78, boxShadow: `inset 0 0 0 2px ${C.ink}`}} />
    </div>
  );
};
