import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Certificate } from "../components/Certificate";
import { colors, fonts, ip } from "../theme";

export const CtaScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 300,
          rotate: `${-6 + Math.sin(f * 0.05) * 2}deg`,
          translate: `0px ${Math.sin(f * 0.07) * 12}px`,
          scale: String(ip(f, [0, 20], [1.25, 1])),
        }}
      >
        <Certificate width={600} shine={ip(f, [20, 60], [0, 1], (t) => t)} />
      </div>
      <div style={{ position: "absolute", top: 860, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontSize: 150,
            lineHeight: 1,
            color: colors.ink,
            opacity: ip(f, [8, 24], [0, 1]),
            translate: `0px ${ip(f, [8, 28], [40, 0])}px`,
          }}
        >
          Подари
        </div>
        <div
          style={{
            fontFamily: fonts.serif,
            fontStyle: "italic",
            fontSize: 170,
            lineHeight: 1.05,
            color: colors.goldDeep,
            opacity: ip(f, [16, 32], [0, 1]),
            translate: `0px ${ip(f, [16, 36], [40, 0])}px`,
            filter: `blur(${ip(f, [16, 34], [10, 0])}px)`,
          }}
        >
          ощущение
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 44,
            color: colors.inkSoft,
            marginTop: 40,
            opacity: ip(f, [30, 46], [0, 1]),
          }}
        >
          подарочные сертификаты SENSES
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 56,
            padding: "26px 54px",
            borderRadius: 999,
            background: colors.ink,
            color: colors.cream,
            fontFamily: fonts.sans,
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: 1,
            opacity: ip(f, [40, 56], [0, 1]),
            scale: String(ip(f, [40, 60], [0.85, 1])),
          }}
        >
          Заказать — в Direct
        </div>
      </div>
    </AbsoluteFill>
  );
};
