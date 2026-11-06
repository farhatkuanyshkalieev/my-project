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
import edit from "./edit.json";
import { DISPLAY, ORANGE, WHITE, sec } from "./theme";

export type Shot = {
  id: string;
  kind: "clip" | "photo" | "card";
  name: string;
  start: number;
  end: number;
  card: string | null;
  src: string;
  media: "video" | "image";
};

export const SHOTS = edit as Shot[];

// Текст на карточках-вставках (как «историческая легенда / с 1888 года» в референсе).
// at — секунда озвучки, когда строка появляется.
type Line = { text: string; color: string; size: number; at: number };
export const CARD_TEXT: Record<string, Line[]> = {
  A: [
    { text: "коран", color: ORANGE, size: 92, at: 6.5 },
    { text: "усмана", color: WHITE, size: 128, at: 6.9 },
  ],
  B: [{ text: "VII век", color: ORANGE, size: 150, at: 9.4 }],
  C: [
    { text: "больше", color: WHITE, size: 80, at: 12.0 },
    { text: "1000 лет", color: ORANGE, size: 140, at: 12.33 },
  ],
  D: [
    { text: "3000+", color: ORANGE, size: 170, at: 19.9 },
    { text: "артефактов", color: WHITE, size: 92, at: 20.6 },
  ],
  E: [
    { text: "открылся", color: WHITE, size: 80, at: 38.11 },
    { text: "в 2026", color: ORANGE, size: 150, at: 38.28 },
  ],
  F: [
    { text: "книга рекордов", color: ORANGE, size: 84, at: 40.3 },
    { text: "гиннесса", color: WHITE, size: 128, at: 40.92 },
  ],
  G: [{ text: "ташкент", color: ORANGE, size: 150, at: 45.76 }],
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Media: React.FC<{ shot: Shot; style: React.CSSProperties }> = ({ shot, style }) =>
  shot.media === "video" ? (
    <Video src={staticFile(shot.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
  ) : (
    <Img src={staticFile(shot.src)} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
  );

// Полноэкранный кадр: зум-удар на склейке + медленный наезд/отъезд
const FullShot: React.FC<{ shot: Shot; index: number }> = ({ shot, index }) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const punch = interpolate(f, [0, 5], [1.1, 1], { ...clamp, easing: ease });
  const drift =
    shot.kind === "photo"
      ? interpolate(f, [0, dur], index % 2 ? [1.0, 1.12] : [1.14, 1.02], clamp)
      : interpolate(f, [0, dur], [1.0, 1.05], clamp);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Media shot={shot} style={{ scale: String(punch * drift) }} />
    </AbsoluteFill>
  );
};

// Карточка-вставка: чёрный фон, медиа со скруглёнными углами, крупная надпись
const CardShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const p = interpolate(f, [0, 7], [0, 1], { ...clamp, easing: ease });
  const lines = CARD_TEXT[shot.card ?? ""] ?? [];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 250,
          height: 900,
          borderRadius: 56,
          overflow: "hidden",
          scale: String(0.9 + 0.1 * p),
          translate: `0px ${(1 - p) * 60}px`,
          opacity: p,
        }}
      >
        {/* исходники 9:16 — вписываем «cover» в квадратную карточку вручную */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 900,
            height: 1600,
            top: -350,
            scale: String(interpolate(f, [0, dur], [1.0, 1.08], clamp)),
          }}
        >
          <Media shot={shot} style={{}} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 1190,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {lines.map((l, i) => {
          const at = Math.max(2, sec(l.at - shot.start));
          const q = interpolate(f, [at - 2, at + 4], [0, 1], { ...clamp, easing: ease });
          return (
            <div
              key={i}
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: l.size,
                lineHeight: 1.08,
                color: l.color,
                WebkitTextStroke: `${Math.round(l.size / 30)}px ${l.color}`,
                opacity: q,
                scale: String(0.85 + 0.15 * q),
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const EditTrack: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    {SHOTS.map((s, i) => (
      <Sequence
        key={s.id}
        name={`${s.id} · ${s.kind} · ${s.name}`}
        from={sec(s.start)}
        durationInFrames={sec(s.end) - sec(s.start)}
        premountFor={30}
      >
        {s.kind === "card" ? <CardShot shot={s} /> : <FullShot shot={s} index={i} />}
      </Sequence>
    ))}
  </AbsoluteFill>
);
