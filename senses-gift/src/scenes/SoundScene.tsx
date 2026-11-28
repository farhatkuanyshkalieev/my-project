import { useCurrentFrame } from "remotion";
import { Marquee, Progress, SceneFrame, SenseTitle } from "../components/Kit";
import { colors, ip } from "../theme";

// A flat satin ribbon that twists like a sound wave. Front and back of the ribbon
// get different colours, so every twist reads as a real fold. It pulses on the kick (every 30 frames).
const Ribbon: React.FC<{ f: number; amp: number; cy: number; thick: number; phase: number; front: string; back: string }> = ({
  f, amp, cy, thick, phase, front, back,
}) => {
  const xs: number[] = [];
  for (let x = -40; x <= 1120; x += 10) xs.push(x);
  const pt = (x: number) => {
    const env = 0.35 + 0.65 * Math.sin((Math.min(Math.max(x, 0), 1080) / 1080) * Math.PI);
    const y = cy + amp * env * Math.sin(x * 0.0085 - f * 0.16 + phase) + amp * 0.3 * env * Math.sin(x * 0.021 + f * 0.09);
    const tw = Math.cos(x * 0.006 - f * 0.12 + phase * 1.7);
    return { y, w: thick * Math.max(Math.abs(tw), 0.04), tw };
  };
  const pts = xs.map(pt);
  return (
    <>
      {xs.slice(0, -1).map((x, i) => {
        const a = pts[i];
        const b = pts[i + 1];
        const x2 = xs[i + 1] + 0.6;
        return (
          <polygon
            key={i}
            points={`${x},${a.y - a.w} ${x2},${b.y - b.w} ${x2},${b.y + b.w} ${x},${a.y + a.w}`}
            fill={a.tw + b.tw > 0 ? front : back}
            stroke={a.tw + b.tw > 0 ? front : back}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        );
      })}
    </>
  );
};

export const SoundScene: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = Math.exp(-(f % 30) / 7);
  const amp = ip(f, [0, 12], [0, 160]) + 55 * pulse * ip(f, [0, 6], [0, 1]);
  return (
    <SceneFrame bg={colors.powder} enter="circle">
      <Marquee text="ЗВУК" color="#E8B8AC" y={700} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Ribbon f={f} amp={amp * 0.8} cy={1010} thick={30} phase={2.4} front={colors.coral} back={colors.coralDeep} />
        <Ribbon f={f} amp={amp} cy={990} thick={52} phase={0} front={colors.wine} back={colors.wineDeep} />
      </svg>
      <SenseTitle label="чувство №1" word="ЗВУК" caption="шорох *ленты,* которую развязывают для тебя" fg={colors.wine} accent={colors.coralDeep} hiFg={colors.cream} />
      <Progress index={0} color={colors.wine} />
    </SceneFrame>
  );
};
