import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import { Shots } from "./Shots";
import { Captions } from "./Captions";
import { Titles } from "./Titles";
import { DURATION_S, sec } from "./theme";

// Звуковые эффекты: [время склейки, файл, пик внутри файла, громкость]
const SFX: [number, string, number, number][] = [
  [0.35, "long_woosh.wav", 1.08, 0.3],
  [2.1, "whoosh_fast_airy.wav", 0.26, 0.45],
  [3.9, "whoosh.wav", 0.25, 0.4],
  [7.0, "riser_metallic.mp3", 1.67, 0.35],
  [7.0, "whoosh_slow_thick.wav", 0.46, 0.6],
  [8.85, "page_turn1.wav", 0.84, 0.75],
  [11.8, "page_turn4.wav", 0.18, 0.75],
  [13.9, "fast_swoosh.mp3", 0.15, 0.3],
  [17.25, "whoosh_fast_airy.wav", 0.26, 0.45],
  [21.3, "standard_swoosh.wav", 0.42, 0.45],
  [22.3, "fast_swoosh.mp3", 0.15, 0.3],
  [24.55, "whoosh.wav", 0.25, 0.4],
  [28.9, "whoosh4.wav", 0.42, 0.5],
  [33.1, "whoosh_slow_thick.wav", 0.46, 0.5],
  [36.2, "whoosh_fast_airy.wav", 0.26, 0.5],
  [37.0, "whoosh_fast_airy.wav", 0.26, 0.45],
  [37.6, "whoosh_fast_airy.wav", 0.26, 0.5],
  [39.1, "standard_swoosh.wav", 0.42, 0.35],
  [42.1, "riser_R2.mp3", 5.17, 0.28],
  [42.1, "whoosh_slow_thick.wav", 0.46, 0.65],
  [43.25, "standard_swoosh.wav", 0.42, 0.4],
  [48.3, "long_woosh.wav", 1.08, 0.45],
  [51.5, "whoosh_fast_airy.wav", 0.26, 0.45],
  [53.6, "whoosh4.wav", 0.42, 0.45],
];

const VO_END = 55.05;

const Music: React.FC = () => {
  const total = sec(DURATION_S);
  return (
    <Audio
      src={staticFile("sfx/music_kaan_sunrise.mp3")}
      volume={(f) =>
        interpolate(
          f,
          [0, 20, sec(VO_END) - 10, sec(VO_END) + 10, total - 45, total],
          [0, 0.17, 0.17, 0.42, 0.42, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};

// Кинематографичная виньетка + тёплый тон, чтобы разные клипы смотрелись единым роликом
const Grade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse 85% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)",
      pointerEvents: "none",
    }}
  >
    <AbsoluteFill style={{ background: "rgba(255,190,110,0.045)", mixBlendMode: "soft-light" }} />
    {/* затемнение снизу под субтитры */}
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, transparent 52%, rgba(0,0,0,0.32) 66%, rgba(0,0,0,0.38) 74%, transparent 86%)",
      }}
    />
  </AbsoluteFill>
);

// Короткая вспышка на ключевых моментах
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const s = sec(at);
  const o = interpolate(f, [s - 1, s, s + 6], [0, 0.32, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ background: "#FFF3DA", opacity: o }} />;
};

const FadeOut: React.FC = () => {
  const f = useCurrentFrame();
  const total = sec(DURATION_S);
  return (
    <AbsoluteFill
      style={{
        background: "black",
        opacity: interpolate(f, [total - 24, total], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    />
  );
};

export const MuseumReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Shots />
      <Grade />
      <Flash at={7.0} />
      <Flash at={42.1} />
      <Flash at={48.3} />
      <Titles />
      <Captions />
      <FadeOut />

      <Sequence name="Озвучка" layout="none">
        <Audio src={staticFile("audio/vo.wav")} />
      </Sequence>
      <Sequence name="Музыка" layout="none">
        <Music />
      </Sequence>
      {SFX.map(([t, file, peak, vol], i) => {
        const from = Math.max(0, sec(t - peak));
        return (
          <Sequence key={i} name={`sfx · ${file}`} from={from} layout="none">
            <Audio src={staticFile(`sfx/${file}`)} volume={vol} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
