import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, lerp, noise1, prog, rand, shake, springAt, sumShake} from '../../../lib/anim';
import {Door} from '../../../components/Door';
import {Npc} from '../../../components/Npc';
import {Character} from '../../../components/Character';
import {MotelRoom} from '../../../components/MotelRoom';
import {Stamp, TypeLabel} from '../../../components/FX';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

const KNOCK_POS = [
  [270, 620, -9],
  [790, 880, 7],
  [330, 1150, -4],
];

/** 0 – 3.4: three knocks (callback to ep1), then we lean in to the peephole. */
export const DoorOpen: React.FC<{t: number}> = ({t}) => {
  const k = B.knocks as number[];
  const sh = sumShake(...k.map((at) => shake(t, at, 24, 9, 30)));
  const doorShake = k.reduce((acc, at) => acc + (t >= at ? Math.exp(-(t - at) * 14) * Math.sin((t - at) * 80) * 12 : 0), 0);
  const lean = prog(t, B.peep - 0.4, S.door[1] - B.peep + 0.4, ease.inCubic);
  const s = lerp(1.05, 1.0, prog(t, 0, 1.2, ease.outCubic)) * lerp(1, 4.2, lean);
  return (
    <AbsoluteFill style={{background: '#050307'}}>
      <AbsoluteFill
        style={{
          transform: `translate(${sh.x}px, ${sh.y}px) scale(${s})`,
          transformOrigin: '540px 700px',
          filter: lean > 0.6 ? `blur(${(lean - 0.6) * 20}px)` : undefined,
        }}
      >
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <Door t={t} shakeX={doorShake} feet={1} gapColor="#ffcf8a" />
        </svg>
      </AbsoluteFill>
      {k.map((at, i) => {
        if (t < at) return null;
        const [x, y, r] = KNOCK_POS[i];
        const sp = springAt(t, at, 26, 0.3);
        const o = 1 - prog(t, at + 0.9, 0.4);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 300,
              top: y - 100,
              width: 600,
              textAlign: 'center',
              transform: `rotate(${r}deg) scale(${2.2 - 1.2 * sp})`,
              opacity: o,
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 150,
              color: '#fff',
              letterSpacing: -4,
              textShadow: `0 10px 0 ${C.ink}, 0 0 40px ${C.red}`,
            }}
          >
            ТУК
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Hallway seen through the fisheye: silhouette → it's the night manager → "Уборка номера!" */
export const Peephole: React.FC<{t: number}> = ({t}) => {
  const a = S.peephole[0];
  const open = prog(t, a, 0.35, ease.outExpo);
  const reveal = prog(t, B.admin - 0.35, 0.5, ease.inOutCubic);
  const police = t < B.notPolice + 0.5;
  const siren = police ? (Math.floor(t * 7) % 2 ? C.red : C.blue) : 'transparent';
  const bob = Math.sin(t * 1.3) * 10;
  const drift = noise1(t * 0.7, 2) * 14;
  const shout = t >= B.cleaning && t < B.cleaning + 1.0;
  const bubble = clamp(springAt(t, B.cleaning, 16, 0.3), 0, 1.15);
  const r = 450 * open;
  return (
    <AbsoluteFill style={{background: '#030203'}}>
      <AbsoluteFill style={{clipPath: `circle(${r}px at 540px 930px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <defs>
            <radialGradient id="hall" cx="50%" cy="45%" r="60%">
              <stop offset="0" stopColor="#5d5a2e" />
              <stop offset="0.6" stopColor="#2e2c18" />
              <stop offset="1" stopColor="#0b0a05" />
            </radialGradient>
          </defs>
          <rect width={1080} height={1920} fill="url(#hall)" />
          {/* converging hallway lines (fisheye) */}
          {[-1, 1].map((d) => (
            <g key={d}>
              <path d={`M ${540 + d * 560} 300 Q ${540 + d * 300} 930 ${540 + d * 560} 1560`} stroke="#1b1a0d" strokeWidth={14} fill="none" />
              <path d={`M ${540 + d * 420} 520 Q ${540 + d * 250} 930 ${540 + d * 420} 1340`} stroke="#3c3a1e" strokeWidth={8} fill="none" />
              <rect x={540 + d * 330 - 50} y={700} width={100} height={420} rx={20} fill="#26240f" transform={`skewY(${d * -8})`} />
            </g>
          ))}
          <ellipse cx={540} cy={460} rx={120} ry={30} fill="#fff6c0" opacity={0.6} />
          <g transform={`translate(${540 + drift} ${1010 + bob}) scale(2.05)`}>
            <Npc kind="manager" t={t} shout={shout} look={{x: 0, y: 0.3}} />
            {reveal < 1 && (
              <g opacity={1 - reveal} fill="#080704">
                <path d="M -154 300 C -154 172 -97 116 0 116 C 97 116 154 172 154 300 L 170 564 L -170 564 Z" />
                <ellipse rx={123} ry={133} />
                <ellipse cx={-117} cy={14} rx={23} ry={31} />
                <ellipse cx={117} cy={14} rx={23} ry={31} />
              </g>
            )}
          </g>
          <rect width={1080} height={1920} fill={siren} opacity={police ? 0.35 : 0} style={{mixBlendMode: 'screen'}} />
        </svg>
        {/* fisheye vignette */}
        <AbsoluteFill style={{background: 'radial-gradient(circle 450px at 540px 930px, transparent 55%, rgba(0,0,0,0.85) 100%)'}} />
      </AbsoluteFill>
      {/* brass rim */}
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <circle cx={540} cy={930} r={r + 12} fill="none" stroke="#6b5530" strokeWidth={28} />
        <circle cx={540} cy={930} r={r + 2} fill="none" stroke="#c9a35c" strokeWidth={6} opacity={0.8} />
        <path d={`M ${540 - r * 0.6} ${930 - r * 0.55} Q ${540 - r * 0.2} ${930 - r * 0.85} ${540 + r * 0.25} ${930 - r * 0.8}`} stroke="#fff" strokeWidth={10} opacity={0.12} fill="none" />
      </svg>
      {t >= B.admin && (
        <div style={{position: 'absolute', top: 1270, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
          <Stamp t={t} at={B.admin + 0.05} text="АДМИНИСТРАТОР" color={C.magenta} size={56} rotate={-4} />
        </div>
      )}
      {t >= B.admin + 0.3 && (
        <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={B.admin + 0.3} text="НОЧНАЯ СМЕНА · 04:12" color="#fff" size={26} />
        </div>
      )}
      {t >= B.cleaning && (
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 520,
            transform: `scale(${bubble}) rotate(4deg)`,
            transformOrigin: '10% 100%',
            background: '#fff',
            border: `6px solid ${C.ink}`,
            borderRadius: 40,
            padding: '20px 30px',
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 46,
            color: C.ink,
            lineHeight: 1.05,
            boxShadow: `8px 8px 0 ${C.ink}`,
          }}
        >
          УБОРКА
          <br />
          НОМЕРА!
          <div
            style={{
              position: 'absolute',
              left: 30,
              bottom: -38,
              width: 0,
              height: 0,
              borderLeft: '22px solid transparent',
              borderRight: '22px solid transparent',
              borderTop: `40px solid ${C.ink}`,
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** "Ты выдыхаешь" — back against the door, exhale puff, wanted level drops. */
export const Relief: React.FC<{t: number}> = ({t}) => {
  const a = S.relief[0];
  const slide = prog(t, B.exhale, 0.8, ease.outCubic);
  const puff = clamp((t - B.exhale - 0.05) / 0.9);
  const drop = prog(t, B.exhale + 0.1, 0.6, ease.outExpo);
  const pct = Math.round(lerp(97, 38, drop));
  return (
    <AbsoluteFill style={{background: '#050307'}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <g transform="translate(540 1100) scale(1.9) translate(-540 -1100)" opacity={0.55}>
          <Door t={t} />
        </g>
        <g transform={`translate(540 ${1030 + slide * 60}) rotate(${-3 + slide * 2}) scale(1.75)`}>
          <Character t={t} mood="neutral" look={{x: 0, y: -0.8}} sweat={1 - slide} />
        </g>
        {puff > 0 &&
          puff < 1 &&
          Array.from({length: 7}).map((_, i) => (
            <circle
              key={i}
              cx={540 + (i - 3) * 22 * puff + Math.sin(i) * 10}
              cy={1210 - puff * (120 + rand(i) * 80)}
              r={(20 + rand(i + 2) * 22) * (0.5 + puff)}
              fill="#e9edf5"
              opacity={(1 - puff) * 0.7}
            />
          ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 470,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: prog(t, a, 0.2),
        }}
      >
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, letterSpacing: 6, color: 'rgba(255,255,255,0.7)'}}>РОЗЫСК</div>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: -6,
            color: drop > 0.5 ? '#9ff0b0' : C.red,
            textShadow: `0 0 40px ${drop > 0.5 ? 'rgba(127,224,138,0.5)' : C.red}`,
          }}
        >
          {pct}%
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** He saw the bags: over-the-shoulder into the room, then his eyes. */
export const Witness: React.FC<{t: number}> = ({t}) => {
  const a = S.witness[0];
  const cut = B.bagsSeen - 0.75;
  if (t < cut) {
    const push = lerp(1.0, 1.15, prog(t, a, cut - a, ease.inOutCubic));
    return (
      <AbsoluteFill style={{background: C.night}}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
          <g transform={`translate(540 960) scale(${1.75 * push}) translate(-760 -1110)`}>
            <MotelRoom t={t} />
          </g>
          {/* manager's head from behind, foreground */}
          <g transform={`translate(${250 - (push - 1) * 300} 1700) scale(2.3)`}>
            <Npc kind="manager" t={t} view="back" />
          </g>
        </svg>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 65% 45%, transparent 35%, rgba(0,0,0,0.6) 100%)'}} />
      </AbsoluteFill>
    );
  }
  const wide = t >= B.bagsSeen;
  const sh = shake(t, B.bagsSeen, 22, 7);
  const zoom = lerp(1.0, 1.12, prog(t, cut, 1.6, ease.outCubic));
  return (
    <AbsoluteFill style={{background: '#1d1a0c'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #4a4520 0%, #12100a 70%)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', transform: `translate(${sh.x}px, ${sh.y}px) scale(${zoom})`}}>
        <g transform="translate(540 980) scale(3.1)">
          <Npc kind="manager" t={t} eyes={wide ? 'dollar' : 'side'} />
        </g>
      </svg>
      {wide && (
        <div style={{position: 'absolute', top: 400, left: 0, right: 0, textAlign: 'center'}}>
          <Stamp t={t} at={B.bagsSeen + 0.05} text="СВИДЕТЕЛЬ" color={C.red} size={92} rotate={-6} />
        </div>
      )}
    </AbsoluteFill>
  );
};
