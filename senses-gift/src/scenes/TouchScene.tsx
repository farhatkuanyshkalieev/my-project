import { useCurrentFrame } from "remotion";
import { SceneFrame, SenseTitle } from "../components/Kit";
import { colors, ip } from "../theme";

// Silk folds (flowing lines) that dip and ripple outward from one touch, landing on the beat (frame 30).
export const TouchScene: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 540;
  const cy = 1000;
  const touch = 30;
  const t = Math.max(0, f - touch);
  const strength = ip(f, [touch, touch + 8, 90], [0, 1, 0.4]);
  const lines = 30;
  const paths = Array.from({ length: lines }).map((_, i) => {
    const baseY = 640 + (i / (lines - 1)) * 700;
    const pts: string[] = [];
    for (let x = -20; x <= 1100; x += 12) {
      const fold = 22 * Math.sin(x * 0.0055 + i * 0.33 + f * 0.045) + 9 * Math.sin(x * 0.012 - f * 0.03 + i);
      const d = Math.hypot(x - cx, baseY - cy);
      const ripple = strength * 36 * Math.exp(-d / 360) * Math.sin(d * 0.045 - t * 0.5);
      const dent = strength * 46 * Math.exp(-(d * d) / (2 * 95 * 95)) * Math.sign(baseY - cy);
      pts.push(`${x},${baseY + fold + ripple + dent * 0.5}`);
    }
    return `M${pts.join(" L")}`;
  });
  return (
    <SceneFrame bg={colors.wine}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={i % 4 === 0 ? colors.coral : colors.powder}
            strokeWidth={i % 4 === 0 ? 4 : 2.2} opacity={ip(f, [4 + i * 0.6, 14 + i * 0.6], [0, 0.9])} />
        ))}
        {f > touch &&
          [0, 1, 2].map((k) => {
            const r = Math.max(0, t * 10 - k * 75);
            return <circle key={k} cx={cx} cy={cy} r={r} fill="none" stroke={colors.cream} strokeWidth={3} opacity={ip(r, [0, 460], [0.9, 0], (x) => x)} />;
          })}
        <circle cx={cx} cy={cy} r={ip(f, [touch - 5, touch, touch + 16], [0, 30, 16])} fill={colors.cream} />
      </svg>
      <SenseTitle label="чувство второе" word="Касание" caption="кожа, которую хочется трогать" fg={colors.cream} accent={colors.powder} />
    </SceneFrame>
  );
};
