import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {body, C, display, FOOTAGE} from './theme';
import timeline from './timeline.json';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const usePop = (delay = 0, damping = 12) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, stiffness: 170, mass: 0.8}});
};

/* ---------- Backgrounds ---------- */

// Dark navy stage with slowly sweeping light beams, like the reference's spotlight look.
export const Stage: React.FC<{beams?: boolean}> = ({beams = true}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 70% at 50% 38%, ${C.bgDeep} 0%, ${C.bg} 62%, #02060F 100%)`,
      }}
    >
      {beams &&
        [-38, -20, -6, 8, 22, 40].map((a, i) => {
          const sway = Math.sin(frame / 40 + i * 1.7) * 6;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 540 - 90,
                top: -200,
                width: 180,
                height: 2300,
                transformOrigin: '50% 0%',
                transform: `rotate(${a + sway}deg)`,
                background: `linear-gradient(180deg, rgba(255,236,228,${0.2 - (i % 3) * 0.04}) 0%, rgba(210,58,85,0.07) 55%, transparent 80%)`,
                filter: 'blur(18px)',
                mixBlendMode: 'screen',
              }}
            />
          );
        })}
      <Particles />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(70% 45% at 50% 100%, rgba(166,30,54,0.38), transparent 70%)',
        }}
      />
    </AbsoluteFill>
  );
};

export const Particles: React.FC<{count?: number}> = ({count = 34}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const speed = 0.6 + random(`s${i}`) * 1.6;
        const y = (((random(`y${i}`) * 2100 - frame * speed) % 2100) + 2100) % 2100 - 90;
        const size = 3 + random(`r${i}`) * 7;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / 14 + i));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: C.cream,
              opacity: 0.55 * tw,
              boxShadow: `0 0 ${size * 3}px ${C.accent}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- Tooth ---------- */

const TOOTH =
  'M100 30 C 72 8, 28 12, 22 62 C 17 102, 38 128, 44 168 C 50 212, 60 232, 73 229 C 87 226, 86 182, 100 166 C 114 182, 113 226, 127 229 C 140 232, 150 212, 156 168 C 162 128, 183 102, 178 62 C 172 12, 128 8, 100 30 Z';

// Glassy tooth with a light sweep running across it.
export const Tooth: React.FC<{size: number; shine?: number; glow?: number}> = ({
  size,
  shine = 0,
  glow = 1,
}) => {
  const id = React.useId().replace(/:/g, '');
  const sweep = interpolate(shine, [0, 1], [-0.6, 1.6]);
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id={`body${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#F7EEE9" />
          <stop offset="1" stopColor="#C9A9A4" />
        </linearGradient>
        <linearGradient id={`shine${id}`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset={sweep - 0.15} stopColor="#fff" stopOpacity="0" />
          <stop offset={sweep} stopColor="#fff" stopOpacity="0.95" />
          <stop offset={sweep + 0.15} stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`glow${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id={`clip${id}`}>
          <path d={TOOTH} />
        </clipPath>
      </defs>
      <path d={TOOTH} fill={C.accent} opacity={0.75 * glow} filter={`url(#glow${id})`} />
      <path d={TOOTH} fill={`url(#body${id})`} />
      <g clipPath={`url(#clip${id})`}>
        <ellipse cx="70" cy="70" rx="22" ry="44" fill="#fff" opacity="0.55" transform="rotate(-18 70 70)" />
        <path d="M60 120 C 80 140, 120 140, 140 120" stroke="#A61E36" strokeOpacity="0.2" strokeWidth="6" fill="none" />
        <rect x="0" y="0" width="200" height="240" fill={`url(#shine${id})`} />
      </g>
      <path d={TOOTH} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="3" />
    </svg>
  );
};

/* ---------- Logo ---------- */

const LOGO_TOOTH =
  'M150 40 C 110 15, 40 20, 35 85 C 30 140, 60 175, 70 230 C 78 275, 95 285, 110 270 C 122 255, 125 215, 150 205 C 175 215, 178 255, 190 270 C 205 285, 222 275, 230 230 C 240 175, 270 140, 265 85 C 260 20, 190 15, 150 40 Z';

export const Sparkle: React.FC<{size: number; color?: string; style?: React.CSSProperties}> = ({size, color = C.white, style}) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={style}>
    <path d="M0 -10 C 1 -2, 2 -1, 10 0 C 2 1, 1 2, 0 10 C -1 2, -2 1, -10 0 C -2 -1, -1 -2, 0 -10 Z" fill={color} />
  </svg>
);

