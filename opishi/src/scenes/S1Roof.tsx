// Глава 1 — «Начало»: крыша на закате. Он снимает её на плёнку, она смеётся
// и просит описать закат, которого почти не видит.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, springT} from '../lib/anim';
import {P} from '../lib/design';
import {camAt, Shot} from '../lib/shots';
import {at, S, talkAt} from '../lib/timeline';
import {Ledge, RoofReverse, RoofSunset, Wind} from '../env/Rooftop';
import {Mira} from '../rig/Mira';
import {Timur} from '../rig/Timur';
import {exprAt} from '../rig/expr';
import {Polaroid, TimurBack} from '../rig/props';
import {JuiceSky, Viewfinder} from '../mg/Overlays';
import {LightLeak} from '../fx/Post';

const MIRA = {x: 560, y: 900, s: 0.75};

const MIRA_SHOTS: Shot[] = [
  {id: 'wide', t0: 6.5, t1: 8.2, from: {x: 540, y: 960, zoom: 1.0, dof: 0.6}, to: {x: 540, y: 930, zoom: 1.08, dof: 0.6}, shake: 0.4},
  {id: 'finder', t0: 8.2, t1: 12.8, from: {x: 565, y: 860, zoom: 1.75, dof: 1.6}, to: {x: 565, y: 860, zoom: 1.95, dof: 1.6}, shake: 1.1},
  {id: 'cu', t0: 12.8, t1: 18.4, from: {x: 560, y: 850, zoom: 2.05, dof: 1.8}, to: {x: 560, y: 846, zoom: 2.3, dof: 1.8}},
  {id: 'juice', t0: 20.0, t1: 23.0, from: {x: 540, y: 960, zoom: 1.0, dof: 0.4}, to: {x: 540, y: 1000, zoom: 1.05, dof: 0.4}, shake: 0.3},
  {id: 'cu2', t0: 23.0, t1: 27.2, from: {x: 560, y: 860, zoom: 1.9, dof: 1.8}, to: {x: 560, y: 856, zoom: 2.15, dof: 1.8}},
];

