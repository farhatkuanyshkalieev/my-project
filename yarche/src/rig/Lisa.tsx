// Лиза — the heroine. Platinum hair with dark roots, almond amber eyes,
// glossy red lips, glitter freckles. Drawn around head centre (0,0).
import React from 'react';
import {blink, clamp, fbm, rand} from '../lib/anim';
import {P, SKIN} from '../lib/design';
import {Expr} from './expr';
import {Brow, Eye, EyeStyle, Mouth, MouthStyle} from './face';

export type LisaOutfit = 'pinkSweater' | 'limeBlazer' | 'cardigan' | 'homeSweater';

const S = SKIN.lisa;
const eyeSt: EyeStyle = {
  w: 112, h: 25, tiltOuter: 11, iris: ['#E0A257', '#6E3A16'], irisR: 23, liner: '#2A1418', linerW: 4.2,
  wing: 16, lashes: 1, lidSkin: '#D9707E', crease: '#B66A5E', sclera: '#FBF1EC', heavyLid: 0.25,
};
const mouthSt: MouthStyle = {hw: 58, upper: 19, lower: 24, lip: ['#F0505E', '#B81E3A'], line: '#7A1022', gloss: 0.4};

const f = (n: number) => n.toFixed(1);

// ragged strand tips from x0 to x1 (left to right) around baseline y
const tips = (x0: number, x1: number, y: number, n: number, seed: number) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const dy = (i % 2 ? -1 : 1) * (10 + rand(seed + i) * 26) + (i % 2 ? 0 : rand(seed + i * 3) * 30);
    d += ` L${f(x)},${f(y + dy)}`;
  }
  return d;
};

