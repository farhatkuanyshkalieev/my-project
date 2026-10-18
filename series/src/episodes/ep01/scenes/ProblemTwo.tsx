import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, lerp, prog, rand, shake, springAt, sumShake} from '../../../lib/anim';
import {SlamText, Stamp, TypeLabel} from '../../../components/FX';
import {BigBill, Bill} from '../../../components/Props';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const serialOf = (i: number) => {
  const L = (k: number) => LETTERS[Math.floor(rand(i * 7 + k) * LETTERS.length)];
  const n = Math.floor(rand(i * 3 + 1) * 1e8)
    .toString()
    .padStart(8, '0');
  return `${L(1)}${L(2)} ${n} ${L(3)}`;
};
const MATCH = 'KB 07143592 C';

/** 27.3 – 36.05: problem two — serial numbers / bait money. */
export const SerialScene: React.FC<{t: number}> = ({t}) => {
  const a = S.serial[0];
  const db = B.dbStart;
  const toTop = prog(t, db - 0.1, 0.5, ease.inOutQuint);
  const titleOut = prog(t, B.scanStart - 0.2, 0.4, ease.inOutQuint);
  const flipIn = clamp(springAt(t, B.p2Label + 0.15, 14, 0.3), 0, 1.2);
  const marked = t >= B.marked;
  const sh = sumShake(shake(t, B.p2Word, 14, 8), shake(t, B.marked, 34, 6));

  // bill transform (screen space)
  const bx = 540;
  const by = lerp(920, 690, toTop);
  const bs = lerp(0.95, 0.74, toTop);
  const br = -4 + Math.sin(t * 1.4) * 1.2;
  const toScreen = (x: number, y: number) => {
    const r = (br * Math.PI) / 180;
    return {
      x: bx + (x * Math.cos(r) - y * Math.sin(r)) * bs,
      y: by + (x * Math.sin(r) + y * Math.cos(r)) * bs,
    };
  };
  const serialPt = toScreen(210, -126);

  // magnifier path
  const lensP = prog(t, B.scanStart, B.serialLock - B.scanStart, ease.inOutCubic);
  const start = toScreen(-330, 90);
  const lc = {x: lerp(start.x, serialPt.x, lensP), y: lerp(start.y, serialPt.y, lensP) + Math.sin(lensP * Math.PI) * -120};
  const lensO = prog(t, B.scanStart - 0.1, 0.25) * (1 - prog(t, B.serialLock + 0.45, 0.3));
  const lock = prog(t, B.serialLock, 0.3, ease.outBack);
  const billTf = `translate(${bx} ${by}) rotate(${br}) scale(${bs} ${bs * flipIn})`;

  // database scroll
  const dbIn = prog(t, db, 0.45, ease.outExpo);
  const settle = B.marked - 0.85;
  const scroll = (() => {
    const x = clamp((t - db) / (settle - db));
    return ease.outCubic(x) * 60; // rows travelled
  })();
  const matched = t >= settle;
  const rowH = 54;

  return (
    <AbsoluteFill style={{background: '#0b120e'}}>
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(127,176,105,0.08) 2px, transparent 2px), linear-gradient(90deg, rgba(127,176,105,0.08) 2px, transparent 2px)',
          backgroundSize: '60px 60px',
          backgroundPosition: `${-t * 15}px ${-t * 15}px`,
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(127,176,105,0.18), transparent 60%)'}} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`}}>
        <div style={{position: 'absolute', top: 385, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <TypeLabel t={t} at={B.p2Label} text={t < B.scanStart ? 'ПРОБЛЕМА 2' : 'ПРОБЛЕМА 2 · НОМЕРА'} color={C.magenta} size={30} />
        </div>
        {titleOut < 1 && (
          <div style={{position: 'absolute', top: 1150, left: 0, right: 0, opacity: 1 - titleOut, transform: `translateY(${titleOut * 60}px)`}}>
            <SlamText t={t} at={B.p2Word} text="НОМЕРА" size={150} color="#dff7cf" stagger={0.04} letterSpacing={-4} />
          </div>
        )}

        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          <defs>
            <clipPath id="lens">
              <circle cx={lc.x} cy={lc.y} r={128} />
            </clipPath>
          </defs>
          <g transform={billTf}>
            <BigBill redden={marked ? prog(t, B.marked, 0.3) : 0} />
            {lock > 0 && (
              <g>
                {[
                  [-1, -1],
                  [1, -1],
                  [1, 1],
                  [-1, 1],
                ].map(([sx, sy], i) => {
                  const w = lerp(330, 180, lock);
                  const h = lerp(90, 34, lock);
                  const cx = 210 + sx * w;
                  const cy = -126 + sy * h;
                  return (
                    <path
                      key={i}
                      d={`M ${cx} ${cy - sy * 26} L ${cx} ${cy} L ${cx - sx * 26} ${cy}`}
                      stroke={C.magenta}
                      strokeWidth={8}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
                <rect x={30} y={-160} width={360} height={68} fill={C.magenta} opacity={0.18 * lock} rx={6} />
              </g>
            )}
          </g>
          {/* magnifier */}
          {lensO > 0 && (
            <g opacity={lensO}>
              <g clipPath="url(#lens)">
                <rect x={lc.x - 130} y={lc.y - 130} width={260} height={260} fill="#0b120e" />
                <g transform={`translate(${lc.x} ${lc.y}) scale(2.3) translate(${-lc.x} ${-lc.y})`}>
                  <g transform={billTf}>
                    <BigBill />
                  </g>
                </g>
              </g>
              <circle cx={lc.x} cy={lc.y} r={128} fill="none" stroke="#e8e2d0" strokeWidth={14} />
              <circle cx={lc.x} cy={lc.y} r={120} fill="none" stroke="#fff" strokeWidth={3} opacity={0.5} />
              <line x1={lc.x + 92} y1={lc.y + 92} x2={lc.x + 200} y2={lc.y + 200} stroke="#e8e2d0" strokeWidth={30} strokeLinecap="round" />
              <path d={`M ${lc.x - 70} ${lc.y - 60} Q ${lc.x - 40} ${lc.y - 95} ${lc.x} ${lc.y - 100}`} stroke="#fff" strokeWidth={8} opacity={0.4} fill="none" />
            </g>
          )}
          {/* connector from serial to registry */}
          {dbIn > 0 && (
            <path
              d={`M ${serialPt.x} ${serialPt.y + 30} C ${serialPt.x} ${serialPt.y + 220}, 540 ${980 - 120}, 540 ${980}`}
              stroke={matched ? C.red : C.magenta}
              strokeWidth={5}
              strokeDasharray="14 10"
              strokeDashoffset={-t * 120}
              fill="none"
              opacity={dbIn}
            />
          )}
        </svg>

        {lock > 0 && (
          <div
            style={{
              position: 'absolute',
              left: serialPt.x - 180,
              top: serialPt.y - 130,
              width: 360,
              textAlign: 'center',
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: 4,
              color: C.magentaHot,
              opacity: lock * (1 - prog(t, db, 0.3)),
            }}
          >
            СЕРИЙНЫЙ НОМЕР
          </div>
        )}

        {/* registry panel */}
        {dbIn > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 90,
              right: 90,
              top: 990,
              height: 300,
              transform: `translateY(${(1 - dbIn) * 600}px)`,
              background: 'rgba(8,10,9,0.92)',
              border: `3px solid ${matched ? C.red : 'rgba(255,255,255,0.18)'}`,
              borderRadius: 22,
              overflow: 'hidden',
              boxShadow: matched ? `0 0 60px ${C.red}66` : '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                padding: '16px 26px',
                fontFamily: F.mono,
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: 4,
                color: 'rgba(255,255,255,0.6)',
                borderBottom: '2px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>РЕЕСТР БАНКА</span>
              <span style={{color: matched ? C.red : C.money}}>{matched ? '● СОВПАДЕНИЕ' : '● ПОИСК…'}</span>
            </div>
            <div style={{position: 'relative', height: 230, overflow: 'hidden'}}>
              {Array.from({length: 7}).map((_, k) => {
                const idx = Math.floor(scroll) + k - 2;
                const off = (scroll % 1) * rowH;
                const isMatch = matched && k === 2;
                const label = idx === 60 ? MATCH : serialOf(idx + 100);
                return (
                  <div
                    key={k}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 88 + (k - 2) * rowH - off,
                      height: rowH,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 26px',
                      fontFamily: F.mono,
                      fontWeight: 700,
                      fontSize: 34,
                      letterSpacing: 3,
                      color: isMatch ? '#fff' : 'rgba(255,255,255,0.55)',
                      background: isMatch ? C.red : 'transparent',
                      filter: !matched && t > db ? `blur(${Math.min(3, (1 - clamp((t - db) / (settle - db))) * 4)}px)` : undefined,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{fontSize: 22}}>{isMatch ? '✓ МЕЧЕНАЯ' : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {marked && (
          <div style={{position: 'absolute', top: 520, left: 0, right: 0, textAlign: 'center'}}>
            <Stamp t={t} at={B.marked} text={'МЕЧЕНЫЕ\nДЕНЬГИ'} color={C.red} size={88} rotate={-9} sub="ЗАПИСАНЫ ДО ОГРАБЛЕНИЯ" />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 35.95 – 39.35: the checkout scanner flags the note, then the city lights up. */
export const RegisterScene: React.FC<{t: number}> = ({t}) => {
  const radar = t >= B.hunted;
  return radar ? <RadarMap t={t} /> : <Checkout t={t} />;
};

const Checkout: React.FC<{t: number}> = ({t}) => {
  const a = S.register[0];
  const feed = prog(t, a + 0.15, 0.5, ease.outCubic);
  const suck = prog(t, B.registerScan - 0.05, 0.35, ease.inCubic);
  const alert = t >= B.registerAlert;
  const pulse = alert ? 0.5 + 0.5 * Math.sin((t - B.registerAlert) * 22) : 0;
  const sh = shake(t, B.registerAlert, 18, 7);
  const scanLine = ((t - B.registerScan) / 0.7) % 1;
  const billY = lerp(1700, 1250, feed) - suck * 300;
  const push = lerp(1.0, 1.1, prog(t, a, 3, ease.outCubic));
  return (
    <AbsoluteFill style={{background: '#13262a'}}>
      <AbsoluteFill style={{transform: `scale(${push}) translate(${sh.x}px, ${sh.y}px)`}}>
        {/* shelves */}
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {Array.from({length: 5}).map((_, r) => (
            <g key={r}>
              <rect x={0} y={150 + r * 150} width={1080} height={14} fill="#0b1719" />
              {Array.from({length: 12}).map((_, c) => {
                const w = 50 + rand(r * 20 + c) * 40;
                const h = 60 + rand(r * 20 + c + 7) * 60;
                const x = c * 92 + rand(c + r) * 20;
                const col = ['#ff6b6b', '#ffd36b', '#6bd3ff', '#b06bff', '#7fe08a'][(r + c) % 5];
                return <rect key={c} x={x} y={150 + r * 150 - h} width={w} height={h} rx={6} fill={col} opacity={0.22} />;
              })}
            </g>
          ))}
          <rect x={0} y={1180} width={1080} height={800} fill="#2b3134" />
          <rect x={0} y={1180} width={1080} height={18} fill="#454d51" />
          {/* device */}
          <rect x={300} y={700} width={480} height={490} rx={36} fill="#22272b" stroke="#0e1113" strokeWidth={8} />
          <rect x={360} y={750} width={360} height={190} rx={16} fill={alert ? C.red : '#0c2a1c'} opacity={alert ? 0.75 + 0.25 * pulse : 1} />
          <rect x={340} y={1000} width={400} height={50} rx={25} fill="#090b0c" />
          {!alert && t > B.registerScan && (
            <rect x={350} y={1004} width={380} height={42} rx={21} fill="#5dff9a" opacity={0.25 + 0.35 * Math.abs(Math.sin(scanLine * Math.PI * 2))} />
          )}
          {!alert && t > B.registerScan && (
            <rect x={360} y={750 + scanLine * 182} width={360} height={8} fill="#5dff9a" opacity={0.85} />
          )}
          <circle cx={540} cy={676} r={34} fill={alert ? C.red : '#3a1a1a'} stroke="#0e1113" strokeWidth={6} opacity={alert ? 0.6 + 0.4 * pulse : 1} />
          {alert && <circle cx={540} cy={676} r={120 + pulse * 40} fill={C.red} opacity={0.18} />}
          {/* bill + hand, clipped below the slot */}
          <defs>
            <clipPath id="belowSlot">
              <rect x={0} y={1025} width={1080} height={1200} />
            </clipPath>
          </defs>
          <g clipPath="url(#belowSlot)">
            <g transform={`translate(540 ${billY}) rotate(90)`}>
              <Bill w={340} />
            </g>
            <g transform={`translate(${560} ${billY + 190 + suck * 300})`}>
              <path d="M -10 60 Q 10 260 -80 520" stroke={C.ink} strokeWidth={170} strokeLinecap="round" fill="none" />
              <path d="M -10 60 Q 10 260 -80 520" stroke={C.hoodie} strokeWidth={150} strokeLinecap="round" fill="none" />
              <path d="M -60 150 Q -40 300 -100 480" stroke={C.hoodieShade} strokeWidth={30} strokeLinecap="round" fill="none" />
              <ellipse cx={-14} cy={10} rx={74} ry={66} fill={C.skin} stroke={C.ink} strokeWidth={8} />
              <path d="M -50 -10 Q -30 10 -46 36" stroke={C.skinShade} strokeWidth={6} fill="none" />
            </g>
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 360,
            top: 750,
            width: 360,
            height: 190,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: F.mono,
            fontWeight: 700,
            color: alert ? '#fff' : '#5dff9a',
            textAlign: 'center',
          }}
        >
          {alert ? (
            <>
              <div style={{fontSize: 46, letterSpacing: 4}}>⚠ ОШИБКА</div>
              <div style={{fontSize: 22, letterSpacing: 2, marginTop: 8}}>НОМЕР В РОЗЫСКЕ</div>
            </>
          ) : (
            <div style={{fontSize: 30, letterSpacing: 4}}>{t > B.registerScan ? 'ПРОВЕРКА…' : 'ВСТАВЬТЕ КУПЮРУ'}</div>
          )}
        </div>
      </AbsoluteFill>
      {alert && <AbsoluteFill style={{background: C.red, opacity: pulse * 0.16, mixBlendMode: 'screen'}} />}
    </AbsoluteFill>
  );
};

const RadarMap: React.FC<{t: number}> = ({t}) => {
  const a = B.hunted;
  const zoom = lerp(1.6, 1, prog(t, a, 0.6, ease.outExpo));
  const sweep = (t - a) * 260;
  const pin = {x: 540, y: 900};
  return (
    <AbsoluteFill style={{background: '#070b1a'}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        <svg width={1080} height={1920} style={{position: 'absolute'}}>
          {/* river */}
          <path d="M -50 1300 C 300 1150, 500 1500, 1130 1250 L 1130 1380 C 500 1640, 300 1290, -50 1440 Z" fill="#0f1a3a" />
          {/* streets */}
          {Array.from({length: 16}).map((_, i) => (
            <line key={`h${i}`} x1={-100} y1={i * 130 + rand(i) * 40} x2={1180} y2={i * 130 + 60 + rand(i + 3) * 40} stroke="#1c2650" strokeWidth={rand(i + 5) > 0.7 ? 14 : 6} />
          ))}
          {Array.from({length: 10}).map((_, i) => (
            <line key={`v${i}`} x1={i * 120 + rand(i + 8) * 40} y1={-100} x2={i * 120 - 80 + rand(i + 9) * 40} y2={2020} stroke="#1c2650" strokeWidth={rand(i + 11) > 0.7 ? 14 : 6} />
          ))}
          {/* range rings */}
          {[180, 360, 540].map((r) => (
            <circle key={r} cx={pin.x} cy={pin.y} r={r} fill="none" stroke="#2b3f8a" strokeWidth={2} strokeDasharray="8 10" />
          ))}
          {/* police units converging */}
          {Array.from({length: 6}).map((_, i) => {
            const ang = rand(i + 21) * Math.PI * 2;
            const d0 = 700 + rand(i + 22) * 200;
            const p = prog(t, a + 0.1 + i * 0.08, 1.6, ease.outCubic);
            const d = lerp(d0, 150 + rand(i) * 60, p);
            const x = pin.x + Math.cos(ang) * d;
            const y = pin.y + Math.sin(ang) * d;
            const on = Math.floor(t * 8 + i) % 2 === 0;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={28} fill={on ? C.red : C.blue} opacity={0.3} />
                <circle cx={x} cy={y} r={13} fill={on ? C.red : C.blue} stroke="#fff" strokeWidth={4} />
              </g>
            );
          })}
          {/* pulse rings around the pin */}
          {[0, 0.33, 0.66].map((o) => {
            const p = ((t - a) * 1.2 + o) % 1;
            return <circle key={o} cx={pin.x} cy={pin.y} r={30 + p * 260} fill="none" stroke={C.red} strokeWidth={6} opacity={1 - p} />;
          })}
          <g transform={`translate(${pin.x} ${pin.y - 10}) scale(${clamp(springAt(t, a + 0.1, 18, 0.3), 0, 1.2)})`}>
            <path d="M 0 0 C -50 -60 -50 -120 0 -120 C 50 -120 50 -60 0 0 Z" fill={C.red} stroke="#fff" strokeWidth={6} />
            <circle cx={0} cy={-78} r={16} fill="#fff" />
          </g>
        </svg>
        <AbsoluteFill
          style={{
            background: `conic-gradient(from ${sweep}deg at 50% ${(pin.y / 1920) * 100}%, rgba(80,140,255,0.32), rgba(80,140,255,0) 50deg, transparent 360deg)`,
            mixBlendMode: 'screen',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: pin.x + 40,
            top: pin.y - 150,
            fontFamily: F.mono,
            fontWeight: 700,
            fontSize: 26,
            color: '#fff',
            letterSpacing: 3,
            background: 'rgba(7,11,26,0.85)',
            border: `2px solid ${C.red}`,
            padding: '6px 12px',
            borderRadius: 8,
            opacity: prog(t, a + 0.3, 0.2),
          }}
        >
          МОТЕЛЬ · КОМН. 7
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: Math.floor(t * 5) % 2 ? 1 : 0.55}}>
        <Stamp t={t} at={a + 0.05} text="ТЕБЯ ИЩУТ" color={C.red} size={92} rotate={-4} />
      </div>
    </AbsoluteFill>
  );
};
