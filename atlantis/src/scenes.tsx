import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {Brackets, Captions, clamp, Clip, Headline, Logo, Montage, Pill, Punch, Sparkle, Stage, usePop, Vignette} from './components';
import {body, C, display} from './theme';
import timeline from './timeline.json';

const M = timeline.marks;
const S = timeline.scenes;

/* 1. Hook: the logo draws itself, "стоматология для всей семьи". */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [4, 26], [0, 1], {easing: Easing.inOut(Easing.cubic), ...clamp});
  const land = usePop(0, 9);
  const title = usePop(M.name + 6, 11);
  const pill = usePop(M.name + 16, 10);
  const city = usePop(M.name + 26, 12);
  const float = Math.sin(frame / 14) * 8;
  return (
    <AbsoluteFill>
      <Stage />
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 330, transform: `translateY(${float}px) scale(${0.6 + 0.4 * land})`}}>
          <Logo draw={draw} scale={1.7} />
        </div>
        <Sparkle
          size={90}
          color={C.white}
          style={{
            position: 'absolute',
            left: 760,
            top: 300,
            opacity: interpolate(frame, [22, 28, 40], [0, 1, 0], clamp),
            transform: `scale(${interpolate(frame, [22, 40], [0.2, 1.4], clamp)}) rotate(${frame * 3}deg)`,
          }}
        />
        <div style={{position: 'absolute', top: 1000, textAlign: 'center', opacity: title, transform: `translateY(${(1 - title) * 60}px)`}}>
          <Headline size={150}>Стоматология</Headline>
        </div>
        <div style={{position: 'absolute', top: 1185, transform: `scale(${pill})`}}>
          <Pill size={84} bg={C.brand} color={C.white} style={{fontFamily: display, fontWeight: 700, textTransform: 'uppercase', padding: '10px 50px', borderRadius: 24}}>
            для всей семьи
          </Pill>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 1380,
            fontFamily: body,
            fontWeight: 700,
            fontSize: 46,
            letterSpacing: 16,
            color: C.cream,
            opacity: city,
          }}
        >
          АСТАНА
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- Icons for the service cards ---------- */

const ImplantIcon: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M30 12 C 20 12, 18 30, 24 38 L 76 38 C 82 30, 80 12, 70 12 C 62 12, 58 18, 50 18 C 42 18, 38 12, 30 12 Z" fill={C.white} />
    <rect x="42" y="40" width="16" height="8" rx="2" fill="#cfcfd6" />
    <path d="M38 50 L 62 50 L 58 88 L 50 96 L 42 88 Z" fill="#a9a9b3" />
    {[56, 64, 72, 80].map((y) => (
      <path key={y} d={`M38 ${y} L 62 ${y - 4}`} stroke="#6d6d78" strokeWidth="3" />
    ))}
  </svg>
);

const ToothIcon: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 18 C 38 8, 16 10, 15 34 C 14 52, 24 60, 26 78 C 28 94, 36 96, 40 88 C 44 78, 44 66, 50 62 C 56 66, 56 78, 60 88 C 64 96, 72 94, 74 78 C 76 60, 86 52, 85 34 C 84 10, 62 8, 50 18 Z" fill={C.white} />
    <path d="M78 10 C 78.5 15, 79 15.5, 84 16 C 79 16.5, 78.5 17, 78 22 C 77.5 17, 77 16.5, 72 16 C 77 15.5, 77.5 15, 78 10 Z" fill={C.accent} />
  </svg>
);

const BracesIcon: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {[8, 32, 56, 80].map((x, i) => (
      <rect key={i} x={x - 2} y={26} width={22} height={48} rx={9} fill={C.white} />
    ))}
    <path d="M4 50 L 96 50" stroke={C.accent} strokeWidth="4" />
    {[14, 38, 62, 86].map((x) => (
      <rect key={x} x={x - 6} y={43} width={12} height={14} rx={2} fill="#9a9aa6" />
    ))}
  </svg>
);

