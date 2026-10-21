import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, lerp, prog, rand, shake, springAt, sumShake} from '../../../lib/anim';
import {Phone} from '../../../components/Phone';
import {ChoiceSplit} from '../../../components/ChoiceSplit';
import {Character} from '../../../components/Character';
import {Npc} from '../../../components/Npc';
import {DawnYard} from '../../../components/Scenery';
import {Car} from '../../../components/Car';
import {Stamp, TypeLabel} from '../../../components/FX';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

/** Cold open: the blackmail text is still on screen. */
export const PhoneRecap: React.FC<{t: number}> = ({t}) => {
  const push = lerp(1.0, 1.12, prog(t, 0, S.phone[1], ease.inOutCubic));
  const left = Math.max(0, 14 - Math.floor(t * 4));
  return (
    <AbsoluteFill style={{background: '#04050b'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(80,140,255,0.22), transparent 60%)'}} />
      <div style={{position: 'absolute', left: 260, top: 420, transform: `scale(${push}) rotate(-3deg)`, transformOrigin: '50% 40%'}}>
        <Phone
          t={t + 10}
          on={-10}
          clock="05:46"
          msgs={[
            {at: -5, text: 'Я видел, что в сумках.'},
            {at: -4, text: <>Мне нужно <span style={{color: '#ff7fb6', whiteSpace: 'nowrap'}}>$50&nbsp;000</span>.</>},
            {at: -3, text: 'До утра.'},
          ]}
        />
      </div>
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
            opacity: Math.floor(t * 4) % 2 ? 1 : 0.7,
          }}
        >
          ⏳ ДО РАССВЕТА 0:{String(left).padStart(2, '0')}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** One poll row: icon, label, bar and percentage. */
const PollRow: React.FC<{icon: string; label: string; pct: number; color: string; win: number}> = ({icon, label, pct, color, win}) => (
  <div style={{marginTop: 34, opacity: 1 - 0.45 * Math.max(0, -win)}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: F.display, fontWeight: 900, color: '#fff'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 52, letterSpacing: -2}}>
        <span style={{fontSize: 56}}>{icon}</span>
        {label}
        {win > 0 && <span style={{fontSize: 52, transform: `scale(${win})`, display: 'inline-block'}}>👑</span>}
      </div>
      <div style={{fontSize: 64, letterSpacing: -2, color: win > 0 ? color : '#fff', fontVariantNumeric: 'tabular-nums'}}>{Math.round(pct)}%</div>
    </div>
    <div style={{marginTop: 14, height: 46, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden'}}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: color,
          boxShadow: win > 0 ? `0 0 ${30 * win}px ${color}` : 'none',
        }}
      />
    </div>
  </div>
);

