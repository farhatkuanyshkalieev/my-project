import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Background, Grain } from "./components/Background";
import { HookScene } from "./scenes/HookScene";
import { SoundScene } from "./scenes/SoundScene";
import { TouchScene } from "./scenes/TouchScene";
import { ScentScene } from "./scenes/ScentScene";
import { SightScene } from "./scenes/SightScene";
import { CertificateScene } from "./scenes/CertificateScene";
import { CtaScene } from "./scenes/CtaScene";

export const SCENES = [
  { name: "Hook", component: HookScene, durationInFrames: 75 },
  { name: "Sound", component: SoundScene, durationInFrames: 90 },
  { name: "Touch", component: TouchScene, durationInFrames: 90 },
  { name: "Scent", component: ScentScene, durationInFrames: 90 },
  { name: "Sight", component: SightScene, durationInFrames: 90 },
  { name: "Certificate", component: CertificateScene, durationInFrames: 135 },
  { name: "Cta", component: CtaScene, durationInFrames: 105 },
];
export const TRANSITION = 15;
export const TOTAL =
  SCENES.reduce((s, x) => s + x.durationInFrames, 0) - TRANSITION * (SCENES.length - 1);

export const SensesGift: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <TransitionSeries>
      {SCENES.flatMap((s, i) => {
        const C = s.component;
        const seq = (
          <TransitionSeries.Sequence key={s.name} name={s.name} durationInFrames={s.durationInFrames}>
            <C />
          </TransitionSeries.Sequence>
        );
        return i === 0
          ? [seq]
          : [
              <TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />,
              seq,
            ];
      })}
    </TransitionSeries>
    <Grain />
  </AbsoluteFill>
);
