import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { countEase, fmt, pop, prog, s2f } from "../lib/anim";
import { MONT } from "../lib/theme";

/**
 * Стиль №2 — «инфографика-мем» (второй референс).
 * Плоская векторная графика, Montserrat Black, бирюза + коралл, серый = проблема, мятный = решение.
 */
export const F = {
  teal: "#20C0B0",
  tealLight: "#38D8D0",
  tealDark: "#18A8A0",
  tealPale: "#CDF2EF",
  bg: "#F8FCFE",
  bgMint: "#E4F7F4",
  coral: "#EE7769",
  coralDark: "#D85C4E",
  ink: "#383539",
  sub: "#6B6E75",
  greyFig: "#8E989E",
  greyFigDark: "#6F787E",
  greyBg1: "#E1E2E7",
  greyBg2: "#D3D4DC",
  white: "#FFFFFF",
  yellow: "#F5C84B",
};

export const font = (weight: number, size: number, color = F.ink): React.CSSProperties => ({
  fontFamily: `'${MONT}', sans-serif`,
  fontWeight: weight,
  fontSize: size,
  color,
  letterSpacing: weight >= 800 ? "-0.01em" : "0",
  lineHeight: 1.12,
});

const shown = (frame: number, at: number, end: number, tail = 10) => frame >= s2f(at) - 1 && frame <= s2f(end) + tail;

/** Плавное появление снизу (стиль №2 почти без блюра — чистое «выезжание») */
const rise = (frame: number, f0: number, dur = 10, dist = 26) => {
  const p = prog(frame, f0, dur);
  return { opacity: p, translate: `0 ${(1 - p) * dist}px`, filter: `blur(${(1 - p) * 6}px)` };
};
const fall = (frame: number, f1: number, dur = 8) => {
  const p = prog(frame, f1, dur, Easing.in(Easing.cubic));
  return { o: 1 - p, y: -p * 18 };
};

/* ───────────────────────── Фон ───────────────────────── */
export const FlatBg: React.FC<{ mode: "grey" | "mint" }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const grey = mode === "grey";
  const d = (k: number) => Math.sin(frame / (70 + k * 13) + k) * 26;
  const circ = (cx: number, cy: number, r: number, k: number, fill: string, ring = false) => (
    <div
      key={k}
      style={{
        position: "absolute",
        left: cx - r + d(k),
        top: cy - r + d(k + 2),
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: ring ? "transparent" : fill,
        border: ring ? `90px solid ${fill}` : undefined,
      }}
    />
  );
  return (
    <AbsoluteFill
      style={{
        background: grey
          ? `linear-gradient(180deg, ${F.greyBg1} 0%, ${F.greyBg2} 100%)`
          : `linear-gradient(180deg, ${F.bg} 0%, ${F.bg} 45%, ${F.bgMint} 100%)`,
        overflow: "hidden",
      }}
    >
      {grey ? (
        <>
          {circ(-60, 700, 360, 1, "rgba(200,201,210,0.55)")}
          {circ(820, 260, 90, 2, "rgba(200,201,210,0.7)")}
          {circ(980, 1650, 560, 3, "rgba(200,201,210,0.45)", true)}
        </>
      ) : (
        <>
          {circ(1040, 1500, 620, 1, "rgba(205,242,239,0.55)", true)}
          {circ(860, 300, 95, 2, "rgba(205,242,239,0.9)")}
          {circ(-120, 1380, 380, 3, "rgba(205,242,239,0.5)")}
        </>
      )}
    </AbsoluteFill>
  );
};

/* ───────────────────────── Заголовки по словам ─────────────────────────
 * *слово* — бирюзовый акцент, | — перенос. Слово приходит серым и темнеет (как «Ленивый спорт»). */
