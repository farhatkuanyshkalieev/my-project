// Глава 3 — «Год отношений»: кухня, вакансия «дизайнер баннеров», «хватит играть в художника».
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, rand} from '../lib/anim';
import {fonts, P} from '../lib/design';
import {camAt, S, Shot} from '../lib/shots';
import {lineFrame, talkAt} from '../lib/timeline';
import {Island, KitchenSet, Mug} from '../env/Kitchen';
import {Lisa} from '../rig/Lisa';
import {Mark} from '../rig/Mark';
import {exprAt} from '../rig/expr';
import {Phone} from '../rig/props';
import {LightLeak} from '../fx/Post';

const at = (id: string, off = 0) => lineFrame(id) + S(off);
const LISA = {x: 640, y: 430, s: 0.43};
const MARK = {x: 1300, y: 445, s: 0.44};

const SHOTS: Shot[] = [
  {id: 'insert', t0: 28.15, t1: 29.9, from: {x: 960, y: 540, zoom: 1, dof: 0}, to: {x: 960, y: 540, zoom: 1, dof: 0}},
  {id: 'lisaMCU', t0: 29.9, t1: 34.4, from: {x: 700, y: 470, zoom: 1.9, dof: 1.6}, to: {x: 680, y: 470, zoom: 2.15, dof: 1.6}},
  {id: 'markCU', t0: 34.4, t1: 35.4, from: {x: 1300, y: 476, zoom: 2.8, dof: 2}, to: {x: 1300, y: 476, zoom: 2.9, dof: 2}},
  {id: 'lisaCU', t0: 35.4, t1: 39.0, from: {x: 650, y: 462, zoom: 2.7, dof: 2}, to: {x: 650, y: 456, zoom: 3.0, dof: 2}},
  {id: 'markCU2', t0: 39.0, t1: 41.1, from: {x: 1300, y: 470, zoom: 2.9, dof: 2.2}, to: {x: 1300, y: 486, zoom: 3.5, dof: 2.4}, ease: ease.inOutCubic},
];

