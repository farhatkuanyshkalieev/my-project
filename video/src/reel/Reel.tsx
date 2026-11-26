import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig, random} from 'remotion';
import data from './reel.json';
import {PAL, VividBg, DISPLAY, Y, INK, clamp, Sfx} from './kit';
import {Shot} from './shots';
import '../fonts';

const lines = data.lines as any[];

const sceneStarts = lines.filter((l, i) => i === 0 || lines[i - 1].scene !== l.scene).map((l) => ({scene: l.scene, start: l.start}));

/** Camera: punch-in at each cut, slow push, shake on big moments, whip-in alternating directions. */
const Cam: React.FC<{children: React.ReactNode; idx: number; mood: string; dur: number}> = ({children, idx, mood, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 14, stiffness: 160, mass: 0.6}});
  const kind = idx % 4;
  const enterX = kind === 0 ? (1 - s) * 260 : kind === 2 ? (1 - s) * -260 : 0;
  const enterY = kind === 1 ? (1 - s) * 200 : 0;
  const enterRot = kind === 3 ? (1 - s) * -6 : 0;
  const punch = 1 + (1 - s) * 0.18;
  const push = 1 + (f / Math.max(1, dur)) * 0.05;
  const shakeAmt = mood === 'wow' ? interpolate(f, [0, 14], [16, 0], clamp) : 0;
  const sx = (random(`x${f}${idx}`) - 0.5) * shakeAmt;
  const sy = (random(`y${f}${idx}`) - 0.5) * shakeAmt;
  const blur = Math.abs(1 - s) * 14;
  const out = interpolate(f, [dur - 5, dur], [1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${enterX + sx}px, ${enterY + sy}px) scale(${punch * push}) rotate(${enterRot}deg)`,
        filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
        opacity: Math.min(1, s * 3) * (0.3 + 0.7 * out),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Flash frame on cuts */
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const cut = lines.find((l) => f >= l.start && f < l.start + 4);
  if (!cut || cut.i === 0) return null;
  return <AbsoluteFill style={{background: '#fff', opacity: interpolate(f - cut.start, [0, 4], [0.35, 0], clamp)}} />;
};

/** Reels-style word-by-word captions. */
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const line = lines.find((l) => f >= l.start && f < l.end);
  if (!line) return null;
  const words = line.words;
  let chunk = line.chunks[0];
  for (const c of line.chunks) if (f >= words[c[0]].from - 2) chunk = c;
  const cStart = words[chunk[0]].from - 2;
  const pop = spring({frame: f - cStart, fps, config: {damping: 12, stiffness: 220, mass: 0.5}});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 58, display: 'flex', justifyContent: 'center'}}>
      <div style={{display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1600, transform: `scale(${0.85 + 0.15 * pop})`}}>
        {chunk.map((wi: number) => {
          const w = words[wi];
          const active = f >= w.from && f < Math.max(w.to, (words[wi + 1]?.from ?? w.to + 6));
          const said = f >= w.from;
          return (
            <span
              key={wi}
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 64,
                textTransform: 'uppercase',
                padding: '2px 16px',
                borderRadius: 14,
                color: active ? INK : '#fff',
                background: active ? Y : 'transparent',
                opacity: said ? 1 : 0.55,
                transform: `scale(${active ? 1.08 : 1}) rotate(${active ? -2 : 0}deg)`,
                WebkitTextStroke: active ? undefined : '2px rgba(0,0,0,0.55)',
                textShadow: active ? 'none' : '0 5px 0 rgba(0,0,0,0.45), 0 0 20px rgba(0,0,0,0.35)',
                boxShadow: active ? '0 8px 0 rgba(0,0,0,0.25)' : undefined,
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Progress: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 30, right: 30, top: 22, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.3)'}}>
      <div style={{height: 8, borderRadius: 4, width: `${(f / data.total) * 100}%`, background: '#fff'}} />
    </div>
  );
};

export const Reel: React.FC = () => {
  const f = useCurrentFrame();
  let si = 0;
  sceneStarts.forEach((s, i) => {
    if (f >= s.start - 4) si = i;
  });
  const cur = sceneStarts[si];
  const prev = si > 0 ? PAL[sceneStarts[si - 1].scene] : undefined;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <VividBg pal={PAL[cur.scene]} prev={prev} since={cur.start - 4} />
      <Audio src={staticFile('reel/music.wav')} volume={(fr) => 0.2 * interpolate(fr, [data.total - 45, data.total], [1, 0], clamp)} />
      {sceneStarts.slice(1).map((s, i) => (
        <Sfx key={i} at={s.start - 6} name="whoosh" volume={0.45} />
      ))}
      {lines.map((l) => (
        <Sequence key={l.i} from={l.start} durationInFrames={l.end - l.start}>
          <Cam idx={l.i} mood={l.mood} dur={l.end - l.start}>
            <Shot shot={l.shot} dur={l.end - l.start} phr={l.phr} mood={l.mood} idx={l.i} w={l.words.map((w: any) => ({...w, from: w.from - l.start, to: w.to - l.start}))} />
          </Cam>
          <Audio src={staticFile(`reel/vo/l${String(l.i).padStart(2, '0')}.wav`)} volume={1} />
        </Sequence>
      ))}
      <Flash />
      <Progress />
      <Captions />
    </AbsoluteFill>
  );
};