export const FText: React.FC<{
  text: string;
  at: number;
  end: number;
  times?: number[];
  gap?: number;
  y: number;
  size?: number;
  weight?: number;
  color?: string;
  accent?: string;
  greyIn?: boolean;
}> = ({ text, at, end, times, gap = 0.22, y, size = 84, weight = 900, color = F.ink, accent = F.teal, greyIn = true }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const lines = text.split("|").map((l) => l.trim().split(/\s+/));
  let i = 0;
  const out = fall(frame, s2f(end));
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: y,
        translate: `0 ${out.y}px`,
        opacity: out.o,
        textAlign: "center",
        ...font(weight, size, color),
      }}
    >
      {lines.map((ws, li) => (
        <div key={li} style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", columnGap: "0.28em" }}>
          {ws.map((raw, wi) => {
            const acc = raw.startsWith("*") && raw.endsWith("*");
            const word = acc ? raw.slice(1, -1) : raw;
            const t = times?.[i] ?? at + i * gap;
            i++;
            const f0 = s2f(t);
            const r = rise(frame, f0, 9, 22);
            const c = prog(frame, f0 + 3, 9);
            const final = acc ? accent : color;
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  ...r,
                  color: greyIn ? interpolateColors(c, [0, 1], ["#B9BBC2", final]) : final,
                }}
              >
                {word.replace(/_/g, " ")}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Надзаголовок: маленький капс с разрядкой */
export const Eyebrow: React.FC<{ text: string; at: number; end: number; y: number; color?: string }> = ({ text, at, end, y, color = F.teal }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const r = rise(frame, s2f(at), 10, 16);
  const out = fall(frame, s2f(end));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        textAlign: "center",
        ...font(800, 30, color),
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        ...r,
        opacity: r.opacity * out.o,
      }}
    >
      {text}
    </div>
  );
};

/* ───────────────────────── Шторка ─────────────────────────
 * Белая панель со скруглённым верхом въезжает снизу и закрывает кадр; под ней меняется сцена. */
export const Wipe: React.FC<{ at: number; color?: string }> = ({ at, color = F.bg }) => {
  const frame = useCurrentFrame();
  const f0 = s2f(at);
  if (frame < f0 || frame > f0 + 24) return null;
  const up = prog(frame, f0, 11, Easing.bezier(0.6, 0, 0.2, 1));
  const fadeOut = prog(frame, f0 + 12, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: interpolate(up, [0, 1], [1920, -80]),
        height: 2100,
        background: color,
        borderRadius: "80px 80px 0 0",
        boxShadow: "0 -30px 80px rgba(30,60,70,0.12)",
        opacity: 1 - fadeOut,
      }}
    />
  );
};
/** Момент, когда шторка закрыла кадр (тут меняем сцену) */
export const wipeCovered = (at: number) => at + 11 / 30;

/* ───────────────────────── Календарь с перелистыванием ───────────────────────── */
export type Page = { head: string; big: string; sub: string };
export const Calendar: React.FC<{ at: number; end: number; x: number; y: number; pages: Page[]; flips: number[]; w?: number }> = ({
  at,
  end,
  x,
  y,
  pages,
  flips,
  w = 330,
}) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 12);
  const out = fall(frame, s2f(end));
  const h = w * 1.0;
  // индекс текущей страницы
  let cur = 0;
  flips.forEach((t, i) => {
    if (frame >= s2f(t) + 7) cur = Math.min(pages.length - 1, i + 1);
  });
  const flipping = flips.findIndex((t) => frame >= s2f(t) && frame < s2f(t) + 7);
  const sheet = (p: Page, style?: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 26,
        background: F.white,
        overflow: "hidden",
        boxShadow: "0 18px 40px rgba(60,60,80,0.16)",
        ...style,
      }}
    >
      <div style={{ height: h * 0.2, background: F.coral, display: "flex", alignItems: "center", justifyContent: "center", ...font(700, w * 0.085, F.white), letterSpacing: "0.04em" }}>
        {p.head}
      </div>
      <div style={{ textAlign: "center", ...font(900, w * 0.32, "#4A4A52"), marginTop: h * 0.06, lineHeight: 1 }}>{p.big}</div>
      <div style={{ textAlign: "center", ...font(500, w * 0.062, "#8A8C94"), marginTop: h * 0.06 }}>{p.sub}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, scale: String(s), opacity: out.o, perspective: 1200 }}>
      {/* нижний лист (следующая страница) */}
      {sheet(pages[flipping >= 0 ? Math.min(pages.length - 1, flipping + 1) : cur])}
      {/* улетающий лист */}
      {flipping >= 0
        ? sheet(pages[flipping], {
            transformOrigin: "50% 0%",
            transform: `rotateX(${interpolate(frame, [s2f(flips[flipping]), s2f(flips[flipping]) + 7], [0, 105])}deg)`,
            opacity: interpolate(frame, [s2f(flips[flipping]) + 3, s2f(flips[flipping]) + 7], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          })
        : null}
      {/* кольца */}
      {[0.28, 0.72].map((k) => (
        <div key={k} style={{ position: "absolute", left: w * k - 9, top: -22, width: 18, height: 48, borderRadius: 9, background: "#9EA0A8" }} />
      ))}
    </div>
  );
};

