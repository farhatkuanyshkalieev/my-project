import { colors, fonts } from "../theme";

// The gift card itself. Brand name and amount are placeholders.
export const Certificate: React.FC<{ shine: number; width?: number }> = ({ shine, width = 860 }) => {
  const h = width * 0.6;
  const s = width / 860;
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: 32 * s,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, #F3E5CC 0%, ${colors.goldLight} 35%, ${colors.gold} 70%, #E9D3AC 100%)`,
        boxShadow: "0 60px 120px rgba(90,60,30,0.35), 0 10px 30px rgba(90,60,30,0.25)",
      }}
    >
      {/* satin ribbon band */}
      <div style={{ position: "absolute", left: 150 * s, top: 0, width: 46 * s, height: "100%", background: `linear-gradient(90deg, ${colors.goldDeep}, #B9895A 50%, ${colors.goldDeep})` }} />
      <div style={{ position: "absolute", inset: 22 * s, border: `${1.5 * s}px solid rgba(255,255,255,0.65)`, borderRadius: 20 * s }} />
      <div style={{ position: "absolute", left: 250 * s, right: 50 * s, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", color: colors.ink }}>
        <div style={{ fontFamily: fonts.serif, fontSize: 96 * s, letterSpacing: 18 * s, lineHeight: 1 }}>SENSES</div>
        <div style={{ fontFamily: fonts.sans, fontSize: 24 * s, letterSpacing: 7 * s, fontWeight: 600, marginTop: 26 * s, color: colors.goldDeep }}>
          ПОДАРОЧНЫЙ СЕРТИФИКАТ
        </div>
        <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 54 * s, marginTop: 34 * s }}>на любую сумму</div>
      </div>
      <div style={{ position: "absolute", right: 46 * s, bottom: 40 * s, fontFamily: fonts.sans, fontSize: 20 * s, letterSpacing: 4 * s, color: colors.goldDeep }}>№ 0001</div>
      {/* moving glare */}
      <div
        style={{
          position: "absolute",
          top: -h,
          left: shine * width * 1.6 - width * 0.6,
          width: 180 * s,
          height: h * 3,
          rotate: "25deg",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)",
        }}
      />
    </div>
  );
};
