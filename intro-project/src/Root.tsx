import React from 'react';
import {Composition} from 'remotion';
import {Intro, DURATION} from './Intro';
export const Root: React.FC = () => (
  <Composition id="Intro" component={Intro} durationInFrames={DURATION} fps={60} width={1920} height={1080} />
);
