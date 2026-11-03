import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";
import { blurIn, blurOut, countEase, fmt, pop, prog, ringEase, s2f } from "../lib/anim";
import { C, FONT, textStyle } from "../lib/theme";

const visible = (frame: number, at: number, end: number) => frame >= s2f(at) - 1 && frame <= s2f(end) + 8;

/** Обёртка: blur-in на входе, blur-out на выходе */
const Shell: React.FC<{ at: number; end: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  end,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  if (!visible(frame, at, end)) return null;
  const i = blurIn(frame, s2f(at), 10);
  const o = blurOut(frame, s2f(end), 7);
  return (
    <div
      style={{
        position: "absolute",
        ...style,
        opacity: i.opacity * o.opacity,
        filter: `blur(${parseFloat(i.filter.slice(5)) + o.blur}px)`,
        scale: i.scale,
      }}
    >
      {children}
    </div>
  );
};

/* ───────────────────────── iOS-уведомление ───────────────────────── */
export const Notification: React.FC<{ at: number; end: number; title: string; body: string; avatar: string }> = ({
  at,
  end,
  title,
  body,
  avatar,
}) => {
  const frame = useCurrentFrame();
  if (!visible(frame, at, end)) return null;
  const inP = prog(frame, s2f(at), 14, Easing.bezier(0.2, 1.4, 0.4, 1));
  const outP = prog(frame, s2f(end), 9, Easing.in(Easing.cubic));
  const y = interpolate(inP, [0, 1], [-260, 70]) - outP * 330;
  return (
    <div
      style={{
        position: "absolute",
        left: 34,
        right: 34,
        top: y,
        height: 150,
        borderRadius: 46,
        background: "rgba(30,30,32,0.88)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        gap: 24,
        fontFamily: `'${FONT}', sans-serif`,
      }}
    >
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: "50%",
          background: `linear-gradient(135deg, #F2B8C6, ${C.wine})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 50,
          flexShrink: 0,
        }}
      >
        {avatar}
      </div>
      <div style={{ flex: 1, color: "white", lineHeight: 1.15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 33, fontWeight: 700 }}>
          <span>{title}</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500, fontSize: 28 }}>сейчас</span>
        </div>
        <div style={{ fontSize: 33, fontWeight: 500, marginTop: 4 }}>{body}</div>
      </div>
    </div>
  );
};

/* ───────────────────────── Большой счётчик ───────────────────────── */
export const Counter: React.FC<{
  at: number;
  countDur: number;
  end: number;
  from?: number;
  to: number;
  decimals?: number;
  prefix?: string;
  unit: string;
  y: number;
  size?: number;
  color?: string;
}> = ({ at, countDur, end, from = 0, to, decimals = 0, prefix = "", unit, y, size = 200, color = C.ink }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, s2f(at), s2f(countDur), countEase);
  const v = from + (to - from) * p;
  return (
    <Shell at={at} end={end} style={{ left: 0, right: 0, top: y, translate: "0 -50%", textAlign: "center" }}>
      <div style={{ ...textStyle, fontWeight: 800, fontSize: size, color, letterSpacing: "-0.065em", lineHeight: 1 }}>
        {prefix}
        {fmt(v, decimals)}
        <span style={{ fontSize: size * 0.42, letterSpacing: "-0.04em", marginLeft: size * 0.08 }}>{unit}</span>
      </div>
    </Shell>
  );
};

/* ───────────────────────── Плитки шоколада ───────────────────────── */
export const Chocolate: React.FC<{ at: number; end: number; y: number; count?: number }> = ({
  at,
  end,
  y,
  count = 14,
}) => {
  const frame = useCurrentFrame();
  if (!visible(frame, at, end)) return null;
  const o = blurOut(frame, s2f(end), 7);
  const cols = 7;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 96px)`,
        justifyContent: "center",
        gap: 18,
        opacity: o.opacity,
        filter: `blur(${o.blur}px)`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const s = pop(frame, s2f(at) + i * 1.5, 9);
        return (
          <div
            key={i}
            style={{
              width: 96,
              height: 136,
              borderRadius: 14,
              scale: String(s),
              rotate: `${((i * 37) % 11) - 5}deg`,
              background: "linear-gradient(160deg, #6B3A2A, #3E1F15)",
              boxShadow: "0 8px 18px rgba(62,31,21,0.25), inset 0 0 0 3px rgba(255,255,255,0.08)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr 1fr",
              gap: 6,
              padding: 10,
            }}
          >
            {Array.from({ length: 6 }).map((__, k) => (
              <div key={k} style={{ borderRadius: 4, background: "rgba(255,255,255,0.09)" }} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

/* ───────────────────────── Папка в стиле macOS ───────────────────────── */
export const Folder: React.FC<{
  at: number;
  end: number;
  x: number;
  y: number;
  label: string;
  caption?: string;
  captionAccent?: string;
  w?: number;
}> = ({ at, end, x, y, label, caption, captionAccent, w = 270 }) => {
  const frame = useCurrentFrame();
  if (!visible(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 11);
  const o = blurOut(frame, s2f(end), 7);
  const h = w * 0.78;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        scale: String(s),
        opacity: o.opacity,
        filter: `blur(${o.blur}px)`,
        textAlign: "center",
      }}
    >
      <svg width={w} height={h} viewBox="0 0 270 210">
        <defs>
          <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5DB6F5" />
            <stop offset="1" stopColor="#2F93E6" />
          </linearGradient>
          <linearGradient id="ff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8ED0FA" />
            <stop offset="1" stopColor="#4DAAF1" />
          </linearGradient>
        </defs>
        <path d="M14 18 Q14 6 26 6 H96 Q106 6 112 14 L120 26 H244 Q258 26 258 40 V180 H14 Z" fill="url(#fb)" />
        <rect x="6" y="44" width="258" height="160" rx="16" fill="url(#ff)" />
        <rect x="6" y="44" width="258" height="3" rx="1.5" fill="rgba(255,255,255,0.55)" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: h * 0.6,
          translate: "0 -50%",
          ...textStyle,
          fontSize: w * 0.16,
          color: "#1D6FB8",
          opacity: 0.9,
        }}
      >
        {label}
      </div>
      {caption ? (
        <div style={{ ...textStyle, fontSize: 34, fontWeight: 600, color: C.ink, marginTop: 14 }}>
          {caption}
          {captionAccent ? <span style={{ color: C.wineText }}> {captionAccent}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

/* ───────────────────────── Схема-дерево ───────────────────────── */
const stairs = (x0: number, y0: number, x1: number, y1: number, steps: number) => {
  const dx = (x1 - x0) / steps;
  const dy = (y1 - y0) / steps;
  let d = `M ${x0} ${y0}`;
  for (let i = 0; i < steps; i++) {
    d += ` L ${x0 + dx * (i + 1)} ${y0 + dy * i + dy * 0.15}`;
    d += ` L ${x0 + dx * (i + 1)} ${y0 + dy * (i + 1)}`;
  }
  return d;
};

export const Tree: React.FC<{
  at: number;
  end: number;
  y: number;
  title: string;
  left: [string, string];
  right: [string, string];
  /** Секунды появления веток под голос; без них — по фиксированным задержкам */
  cues?: { left: number; leftSub: number; right: number; rightSub: number };
}> = ({ at, end, y, title, left, right, cues }) => {
  const frame = useCurrentFrame();
  if (!visible(frame, at, end)) return null;
  const f0 = s2f(at);
  const o = blurOut(frame, s2f(end), 7);
  const top = 70;
  const L = stairs(510, top, 270, top + 230, 5);
  const R = stairs(570, top, 810, top + 230, 5);
  const t = blurIn(frame, f0, 9);
  const c = cues ?? { left: at + 0.6, leftSub: at + 0.6, right: at + 0.8, rightSub: at + 0.8 };
  // ветка «дорисовывается» к своему слову: заканчивает ровно в момент, когда его произносят
  const lineL = prog(frame, s2f(c.left) - 14, 14, (x) => x);
  const lineR = prog(frame, s2f(c.right) - 14, 14, (x) => x);
  const labAt = (sec: number) => blurIn(frame, s2f(sec), 9);
  const labStyle = (side: "l" | "r"): React.CSSProperties => ({
    position: "absolute",
    top: top + 250,
    width: 440,
    left: side === "l" ? 270 - 220 : 810 - 220,
    textAlign: "center",
    ...textStyle,
  });
  const L1 = labAt(c.left);
  const R1 = labAt(c.right);
  const L2 = labAt(c.leftSub);
  const R2 = labAt(c.rightSub);
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1080, height: 520, opacity: o.opacity, filter: `blur(${o.blur}px)` }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          textAlign: "center",
          ...textStyle,
          fontSize: 80,
          color: C.ink,
          opacity: t.opacity,
          filter: t.filter,
          translate: "0 -50%",
        }}
      >
        {title}
      </div>
      <svg width={1080} height={520} style={{ position: "absolute", inset: 0 }}>
        {[L, R].map((d, i) => (
          <path key={i} d={d} stroke={C.wine} strokeWidth={8} fill="none" strokeLinejoin="round" strokeLinecap="round" {...evolvePath(i ? lineR : lineL, d)} />
        ))}
      </svg>
      {[
        { s: L1, s2: L2, side: "l" as const, txt: left },
        { s: R1, s2: R2, side: "r" as const, txt: right },
      ].map(({ s, s2, side, txt }) => (
        <div key={side} style={labStyle(side)}>
          <div style={{ fontSize: 62, color: C.wineText, opacity: s.opacity, filter: s.filter, scale: s.scale }}>{txt[0]}</div>
          <div style={{ fontSize: 46, color: C.ink, marginTop: 8, opacity: s2.opacity, filter: s2.filter, scale: s2.scale }}>{txt[1]}</div>
        </div>
      ))}
    </div>
  );
};

/* ───────────────────────── Карточка исследования ───────────────────────── */
export const ResearchCard: React.FC<{ at: number; end: number; y: number; title: string; sub: string; dark?: boolean; label?: string }> = ({
  at,
  end,
  y,
  title,
  sub,
  dark,
  label = "исследование",
}) => (
  <Shell at={at} end={end} style={{ left: 150, right: 150, top: y }}>
    <div
      style={{
        borderRadius: 30,
        padding: "28px 36px",
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.75)",
        border: dark ? "1.5px solid rgba(255,255,255,0.16)" : "1.5px solid rgba(255,255,255,0.9)",
        boxShadow: dark ? "none" : "0 20px 50px rgba(30,28,31,0.10)",
        display: "flex",
        alignItems: "center",
        gap: 26,
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 20,
          background: C.wine,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          ...textStyle,
          fontSize: 38,
        }}
      >
        ✓
      </div>
      <div style={{ ...textStyle, letterSpacing: "-0.035em" }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: dark ? "rgba(255,255,255,0.5)" : C.grey, letterSpacing: 0 }}>
          {label}
        </div>
        <div style={{ fontSize: 38, color: dark ? "white" : C.ink, marginTop: 4 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 500, color: dark ? "rgba(255,255,255,0.6)" : "#6E6B71", marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  </Shell>
);

/* ───────────────────────── Кольцо шагов ───────────────────────── */
export const StepRing: React.FC<{
  at: number;
  fillDur: number;
  end: number;
  y: number;
  from?: number;
  to?: number;
  kcalLabel?: string;
  fillAt?: number; // секунда начала счёта (по умолчанию через 0.2 с после появления)
}> = ({ at, fillDur, end, y, from = 3000, to = 10000, kcalLabel, fillAt }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, fillAt !== undefined ? s2f(fillAt) : s2f(at) + 6, s2f(fillDur), ringEase);
  const steps = from + (to - from) * p;
  const r = 230;
  const circ = 2 * Math.PI * r;
  const kcal = blurIn(frame, s2f(at + fillDur) + 4, 9);
  return (
    <Shell at={at} end={end} style={{ left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 540, height: 540 }}>
        <svg width={540} height={540} style={{ rotate: "-90deg" }}>
          <circle cx={270} cy={270} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={26} fill="none" />
          <circle
            cx={270}
            cy={270}
            r={r}
            stroke="white"
            strokeWidth={26}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - steps / to)}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            ...textStyle,
          }}
        >
          <div style={{ fontSize: 130, fontWeight: 800, letterSpacing: "-0.06em" }}>{fmt(Math.round(steps / 10) * 10)}</div>
          <div style={{ fontSize: 46, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>шагов</div>
        </div>
      </div>
{kcalLabel ? (
      <div
        style={{
          ...textStyle,
          fontSize: 70,
          color: "#E07A8F",
          marginTop: 40,
          opacity: kcal.opacity,
          filter: kcal.filter,
          scale: kcal.scale,
        }}
      >
        {kcalLabel}
      </div>
      ) : null}
    </Shell>
  );
};