/* ───────────────────────── Весы ───────────────────────── */
export const Scale: React.FC<{ at: number; end: number; x: number; y: number; value: string; blinkAt?: number[]; w?: number }> = ({
  at,
  end,
  x,
  y,
  value,
  blinkAt = [],
  w = 360,
}) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 12);
  const out = fall(frame, s2f(end));
  const blink = blinkAt.some((t) => frame >= s2f(t) && frame < s2f(t) + 4);
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - w * 0.45, width: w, height: w * 0.9, scale: String(s), opacity: out.o }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 60, background: "linear-gradient(180deg,#FFFFFF,#E9EAEF)", boxShadow: "0 22px 44px rgba(60,60,80,0.18)" }} />
      <div
        style={{
          position: "absolute",
          left: w * 0.18,
          right: w * 0.18,
          top: w * 0.12,
          height: w * 0.26,
          borderRadius: 18,
          background: "#3B3E45",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span style={{ ...font(800, w * 0.15, blink ? "#7DF0E4" : "#C9F5EF"), letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ ...font(700, w * 0.06, "#9FD9D2") }}>кг</span>
      </div>
      {[0.3, 0.7].map((k) => (
        <div key={k} style={{ position: "absolute", left: w * k - w * 0.12, top: w * 0.5, width: w * 0.24, height: w * 0.3, borderRadius: 30, background: "rgba(150,152,162,0.18)" }} />
      ))}
    </div>
  );
};

/* ───────────────────────── Тарелка (порция уменьшается) ───────────────────────── */
export const Plate: React.FC<{ at: number; end: number; x: number; y: number; shrinkAt: number; w?: number }> = ({ at, end, x, y, shrinkAt, w = 330 }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 12);
  const out = fall(frame, s2f(end));
  const k = interpolate(prog(frame, s2f(shrinkAt), 14, Easing.bezier(0.3, 1.4, 0.5, 1)), [0, 1], [1, 0.45]);
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - w * 0.36, width: w, height: w * 0.72, scale: String(s), opacity: out.o }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#F5F5F8", boxShadow: "0 20px 40px rgba(60,60,80,0.16), inset 0 0 0 18px #E6E7EC" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          width: w * 0.56,
          height: w * 0.34,
          translate: "-50% -50%",
          scale: String(k),
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%, #B9B2A8, #8E877E)",
        }}
      />
      {/* вилка и нож */}
      <div style={{ position: "absolute", left: -46, top: w * 0.08, width: 14, height: w * 0.56, borderRadius: 7, background: "#A3A5AD" }} />
      <div style={{ position: "absolute", right: -46, top: w * 0.08, width: 18, height: w * 0.56, borderRadius: 9, background: "#A3A5AD" }} />
    </div>
  );
};

/* ───────────────────────── Персонаж-силуэт ─────────────────────────
 * fat: 0 — подтянутый, 1 — полный. teal — «после», grey — «до». */
