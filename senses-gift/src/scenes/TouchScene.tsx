import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SenseTitle } from "../components/SenseTitle";
import { colors, ip } from "../theme";

// Silk folds (flowing lines) that ripple outward from a single touch point.
export const TouchScene: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 540;
  const cy = 960;
  const touchStart = 22;
  const t = Math.max(0, f - touchStart);
  const strength = ip(f, [touchStart, touchStart + 10, 90], [0, 1, 0.35]);
  const lines = 34;
  const paths = Array.from({ length: lines }).map((_, i) => {
    const baseY = 600 + (i / (lines - 1)) * 720;
    const pts: string[] = [];
    for (let x = -20; x <= 1100; x += 14) {
      const fold = 18 * Math.sin(x * 0.006 + i * 0.35 + f * 0.04) + 10 * Math.sin(x * 0.013 - f * 0.03 + i);
      const d = Math.hypot(x - cx, baseY - cy);
      const ripple = strength * 34 * Math.exp(-d / 380) * Math.sin(d * 0.045 - t * 0.45);
      const dent = strength * 40 * Math.exp(-(d * d) / (2 * 90 * 90));
      pts.push(`${x},${baseY + fold + ripple + (baseY < cy ? -dent : dent) * 0.4}`);
    }
    return `M${pts.join(" L")}`;
  });
  const ringR = t * 9;
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: ip(f, [0, 15], [0, 1]) }}>
        <defs>
          <radialGradient id="fade" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.55" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id="m">
            <rect width={1080} height={1920} fill="url(#fade)" />
          </mask>
        </defs>
        <g mask="url(#m)">
          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={i % 3 === 0 ? colors.gold : colors.goldDeep} strokeWidth={i % 3 === 0 ? 2.2 : 1.2} opacity={0.55} />
          ))}
        </g>
        {f > touchStart &&
          [0, 1, 2].map((k) => {
            const r = Math.max(0, ringR - k * 70);
            return <circle key={k} cx={cx} cy={cy} r={r} fill="none" stroke={colors.gold} strokeWidth={2} opacity={ip(r, [0, 420], [0.7, 0], (x) => x)} />;
          })}
        <circle cx={cx} cy={cy} r={ip(f, [touchStart - 6, touchStart, touchStart + 20], [0, 26, 14])} fill="#fff" opacity={0.9} />
      </svg>
      <SenseTitle index={2} word="Касание" caption="кожа, как шёлк" />
    </AbsoluteFill>
  );
};
