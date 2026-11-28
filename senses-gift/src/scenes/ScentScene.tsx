import { useCurrentFrame } from "remotion";
import { SceneFrame, SenseTitle } from "../components/Kit";
import { colors, easeBack, ip } from "../theme";

// A flat paper-cut peony blooms layer by layer; three scent ribbons curl up out of it.
const petal = (len: number) =>
  `M0,0 C${len * 0.28},${-len * 0.46} ${len * 0.86},${-len * 0.42} ${len},0 C${len * 0.86},${len * 0.42} ${len * 0.28},${len * 0.46} 0,0 Z`;

const LAYERS = [
  { n: 8, len: 310, color: colors.powder, vein: colors.coralDeep, offset: 0, start: 2 },
  { n: 8, len: 240, color: colors.cream, vein: colors.coral, offset: 22.5, start: 8 },
  { n: 6, len: 160, color: colors.wine, vein: colors.powder, offset: 10, start: 14 },
];

export const ScentScene: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 540;
  const cy = 1060;
  return (
    <SceneFrame bg={colors.coral}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {[0, 1, 2].map((k) => {
          const x0 = cx + (k - 1) * 110;
          const pts: string[] = [];
          for (let s = 0; s <= 1.001; s += 0.04) {
            const y = 800 - s * 260 - ip(f, [40, 90], [0, 60], (x) => x);
            const x = x0 + Math.sin(s * 9 + k * 1.3 - f * 0.12) * 26;
            pts.push(`${x},${y}`);
          }
          return (
            <path key={k} d={`M${pts.join(" L")}`} fill="none" stroke={colors.cream} strokeWidth={13} strokeLinecap="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={ip(f, [26 + k * 4, 48 + k * 4], [1, 0])} />
          );
        })}
        <g transform={`translate(${cx} ${cy}) rotate(${f * 0.25})`}>
          {LAYERS.map((L, li) => (
            <g key={li} transform={`rotate(${ip(f, [L.start, L.start + 20], [-50, 0])})`}>
              {Array.from({ length: L.n }).map((_, i) => {
                const sc = ip(f, [L.start + i * 0.8, L.start + 14 + i * 0.8], [0, 1], easeBack);
                return (
                  <g key={i} transform={`rotate(${L.offset + (360 / L.n) * i - 90}) scale(${sc})`}>
                    <path d={petal(L.len)} fill={L.color} stroke={colors.wineDeep} strokeOpacity={0.12} strokeWidth={2} />
                    <path d={`M${L.len * 0.12},0 L${L.len * 0.72},0`} stroke={L.vein} strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
                  </g>
                );
              })}
            </g>
          ))}
          <circle r={ip(f, [20, 34], [0, 56], easeBack)} fill={colors.butter} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={Math.cos(a) * 34} cy={Math.sin(a) * 34} r={ip(f, [26 + i * 0.5, 34 + i * 0.5], [0, 6], easeBack)} fill={colors.wine} />;
          })}
        </g>
      </svg>
      <SenseTitle label="чувство третье" word="Аромат" caption="уход, который пахнет как отпуск" fg={colors.cream} accent={colors.wine} />
    </SceneFrame>
  );
};
