// Qazaq Republic — 10 s vertical brand reel (1080×1920, 60 fps) for @qazaq.republic.
// A different style from the street reels: clean flat Swiss / Bauhaus motion
// graphics, no grain. The hero is the dot from the «qr.» wordmark: it bounces
// the logo together, then hops through a week in Latin Kazakh (one day per
// beat, each with its own colour from the brand's palette, its own kinetic
// type trick, its own wipe and a flat-drawn garment with the little blue
// «qr» label), turns into a Bauhaus tile grid for «jaqsy kúnder.», a
// «Bári jaqsy bolady» badge, and lands as the period of the logo.
// This cut: everything is flat 2D except the seven garments, which are real-time
// 3D (three.js) with fabric normals, drape folds, glossy raised prints and living cloth.
// Every frame is a function of t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
const X = px => (px - CX) / 100, Y = py => (CY - py) / 100;   // pixel → world at z = 0
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
const DISP = s => `900 ${s}px "Inter Display"`;
const ITB = s => `italic 900 ${s}px "Inter"`;
const MONO = (w, s) => `${w} ${s}px "JB Mono"`;
const VAR = s => `400 ${s}px "Graduate"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

const out = document.getElementById('c');
const ctx = out.getContext('2d');
const LAYER = mk(W, H), lctx = LAYER.getContext('2d');   // previous-shot layer for wipes
const tmp = mk(W, H), tctx = tmp.getContext('2d');

// ---------------------------------------------------------------- the «qr.» wordmark (vector, three parts)
const LOGO = { q: null, r: null, dot: null, dc: [41.49, 18.88], dr: 4.97 };
function logoPart(c, part, x0, y0, s, color) {   // x0,y0: top-left of the 47×32 box; s: px per unit
  c.save(); c.translate(x0, y0); c.scale(s, s); c.fillStyle = color; c.fill(LOGO[part]); c.restore();
}
function logo(c, cx, cy, w, color) {
  const s = w / 47, x0 = cx - w / 2, y0 = cy - 16 * s;
  logoPart(c, 'q', x0, y0, s, color); logoPart(c, 'r', x0, y0, s, color); logoPart(c, 'dot', x0, y0, s, color);
}
// little woven label, as sewn on every QR garment
function wovenLabel(c, x, y, w, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const h = w * 0.56; c.fillStyle = P.B; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.08); c.fill();
  logo(c, 0, 0, w * 0.62, P.W); c.restore();
}

// ---------------------------------------------------------------- background system
function grid(c, color, a = 0.08) {
  c.save(); c.strokeStyle = col(color, a); c.lineWidth = 2;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * 180, 0); c.lineTo(i * 180, H); c.stroke(); }
  for (let j = 1; j < 11; j++) { c.beginPath(); c.moveTo(0, j * 180); c.lineTo(W, j * 180); c.stroke(); }
  c.restore();
}
function hud(c, color, left, right, k = 1) {
  c.save(); c.globalAlpha = k; c.font = MONO(700, 24); c.letterSpacing = '4px'; c.fillStyle = col(color, 0.8); c.textBaseline = 'alphabetic';
  c.textAlign = 'left'; c.fillText(left, 64, 110); c.textAlign = 'right'; c.fillText(right, W - 64, 110);
  c.strokeStyle = col(color, 0.5); c.lineWidth = 2;
  for (const [x, y] of [[64, 140], [W - 64, 140]]) { c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.moveTo(x, y - 12); c.lineTo(x, y + 12); c.stroke(); }
  c.restore();
}

// ---------------------------------------------------------------- garment drawings (flat; used as 3D textures and silhouettes)
function archText(c, txt, cx, cy, r, size, color, font = VAR) {
  c.save(); c.font = font(size); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const span = Math.min(1.5, txt.length * size * 0.62 / r);
  for (let i = 0; i < txt.length; i++) { const a = -Math.PI / 2 - span / 2 + span * (i + 0.5) / txt.length; c.save(); c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.rotate(a + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
  c.restore();
}
const GITEMS = {
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
// ---------------------------------------------------------------- 3D garments (the only 3D in this cut)
// Flat drawings (prints, ribs, labels) become textures; the silhouette becomes a
// softly padded body with vertical drape folds, knit / fleece / twill / rib
// normal maps, slightly raised glossy prints, a ripple when the garment lands
// and a slow breathing sway. Studio light: warm key, cool rim, sheen.
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PERM = (() => { const p = [...Array(256).keys()], r = rng(7); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
const grad2 = (h, x, y) => { switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; } };
function perlin(x, y) {
  const X0 = Math.floor(x), Y0 = Math.floor(y), Xi = X0 & 255, Yi = Y0 & 255; x -= X0; y -= Y0;
  const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10), a = PERM[Xi] + Yi, b = PERM[Xi + 1] + Yi;
  return lerp(lerp(grad2(PERM[a], x, y), grad2(PERM[b], x - 1, y), u), lerp(grad2(PERM[a + 1], x, y - 1), grad2(PERM[b + 1], x - 1, y - 1), u), v);
}
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.LinearToneMapping; R3.toneMappingExposure = 1.0;
R3.outputColorSpace = THREE.SRGBColorSpace; R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 300);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
cam.position.set(0, 0, CAMZ); cam.lookAt(0, 0, 0);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight('#ffffff', '#e6e4ee', 0.85));
const key = new THREE.DirectionalLight('#fff3e6', 2.2);
key.position.set(-6, 9, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9;
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 11, bottom: -11, near: 1, far: 60 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
scene.add(key); scene.add(key.target);
const rimL = new THREE.DirectionalLight('#dce6ff', 1.7); rimL.position.set(7, 5, -7); scene.add(rimL);
const fillL = new THREE.DirectionalLight('#ffffff', 0.4); fillL.position.set(5, -4, 8); scene.add(fillL);
const wallC = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), new THREE.ShadowMaterial({ opacity: 0.28 }));
wallC.position.z = -1.8; wallC.receiveShadow = true; scene.add(wallC);

// knit / weave height patterns → tangent-space normal maps
function fabricNormal(kind) {
  const N = 512, h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    if (kind === 'jersey' || kind === 'chunky') {
      const cw = kind === 'chunky' ? 32 : 16, chh = kind === 'chunky' ? 26 : 13;
      const u = (x % cw) / cw - 0.5, w = (y % chh) / chh - 0.5;
      for (const sgn of [-1, 1]) { const lx = u - sgn * 0.22, rx = lx * Math.cos(0.55 * sgn) - w * Math.sin(0.55 * sgn), ry = lx * Math.sin(0.55 * sgn) + w * Math.cos(0.55 * sgn); v = Math.max(v, Math.exp(-(rx * rx) / 0.012 - (ry * ry) / 0.09)); }
      if (kind === 'chunky') v = v * 0.7 + 0.3 * (0.5 + 0.5 * Math.cos(TAU * x / 32));
    } else if (kind === 'rib') v = Math.pow(0.5 + 0.5 * Math.sin(TAU * x / 12), 0.7);
    else if (kind === 'twill') v = 0.5 + 0.5 * Math.sin(TAU * (x + y) / 8);
    else if (kind === 'canvas') v = 0.5 + 0.5 * Math.sin(TAU * x / 10) * Math.sin(TAU * y / 10) * ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? 1 : -1);
    else v = 0.5 + 0.35 * perlin(x / 9, y / 9) + 0.15 * perlin(x / 3.3 + 40, y / 3.3);   // fleece
    h[y * N + x] = v;
  }
  const cv = mk(N, N), c = cv.getContext('2d'), id = c.createImageData(N, N), st = kind === 'fleece' ? 2.2 : 3.2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hl = h[y * N + (x + N - 1) % N], hr = h[y * N + (x + 1) % N], hu = h[((y + N - 1) % N) * N + x], hd = h[((y + 1) % N) * N + x];
    let nx = (hl - hr) * st, ny = (hd - hu) * st, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const k = (y * N + x) * 4; id.data[k] = (nx * 0.5 + 0.5) * 255; id.data[k + 1] = (ny * 0.5 + 0.5) * 255; id.data[k + 2] = (nz * 0.5 + 0.5) * 255; id.data[k + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
  return tex;
}
// per-garment look: padding, drape, fabric
const GSPEC = {
  tee: { A: 0.4, k: 0.48, fold: 1.7, fab: 'jersey', rep: [4.2, 4.6], ns: 0.2 },
  hoodie: { A: 0.55, k: 0.55, fold: 1.6, fab: 'fleece', rep: [3.2, 3.5], ns: 0.38, melange: true },
  cap: { A: 0.9, k: 0.75, fold: 0.25, fab: 'twill', rep: [3.0, 3.3], ns: 0.5 },
  tote: { A: 0.34, k: 0.45, fold: 0.7, fab: 'canvas', rep: [3.4, 3.8], ns: 0.4 },
  sock: { A: 0.5, k: 0.45, fold: 0.4, fab: 'rib', rep: [2.8, 3.1], ns: 0.7 },
  sweat: { A: 0.46, k: 0.5, fold: 1.6, fab: 'fleece', rep: [3.2, 3.5], ns: 0.35 },
  beanie: { A: 0.85, k: 0.7, fold: 0.2, fab: 'chunky', rep: [2.3, 2.6], ns: 0.42 },
};
const GARM = [];
const TW = 720, TH = 800, TOX = 360, TOY = 400;   // template px; 100 px = 1 world unit
function buildGarment(i) {
  const d = DAYS[i], sp = GSPEC[d.item];
  // silhouette → distance field (¼ res)
  const MS = 4, mw = TW / MS, mh = TH / MS;
  const mc = mk(mw, mh), m = mc.getContext('2d'); m.scale(1 / MS, 1 / MS); m.translate(TOX, TOY); GITEMS[d.item](m, Object.assign({}, d, { ic: '#ffffff', print: false }));
  const a = m.getImageData(0, 0, mw, mh).data, D = new Float32Array(mw * mh);
  for (let k = 0; k < mw * mh; k++) D[k] = a[k * 4 + 3] > 127 ? 1e9 : 0;
  const d2 = Math.SQRT2;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const k = y * mw + x; if (!D[k]) continue; let v = D[k];
    if (x > 0) v = Math.min(v, D[k - 1] + 1); if (y > 0) v = Math.min(v, D[k - mw] + 1); if (x > 0 && y > 0) v = Math.min(v, D[k - mw - 1] + d2); if (x < mw - 1 && y > 0) v = Math.min(v, D[k - mw + 1] + d2); D[k] = v; }
  for (let y = mh - 1; y >= 0; y--) for (let x = mw - 1; x >= 0; x--) { const k = y * mw + x; if (!D[k]) continue; let v = D[k];
    if (x < mw - 1) v = Math.min(v, D[k + 1] + 1); if (y < mh - 1) v = Math.min(v, D[k + mw] + 1); if (x < mw - 1 && y < mh - 1) v = Math.min(v, D[k + mw + 1] + d2); if (x > 0 && y < mh - 1) v = Math.min(v, D[k + mw - 1] + d2); D[k] = v; }
  const samp = (px, py) => { const x = clamp(px / MS, 0, mw - 1), y = clamp(py / MS, 0, mh - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(mw - 1, x0 + 1), y1 = Math.min(mh - 1, y0 + 1), fx = x - x0, fy = y - y0;
    return (D[y0 * mw + x0] * (1 - fx) * (1 - fy) + D[y0 * mw + x1] * fx * (1 - fy) + D[y1 * mw + x0] * (1 - fx) * fy + D[y1 * mw + x1] * fx * fy) * MS / 100; };
  // textures: colour (with print), plain back, print mask → roughness + puff
  const S = 2;
  const draw = (o, scale) => { const cv = mk(TW * scale, TH * scale), c = cv.getContext('2d'); c.scale(scale, scale); c.translate(TOX, TOY); GITEMS[d.item](c, Object.assign({}, d, o)); return cv; };
  const fc = draw({}, S), bc = draw({ print: false }, S);
  if (sp.melange) for (const cv of [fc, bc]) { const c = cv.getContext('2d'); c.save(); c.globalCompositeOperation = 'source-atop'; const r = rng(3); for (let k = 0; k < 26000; k++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(60,60,70,0.16)'; c.fillRect(r() * cv.width, r() * cv.height, 1 + r() * 3, 1); } c.restore(); }
  const pr = draw({}, 1).getContext('2d').getImageData(0, 0, TW, TH).data;
  const ii = hx(d.ii), lb = hx(P.B);
  const isPrint = k => { const r = pr[k], g = pr[k + 1], b = pr[k + 2]; if (pr[k + 3] < 128) return 0; const di = Math.hypot(r - ii[0], g - ii[1], b - ii[2]), dl = Math.hypot(r - lb[0], g - lb[1], b - lb[2]); return di < 70 || (d.ic !== P.B && dl < 70) ? 1 : 0; };
  const rc = mk(TW, TH), rcx = rc.getContext('2d'), rid = rcx.createImageData(TW, TH), PM = new Uint8Array(TW * TH);
  for (let k = 0; k < TW * TH; k++) { const p = isPrint(k * 4); PM[k] = p; const v = p ? 120 : 245; rid.data[k * 4] = rid.data[k * 4 + 1] = rid.data[k * 4 + 2] = v; rid.data[k * 4 + 3] = 255; }
  rcx.putImageData(rid, 0, 0);
  const pmask = (px, py) => { let s = 0; for (const [ox, oy] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) { const x = clamp(Math.round(px + ox), 0, TW - 1), y = clamp(Math.round(py + oy), 0, TH - 1); s += PM[y * TW + x]; } return s / 5; };
  const nmap = fabricNormal(sp.fab);
  const mat = (cv, withPrint) => {
    const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const nm = nmap.clone(); nm.needsUpdate = true; nm.repeat.set(sp.rep[0], sp.rep[1]);
    const sheenC = new THREE.Color(d.ic).lerp(new THREE.Color('#ffffff'), 0.45);
    const o = { map, normalMap: nm, normalScale: new THREE.Vector2(sp.ns, sp.ns), roughness: 1, sheen: 0.6, sheenColor: sheenC, sheenRoughness: 0.45, alphaTest: 0.5, envMapIntensity: 0.5 };
    if (withPrint) { const rm = new THREE.CanvasTexture(rc); rm.colorSpace = THREE.NoColorSpace; o.roughnessMap = rm; }
    else o.roughness = 0.96;
    const mm = new THREE.MeshPhysicalMaterial(o);
    return [mm, new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 })];
  };
  const seed = i * 13.7;
  const mkGeo = sign => {
    const geo = new THREE.PlaneGeometry(TW / 100, TH / 100, 180, 200), pos = geo.attributes.position, n = pos.count;
    const base = new Float32Array(n), dist = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const x = pos.getX(k), y = pos.getY(k), px = x * 100 + TOX, py = TOY - y * 100, dd = samp(px, py);
      dist[k] = dd;
      if (dd <= 0.001) { base[k] = 0; continue; }
      const pad = sp.A * (1 - Math.exp(-dd / sp.k));
      const ridge = 1 - Math.abs(perlin(x * 0.9 + seed, y * 0.26 + seed * 0.3)) * 2.2;
      const drape = 0.075 * sp.fold * (ridge * ridge - 0.45) * clamp(dd / 0.55);
      const crinkle = 0.018 * perlin(x * 2.6 + seed, y * 2.6) * clamp(dd / 0.4);
      const puff = sign > 0 ? 0.016 * pmask(px, py) : 0;
      base[k] = sign * (pad + drape + crinkle + puff);
    }
    for (let k = 0; k < n; k++) pos.setZ(k, base[k]);
    if (sign < 0) { const idx = geo.index.array; for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k]; idx[k] = idx[k + 2]; idx[k + 2] = tmp; } }
    geo.computeVertexNormals();
    geo.userData = { base, dist, sign, last: -1 };
    return geo;
  };
  const [fm, fd] = mat(fc, true), [bm, bd] = mat(bc, false);
  const front = new THREE.Mesh(mkGeo(1), fm), back = new THREE.Mesh(mkGeo(-1), bm);
  front.customDepthMaterial = fd; back.customDepthMaterial = bd;
  for (const mm of [front, back]) { mm.castShadow = true; mm.receiveShadow = true; }
  const g = new THREE.Group(); g.add(front); g.add(back); g.visible = false; scene.add(g);
  GARM[i] = g;
}
// living fabric: a ripple when it lands + slow breathing
function deformGarment(g, lt, t) {
  for (const mesh of g.children) {
    const geo = mesh.geometry, { base, dist, sign } = geo.userData, pos = geo.attributes.position;
    const key2 = Math.round(t * 240);
    if (geo.userData.last === key2) continue;
    geo.userData.last = key2;
    const rt = lt - 0.16, amp = rt > 0 ? 0.11 * Math.exp(-rt * 4.2) : 0;
    for (let k = 0; k < pos.count; k++) {
      const dd = dist[k]; if (dd <= 0.001) continue;
      const x = pos.getX(k), y = pos.getY(k), r = Math.hypot(x, y - 0.6), f = clamp(dd / 0.5);
      let z = base[k];
      if (amp > 0) z += sign * amp * Math.sin(5.2 * r - 17 * rt) * f;
      z += sign * 0.022 * Math.sin(1.7 * t + y * 0.9 + x * 0.35) * f;
      pos.setZ(k, z);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  }
}
function renderGarment(c, i, t, d) {
  const lt = t - dayT(i);
  if (lt < 0.03) return;
  const sp = spring(lt, 0.03, 2.1, 0.38), s = 0.6 + 0.4 * sp;
  // soft contact shadow on the colour field
  c.save(); c.globalAlpha = 0.32 * clamp(sp); c.filter = 'blur(22px)'; c.fillStyle = darken(d.bg, 0.6); c.beginPath(); c.ellipse(CX + 20, 1470, 230 * s, 30 * s, 0, 0, TAU); c.fill(); c.restore();
  for (const g of GARM) g.visible = false;
  const g = GARM[i]; g.visible = true;
  g.position.set(0, Y(1110) + 1.6 * (1 - sp) + 0.07 * Math.sin(t * 2.2 + i), 0.3);
  g.rotation.set(-0.3 * (1 - sp) + 0.08 * Math.sin(t * 1.3 + i), (i % 2 ? 1 : -1) * 1.45 * (1 - sp) + 0.32 * Math.sin(t * 1.6 + i * 0.7), (i % 2 ? -1 : 1) * (0.12 * (1 - sp) + 0.04 * Math.sin(t * 1.9 + i)));
  g.scale.setScalar(s);
  deformGarment(g, lt, t);
  wallC.material.color.set(darken(d.bg, 0.6)); wallC.material.opacity = d.bg === P.OW || d.bg === P.Mel ? 0.2 : 0.3;
  const sh = shakeAt(t);
  cam.position.set(sh[0] / 100, -sh[1] / 100, CAMZ); cam.lookAt(sh[0] / 100, -sh[1] / 100, 0);
  const lum = hx(d.ic).reduce((a, v, j) => a + v / 255 * [0.2126, 0.7152, 0.0722][j], 0);
  R3.toneMappingExposure = lum > 0.75 ? 0.8 : lum > 0.45 ? 0.92 : 1.05;
  R3.render(scene, cam);
  c.drawImage(R3.domElement, 0, 0);
}

// ---------------------------------------------------------------- kinetic type: a different trick for every day
function wordLayout(c, txt, size) { c.font = DISP(size); c.letterSpacing = '0px'; const ws = [...txt].map(ch => c.measureText(ch).width); return { ws, tw: ws.reduce((a, b) => a + b, 0) - (txt.length - 1) * size * 0.02 }; }
function drawWord(c, txt, anim, lt, cx, baseY, size, color, bg) {
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

// ---------------------------------------------------------------- 0.00–2.00  the dot bounces the logo together
const LG = { w: 760, cx: 540, cy: 900 };
const LS = LG.w / 47, LX0 = LG.cx - LG.w / 2, LY0 = LG.cy - 16 * LS;
const DOTF = [LX0 + LOGO.dc[0] * LS, LY0 + LOGO.dc[1] * LS], DOTR = LOGO.dr * LS;
const QX = LX0 + 16 * LS, RX = LX0 + 30 * LS;   // where q and r stand
function dotIntro(t) {   // centre, squash
  const fy = DOTF[1];
  const hops = [[0.05, 540, -160, T.b1, QX, 0], [T.b1, QX, fy, T.b2, RX, 420], [T.b2, RX, fy, T.land, DOTF[0], 260]];
  for (const [a, x0, y0, b, x1, hgt] of hops) if (t < b) {
    const k = prog(t, a, b);
    if (hgt === 0) return { x: lerp(x0, x1, k), y: lerp(y0, fy, E.inQuad(k)), sx: 1 - 0.1 * k, sy: 1 + 0.25 * k };
    const y = lerp(y0, fy, k) - 4 * hgt * k * (1 - k);
    return { x: lerp(x0, x1, k), y, sx: 1 - 0.12 * Math.sin(Math.PI * k), sy: 1 + 0.18 * Math.sin(Math.PI * k) };
  }
  const sp = spring(t, T.land, 3.4, 0.28);
  return { x: DOTF[0], y: fy, sx: 1 + 0.25 * (1 - sp), sy: 1 - 0.3 * (1 - sp) };
}
function landSquash(t, tl) { if (t < tl) return [1, 1]; const sp = spring(t, tl, 3.4, 0.28); return [1 + 0.35 * (1 - sp), 1 - 0.4 * (1 - sp)]; }
function shotIntro(c, t) {
  c.fillStyle = P.OW; c.fillRect(0, 0, W, H);
  grid(c, P.B, 0.07);
  hud(c, P.B, 'QAZAQ REPUBLIC', 'EST. 2016 · ALMATY', prog(t, 0.05, 0.3));
  // q and r pop out of the floor where the dot hits
  for (const [part, tb, px] of [['q', T.b1, QX], ['r', T.b2, RX]]) {
    if (t < tb) continue;
    const sp = spring(t, tb, 2.8, 0.32);
    c.save(); c.translate(px, DOTF[1] + DOTR); c.scale(1 + 0.1 * (1 - sp), sp); c.translate(-px, -(DOTF[1] + DOTR));
    logoPart(c, part, LX0, LY0, LS, P.B); c.restore();
    // ring at the impact
    const rk = prog(t, tb, tb + 0.35); if (rk < 1) { c.strokeStyle = col(P.B, 1 - rk); c.lineWidth = 6 * (1 - rk) + 1; c.beginPath(); c.ellipse(px, DOTF[1] + DOTR, 60 + 200 * E.outExpo(rk), 14 + 40 * E.outExpo(rk), 0, 0, TAU); c.stroke(); }
  }
  // the dot + its shadow
  const d = dotIntro(t);
  const pre = 1 + 0.35 * E.inCubic(prog(t, 1.8, T.week));
  const sh = clamp(1 - (DOTF[1] - d.y) / 700);
  c.fillStyle = col(P.B, 0.18 * sh); c.beginPath(); c.ellipse(d.x, DOTF[1] + DOTR + 6, DOTR * (0.6 + 0.6 * sh), 12, 0, 0, TAU); c.fill();
  c.save(); c.translate(d.x, d.y + DOTR); c.scale(d.sx * pre, d.sy * pre); c.fillStyle = P.B; c.beginPath(); c.arc(0, -DOTR, DOTR, 0, TAU); c.fill(); c.restore();
  // caption once the logo is whole
  const ck = E.outCubic(prog(t, T.land + 0.05, T.land + 0.3));
  c.save(); c.globalAlpha = ck; c.font = MONO(700, 30); c.letterSpacing = '12px'; c.fillStyle = P.B; c.textAlign = 'center';
  c.fillText('JETI KÚN · 7 ДНЕЙ', CX, 1300 + 20 * (1 - ck)); c.restore();
}

// ---------------------------------------------------------------- 2.00–5.50  the week
function calendar(c, i, t, d) {
  const y = 1650, xs = k => CX + (k - 3) * 128;
  for (let k = 0; k < 7; k++) {
    c.strokeStyle = col(d.fg, 0.5); c.lineWidth = 3; c.beginPath(); c.arc(xs(k), y, 40, 0, TAU); c.stroke();
    if (k < i) { c.fillStyle = col(d.fg, 0.16); c.beginPath(); c.arc(xs(k), y, 40, 0, TAU); c.fill(); }
    c.font = MONO(700, 26); c.fillStyle = col(d.fg, 0.75); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(INIT[k], xs(k), y + 1);
  }
  // the dot hops from yesterday to today
  const lt = t - dayT(i), k = E.inOutCubic(prog(lt, 0, 0.2));
  const x = i === 0 ? xs(0) : lerp(xs(i - 1), xs(i), k), yy = y - (i === 0 ? 0 : 110 * 4 * k * (1 - k));
  const [sx, sy] = landSquash(lt, 0.2);
  const s0 = i === 0 ? E.outBack(prog(lt, 0, 0.2)) : 1;
  c.save(); c.translate(x, yy + 40); c.scale(sx * s0, sy * s0); c.fillStyle = d.acc; c.beginPath(); c.arc(0, -40, 40, 0, TAU); c.fill(); c.restore();
  c.save(); c.globalAlpha = clamp((lt - 0.18) * 8); c.font = MONO(700, 26); c.fillStyle = d.bg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(INIT[i], xs(i), y + 1); c.restore();
  c.textBaseline = 'alphabetic';
}
function drawDay(c, i, t) {
  const d = DAYS[i], lt = t - dayT(i);
  c.fillStyle = d.bg; c.fillRect(0, 0, W, H);
  if (d.bg === P.Mel) { for (let k = 0; k < 900; k++) { c.fillStyle = hash(k * 3.1) < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)'; c.fillRect(hash(k) * W, hash(k + 0.3) * H, 3, 2); } }
  grid(c, d.fg, 0.08);
  hud(c, d.fg, 'QAZAQ REPUBLIC', `0${i + 1} / 07`);
  // the day
  const size = Math.min(250, 980 / (wordLayout(c, d.name, 100).tw / 100));
  drawWord(c, d.name, d.anim, lt, CX, 560, size, d.fg, d.bg);
  const sk = E.outCubic(prog(lt, 0.12, 0.3));
  c.save(); c.globalAlpha = sk; c.font = MONO(700, 30); c.letterSpacing = '10px'; c.fillStyle = d.fg; c.textAlign = 'center'; c.fillText(d.ru, CX, 650 + 16 * (1 - sk)); c.restore();
  // the garment (3D)
  renderGarment(c, i, t, d);
  calendar(c, i, t, d);
}
function wipeClip(c, i, p) {   // the shape that reveals day i
  c.beginPath();
  const R = 2300 * p;
  switch (i) {
    case 0: c.arc(DOTF[0], DOTF[1], R, 0, TAU); break;
    case 1: c.rect(0, H * (1 - p), W, H * p); break;
    case 2: c.moveTo(0, 0); c.lineTo(2 * W * p + 400, 0); c.lineTo(2 * W * p - 900, H); c.lineTo(0, H); break;
    case 3: c.arc(CX + (3 - 3) * 128, 1650, R, 0, TAU); break;
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

// ---------------------------------------------------------------- 5.50–7.50  Bauhaus tiles, «jaqsy kúnder.», the badge
const TILE_COLS = [P.B, P.Y, P.Bur, P.Mel, P.Nv, P.OW, P.Kh];
function tile(c, x, y, s, k, rot, i) {
  const bgc = TILE_COLS[Math.floor(hash(i * 1.7) * TILE_COLS.length)];
  let fgc = TILE_COLS[Math.floor(hash(i * 2.9 + 1) * TILE_COLS.length)]; if (fgc === bgc) fgc = bgc === P.OW ? P.B : P.OW;
  const m = Math.floor(hash(i * 5.3) * 6);
  c.save(); c.translate(x + s / 2, y + s / 2); c.scale(k, k); c.rotate(rot);
  c.fillStyle = bgc; c.fillRect(-s / 2, -s / 2, s, s); c.fillStyle = fgc;
  const h = s / 2;
  switch (m) {
    case 0: c.beginPath(); c.moveTo(-h, -h); c.arc(-h, -h, s, 0, Math.PI / 2); c.closePath(); c.fill(); break;
    case 1: c.beginPath(); c.arc(0, h, h, Math.PI, TAU); c.fill(); break;
    case 2: c.beginPath(); c.arc(0, 0, h * 0.78, 0, TAU); c.fill(); break;
    case 3: c.beginPath(); c.moveTo(-h, -h); c.lineTo(h, h); c.lineTo(-h, h); c.closePath(); c.fill(); break;
    case 4: for (let j = 0; j < 4; j++) c.fillRect(-h, -h + j * s / 4, s, s / 8); break;
    case 5: c.beginPath(); c.arc(-h, 0, h, -Math.PI / 2, Math.PI / 2); c.fill(); c.beginPath(); c.arc(h, 0, h, Math.PI / 2, Math.PI * 1.5); c.fill(); break;
  }
  c.restore();
}
function tiles(c, t) {
  const s = 180;
  for (let r = 0; r < 11; r++) for (let q = 0; q < 6; q++) {
    const x = q * s, y = r * s - 30, i = r * 6 + q;
    const dist = Math.hypot(x + s / 2 - CX, y + s / 2 - CY) / 1100;
    const k = E.outBack(prog(t, T.drop + dist * 0.28, T.drop + dist * 0.28 + 0.24));
    if (k <= 0) continue;
    let rot = Math.floor(hash(i * 7.1) * 4) * Math.PI / 2;
    for (const b of [T.jaqsy, T.kunder, T.badge]) rot += ((r + q) % 2 ? 1 : -1) * Math.PI / 2 * E.outBack(prog(t, b + dist * 0.12, b + dist * 0.12 + 0.2));
    tile(c, x, y, s, k, rot, i);
  }
}
function shotDrop(c, t) {
  c.fillStyle = P.OW; c.fillRect(0, 0, W, H);
  tiles(c, t);
  // the band: dot → pill → circle
  const grow = E.outExpo(prog(t, T.band, T.band + 0.25)), toCirc = E.inOutCubic(prog(t, T.badge, T.badge + 0.25));
  const bw = lerp(lerp(150, 1000, grow), 600, toCirc), bh = lerp(lerp(150, 300, grow), 600, toCirc);
  if (t >= T.band - 0.1) {
    const pop = E.outBack(prog(t, T.band - 0.1, T.band));
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.roundRect(CX - bw / 2 + 14, CY - bh / 2 + 18, bw * pop, bh * pop, bh / 2); c.fill();
    c.fillStyle = P.B; c.beginPath(); c.roundRect(CX - bw / 2 * pop, CY - bh / 2 * pop, bw * pop, bh * pop, bh / 2 * pop); c.fill();
  }
  // words inside the band
  c.save(); c.beginPath(); c.roundRect(CX - bw / 2, CY - bh / 2, bw, bh, bh / 2); c.clip();
  const word = (txt, t0, t1) => {
    if (t < t0 || t > t1 + 0.2) return;
    const kin = E.outExpo(prog(t, t0, t0 + 0.22)), kout = E.inExpo(prog(t, t1, t1 + 0.18));
    c.font = ITB(190); c.letterSpacing = '-6px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = P.W;
    c.fillText(txt, CX, CY + 66 + 260 * (1 - kin) - 300 * kout);
  };
  word('jaqsy', T.jaqsy, T.kunder - 0.02);
  word('kúnder.', T.kunder, T.badge - 0.05);
  c.restore();
  // the badge: rotating ring text around the dot
  if (t >= T.badge) {
    const k = E.outCubic(prog(t, T.badge + 0.1, T.badge + 0.35));
    c.save(); c.translate(CX, CY); c.rotate((t - T.badge) * 1.6 - 0.6 * (1 - k)); c.globalAlpha = k;
    const txt = 'BÁRI JAQSY BOLADY · BÁRI JAQSY BOLADY · '; c.font = MONO(700, 40); c.fillStyle = P.W; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < txt.length; i++) { const a = i / txt.length * TAU; c.save(); c.rotate(a); c.translate(0, -238); c.fillText(txt[i], 0, 0); c.restore(); }
    c.restore();
    const ds = E.outBack(prog(t, T.badge + 0.15, T.badge + 0.35)) * (1 + 0.06 * Math.sin((t - T.badge) * TAU * 2));
    c.fillStyle = P.W; c.beginPath(); c.arc(CX, CY, 92 * ds, 0, TAU); c.fill();
    c.save(); c.globalAlpha = k; c.font = MONO(700, 30); c.letterSpacing = '8px'; c.fillStyle = P.B; c.textAlign = 'center';
    c.fillStyle = P.Ink; c.restore();
  }
  // caption plate under the band
  const ck = E.outCubic(prog(t, T.jaqsy + 0.1, T.jaqsy + 0.3));
  if (ck > 0) {
    const txt = t < T.badge ? 'ХОРОШИХ ДНЕЙ' : 'ВСЁ БУДЕТ ХОРОШО';
    c.save(); c.font = MONO(700, 30); c.letterSpacing = '10px'; const w = c.measureText(txt).width + 70;
    const y = t < T.badge ? CY + 230 : CY + 380;
    c.fillStyle = P.Ink; c.beginPath(); c.roundRect(CX - w / 2, y - 40, w * ck, 64, 10); c.fill();
    c.fillStyle = P.W; c.textAlign = 'center'; c.globalAlpha = ck; c.fillText(txt, CX + 5, y + 2); c.restore();
  }
}

// ---------------------------------------------------------------- 7.50–10.00  FINALE
const FL = { w: 640, cx: 540, cy: 860 };
const FS = FL.w / 47, FX0 = FL.cx - FL.w / 2, FY0 = FL.cy - 16 * FS;
const FDOT = [FX0 + LOGO.dc[0] * FS, FY0 + LOGO.dc[1] * FS], FDR = LOGO.dr * FS;
const CONF = [];
for (let i = 0; i < 70; i++) CONF.push({ a: -Math.PI / 2 + (hash(i * 3.3) - 0.5) * 2.6, v: 700 + 1300 * hash(i * 1.9), s: 10 + 22 * hash(i * 7.7), c: [P.Y, P.W, P.Mel, P.Bur, P.Cr][i % 5], m: i % 3, spin: (hash(i) - 0.5) * 14 });
function shotFin(c, t) {
  c.fillStyle = P.B; c.fillRect(0, 0, W, H);
  grid(c, P.W, 0.08);
  // confetti of brand shapes from the landing
  if (t >= T.finLand) {
    const d = t - T.finLand;
    for (const p of CONF) {
      const x = FDOT[0] + Math.cos(p.a) * p.v * (1 - Math.exp(-d * 3)) / 3 * 1.6, y = FDOT[1] + Math.sin(p.a) * p.v * (1 - Math.exp(-d * 3)) / 3 * 1.6 + 260 * d * d;
      if (y > H + 50) continue;
      c.save(); c.translate(x, y); c.rotate(p.spin * d); c.fillStyle = p.c; c.globalAlpha = clamp(2.2 - d);
      if (p.m === 0) { c.beginPath(); c.arc(0, 0, p.s / 2, 0, TAU); c.fill(); }
      else if (p.m === 1) { c.beginPath(); c.arc(0, 0, p.s / 2, 0, Math.PI); c.fill(); }
      else c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      c.restore();
    }
  }
  // q from the left, r from the right
  for (const [part, dir, t0] of [['q', -1, T.fin + 0.05], ['r', 1, T.fin + 0.12]]) {
    const k = E.outExpo(prog(t, t0, t0 + 0.3));
    if (k <= 0) continue;
    const off = dir * 900 * (1 - k);
    if (k < 0.95) for (let j = 1; j <= 3; j++) { c.save(); c.globalAlpha = 0.18; c.translate(off + dir * j * 60 * (1 - k), 0); logoPart(c, part, FX0, FY0, FS, P.W); c.restore(); }
    c.save(); c.translate(off, 0); logoPart(c, part, FX0, FY0, FS, P.W); c.restore();
  }
  // the dot drops in and lands as the period, on the beat
  if (t >= T.fin + 0.2) {
    let y, sx = 1, sy = 1;
    if (t < T.finLand) { const k = prog(t, T.fin + 0.2, T.finLand); y = lerp(-200, FDOT[1], E.inQuad(k)); sy = 1 + 0.3 * k; sx = 1 - 0.12 * k; }
    else { y = FDOT[1] - 120 * Math.max(0, Math.sin(Math.PI * prog(t, T.finLand + 0.02, T.name))) * (1 - prog(t, T.finLand, T.name)) ; [sx, sy] = landSquash(t, T.finLand); }
    const pulse = 1 + [9.0, 9.5].reduce((s, b) => s + (t >= b ? 0.12 * Math.exp(-(t - b) * 10) : 0), 0);
    c.save(); c.translate(FDOT[0], y + FDR); c.scale(sx * pulse, sy * pulse); c.fillStyle = P.W; c.beginPath(); c.arc(0, -FDR, FDR, 0, TAU); c.fill(); c.restore();
  }
  // type
  c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const n = 'Qazaq Republic';
  c.save(); c.beginPath(); c.rect(0, 1060, W, 130); c.clip(); c.font = DISP(86); c.letterSpacing = '-1px'; c.fillStyle = P.W;
  const wsN = [...n].map(ch => c.measureText(ch).width), twN = wsN.reduce((a, b) => a + b, 0); let x = CX - twN / 2; c.textAlign = 'left';
  for (let i = 0; i < n.length; i++) { const k = E.outExpo(prog(t, T.name + i * 0.02, T.name + 0.3 + i * 0.02)); c.fillText(n[i], x, 1150 + 120 * (1 - k)); x += wsN[i]; }
  c.restore();
  const tk = E.outBack(prog(t, T.tag, T.tag + 0.3));
  if (tk > 0) { c.save(); c.translate(CX, 1250); c.scale(tk, tk); c.fillStyle = P.Y; c.beginPath(); c.roundRect(-230, -52, 460, 82, 41); c.fill(); c.font = ITB(54); c.letterSpacing = '-1px'; c.fillStyle = P.B; c.textAlign = 'center'; c.fillText('jaqsy kúnder.', 0, 8); c.restore(); }
  const hk = E.outCubic(prog(t, T.handles, T.handles + 0.3));
  c.globalAlpha = hk; c.textAlign = 'center'; c.font = MONO(700, 36); c.letterSpacing = '2px'; c.fillStyle = P.W; c.fillText('@qazaq.republic', CX, 1690 + 20 * (1 - hk));
  c.font = MONO(500, 28); c.fillStyle = col(P.W, 0.7); c.fillText('qazaqrepublic.com', CX, 1740 + 20 * (1 - hk));
  c.restore();
  // woven label flips in
  const lk = prog(t, T.label, T.label + 0.3);
  if (lk > 0) {
    c.save(); c.translate(CX, 1450); c.scale(1, Math.max(0.02, Math.abs(Math.cos((1 - E.outBack(lk)) * Math.PI)))); c.rotate(-0.04);
    c.fillStyle = P.W; c.beginPath(); c.roundRect(-150, -60, 300, 120, 10); c.fill();
    c.strokeStyle = col(P.B, 0.35); c.setLineDash([8, 6]); c.lineWidth = 2; c.strokeRect(-138, -48, 276, 96); c.setLineDash([]);
    logo(c, -70, 0, 110, P.B);
    c.font = MONO(700, 18); c.fillStyle = P.B; c.textAlign = 'left'; c.letterSpacing = '2px'; c.fillText('ALMATY', 4, -6); c.fillText('EST. 2016', 4, 20);
    c.restore();
  }
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
  const sh = shakeAt(t);
  ctx.save(); ctx.translate(sh[0], sh[1]);
  // circle wipes between the big sections: draw the previous section, reveal the new one
  const wipeFrom = (tb, prevFn, cx, cy, r0) => {
    const p = E.outExpo(prog(t, tb, tb + 0.24));
    if (p >= 1) return false;
    prevFn(ctx, t); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, lerp(r0, 2300, p), 0, TAU); ctx.clip(); SHOTS[idx][1](ctx, t); ctx.restore(); return true;
  };
  let done = false;
  if (idx === 2) done = wipeFrom(T.drop, (c, tt) => drawDay(c, 6, tt), 540 + 3 * 128, 1650, 40);
  if (idx === 3) done = wipeFrom(T.fin, shotDrop, CX, CY, 92);
  if (!done) SHOTS[idx][1](ctx, t);
  ctx.restore();
  // fill the shake edge
  if (sh[0] || sh[1]) { ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  post(t);
}
function post(t) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  // a hint of motion blur on the fastest moves
  const k0 = 1 - prog(t, 0, 0.06);
  if (k0 > 0) { c.fillStyle = `rgba(245,245,253,${k0})`; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet
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
  for (let i = 0; i < 7; i++) buildGarment(i);
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