/* 2. Services: three cards slide in word by word. */
const ServiceCard: React.FC<{at: number; y: number; title: string; sub: string; icon: React.ReactNode}> = ({at, y, title, sub, icon}) => {
  const p = usePop(at, 13);
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        top: y,
        height: 230,
        borderRadius: 36,
        background: 'linear-gradient(120deg, rgba(166,30,54,0.55), rgba(20,10,12,0.75))',
        border: '2px solid rgba(255,255,255,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        padding: '0 48px',
        transform: `translateX(${(1 - p) * 1100}px)`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
      }}
    >
      {icon}
      <div>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 92, color: C.white, textTransform: 'uppercase', lineHeight: 1}}>{title}</div>
        <div style={{fontFamily: body, fontWeight: 700, fontSize: 38, color: C.cream, opacity: 0.85, marginTop: 8}}>{sub}</div>
      </div>
    </div>
  );
};

export const Services: React.FC = () => {
  const base = S.services[0];
  const rel = (abs: number) => abs - base;
  const head = usePop(0, 12);
  const pill = usePop(rel(M.all), 10);
  return (
    <AbsoluteFill>
      <Punch>
        <Stage beams={false} />
        <AbsoluteFill style={{alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 230, transform: `scale(${head})`, display: 'flex', alignItems: 'center', gap: 26}}>
            <div
              style={{
                width: 124,
                height: 124,
                borderRadius: 28,
                background: C.brand,
                color: C.white,
                fontFamily: display,
                fontWeight: 700,
                fontSize: 104,
                lineHeight: '124px',
                textAlign: 'center',
                boxShadow: `0 0 50px ${C.brand}`,
              }}
            >
              3
            </div>
            <Headline size={130}>направления</Headline>
          </div>
          <ServiceCard at={rel(M.implantation)} y={480} title="Имплантация" sub="зуб вместо утраченного" icon={<ImplantIcon size={150} />} />
          <ServiceCard at={rel(M.therapy)} y={750} title="Терапия" sub="лечение кариеса и каналов" icon={<ToothIcon size={150} />} />
          <ServiceCard at={rel(M.ortho)} y={1020} title="Ортодонтия" sub="брекеты и ровный прикус" icon={<BracesIcon size={150} />} />
          <div style={{position: 'absolute', top: 1330, transform: `scale(${pill})`}}>
            <Pill size={66} bg={C.white} color={C.bg}>
              всё в одной клинике
            </Pill>
          </div>
        </AbsoluteFill>
      </Punch>
    </AbsoluteFill>
  );
};

/* 3. Surgery: fast cuts of the implant placement with HUD and subtitles. */
export const Surgery: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Montage
        cuts={[
          {src: 3.45, origin: '45% 35%'},
          {src: 5.4, weight: 1.2, origin: '50% 45%'},
          {src: 2.15},
          {src: 7.3, origin: '40% 50%'},
          {src: 10.55, weight: 1.2, origin: '45% 50%'},
        ]}
      />
      <Vignette />
      <div style={{position: 'absolute', left: 70, top: 300}}>
        <Brackets w={940} h={880} progress={interpolate(frame, [2, 12], [0, 1], clamp)} color="rgba(255,255,255,0.85)" />
      </div>
      <div style={{position: 'absolute', top: 170, width: '100%', textAlign: 'center'}}>
        <Pill size={42} bg="rgba(12,8,9,0.6)" color={C.white} style={{border: `3px solid ${C.accent}`, boxShadow: 'none'}}>
          <span style={{color: C.accent, opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 6))}}>●</span> установка импланта
        </Pill>
      </div>
      <Captions absFrom={S.surgery[0]} top={1330} />
    </AbsoluteFill>
  );
};

