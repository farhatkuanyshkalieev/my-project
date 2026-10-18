import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../../lib/theme';
import {Scene} from '../../components/Scene';
import {Captions, Word} from '../../components/Captions';
import {HUD} from '../../components/HUD';
import {Flash, GlitchBars, Grain} from '../../components/FX';
import {MotelScene, RichScene} from './scenes/Opening';
import {TitleScene, WeightScene, StairsScene} from './scenes/ProblemOne';
import {SerialScene, RegisterScene} from './scenes/ProblemTwo';
import {NervesScene, DoorScene, EndScene} from './scenes/Finale';
import cues from './cues.json';
import words from '../../../public/ep01/words.json';

const S = cues.scenes as unknown as Record<string, [number, number]>;
const B = cues.beats;

const HIGHLIGHT = [
  'десять', 'миллионов', 'долларов', 'наличкой', 'четырёх', 'хуже', 'вес', 'сто', 'тысяч', 'килограммов',
  'номера', 'меченые', 'деньги', 'ищут', 'сам', 'сирены', 'стук', 'дверь', 'второй',
];

export const Ep01: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / cues.fps;
  return (
    <AbsoluteFill style={{background: C.night}}>
      <Audio src={staticFile('ep01/mix.wav')} />

      <Scene t={t} range={S.motel} exit="whipLeft" outDur={0.2}>
        {() => <MotelScene t={t} />}
      </Scene>
      <Scene t={t} range={S.rich} enter="whipLeft" inDur={0.22}>
        {() => <RichScene t={t} />}
      </Scene>
      <Scene t={t} range={S.title} exit="cut">
        {() => <TitleScene t={t} />}
      </Scene>
      <Scene t={t} range={S.weight} enter="iris" inDur={0.3} exit="slideUp" outDur={0.3} z={2}>
        {() => <WeightScene t={t} />}
      </Scene>
      <Scene t={t} range={S.stairs} enter="slideUp" inDur={0.3} z={1}>
        {() => <StairsScene t={t} />}
      </Scene>
      <Scene t={t} range={S.serial} exit="zoomOut" outDur={0.25} z={2}>
        {() => <SerialScene t={t} />}
      </Scene>
      <Scene t={t} range={S.register} enter="zoomIn" inDur={0.3} z={1}>
        {() => <RegisterScene t={t} />}
      </Scene>
      <Scene t={t} range={S.nerves}>
        {() => <NervesScene t={t} />}
      </Scene>
      <Scene t={t} range={S.door}>
        {() => <DoorScene t={t} />}
      </Scene>
      <Scene t={t} range={S.end}>
        {() => <EndScene t={t} />}
      </Scene>

      <AbsoluteFill style={{zIndex: 10}}>
      <HUD t={t} visible={[S.weight[0] + 0.2, S.door[1]]} suspicion={cues.suspicion} day="ДЕНЬ 1" />
      <Captions
        t={t}
        words={words as Word[]}
        offset={cues.voOffset}
        highlight={HIGHLIGHT}
        hidden={(tt) => tt >= S.title[0] && tt < S.title[1] - 0.6}
      />

      {/* transition accents */}
      <Flash t={t} at={0} max={0.8} dur={0.3} />
      <Flash t={t} at={S.rich[0] + 0.05} color={C.magenta} max={0.5} />
      <Flash t={t} at={B.worse} max={1} dur={0.3} />
      <GlitchBars t={t} at={B.worse} dur={0.35} />
      <GlitchBars t={t} at={B.freeze - 0.03} dur={0.15} />
      <GlitchBars t={t} at={S.serial[0]} dur={0.3} />
      <Flash t={t} at={B.marked} color={C.red} max={0.45} />
      <Flash t={t} at={B.hunted} color={C.red} max={0.7} dur={0.3} />
      <Flash t={t} at={S.nerves[0]} color={C.red} max={0.6} dur={0.35} />
      <Flash t={t} at={B.cut} max={0.5} dur={0.2} />
      <GlitchBars t={t} at={B.out} dur={0.45} />
      <Grain t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
