import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SenseTitle } from "../components/SenseTitle";
import { colors, ip } from "../theme";

// The satin ribbon IS the sound wave: it ripples across the frame like rustling silk.
const ribbonPath = (f: number, amp: number, phase: number, cy: number, thick: number) => {
  const top: string[] = [];
  const bot: string[] = [];
  for (let x = -40; x <= 1120; x += 12) {
    const env = Math.sin((x / 1080) * Math.PI); // calmer at edges
    const y =
      cy +
      amp * env * Math.sin(x * 0.011 - f * 0.18 + phase) +
      amp * 0.35 * env * Math.sin(x * 0.027 + f * 0.11 + phase * 2);
    const twist = Math.cos(x * 0.011 - f * 0.18 + phase); // ribbon twist -> width changes
    const w = thick * (0.25 + 0.75 * Math.abs(twist));
    top.push(`${x},${y - w}`);
    bot.unshift(`${x},${y + w}`);
  }
  return `M${top.join(" L")} L${bot.join(" L")} Z`;
};

export const SoundScene: React.FC = () => {
  const f = useCurrentFrame();
  const amp = ip(f, [0, 30], [0, 150]) * (1 + 0.15 * Math.sin(f * 0.3));
  const shine = (f * 14) % 1600 - 300;
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="satin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={colors.goldDeep} />
            <stop offset="0.5" stopColor={colors.gold} />
            <stop offset="1" stopColor={colors.goldDeep} />
          </linearGradient>
          <linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1={shine} y1="0" x2={shine + 300} y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* faint equalizer ticks behind the ribbon */}
        {Array.from({ length: 36 }).map((_, i) => {
          const x = 70 + i * 27;
          const h = ip(f, [0, 30], [0, 1]) * (30 + 90 * Math.abs(Math.sin(i * 0.7 + f * 0.25)) * Math.sin((i / 35) * Math.PI));
          return <rect key={i} x={x} y={950 - h} width={4} height={h * 2} rx={2} fill={colors.gold} opacity={0.18} />;
        })}
        <g opacity={ip(f, [0, 18], [0, 1])}>
          <path d={ribbonPath(f, amp * 0.7, 2.2, 960, 26)} fill={colors.goldLight} opacity={0.8} />
          <path d={ribbonPath(f, amp, 0, 950, 38)} fill="url(#satin)" />
          <path d={ribbonPath(f, amp, 0, 950, 38)} fill="url(#sheen)" />
        </g>
      </svg>
      <SenseTitle index={1} word="Звук" caption="шелест атласной ленты" />
    </AbsoluteFill>
  );
};
