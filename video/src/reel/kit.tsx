import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export const DISPLAY = "'InterDisplay', 'Inter', sans-serif";
export const FONT = "'Inter', sans-serif";
export const Y = '#FFE14D'; // caption / accent yellow
export const INK = '#120A2A';
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const PAL: Record<string, string[]> = {
  hook: ['#FF2E79', '#FF8A3D', '#FFC94D'],
  origin: ['#2B4CFF', '#00C2FF', '#7DF9FF'],
  s1: ['#6A1BFF', '#D41BFF', '#FF4FB8'],
  s2: ['#FF4E00', '#FF9500', '#FFD000'],
  s3: ['#E8124F', '#FF5A5F', '#FF9E7A'],
  s4: ['#00A6A6', '#00D68F', '#B6FF6B'],
  s5: ['#00875A', '#2BD46E', '#C8FF5B'],
  kz: ['#0098C8', '#00BFE6', '#FFC72C'],
  outro: ['#5B1BFF', '#FF2E79', '#FF9A3D'],
};

export const ease = (f: number, a: number, b: number, from = 0, to = 1, e = Easing.bezier(0.2, 0.9, 0.3, 1)) =>
  interpolate(f, [a, b], [from, to], {...clamp, easing: e});

export const usePop = (delay: number, damping = 9, stiffness = 180) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, stiffness, mass: 0.7}});
};