export const Lisa: React.FC<{
  id: string;
  frame: number;
  e: Expr;
  talk?: number; // speech mouth openness 0..1
  outfit?: LisaOutfit;
  body?: boolean;
  glitter?: number;
}> = ({id, frame, e, talk = 0, outfit = 'pinkSweater', body = true, glitter = 1}) => {
  const b = blink(frame, 11);
  const lid = clamp(e.lid + b * (1 - e.lid), -0.4, 1);
  const open = clamp(e.open + talk * 0.75, 0, 1.15);
  const jd = open * 14;
  const turn = e.turn;
  const tx = (x: number) => x * (1 - 0.12 * turn * Math.sign(x)) + turn * 20;
  // idle micro motion
  const sway = fbm(frame / 90, 3) * 1.6;
  const breathe = Math.sin(frame / 38) * 0.5 + 0.5;
  const headRot = e.tilt + sway;
  const nodY = e.nod * 10;

  const face = `M${f(tx(0))},-236 C${f(tx(96))},-236 ${f(tx(150))},-192 ${f(tx(154))},-122 C${f(tx(159))},-62 ${f(tx(166))},-20 ${f(tx(159))},30 C${f(tx(151))},86 ${f(tx(132))},122 ${f(tx(102))},152 C${f(tx(68))},186 ${f(tx(34))},${f(212 + jd)} ${f(tx(0))},${f(214 + jd)} C${f(tx(-34))},${f(212 + jd)} ${f(tx(-68))},186 ${f(tx(-102))},152 C${f(tx(-132))},122 ${f(tx(-151))},86 ${f(tx(-159))},30 C${f(tx(-166))},-20 ${f(tx(-159))},-62 ${f(tx(-154))},-122 C${f(tx(-150))},-192 ${f(tx(-96))},-236 ${f(tx(0))},-236 Z`;

  const fx = turn * 26; // feature shift
  const nearL = 1 + 0.1 * turn; // screen-left eye scale
  const nearR = 1 - 0.1 * turn;

  // glitter specks
  const specks = [] as React.ReactNode[];
  if (glitter > 0) {
    for (let i = 0; i < 46; i++) {
      const ang = rand(i * 3.1) * Math.PI * 2;
      const rad = Math.sqrt(rand(i * 7.7)) * 1;
      const gx = Math.cos(ang) * rad * 120 + fx;
      const gy = Math.sin(ang) * rad * 70 + 40;
      const tw = 0.5 + 0.5 * Math.sin(frame / (6 + rand(i) * 9) + i * 2.3);
      const big = rand(i * 1.9) > 0.86;
      specks.push(
        big ? (
          <path
            key={i}
            d={`M${f(gx)},${f(gy - 5 * tw)} L${f(gx + 1.2)},${f(gy - 1.2)} L${f(gx + 5 * tw)},${f(gy)} L${f(gx + 1.2)},${f(gy + 1.2)} L${f(gx)},${f(gy + 5 * tw)} L${f(gx - 1.2)},${f(gy + 1.2)} L${f(gx - 5 * tw)},${f(gy)} L${f(gx - 1.2)},${f(gy - 1.2)} Z`}
            fill="#fff"
            opacity={(0.5 + 0.5 * tw) * glitter}
          />
        ) : (
          <circle key={i} cx={gx} cy={gy} r={0.9 + rand(i * 5.3) * 1.3} fill="#FFF6E8" opacity={(0.25 + 0.6 * tw) * glitter} />
        ),
      );
    }
  }

  return (
    <g>
      <defs>
        <radialGradient id={`${id}-skin`} cx="0.42" cy="0.42" r="0.68">
          <stop offset="0" stopColor={S.light} />
          <stop offset="0.55" stopColor={S.base} />
          <stop offset="1" stopColor={S.shade} />
        </radialGradient>
        <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B2A22" />
          <stop offset="0.13" stopColor="#5E4634" />
          <stop offset="0.24" stopColor="#CDB58C" />
          <stop offset="0.5" stopColor="#E9D6AE" />
          <stop offset="1" stopColor="#F4E7C9" />
        </linearGradient>
        <linearGradient id={`${id}-hairS`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={`${id}-blush`}>
          <stop offset="0" stopColor={S.blush} stopOpacity="0.75" />
          <stop offset="1" stopColor={S.blush} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={S.deep} />
          <stop offset="0.35" stopColor={S.shade} />
          <stop offset="1" stopColor={S.base} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-soft2`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`${id}-face`}>
          <path d={face} />
        </clipPath>
      </defs>

      {/* back hair (behind body) */}
      <g transform={`rotate(${headRot * 0.4} 0 200)`}>
        <path
          d={`M${f(tx(0) - 4)},-266 C${f(tx(130))},-266 ${f(tx(215))},-190 ${f(tx(222))},-60 C${f(tx(232))},100 ${f(tx(238))},330 ${f(tx(250))},${560 + breathe * 2}${tips(tx(250), tx(-250), 560 + breathe * 2, 14, 7)} C${f(tx(-238))},330 ${f(tx(-232))},100 ${f(tx(-222))},-60 C${f(tx(-215))},-190 ${f(tx(-130))},-266 ${f(tx(0) - 4)},-266 Z`}
          fill={`url(#${id}-hair)`}
        />
        <path
          d={`M${f(tx(-250))},${560} C${f(tx(-238))},330 ${f(tx(-232))},100 ${f(tx(-222))},-60 L${f(tx(222))},-60 C${f(tx(232))},100 ${f(tx(238))},330 ${f(tx(250))},${560} Z`}
          fill={`url(#${id}-hairS)`}
        />
      </g>

      {body && <LisaBody id={id} outfit={outfit} breathe={breathe} />}

      {/* neck */}
      <path d="M-56,120 C-52,200 -58,262 -74,318 L74,318 C58,262 52,200 56,120 Z" fill={`url(#${id}-neck)`} />
      <ellipse cx={0} cy={205} rx={70} ry={30} fill={S.deep} opacity={0.45} filter={`url(#${id}-soft)`} />

      {/* head */}
      <g transform={`translate(0 ${f(nodY)}) rotate(${f(headRot)} 0 190)`}>
        <path d={face} fill={`url(#${id}-skin)`} />
        <g clipPath={`url(#${id}-face)`}>
          {/* contour + hairline shadow */}
          <ellipse cx={tx(-150)} cy={60} rx={40} ry={110} fill={S.shade} opacity={0.5} filter={`url(#${id}-soft)`} />
          <ellipse cx={tx(150)} cy={60} rx={40} ry={110} fill={S.shade} opacity={0.5} filter={`url(#${id}-soft)`} />
          <ellipse cx={fx * 0.3} cy={-238} rx={170} ry={42} fill={S.deep} opacity={0.55} filter={`url(#${id}-soft)`} />
          {/* blush */}
          <ellipse cx={-98 + fx * 0.8} cy={58 - e.cheek * 8} rx={62} ry={38} fill={`url(#${id}-blush)`} opacity={0.75 + e.cheek * 0.25} />
          <ellipse cx={98 + fx * 0.8} cy={58 - e.cheek * 8} rx={62} ry={38} fill={`url(#${id}-blush)`} opacity={0.75 + e.cheek * 0.25} />
          {/* nose */}
          <path d={`M${f(fx * 1.2 - 10)},-22 C${f(fx * 1.25 - 14)},20 ${f(fx * 1.3 - 18)},48 ${f(fx * 1.3 - 14)},66`} stroke={S.shade} strokeWidth={7} fill="none" opacity={0.55} filter={`url(#${id}-soft2)`} />
          <path d={`M${f(fx * 1.2 + 6)},-30 C${f(fx * 1.25 + 7)},10 ${f(fx * 1.3 + 7)},40 ${f(fx * 1.3 + 5)},56`} stroke={S.light} strokeWidth={5} fill="none" opacity={0.6} filter={`url(#${id}-soft2)`} />
          <ellipse cx={fx * 1.35} cy={70} rx={20} ry={14} fill={S.blush} opacity={0.35} filter={`url(#${id}-soft2)`} />
          <path d={`M${f(fx * 1.35 - 18)},74 q6,7 13,3`} stroke={S.deep} strokeWidth={2.4} fill="none" opacity={0.8} strokeLinecap="round" />
          <path d={`M${f(fx * 1.35 + 18)},74 q-6,7 -13,3`} stroke={S.deep} strokeWidth={2.4} fill="none" opacity={0.8} strokeLinecap="round" />
          <ellipse cx={fx * 1.35 - 3} cy={62} rx={6} ry={4} fill="#fff" opacity={0.45} />
          {/* under-eye + cheekbone highlight */}
          <ellipse cx={-92 + fx} cy={18} rx={34} ry={10} fill={S.light} opacity={0.5} filter={`url(#${id}-soft2)`} />
          <ellipse cx={92 + fx} cy={18} rx={34} ry={10} fill={S.light} opacity={0.5} filter={`url(#${id}-soft2)`} />
          {/* forehead / chin highlights + rim light */}
          <ellipse cx={fx * 0.6 - 10} cy={-150} rx={60} ry={26} fill={S.light} opacity={0.3} filter={`url(#${id}-soft)`} />
          <ellipse cx={fx * 1.1} cy={196 + jd} rx={30} ry={12} fill={S.light} opacity={0.5} filter={`url(#${id}-soft2)`} />
          <path d={face} fill="none" stroke="#FFE3C9" strokeWidth={10} opacity={0.35} filter={`url(#${id}-soft2)`} transform="translate(6 0)" />
          <ellipse cx={tx(-120)} cy={95} rx={22} ry={60} fill={S.deep} opacity={0.22} filter={`url(#${id}-soft)`} />
          <ellipse cx={tx(120)} cy={95} rx={22} ry={60} fill={S.deep} opacity={0.22} filter={`url(#${id}-soft)`} />
          {specks}
        </g>

        <Eye id={`${id}-eL`} x={-74 + fx} y={-8} side={-1} st={eyeSt} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} scaleX={nearL} />
        <Eye id={`${id}-eR`} x={74 + fx} y={-8} side={1} st={eyeSt} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} scaleX={nearR} />
        <Brow x={-76 + fx} y={-64} side={-1} len={104} thickIn={11} thickOut={4} arch={13} raise={e.browL} inner={e.browIn} color="#7A5A44" scaleX={nearL} />
        <Brow x={76 + fx} y={-64} side={1} len={104} thickIn={11} thickOut={4} arch={13} raise={e.browR} inner={e.browIn} color="#7A5A44" scaleX={nearR} />
        <Mouth id={`${id}-m`} x={fx * 1.15} y={130 + jd * 0.25} st={mouthSt} open={open} smile={e.smile} wide={e.wide} />

        {/* front hair curtains */}
        <path
          d={`M${f(tx(-4))},-240 C${f(tx(-70))},-232 ${f(tx(-128))},-186 ${f(tx(-150))},-104 C${f(tx(-172))},-20 ${f(tx(-178))},80 ${f(tx(-174))},180 C${f(tx(-172))},300 ${f(tx(-182))},420 ${f(tx(-190))},${560 + breathe * 2}${tips(tx(-190), tx(-246), 572 + breathe * 2, 4, 21)} C${f(tx(-238))},330 ${f(tx(-244))},110 ${f(tx(-226))},-40 C${f(tx(-208))},-176 ${f(tx(-122))},-268 ${f(tx(-4))},-266 Z`}
          fill={`url(#${id}-hair)`}
        />
        <path
          d={`M${f(tx(4))},-240 C${f(tx(70))},-232 ${f(tx(128))},-186 ${f(tx(150))},-104 C${f(tx(172))},-20 ${f(tx(178))},80 ${f(tx(174))},180 C${f(tx(172))},300 ${f(tx(182))},420 ${f(tx(190))},${560 + breathe * 2}${tips(tx(190), tx(246), 572 + breathe * 2, 4, 33)} C${f(tx(238))},330 ${f(tx(244))},110 ${f(tx(226))},-40 C${f(tx(208))},-176 ${f(tx(122))},-268 ${f(tx(4))},-266 Z`}
          fill={`url(#${id}-hair)`}
        />
        {/* crown sheen band (anisotropic highlight) */}
        <path
          d={`M${f(tx(-200))},-120 C${f(tx(-170))},-210 ${f(tx(-90))},-252 ${f(tx(0))},-254 C${f(tx(90))},-252 ${f(tx(170))},-210 ${f(tx(200))},-120`}
          stroke="#FFF6E2"
          strokeWidth={16}
          fill="none"
          opacity={0.32}
          filter={`url(#${id}-soft2)`}
        />
        {/* strand detail */}
        {[-1, 1].map((sd) =>
          [0, 1, 2, 3, 4].map((i) => (
            <path
              key={`${sd}-${i}`}
              d={`M${f(tx(sd * (20 + i * 22)))},${-250 + i * 4} C${f(tx(sd * (120 + i * 18)))},${-210 + i * 8} ${f(tx(sd * (176 + i * 12)))},${-60 + i * 10} ${f(tx(sd * (184 + i * 12)))},${120 + i * 70}`}
              stroke={i % 2 ? '#FFF4DC' : '#B99B6E'}
              strokeOpacity={i % 2 ? 0.55 : 0.4}
              strokeWidth={i % 2 ? 2.5 : 2}
              fill="none"
            />
          )),
        )}
        <path d={`M${f(tx(0))},-266 L${f(tx(0))},-236`} stroke="#2A1C16" strokeWidth={3} />
        {/* gold hoops */}
        <circle cx={tx(-176)} cy={118} r={17} fill="none" stroke={P.gold} strokeWidth={4.5} />
        <circle cx={tx(176)} cy={118} r={17} fill="none" stroke={P.gold} strokeWidth={4.5} />
        <circle cx={tx(-182)} cy={108} r={3} fill="#FFF1C2" />
        <circle cx={tx(170)} cy={108} r={3} fill="#FFF1C2" />
      </g>
    </g>
  );
};

