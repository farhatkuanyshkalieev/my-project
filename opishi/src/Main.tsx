// «Опиши мне» — master composition (1080x1920, 60 fps, 100 s).
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {clamp, FPS} from './lib/anim';
import {P} from './lib/design';
import {TitleCard} from './mg/Titles';
import {Dip, LensReveal, ShardWipe} from './mg/Overlays';
import {Subs} from './mg/Subs';
import {Grain, Vignette} from './fx/Post';
import {S1Roof} from './scenes/S1Roof';
import {S2Night} from './scenes/S2Night';
import {S3Day} from './scenes/S3Day';
import {S4Dawn} from './scenes/S4Dawn';
import {S5Last} from './scenes/S5Last';

export const Main: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {s < 6.6 && <TitleCard frame={frame} />}
      {s >= 5.6 && s < 6.6 && (
        <LensReveal p={(s - 5.6) / 1.0}>
          <S1Roof frame={frame} />
        </LensReveal>
      )}
      {s >= 6.6 && s < 27.0 && <S1Roof frame={frame} />}
      {s >= 27.0 && s < 38.5 && <S2Night frame={frame} />}
      {s >= 38.5 && s < 58.0 && <S3Day frame={frame} />}
      {s >= 58.0 && s < 68.9 && <S4Dawn frame={frame} />}
      {s >= 67.9 && s < 68.9 && (
        <LensReveal p={(s - 67.9) / 1.0}>
          <S5Last frame={frame} />
        </LensReveal>
      )}
      {s >= 68.9 && <S5Last frame={frame} />}

      <ShardWipe p={(s - 26.7) / 0.6} colors={[P.lilac, P.night, P.lime]} />
      <Dip v={s >= 38.5 && s < 38.9 ? 1 - (s - 38.5) / 0.4 : 0} />
      <Dip v={s >= 58.0 && s < 58.5 ? 1 - (s - 58.0) / 0.5 : 0} />

      {s < 97.6 && <Vignette strength={s > 27 && s < 68 ? 0.5 : 0.36} />}
      <Grain frame={frame} amount={0.05} />
      {s < 97.6 && <Subs frame={frame} />}
      {withAudio && <Audio src={staticFile('audio/mix.wav')} />}
      {clamp(0) ? null : null}
    </AbsoluteFill>
  );
};
