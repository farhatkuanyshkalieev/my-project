import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, lerp, noise1, prog, rand, shake, springAt, sumShake} from '../../../lib/anim';
import {Npc} from '../../../components/Npc';
import {Character} from '../../../components/Character';
import {Phone} from '../../../components/Phone';
import {SlamText, Stamp, TypeLabel} from '../../../components/FX';
import {Bill} from '../../../components/Props';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

/** Desk with monitors, then the cork board of evidence. */
export const AnalystScene: React.FC<{t: number}> = ({t}) => {
  const a = S.analyst[0];
  const boardAt = B.board - 0.1;
  if (t < boardAt) {
    const push = lerp(1.0, 1.1, prog(t, a, boardAt - a, ease.inOutCubic));
    const glint = ((t - a) * 0.8) % 1.6;
    return (
      <AbsoluteFill style={{background: '#070b14'}}>
        <AbsoluteFill style={{transform: `scale(${push})`}}>
          <svg width={1080} height={1920} style={{position: 'absolute'}}>
            {/* blinds behind */}
            {Array.from({length: 14}).map((_, i) => (
              <rect key={i} x={0} y={260 + i * 60} width={1080} height={34} fill="#0c1424" />
            ))}
            {/* paper stacks */}
            {[120, 930].map((x, j) =>
              Array.from({length: 6}).map((_, k) => (
                <rect key={`${j}${k}`} x={x - 90 + rand(k + j * 9) * 10} y={1080 - k * 26} width={180} height={22} fill={k % 2 ? '#d8d2c4' : '#ece6d8'} stroke={C.ink} strokeWidth={3} />
              ))
            )}
            <g transform="translate(540 1000) scale(1.65)">
              <Npc kind="analyst" t={t} look={{x: 0.2, y: 0.5}} glint={glint <= 1 ? glint : -1} />
            </g>
            {/* monitors in the foreground */}
            {[-1, 1].map((d) => (
              <g key={d} transform={`translate(${540 + d * 300} 1420) rotate(${d * -6})`}>
                <rect x={-230} y={-160} width={460} height={300} rx={18} fill="#10151f" stroke={C.ink} strokeWidth={8} />
                <rect x={-210} y={-140} width={420} height={260} rx={8} fill="#132a4a" />
                {Array.from({length: 7}).map((_, k) => (
                  <rect
                    key={k}
                    x={-190}
                    y={-120 + k * 34}
                    width={120 + rand(k + d * 5) * 240 * (0.6 + 0.4 * Math.sin(t * 2 + k))}
                    height={14}
                    rx={4}
                    fill={k === 3 ? C.red : '#5a8fd6'}
                    opacity={0.75}
                  />
                ))}
              </g>
            ))}
          </svg>
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 70%, rgba(90,143,214,0.28), transparent 60%)', mixBlendMode: 'screen'}} />
        </AbsoluteFill>
        <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.15} text="ТЕМ ВРЕМЕНЕМ · ФИНРАЗВЕДКА" color="#9fc3ff" size={28} />
        </div>
      </AbsoluteFill>
    );
  }

  const pins = [
    {x: 270, y: 740, at: B.pin1, label: 'КУПЮРА', sub: 'KB 07143592 C', rot: -6, kind: 'bill'},
    {x: 790, y: 820, at: B.pin2, label: 'МОТЕЛЬ', sub: 'КОМН. 7', rot: 5, kind: 'motel'},
    {x: 520, y: 1140, at: B.pin3, label: 'ПАРЕНЬ В КЕПКЕ', sub: 'ЛИЧНОСТЬ: ?', rot: -3, kind: 'guy'},
  ];
  const sh = sumShake(...pins.map((p) => shake(t, p.at, 10, 9)));
  const zoom = lerp(1.08, 1.0, prog(t, boardAt, 0.5, ease.outExpo));
  return (
    <AbsoluteFill style={{background: '#6b4a2e'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${zoom})`}}>
        <AbsoluteFill
          style={{
            backgroundColor: '#a0744a',
            backgroundImage:
              'radial-gradient(rgba(60,35,15,0.35) 2px, transparent 3px), radial-gradient(rgba(255,230,190,0.18) 2px, transparent 3px)',
            backgroundSize: '22px 22px, 31px 31px',
            backgroundPosition: '0 0, 11px 7px',
          }}
        />
        <AbsoluteFill style={{boxShadow: 'inset 0 0 0 40px #3d2814, inset 0 0 120px rgba(0,0,0,0.6)'}} />
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {/* red strings */}
          {[
            [0, 1, B.pin2 + 0.15],
            [1, 2, B.pin3 + 0.15],
            [0, 2, B.pin3 + 0.35],
          ].map(([i, j, at], k) => {
            const p = prog(t, at, 0.45, ease.inOutCubic);
            if (p <= 0) return null;
            const A = pins[i];
            const Bp = pins[j];
            const mx = lerp(A.x, Bp.x, 0.5);
            const my = lerp(A.y, Bp.y, 0.5) + 40;
            const len = 900;
            return (
              <path
                key={k}
                d={`M ${A.x} ${A.y - 110} Q ${mx} ${my} ${Bp.x} ${Bp.y - 110}`}
                stroke="#d4142a"
                strokeWidth={6}
                fill="none"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - p)}
              />
            );
          })}
        </svg>
        {pins.map((p, i) => {
          if (t < p.at) return null;
          const s = clamp(springAt(t, p.at, 20, 0.3), 0, 1.2);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x - 170,
                top: p.y - 120,
                width: 340,
                background: '#f7f3ea',
                padding: '16px 16px 18px',
                boxShadow: '8px 10px 0 rgba(0,0,0,0.35)',
                transform: `rotate(${p.rot}deg) scale(${s})`,
                transformOrigin: '50% 0%',
              }}
            >
              <div style={{position: 'absolute', top: -14, left: '50%', marginLeft: -16, width: 32, height: 32, borderRadius: '50%', background: C.red, border: `4px solid ${C.ink}`}} />
              <div style={{height: 180, background: p.kind === 'guy' ? '#d9d2c3' : '#2a1a2e', position: 'relative', overflow: 'hidden'}}>
                <svg width={308} height={180}>
                  {p.kind === 'bill' && (
                    <g transform="translate(154 90) scale(1.3)">
                      <Bill w={200} serial />
                    </g>
                  )}
                  {p.kind === 'motel' && (
                    <g>
                      <rect width={308} height={180} fill="#1b1430" />
                      <text x={154} y={110} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={54} fill={C.magentaHot} style={{filter: `drop-shadow(0 0 8px ${C.magenta})`}}>
                        МОТЕЛЬ
                      </text>
                    </g>
                  )}
                  {p.kind === 'guy' && (
                    <g>
                      <defs>
                        <filter id="guySil">
                          <feColorMatrix type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.09  0 0 0 0.9 0" />
                        </filter>
                      </defs>
                      <g transform="translate(154 150) scale(0.62)" filter="url(#guySil)">
                        <Character t={t} view="back" />
                      </g>
                    </g>
                  )}
                </svg>
                {p.kind === 'guy' && (
                  <div style={{position: 'absolute', top: 20, right: 30, fontFamily: F.display, fontWeight: 900, fontSize: 90, color: C.red}}>?</div>
                )}
              </div>
              <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 30, color: C.ink, marginTop: 12}}>{p.label}</div>
              <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 20, color: '#6b6457', marginTop: 4, letterSpacing: 2}}>{p.sub}</div>
            </div>
          );
        })}
      </AbsoluteFill>
      {t >= B.pin3 + 0.6 && (
        <div style={{position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center'}}>
          <Stamp t={t} at={B.pin3 + 0.6} text="ПОДОЗРЕВАЕМЫЙ №1" color={C.red} size={52} rotate={-4} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** The phone lights up in the dark: blackmail. */
export const PhoneScene: React.FC<{t: number}> = ({t}) => {
  const a = S.phone[0];
  const on = B.phoneOn;
  const lit = prog(t, on, 0.25, ease.outCubic);
  const buzz = t >= on && t < on + 0.9 ? Math.sin(t * 90) * 6 : 0;
  const closeAt = on + 0.75;
  if (t < closeAt) {
    return (
      <AbsoluteFill style={{background: '#050308'}}>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <g transform="translate(540 1050) scale(1.75)" style={{filter: `brightness(${0.35 + 0.65 * lit})`}}>
            <Character
              t={t}
              mood={t > on ? 'worried' : 'neutral'}
              tired
              arms="hold"
              look={{x: 0, y: 0.9}}
              holdItem={
                <g transform={`translate(${buzz} 20)`}>
                  <rect x={-46} y={-80} width={92} height={160} rx={16} fill="#0d0d12" stroke={C.ink} strokeWidth={6} />
                  <rect x={-38} y={-70} width={76} height={140} rx={10} fill={t > on ? '#8fc1ff' : '#141a28'} />
                </g>
              }
            />
          </g>
        </svg>
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse 45% 30% at 50% 66%, rgba(120,180,255,0.55), transparent 70%)',
            opacity: lit,
            mixBlendMode: 'screen',
          }}
        />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, transparent 35%, rgba(0,0,0,0.75) 100%)'}} />
      </AbsoluteFill>
    );
  }
  const inP = prog(t, closeAt, 0.4, ease.outExpo);
  const shiver = noise1(t * 3, 4) * 6;
  const heart = (Math.sin(t * 8) + 1) / 2;
  return (
    <AbsoluteFill style={{background: '#04050b'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(80,140,255,${0.18 + heart * 0.06}), transparent 60%)`}} />
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 420,
          transform: `translateY(${(1 - inP) * 500 + shiver}px) rotate(${-3 + (1 - inP) * 10}deg) scale(${lerp(0.7, 1, inP)})`,
          opacity: inP,
        }}
      >
        <Phone
          t={t}
          on={on}
          clock="04:31"
          msgs={[
            {at: B.msg1, text: 'Я видел, что в сумках.'},
            {at: B.msg2, text: <>Мне нужно <span style={{color: '#ff7fb6', whiteSpace: 'nowrap'}}>$50&nbsp;000</span>.</>},
            {at: B.msg3, text: 'До утра.'},
          ]}
        />
      </div>
      {t >= B.msg3 + 0.3 && (
        <div style={{position: 'absolute', top: 1540, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: 4,
              color: '#fff',
              background: C.red,
              padding: '10px 26px',
              borderRadius: 999,
              transform: `scale(${clamp(springAt(t, B.msg3 + 0.3, 18, 0.3), 0, 1.2)})`,
            }}
          >
            ⏳ ДО РАССВЕТА 3:29
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Platit' or run — the audience decides in the comments. */
export const ChoiceScene: React.FC<{t: number}> = ({t}) => {
  const payP = clamp(springAt(t, B.pay, 16, 0.32), 0, 1.15);
  const runP = clamp(springAt(t, B.run, 16, 0.32), 0, 1.15);
  const commentsP = prog(t, B.comments, 0.4, ease.outExpo);
  const sh = sumShake(shake(t, B.pay, 18, 7), shake(t, B.run, 18, 7));
  return (
    <AbsoluteFill style={{background: '#07060b'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            background: '#f3efe6',
            clipPath: 'polygon(0 0, 62% 0, 38% 100%, 0 100%)',
            transform: `translateX(${(1 - Math.min(1, payP)) * -1080}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            background: C.magenta,
            clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 38% 100%)',
            transform: `translateX(${(1 - Math.min(1, runP)) * 1080}px)`,
          }}
        />
        {t >= B.pay && (
          <div style={{position: 'absolute', left: 56, top: 640, transform: `scale(${payP}) rotate(-6deg)`, transformOrigin: '30% 50%'}}>
            <div style={{fontSize: 120}}>💵</div>
            <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 74, color: C.ink, letterSpacing: -3}}>ПЛАТИТЬ</div>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: '#6b6457', letterSpacing: 3, marginTop: 6}}>−$50 000 · А ВДРУГ ЕЩЁ?</div>
          </div>
        )}
        {t >= B.run && (
          <div style={{position: 'absolute', right: 50, top: 1010, textAlign: 'right', transform: `scale(${runP}) rotate(-6deg)`, transformOrigin: '70% 50%'}}>
            <div style={{fontSize: 120}}>🏃</div>
            <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 74, color: '#fff', letterSpacing: -3}}>БЕЖАТЬ</div>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: '#ffe0ee', letterSpacing: 3, marginTop: 6}}>100 КГ · НОЧЬЮ · КУДА?</div>
          </div>
        )}
        {t >= B.run + 0.2 && (
          <div
            style={{
              position: 'absolute',
              left: 540 - 80,
              top: 900,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: C.ink,
              border: '8px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: 46,
              color: '#fff',
              transform: `scale(${clamp(springAt(t, B.run + 0.2, 20, 0.3), 0, 1.2)})`,
            }}
          >
            ИЛИ
          </div>
        )}
      </AbsoluteFill>
      {commentsP > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 90,
            top: 1500,
            transform: `translateY(${(1 - commentsP) * 300}px)`,
            background: 'rgba(10,8,14,0.92)',
            border: '3px solid rgba(255,255,255,0.25)',
            borderRadius: 999,
            padding: '20px 34px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 34,
            color: '#fff',
          }}
        >
          <span style={{fontSize: 44}}>💬</span> ПИШИ В КОММЕНТАРИЯХ
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Next-episode card + follow CTA + a final buzz from the unknown number. */
export const EndScene: React.FC<{t: number}> = ({t}) => {
  const a = S.end[0];
  const ep = B.ep3;
  const up = prog(t, ep - 0.1, 0.5, ease.inOutQuint);
  const line = prog(t, ep + 0.3, 0.8, ease.inOutCubic);
  const cursorP = prog(t, B.follow - 0.7, 0.65, ease.inOutCubic);
  const press = t >= B.follow ? 1 - 0.08 * Math.sin(clamp((t - B.follow) / 0.18) * Math.PI) : 1;
  const followed = t >= B.follow + 0.09;
  const bell = t >= B.follow + 0.25 ? Math.sin((t - B.follow - 0.25) * 30) * 18 * Math.exp(-(t - B.follow - 0.25) * 3) : 0;
  const outP = prog(t, B.out, 0.45, ease.inCubic);
  const tease = prog(t, B.tease, 0.45, ease.outExpo);
  const buzz = t >= B.tease && t < B.tease + 0.8 ? Math.sin(t * 90) * 5 : 0;
  return (
    <AbsoluteFill style={{background: '#06040a'}}>
      <AbsoluteFill style={{opacity: 1 - outP}}>
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
          $
        </div>
        <div style={{position: 'absolute', top: 380, left: 0, right: 0, textAlign: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 44, color: '#fff', opacity: up}}>
          ГРЯЗНЫЕ <span style={{color: C.magenta}}>МИЛЛИОНЫ</span>
        </div>
        <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.05} text="ПРОДОЛЖЕНИЕ" color="rgba(255,255,255,0.7)" size={30} />
        </div>
        <div style={{position: 'absolute', top: 640, left: 0, right: 0}}>
          <SlamText t={t} at={ep} text="СЕРИЯ 3" size={176} stagger={0.045} letterSpacing={-6} />
        </div>
        {t > ep &&
          [1, 2].map((k) => {
            const p = clamp((t - ep - 0.25) / 0.9);
            return (
              <div key={k} style={{position: 'absolute', top: 640 + p * 70 * k, left: 0, right: 0, opacity: (1 - p) * 0.6}}>
                <SlamText t={t} at={ep - 1} text="СЕРИЯ 3" size={176} stroke={C.magenta} stagger={0} letterSpacing={-6} />
              </div>
            );
          })}
        <div style={{position: 'absolute', top: 1060, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={ep + 0.6} text="ПЛАТИТЬ ИЛИ БЕЖАТЬ?" color={C.magentaHot} size={46} cps={18} />
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', opacity: up}}>
          <line x1={240} y1={1200} x2={840} y2={1200} stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
          <line x1={240} y1={1200} x2={lerp(390, 540, line)} y2={1200} stroke={C.magenta} strokeWidth={6} />
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 240 + i * 150;
            const cur = i === 2;
            const done = i < 2;
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
        {/* notification tease */}
        {tease > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 50,
              right: 50,
              top: lerp(-200, 170, tease),
              transform: `translateX(${buzz}px)`,
              background: 'rgba(30,32,44,0.96)',
              borderRadius: 34,
              padding: '22px 28px',
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{width: 70, height: 70, borderRadius: 18, background: '#2a3350', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 36, color: '#8fa3d9'}}>
              ?
            </div>
            <div>
              <div style={{fontFamily: F.caption, fontWeight: 900, fontSize: 28, color: '#fff'}}>Неизвестный номер · сейчас</div>
              <div style={{fontFamily: F.caption, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,0.85)', marginTop: 4}}>Время пошло.</div>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