export const S1Roof: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const timurShot = s >= 18.4 && s < 20.0;
  const {cam, shot} = camAt(frame, MIRA_SHOTS, 3);

  const miraE = exprAt(frame, [
    [0, {lid: 0.1, smile: 0.55, cheek: 0.5, tilt: -4, gazeX: -0.2}],
    [S(8.6), {lid: 0.05, smile: 0.75, cheek: 0.6, tilt: -6, browL: 0.3, browR: 0.4}, 10],
    [at('T1', 1.4), {lid: 0, smile: 0.5, cheek: 0.5, tilt: 4, browL: 0.55, browR: 0.1, gazeX: 0.1}, 18],
    [at('M1', 0), 'grin', 8],
    [at('M1', 0.7), {lid: 0, browL: 0.4, browR: 0.6, smile: 0.7, cheek: 0.6, tilt: -5, wide: 0.4}, 12],
    [at('M1', 3.0), {lid: 0, browL: 0.35, browR: 0.35, browIn: 0.2, smile: 0.45, cheek: 0.5, tilt: 7, turn: 0.35, nod: -0.15}, 20],
    [at('T2', 0.5), {lid: 0, browL: 0.3, browR: 0.3, smile: 0.4, tilt: 6, turn: 0.15}, 20],
    [at('M2', 0), 'grin', 6],
    [at('M2', 0.6), {lid: 0.1, browL: 0.6, browR: 0.6, browIn: 0.3, smile: 1, open: 0.45, cheek: 1, squint: 0.6, wide: 0.9, tilt: 8, nod: -0.35}, 8],
    [at('M2', 1.7), {lid: 0, browL: 0.5, browR: 0.5, smile: 0.9, open: 0.15, cheek: 0.8, wide: 0.8, tilt: -4}, 10],
  ]);
  const timurE = exprAt(frame, [
    [0, {lid: 0.3, smile: 0.35, gazeX: 0.25, gazeY: -0.25, tilt: 3}],
    [at('T2', 0), {lid: 0.25, browL: 0.35, browR: 0.25, browIn: 0.1, smile: 0.45, gazeX: 0.3, gazeY: -0.3, tilt: 4, cheek: 0.3}, 14],
    [at('T2', 2.0), {lid: 0.2, browL: 0.45, browR: 0.4, smile: 0.6, gazeX: -0.4, gazeY: 0, tilt: -3, cheek: 0.4}, 18],
  ]);
  const miraTalk = talkAt(frame, ['M1', 'M2']);
  const timurTalk = talkAt(frame, ['T2']);
  const camUp = ease.inOutCubic(clamp((s - 7.1) / 0.8));
  const juiceT = s - (at('T2', 1.1) / FPS);

  // freeze-frame polaroid at the end of the chapter
  const snapT = s - 25.95;
  const pol = snapT > 0 ? springT(frame, S(26.05), 140, 14) : 0;

  if (timurShot) {
    return (
      <AbsoluteFill style={{filter: 'saturate(1.08)'}}>
        <Camera cam={{x: 540, y: 820 - (s - 18.4) * 10, zoom: 1.85 + (s - 18.4) * 0.05, dof: 1.8}}>
          <Layer pf={0.6} depth={3}>
            <RoofReverse frame={frame} />
          </Layer>
          <Layer pf={1}>
            <g transform="translate(540 700) scale(0.8)">
              <Timur id="s1t" frame={frame} e={timurE} talk={timurTalk} outfit="jacket" />
            </g>
          </Layer>
        </Camera>
        {/* warm sunset key light on his face */}
        <AbsoluteFill style={{background: 'linear-gradient(110deg, rgba(255,150,70,0.0) 40%, rgba(255,150,70,0.28) 100%)', mixBlendMode: 'screen'}} />
        <LightLeak frame={frame} strength={0.25} hue="warm" />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{filter: 'saturate(1.08)'}}>
      <Camera cam={cam}>
        <Layer pf={0.3} depth={5}>
          <RoofSunset frame={frame} />
          {shot.id === 'juice' && <JuiceSky t={juiceT} dur={3.2} frame={frame} y0={240} />}
        </Layer>
        <Layer pf={0.9} depth={1}>
          <Wind frame={frame} />
        </Layer>
        <Layer pf={1} depth={0}>
          <g transform={`translate(${MIRA.x} ${MIRA.y}) scale(${MIRA.s})`}>
            <Mira id="s1m" frame={frame} e={miraE} talk={miraTalk} outfit="lilac" />
          </g>
        </Layer>
        <Layer pf={1.05} depth={0.3}>
          <Ledge y={1500} />
        </Layer>
        {shot.id === 'wide' && (
          <Layer pf={1.3} depth={-2} blurBoost={2}>
            <g transform={`translate(240 ${lerp(1500, 1380, camUp)}) scale(0.95)`}>
              <TimurBack frame={frame} cameraUp={camUp} />
            </g>
          </Layer>
        )}
      </Camera>
      {/* backlight from the sun behind her */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 80% 62%, rgba(255,200,120,0.35), rgba(255,200,120,0) 55%)', mixBlendMode: 'screen'}} />
      {shot.id === 'finder' && <Viewfinder frame={frame} t={s - 8.2} shots={[0.4, 0.8]} count={11} />}
      <LightLeak frame={frame} strength={0.3} hue="warm" />
      {snapT > 0 && (
        <>
          <AbsoluteFill style={{background: '#fff', opacity: clamp(1 - snapT / 0.3)}} />
          <AbsoluteFill style={{background: 'rgba(20,10,30,0.45)', opacity: clamp(snapT / 0.3)}} />
          <svg width={1080} height={1920} style={{position: 'absolute'}}>
            <g transform={`translate(${lerp(540, 560, pol)} ${lerp(860, 900, pol)}) rotate(${lerp(0, -7, pol)}) scale(${lerp(2.8, 1.05, ease.outCubic(clamp(snapT / 0.5)))})`}>
              <Polaroid id="pol1" w={560} dev={clamp((snapT - 0.2) / 0.8)} caption="закат. её смех.">
                <g transform="translate(0 -46)">
                  <rect x={-260} y={-300} width={520} height={520} fill="#FF9A4C" />
                  <rect x={-260} y={-300} width={520} height={260} fill="#9C5FA8" />
                  <circle cx={150} cy={60} r={90} fill="#FFEBB5" />
                  <g transform="translate(0 40) scale(0.62)">
                    <Mira id="pol1m" frame={S(24.3)} e={{...miraE, ...{smile: 1, open: 0.4, cheek: 1, squint: 0.6, wide: 0.9, tilt: 8, lid: 0.1, browL: 0.6, browR: 0.6, browIn: 0.3, nod: -0.3, gazeX: 0, gazeY: 0, turn: 0, lean: 0}}} outfit="lilac" />
                  </g>
                </g>
              </Polaroid>
            </g>
          </svg>
        </>
      )}
      <AbsoluteFill style={{background: P.night, opacity: 0}} />
    </AbsoluteFill>
  );
};
