import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Line, SceneFrame } from "../components/Kit";
import { colors, fonts, ip } from "../theme";

// Each element lands on a beat (0 / 15 / 30 frames).
export const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <SceneFrame bg={colors.ink} wipe={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ scale: String(ip(f, [30, 70], [1, 1.04], (t) => t)) }}>
          <Line at={0} dur={12}>
            <div style={{ fontFamily: fonts.serif, fontSize: 760, lineHeight: 0.78, color: colors.cream }}>5</div>
          </Line>
          <Line at={15} dur={12}>
            <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 180, lineHeight: 1, color: colors.powder }}>чувств</div>
          </Line>
          <div style={{ height: 50 }} />
          <Line at={30} dur={12}>
            <div style={{ fontFamily: fonts.sans, fontSize: 40, letterSpacing: 12, fontWeight: 600, color: colors.coral, textTransform: "uppercase" }}>
              и один подарок
            </div>
          </Line>
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
