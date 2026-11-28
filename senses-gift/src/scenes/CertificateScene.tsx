import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Certificate } from "../components/Certificate";
import { Line, Progress, SceneFrame, SenseTitle } from "../components/Kit";
import { colors, easeBack, easeInOut, fonts, ip } from "../theme";

// Continues from the pupil (same wine field). The four senses stack up on the beats,
// fold away, and the card flips in on the downbeat (frame 30 = the chime).
const SENSES = ["звук", "касание", "аромат", "взгляд"];
const LAND = [0, 6, 12, 18];

export const CertificateScene: React.FC = () => {
  const f = useCurrentFrame();
  const fold = ip(f, [23, 29], [1, 0], easeInOut);
  return (
    <SceneFrame bg={colors.wine} enter="none">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", scale: `1 ${fold}`, opacity: fold > 0.02 ? 1 : 0 }}>
        {SENSES.map((w, i) => (
          <div key={w} style={{ translate: `${ip(f, [LAND[i], LAND[i] + 6], [i % 2 ? 400 : -400, 0])}px 0px`, opacity: f >= LAND[i] ? 1 : 0 }}>
            <Line at={LAND[i]} dur={6}>
              <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 140, lineHeight: 1.1, color: i % 2 ? colors.coral : colors.powder }}>{w}</div>
            </Line>
          </div>
        ))}
      </AbsoluteFill>
      {/* ring burst instead of a glow */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {[0, 1].map((k) => {
          const r = ip(f, [30 + k * 4, 60 + k * 4], [0, 720]);
          return <circle key={k} cx={540} cy={1000} r={r} fill="none" stroke={k ? colors.coral : colors.powder} strokeWidth={ip(f, [30, 60], [26, 1])} opacity={r > 0 && r < 719 ? 1 : 0} />;
        })}
      </svg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 1600, paddingTop: 80, translate: `${f >= 30 && f < 40 ? Math.sin(f * 2.1) * ip(f, [30, 40], [16, 0], (t) => t) : 0}px 0px` }}>
        <div
          style={{
            opacity: f >= 30 ? 1 : 0,
            rotate: `y ${ip(f, [30, 48], [100, -8], easeBack) + Math.sin(f * 0.05) * 3}deg`,
            scale: String(ip(f, [30, 46], [0.7, 1], easeBack)),
            translate: `0px ${Math.sin(f * 0.07) * 10}px`,
          }}
        >
          <div style={{ rotate: `${-3 + Math.cos(f * 0.05) * 1.5}deg` }}>
            <Certificate />
          </div>
        </div>
      </AbsoluteFill>
      <SenseTitle label="чувство №5" word="ОЩУЩЕНИЕ" caption="все *пять* в одном подарке" fg={colors.cream} accent={colors.coral} hiFg={colors.cream} at={33} />
      <AbsoluteFill style={{ opacity: f >= 30 ? 1 : 0 }}>
        <Progress index={4} color={colors.cream} />
      </AbsoluteFill>
    </SceneFrame>
  );
};
