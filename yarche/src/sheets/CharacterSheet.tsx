// Character cards: hero portrait, turnaround, expression sheet, chapter wardrobe, palette.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {fonts, P, SKIN} from '../lib/design';
import {EXPR, ExprName, NEUTRAL} from '../rig/expr';
import {Lisa, LisaOutfit} from '../rig/Lisa';
import {Mark, MarkOutfit} from '../rig/Mark';

type Who = 'lisa' | 'mark';

const INFO = {
  lisa: {
    name: 'Лиза',
    role: 'ГЕРОИНЯ · 25 ЛЕТ · ФИНАНСОВЫЙ АНАЛИТИК',
    bio: 'Смеётся громко и заразительно. Влюбилась в его краски — и сама же попросила их выключить.',
    traits: ['прагматичная', 'тёплая', 'боится нестабильности'],
    voice: 'голос: Elena · ElevenLabs v4 — от смеха до шёпота',
    bg: ['#FBD9E5', '#F7A8C6'],
    accent: P.pink,
    exprs: ['neutral', 'laugh', 'soft', 'cautious', 'firm', 'sad'] as ExprName[],
    outfits: [
      ['pinkSweater', 'начало'],
      ['limeBlazer', 'полгода'],
      ['cardigan', 'год'],
      ['homeSweater', 'сейчас'],
    ] as [LisaOutfit, string][],
    chips: [
      [SKIN.lisa.base, 'кожа'],
      ['#E9D6AE', 'платина'],
      ['#3B2A22', 'корни'],
      ['#D79A4E', 'янтарь'],
      ['#D8263F', 'губы'],
      [P.pink, 'свитер'],
    ],
  },
  mark: {
    name: 'Марк',
    role: 'ГЕРОЙ · 27 ЛЕТ · ХУДОЖНИК',
    bio: 'Рисует на всём, что под рукой: стаканчиках, салфетках, её запястье. К финалу забывает, как это делается.',
    traits: ['мечтатель', 'самоуверенный', 'мягкий под бронёй'],
    voice: 'голос: Alexey · ElevenLabs v4 — от азарта к пустоте',
    bg: ['#C9D0F7', '#8E9BEA'],
    accent: P.cobalt,
    exprs: ['cool', 'smirk', 'excited', 'deflate', 'tired', 'hurt'] as ExprName[],
    outfits: [
      ['coat', 'начало'],
      ['hoodie', 'полгода'],
      ['shirt', 'полтора года'],
      ['hoodieNight', 'сейчас'],
    ] as [MarkOutfit, string][],
    chips: [
      [SKIN.mark.base, 'кожа'],
      ['#2B1A13', 'волосы'],
      ['#E6B873', 'пряди'],
      ['#6C8299', 'глаза'],
      [SKIN.mark.blush, 'румянец'],
      ['#3A2620', 'пальто'],
    ],
  },
};

const Who: React.FC<{who: Who; id: string; e?: typeof NEUTRAL; outfit?: string; frame?: number}> = ({who, id, e = NEUTRAL, outfit, frame = 30}) =>
  who === 'lisa' ? (
    <Lisa id={id} frame={frame} e={e} outfit={(outfit as LisaOutfit) ?? 'pinkSweater'} />
  ) : (
    <Mark id={id} frame={frame} e={e} outfit={(outfit as MarkOutfit) ?? 'coat'} />
  );

