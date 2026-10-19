import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, F} from '../lib/theme';
import {rand} from '../lib/anim';
import {Character} from '../components/Character';
import {Npc} from '../components/Npc';
import {Bill} from '../components/Props';

const VIOLET = '#8a3cff';

/**
 * YouTube channel banner, 2560x1440.
 * Safe area for every device: 1546x423 in the centre (x 507–2053, y 508–931).
 * Desktop shows the full-width band y 508–931; TV shows everything.
 */
export const YoutubeBanner: React.FC = () => (
  <AbsoluteFill style={{background: '#07050d', overflow: 'hidden'}}>
    {/* atmosphere */}
    <AbsoluteFill style={{background: `radial-gradient(ellipse 55% 60% at 50% 50%, #3a1170 0%, #1a0836 45%, #07050d 85%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 30% 40% at 28% 50%, ${C.magenta}40, transparent 70%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 35% 45% at 78% 52%, ${VIOLET}38, transparent 70%)`}} />

    {/* perspective neon grid (TV area, fades toward the band) */}
    <svg width={2560} height={1440} style={{position: 'absolute'}}>
      <defs>
        <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={VIOLET} stopOpacity="0" />
          <stop offset="1" stopColor={VIOLET} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="gridFadeTop" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={C.magenta} stopOpacity="0" />
          <stop offset="1" stopColor={C.magenta} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g stroke="url(#gridFade)" strokeWidth={3}>
        {Array.from({length: 33}).map((_, i) => (
          <line key={`v${i}`} x1={1280} y1={980} x2={-1600 + i * 180} y2={1440} />
        ))}
        {[1000, 1030, 1075, 1140, 1230, 1350].map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={2560} y2={y} />
        ))}
      </g>
      <g stroke="url(#gridFadeTop)" strokeWidth={3}>
        {Array.from({length: 33}).map((_, i) => (
          <line key={`tv${i}`} x1={1280} y1={460} x2={-1600 + i * 180} y2={0} />
        ))}
        {[440, 410, 365, 300, 210, 90].map((y) => (
          <line key={`th${y}`} x1={0} y1={y} x2={2560} y2={y} />
        ))}
      </g>
      {/* light streak through the band */}
      <rect x={0} y={717} width={2560} height={6} fill={C.magenta} opacity={0.5} />
      <rect x={0} y={700} width={2560} height={40} fill={C.magenta} opacity={0.08} />
      {/* floating bills across the whole canvas */}
      {Array.from({length: 22}).map((_, i) => {
        const x = rand(i + 3) * 2560;
        const y = rand(i + 9) * 1440;
        if (x > 480 && x < 2080 && y > 480 && y < 960) return null; // keep the safe area clean
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rand(i) * 360}) scale(${0.5 + rand(i + 5) * 0.6})`} opacity={0.35 + rand(i + 7) * 0.4}>
            <Bill w={170} />
          </g>
        );
      })}
    </svg>

    {/* giant outlined $ behind the avatar */}
    <div
      style={{
        position: 'absolute',
        left: 700 - 330,
        top: 720 - 520,
        fontFamily: F.display,
        fontWeight: 900,
        fontSize: 980,
        lineHeight: 1,
        color: 'transparent',
        WebkitTextStroke: `4px ${C.magenta}`,
        opacity: 0.16,
        transform: 'rotate(-10deg)',
      }}
    >
      $
    </div>

    {/* desktop band sides: the series cast */}
    <svg width={2560} height={1440} style={{position: 'absolute'}}>
      <g transform="translate(260 600) scale(0.45)">
        <Character t={0.4} view="front" mood="smug" arms="down" shades={1} />
      </g>
      <g transform="translate(2300 612) scale(0.5)">
        <Npc kind="manager" t={0.2} flashy smirk look={{x: -0.7, y: 0}} />
      </g>
    </svg>

    {/* avatar */}
    <div
      style={{
        position: 'absolute',
        left: 700 - 190,
        top: 720 - 190,
        width: 380,
        height: 380,
        borderRadius: '50%',
        padding: 10,
        background: `conic-gradient(from 210deg, ${C.magenta}, ${VIOLET}, #29e6ff, ${C.magenta})`,
        boxShadow: `0 0 80px 10px ${C.magenta}66, 0 0 160px 40px ${VIOLET}44`,
      }}
    >
      <div style={{width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '8px solid #07050d'}}>
        <Img src={staticFile('brand/avatar.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
    </div>

    {/* brand */}
    <div style={{position: 'absolute', left: 950, top: 572, width: 1090}}>
      <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, letterSpacing: 10, color: 'rgba(255,255,255,0.7)'}}>МОУШН-ДИЗАЙН · АНИМАЦИЯ · СЕРИАЛЫ</div>
      <div
        style={{
          fontFamily: F.display,
          fontWeight: 900,
          fontSize: 118,
          lineHeight: 1.0,
          letterSpacing: -4,
          marginTop: 14,
          color: '#fff',
          textShadow: `0 0 40px ${VIOLET}aa, 0 10px 0 rgba(0,0,0,0.35)`,
          whiteSpace: 'nowrap',
        }}
      >
        FRHT<span style={{color: C.magenta, textShadow: `0 0 50px ${C.magenta}`}}>.STUDIO</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 30}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: C.magenta,
            color: '#fff',
            borderRadius: 999,
            padding: '14px 32px 14px 20px',
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 28,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 40px ${C.magenta}88`,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#fff',
              color: C.magenta,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ▶
          </span>
          СЕРИАЛ «ГРЯЗНЫЕ МИЛЛИОНЫ»
        </div>
      </div>
    </div>
  </AbsoluteFill>
);
