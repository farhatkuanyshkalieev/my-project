// BASQA — 8 s vertical brand reel (1080×1920, 60 fps) for @basqawear.
// Look taken from the brand: black / white, one orange (#FE572A), film grain,
// Almaty street culture, Kazakh words of the drops (Qala, Alem, Zaman), the
// wide BASQA wordmark. 2D design layer + three.js 3D (extruded logo, vinyl
// stickers, a cloth tee on a hanger) composited per frame; every frame is a
// pure function of t. «basqa» (kaz.) = «другой, иной».
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2, DUR = 8.0;
// film time (120 BPM: beat = 0.5 s, 16th = 0.125 s)
const T = { qala: 1.0, alem: 1.5, zaman: 2.0, build: 2.5, gap: 2.94, drop: 3.0, tee: 5.0, land: 5.5, stamp: 6.0, fin: 6.5 };
const P = { blk: '#080808', ink: '#111111', wht: '#F2F1EE', or: '#FE572A', orD: '#D9431C', yel: '#F5C400', st1: '#EFEDE9', st2: '#D6D2CB', gray: '#8E8E8E' };

// ---------------------------------------------------------------- utils
const hx = h => { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
const col = (h, a = 1) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inQuad: x => x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const spring = (t, t0, f = 3.0, z = 0.3) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * TAU * f * a) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * a); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const X = px => (px - CX) / 100, Y = py => (CY - py) / 100;   // pixel → world at z = 0
const ANTON = s => `400 ${s}px "Anton"`;
const IT = (w, s) => `${w} ${s}px "Inter Tight"`;
const MONO = (w, s) => `${w} ${s}px "JB Mono"`;
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*/';
function scramble(txt, k, seed) {   // k: 0..1 revealed share, rest is shuffling glyphs
  const n = Math.floor(k * txt.length + 1e-6);
  let s = '';
  for (let i = 0; i < txt.length; i++) {
    if (i < n || txt[i] === ' ') s += txt[i];
    else if (i < n + 5) s += GLYPHS[Math.floor(hash(seed + i * 7.3) * GLYPHS.length)];
  }
  return s;
}

const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

// ---------------------------------------------------------------- canvases
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const tmp = mk(W, H), tctx = tmp.getContext('2d');
const grains = [];
const IMG = {};   // logo bitmaps

// ---------------------------------------------------------------- three.js
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.1;
R3.outputColorSpace = THREE.SRGBColorSpace;
R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 300);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight('#ffffff', '#ffd9c8', 1.1); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffffff', 2.8);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -12, right: 12, top: 14, bottom: -14, near: 1, far: 70 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight('#ffe2d2', 1.4); rim.position.set(9, 5, -6); scene.add(rim);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), new THREE.ShadowMaterial({ opacity: 0.2 }));
wall.receiveShadow = true; scene.add(wall);

const phys = (c, r = 0.3, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 }, o));
const std = (c, r = 0.5, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o));
const REG = [];
function reg(o) { REG.push(o); o.visible = false; scene.add(o); return o; }
const on = o => { o.visible = true; return o; };

// ---------------------------------------------------------------- the Kazakh ram-horn ornament (qoshqar müiz)
function horn(c, s) {   // a pair of curls growing up from (0,0)
  c.beginPath();
  c.moveTo(0, 0.05 * s); c.lineTo(0, -0.3 * s);
  for (const sd of [-1, 1]) {
    const ccx = sd * 0.36 * s, ccy = -0.5 * s, r0 = 0.3 * s;
    c.moveTo(0, -0.3 * s);
    c.quadraticCurveTo(0, -0.46 * s, ccx - sd * r0, ccy);
    for (let k = 0; k <= 48; k++) {
      const u = k / 48, r = r0 * (1 - 0.78 * u), a = (sd > 0 ? Math.PI : 0) + sd * u * 1.75 * Math.PI;
      c.lineTo(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r);
    }
  }
  c.stroke();
}
function rosette(c, x, y, s, rot, color, lw) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.translate(0, -0.12 * s); horn(c, s * 0.62); c.restore(); }
  c.beginPath(); c.moveTo(0, -0.1 * s); c.lineTo(0.1 * s, 0); c.lineTo(0, 0.1 * s); c.lineTo(-0.1 * s, 0); c.closePath(); c.fillStyle = color; c.fill();
  c.restore();
}

// ---------------------------------------------------------------- 3D: extruded wordmark
let LOGO = null, LOGO_W = 8.6, LOGO_H = LOGO_W * 240 / 1360;
const MAT_LOGO_DROP = [phys('#0b0b0b', 0.22, { clearcoat: 1 }), std('#1c1c1c', 0.35, { metalness: 0.2 })];
const MAT_LOGO_FIN = [phys('#f4f3f0', 0.3, { emissive: '#ffffff', emissiveIntensity: 0.08 }), std(P.or, 0.4)];
function buildLogo(svgText) {
  const data = new SVGLoader().parse(svgText);
  const shapes = [];
  for (const p of data.paths) shapes.push(...SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 80, bevelEnabled: true, bevelThickness: 7, bevelSize: 4.5, bevelSegments: 4, curveSegments: 12 });
  geo.center();
  const s = LOGO_W / 1360; geo.scale(s, -s, -s);
  LOGO = new THREE.Group();
  const m = new THREE.Mesh(geo, MAT_LOGO_DROP); m.castShadow = true; LOGO.add(m); LOGO.userData.mesh = m;
  reg(LOGO);
}

// ---------------------------------------------------------------- 3D: vinyl stickers
function stickerMesh(cv, wu, hu) {
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wu, hu), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, alphaTest: 0.5, toneMapped: false }));
  m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  return reg(m);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
