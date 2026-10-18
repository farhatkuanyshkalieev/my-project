import React from 'react';
import {C} from '../lib/theme';

const O = C.ink;

/** Side-view sedan centred on the origin (~780 wide), facing right. */
export const Car: React.FC<{color?: string; goldRims?: boolean; lights?: number; wheelSpin?: number}> = ({
  color = '#8e1d2a',
  goldRims = false,
  lights = 0,
  wheelSpin = 0,
}) => {
  const rim = goldRims ? '#f2c443' : '#b9bdc3';
  const Wheel = ({x}: {x: number}) => (
    <g transform={`translate(${x} 72)`}>
      <circle r={66} fill="#141418" stroke={O} strokeWidth={7} />
      <circle r={40} fill={rim} stroke={O} strokeWidth={5} />
      <g transform={`rotate(${wheelSpin})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x={-5} y={-36} width={10} height={30} rx={4} fill={goldRims ? '#b58a1c' : '#7d8188'} transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r={9} fill={O} />
      {goldRims && <path d="M -28 -22 Q -10 -36 12 -34" stroke="#fff6cf" strokeWidth={6} fill="none" opacity={0.8} />}
    </g>
  );
  return (
    <g>
      <ellipse cx={0} cy={140} rx={420} ry={22} fill="#000" opacity={0.35} />
      <path
        d="M -390 70 L -390 -10 Q -388 -48 -340 -54 L -230 -62 L -150 -150 Q -130 -168 -100 -168 L 120 -168 Q 150 -168 172 -146 L 250 -62 L 340 -52 Q 388 -44 392 0 L 392 70 Z"
        fill={color}
        stroke={O}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      <path d="M -210 -66 L -140 -144 L -20 -144 L -20 -66 Z" fill="#9ec9e8" stroke={O} strokeWidth={6} opacity={0.85} />
      <path d="M 10 -66 L 10 -144 L 116 -144 Q 136 -144 150 -128 L 214 -66 Z" fill="#9ec9e8" stroke={O} strokeWidth={6} opacity={0.85} />
      <path d="M -380 6 L 386 6" stroke="#000" strokeWidth={4} opacity={0.25} />
      <path d="M -40 -50 L -40 60 M 220 -50 Q 240 10 226 60" stroke={O} strokeWidth={5} opacity={0.6} fill="none" />
      <rect x={-20} y={-20} width={40} height={10} rx={5} fill={O} opacity={0.6} />
      <ellipse cx={378} cy={-16} rx={18} ry={14} fill={lights > 0 ? '#fff7c9' : '#d9d2b0'} stroke={O} strokeWidth={5} />
      <rect x={-394} y={-24} width={20} height={26} rx={6} fill="#ff4a4a" stroke={O} strokeWidth={4} />
      <Wheel x={-240} />
      <Wheel x={250} />
    </g>
  );
};
