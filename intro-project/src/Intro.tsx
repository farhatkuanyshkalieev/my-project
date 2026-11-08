import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {BUST_H, BUST_HEAD, BUST_NECK, BUST_PATH, BUST_W} from './bust';
import {LogoScene} from './Logo';

/* ================= Шрифты (Helvetica-клон Nimbus Sans) ================= */
const HN = 'HN';
if (typeof document !== 'undefined') {
  const h = delayRender('fonts');
  Promise.all(
    (
      [
        ['NimbusSans-Regular.otf', '400'],
        ['NimbusSans-Bold.otf', '700'],
      ] as const
    ).map(([file, weight]) =>
      new FontFace(HN, `url(${staticFile('fonts/' + file)})`, {weight}).load().then((f) => document.fonts.add(f)),
    ),
  )
    .then(() => continueRender(h))
    .catch((e) => {
      console.error(e);
      continueRender(h);
    });
}

/* ================= Палитра: глубокий винный ================= */
const WINE = '#7B0A2A';
const WINE_HI = '#C4144A';
const WINE_DK = '#3A0513';
const WINE_BG = `radial-gradient(ellipse 85% 95% at 50% 45%, #A8153F 0%, ${WINE} 50%, ${WINE_DK} 100%)`;
const GLOW = '0 0 22px rgba(196,20,74,0.75), 0 0 6px rgba(255,80,120,0.6)';

const W = 1920;
const H = 1080;

const T = {
  figma: 0,
  hi: 42,
  sil: 110,
  eye: 370,
  creative: 470,
  logo: 580,
  end: 800,
};
export const DURATION = T.end;

const C = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const out = Easing.out(Easing.cubic);
const kf = (t: number, ts: number[], vs: number[], easing = io) => interpolate(t, ts, vs, {...C, easing});
const hop = (t: number, t0: number, t1: number, h: number) => {
  if (t < t0 || t > t1) return 0;
  const p = (t - t0) / (t1 - t0);
  return -h * 4 * p * (1 - p);
};

/* ================= Утилиты эффектов ================= */
let blurId = 0;
const DirBlur: React.FC<{x: number; y: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, children, style}) => {
  const id = React.useMemo(() => `db${blurId++}`, []);
  const on = x + y > 0.05;
  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={`${x} ${y}`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, ...style, filter: on ? `url(#${id})` : undefined}}>{children}</div>
    </>
  );
};
const chroma = (d: number) => (d > 0.2 ? `${d}px 0 rgba(255,0,70,0.75), ${-d}px 0 rgba(0,190,255,0.75)` : 'none');

const Cursor: React.FC<{t: number; h: number; solid?: boolean}> = ({t, h, solid}) => (
  <span
    style={{
      display: 'inline-block',
      width: Math.max(4, h * 0.05),
      height: h,
      background: WINE_HI,
      boxShadow: GLOW,
      borderRadius: 2,
      verticalAlign: 'middle',
      opacity: solid || Math.floor(t / 16) % 2 === 0 ? 1 : 0,
    }}
  />
);

/* ================= Направляющие Figma ================= */
const Guides: React.FC<{x: number; y: number; w: number; h: number; color: string; p: number; lw: string; lh: string}> = ({
  x,
  y,
  w,
  h,
  color,
  p,
  lw,
  lh,
}) => {
  const d = {stroke: color, strokeWidth: 1.4, strokeDasharray: '5 5'};
  const L = 2400 * p;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <line x1={x + w / 2 - L} x2={x + w / 2 + L} y1={y} y2={y} {...d} />
      <line x1={x + w / 2 - L} x2={x + w / 2 + L} y1={y + h} y2={y + h} {...d} />
      <line x1={x} x2={x} y1={y + h / 2 - L} y2={y + h / 2 + L} {...d} />
      <line x1={x + w} x2={x + w} y1={y + h / 2 - L} y2={y + h / 2 + L} {...d} />
      <text x={x + w / 2} y={y - 10} fill={color} fontSize={14} fontFamily={HN} textAnchor="middle" opacity={p}>
        {lw}
      </text>
      <text x={x - 10} y={y + h / 2 + 4} fill={color} fontSize={14} fontFamily={HN} textAnchor="end" opacity={p}>
        {lh}
      </text>
    </svg>
  );
};

