// Chapter labels + dialogue subtitles in the reference layout, plus the timeline HUD.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease, FPS, invLerp, lerp} from '../lib/anim';
import {fonts, P, CHAPTER_SAT} from '../lib/design';
import {CHAPTERS, LINE_AT, SUBS} from '../lib/timeline';
import {VO} from '../data/vo';

const shadow = '0 2px 14px rgba(30,10,40,0.55), 0 0 2px rgba(30,10,40,0.6)';

const ChapterLabel: React.FC<{text: string; t: number; out: number}> = ({text, t, out}) => {
  const chars = [...text];
  return (
    <div style={{display: 'flex', justifyContent: 'center', gap: 0, position: 'relative'}}>
      {chars.map((ch, i) => {
        const k = ease.outExpo(clamp((t - i * 0.022) / 0.5));
        const o = ease.inCubic(clamp((out - i * 0.012) / 0.3));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${lerp(38, 0, k) - o * 30}px)`,
              opacity: k * (1 - o),
              filter: `blur(${(1 - k) * 8 + o * 6}px)`,
              whiteSpace: 'pre',
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const Subs: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const ch = CHAPTERS.find((c) => s >= c.start - 0.05 && s < c.end + 0.6);
  // active subtitle phrase
  let sub: {text: string; t0: number; t1: number; who: string} | null = null;
  for (const [id, at] of Object.entries(LINE_AT)) {
    const dur = VO[id].dur;
    const phrases = SUBS[id];
    phrases.forEach(([off, text], i) => {
      const t0 = at + off;
      const t1 = i < phrases.length - 1 ? at + phrases[i + 1][0] : at + dur + 0.35;
      if (s >= t0 - 0.05 && s < t1) sub = {text, t0, t1, who: id[0]};
    });
  }
  const chT = ch ? s - ch.start : 0;
  const chOut = ch ? clamp((s - ch.end) / 0.5) : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {ch && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: lerp(470, 812, ease.inOutCubic(clamp((chT - 1.1) / 0.7))),
            fontFamily: fonts.cond,
            fontWeight: 700,
            fontSize: lerp(92, 46, ease.inOutCubic(clamp((chT - 1.1) / 0.7))),
            letterSpacing: '0.02em',
            color: '#fff',
            textShadow: shadow,
          }}
        >
          <ChapterLabel text={ch.label} t={chT} out={chOut} />
        </div>
      )}
      {sub && <SubLine {...(sub as {text: string; t0: number; t1: number; who: string})} s={s} />}
    </AbsoluteFill>
  );
};

const SubLine: React.FC<{text: string; t0: number; t1: number; who: string; s: number}> = ({text, t0, t1, who, s}) => {
  const words = text.split(' ');
  const outK = clamp((s - (t1 - 0.12)) / 0.12);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 880,
        textAlign: 'center',
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 34,
        color: '#fff',
        textShadow: shadow,
        opacity: 1 - outK,
      }}
    >
      <span style={{display: 'inline-block', width: 10, height: 10, borderRadius: 5, marginRight: 14, verticalAlign: 'middle', background: who === 'L' ? P.pink : P.cobalt, boxShadow: '0 0 10px rgba(255,255,255,0.6)'}} />
      {words.map((w, i) => {
        const k = ease.outCubic(clamp((s - t0 - i * 0.07) / 0.22));
        return (
          <span key={i} style={{display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 14}px)`, marginRight: 10}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// Small timeline HUD: chapter dots whose colour chips drain with the story
export const TimelineHUD: React.FC<{frame: number}> = ({frame}) => {
  const s = frame / FPS;
  const appear = ease.outCubic(clamp((s - 4.3) / 0.8)) * (1 - clamp((s - 57.4) / 0.5));
  if (appear <= 0) return null;
  const labels = ['старт', '6 мес', '1 год', '1,5 года', 'сейчас'];
  const idx = CHAPTERS.findIndex((c) => s >= c.start && s < c.end + 0.6);
  const prog = CHAPTERS.reduce((acc, c, i) => (s >= c.start ? i + clamp((s - c.start) / (c.end - c.start)) : acc), 0);
  const x0 = 70;
  const gap = 118;
  return (
    <AbsoluteFill style={{opacity: appear, pointerEvents: 'none'}}>
      <svg width={1920} height={1080}>
        <line x1={x0} y1={62} x2={x0 + gap * 4} y2={62} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} />
        <line x1={x0} y1={62} x2={x0 + gap * Math.min(4, prog)} y2={62} stroke="#fff" strokeWidth={2.5} />
        {labels.map((l, i) => {
          const sat = CHAPTER_SAT[i];
          const col = `hsl(330, ${Math.round(85 * Math.min(1, sat))}%, ${Math.round(lerp(60, 70, 1 - sat))}%)`;
          const on = i === idx;
          const r = on ? 9 + Math.sin(frame / 8) * 1.2 : 6;
          return (
            <g key={i}>
              <circle cx={x0 + gap * i} cy={62} r={r + 4} fill="none" stroke="#fff" strokeOpacity={on ? 0.8 : 0.0} strokeWidth={1.5} />
              <circle cx={x0 + gap * i} cy={62} r={r} fill={i <= idx ? col : 'rgba(255,255,255,0.35)'} />
              <text x={x0 + gap * i} y={96} textAnchor="middle" fontFamily={fonts.sans} fontWeight={600} fontSize={16} fill="#fff" opacity={on ? 1 : 0.6} style={{textShadow: shadow}}>
                {l}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const fadeIn = (s: number, a: number, d = 0.4) => ease.outCubic(invLerp(a, a + d, s));
