import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  Brackets,
  Captions,
  clamp,
  Clip,
  Headline,
  Logo,
  Montage,
  Pill,
  Punch,
  Stage,
  Tooth,
  usePop,
  Vignette,
} from './components';
import {body, C, display} from './theme';
import timeline from './timeline.json';

const M = timeline.marks;
const S = timeline.scenes;

/* 1. Hook: tooth drops into the spotlight, "Улыбка под ключ", logo. */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drop = usePop(0, 9);
  const title = usePop(Math.round(0.55 * fps), 11);
  const pill = usePop(Math.round(1.25 * fps), 10);
  const logoAt = M.dentline - 8;
  const logoDraw = interpolate(frame, [logoAt, logoAt + 20], [0, 1], {easing: Easing.inOut(Easing.cubic), ...clamp});
  const float = Math.sin(frame / 12) * 10;
  return (
    <AbsoluteFill>
      <Stage />
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 230, textAlign: 'center', transform: `translateY(${(1 - title) * -80}px)`, opacity: title}}>
          <Headline size={170}>Улыбка</Headline>
          <div style={{display: 'flex', gap: 24, justifyContent: 'center', marginTop: 10, alignItems: 'center'}}>
            <Headline size={150}>под</Headline>
            <div style={{transform: `scale(${pill})`}}>
              <Pill size={118} style={{fontFamily: display, fontWeight: 700, padding: '4px 40px', borderRadius: 30, textTransform: 'uppercase'}}>
                ключ
              </Pill>
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 700,
            transform: `translateY(${(1 - drop) * -900 + float}px) rotate(${(1 - drop) * -25}deg)`,
          }}
        >
          <Tooth size={340} shine={interpolate(frame, [20, 50], [0, 1], clamp)} />
        </div>
        <div style={{position: 'absolute', top: 640, left: 540 - 260}}>
          <Brackets w={520} h={560} progress={interpolate(frame, [12, 24], [0, 1], clamp)} />
        </div>
        <div style={{position: 'absolute', top: 1360, opacity: logoDraw > 0 ? 1 : 0}}>
          <Logo draw={logoDraw} scale={0.95} />
          <div
            style={{
              textAlign: 'center',
              fontFamily: body,
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: 14,
              color: C.ice,
              marginTop: 10,
              opacity: interpolate(logoDraw, [0.7, 1], [0, 1], clamp),
            }}
          >
            СТОМАТОЛОГИЯ · АСТАНА
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2. Services: labels pop around the tooth word by word. */
const ServiceLabel: React.FC<{at: number; x: number; y: number; title: string; sub: string; align: 'left' | 'right' | 'center'}> = ({
  at,
  x,
  y,
  title,
  sub,
  align,
}) => {
  const p = usePop(at, 10);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 420,
        textAlign: align,
        transform: `scale(${p}) translateY(${(1 - p) * 40}px)`,
        transformOrigin: align === 'left' ? '0% 50%' : align === 'right' ? '100% 50%' : '50% 50%',
        opacity: Math.min(1, p * 1.5),
      }}
    >
      <div style={{fontFamily: display, fontWeight: 700, fontSize: 84, color: C.white, textTransform: 'uppercase', lineHeight: 1}}>{title}</div>
      <div style={{fontFamily: body, fontWeight: 700, fontSize: 36, color: C.cyan, marginTop: 8}}>{sub}</div>
    </div>
  );
};