export const Figure: React.FC<{ fat: number; tone: "grey" | "teal"; h?: number; glow?: number }> = ({ fat, tone, h = 760, glow = 0 }) => {
  const frame = useCurrentFrame();
  const f = fat;
  const W = 400;
  const cx = 200;
  const sh = 74 + f * 22; // плечи
  const ch = 70 + f * 38; // грудь
  const wa = 52 + f * 88; // талия
  const hi = 82 + f * 82; // бёдра
  const torso = `M ${cx - sh} 205 Q ${cx} 190 ${cx + sh} 205 Q ${cx + ch + 8} 250 ${cx + ch} 300 Q ${cx + wa + 10} 360 ${cx + wa} 400 Q ${cx + hi + 6} 450 ${cx + hi} 520 L ${cx - hi} 520 Q ${cx - hi - 6} 450 ${cx - wa} 400 Q ${cx - wa - 10} 360 ${cx - ch} 300 Q ${cx - ch - 8} 250 ${cx - sh} 205 Z`;
  const th = 46 + f * 46; // бедро
  const legL = `M ${cx - hi} 515 Q ${cx - hi + 6} 640 ${cx - 70} 760 L ${cx - 56} 868 L ${cx - 26} 868 L ${cx - 22} 760 Q ${cx - 8} 620 ${cx - 4} 520 Z`;
  const legR = `M ${cx + hi} 515 Q ${cx + hi - 6} 640 ${cx + 70} 760 L ${cx + 56} 868 L ${cx + 26} 868 L ${cx + 22} 760 Q ${cx + 8} 620 ${cx + 4} 520 Z`;
  const arm = (s: 1 | -1) =>
    `M ${cx + s * sh} 210 Q ${cx + s * (sh + 30 + f * 20)} 260 ${cx + s * (ch + 22 + f * 10)} 380 L ${cx + s * (hi + 18)} 540 L ${cx + s * (hi - 4)} 548 L ${cx + s * (ch + 2)} 390 Q ${cx + s * (sh + 4)} 280 ${cx + s * (sh - 14)} 222 Z`;
  const teal = tone === "teal";
  const body = teal ? "url(#fg-teal)" : "url(#fg-grey)";
  const top = teal ? F.tealDark : "#7C858B";
  const skin = teal ? F.tealLight : "#A4ACB1";
  const hair = teal ? "#5B3A2E" : "#7A7F84";
  void th;
  return (
    <svg viewBox={`0 0 ${W} 900`} height={h} width={(h * W) / 900} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="fg-teal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={F.tealLight} />
          <stop offset="1" stopColor={F.teal} />
        </linearGradient>
        <linearGradient id="fg-grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9B0B5" />
          <stop offset="1" stopColor="#868F95" />
        </linearGradient>
        <clipPath id={`torso-${tone}`}>
          <path d={torso} />
        </clipPath>
      </defs>
      <ellipse cx={cx} cy={884} rx={150 + f * 40} ry={14} fill="rgba(40,60,70,0.12)" />
      <path d={arm(-1)} fill={skin} opacity={0.9} />
      <path d={arm(1)} fill={skin} opacity={0.9} />
      <path d={legL} fill={body} />
      <path d={legR} fill={body} />
      <path d={torso} fill={body} />
      {/* спортивный топ */}
      <g clipPath={`url(#torso-${tone})`}>
        <rect x={0} y={200} width={W} height={100} fill={top} />
        <rect x={0} y={470} width={W} height={60} fill={top} opacity={0.6} />
      </g>
      {/* шея и голова */}
      <rect x={cx - 17} y={150} width={34} height={58} rx={12} fill={skin} />
      <path d={`M ${cx - 62} 118 Q ${cx - 66} 30 ${cx} 26 Q ${cx + 66} 30 ${cx + 62} 118 L ${cx + 66} 190 L ${cx - 66} 190 Z`} fill={hair} />
      <ellipse cx={cx} cy={102} rx={48} ry={58} fill={skin} />
      <path d={`M ${cx - 52} 92 Q ${cx - 30} 40 ${cx + 10} 50 Q ${cx + 44} 56 ${cx + 52} 92 Q ${cx + 40} 60 ${cx} 64 Q ${cx - 36} 64 ${cx - 52} 92 Z`} fill={hair} />
      {/* пресс светится */}
      {glow > 0
        ? [0, 1].map((r) =>
            [0, 1].map((c) => (
              <rect
                key={`${r}${c}`}
                x={cx - 30 + c * 34}
                y={330 + r * 40}
                width={26}
                height={32}
                rx={9}
                fill="#E9FFFC"
                opacity={glow * (0.45 + 0.4 * Math.abs(Math.sin(frame / 7 + r + c)))}
              />
            )),
          )
        : null}
    </svg>
  );
};

