'use strict';
// «От идеи к движению» v2: bright, saturated, character-driven motion piece.
// The design language is light canvases, one hero orange, heavy grotesk plus
// italic serif accents, a mascot (the idea-dot) and UI-card storytelling.
// Every visual beat is keyed to the voiceover word timestamps.

const W = 1920, H = 1080, CX = 960, CY = 540, FPS = 60, DUR = 46.0, TAU = Math.PI * 2;
const V0 = 0.6;                 // voiceover starts here (film time)
const v = s => V0 + s;          // VO time → film time

// ---------------------------------------------------------------- palette
const P = {
  bg: '#F4F1EC', bg2: '#ECE8E1', ink: '#16171C', ink2: '#2A2C35', gray: '#8C909A', line: '#D9D4CC',
  or: '#FF5A1F', orL: '#FF9457', orD: '#DA3E0A', cream: '#FFF7EE',
  n1: '#0F1442', n2: '#2B1867', n3: '#4A23A8',
  blue: '#3D5AFE', purple: '#7A4DFF', pink: '#FF3D81', green: '#1FC26A', yellow: '#FFC531', sky: '#5BC0FF',
};
const hx = h => { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
const col = (h, a = 1) => { const c = typeof h === 'string' ? hx(h) : h; return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
const mix = (a, b, k) => { a = typeof a === 'string' ? hx(a) : a; b = typeof b === 'string' ? hx(b) : b; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };

// ---------------------------------------------------------------- utils
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const frac = x => x - Math.floor(x);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outElastic: x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  inBack: x => { const c1 = 1.70158; return (c1 + 1) * x * x * x - c1 * x * x; },
};
// damped spring 0→1 (overshoot), k = stiffness-ish
const spring = (t, t0, f = 3.2, z = 0.32) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * 2 * Math.PI * f * a) * Math.cos(2 * Math.PI * f * Math.sqrt(1 - z * z) * a); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

const SANS = (w, s) => `${w} ${s}px "Inter Display"`;
const SERIF = s => `italic 500 ${s}px "Playfair"`;
const SERIFB = s => `italic 700 ${s}px "Playfair"`;
const HAND = s => `700 ${s}px "Caveat"`;
const UI = (w, s) => `${w} ${s}px "Inter"`;
const MONO = s => `400 ${s}px "DejaVu Sans Mono"`;

// ---------------------------------------------------------------- canvases
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const tmp = mk(W, H), tctx = tmp.getContext('2d');
const pieCv = mk(900, 900), pctx = pieCv.getContext('2d');
const grains = [];
let ORB_SHARP, ORB_SOFT, ORB_CREAM, ORB_CREAM_SOFT;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

// ---------------------------------------------------------------- scene cut list (film time)
const S = {
  hook: [0, v(2.58)],
  notes: [v(2.58), v(7.22)],
  dot: [v(7.22), v(11.70)],
  bites: [v(11.70), v(18.90)],
  night: [v(18.90), v(24.10)],
  impulse: [v(24.10), v(29.74)],
  craft: [v(29.74), v(33.54)],
  code: [v(33.54), v(36.58)],
  title: [v(36.58), v(40.18)],
  cta: [v(40.18), DUR],
};

// ---------------------------------------------------------------- primitives
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function card(c, x, y, w, h, r, fill, sh = 0.14, blur = 50, oy = 22) {
  c.save();
  if (sh > 0) { c.shadowColor = `rgba(40,30,20,${sh})`; c.shadowBlur = blur; c.shadowOffsetY = oy; }
  rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
  c.restore();
}
function popK(t, t0, d = 0.42) {
  const p = prog(t, t0, t0 + d);
  return { a: clamp(p * 3.5), s: p <= 0 ? 0 : lerp(0.4, 1, E.outBack(p)), y: (1 - E.outCubic(p)) * 30, p };
}
function fontOf(k, s) { return k === 'i' ? SERIF(s * 1.14) : k === 'b' ? SERIFB(s * 1.14) : k === 'h' ? HAND(s * 1.2) : SANS(800, s); }

// kinetic line: words keep their final layout; each pops on its own timestamp
function kline(c, t, words, cx, y, size, o = {}) {
  if (!words._lay) {
    c.save();
    let x = 0; const xs = [], ws = [];
    const gap = size * 0.24;
    for (const w of words) { c.font = fontOf(w.k, size); c.letterSpacing = w.k ? '0px' : `${-size * 0.02}px`; const ww = c.measureText(w.txt).width; xs.push(x); ws.push(ww); x += ww + gap; }
    words._lay = { xs, ws, tot: x - gap };
    c.restore();
  }
  const L = words._lay;
  const x0 = o.align === 'left' ? cx : cx - L.tot / 2;
  const outP = o.out ? E.inCubic(prog(t, o.out, o.out + 0.24)) : 0;
  words.forEach((w, i) => {
    if (t < w.t - 0.05) return;
    const k = popK(t, w.t - 0.05, w.k ? 0.5 : 0.38);
    const oo = o.out ? E.inCubic(prog(t, o.out + i * 0.025, o.out + i * 0.025 + 0.22)) : 0;
    c.save();
    c.translate(x0 + L.xs[i] + L.ws[i] / 2, y + k.y - (o.outDir === 'down' ? -80 : 80) * oo);
    const sc = k.s * (1 + (w.k === 'i' ? 0.06 * Math.sin(Math.max(0, t - w.t) * 4) * Math.exp(-(t - w.t) * 2) : 0));
    c.scale(sc, sc);
    if (w.rot) c.rotate(w.rot * (1 - k.p));
    c.font = fontOf(w.k, size); c.letterSpacing = w.k ? '0px' : `${-size * 0.02}px`;
    c.fillStyle = col(w.c || (w.k ? P.or : (o.color || P.ink)), k.a * (1 - oo) * (1 - outP * 0));
    c.textBaseline = 'alphabetic';
    c.fillText(w.txt, -L.ws[i] / 2, 0);
    c.restore();
  });
}
const Wd = (txt, t, k = '', c2) => ({ txt, t, k, c: c2 });

// glossy character ball (the idea)
function ball(c, x, y, r, o = {}) {
  const base = o.base || P.or, light = o.light || P.orL, dark = o.dark || P.orD;
  c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(o.sx || 1, o.sy || 1);
  if (o.glow) {
    const gg = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.4);
    gg.addColorStop(0, col(base, 0.45 * o.glow)); gg.addColorStop(1, col(base, 0));
    c.fillStyle = gg; c.beginPath(); c.arc(0, 0, r * 2.4, 0, TAU); c.fill();
  }
  const g = c.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.04, 0, 0, r * 1.04);
  g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath(); c.ellipse(-r * 0.4, -r * 0.5, r * 0.2, r * 0.11, -0.6, 0, TAU); c.fill();
  if (o.eyes) eyes(c, r, o);
  c.restore();
}
function eyes(c, r, o) {
  const open = o.eyes, blink = o.blink || 0, look = o.look || [0, 0];
  const ex = o.eyePos || [[-0.3, -0.16], [0.2, -0.2]];
  ex.forEach((p, i) => {
    const wink = i === 1 ? (o.wink || 0) : 0;
    const sy = Math.max(0.06, open * (1 - blink) * (1 - wink));
    c.save(); c.translate(p[0] * r, p[1] * r); c.scale(1, sy);
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, r * 0.2, r * 0.25, 0, 0, TAU); c.fill();
    c.fillStyle = P.ink; c.beginPath(); c.arc(look[0] * r * 0.08, look[1] * r * 0.09 + r * 0.03, r * 0.11, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(look[0] * r * 0.08 - r * 0.035, look[1] * r * 0.09 - r * 0.01, r * 0.035, 0, TAU); c.fill();
    c.restore();
    if (wink > 0.5) { c.strokeStyle = P.ink; c.lineWidth = r * 0.05; c.lineCap = 'round'; c.beginPath(); c.arc(p[0] * r, p[1] * r + r * 0.02, r * 0.14, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    if (o.sad) { c.strokeStyle = P.ink; c.lineWidth = r * 0.045; c.lineCap = 'round'; c.beginPath(); c.moveTo(p[0] * r - r * 0.16, p[1] * r - r * 0.3 + (i ? -1 : 1) * r * 0.05 * 0); c.lineTo(p[0] * r + r * 0.14, p[1] * r - r * 0.36 + (i ? 1 : -1) * r * 0.06); c.stroke(); }
  });
}
function shadow(c, x, gy, r, lift = 0, a = 0.22) {
  const k = 1 / (1 + lift / 200);
  c.save(); c.translate(x, gy); c.scale(1, 0.2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.1 * (1.3 - 0.3 * k));
  g.addColorStop(0, `rgba(60,35,20,${a * k})`); g.addColorStop(1, 'rgba(60,35,20,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.2 * (1.3 - 0.3 * k), 0, TAU); c.fill(); c.restore();
}
// ball with a bitten pie: kept wedge [a0,a1], with teeth notches along the cuts
function pieBall(c, x, y, r, a0, a1, o = {}) {
  const S2 = 450;
  pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, 900, 900);
  ball(pctx, S2, S2, r, Object.assign({}, o, { eyes: 0 }));
  if (a1 - a0 < TAU - 1e-3) {
    pctx.globalCompositeOperation = 'destination-out';
    pctx.beginPath(); pctx.moveTo(S2, S2); pctx.arc(S2, S2, r + 4, a1, a0 + TAU); pctx.closePath(); pctx.fill();
    for (const a of [a0, a1]) for (let k = 1; k <= 5; k++) {
      const d = r * (0.12 + 0.18 * k), j = (k % 2 ? 1 : -1) * 0.5;
      pctx.beginPath(); pctx.arc(S2 + Math.cos(a) * d - Math.sin(a) * j * 6, S2 + Math.sin(a) * d + Math.cos(a) * j * 6, r * 0.085, 0, TAU); pctx.fill();
    }
    pctx.globalCompositeOperation = 'source-over';
  }
  if (o.eyes) { pctx.save(); pctx.translate(S2, S2); eyes(pctx, r, o); pctx.restore(); }
  c.drawImage(pieCv, x - S2, y - S2);
}

// wobbly jelly monster
function blob(c, x, y, r, base, t, o = {}) {
  const n = 72, mouth = o.mouth || 0, dir = o.dir || Math.PI;
  c.save(); c.translate(x, y); c.scale(o.sx || 1, o.sy || 1);
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU;
    let d = Math.atan2(Math.sin(a - dir), Math.cos(a - dir));
    let rr2 = r * (1 + 0.045 * Math.sin(3 * a + t * 5) + 0.03 * Math.sin(5 * a - t * 3.3));
    if (o.drop) rr2 *= 1 + 0.55 * Math.pow(Math.max(0, -Math.sin(a)), 6);
    if (mouth > 0 && Math.abs(d) < mouth) rr2 *= 0.12 + 0.88 * Math.pow(Math.abs(d) / mouth, 3);
    const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.1);
  const bc = hx(base);
  g.addColorStop(0, col(mix(bc, [255, 255, 255], 0.35))); g.addColorStop(0.6, base); g.addColorStop(1, col(mix(bc, [0, 0, 0], 0.25)));
  c.fillStyle = g; c.fill();
  if (o.clock) {
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(-r * 0.05, r * 0.25, r * 0.36, 0, TAU); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = r * 0.04; c.lineCap = 'round';
    for (const [len, sp] of [[0.18, 1.2], [0.28, 7]]) { const a = t * sp - Math.PI / 2; c.beginPath(); c.moveTo(-r * 0.05, r * 0.25); c.lineTo(-r * 0.05 + Math.cos(a) * r * len, r * 0.25 + Math.sin(a) * r * len); c.stroke(); }
  }
  if (o.pen) {
    c.save(); c.rotate(-0.6); c.fillStyle = P.pink; c.fillRect(r * 0.2, -r * 1.25, r * 0.16, r * 0.7); c.fillStyle = P.ink; c.beginPath(); c.moveTo(r * 0.2, -r * 0.55); c.lineTo(r * 0.36, -r * 0.55); c.lineTo(r * 0.28, -r * 0.4); c.fill(); c.restore();
  }
  // eyes + angry brows
  const lk = o.look || [-1, 0];
  for (const ex of [-0.28, 0.12]) {
    const bx = ex * r + (dir > Math.PI / 2 ? 0 : r * 0.12), by = -r * 0.3;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(bx, by, r * 0.16, r * 0.19, 0, 0, TAU); c.fill();
    c.fillStyle = P.ink; c.beginPath(); c.arc(bx + lk[0] * r * 0.06, by + lk[1] * r * 0.06 + r * 0.02, r * 0.085, 0, TAU); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = r * 0.06; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx - r * 0.17, by - r * (ex < 0 ? 0.3 : 0.2)); c.lineTo(bx + r * 0.15, by - r * (ex < 0 ? 0.2 : 0.3)); c.stroke();
  }
  c.restore();
}

