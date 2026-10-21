// Мира. Long glossy dark hair tucked behind the ears, side part, angular "lightning"
// highlights; lime cat-eye sunglasses; gold hoops and collar. Head centre at (0,0).
import React from 'react';
import {blink, clamp, fbm} from '../lib/anim';
import {INK, INK_DARK, P, SKIN} from '../lib/design';
import {Expr} from './expr';
import {CelBrow, CelEye, CelMouth, Pt, soft} from './cel';

export type MiraOutfit = 'lilac' | 'hoodie' | 'coat';
export type Glasses = 'lime' | 'dark' | 'none';

const S = SKIN.mira;
const HAIR = {base: '#3A2721', shade: '#22150F', mid: '#5A3E31', light: '#8C6650', spark: '#C49A7C'};
const f = (n: number) => n.toFixed(1);

export const Mira: React.FC<{
  id: string;
  frame: number;
  e: Expr;
  talk?: number;
  outfit?: MiraOutfit;
  glasses?: Glasses;
  glassesLift?: number; // 0 on the face .. 1 lifted off
  cloudy?: number;
  tears?: number;
  body?: boolean;
}> = ({id, frame, e, talk = 0, outfit = 'lilac', glasses = 'lime', glassesLift = 0, cloudy = 0, tears = 0, body = true}) => {
  const b = blink(frame, 7);
  const lid = clamp(e.lid + b * (1 - e.lid), -0.4, 1);
  const open = clamp(e.open + talk * 0.85, 0, 1.15);
  const jd = open * 16;
  const turn = e.turn;
  const tx = (x: number) => x * (1 - 0.13 * turn * Math.sign(x)) + turn * 22;
  const T = (p: Pt): Pt => [tx(p[0]), p[1]];
  const sway = fbm(frame / 95, 2) * 1.8;
  const headRot = e.tilt + sway;
  const breathe = Math.sin(frame / 40) * 0.5 + 0.5;
  const fx = turn * 30;
  // hair secondary motion lags behind the head
  const lag = fbm((frame - 8) / 95, 2) * 1.8 + e.tilt * 0.6;
  const hs = (y: number) => (y > 0 ? -lag * (y / 600) * 26 : 0);
  const H = (p: Pt): Pt => [tx(p[0]) + hs(p[1]), p[1]];

  const face: Pt[] = [[-98, -206], [98, -206], [142, -122], [154, -10], [134, 92], [80, 172], [0, 208 + jd], [-80, 172], [-134, 92], [-154, -10], [-142, -122]].map((p) => T(p as Pt));
  const faceShade: Pt[] = [[80, -206], [142, -122], [154, -10], [134, 92], [80, 172], [0, 208 + jd], [36, 160], [80, 96], [100, 0], [96, -120]].map((p) => T(p as Pt));

  // --- hair geometry (part slightly right of centre)
  const backMass: Pt[] = [[-16, -322], [120, -300], [186, -220], [206, -70], [214, 140], [226, 420], [236, 640], [150, 700], [0, 690], [-150, 700], [-236, 640], [-226, 420], [-214, 140], [-206, -70], [-186, -220], [-120, -300]];
  const cap: Pt[] = [[-204, -30], [-200, -170], [-154, -262], [-70, -314], [24, -324], [118, -302], [184, -238], [204, -120], [204, -30], [176, -30], [160, -96], [142, -156], [96, -200], [34, -220], [-18, -206], [-88, -196], [-138, -160], [-160, -96], [-176, -30]];
  const panelL: Pt[] = [[-176, -40], [-192, 40], [-180, 150], [-172, 300], [-180, 470], [-168, 640], [-150, 760], [-200, 702], [-226, 760], [-240, 600], [-242, 420], [-232, 220], [-218, 40], [-204, -40]];
  const panelR: Pt[] = [[176, -40], [192, 40], [182, 150], [178, 300], [190, 450], [182, 600], [160, 700], [210, 662], [232, 720], [244, 560], [244, 380], [232, 200], [220, 30], [204, -40]];
  const zig = (pts: Pt[]) => soft(pts.map(H), 0.08);
  const sparkL: Pt[] = [[-196, -150], [-160, -232], [-150, -200], [-112, -268], [-112, -230], [-70, -288], [-84, -246], [-120, -206], [-128, -230], [-160, -176]];
  const sparkR: Pt[] = [[60, -300], [120, -286], [104, -270], [160, -244], [140, -232], [186, -196], [150, -204], [110, -240], [118, -256], [70, -282]];

  const lensL: Pt[] = [[-188, -76], [-26, -54], [-20, -2], [-50, 36], [-136, 36], [-170, -6]];
  const lensR: Pt[] = lensL.map(([x, y]) => [-x, y] as Pt);
  const gl = glasses !== 'none' && glassesLift < 1;
  const gLift = glassesLift;

  return (
    <g>
      <defs>
        <clipPath id={`${id}-face`}>
          <path d={soft(face, 0.22)} />
        </clipPath>
        <clipPath id={`${id}-lens`}>
          <path d={soft(lensL.map((p) => [p[0] + fx, p[1]] as Pt), 0.2)} />
          <path d={soft(lensR.map((p) => [p[0] + fx, p[1]] as Pt), 0.2)} />
        </clipPath>
        <linearGradient id={`${id}-lg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={glasses === 'dark' ? '#121015' : '#2B2150'} />
          <stop offset="1" stopColor={glasses === 'dark' ? '#2A2630' : '#4A3C7E'} />
        </linearGradient>
      </defs>

      {/* back hair */}
      <g transform={`rotate(${f(headRot * 0.35)} 0 200)`}>
        <path d={zig(backMass)} fill={HAIR.shade} stroke={INK_DARK} strokeWidth={4} strokeLinejoin="round" />
      </g>

      {body && <MiraBody id={id} outfit={outfit} breathe={breathe} />}

      {/* neck */}
      <path d={soft([[-50, 120], [50, 120], [58, 300], [74, 360], [-74, 360], [-58, 300]], 0.15)} fill={S.base} stroke={INK} strokeWidth={3} />
      <path d={soft([[-50, 150], [52, 150], [56, 236], [0, 262], [-54, 234]], 0.25)} fill={S.shade} />
      {outfit !== 'coat' && <Collar />}

      <g transform={`translate(0 ${f(e.nod * 10)}) rotate(${f(headRot)} 0 190)`}>
        {/* ears + hoops */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <path d={soft([T([sd * 146, -40]), T([sd * 178, -50]), T([sd * 182, 20]), T([sd * 160, 70]), T([sd * 140, 50])], 0.3)} fill={S.shade} stroke={INK} strokeWidth={3} />
            <path d={`M${f(tx(sd * 160))},-28 Q${f(tx(sd * 176))},10 ${f(tx(sd * 158))},44`} stroke={S.deep} strokeWidth={3} fill="none" />
          </g>
        ))}
        <path d={soft(face, 0.22)} fill={S.base} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <g clipPath={`url(#${id}-face)`}>
          <path d={soft(faceShade, 0.2)} fill={S.shade} />
          {/* cheekbone + forehead hard highlights */}
          <path d={soft([T([-118, -2]), T([-70, -14]), T([-62, 4]), T([-110, 22])], 0.3)} fill={S.light} opacity={0.85} />
          <path d={`M${f(tx(-24))},-162 l14,-16 l14,16 l-14,16 Z`} fill={S.light} />
          <path d={`M${f(tx(14))},-184 l7,-8 l7,8 l-7,8 Z`} fill={S.light} opacity={0.7} />
          {/* blush */}
          <ellipse cx={-96 + fx} cy={62 - e.cheek * 6} rx={42} ry={20} fill={S.blush} opacity={0.22 + e.cheek * 0.25} />
          <ellipse cx={96 + fx} cy={62 - e.cheek * 6} rx={42} ry={20} fill={S.blush} opacity={0.22 + e.cheek * 0.25} />
          {/* nose */}
          <path d={soft([[fx * 1.25 + 2, -30], [fx * 1.3 + 22, 52], [fx * 1.3 + 26, 70], [fx * 1.3 + 4, 76], [fx * 1.3 + 8, 52]], 0.2)} fill={S.deep} opacity={0.5} />
          <path d={`M${f(fx * 1.3 - 20)},72 Q${f(fx * 1.3 - 6)},84 ${f(fx * 1.3 + 4)},76 Q${f(fx * 1.3 + 14)},84 ${f(fx * 1.3 + 24)},72`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d={`M${f(fx * 1.3 - 6)},50 l6,-10 l6,10 Z`} fill={S.light} />
          {/* hairline shadow */}
          <path d={soft(cap.slice(9).map(T).concat([T([-176, -60]), T([-176, -120]), T([0, -260]), T([176, -120])]), 0.1)} fill={S.deep} opacity={0.0} />
          <path d={`M${f(tx(-170))},-90 L${f(tx(-140))},-150 L${f(tx(-90))},-186 L${f(tx(-18))},-196 L${f(tx(34))},-210 L${f(tx(96))},-190 L${f(tx(142))},-146 L${f(tx(166))},-90 L${f(tx(166))},-60 L${f(tx(134))},-120 L${f(tx(92))},-170 L${f(tx(34))},-188 L${f(tx(-18))},-178 L${f(tx(-86))},-170 L${f(tx(-134))},-130 L${f(tx(-168))},-60 Z`} fill={S.deep} opacity={0.35} />
        </g>

        {/* eyes (seen when the glasses come off) */}
        {(!gl || gLift > 0) && (
          <g opacity={gl ? clamp(gLift * 2) : 1}>
            <CelEye id={`${id}-eL`} x={-74 + fx} y={-8} side={-1} w={86} h={17} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} iris="#7A4A2C" irisDark="#3B2014" ink={INK_DARK} wing={14} cloudy={cloudy} sx={1 + 0.1 * turn} />
            <CelEye id={`${id}-eR`} x={74 + fx} y={-8} side={1} w={86} h={17} lid={lid} squint={e.squint} gazeX={e.gazeX} gazeY={e.gazeY} iris="#7A4A2C" irisDark="#3B2014" ink={INK_DARK} wing={14} cloudy={cloudy} sx={1 - 0.1 * turn} />
            {tears > 0 &&
              [-1, 1].map((sd) => (
                <path key={sd} d={`M${f(sd * 70 + fx)},14 q${sd * 4},${f(30 * tears)} ${sd * 2},${f(60 * tears)}`} stroke="#DDF1FF" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.85} />
              ))}
          </g>
        )}
        <CelBrow x={-78 + fx} y={-90} side={-1} len={112} thick={17} raise={e.browL} inner={e.browIn} color="#24140F" sx={1 + 0.1 * turn} />
        <CelBrow x={78 + fx} y={-90} side={1} len={112} thick={17} raise={e.browR} inner={e.browIn} color="#24140F" sx={1 - 0.1 * turn} />
        <CelMouth id={`${id}-m`} x={fx * 1.15} y={130 + jd * 0.2} hw={58} up={12} lo={16} open={open} smile={e.smile} wide={e.wide} lip={S.lip} lipDark={S.lipDark} ink={INK} />

        {/* sunglasses */}
        {gl && (
          <g transform={`translate(${f(fx)} ${f(-gLift * 220)}) rotate(${f(-gLift * 12)})`} opacity={1 - clamp((gLift - 0.7) / 0.3)}>
            {glasses === 'lime' ? (
              <>
                <path d={soft(lensL, 0.2)} fill={`url(#${id}-lg)`} stroke={P.lime} strokeWidth={17} strokeLinejoin="round" />
                <path d={soft(lensR, 0.2)} fill={`url(#${id}-lg)`} stroke={P.lime} strokeWidth={17} strokeLinejoin="round" />
                <path d={soft(lensL, 0.2)} fill="none" stroke={P.limeDeep} strokeWidth={3} transform="translate(0 5)" opacity={0.7} />
                <path d={soft(lensR, 0.2)} fill="none" stroke={P.limeDeep} strokeWidth={3} transform="translate(0 5)" opacity={0.7} />
                <path d="M-22,-40 Q0,-56 22,-40" stroke={P.lime} strokeWidth={12} fill="none" />
                <g clipPath={`url(#${id}-lens)`} transform={`translate(${f(-fx)} 0)`}>
                  {[0, 1].map((k) => (
                    <path key={k} d={`M${-150 + k * 34},40 L${-110 + k * 34},-60 L${-96 + k * 34},-60 L${-136 + k * 34},40 Z M${50 + k * 34},40 L${90 + k * 34},-60 L${104 + k * 34},-60 L${64 + k * 34},40 Z`} fill={k ? '#D9F57A' : '#fff'} opacity={k ? 0.35 : 0.5} transform={`translate(${f(fx)} 0)`} />
                  ))}
                </g>
                <path d="M-188,-76 L-214,-98 L-176,-60 Z M188,-76 L214,-98 L176,-60 Z" fill={P.lime} />
              </>
            ) : (
              <>
                <circle cx={-70} cy={-6} r={52} fill={`url(#${id}-lg)`} stroke="#0B0A0D" strokeWidth={9} />
                <circle cx={70} cy={-6} r={52} fill={`url(#${id}-lg)`} stroke="#0B0A0D" strokeWidth={9} />
                <path d="M-20,-14 Q0,-26 20,-14" stroke="#0B0A0D" strokeWidth={8} fill="none" />
                <path d="M-96,-34 L-78,-50 L-74,-44 Z M44,-34 L62,-50 L66,-44 Z" fill="#fff" opacity={0.35} />
              </>
            )}
          </g>
        )}

        {/* hair: silhouette outline drawn once under the fills, so the pieces read as one mass */}
        <g stroke={INK_DARK} strokeWidth={9} strokeLinejoin="round" fill={INK_DARK}>
          <path d={zig(panelR)} />
          <path d={zig(panelL)} />
          <path d={zig(cap)} />
        </g>
        <g fill={HAIR.base}>
          <path d={zig(panelR)} />
          <path d={zig(panelL)} />
          <path d={zig(cap)} />
        </g>
        {/* inner shade where the hair turns away from the face */}
        <path d={zig([[-176, -36], [-190, 40], [-178, 150], [-170, 300], [-176, 460], [-196, 300], [-204, 120], [-204, -20]])} fill={HAIR.shade} opacity={0.75} />
        <path d={zig([[176, -36], [190, 40], [180, 150], [176, 300], [186, 440], [204, 300], [210, 120], [204, -20]])} fill={HAIR.shade} opacity={0.75} />
        <path d={zig([[-200, 120], [-206, 300], [-214, 480], [-206, 640], [-222, 560], [-230, 400], [-224, 220]])} fill={HAIR.mid} opacity={0.9} />
        <path d={zig([[214, 110], [212, 290], [220, 470], [228, 600], [236, 470], [236, 300], [226, 140]])} fill={HAIR.mid} opacity={0.8} />
        <path d={zig([[-226, 180], [-224, 330], [-230, 500], [-220, 360]])} fill={HAIR.spark} opacity={0.6} />
        <path d={zig([[34, -222], [-18, -208], [-88, -198], [-138, -162], [-160, -98], [-176, -32], [-190, -30], [-182, -120], [-148, -196], [-80, -236], [10, -252]])} fill={HAIR.shade} opacity={0.6} />
        {/* swept lock from the part across the forehead corner */}
        <path d={zig([[36, -226], [-40, -216], [-112, -188], [-160, -126], [-184, -40], [-162, -60], [-142, -118], [-100, -164], [-36, -192], [24, -204]])} fill={HAIR.base} stroke={INK_DARK} strokeWidth={4} strokeLinejoin="round" />
        <path d={zig([[-20, -212], [-96, -190], [-146, -138], [-128, -150], [-80, -182]])} fill={HAIR.light} opacity={0.9} />
        <path d={zig(sparkL)} fill={HAIR.light} />
        <path d={zig(sparkR)} fill={HAIR.light} />
        <path d={zig([[-130, -236], [-108, -262], [-104, -246], [-90, -264], [-96, -236]])} fill={HAIR.spark} />
        <path d={zig([[110, -270], [140, -254], [130, -248], [152, -230], [128, -236]])} fill={HAIR.spark} />
        {/* part line */}
        <path d={`M${f(tx(34))},-222 L${f(tx(30))},-300`} stroke={INK_DARK} strokeWidth={3} opacity={0.8} />
        {/* gold hoops (hang in front of the hair) */}
        {[-1, 1].map((sd) => {
          const swing = Math.sin(frame / 22 + sd) * 4 + lag * 3;
          return (
            <g key={sd} transform={`translate(${f(tx(sd * 166))} 64) rotate(${f(swing)})`}>
              <circle cx={0} cy={42} r={40} fill="none" stroke={INK_DARK} strokeWidth={13} />
              <circle cx={0} cy={42} r={40} fill="none" stroke={P.gold} strokeWidth={8} />
              <path d={`M${-sd * 30},14 A40,40 0 0 ${sd > 0 ? 0 : 1} ${-sd * 38},52`} stroke="#FFF1C2" strokeWidth={3.5} fill="none" />
            </g>
          );
        })}
      </g>
    </g>
  );
};

const Collar: React.FC = () => (
  <g>
    <path d="M-70,300 Q0,368 70,300 L76,322 Q0,396 -76,322 Z" fill={P.gold} stroke={INK} strokeWidth={3} />
    {[-48, -16, 16, 48].map((x, i) => (
      <path key={i} d={`M${x - 6},${318 + Math.abs(x) * -0.25 + 22} l10,-14 l8,4 l-10,14 Z`} fill="#FFE59A" />
    ))}
    <path d="M-60,318 Q0,370 60,318" stroke={P.goldDeep} strokeWidth={3} fill="none" />
  </g>
);

const MiraBody: React.FC<{id: string; outfit: MiraOutfit; breathe: number}> = ({outfit, breathe}) => {
  const S2 = SKIN.mira;
  const sy = 1 + breathe * 0.012;
  const shoulders: Pt[] = [[-74, 340], [-210, 372], [-268, 430], [-286, 560], [-296, 860], [296, 860], [286, 560], [268, 430], [210, 372], [74, 340]];
  return (
    <g transform={`translate(0 340) scale(1 ${sy.toFixed(4)}) translate(0 -340)`}>
      {outfit === 'lilac' && (
        <>
          <path d={soft(shoulders, 0.15)} fill={S2.base} stroke={INK} strokeWidth={3.5} />
          <path d={soft([[120, 360], [210, 372], [268, 430], [286, 560], [200, 560], [150, 440]], 0.2)} fill={S2.shade} />
          <path d="M-60,420 Q-110,410 -160,430 M60,420 Q110,410 160,430" stroke={S2.deep} strokeWidth={3} fill="none" />
          <path d={soft([[-296, 520], [-120, 480], [0, 500], [120, 480], [296, 520], [300, 870], [-300, 870]], 0.12)} fill={P.lilac} stroke={INK} strokeWidth={3.5} />
          <path d={soft([[90, 486], [296, 520], [300, 870], [170, 870], [150, 640]], 0.12)} fill={P.lilacDeep} />
          <path d={soft([[-250, 540], [-140, 520], [-180, 560]], 0.2)} fill={P.lilacPale} />
          <path d="M-60,600 L-40,860 M40,610 L70,860" stroke={P.lilacDeep} strokeWidth={4} opacity={0.6} />
        </>
      )}
      {outfit === 'hoodie' && (
        <>
          <path d={soft(shoulders, 0.15)} fill="#EFE3D2" stroke={INK} strokeWidth={3.5} />
          <path d={soft([[100, 370], [210, 372], [268, 430], [286, 560], [296, 860], [180, 860], [150, 500]], 0.15)} fill="#D2C2AC" />
          <path d={soft([[-140, 330], [140, 330], [120, 420], [0, 450], [-120, 420]], 0.3)} fill="#E2D3BE" stroke={INK} strokeWidth={3} />
          <path d="M-30,440 L-34,560 M30,440 L34,560" stroke="#A9977F" strokeWidth={6} strokeLinecap="round" />
        </>
      )}
      {outfit === 'coat' && (
        <>
          <path d={soft(shoulders, 0.15)} fill="#4A2E4C" stroke={INK} strokeWidth={3.5} />
          <path d={soft([[100, 370], [210, 372], [268, 430], [286, 560], [296, 860], [170, 860], [140, 520]], 0.15)} fill="#36203A" />
          {/* lilac scarf */}
          <path d={soft([[-110, 300], [110, 300], [130, 380], [40, 430], [70, 640], [10, 650], [-10, 430], [-130, 380]], 0.2)} fill={P.lilac} stroke={INK} strokeWidth={3.5} />
          <path d={soft([[30, 420], [70, 640], [40, 646], [10, 440]], 0.2)} fill={P.lilacDeep} />
          <path d="M-150,520 L-120,860 M150,520 L120,860" stroke="#2A1A2C" strokeWidth={5} />
        </>
      )}
    </g>
  );
};
