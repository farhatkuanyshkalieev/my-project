import { colors, fonts } from "../theme";

// The gift card: cream stock, coral satin band with a bow, hard print-style shadow.
// "SENSES", the amount and the number are placeholders.
export const Certificate: React.FC<{ width?: number }> = ({ width = 860 }) => {
  const s = width / 860;
  const h = 520 * s;
  const band = 170 * s;
  return (
    <div style={{ position: "relative", width, height: h }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 26 * s,
          overflow: "hidden",
          background: colors.cream,
          boxShadow: `${22 * s}px ${26 * s}px 0 rgba(20,8,10,0.28)`,
        }}
      >
        <div style={{ position: "absolute", left: band, top: 0, width: 48 * s, height: "100%", background: colors.coral }} />
        <div style={{ position: "absolute", left: band + 10 * s, top: 0, width: 4 * s, height: "100%", background: colors.coralDeep, opacity: 0.5 }} />
        <div style={{ position: "absolute", left: 290 * s, right: 50 * s, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", color: colors.ink }}>
          <div style={{ fontFamily: fonts.display, fontSize: 19 * s, letterSpacing: 5 * s, fontWeight: 700, color: colors.coralDeep }}>
            ПОДАРОЧНЫЙ СЕРТИФИКАТ
          </div>
          <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 84 * s, letterSpacing: 6 * s, lineHeight: 1, marginTop: 20 * s, color: colors.wine }}>SENSES</div>
          <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 50 * s, marginTop: 24 * s }}>на любую сумму</div>
        </div>
        <div style={{ position: "absolute", right: 44 * s, bottom: 36 * s, fontFamily: fonts.sans, fontSize: 20 * s, letterSpacing: 4 * s, color: colors.wine, opacity: 0.6 }}>№ 0001</div>
      </div>
      {/* bow sits on the top edge, outside the clipped card */}
      <svg width={260 * s} height={170 * s} viewBox="-130 -110 260 170" style={{ position: "absolute", left: band + 24 * s - 130 * s, top: -110 * s }}>
        <path d="M0,0 C-30,-90 -120,-80 -105,-20 C-95,15 -40,10 0,0 Z" fill={colors.coral} />
        <path d="M0,0 C30,-90 120,-80 105,-20 C95,15 40,10 0,0 Z" fill={colors.coral} />
        <path d="M0,0 C-20,-50 -70,-50 -70,-22 C-60,-5 -30,-2 0,0 Z" fill={colors.coralDeep} opacity={0.55} />
        <path d="M0,0 C20,-50 70,-50 70,-22 C60,-5 30,-2 0,0 Z" fill={colors.coralDeep} opacity={0.55} />
        <path d="M-6,4 L-40,58 L-22,52 L-12,60 Z M6,4 L40,58 L22,52 L12,60 Z" fill={colors.coralDeep} />
        <rect x={-18} y={-16} width={36} height={30} rx={8} fill={colors.coralDeep} />
      </svg>
    </div>
  );
};
