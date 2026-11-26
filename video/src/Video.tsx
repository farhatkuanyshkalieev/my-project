import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import '@fontsource/nunito/cyrillic-800.css';
import '@fontsource/nunito/cyrillic-900.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import T from './timeline.json';
import { PixelIcon } from './pixel';
import { ThermalHand, ThermalHead } from './thermal';

const S = T.scenes;
const LIGHT = '#e7e7e9';
const DARK = '#0d0d10';
const ACID = '#b4ff2e';
const RED = '#e5231b';
const YELLOW = '#e9b21f';
const INK = '#17171c';
const FONT = 'Nunito, sans-serif';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type TypingKey = keyof typeof T.typing;

// ---------- общие элементы ----------

const Cursor: React.FC<{ f: number; color: string; size: number; solid?: boolean }> = ({ f, color, size, solid }) => (
  <span
    style={{
      display: 'inline-block',
      width: size * 0.09,
      height: size * 0.95,
      marginLeft: size * 0.08,
      background: color,
      verticalAlign: 'middle',
      transform: `translateY(-${size * 0.06}px)`,
      opacity: solid || Math.floor(f / 8) % 2 === 0 ? 1 : 0,
    }}
  />
);

const Typed: React.FC<{
  k: TypingKey;
  f: number;
  size: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  cursorUntil?: number;
  style?: React.CSSProperties;
}> = ({ k, f, size, color, align = 'left', cursorUntil = 1e9, style }) => {
  const t = T.typing[k];
  const n = Math.max(0, Math.min(t.text.length, Math.floor((f - t.start) / t.fpc) + 1));
  if (f < t.start - 4) return null;
  const typing = n < t.text.length;
  const shown = t.text.slice(0, n);
  const lines = shown.split('\n');
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        color,
        lineHeight: 1.05,
        letterSpacing: -size * 0.025,
        textAlign: align,
        whiteSpace: 'pre',
        ...style,
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>
          {l}
          {i === lines.length - 1 && f < cursorUntil ? <Cursor f={f} color={color} size={size} solid={typing} /> : null}
        </div>
      ))}
    </div>
  );
};

const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.35 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

const Grain: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: 0.22, pointerEvents: 'none' }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 30} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

// Звёздочка-взрыв как в референсе
const Burst: React.FC<{ age: number; color: string; size: number; x: number; y: number }> = ({ age, color, size, x, y }) => {
  if (age < 0 || age > 9) return null;
  const s = interpolate(age, [0, 2, 9], [0.3, 1.15, 0.2], clamp);
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.38 + random(`b${i}`) * 0.15;
    return `${Math.cos(a) * r * 50},${Math.sin(a) * r * 50}`;
  }).join(' ');
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, transform: `scale(${s}) rotate(${age * 6}deg)`, opacity: interpolate(age, [6, 9], [1, 0], clamp) }}
    >
      <polygon points={pts} fill={color} />
    </svg>
  );
};

const popScale = (f: number, at: number, fps: number) =>
  spring({ frame: f - at, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });

// ---------- сцены ----------

const Scene1: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const bg: [string, number, number, number][] = [
    ['coin', 1500, 230, 0],
    ['sneaker', 330, 800, 1],
    ['heart', 1640, 790, 2],
  ];
  const focus = interpolate(f, [0, 8], [14, 0], clamp);
  return (
    <AbsoluteFill style={{ background: LIGHT }}>
      {bg.map(([name, x, y, i]) => {
        const s = popScale(f, T.bgIconPops[i], fps);
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: x,
              top: y + Math.sin((f + i * 20) / 12) * 12,
              transform: `translate(-50%,-50%) scale(${s}) rotate(${Math.sin(f / 15 + i) * 8}deg)`,
              filter: 'blur(2.5px)',
              opacity: 0.85,
            }}
          >
            <PixelIcon name={name} size={120} />
          </div>
        );
      })}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', filter: `blur(${focus}px)` }}>
        <Typed k="q" f={f} size={92} color={INK} align="center" />
      </AbsoluteFill>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

