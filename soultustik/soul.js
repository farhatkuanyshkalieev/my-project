// soultustik™ — 8 s vertical brand reel (1080×1920, 60 fps) for @soultustik.
// The brand: Kostanay, northern Kazakhstan. «soul» (англ. душа) + «soltüstik»
// (каз. север) = soultustik. Bio: «cold minded.» Look taken from the brand:
// deep green #024840 + cream #F6F6EA, heavy italic lowercase wordmark,
// prints of the region's towns (front) and the region map (back).
// 2D design layer + three.js 3D (extruded wordmark, a sweatshirt that turns
// front → back); every frame is a pure function of t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2, DUR = 10.0;
// film time (100 BPM: beat = 0.6 s, 16th = 0.15 s); every picture holds at least one beat
const T = { settle: 0.6, N: 1.2, N2: 1.5, soul: 1.8, solt: 2.4, logo: 3.0, map: 3.6, gap: 4.74, drop: 4.8, s1: 5.4, s2: 5.7, s3: 6.0, garm: 6.6, land: 6.75, front: 6.9, spin: 7.5, back: 7.65, stamp: 7.8, zoom: 8.12, fin: 8.4, badge: 9.0 };
const STUT = [4.5, 4.575, 4.65];
const P = { g: '#024840', gD: '#012E29', gL: '#0A6A5D', cr: '#F6F6EA', crD: '#E3E1D3', ice: '#DDEFEF', iceB: '#BFE3E6', blk: '#070C0B' };
const LOGO_AR = 3938 / 622;

// ---------------------------------------------------------------- utils
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
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
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const spring = (t, t0, f = 3.0, z = 0.3) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * TAU * f * a) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * a); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const X = px => (px - CX) / 100, Y = py => (CY - py) / 100;
const IT = (w, s) => `${w} ${s}px "Inter Tight"`;
const ITI = (w, s) => `italic ${w} ${s}px "Inter Tight"`;
const MONO = (w, s) => `${w} ${s}px "JB Mono"`;
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*/';
function scramble(txt, k, seed) {
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
const IMG = {};

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
const hemi = new THREE.HemisphereLight('#f4fbff', '#cfe3dc', 1.1); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffffff', 2.7);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -12, right: 12, top: 14, bottom: -14, near: 1, far: 70 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight('#d8f2ff', 1.6); rim.position.set(9, 5, -6); scene.add(rim);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), new THREE.ShadowMaterial({ opacity: 0.2 }));
wall.receiveShadow = true; scene.add(wall);
const phys = (c, r = 0.3, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 }, o));
const std = (c, r = 0.5, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o));
const REG = [];
function reg(o) { REG.push(o); o.visible = false; scene.add(o); return o; }
const on = o => { o.visible = true; return o; };

// ---------------------------------------------------------------- 3D wordmark
let LOGO = null; const LOGO_W = 8.4;
const MAT_LOGO = [phys(P.cr, 0.28, { emissive: '#ffffff', emissiveIntensity: 0.06 }), std('#0d5a50', 0.35, { metalness: 0.1 })];
const MAT_LOGO_DROP = [phys('#03594D', 0.2, { clearcoat: 1 }), std('#012E29', 0.35)];
function buildLogo(svgText) {
  const data = new SVGLoader().parse(svgText);
  const shapes = [];
  for (const p of data.paths) shapes.push(...SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 300, bevelEnabled: true, bevelThickness: 24, bevelSize: 10, bevelSegments: 5, curveSegments: 8 });
  geo.center();
  const s = LOGO_W / 3938; geo.scale(s, -s, -s);
  LOGO = new THREE.Group();
  const m = new THREE.Mesh(geo, MAT_LOGO); m.castShadow = true; LOGO.add(m); LOGO.userData.mesh = m;
  reg(LOGO);
}

// ---------------------------------------------------------------- the region (stylized outline) and its towns
const REGION = [[61.1, 54.0], [62.4, 54.15], [63.4, 54.6], [64.6, 54.5], [65.3, 54.1], [65.9, 53.6], [66.4, 52.9], [67.2, 52.3], [67.6, 51.4], [67.4, 50.5], [66.6, 49.8], [65.8, 49.2], [64.9, 48.7], [63.9, 48.9], [63.0, 49.4], [62.2, 50.0], [61.6, 50.6], [61.0, 51.0], [60.7, 51.6], [60.9, 52.3], [61.1, 52.9], [60.9, 53.5]];
const TOWNS = [['KOSTANAY', 63.62, 53.21, 1], ['RUDNY', 63.12, 52.97, 0], ['LISAKOVSK', 62.49, 52.54, 0], ['ZHITIKARA', 61.20, 52.19, 0], ['ARKALYK', 66.91, 50.25, 0]];
function mapProj(x0, y0, h) {   // lon/lat → px inside a box of height h
  const w = h * (7.3 * 0.616) / 6.3;
  return (lon, lat) => [x0 - w / 2 + (lon - 60.5) / 7.3 * w, y0 - h / 2 + (54.8 - lat) / 6.3 * h];
}
function drawRegion(c, pj, k, color, lw) {   // k: 0..1 share of the outline drawn
  const pts = REGION.map(([lo, la]) => pj(lo, la)); pts.push(pts[0]);
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  let left = total * k;
  c.strokeStyle = color; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const f = Math.min(1, left / seg[i - 1]);
    c.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= seg[i - 1];
  }
  c.stroke();
}

