import { useCurrentFrame } from "remotion";
import { Certificate } from "../components/Certificate";
import { Line, Marquee, PopWord, SceneFrame } from "../components/Kit";
import { colors, easeBack, fonts, ip } from "../theme";

export const CtaScene: React.FC = () => {
  const f = useCurrentFrame();
  const bounce = f >= 30 ? Math.exp(-((f - 30) % 30) / 6) : 0;
  return (
    <SceneFrame bg={colors.powder} enter="up">
      <Marquee text="ПОДАРОК" color="#E8B8AC" y={1560} size={200} />
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 300,
          rotate: `${-7 + Math.sin(f * 0.08) * 2}deg`,
          translate: `0px ${ip(f, [1, 12], [-800, 0], easeBack) + Math.sin(f * 0.09) * 10}px`,
        }}
      >
        <Certificate width={600} />
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 850 }}>
        <PopWord text="ПОДАРИ" at={5} size={150} color={colors.ink} stagger={1.2} />
        <Line at={12}>
          <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontWeight: 600, fontSize: 150, lineHeight: 1.05, color: colors.wine }}>ощущение</div>
        </Line>
        <div style={{ height: 24 }} />
        <Line at={20}>
          <div style={{ fontFamily: fonts.display, fontSize: 38, color: colors.ink }}>сертификат на любую сумму</div>
        </Line>
        <div
          style={{
            display: "inline-block",
            marginTop: 46,
            padding: "30px 60px",
            borderRadius: 999,
            background: colors.wine,
            color: colors.cream,
            fontFamily: fonts.display,
            fontSize: 38,
            fontWeight: 700,
            scale: String(ip(f, [30, 38], [0, 1], easeBack) * (1 + 0.05 * bounce)),
          }}
        >
          Заказать в Direct →
        </div>
      </div>
    </SceneFrame>
  );
};
