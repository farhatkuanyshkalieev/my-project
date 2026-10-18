import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, fmtInt, lerp, noise1, prog, rand, shake, springAt, sumShake, track} from '../../../lib/anim';
import {SlamText, Stamp, TypeLabel} from '../../../components/FX';
import {Character} from '../../../components/Character';
import {Bill, Duffel} from '../../../components/Props';
import {neonFlicker} from '../../../components/MotelRoom';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

/** 13.55 – 16.2: series title card. */
export const TitleScene: React.FC<{t: number}> = ({t}) => {
  const a = B.worse;
  const sh = shake(t, a, 26, 6);
  const push = lerp(1.0, 1.07, prog(t, a, 2.6, ease.outCubic));
  const streak = prog(t, a, 0.5);
  const echo = prog(t, a + 0.45, 0.9, ease.outCubic);
  return (
    <AbsoluteFill style={{background: '#07060b', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${push}) rotate(${sh.r}deg)`}}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -54%) rotate(${(t - a) * 12}deg) scale(${1.2 - 0.2 * streak})`,
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 1300,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `4px ${C.magenta}`,
            opacity: 0.2,
          }}
        >
          $
        </div>
        <div
          style={{
            position: 'absolute',
            top: 958,
            left: 0,
            right: 0,
            height: 4,
            transform: `scaleX(${streak})`,
            background: `linear-gradient(90deg, transparent, ${C.magenta}, #fff, ${C.magenta}, transparent)`,
            boxShadow: `0 0 40px 10px ${C.magenta}88`,
          }}
        />
        <div style={{position: 'absolute', top: 600, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={a + 0.25} text="СЕРИЯ 1 · ПЕРВЫЙ ДЕНЬ" color="#fff" size={30} />
        </div>
        <div style={{position: 'absolute', top: 700, left: 0, right: 0}}>
          <SlamText t={t} at={a + 0.02} text="ГРЯЗНЫЕ" size={108} stagger={0.03} />
        </div>
        <div style={{position: 'absolute', top: 852, left: 0, right: 0}}>
          <SlamText t={t} at={a + 0.28} text="МИЛЛИОНЫ" size={108} color={C.magenta} stagger={0.03} />
        </div>
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              top: 852 + echo * 120 * k,
              left: 0,
              right: 0,
              opacity: (1 - echo) * 0.5 * (1 - k * 0.2) * (t > a + 0.45 ? 1 : 0),
            }}
          >
            <SlamText t={t} at={a} text="МИЛЛИОНЫ" size={108} stroke={C.magenta} stagger={0} />
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            top: 1060,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: F.mono,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 6,
            color: 'rgba(255,255,255,0.75)',
            opacity: prog(t, a + 0.9, 0.4),
            transform: `translateY(${(1 - prog(t, a + 0.9, 0.6)) * 20}px)`,
          }}
        >
          КАЖДЫЙ ДОЛЛАР ОСТАВЛЯЕТ СЛЕД
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const COLS = 12;
const ROWS = 16;

