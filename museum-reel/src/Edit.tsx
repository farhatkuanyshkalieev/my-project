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
import { CountFx, GridFx, OldFilmFx, QuranFx } from "./Effects";

export type Shot = {
  id: string;
  kind: "clip" | "photo" | "card" | "fx" | "collage";
  name: string;
  start: number;
  end: number;
  card: string | null;
  fx: string | null;
  parts?: { top: string; mid: string; bottom: string };
  src: string;
  media: "video" | "image";
};

export const SHOTS = edit as Shot[];

// Текст на карточках-вставках (как «историческая легенда / с 1888 года» в референсе).
// at — секунда озвучки, когда строка появляется.
type Line = { text: string; color: string; size: number; at: number };
export const CARD_TEXT: Record<string, Line[]> = {
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

// Коллаж по пожеланию клиентки: сверху и снизу музей (9:16-кадры), посередине её видео
// в исходном горизонтальном формате 16:9. Полосы въезжают с разных сторон.
const CollageShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const dur = sec(shot.end - shot.start);
  const parts = shot.parts!;
  const band = (delay: number, from: number) =>
    interpolate(f, [delay, delay + 7], [from, 0], { ...clamp, easing: ease });
  const push = interpolate(f, [0, dur], [1, 1.06], clamp);
  const rows: { key: keyof typeof parts; top: number; h: number; dx: number }[] = [
    { key: "top", top: 0, h: 654, dx: band(0, -1080) },
    { key: "mid", top: 658, h: 608, dx: band(2, 1080) },
    { key: "bottom", top: 1270, h: 650, dx: band(4, -1080) },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {rows.map((r) => (
        <div key={r.key} style={{ position: "absolute", left: 0, top: r.top, width: 1080, height: r.h, overflow: "hidden", translate: `${r.dx}px 0px` }}>
          <Video
            src={staticFile(parts[r.key])}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(r.key === "mid" ? 1 : push) }}
          />
        </div>
      ))}
    </AbsoluteFill>
  );
};

// Вставки с эффектами; atText — когда звучит ключевое слово
const FxShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  switch (shot.fx) {
    case "quran":
      return <QuranFx shot={shot} atText={6.58} />;
    case "oldfilm":
      return <OldFilmFx shot={shot} atText={9.4} />;
    case "count1000":
      return <CountFx shot={shot} atText={12.33} to={1000} top="больше" bottom="лет" />;
    case "grid":
      return <GridFx shot={shot} atText={20.27} />;
    default:
      return null;
  }
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
        {s.kind === "card" ? (
          <CardShot shot={s} />
        ) : s.kind === "collage" ? (
          <CollageShot shot={s} />
        ) : s.kind === "fx" ? (
          <FxShot shot={s} />
        ) : (
          <FullShot shot={s} index={i} />
        )}
      </Sequence>
    ))}
  </AbsoluteFill>
);
