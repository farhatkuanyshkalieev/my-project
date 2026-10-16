'use strict';
// «От идеи к движению» — deterministic motion piece.
// Every frame is a pure function of time t (seconds), so frames can be
// rendered in any order / in parallel workers.

const W = 1920, H = 1080, CX = W / 2, CY = H / 2, FPS = 60, DUR = 20, BEAT = 0.5;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- palette
const ICE = [150, 214, 255];
const BLUE = [80, 130, 255];
const DEEP = [26, 52, 120];
const STEEL = [140, 162, 200];
const WHITE = [228, 238, 255];
const WARM = [255, 156, 64];   // the single warm accent: the idea
const HOT = [255, 238, 214];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(4)})`;
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---------------------------------------------------------------- timeline
const T = {
  powerOn: 1.40, boot: 1.62, dot: 2.50, hb: [2.95, 3.22],
  push: [3.0, 4.5], cross: 4.5, circle: 5.0, ring2: 5.3, ring3: 5.6, grid: 5.0, hud: 5.0,
  shapes: [6.0, 6.5, 7.0, 7.5], morph: [6.0, 6.5, 7.0, 7.5],
  timeline: 6.0, ease: 6.2, osc: 8.5,
  groove: [8.0, 15.0], hats: [10.0, 15.0], arp: [10.0, 15.0],
  ico: 8.0, plexus: 8.5, spiral: 8.0, tilt: [8.0, 10.0],
  tunnel: [12.0, 15.0],
  words: [[12.0, 'ТОЧКА'], [12.5, 'ЛИНИЯ'], [13.0, 'ФОРМА'], [13.5, 'ОБЪЁМ'], [14.0, 'РИТМ'], [14.5, 'ИМПУЛЬС']],
  glitch: [12.0, 13.0, 14.0, 14.5],
  riser: [13.5, 15.93], implode: [15.0, 15.95], impact: 16.0,
  dotTo: [16.14, 16.52], dotWrite: [16.52, 17.36], sub: 17.4, sweep: [18.1, 19.0], fade: [19.5, 20.0],
};

// ---------------------------------------------------------------- utils
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutQuint: x => x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
  outQuart: x => 1 - Math.pow(1 - x, 4),
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
};
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const frac = x => x - Math.floor(x);
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// time since the most recent beat of a grid starting at a (until b); Infinity if none
function beatAge(t, a, b, step = BEAT) {
  if (t < a) return Infinity;
  let k = Math.floor((t - a) / step + 1e-9);
  const kmax = Math.ceil((b - a) / step - 1e-9) - 1;
  k = Math.min(k, kmax);
  return t - (a + k * step);
}
const kickPulse = t => Math.exp(-beatAge(t, T.groove[0], T.groove[1]) * 9);

// ---------------------------------------------------------------- 3D
function rot3(p, ax, ay, az) {
  let x = p[0], y = p[1], z = p[2];
  let c = Math.cos(ax), s = Math.sin(ax);
  let y1 = y * c - z * s, z1 = y * s + z * c; y = y1; z = z1;
  c = Math.cos(ay); s = Math.sin(ay);
  let x1 = x * c + z * s; z1 = -x * s + z * c; x = x1; z = z1;
  c = Math.cos(az); s = Math.sin(az);
  x1 = x * c - y * s; y1 = x * s + y * c;
  return [x1, y1, z];
}
function proj(p, f = 1200) { const k = f / (f + p[2]); return [CX + p[0] * k, CY + p[1] * k, k, p[2]]; }

// ---------------------------------------------------------------- canvases
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const scr = mk(W, H), sctx = scr.getContext('2d');
const tmp = mk(W, H), tctx = tmp.getContext('2d');
const b1 = mk(480, 270), b1c = b1.getContext('2d');
const b2 = mk(240, 135), b2c = b2.getContext('2d');
const vig = mk(W, H);
const grains = [];

// ---------------------------------------------------------------- precomputed data
const R = rng(20261016);
const ROOM = {};
const ICO = (() => {
  const p = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
  const n = Math.hypot(1, p);
  const vn = v.map(q => q.map(x => x / n));
  const e = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    const d = Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
    if (Math.abs(d - 2) < 1e-6) e.push([i, j]);
  }
  return { v: vn, e };
})();
const FIB = (() => {
  const a = []; const N = 220;
  for (let i = 0; i < N; i++) {
    const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    a.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  return a;
})();
const NODES = [];
const SPIRAL = [];
const STREAKS = [];
const BURST = [];
const DUST = [];
let TITLE = null, SUB = null;
const EVENTS = [];

function initData() {
  // room
  const r = rng(7);
  ROOM.stars = [...Array(46)].map(() => ({ x: 130 + r() * 320, y: 160 + r() * 280, s: r() * 1.3 + 0.4, p: r() * TAU }));
  ROOM.city = [];
  let x = 126;
  while (x < 456) {
    const w = 16 + r() * 34, h = 40 + r() * 120;
    const wins = [];
    for (let yy = 620 - h + 8; yy < 612; yy += 9) for (let xx = x + 4; xx < x + w - 4; xx += 7) if (r() < 0.16) wins.push([xx, yy, r()]);
    ROOM.city.push({ x, w, h, wins });
    x += w + 2 + r() * 6;
  }
  ROOM.dust = [...Array(110)].map(() => ({ u: r(), v: r(), s: r() * 1.5 + 0.5, sp: r() * 0.4 + 0.1, p: r() * TAU }));
  ROOM.leaves = [...Array(11)].map((_, i) => ({ a: -2.75 + i * 0.22 + (r() - 0.5) * 0.18, l: 70 + r() * 70, w: 16 + r() * 10, p: r() * TAU }));
  ROOM.books = [];
  x = 1520;
  while (x < 1720) { const w = 12 + r() * 16, h = 60 + r() * 50; ROOM.books.push({ x, w, h, lean: r() < 0.15 ? -0.18 : 0 }); x += w + 2; }

  // orbit nodes: 0..3 carry the primitive shapes, 4.. join the network later
  for (let i = 0; i < 18; i++) {
    if (i < 4) NODES.push({ r: 340, ph: Math.PI * 1.25 + i * Math.PI / 2, w: 0.3, ax: 0, ay: 0, born: T.shapes[i], sides: [3, 4, 5, 6][i] });
    else NODES.push({ r: 250 + R() * 360, ph: R() * TAU, w: (0.25 + R() * 0.35) * (R() < 0.5 ? -1 : 1), ax: 0.5 + R() * 0.9, ay: (R() - 0.5) * 1.2, born: T.plexus + (i - 4) * 0.11, sides: 0 });
  }
  for (let i = 0; i < 380; i++) SPIRAL.push({ te: T.spiral + i * (7 / 380), th: R() * TAU, s: 0.8 + R() * 1.8, sp: 0.8 + R() * 0.6, w: R() < 0.25 });
  for (let i = 0; i < 110; i++) STREAKS.push({ th: R() * TAU, s: 15.12 + R() * 0.68, d: 0.22 + R() * 0.12, w: 0.6 + R() * 1.4 });
  for (let i = 0; i < 190; i++) BURST.push({ th: R() * TAU, v: 500 + R() * 1500, w: R() < 0.32, s: 0.7 + R() * 1.6 });
  for (let i = 0; i < 90; i++) DUST.push({ x: R() * W, y: R() * H, s: 0.5 + R() * 1.4, vx: (R() - 0.5) * 12, vy: -4 - R() * 10, p: R() * TAU });

  // vignette
  const vc = vig.getContext('2d');
  const g = vc.createRadialGradient(CX, CY, 300, CX, CY, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.65, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
  vc.fillStyle = g; vc.fillRect(0, 0, W, H);

  // film grain tiles
  for (let k = 0; k < 4; k++) {
    const c = mk(512, 512), gc = c.getContext('2d');
    const id = gc.createImageData(512, 512); const rr = rng(100 + k);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = (rr() + rr() + rr()) / 3 * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    gc.putImageData(id, 0, 0); grains.push(c);
  }
  initTitle();
  buildEvents();
}

// ---------------------------------------------------------------- title layout
const TITLE_TEXT = 'От идеи к движению';
const SUB_TEXT = 'MOTION DESIGN  ·  SHOWREEL 2026';
function initTitle() {
  const c = tctx;
  c.save();
  c.font = '700 100px "Inter Display"'; c.letterSpacing = '-2px';
  const w100 = c.measureText(TITLE_TEXT).width;
  const size = Math.min(150, Math.round(1420 / w100 * 100));
  c.font = `700 ${size}px "Inter Display"`; c.letterSpacing = `${-size * 0.02}px`;
  const w = c.measureText(TITLE_TEXT).width;
  const x0 = CX - w / 2;
  const chars = [];
  for (let i = 0; i < TITLE_TEXT.length; i++) {
    const xa = c.measureText(TITLE_TEXT.slice(0, i)).width;
    const xb = c.measureText(TITLE_TEXT.slice(0, i + 1)).width;
    chars.push({ ch: TITLE_TEXT[i], x: x0 + xa, cx: x0 + (xa + xb) / 2 });
  }
  const base = 548, lineY = 600;
  const lx0 = x0 - 30, lx1 = x0 + w + 30;
  // dot writes the line left -> right; a letter rises when the dot passes it
  const dotX = tt => lerp(lx0, lx1, E.inOutCubic(prog(tt, T.dotWrite[0], T.dotWrite[1])));
  for (const ch of chars) {
    let tt = T.dotWrite[0];
    while (tt < T.dotWrite[1] && dotX(tt) < ch.cx) tt += 1 / 600;
    ch.rt = tt - 0.04;
  }
  TITLE = { size, w, x0, base, lineY, lx0, lx1, chars, dotX };

  c.font = '500 22px "Inter"'; c.letterSpacing = '9px';
  const sw = c.measureText(SUB_TEXT).width;
  const sx0 = CX - sw / 2;
  SUB = [];
  for (let i = 0; i < SUB_TEXT.length; i++) SUB.push({ ch: SUB_TEXT[i], x: sx0 + c.measureText(SUB_TEXT.slice(0, i)).width, st: T.sub + i * 0.022 + 0.18 });
  c.restore();
}

// ---------------------------------------------------------------- audio cue sheet (consumed by audio.py)
const BOOT = ['> motion.core  v2.6', '> calibrating time ........ ok', '> waiting for an idea_'];
const LABELS = [
  { t0: 5.4, t1: 11.7, title: '01 — ТОЧКА', sub: 'x 960 · y 540', side: 1, tx: 1180, ty: 392, anchor: t => ringPoint(t, -0.75) },
  { t0: 6.05, t1: 11.7, title: '02 — ЛИНИЯ', sub: '0° · 90° · 180° · 270°', side: -1, tx: 690, ty: 470, anchor: () => [520, 540] },
  { t0: 6.9, t1: 11.7, title: '03 — ФОРМА', sub: '3 · 4 · 5 · 6', side: 1, tx: 0, ty: 0, follow: 1 },
  { t0: 8.55, t1: 11.7, title: '04 — ОБЪЁМ', sub: '12 вершин · 30 рёбер', side: -1, tx: 760, ty: 300, anchor: t => icoTop(t) },
  { t0: 10.05, t1: 11.7, title: '05 — РИТМ', sub: '120 BPM · 4/4', side: 1, tx: 1210, ty: 760, anchor: () => [1080, 640] },
];
const KEYS = [1.4, 2.5, 4.5, 5.0, 5.4, 6.0, 6.5, 7.0, 7.5, 8.0, 10.0, 12.0, 13.0, 14.0, 15.0, 16.0];
const typeRate = 46;

function buildEvents() {
  const ev = EVENTS;
  ev.push({ t: T.powerOn, type: 'powerOn' });
  BOOT.forEach((s, i) => { for (let k = 0; k < s.length; k++) if (s[k] !== ' ') ev.push({ t: T.boot + i * 0.24 + k / 70, type: 'tick', g: 0.5 }); });
  ev.push({ t: T.dot, type: 'dot' });
  T.hb.forEach((h, i) => ev.push({ t: h, type: 'heartbeat', g: i ? 0.7 : 1 }));
  ev.push({ t: T.push[0], type: 'push', end: T.push[1] });
  ev.push({ t: T.cross, type: 'cross' });
  ev.push({ t: T.circle, type: 'circle' });
  ev.push({ t: T.ring2, type: 'ring', n: 0 }); ev.push({ t: T.ring3, type: 'ring', n: 1 });
  LABELS.forEach(L => {
    ev.push({ t: L.t0, type: 'blip' });
    const s = L.title + L.sub;
    for (let k = 0; k < s.length; k++) if (s[k] !== ' ') ev.push({ t: L.t0 + 0.2 + k / typeRate, type: 'tick', g: 0.35 });
  });
  T.shapes.forEach((s, i) => ev.push({ t: s, type: 'pluck', n: i }));
  T.morph.slice(1).forEach(s => ev.push({ t: s + 0.02, type: 'morph' }));
  ev.push({ t: T.ico, type: 'ico' });
  for (let b = T.groove[0]; b < T.groove[1] - 1e-6; b += BEAT) ev.push({ t: b, type: 'kick' });
  for (let b = T.hats[0] + BEAT / 2; b < T.hats[1]; b += BEAT) ev.push({ t: b, type: 'hat', g: 1 });
  for (let b = 12.0 + BEAT / 4; b < 15.0; b += BEAT / 2) ev.push({ t: b, type: 'hat', g: 0.45 });
  for (let b = T.arp[0]; b < T.arp[1] - 1e-6; b += BEAT / 4) ev.push({ t: b, type: 'arp', i: Math.round((b - T.arp[0]) / (BEAT / 4)) });
  for (let b = 8.0; b < 15.9; b += 2.0) ev.push({ t: b, type: 'bass', bar: Math.round((b - 8) / 2) });
  T.words.forEach(([t0], i) => ev.push({ t: t0, type: 'word', i }));
  T.glitch.forEach(g => ev.push({ t: g, type: 'glitch' }));
  ev.push({ t: T.riser[0], type: 'riser', end: T.riser[1] });
  ev.push({ t: T.implode[0], type: 'suck', end: T.implode[1] });
  ev.push({ t: T.impact, type: 'impact' });
  ev.push({ t: T.dotTo[0], type: 'swoosh', end: T.dotTo[1] });
  ev.push({ t: T.dotWrite[0], type: 'write', end: T.dotWrite[1] });
  TITLE.chars.forEach((c, i) => { if (c.ch !== ' ') ev.push({ t: c.rt, type: 'letter', i }); });
  SUB.forEach(s => { if (s.ch !== ' ') ev.push({ t: s.st, type: 'tick', g: 0.22 }); });
  ev.push({ t: T.sweep[0], type: 'shine', end: T.sweep[1] });
  ev.push({ t: T.impact, type: 'pad', end: DUR });
  ev.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- shared motion functions
const tiltK = t => E.inOutCubic(prog(t, T.tilt[0], T.tilt[1]));
const tau = t => (t - 6) + 0.09 * Math.max(0, t - 8) ** 2 + 0.28 * Math.max(0, t - 12) ** 2;

function ringR(t, i) {
  const base = [110, 180, 260][i], big = [232, 330, 430][i];
  return lerp(base, big, E.outExpo(prog(t, T.ico - 0.05 + i * 0.06, T.ico + 0.75 + i * 0.06)));
}
function ringAngles(t, i) {
  const k = tiltK(t), dt = Math.max(0, t - T.tilt[0]);
  if (i === 0) return [1.15 * k + 0.25 * Math.sin(dt * 0.9) * k, 0.55 * k * Math.sin(dt * 0.6), -0.4 * (t - 5)];
  if (i === 1) return [0.75 * k, -0.9 * k + 0.35 * Math.sin(dt * 0.7) * k, 0.25 * (t - 5)];
  return [1.18 * k, 0.12 * k, 0.08 * (t - 5)];
}
function ringPoint(t, th) {
  const r = ringR(t, 0), a = ringAngles(t, 0);
  const p = proj(rot3([r * Math.cos(th), r * Math.sin(th), 0], a[0], a[1], 0));
  return [p[0], p[1]];
}
function icoR(t) {
  return 150 * E.outBack(prog(t, T.ico, T.ico + 0.6)) * (1 + 0.07 * kickPulse(t)) * (1 - 0.3 * E.inOutCubic(prog(t, 12, 13)));
}
function icoRot(t) { const d = Math.max(0, t - T.ico); return [d * 0.55 + 0.05 * d * d, d * 0.8 + 0.4, 0.2 * d]; }
function icoTop(t) {
  const a = icoRot(t), r = icoR(t);
  let best = null;
  for (const v of ICO.v) { const p = proj(rot3([v[0] * r, v[1] * r, v[2] * r], a[0], a[1], a[2])); if (!best || p[1] < best[1]) best = p; }
  return [best[0], best[1]];
}
function nodePos(t, i) {
  const n = NODES[i];
  const th = n.ph + n.w * tau(t);
  const p0 = [n.r * Math.cos(th), n.r * Math.sin(th), 0];
  let p;
  if (i < 4) p = rot3(p0, 1.08 * tiltK(t), 0.1 * tiltK(t), 0);
  else p = rot3(p0, n.ax * (0.4 + 0.6 * tiltK(t)), n.ay, 0);
  return proj(p);
}

// ---------------------------------------------------------------- drawing primitives
function polyPts(n, r, rot) { const a = []; for (let i = 0; i < n; i++) { const th = rot + i / n * TAU; a.push([Math.cos(th) * r, Math.sin(th) * r]); } return a; }
function resample(pts, N) { // points along closed polygon perimeter
  const seg = []; let L = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push([a, b, l]); L += l; }
  const res = [];
  for (let k = 0; k < N; k++) {
    let d = k / N * L;
    for (const [a, b, l] of seg) { if (d <= l) { res.push([lerp(a[0], b[0], d / l), lerp(a[1], b[1], d / l)]); break; } d -= l; }
  }
  return res;
}
function strokePartial(c, pts, p, closed = true) {
  const n = pts.length + (closed ? 1 : 0) - 1;
  const lim = n * clamp(p);
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= Math.floor(lim); i++) { const q = pts[i % pts.length]; c.lineTo(q[0], q[1]); }
  const f = lim - Math.floor(lim);
  if (f > 0 && Math.floor(lim) < n) {
    const a = pts[Math.floor(lim) % pts.length], b = pts[(Math.floor(lim) + 1) % pts.length];
    c.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f));
  }
  c.stroke();
}
function ring3d(c, r, ang, p, alpha, width, color, dash, dashOff) {
  const n = 200, m = Math.max(1, Math.floor(n * clamp(p)));
  const front = new Path2D(), back = new Path2D();
  let prev = null, last = null;
  for (let i = 0; i <= m; i++) {
    const th = -Math.PI / 2 + i / n * TAU;
    const q = proj(rot3([r * Math.cos(th), r * Math.sin(th), 0], ang[0], ang[1], ang[2]));
    const isB = q[3] > 0;
    if (prev === null) (isB ? back : front).moveTo(q[0], q[1]);
    else if (isB !== prev) { (prev ? back : front).lineTo(q[0], q[1]); (isB ? back : front).moveTo(q[0], q[1]); }
    else (isB ? back : front).lineTo(q[0], q[1]);
    prev = isB; last = q;
  }
  c.lineWidth = width;
  if (dash) { c.setLineDash(dash); c.lineDashOffset = dashOff || 0; }
  c.strokeStyle = rgba(color, alpha * 0.32); c.stroke(back);
  c.strokeStyle = rgba(color, alpha); c.stroke(front);
  c.setLineDash([]);
  return last;
}
function glowDot(c, x, y, r, glow, inten, col = WARM) {
  const g = c.createRadialGradient(x, y, 0, x, y, glow);
  g.addColorStop(0, rgba(col, 0.55 * inten));
  g.addColorStop(0.18, rgba(col, 0.22 * inten));
  g.addColorStop(0.5, rgba(col, 0.06 * inten));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, glow, 0, TAU); c.fill();
  c.fillStyle = rgba(col, Math.min(1, inten));
  c.beginPath(); c.arc(x, y, r * 1.35, 0, TAU); c.fill();
  c.fillStyle = rgba(HOT, Math.min(1, inten));
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
const MONO = n => `400 ${n}px "DejaVu Sans Mono"`;
const SCR = '01<>/\\|_-+*#=ABCDEFGHKMNPRSTXZ';
function scrambleChar(seed) { return SCR[Math.floor(hash(seed) * SCR.length)]; }

// ---------------------------------------------------------------- room
function screenLight(t) {
  if (t < T.powerOn) return 0;
  const a = t - T.powerOn;
  let L = a < 0.07 ? a / 0.07 * 1.9 : 0.72 + 1.18 * Math.exp(-(a - 0.07) * 6.5);
  if (a < 0.55) {
    const f = Math.sin(a * 151) * Math.sin(a * 73 + 1);
    if (f > 0.35) L *= 0.55 + 0.3 * (a / 0.55);
  }
  return L;
}
function dotState(t) {
  if (t < T.dot) return null;
  let r = 10 * E.outBack(prog(t, T.dot, T.dot + 0.35));
  let glow = 95, inten = Math.min(1, prog(t, T.dot, T.dot + 0.12) * 1.4);
  for (const h of T.hb) if (t > h) { const e = Math.exp(-(t - h) * 12); r *= 1 + 0.45 * e; glow *= 1 + 0.4 * e; }
  r *= 1 + 0.3 * kickPulse(t);
  glow *= 1 + 0.25 * kickPulse(t);
  const ip = E.inExpo(prog(t, T.implode[0], T.implode[1]));
  r *= 1 + 0.6 * ip; glow *= 1 + 2.2 * ip; inten *= 1 + 0.7 * ip;
  return { r, glow, inten };
}
function drawRoom(c, t) {
  const L = screenLight(t);
  const ds = dotState(t);
  const Lw = ds ? 0.5 * ds.inten * (ds.r / 10) : 0;
  const S = ROOM;
  c.fillStyle = '#04060b'; c.fillRect(-400, -400, W + 800, H + 800);
  let g = c.createRadialGradient(240, 360, 0, 240, 360, 1000);
  g.addColorStop(0, 'rgba(46,74,132,0.20)'); g.addColorStop(1, 'rgba(46,74,132,0)');
  c.fillStyle = g; c.fillRect(-400, -400, W + 800, H + 800);
  if (L > 0) {
    g = c.createRadialGradient(960, 470, 100, 960, 470, 1100);
    g.addColorStop(0, rgba([70, 120, 210], 0.34 * L)); g.addColorStop(0.45, rgba([40, 80, 170], 0.12 * L)); g.addColorStop(1, 'rgba(30,60,140,0)');
    c.fillStyle = g; c.fillRect(-400, -400, W + 800, H + 800);
  }
  // ---- window
  g = c.createLinearGradient(0, 150, 0, 620);
  g.addColorStop(0, '#0a142c'); g.addColorStop(0.75, '#112141'); g.addColorStop(1, '#16294d');
  c.fillStyle = g; c.fillRect(120, 150, 340, 470);
  for (const s of S.stars) { c.fillStyle = rgba(WHITE, 0.35 + 0.35 * Math.sin(t * 2.2 + s.p)); c.fillRect(s.x, s.y, s.s, s.s); }
  g = c.createRadialGradient(205, 235, 0, 205, 235, 140);
  g.addColorStop(0, 'rgba(190,215,255,0.35)'); g.addColorStop(1, 'rgba(190,215,255,0)');
  c.fillStyle = g; c.fillRect(120, 150, 340, 470);
  c.fillStyle = '#dbe7ff'; c.beginPath(); c.arc(205, 235, 19, 0, TAU); c.fill();
  c.fillStyle = 'rgba(160,185,230,0.35)'; c.beginPath(); c.arc(199, 231, 4, 0, TAU); c.arc(212, 242, 3, 0, TAU); c.fill();
  for (const b of S.city) {
    c.fillStyle = '#050810'; c.fillRect(b.x, 620 - b.h, b.w, b.h);
    for (const w of b.wins) { c.fillStyle = rgba([150, 190, 255], 0.18 + 0.25 * w[2] * (0.7 + 0.3 * Math.sin(t * 0.7 + w[2] * 20))); c.fillRect(w[0], w[1], 2, 3); }
  }
  c.fillStyle = '#020306';
  c.fillRect(110, 140, 360, 12); c.fillRect(110, 618, 360, 14); c.fillRect(110, 140, 12, 490); c.fillRect(458, 140, 12, 490);
  c.fillRect(285, 150, 10, 470); c.fillRect(120, 380, 340, 9);
  c.fillStyle = 'rgba(120,150,210,0.10)'; c.fillRect(104, 630, 372, 3);
  // ---- desk
  g = c.createLinearGradient(0, 780, 0, 1080);
  g.addColorStop(0, '#080b13'); g.addColorStop(1, '#020306');
  c.fillStyle = g; c.fillRect(-400, 780, W + 800, 700);
  c.fillStyle = rgba(ICE, 0.04 + 0.12 * L); c.fillRect(-400, 779, W + 800, 1.5);
  // moon beam + patch
  g = c.createLinearGradient(300, 170, 600, 1080);
  g.addColorStop(0, 'rgba(120,160,230,0.05)'); g.addColorStop(1, 'rgba(120,160,230,0.015)');
  c.fillStyle = g; c.beginPath(); c.moveTo(140, 170); c.lineTo(455, 170); c.lineTo(860, 1080); c.lineTo(330, 1080); c.closePath(); c.fill();
  c.fillStyle = 'rgba(110,150,225,0.07)';
  c.beginPath(); c.moveTo(340, 800); c.lineTo(640, 800); c.lineTo(770, 1080); c.lineTo(390, 1080); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(2,3,6,0.6)'; c.lineWidth = 7;
  c.beginPath(); c.moveTo(492, 800); c.lineTo(578, 1080); c.moveTo(355, 925); c.lineTo(690, 925); c.stroke();
  for (const d of S.dust) {
    const v = frac(d.v - t * 0.012 * d.sp), u = d.u + 0.02 * Math.sin(t * 0.5 + d.p);
    const y = lerp(170, 1060, v), xl = lerp(140, 330, v), xr = lerp(455, 860, v);
    const x = lerp(xl, xr, u);
    c.fillStyle = rgba([180, 205, 255], 0.22 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.p)) * Math.sin(Math.PI * v));
    c.fillRect(x, y, d.s, d.s);
  }
  // screen light pool on desk
  if (L > 0) {
    c.save(); c.translate(960, 792); c.scale(1, 0.2);
    g = c.createRadialGradient(0, 0, 0, 0, 0, 900);
    g.addColorStop(0, rgba([90, 150, 240], 0.30 * L)); g.addColorStop(1, 'rgba(90,150,240,0)');
    c.fillStyle = g; c.fillRect(-900, -900, 1800, 1800); c.restore();
  }
  if (Lw > 0) {
    c.save(); c.translate(960, 790); c.scale(1, 0.25);
    g = c.createRadialGradient(0, 0, 0, 0, 0, 380);
    g.addColorStop(0, rgba(WARM, 0.09 * Lw)); g.addColorStop(1, rgba(WARM, 0));
    c.fillStyle = g; c.fillRect(-400, -400, 800, 800); c.restore();
  }
  // ---- shelf + books
  c.fillStyle = '#05070c'; c.fillRect(1500, 330, 330, 9);
  c.fillStyle = rgba(ICE, 0.05 + 0.12 * L); c.fillRect(1500, 330, 330, 1);
  for (const b of S.books) {
    c.save(); c.translate(b.x, 330); c.rotate(b.lean);
    c.fillStyle = '#060810'; c.fillRect(0, -b.h, b.w, b.h);
    c.fillStyle = rgba(ICE, 0.035 + 0.11 * L); c.fillRect(0, -b.h, 1.2, b.h);
    c.restore();
  }
  c.strokeStyle = rgba(ICE, 0.05 + 0.15 * L); c.lineWidth = 1.2;
  c.beginPath(); c.arc(1775, 304, 24, 0, TAU); c.stroke();
  // ---- plant
  c.fillStyle = '#05070b';
  c.beginPath(); c.moveTo(1600, 712); c.lineTo(1700, 712); c.lineTo(1690, 790); c.lineTo(1610, 790); c.closePath(); c.fill();
  c.fillStyle = rgba(ICE, 0.05 + 0.14 * L); c.fillRect(1600, 712, 100, 1.4);
  for (const lf of S.leaves) {
    const a = lf.a + 0.03 * Math.sin(t * 0.8 + lf.p);
    c.save(); c.translate(1650, 712); c.rotate(a);
    c.beginPath(); c.ellipse(lf.l / 2, 0, lf.l / 2, lf.w / 2, 0, 0, TAU);
    c.fillStyle = '#04060a'; c.fill();
    c.strokeStyle = rgba(ICE, 0.03 + 0.12 * L); c.lineWidth = 1; c.stroke();
    c.restore();
  }
  // ---- monitor
  c.fillStyle = '#06080c';
  c.beginPath(); c.moveTo(928, 724); c.lineTo(992, 724); c.lineTo(1004, 792); c.lineTo(916, 792); c.closePath(); c.fill();
  c.fillStyle = rgba(ICE, 0.05 + 0.10 * L); c.fillRect(916, 724, 1.5, 68);
  c.beginPath(); c.ellipse(960, 796, 175, 13, 0, 0, TAU); c.fillStyle = '#06080d'; c.fill();
  c.strokeStyle = rgba(ICE, 0.05 + 0.22 * L); c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(960, 795, 174, 12, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.fillStyle = '#07090e';
  c.beginPath(); c.roundRect(538, 226, 844, 498, 12); c.fill();
  c.strokeStyle = rgba(ICE, 0.05 + 0.16 * L); c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(538, 226, 844, 498, 12); c.stroke();
  // screen image
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(scr, 560, 245, 800, 450);
  // glass: reflection + scanlines
  g = c.createLinearGradient(560, 245, 1100, 695);
  g.addColorStop(0, 'rgba(170,195,240,0.06)'); g.addColorStop(0.5, 'rgba(170,195,240,0.015)'); g.addColorStop(1, 'rgba(170,195,240,0)');
  c.fillStyle = g; c.fillRect(560, 245, 800, 450);
  const sl = 0.30 * Math.sin(Math.PI * prog(t, 3.25, 4.46)) ** 1.5;
  if (sl > 0.002) {
    c.fillStyle = `rgba(0,0,0,${sl})`;
    for (let y = 245; y < 695; y += 2.5) c.fillRect(560, y, 800, 0.9);
  }
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3; c.strokeRect(561.5, 246.5, 797, 447);
  // ---- keyboard
  const kb = (u, v) => [lerp(lerp(690, 1230, u), lerp(650, 1270, u), v), lerp(850, 942, v)];
  const quad = (u0, v0, u1, v1) => { const a = kb(u0, v0), b = kb(u1, v0), d = kb(u1, v1), e = kb(u0, v1); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...e); c.closePath(); };
  quad(-0.02, -0.08, 1.02, 1.06); c.fillStyle = '#05070b'; c.fill();
  c.strokeStyle = rgba(ICE, 0.05 + 0.22 * L); c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(...kb(-0.02, -0.08)); c.lineTo(...kb(1.02, -0.08)); c.stroke();
  for (let row = 0; row < 5; row++) {
    const v0 = (row + 0.14) / 5, v1 = (row + 0.84) / 5;
    const keys = row === 4 ? [[0, 1.4], [1.5, 2.9], [3.0, 11.0], [11.1, 12.5], [12.6, 15]] : [...Array(15)].map((_, k) => [k, k + 1]);
    for (const [k0, k1] of keys) {
      const u0 = (k0 + 0.1) / 15, u1 = (k1 - 0.1) / 15;
      quad(u0, v0, u1, v1); c.fillStyle = '#0a0d15'; c.fill();
      const a = kb(u0, v0), b = kb(u1, v0);
      const lit = (0.04 + 0.30 * L * (1 - row * 0.15)) * (1 - 0.5 * Math.abs((u0 + u1) / 2 - 0.5));
      c.strokeStyle = rgba(ICE, lit); c.lineWidth = 1;
      c.beginPath(); c.moveTo(a[0], a[1] + 0.5); c.lineTo(b[0], b[1] + 0.5); c.stroke();
    }
  }
  // ---- mouse
  c.beginPath(); c.ellipse(1392, 905, 32, 20, 0.05, 0, TAU); c.fillStyle = '#06080d'; c.fill();
  c.strokeStyle = rgba(ICE, 0.04 + 0.22 * L); c.beginPath(); c.ellipse(1392, 904, 31, 19, 0.05, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  // ---- mug (moonlit) + steam
  c.fillStyle = '#05070c'; c.fillRect(442, 822, 58, 76);
  c.beginPath(); c.ellipse(471, 898, 29, 7, 0, 0, Math.PI); c.fill();
  c.strokeStyle = '#05070c'; c.lineWidth = 7; c.beginPath(); c.arc(442, 858, 15, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
  c.strokeStyle = 'rgba(140,170,230,0.32)'; c.lineWidth = 1.3; c.beginPath(); c.ellipse(471, 822, 29, 6, 0, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(140,170,230,0.10)'; c.fillRect(492, 824, 7, 72);
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const v = i / 40, y = 815 - v * 150;
      const x = 462 + k * 9 + Math.sin(v * 6 + t * 1.3 + k * 2) * 10 * v + Math.sin(v * 13 - t * 2 + k) * 3 * v;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = `rgba(150,180,235,${0.05 + 0.02 * Math.sin(t + k)})`; c.lineWidth = 3; c.stroke();
  }
}

// ---------------------------------------------------------------- screen world layers
function drawBG(c, t) {
  c.fillStyle = '#03050b'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, CY, 0, CX, CY, 1100);
  const k = t >= T.impact ? 0.8 : 1;
  g.addColorStop(0, rgba([16, 30, 62], 0.9 * k)); g.addColorStop(0.55, rgba([8, 15, 34], 0.6 * k)); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

function drawGrid(c, t) {
  if (t < T.grid || t > 13) return;
  const rev = E.outCubic(prog(t, T.grid, T.grid + 1.5)) * 1600;
  const a = 0.98 * tiltK(t);
  const fade = 1 - prog(t, 12.0, 12.7);
  const SP = 80, N = 16;
  const scroll = t > 9 ? ((t - 9) * 70 + Math.max(0, t - 10.5) ** 2 * 110) % SP : 0;
  const ca = Math.cos(a), sa = Math.sin(a);
  const P = (x, y) => { const yy = y + scroll; const p = [x, yy * ca + 210 * tiltK(t), -yy * sa]; return proj(p, 1200); };
  // lines
  c.lineWidth = 1;
  for (let i = -N; i <= N; i++) {
    const v = i * SP;
    const a1 = P(v, -N * SP), b1 = P(v, N * SP);
    const a2 = P(-N * SP, v), b2 = P(N * SP, v);
    c.strokeStyle = rgba(BLUE, 0.07 * fade * clamp(rev / 900));
    c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]); c.stroke();
  }
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    const x = i * SP, y = j * SP;
    const d = Math.hypot(x, y);
    const m = clamp((rev - d) / 220);
    if (m <= 0) continue;
    const p = P(x, y);
    const al = 0.5 * m * fade * clamp(p[2] * 1.4 - 0.15);
    if (al < 0.01) continue;
    const s = 2.2 * Math.min(2, p[2]);
    c.fillStyle = rgba(ICE, al); c.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
  }
}

function drawCross(c, t) {
  if (t < T.cross) return;
  const fade = (1 - 0.65 * prog(t, 8, 9)) * (1 - prog(t, 11.8, 12.3));
  if (fade <= 0) return;
  const ph = E.outExpo(prog(t, T.cross, T.cross + 0.7)), pv = E.outExpo(prog(t, T.cross + 0.08, T.cross + 0.78));
  const L = 1250, g0 = 22;
  c.lineWidth = 1.2; c.strokeStyle = rgba(ICE, 0.5 * fade);
  c.beginPath();
  c.moveTo(CX - g0, CY); c.lineTo(CX - g0 - L * ph, CY); c.moveTo(CX + g0, CY); c.lineTo(CX + g0 + L * ph, CY);
  c.moveTo(CX, CY - g0); c.lineTo(CX, CY - g0 - L * pv); c.moveTo(CX, CY + g0); c.lineTo(CX, CY + g0 + L * pv);
  c.stroke();
  c.strokeStyle = rgba(ICE, 0.3 * fade); c.beginPath();
  for (let d = 40; d < L * ph; d += 40) { const s = d % 200 === 0 ? 9 : 4; c.moveTo(CX + d, CY - s); c.lineTo(CX + d, CY + s); c.moveTo(CX - d, CY - s); c.lineTo(CX - d, CY + s); }
  for (let d = 40; d < L * pv; d += 40) { const s = d % 200 === 0 ? 9 : 4; c.moveTo(CX - s, CY + d); c.lineTo(CX + s, CY + d); c.moveTo(CX - s, CY - d); c.lineTo(CX + s, CY - d); }
  c.stroke();
  if (ph < 0.995) { // comet heads
    c.fillStyle = rgba(WHITE, (1 - ph) * fade);
    for (const [x, y] of [[CX - g0 - L * ph, CY], [CX + g0 + L * ph, CY], [CX, CY - g0 - L * pv], [CX, CY + g0 + L * pv]]) { c.beginPath(); c.arc(x, y, 2.5, 0, TAU); c.fill(); }
  }
}

function drawRings(c, t) {
  if (t < T.circle) return;
  const fadeOut = 1 - prog(t, 12.6, 13.4);
  if (fadeOut <= 0) return;
  // ring 1: solid, draws on
  const p1 = E.inOutCubic(prog(t, T.circle, T.circle + 0.75));
  const last = ring3d(c, ringR(t, 0), ringAngles(t, 0), p1, 0.85 * fadeOut, 1.8, ICE);
  if (p1 < 1 && last) { glowDot(c, last[0], last[1], 2.5, 18, 1, ICE); }
  // ring 2: dashed, spinning
  if (t > T.ring2) {
    const p2 = E.outCubic(prog(t, T.ring2, T.ring2 + 0.8));
    ring3d(c, ringR(t, 1), ringAngles(t, 1), p2, 0.5 * fadeOut, 1.2, ICE, [2, 10], -t * 40);
  }
  // ring 3: dial with ticks
  if (t > T.ring3) {
    const p3 = E.outCubic(prog(t, T.ring3, T.ring3 + 0.9));
    const r = ringR(t, 2), ang = ringAngles(t, 2);
    ring3d(c, r, ang, p3, 0.32 * fadeOut, 1, STEEL);
    const n = 96, m = Math.floor(n * p3);
    c.lineWidth = 1;
    const fr = new Path2D(), bk = new Path2D();
    for (let i = 0; i < m; i++) {
      const th = -Math.PI / 2 + i / n * TAU;
      const len = i % 8 === 0 ? 16 : 6;
      const a = proj(rot3([r * Math.cos(th), r * Math.sin(th), 0], ang[0], ang[1], ang[2]));
      const b = proj(rot3([(r + len) * Math.cos(th), (r + len) * Math.sin(th), 0], ang[0], ang[1], ang[2]));
      const P = a[3] > 0 ? bk : fr; P.moveTo(a[0], a[1]); P.lineTo(b[0], b[1]);
    }
    c.strokeStyle = rgba(ICE, 0.18 * fadeOut); c.stroke(bk);
    c.strokeStyle = rgba(ICE, 0.55 * fadeOut); c.stroke(fr);
  }
}

function drawMorph(c, t) {
  if (t < T.morph[0] || t > 8.4) return;
  const seq = [3, 4, 5, 6];
  let k = 0; for (let i = 0; i < 4; i++) if (t >= T.morph[i]) k = i;
  const r = 62;
  const N = 120;
  const A = resample(polyPts(seq[Math.max(0, k - 1)], r, -Math.PI / 2), N);
  const B = resample(polyPts(seq[k], r, -Math.PI / 2), N);
  const m = k === 0 ? 1 : E.outExpo(prog(t, T.morph[k], T.morph[k] + 0.35));
  const rot = (t - T.morph[0]) * 0.6 + k * 0.4 * E.outExpo(prog(t, T.morph[k], T.morph[k] + 0.5));
  const pts = A.map((a, i) => { const x = lerp(a[0], B[i][0], m), y = lerp(a[1], B[i][1], m); return [CX + x * Math.cos(rot) - y * Math.sin(rot), CY + x * Math.sin(rot) + y * Math.cos(rot)]; });
  const draw = E.inOutCubic(prog(t, T.morph[0], T.morph[0] + 0.45));
  const out = 1 - prog(t, 8.0, 8.35);
  c.strokeStyle = rgba(WHITE, 0.85 * out); c.lineWidth = 1.6;
  strokePartial(c, pts, draw);
  // vertices of the target shape
  c.fillStyle = rgba(ICE, 0.9 * out * m);
  for (let i = 0; i < N; i += N / seq[k]) { const p = pts[Math.round(i) % N]; c.fillRect(p[0] - 2.5, p[1] - 2.5, 5, 5); }
}

function drawNodes(c, t) {
  if (t < T.shapes[0]) return;
  const fade = 1 - prog(t, 12.6, 13.3);
  if (fade <= 0) return;
  const P = NODES.map((n, i) => (t >= n.born ? nodePos(t, i) : null));
  const app = NODES.map(n => E.outExpo(prog(t, n.born, n.born + 0.5)));
  // plexus
  c.lineWidth = 1;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    if (!P[i] || !P[j] || t < T.plexus) continue;
    const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
    if (d > 330) continue;
    const al = (1 - d / 330) * 0.4 * Math.min(app[i], app[j]) * fade * clamp((Math.min(P[i][2], P[j][2]) - 0.6) * 2);
    c.strokeStyle = rgba(BLUE, al); c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[j][0], P[j][1]); c.stroke();
  }
  // spokes from centre + nodes
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; if (!p) continue;
    const a = app[i] * fade, dep = clamp(p[2] * 1.2 - 0.3);
    const sp = E.outExpo(prog(t, NODES[i].born, NODES[i].born + 0.35));
    const ang = Math.atan2(p[1] - CY, p[0] - CX);
    const r0 = i < 4 ? 120 : 30;
    const sx = CX + Math.cos(ang) * r0, sy = CY + Math.sin(ang) * r0;
    c.strokeStyle = rgba(ICE, (i < 4 ? 0.35 : 0.12) * a * dep);
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(lerp(sx, p[0], sp), lerp(sy, p[1], sp)); c.stroke();
    const n = NODES[i];
    if (n.sides) {
      const s = 40 * p[2] * E.outBack(prog(t, n.born + 0.1, n.born + 0.45));
      const pts = polyPts(n.sides, s, -Math.PI / 2 + (t - n.born) * 0.9 * (i % 2 ? -1 : 1)).map(q => [p[0] + q[0], p[1] + q[1]]);
      c.strokeStyle = rgba(WHITE, 0.9 * a * dep); c.lineWidth = 1.6;
      strokePartial(c, pts, E.inOutCubic(prog(t, n.born + 0.05, n.born + 0.5)));
      c.lineWidth = 1;
      c.fillStyle = rgba(ICE, 0.9 * a * dep); c.fillRect(p[0] - 2, p[1] - 2, 4, 4);
    } else {
      const s = 5 * p[2];
      c.strokeStyle = rgba(ICE, 0.85 * a * dep); c.strokeRect(p[0] - s, p[1] - s, s * 2, s * 2);
      if (i % 3 === 0) {
        c.font = MONO(11); c.fillStyle = rgba(STEEL, 0.6 * a * dep);
        c.fillText(`${(p[0] - CX).toFixed(0)},${(p[1] - CY).toFixed(0)}`, p[0] + 10, p[1] - 8);
      }
    }
  }
}

function drawIco(c, t) {
  if (t < T.ico) return;
  const r = icoR(t);
  if (r < 1) return;
  const [ax, ay, az] = icoRot(t);
  const fade = 1 - prog(t, 14.6, 15.2) * 0.4;
  const V = ICO.v.map(v => proj(rot3([v[0] * r, v[1] * r, v[2] * r], ax, ay, az)));
  c.lineWidth = 1.5;
  for (const [i, j] of ICO.e) {
    const z = (V[i][3] + V[j][3]) / 2 / r;
    c.strokeStyle = rgba(WHITE, (0.55 - 0.42 * z) * fade);
    c.beginPath(); c.moveTo(V[i][0], V[i][1]); c.lineTo(V[j][0], V[j][1]); c.stroke();
  }
  for (const p of V) { const z = p[3] / r; c.fillStyle = rgba(ICE, (0.95 - 0.6 * z) * fade); c.beginPath(); c.arc(p[0], p[1], 3 * p[2], 0, TAU); c.fill(); }
  // point sphere shell
  const R2 = r * 1.55;
  const d = t - T.ico;
  for (const f of FIB) {
    const p = proj(rot3([f[0] * R2, f[1] * R2, f[2] * R2], -d * 0.3, -d * 0.5 - 0.04 * d * d, 0));
    const z = p[3] / R2;
    c.fillStyle = rgba(ICE, (0.55 - 0.45 * z) * fade);
    const s = 1.7 * p[2];
    c.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
  }
}

function drawSpiral(c, t) {
  if (t < T.spiral || t > 15.6) return;
  const life = 2.4;
  for (const s of SPIRAL) {
    const a = t - s.te;
    if (a < 0 || a > life) continue;
    const r = 40 + Math.pow(a, 1.35) * 300 * s.sp;
    const th = s.th + a * 1.25 + (t - 8) * 0.15;
    const x = CX + Math.cos(th) * r, y = CY + Math.sin(th) * r * (1 - 0.35 * tiltK(t));
    const al = Math.sin(Math.PI * a / life) * 0.7;
    c.fillStyle = rgba(s.w ? WHITE : ICE, al);
    c.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s);
  }
}

function drawTunnel(c, t) {
  if (t < T.tunnel[0] - 0.2 || t > T.tunnel[1] + 1) return;
  const fin = E.outCubic(prog(t, T.tunnel[0] - 0.2, T.tunnel[0] + 0.5));
  const d = Math.max(0, t - T.tunnel[0]);
  const D = d * 1100 + d * d * 260;
  const L = 4200, n = 18, S = 520, f = 700;
  const items = [];
  for (let k = 0; k < n; k++) {
    let z = ((k * L / n - D) % L + L) % L;
    items.push({ z, k });
  }
  items.sort((a, b) => b.z - a.z);
  for (const it of items) {
    const z = it.z;
    const s = f / (f + z);
    const zf = clamp(z / 260) * (1 - z / L);
    const rot = z * 0.0007 + d * 0.5;
    const half = S * s;
    const al = zf * fin * (it.k % 4 === 0 ? 0.9 : 0.4);
    if (al < 0.01) continue;
    c.save(); c.translate(CX, CY); c.rotate(rot);
    c.strokeStyle = rgba(it.k % 4 === 0 ? WHITE : ICE, al); c.lineWidth = (it.k % 4 === 0 ? 2.2 : 1.2) * Math.max(0.6, s);
    c.strokeRect(-half * 1.6, -half, half * 3.2, half * 2);
    if (it.k % 4 === 0) {
      c.fillStyle = rgba(ICE, al);
      for (const [x, y] of [[-1.6, -1], [1.6, -1], [1.6, 1], [-1.6, 1]]) c.fillRect(x * half - 3, y * half - 3, 6, 6);
    }
    c.restore();
  }
  // perspective rails
  c.strokeStyle = rgba(BLUE, 0.18 * fin); c.lineWidth = 1;
  c.beginPath();
  for (const [x, y] of [[-1.6, -1], [1.6, -1], [1.6, 1], [-1.6, 1]]) { c.moveTo(CX + x * S * 0.15, CY + y * S * 0.15); c.lineTo(CX + x * S * 3, CY + y * S * 3); }
  c.stroke();
}

function drawWords(c, t) {
  for (let i = 0; i < T.words.length; i++) {
    const [t0, word] = T.words[i];
    const t1 = i < T.words.length - 1 ? T.words[i + 1][0] : 15.2;
    if (t < t0 || t >= t1) continue;
    const lt = t - t0;
    c.save();
    const sc = lerp(1.1, 1.0, E.outExpo(clamp(lt / 0.45)));
    c.translate(CX, CY + 10); c.scale(sc, sc);
    c.font = `900 ${i === 5 ? 250 : 290}px "Inter Display"`; c.letterSpacing = '6px';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const solid = Math.exp(-lt * 9);
    const bands = 3, hh = 360;
    for (let b = 0; b < bands; b++) {
      const off = (b - 1) * 140 * (1 - E.outExpo(clamp(lt / 0.32))) * (i % 2 ? -1 : 1);
      c.save();
      c.beginPath(); c.rect(-1200, -hh / 2 + b * hh / bands, 2400, hh / bands); c.clip();
      c.translate(off, 0);
      c.fillStyle = rgba(WHITE, 0.08 + 0.7 * solid);
      c.fillText(word, 0, 0);
      c.strokeStyle = rgba(ICE, 0.6); c.lineWidth = 2;
      c.strokeText(word, 0, 0);
      c.restore();
    }
    c.restore();
    // caption
    c.font = MONO(15); c.letterSpacing = '4px'; c.textAlign = 'center';
    c.fillStyle = rgba(STEEL, 0.75);
    c.fillText(`[ ${String(i + 1).padStart(2, '0')} / 06 ]`, CX, CY + 210);
    c.letterSpacing = '0px'; c.textAlign = 'left';
  }
}

function drawLabels(c, t) {
  for (const L of LABELS) {
    if (t < L.t0) continue;
    const out = 1 - prog(t, L.t1, L.t1 + 0.3);
    if (out <= 0) continue;
    let ax, ay, tx = L.tx, ty = L.ty;
    if (L.follow !== undefined) { const p = nodePos(t, L.follow); ax = p[0] + 30; ay = p[1] - 30; tx = ax + 70; ty = ay - 46; }
    else[ax, ay] = L.anchor(t);
    const p = E.outExpo(prog(t, L.t0, L.t0 + 0.45));
    c.save(); c.globalAlpha = out;
    c.font = MONO(18); c.letterSpacing = '2px';
    const tw = c.measureText(L.title).width + 10;
    const side = L.side;
    const ex = tx - side * 26;
    // path: anchor -> elbow -> under text
    const pts = [[ax, ay], [ex, ty], [tx + side * tw, ty]];
    const l1 = Math.hypot(ex - ax, ty - ay), l2 = tw + 26;
    const dl = (l1 + l2) * p;
    c.strokeStyle = rgba(ICE, 0.7); c.lineWidth = 1;
    c.beginPath(); c.moveTo(ax, ay);
    if (dl <= l1) c.lineTo(lerp(ax, ex, dl / l1), lerp(ay, ty, dl / l1));
    else { c.lineTo(ex, ty); c.lineTo(lerp(ex, pts[2][0], (dl - l1) / l2), ty); }
    c.stroke();
    const s = 4.5 * E.outBack(prog(t, L.t0, L.t0 + 0.3));
    c.beginPath(); c.arc(ax, ay, s, 0, TAU); c.stroke();
    c.fillStyle = rgba(WHITE, 1); c.fillRect(ax - 1.5, ay - 1.5, 3, 3);
    // typed text
    const n = Math.floor((t - L.t0 - 0.2) * typeRate);
    const fr = Math.floor(t * 30);
    const show = (str, k) => { if (k <= 0) return ''; const v = str.slice(0, Math.min(k, str.length)); return k < str.length ? v.slice(0, -1) + scrambleChar(fr + k) : v; };
    c.textAlign = side > 0 ? 'left' : 'right';
    c.fillStyle = rgba(WHITE, 0.95);
    const xt = side > 0 ? tx : tx;
    c.fillText(show(L.title, n), xt, ty - 10);
    c.font = MONO(13); c.letterSpacing = '1px'; c.fillStyle = rgba(STEEL, 0.85);
    c.fillText(show(L.sub, n - L.title.length), xt, ty + 22);
    c.restore();
  }
}

function timecode(t) {
  const f = Math.min(1199, Math.floor(t * FPS + 1e-6));
  const s = Math.floor(f / 60), fr = f % 60;
  return `00:00:${String(s).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
}
function brackets(c, x0, y0, x1, y1, len, p) {
  const l = len * p;
  c.beginPath();
  c.moveTo(x0, y0 + l); c.lineTo(x0, y0); c.lineTo(x0 + l, y0);
  c.moveTo(x1 - l, y0); c.lineTo(x1, y0); c.lineTo(x1, y0 + l);
  c.moveTo(x1, y1 - l); c.lineTo(x1, y1); c.lineTo(x1 - l, y1);
  c.moveTo(x0 + l, y1); c.lineTo(x0, y1); c.lineTo(x0, y1 - l);
  c.stroke();
}
function drawHUD(c, t) {
  if (t < T.hud) return;
  const a = E.outCubic(prog(t, T.hud, T.hud + 0.6));
  c.save();
  c.strokeStyle = rgba(ICE, 0.45 * a); c.lineWidth = 1.2;
  brackets(c, 36, 36, W - 36, H - 36, 34, E.outExpo(prog(t, T.hud, T.hud + 0.7)));
  c.font = MONO(14); c.letterSpacing = '2px';
  c.fillStyle = rgba(STEEL, 0.7 * a);
  c.fillText('SHOWREEL / 2026', 66, 80);
  c.fillStyle = rgba(ICE, 0.9 * a);
  c.fillText('IDEA → MOTION', 66, 102);
  c.textAlign = 'right';
  c.fillStyle = rgba(WHITE, 0.85 * a);
  c.fillText('TC ' + timecode(t), W - 66, 80);
  c.fillStyle = rgba(STEEL, 0.7 * a);
  c.fillText(`FRAME ${String(Math.floor(t * FPS)).padStart(4, '0')} / 1200`, W - 66, 102);
  const keysPassed = KEYS.filter(k => k <= t).length;
  c.fillText(`◆ KEY ${String(keysPassed).padStart(2, '0')}`, W - 66, H - 70);
  c.textAlign = 'left';
  c.fillText('1920×1080 · 60 FPS', 66, H - 70);
  // timeline
  if (t > T.timeline) {
    const x0 = 360, x1 = 1560, y = 1004;
    const p = E.outExpo(prog(t, T.timeline, T.timeline + 0.8));
    const X = tt => lerp(x0, x1, tt / DUR);
    c.strokeStyle = rgba(STEEL, 0.35); c.lineWidth = 1;
    c.beginPath(); c.moveTo(lerp(CX, x0, p), y); c.lineTo(lerp(CX, x1, p), y); c.stroke();
    c.beginPath();
    for (let s = 0; s <= DUR; s++) { const x = X(s); if (Math.abs(x - CX) > (CX - x0) * p) continue; const h = s % 5 === 0 ? 8 : 4; c.moveTo(x, y - h); c.lineTo(x, y); }
    c.stroke();
    c.strokeStyle = rgba(ICE, 0.8); c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(lerp(x0, X(t), p), y); c.stroke();
    for (const k of KEYS) {
      const x = X(k); if (Math.abs(x - CX) > (CX - x0) * p) continue;
      const passed = t >= k;
      const s = 5 * (passed ? 1 + 0.8 * Math.exp(-(t - k) * 10) : 0.8);
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
      if (passed) { c.fillStyle = rgba(WHITE, 0.95); c.fillRect(-s / 2, -s / 2, s, s); }
      else { c.strokeStyle = rgba(STEEL, 0.6); c.lineWidth = 1; c.strokeRect(-s / 2, -s / 2, s, s); }
      c.restore();
    }
    const px = lerp(CX, X(t), p);
    c.strokeStyle = rgba(WHITE, 0.95 * p); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(px, y - 18); c.lineTo(px, y + 12); c.stroke();
    c.fillStyle = rgba(WHITE, 0.95 * p);
    c.beginPath(); c.moveTo(px - 6, y - 26); c.lineTo(px + 6, y - 26); c.lineTo(px, y - 18); c.closePath(); c.fill();
  }
  c.restore();
  c.letterSpacing = '0px';
}

