import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {Globe} from '../ui';
import {Big, Confetti, DISPLAY, FONT, Glass, I, INK, Kicker, Pop, Rays, Sfx, Solid, Y, clamp, ease, usePop} from './kit';

export type ShotProps = {
  shot: any;
  dur: number;
  phr: number[];
  w: {w: string; from: number; to: number}[]; // relative frames
  mood: string;
  idx: number;
};

const Txt: React.FC<{children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties}> = ({
  children,
  size = 44,
  color = '#fff',
  weight = 700,
  style,
}) => (
  <div style={{fontFamily: FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.15, textShadow: color === '#fff' ? '0 4px 14px rgba(0,0,0,0.25)' : undefined, ...style}}>
    {children}
  </div>
);

const Area: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', left: 110, right: 110, top: 70, height: 790, display: 'flex', alignItems: 'center', ...style}}>{children}</div>
);

const Bounce: React.FC<{children: React.ReactNode; amp?: number; speed?: number}> = ({children, amp = 14, speed = 9}) => {
  const f = useCurrentFrame();
  return <div style={{transform: `translateY(${Math.sin(f / speed) * amp}px)`}}>{children}</div>;
};

const BigIcon: React.FC<{name: string; at?: number; size?: number; color?: string; circle?: string}> = ({name, at = 4, size = 300, color = '#fff', circle}) => {
  const Ic = I[name] ?? I.star;
  return (
    <Pop at={at} from="rot">
      <Bounce>
        <div
          style={{
            width: size * 1.45,
            height: size * 1.45,
            borderRadius: '50%',
            background: circle ?? 'rgba(255,255,255,0.2)',
            border: '4px solid rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 30px 70px rgba(0,0,0,0.25)',
          }}
        >
          <Ic size={size} color={color} sw={1.7} />
        </div>
      </Bounce>
    </Pop>
  );
};

const Counter: React.FC<{to: number; at: number; dur?: number; size?: number; suffix?: string; prefix?: string; color?: string}> = ({
  to,
  at,
  dur = 22,
  size = 260,
  suffix = '',
  prefix = '',
  color = '#fff',
}) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [at, at + dur], [0, to], {...clamp, easing: Easing.out(Easing.cubic)}));
  const s = usePop(at, 8);
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size,
        color,
        lineHeight: 0.9,
        letterSpacing: -6,
        fontVariantNumeric: 'tabular-nums',
        transform: `scale(${0.5 + 0.5 * s})`,
        transformOrigin: 'left center',
        textShadow: '0 12px 0 rgba(0,0,0,0.18)',
      }}
    >
      {prefix}
      {v.toLocaleString('en-US').replace(/,/g, ' ')}
      {suffix}
    </div>
  );
};

/* ------------------------------------------------------------------ */
const VisNoBuild: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  const x = ease(f, at + 12, at + 22);
  return (
    <div style={{position: 'relative'}}>
      <BigIcon name="crane" at={at} />
      <svg width={500} height={500} viewBox="0 0 100 100" style={{position: 'absolute', left: -10, top: -20}}>
        <path d="M18 18 L82 82" stroke="#FF1744" strokeWidth={9} strokeLinecap="round" strokeDasharray="91" strokeDashoffset={91 * (1 - x)} />
        <path d="M82 18 L18 82" stroke="#FF1744" strokeWidth={9} strokeLinecap="round" strokeDasharray="91" strokeDashoffset={91 * (1 - ease(f, at + 18, at + 28))} />
      </svg>
      <Sfx at={at + 12} name="hit" volume={0.45} />
    </div>
  );
};

const VisHotels: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 92px)', gap: 16}}>
      {new Array(35).fill(0).map((_, k) => {
        const d = at + k * 1.1;
        const s = Math.max(0, Math.min(1, (f - d) / 6));
        return (
          <div key={k} style={{transform: `scale(${s < 1 ? s * 1.2 : 1})`, opacity: s}}>
            <I.hotel size={92} color={k % 5 === 0 ? Y : '#fff'} sw={1.8} />
          </div>
        );
      })}
    </div>
  );
};

const VisPlane: React.FC<{at: number; dur: number}> = ({at, dur}) => {
  const f = useCurrentFrame();
  const p = ease(f, at, dur - 5, 0, 1, Easing.inOut(Easing.cubic));
  const x = 40 + p * 620;
  const y = 380 - Math.sin(p * Math.PI) * 300 - p * 40;
  const ang = Math.atan2(-Math.cos(p * Math.PI) * 300 * Math.PI - 40, 620) * (180 / Math.PI);
  return (
    <div style={{position: 'relative', width: 700, height: 520}}>
      <svg width={760} height={520} style={{position: 'absolute'}}>
        <path
          d={`M40 380 Q 350 ${380 - 600} 660 340`}
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={6}
          strokeDasharray="4 18"
          strokeLinecap="round"
          fill="none"
          style={{clipPath: `inset(0 ${100 - p * 100}% 0 0)`}}
        />
      </svg>
      <div style={{position: 'absolute', left: 560, top: 300}}>
        <Pop at={at + 4}>
          <Solid style={{padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10}}>
            <I.hotel size={70} color={INK} />
          </Solid>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: x - 70, top: y - 70, transform: `rotate(${ang}deg)`}}>
        <I.plane size={140} color="#fff" sw={1.6} />
      </div>
    </div>
  );
};

