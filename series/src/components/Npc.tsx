import React, {useId} from 'react';
import {C, F} from '../lib/theme';
import {rand} from '../lib/anim';

const O = C.ink;

type Eyes = 'normal' | 'wide' | 'side' | 'dollar';

type Props = {
  kind: 'manager' | 'analyst';
  t: number;
  view?: 'front' | 'back';
  eyes?: Eyes;
  look?: {x: number; y: number};
  shout?: boolean;
  /** 0..1 glint sweeping across the analyst's glasses */
  glint?: number;
  /** after the payout: red bomber jacket + gold chain */
  flashy?: boolean;
  legs?: boolean;
  smirk?: boolean;
};

const blinkScale = (t: number, seed: number) => {
  const period = 2.7;
  const k = Math.floor(t / period);
  const at = k * period + rand(k + seed) * 1.5;
  const d = (t - at) / 0.12;
  return d < 0 || d > 1 ? 1 : Math.abs(d * 2 - 1) * 0.9 + 0.1;
};

const Eye: React.FC<{x: number; y: number; kind: Eyes; look: {x: number; y: number}; blink: number}> = ({x, y, kind, look, blink}) => {
  if (kind === 'wide' || kind === 'dollar') {
    return (
      <g>
        <circle cx={x} cy={y} r={26} fill="#fff" stroke={O} strokeWidth={5} />
        {kind === 'dollar' ? (
          <text x={x} y={y + 13} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={34} fill={C.moneyDark}>
            $
          </text>
        ) : (
          <circle cx={x + look.x * 8} cy={y + look.y * 6} r={8} fill={O} />
        )}
      </g>
    );
  }
  const lx = (kind === 'side' ? 9 : look.x * 8);
  return (
    <g transform={`translate(${x + lx} ${y + look.y * 5}) scale(1 ${blink})`}>
      <ellipse rx={10} ry={14} fill={O} />
      <circle cx={3} cy={-5} r={3.5} fill="#fff" />
    </g>
  );
};

