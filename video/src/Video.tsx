import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/figtree/800.css';
import '@fontsource/figtree/900.css';
import { PixelIcon } from './pixel';
import { ThermalHand, ThermalHead } from './thermal';
import {
  clamp,
  Cursor,
  Explosion,
  FilterDefs,
  FONT,
  Grain,
  H,
  InkBlob,
  Label,
  LIGHT_BG,
  lerp,
  loopPath,
  Note,
  SCRIBBLES,
  Sparkle,
  SpeedLines,
  Stroke,
  Vignette,
  W,
} from './fx';

export const TOTAL = 621;
const DARK = '#0b0a0c';
const INK = '#151518';
const RED = '#c8121a';

type P = { f: number; l: number; fps: number };
const ease = Easing.bezier(0.33, 0, 0.2, 1);
const prog = (f: number, a: number, b: number, e = ease) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });
const pop = (f: number, at: number, fps: number, damping = 10) => spring({ frame: f - at, fps, config: { damping, stiffness: 200, mass: 0.6 } });

const Light: React.FC<{ children?: React.ReactNode; vig?: number }> = ({ children, vig = 0.15 }) => (
  <AbsoluteFill style={{ background: LIGHT_BG }}>
    {children}
    <Vignette strength={vig} />
  </AbsoluteFill>
);
const Dark: React.FC<{ children?: React.ReactNode; bg?: string }> = ({ children, bg = DARK }) => (
  <AbsoluteFill style={{ background: bg }}>
    {children}
    <Vignette strength={0.55} />
  </AbsoluteFill>
);

// ================= A / AD: огромное «how do you» между пунктирами =================
const BigStrip: React.FC<{ l: number; from: number; to: number; dur: number; bar?: boolean }> = ({ l, from, to, dur, bar }) => {
  const x = lerp(from, to, prog(l, 0, dur, Easing.out(Easing.quad)));
  return (
    <Light vig={0.3}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {[392, 612].map((y) => (
          <line key={y} x1={0} x2={W} y1={y} y2={y} stroke="#6e2a2a" strokeWidth={3} strokeDasharray="26 16" strokeDashoffset={l * 9} opacity={0.85} />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: x, top: 612, transform: 'translateY(-79%)', fontFamily: FONT, fontWeight: 800, fontSize: 330, color: INK, letterSpacing: -14, whiteSpace: 'pre', lineHeight: 1, filter: 'url(#hblur6)' }}>
        how do you
      </div>
      {bar && l >= 4 && l < 8 ? (
        <>
          <div style={{ position: 'absolute', left: 760, top: 360, width: 840, height: 250, background: INK }} />
          <Stroke d="M 0 0 L -40 160 L 60 150 L 520 110" p={prog(l, 4, 7)} x={780} y={590} width={7} />
        </>
      ) : null}
    </Light>
  );
};

// ================= B: текст рассыпается в «морзянку» =================
const Morse: React.FC<P> = ({ l }) => {
  const marks = [44, 0, 14, 44, 0, 0, 44, 14, 14, 14, 0, 0, 0, 10];
  let x = 620;
  return (
    <Light>
      {marks.map((w, i) => {
        const el = w ? <div key={i} style={{ position: 'absolute', left: x, top: 535 + (i === 13 ? -24 : 0), width: w, height: i === 13 ? 60 : 9, background: INK, opacity: random(`m${i}${Math.floor(l / 2)}`) > 0.15 ? 1 : 0 }} /> : null;
        x += (w || 28) + 22;
        return el;
      })}
    </Light>
  );
};

// ================= C: текстовый бокс с выделением + дымный мазок =================
const SelectBox: React.FC<P> = ({ l }) => (
  <Light>
    <Stroke d="M 0 60 C 120 -20, 260 40, 420 10 C 520 -10, 600 40, 700 20" p={1} x={1100} y={120} width={90} color="#7a7a80" blur={22} opacity={0.75} />
    <div style={{ position: 'absolute', left: 600, top: 420, width: 640, height: 92, border: '2px dotted #333', boxSizing: 'border-box' }}>
      {[[-6, -6], [626, -6], [-6, 78], [626, 78]].map(([a, b], i) => (
        <div key={i} style={{ position: 'absolute', left: a, top: b, width: 12, height: 12, border: '2px solid #333', background: '#eee' }} />
      ))}
    </div>
    <div style={{ position: 'absolute', left: 612, top: 425, width: 3, height: 600, background: INK }} />
    <Label text="how do you communicate" x={636} y={466} size={44} color="#222" weight={600} />
    <Stroke d={SCRIBBLES.sig} p={prog(l, 0, 6)} x={640} y={560} scale={1.3} width={4.5} />
  </Light>
);

// ================= D: печать фразы + чёрные росчерки =================
const Q_WORDS: [string, number][] = [
  ['how do you communicate', 18],
  ['that', 25],
  ["you're", 35],
  ['going', 44],
  ['through', 50],
  ['a', 58],
  ['change?', 62],
];
const sentence = (f: number) => Q_WORDS.filter(([, at]) => f >= at).map(([w]) => w).join(' ');

const Typing: React.FC<P> = ({ f }) => {
  const s = (a: number, b: number, d: string, x: number, y: number, sc = 1, w = 4) => (
    <Stroke d={d} p={prog(f, a, a + 4)} opacity={f < b ? 1 : 0} x={x} y={y} scale={sc} width={w} />
  );
  return (
    <Light>
      <Label text={sentence(f)} x={70} y={540} size={64} color="#1c1c20" weight={600} />
      {s(24, 30, SCRIBBLES.sig, 120, 610, 1.6)}
      {s(30, 36, SCRIBBLES.loop, 1500, 360, 1.8)}
      {s(36, 41, SCRIBBLES.zig, 1180, 470, 1.6)}
      {s(41, 47, SCRIBBLES.under, 380, 478, 2.6)}
    </Light>
  );
};

// ================= E: красная вспышка с «волной» =================
const RedFlash: React.FC<P> = ({ f }) => {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const y = 120 + i * 21;
    const a = (random(`wv${i}${Math.floor(f / 2)}`) * 0.7 + 0.3) * 200 * Math.sin((i / 40) * Math.PI);
    pts.push(`${1550 - a},${y}`);
  }
  for (let i = 40; i >= 0; i--) {
    const y = 120 + i * 21;
    const a = (random(`wv${i}${Math.floor(f / 2)}`) * 0.7 + 0.3) * 120 * Math.sin((i / 40) * Math.PI);
    pts.push(`${1550 + a},${y}`);
  }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 50%, #d4141c, #8a0b10)` }}>
      <Label text={sentence(f)} x={70} y={540} size={64} color="#4a0a0d" weight={600} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <polygon points={pts.join(' ')} fill="#ffb21e" style={{ filter: 'blur(10px)' }} />
        <polygon points={pts.join(' ')} fill="#ffd34a" opacity={0.9} />
        {[0, 1, 2].map((k) => (
          <polyline
            key={k}
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            points={Array.from({ length: 14 }, (_, i) => `${1180 + i * 28 + k * 18},${540 + (i % 2 ? -1 : 1) * (40 + random(`z${k}${i}`) * 160) * (1 - i / 16)}`).join(' ')}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 1540, top: 526, width: 30, height: 30, borderRadius: 15, background: 'radial-gradient(circle at 35% 35%, #9ef, #18a)' }} />
    </AbsoluteFill>
  );
};

