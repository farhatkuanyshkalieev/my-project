// «Ярче» — master composition: scenes, transitions, titles, finishing.
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {clamp, FPS} from './lib/anim';
import {P} from './lib/design';
import {S0Title} from './scenes/S0Title';
import {S1Embankment} from './scenes/S1Embankment';
import {S2Studio} from './scenes/S2Studio';
import {S3Kitchen} from './scenes/S3Kitchen';
import {S4Office} from './scenes/S4Office';
import {S5Now} from './scenes/S5Now';
import {BrushWipe, Slats, whip, WhipFilter, WhipStreaks} from './mg/Transitions';
import {Subs, TimelineHUD} from './mg/Subs';
import {Grain, Vignette} from './fx/Post';
import {FLAGS} from './lib/flags';

export const Main: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const whipP = (s - 27.95) / 0.4;
  const whipOn = whipP > 0 && whipP < 1;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {FLAGS.noSvgBlur && <style>{'svg *[filter]{filter:none !important}'}</style>}
      {whipOn && <WhipFilter p={whipP} />}
      {s < 4 && <S0Title frame={frame} />}
      {s >= 4 && s < 17.7 && <S1Embankment frame={frame} />}
      {s >= 17.7 && s < 28.15 && (
        <AbsoluteFill style={whipOn ? whip(whipP) : undefined}>
          <S2Studio frame={frame} />
        </AbsoluteFill>
      )}
      {s >= 28.15 && s < 40.8 && (
        <AbsoluteFill style={whipOn ? whip(whipP) : undefined}>
          <S3Kitchen frame={frame} />
        </AbsoluteFill>
      )}
      {s >= 40.8 && s < 48.0 && <S4Office frame={frame} />}
      {s >= 48.0 && <S5Now frame={frame} />}

      {/* transitions */}
      <BrushWipe p={(s - 3.55) / 0.9} seed={1} />
      <BrushWipe p={(s - 17.25) / 0.9} colors={[P.lime, P.pink, P.autumn]} seed={2} />
      {whipOn && <WhipStreaks p={whipP} />}
      <Slats p={(s - 40.5) / 0.6} />
      {s >= 48.0 && s < 48.6 && <AbsoluteFill style={{background: '#000', opacity: 1 - clamp((s - 48.0) / 0.6)}} />}

      <Vignette strength={s > 40.8 ? 0.55 : 0.42} />
      <Grain frame={frame} amount={s > 48 ? 0.09 : 0.07} />
      <TimelineHUD frame={frame} />
      <Subs frame={frame} />
      {withAudio && <Audio src={staticFile('audio/mix.wav')} />}
    </AbsoluteFill>
  );
};
