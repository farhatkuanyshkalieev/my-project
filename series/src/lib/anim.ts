import {Easing} from 'remotion';

export const FPS = 60;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutCubic: Easing.inOut(Easing.cubic),
  outCubic: Easing.out(Easing.cubic),
  inCubic: Easing.in(Easing.cubic),
  outBack: (t: number) => {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inOutQuint: (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
};

/** 0..1 progress of `t` through [start, start + dur], eased. */
export const prog = (t: number, start: number, dur: number, fn: (x: number) => number = ease.outExpo) =>
  fn(clamp((t - start) / dur));

/** Damped spring response that starts at `start` (seconds). Goes 0 -> 1 with overshoot. */
export const springAt = (t: number, start: number, stiffness = 14, damping = 0.32) => {
  const x = t - start;
  if (x <= 0) return 0;
  return 1 - Math.exp(-x * stiffness * damping) * Math.cos(x * stiffness);
};

/** Deterministic hash -> [0,1). */
export const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rand(i + seed * 101) * 2 - 1, rand(i + 1 + seed * 101) * 2 - 1, u);
};

/** Decaying camera shake triggered at `start`. */
export const shake = (t: number, start: number, amp = 30, decay = 7, freq = 38) => {
  const x = t - start;
  if (x < 0 || x > 2) return {x: 0, y: 0, r: 0};
  const k = amp * Math.exp(-x * decay);
  return {
    x: noise1(x * freq, 1) * k,
    y: noise1(x * freq, 2) * k,
    r: noise1(x * freq, 3) * k * 0.04,
  };
};

export const sumShake = (...s: {x: number; y: number; r: number}[]) =>
  s.reduce((a, b) => ({x: a.x + b.x, y: a.y + b.y, r: a.r + b.r}), {x: 0, y: 0, r: 0});

/** Piecewise linear lookup over [[t, v], ...]. */
export const track = (t: number, keys: number[][], fn: (x: number) => number = ease.inOutCubic) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return lerp(v0, v1, fn((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
};

export const fmtMoney = (v: number) =>
  '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const fmtInt = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Typewriter: first n chars of s at time t. */
export const typed = (s: string, t: number, start: number, cps = 28) =>
  s.slice(0, Math.max(0, Math.floor((t - start) * cps)));
