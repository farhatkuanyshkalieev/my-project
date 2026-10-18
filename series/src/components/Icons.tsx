import React from 'react';
import {C, F} from '../lib/theme';

const O = C.ink;

/** All icons are centred on the origin and roughly 300 units wide. */

export const BankIcon: React.FC = () => (
  <g>
    <path d="M -160 -40 L 0 -140 L 160 -40 Z" fill="#e6dccb" stroke={O} strokeWidth={8} strokeLinejoin="round" />
    <circle cx={0} cy={-72} r={20} fill={C.money} stroke={O} strokeWidth={6} />
    <rect x={-150} y={-40} width={300} height={22} fill="#d6cbb7" stroke={O} strokeWidth={7} />
    {[-110, -40, 40, 110].map((x) => (
      <rect key={x} x={x - 18} y={-18} width={36} height={130} fill="#efe8da" stroke={O} strokeWidth={7} />
    ))}
    <rect x={-170} y={112} width={340} height={24} fill="#d6cbb7" stroke={O} strokeWidth={7} />
    <rect x={-190} y={136} width={380} height={22} fill="#c9bea9" stroke={O} strokeWidth={7} />
  </g>
);

export const GovIcon: React.FC = () => (
  <g>
    <line x1={0} y1={-190} x2={0} y2={-120} stroke={O} strokeWidth={6} />
    <path d="M 0 -190 L 46 -178 L 0 -166 Z" fill={C.red} stroke={O} strokeWidth={4} />
    <path d="M -90 -40 Q -90 -130 0 -130 Q 90 -130 90 -40 Z" fill="#e6dccb" stroke={O} strokeWidth={8} />
    <rect x={-150} y={-40} width={300} height={20} fill="#d6cbb7" stroke={O} strokeWidth={7} />
    {[-120, -72, -24, 24, 72, 120].map((x) => (
      <rect key={x} x={x - 13} y={-20} width={26} height={110} fill="#efe8da" stroke={O} strokeWidth={6} />
    ))}
    <rect x={-170} y={90} width={340} height={26} fill="#c9bea9" stroke={O} strokeWidth={7} />
  </g>
);

export const Envelope: React.FC<{label?: string}> = ({label = 'ОТЧЁТ'}) => (
  <g>
    <rect x={-110} y={-70} width={220} height={140} rx={10} fill="#fff" stroke={O} strokeWidth={7} />
    <path d="M -110 -70 L 0 10 L 110 -70" fill="none" stroke={O} strokeWidth={7} strokeLinejoin="round" />
    <rect x={-70} y={24} width={140} height={34} rx={6} fill={C.red} />
    <text x={0} y={50} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={22} fill="#fff">
      {label}
    </text>
  </g>
);

export const StorageIcon: React.FC<{open?: number}> = ({open = 0}) => (
  <g>
    <path d="M -360 -150 L 0 -230 L 360 -150 Z" fill="#9a9a9a" stroke={O} strokeWidth={8} strokeLinejoin="round" />
    <rect x={-350} y={-150} width={700} height={330} fill="#c8c3b8" stroke={O} strokeWidth={8} />
    {[-230, 0, 230].map((x, i) => (
      <g key={x}>
        <rect x={x - 95} y={-110} width={190} height={290} fill="#2a1c12" stroke={O} strokeWidth={6} />
        <rect x={x - 95} y={-110} width={190} height={290 * (1 - (i === 1 ? open : 0))} fill="#e8742a" stroke={O} strokeWidth={6} />
        {Array.from({length: 9}).map((_, k) =>
          -110 + k * 30 < -110 + 290 * (1 - (i === 1 ? open : 0)) - 6 ? (
            <line key={k} x1={x - 95} y1={-110 + k * 30 + 22} x2={x + 95} y2={-110 + k * 30 + 22} stroke="#b4561c" strokeWidth={4} />
          ) : null
        )}
        <text x={x} y={-124} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={22} fill={O}>
          {['A-12', 'A-13', 'A-14'][i]}
        </text>
      </g>
    ))}
    <rect x={-370} y={180} width={740} height={22} fill="#7c776d" stroke={O} strokeWidth={6} />
  </g>
);

