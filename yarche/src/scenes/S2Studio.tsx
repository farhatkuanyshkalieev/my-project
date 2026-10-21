// Глава 2 — «Полгода отношений»: мастерская, дождь, его картину взяли на выставку.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, springT} from '../lib/anim';
import {fonts, P} from '../lib/design';
import {camAt, S, Shot} from '../lib/shots';
import {lineFrame, talkAt} from '../lib/timeline';
import {Painting, PaintTable, Sofa, StudioSet} from '../env/Studio';
import {Lisa} from '../rig/Lisa';
import {Mark} from '../rig/Mark';
import {exprAt} from '../rig/expr';
import {HandWrap, Phone} from '../rig/props';
import {LightLeak} from '../fx/Post';

const at = (id: string, off = 0) => lineFrame(id) + S(off);
const LISA = {x: 700, y: 468, s: 0.41};
const MARK = {x: 1385, y: 405, s: 0.46};

const SHOTS: Shot[] = [
  {id: 'wide', t0: 17.7, t1: 21.05, from: {x: 980, y: 500, zoom: 1.08, dof: 0.6}, to: {x: 1000, y: 490, zoom: 1.16, dof: 0.6}, shake: 0.5},
  {id: 'lisaCU', t0: 21.05, t1: 24.7, from: {x: 712, y: 500, zoom: 2.75, dof: 2}, to: {x: 712, y: 494, zoom: 2.95, dof: 2}},
  {id: 'markCU', t0: 24.7, t1: 27.35, from: {x: 1380, y: 438, zoom: 2.6, dof: 2}, to: {x: 1380, y: 450, zoom: 2.85, dof: 2}},
  {id: 'insert', t0: 27.35, t1: 28.4, from: {x: 1560, y: 450, zoom: 2.2, dof: 0.8}, to: {x: 1560, y: 470, zoom: 2.6, dof: 0.8}},
];