/** "Платить… или бежать?" — then the viewers' vote: ПЛАТИТЬ 51% beats БЕЖАТЬ 49%. */
export const ChoiceRecap: React.FC<{t: number}> = ({t}) => {
  const card = clamp(springAt(t, B.vote, 18, 0.34), 0, 1.1);
  const p = prog(t, B.vote + 0.1, B.voteWin - B.vote - 0.12, ease.inOutCubic);
  const swing = 7 * Math.sin(Math.PI * p); // "БЕЖАТЬ" leads mid-count, "ПЛАТИТЬ" overtakes at the end
  const pay = 51 * p - swing;
  const run = 49 * p + swing;
  const won = t >= B.voteWin;
  const winS = won ? clamp(springAt(t, B.voteWin, 22, 0.3), 0, 1.2) : 0;
  const sh = shake(t, B.voteWin, 26, 6);
  return (
    <AbsoluteFill>
      <ChoiceSplit
        t={t}
        left={{label: 'ПЛАТИТЬ', sub: '−$50 000', icon: '💵', at: B.pay}}
        right={{label: 'БЕЖАТЬ', sub: 'ПЕРЕПРЯТАТЬ СУМКИ', icon: '🏃', at: B.run}}
      />
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - clamp(card)}}>
        <div style={{background: C.ink, padding: '10px 24px', borderRadius: 12}}>
          <TypeLabel t={t} at={S.choice1[0] + 0.1} text="ТВОЙ ВЫБОР" color="#fff" size={30} />
        </div>
      </div>
      {t >= B.vote && (
        <>
          <AbsoluteFill style={{background: 'rgba(5,4,10,0.72)', opacity: clamp(card)}} />
          <div
            style={{
              position: 'absolute',
              left: 70,
              right: 70,
              top: 560,
              transform: `translate(${sh.x}px, ${(1 - card) * 700 + sh.y}px) rotate(${-2 + sh.r}deg)`,
              background: '#0e0b16',
              border: `4px solid ${C.magenta}`,
              borderRadius: 36,
              padding: '40px 50px 52px',
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${C.magenta}44`,
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <TypeLabel t={t} at={B.vote + 0.05} text="ИТОГИ ГОЛОСОВАНИЯ" color="#fff" size={30} />
              <div
                style={{
                  fontFamily: F.mono,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: 3,
                  color: '#fff',
                  background: C.red,
                  padding: '6px 14px',
                  borderRadius: 999,
                  opacity: won ? 0.35 : Math.floor(t * 4) % 2 ? 1 : 0.6,
                }}
              >
                ● LIVE
              </div>
            </div>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: 'rgba(255,255,255,0.55)', marginTop: 10}}>
              ВЫ ВЫБРАЛИ В КОММЕНТАРИЯХ
            </div>
            <PollRow icon="💵" label="ПЛАТИТЬ" pct={pay} color={C.magenta} win={won ? winS : 0} />
            <PollRow icon="🏃" label="БЕЖАТЬ" pct={run} color="#8f88a3" win={won ? -1 : 0} />
          </div>
          {won && (
            <div style={{position: 'absolute', top: 1290, left: 0, right: 0, textAlign: 'center'}}>
              <Stamp t={t} at={B.voteWin} text="ПЛАТИМ" sub="РЕШИЛИ ЗРИТЕЛИ" color={C.magenta} size={96} rotate={-6} />
            </div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};

const Envelope: React.FC = () => (
  <g>
    <rect x={-70} y={-46} width={140} height={92} rx={8} fill="#f3ead6" stroke={C.ink} strokeWidth={6} />
    <path d="M -70 -46 L 0 8 L 70 -46" fill="none" stroke={C.ink} strokeWidth={5} />
    <text x={0} y={34} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={26} fill={C.moneyDark}>
      $50K
    </text>
  </g>
);

/** Dawn behind the motel: the texter is Gena, the night manager. */
export const DawnScene: React.FC<{t: number}> = ({t}) => {
  const a = S.dawn[0];
  const walk = prog(t, a, 2.4, ease.outCubic);
  const heroX = lerp(120, 330, walk);
  const step = walk < 1 ? Math.abs(Math.sin(t * 8)) * 12 : 0;
  const reveal = prog(t, B.reveal - 0.1, 0.35, ease.outCubic);
  const handoff = prog(t, B.envelope + 0.1, 0.7, ease.inOutCubic);
  const close = prog(t, B.smile - 0.1, 0.6, ease.inOutQuint);
  const sh = sumShake(shake(t, B.reveal, 16, 7), shake(t, B.wide, 10, 8));
  const envX = lerp(heroX + 180, 640, handoff);
  const envY = lerp(1150, 1110, handoff) - Math.sin(handoff * Math.PI) * 80;
  // camera: wide two-shot → push into Gena's grin
  const s = lerp(1, 2.6, close);
  const fx = lerp(540, 760, close);
  const fy = lerp(960, 900, close);
  return (
    <AbsoluteFill style={{background: '#2a1b4a'}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <g transform={`translate(${540 + sh.x} ${960 + sh.y}) scale(${s}) translate(${-fx} ${-fy})`}>
          <DawnYard t={t}>
            {/* Gena by the dumpster */}
            <g transform="translate(760 1150) scale(0.95)">
              <Npc kind="manager" t={t} legs smirk={t >= B.smile} look={{x: -0.6, y: 0.2}} />
              {reveal < 1 && (
                <g opacity={1 - reveal} fill="#120a14">
                  <path d="M -154 300 C -154 172 -97 116 0 116 C 97 116 154 172 154 300 L 170 564 L -170 564 Z" />
                  <path d="M -102 520 L -96 668 L -22 668 L -18 520 Z M 102 520 L 96 668 L 22 668 L 18 520 Z" />
                  <ellipse rx={123} ry={133} />
                  <ellipse cx={-117} cy={14} rx={23} ry={31} />
                  <ellipse cx={117} cy={14} rx={23} ry={31} />
                  <rect x={60} y={260} width={50} height={84} rx={8} fill="#8fc1ff" opacity={0.9} />
                </g>
              )}
              {t >= B.wide && (
                <g opacity={prog(t, B.wide, 0.15)}>
                  <path d="M -30 102 Q 6 132 44 96 Q 8 118 -30 102 Z" fill="#fff" stroke={C.ink} strokeWidth={4} />
                  <path d={`M 60 ${70 - (t - B.wide) * 20} l 8 -18 l 8 18 l 18 8 l -18 8 l -8 18 l -8 -18 l -18 -8 Z`} fill="#fff6c8" />
                </g>
              )}
            </g>
            {/* hero walking in with the envelope */}
            <g transform={`translate(${heroX} ${1150 - step}) scale(0.95)`}>
              <Character
                t={t}
                mood="worried"
                tired
                arms="down"
                look={{x: 0.8, y: 0}}
                rightHandItem={handoff <= 0 ? <g transform="translate(20 10) rotate(-10)"><Envelope /></g> : undefined}
              />
            </g>
          </DawnYard>
          {handoff > 0 && handoff < 1 && (
            <g transform={`translate(${envX} ${envY}) rotate(${handoff * 30 - 15})`}>
              <Envelope />
            </g>
          )}
          {handoff >= 1 && (
            <g transform="translate(700 1440) rotate(12) scale(0.9)">
              <Envelope />
            </g>
          )}
        </g>
      </svg>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,10,30,0.55), transparent 30%)'}} />
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - close}}>
        <TypeLabel t={t} at={B.dawn} text="РАССВЕТ · ЗАДНИЙ ДВОР" color="#fff" size={28} />
      </div>
      {/* character intro card */}
      {t >= B.name && close < 0.9 && (
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 520,
            width: 440,
            background: 'rgba(10,8,14,0.9)',
            border: `4px solid ${C.magenta}`,
            borderRadius: 20,
            padding: '18px 24px',
            transform: `translateX(${(1 - Math.min(1, springAt(t, B.name, 16, 0.32))) * 500}px)`,
            opacity: 1 - close,
          }}
        >
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 20, letterSpacing: 4, color: C.magentaHot}}>НОВЫЙ ПЕРСОНАЖ</div>
          <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 64, color: '#fff', marginTop: 4}}>ГЕНА</div>
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', marginTop: 4}}>
            СВИДЕТЕЛЬ → <span style={{color: C.red}}>ШАНТАЖИСТ</span>
          </div>
        </div>
      )}
      {t >= B.envelope + 0.8 && close < 0.5 && (
        <div
          style={{
            position: 'absolute',
            left: 470,
            top: lerp(1000, 880, prog(t, B.envelope + 0.8, 1.0, ease.outCubic)),
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 64,
            color: C.red,
            opacity: 1 - prog(t, B.envelope + 1.4, 0.4),
            textShadow: `0 6px 0 ${C.ink}`,
          }}
        >
          −$50 000
        </div>
      )}
    </AbsoluteFill>
  );
};

const Panel: React.FC<{t: number; at: number; top: number; bg: string; children: React.ReactNode; label: string; rot: number}> = ({t, at, top, bg, children, label, rot}) => {
  if (t < at) return null;
  const p = clamp(springAt(t, at, 16, 0.3), 0, 1.15);
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top,
        height: 330,
        borderRadius: 26,
        border: `6px solid ${C.ink}`,
        background: bg,
        overflow: 'hidden',
        transform: `translateX(${(1 - Math.min(1, p)) * (rot > 0 ? 1100 : -1100)}px) rotate(${rot}deg) scale(${0.9 + 0.1 * Math.min(1, p)})`,
        boxShadow: `10px 10px 0 ${C.ink}`,
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          left: 20,
          bottom: 18,
          background: C.ink,
          color: '#fff',
          fontFamily: F.display,
          fontWeight: 900,
          fontSize: 34,
          padding: '6px 18px',
          borderRadius: 10,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** Two days later: Gena spends it all — in cash. */
export const SpreeScene: React.FC<{t: number}> = ({t}) => {
  const sh = sumShake(shake(t, B.chain, 10, 8), shake(t, B.rims, 10, 8), shake(t, B.restaurant, 10, 8), shake(t, B.allCash, 24, 7));
  const spin = (t - B.rims) * 900;
  return (
    <AbsoluteFill style={{background: '#0c0810'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(242,196,67,0.18), transparent 65%)'}} />
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <TypeLabel t={t} at={B.twoDays} text="ЧЕРЕЗ 2 ДНЯ" color="#f2c443" size={34} />
      </div>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <Panel t={t} at={B.chain} top={470} bg="linear-gradient(120deg, #3a2a08, #8a6410 55%, #f2c443)" label="ЗОЛОТАЯ ЦЕПЬ" rot={-2}>
          <svg width={960} height={330}>
            <g transform="translate(700 140) scale(0.55)">
              <Npc kind="manager" t={t} flashy smirk />
            </g>
            {Array.from({length: 8}).map((_, i) => {
              const k = ((t * 1.3 + rand(i)) % 1);
              const x = 520 + rand(i + 3) * 360;
              const y = 40 + rand(i + 5) * 220;
              const r = 18 * Math.sin(Math.PI * k);
              return <path key={i} d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill="#fff6c8" />;
            })}
          </svg>
        </Panel>
        <Panel t={t} at={B.rims} top={830} bg="linear-gradient(120deg, #1a1430, #4a2a6a)" label="НОВЫЕ ДИСКИ" rot={2}>
          <svg width={960} height={330}>
            <g transform="translate(520 170) scale(0.62)">
              <Car color="#2a2a34" goldRims wheelSpin={spin} />
            </g>
          </svg>
        </Panel>
        <Panel t={t} at={B.restaurant} top={1190} bg="linear-gradient(120deg, #2a0f18, #6a1a2e)" label="РЕСТОРАН" rot={-1.5}>
          <svg width={960} height={330}>
            {[0, 1, 2].map((k) => (
              <g key={k} transform={`translate(${470 + k * 90} 230)`}>
                <rect x={-22} y={-150} width={44} height={150} rx={14} fill={k === 1 ? '#2a5a3a' : '#1f3a2a'} stroke={C.ink} strokeWidth={5} />
                <rect x={-10} y={-200} width={20} height={56} rx={6} fill="#f2c443" stroke={C.ink} strokeWidth={4} />
                <rect x={-22} y={-100} width={44} height={40} fill="#f3ead6" opacity={0.85} />
              </g>
            ))}
          </svg>
          <div
            style={{
              position: 'absolute',
              right: 40,
              top: 30,
              width: 220,
              height: Math.min(260, 40 + (t - B.restaurant) * 260),
              overflow: 'hidden',
              background: '#fbf8f0',
              borderRadius: 6,
              padding: '14px 16px',
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 20,
              color: C.ink,
              lineHeight: 1.5,
            }}
          >
            СТОЛ 4
            <br />
            ШАМПАНСКОЕ ×3
            <br />
            СТЕЙК ×6
            <br />
            ———————
            <br />
            ИТОГО $6 400
            <br />
            <span style={{color: C.red}}>НАЛИЧНЫЕ</span>
          </div>
        </Panel>
      </AbsoluteFill>
      {t >= B.allCash && (
        <div style={{position: 'absolute', top: 980, left: 0, right: 0, textAlign: 'center'}}>
          <Stamp t={t} at={B.allCash} text="ВСЁ НАЛИЧКОЙ" color={C.red} size={88} rotate={-8} />
        </div>
      )}
    </AbsoluteFill>
  );
};
