// Глава 5 — «Сейчас»: ночная кухня почти без цвета. Только рисунок на старом стаканчике
// ещё розовый — и тот гаснет в финале.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, rand, track} from '../lib/anim';
import {fonts, P} from '../lib/design';
import {camAt, S, Shot} from '../lib/shots';
import {lineFrame, talkAt} from '../lib/timeline';
import {Island, KitchenSet} from '../env/Kitchen';
import {Lisa} from '../rig/Lisa';
import {Mark} from '../rig/Mark';
import {exprAt} from '../rig/expr';
import {Cup, Doodle, HandWrap} from '../rig/props';

const at = (id: string, off = 0) => lineFrame(id) + S(off);
const LISA = {x: 640, y: 430, s: 0.43};
const MARK = {x: 1300, y: 445, s: 0.44};
const CUP = {x: 735, y: 560, s: 0.42};

const SHOTS: Shot[] = [
  {id: 'lisaMCU', t0: 48.0, t1: 51.3, from: {x: 700, y: 520, zoom: 1.8, dof: 1.6}, to: {x: 700, y: 505, zoom: 2.05, dof: 1.6}, shake: 0.4},
  {id: 'markCU', t0: 51.3, t1: 52.2, from: {x: 1300, y: 486, zoom: 2.7, dof: 2}, to: {x: 1300, y: 486, zoom: 2.8, dof: 2}},
  {id: 'lisaCU', t0: 52.2, t1: 54.8, from: {x: 648, y: 470, zoom: 3.0, dof: 2.2}, to: {x: 648, y: 462, zoom: 3.35, dof: 2.2}, shake: 0.35},
  {id: 'markCU2', t0: 54.8, t1: 57.6, from: {x: 1300, y: 478, zoom: 2.7, dof: 2.2}, to: {x: 1300, y: 474, zoom: 3.3, dof: 2.4}, ease: ease.inOutCubic, shake: 0.3},
];

