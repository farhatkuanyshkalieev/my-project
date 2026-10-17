// «От идеи к движению» v3: 3D motion piece.
// The look is a light, saturated 2D design layer with real 3D on top
// (three.js): extruded kinetic letters, a glossy mascot ball, jelly monsters,
// 3D props and soft shadows composited over the 2D canvas.
// Every beat is keyed to the voiceover word timestamps (vo3/).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as opentype from '/node_modules/opentype.js/dist/opentype.module.js';
import { VOENV } from './vo3/env.js';

const W = 1920, H = 1080, CX = 960, CY = 540, FPS = 60, TAU = Math.PI * 2;
const V0 = 0.6, DUR = 49.4;
const v = s => V0 + s;

// ---------------------------------------------------------------- palette & utils
const P = {
  bg: '#F4F1EC', bg2: '#ECE7DF', ink: '#17181E', gray: '#8C909A', or: '#FF5A1F', orL: '#FF9457', orD: '#D63C08', cream: '#FFF6EC',
  n1: '#0F1442', n2: '#2B1867', n3: '#4A23A8', blue: '#3D5AFE', purple: '#7A4DFF', pink: '#FF3D81', green: '#1FC26A', yellow: '#FFC531', sky: '#5BC0FF',
};
const hx = h => { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
const col = (h, a = 1) => { const c = typeof h === 'string' ? hx(h) : h; return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
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
  inBack: x => { const c1 = 1.70158; return (c1 + 1) * x * x * x - c1 * x * x; },
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
};
const spring = (t, t0, f = 3.0, z = 0.3) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * TAU * f * a) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * a); };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const X = px => (px - CX) / 100, Y = py => (CY - py) / 100;   // pixel → world (at z = 0)
const SANS2 = (w, s) => `${w} ${s}px "Inter Display"`;
const SERIF2 = s => `italic 500 ${s}px "Playfair"`;
const HAND = s => `700 ${s}px "Caveat"`;
const UI = (w, s) => `${w} ${s}px "Inter"`;
const MONO = s => `400 ${s}px "DejaVu Sans Mono"`;

// ---------------------------------------------------------------- timeline (film time)
const S = {
  hook: [0, v(2.8)], notes: [v(2.8), v(8.15)], dot: [v(8.15), v(12.62)], bites: [v(12.62), v(20.75)],
  night: [v(20.75), v(26.62)], impulse: [v(26.62), v(31.95)], craft: [v(31.95), v(35.66)],
  code: [v(35.66), v(39.5)], title: [v(39.5), v(43.6)], cta: [v(43.6), DUR],
};
const BITE1 = v(14.2), BITE2 = v(16.5), SUCK = v(19.6), FALL = v(24.2), STOP = v(25.52), REWIND = v(26.08), WIPE = v(26.72), LAUNCH = v(28.36), LAND = v(43.3);
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

// ---------------------------------------------------------------- 2D canvases
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const tmp = mk(W, H), tctx = tmp.getContext('2d');
const grains = [];

// ---------------------------------------------------------------- three.js setup
const R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R3.setPixelRatio(1); R3.setSize(W, H, false);
R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = 1.15;
R3.outputColorSpace = THREE.SRGBColorSpace;
R3.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 300);
const CAMZ = 5.4 / Math.tan(15 * Math.PI / 180);
scene.environment = new THREE.PMREMGenerator(R3).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight('#ffffff', '#ffd8c0', 1.3); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffffff', 2.6);
key.position.set(-4, 7, 18); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 10, bottom: -10, near: 1, far: 60 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight('#ffe9dc', 1.0); rim.position.set(8, 4, -6); scene.add(rim);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.ShadowMaterial({ opacity: 0.09 }));
wall.position.z = -0.5; wall.receiveShadow = true; scene.add(wall);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const phys = (c, r = 0.3, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: r, clearcoat: 0.6, clearcoatRoughness: 0.2 }, o));
const std = (c, r = 0.5, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o));
const MAT = {
  ink: [phys('#1C1D25', 0.35), std('#FF5A1F', 0.45)],
  inkG: [phys('#1C1D25', 0.35), std('#3B3E4C', 0.5)],
  or: [phys('#FF5A1F', 0.28, { clearcoat: 1 }), std('#C2380A', 0.45)],
  white: [phys('#FFFFFF', 0.3, { emissive: '#ffffff', emissiveIntensity: 0.18 }), std('#FFB48A', 0.45)],
  cream: [phys('#FFF6EC', 0.3), std('#1C1D25', 0.45)],
  purple: [phys('#7A4DFF', 0.3), std('#4B25B8', 0.45)],
  blue: [phys('#3D5AFE', 0.3), std('#2235B0', 0.45)],
  pink: [phys('#FF3D81', 0.3), std('#B81F55', 0.45)],
  yellow: [phys('#FFC531', 0.3), std('#C98A00', 0.45)],
};
const REG = [];   // everything managed per frame
function reg(o) { REG.push(o); o.visible = false; scene.add(o); return o; }
function on(o) { o.visible = true; return o; }

// ---------------------------------------------------------------- 3D type
const FONT = {};
const GEO = new Map();
function pointInPoly(p, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (((a.y > p.y) !== (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)) c = !c; } return c; }
function glyph(fk, ch) {
  const k = fk + ch;
  if (GEO.has(k)) return GEO.get(k);
  const font = FONT[fk];
  const g = font.charToGlyph(ch);
  const adv = g.advanceWidth / font.unitsPerEm;
  const path = g.getPath(0, 0, 1);
  const contours = []; let cur = null;
  for (const c of path.commands) {
    if (c.type === 'M') { cur = new THREE.Path(); cur.moveTo(c.x, -c.y); contours.push(cur); }
    else if (c.type === 'L') cur.lineTo(c.x, -c.y);
    else if (c.type === 'Q') cur.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
    else if (c.type === 'C') cur.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
  }
  let geo = null;
  const items = contours.map(p => { const pts = p.getPoints(5); return { pts, area: THREE.ShapeUtils.area(pts) }; }).filter(it => it.pts.length > 2 && Math.abs(it.area) > 1e-7);
  if (items.length) {
    const big = items.reduce((m, it) => (Math.abs(it.area) > Math.abs(m.area) ? it : m), items[0]);
    const sg = Math.sign(big.area);
    const outers = items.filter(it => Math.sign(it.area) === sg).map(it => ({ s: new THREE.Shape(it.pts), pts: it.pts }));
    for (const it of items.filter(it => Math.sign(it.area) !== sg)) {
      const o = outers.find(o => pointInPoly(it.pts[0], o.pts)) || outers[0];
      o.s.holes.push(new THREE.Path(it.pts));
    }
    const thin = fk === 'serif';
    geo = new THREE.ExtrudeGeometry(outers.map(o => o.s), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: thin ? 0.008 : 0.014, bevelSegments: 3, curveSegments: 5 });
    geo.translate(0, 0, -0.11);
  }
  const r = { geo, adv };
  GEO.set(k, r);
  return r;
}
// a word = group of letter meshes (units: em, scaled to px size)
function makeWord(txt, fk, mat) {
  const grp = new THREE.Group();
  const font = FONT[fk];
  let x = 0; const letters = [];
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    const g = glyph(fk, ch);
    if (g.geo) {
      const pivot = new THREE.Group();
      const m = new THREE.Mesh(g.geo, mat); m.castShadow = true;
      m.position.x = -g.adv / 2;
      pivot.add(m); pivot.position.x = x + g.adv / 2; grp.add(pivot);
      letters.push({ pivot, x: x + g.adv / 2, w: g.adv });
    }
    x += g.adv;
    if (i < txt.length - 1) x += font.getKerningValue(font.charToGlyph(ch), font.charToGlyph(txt[i + 1])) / font.unitsPerEm;
  }
  return { grp, letters, width: x };
}
// a kinetic line: words keep their final layout, letters fly in on the word's timestamp
class Line3D {
  constructor(words, cx, cy, size, o = {}) {
    this.o = o; this.size = size;
    this.root = reg(new THREE.Group());
    this.root.position.set(X(cx), Y(cy), o.z || 0);
    const s = size / 100;
    const gap = 0.26;
    let x = 0;
    this.words = words.map(w => {
      const fk = w.k ? 'serif' : 'sans';
      const mat = MAT[w.m || (w.k ? 'or' : (o.mat || 'ink'))];
      const wd = makeWord(w.txt, fk, mat);
      wd.grp.position.x = x; x += wd.width + gap;
      wd.sc = w.k ? 1.12 : 1;
      wd.grp.scale.setScalar(wd.sc);
      this.root.add(wd.grp);
      return Object.assign(wd, { t: w.t, k: w.k, anim: w.a || o.anim || 'flip' });
    });
    const tot = x - gap;
    for (const wd of this.words) wd.grp.position.x -= tot / 2;
    this.root.scale.setScalar(s);
    this.width = tot * s * 100;
  }
  update(t, out = Infinity) {
    const o = this.o;
    if (t < this.words[0].t - 0.1 || t > out + 0.6) return false;
    on(this.root);
    this.root.rotation.y = (o.ry ?? -0.16) + 0.03 * Math.sin(t * 0.8 + this.root.position.y);
    this.root.rotation.x = (o.rx ?? 0.1) + 0.02 * Math.sin(t * 0.6);
    for (const wd of this.words) {
      wd.letters.forEach((L, i) => {
        const ta = wd.t - 0.05 + i * 0.028;
        const p = L.pivot;
        if (t < ta) { p.visible = false; return; }
        p.visible = true;
        const a = t - ta;
        const sp = spring(t, ta, 2.6, 0.38);
        const ex = prog(t, out + i * 0.02, out + i * 0.02 + 0.32);
        p.position.y = 0; p.position.z = 0; p.rotation.set(0, 0, 0); p.scale.setScalar(1);
        if (wd.anim === 'flip') { p.rotation.x = (1 - sp) * -1.7; p.position.y = (1 - sp) * -0.4; p.scale.setScalar(clamp(a * 8)); }
        else if (wd.anim === 'drop') { p.position.y = (1 - sp) * 2.2; p.rotation.z = (1 - sp) * 0.5; p.scale.y = 1 + 0.25 * (sp - 1) * -1 * Math.exp(-a * 6); }
        else if (wd.anim === 'pop') { p.scale.setScalar(Math.max(0.001, sp)); p.rotation.z = (1 - sp) * 0.6; p.position.z = (1 - sp) * 1.5; }
        else if (wd.anim === 'spin') { p.rotation.y = (1 - sp) * Math.PI * 1.2; p.scale.setScalar(clamp(a * 6)); }
        if (wd.droop) { const d = E.inOutSine(prog(t, wd.droop + i * 0.05, wd.droop + 0.7 + i * 0.05)); p.rotation.z += -d * (0.25 + 0.15 * Math.sin(i * 2.1)); p.position.y -= d * 0.18 * (i % 3); }
        if (ex > 0) { const e = E.inBack(ex); p.position.y += e * (o.exitDown ? -3 : 3); p.rotation.x += e * 1.4; p.scale.multiplyScalar(1 - ex); }
        if (p.scale.x < 0.002) p.visible = false;
      });
    }
    return true;
  }
}
const Wd = (txt, t, k = '', m, a) => ({ txt, t, k, m, a });