/* ───────────────────────── Карточка с цифрами ───────────────────────── */
export type StatCol = {
  label: string;
  to: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  countAt?: number;
  countDur?: number;
  text?: string; // вместо числа — текст
};
export const StatCard: React.FC<{ at: number; end: number; y: number; cols: StatCol[]; labelTop?: boolean; numSize?: number; x0?: number; x1?: number }> = ({
  at,
  end,
  y,
  cols,
  labelTop = true,
  numSize = 92,
  x0 = 70,
  x1 = 70,
}) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const r = rise(frame, s2f(at), 12, 40);
  const out = fall(frame, s2f(end));
  return (
    <div
      style={{
        position: "absolute",
        left: x0,
        right: x1,
        top: y,
        borderRadius: 40,
        background: F.white,
        boxShadow: "0 24px 60px rgba(30,80,90,0.12)",
        display: "flex",
        padding: "34px 10px",
        ...r,
        opacity: r.opacity * out.o,
      }}
    >
      {cols.map((c, i) => {
        const p = prog(frame, s2f(c.countAt ?? at + 0.2), s2f(c.countDur ?? 0.9), countEase);
        const v = (c.from ?? 0) + (c.to - (c.from ?? 0)) * p;
        const num = (
          <div style={{ ...font(900, numSize, c.color ?? F.teal), lineHeight: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {c.text ?? `${c.prefix ?? ""}${fmt(v, c.decimals ?? 0)}`}
            {/* «%» — в размер цифры, слова («ккал», «кг») — мельче, чтобы число не переносилось */}
            {c.suffix ? (
              <span style={/[a-zа-яё]/i.test(c.suffix) ? { fontSize: numSize * 0.42, marginLeft: numSize * 0.06 } : undefined}>{c.suffix.trim()}</span>
            ) : null}
          </div>
        );
        const lab = <div style={{ ...font(600, 30, F.sub), margin: labelTop ? "0 0 12px" : "12px 0 0" }}>{c.label}</div>;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              borderLeft: i ? "2px solid #EDF0F2" : undefined,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {labelTop ? lab : null}
            {num}
            {!labelTop ? lab : null}
          </div>
        );
      })}
    </div>
  );
};

/* ───────────────────────── Иконки ───────────────────────── */
const I = {
  leaf: "M6 18 C6 9 12 4 20 4 C20 12 15 18 6 18 Z M6 18 L13 11",
  bolt: "M13 2 L5 13 H11 L10 22 L19 10 H13 Z",
  drop: "M12 3 C8 9 6 12 6 15 A6 6 0 0 0 18 15 C18 12 16 9 12 3 Z",
  steps: "M7 3 C9 3 10 6 10 9 C10 12 8 13 7 13 C5 13 4 11 4 8 C4 5 5 3 7 3 Z M15 10 C17 10 18 13 18 16 C18 19 16 20 15 20 C13 20 12 18 12 15 C12 12 13 10 15 10 Z",
  stairs: "M3 20 H8 V15 H13 V10 H18 V5 H21",
  broom: "M15 3 L9 13 M5 13 H13 L15 21 H3 Z",
  moon: "M20 14 A8 8 0 1 1 10 4 A6 6 0 0 0 20 14 Z",
  cup: "M5 6 H17 L15 21 H7 Z M17 9 H20 V14 H16",
  apple: "M12 7 C8 4 3 7 4 13 C5 19 9 21 12 19 C15 21 19 19 20 13 C21 7 16 4 12 7 Z M12 7 C12 5 13 3 15 2",
  check: "M5 12 L10 17 L19 7",
  cross: "M6 6 L18 18 M18 6 L6 18",
};
export type IconName = keyof typeof I;
export const Icon: React.FC<{ name: IconName; size?: number; color?: string; stroke?: number }> = ({ name, size = 40, color = F.teal, stroke = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={I[name]} />
  </svg>
);

/* ───────────────────────── Плашка-фича ───────────────────────── */
export const Chip: React.FC<{ at: number; end: number; x: number; y: number; w?: number; icon: IconName; label: string; dark?: boolean; iconColor?: string }> = ({
  at,
  end,
  x,
  y,
  w = 440,
  icon,
  label,
  iconColor,
}) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 11);
  const o = prog(frame, s2f(at), 5);
  const out = fall(frame, s2f(end));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: 118,
        borderRadius: 30,
        background: F.white,
        boxShadow: "0 14px 34px rgba(30,80,90,0.10)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 28px",
        scale: String(s),
        opacity: o * out.o,
        translate: `0 ${out.y}px`,
      }}
    >
      <div style={{ width: 66, height: 66, borderRadius: 20, background: F.tealPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={38} color={iconColor ?? F.tealDark} />
      </div>
      <div style={{ ...font(700, 36, F.ink) }}>{label}</div>
    </div>
  );
};