// ---------------------------------------------------------------- 3D sweatshirt (front: towns, back: region map)
const SW = {};
function swOutline(c) {   // 280×320 template, 50 px = 1 unit
  c.beginPath();
  c.moveTo(110, 16); c.quadraticCurveTo(122, 36, 140, 36); c.quadraticCurveTo(158, 36, 170, 16);
  c.lineTo(222, 30); c.quadraticCurveTo(250, 48, 262, 92); c.lineTo(278, 200); c.lineTo(250, 208); c.quadraticCurveTo(240, 150, 226, 112);
  c.lineTo(228, 292); c.lineTo(226, 310); c.quadraticCurveTo(140, 314, 54, 310); c.lineTo(52, 292); c.lineTo(54, 112);
  c.quadraticCurveTo(40, 150, 30, 208); c.lineTo(2, 200); c.lineTo(18, 92); c.quadraticCurveTo(30, 48, 58, 30);
  c.closePath();
}
function swFabric(c, PW, PH) {
  swOutline(c); c.fillStyle = '#ECE9DA'; c.fill();
  c.save(); swOutline(c); c.clip();
  const r = rng(5);
  for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'; c.fillRect(r() * PW, r() * PH, 0.25 + r() * 0.6, 0.25 + r() * 0.6); }
  // ribbed collar, cuffs and hem
  c.fillStyle = '#DAD6C3';
  c.beginPath(); c.moveTo(108, 14); c.quadraticCurveTo(122, 40, 140, 40); c.quadraticCurveTo(158, 40, 172, 14); c.lineTo(166, 13); c.quadraticCurveTo(156, 32, 140, 32); c.quadraticCurveTo(124, 32, 114, 13); c.closePath(); c.fill();
  c.fillRect(40, 294, 200, 20);
  c.save(); c.beginPath(); c.moveTo(0, 186); c.lineTo(280, 186); c.lineTo(280, 215); c.lineTo(0, 215); c.clip();
  c.fillRect(0, 186, 60, 30); c.fillRect(220, 186, 60, 30); c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.1)'; c.lineWidth = 0.5;
  for (let x = 40; x < 240; x += 2.2) { c.beginPath(); c.moveTo(x, 294); c.lineTo(x, 314); c.stroke(); }
  c.restore();
}
function buildSweat() {
  const PW = 280, PH = 320, U = 50;
  const mc = mk(PW, PH), m = mc.getContext('2d'); swOutline(m); m.fillStyle = '#fff'; m.fill();
  const a = m.getImageData(0, 0, PW, PH).data;
  const D = new Float32Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) D[i] = a[i * 4 + 3] > 127 ? 1e9 : 0;
  const d2 = Math.SQRT2;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; if (!D[i]) continue; let v = D[i];
    if (x > 0) v = Math.min(v, D[i - 1] + 1); if (y > 0) v = Math.min(v, D[i - PW] + 1); if (x > 0 && y > 0) v = Math.min(v, D[i - PW - 1] + d2); if (x < PW - 1 && y > 0) v = Math.min(v, D[i - PW + 1] + d2); D[i] = v; }
  for (let y = PH - 1; y >= 0; y--) for (let x = PW - 1; x >= 0; x--) { const i = y * PW + x; if (!D[i]) continue; let v = D[i];
    if (x < PW - 1) v = Math.min(v, D[i + 1] + 1); if (y < PH - 1) v = Math.min(v, D[i + PW] + 1); if (x < PW - 1 && y < PH - 1) v = Math.min(v, D[i + PW + 1] + d2); if (x > 0 && y < PH - 1) v = Math.min(v, D[i + PW - 1] + d2); D[i] = v; }
  const samp = (px, py) => { const x = clamp(Math.round(px), 0, PW - 1), y = clamp(Math.round(py), 0, PH - 1); return D[y * PW + x] / U; };
  const mkGeo = (sign) => {
    const geo = new THREE.PlaneGeometry(5.6, 6.4, 168, 192);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const px = (x + 2.8) * U, py = (3.2 - y) * U;
      const d = (samp(px, py) * 2 + samp(px + 2, py) + samp(px - 2, py) + samp(px, py + 2) + samp(px, py - 2)) / 6;
      if (d <= 0) { pos.setZ(i, 0); continue; }
      const puff = 0.5 * (1 - Math.exp(-d / 0.5));
      const fade = clamp(d / 0.4);
      const folds = 0.05 * Math.sin(4.2 * x + 2.2 * y) * clamp((-y + 0.5) / 2) + 0.04 * Math.sin(3.1 * y - 1.2 * x + sign) + 0.05 * Math.sin(9 * y) * clamp((Math.abs(x) - 1.9) / 0.6);
      pos.setZ(i, sign * (puff + fade * folds));
    }
    geo.computeVertexNormals();
    return geo;
  };
  const S = 4;
  // front: chest wordmark + the towns of the region
  const fc = mk(PW * S, PH * S), f = fc.getContext('2d'); f.scale(S, S); swFabric(f, PW, PH);
  { const pw = 112, ph = pw / LOGO_AR; f.drawImage(IMG.logoG, 140 - pw / 2, 84 - ph / 2, pw, ph);
    f.fillStyle = P.g; f.font = MONO(700, 5.6); f.textAlign = 'center'; f.letterSpacing = '1px';
    f.fillText('KOSTANAY · RUDNY · LISAKOVSK', 140, 106); f.fillText('ZHITIKARA · ARKALYK', 140, 114);
    f.globalAlpha = 0.6; f.font = MONO(500, 4.4); f.fillText('53.2141° N   63.6246° E', 140, 124); f.globalAlpha = 1; }
  // back: the region map (drawn mirrored, it is seen from behind)
  const bc = mk(PW * S, PH * S), b = bc.getContext('2d'); b.scale(S, S);
  b.save(); b.translate(PW, 0); b.scale(-1, 1); swFabric(b, PW, PH);
  { const pj = mapProj(140, 150, 150);
    drawRegion(b, pj, 1, P.g, 1.6);
    for (const [, lo, la, big] of TOWNS) { const [x, y] = pj(lo, la); b.fillStyle = P.g; b.beginPath(); b.arc(x, y, big ? 3 : 2, 0, TAU); b.fill(); if (big) { b.strokeStyle = P.g; b.lineWidth = 0.8; b.beginPath(); b.arc(x, y, 6, 0, TAU); b.stroke(); } }
    b.font = MONO(700, 5); b.fillStyle = P.g; b.textAlign = 'left'; b.letterSpacing = '0.6px';
    for (const [n, lo, la] of TOWNS) { const [x, y] = pj(lo, la); const [lx, ly, al] = { KOSTANAY: [5, -4, 'left'], RUDNY: [-4, 7, 'right'], LISAKOVSK: [4, 7, 'left'], ZHITIKARA: [-4, -3, 'right'], ARKALYK: [5, -3, 'left'] }[n]; b.textAlign = al; b.fillText(n, x + lx, y + ly); }
    const pw = 150, ph = pw / LOGO_AR; b.drawImage(IMG.logoG, 140 - pw / 2, 52 - ph / 2, pw, ph);
    b.font = MONO(700, 6); b.textAlign = 'center'; b.letterSpacing = '2px'; b.fillText('KOSTANAY REGION', 140, 252); }
  b.restore();
  const mat = (cv) => { const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5, alphaTest: 0.5, side: THREE.DoubleSide });
    return [m, new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 })]; };
  const [fm, fd] = mat(fc), [bm, bd] = mat(bc);
  const front = new THREE.Mesh(mkGeo(1), fm); front.castShadow = true; front.customDepthMaterial = fd;
  const back = new THREE.Mesh(mkGeo(-1), bm); back.castShadow = true; back.customDepthMaterial = bd;
  SW.g = reg(new THREE.Group()); SW.g.add(front); SW.g.add(back);
}