/** Secondary cast: the motel night manager and the financial analyst. Same rig as Character (head at origin). */
export const Npc: React.FC<Props> = ({kind, t, view = 'front', eyes = 'normal', look = {x: 0, y: 0}, shout = false, glint = -1, flashy = false, legs = false, smirk = false}) => {
  const id = useId().replace(/:/g, '');
  const blink = blinkScale(t, kind === 'manager' ? 11 : 23);
  const manager = kind === 'manager';
  const skin = manager ? '#f2e2cc' : '#f4efe6';
  const shade = manager ? '#dcc6a8' : '#d8d1c2';
  const shirt = flashy ? '#c4232f' : manager ? '#3d7a7d' : '#e9e6df';
  const shirtShade = flashy ? '#8e1620' : manager ? '#2d5c5e' : '#c9c4ba';
  const body = 'M -150 300 C -150 175 -95 120 0 120 C 95 120 150 175 150 300 L 166 560 L -166 560 Z';

  return (
    <g>
      <defs>
        <clipPath id={`nh${id}`}>
          <ellipse rx={118} ry={128} />
        </clipPath>
        <clipPath id={`nb${id}`}>
          <path d={body} />
        </clipPath>
      </defs>

      {legs && (
        <g>
          <path d="M -98 520 L -92 664 L -26 664 L -22 520 Z" fill="#23222c" stroke={O} strokeWidth={6} />
          <path d="M 98 520 L 92 664 L 26 664 L 22 520 Z" fill="#23222c" stroke={O} strokeWidth={6} />
          {[-62, 62].map((x) => (
            <path
              key={x}
              d={`M ${x - 56} 690 Q ${x - 58} 650 ${x - 20} 652 L ${x + 30} 652 Q ${x + 62} 656 ${x + 60} 690 Z`}
              fill={flashy ? '#f7f7f2' : '#3a2a20'}
              stroke={O}
              strokeWidth={6}
            />
          ))}
        </g>
      )}
      {/* torso */}
      <path d={body} fill={shirt} stroke={O} strokeWidth={7} />
      <g clipPath={`url(#nb${id})`}>
        <rect x={70} y={100} width={140} height={480} fill={shirtShade} opacity={0.55} />
      </g>
      {view === 'front' && flashy ? (
        <>
          <path d="M -62 124 L -40 560 L 40 560 L 62 124 Q 0 150 -62 124 Z" fill="#f4f1ea" stroke={O} strokeWidth={6} />
          <path d="M -66 124 L -30 300 M 66 124 L 30 300" stroke="#8e1620" strokeWidth={14} />
          <path d="M -56 140 Q 0 250 56 140" fill="none" stroke="#e8b730" strokeWidth={12} strokeDasharray="14 5" />
          <circle cx={0} cy={232} r={20} fill="#f5c842" stroke={O} strokeWidth={5} />
          <text x={0} y={242} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={24} fill="#8a6410">
            $
          </text>
        </>
      ) : view === 'front' ? (
        <>
          <path d="M -70 128 L 0 210 L 70 128" fill="none" stroke={O} strokeWidth={6} />
          <path d="M -70 128 L -20 200 L -64 210 Z M 70 128 L 20 200 L 64 210 Z" fill={manager ? '#f2efe6' : '#ffffff'} stroke={O} strokeWidth={5} />
          {manager ? (
            <>
              <line x1={0} y1={212} x2={0} y2={540} stroke={shirtShade} strokeWidth={6} />
              {[260, 330, 400, 470].map((y) => (
                <circle key={y} cx={10} cy={y} r={6} fill="#f2efe6" stroke={O} strokeWidth={3} />
              ))}
              <rect x={-128} y={238} width={104} height={44} rx={6} fill="#fff" stroke={O} strokeWidth={4} />
              <text x={-76} y={268} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={20} fill={O}>
                АДМИН
              </text>
            </>
          ) : (
            <path d="M 0 205 L -22 240 L 0 470 L 22 240 Z" fill="#8a1f2c" stroke={O} strokeWidth={5} />
          )}
        </>
      ) : (
        <path d="M -90 128 Q 0 160 90 128" fill="none" stroke={O} strokeWidth={6} />
      )}

      {/* ears */}
      {[-1, 1].map((d) => (
        <ellipse key={d} cx={d * 116} cy={14} rx={18} ry={26} fill={skin} stroke={O} strokeWidth={6} />
      ))}

      {/* head */}
      <ellipse rx={118} ry={128} fill={shade} />
      <g clipPath={`url(#nh${id})`}>
        <ellipse cx={-16} cy={-10} rx={114} ry={126} fill={skin} />
      </g>
      <ellipse rx={118} ry={128} fill="none" stroke={O} strokeWidth={7} />

      {manager ? (
        <>
          {/* bald shine + side tufts */}
          <ellipse cx={-40} cy={-84} rx={42} ry={16} fill="#fff" opacity={0.45} transform="rotate(-20 -40 -84)" />
          <path d="M -117 -34 Q -138 8 -112 46 Q -96 8 -102 -34 Z" fill="#6b4a32" stroke={O} strokeWidth={5} />
          <path d="M 117 -34 Q 138 8 112 46 Q 96 8 102 -34 Z" fill="#6b4a32" stroke={O} strokeWidth={5} />
        </>
      ) : (
        <path
          d="M -120 -24 C -124 -120 -40 -152 20 -146 C 92 -140 128 -92 120 -26 Q 84 -76 30 -84 Q -44 -96 -120 -24 Z"
          fill="#bdb7ae"
          stroke={O}
          strokeWidth={6}
        />
      )}

      {view === 'front' && (
        <>
          {manager ? (
            <path d="M -74 -18 Q -40 -36 -6 -22 Q 0 -30 6 -22 Q 40 -36 74 -18" stroke="#4a3220" strokeWidth={13} fill="none" strokeLinecap="round" />
          ) : (
            <path d="M -74 -10 L -26 0 M 26 0 L 74 -10" stroke={O} strokeWidth={10} fill="none" strokeLinecap="round" />
          )}
          <Eye x={-42} y={18} kind={eyes} look={look} blink={blink} />
          <Eye x={42} y={18} kind={eyes} look={look} blink={blink} />
          {!manager && (
            <g>
              <rect x={-82} y={-6} width={72} height={50} rx={12} fill="#9fd3ff" fillOpacity={0.18} stroke={O} strokeWidth={6} />
              <rect x={10} y={-6} width={72} height={50} rx={12} fill="#9fd3ff" fillOpacity={0.18} stroke={O} strokeWidth={6} />
              <path d="M -10 14 L 10 14" stroke={O} strokeWidth={6} />
              {glint >= 0 && glint <= 1 && (
                <>
                  <rect x={-82 + glint * 60} y={-6} width={10} height={50} fill="#fff" opacity={0.7} transform={`skewX(-20)`} />
                  <rect x={10 + glint * 60} y={-6} width={10} height={50} fill="#fff" opacity={0.7} transform={`skewX(-20)`} />
                </>
              )}
            </g>
          )}
          <path d="M 0 30 Q 16 56 -4 62" stroke={O} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path
            d={manager ? 'M -66 84 Q -34 62 0 74 Q 34 62 66 84 Q 40 102 0 90 Q -40 102 -66 84 Z' : 'M -44 84 Q -22 72 0 80 Q 22 72 44 84 Q 24 96 0 90 Q -24 96 -44 84 Z'}
            fill={manager ? '#5a3a26' : '#9e978d'}
            stroke={O}
            strokeWidth={5}
          />
          {shout ? (
            <ellipse cx={0} cy={110} rx={20} ry={17} fill="#3a0f1a" stroke={O} strokeWidth={5} />
          ) : (
            <path
              d={smirk ? 'M -22 104 Q 6 120 30 98' : manager ? 'M -14 108 Q 0 112 14 108' : 'M -16 112 Q 0 104 16 112'}
              stroke={O}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
            />
          )}
        </>
      )}
    </g>
  );
};
