// Тимур. Tight black curls, notched flat brows, narrow heavy-lidded eyes, long nose,
// stubble beard, very long neck, silver hoop + chain, black printed jacket. Head centre (0,0).
import React from 'react';
import {blink, clamp, fbm, rand} from '../lib/anim';
import {fonts, INK, INK_DARK, SKIN} from '../lib/design';
import {Expr} from './expr';
import {CelBrow, CelEye, CelMouth, Pt, soft} from './cel';

export type TimurOutfit = 'jacket' | 'tee' | 'hoodie' | 'coat';
const S = SKIN.timur;
const f = (n: number) => n.toFixed(1);

// curl positions on the dome (stable)
const CURLS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const rows = [
    {y: -330, xs: [-60, -10, 40, 90]},
    {y: -300, xs: [-120, -75, -25, 25, 75, 122]},
    {y: -262, xs: [-150, -108, -62, -14, 34, 82, 128, 158]},
    {y: -224, xs: [-162, -126, -84, -40, 6, 52, 98, 140, 168]},
    {y: -190, xs: [-160, -120, 120, 160]},
  ];
  rows.forEach((r, ri) => r.xs.forEach((x, i) => out.push([x + (rand(ri * 10 + i) - 0.5) * 12, r.y + (rand(ri * 7 + i) - 0.5) * 10, 27 + rand(ri + i * 3) * 9])));
  return out;
})();

