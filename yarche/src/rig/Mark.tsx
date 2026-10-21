// Марк — the painter. Heavy angular brows, sleepy grey-blue eyes, long nose with a
// flushed tip, a dark wavy quiff streaked with honey. Drawn around head centre (0,0).
import React from 'react';
import {blink, clamp, fbm} from '../lib/anim';
import {P, SKIN} from '../lib/design';
import {Expr} from './expr';
import {Brow, Eye, EyeStyle, Mouth, MouthStyle} from './face';

export type MarkOutfit = 'coat' | 'hoodie' | 'shirt' | 'hoodieNight';

const S = SKIN.mark;
const eyeSt: EyeStyle = {
  w: 104, h: 21, tiltOuter: 4, iris: ['#D3DEE8', '#5F7690'], irisR: 18, liner: '#1E1013', linerW: 3.6,
  wing: 0, lashes: 0.35, lidSkin: '#A65A43', crease: '#8E4A38', sclera: '#F6ECE6', heavyLid: 0.55,
};
const mouthSt: MouthStyle = {hw: 54, upper: 14, lower: 19, lip: ['#D9584C', '#9C2C2E'], line: '#5E1618', gloss: 0.18};

const f = (n: number) => n.toFixed(1);

export const Mark: React.FC<{
  id: string;
  frame: number;
  e: Expr;
  talk?: number;
  outfit?: MarkOutfit;
  body?: boolean;
  markerBehindEar?: boolean;
}> = ({id, frame, e, talk = 0, outfit = 'coat', body = true, markerBehindEar = false}) => {
  const b = blink(frame, 29);
  const lid = clamp(e.lid + b * (1 - e.lid), -0.4, 1);
  const open = clamp(e.open + talk * 0.7, 0, 1.15);
  const jd = open * 16;
  const turn = e.turn;
  const tx = (x: number) => x * (1 - 0.12 * turn * Math.sign(x)) + turn * 20;
  const sway = fbm(frame / 100, 8) * 1.4;
  const breathe = Math.sin(frame / 42) * 0.5 + 0.5;
  const headRot = e.tilt + sway;
  const nodY = e.nod * 10;
  const fx = turn * 28;
  const nearL = 1 + 0.1 * turn;
  const nearR = 1 - 0.1 * turn;

  const face = `M${f(tx(0))},-252 C${f(tx(102))},-252 ${f(tx(148))},-206 ${f(tx(152))},-136 C${f(tx(157))},-70 ${f(tx(160))},-14 ${f(tx(157))},36 C${f(tx(154))},96 ${f(tx(150))},136 ${f(tx(132))},172 C${f(tx(112))},212 ${f(tx(80))},${f(238 + jd)} ${f(tx(42))},${f(247 + jd)} C${f(tx(20))},${f(252 + jd)} ${f(tx(-20))},${f(252 + jd)} ${f(tx(-42))},${f(247 + jd)} C${f(tx(-80))},${f(238 + jd)} ${f(tx(-112))},212 ${f(tx(-132))},172 C${f(tx(-150))},136 ${f(tx(-154))},96 ${f(tx(-157))},36 C${f(tx(-160))},-14 ${f(tx(-157))},-70 ${f(tx(-152))},-136 C${f(tx(-148))},-206 ${f(tx(-102))},-252 ${f(tx(0))},-252 Z`;

  const hairBack = `M${f(tx(-166))},-20 C${f(tx(-178))},-140 ${f(tx(-170))},-250 ${f(tx(-110))},-300 C${f(tx(-50))},-346 ${f(tx(60))},-350 ${f(tx(120))},-310 C${f(tx(176))},-268 ${f(tx(182))},-150 ${f(tx(168))},-20 L${f(tx(150))},-30 L${f(tx(-150))},-30 Z`;
  // the quiff: wavy lobes sweeping up and to screen-right, one curl dropping on the forehead
  const quiff = `M${f(tx(-160))},-60 C${f(tx(-178))},-150 ${f(tx(-168))},-236 ${f(tx(-128))},-292 C${f(tx(-104))},-334 ${f(tx(-62))},-356 ${f(tx(-16))},-352 C${f(tx(12))},-374 ${f(tx(70))},-376 ${f(tx(104))},-350 C${f(tx(150))},-330 ${f(tx(184))},-282 ${f(tx(178))},-216 C${f(tx(188))},-176 ${f(tx(174))},-120 ${f(tx(162))},-70 C${f(tx(150))},-120 ${f(tx(140))},-170 ${f(tx(112))},-196 C${f(tx(84))},-222 ${f(tx(40))},-228 ${f(tx(4))},-214 C${f(tx(-10))},-196 ${f(tx(-24))},-168 ${f(tx(-50))},-160 C${f(tx(-72))},-154 ${f(tx(-80))},-180 ${f(tx(-74))},-200 C${f(tx(-104))},-196 ${f(tx(-130))},-160 ${f(tx(-142))},-110 Z`;
  const streak = (d: string, w: number, o: number, c = '#D7A35E') => (
    <g>
      <path d={d} stroke={c} strokeWidth={w * 2.2} fill="none" opacity={o * 0.45} strokeLinecap="round" filter={`url(#${id}-soft2)`} />
      <path d={d} stroke="#F6D49A" strokeWidth={Math.max(1.5, w * 0.28)} fill="none" opacity={o * 0.7} strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      <defs>
        <radialGradient id={`${id}-skin`} cx="0.42" cy="0.4" r="0.7">
          <stop offset="0" stopColor={S.light} />
          <stop offset="0.55" stopColor={S.base} />
          <stop offset="1" stopColor={S.shade} />
        </radialGradient>
        <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A2E20" />
          <stop offset="0.5" stopColor="#2B1A13" />
          <stop offset="1" stopColor="#1A0F0B" />
        </linearGradient>
        <radialGradient id={`${id}-blush`}>
          <stop offset="0" stopColor={S.blush} stopOpacity="0.7" />
          <stop offset="1" stopColor={S.blush} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={S.deep} />
          <stop offset="0.4" stopColor={S.shade} />
          <stop offset="1" stopColor={S.base} />
        </linearGradient>
        <linearGradient id={`${id}-stub`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.5" stopColor="#3B3550" stopOpacity="0" />
          <stop offset="1" stopColor="#3B3550" stopOpacity="0.2" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${id}-soft2`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`${id}-face`}>
          <path d={face} />
        </clipPath>
        <clipPath id={`${id}-quiffClip`}>
          <path d={quiff} />
        </clipPath>
      </defs>

      {body && <MarkBody id={id} outfit={outfit} breathe={breathe} />}

      {/* neck */}
      <path d="M-74,120 C-70,210 -76,268 -92,330 L92,330 C76,268 70,210 74,120 Z" fill={`url(#${id}-neck)`} />
      <ellipse cx={0} cy={236} rx={84} ry={34} fill={S.deep} opacity={0.5} filter={`url(#${id}-soft)`} />
      <path d="M-10,262 q10,26 22,40" stroke={S.deep} strokeWidth={5} opacity={0.25} fill="none" />
      {outfit !== 'shirt' && (outfit === 'hoodie' || outfit === 'hoodieNight') && <HoodRing outfit={outfit} />}

      <g transform={`translate(0 ${f(nodY)}) rotate(${f(headRot)} 0 200)`}>
        <path d={hairBack} fill="#24150F" />
        {/* ears */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <path
              d={`M${f(tx(sd * 150))},-44 C${f(tx(sd * 186))},-58 ${f(tx(sd * 192))},10 ${f(tx(sd * 176))},48 C${f(tx(sd * 166))},70 ${f(tx(sd * 150))},62 ${f(tx(sd * 148))},44 Z`}
              fill={S.shade}
            />
            <path d={`M${f(tx(sd * 160))},-26 C${f(tx(sd * 178))},-24 ${f(tx(sd * 176))},20 ${f(tx(sd * 164))},36`} stroke={S.deep} strokeWidth={4} fill="none" opacity={0.6} />
          </g>
        ))}
        {markerBehindEar && (
          <g transform={`translate(${f(tx(176))} -40) rotate(-28)`}>
            <rect x={-8} y={-70} width={16} height={120} rx={7} fill="#17121C" />
            <rect x={-8} y={-70} width={16} height={34} rx={7} fill={P.pink} />
            <rect x={-3} y={-60} width={4} height={100} rx={2} fill="#fff" opacity={0.25} />
          </g>
        )}
        <path d={face} fill={`url(#${id}-skin)`} />
        <g clipPath={`url(#${id}-face)`}>
          <ellipse cx={tx(-150)} cy={70} rx={44} ry={140} fill={S.shade} opacity={0.55} filter={`url(#${id}-soft)`} />
          <ellipse cx={tx(150)} cy={70} rx={44} ry={140} fill={S.shade} opacity={0.55} filter={`url(#${id}-soft)`} />
          <ellipse cx={tx(-112)} cy={110} rx={26} ry={70} fill={S.deep} opacity={0.28} filter={`url(#${id}-soft)`} />
          <ellipse cx={tx(112)} cy={110} rx={26} ry={70} fill={S.deep} opacity={0.28} filter={`url(#${id}-soft)`} />
          <ellipse cx={fx * 0.3} cy={-250} rx={180} ry={60} fill={S.deep} opacity={0.6} filter={`url(#${id}-soft)`} />
          <path d={`M${f(tx(-150))},40 C${f(tx(-120))},90 ${f(tx(-100))},120 ${f(tx(-60))},150`} stroke={S.deep} strokeWidth={26} fill="none" opacity={0.28} filter={`url(#${id}-soft)`} />
          <path d={`M${f(tx(150))},40 C${f(tx(120))},90 ${f(tx(100))},120 ${f(tx(60))},150`} stroke={S.deep} strokeWidth={26} fill="none" opacity={0.28} filter={`url(#${id}-soft)`} />
          <ellipse cx={-96 + fx} cy={30} rx={40} ry={12} fill={S.light} opacity={0.45} filter={`url(#${id}-soft2)`} />
          <ellipse cx={96 + fx} cy={30} rx={40} ry={12} fill={S.light} opacity={0.45} filter={`url(#${id}-soft2)`} />
          <path d={face} fill={`url(#${id}-stub)`} />
          {/* flushed cheeks */}
          <ellipse cx={-100 + fx * 0.8} cy={66 - e.cheek * 8} rx={58} ry={40} fill={`url(#${id}-blush)`} opacity={0.6 + e.cheek * 0.3} />
          <ellipse cx={100 + fx * 0.8} cy={66 - e.cheek * 8} rx={58} ry={40} fill={`url(#${id}-blush)`} opacity={0.6 + e.cheek * 0.3} />
          {/* long nose */}
          <path d={`M${f(fx * 1.2 - 14)},-40 C${f(fx * 1.3 - 18)},10 ${f(fx * 1.4 - 24)},56 ${f(fx * 1.4 - 22)},86`} stroke={S.deep} strokeWidth={9} fill="none" opacity={0.5} filter={`url(#${id}-soft2)`} />
          <path d={`M${f(fx * 1.2 + 8)},-50 C${f(fx * 1.3 + 9)},0 ${f(fx * 1.4 + 9)},44 ${f(fx * 1.4 + 6)},72`} stroke={S.light} strokeWidth={6} fill="none" opacity={0.55} filter={`url(#${id}-soft2)`} />
          <ellipse cx={fx * 1.45} cy={86} rx={26} ry={18} fill={S.blush} opacity={0.5} filter={`url(#${id}-soft2)`} />
          <path d={`M${f(fx * 1.45 - 26)},92 q8,12 18,6`} stroke={S.deep} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d={`M${f(fx * 1.45 + 26)},92 q-8,12 -18,6`} stroke={S.deep} strokeWidth={3} fill="none" strokeLinecap="round" />
          <ellipse cx={fx * 1.45 - 4} cy={78} rx={8} ry={5} fill="#fff" opacity={0.35} />
          {/* philtrum + chin cleft */}
          <path d={`M${f(fx * 1.3 - 6)},106 L${f(fx * 1.25 - 5)},128 M${f(fx * 1.3 + 6)},106 L${f(fx * 1.25 + 5)},128`} stroke={S.shade} strokeWidth={3} opacity={0.45} />
          <path d={`M${f(fx * 1.1)},${f(222 + jd)} l0,14`} stroke={S.deep} strokeWidth={3} opacity={0.35} />
          {/* rim light + forehead sheen */}
          <path d={face} fill="none" stroke="#FFD2B0" strokeWidth={10} opacity={0.3} filter={`url(#${id}-soft2)`} transform="translate(-6 0)" />
          <ellipse cx={fx * 0.6} cy={-160} rx={70} ry={30} fill={S.light} opacity={0.45} filter={`url(#${id}-soft)`} />
          {/* eye sockets */}
          <ellipse cx={-74 + fx} cy={-20} rx={58} ry={30} fill={S.deep} opacity={0.22} filter={`url(#${id}-soft2)`} />
          <ellipse cx={74 + fx} cy={-20} rx={58} ry={30} fill={S.deep} opacity={0.22} filter={`url(#${id}-soft2)`} />
        </g>

        <Eye id={`${id}-eL`} x={-74 + fx} y={-16} side={-1} st={eyeSt} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} scaleX={nearL} />
        <Eye id={`${id}-eR`} x={74 + fx} y={-16} side={1} st={eyeSt} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} scaleX={nearR} />
        <Brow x={-76 + fx} y={-66} side={-1} len={128} thickIn={28} thickOut={17} arch={9} raise={e.browL} inner={e.browIn} color="#1A0E0E" angular scaleX={nearL} />
        <Brow x={76 + fx} y={-66} side={1} len={128} thickIn={28} thickOut={17} arch={9} raise={e.browR} inner={e.browIn} color="#1A0E0E" angular scaleX={nearR} />
        <Mouth id={`${id}-m`} x={fx * 1.2} y={158 + jd * 0.25} st={mouthSt} open={open} smile={e.smile} wide={e.wide} />

        {/* quiff */}
        <path d={quiff} fill={`url(#${id}-hair)`} />
        <path d={quiff} fill="none" stroke="#120906" strokeWidth={3} opacity={0.5} />
        <g clipPath={`url(#${id}-quiffClip)`}>
          <ellipse cx={tx(10)} cy={-330} rx={150} ry={40} fill="#7A5236" opacity={0.6} filter={`url(#${id}-soft)`} />
          <ellipse cx={tx(60)} cy={-200} rx={150} ry={30} fill="#0C0605" opacity={0.55} filter={`url(#${id}-soft)`} />
        </g>
        {streak(`M${f(tx(-138))},-120 C${f(tx(-150))},-210 ${f(tx(-110))},-300 ${f(tx(-30))},-336`, 7, 0.75)}
        {streak(`M${f(tx(-96))},-190 C${f(tx(-90))},-270 ${f(tx(-40))},-320 ${f(tx(40))},-344`, 9, 0.9, '#E6B873')}
        {streak(`M${f(tx(-20))},-232 C${f(tx(10))},-290 ${f(tx(80))},-330 ${f(tx(140))},-300`, 6, 0.7)}
        {streak(`M${f(tx(30))},-224 C${f(tx(90))},-250 ${f(tx(150))},-230 ${f(tx(166))},-150`, 8, 0.85, '#E6B873')}
        {streak(`M${f(tx(-60))},-170 C${f(tx(-70))},-190 ${f(tx(-50))},-214 ${f(tx(-20))},-224`, 4, 0.6, '#F2CF92')}
        {streak(`M${f(tx(-130))},-250 C${f(tx(-80))},-300 ${f(tx(-10))},-340 ${f(tx(80))},-356`, 3, 0.5, '#FFE2AE')}
        {streak(`M${f(tx(100))},-330 C${f(tx(150))},-310 ${f(tx(172))},-260 ${f(tx(170))},-200`, 4, 0.55, '#F2CF92')}
        {/* forehead curl */}
        <path d={`M${f(tx(-40))},-200 C${f(tx(-70))},-170 ${f(tx(-58))},-130 ${f(tx(-30))},-132 C${f(tx(-50))},-150 ${f(tx(-48))},-176 ${f(tx(-24))},-196 Z`} fill="#2B1A13" />
        {streak(`M${f(tx(-36))},-192 C${f(tx(-58))},-170 ${f(tx(-52))},-146 ${f(tx(-36))},-138`, 3, 0.7, '#D7A35E')}
      </g>
    </g>
  );
};

