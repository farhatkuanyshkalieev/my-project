import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import { EditTrack } from "./Edit";
import { Captions } from "./Captions";
import { DISPLAY, DURATION_S, VO_END, WHITE, sec } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

// Оранжево-жёлтые засветки на переходах (как в референсе)
const LEAKS = [18.593, 25.789, 32.625, 35.144, 38.022, 45.578];

const LightLeak: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const s = sec(at);
  const o = interpolate(f, [s - 3, s, s + 9], [0, 0.85, 0], clamp);
  if (o <= 0) return null;
  const x = interpolate(f, [s - 3, s + 9], [-30, 130], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        mixBlendMode: "screen",
        background: `radial-gradient(ellipse 70% 55% at ${x}% 40%, rgba(255,214,60,0.95) 0%, rgba(255,122,26,0.75) 35%, rgba(255,80,0,0) 70%),
          radial-gradient(ellipse 50% 70% at ${100 - x}% 75%, rgba(255,150,40,0.7) 0%, rgba(255,90,0,0) 65%)`,
      }}
    />
  );
};

// «медицину / математику / астрономию» — крупные белые слова поверх кадров
const BIG_WORDS: [string, number, number][] = [
  ["медицину", 32.625, 33.345],
  ["математику", 33.345, 34.24],
  ["астрономию", 34.24, 35.144],
];

const BigWord: React.FC<{ word: string; len: number }> = ({ word, len }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 5], [0, 1], { ...clamp, easing: ease });
  const o = interpolate(f, [len - 2, len], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 118,
          color: WHITE,
          WebkitTextStroke: `4px ${WHITE}`,
          opacity: Math.min(p, o),
          scale: String(1.3 - 0.3 * p),
          textShadow: "0 4px 30px rgba(0,0,0,0.55)",
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

// Тряска камеры на вступлении бита
const Shake: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const hits = [6.0, 18.593, 38.022];
  let dx = 0;
  let dy = 0;
  for (const h of hits) {
    const k = f - sec(h);
    if (k >= 0 && k < 9) {
      const a = (1 - k / 9) * 14;
      dx += Math.sin(k * 2.7) * a;
      dy += Math.cos(k * 3.3) * a;
    }
  }
  return <AbsoluteFill style={{ translate: `${dx}px ${dy}px`, scale: dx || dy ? "1.03" : "1" }}>{children}</AbsoluteFill>;
};

// Звуки: [момент, файл, пик внутри файла, громкость]
const SFX: [number, string, number, number][] = [
  [6.0, "riser_R2.mp3", 5.17, 0.22],
  [6.0, "whoosh_slow_thick.wav", 0.46, 0.6],
  [7.8, "whoosh_fast_airy.wav", 0.26, 0.4],
  [9.238, "page_turn1.wav", 0.84, 0.75],
  [12.117, "page_turn4.wav", 0.18, 0.75],
  [18.593, "whoosh4.wav", 0.42, 0.55],
  [20.032, "standard_swoosh.wav", 0.42, 0.5],
  [25.789, "fast_swoosh.mp3", 0.15, 0.35],
  [32.625, "whoosh_fast_airy.wav", 0.26, 0.55],
  [33.345, "whoosh_fast_airy.wav", 0.26, 0.5],
  [34.24, "whoosh_fast_airy.wav", 0.26, 0.55],
  [35.144, "whoosh_slow_thick.wav", 0.46, 0.45],
  [38.022, "whoosh4.wav", 0.42, 0.55],
  [40.181, "standard_swoosh.wav", 0.42, 0.5],
  [45.578, "long_woosh.wav", 1.08, 0.45],
];

const FadeOut: React.FC = () => {
  const f = useCurrentFrame();
  const total = sec(DURATION_S);
  return (
    <AbsoluteFill
      style={{ background: "black", opacity: interpolate(f, [total - 20, total], [0, 1], clamp) }}
    />
  );
};

export const MuseumReel: React.FC = () => {
  const total = sec(DURATION_S);
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Shake>
        <EditTrack />
      </Shake>
      {LEAKS.map((t) => (
        <LightLeak key={t} at={t} />
      ))}
      {BIG_WORDS.map(([w, a, b]) => (
        <Sequence key={w} name={`word · ${w}`} from={sec(a)} durationInFrames={sec(b) - sec(a)}>
          <BigWord word={w} len={sec(b) - sec(a)} />
        </Sequence>
      ))}
      <Captions />
      <FadeOut />

      <Sequence name="Озвучка" layout="none">
        <Audio src={staticFile("audio/vo.wav")} />
      </Sequence>
      <Sequence name="Музыка" layout="none">
        <Audio
          src={staticFile("audio/music.wav")}
          volume={(f) =>
            interpolate(f, [0, sec(VO_END) - 4, sec(VO_END) + 8, total], [0.17, 0.17, 0.55, 0.55], clamp)
          }
        />
      </Sequence>
      {SFX.map(([t, file, peak, vol], i) => (
        <Sequence key={i} name={`sfx · ${file}`} from={Math.max(0, sec(t - peak))} layout="none">
          <Audio src={staticFile(`sfx/${file}`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
