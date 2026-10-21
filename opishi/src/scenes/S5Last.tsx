// Глава 5 — «Три года спустя»: та же крыша. Она не видит. Он описывает закат теми же словами.
// Wordless ending: he puts the lime glasses into her hand.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, springT} from '../lib/anim';
import {INK_DARK, P, SKIN} from '../lib/design';
import {camAt, Shot} from '../lib/shots';
import {at, S, talkAt} from '../lib/timeline';
import {Ledge, RoofReverse, RoofSunset, Wind} from '../env/Rooftop';
import {Mira} from '../rig/Mira';
import {Timur} from '../rig/Timur';
import {exprAt} from '../rig/expr';
import {Cane, LimeGlasses} from '../rig/props';
import {JuiceSky} from '../mg/Overlays';
import {EndCard} from '../mg/Titles';
import {LightLeak} from '../fx/Post';
import {soft} from '../rig/cel';

const MIRA = {x: 680, y: 905, s: 0.74};

const SHOTS: Shot[] = [
  {id: 'wide', t0: 68.5, t1: 71.9, from: {x: 540, y: 960, zoom: 1.0, dof: 0.5}, to: {x: 520, y: 950, zoom: 1.06, dof: 0.5}, shake: 0.3},
  {id: 'two', t0: 71.9, t1: 73.5, from: {x: 500, y: 880, zoom: 1.3, dof: 0.9}, to: {x: 510, y: 870, zoom: 1.4, dof: 0.9}},
  {id: 'miraCU', t0: 73.5, t1: 74.8, from: {x: 690, y: 830, zoom: 2.3, dof: 1.8}, to: {x: 690, y: 830, zoom: 2.4, dof: 1.8}},
  {id: 'timurCU', t0: 74.8, t1: 78.3, from: {x: 540, y: 640, zoom: 1.9, dof: 1.8}, to: {x: 540, y: 640, zoom: 2.15, dof: 1.8}},
  {id: 'pov', t0: 78.3, t1: 83.4, from: {x: 540, y: 960, zoom: 1}},
  {id: 'miraCU2', t0: 83.4, t1: 88.1, from: {x: 690, y: 840, zoom: 2.4, dof: 1.8}, to: {x: 690, y: 836, zoom: 2.8, dof: 1.8}, ease: ease.inOutCubic},
  {id: 'timurCU2', t0: 88.1, t1: 89.8, from: {x: 540, y: 650, zoom: 2.3, dof: 1.8}, to: {x: 540, y: 650, zoom: 2.4, dof: 1.8}},
  {id: 'miraCU3', t0: 89.8, t1: 94.4, from: {x: 690, y: 850, zoom: 2.2, dof: 1.8}, to: {x: 690, y: 846, zoom: 2.6, dof: 1.8}},
  {id: 'hands', t0: 94.4, t1: 96.0, from: {x: 540, y: 960, zoom: 1}},
  {id: 'miraLime', t0: 96.0, t1: 96.9, from: {x: 690, y: 850, zoom: 2.1, dof: 1.8}, to: {x: 690, y: 850, zoom: 2.25, dof: 1.8}},
  {id: 'green', t0: 96.9, t1: 97.6, from: {x: 540, y: 960, zoom: 1}},
  {id: 'end', t0: 97.6, t1: 100, from: {x: 540, y: 960, zoom: 1}},
];