const LisaBody: React.FC<{id: string; outfit: LisaOutfit; breathe: number}> = ({id, outfit, breathe}) => {
  const sy = 1 + breathe * 0.012;
  const shoulders = 'M-70,300 C-140,304 -238,330 -272,410 C-292,470 -300,600 -306,760 L306,760 C300,600 292,470 272,410 C238,330 140,304 70,300 Z';
  const knit = (col: string, dark: string) => (
    <>
      <path d={shoulders} fill={col} />
      <path d={shoulders} fill={`url(#${id}-bodyS)`} />
      {Array.from({length: 22}).map((_, i) => (
        <path key={i} d={`M${-290 + i * 27},380 C${-292 + i * 27},520 ${-296 + i * 27},640 ${-298 + i * 27},760`} stroke={dark} strokeOpacity={0.18} strokeWidth={3} fill="none" />
      ))}
    </>
  );
  return (
    <g transform={`translate(0 300) scale(1 ${sy.toFixed(4)}) translate(0 -300)`}>
      <defs>
        <linearGradient id={`${id}-bodyS`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.25" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      {outfit === 'pinkSweater' && (
        <>
          {knit(P.pink, '#7A0E3C')}
          <path d="M-84,300 C-60,346 60,346 84,300 C70,330 -70,330 -84,300 Z" fill="#C92A6B" />
          <path d="M-84,298 C-60,352 60,352 84,298" stroke="#FF7DB0" strokeWidth={5} fill="none" opacity={0.6} />
        </>
      )}
      {outfit === 'homeSweater' && (
        <>
          {knit('#D9A9BA', '#6E4A57')}
          <path d="M-84,300 C-60,346 60,346 84,300" stroke="#B8899A" strokeWidth={9} fill="none" />
        </>
      )}
      {outfit === 'cardigan' && (
        <>
          {knit('#CF7FA0', '#5A2440')}
          <path d="M-70,300 L0,470 L70,300 Z" fill="#F4E9E0" />
          <path d="M-70,300 L0,470 L0,760" stroke="#A05677" strokeWidth={6} fill="none" />
          {[520, 600, 680].map((y) => (
            <circle key={y} cx={-14} cy={y} r={7} fill="#F2D9A6" />
          ))}
        </>
      )}
      {outfit === 'limeBlazer' && (
        <>
          <path d={shoulders} fill={P.lime} />
          <path d={shoulders} fill={`url(#${id}-bodyS)`} />
          <path d="M-66,302 C-40,380 40,380 66,302 L60,760 L-60,760 Z" fill="#FBF6EE" />
          <path d="M-70,300 L-150,330 L-60,520 L-24,760 L-110,760 L-130,520 Z" fill="#A9C42A" />
          <path d="M70,300 L150,330 L60,520 L24,760 L110,760 L130,520 Z" fill="#A9C42A" />
          <path d="M-150,330 L-60,520" stroke="#7E931A" strokeWidth={3} />
          <path d="M150,330 L60,520" stroke="#7E931A" strokeWidth={3} />
        </>
      )}
    </g>
  );
};
