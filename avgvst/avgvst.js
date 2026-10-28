// august (@avgvst.kz) — «QYZYL JIP / Красная нить». 16.5 s vertical clip (1080×1920, 60 fps).
// Harper's Bazaar KZ on the brand: «national motifs run through innovative, utilitarian looks like a
// thin red thread; inspired by the nature and history of Kazakhstan, read through deconstruction,
// asymmetry and unisex». So one red thread is the hero: it draws the steppe, pecks a Tamgaly
// petroglyph, turns the argali's horn into the qoshqar-muiz ornament, stitches a deconstructed
// lurex-denim vest (3D) with bronze ornament plates and rings, builds the two-piece, dresses two
// silhouettes, leads to the real garment from their shoot, flies out of Almaty worldwide and
// sews the «august» logo. Every frame is f(t).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2;
export const DUR = 18.0;
const T = { pro: 0, hist: 2, dec: 4, eki: 8, uni: 10, real: 12, fin: 14 };
const C = { beige: '#F3E1D2', brown: '#5A2E1E', red: '#B3202A', red2: '#D8383F', indigo: '#16202E', denim: '#2B3F5C', bronze: '#B08A4E', rust: '#9E4A28', rock: '#7E4026', ochre: '#E7C9A0' };

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
  outBack: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const spring = (t, t0, f = 3.0, z = 0.3) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * TAU * f * a) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * a); };
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const FR = (w, s, it = false) => `${it ? 'italic ' : ''}${w} ${s}px "Fraunces"`;
const UB = (w, s) => `${w} ${s}px "Unbounded"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const lay = mk(W, H), lctx = lay.getContext('2d');

// ---------------------------------------------------------------- polylines (everything the thread draws)
function poly(pts) {             // [[x,y]…] with cumulative length
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1] };
}
function arcPts(cx, cy, r, a0, a1, n = 48) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function smooth(pts, n = 8) {     // Catmull-Rom through control points
  const o = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  o.push(pts[pts.length - 1]); return o;
}
// draw the first `len` px of a polyline as a red thread; returns the tip and its direction
function thread(c, P, len, o = {}) {
  len = clamp(len, 0, P.len);
  let i = 1; while (i < P.L.length - 1 && P.L[i] < len) i++;
  const k = (len - P.L[i - 1]) / Math.max(1e-6, P.L[i] - P.L[i - 1]);
  const tip = [lerp(P.pts[i - 1][0], P.pts[i][0], k), lerp(P.pts[i - 1][1], P.pts[i][1], k)];
  const ang = Math.atan2(P.pts[i][1] - P.pts[i - 1][1], P.pts[i][0] - P.pts[i - 1][0]);
  if (len <= 0) return { tip: P.pts[0], ang };
  const path = () => { c.beginPath(); c.moveTo(P.pts[0][0], P.pts[0][1]); for (let j = 1; j < i; j++) c.lineTo(P.pts[j][0], P.pts[j][1]); c.lineTo(tip[0], tip[1]); };
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (o.shadow !== false) { c.translate(3, 5); path(); c.strokeStyle = 'rgba(40,10,5,0.22)'; c.lineWidth = (o.w || 6) + 2; c.stroke(); c.translate(-3, -5); }
  path(); c.strokeStyle = o.color || C.red; c.lineWidth = o.w || 6; c.stroke();
  path(); c.strokeStyle = 'rgba(255,170,160,0.45)'; c.lineWidth = (o.w || 6) * 0.28; c.setLineDash([5, 7]); c.stroke(); c.setLineDash([]);   // the twist of the thread
  c.restore();
  return { tip, ang };
}
function needle(c, x, y, ang, s = 1, a = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); c.globalAlpha = a;
  c.fillStyle = 'rgba(30,10,5,0.2)'; c.beginPath(); c.moveTo(6, 8); c.lineTo(-250, 2); c.lineTo(-250, 18); c.closePath(); c.fill();
  const g = c.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#f4f4f6'); g.addColorStop(0.45, '#9c9ca6'); g.addColorStop(1, '#4b4b55');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, -5); c.lineTo(-255, -6.5); c.arc(-255, 0, 6.5, -Math.PI / 2, Math.PI / 2, true); c.lineTo(-30, 5); c.closePath(); c.fill();
  c.fillStyle = '#2a1a14'; c.beginPath(); c.ellipse(-236, 0, 13, 2.6, 0, 0, TAU); c.fill();          // the eye
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-40, -3); c.lineTo(-220, -4); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- the qoshqar-muiz (ram's horn) ornament, unit space, y up
function horn(sx = 1, sy = 1) {
  const o = [];
  for (let i = 0; i <= 12; i++) o.push([0, -0.12 + 0.48 * i / 12]);      // stem
  const cx = 0.40, cy = 0.40;
  for (let i = 0; i <= 90; i++) {                                        // spiral, clockwise and inward
    const k = i / 90, a = Math.PI - k * 2.25 * Math.PI, r = 0.40 - 0.29 * k;
    o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return o.map(([x, y]) => [x * sx, y * sy]);
}
const ORN = [horn(1, 1), horn(-1, 1), horn(1, -1), horn(-1, -1)];        // four horns: the classic motif
function drawOrnament(c, cx, cy, s, o = {}) {
  c.save(); c.translate(cx, cy); c.scale(s, -s); c.lineCap = 'round'; c.lineJoin = 'round';
  const k = o.k ?? 1;
  ORN.forEach((h, j) => {
    const n = Math.max(2, Math.floor(h.length * k));
    c.beginPath(); c.moveTo(h[0][0], h[0][1]); for (let i = 1; i < n; i++) c.lineTo(h[i][0], h[i][1]);
    if (o.shadow) { c.save(); c.translate(0.02, -0.03); c.strokeStyle = 'rgba(20,8,4,0.35)'; c.lineWidth = o.w; c.stroke(); c.restore(); }
    c.strokeStyle = o.color; c.lineWidth = o.w; c.stroke();
    if (o.hi) { c.strokeStyle = o.hi; c.lineWidth = o.w * 0.3; c.stroke(); }
  });
  if (o.diamond) { c.fillStyle = o.color; c.beginPath(); c.moveTo(0, -0.2); c.lineTo(0.12, 0); c.lineTo(0, 0.2); c.lineTo(-0.12, 0); c.closePath(); c.fill(); }
  c.restore();
}
function ornamentClip(c, cx, cy, s) {      // the ornament as a fat mask (for the photo window)
  c.save(); c.translate(cx, cy); c.scale(s, -s); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 0.34;
  ORN.forEach(h => { c.beginPath(); c.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) c.lineTo(h[i][0], h[i][1]); c.stroke(); });
  c.beginPath(); c.arc(0, 0, 0.42, 0, TAU); c.fill(); c.restore();
}

// ---------------------------------------------------------------- 3D studio
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.1;
R3.outputColorSpace = THREE.SRGBColorSpace; R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight('#fff4e6', '#30221a', 0.7); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff1dc', 2.6); key.position.set(-6, 8, 10); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 10; Object.assign(key.shadow.camera, { left: -10, right: 10, top: 12, bottom: -12, near: 1, far: 60 }); key.shadow.bias = -0.0005;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight('#b9c9ff', 1.8); rim.position.set(7, 3, -6); scene.add(rim);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), new THREE.ShadowMaterial({ opacity: 0.32 })); wall.position.z = -3.2; wall.receiveShadow = true; scene.add(wall);
const texOf = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const sh = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

// lurex denim with a raw (frayed) edge, one texture per panel so the edge follows the cut
function denimMaps(shapePts, box, seed) {
  const S = 1024, [x0, y0, x1, y1] = box, u = x => (x - x0) / (x1 - x0) * S, v = y => (1 - (y - y0) / (y1 - y0)) * S;
  const cm = mk(S, S), c = cm.getContext('2d'), mm = mk(S, S), m = mm.getContext('2d'), rm = mk(S, S), r = rm.getContext('2d');
  c.fillStyle = '#1C2A44'; c.fillRect(0, 0, S, S);
  for (let i = -S; i < S * 2; i += 6) { c.strokeStyle = (i / 6) % 2 ? 'rgba(160,185,220,0.10)' : 'rgba(10,18,35,0.18)'; c.lineWidth = 3; c.beginPath(); c.moveTo(i, 0); c.lineTo(i + S * 0.6, S); c.stroke(); }   // twill
  for (let i = 0; i < 1500; i++) { const x = hash(i * 1.3 + seed) * S, y = hash(i * 2.9 + seed) * S; c.fillStyle = `rgba(${210 + 30 * hash(i)},${180 + 30 * hash(i * 3)},${110 + 40 * hash(i * 5)},${0.3 + 0.45 * hash(i * 7)})`; c.fillRect(x, y, 2, 1.4); }   // lurex threads
  m.fillStyle = '#000'; m.fillRect(0, 0, S, S); r.fillStyle = '#d0d0d0'; r.fillRect(0, 0, S, S);
  for (let i = 0; i < 1500; i++) { const x = hash(i * 1.3 + seed) * S, y = hash(i * 2.9 + seed) * S; m.fillStyle = '#fff'; m.fillRect(x, y, 2, 1.4); r.fillStyle = '#303030'; r.fillRect(x, y, 2, 1.4); }
  // raw edge: a lighter band and loose threads along the outline
  const path = ctx2 => { ctx2.beginPath(); shapePts.forEach(([x, y], i) => i ? ctx2.lineTo(u(x), v(y)) : ctx2.moveTo(u(x), v(y))); ctx2.closePath(); };
  c.save(); path(c); c.clip(); c.strokeStyle = 'rgba(120,150,190,0.35)'; c.lineWidth = 30; path(c); c.stroke(); c.strokeStyle = 'rgba(200,215,235,0.35)'; c.lineWidth = 8; path(c); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(205,218,238,0.6)'; c.lineWidth = 1.4;
  for (let i = 0; i < shapePts.length; i++) {
    const [ax, ay] = shapePts[i], [bx, by] = shapePts[(i + 1) % shapePts.length], len = Math.hypot(u(bx) - u(ax), v(by) - v(ay)), n = Math.floor(len / 5);
    for (let j = 0; j < n; j++) { const k = j / n, px = lerp(u(ax), u(bx), k), py = lerp(v(ay), v(by), k), a = Math.atan2(v(by) - v(ay), u(bx) - u(ax)) + Math.PI / 2 + (hash(i * 31 + j) - 0.5) * 0.8, l = 6 + 16 * hash(i * 17 + j); c.beginPath(); c.moveTo(px - Math.cos(a) * 4, py - Math.sin(a) * 4); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke(); }
  }
  return { map: texOf(cm), metal: new THREE.CanvasTexture(mm), rough: new THREE.CanvasTexture(rm) };
}
// a garment panel: extruded cut, bent around the body (front: edges fall back; back: edges come forward)
function panel(pts, o) {
  const shape = new THREE.Shape(); pts.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 8, steps: 1 });
  const box = [-2.6, -4.6, 2.6, 2.8], p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - box[0]) / (box[2] - box[0]), (p.getY(i) - box[1]) / (box[3] - box[1]));
  // subdivide is not needed for a gentle bend: tessellate by re-sampling with ExtrudeGeometry's own steps is coarse, so bend per-vertex
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i) - 0.025, a = x / o.R;
    p.setXYZ(i, o.R * Math.sin(a), y, o.side * (o.D * Math.cos(a)) + z + (o.wave || 0) * Math.sin(y * 2.2 + x));
  }
  g.computeVertexNormals();
  const tx = denimMaps(pts, box, o.seed || 1);
  const mat = new THREE.MeshPhysicalMaterial({ map: tx.map, metalnessMap: tx.metal, roughnessMap: tx.rough, metalness: 1, roughness: 1, sheen: 0.18, sheenColor: '#5a73a0', sheenRoughness: 0.55, specularIntensity: 0.25, envMapIntensity: 0.45, side: THREE.DoubleSide });
  return new THREE.Mesh(g, mat);
}
// tessellated outline helper so the bend reads smoothly
function dense(pts, step = 0.12) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let j = 0; j < n; j++) o.push([lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n)]); } return o; }
const armhole = (sx) => smooth([[2.1 * sx, 0.9], [1.95 * sx, 1.5], [1.7 * sx, 2.0], [1.45 * sx, 2.3]], 6).slice(1, -1);
const VEST = {
  back: dense([[-2.1, -2.6], [2.1, -2.6], [2.1, 0.9], ...armhole(1), [1.45, 2.3], [0.6, 2.5], [0.3, 2.38], [0, 2.34], [-0.3, 2.38], [-0.6, 2.5], [-1.45, 2.3], ...armhole(-1).reverse(), [-2.1, 0.9]]),
  frontL: dense([[-0.06, -2.25], [-2.1, -2.6], [-2.1, 0.9], ...armhole(-1), [-1.45, 2.3], [-0.6, 2.5], [-0.06, 0.15]]).reverse(),
  frontR: dense([[0.06, 0.15], [0.6, 2.5], [1.45, 2.3], ...armhole(1).reverse(), [2.1, 0.9], [2.1, -3.0], [0.06, -3.55]]).reverse(),    // asymmetric: the right front hangs longer, cut on the bias
};
const BODY = { R: 2.05, D: 1.0 };
function surf(x, y, side = 1, lift = 0.07) {   // a point on the bent front/back surface + outward normal angle
  const a = x / BODY.R; return { p: new THREE.Vector3(BODY.R * Math.sin(a), y, side * (BODY.D * Math.cos(a) + lift)), a };
}
const bronzeM = () => new THREE.MeshStandardMaterial({ color: C.bronze, metalness: 1, roughness: 0.32, envMapIntensity: 1.3 });
const patinaM = () => new THREE.MeshStandardMaterial({ color: '#5E4527', metalness: 0.9, roughness: 0.55, envMapIntensity: 1.0 });
function plate3D(size = 0.5, kind = 0) {    // bronze plate: scalloped kite/triangle + qoshqar-muiz relief + little loops
  const g = new THREE.Group(), s = new THREE.Shape(), pts = kind ? [[0, 1], [0.9, 0], [0, -1], [-0.9, 0]] : [[-1, 0.55], [1, 0.55], [0, -0.85]];
  const sc = []; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; for (let j = 0; j < 5; j++) { const k = j / 5, mx = lerp(p[0], q[0], k), my = lerp(p[1], q[1], k); sc.push([mx, my]); } });
  sc.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath();
  const base = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 3 }), bronzeM());
  g.add(base);
  const rel = 0.34;
  ORN.forEach(h => {
    const curve = new THREE.CatmullRomCurve3(h.filter((_, i) => i % 3 === 0).map(([x, y]) => new THREE.Vector3(x * rel, y * rel * (kind ? 1.3 : 0.9) + (kind ? 0 : 0.05), 0.15)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.045, 8, false), patinaM()));
  });
  const edge = kind ? pts : [[-1, 0.55], [1, 0.55]];
  for (let i = 0; i < (kind ? 4 : 5); i++) {      // loops along the edge like on their plates
    const p = kind ? pts[i] : [lerp(-0.85, 0.85, i / 4), 0.62];
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20), bronzeM()); ring.position.set(p[0] * 1.02, p[1] * 1.02, 0.06); g.add(ring);
  }
  g.scale.setScalar(size); return sh(g);
}
function ring3D(r = 0.16) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 16, 40), bronzeM()); return sh(m); }
function tube(points, r = 0.03, color = C.red) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(32, points.length * 6), r, 8, false);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, emissive: '#3a0306' }));
  m.userData.total = g.index.count; g.setDrawRange(0, 0); return sh(m);
}
function grow(m, k) { m.geometry.setDrawRange(0, Math.floor(m.userData.total * clamp(k) / 6) * 6); }
// one vest = back + two asymmetric fronts + plates + rings + red lacing and shoulder stitches
function buildVest(seed) {
  const V = new THREE.Group();
  const back = panel(VEST.back, { R: BODY.R, D: BODY.D, side: -1, seed }), fL = panel(VEST.frontL, { R: BODY.R, D: BODY.D, side: 1, seed: seed + 1 }), fR = panel(VEST.frontR, { R: BODY.R, D: BODY.D, side: 1, seed: seed + 2, wave: 0.03 });
  [back, fL, fR].forEach(m => { const g = new THREE.Group(); g.add(m); V.add(sh(g)); });
  const parts = { back: V.children[0], fL: V.children[1], fR: V.children[2] };
  const plates = [[-1.2, 0.35, 0.36, 0], [-0.95, -1.35, 0.3, 1], [1.05, -0.25, 0.34, 1], [1.35, -1.85, 0.3, 0], [0.75, -2.7, 0.26, 0]].map(([x, y, s, k], i) => {
    const P = plate3D(s, k), q = surf(x, y, 1, 0.1); P.position.copy(q.p); P.rotation.y = q.a; P.rotation.z = (hash(i + seed) - 0.5) * 0.5; V.add(P); return P;
  });
  const hero = plate3D(0.7, 1), qh = surf(0, 0.7, -1, 0.1); hero.position.copy(qh.p); hero.rotation.y = Math.PI; V.add(hero);
  const ringsY = [-0.35, -1.05, -1.75];
  const rings = []; ringsY.forEach(y => [-1, 1].forEach(sd => { const R = ring3D(), q = surf(0.42 * sd, y, 1, 0.08); R.position.copy(q.p); R.rotation.y = q.a; V.add(R); rings.push(R); }));
  // lacing: criss-cross through the rings
  const lace = []; ringsY.forEach((y, i) => { const a = surf(-0.42, y, 1, 0.12).p, b = surf(0.42, y, 1, 0.12).p; if (i % 2) lace.push(b, a); else lace.push(a, b); });
  const top = surf(0, 0.15, 1, 0.14).p; lace.unshift(top);
  const laceT = tube(lace.map(v => v.clone()), 0.035); V.add(laceT);
  // shoulder zigzags
  const zz = sd => { const o = []; for (let i = 0; i <= 10; i++) { const x = sd * lerp(0.65, 1.42, i / 10), y = lerp(2.48, 2.32, i / 10) + (i % 2 ? 0.1 : -0.1); const a = x / BODY.R; o.push(new THREE.Vector3(BODY.R * Math.sin(a), y, (i % 2 ? 1 : -1) * 0.9 * Math.cos(a) * 0.15 + 0.05)); } return o; };
  const stL = tube(zz(-1), 0.03), stR = tube(zz(1), 0.03); V.add(stL); V.add(stR);
  return { V, parts, plates, hero, rings, laceT, stL, stR };
}
function buildTrousers(seed) {
  const G = new THREE.Group();
  const leg = sd => dense([[0.04 * sd, 0.0], [2.0 * sd, 0.0], [2.35 * sd, -6.2], [0.45 * sd, -6.2], [0.25 * sd, -1.4], [0.04 * sd, -1.0]]);
  const lL = panel(leg(-1).reverse(), { R: 3.2, D: 0.9, side: 1, seed: seed + 5, wave: 0.05 }), lR = panel(leg(1), { R: 3.2, D: 0.9, side: 1, seed: seed + 6, wave: 0.05 });
  const gL = new THREE.Group(); gL.add(lL); const gR = new THREE.Group(); gR.add(lR); G.add(sh(gL)); G.add(sh(gR));
  const band = []; for (let i = 0; i <= 24; i++) { const x = lerp(-2.0, 2.0, i / 24), a = x / 3.2; band.push(new THREE.Vector3(3.2 * Math.sin(a), -0.18 + (i % 2 ? 0.1 : -0.06), 0.9 * Math.cos(a) + 0.12)); }
  const bandT = tube(band, 0.03); G.add(bandT);
  const pl = plate3D(0.3, 0), q = surf(-1.3, -0.7, 1, 0.12); pl.position.set(q.p.x * 1.2, -1.0, 0.95); G.add(pl);
  return { G, gL, gR, bandT, pl };
}
let VA, VB, TR, HERO;
const show = (o, v = true) => { o.visible = v; return o; };

// ---------------------------------------------------------------- 2D helpers
function paper(c, base = C.beige) {
  c.fillStyle = base; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.06; c.drawImage(GRAIN[0], 0, 0, W, H); c.globalAlpha = 1;
  const g = c.createRadialGradient(CX, 900, 400, CX, 900, 1300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,46,30,0.18)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function serif(c, txt, t, t0, x, y, size, color, o = {}) {
  if (t < t0) return;
  c.save(); c.font = FR(o.w || 500, size, o.it); c.letterSpacing = (o.ls || 0) + 'px'; c.textBaseline = 'alphabetic';
  const ws = [...txt].map(ch => c.measureText(ch).width + (o.ls || 0)); const tw = ws.reduce((a, b) => a + b, 0) - (o.ls || 0);
  let px = o.align === 'left' ? x : x - tw / 2;
  const outT = o.out ?? 1e9, ko = 1 - prog(t, outT, outT + 0.25);
  for (let i = 0; i < txt.length; i++) {
    const k = prog(t, t0 + i * (o.stag ?? 0.03), t0 + i * (o.stag ?? 0.03) + 0.4), e = E.outCubic(k);
    if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.blur ?? 18; c.shadowOffsetY = 3; }
    c.globalAlpha = k * ko; c.fillStyle = color; c.fillText(txt[i], px, y + (o.dy ?? 30) * (1 - e)); px += ws[i];
  }
  c.restore();
}
function label(c, txt, t, t0, x, y, size, color, ls = 10, shadow = null, wt = 400) {
  if (t < t0) return;
  const k = E.outCubic(prog(t, t0, t0 + 0.4));
  c.save(); c.font = UB(wt, size); c.letterSpacing = ls + 'px'; c.fillStyle = color; c.globalAlpha = k; c.textAlign = 'center';
  if (shadow) { c.shadowColor = shadow; c.shadowBlur = 14; c.shadowOffsetY = 2; }
  c.fillText(txt, x + ls / 2, y + 16 * (1 - k)); c.restore();
}
function render3D(c) { R3.render(scene, cam); c.drawImage(R3.domElement, 0, 0); }
function reset3D() {
  scene.traverse(o => { if (o.userData.top) o.visible = false; });
  cam.position.set(0, 0, CAMZ); cam.lookAt(0, 0, 0); cam.fov = 30; cam.updateProjectionMatrix();
  wall.material.opacity = 0.32;
}

// ---------------------------------------------------------------- 0–2 · the needle draws the steppe, the Alatau and the sun
const P0 = poly(smooth([[-40, 1260], [120, 1258], [210, 1240], [300, 1080], [360, 1150], [440, 1000], [520, 1110], [600, 940], [680, 1080], [760, 1160], [850, 1050], [930, 1200], [1010, 1250]], 10).concat(arcPts(760, 700, 92, Math.PI * 0.5, Math.PI * 0.5 + TAU, 80).map(([x, y]) => [x, y])));
const P0join = P0;   // (the jump to the sun is part of the same thread)
function shotPro(c, t) {
  paper(c);
  // the sun's warm disc fills once the thread closes it
  const sunK = prog(t, 1.45, 1.75); if (sunK > 0) { c.fillStyle = col('#E9B27A', 0.55 * sunK); c.beginPath(); c.arc(760, 700, 88, 0, TAU); c.fill(); }
  const L = P0.len * E.inOutCubic(prog(t, 0.12, 1.7));
  const r = thread(c, P0, L, { w: 6 });
  if (t < 1.85) needle(c, r.tip[0], r.tip[1], r.ang, 1, 1 - prog(t, 1.7, 1.85));
  serif(c, 'qyzyl jip', t, 0.55, CX, 1520, 120, C.brown, { it: true, w: 500 });
  label(c, 'RED THREAD', t, 0.95, CX, 1610, 30, col(C.brown, 0.7), 14);
}

// ---------------------------------------------------------------- 2–4 · tarih: Tamgaly petroglyphs pecked into rock, the horn becomes the ornament
function rockTex() {
  const cv = mk(540, 960), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 540, 960); g.addColorStop(0, '#93512F'); g.addColorStop(0.5, '#6E3520'); g.addColorStop(1, '#4A2215'); c.fillStyle = g; c.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 9000; i++) { const x = hash(i * 1.7) * 540, y = hash(i * 3.1) * 960, v = hash(i * 5.3); c.fillStyle = v > 0.5 ? `rgba(255,215,170,${0.05 * v})` : `rgba(20,5,0,${0.12 * v})`; c.fillRect(x, y, 1 + 2 * hash(i), 1 + 2 * hash(i * 2)); }
  c.strokeStyle = 'rgba(25,8,2,0.35)'; c.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) { let x = hash(i * 9) * 540, y = hash(i * 11) * 960; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 12; j++) { x += (hash(i * 50 + j) - 0.5) * 60; y += 20 + hash(i * 70 + j) * 40; c.lineTo(x, y); } c.stroke(); }
  return cv;
}
const SUNMAN = (() => {
  const o = [];   // strokes, figure space (origin at the waist), canvas y-down
  o.push(arcPts(0, -230, 52, 0, TAU, 40));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; o.push([[Math.cos(a) * 66, -230 + Math.sin(a) * 66], [Math.cos(a) * 104, -230 + Math.sin(a) * 104]]); }
  o.push([[0, -176], [0, 70]]);
  o.push([[0, -110], [-80, -80], [-95, -150]]); o.push([[0, -110], [80, -80], [95, -150]]);
  o.push([[0, 70], [-60, 140], [-45, 210]]); o.push([[0, 70], [60, 140], [45, 210]]);
  o.push([[-14, -238], [-14, -232]]); o.push([[14, -238], [14, -232]]); o.push([[0, -214], [0, -208]]);
  return o;
})();
const ARGALI_HORN = (() => { const o = []; for (let i = 0; i <= 80; i++) { const k = i / 80, a = -0.15 - k * 1.85 * Math.PI, r = 62 - 46 * k; o.push([118 + Math.cos(a) * r * 1.15, -96 + Math.sin(a) * r]); } return o; })();
const ARGALI = (() => {
  const o = [], e = [];
  for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; e.push([-20 + Math.cos(a) * 128, 18 + Math.sin(a) * 36]); }
  o.push(e);
  o.push([[-112, 44], [-128, 104], [-122, 142]]); o.push([[-78, 52], [-70, 100], [-78, 142]]); o.push([[58, 52], [52, 100], [60, 142]]); o.push([[92, 44], [108, 100], [104, 142]]);
  o.push(smooth([[96, 0], [128, -30], [150, -62]], 5)); o.push(smooth([[140, -66], [172, -80], [196, -66], [186, -52], [150, -50]], 5));
  o.push([[-146, 6], [-166, -14]]);
  o.push(ARGALI_HORN);
  return o;
})();
function pecked(c, strokes, x0, y0, s, k, seed, color) {      // dots along strokes, appearing in order
  const total = strokes.reduce((a, st) => a + poly(st).len, 0); let acc = 0;
  c.fillStyle = color;
  strokes.forEach((st, si) => {
    const P = poly(st);
    for (let d = 0; d < P.len; d += 7) {
      if ((acc + d) / total > k) return;
      let i = 1; while (i < P.L.length - 1 && P.L[i] < d) i++;
      const f = (d - P.L[i - 1]) / Math.max(1e-6, P.L[i] - P.L[i - 1]), px = lerp(P.pts[i - 1][0], P.pts[i][0], f), py = lerp(P.pts[i - 1][1], P.pts[i][1], f);
      const j = hash(si * 997 + d + seed);
      c.beginPath(); c.arc(x0 + (px + (j - 0.5) * 6) * s, y0 + (py + (hash(j * 13) - 0.5) * 6) * s, (3.2 + 2.2 * hash(j * 7)) * s, 0, TAU); c.fill();
    }
    acc += P.len;
  });
}
let ROCK = null;
function shotHist(c, t) {
  const t0 = T.hist;
  c.drawImage(ROCK, 0, 0, W, H);
  const v = c.createRadialGradient(CX, 900, 300, CX, 900, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,6,2,0.55)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  serif(c, 'tarih', t, t0 + 0.15, CX, 300, 140, '#F4DDBA', { it: true, w: 600, shadow: 'rgba(20,6,2,0.7)' });
  label(c, 'TAMGALY · PETROGLYPHS', t, t0 + 0.4, CX, 385, 32, '#F4DDBA', 10, 'rgba(20,6,2,0.85)', 500);
  const k1 = E.outCubic(prog(t, t0 + 0.05, t0 + 0.9)), k2 = E.outCubic(prog(t, t0 + 0.45, t0 + 1.3));
  const fade = 1 - prog(t, t0 + 1.55, t0 + 1.85);
  c.save(); c.globalAlpha = fade;
  pecked(c, SUNMAN, 300, 900, 1.25, k1, 1, 'rgba(240,214,175,0.85)');
  pecked(c, ARGALI, 640, 1360, 1.35, k2, 2, 'rgba(240,214,175,0.85)');
  c.restore();
  // the red thread traces the argali's horn …
  const HP = poly(ARGALI_HORN.map(([x, y]) => [640 + x * 1.35, 1360 + y * 1.35]));
  const hk = E.inOutCubic(prog(t, t0 + 0.9, t0 + 1.35));
  if (hk > 0 && t < t0 + 1.6) { const r = thread(c, HP, HP.len * hk, { w: 7 }); if (hk < 1) needle(c, r.tip[0], r.tip[1], r.ang, 0.7); }
  // … and the horn becomes the qoshqar-muiz: mirrored, gathered to the centre, cast in bronze
  const ok = E.inOutCubic(prog(t, t0 + 1.35, t0 + 1.8)), cast = prog(t, t0 + 1.6, t0 + 1.9);
  if (ok > 0) {
    const cx = lerp(700, CX, ok), cy = lerp(1270, 1000, ok), s = lerp(150, 330, ok) * (1 + 0.35 * E.inExpo(prog(t, t0 + 1.8, T.dec)));
    drawOrnament(c, cx, cy, s, { k: Math.min(1, ok * 1.4), color: cast > 0 ? '#C9A267' : C.red, w: lerp(0.07, 0.12, cast), shadow: true, hi: cast > 0 ? 'rgba(255,240,200,0.6)' : null, diamond: cast > 0.5 });
  }
}

// ---------------------------------------------------------------- 4–8 · deconstruction: the vest is cut, stitched, laced and dressed in bronze
function denimBg(c, t, base = C.indigo) {
  c.fillStyle = base; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.07; c.strokeStyle = '#9fb3d6'; c.lineWidth = 2;
  const off = (t * 40) % 24; for (let i = -H; i < W + H; i += 24) { c.beginPath(); c.moveTo(i + off, 0); c.lineTo(i + off + H * 0.6, H); c.stroke(); }
  c.restore();
  const g = c.createRadialGradient(CX, 900, 200, CX, 900, 1200); g.addColorStop(0, 'rgba(70,95,140,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function bigFragments(c, t, t0, words, color, y0, size) {   // a giant word cut into pieces that drift and lock together
  c.save(); c.font = FR(600, size, true); c.fillStyle = color; c.textBaseline = 'alphabetic';
  words.forEach(([txt, dx, dy, rot], i) => {
    const k = E.inOutCubic(prog(t, t0 + 0.2 + i * 0.12, t0 + 2.6 + i * 0.1));
    c.save(); c.translate(CX + dx * (1 - k) * 1.0, y0 + i * size * 0.92 + dy * (1 - k)); c.rotate(rot * (1 - k)); c.textAlign = 'center'; c.fillText(txt, 0, 0); c.restore();
  });
  c.restore();
}
function shotDec(c, t) {
  const t0 = T.dec, lt = t - t0;
  denimBg(c, t);
  bigFragments(c, t, t0, [['de', -420, -160, -0.5], ['con', 380, 120, 0.4], ['struc', -300, 260, 0.3], ['tion', 420, -120, -0.6]], 'rgba(120,150,200,0.14)', 520, 300);
  reset3D(); const A = VA;
  show(A.V); A.V.position.set(0, -0.25, 0); A.V.scale.setScalar(1.55);
  const spin = E.inOutCubic(prog(t, t0 + 3.2, t0 + 4.0));
  A.V.rotation.set(0.08 * Math.sin(lt * 1.3), TAU * spin + 0.18 * Math.sin(lt * 0.9), 0);
  // pieces fly in on the beats, each from its own side, settling with a spring
  const fly = (g, ti, from, rot) => { const k = spring(t, ti, 1.6, 0.42), e = clamp(k, 0, 1.2); g.visible = t > ti; g.position.set(from[0] * (1 - e), from[1] * (1 - e), from[2] * (1 - e)); g.rotation.set(rot[0] * (1 - e), rot[1] * (1 - e), rot[2] * (1 - e)); };
  fly(A.parts.back, t0 + 0.25, [0, -9, -2], [0.6, 0, 0.2]);
  fly(A.parts.fL, t0 + 0.5, [-8, 2, 2], [0, -1.2, 0.5]);
  fly(A.parts.fR, t0 + 0.75, [8, -2, 2], [0, 1.3, -0.6]);
  grow(A.stL, prog(t, t0 + 1.25, t0 + 1.7)); grow(A.stR, prog(t, t0 + 1.35, t0 + 1.8));
  A.rings.forEach((R, i) => { const ti = t0 + 1.75 + i * 0.0833, k = E.outBack(prog(t, ti, ti + 0.15)); R.visible = k > 0; R.scale.setScalar(Math.max(0.001, k)); });
  grow(A.laceT, prog(t, t0 + 2.25, t0 + 2.75));
  A.plates.forEach((P, i) => { const ti = t0 + 2.75 + i * 0.125, k = E.outBack(prog(t, ti, ti + 0.18)); P.visible = k > 0; P.scale.setScalar(Math.max(0.001, k) * P.userData.s); });
  A.hero.visible = true; A.hero.scale.setScalar(A.hero.userData.s);
  // the hero plate: hits the screen on the drop, recedes, and waits on the back
  const hk = prog(t, t0, t0 + 0.45);
  HERO.traverse(m => { if (m.isMesh) { m.material.transparent = false; m.material.opacity = 1; } });
  show(HERO, hk < 1); HERO.position.set(0, lerp(0, 6, E.inCubic(hk)), lerp(8, 2, E.outCubic(prog(t, t0, t0 + 0.12)))); HERO.rotation.set(0.2, lt * 6, 0); HERO.scale.setScalar(lerp(1.6, 0.6, hk));
  render3D(c);
  label(c, 'DECONSTRUCTION · ASYMMETRY', t, t0 + 0.6, CX, 1800, 32, '#EEF2FA', 10, 'rgba(0,0,0,0.85)', 500);
}

// ---------------------------------------------------------------- 8–10 · eki: the vest rises, the trousers assemble, a two-piece
function shotEki(c, t) {
  const t0 = T.eki, lt = t - t0;
  c.fillStyle = C.rust; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, 800, 200, CX, 800, 1300); g.addColorStop(0, 'rgba(255,190,140,0.35)'); g.addColorStop(1, 'rgba(40,10,0,0.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.font = FR(700, 460, true); c.textAlign = 'center'; c.fillStyle = col('#F3E1D2', 0.9 * E.outCubic(prog(t, t0, t0 + 0.4))); c.fillText('eki', CX, 540 + 60 * (1 - E.outCubic(prog(t, t0, t0 + 0.4)))); c.restore();
  reset3D(); const A = VA;
  const up = E.inOutCubic(prog(t, t0, t0 + 0.45));
  show(A.V); A.V.position.set(0, lerp(-0.25, 1.4, up), 0); A.V.scale.setScalar(lerp(1.55, 0.85, up)); A.V.rotation.set(0, 0.35 * Math.sin(lt * 1.6), 0);
  show(TR.G); TR.G.position.set(0, -0.6, 0); TR.G.scale.setScalar(0.85); TR.G.rotation.y = A.V.rotation.y;
  const legIn = (g, ti, sd) => { const k = clamp(spring(t, ti, 1.8, 0.45), 0, 1.15); g.visible = t > ti; g.position.set(sd * 7 * (1 - k), -6 * (1 - k), 0); g.rotation.z = sd * 0.8 * (1 - k); };
  legIn(TR.gL, t0 + 0.25, -1); legIn(TR.gR, t0 + 0.5, 1);
  grow(TR.bandT, prog(t, t0 + 0.75, t0 + 1.25));
  const pk = E.outBack(prog(t, t0 + 1.25, t0 + 1.45)); TR.pl.visible = pk > 0; TR.pl.scale.setScalar(Math.max(0.001, pk) * 0.3);
  render3D(c);
  serif(c, 'two-piece', t, t0 + 0.6, CX, 1800, 84, '#FFF1E4', { it: true, w: 600, shadow: 'rgba(40,10,0,0.6)' });
}

// ---------------------------------------------------------------- 10–12 · unisex: one vest, two silhouettes
function figure(half) { const r = half, l = half.slice(1, -1).reverse().map(([x, y]) => [-x, y]); return poly(smooth([...r, ...l, r[0]], 5)); }
const MAN = figure([[0, -600], [40, -592], [62, -560], [66, -515], [56, -478], [36, -452], [30, -428], [62, -404], [168, -386], [198, -340], [208, -200], [212, -40], [206, 60], [190, 98], [166, 72], [168, -40], [158, -200], [150, -282], [136, -100], [130, 60], [142, 200], [126, 400], [112, 560], [128, 604], [42, 604], [40, 560], [30, 380], [16, 130], [0, 112]]);
const WOMAN = figure([[0, -600], [46, -590], [70, -552], [76, -486], [86, -414], [94, -344], [140, -350], [160, -310], [166, -180], [170, -40], [168, 60], [154, 96], [138, 70], [140, -60], [128, -250], [116, -290], [100, -130], [96, -80], [130, 40], [136, 110], [120, 300], [96, 450], [82, 560], [98, 604], [26, 604], [26, 560], [20, 380], [12, 140], [0, 122]]);
function shotUni(c, t) {
  const t0 = T.uni, lt = t - t0;
  const split = E.inOutCubic(prog(t, t0, t0 + 0.35));
  c.fillStyle = C.beige; c.fillRect(0, 0, W, H);
  c.fillStyle = C.indigo; c.beginPath(); c.moveTo(0, 0); c.lineTo(lerp(W, 640, split), 0); c.lineTo(lerp(W, 440, split), H); c.lineTo(0, H); c.closePath(); c.fill();
  const tr = (P, x0, y0, s, ti) => { c.save(); c.translate(x0, y0); c.scale(s, s); const r = thread(c, P, P.len * E.inOutCubic(prog(t, ti, ti + 0.8)), { w: 6 / s, shadow: false }); c.restore(); return r; };
  tr(MAN, 285, 1010, 1.0, t0 + 0.1); tr(WOMAN, 800, 1010, 1.0, t0 + 0.25);
  reset3D(); wall.material.opacity = 0.18;
  [[VA, -2.55, t0 + 0.55], [VB, 2.6, t0 + 0.75]].forEach(([A, x, ti]) => {
    const k = E.outBack(prog(t, ti, ti + 0.3)); show(A.V, k > 0);
    A.V.position.set(x, 0.98 + 0.04 * Math.sin(lt * 3 + x), 0.3); A.V.scale.setScalar(Math.max(0.001, 0.95 * k)); A.V.rotation.set(0, 0.25 * Math.sin(lt * 1.4 + x), 0);
    Object.values(A.parts).forEach(p => { p.visible = true; p.position.set(0, 0, 0); p.rotation.set(0, 0, 0); });
    A.plates.forEach(P => { P.visible = true; P.scale.setScalar(P.userData.s); }); A.rings.forEach(R => { R.visible = true; R.scale.setScalar(1); });
    grow(A.laceT, 1); grow(A.stL, 1); grow(A.stR, 1);
  });
  render3D(c);
  const splitPath = (fresh = true) => { if (fresh) c.beginPath(); c.moveTo(0, 0); c.lineTo(lerp(W, 640, split), 0); c.lineTo(lerp(W, 440, split), H); c.lineTo(0, H); c.closePath(); };
  c.save(); splitPath(); c.clip(); serif(c, 'unisex', t, t0 + 0.5, CX, 1790, 160, '#F3E1D2', { it: true, w: 700 }); c.restore();
  c.save(); c.beginPath(); c.rect(0, 0, W, H); splitPath(false); c.clip('evenodd'); serif(c, 'unisex', t, t0 + 0.5, CX, 1790, 160, C.red, { it: true, w: 700 }); c.restore();
  // match cut, part 1: the bronze plate leaves the vest and flies to where the real plate sits in their shoot
  const mk2 = E.inOutCubic(prog(t, T.real - 0.65, T.real));
  if (t > T.real - 0.65) {
    HERO.visible = true; const fade = 1 - prog(t, T.real + 0.05, T.real + 0.45);
    HERO.position.set(lerp(2.6, (ANCHOR[0] - CX) / 100, mk2), lerp(1.75, (CY - ANCHOR[1]) / 100, mk2), lerp(0.8, 0.4, mk2));
    HERO.rotation.set(0.25 * (1 - mk2), TAU * 1.5 * (1 - mk2), 0); HERO.scale.setScalar(lerp(0.25, 1.12, mk2));
    HERO.traverse(m => { if (m.isMesh) { m.material.transparent = true; m.material.opacity = fade; } });
    R3.clear(); scene.traverse(o => { if (o.userData.top && o !== HERO) o.visible = false; }); wall.visible = false;
    if (fade > 0) render3D(c);
    wall.visible = true;
  }
}

// ---------------------------------------------------------------- 12–14 · the real thing: their shoot through the ornament window
let PHOTO = null;
const ANCHOR = [509, 1186];    // the bronze plate in their shoot, on screen at t = T.real
function drawPhoto(c, t, t0) {
  const lt = Math.max(0, t - t0), s = 1920 / PHOTO.height * (1.06 + 0.03 * lt), w = PHOTO.width * s, h = PHOTO.height * s;
  const z = 1 + 0.18 * (1 - E.outCubic(prog(t, t0, t0 + 0.9)));
  c.save(); c.translate(ANCHOR[0], ANCHOR[1]); c.scale(z, z); c.translate(-ANCHOR[0], -ANCHOR[1]);
  c.drawImage(PHOTO, CX - w / 2 - 60 + 40 * lt, CY - h / 2, w, h); c.restore();
}
function shotReal(c, t) {
  const t0 = T.real, k = E.inCubic(prog(t, t0 + 0.02, t0 + 0.55));
  if (k < 1) shotUni(c, t);
  // match cut, part 2: the ornament window opens around the plate; a soft bloom hides the hand-over
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H);
  { const r = lerp(105, 2900, k); lctx.fillStyle = '#fff'; lctx.beginPath(); lctx.moveTo(ANCHOR[0], ANCHOR[1] - r * 1.08); lctx.lineTo(ANCHOR[0] + r, ANCHOR[1]); lctx.lineTo(ANCHOR[0], ANCHOR[1] + r * 1.08); lctx.lineTo(ANCHOR[0] - r, ANCHOR[1]); lctx.closePath(); lctx.fill(); }   // the plate's own diamond becomes the window
  lctx.globalAlpha = 1;
  lctx.globalCompositeOperation = 'source-in'; drawPhoto(lctx, t, t0); lctx.globalCompositeOperation = 'source-over';
  c.drawImage(lay, 0, 0);
  if (k >= 1) drawPhoto(c, t, t0);
  const bl = Math.sin(Math.PI * prog(t, t0 - 0.05, t0 + 0.35)); if (bl > 0) { const g2 = c.createRadialGradient(ANCHOR[0], ANCHOR[1], 0, ANCHOR[0], ANCHOR[1], 420); g2.addColorStop(0, `rgba(255,236,200,${0.55 * bl})`); g2.addColorStop(1, 'rgba(255,236,200,0)'); c.fillStyle = g2; c.fillRect(0, 0, W, H); }
  const g = c.createLinearGradient(0, 1300, 0, H); g.addColorStop(0, 'rgba(10,6,4,0)'); g.addColorStop(1, 'rgba(10,6,4,0.88)'); c.fillStyle = g; c.fillRect(0, 1350, W, H - 1350);
  // a running stitch across the bottom of the frame
  const S = poly([[-20, 1560], [1100, 1530]]), sk = E.inOutCubic(prog(t, t0 + 0.5, t0 + 1.3));
  c.save(); c.setLineDash([26, 16]); const r = thread(c, S, S.len * sk, { w: 6, shadow: false }); c.restore();
  if (sk > 0 && sk < 1) needle(c, r.tip[0], r.tip[1], r.ang, 0.7);
  serif(c, 'designed by @sa1ita', t, t0 + 0.7, CX, 1700, 88, '#FFF4EA', { it: true, w: 600, shadow: 'rgba(0,0,0,0.8)' });
  label(c, 'ALMATY', t, t0 + 1.0, CX, 1785, 32, '#FFF4EA', 16, 'rgba(0,0,0,0.85)', 500);
}

// ---------------------------------------------------------------- 14–16.5 · from Almaty worldwide, then the needle sews «august»
let LOGO = null; const LOGO_W = 439.5, LOGO_H = 119.25;
const DOT = [540, 820];
const TARGETS = [[60, 260], [330, 120], [820, 140], [1040, 380], [1040, 1140], [760, 1500], [120, 1420], [40, 900]];
function shotFin(c, t) {
  const t0 = T.fin;
  const shrink = E.inOutCubic(prog(t, t0, t0 + 0.35));
  paper(c);
  if (shrink < 1) {   // the photo collapses into a dot: Almaty
    c.save(); const r = lerp(1300, 10, shrink); c.beginPath(); c.arc(lerp(CX, DOT[0], shrink), lerp(CY, DOT[1], shrink), r, 0, TAU); c.clip(); drawPhoto(c, t, T.real); c.restore();
  }
  // threads fly out worldwide and come back
  const outK = E.outCubic(prog(t, t0 + 0.3, t0 + 0.9)), backK = E.inCubic(prog(t, t0 + 0.95, t0 + 1.2));
  if (outK > 0 && backK < 1) {
    TARGETS.forEach(([x, y], i) => {
      const mx = (DOT[0] + x) / 2 + (hash(i) - 0.5) * 300, my = Math.min(DOT[1], y) - 180;
      const pts = []; for (let j = 0; j <= 40; j++) { const u = j / 40; pts.push([(1 - u) ** 2 * DOT[0] + 2 * (1 - u) * u * mx + u * u * x, (1 - u) ** 2 * DOT[1] + 2 * (1 - u) * u * my + u * u * y]); }
      const P = poly(pts), a = P.len * outK, b = P.len * backK;
      c.save(); c.globalAlpha = 1 - backK; thread(c, P, a, { w: 4, shadow: false }); c.restore();
      if (outK >= 1) { c.fillStyle = C.red; c.beginPath(); c.arc(x, y, 7 * (1 - backK), 0, TAU); c.fill(); }
    });
  }
  if (t < t0 + 1.25) { c.fillStyle = C.red; c.beginPath(); c.arc(DOT[0], DOT[1], 12, 0, TAU); c.fill(); label(c, 'ALMATY', t, t0 + 0.3, DOT[0], DOT[1] + 60, 26, C.brown, 12); }
  serif(c, 'order worldwide', t, t0 + 0.4, CX, 1180, 84, C.brown, { it: true, out: t0 + 1.1 });
  // the needle sews the logo from left to right
  const lw = 980, s = lw / LOGO_W, lx = CX - lw / 2, ly = 860 - LOGO_H * s / 2;
  const sew = E.inOutCubic(prog(t, t0 + 1.15, t0 + 1.75)), hit = prog(t, t0 + 1.75, t0 + 2.1);
  if (sew > 0) {
    const pop = (1 + 0.06 * Math.sin(Math.PI * hit) * (1 - hit)) * (1 + 0.035 * E.outCubic(prog(t, t0 + 2.0, DUR)));
    c.save(); c.translate(CX, 860); c.scale(pop, pop); c.translate(-CX, -860);
    c.beginPath(); c.rect(lx - 20, 0, (lw + 40) * sew, H); c.clip();
    c.translate(lx, ly); c.scale(s, s); c.shadowColor = 'rgba(90,46,30,0.28)'; c.shadowBlur = 26; c.shadowOffsetY = 10; c.fillStyle = '#4E2416'; c.fill(LOGO); c.restore();
    if (sew < 1) {   // the needle bobs through the letters, a short red tail behind it
      const nx = lx + lw * sew, ny = 860 + 80 * Math.sin(sew * 46);
      c.strokeStyle = C.red; c.lineWidth = 5; c.beginPath(); c.moveTo(nx - 160, 865 + 80 * Math.sin((sew - 0.16) * 46)); c.quadraticCurveTo(nx - 70, 860, nx, ny); c.stroke();
      needle(c, nx, ny, -0.35 + 0.5 * Math.cos(sew * 46), 0.8);
    }
  }
  // a single red stitch under the logo, then the line
  const ul = E.inOutCubic(prog(t, t0 + 1.8, t0 + 2.2));
  if (ul > 0) { c.save(); c.setLineDash([22, 14]); thread(c, poly([[lx + 60, 1050], [lx + lw - 60, 1050]]), (lw - 120) * ul, { w: 6, shadow: false }); c.restore(); }
  label(c, 'QAZAQ WEAR', t, t0 + 2.0, CX, 1170, 44, '#4E2416', 22, null, 500);
  label(c, 'MADE IN ALMATY · ORDER WORLDWIDE', t, t0 + 2.2, CX, 1245, 26, col(C.brown, 0.8), 8);
  label(c, 'made by @frht.work', t, t0 + 2.5, CX, 1810, 28, col(C.brown, 0.85), 6);
}

// ---------------------------------------------------------------- transitions + frame
function sunWipe(c, t) {      // pro → hist: through the sun
  const k = E.inExpo(prog(t, 1.72, 2.05));
  shotPro(c, t); if (k <= 0) return;
  c.save(); c.beginPath(); c.arc(760, 700, 88 + 2400 * k, 0, TAU); c.clip(); shotHist(c, Math.max(t, T.hist)); c.restore();
}
function flashAt(t, t0, d = 0.14, a = 0.6) { return t >= t0 && t < t0 + d ? a * (1 - (t - t0) / d) ** 2 : 0; }
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of [[T.dec, 26, 0.3], [T.dec + 0.25, 8, 0.15], [T.dec + 0.5, 8, 0.15], [T.dec + 0.75, 8, 0.15], [T.eki, 14, 0.2], [T.fin + 1.75, 10, 0.2]]) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d, f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const [sx, sy] = shakeAt(t); ctx.save(); ctx.translate(sx, sy);
  if (t < T.hist + 0.06) sunWipe(ctx, t);
  else if (t < T.dec) shotHist(ctx, t);
  else if (t < T.eki) shotDec(ctx, t);
  else if (t < T.uni) shotEki(ctx, t);
  else if (t < T.real) shotUni(ctx, t);
  else if (t < T.fin) shotReal(ctx, t);
  else shotFin(ctx, t);
  ctx.restore();
  post(t);
}
function post(t) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  const fl = Math.max(flashAt(t, T.dec, 0.16, 0.7), flashAt(t, T.eki, 0.12, 0.35), flashAt(t, T.uni, 0.1, 0.3), flashAt(t, T.fin + 1.75, 0.14, 0.25));
  if (fl > 0) { c.fillStyle = `rgba(255,245,235,${fl})`; c.fillRect(0, 0, W, H); }
  c.save(); c.globalAlpha = 0.045; c.globalCompositeOperation = 'overlay'; c.drawImage(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0, W, H); c.restore();
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

// ---------------------------------------------------------------- cue sheet
function buildEvents() {
  ev(0.12, 'needle'); ev(0.2, 'thread', { end: 1.7 }); ev(1.7, 'sun');
  ev(T.hist, 'rock'); ev(T.hist + 0.05, 'peck', { end: T.hist + 1.3 }); ev(T.hist + 0.9, 'thread', { end: T.hist + 1.35 }); ev(T.hist + 1.6, 'cast');
  ev(T.dec, 'drop'); [0.25, 0.5, 0.75].forEach(d => ev(T.dec + d, 'piece'));
  ev(T.dec + 1.25, 'stitch', { end: T.dec + 1.8 }); for (let i = 0; i < 6; i++) ev(T.dec + 1.75 + i * 0.0833, 'ring', { i });
  ev(T.dec + 2.25, 'lace', { end: T.dec + 2.75 }); for (let i = 0; i < 5; i++) ev(T.dec + 2.75 + i * 0.125, 'plate', { i });
  ev(T.dec + 3.2, 'spin');
  ev(T.eki, 'hit'); ev(T.eki + 0.25, 'piece'); ev(T.eki + 0.5, 'piece'); ev(T.eki + 0.75, 'stitch', { end: T.eki + 1.25 }); ev(T.eki + 1.25, 'plate', { i: 2 });
  ev(T.uni, 'swipe'); ev(T.uni + 0.1, 'thread', { end: T.uni + 1.05 }); ev(T.uni + 0.55, 'pop'); ev(T.uni + 0.75, 'pop');
  ev(T.real - 0.65, 'match'); ev(T.real, 'open'); ev(T.real + 0.5, 'stitch', { end: T.real + 1.3 });
  ev(T.fin, 'collapse'); ev(T.fin + 0.3, 'fly'); ev(T.fin + 0.95, 'back'); ev(T.fin + 1.15, 'sew', { end: T.fin + 1.75 }); ev(T.fin + 1.75, 'logo'); ev(T.fin + 2.5, 'credit');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = await (await fetch('/fonts/faces.json')).json();
  for (const f of faces) { const ff = new FontFace(f.family, `url(/fonts/${f.file})`, { weight: f.weight, style: f.style, unicodeRange: f.range }); await ff.load(); document.fonts.add(ff); }
  await document.fonts.load(FR(500, 40, true), 'qyzyl jip'); await document.fonts.load(FR(600, 40), 'eki'); await document.fonts.load(UB(400, 30), 'QAZAQ');
  const svg = await (await fetch('/assets/august_logo.svg')).text();
  LOGO = new Path2D(svg.match(/ d="([^"]+)"/)[1]);
  PHOTO = new Image(); PHOTO.src = '/img/august_detail.jpg'; await PHOTO.decode();
  ROCK = rockTex(); buildGrain();
  VA = buildVest(1); VB = buildVest(7); TR = buildTrousers(3);
  [VA, VB].forEach(A => { A.plates.forEach(P => P.userData.s = P.scale.x); A.hero.userData.s = A.hero.scale.x; });
  HERO = plate3D(1.0, 1);
  [VA.V, VB.V, TR.G, HERO].forEach(o => { o.userData.top = true; o.visible = false; scene.add(o); });
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
