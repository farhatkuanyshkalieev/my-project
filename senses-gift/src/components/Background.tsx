import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

// Warm cream backdrop with slowly drifting soft light blobs and film grain.
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, r: number, c: string, sp: number, ph: number) => (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin(f * sp + ph) * 60 - r,
        top: y + Math.cos(f * sp * 0.8 + ph) * 80 - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c} 0%, transparent 70%)`,
        opacity: 0.7,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream, overflow: "hidden" }}>
      {blob(200, 400, 600, colors.blush, 0.012, 0)}
      {blob(900, 1300, 700, colors.goldLight, 0.01, 2)}
      {blob(500, 1800, 500, colors.sand, 0.015, 4)}
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.09, mixBlendMode: "multiply" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 12} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