const VisTea: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'relative'}}>
      <BigIcon name="tea" at={at} circle="rgba(255,255,255,0.22)" />
      {[0, 1, 2].map((k) => {
        const t = ((f + k * 12) % 36) / 36;
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: 150 + k * 60,
              top: 40 - t * 80,
              width: 30,
              height: 30,
              borderRadius: 15,
              background: 'rgba(255,255,255,0.7)',
              opacity: 1 - t,
              filter: 'blur(6px)',
            }}
          />
        );
      })}
    </div>
  );
};

const Vis: React.FC<{name: string; at: number; dur: number}> = ({name, at, dur}) => {
  switch (name) {
    case 'nobuild':
      return <VisNoBuild at={at} />;
    case 'hotels':
      return <VisHotels at={at} />;
    case 'plane':
      return <VisPlane at={at} dur={dur} />;
    case 'tea':
      return <VisTea at={at} />;
    case 'globe':
      return <Globe size={640} at={at} />;
    case 'globeheart':
      return <BigIcon name="globe" at={at} />;
    case 'cards':
      return <Fan at={at} names={['Six Senses', 'Kimpton', 'Crowne Plaza', 'Holiday Inn', 'voco']} />;
    default:
      return <BigIcon name={name} at={at} />;
  }
};

const Fan: React.FC<{at: number; names: string[]}> = ({at, names}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'relative', width: 640, height: 520}}>
      {names.map((n, k) => {
        const s = ease(f, at + k * 3, at + k * 3 + 14);
        const rot = (k - (names.length - 1) / 2) * 12 * s;
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: 170,
              top: 60,
              width: 300,
              height: 400,
              transformOrigin: '50% 120%',
              transform: `rotate(${rot}deg) translateY(${(1 - s) * 200}px)`,
              opacity: s,
            }}
          >
            <Solid style={{width: 300, height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20}}>
              <I.star size={70} color={['#FF4E00', '#6A1BFF', '#00A6A6', '#FF2E79', '#2B4CFF'][k % 5]} />
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 38, color: INK, textAlign: 'center'}}>{n}</div>
            </Solid>
          </div>
        );
      })}
    </div>
  );
};

/* ===================== SHOT TEMPLATES ===================== */
export const Shot: React.FC<ShotProps> = (p) => {
  const {shot} = p;
  switch (shot.t) {
    case 'punch':
      return <Punch {...p} />;
    case 'stat':
      return <Stat {...p} />;
    case 'split':
      return <Split {...p} />;
    case 'question':
      return <Question {...p} />;
    case 'logo':
      return <Logo {...p} />;
    case 'year':
      return <Year {...p} />;
    case 'merge':
      return <Merge {...p} />;
    case 'secret':
      return <Secret {...p} />;
    case 'exchange':
      return <Exchange {...p} />;
    case 'rocket':
      return <Rocket {...p} />;
    case 'brands':
      return <Brands {...p} />;
    case 'wallets':
      return <Wallets {...p} />;
    case 'chart':
      return <Chart {...p} />;
    case 'phone':
      return <Phone {...p} />;
    case 'loop':
      return <Loop {...p} />;
    case 'orbit':
      return <Orbit {...p} />;
    case 'eco':
      return <Eco {...p} />;
    case 'almaty':
      return <Almaty {...p} />;
    case 'checks':
      return <Checks {...p} />;
    case 'ornament':
      return <Ornament {...p} />;
    case 'flight':
      return <Flight {...p} />;
    case 'trio':
      return <Trio {...p} />;
    case 'pillars':
      return <Pillars {...p} />;
    case 'cta':
      return <Cta {...p} />;
    default:
      return null;
  }
};

const Punch: React.FC<ShotProps> = ({shot}) => {
  const f = useCurrentFrame();
  const kzs = usePop(0, 10);
  const unlock = ease(f, 14, 24);
  return (
    <AbsoluteFill>
      <Rays color={shot.kz ? '#FFC72C' : '#fff'} opacity={shot.kz ? 0.35 : 0.13} />
      {shot.kz && (
        <div style={{position: 'absolute', left: 960 - 130, top: 60, width: 260, height: 260, borderRadius: '50%', background: '#FFC72C', opacity: 0.95, transform: `scale(${kzs})`}} />
      )}
      <Sfx at={0} name="boom" volume={0.55} />
      <Area style={{justifyContent: 'center', flexDirection: 'column'}}>
        {shot.vis === 'lock' && (
          <Pop at={0} style={{marginBottom: 20}}>
            <svg width={220} height={220} viewBox="0 0 24 24" fill="none" stroke={Y} strokeWidth={2} strokeLinecap="round">
              <rect x="4" y="11" width="16" height="10" rx="2" fill="rgba(255,255,255,0.15)" />
              <path d={`M8 11V7a4 4 0 018 0${unlock > 0.5 ? '' : 'v4'}`} transform={`translate(0 ${-unlock * 2.5})`} />
              <circle cx="12" cy="16" r="1.4" />
            </svg>
            <Sfx at={14} name="ding" volume={0.35} />
          </Pop>
        )}
        <Big text={shot.big} size={shot.big.length > 12 ? 170 : 210} stagger={4} color={shot.kz ? '#fff' : '#fff'} />
      </Area>
    </AbsoluteFill>
  );
};

const Stat: React.FC<ShotProps> = ({shot, dur}) => (
  <AbsoluteFill>
    <Sfx at={0} name="hit" volume={0.5} />
    <Sfx at={2} name="tick" volume={0.3} />
    <Area style={{justifyContent: 'space-between'}}>
      <div>
        <Counter to={shot.to} at={0} suffix={shot.suffix} />
        <Pop at={8} from="up">
          <Kicker text={shot.label} at={8} bg={Y} />
        </Pop>
      </div>
      <Vis name={shot.vis} at={2} dur={dur} />
    </Area>
  </AbsoluteFill>
);