export const Sfx: React.FC<{at: number; name: string; volume?: number}> = ({at, name, volume = 0.5}) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none">
    <Audio src={staticFile(`reel/sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** Pops in with overshoot. */
export const Pop: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties; from?: 'scale' | 'up' | 'left' | 'right' | 'rot'}> = ({
  at,
  children,
  style,
  from = 'scale',
}) => {
  const s = usePop(at);
  const frame = useCurrentFrame();
  const vis = frame >= at;
  const tr =
    from === 'scale'
      ? `scale(${s})`
      : from === 'up'
        ? `translateY(${(1 - s) * 160}px)`
        : from === 'left'
          ? `translateX(${(1 - s) * -300}px)`
          : from === 'right'
            ? `translateX(${(1 - s) * 300}px)`
            : `scale(${s}) rotate(${(1 - s) * -25}deg)`;
  return <div style={{...style, opacity: vis ? Math.min(1, s * 2) : 0, transform: tr}}>{children}</div>;
};

export const Big: React.FC<{text: string; at?: number; size?: number; color?: string; stagger?: number; align?: 'left' | 'center'; hl?: string}> = ({
  text,
  at = 0,
  size = 150,
  color = '#fff',
  stagger = 3,
  align = 'center',
  hl,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.98,
        color,
        letterSpacing: -2,
        textAlign: align,
        textShadow: '0 10px 0 rgba(0,0,0,0.18), 0 20px 50px rgba(0,0,0,0.25)',
      }}
    >
      {words.map((w, i) => {
        const s = spring({frame: frame - at - i * stagger, fps, config: {damping: 8, stiffness: 200, mass: 0.6}});
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: size * 0.22,
              transform: `translateY(${(1 - s) * size * 0.9}px) scale(${0.4 + 0.6 * s}) rotate(${(1 - s) * (i % 2 ? 8 : -8)}deg)`,
              opacity: frame >= at + i * stagger ? 1 : 0,
              color: hl && w.includes(hl) ? Y : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Kicker: React.FC<{text: string; at?: number; bg?: string; color?: string}> = ({text, at = 0, bg = '#fff', color = INK}) => {
  const s = usePop(at, 10);
  return (
    <div
      style={{
        display: 'inline-block',
        background: bg,
        color,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 40,
        padding: '10px 26px',
        borderRadius: 14,
        letterSpacing: 3,
        transform: `scale(${s}) rotate(${(1 - s) * -10 - 2}deg)`,
        boxShadow: '0 10px 0 rgba(0,0,0,0.15)',
      }}
    >
      {text}
    </div>
  );
};

/** Card with glassy white look for colourful backgrounds. */
export const Glass: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.18)',
      border: '2px solid rgba(255,255,255,0.45)',
      borderRadius: 32,
      boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
      backdropFilter: 'blur(6px)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Solid: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{background: '#fff', borderRadius: 30, boxShadow: '0 14px 0 rgba(0,0,0,0.15), 0 30px 60px rgba(0,0,0,0.2)', color: INK, ...style}}>{children}</div>
);

/** Confetti burst. */
export const Confetti: React.FC<{at: number; n?: number; x?: number; y?: number}> = ({at, n = 90, x = 960, y = 420}) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / 30;
  if (t < 0 || t > 3) return null;
  const cols = ['#FFE14D', '#FF2E79', '#00D4FF', '#7CFF6B', '#FFFFFF', '#FF8A3D'];
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      {new Array(n).fill(0).map((_, i) => {
        const a = random(`a${i}${at}`) * Math.PI * 2;
        const v = 500 + random(`v${i}${at}`) * 900;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t * 0.8 + 900 * t * t;
        const r = (random(`r${i}`) * 720 + frame * 12) % 360;
        return (
          <rect key={i} x={px} y={py} width={14} height={24} fill={cols[i % cols.length]} transform={`rotate(${r} ${px} ${py})`} opacity={1 - t / 3} />
        );
      })}
    </svg>
  );
};

/** Burst rays (sunburst) */
export const Rays: React.FC<{color?: string; opacity?: number; size?: number}> = ({color = '#fff', opacity = 0.12, size = 2600}) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{position: 'absolute', left: 960 - size / 2, top: 470 - size / 2, opacity}}>
      <g transform={`rotate(${frame * 0.4})`}>
        {new Array(18).fill(0).map((_, i) => (
          <path key={i} d="M0 0 L100 -9 L100 9 Z" fill={color} transform={`rotate(${i * 20})`} />
        ))}
      </g>
    </svg>
  );
};

/** Vibrant animated background with circle-wipe between scene palettes. */
export const VividBg: React.FC<{pal: string[]; prev?: string[]; since: number}> = ({pal, prev, since}) => {
  const frame = useCurrentFrame();
  const layer = (p: string[], key: string) => (
    <AbsoluteFill key={key} style={{background: `linear-gradient(${125 + Math.sin(frame / 60) * 20}deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`}}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          left: 1100 + Math.sin(frame / 50) * 160,
          top: -450 + Math.cos(frame / 45) * 100,
          background: `radial-gradient(circle, ${p[2]}cc 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          left: -350 + Math.cos(frame / 55) * 140,
          top: 450 + Math.sin(frame / 40) * 90,
          background: `radial-gradient(circle, ${p[0]}dd 0%, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
  const wipe = ease(frame, since, since + 16, 0, 1, Easing.bezier(0.6, 0, 0.3, 1));
  return (
    <AbsoluteFill>
      {prev && wipe < 1 ? layer(prev, 'prev') : null}
      <AbsoluteFill style={{clipPath: prev ? `circle(${wipe * 120}% at 50% 50%)` : undefined}}>{layer(pal, 'cur')}</AbsoluteFill>
      {/* diagonal stripes texture */}
      <AbsoluteFill
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 46px)',
          backgroundPosition: `${frame * 1.2}px 0`,
        }}
      />
      <Shapes />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(10,0,30,0.35) 100%)'}} />
    </AbsoluteFill>
  );
};

const Shapes: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {new Array(16).fill(0).map((_, i) => {
        const x = (random(`sx${i}`) * 2200 + frame * (0.6 + random(`sp${i}`) * 1.4)) % 2200 - 140;
        const y = random(`sy${i}`) * 1080 + Math.sin(frame / 30 + i) * 30;
        const r = 10 + random(`sr${i}`) * 34;
        const k = i % 4;
        const rot = frame * (i % 2 ? 1 : -1) * 1.2;
        return (
          <g key={i} transform={`translate(${x},${y}) rotate(${rot})`} opacity={0.35}>
            {k === 0 && <circle r={r} fill="none" stroke="#fff" strokeWidth={5} />}
            {k === 1 && <rect x={-r / 2} y={-r / 2} width={r} height={r} fill="#fff" opacity={0.7} rx={4} />}
            {k === 2 && <path d={`M${-r / 2} 0 H${r / 2} M0 ${-r / 2} V${r / 2}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" />}
            {k === 3 && <path d={`M0 ${-r / 1.6} L${r / 1.8} ${r / 3} L${-r / 1.8} ${r / 3} Z`} fill="none" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />}
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- icons (bold, rounded) ---------- */
type IP = {size?: number; color?: string; sw?: number};
const S: React.FC<IP & {children: React.ReactNode}> = ({size = 120, color = '#fff', sw = 2, children}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
export const I: Record<string, (p: IP) => React.ReactElement> = {
  hotel: (p) => (
    <S {...p}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
    </S>
  ),
  plane: (p) => (
    <S {...p}>
      <path d="M2 16l20-7-3-2-7 2-5-5-2 1 3 6-4 1-2-2-1 1 2 4z" />
    </S>
  ),
  crane: (p) => (
    <S {...p}>
      <path d="M6 21V4l12 3H6M10 21H2M15 7v5M14 12h2v2h-2z" />
    </S>
  ),
  lock: (p) => (
    <S {...p}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0" />
      <circle cx="12" cy="16" r="1.4" />
    </S>
  ),
  coin: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9h6M9 12h6M12 9v8" />
    </S>
  ),
  star: (p) => (
    <S {...p}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </S>
  ),
  shield: (p) => (
    <S {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </S>
  ),
  calendar: (p) => (
    <S {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 15l2 2 4-4" />
    </S>
  ),
  rocket: (p) => (
    <S {...p}>
      <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c1-4 5-9 13-9 0 8-5 12-9 13z" />
      <circle cx="15" cy="9" r="1.6" />
    </S>
  ),
  heart: (p) => (
    <S {...p}>
      <path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z" />
    </S>
  ),
  globe: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </S>
  ),
  tea: (p) => (
    <S {...p}>
      <path d="M4 10h13v4a6 6 0 01-6 6h-1a6 6 0 01-6-6zM17 11h1.5a2.5 2.5 0 010 5H17M8 3c-1 1.5 1 2 0 4M12 3c-1 1.5 1 2 0 4" />
    </S>
  ),
  temple: (p) => (
    <S {...p}>
      <path d="M3 8c3 0 6-2 9-5 3 3 6 5 9 5M5 8v3h14V8M6 11v9M18 11v9M10 11v9M14 11v9M3 20h18" />
    </S>
  ),
  bowl: (p) => (
    <S {...p}>
      <path d="M3 11h18a9 9 0 01-18 0zM8 20h8M14 3l-4 8M18 4l-6 7" />
    </S>
  ),
  car: (p) => (
    <S {...p}>
      <path d="M3 16v-4l2-5h14l2 5v4zM3 16v2h3v-2M18 16v2h3v-2M3 12h18" />
      <circle cx="7" cy="14" r="1" />
      <circle cx="17" cy="14" r="1" />
    </S>
  ),
  phone: (p) => (
    <S {...p}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </S>
  ),
  gift: (p) => (
    <S {...p}>
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1z" />
    </S>
  ),
  repeat: (p) => (
    <S {...p}>
      <path d="M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4" />
    </S>
  ),
  handshake: (p) => (
    <S {...p}>
      <path d="M2 12l4-4 4 2 3-2 3 1 4-2 2 5-4 4M6 8l6 9 2-1 2 1 2-2M9 14l2 2" />
    </S>
  ),
  leaf: (p) => (
    <S {...p}>
      <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l8-8" />
    </S>
  ),
  bolt: (p) => (
    <S {...p}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </S>
  ),
  drop: (p) => (
    <S {...p}>
      <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" />
    </S>
  ),
  pin: (p) => (
    <S {...p}>
      <path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </S>
  ),
  check: (p) => (
    <S {...p}>
      <path d="M5 12l5 5 9-10" />
    </S>
  ),
  key: (p) => (
    <S {...p}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l2 2M15 8l2 2" />
    </S>
  ),
  layers: (p) => (
    <S {...p}>
      <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
    </S>
  ),
  chat: (p) => (
    <S {...p}>
      <path d="M4 5h16v11H9l-5 4z" />
    </S>
  ),
  wallet: (p) => (
    <S {...p}>
      <path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l12-4 1 4M16 13.5h2" />
    </S>
  ),
};
