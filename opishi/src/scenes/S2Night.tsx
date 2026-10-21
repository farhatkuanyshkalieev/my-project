// Глава 2 — «Полгода спустя»: ночь, она в очках, задевает косяк. «Свет режет».
// Then her point of view: tunnel vision closing in.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, springT} from '../lib/anim';
import {camAt, Shot} from '../lib/shots';
import {at, S, talkAt} from '../lib/timeline';
import {Apartment, Sofa} from '../env/Apartment';
import {Mira} from '../rig/Mira';
import {Timur} from '../rig/Timur';
import {exprAt} from '../rig/expr';
import {Tunnel} from '../mg/Overlays';
import {LightLeak} from '../fx/Post';

const TIMUR = {x: 860, y: 880, s: 0.55};

const SHOTS: Shot[] = [
  {id: 'wide', t0: 27.0, t1: 29.4, from: {x: 640, y: 1000, zoom: 1.42, dof: 0.5}, to: {x: 600, y: 990, zoom: 1.5, dof: 0.5}, shake: 0.5},
  {id: 'timurCU', t0: 29.4, t1: 33.1, from: {x: 860, y: 860, zoom: 2.1, dof: 1.8}, to: {x: 860, y: 852, zoom: 2.3, dof: 1.8}},
  {id: 'miraCU', t0: 33.1, t1: 35.4, from: {x: 420, y: 880, zoom: 2.2, dof: 1.8}, to: {x: 420, y: 872, zoom: 2.4, dof: 1.8}},
  {id: 'pov', t0: 35.4, t1: 38.5, from: {x: 850, y: 870, zoom: 1.7, dof: 0}, to: {x: 860, y: 860, zoom: 1.85, dof: 0}, shake: 1.4},
];

export const S2Night: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 9);
  // Mira walks toward the door and clips the frame at 28.6s
  const walk = ease.inOutQuad(clamp((s - 27.1) / 1.5));
  const bump = springT(frame, S(28.6), 260, 9);
  const hit = s > 28.6 ? Math.sin(clamp((s - 28.6) / 0.25) * Math.PI) : 0;
  const miraX = lerp(720, 430, walk) + (s > 28.6 ? (1 - bump) * 0 + hit * 26 : 0);
  const miraY = 930 + Math.abs(Math.sin(walk * Math.PI * 4)) * -12 * (walk < 1 ? 1 : 0);
  const shake = hit * 8;

  const miraE = exprAt(frame, [
    [0, {lid: 0.1, smile: 0.2, tilt: -2, gazeX: -0.4}],
    [S(28.6), {lid: 0.3, browL: 0.6, browR: 0.2, browIn: 0.5, smile: -0.3, open: 0.2, tilt: 10, squint: 0.5}, 4],
    [S(29.1), {lid: 0.05, browL: 0.4, browR: 0.4, smile: 0.5, cheek: 0.4, tilt: 4, gazeX: 0.5}, 12],
    [at('M3', 0), {lid: 0, browL: 0.5, browR: 0.3, browIn: 0.2, smile: 0.35, cheek: 0.3, gazeX: 0.4, tilt: -3}, 8],
    [at('M3', 0.9), {lid: 0, browL: 0.3, browR: 0.3, browIn: 0.35, smile: 0.5, cheek: 0.4, gazeX: 0.55, tilt: 4}, 10],
  ]);
  const timurE = exprAt(frame, [
    [0, {lid: 0.3, smile: 0.2, gazeX: -0.55, tilt: 2}],
    [S(28.7), {lid: 0.2, browL: 0.4, browR: 0.5, smile: 0.5, gazeX: -0.6, cheek: 0.3}, 8],
    [at('T3', 0), {lid: 0.25, browL: 0.45, browR: 0.2, smile: 0.6, cheek: 0.4, gazeX: -0.6, tilt: -4}, 10],
    [at('T3', 2.0), {lid: 0.2, browL: 0.35, browR: 0.35, browIn: 0.2, smile: 0.35, gazeX: -0.6, tilt: -2}, 14],
    [S(35.6), {lid: 0.15, browL: 0.4, browR: 0.4, browIn: 0.4, smile: 0.1, gazeX: 0, gazeY: 0, tilt: 3}, 30],
    [S(37.0), {lid: 0.1, browL: 0.6, browR: 0.6, browIn: 0.7, smile: -0.1, gazeX: 0, tilt: 5, open: 0.08}, 30],
  ]);
  const miraTalk = talkAt(frame, ['M3']);
  const timurTalk = talkAt(frame, ['T3']);

  const scene = (
    <AbsoluteFill style={{transform: `translate(${shake}px, 0)`}}>
      <Camera cam={cam}>
        <Layer pf={0.8} depth={2.5}>
          <Apartment frame={frame} light="night" polaroids={4} />
        </Layer>
        <Layer pf={1} depth={0} blurBoost={shot.id === 'miraCU' ? 7 : 0}>
          <g transform={`translate(${TIMUR.x} ${TIMUR.y}) scale(${TIMUR.s})`}>
            <Timur id="s2t" frame={frame} e={timurE} talk={timurTalk} outfit="tee" />
          </g>
        </Layer>
        {shot.id !== 'pov' && (
          <Layer pf={1} depth={0} blurBoost={shot.id === 'timurCU' ? 7 : 0}>
            <g transform={`translate(${miraX} ${miraY}) scale(0.6) rotate(${hit * -6})`}>
              <Mira id="s2m" frame={frame} e={miraE} talk={miraTalk} outfit="hoodie" />
            </g>
          </Layer>
        )}
        <Layer pf={1.1} depth={-0.6}>
          <Sofa light="night" />
        </Layer>
      </Camera>
      <AbsoluteFill style={{background: 'rgba(40,20,120,0.16)', mixBlendMode: 'multiply'}} />
      <LightLeak frame={frame} strength={0.18} hue="warm" />
    </AbsoluteFill>
  );

  if (shot.id === 'pov') {
    const r = lerp(760, 0, ease.inCubic(clamp((s - 35.5) / 2.4)));
    return (
      <AbsoluteFill style={{background: '#05030C'}}>
        <Tunnel r={r} cy={860 + Math.sin(frame / 20) * 10}>
          {scene}
        </Tunnel>
      </AbsoluteFill>
    );
  }
  return scene;
};