export const CharacterSheet: React.FC<{who: Who}> = ({who}) => {
  const d = INFO[who];
  const label: React.CSSProperties = {fontFamily: fonts.cond, fontWeight: 700, fontSize: 22, letterSpacing: '0.12em', color: P.ink, opacity: 0.75};
  return (
    <AbsoluteFill style={{background: `linear-gradient(135deg, ${d.bg[0]}, ${d.bg[1]})`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <defs>
          <filter id="cs-sh" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
        </defs>
        {/* big hero portrait */}
        <circle cx={400} cy={520} r={330} fill="#fff" opacity={0.35} />
        <ellipse cx={420} cy={1040} rx={360} ry={60} fill={P.ink} opacity={0.25} filter="url(#cs-sh)" />
        <g transform="translate(400 470) scale(0.98)">
          <Who who={who} id={`${who}-hero`} e={EXPR[who === 'lisa' ? 'happy' : 'smirk']} />
        </g>
        <defs>
          <clipPath id={`${who}-med`}>
            <circle cx={0} cy={0} r={68} />
          </clipPath>
          <clipPath id={`${who}-ward`}>
            <rect x={-66} y={-90} width={132} height={170} rx={20} />
          </clipPath>
        </defs>
        {/* turnaround */}
        {[-0.75, 0, 0.75].map((t, i) => (
          <g key={i} transform={`translate(${930 + i * 150} 500)`}>
            <circle r={68} fill="#fff" opacity={0.5} />
            <g clipPath={`url(#${who}-med)`}>
              <g transform="translate(0 18) scale(0.27)">
                <Who who={who} id={`${who}-ta${i}`} e={{...NEUTRAL, turn: t, gazeX: t * 0.8}} />
              </g>
            </g>
            <circle r={68} fill="none" stroke="#fff" strokeWidth={3} />
          </g>
        ))}
        {/* expression sheet */}
        {d.exprs.map((n, i) => (
          <g key={n} transform={`translate(${930 + i * 152} 720)`}>
            <circle r={68} fill="#fff" opacity={0.5} />
            <g clipPath={`url(#${who}-med)`}>
              <g transform="translate(0 18) scale(0.27)">
                <Who who={who} id={`${who}-ex${i}`} e={EXPR[n]} />
              </g>
            </g>
            <circle r={68} fill="none" stroke="#fff" strokeWidth={3} />
            <text x={0} y={94} textAnchor="middle" fontFamily={fonts.sans} fontWeight={600} fontSize={16} fill={P.ink}>
              {n}
            </text>
          </g>
        ))}
        {/* wardrobe by chapter */}
        {d.outfits.map(([o, l], i) => (
          <g key={o} transform={`translate(${930 + i * 152} 945)`}>
            <rect x={-66} y={-90} width={132} height={170} rx={20} fill="#fff" opacity={0.4} />
            <g clipPath={`url(#${who}-ward)`}>
              <g transform="translate(0 -30) scale(0.19)">
                <Who who={who} id={`${who}-o${i}`} e={NEUTRAL} outfit={o} />
              </g>
            </g>
            <rect x={-60} y={88} width={120} height={28} rx={14} fill={P.ink} opacity={0.85} />
            <text x={0} y={107} textAnchor="middle" fontFamily={fonts.cond} fontWeight={500} fontSize={15} fill="#fff" letterSpacing="0.08em">
              {l.toUpperCase()}
            </text>
          </g>
        ))}
        {/* palette chips */}
        {d.chips.map(([c, l], i) => (
          <g key={i} transform={`translate(${1520 + (i % 3) * 125} ${880 + Math.floor(i / 3) * 95})`}>
            <rect x={0} y={0} width={110} height={52} rx={12} fill={c} stroke="#fff" strokeWidth={3} />
            <text x={0} y={70} fontFamily={fonts.sans} fontWeight={600} fontSize={13} fill={P.ink}>
              {l}
            </text>
            <text x={0} y={85} fontFamily={fonts.sans} fontWeight={400} fontSize={12} fill={P.ink} opacity={0.7}>
              {c.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <div style={{position: 'absolute', left: 860, top: 40, fontFamily: fonts.script, fontSize: 150, lineHeight: 1, color: d.accent, textShadow: '0 6px 30px rgba(255,255,255,0.6)'}}>{d.name}</div>
      <div style={{position: 'absolute', left: 1240, top: 82, width: 620, ...label, fontSize: 24, opacity: 0.9}}>{d.role}</div>
      <div style={{position: 'absolute', left: 1240, top: 124, width: 620, fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 30, lineHeight: 1.2, color: P.plum}}>{d.bio}</div>
      <div style={{position: 'absolute', left: 1240, top: 250, display: 'flex', gap: 10, flexWrap: 'wrap', width: 500}}>
        {d.traits.map((t) => (
          <span key={t} style={{fontFamily: fonts.sans, fontWeight: 600, fontSize: 18, padding: '8px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.6)', color: P.ink}}>{t}</span>
        ))}
      </div>
      <div style={{position: 'absolute', left: 1240, top: 352, width: 620, fontFamily: fonts.sans, fontWeight: 600, fontSize: 17, color: P.ink, opacity: 0.8}}>{d.voice}</div>
      <div style={{position: 'absolute', left: 870, top: 400, ...label}}>ПОВОРОТ</div>
      <div style={{position: 'absolute', left: 870, top: 618, ...label}}>ЭМОЦИИ</div>
      <div style={{position: 'absolute', left: 870, top: 822, ...label}}>ГАРДЕРОБ ПО ГЛАВАМ</div>
      <div style={{position: 'absolute', left: 1520, top: 840, ...label}}>ПАЛИТРА</div>
      <div style={{position: 'absolute', left: 40, top: 30, ...label, fontSize: 18}}>ЯРЧЕ · CHARACTER SHEET · {who === 'lisa' ? '01' : '02'}</div>
    </AbsoluteFill>
  );
};
