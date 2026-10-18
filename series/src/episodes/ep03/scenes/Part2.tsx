import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, fmtMoney, lerp, prog, shake, springAt, sumShake} from '../../../lib/anim';
import {Npc} from '../../../components/Npc';
import {Character} from '../../../components/Character';
import {Forest} from '../../../components/Scenery';
import {Car} from '../../../components/Car';
import {Duffel, Bundle} from '../../../components/Props';
import {SlamText, Stamp, TypeLabel} from '../../../components/FX';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

const Paper: React.FC<{t: number; children: React.ReactNode}> = ({t, children}) => (
  <AbsoluteFill style={{background: C.paper}}>
    <AbsoluteFill
      style={{
        backgroundImage: 'radial-gradient(rgba(20,17,24,0.14) 2px, transparent 2.5px)',
        backgroundSize: '44px 44px',
        backgroundPosition: `0 ${-t * 20}px`,
      }}
    />
    {children}
  </AbsoluteFill>
);

const pop = (t: number, at: number) => clamp(springAt(t, at, 18, 0.3), 0, 1.2);

/** A seller taking > $10 000 in cash reports the buyer. */
export const RuleScene: React.FC<{t: number}> = ({t}) => {
  const a = S.rule[0];
  const doc = prog(t, B.report, 0.6, ease.outBack);
  const arrow1 = prog(t, B.over10k + 0.3, 0.4, ease.inOutCubic);
  const sh = shake(t, B.buyer, 16, 8);
  return (
    <Paper t={t}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.1} text="ЗАКОН ДЛЯ ПРОДАВЦОВ" color={C.magenta} size={30} />
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {/* shop */}
          <g transform={`translate(780 700) scale(${pop(t, B.rule)})`}>
            <rect x={-170} y={-60} width={340} height={230} fill="#fff" stroke={C.ink} strokeWidth={8} />
            <path d="M -190 -60 L -150 -150 L 150 -150 L 190 -60 Z" fill={C.magenta} stroke={C.ink} strokeWidth={8} />
            {[-120, -40, 40, 120].map((x) => (
              <path key={x} d={`M ${x - 40} -60 Q ${x} 0 ${x + 40} -60`} fill="#fff" stroke={C.ink} strokeWidth={6} />
            ))}
            <rect x={-60} y={40} width={120} height={130} fill="#2a2630" stroke={C.ink} strokeWidth={6} />
            <text x={0} y={-90} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={40} fill="#fff">
              ШОП
            </text>
          </g>
          {/* cash stack */}
          {t >= B.over10k && (
            <g transform={`translate(270 760) scale(${pop(t, B.over10k)})`}>
              {[0, 1, 2, 3].map((k) => (
                <g key={k} transform={`translate(${(k % 2) * 40 - 20} ${-k * 44})`}>
                  <Bundle w={200} />
                </g>
              ))}
            </g>
          )}
          {arrow1 > 0 && (
            <path
              d="M 400 720 L 560 720"
              stroke={C.ink}
              strokeWidth={10}
              strokeDasharray={170}
              strokeDashoffset={170 * (1 - arrow1)}
              markerEnd="url(#arrowHead)"
            />
          )}
          <defs>
            <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M 0 0 L 6 3 L 0 6 Z" fill={C.ink} />
            </marker>
          </defs>
        </svg>
        {t >= B.over10k && (
          <div style={{position: 'absolute', left: 110, top: 880, width: 330, textAlign: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 46, color: C.ink}}>
            &gt; $10 000
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: C.moneyDark}}>НАЛИЧНЫМИ</div>
          </div>
        )}
        {/* report sheet */}
        {t >= B.report && (
          <div
            style={{
              position: 'absolute',
              left: 170,
              top: 1000,
              width: 740,
              background: '#fff',
              border: `6px solid ${C.ink}`,
              borderRadius: 18,
              padding: '22px 28px',
              boxShadow: `12px 12px 0 ${C.ink}`,
              transform: `translateY(${(1 - Math.min(1, doc)) * 400}px) rotate(-2deg) scale(${0.9 + 0.1 * Math.min(1, doc)})`,
              display: 'flex',
              gap: 24,
            }}
          >
            <div style={{width: 150, height: 170, background: '#e6e0d2', borderRadius: 10, overflow: 'hidden', border: `4px solid ${C.ink}`}}>
              <svg width={150} height={170}>
                <g transform="translate(75 100) scale(0.5)">
                  <Npc kind="manager" t={t} flashy smirk />
                </g>
              </svg>
            </div>
            <div style={{flex: 1, fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: C.ink, lineHeight: 1.7}}>
              <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 30, color: C.red}}>ОТЧЁТ О ПОКУПАТЕЛЕ</div>
              ИМЯ: ГЕННАДИЙ
              <br />
              СУММА: $14 800
              <br />
              ОПЛАТА: НАЛИЧНЫЕ ✓
            </div>
          </div>
        )}
        {t >= B.buyer && (
          <div style={{position: 'absolute', top: 1240, left: 0, right: 0, textAlign: 'center'}}>
            <Stamp t={t} at={B.buyer} text="ОТПРАВЛЕНО" color={C.red} size={64} rotate={-7} />
          </div>
        )}
      </AbsoluteFill>
    </Paper>
  );
};