/* 4. Offer: an implant assembles (screw → abutment → crown), then "улыбка без переплат". */
const ImplantBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const screw = usePop(6, 14);
  const abut = usePop(14, 10);
  const crown = usePop(22, 8);
  const turn = interpolate(frame, [6, 20], [0, 1], clamp);
  return (
    <svg width={360} height={720} viewBox="0 0 180 360" style={{overflow: 'visible', filter: `drop-shadow(0 0 30px ${C.brand}aa)`}}>
      <defs>
        <linearGradient id="metal" x1="0" x2="1">
          <stop offset="0" stopColor="#7b7d88" />
          <stop offset="0.45" stopColor="#eef0f5" />
          <stop offset="1" stopColor="#6a6c77" />
        </linearGradient>
        <linearGradient id="enamel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9dcd6" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${(1 - screw) * 320})`} opacity={Math.min(1, screw * 2)}>
        <path d="M56 170 L 124 170 L 112 320 L 90 350 L 68 320 Z" fill="url(#metal)" />
        {new Array(9).fill(0).map((_, i) => {
          const y = 182 + i * 16 + ((turn * 16) % 16);
          const half = 34 - (y - 170) * 0.07;
          return <path key={i} d={`M${90 - half} ${y} L ${90 + half} ${y - 8}`} stroke="#4c4e58" strokeWidth="4" strokeLinecap="round" />;
        })}
      </g>
      <g transform={`translate(0 ${(1 - abut) * -260})`} opacity={abut}>
        <path d="M70 128 L 110 128 L 116 170 L 64 170 Z" fill="url(#metal)" />
      </g>
      <g transform={`translate(0 ${(1 - crown) * -420})`} opacity={crown}>
        <path
          d="M90 30 C 64 8, 18 14, 18 62 C 18 96, 40 128, 64 132 L 116 132 C 140 128, 162 96, 162 62 C 162 14, 116 8, 90 30 Z"
          fill="url(#enamel)"
          stroke="#fff"
          strokeWidth="3"
        />
        <ellipse cx="58" cy="58" rx="12" ry="26" fill="#fff" opacity="0.8" transform="rotate(-20 58 58)" />
      </g>
    </svg>
  );
};

export const Offer: React.FC = () => {
  const frame = useCurrentFrame();
  const base = S.offer[0];
  const head = usePop(2, 12);
  const stamp = usePop(M.smile - base, 7);
  return (
    <AbsoluteFill>
      <Punch>
        <Clip src={9.15} dim={0.6} blur={12} push={[1.12, 1.2]} />
        <AbsoluteFill style={{background: `radial-gradient(55% 40% at 50% 55%, ${C.brand}66, transparent)`}} />
      </Punch>
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 200, textAlign: 'center', opacity: head, transform: `translateY(${(1 - head) * -60}px)`}}>
          <Headline size={140}>Выгодная</Headline>
          <Headline size={140} color={C.accent} style={{textShadow: `0 0 40px ${C.brand}`}}>
            имплантация
          </Headline>
        </div>
        <div style={{position: 'absolute', top: 640}}>
          <ImplantBuild />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 1430,
            transform: `rotate(-6deg) scale(${stamp * (1 + 0.03 * Math.sin(frame / 4))})`,
          }}
        >
          <Pill size={78} bg={C.white} color={C.brand} style={{fontFamily: display, fontWeight: 700, textTransform: 'uppercase', borderRadius: 20, padding: '14px 44px'}}>
            улыбка без переплат
          </Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 5. Address: the team at work, with a location card. */
export const Address: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  const card = usePop(6, 12);
  const pin = usePop(8, 7);
  const split = Math.round(durationInFrames * 0.55);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={split}>
        <Punch>
          <Clip src={12.55} origin="50% 35%" />
        </Punch>
      </Sequence>
      <Sequence from={split}>
        <Punch>
          <Clip src={13.9} origin="40% 45%" />
        </Punch>
      </Sequence>
      <Vignette />
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 1240,
          padding: '36px 44px',
          borderRadius: 40,
          background: 'linear-gradient(135deg, #3B0E19, #140a0c)',
          border: `3px solid ${C.accent}`,
          boxShadow: `0 0 60px ${C.brand}aa`,
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          transform: `translateY(${(1 - card) * 500}px)`,
        }}
      >
        <svg width={110} height={140} viewBox="0 0 24 30" style={{transform: `translateY(${(1 - pin) * -200}px)`, flexShrink: 0}}>
          <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 30 12 30s12-9.6 12-18.3C24 5.2 18.6 0 12 0z" fill={C.accent} />
          <circle cx="12" cy="11.5" r="4.6" fill={C.bg} />
        </svg>
        <div>
          <div style={{fontFamily: body, fontWeight: 700, fontSize: 40, color: C.cream, opacity: 0.8}}>ждём вас по адресу</div>
          <Headline size={84} style={{marginTop: 6, whiteSpace: 'nowrap'}}>
            Бухар Жырау, 33/1
          </Headline>
        </div>
      </div>
      <Captions absFrom={S.address[0]} top={240} />
    </AbsoluteFill>
  );
};

/* 6. CTA: logo, WhatsApp booking, button press, credit. */
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const base = S.cta[0];
  const wa = M.whatsapp - base;
  const bubble = usePop(wa - 4, 9);
  const press = wa + 14;
  const btn = usePop(Math.max(0, wa + 4), 10);
  const pressK = interpolate(frame, [press, press + 4, press + 10], [1, 0.9, 1], clamp);
  const ripple = interpolate(frame, [press, press + 22], [0, 1], clamp);
  const pulse = frame > press + 10 ? 1 + 0.03 * Math.sin((frame - press) / 5) : 1;
  return (
    <AbsoluteFill>
      <Punch>
        <Stage />
        <AbsoluteFill style={{alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 180}}>
            <Logo draw={interpolate(frame, [0, 22], [0.25, 1], clamp)} scale={1.25} />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 640,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: '28px 46px',
              borderRadius: '50px 50px 50px 12px',
              background: '#25D366',
              boxShadow: '0 20px 60px rgba(37,211,102,0.45)',
              transform: `scale(${bubble})`,
              transformOrigin: '0% 100%',
            }}
          >
            <svg width={90} height={90} viewBox="0 0 24 24">
              <path
                d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
                fill="#fff"
              />
            </svg>
            <div>
              <div style={{fontFamily: body, fontWeight: 700, fontSize: 38, color: '#fff', opacity: 0.9}}>запись в WhatsApp</div>
              <div style={{fontFamily: body, fontWeight: 900, fontSize: 64, color: '#fff', whiteSpace: 'nowrap'}}>+7 700 711 30 35</div>
            </div>
          </div>
          <div style={{position: 'absolute', top: 1000, transform: `scale(${btn * pressK * pulse})`}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 80,
                border: `6px solid ${C.accent}`,
                transform: `scale(${1 + ripple * 0.5})`,
                opacity: 1 - ripple,
              }}
            />
            <Pill size={76} bg={C.brand} color="#fff" style={{boxShadow: `0 0 60px ${C.brandLight}`, padding: '26px 70px'}}>
              Записаться
            </Pill>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 1230,
              textAlign: 'center',
              fontFamily: body,
              fontWeight: 800,
              fontSize: 54,
              color: C.white,
              opacity: interpolate(frame, [press + 6, press + 16], [0, 1], clamp),
            }}
          >
            @atlantis.dent
            <div style={{fontWeight: 600, fontSize: 38, color: C.cream, opacity: 0.8, marginTop: 10}}>ул. Бухар Жырау, 33/1 · Астана</div>
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
          color: C.cream,
          opacity: 0.8 * interpolate(frame, [press + 18, press + 30], [0, 1], clamp),
          transform: `translateY(${interpolate(frame, [press + 18, press + 30], [16, 0], clamp)}px)`,
        }}
      >
        made by f4rh4t._
      </div>
    </AbsoluteFill>
  );
};
