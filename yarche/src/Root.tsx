import React from 'react';
import {Composition, Still} from 'remotion';
import {Main} from './Main';
import {TOTAL} from './lib/timeline';
import {CharacterSheet} from './sheets/CharacterSheet';
import {StyleBible} from './sheets/StyleBible';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TOTAL} fps={60} width={1920} height={1080} />
    <Still id="CardLisa" component={CharacterSheet} width={1920} height={1080} defaultProps={{who: 'lisa' as const}} />
    <Still id="CardMark" component={CharacterSheet} width={1920} height={1080} defaultProps={{who: 'mark' as const}} />
    <Still id="StyleBible" component={StyleBible} width={1920} height={1080} />
  </>
);