const STK = [];
function buildStickers() {
  // 1 — ANOTHER VISION (black bar)
  { const cv = mk(1000, 260), c = cv.getContext('2d');
    rr(c, 4, 4, 992, 252, 44); c.fillStyle = '#fff'; c.fill();
    rr(c, 20, 20, 960, 220, 30); c.fillStyle = '#0c0c0c'; c.fill();
    c.fillStyle = P.or; c.fillRect(74, 108, 44, 44);
    c.fillStyle = '#fff'; c.font = IT(900, 80); c.letterSpacing = '4px'; c.textBaseline = 'middle'; c.fillText('ANOTHER VISION', 148, 134);
    STK.push({ m: stickerMesh(cv, 6.4, 1.664), x: 540, y: 600, rz: -0.1, t: 3.5 }); }
  // 2 — round ornament badge
  { const cv = mk(560, 560), c = cv.getContext('2d');
    c.beginPath(); c.arc(280, 280, 276, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(280, 280, 258, 0, TAU); c.fillStyle = '#0c0c0c'; c.fill();
    c.beginPath(); c.arc(280, 280, 150, 0, TAU); c.fillStyle = P.or; c.fill();
    rosette(c, 280, 280, 210, 0, '#0c0c0c', 15);
    c.font = MONO(700, 34); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'center';
    const txt = 'BASQA · ALMATY · KAZAKHSTAN · '; const n = txt.length;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU; c.save(); c.translate(280 + Math.cos(a) * 205, 280 + Math.sin(a) * 205); c.rotate(a + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
    STK.push({ m: stickerMesh(cv, 3.7, 3.7), x: 250, y: 1330, rz: 0.24, t: 4.0 }); }
  // 3 — yellow drop label
  { const cv = mk(900, 380), c = cv.getContext('2d');
    rr(c, 4, 4, 892, 372, 34); c.fillStyle = '#fff'; c.fill();
    rr(c, 20, 20, 860, 340, 20); c.fillStyle = P.yel; c.fill();
    c.fillStyle = '#0c0c0c'; c.textBaseline = 'alphabetic';
    c.font = IT(900, 46); c.letterSpacing = '2px'; c.fillText('BASQA®', 56, 88);
    c.font = MONO(700, 30); c.letterSpacing = '0px'; c.fillText('N°001', 520, 86);
    c.font = ANTON(150); c.letterSpacing = '2px'; c.fillText('LIMITED', 50, 262);
    c.font = MONO(700, 30); c.letterSpacing = '1px'; c.fillText('DROP · MADE IN KZ · 2026', 56, 322);
    const r = rng(7); let x = 690; while (x < 850) { const w = 3 + Math.floor(r() * 9); c.fillRect(x, 120, w, 150); x += w + 3 + Math.floor(r() * 7); }
    STK.push({ m: stickerMesh(cv, 5.4, 2.28), x: 700, y: 1520, rz: 0.08, t: 4.5 }); }
}

// ---------------------------------------------------------------- 3D: tee on a hanger
const TEE = {};
function teeOutline(c) {   // 280×320 px template, 50 px = 1 unit
  c.beginPath();
  c.moveTo(106, 14); c.quadraticCurveTo(118, 36, 140, 36); c.quadraticCurveTo(162, 36, 174, 14);
  c.lineTo(228, 30); c.quadraticCurveTo(252, 62, 274, 112); c.lineTo(238, 134); c.quadraticCurveTo(230, 120, 224, 106);
  c.quadraticCurveTo(222, 210, 228, 306); c.quadraticCurveTo(140, 312, 52, 306);
  c.quadraticCurveTo(58, 210, 56, 106); c.quadraticCurveTo(50, 120, 42, 134); c.lineTo(6, 112); c.quadraticCurveTo(28, 62, 52, 30);
  c.closePath();
}
function buildTee() {
  const PW = 280, PH = 320, U = 50;
  const mc = mk(PW, PH), m = mc.getContext('2d'); teeOutline(m); m.fillStyle = '#fff'; m.fill();
  const a = m.getImageData(0, 0, PW, PH).data;
  const D = new Float32Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) D[i] = a[i * 4 + 3] > 127 ? 1e9 : 0;
  const d2 = Math.SQRT2;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; if (!D[i]) continue; let v = D[i];
    if (x > 0) v = Math.min(v, D[i - 1] + 1); if (y > 0) v = Math.min(v, D[i - PW] + 1); if (x > 0 && y > 0) v = Math.min(v, D[i - PW - 1] + d2); if (x < PW - 1 && y > 0) v = Math.min(v, D[i - PW + 1] + d2); D[i] = v; }
  for (let y = PH - 1; y >= 0; y--) for (let x = PW - 1; x >= 0; x--) { const i = y * PW + x; if (!D[i]) continue; let v = D[i];
    if (x < PW - 1) v = Math.min(v, D[i + 1] + 1); if (y < PH - 1) v = Math.min(v, D[i + PW] + 1); if (x < PW - 1 && y < PH - 1) v = Math.min(v, D[i + PW + 1] + d2); if (x > 0 && y < PH - 1) v = Math.min(v, D[i + PW - 1] + d2); D[i] = v; }
  const samp = (px, py) => { const x = clamp(Math.round(px), 0, PW - 1), y = clamp(Math.round(py), 0, PH - 1); return D[y * PW + x] / U; };
  const geo = new THREE.PlaneGeometry(5.6, 6.4, 168, 192);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const px = (x + 2.8) * U, py = (3.2 - y) * U;
    // smooth the distance a little (average of 5 taps)
    const d = (samp(px, py) * 2 + samp(px + 2, py) + samp(px - 2, py) + samp(px, py + 2) + samp(px, py - 2)) / 6;
    if (d <= 0) { pos.setZ(i, 0); continue; }
    const puff = 0.42 * (1 - Math.exp(-d / 0.5));
    const fade = clamp(d / 0.4);
    const drape = 0.06 * Math.sin(5.2 * (x * 0.55 - (y - 2.2) * 0.8)) * clamp((y - 0.4) / 2) * clamp(1 - Math.abs(x) / 2.2);
    const drape2 = 0.06 * Math.sin(5.2 * (-x * 0.55 - (y - 2.2) * 0.8)) * clamp((y - 0.4) / 2) * clamp(1 - Math.abs(x) / 2.2);
    const hem = 0.05 * Math.sin(4.6 * x + 0.8) * clamp((-y - 0.6) / 2.4);
    const sag = 0.05 * Math.sin(2.6 * y + 1.1) * Math.cos(1.4 * x);
    pos.setZ(i, puff + fade * (drape + drape2 + hem + sag));
  }
  geo.computeVertexNormals();
  // fabric + print texture (4×)
  const S = 4, tc = mk(PW * S, PH * S), c = tc.getContext('2d');
  c.scale(S, S); teeOutline(c); c.fillStyle = '#151515'; c.fill();
  c.save(); teeOutline(c); c.clip();
  const r = rng(3);
  for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)'; c.fillRect(r() * PW, r() * PH, 0.25 + r() * 0.6, 0.25 + r() * 0.6); }
  c.strokeStyle = '#262626'; c.lineWidth = 2.2;   // collar rib + hems
  c.beginPath(); c.moveTo(108, 16); c.quadraticCurveTo(119, 39, 140, 39); c.quadraticCurveTo(161, 39, 172, 16); c.stroke();
  c.lineWidth = 0.8; c.strokeStyle = '#2b2b2b';
  c.beginPath(); c.moveTo(56, 300); c.quadraticCurveTo(140, 306, 224, 300); c.stroke();
  c.beginPath(); c.moveTo(10, 106); c.lineTo(44, 127); c.moveTo(270, 106); c.lineTo(236, 127); c.stroke();
  c.restore();
  // print: wordmark + small type
  const pw = 150, ph = pw * 240 / 1360;
  c.drawImage(IMG.logoW, 140 - pw / 2, 92 - ph / 2, pw, ph);
  c.fillStyle = '#ECECEC'; c.font = MONO(700, 6.4); c.textAlign = 'center'; c.letterSpacing = '1.2px';
  c.fillText('ANOTHER VISION', 140, 118);
  c.fillStyle = P.or; c.fillText('ALMATY — 2026', 140, 127);
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#6a6a6a'), sheenRoughness: 0.55, alphaTest: 0.5, side: THREE.DoubleSide });
  const tee = new THREE.Mesh(geo, mat); tee.castShadow = true;
  tee.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  // hanger (chrome wire) — local frame: pivot (rail) at (0, 3.9)
  const chrome = std('#d8d8d8', 0.18, { metalness: 1 });
  const arms = new THREE.CatmullRomCurve3([[-2.3, 2.56], [-1.2, 2.86], [0, 3.1], [1.2, 2.86], [2.3, 2.56]].map(p => new THREE.Vector3(p[0], p[1], -0.06)));
  const hookPts = [new THREE.Vector3(0, 3.1, -0.04), new THREE.Vector3(0, 3.42, -0.02)];
  for (let k = 0; k <= 16; k++) { const ang = (200 - k / 16 * 230) * Math.PI / 180; hookPts.push(new THREE.Vector3(Math.cos(ang) * 0.2, 3.9 + Math.sin(ang) * 0.2, 0)); }
  const hook = new THREE.CatmullRomCurve3(hookPts);
  const hg = new THREE.Group();
  hg.add(new THREE.Mesh(new THREE.TubeGeometry(arms, 60, 0.05, 10), chrome));
  hg.add(new THREE.Mesh(new THREE.TubeGeometry(hook, 60, 0.05, 10), chrome));
  hg.children.forEach(o => { o.castShadow = true; });
  const inner = new THREE.Group(); inner.add(tee); inner.add(hg); inner.position.y = -3.9;
  TEE.g = reg(new THREE.Group()); TEE.g.add(inner);
  TEE.rail = reg(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 18, 24), chrome));
  TEE.rail.rotation.z = Math.PI / 2; TEE.rail.castShadow = true;
}