// ---------------------------------------------------------------- 3D characters
const SPHERE = new THREE.SphereGeometry(1, 64, 48);
function makeEyes(r = 1) {
  const g = new THREE.Group();
  const scl = phys('#ffffff', 0.15, { clearcoat: 1 }), pup = phys('#111216', 0.2, { clearcoat: 1 }), gl = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [];
  for (const [ex, ey] of [[-0.3, 0.18], [0.12, 0.24]]) {
    const e = new THREE.Group();
    const dir = new THREE.Vector3(ex, ey, 0.95).normalize();
    e.position.copy(dir.clone().multiplyScalar(0.93));
    e.lookAt(dir.clone().multiplyScalar(3));
    const lid = new THREE.Group(); e.add(lid);
    const s = new THREE.Mesh(SPHERE, scl); s.scale.set(0.19, 0.23, 0.12); lid.add(s);
    const p = new THREE.Mesh(SPHERE, pup); p.scale.set(0.095, 0.105, 0.06); p.position.z = 0.085; lid.add(p);
    const gg = new THREE.Mesh(SPHERE, gl); gg.scale.setScalar(0.03); gg.position.set(-0.035, 0.04, 0.14); lid.add(gg);
    g.add(e); eyes.push({ e, lid, p, gg });
  }
  g.userData.eyes = eyes;
  return g;
}
function setEyes(g, open = 1, look = [0, 0], blink = 0, wink = 0, sad = 0) {
  g.userData.eyes.forEach((E2, i) => {
    const sy = Math.max(0.05, open * (1 - blink) * (1 - (i === 1 ? wink : 0)));
    E2.lid.scale.set(open, sy, open);
    E2.p.position.x = look[0] * 0.07; E2.p.position.y = look[1] * 0.07;
    E2.gg.position.x = -0.035 + look[0] * 0.07; E2.gg.position.y = 0.04 + look[1] * 0.07;
    E2.lid.rotation.z = sad ? (i ? -0.25 : 0.25) * sad : 0;
  });
}
// hero ball (the idea) with optional bitten wedge (orange-slice cut faces)
function fleshTexture() {
  const c = mk(512, 512), g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#FFE2C6'); gr.addColorStop(0.85, '#FFB27A'); gr.addColorStop(1, '#FF7A3A');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 6;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(256, 256, 18, 0, TAU); g.fill();
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
class Ball {
  constructor(mat) {
    this.root = reg(new THREE.Group());
    this.body = new THREE.Group(); this.root.add(this.body);
    this.mat = mat || phys(P.or, 0.26, { clearcoat: 1, clearcoatRoughness: 0.12 });
    this.sph = new THREE.Mesh(SPHERE, this.mat); this.sph.castShadow = true; this.body.add(this.sph);
    const fm = std('#ffffff', 0.6, { map: fleshTexture(), side: THREE.DoubleSide });
    this.capA = new THREE.Mesh(new THREE.CircleGeometry(1, 48, -Math.PI / 2, Math.PI), fm); this.capB = this.capA.clone();
    this.capA.castShadow = this.capB.castShadow = true;
    this.body.add(this.capA, this.capB);
    this.eyes = makeEyes(); this.body.add(this.eyes);
    this.wedge = [0, TAU];
  }
  setWedge(a0, len) {
    if (Math.abs(this.wedge[0] - a0) < 1e-4 && Math.abs(this.wedge[1] - len) < 1e-4) return;
    this.wedge = [a0, len];
    if (this.sph.geometry !== SPHERE) this.sph.geometry.dispose();
    this.sph.geometry = len >= TAU - 1e-3 ? SPHERE : new THREE.SphereGeometry(1, 64, 48, a0, len);
    const cut = len < TAU - 1e-3;
    this.capA.visible = this.capB.visible = cut;
    if (cut) { this.capA.rotation.set(0, Math.PI + a0, 0); this.capB.rotation.set(0, Math.PI + a0 + len, 0); }
  }
  pose({ x = CX, y = CY, z = 0, r = 100, sx = 1, sy = 1, ry = 0, rz = 0, eyes = 0, look = [0, 0], blink = 0, wink = 0, sad = 0, eyesRy = 0 }) {
    on(this.root);
    this.root.position.set(X(x), Y(y), z);
    this.root.scale.set(r / 100 * sx, r / 100 * sy, r / 100 * sx);
    this.body.rotation.set(0, ry, rz);
    this.eyes.visible = eyes > 0.01; this.eyes.rotation.y = eyesRy;
    setEyes(this.eyes, eyes, look, blink, wink, sad);
  }
}
// jelly monster
class Blob {
  constructor(color, o = {}) {
    this.o = o;
    this.root = reg(new THREE.Group());
    this.geo = new THREE.SphereGeometry(1, 72, 54);
    this.base = this.geo.attributes.position.array.slice();
    this.mesh = new THREE.Mesh(this.geo, phys(color, 0.3, { clearcoat: 1 })); this.mesh.castShadow = true; this.root.add(this.mesh);
    this.eyes = makeEyes(); this.root.add(this.eyes);
    const brow = new THREE.BoxGeometry(0.34, 0.07, 0.08), bm = phys('#111216', 0.4);
    this.brows = [new THREE.Mesh(brow, bm), new THREE.Mesh(brow, bm)];
    this.brows[0].position.set(-0.3, 0.56, 0.86); this.brows[0].rotation.z = -0.4;
    this.brows[1].position.set(0.12, 0.62, 0.84); this.brows[1].rotation.z = 0.4;
    this.root.add(...this.brows);
    this.mouth = new THREE.Mesh(SPHERE, phys('#2A0A12', 0.5)); this.mouth.position.set(-0.05, -0.22, 0.86); this.root.add(this.mouth);
    if (o.clock) {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 48), phys('#ffffff', 0.2));
      face.rotation.x = Math.PI / 2; face.position.set(0.0, -0.05, 1.0); this.root.add(face);
      this.hands = [0.2, 0.28].map(l => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.035, l, 0.03), phys('#111216')); h.geometry.translate(0, l / 2, 0); h.position.set(0, -0.05, 1.05); this.root.add(h); return h; });
      this.mouth.position.set(-0.05, -0.55, 0.78);
    }
    if (o.pen) {
      const pen = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 24), phys(P.pink, 0.3)); pen.add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 24), phys('#111216', 0.3)); tip.position.y = -0.55; tip.rotation.x = Math.PI; pen.add(tip);
      pen.position.set(0.75, 0.9, 0.2); pen.rotation.z = -0.6; this.root.add(pen);
    }
  }
  pose(t, { x, y, z = 0, r = 100, sx = 1, sy = 1, mouth = 0, look = [-1, 0], ry = 0 }) {
    on(this.root);
    const pa = this.geo.attributes.position, b = this.base, arr = pa.array;
    for (let i = 0; i < arr.length; i += 3) {
      let px = b[i], py = b[i + 1], pz = b[i + 2];
      const d = 1 + 0.05 * Math.sin(3 * px + t * 4.2) + 0.045 * Math.sin(4 * py - t * 3.1) + 0.035 * Math.sin(5 * pz + t * 5.3);
      px *= d; py *= d; pz *= d;
      if (this.o.drop) { const u = Math.max(0, py); py *= 1 + 0.7 * u * u * u; const k = 1 - 0.55 * u * u; px *= k; pz *= k; }
      arr[i] = px; arr[i + 1] = py; arr[i + 2] = pz;
    }
    pa.needsUpdate = true; this.geo.computeVertexNormals();
    this.root.position.set(X(x), Y(y), z);
    this.root.scale.set(r / 100 * sx, r / 100 * sy, r / 100 * sx);
    this.root.rotation.y = ry;
    setEyes(this.eyes, 1, look, 0);
    this.mouth.scale.set(0.28 + 0.1 * mouth, 0.05 + 0.32 * mouth, 0.2);
    if (this.hands) { this.hands[0].rotation.z = -t * 1.2; this.hands[1].rotation.z = -t * 9; }
  }
}

