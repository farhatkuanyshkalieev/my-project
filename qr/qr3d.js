// Qazaq Republic — 10 s vertical brand reel, 3D edition (1080×1920, 60 fps).
// Same story and timing as the flat version (qr.js) — the «qr.» dot bounces the
// logo together, hops through a week in Latin Kazakh, turns into a Bauhaus wall
// for «jaqsy kúnder.» and lands as the period — but every object is now 3D:
// an extruded wordmark from the brand's own SVG, a glossy candy «pebble» dot,
// seven soft inflated garments, a relief Bauhaus tile wall, a 3D pill and badge,
// 3D confetti and a woven label. Look: soft clay / studio light, flat brand
// colour fields and crisp 2D typography on top. Every frame is a function of t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2, DUR = 10.0;
// film time (120 BPM: beat = 0.5 s)
const T = { b1: 0.5, b2: 1.0, land: 1.5, week: 2.0, drop: 5.5, band: 5.75, jaqsy: 6.0, kunder: 6.5, badge: 7.0, fin: 7.5, finLand: 8.0, name: 8.25, tag: 8.5, handles: 8.75, label: 9.0 };
const P = { B: '#1815CF', Bd: '#0F0B8F', W: '#FFFFFF', OW: '#F5F5FD', Y: '#F2B705', Bur: '#7A1F2B', Mel: '#D7D7DB', Nv: '#16224D', Kh: '#5B6142', Cr: '#F4EFE3', Ink: '#111111', Brn: '#B9783A' };
const DAYS = [
  { name: 'DÚISENBI', ru: 'ПОНЕДЕЛЬНИК', bg: P.B, fg: P.W, acc: P.Y, anim: 'rise', item: 'tee', ic: P.W, ii: P.B },
  { name: 'SEISENBI', ru: 'ВТОРНИК', bg: P.Y, fg: P.Nv, acc: P.B, anim: 'flip', item: 'hoodie', ic: P.Mel, ii: P.B },
  { name: 'SÁRSENBI', ru: 'СРЕДА', bg: P.Bur, fg: P.Cr, acc: P.Y, anim: 'stretch', item: 'cap', ic: P.Cr, ii: P.Bur },
  { name: 'BEISENBI', ru: 'ЧЕТВЕРГ', bg: P.Mel, fg: P.B, acc: P.Bur, anim: 'outline', item: 'tote', ic: P.Nv, ii: P.W },
  { name: 'JUMA', ru: 'ПЯТНИЦА', bg: P.Nv, fg: P.Y, acc: P.W, anim: 'slice', item: 'sock', ic: P.Y, ii: P.Nv },
  { name: 'SENBI', ru: 'СУББОТА', bg: P.OW, fg: P.B, acc: P.Y, anim: 'drop', item: 'sweat', ic: P.B, ii: P.W },
  { name: 'JEKSENBI', ru: 'ВОСКРЕСЕНЬЕ', bg: P.Kh, fg: P.Cr, acc: P.Y, anim: 'spin', item: 'beanie', ic: P.Brn, ii: P.Cr },
];
const INIT = ['D', 'S', 'S', 'B', 'J', 'S', 'J'];
const dayT = i => T.week + i * 0.5;

