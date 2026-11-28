import { useCurrentFrame } from "remotion";
import { Certificate } from "../components/Certificate";
import { Line, SceneFrame } from "../components/Kit";
import { colors, easeBack, fonts, ip } from "../theme";

export const CtaScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <SceneFrame bg={colors.powder}>
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 330,
          rotate: `${-7 + Math.sin(f * 0.05) * 1.5}deg`,
          translate: `0px ${ip(f, [2, 18], [-700, 0], easeBack) + Math.sin(f * 0.07) * 8}px`,
        }}
      >
        <Certificate width={600} />
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 860 }}>
        <Line at={8}>
          <div style={{ fontFamily: fonts.serif, fontSize: 176, lineHeight: 1, color: colors.ink }}>Подари</div>
        </Line>
        <Line at={15}>
          <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 196, lineHeight: 1, color: colors.wine }}>ощущение</div>
        </Line>
        <div style={{ height: 34 }} />
        <Line at={26}>
          <div style={{ fontFamily: fonts.sans, fontSize: 42, color: colors.ink }}>сертификат на любую сумму</div>
        </Line>
        <div
          style={{
            display: "inline-block",
            marginTop: 50,
            padding: "28px 58px",
            borderRadius: 999,
            background: colors.wine,
            color: colors.cream,
            fontFamily: fonts.sans,
            fontSize: 40,
            fontWeight: 600,
            scale: String(ip(f, [45, 55], [0, 1], easeBack)),
          }}
        >
          Заказать в Direct
        </div>
      </div>
    </SceneFrame>
  );
};