function panel(c, x, y, w, h, t0, title, t) {
  const p = E.outExpo(prog(t, t0, t0 + 0.6));
  c.strokeStyle = rgba(ICE, 0.55 * p); c.lineWidth = 1;
  brackets(c, x, y, x + w, y + h, 14, p);
  c.fillStyle = rgba(BLUE, 0.04 * p); c.fillRect(x, y, w, h);
  c.font = MONO(12); c.letterSpacing = '2px';
  c.fillStyle = rgba(STEEL, 0.85 * p);
  c.fillText(title, x + 14, y + 24);
  c.fillStyle = rgba(ICE, (Math.floor(t * 4) % 2 ? 0.9 : 0.3) * p);
  c.fillRect(x + w - 20, y + 15, 7, 7);
  c.letterSpacing = '0px';
  return p;
}
function bez(u, p1x, p1y, p2x, p2y) {
  const m = 1 - u;
  return [3 * m * m * u * p1x + 3 * m * u * u * p2x + u * u * u, 3 * m * m * u * p1y + 3 * m * u * u * p2y + u * u * u];
}
function drawPanels(c, t) {
  if (t > T.ease) {
    const x = 1500, y = 690, w = 330, h = 230;
    const p = panel(c, x, y, w, h, T.ease, 'EASE · IN-OUT', t);
    const gx = x + 30, gy = y + h - 26, gw = 210, gh = 150;
    const M = q => [gx + q[0] * gw, gy - q[1] * gh];
    c.strokeStyle = rgba(STEEL, 0.25 * p); c.beginPath(); c.moveTo(gx, gy - gh); c.lineTo(gx, gy); c.lineTo(gx + gw, gy); c.stroke();
    const dp = E.inOutCubic(prog(t, T.ease + 0.15, T.ease + 0.9));
    const P1 = [0.65, 0], P2 = [0.35, 1];
    c.strokeStyle = rgba(STEEL, 0.6 * p); c.beginPath(); c.moveTo(...M([0, 0])); c.lineTo(...M(P1)); c.moveTo(...M([1, 1])); c.lineTo(...M(P2)); c.stroke();
    c.fillStyle = rgba(ICE, p); for (const q of [P1, P2]) { const m = M(q); c.fillRect(m[0] - 3, m[1] - 3, 6, 6); }
    const pts = []; for (let i = 0; i <= 80; i++) pts.push(M(bez(i / 80, P1[0], P1[1], P2[0], P2[1])));
    c.strokeStyle = rgba(WHITE, 0.95 * p); c.lineWidth = 2; strokePartial(c, pts, dp, false); c.lineWidth = 1;
    const u = frac((t - T.ease) / 1.0);
    const q = bez(u, P1[0], P1[1], P2[0], P2[1]);
    const m = M(q);
    if (dp >= 1) { glowDot(c, m[0], m[1], 3, 14, 0.9 * p, ICE); }
    const bx = x + w - 48;
    c.strokeStyle = rgba(STEEL, 0.3 * p); c.strokeRect(bx, gy - gh, 10, gh);
    c.fillStyle = rgba(ICE, 0.9 * p); c.fillRect(bx, gy - gh * q[1], 10, gh * q[1]);
    c.font = MONO(12); c.fillStyle = rgba(WHITE, 0.8 * p); c.fillText(q[1].toFixed(3), bx - 14, gy - gh - 10);
  }
  if (t > T.osc) {
    const x = 90, y = 690, w = 330, h = 230;
    const del = (t - T.osc) * 0.35;
    const p = panel(c, x, y, w, h, T.osc, `OSC · 3:4 · δ ${(del % TAU).toFixed(2)}`, t);
    const ox = x + w / 2, oy = y + h / 2 + 14;
    c.strokeStyle = rgba(STEEL, 0.2 * p);
    c.beginPath(); c.moveTo(ox - 130, oy); c.lineTo(ox + 130, oy); c.moveTo(ox, oy - 80); c.lineTo(ox, oy + 80); c.stroke();
    const tt = (t - T.osc) * 1.6;
    const N = 140;
    for (let i = 1; i < N; i++) {
      const u0 = tt - (i - 1) / N * 2.2, u1 = tt - i / N * 2.2;
      if (u1 < 0) break;
      const a0 = [ox + 125 * Math.sin(3 * u0 + del), oy + 78 * Math.sin(4 * u0)];
      const a1 = [ox + 125 * Math.sin(3 * u1 + del), oy + 78 * Math.sin(4 * u1)];
      c.strokeStyle = rgba(i < 3 ? WHITE : ICE, (1 - i / N) * 0.9 * p); c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(...a0); c.lineTo(...a1); c.stroke();
    }
    const hx = ox + 125 * Math.sin(3 * tt + del), hy = oy + 78 * Math.sin(4 * tt);
    glowDot(c, hx, hy, 2.5, 14, p, ICE);
  }
}

