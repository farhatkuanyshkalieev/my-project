import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Grain } from "./components/Kit";
import { HookScene } from "./scenes/HookScene";
import { SoundScene } from "./scenes/SoundScene";
import { TouchScene } from "./scenes/TouchScene";
import { ScentScene } from "./scenes/ScentScene";
import { SightScene } from "./scenes/SightScene";
import { CertificateScene } from "./scenes/CertificateScene";
import { CtaScene } from "./scenes/CtaScene";

// 120 BPM soundtrack: 1 beat = 15 frames, every cut sits on a beat.
export const SCENES = [
  { name: "Hook", component: HookScene, durationInFrames: 60 },
  { name: "Sound", component: SoundScene, durationInFrames: 75 },
  { name: "Touch", component: TouchScene, durationInFrames: 75 },
  { name: "Scent", component: ScentScene, durationInFrames: 75 },
  { name: "Sight", component: SightScene, durationInFrames: 90 },
  { name: "Certificate", component: CertificateScene, durationInFrames: 105 },
  { name: "Cta", component: CtaScene, durationInFrames: 90 },
];
const OVERLAP = 12; // previous scene stays underneath while the next one wipes in
export const TOTAL = SCENES.reduce((s, x) => s + x.durationInFrames, 0);

// Camera "breathes" with the kick drum (every 30 frames while the drums play).
const kickBump = (f: number) => {
  const drums = (f >= 60 && f < 285) || (f >= 405 && f < 540);
  return drums ? 1 + 0.022 * Math.exp(-(f % 30) / 4) : 1;
};

export const SensesGift: React.FC = () => {
  const frame = useCurrentFrame();
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#1F1716" }}>
      <AbsoluteFill style={{ scale: String(kickBump(frame)) }}>
      {SCENES.map((s, i) => {
        const C = s.component;
        const start = from;
        from += s.durationInFrames;
        const last = i === SCENES.length - 1;
        return (
          <Sequence key={s.name} name={s.name} from={start} durationInFrames={s.durationInFrames + (last ? 0 : OVERLAP)}>
            <C />
          </Sequence>
        );
      })}
      </AbsoluteFill>
      <Grain />
      <Audio src={staticFile("audio/music.wav")} volume={1} />
      <Audio src={staticFile("audio/sfx.wav")} volume={1} />
    </AbsoluteFill>
  );
};
