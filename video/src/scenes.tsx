import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {
  C,
  FONT,
  DISPLAY,
  clamp,
  ease,
  useSpr,
  Reveal,
  Words,
  Chip,
  Card,
  Counter,
  Sfx,
  DrawLine,
  Globe,
  Header,
  Icon,
} from './ui';

export type SP = {c: number[]; dur: number};

const Label: React.FC<{children: React.ReactNode; size?: number; color?: string; weight?: number; style?: React.CSSProperties}> = ({
  children,
  size = 28,
  color = C.white,
  weight = 500,
  style,
}) => <div style={{fontFamily: FONT, fontSize: size, color, fontWeight: weight, lineHeight: 1.3, ...style}}>{children}</div>;

/* =============== 1. INTRO =============== */
export const S1Intro: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const line = ease(frame, 40, 90);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="riser" volume={0.45} />
      <Sfx at={44} name="impact" volume={0.55} />
      <Sfx at={c[1]} name="whoosh" volume={0.35} />
      <Sfx at={c[1] + 40} name="ding" volume={0.3} />
      <div style={{position: 'absolute', right: -80, top: 150}}>
        <Globe size={820} at={10} />
      </div>
      <div style={{position: 'absolute', left: 120, top: 210, width: 1050}}>
        <Chip at={30}>Зерттеу жобасы · 2026</Chip>
        <div style={{height: 30}} />
        <Words
          text="Қонақ үй брендтерінің халықаралық даму стратегияларын зерттеу және дамыту"
          at={44}
          size={76}
          stagger={4}
          weight={800}
          highlight={['халықаралық', 'стратегияларын']}
        />
        <div style={{height: 36, width: 520 * line, borderBottom: `3px solid ${C.gold}`}} />
        <div style={{height: 30}} />
        <Reveal at={c[1]} y={30}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 64,
                color: C.bg0,
                background: C.gold,
                padding: '6px 26px',
                borderRadius: 14,
                letterSpacing: 2,
              }}
            >
              IHG
            </div>
            <div>
              <Label size={34} weight={700}>
                InterContinental Hotels Group
              </Label>
              <Label size={26} color={C.muted}>
                мысалында: жаһандық өсудің құпиясы
              </Label>
            </div>
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

/* =============== 2. HISTORY =============== */
export const S2History: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const nodes = [
    {year: '1946', at: c[1], icon: Icon.plane, title: 'InterContinental', sub: 'Pan American авиакомпаниясы саяхатшыларға арнап ашты', color: C.gold},
    {year: '1952', at: c[2], icon: Icon.hotel, title: 'Holiday Inn', sub: 'Алғашқы қонақ үй — Мемфис, АҚШ', color: C.teal},
    {year: '2003', at: c[3], icon: Icon.merge, title: 'IHG құрылды', sub: 'Брендтер бір компанияға бірікті', color: C.blue},
  ];
  const X = [330, 960, 1590];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      {nodes.map((n, i) => (
        <Sfx key={i} at={n.at} name="pop" volume={0.5} />
      ))}
      <Sfx at={c[4]} name="ding" volume={0.3} />
      <Header chip="Тарих" title="Бір ғасырға жуық тарих" highlight={['тарих']} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <DrawLine d="M150 520 L1770 520" at={c[0] + 10} dur={c[3] - c[0]} color="rgba(255,255,255,0.25)" width={3} len={1700} />
        <DrawLine d={`M150 520 L${X[0]} 520`} at={c[1] - 10} dur={20} color={C.gold} width={5} len={400} />
        <DrawLine d={`M${X[0]} 520 L${X[1]} 520`} at={c[2] - 20} dur={25} color={C.teal} width={5} len={700} />
        <DrawLine d={`M${X[1]} 520 L${X[2]} 520`} at={c[3] - 20} dur={25} color={C.blue} width={5} len={700} />
      </svg>
      {nodes.map((n, i) => {
        const s = Math.max(0, Math.min(1, (frame - n.at) / 12));
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: X[i] - 22,
                top: 498,
                width: 44,
                height: 44,
                borderRadius: 22,
                background: C.bg0,
                border: `5px solid ${n.color}`,
                transform: `scale(${s})`,
                boxShadow: `0 0 ${30 * s}px ${n.color}`,
              }}
            />
            <Reveal at={n.at} y={-30} style={{position: 'absolute', left: X[i] - 140, top: 370, width: 280, textAlign: 'center'}}>
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 84, color: n.color, letterSpacing: -2}}>{n.year}</div>
            </Reveal>
            <Reveal at={n.at + 8} y={40} style={{position: 'absolute', left: X[i] - 230, top: 590, width: 460}}>
              <Card style={{textAlign: 'center', padding: '30px 30px'}}>
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: 14}}>
                  <n.icon size={58} color={n.color} />
                </div>
                <Label size={36} weight={700}>
                  {n.title}
                </Label>
                <Label size={24} color={C.muted} style={{marginTop: 8}}>
                  {n.sub}
                </Label>
              </Card>
            </Reveal>
          </React.Fragment>
        );
      })}
      <Reveal at={c[4]} y={30} style={{position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 30px',
            borderRadius: 50,
            border: `1.5px solid ${C.gold}`,
            background: C.goldSoft,
          }}
        >
          <Icon.pin size={34} />
          <Label size={28} weight={600}>
            Штаб-пәтер: Ұлыбритания
          </Label>
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};