function drawStreaks(c, t) {
  if (t < 15.1 || t > T.implode[1]) return;
  c.lineWidth = 1.4;
  for (const s of STREAKS) {
    const q = (t - s.s) / s.d;
    if (q < 0 || q > 1) continue;
    const e = E.inCubic(q);
    const r0 = lerp(1300, 30, e), r1 = r0 + lerp(260, 20, e);
    c.strokeStyle = rgba(ICE, 0.55 * Math.sin(Math.PI * q) * s.w);
    c.beginPath(); c.moveTo(CX + Math.cos(s.th) * r0, CY + Math.sin(s.th) * r0); c.lineTo(CX + Math.cos(s.th) * r1, CY + Math.sin(s.th) * r1); c.stroke();
  }
}

function drawImpact(c, t) {
  if (t < T.impact || t > T.impact + 1.6) return;
  const d = t - T.impact;
  for (let k = 0; k < 2; k++) {
    const dd = d - k * 0.09; if (dd < 0) continue;
    const p = E.outExpo(clamp(dd / 1.1));
    const r = 30 + 1350 * p;
    const col = mixc(WARM, ICE, clamp(p * 1.6));
    c.strokeStyle = rgba(k ? ICE : col, (1 - p) * (k ? 0.5 : 0.95));
    c.lineWidth = (k ? 1.5 : 9) * (1 - p) + 1;
    c.beginPath(); c.arc(CX, CY, r, 0, TAU); c.stroke();
  }
  const kd = 3.2;
  for (const b of BURST) {
    if (d > 1.4) break;
    const r = b.v * (1 - Math.exp(-kd * d)) / kd + 20;
    const vel = b.v * Math.exp(-kd * d);
    const len = Math.min(140, vel * 0.05) + 2;
    const al = clamp(1 - d / 1.3) * 0.9;
    c.strokeStyle = rgba(b.w ? WARM : ICE, al); c.lineWidth = b.s;
    c.beginPath();
    c.moveTo(CX + Math.cos(b.th) * r, CY + Math.sin(b.th) * r);
    c.lineTo(CX + Math.cos(b.th) * (r + len), CY + Math.sin(b.th) * (r + len));
    c.stroke();
  }
}

