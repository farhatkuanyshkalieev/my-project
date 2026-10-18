import React, {useId} from 'react';
import {C} from '../lib/theme';
import {clamp, rand} from '../lib/anim';

const O = C.ink;

export type Mood = 'neutral' | 'smug' | 'worried' | 'panic';

type Props = {
  t: number;
  view?: 'front' | 'back';
  mood?: Mood;
  look?: {x: number; y: number};
  arms?: 'down' | 'hold' | 'carry';
  sweat?: number;
  shades?: number; // 0 = off-screen, 1 = on the face
  tired?: boolean;
  holdItem?: React.ReactNode;
  leftHandItem?: React.ReactNode;
  rightHandItem?: React.ReactNode;
  blinkSeed?: number;
};

/** Is the character mid-blink at time t? (~every 3s, 7 frames) */
const blinkAmount = (t: number, seed: number) => {
  const period = 3.1;
  const k = Math.floor(t / period);
  const at = k * period + rand(k + seed) * 1.8;
  const d = (t - at) / 0.12;
  if (d < 0 || d > 1) return 1;
  return Math.abs(d * 2 - 1) * 0.9 + 0.1;
};

const Arm: React.FC<{d: string}> = ({d}) => (
  <>
    <path d={d} stroke={O} strokeWidth={70} strokeLinecap="round" fill="none" />
    <path d={d} stroke={C.hoodie} strokeWidth={56} strokeLinecap="round" fill="none" />
  </>
);

const Hand: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <ellipse cx={x} cy={y} rx={32} ry={30} fill={C.skin} stroke={O} strokeWidth={6} />
    <path d={`M ${x - 14} ${y - 10} Q ${x - 4} ${y - 2} ${x - 12} ${y + 10}`} stroke={C.skinShade} strokeWidth={4} fill="none" />
  </g>
);

const Sweat: React.FC<{x: number; y: number; s?: number; o?: number}> = ({x, y, s = 1, o = 1}) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M 0 -24 C 10 -8 17 3 17 12 A 17 17 0 0 1 -17 12 C -17 3 -10 -8 0 -24 Z"
    fill="#c4e9ff"
    stroke={O}
    strokeWidth={4.5}
    opacity={o}
  />
);

