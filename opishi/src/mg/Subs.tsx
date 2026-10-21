// Chapter labels + word-by-word subtitles, laid out for 9:16 in the reference manner.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, ease, FPS, lerp} from '../lib/anim';
import {fonts, P} from '../lib/design';
import {CHAPTERS, LINE_AT, SUBS} from '../lib/timeline';
import {VO} from '../data/vo';

const shadow = '0 3px 18px rgba(20,8,30,0.65), 0 0 3px rgba(20,8,30,0.7)';

export const Subs: React.FC<{frame: number; hideSubs?: boolean}> = ({frame, hideSubs}) => {
  const s = frame / FPS;
  const ch = CHAPTERS.find((c) => s >= c.start - 0.05 && s < c.end + 0.4);
  let sub: {text: string; t0: number; t1: number; who: string} | null = null;
  for (const [id, at] of Object.entries(LINE_AT)) {
    const phrases = SUBS[id];
    phrases.forEach(([off, text], i) => {
      const t0 = at + off;
      const t1 = i < phrases.length - 1 ? at + phrases[i + 1][0] : at + VO[id].dur + 0.35;
      if (s >= t0 - 0.05 && s < t1) sub = {text, t0, t1, who: id[0]};
    });
  }
  const chT = ch ? s - ch.start : 0;
  const chOut = ch ? clamp((s - ch.end) / 0.4) : 0;
  const settle = ease.inOutCubic(clamp((chT - 1.3) / 0.7));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {ch && (
        <div style={{position: 'absolute', left: 0, right: 0, top: lerp(840, 1300, settle), textAlign: 'center', fontFamily: fonts.cond, fontWeight: 700, fontSize: lerp(104, 54, settle), color: '#fff', letterSpacing: '0.02em', textShadow: shadow}}>
          {[...ch.label].map((c, i) => {
            const k = ease.outExpo(clamp((chT - i * 0.03) / 0.5));
            const o = ease.inCubic(clamp((chOut * 0.4 - i * 0.01) / 0.3));
            return (
              <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(1 - k) * 46 - o * 30}px) scale(${lerp(1.3, 1, k)})`, opacity: k * (1 - chOut), filter: `blur(${(1 - k) * 8}px)`}}>
                {c}
              </span>
            );
          })}
        </div>
      )}
      {sub && !hideSubs && <SubLine {...(sub as {text: string; t0: number; t1: number; who: string})} s={s} />}
    </AbsoluteFill>
  );
};

const SubLine: React.FC<{text: string; t0: number; t1: number; who: string; s: number}> = ({text, t0, t1, who, s}) => {
  const words = text.split(' ');
  const outK = clamp((s - (t1 - 0.12)) / 0.12);
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 1380, textAlign: 'center', fontFamily: fonts.sans, fontWeight: 600, fontSize: 44, lineHeight: 1.3, color: '#fff', textShadow: shadow, opacity: 1 - outK}}>
      <span style={{display: 'inline-block', width: 14, height: 14, borderRadius: 7, marginRight: 16, verticalAlign: 'middle', background: who === 'M' ? P.lime : P.sunset, boxShadow: '0 0 12px rgba(255,255,255,0.5)'}} />
      {words.map((w, i) => {
        const k = ease.outCubic(clamp((s - t0 - i * 0.07) / 0.22));
        return (
          <span key={i} style={{display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 16}px)`, marginRight: 12}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};
