import React from 'react';
import {AbsoluteFill, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';

/* Логотип frht.work в стилистике моушн-дизайна Apple:
   плавные expo-кривые, размытие → резкость, свет, глубина. */

const FAM = 'IDLogo';
if (typeof document !== 'undefined') {
  const h = delayRender('logo fonts');
  Promise.all(
    (
      [
        ['InterDisplay-ExtraBold.otf', '800'],
        ['InterDisplay-Light.otf', '300'],
        ['InterDisplay-Medium.otf', '500'],
      ] as const
    ).map(([f, w]) => new FontFace(FAM, `url(${staticFile('fonts/' + f)})`, {weight: w}).load().then((x) => document.fonts.add(x))),
  )
    .then(() => continueRender(h))
    .catch(() => continueRender(h));
}

const WINE = '#7B0A2A';
const WINE_HI = '#C4144A';
const WINE_DK = '#3A0513';
const ROSE = '#FF7AA0';

const C = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const EXPO = Easing.bezier(0.16, 1, 0.3, 1); // «эппловская» плавность
const SMOOTH = Easing.bezier(0.65, 0, 0.35, 1);
const kf = (t: number, ts: number[], vs: number[], e = SMOOTH) => interpolate(t, ts, vs, {...C, easing: e});

const FS = 260;
const LS_B = -0.04 * FS;
const LS_L = -0.012 * FS;

const measure = (txt: string, weight: number) => {
  if (typeof document === 'undefined') return txt.length * FS * 0.55;
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `${weight} ${FS}px ${FAM}`;
  return c.measureText(txt).width;
};

type Layout = {
  bold: {ch: string; x: number}[];
  light: {ch: string; x: number}[];
  dot: {x: number; y: number; r: number};
  base: number;
  total: number;
  x0: number;
};
const useLayout = (): Layout =>
  React.useMemo(() => {
    const B = 'frht';
    const Lt = 'work';
    const pre = (s: string, w: number, ls: number) => s.split('').map((_, i) => measure(s.slice(0, i), w) + i * ls);
    const wB = measure(B, 800) + LS_B * (B.length - 1);
    const wL = measure(Lt, 300) + LS_L * (Lt.length - 1);
    const r = FS * 0.095;
    const gap = FS * 0.05;
    const total = wB + gap + r * 2 + gap + wL;
    const x0 = 960 - total / 2;
    const base = 540 + FS * 0.36;
    return {
      bold: B.split('').map((ch, i) => ({ch, x: x0 + pre(B, 800, LS_B)[i]})),
      light: Lt.split('').map((ch, i) => ({ch, x: x0 + wB + gap * 2 + r * 2 + pre(Lt, 300, LS_L)[i]})),
      dot: {x: x0 + wB + gap + r, y: base - r, r},
      base,
      total,
      x0,
    };
  }, []);

// эллипс орбиты
const ell = (L: Layout) => ({cx: 960 - L.total * 0.012, cy: 540, a: L.total * 0.475, b: FS * 0.57, rot: (-18.5 * Math.PI) / 180});
const pt = (E: ReturnType<typeof ell>, th: number) => {
  const u = [Math.cos(E.rot), Math.sin(E.rot)];
  const v = [-u[1], u[0]];
  return [E.cx + E.a * Math.cos(th) * u[0] + E.b * Math.sin(th) * v[0], E.cy + E.a * Math.cos(th) * u[1] + E.b * Math.sin(th) * v[1]];
};
const arc = (E: ReturnType<typeof ell>, t0: number, t1: number) => {
  let d = '';
  for (let i = 0; i <= 160; i++) {
    const p = pt(E, t0 + ((t1 - t0) * i) / 160);
    d += `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  }
  return d;
};

const Aura: React.FC<{t: number; o: number}> = ({t, o}) => {
  const blobs = [
    {c: WINE_HI, r: 640, sp: 0.011, ph: 0, ax: 300, ay: 50},
    {c: '#E0457A', r: 460, sp: 0.014, ph: 2.1, ax: 320, ay: 60},
    {c: '#9B1B5A', r: 560, sp: 0.009, ph: 4.0, ax: 360, ay: 45},
    {c: '#5B1690', r: 420, sp: 0.012, ph: 5.3, ax: 280, ay: 55},
  ];
  return (
    <AbsoluteFill style={{opacity: o, filter: 'blur(120px)', mixBlendMode: 'screen'}}>
      {blobs.map((b, i) => {
        const x = 960 + Math.cos(t * b.sp + b.ph) * b.ax - b.r / 2;
        const y = 540 + Math.sin(t * b.sp * 1.3 + b.ph) * b.ay - b.r / 2;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: b.r, height: b.r * 0.62, borderRadius: '50%', background: b.c, opacity: 0.42}} />;
      })}
    </AbsoluteFill>
  );
};

export const LogoScene: React.FC<{wineBg: string}> = ({wineBg}) => {
  const t = useCurrentFrame();
  const L = useLayout();
  const E = ell(L);

  /* 0–24: карточка «Creative Partner» сжимается в точку */
  const m = kf(t, [0, 24], [0, 1], Easing.bezier(0.7, 0, 0.2, 1));
  const cardW = interpolate(m, [0, 1], [1920, 40]);
  const cardH = interpolate(m, [0, 1], [1080, 40]);
  const cardR = interpolate(m, [0, 0.6, 1], [0, 60, 20]);
  const cardTxt = kf(t, [0, 10], [1, 0]);

  /* точка: дыхание → старт орбиты → рисует кольцо → летит в «.» */
  const breathe = 1 + 0.18 * Math.sin(kf(t, [24, 40], [0, Math.PI], Easing.inOut(Easing.sin)));
  const startP = pt(E, Math.PI);
  const toStart = kf(t, [36, 48], [0, 1]);
  const ringP = kf(t, [46, 110], [0, 1], Easing.bezier(0.45, 0, 0.25, 1));
  const headTh = Math.PI + ringP * Math.PI * 2;
  const head = pt(E, headTh);
  const glide = kf(t, [110, 134], [0, 1], EXPO);
  const ctrl = [(startP[0] + L.dot.x) / 2, Math.min(startP[1], L.dot.y) - 220];
  const qb = (a: number, b: number, c: number, s: number) => (1 - s) * (1 - s) * a + 2 * (1 - s) * s * b + s * s * c;
  let dx = 960;
  let dy = 540;
  let dr = 20;
  if (t >= 24 && t < 48) {
    dx = interpolate(toStart, [0, 1], [960, startP[0]]);
    dy = interpolate(toStart, [0, 1], [540, startP[1]]);
    dr = 20 * breathe * interpolate(toStart, [0, 1], [1, 0.7]);
  } else if (t >= 48 && t < 110) {
    dx = head[0];
    dy = head[1];
    dr = 14;
  } else if (t >= 110) {
    dx = qb(startP[0], ctrl[0], L.dot.x, glide);
    dy = qb(startP[1], ctrl[1], L.dot.y, glide);
    dr = interpolate(glide, [0, 1], [14, L.dot.r]);
  }

  /* кольцо */
  const back = Math.min(1, ringP * 2);
  const front = Math.max(0, ringP * 2 - 1);
  const backD = arc(E, Math.PI, Math.PI * 2);
  const frontD = arc(E, 0, Math.PI);
  // бегущий блик по орбите после прорисовки
  const q = t > 110 ? ((t - 110) / 140) % 1 : -1;
  const segL = 0.1;
  const ringFade = kf(t, [46, 70], [0, 1]);

  /* звезда на правом конце орбиты */
  const sp = pt(E, 0.06);
  const star = kf(t, [76, 104], [0, 1], EXPO);
  const starRot = interpolate(star, [0, 1], [-45, 0]);
  const twinkle = t > 104 ? 1 + 0.06 * Math.sin((t - 104) / 9) : 1;
  const flareLine = kf(t, [76, 90, 160], [0, 1, 0.35]);

  /* буквы */
  const letter = (start: number) => {
    const p = kf(t, [start, start + 30], [0, 1], EXPO);
    return {p, blur: (1 - p) * 24, y: (1 - p) * 70, s: 0.9 + 0.1 * p};
  };
  const track = (i: number, n: number, p: number) => (i - (n - 1) / 2) * 34 * (1 - p);

  /* свет по тексту */
  const sheen = kf(t, [138, 196], [L.x0 - 500, L.x0 + L.total + 500], Easing.inOut(Easing.cubic));

  /* камера */
  const cam = kf(t, [24, 160], [1.12, 1], EXPO) * kf(t, [160, 220], [1, 1.025], Easing.linear);
  const camY = kf(t, [24, 160], [24, 0], EXPO);
  const aura = kf(t, [60, 150], [0, 1]) * kf(t, [200, 220], [1, 0]);
  const fadeOut = kf(t, [204, 220], [0, 1]);
  const endBlur = kf(t, [204, 220], [0, 12]);

  const dotFill = 'url(#dotG)';
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(123,10,42,0.28), transparent 70%)', opacity: kf(t, [20, 80], [0, 1])}} />
      <Aura t={t} o={aura * 0.75} />
      <AbsoluteFill style={{transform: `translateY(${camY}px) scale(${cam})`, filter: endBlur > 0.1 ? `blur(${endBlur}px)` : undefined}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <linearGradient id="ringG" gradientUnits="userSpaceOnUse" x1={E.cx - E.a} y1={E.cy + 120} x2={E.cx + E.a} y2={E.cy - 120}>
              <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
              <stop offset="45%" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="80%" stopColor="#FFD0DC" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="txtB" gradientUnits="userSpaceOnUse" x1={sheen - 380} y1={0} x2={sheen + 380} y2={0}>
              <stop offset="0%" stopColor="#F4EDEF" />
              <stop offset="44%" stopColor="#F4EDEF" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="53%" stopColor="#FFC4D3" />
              <stop offset="58%" stopColor="#F4EDEF" />
              <stop offset="100%" stopColor="#F4EDEF" />
            </linearGradient>
            <linearGradient id="txtL" gradientUnits="userSpaceOnUse" x1={sheen - 380} y1={0} x2={sheen + 380} y2={0}>
              <stop offset="0%" stopColor="#D8CCD0" />
              <stop offset="44%" stopColor="#D8CCD0" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="56%" stopColor="#D8CCD0" />
              <stop offset="100%" stopColor="#D8CCD0" />
            </linearGradient>
            <radialGradient id="dotG" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FF9AB6" />
              <stop offset="45%" stopColor={WINE_HI} />
              <stop offset="100%" stopColor={WINE_DK} />
            </radialGradient>
            <radialGradient id="starGlow">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#FFC4D3" stopOpacity="0.45" />
              <stop offset="100%" stopColor={WINE_HI} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="flare" x1="0" x2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* задняя дуга орбиты (за текстом) */}
          <g opacity={ringFade}>
            <path d={backD} fill="none" stroke={ROSE} strokeOpacity={0.5} strokeWidth={14} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - back} style={{filter: 'blur(10px)'}} />
            <path d={backD} fill="none" stroke="url(#ringG)" strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - back} />
            {q >= 0 && q < 0.5 && (
              <path d={backD} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={`${segL} 2`} strokeDashoffset={-(q * 2)} style={{filter: 'blur(2px)'}} />
            )}
          </g>

          {/* frht */}
          <g style={{filter: 'drop-shadow(0 0 40px rgba(196,20,74,0.35))'}}>
            {L.bold.map((c, i) => {
              const a = letter(62 + i * 7);
              return (
                <text
                  key={i}
                  x={c.x + track(i, 4, a.p)}
                  y={L.base + a.y}
                  fontFamily={FAM}
                  fontWeight={800}
                  fontSize={FS}
                  fill="url(#txtB)"
                  opacity={a.p}
                  style={{filter: a.blur > 0.2 ? `blur(${a.blur}px)` : undefined, transformBox: 'fill-box', transformOrigin: '50% 100%', transform: `scale(${a.s})`}}
                >
                  {c.ch}
                </text>
              );
            })}
            {/* work */}
            {L.light.map((c, i) => {
              const a = letter(120 + i * 5);
              return (
                <text
                  key={i}
                  x={c.x - (1 - a.p) * 40}
                  y={L.base}
                  fontFamily={FAM}
                  fontWeight={300}
                  fontSize={FS}
                  fill="url(#txtL)"
                  opacity={a.p}
                  style={{filter: a.blur > 0.2 ? `blur(${a.blur * 0.7}px)` : undefined}}
                >
                  {c.ch}
                </text>
              );
            })}
          </g>

          {/* передняя дуга орбиты (перед текстом) */}
          <g opacity={ringFade}>
            <path d={frontD} fill="none" stroke={ROSE} strokeOpacity={0.5} strokeWidth={14} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - front} style={{filter: 'blur(10px)'}} />
            <path d={frontD} fill="none" stroke="url(#ringG)" strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - front} />
            {q >= 0.5 && (
              <path d={frontD} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={`${segL} 2`} strokeDashoffset={-(q * 2 - 1)} style={{filter: 'blur(2px)'}} />
            )}
          </g>

          {/* звезда */}
          {star > 0 && (
            <g transform={`translate(${sp[0]} ${sp[1]})`}>
              <rect x={-420 * star} y={-1.5} width={840 * star} height={3} fill="url(#flare)" opacity={flareLine} />
              <circle r={120 * star * twinkle} fill="url(#starGlow)" />
              <g transform={`rotate(${starRot}) scale(${star * twinkle})`}>
                <path d="M0 -92 C 4 -20, 20 -4, 92 0 C 20 4, 4 20, 0 92 C -4 20, -20 4, -92 0 C -20 -4, -4 -20, 0 -92 Z" fill="#fff" />
              </g>
              <circle r={6 * star} fill="#fff" />
            </g>
          )}

          {/* точка / комета */}
          {t >= 24 && (
            <g>
              <circle cx={dx} cy={dy} r={dr * 3.2} fill={WINE_HI} opacity={0.35} style={{filter: 'blur(14px)'}} />
              <circle cx={dx} cy={dy} r={dr} fill={dotFill} />
              <circle cx={dx - dr * 0.3} cy={dy - dr * 0.35} r={dr * 0.28} fill="#fff" opacity={0.55} style={{filter: 'blur(1.5px)'}} />
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* карточка «Creative Partner», сжимающаяся в точку */}
      {t < 26 && (
        <div
          style={{
            position: 'absolute',
            left: 960 - cardW / 2,
            top: 540 - cardH / 2,
            width: cardW,
            height: cardH,
            borderRadius: cardR,
            background: m > 0.85 ? `radial-gradient(circle at 35% 30%, #FF9AB6, ${WINE_HI} 45%, ${WINE_DK})` : wineBg,
            overflow: 'hidden',
            boxShadow: `0 0 ${60 * m}px rgba(196,20,74,${0.6 * m})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'HN',
              fontSize: 150,
              color: '#fff',
              letterSpacing: -4.8,
              whiteSpace: 'nowrap',
              opacity: cardTxt,
              filter: `blur(${(1 - cardTxt) * 12}px)`,
              transform: `scale(${1 - m * 0.3})`,
            }}
          >
            Creative Partner
          </div>
        </div>
      )}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)'}} />
      <AbsoluteFill style={{background: '#000', opacity: fadeOut}} />
    </AbsoluteFill>
  );
};