const Split: React.FC<ShotProps> = ({shot, dur, idx}) => {
  const flip = idx % 2 === 1;
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Area style={{justifyContent: 'space-between', flexDirection: flip ? 'row-reverse' : 'row', gap: 60}}>
        <div style={{flex: 1, textAlign: flip ? 'right' : 'left'}}>
          {shot.kicker && (
            <div style={{marginBottom: 26}}>
              <Kicker text={shot.kicker} at={2} bg={Y} />
            </div>
          )}
          <Big text={shot.big} size={shot.big.length > 12 ? 108 : 140} align={flip ? 'right' as any : 'left'} at={4} />
        </div>
        <Vis name={shot.vis} at={6} dur={dur} />
      </Area>
    </AbsoluteFill>
  );
};

const Question: React.FC<ShotProps> = ({shot}) => {
  const f = useCurrentFrame();
  const s = usePop(0, 6, 160);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="glitch" volume={0.4} />
      <Sfx at={3} name="hit" volume={0.4} />
      <div
        style={{
          position: 'absolute',
          right: 140,
          top: 40,
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 760,
          lineHeight: 1,
          color: Y,
          transform: `scale(${s}) rotate(${Math.sin(f / 6) * 8}deg)`,
          textShadow: '0 20px 0 rgba(0,0,0,0.18)',
        }}
      >
        ?
      </div>
      <Area>
        <div style={{maxWidth: 1150}}>
          <Big text={shot.big} size={200} align="left" />
          {shot.sub && (
            <Pop at={12} from="up" style={{marginTop: 30}}>
              <Txt size={56} weight={800}>
                {shot.sub}
              </Txt>
            </Pop>
          )}
        </div>
      </Area>
    </AbsoluteFill>
  );
};

