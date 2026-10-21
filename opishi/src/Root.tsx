import React from 'react';
import {Composition, Still} from 'remotion';
import {Main} from './Main';
import {RigTest} from './sheets/RigTest';
import {Card} from './sheets/Card';
import {TOTAL} from './lib/timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} defaultProps={{withAudio: false}} durationInFrames={TOTAL} fps={60} width={1080} height={1920} />
    <Still id="CardMira" component={Card} width={1080} height={1920} defaultProps={{who: 'mira' as const}} />
    <Still id="CardTimur" component={Card} width={1080} height={1920} defaultProps={{who: 'timur' as const}} />
    <Composition id="RigTest" component={RigTest} durationInFrames={60} fps={60} width={1080} height={1920} />
  </>
);
