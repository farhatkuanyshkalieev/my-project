import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Certificate } from "../components/Certificate";
import { SenseTitle } from "../components/SenseTitle";
import { colors, easeInOut, fonts, ip } from "../theme";

// The four senses fly together and collapse into the gift card = the fifth sense.
const SENSES = ["звук", "касание", "аромат", "взгляд"];

export const CertificateScene: React.FC = () => {
  const f = useCurrentFrame();
  const merge = ip(f, [14, 36], [0, 1], easeInOut);
  const cardIn = ip(f, [34, 62], [0, 1]);
  return (
    <AbsoluteFill>
      {SENSES.map((s, i) => {
        const a = (i / SENSES.length) * Math.PI * 2 - Math.PI / 4;
        const r = 330 * (1 - merge);
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: 540 + Math.cos(a) * r,
              top: 960 + Math.sin(a) * r * 1.2,
              translate: "-50% -50%",
              fontFamily: fonts.serif,
              fontStyle: "italic",
              fontSize: 64,
              color: colors.goldDeep,
              whiteSpace: "nowrap",
              opacity: ip(f, [0, 10], [0, 1]) * (1 - merge),
              scale: String(1 - merge * 0.7),
            }}
          >
            {s}
          </div>
        );
      })}
      {/* flash at the merge point */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 960,
          width: 900,
          height: 900,
          translate: "-50% -50%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 60%)",
          opacity: ip(f, [30, 36, 56], [0, 1, 0]),
          scale: String(ip(f, [30, 50], [0.2, 1.3])),
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 1400 }}>
        <div
          style={{
            opacity: cardIn,
            scale: String(ip(f, [34, 62], [0.6, 1])),
            rotate: `y ${ip(f, [34, 70], [-75, -6]) + Math.sin(f * 0.05) * 4}deg`,
            translate: `0px ${Math.sin(f * 0.06) * 10}px`,
          }}
        >
          <div style={{ rotate: `x ${8 + Math.cos(f * 0.05) * 3}deg` }}>
            <Certificate shine={ip(f, [64, 100], [0, 1], (t) => t)} />
          </div>
        </div>
      </AbsoluteFill>
      <SenseTitle index={5} word="Ощущение" caption="всё это — в одном подарке" />
    </AbsoluteFill>
  );
};