const Logo: React.FC<ShotProps> = ({shot}) => {
  const f = useCurrentFrame();
  const letters = ['I', 'H', 'G'];
  return (
    <AbsoluteFill>
      <Rays opacity={0.18} />
      <Sfx at={0} name="riser" volume={0.3} />
      <Sfx at={10} name="boom" volume={0.6} />
      {shot.confetti && <Sfx at={10} name="confetti" volume={0.5} />}
      {shot.confetti && <Confetti at={10} />}
      <Area style={{justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{display: 'flex', gap: 20}}>
          {letters.map((l, k) => {
            const s = usePop(4 + k * 3, 7, 220);
            return (
              <div
                key={k}
                style={{
                  width: 260,
                  height: 300,
                  borderRadius: 40,
                  background: '#fff',
                  color: INK,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 240,
                  transform: `translateY(${(1 - s) * -500}px) rotate(${(1 - s) * 30}deg)`,
                  boxShadow: '0 18px 0 rgba(0,0,0,0.18)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {l}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 90,
                    left: -150 + ((f * 14 + k * 40) % 700),
                    background: 'linear-gradient(90deg, transparent, rgba(255,225,77,0.6), transparent)',
                    transform: 'skewX(-20deg)',
                  }}
                />
              </div>
            );
          })}
        </div>
        {!shot.confetti && (
          <Pop at={22} from="up" style={{marginTop: 46}}>
            <div style={{background: INK, color: '#fff', padding: '16px 34px', borderRadius: 18, fontFamily: FONT, fontWeight: 800, fontSize: 40}}>
              Қонақ үй брендтерінің <span style={{color: Y}}>халықаралық даму стратегиялары</span>
            </div>
          </Pop>
        )}
        {shot.confetti && (
          <Pop at={18} from="up" style={{marginTop: 46}}>
            <Kicker text="InterContinental Hotels Group" at={18} bg={Y} />
          </Pop>
        )}
      </Area>
    </AbsoluteFill>
  );
};

const Year: React.FC<ShotProps> = ({shot}) => {
  const f = useCurrentFrame();
  const digits = shot.year.split('');
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      {digits.map((_: string, k: number) => (
        <Sfx key={k} at={6 + k * 4} name="tick" volume={0.45} />
      ))}
      <Sfx at={22} name="hit" volume={0.45} />
      <Area style={{justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{display: 'flex', gap: 18}}>
          {digits.map((d: string, k: number) => {
            const stop = 6 + k * 4;
            const rolling = f < stop;
            const shown = rolling ? String(Math.floor((f * 7 + k * 3) % 10)) : d;
            const s = usePop(stop, 8);
            return (
              <div
                key={k}
                style={{
                  width: 230,
                  height: 320,
                  borderRadius: 34,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 270,
                  color: INK,
                  boxShadow: '0 16px 0 rgba(0,0,0,0.18)',
                  transform: rolling ? `translateY(${Math.sin(f) * 6}px)` : `scale(${0.85 + 0.15 * s})`,
                  filter: rolling ? 'blur(3px)' : undefined,
                }}
              >
                {shown}
              </div>
            );
          })}
        </div>
        {shot.sub && (
          <Pop at={24} from="up" style={{marginTop: 40}}>
            <Kicker text={shot.sub} at={24} bg={Y} />
          </Pop>
        )}
      </Area>
    </AbsoluteFill>
  );
};

const Merge: React.FC<ShotProps> = ({shot, dur}) => {
  const f = useCurrentFrame();
  const m = ease(f, 10, dur - 22, 0, 1, Easing.inOut(Easing.cubic));
  const flash = interpolate(f, [dur - 22, dur - 16, dur - 4], [0, 1, 0], clamp);
  const merged = f > dur - 20;
  const ms = usePop(dur - 20, 6);
  const Ball = ({label, x, col}: {label: string; x: number; col: string}) => (
    <div
      style={{
        position: 'absolute',
        left: 960 + x - 190,
        top: 300,
        width: 380,
        height: 380,
        borderRadius: '50%',
        background: col,
        border: '6px solid #fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 46,
        color: '#fff',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        opacity: merged ? 0 : 1,
      }}
    >
      {label}
    </div>
  );
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={dur - 22} name="boom" volume={0.55} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 110, display: 'flex', justifyContent: 'center'}}>
        <Kicker text={shot.year} at={0} bg={Y} />
      </div>
      <Ball label="InterContinental" x={-420 * (1 - m)} col="#2B4CFF" />
      <Ball label="Holiday Inn" x={420 * (1 - m)} col="#00A86B" />
      {merged && (
        <div style={{position: 'absolute', left: 960 - 230, top: 260, width: 460, height: 460, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${ms})`}}>
          <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 170, color: INK}}>IHG</span>
        </div>
      )}
      <AbsoluteFill style={{background: '#fff', opacity: flash * 0.8}} />
    </AbsoluteFill>
  );
};

const Secret: React.FC<ShotProps> = ({shot, dur, idx}) => {
  const f = useCurrentFrame();
  const s = usePop(0, 7, 200);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="boom" volume={0.5} />
      <Sfx at={8} name="whoosh" volume={0.3} />
      <Area style={{justifyContent: 'space-between', gap: 50}}>
        <div style={{flex: 1}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 30, marginBottom: 30}}>
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: Y,
                color: INK,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 130,
                transform: `scale(${s}) rotate(${(1 - s) * -180 + Math.sin(f / 10) * 4}deg)`,
                boxShadow: '0 14px 0 rgba(0,0,0,0.18)',
              }}
            >
              {shot.n}
            </div>
            <Kicker text="ҚҰПИЯ" at={4} bg={INK} color="#fff" />
          </div>
          <Big text={shot.big} size={shot.big.length > 14 ? 118 : 150} align="left" at={6} />
        </div>
        <Vis name={shot.vis} at={8} dur={dur} />
      </Area>
    </AbsoluteFill>
  );
};

const Exchange: React.FC<ShotProps> = ({phr, w, dur}) => {
  const f = useCurrentFrame();
  const t2 = phr[1] ?? 40;
  const gives = ['Бренд', 'Стандарт', 'Брондау жүйесі'];
  const brandAt = w.find((x) => x.w.startsWith('бренд'))?.from ?? t2 + 10;
  const stdAt = w.find((x) => x.w.startsWith('стандарт'))?.from ?? t2 + 20;
  const sysAt = w.find((x) => x.w.startsWith('брондау'))?.from ?? t2 + 30;
  const at3 = [brandAt, stdAt, sysAt];
  const Card = ({title, icon, items, col, at, ats}: any) => (
    <Pop at={at} from={col === 'l' ? 'left' : 'right'}>
      <Solid style={{width: 640, padding: '34px 40px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18}}>
          {icon}
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 56}}>{title}</div>
        </div>
        {items.map((it: string, k: number) => (
          <Pop key={k} at={ats[k]} from="up">
            <div style={{display: 'flex', alignItems: 'center', gap: 14, margin: '12px 0'}}>
              <I.check size={44} color="#00B86B" sw={3} />
              <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 40}}>{it}</span>
            </div>
          </Pop>
        ))}
      </Solid>
    </Pop>
  );
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.35} />
      <Sfx at={6} name="coins" volume={0.45} />
      {at3.map((a, k) => (
        <Sfx key={k} at={a} name="pop" volume={0.45} />
      ))}
      <Area style={{justifyContent: 'space-between'}}>
        <Card title="Иесі" icon={<I.coin size={80} color="#FF8A00" />} items={['Ақша', 'Ғимарат']} col="l" at={0} ats={[6, 14]} />
        <Card title="IHG" icon={<I.star size={80} color="#6A1BFF" />} items={gives} col="r" at={t2 - 6} ats={at3} />
      </Area>
      {/* flying coins */}
      {new Array(6).fill(0).map((_, k) => {
        const p = ((f - 8 - k * 7) % 40) / 40;
        if (f < 8 + k * 7 || f > dur - 10) return null;
        return (
          <div key={k} style={{position: 'absolute', left: 760 + p * 400, top: 430 - Math.sin(p * Math.PI) * 140, opacity: 1 - Math.abs(p - 0.5) * 1.6}}>
            <I.coin size={56} color={Y} sw={2.5} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Rocket: React.FC<ShotProps> = ({shot, dur}) => {
  const f = useCurrentFrame();
  const bars = [0.18, 0.3, 0.45, 0.62, 0.8, 1];
  const fly = ease(f, 6, dur, 0, 1, Easing.in(Easing.quad));
  return (
    <AbsoluteFill>
      <Sfx at={0} name="riser" volume={0.35} />
      <Sfx at={6} name="whoosh" volume={0.35} />
      <Area style={{justifyContent: 'space-between'}}>
        <div style={{width: 900}}>
          <Big text={shot.big} size={118} align="left" hl="↑" />
        </div>
        <div style={{position: 'relative', width: 640, height: 560}}>
          <div style={{position: 'absolute', bottom: 0, left: 0, display: 'flex', alignItems: 'flex-end', gap: 22}}>
            {bars.map((b, k) => (
              <div
                key={k}
                style={{
                  width: 74,
                  height: 460 * b * ease(f, 4 + k * 3, 16 + k * 3),
                  borderRadius: 16,
                  background: k === bars.length - 1 ? Y : 'rgba(255,255,255,0.85)',
                  boxShadow: '0 10px 0 rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
          <div style={{position: 'absolute', left: 380 + fly * 300, top: 40 - fly * 400, transform: `rotate(0deg)`}}>
            <I.rocket size={180} color="#fff" sw={1.6} />
          </div>
        </div>
      </Area>
    </AbsoluteFill>
  );
};

const Brands: React.FC<ShotProps> = ({shot, phr}) => {
  const f = useCurrentFrame();
  const at = phr[1] ?? 20;
  const stars = [5, 4, 3][shot.c];
  const cols = ['#FF4E00', '#6A1BFF', '#00A6A6'];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="swipe" volume={0.45} />
      {shot.brands.map((_: string, k: number) => (
        <Sfx key={k} at={at + k * 6} name="pop" volume={0.45} />
      ))}
      <Area style={{flexDirection: 'column', justifyContent: 'center', gap: 50}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
          <Kicker text={shot.tier} at={0} bg={Y} />
          <div style={{display: 'flex', gap: 6}}>
            {new Array(stars).fill(0).map((_, k) => (
              <Pop key={k} at={4 + k * 2}>
                <svg width={64} height={64} viewBox="0 0 24 24">
                  <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="#fff" />
                </svg>
              </Pop>
            ))}
          </div>
        </div>
        <div style={{display: 'flex', gap: 34, perspective: 1200}}>
          {shot.brands.map((b: string, k: number) => {
            const s = usePop(at + k * 6, 9);
            return (
              <div key={k} style={{transform: `rotateY(${(1 - s) * 90}deg) translateY(${Math.sin((f + k * 10) / 12) * 8}px)`, opacity: f >= at + k * 6 ? 1 : 0}}>
                <Solid style={{width: 500, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, borderTop: `14px solid ${cols[shot.c]}`}}>
                  <I.hotel size={70} color={cols[shot.c]} />
                  <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: b.length > 14 ? 44 : 54, textAlign: 'center', padding: '0 20px'}}>{b}</div>
                </Solid>
              </div>
            );
          })}
        </div>
      </Area>
    </AbsoluteFill>
  );
};

const Wallets: React.FC<ShotProps> = ({shot}) => {
  const items = [
    {s: '$', c: '#00A6A6', h: 260},
    {s: '$$', c: '#6A1BFF', h: 330},
    {s: '$$$', c: '#FF2E79', h: 400},
  ];
  return (
    <AbsoluteFill>
      {items.map((_, k) => (
        <Sfx key={k} at={8 + k * 5} name="coins" volume={0.3} />
      ))}
      <Area style={{justifyContent: 'space-between'}}>
        <div style={{width: 820}}>
          <Big text={shot.big} size={120} align="left" />
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 30}}>
          {items.map((it, k) => (
            <Pop key={k} at={8 + k * 5} from="up">
              <Solid style={{width: 220, height: it.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16}}>
                <I.wallet size={90} color={it.c} />
                <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, color: it.c}}>{it.s}</div>
              </Solid>
            </Pop>
          ))}
        </div>
      </Area>
    </AbsoluteFill>
  );
};

const Chart: React.FC<ShotProps> = ({shot, dur}) => {
  const f = useCurrentFrame();
  const p = ease(f, 4, Math.min(dur - 10, 60));
  const pts = [
    [0, 380],
    [110, 340],
    [220, 350],
    [330, 270],
    [440, 230],
    [550, 150],
    [660, 110],
    [770, 30],
  ];
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]},${q[1]}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <AbsoluteFill>
      <Sfx at={2} name="riser" volume={0.3} />
      <Sfx at={Math.min(dur - 10, 60)} name="ding" volume={0.4} />
      <Area style={{justifyContent: 'space-between'}}>
        <div style={{width: 720}}>
          <Big text={shot.big} size={150} align="left" hl="↑" />
          <Pop at={10} from="up" style={{marginTop: 20}}>
            <Kicker text="ЕҢ ЖЫЛДАМ ӨСУ" at={10} bg={INK} color="#fff" />
          </Pop>
        </div>
        <svg width={820} height={440} style={{overflow: 'visible'}}>
          <defs>
            <clipPath id="chc">
              <rect x={-10} y={-40} width={20 + 800 * p} height={500} />
            </clipPath>
          </defs>
          <g clipPath="url(#chc)">
            <path d={`${d} L770,420 L0,420 Z`} fill="rgba(255,255,255,0.25)" />
            <path d={d} stroke="#fff" strokeWidth={14} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <line x1={0} x2={800} y1={420} y2={420} stroke="rgba(255,255,255,0.6)" strokeWidth={4} />
          {p > 0.97 && <circle cx={last[0]} cy={last[1]} r={22 + 6 * Math.sin(f / 4)} fill={Y} stroke="#fff" strokeWidth={6} />}
        </svg>
      </Area>
    </AbsoluteFill>
  );
};

const Phone: React.FC<ShotProps> = ({dur}) => {
  const f = useCurrentFrame();
  const notes = ['+500 ұпай', 'Тегін түн!', 'Жеке ұсыныс'];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="swipe" volume={0.4} />
      <Sfx at={6} name="hit" volume={0.4} />
      {notes.map((_, k) => (
        <Sfx key={k} at={20 + k * 18} name="notif" volume={0.35} />
      ))}
      <Area style={{justifyContent: 'space-between'}}>
        <div>
          <Pop at={0} from="up">
            <Kicker text="IHG ONE REWARDS" at={0} bg={INK} color={Y} />
          </Pop>
          <div style={{height: 20}} />
          <Counter to={145} at={6} dur={30} size={180} suffix=" МЛН+" />
          <Pop at={16} from="up">
            <Txt size={56} weight={800}>
              мүше — адалдық бағдарламасында
            </Txt>
          </Pop>
        </div>
        <div style={{position: 'relative', width: 420, height: 760}}>
          <Pop at={2} from="up">
            <div
              style={{
                width: 380,
                height: 740,
                borderRadius: 60,
                background: INK,
                border: '10px solid #fff',
                padding: 26,
                transform: `rotate(${Math.sin(f / 20) * 3}deg)`,
                boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{width: 110, height: 24, borderRadius: 12, background: '#2a2050', margin: '0 auto 30px'}} />
              <div style={{borderRadius: 26, height: 200, background: `linear-gradient(135deg, ${Y}, #FF8A3D)`, padding: 22}}>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 20, color: INK}}>ҰПАЙЛАР</div>
                <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, color: INK}}>
                  {Math.round(interpolate(f, [0, dur], [12000, 48500], clamp)).toLocaleString('en-US').replace(/,/g, ' ')}
                </div>
              </div>
              {[0, 1, 2].map((k) => (
                <div key={k} style={{height: 70, borderRadius: 18, background: 'rgba(255,255,255,0.1)', marginTop: 20}} />
              ))}
            </div>
          </Pop>
          {notes.map((n, k) => (
            <Pop key={k} at={20 + k * 18} from="right" style={{position: 'absolute', left: -170, top: 280 + k * 120}}>
              <Solid style={{padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 22}}>
                <I.gift size={40} color="#FF2E79" />
                <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 32}}>{n}</span>
              </Solid>
            </Pop>
          ))}
        </div>
      </Area>
    </AbsoluteFill>
  );
};