// Thick tooth outline with the wordmark inside and a sparkle, after the Atlantis Dent logo;
// `draw` animates the outline, then the text and sparkle come in.
export const Logo: React.FC<{scale?: number; draw?: number; light?: boolean}> = ({scale = 1, draw = 1, light = true}) => {
  const len = 1000;
  const color = light ? C.white : '#111';
  const text = interpolate(draw, [0.55, 1], [0, 1], clamp);
  return (
    <div style={{transform: `scale(${scale})`, width: 300, height: 300, position: 'relative'}}>
      <svg width={300} height={300} viewBox="0 0 300 300" style={{overflow: 'visible', filter: light ? `drop-shadow(0 0 22px ${C.accent}66)` : 'none'}}>
        <path
          d={LOGO_TOOTH}
          fill="none"
          stroke={color}
          strokeWidth={22}
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - draw)}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 100,
          width: '100%',
          textAlign: 'center',
          fontFamily: body,
          fontWeight: 800,
          color,
          lineHeight: 1.05,
          opacity: text,
          transform: `translateY(${(1 - text) * 12}px)`,
        }}
      >
        <div style={{fontSize: 31, letterSpacing: 0.5}}>ATLANTIS</div>
        <div style={{fontSize: 34, letterSpacing: 1}}>DENT</div>
      </div>
      <Sparkle
        size={28}
        color={color}
        style={{position: 'absolute', left: 74, top: 74, transform: `scale(${text}) rotate(${(1 - text) * 90}deg)`}}
      />
    </div>
  );
};

/* ---------- HUD ---------- */

export const Brackets: React.FC<{w: number; h: number; progress: number; color?: string}> = ({
  w,
  h,
  progress,
  color = C.accent,
}) => {
  const L = 70;
  const off = interpolate(progress, [0, 1], [60, 0]);
  const corner = (rot: number, x: number, y: number) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: L,
        height: L,
        borderLeft: `8px solid ${color}`,
        borderTop: `8px solid ${color}`,
        transform: `rotate(${rot}deg)`,
        opacity: progress,
        filter: `drop-shadow(0 0 10px ${color})`,
      }}
    />
  );
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      {corner(0, -off, -off)}
      {corner(90, w - L + off, -off)}
      {corner(180, w - L + off, h - L + off)}
      {corner(270, -off, h - L + off)}
    </div>
  );
};

export const Pill: React.FC<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({children, bg = C.accent, color = C.bg, size = 52, style}) => (
  <div
    style={{
      display: 'inline-block',
      background: bg,
      color,
      fontFamily: body,
      fontWeight: 800,
      fontSize: size,
      padding: `${size * 0.22}px ${size * 0.6}px`,
      borderRadius: size,
      boxShadow: `0 0 40px ${bg}99`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ---------- Footage ---------- */

// A cut from the clinic footage with a slow push-in; `src` is the start second in clinic.mp4.
export const Clip: React.FC<{
  src: number;
  push?: [number, number];
  origin?: string;
  dim?: number;
  blur?: number;
  rate?: number;
}> = ({src, push = [1.04, 1.14], origin = '50% 40%', dim = 0, blur = 0, rate = 1}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const s = interpolate(frame, [0, durationInFrames], push, {easing: Easing.out(Easing.quad), ...clamp});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: origin, filter: blur ? `blur(${blur}px)` : undefined}}>
        <OffthreadVideo src={staticFile(FOOTAGE)} startFrom={Math.round(src * fps)} playbackRate={rate} muted />
      </AbsoluteFill>
      {dim > 0 && <AbsoluteFill style={{background: `rgba(3,10,28,${dim})`}} />}
    </AbsoluteFill>
  );
};

