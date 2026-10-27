// Kaidarova (@kaidarova.ethnic) — «MAHABBAT / Завёрнутые в любовь». 18 s vertical clip (1080×1920, 60 fps).
// Nagima Kaidarova: «I wanted girls to be wrapped in love» — so the word MAHABBAT literally wraps:
// first as a 3D ribbon spiralling round an invisible figure, then as the all-over print of the
// wrap dress. The owl feather (úki, the amulet in their logo) opens and closes the story; the Oyu
// ornament is knitted stitch by stitch until it becomes the real cardigan in their steppe shoot;
// the tumar amulet tells how it began (2014, Astana). Every frame is f(t).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2;
export const DUR = 18.0;
const T = { pro: 0, wrap: 2, print: 4, oyu: 7, card: 10.5, tumar: 12.5, fin: 14.5 };
const C = { ivory: '#F4EFE6', beige: '#E9E1D3', sage: '#7F8B78', sage2: '#5F6B5A', terra: '#D4572F', olive: '#7A7752', olive2: '#5E5C3E', cream: '#EFE6D4', ink: '#1C1A18', gold: '#C9A15E', sky: '#9EA9C9' };

// ---------------------------------------------------------------- utils
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const col = (h, a = 1) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
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
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const OS = (w, s) => `${w} ${s}px "Oswald"`;
const CG = (w, s) => `italic ${w} ${s}px "Cormorant"`;
const JO = (w, s, it = false) => `${it ? 'italic ' : ''}${w} ${s}px "Jost"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const lay = mk(W, H), lctx = lay.getContext('2d');

// ---------------------------------------------------------------- type helpers
function line(c, txt, t, t0, x, y, font, color, o = {}) {      // letters fade/slide in, optional shadow
  if (t < t0) return;
  c.save(); c.font = font; c.letterSpacing = (o.ls || 0) + 'px'; c.textBaseline = 'alphabetic';
  const ws = [...txt].map(ch => c.measureText(ch).width + (o.ls || 0)); const tw = ws.reduce((a, b) => a + b, 0) - (o.ls || 0);
  let px = o.align === 'left' ? x : x - tw / 2;
  const outT = o.out ?? 1e9, ko = 1 - prog(t, outT, outT + 0.25);
  if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.blur ?? 16; c.shadowOffsetY = 2; }
  for (let i = 0; i < txt.length; i++) {
    const k = prog(t, t0 + i * (o.stag ?? 0.025), t0 + i * (o.stag ?? 0.025) + 0.4), e = E.outCubic(k);
    c.globalAlpha = k * ko * (o.alpha ?? 1); c.fillStyle = color; c.fillText(txt[i], px, y + (o.dy ?? 26) * (1 - e)); px += ws[i];
  }
  c.restore();
}

// ---------------------------------------------------------------- the feather (úki) from their logo
let FEATHER = null, ROWS = null; const FW = 141.5, FH = 407.5;
const BARBS = [];
function buildBarbs() {
  ROWS.forEach(([y, runs], i) => {
    if (i % 3) return;
    if (runs.length >= 2) BARBS.push({ y, x0: runs[0][1], x1: runs[1][0], side: 0, i });
    if (runs.length >= 3) BARBS.push({ y, x0: runs[1][1], x1: runs[2][0], side: 1, i });
  });
}
// o: outline 0..1 (top → bottom), barbs 0..1, loose 0..1 (barbs fly off as threads), alpha
function feather(c, cx, cy, h, o = {}) {
  const s = h / FH;
  c.save(); c.translate(cx, cy); c.rotate(o.rot || 0); c.scale(s, s); c.translate(-FW / 2, -FH / 2);
  c.globalAlpha = o.alpha ?? 1;
  const bk = o.barbs ?? 1, loose = o.loose || 0;
  BARBS.forEach((b, j) => {
    const k = clamp(bk * BARBS.length - j * 0.55, 0, 1); if (k <= 0) return;
    const lf = clamp(loose * 1.6 - hash(j * 3.1) * 0.6, 0, 1), e = E.inCubic(lf);
    const len = (b.x1 - b.x0) * k, dx = e * (260 + 520 * hash(j)), dy = e * (Math.sin(j * 0.7) * 60 - 40);
    c.strokeStyle = lf > 0 ? mix(o.barbCol || '#8e8e8e', j % 3 ? C.sage : C.terra, Math.min(1, lf * 2)) : (o.barbCol || '#8e8e8e');
    c.lineWidth = lf > 0 ? 1.0 + 1.2 * lf : 0.9;
    c.beginPath(); c.moveTo(b.x0 + dx, b.y + dy); c.quadraticCurveTo(b.x0 + len / 2 + dx * 1.15, b.y + 2 + dy + 18 * e * Math.sin(j), b.x0 + len + dx * 1.3, b.y + dy + 6 * e); c.stroke();
  });
  const ok = o.outline ?? 1;
  if (ok > 0) { c.save(); c.beginPath(); c.rect(-20, -20, FW + 40, (FH + 40) * ok); c.clip(); c.fillStyle = o.ink || '#1a1a1a'; c.fill(FEATHER); c.restore(); }
  c.restore();
}

// ---------------------------------------------------------------- 3D: the MAHABBAT ribbon
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.05; R3.outputColorSpace = THREE.SRGBColorSpace; R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight('#fff6ea', '#a99a86', 0.9));
const key = new THREE.DirectionalLight('#fff1dc', 2.2); key.position.set(-6, 9, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 12;
Object.assign(key.shadow.camera, { left: -10, right: 10, top: 12, bottom: -12, near: 1, far: 60 }); key.shadow.bias = -0.0005; scene.add(key);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), new THREE.ShadowMaterial({ opacity: 0.22 })); wall.position.z = -4; wall.receiveShadow = true; scene.add(wall);
let RIB = null;
function ribbonTex() {
  const cv = mk(4096, 256), c = cv.getContext('2d');
  c.fillStyle = C.cream; c.fillRect(0, 0, 4096, 256);
  c.fillStyle = C.sage2; c.fillRect(0, 0, 4096, 10); c.fillRect(0, 246, 4096, 10);
  c.font = OS(600, 190); c.textBaseline = 'middle'; c.fillStyle = C.sage2;
  let x = 30; const word = 'MAHABBAT  ·  ';
  while (x < 4096) { c.fillText(word, x, 134); x += c.measureText(word).width; }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function buildRibbon() {
  const N = 900, turns = 3.6, R = 2.4, y0 = -5.2, y1 = 4.6, wdt = 0.95;
  const pos = [], uv = [], idx = [];
  let acc = 0, prev = null;
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = u * turns * TAU, y = lerp(y0, y1, u), r = R * (1 + 0.08 * Math.sin(u * 9));
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    if (prev) acc += Math.hypot(cx - prev[0], y - prev[1], cz - prev[2]); prev = [cx, y, cz];
    const tilt = 0.25;   // the ribbon leans a little with the climb
    pos.push(cx, y - wdt / 2 - tilt * 0, cz, cx, y + wdt / 2, cz);
    uv.push(acc / (wdt * 16), 0, acc / (wdt * 16), 1);
    if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mat = (tex, side) => new THREE.MeshPhysicalMaterial({ map: tex, side, roughness: 0.45, sheen: 0.6, sheenColor: '#fff4e0', sheenRoughness: 0.4, envMapIntensity: 0.6 });
  const tf = ribbonTex(), tb = ribbonTex(); tb.repeat.set(-1, 1);          // the inside face reads the right way too
  const m = new THREE.Mesh(g, mat(tf, THREE.FrontSide)), mb = new THREE.Mesh(g, mat(tb, THREE.BackSide));
  m.castShadow = true; mb.castShadow = true; m.userData.total = idx.length; g.setDrawRange(0, 0);
  RIB = new THREE.Group(); RIB.add(m); RIB.add(mb); RIB.userData.mesh = m; scene.add(RIB);
}
function render3D(c) { R3.render(scene, cam); c.drawImage(R3.domElement, 0, 0); }

// ---------------------------------------------------------------- backgrounds
function paper(c, base = C.ivory) {
  c.fillStyle = base; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.05; c.drawImage(GRAIN[0], 0, 0, W, H); c.restore();
  const g = c.createRadialGradient(CX, 900, 400, CX, 900, 1300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,70,50,0.12)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- 0–2 · úki: the feather draws itself, its barbs loosen into threads
function shotPro(c, t) {
  paper(c);
  const sway = 0.06 * Math.sin(t * 2.2), loose = E.inOutCubic(prog(t, 1.2, 2.1));
  feather(c, CX, 860 - 30 * loose, 760, { outline: E.inOutCubic(prog(t, 0.12, 0.8)), barbs: prog(t, 0.45, 1.3), loose, rot: sway, alpha: 1 - prog(t, 1.75, 2.1) });
  line(c, 'úki', t, 0.5, CX, 1450, CG(600, 150), C.ink, { out: 1.75 });
  line(c, 'THE AMULET FEATHER', t, 0.75, CX, 1545, JO(500, 44), col(C.ink, 0.85), { ls: 10, out: 1.75 });
}

// ---------------------------------------------------------------- 2–4 · wrapped in love: the 3D MAHABBAT ribbon spirals round an invisible figure
function shotWrap(c, t) {
  const t0 = T.wrap, lt = t - t0;
  paper(c, C.beige);
  // her words, inside the spiral
  const grow = E.outCubic(prog(t, t0 - 0.1, t0 + 1.2)), dive = E.inExpo(prog(t, T.print - 0.4, T.print));
  RIB.visible = true; RIB.userData.mesh.geometry.setDrawRange(0, Math.floor(RIB.userData.mesh.userData.total * grow / 6) * 6);
  RIB.rotation.set(0.12, lt * 1.1 + 0.6, 0.06 * Math.sin(lt));
  RIB.scale.setScalar((0.82 + 2.2 * dive));
  cam.position.set(0, 0.3 * Math.sin(lt * 0.8), CAMZ - 8 * dive); cam.lookAt(0, 0, 0);
  RIB.position.y = 1.1;
  render3D(c);
  // the threads that left the feather converge on the ribbon's first turn
  const cv = prog(t, t0 - 0.15, t0 + 0.55);
  if (cv > 0 && cv < 1) {
    RIB.updateMatrixWorld(true);
    const pa = RIB.userData.mesh.geometry.attributes.position, v = new THREE.Vector3(pa.getX(0), (pa.getY(0) + pa.getY(1)) / 2, pa.getZ(0)).applyMatrix4(RIB.matrixWorld).project(cam);
    const bx = (v.x + 1) / 2 * W, by = (1 - v.y) / 2 * H;
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const sx = 600 + 480 * hash(i * 1.3), sy = 600 + 520 * hash(i * 2.7), e = E.inOutCubic(clamp(cv * 1.3 - hash(i * 5.1) * 0.3));
      const hx2 = lerp(sx, bx, e), hy2 = lerp(sy, by, e), tx = lerp(sx, bx, Math.max(0, e - 0.35)), ty = lerp(sy, by, Math.max(0, e - 0.35));
      c.strokeStyle = col(i % 3 ? C.sage2 : C.terra, 0.9 * (1 - prog(cv, 0.75, 1))); c.lineWidth = 3;
      c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo((tx + hx2) / 2 + 60 * Math.sin(i), (ty + hy2) / 2 - 80, hx2, hy2); c.stroke();
    }
    c.restore();
  }
  const qa = 1 - prog(t, T.print - 0.35, T.print - 0.1);
  const g0 = c.createLinearGradient(0, 1440, 0, 1920); g0.addColorStop(0, col(C.beige, 0)); g0.addColorStop(0.25, col(C.beige, 0.9 * qa)); g0.addColorStop(1, col(C.beige, 0.95 * qa)); c.fillStyle = g0; c.fillRect(0, 1440, W, 480);
  line(c, '«Я хотела, чтобы девушки', t, t0 + 0.35, CX, 1590, CG(600, 90), C.ink, { stag: 0.012, out: T.print - 0.35 });
  line(c, 'были завёрнуты в любовь»', t, t0 + 0.55, CX, 1690, CG(700, 90), C.terra, { stag: 0.012, out: T.print - 0.35 });
  line(c, '— НАГИМА КАЙДАРОВА', t, t0 + 0.95, CX, 1795, JO(500, 42), col(C.ink, 0.9), { ls: 8, out: T.print - 0.35 });
}

// ---------------------------------------------------------------- 4–7 · the all-over MAHABBAT print + the real wrap dress
let PRINT = null;
function buildPrint() {        // one tile of the print: diagonal rows of MAHABBAT, sage on beige
  const cv = mk(1400, 1400), c = cv.getContext('2d');
  c.fillStyle = C.beige; c.fillRect(0, 0, 1400, 1400);
  c.font = OS(500, 64); c.fillStyle = C.sage; c.textBaseline = 'middle';
  for (let r = 0; r < 26; r++) { let x = (r % 2) * -120; const y = r * 58; while (x < 1400) { c.fillText('MAHABBAT', x, y); x += c.measureText('MAHABBAT ').width; } }
  PRINT = cv;
}
function printBg(c, t, alpha = 1, hotRow = -1, hot = 0) {
  c.save(); c.globalAlpha = alpha; c.translate(CX, CY); c.rotate(-0.5); c.translate(-CX, -CY);
  c.font = OS(500, 64); c.textBaseline = 'middle';
  for (let r = -18; r < 22; r++) {
    const dir = r % 2 ? 1 : -1, off = ((t * 60 * dir) % 520 + 520) % 520;
    const y = CY + r * 64; let x = -900 - off;
    c.fillStyle = r === hotRow ? mix(C.sage, C.terra, hot) : C.sage;
    while (x < W + 900) { c.fillText('MAHABBAT', x, y); x += 260; }
  }
  c.restore();
}
let DRESS = null, DRESSB = null;
function shotPrint(c, t) {
  const t0 = T.print, lt = t - t0;
  c.fillStyle = C.beige; c.fillRect(0, 0, W, H);
  const zin = 1 + 1.6 * (1 - E.outCubic(prog(t, t0, t0 + 0.75)));      // the dive continues into the print
  c.save(); c.translate(CX, CY); c.scale(zin, zin); c.rotate(0.25 * (zin - 1)); c.translate(-CX, -CY);
  const fade = 1 - 0.75 * E.inOutCubic(prog(t, t0 + 1.6, t0 + 2.0));
  printBg(c, t, fade, 3, E.outCubic(prog(t, t0 + 1.4, t0 + 1.7)));
  // the dress rises out of its own print
  const k = E.outExpo(prog(t, t0 + 0.15, t0 + 0.9)), go = E.inCubic(prog(t, t0 + 1.45, t0 + 1.9));
  if (k > 0 && go < 1) {
    const h = 1500, w = h * DRESS.width / DRESS.height, x = CX - w / 2 - 40 * go * 0, y = 520 + 400 * (1 - k) + 1400 * go;
    c.save(); c.globalAlpha = 0.25; c.filter = 'blur(18px)'; c.drawImage(DRESSB, x + 20, y + 30, w, h); c.restore();
    c.drawImage(DRESS, x, y, w, h);
  }
  c.restore();
  const bk = E.outCubic(prog(t, t0 + 0.35, t0 + 0.7)) * (1 - prog(t, t0 + 1.4, t0 + 1.65));
  if (bk > 0) { const g0 = c.createLinearGradient(0, 160, 0, 400); g0.addColorStop(0, col(C.beige, 0)); g0.addColorStop(0.3, col(C.beige, 0.92 * bk)); g0.addColorStop(0.7, col(C.beige, 0.92 * bk)); g0.addColorStop(1, col(C.beige, 0)); c.fillStyle = g0; c.fillRect(0, 160, W, 240); }
  line(c, 'wrapped in love', t, t0 + 0.45, CX, 310, CG(700, 110), C.ink, { out: t0 + 1.4 });
  // a row lights up in terracotta and gathers into one giant word
  const g = E.outBack(prog(t, t0 + 1.75, t0 + 2.2));
  if (g > 0) {
    const un = E.inOutCubic(prog(t, T.oyu - 0.65, T.oyu - 0.1));      // the word unravels from the left …
    c.save(); c.font = OS(700, 200); c.letterSpacing = '4px'; const ww = c.measureText('MAHABBAT').width; c.restore();
    const front = CX - ww / 2 + ww * un;
    c.save(); c.beginPath(); c.rect(front, 0, W, H); c.clip();
    c.translate(CX, 930); c.scale(g, g); c.font = OS(700, 200); c.textAlign = 'center'; c.letterSpacing = '4px'; c.fillStyle = C.terra; c.shadowColor = 'rgba(80,30,10,0.25)'; c.shadowBlur = 30; c.shadowOffsetY = 12; c.fillText('MAHABBAT', 0, 90); c.restore();
    if (un > 0 && un < 1) yarn(c, front, 930 + 60 * Math.sin(un * 40), t);   // … into one terracotta yarn pulled up and away
    line(c, 'махаббат · любовь · love', t, t0 + 1.9, CX, 1150, CG(700, 94), C.ink, { stag: 0.01 });
    line(c, 'КАЗАХСКИЕ СЛОВА ЛАТИНИЦЕЙ', t, t0 + 2.0, CX, 1250, JO(500, 40), col(C.ink, 0.85), { ls: 6, stag: 0.008 });
    line(c, 'С 2014 ГОДА', t, t0 + 2.05, CX, 1310, JO(500, 40), col(C.ink, 0.85), { ls: 6, stag: 0.01 });
  }
}

function yarn(c, x, y, t) {        // a terracotta yarn from (x, y) up to the cone above the frame
  c.save(); c.strokeStyle = C.terra; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 80, y - 300, CX + 120 * Math.sin(t * 3), 260, CX, -30); c.stroke();
  c.strokeStyle = 'rgba(255,200,170,0.5)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.stroke(); c.restore();
}
// ---------------------------------------------------------------- 7–10.5 · Oyu: the ornament is knitted stitch by stitch, then it is the real cardigan
const KN = { cols: 24, rows: 40 };
let OYU = null;
function buildOyu() {            // a pixel motif in the spirit of the Oyu cardigan: borders, ram-horn hooks, a central diamond
  const g = []; for (let r = 0; r < KN.rows; r++) { g.push([]); for (let x = 0; x < KN.cols; x++) g[r].push(0); }
  const set = (r, x, v) => { if (r >= 0 && r < KN.rows && x >= 0 && x < KN.cols) g[r][x] = v; };
  for (let r = 0; r < KN.rows; r++) { set(r, 0, 2); set(r, KN.cols - 1, 2); if (r % 4 < 2) { set(r, 2, 2); set(r, KN.cols - 3, 2); } }
  const cx = 11.5, cy = 20;
  for (let r = 0; r < KN.rows; r++) for (let x = 0; x < KN.cols; x++) {
    const d = Math.abs(x - cx) * 1.35 + Math.abs(r - cy);
    if (d < 9.5 && d > 7.6) g[r][x] = 1; else if (d < 5.2 && d > 3.6) g[r][x] = 2; else if (d < 1.6) g[r][x] = 1;
  }
  // ram-horn hooks above and below the diamond
  const hook = (r0, dir) => { [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [1, 0]].forEach(([dr, dx]) => { set(r0 + dr * dir, 7 + dx, 1); set(r0 + dr * dir, 16 - dx, 1); }); };
  hook(4, 1); hook(KN.rows - 5, -1); hook(9, 1); hook(KN.rows - 10, -1);
  OYU = g;
}
const KNC = [C.olive, C.terra, C.cream];
function stitch(c, x, y, w, h, color) {   // one knit V: two leaning loops with a little shading
  for (const sd of [-1, 1]) {
    c.save(); c.translate(x + w / 2 + sd * w * 0.2, y + h / 2); c.rotate(sd * 0.55);
    const g = c.createLinearGradient(-w * 0.25, 0, w * 0.25, 0); g.addColorStop(0, mix(color, '#000000', 0.25)); g.addColorStop(0.5, mix(color, '#ffffff', 0.18)); g.addColorStop(1, mix(color, '#000000', 0.3));
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, w * 0.26, h * 0.62, 0, 0, TAU); c.fill(); c.restore();
  }
}
const KRECT = { x: 60, y: 270, w: 960, h: 1560 };   // full knit panel on screen
const CARD_RECT = { x: 232, y: 640, w: 565, h: 1043 };   // where the cardigan sits in their photo (cover-fit)
let PHOTO = null;
function drawOyuPhoto(c, t, zoomK = 0) {
  const s = 1920 / PHOTO.height * (1 + 0.05 * zoomK), w = PHOTO.width * s, h = PHOTO.height * s;
  c.drawImage(PHOTO, CX - w / 2 - 0 + 0, CY - h / 2, w, h);
}
function knitPanel(c, t, rect, rowsDone, carriage) {
  const cw = rect.w / KN.cols, ch = rect.h / KN.rows;
  c.save(); c.fillStyle = C.olive2; c.fillRect(rect.x, rect.y, rect.w, rect.h);
  for (let r = 0; r < KN.rows; r++) {
    const rr = KN.rows - 1 - r;       // knit from the bottom up
    if (r > rowsDone) break;
    const part = r < Math.floor(rowsDone) ? KN.cols : Math.floor((rowsDone % 1) * KN.cols);
    for (let x = 0; x < part; x++) stitch(c, rect.x + x * cw, rect.y + rr * ch, cw, ch, KNC[OYU[rr][x]]);
  }
  if (carriage && rowsDone < KN.rows) {       // the carriage of the knitting machine runs along the current row
    const r = Math.floor(rowsDone), rr = KN.rows - 1 - r, xk = rect.x + (rowsDone % 1) * rect.w;
    c.fillStyle = 'rgba(255,240,215,0.35)'; c.fillRect(rect.x, rect.y + rr * ch - 4, rect.w, ch + 8);
    c.fillStyle = '#2a2620'; c.beginPath(); c.roundRect(xk - 40, rect.y + rr * ch - 22, 80, ch + 44, 10); c.fill();
    c.fillStyle = C.gold; c.fillRect(xk - 3, rect.y + rr * ch - 18, 6, ch + 36);
    yarn(c, xk, rect.y + rr * ch - 20, t);      // the same yarn feeds the carriage
  }
  c.restore();
}
function shotOyu(c, t) {
  const t0 = T.oyu;
  // knitting rises from the bottom over the giant word
  const rise = E.inOutCubic(prog(t, t0 - 0.35, t0 + 0.1));
  if (rise < 1) { shotPrint(c, t); c.save(); c.beginPath(); c.rect(0, H * (1 - rise), W, H); c.clip(); }
  c.fillStyle = C.olive2; c.fillRect(0, 0, W, H);
  const rows = KN.rows * E.inOutSine(prog(t, t0, t0 + 2.3));
  const m = E.inOutCubic(prog(t, t0 + 2.55, t0 + 3.2));     // match cut: the panel shrinks onto the cardigan in the photo
  if (m > 0) { c.save(); c.globalAlpha = E.outCubic(m); drawOyuPhoto(c, t); c.restore(); }
  const R = { x: lerp(KRECT.x, CARD_RECT.x, m), y: lerp(KRECT.y, CARD_RECT.y, m), w: lerp(KRECT.w, CARD_RECT.w, m), h: lerp(KRECT.h, CARD_RECT.h, m) };
  c.save(); c.globalAlpha = 1 - E.inCubic(prog(t, t0 + 2.9, t0 + 3.4)); knitPanel(c, t, R, rows, m === 0); c.restore();
  if (m === 0) {
    line(c, 'OYU', t, t0 + 0.2, CX, 205, OS(700, 160), C.cream, { ls: 24 });
  }
  if (rise < 1) c.restore();
}

// ---------------------------------------------------------------- 10.5–12.5 · the cardigan in the steppe
function shotCard(c, t) {
  const t0 = T.card, lt = t - t0;
  drawOyuPhoto(c, t, E.inOutSine(prog(t, t0 - 0.5, T.tumar)));
  const g = c.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, 'rgba(40,40,70,0.55)'); g.addColorStop(1, 'rgba(40,40,70,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 520);
  const g2 = c.createLinearGradient(0, 1450, 0, H); g2.addColorStop(0, 'rgba(20,14,8,0)'); g2.addColorStop(1, 'rgba(20,14,8,0.75)'); c.fillStyle = g2; c.fillRect(0, 1450, W, H - 1450);
  line(c, 'OYU', t, t0 - 0.3, CX, 330, OS(700, 230), '#FFF6EA', { ls: 30, shadow: 'rgba(20,20,50,0.6)', blur: 30 });
  line(c, 'кардиган · ою — орнамент', t, t0 + 0.1, CX, 1760, CG(700, 90), '#FFF6EA', { shadow: 'rgba(0,0,0,0.85)' });
}

// ---------------------------------------------------------------- 12.5–14.5 · tumar: how it began
let TUMAR = null;
function tumarPath(c, cx, cy, s, fresh = true) {   // the triangular amulet
  if (fresh) c.beginPath(); c.moveTo(cx, cy - 0.62 * s); c.lineTo(cx + 0.58 * s, cy + 0.38 * s); c.lineTo(cx - 0.58 * s, cy + 0.38 * s); c.closePath();
}
function shotTumar(c, t) {
  const t0 = T.tumar, lt = t - t0;
  const TC = [CX, 900], TS = 820;
  // the steppe closes into the amulet's triangle and stays inside it as a window
  const close = E.inOutCubic(prog(t, t0 - 0.2, t0 + 0.45));
  const S = lerp(6200, TS, close);
  const pk = E.inOutCubic(prog(t, t0 + 0.35, t0 + 1.0));        // the steppe dissolves into their tumar dress
  c.save(); tumarPath(c, TC[0], TC[1], S); c.clip();
  shotCard(c, t);
  if (pk > 0) { const w = TS * 1.2, h = w * TUMAR.height / TUMAR.width; c.globalAlpha = pk; c.drawImage(TUMAR, TC[0] - w / 2, TC[1] - 0.62 * TS - 30 + 40 * (1 - pk), w, h); c.globalAlpha = 1; }
  c.restore();
  // outside: oxblood, slow golden rays, golden dust
  c.save(); c.beginPath(); c.rect(0, 0, W, H); tumarPath(c, TC[0], TC[1], S, false); c.clip('evenodd');
  const bg = c.createRadialGradient(TC[0], TC[1], 100, TC[0], TC[1], 1300); bg.addColorStop(0, '#5A2318'); bg.addColorStop(0.55, '#2E120D'); bg.addColorStop(1, '#140806'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.save(); c.translate(TC[0], TC[1]); c.rotate(lt * 0.12);
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; c.fillStyle = i % 2 ? 'rgba(201,161,94,0.07)' : 'rgba(201,161,94,0.025)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 1500, a, a + TAU / 72); c.closePath(); c.fill(); }
  c.restore();
  for (let i = 0; i < 90; i++) { const x = hash(i * 3.1) * W, y = ((hash(i * 7.7) * H - lt * (30 + 60 * hash(i))) % H + H) % H, tw = 0.5 + 0.5 * Math.sin(t * 5 + i); c.fillStyle = `rgba(233,200,140,${0.5 * tw})`; c.beginPath(); c.arc(x, y, 1.5 + 2.5 * hash(i * 2), 0, TAU); c.fill(); }
  c.restore();
  // the golden edge rides the closing triangle, then glows; an inner line and a shimmer
  c.save(); c.strokeStyle = C.gold; c.lineJoin = 'round'; c.shadowColor = 'rgba(233,190,110,0.8)'; c.shadowBlur = 24;
  c.lineWidth = 12; tumarPath(c, TC[0], TC[1], S); c.stroke(); c.shadowBlur = 0;
  if (close >= 1) { c.lineWidth = 3; c.globalAlpha = E.outCubic(prog(t, t0 + 0.5, t0 + 0.9)); tumarPath(c, TC[0], TC[1] + 18, TS * 0.88); c.stroke(); c.globalAlpha = 1; }
  c.restore();
  const sh = prog(t, t0 + 0.9, t0 + 1.4);
  if (sh > 0 && sh < 1) { c.save(); tumarPath(c, TC[0], TC[1], TS); c.lineWidth = 14; c.strokeStyle = 'rgba(255,250,230,0.0)'; c.clip(); const gx = lerp(-300, W + 300, sh); const g = c.createLinearGradient(gx - 160, 0, gx + 160, 0); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, 'rgba(255,240,200,0.28)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
  // the loop on top and three swinging pendants; the middle one is a little úki feather
  if (close >= 1) {
    const dk = Math.max(0, E.outBack(prog(t, t0 + 0.45, t0 + 0.8)));
    const top = [TC[0], TC[1] - 0.62 * TS];
    c.save(); c.strokeStyle = C.gold; c.lineWidth = 7; c.beginPath(); c.arc(top[0], top[1] - 30, 26 * dk, 0, TAU); c.stroke(); c.restore();
    const leave = E.inCubic(prog(t, T.fin - 0.5, T.fin - 0.05));
    [-0.36, 0, 0.36].forEach((dx, i) => {
      const ax = TC[0] + dx * TS, ay = TC[1] + 0.38 * TS, L = 150 * dk;
      const sw = 0.28 * Math.sin(lt * 3.2 + i * 1.3) * Math.exp(-0.25 * lt) + 0.06 * Math.sin(lt * 5 + i);
      const ex = ax + Math.sin(sw) * L, ey = ay + Math.cos(sw) * L;
      c.save(); c.strokeStyle = C.gold; c.lineWidth = 4; c.setLineDash([10, 6]); c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]); c.restore();
      if (i === 1) {
        const fx = lerp(ex, CX + 160, leave), fy = lerp(ey + 85, -260, leave);
        feather(c, fx, fy, 180, { rot: sw * 1.2 + leave * 0.8, ink: '#E8C47E', barbCol: '#D9B26A', outline: 1, barbs: dk });
      } else { c.save(); c.fillStyle = C.gold; c.shadowColor = 'rgba(233,190,110,0.8)'; c.shadowBlur = 16; c.beginPath(); c.arc(ex, ey + 16, 16 * dk, 0, TAU); c.fill(); c.restore(); }
    });
  }
  line(c, 'Нагима Кайдарова', t, t0 + 0.45, CX, 215, CG(700, 112), '#FFF6EA', { shadow: 'rgba(0,0,0,0.8)' });
  line(c, 'SINCE 2014 · ASTANA', t, t0 + 0.7, CX, 300, JO(500, 46), C.gold, { ls: 12, shadow: 'rgba(0,0,0,0.8)' });
  line(c, 'тумар — оберег,', t, t0 + 0.95, CX, 1600, CG(700, 88), '#FFF6EA', { shadow: 'rgba(0,0,0,0.8)' });
  line(c, 'с которого всё началось', t, t0 + 1.05, CX, 1695, CG(700, 88), '#FFF6EA', { shadow: 'rgba(0,0,0,0.8)' });
  line(c, 'АВТОРСКИЕ ПРИНТЫ', t, t0 + 1.2, CX, 1790, JO(500, 44), C.gold, { ls: 12, shadow: 'rgba(0,0,0,0.8)' });
}

// ---------------------------------------------------------------- 14.5–18 · the feather lands into the logo
let WORD = null, TAG = null; const WM = { w: 248.2, h: 56.2 }, TG = { w: 321.2, h: 18.5 };
function shotFin(c, t) {
  const t0 = T.fin;
  const open = E.inOutCubic(prog(t, t0 - 0.25, t0 + 0.5));
  if (open < 1) shotTumar(c, t);
  c.save(); tumarPath(c, CX, 900, lerp(30, 6200, open)); c.clip();
  paper(c);
  // the feather drifts down, swaying, and settles where it lives in the logo
  const fall = E.outCubic(prog(t, t0, t0 + 1.25)), sway = (1 - fall) * 0.35 * Math.sin((t - t0) * 5);
  const fx = lerp(CX + 160, CX, fall) + (1 - fall) * 90 * Math.sin((t - t0) * 3.2), fy = lerp(-260, 690, fall);
  feather(c, fx, fy, 820, { rot: sway, outline: 1, ink: mix('#C9A15E', '#1a1a1a', E.inOutCubic(prog(t, t0, t0 + 0.9))), barbs: E.inOutCubic(prog(t, t0 + 0.6, t0 + 1.4)) });
  // wordmark + tagline (traced from their avatar), big, then held
  const wk = E.outCubic(prog(t, t0 + 1.2, t0 + 1.7)), hold = E.inOutSine(prog(t, t0 + 1.7, DUR));
  if (wk > 0) {
    const s = 760 / WM.w * (1 + 0.025 * hold), x = CX - WM.w * s / 2, y = 1210 - WM.h * s / 2 + 30 * (1 - wk);
    c.save(); c.globalAlpha = wk; c.translate(x, y); c.scale(s, s); c.fillStyle = '#1a1a1a'; c.fill(WORD); c.restore();
  }
  const tk = E.outCubic(prog(t, t0 + 1.5, t0 + 2.0));
  if (tk > 0) { const s = 760 / TG.w, x = CX - TG.w * s / 2, y = 1420 + 20 * (1 - tk); c.save(); c.globalAlpha = tk; c.translate(x, y); c.scale(s, s); c.fillStyle = '#2a2a2a'; c.fill(TAG); c.restore(); }
  line(c, 'made by @f4rh4t._', t, t0 + 2.0, CX, 1800, JO(500, 42), col('#1a1a1a', 0.85), { ls: 4 });
  c.restore();
}

// ---------------------------------------------------------------- frame
function flashAt(t, t0, d = 0.14, a = 0.6) { return t >= t0 && t < t0 + d ? a * (1 - (t - t0) / d) ** 2 : 0; }
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of [[T.print, 18, 0.25], [T.oyu + 2.55, 6, 0.2], [T.fin + 1.2, 6, 0.2]]) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d, f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  RIB.visible = false; cam.position.set(0, 0, CAMZ); cam.lookAt(0, 0, 0);
  const [sx, sy] = shakeAt(t); ctx.save(); ctx.translate(sx, sy);
  if (t < T.wrap - 0.1) shotPro(ctx, t);
  else if (t < T.print) { if (t < T.wrap + 0.2) { shotPro(ctx, t); ctx.save(); ctx.globalAlpha = E.inOutCubic(prog(t, T.wrap - 0.1, T.wrap + 0.2)); shotWrap(ctx, t); ctx.restore(); } else shotWrap(ctx, t); }
  else if (t < T.oyu - 0.35) shotPrint(ctx, t);
  else if (t < T.card) shotOyu(ctx, t);
  else if (t < T.tumar - 0.2) shotCard(ctx, t);
  else if (t < T.fin - 0.25) shotTumar(ctx, t);
  else shotFin(ctx, t);
  ctx.restore();
  post(t);
}
function post(t) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  const fl = Math.max(flashAt(t, T.print, 0.18, 0.85), flashAt(t, T.oyu + 2.55, 0.15, 0.2), flashAt(t, T.fin + 1.2, 0.12, 0.15));
  if (fl > 0) { c.fillStyle = `rgba(255,250,240,${fl})`; c.fillRect(0, 0, W, H); }
  c.save(); c.globalAlpha = 0.04; c.globalCompositeOperation = 'overlay'; c.drawImage(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0, W, H); c.restore();
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
  ev(0.12, 'draw', { end: 0.8 }); ev(0.45, 'barbs', { end: 1.3 }); ev(1.2, 'loose');
  ev(T.wrap - 0.1, 'ribbon', { end: T.wrap + 1.2 }); ev(T.print - 0.4, 'dive');
  ev(T.oyu - 0.65, 'unravel', { end: T.oyu - 0.1 }); ev(T.print, 'drop'); ev(T.print + 0.15, 'rise'); ev(T.print + 1.75, 'word'); ev(T.print + 1.9, 'tick');
  ev(T.oyu - 0.35, 'knitup'); ev(T.oyu, 'knit', { end: T.oyu + 2.3 }); ev(T.oyu + 2.55, 'match');
  ev(T.card - 0.3, 'title');
  ev(T.tumar - 0.2, 'close'); ev(T.tumar + 0.1, 'gold', { end: T.tumar + 0.9 });
  ev(T.fin - 0.5, 'detach'); ev(T.fin - 0.25, 'open'); ev(T.fin, 'fall', { end: T.fin + 1.25 }); ev(T.fin + 1.2, 'logo'); ev(T.fin + 1.3, 'whisper');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function loadImg(src) { const im = new Image(); im.src = src; await im.decode(); return im; }
async function boot() {
  const faces = await (await fetch('/fonts/faces.json')).json();
  for (const f of faces) { const ff = new FontFace(f.family, `url(/fonts/${f.file})`, { weight: f.weight, style: f.style, unicodeRange: f.range }); await ff.load(); document.fonts.add(ff); }
  await document.fonts.load(OS(600, 40), 'MAHABBAT'); await document.fonts.load(CG(600, 40), 'любовь love'); await document.fonts.load(JO(500, 30), 'SINCE Астана');
  const path = async f => new Path2D((await (await fetch(f)).text()).match(/ d="([^"]+)"/)[1]);
  FEATHER = await path('/assets/kaidarova_feather.svg'); WORD = await path('/assets/kaidarova_wordmark.svg'); TAG = await path('/assets/kaidarova_tagline.svg');
  ROWS = await (await fetch('/assets/feather_rows.json')).json(); buildBarbs();
  DRESS = await loadImg('/cut/mahabbat.png');
  DRESSB = mk(DRESS.width, DRESS.height); { const x = DRESSB.getContext('2d'); x.drawImage(DRESS, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#3a3226'; x.fillRect(0, 0, DRESS.width, DRESS.height); }
  PHOTO = await loadImg('/img/oyu_cardigan.jpg'); TUMAR = await loadImg('/img/Tumar-dress.png');
  buildGrain(); buildPrint(); buildOyu(); buildRibbon();
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