export const Services: React.FC = () => {
  const frame = useCurrentFrame();
  const base = S.services[0];
  const rel = (abs: number) => abs - base;
  const head = usePop(0, 12);
  const pill = usePop(rel(M.all), 10);
  const glow = 0.6 + 0.4 * Math.sin(frame / 6);
  return (
    <AbsoluteFill>
      <Punch>
        <Stage beams={false} />
        <AbsoluteFill style={{alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 190, transform: `scale(${head})`, display: 'flex', alignItems: 'center', gap: 26}}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 28,
                background: C.cyan,
                color: C.navy,
                fontFamily: display,
                fontWeight: 700,
                fontSize: 104,
                lineHeight: '120px',
                textAlign: 'center',
                boxShadow: `0 0 50px ${C.cyan}`,
              }}
            >
              4
            </div>
            <Headline size={130}>направления</Headline>
          </div>
          <div style={{position: 'absolute', top: 600, transform: `scale(${1 + 0.02 * Math.sin(frame / 10)})`}}>
            <Tooth size={380} glow={glow} shine={interpolate(frame, [rel(M.treatment), rel(M.treatment) + 20], [0, 1], clamp)} />
          </div>
          <ServiceLabel at={rel(M.implants)} x={50} y={470} title="Импланты" sub="под ключ" align="left" />
          <ServiceLabel at={rel(M.veneers)} x={610} y={470} title="Виниры" sub="голливудская улыбка" align="right" />
          <ServiceLabel at={rel(M.braces)} x={50} y={1120} title="Брекеты" sub="ровный прикус" align="left" />
          <ServiceLabel at={rel(M.treatment)} x={610} y={1120} title="Лечение" sub="кариес и каналы" align="right" />
          <div style={{position: 'absolute', top: 1450, transform: `scale(${pill})`}}>
            <Pill size={64}>всё в одной клинике</Pill>
          </div>
        </AbsoluteFill>
      </Punch>
    </AbsoluteFill>
  );
};

/* 3. Doctors at work: fast footage cuts with HUD and subtitles. */
export const Doctors: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Montage
        cuts={[
          {src: 8.95, weight: 1.15, origin: '45% 30%'},
          {src: 5.25},
          {src: 17.3, origin: '50% 45%'},
          {src: 24.4},
        ]}
      />
      <Vignette />
      <div style={{position: 'absolute', left: 70, top: 300}}>
        <Brackets w={940} h={880} progress={interpolate(frame, [2, 12], [0, 1], clamp)} color="rgba(255,255,255,0.85)" />
      </div>
      <div style={{position: 'absolute', top: 170, width: '100%', textAlign: 'center'}}>
        <Pill size={42} bg="rgba(5,15,38,0.65)" color={C.white} style={{border: `3px solid ${C.cyan}`, boxShadow: 'none'}}>
          ● увеличительная оптика
        </Pill>
      </div>
      <Captions absFrom={S.doctors[0]} top={1330} />
    </AbsoluteFill>
  );
};

