import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../../../lib/theme';
import {clamp, ease, fmtMoney, lerp, prog, shake, springAt, sumShake} from '../../../lib/anim';
import {SeriesTitle} from '../../../components/SeriesTitle';
import {SlamText, Stamp, TypeLabel} from '../../../components/FX';
import {BankIcon, Cctv, Cross, Envelope, GovIcon, Passport, SafeWall, StorageIcon} from '../../../components/Icons';
import {Character} from '../../../components/Character';
import cues from '../cues.json';

const B = cues.beats;
const S = cues.scenes;

export const Title: React.FC<{t: number}> = ({t}) => (
  <SeriesTitle t={t} at={S.title[0]} label="СЕРИЯ 2 · СВИДЕТЕЛЬ" subtitle="КУДА СПРЯТАТЬ 10 МИЛЛИОНОВ?" />
);

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

const TILES = [
  {label: 'БАНК', icon: <BankIcon />},
  {label: 'СКЛАД', icon: <StorageIcon />},
  {label: 'ЯЧЕЙКА', icon: <SafeWall />},
];
const FAILS = [B.opt2 - 0.25, B.opt3 - 0.3, B.again + 0.35];
const OPT_START = [B.opt1, B.opt2, B.opt3];

/** Tile geometry: big (question card) → small row under the HUD (options). */
const tileBox = (i: number, small: number) => {
  const big = {x: 180 + i * 360, y: 1030, w: 300, h: 330};
  const sm = {x: 200 + i * 340, y: 410, w: 300, h: 110};
  return {
    x: lerp(big.x, sm.x, small),
    y: lerp(big.y, sm.y, small),
    w: lerp(big.w, sm.w, small),
    h: lerp(big.h, sm.h, small),
    iconScale: lerp(0.62, 0.2, small),
    small,
  };
};

const Tiles: React.FC<{t: number; small: number; appear?: number[]}> = ({t, small, appear}) => (
  <>
    {TILES.map((tile, i) => {
      const box = tileBox(i, small);
      const pop = appear ? clamp(springAt(t, appear[i], 18, 0.3), 0, 1.2) : 1;
      if (appear && t < appear[i]) return null;
      const active = small > 0.9 && t >= OPT_START[i] - 0.1 && (i === 2 || t < OPT_START[i + 1] - 0.1);
      const failP = small > 0.9 ? prog(t, FAILS[i], 0.3, ease.outCubic) : 0;
      const failed = failP > 0;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: box.x - box.w / 2,
            top: box.y - box.h / 2,
            width: box.w,
            height: box.h,
            borderRadius: 24,
            background: failed ? '#e0d8c8' : '#fff',
            border: `5px solid ${active ? C.magenta : C.ink}`,
            boxShadow: active ? `0 0 0 6px ${C.magenta}44, 6px 6px 0 ${C.ink}` : `6px 6px 0 ${C.ink}`,
            transform: `scale(${pop * (active ? 1.06 : 1)})`,
            overflow: 'hidden',
          }}
        >
          <svg width={box.w} height={box.h} style={{position: 'absolute', left: 0, top: 0}}>
            <g
              transform={`translate(${small > 0.5 ? 60 : box.w / 2} ${small > 0.5 ? box.h / 2 : box.h * 0.42}) scale(${box.iconScale})`}
              opacity={failed ? 0.45 : 1}
            >
              {tile.icon}
            </g>
            {failed && (
              <g transform={`translate(${box.w / 2} ${box.h / 2})`}>
                <Cross p={failP} size={small > 0.5 ? 60 : 120} />
              </g>
            )}
          </svg>
          <div
            style={{
              position: 'absolute',
              left: small > 0.5 ? 110 : 0,
              right: small > 0.5 ? 0 : 0,
              top: small > 0.5 ? 0 : box.h - 86,
              bottom: small > 0.5 ? 0 : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: small > 0.5 ? 'flex-start' : 'center',
              gap: 10,
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: small > 0.5 ? 30 : 40,
              color: failed ? '#8a8378' : C.ink,
              textDecoration: failed ? 'line-through' : undefined,
              textDecorationColor: C.red,
              textDecorationThickness: 5,
            }}
          >
            <span
              style={{
                width: small > 0.5 ? 34 : 46,
                height: small > 0.5 ? 34 : 46,
                borderRadius: '50%',
                background: C.magenta,
                color: '#fff',
                fontSize: small > 0.5 ? 20 : 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              {i + 1}
            </span>
            {tile.label}
          </div>
        </div>
      );
    })}
  </>
);