const Scene2: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const zoom = interpolate(f, [S.s2 - 10, S.s3], [1, 1.08], clamp);
  const headIn = spring({ frame: f - (T.swipe.start + 6), fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div
        style={{
          position: 'absolute',
          right: 120,
          bottom: -40,
          transform: `scale(${zoom}) translateX(${(1 - headIn) * 160}px)`,
          transformOrigin: 'bottom right',
          opacity: headIn,
        }}
      >
        <ThermalHead width={820} frame={f} />
      </div>
      <div style={{ position: 'absolute', left: 170, top: 470 }}>
        <Typed k="ans" f={f} size={110} color="#f4f4f4" />
      </div>
      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};

// Дуга-свайп: круг раскрывает чёрную сцену, по краю светится кислотная дуга
const Swipe: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const p = interpolate(f, [T.swipe.start, T.swipe.end], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const r = p * 2600;
  const cx = -300;
  const cy = 540;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `circle(${r}px at ${cx}px ${cy}px)` }}>{children}</AbsoluteFill>
      {p > 0 && p < 1 ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <filter id="sw" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={18} />
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={ACID} strokeWidth={90} filter="url(#sw)" opacity={0.9} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eaffc2" strokeWidth={10} opacity={0.9} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

const CAROUSEL = ['sneaker', 'book', 'headphones', 'coffee', 'laptop', 'dumbbell', 'plant', 'coin', 'vinyl', 'gamepad'];

const Scene3: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const local = f - S.s3;
  const flyT = Math.max(0, f - T.carouselFlyOut);
  const speed = 0.018 + flyT * 0.004;
  const angleAt = (fr: number) => {
    const l = fr - S.s3;
    const ft = Math.max(0, fr - T.carouselFlyOut);
    return l * 0.018 + ft * ft * 0.002;
  };
  const push = interpolate(local, [0, 70], [0.85, 1.05], { ...clamp, easing: Easing.out(Easing.cubic) });
  const spread = 1 + Math.pow(flyT / 12, 2.2);
  const items = CAROUSEL.map((name, i) => {
    const a = angleAt(f) + (i / CAROUSEL.length) * Math.PI * 2;
    const z = Math.sin(a);
    return { name, i, a, z };
  }).sort((p, q) => p.z - q.z);
  return (
    <AbsoluteFill style={{ background: LIGHT }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {items.map(({ name, i, a, z }) => {
          const s = popScale(f, T.carouselPops[i], fps);
          const x = 960 + Math.cos(a) * 560 * spread;
          const y = 540 + z * 150 * spread - 20;
          const depth = 0.62 + (z + 1) * 0.3;
          const blur = (1 - (z + 1) / 2) * 3 + speed * 120 * (flyT > 0 ? 1 : 0.15);
          return (
            <React.Fragment key={name}>
              {[2, 1].map((g) => {
                const ga = angleAt(f - g * 1.5) + (i / CAROUSEL.length) * Math.PI * 2;
                const gz = Math.sin(ga);
                return (
                  <div
                    key={g}
                    style={{
                      position: 'absolute',
                      left: 960 + Math.cos(ga) * 560 * spread,
                      top: 540 + gz * 150 * spread - 20,
                      transform: `translate(-50%,-50%) scale(${s * depth})`,
                      opacity: 0.18 / g,
                      filter: `blur(${blur + 4}px)`,
                    }}
                  >
                    <PixelIcon name={name} size={190} />
                  </div>
                );
              })}
              <div
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: `translate(-50%,-50%) scale(${s * depth}) rotate(${Math.cos(a) * -10}deg)`,
                  filter: `blur(${blur}px)`,
                }}
              >
                <PixelIcon name={name} size={190} />
              </div>
            </React.Fragment>
          );
        })}
        {T.carouselPops.map((p, i) =>
          i % 3 === 0 ? <Burst key={i} age={f - p} color={RED} size={220} x={960 + Math.cos((i / 10) * Math.PI * 2) * 560} y={530} /> : null,
        )}
      </AbsoluteFill>
      <Vignette strength={0.28} />
    </AbsoluteFill>
  );
};

const DROPS = ['sneaker', 'book', 'dumbbell', 'laptop', 'coffee', 'floppy'];