/* 4. Social proof: counter to 10 000+ over darkened footage. */
export const Patients: React.FC = () => {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [2, 28], [0, 10000], {easing: Easing.out(Easing.cubic), ...clamp});
  const label = usePop(14, 11);
  const land = usePop(28, 6);
  return (
    <AbsoluteFill>
      <Punch>
        <Clip src={12.4} dim={0.62} blur={10} push={[1.1, 1.18]} />
        <AbsoluteFill style={{background: `radial-gradient(60% 40% at 50% 45%, ${C.blue}55, transparent)`}} />
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{display: 'flex', gap: 18, marginBottom: 30}}>
            {[0, 1, 2, 3, 4].map((i) => {
              const p = usePop(4 + i * 3, 9);
              return (
                <svg key={i} width={84} height={84} viewBox="0 0 24 24" style={{transform: `scale(${p})`, filter: `drop-shadow(0 0 12px ${C.cyan})`}}>
                  <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill={C.cyan} />
                </svg>
              );
            })}
          </div>
          <div style={{transform: `scale(${1 + 0.12 * (1 - land) * (frame > 28 ? 1 : 0)})`}}>
            <Headline size={250} style={{fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${C.cyan}aa`}}>
              {Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')}+
            </Headline>
          </div>
          <div style={{transform: `translateY(${(1 - label) * 40}px)`, opacity: label, marginTop: 10}}>
            <Pill size={60}>довольных пациентов</Pill>
          </div>
        </AbsoluteFill>
      </Punch>
    </AbsoluteFill>
  );
};

/* 5. Experience: doctor portrait with a glass stat card. */
export const Experience: React.FC = () => {
  const card = usePop(4, 12);
  return (
    <AbsoluteFill>
      <Punch>
        <Clip src={28.8} rate={0.72} push={[1.02, 1.1]} origin="50% 30%" />
        <Vignette />
      </Punch>
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: 1330,
          padding: '34px 40px',
          borderRadius: 40,
          background: 'linear-gradient(135deg, #0A2560, #06143A)',
          border: `3px solid ${C.cyan}`,
          boxShadow: `0 0 60px ${C.blue}aa`,
        }}
      >
        {/* The card itself is on screen from frame 0 to mask text burned into the source; only its contents pop. */}
        <div style={{display: 'flex', alignItems: 'center', gap: 34, transform: `scale(${card})`, opacity: card}}>
          <Headline size={190} color={C.cyan} style={{textShadow: `0 0 40px ${C.cyan}88`}}>
            10+
          </Headline>
          <div>
            <div style={{fontFamily: display, fontWeight: 700, fontSize: 86, color: C.white, textTransform: 'uppercase', lineHeight: 1}}>лет</div>
            <div style={{fontFamily: body, fontWeight: 700, fontSize: 44, color: C.ice}}>стаж наших врачей</div>
          </div>
        </div>
      </div>
      <Captions absFrom={S.experience[0]} top={240} />
    </AbsoluteFill>
  );
};

/* 6. Opening promo: the receipt from their pinned post prints out over the clinic. */
export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const print = interpolate(frame, [2, 20], [0, 1], {easing: Easing.out(Easing.cubic), ...clamp});
  const stamp = usePop(18, 8);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={Math.round(durationInFrames * 0.5)}>
        <Punch>
          <Clip src={12.45} dim={0.45} />
        </Punch>
      </Sequence>
      <Sequence from={Math.round(durationInFrames * 0.5)}>
        <Punch>
          <Clip src={1.6} dim={0.45} />
        </Punch>
      </Sequence>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.blue}66, ${C.navy}aa)`}} />
      {/* printer slot */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 300,
          height: 60,
          borderRadius: 30,
          background: 'linear-gradient(180deg,#d7dde6,#8d97a6)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      />
      <div style={{position: 'absolute', left: 160, right: 160, top: 330, height: 1150, overflow: 'hidden', zIndex: 1}}>
        <div
          style={{
            height: 1100,
            background: '#fff',
            transform: `translateY(${(print - 1) * 1100}px)`,
            padding: '60px 50px',
            boxSizing: 'border-box',
            textAlign: 'center',
            clipPath:
              'polygon(0 0,100% 0,100% 97%,95% 100%,90% 97%,85% 100%,80% 97%,75% 100%,70% 97%,65% 100%,60% 97%,55% 100%,50% 97%,45% 100%,40% 97%,35% 100%,30% 97%,25% 100%,20% 97%,15% 100%,10% 97%,5% 100%,0 97%)',
          }}
        >
          <Logo light={false} scale={0.55} />
          <div style={{borderTop: '4px dashed #9aa5b5', margin: '10px 0 30px'}} />
          <Headline size={150} color={C.blue} style={{textShadow: 'none', lineHeight: 0.95}}>
            В честь
            <br />
            открытия
          </Headline>
          <div style={{fontFamily: body, fontWeight: 700, fontSize: 46, color: '#1b2540', marginTop: 34, lineHeight: 1.25}}>
            Акции на весь спектр
            <br />
            стоматологических услуг
          </div>
          <div style={{display: 'flex', justifyContent: 'center', gap: 5, marginTop: 50, height: 120}}>
            {new Array(46).fill(0).map((_, i) => (
              <div key={i} style={{width: [3, 6, 2, 8, 4][i % 5], background: '#111'}} />
            ))}
          </div>
          <div style={{fontFamily: body, fontWeight: 600, fontSize: 32, color: '#333', marginTop: 16}}>Проспект Туран 43/6</div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 50,
          top: 400,
          zIndex: 3,
          transform: `rotate(-12deg) scale(${stamp * (1 + 0.04 * Math.sin(frame / 4))})`,
        }}
      >
        <Pill size={70} bg="#FF5A36" color="#fff" style={{fontFamily: display, fontWeight: 700, textTransform: 'uppercase'}}>
          Акция!
        </Pill>
      </div>
    </AbsoluteFill>
  );
};