export const SafeWall: React.FC<{pull?: number}> = ({pull = 0}) => {
  const cols = 6;
  const rows = 4;
  const w = 104;
  const h = 74;
  return (
    <g>
      <rect x={-(cols * w) / 2 - 24} y={-(rows * h) / 2 - 24} width={cols * w + 48} height={rows * h + 48} rx={14} fill="#8e9298" stroke={O} strokeWidth={8} />
      {Array.from({length: cols * rows}).map((_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = -(cols * w) / 2 + c * w;
        const y = -(rows * h) / 2 + r * h;
        const hero = r === 1 && c === 3;
        const s = hero ? 1 + pull * 0.5 : 1;
        return (
          <g key={i} transform={`translate(${x + w / 2} ${y + h / 2 + (hero ? pull * 40 : 0)}) scale(${s})`}>
            <rect x={-w / 2 + 5} y={-h / 2 + 5} width={w - 10} height={h - 10} rx={6} fill={hero ? '#d9dde2' : '#b9bdc3'} stroke={O} strokeWidth={4} />
            <circle cx={0} cy={0} r={9} fill="#5a5e64" stroke={O} strokeWidth={3} />
            <text x={-w / 2 + 14} y={-h / 2 + 24} fontFamily={F.mono} fontWeight={700} fontSize={14} fill="#4a4e54">
              {100 + i * 7}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export const Passport: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <g>
    <rect x={-150} y={-100} width={300} height={200} rx={14} fill="#f3efe4" stroke={O} strokeWidth={7} />
    <rect x={-150} y={-100} width={300} height={44} rx={14} fill="#7a1f2b" />
    <text x={0} y={-70} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={22} fill="#f1d68a">
      ПАСПОРТ
    </text>
    <defs>
      <clipPath id="passportPhoto">
        <rect x={-130} y={-40} width={110} height={124} rx={8} />
      </clipPath>
    </defs>
    <rect x={-130} y={-40} width={110} height={124} rx={8} fill="#d8d1c2" />
    <g clipPath="url(#passportPhoto)">
      <g transform="translate(-75 30) scale(0.36)">{children}</g>
    </g>
    <rect x={-130} y={-40} width={110} height={124} rx={8} fill="none" stroke={O} strokeWidth={4} />
    {[-30, 0, 30, 60].map((y) => (
      <rect key={y} x={0} y={y - 10} width={y === 60 ? 80 : 120} height={10} rx={5} fill="#b9b2a2" />
    ))}
  </g>
);

export const Cctv: React.FC<{t: number; flip?: boolean}> = ({t, flip}) => (
  <g transform={flip ? 'scale(-1 1)' : undefined}>
    <rect x={-10} y={-80} width={20} height={60} fill="#5a5e64" stroke={O} strokeWidth={5} />
    <g transform="rotate(18)">
      <rect x={-70} y={-30} width={140} height={60} rx={12} fill="#e6e6e6" stroke={O} strokeWidth={6} />
      <circle cx={62} cy={0} r={22} fill="#1c1c22" stroke={O} strokeWidth={5} />
      <circle cx={66} cy={-4} r={6} fill="#6aa0ff" />
      <circle cx={-44} cy={-10} r={8} fill={Math.floor(t * 3) % 2 ? C.red : '#5a1a1a'} />
    </g>
  </g>
);

export const Cross: React.FC<{p: number; size?: number}> = ({p, size = 80}) => {
  const k = Math.max(0, Math.min(1, p));
  const L = size * 1.4;
  return (
    <g stroke={C.red} strokeWidth={size * 0.22} strokeLinecap="round">
      <line x1={-size / 2} y1={-size / 2} x2={-size / 2 + L * Math.min(1, k * 2) * 0.707} y2={-size / 2 + L * Math.min(1, k * 2) * 0.707} />
      {k > 0.5 && (
        <line x1={size / 2} y1={-size / 2} x2={size / 2 - L * (k * 2 - 1) * 0.707} y2={-size / 2 + L * (k * 2 - 1) * 0.707} />
      )}
    </g>
  );
};