// ---------------------------------------------------------------- shared 2D bits
function hud(t, color, k = 1) {   // editorial corner marks + coordinates
  if (k <= 0) return;
  const c = ctx; c.save(); c.globalAlpha = k;
  c.strokeStyle = col(color, 0.7); c.lineWidth = 3;
  const m = 44, L = 42;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke(); }
  const ty = prog(t, 0.08, 0.6), sd = Math.floor(t * 30);
  c.fillStyle = col(color, 0.92); c.textBaseline = 'alphabetic';
  c.font = IT(900, 36); c.letterSpacing = '1px'; c.textAlign = 'left'; c.fillText(scramble('BASQA®', ty * 1.4, sd), 78, 128);
  c.font = MONO(500, 22); c.letterSpacing = '2px';
  c.fillStyle = col(color, 0.62);
  c.fillText(scramble('ANOTHER VISION', ty, sd + 3), 78, 162);
  c.fillText(scramble('ALMATY · KZ', ty, sd + 5), 78, H - 92);
  c.textAlign = 'right';
  c.fillText(scramble('43.2389° N', ty, sd + 7), W - 78, 124);
  c.fillText(scramble('76.8897° E', ty, sd + 9), W - 78, 156);
  c.fillText(scramble('DROP — 2026', ty, sd + 11), W - 78, H - 92);
  c.restore();
}
function fitFont(txt, maxW, size, font) { ctx.font = font(size); ctx.letterSpacing = '0px'; const w = ctx.measureText(txt).width; return w > maxW ? size * maxW / w : size; }
// kinetic word: letters slam in on the beat (scale + vertical smear), centred
function slamWord(t, t0, txt, baseY, size, color, o = {}) {
  const c = ctx; c.save();
  c.font = ANTON(size); c.letterSpacing = '0px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const ws = [...txt].map(ch => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0);
  let x = CX - tw / 2;
  const capH = size * 0.74;
  for (let i = 0; i < txt.length; i++) {
    const ti = t0 + i * (o.stag ?? 0.028);
    const k = prog(t, ti, ti + 0.11);
    if (t >= ti) {
      const e = E.outExpo(k);
      const s = lerp(1.55, 1, e) + 0.05 * Math.sin(prog(t, ti, ti + 0.4) * Math.PI) * (1 - k);
      const sy = s * lerp(1.45, 1, e);
      const cx = x + ws[i] / 2, cy = baseY - capH / 2;
      // trailing smear
      if (k < 1) for (let j = 1; j <= 4; j++) { c.save(); c.globalAlpha = 0.18 * (1 - k); c.translate(cx, cy - j * 26 * (1 - e)); c.scale(s, sy); c.fillStyle = color; c.fillText(txt[i], -ws[i] / 2, capH / 2); c.restore(); }
      c.save(); c.globalAlpha = clamp(k * 4); c.translate(cx, cy + (o.drift || 0) * (t - t0)); c.scale(s, sy);
      c.fillStyle = color; c.fillText(txt[i], -ws[i] / 2, capH / 2); c.restore();
    }
    x += ws[i];
  }
  c.restore();
}
function label(t, t0, txt, y, color, sub, subColor) {
  const c = ctx; c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = MONO(700, 28); c.letterSpacing = '8px'; c.fillStyle = color;
  c.fillText(scramble(txt, prog(t, t0 + 0.02, t0 + 0.2), Math.floor(t * 40)), CX, y);
  if (sub) {
    const k = E.outCubic(prog(t, t0 + 0.12, t0 + 0.3));
    c.globalAlpha = k; c.font = IT(500, 46); c.letterSpacing = '1px'; c.fillStyle = subColor;
    c.fillText(sub, CX, y + 490 + 18 * (1 - k));
  }
  c.restore();
}

