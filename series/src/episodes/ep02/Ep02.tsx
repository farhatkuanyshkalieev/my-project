import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../../lib/theme';
import {Scene} from '../../components/Scene';
import {Captions, Word} from '../../components/Captions';
import {HUD} from '../../components/HUD';
import {Flash, GlitchBars, Vignette} from '../../components/FX';
import {DoorOpen, Peephole, Relief, Witness} from './scenes/ColdOpen';
import {OptionsScene, OPTION_FAILS, Question, Title} from './scenes/Options';
import {AnalystScene, ChoiceScene, EndScene, PhoneScene} from './scenes/Finale';
import cues from './cues.json';
import words from '../../../public/ep02/words.json';

const S = cues.scenes as unknown as Record<string, [number, number]>;
const B = cues.beats;

const HIGHLIGHT = [
  'глазок', 'полиция', 'администратор', 'сумки', 'посерьёзнее', 'десять', 'миллионов', 'банк', 'десяти', 'тысяч',
  'государству', 'автоматически', 'склад', 'паспорту', 'камеры', 'ячейка', 'снова', 'ты', 'аналитик', 'купюра',
  'мотель', 'кепке', 'загорается', 'пятьдесят', 'утра', 'платить', 'бежать', 'комментариях', 'третья',
];

export const Ep02: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / cues.fps;
  return (
    <AbsoluteFill style={{background: C.night}}>
      <Audio src={staticFile('ep02/mix.wav')} />

      <Scene t={t} range={S.door}>{() => <DoorOpen t={t} />}</Scene>
      <Scene t={t} range={S.peephole}>{() => <Peephole t={t} />}</Scene>
      <Scene t={t} range={S.relief} enter="fade" inDur={0.15}>{() => <Relief t={t} />}</Scene>
      <Scene t={t} range={S.witness} enter="whipLeft" inDur={0.22}>{() => <Witness t={t} />}</Scene>
      <Scene t={t} range={S.title}>{() => <Title t={t} />}</Scene>
      <Scene t={t} range={S.question} enter="iris" inDur={0.3} z={2}>{() => <Question t={t} />}</Scene>
      <Scene t={t} range={S.options}>{() => <OptionsScene t={t} />}</Scene>
      <Scene t={t} range={S.analyst} enter="whipUp" inDur={0.28}>{() => <AnalystScene t={t} />}</Scene>
      <Scene t={t} range={S.phone} enter="fade" inDur={0.2}>{() => <PhoneScene t={t} />}</Scene>
      <Scene t={t} range={S.choice}>{() => <ChoiceScene t={t} />}</Scene>
      <Scene t={t} range={S.end}>{() => <EndScene t={t} />}</Scene>

      <AbsoluteFill style={{zIndex: 10}}>
        <HUD
          t={t}
          visible={[0.3, S.choice[0]]}
          suspicion={cues.suspicion}
          day="ДЕНЬ 1"
          clockStart={4 * 60 + 11}
          hideRanges={[S.title]}
        />
        <Captions t={t} words={words as Word[]} offset={cues.voOffset} highlight={HIGHLIGHT} hidden={(tt) => tt >= S.title[0] && tt < S.title[1] - 0.6} />

        {(B.knocks as number[]).map((k) => (
          <Flash key={k} t={t} at={k} max={0.25} dur={0.15} />
        ))}
        <Flash t={t} at={S.peephole[0]} max={0.9} dur={0.3} />
        <Flash t={t} at={B.admin} color={C.magenta} max={0.35} />
        <Flash t={t} at={B.bagsSeen} color={C.red} max={0.55} dur={0.3} />
        <Flash t={t} at={B.worse} max={1} dur={0.3} />
        <GlitchBars t={t} at={B.worse} dur={0.35} />
        {OPTION_FAILS.map((f) => (
          <Flash key={f} t={t} at={f} color={C.red} max={0.3} dur={0.2} />
        ))}
        <GlitchBars t={t} at={S.analyst[0]} dur={0.25} />
        <Flash t={t} at={B.pin3 + 0.6} color={C.red} max={0.4} />
        <Flash t={t} at={B.phoneOn} color="#6aa0ff" max={0.5} dur={0.35} />
        <Flash t={t} at={B.pay} max={0.6} dur={0.2} />
        <Flash t={t} at={B.run} color={C.magenta} max={0.6} dur={0.2} />
        <Flash t={t} at={B.ep3} max={0.5} dur={0.25} />
        <GlitchBars t={t} at={B.out} dur={0.45} />
        <Vignette />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