const Scene4: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const barX = 510;
  const barY = 800;
  const barW = 900;
  const segs = 18;
  const landed = T.drops.filter((d) => f >= d + T.dropFall).length;
  const fill = T.drops.reduce((acc, d) => acc + spring({ frame: f - d - T.dropFall, fps, config: { damping: 14 } }) / T.drops.length, 0);
  const full = landed === T.drops.length;
  const word: TypingKey = f < T.typing.step2.start ? 'step1' : f < T.typing.step3.start ? 'step2' : 'step3';
  const shake = T.drops.some((d) => f - d - T.dropFall >= 0 && f - d - T.dropFall < 4) ? (random(`sh${f}`) - 0.5) * 10 : 0;
  return (
    <AbsoluteFill style={{ background: LIGHT, transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <AbsoluteFill style={{ alignItems: 'center', top: 250 }}>
        <Typed key={word} k={word} f={f} size={150} color={INK} align="center" />
      </AbsoluteFill>
      {/* падающие предметы */}
      {T.drops.map((d, i) => {
        const age = f - d;
        if (age < 0 || age > T.dropFall + 3) return null;
        const p = Math.min(1, age / T.dropFall);
        const tx = barX + 60 + (i / (T.drops.length - 1)) * (barW - 120);
        const y = interpolate(p * p, [0, 1], [-160, barY - 40]);
        const sq = age > T.dropFall ? 1 - (age - T.dropFall) / 3 : 1;
        return (
          <div key={i} style={{ position: 'absolute', left: tx, top: y, transform: `translate(-50%,-50%) scale(${sq}, ${1 / Math.max(sq, 0.4)}) rotate(${(1 - p) * 40}deg)`, filter: `blur(${(1 - p) * 0 + p * 3}px)` }}>
            <PixelIcon name={DROPS[i]} size={140} />
          </div>
        );
      })}
      {/* шкала опыта */}
      <div style={{ position: 'absolute', left: barX - 120, top: barY - 30, fontFamily: FONT, fontWeight: 900, fontSize: 52, color: INK }}>XP</div>
      <div
        style={{
          position: 'absolute',
          left: barX + barW + 30,
          top: barY - 30,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 44,
          color: full ? '#3c9a0e' : INK,
          transform: `scale(${full ? popScale(f, T.drops[5] + T.dropFall, fps) * 1 : 1})`,
        }}
      >
        {full ? 'LVL 2' : 'LVL 1'}
      </div>
      <div style={{ position: 'absolute', left: barX, top: barY - 32, width: barW, height: 64, background: INK, padding: 8, boxSizing: 'border-box', display: 'flex', gap: 6 }}>
        {Array.from({ length: segs }, (_, i) => {
          const on = i < Math.round(fill * segs);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: on ? ACID : '#2c2c34',
                boxShadow: on ? `inset 0 -8px 0 #6fcf1a, 0 0 18px ${ACID}` : 'none',
              }}
            />
          );
        })}
      </div>
      {/* +XP и вспышки */}
      {T.drops.map((d, i) => {
        const age = f - d - T.dropFall;
        const tx = barX + 60 + (i / (T.drops.length - 1)) * (barW - 120);
        if (age < 0 || age > 22) return null;
        return (
          <React.Fragment key={i}>
            <Burst age={age} color={ACID} size={260} x={tx} y={barY - 10} />
            <div
              style={{
                position: 'absolute',
                left: tx,
                top: barY - 120 - age * 4,
                transform: `translate(-50%,0) scale(${popScale(f, d + T.dropFall, fps)})`,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 48,
                color: '#3c9a0e',
                opacity: interpolate(age, [14, 22], [1, 0], clamp),
              }}
            >
              +XP
            </div>
          </React.Fragment>
        );
      })}
      <Vignette strength={0.28} />
    </AbsoluteFill>
  );
};

