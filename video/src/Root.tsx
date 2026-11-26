import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import timeline from './timeline.json';
import {Reel} from './reel/Reel';
import reel from './reel/reel.json';

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={timeline.total} fps={30} width={1920} height={1080} />
    <Composition id="Reel" component={Reel} durationInFrames={reel.total} fps={30} width={1920} height={1080} />
  </>
);