/* ───────────────────────── 3D-айфон с чек-листом ───────────────────────── */
export const Phone: React.FC<{
  at: number;
  end: number;
  y: number;
  nick: string;
  items: string[];
  /** Свой экран вместо чек-листа (например, директ) */
  screen?: React.ReactNode;
}> = ({ at, end, y, nick, items, screen }) => {
  const frame = useCurrentFrame();
  if (!visible(frame, at, end)) return null;
  const f0 = s2f(at);
  const inP = prog(frame, f0, 20, Easing.bezier(0.2, 1, 0.3, 1));
  const outP = prog(frame, s2f(end), 10, Easing.in(Easing.cubic));
  const idle = (frame - f0) / 30;
  const W = 560;
  const H = 1140;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, height: H, perspective: 2200, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: W,
          height: H,
          borderRadius: 92,
          background: "#0D0D0F",
          border: "14px solid #1B1B1E",
          boxShadow: "0 60px 120px rgba(20,18,22,0.35), inset 0 0 0 2px #3A3A3E",
          overflow: "hidden",
          transform: `translateX(${interpolate(inP, [0, 1], [900, 0]) + outP * 260}px) translateY(${outP * -1500}px) rotateY(${interpolate(inP, [0, 1], [60, -14]) + Math.sin(idle * 1.4) * 3}deg) rotateX(${interpolate(inP, [0, 1], [10, 4])}deg) rotateZ(${interpolate(inP, [0, 1], [18, -3]) + outP * 20}deg)`,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 22, left: "50%", translate: "-50% 0", width: 170, height: 48, borderRadius: 30, background: "#000", zIndex: 2 }} />
        {screen ?? (
        <div style={{ padding: "96px 34px 0", fontFamily: `'${FONT}', sans-serif`, color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: `linear-gradient(135deg,#F2B8C6,${C.wine})` }} />
            <div>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{nick}</div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)" }}>канал · чек-листы</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 26,
              borderRadius: 30,
              background: `linear-gradient(140deg, ${C.wine}, #5B1626)`,
              padding: "34px 30px",
            }}
          >
            <div style={{ ...textStyle, fontSize: 72, color: "white", fontWeight: 800 }}>чек-лист</div>
            <div style={{ ...textStyle, fontSize: 38, color: "rgba(255,255,255,0.85)", marginTop: 8 }}>10 замен · −100 ккал в день</div>
          </div>
          <div style={{ marginTop: 22 }}>
            {items.map((it, i) => {
              const s = blurIn(frame, f0 + 14 + i * 4, 8);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "17px 6px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    opacity: s.opacity,
                    filter: s.filter,
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: i < 3 ? C.wine : "transparent", border: `2.5px solid ${i < 3 ? C.wine : "rgba(255,255,255,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    {i < 3 ? "✓" : ""}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>{it}</div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
