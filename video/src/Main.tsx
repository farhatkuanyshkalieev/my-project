import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, delayRender, continueRender} from 'remotion';
import timeline from './timeline.json';
import {Background, SceneFrame, C, FONT, DISPLAY, clamp, Sfx} from './ui';
import {S1Intro, S2History, S3Scale, S4AssetLight, S5Portfolio, S6Local, S7Loyalty, S8Partners, S9Kazakhstan, S10Outro} from './scenes';

const SCENES = [S1Intro, S2History, S3Scale, S4AssetLight, S5Portfolio, S6Local, S7Loyalty, S8Partners, S9Kazakhstan, S10Outro];
const CHAPTERS = ['Кіріспе', 'Тарих', 'Ауқым', 'Стратегия 1', 'Стратегия 2', 'Стратегия 3', 'Стратегия 4', 'Стратегия 5', 'Қазақстан', 'Қорытынды'];
const HUES = [C.gold, C.teal, C.blue, C.gold, C.teal, C.rose, C.gold, C.teal, C.teal, C.gold];

const fontFiles: [string, string, string][] = [
  ['Inter', 'Inter-Regular.otf', '400'],
  ['Inter', 'Inter-Medium.otf', '500'],
  ['Inter', 'Inter-SemiBold.otf', '600'],
  ['Inter', 'Inter-Bold.otf', '700'],
  ['InterDisplay', 'InterDisplay-Bold.otf', '700'],
  ['InterDisplay', 'InterDisplay-ExtraBold.otf', '800'],
];
if (typeof document !== 'undefined') {
  const h = delayRender('fonts', {timeoutInMilliseconds: 180000, retries: 2});
  Promise.all(
    fontFiles.map(([fam, file, w]) => {
      const f = new FontFace(fam, `url(${staticFile('fonts/' + file)})`, {weight: w});
      return f.load().then((ff) => document.fonts.add(ff));
    }),
  )
    .catch((e) => console.warn('font load failed', e))
    .then(() => continueRender(h));
}

const lead = timeline.lead;

const musicVolume = (f: number) => {
  // duck music while the narrator speaks
  let v = 0.3;
  for (const s of timeline.scenes) {
    const a = s.start + lead;
    const b = a + s.voDuration;
    if (f >= a - 12 && f <= b + 12) {
      const k = Math.min(interpolate(f, [a - 12, a], [0, 1], clamp), interpolate(f, [b, b + 12], [1, 0], clamp));
      v = Math.min(v, 0.3 - 0.21 * k);
    }
  }
  const end = timeline.total;
  return v * interpolate(f, [end - 60, end], [1, 0], clamp);
};

const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  for (const s of timeline.scenes) {
    for (const sub of s.subs) {
      const a = s.start + sub.from;
      const b = s.start + sub.to;
      if (frame >= a - 2 && frame < b + 4) {
        const o = Math.min(interpolate(frame, [a - 2, a + 5], [0, 1], clamp), interpolate(frame, [b, b + 4], [1, 0], clamp));
        return (
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 42, display: 'flex', justifyContent: 'center'}}>
            <div
              style={{
                maxWidth: 1500,
                padding: '12px 30px',
                borderRadius: 14,
                background: 'rgba(3,9,18,0.72)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: 34,
                lineHeight: 1.35,
                color: C.white,
                textAlign: 'center',
                opacity: o,
                transform: `translateY(${(1 - o) * 10}px)`,
              }}
            >
              {sub.text}
            </div>
          </div>
        );
      }
    }
  }
  return null;
};

const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = timeline.scenes.findIndex((s) => frame >= s.start && frame < s.start + s.duration);
  const p = frame / timeline.total;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, height: 5, width: `${p * 100}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.gold})`}} />
      <div style={{position: 'absolute', right: 60, top: 40, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, color: C.muted, fontSize: 20, fontWeight: 600, letterSpacing: 2}}>
        <span style={{fontFamily: DISPLAY, fontWeight: 800, color: C.bg0, background: C.gold, padding: '1px 10px', borderRadius: 6}}>IHG</span>
        <span>{idx >= 0 ? CHAPTERS[idx].toUpperCase() : ''}</span>
        <span style={{color: C.gold}}>{idx >= 0 ? `${String(idx + 1).padStart(2, '0')}/10` : ''}</span>
      </div>
    </>
  );
};

/** Gold light sweep across scene cuts. */
const Sweep: React.FC = () => {
  const frame = useCurrentFrame();
  const cut = timeline.scenes.slice(1).find((s) => Math.abs(frame - s.start) < 14);
  if (!cut) return null;
  const t = (frame - cut.start + 14) / 28;
  return (
    <div
      style={{
        position: 'absolute',
        top: -200,
        bottom: -200,
        width: 360,
        left: -400 + t * 2700,
        background: `linear-gradient(90deg, transparent, ${C.gold}55, rgba(255,255,255,0.35), ${C.gold}55, transparent)`,
        transform: 'skewX(-18deg)',
        filter: 'blur(8px)',
      }}
    />
  );
};

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = Math.max(0, timeline.scenes.findIndex((s) => frame >= s.start && frame < s.start + s.duration));
  return (
    <AbsoluteFill style={{background: C.bg0}}>
      <Background hue={HUES[idx]} />
      <Audio src={staticFile('music.wav')} volume={musicVolume} />
      {timeline.scenes.map((s, i) => {
        const Comp = SCENES[i];
        return (
          <Sequence key={i} from={s.start} durationInFrames={s.duration}>
            <SceneFrame dur={s.duration}>
              <Comp c={s.sent} dur={s.duration} />
            </SceneFrame>
            <Sequence from={lead} layout="none">
              <Audio src={staticFile(`vo/s${String(i + 1).padStart(2, '0')}.wav`)} volume={1} />
            </Sequence>
          </Sequence>
        );
      })}
      <Sweep />
      <Hud />
      <Subtitles />
    </AbsoluteFill>
  );
};