export const S5Now: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  if (s >= 57.6) return <EndCard frame={frame} s={s} />;
  const {cam, shot} = camAt(frame, SHOTS, 51);
  const lisaFocus = shot.id.startsWith('lisa');
  const markFocus = shot.id.startsWith('mark');

  const lisaE = exprAt(frame, [
    [0, {lid: 0.4, browL: 0.25, browR: 0.25, browIn: 0.45, smile: 0.15, gazeX: 0.35, gazeY: 0.55, tilt: 6, nod: 0.15}],
    [at('L6', 0), 'nostalgic', 16],
    [at('L6', 1.0), {lid: 0.3, browL: 0.35, browR: 0.35, browIn: 0.5, smile: 0.3, gazeX: 0.62, gazeY: 0.05, tilt: 6, cheek: 0.3}, 18],
    [at('M7', 0.4), {lid: 0.42, browL: 0.3, browR: 0.3, browIn: 0.8, smile: -0.1, gazeX: 0.6, gazeY: 0.1, tilt: 4}, 14],
    [at('L7', 0), 'sad', 16],
    [at('L7', 1.2), {lid: 0.5, browL: 0.4, browR: 0.4, browIn: 1, smile: -0.4, gazeX: 0.6, gazeY: 0.05, tilt: 7, cheek: 0.25}, 20],
  ]);
  const markE = exprAt(frame, [
    [0, {lid: 0.62, browL: -0.1, browR: -0.1, browIn: 0.2, smile: -0.15, gazeX: 0.1, gazeY: 0.7, nod: 0.2}],
    [at('L7', 1.4), {lid: 0.55, browL: 0.05, browR: 0.05, browIn: 0.4, smile: -0.2, gazeX: -0.1, gazeY: 0.5, nod: 0.15}, 30],
    [at('M8', -0.3), {lid: 0.4, browL: 0.25, browR: 0.25, browIn: 0.75, smile: -0.25, gazeX: -0.6, gazeY: 0.1, nod: 0.05, tilt: 3}, 40],
    [at('M8', 1.2), {lid: 0.55, browL: 0.3, browR: 0.3, browIn: 0.95, smile: -0.4, gazeX: -0.5, gazeY: 0.45, nod: 0.25, tilt: 5}, 30],
  ]);
  const lisaTalk = talkAt(frame, ['L6', 'L7']) * 0.85;
  const markTalk = talkAt(frame, ['M7', 'M8']) * 0.8;
  const cupLift = ease.inOutCubic(clamp((s - 48.0) / 1.2));
  const tear = clamp((s - 53.6) / 1.2);

  const cupT = `translate(${CUP.x} ${lerp(640, CUP.y, cupLift)}) scale(${CUP.s}) rotate(-8)`;
  const cupLayer = (
    <g transform={cupT}>
      <Cup id="s5cup" doodle={0} />
      <g transform="translate(-58 150) scale(0.72)">
        <HandWrap who="lisa" sleeve="#D9A9BA" />
      </g>
    </g>
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'saturate(0.14) contrast(1.06) brightness(0.92)'}}>
        <Camera cam={cam}>
          <Layer pf={0.7} depth={3}>
            <KitchenSet frame={frame} night />
          </Layer>
          <Layer pf={1} depth={0} blurBoost={!lisaFocus ? 7 : 0}>
            <g transform={`translate(${LISA.x} ${LISA.y}) scale(${LISA.s})`}>
              <Lisa id="s5l" frame={frame} e={lisaE} talk={lisaTalk} outfit="homeSweater" glitter={0.5} />
            </g>
            {tear > 0 && tear < 1 && (
              <g opacity={Math.sin(tear * Math.PI)}>
                <ellipse cx={LISA.x + 32} cy={LISA.y + 4 + tear * 30} rx={2.6} ry={3.6} fill="#fff" />
                <path d={`M${LISA.x + 32},${LISA.y + 2} L${LISA.x + 32},${LISA.y + tear * 30}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} />
              </g>
            )}
          </Layer>
          <Layer pf={1} depth={0} blurBoost={!lisaFocus ? 7 : 0}>
            {cupLayer}
          </Layer>
          <Layer pf={1} depth={0} blurBoost={!markFocus ? 7 : 0}>
            <g transform={`translate(${MARK.x} ${MARK.y}) scale(${MARK.s})`}>
              <Mark id="s5m" frame={frame} e={markE} talk={markTalk} outfit="hoodieNight" />
            </g>
            {/* laptop light on his face */}
            <defs>
              <radialGradient id="s5glow">
                <stop offset="0" stopColor="#BFD4FF" stopOpacity="0.22" />
                <stop offset="1" stopColor="#BFD4FF" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx={MARK.x} cy={MARK.y + 110} rx={180} ry={170} fill="url(#s5glow)" />
          </Layer>
          <Layer pf={1.05} depth={0.4}>
            <Island y={770} night />
            <g transform="translate(1300 770)">
              <path d="M-170,0 L170,0 L150,-200 L-150,-200 Z" fill="#2B2F3A" />
              <path d="M-150,-200 L150,-200 L170,0" fill="none" stroke="#4A5060" strokeWidth={4} />
              <circle cx={0} cy={-100} r={14} fill="#4A5060" />
            </g>
          </Layer>
        </Camera>
      </AbsoluteFill>
      {/* the cup keeps a little colour */}
      <Camera cam={cam}>
        <Layer pf={1} depth={0} blurBoost={!lisaFocus ? 7 : 0}>
          <g transform={cupT} opacity={0.75}>
            <Doodle progress={1} color="#E25A97" />
          </g>
        </Layer>
      </Camera>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(8,6,20,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

// Ending: the doodle drains to grey, the title returns colourless, one last pink spark.
const EndCard: React.FC<{frame: number; s: number}> = ({frame, s}) => {
  const t = s - 57.6;
  const drain = ease.inOutQuad(clamp((t - 0.15) / 0.9));
  const fadeCup = clamp((t - 1.0) / 0.4);
  const title = clamp((t - 1.05) / 0.6);
  const spark = Math.max(0, Math.sin(clamp((t - 1.55) / 0.55) * Math.PI)) * (0.7 + 0.3 * rand(Math.floor(frame / 2)));
  const out = clamp((t - 2.2) / 0.2);
  const col = `rgb(${Math.round(lerp(226, 140, drain))},${Math.round(lerp(90, 138, drain))},${Math.round(lerp(151, 146, drain))})`;
  return (
    <AbsoluteFill style={{background: '#0B0A10'}}>
      <AbsoluteFill style={{opacity: 1 - fadeCup, transform: `scale(${lerp(1.0, 1.08, t / 1.4)})`, filter: 'saturate(0.2)'}}>
        <svg width={1920} height={1080}>
          <ellipse cx={960} cy={880} rx={260} ry={40} fill="#000" opacity={0.6} />
          <g transform="translate(960 250) scale(2.6)">
            <Cup id="endcup" doodle={1} doodleColor={col} doodleOpacity={lerp(0.85, 0.35, drain)} />
          </g>
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            fontFamily: fonts.script,
            fontSize: 260,
            color: '#8E8C93',
            opacity: ease.outCubic(title) * (1 - out),
            clipPath: `inset(-20% ${100 - ease.inOutCubic(title) * 125}% -20% -10%)`,
            transform: `translateY(-20px)`,
            position: 'relative',
          }}
        >
          Ярче
          <div
            style={{
              position: 'absolute',
              left: 118,
              top: 52,
              width: 26,
              height: 26,
              borderRadius: 13,
              background: P.pink,
              boxShadow: `0 0 ${40 * spark}px ${16 * spark}px rgba(240,65,140,${0.8 * spark})`,
              opacity: spark,
            }}
          />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#000', opacity: out}} />
    </AbsoluteFill>
  );
};

export {track};
