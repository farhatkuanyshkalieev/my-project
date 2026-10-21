// Design bible: palette, type, the colour-drain arc, locations and hero props.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CHAPTER_SAT, fonts, P} from '../lib/design';
import {EmbFacades, EmbLandmarks, EmbParapet, EmbSky, EmbTrees} from '../env/Embankment';
import {StudioSet} from '../env/Studio';
import {KitchenSet} from '../env/Kitchen';
import {OfficeSet} from '../env/Office';
import {Cup, Marker, Phone} from '../rig/props';

const SW: [string, string, string][] = [
  [P.pink, 'Hot Pink', 'смех, рисунок, она'],
  [P.lime, 'Acid Lime', 'смелость'],
  [P.cobalt, 'Cobalt', 'его мир'],
  [P.autumn, 'Autumn', 'Петербург, осень'],
  [P.gold, 'Gold', 'купола, кольца'],
  [P.cream, 'Cream', 'бумага, стаканчик'],
  [P.ink, 'Ink Plum', 'линия, тень'],
  [P.grey, 'Office Grey', 'то, что осталось'],
];

const LOCS = [
  ['Набережная', 'начало', 0],
  ['Мастерская', 'полгода', 1],
  ['Кухня', 'год', 2],
  ['Офис', 'полтора года', 3],
  ['Кухня ночью', 'сейчас', 4],
] as const;

const Loc: React.FC<{i: number}> = ({i}) => {
  if (i === 0)
    return (
      <g>
        <EmbSky frame={0} />
        <g transform="translate(0 0)">
          <EmbLandmarks frame={0} />
        </g>
        <EmbFacades frame={0} />
        <EmbTrees frame={0} />
        <EmbParapet />
      </g>
    );
  if (i === 1) return <StudioSet frame={0} />;
  if (i === 2) return <KitchenSet frame={0} />;
  if (i === 3) return <OfficeSet frame={0} />;
  return <KitchenSet frame={0} night />;
};

export const StyleBible: React.FC = () => {
  const label: React.CSSProperties = {fontFamily: fonts.cond, fontWeight: 700, fontSize: 20, letterSpacing: '0.14em', color: P.ink, opacity: 0.75};
  return (
    <AbsoluteFill style={{background: '#F6EBDD'}}>
      <div style={{position: 'absolute', left: 60, top: 36, fontFamily: fonts.script, fontSize: 120, color: P.pink, lineHeight: 1}}>Ярче</div>
      <div style={{position: 'absolute', left: 330, top: 70, ...label, fontSize: 24}}>DESIGN BIBLE · СТИЛЬ, ЦВЕТ, ТИПОГРАФИКА</div>
      <div style={{position: 'absolute', left: 330, top: 104, width: 900, fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 26, color: P.plum}}>
        Кукольная пастель + петербургская осень. Мир теряет насыщенность глава за главой; розовый рисунок на стаканчике гаснет последним.
      </div>
      {/* palette */}
      <div style={{position: 'absolute', left: 60, top: 190, ...label}}>ПАЛИТРА</div>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {SW.map(([c, n, m], i) => (
          <g key={c} transform={`translate(${60 + i * 140} 222)`}>
            <rect width={124} height={124} rx={20} fill={c} stroke="#fff" strokeWidth={4} />
            <text x={0} y={150} fontFamily={fonts.sans} fontWeight={800} fontSize={15} fill={P.ink}>
              {n}
            </text>
            <text x={0} y={170} fontFamily={fonts.sans} fontWeight={600} fontSize={13} fill={P.ink} opacity={0.7}>
              {c.toUpperCase()}
            </text>
            <text x={0} y={188} fontFamily={fonts.sans} fontWeight={400} fontSize={13} fill={P.ink} opacity={0.7}>
              {m}
            </text>
          </g>
        ))}
        {/* saturation arc */}
        <g transform="translate(1220 222)">
          {CHAPTER_SAT.map((s, i) => (
            <g key={i} transform={`translate(${i * 128} 0)`}>
              <rect width={112} height={124} rx={18} fill={P.pink} style={{filter: `saturate(${s})`}} />
              <rect y={62} width={112} height={62} rx={18} fill={P.lime} style={{filter: `saturate(${s})`}} />
              <text x={0} y={150} fontFamily={fonts.sans} fontWeight={800} fontSize={15} fill={P.ink}>
                {Math.round(s * 100)}%
              </text>
            </g>
          ))}
          <path d="M0,200 C200,196 400,214 620,232" stroke={P.ink} strokeWidth={2} fill="none" strokeDasharray="6 6" />
        </g>
        {/* locations */}
        {LOCS.map(([n, ch, i]) => (
          <g key={n} transform={`translate(${60 + i * 364} 470)`}>
            <clipPath id={`loc${i}`}>
              <rect width={340} height={192} rx={16} />
            </clipPath>
            <g clipPath={`url(#loc${i})`} style={{filter: `saturate(${CHAPTER_SAT[i]})`}}>
              <g transform="scale(0.177)">
                <Loc i={i} />
              </g>
            </g>
            <text x={0} y={222} fontFamily={fonts.sans} fontWeight={800} fontSize={18} fill={P.ink}>
              {n}
            </text>
            <text x={0} y={244} fontFamily={fonts.sans} fontWeight={600} fontSize={14} fill={P.ink} opacity={0.65}>
              глава: {ch} · насыщенность {Math.round(CHAPTER_SAT[i] * 100)}%
            </text>
          </g>
        ))}
        {/* props */}
        <g transform="translate(150 810) scale(0.75)">
          <Cup id="sb-cup" doodle={1} />
        </g>
        <g transform="translate(330 900) rotate(-30) scale(0.8)">
          <Marker />
        </g>
        <g transform="translate(470 900) scale(0.36)">
          <Phone>
            <rect x={-108} y={-238} width={216} height={476} fill="#FBD9E5" />
          </Phone>
        </g>
      </svg>
      <div style={{position: 'absolute', left: 1220, top: 190, ...label}}>КРИВАЯ ЦВЕТА ПО ГЛАВАМ</div>
      <div style={{position: 'absolute', left: 60, top: 440, ...label}}>ЛОКАЦИИ</div>
      <div style={{position: 'absolute', left: 60, top: 760, ...label}}>ГЕРОЙ-РЕКВИЗИТ</div>
      {/* typography */}
      <div style={{position: 'absolute', left: 700, top: 760, ...label}}>ТИПОГРАФИКА</div>
      <div style={{position: 'absolute', left: 700, top: 800, display: 'flex', gap: 60, alignItems: 'flex-end', color: P.ink}}>
        <div>
          <div style={{fontFamily: fonts.script, fontSize: 96, color: P.pink, lineHeight: 1}}>Ярче</div>
          <div style={{fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, opacity: 0.7}}>Great Vibes — титр</div>
        </div>
        <div>
          <div style={{fontFamily: fonts.cond, fontWeight: 700, fontSize: 54, lineHeight: 1}}>ГОД ОТНОШЕНИЙ:</div>
          <div style={{fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, opacity: 0.7}}>Oswald 700 — главы</div>
        </div>
        <div>
          <div style={{fontFamily: fonts.sans, fontWeight: 600, fontSize: 30, lineHeight: 1.2}}>нарисуй меня… ещё раз.</div>
          <div style={{fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 30}}>о том, как она влюбилась</div>
          <div style={{fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, opacity: 0.7}}>Manrope — субтитры · Cormorant Italic — подзаголовки</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