// ---------------------------------------------------------------- utils
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const col = (h, a = 1) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
const darken = (h, k) => '#' + hx(h).map(v => Math.round(v * (1 - k)).toString(16).padStart(2, '0')).join('');
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
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const X = px => (px - CX) / 100, Y = py => (CY - py) / 100;   // pixel → world at z = 0
const DISP = s => `900 ${s}px "Inter Display"`;
const ITB = s => `italic 900 ${s}px "Inter"`;
const MONO = (w, s) => `${w} ${s}px "JB Mono"`;
const VAR = s => `400 ${s}px "Graduate"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

const out = document.getElementById('c');
const ctx = out.getContext('2d');

// ---------------------------------------------------------------- three.js: soft studio
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.LinearToneMapping; R3.toneMappingExposure = 1.0;
R3.outputColorSpace = THREE.SRGBColorSpace;
R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 300);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight('#ffffff', '#dcdcec', 1.25); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffffff', 2.3);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6;
Object.assign(key.shadow.camera, { left: -12, right: 12, top: 14, bottom: -14, near: 1, far: 70 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight('#ffffff', 0.9); rim.position.set(7, 4, -6); scene.add(rim);
const fill = new THREE.DirectionalLight('#ffffff', 0.35); fill.position.set(6, -3, 9); scene.add(fill);
const wallC = new THREE.Mesh(new THREE.PlaneGeometry(80, 90), new THREE.ShadowMaterial({ opacity: 0.3 }));
wallC.receiveShadow = true; scene.add(wallC);
const floorC = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.25 }));
floorC.rotation.x = -Math.PI / 2; floorC.receiveShadow = true; scene.add(floorC);
const clay = (c, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.55 }, o));
const candy = c => clay(c, { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.8 });
const REG = [];
function reg(o) { REG.push(o); o.visible = false; scene.add(o); return o; }
const on = o => { o.visible = true; return o; };
function shadowsOn(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

// ---------------------------------------------------------------- the «qr.» wordmark: 2D paths + 3D extrusions
const LOGO = { q: null, r: null, dot: null, dc: [41.49, 18.88], dr: 4.97, geo: {} };
function logoPart(c, part, x0, y0, s, color) { c.save(); c.translate(x0, y0); c.scale(s, s); c.fillStyle = color; c.fill(LOGO[part]); c.restore(); }
function logo(c, cx, cy, w, color) { const s = w / 47, x0 = cx - w / 2, y0 = cy - 16 * s; logoPart(c, 'q', x0, y0, s, color); logoPart(c, 'r', x0, y0, s, color); logoPart(c, 'dot', x0, y0, s, color); }
function wovenLabel(c, x, y, w, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const h = w * 0.56; c.fillStyle = P.B; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.08); c.fill();
  logo(c, 0, 0, w * 0.62, P.W); c.restore();
}
function buildLogoGeo(svgText) {   // unit width (1 world unit = whole logo width); origin = centre of the 47×32 box
  const data = new SVGLoader().parse(svgText);
  const mkGeo = path => {
    const g = new THREE.ExtrudeGeometry(SVGLoader.createShapes(path), { depth: 4.0, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.6, bevelSegments: 6, curveSegments: 20 });
    g.translate(-23.5, -16, -2.0); const s = 1 / 47; g.scale(s, -s, -s); g.computeVertexNormals(); return g;
  };
  LOGO.geo.q = mkGeo(data.paths[0]); LOGO.geo.r = mkGeo(data.paths[2]);
  LOGO.geo.pebble = new THREE.SphereGeometry(1, 72, 48);
}
// a logo = { g, q, r, dot }; the dot is a separate «pebble» (a squashed sphere)
function makeLogo(mat, dotMat) {
  const g = reg(new THREE.Group());
  const q = new THREE.Mesh(LOGO.geo.q, mat), r = new THREE.Mesh(LOGO.geo.r, mat);
  const qg = new THREE.Group(), rg = new THREE.Group(); qg.add(q); rg.add(r); g.add(qg); g.add(rg);
  shadowsOn(g);
  return { g, qg, rg, q, r };
}
function makePebble(mat) {
  const g = reg(new THREE.Group()), m = new THREE.Mesh(LOGO.geo.pebble, mat);
  m.position.y = 1; g.add(m); shadowsOn(g);   // pivot at the bottom → squash on landing
  return g;
}
function poseLogo(L, cxPx, cyPx, wPx) {   // place a logo so it covers the same pixels as the 2D one
  L.g.position.set(X(cxPx), Y(cyPx), 0); L.g.scale.setScalar(wPx / 100);
}
function posePebble(pb, xPx, bottomPx, rPx, sx = 1, sy = 1, z = 0) {
  pb.position.set(X(xPx), Y(bottomPx), z); const r = rPx / 100; pb.scale.set(r * sx, r * sy, r * 0.66 * sx);
}

// ---------------------------------------------------------------- 2D background system
function grid(c, color, a = 0.08) {
  c.save(); c.strokeStyle = col(color, a); c.lineWidth = 2;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * 180, 0); c.lineTo(i * 180, H); c.stroke(); }
  for (let j = 1; j < 11; j++) { c.beginPath(); c.moveTo(0, j * 180); c.lineTo(W, j * 180); c.stroke(); }
  c.restore();
}
function hud(c, color, left, right, k = 1) {
  return;   // no corner captions: they read as a template
  c.save(); c.globalAlpha = k; c.font = MONO(700, 24); c.letterSpacing = '4px'; c.fillStyle = col(color, 0.8); c.textBaseline = 'alphabetic';
  c.textAlign = 'left'; c.fillText(left, 64, 110); c.textAlign = 'right'; c.fillText(right, W - 64, 110);
  c.strokeStyle = col(color, 0.5); c.lineWidth = 2;
  for (const [x, y] of [[64, 140], [W - 64, 140]]) { c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.moveTo(x, y - 12); c.lineTo(x, y + 12); c.stroke(); }
  c.restore();
}

// ---------------------------------------------------------------- garments: drawn flat (prints, ribs, labels) → inflated into 3D
function archText(c, txt, cx, cy, r, size, color, font = VAR) {
  c.save(); c.font = font(size); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const span = Math.min(1.5, txt.length * size * 0.62 / r);
  for (let i = 0; i < txt.length; i++) { const a = -Math.PI / 2 - span / 2 + span * (i + 0.5) / txt.length; c.save(); c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.rotate(a + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
  c.restore();
}
const ITEMS = {
  tee(c, d) {
    c.beginPath(); c.moveTo(-70, -300); c.quadraticCurveTo(-46, -256, 0, -256); c.quadraticCurveTo(46, -256, 70, -300); c.lineTo(178, -268); c.quadraticCurveTo(228, -204, 262, -100); c.lineTo(190, -60); c.quadraticCurveTo(176, -90, 164, -116); c.quadraticCurveTo(160, 90, 170, 290); c.quadraticCurveTo(0, 304, -170, 290); c.quadraticCurveTo(-160, 90, -164, -116); c.quadraticCurveTo(-176, -90, -190, -60); c.lineTo(-262, -100); c.quadraticCurveTo(-228, -204, -178, -268); c.closePath();
    c.fillStyle = d.ic; c.fill();
    if (d.print === false) return;
    c.strokeStyle = col(d.ii, 0.25); c.lineWidth = 6; c.beginPath(); c.moveTo(-64, -296); c.quadraticCurveTo(-40, -246, 0, -246); c.quadraticCurveTo(40, -246, 64, -296); c.stroke();
    logo(c, 0, -110, 190, d.ii);
    c.font = MONO(700, 22); c.fillStyle = d.ii; c.textAlign = 'center'; c.letterSpacing = '5px'; c.fillText('DÚISENBI CLUB', 0, -20);
    wovenLabel(c, -120, 250, 46);
  },
  hoodie(c, d) {
    c.beginPath(); c.moveTo(-96, -250); c.quadraticCurveTo(-120, -360, 0, -372); c.quadraticCurveTo(120, -360, 96, -250); c.lineTo(178, -228); c.quadraticCurveTo(232, -180, 252, -60); c.lineTo(272, 210); c.lineTo(214, 222); c.quadraticCurveTo(196, 60, 168, -70); c.lineTo(172, 268); c.lineTo(166, 300); c.quadraticCurveTo(0, 312, -166, 300); c.lineTo(-172, 268); c.lineTo(-168, -70); c.quadraticCurveTo(-196, 60, -214, 222); c.lineTo(-272, 210); c.lineTo(-252, -60); c.quadraticCurveTo(-232, -180, -178, -228); c.closePath();
    c.fillStyle = d.ic; c.fill();
    if (d.print === false) return;
    c.fillStyle = 'rgba(0,0,0,0.13)'; c.beginPath(); c.ellipse(0, -282, 70, 66, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-22, -220); c.lineTo(-28, -140); c.moveTo(22, -220); c.lineTo(28, -140); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.07)'; c.beginPath(); c.moveTo(-110, 110); c.lineTo(110, 110); c.lineTo(136, 230); c.lineTo(-136, 230); c.closePath(); c.fill();
    archText(c, 'QAZAQ', 0, 40, 200, 74, d.ii);
    c.font = VAR(30); c.fillStyle = d.ii; c.textAlign = 'center'; c.fillText('EST. 2016', 0, 0);
    wovenLabel(c, 130, 250, 46);
  },
  cap(c, d) {
    c.fillStyle = d.ic;
    c.beginPath(); c.moveTo(-250, 60); c.bezierCurveTo(-250, -260, 250, -260, 250, 60); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(0, 70, 300, 66, 0, 0, Math.PI); c.fill();
    if (d.print === false) return;
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -180); c.lineTo(0, 60); c.moveTo(-120, -150); c.quadraticCurveTo(-170, -40, -160, 60); c.moveTo(120, -150); c.quadraticCurveTo(170, -40, 160, 60); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(0, 70, 300, 66, 0, 0, Math.PI); c.fill();
    c.fillStyle = d.ic; c.beginPath(); c.ellipse(0, 64, 292, 30, 0, 0, Math.PI); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(0, -184, 14, 0, TAU); c.fill();
    logo(c, 0, -50, 170, d.ii);
    wovenLabel(c, 196, 20, 40, -0.3);
  },
  tote(c, d) {
    c.strokeStyle = d.ic; c.lineWidth = 34; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-110, -150); c.bezierCurveTo(-110, -360, 110, -360, 110, -150); c.stroke();
    c.beginPath(); c.moveTo(-220, -170); c.lineTo(220, -170); c.lineTo(236, 290); c.lineTo(-236, 290); c.closePath();
    c.fillStyle = d.ic; c.fill();
    if (d.print === false) return;
    c.font = ITB(118); c.fillStyle = d.ii; c.textAlign = 'center'; c.letterSpacing = '-3px'; c.fillText('sömke.', 0, 90);
    c.font = MONO(700, 22); c.letterSpacing = '5px'; c.fillText('BEISENBI EDITION', 0, 150);
    wovenLabel(c, 170, -120, 46);
  },
  sock(c, d) {
    c.save(); c.translate(-80, 0);
    c.beginPath(); c.moveTo(-90, -320); c.lineTo(90, -320); c.lineTo(90, 90); c.quadraticCurveTo(90, 150, 140, 170); c.lineTo(250, 210); c.quadraticCurveTo(320, 240, 290, 300); c.quadraticCurveTo(270, 340, 200, 320); c.lineTo(-30, 270); c.quadraticCurveTo(-90, 250, -90, 170); c.closePath();
    c.fillStyle = d.ic; c.fill();
    if (d.print !== false) {
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 4; for (let x = -76; x <= 76; x += 16) { c.beginPath(); c.moveTo(x, -320); c.lineTo(x, -230); c.stroke(); }
      c.fillStyle = d.ii; c.fillRect(-90, -210, 180, 16); c.fillRect(-90, -184, 180, 16);
      c.save(); c.translate(0, -40); c.rotate(-Math.PI / 2); c.font = DISP(110); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('JUMA', 0, 0); c.restore();
      c.fillStyle = 'rgba(0,0,0,0.1)'; c.beginPath(); c.ellipse(240, 270, 60, 40, 0.3, 0, TAU); c.fill();
    }
    c.restore();
  },
  sweat(c, d) {
    c.beginPath(); c.moveTo(-66, -300); c.quadraticCurveTo(-40, -250, 0, -250); c.quadraticCurveTo(40, -250, 66, -300); c.lineTo(178, -268); c.quadraticCurveTo(236, -230, 252, -150); c.lineTo(282, 210); c.lineTo(222, 226); c.quadraticCurveTo(200, 50, 170, -60); c.lineTo(172, 270); c.lineTo(166, 304); c.quadraticCurveTo(0, 314, -166, 304); c.lineTo(-172, 270); c.lineTo(-170, -60); c.quadraticCurveTo(-200, 50, -222, 226); c.lineTo(-282, 210); c.lineTo(-252, -150); c.quadraticCurveTo(-236, -230, -178, -268); c.closePath();
    c.fillStyle = d.ic; c.fill();
    if (d.print === false) return;
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(-166, 272, 332, 30); c.fillRect(-282, 196, 60, 28); c.fillRect(222, 196, 60, 28);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 8; c.beginPath(); c.moveTo(-60, -294); c.quadraticCurveTo(-36, -240, 0, -240); c.quadraticCurveTo(36, -240, 60, -294); c.stroke();
    archText(c, 'SENBI', 0, 30, 190, 84, d.ii);
    c.font = VAR(48); c.fillStyle = d.ii; c.textAlign = 'center'; c.fillText('CLUB', 0, 70);
    wovenLabel(c, -128, 260, 46);
  },
  beanie(c, d) {
    c.fillStyle = d.ic; c.beginPath(); c.moveTo(-220, 60); c.bezierCurveTo(-230, -300, 230, -300, 220, 60); c.closePath(); c.fill();
    c.beginPath(); c.roundRect(-240, 40, 480, 170, 30); c.fill();
    if (d.print === false) return;
    c.save(); c.beginPath(); c.moveTo(-220, 60); c.bezierCurveTo(-230, -300, 230, -300, 220, 60); c.closePath(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 6; for (let x = -200; x <= 200; x += 28) { c.beginPath(); c.moveTo(x, 60); c.quadraticCurveTo(x * 0.6, -150, x * 0.2, -230); c.stroke(); } c.restore();
    c.fillStyle = 'rgba(0,0,0,0.1)'; c.beginPath(); c.roundRect(-240, 40, 480, 170, 30); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.14)'; c.lineWidth = 6; for (let x = -220; x <= 220; x += 22) { c.beginPath(); c.moveTo(x, 50); c.lineTo(x, 200); c.stroke(); }
    wovenLabel(c, 0, 125, 78);
  },
};
// build an inflated «pillow» mesh pair (front with print, back plain) from a flat drawing
const GARM = [];
const TW = 720, TH = 800, TOX = 360, TOY = 400;   // template: px = world*100
function inflate(i) {
  const d = DAYS[i];
  // silhouette mask at 1/4 res → distance field
  const MS = 4, mw = TW / MS, mh = TH / MS;
  const mc = mk(mw, mh), m = mc.getContext('2d');
  m.scale(1 / MS, 1 / MS); m.translate(TOX, TOY); ITEMS[d.item](m, Object.assign({}, d, { ic: '#ffffff', print: false }));
  const a = m.getImageData(0, 0, mw, mh).data;
  const D = new Float32Array(mw * mh); for (let k = 0; k < mw * mh; k++) D[k] = a[k * 4 + 3] > 127 ? 1e9 : 0;
  const d2 = Math.SQRT2;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const k = y * mw + x; if (!D[k]) continue; let v = D[k];
    if (x > 0) v = Math.min(v, D[k - 1] + 1); if (y > 0) v = Math.min(v, D[k - mw] + 1); if (x > 0 && y > 0) v = Math.min(v, D[k - mw - 1] + d2); if (x < mw - 1 && y > 0) v = Math.min(v, D[k - mw + 1] + d2); D[k] = v; }
  for (let y = mh - 1; y >= 0; y--) for (let x = mw - 1; x >= 0; x--) { const k = y * mw + x; if (!D[k]) continue; let v = D[k];
    if (x < mw - 1) v = Math.min(v, D[k + 1] + 1); if (y < mh - 1) v = Math.min(v, D[k + mw] + 1); if (x < mw - 1 && y < mh - 1) v = Math.min(v, D[k + mw + 1] + d2); if (x > 0 && y < mh - 1) v = Math.min(v, D[k + mw - 1] + d2); D[k] = v; }
  const samp = (px, py) => { const x = clamp(px / MS, 0, mw - 1), y = clamp(py / MS, 0, mh - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(mw - 1, x0 + 1), y1 = Math.min(mh - 1, y0 + 1), fx = x - x0, fy = y - y0;
    return (D[y0 * mw + x0] * (1 - fx) * (1 - fy) + D[y0 * mw + x1] * fx * (1 - fy) + D[y1 * mw + x0] * (1 - fx) * fy + D[y1 * mw + x1] * fx * fy) * MS / 100; };
  const mkGeo = sign => {
    const geo = new THREE.PlaneGeometry(TW / 100, TH / 100, 180, 200), pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), px = x * 100 + TOX, py = TOY - y * 100;
      const dd = samp(px, py);
      if (dd <= 0.001) { pos.setZ(k, 0); continue; }
      const puff = 0.58 * (1 - Math.exp(-dd / 0.6)) + 0.12 * Math.min(1, dd / 1.2);
      const fold = 0.035 * Math.sin(2.4 * x + 1.7 * y + i) * clamp(dd / 0.5);
      pos.setZ(k, sign * (puff + fold));
    }
    if (sign < 0) { const idx = geo.index.array; for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k]; idx[k] = idx[k + 2]; idx[k + 2] = tmp; } }
    geo.computeVertexNormals(); return geo;
  };
  const S = 2;
  const fc = mk(TW * S, TH * S), f = fc.getContext('2d'); f.scale(S, S); f.translate(TOX, TOY); ITEMS[d.item](f, d);
  const bc = mk(TW * S, TH * S), b = bc.getContext('2d'); b.scale(S, S); b.translate(TOX, TOY); ITEMS[d.item](b, Object.assign({}, d, { print: false }));
  const mat = cv => { const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mm = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.82, sheen: 0.7, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.55, alphaTest: 0.5, envMapIntensity: 0.45 });
    return [mm, new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 })]; };
  const [fm, fd] = mat(fc), [bm, bd] = mat(bc);
  const front = new THREE.Mesh(mkGeo(1), fm), back = new THREE.Mesh(mkGeo(-1), bm);
  front.customDepthMaterial = fd; back.customDepthMaterial = bd;
  const g = reg(new THREE.Group()); g.add(front); g.add(back); shadowsOn(g);
  GARM[i] = g;
}

// ---------------------------------------------------------------- kinetic type (2D, one trick per day)
function wordLayout(c, txt, size) { c.font = DISP(size); c.letterSpacing = '0px'; const ws = [...txt].map(ch => c.measureText(ch).width); return { ws, tw: ws.reduce((a, b) => a + b, 0) - (txt.length - 1) * size * 0.02 }; }
function drawWord(c, txt, anim, lt, cx, baseY, size, color) {
  const { ws, tw } = wordLayout(c, txt, size);
  const capH = size * 0.73, tr = size * 0.02;
  c.save(); c.font = DISP(size); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = color;
  if (anim === 'stretch') {
    const k = E.outExpo(prog(lt, 0.03, 0.3));
    c.translate(cx, baseY); c.scale(lerp(0.6, 1, k), lerp(3.2, 1, k)); let x = -tw / 2; for (let i = 0; i < txt.length; i++) { c.fillText(txt[i], x, 0); x += ws[i] - tr; } c.restore(); return;
  }
  if (anim === 'slice') {
    const n = 6;
    for (let s = 0; s < n; s++) {
      const k = E.outExpo(prog(lt, 0.02 + s * 0.02, 0.26 + s * 0.02)), dx = (s % 2 ? 1 : -1) * 700 * (1 - k);
      c.save(); c.beginPath(); c.rect(0, baseY - capH + s * capH / n - 1, W, capH / n + 2); c.clip();
      let x = cx - tw / 2 + dx; for (let i = 0; i < txt.length; i++) { c.fillText(txt[i], x, baseY); x += ws[i] - tr; }
      c.restore();
    }
    c.restore(); return;
  }
  let x = cx - tw / 2;
  for (let i = 0; i < txt.length; i++) {
    const t0 = 0.03 + i * 0.026, k = prog(lt, t0, t0 + 0.22), e = E.outExpo(k);
    const lx = x + ws[i] / 2;
    c.save();
    if (anim === 'rise') { c.beginPath(); c.rect(0, baseY - capH - 30, W, capH + 60); c.clip(); c.translate(lx, baseY + (capH + 40) * (1 - e)); }
    else if (anim === 'flip') { c.translate(lx, baseY - capH / 2); c.scale(1, E.outBack(k) * (k > 0 ? 1 : 0)); c.translate(0, capH / 2); }
    else if (anim === 'drop') { const sp = spring(lt, t0, 2.6, 0.3); c.translate(lx, baseY - 600 * (1 - sp)); c.scale(1 + 0.15 * Math.max(0, sp - 1), 1 - 0.15 * Math.max(0, sp - 1)); }
    else if (anim === 'spin') { c.translate(lx, baseY - capH / 2); c.rotate(-Math.PI * (1 - e)); c.scale(e, e); c.translate(0, capH / 2); }
    else if (anim === 'outline') { c.translate(lx, baseY); }
    if (anim === 'outline') {
      const dk = prog(lt, 0.02 + i * 0.02, 0.22 + i * 0.02), fk = prog(lt, 0.2 + i * 0.015, 0.3 + i * 0.015);
      c.strokeStyle = color; c.lineWidth = 4; c.setLineDash([900 * dk, 2000]); c.strokeText(txt[i], -ws[i] / 2, 0);
      c.globalAlpha = fk; c.fillText(txt[i], -ws[i] / 2, 0);
    } else if (k > 0) c.fillText(txt[i], -ws[i] / 2, 0);
    c.restore();
    x += ws[i] - tr;
  }
  c.restore();
}

// ---------------------------------------------------------------- shared per-frame 3D state
let LI = null, LF = null, PEB = null, PEBC = null, PEBF = null, PEBB = null, RINGS = [];
function resetFrame() {
  for (const o of REG) o.visible = false;
  wallC.visible = true; wallC.position.set(0, 0, -1.6); wallC.material.opacity = 0.3; wallC.material.color.set('#000000');
  floorC.visible = false;
  key.position.set(-6, 9, 14); key.target.position.set(0, 0, 0);
  cam.position.set(0, 0, CAMZ); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
}
let SHAKE = [0, 0];
function render3D(c) {
  cam.position.x += SHAKE[0] / 100; cam.position.y -= SHAKE[1] / 100;
  R3.render(scene, cam);
  c.drawImage(R3.domElement, -SHAKE[0], -SHAKE[1]);
}

// ---------------------------------------------------------------- 0.00–2.00  the pebble bounces the logo together
const LG = { w: 760, cx: 540, cy: 900 };
const LS = LG.w / 47, LX0 = LG.cx - LG.w / 2, LY0 = LG.cy - 16 * LS;
const DOTF = [LX0 + LOGO.dc[0] * LS, LY0 + LOGO.dc[1] * LS], DOTR = LOGO.dr * LS;
const BASE = DOTF[1] + DOTR;   // baseline (floor) in px
const QX = LX0 + 16 * LS, RX = LX0 + 30 * LS;
function dotIntro(t) {
  const fy = DOTF[1];
  const hops = [[0.05, 540, -160, T.b1, QX, 0], [T.b1, QX, fy, T.b2, RX, 420], [T.b2, RX, fy, T.land, DOTF[0], 260]];
  for (const [a, x0, y0, b, x1, hgt] of hops) if (t < b) {
    const k = prog(t, a, b);
    if (hgt === 0) return { x: lerp(x0, x1, k), y: lerp(y0, fy, E.inQuad(k)), sx: 1 - 0.1 * k, sy: 1 + 0.25 * k, roll: 0 };
    const y = lerp(y0, fy, k) - 4 * hgt * k * (1 - k);
    return { x: lerp(x0, x1, k), y, sx: 1 - 0.12 * Math.sin(Math.PI * k), sy: 1 + 0.18 * Math.sin(Math.PI * k), roll: -k * Math.PI };
  }
  const sp = spring(t, T.land, 3.4, 0.28);
  return { x: DOTF[0], y: fy, sx: 1 + 0.25 * (1 - sp), sy: 1 - 0.3 * (1 - sp), roll: 0 };
}
function landSquash(t, tl) { if (t < tl) return [1, 1]; const sp = spring(t, tl, 3.4, 0.28); return [1 + 0.35 * (1 - sp), 1 - 0.4 * (1 - sp)]; }
function shotIntro(c, t) {
  c.fillStyle = P.OW; c.fillRect(0, 0, W, H);
  grid(c, P.B, 0.07);
  hud(c, P.B, 'QAZAQ REPUBLIC', 'EST. 2016 · ALMATY', prog(t, 0.05, 0.3));
  const ck = E.outCubic(prog(t, T.land + 0.05, T.land + 0.3));
  c.save(); c.globalAlpha = ck; c.font = MONO(700, 30); c.letterSpacing = '12px'; c.fillStyle = P.B; c.textAlign = 'center';
  c.fillText('JETI KÚN · 7 ДНЕЙ', CX, 1300 + 20 * (1 - ck)); c.restore();
  // 3D
  resetFrame();
  wallC.visible = false;
  floorC.visible = true; floorC.position.set(0, Y(BASE), 0); floorC.material.opacity = 0.22; floorC.material.color.set(P.Bd);
  key.position.set(-5, 11, 9);
  cam.position.set(0, 2.2, CAMZ - 1.2 * (1 - E.outCubic(prog(t, 0, T.week)))); cam.lookAt(0, 0.15, 0);
  on(LI.g); poseLogo(LI, LG.cx, LG.cy, LG.w);
  for (const [grp, tb, px] of [[LI.qg, T.b1, QX], [LI.rg, T.b2, RX]]) {
    const sp = t < tb ? 0 : spring(t, tb, 2.8, 0.32);
    const by = (LG.cy - BASE) / 100 / (LG.w / 100);   // baseline in logo units
    grp.visible = t >= tb;
    grp.position.set(0, by * (1 - sp), 0); grp.scale.set(1 + 0.1 * (1 - sp), Math.max(0.001, sp), 1);
    grp.rotation.y = 0.5 * (1 - E.outCubic(prog(t, tb, tb + 0.4))) * (grp === LI.qg ? -1 : 1);
  }
  // impact rings on the floor
  RINGS.forEach((rg, j) => { const tb = [T.b1, T.b2, T.land][j], k = prog(t, tb, tb + 0.4); if (t < tb || k >= 1) return; on(rg); rg.position.set(X([QX, RX, DOTF[0]][j]), Y(BASE) + 0.01, 0); rg.scale.setScalar(0.8 + 2.6 * E.outExpo(k)); rg.material.opacity = 0.6 * (1 - k); });
  const d = dotIntro(t);
  const pre = 1 + 0.35 * E.inCubic(prog(t, 1.8, T.week));
  on(PEB); posePebble(PEB, d.x, d.y + DOTR, DOTR * pre, d.sx, d.sy); PEB.children[0].rotation.z = d.roll;
  render3D(c);
}

// ---------------------------------------------------------------- 2.00–5.50  the week
const CAL_Y = 1650, calX = k => CX + (k - 3) * 128;
function drawDay(c, i, t) {
  const d = DAYS[i], lt = t - dayT(i);
  c.fillStyle = d.bg; c.fillRect(0, 0, W, H);
  if (d.bg === P.Mel) { for (let k = 0; k < 900; k++) { c.fillStyle = hash(k * 3.1) < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)'; c.fillRect(hash(k) * W, hash(k + 0.3) * H, 3, 2); } }
  grid(c, d.fg, 0.08);
  hud(c, d.fg, 'QAZAQ REPUBLIC', `0${i + 1} / 07`);
  const size = Math.min(250, 980 / (wordLayout(c, d.name, 100).tw / 100));
  drawWord(c, d.name, d.anim, lt, CX, 560, size, d.fg);
  const sk = E.outCubic(prog(lt, 0.12, 0.3));
  c.save(); c.globalAlpha = sk; c.font = MONO(700, 30); c.letterSpacing = '10px'; c.fillStyle = d.fg; c.textAlign = 'center'; c.fillText(d.ru, CX, 650 + 16 * (1 - sk)); c.restore();
  // calendar rings (2D)
  for (let k = 0; k < 7; k++) {
    c.strokeStyle = col(d.fg, 0.5); c.lineWidth = 3; c.beginPath(); c.arc(calX(k), CAL_Y, 40, 0, TAU); c.stroke();
    if (k < i) { c.fillStyle = col(d.fg, 0.16); c.beginPath(); c.arc(calX(k), CAL_Y, 40, 0, TAU); c.fill(); }
    if (k !== i) { c.font = MONO(700, 26); c.fillStyle = col(d.fg, 0.75); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(INIT[k], calX(k), CAL_Y + 1); c.textBaseline = 'alphabetic'; }
  }
  // 3D: the garment and the hopping pebble
  resetFrame();
  wallC.material.color.set(darken(d.bg, 0.55)); wallC.material.opacity = d.bg === P.OW || d.bg === P.Mel ? 0.22 : 0.32;
  const sp = spring(lt, 0.03, 2.2, 0.36);
  const g = on(GARM[i]);
  const s = 0.55 + 0.45 * sp;
  g.position.set(0, Y(1110) - 0.6 * (1 - sp) + 0.06 * Math.sin(t * 2.4 + i), 0.3);
  g.rotation.set(0.1 * Math.sin(t * 1.3 + i) - 0.25 * (1 - sp), (i % 2 ? 1 : -1) * 1.5 * (1 - sp) + 0.3 * Math.sin(t * 1.7 + i * 0.7), (i % 2 ? -1 : 1) * 0.05 * Math.sin(t * 2 + i));
  g.scale.setScalar(s);
  // pebble hop along the calendar
  const k = E.inOutCubic(prog(lt, 0, 0.2));
  const x = i === 0 ? calX(0) : lerp(calX(i - 1), calX(i), k), hop = i === 0 ? 0 : 110 * 4 * k * (1 - k);
  const [sx, sy] = landSquash(lt, 0.2), s0 = i === 0 ? E.outBack(prog(lt, 0, 0.2)) : 1;
  PEBC.children[0].material = PEBC.userData.mats[i];
  on(PEBC); posePebble(PEBC, x, CAL_Y + 40 - hop, 40 * Math.max(0.001, s0), sx, sy, 0.2); PEBC.children[0].rotation.z = -k * Math.PI;
  render3D(c);
  c.save(); c.globalAlpha = clamp((lt - 0.18) * 8); c.font = MONO(700, 26); c.fillStyle = d.bg === P.Y || d.acc === P.W ? d.bg : (d.acc === P.Y ? P.Nv : P.W); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(INIT[i], calX(i), CAL_Y + 1); c.restore();
}
function wipeClip(c, i, p) {
  c.beginPath();
  const R = 2300 * p;
  switch (i) {
    case 0: c.arc(DOTF[0], DOTF[1], R, 0, TAU); break;
    case 1: c.rect(0, H * (1 - p), W, H * p); break;
    case 2: c.moveTo(0, 0); c.lineTo(2 * W * p + 400, 0); c.lineTo(2 * W * p - 900, H); c.lineTo(0, H); break;
    case 3: c.arc(CX, CAL_Y, R, 0, TAU); break;
    case 4: for (let k = 0; k < 6; k++) { const pk = clamp(p * 1.6 - k * 0.12); c.rect(k * 180, 0, 180, H * pk); } break;
    case 5: { const w = W * 1.4 * p, h = H * 1.2 * p; c.roundRect(CX - w / 2, CY - h / 2, w, h, Math.min(w, h) / 2 * (1 - p) + 1); } break;
    case 6: c.rect(W * (1 - p), 0, W * p, H); break;
  }
}
function shotWeek(c, t) {
  const i = Math.min(6, Math.floor((t - T.week) / 0.5));
  const lt = t - dayT(i), p = E.outExpo(prog(lt, 0, 0.2));
  if (p < 1) {
    if (i === 0) shotIntro(c, t); else drawDay(c, i - 1, t);
    c.save(); wipeClip(c, i, p); c.clip(); drawDay(c, i, t); c.restore();
  } else drawDay(c, i, t);
}

// ---------------------------------------------------------------- 5.50–7.50  a relief Bauhaus wall, the pill, the badge
const TILE_COLS = [P.B, P.Y, P.Bur, P.Mel, P.Nv, P.OW, P.Kh];
const TILES = [];
let WALL = null, PILL = null, PILLDIM = '', PILL_MAT = null;
function motifShape(m, s) {
  const h = s / 2, sh = new THREE.Shape();
  switch (m) {
    case 0: sh.moveTo(-h, h); sh.absarc(-h, h, s * 0.98, -Math.PI / 2, 0, false); sh.lineTo(-h, h); break;     // quarter disc from a corner
    case 1: sh.absarc(0, -h, h * 0.98, 0, Math.PI, false); sh.lineTo(h * 0.98, -h); break;                       // half disc on the bottom edge
    case 2: sh.absarc(0, 0, h * 0.74, 0, TAU, false); break;                                                     // disc
    case 3: sh.moveTo(-h, h); sh.lineTo(h, -h); sh.lineTo(-h, -h); sh.lineTo(-h, h); break;                      // triangle
    case 4: { const shapes = []; for (let j = 0; j < 4; j++) { const b = new THREE.Shape(); const y0 = h - j * s / 4 - s / 8 * 0.2; b.moveTo(-h * 0.98, y0); b.lineTo(h * 0.98, y0); b.lineTo(h * 0.98, y0 - s / 8); b.lineTo(-h * 0.98, y0 - s / 8); shapes.push(b); } return shapes; }
    case 5: { const a = new THREE.Shape(); a.absarc(-h, 0, h * 0.98, -Math.PI / 2, Math.PI / 2, false); const b = new THREE.Shape(); b.absarc(h, 0, h * 0.98, Math.PI / 2, Math.PI * 1.5, false); return [a, b]; }
  }
  return [sh];
}
function buildWall() {
  const s = 1.72, matCache = {};
  const mat = c => matCache[c] || (matCache[c] = clay(c, { roughness: 0.5, clearcoat: 0.25 }));
  const tileGeo = new RoundedBoxGeometry(s, s, 0.34, 4, 0.08);
  const motifGeo = [0, 1, 2, 3, 4, 5].map(m => { const g = new THREE.ExtrudeGeometry(motifShape(m, s), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4, curveSegments: 28 }); g.translate(0, 0, 0.17); return g; });
  WALL = reg(new THREE.Group());
  for (let r = 0; r < 11; r++) for (let q = 0; q < 6; q++) {
    const i = r * 6 + q;
    const bgc = TILE_COLS[Math.floor(hash(i * 1.7) * TILE_COLS.length)];
    let fgc = TILE_COLS[Math.floor(hash(i * 2.9 + 1) * TILE_COLS.length)]; if (fgc === bgc) fgc = bgc === P.OW ? P.B : P.OW;
    const m = Math.floor(hash(i * 5.3) * 6);
    const g = new THREE.Group();
    const tm = new THREE.Mesh(tileGeo, mat(bgc)), mm = new THREE.Mesh(motifGeo[m], mat(fgc));
    g.add(tm); g.add(mm);
    const x = q * 180 + 90, y = r * 180 - 30 + 90;
    g.userData = { x, y, i, r, q, rot0: Math.floor(hash(i * 7.1) * 4) * Math.PI / 2 };
    WALL.add(g); TILES.push(g);
  }
  shadowsOn(WALL);
  PILL_MAT = candy(P.B);
  PILL = reg(new THREE.Mesh(new THREE.BufferGeometry(), PILL_MAT)); PILL.castShadow = true;
}
function pillGeo(wPx, hPx) {
  const key2 = `${wPx.toFixed(1)}x${hPx.toFixed(1)}`;
  if (key2 === PILLDIM) return;
  PILLDIM = key2;
  const w = wPx / 100, h = hPx / 100, r = Math.min(w, h) / 2 - 0.001, sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-w / 2 + r, h / 2); sh.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 8, curveSegments: 40 });
  g.translate(0, 0, -0.52);
  PILL.geometry.dispose(); PILL.geometry = g;
}
function shotDrop(c, t) {
  c.fillStyle = P.OW; c.fillRect(0, 0, W, H);
  resetFrame();
  wallC.position.z = -0.9; wallC.material.color.set('#1a1a40'); wallC.material.opacity = 0.18;
  key.position.set(-7, 10, 12);
  // the wall breathes in 3D
  on(WALL); WALL.rotation.set(0.12 * (1 - E.outCubic(prog(t, T.drop, T.drop + 1.2))) + 0.03 * Math.sin(t * 1.4), 0.05 * Math.sin(t * 1.1), 0);
  WALL.position.set(0, 0, -0.6);
  for (const g of TILES) {
    const { x, y, i, r, q, rot0 } = g.userData;
    const dist = Math.hypot(x - CX, y - CY) / 1100;
    const ts = T.drop + dist * 0.28, k = prog(t, ts, ts + 0.3);
    g.visible = k > 0;
    if (!g.visible) continue;
    let rot = rot0, wob = 0;
    for (const b of [T.jaqsy, T.kunder, T.badge]) { const kb = prog(t, b + dist * 0.12, b + dist * 0.12 + 0.22); rot += ((r + q) % 2 ? 1 : -1) * Math.PI / 2 * E.outBack(kb); wob += Math.sin(Math.PI * kb); }
    g.position.set(X(x), Y(y), -2.5 * (1 - E.outCubic(k)));
    g.rotation.set(0.35 * wob * ((q % 2) ? 1 : -1), 0.35 * wob * ((r % 2) ? 1 : -1), rot);
    g.scale.setScalar(Math.max(0.001, E.outBack(k)));
  }
  // the pill: dot → pill → circle
  const grow = E.outExpo(prog(t, T.band, T.band + 0.25)), toCirc = E.inOutCubic(prog(t, T.badge, T.badge + 0.25));
  const pop = E.outBack(prog(t, T.band - 0.1, T.band));
  const bw = lerp(lerp(150, 1000, grow), 600, toCirc) * pop, bh = lerp(lerp(150, 300, grow), 600, toCirc) * pop;
  if (t >= T.band - 0.1) { pillGeo(Math.max(bw, 2), Math.max(bh, 2)); on(PILL); PILL.position.set(0, 0, 1.25); PILL.rotation.set(0.05 * Math.sin(t * 2), -0.08 * Math.sin(t * 1.6), 0); }
  if (t >= T.badge + 0.15) { on(PEBB); const ds = E.outBack(prog(t, T.badge + 0.15, T.badge + 0.35)) * (1 + 0.06 * Math.sin((t - T.badge) * TAU * 2)); posePebble(PEBB, CX, CY + 92 * ds, 92 * Math.max(0.001, ds), 1, 1, 1.4); PEBB.rotation.y = (t - T.badge) * 2; }
  render3D(c);
  // words on the pill (2D, crisp)
  c.save(); c.beginPath(); c.roundRect(CX - bw / 2, CY - bh / 2, Math.max(bw, 1), Math.max(bh, 1), Math.max(1, bh / 2)); c.clip();
  const word = (txt, t0, t1) => {
    if (t < t0 || t > t1 + 0.2) return;
    const kin = E.outExpo(prog(t, t0, t0 + 0.22)), kout = E.inExpo(prog(t, t1, t1 + 0.18));
    c.font = ITB(190); c.letterSpacing = '-6px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(0,0,40,0.25)'; c.fillText(txt, CX + 6, CY + 74 + 260 * (1 - kin) - 300 * kout);
    c.fillStyle = P.W; c.fillText(txt, CX, CY + 66 + 260 * (1 - kin) - 300 * kout);
  };
  word('jaqsy', T.jaqsy, T.kunder - 0.02);
  word('kúnder.', T.kunder, T.badge - 0.05);
  c.restore();
  if (t >= T.badge) {
    const k = E.outCubic(prog(t, T.badge + 0.1, T.badge + 0.35));
    c.save(); c.translate(CX, CY); c.rotate((t - T.badge) * 1.6 - 0.6 * (1 - k)); c.globalAlpha = k;
    const txt = 'BÁRI JAQSY BOLADY · BÁRI JAQSY BOLADY · '; c.font = MONO(700, 40); c.fillStyle = P.W; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < txt.length; i++) { const a = i / txt.length * TAU; c.save(); c.rotate(a); c.translate(0, -238); c.fillText(txt[i], 0, 0); c.restore(); }
    c.restore();
  }
  const ck = E.outCubic(prog(t, T.jaqsy + 0.1, T.jaqsy + 0.3));
  if (ck > 0) {
    const txt = t < T.badge ? 'JAQSY KÚNDER' : 'BÁRI JAQSY BOLADY';
    c.save(); c.font = MONO(700, 30); c.letterSpacing = '10px'; const w = c.measureText(txt).width + 70;
    const y = t < T.badge ? CY + 240 : CY + 390;
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.roundRect(CX - w / 2 + 6, y - 34, w * ck, 64, 12); c.fill();
    c.fillStyle = P.Ink; c.beginPath(); c.roundRect(CX - w / 2, y - 40, w * ck, 64, 12); c.fill();
    c.fillStyle = P.W; c.textAlign = 'center'; c.globalAlpha = ck; c.fillText(txt, CX + 5, y + 2); c.restore();
  }
}

// ---------------------------------------------------------------- 7.50–10.00  FINALE
const FL = { w: 640, cx: 540, cy: 860 };
const FS = FL.w / 47, FX0 = FL.cx - FL.w / 2, FY0 = FL.cy - 16 * FS;
const FDOT = [FX0 + LOGO.dc[0] * FS, FY0 + LOGO.dc[1] * FS], FDR = LOGO.dr * FS;
const CONF = { n: 72, meshes: [], d: [] };
let YPILL = null, LABEL = null;
function buildFinale() {
  const geos = [new THREE.SphereGeometry(1, 24, 16), new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2), new RoundedBoxGeometry(1.6, 0.8, 0.8, 3, 0.18), new THREE.TorusGeometry(0.8, 0.32, 14, 32)];
  const cols = [P.Y, P.W, P.Mel, P.Bur, P.Cr, P.Y];
  const per = CONF.n / geos.length;
  geos.forEach((g, gi) => {
    const m = reg(new THREE.InstancedMesh(g, clay('#ffffff', { roughness: 0.35, clearcoat: 0.6 }), per));
    m.castShadow = true;
    for (let k = 0; k < per; k++) m.setColorAt(k, new THREE.Color(cols[(k + gi) % cols.length]));
    m.instanceColor.needsUpdate = true;
    CONF.meshes.push(m);
  });
  for (let i = 0; i < CONF.n; i++) CONF.d.push({ a: -Math.PI / 2 + (hash(i * 3.3) - 0.5) * 2.4, v: 7 + 13 * hash(i * 1.9), s: 0.1 + 0.16 * hash(i * 7.7), z: (hash(i * 4.1) - 0.75) * 4, ax: new THREE.Vector3(hash(i) - 0.5, hash(i + 1) - 0.5, hash(i + 2) - 0.5).normalize(), spin: 3 + 8 * hash(i * 5.5) });
  // yellow pill
  const w = 4.6, h = 0.82, r = h / 2, sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-w / 2 + r, h / 2); sh.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 6, curveSegments: 30 }); pg.translate(0, 0, -0.3);
  YPILL = reg(new THREE.Mesh(pg, candy(P.Y))); YPILL.castShadow = true;
  // woven label
  const lc = mk(600, 240), l = lc.getContext('2d');
  l.fillStyle = '#ffffff'; l.fillRect(0, 0, 600, 240);
  l.strokeStyle = col(P.B, 0.35); l.setLineDash([16, 12]); l.lineWidth = 4; l.strokeRect(24, 24, 552, 192); l.setLineDash([]);
  logo(l, 160, 120, 220, P.B);
  l.font = MONO(700, 36); l.fillStyle = P.B; l.textAlign = 'left'; l.letterSpacing = '4px'; l.fillText('ALMATY', 308, 108); l.fillText('EST. 2016', 308, 160);
  for (let k = 0; k < 2200; k++) { l.fillStyle = hash(k) < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.3)'; l.fillRect(hash(k * 1.3) * 600, hash(k * 2.7) * 240, 3, 1); }
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
  const side = clay('#ffffff', { roughness: 0.8, clearcoat: 0 });
  const front = new THREE.MeshPhysicalMaterial({ map: lt, roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') });
  LABEL = reg(new THREE.Mesh(new RoundedBoxGeometry(3.0, 1.2, 0.08, 3, 0.03), [side, side, side, side, front, side])); LABEL.castShadow = true;
}
function shotFin(c, t) {
  c.fillStyle = P.B; c.fillRect(0, 0, W, H);
  grid(c, P.W, 0.08);
  resetFrame();
  wallC.position.z = -1.4; wallC.material.color.set('#05043d'); wallC.material.opacity = 0.42;
  key.position.set(-6, 10, 13);
  on(LF.g); poseLogo(LF, FL.cx, FL.cy, FL.w);
  for (const [grp, dir, t0] of [[LF.qg, -1, T.fin + 0.05], [LF.rg, 1, T.fin + 0.12]]) {
    const k = E.outExpo(prog(t, t0, t0 + 0.32));
    grp.visible = k > 0;
    grp.position.set(dir * 1.5 * (1 - k), 0, 0); grp.rotation.set(0, -dir * 1.4 * (1 - k), 0);
  }
  const sway = prog(t, T.finLand, T.finLand + 0.6);
  LF.g.rotation.set(0.06 * Math.sin(t * 1.5) * sway, 0.18 * Math.sin((t - T.finLand) * 1.8) * sway, 0);
  // the pebble lands as the period
  if (t >= T.fin + 0.2) {
    let y, sx = 1, sy = 1;
    if (t < T.finLand) { const k = prog(t, T.fin + 0.2, T.finLand); y = lerp(-200, FDOT[1], E.inQuad(k)); sy = 1 + 0.3 * k; sx = 1 - 0.12 * k; }
    else { y = FDOT[1] - 120 * Math.max(0, Math.sin(Math.PI * prog(t, T.finLand + 0.02, T.name))) * (1 - prog(t, T.finLand, T.name)); [sx, sy] = landSquash(t, T.finLand); }
    const pulse = 1 + [9.0, 9.5].reduce((s, b) => s + (t >= b ? 0.12 * Math.exp(-(t - b) * 10) : 0), 0);
    on(PEBF); posePebble(PEBF, FDOT[0], y + FDR, FDR * pulse, sx, sy, 0.05); PEBF.rotation.y = 0.3 * Math.sin(t * 2);
  }
  // 3D confetti
  if (t >= T.finLand) {
    const d = t - T.finLand, o = new THREE.Object3D();
    CONF.meshes.forEach((m, mi) => { on(m); const per = CONF.n / CONF.meshes.length;
      for (let k = 0; k < per; k++) { const p = CONF.d[mi * per + k];
        const vx = Math.cos(p.a) * p.v, vy = -Math.sin(p.a) * p.v;
        o.position.set(X(FDOT[0]) + vx * d * 0.55, Y(FDOT[1]) + vy * d * 0.55 - 7 * d * d, p.z * Math.min(1, d * 3));
        o.quaternion.setFromAxisAngle(p.ax, p.spin * d + k);
        o.scale.setScalar(p.s * clamp(d * 12) * clamp(2.1 - d));
        o.updateMatrix(); m.setMatrixAt(k, o.matrix); }
      m.instanceMatrix.needsUpdate = true; });
  }
  // yellow pill + woven label
  const tk = E.outBack(prog(t, T.tag, T.tag + 0.3));
  if (tk > 0) { on(YPILL); YPILL.position.set(0, Y(1240), 0.4); YPILL.scale.setScalar(Math.max(0.001, tk)); YPILL.rotation.set(0.1 * Math.sin(t * 2), 0.12 * Math.sin(t * 1.5), 0); }
  const lk = prog(t, T.label, T.label + 0.35);
  if (lk > 0) { on(LABEL); LABEL.position.set(0, Y(1450), 0.3); LABEL.rotation.set(-Math.PI / 2 * (1 - E.outBack(lk)), 0.15 * Math.sin(t * 1.6), -0.04); }
  render3D(c);
  // type
  c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const n = 'Qazaq Republic';
  c.save(); c.beginPath(); c.rect(0, 1060, W, 130); c.clip(); c.font = DISP(86); c.letterSpacing = '-1px'; c.fillStyle = P.W;
  const wsN = [...n].map(ch => c.measureText(ch).width), twN = wsN.reduce((a, b) => a + b, 0); let x = CX - twN / 2; c.textAlign = 'left';
  for (let i = 0; i < n.length; i++) { const k = E.outExpo(prog(t, T.name + i * 0.02, T.name + 0.3 + i * 0.02)); c.fillText(n[i], x, 1150 + 120 * (1 - k)); x += wsN[i]; }
  c.restore();
  if (tk > 0) { c.save(); c.translate(CX, 1240 + 16); c.scale(tk, tk); c.font = ITB(54); c.letterSpacing = '-1px'; c.fillStyle = P.B; c.textAlign = 'center'; c.fillText('jaqsy kúnder.', 0, 2); c.restore(); }
  const hk = E.outCubic(prog(t, T.handles, T.handles + 0.3));
  c.globalAlpha = hk; c.textAlign = 'center'; c.font = MONO(700, 36); c.letterSpacing = '2px'; c.fillStyle = P.W; c.fillText('@qazaq.republic', CX, 1690 + 20 * (1 - hk));
  c.font = MONO(500, 28); c.fillStyle = col(P.W, 0.7); c.fillText('qazaqrepublic.com', CX, 1740 + 20 * (1 - hk));
  c.restore();
  hud(c, P.W, 'QAZAQ REPUBLIC', 'JAQSY KÚNDER', prog(t, T.handles, T.handles + 0.3));
}

// ---------------------------------------------------------------- frame
const SHOTS = [[0, shotIntro], [T.week, shotWeek], [T.drop, shotDrop], [T.fin, shotFin]];
const HITS = [[T.b1, 8, 0.12], [T.b2, 8, 0.12], [T.land, 12, 0.16], ...DAYS.map((d, i) => [dayT(i), 7, 0.12]), [T.drop, 10, 0.16], [T.jaqsy, 9, 0.12], [T.kunder, 9, 0.12], [T.badge, 9, 0.12], [T.finLand, 16, 0.22]];
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of HITS) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d; const f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  let idx = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) idx = i;
  SHAKE = shakeAt(t);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(SHAKE[0], SHAKE[1]);
  const wipeFrom = (tb, prevFn, cx, cy, r0) => {
    const p = E.outExpo(prog(t, tb, tb + 0.24));
    if (p >= 1) return false;
    prevFn(ctx, t); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, lerp(r0, 2300, p), 0, TAU); ctx.clip(); SHOTS[idx][1](ctx, t); ctx.restore(); return true;
  };
  let done = false;
  if (idx === 2) done = wipeFrom(T.drop, (c, tt) => drawDay(c, 6, tt), calX(6), CAL_Y, 40);
  if (idx === 3) done = wipeFrom(T.fin, shotDrop, CX, CY, 92);
  if (!done) SHOTS[idx][1](ctx, t);
  ctx.restore();
  const k0 = 1 - prog(t, 0, 0.06);
  if (k0 > 0) { ctx.fillStyle = `rgba(245,245,253,${k0})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet (same as the flat version)