/** 16.05 – 23.65: problem one — the weight of ten million in hundreds. */
export const WeightScene: React.FC<{t: number}> = ({t}) => {
  const g0 = B.gridStart;
  const shrinkTitle = prog(t, g0, 0.45, ease.inOutQuint);
  const collapse = prog(t, B.kg, 0.28, ease.inOutCubic);
  const fall = clamp((t - (B.kgLand - 0.16)) / 0.16) ** 2;
  const landed = t >= B.kgLand;
  const sh = sumShake(shake(t, B.p1Word, 14, 8), shake(t, B.kgLand, 34, 6));
  const plate = landed ? springAt(t, B.kgLand, 18, 0.25) : 0;
  const scaleIn = prog(t, B.kg - 0.1, 0.35, ease.outBack);
  const needle = lerp(-120, 80, clamp(springAt(t, B.kgLand, 9, 0.22), 0, 1.25));
  const count = 100000 * prog(t, B.countStart, B.countEnd - B.countStart, ease.inOutCubic);
  const billP = springAt(t, B.p1Label + 0.15, 12, 0.32);
  const billToCell = prog(t, g0, 0.35, ease.inOutCubic);

  const cell = {w: 60, h: 28, gx: 68, gy: 36};
  const x0 = (1080 - (COLS * cell.gx - 8)) / 2;
  const y0 = 640;
  const blk = {w: 34, h: 13};
  const bx0 = 540 - (COLS * blk.w) / 2;
  const blockTopMid = 610;
  const blockTopEnd = 1050 - ROWS * blk.h + plate * 0;
  const blockTop = lerp(blockTopMid, blockTopEnd, fall) + (landed ? (1 - Math.min(1, plate)) * 0 + Math.sin(Math.min(1, (t - B.kgLand) * 6) * Math.PI) * 10 : 0);

  return (
    <AbsoluteFill style={{background: C.paper}}>
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(20,17,24,0.14) 2px, transparent 2.5px)',
          backgroundSize: '44px 44px',
          backgroundPosition: `0 ${-t * 20}px`,
        }}
      />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`}}>
        {/* header */}
        <div style={{position: 'absolute', top: 385, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={B.p1Label} text={t < g0 ? 'ПРОБЛЕМА 1' : 'ПРОБЛЕМА 1 · ВЕС'} color={C.magenta} size={30} />
        </div>
        {shrinkTitle < 1 && (
          <div
            style={{
              position: 'absolute',
              top: 480,
              left: 0,
              right: 0,
              transform: `translateY(${-shrinkTitle * 120}px) scale(${1 - shrinkTitle * 0.8})`,
              opacity: 1 - shrinkTitle,
            }}
          >
            <SlamText t={t} at={B.p1Word} text="ВЕС" size={260} color={C.ink} stagger={0.05} letterSpacing={-6} />
          </div>
        )}

        {/* counter */}
        {t >= g0 && t < B.kgLand + 0.1 && (
          <div
            style={{
              position: 'absolute',
              top: 450,
              left: 0,
              right: 0,
              textAlign: 'center',
              opacity: prog(t, g0 + 0.1, 0.3) * (1 - prog(t, B.kg, 0.2)),
              transform: `translateY(${(1 - prog(t, g0 + 0.1, 0.4)) * 30 - prog(t, B.kg, 0.3) * 60}px)`,
            }}
          >
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 34, color: C.ink, letterSpacing: 2}}>
              $10 000 000 <span style={{color: C.moneyDark}}>в сотках</span> =
            </div>
            <div
              style={{
                fontFamily: F.display,
                fontWeight: 900,
                fontSize: 86,
                color: C.ink,
                letterSpacing: -3,
                marginTop: 6,
                transform: `scale(${t > B.countEnd ? 1 + 0.12 * Math.max(0, 1 - (t - B.countEnd) * 5) : 1})`,
              }}
            >
              {fmtInt(count)} <span style={{fontSize: 52, color: C.moneyDark}}>купюр</span>
            </div>
          </div>
        )}

        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {/* single hero bill, then becomes cell 0 */}
          {t < g0 + 0.4 && (
            <g
              transform={`translate(${lerp(540, x0 + cell.w / 2, billToCell)} ${lerp(980, y0 + cell.h / 2, billToCell)}) rotate(${
                (1 - billP) * -20 + Math.sin(t * 2) * 2 * (1 - billToCell)
              }) scale(${lerp(Math.max(0, billP), cell.w / 560, billToCell)})`}
            >
              <Bill w={560} />
            </g>
          )}
          {/* grid of notes → collapses into a brick → lands on the scale */}
          {t >= g0 + 0.3 &&
            Array.from({length: COLS * ROWS}).map((_, i) => {
              const r = Math.floor(i / COLS);
              const c = i % COLS;
              const at = g0 + 0.3 + ((r + c) / (ROWS + COLS - 2)) * (B.countEnd - g0 - 0.45);
              const p = i === 0 ? 1 : clamp(springAt(t, at, 26, 0.32), 0, 1.3);
              if (t < at && i !== 0) return null;
              const gx = x0 + c * cell.gx;
              const gy = y0 + r * cell.gy;
              const delay = rand(i) * 0.08;
              const cp = clamp((collapse * 1.1 - delay) / 1);
              const bx = bx0 + c * blk.w;
              const by = blockTop + r * blk.h;
              const x = lerp(gx, bx, cp);
              const y = lerp(gy, by, cp);
              const w = lerp(cell.w, blk.w, cp);
              const h = lerp(cell.h, blk.h, cp);
              return (
                <g key={i} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${p})`}>
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={3} fill={cp > 0.9 ? '#8fb27a' : '#9cc487'} stroke="#2d4a2a" strokeWidth={cp > 0.5 ? 1.5 : 3} />
                  {cp < 0.5 && <circle r={h * 0.25} fill="none" stroke="#2d4a2a" strokeWidth={2} />}
                </g>
              );
            })}

          {/* scale */}
          {t >= B.kg - 0.1 && (
            <g transform={`translate(0 ${(1 - scaleIn) * 700})`}>
              <g transform={`translate(0 ${plate * 0 + (landed ? Math.sin(Math.min(1, (t - B.kgLand) * 5) * Math.PI) * 14 : 0)})`}>
                <rect x={250} y={1050} width={580} height={22} rx={8} fill={C.ink} />
                <rect x={520} y={1072} width={40} height={50} fill={C.ink} />
              </g>
              <rect x={330} y={1110} width={420} height={150} rx={26} fill="#2a2630" stroke={C.ink} strokeWidth={6} />
              <circle cx={540} cy={1185} r={58} fill={C.paper} stroke={C.ink} strokeWidth={6} />
              {Array.from({length: 11}).map((_, k) => {
                const ang = ((-120 + k * 24) * Math.PI) / 180;
                return (
                  <line
                    key={k}
                    x1={540 + Math.sin(ang) * 44}
                    y1={1185 - Math.cos(ang) * 44}
                    x2={540 + Math.sin(ang) * 52}
                    y2={1185 - Math.cos(ang) * 52}
                    stroke={C.ink}
                    strokeWidth={3}
                  />
                );
              })}
              <g transform={`translate(540 1185) rotate(${needle})`}>
                <line x1={0} y1={8} x2={0} y2={-46} stroke={C.magenta} strokeWidth={6} strokeLinecap="round" />
              </g>
              <circle cx={540} cy={1185} r={8} fill={C.ink} />
            </g>
          )}
          {/* dust puff on landing */}
          {landed &&
            Array.from({length: 16}).map((_, k) => {
              const p = clamp((t - B.kgLand) / 0.7);
              const dir = k % 2 ? 1 : -1;
              const x = 540 + dir * (230 + p * (120 + rand(k) * 220));
              const y = 1045 - p * (30 + rand(k + 3) * 90);
              return <circle key={k} cx={x} cy={y} r={(10 + rand(k + 7) * 20) * (0.5 + p)} fill={C.paperDark} opacity={(1 - p) * 0.9} />;
            })}
        </svg>

        {/* 100 KG */}
        {landed && (
          <div style={{position: 'absolute', top: 430, left: 0, right: 0}}>
            <SlamText t={t} at={B.kgLand + 0.02} text="100 КГ" size={190} color={C.ink} stagger={0.04} letterSpacing={-6} />
            <div
              style={{
                textAlign: 'center',
                marginTop: 18,
                fontFamily: F.mono,
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: 3,
                color: C.ink,
                opacity: prog(t, B.kgLand + 0.5, 0.3),
              }}
            >
              ≈ <span style={{color: C.magenta}}>2 мешка цемента</span>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 23.5 – 27.35: trying to carry 100 kg down the motel stairs. */
export const StairsScene: React.FC<{t: number}> = ({t}) => {
  const a = S.stairs[0];
  const fail = B.stairsFail;
  const failed = t >= fail;
  const tremble = lerp(1.5, 7, prog(t, a, fail - a, ease.inCubic)) * (failed ? 1.6 : 1);
  const tx = noise1(t * 22, 1) * tremble;
  const ty = noise1(t * 22, 2) * tremble;
  const buckle = failed ? clamp(springAt(t, fail, 16, 0.3), 0, 1.2) : 0;
  const stamina = failed ? 0 : track(t, [[a, 100], [a + 0.4, 100], [fail, 6]], ease.inOutCubic);
  const blink = failed && Math.floor(t * 8) % 2 === 0;
  const fl = neonFlicker(t + 3);
  const push = lerp(1, 1.08, prog(t, a, 4, ease.outCubic));
  const sh = shake(t, fail, 22, 6);
  const bagDrop = buckle * 40;

  const hangBag = (dir: number) => (
    <g>
      <line x1={0} y1={0} x2={dir * 6} y2={56} stroke={C.ink} strokeWidth={10} />
      <g transform={`translate(${dir * 10} ${120 + bagDrop}) rotate(${dir * 4 + noise1(t * 3, dir + 5) * 3}) scale(0.62)`}>
        <Duffel open={false} />
      </g>
    </g>
  );

  return (
    <AbsoluteFill style={{background: '#0d0a1f'}}>
      <AbsoluteFill style={{transform: `scale(${push}) rotate(${-3 + sh.r}deg) translate(${sh.x}px, ${sh.y}px)`}}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0c0820" />
              <stop offset="1" stopColor="#3a1446" />
            </linearGradient>
            <radialGradient id="signGlow">
              <stop offset="0" stopColor={C.magenta} stopOpacity="0.6" />
              <stop offset="1" stopColor={C.magenta} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x={-200} y={-200} width={1480} height={2400} fill="url(#sky)" />
          {Array.from({length: 40}).map((_, i) => (
            <circle key={i} cx={rand(i) * 1080} cy={rand(i + 4) * 700} r={1 + rand(i + 2) * 2} fill="#fff" opacity={0.3 + 0.5 * rand(i + 8)} />
          ))}
          {/* building */}
          <rect x={-200} y={600} width={1500} height={1500} fill="#1b1430" />
          {Array.from({length: 5}).map((_, i) => (
            <g key={i}>
              <rect x={60 + i * 210} y={680} width={140} height={190} fill="#120d22" stroke="#2a2045" strokeWidth={6} />
              <rect x={70 + i * 210} y={690} width={120} height={170} fill={i === 2 ? C.amber : '#231a3e'} opacity={i === 2 ? 0.45 : 1} />
            </g>
          ))}
          {/* neon sign */}
          <ellipse cx={130} cy={380} rx={260} ry={420} fill="url(#signGlow)" opacity={fl} />
          <rect x={70} y={60} width={120} height={640} rx={16} fill="#0a0812" stroke="#2a2045" strokeWidth={6} />
          {'МОТЕЛЬ'.split('').map((ch, i) => (
            <text
              key={i}
              x={130}
              y={150 + i * 100}
              textAnchor="middle"
              fontFamily={F.display}
              fontWeight={900}
              fontSize={80}
              fill={i === 3 && fl < 0.7 ? '#4a1830' : C.magentaHot}
              style={{filter: `drop-shadow(0 0 12px ${C.magenta})`}}
            >
              {ch}
            </text>
          ))}
          {/* walkway + stairs */}
          <rect x={-200} y={1150} width={780} height={40} fill="#2c2440" />
          <rect x={-200} y={1190} width={780} height={900} fill="#140f24" />
          {Array.from({length: 11}).map((_, i) => (
            <rect key={i} x={560 + i * 62} y={1150 + i * 52} width={72} height={52} fill="#2c2440" stroke="#0e0a1a" strokeWidth={4} />
          ))}
          <path d="M 560 1050 L 1260 1640" stroke="#6b5c8f" strokeWidth={10} />
          {Array.from({length: 8}).map((_, i) => (
            <line key={i} x1={600 + i * 90} y1={1084 + i * 76} x2={600 + i * 90} y2={1184 + i * 76} stroke="#4a3e68" strokeWidth={6} />
          ))}
          <path d="M -200 1050 L 560 1050" stroke="#6b5c8f" strokeWidth={10} />
          {/* weight arrows */}
          {[-1, 1].map((d) => {
            const p = (t * 1.6 + (d > 0 ? 0.5 : 0)) % 1;
            return (
              <g key={d} transform={`translate(${380 + d * 160} ${1180 + p * 40})`} opacity={1 - p}>
                <path d="M -18 0 L 0 26 L 18 0" stroke={C.magenta} strokeWidth={8} fill="none" strokeLinecap="round" />
              </g>
            );
          })}
          {/* character with 4 bags */}
          <g transform={`translate(${380 + tx} ${600 + ty + buckle * 46}) rotate(${buckle * 7}) scale(0.8)`}>
            <g transform="translate(-150 220) rotate(-72) scale(0.55)">
              <Duffel open={false} color="#2a2f44" />
            </g>
            <g transform="translate(150 220) rotate(72) scale(0.55)">
              <Duffel open={false} color="#2a2f44" />
            </g>
            <Character
              t={t}
              mood={failed ? 'panic' : 'worried'}
              arms="carry"
              sweat={1}
              look={{x: 0.6, y: 0.8}}
              leftHandItem={hangBag(-1)}
              rightHandItem={hangBag(1)}
            />
          </g>
        </svg>
      </AbsoluteFill>

      {/* stamina bar */}
      <div style={{position: 'absolute', top: 400, left: 90, right: 90}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: '#fff'}}>
          <span>ВЫНОСЛИВОСТЬ</span>
          <span style={{color: stamina < 30 ? C.red : '#fff'}}>{Math.round(stamina)}%</span>
        </div>
        <div style={{marginTop: 10, height: 30, borderRadius: 8, border: '4px solid #fff', padding: 4, background: 'rgba(0,0,0,0.4)'}}>
          <div
            style={{
              height: '100%',
              width: `${stamina}%`,
              borderRadius: 4,
              background: stamina < 30 ? C.red : `linear-gradient(90deg, ${C.money}, #c8f0a8)`,
              boxShadow: stamina < 30 ? `0 0 20px ${C.red}` : undefined,
            }}
          />
        </div>
      </div>
      {failed && (
        <div style={{position: 'absolute', top: 1170, left: 0, right: 0, textAlign: 'center', opacity: blink ? 1 : 0.85}}>
          <Stamp t={t} at={fail} text="ПЕРЕГРУЗ!" color={C.red} size={78} rotate={5} sub="100 КГ НА ОДНОГО" />
        </div>
      )}
    </AbsoluteFill>
  );
};
