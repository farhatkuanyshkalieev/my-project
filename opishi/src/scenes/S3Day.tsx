// Глава 3 — «Год спустя»: заключение врача. Ссора на расколотом экране.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp} from '../lib/anim';
import {INK_DARK, P} from '../lib/design';
import {camAt, Shot} from '../lib/shots';
import {at, S, talkAt} from '../lib/timeline';
import {Apartment} from '../env/Apartment';
import {Mira} from '../rig/Mira';
import {Timur} from '../rig/Timur';
import {exprAt} from '../rig/expr';
import {ClinicLetter} from '../mg/Overlays';

const TIMUR = {x: 820, y: 860, s: 0.6};
const MIRA = {x: 330, y: 900, s: 0.62};

const SHOTS: Shot[] = [
  {id: 'letter', t0: 38.5, t1: 42.3, from: {x: 540, y: 960, zoom: 1}},
  {id: 'timurCU', t0: 42.3, t1: 45.2, from: {x: 820, y: 830, zoom: 2.2, dof: 1.8}, to: {x: 820, y: 836, zoom: 2.5, dof: 1.8}, shake: 1.0},
  {id: 'miraCU', t0: 45.2, t1: 49.1, from: {x: 330, y: 860, zoom: 2.3, dof: 1.8}, to: {x: 330, y: 856, zoom: 2.6, dof: 1.8}, shake: 0.7},
  {id: 'split', t0: 49.1, t1: 52.6, from: {x: 540, y: 960, zoom: 1}},
  {id: 'miraCU2', t0: 52.6, t1: 55.0, from: {x: 330, y: 850, zoom: 2.7, dof: 2}, to: {x: 330, y: 850, zoom: 3.0, dof: 2}},
  {id: 'apart', t0: 55.0, t1: 58.0, from: {x: 540, y: 960, zoom: 1}},
];

