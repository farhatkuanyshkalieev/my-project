import React from 'react';
import {C, F} from '../lib/theme';

const O = C.ink;

/** Small stylised banknote, centred on origin. */
export const Bill: React.FC<{w?: number; tint?: string; serial?: boolean}> = ({w = 200, tint = C.moneyPaper, serial}) => {
  const h = w * 0.43;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.03} fill={tint} stroke="#2d4a2a" strokeWidth={w * 0.02} />
      <rect
        x={-w / 2 + w * 0.05}
        y={-h / 2 + h * 0.1}
        width={w * 0.9}
        height={h * 0.8}
        rx={w * 0.02}
        fill="none"
        stroke="#5d7f52"
        strokeWidth={w * 0.012}
      />
      <ellipse cx={0} cy={0} rx={w * 0.14} ry={h * 0.33} fill="#b6c79c" stroke="#3f6b3a" strokeWidth={w * 0.012} />
      <circle cx={0} cy={-h * 0.07} r={w * 0.045} fill="#6f8f5f" />
      <path
        d={`M ${-w * 0.08} ${h * 0.25} Q 0 ${h * 0.02} ${w * 0.08} ${h * 0.25}`}
        fill="#6f8f5f"
      />
      <text x={-w * 0.36} y={-h * 0.18} fontFamily={F.display} fontWeight={900} fontSize={w * 0.1} fill="#3f6b3a" textAnchor="middle">
        100
      </text>
      <text x={w * 0.36} y={h * 0.32} fontFamily={F.display} fontWeight={900} fontSize={w * 0.1} fill="#3f6b3a" textAnchor="middle">
        100
      </text>
      {serial && (
        <text x={w * 0.28} y={-h * 0.2} fontFamily={F.mono} fontWeight={700} fontSize={w * 0.05} fill="#2d4a2a" textAnchor="middle">
          KB 07143592 C
        </text>
      )}
    </g>
  );
};

/** Bundle of notes with a paper band. */
export const Bundle: React.FC<{w?: number}> = ({w = 90}) => {
  const h = w * 0.45;
  return (
    <g>
      {[3, 2, 1, 0].map((k) => (
        <rect key={k} x={-w / 2 + k * 2} y={-h / 2 - k * 3} width={w} height={h} rx={3} fill={k ? '#b9c79f' : C.moneyPaper} stroke="#2d4a2a" strokeWidth={3} />
      ))}
      <rect x={-w * 0.12} y={-h / 2 - 1} width={w * 0.24} height={h + 2} fill="#efe1b8" stroke="#2d4a2a" strokeWidth={2.5} />
    </g>
  );
};

/** Duffel bag stuffed with cash, centred on origin (≈ 320 wide). */
export const Duffel: React.FC<{open?: boolean; color?: string}> = ({open = true, color = '#232838'}) => (
  <g>
    <path d="M -64 -60 C -64 -150 64 -150 64 -60" stroke={O} strokeWidth={18} fill="none" strokeLinecap="round" />
    <path d="M -64 -60 C -64 -150 64 -150 64 -60" stroke="#343b52" strokeWidth={9} fill="none" strokeLinecap="round" />
    <rect x={-160} y={-76} width={320} height={152} rx={72} fill={color} stroke={O} strokeWidth={7} />
    <path d="M -110 -58 Q 0 -78 110 -58" stroke="#3a4260" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.8} />
    <ellipse cx={-136} cy={0} rx={28} ry={66} fill="#1a1e2a" stroke={O} strokeWidth={5} />
    <ellipse cx={136} cy={0} rx={28} ry={66} fill="#1a1e2a" stroke={O} strokeWidth={5} />
    <path d="M -100 40 L 100 40" stroke="#151926" strokeWidth={6} />
    {open ? (
      <>
        <ellipse cx={0} cy={-46} rx={100} ry={24} fill="#0b0d14" stroke={O} strokeWidth={5} />
        <g transform="translate(-44 -62) rotate(-12)">
          <Bundle w={84} />
        </g>
        <g transform="translate(36 -66) rotate(9)">
          <Bundle w={84} />
        </g>
        <g transform="translate(-2 -76) rotate(-2)">
          <Bundle w={80} />
        </g>
      </>
    ) : (
      <path d="M -110 -44 L 110 -44" stroke="#9aa1b5" strokeWidth={4} strokeDasharray="8 6" />
    )}
  </g>
);

/** Fan of notes held in front of the chest. */
export const MoneyFan: React.FC<{spread?: number}> = ({spread = 1}) => (
  <g>
    {[-2, -1, 0, 1, 2].map((k) => (
      <g key={k} transform={`rotate(${k * 13 * spread}) translate(0 -70)`}>
        <g transform="rotate(-90)">
          <Bill w={170} />
        </g>
      </g>
    ))}
  </g>
);

/** Big hero banknote for close-ups (≈ 900 x 390). */
export const BigBill: React.FC<{redden?: number}> = ({redden = 0}) => {
  const w = 900;
  const h = 390;
  return (
    <g>
      <rect x={-w / 2 + 14} y={-h / 2 + 18} width={w} height={h} rx={18} fill="#000" opacity={0.35} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill="#d3dcbd" stroke="#2d4a2a" strokeWidth={8} />
      <rect x={-w / 2 + 26} y={-h / 2 + 26} width={w - 52} height={h - 52} rx={10} fill="none" stroke="#6a8b5c" strokeWidth={5} />
      {Array.from({length: 18}).map((_, i) => (
        <path
          key={i}
          d={`M ${-w / 2 + 40} ${-h / 2 + 50 + i * 16} Q 0 ${-h / 2 + 30 + i * 16 + (i % 2 ? 18 : -18)} ${w / 2 - 40} ${-h / 2 + 50 + i * 16}`}
          stroke="#b9c8a0"
          strokeWidth={2}
          fill="none"
        />
      ))}
      <ellipse cx={-40} cy={10} rx={120} ry={140} fill="#bccba2" stroke="#3f6b3a" strokeWidth={6} />
      <circle cx={-40} cy={-30} r={46} fill="#6f8f5f" />
      <path d="M -130 120 Q -40 30 50 120 Z" fill="#6f8f5f" />
      <text x={-w / 2 + 90} y={-h / 2 + 100} fontFamily={F.display} fontWeight={900} fontSize={70} fill="#3f6b3a" textAnchor="middle">
        100
      </text>
      <text x={w / 2 - 100} y={h / 2 - 50} fontFamily={F.display} fontWeight={900} fontSize={96} fill="#3f6b3a" textAnchor="middle">
        100
      </text>
      <text x={210} y={-h / 2 + 82} fontFamily={F.mono} fontWeight={700} fontSize={40} fill="#2d4a2a" textAnchor="middle" letterSpacing={2}>
        KB 07143592 C
      </text>
      <text x={-w / 2 + 140} y={h / 2 - 54} fontFamily={F.mono} fontWeight={700} fontSize={30} fill="#2d4a2a" textAnchor="middle" letterSpacing={2}>
        KB 07143592 C
      </text>
      <text x={160} y={30} fontFamily={F.display} fontWeight={800} fontSize={34} fill="#557448" textAnchor="start">
        ONE HUNDRED
      </text>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill={C.red} opacity={redden * 0.35} />
    </g>
  );
};