function spiral(c, x, y, R, t, a = 1, base = P.pink) {
  c.save(); c.translate(x, y); c.rotate(t * 3.2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, col('#FFFFFF', 0.95 * a)); g.addColorStop(0.25, col(mix(base, '#ffffff', 0.4), a)); g.addColorStop(1, col(base, 0.0));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    c.beginPath();
    for (let i = 0; i <= 80; i++) {
      const u = i / 80, rr2 = u * R * 0.95, th = u * 9 + arm * TAU / 3;
      const px = Math.cos(th) * rr2, py = Math.sin(th) * rr2;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.strokeStyle = col(mix(base, '#7a1040', 0.2), 0.85 * a); c.lineWidth = R * 0.07; c.stroke();
  }
  c.restore();
}

// soft depth orbs
function orbs(c, t, kind = 'peach', n = 16, drift = 1) {
  const r = rng(77);
  for (let i = 0; i < n; i++) {
    const z = 0.35 + r() * 1.3, x0 = r() * W, y0 = r() * H, sz = (24 + r() * 60) * z, ph = r() * TAU;
    const x = ((x0 + Math.sin(t * 0.3 + ph) * 40 * z - t * 10 * z * drift) % (W + 300) + W + 300) % (W + 300) - 150;
    const y = y0 + Math.cos(t * 0.45 + ph) * 26 * z;
    const spr = kind === 'cream' ? (z > 1.1 || z < 0.6 ? ORB_CREAM_SOFT : ORB_CREAM) : (z > 1.1 || z < 0.6 ? ORB_SOFT : ORB_SHARP);
    c.globalAlpha = kind === 'cream' ? 0.75 : 0.9;
    c.drawImage(spr, x - sz, y - sz, sz * 2, sz * 2);
  }
  c.globalAlpha = 1;
}
function makeOrb(base, light, soft) {
  const s = 256, cv = mk(s, s), c = cv.getContext('2d');
  if (soft) c.filter = 'blur(10px)';
  const g = c.createRadialGradient(s * 0.38, s * 0.36, s * 0.02, s / 2, s / 2, s * 0.4);
  g.addColorStop(0, light); g.addColorStop(0.6, base); g.addColorStop(1, col(mix(base, '#c0602c', 0.25)));
  c.fillStyle = g; c.beginPath(); c.arc(s / 2, s / 2, s * (soft ? 0.36 : 0.4), 0, TAU); c.fill();
  return cv;
}
function lightBG(c, t, tint = 0) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FBF9F6'); g.addColorStop(1, P.bg2);
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
  const r2 = c.createRadialGradient(CX, CY - 100, 50, CX, CY, 1100);
  r2.addColorStop(0, 'rgba(255,255,255,0.9)'); r2.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = r2; c.fillRect(0, 0, W, H);
  if (tint) { c.fillStyle = col(P.or, 0.05 * tint); c.fillRect(0, 0, W, H); }
}
function caption(c, t, words, y = 190, size = 64, o = {}) { kline(c, t, words, CX, y, size, o); }

