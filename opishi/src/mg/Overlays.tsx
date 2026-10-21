// Motion-graphics overlays: viewfinder HUD, orange-juice sky, tunnel vision, clinic letter,
// handwritten note, transitions (lens wipe, shard wipe).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease, lerp, rand, springT} from '../lib/anim';
import {fonts, INK_DARK, P} from '../lib/design';

const f = (n: number) => n.toFixed(1);

// ---------- camera viewfinder HUD
export const Viewfinder: React.FC<{frame: number; t: number; shots: number[]; count: number}> = ({frame, t, shots, count}) => {
  const lock = springT(frame, frame - Math.round(Math.max(0, t - 0.25) * 60), 220, 11);
  const box = lerp(1.6, 1, clamp(lock));
  let flash = 0;
  let blinkK = 0;
  shots.forEach((st) => {
    const d = t - st;
    if (d >= 0 && d < 0.25) {
      blinkK = Math.max(blinkK, Math.sin((d / 0.12) * Math.PI) * (d < 0.12 ? 1 : 0));
      flash = Math.max(flash, 1 - d / 0.25);
    }
  });
  const fired = shots.filter((st) => t >= st).length;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920}>
        <g stroke="#fff" strokeWidth={5} fill="none" opacity={0.92}>
          {[
            [80, 220, 1, 1],
            [1000, 220, -1, 1],
            [80, 1500, 1, -1],
            [1000, 1500, -1, -1],
          ].map(([x, y, sx, sy], i) => (
            <path key={i} d={`M${x},${y + sy * 90} L${x},${y} L${x + sx * 90},${y}`} />
          ))}
          <g transform={`translate(540 760) scale(${f(box)})`}>
            <rect x={-110} y={-110} width={220} height={220} stroke={lock > 0.95 ? P.lime : '#fff'} />
            <line x1={-20} y1={0} x2={20} y2={0} />
            <line x1={0} y1={-20} x2={0} y2={20} />
          </g>
        </g>
        <circle cx={130} cy={160} r={12} fill="#FF3B4A" opacity={Math.sin(frame / 8) > 0 ? 1 : 0.3} />
        <text x={152} y={170} fontFamily={fonts.cond} fontWeight={500} fontSize={30} fill="#fff">
          ПЛЁНКА
        </text>
        <text x={1000} y={170} textAnchor="end" fontFamily={fonts.cond} fontWeight={500} fontSize={30} fill="#fff">
          {count + fired}/36
        </text>
        <text x={540} y={1580} textAnchor="middle" fontFamily={fonts.cond} fontWeight={500} fontSize={30} fill="#fff" letterSpacing="0.2em">
          f/1.8 · 1/250 · ISO 200
        </text>
        {/* shutter blades */}
        {blinkK > 0 && (
          <>
            <rect x={0} y={0} width={1080} height={960 * blinkK} fill="#000" />
            <rect x={0} y={1920 - 960 * blinkK} width={1080} height={960 * blinkK} fill="#000" />
          </>
        )}
      </svg>
      {flash > 0 && <AbsoluteFill style={{background: '#fff', opacity: flash * 0.5}} />}
    </AbsoluteFill>
  );
};

