// Глава 1 — «Начало отношений»: набережная, золотой час, смех над нарисованным стаканчиком.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {ease, track} from '../lib/anim';
import {camAt, S, Shot} from '../lib/shots';
import {lineFrame, talkAt} from '../lib/timeline';
import {EmbFacades, EmbLamp, EmbLandmarks, EmbParapet, EmbRiver, EmbSky, EmbTrees, Gulls, Leaves} from '../env/Embankment';
import {Lisa} from '../rig/Lisa';
import {Mark} from '../rig/Mark';
import {exprAt} from '../rig/expr';
import {Cup, HandWrap} from '../rig/props';
import {LightLeak} from '../fx/Post';

const at = (id: string, off = 0) => lineFrame(id) + S(off);

const LISA = {x: 760, y: 448, s: 0.42};
const MARK = {x: 1150, y: 418, s: 0.44};

const SHOTS: Shot[] = [
  {id: 'wide', t0: 4.0, t1: 6.0, from: {x: 960, y: 470, zoom: 1.12, dof: 0.7}, to: {x: 960, y: 462, zoom: 1.2, dof: 0.7}, shake: 0.4},
  {id: 'lisaCU', t0: 6.0, t1: 10.7, from: {x: 800, y: 488, zoom: 2.55, dof: 2.1}, to: {x: 800, y: 480, zoom: 2.75, dof: 2.1}},
  {id: 'markCU', t0: 10.7, t1: 14.1, from: {x: 1135, y: 470, zoom: 2.5, dof: 2.1}, to: {x: 1140, y: 462, zoom: 2.65, dof: 2.1}},
  {id: 'lisaCU2', t0: 14.1, t1: 15.8, from: {x: 770, y: 478, zoom: 2.9, dof: 2.3}, to: {x: 772, y: 472, zoom: 3.05, dof: 2.3}},
  {id: 'two', t0: 15.8, t1: 18.0, from: {x: 960, y: 500, zoom: 1.55, dof: 1.4}, to: {x: 960, y: 480, zoom: 1.7, dof: 1.4}},
];