/** Пилюля «ДО» / «ПОСЛЕ» */
export const Pill: React.FC<{ at: number; end: number; x: number; y: number; text: string; filled?: boolean }> = ({ at, end, x, y, text, filled }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 10);
  const out = fall(frame, s2f(end));
  return (
    <div
      style={{
        position: "absolute",
        left: x - 100,
        top: y,
        width: 200,
        height: 64,
        borderRadius: 32,
        background: filled ? F.teal : F.white,
        boxShadow: "0 10px 24px rgba(30,80,90,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...font(800, 28, filled ? F.white : "#A0A3AA"),
        letterSpacing: "0.12em",
        scale: String(s),
        opacity: out.o,
      }}
    >
      {text}
    </div>
  );
};

/* ───────────────────────── Сканер «до → после» ───────────────────────── */
export const Transform: React.FC<{
  at: number; // появление серой фигуры
  scanAt: number; // старт скан-линии
  splitAt: number; // бирюзовая копия выезжает
  end: number;
  y: number;
  h?: number;
}> = ({ at, scanAt, splitAt, end, y, h = 720 }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const inP = rise(frame, s2f(at), 12, 30);
  const out = fall(frame, s2f(end));
  const scan = prog(frame, s2f(scanAt), 22, Easing.inOut(Easing.quad));
  const split = prog(frame, s2f(splitAt), 18, Easing.bezier(0.3, 1.2, 0.4, 1));
  const fw = (h * 400) / 900;
  const greyX = 540 - fw / 2 - split * 230;
  const tealX = 540 - fw / 2 + split * 230;
  const chev = prog(frame, s2f(splitAt) + 10, 8);
  const sparkle = (dx: number, dy: number, k: number) => {
    const t = (frame - s2f(splitAt) - 8 - k * 4) / 30;
    if (t < 0) return null;
    const a = Math.max(0, Math.sin(t * 3.2 + k));
    return (
      <div
        key={k}
        style={{
          position: "absolute",
          left: tealX + fw / 2 + dx,
          top: dy,
          width: 26,
          height: 26,
          translate: "-50% -50%",
          rotate: "45deg",
          scale: String(0.5 + a * 0.7),
          opacity: a,
          background: F.tealLight,
          clipPath: "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)",
        }}
      />
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1080, height: h + 40, ...inP, opacity: inP.opacity * out.o }}>
      {/* бирюзовая копия под серой — выезжает вправо */}
      <div style={{ position: "absolute", left: tealX, top: 0, opacity: split > 0 ? 1 : 0 }}>
        <Figure fat={interpolate(split, [0, 1], [1, 0.15])} tone="teal" h={h} glow={split} />
      </div>
      <div style={{ position: "absolute", left: greyX, top: 0 }}>
        <Figure fat={1} tone="grey" h={h} />
      </div>
      {/* скан-линия */}
      {scan > 0 && scan < 1 ? (
        <div
          style={{
            position: "absolute",
            left: 540 - fw * 0.7,
            width: fw * 1.4,
            top: scan * h,
            height: 10,
            borderRadius: 5,
            background: `linear-gradient(90deg, rgba(56,216,208,0), ${F.tealLight}, rgba(56,216,208,0))`,
            boxShadow: `0 0 30px ${F.tealLight}`,
          }}
        />
      ) : null}
      {/* стрелки » */}
      <div style={{ position: "absolute", left: 540 - 40, top: h * 0.42, opacity: chev, display: "flex", gap: 2 }}>
        {[0, 1].map((k) => (
          <svg key={k} width={42} height={64} viewBox="0 0 20 30" style={{ opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 8 - k)) }}>
            <path d="M4 4 L15 15 L4 26" stroke={F.tealLight} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>
      {/* сантиметр на талии */}
      {split > 0.6 ? (
        <svg style={{ position: "absolute", left: tealX, top: 0 }} width={fw} height={h} viewBox="0 0 400 900">
          <path d="M 135 402 Q 200 430 265 402" stroke={F.yellow} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="200" strokeDashoffset={200 * (1 - prog(frame, s2f(splitAt) + 12, 10))} />
        </svg>
      ) : null}
      {[
        [-150, 120, 0],
        [140, 260, 1],
        [-170, 480, 2],
        [150, 560, 3],
      ].map(([dx, dy, k]) => sparkle(dx, dy, k))}
    </div>
  );
};

