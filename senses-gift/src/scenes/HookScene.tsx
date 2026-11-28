import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Line, PopWord, SceneFrame } from "../components/Kit";
import { colors, easeOut, fonts, ip } from "../theme";

// Beat 0: question. Beat 2 (frame 30): the "5" slams in with a shake.
export const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const q = f < 30;
  const shake = f >= 30 && f < 40 ? Math.sin(f * 2.3) * ip(f, [30, 40], [22, 0], (t) => t) : 0;
  return (
    <SceneFrame bg={colors.ink} enter="none">
      {q ? (
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 90 }}>
          <PopWord text="НЕ ЗНАЕШЬ," at={0} size={104} color={colors.cream} stagger={1} />
          <div style={{ height: 18 }} />
          <PopWord text="ЧТО" at={8} size={104} color={colors.cream} stagger={1} />
          <div style={{ height: 18 }} />
          <PopWord text="ПОДАРИТЬ?" at={12} size={104} color={colors.coral} stagger={1} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", translate: `${shake}px ${shake * 0.6}px` }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: 820,
              lineHeight: 0.8,
              color: colors.coral,
              scale: String(ip(f, [30, 37], [2.6, 1], easeOut)),
            }}
          >
            5
          </div>
          <PopWord text="ЧУВСТВ" at={33} size={150} color={colors.cream} stagger={1} />
          <div style={{ height: 30 }} />
          <Line at={42}>
            <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 76, color: colors.powder }}>в одном подарке</div>
          </Line>
        </AbsoluteFill>
      )}
    </SceneFrame>
  );
};