const Loop: React.FC<ShotProps> = ({phr, w}) => {
  const f = useCurrentFrame();
  const items = [
    {t: 'Қосымша', i: 'phone'},
    {t: 'Ұпайлар', i: 'coin'},
    {t: 'Ұсыныстар', i: 'gift'},
    {t: 'Қайта оралу', i: 'repeat'},
  ];
  const ats = [0, phr[1] ?? 18, phr[2] ?? 36, w.find((x) => x.w.startsWith('қайта'))?.from ?? 60];
  const R = 345;
  return (
    <AbsoluteFill>
      {ats.map((a, k) => (
        <Sfx key={k} at={a} name="pop" volume={0.45} />
      ))}
      <svg width={1920} height={1000} style={{position: 'absolute'}}>
        <g transform={`translate(960,470) rotate(${f * 1.5})`}>
          <circle r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={22} />
          <circle r={R} fill="none" stroke="#fff" strokeWidth={22} strokeDasharray="360 111" strokeLinecap="round" />
        </g>
      </svg>
      <div style={{position: 'absolute', left: 960 - 160, top: 470 - 70, width: 320, textAlign: 'center'}}>
        <Big text="ҚАЙТА-ҚАЙТА!" size={46} at={ats[3]} />
      </div>
      {items.map((it, k) => {
        const a = (-90 + k * 90) * (Math.PI / 180);
        const Ic = I[it.i];
        return (
          <Pop key={k} at={ats[k]} style={{position: 'absolute', left: 960 + Math.cos(a) * R - 150, top: 470 + Math.sin(a) * R - 90}}>
            <Solid style={{width: 300, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
              <Ic size={72} color="#00A6A6" />
              <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 36}}>{it.t}</span>
            </Solid>
          </Pop>
        );
      })}
    </AbsoluteFill>
  );
};