// Several cuts back to back, each landing with a short zoom-punch.
export const Montage: React.FC<{cuts: {src: number; weight?: number; origin?: string}[]; dim?: number}> = ({cuts, dim}) => {
  const {durationInFrames} = useVideoConfig();
  const total = cuts.reduce((a, c) => a + (c.weight ?? 1), 0);
  let at = 0;
  return (
    <AbsoluteFill>
      {cuts.map((c, i) => {
        const from = Math.round((at / total) * durationInFrames);
        at += c.weight ?? 1;
        const to = Math.round((at / total) * durationInFrames);
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <Punch>
              <Clip src={c.src} origin={c.origin} dim={dim} />
            </Punch>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Entry transition: zoom-blur in over a few frames.
export const Punch: React.FC<{children: React.ReactNode; frames?: number}> = ({children, frames = 7}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, frames], [0, 1], {easing: Easing.out(Easing.cubic), ...clamp});
  return (
    <AbsoluteFill style={{transform: `scale(${1.18 - 0.18 * p})`, filter: `blur(${(1 - p) * 14}px)`}}>
      {children}
      <AbsoluteFill style={{background: '#fff', opacity: (1 - p) * 0.35}} />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(180deg, rgba(10,5,6,0.55) 0%, transparent 22%, transparent 55%, rgba(10,5,6,0.78) 100%)',
    }}
  />
);

/* ---------- Captions ---------- */

type Word = {w: string; s: number; e: number};

const chunkWords = (words: Word[]) => {
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 3 || /[.,!?:]$/.test(w.w)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks;
};

const CHUNKS = chunkWords(timeline.words.filter((w) => w.w !== '—'));

// Word-by-word subtitles: the spoken word lights up in cyan, as in the reference.
// `absFrom` maps the local frame back to the global timeline.
export const Captions: React.FC<{absFrom: number; top?: number}> = ({absFrom, top = 1290}) => {
  const frame = useCurrentFrame() + absFrom;
  const chunk = CHUNKS.find((c, i) => {
    const next = CHUNKS[i + 1];
    return frame >= c[0].s - 2 && frame < (next ? next[0].s - 2 : c[c.length - 1].e + 12);
  });
  if (!chunk) return null;
  const enter = interpolate(frame - (chunk[0].s - 2), [0, 5], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 60,
        right: 60,
        textAlign: 'center',
        transform: `translateY(${(1 - enter) * 30}px) scale(${0.92 + 0.08 * enter})`,
        opacity: enter,
      }}
    >
      {chunk.map((w, i) => {
        const active = frame >= w.s - 1 && frame < w.e + 4;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              margin: '0 18px',
              fontFamily: body,
              fontWeight: 900,
              fontSize: 76,
              lineHeight: 1.25,
              textTransform: 'lowercase',
              color: active ? C.accent : C.white,
              transform: `scale(${active ? 1.08 : 1})`,
              textShadow: active
                ? `0 0 26px ${C.accent}cc, 0 6px 18px rgba(0,0,0,0.8)`
                : '0 6px 18px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)',
            }}
          >
            {w.w.replace(/[.,!?:]$/, '')}
          </span>
        );
      })}
    </div>
  );
};

export const Headline: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({
  children,
  size = 150,
  color = C.white,
  style,
}) => (
  <div
    style={{
      fontFamily: display,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.0,
      color,
      textTransform: 'uppercase',
      textShadow: '0 10px 40px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    {children}
  </div>
);
