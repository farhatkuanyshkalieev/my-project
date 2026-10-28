import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Cta, Doctors, Experience, Intro, Patients, Promo, Services} from './scenes';
import timeline from './timeline.json';

const S = timeline.scenes;

const scenes: [keyof typeof S, React.FC][] = [
  ['intro', Intro],
  ['services', Services],
  ['doctors', Doctors],
  ['patients', Patients],
  ['experience', Experience],
  ['promo', Promo],
  ['cta', Cta],
];

export const DentLineAd: React.FC = () => (
  <AbsoluteFill style={{background: '#050F26'}}>
    {scenes.map(([key, Scene]) => (
      <Sequence key={key} from={S[key][0]} durationInFrames={S[key][1] - S[key][0]} name={key}>
        <Scene />
      </Sequence>
    ))}
    {/* Voice, music bed and SFX are pre-mixed by scripts/mix_audio.py from the same timeline. */}
    <Audio src={staticFile('audio/soundtrack.wav')} />
  </AbsoluteFill>
);
