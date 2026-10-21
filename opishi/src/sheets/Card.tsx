// Vertical character cards: hero portrait, turnaround, emotions, wardrobe by chapter, palette.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {fonts, P, SKIN} from '../lib/design';
import {EXPR, ExprName, NEUTRAL, Expr} from '../rig/expr';
import {Mira, MiraOutfit, Glasses} from '../rig/Mira';
import {Timur, TimurOutfit} from '../rig/Timur';

type Who = 'mira' | 'timur';

const INFO = {
  mira: {
    name: 'Мира',
    role: 'ОНА · 24 · ИЛЛЮСТРАТОР',
    bio: 'Смеётся на весь вагон и никогда не снимает зелёные очки — «так мир зеленее». Прячет за ними то, что теряет зрение.',
    bg: ['#2A1B4A', '#7A62BE'],
    accent: P.lime,
    exprs: ['grin', 'soft', 'cautious', 'crying', 'pleading', 'nostalgic'] as ExprName[],
    wardrobe: [
      ['lilac', 'lime', 'начало'],
      ['hoodie', 'lime', 'полгода'],
      ['hoodie', 'none', 'год'],
      ['coat', 'dark', 'три года'],
    ] as [MiraOutfit, Glasses, string][],
    chips: [[SKIN.mira.base, 'кожа'], ['#3A2721', 'волосы'], ['#8C6650', 'блики'], [P.lime, 'очки'], [P.gold, 'золото'], [P.lilac, 'топ']],
    voice: 'голос: Xenia · ElevenLabs v4',
  },
  timur: {
    name: 'Тимур',
    role: 'ОН · 27 · ПЛЁНОЧНЫЙ ФОТОГРАФ',
    bio: 'Снимает на плёнку и описывает словами то, что не помещается в кадр. Через три года описывает ей тот же закат.',
    bg: ['#1C1424', '#E2532E'],
    accent: P.sunset,
    exprs: ['cool', 'warm', 'excited', 'shocked', 'pleading', 'hurt'] as ExprName[],
    wardrobe: [
      ['jacket', '', 'начало'],
      ['tee', '', 'полгода · год'],
      ['hoodie', '', 'последний день'],
      ['coat', '', 'три года'],
    ] as [TimurOutfit, string, string][],
    chips: [[SKIN.timur.base, 'кожа'], ['#120D12', 'кудри'], ['#6A5E7C', 'блик'], ['#1C1A21', 'куртка'], [P.silver, 'серебро'], ['#6B4632', 'щетина']],
    voice: 'голос: Vlad · ElevenLabs v4',
  },
};

const Char: React.FC<{who: Who; id: string; e?: Expr; outfit?: string; glasses?: Glasses}> = ({who, id, e = NEUTRAL, outfit, glasses}) =>
  who === 'mira' ? (
    <Mira id={id} frame={30} e={e} outfit={(outfit as MiraOutfit) ?? 'lilac'} glasses={glasses ?? 'lime'} cloudy={glasses === 'none' ? 0.5 : 0} />
  ) : (
    <Timur id={id} frame={30} e={e} outfit={(outfit as TimurOutfit) ?? 'jacket'} />
  );