export const S3Day: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 13);
  const glassesOff = ease.inOutCubic(clamp((s - 45.5) / 0.9));

  const miraE = exprAt(frame, [
    [0, {lid: 0.2, browL: 0.3, browR: 0.3, browIn: 0.6, smile: -0.2, gazeX: 0.5, gazeY: 0.2}],
    [at('M4', 0), {lid: 0.35, browL: 0.5, browR: 0.5, browIn: 1, smile: -0.5, open: 0.1, cheek: 0.5, squint: 0.3, gazeX: 0.3, gazeY: 0.1, nod: 0.1}, 10],
    [at('M4', 2.4), {lid: 0.3, browL: 0.55, browR: 0.55, browIn: 1, smile: -0.6, cheek: 0.6, squint: 0.4, gazeX: 0.5, tilt: 5}, 10],
    [S(49.3), {lid: 0.55, browL: 0.4, browR: 0.4, browIn: 0.9, smile: -0.5, gazeX: 0.1, gazeY: 0.6, nod: 0.3, tilt: -4}, 16],
    [at('M5', 0), {lid: 0.45, browL: 0.45, browR: 0.45, browIn: 0.95, smile: -0.3, gazeX: 0.45, gazeY: 0.2, nod: 0.1, tilt: -6}, 16],
  ]);
  const timurE = exprAt(frame, [
    [0, {lid: 0.1, browL: 0.6, browR: 0.6, browIn: 0.5, smile: -0.2, gazeX: 0, gazeY: 0.5}],
    [at('T4', 0), 'shocked', 8],
    [at('T4', 1.0), {lid: -0.2, browL: 0.8, browR: 0.8, browIn: 0.8, smile: -0.4, open: 0.15, gazeX: -0.6}, 10],
    [at('M4', 0.5), {lid: 0.1, browL: 0.6, browR: 0.6, browIn: 0.9, smile: -0.4, gazeX: -0.6}, 16],
    [at('T5', 0), {lid: -0.1, browL: 0.8, browR: 0.8, browIn: 1, smile: -0.5, gazeX: -0.6, tilt: 4, open: 0.1}, 8],
    [at('M5', 0.5), {lid: 0.3, browL: 0.6, browR: 0.6, browIn: 1, smile: -0.6, gazeX: -0.6, tilt: 6}, 20],
  ], );
  const miraTalk = talkAt(frame, ['M4', 'M5']);
  const timurTalk = talkAt(frame, ['T4', 'T5']);
  const grade = 'saturate(0.75) contrast(1.03)';

  if (shot.id === 'letter') {
    const t = s - 38.5;
    return (
      <AbsoluteFill style={{background: '#9FB6C8', filter: grade}}>
        <AbsoluteFill style={{transform: `scale(${lerp(1.0, 1.12, ease.inOutQuad(clamp(t / 3.8)))})`}}>
          <ClinicLetter t={t} />
        </AbsoluteFill>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(20,30,50,0.5) 100%)'}} />
      </AbsoluteFill>
    );
  }

  const room = (who: 'timur' | 'mira' | 'both', c = cam) => (
    <Camera cam={c}>
      <Layer pf={0.8} depth={2.5}>
        <Apartment frame={frame} light="day" polaroids={6} lamp={false} />
      </Layer>
      {(who === 'timur' || who === 'both') && (
        <Layer pf={1} depth={0}>
          <g transform={`translate(${TIMUR.x} ${TIMUR.y}) scale(${TIMUR.s})`}>
            <Timur id={`s3t${who}`} frame={frame} e={timurE} talk={timurTalk} outfit="tee" />
          </g>
        </Layer>
      )}
      {(who === 'mira' || who === 'both') && (
        <Layer pf={1} depth={0}>
          <g transform={`translate(${MIRA.x} ${MIRA.y}) scale(${MIRA.s})`}>
            <Mira id={`s3m${who}`} frame={frame} e={miraE} talk={miraTalk} outfit="hoodie" glasses="lime" glassesLift={glassesOff} cloudy={0.55} tears={clamp((s - 46.5) / 2)} />
          </g>
        </Layer>
      )}
    </Camera>
  );

  if (shot.id === 'split' || shot.id === 'apart') {
    // diagonal split: Timur top-right, Mira bottom-left; in 'apart' the halves drift away
    const t = s - 49.1;
    const k = ease.outCubic(clamp(t / 0.45));
    const apart = shot.id === 'apart' ? ease.inOutCubic(clamp((s - 55.0) / 2.6)) : 0;
    const gap = lerp(0, 120, apart);
    const topClip = `polygon(0 0, 100% 0, 100% ${55 - gap / 38}%, 0 ${35 - gap / 38}%)`;
    const botClip = `polygon(0 ${35 + gap / 38}%, 100% ${55 + gap / 38}%, 100% 100%, 0 100%)`;
    return (
      <AbsoluteFill style={{background: '#0E0B18', filter: grade}}>
        <AbsoluteFill style={{clipPath: topClip, transform: `translate(${(1 - k) * 400}px, ${-apart * 260}px)`}}>
          {room('timur', {x: 820, y: lerp(980, 990, t / 6), zoom: 1.9, dof: 1.6})}
        </AbsoluteFill>
        <AbsoluteFill style={{clipPath: botClip, transform: `translate(${(k - 1) * 400}px, ${apart * 260}px)`}}>
          {room('mira', {x: 330, y: lerp(560, 550, t / 6), zoom: 1.9, dof: 1.6})}
        </AbsoluteFill>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <line x1={-20} y1={1920 * 0.35 - gap * 0.5 - apart * 260} x2={1100} y2={1920 * 0.55 - gap * 0.5 - apart * 260} stroke={P.lime} strokeWidth={8} opacity={k * (1 - apart)} />
          <line x1={-20} y1={1920 * 0.35 + gap * 0.5 + apart * 260} x2={1100} y2={1920 * 0.55 + gap * 0.5 + apart * 260} stroke={P.lime} strokeWidth={8} opacity={k * (1 - apart)} />
          {apart > 0 &&
            [0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M${100 + i * 200},${1920 * (0.38 + i * 0.04)} l40,-18 l14,30 Z`} fill={INK_DARK} stroke={P.lime} strokeWidth={2} opacity={apart} transform={`translate(0 ${(i % 2 ? -1 : 1) * apart * 120}) rotate(${apart * 90 * (i % 2 ? 1 : -1)} ${120 + i * 200} ${1920 * (0.38 + i * 0.04)})`} />
            ))}
        </svg>
        <AbsoluteFill style={{background: '#000', opacity: clamp((s - 57.3) / 0.7)}} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{filter: grade}}>
      {room(shot.id.startsWith('timur') ? 'timur' : 'mira')}
      <AbsoluteFill style={{background: 'rgba(150,200,230,0.12)', mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};
