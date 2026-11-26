import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import T from './timeline.json';

export const Root: React.FC = () => (
  <Composition id="Saved" component={Video} durationInFrames={T.total} fps={T.fps} width={1920} height={1080} />
);
