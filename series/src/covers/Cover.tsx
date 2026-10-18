import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {MotelRoom} from '../components/MotelRoom';
import {Character} from '../components/Character';

/**
 * Reel cover, 1080x1920. Everything that matters sits inside the centre 3:4 band
 * (y 240–1680), which is what the profile grid shows.
 */
export const Cover: React.FC<{episode: number; title: string; tagline: string}> = ({episode, title, tagline}) => {
  const s = 0.94;
  const fx = 590;
  const fy = 900;
  return (
    <AbsoluteFill style={{background: C.night}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <g transform={`translate(540 960) scale(${s}) translate(${-fx} ${-fy})`}>
          <MotelRoom t={2.4}>
            <g transform="translate(250 1300) scale(0.9)">
              <Character t={0.5} view="back" arms="down" />
            </g>
          </MotelRoom>
        </g>
      </svg>
      {/* legibility: darken the wall behind the type, keep the bed and the lamp bright */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(8,5,12,0.95) 0%, rgba(8,5,12,0.85) 30%, rgba(8,5,12,0.35) 47%, rgba(8,5,12,0) 58%, rgba(8,5,12,0) 85%, rgba(8,5,12,0.6) 100%)',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 55% at 50% 55%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />

      <div style={{position: 'absolute', top: 360, left: 84, right: 84}}>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 30, letterSpacing: 9, color: 'rgba(255,255,255,0.85)'}}>{tagline}</div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 26, marginTop: 34}}>
          <div
            style={{
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 158,
              lineHeight: 0.9,
              letterSpacing: -6,
              color: '#fff',
              textShadow: '0 10px 0 rgba(0,0,0,0.35)',
            }}
          >
            СЕРИЯ
          </div>
          <div
            style={{
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 300,
              lineHeight: 0.78,
              letterSpacing: -10,
              color: C.magenta,
              textShadow: `0 0 60px ${C.magenta}88, 0 12px 0 rgba(0,0,0,0.35)`,
            }}
          >
            {episode}
          </div>
        </div>
        <div style={{width: 150, height: 14, borderRadius: 7, background: C.magenta, marginTop: 40, boxShadow: `0 0 30px ${C.magenta}`}} />
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 104,
            lineHeight: 0.98,
            letterSpacing: -4,
            color: '#fff',
            marginTop: 30,
            whiteSpace: 'pre-line',
            textShadow: '0 8px 0 rgba(0,0,0,0.35)',
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 262,
          left: 84,
          right: 0,
          fontFamily: F.display,
          fontWeight: 900,
          fontSize: 40,
          letterSpacing: -1,
          color: '#fff',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}
      >
        ГРЯЗНЫЕ <span style={{color: C.magenta}}>МИЛЛИОНЫ</span>
      </div>
    </AbsoluteFill>
  );
};