/* ───────────────────────── Шкалы гормонов ───────────────────────── */
export const Meter: React.FC<{
  at: number;
  end: number;
  y: number;
  title: string;
  hint: string;
  from: number;
  to: number;
  moveAt: number;
  up: boolean;
}> = ({ at, end, y, title, hint, from, to, moveAt, up }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const r = rise(frame, s2f(at), 12, 30);
  const out = fall(frame, s2f(end));
  const p = prog(frame, s2f(moveAt), 22, Easing.bezier(0.3, 1.2, 0.4, 1));
  const v = from + (to - from) * p;
  const col = up ? F.coral : F.greyFig;
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: y,
        borderRadius: 36,
        background: F.white,
        boxShadow: "0 20px 50px rgba(30,80,90,0.10)",
        padding: "30px 40px",
        ...r,
        opacity: r.opacity * out.o,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ ...font(800, 44, F.ink) }}>
          {title} <span style={{ color: col }}>{up ? "↑" : "↓"}</span>
        </div>
        <div style={{ ...font(600, 30, F.sub) }}>{hint}</div>
      </div>
      <div style={{ marginTop: 22, height: 26, borderRadius: 13, background: "#EEF1F3", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", borderRadius: 13, background: up ? `linear-gradient(90deg, #F6A097, ${F.coral})` : `linear-gradient(90deg, #C4CBD0, ${F.greyFig})` }} />
      </div>
    </div>
  );
};

/* ───────────────────────── Кнопка-призыв с бликом ───────────────────────── */
export const CtaButton: React.FC<{ at: number; end: number; y: number; title: string; sub: string }> = ({ at, end, y, title, sub }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 12);
  const out = fall(frame, s2f(end));
  const shine = ((frame - s2f(at)) % 50) / 50;
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: y,
        height: 170,
        borderRadius: 85,
        background: `linear-gradient(90deg, ${F.tealLight}, ${F.teal} 60%, ${F.tealDark})`,
        boxShadow: "0 24px 50px rgba(32,192,176,0.35)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        scale: String(s),
        opacity: out.o,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          bottom: -40,
          width: 120,
          left: interpolate(shine, [0, 1], [-200, 1100]),
          rotate: "18deg",
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))",
        }}
      />
      <div style={{ ...font(900, 58, F.white) }}>{title}</div>
      <div style={{ ...font(600, 30, "rgba(255,255,255,0.92)"), marginTop: 4 }}>{sub}</div>
    </div>
  );
};

/** Галочка/крестик-штамп */
export const Stamp: React.FC<{ at: number; end: number; x: number; y: number; ok: boolean; size?: number }> = ({ at, end, x, y, ok, size = 120 }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = interpolate(prog(frame, s2f(at), 9, Easing.bezier(0.2, 1.6, 0.4, 1)), [0, 1], [1.8, 1]);
  const o = prog(frame, s2f(at), 4);
  const out = fall(frame, s2f(end));
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: ok ? F.teal : F.coral,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scale: String(s),
        opacity: o * out.o,
        boxShadow: "0 14px 30px rgba(0,0,0,0.15)",
      }}
    >
      <Icon name={ok ? "check" : "cross"} size={size * 0.55} color="white" stroke={3.4} />
    </div>
  );
};

/** Любой блок с pop-появлением и уходом */
export const PopIn: React.FC<{ at: number; end: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, end, style, children }) => {
  const frame = useCurrentFrame();
  if (!shown(frame, at, end)) return null;
  const s = pop(frame, s2f(at), 12);
  const o = prog(frame, s2f(at), 5);
  const out = fall(frame, s2f(end));
  return <div style={{ position: "absolute", ...style, scale: String(s), opacity: o * out.o, translate: `0 ${out.y}px` }}>{children}</div>;
};