/** "Куда спрятать десять миллионов?" */
export const Question: React.FC<{t: number}> = ({t}) => {
  const a = S.question[0];
  const ten = W10(t);
  const sh = shake(t, B.question, 12, 8);
  return (
    <Paper t={t}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <div style={{position: 'absolute', top: 380, left: 0, right: 0}}>
          <SlamText t={t} at={B.question} text="КУДА СПРЯТАТЬ" size={84} color={C.ink} stagger={0.025} letterSpacing={-3} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 500,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 112,
            letterSpacing: -4,
            color: C.moneyDark,
            opacity: prog(t, a + 0.7, 0.2),
            transform: `scale(${0.8 + 0.2 * ease.outBack(prog(t, a + 0.7, 0.35, (x) => x))})`,
          }}
        >
          {fmtMoney(ten)}
          <span style={{color: C.magenta}}>?</span>
        </div>
        <Tiles t={t} small={0} appear={[a + 1.0, a + 1.2, a + 1.4]} />
      </AbsoluteFill>
    </Paper>
  );
};

const W10 = (t: number) => 10_000_000 * prog(t, S.question[0] + 0.7, 0.8, ease.outCubic);

const optWindow = (t: number, i: number) => {
  const start = OPT_START[i] - 0.12;
  const end = i < 2 ? OPT_START[i + 1] - 0.12 : S.options[1];
  if (t < start || t >= end) return null;
  const pin = prog(t, start, 0.35, ease.inOutQuint);
  const pout = i < 2 ? prog(t, end - 0.3, 0.3, ease.inOutQuint) : 0;
  return {x: (1 - pin) * 1080 - pout * 1080, o: 1};
};

