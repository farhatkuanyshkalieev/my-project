import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const C = {
  bg0: '#06111f',
  bg1: '#0c2240',
  gold: '#E3B861',
  goldSoft: 'rgba(227,184,97,0.18)',
  teal: '#3CCBB5',
  blue: '#5B8DEF',
  rose: '#E07A8B',
  white: '#F5F1E8',
  muted: '#93A6C2',
  card: 'rgba(255,255,255,0.055)',
  stroke: 'rgba(255,255,255,0.12)',
};

export const FONT = "'Inter', sans-serif";
export const DISPLAY = "'InterDisplay', 'Inter', sans-serif";

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const useSpr = (delay: number, damping = 16, mass = 0.8) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, mass, stiffness: 120}});
};

export const ease = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1)});

/** Fade + rise + unblur entrance. */
export const Reveal: React.FC<{
  at: number;
  children: React.ReactNode;
  y?: number;
  x?: number;
  scale?: boolean;
  style?: React.CSSProperties;
}> = ({at, children, y = 40, x = 0, scale = false, style}) => {
  const s = useSpr(at);
  const frame = useCurrentFrame();
  if (frame < at) return <div style={{...style, visibility: 'hidden'}}>{children}</div>;
  return (
    <div
      style={{
        opacity: Math.min(1, s * 1.3),
        transform: `translate(${(1 - s) * x}px, ${(1 - s) * y}px) scale(${scale ? 0.6 + 0.4 * s : 1})`,
        filter: s > 0.98 ? undefined : `blur(${(1 - Math.min(1, s)) * 8}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Word-by-word animated headline. */
export const Words: React.FC<{
  text: string;
  at: number;
  size?: number;
  color?: string;
  weight?: number;
  stagger?: number;
  highlight?: string[];
  style?: React.CSSProperties;
}> = ({text, at, size = 64, color = C.white, weight = 700, stagger = 3, highlight = [], style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{fontFamily: DISPLAY, fontSize: size, fontWeight: weight, color, lineHeight: 1.12, letterSpacing: -0.5, ...style}}>
      {words.map((w, i) => {
        const s = spring({frame: frame - at - i * stagger, fps, config: {damping: 15, stiffness: 140}});
        const hl = highlight.some((h) => w.includes(h));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: size * 0.26,
              opacity: s,
              transform: `translateY(${(1 - s) * size * 0.6}px) rotate(${(1 - s) * 4}deg)`,
              color: hl ? C.gold : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Chip: React.FC<{at: number; children: React.ReactNode; color?: string}> = ({at, children, color = C.gold}) => {
  const frame = useCurrentFrame();
  const w = ease(frame, at, at + 18);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, opacity: w}}>
      <div style={{width: 60 * w, height: 3, background: color, borderRadius: 2}} />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: 5,
          color,
          textTransform: 'uppercase',
          clipPath: `inset(0 ${100 - w * 100}% 0 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: string;
}> = ({children, style, accent}) => (
  <div
    style={{
      background: 'linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))',
      border: `1px solid ${C.stroke}`,
      borderRadius: 22,
      padding: '26px 30px',
      boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}
  >
    {accent ? <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: accent}} /> : null}
    {children}
  </div>
);

export const Counter: React.FC<{
  from?: number;
  to: number;
  at: number;
  dur?: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  sep?: boolean;
}> = ({from = 0, to, at, dur = 45, prefix = '', suffix = '', size = 90, color = C.white, sep = true}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [at, at + dur], [from, to], {...clamp, easing: Easing.out(Easing.cubic)});
  const n = Math.round(v);
  const s = sep ? n.toLocaleString('en-US').replace(/,/g, ' ') : String(n);
  return (
    <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: size, color, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
      {prefix}
      {s}
      {suffix}
    </div>
  );
};

export const Sfx: React.FC<{at: number; name: string; volume?: number}> = ({at, name, volume = 0.5}) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** Self-drawing SVG line. */
export const DrawLine: React.FC<{
  d: string;
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  len?: number;
  dash?: boolean;
}> = ({d, at, dur = 30, color = C.gold, width = 3, len = 3000, dash}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, at + dur);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dash ? '8 10' : `${len}`}
      strokeDashoffset={dash ? 0 : len * (1 - p)}
      opacity={dash ? p : 1}
    />
  );
};