// ---------- orange juice poured across the sky (describing the sunset)
export const JuiceSky: React.FC<{t: number; dur: number; frame: number; y0?: number}> = ({t, dur, frame, y0 = 260}) => {
  if (t <= 0 || t > dur + 1.2) return null;
  const k = ease.inOutCubic(clamp(t / (dur * 0.8)));
  const fade = 1 - clamp((t - dur) / 1.2);
  const streams = [0, 1, 2, 3];
  return (
    <g opacity={fade}>
      {streams.map((i) => {
        const y = y0 + i * 120 + Math.sin(frame / 30 + i) * 10;
        const len = 1800 * clamp(k * 1.15 - i * 0.08);
        const w = 70 - i * 10;
        return (
          <g key={i}>
            <path
              d={`M-300,${f(y)} C100,${f(y - 160)} 500,${f(y + 170)} 1400,${f(y - 60)}`}
              stroke={i % 2 ? '#FFB347' : '#FF8A3D'}
              strokeWidth={w * (1 + 0.25 * Math.sin(frame / 9 + i))}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${f(len)} 3000`}
              opacity={0.85}
            />
            <path d={`M-300,${f(y - w * 0.25)} C100,${f(y - 160 - w * 0.25)} 500,${f(y + 170 - w * 0.25)} 1400,${f(y - 60 - w * 0.25)}`} stroke="#FFE2A8" strokeWidth={w * 0.18} strokeLinecap="round" fill="none" strokeDasharray={`${f(len * 0.9)} 3000`} opacity={0.8} />
          </g>
        );
      })}
      {/* drips */}
      {Array.from({length: 9}).map((_, i) => {
        const dt = t - 0.6 - i * 0.22;
        if (dt < 0) return null;
        const x = 80 + rand(i * 3) * 920;
        const y = y0 + 40 + rand(i) * 360 + dt * dt * 500;
        const st = 1 + Math.min(1.6, dt * 1.4);
        return (
          <g key={i} opacity={clamp(1 - dt / 2.2)}>
            <ellipse cx={x} cy={y} rx={16} ry={16 * st} fill="#FF9A3C" />
            <ellipse cx={x - 4} cy={y - 6 * st} rx={4} ry={6} fill="#FFE2A8" />
          </g>
        );
      })}
    </g>
  );
};

// ---------- tunnel vision: sharp centre, blurred + darkened outside a shrinking ring
export const Tunnel: React.FC<{r: number; children: React.ReactNode; cx?: number; cy?: number}> = ({r, children, cx = 540, cy = 860}) => (
  <AbsoluteFill>
    <AbsoluteFill style={{filter: 'blur(26px) saturate(0.5) brightness(0.55)'}}>{children}</AbsoluteFill>
    <AbsoluteFill
      style={{
        WebkitMaskImage: `radial-gradient(circle ${Math.max(1, r)}px at ${cx}px ${cy}px, #000 70%, transparent 100%)`,
        maskImage: `radial-gradient(circle ${Math.max(1, r)}px at ${cx}px ${cy}px, #000 70%, transparent 100%)`,
      }}
    >
      {children}
    </AbsoluteFill>
    <AbsoluteFill style={{background: `radial-gradient(circle ${Math.max(1, r * 1.5)}px at ${cx}px ${cy}px, rgba(0,0,0,0) 60%, rgba(5,3,12,0.92) 100%)`}} />
  </AbsoluteFill>
);

// ---------- clinic letter with typewriter + highlighter
export const ClinicLetter: React.FC<{t: number}> = ({t}) => {
  const lines = [
    {txt: 'ГОРОДСКОЙ ГЛАЗНОЙ ЦЕНТР', w: 800, s: 30, c: '#5F7A92'},
    {txt: 'Пациент: Мира А., 24 года', w: 600, s: 34, c: '#2A2A33'},
    {txt: 'Диагноз: пигментный ретинит,', w: 600, s: 34, c: '#2A2A33'},
    {txt: 'поздняя стадия.', w: 600, s: 34, c: '#2A2A33'},
    {txt: 'Прогноз: полная потеря', w: 600, s: 42, c: '#B1243A'},
    {txt: 'зрения в течение 1–2 лет.', w: 600, s: 42, c: '#B1243A'},
  ];
  let acc = 0.2;
  const hl = ease.inOutCubic(clamp((t - 2.6) / 0.6));
  return (
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <g transform={`translate(540 900) rotate(${f(lerp(-4, -1.5, clamp(t / 4)))})`}>
        <rect x={-430} y={-560} width={860} height={1120} fill="#000" opacity={0.25} transform="translate(18 24)" />
        <rect x={-430} y={-560} width={860} height={1120} fill="#F7F9FB" stroke={INK_DARK} strokeWidth={5} />
        <rect x={-430} y={-560} width={860} height={120} fill="#DCE8F2" />
        <circle cx={-350} cy={-500} r={34} fill="none" stroke="#5F7A92" strokeWidth={8} />
        <circle cx={-350} cy={-500} r={12} fill="#5F7A92" />
        {/* lime highlighter on the prognosis */}
        <rect x={-380} y={-36} width={760 * hl} height={130} fill={P.lime} opacity={0.55} />
        {lines.map((l, i) => {
          const chars = [...l.txt];
          const start = acc;
          acc += chars.length * 0.028 + 0.12;
          const shown = Math.max(0, Math.min(chars.length, Math.floor((t - start) / 0.028)));
          return (
            <text key={i} x={i === 0 ? -290 : -380} y={i === 0 ? -488 : -330 + (i - 1) * 76 + (i >= 4 ? 40 : 0)} fontFamily={i === 0 ? fonts.cond : fonts.sans} fontWeight={i >= 4 ? 800 : 600} fontSize={l.s} fill={l.c} letterSpacing={i === 0 ? '0.12em' : undefined}>
              {chars.slice(0, shown).join('')}
              {shown < chars.length && shown > 0 ? '▍' : ''}
            </text>
          );
        })}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-380} y={250 + i * 50} width={760 - (i % 2) * 220} height={14} rx={7} fill="#DDE3EA" />
        ))}
        <text x={150} y={500} fontFamily={fonts.script} fontSize={60} fill="#3D5A8A" opacity={clamp((t - 3.2) / 0.5)}>
          д-р Ковалёва
        </text>
      </g>
    </svg>
  );
};