// ---------------------------------------------------------------- title
function titleDot(t) {
  const P0 = [CX, CY], P2 = [TITLE.lx0, TITLE.lineY];
  if (t < T.dotTo[0]) return P0;
  if (t < T.dotTo[1]) {
    const u = E.inOutCubic(prog(t, T.dotTo[0], T.dotTo[1]));
    const P1 = [lerp(P0[0], P2[0], 0.5), P2[1] + 120];
    const m = 1 - u;
    return [m * m * P0[0] + 2 * m * u * P1[0] + u * u * P2[0], m * m * P0[1] + 2 * m * u * P1[1] + u * u * P2[1]];
  }
  return [TITLE.dotX(t), TITLE.lineY];
}
function drawTitle(c, t) {
  if (t < T.impact) return;
  const TT = TITLE;
  const zoom = 1 + 0.035 * E.inOutSine(prog(t, 16.6, 20));
  c.save(); c.translate(CX, CY); c.scale(zoom, zoom); c.translate(-CX, -CY);
  // ambient dust
  const dA = E.outCubic(prog(t, 16.2, 17.2));
  for (const d of DUST) {
    const x = ((d.x + d.vx * (t - 16)) % W + W) % W, y = ((d.y + d.vy * (t - 16)) % H + H) % H;
    c.fillStyle = rgba(ICE, 0.25 * dA * (0.5 + 0.5 * Math.sin(t * 1.5 + d.p)));
    c.fillRect(x, y, d.s, d.s);
  }
  // faint flat grid
  c.fillStyle = rgba(ICE, 0.09 * dA);
  for (let x = CX % 80; x < W; x += 80) for (let y = CY % 80; y < H; y += 80) c.fillRect(x - 1, y - 1, 2, 2);
  // cold halo behind title
  const g = c.createRadialGradient(CX, TT.base - 50, 0, CX, TT.base - 50, 900);
  g.addColorStop(0, rgba([40, 80, 170], 0.18 * dA)); g.addColorStop(1, 'rgba(40,80,170,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  // letters rising out of the line
  c.font = `700 ${TT.size}px "Inter Display"`; c.letterSpacing = '0px';
  c.save();
  c.beginPath(); c.rect(0, 0, W, TT.lineY - 8); c.clip();
  for (const ch of TT.chars) {
    if (ch.ch === ' ' || t < ch.rt) continue;
    const lp = prog(t, ch.rt, ch.rt + 0.8);
    const yo = (1 - E.outExpo(lp)) * TT.size * 1.05;
    const al = E.outCubic(prog(t, ch.rt, ch.rt + 0.35));
    c.fillStyle = rgba(WHITE, al);
    c.fillText(ch.ch, ch.x, TT.base + yo);
  }
  c.restore();
  // light sweep across the title
  if (t > T.sweep[0] && t < T.sweep[1]) {
    const sp = E.inOutCubic(prog(t, T.sweep[0], T.sweep[1]));
    const sx = lerp(TT.x0 - 300, TT.x0 + TT.w + 300, sp);
    const sg = c.createLinearGradient(sx - 160, 0, sx + 160, 0);
    sg.addColorStop(0, 'rgba(200,230,255,0)'); sg.addColorStop(0.5, 'rgba(210,235,255,0.85)'); sg.addColorStop(1, 'rgba(200,230,255,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = sg;
    for (const ch of TT.chars) if (ch.ch !== ' ') c.fillText(ch.ch, ch.x, TT.base);
    c.restore();
  }
  // the warm line written by the dot
  const dp = titleDot(t);
  if (t >= T.dotWrite[0]) {
    const lg = c.createLinearGradient(TT.lx0, 0, dp[0], 0);
    lg.addColorStop(0, rgba(WARM, 0.55)); lg.addColorStop(1, rgba(WARM, 1));
    c.strokeStyle = lg; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(TT.lx0, TT.lineY); c.lineTo(dp[0], TT.lineY); c.stroke();
    c.lineCap = 'butt';
  }
  // subtitle decode
  c.font = '500 22px "Inter"'; c.letterSpacing = '0px';
  const fr = Math.floor(t * 30);
  for (let i = 0; i < SUB.length; i++) {
    const s = SUB[i];
    const appear = T.sub + i * 0.022;
    if (t < appear || s.ch === ' ') continue;
    const done = t >= s.st;
    c.fillStyle = done ? rgba(STEEL, 0.9) : rgba(ICE, 0.7);
    c.fillText(done ? s.ch : scrambleChar(fr * 31 + i), s.x, TT.lineY + 66);
  }
  // the dot itself
  const breathe = t > T.dotWrite[1] ? 1 + 0.12 * Math.sin((t - T.dotWrite[1]) * 3.2) : 1;
  const flash = Math.exp(-(t - T.impact) * 4);
  glowDot(c, dp[0], dp[1], 9 * breathe + 6 * flash, 100 * breathe + 300 * flash, 1 + 0.6 * flash);
  c.restore();
}

// ---------------------------------------------------------------- screen composition
function shakeAt(t) {
  let x = 0, y = 0;
  const add = (t0, amp, k) => { if (t < t0) return; const e = amp * Math.exp(-(t - t0) * k); x += e * Math.sin(t * 91 + t0 * 7); y += e * Math.cos(t * 77 + t0 * 3); };
  for (let b = T.groove[0]; b < T.groove[1]; b += BEAT) if (t >= b && t < b + 0.4) add(b, 1.6, 14);
  for (const [w] of T.words) if (t >= w && t < w + 0.6) add(w, 7, 10);
  if (t >= T.impact) add(T.impact, 26, 6);
  return [x, y];
}
function worldCam(t) {
  let s = 1, rot = 0;
  s *= 1 + 0.12 * E.inOutSine(prog(t, 8, 12)) + 0.1 * E.inOutSine(prog(t, 12, 15));
  rot += 0.05 * Math.sin(Math.max(0, t - 8) * 0.7) * prog(t, 8, 9) + 0.12 * E.inOutCubic(prog(t, 12, 15));
  s *= 1 + 0.02 * kickPulse(t);
  const ip = E.inExpo(prog(t, T.implode[0], T.implode[1]));
  s *= 1 - 0.985 * ip; rot += 2.6 * ip;
  return { s, rot };
}
function applyCam(c, cam, sh) { c.translate(CX + sh[0], CY + sh[1]); c.rotate(cam.rot); c.scale(cam.s, cam.s); c.translate(-CX, -CY); }

function drawScreen(c, t) {
  c.save();
  c.lineCap = 'butt'; c.lineJoin = 'round'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.letterSpacing = '0px';
  if (t < T.powerOn) { c.fillStyle = '#010204'; c.fillRect(0, 0, W, H); c.restore(); return; }
  drawBG(c, t);
  const sh = shakeAt(t);
  if (t < T.impact) {
    // boot
    if (t < 2.6) {
      const fa = 1 - prog(t, 2.3, 2.55);
      c.font = MONO(26); c.fillStyle = rgba(ICE, 0.6 * fa);
      BOOT.forEach((s, i) => { const n = Math.floor((t - T.boot - i * 0.24) * 70); if (n > 0) c.fillText(s.slice(0, n), 110, 130 + i * 44); });
      if (t > 1.75 && t < T.dot) {
        const on = Math.floor((t - 1.75) / 0.25) % 2 === 0 ? 1 : 0.15;
        const hh = 34 * (1 - E.inExpo(prog(t, 2.38, T.dot)));
        c.fillStyle = rgba(ICE, on * 0.9); c.fillRect(CX - 8, CY - hh / 2, 16, hh);
      }
    }
    if (t >= T.cross) {
      const cam = worldCam(t);
      c.save(); applyCam(c, cam, sh);
      drawGrid(c, t);
      drawTunnel(c, t);
      c.restore();
      const hs = 1 - 0.985 * E.inExpo(prog(t, T.implode[0], T.implode[1]));
      c.save(); c.translate(CX + sh[0], CY + sh[1]); c.rotate(0.6 * E.inExpo(prog(t, T.implode[0], T.implode[1]))); c.scale(hs, hs); c.translate(-CX, -CY);
      drawWords(c, t);
      c.restore();
      c.save(); applyCam(c, cam, sh);
      drawSpiral(c, t);
      drawCross(c, t);
      drawRings(c, t);
      drawNodes(c, t);
      drawMorph(c, t);
      drawIco(c, t);
      drawLabels(c, t);
      c.restore();
      c.save(); c.translate(CX + sh[0] * 0.5, CY + sh[1] * 0.5); c.scale(hs, hs); c.translate(-CX, -CY);
      c.globalAlpha = 1 - prog(t, 15.3, 15.9);
      drawPanels(c, t);
      drawHUD(c, t);
      c.restore();
      drawStreaks(c, t);
    }
    const ds = dotState(t);
    if (ds) {
      // heartbeat rings
      for (const h of T.hb) if (t > h && t < h + 0.9) {
        const p = E.outCubic((t - h) / 0.9);
        c.strokeStyle = rgba(WARM, 0.5 * (1 - p)); c.lineWidth = 2;
        c.beginPath(); c.arc(CX, CY, 14 + 150 * p, 0, TAU); c.stroke();
      }
      glowDot(c, CX + sh[0] * 0.3, CY + sh[1] * 0.3, ds.r, ds.glow, ds.inten);
    }
  } else {
    c.save(); c.translate(sh[0], sh[1]);
    drawImpact(c, t);
    drawTitle(c, t);
    c.restore();
  }
  // power-on flash
  if (t >= T.powerOn && t < T.powerOn + 0.35) {
    const a = t - T.powerOn;
    const hh = lerp(6, H, E.outExpo(clamp(a / 0.11)));
    const al = 1 - clamp((a - 0.05) / 0.28);
    c.fillStyle = rgba([210, 230, 255], al * 0.9);
    c.fillRect(0, CY - hh / 2, W, hh);
    c.fillStyle = rgba(WHITE, al);
    c.fillRect(0, CY - 2, W, 4);
  }
  c.restore();
}

// ---------------------------------------------------------------- post
function zoomBlur(amt, n = 7) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= n; i++) {
    const s = 1 + amt * i / n;
    ctx.globalAlpha = 0.45 / i;
    ctx.drawImage(tmp, CX - CX * s, CY - CY * s, W * s, H * s);
  }
  ctx.globalAlpha = 1;
}
function glitch(t, g) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  const f = Math.floor(t * FPS);
  for (let k = 0; k < 14; k++) {
    const y = hash(f * 13 + k) * H, h = 4 + hash(f * 7 + k * 3) * 70;
    const dx = (hash(f * 5 + k * 11) - 0.5) * 220 * g;
    ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * g;
  ctx.drawImage(tmp, 10 * g, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function post(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let zb = 0.07 * Math.sin(Math.PI * prog(t, 3.0, 4.5)) ** 2;
  if (t < T.impact) zb += 0.16 * E.inExpo(prog(t, T.implode[0], T.implode[1]));
  if (t >= T.impact) zb += 0.10 * Math.exp(-(t - T.impact) * 7);
  if (zb > 0.003) zoomBlur(zb);
  let g = 0;
  for (const gt of T.glitch) if (t >= gt && t < gt + 0.1) g = Math.max(g, 1 - (t - gt) / 0.1);
  if (g > 0) glitch(t, g);
  // bloom
  b1c.globalCompositeOperation = 'copy'; b1c.filter = 'contrast(2.2) blur(3px)'; b1c.drawImage(out, 0, 0, 480, 270); b1c.filter = 'none';
  b2c.globalCompositeOperation = 'copy'; b2c.filter = 'blur(4px)'; b2c.drawImage(b1, 0, 0, 240, 135); b2c.filter = 'none';
  ctx.globalCompositeOperation = 'lighter';
  const bk = t >= T.impact ? lerp(1, 0.5, prog(t, T.impact + 0.2, T.impact + 1.2)) : 1;
  ctx.globalAlpha = 0.5 * bk; ctx.drawImage(b1, 0, 0, W, H);
  ctx.globalAlpha = 0.6 * bk; ctx.drawImage(b2, 0, 0, W, H);
  // impact flash
  if (t >= T.impact && t < T.impact + 0.6) {
    ctx.globalAlpha = 1; ctx.fillStyle = rgba([255, 214, 160], 0.95 * Math.exp(-(t - T.impact) * 16));
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(vig, 0, 0);
  // grain
  const f = Math.floor(t * FPS);
  const gt = grains[f % 4];
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.03;
  const ox = -Math.floor(hash(f) * 512), oy = -Math.floor(hash(f + 0.5) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(gt, x, y);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // fades
  const fadeIn = 1 - prog(t, 0, 0.8);
  const fadeOut = prog(t, T.fade[0], T.fade[1]);
  const k = Math.max(fadeIn, E.inOutSine(fadeOut));
  if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- frame
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (t < T.push[1]) {
    drawScreen(sctx, t);
    const e = E.inOutQuint(prog(t, T.push[0], T.push[1]));
    const s0 = 1 + 0.05 * E.inOutSine(prog(t, 0, T.push[0]));
    const s = Math.exp(lerp(Math.log(s0), Math.log(2.4), e));
    const hand = 1 - e;
    const px = 960 + hand * (3 * Math.sin(t * 0.9) + 2 * Math.sin(t * 1.7));
    const py = lerp(470, 540, e) + hand * (2 * Math.sin(t * 1.1 + 1));
    ctx.save();
    ctx.translate(px, py); ctx.scale(s, s); ctx.translate(-960, -470);
    drawRoom(ctx, t);
    ctx.restore();
  } else {
    drawScreen(ctx, t);
  }
  post(t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = [
    ['Inter Display', 'InterDisplay-Bold.otf', '700'],
    ['Inter Display', 'InterDisplay-Black.otf', '900'],
    ['Inter', 'Inter-Medium.otf', '500'],
  ];
  for (const [fam, file, wt] of faces) {
    const f = new FontFace(fam, `url(file:///usr/share/fonts/opentype/inter/${file})`, { weight: wt });
    await f.load(); document.fonts.add(f);
  }
  const m = new FontFace('DejaVu Sans Mono', 'url(file:///usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf)', { weight: '400' });
  await m.load(); document.fonts.add(m);
  initData();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
window.getTitle = () => TITLE;
boot().catch(e => { window.BOOT_ERROR = String(e && e.stack || e); });