const HoodRing: React.FC<{outfit: MarkOutfit}> = ({outfit}) => {
  const c = outfit === 'hoodieNight' ? '#4A5068' : '#5A6C9C';
  return (
    <g>
      <path d="M-150,300 C-140,240 -80,236 0,250 C80,236 140,240 150,300 C110,340 -110,340 -150,300 Z" fill={c} />
      <path d="M-120,292 C-90,262 90,262 120,292" stroke="#000" strokeOpacity={0.25} strokeWidth={8} fill="none" />
    </g>
  );
};

const MarkBody: React.FC<{id: string; outfit: MarkOutfit; breathe: number}> = ({id, outfit, breathe}) => {
  const sy = 1 + breathe * 0.012;
  const sh = 'M-90,312 C-170,316 -282,336 -320,420 C-342,480 -350,620 -356,780 L356,780 C350,620 342,480 320,420 C282,336 170,316 90,312 Z';
  return (
    <g transform={`translate(0 312) scale(1 ${sy.toFixed(4)}) translate(0 -312)`}>
      <defs>
        <linearGradient id={`${id}-bodyS`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {outfit === 'coat' && (
        <>
          <path d={sh} fill="#3A2620" />
          <path d="M-92,312 C-60,360 60,360 92,312 L80,780 L-80,780 Z" fill="#F5F0EA" />
          <path d="M-96,312 C-60,352 60,352 96,312" stroke="#D9D2CA" strokeWidth={6} fill="none" />
          <path d="M-96,312 L-186,340 L-104,560 L-60,780 L-150,780 L-170,560 Z" fill="#4A322A" />
          <path d="M96,312 L186,340 L104,560 L60,780 L150,780 L170,560 Z" fill="#4A322A" />
          <path d="M-186,340 L-104,560 M186,340 L104,560" stroke="#21140F" strokeWidth={4} />
          <path d={sh} fill={`url(#${id}-bodyS)`} />
        </>
      )}
      {(outfit === 'hoodie' || outfit === 'hoodieNight') && (
        <>
          <path d={sh} fill={outfit === 'hoodie' ? '#5A6C9C' : '#4A5068'} />
          <path d={sh} fill={`url(#${id}-bodyS)`} />
          <path d="M-30,330 C-34,420 -40,470 -36,520 M30,330 C34,420 40,470 36,520" stroke="#D9DDE8" strokeWidth={7} fill="none" strokeLinecap="round" />
          <rect x={-46} y={516} width={20} height={14} rx={4} fill="#B9BFCC" />
          <rect x={26} y={516} width={20} height={14} rx={4} fill="#B9BFCC" />
          <path d="M-200,640 L200,640" stroke="#000" strokeOpacity={0.14} strokeWidth={6} />
        </>
      )}
      {outfit === 'shirt' && (
        <>
          <path d={sh} fill="#8D939E" />
          <path d={sh} fill={`url(#${id}-bodyS)`} />
          <path d="M-96,306 L-24,404 L0,330 L24,404 L96,306 L60,296 L0,318 L-60,296 Z" fill="#A3A9B4" stroke="#6E747F" strokeWidth={3} />
          <path d="M0,330 L0,780" stroke="#6E747F" strokeWidth={4} />
          {[450, 560, 670].map((y) => (
            <circle key={y} cx={10} cy={y} r={6} fill="#C9CDD4" />
          ))}
        </>
      )}
    </g>
  );
};