// ---------- handwritten note, revealed stroke-by-stroke with a moving pen tip
export const HandNote: React.FC<{t: number; lines: [number, string][]}> = ({t, lines}) => (
  <div style={{position: 'absolute', left: 170, top: 760, width: 760}}>
    {lines.map(([at, txt], i) => {
      const k = clamp((t - at) / Math.max(0.6, txt.length * 0.05));
      return (
        <div key={i} style={{fontFamily: fonts.script, fontSize: 84, lineHeight: 1.25, color: '#2E2A55', clipPath: `inset(-20% ${f(100 - k * 102)}% -20% -5%)`, whiteSpace: 'nowrap'}}>
          {txt}
        </div>
      );
    })}
  </div>
);

// ---------- transitions
// Two sunglasses-lens shapes grow from the centre and reveal the next scene inside them
const LENS = (sd: number) =>
  'M' + [[sd * 188, -76], [sd * 26, -54], [sd * 20, -2], [sd * 50, 36], [sd * 136, 36], [sd * 170, -6]].map((q) => `${q[0]},${q[1]}`).join(' L') + 'Z';
const lensT = (p: number) => {
  const s = lerp(0.5, 1.3, ease.outCubic(clamp(p / 0.45))) * (1 + ease.inExpo(clamp((p - 0.45) / 0.55)) * 26);
  return `translate(540 860) scale(${f(s)})`;
};

export const LensReveal: React.FC<{p: number; children: React.ReactNode}> = ({p, children}) => {
  if (p <= 0) return null;
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const id = `lens-${Math.round(p * 1000)}`;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <clipPath id={id}>
            <path d={`${LENS(-1)} ${LENS(1)}`} transform={lensT(p)} />
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{clipPath: `url(#${id})`}}>{children}</AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute', pointerEvents: 'none'}}>
        <g transform={lensT(p)} opacity={1 - clamp((p - 0.6) / 0.3)}>
          <path d={`${LENS(-1)} ${LENS(1)}`} fill="none" stroke={P.lime} strokeWidth={14 / Math.max(1, p * 3)} strokeLinejoin="round" />
          <path d="M-22,-40 Q0,-56 22,-40" stroke={P.lime} strokeWidth={12} fill="none" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// Angular shards slice across the frame (cover at p=0.5)
export const ShardWipe: React.FC<{p: number; colors?: string[]}> = ({p, colors = [P.lilac, P.night, P.lime]}) => {
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920}>
        {Array.from({length: 7}).map((_, i) => {
          const d = i * 0.04;
          const inK = ease.inOutQuart(clamp((p - d) / 0.42));
          const outK = ease.inOutQuart(clamp((p - 0.5 - d) / 0.42));
          const y = -400 + i * 380;
          const x0 = lerp(-1600, -200, inK) + outK * 1700;
          return <path key={i} d={`M${f(x0)},${y} L${f(x0 + 1500)},${y - 300} L${f(x0 + 1500)},${y + 160} L${f(x0)},${y + 460} Z`} fill={colors[i % colors.length]} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Dip: React.FC<{v: number; color?: string}> = ({v, color = '#000'}) => (v > 0.001 ? <AbsoluteFill style={{background: color, opacity: clamp(v)}} /> : null);