const Orbit: React.FC<ShotProps> = ({w}) => {
  const f = useCurrentFrame();
  const os = usePop(0, 8);
  const names = [
    {n: 'Kimpton', y: '2015', k: 'Kimpton'},
    {n: 'Regent', y: '2018', k: 'Regent'},
    {n: 'Six Senses', y: '2019', k: 'Six'},
  ];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 960 - 160,
          top: 470 - 160,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${os * (1 + Math.sin(f / 6) * 0.03)})`,
          boxShadow: `0 0 ${80 + 30 * Math.sin(f / 6)}px rgba(255,255,255,0.7)`,
        }}
      >
        <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 120, color: INK}}>IHG</span>
      </div>
      {names.map((n, k) => {
        const at = w.find((x) => x.w === n.k)?.from ?? 10 + k * 15;
        const p = ease(f, at, at + 14);
        const ang = (-150 + k * 120 + f * 0.8) * (Math.PI / 180);
        const r = 330 + (1 - p) * 900;
        return (
          <React.Fragment key={k}>
            <Sfx at={at} name="whoosh" volume={0.3} />
            <Sfx at={at + 12} name="pop" volume={0.5} />
            <div style={{position: 'absolute', left: 960 + Math.cos(ang) * r * 1.35 - 160, top: 470 + Math.sin(ang) * r * 0.85 - 80, opacity: p}}>
              <Solid style={{width: 320, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 50}}>{n.n}</span>
                <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 30, color: '#00875A'}}>{n.y}</span>
              </Solid>
            </div>
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: 110, top: 90}}>
        <Kicker text="САТЫП АЛУ" at={2} bg={Y} />
      </div>
    </AbsoluteFill>
  );
};

const Eco: React.FC<ShotProps> = ({w}) => {
  const f = useCurrentFrame();
  const eAt = w.find((x) => x.w.startsWith('энергия'))?.from ?? 40;
  const sAt = w.find((x) => x.w.startsWith('суды'))?.from ?? 55;
  const Bar = ({label, icon, at, col}: any) => {
    const v = interpolate(f, [at, at + 24], [1, 0.45], {...clamp, easing: Easing.out(Easing.cubic)});
    return (
      <Pop at={at - 6} from="right">
        <Solid style={{width: 760, padding: '26px 34px', marginBottom: 26}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            {icon}
            <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 48, flex: 1}}>{label}</span>
            <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 56, color: '#00A86B'}}>↓</span>
          </div>
          <div style={{height: 26, borderRadius: 13, background: '#e6ece9', marginTop: 16}}>
            <div style={{height: 26, borderRadius: 13, width: `${v * 100}%`, background: col}} />
          </div>
        </Solid>
      </Pop>
    );
  };
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.35} />
      <Sfx at={eAt} name="swipe" volume={0.45} />
      <Sfx at={sAt} name="swipe" volume={0.45} />
      <Area style={{justifyContent: 'space-between'}}>
        <div style={{width: 760}}>
          <Pop at={0}>
            <I.leaf size={200} color="#fff" sw={1.6} />
          </Pop>
          <Big text="Journey to Tomorrow" size={110} align="left" at={4} />
        </div>
        <div>
          <Bar label="Энергия" icon={<I.bolt size={64} color="#FF9500" />} at={eAt} col="linear-gradient(90deg,#FFB800,#FF6A00)" />
          <Bar label="Су" icon={<I.drop size={64} color="#2B8CFF" />} at={sAt} col="linear-gradient(90deg,#00C2FF,#2B4CFF)" />
        </div>
      </Area>
    </AbsoluteFill>
  );
};

const Almaty: React.FC<ShotProps> = () => {
  const f = useCurrentFrame();
  const draw = ease(f, 0, 24);
  const mountains = 'M0 420 L150 250 L240 320 L380 120 L480 240 L600 60 L740 270 L850 180 L980 330 L1100 230 L1240 420';
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={14} name="bubble" volume={0.5} />
      <svg width={1240} height={440} style={{position: 'absolute', left: 340, top: 300}}>
        <path d={`${mountains} L1240 440 L0 440 Z`} fill="rgba(255,255,255,0.28)" opacity={draw} />
        <path d={mountains} stroke="#fff" strokeWidth={10} fill="none" strokeLinejoin="round" strokeDasharray={2600} strokeDashoffset={2600 * (1 - draw)} />
        <path d="M352 152 L380 120 L410 160 M570 96 L600 60 L632 104" stroke="#fff" strokeWidth={10} fill="none" strokeLinejoin="round" opacity={ease(f, 18, 26)} />
      </svg>
      <div style={{position: 'absolute', left: 960 - 90, top: 150 - Math.abs(Math.sin(f / 8)) * 30}}>
        <Pop at={12} from="up">
          <I.pin size={180} color={Y} sw={2.2} />
        </Pop>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center'}}>
        <Pop at={16} from="up">
          <Solid style={{padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 20}}>
            <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 54}}>InterContinental Almaty</span>
          </Solid>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: 110, top: 90}}>
        <Kicker text="АЛМАТЫ, ҚАЗАҚСТАН" at={4} bg={Y} />
      </div>
    </AbsoluteFill>
  );
};

const Checks: React.FC<ShotProps> = ({shot, phr}) => (
  <AbsoluteFill>
    {shot.items.map((_: string, k: number) => (
      <Sfx key={k} at={phr[k] ?? k * 25} name="hit" volume={0.4} />
    ))}
    <Area style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 34, paddingLeft: 200}}>
      {shot.items.map((it: string, k: number) => (
        <Pop key={k} at={phr[k] ?? k * 25} from="left">
          <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <div style={{width: 150, height: 150, borderRadius: 40, background: Y, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 0 rgba(0,0,0,0.15)'}}>
              <I.check size={110} color={INK} sw={3.2} />
            </div>
            <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 104, color: '#fff', textShadow: '0 10px 0 rgba(0,0,0,0.15)'}}>{it}</span>
          </div>
        </Pop>
      ))}
    </Area>
  </AbsoluteFill>
);

/** Kazakh-style ornament ("қошқар мүйіз" inspired curls) */
const Curl: React.FC<{x: number; y: number; s?: number; rot?: number; col?: string; p: number}> = ({x, y, s = 1, rot = 0, col = '#FFC72C', p}) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path
      d="M0 0 C0 -60 70 -60 70 -10 C70 20 35 20 35 0 M0 0 C0 -60 -70 -60 -70 -10 C-70 20 -35 20 -35 0 M0 0 L0 60"
      stroke={col}
      strokeWidth={12}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={420}
      strokeDashoffset={420 * (1 - p)}
    />
  </g>
);

const Ornament: React.FC<ShotProps> = ({shot}) => {
  const f = useCurrentFrame();
  const p = ease(f, 0, 26);
  return (
    <AbsoluteFill>
      <Rays color="#FFC72C" opacity={0.25} />
      <Sfx at={0} name="boom" volume={0.45} />
      <Sfx at={18} name="ding" volume={0.4} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {[220, 520, 820, 1100, 1400, 1700].map((x, k) => (
          <Curl key={`t${k}`} x={x} y={150} p={p} s={0.9} />
        ))}
        {[220, 520, 820, 1100, 1400, 1700].map((x, k) => (
          <Curl key={`b${k}`} x={x} y={800} p={p} s={0.9} rot={180} />
        ))}
      </svg>
      <Area style={{justifyContent: 'center', flexDirection: 'column'}}>
        <Pop at={6}>
          <I.heart size={150} color="#FF2E79" sw={2.6} />
        </Pop>
        <Big text={shot.big} size={130} at={8} />
      </Area>
    </AbsoluteFill>
  );
};

const Flight: React.FC<ShotProps> = ({shot}) => (
  <AbsoluteFill>
    <Sfx at={0} name="whoosh" volume={0.45} />
    <Area style={{justifyContent: 'space-between'}}>
      <div style={{width: 760}}>
        <Kicker text="1940-ЖЫЛДАР" at={2} bg={Y} />
        <div style={{height: 24}} />
        <Big text={shot.big} size={150} align="left" at={4} />
      </div>
      <Globe size={640} at={0} />
    </Area>
  </AbsoluteFill>
);

const Trio: React.FC<ShotProps> = ({shot, phr}) => (
  <AbsoluteFill>
    {shot.items.map((_: string, k: number) => (
      <Sfx key={k} at={phr[k] ?? k * 20} name="pop" volume={0.5} />
    ))}
    <Area style={{justifyContent: 'center', gap: 50}}>
      {shot.items.map((it: string, k: number) => {
        const Ic = I[shot.icons[k]] ?? I.star;
        return (
          <Pop key={k} at={phr[k] ?? k * 20} from="up">
            <Bounce amp={10} speed={10 + k * 2}>
              <Solid style={{width: 480, height: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30}}>
                <div style={{width: 210, height: 210, borderRadius: '50%', background: ['#FFE5EE', '#E5F0FF', '#FFF3D6'][k], display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Ic size={130} color={['#FF2E79', '#2B4CFF', '#FF8A00'][k]} />
                </div>
                <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 50, textAlign: 'center'}}>{it}</span>
              </Solid>
            </Bounce>
          </Pop>
        );
      })}
    </Area>
  </AbsoluteFill>
);

const Pillars: React.FC<ShotProps> = ({w}) => {
  const items = [
    {t: 'Жеңіл активтер', i: 'key'},
    {t: 'Бренд портфелі', i: 'layers'},
    {t: 'Жергілікті бейімделу', i: 'globe'},
    {t: 'Адалдық', i: 'heart'},
    {t: 'Серіктестік', i: 'handshake'},
  ];
  const idx = [0, 2, 4, 6, 8];
  const cols = ['#6A1BFF', '#FF4E00', '#E8124F', '#00A6A6', '#00875A'];
  return (
    <AbsoluteFill>
      <Area style={{justifyContent: 'center', gap: 28}}>
        {items.map((it, k) => {
          const at = w[idx[k]]?.from ?? k * 20;
          const Ic = I[it.i];
          return (
            <React.Fragment key={k}>
              <Sfx at={at} name="hit" volume={0.4} />
              <Pop at={at} from="up">
                <Solid style={{width: 310, height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, borderBottom: `16px solid ${cols[k]}`}}>
                  <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 60, color: cols[k]}}>{k + 1}</div>
                  <Ic size={110} color={cols[k]} />
                  <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, textAlign: 'center', padding: '0 14px'}}>{it.t}</span>
                </Solid>
              </Pop>
            </React.Fragment>
          );
        })}
      </Area>
    </AbsoluteFill>
  );
};

const Cta: React.FC<ShotProps> = ({phr, dur}) => {
  const f = useCurrentFrame();
  const t2 = phr[1] ?? 40;
  const typing = f < 30;
  const cs = usePop(t2, 7);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="bubble" volume={0.5} />
      <Sfx at={t2} name="boom" volume={0.5} />
      <Sfx at={t2 + 2} name="confetti" volume={0.55} />
      <Confetti at={t2 + 2} n={140} y={380} />
      <Area style={{justifyContent: 'center', flexDirection: 'column', gap: 40}}>
        <Pop at={0} from="up">
          <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
            <div style={{position: 'relative'}}>
              <I.chat size={200} color="#fff" sw={1.8} />
              <div style={{position: 'absolute', left: 52, top: 62, display: 'flex', gap: 14}}>
                {[0, 1, 2].map((k) => (
                  <div key={k} style={{width: 20, height: 20, borderRadius: 10, background: Y, transform: `translateY(${typing ? Math.sin(f / 3 + k) * 8 : 0}px)`}} />
                ))}
              </div>
            </div>
            <Big text="ПІКІРДЕ ЖАЗ!" size={170} />
          </div>
        </Pop>
        {f >= t2 && (
          <div style={{transform: `scale(${cs})`}}>
            <div style={{background: '#fff', color: INK, borderRadius: 30, padding: '18px 50px', fontFamily: DISPLAY, fontWeight: 800, fontSize: 90, boxShadow: '0 14px 0 rgba(0,0,0,0.15)'}}>
              Көргенің үшін <span style={{color: '#FF2E79'}}>рахмет!</span>
            </div>
          </div>
        )}
      </Area>
      <AbsoluteFill style={{background: '#000', opacity: interpolate(f, [dur - 12, dur], [0, 1], clamp)}} />
    </AbsoluteFill>
  );
};
