import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Address, Cta, Intro, Offer, Services, Surgery} from './scenes';
import timeline from './timeline.json';

const S = timeline.scenes;

const scenes: [keyof typeof S, React.FC][] = [
  ['intro', Intro],
  ['services', Services],
  ['surgery', Surgery],
  ['offer', Offer],
  ['address', Address],
  ['cta', Cta],
];

export const AtlantisAd: React.FC = () => (
  <AbsoluteFill style={{background: '#0C0809'}}>
    {scenes.map(([key, Scene]) => (
      <Sequence key={key} from={S[key][0]} durationInFrames={S[key][1] - S[key][0]} name={key}>
        <Scene />
      </Sequence>
    ))}
    {/* Voice, music bed and SFX are pre-mixed by scripts/mix_audio.py from the same timeline. */}
    <Audio src={staticFile('audio/soundtrack.wav')} />
  </AbsoluteFill>
);