const Header: React.FC<{t: number; i: number; word: string; at: number}> = ({t, i, word, at}) => (
  <>
    <div style={{position: 'absolute', top: 520, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
      <TypeLabel t={t} at={OPT_START[i]} text={`ВАРИАНТ ${i + 1}`} color={C.magenta} size={30} />
    </div>
    <div style={{position: 'absolute', top: 580, left: 0, right: 0}}>
      <SlamText t={t} at={at} text={word} size={118} color={C.ink} stagger={0.035} letterSpacing={-4} />
    </div>
  </>
);

const Bank: React.FC<{t: number}> = ({t}) => {
  const fill = prog(t, B.deposit, B.overLine - B.deposit + 0.3, ease.inOutCubic);
  const amount = lerp(0, 10_001, fill);
  const over = amount > 10_000;
  const env = prog(t, B.report + 0.05, 0.75, ease.inOutCubic);
  const envX = lerp(700, 820, env);
  const envY = lerp(1060, 940, env) - Math.sin(env * Math.PI) * 240;
  const bankIn = clamp(springAt(t, B.bank, 16, 0.3), 0, 1.2);
  const govIn = clamp(springAt(t, B.report - 0.2, 16, 0.3), 0, 1.2);
  return (
    <>
      <Header t={t} i={0} word="БАНК" at={B.bank} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <g transform={`translate(260 880) scale(${0.62 * bankIn})`}>
          <BankIcon />
        </g>
        {t > B.report - 0.2 && (
          <g transform={`translate(820 880) scale(${0.62 * govIn})`}>
            <GovIcon />
          </g>
        )}
        {/* deposit meter */}
        <g opacity={prog(t, B.deposit - 0.1, 0.2)}>
          <rect x={140} y={1080} width={800} height={46} rx={23} fill="#fff" stroke={C.ink} strokeWidth={6} />
          <rect x={146} y={1086} width={Math.max(0, 788 * fill)} height={34} rx={17} fill={over ? C.red : C.money} />
          <line x1={140 + 800 * 0.98} y1={1060} x2={140 + 800 * 0.98} y2={1146} stroke={C.magenta} strokeWidth={6} strokeDasharray="10 6" />
          <text x={140 + 800 * 0.98} y={1176} textAnchor="end" fontFamily={F.mono} fontWeight={700} fontSize={26} fill={C.magenta}>
            ПОРОГ $10 000
          </text>
          <text x={140} y={1050} fontFamily={F.mono} fontWeight={700} fontSize={26} fill={C.ink}>
            ВЗНОС НАЛИЧНЫМИ
          </text>
          <text x={940} y={1050} textAnchor="end" fontFamily={F.display} fontWeight={900} fontSize={40} fill={over ? C.red : C.ink}>
            {fmtMoney(amount)}
          </text>
        </g>
        {env > 0 && env < 1 && (
          <g transform={`translate(${envX} ${envY}) rotate(${env * 20 - 10}) scale(${0.7 - env * 0.3})`}>
            <Envelope />
          </g>
        )}
      </svg>
      {t >= B.auto && (
        <div style={{position: 'absolute', top: 1200, left: 0, right: 0, textAlign: 'center'}}>
          <Stamp t={t} at={B.auto} text="АВТОМАТИЧЕСКИ" color={C.red} size={60} rotate={-5} />
        </div>
      )}
    </>
  );
};

const Storage: React.FC<{t: number}> = ({t}) => {
  const inP = clamp(springAt(t, B.storage, 15, 0.3), 0, 1.2);
  const pass = clamp(springAt(t, B.passport, 16, 0.3), 0, 1.2);
  const cams = [
    {x: 150, y: 790, at: B.cameras, flip: false},
    {x: 930, y: 790, at: B.cameras + 0.18, flip: true},
    {x: 540, y: 1200, at: B.cameras + 0.36, flip: false},
  ];
  return (
    <>
      <Header t={t} i={1} word="СКЛАД" at={B.storage} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <g transform={`translate(540 ${960}) scale(${0.95 * inP})`}>
          <StorageIcon open={prog(t, B.storage + 0.4, 0.8, ease.outCubic) * 0.4} />
        </g>
        {cams.map((c, i) =>
          t >= c.at ? (
            <g key={i}>
              <polygon
                points={c.y > 1000 ? `${c.x},${c.y} ${c.x - 220},${c.y - 300} ${c.x + 220},${c.y - 300}` : `${c.x},${c.y} ${c.flip ? c.x - 420 : c.x + 420},${c.y + 160} ${c.flip ? c.x - 300 : c.x + 300},${c.y + 380}`}
                fill={C.red}
                opacity={0.1 + 0.06 * Math.sin(t * 6 + i)}
              />
              <g transform={`translate(${c.x} ${c.y}) scale(${0.8 * clamp(springAt(t, c.at, 20, 0.3), 0, 1.2)}) ${c.y > 1000 ? 'rotate(-110)' : ''}`}>
                <Cctv t={t} flip={c.flip} />
              </g>
            </g>
          ) : null
        )}
        {t >= B.passport && (
          <g transform={`translate(${lerp(-200, 290, Math.min(1, pass))} 1180) rotate(${-8 + (1 - Math.min(1, pass)) * -30}) scale(0.95)`}>
            <Passport>
              <Character t={t} mood="worried" />
            </Passport>
          </g>
        )}
      </svg>
      {t >= B.cameras + 0.4 && (
        <div style={{position: 'absolute', top: 1110, left: 560, fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: C.red, letterSpacing: 4}}>
          {Math.floor(t * 3) % 2 ? '● REC' : '○ REC'}
        </div>
      )}
    </>
  );
};

const Safe: React.FC<{t: number}> = ({t}) => {
  const inP = clamp(springAt(t, B.safe, 15, 0.3), 0, 1.2);
  const pull = prog(t, B.safe + 0.45, 0.6, ease.outBack);
  const checks = [
    {label: 'ПАСПОРТ', at: B.chkPassport},
    {label: 'ПОДПИСЬ', at: B.chkSign},
    {label: 'КАМЕРА', at: B.chkCam},
  ];
  const cctv = clamp(springAt(t, B.again, 16, 0.3), 0, 1.15);
  return (
    <>
      <Header t={t} i={2} word="ЯЧЕЙКА" at={B.safe} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <g transform={`translate(540 900) scale(${0.95 * inP})`}>
          <SafeWall pull={pull} />
        </g>
      </svg>
      <div style={{position: 'absolute', top: 1080, left: 170, display: 'flex', flexDirection: 'column', gap: 14}}>
        {checks.map((c) => {
          if (t < c.at - 0.05) return null;
          const p = clamp(springAt(t, c.at, 20, 0.3), 0, 1.2);
          return (
            <div key={c.label} style={{display: 'flex', alignItems: 'center', gap: 22, transform: `translateX(${(1 - Math.min(1, p)) * -80}px)`, opacity: Math.min(1, p)}}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  border: `5px solid ${C.ink}`,
                  background: C.magenta,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: F.display,
                  fontWeight: 900,
                  fontSize: 34,
                  transform: `scale(${p})`,
                }}
              >
                ✓
              </div>
              <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 52, color: C.ink, letterSpacing: -1}}>{c.label}</div>
            </div>
          );
        })}
      </div>
      {t >= B.again && (
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 660,
            width: 800,
            height: 560,
            borderRadius: 26,
            border: `10px solid ${C.ink}`,
            background: '#1a1d22',
            overflow: 'hidden',
            transform: `scale(${cctv}) rotate(2deg)`,
            boxShadow: `14px 14px 0 ${C.ink}`,
          }}
        >
          <svg width={780} height={540} style={{position: 'absolute', left: 0, top: 0, filter: 'grayscale(1) contrast(1.3) brightness(0.9)'}}>
            <g transform="translate(390 330) scale(1.5)">
              <Character t={t} mood="panic" sweat={1} look={{x: 0.4, y: -0.4}} />
            </g>
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 5px)',
            }}
          />
          <div style={{position: 'absolute', top: 20, left: 26, fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: C.red}}>
            {Math.floor(t * 3) % 2 ? '●' : '○'} REC · КАМ 04
          </div>
          <div style={{position: 'absolute', bottom: 18, right: 26, fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: '#fff'}}>ХРАНИЛИЩЕ · 09:41</div>
        </div>
      )}
      {t >= B.again + 0.15 && (
        <div style={{position: 'absolute', top: 1220, left: 0, right: 0, textAlign: 'center'}}>
          <Stamp t={t} at={B.again + 0.15} text="СНОВА ТЫ" color={C.red} size={70} rotate={-6} />
        </div>
      )}
    </>
  );
};

/** Three hiding spots, each one leaves a trail. */
export const OptionsScene: React.FC<{t: number}> = ({t}) => {
  const small = prog(t, S.options[0], 0.5, ease.inOutQuint);
  const sh = sumShake(...FAILS.map((f) => shake(t, f, 14, 8)), shake(t, B.auto, 18, 7), shake(t, B.again, 20, 7));
  const parts = [Bank, Storage, Safe];
  return (
    <Paper t={t}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`}}>
        {parts.map((P, i) => {
          const w = optWindow(t, i);
          if (!w) return null;
          return (
            <AbsoluteFill key={i} style={{transform: `translateX(${w.x}px)`}}>
              <P t={t} />
            </AbsoluteFill>
          );
        })}
        <Tiles t={t} small={small} />
      </AbsoluteFill>
    </Paper>
  );
};

export const OPTION_FAILS = FAILS;
