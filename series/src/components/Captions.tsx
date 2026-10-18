import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../lib/theme';
import {clamp, ease} from '../lib/anim';

export type Word = {w: string; s: number; e: number};
type Chunk = {words: Word[]; start: number; end: number};

const ENDS = /[.!?…»,]$/;
const clean = (w: string) => w.toLowerCase().replace(/[^а-яё\w]/gi, '');

export const buildChunks = (words: Word[], maxWords = 4, maxChars = 18): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) chunks.push({words: cur, start: cur[0].s, end: cur[cur.length - 1].e});
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const chars = cur.reduce((a, b) => a + b.w.length + 1, 0) + w.w.length;
    if (cur.length && (cur.length >= maxWords || chars > maxChars || (prev && w.s - prev.e > 0.32))) flush();
    cur.push(w);
    if (/[.!?…»]$/.test(w.w)) flush();
  });
  flush();
  // let each chunk stay until the next one starts (or a short tail)
  return chunks.map((c, i) => {
    const next = chunks[i + 1];
    const tail = next ? Math.min(next.start - 0.02, c.end + 0.7) : c.end + 0.9;
    return {...c, end: tail};
  });
};

type Props = {
  t: number;
  words: Word[];
  offset: number;
  highlight: string[];
  y?: number;
  hidden?: (t: number) => boolean;
};

export const Captions: React.FC<Props> = ({t, words, offset, highlight, y = 1390, hidden}) => {
  const chunks = React.useMemo(() => buildChunks(words), [words]);
  const vt = t - offset;
  const chunk = chunks.find((c) => vt >= c.start - 0.06 && vt < c.end);
  if (!chunk || hidden?.(t)) return null;
  const hl = new Set(highlight);
  const inP = ease.outExpo(clamp((vt - chunk.start + 0.06) / 0.18));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: y,
          left: 140,
          right: 140,
          transform: `translateY(-50%) translateY(${(1 - inP) * 26}px) scale(${0.92 + 0.08 * inP})`,
          opacity: inP,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: 22,
          rowGap: 0,
          textAlign: 'center',
        }}
      >
        {chunk.words.map((w, i) => {
          const spoken = vt >= w.s - 0.02;
          const k = clamp((vt - w.s + 0.02) / 0.12);
          const lift = spoken ? -10 * Math.sin(Math.PI * k) : 0;
          const isHl = hl.has(clean(w.w));
          return (
            <span
              key={i}
              style={{
                fontFamily: F.caption,
                fontWeight: 900,
                fontSize: 72,
                lineHeight: 1.12,
                letterSpacing: -1.5,
                color: spoken ? (isHl ? C.magentaHot : '#fff') : 'rgba(255,255,255,0.38)',
                display: 'inline-block',
                transform: `translateY(${lift}px)`,
                textShadow:
                  '0 4px 0 rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.9), 3px 0 0 rgba(0,0,0,0.5), -3px 0 0 rgba(0,0,0,0.5)',
                WebkitTextStroke: '1.5px rgba(0,0,0,0.35)',
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