export const Card: React.FC<{who: Who}> = ({who}) => {
  const d = INFO[who];
  const label: React.CSSProperties = {fontFamily: fonts.cond, fontWeight: 700, fontSize: 26, letterSpacing: '0.16em', color: '#fff', opacity: 0.85};
  const headY = who === 'mira' ? 0 : 30;
  return (
    <AbsoluteFill style={{background: `linear-gradient(170deg, ${d.bg[0]} 10%, ${d.bg[1]} 120%)`}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <defs>
          <clipPath id={`${who}-med`}>
            <circle r={78} />
          </clipPath>
          <clipPath id={`${who}-ward`}>
            <rect x={-74} y={-80} width={148} height={170} rx={20} />
          </clipPath>
          <clipPath id={`${who}-hero`}>
            <rect x={-2000} y={-2000} width={4000} height={2000 + 640} />
          </clipPath>
        </defs>
        {/* angular backdrop shapes, like the reference */}
        <path d="M160,180 L960,120 L860,980 Z" fill={d.accent} opacity={0.9} />
        <path d="M80,420 L620,260 L520,1040 Z" fill="#fff" opacity={0.08} />
        <g transform={`translate(540 ${560 + headY}) scale(1.02)`} clipPath={`url(#${who}-hero)`}>
          <Char who={who} id={`${who}-hero`} e={EXPR[who === 'mira' ? 'grin' : 'cool']} />
        </g>
        {/* turnaround */}
        {[-0.75, 0, 0.75].map((t, i) => (
          <g key={i} transform={`translate(${190 + i * 175} 1330)`}>
            <circle r={78} fill="#fff" opacity={0.12} />
            <g clipPath={`url(#${who}-med)`}>
              <g transform={`translate(0 ${who === 'mira' ? 26 : 40}) scale(0.3)`}>
                <Char who={who} id={`${who}-ta${i}`} e={{...NEUTRAL, turn: t, gazeX: t * 0.8}} />
              </g>
            </g>
            <circle r={78} fill="none" stroke="#fff" strokeWidth={3} opacity={0.7} />
          </g>
        ))}
        {/* wardrobe */}
        {d.wardrobe.map(([o, g, l], i) => (
          <g key={i} transform={`translate(${720 + (i % 2) * 175} ${1250 + Math.floor(i / 2) * 200})`}>
            <rect x={-74} y={-80} width={148} height={170} rx={20} fill="#fff" opacity={0.12} />
            <g clipPath={`url(#${who}-ward)`}>
              <g transform={`translate(0 ${who === 'mira' ? -32 : -40}) scale(${who === 'mira' ? 0.135 : 0.118})`}>
                <Char who={who} id={`${who}-w${i}`} e={NEUTRAL} outfit={o} glasses={(g || undefined) as Glasses} />
              </g>
            </g>
            <text x={0} y={112} textAnchor="middle" fontFamily={fonts.cond} fontWeight={500} fontSize={20} fill="#fff" letterSpacing="0.08em">
              {l.toUpperCase()}
            </text>
          </g>
        ))}
        {/* emotions */}
        {d.exprs.map((n, i) => (
          <g key={n} transform={`translate(${120 + i * 168} 1660)`}>
            <circle r={72} fill="#fff" opacity={0.12} />
            <g clipPath={`url(#${who}-med)`}>
              <g transform={`translate(0 ${who === 'mira' ? 24 : 38}) scale(0.28)`}>
                <Char who={who} id={`${who}-e${i}`} e={EXPR[n]} glasses={n === 'crying' ? 'none' : undefined} />
              </g>
            </g>
            <text x={0} y={102} textAnchor="middle" fontFamily={fonts.sans} fontWeight={600} fontSize={20} fill="#fff" opacity={0.85}>
              {n}
            </text>
          </g>
        ))}
        {/* palette */}
        {d.chips.map(([c, l], i) => (
          <g key={i} transform={`translate(${60 + i * 165} 1820)`}>
            <rect width={56} height={56} rx={12} fill={c} stroke="#fff" strokeWidth={3} />
            <text x={66} y={26} fontFamily={fonts.sans} fontWeight={600} fontSize={17} fill="#fff">
              {l}
            </text>
            <text x={66} y={48} fontFamily={fonts.sans} fontWeight={400} fontSize={14} fill="#fff" opacity={0.7}>
              {c.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <div style={{position: 'absolute', left: 60, top: 50, fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 150, lineHeight: 1, color: '#fff', textShadow: '0 8px 40px rgba(0,0,0,0.35)'}}>{d.name}</div>
      <div style={{position: 'absolute', left: 66, top: 210, ...label}}>{d.role}</div>
      <div style={{position: 'absolute', left: 60, right: 470, top: 1010, fontFamily: fonts.sans, fontWeight: 600, fontSize: 28, lineHeight: 1.35, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)'}}>{d.bio}</div>
      <div style={{position: 'absolute', left: 66, top: 1218, ...label, fontSize: 20}}>ПОВОРОТ</div>
      <div style={{position: 'absolute', left: 646, top: 1150, ...label, fontSize: 20}}>ГАРДЕРОБ ПО ГЛАВАМ</div>
      <div style={{position: 'absolute', left: 66, top: 1556, ...label, fontSize: 20}}>ЭМОЦИИ</div>
      <div style={{position: 'absolute', right: 60, top: 230, ...label, fontSize: 18, opacity: 0.7}}>{d.voice}</div>
      <div style={{position: 'absolute', right: 60, top: 60, ...label, fontSize: 18}}>ОПИШИ МНЕ · {who === 'mira' ? '01' : '02'}</div>
    </AbsoluteFill>
  );
};