const Scene5: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const rise = spring({ frame: f - S.s5, fps, config: { damping: 16, mass: 1.2 } });
  const reach = interpolate(f, [S.s5, S.s6], [0, -40], clamp);
  return (
    <AbsoluteFill style={{ background: DARK }}>
      {Array.from({ length: 34 }, (_, i) => {
        const sp = 3 + random(`sp${i}`) * 6;
        const y = 1100 - ((f - S.s5) * sp + random(`sy${i}`) * 900) % 1200;
        const x = 960 + (random(`sx${i}`) - 0.5) * 900 + Math.sin(f / 10 + i) * 20;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 6, height: 6, borderRadius: 3, background: i % 4 === 0 ? ACID : '#ff9a2a', boxShadow: '0 0 12px #ff7a1a', opacity: 0.8 }} />;
      })}
      <div style={{ position: 'absolute', left: 960, top: 1080, transform: `translate(-50%, ${-100 + (1 - rise) * 30 + reach}%)` }}>
        <ThermalHand width={520} frame={f} />
      </div>
      <div style={{ position: 'absolute', left: 150, top: 430 }}>
        <Typed k="act1" f={f} size={84} color="#f4f4f4" cursorUntil={T.typing.act2.start} />
      </div>
      <div style={{ position: 'absolute', right: 150, top: 430 }}>
        <Typed k="act2" f={f} size={84} color={ACID} align="right" />
      </div>
      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};

const LETTERS = ['Д', 'Е', 'Л', 'А', 'Й'];
const scatterPos = (i: number) => ({
  x: 200 + random(`lx${i}`) * 1520,
  y: 160 + random(`ly${i}`) * 760,
  r: (random(`lr${i}`) - 0.5) * 160,
});

const Scene6: React.FC<{ f: number }> = ({ f }) => {
  const local = f - S.s6;
  const step = Math.floor(f / 2);
  const shakeAmp = interpolate(local, [0, 20, 60], [36, 10, 4], clamp);
  const sx = (random(`x${step}`) - 0.5) * shakeAmp;
  const sy = (random(`y${step}`) - 0.5) * shakeAmp;
  const flash = interpolate(local, [0, 3], [1, 0], clamp);
  const bookP = interpolate(f, [S.s6 + 8, S.s6 + 34], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const noise = 'КЖДНЬЧЕРЗТОЫВШГ';
  return (
    <AbsoluteFill style={{ background: RED, transform: `translate(${sx}px, ${sy}px)` }}>
      {Array.from({ length: 16 }, (_, i) => {
        const x = random(`nx${i}`) * 1920;
        const y = random(`ny${i}`) * 1080;
        const vis = random(`nv${i}-${Math.floor(f / 3)}`) > 0.35;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, fontFamily: FONT, fontWeight: 900, fontSize: 40 + random(`ns${i}`) * 60, color: i % 3 ? '#ffd9d6' : INK, opacity: vis ? 0.85 : 0, transform: `rotate(${random(`nr${i}`) * 90 - 45}deg)` }}>
            {noise[i % noise.length]}
          </div>
        );
      })}
      {LETTERS.map((l, i) => {
        const p = scatterPos(i);
        const out = interpolate(local, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const x = 960 + (p.x - 960) * out + Math.sin(f * 0.7 + i) * 6;
        const y = 540 + (p.y - 540) * out + Math.cos(f * 0.6 + i) * 6;
        return (
          <div key={l} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${p.r * out}deg)`, fontFamily: FONT, fontWeight: 900, fontSize: 200, color: '#fff', textShadow: '8px 0 0 rgba(0,255,255,0.0)' }}>
            {l}
          </div>
        );
      })}
      {bookP > 0 && bookP < 1 ? (
        <div style={{ position: 'absolute', left: interpolate(bookP, [0, 1], [-200, 2100]), top: interpolate(bookP, [0, 1], [700, 300]), transform: `translate(-50%,-50%) rotate(${bookP * 540}deg)`, filter: 'blur(5px)' }}>
          <PixelIcon name="book" size={220} />
        </div>
      ) : null}
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

const Scene7: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const zoom = interpolate(f, [S.s7, S.s8], [1, 1.06], clamp);
  const size = 300;
  const finalX = (i: number) => 960 + (i - 2.2) * 215;
  return (
    <AbsoluteFill style={{ background: LIGHT }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {LETTERS.map((l, i) => {
          const p = scatterPos(i);
          const s = spring({ frame: f - T.letters[i], fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
          const sPrev = spring({ frame: f - 1 - T.letters[i], fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
          const vel = Math.abs(s - sPrev);
          const x = p.x + (finalX(i) - p.x) * s;
          const y = p.y + (540 - p.y) * s;
          const waiting = f < T.letters[i];
          return (
            <div
              key={l}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%,-50%) rotate(${p.r * (1 - s)}deg) scale(${waiting ? 0.35 : 1})`,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: waiting ? 200 : size,
                color: waiting ? '#9a9aa2' : INK,
                filter: `blur(${Math.min(14, vel * 90)}px)`,
                opacity: waiting ? 0.6 : 1,
              }}
            >
              {l}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: finalX(4) + 150,
            top: 540,
            width: 52,
            height: 52,
            background: ACID,
            transform: `translate(-50%, 40%) scale(${popScale(f, T.dot, fps)})`,
            boxShadow: '0 0 0 8px #17171c',
          }}
        />
      </AbsoluteFill>
      <Vignette strength={0.28} />
    </AbsoluteFill>
  );
};