export const S3Kitchen: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 31);
  const cu = shot.id !== 'insert';
  const lisaFocus = shot.id.startsWith('lisa');
  const markFocus = shot.id.startsWith('mark');
  const sat = lerp(0.72, 0.52, clamp((s - 38.8) / 2));

  const lisaE = exprAt(frame, [
    [0, {lid: 0.35, browL: 0, browR: 0, smile: 0.05, gazeX: 0.6, tilt: -2}],
    [at('L4', 0), {lid: 0.36, browL: 0.15, browR: -0.05, browIn: -0.1, smile: -0.05, gazeX: 0.62, tilt: -3}, 12],
    [at('L4', 1.9), {lid: 0.4, browL: 0.25, browR: 0.25, browIn: -0.25, smile: -0.08, gazeX: 0.6, nod: 0.12, tilt: -4}, 12],
    [at('M5', 0.4), {lid: 0.3, browL: 0.35, browR: 0.1, browIn: 0.1, smile: -0.1, gazeX: 0.6}, 14],
    [at('L5', 0), {lid: 0.85, browL: 0.1, browR: 0.1, browIn: 0.3, smile: -0.15, gazeX: 0.2, gazeY: 0.3, nod: 0.25, tilt: 4}, 14],
    [at('L5', 0.9), {lid: 0.4, browL: 0.1, browR: 0.1, browIn: 0.15, smile: -0.2, gazeX: 0.62, nod: 0, tilt: -2}, 14],
    [at('L5', 2.6), 'firm', 14],
    [at('L5', 3.4), {lid: 0.42, browL: -0.15, browR: -0.3, browIn: -0.45, smile: -0.3, gazeX: 0.62, tilt: -5, nod: 0.08}, 16],
  ]);
  const markE = exprAt(frame, [
    [0, {lid: 0.4, smile: 0.0, gazeX: -0.6, gazeY: 0.1}],
    [at('L4', 1.5), {lid: 0.45, browL: 0.3, browR: 0.3, browIn: 0.5, smile: -0.1, gazeX: -0.6}, 20],
    [at('M5', 0), {lid: 0.42, browL: 0.4, browR: 0.4, browIn: 0.75, smile: -0.2, gazeX: -0.62, gazeY: 0.05, tilt: 3}, 10],
    [at('L5', 1.0), {lid: 0.45, browL: 0.25, browR: 0.25, browIn: 0.8, smile: -0.3, gazeX: -0.55, gazeY: 0.15, tilt: 3}, 16],
    [at('L5', 2.8), {lid: 0.62, browL: 0.15, browR: 0.15, browIn: 0.9, smile: -0.4, gazeX: -0.2, gazeY: 0.6, nod: 0.35, tilt: 5}, 40],
  ]);
  const lisaTalk = talkAt(frame, ['L4', 'L5']);
  const markTalk = talkAt(frame, ['M5']);

  return (
    <AbsoluteFill>
      {shot.id === 'insert' ? (
        <VacancyInsert frame={frame} s={s} />
      ) : (
        <AbsoluteFill style={{filter: `saturate(${sat}) contrast(1.02)`}}>
          <Camera cam={cam}>
            <Layer pf={0.7} depth={3}>
              <KitchenSet frame={frame} />
            </Layer>
            <Layer pf={1} depth={0} blurBoost={cu && !lisaFocus ? 7 : 0}>
              <g transform={`translate(${LISA.x} ${LISA.y}) scale(${LISA.s})`}>
                <Lisa id="s3l" frame={frame} e={lisaE} talk={lisaTalk} outfit="cardigan" />
              </g>
            </Layer>
            <Layer pf={1} depth={0} blurBoost={cu && !markFocus ? 7 : 0}>
              <g transform={`translate(${MARK.x} ${MARK.y}) scale(${MARK.s})`}>
                <Mark id="s3m" frame={frame} e={markE} talk={markTalk} outfit="hoodie" />
              </g>
            </Layer>
            <Layer pf={1.05} depth={0.4}>
              <Island y={770} />
              <Mug x={1060} y={660} c={P.cobalt} s={0.9} />
              <Mug x={420} y={662} c={P.lime} s={0.85} />
            </Layer>
          </Camera>
          <LightLeak frame={frame} strength={0.16} hue="cool" />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Phone on the table lights up: Liza shares a "banner designer" vacancy.
const VacancyInsert: React.FC<{frame: number; s: number}> = ({frame, s}) => {
  const t = s - 28.15;
  const buzz = t > 0.35 && t < 1.0 ? Math.sin(frame * 2.2) * 5 * (1 - (t - 0.35) / 0.65) : 0;
  const notif = ease.outBack(clamp((t - 0.35) / 0.45));
  const card = ease.outCubic(clamp((t - 0.85) / 0.5));
  const push = lerp(1.0, 1.12, ease.inOutQuad(clamp(t / 1.75)));
  return (
    <AbsoluteFill style={{filter: 'saturate(0.75)', background: '#B07A52'}}>
      <AbsoluteFill style={{transform: `scale(${push}) rotate(${lerp(-4, -2, t / 1.75)}deg)`}}>
        <svg width={1920} height={1080}>
          <defs>
            <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0" stopColor="#C68B5E" />
              <stop offset="1" stopColor="#9C6640" />
            </linearGradient>
            <filter id="ins-sh" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="20" />
            </filter>
          </defs>
          <rect x={-200} y={-200} width={2400} height={1500} fill="url(#wood)" />
          {Array.from({length: 30}).map((_, i) => (
            <path key={i} d={`M-200,${i * 45 + rand(i) * 20} C600,${i * 45 + 30} 1300,${i * 45 - 20} 2200,${i * 45 + 10}`} stroke="#7A4A2C" strokeWidth={2 + rand(i * 2) * 3} opacity={0.25} fill="none" />
          ))}
          <g transform="translate(1500 300)">
            <circle r={150} fill="#000" opacity={0.25} filter="url(#ins-sh)" transform="translate(20 30)" />
            <circle r={140} fill={P.lime} />
            <circle r={110} fill="#4A2A1A" />
            <ellipse cx={-30} cy={-30} rx={40} ry={20} fill="#fff" opacity={0.15} />
          </g>
          <g transform={`translate(${880 + buzz} 560) rotate(-8) scale(1.85)`}>
            <rect x={-130} y={-250} width={260} height={510} rx={40} fill="#000" opacity={0.35} filter="url(#ins-sh)" transform="translate(16 20)" />
            <Phone glow={1}>
              <rect x={-108} y={-238} width={216} height={476} fill={`rgb(${Math.round(lerp(14, 34, notif))},${Math.round(lerp(12, 30, notif))},${Math.round(lerp(18, 60, notif))})`} />
              <text x={0} y={-150} textAnchor="middle" fontFamily={fonts.sans} fontWeight={600} fontSize={52} fill="#fff" opacity={notif}>
                09:41
              </text>
              <g transform={`translate(0 ${lerp(-140, 0, notif)})`} opacity={clamp(notif)}>
                <rect x={-98} y={-108} width={196} height={78} rx={16} fill="#fff" opacity={0.92} />
                <circle cx={-72} cy={-82} r={14} fill={P.pink} />
                <text x={-52} y={-77} fontFamily={fonts.sans} fontWeight={800} fontSize={13} fill={P.ink}>
                  Лиза
                </text>
                <path d="M-6,-86 c-3,-5 -10,-3 -9,2 c1,4 9,9 9,9 c0,0 8,-5 9,-9 c1,-5 -6,-7 -9,-2 Z" fill={P.pink} transform="translate(-4 4)" />
                <text x={-84} y={-50} fontFamily={fonts.sans} fontWeight={600} fontSize={11.5} fill={P.ink}>
                  глянь, нормальная работа
                </text>
              </g>
              <g transform={`translate(0 ${lerp(30, 0, card)})`} opacity={card}>
                <rect x={-98} y={-16} width={196} height={170} rx={16} fill="#F4F4F6" />
                <rect x={-98} y={-16} width={196} height={60} rx={16} fill="#D33" />
                <text x={-84} y={20} fontFamily={fonts.sans} fontWeight={800} fontSize={18} fill="#fff">
                  hh
                </text>
                <text x={-84} y={70} fontFamily={fonts.sans} fontWeight={800} fontSize={15} fill={P.ink}>
                  Дизайнер баннеров
                </text>
                <text x={-84} y={96} fontFamily={fonts.sans} fontWeight={600} fontSize={13} fill="#555">
                  от 120 000 ₽ · офис
                </text>
                <rect x={-84} y={112} width={110} height={26} rx={13} fill={P.ink} />
                <text x={-70} y={130} fontFamily={fonts.sans} fontWeight={800} fontSize={11} fill="#fff">
                  Откликнуться
                </text>
              </g>
            </Phone>
          </g>
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