// ---------------------------------------------------------------- shots
// 0.00–1.00  dombra strings: two strings, plucked on the riff, then bent and snapped
const PLUCKS = [   // [t, string ids, midi notes]  (dombra tuned D3 / G3; melody on the upper string)
  [0.25, [0, 1], [50, 57]], [0.375, [0], [57]], [0.5, [0, 1], [50, 60]], [0.625, [0], [57]],
  [0.75, [0, 1], [50, 55]], [0.8125, [0], [53]], [0.875, [0, 1], [52, 57]],
];
const SNAP = 0.975;
function shotStrings(t) {
  const c = ctx;
  c.fillStyle = P.blk; c.fillRect(0, 0, W, H);
  // soft pool of light
  const g = c.createRadialGradient(CX, 980, 40, CX, 980, 900); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const draw = E.outExpo(prog(t, 0.02, 0.3));
  const bend = E.inCubic(prog(t, 0.875, SNAP));
  const ys = [905, 1015];
  if (t < SNAP) {
    for (let s = 0; s < 2; s++) {
      const half = 560 * draw;
      for (let sub = 0; sub < 6; sub++) {
        const ts = t - sub / 360;
        c.beginPath();
        for (let x = CX - half; x <= CX + half + 1; x += 6) {
          const xn = x / W;
          let off = 0;
          for (const [tp, ids] of PLUCKS) if (ids.includes(s) && ts >= tp) { const d = ts - tp; off += 34 * Math.exp(-d * 7.5) * Math.sin(Math.PI * xn) * Math.sin(TAU * (19 + s * 5) * d); }
          off += (s === 0 ? 1 : -1) * 55 * bend * Math.pow(Math.max(0, 1 - Math.abs(x - CX) / 560), 1.2);
          const y = ys[s] + off;
          if (x === CX - half) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = col(sub === 0 ? '#ffffff' : '#ffffff', sub === 0 ? 0.95 : 0.16); c.lineWidth = sub === 0 ? 3 : 2; c.stroke();
      }
      // pluck spark
      for (const [tp, ids] of PLUCKS) if (ids.includes(s) && t >= tp && t < tp + 0.18) {
        const k = prog(t, tp, tp + 0.18); c.fillStyle = col(P.or, 1 - k);
        c.beginPath(); c.arc(760, ys[s], 8 + 26 * E.outExpo(k), 0, TAU); c.fill();
      }
    }
    // nut + bridge dots
    c.fillStyle = col('#ffffff', 0.5 * draw);
    for (const y of ys) { c.beginPath(); c.arc(CX - 540 * draw, y, 5, 0, TAU); c.arc(CX + 540 * draw, y, 5, 0, TAU); c.fill(); }
  } else {
    // snap: string ends whip away, orange burst in the middle
    const k = prog(t, SNAP, 1.0);
    c.fillStyle = col(P.or, 1 - k); c.beginPath(); c.arc(CX, 960, 30 + 500 * E.outExpo(k), 0, TAU); c.fill();
  }
  // definition line
  const kt = prog(t, 0.42, 0.74);
  if (kt > 0 && t < SNAP) {
    c.save(); c.textAlign = 'center'; c.font = IT(500, 42); c.letterSpacing = '1px';
    const full = 'basqa (каз.) — другой, иной';
    const n = Math.floor(kt * full.length);
    const str = full.slice(0, n);
    c.fillStyle = col('#ffffff', 0.85); c.fillText(str, CX, 1220);
    const w = c.measureText(full).width;
    if (Math.floor(t * 8) % 2 === 0 || kt < 1) { c.fillStyle = P.or; c.fillRect(CX - w / 2 + c.measureText(str).width + 4, 1186, 4, 42); }
    c.font = MONO(700, 26); c.letterSpacing = '8px'; c.fillStyle = col(P.or, clamp(kt * 3)); c.fillText('[ BAS·QA ]', CX, 760);
    c.restore();
  }
  hud(t, '#ffffff', 1);
  return null;
}

// 1.00–1.50  QALA — Almaty skyline drawn in white line
const PEAKS = [[-20, 1335], [60, 1250], [140, 1215], [210, 1120], [300, 1185], [380, 1095], [455, 1150], [520, 1010], [600, 1110], [670, 1060], [760, 1160], [850, 1080], [930, 1170], [1010, 1120], [1100, 1220]].map(([x, y]) => [x, y + 120]);
const BLOCKS = [[18, 230, 200], [268, 150, 260], [438, 250, 170], [708, 170, 230], [898, 168, 190]];
function shotQala(t) {
  const c = ctx, t0 = T.qala;
  c.fillStyle = P.blk; c.fillRect(0, 0, W, H);
  const rev = E.outCubic(prog(t, t0, t0 + 0.32));
  const base = 1335, ground = 1640;
  // sun rising behind the ridge
  const sy = lerp(1450, 1290, E.outCubic(prog(t, t0, t0 + 0.5)));
  c.fillStyle = P.or; c.beginPath(); c.arc(330, sy, 92, 0, TAU); c.fill();
  // mountains (filled black to hide the sun) + line
  c.beginPath(); c.moveTo(-20, H); for (const [x, y] of PEAKS) c.lineTo(x, y); c.lineTo(1100, H); c.closePath(); c.fillStyle = P.blk; c.fill();
  c.save(); c.beginPath(); c.rect(0, 0, W * rev, H); c.clip();
  c.strokeStyle = col('#ffffff', 0.9); c.lineWidth = 3; c.lineJoin = 'round';
  c.beginPath(); PEAKS.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  // snow caps
  c.lineWidth = 2; c.strokeStyle = col('#ffffff', 0.55);
  for (let i = 1; i < PEAKS.length - 1; i++) { const [x, y] = PEAKS[i]; if (y > 1250) continue; const [xl, yl] = PEAKS[i - 1], [xr, yr] = PEAKS[i + 1]; const a = 0.35;
    c.beginPath(); c.moveTo(lerp(x, xl, a), lerp(y, yl, a)); c.lineTo(lerp(x, xl, a * 0.5) + 6, lerp(y, yl, a * 0.5) + 22); c.lineTo(x, y + 30); c.lineTo(lerp(x, xr, a * 0.5) - 6, lerp(y, yr, a * 0.5) + 20); c.lineTo(lerp(x, xr, a), lerp(y, yr, a)); c.stroke(); }
  // Kok-Tobe tower on its hill
  c.strokeStyle = col('#ffffff', 0.9); c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(860, 1455); c.lineTo(884, 1180); c.lineTo(908, 1455); c.moveTo(884, 1180); c.lineTo(884, 1110); c.stroke();
  for (let k = 0; k < 9; k++) { const yy = 1455 - k * 31, wv = 24 * (1 - k / 9); c.beginPath(); c.moveTo(884 - wv, yy); c.lineTo(884 + wv * 0.9, yy - 31); c.stroke(); }
  c.fillStyle = P.or; c.beginPath(); c.arc(884, 1110, 5 + 2 * Math.sin(t * 30), 0, TAU); c.fill();
  // panel blocks (khrushchyovkas) with windows
  for (const [bx, bw, bh] of BLOCKS) {
    const by = ground - bh;
    c.fillStyle = P.blk; c.fillRect(bx, by, bw, bh);
    c.strokeStyle = col('#ffffff', 0.9); c.lineWidth = 2.5; c.strokeRect(bx, by, bw, bh);
    for (let wy = by + 18; wy < ground - 24; wy += 30) for (let wx = bx + 14; wx < bx + bw - 18; wx += 24) {
      const lit = hash(wx * 3.1 + wy * 7.7) > 0.86 && hash(wx + wy + Math.floor(t * 12)) > 0.15;
      if (lit) { c.fillStyle = col(P.or, 0.95); c.fillRect(wx, wy, 12, 15); } else { c.strokeStyle = col('#ffffff', 0.32); c.lineWidth = 1.2; c.strokeRect(wx, wy, 12, 15); }
    }
  }
  c.strokeStyle = col('#ffffff', 0.9); c.lineWidth = 3; c.beginPath(); c.moveTo(0, ground); c.lineTo(W, ground); c.stroke();
  c.restore();
  // type
  const size = fitFont('QALA', 860, 400, ANTON);
  slamWord(t, t0, 'QALA', 900, size, '#ffffff', { drift: -14 });
  label(t, t0, 'BASQA QALA', 520, P.or, 'другой город', col('#ffffff', 0.8));
  hud(t, '#ffffff', 1);
  return null;
}

// 1.50–2.00  ALEM — wireframe globe, Almaty pinned
function shotAlem(t) {
  const c = ctx, t0 = T.alem;
  c.fillStyle = P.wht; c.fillRect(0, 0, W, H);
  const gx = CX, gy = 1450, R = 350 * (0.7 + 0.3 * E.outBack(prog(t, t0, t0 + 0.24)));
  const ry = -76.9 * Math.PI / 180 + (1.88 - t) * 1.9, rx = 0.42;
  const proj = (lat, lon) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    let x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
    const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry);
    const y2 = y * Math.cos(rx) - z1 * Math.sin(rx), z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
    const pz = 1 / (1 - z2 * 0.12);
    return [gx + x1 * R * pz, gy - y2 * R * pz, z2];
  };
  const seg = (pts) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const z = (a[2] + b[2]) / 2;
    c.strokeStyle = col(P.ink, z > 0 ? 0.8 : 0.13); c.lineWidth = z > 0 ? 2.4 : 1.4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } };
  for (let lat = -75; lat <= 75; lat += 15) { const pts = []; for (let lo = 0; lo <= 360; lo += 6) pts.push(proj(lat, lo)); seg(pts); }
  for (let lo = 0; lo < 360; lo += 15) { const pts = []; for (let la = -90; la <= 90; la += 6) pts.push(proj(la, lo)); seg(pts); }
  c.strokeStyle = col(P.ink, 0.9); c.lineWidth = 3; c.beginPath(); c.arc(gx, gy, R * 1.0, 0, TAU); c.stroke();
  // Almaty pin
  const [ax, ay, az] = proj(43.24, 76.89);
  if (az > 0) {
    const pk = ((t - t0) * 2.4) % 1;
    c.strokeStyle = col(P.or, 1 - pk); c.lineWidth = 4; c.beginPath(); c.arc(ax, ay, 10 + 60 * pk, 0, TAU); c.stroke();
    c.fillStyle = P.or; c.beginPath(); c.arc(ax, ay, 12, 0, TAU); c.fill();
    c.font = MONO(700, 26); c.letterSpacing = '4px'; c.fillStyle = P.or; c.textAlign = 'left'; c.fillText('ALMATY', ax + 26, ay - 18);
  }
  const size = fitFont('ALEM', 860, 400, ANTON);
  slamWord(t, t0, 'ALEM', 900, size, P.ink, { drift: -14 });
  label(t, t0, 'BASQA ALEM', 520, P.or, 'другой мир', col(P.ink, 0.75));
  hud(t, P.ink, 1);
  return null;
}

