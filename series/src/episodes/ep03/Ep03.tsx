import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../../lib/theme';
import {Scene} from '../../components/Scene';
import {Captions, Word} from '../../components/Captions';
import {HUD} from '../../components/HUD';
import {Flash, GlitchBars, Vignette} from '../../components/FX';
import {ChoiceSplit} from '../../components/ChoiceSplit';
import {NextEpisode} from '../../components/NextEpisode';
import {ChoiceRecap, DawnScene, PhoneRecap, SpreeScene} from './scenes/Part1';
import {AccountScene, ForestScene, RuleScene, ShareChoiceLabels, ThreadScene} from './scenes/Part2';
import cues from './cues.json';
import words from '../../../public/ep03/words.json';

const S = cues.scenes as unknown as Record<string, [number, number]>;
const B = cues.beats;

const HIGHLIGHT = [
  'пятьдесят', 'тысяч', 'утра', 'платить', 'бежать', 'другое', 'администратор', 'гена', 'конверт', 'широко',
  'золотая', 'цепь', 'диски', 'ресторан', 'наличкой', 'десяти', 'покупателе', 'аналитик', 'тысяча', 'девятьсот',
  'двадцать', 'три', 'тысячи', 'ниточка', 'ты', 'лесу', 'фары', 'пополам', 'делиться', 'отказать', 'комментариях',
];

export const Ep03: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / cues.fps;
  return (
    <AbsoluteFill style={{background: C.night}}>
      <Audio src={staticFile('ep03/mix.wav')} />

      <Scene t={t} range={S.phone}>{() => <PhoneRecap t={t} />}</Scene>
      <Scene t={t} range={S.choice1}>{() => <ChoiceRecap t={t} />}</Scene>
      <Scene t={t} range={S.dawn} enter="fade" inDur={0.25}>{() => <DawnScene t={t} />}</Scene>
      <Scene t={t} range={S.spree} enter="whipLeft" inDur={0.22}>{() => <SpreeScene t={t} />}</Scene>
      <Scene t={t} range={S.rule} enter="iris" inDur={0.3}>{() => <RuleScene t={t} />}</Scene>
      <Scene t={t} range={S.account} enter="whipUp" inDur={0.28}>{() => <AccountScene t={t} />}</Scene>
      <Scene t={t} range={S.thread} enter="zoomIn" inDur={0.3}>{() => <ThreadScene t={t} />}</Scene>
      <Scene t={t} range={S.forest} enter="fade" inDur={0.3}>{() => <ForestScene t={t} />}</Scene>
      <Scene t={t} range={S.choice2}>
        {() => (
          <ChoiceSplit
            t={t}
            left={{...ShareChoiceLabels.left, at: B.share}}
            right={{...ShareChoiceLabels.right, at: B.refuse}}
            commentsAt={B.comments}
          />
        )}
      </Scene>
      <Scene t={t} range={S.end}>
        {() => (
          <NextEpisode
            t={t}
            start={S.end[0]}
            episode={4}
            epAt={B.ep4}
            question="ДЕЛИТЬСЯ ИЛИ ОТКАЗАТЬ?"
            followAt={B.follow}
            outAt={B.out}
            tease={{at: B.tease, from: 'Гена', text: 'Ну что, партнёр? 🙂'}}
          />
        )}
      </Scene>

      <AbsoluteFill style={{zIndex: 10}}>
        <HUD
          t={t}
          visible={[0.3, S.choice2[0]]}
          suspicion={cues.suspicion}
          cash={cues.cash}
          day={t < B.twoDays ? 'ДЕНЬ 2' : 'ДЕНЬ 4'}
          clockStart={5 * 60 + 46}
          hideRanges={[S.choice1]}
        />
        <Captions t={t} words={words as Word[]} offset={cues.voOffset} highlight={HIGHLIGHT} />

        <Flash t={t} at={S.choice1[0]} max={0.5} dur={0.2} />
        <Flash t={t} at={B.bothStamp} color={C.magenta} max={0.5} />
        <Flash t={t} at={B.reveal} max={0.7} dur={0.3} />
        <Flash t={t} at={B.allCash} color={C.red} max={0.4} />
        <GlitchBars t={t} at={S.rule[0]} dur={0.25} />
        <Flash t={t} at={B.buyer} color={C.red} max={0.35} />
        <Flash t={t} at={B.spentNum + 0.6} color={C.red} max={0.4} />
        <Flash t={t} at={B.t3} color={C.red} max={0.6} dur={0.3} />
        <Flash t={t} at={B.headlights} color="#fff6d0" max={0.9} dur={0.4} />
        <Flash t={t} at={B.share} max={0.6} dur={0.2} />
        <Flash t={t} at={B.refuse} color={C.magenta} max={0.6} dur={0.2} />
        <Flash t={t} at={B.ep4} max={0.5} dur={0.25} />
        <GlitchBars t={t} at={B.out} dur={0.45} />
        <Vignette />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