export const S5Last: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 29);

  if (shot.id === 'end') return <EndCard frame={frame} t={s - 97.6} />;
  if (shot.id === 'pov' || shot.id === 'green') return <Darkness frame={frame} s={s} green={shot.id === 'green'} />;
  if (shot.id === 'hands') return <Hands frame={frame} t={s - 94.4} />;

  // Timur walks in and sits beside her
  const walk = ease.inOutQuad(clamp((s - 69.4) / 2.2));
  const sit = springT(frame, S(71.75), 160, 16);
  const tX = lerp(-220, 330, walk);
  const tY = lerp(800, 905, clamp(sit)) + (walk < 1 ? -Math.abs(Math.sin(walk * Math.PI * 5)) * 14 : 0);

  const miraE = exprAt(frame, [
    [0, {lid: 0.2, smile: 0.05, tilt: 3, gazeX: 0, nod: 0.05}],
    [S(71.8), {lid: 0.2, browL: 0.3, browR: 0.3, browIn: 0.2, smile: 0, turn: -0.2, tilt: -4}, 20],
    [at('M6', 0), {lid: 0.2, browL: 0.35, browR: 0.35, browIn: 0.3, smile: 0.1, turn: -0.3, tilt: -6}, 12],
    [at('M7', 0), {lid: 0.3, browL: 0.55, browR: 0.55, browIn: 0.9, smile: -0.25, turn: -0.15, tilt: -3, cheek: 0.4}, 20],
    [at('M7', 2.0), {lid: 0.3, browL: 0.6, browR: 0.6, browIn: 1, smile: -0.35, turn: -0.25, tilt: -6, cheek: 0.6, nod: 0.1}, 24],
    [at('M8', 0), {lid: 0.3, browL: 0.45, browR: 0.45, browIn: 0.85, smile: 0.15, turn: -0.2, tilt: -4, cheek: 0.6}, 20],
    [at('M8', 3.0), {lid: 0.3, browL: 0.4, browR: 0.4, browIn: 0.8, smile: 0.3, turn: 0.1, tilt: 4, cheek: 0.7, nod: -0.1}, 30],
    [S(96.0), {lid: 0.2, browL: 0.5, browR: 0.5, browIn: 0.7, smile: 0.55, turn: 0.2, tilt: 5, cheek: 0.9, nod: -0.15}, 20],
  ]);
  const timurE = exprAt(frame, [
    [0, {lid: 0.3, smile: 0, gazeX: 0.6, tilt: 2}],
    [S(71.9), {lid: 0.25, browL: 0.4, browR: 0.4, browIn: 0.8, smile: -0.2, gazeX: 0.6, tilt: 3}, 20],
    [S(74.9), {lid: 0.3, browL: 0.5, browR: 0.5, browIn: 1, smile: -0.35, gazeX: 0.6, tilt: 4, cheek: 0.4}, 20],
    [at('T6', 0.9), {lid: 0.3, browL: 0.45, browR: 0.45, browIn: 0.9, smile: 0.1, gazeX: -0.5, gazeY: -0.3, tilt: -2, cheek: 0.4}, 30],
    [at('T7', 0), {lid: 0.35, browL: 0.55, browR: 0.55, browIn: 1, smile: -0.3, gazeX: 0.6, gazeY: 0.1, tilt: 5}, 14],
  ]);
  const miraTalk = talkAt(frame, ['M6', 'M7', 'M8']) * 0.9;
  const timurTalk = talkAt(frame, ['T6', 'T7']) * 0.9;
  const lime = shot.id === 'miraLime';
  const reverse = shot.id.startsWith('timur');

  return (
    <AbsoluteFill style={{filter: 'saturate(1.02)'}}>
      <Camera cam={cam}>
        <Layer pf={0.3} depth={5}>{reverse ? <RoofReverse frame={frame} /> : <RoofSunset frame={frame} dusk={0.08} />}</Layer>
        <Layer pf={0.9} depth={1}>
          <Wind frame={frame} />
        </Layer>
        {!reverse && (
          <Layer pf={1} depth={0} blurBoost={shot.id === 'two' || shot.id === 'wide' ? 0 : 0}>
            <g transform={`translate(${MIRA.x} ${MIRA.y}) scale(${MIRA.s})`}>
              <Mira id="s5m" frame={frame} e={miraE} talk={miraTalk} outfit="coat" glasses={lime ? 'lime' : 'dark'} tears={shot.id === 'miraCU2' ? clamp((s - 85.0) / 2) : shot.id === 'miraCU3' || lime ? 0.9 : 0} />
            </g>
            <g transform="translate(905 1150) rotate(-14)">
              <Cane len={520} />
            </g>
          </Layer>
        )}
        <Layer pf={1} depth={0} blurBoost={shot.id.startsWith('mira') ? 7 : 0}>
          <g transform={`translate(${reverse ? 540 : tX} ${reverse ? 700 : tY}) scale(${reverse ? 0.78 : 0.74})`}>
            <Timur id="s5t" frame={frame} e={timurE} talk={timurTalk} outfit="coat" tears={reverse ? clamp((s - 75.2) / 2.5) : 0} />
          </g>
        </Layer>
        {!reverse && (
          <Layer pf={1.05} depth={0.3}>
            <Ledge y={1500} />
          </Layer>
        )}
      </Camera>
      {!reverse && <AbsoluteFill style={{background: 'radial-gradient(ellipse at 80% 62%, rgba(255,200,120,0.35), rgba(255,200,120,0) 55%)', mixBlendMode: 'screen'}} />}
      {reverse && <AbsoluteFill style={{background: 'linear-gradient(250deg, rgba(255,150,70,0.0) 40%, rgba(255,150,70,0.3) 100%)', mixBlendMode: 'screen'}} />}
      <LightLeak frame={frame} strength={0.28} hue="warm" />
      {lime && <AbsoluteFill style={{background: P.lime, opacity: 0.1 * clamp((s - 96.0) / 0.6), mixBlendMode: 'screen'}} />}
    </AbsoluteFill>
  );
};