/* ================= 1. «H» в интерфейсе дизайнера ================= */
const FigmaScene: React.FC = () => {
  const t = useCurrentFrame();
  const px = (f: number) => kf(f, [0, 12, 24, 36], [-330, -120, 40, 0]);
  const py = (f: number) => kf(f, [0, 12, 24, 36], [160, -110, -60, 0]);
  const x = px(t);
  const y = py(t);
  const vx = Math.abs(x - px(t - 1));
  const vy = Math.abs(y - py(t - 1));
  const s = kf(t, [0, 36], [0.9, 1.15]);
  const g = kf(t, [0, 10], [0, 1], out);
  const flash = kf(t, [34, 40], [0, 1]);
  const cx = 960 + x;
  const cy = 540 + y;
  const bw = 90 * s;
  const bh = 112 * s;
  const letter = (color: string, extra: React.CSSProperties = {}) => (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        transform: `translate(-50%,-50%) scale(${s})`,
        fontFamily: HN,
        fontWeight: 700,
        fontSize: 150,
        lineHeight: 1,
        color,
        ...extra,
      }}
    >
      H
    </div>
  );
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <DirBlur x={vx * 0.35} y={vy * 0.35}>
        <Guides x={cx - bw / 2} y={cy - bh / 2} w={bw} h={bh} color="#6a6a6a" p={g} lw="95px" lh="120px" />
        {letter('#fff')}
      </DirBlur>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
      {t >= 36 && letter(WINE_HI, {textShadow: chroma(7), opacity: flash})}
    </AbsoluteFill>
  );
};

