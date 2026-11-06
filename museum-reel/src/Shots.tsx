import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import shots from "./shots.json";
import { sec } from "./theme";

type Shot = { id: string; name: string; start: number; end: number };

// Шоты, которые входят «панчем» (резкий зум + блюр) — смена смыслового блока
const PUNCH = new Set([
  "s02", "s05", "s07", "s09", "s11", "s13", "s16", "s19",
  "s21", "s22", "s23", "p25", "p26", "s27", "p29", "s30", "p31",
]);

// Ken Burns для фото: [scaleFrom, scaleTo, yFrom%, yTo%]
const PHOTO_MOVE: Record<string, [number, number, number, number]> = {
  p25: [1.0, 1.12, 0, -2],
  p26: [1.04, 1.16, 0, 2],
  p29: [1.18, 1.02, -2, 0],
  p31: [1.28, 1.0, 3, 0],
};

const ShotLayer: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const punch = PUNCH.has(shot.id);
  const isPhoto = shot.id.startsWith("p");

  const entry = punch
    ? interpolate(frame, [0, 8], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
    : 0;

  if (isPhoto) {
    const [a, b, y0, y1] = PHOTO_MOVE[shot.id] ?? [1, 1.1, 0, 0];
    const t = interpolate(frame, [0, dur], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 0, 0.67, 1),
    });
    return (
      <AbsoluteFill style={{ overflow: "hidden", filter: `blur(${entry * 14}px)` }}>
        <Img
          src={staticFile(`photos/${shot.name}.jpg`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: String((a + (b - a) * t) * (1 + entry * 0.18)),
            translate: `0px ${(y0 + (y1 - y0) * t) * 19.2}px`,
          }}
        />
      </AbsoluteFill>
    );
  }

  // Видео: лёгкий постоянный «наезд», чтобы кадр жил
  const push = interpolate(frame, [0, dur], [1.0, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", filter: `blur(${entry * 14}px)` }}>
      <Video
        src={staticFile(`clips/${shot.id}.mp4`)}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: String(push * (1 + entry * 0.18)),
        }}
      />
    </AbsoluteFill>
  );
};

export const Shots: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {(shots as Shot[]).map((s) => (
        <Sequence
          key={s.id}
          name={`${s.id} · ${s.name}`}
          from={sec(s.start)}
          durationInFrames={sec(s.end) - sec(s.start)}
          premountFor={30}
        >
          <ShotLayer shot={s} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
