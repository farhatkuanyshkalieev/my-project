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
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {BUST_H, BUST_PATH, BUST_W} from './bust';

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

export const ACCENT = '#7A1F33';
const W = 1920;
const H = 1080;
export const FPS = 60;

const T = {
  figma: 0,
  hi: 42,
  sil: 110,
  eye: 370,
  creative: 470,
  logo: 580,
  end: 700,
};
export const DURATION = T.end;

const C = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const out = Easing.out(Easing.cubic);
/** keyframes с плавностью */
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
/** хроматическая аберрация через text-shadow */
const chroma = (d: number) => (d > 0.2 ? `${d}px 0 rgba(255,0,70,0.75), ${-d}px 0 rgba(0,190,255,0.75)` : 'none');

const Cursor: React.FC<{t: number; h: number; solid?: boolean}> = ({t, h, solid}) => (
  <span
    style={{
      display: 'inline-block',
      width: Math.max(3, h * 0.045),
      height: h,
      background: ACCENT,
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
      <text x={x + w / 2} y={y - 10} fill={color} fontSize={13} fontFamily={HN} textAnchor="middle" opacity={p}>
        {lw}
      </text>
      <text x={x - 10} y={y + h / 2 + 4} fill={color} fontSize={13} fontFamily={HN} textAnchor="end" opacity={p}>
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
  const bw = 76 * s;
  const bh = 94 * s;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <DirBlur x={vx * 0.35} y={vy * 0.35}>
        <Guides x={cx - bw / 2} y={cy - bh / 2} w={bw} h={bh} color="#6a6a6a" p={g} lw="95px" lh="120px" />
        <div
          style={{
            position: 'absolute',
            left: cx,
            top: cy,
            transform: `translate(-50%,-50%) scale(${s})`,
            fontFamily: HN,
            fontWeight: 400,
            fontSize: 130,
            lineHeight: 1,
            color: '#fff',
          }}
        >
          H
        </div>
      </DirBlur>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
      {t >= 36 && (
        <div
          style={{
            position: 'absolute',
            left: cx,
            top: cy,
            transform: `translate(-50%,-50%) scale(${s})`,
            fontFamily: HN,
            fontSize: 130,
            lineHeight: 1,
            color: ACCENT,
            textShadow: chroma(6),
            opacity: flash,
          }}
        >
          H
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ================= 2. «Hi» + 👋 ================= */
const HiScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inv = t >= 56;
  const fg = inv ? '#fff' : '#000';
  const push = kf(t, [0, 68], [1.12, 1.28], Easing.linear);
  const drift = kf(t, [0, 68], [0, -24], Easing.linear);
  const iIn = kf(t, [2, 10], [140, 0], out);
  const iBlur = Math.abs(iIn - kf(t - 1, [2, 10], [140, 0], out));
  const hand = spring({frame: t - 6, fps, config: {damping: 9, stiffness: 160}});
  const wave = t > 14 ? Math.sin((t - 14) / 3.2) * 16 : (1 - hand) * -60;
  const g = kf(t, [0, 8], [0, 1], out);
  const shake = inv && t < 62 ? (t % 2 ? 6 : -6) : 0;
  const ch = t < 10 ? 10 - t : inv && t < 62 ? 8 : 0;
  return (
    <AbsoluteFill style={{background: inv ? '#000' : '#fff'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${shake + drift}px, ${-drift * 0.4}px) scale(${push})`}}>
        <Guides x={790} y={470} w={170} h={136} color={inv ? '#4a4a4a' : '#c4c4c4'} p={g} lw="96px" lh="120px" />
        <div
          style={{
            position: 'absolute',
            left: 792,
            top: 442,
            fontFamily: HN,
            fontWeight: 700,
            fontSize: 188,
            lineHeight: 1,
            letterSpacing: -4,
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
            left: 1010,
            top: 296,
            width: 190,
            height: 190,
            transformOrigin: '30% 85%',
            transform: `scale(${Math.max(0, hand)}) rotate(${wave}deg)`,
            filter: `${inv ? 'brightness(0.12) ' : ''}blur(${Math.max(0, (1 - hand) * 6)}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ================= Силуэт ================= */
const BR = BUST_W / BUST_H;
const HEAD = {x: 0.585, y: 0.27};
const PIVOT = {x: 0.6, y: 0.64};
const Bust: React.FC<{h: number; hx: number; bottom: number; rot: number}> = ({h, hx, bottom, rot}) => {
  const w = h * BR;
  return (
    <svg
      viewBox={`0 0 ${BUST_W} ${BUST_H}`}
      width={w}
      height={h}
      style={{
        position: 'absolute',
        left: hx - HEAD.x * w,
        top: bottom - h,
        transformOrigin: `${PIVOT.x * 100}% ${PIVOT.y * 100}%`,
        transform: `rotate(${rot}deg)`,
        overflow: 'visible',
      }}
    >
      <path d={BUST_PATH} fill="#0b0b0b" />
      {/* «продолжение» тела вниз, чтобы при наклоне не было зазора */}
      <rect x={BUST_W * 0.03} y={BUST_H - 4} width={BUST_W * 0.75} height={BUST_H * 0.4} fill="#0b0b0b" />
    </svg>
  );
};

/* ================= 3–5. I'm → имя → Your ================= */
const NAME = 'Farhat';
const SilScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();

  // --- геометрия силуэта ---
  const shrinkK = (f: number) => kf(f, [56, 72], [0, 1], Easing.inOut(Easing.quad));
  const k = shrinkK(t);
  const vk = Math.abs(k - shrinkK(t - 1));
  const enter = kf(t, [0, 10], [1.25, 1], out);
  const hgt = interpolate(k, [0, 1], [1120, 600]) * enter;
  const bottom = interpolate(k, [0, 1], [1100, 1120]);
  const tilt = kf(t, [100, 150], [0, 13]) + kf(t, [200, 240], [0, 4]);
  const sway = Math.sin(t / 22) * 1.6 + Math.sin(t / 9) * 0.35;
  const bob = Math.sin(t / 26) * 6;
  const exitK = kf(t, [244, 260], [0, 1], Easing.in(Easing.cubic));
  const exitV = Math.abs(exitK - kf(t - 1, [244, 260], [0, 1], Easing.in(Easing.cubic)));
  const hx = 960;
  const headY = bottom - hgt + HEAD.y * hgt;

  // --- I'm ---
  const imIn = spring({frame: t - 2, fps, config: {damping: 13, stiffness: 170}});
  const imDeleted = t >= 34 ? 1 : 0;
  const imOpacity = kf(t, [56, 64], [1, 0]);

  // --- имя ---
  const typed = Math.max(0, Math.min(NAME.length, Math.floor((t - 82) / 5) + 1));
  const nameOn = t >= 78;
  const fallStart = (i: number) => 156 + (NAME.length - 1 - i) * 4;

  // --- кольцо / точка / Your ---
  const ringIn = spring({frame: t - 184, fps, config: {damping: 7, stiffness: 200}});
  const fill = kf(t, [206, 213], [0, 1]);
  const yIn = kf(t, [198, 210], [-120, 0], out);
  const urIn = kf(t, [200, 212], [140, 0], out);
  const urOut = kf(t, [240, 248], [0, 1]);
  const dotY = hop(t, 213, 229, 120) + hop(t, 229, 241, 46);
  const land = (t >= 229 && t < 233) || (t >= 241 && t < 244);
  const sq = land ? 1.28 : 1;
  const textTop = 392;
  const showRing = t >= 182;

  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <DirBlur
        x={exitV * 220}
        y={vk * 70 + exitV * 120}
        style={{transform: `translate(${exitK * 500}px, ${exitK * 380}px) scale(${(1 + exitK * 0.6) * kf(t, [72, 244], [1, 1.06], Easing.linear)})`, transformOrigin: '50% 45%'}}
      >
        <Bust h={hgt} hx={hx} bottom={bottom + bob * (1 - k * 0.5)} rot={tilt + sway} />

        {/* I'm в голове */}
        {imOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              left: hx - 40,
              top: headY + bob,
              transform: `translate(-50%,-50%) scale(${(0.6 + 0.4 * imIn) * interpolate(k, [0, 1], [1, 0.45])})`,
              fontFamily: HN,
              fontWeight: 700,
              fontSize: 200,
              letterSpacing: -6,
              lineHeight: 1,
              color: '#fff',
              opacity: imOpacity,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {t >= 18 && <Cursor t={t} h={150} solid={t < 34} />}
            <span style={{marginLeft: 8, opacity: 1 - imDeleted}}>{imDeleted ? '' : 'I'}</span>
            <span>’m</span>
          </div>
        )}

        {/* Имя */}
        {nameOn && t < 200 && (
          <div
            style={{
              position: 'absolute',
              width: W,
              top: textTop,
              textAlign: 'center',
              fontFamily: HN,
              fontWeight: 400,
              fontSize: 92,
              letterSpacing: -3,
              color: '#111',
              WebkitTextStroke: '2.2px #fff',
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
            {t < 150 && <Cursor t={t} h={86} solid={t < 112} />}
          </div>
        )}

        {/* Y • ur */}
        {showRing && (
          <div
            style={{
              position: 'absolute',
              width: W,
              top: textTop - 6,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              fontFamily: HN,
              fontWeight: 700,
              fontSize: 112,
              letterSpacing: -4,
              lineHeight: 1,
              color: '#0b0b0b',
            }}
          >
            <span style={{display: 'inline-block', opacity: t >= 198 ? 1 : 0, transform: `translateX(${yIn}px)`, filter: `blur(${Math.abs(yIn) * 0.05}px)`}}>
              Y
            </span>
            <span style={{display: 'inline-block', width: 66, height: 90, position: 'relative'}}>
              <svg
                width={80}
                height={80}
                viewBox="-40 -40 80 80"
                style={{
                  position: 'absolute',
                  left: -6,
                  top: -4,
                  overflow: 'visible',
                  transform: `translateY(${dotY}px) scale(${ringIn * sq}, ${ringIn / sq})`,
                  transformOrigin: '50% 100%',
                }}
              >
                <circle r={22 + fill * 6} fill={fill > 0.5 ? (t > 236 ? ACCENT : '#0b0b0b') : 'none'} stroke={ACCENT} strokeWidth={6 + fill * 10} />
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
const EyeScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();
  const openS = spring({frame: t, fps, config: {damping: 11, stiffness: 150}});
  const blink = t >= 30 && t <= 38 ? Math.abs(Math.cos(((t - 30) / 8) * Math.PI)) : 1;
  const open = Math.max(0.06, interpolate(openS, [0, 1], [0.15, 1]) * blink);
  const hh = 560 * open;
  const lx = (f: number) => kf(f, [8, 18, 42, 50, 58, 64], [150, 190, 190, 20, -170, -200]);
  const ly = (f: number) => kf(f, [42, 50, 58], [0, 70, 30]);
  const x = lx(t);
  const y = ly(t);
  const v = Math.hypot(x - lx(t - 1), y - ly(t - 1));
  const path = `M -500 0 Q 0 ${-hh} 500 0 Q 0 ${hh} -500 0 Z`;

  // финальный проход внутрь глаза
  const push = kf(t, [76, 98], [0, 1], Easing.in(Easing.quad));
  const eyeScale = 1 + push * 5;
  const irisFade = kf(t, [78, 86], [1, 0]);
  const word = 'Creative';
  const letters = Math.max(0, Math.min(word.length, Math.floor((t - 60) / 3)));
  const txtX = interpolate(push, [0, 1], [x - 20, 0]);
  const txtY = interpolate(push, [0, 1], [y + 4, 0]);
  const txtSize = interpolate(push, [0, 1], [66, 110]);
  const txtColor = push > 0.35 ? '#000' : '#fff';
  const pupilOff = {x: -Math.sign(x) * 14, y: 10};

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
          <radialGradient id="pupil" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
        </defs>
        <g filter="url(#eb)">
          <path d={path} fill="#fff" transform={`scale(${eyeScale})`} />
          <g clipPath="url(#eyeclip)" opacity={irisFade}>
            <g transform={`translate(${x} ${y}) scale(${1 + push * 2})`}>
              <circle r={182} fill={ACCENT} />
              <circle cx={pupilOff.x} cy={pupilOff.y} r={160} fill="url(#pupil)" />
              <circle cx={pupilOff.x + 48} cy={pupilOff.y - 62} r={46} fill="#fff" />
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
          letterSpacing: -3,
          color: txtColor,
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
  const shiftPx = React.useMemo(() => (measure('Director', 110, -3.5) + 30) / 2, []);
  const role = [...ROLES].reverse().find((r) => t >= r.from)!;
  const lt = t - role.from;
  const fg = role.dark ? '#fff' : '#000';
  const first = role.from === 0;
  const shift = first ? kf(t, [6, 20], [1, 0], out) : 0;
  const wordOp = first ? kf(t, [8, 22], [0, 1]) : 1;
  const gray = first ? kf(t, [8, 26], [0.3, 1]) : 1;
  const draw = kf(t, [4, 24], [1, 0], out);
  const pop = first ? 1 : kf(lt, [0, 7], [1.08, 1], out);
  const ch = !first && lt < 4 ? 6 - lt : 0;
  const push = kf(t, [0, 110], [1, 1.07], Easing.linear);
  return (
    <AbsoluteFill style={{background: role.dark ? ACCENT : '#fff', justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          display: 'flex',
          gap: 30,
          alignItems: 'baseline',
          fontFamily: HN,
          fontSize: 110,
          letterSpacing: -3.5,
          color: fg,
          lineHeight: 1,
          transform: `scale(${push * pop})`,
          textShadow: chroma(ch),
        }}
      >
        <div style={{position: 'relative', transform: `translateX(${shift * shiftPx}px)`}}>
          Creative
          <svg width={430} height={80} viewBox="0 0 430 80" style={{position: 'absolute', left: -14, top: 104, overflow: 'visible'}}>
            <path
              d="M 18 14 C 120 4, 300 2, 410 10 C 418 12, 416 20, 400 22 C 300 26, 140 30, 60 44 C 40 48, 44 56, 70 52 C 120 44, 170 40, 200 42"
              fill="none"
              stroke={fg}
              strokeWidth={3.2}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={draw}
            />
          </svg>
        </div>
        <div style={{opacity: wordOp * gray, transform: `translateX(${shift * 40}px)`}}>{role.word}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ================= 8. Логотип ================= */
const LW = 1320;
const LH = (LW * 667) / 2000;
const TXT = {x0: 0.112, x1: 0.912, y0: 0.3, y1: 0.665};
const LogoScene: React.FC = () => {
  const t = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = kf(t, [0, 14], [0, 150], out);
  const sweep = kf(t, [8, 38], [0, 361], Easing.inOut(Easing.quad));
  const ringS = kf(t, [8, 40], [1.12, 1], out);
  const ringR = kf(t, [8, 40], [-10, 0], out);
  const txt = kf(t, [20, 40], [0, 1], out);
  const shine = kf(t, [46, 72], [-30, 130], Easing.inOut(Easing.quad));
  const sp = spring({frame: t - 38, fps, config: {damping: 8, stiffness: 140}});
  const twinkle = t > 90 ? 1 + 0.35 * Math.max(0, Math.sin((t - 90) / 3)) : 1;
  const push = kf(t, [0, 120], [1.06, 1], out);
  const dotIn = kf(t, [2, 10], [0, 1], out);
  const holeRect = `M0 0H${LW}V${LH}H0Z M${TXT.x0 * LW} ${TXT.y0 * LH}V${TXT.y1 * LH}H${TXT.x1 * LW}V${TXT.y0 * LH}Z`;
  const logoImg = <Img src={staticFile('logo.png')} style={{width: LW, height: LH, display: 'block'}} />;
  return (
    <AbsoluteFill style={{background: ACCENT}}>
      <AbsoluteFill style={{background: '#fff', clipPath: `circle(${reveal}% at 50% 50%)`, justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'relative', width: LW, height: LH, transform: `scale(${push})`}}>
          {/* кольцо — прорисовывается по кругу */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `path(evenodd, '${holeRect}')`,
              WebkitMaskImage: `conic-gradient(from 200deg at 50% 50%, #000 ${sweep}deg, transparent ${sweep + 0.5}deg)`,
              transform: `scale(${ringS}) rotate(${ringR}deg)`,
            }}
          >
            {logoImg}
          </div>
          {/* текст — выезжает снизу с размытием */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `inset(${TXT.y0 * 100}% ${(1 - TXT.x1) * 100 + (1 - txt) * (TXT.x1 - TXT.x0) * 100}% ${(1 - TXT.y1) * 100}% ${TXT.x0 * 100}%)`,
              transform: `translateY(${(1 - txt) * 40}px)`,
              filter: `blur(${(1 - txt) * 10}px)`,
              opacity: txt,
            }}
          >
            {logoImg}
          </div>
          {/* блик по хрому */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              WebkitMaskImage: `url(${staticFile('logo.png')})`,
              WebkitMaskSize: '100% 100%',
              background: `linear-gradient(110deg, transparent ${shine - 12}%, rgba(255,255,255,0.95) ${shine}%, transparent ${shine + 12}%)`,
              mixBlendMode: 'screen',
              opacity: t > 44 ? 1 : 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              WebkitMaskImage: `url(${staticFile('logo.png')})`,
              WebkitMaskSize: '100% 100%',
              background: `linear-gradient(110deg, transparent ${shine - 6}%, ${ACCENT} ${shine - 2}%, transparent ${shine + 4}%)`,
              mixBlendMode: 'multiply',
              opacity: t > 44 ? 0.55 : 0,
            }}
          />
          {/* звезда-вспышка */}
          <svg
            width={300}
            height={300}
            viewBox="-150 -150 300 300"
            style={{
              position: 'absolute',
              left: 0.857 * LW - 150,
              top: 0.138 * LH - 150,
              overflow: 'visible',
              transform: `scale(${Math.max(0, sp) * twinkle}) rotate(${(1 - sp) * 90 + t * 0.6}deg)`,
            }}
          >
            <defs>
              <radialGradient id="glow">
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle r={60} fill="url(#glow)" />
            <path d="M0 -110 L7 -7 L140 0 L7 7 L0 110 L-7 7 L-140 0 L-7 -7 Z" fill="#fff" stroke="#bbb" strokeWidth={1} />
            <circle r={9} fill="#fff" />
          </svg>
          {/* бордовая точка — продолжение линии ролика */}
          <div
            style={{
              position: 'absolute',
              left: 0.5 * LW - 20,
              top: 0.5 * LH - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: ACCENT,
              transform: `scale(${dotIn * (1 - txt)})`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================= Звук ================= */
const Sfx: React.FC<{at: number; src: string; vol?: number; len?: number}> = ({at, src, vol = 0.6, len}) => (
  <Sequence from={at} durationInFrames={len}>
    <Audio src={staticFile(`sfx/${src}`)} volume={vol} />
  </Sequence>
);
const S = T.sil;
const Sound: React.FC = () => (
  <>
    <Audio
      src={staticFile('music/swimming.m4a')}
      trimBefore={Math.round(33.2 * 60)}
      volume={(f) => interpolate(f, [0, 12, DURATION - 50, DURATION], [0, 0.36, 0.36, 0], C)}
    />
    <Sfx at={2} src="click.mp3" vol={0.45} />
    <Sfx at={30} src="whoosh.wav" vol={0.45} />
    <Sfx at={T.hi + 2} src="bulk2.wav" vol={0.5} />
    <Sfx at={T.hi + 6} src="bulk3.wav" vol={0.5} />
    <Sfx at={T.hi + 56} src="cut.mp3" vol={0.5} />
    <Sfx at={S} src="ewhoosh.wav" vol={0.45} />
    <Sfx at={S + 34} src="click.mp3" vol={0.45} />
    <Sfx at={S + 54} src="bigwhoosh.mp3" vol={0.4} />
    <Sfx at={S + 82} src="typing.mp3" vol={0.55} len={32} />
    <Sfx at={S + 158} src="bulk5.wav" vol={0.4} />
    <Sfx at={S + 166} src="bulk4.wav" vol={0.4} />
    <Sfx at={S + 184} src="bulk1.wav" vol={0.45} />
    <Sfx at={S + 198} src="whoosh.wav" vol={0.35} />
    <Sfx at={S + 213} src="bulk3.wav" vol={0.45} />
    <Sfx at={S + 229} src="bulk2.wav" vol={0.45} />
    <Sfx at={S + 241} src="bulk4.wav" vol={0.35} />
    <Sfx at={S + 244} src="ewhoosh.wav" vol={0.45} />
    <Sfx at={T.eye} src="bulk2.wav" vol={0.45} />
    <Sfx at={T.eye + 14} src="whoosh.wav" vol={0.25} />
    <Sfx at={T.eye + 50} src="whoosh.wav" vol={0.3} />
    <Sfx at={T.eye + 60} src="typing.mp3" vol={0.4} len={24} />
    <Sfx at={T.eye + 70} src="riser.mp3" vol={0.4} />
    <Sfx at={T.creative} src="bigwhoosh.mp3" vol={0.4} />
    {ROLES.slice(1).map((r) => (
      <Sfx key={r.word} at={T.creative + r.from} src="cut.mp3" vol={0.45} />
    ))}
    <Sfx at={T.logo} src="ewhoosh.wav" vol={0.45} />
    <Sfx at={T.logo + 38} src="bulk1.wav" vol={0.45} />
    <Sfx at={T.logo + 48} src="whoosh.wav" vol={0.25} />
  </>
);

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
      <LogoScene />
    </Scene>
    <Sound />
  </AbsoluteFill>
);