/* ================= 2. «Hi» + 👋 ================= */
const HiScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inv = t >= 56;
  const fg = inv ? '#fff' : '#000';
  const push = kf(t, [0, 68], [1.0, 1.14], Easing.linear);
  const drift = kf(t, [0, 68], [0, -24], Easing.linear);
  const iIn = kf(t, [2, 10], [180, 0], out);
  const iBlur = Math.abs(iIn - kf(t - 1, [2, 10], [180, 0], out));
  const hand = spring({frame: t - 6, fps, config: {damping: 9, stiffness: 160}});
  const wave = t > 14 ? Math.sin((t - 14) / 3.2) * 16 : (1 - hand) * -60;
  const g = kf(t, [0, 8], [0, 1], out);
  const shake = inv && t < 62 ? (t % 2 ? 7 : -7) : 0;
  const ch = t < 10 ? 10 - t : inv && t < 62 ? 9 : 0;
  return (
    <AbsoluteFill style={{background: inv ? '#000' : '#fff'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${shake + drift}px, ${-drift * 0.4}px) scale(${push})`}}>
        <Guides x={752} y={452} w={262} h={180} color={inv ? '#4a4a4a' : '#c4c4c4'} p={g} lw="96px" lh="120px" />
        <div
          style={{
            position: 'absolute',
            left: 752,
            top: 405,
            fontFamily: HN,
            fontWeight: 700,
            fontSize: 250,
            lineHeight: 1,
            letterSpacing: -8,
            color: fg,
            textShadow: chroma(ch),
            whiteSpace: 'nowrap',
          }}
        >
          H
          <span style={{display: 'inline-block', transform: `translateX(${iIn}px)`, filter: `blur(${iBlur * 0.25}px)`}}>i</span>
        </div>
        <Img
          src={staticFile('hand.png')}
          style={{
            position: 'absolute',
            left: 1020,
            top: 262,
            width: 240,
            height: 240,
            transformOrigin: '30% 85%',
            transform: `scale(${Math.max(0, hand)}) rotate(${wave}deg)`,
            filter: `${inv ? 'brightness(0.12) ' : ''}blur(${Math.max(0, (1 - hand) * 6)}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ================= Силуэт: голова поворачивается отдельно от тела ================= */
const BR = BUST_W / BUST_H;
const NECK_CUT = BUST_NECK.y;
const Bust: React.FC<{h: number; hx: number; bottom: number; tilt: number; sway: number}> = ({h, hx, bottom, tilt, sway}) => {
  const w = h * BR;
  const left = hx - BUST_HEAD.x * w;
  const top = bottom - h;
  const piv = `${BUST_NECK.x * BUST_W} ${BUST_NECK.y * BUST_H}`;
  const cut = NECK_CUT * BUST_H;
  return (
    <svg
      viewBox={`0 0 ${BUST_W} ${BUST_H}`}
      width={w}
      height={h}
      style={{position: 'absolute', left, top, overflow: 'visible', transformOrigin: '50% 100%', transform: `rotate(${sway * 0.25}deg)`}}
    >
      <defs>
        <clipPath id="bodyClip">
          <rect x={-BUST_W} y={cut - 60} width={BUST_W * 3} height={BUST_H * 2} />
        </clipPath>
        <clipPath id="headClip">
          <rect x={-BUST_W} y={-BUST_H} width={BUST_W * 3} height={BUST_H + cut + 40} />
        </clipPath>
      </defs>
      <g clipPath="url(#bodyClip)">
        <path d={BUST_PATH} fill="#0b0b0b" />
        <rect x={BUST_W * 0.02} y={BUST_H - 6} width={BUST_W * 0.66} height={BUST_H * 0.5} fill="#0b0b0b" />
      </g>
      <g transform={`rotate(${tilt + sway} ${piv})`}>
        <g clipPath="url(#headClip)">
          <path d={BUST_PATH} fill="#0b0b0b" />
        </g>
      </g>
    </svg>
  );
};

/* ================= 3–5. I'm → имя → Your ================= */
const NAME = 'Farhat';
const SilScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();

  const shrinkK = (f: number) => kf(f, [56, 72], [0, 1], Easing.inOut(Easing.quad));
  const k = shrinkK(t);
  const vk = Math.abs(k - shrinkK(t - 1));
  const enter = kf(t, [0, 10], [1.2, 1], out);
  const hgt = interpolate(k, [0, 1], [920, 500]) * enter;
  const bottom = interpolate(k, [0, 1], [1090, 1100]);
  const tilt = kf(t, [100, 150], [0, 14]) + kf(t, [200, 240], [0, 4]);
  const sway = Math.sin(t / 20) * 2.2 + Math.sin(t / 8) * 0.4;
  const bob = Math.sin(t / 24) * 6;
  const exitK = kf(t, [244, 260], [0, 1], Easing.in(Easing.cubic));
  const exitV = Math.abs(exitK - kf(t - 1, [244, 260], [0, 1], Easing.in(Easing.cubic)));
  const hx = 960;
  const headY = bottom - hgt + BUST_HEAD.y * hgt;
  const headTop = bottom - hgt;

  const imIn = spring({frame: t - 2, fps, config: {damping: 13, stiffness: 170}});
  const imDeleted = t >= 34;
  const imOpacity = kf(t, [56, 64], [1, 0]);

  const typed = Math.max(0, Math.min(NAME.length, Math.floor((t - 82) / 5) + 1));
  const nameOn = t >= 78;
  const fallStart = (i: number) => 156 + (NAME.length - 1 - i) * 4;

  const ringIn = spring({frame: t - 184, fps, config: {damping: 7, stiffness: 200}});
  const fill = kf(t, [206, 213], [0, 1]);
  const yIn = kf(t, [198, 210], [-150, 0], out);
  const urIn = kf(t, [200, 212], [170, 0], out);
  const urOut = kf(t, [240, 248], [0, 1]);
  const dotY = hop(t, 213, 229, 150) + hop(t, 229, 241, 60);
  const land = (t >= 229 && t < 233) || (t >= 241 && t < 244);
  const sq = land ? 1.3 : 1;
  const nameTop = interpolate(k, [0, 1], [380, 455]);
  const yourTop = 432;

  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <DirBlur
        x={exitV * 220}
        y={vk * 70 + exitV * 120}
        style={{
          transform: `translate(${exitK * 500}px, ${exitK * 380}px) scale(${(1 + exitK * 0.6) * kf(t, [72, 244], [1, 1.06], Easing.linear)})`,
          transformOrigin: '50% 50%',
        }}
      >
        <Bust h={hgt} hx={hx} bottom={bottom + bob * (1 - k * 0.5)} tilt={tilt} sway={sway} />

        {imOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              left: hx - 20,
              top: headY + bob - 10,
              transform: `translate(-50%,-50%) scale(${(0.6 + 0.4 * imIn) * interpolate(k, [0, 1], [1, 0.5])})`,
              fontFamily: HN,
              fontWeight: 700,
              fontSize: 250,
              letterSpacing: -8,
              lineHeight: 1,
              color: '#fff',
              opacity: imOpacity,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {t >= 18 && <Cursor t={t} h={190} solid={t < 34} />}
            <span style={{marginLeft: 10}}>{imDeleted ? '' : 'I'}</span>
            <span>’m</span>
          </div>
        )}

        {nameOn && t < 200 && (
          <div
            style={{
              position: 'absolute',
              width: W,
              top: Math.min(nameTop, headTop - 150),
              textAlign: 'center',
              fontFamily: HN,
              fontWeight: 400,
              fontSize: 128,
              letterSpacing: -4,
              color: '#0b0b0b',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {NAME.split('').map((ch, i) => {
              if (i >= typed) return null;
              const ft = t - fallStart(i);
              const falling = ft > 0 && i > 0;
              const fy = falling ? 0.9 * ft * ft : 0;
              const fr = falling ? ft * (i % 2 ? 5 : -4) : 0;
              const fo = falling ? Math.max(0, 1 - ft / 16) : 1;
              const fShrink = i === 0 ? kf(t, [176, 186], [1, 0]) : 1;
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    transform: `translateY(${fy}px) rotate(${fr}deg) scale(${fShrink})`,
                    opacity: fo * fShrink,
                    filter: falling ? `blur(${Math.min(6, ft * 0.4)}px)` : undefined,
                  }}
                >
                  {ch}
                </span>
              );
            })}
            {t < 150 && <Cursor t={t} h={118} solid={t < 112} />}
          </div>
        )}

        {t >= 182 && (
          <div
            style={{
              position: 'absolute',
              width: W,
              top: yourTop,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              fontFamily: HN,
              fontWeight: 700,
              fontSize: 160,
              letterSpacing: -6,
              lineHeight: 1,
              color: '#0b0b0b',
            }}
          >
            <span style={{display: 'inline-block', opacity: t >= 198 ? 1 : 0, transform: `translateX(${yIn}px)`, filter: `blur(${Math.abs(yIn) * 0.05}px)`}}>
              Y
            </span>
            <span style={{display: 'inline-block', width: 96, height: 120, position: 'relative'}}>
              <svg
                width={100}
                height={100}
                viewBox="-50 -50 100 100"
                style={{
                  position: 'absolute',
                  left: -2,
                  top: -6,
                  overflow: 'visible',
                  transform: `translateY(${dotY}px) scale(${ringIn * sq}, ${ringIn / sq})`,
                  transformOrigin: '50% 100%',
                  filter: `drop-shadow(0 0 10px rgba(196,20,74,${fill * 0.7}))`,
                }}
              >
                <defs>
                  <radialGradient id="dotg" cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#E8336A" />
                    <stop offset="55%" stopColor={WINE_HI} />
                    <stop offset="100%" stopColor={WINE_DK} />
                  </radialGradient>
                </defs>
                <circle r={32 + fill * 8} fill={fill > 0.5 ? 'url(#dotg)' : 'none'} stroke={WINE_HI} strokeWidth={8 + fill * 12} />
              </svg>
            </span>
            <span
              style={{
                display: 'inline-block',
                opacity: t >= 200 ? 1 - urOut : 0,
                transform: `translateX(${urIn}px)`,
                clipPath: `inset(0 ${urOut * 100}% 0 0)`,
                filter: `blur(${Math.abs(urIn) * 0.05}px)`,
              }}
            >
              ur
            </span>
          </div>
        )}
      </DirBlur>
    </AbsoluteFill>
  );
};