/* 7. CTA: address pin, logo, sign-up button. */
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const base = S.cta[0];
  const pin = usePop(6, 7);
  const addr = usePop(14, 12);
  const btn = usePop(Math.max(0, M.signup - base - 8), 10);
  const press = M.signup - base;
  const pressK = interpolate(frame, [press, press + 4, press + 10], [1, 0.9, 1], clamp);
  const ripple = interpolate(frame, [press, press + 22], [0, 1], clamp);
  const pulse = frame > press + 10 ? 1 + 0.03 * Math.sin((frame - press) / 5) : 1;
  return (
    <AbsoluteFill>
      <Punch>
        <Stage />
        <AbsoluteFill style={{alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 210}}>
            <Logo draw={interpolate(frame, [0, 22], [0.2, 1], clamp)} scale={1.05} />
          </div>
          <div style={{position: 'absolute', top: 760, transform: `translateY(${(1 - pin) * -500}px)`}}>
            <svg width={150} height={190} viewBox="0 0 24 30" style={{filter: `drop-shadow(0 0 24px ${C.cyan})`}}>
              <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 30 12 30s12-9.6 12-18.3C24 5.2 18.6 0 12 0z" fill={C.cyan} />
              <circle cx="12" cy="11.5" r="4.6" fill={C.navy} />
            </svg>
          </div>
          <div style={{position: 'absolute', top: 990, textAlign: 'center', opacity: addr, transform: `translateY(${(1 - addr) * 40}px)`}}>
            <Headline size={104}>пр. Туран, 43/6</Headline>
            <div style={{fontFamily: body, fontWeight: 700, fontSize: 46, color: C.ice, marginTop: 14, letterSpacing: 6}}>АСТАНА</div>
          </div>
          <div style={{position: 'absolute', top: 1330, transform: `scale(${btn * pressK * pulse})`}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 80,
                border: `6px solid ${C.cyan}`,
                transform: `scale(${1 + ripple * 0.5})`,
                opacity: 1 - ripple,
              }}
            />
            <Pill size={76} bg={C.blue} color="#fff" style={{boxShadow: `0 0 60px ${C.royal}`, padding: '26px 70px'}}>
              Записаться
            </Pill>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 1560,
              fontFamily: body,
              fontWeight: 800,
              fontSize: 54,
              color: C.white,
              opacity: interpolate(frame, [press + 6, press + 16], [0, 1], clamp),
            }}
          >
            @dentline.kz
          </div>
        </AbsoluteFill>
      </Punch>
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [S.cta[1] - base - 0.4 * fps, S.cta[1] - base], [0, 0.6], clamp)}} />
      {/* Author credit, kept above the closing fade so it stays readable to the last frame. */}
      <div
        style={{
          position: 'absolute',
          top: 1660,
          width: '100%',
          textAlign: 'center',
          fontFamily: body,
          fontWeight: 600,
          fontSize: 36,
          letterSpacing: 3,
          color: C.ice,
          opacity: 0.8 * interpolate(frame, [press + 18, press + 30], [0, 1], clamp),
          transform: `translateY(${interpolate(frame, [press + 18, press + 30], [16, 0], clamp)}px)`,
        }}
      >
        made by f4rh4t._
      </div>
    </AbsoluteFill>
  );
};
