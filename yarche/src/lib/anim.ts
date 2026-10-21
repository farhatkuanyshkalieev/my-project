// Small animation toolkit shared by every scene: easing, keyframe tracks, noise.

export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const remap = (v: number, a: number, b: number, c: number, d: number) =>
  lerp(c, d, invLerp(a, b, v));

// Easing curves (t in 0..1)
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  smooth: (t: number) => t * t * (3 - 2 * t),
};
export type EaseFn = (t: number) => number;

// Animate between two frames with an easing curve.
export const tween = (
  frame: number,
  from: number,
  to: number,
  a: number,
  b: number,
  fn: EaseFn = ease.inOutCubic,
) => lerp(a, b, fn(invLerp(from, to, frame)));

// Keyframe track: [[frame, value, ease?], ...]
export type Key = [number, number, EaseFn?];
export const track = (frame: number, keys: Key[]) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, fn] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (frame <= f1) return lerp(v0, v1, (fn ?? ease.inOutCubic)(invLerp(f0, f1, frame)));
  }
  return keys[keys.length - 1][1];
};

// Damped spring step response (0 -> 1), physically plausible overshoot.
export const springT = (frame: number, start: number, stiffness = 120, damping = 12, mass = 1) => {
  const t = (frame - start) / FPS;
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
};

// Deterministic pseudo-random
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

// 1D value noise, smooth, deterministic
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rand(i + seed * 57.3) * 2 - 1, rand(i + 1 + seed * 57.3) * 2 - 1, u);
};
// fractal noise
export const fbm = (x: number, seed = 0, oct = 3) => {
  let v = 0;
  let amp = 0.5;
  let fr = 1;
  for (let o = 0; o < oct; o++) {
    v += amp * noise1(x * fr, seed + o * 13);
    amp *= 0.5;
    fr *= 2;
  }
  return v;
};

// Gentle handheld camera drift, in px/deg
export const handheld = (frame: number, seed: number, amt = 1) => ({
  x: fbm(frame / 70, seed) * 9 * amt,
  y: fbm(frame / 80, seed + 5) * 6 * amt,
  r: fbm(frame / 95, seed + 9) * 0.35 * amt,
});

// Periodic blink: returns 0..1 closure. Blinks every ~3-5 s, each ~9 frames.
export const blink = (frame: number, seed: number) => {
  const period = 200 + Math.floor(rand(seed) * 90);
  const local = (frame + Math.floor(rand(seed + 3) * period)) % period;
  const dur = 10;
  if (local > dur) return 0;
  const t = local / dur;
  return t < 0.4 ? ease.outQuad(t / 0.4) : 1 - ease.inOutQuad((t - 0.4) / 0.6);
};

export const mix = (a: string, b: string, t: number) => {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const hex = (h: string) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
