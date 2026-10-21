// Глава 4 — «Последний день»: серый рассвет, дверь закрылась. На столе — записка и её очки.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, rand} from '../lib/anim';
import {INK_DARK, SKIN} from '../lib/design';
import {camAt, Shot} from '../lib/shots';
import {S} from '../lib/timeline';
import {Apartment, Sofa} from '../env/Apartment';
import {Timur} from '../rig/Timur';
import {exprAt} from '../rig/expr';
import {LimeGlasses, Note} from '../rig/props';
import {HandNote} from '../mg/Overlays';
import {soft} from '../rig/cel';

const SHOTS: Shot[] = [
  {id: 'room', t0: 58.0, t1: 60.6, from: {x: 420, y: 900, zoom: 1.25, dof: 0.4}, to: {x: 480, y: 920, zoom: 1.12, dof: 0.4}, shake: 0.3},
  {id: 'table', t0: 60.6, t1: 65.0, from: {x: 540, y: 960, zoom: 1}},
  {id: 'timurCU', t0: 65.0, t1: 69.0, from: {x: 540, y: 820, zoom: 1.8, dof: 1.6}, to: {x: 540, y: 800, zoom: 2.2, dof: 1.6}, ease: ease.inOutCubic, shake: 0.4},
];

export const S4Dawn: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 17);
  const grade = 'saturate(0.5) contrast(1.02) brightness(0.97)';

  if (shot.id === 'table') {
    const t = s - 60.6;
    const unfold = ease.inOutCubic(clamp((t - 0.1) / 0.6));
    return (
      <AbsoluteFill style={{background: '#6E655E', filter: 'saturate(0.55)'}}>
        <AbsoluteFill style={{transform: `scale(${lerp(1.08, 1.0, ease.outCubic(clamp(t / 4.4)))}) rotate(${lerp(2, 0, t / 4.4)}deg)`}}>
          <svg width={1080} height={1920}>
            <rect x={0} y={0} width={1080} height={1920} fill="#8A6F5C" />
            {Array.from({length: 26}).map((_, i) => (
              <path key={i} d={`M${i * 44 + rand(i) * 10},-20 C${i * 44 + 30},700 ${i * 44 - 20},1300 ${i * 44 + 10},1960`} stroke="#6E5646" strokeWidth={2 + rand(i * 3) * 3} fill="none" opacity={0.5} />
            ))}
            {/* window light falling on the table */}
            <path d="M-100,0 L700,0 L1180,1920 L380,1920 Z" fill="#E8EEF6" opacity={0.08} />
            <g transform="translate(540 900) scale(1.9) rotate(-3)">
              <Note open={unfold} />
            </g>
            <g transform="translate(560 1520) rotate(-12)">
              <LimeGlasses scale={1.05} />
            </g>
            {/* his hand holding the note's corner */}
            <g transform="translate(980 640) rotate(-30)">
              <path d={soft([[0, -60], [160, -80], [260, -20], [250, 70], [140, 90], [20, 60]], 0.3)} fill={SKIN.timur.base} stroke={INK_DARK} strokeWidth={4} />
              <path d={soft([[-40, -40], [40, -50], [50, -18], [-30, -10]], 0.4)} fill={SKIN.timur.base} stroke={INK_DARK} strokeWidth={4} />
              <path d={soft([[160, -80], [260, -20], [300, -60], [220, -130]], 0.2)} fill="#24222A" stroke={INK_DARK} strokeWidth={4} />
            </g>
          </svg>
          <AbsoluteFill style={{transform: 'rotate(-3deg)'}}>
            <HandNote t={t} lines={[[0.8, 'Не ищи меня.'], [2.25, 'Смотри вперёд…'], [3.4, 'за нас двоих.']]} />
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const timurE = exprAt(frame, [
    [0, {lid: 0.55, browL: 0.4, browR: 0.4, browIn: 0.95, smile: -0.4, gazeY: 0.7, gazeX: 0.1, nod: 0.3, tilt: 4}],
    [S(66.6), {lid: 0.65, browL: 0.5, browR: 0.5, browIn: 1, smile: -0.55, gazeY: 0.6, nod: 0.35, tilt: 6, cheek: 0.4}, 40],
  ]);
  const door = ease.inOutCubic(clamp((s - 58.25) / 0.6));
  return (
    <AbsoluteFill style={{filter: grade}}>
      <Camera cam={cam}>
        <Layer pf={0.85} depth={2.5}>
          <Apartment frame={frame} light="dawn" door={door} polaroids={6} lamp={false} />
        </Layer>
        {shot.id === 'timurCU' && (
          <Layer pf={1} depth={0}>
            <g transform="translate(540 880) scale(0.62)">
              <Timur id="s4t" frame={frame} e={timurE} outfit="hoodie" tears={clamp((s - 66.0) / 1.6)} />
            </g>
            {/* the glasses in his hands, held to his chin */}
            <g transform={`translate(560 ${lerp(1300, 1190, ease.outCubic(clamp((s - 65.0) / 1.2)))}) rotate(-6) scale(0.45)`}>
              <LimeGlasses />
              {[-1, 1].map((sd) => (
                <g key={sd} transform={`translate(${sd * 250} 60) scale(${sd} 1)`}>
                  <path d={soft([[-40, -60], [60, -80], [110, 0], [80, 140], [-60, 180], [-110, 60]], 0.3)} fill={SKIN.timur.base} stroke={INK_DARK} strokeWidth={8} />
                  <path d={soft([[-60, 20], [40, -10], [60, 30], [-40, 70]], 0.4)} fill={SKIN.timur.shade} />
                  <path d={soft([[-110, 60], [-60, 180], [-120, 400], [-260, 360]], 0.2)} fill="#24222A" stroke={INK_DARK} strokeWidth={8} />
                </g>
              ))}
            </g>
          </Layer>
        )}
        <Layer pf={1.1} depth={-0.6}>
          <Sofa light="dawn" />
        </Layer>
      </Camera>
      <AbsoluteFill style={{background: 'rgba(120,130,160,0.18)', mixBlendMode: 'multiply'}} />
    </AbsoluteFill>
  );
};