// ================= F: циан-звезда, прожектор, мелкие иконки =================
const Spotlight: React.FC<P> = ({ f, l }) => {
  const dark = prog(f, 61, 92);
  const hi = prog(f, 99, 103);
  const icons: [string, number, number, number][] = [
    ['book', 1060, 300, 90],
    ['clapper', 1290, 300, 90],
    ['coin', 1160, 560, 70],
    ['camera', 1400, 780, 90],
  ];
  const words = sentence(f).split(' ');
  return (
    <AbsoluteFill style={{ background: '#e4e3e6' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 52% 48%, #ffffff 0%, #e8e8ea ${lerp(70, 16, dark)}%, #4a4a4e ${lerp(110, 42, dark)}%, #050506 ${lerp(140, 68, dark)}%)`,
        }}
      />
      {f < 62 ? (
        <>
          <Sparkle x={330} y={520} R={460} color="#7af3ff" glow="#2fe0ff" rotate={8} sy={1.05} k={0.07} />
          <Stroke d={SCRIBBLES.arcTop} p={1} x={980} y={300} scale={1.5} width={6} />
          <Stroke d="M 0 0 L 160 70" p={1} x={1380} y={250} width={3} color="#d33" />
        </>
      ) : (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="bluestar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#1028d8" />
              <stop offset="0.7" stopColor="#1f63ff" />
              <stop offset="1" stopColor="#2ff0ff" />
            </linearGradient>
          </defs>
          <g transform={`translate(-120 ${540 + Math.sin(l / 9) * 6}) scale(1 1)`}>
            <path d="M 0 -760 C 80 -120, 120 -60, 640 0 C 120 60, 80 120, 0 760 L -200 760 L -200 -760 Z" fill="url(#bluestar)" />
            <path d="M 0 -760 C 80 -120, 120 -60, 640 0 C 120 60, 80 120, 0 760" fill="none" stroke="#3ff2ff" strokeWidth={8} style={{ filter: 'blur(6px)' }} />
          </g>
        </svg>
      )}
      {icons.map(([n, x, y, s], i) => (
        <div key={n} style={{ position: 'absolute', left: x + Math.sin((f + i * 9) / 14) * 8, top: y + Math.cos((f + i * 7) / 16) * 8, transform: `translate(-50%,-50%) rotate(${-14 + i * 9}deg)`, filter: f < 62 ? 'blur(4px)' : 'none' }}>
          <PixelIcon name={n} size={s} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 70, top: 540, transform: 'translateY(-50%)', fontFamily: FONT, fontWeight: 600, fontSize: 64, letterSpacing: -2.2, whiteSpace: 'pre', color: lerp(0, 1, hi) > 0.5 ? '#333' : '#1c1c20' }}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              color: hi > 0 && w === 'you' && i === 2 ? '#fff' : hi > 0 ? `rgba(40,40,44,${1 - hi * 0.4})` : undefined,
              fontWeight: hi > 0 && w === 'you' && i === 2 ? 800 : 600,
              opacity: hi > 0 && i === 1 ? 0.15 : 1,
            }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ================= G: красная сфера → оранжевый вихрь =================
const Orb: React.FC<P> = ({ f }) => {
  const a = prog(f, 108, 112);
  const b = prog(f, 111, 115);
  return (
    <Dark>
      {f < 112 ? (
        <>
          <div style={{ position: 'absolute', left: 520 - 230, top: 540 - 230, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, #ff3a2a, #c8121a 55%, rgba(200,18,26,0) 72%)', filter: 'blur(6px)', transform: `scale(${0.8 + a * 0.4})` }} />
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
            <ellipse cx={520} cy={540} rx={260} ry={250} fill="none" stroke="#ff4a2a" strokeWidth={10} strokeDasharray="900 900" style={{ filter: 'blur(3px)' }} transform={`rotate(${a * 90} 520 540)`} />
          </svg>
          <Label text="how do you communicate" x={70} y={540} size={64} color="#e8e8e8" weight={600} opacity={0.5} />
        </>
      ) : (
        <>
          <Stroke d="M 0 60 C 40 -20, 160 -30, 230 30 C 270 70, 160 90, 90 60" p={1} x={lerp(900, 1100, b)} y={300} scale={1.6} width={30} color="#ffa52a" blur={6} />
          <div style={{ position: 'absolute', left: lerp(1050, 1250, b), top: 380, width: 420, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, #9a3aa8 0%, #5a1b7a 50%, rgba(80,20,120,0) 72%)', filter: 'blur(26px)' }} />
          <div style={{ position: 'absolute', left: 1250, top: 380, filter: 'blur(14px)', opacity: b }}>
            <ThermalHead width={760} frame={f} />
          </div>
          <Label text="you dont." x={330} y={540} size={76} color="#eee" blur={6} opacity={b} />
        </>
      )}
    </Dark>
  );
};

// ================= H: тепловая голова, «you dont.» → «you just show» =================
const HeadScene: React.FC<P> = ({ f }) => {
  const bgT = prog(f, 162, 171);
  const bg = `rgb(${Math.round(lerp(11, 78, bgT))},${Math.round(lerp(10, 62, bgT))},${Math.round(lerp(12, 66, bgT))})`;
  const txt = f < 155 ? 'you dont.' : f < 160 ? 'you' : f < 170 ? 'you just' : 'you just show';
  const sharp = prog(f, 115, 119);
  const orbit = prog(f, 138, 146);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: 'absolute', left: 980, top: 150, filter: `blur(${(1 - sharp) * 10}px)`, opacity: lerp(1, 0.85, bgT) }}>
        <ThermalHead width={800} frame={f} />
      </div>
      {/* световые росчерки вокруг головы */}
      <Stroke d="M 0 30 C 50 5, 100 0, 150 -10" p={prog(f, 128, 132)} tail={prog(f, 131, 135)} x={1330} y={210} width={4} color="#fff" />
      <Stroke d="M 0 0 C 200 260, 420 470, 560 560 C 640 610, 600 520, 500 470 C 420 430, 380 470, 450 450" p={orbit} tail={prog(f, 143, 150)} x={1080} y={300} width={4} color="#fff" />
      {[126, 129, 133].map((at, i) => (f >= at && f < at + 4 ? <div key={i} style={{ position: 'absolute', left: 1170 + i * 40, top: 520 + i * 30, width: 10, height: 6, borderRadius: 3, background: '#fff', boxShadow: '0 0 10px #fff' }} /> : null))}
      <Label
        text={txt}
        x={330}
        y={540}
        size={76}
        color={`rgba(238,238,238,${lerp(1, 0.75, bgT)})`}
        cursor={f < 150 ? <Cursor f={f} type="bar" size={76} color="#bbb" /> : null}
      />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ================= I: светлеет, голова становится тёмной =================
const ShowIt: React.FC<P> = ({ f }) => {
  const t = prog(f, 171, 177);
  return (
    <Light vig={0.25}>
      <AbsoluteFill style={{ background: '#4e3e42', opacity: 1 - t }} />
      <div style={{ position: 'absolute', left: 1000, top: 140 }}>
        <ThermalHead width={800} frame={f} dark={lerp(0.35, 0.92, t)} />
      </div>
      <Label text={f < 180 ? 'you just show' : 'you just show it.'} x={420} y={540} size={70} color="#2a2a2e" weight={600} />
    </Light>
  );
};

// ================= Кольцо иконок =================
const RING: [string, number][] = [
  ['skate', 420],
  ['vinyl', 266],
  ['book', 237],
  ['camera', 266],
  ['cat', 182],
  ['coin', 224],
  ['gamepad', 350],
  ['cap', 308],
  ['heart', 350],
  ['money', 420],
  ['plant', 280],
  ['clapper', 294],
];

const ringPos = (i: number, ang: number, cx = 960, cy = 560, rx = 700, ry = 360) => {
  const a = -2.5 + (i / RING.length) * Math.PI * 2 + ang;
  return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a };
};

const Ring: React.FC<{ f: number; ang: number; scale: number; coarse?: number; ox?: number; oy?: number; scatter?: number; blur?: number }> = ({
  f,
  ang,
  scale,
  coarse = 1,
  ox = 0,
  oy = 0,
  scatter = 0,
  blur = 0,
}) => (
  <AbsoluteFill style={{ transform: `translate(${ox}px, ${oy}px) scale(${scale})`, filter: blur ? `blur(${blur}px)` : undefined }}>
    {RING.map(([n, s], i) => {
      const p = ringPos(i, ang);
      const sp = SCATTER[i];
      const x = lerp(p.x, sp[0], scatter);
      const y = lerp(p.y, sp[1], scatter);
      const sz = lerp(s, s * 0.55, scatter);
      const rot = lerp(Math.sin(p.a) * -18 + Math.sin(f / 20 + i) * 3, sp[2], scatter);
      return (
        <div key={n} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg)`, zIndex: Math.round(p.y) }}>
          <PixelIcon name={n} size={sz} coarse={coarse} />
        </div>
      );
    })}
  </AbsoluteFill>
);

// разбросанные позиции (сцена распада кольца)
const SCATTER: [number, number, number][] = [
  [560, 470, -10], // skate
  [770, 130, 0], // vinyl
  [820, 410, -6], // book
  [1050, 300, 0], // camera
  [1500, 820, 0], // cat
  [1250, 640, 0], // coin
  [1700, 950, 0], // gamepad
  [1010, 470, 0], // cap
  [620, 640, 0], // heart
  [380, 1000, -10], // money
  [200, 460, 0], // plant
  [190, 470, 0], // clapper
];

const PixelIn: React.FC<P> = ({ f }) => {
  if (f < 190)
    return (
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 30%, #f0eff1, #c9c8cc 60%, #9c9ba0)' }}>
        <div style={{ position: 'absolute', left: 860, top: 960, width: 260, height: 220, borderRadius: '50%', background: '#2a2628', filter: 'blur(18px)', opacity: 1 - prog(f, 185, 190) }} />
      </AbsoluteFill>
    );
  const c = f < 192 ? 6 : f < 194 ? 3 : 2;
  return (
    <AbsoluteFill style={{ background: f < 193 ? '#5a5658' : LIGHT_BG }}>
      <Ring f={f} ang={0} scale={1.25} coarse={c} blur={f < 193 ? 3 : 0} />
    </AbsoluteFill>
  );
};

const RingScene: React.FC<P> = ({ f, l, fps }) => {
  const push = 1 + prog(l, 0, 48, Easing.in(Easing.quad)) * 0.32;
  return (
    <Light vig={0.2}>
      <Ring f={f} ang={l * 0.006} scale={push} ox={-l * 2.5} oy={-l * 1.2} />
      <InkBlob path={(t) => [1080 + Math.cos(t * 5) * 220, 560 + Math.sin(t * 5) * 140]} t={prog(l, 0, 40, Easing.linear)} size={44} trail={0.25} />
      <InkBlob path={(t) => [1150, lerp(-100, 520, t)]} t={prog(l, 10, 20, Easing.in(Easing.quad))} size={60} trail={0.5} />
      <InkBlob path={(t) => [lerp(1100, 700, t), 330 + Math.sin(t * 3) * 40]} t={prog(l, 24, 42, Easing.linear)} size={50} trail={0.3} />
      <Explosion age={f - 210} x={1420} y={600} size={360} />
      <Explosion age={f - 228} x={560} y={460} size={320} />
    </Light>
  );
};

// ================= L/N/P: тёмные сцены со словами =================
const ActionScene: React.FC<P> = ({ f, l }) => {
  const rz = interpolate(l, [0, 4, 12, 18, 27], [-12, 0, 4, -78, -12], clamp);
  const rx = interpolate(l, [0, 18, 24, 27], [0, 0, 62, 70], clamp);
  const s = interpolate(l, [0, 4, 18, 27], [0.85, 1, 1.12, 1.25], clamp);
  return (
    <Dark>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: 200 + random(`ad${i}`) * 1500, top: 120 + random(`ady${i}`) * 850, width: 12, height: 12, borderRadius: 6, background: '#c8121a', opacity: 0.8 }} />
      ))}
      <div style={{ position: 'absolute', left: 680, top: 560, transform: `translate(-50%,-50%) perspective(900px) rotateZ(${rz}deg) rotateX(${rx}deg) scale(${s})`, filter: l < 4 ? `blur(${(4 - l) * 3}px)` : undefined }}>
        <PixelIcon name="camera" size={420} />
      </div>
      <Sparkle x={760 + l * 3} y={430 - l * 4} R={130 + Math.sin(l / 2) * 25} color="#e0141c" glow="#ff2a2a" rotate={l * 4 + 20} sx={0.8} />
      <Label text="action." x={1240} y={540} size={88} color="#eaeaea" blur={l < 3 ? 6 : 0} cursor={<Cursor f={f} type={l < 6 ? 'block' : 'bar'} size={88} color="#fff" blink={l >= 6} />} />
    </Dark>
  );
};

const IntentionScene: React.FC<P> = ({ f, l }) => {
  const r = prog(l, 0, 12, Easing.out(Easing.cubic));
  return (
    <Dark>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id="rib">
            <rect x={0} y={lerp(1080, -200, r)} width={W} height={H + 400} />
          </clipPath>
        </defs>
        <polygon clipPath="url(#rib)" points="0,980 120,1080 380,700 1700,-40 1500,-40 330,560 220,640" fill="#e0141c" />
        <polygon clipPath="url(#rib)" points="220,640 330,560 380,700 300,760" fill="#9a0c10" />
      </svg>
      <div style={{ position: 'absolute', left: 560, top: 520, transform: `translate(-50%,-50%) perspective(1000px) rotateX(18deg) rotateY(${-22 + l * 0.6}deg) rotateZ(-14deg)` }}>
        <PixelIcon name="book" size={400} />
      </div>
      <Label text="intention." x={1150} y={520} size={88} color="#eaeaea" cursor={<Cursor f={f} type={l < 5 ? 'block' : 'bar'} size={88} color="#fff" blink={l >= 5} />} />
      <Stroke d={SCRIBBLES.arrow} p={prog(l, 4, 10)} x={1460} y={690} width={4} color="#ddd" scale={1.2} />
    </Dark>
  );
};

const CuriosityScene: React.FC<P> = ({ f, l, fps }) => {
  const pan = prog(l, 8, 24, Easing.inOut(Easing.quad));
  return (
    <Dark>
      <div style={{ position: 'absolute', left: lerp(600, 230, pan), top: 540, transform: `translate(-50%,-50%) rotate(${l * 6}deg)` }}>
        <PixelIcon name="vinyl" size={lerp(330, 300, pan)} />
      </div>
      <Label text="curiosity." x={lerp(1260, 800, pan)} y={540} size={88} color="#eaeaea" cursor={<Cursor f={f} type={l < 5 ? 'block' : 'bar'} size={88} color="#fff" blink={l >= 5} />} />
      <Note x={lerp(1080, 760, pan)} y={790} size={190} scale={pop(f, 331, fps)} rotate={14} />
      <Note x={lerp(1060, 700, pan)} y={260} size={230} scale={pop(f, 336, fps)} beamed rotate={-6} />
      <Note x={lerp(700, 370, pan)} y={820} size={170} scale={pop(f, 342, fps)} rotate={-10} />
      <Note x={lerp(1500, 1000, pan)} y={800} size={160} scale={pop(f, 346, fps)} rotate={20} />
      <Stroke d={SCRIBBLES.smallLoop} p={prog(l, 1, 6)} tail={prog(l, 6, 10)} x={1080} y={240} scale={2.2} width={3} color="#ddd" />
    </Dark>
  );
};

// ================= M/O: крупная панорама по иконкам =================
const STRIP = ['vinyl', 'skate', 'clapper', 'plant', 'money', 'heart', 'cap', 'gamepad', 'coin', 'cat', 'camera', 'book', 'vinyl'];
const Strip: React.FC<{ f: number; x: number; blurId?: string }> = ({ f, x, blurId }) => {
  let cx = 0;
  return (
    <Light vig={0.15}>
      <div style={{ position: 'absolute', left: x, top: 540, height: 0, filter: blurId ? `url(#${blurId})` : undefined }}>
        {STRIP.map((n, i) => {
          const w = n === 'skate' || n === 'money' ? 560 : n === 'gamepad' || n === 'cap' ? 460 : n === 'cat' ? 300 : 400;
          const el = (
            <div key={i} style={{ position: 'absolute', left: cx, top: 0, transform: `translateY(-50%) rotate(${i % 2 ? 4 : -5}deg)`, zIndex: i % 2 }}>
              <PixelIcon name={n} size={w} />
            </div>
          );
          cx += w * 0.82;
          return el;
        })}
      </div>
      <SpeedLines f={f} seed={`sl${Math.floor(x)}`.slice(0, 4)} />
    </Light>
  );
};

// ================= Q/R: кольцо распадается, иконки чернеют =================
const Breakup: React.FC<P> = ({ f, l }) => {
  const scatter = prog(f, 364, 380, Easing.inOut(Easing.cubic));
  return (
    <Light vig={0.2}>
      <AbsoluteFill>
        {RING.map(([n, s], i) => {
          const p = ringPos(i, f * 0.03, 960, 560, 560, 320);
          const sp = SCATTER[i];
          const drift = Math.max(0, f - 380);
          const x = lerp(p.x * 0.92 + 77, sp[0], scatter) + Math.sin(i * 3 + drift / 18) * drift * 0.4;
          const y = lerp(p.y * 0.92 + 45, sp[1], scatter) + Math.cos(i * 2 + drift / 20) * drift * 0.3;
          const sil = n === 'heart' ? prog(f, 374, 378) : n === 'skate' ? prog(f, 378, 382) : n === 'cat' ? prog(f, 388, 394) : 0;
          return (
            <div key={n} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${lerp(0, sp[2], scatter)}deg)` }}>
              <PixelIcon name={n} size={lerp(s * 0.85, s * 0.5, scatter)} silhouette={sil} />
            </div>
          );
        })}
      </AbsoluteFill>
      <Stroke d="M 0 0 C 300 -260, 700 -200, 820 100" p={prog(f, 352, 360)} tail={prog(f, 358, 366)} x={700} y={300} width={60} color="#222" blur={12} />
      <InkBlob path={(t) => [lerp(1300, 1250, t), lerp(500, 760, t)]} t={prog(f, 360, 372, Easing.linear)} size={70} trail={0.6} />
      <Stroke d={SCRIBBLES.sCurve} p={prog(f, 376, 381)} tail={prog(f, 381, 386)} x={150} y={180} scale={1.5} width={8} />
      <Stroke d={SCRIBBLES.jHook} p={prog(f, 377, 382)} tail={prog(f, 382, 387)} x={1050} y={160} scale={1.5} width={8} />
      <Stroke d="M 0 0 C -200 300, 300 420, 560 180" p={prog(f, 377, 384)} tail={prog(f, 382, 390)} x={760} y={500} width={50} color="#333" blur={10} />
      {[
        [700, 840, 382, 50],
        [1500, 520, 386, 110],
        [1250, 640, 383, 70],
        [380, 1000, 395, 90],
        [1500, 820, 392, 160],
      ].map(([x, y, at, s], i) => (
        <div key={i} style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s * 0.8, borderRadius: '50%', background: '#121214', transform: `scale(${interpolate(f - at, [0, 3], [0, 1], clamp)}) rotate(${i * 30}deg)`, filter: 'blur(1.5px)' }} />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: random(`sp${i}`) * W, top: random(`spy${i}`) * H + (f - 373) * (1 + random(`sv${i}`)), width: 5, height: 9, borderRadius: 3, background: '#111', transform: `rotate(${random(`sr${i}`) * 180}deg)`, opacity: f > 375 ? 0.8 : 0 }} />
      ))}
    </Light>
  );
};

// ================= S/T/U: рука =================
const HandScene: React.FC<P> = ({ f, l }) => {
  const intro = f < 418;
  const rise = prog(f, 408, 430, Easing.out(Easing.cubic));
  const redT = prog(f, 463, 466) - prog(f, 467, 469);
  const greyT = prog(f, 467, 470);
  const bg = greyT > 0 ? `rgb(${lerp(60, 92, greyT)},${lerp(14, 90, greyT)},${lerp(16, 92, greyT)})` : `rgb(${lerp(11, 60, redT)},${lerp(10, 14, redT)},${lerp(12, 16, redT)})`;
  const left = f < 413 ? 'through' : 'through ones';
  const right = f < 425 ? '' : f < 433 ? 'own' : f < 468 ? 'own ability' : 'own ability to';
  return (
    <AbsoluteFill style={{ background: bg }}>
      {intro ? (
        <>
          <Stroke d="M 0 0 C 120 -200, 260 40, 160 300 C 100 420, 260 460, 300 380" p={prog(f, 408, 413)} tail={prog(f, 412, 417)} x={860} y={300} width={22} color="#ddd" blur={10} />
          <div style={{ position: 'absolute', left: 780, top: 220 + (1 - rise) * 160, filter: 'blur(16px) hue-rotate(-20deg) saturate(1.6)', opacity: 0.9 }}>
            <ThermalHand width={430} frame={f} />
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', left: 700, top: 120 + (1 - rise) * 60, opacity: 1 - greyT * 0.35, filter: greyT > 0 ? `blur(${greyT * 4}px)` : undefined }}>
          <ThermalHand width={560} frame={f} />
        </div>
      )}
      {greyT > 0
        ? [0, 1, 2].map((i) => <div key={i} style={{ position: 'absolute', left: 900 + i * 20, top: 260 + i * 22, width: 260 - i * 50, height: 4, background: '#fff', opacity: 0.7, filter: 'blur(1px)' }} />)
        : null}
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: 700 + random(`hp${i}`) * 520, top: ((random(`hpy${i}`) * 700 + (f - 408) * (0.6 + random(`hs${i}`))) % 760) + 60, width: 5, height: 8, borderRadius: 3, background: '#e8e8e8', opacity: 0.8 }} />
      ))}
      <Label text={left} x={190} y={540} size={66} color="#e6e6e6" blur={intro ? 7 : 0} weight={700} />
      {right ? <Label text={right} x={1240} y={540} size={66} color="#e6e6e6" weight={700} cursor={f < 430 ? <Cursor f={f} type="block" size={66} color="#fff" blink={false} /> : null} /> : null}
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ================= V–Y: L O V E с иконками =================
const LetterRow: React.FC<{ show: string; color: string }> = ({ show, color }) => (
  <>
    {(['L', 'O', 'V', 'E'] as const).map((c, i) =>
      show.includes(c) ? <Label key={c} text={c} x={[230, 740, 1210, 1700][i]} y={540} size={78} color={color} weight={800} anchor="center" /> : null,
    )}
  </>
);

const LoveScene: React.FC<P> = ({ f, fps }) => {
  if (f < 484) {
    const c = f < 476 ? 6 : f < 478 ? 3 : 1;
    const sh = prog(f, 479, 482);
    return (
      <Light vig={0.15}>
        <div style={{ position: 'absolute', left: 960 - 210, top: 540 - 190, width: 420, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,20,22,0.95) 0%, rgba(20,20,22,0.6) 45%, rgba(20,20,22,0) 72%)', opacity: sh, filter: 'blur(10px)' }} />
        <div style={{ position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)' }}>
          <PixelIcon name="heart" size={260} coarse={c} />
        </div>
        <LetterRow show="L" color="#222" />
      </Light>
    );
  }
  if (f < 493) {
    const glow = prog(f, 488, 491);
    return (
      <Dark>
        <div style={{ position: 'absolute', left: 960 - 260, top: 540 - 240, width: 520, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, #ff1a1a 0%, rgba(220,20,20,0.6) 40%, rgba(200,0,0,0) 70%)', opacity: glow }} />
        <div style={{ position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)' }}>
          <PixelIcon name="camera" size={300} />
        </div>
        <LetterRow show="LO" color="#eee" />
      </Dark>
    );
  }
  if (f < 498)
    return (
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #d8161e, #a00c12)` }}>
        <div style={{ position: 'absolute', left: 980, top: 540, transform: 'translate(-50%,-50%) perspective(800px) rotateX(20deg) rotateZ(-16deg)' }}>
          <PixelIcon name="book" size={330} />
        </div>
        {(['L', 'O', 'V'] as const).map((c, i) => (
          <Label key={c} text={c} x={[230, 740, 1210][i]} y={540} size={78} color="#7fc8f0" weight={800} anchor="center" />
        ))}
      </AbsoluteFill>
    );
  const spin = prog(f, 498, 503, Easing.out(Easing.cubic));
  const glow = prog(f, 507, 513);
  return (
    <Dark>
      <LetterRow show={f < 503 ? 'LOV' : 'LOVE'} color="#eee" />
      <div style={{ position: 'absolute', left: 960 - 320, top: 540 - 320, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 70%)', opacity: glow, filter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', left: 960, top: 540, transform: `translate(-50%,-50%) scaleX(${lerp(0.08, 1, spin)}) rotate(${f * 12}deg)` }}>
        <PixelIcon name="vinyl" size={lerp(200, 300, spin)} />
      </div>
    </Dark>
  );
};

// ================= Z–AB: буквы дрейфуют, красные петли, схлопывание =================
const LETTERS: { c: string; start: [number, number, number]; end: [number, number] }[] = [
  { c: 'V', start: [520, 220, -150], end: [650, 360] },
  { c: 'O', start: [1560, 300, 40], end: [990, 360] },
  { c: 'L', start: [460, 820, 110], end: [720, 770] },
  { c: 'E', start: [1500, 760, -80], end: [1250, 780] },
];
const DOTS: [number, number][] = [
  [700, 330],
  [1380, 380],
  [300, 700],
  [1100, 640],
  [1650, 180],
];
const LOOPS: [number, number, number, number, number][] = [
  [532, 1, 70, 60, 0],
  [546, 0, 60, 50, 1],
  [560, 3, 80, 50, 0],
  [572, 0, 80, 120, 1],
  [578, 1, 70, 110, 0],
  [583, 2, 140, 90, 1],
  [587, 3, 180, 60, 0],
  [590, 0, 220, 80, 1],
  [593, 1, 120, 200, 0],
  [596, 2, 90, 180, 0],
  [598, 3, 200, 110, 1],
  [600, 0, 160, 130, 1],
];

const Drift: React.FC<P> = ({ f }) => {
  const collapse = prog(f, 603, 609, Easing.in(Easing.cubic));
  const settle = prog(f, 519, 590, Easing.inOut(Easing.cubic));
  const pos = (i: number) => {
    const L = LETTERS[i];
    const x = lerp(L.start[0], L.end[0], settle) + Math.sin(f / 13 + i * 2) * 14 * (1 - settle * 0.7);
    const y = lerp(L.start[1], L.end[1], settle) + Math.cos(f / 11 + i) * 12 * (1 - settle * 0.7);
    return [lerp(x, 960, collapse), lerp(y, 540, collapse)] as const;
  };
  const size = lerp(60, 118, prog(f, 586, 603, Easing.in(Easing.quad)));
  return (
    <Light vig={0.12}>
      {f < 520
        ? [
            ['M 0 0 C 80 -60, 160 40, 120 140 C 80 240, 200 260, 260 200', 180, 140, 30],
            ['M 0 0 C 120 -40, 220 20, 240 80', 1100, 230, 26],
            ['M 0 0 C 200 160, 420 200, 560 -40', 1080, 760, 34],
          ].map(([d, x, y, w], i) => (
            <Stroke key={i} d={d as string} p={prog(f, 513, 517)} x={x as number} y={y as number} width={w as number} color="#2a2a2e" blur={5} scale={1.6} opacity={1 - prog(f, 517, 520)} />
          ))
        : null}
      {DOTS.map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: lerp(x + Math.sin(f / 15 + i) * 10, 960, collapse), top: lerp(y, 540, collapse), width: 8, height: 8, borderRadius: 4, background: '#1a1a1a' }} />
      ))}
      {LETTERS.map((L, i) => {
        const [x, y] = pos(i);
        const rot = lerp(L.start[2], i % 2 ? -8 : 6, settle) + Math.sin(f / 9 + i) * 6;
        return <Label key={L.c} text={L.c} x={x} y={y} size={size * (1 - collapse * 0.5)} color="#1a1a1e" weight={800} anchor="center" rotate={rot} />;
      })}
      {LOOPS.map(([at, li, rx, ry, big], k) => {
        const [x, y] = pos(li);
        const age = f - at;
        if (age < 0 || age > 16) return null;
        return (
          <Stroke key={k} d={loopPath(x + Math.cos(k * 2.3) * rx * 0.35, y + Math.sin(k * 2.3) * ry * 0.35, rx * 0.45, ry * (big ? 1.1 : 0.8), `lp${k}`, big ? 1.4 : 1.15, 0.12, k * 1.7)} p={prog(age, 0, 5)} opacity={interpolate(age, [8, 14], [1, 0], clamp)} width={2.4} color="#c41a1a" />
        );
      })}
      {f >= 603 ? (
        <>
          {Array.from({ length: 5 }, (_, k) => (
            <Stroke key={k} d={loopPath(960, 540, 60 + k * 30, 40 + k * 18, `tg${k}`, 1.5)} p={prog(f, 603 + k * 0.6, 607)} width={34 - k * 4} color="#121214" />
          ))}
          {Array.from({ length: 7 }, (_, k) => (
            <Stroke key={`r${k}`} d={loopPath(960 + (k - 3) * 30, 520, 120 + k * 25, 60 + k * 12, `tr${k}`, 1.2)} p={prog(f, 603, 607)} width={2.5} color="#c41a1a" />
          ))}
        </>
      ) : null}
    </Light>
  );
};

const RedHow: React.FC<P> = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #d01219, #9e0b10)' }}>
    <div style={{ position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%) scale(1, 2.8)', fontFamily: FONT, fontWeight: 800, fontSize: 340, color: INK, letterSpacing: -14, filter: 'url(#hblur6)' }}>how</div>
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <line x1={0} x2={W} y1={1050} y2={1050} stroke={INK} strokeWidth={6} strokeDasharray="40 20" />
    </svg>
  </AbsoluteFill>
);

// ================= Монтаж =================
type Shot = [number, number, React.FC<P>];
const SHOTS: Shot[] = [
  [0, 12, ({ l }) => <BigStrip l={l} from={180} to={-900} dur={12} bar />],
  [12, 18, Morse],
  [18, 24, SelectBox],
  [24, 54, Typing],
  [54, 58, RedFlash],
  [58, 108, Spotlight],
  [108, 115, Orb],
  [115, 171, HeadScene],
  [171, 185, ShowIt],
  [185, 195, PixelIn],
  [195, 243, RingScene],
  [243, 270, ActionScene],
  [270, 294, ({ f, l }) => <Strip f={f} x={lerp(80, -2350, prog(l, 0, 24, Easing.linear))} blurId={l < 3 || l > 20 ? 'hblur30' : 'hblur6'} />],
  [294, 313, IntentionScene],
  [313, 328, ({ f, l }) => <Strip f={f} x={lerp(-2600, l < 8 ? -2900 : -4600, l < 8 ? prog(l, 0, 8, Easing.linear) : prog(l, 8, 15, Easing.in(Easing.quad)))} blurId={l < 8 ? 'hblur6' : 'hblur60'} />],
  [328, 352, CuriosityScene],
  [352, 408, Breakup],
  [408, 474, HandScene],
  [474, 513, LoveScene],
  [513, 609, Drift],
  [609, 613, RedHow],
  [613, 621, ({ l }) => <BigStrip l={l} from={760} to={260} dur={8} />],
];

const VO: [string, number, number][] = [
  ['p1', 0.03, 0.88],
  ['p2', 3.44, 1],
  ['p3', 5.08, 1],
  ['p4', 7.8, 1],
  ['p5', 9.45, 1],
  ['p6', 10.98, 1],
  ['p7', 13.15, 0.88],
];

export const Video: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shot = SHOTS.find(([a, b]) => f >= a && f < b) ?? SHOTS[SHOTS.length - 1];
  const Comp = shot[2];
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <FilterDefs />
      <Comp f={f} l={f - shot[0]} fps={fps} />
      <Grain f={f} />
      <Audio src={staticFile('mix.wav')} />
    </AbsoluteFill>
  );
};

export { VO };
