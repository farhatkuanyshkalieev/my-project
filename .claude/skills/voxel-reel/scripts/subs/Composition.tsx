import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Video } from "@remotion/media";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import pages from "../public/pages.json";

const mont = loadMontserrat("normal", { weights: ["900"], subsets: ["cyrillic", "latin"] });
const mono = loadMono("normal", { weights: ["800"], subsets: ["cyrillic", "latin"] });

type Word = { text: string; start: number; end: number };
type Page = { who: "me" | "cl"; line: string; start: number; end: number; words: Word[] };

const ORANGE = "#D97757";
const PEACH = "#FFB070";

const MePage: React.FC<{ page: Page; t: number }> = ({ page, t }) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "0 26px",
        maxWidth: 940,
        padding: "18px 34px",
        borderRadius: 28,
        background: "rgba(8, 8, 12, 0.55)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}
    >
      {page.words.map((w, i) => {
        const active = t >= w.start - 0.033 && t < w.end;
        const done = t >= w.end;
        const u = active ? Math.min(1, (t - (w.start - 0.033)) / 0.12) : 1;
        const pop = active ? 1 + 0.07 * Math.sin(Math.PI * Math.min(1, u)) + 0.05 : 1;
        return (
          <span
            key={i}
            style={{
              fontFamily: mont.fontFamily,
              fontWeight: 900,
              fontSize: 66,
              lineHeight: "88px",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: active ? PEACH : done ? "#FFFFFF" : "rgba(255,255,255,0.5)",
              transform: `scale(${pop}) translateY(${active ? -4 : 0}px)`,
              display: "inline-block",
              textShadow: active
                ? `0 0 28px rgba(255,176,112,0.85), 0 3px 0 #1A1A1E, 0 6px 18px rgba(0,0,0,0.6)`
                : `0 3px 0 #1A1A1E, 0 6px 18px rgba(0,0,0,0.6)`,
              WebkitTextStroke: active ? "1px rgba(255,220,190,0.6)" : "0px transparent",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

const ClaudePage: React.FC<{ page: Page; t: number; frame: number }> = ({ page, t, frame }) => {
  const cursorOn = Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px 18px",
        maxWidth: 940,
        padding: "16px 30px 16px 26px",
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(14,12,18,0.9), rgba(26,18,16,0.86))",
        borderLeft: `10px solid ${ORANGE}`,
        boxShadow: `0 0 0 2px rgba(217,119,87,0.35), 0 0 36px rgba(217,119,87,0.35), 0 12px 40px rgba(0,0,0,0.45)`,
      }}
    >
      <span style={{ fontFamily: mono.fontFamily, fontWeight: 800, fontSize: 48, color: ORANGE, lineHeight: "70px" }}>›</span>
      {page.words.map((w, i) => {
        const active = t >= w.start - 0.033 && t < w.end;
        const done = t >= w.end;
        // robotic: words appear stepwise (no fade) and the active one is a solid orange block
        const visible = t >= w.start - 0.066;
        return (
          <span
            key={i}
            style={{
              fontFamily: mono.fontFamily,
              fontWeight: 800,
              fontSize: 54,
              lineHeight: "70px",
              letterSpacing: 0.5,
              padding: "0 8px",
              borderRadius: 6,
              color: active ? "#120A08" : done ? "#FFD6BE" : "rgba(255,214,190,0.35)",
              background: active ? ORANGE : "transparent",
              opacity: visible ? 1 : 0,
              boxShadow: active ? `0 0 22px rgba(217,119,87,0.9)` : "none",
            }}
          >
            {w.text}
          </span>
        );
      })}
      <span
        style={{
          fontFamily: mono.fontFamily,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: "70px",
          color: ORANGE,
          opacity: cursorOn ? 1 : 0,
          marginLeft: -6,
        }}
      >
        ▌
      </span>
    </div>
  );
};

const PageView: React.FC<{ page: Page }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = page.start + frame / fps; // absolute time (the Sequence starts at page.start)
  const dur = Math.round((page.end - page.start) * fps);
  const inS = page.who === "me"
    ? spring({ frame, fps, config: { damping: 14, stiffness: 240, mass: 0.6 } })
    : Math.min(1, Math.floor(frame / 2) / 2); // stepped entrance for the robot
  const out = interpolate(frame, [dur - 5, dur - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const scale = page.who === "me" ? 0.86 + 0.14 * inS : 1;
  const y = page.who === "me" ? (1 - inS) * 26 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 450 }}>
      <div style={{ transform: `translateY(${y}px) scale(${scale})`, opacity: Math.min(inS, out) }}>
        {page.who === "me" ? <MePage page={page} t={t} /> : <ClaudePage page={page} t={t} frame={frame} />}
      </div>
    </AbsoluteFill>
  );
};

export const Subs: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video src={staticFile("final.mp4")} />
      {(pages as Page[]).map((p, i) => {
        const from = Math.round(p.start * fps);
        const dur = Math.max(2, Math.round((p.end - p.start) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={fps} layout="none">
            <PageView page={p} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
