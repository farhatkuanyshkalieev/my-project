import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, lerp, noise1, prog, rand, shake, springAt, sumShake} from '../../../lib/anim';
import {SlamText, TypeLabel} from '../../../components/FX';
import {Character} from '../../../components/Character';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

/** Heartbeat times — mirrors audio/score.py heartbeat(68, 118, dur). */
const HEART: number[] = (() => {
  const out: number[] = [];
  const dur = B.knocks[0] - B.noSleep;
  let tt = 0;
  while (tt < dur) {
    out.push(B.noSleep + tt);
    tt += 60 / (68 + (118 - 68) * (tt / dur));
  }
  return out;
})();

const ecgAt = (x: number) => {
  // x = seconds since the beat
  const g = (m: number, w: number, a: number) => a * Math.exp(-(((x - m) / w) ** 2));
  return g(-0.08, 0.025, 10) + g(0, 0.012, 95) - g(0.03, 0.014, 32) + g(0.17, 0.04, 22) + g(0.2, 0.02, 4);
};

const ECG: React.FC<{t: number; y: number}> = ({t, y}) => {
  const span = 2.4;
  const pts: string[] = [];
  for (let k = 0; k <= 240; k++) {
    const tt = t - span + (k / 240) * span;
    let v = 0;
    for (const hb of HEART) {
      if (Math.abs(tt - hb) < 0.4) v += ecgAt(tt - hb);
    }
    pts.push(`${(k / 240) * 1080},${y - v}`);
  }
  return (
    <g>
      <polyline points={pts.join(' ')} fill="none" stroke={C.red} strokeWidth={6} strokeLinejoin="round" style={{filter: `drop-shadow(0 0 10px ${C.red})`}} />
      <circle cx={1080} cy={Number(pts[pts.length - 1].split(',')[1])} r={9} fill="#fff" />
    </g>
  );
};