const Scene8: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const s = spring({ frame: f - T.saveSlam, fps, config: { damping: 8, stiffness: 260, mass: 0.6 } });
  const scale = 2.4 - 1.4 * s;
  const dash = (f - S.s8) * 6;
  const check = interpolate(f, [T.check, T.check + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const checkPop = popScale(f, T.check, fps);
  return (
    <AbsoluteFill style={{ background: YELLOW }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {[180, 900].map((y, i) => (
          <line key={y} x1={0} x2={1920} y1={y} y2={y} stroke={INK} strokeWidth={8} strokeDasharray="36 26" strokeDashoffset={i ? dash : -dash} />
        ))}
      </svg>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 40 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 230, color: '#3a2a06', letterSpacing: -8, transform: `scale(${scale})`, filter: `blur(${(1 - Math.min(1, s)) * 10}px)` }}>
          сохранено.
        </div>
        <svg width={190} height={190} viewBox="0 0 100 100" style={{ transform: `scale(${checkPop})`, opacity: f >= T.check ? 1 : 0 }}>
          <rect x={4} y={4} width={92} height={92} fill={INK} />
          <path d="M24 52 L43 70 L77 32" fill="none" stroke={ACID} strokeWidth={12} strokeLinecap="square" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - check} />
        </svg>
      </AbsoluteFill>
      <Vignette strength={0.25} />
    </AbsoluteFill>
  );
};

// RGB-сдвиг на кадрах глитча
const Glitch: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const g = T.glitches.find((at) => f >= at && f < at + 4);
  if (g === undefined) return <>{children}</>;
  const off = 14 + random(`g${f}`) * 22;
  const sliceY = random(`gy${f}`) * 900;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${-off}px)`, mixBlendMode: 'normal' }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${off}px)`, opacity: 0.55, filter: 'hue-rotate(160deg) saturate(3)', mixBlendMode: 'screen' }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(${sliceY}px 0 ${1080 - sliceY - 70}px 0)`, transform: `translateX(${off * 3}px)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let scene: React.ReactNode;
  if (f < T.swipe.end) {
    scene =
      f >= T.swipe.start ? (
        <AbsoluteFill>
          <Scene1 f={f} fps={fps} />
          <Swipe f={f}>
            <Scene2 f={f} fps={fps} />
          </Swipe>
        </AbsoluteFill>
      ) : (
        <Scene1 f={f} fps={fps} />
      );
  } else if (f < S.s3) scene = <Scene2 f={f} fps={fps} />;
  else if (f < S.s4) scene = <Scene3 f={f} fps={fps} />;
  else if (f < S.s5) scene = <Scene4 f={f} fps={fps} />;
  else if (f < S.s6) scene = <Scene5 f={f} fps={fps} />;
  else if (f < S.s7) scene = <Scene6 f={f} />;
  else if (f < S.s8) scene = <Scene7 f={f} fps={fps} />;
  else scene = <Scene8 f={f} fps={fps} />;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Glitch f={f}>{scene}</Glitch>
      <Grain f={f} />
      <Audio src={staticFile('mix.wav')} />
    </AbsoluteFill>
  );
};