export const Character: React.FC<Props> = ({
  t,
  view = 'front',
  mood = 'neutral',
  look = {x: 0, y: 0},
  arms = 'down',
  sweat = 0,
  shades = 0,
  tired = false,
  holdItem,
  leftHandItem,
  rightHandItem,
  blinkSeed = 0,
}) => {
  const id = useId().replace(/:/g, '');
  const blink = mood === 'panic' ? 1 : blinkAmount(t, blinkSeed);
  const lx = look.x * 10;
  const ly = look.y * 6;

  const armPaths = {
    down: ['M -132 200 Q -172 320 -166 440', 'M 132 200 Q 172 320 166 440'],
    hold: ['M -130 205 Q -190 380 -62 368', 'M 130 205 Q 190 380 62 368'],
    carry: ['M -134 200 Q -186 320 -196 452', 'M 134 200 Q 186 320 196 452'],
  }[arms];
  const hands = {
    down: [[-166, 448], [166, 448]],
    hold: [[-56, 362], [56, 362]],
    carry: [[-196, 460], [196, 460]],
  }[arms];

  const body = 'M -150 300 C -150 175 -95 120 0 120 C 95 120 150 175 150 300 L 166 520 Q 0 546 -166 520 Z';

  const eye = (cx: number) => {
    if (mood === 'panic') {
      return (
        <g key={cx}>
          <circle cx={cx} cy={40} r={27} fill="#fff" stroke={O} strokeWidth={5} />
          <circle cx={cx + lx * 0.8} cy={40 + ly} r={7} fill={O} />
        </g>
      );
    }
    const ry = mood === 'worried' ? 18 : 21;
    return (
      <g key={cx} transform={`translate(${cx + lx} ${40 + ly}) scale(1 ${blink})`}>
        <ellipse cx={0} cy={0} rx={13} ry={ry} fill={O} />
        <circle cx={4} cy={-8} r={4.5} fill="#fff" />
        {mood === 'smug' && (
          <>
            <rect x={-20} y={-26} width={40} height={24} fill={C.skin} />
            <path d="M -18 -2 L 18 -5" stroke={O} strokeWidth={6} strokeLinecap="round" />
          </>
        )}
      </g>
    );
  };

  const brows = {
    neutral: ['M -68 6 L -24 3', 'M 24 3 L 68 6'],
    smug: ['M -68 0 Q -46 -12 -24 -3', 'M 24 9 L 68 6'],
    worried: ['M -68 14 L -26 -2', 'M 26 -2 L 68 14'],
    panic: ['M -70 0 Q -46 -16 -22 -6', 'M 22 -6 Q 46 -16 70 0'],
  }[mood];

  const mouth = {
    neutral: <path d="M -16 94 Q 0 100 16 94" stroke={O} strokeWidth={7} fill="none" strokeLinecap="round" />,
    smug: <path d="M -24 90 Q 8 108 32 82" stroke={O} strokeWidth={7} fill="none" strokeLinecap="round" />,
    worried: (
      <path d="M -22 98 Q -11 88 0 98 Q 11 108 22 98" stroke={O} strokeWidth={7} fill="none" strokeLinecap="round" />
    ),
    panic: <ellipse cx={0} cy={100} rx={17} ry={23} fill="#3a0f1a" stroke={O} strokeWidth={6} />,
  }[mood];

  const sweatO = clamp(sweat);
  const drip = (t * 0.9) % 1;

  return (
    <g>
      <defs>
        <clipPath id={`head${id}`}>
          <ellipse cx={0} cy={0} rx={118} ry={128} />
        </clipPath>
        <clipPath id={`body${id}`}>
          <path d={body} />
        </clipPath>
      </defs>

      {/* legs */}
      <g>
        <path d="M -98 480 L -92 664 L -26 664 L -22 480 Z" fill="#1d1c24" stroke={O} strokeWidth={6} />
        <path d="M 98 480 L 92 664 L 26 664 L 22 480 Z" fill="#1d1c24" stroke={O} strokeWidth={6} />
        {[-62, 62].map((x) => (
          <g key={x}>
            <path
              d={`M ${x - 56} 690 Q ${x - 58} 650 ${x - 20} 652 L ${x + 30} 652 Q ${x + 62} 656 ${x + 60} 690 Z`}
              fill="#f7f7f2"
              stroke={O}
              strokeWidth={6}
            />
            <path d={`M ${x - 56} 680 L ${x + 60} 680`} stroke={O} strokeWidth={4} />
            <path d={`M ${x - 10} 660 L ${x + 18} 668`} stroke={C.magenta} strokeWidth={6} strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* arms behind body for back view */}
      {view === 'back' && armPaths.map((d) => <Arm key={d} d={d} />)}

      {/* body */}
      <path d={body} fill={C.hoodie} stroke={O} strokeWidth={7} />
      <g clipPath={`url(#body${id})`}>
        <rect x={70} y={100} width={140} height={460} fill={C.hoodieShade} opacity={0.55} />
        <path d="M -166 505 Q 0 528 166 505" stroke={C.hoodieShade} strokeWidth={26} fill="none" />
      </g>

      {view === 'front' ? (
        <>
          {arms !== 'hold' && (
            <path d="M -95 398 L 95 398 L 116 490 L -116 490 Z" fill={C.hoodieShade} stroke={O} strokeWidth={5} />
          )}
          <ellipse cx={0} cy={132} rx={100} ry={40} fill={C.hoodieShade} stroke={O} strokeWidth={6} />
          <path d="M -28 160 L -34 252 M 28 160 L 34 252" stroke="#d9d3c6" strokeWidth={6} strokeLinecap="round" />
          <rect x={-40} y={248} width={12} height={20} rx={3} fill="#d9d3c6" stroke={O} strokeWidth={3} />
          <rect x={28} y={248} width={12} height={20} rx={3} fill="#d9d3c6" stroke={O} strokeWidth={3} />
        </>
      ) : (
        <path
          d="M -116 122 Q 0 92 116 122 Q 128 236 0 258 Q -128 236 -116 122 Z"
          fill={C.hoodieShade}
          stroke={O}
          strokeWidth={6}
        />
      )}

      {/* front arms + held items */}
      {view === 'front' && (
        <>
          {armPaths.map((d) => (
            <Arm key={d} d={d} />
          ))}
          {holdItem && <g transform="translate(0 330)">{holdItem}</g>}
        </>
      )}
      {leftHandItem && <g transform={`translate(${hands[0][0]} ${hands[0][1]})`}>{leftHandItem}</g>}
      {rightHandItem && <g transform={`translate(${hands[1][0]} ${hands[1][1]})`}>{rightHandItem}</g>}
      {hands.map(([x, y]) => (
        <Hand key={x} x={x} y={y} />
      ))}

      {/* head */}
      <g>
        <ellipse cx={0} cy={0} rx={118} ry={128} fill={C.skinShade} />
        <g clipPath={`url(#head${id})`}>
          <ellipse cx={-16} cy={-10} rx={114} ry={126} fill={C.skin} />
        </g>
        <ellipse cx={0} cy={0} rx={118} ry={128} fill="none" stroke={O} strokeWidth={7} />

        {view === 'front' ? (
          <>
            {tired && (
              <path
                d="M -62 70 Q -44 80 -26 70 M 26 70 Q 44 80 62 70"
                stroke="#a99f8c"
                strokeWidth={4.5}
                fill="none"
                strokeLinecap="round"
              />
            )}
            {eye(-44)}
            {eye(44)}
            {brows.map((d) => (
              <path key={d} d={d} stroke={O} strokeWidth={10} strokeLinecap="round" fill="none" />
            ))}
            {mouth}
            {mood === 'smug' && (
              <>
                <ellipse cx={-72} cy={76} rx={14} ry={7} fill={C.magenta} opacity={0.25} />
                <ellipse cx={72} cy={76} rx={14} ry={7} fill={C.magenta} opacity={0.25} />
              </>
            )}
            {/* cap */}
            <path
              d="M -121 -18 C -128 -120 -60 -158 0 -158 C 60 -158 128 -120 121 -18 Z"
              fill={C.cap}
              stroke={O}
              strokeWidth={7}
            />
            <path d="M -70 -140 Q -40 -100 -46 -24 M 70 -140 Q 40 -100 46 -24" stroke="#2b2934" strokeWidth={4} fill="none" />
            <rect x={-36} y={-116} width={72} height={50} rx={12} fill={C.magenta} stroke={O} strokeWidth={5} />
            <text x={0} y={-79} textAnchor="middle" fontFamily="Unbounded" fontWeight={900} fontSize={36} fill={C.cap}>
              $
            </text>
            <circle cx={0} cy={-156} r={9} fill={C.magenta} stroke={O} strokeWidth={4} />
            <path d="M -134 -30 Q 0 24 134 -30 L 127 -52 Q 0 -6 -127 -52 Z" fill="#0f0e13" stroke={O} strokeWidth={6} />
            {shades > 0 && (
              <g transform={`translate(0 ${(1 - shades) * -320}) rotate(${(1 - shades) * -14})`}>
                <path d="M -84 26 L 84 26" stroke={O} strokeWidth={8} />
                <rect x={-84} y={20} width={72} height={44} rx={14} fill="#0d0c11" stroke={O} strokeWidth={5} />
                <rect x={12} y={20} width={72} height={44} rx={14} fill="#0d0c11" stroke={O} strokeWidth={5} />
                <path d="M -70 54 L -50 28 M 26 54 L 46 28" stroke="#ffffff" strokeWidth={5} opacity={0.6} />
              </g>
            )}
          </>
        ) : (
          <>
            <path
              d="M -121 -4 C -128 -120 -60 -158 0 -158 C 60 -158 128 -120 121 -4 Q 0 20 -121 -4 Z"
              fill={C.cap}
              stroke={O}
              strokeWidth={7}
            />
            <path d="M -30 6 Q 0 -42 30 6 Z" fill={C.skin} stroke={O} strokeWidth={5} />
            <rect x={-36} y={-2} width={72} height={11} rx={4} fill="#2b2934" stroke={O} strokeWidth={3} />
            <path d="M 0 -158 Q 6 -80 0 -40" stroke="#2b2934" strokeWidth={4} fill="none" />
            <circle cx={0} cy={-156} r={9} fill={C.magenta} stroke={O} strokeWidth={4} />
          </>
        )}

        {sweatO > 0 && view === 'front' && (
          <>
            <Sweat x={104} y={-6 + drip * 40} o={sweatO * (1 - drip * 0.6)} />
            <Sweat x={-108} y={28 + ((drip + 0.5) % 1) * 36} s={0.8} o={sweatO * (1 - ((drip + 0.5) % 1) * 0.6)} />
          </>
        )}
      </g>
    </g>
  );
};
