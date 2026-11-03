import { Easing, interpolate } from "remotion";

export const FPS = 30;
export const s2f = (s: number) => Math.round(s * FPS);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const outCubic = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 за `dur` кадров начиная с кадра `start` */
export const prog = (frame: number, start: number, dur: number, easing = outCubic) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing });

/** Пружинный «поп» с перелётом: 0 → 1.08 → 1 */
export const pop = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur * 0.6, start + dur], [0, 1.08, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });

/** Blur-in появление (основа всего стиля) */
export const blurIn = (frame: number, start: number, dur = 9) => {
  const p = prog(frame, start, dur);
  return {
    opacity: p,
    filter: `blur(${(1 - p) * 22}px)`,
    scale: String(1.14 - 0.14 * p),
  };
};

/** Blur-out уход */
export const blurOut = (frame: number, start: number, dur = 6) => {
  const p = prog(frame, start, dur, Easing.in(Easing.cubic));
  return { opacity: 1 - p, blur: p * 16 };
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Число с пробелами-разделителями: 7700 → «7 700» */
export const fmt = (n: number, decimals = 0) => {
  const fixed = n.toFixed(decimals).replace(".", ",");
  const [int, dec] = fixed.split(",");
  const spaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec ? `${spaced},${dec}` : spaced;
};

/** Кривая счётчиков: быстро набирает, долго «докручивает» последние значения */
export const countEase = Easing.bezier(0.25, 0.8, 0.3, 1);
export const ringEase = Easing.bezier(0.3, 0.6, 0.3, 1);

/**
 * Моменты тиков для счётчика: тик на каждой 1/n шкалы по той же кривой, что и цифры.
 * Пока число летит — тики частые, к концу редеют (как барабан слот-машины).
 */
export const countTicks = (at: number, dur: number, n: number, ease: (t: number) => number, minGap = 0.06) => {
  const out: number[] = [];
  let last = -1;
  for (let k = 1; k <= n; k++) {
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      if (ease(mid) < k / n) lo = mid;
      else hi = mid;
    }
    const t = at + hi * dur;
    if (t - last >= minGap) {
      out.push(t);
      last = t;
    }
  }
  return out;
};