export const S1Embankment: React.FC<{frame: number}> = ({frame}) => {
  const {cam, shot} = camAt(frame, SHOTS, 11);
  const cu = shot.id.includes('CU');
  const lisaFocus = shot.id.startsWith('lisa');
  const markFocus = shot.id.startsWith('mark');

  const lisaE = exprAt(frame, [
    [0, {lid: 0.2, smile: 0.35, gazeX: 0.5, cheek: 0.4, tilt: 3}],
    [at('L1', -0.5), {lid: -0.1, browL: 0.6, browR: 0.6, smile: 0.4, gazeX: 0.25, gazeY: 0.55, cheek: 0.5}, 10],
    [at('L1', 0.1), 'laugh', 8],
    [at('L1', 0.9), {lid: -0.15, browL: 0.85, browR: 0.85, smile: 0.7, gazeX: 0.3, gazeY: 0.5, cheek: 0.7, wide: -0.1}, 10],
    [at('L1', 2.0), {...{lid: 0.3, browL: 0.5, browR: 0.5, browIn: 0.2, smile: 1, cheek: 1, squint: 0.6, wide: 0.6, gazeX: 0.65, tilt: 6, nod: -0.25}}, 10],
    [at('L1', 3.2), 'laugh', 10],
    [at('L1', 4.3), {lid: 0.25, smile: 0.8, cheek: 0.8, squint: 0.35, gazeX: 0.6, tilt: 5, browL: 0.3, browR: 0.3}, 16],
    [at('L2', -0.3), 'soft', 20],
    [at('L2', 0.2), {lid: 0.3, browL: 0.35, browR: 0.35, browIn: 0.35, smile: 0.3, cheek: 0.55, gazeX: 0.62, gazeY: -0.05, tilt: 8}, 20],
    [at('M2', 0.1), {lid: 0.22, smile: 0.75, cheek: 0.8, squint: 0.3, gazeX: 0.6, tilt: 9, browL: 0.25, browR: 0.25}, 18],
  ]);
  const markE = exprAt(frame, [
    [0, {lid: 0.4, smile: 0.35, gazeX: -0.55, tilt: -2}],
    [at('L1', 1.0), {lid: 0.35, smile: 0.5, gazeX: -0.6, cheek: 0.3, browL: 0.15, browR: 0.3, tilt: -3}, 20],
    [at('M1', 0), {lid: 0.38, browL: 0.55, browR: -0.05, smile: 0.55, cheek: 0.4, gazeX: -0.55, tilt: -4}, 10],
    [at('M1', 1.8), {lid: 0.45, browL: 0.25, browR: 0.25, smile: 0.75, cheek: 0.6, squint: 0.3, gazeX: -0.65, tilt: -6, nod: 0.15}, 12],
    [at('L2', 0.3), {lid: 0.3, browL: 0.3, browR: 0.35, browIn: 0.15, smile: 0.45, cheek: 0.4, gazeX: -0.6, tilt: -3}, 20],
    [at('M2', 0), {lid: 0.3, browL: 0.25, browR: 0.3, browIn: 0.2, smile: 0.65, cheek: 0.6, squint: 0.25, gazeX: -0.6, turn: -0.25, tilt: -6}, 18],
  ]);
  const lisaTalk = talkAt(frame, ['L1', 'L2']);
  const markTalk = talkAt(frame, ['M1', 'M2']);

  // cup lift during the reveal
  const cupY = track(frame, [
    [at('L1', -1.2), 640],
    [at('L1', -0.3), 548, ease.outBack],
    [at('L1', 2.6), 552],
    [at('L1', 3.4), 610],
  ]);
  const cupX = track(frame, [
    [at('L1', -1.2), 900],
    [at('L1', -0.3), 900],
  ]);

  return (
    <AbsoluteFill style={{filter: 'saturate(1.12) contrast(1.03)'}}>
      <Camera cam={cam}>
        <Layer pf={0.15} depth={7}>
          <EmbSky frame={frame} />
        </Layer>
        <Layer pf={0.35} depth={5.5}>
          <EmbLandmarks frame={frame} />
          <Gulls frame={frame} />
        </Layer>
        <Layer pf={0.6} depth={3.4}>
          <EmbFacades frame={frame} />
        </Layer>
        <Layer pf={0.82} depth={1.8}>
          <EmbTrees frame={frame} />
          <Leaves frame={frame} count={14} seed={3} scale={0.8} />
        </Layer>
        <Layer pf={1} depth={0} blurBoost={cu && !markFocus ? 6 : 0}>
          <g transform={`translate(${MARK.x} ${MARK.y}) scale(${MARK.s})`}>
            <Mark id="s1m" frame={frame} e={markE} talk={markTalk} outfit="coat" />
          </g>
        </Layer>
        <Layer pf={1} depth={0} blurBoost={cu && !lisaFocus ? 6 : 0}>
          <g transform={`translate(${LISA.x} ${LISA.y}) scale(${LISA.s})`}>
            <Lisa id="s1l" frame={frame} e={lisaE} talk={lisaTalk} outfit="pinkSweater" />
          </g>
          <g transform={`translate(${cupX} ${cupY}) scale(0.4) rotate(-6)`}>
            <Cup id="s1cup" doodle={1} frame={frame} steam={1} />
            <g transform="translate(-58 150) scale(0.72)">
              <HandWrap who="lisa" rings />
            </g>
          </g>
        </Layer>
        <Layer pf={1.04} depth={0.4}>
          <EmbParapet />
          <EmbLamp x={1560} y={700} s={0.9} />
        </Layer>
        <Layer pf={1.15} depth={-1.2}>
          <EmbRiver frame={frame} />
        </Layer>
        <Layer pf={1.5} depth={-3} blurBoost={3}>
          <Leaves frame={frame} count={8} seed={9} scale={1.8} area={[-200, -200, 2200, 1300]} />
        </Layer>
      </Camera>
      <LightLeak frame={frame} strength={0.32} hue="warm" />
    </AbsoluteFill>
  );
};
