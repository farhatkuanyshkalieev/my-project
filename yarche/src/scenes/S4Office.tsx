// Глава 4 — «Полтора года отношений»: серый офис, баннеры, звонок «купи хлеба», ящик со скетчбуком.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Camera, Layer} from '../lib/camera';
import {clamp, ease, FPS, lerp, rand} from '../lib/anim';
import {fonts, P} from '../lib/design';
import {camAt, S, Shot} from '../lib/shots';
import {lineFrame, talkAt} from '../lib/timeline';
import {BannerScreen, OfficeSet} from '../env/Office';
import {Mark} from '../rig/Mark';
import {exprAt} from '../rig/expr';
import {Doodle, HandWrap, Phone} from '../rig/props';

const at = (id: string, off = 0) => lineFrame(id) + S(off);
const MARK = {x: 960, y: 430, s: 0.46};

const SHOTS: Shot[] = [
  {id: 'screen', t0: 40.8, t1: 41.9, from: {x: 960, y: 540, zoom: 1, dof: 0}, shake: 0.2},
  {id: 'mcu', t0: 41.9, t1: 42.6, from: {x: 980, y: 520, zoom: 1.55, dof: 1.2}, to: {x: 980, y: 515, zoom: 1.62, dof: 1.2}},
  {id: 'cu', t0: 42.6, t1: 46.9, from: {x: 985, y: 470, zoom: 2.5, dof: 2}, to: {x: 975, y: 476, zoom: 2.85, dof: 2}},
  {id: 'drawer', t0: 46.9, t1: 48.1, from: {x: 960, y: 540, zoom: 1, dof: 0}, shake: 0.2},
];

export const S4Office: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const {cam, shot} = camAt(frame, SHOTS, 41);
  const markE = exprAt(frame, [
    [0, {lid: 0.62, browL: -0.15, browR: -0.1, browIn: 0.15, smile: -0.2, gazeX: -0.35, gazeY: 0.3}],
    [S(42.1), {lid: 0.55, browL: 0.05, browR: 0.05, browIn: 0.2, smile: -0.2, gazeX: 0.45, gazeY: 0.6, nod: 0.15}, 14],
    [S(42.7), {lid: 0.6, browL: -0.1, browR: -0.1, browIn: 0.25, smile: -0.2, gazeX: -0.1, gazeY: 0.2, tilt: 6}, 16],
    [at('M6', 0), {lid: 0.66, browL: -0.15, browR: -0.15, browIn: 0.3, smile: -0.22, gazeX: -0.05, gazeY: 0.25, tilt: 6}, 10],
    [at('M6', 0.9), {lid: 0.8, browL: 0, browR: 0, browIn: 0.55, smile: -0.3, gazeX: 0.1, gazeY: 0.6, tilt: 5, nod: 0.2}, 18],
    [at('M6', 1.4), {lid: 0.62, browL: -0.1, browR: -0.1, browIn: 0.35, smile: -0.25, gazeX: 0.3, gazeY: 0.75, nod: 0.35, tilt: 4}, 20],
  ]);
  const talk = talkAt(frame, ['M6']);
  const phoneAtEar = ease.inOutCubic(clamp((s - 42.55) / 0.35)) * (1 - ease.inOutCubic(clamp((s - 46.3) / 0.5)));
  const ringing = s > 42.0 && s < 42.75;

  if (shot.id === 'screen') {
    const k = (s - 40.8) / 1.1;
    return (
      <AbsoluteFill style={{background: '#2A2E36', filter: 'saturate(0.4)'}}>
        <AbsoluteFill style={{transform: `scale(${lerp(1.45, 1.6, k)}) translate(${lerp(10, -10, k)}px, 0)`}}>
          <svg width={1920} height={1080}>
            <g transform="translate(960 560)">
              <BannerScreen frame={frame - S(40.8) + 10} />
            </g>
          </svg>
        </AbsoluteFill>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(170,200,255,0.12), rgba(0,0,0,0.35))'}} />
      </AbsoluteFill>
    );
  }
  if (shot.id === 'drawer') return <DrawerInsert frame={frame} s={s} />;

  return (
    <AbsoluteFill style={{filter: 'saturate(0.36) contrast(1.04) brightness(0.98)'}}>
      <Camera cam={cam}>
        <Layer pf={0.7} depth={3}>
          <OfficeSet frame={frame} />
        </Layer>
        <Layer pf={1} depth={0}>
          <g transform={`translate(${MARK.x} ${MARK.y}) scale(${MARK.s})`}>
            <Mark id="s4m" frame={frame} e={markE} talk={talk} outfit="shirt" />
          </g>
          {/* monitor glow spill */}
          <defs>
            <radialGradient id="s4glow">
              <stop offset="0" stopColor="#9CC0FF" stopOpacity="0.2" />
              <stop offset="1" stopColor="#9CC0FF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={MARK.x - 60} cy={MARK.y + 60} rx={200} ry={210} fill="url(#s4glow)" />
          {/* phone at his ear */}
          <g opacity={phoneAtEar} transform={`translate(${MARK.x + 128} ${lerp(MARK.y + 260, MARK.y + 20, phoneAtEar)}) rotate(${lerp(30, 12, phoneAtEar)}) scale(0.33)`}>
            <Phone>
              <rect x={-108} y={-238} width={216} height={476} fill="#1B1E26" />
            </Phone>
            <g transform="translate(30 150) rotate(-100) scale(1.5)">
              <HandWrap who="mark" sleeve="#8D939E" />
            </g>
          </g>
        </Layer>
        <Layer pf={1.08} depth={0.6}>
          {/* desk + monitor back */}
          <rect x={-600} y={760} width={3200} height={500} fill="#6E747F" />
          <rect x={-600} y={750} width={3200} height={18} fill="#9AA0AB" />
          <g transform="translate(470 560)">
            <rect x={-220} y={-170} width={440} height={280} rx={14} fill="#2C3038" />
            <rect x={-30} y={110} width={60} height={90} fill="#3A3F48" />
            <rect x={-110} y={190} width={220} height={20} rx={8} fill="#3A3F48" />
          </g>
          {/* phone buzzing on the desk */}
          {s < 42.7 && (
            <g transform={`translate(${1290 + (ringing ? Math.sin(frame * 2.3) * 4 : 0)} 790) rotate(-75) scale(0.32)`}>
              <Phone>
                <rect x={-108} y={-238} width={216} height={476} fill={ringing ? '#3B3F4A' : '#111'} />
                {ringing && (
                  <>
                    <circle cx={0} cy={-120} r={46} fill={P.pinkSoft} />
                    <text x={0} y={-40} textAnchor="middle" fontFamily={fonts.sans} fontWeight={800} fontSize={34} fill="#fff">
                      Лиза
                    </text>
                    <circle cx={-56} cy={150} r={30} fill="#E04848" />
                    <circle cx={56} cy={150} r={30} fill="#3BB56A" opacity={0.6 + 0.4 * Math.sin(frame / 4)} />
                  </>
                )}
              </Phone>
            </g>
          )}
        </Layer>
      </Camera>
    </AbsoluteFill>
  );
};

