// SALTA ADDICT — «Стильная странность». 16.5 s vertical fashion clip (1080×1920, 60 fps).
// One Almaty day, all four seasons (the brand's own line): 08:00 meeting, 13:00 rain,
// 18:00 wind, 21:00 party, 21:30 mountains — five real looks from their 2025–26
// collections. Next to her lives «S», the brand's mascot (the S with eyes and the
// rock-horns hand from their avatar) — the free child inside who sabotages any
// seriousness. A 3D slate satin (their avatar backdrop) opens and closes the day;
// the five looks end up inside the five letters of SALTA. Every frame is f(t).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2;
export const BPM = 120, BEAT = 0.5;
export const DUR = 16.5;
const T = { pro: 0, s1: 2, s2: 4, s3: 6, s4: 8, s5: 10, f1: 12, f2: 14 };

// ---------------------------------------------------------------- utils
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const col = (h, a = 1) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inOutQuint: x => x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
};
const spring = (t, t0, f = 3.0, z = 0.3) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * TAU * f * a) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * a); };
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const OS = (w, s) => `${w} ${s}px "Oswald"`;
const CG = (w, s) => `italic ${w} ${s}px "Cormorant"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

const out = document.getElementById('c');
const ctx = out.getContext('2d');
const tmp = mk(W, H), tctx = tmp.getContext('2d');
const lay = mk(W, H), lctx = lay.getContext('2d');

// ---------------------------------------------------------------- the five looks (cut-outs of their own lookbook)
const LOOKS = {
  suit: { file: 'cut/suit.png' },
  mint: { file: 'cut/mint.png' },
  ornek: { file: 'cut/ornek.png' },
  kiss: { file: 'cut/kiss.png' },
  space: { file: 'cut/space.png' },
};
async function loadImg(src) { const im = new Image(); im.src = src; await im.decode(); return im; }
function bounds(im) {   // alpha bounding box + head centre (first opaque rows)
  const c = mk(im.width, im.height).getContext('2d'); c.drawImage(im, 0, 0);
  const d = c.getImageData(0, 0, im.width, im.height).data, w = im.width, h = im.height;
  let top = h, l = w, r = 0, bot = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 128) { if (y < top) top = y; if (y > bot) bot = y; if (x < l) l = x; if (x > r) r = x; }
  let hs = 0, hn = 0; for (let y = top; y < top + 60; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 128) { hs += x; hn++; }
  // sample points inside the garment (for rain beads)
  const pts = [];
  for (let i = 0; pts.length < 90 && i < 6000; i++) { const x = Math.floor(hash(i * 3.3) * w), y = Math.floor(top + (0.28 + 0.6 * hash(i * 7.1)) * (h - top)); if (d[(y * w + x) * 4 + 3] > 250) pts.push([x / w, y / h]); }
  return { top: top / h, bot: bot / h, l: l / w, r: r / w, head: hn ? hs / hn / w : 0.5, pts };
}
// draw a look: bottom-anchored, head top at y=headY, centred so the head sits at x=cx
function lookRect(L, headY, height, cx) {
  const im = L.im, h = height, w = h * im.width / im.height;
  const y = headY - L.b.top * h, x = cx - L.b.head * w;
  return { x, y, w, h };
}

// ---------------------------------------------------------------- the logo letters (their SVG: p0 = the whole word; S = p1 (+ p0 inside its box), A = p2−p6, L = p5, T = p4, A = p3−p7)
let LOGO = null;
function parseLogo(svg) {
  const ds = [...svg.matchAll(/<path[^>]*?d="([^"]+)"/g)].map(m => m[1].replace(/\s+/g, ' '));
  const P = ds.map(d => new Path2D(d));
  return {
    letters: [
      { fill: [P[1]], clipFill: P[0], hole: null, box: [0, 40, 158, 360] },
      { fill: [P[2]], hole: P[6], box: [165, 40, 340, 360] },
      { fill: [P[5]], hole: null, box: [362, 40, 493, 360] },
      { fill: [P[4]], hole: null, box: [480, 40, 632, 360] },
      { fill: [P[3]], hole: P[7], box: [625, 40, 795, 360] },
    ],
  };
}
function drawLetter(c, L, color) {
  c.fillStyle = color; for (const p of L.fill) c.fill(p);
  if (L.clipFill) { c.save(); c.beginPath(); c.rect(L.box[0] - 5, 0, L.box[2] - L.box[0] + 5, 400); c.clip(); c.fill(L.clipFill); c.restore(); }
  if (L.hole) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fill(L.hole); c.restore(); }
}

// ---------------------------------------------------------------- the mascot «S» (redrawn from their avatar, rigged)
// units: avatar zoom px; origin = between the feet on the ground (465, 975); height 915
function mascot(c, x, y, h, o = {}) {
  const body = o.body || '#ffffff', eye = o.eye || '#2b2f45';
  const s = h / 915;
  c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(s * (o.sx || 1), s * (o.sy || 1)); c.translate(-465, -975);
  if (o.alpha !== undefined) c.globalAlpha = o.alpha;
  c.fillStyle = body; c.strokeStyle = body;
  // legs + feet (independent lift for walking / dancing)
  const lL = o.legL || 0, lR = o.legR || 0;
  c.fillRect(290, 845, 90, 105 - lL); c.fillRect(475, 845, 85, 105 - lR);
  c.beginPath(); c.ellipse(310, 952 - lL, 72, 24, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(545, 952 - lR, 72, 24, 0, 0, TAU); c.fill();
  // the S body: one thick stroke (top bar → arm, left loop, right loop)
  const arm = o.arm || 0;  // arm swing (radians) around the shoulder corner
  c.lineWidth = 150; c.lineCap = 'butt'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(685, 397); c.lineTo(319, 397); c.arc(319, 491, 94, -Math.PI / 2, Math.PI / 2, true);
  c.lineTo(562, 585); c.arc(562, 677.5, 92.5, -Math.PI / 2, Math.PI / 2, false); c.lineTo(170, 770); c.stroke();
  c.beginPath(); c.arc(170, 770, 75, 0, TAU); c.fill();
  // arm + hand
  c.save(); c.translate(685, 397); c.rotate(arm); c.translate(-685, -397);
  c.beginPath(); c.moveTo(685, 397); c.arc(685, 322, 75, Math.PI / 2, 0, true); c.lineTo(760, 150); c.stroke();
  c.beginPath(); c.arc(685, 232, 46, 0, TAU); c.fill();
  const k = o.horns === undefined ? 1 : o.horns;
  if (k > 0.02) {
    c.lineCap = 'round';
    c.lineWidth = 46; c.beginPath(); c.moveTo(707, 160); c.lineTo(707, 160 - 76 * k); c.stroke();
    c.lineWidth = 40; c.beginPath(); c.moveTo(815, 160); c.lineTo(815, 160 - 55 * k); c.stroke();
  }
  c.restore();
  // eyes
  const bl = o.blink || 0;
  c.strokeStyle = eye; c.fillStyle = eye; c.lineCap = 'round';
  for (const ex of [365, 541]) {
    if (o.happy) { c.lineWidth = 24; c.beginPath(); c.arc(ex, 425, 40, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue; }
    if (bl > 0.8) { c.lineWidth = 24; c.beginPath(); c.moveTo(ex - 44, 405); c.lineTo(ex + 44, 405); c.stroke(); continue; }
    c.lineWidth = 25; c.beginPath(); c.ellipse(ex, 403, 42.5, 42.5 * (1 - bl), 0, 0, TAU); c.stroke();
    if (o.lid) { c.fillStyle = body; c.fillRect(ex - 62, 340, 124, 63 * o.lid); c.fillStyle = eye; c.lineWidth = 18; c.beginPath(); c.moveTo(ex - 52, 340 + 63 * o.lid); c.lineTo(ex + 52, 340 + 63 * o.lid); c.stroke(); }
  }
  // accessories
  if (o.glasses) {           // tiny sunglasses slide down from the top
    const gk = o.glasses, gy = lerp(250, 403, gk);
    c.fillStyle = '#121216';
    for (const ex of [365, 541]) { c.beginPath(); c.roundRect(ex - 70, gy - 42, 140, 84, 30); c.fill(); }
    c.fillRect(430, gy - 18, 40, 16);
    c.fillStyle = 'rgba(255,255,255,0.55)'; for (const ex of [365, 541]) { c.beginPath(); c.roundRect(ex - 52, gy - 30, 34, 16, 8); c.fill(); }
  }
  if (o.goggles) {           // lime ski goggles like the Space Jam look
    const gk = o.goggles, gy = lerp(200, 403, gk);
    c.fillStyle = '#C8FF2E'; c.fillRect(170, gy - 22, 600, 44);
    c.beginPath(); c.roundRect(285, gy - 62, 340, 124, 58); c.fill();
    const g = c.createLinearGradient(300, gy - 50, 610, gy + 50); g.addColorStop(0, '#2fe0ff'); g.addColorStop(0.5, '#7a5cff'); g.addColorStop(1, '#ff4fa3');
    c.fillStyle = g; c.beginPath(); c.roundRect(300, gy - 48, 310, 96, 46); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.roundRect(330, gy - 36, 90, 18, 9); c.fill();
  }
  if (o.snow) {              // snow cap on the top bar
    c.fillStyle = '#ffffff'; c.globalAlpha = (o.alpha ?? 1) * o.snow;
    for (const [sx, r] of [[230, 46], [300, 58], [380, 50], [450, 60], [530, 48], [600, 54], [665, 44]]) { c.beginPath(); c.arc(sx, 325, r, Math.PI, TAU); c.fill(); }
    c.globalAlpha = o.alpha ?? 1;
  }
  c.restore();
}
const MASCOT_TOP = 60 / 915;   // fraction of height above the hand tips

// ---------------------------------------------------------------- three.js: satin + fluttering kimono
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.05;
R3.outputColorSpace = THREE.SRGBColorSpace; R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
cam.position.set(0, 0, CAMZ); cam.lookAt(0, 0, 0);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight('#c9ccff', '#1a1630', 0.6));
const key = new THREE.DirectionalLight('#fff4ea', 2.6); key.position.set(-5, 6, 9); scene.add(key);
const rim = new THREE.DirectionalLight('#a9b4ff', 1.6); rim.position.set(8, -3, 4); scene.add(rim);

const SAT = { nx: 110, ny: 200, w: 13, h: 23 };
const satGeo = new THREE.PlaneGeometry(SAT.w, SAT.h, SAT.nx, SAT.ny);
const satBase = satGeo.attributes.position.array.slice();
const satMat = new THREE.MeshPhysicalMaterial({ color: '#3a3f5e', roughness: 0.36, metalness: 0.05, sheen: 1, sheenRoughness: 0.42, sheenColor: '#c3c9ff', clearcoat: 0.25, clearcoatRoughness: 0.3, envMapIntensity: 0.5, side: THREE.DoubleSide });
const satin = new THREE.Mesh(satGeo, satMat); scene.add(satin);
// satin shape: slow diagonal folds; yank = lifted from the bottom edge and thrown up
function satinPose(t, yank = 0, drop = 0) {
  const p = satGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = satBase[i], y = satBase[i + 1];
    const v = (y + SAT.h / 2) / SAT.h;            // 0 bottom … 1 top
    let z = 0.8 * Math.sin(0.82 * x + 0.9 * Math.sin(0.17 * y + 0.4 * t) + 0.45 * t) + 0.34 * Math.sin(1.8 * x - 0.32 * y - 0.8 * t + 1.3) + 0.14 * Math.sin(0.45 * y + 0.3 * x + 0.6 * t);
    let ny = y, nx = x;
    if (yank > 0) {
      const lift = yank * (26 + 14 * (1 - v));     // bottom rises faster: the cloth folds over itself
      ny = y + lift; z += yank * Math.sin((1 - v) * Math.PI) * 5.5; nx = x + yank * 1.6 * Math.sin(v * 3 + x * 0.3);
    }
    if (drop > 0) {   // a curtain falling from the top
      const fall = (1 - drop) * (24 + 10 * v);
      ny = y + fall; z += (1 - drop) * Math.sin(v * Math.PI) * 4;
    }
    p[i] = nx; p[i + 1] = ny; p[i + 2] = z;
  }
  satGeo.attributes.position.needsUpdate = true; satGeo.computeVertexNormals();
}
let KIMONO = null;
function buildKimono(L, rect) {
  const tex = new THREE.CanvasTexture(L.im); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const g = new THREE.PlaneGeometry(rect.w / 100, rect.h / 100, 60, 90);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  m.position.set((rect.x + rect.w / 2 - CX) / 100, (CY - rect.y - rect.h / 2) / 100, 0);
  KIMONO = { m, base: g.attributes.position.array.slice(), w: rect.w / 100, h: rect.h / 100, rect };
  m.visible = false; scene.add(m);
}
function kimonoPose(t, wind) {
  const K = KIMONO, p = K.m.geometry.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = K.base[i], y = K.base[i + 1];
    const u = x / K.w, v = 0.5 - y / K.h;           // u −0.5…0.5, v 0 top … 1 bottom
    const side = sstep(0.1, 0.42, Math.abs(u)), low = sstep(0.32, 0.75, v);
    const wgt = side * low;
    const wave = Math.sin(t * 7.5 - v * 6 + u * 3) * 0.5 + Math.sin(t * 11.3 - v * 9) * 0.25;
    p[i] = x + wind * wgt * (0.55 + 0.35 * wave) * K.w * 0.12;
    p[i + 1] = y + wind * wgt * 0.25 * Math.sin(t * 9 - v * 7) * K.h * 0.01 + wind * wgt * 0.05 * K.h * 0.2;
    p[i + 2] = wind * wgt * 0.3 * wave;
  }
  K.m.geometry.attributes.position.needsUpdate = true;
}
function render3D(c, what) {
  satin.visible = what === 'satin'; if (KIMONO) KIMONO.m.visible = what === 'kimono';
  R3.render(scene, cam); c.drawImage(R3.domElement, 0, 0);
}

// ---------------------------------------------------------------- 2D helpers
function bgRad(c, a, b, cx = CX, cy = 700, r = 1500) { const g = c.createRadialGradient(cx, cy, 50, cx, cy, r); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function bgLin(c, a, b) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function glow(c, x, y, r, color, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col(color, a)); g.addColorStop(1, col(color, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
// big condensed word, letters rise from a mask line with a stagger
function bigWord(c, txt, t, t0, baseY, color, o = {}) {
  c.save(); let size = o.size || 400; c.font = OS(700, size); c.letterSpacing = (o.ls ?? -6) + 'px';
  let tw = c.measureText(txt).width; const maxW = o.maxW || 1010; if (tw > maxW) { size *= maxW / tw; c.font = OS(700, size); tw = c.measureText(txt).width; }
  const ws = [...txt].map(ch => c.measureText(ch).width + (o.ls ?? -6));
  tw = ws.reduce((a, b) => a + b, 0) - (o.ls ?? -6);
  let x = CX - tw / 2;
  c.beginPath(); c.rect(0, baseY - size * 1.2, W, size * 1.22 + (o.below || 6)); c.clip();
  const out = o.out ?? 1e9;
  for (let i = 0; i < txt.length; i++) {
    const ti = t0 + i * (o.stag ?? 0.035), k = E.outExpo(prog(t, ti, ti + 0.45));
    const ko = E.inExpo(prog(t, out + i * 0.02, out + 0.25 + i * 0.02));
    const dy = size * 1.05 * (1 - k) - size * 1.1 * ko;
    if (k > 0) {
      if (o.neon) { c.lineWidth = 7; c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 40 * o.neon; c.globalAlpha = o.neon; c.strokeText(txt[i], x, baseY + dy); c.shadowBlur = 0; c.globalAlpha = 1; }
      else { c.fillStyle = color; c.fillText(txt[i], x, baseY + dy); }
    }
    x += ws[i];
  }
  c.restore();
  return { size, tw };
}
// italic serif line, letters fade/slide in
function italic(c, txt, t, t0, x, y, size, color, align = 'center', o = {}) {
  if (t < t0) return;
  c.save(); c.font = CG(o.w || 600, size); c.letterSpacing = '0px'; c.textBaseline = 'alphabetic';
  const tw = c.measureText(txt).width; let px = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  const out = o.out ?? 1e9, ko = 1 - prog(t, out, out + 0.2);
  for (let i = 0; i < txt.length; i++) {
    const k = prog(t, t0 + i * 0.022, t0 + i * 0.022 + 0.3), e = E.outCubic(k);
    c.globalAlpha = k * ko; c.fillStyle = color; c.fillText(txt[i], px, y + 26 * (1 - e));
    px += c.measureText(txt[i]).width;
  }
  c.restore();
}
function timeStamp(c, txt, t, t0, y, color, o = {}) { italic(c, txt, t, t0, CX, y, o.size || 120, color, 'center', { w: 500, out: o.out }); }
// fade the bottom of the model into the background so captions read
function floorFade(c, color, from = 1480) { const g = c.createLinearGradient(0, from, 0, H); g.addColorStop(0, col(color, 0)); g.addColorStop(0.55, col(color, 0.85)); g.addColorStop(1, col(color, 1)); c.fillStyle = g; c.fillRect(0, from, W, H - from); }
// look reveal: rises behind a mask from the bottom, settles
function drawLook(c, name, t, t0, o = {}) {
  const L = LOOKS[name], k = E.outExpo(prog(t, t0 + (o.delay || 0.08), t0 + (o.delay || 0.08) + 0.7));
  const lt = t - t0, sc = lerp(1.08, 1, k) * (1 + 0.012 * lt);
  const r = lookRect(L, (o.headY || 560) + 160 * (1 - k), (o.height || 1700) * sc, CX + (o.dx || 0) + (o.drift || 6) * lt);
  if (k <= 0) return r;
  c.save(); c.beginPath(); c.rect(0, lerp(H, 0, k), W, H); c.clip();
  if (o.glow) { c.save(); c.filter = `blur(${o.glowBlur || 26}px)`; c.globalAlpha = o.glow; c.drawImage(L.tint, r.x, r.y, r.w, r.h); c.restore(); }
  c.drawImage(L.im, r.x, r.y, r.w, r.h);
  c.restore();
  return r;
}
function tinted(im, color) { const c = mk(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; }

// ---------------------------------------------------------------- prologue: satin, ALMATY, the S peeks and yanks the cloth
function shotPrologue(c, t) {
  const yank = E.inCubic(prog(t, 1.78, 2.22));
  if (yank > 0) shot1(c, t);              // the morning is already under the cloth
  satinPose(t, yank);
  render3D(c, 'satin');
  const lift = yank * 2600;
  c.save(); c.translate(0, -lift);
  // shadow vignette on the satin (only before the yank)
  if (yank === 0) { const g = c.createRadialGradient(CX, 900, 300, CX, 900, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,6,20,0.55)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  bigWord(c, 'АЛМАТЫ', t, 0.22, 930, '#ffffff', { size: 250, ls: 4, stag: 0.05 });
  italic(c, 'четыре сезона за один день', t, 0.75, CX, 1040, 66, '#cfd4f4');
  // the S: eyes peek over the bottom edge, blink twice, jump up and grab the cloth
  const peek = E.outBack(prog(t, 0.95, 1.25)), jump = spring(t, 1.5, 2.4, 0.35);
  const mh = 420, base = H + mh * 0.62 * (1 - peek) + 40;
  const y = base - 330 * jump;
  const bl = (t > 1.2 && t < 1.28) || (t > 1.36 && t < 1.44) ? 1 : 0;
  const sq = 1 + 0.12 * Math.sin((t - 1.5) * 18) * Math.exp(-(t - 1.5) * 5) * (t > 1.5 ? 1 : 0);
  if (t > 0.9) mascot(c, 790, y, mh, { blink: bl, sx: 1 / sq, sy: sq, horns: prog(t, 1.62, 1.75), arm: -0.25 * prog(t, 1.62, 1.78), eye: '#2b2f50' });
  c.restore();
}

// ---------------------------------------------------------------- 08:00 ВСТРЕЧА — Suit & Sweet, pinstripes, «строго. почти.»
function shot1(c, t) {
  const t0 = T.s1;
  bgRad(c, '#F6F1EA', '#E2D8CB', 820, 380, 1700);
  glow(c, 900, 330, 520, '#FFD7A1', 0.55);
  // pinstripes: the corset's stripes run across the whole frame
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 42, d = hash(i) * 0.4, k = E.outCubic(prog(t, t0 - 0.2 + d, t0 + 0.5 + d));
    c.strokeStyle = 'rgba(42,42,48,0.10)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * k); c.stroke();
  }
  timeStamp(c, '08:00', t, t0 + 0.05, 215, '#9C7A55');
  // the S hides behind the word and rises with sunglasses on beat 3
  const up = E.outBack(prog(t, t0 + 0.95, t0 + 1.2));
  const ink = '#25252B';
  if (up > 0) mascot(c, 802, 590 - 240 * up, 300, { body: ink, eye: '#F2ECE4', glasses: E.outCubic(prog(t, t0 + 1.2, t0 + 1.4)), horns: 0.0, rot: 0.05 * Math.sin((t - t0) * 6) });
  bigWord(c, 'ВСТРЕЧА', t, t0 + 0.1, 640, ink, { size: 380, stag: 0.04 });
  drawLook(c, 'suit', t, t0, { headY: 600, height: 1760 });
  floorFade(c, '#E2D8CB', 1440);
  italic(c, 'строго.', t, t0 + 0.35, CX - 60, 1760, 92, ink, 'right');
  italic(c, 'почти.', t, t0 + 1.02, CX - 30, 1760, 92, '#B0522E', 'left');
  // glint on the glasses
  const gk = prog(t, t0 + 1.4, t0 + 1.6);
  if (gk > 0 && gk < 1) { c.save(); c.translate(745, 455); c.rotate(0.6); c.fillStyle = `rgba(255,255,255,${Math.sin(gk * Math.PI)})`; c.fillRect(-3, -22 * Math.sin(gk * Math.PI), 6, 44 * Math.sin(gk * Math.PI)); c.fillRect(-22 * Math.sin(gk * Math.PI), -3, 44 * Math.sin(gk * Math.PI), 6); c.restore(); }
}

// ---------------------------------------------------------------- 13:00 ЛИВЕНЬ — Spring'26 mint, drops bead and roll off, the S is soaked
function rain(c, t, n, ang, alpha, speed = 2600, len = 90) {
  c.save(); c.strokeStyle = `rgba(255,255,255,${alpha})`; c.lineWidth = 2.2; c.lineCap = 'round';
  const dx = Math.sin(ang), dy = Math.cos(ang);
  for (let i = 0; i < n; i++) {
    const ph = hash(i * 1.9), x0 = hash(i * 4.1) * (W + 400) - 200, y = ((ph * (H + 300) + t * speed * (0.8 + 0.4 * hash(i))) % (H + 300)) - 150;
    const x = x0 + y * dx / dy; const l = len * (0.6 + 0.8 * hash(i * 2.2));
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - dx * l, y - dy * l); c.stroke();
  }
  c.restore();
}
function shot2(c, t) {
  const t0 = T.s2, lt = t - t0;
  bgLin(c, '#9DB8B2', '#D7E8E2');
  glow(c, 300, 300, 700, '#ffffff', 0.25);
  rain(c, t, 70, 0.2, 0.35, 2300, 70);
  timeStamp(c, '13:00', t, t0 + 0.05, 215, '#2F5E57');
  bigWord(c, 'ЛИВЕНЬ', t, t0 + 0.1, 640, '#1F4E48', { size: 380, stag: 0.04 });
  const r = drawLook(c, 'mint', t, t0, { headY: 600, height: 1760 });
  // beads on the blazer: land, sit, roll down and fall off
  const L = LOOKS.mint;
  L.b.pts.forEach(([u, v], i) => {
    const tb = t0 + 0.4 + hash(i * 5.7) * 1.4, k = t - tb; if (k < 0 || k > 1.1) return;
    const x = r.x + u * r.w, y = r.y + v * r.h + 140 * Math.max(0, k - 0.3) ** 2;
    const rr = 5 + 6 * hash(i * 3.3), a = clamp(k * 8) * (1 - prog(k, 0.8, 1.1));
    c.save(); c.globalAlpha = a;
    const g = c.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(220,245,240,0.55)'); g.addColorStop(1, 'rgba(40,90,80,0.35)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rr * 0.85, rr, 0, 0, TAU); c.fill(); c.restore();
  });
  rain(c, t + 3, 50, 0.2, 0.55, 2900, 110);   // foreground rain over her
  floorFade(c, '#D7E8E2', 1440);
  // the soaked S: half-closed eyes, drips; shakes like a puppy on beat 3
  const ink = '#1F4E48', sh = prog(t, t0 + 1.0, t0 + 1.45), shaking = sh > 0 && sh < 1;
  const wob = shaking ? 0.32 * Math.sin(sh * 40) * (1 - sh) : 0;
  const inK = E.outBack(prog(t, t0 + 0.3, t0 + 0.6));
  mascot(c, 880, 1890 + 200 * (1 - inK), 300, { body: ink, eye: '#D7E8E2', lid: shaking ? 0 : 0.55, horns: 0, rot: wob, sx: 1 + (shaking ? 0.08 * Math.sin(sh * 40) : 0) });
  for (let i = 0; i < 6; i++) {    // drips from the S
    const k = ((t * 1.4 + hash(i)) % 1), x = 790 + hash(i * 3) * 180, y = 1640 + 260 * k * k;
    c.fillStyle = col('#5A8F86', 0.8 * (1 - k)); c.beginPath(); c.ellipse(x, y, 5, 8, 0, 0, TAU); c.fill();
  }
  if (sh > 0) for (let i = 0; i < 26; i++) {   // spray fan
    const a = -Math.PI * (0.05 + 0.9 * hash(i * 7)), d = 60 + 420 * E.outCubic(prog(t, t0 + 1.0 + hash(i) * 0.2, t0 + 1.6)), x = 880 + Math.cos(a) * d, y = 1740 + Math.sin(a) * d * 0.8 + 200 * prog(t, t0 + 1.2, t0 + 1.9) ** 2;
    c.fillStyle = col('#ffffff', 0.85 * (1 - prog(t, t0 + 1.4, t0 + 1.9))); c.beginPath(); c.arc(x, y, 4 + 4 * hash(i * 9), 0, TAU); c.fill();
  }
  italic(c, 'ливень?', t, t0 + 0.35, 90, 1745, 92, ink, 'left');
  italic(c, 'не заметила.', t, t0 + 0.95, 90, 1840, 92, '#B0522E', 'left');
}

// ---------------------------------------------------------------- 18:00 ВЕТЕР — Ӧrnek kimono, sleeves fly, the S flaps like a flag
function windLines(c, t, n, alpha) {
  c.save(); c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = 100 + hash(i * 3.7) * (H - 200), sp = 1800 + 1600 * hash(i), len = 160 + 340 * hash(i * 1.3);
    const x = ((hash(i * 9.1) * (W + 900) + t * sp) % (W + 900)) - 450;
    c.strokeStyle = `rgba(255,236,240,${alpha * (0.4 + 0.6 * hash(i * 2))})`; c.lineWidth = 2 + 3 * hash(i * 5);
    c.beginPath(); c.moveTo(x - len, y); c.bezierCurveTo(x - len * 0.6, y - 18 * Math.sin(t * 6 + i), x - len * 0.3, y + 18, x, y); c.stroke();
  }
  c.restore();
}
function shot3(c, t) {
  const t0 = T.s3, lt = t - t0;
  bgRad(c, '#A3284A', '#4E0B1E', 400, 600, 1700);
  windLines(c, t, 26, 0.35);
  timeStamp(c, '18:00', t, t0 + 0.05, 215, '#F3B9C6');
  bigWord(c, 'ВЕТЕР', t, t0 + 0.1, 640, '#F7DCE2', { size: 400, stag: 0.04 });
  // the kimono (3D plane, sleeves flutter)
  const L = LOOKS.ornek, k = E.outExpo(prog(t, t0 + 0.08, t0 + 0.78));
  if (!KIMONO) buildKimono(L, lookRect(L, 600, 1760, CX));
  KIMONO.m.position.y = (CY - KIMONO.rect.y - KIMONO.rect.h / 2) / 100 - 1.6 * (1 - k);
  KIMONO.m.material.opacity = 1;
  kimonoPose(t, 0.6 + 0.4 * Math.sin(lt * 2.2) + 0.5 * sstep(t0 + 0.9, t0 + 1.2, t));
  c.save(); c.beginPath(); c.rect(0, lerp(H, 0, k), W, H); c.clip(); render3D(c, 'kimono'); c.restore();
  windLines(c, t + 2, 12, 0.5);
  floorFade(c, '#4E0B1E', 1460);
  // the S: blown in tumbling, grabs the full stop of the line and flaps like a flag
  const cap = 'ветер в помощь.';
  c.save(); c.font = CG(600, 96); const capW = c.measureText(cap).width; c.restore();
  const hx = 90 + capW - 8, hy = 1686, tIn = t0 + 0.45, grab = t0 + 0.95, mh = 235, ms = mh / 915;
  if (t > tIn) {
    let x, y, rot, sx = 1, sy = 1;
    const fx = hx + 890 * ms, fy = hy + 295 * ms;      // feet position that puts the hand on the dot when rot = −90°
    if (t < grab) { const k2 = E.outCubic(prog(t, tIn, grab)); x = lerp(-260, fx, k2); y = lerp(1250, fy, k2) - 200 * Math.sin(k2 * Math.PI); rot = -TAU * 1.25 * (1 - k2) - Math.PI / 2; }
    else { const f = t - grab; x = fx; y = fy + 14 * Math.sin(f * 16); rot = -Math.PI / 2 + 0.08 * Math.sin(f * 16); sy = 1 + 0.07 * Math.sin(f * 24); sx = 1 - 0.05 * Math.sin(f * 24 + 1); }
    mascot(c, x, y, mh, { body: '#ffffff', eye: '#5E0B22', rot, sx, sy, horns: 0, lid: t > grab ? 0.35 : 0 });
  }
  italic(c, cap, t, t0 + 0.5, 90, 1700, 96, '#F7DCE2', 'left');
}

// ---------------------------------------------------------------- 21:00 ТАНЦУЕМ — Kiss Mark'26, neon, kisses, 🤘
function lips(c, x, y, s, rot, a) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = a;
  c.fillStyle = '#E8142B';
  c.beginPath(); c.moveTo(-100, 0); c.bezierCurveTo(-70, -48, -30, -58, 0, -30); c.bezierCurveTo(30, -58, 70, -48, 100, 0); c.bezierCurveTo(50, -6, -50, -6, -100, 0); c.fill();
  c.beginPath(); c.moveTo(-100, 6); c.bezierCurveTo(-50, 4, 50, 4, 100, 6); c.bezierCurveTo(70, 66, -70, 66, -100, 6); c.fill();
  c.globalCompositeOperation = 'destination-out';      // print texture: a few dry streaks
  for (let i = 0; i < 9; i++) { c.globalAlpha = a * 0.35; c.fillRect(-90 + i * 21, -50 + 10 * hash(i), 3, 110); }
  c.restore();
}
function shot4(c, t) {
  const t0 = T.s4, lt = t - t0;
  c.fillStyle = '#0B0A0E'; c.fillRect(0, 0, W, H);
  const pulse = 0.5 + 0.5 * Math.cos((t - t0) * TAU * 2);   // breathes on the beat
  glow(c, CX, 700, 900, '#E8142B', 0.28 + 0.12 * pulse);
  glow(c, 200, 1500, 600, '#7A1CFF', 0.16);
  // neon word: flickers on
  const fl = t < t0 + 0.32 ? (hash(Math.floor(t * 30)) > 0.45 ? 1 : 0.15) : 1;
  bigWord(c, 'ТАНЦУЕМ', t, t0 + 0.02, 640, '#FF2D45', { size: 380, stag: 0.0, neon: fl * (0.85 + 0.15 * pulse) });
  timeStamp(c, '21:00', t, t0 + 0.05, 215, '#FF8A98');
  // kisses stamped on beats 2 and 4
  [[t0 + 0.5, 150, 1010, -0.35, 0.75], [t0 + 1.5, 935, 880, 0.3, 0.68]].forEach(([tk, x, y, r, s]) => { const k = prog(t, tk, tk + 0.12); if (k > 0) lips(c, x, y, s * lerp(1.6, 1, E.outCubic(k)), r, clamp(k * 2)); });
  drawLook(c, 'kiss', t, t0, { headY: 600, height: 1760, glow: 0.7 + 0.3 * pulse, glowBlur: 30 });
  floorFade(c, '#0B0A0E', 1460);
  // the S dances on every beat; horns + happy eyes on beat 3
  const b = ((t - t0) / BEAT) % 1, hop = Math.sin(Math.PI * clamp(b * 1.6)) * (t > t0 + 0.25 ? 1 : 0);
  const horn = t > t0 + 1.0, hk = E.outBack(prog(t, t0 + 1.0, t0 + 1.12));
  mascot(c, 870, 1880 - 70 * hop, 330, { body: '#ffffff', eye: '#0B0A0E', sy: 1 + 0.08 * hop, sx: 1 - 0.05 * hop, rot: 0.12 * Math.sin((t - t0) * Math.PI * 2), horns: horn ? hk : 0.15, happy: horn, arm: horn ? -0.15 : 0.2 * Math.sin(t * 12), legL: 40 * Math.max(0, Math.sin((t - t0) * TAU)), legR: 40 * Math.max(0, -Math.sin((t - t0) * TAU)) });
  italic(c, 'без пафоса.', t, t0 + 0.5, 90, 1800, 100, '#FFFFFF', 'left');
  // blackout flicker into the mountains
  const off = prog(t, T.s5 - 0.14, T.s5);
  if (off > 0) { c.fillStyle = `rgba(0,0,0,${hash(Math.floor(t * 40)) > 0.4 ? off : off * 0.4})`; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- 21:30 ГОРЫ — Space Jam'26, parallax peaks, snow, the S puts on goggles
function ridge(c, t, seed, baseY, amp, color, rise) {
  c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 20) {
    const u = x / W;
    const y = baseY - amp * (0.55 * Math.abs(Math.sin(u * 2.6 + seed)) + 0.3 * Math.abs(Math.sin(u * 6.1 + seed * 2)) + 0.15 * Math.sin(u * 13 + seed * 3)) + rise;
    c.lineTo(x, y);
  }
  c.lineTo(W, H); c.closePath(); c.fill();
}
function snow(c, t, n, size, speed, alpha) {
  c.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let i = 0; i < n; i++) {
    const y = ((hash(i * 2.7) * (H + 100) + t * speed * (0.6 + 0.6 * hash(i))) % (H + 100)) - 50, x = hash(i * 5.3) * W + 30 * Math.sin(t * 1.5 + i);
    c.beginPath(); c.arc(x, y, size * (0.5 + hash(i * 8)), 0, TAU); c.fill();
  }
}
function shot5(c, t) {
  const t0 = T.s5, lt = t - t0;
  bgLin(c, '#0B5D73', '#9FD6E2');
  glow(c, 760, 260, 400, '#ffffff', 0.18);
  const rise = k => 600 * (1 - E.outExpo(prog(t, t0 + k, t0 + k + 0.7)));
  ridge(c, t, 1.3, 1080, 520, '#CFEAF0', rise(0.0) + 20 * lt);
  ridge(c, t, 2.1, 1260, 420, '#86C2D1', rise(0.08) + 10 * lt);
  timeStamp(c, '21:30', t, t0 + 0.05, 215, '#E6F7FB');
  bigWord(c, 'ГОРЫ', t, t0 + 0.1, 640, '#FFFFFF', { size: 420, stag: 0.05 });
  snow(c, t, 50, 4, 160, 0.7);
  ridge(c, t, 3.4, 1500, 300, '#3F95AA', rise(0.16));
  drawLook(c, 'space', t, t0, { headY: 600, height: 1760 });
  snow(c, t + 7, 40, 7, 260, 0.9);
  floorFade(c, '#2D7F93', 1470);
  // the S shivers under a snow cap, then puts on lime goggles and freezes in a pose
  const g = E.outBack(prog(t, t0 + 1.0, t0 + 1.18)), cold = t < t0 + 1.0;
  const jit = cold ? 6 * Math.sin(t * 90) : 0;
  const inK = E.outBack(prog(t, t0 + 0.3, t0 + 0.6));
  mascot(c, 880 + jit, 1880 + 220 * (1 - inK), 300, { body: '#ffffff', eye: '#0B5D73', snow: 1, goggles: g, horns: g > 0.5 ? g : 0, arm: g > 0.5 ? -0.1 : 0, lid: cold ? 0.3 : 0 });
  italic(c, 'через полчаса.', t, t0 + 0.5, 90, 1800, 96, '#FFFFFF', 'left');
}

// ---------------------------------------------------------------- finale: one day inside five letters → the logo, the S, haha
const LETTER_LOOK = ['suit', 'mint', 'ornek', 'kiss', 'space'];
const LETTER_BG = ['#E2D8CB', '#BFD8D2', '#7A1734', '#16121A', '#4FA7BB'];
const ADD = { size: 56 };
const LOGO_W = 795;          // visible width of the letters in the SVG (0…795)
function logoLayout(t) {     // big five-letter layout → centred lockup (the S above, SALTA, ADDICT under it)
  const k = E.inOutCubic(prog(t, T.f2 + 0.02, T.f2 + 0.42));
  const s = lerp(1.3, 0.9, k);
  return { s, x: CX - LOGO_W * s / 2, y: lerp(760, 1180, k), k };
}
function shotFinale(c, t) {
  const drop = E.outCubic(prog(t, T.f1 - 0.25, T.f1 + 0.25));
  if (drop < 1) shot5(c, t);
  satinPose(t, 0, drop);
  render3D(c, 'satin');
  if (t < T.f1) return;
  // vignette
  const vg = c.createRadialGradient(CX, 900, 300, CX, 900, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,20,0.5)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  const LY = logoLayout(t), white = prog(t, T.f2, T.f2 + 0.16);
  // letters one per 8th note, each holding a look of the day
  LOGO.letters.forEach((Lt, i) => {
    const tl = T.f1 + 0.08 + i * 0.25, k = E.outBack(prog(t, tl, tl + 0.3)); if (k <= 0) return;
    const [bx0, by0, bx1, by1] = Lt.box, cxl = (bx0 + bx1) / 2, cyl = (by0 + by1) / 2;
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H);
    lctx.save(); lctx.translate(LY.x, LY.y - 320 * LY.s / 2); lctx.scale(LY.s, LY.s);
    lctx.translate(cxl, cyl); lctx.scale(lerp(1.35, 1, k), lerp(1.35, 1, k)); lctx.translate(-cxl, -cyl);
    drawLetter(lctx, Lt, LETTER_BG[i]);
    lctx.globalCompositeOperation = 'source-atop';
    const L = LOOKS[LETTER_LOOK[i]], bw = (bx1 - bx0), lh = (by1 - by0) * 2.25;
    const r = lookRect(L, by0 - 10 - 40 * (t - tl), lh, cxl);
    lctx.drawImage(L.im, r.x, r.y, r.w, r.h);
    if (white > 0) { lctx.fillStyle = `rgba(255,255,255,${white})`; lctx.fillRect(-100, -100, 1000, 600); }
    lctx.restore();
    c.drawImage(lay, 0, 0);
  });
  // flash on the logo hit
  const fl = prog(t, T.f2, T.f2 + 0.18); if (fl > 0 && fl < 1) { c.fillStyle = `rgba(255,255,255,${0.35 * (1 - fl) ** 2})`; c.fillRect(0, 0, W, H); }
  if (t < T.f2) return;
  // ADDICT, centred under SALTA and spread exactly to its width
  const ak = prog(t, T.f2 + 0.3, T.f2 + 0.6);
  c.save(); c.font = OS(500, ADD.size); c.letterSpacing = '0px'; c.fillStyle = '#ffffff';
  const word = 'ADDICT', cw = [...word].map(ch => c.measureText(ch).width), full = LOGO_W * LY.s;
  const gap = (full - cw.reduce((a, b) => a + b, 0)) / (word.length - 1);
  let x = LY.x, by = LY.y - 160 * LY.s + 360 * LY.s + 26 + ADD.size;
  for (let i = 0; i < word.length; i++) { const kk = prog(ak, i / 8, i / 8 + 0.4); c.globalAlpha = kk; c.fillText(word[i], x, by + 20 * (1 - kk)); x += cw[i] + gap; }
  c.restore();
  // the S drops onto the lockup, lands with a squash, rock horns on 15.0
  const land = T.f2 + 0.72, fall = prog(t, T.f2 + 0.45, land);
  const sq = t > land ? Math.exp(-(t - land) * 6) * Math.sin((t - land) * 20) : 0;
  const my = t < land ? lerp(-300, 1030, E.inCubic(fall)) : 1030;
  const horn = E.outBack(prog(t, 15.0, 15.14)), happy = t > 15.0 && t < 15.9;
  if (t > T.f2 + 0.45) mascot(c, CX, my, 540, { body: '#ffffff', eye: '#3a3f5e', sy: 1 - 0.18 * sq, sx: 1 + 0.12 * sq, horns: horn, happy, blink: (t > 15.95 && t < 16.03) ? 1 : 0, arm: -0.08 * horn });
  // the haha patch, stamped
  const hk = prog(t, 15.08, 15.2);
  if (hk > 0) {
    c.save(); c.translate(860, 600); c.rotate(-0.14); const s = lerp(1.8, 1, E.outCubic(hk)); c.scale(s, s); c.globalAlpha = clamp(hk * 2);
    c.fillStyle = '#E8142B'; c.beginPath(); c.roundRect(-110, -52, 220, 104, 26); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.setLineDash([9, 7]); c.lineWidth = 3; c.beginPath(); c.roundRect(-98, -40, 196, 80, 18); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffffff'; c.font = OS(600, 66); c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '2px'; c.fillText('haha', 0, 2); c.restore();
  }
  // slogan
  const sk = prog(t, 15.3, 15.7);
  if (sk > 0) {
    c.save(); c.textAlign = 'center'; c.font = OS(400, 40); c.letterSpacing = '9px'; c.fillStyle = `rgba(255,255,255,${sk})`;
    c.fillText('STYLE YOUR STRIDE.', CX + 4.5, 1620 + 20 * (1 - E.outCubic(sk)));
    const sk2 = prog(t, 15.45, 15.85); c.fillStyle = `rgba(255,255,255,${sk2})`; c.fillText('WALK WITH PRIDE.', CX + 4.5, 1680 + 20 * (1 - E.outCubic(sk2)));
    c.restore();
  }
}

// ---------------------------------------------------------------- transitions between the day's scenes
function clockWipe(c, t, tb, from, to) {   // 08:00 → 13:00: a clock hand sweeps the morning away
  const k = E.inOutCubic(prog(t, tb - 0.2, tb + 0.15));
  from(c, t);
  if (k <= 0) return;
  c.save(); c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, 2400, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.closePath(); c.clip(); to(c, t); c.restore();
  if (k < 1) { const a = -Math.PI / 2 + TAU * k; c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.moveTo(CX, CY); c.lineTo(CX + Math.cos(a) * 2400, CY + Math.sin(a) * 2400); c.stroke(); }
}
function slatWipe(c, t, tb, from, to) {    // 13:00 → 18:00: the rain turns into slanted bands and blows away
  const k = prog(t, tb - 0.18, tb + 0.16);
  from(c, t); if (k <= 0) return;
  c.save(); c.beginPath();
  const n = 9, bw = (W + H * 0.4) / n;
  for (let i = 0; i < n; i++) { const kk = E.inOutCubic(clamp(k * 1.6 - i * 0.07)); const x = -H * 0.4 + i * bw; c.moveTo(x, H); c.lineTo(x + H * 0.4, 0); c.lineTo(x + H * 0.4 + bw * kk, 0); c.lineTo(x + bw * kk, H); c.closePath(); }
  c.clip(); to(c, t); c.restore();
}
function sWipe(c, t, tb, from, to) {       // 18:00 → 21:00: the logo's S opens the night
  const k = E.inExpo(prog(t, tb - 0.25, tb + 0.1));
  from(c, t); if (k <= 0) return;
  const s = 0.05 + 38 * k;
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H);
  lctx.save(); lctx.translate(CX, CY); lctx.rotate(-0.2 * (1 - k)); lctx.scale(s, s); lctx.translate(-75, -200); drawLetter(lctx, LOGO.letters[0], '#fff'); lctx.restore();
  if (k > 0.97) { to(c, t); return; }
  lctx.globalCompositeOperation = 'source-in'; to(lctx, t); lctx.globalCompositeOperation = 'source-over';
  c.drawImage(lay, 0, 0);
}

// ---------------------------------------------------------------- frame
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < T.s1 + 0.25) shotPrologue(ctx, t);
  else if (t < T.s2 + 0.2) clockWipe(ctx, t, T.s2, shot1, shot2);
  else if (t < T.s3 + 0.2) slatWipe(ctx, t, T.s3, shot2, shot3);
  else if (t < T.s4 + 0.12) sWipe(ctx, t, T.s4, shot3, shot4);
  else if (t < T.s5) shot4(ctx, t);
  else if (t < T.f1 - 0.25) shot5(ctx, t);
  else shotFinale(ctx, t);
  post(t);
}
function post(t) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  // fine film grain for a printed-editorial texture
  c.save(); c.globalAlpha = 0.05; c.drawImage(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0, W, H); c.restore();
  const k0 = 1 - prog(t, 0, 0.18); if (k0 > 0) { c.fillStyle = `rgba(0,0,0,${k0})`; c.fillRect(0, 0, W, H); }
  const k1 = prog(t, DUR - 0.3, DUR); if (k1 > 0) { c.fillStyle = `rgba(0,0,0,${k1})`; c.fillRect(0, 0, W, H); }
}
const GRAIN = [];
function buildGrain() {
  for (let g = 0; g < 4; g++) {
    const cv = mk(540, 960), x = cv.getContext('2d'), d = x.createImageData(540, 960);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.floor(hash(i * 0.37 + g * 101.3) * 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); GRAIN.push(cv);
  }
}

// ---------------------------------------------------------------- cue sheet for the score
function buildEvents() {
  ev(0.05, 'satin'); ev(0.22, 'title'); ev(1.2, 'blink'); ev(1.36, 'blink'); ev(1.5, 'hop'); ev(1.78, 'yank');
  ev(T.s1, 'scene', { k: 'meet' }); ev(T.s1 + 1.0, 'peek'); ev(T.s1 + 1.25, 'glint');
  ev(T.s2 - 0.2, 'clock'); ev(T.s2, 'scene', { k: 'rain' }); ev(T.s2 + 1.0, 'shake');
  ev(T.s3 - 0.18, 'slats'); ev(T.s3, 'scene', { k: 'wind' }); ev(T.s3 + 0.45, 'tumble'); ev(T.s3 + 0.95, 'grab');
  ev(T.s4 - 0.25, 'swipe'); ev(T.s4, 'scene', { k: 'party' }); ev(T.s4 + 0.5, 'kiss'); ev(T.s4 + 1.5, 'kiss'); ev(T.s4 + 1.0, 'horns');
  ev(T.s5 - 0.14, 'blackout'); ev(T.s5, 'scene', { k: 'snow' }); ev(T.s5 + 1.0, 'goggles');
  ev(T.f1 - 0.25, 'curtain'); for (let i = 0; i < 5; i++) ev(T.f1 + 0.08 + i * 0.25, 'letter', { i });
  ev(T.f2, 'logo'); ev(T.f2 + 0.72, 'land'); ev(15.0, 'horns', { big: 1 }); ev(15.08, 'haha'); ev(15.3, 'slogan');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = await (await fetch('/fonts/faces.json')).json();
  for (const f of faces) { const ff = new FontFace(f.family, `url(/fonts/${f.file})`, { weight: f.weight, style: f.style, unicodeRange: f.range }); await ff.load(); document.fonts.add(ff); }
  await document.fonts.load(OS(700, 40), 'АБВ ABC'); await document.fonts.load(CG(600, 40), 'абв abc');
  LOGO = parseLogo(await (await fetch('/assets/salta_logo.svg')).text());
  for (const k of Object.keys(LOOKS)) { const L = LOOKS[k]; L.im = await loadImg(L.file); L.b = bounds(L.im); L.tint = tinted(L.im, '#FF1E3C'); }
  buildGrain();
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
