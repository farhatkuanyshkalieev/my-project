import React from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import '@fontsource/unbounded/700.css';
import '@fontsource/unbounded/800.css';
import '@fontsource/unbounded/900.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import {Ep01} from './episodes/ep01/Ep01';
import cues from './episodes/ep01/cues.json';
import {Ep02} from './episodes/ep02/Ep02';
import cues2 from './episodes/ep02/cues.json';

const fontHandle = typeof document !== 'undefined' ? delayRender('fonts') : null;
if (typeof document !== 'undefined') {
  Promise.all(
    [
      '900 40px Unbounded',
      '800 40px Unbounded',
      '700 40px Unbounded',
      '900 40px Inter',
      '800 40px Inter',
      '700 40px "JetBrains Mono"',
      '500 40px "JetBrains Mono"',
    ].map((f) => document.fonts.load(f, 'АБВ abc $0'))
  ).then(() => fontHandle !== null && continueRender(fontHandle));
}

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ep1" component={Ep01} durationInFrames={cues.duration * cues.fps} fps={cues.fps} width={1080} height={1920} />
    <Composition id="Ep2" component={Ep02} durationInFrames={cues2.duration * cues2.fps} fps={cues2.fps} width={1080} height={1920} />
  </>
);