/** The analyst opens Gena's account: salary vs. two days of spending. */
export const AccountScene: React.FC<{t: number}> = ({t}) => {
  const a = S.account[0];
  const spent = 23_000 * prog(t, B.spentNum - 0.3, 1.0, ease.inOutCubic);
  const flag = t >= B.spentNum + 0.6;
  const glint = ((t - a) * 0.8) % 1.6;
  const sh = shake(t, B.spentNum + 0.6, 16, 8);
  return (
    <AbsoluteFill style={{background: '#070b14'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 60%, rgba(90,143,214,0.25), transparent 65%)'}} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <g transform={`translate(820 ${lerp(1700, 1480, prog(t, a, 0.5, ease.outCubic))}) scale(1.1)`}>
            <Npc kind="analyst" t={t} look={{x: -0.6, y: -0.4}} glint={glint <= 1 ? glint : -1} />
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 70,
            right: 70,
            top: 420,
            background: 'rgba(12,18,32,0.95)',
            border: `3px solid ${flag ? C.red : 'rgba(159,195,255,0.35)'}`,
            borderRadius: 26,
            padding: '30px 36px',
            boxShadow: flag ? `0 0 60px ${C.red}55` : '0 30px 80px rgba(0,0,0,0.5)',
            transform: `translateY(${(1 - prog(t, a, 0.4, ease.outExpo)) * 200}px)`,
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: '#9fc3ff'}}>
            <span>БАНК · СЧЁТ</span>
            <span>{flag ? <span style={{color: C.red}}>⚠ ПРОВЕРКА</span> : '● ОНЛАЙН'}</span>
          </div>
          <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 60, color: '#fff', marginTop: 10}}>ГЕННАДИЙ К.</div>
          <div style={{height: 2, background: 'rgba(255,255,255,0.1)', margin: '22px 0'}} />
          {t >= B.salary && (
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: prog(t, B.salary, 0.2)}}>
              <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: 'rgba(255,255,255,0.7)', letterSpacing: 2}}>ЗАРПЛАТА / МЕС</span>
              <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 64, color: '#9ff0b0'}}>$1 900</span>
            </div>
          )}
          {t >= B.spent && (
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, opacity: prog(t, B.spent, 0.2)}}>
              <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: 'rgba(255,255,255,0.7)', letterSpacing: 2}}>ПОТРАЧЕНО ЗА 2 ДНЯ</span>
              <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 80, color: C.red}}>{fmtMoney(spent)}</span>
            </div>
          )}
          {t >= B.spentNum + 0.6 && (
            <div style={{marginTop: 26}}>
              <div style={{height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${100 * prog(t, B.spentNum + 0.6, 0.6, ease.outCubic)}%`, background: `linear-gradient(90deg, #9ff0b0 8%, ${C.red} 8%)`}} />
              </div>
              <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: C.red, letterSpacing: 3, marginTop: 12}}>= 12 ЗАРПЛАТ ЗА 48 ЧАСОВ</div>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** One thread: Gena → motel → room 7 → you. */
export const ThreadScene: React.FC<{t: number}> = ({t}) => {
  const pins = [
    {x: 270, y: 640, at: B.thread, label: 'ГЕНА', kind: 'gena', rot: -5},
    {x: 790, y: 760, at: B.t1, label: 'МОТЕЛЬ', kind: 'motel', rot: 4},
    {x: 300, y: 1050, at: B.t2, label: 'НОМЕР 7', kind: 'seven', rot: -3},
    {x: 760, y: 1200, at: B.t3, label: 'ТЫ', kind: 'you', rot: 3},
  ];
  const zoom = lerp(1.0, 1.35, prog(t, B.t3 + 0.2, 0.9, ease.inOutCubic));
  const sh = sumShake(...pins.map((p) => shake(t, p.at, p.kind === 'you' ? 26 : 10, 8)));
  return (
    <AbsoluteFill style={{background: '#6b4a2e'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${zoom})`, transformOrigin: '760px 1150px'}}>
        <AbsoluteFill
          style={{
            backgroundColor: '#a0744a',
            backgroundImage: 'radial-gradient(rgba(60,35,15,0.35) 2px, transparent 3px), radial-gradient(rgba(255,230,190,0.18) 2px, transparent 3px)',
            backgroundSize: '22px 22px, 31px 31px',
            backgroundPosition: '0 0, 11px 7px',
          }}
        />
        <AbsoluteFill style={{boxShadow: 'inset 0 0 0 40px #3d2814, inset 0 0 120px rgba(0,0,0,0.6)'}} />
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {pins.slice(1).map((p, i) => {
            const A = pins[i];
            const pr = prog(t, p.at - 0.05, 0.4, ease.inOutCubic);
            if (pr <= 0) return null;
            const len = 900;
            return (
              <path
                key={i}
                d={`M ${A.x} ${A.y - 100} Q ${(A.x + p.x) / 2} ${(A.y + p.y) / 2 + 60} ${p.x} ${p.y - 100}`}
                stroke="#d4142a"
                strokeWidth={7}
                fill="none"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - pr)}
              />
            );
          })}
        </svg>
        {pins.map((p, i) => {
          if (t < p.at) return null;
          const s = pop(t, p.at);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x - 160,
                top: p.y - 110,
                width: 320,
                background: '#f7f3ea',
                padding: '14px 14px 16px',
                boxShadow: '8px 10px 0 rgba(0,0,0,0.35)',
                transform: `rotate(${p.rot}deg) scale(${s})`,
                transformOrigin: '50% 0%',
              }}
            >
              <div style={{position: 'absolute', top: -14, left: '50%', marginLeft: -16, width: 32, height: 32, borderRadius: '50%', background: C.red, border: `4px solid ${C.ink}`}} />
              <div style={{height: 170, background: p.kind === 'motel' ? '#1b1430' : '#d9d2c3', position: 'relative', overflow: 'hidden'}}>
                <svg width={292} height={170}>
                  {p.kind === 'gena' && (
                    <g transform="translate(146 120) scale(0.55)">
                      <Npc kind="manager" t={t} flashy smirk />
                    </g>
                  )}
                  {p.kind === 'motel' && (
                    <text x={146} y={104} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={50} fill={C.magentaHot} style={{filter: `drop-shadow(0 0 8px ${C.magenta})`}}>
                      МОТЕЛЬ
                    </text>
                  )}
                  {p.kind === 'seven' && (
                    <g>
                      <rect x={110} y={40} width={72} height={90} rx={10} fill="#b48a4a" stroke={C.ink} strokeWidth={5} />
                      <text x={146} y={108} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={60} fill="#2c1a1f">
                        7
                      </text>
                    </g>
                  )}
                  {p.kind === 'you' && (
                    <g transform="translate(146 130) scale(0.55)">
                      <Character t={t} mood="panic" sweat={1} />
                    </g>
                  )}
                </svg>
                {p.kind === 'you' && <div style={{position: 'absolute', inset: 10, border: `6px solid ${C.red}`, borderRadius: '50%'}} />}
              </div>
              <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 34, color: p.kind === 'you' ? C.red : C.ink, marginTop: 10}}>{p.label}</div>
            </div>
          );
        })}
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <TypeLabel t={t} at={B.thread} text="ОДНА НИТОЧКА" color="#fff" size={30} />
      </div>
    </AbsoluteFill>
  );
};

const Shovel: React.FC = () => (
  <g transform="rotate(28)">
    <rect x={-8} y={-300} width={16} height={330} rx={6} fill="#8a5a32" stroke={C.ink} strokeWidth={5} />
    <path d="M -46 30 L 46 30 L 40 110 Q 0 150 -40 110 Z" fill="#9aa1ab" stroke={C.ink} strokeWidth={6} />
    <rect x={-34} y={-320} width={68} height={24} rx={10} fill="#5a3a22" stroke={C.ink} strokeWidth={5} />
  </g>
);

/** Forest at night: digging, headlights, Gena wants half. */
export const ForestScene: React.FC<{t: number}> = ({t}) => {
  const a = S.forest[0];
  const light = prog(t, B.headlights, 0.35, ease.outExpo);
  const lit = t >= B.headlights;
  const dig = !lit ? Math.max(0, Math.sin((t - a) * 5)) : 0;
  const car = prog(t, B.followed - 0.6, 0.9, ease.outCubic);
  const gena = prog(t, B.followed + 0.1, 0.5, ease.outBack);
  const bubble = pop(t, B.split);
  const halves = prog(t, B.half, 0.6, ease.outExpo);
  const sh = sumShake(shake(t, B.headlights, 26, 6), shake(t, B.half, 14, 8));
  const push = lerp(1.0, 1.08, prog(t, a, 4, ease.outCubic));
  return (
    <AbsoluteFill style={{background: '#05070f'}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', transform: `translate(${sh.x}px, ${sh.y}px) scale(${push})`}}>
        <Forest t={t} light={light}>
          {/* hole with bags */}
          <ellipse cx={720} cy={1560} rx={230} ry={70} fill="#050806" stroke="#1d2a22" strokeWidth={8} />
          <g transform="translate(700 1540) scale(0.55)">
            <Duffel open />
          </g>
          <path d="M 900 1560 Q 990 1440 1100 1560 Z" fill="#20160f" />
          {/* car pulling in from the right, facing left */}
          {car > 0 && (
            <g transform={`translate(${lerp(1500, 900, car)} 1330) scale(-0.7 0.7)`}>
              <Car color="#2a2a34" goldRims lights={1} wheelSpin={-car * 720} />
            </g>
          )}
          {/* Gena steps out */}
          {gena > 0 && (
            <g transform={`translate(${lerp(1000, 800, Math.min(1, gena))} 1190) scale(0.82)`} opacity={Math.min(1, gena)}>
              <Npc kind="manager" t={t} flashy legs smirk look={{x: -0.7, y: 0}} />
            </g>
          )}
          {/* hero */}
          <g transform={`translate(330 ${1190 + dig * 18}) rotate(${lit ? -4 : dig * 6}) scale(0.88)`}>
            <Character
              t={t}
              mood={lit ? 'panic' : 'worried'}
              tired
              arms="hold"
              sweat={1}
              look={lit ? {x: 1, y: 0} : {x: 0.6, y: 0.8}}
              holdItem={<g transform={`translate(10 ${-30 + dig * 30})`}><Shovel /></g>}
            />
          </g>
        </Forest>
      </svg>
      {!lit && (
        <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.15} text="ЛЕС · 02:40" color="#9fc3ff" size={30} />
        </div>
      )}
      {t >= B.split && (
        <div
          style={{
            position: 'absolute',
            left: 470,
            top: 470,
            transform: `scale(${bubble}) rotate(3deg)`,
            transformOrigin: '80% 100%',
            background: '#fff',
            border: `6px solid ${C.ink}`,
            borderRadius: 40,
            padding: '20px 30px',
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 48,
            color: C.ink,
            lineHeight: 1.05,
            boxShadow: `8px 8px 0 ${C.ink}`,
          }}
        >
          ДАВАЙ ДЕЛИТЬ.
          <br />
          <span style={{color: C.magenta}}>ПОПОЛАМ.</span>
        </div>
      )}
      {halves > 0 && (
        <div style={{position: 'absolute', left: 70, right: 70, top: 760, display: 'flex', gap: 24 * halves}}>
          {['ТЕБЕ', 'ГЕНЕ'].map((who, i) => (
            <div
              key={who}
              style={{
                flex: 1,
                background: i ? C.magenta : '#f3efe6',
                border: `5px solid ${C.ink}`,
                borderRadius: 20,
                padding: '16px 18px',
                transform: `translateX(${(i ? 1 : -1) * (1 - halves) * 40}px) rotate(${(i ? 1 : -1) * 3 * halves}deg)`,
                boxShadow: `8px 8px 0 ${C.ink}`,
              }}
            >
              <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: i ? '#fff' : C.ink}}>{who}</div>
              <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 52, color: i ? '#fff' : C.ink}}>$4 975 000</div>
            </div>
          ))}
        </div>
      )}
      {lit && t < B.split && (
        <div style={{position: 'absolute', top: 470, left: 0, right: 0}}>
          <SlamText t={t} at={B.headlights} text="ФАРЫ" size={170} stagger={0.05} letterSpacing={-6} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const ShareChoiceLabels = {
  left: {label: 'ДЕЛИТЬСЯ', sub: '−$4 975 000 · И ОН ЗАМОЛЧИТ?', icon: '🤝'},
  right: {label: 'ОТКАЗАТЬ', sub: 'А ЧТО ОН ЗНАЕТ?', icon: '✋'},
};