// ---------------------------------------------------------------- scene: hook
const HK1 = [Wd('Знаешь,', v(0.16)), Wd('где', v(0.48)), Wd('умирают', v(0.64))];
const HK2 = [Wd('лучшие', v(1.04)), Wd('идеи?', v(1.44), 'i')];
function sceneHook(c, t) {
  lightBG(c, t);
  orbs(c, t, 'peach', 14);
  const out = S.hook[1] - 0.2;
  // «умирают» droops letter by letter
  kline(c, t, HK1, CX, 470, 128, { out });
  kline(c, t, HK2, CX, 650, 150, { out });
  // tiny skull-ish dot falls when «умирают»
  if (t > v(0.7)) {
    const p = prog(t, v(0.7), v(1.4));
    const yy = 300 + 240 * E.inCubic(p) - 60 * Math.sin(Math.PI * p);
    c.globalAlpha = 1 - prog(t, out, out + 0.2);
    ball(c, CX + 520, yy, 26, { eyes: 1, sad: 1, look: [0, 1] });
    c.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- scene: notes
const NT = [Wd('В', v(2.64)), Wd('заметках.', v(2.72), 'i')];
function sceneNotes(c, t) {
  lightBG(c, t);
  orbs(c, t, 'peach', 12);
  const t0 = S.notes[0];
  const sp = spring(t, t0, 2.4, 0.42);
  const y0 = lerp(H + 60, 300, sp);
  // the app window
  const push = 1 + 0.22 * E.inOutCubic(prog(t, v(6.5), S.notes[1]));
  const zoomIn = E.inExpo(prog(t, S.notes[1] - 0.32, S.notes[1]));
  const dotX = CX - 420 + 46, dotY = y0 + 405 - 14;
  c.save();
  c.translate(dotX, dotY); c.scale(push * (1 + 30 * zoomIn), push * (1 + 30 * zoomIn)); c.translate(-dotX, -dotY);
  card(c, CX - 520, y0, 1040, 660, 42, '#FFFFFF', 0.16, 70, 30);
  // header
  c.save(); rr(c, CX - 520, y0, 1040, 660, 42); c.clip();
  c.fillStyle = '#FFF4D6'; c.fillRect(CX - 520, y0, 1040, 100);
  for (let i = 0; i < 3; i++) { c.fillStyle = ['#FF5F57', '#FEBC2E', '#28C840'][i]; c.beginPath(); c.arc(CX - 474 + i * 34, y0 + 50, 11, 0, TAU); c.fill(); }
  c.fillStyle = P.ink; c.font = UI(600, 34); c.fillText('Заметки', CX - 340, y0 + 62);
  c.fillStyle = P.gray; c.font = UI(500, 26); c.textAlign = 'right'; c.fillText('сегодня, 23:12', CX + 480, y0 + 61); c.textAlign = 'left';
  c.restore();
  c.fillStyle = P.ink; c.font = SANS(800, 64); c.fillText('Список дел', CX - 420, y0 + 196);
  // checklist rows
  const rows = [
    { txt: 'купить хлеб', t: v(4.48), y: y0 + 300 },
    { txt: 'идея для ролика…', t: v(5.05), y: y0 + 405, idea: 1 },
    { txt: 'позвонить маме', t: v(6.24), y: y0 + 510 },
  ];
  for (const r of rows) {
    if (t < r.t - 0.05) continue;
    const k = popK(t, r.t - 0.05, 0.3);
    c.save(); c.globalAlpha = k.a;
    c.translate(0, k.y * 0.5);
    if (r.idea) {
      const pulse = 1 + 0.12 * Math.sin((t - r.t) * 6);
      ball(c, CX - 420 + 46, r.y - 14, 16 * pulse, {});
      c.fillStyle = col(P.gray, 0.9); c.font = SERIF(44); c.fillText(r.txt, CX - 420 + 96, r.y);
    } else {
      c.strokeStyle = P.line; c.lineWidth = 4; c.beginPath(); c.arc(CX - 420 + 46, r.y - 14, 21, 0, TAU); c.stroke();
      const n = Math.floor(clamp((t - r.t) / 0.32) * r.txt.length);
      c.fillStyle = P.ink; c.font = UI(500, 48); c.fillText(r.txt.slice(0, n), CX - 420 + 96, r.y);
      if (n < r.txt.length && Math.floor(t * 4) % 2 === 0) { const w = c.measureText(r.txt.slice(0, n)).width; c.fillStyle = P.or; c.fillRect(CX - 420 + 98 + w, r.y - 40, 4, 50); }
    }
    c.restore();
  }
  c.restore();
  // caption + handwritten sigh
  c.save(); c.globalAlpha = 1 - prog(t, v(6.3), v(6.7));
  caption(c, t, NT, 190, 76);
  if (t > v(3.68)) {
    const p = prog(t, v(3.68), v(4.1));
    c.save(); c.translate(CX + 360, 205); c.rotate(-0.08);
    c.beginPath(); c.rect(-10, -60, 260 * p, 90); c.clip();
    c.fillStyle = P.gray; c.font = HAND(52); c.fillText('(вздох)', 0, 0);
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- scene: the dot is born
const DT = [Wd('А', v(7.28)), Wd('ведь', v(7.36)), Wd('всё', v(7.52)), Wd('начиналось', v(7.76)), Wd('с', v(8.28)), Wd('точки.', v(8.40), 'i')];
const BALL_Y = 600;
function dotBall(t) {
  // radius/position/expressions of the hero ball in scenes «dot» and «bites»
  const t0 = S.dot[0];
  let r = lerp(900, 150, E.outBack(prog(t, t0, t0 + 0.55)));
  if (t < t0) r = 900;
  const small = E.outBack(prog(t, v(9.28), v(9.28) + 0.35)) * (1 - E.outBack(prog(t, v(10.24), v(10.24) + 0.45)));
  r *= 1 - 0.62 * small;
  let y = BALL_Y, sx = 1, sy = 1;
  // hop on «Живой»
  const hop = prog(t, v(11.2), v(11.2) + 0.55);
  if (hop > 0 && hop < 1) y -= Math.sin(Math.PI * hop) * 130;
  const land = t > v(11.2) + 0.55 ? Math.exp(-(t - v(11.75)) * 9) * Math.sin((t - v(11.75)) * 30) : 0;
  sx = 1 + 0.14 * land; sy = 1 - 0.14 * land;
  if (hop > 0 && hop < 0.15) { sx = 1 + 0.15 * (1 - hop / 0.15); sy = 1 - 0.15 * (1 - hop / 0.15); }
  if (hop > 0.15 && hop < 0.9) { sx = 0.92; sy = 1.08; }
  const eyesK = E.outBack(prog(t, v(11.2), v(11.2) + 0.3));
  const blink = (t > v(11.9) && t < v(11.98)) || (t > v(14.8) && t < v(14.88)) ? 1 : 0;
  return { r, y, sx, sy, eyes: eyesK, blink };
}
function sceneDot(c, t) {
  lightBG(c, t, prog(t, v(10.24), v(10.6)) * (1 - prog(t, v(11.1), v(11.6))));
  orbs(c, t, 'peach', 12);
  caption(c, t, DT, 190, 66);
  const b = dotBall(t);
  shadow(c, CX, BALL_Y + 170, b.r, BALL_Y - b.y);
  const warm = prog(t, v(10.24), v(10.5)) * (1 - prog(t, v(11.1), v(11.5)));
  // warm sparkles
  if (warm > 0) {
    for (let i = 0; i < 26; i++) {
      const a = (t - v(10.24)) * 0.8 + hash(i) * 2;
      const ph = frac(a);
      const x = CX + (hash(i * 3) - 0.5) * 380, y = BALL_Y + 80 - ph * 320;
      c.fillStyle = col(i % 3 ? P.or : P.yellow, warm * Math.sin(Math.PI * ph)); c.beginPath(); c.arc(x, y, 4 + 4 * hash(i * 7), 0, TAU); c.fill();
    }
  }
  ball(c, CX, b.y, b.r, { sx: b.sx, sy: b.sy, eyes: b.eyes, blink: b.blink, look: [0.2 * Math.sin(t * 2), 0.3], glow: warm * 1.2 });
  // the word labels under the ball
  const lab = [['маленькой.', v(9.28), v(10.18)], ['тёплой.', v(10.24), v(11.14)], ['живой!', v(11.2), S.dot[1] + 0.5]];
  for (const [txt, a, z] of lab) {
    if (t < a - 0.05 || t > z + 0.14) continue;
    const k = popK(t, a - 0.05, 0.45), o = prog(t, z - 0.04, z + 0.12);
    c.save(); c.translate(CX, 930 + k.y + 40 * o); c.scale(k.s, k.s);
    c.font = SERIF(84); c.textAlign = 'center'; c.fillStyle = col(P.or, k.a * (1 - o)); c.fillText(txt, 0, 0); c.restore();
  }
  // sparkle stars on «живой»
  if (t > v(11.2) && t < v(11.2) + 1) {
    const p = prog(t, v(11.2), v(11.2) + 1);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4, d = 190 + 60 * E.outCubic(p);
      star(c, CX + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.8, 16 * Math.sin(Math.PI * p), P.yellow);
    }
  }
}
function star(c, x, y, s, fill) {
  if (s <= 0.2) return;
  c.save(); c.translate(x, y); c.fillStyle = fill; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr2 = i % 2 ? s * 0.35 : s; i ? c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  c.closePath(); c.fill(); c.restore();
}

// ---------------------------------------------------------------- scene: the bites
const BT1 = [Wd('Потом', v(11.76)), Wd('пришёл', v(12.0)), Wd('дедлайн', v(12.32), 'i', P.purple)];
const BT2 = [Wd('Правки', v(14.16), 'i', P.blue), Wd('—', v(14.6)), Wd('ещё', v(14.88)), Wd('кусок.', v(15.2))];
const BT3 = [Wd('А', v(15.68)), Wd('сомнения…', v(15.84), 'i', P.pink)];
const BT4 = [Wd('доели', v(17.68)), Wd('остальное.', v(18.12), 'i', P.pink)];
const BITE1 = v(13.04), BITE2 = v(15.2), SUCK = v(17.68);
function sceneBites(c, t) {
  lightBG(c, t);
  orbs(c, t, 'peach', 10);
  // captions swap
  if (t < v(14.1)) caption(c, t, BT1, 190, 70, { out: v(14.0) });
  else if (t < v(15.62)) caption(c, t, BT2, 190, 70, { out: v(15.55) });
  else if (t < v(17.6)) caption(c, t, BT3, 190, 76, { out: v(17.5) });
  else caption(c, t, BT4, 190, 76, { out: S.bites[1] - 0.3 });
  if (t > v(16.64) && t < v(17.6)) {
    const p = prog(t, v(16.64), v(17.0));
    c.save(); c.translate(CX + 300, 280); c.rotate(-0.08); c.beginPath(); c.rect(-10, -60, 250 * p, 90); c.clip();
    c.fillStyle = P.gray; c.font = HAND(50); c.fillText('(вздох)', 0, 0); c.restore();
  }
  // pie state
  const e1 = E.outExpo(prog(t, BITE1, BITE1 + 0.12)), e2 = E.outExpo(prog(t, BITE2, BITE2 + 0.12));
  // kept wedge: start 162° → 270°+... angles in canvas (y down): right half eaten first (−90°..90°)
  let a0 = lerp(-Math.PI / 2, Math.PI / 2, e1) + lerp(0, Math.PI * 0.4, e2);
  let a1 = 1.5 * Math.PI;
  const b = dotBall(t);
  const suck = prog(t, SUCK, SUCK + 0.75);
  const vx = CX + 380, vy = 560;
  // monsters
  // 1) deadline — purple clock blob, hops in from the right
  const m1in = spring(t, v(11.95), 1.6, 0.45), m1out = E.inBack(prog(t, v(14.2), v(14.6)));
  if (t > v(11.9) && m1out < 1) {
    const lunge = Math.sin(Math.PI * prog(t, BITE1 - 0.18, BITE1 + 0.25));
    const hopy = Math.abs(Math.sin((t - v(11.95)) * 7)) * 40 * (1 - prog(t, v(12.6), v(12.9)));
    const mx = lerp(W + 220, CX + 360, m1in) - 170 * lunge + 900 * m1out, my = BALL_Y + 20 - hopy;
    const chew = t > BITE1 + 0.2 && t < v(14.1) ? 0.25 + 0.25 * Math.sin((t - BITE1) * 22) : 0;
    shadow(c, mx, BALL_Y + 170, 110, hopy);
    blob(c, mx, my, 120, P.purple, t, { clock: 1, mouth: lunge > 0.1 ? 0.9 * lunge : chew, dir: Math.PI, look: [-1, 0.2], sx: 1 + 0.08 * lunge, sy: 1 - 0.08 * lunge });
  }
  // 2) edits — blue drop with a red pen, falls from the top-left
  const m2t = v(14.16);
  if (t > m2t - 0.3 && t < S.bites[1]) {
    const fall = prog(t, m2t - 0.3, m2t + 0.12);
    const splat = t > m2t + 0.12 ? Math.exp(-(t - m2t - 0.12) * 8) * Math.cos((t - m2t - 0.12) * 28) : 0;
    const lunge = Math.sin(Math.PI * prog(t, BITE2 - 0.18, BITE2 + 0.25));
    const out2 = E.inBack(prog(t, v(16.0), v(16.4)));
    const mx = CX - 380 + 150 * lunge - 900 * out2, my = lerp(-200, BALL_Y + 50, E.inCubic(fall)) + 40 * lunge;
    shadow(c, mx, BALL_Y + 170, 100, BALL_Y + 50 - my);
    blob(c, mx, my, 100, P.blue, t + 3, { drop: 1, pen: 1, mouth: lunge > 0.1 ? 0.9 * lunge : 0, dir: 0, look: [1, 0.1], sx: 1 + 0.25 * splat, sy: 1 - 0.25 * splat });
  }
  // 3) doubts — pink vortex
  const vz = E.outBack(prog(t, v(15.84), v(16.3)));
  const swallow = E.inExpo(prog(t, v(18.4), S.bites[1]));
  if (vz > 0) {
    spiral(c, vx, vy, 150 * vz + 2600 * swallow, t, 1, P.pink);
    if (swallow < 0.3) for (let i = 0; i < 5; i++) {
      const a = t * 1.6 + i / 5 * TAU, d = 230 + 20 * Math.sin(t * 3 + i);
      c.save(); c.translate(vx + Math.cos(a) * d, vy + Math.sin(a) * d * 0.7); c.rotate(Math.sin(t * 2 + i) * 0.3);
      c.font = SANS(900, 54); c.fillStyle = col(P.pink, vz * (1 - suck)); c.textAlign = 'center'; c.fillText('?', 0, 0); c.restore();
    }
  }
  // the ball itself
  if (suck < 1) {
    const sp = E.inCubic(suck);
    const ang = sp * 5;
    const px = lerp(CX, vx, sp) + Math.cos(ang) * 120 * Math.sin(Math.PI * sp), py = lerp(b.y, vy, sp) + Math.sin(ang) * 80 * Math.sin(Math.PI * sp);
    const rr2 = b.r * (1 - sp * 0.9);
    const shake = (t > BITE1 && t < BITE1 + 0.3 ? 10 * Math.exp(-(t - BITE1) * 12) : 0) + (t > BITE2 && t < BITE2 + 0.3 ? 10 * Math.exp(-(t - BITE2) * 12) : 0);
    if (sp < 0.05) shadow(c, CX, BALL_Y + 170, rr2, 0);
    c.save(); c.translate(px + shake * Math.sin(t * 80), py); c.rotate(ang * 0.6);
    const scared = t > BITE1 ? 1 : 0;
    pieBall(c, 0, 0, rr2, a0, a1, { eyes: b.eyes, blink: b.blink, look: t < BITE2 ? [0.9, 0] : [-0.6, 0.6], eyePos: [[-0.55, -0.12], [-0.22, -0.42]], sad: scared });
    c.restore();
    // percent label inside the remaining wedge
    const kept = (a1 - a0) / TAU;
    const mid = (a0 + a1) / 2, theta = a1 - a0;
    const dd = theta > 6 ? 0 : 4 * Math.sin(theta / 2) / (3 * theta) * rr2;
    const pct = Math.round(kept * 100 * (1 - sp));
    c.save(); c.translate(px + Math.cos(mid) * dd * 0.9, py + Math.sin(mid) * dd * 0.9 + (theta > 6 ? 70 : 25));
    c.font = SANS(900, theta > 6 ? 68 : 46); c.textAlign = 'center'; c.fillStyle = col('#FFFFFF', (1 - sp) * prog(t, S.bites[0], S.bites[0] + 0.3)); c.fillText(`${pct}%`, 0, 0); c.restore();
  }
  // crumbs & damage labels
  for (const [bt, colr, lab, lx, ly] of [[BITE1, P.purple, '−50%', CX + 330, 360], [BITE2, P.blue, '−20%', CX - 420, 410]]) {
    if (t < bt || t > bt + 1.6) continue;
    const a = t - bt;
    for (let i = 0; i < 16; i++) {
      const th = hash(i + bt) * TAU, sp2 = 300 + 500 * hash(i * 3 + bt);
      const x = (bt === BITE1 ? CX + 120 : CX - 80) + Math.cos(th) * sp2 * a, y = BALL_Y + 40 + Math.sin(th) * sp2 * a + 900 * a * a;
      c.fillStyle = col(P.or, clamp(1 - a / 1.1)); c.beginPath(); c.arc(x, y, 6 + 6 * hash(i), 0, TAU); c.fill();
    }
    const k = popK(t, bt, 0.4);
    c.save(); c.translate(lx, ly - a * 40); c.rotate(-0.08); c.scale(k.s, k.s);
    c.font = SANS(900, 112); c.textAlign = 'center'; c.fillStyle = col(colr, clamp(1.6 - a)); c.fillText(lab, 0, 0); c.restore();
  }
  // final zero
  if (t > SUCK + 0.6) {
    const k = popK(t, SUCK + 0.6, 0.45);
    c.save(); c.translate(CX - 220, 620); c.scale(k.s, k.s); c.font = SANS(900, 220); c.textAlign = 'center';
    c.fillStyle = col(P.ink, k.a * (1 - swallow)); c.fillText('0%', 0, 0); c.restore();
  }
}

// ---------------------------------------------------------------- scene: midnight
const NG1 = [Wd('И', v(18.96), '', '#fff'), Wd('вот —', v(19.04), '', '#fff'), Wd('полночь.', v(19.92), 'i', P.yellow)];
const NG2 = [Wd('Четырнадцать', v(20.72), '', '#fff'), Wd('вкладок…', v(21.28), 'i', P.or)];
const NG3 = [Wd('и', v(22.48), '', '#fff'), Wd('ноль', v(22.56), '', '#fff'), Wd('движения.', v(22.88), 'i', P.or)];
const TABS = ['референсы_final', 'Pinterest — идеи', 'правки_v7_ФИНАЛ', 'дедлайн.pdf', 'как не выгореть', 'туториал 4 ч', 'шрифты бесплатно', 'ТЗ (новое!!)', 'почта (12)', 'бриф.docx', 'палитры 2026', 'мемы для мотивации', 'вдохновение', 'кофе рядом'];
const TABC = [P.pink, '#E60023', P.blue, P.or, P.green, '#FF0000', P.purple, P.yellow, P.sky, P.blue, P.pink, P.green, P.purple, '#8B5A2B'];
function nightBG(c, t) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, P.n1); g.addColorStop(0.6, P.n2); g.addColorStop(1, P.n3);
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
  const r2 = c.createRadialGradient(CX, 380, 50, CX, 380, 900);
  r2.addColorStop(0, 'rgba(120,90,255,0.35)'); r2.addColorStop(1, 'rgba(120,90,255,0)');
  c.fillStyle = r2; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * Math.abs(Math.sin(t * 1.5 + i))})`; const s = 1 + hash(i * 3) * 2.5; c.fillRect(hash(i) * W, hash(i * 7) * H, s, s); }
}
function sceneNight(c, t) {
  nightBG(c, t);
  const t0 = S.night[0];
  // iris in from the pink vortex
  const iris = 1 - E.outCubic(prog(t, t0, t0 + 0.35));
  // clock
  const clkIn = spring(t, v(18.96), 2.2, 0.4), clkOut = E.inBack(prog(t, v(20.6), v(20.9)));
  if (clkOut < 1) {
    const R = 190 * clkIn * (1 - clkOut);
    const spin = t < v(19.92) ? (1 - E.outCubic(prog(t, v(18.96), v(19.92)))) : 0;
    const mins = 47 + 13 * E.outCubic(prog(t, v(18.96), v(19.92)));
    c.save(); c.translate(CX, 600);
    c.shadowColor = 'rgba(150,120,255,0.6)'; c.shadowBlur = 60;
    c.fillStyle = '#F7F5FF'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = P.ink; c.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.lineWidth = R * 0.025; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); c.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.stroke(); }
    const mA = (mins / 60) * TAU - Math.PI / 2 + spin * 40, hA = ((11 + mins / 60) / 12) * TAU - Math.PI / 2 + spin * 6;
    c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hA) * R * 0.48, Math.sin(hA) * R * 0.48); c.stroke();
    c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(mA) * R * 0.74, Math.sin(mA) * R * 0.74); c.stroke();
    c.fillStyle = P.or; c.beginPath(); c.arc(0, 0, R * 0.05, 0, TAU); c.fill();
    c.restore();
  }
  if (t < v(20.6)) caption(c, t, NG1, 200, 76, { out: v(20.5) });
  // tabs orbiting the headline
  const tabIn = prog(t, v(20.72), v(21.3));
  const freeze = v(22.48);
  if (t > v(20.6)) {
    const spinT = t < freeze ? t : freeze + (1 - Math.exp(-(t - freeze) * 18)) / 18;
    const items = TABS.map((name, i) => {
      const th = i / TABS.length * TAU + spinT * 1.25;
      const R = 560 * (0.4 + 0.6 * E.outCubic(prog(t, v(20.72) + i * 0.03, v(21.4) + i * 0.03)));
      const x = Math.cos(th) * R, z = Math.sin(th) * R;
      const y = 60 + Math.sin(th * 2 + i) * 40 + z * 0.12;
      return { i, name, x, y, z };
    }).sort((a, b) => b.z - a.z);
    for (const it of items) {
      const app = prog(t, v(20.72) + it.i * 0.04, v(20.9) + it.i * 0.04);
      if (app <= 0) continue;
      const fall = t > freeze ? Math.max(0, t - freeze - 0.25 - hash(it.i) * 0.25) : 0;
      const s = 1400 / (1400 + it.z);
      const px = CX + it.x * s, py = 560 + it.y * s + 1500 * fall * fall;
      c.save(); c.translate(px, py); c.scale(s * app, s * app); c.rotate(fall * (hash(it.i * 5) - 0.5) * 4 + Math.sin(t + it.i) * 0.05);
      c.globalAlpha = clamp(0.35 + 0.65 * s) * clamp(1.2 - fall);
      rr(c, -175, -34, 350, 68, 16); c.fillStyle = '#1D2148'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1.5; c.stroke();
      rr(c, -155, -14, 28, 28, 7); c.fillStyle = TABC[it.i]; c.fill();
      c.fillStyle = '#fff'; c.font = UI(600, 22); c.fillText(it.name, -112, 8);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillText('×', 145, 8);
      c.restore();
    }
    c.globalAlpha = 1;
  }
  // headline in the middle of the swirl
  if (t > v(20.6) && t < v(22.45)) {
    const k = popK(t, v(20.72), 0.4), o = prog(t, v(22.3), v(22.45));
    c.save(); c.translate(CX, 610); c.scale(k.s * (1 - o), k.s * (1 - o));
    c.font = SANS(900, 230); c.textAlign = 'center'; c.fillStyle = col(P.or, k.a); c.fillText('14', -250, 0);
    c.font = SANS(900, 120); c.fillStyle = col('#fff', k.a); c.textAlign = 'left'; c.fillText('вкладок', -110, -20);
    c.font = SERIF(84); c.fillStyle = col(P.yellow, prog(t, v(21.28), v(21.5))); c.fillText('открыто.', -90, 70);
    c.restore();
  }
  if (t > v(20.6) && t < v(22.45)) caption(c, t, NG2, 200, 70);
  // flatline + «ноль движения»
  if (t > freeze - 0.1) {
    caption(c, t, NG3, 200, 80, { out: S.night[1] - 0.25 });
    const p = prog(t, freeze - 0.1, freeze + 0.4);
    c.strokeStyle = col(P.or, 1); c.lineWidth = 5; c.lineJoin = 'round';
    c.beginPath();
    const yb = 640;
    for (let x = 0; x <= W * p; x += 6) {
      const local = x / W;
      const beat = local < 0.42 ? Math.exp(-((((local % 0.21) - 0.1) * 60) ** 2)) * (local % 0.21 > 0.1 ? -1 : 1) * 140 : 0;
      x ? c.lineTo(x, yb - beat) : c.moveTo(x, yb - beat);
    }
    c.stroke();
    c.fillStyle = col(P.or, 1); c.beginPath(); c.arc(W * p, yb, 9, 0, TAU); c.fill();
  }
  // «А теперь —» setup
  if (t > v(23.55)) caption(c, t, [Wd('А', v(23.6), '', '#fff'), Wd('теперь —', v(23.68), '', '#fff')], 860, 64);
  if (iris > 0) { spiral(c, CX, CY, 2600 * iris + 10, t, iris, P.pink); }
}

// ---------------------------------------------------------------- scene: impulse → line → form → rhythm
const LAUNCH = v(25.92);
const PATH = [[430, 700], [760, 120], [1250, 1060], [1560, 520]];
function bez(u) { const [a, b, c2, d] = PATH, m = 1 - u; return [m * m * m * a[0] + 3 * m * m * u * b[0] + 3 * m * u * u * c2[0] + u * u * u * d[0], m * m * m * a[1] + 3 * m * m * u * b[1] + 3 * m * u * u * c2[1] + u * u * u * d[1]]; }
function orangeBG(c, t) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FF7433'); g.addColorStop(1, '#FF4A12');
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
  const r2 = c.createRadialGradient(CX, 300, 80, CX, 400, 1000);
  r2.addColorStop(0, 'rgba(255,220,180,0.45)'); r2.addColorStop(1, 'rgba(255,220,180,0)');
  c.fillStyle = r2; c.fillRect(0, 0, W, H);
}
const IMP1 = [Wd('Даём', v(24.72), '', P.cream), Wd('точке', v(25.04), '', P.cream), Wd('импульс…', v(25.44), 'i', P.ink)];
const IMP2 = [Wd('и', v(26.0), '', P.cream), Wd('она', v(26.08), '', P.cream), Wd('становится', v(26.32), '', P.cream), Wd('линией!', v(26.88), 'i', P.ink)];
const IMP3 = [Wd('Линия —', v(27.52), '', P.cream), Wd('формой.', v(28.08), 'i', P.ink)];
const IMP4 = [Wd('Форма —', v(28.64), '', P.cream), Wd('ритмом.', v(29.2), 'i', P.ink)];
function sceneImpulse(c, t) {
  const t0 = S.impulse[0];
  const wipe = E.outExpo(prog(t, v(24.13) - 0.04, v(24.13) + 0.38));
  if (wipe < 1) sceneNight(c, t);
  c.save();
  c.beginPath(); c.arc(CX, CY, 2300 * wipe, 0, TAU); c.clip();
  orangeBG(c, t);
  orbs(c, t, 'cream', 12, 2);
  // «смотри!» giant then up
  const sm = popK(t, v(24.13), 0.4), up = E.inOutCubic(prog(t, v(24.42), v(24.62)));
  if (t < v(24.72)) {
    c.save(); c.translate(CX, lerp(600, 190, up)); c.scale(sm.s * lerp(1, 0.4, up), sm.s * lerp(1, 0.4, up));
    c.font = SERIF(260); c.textAlign = 'center'; c.fillStyle = col(P.cream, sm.a * (1 - prog(t, v(24.55), v(24.7)))); c.fillText('смотри!', 0, 80); c.restore();
  }
  if (t < v(25.98)) caption(c, t, IMP1, 190, 72, { out: v(25.95) });
  else if (t < v(27.5)) caption(c, t, IMP2, 190, 72, { out: v(27.45) });
  else if (t < v(28.62)) caption(c, t, IMP3, 190, 80, { out: v(28.58) });
  else caption(c, t, IMP4, 190, 80, { out: S.impulse[1] - 0.25 });
  // burst rays at the wipe
  if (t > v(24.13) && t < v(24.13) + 0.6) {
    const p = prog(t, v(24.13), v(24.13) + 0.6);
    c.strokeStyle = col(P.cream, 1 - p); c.lineWidth = 10 * (1 - p) + 2; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; const r0 = 200 + 900 * E.outCubic(p), r1 = r0 + 140 * (1 - p); c.beginPath(); c.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); c.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); c.stroke(); }
  }
  // slingshot
  const born = spring(t, v(24.3), 2.6, 0.35);
  const pull = E.inOutCubic(prog(t, v(24.75), LAUNCH - 0.05));
  const fly = E.outCubic(prog(t, LAUNCH, LAUNCH + 0.75));
  const ub = 'cream';
  const toForm = E.inOutCubic(prog(t, v(27.6), v(28.1)));
  const N = 140;
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(bez(i / N * fly));
  // trail morph into circle
  const circ = [];
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + i / N * TAU; circ.push([CX + Math.cos(a) * 190, 620 + Math.sin(a) * 190]); }
  if (t > LAUNCH) {
    const m = toForm;
    const ptsM = pts.map((p, i) => [lerp(p[0], circ[i][0], m), lerp(p[1], circ[i][1], m)]);
    const fillK = prog(t, v(28.64), v(28.9));
    const bounce = t > v(28.64) ? Math.abs(Math.sin((t - v(28.64)) * Math.PI * 4)) : 0;
    c.save(); c.translate(0, -bounce * 70 * prog(t, v(28.64), v(28.8)));
    c.lineWidth = 30; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = P.cream;
    c.beginPath(); ptsM.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (m > 0.98) c.closePath(); c.stroke();
    if (fillK > 0) { c.fillStyle = col(P.cream, fillK); c.fill(); }
    c.restore();
    // the other two forms
    for (const [k, sx2, sides] of [[0, -470, 3], [1, 470, 4]]) {
      const tp = v(28.08) + k * 0.12;
      if (t < tp) continue;
      const s = E.outBack(prog(t, tp, tp + 0.4));
      const bnc = t > v(28.64) ? Math.abs(Math.sin((t - v(28.64)) * Math.PI * 4 + (k ? 2.1 : 1.05))) : 0;
      const sq = t > v(28.64) ? 1 - 0.18 * Math.max(0, 1 - bnc * 6) : 1;
      c.save(); c.translate(CX + sx2, 620 - bnc * 90 * prog(t, v(28.64), v(28.8)) + 150 * (1 - sq)); c.scale(s / sq, s * sq); c.rotate((t - tp) * 0.6 * (k ? -1 : 1) * (1 - fillK));
      c.beginPath();
      for (let i = 0; i < sides; i++) { const a = -Math.PI / 2 + i / sides * TAU + (sides === 4 ? Math.PI / 4 : 0); const R = sides === 4 ? 180 : 190; i ? c.lineTo(Math.cos(a) * R, Math.sin(a) * R) : c.moveTo(Math.cos(a) * R, Math.sin(a) * R); }
      c.closePath(); c.lineWidth = 30; c.strokeStyle = P.cream; c.lineJoin = 'round'; c.stroke();
      if (fillK > 0) { c.fillStyle = col(k ? P.ink : P.cream, fillK); c.fill(); if (k) { c.strokeStyle = P.ink; c.stroke(); } }
      c.restore();
    }
    // equaliser
    if (t > v(28.64)) {
      const ek = prog(t, v(28.64), v(28.8));
      for (let i = 0; i < 40; i++) {
        const hgt = (10 + 90 * hash(i * 13 + Math.floor(t * 16)) * (0.4 + 0.6 * Math.abs(Math.sin((t - v(28.64)) * Math.PI * 4)))) * ek;
        c.fillStyle = col(i % 5 ? P.cream : P.ink, 0.9); rr(c, CX - 20 * 40 / 2 * 1.6 + i * 32, 1000 - hgt, 20, hgt, 6); c.fill();
      }
    }
  }
  // the ball (cream, charged)
  if (born > 0 && toForm < 1) {
    let bx, by, sx = 1, sy = 1, rot = 0;
    if (t < LAUNCH) {
      bx = lerp(560, 430, pull); by = 700; sx = 1 + 0.35 * pull; sy = 1 - 0.25 * pull;
      // band + aim arrow
      c.strokeStyle = col(P.ink, 0.85 * pull); c.lineWidth = 6; c.setLineDash([18, 16]);
      c.beginPath(); for (let i = 0; i <= 30; i++) { const p = bez(i / 30 * 0.45); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.setLineDash([]);
      c.strokeStyle = col(P.ink, 0.9 * pull); c.lineWidth = 8; c.beginPath(); c.moveTo(620, 700 - 60); c.lineTo(620, 700 + 60); c.stroke();
      c.beginPath(); c.moveTo(bx - 60 * sx, by); c.lineTo(620, 640); c.moveTo(bx - 60 * sx, by); c.lineTo(620, 760); c.stroke();
      // power meter
      rr(c, 360, 850, 400, 26, 13); c.fillStyle = col(P.ink, 0.2 * pull); c.fill();
      rr(c, 360, 850, 400 * pull, 26, 13); c.fillStyle = col(P.ink, pull); c.fill();
      c.fillStyle = col(P.ink, pull); c.font = UI(700, 24); c.fillText(`ИМПУЛЬС ${Math.round(pull * 100)}%`, 360, 830);
    } else {
      const p = bez(fly), p2 = bez(Math.min(1, fly + 0.01));
      bx = p[0]; by = p[1]; rot = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
      const sp = 1 - prog(t, LAUNCH, LAUNCH + 0.75);
      sx = 1 + 0.5 * sp; sy = 1 - 0.3 * sp;
    }
    const r0 = 88 * Math.min(1, born) * (1 - toForm);
    if (t > LAUNCH && t < LAUNCH + 0.4) { // speed lines
      for (let i = 0; i < 6; i++) { c.strokeStyle = col(P.cream, 0.7 * (1 - prog(t, LAUNCH, LAUNCH + 0.4))); c.lineWidth = 6; c.beginPath(); const yy = by - 50 + i * 20; c.moveTo(bx - 120 - i * 30, yy); c.lineTo(bx - 260 - i * 30, yy); c.stroke(); }
    }
    ball(c, bx, by, r0, { base: P.cream, light: '#FFFFFF', dark: '#FFD9BF', eyes: 1, look: [1, -0.2], sx, sy, rot });
  }
  c.restore();
  // white ring at the wipe edge
  if (wipe > 0 && wipe < 1) { c.strokeStyle = col(P.cream, 1 - wipe); c.lineWidth = 30 * (1 - wipe); c.beginPath(); c.arc(CX, CY, 2300 * wipe, 0, TAU); c.stroke(); }
}

// ---------------------------------------------------------------- scene: craft (frames, curve, timeline)
const CR1 = [Wd('Каждый', v(29.76)), Wd('кадр.', v(30.16), 'i')];
const CR2 = [Wd('Каждый', v(30.64)), Wd('изгиб.', v(31.04), 'i')];
const CR3 = [Wd('Каждая', v(31.52)), Wd('секунда', v(31.96), 'i')];
const CR4 = [Wd('работает', v(32.4)), Wd('на', v(32.88)), Wd('идею.', v(33.04), 'i')];
function miniScene(c, k, w, h, t) {
  const kinds = [
    () => { c.fillStyle = '#FFF'; c.fillRect(0, 0, w, h); ball(c, w / 2, h / 2 + 8, 40, { eyes: 1 }); },
    () => { c.fillStyle = P.or; c.fillRect(0, 0, w, h); c.strokeStyle = P.cream; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, h - 40); c.bezierCurveTo(100, 10, 180, h, w - 30, 40); c.stroke(); },
    () => { c.fillStyle = P.n2; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, 50, 0, TAU); c.fill(); c.strokeStyle = P.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2, h / 2 - 36); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + 22, h / 2); c.stroke(); },
    () => { c.fillStyle = '#FFF'; c.fillRect(0, 0, w, h); blob(c, w / 2, h / 2 + 10, 52, P.purple, t, { clock: 1 }); },
    () => { c.fillStyle = P.bg2; c.fillRect(0, 0, w, h); c.font = SERIF(64); c.fillStyle = P.or; c.textAlign = 'center'; c.fillText('идея', w / 2, h / 2 + 20); c.textAlign = 'left'; },
    () => { c.fillStyle = P.ink; c.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { c.fillStyle = [P.pink, P.green, P.sky, P.or, P.purple, P.yellow][i]; c.fillRect(24, 24 + i * 22, 40 + hash(i + k) * 180, 10); } },
  ];
  kinds[k % kinds.length]();
}
function sceneCraft(c, t) {
  lightBG(c, t);
  orbs(c, t, 'peach', 10);
  // 1) wall of frames swinging in
  const wIn = E.outCubic(prog(t, S.craft[0], S.craft[0] + 0.6)), wOut = E.inCubic(prog(t, v(30.5), v(30.75)));
  if (wOut < 1) {
    const rotY = lerp(1.1, 0.32, wIn) + 0.05 * Math.sin(t * 1.5) - 1.4 * wOut;
    const zOff = lerp(1400, -260, wIn);
    const cw = 330, chh = 190, gap = 36, cols = 6, rows = 3;
    const cards = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = (i - (cols - 1) / 2) * (cw + gap), y = (j - (rows - 1) / 2) * (chh + gap) + 60;
      const corner = (dx, dy) => { const X = x + dx, Z = zOff; const xr = X * Math.cos(rotY), zr = X * Math.sin(rotY) + Z; const s = 1100 / (1100 + zr); return [CX + xr * s - 1400 * wOut, 600 + (y + dy) * s]; };
      cards.push({ k: j * cols + i, tl: corner(-cw / 2, -chh / 2), tr: corner(cw / 2, -chh / 2), bl: corner(-cw / 2, chh / 2), z: x * Math.sin(rotY) });
    }
    cards.sort((a, b) => b.z - a.z);
    for (const cd of cards) {
      const d = prog(t, S.craft[0] + cd.k * 0.015, S.craft[0] + cd.k * 0.015 + 0.3);
      if (d <= 0) continue;
      c.save();
      c.setTransform((cd.tr[0] - cd.tl[0]) / cw, (cd.tr[1] - cd.tl[1]) / cw, (cd.bl[0] - cd.tl[0]) / chh, (cd.bl[1] - cd.tl[1]) / chh, cd.tl[0], cd.tl[1]);
      c.globalAlpha = d;
      c.shadowColor = 'rgba(40,30,20,0.18)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
      rr(c, 0, 0, cw, chh, 18); c.fillStyle = '#fff'; c.fill(); c.shadowBlur = 0;
      c.save(); rr(c, 0, 0, cw, chh, 18); c.clip(); miniScene(c, cd.k, cw, chh, t); c.restore();
      c.restore();
    }
    c.globalAlpha = 1;
  }
  // 2) bezier editor
  const bIn = E.outCubic(prog(t, v(30.6), v(30.95))), bOut = E.inCubic(prog(t, v(32.35), v(32.7)));
  if (bIn > 0 && bOut < 1 && t < v(31.5)) {
    const drag = E.inOutCubic(prog(t, v(31.0), v(31.45)));
    const A0 = [460, 820], A1 = [1460, 380];
    const H0 = [lerp(1000, 820, drag), lerp(860, 980, drag)], H1 = [lerp(900, 1160, drag), lerp(380, 180, drag)];
    c.save(); c.globalAlpha = bIn; c.translate(0, (1 - bIn) * 80);
    c.strokeStyle = col(P.gray, 0.7); c.lineWidth = 3;
    c.beginPath(); c.moveTo(...A0); c.lineTo(...H0); c.moveTo(...A1); c.lineTo(...H1); c.stroke();
    c.strokeStyle = P.or; c.lineWidth = 16; c.lineCap = 'round';
    const dp = E.inOutCubic(prog(t, v(30.64), v(31.0)));
    c.setLineDash([2400, 2400]); c.lineDashOffset = 2400 * (1 - dp);
    c.beginPath(); c.moveTo(...A0); c.bezierCurveTo(...H0, ...H1, ...A1); c.stroke(); c.setLineDash([]);
    for (const h of [H0, H1]) { c.fillStyle = '#fff'; c.strokeStyle = P.ink; c.lineWidth = 4; c.fillRect(h[0] - 14, h[1] - 14, 28, 28); c.strokeRect(h[0] - 14, h[1] - 14, 28, 28); }
    for (const a of [A0, A1]) { c.fillStyle = P.ink; c.beginPath(); c.arc(a[0], a[1], 16, 0, TAU); c.fill(); }
    cursor(c, H1[0] + 18, H1[1] + 22, t > v(31.0) && t < v(31.45));
    c.restore();
  }
  // 3) timeline
  const tlIn = spring(t, v(31.45), 2.4, 0.42), tlOut = E.inBack(prog(t, v(32.45), v(32.75)));
  if (t > v(31.45) && tlOut < 1) {
    const sc = (1 - tlOut);
    c.save(); c.translate(CX, lerp(1300, 650, tlIn)); c.scale(sc, sc);
    card(c, -680, -150, 1360, 300, 28, '#fff', 0.16, 60, 26);
    const tracks = [[P.or, 0.05, 0.55], [P.blue, 0.25, 0.85], [P.pink, 0.4, 0.95]];
    tracks.forEach(([cl, a, b], i) => {
      rr(c, -600 + a * 1200, -90 + i * 66, (b - a) * 1200, 40, 12); c.fillStyle = col(cl, 0.25); c.fill();
      for (let k = 0; k < 4; k++) {
        const kx = -600 + (a + (b - a) * k / 3) * 1200, kt = v(31.6) + i * 0.08 + k * 0.1;
        const s = E.outBack(prog(t, kt, kt + 0.25)) * 14;
        c.save(); c.translate(kx, -70 + i * 66); c.rotate(Math.PI / 4); c.fillStyle = cl; c.fillRect(-s / 2, -s / 2, s, s); c.restore();
      }
    });
    const ph = prog(t, v(31.5), v(32.4));
    c.strokeStyle = P.or; c.lineWidth = 4; c.beginPath(); c.moveTo(-600 + ph * 1200, -130); c.lineTo(-600 + ph * 1200, 120); c.stroke();
    c.fillStyle = P.or; c.beginPath(); c.moveTo(-614 + ph * 1200, -140); c.lineTo(-586 + ph * 1200, -140); c.lineTo(-600 + ph * 1200, -122); c.fill();
    const tc = t - S.craft[0] + 29.0;
    c.font = SANS(800, 64); c.fillStyle = P.ink; c.textAlign = 'center';
    c.fillText(`00:${String(Math.floor(tc)).padStart(2, '0')}:${String(Math.floor(frac(tc) * 60)).padStart(2, '0')}`, 0, -190);
    c.textAlign = 'left';
    c.restore();
  }
  // 4) everything for the idea: the ball returns and winks
  const bIn2 = spring(t, v(32.55), 2.4, 0.35);
  if (t > v(32.55)) {
    const wink = t > v(33.04) && t < v(33.4) ? 1 : 0;
    shadow(c, CX, 790, 140 * Math.min(1, bIn2), 0);
    ball(c, CX, 620, 140 * bIn2, { eyes: 1, wink, look: [0, 0.2] });
  }
  if (t < v(30.6)) caption(c, t, CR1, 190, 80, { out: v(30.55) });
  else if (t < v(31.5)) caption(c, t, CR2, 190, 80, { out: v(31.45) });
  else if (t < v(32.38)) caption(c, t, CR3, 190, 80, { out: v(32.32) });
  else caption(c, t, CR4, 190, 80, { out: S.craft[1] - 0.2 });
}
function cursor(c, x, y, down) {
  c.save(); c.translate(x, y); c.scale(down ? 0.9 : 1, down ? 0.9 : 1);
  c.fillStyle = '#fff'; c.strokeStyle = P.ink; c.lineWidth = 3; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 44); c.lineTo(11, 34); c.lineTo(19, 52); c.lineTo(27, 48); c.lineTo(19, 31); c.lineTo(33, 31); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- scene: code
const CODE = [
  [['k', 'const '], ['v', 'idea'], ['p', ' = '], ['k', 'new '], ['f', 'Ball'], ['p', '({ color: '], ['s', "'#FF5A1F'"], ['p', ' });']],
  [['v', 'idea'], ['p', '.'], ['f', 'squash'], ['p', '('], ['n', '1.2'], ['p', ').'], ['f', 'stretch'], ['p', '('], ['n', '0.8'], ['p', ');']],
  [['v', 'voice'], ['p', '.'], ['f', 'on'], ['p', '('], ['s', "'импульс'"], ['p', ', () => '], ['v', 'idea'], ['p', '.'], ['f', 'launch'], ['p', '());']],
  [['v', 'line'], ['p', '.'], ['f', 'morph'], ['p', '(['], ['s', "'круг'"], ['p', ', '], ['s', "'треугольник'"], ['p', ', '], ['s', "'квадрат'"], ['p', ']);']],
  [['c', '// каждый кадр — функция от времени']],
  [['f', 'render'], ['p', '({ fps: '], ['n', '60'], ['p', ', frames: '], ['n', '2760'], ['p', ' });']],
];
const CODEC = { k: '#FF5C8A', v: '#E6EDF3', p: '#9AA4B2', f: '#79C0FF', s: '#7EE787', n: '#FFA657', c: '#6E7681' };
const CD1 = [Wd('И', v(33.587), '', '#fff'), Wd('да —', v(33.68), '', '#fff'), Wd('всё', v(33.92), '', '#fff'), Wd('это', v(34.12), '', '#fff'), Wd('сделано', v(34.32), '', '#fff'), Wd('кодом.', v(34.8), 'i', P.or)];
const CD2 = [Wd('Без', v(35.36), '', '#fff'), Wd('After Effects.', v(35.6), 'i', P.or)];
function sceneCode(c, t) {
  c.fillStyle = '#0D1016'; c.fillRect(-60, -60, W + 120, H + 120);
  const g = c.createRadialGradient(CX, CY, 100, CX, CY, 1100); g.addColorStop(0, 'rgba(90,60,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const drift = (t - S.code[0]) * 18;
  c.save(); c.translate(-drift, -drift * 0.4);
  card(c, 180, 300, 1560, 640, 26, '#161B22', 0.5, 80, 30);
  c.fillStyle = '#1F2630'; rr(c, 180, 300, 1560, 64, 26); c.fill(); c.fillRect(180, 340, 1560, 24);
  for (let i = 0; i < 3; i++) { c.fillStyle = ['#FF5F57', '#FEBC2E', '#28C840'][i]; c.beginPath(); c.arc(220 + i * 30, 332, 9, 0, TAU); c.fill(); }
  c.fillStyle = '#9AA4B2'; c.font = UI(500, 22); c.fillText('reel.js — от идеи к движению', 340, 340);
  // typing
  const t0 = v(33.6), rate = 62;
  let budget = Math.max(0, (t - t0) * rate);
  c.font = MONO(30);
  CODE.forEach((ln, li) => {
    const y = 440 + li * 74;
    c.fillStyle = '#4A5260'; c.textAlign = 'right'; c.fillText(String(li + 1), 270, y); c.textAlign = 'left';
    let x = 310;
    for (const [k, s] of ln) {
      if (budget <= 0) break;
      const n = Math.min(s.length, Math.floor(budget)); budget -= s.length;
      c.fillStyle = CODEC[k]; const part = s.slice(0, n); c.fillText(part, x, y); x += c.measureText(part).width;
      if (budget <= 0 && Math.floor(t * 5) % 2 === 0) { c.fillStyle = P.or; c.fillRect(x + 2, y - 28, 3, 36); }
    }
  });
  c.restore();
  caption(c, t, CD1, 190, 66, { out: v(35.3) });
  if (t > v(35.3)) caption(c, t, CD2, 190, 80);
  // the «Ae» tile gets struck out
  if (t > v(35.5)) {
    const k = popK(t, v(35.55), 0.4);
    c.save(); c.translate(1500, 700); c.scale(k.s, k.s); c.rotate(-0.06);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 40; rr(c, -120, -120, 240, 240, 52); c.fillStyle = '#00005B'; c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#9999FF'; c.lineWidth = 8; rr(c, -108, -108, 216, 216, 44); c.stroke();
    c.fillStyle = '#9999FF'; c.font = SANS(700, 120); c.textAlign = 'center'; c.fillText('Ae', 0, 42); c.textAlign = 'left';
    const st = prog(t, v(35.92), v(36.25));
    if (st > 0) {
      c.strokeStyle = P.or; c.lineWidth = 22; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, 175, -2.4, -2.4 + TAU * Math.min(1, st * 1.4)); c.stroke();
      if (st > 0.6) { const q = (st - 0.6) / 0.4; c.beginPath(); c.moveTo(-125, -125); c.lineTo(-125 + 250 * q, -125 + 250 * q); c.stroke(); }
    }
    c.restore();
  }
}

// ---------------------------------------------------------------- scene: title lockup + CTA
const TT1 = [Wd('Это', v(36.64)), Wd('—', v(36.9))];
const FIN1 = [Wd('От', v(38.24)), Wd('идеи', v(38.6))];
function sceneTitle(c, t) {
  lightBG(c, t);
  orbs(c, t, 'peach', 14);
  const t0 = S.title[0];
  // «Это — моушн-дизайн.»
  const swap = E.inCubic(prog(t, v(38.1), v(38.3)));
  if (swap < 1) {
    c.save(); c.translate(0, -120 * swap); c.globalAlpha = 1 - swap;
    kline(c, t, TT1, CX, 420, 150);
    const word = 'моушн-дизайн.';
    c.font = SERIF(186); const ww = c.measureText(word).width;
    let x = CX - ww / 2;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i], cw = c.measureText(ch).width;
      const tk = v(37.307) + i * 0.03;
      if (t > tk) {
        const k = popK(t, tk, 0.4);
        c.save(); c.translate(x + cw / 2, 700 + k.y * 2); c.scale(k.s, k.s); c.rotate((1 - k.p) * 0.3);
        c.fillStyle = col(P.or, k.a); c.fillText(ch, -cw / 2, 0); c.restore();
      }
      x += cw;
    }
    c.restore();
  }
  drawLockup(c, t, 0);
}
function lockupGeo(c) {
  if (lockupGeo.g) return lockupGeo.g;
  c.save();
  c.font = SANS(900, 170); c.letterSpacing = '-4px';
  const w1 = c.measureText('От идеи').width, wOt = c.measureText('От ').width;
  c.font = SANS(900, 170); const wk = c.measureText('к ').width;
  c.font = SERIF(200); c.letterSpacing = '0px'; const wd = c.measureText('движению').width;
  c.restore();
  const w2 = wk + wd;
  lockupGeo.g = { w1, wOt, wk, wd, w2, x1: CX - w1 / 2 - 40, x2: CX - w2 / 2 - 40 };
  return lockupGeo.g;
}
function lockupBall(t, g) {
  const end1 = [g.x1 + g.w1 + 60, 455], end2 = [g.x2 + g.w2 + 84, 690];
  const tj = v(39.44), land = v(39.95);
  if (t < tj) return { x: end1[0], y: end1[1], sx: 1, sy: 1 };
  const p = prog(t, tj, land);
  const x = lerp(end1[0], end2[0], p), y = lerp(end1[1], end2[1], p) - Math.sin(Math.PI * p) * 260;
  let sx = 1, sy = 1;
  if (p < 1) { sx = 0.9; sy = 1.12; } else { const a = t - land; const w = Math.exp(-a * 7) * Math.cos(a * 30); sx = 1 + 0.3 * w; sy = 1 - 0.3 * w; }
  return { x, y, sx, sy };
}
function drawLockup(c, t, ctaK) {
  if (t < v(38.2)) return;
  const g = lockupGeo(c);
  const up = E.inOutCubic(prog(t, v(40.3), v(40.9)));
  c.save();
  c.translate(CX, 560); c.scale(1 - 0.32 * up, 1 - 0.32 * up); c.translate(-CX, -560 - 330 * up);
  // line 1
  c.font = SANS(900, 170); c.letterSpacing = '-4px';
  for (const [txt, tt, x] of [['От', v(38.24), g.x1], ['идеи', v(38.6), g.x1 + g.wOt]]) {
    if (t < tt - 0.05) continue;
    const k = popK(t, tt - 0.05, 0.4);
    const tw = c.measureText(txt).width;
    c.save(); c.translate(x + tw / 2, 520 + k.y); c.scale(k.s, k.s); c.fillStyle = col(P.ink, k.a); c.fillText(txt, -tw / 2, 0); c.restore();
  }
  // line 2
  if (t > v(39.28) - 0.05) {
    const k = popK(t, v(39.28) - 0.05, 0.4);
    c.save(); c.translate(g.x2 + 40, 750 + k.y); c.scale(k.s, k.s); c.fillStyle = col(P.ink, k.a); c.fillText('к', -40, 0); c.restore();
  }
  c.letterSpacing = '0px';
  if (t > v(39.44) - 0.05) {
    const k = popK(t, v(39.44) - 0.05, 0.5);
    c.save(); c.translate(g.x2 + g.wk + g.wd / 2, 750 + k.y); c.scale(k.s, k.s); c.font = SERIF(200); c.fillStyle = col(P.or, k.a); c.fillText('движению', -g.wd / 2, 0); c.restore();
  }
  // dots «…» merge into the ball, which jumps down to become the full stop
  const dotsT = v(38.75);
  if (t > dotsT) {
    const b = lockupBall(t, g);
    const merge = E.inOutCubic(prog(t, v(39.0), v(39.25)));
    if (merge < 1) for (let i = 0; i < 3; i++) {
      const k = popK(t, dotsT + i * 0.08, 0.3);
      const bx = lerp(g.x1 + g.w1 + 30 + i * 40, b.x, merge), by = 505 - Math.abs(Math.sin((t - dotsT) * 9 + i)) * 20 * (1 - merge);
      ball(c, bx, by, 15 * k.s, {});
    }
    if (merge > 0) {
      const r = lerp(15, 36, merge);
      const ballY = t < v(39.44) ? lerp(505, 455, merge) : b.y;
      ball(c, b.x, ballY, r, { eyes: prog(t, v(39.95), v(40.2)), sx: b.sx, sy: b.sy, look: [-0.6, -0.4], wink: t > v(41.9) && t < v(42.4) ? 1 : 0 });
      if (t > v(39.95) && t < v(39.95) + 0.7) {
        const p = prog(t, v(39.95), v(39.95) + 0.7);
        c.strokeStyle = col(P.or, 1 - p); c.lineWidth = 6 * (1 - p) + 1; c.beginPath(); c.arc(b.x, b.y, 40 + 160 * E.outCubic(p), 0, TAU); c.stroke();
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; star(c, b.x + Math.cos(a) * (60 + 140 * p), b.y + Math.sin(a) * (60 + 140 * p), 12 * (1 - p), i % 2 ? P.or : P.yellow); }
      }
    }
  }
  c.restore();
}
function sceneCTA(c, t) {
  lightBG(c, t);
  orbs(c, t, 'peach', 14);
  drawLockup(c, t, 1);
  const q = [Wd('Нужен', v(40.24)), Wd('такой', v(40.48)), Wd('же?', v(40.8), 'i')];
  caption(c, t, q, 700, 70);
  // CTA pill
  const pin = spring(t, v(41.1), 2.2, 0.4);
  if (t > v(41.1)) {
    const press = t > v(41.84) && t < v(42.0) ? 1 : 0;
    const bounce = t > v(42.0) ? Math.exp(-(t - v(42.0)) * 7) * Math.cos((t - v(42.0)) * 26) : 0;
    c.save(); c.translate(CX, 860); c.scale(pin * (1 - 0.06 * press + 0.06 * bounce), pin * (1 - 0.06 * press - 0.04 * bounce));
    card(c, -360, -72, 720, 144, 72, P.ink, 0.3, 50, 20);
    c.font = SANS(800, 64); c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText('Пиши —', 20, 22);
    c.font = SERIF(74); c.fillStyle = P.or; c.textAlign = 'left'; c.fillText('сделаем', 44, 24);
    c.restore();
    // cursor
    const cx2 = lerp(W + 100, CX + 230, E.outCubic(prog(t, v(41.2), v(41.75)))), cy2 = lerp(H + 100, 880, E.outCubic(prog(t, v(41.2), v(41.75))));
    cursor(c, cx2, cy2, press);
    // confetti balls
    if (t > v(41.84)) {
      const a = t - v(41.84);
      for (let i = 0; i < 46; i++) {
        const th = -Math.PI / 2 + (hash(i) - 0.5) * 2.6, sp = 500 + 900 * hash(i * 3);
        const x = CX + (hash(i * 5) - 0.5) * 500 + Math.cos(th) * sp * a, y = 860 + Math.sin(th) * sp * a + 1100 * a * a;
        if (y > H + 50) continue;
        const r = 8 + 14 * hash(i * 7);
        if (i % 4 === 0) star(c, x, y, r * 1.2, P.yellow); else ball(c, x, y, r, i % 3 ? {} : { base: P.pink, light: '#FF9CC0', dark: '#C21F5C' });
      }
    }
  }
  c.font = UI(600, 22); c.letterSpacing = '6px'; c.textAlign = 'center'; c.fillStyle = col(P.gray, prog(t, v(41.5), v(42.2)));
  c.fillText('MOTION DESIGN  ·  SHOWREEL 2026', CX, 1030); c.textAlign = 'left'; c.letterSpacing = '0px';
}

// ---------------------------------------------------------------- frame assembly + transitions
const SCENES = [['hook', sceneHook], ['notes', sceneNotes], ['dot', sceneDot], ['bites', sceneBites], ['night', sceneNight], ['impulse', sceneImpulse], ['craft', sceneCraft], ['code', sceneCode], ['title', sceneTitle], ['cta', sceneCTA]];
// transition into scene i: 'up' slide, 'none', 'whipL', 'whipR'
const TRANS = { notes: 'up', craft: 'whipL', code: 'whipR', title: 'slam' };
function shakeAt(t) {
  let x = 0, y = 0;
  const add = (t0, amp, k = 9) => { if (t < t0 || t > t0 + 1) return; const e = amp * Math.exp(-(t - t0) * k); x += e * Math.sin(t * 90 + t0); y += e * Math.cos(t * 73 + t0); };
  add(BITE1, 14); add(BITE2, 12); add(v(14.28), 8); add(v(24.13), 18); add(LAUNCH, 10); add(v(39.95), 10); add(S.title[0], 12); add(v(22.48), 6);
  return [x, y];
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.lineCap = 'butt'; ctx.setLineDash([]);
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= S[SCENES[i][0]][0]) idx = i;
  const [name, fn] = SCENES[idx];
  const t0 = S[name][0], t1 = S[name][1];
  let dx = 0, dy = 0, blurX = 0, blurY = 0;
  const tin = TRANS[name];
  if (tin === 'up') { const p = prog(t, t0, t0 + 0.32); dy = 0; blurY = 60 * (1 - p) * (p > 0 ? 1 : 0); }
  if (tin === 'whipL' || tin === 'whipR') { const p = E.outExpo(prog(t, t0, t0 + 0.3)); const s = tin === 'whipL' ? 1 : -1; dx = s * W * 0.6 * (1 - p); blurX = 120 * (1 - p); }
  const nxt = SCENES[idx + 1] ? TRANS[SCENES[idx + 1][0]] : null;
  if (nxt === 'up') { const p = E.inCubic(prog(t, t1 - 0.22, t1)); dy = -H * 0.5 * p; blurY = 70 * p; }
  if (nxt === 'whipL' || nxt === 'whipR') { const p = E.inExpo(prog(t, t1 - 0.2, t1)); const s = nxt === 'whipL' ? -1 : 1; dx = s * W * 0.6 * p; blurX = 120 * p; }
  const sh = shakeAt(t);
  ctx.save(); ctx.translate(dx + sh[0], dy + sh[1]);
  fn(ctx, t);
  ctx.restore();
  post(t, blurX, blurY);
}
function dirBlur(bx, by) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  const n = 8;
  for (let i = 1; i <= n; i++) { ctx.globalAlpha = 0.5 / i; ctx.drawImage(tmp, bx * i / n, by * i / n); ctx.drawImage(tmp, -bx * i / n, -by * i / n); }
  ctx.globalAlpha = 1;
}
function post(t, bx, by) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (Math.abs(bx) + Math.abs(by) > 2) dirBlur(bx, by);
  // zoom-through into the idea dot (notes → dot) and slam into the title
  const zt = S.notes[1];
  let flash = 0;
  if (t > zt - 0.05 && t < zt + 0.12) flash = Math.max(flash, 0.6 * (1 - Math.abs(t - zt) / 0.12));
  if (t > S.title[0] && t < S.title[0] + 0.2) flash = Math.max(flash, 0.7 * (1 - (t - S.title[0]) / 0.2));
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
  // grain
  const f = Math.floor(t * FPS);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.06;
  const ox = -Math.floor(hash(f) * 512), oy = -Math.floor(hash(f + 0.5) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(grains[f % 3], x, y);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const fin = 1 - prog(t, 0, 0.25), fo = prog(t, DUR - 0.45, DUR);
  const k = Math.max(fin, fo);
  if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet
function buildEvents() {
  const words = [...HK1, ...HK2, ...NT, ...DT, ...BT1, ...BT2, ...BT3, ...BT4, ...NG1, ...NG2, ...NG3, ...IMP1, ...IMP2, ...IMP3, ...IMP4, ...CR1, ...CR2, ...CR3, ...CR4, ...CD1, ...CD2, ...TT1, ...FIN1];
  for (const w of words) ev(w.t - 0.04, w.k ? 'popAccent' : 'pop');
  ev(S.notes[0], 'slideUp');
  ev(v(3.68), 'scribble'); ev(v(16.64), 'scribble');
  for (const [a, n] of [[v(4.48), 11], [v(6.24), 14]]) for (let i = 0; i < n; i++) ev(a + i * 0.32 / n, 'key');
  ev(v(5.0), 'blip');
  ev(S.notes[1] - 0.32, 'zoomThrough', { end: S.notes[1] });
  ev(S.dot[0] + 0.05, 'boing');
  ev(v(9.28), 'shrink'); ev(v(10.24), 'warm'); ev(v(11.2), 'eyes'); ev(v(11.75), 'land');
  ev(v(11.95), 'hops'); ev(BITE1, 'chomp'); ev(v(14.1), 'splat'); ev(BITE2, 'chomp2');
  ev(v(15.84), 'vortex', { end: v(18.5) }); ev(SUCK, 'suck'); ev(v(18.4), 'swallow', { end: S.bites[1] });
  ev(v(18.96), 'clockSpin', { end: v(19.92) }); ev(v(19.92), 'dong');
  ev(v(20.72), 'tabs', { end: v(22.48) }); ev(v(22.48), 'freeze'); ev(v(22.48), 'flatline');
  ev(v(24.13), 'wipe'); ev(v(24.3), 'pop2');
  ev(v(24.75), 'stretch', { end: LAUNCH }); ev(LAUNCH, 'launch'); ev(LAUNCH + 0.75, 'land2');
  ev(v(27.6), 'morph'); ev(v(28.08), 'shapePop'); ev(v(28.2), 'shapePop');
  ev(S.craft[0], 'whip'); ev(v(30.5), 'whoosh'); ev(v(31.0), 'drag', { end: v(31.45) }); ev(v(31.45), 'panel');
  for (let i = 0; i < 12; i++) ev(v(31.6) + Math.floor(i / 4) * 0.08 + (i % 4) * 0.1, 'kf');
  ev(v(32.55), 'boing'); ev(v(33.04), 'wink');
  ev(S.code[0], 'whip');
  { let tt = v(33.6); const total = CODE.flat().map(x => x[1]).join('').length; for (let i = 0; i < total; i += 2) ev(tt + i / 62, 'key2'); }
  ev(v(35.55), 'aePop'); ev(v(35.92), 'marker', { end: v(36.25) }); ev(v(36.2), 'stamp');
  ev(S.title[0], 'slam');
  for (let i = 0; i < 13; i++) ev(v(37.307) + i * 0.03, 'plink', { i });
  ev(v(38.75), 'dots'); ev(v(39.44), 'jump'); ev(v(39.95), 'finalHit');
  ev(v(40.3), 'whoosh'); ev(v(41.1), 'pillPop'); ev(v(41.84), 'click'); ev(v(41.86), 'confetti');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = [
    ['Inter Display', 'file:///usr/share/fonts/opentype/inter/InterDisplay-Black.otf', '900', 'normal'],
    ['Inter Display', 'file:///usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf', '800', 'normal'],
    ['Inter Display', 'file:///usr/share/fonts/opentype/inter/InterDisplay-Bold.otf', '700', 'normal'],
    ['Inter', 'file:///usr/share/fonts/opentype/inter/Inter-Medium.otf', '500', 'normal'],
    ['Inter', 'file:///usr/share/fonts/opentype/inter/Inter-SemiBold.otf', '600', 'normal'],
    ['Inter', 'file:///usr/share/fonts/opentype/inter/Inter-Bold.otf', '700', 'normal'],
    ['Playfair', 'fonts/PlayfairDisplay-MediumItalic.ttf', '500', 'italic'],
    ['Playfair', 'fonts/PlayfairDisplay-BoldItalic.ttf', '700', 'italic'],
    ['Caveat', 'fonts/Caveat-Bold.ttf', '700', 'normal'],
    ['DejaVu Sans Mono', 'file:///usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '400', 'normal'],
  ];
  for (const [fam, url, wt, st] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt, style: st }); await f.load(); document.fonts.add(f); }
  ORB_SHARP = makeOrb('#FFB48A', '#FFE3D0', false); ORB_SOFT = makeOrb('#FFB48A', '#FFE3D0', true);
  ORB_CREAM = makeOrb('#FFE6D2', '#FFFFFF', false); ORB_CREAM_SOFT = makeOrb('#FFE6D2', '#FFFFFF', true);
  for (let k = 0; k < 3; k++) {
    const cv = mk(512, 512), gc = cv.getContext('2d'), id = gc.createImageData(512, 512), r = rng(50 + k);
    for (let i = 0; i < id.data.length; i += 4) { const vv = 128 + (r() + r() - 1) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = vv; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); grains.push(cv);
  }
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { window.BOOT_ERROR = String(e && e.stack || e); });