/** Animated background: gradient, drifting grid, particles, light sweep. */
export const Background: React.FC<{hue?: string}> = ({hue = C.gold}) => {
  const frame = useCurrentFrame();
  const parts = new Array(46).fill(0).map((_, i) => {
    const x = random(`x${i}`) * 1920;
    const y0 = random(`y${i}`) * 1080;
    const sp = 0.15 + random(`s${i}`) * 0.5;
    const r = 1 + random(`r${i}`) * 2.4;
    const y = (y0 - frame * sp + 1080 * 4) % 1080;
    const tw = 0.25 + 0.5 * Math.abs(Math.sin(frame / 40 + i));
    return {x: x + Math.sin(frame / 90 + i) * 20, y, r, tw};
  });
  const gx = (frame * 0.4) % 80;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 30% 20%, ${C.bg1} 0%, ${C.bg0} 62%, #030810 100%)`}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          backgroundPosition: `${gx}px ${gx}px`,
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 35%, rgba(4,10,20,0.85) 85%)'}} />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          left: 1100 + Math.sin(frame / 120) * 120,
          top: -300 + Math.cos(frame / 140) * 80,
          background: `radial-gradient(circle, ${hue}22 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          left: -200 + Math.cos(frame / 110) * 100,
          top: 500 + Math.sin(frame / 130) * 60,
          background: `radial-gradient(circle, ${C.teal}18 0%, transparent 65%)`,
        }}
      />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {parts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={i % 3 === 0 ? C.gold : '#ffffff'} opacity={p.tw * 0.5} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- Icons (simple line icons) ---------------- */
type IP = {size?: number; color?: string; sw?: number};
const Svg: React.FC<IP & {children: React.ReactNode}> = ({size = 48, color = C.gold, sw = 2.2, children}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
export const Icon = {
  plane: (p: IP) => (
    <Svg {...p}>
      <path d="M2 16l20-7-3-2-7 2-5-5-2 1 3 6-4 1-2-2-1 1 2 4z" />
    </Svg>
  ),
  hotel: (p: IP) => (
    <Svg {...p}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
    </Svg>
  ),
  merge: (p: IP) => (
    <Svg {...p}>
      <path d="M6 3v6a6 6 0 006 6h0a6 6 0 006-6V3M12 15v6" />
    </Svg>
  ),
  pin: (p: IP) => (
    <Svg {...p}>
      <path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  ),
  globe: (p: IP) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </Svg>
  ),
  bed: (p: IP) => (
    <Svg {...p}>
      <path d="M3 18V7M3 13h18v5M21 13a3 3 0 00-3-3h-7v3M7 10.5a1.5 1.5 0 100 .01" />
    </Svg>
  ),
  crane: (p: IP) => (
    <Svg {...p}>
      <path d="M6 21V4l12 3H6M10 21h-8M15 7v5M15 12a1.5 1.5 0 101 1" />
    </Svg>
  ),
  key: (p: IP) => (
    <Svg {...p}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l2 2M15 8l2 2" />
    </Svg>
  ),
  shield: (p: IP) => (
    <Svg {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </Svg>
  ),
  phone: (p: IP) => (
    <Svg {...p}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </Svg>
  ),
  calendar: (p: IP) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 15l2 2 4-4" />
    </Svg>
  ),
  gift: (p: IP) => (
    <Svg {...p}>
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1z" />
    </Svg>
  ),
  leaf: (p: IP) => (
    <Svg {...p}>
      <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l8-8" />
    </Svg>
  ),
  drop: (p: IP) => (
    <Svg {...p}>
      <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" />
    </Svg>
  ),
  bolt: (p: IP) => (
    <Svg {...p}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </Svg>
  ),
  cloud: (p: IP) => (
    <Svg {...p}>
      <path d="M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.3 3.3 0 007 18z" />
    </Svg>
  ),
  handshake: (p: IP) => (
    <Svg {...p}>
      <path d="M2 12l4-4 4 2 3-2 3 1 4-2 2 5-4 4M6 8l6 9 2-1 2 1 2-2M9 14l2 2" />
    </Svg>
  ),
  chart: (p: IP) => (
    <Svg {...p}>
      <path d="M3 21h18M5 17l5-5 4 3 6-8M16 7h4v4" />
    </Svg>
  ),
  star: (p: IP) => (
    <Svg {...p}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </Svg>
  ),
  layers: (p: IP) => (
    <Svg {...p}>
      <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
    </Svg>
  ),
  heart: (p: IP) => (
    <Svg {...p}>
      <path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z" />
    </Svg>
  ),
  check: (p: IP) => (
    <Svg {...p}>
      <path d="M5 12l5 5 9-10" />
    </Svg>
  ),
  coin: (p: IP) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 9h6M9 12h6M12 9v8" />
    </Svg>
  ),
};

/** Rotating wireframe globe with city pings and growing flight arcs. */
const CITIES: [number, number][] = [
  [51.5, -0.1], [40.7, -74], [31.2, 121.5], [25.2, 55.3], [1.3, 103.8], [-33.9, 151.2], [43.2, 76.9],
  [48.9, 2.35], [-23.5, -46.6], [35.1, -90], [35.7, 139.7], [19.4, -99.1], [-26.2, 28], [19, 72.8], [55.7, 37.6], [39.9, 116.4],
];
const rad = Math.PI / 180;
const proj = (lat: number, lon: number, rot: number, tilt: number, R: number) => {
  const la = lat * rad;
  const lo = (lon + rot) * rad;
  const x = Math.cos(la) * Math.sin(lo);
  const y = Math.sin(la);
  const z = Math.cos(la) * Math.cos(lo);
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
  const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
  return {x: x * R, y: -y2 * R, z: z2};
};

export const Globe: React.FC<{size?: number; at?: number; arcs?: boolean; highlight?: number}> = ({size = 700, at = 0, arcs = true, highlight}) => {
  const frame = useCurrentFrame();
  const R = size / 2 - 10;
  const rot = -20 + frame * 0.35;
  const tilt = 0.35;
  const appear = ease(frame, at, at + 40);
  const lines: string[] = [];
  const back: string[] = [];
  const pushPath = (pts: {x: number; y: number; z: number}[]) => {
    let front = '';
    let bk = '';
    pts.forEach((p, i) => {
      const prev = pts[i - 1];
      if (p.z >= 0) front += `${prev && prev.z >= 0 ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      else bk += `${prev && prev.z < 0 ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    lines.push(front);
    back.push(bk);
  };
  for (let lon = 0; lon < 180; lon += 20) {
    const pts = [];
    for (let lat = -90; lat <= 270; lat += 6) pts.push(proj(lat <= 90 ? lat : 180 - lat, lat <= 90 ? lon : lon + 180, rot, tilt, R));
    pushPath(pts);
  }
  for (let lat = -60; lat <= 60; lat += 20) {
    const pts = [];
    for (let lon = 0; lon <= 360; lon += 6) pts.push(proj(lat, lon, rot, tilt, R));
    pushPath(pts);
  }
  const hub = CITIES[0];
  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{overflow: 'visible', opacity: appear}}>
      <defs>
        <radialGradient id="gglow" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#1d4a7a" stopOpacity={0.9} />
          <stop offset="70%" stopColor="#0b1f3a" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#06101f" stopOpacity={1} />
        </radialGradient>
      </defs>
      <circle r={R + 30} fill={`${C.teal}10`} />
      <circle r={R} fill="url(#gglow)" stroke={`${C.teal}66`} strokeWidth={2} />
      {back.map((d, i) => (
        <path key={`b${i}`} d={d} stroke="rgba(255,255,255,0.05)" strokeWidth={1} fill="none" />
      ))}
      {lines.map((d, i) => (
        <path key={`f${i}`} d={d} stroke="rgba(120,200,255,0.22)" strokeWidth={1.2} fill="none" />
      ))}
      {arcs &&
        CITIES.slice(1).map((c, i) => {
          const start = at + 30 + i * 8;
          const p = ease(frame, start, start + 40);
          if (p <= 0) return null;
          const pts: {x: number; y: number; z: number}[] = [];
          const N = 30;
          for (let k = 0; k <= N * p; k++) {
            const t = k / N;
            const lat = hub[0] + (c[0] - hub[0]) * t;
            const lon = hub[1] + (c[1] - hub[1]) * t;
            const h = 1 + Math.sin(Math.PI * t) * 0.18;
            const q = proj(lat, lon, rot, tilt, R * h);
            pts.push(q);
          }
          let d = '';
          let prevVis = false;
          for (const q of pts) {
            const vis = q.z > 0 || Math.hypot(q.x, q.y) > R;
            if (vis) d += `${prevVis ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
            prevVis = vis;
          }
          return <path key={`a${i}`} d={d} stroke={C.gold} strokeWidth={2} fill="none" opacity={0.75} />;
        })}
      {CITIES.map((c, i) => {
        const q = proj(c[0], c[1], rot, tilt, R);
        if (q.z < 0) return null;
        const ping = ((frame + i * 13) % 60) / 60;
        const isH = highlight === i;
        return (
          <g key={`c${i}`} transform={`translate(${q.x},${q.y})`} opacity={Math.min(1, q.z * 3)}>
            <circle r={4 + ping * (isH ? 30 : 16)} fill="none" stroke={isH ? C.gold : C.teal} strokeWidth={2} opacity={1 - ping} />
            <circle r={isH ? 7 : 4.5} fill={isH ? C.gold : C.white} />
          </g>
        );
      })}
    </svg>
  );
};

export const SceneFrame: React.FC<{children: React.ReactNode; dur: number}> = ({children, dur}) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [dur - 12, dur], [1, 0], clamp);
  const inn = interpolate(frame, [0, 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{opacity: Math.min(out, inn), transform: out < 1 ? `scale(${1 + (1 - out) * 0.04})` : undefined, filter: out < 1 ? `blur(${(1 - out) * 6}px)` : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

export const Header: React.FC<{chip: string; title: string; at?: number; color?: string; highlight?: string[]}> = ({
  chip,
  title,
  at = 0,
  color = C.gold,
  highlight,
}) => (
  <div style={{position: 'absolute', left: 120, top: 90, right: 120}}>
    <Chip at={at} color={color}>
      {chip}
    </Chip>
    <div style={{height: 18}} />
    <Words text={title} at={at + 6} size={62} highlight={highlight} />
  </div>
);