// His sketchbook in the desk drawer; the drawer slides shut into darkness.
const DrawerInsert: React.FC<{frame: number; s: number}> = ({frame, s}) => {
  const t = s - 46.9;
  const close = ease.inOutCubic(clamp((t - 0.35) / 0.55));
  const dark = clamp((t - 0.75) / 0.3);
  return (
    <AbsoluteFill style={{background: '#121318'}}>
      <AbsoluteFill style={{filter: 'saturate(0.45)', transform: `translateY(${-close * 520}px) scale(${lerp(1.05, 1.0, t / 1.2)})`}}>
        <svg width={1920} height={1080}>
          <rect x={0} y={0} width={1920} height={1080} fill="#3A3F48" />
          <rect x={160} y={120} width={1600} height={900} fill="#23262D" />
          {/* sketchbook */}
          <g transform="translate(960 560) rotate(-6)">
            <rect x={-420} y={-280} width={840} height={560} rx={16} fill="#E9A3BF" />
            <rect x={-400} y={-262} width={800} height={524} rx={10} fill="#F8F1E6" />
            <rect x={-6} y={-262} width={12} height={524} fill="#D9CFC0" />
            <g transform="translate(-200 -190) scale(1.9)">
              <Doodle progress={1} color="#E2669B" width={3} />
            </g>
            {Array.from({length: 9}).map((_, i) => (
              <path key={i} d={`M${60 + rand(i) * 260},${-200 + i * 48} q${40 + rand(i * 3) * 60},${-20 + rand(i * 5) * 40} ${120 + rand(i * 2) * 100},${rand(i * 7) * 20}`} stroke={[P.cobalt, P.lime, P.autumn, P.pink][i % 4]} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.75} />
            ))}
            <text x={70} y={230} fontFamily={fonts.script} fontSize={56} fill="#8E5A74">
              для Лизы
            </text>
          </g>
        </svg>
      </AbsoluteFill>
      {/* drawer front sliding up over it */}
      <AbsoluteFill style={{transform: `translateY(${lerp(1080, 0, close)}px)`}}>
        <svg width={1920} height={1080}>
          <rect x={0} y={0} width={1920} height={1080} fill="#7E848F" />
          <rect x={0} y={0} width={1920} height={30} fill="#9AA0AB" />
          <rect x={760} y={420} width={400} height={44} rx={22} fill="#5C626D" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#000', opacity: dark}} />
    </AbsoluteFill>
  );
};
