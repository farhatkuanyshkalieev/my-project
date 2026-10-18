import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, fmtInt, lerp, prog, rand, shake, springAt, sumShake, track} from '../../../lib/anim';
import {Character} from '../../../components/Character';
import {BAGS, MotelRoom} from '../../../components/MotelRoom';
import {Bokeh, Stamp, TypeLabel} from '../../../components/FX';
import {Bill, MoneyFan} from '../../../components/Props';
import cues from '../cues.json';

const B = cues.beats;

/** 0.0 – 8.0: motel room, slow push, then snap to the four bags. */
export const MotelScene: React.FC<{t: number}> = ({t}) => {
  const zoomP = prog(t, B.bags - 0.05, 0.45, ease.inOutQuint);
  const s = lerp(lerp(1.0, 1.1, prog(t, 0, B.bags, ease.outCubic)), 1.9, zoomP) + prog(t, B.bags + 0.4, 4, ease.outCubic) * 0.08;
  const fx = lerp(560, 770, zoomP);
  const fy = lerp(1000, 1115, zoomP);
  const sh = sumShake(shake(t, 0.02, 18, 5), shake(t, B.cash, 22, 8), shake(t, B.fourBags, 6, 6));

  // kinetic overlays
  const counterP = prog(t, B.tenMillion, 1.0, ease.inOutCubic);
  const counter = 10_000_000 * counterP;
  const outP = prog(t, B.bags - 0.1, 0.3, ease.inCubic);

  return (
    <AbsoluteFill style={{background: C.night}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <g transform={`translate(${540 + sh.x} ${960 + sh.y}) rotate(${sh.r}) scale(${s}) translate(${-fx} ${-fy})`}>
          <MotelRoom t={t}>
            {/* character in the foreground (back view) with extra parallax */}
            <g transform={`translate(${215 - zoomP * 420} ${1600 + zoomP * 200}) scale(${1.28 + zoomP * 0.3})`}>
              <g transform={`translate(0 ${Math.sin(t * 2.2) * 3})`}>
                <Character t={t} view="back" arms="down" />
              </g>
            </g>
            {/* numbered bag tags */}
            {BAGS.map(([x, y], i) => {
              const at = B.fourBags + i * 0.13;
              const p = springAt(t, at, 20, 0.3);
              if (t < at) return null;
              return (
                <g key={i} transform={`translate(${x} ${y - 120}) scale(${(p * 1) / s})`}>
                  <line x1={0} y1={30} x2={0} y2={95} stroke="#fff" strokeWidth={5} strokeDasharray="6 6" />
                  <circle r={44} fill={C.magenta} stroke="#fff" strokeWidth={6} />
                  <text y={17} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={46} fill="#fff">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </MotelRoom>
        </g>
      </svg>

      {/* $10 000 000 counter */}
      {t >= B.tenMillion - 0.05 && outP < 1 && (
        <div
          style={{
            position: 'absolute',
            top: 470,
            left: 0,
            right: 0,
            textAlign: 'center',
            transform: `translateY(${-outP * 500}px) scale(${0.85 + 0.15 * ease.outBack(clamp((t - B.tenMillion) / 0.35))})`,
            opacity: 1 - outP,
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 118,
              color: '#bff59e',
              letterSpacing: -4,
              textShadow: '0 0 40px rgba(127,176,105,0.8), 0 8px 0 #1d3a1a',
            }}
          >
            ${fmtInt(counter)}
          </div>
          <div style={{marginTop: 14, display: 'flex', justifyContent: 'center'}}>
            <TypeLabel t={t} at={B.tenMillion + 0.6} text="УКРАДЕНО · ЗА ОДНУ НОЧЬ" color="#fff" size={26} />
          </div>
        </div>
      )}
      {outP < 1 && (
        <div style={{position: 'absolute', top: 780, left: 0, right: 0, textAlign: 'center', transform: `translateY(${-outP * 700}px)`}}>
          <Stamp t={t} at={B.cash} text="НАЛИЧКОЙ" size={82} rotate={-6} />
        </div>
      )}
      {t > B.fourBags + 0.5 && (
        <div
          style={{
            position: 'absolute',
            top: 1530,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: prog(t, B.fourBags + 0.5, 0.2),
            transform: `translateY(${(1 - prog(t, B.fourBags + 0.5, 0.4)) * 40}px)`,
          }}
        >
          <div
            style={{
              background: 'rgba(14,12,20,0.8)',
              border: `3px solid ${C.magenta}`,
              borderRadius: 999,
              padding: '14px 34px',
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: 4,
              color: '#fff',
            }}
          >
            4 СУМКИ · <span style={{color: C.magentaHot}}>~25 КГ</span> КАЖДАЯ
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Falling bill with a 3D-ish flip. */
const RainBill: React.FC<{i: number; t: number}> = ({i, t}) => {
  const speed = 260 + rand(i) * 260;
  const x0 = rand(i + 1) * 1240 - 80;
  const y = ((t * speed + rand(i + 2) * 2400) % 2400) - 300;
  const x = x0 + Math.sin(t * 1.5 + i) * 60;
  const rot = rand(i + 3) * 360 + t * (40 + rand(i + 4) * 80) * (i % 2 ? 1 : -1);
  const flip = Math.cos(t * (2 + rand(i + 5) * 3) + i);
  const sc = 0.55 + rand(i + 6) * 0.7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc * flip} ${sc})`} opacity={0.5 + 0.5 * sc}>
      <Bill w={170} />
    </g>
  );
};

/** 7.9 – 13.55: "Жизнь удалась" fantasy, then the freeze-frame. */
export const RichScene: React.FC<{t: number}> = ({t}) => {
  const frozen = t >= B.freeze;
  const tf = Math.min(t, B.freeze);
  const fz = prog(t, B.freeze, 0.12, ease.outCubic);
  const shadesP = springAt(tf, B.lifeIsGood - 0.95, 16, 0.3);
  const push = lerp(1, 1.08, prog(tf, 7.9, 4, ease.outCubic)) * lerp(1, 1.12, prog(t, B.freeze, 1.8, ease.outCubic));
  const goldP = prog(tf, B.lifeIsGood, 0.5);
  const shimmer = ((tf - B.lifeIsGood) / 1.2) % 1;
  const jitter = frozen ? (rand(Math.floor(t * 60)) - 0.5) * 16 * prog(t, B.worse - 0.5, 0.5, ease.inCubic) : 0;
  const bob = Math.sin(tf * 3) * 8;
  const sh = shake(tf, B.lifeIsGood, 14, 6);

  return (
    <AbsoluteFill style={{background: C.night}}>
      <AbsoluteFill
        style={{
          transform: `scale(${push}) translateX(${jitter}px)`,
          filter: frozen ? `grayscale(${fz}) contrast(${1 + 0.25 * fz}) brightness(${1 - 0.15 * fz})` : undefined,
        }}
      >
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 45%, #6a1a52 0%, #2a0d2a 55%, #0b0912 100%)'}} />
        <Bokeh t={tf} n={16} seed={4} />
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
          {Array.from({length: 14}).map((_, i) => (
            <RainBill key={i} i={i} t={tf} />
          ))}
          <g transform={`translate(${540 + sh.x} ${1010 + bob + sh.y}) scale(1.55)`}>
            <Character
              t={tf}
              mood="smug"
              arms="hold"
              holdItem={<MoneyFan spread={0.6 + 0.4 * prog(tf, 8.0, 0.5, ease.outBack)} />}
              shades={clamp(shadesP)}
              blinkSeed={3}
            />
          </g>
          {Array.from({length: 12}).map((_, i) => (
            <RainBill key={i} i={i + 40} t={tf} />
          ))}
        </svg>

        {/* gold headline */}
        {tf >= B.lifeIsGood && (
          <div
            style={{
              position: 'absolute',
              top: 300,
              left: 0,
              right: 0,
              textAlign: 'center',
              transform: `scale(${0.6 + 0.4 * ease.outBack(goldP)}) rotate(-4deg)`,
              opacity: goldP,
            }}
          >
            {['ЖИЗНЬ', 'УДАЛАСЬ'].map((w) => (
              <div
                key={w}
                style={{
                  fontFamily: F.display,
                  fontWeight: 900,
                  fontSize: 132,
                  lineHeight: 1.0,
                  letterSpacing: -4,
                  backgroundImage: `linear-gradient(100deg, #b8862d 0%, #ffe59a ${shimmer * 100 - 10}%, #fff8dc ${shimmer * 100}%, #ffe59a ${
                    shimmer * 100 + 10
                  }%, #c99332 100%)`,
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 8px 0 #4a2a06) drop-shadow(0 0 30px rgba(255,200,90,0.55))',
                }}
              >
                {w}
              </div>
            ))}
          </div>
        )}
        {frozen && (
          <div
            style={{
              position: 'absolute',
              top: 425,
              left: 120,
              width: 840 * prog(t, B.freeze + 0.15, 0.3, ease.inOutCubic),
              height: 18,
              background: C.red,
              transform: 'rotate(-7deg)',
              transformOrigin: '0 50%',
              boxShadow: `0 0 24px ${C.red}`,
            }}
          />
        )}
        {/* sparkles */}
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {Array.from({length: 12}).map((_, i) => {
            const at = 8.0 + rand(i) * 3.6;
            const p = clamp((tf - at) / 0.5);
            if (p <= 0 || p >= 1) return null;
            const x = 140 + rand(i + 1) * 800;
            const y = 300 + rand(i + 2) * 900;
            const r = 26 * Math.sin(Math.PI * p);
            return (
              <path
                key={i}
                d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`}
                fill="#fff6c8"
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* VHS pause overlay after the freeze */}
      {frozen && (
        <AbsoluteFill style={{opacity: fz}}>
          <AbsoluteFill
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 5px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 60,
              transform: `translateY(${((t - B.freeze) * 900) % 1920}px)`,
              background: 'linear-gradient(transparent, rgba(255,255,255,0.12), transparent)',
            }}
          />
          <div style={{position: 'absolute', top: 1560, left: 60, fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: '#fff', letterSpacing: 6}}>
            ❚❚ ПАУЗА
          </div>
          <div
            style={{
              position: 'absolute',
              top: 1566,
              right: 60,
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 36,
              color: '#fff',
              letterSpacing: 4,
              opacity: Math.floor(t * 2) % 2 ? 1 : 0.4,
            }}
          >
            ДЕНЬ 1 · 03:14
          </div>
          <div style={{position: 'absolute', top: 596, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
            <TypeLabel t={t} at={B.freeze + 0.35} text="ПЕРВЫЙ ДЕНЬ" color={C.red} size={60} cps={16} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
