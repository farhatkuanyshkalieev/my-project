import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { SenseTitle } from "../components/SenseTitle";
import { colors, ip } from "../theme";

// Aroma: golden particles and soft smoke curls rising from a small glass vial.
export const ScentScene: React.FC = () => {
  const f = useCurrentFrame();
  const baseY = 1230;
  const particles = Array.from({ length: 110 }).map((_, i) => {
    const delay = random(`d${i}`) * 70;
    const life = 60 + random(`l${i}`) * 40;
    const p = (f - delay) / life;
    if (p < 0 || p > 1) return null;
    const drift = (random(`x${i}`) - 0.5) * 420;
    const x = 540 + drift * p + Math.sin(p * 6 + i) * 40 * p;
    const y = baseY - 90 - p * 640;
    const r = 5 + random(`r${i}`) * 12;
    return (
      <circle key={i} cx={x} cy={y} r={r * (1 - p * 0.4)} fill={i % 4 === 0 ? "#fff" : colors.gold}
        opacity={Math.sin(p * Math.PI) * 0.95} filter={r > 8 ? "url(#soft)" : undefined} />
    );
  });
  const curl = (k: number) => {
    const pts: string[] = [];
    for (let s = 0; s <= 1; s += 0.02) {
      const y = baseY - 100 - s * 600;
      const x = 540 + Math.sin(s * 7 + k * 2 - f * 0.07) * 70 * s + (k - 1) * 30 * s;
      pts.push(`${x},${y}`);
    }
    return `M${pts.join(" L")}`;
  };
  const draw = ip(f, [6, 50], [1, 0]);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <filter id="soft"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="smoke" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="16" /></filter>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor={colors.goldLight} stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((k) => (
          <path key={k} d={curl(k)} fill="none" stroke={k === 1 ? "#fff" : colors.goldLight} strokeWidth={46 - k * 10}
            strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={draw}
            filter="url(#smoke)" opacity={0.85} />
        ))}
        {particles}
        {/* minimal vial */}
        <g opacity={ip(f, [0, 14], [0, 1])} transform={`translate(540 ${baseY + ip(f, [0, 20], [30, 0])}) scale(1.5) translate(-540 ${-baseY})`}>
          <rect x={490} y={baseY - 90} width={100} height={30} rx={6} fill={colors.goldDeep} />
          <rect x={455} y={baseY - 60} width={170} height={150} rx={36} fill="url(#glass)" stroke={colors.gold} strokeWidth={2} />
          <rect x={475} y={baseY - 40} width={18} height={100} rx={9} fill="#fff" opacity={0.7} />
        </g>
      </svg>
      <SenseTitle index={3} word="Аромат" caption="запах заботы о себе" />
    </AbsoluteFill>
  );
};