export const Timur: React.FC<{
  id: string;
  frame: number;
  e: Expr;
  talk?: number;
  outfit?: TimurOutfit;
  body?: boolean;
  tears?: number;
}> = ({id, frame, e, talk = 0, outfit = 'jacket', body = true, tears = 0}) => {
  const b = blink(frame, 23);
  const lid = clamp(e.lid + b * (1 - e.lid), -0.4, 1);
  const open = clamp(e.open + talk * 0.8, 0, 1.15);
  const jd = open * 18;
  const turn = e.turn;
  const tx = (x: number) => x * (1 - 0.13 * turn * Math.sign(x)) + turn * 22;
  const T = (p: Pt): Pt => [tx(p[0]), p[1]];
  const sway = fbm(frame / 105, 6) * 1.5;
  const headRot = e.tilt + sway;
  const breathe = Math.sin(frame / 44) * 0.5 + 0.5;
  const fx = turn * 30;

  const face: Pt[] = [[-92, -214], [92, -214], [130, -140], [138, -30], [128, 80], [104, 170], [56, 238], [0, 254 + jd], [-56, 238], [-104, 170], [-128, 80], [-138, -30], [-130, -140]].map((p) => T(p as Pt));
  const shade: Pt[] = [[70, -214], [130, -140], [138, -30], [128, 80], [104, 170], [56, 238], [0, 254 + jd], [40, 200], [80, 120], [96, 10], [86, -120]].map((p) => T(p as Pt));
  const beard: Pt[] = [[-130, 40], [-120, 120], [-96, 186], [-56, 236], [0, 252 + jd], [56, 236], [96, 186], [120, 120], [130, 40], [110, 110], [80, 170], [40, 196 + jd * 0.6], [0, 206 + jd], [-40, 196 + jd * 0.6], [-80, 170], [-110, 110]].map((p) => T(p as Pt));

  return (
    <g>
      <defs>
        <clipPath id={`${id}-face`}>
          <path d={soft(face, 0.18)} />
        </clipPath>
        <pattern id={`${id}-stub`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="#2A1A14" />
          <circle cx="5.5" cy="5" r="1" fill="#2A1A14" />
        </pattern>
      </defs>

      {body && <TimurBody outfit={outfit} breathe={breathe} />}

      {/* the long neck */}
      <path d={soft([[-58, 150], [58, 150], [60, 400], [86, 570], [-86, 570], [-60, 400]], 0.12)} fill={S.base} stroke={INK} strokeWidth={3.5} />
      <path d={soft([[14, 150], [58, 150], [60, 400], [78, 540], [30, 540], [24, 380]], 0.12)} fill={S.shade} />
      <path d={soft([[-58, 200], [58, 200], [58, 290], [0, 318], [-58, 290]], 0.3)} fill={S.shade} opacity={0.9} />
      <path d="M-6,360 Q4,380 -4,400" stroke={S.deep} strokeWidth={3} fill="none" />
      {/* silver chain */}
      <path d="M-78,520 Q0,610 78,520" stroke="#8D95A3" strokeWidth={7} fill="none" />
      <path d="M-78,520 Q0,610 78,520" stroke="#E9EDF3" strokeWidth={3} strokeDasharray="6 5" fill="none" />

      <g transform={`translate(0 ${f(e.nod * 10)}) rotate(${f(headRot)} 0 220)`}>
        {/* ears */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <path d={soft([T([sd * 132, -44]), T([sd * 166, -60]), T([sd * 172, 16]), T([sd * 150, 66]), T([sd * 130, 46])], 0.3)} fill={S.shade} stroke={INK} strokeWidth={3} />
            <path d={`M${f(tx(sd * 148))},-34 Q${f(tx(sd * 162))},6 ${f(tx(sd * 146))},40`} stroke={S.deep} strokeWidth={3} fill="none" />
          </g>
        ))}
        {/* silver hoop on screen-left ear */}
        <g transform={`translate(${f(tx(-150))} 62)`}>
          <circle cx={0} cy={12} r={13} fill="none" stroke={INK_DARK} strokeWidth={8} />
          <circle cx={0} cy={12} r={13} fill="none" stroke="#DCE1E8" strokeWidth={4.5} />
        </g>
        <path d={soft(face, 0.18)} fill={S.base} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <g clipPath={`url(#${id}-face)`}>
          <path d={soft(shade, 0.18)} fill={S.shade} />
          <path d={soft(beard, 0.12)} fill="#6B4632" opacity={0.28} />
          <path d={soft(beard, 0.12)} fill={`url(#${id}-stub)`} opacity={0.55} />
          {/* cheekbone planes */}
          <path d={soft([T([-128, 10]), T([-70, 30]), T([-118, 70])], 0.2)} fill={S.shade} opacity={0.7} />
          <path d={soft([T([-112, -14]), T([-66, -4]), T([-70, 12]), T([-108, 8])], 0.3)} fill={S.light} />
          {/* long nose */}
          <path d={soft([[fx * 1.25 + 4, -46], [fx * 1.35 + 28, 82], [fx * 1.35 + 30, 108], [fx * 1.35 + 4, 116], [fx * 1.3 + 10, 84]], 0.15)} fill={S.deep} opacity={0.55} />
          <path d={`M${f(fx * 1.25 - 6)},-40 L${f(fx * 1.32 - 10)},76`} stroke={S.light} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${f(fx * 1.35 - 26)},106 Q${f(fx * 1.35 - 10)},122 ${f(fx * 1.35 + 2)},114 Q${f(fx * 1.35 + 16)},122 ${f(fx * 1.35 + 30)},106`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d={`M${f(fx * 1.35 - 8)},92 l8,-10 l8,10 Z`} fill={S.light} />
          {/* mustache + soul patch */}
          <path d={soft([T([-50, 144]), T([0, 132]), T([50, 144]), T([40, 154]), T([0, 146]), T([-40, 154])], 0.3)} fill="#4A2E22" opacity={0.6} />
          <path d={soft([T([-10, 206 + jd]), T([10, 206 + jd]), T([0, 224 + jd])], 0.3)} fill="#4A2E22" opacity={0.6} />
          {/* forehead hard highlight */}
          <path d={`M${f(tx(-30))},-150 l18,-14 l18,14 l-18,14 Z`} fill={S.light} opacity={0.9} />
          {/* hairline shadow */}
          <path d={`M${f(tx(-140))},-120 L${f(tx(-110))},-190 L${f(tx(0))},-208 L${f(tx(110))},-190 L${f(tx(140))},-120 L${f(tx(140))},-80 L${f(tx(100))},-160 L${f(tx(0))},-180 L${f(tx(-100))},-160 L${f(tx(-140))},-80 Z`} fill={S.deep} opacity={0.45} />
          <ellipse cx={-90 + fx} cy={56} rx={34} ry={16} fill={S.blush} opacity={0.18 + e.cheek * 0.25} />
          <ellipse cx={90 + fx} cy={56} rx={34} ry={16} fill={S.blush} opacity={0.18 + e.cheek * 0.25} />
        </g>
        <CelEye id={`${id}-eL`} x={-66 + fx} y={-14} side={-1} w={82} h={13} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} iris="#3E2A20" irisDark="#1E120D" ink={INK_DARK} heavy={0.55} sx={1 + 0.1 * turn} />
        <CelEye id={`${id}-eR`} x={66 + fx} y={-14} side={1} w={82} h={13} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} iris="#3E2A20" irisDark="#1E120D" ink={INK_DARK} heavy={0.55} sx={1 - 0.1 * turn} />
        {tears > 0 && (
          <path d={`M${f(66 + fx)},4 q4,${f(36 * tears)} 1,${f(70 * tears)}`} stroke="#DDF1FF" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.85} />
        )}
        <CelBrow x={-70 + fx} y={-62} side={-1} len={124} thick={22} taper={0.7} raise={e.browL} inner={e.browIn} color="#0F0A0C" notch={S.base} angle={-2} sx={1 + 0.1 * turn} />
        <CelBrow x={70 + fx} y={-62} side={1} len={124} thick={22} taper={0.7} raise={e.browR} inner={e.browIn} color="#0F0A0C" notch={S.base} angle={-2} sx={1 - 0.1 * turn} />
        <CelMouth id={`${id}-m`} x={fx * 1.2} y={172 + jd * 0.2} hw={50} up={10} lo={15} open={open} smile={e.smile} wide={e.wide} lip={S.lip} lipDark={S.lipDark} ink={INK} />

        {/* curls: base cap, then individual spirals */}
        <path d={soft([T([-150, -100]), T([-156, -232]), T([-96, -306]), T([0, -332]), T([96, -306]), T([156, -232]), T([150, -100]), T([132, -150]), T([90, -196]), T([0, -210]), T([-90, -196]), T([-132, -150])], 0.15)} fill="#120D12" stroke={INK_DARK} strokeWidth={4} />
        {CURLS.map(([x, y, r], i) => {
          const bob = Math.sin(frame / 30 + i) * 0.8;
          const cx = tx(x);
          const cy = y + bob;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="#17121A" stroke={INK_DARK} strokeWidth={4} />
              <path d={`M${f(cx - r * 0.55)},${f(cy + r * 0.1)} A${f(r * 0.55)},${f(r * 0.55)} 0 1 1 ${f(cx + r * 0.2)},${f(cy + r * 0.45)} A${f(r * 0.3)},${f(r * 0.3)} 0 1 1 ${f(cx + r * 0.05)},${f(cy - r * 0.1)}`} stroke="#3B3346" strokeWidth={4} fill="none" strokeLinecap="round" />
              <path d={`M${f(cx - r * 0.75)},${f(cy - r * 0.2)} A${f(r * 0.8)},${f(r * 0.8)} 0 0 1 ${f(cx - r * 0.1)},${f(cy - r * 0.78)}`} stroke="#6A5E7C" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            </g>
          );
        })}
        {/* curl falling onto the forehead */}
        <g transform={`translate(${f(tx(-26))} ${f(-188 + Math.sin(frame / 25) * 2)})`}>
          <path d="M0,-20 C-14,0 -16,22 0,30 C16,36 22,18 10,10 C2,4 -6,14 2,20" stroke="#17121A" strokeWidth={10} fill="none" strokeLinecap="round" />
          <path d="M0,-20 C-14,0 -16,22 0,30" stroke="#6A5E7C" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
        {/* faded sides */}
        {[-1, 1].map((sd) => (
          <path key={sd} d={soft([T([sd * 132, -170]), T([sd * 142, -60]), T([sd * 136, -20]), T([sd * 126, -100])], 0.2)} fill="#1A1418" opacity={0.85} />
        ))}
      </g>
    </g>
  );
};

const TimurBody: React.FC<{outfit: TimurOutfit; breathe: number}> = ({outfit, breathe}) => {
  const sy = 1 + breathe * 0.012;
  const sh: Pt[] = [[-90, 540], [-240, 560], [-318, 620], [-340, 760], [-350, 1060], [350, 1060], [340, 760], [318, 620], [240, 560], [90, 540]];
  return (
    <g transform={`translate(0 540) scale(1 ${sy.toFixed(4)}) translate(0 -540)`}>
      {outfit === 'jacket' && (
        <>
          <path d={soft(sh, 0.12)} fill="#1C1A21" stroke={INK_DARK} strokeWidth={4} />
          <path d={soft([[-90, 530], [90, 530], [40, 700], [-40, 700]], 0.2)} fill="#0E0D11" />
          <path d={soft([[-92, 528], [-230, 560], [-170, 600], [-70, 760], [-40, 700]], 0.1)} fill="#2A2731" stroke={INK_DARK} strokeWidth={3} />
          <path d={soft([[92, 528], [230, 560], [170, 600], [70, 760], [40, 700]], 0.1)} fill="#2A2731" stroke={INK_DARK} strokeWidth={3} />
          <path d={soft([[160, 640], [318, 620], [340, 760], [350, 1060], [230, 1060], [200, 760]], 0.12)} fill="#121116" />
          <text x={-280} y={880} fontFamily={fonts.cond} fontWeight={700} fontSize={64} fill="#EDEAE6" opacity={0.85} transform="rotate(-6 -200 860)">
            ТИХО
          </text>
          <text x={-276} y={916} fontFamily={fonts.sans} fontWeight={800} fontSize={17} fill="#EDEAE6" opacity={0.8} letterSpacing="0.08em">
            ГРОМЧЕ ВСЕГО
          </text>
          <path d="M210,800 L222,850 L272,862 L222,874 L210,924 L198,874 L148,862 L198,850 Z" fill="#EDEAE6" opacity={0.85} />
        </>
      )}
      {outfit === 'tee' && (
        <>
          <path d={soft(sh, 0.12)} fill="#8F8D95" stroke={INK_DARK} strokeWidth={4} />
          <path d={soft([[150, 600], [318, 620], [340, 760], [350, 1060], [220, 1060], [190, 760]], 0.12)} fill="#75737C" />
          <path d="M-96,540 Q0,620 96,540" stroke="#6B6972" strokeWidth={10} fill="none" />
        </>
      )}
      {outfit === 'hoodie' && (
        <>
          <path d={soft(sh, 0.12)} fill="#24222A" stroke={INK_DARK} strokeWidth={4} />
          <path d={soft([[-170, 530], [170, 530], [140, 620], [0, 650], [-140, 620]], 0.3)} fill="#302D37" stroke={INK_DARK} strokeWidth={3} />
          <path d="M-36,640 L-40,780 M36,640 L40,780" stroke="#B9B6C0" strokeWidth={7} strokeLinecap="round" />
        </>
      )}
      {outfit === 'coat' && (
        <>
          <path d={soft(sh, 0.12)} fill="#16141A" stroke={INK_DARK} strokeWidth={4} />
          <path d={soft([[-110, 520], [110, 520], [150, 600], [0, 620], [-150, 600]], 0.3)} fill="#3C3846" stroke={INK_DARK} strokeWidth={3} />
          <path d="M-60,620 L-90,1060 M60,620 L90,1060" stroke="#0A090C" strokeWidth={5} />
        </>
      )}
    </g>
  );
};
