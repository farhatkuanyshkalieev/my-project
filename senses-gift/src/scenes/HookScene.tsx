import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors, fonts, ip } from "../theme";

export const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const word = (text: string, start: number, style: React.CSSProperties) => (
    <div style={{ ...style }}>
      {text.split("").map((l, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            opacity: ip(f, [start + i * 1.5, start + 16 + i * 1.5], [0, 1]),
            filter: `blur(${ip(f, [start + i * 1.5, start + 18 + i * 1.5], [16, 0])}px)`,
            translate: `0px ${ip(f, [start + i * 1.5, start + 20 + i * 1.5], [40, 0])}px`,
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ scale: String(ip(f, [0, 75], [1.06, 1], (t) => t)) }}>
        {word("5 чувств", 4, {
          fontFamily: fonts.serif,
          fontSize: 230,
          fontWeight: 400,
          color: colors.ink,
          lineHeight: 1,
        })}
        <div
          style={{
            width: ip(f, [26, 50], [0, 220]),
            height: 2,
            background: colors.gold,
            margin: "48px auto",
          }}
        />
        {word("и один подарок", 30, {
          fontFamily: fonts.serif,
          fontStyle: "italic",
          fontSize: 110,
          color: colors.goldDeep,
          lineHeight: 1,
        })}
      </div>
    </AbsoluteFill>
  );
};