/* =============== 3. SCALE =============== */
export const S3Scale: React.FC<SP> = ({c}) => {
  const stats = [
    {at: c[0] + 40, to: 100, suffix: '+', label: 'ел мен аумақ', icon: Icon.globe, color: C.teal},
    {at: c[1] + 10, to: 6600, suffix: '+', label: 'қонақ үй', icon: Icon.hotel, color: C.gold},
    {at: c[1] + 70, to: 1, prefix: '≈', suffix: ' млн', label: 'нөмір', icon: Icon.bed, color: C.blue, dur: 20},
    {at: c[2] + 10, to: 2000, suffix: '+', label: 'қонақ үй жобада', icon: Icon.crane, color: C.rose},
  ];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh2" volume={0.4} />
      {stats.map((s, i) => (
        <React.Fragment key={i}>
          <Sfx at={s.at} name="swipe" volume={0.35} />
          <Sfx at={s.at + 4} name="data" volume={0.25} />
        </React.Fragment>
      ))}
      <Header chip="Ауқым" title="Жаһандық алып" highlight={['алып']} />
      <div style={{position: 'absolute', left: 120, top: 310}}>
        <Globe size={600} at={0} />
      </div>
      <div style={{position: 'absolute', left: 820, top: 300, width: 1000, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34}}>
        {stats.map((s, i) => (
          <Reveal key={i} at={s.at} y={50}>
            <Card accent={s.color} style={{height: 270, padding: '34px 40px'}}>
              <s.icon size={52} color={s.color} />
              <div style={{height: 16}} />
              <Counter to={s.to} at={s.at} prefix={s.prefix} suffix={s.suffix} size={92} dur={s.dur ?? 50} />
              <Label size={30} color={C.muted} style={{marginTop: 8}}>
                {s.label}
              </Label>
            </Card>
          </Reveal>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* =============== 4. ASSET-LIGHT =============== */
export const S4AssetLight: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const strike = ease(frame, c[1] + 50, c[1] + 70);
  const owner = [
    {t: 'Инвестиция', i: Icon.coin},
    {t: 'Ғимарат', i: Icon.hotel},
    {t: 'Комиссия (fee)', i: Icon.handshake},
  ];
  const ihg = [
    {t: 'Бренд', i: Icon.star},
    {t: 'Стандарттар', i: Icon.shield},
    {t: 'Брондау жүйесі', i: Icon.calendar},
    {t: 'Басқару тәжірибесі', i: Icon.key},
  ];
  const bars = [0.25, 0.42, 0.6, 0.8, 1];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={c[1] + 52} name="swipe" volume={0.5} />
      <Sfx at={c[2]} name="pop" volume={0.5} />
      <Sfx at={c[2] + 20} name="pop" volume={0.5} />
      {[0, 1, 2, 3].map((k) => (
        <Sfx key={k} at={c[3] + 60 + k * 18} name="tick" volume={0.5} />
      ))}
      <Sfx at={c[4]} name="impact" volume={0.35} />
      <Header chip="Стратегия 1" title="Жеңіл активтер моделі (asset-light)" highlight={['Жеңіл', 'активтер']} />
      {/* Owner box */}
      <Reveal at={c[0] + 30} x={-60} y={0} style={{position: 'absolute', left: 120, top: 330, width: 470}}>
        <Card accent={C.teal} style={{height: 470}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <Icon.hotel size={60} color={C.teal} />
            <Label size={40} weight={700}>
              Меншік иесі
            </Label>
          </div>
          <Label size={24} color={C.muted} style={{margin: '10px 0 22px'}}>
            Инвестор, девелопер
          </Label>
          {owner.map((o, k) => (
            <Reveal key={k} at={c[3] + k * 14} x={-30} y={0}>
              <div style={{display: 'flex', alignItems: 'center', gap: 16, margin: '14px 0'}}>
                <o.i size={36} color={C.teal} />
                <Label size={30}>{o.t}</Label>
              </div>
            </Reveal>
          ))}
        </Card>
      </Reveal>
      {/* IHG box */}
      <Reveal at={c[0] + 40} x={60} y={0} style={{position: 'absolute', right: 120, top: 330, width: 470}}>
        <Card accent={C.gold} style={{height: 470}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, background: C.gold, color: C.bg0, padding: '2px 14px', borderRadius: 10}}>IHG</div>
            <Label size={40} weight={700}>
              Бренд иесі
            </Label>
          </div>
          <Label size={24} color={C.muted} style={{margin: '10px 0 22px'}}>
            Оператор, франчайзер
          </Label>
          {ihg.map((o, k) => (
            <Reveal key={k} at={c[3] + 60 + k * 18} x={30} y={0}>
              <div style={{display: 'flex', alignItems: 'center', gap: 16, margin: '12px 0'}}>
                <o.i size={36} color={C.gold} />
                <Label size={30}>{o.t}</Label>
              </div>
            </Reveal>
          ))}
        </Card>
      </Reveal>
      {/* Middle: no-build, contracts, arrows */}
      <div style={{position: 'absolute', left: 640, width: 640, top: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
        <Reveal at={c[1]} y={20}>
          <div style={{position: 'relative', padding: '14px 26px', borderRadius: 14, border: `1.5px dashed ${C.rose}`}}>
            <Label size={26} color={C.rose} weight={600}>
              Ғимарат салу / сатып алу
            </Label>
            <div style={{position: 'absolute', left: 14, right: 14, top: '50%', height: 4, background: C.rose, transform: `scaleX(${strike})`, transformOrigin: 'left'}} />
          </div>
        </Reveal>
        <Reveal at={c[2]} scale>
          <div style={{padding: '16px 34px', borderRadius: 50, background: C.goldSoft, border: `1.5px solid ${C.gold}`}}>
            <Label size={30} weight={700} color={C.gold}>
              Франчайзинг
            </Label>
          </div>
        </Reveal>
        <Reveal at={c[2] + 20} scale>
          <div style={{padding: '16px 34px', borderRadius: 50, background: 'rgba(60,203,181,0.15)', border: `1.5px solid ${C.teal}`}}>
            <Label size={30} weight={700} color={C.teal}>
              Басқару келісімшарты
            </Label>
          </div>
        </Reveal>
        <svg width={640} height={150}>
          <defs>
            <marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={C.white} />
            </marker>
          </defs>
          {frame > c[3] && <DrawLine d="M20 40 L600 40" at={c[3]} dur={25} color={C.teal} width={4} len={600} />}
          {frame > c[3] + 50 && <DrawLine d="M620 110 L40 110" at={c[3] + 50} dur={25} color={C.gold} width={4} len={600} />}
          <circle cx={20 + 580 * ((frame % 50) / 50)} cy={40} r={7} fill={C.teal} opacity={frame > c[3] + 25 ? 1 : 0} />
          <circle cx={620 - 580 * ((frame % 50) / 50)} cy={110} r={7} fill={C.gold} opacity={frame > c[3] + 75 ? 1 : 0} />
        </svg>
      </div>
      {/* Result */}
      <Reveal at={c[4]} y={40} style={{position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center'}}>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 30, padding: '20px 40px', borderRadius: 24, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.stroke}`}}>
          <Label size={34} weight={700}>
            Аз капитал
          </Label>
          <Label size={34} color={C.gold} weight={800}>
            →
          </Label>
          <Label size={34} weight={700} color={C.gold}>
            Жылдам кеңею
          </Label>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 8, height: 60}}>
            {bars.map((b, k) => (
              <div
                key={k}
                style={{width: 16, borderRadius: 4, background: C.gold, height: 60 * b * ease(frame, c[4] + 10 + k * 5, c[4] + 30 + k * 5)}}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};

/* =============== 5. PORTFOLIO =============== */
export const S5Portfolio: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const tiers = [
    {name: 'Люкс & лайфстайл', color: C.gold, at: c[2], brands: ['Six Senses', 'Regent', 'InterContinental', 'Kimpton'], price: '$$$$'},
    {name: 'Премиум', color: C.teal, at: c[3], brands: ['Crowne Plaza', 'Hotel Indigo', 'voco'], price: '$$$'},
    {name: 'Негізгі (essentials)', color: C.blue, at: c[4], brands: ['Holiday Inn', 'Holiday Inn Express'], price: '$$'},
  ];
  const glow = ease(frame, c[5], c[5] + 40);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh2" volume={0.4} />
      <Sfx at={c[1]} name="data" volume={0.3} />
      {tiers.map((t, i) => (
        <React.Fragment key={i}>
          <Sfx at={t.at} name="swipe" volume={0.4} />
          {t.brands.map((_, k) => (
            <Sfx key={k} at={t.at + 12 + k * 10} name="pop" volume={0.35} />
          ))}
        </React.Fragment>
      ))}
      <Sfx at={c[5]} name="shimmer" volume={0.3} />
      <Header chip="Стратегия 2" title="Көпбрендті портфель" highlight={['Көпбрендті']} />
      <Reveal at={c[1]} scale style={{position: 'absolute', right: 120, top: 92}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <Icon.layers size={70} />
          <div>
            <Counter to={20} at={c[1]} prefix="≈" size={96} color={C.gold} dur={40} />
            <Label size={26} color={C.muted}>
              бренд бір портфельде
            </Label>
          </div>
        </div>
      </Reveal>
      <div style={{position: 'absolute', left: 120, right: 120, top: 330, display: 'flex', gap: 36}}>
        {tiers.map((t, i) => (
          <Reveal key={i} at={c[1] + 30 + i * 8} y={60} style={{flex: 1}}>
            <Card
              style={{
                height: 520,
                border: `1px solid ${frame > t.at ? t.color : C.stroke}`,
                boxShadow: `0 0 ${glow * 40}px ${t.color}44, 0 30px 60px rgba(0,0,0,0.35)`,
              }}
            >
              <div style={{height: 6, background: t.color, borderRadius: 3, width: `${ease(frame, t.at, t.at + 25) * 100}%`}} />
              <Label size={34} weight={800} color={t.color} style={{margin: '20px 0 6px'}}>
                {t.name}
              </Label>
              <Label size={26} color={C.muted} style={{marginBottom: 20}}>
                {t.price}
              </Label>
              {t.brands.map((b, k) => (
                <Reveal key={k} at={t.at + 12 + k * 10} x={-30} y={0}>
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '14px 22px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.06)',
                      borderLeft: `4px solid ${t.color}`,
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 32,
                      color: C.white,
                    }}
                  >
                    {b}
                  </div>
                </Reveal>
              ))}
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal at={c[5]} y={30} style={{position: 'absolute', left: 0, right: 0, top: 890, display: 'flex', justifyContent: 'center'}}>
        <Label size={34} weight={700}>
          Әр саяхатшыға — <span style={{color: C.gold}}>өз қалауы мен бюджетіне сай бренд</span>
        </Label>
      </Reveal>
    </AbsoluteFill>
  );
};

/* =============== 6. LOCALIZATION =============== */
export const S6Local: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const chart = ease(frame, c[3] + 10, c[3] + 90);
  const pts = [
    [0, 210],
    [80, 190],
    [160, 195],
    [240, 150],
    [320, 135],
    [400, 90],
    [480, 70],
    [560, 25],
  ];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const pattern = (k: number) => (
    <path
      key={k}
      d={`M${k * 40} 20 q10 -18 20 0 t20 0`}
      stroke={C.gold}
      strokeWidth={2}
      fill="none"
      opacity={0.6}
    />
  );
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={c[1]} name="pop" volume={0.45} />
      <Sfx at={c[1] + 25} name="pop" volume={0.45} />
      <Sfx at={c[1] + 50} name="ding" volume={0.3} />
      <Sfx at={c[2]} name="swipe" volume={0.45} />
      <Sfx at={c[3]} name="riser" volume={0.25} />
      <Header chip="Стратегия 3" title="Жергілікті нарыққа бейімделу" highlight={['Жергілікті']} />
      {/* Equation */}
      <div style={{position: 'absolute', left: 120, right: 120, top: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34}}>
        <Reveal at={c[1]} scale>
          <Card style={{padding: '22px 34px', display: 'flex', alignItems: 'center', gap: 16}}>
            <Icon.globe size={46} color={C.teal} />
            <Label size={32} weight={700}>
              Жаһандық бренд
            </Label>
          </Card>
        </Reveal>
        <Reveal at={c[1] + 15} scale>
          <Label size={56} weight={800} color={C.gold}>
            +
          </Label>
        </Reveal>
        <Reveal at={c[1] + 25} scale>
          <Card style={{padding: '22px 34px', display: 'flex', alignItems: 'center', gap: 16}}>
            <Icon.heart size={46} color={C.rose} />
            <Label size={32} weight={700}>
              Жергілікті мәдениет
            </Label>
          </Card>
        </Reveal>
        <Reveal at={c[1] + 40} scale>
          <Label size={56} weight={800} color={C.gold}>
            =
          </Label>
        </Reveal>
        <Reveal at={c[1] + 50} scale>
          <div style={{padding: '22px 34px', borderRadius: 22, background: C.gold}}>
            <Label size={34} weight={800} color={C.bg0}>
              Глокализация
            </Label>
          </div>
        </Reveal>
      </div>
      {/* HUALUXE card */}
      <Reveal at={c[2]} x={-60} y={0} style={{position: 'absolute', left: 120, top: 500, width: 780}}>
        <Card accent={C.rose} style={{height: 400}}>
          <svg width={720} height={40}>{new Array(18).fill(0).map((_, k) => pattern(k))}</svg>
          <Label size={22} color={C.muted} weight={600} style={{letterSpacing: 4, marginTop: 10}}>
            ҚЫТАЙ НАРЫҒЫНА АРНАЛҒАН БРЕНД
          </Label>
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 80, color: C.white, letterSpacing: 4, margin: '6px 0'}}>HUALUXE</div>
          <Label size={30} color={C.white}>
            Hotels &amp; Resorts
          </Label>
          <Label size={27} color={C.muted} style={{marginTop: 22}}>
            Қытай қонақжайлылық дәстүріне негізделген: шай мәдениеті, жергілікті сәулет және этикет
          </Label>
        </Card>
      </Reveal>
      {/* Growth chart */}
      <Reveal at={c[3]} x={60} y={0} style={{position: 'absolute', right: 120, top: 500, width: 780}}>
        <Card accent={C.gold} style={{height: 400}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <Icon.chart size={44} />
            <Label size={32} weight={700}>
              Үлкен Қытай аймағы
            </Label>
          </div>
          <Label size={24} color={C.muted} style={{marginTop: 6}}>
            Ең қарқынды өсіп келе жатқан нарықтардың бірі
          </Label>
          <svg width={700} height={240} style={{marginTop: 16}}>
            <defs>
              <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
              </linearGradient>
              <clipPath id="cclip">
                <rect x={0} y={0} width={20 + 600 * chart} height={240} />
              </clipPath>
            </defs>
            <g transform="translate(40,0)" clipPath="url(#cclip)">
              <path d={`${d} L560,230 L0,230 Z`} fill="url(#cg)" />
              <path d={d} stroke={C.gold} strokeWidth={5} fill="none" strokeLinejoin="round" />
            </g>
            <line x1={40} x2={640} y1={230} y2={230} stroke={C.stroke} strokeWidth={2} />
            {chart > 0.98 && <circle cx={600} cy={25} r={10 + 4 * Math.sin(frame / 5)} fill={C.gold} />}
          </svg>
        </Card>
      </Reveal>
    </AbsoluteFill>
  );
};

/* =============== 7. LOYALTY & DIGITAL =============== */
export const S7Loyalty: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const phoneIn = useSpr(c[0] + 20);
  const pts = Math.round(interpolate(frame, [c[1], c[2] + 120], [12500, 48750], clamp));
  const feats = [
    {t: 'Мобильді қосымша', i: Icon.phone, at: c[2]},
    {t: 'Онлайн брондау', i: Icon.calendar, at: c[2] + 30},
    {t: 'Жеке ұсыныстар', i: Icon.gift, at: c[2] + 60},
  ];
  const loop = ['Қонақтар', 'Адалдық', 'Сұраныс', 'Иелер табысы'];
  const rot = frame * 0.6;
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh2" volume={0.4} />
      <Sfx at={c[0] + 20} name="swipe" volume={0.45} />
      <Sfx at={c[1]} name="impact" volume={0.3} />
      <Sfx at={c[1] + 4} name="data" volume={0.3} />
      {feats.map((f, i) => (
        <Sfx key={i} at={f.at} name="pop" volume={0.45} />
      ))}
      <Sfx at={c[2] + 110} name="shimmer" volume={0.25} />
      <Header chip="Стратегия 4" title="Адалдық және цифрлық технологиялар" highlight={['Адалдық', 'цифрлық']} />
      {/* Phone */}
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 300,
          width: 360,
          height: 640,
          borderRadius: 52,
          border: '10px solid #1b2a40',
          background: 'linear-gradient(180deg,#0f2038,#081222)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          transform: `translateY(${(1 - phoneIn) * 300}px) rotate(${(1 - phoneIn) * -10}deg)`,
          opacity: phoneIn,
          overflow: 'hidden',
          padding: 26,
        }}
      >
        <div style={{width: 110, height: 24, borderRadius: 12, background: '#1b2a40', margin: '-12px auto 22px'}} />
        <Label size={20} color={C.muted} weight={600} style={{letterSpacing: 3}}>
          IHG ONE REWARDS
        </Label>
        <div
          style={{
            marginTop: 16,
            borderRadius: 20,
            padding: 22,
            height: 150,
            background: `linear-gradient(135deg, ${C.gold}, #b07d2a)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 80,
              left: -100 + ((frame * 6) % 600),
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />
          <Label size={18} color={C.bg0} weight={700}>
            ҰПАЙЛАР
          </Label>
          <div style={{fontFamily: DISPLAY, fontSize: 52, fontWeight: 800, color: C.bg0, fontVariantNumeric: 'tabular-nums'}}>
            {pts.toLocaleString('en-US').replace(/,/g, ' ')}
          </div>
          <Label size={18} color={C.bg0} weight={600}>
            Gold Elite
          </Label>
        </div>
        {[0, 1, 2].map((k) => (
          <Reveal key={k} at={c[2] + k * 30} x={40} y={0}>
            <div style={{marginTop: 14, borderRadius: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14}}>
              {React.createElement(feats[k].i, {size: 32, color: C.teal})}
              <Label size={20}>{feats[k].t}</Label>
            </div>
          </Reveal>
        ))}
        <Reveal at={c[2] + 90} y={20}>
          <div style={{marginTop: 22, borderRadius: 30, padding: '16px', background: C.teal, textAlign: 'center'}}>
            <Label size={22} weight={800} color={C.bg0}>
              Брондау
            </Label>
          </div>
        </Reveal>
      </div>
      {/* Big stat */}
      <Reveal at={c[1]} x={60} y={0} style={{position: 'absolute', left: 640, top: 320}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
          <Counter to={145} at={c[1]} size={170} color={C.gold} suffix=" млн+" dur={50} />
        </div>
        <Label size={36} color={C.white} weight={600}>
          IHG One Rewards бағдарламасының мүшесі
        </Label>
      </Reveal>
      {/* Flywheel */}
      <Reveal at={c[2] + 100} scale style={{position: 'absolute', left: 660, top: 600}}>
        <div style={{position: 'relative', width: 1080, height: 300}}>
          <svg width={300} height={300} style={{position: 'absolute', left: 0, top: 0}}>
            <g transform={`translate(150,150) rotate(${rot})`}>
              <circle r={120} fill="none" stroke={C.stroke} strokeWidth={14} />
              <circle r={120} fill="none" stroke={C.gold} strokeWidth={14} strokeDasharray="130 58.5" strokeLinecap="round" />
            </g>
            <text x={150} y={160} textAnchor="middle" fill={C.white} fontFamily="Inter" fontWeight={800} fontSize={30}>
              Цикл
            </text>
          </svg>
          <div style={{position: 'absolute', left: 340, top: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
            {loop.map((l, k) => (
              <Reveal key={k} at={c[2] + 110 + k * 12} x={30} y={0}>
                <div style={{padding: '18px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.stroke}`}}>
                  <Label size={28} weight={700}>
                    <span style={{color: C.gold}}>{k + 1}.</span> {l}
                  </Label>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};

/* =============== 8. PARTNERSHIPS & SUSTAINABILITY =============== */
export const S8Partners: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const acq = [
    {n: 'Kimpton', y: '2015', a: -150, at: c[2]},
    {n: 'Regent', y: '2018', a: -30, at: c[2] + 25},
    {n: 'Six Senses', y: '2019', a: 90, at: c[2] + 50},
  ];
  const gauges = [
    {t: 'Көміртек (CO₂)', i: Icon.cloud, color: C.muted},
    {t: 'Су тұтыну', i: Icon.drop, color: C.blue},
    {t: 'Энергия', i: Icon.bolt, color: C.gold},
  ];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      {acq.map((a, i) => (
        <React.Fragment key={i}>
          <Sfx at={a.at} name="whoosh2" volume={0.25} />
          <Sfx at={a.at + 22} name="pop" volume={0.5} />
        </React.Fragment>
      ))}
      <Sfx at={c[3]} name="ding" volume={0.3} />
      {gauges.map((_, k) => (
        <Sfx key={k} at={c[3] + 60 + k * 30} name="swipe" volume={0.35} />
      ))}
      <Header chip="Стратегия 5" title="Серіктестік және тұрақты даму" highlight={['Серіктестік', 'тұрақты']} />
      {/* Acquisitions orbit */}
      <div style={{position: 'absolute', left: 120, top: 320, width: 760, height: 620}}>
        <Reveal at={c[1]} scale style={{position: 'absolute', left: 280, top: 210}}>
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              background: C.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 ${60 + 20 * Math.sin(frame / 8)}px ${C.gold}88`,
            }}
          >
            <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, color: C.bg0}}>IHG</span>
          </div>
        </Reveal>
        <svg width={760} height={620} style={{position: 'absolute', left: 0, top: 0}}>
          <circle cx={380} cy={310} r={215} fill="none" stroke={C.stroke} strokeWidth={2} strokeDasharray="6 10" opacity={ease(frame, c[1], c[1] + 20)} />
        </svg>
        {acq.map((a, i) => {
          const p = ease(frame, a.at, a.at + 25);
          const r = 215 + (1 - p) * 500;
          const ang = (a.a + frame * 0.15) * (Math.PI / 180);
          const x = 380 + Math.cos(ang) * r;
          const y = 310 + Math.sin(ang) * r;
          if (frame < a.at) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - 115,
                top: y - 55,
                width: 230,
                height: 110,
                borderRadius: 20,
                background: '#0f2340',
                border: `2px solid ${C.teal}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: p,
              }}
            >
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: C.white}}>{a.n}</div>
              <Label size={22} color={C.teal} weight={600}>
                {a.y}
              </Label>
            </div>
          );
        })}
        <Reveal at={c[1] + 10} y={20} style={{position: 'absolute', left: 0, right: 0, top: 590, textAlign: 'center'}}>
          <Label size={26} color={C.muted}>
            Сатып алу арқылы портфельді кеңейту
          </Label>
        </Reveal>
      </div>
      {/* Journey to Tomorrow */}
      <Reveal at={c[3]} x={60} y={0} style={{position: 'absolute', right: 120, top: 330, width: 820}}>
        <Card accent={C.teal} style={{height: 600}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <Icon.leaf size={60} color={C.teal} />
            <div>
              <Label size={22} color={C.muted} weight={600} style={{letterSpacing: 4}}>
                ТҰРАҚТЫ ДАМУ БАҒДАРЛАМАСЫ
              </Label>
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, color: C.white}}>Journey to Tomorrow</div>
            </div>
          </div>
          <div style={{height: 24}} />
          {gauges.map((g, k) => {
            const at = c[3] + 60 + k * 30;
            const v = interpolate(frame, [at, at + 50], [1, 0.55], {...clamp, easing: Easing.out(Easing.cubic)});
            return (
              <Reveal key={k} at={at} x={30} y={0}>
                <div style={{display: 'flex', alignItems: 'center', gap: 20, margin: '26px 0'}}>
                  <g.i size={46} color={g.color} />
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <Label size={30} weight={600}>
                        {g.t}
                      </Label>
                      <Label size={30} weight={800} color={C.teal}>
                        ↓
                      </Label>
                    </div>
                    <div style={{height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.08)', marginTop: 10}}>
                      <div style={{height: 14, borderRadius: 7, width: `${v * 100}%`, background: `linear-gradient(90deg, ${C.teal}, ${g.color})`}} />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
          <Label size={24} color={C.muted} style={{marginTop: 10}}>
            Мақсат: шығарындылар мен ресурс тұтынуын азайту
          </Label>
        </Card>
      </Reveal>
    </AbsoluteFill>
  );
};

/* =============== 9. KAZAKHSTAN & RECOMMENDATIONS =============== */
export const S9Kazakhstan: React.FC<SP> = ({c}) => {
  const frame = useCurrentFrame();
  const recs = [
    {t: 'Бірыңғай бренд стандарттарын қалыптастыру', i: Icon.shield},
    {t: 'Франчайзинг арқылы өңірлерге және шетелге шығу', i: Icon.globe},
    {t: 'Цифрлық брондау мен адалдық бағдарламасы', i: Icon.phone},
    {t: 'Қазақ қонақжайлылығы — брендтің басты құндылығы', i: Icon.heart},
  ];
  // Stylised Tian Shan skyline behind Almaty
  const mountains = 'M0 260 L90 170 L150 210 L240 90 L310 160 L380 60 L470 170 L540 120 L620 200 L700 140 L760 260';
  // Simple "қошқар мүйіз" inspired ornament
  const orn = (x: number) => `M${x} 30 c0 -20 24 -20 24 0 c0 12 -14 12 -14 4 M${x + 48} 30 c0 -20 -24 -20 -24 0 c0 12 14 12 14 4`;
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh2" volume={0.4} />
      <Sfx at={c[0] + 40} name="ding" volume={0.3} />
      <Sfx at={c[1]} name="swipe" volume={0.4} />
      {[2, 3, 4, 5].map((k) => (
        <Sfx key={k} at={c[k]} name="pop" volume={0.5} />
      ))}
      <Header chip="Қазақстан · Ұсыныстар" title="Отандық брендтер не үйрене алады?" highlight={['Отандық']} color={C.teal} />
      {/* Left: Almaty */}
      <Reveal at={c[0] + 10} x={-60} y={0} style={{position: 'absolute', left: 120, top: 330, width: 760}}>
        <Card style={{height: 600, padding: 0}}>
          <svg width={760} height={300} style={{position: 'absolute', top: 40}}>
            <defs>
              <linearGradient id="mg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={C.teal} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${mountains} L760 300 L0 300 Z`} fill="url(#mg)" opacity={ease(frame, c[0] + 30, c[0] + 70)} />
            <DrawLine d={mountains} at={c[0] + 10} dur={50} color={C.teal} width={3} len={1400} />
            {/* snow caps */}
            <path d="M225 108 L240 90 L258 112 M365 80 L380 60 L398 84" stroke={C.white} strokeWidth={3} fill="none" opacity={ease(frame, c[0] + 50, c[0] + 70)} />
          </svg>
          <div style={{position: 'absolute', left: 330, top: 110, transform: `translateY(${-Math.abs(Math.sin(frame / 12)) * 10}px)`}}>
            <Reveal at={c[0] + 40} y={-60}>
              <Icon.pin size={90} color={C.gold} sw={2} />
            </Reveal>
          </div>
          <div style={{position: 'absolute', left: 40, right: 40, bottom: 40}}>
            <Label size={24} color={C.muted} weight={600} style={{letterSpacing: 4}}>
              АЛМАТЫ, ҚАЗАҚСТАН
            </Label>
            <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 54, color: C.white}}>InterContinental Almaty</div>
            <svg width={680} height={50} style={{marginTop: 18}}>
              {new Array(12).fill(0).map((_, k) => (
                <path key={k} d={orn(k * 58)} stroke={C.gold} strokeWidth={2.4} fill="none" opacity={ease(frame, c[1] + k * 3, c[1] + 20 + k * 3)} />
              ))}
            </svg>
          </div>
        </Card>
      </Reveal>
      {/* Right: recommendations */}
      <div style={{position: 'absolute', left: 940, right: 120, top: 330, display: 'flex', flexDirection: 'column', gap: 22}}>
        {recs.map((r, k) => {
          const at = c[k + 2];
          const active = frame >= at && (k === 3 || frame < c[k + 3]);
          return (
            <Reveal key={k} at={at} x={60} y={0}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  padding: '24px 28px',
                  borderRadius: 20,
                  background: active ? 'rgba(227,184,97,0.14)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${active ? C.gold : C.stroke}`,
                  height: 128,
                }}
              >
                <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, color: C.gold, width: 60}}>{k + 1}</div>
                <r.i size={46} color={C.teal} />
                <Label size={30} weight={600}>
                  {r.t}
                </Label>
              </div>
            </Reveal>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* =============== 10. CONCLUSION =============== */
export const S10Outro: React.FC<SP> = ({c, dur}) => {
  const frame = useCurrentFrame();
  const pillars = [
    {t: 'Жеңіл активтер', i: Icon.key},
    {t: 'Бренд портфелі', i: Icon.layers},
    {t: 'Жергілікті бейімделу', i: Icon.heart},
    {t: 'Цифрлық адалдық', i: Icon.phone},
    {t: 'Тұрақты даму', i: Icon.leaf},
  ];
  const span = c[1] - c[0];
  const thanks = c[2];
  const collapse = ease(frame, thanks - 10, thanks + 20);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="whoosh" volume={0.4} />
      {pillars.map((_, k) => (
        <Sfx key={k} at={c[0] + 40 + (k * span) / 5.6} name="pop" volume={0.45} />
      ))}
      <Sfx at={c[1]} name="ding" volume={0.3} />
      <Sfx at={thanks - 12} name="riser" volume={0.3} />
      <Sfx at={thanks + 6} name="impact" volume={0.45} />
      <Sfx at={thanks + 10} name="shimmer" volume={0.35} />
      <div style={{opacity: 1 - collapse}}>
        <Header chip="Қорытынды" title="IHG табысының формуласы" highlight={['формуласы']} />
        <div style={{position: 'absolute', left: 120, right: 120, top: 360, display: 'flex', gap: 26}}>
          {pillars.map((p, k) => (
            <Reveal key={k} at={c[0] + 40 + (k * span) / 5.6} y={70} style={{flex: 1}}>
              <Card style={{height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22}}>
                <div style={{width: 96, height: 96, borderRadius: 48, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <p.i size={50} />
                </div>
                <Label size={30} weight={700}>
                  {p.t}
                </Label>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal at={c[1]} y={40} style={{position: 'absolute', left: 0, right: 0, top: 740, display: 'flex', justifyContent: 'center'}}>
          <div style={{padding: '22px 44px', borderRadius: 24, border: `1.5px solid ${C.gold}`, background: C.goldSoft}}>
            <Label size={36} weight={700}>
              Халықаралық нарыққа шығатын кез келген қонақ үй бренді үшін <span style={{color: C.gold}}>үлгі</span>
            </Label>
          </div>
        </Reveal>
      </div>
      {frame >= thanks - 5 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
          <div style={{transform: `scale(${0.8 + 0.2 * collapse})`, opacity: collapse, textAlign: 'center'}}>
            <Words text="Назарларыңызға рахмет!" at={thanks} size={120} weight={800} stagger={5} highlight={['рахмет!']} />
            <div style={{height: 3, width: 700 * ease(frame, thanks + 20, thanks + 50), background: C.gold, margin: '30px auto'}} />
            <Reveal at={thanks + 30} y={20}>
              <Label size={28} color={C.muted}>
                Қонақ үй брендтерінің халықаралық даму стратегиялары · IHG мысалында
              </Label>
            </Reveal>
            <Reveal at={thanks + 45} y={20}>
              <Label size={20} color={C.muted} style={{marginTop: 26, opacity: 0.8}}>
                Дереккөздер: IHG Hotels &amp; Resorts жылдық есептері мен ресми ашық деректері (ihgplc.com)
              </Label>
            </Reveal>
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [dur - 20, dur], [0, 1], clamp)}} />
    </AbsoluteFill>
  );
};