// 2.00–2.50  ZAMAN — the reel's own timecode, a sweeping dial
function shotZaman(t) {
  const c = ctx, t0 = T.zaman;
  c.fillStyle = P.blk; c.fillRect(0, 0, W, H);
  const dx = CX, dy = 1360, R = 280;
  const sweep = (t - t0) * 2.0;   // turns
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + i / 60 * TAU;
    const ph = ((i / 60 - sweep) % 1 + 1) % 1;
    const lit = Math.max(0, 1 - ph * 5);
    const L = i % 5 === 0 ? 42 : 20;
    c.strokeStyle = lit > 0 ? col(P.or, 0.3 + 0.7 * lit) : col('#ffffff', 0.35); c.lineWidth = i % 5 === 0 ? 5 : 3;
    c.beginPath(); c.moveTo(dx + Math.cos(a) * R, dy + Math.sin(a) * R); c.lineTo(dx + Math.cos(a) * (R - L), dy + Math.sin(a) * (R - L)); c.stroke();
  }
  const ha = -Math.PI / 2 + sweep * TAU;
  c.strokeStyle = P.or; c.lineWidth = 4; c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx + Math.cos(ha) * (R - 60), dy + Math.sin(ha) * (R - 60)); c.stroke();
  c.fillStyle = P.or; c.beginPath(); c.arc(dx, dy, 9, 0, TAU); c.fill();
  // timecode
  const f = Math.floor(t * FPS), ss = Math.floor(f / FPS), ff = f % FPS;
  const tc = `00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  c.save(); c.font = MONO(700, 56); c.letterSpacing = '4px'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.fillText(tc, CX, 1730); c.restore();
  const size = fitFont('ZAMAN', 920, 380, ANTON);
  slamWord(t, t0, 'ZAMAN', 900, size, P.or, { drift: -14, stag: 0.024 });
  label(t, t0, 'BASQA ZAMAN', 520, '#ffffff', 'другое время', col('#ffffff', 0.8));
  hud(t, '#ffffff', 1);
  return null;
}

// 2.50–3.00  build: the wordmark stutters on 16ths, then a black gap before the drop
const STUT = [[2.5, P.wht, 'logoB', 980], [2.625, P.blk, 'logoW', 700], [2.75, P.or, 'logoB', 1320], [2.875, P.blk, 'logoW', 520]];
function shotBuild(t) {
  const c = ctx;
  if (t >= T.gap) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); return null; }
  let k = 0; for (let i = 0; i < STUT.length; i++) if (t >= STUT[i][0]) k = i;
  const [ts, bg, im, w0] = STUT[k];
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const w = w0 * (1 + 0.22 * E.outCubic(prog(t, ts, ts + 0.125)));
  const h = w * 240 / 1360;
  if (k === 1 || k === 3) {   // RGB split on the dark frames
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.7; c.drawImage(IMG.logoR, CX - w / 2 - 10, CY - h / 2, w, h); c.drawImage(IMG.logoC, CX - w / 2 + 10, CY - h / 2, w, h);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  c.drawImage(IMG[im], CX - w / 2, CY - h / 2, w, h);
  c.font = ANTON(64); c.letterSpacing = '6px'; c.textAlign = 'center';
  c.fillStyle = bg === P.blk ? P.or : P.ink;
  c.fillText(['3', '2', '1', 'GO'][k], CX, CY + h / 2 + 120);
  return null;
}

// 3.00–5.00  DROP — orange field, 3D wordmark slams, stickers slap on the beats
function marquee(t, color) {
  const c = ctx; c.save();
  c.font = ANTON(210); c.letterSpacing = '6px'; c.strokeStyle = color; c.lineWidth = 3; c.textBaseline = 'middle';
  const unit = 'BASQA ANOTHER VISION ';
  const uw = c.measureText(unit).width;
  for (let r = 0; r < 9; r++) {
    const y = 120 + r * 225, dir = r % 2 ? 1 : -1;
    let x = ((dir * (t - T.drop) * 320 + r * 377) % uw + uw) % uw - uw;
    for (; x < W; x += uw) c.strokeText(unit, x, y);
  }
  c.restore();
}
function shotDrop(t) {
  const c = ctx, t0 = T.drop;
  c.fillStyle = P.or; c.fillRect(0, 0, W, H);
  marquee(t, 'rgba(0,0,0,0.13)');
  rosette(c, CX, CY, 980 * (0.85 + 0.15 * E.outExpo(prog(t, t0, t0 + 0.4))), (t - t0) * 0.35, 'rgba(0,0,0,0.12)', 34);
  // shock ring
  if (t < t0 + 0.45) { const k = prog(t, t0, t0 + 0.45); c.strokeStyle = col('#000000', 0.85 * (1 - k)); c.lineWidth = 46 * (1 - k) + 2; c.beginPath(); c.arc(CX, CY, 80 + 1300 * E.outExpo(k), 0, TAU); c.stroke(); }
  // 3D wordmark
  const L = on(LOGO); L.userData.mesh.material = MAT_LOGO_DROP;
  const kin = prog(t, t0, t0 + 0.11);
  const pulse = [3.5, 4.0, 4.5].reduce((s, b) => s + (t >= b ? 0.06 * Math.exp(-(t - b) * 14) : 0), 0);
  L.position.set(0, 0, 9 * (1 - E.outExpo(kin)));
  L.rotation.x = -0.9 * (1 - spring(t, t0, 2.4, 0.32)) + 0.1 * Math.sin((t - t0) * TAU * 0.35);
  L.rotation.y = 0.34 * Math.sin((t - t0) * TAU * 0.42);
  L.rotation.z = -0.05 * Math.sin((t - t0) * TAU * 0.3);
  L.scale.setScalar(1 + pulse);
  // stickers
  for (const s of STK) {
    if (t < s.t) continue;
    const k = prog(t, s.t, s.t + 0.13), sp = spring(t, s.t, 4.5, 0.38);
    const m = on(s.m);
    m.position.set(X(s.x), Y(s.y), lerp(5, -0.28, E.outExpo(k)));
    m.rotation.set(0.5 * (1 - sp), -0.4 * (1 - sp), s.rz + 0.5 * (1 - sp));
    m.scale.setScalar(1 + 0.12 * (1 - sp));
  }
  wall.position.z = -0.62; wall.material.opacity = 0.26;
  key.position.set(-5 + 3 * Math.sin((t - t0) * 1.4), 8, 16);
  // light streak across the face of the logo
  return () => {
    hud(t, '#000000', 1);
  };
}

// 5.00–6.50  TEE — studio; DROP letters fall, the tee drops onto the rail and swings
function shotTee(t) {
  const c = ctx, t0 = T.tee;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.st1); g.addColorStop(0.72, '#E4E1DC'); g.addColorStop(1, P.st2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(CX, 760, 60, CX, 760, 900); rg.addColorStop(0, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
  // DROP letters drop in (literally)
  c.save(); c.font = ANTON(430); c.letterSpacing = '0px'; c.textBaseline = 'alphabetic';
  const word = 'DROP', ws = [...word].map(ch => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0) + 12 * 3;
  let x = CX - tw / 2;
  for (let i = 0; i < 4; i++) {
    const ti = t0 + 0.02 + i * 0.0625, k = prog(t, ti, ti + 0.12);
    if (t >= ti) {
      const fall = E.inQuad(k), land = t > ti + 0.12 ? spring(t, ti + 0.12, 3.2, 0.25) : 0;
      const y = 1700 - (1 - fall) * 1500;
      const sq = t > ti + 0.12 ? 1 - 0.18 * (1 - land) : 1 + 0.25 * fall;
      c.save(); c.translate(x + ws[i] / 2, y); c.scale(1 / Math.sqrt(sq), sq); c.fillStyle = P.ink; c.fillText(word[i], -ws[i] / 2, 0); c.restore();
    }
    x += ws[i] + 12;
  }
  c.restore();
  c.save(); c.font = MONO(700, 28); c.letterSpacing = '8px'; c.fillStyle = P.or; c.textAlign = 'left';
  c.fillText(scramble('( NEW )', prog(t, t0 + 0.25, t0 + 0.45), Math.floor(t * 40)), 90, 1262); c.restore();
  // tee: falls onto the rail, lands on the beat, swings
  const railY = Y(430);
  on(TEE.rail).position.set(0, railY, 0);
  const G = on(TEE.g);
  const tf = 5.3, tl = T.land;
  let dy = 0, rz = 0, ry = 0.12;
  if (t < tl) { const k = prog(t, tf, tl); dy = 14 * (1 - E.inQuad(k)); rz = 0.12 * (1 - k); ry = 0.5 * (1 - k); }
  else { const d = t - tl; dy = -0.18 * Math.exp(-d * 9) * Math.sin(d * 40); rz = 0.2 * Math.exp(-d * 2.4) * Math.sin(TAU * 1.05 * d + 0.4); ry = 0.12 + 0.42 * Math.exp(-d * 1.2) * Math.sin(TAU * 0.5 * d + 1.2); }
  // zoom-through into the chest print
  const zk = E.inExpo(prog(t, 6.22, T.fin));
  const zs = 1 + 5.2 * zk;
  rz *= 1 - zk; ry *= 1 - zk;
  G.rotation.set(0, ry, rz);
  // keep the print centred while zooming: print sits at local (0, -3.9 + 1.3) under the pivot
  const printY = -3.9 + (3.2 - 92 / 50);
  G.position.set(0, lerp(railY + dy, -printY * zs, zk), 0);
  G.scale.setScalar(zs);
  wall.position.z = -1.6; wall.material.opacity = 0.2 * (1 - zk);
  key.position.set(-6, 10, 15);
  // floor shadow
  const sk = t >= tf ? clamp(1 - dy / 14) : 0;
  c.save(); c.globalAlpha = 0.18 * sk * (1 - zk); c.fillStyle = '#000'; c.filter = 'blur(18px)'; c.beginPath(); c.ellipse(CX + rz * 300, 1760, 330, 34, 0, 0, TAU); c.fill(); c.restore();
  return () => {
    // stamp
    if (t >= T.stamp) {
      const k = prog(t, T.stamp, T.stamp + 0.09), s = lerp(1.8, 1, E.outExpo(k));
      c.save(); c.translate(850, 1262); c.rotate(-0.24); c.scale(s * 0.85, s * 0.85); c.globalAlpha = clamp(k * 3) * (1 - zk);
      c.strokeStyle = P.or; c.lineWidth = 7; rr(c, -170, -78, 340, 156, 14); c.stroke();
      c.fillStyle = P.or; c.font = ANTON(92); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.letterSpacing = '3px'; c.fillText('LIMITED', 0, 26);
      c.font = MONO(700, 20); c.letterSpacing = '5px'; c.fillText('EDITION · 2026', 0, 58);
      // ink gaps
      c.globalCompositeOperation = 'destination-out';
      const r = rng(11); for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(-170 + r() * 340, -78 + r() * 156, 1 + r() * 3.5, 0, TAU); c.fill(); }
      c.restore();
    }
    hud(t, P.ink, 1 - zk);
  };
}

// 6.50–8.00  FINALE — white 3D wordmark with orange sides, tagline, handles
function shotFin(t) {
  const c = ctx, t0 = T.fin;
  c.fillStyle = P.blk; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, 880, 50, CX, 880, 900); g.addColorStop(0, 'rgba(254,87,42,0.10)'); g.addColorStop(1, 'rgba(254,87,42,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const L = on(LOGO); L.userData.mesh.material = MAT_LOGO_FIN;
  const k = E.outExpo(prog(t, t0, t0 + 0.45));
  const s = lerp(1.62, 0.93, k);
  L.scale.setScalar(s);
  L.position.set(0, Y(880), 0);
  L.rotation.set(0.1 * Math.sin((t - t0) * 2.2) + 0.25 * (1 - k), 0.22 * Math.sin((t - t0) * 1.6 + 0.3) * (0.4 + 0.6 * k), 0);
  wall.position.z = -0.8; wall.material.opacity = 0;
  key.position.set(lerp(-9, 7, prog(t, t0, DUR)), 6, 16);
  return () => {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    // orange rule
    const rk = E.outExpo(prog(t, t0 + 0.2, t0 + 0.5));
    c.fillStyle = P.or; c.fillRect(CX - 280 * rk, 1020, 560 * rk, 8);
    // tagline, letters rise
    c.font = IT(900, 62); c.letterSpacing = '14px';
    const tag = 'ANOTHER VISION', tws = [...tag].map(ch => c.measureText(ch).width + 14), tw = tws.reduce((a, b) => a + b, 0) - 14;
    let x = CX - tw / 2;
    c.save(); c.beginPath(); c.rect(0, 1060, W, 140); c.clip();
    for (let i = 0; i < tag.length; i++) {
      const ki = E.outExpo(prog(t, t0 + 0.3 + i * 0.022, t0 + 0.62 + i * 0.022));
      c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.fillText(tag[i], x, 1160 + 110 * (1 - ki));
      x += tws[i];
    }
    c.restore();
    c.textAlign = 'center';
    c.font = MONO(700, 26); c.letterSpacing = '8px'; c.fillStyle = col('#ffffff', 0.55);
    c.fillText(scramble('STREETWEAR FROM KAZAKHSTAN', prog(t, t0 + 0.25, t0 + 0.65), Math.floor(t * 40)), CX, 640);
    const hk = E.outCubic(prog(t, t0 + 0.55, t0 + 0.85));
    c.globalAlpha = hk;
    c.font = IT(800, 50); c.letterSpacing = '1px'; c.fillStyle = '#ffffff'; c.fillText('@basqawear', CX, 1600 + 24 * (1 - hk));
    c.font = MONO(500, 30); c.letterSpacing = '4px'; c.fillStyle = P.or; c.fillText('basqa.kz', CX, 1658 + 24 * (1 - hk));
    c.globalAlpha = 1;
    rosette(c, CX, 1420, 120 * E.outBack(prog(t, t0 + 0.45, t0 + 0.75)), (t - t0) * 0.8, P.or, 7);
    c.restore();
    hud(t, '#ffffff', prog(t, t0 + 0.6, t0 + 0.9));
  };
}

const SHOTS = [[0, shotStrings], [T.qala, shotQala], [T.alem, shotAlem], [T.zaman, shotZaman], [T.build, shotBuild], [T.drop, shotDrop], [T.tee, shotTee], [T.fin, shotFin]];

// ---------------------------------------------------------------- frame
const HITS = [[1.0, 10, 0.12], [1.5, 10, 0.12], [2.0, 10, 0.12], [3.0, 34, 0.42], [3.5, 9, 0.16], [4.0, 9, 0.16], [4.5, 9, 0.16], [5.5, 8, 0.22], [6.0, 10, 0.14], [6.5, 20, 0.3]];
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of HITS) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d; const f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
}
function resetFrame() {
  for (const o of REG) o.visible = false;
  wall.position.z = -0.6; wall.material.opacity = 0.2;
  key.position.set(-5, 8, 16); key.target.position.set(0, 0, 0);
  cam.position.set(0, 0, CAMZ); cam.lookAt(0, 0, 0);
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  resetFrame();
  let idx = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) idx = i;
  const f = Math.floor(t * FPS);
  const sh = shakeAt(t);
  const weave = [(hash(f * 0.37) - 0.5) * 2.2, (hash(f * 0.61 + 4) - 0.5) * 2.2];
  ctx.save(); ctx.translate(sh[0] + weave[0], sh[1] + weave[1]);
  const overlay = SHOTS[idx][1](t);
  cam.position.x += sh[0] / 100; cam.position.y -= sh[1] / 100;
  R3.render(scene, cam);
  ctx.drawImage(R3.domElement, -sh[0], -sh[1]);
  if (overlay) overlay();
  ctx.restore();
  post(t, idx);
}
function dirBlur(bx, by) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= 8; i++) { ctx.globalAlpha = 0.5 / i; ctx.drawImage(tmp, bx * i / 8, by * i / 8); ctx.drawImage(tmp, -bx * i / 8, -by * i / 8); }
  ctx.globalAlpha = 1;
}
function zoomBlur(amt) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= 7; i++) { const s = 1 + amt * i / 7; ctx.globalAlpha = 0.45 / i; ctx.drawImage(tmp, CX - CX * s, CY - CY * s, W * s, H * s); }
  ctx.globalAlpha = 1;
}
function post(t, idx) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  // whip DROP → TEE
  if (t > T.tee - 0.14 && t < T.tee + 0.16) {
    const p = t < T.tee ? E.inExpo(prog(t, T.tee - 0.14, T.tee)) : 1 - E.outExpo(prog(t, T.tee, T.tee + 0.16));
    tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
    c.fillStyle = t < T.tee ? P.or : P.st1; c.fillRect(0, 0, W, H);
    c.drawImage(tmp, (t < T.tee ? -1 : 1) * W * 0.7 * p, 0);
    dirBlur(180 * p, 0);
  }
  // zoom-through into the print, and out of it in the finale
  if (t > 6.3 && t < T.fin) zoomBlur(0.3 * E.inExpo(prog(t, 6.3, T.fin)));
  if (t >= T.fin && t < T.fin + 0.25) zoomBlur(0.25 * (1 - E.outCubic(prog(t, T.fin, T.fin + 0.25))));
  if (t > 2.75 && t < T.gap) zoomBlur(0.12 * prog(t, 2.75, T.gap));
  // strobe: one inverted frame on every hard cut
  for (const tc of [T.qala, T.alem, T.zaman, T.build, 2.625, 2.75, 2.875]) if (t >= tc && t < tc + 1 / FPS) { c.globalCompositeOperation = 'difference'; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
  // flashes / light leaks
  let fl = 0, leak = 0;
  if (t >= T.drop && t < T.drop + 0.12) fl = 0.7 * Math.pow(1 - prog(t, T.drop, T.drop + 0.12), 2);
  if (t >= T.fin && t < T.fin + 0.18) fl = Math.max(fl, 0.6 * (1 - prog(t, T.fin, T.fin + 0.18)));
  for (const tl of [T.qala, T.alem, T.zaman, T.drop, T.land, T.fin]) if (t >= tl && t < tl + 0.35) leak = Math.max(leak, 1 - prog(t, tl, tl + 0.35));
  if (leak > 0) {
    c.globalCompositeOperation = 'screen';
    const lx = hash(Math.floor(t * 4)) > 0.5 ? W : 0;
    const lg = c.createRadialGradient(lx, 300, 0, lx, 300, 1100); lg.addColorStop(0, col(P.or, 0.55 * leak)); lg.addColorStop(0.5, col('#ff9a5a', 0.18 * leak)); lg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = lg; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
  }
  if (fl > 0) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
  // film: dust specks on dark shots, flicker, vignette, grain
  const f = Math.floor(t * FPS);
  const dark = idx === 0 || idx === 1 || idx === 3 || idx === 7;
  if (dark) {
    const r = rng(1000 + f);
    for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`; c.beginPath(); c.ellipse(r() * W, r() * H, 1 + r() * 2.5, 1 + r() * 5, r() * 3, 0, TAU); c.fill(); }
    if (r() < 0.15) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(r() * W, 0, 1.5, H); }
  }
  const fk = (hash(f * 0.913) - 0.5) * 0.05;
  if (fk > 0) { c.fillStyle = `rgba(255,255,255,${fk * 0.6})`; c.fillRect(0, 0, W, H); } else { c.fillStyle = `rgba(0,0,0,${-fk})`; c.fillRect(0, 0, W, H); }
  const vg = c.createRadialGradient(CX, CY, 520, CX, CY, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${dark ? 0.45 : 0.2})`); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.11;
  const ox = -Math.floor(hash(f) * 512), oy = -Math.floor(hash(f + 0.5) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) c.drawImage(grains[f % 4], x, y);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  const k = 1 - prog(t, 0, 0.08);
  if (k > 0) { c.fillStyle = `rgba(0,0,0,${k})`; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet
function buildEvents() {
  ev(0, 'room', { end: DUR });
  ev(0.02, 'stringsIn');
  for (const [tp, ids, notes] of PLUCKS) ev(tp, 'pluck', { notes, ids });
  ev(0.875, 'bend', { end: SNAP }); ev(SNAP, 'snap');
  ev(T.qala, 'word', { i: 0 }); ev(T.alem, 'word', { i: 1 }); ev(T.zaman, 'word', { i: 2 });
  ev(T.qala + 0.02, 'sketch', { end: T.qala + 0.34 }); ev(T.alem + 0.02, 'spin');
  for (let i = 0; i < 8; i++) ev(T.zaman + i / 16, 'tick', { i });
  for (const [ts] of STUT) ev(ts, 'stutter');
  ev(T.zaman, 'riser', { end: T.gap }); ev(T.gap, 'gap');
  ev(T.drop, 'drop');
  for (const s of STK) ev(s.t, 'slap');
  ev(T.tee - 0.14, 'whip');
  for (let i = 0; i < 4; i++) ev(T.tee + 0.02 + i * 0.0625 + 0.12, 'letter', { i });
  ev(5.3, 'fall', { end: T.land }); ev(T.land, 'clink');
  ev(T.stamp, 'stamp');
  ev(6.22, 'zoom', { end: T.fin });
  ev(T.fin, 'final');
  for (let i = 0; i < 14; i++) ev(T.fin + 0.3 + i * 0.022, 'type', { i });
  ev(T.fin + 0.55, 'handles');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function loadImg(svg) { const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); const im = new Image(); im.src = url; await im.decode(); return im; }
async function boot() {
  const faces = [
    ['Anton', '/fonts/Anton-Regular.ttf', '400'],
    ['Inter Tight', '/fonts/InterTight-Medium.ttf', '500'],
    ['Inter Tight', '/fonts/InterTight-ExtraBold.ttf', '800'],
    ['Inter Tight', '/fonts/InterTight-Black.ttf', '900'],
    ['JB Mono', '/fonts/JetBrainsMono-Medium.ttf', '500'],
    ['JB Mono', '/fonts/JetBrainsMono-Bold.ttf', '700'],
  ];
  for (const [fam, url, wt] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt }); await f.load(); document.fonts.add(f); }
  const svg = await (await fetch('/assets/basqa_logo.svg')).text();
  const tint = c => svg.replace(/fill="white"/g, `fill="${c}"`).replace('<svg ', '<svg width="2720" height="480" ');
  IMG.logoW = await loadImg(tint('#ffffff'));
  IMG.logoB = await loadImg(tint('#0c0c0c'));
  IMG.logoR = await loadImg(tint('#ff2a2a'));
  IMG.logoC = await loadImg(tint('#00e5ff'));
  buildLogo(svg);
  buildStickers();
  buildTee();
  for (let k = 0; k < 4; k++) {
    const cv = mk(512, 512), gc = cv.getContext('2d'), id = gc.createImageData(512, 512), r = rng(50 + k);
    for (let i = 0; i < id.data.length; i += 4) { const vv = 128 + (r() + r() - 1) * 110; id.data[i] = id.data[i + 1] = id.data[i + 2] = vv; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); grains.push(cv);
  }
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
