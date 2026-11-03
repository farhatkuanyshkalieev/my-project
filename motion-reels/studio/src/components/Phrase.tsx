import React from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { blurOut, prog, s2f } from "../lib/anim";
import { C, SCRIPT, textStyle } from "../lib/theme";

/**
 * Фраза, которая «дописывается» слово за словом.
 * Разметка текста:
 *   *слово*      — бордовый акцент
 *   ~слова~      — бордовый рукописный скрипт (своей строкой, внахлёст на строку выше)
 *   |            — перенос строки
 * Каждое слово появляется через blur-in серым и за пару кадров темнеет.
 * Раскладка фиксирована сразу (как в референсе): строка не «ездит», слова проявляются на своих местах.
 */
type Kind = "n" | "accent" | "script";
type Tok = { text: string; kind: Kind; at: number };

export type PhraseProps = {
  text: string;
  at: number; // сек, появление первого слова
  end: number; // сек, начало ухода
  gap?: number; // сек между словами
  times?: number[]; // ручные тайминги слов (сек), перекрывают gap
  y?: number; // центр по вертикали, px
  size?: number;
  dark?: boolean;
  scriptSize?: number;
  exit?: "blur" | "none";
};

const parse = (text: string): (Tok | "br")[] => {
  const out: (Tok | "br")[] = [];
  const re = /~([^~]+)~|\*([^*]+)\*|(\|)|([^\s|]+)/g;
  const src = text.replace(/\|/g, " | ");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[1]) out.push({ text: m[1], kind: "script", at: 0 });
    else if (m[2]) out.push({ text: m[2], kind: "accent", at: 0 });
    else if (m[3]) out.push("br");
    else out.push({ text: m[4], kind: "n", at: 0 });
  }
  return out;
};

export const Phrase: React.FC<PhraseProps> = ({
  text,
  at,
  end,
  gap = 0.27,
  times,
  y = 880,
  size = 78,
  dark = false,
  scriptSize,
  exit = "blur",
}) => {
  const frame = useCurrentFrame();
  const startF = s2f(at);
  const endF = s2f(end);
  if (frame < startF - 1 || frame > endF + 8) return null;

  const toks = parse(text);
  let i = 0;
  for (const t of toks) {
    if (t === "br") continue;
    t.at = times?.[i] ?? at + i * gap + (t.kind === "script" ? 0.08 : 0);
    i++;
  }

  // Строки: обычные + скриптовые (каждый скрипт-токен — своя строка)
  const lines: { toks: Tok[]; script: boolean }[] = [{ toks: [], script: false }];
  for (const t of toks) {
    const cur = lines[lines.length - 1];
    if (t === "br") lines.push({ toks: [], script: false });
    else if (t.kind === "script") {
      lines.push({ toks: [t], script: true });
      lines.push({ toks: [], script: false });
    } else cur.toks.push(t);
  }
  const visibleLines = lines.filter((l) => l.toks.length);

  const out = exit === "blur" ? blurOut(frame, endF, 6) : { opacity: 1, blur: 0 };
  const inkFrom = dark ? "#77737A" : C.grey;
  const inkTo = dark ? C.white : C.ink;
  const wineTo = dark ? "#D9667D" : C.wineText;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        translate: "0 -50%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 80px",
        opacity: out.opacity,
        filter: `blur(${out.blur}px)`,
        ...textStyle,
        fontSize: size,
      }}
    >
      {visibleLines.map((line, li) =>
        line.script ? (
          <ScriptWord key={li} tok={line.toks[0]} size={scriptSize ?? size * 1.25} color={wineTo} />
        ) : (
          <div key={li} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.24em" }}>
            {line.toks.map((t, ti) => {
              const f0 = s2f(t.at);
              const p = prog(frame, f0, 9);
              const c = prog(frame, f0 + 4, 8);
              const color =
                t.kind === "accent"
                  ? interpolateColors(c, [0, 1], [dark ? "#8C6A72" : "#C9A3AC", wineTo])
                  : interpolateColors(c, [0, 1], [inkFrom, inkTo]);
              return (
                <span
                  key={ti}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    color,
                    opacity: p,
                    filter: `blur(${(1 - p) * 20}px)`,
                    scale: String(1.12 - 0.12 * p),
                    translate: `0 ${(1 - p) * 10}px`,
                  }}
                >
                  {t.text}
                </span>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
};

/** Рукописное слово: «пишется» маской слева направо, лежит внахлёст на строку выше */
const ScriptWord: React.FC<{ tok: Tok; size: number; color: string }> = ({ tok, size, color }) => {
  const frame = useCurrentFrame();
  const f0 = s2f(tok.at);
  const w = prog(frame, f0, 16, (t) => t); // равномерная «рука»
  const o = prog(frame, f0, 4);
  return (
    <div
      style={{
        fontFamily: `'${SCRIPT}', cursive`,
        fontWeight: 400,
        letterSpacing: 0,
        fontSize: size,
        lineHeight: 1,
        color,
        marginTop: -size * 0.42,
        marginBottom: -size * 0.12,
        rotate: "-4deg",
        translate: `${size * 0.35}px 0`,
        opacity: o,
        clipPath: `inset(-20% ${(1 - w) * 100}% -20% -5%)`,
        whiteSpace: "nowrap",
      }}
    >
      {tok.text}
    </div>
  );
};