// ---------------------------------------------------------------- snow
const FLAKES = [];
{ const r = rng(77); for (let i = 0; i < 320; i++) FLAKES.push({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, ph: r() * TAU, s: r() }); }
function snow(c, t, k = 1, color = P.cr, wind = 1) {
  if (k <= 0) return;
  for (const f of FLAKES) {
    const sp = 120 + 380 * f.z;
    const x = ((f.x + t * sp * 1.6 * wind + 30 * Math.sin(t * 1.3 + f.ph)) % (W + 40) + W + 40) % (W + 40) - 20;
    const y = ((f.y + t * sp * 0.55) % (H + 40) + H + 40) % (H + 40) - 20;
    const r = 1 + 3.6 * f.z * f.z;
    c.fillStyle = col(color, k * (0.25 + 0.6 * f.z));
    c.beginPath(); c.ellipse(x, y, r * (1 + wind * f.z * 1.4), r, 0.32, 0, TAU); c.fill();
  }
}
// burst of snow from the centre on the drop
const BURST = [];
{ const r = rng(91); for (let i = 0; i < 260; i++) { const a = r() * TAU; BURST.push({ a, v: 500 + r() * 1500, z: r(), ph: r() * TAU }); } }
function burst(c, t, t0) {
  if (t < t0) return;
  const d = t - t0;
  for (const p of BURST) {
    const dist = p.v * (1 - Math.exp(-d * 3.2)) / 3.2 * 3.2;
    const x = CX + Math.cos(p.a) * dist + d * 160, y = CY + Math.sin(p.a) * dist + d * d * 60;
    const r = 1.5 + 4 * p.z;
    c.fillStyle = col(P.cr, (0.35 + 0.6 * p.z) * clamp(1.6 - d));
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
}

// ---------------------------------------------------------------- shared 2D
function hud(t, color, k = 1, temp = null) {
  if (k <= 0) return;
  const c = ctx; c.save(); c.globalAlpha = k;
  c.strokeStyle = col(color, 0.7); c.lineWidth = 3;
  const m = 44, L = 42;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke(); }
  const ty = prog(t, 0.08, 0.6), sd = Math.floor(t * 30);
  const lw = 230, lh = lw / LOGO_AR;
  c.globalAlpha = k * clamp(ty * 2);
  c.drawImage(color === P.cr ? IMG.logoC : IMG.logoG, 78, 96, lw, lh);
  c.globalAlpha = k;
  c.fillStyle = col(color, 0.62); c.textBaseline = 'alphabetic'; c.font = MONO(500, 22); c.letterSpacing = '2px'; c.textAlign = 'left';
  c.fillText(scramble('- COLD MINDED.', ty, sd + 3), 78, 172);
  c.fillText(scramble('KOSTANAY · KZ', ty, sd + 5), 78, H - 92);
  c.textAlign = 'right';
  c.fillText(scramble('53.2141° N', ty, sd + 7), W - 78, 124);
  c.fillText(scramble('63.6246° E', ty, sd + 9), W - 78, 156);
  c.fillText(scramble(temp ?? '−24 °C', ty, sd + 11), W - 78, H - 92);
  c.restore();
}
function fitFont(txt, maxW, size, font) { ctx.font = font(size); ctx.letterSpacing = '0px'; const w = ctx.measureText(txt).width; return w > maxW ? size * maxW / w : size; }
// kinetic italic word: letters slide in sideways like a gust of wind, with a skew smear
function gustWord(t, t0, txt, cx, baseY, size, color, o = {}) {
  const c = ctx; c.save();
  c.font = ITI(900, size); c.letterSpacing = '-2px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const ws = [...txt].map(ch => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0);
  let x = cx - tw / 2;
  for (let i = 0; i < txt.length; i++) {
    const ti = t0 + i * (o.stag ?? 0.022);
    const k = prog(t, ti, ti + 0.16);
    if (t >= ti) {
      const e = E.outExpo(k);
      const dx = -260 * (1 - e), sk = -0.5 * (1 - e);
      if (k < 1) for (let j = 1; j <= 4; j++) { c.save(); c.globalAlpha = 0.16 * (1 - k); c.translate(x + dx - j * 40 * (1 - e), baseY); c.transform(1, 0, sk, 1, 0, 0); c.fillStyle = color; c.fillText(txt[i], 0, 0); c.restore(); }
      c.save(); c.globalAlpha = clamp(k * 3); c.translate(x + dx, baseY); c.transform(1 + 0.25 * (1 - e), 0, sk, 1, 0, 0);
      c.fillStyle = color; c.fillText(txt[i], 0, 0); c.restore();
    }
    x += ws[i];
  }
  c.restore();
  return tw;
}


