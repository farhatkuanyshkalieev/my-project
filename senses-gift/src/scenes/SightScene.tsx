import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SceneFrame, SenseTitle } from "../components/Kit";
import { colors, easeInExpo, easeInOut, ip } from "../theme";

// A graphic eye opens, glances left/right on the beats, blinks, then the camera dives into the
// pupil. The pupil is wine-coloured, so the next scene (wine field) continues seamlessly.
const W = 380;
const H = 200;
const CX = 540;
const CY = 1010;

export const SightScene: React.FC = () => {
  const f = useCurrentFrame();
  const open = ip(f, [2, 14], [0.04, 1], easeInOut);
  const blink = f < 62 ? 1 : ip(f, [62, 65, 70], [1, 0.04, 1], easeInOut);
  const a = open * blink;
  const look = ip(f, [15, 22, 30, 37, 45, 52], [0, -110, -110, 110, 110, 0], easeInOut);
  const lookY = ip(f, [15, 22, 30, 37, 45, 52], [0, 10, 10, -6, -6, 0], easeInOut);
  const zoom = ip(f, [74, 90], [1, 34], easeInExpo);
  const almond = `M${-W},0 Q0,${-2 * H * a} ${W},0 Q0,${1.5 * H * a} ${-W},0 Z`;
  const lid = (s: number) => {
    const x = (1 - s) ** 2 * -W + s ** 2 * W;
    const y = 2 * (1 - s) * s * (-2 * H * a);
    return { x, y };
  };
  return (
    <SceneFrame bg={colors.cream}>
      <AbsoluteFill style={{ opacity: ip(f, [70, 78], [1, 0]) }}>
        <SenseTitle label="чувство четвёртое" word="Взгляд" caption="тот самый взгляд в зеркало утром" fg={colors.ink} accent={colors.coralDeep} />
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <clipPath id="eye">
            <path d={almond} />
          </clipPath>
        </defs>
        <g transform={`translate(${CX} ${CY}) scale(${zoom})`}>
          <g>
            {/* lashes follow the upper lid */}
            {[0.18, 0.28, 0.38, 0.5, 0.62, 0.72, 0.82].map((s, i) => {
              const p = lid(s);
              const dx = p.x * 0.45;
              const dy = p.y - 160;
              const L = Math.hypot(dx, dy);
              const len = 58 * a;
              return <line key={i} x1={p.x} y1={p.y} x2={p.x + (dx / L) * len} y2={p.y + (dy / L) * len} stroke={colors.ink} strokeWidth={7} strokeLinecap="round" />;
            })}
            <path d={almond} fill="#FFFFFF" />
            <g clipPath="url(#eye)">
              <g transform={`translate(${look} ${lookY})`}>
                <circle r={150} fill={colors.coral} />
                {Array.from({ length: 30 }).map((_, i) => {
                  const ang = (i / 30) * Math.PI * 2;
                  return <line key={i} x1={Math.cos(ang) * 74} y1={Math.sin(ang) * 74} x2={Math.cos(ang) * 142} y2={Math.sin(ang) * 142} stroke={colors.wine} strokeOpacity={0.35} strokeWidth={4} />;
                })}
                <circle r={150} fill="none" stroke={colors.wine} strokeWidth={10} />
                <circle r={68} fill={colors.wine} />
                <circle cx={-44} cy={-48} r={20} fill={colors.cream} opacity={ip(f, [74, 80], [1, 0])} />
              </g>
            </g>
            <path d={almond} fill="none" stroke={colors.ink} strokeWidth={8} strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </SceneFrame>
  );
};
