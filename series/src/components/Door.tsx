import React from 'react';
import {F} from '../lib/theme';

/** Motel room door "7" seen from inside, 1080x1920 world. Light leaks through the gap at the bottom. */
export const Door: React.FC<{gapColor?: string; shakeX?: number; feet?: number; t: number}> = ({gapColor = '#ffcf8a', shakeX = 0, feet = 0, t}) => (
  <g>
    <defs>
      <radialGradient id="doorGapGlow">
        <stop offset="0" stopColor={gapColor} stopOpacity="0.55" />
        <stop offset="1" stopColor={gapColor} stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width={1080} height={1490} fill="#0e0810" />
    <rect y={1490} width={1080} height={430} fill="#08050a" />
    <ellipse cx={540} cy={1500} rx={520} ry={130} fill="url(#doorGapGlow)" />
    <g transform={`translate(${shakeX} 0)`}>
      <rect x={240} y={350} width={600} height={1146} fill="#160b0f" />
      <rect x={270} y={380} width={540} height={1104} fill="#2c1a1f" />
      <rect x={320} y={440} width={440} height={420} rx={8} fill="none" stroke="#1d1014" strokeWidth={10} />
      <rect x={320} y={920} width={440} height={500} rx={8} fill="none" stroke="#1d1014" strokeWidth={10} />
      <rect x={505} y={520} width={70} height={84} rx={10} fill="#b48a4a" />
      <text x={540} y={584} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={54} fill="#2c1a1f">
        7
      </text>
      <circle cx={540} cy={700} r={12} fill="#090507" stroke="#b48a4a" strokeWidth={5} />
      <circle cx={540} cy={700} r={4} fill={gapColor} opacity={0.8} />
      <circle cx={760} cy={990} r={22} fill="#b48a4a" />
      <path d="M 640 860 Q 700 900 760 870" stroke="#9b9b9b" strokeWidth={6} fill="none" strokeDasharray="10 4" />
    </g>
    <rect x={270} y={1484} width={540} height={12} fill={gapColor} style={{filter: `drop-shadow(0 0 14px ${gapColor})`}} />
    {feet > 0 &&
      [430, 610].map((x, i) => <rect key={x} x={x + Math.sin(t * 2 + i) * 4} y={1482} width={96} height={16} rx={6} fill="#050307" opacity={feet} />)}
  </g>
);