// ---------------------------------------------------------------- 3D vinyl stickers
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function flake(c, x, y, s, color, lw) {   // six-armed snowflake glyph
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * 0.55); c.lineTo(s * 0.25, -s * 0.78); c.moveTo(0, -s * 0.55); c.lineTo(-s * 0.25, -s * 0.78); c.stroke(); }
  c.restore();
}
function rose(c, x, y, s, color) {   // compass rose
  c.save(); c.translate(x, y); c.fillStyle = color;
  for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.16, -s * 0.16); c.lineTo(-s * 0.16, -s * 0.16); c.closePath(); c.fill(); }
  c.rotate(Math.PI / 4); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -s * 0.5); c.lineTo(s * 0.1, -s * 0.1); c.lineTo(-s * 0.1, -s * 0.1); c.closePath(); c.fill(); }
  c.restore();
}
function stickerMesh(cv, wu, hu) {
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wu, hu), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, alphaTest: 0.5, toneMapped: false }));
  m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  return reg(m);
}
const STK = {};
function buildStickers() {
  { const cv = mk(940, 250), c = cv.getContext('2d');   // cold minded.
    rr(c, 4, 4, 932, 242, 44); c.fillStyle = '#fff'; c.fill();
    rr(c, 20, 20, 900, 210, 30); c.fillStyle = P.g; c.fill();
    flake(c, 112, 125, 52, P.cr, 9);
    c.fillStyle = P.cr; c.font = ITI(900, 104); c.letterSpacing = '-2px'; c.textBaseline = 'middle'; c.fillText('cold minded.', 196, 128);
    STK.cold = { m: stickerMesh(cv, 6.0, 1.6), w: 6.0 }; }
  const badge = () => { const cv = mk(560, 560), c = cv.getContext('2d');
    c.beginPath(); c.arc(280, 280, 276, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(280, 280, 258, 0, TAU); c.fillStyle = P.g; c.fill();
    c.beginPath(); c.arc(280, 280, 150, 0, TAU); c.fillStyle = P.cr; c.fill();
    rose(c, 280, 280, 128, P.g);
    c.fillStyle = P.cr; c.font = ITI(900, 40); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = MONO(700, 32); const txt = 'SOULTUSTIK · KOSTANAY · SOLTÜSTIK · '; const n = txt.length;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU; c.save(); c.translate(280 + Math.cos(a) * 205, 280 + Math.sin(a) * 205); c.rotate(a + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
    return cv; };
  STK.badge = { m: stickerMesh(badge(), 3.6, 3.6) };
  STK.badge2 = { m: stickerMesh(badge(), 3.6, 3.6) };
  const tag = () => { const cv = mk(900, 380), c = cv.getContext('2d');
    rr(c, 4, 4, 892, 372, 34); c.fillStyle = '#fff'; c.fill();
    rr(c, 20, 20, 860, 340, 20); c.fillStyle = P.iceB; c.fill();
    c.drawImage(IMG.logoG, 54, 50, 230, 230 / LOGO_AR);
    c.fillStyle = P.g; c.textBaseline = 'alphabetic';
    c.font = ITI(900, 170); c.letterSpacing = '-4px'; c.fillText('−32 °C', 44, 252);
    c.font = MONO(700, 28); c.letterSpacing = '2px'; c.fillText('NORTH SERIES · 53°13′ N', 56, 322);
    const r = rng(9); let x = 700; while (x < 850) { const w = 3 + Math.floor(r() * 9); c.fillRect(x, 70, w, 170); x += w + 3 + Math.floor(r() * 7); }
    flake(c, 775, 300, 26, P.g, 5);
    return cv; };
  STK.tag = { m: stickerMesh(tag(), 5.4, 2.28) };
  STK.tag2 = { m: stickerMesh(tag(), 5.4, 2.28) };
  const label = (word, sub) => { const cv = mk(640, 230), c = cv.getContext('2d');
    rr(c, 4, 4, 632, 222, 36); c.fillStyle = '#fff'; c.fill();
    rr(c, 18, 18, 604, 194, 24); c.fillStyle = P.cr; c.fill();
    c.fillStyle = P.g; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = ITI(900, 112); c.letterSpacing = '-2px'; c.fillText(word, 320, 128);
    c.font = MONO(700, 26); c.letterSpacing = '3px'; c.fillText(sub, 320, 182);
    return cv; };
  STK.front = { m: stickerMesh(label('front.', 'ВПЕРЕДИ — РАЙЦЕНТРЫ'), 4.2, 1.51) };
  STK.back = { m: stickerMesh(label('back.', 'СЗАДИ — КАРТА ОБЛАСТИ'), 4.2, 1.51) };
}
function slapSticker(t, s, ts, x, y, rz, z = -0.3, sc = 1) {
  if (t < ts) return;
  const k = prog(t, ts, ts + 0.13), sp = spring(t, ts, 4.5, 0.38);
  const m = on(s.m);
  m.position.set(X(x), Y(y), lerp(5, z, E.outExpo(k)));
  m.rotation.set(0.5 * (1 - sp), -0.4 * (1 - sp), rz + 0.5 * (1 - sp));
  m.scale.setScalar(sc * (1 + 0.12 * (1 - sp)));
}

// ---------------------------------------------------------------- 3D ice crystals
const SH = { n: 54, d: [] };
function buildShards() {
  const mat = new THREE.MeshPhysicalMaterial({ color: '#d9f3f6', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, flatShading: true, transparent: true, opacity: 0.92, envMapIntensity: 1.8, emissive: '#a9dde3', emissiveIntensity: 0.12 });
  SH.mesh = reg(new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), mat, SH.n));
  SH.mesh.castShadow = true;
  const r = rng(404);
  for (let i = 0; i < SH.n; i++) {
    const a = r() * TAU, el = (r() - 0.5) * 1.2;
    SH.d.push({ dir: new THREE.Vector3(Math.cos(a), Math.sin(a) * 1.5, (r() - 0.6) * 0.8), v: 11 + r() * 12, size: 0.07 + r() * 0.2, st: 1.6 + r() * 1.8,
      axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 2 + r() * 6, a0: r() * TAU, w: 0.35 + r() * 0.6, rad: 3.6 + r() * 3.0, yo: (r() - 0.5) * 9, zo: (r() - 0.5) * 3 });
  }
  SH.o = new THREE.Object3D(); SH.q = new THREE.Quaternion();
}
function shards(t, mode, t0, cx = 0, cy = 0, k = 1) {
  const m = on(SH.mesh), o = SH.o;
  for (let i = 0; i < SH.n; i++) {
    const p = SH.d[i];
    if (mode === 'burst') {
      const d = Math.max(0, t - t0), dist = p.v * (1 - Math.exp(-2.4 * d)) / 2.4;
      o.position.set(cx + p.dir.x * dist, cy + p.dir.y * dist - 0.3 * d * d, p.dir.z * dist * 0.5);
      o.scale.set(p.size, p.size * p.st, p.size).multiplyScalar(clamp(d * 10) * k * 0.75);
    } else {
      const a = p.a0 + p.w * t;
      o.position.set(cx + Math.cos(a) * p.rad, cy + p.yo * 0.8 + Math.sin(a * 1.3) * 0.3, Math.sin(a) * p.rad * 0.6 + p.zo * 0.3);
      o.scale.set(p.size, p.size * p.st, p.size).multiplyScalar(k);
    }
    o.quaternion.setFromAxisAngle(p.axis, p.spin * t + i);
    o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- shots
function bgGreen(c) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.gD); g.addColorStop(1, P.g); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function bgCream(c) { const g = c.createRadialGradient(CX, 820, 80, CX, 960, 1250); g.addColorStop(0, '#FBFAF3'); g.addColorStop(1, '#E4E1D2'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
// slam: a giant word that hits the frame and settles (scale + smear)
function slam(t, t0, txt, cx, baseY, size, color, o = {}) {
  const c = ctx, k = prog(t, t0, t0 + 0.09), e = E.outExpo(k);
  const s = lerp(o.from ?? 1.35, 1, e) * (1 + (o.grow ?? 0.04) * prog(t, t0, t0 + 0.4));
  c.save(); c.font = ITI(900, size); c.letterSpacing = '-4px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  for (let j = 3; j >= 1; j--) if (k < 1) { c.save(); c.globalAlpha = 0.2 * (1 - k); c.translate(cx - j * 50 * (1 - e), baseY); c.scale(s, s); c.fillStyle = color; c.fillText(txt, 0, 0); c.restore(); }
  c.translate(cx, baseY); c.scale(s, s); c.transform(1, 0, -0.12 * (1 - e), 1, 0, 0); c.fillStyle = color; c.fillText(txt, 0, 0);
  c.restore();
}
// outline echoes of a word stacked above and below, drifting in opposite directions
function echoes(t, t0, txt, baseY, size, color, step) {
  const c = ctx; c.save(); c.font = ITI(900, size); c.letterSpacing = '-4px'; c.textAlign = 'center'; c.strokeStyle = color; c.lineWidth = 3;
  for (let j = -4; j <= 4; j++) { if (!j) continue; const k = E.outExpo(prog(t, t0 + Math.abs(j) * 0.02, t0 + 0.2 + Math.abs(j) * 0.02)); c.globalAlpha = k * (0.5 - Math.abs(j) * 0.09); c.strokeText(txt, CX + (j % 2 ? 1 : -1) * (t - t0) * 260, baseY + j * step * k); }
  c.restore();
}

// 0.00–1.20  the compass finds north, the camera dives into the «N»
function shotNorth(t) {
  const c = ctx;
  bgGreen(c); snow(c, t, 0.9);
  const zk = E.inExpo(prog(t, 0.95, T.N));
  const s = 1 + 7 * zk, ny = 930 - 238;
  c.save(); c.translate(CX, lerp(ny, CY, zk)); c.scale(s, s); c.translate(-CX, -ny); c.translate(CX, 930);
  const R = 330, ring = E.outExpo(prog(t, 0.0, 0.35)), rot = -0.3 * (1 - E.outCubic(prog(t, 0, T.settle)));
  c.rotate(rot);
  for (let i = 0; i < 72; i++) {
    if (i / 72 > ring) break;
    const a = -Math.PI / 2 + i / 72 * TAU, L = i % 18 === 0 ? 46 : i % 6 === 0 ? 26 : 14;
    c.strokeStyle = col(P.cr, i % 18 === 0 ? 0.95 : 0.45); c.lineWidth = i % 18 === 0 ? 5 : 2.5;
    c.beginPath(); c.moveTo(Math.cos(a) * R, Math.sin(a) * R); c.lineTo(Math.cos(a) * (R - L), Math.sin(a) * (R - L)); c.stroke();
  }
  c.strokeStyle = col(P.cr, 0.35); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R + 22, -Math.PI / 2, -Math.PI / 2 + TAU * ring); c.stroke();
  c.font = ITI(900, 64); c.textAlign = 'center'; c.textBaseline = 'middle';
  const lit = prog(t, T.settle, T.settle + 0.08);
  for (const [ch, a] of [['N', 0], ['E', 1], ['S', 2], ['W', 3]]) {
    const ang = -Math.PI / 2 + a * Math.PI / 2;
    c.fillStyle = col(P.cr, ch === 'N' ? 0.6 + 0.4 * lit : 0.45);
    c.save(); c.translate(Math.cos(ang) * (R - 92), Math.sin(ang) * (R - 92)); c.rotate(-rot); c.fillText(ch, 0, 0); c.restore();
  }
  const ang = t < T.settle ? 2.3 * Math.exp(-t * 2.8) * Math.cos(TAU * 1.75 * t) * (1 - E.inCubic(prog(t, 0.32, T.settle))) : 0.04 * Math.exp(-(t - T.settle) * 10) * Math.sin((t - T.settle) * 60);
  c.rotate(ang - rot);
  c.fillStyle = P.cr; c.beginPath(); c.moveTo(0, -R + 70); c.lineTo(26, 0); c.lineTo(-26, 0); c.closePath(); c.fill();
  c.strokeStyle = P.cr; c.lineWidth = 3; c.beginPath(); c.moveTo(0, R - 70); c.lineTo(26, 0); c.lineTo(-26, 0); c.closePath(); c.stroke();
  c.fillStyle = P.g; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.strokeStyle = P.cr; c.stroke();
  c.restore();
  const kt = prog(t, 0.15, 0.55);
  if (kt > 0) {
    c.save(); c.textAlign = 'center'; c.font = IT(500, 46); c.letterSpacing = '1px'; c.globalAlpha = 1 - zk;
    const full = 'soltüstik (каз.) — север', n = Math.floor(kt * full.length), str = full.slice(0, n);
    c.fillStyle = col(P.cr, 0.92); c.fillText(str, CX, 1450);
    c.font = MONO(700, 26); c.letterSpacing = '8px'; c.fillStyle = col(P.cr, 0.7 * clamp(kt * 3)); c.fillText('[ 53°13′ N ]', CX, 470);
    c.restore();
  }
  hud(t, P.cr, 1 - zk);
  return null;
}

// 1.20–1.80  a giant N fills the frame, twice (cream, then inverted)
function shotN(t) {
  const c = ctx, inv = t >= T.N2;
  if (inv) bgGreen(c); else bgCream(c);
  const fg = inv ? P.cr : P.g;
  snow(c, t, 0.5, fg);
  slam(t, inv ? T.N2 : T.N, 'N', CX + 20, 1430, inv ? 1650 : 1450, fg, { from: inv ? 1.25 : 1.6, grow: 0.08 });
  c.save(); c.font = MONO(700, 30); c.letterSpacing = '10px'; c.fillStyle = inv ? P.cr : P.g; c.textAlign = 'left';
  c.fillText('NORTH', 70, 250); c.fillText('СЕВЕР', 70, 296); c.fillText('SOLTÜSTIK', 70, 342);
  c.textAlign = 'right'; c.fillText('53°13′ N', W - 70, 1700); c.restore();
  return null;
}

// 1.80–3.60  soul (cream) → soltüstik (black) → the logo (green)
function shotWords(t) {
  const c = ctx;
  if (t < T.solt) {
    bgCream(c);
    const size = fitFont('soul', 960, 520, s => ITI(900, s));
    echoes(t, T.soul, 'soul', 1060, size, col(P.g, 1), 300);
    slam(t, T.soul, 'soul', CX, 1060, size, P.g);
    c.save(); c.textAlign = 'center'; c.font = MONO(700, 32); c.letterSpacing = '10px'; c.fillStyle = P.g;
    c.fillText(scramble('(АНГЛ.) ДУША', prog(t, T.soul + 0.04, T.soul + 0.22), Math.floor(t * 40)), CX, 1190); c.restore();
    hud(t, P.g, 1);
    return null;
  }
  if (t < T.logo) {
    c.fillStyle = P.blk; c.fillRect(0, 0, W, H);
    snow(c, t, 0.9, P.cr, 2.2);
    const size = fitFont('soltüstik', 1000, 300, s => ITI(900, s));
    echoes(t, T.solt, 'soltüstik', 1040, size, col(P.iceB, 1), 190);
    gustWord(t, T.solt, 'soltüstik', CX, 1040, size, P.cr, { stag: 0.014 });
    c.save(); c.textAlign = 'center'; c.font = MONO(700, 32); c.letterSpacing = '10px'; c.fillStyle = P.iceB;
    c.fillText(scramble('(КАЗ.) СЕВЕР', prog(t, T.solt + 0.04, T.solt + 0.22), Math.floor(t * 40)), CX, 1150); c.restore();
    hud(t, P.cr, 1);
    return null;
  }
  bgGreen(c); snow(c, t, 0.7, P.cr, 1.2);
  burst(c, t, T.logo);
  const k = E.outExpo(prog(t, T.logo, T.logo + 0.12));
  const lw = 960 * lerp(1.4, 1, k) * (1 + 0.04 * prog(t, T.logo, T.map)), lh = lw / LOGO_AR;
  c.drawImage(IMG.logoC, CX - lw / 2, 920 - lh / 2, lw, lh);
  c.save(); c.textAlign = 'center'; c.font = MONO(700, 30); c.letterSpacing = '8px'; c.fillStyle = col(P.cr, 0.75);
  c.fillText('SOUL + SOLTÜSTIK', CX, 760); c.fillStyle = P.cr; c.font = ITI(900, 64); c.letterSpacing = '-1px'; c.fillText('= душа севера', CX, 1120); c.restore();
  hud(t, P.cr, 1);
  return null;
}

// 3.60–4.74  the region in a tilted camera: towns pop with light beams, a route links them, −32° looms behind
const PIN_T = [3.9, 4.05, 4.2, 4.35, 4.5];
function shotMap(t) {
  const c = ctx, t0 = T.map;
  if (t >= T.gap) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); return null; }
  bgGreen(c);
  const temp = Math.round(lerp(-12, -32, E.inCubic(prog(t, t0, T.gap))));
  c.save(); c.textAlign = 'center'; c.font = ITI(900, 560); c.letterSpacing = '-20px'; c.strokeStyle = col(P.cr, 0.16); c.lineWidth = 4;
  c.strokeText(`−${Math.abs(temp)}°`, CX, 1480); c.restore();
  const e = E.outCubic(prog(t, t0, t0 + 0.6)), zs = 1 + 0.1 * prog(t, t0, T.gap);
  c.save(); c.translate(CX, 1000); c.scale(zs, zs); c.rotate(lerp(-0.16, 0.03, e)); c.transform(1, 0, lerp(-0.3, -0.04, e), lerp(0.72, 0.96, e), 0, 0);
  const pj = mapProj(0, 0, 860);
  c.strokeStyle = col(P.cr, 0.1); c.lineWidth = 1.5;
  for (let la = 49; la <= 54; la++) { const [x0, y] = pj(60.3, la), [x1] = pj(68, la); c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  for (let lo = 61; lo <= 67; lo++) { const [x, y0] = pj(lo, 54.8), [, y1] = pj(lo, 48.4); c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
  const dk = E.inOutCubic(prog(t, t0, t0 + 0.35));
  c.save(); c.globalAlpha = 0.16 * dk; c.beginPath(); REGION.forEach(([lo, la], i) => { const [x, y] = pj(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fillStyle = P.cr; c.fill(); c.restore();
  drawRegion(c, pj, dk, P.cr, 5);
  // route through the towns
  const rk = E.inOutCubic(prog(t, 3.95, 4.65));
  if (rk > 0) { c.save(); c.setLineDash([14, 12]); c.lineDashOffset = -t * 120; const pts = TOWNS.map(([, lo, la]) => pj(lo, la)); let tot = 0; const sg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sg.push(d); tot += d; }
    let left = tot * rk; c.strokeStyle = col(P.iceB, 0.95); c.lineWidth = 3; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) { const f = Math.min(1, left / sg[i - 1]); c.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= sg[i - 1]; }
    c.stroke(); c.restore(); }
  TOWNS.forEach(([n, lo, la, big], i) => {
    const tp = PIN_T[i]; if (t < tp) return;
    const k = prog(t, tp, tp + 0.12), [x, y] = pj(lo, la), s = E.outBack(k);
    const bh = 220 * E.outExpo(k);
    const bg = c.createLinearGradient(x, y, x, y - bh); bg.addColorStop(0, col(P.cr, 0.9)); bg.addColorStop(1, col(P.cr, 0)); c.fillStyle = bg; c.fillRect(x - 3, y - bh, 6, bh);
    c.fillStyle = P.cr; c.beginPath(); c.arc(x, y, (big ? 13 : 9) * s, 0, TAU); c.fill();
    const pk = ((t - tp) * 2.2) % 1; c.strokeStyle = col(P.cr, 1 - pk); c.lineWidth = 3; c.beginPath(); c.arc(x, y, 12 + 46 * pk, 0, TAU); c.stroke();
    const [lx, ly, al] = { KOSTANAY: [22, -16, 'left'], RUDNY: [-20, 34, 'right'], LISAKOVSK: [20, 30, 'left'], ZHITIKARA: [-20, -14, 'right'], ARKALYK: [22, -14, 'left'] }[n];
    c.font = MONO(700, big ? 32 : 25); c.letterSpacing = '3px'; c.fillStyle = P.cr; c.textAlign = al;
    c.fillText(scramble(n, prog(t, tp, tp + 0.14), Math.floor(t * 40) + i), x + lx, y + ly);
  });
  c.restore();
  c.save(); c.textAlign = 'center';
  c.font = ITI(900, 80); c.letterSpacing = '-1px'; c.fillStyle = P.cr; c.fillText('kostanay region', CX, 380);
  c.font = MONO(700, 24); c.letterSpacing = '8px'; c.fillStyle = col(P.cr, 0.6); c.fillText('SOLTÜSTIK QAZAQSTAN', CX, 432);
  c.restore();
  snow(c, t, 0.5 + 0.5 * prog(t, t0, T.gap), P.cr, 1 + 2.5 * prog(t, t0, T.gap));
  const fr = E.inCubic(prog(t, 4.35, T.gap));
  if (fr > 0) { const vg = c.createRadialGradient(CX, CY, 900 * (1 - fr) + 120, CX, CY, 1300); vg.addColorStop(0, 'rgba(230,245,245,0)'); vg.addColorStop(1, `rgba(230,245,245,${0.85 * fr})`); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
  hud(t, P.cr, 1, `−${Math.abs(temp)} °C`);
  return null;
}

// 4.80–6.60  DROP on cream: green 3D wordmark, a burst of ice crystals, stickers on the beats
function marquee(t, color, t0) {
  const c = ctx; c.save();
  c.font = ITI(900, 170); c.letterSpacing = '-2px'; c.strokeStyle = color; c.lineWidth = 3; c.textBaseline = 'middle';
  const unit = 'cold minded. soul of the north. ';
  const uw = c.measureText(unit).width;
  for (let r = 0; r < 11; r++) {
    const y = 90 + r * 185, dir = r % 2 ? 1 : -1;
    let x = ((dir * (t - t0) * 300 + r * 411) % uw + uw) % uw - uw;
    for (; x < W; x += uw) c.strokeText(unit, x, y);
  }
  c.restore();
}
function shotDrop(t) {
  const c = ctx, t0 = T.drop;
  bgCream(c);
  marquee(t, col(P.g, 0.12), t0);
  c.save(); c.globalAlpha = 0.07; c.translate(CX, CY); c.rotate((t - t0) * 0.4); rose(c, 0, 0, 760 * (0.8 + 0.2 * E.outExpo(prog(t, t0, t0 + 0.4))), P.g); c.restore();
  if (t < t0 + 0.5) { const k = prog(t, t0, t0 + 0.5); c.strokeStyle = col(P.g, 0.9 * (1 - k)); c.lineWidth = 46 * (1 - k) + 2; c.beginPath(); c.arc(CX, CY, 60 + 1300 * E.outExpo(k), 0, TAU); c.stroke(); }
  snow(c, t, 0.35, P.g, 1.4);
  const L = on(LOGO); L.userData.mesh.material = MAT_LOGO_DROP;
  const kin = prog(t, t0, t0 + 0.11);
  const pulse = [T.s1, T.s2, T.s3].reduce((s, b) => s + (t >= b ? 0.05 * Math.exp(-(t - b) * 14) : 0), 0);
  L.position.set(0, 0, 9 * (1 - E.outExpo(kin)));
  L.rotation.x = 0.9 * (1 - spring(t, t0, 2.4, 0.32)) + 0.12 * Math.sin((t - t0) * TAU * 0.4);
  L.rotation.y = -0.4 * Math.sin((t - t0) * TAU * 0.45);
  L.rotation.z = 0.04 * Math.sin((t - t0) * TAU * 0.3);
  L.scale.setScalar(1 + pulse);
  shards(t, 'burst', t0, 0, 0, 1);
  slapSticker(t, STK.cold, T.s1, 540, 600, -0.08);
  slapSticker(t, STK.badge, T.s2, 255, 1350, 0.22);
  slapSticker(t, STK.tag, T.s3, 745, 1515, 0.07);
  wall.position.z = -0.7; wall.material.opacity = 0.28;
  key.position.set(-5 + 4 * Math.sin((t - t0) * 1.6), 8, 16);
  return () => hud(t, P.g, 1, '−32 °C');
}

// 6.60–8.40  spotlight: the cream sweatshirt drops in, turns front → back, ice crystals orbit
function shotGarm(t) {
  const c = ctx, t0 = T.garm;
  c.fillStyle = P.blk; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, 820, 60, CX, 900, 1100); g.addColorStop(0, '#0E7465'); g.addColorStop(0.55, P.gD); g.addColorStop(1, P.blk); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'screen'; const cg = c.createLinearGradient(0, 0, 0, 1700); cg.addColorStop(0, col(P.cr, 0.22)); cg.addColorStop(1, col(P.cr, 0));
  c.fillStyle = cg; c.beginPath(); c.moveTo(CX - 90, 0); c.lineTo(CX + 90, 0); c.lineTo(CX + 520, 1700); c.lineTo(CX - 520, 1700); c.closePath(); c.fill(); c.restore();
  marquee(t, col(P.cr, 0.05), t0);
  c.save(); c.globalAlpha = 0.3; c.fillStyle = P.cr; c.filter = 'blur(30px)'; c.beginPath(); c.ellipse(CX, 1690, 470, 60, 0, 0, TAU); c.fill(); c.restore();
  const G = on(SW.g);
  const fall = E.inCubic(prog(t, t0, T.land));
  const land = t > T.land ? spring(t, T.land, 3.2, 0.28) : 0;
  const zk = E.inExpo(prog(t, T.zoom, T.fin));
  const zs = 1.12 + 4.2 * zk;
  const backPrintY = 3.2 - 52 / 50;
  const bob = t > T.land ? 0.1 * Math.sin((t - T.land) * 3.2) : 0;
  const spin = E.outBack(prog(t, T.spin, T.spin + 0.24));
  G.position.set(0, lerp(lerp(14, 0.5, fall) + bob, -backPrintY * zs, zk), 0);
  G.rotation.set(0.05 * Math.sin((t - t0) * 2.1) * (1 - zk), (0.3 * Math.sin((t - t0) * TAU * 0.4) + Math.PI * spin) * (1 - zk) + Math.PI * zk, 0.04 * Math.sin((t - t0) * 2.7) * (1 - zk));
  const sq = t > T.land ? 0.1 * (1 - land) : 0;
  G.scale.set(zs * (1 + sq * 0.5), zs * (1 - sq), zs);
  shards(t, 'orbit', 0, 0, 0.6, clamp(prog(t, t0 + 0.1, t0 + 0.4)) * (1 - zk));
  slapSticker(t, STK.front, T.front, 290, 1585, -0.07);
  slapSticker(t, STK.back, T.back, 790, 1600, 0.06);
  slapSticker(t, STK.tag2, T.stamp, 815, 330, -0.16, -0.3, 0.68);
  wall.position.z = -2.4; wall.material.opacity = 0.0;
  key.position.set(-3, 12, 14);
  // snow puff on landing
  if (t >= T.land && t < T.land + 0.6) { const k = prog(t, T.land, T.land + 0.6); for (let i = 0; i < 40; i++) { const a = hash(i) * Math.PI, v = 300 + 700 * hash(i + 9); c.fillStyle = col(P.cr, 0.7 * (1 - k)); c.beginPath(); c.arc(CX + Math.cos(a) * v * E.outCubic(k) * (i % 2 ? 1 : -1), 1690 - Math.sin(a) * v * 0.3 * E.outCubic(k), 3 + 3 * hash(i + 3), 0, TAU); c.fill(); } }
  snow(c, t, 0.45, P.cr, 1);
  return () => hud(t, P.cr, 1 - zk);
}

// 8.40–10.00  FINALE
function shotFin(t) {
  const c = ctx, t0 = T.fin;
  bgGreen(c); marquee(t, col(P.cr, 0.06), t0); snow(c, t, 0.55, P.cr, 0.7);
  const L = on(LOGO); L.userData.mesh.material = MAT_LOGO;
  const k = E.outExpo(prog(t, t0, t0 + 0.45));
  L.scale.setScalar(lerp(1.7, 1.0, k));
  L.position.set(0, Y(880), 0);
  L.rotation.set(0.1 * Math.sin((t - t0) * 2.2) - 0.25 * (1 - k), -0.25 * Math.sin((t - t0) * 1.6 + 0.3) * (0.4 + 0.6 * k), 0);
  shards(t, 'orbit', 0, 0, Y(880) + 0.4, E.outCubic(prog(t, t0 + 0.1, t0 + 0.6)) * 0.85);
  slapSticker(t, STK.badge2, T.badge, 860, 1400, 0.2, -0.3, 0.55);
  wall.position.z = -0.8; wall.material.opacity = 0.0;
  key.position.set(lerp(-9, 7, prog(t, t0, DUR)), 6, 16);
  return () => {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const rk = E.outExpo(prog(t, t0 + 0.2, t0 + 0.5));
    c.fillStyle = P.cr; c.fillRect(CX - 260 * rk, 1020, 520 * rk, 6);
    gustWord(t, t0 + 0.3, 'cold minded.', CX, 1170, 100, P.cr, { stag: 0.02 });
    c.font = MONO(700, 26); c.letterSpacing = '8px'; c.fillStyle = col(P.cr, 0.6);
    c.fillText(scramble('SOUL OF THE NORTH', prog(t, t0 + 0.25, t0 + 0.6), Math.floor(t * 40)), CX, 640);
    const hk = E.outCubic(prog(t, t0 + 0.55, t0 + 0.85));
    c.globalAlpha = hk;
    c.font = IT(800, 52); c.letterSpacing = '1px'; c.fillStyle = P.cr; c.fillText('@soultustik', CX, 1640 + 24 * (1 - hk));
    c.font = IT(500, 34); c.fillStyle = col(P.cr, 0.7); c.fillText('северная душа · Костанай', CX, 1696 + 24 * (1 - hk));
    c.globalAlpha = 1;
    const ck = E.outBack(prog(t, t0 + 0.45, t0 + 0.75));
    if (ck > 0) {
      c.save(); c.translate(CX - 0, 1400); c.translate(-250, 0); c.scale(ck, ck);
      c.strokeStyle = P.cr; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.stroke();
      c.rotate(0.7 * Math.exp(-(t - t0 - 0.45) * 5) * Math.cos((t - t0) * 20));
      c.fillStyle = P.cr; c.beginPath(); c.moveTo(0, -38); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0, 38); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); c.stroke();
      c.font = ITI(900, 26); c.textAlign = 'center'; c.fillText('N', 0, -60);
      c.restore();
    }
    c.restore();
    hud(t, P.cr, prog(t, t0 + 0.6, t0 + 0.9));
  };
}

const SHOTS = [[0, shotNorth], [T.N, shotN], [T.soul, shotWords], [T.map, shotMap], [T.drop, shotDrop], [T.garm, shotGarm], [T.fin, shotFin]];

// ---------------------------------------------------------------- frame
const HITS = [[T.settle, 6, 0.12], [T.N, 14, 0.12], [T.N2, 10, 0.1], [T.soul, 12, 0.12], [T.solt, 12, 0.12], [T.logo, 14, 0.15], [T.drop, 34, 0.42], [T.s1, 9, 0.16], [T.s2, 9, 0.16], [T.s3, 9, 0.16], [T.land, 18, 0.22], [T.front, 7, 0.14], [T.spin, 8, 0.2], [T.back, 7, 0.14], [T.stamp, 7, 0.14], [T.fin, 18, 0.3], [T.badge, 6, 0.15]];
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
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.setLineDash([]);
  resetFrame();
  let idx = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) idx = i;
  const f = Math.floor(t * FPS);
  const sh = shakeAt(t);
  const weave = [(hash(f * 0.37) - 0.5) * 1.6, (hash(f * 0.61 + 4) - 0.5) * 1.6];
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
function zoomBlur(amt, cy = CY) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= 7; i++) { const s = 1 + amt * i / 7; ctx.globalAlpha = 0.45 / i; ctx.drawImage(tmp, CX - CX * s, cy - cy * s, W * s, H * s); }
  ctx.globalAlpha = 1;
}
function post(t, idx) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  // vertical whip into the spotlight
  if (t > T.garm - 0.1 && t < T.garm + 0.14) {
    const p = t < T.garm ? E.inExpo(prog(t, T.garm - 0.1, T.garm)) : 1 - E.outExpo(prog(t, T.garm, T.garm + 0.14));
    tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
    c.fillStyle = t < T.garm ? '#E4E1D2' : P.blk; c.fillRect(0, 0, W, H);
    c.drawImage(tmp, 0, (t < T.garm ? -1 : 1) * H * 0.6 * p);
    dirBlur(0, 220 * p);
  }
  // horizontal whip on the spin
  if (t > T.spin && t < T.spin + 0.2) dirBlur(160 * Math.sin(Math.PI * prog(t, T.spin, T.spin + 0.2)), 0);
  if (t > 0.98 && t < T.N) zoomBlur(0.3 * E.inExpo(prog(t, 0.98, T.N)), 700);
  if (t > T.zoom + 0.08 && t < T.fin) zoomBlur(0.3 * E.inExpo(prog(t, T.zoom + 0.08, T.fin)));
  if (t >= T.fin && t < T.fin + 0.25) zoomBlur(0.25 * (1 - E.outCubic(prog(t, T.fin, T.fin + 0.25))));
  if (t > STUT[0] && t < T.gap) zoomBlur(0.1 * prog(t, STUT[0], T.gap));
  // one inverted frame on every hard cut (and a stutter before the drop)
  for (const tc of [T.N, T.N2, T.soul, T.solt, T.logo, T.map, ...STUT]) if (t >= tc && t < tc + 1 / FPS) { c.globalCompositeOperation = 'difference'; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
  let fl = 0;
  if (t >= T.drop && t < T.drop + 0.12) fl = 0.7 * Math.pow(1 - prog(t, T.drop, T.drop + 0.12), 2);
  if (t >= T.logo && t < T.logo + 0.1) fl = 0.4 * (1 - prog(t, T.logo, T.logo + 0.1));
  if (t >= T.land && t < T.land + 0.1) fl = Math.max(fl, 0.25 * (1 - prog(t, T.land, T.land + 0.1)));
  if (t >= T.fin && t < T.fin + 0.16) fl = Math.max(fl, 0.5 * (1 - prog(t, T.fin, T.fin + 0.16)));
  if (fl > 0) { c.fillStyle = `rgba(235,248,248,${fl})`; c.fillRect(0, 0, W, H); }
  const f = Math.floor(t * FPS);
  const fk = (hash(f * 0.913) - 0.5) * 0.04;
  if (fk > 0) { c.fillStyle = `rgba(255,255,255,${fk * 0.6})`; c.fillRect(0, 0, W, H); } else { c.fillStyle = `rgba(0,0,0,${-fk})`; c.fillRect(0, 0, W, H); }
  const light = SHOTS[idx][1] === shotDrop || (SHOTS[idx][1] === shotWords && t < T.solt) || (SHOTS[idx][1] === shotN && t < T.N2);
  const vg = c.createRadialGradient(CX, CY, 520, CX, CY, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, light ? 'rgba(20,40,36,0.16)' : 'rgba(0,12,10,0.42)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.09;
  const ox = -Math.floor(hash(f) * 512), oy = -Math.floor(hash(f + 0.5) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) c.drawImage(grains[f % 4], x, y);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  const k = 1 - prog(t, 0, 0.06);
  if (k > 0) { c.fillStyle = `rgba(0,0,0,${k})`; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet
function buildEvents() {
  ev(0, 'wind', { end: DUR });
  ev(0.02, 'ringIn');
  for (let i = 0; i < 4; i++) ev(i * 0.15, 'bell', { i });
  ev(0.02, 'needle', { end: T.settle }); ev(T.settle, 'north');
  ev(0.95, 'dive', { end: T.N });
  ev(T.N, 'Nhit', { i: 0 }); ev(T.N2, 'Nhit', { i: 1 });
  ev(T.soul, 'soul'); ev(T.solt, 'solt'); ev(T.logo - 0.25, 'merge', { end: T.logo }); ev(T.logo, 'logo2d');
  ev(T.map, 'draw', { end: T.map + 0.35 });
  PIN_T.forEach((tp, i) => ev(tp, 'pin', { i }));
  for (let tt = T.map; tt < T.gap - 0.02; tt += 1 / 20) ev(tt, 'tempTick');
  ev(T.map, 'riser', { end: T.gap }); ev(4.35, 'frost', { end: T.gap });
  STUT.forEach((ts, i) => ev(ts, 'stut', { i }));
  ev(T.gap, 'gap');
  ev(T.drop, 'drop');
  ev(T.s1, 'slap', { pan: 0 }); ev(T.s2, 'slap', { pan: -0.35 }); ev(T.s3, 'slap', { pan: 0.35 });
  ev(T.garm - 0.1, 'whip');
  ev(T.garm, 'garmFall', { end: T.land }); ev(T.land, 'land');
  ev(T.front, 'slap', { pan: -0.3 });
  ev(T.spin, 'spin');
  ev(T.back, 'slap', { pan: 0.3 }); ev(T.stamp, 'slap', { pan: 0.4 });
  ev(T.zoom, 'zoom', { end: T.fin });
  ev(T.fin, 'final');
  ev(T.fin + 0.45, 'compass');
  ev(T.badge, 'slap', { pan: 0.4, g: 0.6 });
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function loadImg(svg) { const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); const im = new Image(); im.src = url; await im.decode(); return im; }
async function boot() {
  const faces = [
    ['Inter Tight', '/fonts/InterTight-Medium.ttf', '500', 'normal'],
    ['Inter Tight', '/fonts/InterTight-ExtraBold.ttf', '800', 'normal'],
    ['Inter Tight', '/fonts/InterTight-Black.ttf', '900', 'normal'],
    ['Inter Tight', '/fonts/InterTight-ExtraBoldItalic.ttf', '800', 'italic'],
    ['Inter Tight', '/fonts/InterTight-BlackItalic.ttf', '900', 'italic'],
    ['JB Mono', '/fonts/JetBrainsMono-Medium.ttf', '500', 'normal'],
    ['JB Mono', '/fonts/JetBrainsMono-Bold.ttf', '700', 'normal'],
  ];
  for (const [fam, url, wt, st] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt, style: st }); await f.load(); document.fonts.add(f); }
  const svg = await (await fetch('/assets/soultustik_logo.svg')).text();
  const tint = c => svg.replace(/fill="white"/g, `fill="${c}"`).replace(/width="\d+" height="\d+"/, 'width="3938" height="622"');
  IMG.logoC = await loadImg(tint(P.cr));
  IMG.logoG = await loadImg(tint(P.g));
  buildLogo(svg);
  buildSweat();
  buildStickers();
  buildShards();
  for (let k = 0; k < 4; k++) {
    const cv = mk(512, 512), gc = cv.getContext('2d'), id = gc.createImageData(512, 512), r = rng(50 + k);
    for (let i = 0; i < id.data.length; i += 4) { const vv = 128 + (r() + r() - 1) * 100; id.data[i] = id.data[i + 1] = id.data[i + 2] = vv; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); grains.push(cv);
  }
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