/* ================= 6. Глаз ================= */
const BIG = 150;
const EyeScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();
  const openS = spring({frame: t, fps, config: {damping: 11, stiffness: 150}});
  const blink = t >= 30 && t <= 38 ? Math.abs(Math.cos(((t - 30) / 8) * Math.PI)) : 1;
  const open = Math.max(0.06, interpolate(openS, [0, 1], [0.15, 1]) * blink);
  const hh = 580 * open;
  const lx = (f: number) => kf(f, [8, 18, 42, 50, 58, 64], [150, 190, 190, 20, -170, -200]);
  const ly = (f: number) => kf(f, [42, 50, 58], [0, 70, 30]);
  const x = lx(t);
  const y = ly(t);
  const v = Math.hypot(x - lx(t - 1), y - ly(t - 1));
  const path = `M -520 0 Q 0 ${-hh} 520 0 Q 0 ${hh} -520 0 Z`;
  const push = kf(t, [76, 98], [0, 1], Easing.in(Easing.quad));
  const eyeScale = 1 + push * 5;
  const irisFade = kf(t, [78, 86], [1, 0]);
  const word = 'Creative';
  const letters = Math.max(0, Math.min(word.length, Math.floor((t - 60) / 3)));
  const txtX = interpolate(push, [0, 1], [x - 20, 0]);
  const txtY = interpolate(push, [0, 1], [y + 4, 0]);
  const txtSize = interpolate(push, [0, 1], [84, BIG]);
  const txtColor = push > 0.35 ? '#000' : '#fff';
  const pupilOff = {x: -Math.sign(x) * 16, y: 12};

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg width={W} height={H} viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <clipPath id="eyeclip">
            <path d={path} transform={`scale(${eyeScale})`} />
          </clipPath>
          <filter id="eb" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={`${v * 0.25 + push * 10} ${(1 - open) * 4 + push * 10}`} />
          </filter>
          <radialGradient id="iris" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#E0285E" />
            <stop offset="85%" stopColor={WINE_HI} />
            <stop offset="100%" stopColor={WINE_DK} />
          </radialGradient>
          <radialGradient id="pupil" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
        </defs>
        <g filter="url(#eb)">
          <path d={path} fill="#fff" transform={`scale(${eyeScale})`} />
          <g clipPath="url(#eyeclip)" opacity={irisFade}>
            <g transform={`translate(${x} ${y}) scale(${1 + push * 2})`}>
              <circle r={190} fill="url(#iris)" />
              <circle cx={pupilOff.x} cy={pupilOff.y} r={166} fill="url(#pupil)" />
              <circle cx={pupilOff.x + 50} cy={pupilOff.y - 64} r={48} fill="#fff" />
            </g>
          </g>
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 960 + txtX,
          top: 540 + txtY,
          transform: 'translate(-50%,-50%)',
          fontFamily: HN,
          fontWeight: 400,
          fontSize: txtSize,
          letterSpacing: -txtSize * 0.032,
          color: txtColor,
          WebkitTextStroke: `${txtSize * 0.011}px ${txtColor}`,
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {word.split('').map((ch, i) => (
          <span key={i} style={{display: 'inline-block', opacity: i < letters ? 1 : 0, transform: `translateY(${i < letters ? 0 : 20}px)`}}>
            {ch}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ================= 7. Creative ___ ================= */
const ROLES = [
  {from: 0, word: 'Director', dark: false},
  {from: 40, word: 'Designer', dark: true},
  {from: 62, word: 'Editor', dark: false},
  {from: 84, word: 'Partner', dark: true},
];
const measure = (txt: string, size: number, ls: number) => {
  if (typeof document === 'undefined') return txt.length * size * 0.5;
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `400 ${size}px ${HN}`;
  return c.measureText(txt).width + ls * txt.length;
};
const CreativeScene: React.FC = () => {
  const t = useCurrentFrame();
  const LS = -BIG * 0.032;
  const GAP = 40;
  const shiftPx = React.useMemo(() => (measure('Director', BIG, LS) + GAP) / 2, []);
  const role = [...ROLES].reverse().find((r) => t >= r.from)!;
  const lt = t - role.from;
  const fg = role.dark ? '#fff' : '#000';
  const first = role.from === 0;
  const shift = first ? kf(t, [6, 20], [1, 0], out) : 0;
  const wordOp = first ? kf(t, [8, 22], [0, 1]) : 1;
  const gray = first ? kf(t, [8, 26], [0.3, 1]) : 1;
  const draw = kf(t, [4, 24], [1, 0], out);
  const pop = first ? 1 : kf(lt, [0, 7], [1.08, 1], out);
  const ch = !first && lt < 4 ? 7 - lt : 0;
  const push = kf(t, [0, 110], [1, 1.07], Easing.linear);
  return (
    <AbsoluteFill style={{background: role.dark ? WINE_BG : '#fff', justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          display: 'flex',
          gap: GAP,
          alignItems: 'baseline',
          fontFamily: HN,
          fontSize: BIG,
          letterSpacing: LS,
          color: fg,
          WebkitTextStroke: `${BIG * 0.011}px ${fg}`,
          lineHeight: 1,
          transform: `scale(${push * pop})`,
          textShadow: chroma(ch),
        }}
      >
        <div style={{position: 'relative', transform: `translateX(${shift * shiftPx}px)`}}>
          Creative
          <svg width={590} height={110} viewBox="0 0 430 80" style={{position: 'absolute', left: -18, top: 140, overflow: 'visible'}}>
            <path
              d="M 18 14 C 120 4, 300 2, 410 10 C 418 12, 416 20, 400 22 C 300 26, 140 30, 60 44 C 40 48, 44 56, 70 52 C 120 44, 170 40, 200 42"
              fill="none"
              stroke={fg}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={draw}
            />
          </svg>
        </div>
        <div style={{opacity: wordOp * gray, transform: `translateX(${shift * 50}px)`}}>{role.word}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ================= 8. Логотип — см. Logo.tsx ================= */

/* ================= Звук ================= */
const Sfx: React.FC<{at: number; src: string; vol?: number; len?: number}> = ({at, src, vol = 0.6, len}) => (
  <Sequence from={at} durationInFrames={len}>
    <Audio src={staticFile(`sfx/${src}`)} volume={vol} />
  </Sequence>
);
const S = T.sil;
const L0 = T.logo;
const Sound: React.FC = () => <Audio src={staticFile('sound_design.wav')} />;

const Scene: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => (
  <Sequence from={from} durationInFrames={to - from}>
    {children}
  </Sequence>
);

export const Intro: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Scene from={T.figma} to={T.hi}>
      <FigmaScene />
    </Scene>
    <Scene from={T.hi} to={T.sil}>
      <HiScene />
    </Scene>
    <Scene from={T.sil} to={T.eye}>
      <SilScene />
    </Scene>
    <Scene from={T.eye} to={T.creative}>
      <EyeScene />
    </Scene>
    <Scene from={T.creative} to={T.logo}>
      <CreativeScene />
    </Scene>
    <Scene from={T.logo} to={T.end}>
      <LogoScene wineBg={WINE_BG} />
    </Scene>
    <Sound />
  </AbsoluteFill>
);
