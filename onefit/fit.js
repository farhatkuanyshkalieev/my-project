// 1Fit — 20 s vertical ad (1080×1920, 60 fps).
// «One pass — every sport»: a glossy 1Fit membership card bursts into 3D sport
// objects; six sports cut on the voice (gym, pool, yoga, dance, boxing,
// crossfit), each with its own brand colour, object and type trick; a 3D city
// map where 1406+ gym pins rain down around home and work; a 3D phone that
// scans the QR at the door; instalments and guest passes; the 1FIT pill logo.
// Brand look from 1fit.app: royal blue #3447F6 → violet, pink, cyan, bold
// italic type, glossy candy 3D. Every frame is a pure function of t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { C, DUR } from './vo/cues.js';

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2;
const P = { B: '#3447F6', V: '#4C27DE', V2: '#7D5DFF', Per: '#7377FA', Pk: '#F65BAF', Pk2: '#FCA2FE', Cy: '#44C7FF', Rd: '#F14635', Gd: '#E9D290', Nv: '#0B0B2A', W: '#FFFFFF', Lm: '#C9F25A' };
const SHOT = { hook: [0, C.gym], mont: [C.gym, C.more], map: [C.more, C.open], app: [C.open, C.inst], offer: [C.inst, C.brand], end: [C.brand, DUR] };
const SPORTS = [
  { k: 'gym', word: 'ЗАЛ', bg: [P.V, '#2A0FA0'], obj: 'dumbbell', trick: 'slam' },
  { k: 'pool', word: 'БАССЕЙН', bg: [P.Cy, '#1A7FD6'], obj: 'ring', trick: 'wave' },
  { k: 'yoga', word: 'ЙОГА', bg: [P.Pk2, '#E06BE6'], obj: 'mat', trick: 'breath' },
  { k: 'dance', word: 'ТАНЦЫ', bg: [P.Pk, '#B5186F'], obj: 'disco', trick: 'bounce' },
  { k: 'box', word: 'БОКС', bg: [P.Rd, '#A3170C'], obj: 'glove', trick: 'punch' },
  { k: 'cross', word: 'КРОССФИТ', bg: [P.B, '#151E9E'], obj: 'kettle', trick: 'stretch' },
];
const sportT = i => C[SPORTS[i].k];

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
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const X = px => (px - CX) / 100, Y = py => (CY - py) / 100;
const IB = s => `italic 900 ${s}px "Inter"`;
const IX = (w, s) => `italic ${w} ${s}px "Inter"`;
const SB = (w, s) => `${w} ${s}px "Inter"`;
const MONO = (w, s) => `${w} ${s}px "JB Mono"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

const out = document.getElementById('c');
const ctx = out.getContext('2d');
const tmp = mk(W, H), tctx = tmp.getContext('2d');

// ---------------------------------------------------------------- three.js studio
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.LinearToneMapping; R3.toneMappingExposure = 1.0;
R3.outputColorSpace = THREE.SRGBColorSpace; R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
const CAMZ = 9.6 / Math.tan(15 * Math.PI / 180);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight('#ffffff', '#c9c6ff', 1.0); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffffff', 2.4);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8;
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 16, bottom: -16, near: 1, far: 90 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight('#dfe4ff', 1.4); rim.position.set(8, 6, -8); scene.add(rim);
const wallC = new THREE.Mesh(new THREE.PlaneGeometry(90, 120), new THREE.ShadowMaterial({ opacity: 0.3 }));
wallC.receiveShadow = true; scene.add(wallC);
const REG = [];
function reg(o) { REG.push(o); o.visible = false; scene.add(o); return o; }
const on = o => { o.visible = true; return o; };
const sh = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const candy = (c, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.8 }, o));
const matte = (c, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.55, clearcoat: 0.3, envMapIntensity: 0.6 }, o));
const chrome = (c = '#e8e8f0') => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.16, envMapIntensity: 1.3 });
const texOf = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------------------------------------------------------------- brand logo (from 1fit.app/icons/logo.svg)
let LOGO_PATH = null, LOGO_IMG = null;
function drawLogo(c, cx, cy, w, pill = P.B, ink = '#fff') {
  const s = w / 65; c.save(); c.translate(cx - w / 2, cy - 16.5 * s); c.scale(s, s);
  if (pill) { c.fillStyle = pill; c.beginPath(); c.roundRect(0, 0, 65, 33, 16.5); c.fill(); }
  c.fillStyle = ink; c.fill(LOGO_PATH, 'evenodd'); c.restore();
}

// ---------------------------------------------------------------- 3D props (original models)
const PROPS = {};
function dumbbell() {
  const g = new THREE.Group(), plate = candy(P.V2), rimM = candy('#2a1a8f'), ch = chrome();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.0, 32), ch));
  for (const s of [-1, 1]) {
    for (const [x, r, w] of [[0.55, 0.62, 0.22], [0.8, 0.5, 0.18]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 6), x > 0.6 ? rimM : plate); m.position.y = s * x; g.add(m); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), ch); cap.position.y = s * 0.98; g.add(cap);
  }
  g.rotation.z = Math.PI / 2; const w = new THREE.Group(); w.add(g); return sh(w);
}
function swimRing() {
  const cv = mk(1024, 64), c = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : P.Pk; c.fillRect(i * 128, 0, 128, 64); }
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.36, 40, 96), candy('#ffffff', { map: texOf(cv) }));
  const w = new THREE.Group(); w.add(m); return sh(w);
}
function yogaMat() {
  const g = new THREE.Group(), pink = candy(P.Pk2, { roughness: 0.6, clearcoat: 0.2 });
  const cv = mk(512, 512), c = cv.getContext('2d'); c.fillStyle = P.Pk2; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = '#c94fc4'; c.lineWidth = 10; c.beginPath(); for (let a = 0; a < 30; a += 0.05) { const r = 12 + a * 8; c.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); } c.stroke();
  const end = candy('#ffffff', { map: texOf(cv), roughness: 0.6, clearcoat: 0.2 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.0, 48), [pink, end, end]); roll.rotation.z = Math.PI / 2; roll.position.y = 0.3; g.add(roll);
  const flat = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.06, 1.6, 2, 0.02), pink); flat.position.set(0, -0.15, 0.8); g.add(flat);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 12, 48), candy(P.V)); strap.rotation.y = Math.PI / 2; strap.position.set(0.55, 0.3, 0); g.add(strap);
  return sh(g);
}
function discoBall() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 28, 18), new THREE.MeshStandardMaterial({ color: '#d8d8ec', metalness: 1, roughness: 0.08, flatShading: true, envMapIntensity: 1.6 }));
  g.add(m);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 8), chrome('#999')); cord.position.y = 2.4; g.add(cord);
  return sh(g);
}
function boxingGlove() {
  const g = new THREE.Group(), red = candy(P.Rd), white = candy('#ffffff', { roughness: 0.5 });
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.75, 48, 32), red); fist.scale.set(1.0, 1.1, 0.95); fist.position.y = 0.35; g.add(fist);
  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), red); knuckle.scale.set(1.1, 0.75, 1.0); knuckle.position.set(0, 0.85, 0.18); g.add(knuckle);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 12, 24), red); thumb.position.set(-0.62, 0.35, 0.35); thumb.rotation.z = 0.5; g.add(thumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.75, 48), red); cuff.position.y = -0.55; g.add(cuff);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.565, 0.565, 0.18, 48), white); band.position.y = -0.4; g.add(band);
  return sh(g);
}
function kettlebell() {
  const g = new THREE.Group(), body = candy('#1d1f4f', { roughness: 0.35 }), acc = candy(P.Lm);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 32), body); b.scale.set(1, 0.92, 1); g.add(b);
  const flat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 40), body); flat.position.y = -0.72; g.add(flat);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 20, 48, Math.PI), body); handle.position.y = 0.6; g.add(handle);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 20), body); leg.position.set(s * 0.42, 0.5, 0); g.add(leg); }
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.05, 12, 64), acc); ringM.rotation.x = Math.PI / 2; g.add(ringM);
  return sh(g);
}
// the membership card
function membershipCard() {
  const cv = mk(1080, 680), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 1080, 680); g.addColorStop(0, '#2c3cf0'); g.addColorStop(0.55, '#5a2ce6'); g.addColorStop(1, '#a23cf0'); c.fillStyle = g; c.fillRect(0, 0, 1080, 680);
  for (let i = 0; i < 9; i++) { c.strokeStyle = `rgba(255,255,255,${0.05 + 0.02 * i})`; c.lineWidth = 3; c.beginPath(); c.arc(1000, 760, 260 + i * 70, Math.PI, Math.PI * 1.5); c.stroke(); }
  drawLogo(c, 210, 110, 260, null, '#fff');
  c.fillStyle = '#fff'; c.font = IB(170); c.fillText('365', 70, 520);
  c.font = SB(700, 40); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillText('Абонемент на все виды спорта', 74, 600);
  c.fillStyle = P.Gd; c.beginPath(); c.roundRect(860, 70, 150, 110, 18); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; for (const y of [105, 125, 145]) { c.beginPath(); c.moveTo(860, y); c.lineTo(1010, y); c.stroke(); }
  const front = new THREE.MeshPhysicalMaterial({ map: texOf(cv), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.6, iridescenceIOR: 1.4, envMapIntensity: 1.0 });
  const side = candy('#3a2ae0');
  const m = new THREE.Mesh(new RoundedBoxGeometry(5.4, 3.4, 0.12, 4, 0.06), [side, side, side, side, front, side]);
  const w = new THREE.Group(); w.add(m); return sh(w);
}
function mapPin(colr) {
  const g = new THREE.Group(), m = candy(colr);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), m); head.position.y = 0.75; g.add(head);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.65, 32), m); cone.rotation.x = Math.PI; cone.position.y = 0.36; g.add(cone);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), candy('#ffffff')); dot.position.set(0, 0.78, 0.24); g.add(dot);
  return sh(g);
}
function house(colr) {
  const g = new THREE.Group(), body = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.7, 0.9, 3, 0.06), candy('#ffffff')); body.position.y = 0.35; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.55, 4), candy(colr)); roof.rotation.y = Math.PI / 4; roof.position.y = 0.97; g.add(roof);
  return sh(g);
}
function office(colr) {
  const g = new THREE.Group(), body = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.7, 0.7, 3, 0.06), candy(colr)); body.position.y = 0.85; g.add(body);
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.72), candy('#ffffff')); w.position.y = 0.35 + i * 0.36; g.add(w); }
  return sh(g);
}
function phone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.7, 7.6, 0.36, 6, 0.42), new THREE.MeshPhysicalMaterial({ color: '#15151f', metalness: 0.6, roughness: 0.25, clearcoat: 1, envMapIntensity: 1.0 }));
  g.add(body);
  const scv = mk(700, 1440); PROPS.screenCv = scv; PROPS.screenTex = texOf(scv);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 7.3), new THREE.MeshBasicMaterial({ map: PROPS.screenTex, toneMapped: false }));
  scr.position.z = 0.185; g.add(scr);
  const isl = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.28, 0.02, 3, 0.12), new THREE.MeshBasicMaterial({ color: '#000' })); isl.position.set(0, 3.35, 0.2); g.add(isl);
  return sh(g);
}
function ticket(label, colr) {
  const cv = mk(640, 300), c = cv.getContext('2d');
  c.fillStyle = colr; c.beginPath(); c.roundRect(0, 0, 640, 300, 36); c.fill();
  c.globalCompositeOperation = 'destination-out'; for (const y of [150]) { c.beginPath(); c.arc(0, y, 40, 0, TAU); c.arc(640, y, 40, 0, TAU); c.fill(); } c.globalCompositeOperation = 'source-over';
  c.setLineDash([14, 12]); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 5; c.beginPath(); c.moveTo(450, 30); c.lineTo(450, 270); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#fff'; c.font = IB(64); c.fillText(label, 50, 135); c.font = SB(700, 34); c.fillText('бесплатный визит', 52, 190);
  drawLogo(c, 545, 150, 150, '#fff', colr);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.97), new THREE.MeshPhysicalMaterial({ map: texOf(cv), transparent: true, alphaTest: 0.5, roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide }));
  m.castShadow = true; const w = new THREE.Group(); w.add(m); return w;
}
let LOGO3D = null;
function logo3D(svgText) {
  const data = new SVGLoader().parse(svgText);
  const g = new THREE.Group();
  const s = 1 / 65;
  const pill = new THREE.Shape(); const w = 65, h = 33, r = 16.5;
  pill.moveTo(r, 0); pill.lineTo(w - r, 0); pill.absarc(w - r, r, r, -Math.PI / 2, Math.PI / 2, false); pill.lineTo(r, h); pill.absarc(r, r, r, Math.PI / 2, Math.PI * 1.5, false);
  const pg = new THREE.ExtrudeGeometry(pill, { depth: 4, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.6, bevelSegments: 8, curveSegments: 48 });
  pg.translate(-32.5, -16.5, -4); pg.scale(s, -s, -s);
  g.add(new THREE.Mesh(pg, candy(P.B)));
  const letters = [];
  for (const p of data.paths) { const f = (p.userData.style.fill || '').toLowerCase(); if (f === 'white' || f === '#fff' || f === '#ffffff') letters.push(...SVGLoader.createShapes(p)); }
  const lg = new THREE.ExtrudeGeometry(letters, { depth: 2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.35, bevelSegments: 4, curveSegments: 12 });
  lg.translate(-32.5, -16.5, 0); lg.scale(s, -s, -s); lg.translate(0, 0, 0.112);
  g.add(new THREE.Mesh(lg, candy('#ffffff', { roughness: 0.2 })));
  return sh(g);
}

// ---------------------------------------------------------------- 2D helpers
function bgGrad(c, a, b, cx = CX, cy = 820) {
  const g = c.createRadialGradient(cx, cy, 60, cx, cy, 1500); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function glowBlob(c, x, y, r, color, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col(color, a)); g.addColorStop(1, col(color, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
// kinetic italic word, letters fly in from below with a skew
function kWord(c, txt, t, t0, cx, baseY, size, color, o = {}) {
  c.save(); c.font = IB(size); c.letterSpacing = o.ls ?? '-2px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const ws = [...txt].map(ch => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0);
  let x = cx - tw / 2;
  for (let i = 0; i < txt.length; i++) {
    const ti = t0 + i * (o.stag ?? 0.025), k = prog(t, ti, ti + 0.24), e = E.outExpo(k);
    if (t >= ti) {
      c.save(); c.translate(x, baseY + (o.dy ?? 110) * (1 - e)); c.transform(1, 0, -0.25 * (1 - e), 1, 0, 0); c.globalAlpha = clamp(k * 3);
      if (o.stroke) { c.strokeStyle = color; c.lineWidth = 4; c.strokeText(txt[i], 0, 0); } else { c.fillStyle = color; c.fillText(txt[i], 0, 0); }
      c.restore();
    }
    x += ws[i];
  }
  c.restore();
  return tw;
}
function fitSize(c, txt, maxW, size) { c.font = IB(size); c.letterSpacing = '-2px'; const w = c.measureText(txt).width; return w > maxW ? size * maxW / w : size; }
function pillText(c, txt, cx, cy, size, bg, fg, k = 1) {
  if (k <= 0) return;
  c.save(); c.font = IX(800, size); const w = c.measureText(txt).width + size * 1.2, h = size * 1.6;
  c.translate(cx, cy); c.scale(k, k);
  c.fillStyle = 'rgba(0,0,30,0.18)'; c.beginPath(); c.roundRect(-w / 2 + 6, -h / 2 + 10, w, h, h / 2); c.fill();
  c.fillStyle = bg; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill();
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 2); c.restore();
}

// ---------------------------------------------------------------- per-frame 3D reset & render
function resetFrame() {
  for (const o of REG) o.visible = false;
  wallC.visible = true; wallC.position.set(0, 0, -2.2); wallC.rotation.set(0, 0, 0); wallC.material.opacity = 0.28; wallC.material.color.set('#000033');
  key.position.set(-6, 10, 13); key.target.position.set(0, 0, 0); hemi.intensity = 1.0;
  cam.position.set(0, 0, CAMZ); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.fov = 30; cam.updateProjectionMatrix();
}
let SHAKE = [0, 0];
function render3D(c) { cam.position.x += SHAKE[0] / 100; cam.position.y -= SHAKE[1] / 100; R3.render(scene, cam); c.drawImage(R3.domElement, 0, 0); }

// ---------------------------------------------------------------- shot 1: one card, every sport
const ORBIT = ['dumbbell', 'ring', 'mat', 'disco', 'glove', 'kettle'];
function orbitProps(t, t0, cx, cy, rad, k, spin = 1, vr = 1.25) {
  ORBIT.forEach((name, i) => {
    const o = on(PROPS[name + 'O']), a = i / ORBIT.length * TAU + (t - t0) * 0.9 * spin;
    const r = rad * E.outBack(clamp(k)), s = 0.62 * clamp(k * 1.4);
    o.position.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * vr, Math.sin(a + 1) * 1.6);
    o.rotation.set(t * 1.3 + i, t * 1.7 + i * 2, t * 0.6);
    o.scale.setScalar(Math.max(0.001, s));
  });
}
function shotHook(c, t) {
  bgGrad(c, '#4a3cff', '#14068c');
  glowBlob(c, 260, 520, 600, P.Pk, 0.35); glowBlob(c, 880, 1500, 700, P.Cy, 0.3);
  resetFrame();
  wallC.material.color.set('#0a0060'); wallC.material.opacity = 0.35;
  const card = on(PROPS.card), sp = spring(t, 0.15, 1.6, 0.42);
  card.position.set(0, Y(1010) + 0.2 * Math.sin(t * 2), 0.6);
  card.rotation.set(0.35 * (1 - sp) - 0.12 + 0.05 * Math.sin(t * 1.5), -Math.PI * 1.2 * (1 - sp) + 0.25 * Math.sin(t * 1.2), -0.08);
  card.scale.setScalar(0.5 + 0.5 * sp + 0.06 * Math.exp(-Math.max(0, t - C.all) * 6) * (t > C.all ? 1 : 0));
  if (t > C.all - 0.05) orbitProps(t, C.all, 0, Y(1010), 3.5, prog(t, C.all - 0.05, C.all + 0.45), 1, 0.85);
  render3D(c);
  kWord(c, 'ОДИН', t, C.one, CX, 440, 230, '#fff');
  kWord(c, 'АБОНЕМЕНТ', t, C.one + 0.25, CX, 570, fitSize(c, 'АБОНЕМЕНТ', 960, 150), P.Pk2);
  if (t >= C.all) { kWord(c, 'ВСЕ ВИДЫ', t, C.all, CX, 1590, 150, '#fff'); kWord(c, 'СПОРТА', t, C.all + 0.2, CX, 1750, 170, P.Cy); }
}

// ---------------------------------------------------------------- shot 2: six sports on the voice
function sportProp(i) { return PROPS[SPORTS[i].obj]; }
function wordTrick(c, s, t, t0) {
  const size = fitSize(c, s.word, 980, 300), base = 680;
  c.save(); c.font = IB(size); c.letterSpacing = '-4px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const k = prog(t, t0, t0 + 0.22), e = E.outExpo(k), lt = t - t0;
  const echo = (dx, dy, a) => { c.globalAlpha = a; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.strokeText(s.word, CX + dx, base + dy); c.globalAlpha = 1; };
  switch (s.trick) {
    case 'slam': { const sc = lerp(1.8, 1, e); c.translate(CX, base); c.scale(sc, sc); c.translate(-CX, -base); for (let j = 1; j <= 2; j++) echo(0, -j * 120 * (1 - e), 0.3 * (1 - k)); break; }
    case 'wave': { const ws = [...s.word].map(ch => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0); let x = CX - tw / 2; c.textAlign = 'left';
      for (let j = 0; j < s.word.length; j++) { const kj = E.outExpo(prog(t, t0 + j * 0.03, t0 + j * 0.03 + 0.25)); c.fillStyle = '#fff'; c.globalAlpha = kj; c.fillText(s.word[j], x, base + 140 * (1 - kj) + 18 * Math.sin(lt * 7 + j * 0.8)); x += ws[j]; }
      c.restore(); return; }
    case 'breath': { const sc = lerp(0.75, 1, E.outCubic(k)) * (1 + 0.025 * Math.sin(lt * 5)); c.globalAlpha = clamp(k * 2); c.translate(CX, base); c.scale(sc, sc); c.translate(-CX, -base); break; }
    case 'bounce': { const ws = [...s.word].map(ch => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0); let x = CX - tw / 2; c.textAlign = 'left';
      for (let j = 0; j < s.word.length; j++) { const sp2 = spring(t, t0 + j * 0.035, 3, 0.25); c.save(); c.translate(x + ws[j] / 2, base - 500 * (1 - sp2)); c.rotate((j % 2 ? 1 : -1) * 0.12 * Math.sin(lt * 9)); c.fillStyle = '#fff'; c.fillText(s.word[j], -ws[j] / 2, 0); c.restore(); x += ws[j]; }
      c.restore(); return; }
    case 'punch': { const sc = lerp(2.6, 1, E.outExpo(prog(t, t0, t0 + 0.1))); c.translate(CX, base - 100); c.scale(sc, sc); c.rotate(-0.06 * (1 - k)); c.translate(-CX, -base + 100); break; }
    case 'stretch': { c.translate(CX, base); c.scale(lerp(2.2, 1, e), lerp(0.4, 1, e)); c.translate(-CX, -base); break; }
  }
  c.fillStyle = '#fff'; c.fillText(s.word, CX, base);
  c.restore();
}
function drawSport(c, i, t) {
  const s = SPORTS[i], t0 = sportT(i);
  bgGrad(c, s.bg[0], s.bg[1], CX, 1000);
  // big soft rings behind the object
  for (let j = 0; j < 4; j++) { const r = 260 + j * 120 + 30 * Math.sin(t * 2 + j); c.strokeStyle = `rgba(255,255,255,${0.12 - j * 0.025})`; c.lineWidth = 3; c.beginPath(); c.arc(CX, 1150, r * E.outExpo(prog(t, t0, t0 + 0.35)), 0, TAU); c.stroke(); }
  if (s.trick === 'wave') for (let j = 0; j < 6; j++) { c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= W; x += 20) c.lineTo(x, 1500 + j * 60 + 16 * Math.sin(x * 0.012 + t * 4 + j)); c.stroke(); }
  if (s.trick === 'bounce') for (let j = 0; j < 40; j++) { const a = hash(j) * TAU + t * 0.6, r = 200 + 520 * hash(j + 3); glowBlob(c, CX + Math.cos(a) * r, 1150 + Math.sin(a) * r * 1.3, 30, '#ffffff', 0.5 * (0.5 + 0.5 * Math.sin(t * 8 + j))); }
  wordTrick(c, s, t, t0);
  // 3D
  resetFrame();
  wallC.material.color.set(s.bg[1]); wallC.material.opacity = 0.45;
  const o = on(sportProp(i)), sp = spring(t, t0, 2.2, 0.35), lt = t - t0;
  const base = { x: 0, y: Y(1180), s: 2.0 };
  let rx = 0.3, ry = lt * 1.2, rz = 0, dy = 0, sc = base.s * (0.4 + 0.6 * sp);
  if (s.obj === 'dumbbell') { rx = 0.25; ry = -0.6 + lt * 1.5; rz = 0.25 * Math.sin(lt * 3); dy = 0.25 * Math.sin(lt * 4); }
  if (s.obj === 'ring') { rx = 1.1 + 0.2 * Math.sin(lt * 3); ry = 0.3 * Math.sin(lt * 2); dy = 0.15 * Math.sin(lt * 5); }
  if (s.obj === 'mat') { rx = 0.4; ry = -0.5 + lt * 0.8; }
  if (s.obj === 'disco') { rx = 0.2; ry = lt * 2.5; }
  if (s.obj === 'glove') { rx = 0.1; ry = -0.6 + 0.3 * Math.sin(lt * 3); rz = -0.3; dy = 0; sc *= 1 + 0.15 * Math.exp(-lt * 6); o.position.z = 2.2 * Math.exp(-lt * 7); }
  if (s.obj === 'kettle') { rx = 0.2; ry = lt * 1.4; dy = 0.2 * Math.abs(Math.sin(lt * 5)); }
  o.position.set(base.x, base.y + dy - 1.6 * (1 - sp), s.obj === 'glove' ? o.position.z : 0);
  o.rotation.set(rx, ry + (1 - sp) * 2.5, rz);
  o.scale.setScalar(Math.max(0.001, sc));
  render3D(c);
  // little brand chip under the object
  const kk = E.outBack(prog(t, t0 + 0.12, t0 + 0.35));
  pillText(c, `0${i + 1} · в одном абонементе`, CX, 1620, 34, 'rgba(255,255,255,0.95)', s.bg[1], kk);
}
function wipeShape(c, i, p) {
  c.beginPath(); const R = 2400 * p;
  switch (i % 4) {
    case 0: c.arc(CX, 1180, R, 0, TAU); break;
    case 1: c.rect(0, H * (1 - p), W, H * p); break;
    case 2: c.moveTo(0, 0); c.lineTo(2 * W * p + 500, 0); c.lineTo(2 * W * p - 900, H); c.lineTo(0, H); break;
    case 3: c.rect(W * (1 - p), 0, W * p, H); break;
  }
}
function shotMont(c, t) {
  let i = 0; for (let j = 0; j < SPORTS.length; j++) if (t >= sportT(j)) i = j;
  const p = E.outExpo(prog(t, sportT(i), sportT(i) + 0.16));
  if (p < 1) {
    if (i === 0) shotHook(c, t); else drawSport(c, i - 1, t);
    c.save(); wipeShape(c, i, p); c.clip(); drawSport(c, i, t); c.restore();
  } else drawSport(c, i, t);
}

// ---------------------------------------------------------------- shot 3: 1406+ gyms around home and work
const PINS = [];
{ for (let i = 0; i < 46; i++) PINS.push({ x: (hash(i * 3.1) - 0.5) * 11, z: (hash(i * 7.3) - 0.5) * 13 - 1, d: hash(i * 1.7) * 0.9, c: [P.V2, P.Pk, P.Cy, P.B, P.Per][i % 5] }); }
let MAP = null;
function buildMap() {
  const cv = mk(2048, 2048), c = cv.getContext('2d');
  c.fillStyle = '#1b1f8a'; c.fillRect(0, 0, 2048, 2048);
  c.fillStyle = '#1f6fd0'; c.beginPath(); c.moveTo(0, 1500); c.bezierCurveTo(600, 1380, 900, 1700, 1400, 1560); c.bezierCurveTo(1700, 1480, 1900, 1650, 2048, 1600); c.lineTo(2048, 1720); c.bezierCurveTo(1800, 1760, 1500, 1640, 1300, 1700); c.bezierCurveTo(900, 1820, 600, 1500, 0, 1640); c.fill();
  for (const [x, y, w, h] of [[300, 300, 380, 260], [1300, 900, 420, 300], [700, 1100, 260, 200]]) { c.fillStyle = '#2d8f6a'; c.beginPath(); c.roundRect(x, y, w, h, 40); c.fill(); }
  c.strokeStyle = '#3a40b8'; c.lineCap = 'round';
  for (let i = 0; i < 20; i++) { c.lineWidth = i % 5 === 0 ? 26 : 12; c.beginPath(); c.moveTo(i * 110 + 20 * Math.sin(i), 0); c.lineTo(i * 110 - 60 + 30 * Math.cos(i), 2048); c.stroke(); c.beginPath(); c.moveTo(0, i * 110); c.lineTo(2048, i * 110 + 80 * Math.sin(i * 0.7)); c.stroke(); }
  c.strokeStyle = '#7377fa'; c.lineWidth = 34; c.beginPath(); c.moveTo(0, 900); c.bezierCurveTo(700, 820, 1300, 1050, 2048, 960); c.stroke();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: texOf(cv), roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  MAP = reg(new THREE.Group()); MAP.add(m);
  PROPS.pins = PINS.map(p => { const g = mapPin(p.c); MAP.add(g); return g; });
  PROPS.home = house(P.Pk); MAP.add(PROPS.home); PROPS.work = office(P.Cy); MAP.add(PROPS.work);
  PROPS.rings = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false })); r.rotation.x = -Math.PI / 2; MAP.add(r); return r; });
}
function shotMap(c, t) {
  bgGrad(c, '#2b2ff0', '#0a0b55', CX, 700);
  resetFrame(); wallC.visible = false;
  const t0 = C.more, near = C.near, lt = t - t0;
  const push = E.inOutCubic(prog(t, near, near + 0.9));
  cam.position.set(0.6 * Math.sin(lt * 0.5), lerp(13, 9, push), lerp(17, 12, push)); cam.lookAt(0, 0, lerp(-1, 1, push));
  key.position.set(-6, 14, 8);
  on(MAP); MAP.rotation.y = 0.1 * Math.sin(lt * 0.4) + lt * 0.05;
  PINS.forEach((p, i) => {
    const g = PROPS.pins[i], tp = t0 + 0.1 + p.d * 1.2, k = prog(t, tp, tp + 0.35);
    g.visible = k > 0; g.position.set(p.x, 5 * (1 - E.outCubic(k)) + (k >= 1 ? 0.08 * Math.abs(Math.sin((t - tp) * 6)) * Math.exp(-(t - tp) * 3) : 0), p.z);
    g.scale.setScalar(Math.max(0.001, 0.9 * E.outBack(k)));
  });
  const hk = E.outBack(prog(t, near, near + 0.35)), wk = E.outBack(prog(t, near + 0.35, near + 0.7));
  PROPS.home.visible = hk > 0; PROPS.home.position.set(-1.9, 0, 1.3); PROPS.home.scale.setScalar(Math.max(0.001, 1.3 * hk));
  PROPS.work.visible = wk > 0; PROPS.work.position.set(2.1, 0, -0.9); PROPS.work.scale.setScalar(Math.max(0.001, 1.2 * wk));
  PROPS.rings.forEach((r, j) => { const tk = [near + 0.1, near + 0.45][j], kk = ((t - tk) * 0.9) % 1; r.visible = t > tk; r.position.set(j ? 2.1 : -1.9, 0.02, j ? -0.9 : 1.3); r.scale.setScalar(1 + 2.4 * kk); r.material.opacity = 0.8 * (1 - kk); });
  render3D(c);
  { const g = c.createLinearGradient(0, 0, 0, 820); g.addColorStop(0, 'rgba(26,28,170,0.97)'); g.addColorStop(0.62, 'rgba(26,28,170,0.85)'); g.addColorStop(1, 'rgba(26,28,170,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 820); }
  // counter + type
  const n = Math.round(1406 * E.outCubic(prog(t, t0 + 0.05, t0 + 1.3)));
  const ck = E.outExpo(prog(t, t0, t0 + 0.25));
  c.save(); c.globalAlpha = ck; c.textAlign = 'center'; c.font = IB(250); c.letterSpacing = '-6px'; c.fillStyle = '#fff';
  c.fillText(`${n.toLocaleString('ru-RU').replace(/ /g, ' ')}+`, CX, 460 + 80 * (1 - ck));
  c.font = IX(800, 70); c.letterSpacing = '0px'; c.fillStyle = P.Pk2; c.fillText('залов и студий', CX, 560 + 60 * (1 - ck)); c.restore();
  if (t > near) {
    const p1 = E.outBack(prog(t, near + 0.05, near + 0.3)), p2 = E.outBack(prog(t, near + 0.4, near + 0.65));
    pillText(c, '🏠 рядом с домом', 330, 1560, 44, P.Pk, '#fff', p1);
    pillText(c, '💼 и работой', 760, 1680, 44, P.Cy, '#0a0b55', p2);
  }
}

// ---------------------------------------------------------------- shot 4: open the app, scan the QR, you're in
function qr(c, x, y, s) {
  const n = 25, cell = s / n; c.fillStyle = '#fff'; c.fillRect(x - 10, y - 10, s + 20, s + 20); c.fillStyle = '#111';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (hash(i * 31 + j * 7.7) > 0.52) c.fillRect(x + i * cell, y + j * cell, cell + 0.5, cell + 0.5);
  for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) { c.fillStyle = '#111'; c.fillRect(x + fx * cell, y + fy * cell, 7 * cell, 7 * cell); c.fillStyle = '#fff'; c.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, 5 * cell, 5 * cell); c.fillStyle = '#111'; c.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, 3 * cell, 3 * cell); }
}
function drawScreen(t) {
  const c = PROPS.screenCv.getContext('2d'), w = 700, h = 1440;
  c.fillStyle = '#0d0d1c'; c.fillRect(0, 0, w, h);
  const stage = t < C.scan ? 0 : t < C.train ? 1 : 2;
  c.fillStyle = '#fff'; c.font = SB(600, 26); c.fillText('9:41', 50, 64);
  if (stage === 0) {
    c.font = SB(800, 46); c.fillText('Мой абонемент', 40, 170);
    const g = c.createLinearGradient(40, 210, 660, 560); g.addColorStop(0, '#2c3cf0'); g.addColorStop(1, '#a23cf0'); c.fillStyle = g; c.beginPath(); c.roundRect(40, 210, 620, 360, 34); c.fill();
    drawLogo(c, 150, 270, 150, null, '#fff'); c.fillStyle = '#fff'; c.font = IB(110); c.fillText('365', 70, 470); c.font = SB(600, 28); c.fillText('12 месяцев · активен', 74, 530);
    const cats = [['Тренажёрный зал', P.V2], ['Бассейн', P.Cy], ['Йога', P.Pk2], ['Танцы', P.Pk]];
    cats.forEach(([n, cc], i) => { c.fillStyle = '#1b1b30'; c.beginPath(); c.roundRect(40, 620 + i * 120, 620, 100, 24); c.fill(); c.fillStyle = cc; c.beginPath(); c.arc(100, 670 + i * 120, 24, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = SB(600, 32); c.fillText(n, 150, 682 + i * 120); });
    const pk = 0.5 + 0.5 * Math.sin(t * 8);
    c.fillStyle = P.B; c.beginPath(); c.roundRect(40, 1150, 620, 140, 70); c.fill();
    c.strokeStyle = `rgba(255,255,255,${0.3 * pk})`; c.lineWidth = 8; c.beginPath(); c.roundRect(34, 1144, 632, 152, 76); c.stroke();
    c.fillStyle = '#fff'; c.font = SB(800, 40); c.textAlign = 'center'; c.fillText('Сканировать QR', 350, 1235); c.textAlign = 'left';
  } else if (stage === 1) {
    c.fillStyle = '#222234'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.font = SB(800, 40); c.textAlign = 'center'; c.fillText('Наведите на QR-код', 350, 200); c.textAlign = 'left';
    qr(c, 150, 420, 400);
    const k = ((t - C.scan) * 1.6) % 1; c.fillStyle = col(P.Cy, 0.9); c.fillRect(120, 410 + 420 * k, 460, 8);
    c.strokeStyle = P.Cy; c.lineWidth = 10; for (const [x, y, sx, sy] of [[110, 380, 1, 1], [590, 380, -1, 1], [110, 860, 1, -1], [590, 860, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * 70); c.lineTo(x, y); c.lineTo(x + sx * 70, y); c.stroke(); }
  } else {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1fbf6a'); g.addColorStop(1, '#0d7a43'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const k = E.outBack(prog(t, C.train, C.train + 0.35));
    c.save(); c.translate(350, 560); c.scale(k, k); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.fill();
    c.strokeStyle = '#1fbf6a'; c.lineWidth = 34; c.lineCap = 'round'; c.beginPath(); c.moveTo(-70, 0); c.lineTo(-15, 55); c.lineTo(80, -60); c.stroke(); c.restore();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = SB(800, 56); c.fillText('Добро пожаловать!', 350, 860);
    c.font = SB(600, 34); c.fillText('Визит засчитан · 19:30', 350, 920); c.textAlign = 'left';
  }
  PROPS.screenTex.needsUpdate = true;
}
function shotApp(c, t) {
  const t0 = C.open;
  const good = t >= C.train;
  if (!good) bgGrad(c, '#5b3cff', '#14068c', CX, 900); else bgGrad(c, '#2ad37f', '#0a5c36', CX, 900);
  if (!good) { glowBlob(c, 900, 400, 600, P.Pk, 0.3); glowBlob(c, 150, 1500, 600, P.Cy, 0.3); }
  drawScreen(t);
  resetFrame(); wallC.material.color.set(good ? '#003d1c' : '#0a0060'); wallC.material.opacity = 0.4;
  const ph = on(PROPS.phone), sp = spring(t, t0, 1.8, 0.4), lt = t - t0;
  const scanK = E.inOutCubic(prog(t, C.scan - 0.1, C.scan + 0.3));
  ph.position.set(lerp(0, -0.3, scanK), Y(1040) + 2.5 * (1 - sp) + 0.1 * Math.sin(lt * 2), 0);
  ph.rotation.set(lerp(0.25, 0.05, sp) + 0.05 * Math.sin(lt * 1.5), lerp(-1.4, 0, sp) + lerp(-0.18, 0.22, scanK) + 0.06 * Math.sin(lt * 1.3), lerp(0.2, -0.05, sp));
  ph.scale.setScalar(Math.max(0.001, lerp(0.85, 1.22, sp)));
  if (good) {   // the sport props storm out of the screen
    orbitProps(t, C.train, 0, Y(1040), 4.4, prog(t, C.train, C.train + 0.5), -1.4);
  }
  render3D(c);
  // tap ripple on «Сканировать»
  const tapT = C.scan - 0.25;
  if (t > tapT && t < tapT + 0.4) { const k = prog(t, tapT, tapT + 0.4); c.strokeStyle = col('#ffffff', 1 - k); c.lineWidth = 8; c.beginPath(); c.arc(CX - 20, 1345, 30 + 120 * k, 0, TAU); c.stroke(); c.fillStyle = col('#ffffff', 0.6 * (1 - k)); c.beginPath(); c.arc(CX - 20, 1345, 34, 0, TAU); c.fill(); }
  // captions
  const cap = t < C.scan ? ['Открыл приложение', P.Pk2] : t < C.train ? ['Сканируешь QR на входе', P.Cy] : ['И ты на тренировке!', '#ffffff'];
  const ct = t < C.scan ? C.open : t < C.train ? C.scan : C.train;
  kWord(c, cap[0], t, ct, CX, 300, fitSize(c, cap[0], 960, 96), cap[1], { stag: 0.015, dy: 70 });
}

// ---------------------------------------------------------------- shot 5: instalments + guest passes
function shotOffer(c, t) {
  const t0 = C.inst, g = C.guest;
  bgGrad(c, '#ff6fc8', '#7a1fd6', CX, 900);
  glowBlob(c, 900, 300, 500, '#ffffff', 0.18);
  resetFrame(); wallC.material.color.set('#3c0a6e'); wallC.material.opacity = 0.35;
  const card = on(PROPS.card), sp = spring(t, t0, 1.8, 0.4);
  const toG = E.inOutCubic(prog(t, g - 0.1, g + 0.35));
  card.position.set(0, lerp(Y(930), Y(820), toG), 0.3);
  card.rotation.set(-0.15 + 0.05 * Math.sin(t * 2), lerp(1.4, 0, sp) + 0.2 * Math.sin(t * 1.4), 0.06);
  card.scale.setScalar(lerp(0.85, 0.7, toG));
  if (t > g) {
    PROPS.tickets.forEach((tk, j) => { const k = E.outBack(prog(t, g + 0.1 + j * 0.15, g + 0.45 + j * 0.15)); on(tk);
      tk.position.set(lerp(0, j ? 2.2 : -2.2, k), lerp(Y(820), Y(1330 + j * 60), k), 1.2 + j * 0.2);
      tk.rotation.set(0.2 * Math.sin(t * 2 + j), (j ? -1 : 1) * (0.5 * (1 - k) + 0.15 * Math.sin(t * 1.6)), (j ? -1 : 1) * 0.12);
      tk.scale.setScalar(Math.max(0.001, 0.85 * k)); });
  }
  render3D(c);
  // instalment bar: price splits into 12 parts
  const ik = prog(t, t0 + 0.15, t0 + 0.7), out = 1 - E.inExpo(prog(t, g - 0.15, g));
  if (t < g) {
    kWord(c, 'РАССРОЧКА', t, t0, CX, 380, fitSize(c, 'РАССРОЧКА', 960, 170), '#fff');
    pillText(c, 'без переплат', CX, 470, 52, '#ffffff', '#7a1fd6', E.outBack(prog(t, t0 + 0.25, t0 + 0.5)));
    const x0 = 120, bw = 840, y = 1480, n = 12;
    for (let j = 0; j < n; j++) {
      const kj = E.outBack(prog(t, t0 + 0.2 + j * 0.04, t0 + 0.45 + j * 0.04)) * out, gap = 12 * E.outCubic(ik);
      const segW = (bw - gap * (n - 1)) / n;
      c.save(); c.globalAlpha = clamp(kj); c.fillStyle = j % 2 ? '#ffffff' : P.Gd; c.beginPath(); c.roundRect(x0 + j * (segW + gap), y - 40 + 30 * (1 - kj), segW, 80, 18); c.fill(); c.restore();
    }
    c.save(); c.globalAlpha = clamp(ik * 2) * out; c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = IX(800, 54); c.fillText('платите частями · 0% переплат', CX, 1620); c.restore();
  } else {
    kWord(c, 'ГОСТЕВЫЕ', t, g, CX, 360, fitSize(c, 'ГОСТЕВЫЕ', 960, 170), '#fff');
    pillText(c, 'для друзей — бесплатно', CX, 450, 50, '#ffffff', '#7a1fd6', E.outBack(prog(t, g + 0.2, g + 0.45)));
    // two friends
    [[250, 1720, P.Cy], [830, 1720, P.Gd]].forEach(([x, y, cc], j) => { const k = E.outBack(prog(t, g + 0.4 + j * 0.12, g + 0.7 + j * 0.12)); if (k <= 0) return;
      c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = cc; c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.fill();
      c.fillStyle = '#1a1040'; c.beginPath(); c.arc(-22, -10, 9, 0, TAU); c.arc(22, -10, 9, 0, TAU); c.fill(); c.strokeStyle = '#1a1040'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(0, 8, 26, 0.2, Math.PI - 0.2); c.stroke(); c.restore(); });
  }
}

// ---------------------------------------------------------------- shot 6: the logo
function shotEnd(c, t) {
  const t0 = C.brand, td = C.today;
  bgGrad(c, '#4a5cff', '#1a14a8', CX, 860);
  for (let j = 0; j < 5; j++) { const r = 300 + j * 150 + 40 * Math.sin(t * 1.5 + j); c.strokeStyle = `rgba(255,255,255,${0.1 - j * 0.015})`; c.lineWidth = 3; c.beginPath(); c.arc(CX, 860, r * E.outExpo(prog(t, t0, t0 + 0.5)), 0, TAU); c.stroke(); }
  resetFrame(); wallC.material.color.set('#05046a'); wallC.material.opacity = 0.4;
  const L = on(LOGO3D), sp = spring(t, t0, 2.0, 0.38);
  L.position.set(0, Y(860), 0.5 + 3 * (1 - E.outExpo(prog(t, t0, t0 + 0.2))));
  L.rotation.set(0.1 * Math.sin(t * 1.6) - 0.5 * (1 - sp), 0.25 * Math.sin(t * 1.2) + 1.2 * (1 - sp), 0);
  L.scale.setScalar(6.6 * Math.max(0.001, 0.6 + 0.4 * sp));
  orbitProps(t, t0, 0, Y(860), 4.0, prog(t, t0 + 0.1, t0 + 0.6), 0.7, 0.8);
  render3D(c);
  pillText(c, 'Абонемент на все виды спорта', CX, 1160, 40, '#ffffff', P.B, E.outBack(prog(t, t0 + 0.25, t0 + 0.55)));
  const k = prog(t, td, td + 0.3);
  if (k > 0) {
    kWord(c, 'Сегодня —', t, td, CX, 1360, 110, '#fff', { stag: 0.02 });
    kWord(c, 'лучшее время', t, td + 0.18, CX, 1480, fitSize(c, 'лучшее время', 960, 120), P.Pk2, { stag: 0.02 });
    kWord(c, 'для старта!', t, td + 0.36, CX, 1600, 120, '#fff', { stag: 0.02 });
  }
  const bk = E.outBack(prog(t, td + 0.6, td + 0.9));
  pillText(c, ' App Store', 330, 1770, 40, '#0b0b2a', '#fff', bk);
  pillText(c, ' Google Play', 760, 1770, 40, '#0b0b2a', '#fff', E.outBack(prog(t, td + 0.7, td + 1.0)));
  const ck = E.outCubic(prog(t, td + 0.9, td + 1.2));
  if (ck > 0) { c.save(); c.globalAlpha = ck; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = MONO(700, 28); c.letterSpacing = '4px'; c.fillStyle = col('#ffffff', 0.8); c.fillText('made by @frht.work', CX, 1866 + 16 * (1 - ck)); c.restore(); }
}

// ---------------------------------------------------------------- frame
const SHOTS = [[0, shotHook], [C.gym, shotMont], [C.more, shotMap], [C.open, shotApp], [C.inst, shotOffer], [C.brand, shotEnd]];
const HITS = [[C.one, 10, 0.15], [C.all, 16, 0.2], ...SPORTS.map((s, i) => [sportT(i), i === 4 ? 26 : 12, 0.18]), [C.more, 10, 0.15], [C.near, 8, 0.15], [C.open, 8, 0.15], [C.scan, 8, 0.12], [C.train, 18, 0.22], [C.inst, 10, 0.15], [C.guest, 10, 0.15], [C.brand, 22, 0.25], [C.today, 8, 0.12]];
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of HITS) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d; const f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
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
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  let idx = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) idx = i;
  SHAKE = shakeAt(t);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(SHAKE[0], SHAKE[1]);
  // section transitions: zoom-through (card → montage is handled by the wipe), whips between the others
  SHOTS[idx][1](ctx, t);
  ctx.restore();
  post(t, idx);
}
function post(t, idx) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  // whip transitions between big sections
  for (const [tb, dir] of [[C.more, 1], [C.open, -1], [C.inst, 1], [C.brand, -1]]) {
    if (t > tb - 0.1 && t < tb + 0.14) { const p = t < tb ? E.inExpo(prog(t, tb - 0.1, tb)) : 1 - E.outExpo(prog(t, tb, tb + 0.14)); dirBlur(dir * 200 * p, 0); }
  }
  if (t > C.train - 0.08 && t < C.train + 0.2) zoomBlur(0.25 * (1 - prog(t, C.train - 0.08, C.train + 0.2)), 1000);
  // flashes
  let fl = 0;
  for (const tf of [C.all, C.train, C.brand]) if (t >= tf && t < tf + 0.12) fl = Math.max(fl, 0.55 * Math.pow(1 - prog(t, tf, tf + 0.12), 2));
  if (fl > 0) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
  const vg = c.createRadialGradient(CX, CY, 600, CX, CY, 1300); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,0,40,0.28)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  const k0 = 1 - prog(t, 0, 0.1); if (k0 > 0) { c.fillStyle = `rgba(0,0,0,${k0})`; c.fillRect(0, 0, W, H); }
  const k1 = prog(t, DUR - 0.25, DUR); if (k1 > 0) { c.fillStyle = `rgba(0,0,0,${k1})`; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet
function buildEvents() {
  ev(0.12, 'cardIn'); ev(C.one, 'hit', { k: 1 }); ev(C.all, 'burst');
  SPORTS.forEach((s, i) => ev(sportT(i), 'sport', { i, obj: s.obj }));
  ev(C.more - 0.1, 'whip'); for (let i = 0; i < 18; i++) ev(C.more + 0.1 + i * 0.065, 'pin', { i });
  ev(C.more, 'counter', { end: C.more + 1.3 }); ev(C.near + 0.05, 'pop'); ev(C.near + 0.4, 'pop');
  ev(C.open - 0.1, 'whip'); ev(C.open, 'phoneIn'); ev(C.scan - 0.25, 'tap'); ev(C.scan, 'scan', { end: C.train }); ev(C.train, 'success');
  ev(C.inst - 0.1, 'whip'); for (let j = 0; j < 12; j++) ev(C.inst + 0.2 + j * 0.04, 'tick', { j }); ev(C.guest, 'swoosh'); ev(C.guest + 0.1, 'ticket'); ev(C.guest + 0.25, 'ticket');
  ev(C.brand - 0.1, 'whip'); ev(C.brand, 'logo'); ev(C.today + 0.6, 'pop'); ev(C.today + 0.7, 'pop');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = [
    ['Inter', '/@fonts/opentype/inter/Inter-BlackItalic.otf', '900', 'italic'],
    ['Inter', '/@fonts/opentype/inter/Inter-ExtraBoldItalic.otf', '800', 'italic'],
    ['Inter', '/@fonts/opentype/inter/Inter-Bold.otf', '700', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-ExtraBold.otf', '800', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-SemiBold.otf', '600', 'normal'],
    ['JB Mono', '/fonts/JetBrainsMono-Bold.ttf', '700', 'normal'],
  ];
  for (const [fam, url, wt, st] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt, style: st }); await f.load(); document.fonts.add(f); }
  const svg = await (await fetch('/assets/1fit_logo.svg')).text();
  LOGO_PATH = new Path2D(svg.match(/<path[^>]* d="([^"]+)"/)[1]);
  PROPS.card = reg(membershipCard());
  PROPS.dumbbell = reg(dumbbell()); PROPS.ring = reg(swimRing()); PROPS.mat = reg(yogaMat()); PROPS.disco = reg(discoBall()); PROPS.glove = reg(boxingGlove()); PROPS.kettle = reg(kettlebell());
  for (const n of ORBIT) PROPS[n + 'O'] = reg({ dumbbell, ring: swimRing, mat: yogaMat, disco: discoBall, glove: boxingGlove, kettle: kettlebell }[n]());
  buildMap();
  PROPS.phone = reg(phone());
  PROPS.tickets = [reg(ticket('+1 гость', P.V)), reg(ticket('+1 гость', P.B))];
  LOGO3D = reg(logo3D(svg));
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