// Her darkness. His words paint the sunset into it; at the very end the world turns green.
const Darkness: React.FC<{frame: number; s: number; green: boolean}> = ({frame, s, green}) => {
  const orange = ease.inOutCubic(clamp((s - at('T6', 2.4) / FPS) / 1.4));
  const juiceT = s - at('T6', 3.5) / FPS;
  const g = green ? ease.outCubic(clamp((s - 96.9) / 0.5)) : 0;
  return (
    <AbsoluteFill style={{background: '#050308'}}>
      <AbsoluteFill style={{filter: 'blur(38px)', opacity: 0.9}}>
        <svg width={1080} height={1920}>
          <circle cx={540} cy={1100} r={lerp(60, 520, orange)} fill="#FF8A3D" opacity={orange * 0.75} />
          <circle cx={540} cy={1100} r={lerp(20, 260, orange)} fill="#FFD27A" opacity={orange * 0.8} />
          <rect x={0} y={0} width={1080} height={900} fill="#6E3A9C" opacity={orange * 0.35} />
          <JuiceSky t={juiceT} dur={3.4} frame={frame} y0={520} />
          {green && <rect x={0} y={0} width={1080} height={1920} fill={P.lime} opacity={g * 0.55} />}
          {green && <circle cx={540} cy={1000} r={420} fill="#FFB347" opacity={g * 0.6} />}
        </svg>
      </AbsoluteFill>
      {/* drifting dust motes so the darkness breathes */}
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {Array.from({length: 30}).map((_, i) => {
          const x = (i * 97) % 1080;
          const y = (i * 211 + frame * (0.2 + (i % 5) * 0.08)) % 1920;
          return <circle key={i} cx={x} cy={y} r={1.5 + (i % 3)} fill={green ? '#E9FFB0' : '#FFC98A'} opacity={0.12 + (i % 4) * 0.04} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Insert: his hand lowers the lime glasses into her open palm; her fingers close around them.
const Finger: React.FC<{len: number; w: number; ang: number; x: number; y: number; skin: {base: string; shade: string; light: string}; nail?: string}> = ({len, w, ang, x, y, skin, nail}) => (
  <g transform={`translate(${x} ${y}) rotate(${ang})`}>
    <path d={soft([[0, -w / 2], [len * 0.55, -w / 2 - 2], [len, -w * 0.38], [len + w * 0.35, 0], [len, w * 0.38], [len * 0.55, w / 2 + 2], [0, w / 2]], 0.35)} fill={skin.base} stroke={INK_DARK} strokeWidth={4} />
    <path d={`M${len * 0.45},${-w * 0.42} L${len * 0.47},${w * 0.42}`} stroke={skin.shade} strokeWidth={3} />
    <path d={soft([[len * 0.72, -w * 0.32], [len + w * 0.2, -w * 0.2], [len + w * 0.2, w * 0.2], [len * 0.72, w * 0.32]], 0.4)} fill={nail ?? skin.light} opacity={0.95} />
  </g>
);

const Hands: React.FC<{frame: number; t: number}> = ({frame, t}) => {
  const lower = ease.inOutCubic(clamp(t / 0.75));
  const release = clamp((t - 0.8) / 0.25);
  const drop = springT(frame, frame - Math.round((t - 0.85) * 60), 220, 13);
  const close = ease.inOutCubic(clamp((t - 1.05) / 0.45));
  const lift = ease.inOutCubic(clamp((t - 0.95) / 0.6));
  const M = SKIN.mira;
  const T = SKIN.timur;
  const glassY = lerp(330, 1060, lower) + (t > 0.85 ? clamp(drop) * 90 : 0);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #8A3E58 0%, #4A2A55 55%, #2A1838 100%)'}}>
      <svg width={1080} height={1920}>
        {/* her coat on her knees */}
        <path d="M0,1300 Q540,1180 1080,1300 L1080,1920 L0,1920 Z" fill="#3A2240" stroke={INK_DARK} strokeWidth={5} />
        {/* her open palm (seen from above), sleeve from bottom-left */}
        <g transform="translate(520 1260) rotate(-8)">
          <path d={soft([[-330, 360], [-150, 160], [-40, 260], [-230, 470]], 0.2)} fill="#4A2E4C" stroke={INK_DARK} strokeWidth={5} />
          <path d={soft([[-150, 120], [60, 40], [190, 90], [220, 190], [120, 300], [-60, 300], [-140, 240]], 0.32)} fill={M.base} stroke={INK_DARK} strokeWidth={5} />
          <path d={soft([[-60, 170], [120, 120], [150, 190], [60, 250], [-40, 240]], 0.4)} fill={M.shade} opacity={0.7} />
          <path d="M-40,200 Q40,150 140,150 M-20,250 Q60,220 150,210" stroke={M.deep} strokeWidth={3} fill="none" opacity={0.6} />
          {[0, 1, 2, 3].map((i) => (
            <Finger key={i} len={[150, 170, 160, 128][i]} w={[40, 42, 40, 36][i]} x={70 + i * 46} y={60 + i * 12 - i * i * 4} ang={lerp(-78 + i * 10, -150 + i * 6, close)} skin={M} nail="#C8506A" />
          ))}
          <Finger len={110} w={44} x={-110} y={120} ang={lerp(-130, -70, close)} skin={M} nail="#C8506A" />
        </g>
        {/* the glasses */}
        <g transform={`translate(${lerp(560, 610, clamp(drop))} ${glassY}) rotate(${lerp(-24, 4, clamp(drop))}) scale(0.6)`}>
          <LimeGlasses />
        </g>
        {/* his hand from above, pinching one temple, then letting go */}
        <g transform={`translate(${lerp(820, 860, lower)} ${lerp(80, 760, lower) - lift * 420}) rotate(${lerp(10, 2, lower)})`}>
          <path d={soft([[-90, -700], [80, -700], [70, -40], [-80, -40]], 0.12)} fill="#16141A" stroke={INK_DARK} strokeWidth={5} />
          <path d={soft([[-90, -60], [80, -60], [90, 40], [40, 140], [-60, 150], [-110, 60]], 0.3)} fill={T.base} stroke={INK_DARK} strokeWidth={5} />
          <path d={soft([[20, -50], [80, -60], [90, 40], [50, 120]], 0.3)} fill={T.shade} />
          <Finger len={120} w={38} x={-90} y={70} ang={lerp(120, 150, release)} skin={T} />
          <Finger len={130} w={40} x={-40} y={120} ang={lerp(100, 125, release)} skin={T} />
        </g>
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 62%, rgba(255,170,90,0.18) 0%, rgba(0,0,0,0) 45%, rgba(10,4,20,0.65) 100%)'}} />
    </AbsoluteFill>
  );
};