export const S2Studio: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 21);
  const cu = shot.id.includes('CU');
  const lisaFocus = shot.id.startsWith('lisa');
  const markFocus = shot.id.startsWith('mark');
  const enter = springT(frame, S(17.85), 90, 13);
  const markX = lerp(2350, MARK.x, enter);
  const drain = clamp((s - 27.45) / 0.8);

  const lisaE = exprAt(frame, [
    [0, {lid: 0.38, gazeY: 0.55, gazeX: -0.1, smile: 0.1, tilt: 4}],
    [S(18.1), {lid: -0.15, browL: 0.6, browR: 0.6, gazeX: 0.7, gazeY: -0.05, smile: 0.15, open: 0.12}, 8],
    [at('M3', 1.4), {lid: 0.12, browL: 0.35, browR: 0.35, gazeX: 0.7, smile: 0.3, cheek: 0.3}, 18],
    [at('L3', 0), {lid: 0.28, browL: 0.25, browR: 0.25, browIn: 0.1, smile: 0.32, cheek: 0.25, gazeX: 0.62, tilt: 3}, 12],
    [at('L3', 1.1), {lid: 0.34, browL: 0.05, browR: -0.15, browIn: 0.15, smile: -0.05, gazeX: 0.2, gazeY: 0.35, tilt: -2}, 20],
    [at('L3', 1.5), {lid: 0.3, browL: 0.45, browR: -0.1, browIn: -0.05, smile: -0.1, gazeX: 0.65, gazeY: 0, tilt: -5, wide: -0.1}, 14],
    [at('M4', 0.6), {lid: 0.35, browL: 0.3, browR: 0, smile: -0.15, gazeX: 0.62, tilt: -4}, 20],
  ]);
  const markE = exprAt(frame, [
    [0, 'excited'],
    [at('M3', 0.2), {lid: -0.25, browL: 1, browR: 1, smile: 0.95, open: 0.15, cheek: 0.7, wide: 0.5, gazeX: -0.6, nod: -0.2}, 8],
    [at('M3', 2.0), {lid: -0.1, browL: 0.8, browR: 0.8, smile: 0.9, cheek: 0.8, squint: 0.2, gazeX: -0.65, tilt: -4}, 10],
    [at('L3', 1.2), {lid: 0.1, browL: 0.5, browR: 0.5, browIn: 0.2, smile: 0.55, cheek: 0.5, gazeX: -0.62}, 18],
    [at('L3', 2.1), {lid: 0.2, browL: 0.3, browR: 0.3, browIn: 0.45, smile: 0.15, cheek: 0.3, gazeX: -0.6}, 14],
    [at('M4', 0), {lid: 0.35, browL: 0.2, browR: 0.2, browIn: 0.6, smile: 0.1, gazeX: -0.3, gazeY: 0.35, tilt: 3}, 10],
    [at('M4', 1.2), {lid: 0.5, browL: 0.15, browR: 0.1, browIn: 0.7, smile: -0.1, gazeX: -0.15, gazeY: 0.55, nod: 0.3, tilt: 4}, 24],
  ]);
  const lisaTalk = talkAt(frame, ['L3']);
  const markTalk = talkAt(frame, ['M3', 'M4']);
  const phoneUp = 1 - ease.inOutCubic(clamp((s - 21.3) / 0.6));
  const notifIn = ease.outBack(clamp((s - 18.3) / 0.5));

  return (
    <AbsoluteFill style={{filter: 'saturate(1.0) contrast(1.02)'}}>
      <Camera cam={cam}>
        <Layer pf={0.7} depth={3}>
          <StudioSet frame={frame} drain={drain} />
        </Layer>
        <Layer pf={1} depth={0} blurBoost={cu && !lisaFocus ? 7 : 0}>
          <g transform={`translate(${LISA.x} ${LISA.y}) scale(${LISA.s})`}>
            <Lisa id="s2l" frame={frame} e={lisaE} talk={lisaTalk} outfit="limeBlazer" />
          </g>
        </Layer>
        <Layer pf={1.02} depth={0.3}>
          <Sofa />
        </Layer>
        <Layer pf={1} depth={0} blurBoost={cu && !markFocus ? 7 : 0}>
          <g transform={`translate(${markX} ${MARK.y}) scale(${MARK.s}) rotate(${(1 - enter) * -6})`}>
            <Mark id="s2m" frame={frame} e={markE} talk={markTalk} outfit="hoodie" />
          </g>
          {/* phone held up with the good news */}
          <g transform={`translate(${markX + 150} ${lerp(760, 470, phoneUp * clamp(enter * 1.2))}) rotate(${lerp(14, 6, enter)}) scale(0.42)`}>
            <Phone>
              <rect x={-108} y={-238} width={216} height={476} fill="#FBD9E5" />
              <g transform={`translate(0 ${lerp(-60, 0, notifIn)}) scale(${lerp(0.8, 1, notifIn)})`} opacity={clamp(notifIn)}>
                <rect x={-96} y={-170} width={192} height={150} rx={18} fill="#fff" />
                <circle cx={-66} cy={-140} r={14} fill={P.pink} />
                <text x={-44} y={-134} fontFamily={fonts.sans} fontWeight={800} fontSize={16} fill={P.ink}>
                  Арт-галерея
                </text>
                <text x={-80} y={-96} fontFamily={fonts.sans} fontWeight={800} fontSize={20} fill={P.pink}>
                  Вы в выставке!
                </text>
                <text x={-80} y={-68} fontFamily={fonts.sans} fontWeight={600} fontSize={14} fill={P.ink}>
                  «Новые имена»
                </text>
                <text x={-80} y={-46} fontFamily={fonts.sans} fontWeight={600} fontSize={14} fill="#8E8C93">
                  открытие в пятницу
                </text>
              </g>
              <circle cx={0} cy={80} r={56} fill={P.pink} opacity={0.25 + 0.1 * Math.sin(frame / 6)} />
              <path d="M0,50 L8,72 L30,80 L8,88 L0,110 L-8,88 L-30,80 L-8,72 Z" fill={P.ink} />
            </Phone>
            <g transform="translate(150 160) rotate(-110) scale(1.4)">
              <HandWrap who="mark" sleeve="#5A6C9C" />
            </g>
          </g>
        </Layer>
        <Layer pf={1.06} depth={0.5}>
          <PaintTable frame={frame} />
        </Layer>
      </Camera>
      {shot.id === 'insert' && (
        <AbsoluteFill>
          <svg width={1920} height={1080}>
            {/* paint drip running down the drained canvas */}
            {[0, 1, 2].map((i) => (
              <rect key={i} x={760 + i * 210} y={250} width={22 - i * 4} height={lerp(0, 380 - i * 90, ease.inOutQuad(clamp((s - 27.5 - i * 0.12) / 0.8)))} rx={10} fill={['#9C9AA3', '#B3B0B8', '#8C8A92'][i]} opacity={0.9} />
            ))}
          </svg>
        </AbsoluteFill>
      )}
      <LightLeak frame={frame} strength={0.22} hue="warm" />
    </AbsoluteFill>
  );
};

export {Painting};
