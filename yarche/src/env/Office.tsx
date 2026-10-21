// Open-space: grey partitions, blinds, fluorescent panels, the banner he designs now.
import React from 'react';
import {rand} from '../lib/anim';
import {fonts} from '../lib/design';

export const OfficeSet: React.FC<{frame: number}> = ({frame}) => {
  const flick = rand(Math.floor(frame / 3)) > 0.97 ? 0.75 : 1;
  return (
    <g>
      <defs>
        <linearGradient id="of-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9CDD6" />
          <stop offset="1" stopColor="#A8AEBB" />
        </linearGradient>
        <filter id="of-b12" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect x={-600} y={-300} width={3200} height={1700} fill="url(#of-wall)" />
      {/* ceiling panels */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} opacity={flick}>
          <rect x={-120 + i * 460} y={-20} width={340} height={40} fill="#F4F7FF" />
          <rect x={-140 + i * 460} y={10} width={380} height={60} fill="#EEF3FF" opacity={0.5} filter="url(#of-b12)" />
        </g>
      ))}
      {/* window with blinds */}
      <rect x={1180} y={130} width={640} height={440} fill="#DCE3EE" />
      {Array.from({length: 22}).map((_, i) => (
        <rect key={i} x={1180} y={130 + i * 20} width={640} height={12} fill="#EEF1F6" />
      ))}
      {/* wall clock */}
      <g transform="translate(860 230)">
        <circle r={74} fill="#F5F6F8" stroke="#6E747F" strokeWidth={8} />
        {Array.from({length: 12}).map((_, i) => (
          <rect key={i} x={-2} y={-64} width={4} height={12} fill="#555" transform={`rotate(${i * 30})`} />
        ))}
        <rect x={-3} y={-40} width={6} height={44} fill="#333" transform={`rotate(${250 + frame / 600})`} />
        <rect x={-2} y={-58} width={4} height={62} fill="#333" transform={`rotate(${(frame / 60) * 6 * 0 + Math.floor(frame / 60) * 6})`} />
        <circle r={6} fill="#C33" />
      </g>
      {/* partitions */}
      <rect x={-600} y={600} width={3200} height={500} fill="#8E95A3" />
      <rect x={-600} y={590} width={3200} height={16} fill="#B4BAC6" />
      {Array.from({length: 14}).map((_, i) => (
        <rect key={i} x={-600 + i * 240} y={606} width={6} height={500} fill="#6E7482" opacity={0.6} />
      ))}
      {/* sticky notes */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={120 + i * 70} y={630 + (i % 2) * 20} width={56} height={56} fill="#E8E2A8" transform={`rotate(${(i - 1) * 6} ${150 + i * 70} 660)`} />
      ))}
    </g>
  );
};

export const BannerScreen: React.FC<{frame: number; w?: number; h?: number}> = ({frame, w = 760, h = 430}) => {
  const typed = 'СКИДКИ −50%'.slice(0, Math.max(0, Math.min(11, Math.floor(frame / 5))));
  const cx = 120 + ((frame * 3) % 500);
  return (
    <g>
      <rect x={-w / 2 - 30} y={-h / 2 - 30} width={w + 60} height={h + 70} rx={18} fill="#1F2229" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#E8EAEE" />
      {/* editor chrome */}
      <rect x={-w / 2} y={-h / 2} width={w} height={34} fill="#3A3F4A" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={-w / 2 + 22 + i * 22} cy={-h / 2 + 17} r={6} fill="#6E7482" />
      ))}
      <rect x={-w / 2} y={-h / 2 + 34} width={70} height={h - 34} fill="#C9CDD6" />
      {Array.from({length: 7}).map((_, i) => (
        <rect key={i} x={-w / 2 + 18} y={-h / 2 + 60 + i * 46} width={34} height={30} rx={6} fill="#AEB4C0" />
      ))}
      {/* banner artboard */}
      <rect x={-w / 2 + 110} y={-h / 2 + 70} width={w - 150} height={h - 120} fill="#F2F2F2" stroke="#9BA3B0" strokeWidth={2} strokeDasharray="8 6" />
      <rect x={-w / 2 + 130} y={-h / 2 + 90} width={w - 190} height={h - 160} fill="#C6C9CF" />
      <text x={-w / 2 + 150} y={-h / 2 + 200} fontFamily={fonts.cond} fontWeight={700} fontSize={84} fill="#4A4F5A">
        {typed}
      </text>
      <rect x={-w / 2 + 150} y={-h / 2 + 230} width={220} height={44} rx={22} fill="#7D838F" />
      <text x={-w / 2 + 182} y={-h / 2 + 260} fontFamily={fonts.sans} fontWeight={800} fontSize={20} fill="#E8EAEE">
        КУПИТЬ СЕЙЧАС
      </text>
      {/* cursor */}
      <path d={`M${-w / 2 + cx},${-h / 2 + 300} l0,26 l7,-7 l6,13 l5,-3 l-6,-12 l10,0 Z`} fill="#111" />
    </g>
  );
};
