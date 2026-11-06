import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import captions from "./captions.json";
import { SHOTS } from "./Edit";
import { SANS, YELLOW, sec } from "./theme";

type Word = { t: string; s: number; e: number; hl: boolean };
type Chunk = { hidden: boolean; start: number; end: number; words: Word[] };

// Субтитры прячем, пока на экране карточка-вставка или крупные слова
const hiddenRanges: [number, number][] = [
  ...SHOTS.filter((s) => s.kind === "card").map((s) => [s.start, s.end] as [number, number]),
];

const isHidden = (t: number) => hiddenRanges.some(([a, b]) => t >= a - 0.05 && t < b);

const ChunkView: React.FC<{ chunk: Chunk; startF: number }> = ({ chunk, startF }) => {
  const frame = useCurrentFrame();
  const absT = (startF + frame) / 30;
  if (isHidden(absT)) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        right: 110,
        top: 1010,
        textAlign: "center",
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 60,
        lineHeight: 1.18,
        color: YELLOW,
        textShadow:
          "0 0 2px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.75), 0 0 16px rgba(0,0,0,0.35)",
      }}
    >
      {chunk.words.map((w, i) => {
        const wf = sec(w.s) - startF - 1;
        const o = interpolate(frame, [wf, wf + 2], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span key={i} style={{ opacity: o }}>
            {w.t.toLowerCase()}
            {i < chunk.words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC = () => {
  const list = captions as Chunk[];
  return (
    <AbsoluteFill>
      {list.map((c, i) => {
        if (c.hidden) return null;
        const startF = sec(c.start) - 1;
        const next = list[i + 1];
        const endF = Math.min(next ? sec(next.start) - 1 : sec(c.end + 0.5), sec(c.end + 0.5));
        return (
          <Sequence
            key={i}
            name={`cap · ${c.words.map((w) => w.t).join(" ")}`}
            from={startF}
            durationInFrames={Math.max(4, endF - startF)}
            layout="none"
          >
            <ChunkView chunk={c} startF={startF} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
