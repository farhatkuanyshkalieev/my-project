import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, easeBack, easeInOut, easeOut, fonts, ip } from "../theme";

// Masked line reveal: text slides up from behind an invisible edge.
export const Line: React.FC<{ at: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  dur = 10,
  style,
  children,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ overflow: "hidden", padding: "0 0.12em 0.14em", margin: "0 -0.12em -0.14em" }}>
      <div style={{ translate: `0px ${ip(f, [at, at + dur], [115, 0], easeOut)}%`, ...style }}>{children}</div>
    </div>
  );
};

// Kinetic headline: every letter pops up with a little overshoot, staggered.
export const PopWord: React.FC<{ text: string; at: number; size: number; color: string; stagger?: number; style?: React.CSSProperties }> = ({
  text,
  at,
  size,
  color,
  stagger = 1.5,
  style,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: size, lineHeight: 0.95, color, whiteSpace: "nowrap", ...style }}>
      {text.split("").map((ch, i) => {
        const s = at + i * stagger;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              scale: String(ip(f, [s, s + 9], [0, 1], easeBack)),
              translate: `0px ${ip(f, [s, s + 9], [45, 0], easeOut)}%`,
              rotate: `${ip(f, [s, s + 9], [i % 2 ? 14 : -14, 0], easeOut)}deg`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// Fit an Unbounded uppercase word into the 900px text column.
export const fitSize = (word: string, max = 190) => Math.min(max, 900 / (word.length * 1.15));

type Enter = "none" | "up" | "right" | "left" | "circle";

// Full-bleed colour field. Enters with a wipe/iris on the cut plus a punch-in zoom,
// then drifts slowly so the frame is never static.
export const SceneFrame: React.FC<{ bg: string; enter?: Enter; origin?: [number, number]; children: React.ReactNode }> = ({
  bg,
  enter = "up",
  origin = [540, 960],
  children,
}) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = enter === "none" ? 1 : ip(f, [0, 9], [0, 1], easeInOut);
  const clip =
    enter === "up"
      ? `inset(${(1 - p) * 100}% 0 0 0)`
      : enter === "right"
        ? `inset(0 0 0 ${(1 - p) * 100}%)`
        : enter === "left"
          ? `inset(0 ${(1 - p) * 100}% 0 0)`
          : enter === "circle"
            ? `circle(${p * 2300}px at ${origin[0]}px ${origin[1]}px)`
            : "none";
  const punch = enter === "none" ? 1 : ip(f, [0, 12], [1.12, 1], easeOut);
  const drift = ip(f, [0, durationInFrames], [1, 1.05], (t) => t);
  return (
    <AbsoluteFill style={{ backgroundColor: bg, clipPath: clip, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(punch * drift) }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Giant tonal text scrolling across the background (two rows, opposite directions).
export const Marquee: React.FC<{ text: string; color: string; y?: number; size?: number }> = ({ text, color, y = 780, size = 280 }) => {
  const f = useCurrentFrame();
  const row = (dir: number, top: number) => (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        whiteSpace: "nowrap",
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1,
        color,
        translate: `${dir > 0 ? -1400 + f * 9 : -f * 9}px 0px`,
      }}
    >
      {`${text} · `.repeat(6)}
    </div>
  );
  return (
    <>
      {row(1, y)}
      {row(-1, y + size * 1.05)}
    </>
  );
};

// Stories-style progress: which of the 5 senses we're on.
export const Progress: React.FC<{ index: number; color: string }> = ({ index, color }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 140, left: 90, right: 90, display: "flex", gap: 12 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: color, opacity: 0.25, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 4,
              background: color,
              width: `${i < index ? 100 : i === index ? ip(f, [0, durationInFrames], [0, 100], (t) => t) : 0}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Caption that appears word by word, Reels-subtitle style. *word* (or *two_words*) gets a highlight pill.
export const Caption: React.FC<{ text: string; at: number; color: string; hiBg: string; hiFg: string }> = ({ text, at, color, hiBg, hiFg }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 40, lineHeight: 1.5, color, display: "flex", flexWrap: "wrap", columnGap: 14, rowGap: 4 }}>
      {text.split(" ").map((w, i) => {
        const hi = w.startsWith("*");
        const s = at + i * 2.5;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: f >= s ? 1 : 0,
              scale: String(ip(f, [s, s + 6], [0.6, 1], easeBack)),
              ...(hi ? { background: hiBg, color: hiFg, padding: "0 16px", borderRadius: 12, fontWeight: 700 } : {}),
            }}
          >
            {w.replace(/\*/g, "").replace(/_/g, " ")}
          </span>
        );
      })}
    </div>
  );
};

// Shared title block for a sense scene.
export const SenseTitle: React.FC<{
  label: string;
  word: string;
  caption: string;
  fg: string;
  accent: string;
  hiFg: string;
  at?: number;
}> = ({ label, word, caption, fg, accent, hiFg, at = 3 }) => (
  <>
    <div style={{ position: "absolute", left: 90, top: 210 }}>
      <Line at={at}>
        <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 54, color: accent }}>{label}</div>
      </Line>
      <div style={{ height: 10 }} />
      <PopWord text={word} at={at + 3} size={fitSize(word)} color={fg} />
    </div>
    <div style={{ position: "absolute", left: 90, right: 90, top: 1430 }}>
      <Caption text={caption} at={at + 14} color={fg} hiBg={accent} hiFg={hiFg} />
    </div>
  </>
);

export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.07, mixBlendMode: "multiply" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 10} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export { colors };
