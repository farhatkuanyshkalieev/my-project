import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import captions from "./captions.json";
import { GOLD, IVORY, SANS, sec } from "./theme";

type Word = { t: string; s: number; e: number; hl: boolean };
type Chunk = { hidden: boolean; start: number; end: number; words: Word[] };

const ChunkView: React.FC<{ chunk: Chunk; startF: number; endF: number }> = ({
  chunk,
  startF,
  endF,
}) => {
  const frame = useCurrentFrame(); // локальный кадр внутри Sequence
  const len = endF - startF;
  const out = interpolate(frame, [len - 4, len], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 1210,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: 18,
        rowGap: 4,
        opacity: out,
      }}
    >
      {chunk.words.map((w, i) => {
        // каждое слово появляется в момент, когда его произносят
        const wf = Math.max(0, sec(w.s) - startF - 2);
        const p = interpolate(frame, [wf, wf + 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const speaking = frame >= wf && frame < sec(w.e) - startF + 2;
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 70,
              lineHeight: 1.12,
              letterSpacing: -0.5,
              color: w.hl ? GOLD : IVORY,
              opacity: p,
              translate: `0px ${(1 - p) * 26}px`,
              scale: String(0.9 + p * 0.1 + (speaking && w.hl ? 0.04 : 0)),
              textShadow:
                "0 2px 2px rgba(0,0,0,0.7), 0 4px 24px rgba(0,0,0,0.65)",
              WebkitTextStroke: "1.5px rgba(0,0,0,0.25)",
            }}
          >
            {w.t}
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
        const startF = sec(c.start) - 2;
        // держим фразу до начала следующей (но не дольше +0.6с), чтобы не мигало
        const next = list[i + 1];
        const endF = Math.min(
          next ? sec(next.start) - 2 : sec(c.end + 0.6),
          sec(c.end + 0.6),
        );
        return (
          <Sequence
            key={i}
            name={`cap · ${c.words.map((w) => w.t).join(" ")}`}
            from={startF}
            durationInFrames={Math.max(6, endF - startF)}
            layout="none"
          >
            <ChunkView chunk={c} startF={startF} endF={endF} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
