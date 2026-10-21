// Facial expression model shared by both characters.
import {ease, invLerp, lerp} from '../lib/anim';

export type Expr = {
  browL: number; // raise -1..1
  browR: number;
  browIn: number; // inner corners: + = sad/worried, - = angry/focused
  lid: number; // upper lid closure 0 open .. 1 shut (negative = wide)
  squint: number; // lower lid raise 0..1
  gazeX: number; // -1..1
  gazeY: number;
  smile: number; // -1 frown .. 1 smile
  open: number; // jaw open 0..1 (added to speech)
  wide: number; // mouth width: -1 "o" .. 1 wide "ee"
  cheek: number; // cheek raise / blush boost 0..1
  tilt: number; // head roll deg
  turn: number; // head yaw -1..1
  nod: number; // head pitch -1..1 (+ down)
  lean: number; // body lean -1..1
};

export const NEUTRAL: Expr = {
  browL: 0, browR: 0, browIn: 0, lid: 0.18, squint: 0, gazeX: 0, gazeY: 0,
  smile: 0, open: 0, wide: 0, cheek: 0, tilt: 0, turn: 0, nod: 0, lean: 0,
};

const E = (p: Partial<Expr>): Expr => ({...NEUTRAL, ...p});

export const EXPR = {
  neutral: NEUTRAL,
  cool: E({lid: 0.42, browL: -0.15, browR: 0.1, smile: 0.12}),
  smirk: E({lid: 0.35, browL: 0.35, browR: -0.1, smile: 0.55, cheek: 0.3, tilt: -3}),
  happy: E({lid: 0.1, browL: 0.35, browR: 0.35, smile: 0.85, cheek: 0.6, squint: 0.35, wide: 0.4}),
  laugh: E({lid: 0.35, browL: 0.5, browR: 0.5, browIn: 0.25, smile: 1, open: 0.55, cheek: 1, squint: 0.75, wide: 0.6, tilt: 5, nod: -0.4}),
  delighted: E({lid: -0.12, browL: 0.7, browR: 0.7, smile: 0.8, open: 0.25, cheek: 0.7, wide: 0.4}),
  soft: E({lid: 0.32, browL: 0.25, browR: 0.25, browIn: 0.3, smile: 0.35, cheek: 0.45, tilt: 6, gazeY: 0.1}),
  warm: E({lid: 0.28, browL: 0.2, browR: 0.25, browIn: 0.15, smile: 0.6, cheek: 0.5, squint: 0.25, tilt: -4}),
  excited: E({lid: -0.2, browL: 0.9, browR: 0.9, smile: 0.9, open: 0.2, cheek: 0.6, wide: 0.5}),
  cautious: E({lid: 0.3, browL: 0.15, browR: -0.15, browIn: 0.2, smile: -0.05, gazeX: -0.4, gazeY: 0.15, tilt: -3}),
  doubt: E({lid: 0.38, browL: 0.45, browR: -0.25, browIn: -0.1, smile: -0.2, wide: -0.2}),
  deflate: E({lid: 0.45, browL: 0.15, browR: 0.15, browIn: 0.55, smile: -0.15, gazeY: 0.45, nod: 0.25}),
  firm: E({lid: 0.38, browL: -0.2, browR: -0.2, browIn: -0.35, smile: -0.25, cheek: 0}),
  tired: E({lid: 0.6, browL: -0.2, browR: -0.15, browIn: 0.1, smile: -0.2, gazeY: 0.3, nod: 0.15}),
  hurt: E({lid: 0.42, browL: 0.25, browR: 0.25, browIn: 0.75, smile: -0.35, gazeY: 0.5, nod: 0.3}),
  empty: E({lid: 0.55, browL: -0.05, browR: -0.05, browIn: 0.2, smile: -0.15, gazeY: 0.25, gazeX: 0.15}),
  nostalgic: E({lid: 0.35, browL: 0.3, browR: 0.3, browIn: 0.5, smile: 0.25, gazeY: 0.45, tilt: 7, nod: 0.2}),
  sad: E({lid: 0.45, browL: 0.35, browR: 0.35, browIn: 0.9, smile: -0.45, gazeY: 0.2, cheek: 0.2}),
  surprised: E({lid: -0.3, browL: 1, browR: 1, smile: 0, open: 0.35, wide: -0.6}),
  grin: E({lid: 0.05, browL: 0.45, browR: 0.45, smile: 1, open: 0.32, cheek: 0.8, squint: 0.4, wide: 0.9}),
  shocked: E({lid: -0.35, browL: 0.9, browR: 0.9, browIn: 0.5, smile: -0.3, open: 0.3, wide: -0.4}),
  crying: E({lid: 0.5, browL: 0.5, browR: 0.5, browIn: 1, smile: -0.6, open: 0.15, cheek: 0.5, squint: 0.4, nod: 0.2}),
  pleading: E({lid: 0.1, browL: 0.6, browR: 0.6, browIn: 0.9, smile: -0.3, open: 0.1}),
} satisfies Record<string, Expr>;
export type ExprName = keyof typeof EXPR;

export const blendExpr = (a: Expr, b: Expr, t: number): Expr => {
  const out = {} as Expr;
  (Object.keys(a) as (keyof Expr)[]).forEach((k) => (out[k] = lerp(a[k], b[k], t)));
  return out;
};

export const addExpr = (a: Expr, b: Partial<Expr>): Expr => {
  const out = {...a};
  (Object.keys(b) as (keyof Expr)[]).forEach((k) => (out[k] = a[k] + (b[k] ?? 0)));
  return out;
};

// Expression timeline: [[frame, name or Expr, transitionFrames?]]
export type ExprKey = [number, ExprName | Partial<Expr>, number?];
export const exprAt = (frame: number, keys: ExprKey[]): Expr => {
  const resolve = (v: ExprName | Partial<Expr>) => (typeof v === 'string' ? EXPR[v] : {...NEUTRAL, ...v});
  let cur = resolve(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [f, v, d = 14] = keys[i];
    if (frame < f) break;
    const t = ease.inOutCubic(invLerp(f, f + d, frame));
    cur = blendExpr(cur, resolve(v), t);
  }
  return cur;
};
