import { useCurrentFrame } from "remotion";
import { colors, fonts, ip } from "../theme";

// Shared typographic frame for each sense: index at top, big word, caption below the visual.
export const SenseTitle: React.FC<{ index: number; word: string; caption: string }> = ({
  index,
  word,
  caption,
}) => {
  const f = useCurrentFrame();
  const letters = word.split("");
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 210,
          width: "100%",
          textAlign: "center",
          fontFamily: fonts.sans,
          fontSize: 34,
          letterSpacing: 10,
          fontWeight: 500,
          color: colors.goldDeep,
          opacity: ip(f, [4, 20], [0, 1]),
          translate: `0px ${ip(f, [4, 24], [20, 0])}px`,
        }}
      >
        0{index} <span style={{ opacity: 0.45 }}>/ 05</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 280,
          width: "100%",
          textAlign: "center",
          fontFamily: fonts.serif,
          fontStyle: "italic",
          fontSize: word.length > 6 ? 176 : 210,
          lineHeight: 1,
          color: colors.ink,
        }}
      >
        {letters.map((l, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: ip(f, [8 + i * 2, 26 + i * 2], [0, 1]),
              translate: `0px ${ip(f, [8 + i * 2, 30 + i * 2], [50, 0])}px`,
              filter: `blur(${ip(f, [8 + i * 2, 28 + i * 2], [12, 0])}px)`,
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1430,
          width: "100%",
          textAlign: "center",
          fontFamily: fonts.sans,
          fontSize: 46,
          fontWeight: 400,
          color: colors.inkSoft,
          opacity: ip(f, [26, 44], [0, 1]),
          translate: `0px ${ip(f, [26, 48], [24, 0])}px`,
        }}
      >
        {caption}
      </div>
    </>
  );
};
