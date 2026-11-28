import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors, easeInOut, easeOut, fonts, ip } from "../theme";

// Masked line reveal: text slides up from behind an invisible edge (no blur, no fades).
export const Line: React.FC<{ at: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  dur = 14,
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

// Full-bleed colour field that wipes in from the bottom on the cut.
export const SceneFrame: React.FC<{ bg: string; wipe?: boolean; children: React.ReactNode }> = ({
  bg,
  wipe = true,
  children,
}) => {
  const f = useCurrentFrame();
  const p = wipe ? ip(f, [0, 10], [0, 1], easeInOut) : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: bg, clipPath: `inset(${(1 - p) * 100}% 0 0 0)`, overflow: "hidden" }}>
      {children}
    </AbsoluteFill>
  );
};

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

// Editorial title block: small label, huge italic word (top-left), caption at the bottom.
export const SenseTitle: React.FC<{
  label: string;
  word: string;
  caption: string;
  fg: string;
  accent: string;
  at?: number;
}> = ({ label, word, caption, fg, accent, at = 6 }) => (
  <>
    <div style={{ position: "absolute", left: 90, top: 200 }}>
      <Line at={at}>
        <div style={{ fontFamily: fonts.sans, fontSize: 30, letterSpacing: 8, fontWeight: 600, color: accent, textTransform: "uppercase" }}>
          {label}
        </div>
      </Line>
      <div style={{ height: 14 }} />
      <Line at={at + 4} dur={16}>
        <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: word.length > 6 ? 196 : 224, lineHeight: 0.95, color: fg }}>
          {word}
        </div>
      </Line>
    </div>
    <div style={{ position: "absolute", left: 90, right: 90, top: 1440 }}>
      <Line at={at + 18}>
        <div style={{ fontFamily: fonts.sans, fontSize: 44, lineHeight: 1.25, color: fg, whiteSpace: "pre-line" }}>{caption}</div>
      </Line>
    </div>
  </>
);

export { colors };