function buildEvents() {
  ev(0.05, 'fall', { end: T.b1 });
  ev(T.b1, 'bounce', { i: 0 }); ev(T.b2, 'bounce', { i: 1 }); ev(T.land, 'bounce', { i: 2 });
  ev(T.b1, 'stamp', { i: 0 }); ev(T.b2, 'stamp', { i: 1 });
  ev(T.land + 0.05, 'caption');
  ev(1.8, 'swell', { end: T.week });
  DAYS.forEach((d, i) => { ev(dayT(i), 'day', { i, anim: d.anim }); ev(dayT(i) + 0.2, 'hop', { i }); ev(dayT(i) + 0.05, 'item', { i }); });
  ev(T.drop, 'tiles');
  ev(T.band - 0.1, 'band');
  ev(T.jaqsy, 'word', { i: 0 }); ev(T.kunder, 'word', { i: 1 });
  ev(T.badge, 'badge');
  ev(T.fin, 'wipe');
  ev(T.fin + 0.05, 'slide', { i: 0 }); ev(T.fin + 0.12, 'slide', { i: 1 });
  ev(T.fin + 0.2, 'dotFall', { end: T.finLand });
  ev(T.finLand, 'final');
  for (let i = 0; i < 14; i++) ev(T.name + i * 0.02, 'tick', { i });
  ev(T.tag, 'pop'); ev(T.handles, 'tick2'); ev(T.label, 'label');
  ev(9.0, 'pulse'); ev(9.5, 'pulse');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = [
    ['Inter Display', '/@fonts/opentype/inter/InterDisplay-Black.otf', '900', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-BlackItalic.otf', '900', 'italic'],
    ['JB Mono', '/fonts/JetBrainsMono-Medium.ttf', '500', 'normal'],
    ['JB Mono', '/fonts/JetBrainsMono-Bold.ttf', '700', 'normal'],
    ['Graduate', '/fonts/Graduate-Regular.ttf', '400', 'normal'],
  ];
  for (const [fam, url, wt, st] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt, style: st }); await f.load(); document.fonts.add(f); }
  const svg = await (await fetch('/assets/qr_logo.svg')).text();
  const ds = [...svg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  LOGO.q = new Path2D(ds[0]); LOGO.dot = new Path2D(ds[1]); LOGO.r = new Path2D(ds[2]);
  buildLogoGeo(svg);
  LI = makeLogo(clay(P.B, { roughness: 0.38, clearcoat: 0.5 }));
  LF = makeLogo(clay('#ffffff', { roughness: 0.4, clearcoat: 0.4 }));
  PEB = makePebble(candy(P.B));
  PEBF = makePebble(candy('#ffffff'));
  PEBB = makePebble(candy('#ffffff'));
  PEBC = makePebble(candy(P.Y)); PEBC.userData.mats = DAYS.map(d => candy(d.acc));
  for (let j = 0; j < 3; j++) { const rg = reg(new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: P.B, transparent: true, opacity: 0.6, depthWrite: false }))); rg.rotation.x = -Math.PI / 2; rg.scale.setScalar(1); RINGS.push(rg); }
  for (let i = 0; i < 7; i++) inflate(i);
  buildWall();
  buildFinale();
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
