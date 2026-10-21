// Cold open: Mark's hand draws her portrait on a paper cup in one confident marker line,
// then the calligraphic title «Ярче» blooms out of a paint splash.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease, FPS, lerp, rand, track} from '../lib/anim';
import {fonts, P, SKIN} from '../lib/design';
import {Cup, doodleTip} from '../rig/props';
import {Splat} from '../mg/Transitions';

const M = SKIN.mark;

export const S0Title: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const draw = ease.inOutQuad(clamp((s - 0.25) / 2.1));
  const [tx, ty] = doodleTip(draw);
  const lift = ease.inOutCubic(clamp((s - 2.35) / 0.6));
  const cupS = 2.3;
  const cupX = 640;
  const cupY = 250;
  // marker tip in screen space
  const mx = cupX + tx * cupS + lift * 260;
  const my = cupY + ty * cupS - lift * 220 + Math.sin(frame / 3) * 0.6 * (1 - lift);
  const push = lerp(1, 1.07, ease.inOutQuad(clamp(s / 4)));
  const titleK = clamp((s - 2.2) / 0.9);
  const subK = clamp((s - 2.75) / 0.8);
  const bg = Array.from({length: 18});

  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg, #FBD9E5 0%, #F7B7CE 45%, #F6C7A6 100%)'}}>
      {/* drifting bokeh */}
      <svg width={1920} height={1080} style={{position: 'absolute', filter: 'blur(14px)'}}>
        {bg.map((_, i) => (
          <circle
            key={i}
            cx={(rand(i) * 2100 + frame * (0.3 + rand(i * 2) * 0.5)) % 2100 - 90}
            cy={rand(i * 3) * 1080 + Math.sin(frame / 60 + i) * 20}
            r={30 + rand(i * 4) * 90}
            fill={[P.pink, '#fff', P.lime, P.peach][i % 4]}
            opacity={0.18 + rand(i * 5) * 0.2}
          />
        ))}
      </svg>
      <AbsoluteFill style={{transform: `scale(${push}) rotate(${lerp(-1.2, 0.4, s / 4)}deg)`}}>
        <svg width={1920} height={1080}>
          <defs>
            <filter id="t0-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
          </defs>
          {/* cup shadow + cup */}
          <ellipse cx={cupX + 30} cy={cupY + 240 * cupS} rx={210} ry={40} fill="#9C4A6A" opacity={0.3} filter="url(#t0-shadow)" />
          <g transform={`translate(${cupX} ${cupY}) scale(${cupS})`}>
            <Cup id="t0cup" doodle={draw} frame={frame} steam={0.8} />
          </g>
          {/* Mark's hand with marker: drawn along the marker axis (+x), then rotated */}
          <g transform={`translate(${mx} ${my}) rotate(${-52 + Math.sin(frame / 14) * 3 * (1 - lift)}) scale(1.45)`}>
            <path d="M-2,0 L14,-9 L14,9 Z" fill="#E63E86" />
            <rect x={12} y={-13} width={230} height={26} rx={9} fill="#1C1622" />
            <rect x={20} y={-9} width={200} height={5} rx={2.5} fill="#fff" opacity={0.22} />
            <rect x={196} y={-14} width={50} height={28} rx={9} fill={P.pink} />
            {/* back of the hand */}
            <path d="M70,-34 C110,-70 210,-78 262,-52 L304,-44 L304,74 L254,76 C196,88 128,66 86,34 C64,18 56,-12 70,-34 Z" fill={M.shade} />
            <path d="M96,-44 C140,-66 200,-70 250,-56" stroke={M.light} strokeWidth={8} fill="none" opacity={0.5} strokeLinecap="round" />
            {/* knuckles */}
            {[120, 160, 200].map((x) => (
              <ellipse key={x} cx={x} cy={-48 + (x - 120) * 0.05} rx={14} ry={9} fill={M.light} opacity={0.35} />
            ))}
            {/* tucked middle + ring fingers */}
            <path d="M92,30 C110,62 170,70 214,60 C226,56 226,40 212,36 C170,40 128,30 104,18 Z" fill={M.base} />
            <path d="M120,48 C150,58 186,58 210,52" stroke={M.deep} strokeWidth={3} opacity={0.4} fill="none" />
            {/* thumb under the marker */}
            <path d="M52,14 C60,30 110,40 176,34 C190,32 190,14 176,12 C130,14 90,10 66,2 Z" fill={M.base} />
            <path d="M52,14 C54,6 60,2 68,2 L80,6 C74,14 64,18 52,14 Z" fill={M.light} />
            {/* index finger over the marker */}
            <path d="M38,-10 C38,-26 60,-34 100,-34 L176,-36 C192,-36 194,-14 178,-12 L100,-8 C70,-6 50,-2 38,-10 Z" fill={M.base} />
            <path d="M40,-16 C44,-26 56,-30 68,-30" stroke={M.light} strokeWidth={5} fill="none" opacity={0.7} strokeLinecap="round" />
            <path d="M38,-10 C38,-22 48,-28 58,-28 L62,-16 C56,-10 46,-8 38,-10 Z" fill={M.light} opacity={0.8} />
            <path d="M110,-34 L112,-10 M150,-35 L152,-12" stroke={M.deep} strokeWidth={2.5} opacity={0.35} />
            {/* coat cuff */}
            <path d="M292,-62 L392,-74 L404,96 L292,86 Z" fill="#3A2620" />
            <path d="M292,-62 L300,86" stroke="#F5F0EA" strokeWidth={10} />
            <path d="M330,-66 L340,90" stroke="#21140F" strokeWidth={4} opacity={0.6} />
          </g>
          {/* title splash */}
          <Splat t={s - 2.2} x={1340} y={470} seed={5} scale={1.1} />
        </svg>
      </AbsoluteFill>
      {/* calligraphic title */}
      <div
        style={{
          position: 'absolute',
          left: 980,
          top: 250,
          width: 760,
          textAlign: 'center',
          fontFamily: fonts.script,
          fontSize: 300,
          lineHeight: 1,
          color: P.pink,
          textShadow: '0 10px 40px rgba(240,65,140,0.45), 0 0 2px rgba(120,10,60,0.4)',
          clipPath: `inset(-20% ${100 - ease.inOutCubic(titleK) * 125}% -20% -10%)`,
          transform: `translateY(${(1 - ease.outCubic(titleK)) * 30}px) scale(${lerp(0.94, 1, ease.outCubic(titleK))})`,
        }}
      >
        Ярче
      </div>
      <div
        style={{
          position: 'absolute',
          left: 980,
          top: 610,
          width: 760,
          textAlign: 'center',
          fontFamily: fonts.serif,
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.25,
          color: P.plum,
          opacity: ease.outCubic(subK),
          transform: `translateY(${(1 - ease.outCubic(subK)) * 20}px)`,
          letterSpacing: `${lerp(0.12, 0.01, ease.outCubic(subK))}em`,
        }}
      >
        о том, как она влюбилась в его краски,
        <br />а потом попросила рисовать серым
      </div>
      {/* sparkle on title */}
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {[0, 1, 2, 3, 4].map((i) => {
          const t = s - 2.8 - i * 0.12;
          const k = Math.sin(clamp(t / 0.6) * Math.PI);
          const x = 1120 + i * 120 + rand(i) * 40;
          const y = 300 + rand(i * 3) * 220;
          const r = 22 * k;
          return k > 0 ? <path key={i} d={`M${x},${y - r} L${x + r * 0.18},${y - r * 0.18} L${x + r},${y} L${x + r * 0.18},${y + r * 0.18} L${x},${y + r} L${x - r * 0.18},${y + r * 0.18} L${x - r},${y} L${x - r * 0.18},${y - r * 0.18} Z`} fill="#fff" /> : null;
        })}
      </svg>
      <div style={{position: 'absolute', inset: 0, opacity: track(frame, [[0, 1], [18, 0]]), background: '#14081A'}} />
    </AbsoluteFill>
  );
};