/** 39.3 – 46.75: problem three — you. */
export const NervesScene: React.FC<{t: number}> = ({t}) => {
  const close = B.closeUp;
  if (t < close) {
    const sil = prog(t, S.nerves[0], 2.8, ease.outCubic);
    const eyes = t >= B.youself;
    const sh = shake(t, B.youself, 26, 7);
    return (
      <AbsoluteFill style={{background: '#0a0507'}}>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(255,51,68,0.28), transparent 60%)'}} />
        <svg width={1080} height={1920} style={{position: 'absolute', transform: `translate(${sh.x}px, ${sh.y}px)`}}>
          <g transform={`translate(540 ${1040}) scale(${lerp(2.1, 2.4, sil)})`} opacity={0.35 + sil * 0.3} style={{filter: 'brightness(0)'}}>
            <Character t={t} mood="worried" />
          </g>
          {eyes && (
            <g transform={`translate(540 1040) scale(${lerp(2.1, 2.4, sil)})`}>
              {[-44, 44].map((x) => (
                <circle key={x} cx={x} cy={40} r={8} fill={C.red} style={{filter: `drop-shadow(0 0 8px ${C.red})`}} />
              ))}
            </g>
          )}
        </svg>
        <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={B.p3Label} text="ПРОБЛЕМА 3" color={C.red} size={34} />
        </div>
        <div style={{position: 'absolute', top: 560, left: 0, right: 0, transform: `translate(${sh.x}px, ${sh.y}px)`}}>
          <SlamText t={t} at={B.youself} text="ТЫ САМ" size={170} stagger={0.05} letterSpacing={-6} />
        </div>
      </AbsoluteFill>
    );
  }

  const sirenP = clamp((t - B.siren) / 2.2);
  const siren = t >= B.siren && t < B.siren + 2.4;
  const flinch = t >= B.flinch;
  const jump = flinch ? Math.max(0, springAt(t, B.flinch, 16, 0.25)) : 0;
  const hop = flinch ? Math.sin(clamp((t - B.flinch) / 0.35) * Math.PI) * 70 : 0;
  const sh = sumShake(shake(t, B.flinch, 30, 6), shake(t, close, 10, 6));
  const look = {x: noise1(t * 2.2, 3) * 1.2, y: noise1(t * 1.7, 4) * 0.4};
  const push = lerp(1.0, 1.1, prog(t, close, 4.4, ease.outCubic));
  const sweepX = ((t - B.siren) * 900) % 2400;
  const hours = 24 + Math.min(2, Math.floor((t - B.noSleep) * 1.2));
  const enter = prog(t, close, 0.35, ease.outExpo);
  return (
    <AbsoluteFill style={{background: '#0d0812'}}>
      <AbsoluteFill style={{transform: `scale(${push * lerp(1.25, 1, enter)}) translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`, opacity: enter}}>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <defs>
            <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f0f26" />
              <stop offset="1" stopColor="#0b0610" />
            </linearGradient>
          </defs>
          <rect width={1080} height={1920} fill="url(#nw)" />
          {/* blind stripes on the back wall + face */}
          <g opacity={siren ? 0.9 : 0.5} style={{mixBlendMode: 'screen'}}>
            {Array.from({length: 16}).map((_, i) => {
              const y = 260 + i * 92 + Math.sin(t * 0.6) * 10;
              const col = siren ? (Math.floor((t - B.siren) * 5 + i * 0.2) % 2 ? C.red : C.blue) : C.magenta;
              return (
                <polygon
                  key={i}
                  points={`-100,${y + 120} 1180,${y - 160} 1180,${y - 124} -100,${y + 156}`}
                  fill={col}
                  opacity={0.22}
                />
              );
            })}
          </g>
          {siren && (
            <rect x={sweepX - 1200} y={0} width={700} height={1920} fill={Math.floor((t - B.siren) * 2.5) % 2 ? C.red : C.blue} opacity={0.22 * Math.sin(sirenP * Math.PI)} style={{mixBlendMode: 'screen'}} />
          )}
          <g transform={`translate(540 ${990 - hop}) scale(${1.95 * (1 + (flinch ? (1 - Math.min(1, jump)) * 0.06 : 0))} ${1.95 * (1 - (flinch ? (1 - Math.min(1, jump)) * 0.06 : 0))})`}>
            <Character t={t} mood={flinch ? 'panic' : 'worried'} look={flinch ? {x: -0.6, y: -0.5} : look} sweat={1} tired blinkSeed={8} />
          </g>
          {/* sweat spray on flinch */}
          {flinch &&
            Array.from({length: 10}).map((_, k) => {
              const p = clamp((t - B.flinch) / 0.6);
              const ang = -Math.PI / 2 + (rand(k) - 0.5) * 2.6;
              const d = 140 + p * (220 + rand(k + 2) * 160);
              return (
                <circle
                  key={k}
                  cx={540 + Math.cos(ang) * d}
                  cy={830 + Math.sin(ang) * d + p * p * 200}
                  r={10 + rand(k + 3) * 8}
                  fill="#c4e9ff"
                  stroke={C.ink}
                  strokeWidth={4}
                  opacity={1 - p}
                />
              );
            })}
          <ECG t={t} y={1585} />
        </svg>
        {/* bedside clock */}
        <div
          style={{
            position: 'absolute',
            left: 70,
            top: 1100,
            padding: '10px 18px',
            background: '#050305',
            border: '4px solid #2a1a20',
            borderRadius: 12,
            fontFamily: F.mono,
            fontWeight: 700,
            fontSize: 54,
            color: C.red,
            letterSpacing: 4,
            textShadow: `0 0 16px ${C.red}`,
          }}
        >
          04:{Math.floor(t * 2) % 2 ? '47' : '47'}
        </div>
      </AbsoluteFill>
      {t >= B.noSleep && (
        <div
          style={{
            position: 'absolute',
            top: 400,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: prog(t, B.noSleep, 0.25),
          }}
        >
          <div
            style={{
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: 5,
              color: '#fff',
              background: 'rgba(10,6,10,0.75)',
              border: '2px solid rgba(255,255,255,0.2)',
              padding: '10px 24px',
              borderRadius: 999,
            }}
          >
            БЕЗ СНА: <span style={{color: C.red}}>{hours} Ч</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const KNOCK_POS = [
  [250, 640, -9],
  [770, 900, 7],
  [330, 1160, -4],
];

/** 46.75 – 51.0: the knock. */
export const DoorScene: React.FC<{t: number}> = ({t}) => {
  const a = S.door[0];
  const push = lerp(1.0, 1.22, prog(t, a, 4.2, ease.inOutCubic));
  const k = B.knocks as number[];
  const sh = sumShake(...k.map((at) => shake(t, at, 24, 9, 30)));
  const doorShake = k.reduce((acc, at) => acc + (t >= at ? Math.exp(-(t - at) * 14) * Math.sin((t - at) * 80) * 12 : 0), 0);
  const feet = prog(t, B.knockWord + 0.1, 0.6, ease.outCubic);
  const police = t >= k[2] + 0.1;
  const gapCol = police ? (Math.floor(t * 7) % 2 ? C.red : C.blue) : '#ffcf8a';
  const enter = prog(t, a, 0.6, ease.outCubic);
  return (
    <AbsoluteFill style={{background: '#050307'}}>
      <AbsoluteFill style={{transform: `scale(${push}) translate(${sh.x}px, ${sh.y}px)`, opacity: enter}}>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <defs>
            <radialGradient id="gapGlow">
              <stop offset="0" stopColor={gapCol} stopOpacity="0.55" />
              <stop offset="1" stopColor={gapCol} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={1080} height={1490} fill="#0e0810" />
          <rect y={1490} width={1080} height={430} fill="#08050a" />
          <ellipse cx={540} cy={1500} rx={520} ry={130} fill="url(#gapGlow)" />
          <g transform={`translate(${doorShake} 0)`}>
            <rect x={240} y={350} width={600} height={1146} fill="#160b0f" />
            <rect x={270} y={380} width={540} height={1104} fill="#2c1a1f" />
            <rect x={320} y={440} width={440} height={420} rx={8} fill="none" stroke="#1d1014" strokeWidth={10} />
            <rect x={320} y={920} width={440} height={500} rx={8} fill="none" stroke="#1d1014" strokeWidth={10} />
            <rect x={505} y={520} width={70} height={84} rx={10} fill="#b48a4a" />
            <text x={540} y={584} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={54} fill="#2c1a1f">
              7
            </text>
            <circle cx={540} cy={700} r={12} fill="#090507" stroke="#b48a4a" strokeWidth={5} />
            <circle cx={540} cy={700} r={4} fill={gapCol} opacity={0.8} />
            <circle cx={760} cy={990} r={22} fill="#b48a4a" />
            <path d="M 640 860 Q 700 900 760 870" stroke="#9b9b9b" strokeWidth={6} fill="none" strokeDasharray="10 4" />
          </g>
          <rect x={270} y={1484} width={540} height={12} fill={gapCol} style={{filter: `drop-shadow(0 0 14px ${gapCol})`}} />
          {feet > 0 &&
            [430, 610].map((x, i) => (
              <rect key={x} x={x + Math.sin(t * 2 + i) * 4} y={1482} width={96} height={16} rx={6} fill="#050307" opacity={feet} />
            ))}
          {/* dust shaken loose */}
          {k.map((at, j) =>
            t >= at
              ? Array.from({length: 8}).map((_, i) => {
                  const p = clamp((t - at) / 1.2);
                  return (
                    <circle
                      key={`${j}-${i}`}
                      cx={260 + rand(i + j * 9) * 560}
                      cy={360 + p * p * 700}
                      r={2 + rand(i + 4) * 3}
                      fill="#cbb7a8"
                      opacity={(1 - p) * 0.8}
                    />
                  );
                })
              : null
          )}
        </svg>
      </AbsoluteFill>
      {k.map((at, i) => {
        if (t < at) return null;
        const [x, y, r] = KNOCK_POS[i];
        const s = springAt(t, at, 26, 0.3);
        const o = 1 - prog(t, at + 0.5, 0.4);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 300,
              top: y - 100,
              width: 600,
              textAlign: 'center',
              transform: `rotate(${r}deg) scale(${2.2 - 1.2 * s})`,
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

/** 51.0 – 60: cliffhanger + next episode card + follow CTA. */
export const EndScene: React.FC<{t: number}> = ({t}) => {
  const a = S.end[0];
  const ep2 = B.ep2;
  const up = prog(t, ep2 - 0.1, 0.5, ease.inOutQuint);
  const line = prog(t, ep2 + 0.3, 0.8, ease.inOutCubic);
  const cursorP = prog(t, B.follow - 0.7, 0.65, ease.inOutCubic);
  const press = t >= B.follow ? 1 - 0.08 * Math.sin(clamp((t - B.follow) / 0.18) * Math.PI) : 1;
  const followed = t >= B.follow + 0.09;
  const bell = t >= B.follow + 0.25 ? Math.sin((t - B.follow - 0.25) * 30) * 18 * Math.exp(-(t - B.follow - 0.25) * 3) : 0;
  const outP = prog(t, B.out, 0.45, ease.inCubic);
  const lights = 0.5 + 0.5 * Math.sin(t * 9);
  return (
    <AbsoluteFill style={{background: '#06040a'}}>
      <AbsoluteFill style={{opacity: 1 - outP}}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 90% 40% at 50% 105%, ${Math.floor(t * 3.5) % 2 ? C.red : C.blue}55, transparent 70%)`,
            opacity: 0.4 + 0.6 * lights * (1 - up * 0.6),
          }}
        />
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 42%, ${C.magenta}33, transparent 60%)`, opacity: up}} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '44%',
            transform: `translate(-50%, -50%) rotate(${(t - a) * 6}deg)`,
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 1100,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `3px ${C.magenta}`,
            opacity: 0.12 * up,
          }}
        >
          ?
        </div>
        <div
          style={{
            position: 'absolute',
            top: 380,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 44,
            letterSpacing: -1,
            color: '#fff',
            opacity: up,
          }}
        >
          ГРЯЗНЫЕ <span style={{color: C.magenta}}>МИЛЛИОНЫ</span>
        </div>
        <div style={{position: 'absolute', top: lerp(880, 1060, up), left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={B.who} text="КТО ЗА ДВЕРЬЮ?" color={up > 0.5 ? C.magentaHot : '#fff'} size={lerp(58, 46, up)} cps={16} />
        </div>
        <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={B.ep2 - 1.0} text="ПРОДОЛЖЕНИЕ" color="rgba(255,255,255,0.7)" size={30} />
        </div>
        <div style={{position: 'absolute', top: 640, left: 0, right: 0}}>
          <SlamText t={t} at={ep2} text="СЕРИЯ 2" size={176} stagger={0.045} letterSpacing={-6} />
        </div>
        {t > ep2 &&
          [1, 2].map((k) => {
            const p = clamp((t - ep2 - 0.25) / 0.9);
            return (
              <div key={k} style={{position: 'absolute', top: 640 + p * 70 * k, left: 0, right: 0, opacity: (1 - p) * 0.6}}>
                <SlamText t={t} at={ep2 - 1} text="СЕРИЯ 2" size={176} stroke={C.magenta} stagger={0} letterSpacing={-6} />
              </div>
            );
          })}

        {/* episode track */}
        <svg width={1080} height={1920} style={{position: 'absolute', opacity: up}}>
          <line x1={240} y1={1200} x2={840} y2={1200} stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
          <line x1={240} y1={1200} x2={lerp(240, 390, line)} y2={1200} stroke={C.magenta} strokeWidth={6} />
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 240 + i * 150;
            const cur = i === 1;
            const done = i === 0;
            const pulse = cur ? 1 + 0.15 * Math.sin(t * 6) : 1;
            return (
              <g key={i} transform={`translate(${x} 1200) scale(${pulse})`}>
                <circle r={26} fill={done ? C.magenta : '#06040a'} stroke={done || cur ? C.magenta : 'rgba(255,255,255,0.25)'} strokeWidth={6} />
                <text y={10} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={26} fill={done ? '#fff' : cur ? C.magenta : 'rgba(255,255,255,0.35)'}>
                  {done ? '✓' : i + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* follow CTA */}
        {t >= B.follow - 1.0 && (
          <div style={{position: 'absolute', top: 1470, left: 0, right: 0, textAlign: 'center', opacity: prog(t, B.follow - 1.0, 0.3)}}>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, letterSpacing: 3, color: 'rgba(255,255,255,0.8)', marginBottom: 22}}>
              подпишись, чтобы не пропустить
            </div>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 22, transform: `scale(${press})`}}>
              <div style={{fontSize: 64, transform: `rotate(${bell}deg)`, transformOrigin: '50% 10%'}}>🔔</div>
              <div
                style={{
                  fontFamily: F.display,
                  fontWeight: 800,
                  fontSize: 40,
                  color: '#fff',
                  padding: '24px 46px',
                  borderRadius: 999,
                  background: followed ? '#2a2630' : C.magenta,
                  border: followed ? '3px solid rgba(255,255,255,0.3)' : `3px solid ${C.magenta}`,
                  boxShadow: followed ? 'none' : `0 0 40px ${C.magenta}88`,
                }}
              >
                {followed ? 'ВЫ ПОДПИСАНЫ ✓' : 'ПОДПИСАТЬСЯ'}
              </div>
            </div>
          </div>
        )}
        {cursorP > 0 && t < B.follow + 1.2 && (
          <svg
            width={120}
            height={140}
            style={{
              position: 'absolute',
              left: lerp(1000, 640, cursorP),
              top: lerp(1850, 1580, cursorP),
              transform: `scale(${t >= B.follow && t < B.follow + 0.18 ? 0.85 : 1})`,
              opacity: 1 - prog(t, B.follow + 0.8, 0.3),
            }}
          >
            <path d="M 10 6 L 10 100 L 34 78 L 52 118 L 70 110 L 52 72 L 86 72 Z" fill="#fff" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          </svg>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