// ---------------------------------------------------------------- 2D helpers
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function lightBG(c, warm = 0) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FBF9F6'); g.addColorStop(1, P.bg2);
  c.fillStyle = g; c.fillRect(-80, -80, W + 160, H + 160);
  const r2 = c.createRadialGradient(CX, CY - 120, 60, CX, CY, 1150);
  r2.addColorStop(0, 'rgba(255,255,255,0.95)'); r2.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = r2; c.fillRect(0, 0, W, H);
  if (warm > 0) { const w2 = c.createRadialGradient(CX, 600, 50, CX, 600, 900); w2.addColorStop(0, col(P.or, 0.18 * warm)); w2.addColorStop(1, col(P.or, 0)); c.fillStyle = w2; c.fillRect(0, 0, W, H); }
}
function nightBG(c, t) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, P.n1); g.addColorStop(0.6, P.n2); g.addColorStop(1, P.n3);
  c.fillStyle = g; c.fillRect(-80, -80, W + 160, H + 160);
  const r2 = c.createRadialGradient(CX, 420, 50, CX, 420, 950);
  r2.addColorStop(0, 'rgba(130,95,255,0.35)'); r2.addColorStop(1, 'rgba(130,95,255,0)');
  c.fillStyle = r2; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * Math.abs(Math.sin(t * 1.4 + i))})`; const s = 1 + hash(i * 3) * 2.5; c.fillRect(hash(i) * W, hash(i * 7) * H, s, s); }
}
function orangeBG(c) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FF7A3A'); g.addColorStop(1, '#FF4A12');
  c.fillStyle = g; c.fillRect(-80, -80, W + 160, H + 160);
  const r2 = c.createRadialGradient(CX, 330, 80, CX, 420, 1050);
  r2.addColorStop(0, 'rgba(255,225,190,0.5)'); r2.addColorStop(1, 'rgba(255,225,190,0)');
  c.fillStyle = r2; c.fillRect(0, 0, W, H);
}
function handNote(c, t, t0, txt, x, y, rot = -0.08) {
  if (t < t0) return;
  const p = prog(t, t0, t0 + 0.4);
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.rect(-10, -70, 320 * p, 100); c.clip();
  c.fillStyle = col(P.gray, 1); c.font = HAND(58); c.fillText(txt, 0, 0); c.restore();
}
function cursor(c, x, y, down) {
  c.save(); c.translate(x, y); c.scale(down ? 0.88 : 1.1, down ? 0.88 : 1.1);
  c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 12; c.shadowOffsetY = 6;
  c.fillStyle = '#fff'; c.strokeStyle = P.ink; c.lineWidth = 3; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 44); c.lineTo(11, 34); c.lineTo(19, 52); c.lineTo(27, 48); c.lineTo(19, 31); c.lineTo(33, 31); c.closePath(); c.fill(); c.shadowBlur = 0; c.stroke();
  c.restore();
}
function canvasTex(w, h) { const c = mk(w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return { c, g: c.getContext('2d'), tx }; }

// ---------------------------------------------------------------- floating 3D orbs (instanced)
let ORBS;
function initOrbs() {
  const n = 26, r = rng(9);
  ORBS = { mesh: reg(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 24), phys('#FFB48A', 0.35, { clearcoat: 0.8 }), n)), d: [] };
  for (let i = 0; i < n; i++) ORBS.d.push({ x: (r() - 0.5) * 26, y: (r() - 0.5) * 13, z: -6 + r() * 7, s: 0.12 + r() * 0.32, p: r() * TAU });
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
function orbs(t, color, k = 1, drift = 0.25) {
  const m = on(ORBS.mesh);
  m.material.color.set(color);
  ORBS.d.forEach((o, i) => {
    const x = ((o.x + 13 - t * drift * (1 + o.z * 0.1)) % 26 + 26) % 26 - 13;
    V3.set(x, o.y + Math.sin(t * 0.5 + o.p) * 0.3, o.z); S3.setScalar(o.s * k);
    M4.compose(V3, Q, S3); m.setMatrixAt(i, M4);
  });
  m.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- scene objects (built in init)
const L = {};   // kinetic lines
let HERO, CREAM, M1, M2, VORTEX, QMARKS, NOTES, CLOCK, TABS, TABTXT, CONF, SHAPES, TRAIL, POSTS, BANDS, EQ, FRAMES, BEZ, TL, EDITOR, AE, STRIKE, PILL, DOTS, MINI, NUMS, PCT;

function initScenes() {
  // ---- captions / kinetic lines (all 3D)
  L.hook1 = new Line3D([Wd('Знаешь,', v(0.08)), Wd('где', v(0.48)), Wd('умирают', v(0.64))], CX, 440, 132);
  L.hook1.words[2].droop = v(1.2);
  L.hook2 = new Line3D([Wd('лучшие', v(1.12)), Wd('идеи?', v(1.6), 'i', 'or', 'pop')], CX, 640, 160);
  L.notes = new Line3D([Wd('В', v(2.88)), Wd('заметках.', v(3.08), 'i')], CX, 170, 84, { z: 0.2 });
  L.dot1 = new Line3D([Wd('А', v(8.227)), Wd('ведь', v(8.28)), Wd('всё', v(8.4)), Wd('начиналось', v(8.64)), Wd('с', v(9.08)), Wd('точки.', v(9.2), 'i')], CX, 170, 72, { z: 0.2 });
  L.small = new Line3D([Wd('маленькой…', v(10.16), 'i')], CX, 930, 96, { z: 0.2 });
  L.warm = new Line3D([Wd('тёплой…', v(11.28), 'i')], CX, 930, 96, { z: 0.2 });
  L.alive = new Line3D([Wd('живой!', v(12.08), 'i', 'or', 'pop')], CX, 930, 120, { z: 0.2 });
  L.b1 = new Line3D([Wd('А', v(12.709)), Wd('потом', v(12.8)), Wd('пришёл', v(13.04)), Wd('дедлайн', v(13.36), 'i', 'purple')], CX, 170, 76, { z: 0.2 });
  L.b2 = new Line3D([Wd('Правки', v(15.634), 'i', 'blue'), Wd('—', v(16.08)), Wd('ещё', v(16.16)), Wd('кусок.', v(16.48))], CX, 170, 76, { z: 0.2 });
  L.b3 = new Line3D([Wd('А', v(17.12)), Wd('сомнения…', v(17.28), 'i', 'pink')], CX, 170, 84, { z: 0.2 });
  L.b4 = new Line3D([Wd('доели', v(19.6)), Wd('остальное.', v(20.04), 'i', 'pink')], CX, 170, 84, { z: 0.2 });
  L.n1 = new Line3D([Wd('Полночь.', v(20.88), 'i', 'yellow')], CX, 170, 96, { z: 0.2 });
  L.n2 = new Line3D([Wd('14', v(21.84), '', 'or', 'pop'), Wd('вкладок…', v(22.4), '', 'white')], CX, 600, 190, { z: 0.5 });
  L.n3 = new Line3D([Wd('и', v(24.133), '', 'white'), Wd('ноль', v(24.24), '', 'white'), Wd('движения.', v(24.4), 'i', 'or')], CX, 200, 92, { z: 0.2 });
  L.stop = new Line3D([Wd('Стоп.', v(25.52), '', 'white', 'pop')], CX, 560, 230, { z: 2 });
  L.now = new Line3D([Wd('А', v(26.08), '', 'white'), Wd('теперь —', v(26.16), '', 'white')], CX, 300, 90, { z: 0.2 });
  L.look = new Line3D([Wd('смотри!', v(26.72), 'i', 'cream', 'pop')], CX, 560, 250, { z: 2 });
  L.i1 = new Line3D([Wd('Даём', v(27.347), '', 'cream'), Wd('точке', v(27.6), '', 'cream'), Wd('импульс', v(28.0), 'i', 'inkG')], CX, 170, 80, { z: 0.2 });
  L.i2 = new Line3D([Wd('и', v(28.453), '', 'cream'), Wd('она', v(28.56), '', 'cream'), Wd('становится', v(28.76), '', 'cream'), Wd('линией!', v(29.2), 'i', 'inkG')], CX, 170, 80, { z: 0.2 });
  L.i3 = new Line3D([Wd('Линия —', v(29.76), '', 'cream'), Wd('формой!', v(30.32), 'i', 'inkG')], CX, 170, 88, { z: 0.2 });
  L.i4 = new Line3D([Wd('Форма —', v(30.88), '', 'cream'), Wd('ритмом!', v(31.36), 'i', 'inkG', 'drop')], CX, 170, 88, { z: 0.2 });
  L.c1 = new Line3D([Wd('Каждый', v(32.0)), Wd('кадр.', v(32.4), 'i')], CX, 170, 92, { z: 0.2 });
  L.c2 = new Line3D([Wd('Каждый', v(32.8)), Wd('изгиб.', v(33.12), 'i', 'or', 'spin')], CX, 170, 92, { z: 0.2 });
  L.c3 = new Line3D([Wd('Каждая', v(33.68)), Wd('секунда', v(34.08), 'i')], CX, 170, 92, { z: 0.2 });
  L.c4 = new Line3D([Wd('работает', v(34.48)), Wd('на', v(34.96)), Wd('идею.', v(35.24), 'i')], CX, 170, 92, { z: 0.2 });
  L.k1 = new Line3D([Wd('И', v(35.813), '', 'white'), Wd('да…', v(35.92), '', 'white'), Wd('всё', v(36.48), '', 'white'), Wd('это', v(36.68), '', 'white'), Wd('сделано', v(36.88), '', 'white'), Wd('кодом.', v(37.28), 'i')], CX, 170, 70, { z: 0.2 });
  L.k2 = new Line3D([Wd('Без', v(38.32), '', 'white'), Wd('After Effects.', v(38.48), 'i')], CX, 170, 84, { z: 0.2 });
  L.t1 = new Line3D([Wd('Это', v(39.6)), Wd('—', v(39.97))], CX, 400, 160, { anim: 'drop' });
  L.t2 = new Line3D([Wd('моушн-дизайн.', v(40.24), 'i', 'or', 'flip')], CX, 650, 176);
  L.f1 = new Line3D([Wd('От', v(41.6)), Wd('идеи', v(41.76))], CX - 60, 470, 170, { ry: -0.1 });
  L.f2 = new Line3D([Wd('к', v(42.64)), Wd('движению', v(42.8), 'i', 'or', 'flip')], CX - 70, 700, 176, { ry: -0.1 });
  L.q = new Line3D([Wd('Нужен', v(43.68)), Wd('такой', v(43.92)), Wd('же?', v(44.24), 'i')], CX, 720, 72, { z: 0.2 });
  L.pill = new Line3D([Wd('Пиши', v(44.72), '', 'white', 'pop'), Wd('—', v(44.9), '', 'white'), Wd('сделаем', v(45.6), 'i', 'or', 'pop')], CX, 905, 64, { z: 1.7, rx: 0.02, ry: -0.03 });
  NUMS = { m50: new Line3D([Wd('−50%', BITE1, '', 'purple', 'pop')], CX + 420, 380, 110, { z: 1.5 }), m20: new Line3D([Wd('−20%', BITE2, '', 'blue', 'pop')], CX - 470, 420, 110, { z: 1.5 }), zero: new Line3D([Wd('0%', SUCK + 0.55, '', 'ink', 'drop')], CX - 260, 640, 230, { z: 0.5 }) };
  PCT = ['100%', '50%', '30%'].map((s, i) => new Line3D([Wd(s, [v(12.7), BITE1 + 0.05, BITE2 + 0.05][i], '', 'ink', 'pop')], CX, 600, 70, { z: 0.6, rx: 0.05, ry: -0.1 }));

  // ---- characters
  HERO = new Ball();
  CREAM = new Ball(phys('#FFF6EC', 0.25, { clearcoat: 1 }));
  M1 = new Blob(P.purple, { clock: 1 });
  M2 = new Blob(P.blue, { drop: 1, pen: 1 });
  // vortex: conical spiral tubes
  VORTEX = reg(new THREE.Group());
  for (let a = 0; a < 3; a++) {
    const pts = [];
    for (let i = 0; i <= 160; i++) { const u = i / 160, rr2 = 1.6 * (1 - u) + 0.05, th = u * 5 * TAU + a * TAU / 3; pts.push(new THREE.Vector3(Math.cos(th) * rr2, Math.sin(th) * rr2, -u * 1.5)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.07 * (1 - a * 0.15), 12), phys(a ? '#FF7FAE' : P.pink, 0.25, { clearcoat: 1 }));
    m.castShadow = true; VORTEX.add(m);
  }
  const core = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: '#ffffff' })); core.scale.setScalar(0.18); core.position.z = -1.4; VORTEX.add(core);
  QMARKS = [];
  for (let i = 0; i < 5; i++) { const w = makeWord('?', 'serif', MAT.pink); const g = reg(new THREE.Group()); g.add(w.grp); w.grp.position.x = -w.width / 2; QMARKS.push(g); }

  // ---- notes window (3D card with a live canvas texture)
  NOTES = { root: reg(new THREE.Group()), tex: canvasTex(1040, 660) };
  const body = new THREE.Mesh(new RoundedBoxGeometry(10.4, 6.6, 0.3, 6, 0.4), phys('#ffffff', 0.4, { clearcoat: 0.3 })); body.castShadow = true; NOTES.root.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 6.4), new THREE.MeshBasicMaterial({ map: NOTES.tex.tx, toneMapped: false })); face.position.z = 0.16; NOTES.root.add(face);
  NOTES.dot = new THREE.Mesh(SPHERE, phys(P.or, 0.25, { clearcoat: 1 })); NOTES.dot.castShadow = true; NOTES.root.add(NOTES.dot);

  // ---- clock
  CLOCK = reg(new THREE.Group());
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 96), phys('#F7F5FF', 0.2, { clearcoat: 1 })); disc.rotation.x = Math.PI / 2; disc.castShadow = true; CLOCK.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.07, 24, 96), phys(P.or, 0.25, { clearcoat: 1 })); CLOCK.add(ring);
  for (let i = 0; i < 12; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, i % 3 ? 0.1 : 0.18, 0.03), phys('#16171C')); const a = i / 12 * TAU; tk.position.set(Math.sin(a) * 0.82, Math.cos(a) * 0.82, 0.13); tk.rotation.z = -a; CLOCK.add(tk); }
  CLOCK.hands = [[0.48, 0.06], [0.72, 0.035]].map(([l, w]) => { const h = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.03), phys('#16171C')); h.geometry.translate(0, l / 2 - 0.05, 0); h.position.z = 0.15; CLOCK.add(h); return h; });
  const pin = new THREE.Mesh(SPHERE, phys(P.or)); pin.scale.setScalar(0.06); pin.position.z = 0.17; CLOCK.add(pin);

  // ---- tabs
  const NAMES = ['референсы_final', 'Pinterest — идеи', 'правки_v7_ФИНАЛ', 'дедлайн.pdf', 'как не выгореть', 'туториал 4 ч', 'шрифты бесплатно', 'ТЗ (новое!!)', 'почта (12)', 'бриф.docx', 'палитры 2026', 'мемы для мотивации', 'вдохновение', 'кофе рядом'];
  const TC = [P.pink, '#E60023', P.blue, P.or, P.green, '#FF0000', P.purple, P.yellow, P.sky, P.blue, P.pink, P.green, P.purple, '#8B5A2B'];
  const tabGeo = new RoundedBoxGeometry(3.6, 0.72, 0.14, 4, 0.14);
  TABS = NAMES.map((nm, i) => {
    const tx = canvasTex(720, 144), g = tx.g;
    g.fillStyle = '#1F2350'; g.fillRect(0, 0, 720, 144);
    g.fillStyle = TC[i]; rr(g, 34, 44, 56, 56, 14); g.fill();
    g.fillStyle = '#fff'; g.font = UI(600, 46); g.fillText(nm, 116, 88);
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillText('×', 660, 88);
    tx.tx.needsUpdate = true;
    const m = reg(new THREE.Mesh(tabGeo, [std('#1F2350'), std('#1F2350'), std('#1F2350'), std('#1F2350'), new THREE.MeshBasicMaterial({ map: tx.tx, toneMapped: false }), std('#1F2350')]));
    m.castShadow = true;
    return m;
  });

  // ---- impulse: slingshot, trail, forms, equaliser
  POSTS = [0, 1].map(() => { const g = reg(new THREE.Group()); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 24), phys('#16171C', 0.35)); p.castShadow = true; g.add(p); const knob = new THREE.Mesh(SPHERE, phys('#16171C')); knob.scale.setScalar(0.14); knob.position.y = 1.1; g.add(knob); return g; });
  BANDS = [0, 1].map(() => reg(new THREE.Mesh(new THREE.BufferGeometry(), phys('#16171C', 0.5))));
  TRAIL = reg(new THREE.Mesh(new THREE.BufferGeometry(), phys('#FFF6EC', 0.25, { clearcoat: 1 }))); TRAIL.castShadow = true;
  SHAPES = [
    reg(new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.1, 3, 1), phys('#FFF6EC', 0.25, { clearcoat: 1, flatShading: true }))),
    reg(new THREE.Mesh(new RoundedBoxGeometry(2.1, 2.1, 2.1, 6, 0.3), phys('#16171C', 0.3, { clearcoat: 1 }))),
  ];
  SHAPES.forEach(s => (s.castShadow = true));
  EQ = reg(new THREE.InstancedMesh(new RoundedBoxGeometry(0.24, 1, 0.24, 3, 0.08), phys('#FFF6EC', 0.3), 32)); EQ.castShadow = true;

  // ---- craft: frames, bezier, timeline
  MINI = canvasTex(660, 380);
  FRAMES = [];
  for (let k = 0; k < 15; k++) {
    const tx = canvasTex(660, 380); miniScene(tx.g, k, 660, 380); tx.tx.needsUpdate = true;
    const m = reg(new THREE.Mesh(new RoundedBoxGeometry(3.3, 1.9, 0.08, 3, 0.12), [std('#fff'), std('#fff'), std('#fff'), std('#fff'), new THREE.MeshBasicMaterial({ map: tx.tx, toneMapped: false }), std('#fff')]));
    m.castShadow = true; FRAMES.push(m);
  }
  BEZ = { tube: reg(new THREE.Mesh(new THREE.BufferGeometry(), phys(P.or, 0.25, { clearcoat: 1 }))), hl: [0, 1].map(() => reg(new THREE.Mesh(new THREE.BufferGeometry(), std('#9AA0AA', 0.6)))), hc: [0, 1].map(() => reg(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.34, 0.34, 3, 0.06), phys('#ffffff', 0.3)))), an: [0, 1].map(() => reg(new THREE.Mesh(SPHERE, phys('#16171C', 0.3)))) };
  BEZ.tube.castShadow = true;
  TL = { root: reg(new THREE.Group()), tex: canvasTex(1360, 300) };
  const panel = new THREE.Mesh(new RoundedBoxGeometry(13.6, 3.0, 0.3, 5, 0.35), phys('#ffffff', 0.35)); panel.castShadow = true; TL.root.add(panel);
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 2.7), new THREE.MeshBasicMaterial({ map: TL.tex.tx, toneMapped: false })); pf.position.z = 0.16; TL.root.add(pf);
  TL.kf = [];
  for (let i = 0; i < 12; i++) { const k = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), phys([P.or, P.blue, P.pink][Math.floor(i / 4)], 0.25, { clearcoat: 1 })); k.castShadow = true; TL.root.add(k); TL.kf.push(k); }
  TL.head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.0, 0.1), phys(P.or)); TL.head.position.z = 0.25; TL.root.add(TL.head);

  // ---- code editor + Ae
  EDITOR = { root: reg(new THREE.Group()), tex: canvasTex(1560, 640) };
  const ed = new THREE.Mesh(new RoundedBoxGeometry(15.6, 6.4, 0.25, 5, 0.3), phys('#161B22', 0.4)); ed.castShadow = true; EDITOR.root.add(ed);
  const ef = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 6.2), new THREE.MeshBasicMaterial({ map: EDITOR.tex.tx, toneMapped: false })); ef.position.z = 0.13; EDITOR.root.add(ef);
  const aet = canvasTex(256, 256); aet.g.fillStyle = '#00005B'; aet.g.fillRect(0, 0, 256, 256); aet.g.strokeStyle = '#9999FF'; aet.g.lineWidth = 10; rr(aet.g, 14, 14, 228, 228, 40); aet.g.stroke(); aet.g.fillStyle = '#9999FF'; aet.g.font = SANS2(700, 130); aet.g.textAlign = 'center'; aet.g.fillText('Ae', 128, 172); aet.tx.needsUpdate = true;
  AE = reg(new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.4, 0.4, 5, 0.45), [std('#00005B'), std('#00005B'), std('#00005B'), std('#00005B'), new THREE.MeshBasicMaterial({ map: aet.tx, toneMapped: false }), std('#00005B')])); AE.castShadow = true;
  STRIKE = { ring: reg(new THREE.Mesh(new THREE.BufferGeometry(), phys(P.or, 0.25, { clearcoat: 1 }))), bar: reg(new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.26, 0.26, 3, 0.1), phys(P.or, 0.25, { clearcoat: 1 }))) };

  // ---- final: dots, pill, confetti
  DOTS = [0, 1, 2].map(() => { const m = reg(new THREE.Mesh(SPHERE, phys(P.or, 0.25, { clearcoat: 1 }))); m.castShadow = true; return m; });
  PILL = reg(new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 6.0, 12, 48), phys('#16171C', 0.3, { clearcoat: 1 }))); PILL.castShadow = true; PILL.rotation.z = Math.PI / 2;
  const n = 90;
  CONF = { mesh: reg(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), phys('#ffffff', 0.25, { clearcoat: 1 }), n)), d: [] };
  const r = rng(31), cc = [P.or, P.pink, P.yellow, P.blue, P.purple, P.green];
  for (let i = 0; i < n; i++) { CONF.d.push({ th: (r() - 0.5) * 2.4, sp: 6 + r() * 12, s: 0.07 + r() * 0.14, z: (r() - 0.5) * 4, dx: (r() - 0.5) * 3 }); CONF.mesh.setColorAt(i, new THREE.Color(cc[i % cc.length])); }
  CONF.mesh.instanceColor.needsUpdate = true;
}

function miniScene(c, k, w, h) {
  const kinds = [
    () => { c.fillStyle = '#FFF'; c.fillRect(0, 0, w, h); ball2d(c, w / 2, h / 2, 90); },
    () => { c.fillStyle = P.or; c.fillRect(0, 0, w, h); c.strokeStyle = P.cream; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(60, h - 80); c.bezierCurveTo(200, 20, 360, h, w - 60, 80); c.stroke(); },
    () => { c.fillStyle = P.n2; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, 110, 0, TAU); c.fill(); c.strokeStyle = P.ink; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2, h / 2 - 80); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + 50, h / 2); c.stroke(); },
    () => { c.fillStyle = P.bg2; c.fillRect(0, 0, w, h); c.font = SERIF2(150); c.fillStyle = P.or; c.textAlign = 'center'; c.fillText('идея', w / 2, h / 2 + 50); c.textAlign = 'left'; },
    () => { c.fillStyle = '#161B22'; c.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { c.fillStyle = [P.pink, P.green, P.sky, P.or, P.purple, P.yellow, '#9AA4B2'][i]; rr(c, 50, 40 + i * 44, 80 + hash(i + k) * 400, 20, 10); c.fill(); } },
    () => { c.fillStyle = '#FFF'; c.fillRect(0, 0, w, h); c.fillStyle = P.purple; c.beginPath(); c.arc(w / 2, h / 2 + 10, 110, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2 - 40, h / 2 - 20, 26, 0, TAU); c.arc(w / 2 + 30, h / 2 - 26, 26, 0, TAU); c.fill(); },
  ];
  kinds[k % kinds.length]();
}
function ball2d(c, x, y, r) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, P.orL); g.addColorStop(0.6, P.or); g.addColorStop(1, P.orD);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.15, r * 0.2, r * 0.25, 0, 0, TAU); c.ellipse(x + r * 0.15, y - r * 0.2, r * 0.2, r * 0.25, 0, 0, TAU); c.fill();
  c.fillStyle = P.ink; c.beginPath(); c.arc(x - r * 0.28, y - r * 0.12, r * 0.1, 0, TAU); c.arc(x + r * 0.17, y - r * 0.17, r * 0.1, 0, TAU); c.fill();
}
function tubeGeo(pts, seg = 200, rad = 0.14) {
  if (pts.length < 2) return new THREE.BufferGeometry();
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, rad, 14, false);
}
function setGeo(mesh, geo) { if (mesh.geometry) mesh.geometry.dispose(); mesh.geometry = geo; }

// ---------------------------------------------------------------- scenes
function sceneHook(t) {
  lightBG(ctx);
  orbs(t, '#FFB48A');
  L.hook1.update(t, S.hook[1] - 0.25);
  L.hook2.update(t, S.hook[1] - 0.25);
  // a sad little idea slides down at the edge
  if (t > v(1.1)) {
    const p = prog(t, v(1.1), v(2.4));
    HERO.setWedge(0, TAU);
    HERO.pose({ x: 1660, y: lerp(260, 820, E.inOutCubic(p)), r: 46, eyes: 1, look: [-0.5, 0.6], sad: 1, rz: 0.3 * Math.sin(t * 3), sy: 1 - 0.1 * Math.abs(Math.sin(t * 6)) });
  }
}
function drawNotesTex(t, y0) {
  const { g, tx } = NOTES.tex;
  g.clearRect(0, 0, 1040, 660);
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 1040, 660);
  g.fillStyle = '#FFF2CC'; g.fillRect(0, 0, 1040, 104);
  for (let i = 0; i < 3; i++) { g.fillStyle = ['#FF5F57', '#FEBC2E', '#28C840'][i]; g.beginPath(); g.arc(50 + i * 36, 52, 12, 0, TAU); g.fill(); }
  g.fillStyle = P.ink; g.font = UI(600, 36); g.fillText('Заметки', 180, 64);
  g.fillStyle = P.gray; g.font = UI(500, 28); g.textAlign = 'right'; g.fillText('сегодня, 23:12', 1000, 63); g.textAlign = 'left';
  g.fillStyle = P.ink; g.font = SANS2(800, 70); g.fillText('Список дел', 90, 205);
  const rows = [{ txt: 'купить хлеб', t: v(5.68), y: 320 }, { txt: 'идея для ролика…', t: v(6.3), y: 430, idea: 1 }, { txt: 'позвонить маме', t: v(6.96), y: 540 }];
  for (const r of rows) {
    if (t < r.t) continue;
    if (r.idea) { g.fillStyle = col(P.gray, clamp((t - r.t) * 4)); g.font = SERIF2(48); g.fillText(r.txt, 170, r.y); continue; }
    g.strokeStyle = '#D9D4CC'; g.lineWidth = 5; g.beginPath(); g.arc(120, r.y - 16, 22, 0, TAU); g.stroke();
    const n = Math.floor(clamp((t - r.t) / 0.4) * r.txt.length);
    g.fillStyle = P.ink; g.font = UI(500, 54); g.fillText(r.txt.slice(0, n), 170, r.y);
    if (n < r.txt.length && Math.floor(t * 4) % 2 === 0) { const w = g.measureText(r.txt.slice(0, n)).width; g.fillStyle = P.or; g.fillRect(174 + w, r.y - 44, 5, 54); }
  }
  tx.needsUpdate = true;
}
function sceneNotes(t) {
  lightBG(ctx);
  orbs(t, '#FFB48A');
  const t0 = S.notes[0];
  const sp = spring(t, t0, 1.8, 0.45);
  drawNotesTex(t);
  const R = on(NOTES.root);
  R.position.set(0, lerp(-12, -0.9, sp), 0);
  R.rotation.set(lerp(-0.9, -0.12, sp) + 0.02 * Math.sin(t), -0.18 + 0.05 * Math.sin(t * 0.6), 0.02);
  // the idea dot lives on the card (row 2)
  const dotK = E.outBack(prog(t, v(6.3), v(6.6)));
  NOTES.dot.visible = dotK > 0;
  NOTES.dot.position.set(-5.2 + 1.2, 3.3 - 4.3 + 0.16, 0.36);
  NOTES.dot.scale.setScalar(0.24 * dotK * (1 + 0.1 * Math.sin((t - v(6.3)) * 7)));
  // camera dives into the dot
  const dive = E.inExpo(prog(t, v(7.6), S.notes[1]));
  const push = E.inOutSine(prog(t, v(7.0), v(7.8))) * 0.2;
  if (dive > 0 || push > 0) {
    const wp = new THREE.Vector3(); NOTES.dot.getWorldPosition(wp);
    cam.position.set(lerp(0, wp.x, dive + push), lerp(0, wp.y, dive + push), lerp(CAMZ, wp.z + 0.4, dive * 0.985 + push * 0.3));
    cam.lookAt(lerp(0, wp.x, Math.min(1, dive * 1.3 + push)), lerp(0, wp.y, Math.min(1, dive * 1.3 + push)), wp.z);
  }
  L.notes.update(t, v(7.2));
}
function sceneDot(t) {
  lightBG(ctx, prog(t, v(11.28), v(11.6)) * (1 - prog(t, v(12.0), v(12.4))));
  orbs(t, '#FFB48A');
  floor.visible = true; floor.position.y = Y(780);
  const t0 = S.dot[0];
  let r = lerp(1400, 150, E.outBack(prog(t, t0, t0 + 0.6)));
  const small = E.outBack(prog(t, v(10.16), v(10.5))) * (1 - E.outBack(prog(t, v(11.28), v(11.7))));
  r *= 1 - 0.6 * small;
  let y = 610, sx = 1, sy = 1;
  const hop = prog(t, v(12.08), v(12.08) + 0.55);
  if (hop > 0 && hop < 1) { y -= Math.sin(Math.PI * hop) * 160; sx = 0.92; sy = 1.1; }
  if (hop >= 1) { const a = t - v(12.63); const w = a > 0 ? Math.exp(-a * 8) * Math.cos(a * 30) : 0; sx = 1 + 0.15 * w; sy = 1 - 0.15 * w; }
  y += (1 - sy) * r;
  const eyesK = E.outBack(prog(t, v(12.08), v(12.08) + 0.3));
  HERO.setWedge(0, TAU);
  HERO.pose({ x: CX, y, r, sx, sy, eyes: eyesK, look: [0.2 * Math.sin(t * 2), 0.2], ry: 0.15 * Math.sin(t * 0.7), blink: t > v(12.9) && t < v(12.98) ? 1 : 0 });
  L.dot1.update(t, S.dot[1] - 0.2);
  L.small.update(t, v(11.15)); L.warm.update(t, v(12.0)); L.alive.update(t, S.dot[1] + 0.3);
  // warm sparkles (2D)
  const warm = prog(t, v(11.28), v(11.5)) * (1 - prog(t, v(12.0), v(12.4)));
  return () => {
    if (warm > 0) for (let i = 0; i < 30; i++) { const ph = frac((t - v(11.28)) * 0.7 + hash(i) * 2); const x = CX + (hash(i * 3) - 0.5) * 420, yy = 640 - ph * 360; ctx.fillStyle = col(i % 3 ? P.or : P.yellow, warm * Math.sin(Math.PI * ph)); ctx.beginPath(); ctx.arc(x, yy, 4 + 5 * hash(i * 7), 0, TAU); ctx.fill(); }
  };
}
function sceneBites(t) {
  lightBG(ctx);
  orbs(t, '#FFB48A');
  floor.visible = true; floor.position.y = Y(780);
  if (t < v(15.6)) L.b1.update(t, v(15.5));
  else if (t < v(17.1)) L.b2.update(t, v(17.0));
  else if (t < v(19.5)) L.b3.update(t, v(19.4));
  else L.b4.update(t, S.bites[1] - 0.3);
  // wedge: right half eaten, then another 20 %
  const e1 = E.outExpo(prog(t, BITE1, BITE1 + 0.1)), e2 = E.outExpo(prog(t, BITE2, BITE2 + 0.1));
  // kept arc in sphere phi (around Y): start at the left side
  const keep = TAU * (1 - 0.5 * e1 - 0.2 * e2);
  HERO.setWedge(-keep / 2, keep);
  const suck = prog(t, SUCK, SUCK + 0.8);
  const vx = CX + 420, vy = 560;
  const shake = (t > BITE1 && t < BITE1 + 0.3 ? 0.12 * Math.exp(-(t - BITE1) * 12) : 0) + (t > BITE2 && t < BITE2 + 0.3 ? 0.12 * Math.exp(-(t - BITE2) * 12) : 0);
  if (suck < 1) {
    const sp = E.inCubic(suck), ang = sp * 6;
    const bx = lerp(CX, vx, sp) + Math.cos(ang) * 120 * Math.sin(Math.PI * sp), by = lerp(610, vy, sp) + Math.sin(ang) * 80 * Math.sin(Math.PI * sp);
    HERO.pose({ x: bx + Math.sin(t * 80) * shake * 100, y: by, r: 150 * (1 - 0.92 * sp), eyes: 1, look: t < BITE2 - 0.3 ? [0.9, 0] : [-0.7, 0.5], sad: t > BITE1 ? 1 : 0, ry: -0.4 * Math.max(e1, prog(t, BITE1 - 0.6, BITE1)) + 0.05 * Math.sin(t), rz: ang * 0.5, eyesRy: -0.55 * prog(t, BITE1 - 0.6, BITE1) });
  }
  // percentage on the ball
  const pctIdx = t < BITE1 ? 0 : t < BITE2 ? 1 : 2;
  if (suck < 0.1) { const pl = PCT[pctIdx]; pl.root.position.set(X(CX - 40 * pctIdx), Y(395), 0.6); pl.update(t, pctIdx < 2 ? [BITE1, BITE2][pctIdx] - 0.05 : SUCK); }
  // monster 1: deadline
  const m1in = spring(t, v(13.04), 1.6, 0.45), m1out = E.inBack(prog(t, v(15.6), v(16.0)));
  if (t > v(13.0) && m1out < 1) {
    const lunge = Math.sin(Math.PI * prog(t, BITE1 - 0.2, BITE1 + 0.25));
    const hopy = Math.abs(Math.sin((t - v(13.04)) * 7)) * 50 * (1 - prog(t, v(13.7), v(14.0)));
    const chew = t > BITE1 + 0.2 && t < v(15.5) ? 0.4 + 0.4 * Math.sin((t - BITE1) * 22) : 0;
    M1.pose(t, { x: lerp(W + 260, CX + 380, m1in) - 170 * lunge + 1100 * m1out, y: 640 - hopy, r: 125, sx: 1 + 0.1 * lunge, sy: 1 - 0.1 * lunge, mouth: lunge > 0.1 ? lunge : chew, look: [-1, 0.1], ry: -0.4 });
  }
  // monster 2: edits (falls in)
  const m2t = v(15.634);
  if (t > m2t - 0.35 && t < S.bites[1]) {
    const fall = prog(t, m2t - 0.35, m2t + 0.1);
    const splat = t > m2t + 0.1 ? Math.exp(-(t - m2t - 0.1) * 8) * Math.cos((t - m2t - 0.1) * 28) : 0;
    const lunge = Math.sin(Math.PI * prog(t, BITE2 - 0.2, BITE2 + 0.25));
    const out2 = E.inBack(prog(t, v(17.5), v(17.9)));
    M2.pose(t + 3, { x: CX - 400 + 170 * lunge - 1100 * out2, y: lerp(-300, 660, E.inCubic(fall)), r: 105, sx: 1 + 0.25 * splat, sy: 1 - 0.25 * splat, mouth: lunge, look: [1, 0], ry: 0.4 });
  }
  // doubts: 3D vortex
  const vz = E.outBack(prog(t, v(17.28), v(17.8)));
  const swallow = E.inExpo(prog(t, v(20.2), S.bites[1]));
  if (vz > 0) {
    const g = on(VORTEX);
    g.position.set(X(vx), Y(vy), 0.5 + 8 * swallow); g.rotation.set(-0.75, 0.45, -t * 3.5); g.scale.setScalar(vz * 1.0 * (1 + 6 * swallow));
    QMARKS.forEach((q, i) => {
      if (swallow > 0.2) return;
      const a = t * 1.5 + i / 5 * TAU, d = 2.4 + 0.2 * Math.sin(t * 3 + i);
      on(q); q.position.set(X(vx) + Math.cos(a) * d, Y(vy) + Math.sin(a) * d * 0.65, 0.8 + Math.sin(a) * 0.8);
      q.rotation.set(0, Math.sin(t * 2 + i) * 0.6, Math.sin(t * 1.5 + i) * 0.3); q.scale.setScalar(0.8 * vz * (1 - suck * 0.5));
    });
  }
  NUMS.m50.update(t, BITE1 + 1.2); NUMS.m20.update(t, BITE2 + 1.2); NUMS.zero.update(t, S.bites[1] - 0.25);
  // crumbs (2D, drawn over)
  return () => {
    for (const [bt, x0] of [[BITE1, CX + 110], [BITE2, CX - 90]]) {
      if (t < bt || t > bt + 1.4) continue;
      const a = t - bt;
      for (let i = 0; i < 22; i++) { const th = hash(i + bt) * TAU, sp = 300 + 600 * hash(i * 3 + bt); const x = x0 + Math.cos(th) * sp * a, y = 620 + Math.sin(th) * sp * a + 1000 * a * a; ctx.fillStyle = col(i % 4 ? P.or : '#FFD2B0', clamp(1 - a / 1.2)); ctx.beginPath(); ctx.arc(x, y, 5 + 7 * hash(i), 0, TAU); ctx.fill(); }
    }
    handNote(ctx, t, v(18.1), '(долгий вздох)', CX + 120, 290, -0.06);
    if (swallow > 0) { ctx.fillStyle = col(P.n1, E.inCubic(swallow)); ctx.fillRect(0, 0, W, H); }
  };
}
function sceneNight(t) {
  nightBG(ctx, t);
  key.intensity = 1.8; hemi.color.set('#B8A8FF'); hemi.groundColor.set('#2A1E6A');
  wall.material.opacity = 0.3;
  const iris = 1 - E.outCubic(prog(t, S.night[0], S.night[0] + 0.4));
  // clock
  const cin = spring(t, v(20.8), 2.0, 0.42), cout = E.inBack(prog(t, v(21.7), v(22.0)));
  if (cout < 1) {
    const g = on(CLOCK);
    g.position.set(0, Y(600), 0); g.scale.setScalar(1.9 * cin * (1 - cout)); g.rotation.set(0.15 * Math.sin(t), -0.3 + 0.2 * Math.sin(t * 0.8), 0);
    const spin = 1 - E.outCubic(prog(t, v(20.75), v(21.3)));
    const mins = 47 + 13 * E.outCubic(prog(t, v(20.75), v(21.3)));
    CLOCK.hands[1].rotation.z = -(mins / 60) * TAU - spin * 30;
    CLOCK.hands[0].rotation.z = -((11 + mins / 60) / 12) * TAU - spin * 5;
  }
  L.n1.update(t, v(21.7));
  // tabs orbit, fall on «ноль», freeze on «Стоп», rewind on «А теперь»
  const tabsOn = t > v(21.7);
  if (tabsOn) {
    let tt = t;
    const fallT = (tt2) => Math.max(0, tt2 - FALL);
    let fall = 0, frozen = 0;
    if (t < FALL) tt = t;
    else if (t < STOP) { tt = FALL; fall = t - FALL; }
    else if (t < REWIND) { tt = FALL; fall = STOP - FALL; frozen = 1; }
    else { tt = FALL; const rw = E.inOutCubic(prog(t, REWIND, WIPE)); fall = (STOP - FALL) * (1 - rw); frozen = 1; }
    TABS.forEach((m, i) => {
      const app = E.outBack(prog(t, v(21.84) + i * 0.035, v(22.2) + i * 0.035));
      if (app <= 0.001) return;
      on(m);
      const th = i / TABS.length * TAU + tt * 1.1;
      const R = 7.2;
      let x = Math.cos(th) * R, z = Math.sin(th) * R * 0.75 - 1.5, y = Y(620) + Math.sin(th * 2 + i) * 0.5;
      const f = Math.max(0, fall - hash(i) * 0.25);
      y -= 9 * f * f; const rot = f * (hash(i * 5) - 0.5) * 5;
      m.position.set(x, y, z); m.rotation.set(0.12 + rot * 0.4, 0.35 * Math.sin(th) + rot * 0.3, rot + 0.05 * Math.sin(th * 3));
      m.scale.setScalar(app);
    });
  }
  if (t > v(21.7) && t < FALL + 0.1) L.n2.update(t, FALL - 0.05);
  if (t > v(24.0) && t < STOP) L.n3.update(t, STOP - 0.2);
  if (t > STOP - 0.1 && t < REWIND + 0.2) L.stop.update(t, REWIND);
  if (t > REWIND - 0.1) L.now.update(t, WIPE + 0.05);
  return () => {
    // flatline ECG
    if (t > FALL - 0.05 && t < STOP + 0.2) {
      const p = prog(t, FALL - 0.05, FALL + 0.45);
      const a = 1 - prog(t, STOP - 0.05, STOP + 0.15);
      ctx.strokeStyle = col(P.or, a); ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.shadowColor = col(P.or, 0.8 * a); ctx.shadowBlur = 20;
      ctx.beginPath();
      for (let x = 0; x <= W * p; x += 6) { const lx = x / W; const beat = lx < 0.42 ? Math.exp(-((((lx % 0.21) - 0.1) * 60) ** 2)) * ((lx % 0.21) > 0.1 ? -1 : 1) * 150 : 0; x ? ctx.lineTo(x, 760 - beat) : ctx.moveTo(x, 760 - beat); }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    handNote(ctx, t, v(23.3), '(выдох)', CX + 380, 330, -0.05);
    // «Стоп»: freeze-frame look
    if (t > STOP && t < WIPE) {
      const k = prog(t, STOP, STOP + 0.06) * (1 - prog(t, REWIND, REWIND + 0.3));
      ctx.fillStyle = `rgba(10,10,30,${0.35 * k})`; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = col('#FFFFFF', 0.85 * k); ctx.lineWidth = 3;
      for (const [x, y, sx, sy] of [[60, 60, 1, 1], [W - 60, 60, -1, 1], [W - 60, H - 60, -1, -1], [60, H - 60, 1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 50); ctx.lineTo(x, y); ctx.lineTo(x + sx * 50, y); ctx.stroke(); }
      ctx.fillStyle = col('#FFFFFF', k); ctx.fillRect(90, 90, 14, 44); ctx.fillRect(114, 90, 14, 44);
      ctx.font = MONO(24); ctx.fillText('PAUSE  00:25:52', 150, 124);
      if (t > REWIND) { ctx.fillStyle = col('#FFFFFF', 0.9 * (1 - prog(t, WIPE - 0.1, WIPE))); ctx.font = MONO(24); ctx.fillText('◀◀ REWIND', W - 300, 124); }
    }
    if (iris > 0) { ctx.fillStyle = col(P.n1, iris); ctx.fillRect(0, 0, W, H); }
  };
}
const PATHP = [[430, 720, 0], [760, 140, 2], [1250, 1020, -1], [1580, 520, 0]];
function bez(u) { const m = 1 - u; const b = (i) => m * m * m * PATHP[0][i] + 3 * m * m * u * PATHP[1][i] + 3 * m * u * u * PATHP[2][i] + u * u * u * PATHP[3][i]; return [b(0), b(1), b(2)]; }
function sceneImpulse(t) {
  const wipe = E.outExpo(prog(t, WIPE - 0.04, WIPE + 0.4));
  orangeBG(ctx);
  orbs(t, '#FFE0CC', 1, 0.6);
  key.intensity = 2.8; hemi.color.set('#ffffff'); hemi.groundColor.set('#ffb08a');
  floor.visible = true; floor.position.y = Y(800); floor.material.opacity = 0.18;
  if (t < v(27.25)) L.look.update(t, v(27.2));
  if (t < v(28.42)) L.i1.update(t, v(28.38));
  else if (t < v(29.74)) L.i2.update(t, v(29.7));
  else if (t < v(30.86)) L.i3.update(t, v(30.82));
  else L.i4.update(t, S.impulse[1] - 0.25);
  const born = spring(t, v(27.0), 2.4, 0.35);
  const pull = E.inOutCubic(prog(t, v(27.4), LAUNCH - 0.05));
  const fly = E.outCubic(prog(t, LAUNCH, LAUNCH + 0.8));
  const toForm = E.inOutCubic(prog(t, v(29.85), v(30.35)));
  const fillBeat = t > v(30.88) ? Math.abs(Math.sin((t - v(30.88)) * Math.PI * 4)) * prog(t, v(30.88), v(31.0)) : 0;
  // slingshot posts + band
  const postX = 640;
  if (t < LAUNCH + 0.6) {
    const pk = E.outBack(prog(t, v(27.2), v(27.6))) * (1 - prog(t, LAUNCH + 0.3, LAUNCH + 0.6));
    POSTS.forEach((g, i) => { on(g); g.position.set(X(postX), Y(800) + 1.1, i ? -0.6 : 0.6); g.scale.setScalar(Math.max(0.001, pk)); });
  }
  let bx, by, bz = 0, sx = 1, sy = 1, rz = 0;
  if (t < LAUNCH) { bx = lerp(560, 420, pull); by = 700; sx = 1 + 0.35 * pull; sy = 1 - 0.22 * pull; }
  else { const p = bez(fly), p2 = bez(Math.min(1, fly + 0.01)); bx = p[0]; by = p[1]; bz = p[2]; rz = -Math.atan2(p2[1] - p[1], p2[0] - p[0]); const sp = 1 - prog(t, LAUNCH, LAUNCH + 0.8); sx = 1 + 0.5 * sp; sy = 1 - 0.3 * sp; }
  if (t < LAUNCH) {
    BANDS.forEach((b, i) => { on(b); setGeo(b, new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(X(postX), Y(800) + 2.2, i ? -0.6 : 0.6), new THREE.Vector3(X(bx) - 0.8 * sx, Y(by), 0)), 1, 0.045, 8)); });
  }
  if (born > 0 && toForm < 1) CREAM.pose({ x: bx, y: by, z: bz, r: 90 * Math.min(1.2, born) * (1 - toForm), sx, sy, rz, eyes: 1, look: [1, -0.2] });
  // trail tube → ring
  if (t > LAUNCH) {
    const N = 90, pts = [];
    for (let i = 0; i <= N; i++) {
      const p = bez(i / N * fly);
      const a = -Math.PI / 2 + i / N * TAU;
      const cxp = CX + Math.cos(a) * 200, cyp = 620 + Math.sin(a) * 200;
      pts.push(new THREE.Vector3(X(lerp(p[0], cxp, toForm)), Y(lerp(p[1], cyp, toForm)) + 0.7 * fillBeat * (toForm > 0.99 ? 1 : 0), lerp(p[2], 0, toForm)));
    }
    on(TRAIL); setGeo(TRAIL, tubeGeo(pts, 240, 0.16 + 0.06 * toForm));
  }
  // forms
  if (t > v(30.3)) {
    SHAPES.forEach((s, k) => {
      const tp = v(30.32) + k * 0.12;
      if (t < tp) return;
      on(s);
      const sc = E.outBack(prog(t, tp, tp + 0.45));
      const bn = t > v(30.88) ? Math.abs(Math.sin((t - v(30.88)) * Math.PI * 4 + (k ? 2.1 : 1.05))) * prog(t, v(30.88), v(31.0)) : 0;
      const sq = bn < 0.15 && t > v(30.88) ? 1 - 0.2 * (1 - bn / 0.15) : 1;
      s.position.set(X(CX + (k ? 480 : -480)), Y(620) + bn * 0.9 - (1 - sq) * 0.9, 0);
      s.scale.set(sc / Math.sqrt(sq), sc * sq, sc / Math.sqrt(sq));
      s.rotation.set(0.3, (t - tp) * 1.2 * (k ? -1 : 1), k ? 0.2 : 0);
    });
  }
  if (t > v(30.88)) {
    const ek = prog(t, v(30.88), v(31.05));
    for (let i = 0; i < 32; i++) {
      const h = (0.2 + 1.6 * hash(i * 13 + Math.floor(t * 16)) * (0.4 + 0.6 * Math.abs(Math.sin((t - v(30.88)) * Math.PI * 4)))) * ek + 0.001;
      V3.set(X(CX - 16 * 46 + i * 46), Y(1010) + h / 2, 0.5); S3.set(1, h, 1); M4.compose(V3, Q, S3); EQ.setMatrixAt(i, M4);
    }
    EQ.instanceMatrix.needsUpdate = true; on(EQ);
  }
  return () => {
    if (t < LAUNCH && pull > 0.05) {
      ctx.fillStyle = col(P.ink, 0.25 * pull); rr(ctx, 380, 900, 420, 26, 13); ctx.fill();
      ctx.fillStyle = col(P.ink, pull); rr(ctx, 380, 900, 420 * pull, 26, 13); ctx.fill();
      ctx.font = UI(700, 26); ctx.fillText(`ИМПУЛЬС ${Math.round(pull * 100)}%`, 380, 880);
    }
    // the wipe from night: draw night outside the expanding circle
    if (wipe < 1) {
      tctx.save(); tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.restore();
    }
  };
}
function sceneCraft(t) {
  lightBG(ctx);
  orbs(t, '#FFB48A');
  if (t < v(32.78)) L.c1.update(t, v(32.74));
  else if (t < v(33.66)) L.c2.update(t, v(33.62));
  else if (t < v(34.46)) L.c3.update(t, v(34.42));
  else L.c4.update(t, S.craft[1] - 0.2);
  // 1) curved wall of frames sweeping past
  const wIn = E.outCubic(prog(t, S.craft[0], S.craft[0] + 0.6)), wOut = E.inCubic(prog(t, v(32.72), v(32.95)));
  if (wOut < 1) {
    FRAMES.forEach((m, k) => {
      const col2 = k % 5, row = Math.floor(k / 5);
      const ang = (col2 - 2) * 0.24 + lerp(0.9, -0.05, wIn) + 0.04 * Math.sin(t) - 1.4 * wOut;
      const Rr = 16;
      on(m);
      m.position.set(Math.sin(ang) * Rr, Y(620) + (1 - row) * 2.15 + 0.06 * Math.sin(t * 2 + k), -Rr * Math.cos(ang) + Rr - 3 + (1 - wIn) * -6);
      m.rotation.set(0, -ang, 0);
      m.scale.setScalar(E.outBack(prog(t, S.craft[0] + k * 0.02, S.craft[0] + k * 0.02 + 0.35)));
    });
  }
  // 2) bezier pen tool
  const bIn = E.outCubic(prog(t, v(32.8), v(33.15))), bOut = E.inCubic(prog(t, v(33.62), v(33.85)));
  if (bIn > 0 && bOut < 1) {
    const drag = E.inOutCubic(prog(t, v(33.15), v(33.6)));
    const A0 = new THREE.Vector3(X(460), Y(840), 0), A1 = new THREE.Vector3(X(1460), Y(400), 0);
    const H0 = new THREE.Vector3(X(lerp(1000, 820, drag)), Y(lerp(880, 1000, drag)), 0.6), H1 = new THREE.Vector3(X(lerp(900, 1160, drag)), Y(lerp(400, 200, drag)), 0.6);
    const curve = new THREE.CubicBezierCurve3(A0, H0, H1, A1);
    const dp = E.inOutCubic(prog(t, v(32.8), v(33.15)));
    const pts = curve.getPoints(120).slice(0, Math.max(2, Math.floor(121 * dp)));
    on(BEZ.tube); setGeo(BEZ.tube, tubeGeo(pts.map(p => p.clone().setY(p.y - bOut * 8)), 160, 0.11));
    [[A0, H0], [A1, H1]].forEach(([a, h], i) => {
      on(BEZ.hl[i]); setGeo(BEZ.hl[i], new THREE.TubeGeometry(new THREE.LineCurve3(a.clone().setY(a.y - bOut * 8), h.clone().setY(h.y - bOut * 8)), 1, 0.025, 6));
      on(BEZ.hc[i]); BEZ.hc[i].position.copy(h).setY(h.y - bOut * 8); BEZ.hc[i].rotation.set(t, t * 0.7, 0); BEZ.hc[i].scale.setScalar(bIn);
      on(BEZ.an[i]); BEZ.an[i].position.copy(a).setY(a.y - bOut * 8); BEZ.an[i].scale.setScalar(0.17 * bIn);
    });
    BEZ._cursor = [960 + H1.x * 100 + 20, 540 - H1.y * 100 + 24 + bOut * 800, t > v(33.15) && t < v(33.6)];
  } else BEZ._cursor = null;
  // 3) timeline panel
  const tin = spring(t, v(33.62), 2.2, 0.42), tout = E.inBack(prog(t, v(34.5), v(34.85)));
  if (t > v(33.6) && tout < 1) {
    const R = on(TL.root);
    R.position.set(0, lerp(-9, Y(680), tin) - tout * 8, 0); R.rotation.set(-0.25 + 0.05 * Math.sin(t), 0.12, 0);
    const g = TL.tex.g; g.clearRect(0, 0, 1360, 300); g.fillStyle = '#fff'; g.fillRect(0, 0, 1360, 300);
    [[P.or, 0.05, 0.55], [P.blue, 0.25, 0.85], [P.pink, 0.4, 0.95]].forEach(([c2, a, b], i) => { g.fillStyle = col(c2, 0.22); rr(g, 60 + a * 1240, 60 + i * 72, (b - a) * 1240, 44, 14); g.fill(); });
    TL.tex.tx.needsUpdate = true;
    TL.kf.forEach((k, i) => {
      const tr = Math.floor(i / 4), a = [0.05, 0.25, 0.4][tr], b = [0.55, 0.85, 0.95][tr];
      const kt = v(33.75) + tr * 0.08 + (i % 4) * 0.1;
      k.position.set((60 + (a + (b - a) * (i % 4) / 3) * 1240 - 680) / 100, (150 - 82 - tr * 72) / 100, 0.3);
      k.scale.setScalar(Math.max(0.001, E.outBack(prog(t, kt, kt + 0.3)))); k.rotation.y = t * 2 + i;
    });
    const ph = prog(t, v(33.7), v(34.48)); TL.head.position.x = (60 + ph * 1240 - 680) / 100;
  }
  // 4) the ball comes back and winks
  if (t > v(34.7)) {
    floor.visible = true; floor.position.y = Y(780);
    const bi = spring(t, v(34.7), 2.3, 0.35);
    HERO.setWedge(0, TAU);
    HERO.pose({ x: CX, y: 620, r: 150 * bi, eyes: 1, wink: t > v(35.24) && t < v(35.6) ? 1 : 0, look: [0, 0.2], ry: 0.2 * Math.sin(t) });
  }
  return () => {
    if (BEZ._cursor) cursor(ctx, ...BEZ._cursor);
    if (t > v(33.6) && t < v(34.6)) {
      const tc = 32 + (t - v(32.0)) * 0.6;
      ctx.font = SANS2(800, 64); ctx.fillStyle = col(P.ink, prog(t, v(33.7), v(33.9)) * (1 - prog(t, v(34.45), v(34.6)))); ctx.textAlign = 'center';
      ctx.fillText(`00:${String(Math.floor(tc)).padStart(2, '0')}:${String(Math.floor(frac(tc) * 60)).padStart(2, '0')}`, CX, 470); ctx.textAlign = 'left';
    }
  };
}
const CODE = [
  [['k', 'const '], ['v', 'idea'], ['p', ' = '], ['k', 'new '], ['f', 'Ball'], ['p', '({ color: '], ['s', "'#FF5A1F'"], ['p', ' });']],
  [['v', 'idea'], ['p', '.'], ['f', 'squash'], ['p', '('], ['n', '1.2'], ['p', ').'], ['f', 'stretch'], ['p', '('], ['n', '0.8'], ['p', ');']],
  [['v', 'voice'], ['p', '.'], ['f', 'on'], ['p', '('], ['s', "'импульс'"], ['p', ', () => '], ['v', 'idea'], ['p', '.'], ['f', 'launch'], ['p', '());']],
  [['v', 'type'], ['p', '.'], ['f', 'extrude'], ['p', '({ depth: '], ['n', '0.22'], ['p', ', bevel: '], ['k', 'true'], ['p', ' });']],
  [['c', '// каждый кадр — функция от времени']],
  [['f', 'render'], ['p', '({ fps: '], ['n', '60'], ['p', ', frames: '], ['n', '2964'], ['p', ' });']],
];
const CODEC = { k: '#FF5C8A', v: '#E6EDF3', p: '#9AA4B2', f: '#79C0FF', s: '#7EE787', n: '#FFA657', c: '#6E7681' };
function sceneCode(t) {
  ctx.fillStyle = '#0D1016'; ctx.fillRect(-80, -80, W + 160, H + 160);
  const g0 = ctx.createRadialGradient(CX, CY, 100, CX, CY, 1100); g0.addColorStop(0, 'rgba(110,70,255,0.22)'); g0.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
  key.intensity = 2.0; hemi.color.set('#d8d0ff'); hemi.groundColor.set('#202040'); wall.material.opacity = 0.35;
  const { g, tx } = EDITOR.tex;
  g.fillStyle = '#161B22'; g.fillRect(0, 0, 1560, 640);
  g.fillStyle = '#1F2630'; g.fillRect(0, 0, 1560, 64);
  for (let i = 0; i < 3; i++) { g.fillStyle = ['#FF5F57', '#FEBC2E', '#28C840'][i]; g.beginPath(); g.arc(40 + i * 32, 32, 10, 0, TAU); g.fill(); }
  g.fillStyle = '#9AA4B2'; g.font = UI(500, 24); g.fillText('reel3.js — от идеи к движению', 160, 41);
  let budget = Math.max(0, (t - v(35.85)) * 60);
  g.font = MONO(32);
  CODE.forEach((ln, li) => {
    const y = 140 + li * 82;
    g.fillStyle = '#4A5260'; g.textAlign = 'right'; g.fillText(String(li + 1), 80, y); g.textAlign = 'left';
    let x = 120;
    for (const [k, s] of ln) { if (budget <= 0) break; const n = Math.min(s.length, Math.floor(budget)); budget -= s.length; g.fillStyle = CODEC[k]; const part = s.slice(0, n); g.fillText(part, x, y); x += g.measureText(part).width; if (budget <= 0 && Math.floor(t * 5) % 2 === 0) { g.fillStyle = P.or; g.fillRect(x + 2, y - 30, 4, 38); } }
  });
  tx.needsUpdate = true;
  const R = on(EDITOR.root);
  const ein = spring(t, S.code[0], 1.8, 0.45);
  R.position.set(-0.6, lerp(-9, Y(620), ein), 0); R.rotation.set(-0.12, 0.22 + 0.04 * Math.sin(t * 0.7), 0.01);
  if (t < v(38.25)) L.k1.update(t, v(38.2)); else L.k2.update(t, S.code[1] - 0.2);
  // Ae tile + strike
  if (t > v(38.4)) {
    const k = spring(t, v(38.45), 2.4, 0.35);
    on(AE); AE.position.set(X(1520), Y(700), 2.2); AE.rotation.set(0.1, -0.35 + 0.1 * Math.sin(t * 2), -0.08); AE.scale.setScalar(Math.max(0.001, k));
    const st = prog(t, v(38.8), v(39.2));
    if (st > 0) {
      on(STRIKE.ring); setGeo(STRIKE.ring, new THREE.TorusGeometry(1.85, 0.13, 16, 96, TAU * Math.min(1, st * 1.4)));
      STRIKE.ring.position.set(X(1520), Y(700), 2.6); STRIKE.ring.rotation.set(0.1, -0.35, 2.3);
      if (st > 0.6) { on(STRIKE.bar); const q = (st - 0.6) / 0.4; STRIKE.bar.position.set(X(1520), Y(700), 2.7); STRIKE.bar.rotation.set(0.1, -0.35, -0.785); STRIKE.bar.scale.set(q, 1, 1); }
    }
  }
  return () => { handNote(ctx, t, v(37.84), '(смеётся)', 1300, 330, -0.06); };
}
function sceneTitle(t) {
  lightBG(ctx);
  orbs(t, '#FFB48A');
  const swap = t > v(41.5);
  if (!swap) { L.t1.update(t, v(41.45)); L.t2.update(t, v(41.45)); }
  finale(t);
}
function finale(t, cta = 0) {
  const up = E.inOutCubic(prog(t, v(43.65), v(44.2)));
  const lift = up * 2.7, shrink = 1 - 0.3 * up;
  for (const ln of [L.f1, L.f2]) { ln.root.scale.setScalar(ln.size / 100 * shrink); }
  L.f1.root.position.y = Y(470) * shrink + lift + 0.4 * up; L.f2.root.position.y = Y(700) * shrink + lift + 0.4 * up;
  L.f1.root.position.x = X(CX - 60) * shrink; L.f2.root.position.x = X(CX - 70) * shrink;
  L.f1.update(t); L.f2.update(t);
  // «…» dots → ball → jumps down to become the full stop
  const end1 = [X(CX - 60) * shrink + L.f1.width / 200 * shrink + 0.55, Y(500) * shrink + lift];
  const end2 = [X(CX - 70) * shrink + L.f2.width / 200 * shrink + 0.62, Y(730) * shrink + lift];
  const dT = v(42.0);
  if (t > dT) {
    const merge = E.inOutCubic(prog(t, v(42.3), v(42.6)));
    if (merge < 1) DOTS.forEach((d, i) => { on(d); const k = E.outBack(prog(t, dT + i * 0.09, dT + i * 0.09 + 0.3)); d.position.set(lerp(end1[0] + i * 0.42, end1[0] + 0.42, merge), end1[1] + Math.abs(Math.sin((t - dT) * 9 + i)) * 0.2 * (1 - merge), 0.3); d.scale.setScalar(Math.max(0.001, 0.15 * k)); });
    if (merge > 0) {
      const tj = v(42.8);
      let bx = end1[0] + 0.42, by = end1[1], sx = 1, sy = 1;
      if (t > tj) { const p = prog(t, tj, LAND); bx = lerp(bx, end2[0], p); by = lerp(by, end2[1], p) + Math.sin(Math.PI * p) * 2.6; if (p < 1) { sx = 0.9; sy = 1.12; } else { const a = t - LAND; const w = Math.exp(-a * 7) * Math.cos(a * 30); sx = 1 + 0.3 * w; sy = 1 - 0.3 * w; } }
      HERO.setWedge(0, TAU);
      on(HERO.root); HERO.pose({ x: CX + bx * 100, y: CY - by * 100, z: 0.4, r: lerp(15, 38, merge) * shrink, sx, sy, eyes: prog(t, LAND, LAND + 0.25), look: [-0.6, 0.4], wink: t > v(45.6) && t < v(46.0) ? 1 : 0 });
    }
  }
  // confetti on landing
  if (t > LAND && t < LAND + 2.2) {
    const a = t - LAND;
    CONF.d.forEach((d, i) => {
      if (i >= 45) return;
      const px = end2[0] + d.dx * 0.3 + Math.cos(Math.PI / 2 + d.th) * d.sp * 0.5 * a, py = end2[1] + Math.sin(Math.PI / 2 + d.th) * d.sp * 0.5 * a - 9 * a * a;
      V3.set(px, py, d.z + 0.5); S3.setScalar(d.s * clamp(2 - a)); M4.compose(V3, Q, S3); CONF.mesh.setMatrixAt(i, M4);
    });
    CONF.mesh.count = 45; CONF.mesh.instanceMatrix.needsUpdate = true; on(CONF.mesh);
  }
}
function sceneCTA(t) {
  lightBG(ctx);
  orbs(t, '#FFB48A');
  finale(t, 1);
  L.q.update(t);
  const pin = spring(t, v(44.6), 2.0, 0.4);
  const press = t > v(45.6) && t < v(45.75) ? 1 : 0;
  const bounce = t > v(45.75) ? Math.exp(-(t - v(45.75)) * 7) * Math.cos((t - v(45.75)) * 26) : 0;
  if (t > v(44.55)) {
    on(PILL); PILL.position.set(0, Y(892), 0); PILL.scale.set(Math.max(0.001, pin) * (1 - 0.05 * press + 0.06 * bounce), Math.max(0.001, pin) * (1 - 0.05 * press - 0.05 * bounce), Math.max(0.001, pin));
    PILL.rotation.set(0.05, -0.05 + 0.03 * Math.sin(t), Math.PI / 2);
  }
  L.pill.root.position.z = 1.7 - 0.15 * press; L.pill.update(t);
  if (t > v(45.62)) {
    const a = t - v(45.62);
    CONF.d.forEach((d, i) => {
      const px = d.dx * 1.2 + Math.cos(Math.PI / 2 + d.th) * d.sp * 0.8 * a, py = Y(892) + Math.sin(Math.PI / 2 + d.th) * d.sp * 0.8 * a - 11 * a * a;
      V3.set(px, py, d.z + 1); S3.setScalar(d.s * 1.4); M4.compose(V3, Q, S3); CONF.mesh.setMatrixAt(i, M4);
    });
    CONF.mesh.count = CONF.d.length; CONF.mesh.instanceMatrix.needsUpdate = true; on(CONF.mesh);
  }
  return () => {
    const cx2 = lerp(W + 100, CX + 250, E.outCubic(prog(t, v(44.9), v(45.5)))), cy2 = lerp(H + 100, 910, E.outCubic(prog(t, v(44.9), v(45.5))));
    if (t > v(44.9)) cursor(ctx, cx2, cy2, press);
    ctx.font = UI(600, 22); ctx.letterSpacing = '6px'; ctx.textAlign = 'center'; ctx.fillStyle = col(P.gray, prog(t, v(45.8), v(46.4)));
    ctx.fillText('MOTION DESIGN  ·  SHOWREEL 2026', CX, 1040); ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  };
}

// ---------------------------------------------------------------- frame
const SCENES = [['hook', sceneHook], ['notes', sceneNotes], ['dot', sceneDot], ['bites', sceneBites], ['night', sceneNight], ['impulse', sceneImpulse], ['craft', sceneCraft], ['code', sceneCode], ['title', sceneTitle], ['cta', sceneCTA]];
const WHIP = { craft: 1, code: -1 };
function shakeAt(t) {
  let x = 0, y = 0;
  const add = (t0, amp, k = 9) => { if (t < t0 || t > t0 + 1) return; const e = amp * Math.exp(-(t - t0) * k); x += e * Math.sin(t * 90 + t0); y += e * Math.cos(t * 73 + t0); };
  add(BITE1, 12); add(BITE2, 10); add(v(15.75), 8); add(WIPE, 20); add(LAUNCH, 10); add(LAND, 12); add(v(39.6), 10); add(STOP, 8); add(FALL, 5);
  return [x, y];
}
function resetFrame() {
  for (const o of REG) o.visible = false;
  wall.visible = true; wall.material.opacity = 0.09; wall.position.z = -0.5; floor.visible = false; floor.material.opacity = 0.22;
  key.intensity = 2.6; hemi.color.set('#ffffff'); hemi.groundColor.set('#ffd8c0');
  cam.position.set(0, 0, CAMZ); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.fov = 30; cam.updateProjectionMatrix();
  CONF.mesh.count = CONF.d.length;
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.setLineDash([]);
  resetFrame();
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= S[SCENES[i][0]][0]) idx = i;
  const [name, fn] = SCENES[idx];
  const sh = shakeAt(t);
  ctx.save(); ctx.translate(sh[0], sh[1]);
  const overlay = fn(t);
  // camera shake in 3D too
  cam.position.x += sh[0] / 100; cam.position.y -= sh[1] / 100;
  R3.render(scene, cam);
  ctx.drawImage(R3.domElement, -sh[0], -sh[1]);
  if (overlay) overlay();
  ctx.restore();
  // night → orange circle wipe (drawn over the impulse scene from the saved night frame)
  if (name === 'impulse' && t < WIPE + 0.45) {
    const wipe = E.outExpo(prog(t, WIPE - 0.04, WIPE + 0.4));
    if (t < WIPE + 0.4) {
      // render the frozen night look outside the circle
      tctx.save(); tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalCompositeOperation = 'source-over';
      nightBG(tctx, t);
      tctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(CX, CY, 2300 * wipe, 0, TAU, true); ctx.clip('evenodd');
      ctx.drawImage(tmp, 0, 0); ctx.restore();
      ctx.strokeStyle = col(P.cream, 1 - wipe); ctx.lineWidth = 40 * (1 - wipe); ctx.beginPath(); ctx.arc(CX, CY, 2300 * wipe, 0, TAU); ctx.stroke();
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; const r0 = 200 + 1000 * wipe, r1 = r0 + 160 * (1 - wipe); ctx.strokeStyle = col(P.cream, 1 - wipe); ctx.lineWidth = 12 * (1 - wipe) + 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); ctx.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); ctx.stroke(); }
    }
  }
  post(t, name);
}
function dirBlur(bx, by) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= 8; i++) { ctx.globalAlpha = 0.5 / i; ctx.drawImage(tmp, bx * i / 8, by * i / 8); ctx.drawImage(tmp, -bx * i / 8, -by * i / 8); }
  ctx.globalAlpha = 1;
}
function post(t, name) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // whip transitions (motion-blurred pushes)
  for (const [nm, dir] of Object.entries(WHIP)) {
    const tb = S[nm][0];
    if (t > tb - 0.2 && t < tb + 0.3) {
      const p = t < tb ? E.inExpo(prog(t, tb - 0.2, tb)) : 1 - E.outExpo(prog(t, tb, tb + 0.3));
      tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const off = (t < tb ? -1 : 1) * dir * W * 0.6 * p;
      ctx.drawImage(tmp, off, 0);
      dirBlur(140 * p, 0);
    }
  }
  if (name === 'notes' && t > S.notes[1] - 0.35) { const p = E.inExpo(prog(t, S.notes[1] - 0.35, S.notes[1])); if (p > 0.01) zoomBlur(0.25 * p); }
  let flash = 0;
  if (t > S.dot[0] && t < S.dot[0] + 0.15) flash = 0.5 * (1 - (t - S.dot[0]) / 0.15);
  if (t > v(39.6) && t < v(39.6) + 0.18) flash = Math.max(flash, 0.5 * (1 - (t - v(39.6)) / 0.18));
  if (t > LAND && t < LAND + 0.15) flash = Math.max(flash, 0.35 * (1 - (t - LAND) / 0.15));
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
  // gentle vignette + grain
  const vg = ctx.createRadialGradient(CX, CY, 500, CX, CY, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,20,10,0.14)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const f = Math.floor(t * FPS);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.05;
  const ox = -Math.floor(hash(f) * 512), oy = -Math.floor(hash(f + 0.5) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(grains[f % 3], x, y);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const k = Math.max(1 - prog(t, 0, 0.25), prog(t, DUR - 0.45, DUR));
  if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, W, H); }
}
function zoomBlur(amt) {
  tctx.globalCompositeOperation = 'copy'; tctx.drawImage(out, 0, 0); tctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= 7; i++) { const s = 1 + amt * i / 7; ctx.globalAlpha = 0.45 / i; ctx.drawImage(tmp, CX - CX * s, CY - CY * s, W * s, H * s); }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- audio cue sheet
function buildEvents() {
  for (const ln of Object.values(L)) for (const w of ln.words) {
    ev(w.t - 0.05, w.k ? 'popAccent' : 'pop', { n: w.letters.length, anim: w.anim });
  }
  ev(S.notes[0], 'notesIn'); ev(v(4.64), 'scribble');
  for (const [a, n] of [[v(5.68), 11], [v(6.96), 14]]) for (let i = 0; i < n; i++) ev(a + i * 0.4 / n, 'key');
  ev(v(6.3), 'dotPop'); ev(v(6.48), 'chuckle');
  ev(v(7.0), 'push', { end: S.notes[1] }); ev(S.notes[1] - 0.35, 'dive', { end: S.notes[1] });
  ev(S.dot[0] + 0.05, 'boing'); ev(v(10.16), 'shrink'); ev(v(11.28), 'warm'); ev(v(12.08), 'eyes'); ev(v(12.63), 'land');
  ev(v(13.04), 'hops'); ev(BITE1, 'chomp'); ev(v(15.634) + 0.1, 'splat'); ev(BITE2, 'chomp2');
  ev(v(17.28), 'vortex', { end: v(20.4) }); ev(v(18.08), 'scribble'); ev(SUCK, 'suck'); ev(v(20.2), 'swallow', { end: S.bites[1] });
  ev(v(20.75), 'clockSpin', { end: v(21.3) }); ev(v(21.3), 'dong');
  ev(v(21.84), 'tabs', { end: FALL }); ev(FALL, 'fall'); ev(FALL, 'flatline', { end: STOP });
  ev(v(23.3), 'scribble');
  ev(STOP, 'stop'); ev(REWIND, 'rewind', { end: WIPE }); ev(WIPE, 'wipe');
  ev(v(27.0), 'pop2'); ev(v(27.4), 'stretch', { end: LAUNCH }); ev(LAUNCH, 'launch'); ev(LAUNCH + 0.8, 'land2');
  ev(v(29.85), 'morph'); ev(v(30.32), 'shapePop'); ev(v(30.44), 'shapePop');
  ev(S.craft[0], 'whip'); ev(v(32.72), 'whoosh'); ev(v(33.15), 'drag', { end: v(33.6) }); ev(v(33.62), 'panel');
  for (let i = 0; i < 12; i++) ev(v(33.75) + Math.floor(i / 4) * 0.08 + (i % 4) * 0.1, 'kf');
  ev(v(34.7), 'boing'); ev(v(35.24), 'wink');
  ev(S.code[0], 'whip');
  { const total = CODE.flat().map(x => x[1]).join('').length; for (let i = 0; i < total; i += 2) ev(v(35.85) + i / 60, 'key2'); }
  ev(v(37.84), 'scribble');
  ev(v(38.45), 'aePop'); ev(v(38.8), 'marker', { end: v(39.2) }); ev(v(39.15), 'stamp');
  ev(v(39.6), 'slam');
  for (let i = 0; i < 13; i++) ev(v(40.24) + i * 0.028, 'plink', { i });
  ev(v(42.0), 'dots'); ev(v(42.3), 'merge'); ev(v(42.8), 'jump'); ev(LAND, 'finalHit');
  ev(v(43.65), 'whoosh'); ev(v(44.6), 'pillPop'); ev(v(45.6), 'click'); ev(v(45.62), 'confetti');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = [
    ['Inter Display', '/@fonts/opentype/inter/InterDisplay-Black.otf', '900', 'normal'],
    ['Inter Display', '/@fonts/opentype/inter/InterDisplay-ExtraBold.otf', '800', 'normal'],
    ['Inter Display', '/@fonts/opentype/inter/InterDisplay-Bold.otf', '700', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-Medium.otf', '500', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-SemiBold.otf', '600', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-Bold.otf', '700', 'normal'],
    ['Playfair', '/fonts/PlayfairDisplay-MediumItalic.ttf', '500', 'italic'],
    ['Caveat', '/fonts/Caveat-Bold.ttf', '700', 'normal'],
    ['DejaVu Sans Mono', '/@fonts/truetype/dejavu/DejaVuSansMono.ttf', '400', 'normal'],
  ];
  for (const [fam, url, wt, st] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt, style: st }); await f.load(); document.fonts.add(f); }
  const buf = async u => (await fetch(u)).arrayBuffer();
  FONT.sans = opentype.parse(await buf('/@fonts/opentype/inter/InterDisplay-Black.otf'));
  FONT.serif = opentype.parse(await buf('/fonts/PlayfairDisplay-BoldItalic.ttf'));
  for (let k = 0; k < 3; k++) {
    const cv = mk(512, 512), gc = cv.getContext('2d'), id = gc.createImageData(512, 512), r = rng(50 + k);
    for (let i = 0; i < id.data.length; i += 4) { const vv = 128 + (r() + r() - 1) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = vv; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); grains.push(cv);
  }
  initOrbs();
  initScenes();
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { window.BOOT_ERROR = String(e && e.stack || e); });
