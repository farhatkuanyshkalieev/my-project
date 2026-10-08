// Общая библиотека 3D: ease-функции, шрифты, мяч, частицы, флаги, фейерверки, конфетти, свет.
import * as THREE from 'three';
import {TTFLoader} from 'three/addons/loaders/TTFLoader.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, x) => a + (b - a) * x;
export const easeOut = x => 1 - Math.pow(1 - x, 3);
export const easeOut5 = x => 1 - Math.pow(1 - x, 5);
export const easeIn = x => x * x * x;
export const easeIO = x => x * x * (3 - 2 * x);
export const easeIO5 = x => x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
export const easeBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const easeElastic = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
export const rnd = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const HDR = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

// ---------- шрифты и 3D-текст ----------
const fonts = [];
export async function loadFonts() {
  const L = new TTFLoader();
  for (const f of ['fonts/montserrat-cyrillic-900-normal.woff', 'fonts/montserrat-latin-900-normal.woff']) {
    fonts.push(new FontLoader().parse(await L.loadAsync(f)));
  }
}
export function textLetters(str, {size = 1, depth = 0.3, mat, bevel = 0.035, spacing = 0.02, curve = 5} = {}) {
  const g = new THREE.Group();
  const letters = [];
  let cursor = 0;
  for (const ch of str) {
    const font = fonts.find(f => f.data.glyphs[ch]) || fonts[0];
    const glyph = font.data.glyphs[ch] || font.data.glyphs['?'];
    const adv = glyph.ha * size / font.data.resolution;
    if (ch !== ' ') {
      const geo = new TextGeometry(ch, {font, size, depth, curveSegments: curve, bevelEnabled: bevel > 0,
        bevelThickness: size * bevel, bevelSize: size * bevel * 0.8, bevelSegments: 2});
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      const holder = new THREE.Group();   // pivot в центре буквы
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
      m.position.set(-cx, -cy, -depth / 2);
      holder.add(m);
      holder.position.set(cursor + cx, cy, 0);
      holder.userData.w = bb.max.x - bb.min.x;
      g.add(holder);
      letters.push(holder);
    }
    cursor += adv + size * spacing;
  }
  const total = cursor - size * spacing;
  g.children.forEach(c => { c.position.x -= total / 2; });
  // центрируем по высоте капители (≈ 0.72 высоты шрифта)
  g.children.forEach(c => { c.position.y -= size * 0.5; });
  g.userData.width = total;
  g.userData.letters = letters;
  return g;
}

// ---------- процедурная текстура футбольного мяча (усечённый икосаэдр) ----------
let _ball = null;
export function ballTextures() {
  if (_ball) return _ball;
  const phi = (1 + Math.sqrt(5)) / 2;
  const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const pent = [[0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi], [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0], [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]];
  const hex = [];
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) hex.push([sx, sy, sz]);
  for (const a of [1, -1]) for (const b of [1, -1]) { hex.push([a / phi, 0, b * phi]); hex.push([0, a * phi, b / phi]); hex.push([a * phi, b / phi, 0]); }
  const verts = new Map();
  for (const base of [[0, 1, 3 * phi], [1, 2 + phi, 2 * phi], [phi, 2, 2 * phi + 1]]) {
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      const v = [base[0] * sx, base[1] * sy, base[2] * sz];
      for (const p of [[v[0], v[1], v[2]], [v[1], v[2], v[0]], [v[2], v[0], v[1]]]) verts.set(p.map(x => x.toFixed(4)).join(), p);
    }
  }
  const V = [...verts.values()];
  const cells = [...pent, ...hex].map(c => { const n = norm(c); let d = -1e9; for (const v of V) d = Math.max(d, v[0] * n[0] + v[1] * n[1] + v[2] * n[2]); return {n, d, p: pent.includes(c)}; });
  for (const c of cells) { const cnt = V.filter(v => v[0] * c.n[0] + v[1] * c.n[1] + v[2] * c.n[2] > c.d - 1e-3).length; if (cnt !== (c.p ? 5 : 6)) console.warn('BALL CELL CHECK FAIL', c.p, cnt); }
  const W = 2048, H = 1024;
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H;
  const bc = document.createElement('canvas'); bc.width = W; bc.height = H;
  const cx = cc.getContext('2d'), bx = bc.getContext('2d');
  const ci = cx.createImageData(W, H), bi = bx.createImageData(W, H);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let py = 0; py < H; py++) {
    const th = (py + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let px = 0; px < W; px++) {
      const ph = (px + 0.5) / W * Math.PI * 2;
      const x = -Math.cos(ph) * st, y = ct, z = Math.sin(ph) * st;
      let s1 = -9, s2 = -9, c1 = null;
      for (let i = 0; i < 32; i++) {
        const c = cells[i], s = (x * c.n[0] + y * c.n[1] + z * c.n[2]) / c.d;
        if (s > s1) { s2 = s1; s1 = s; c1 = c; } else if (s > s2) s2 = s;
      }
      const k = sm(0.0, 0.0085, s1 - s2);
      const o = (py * W + px) * 4;
      let r, g, b;
      if (c1.p) { r = 16; g = 17; b = 22; } else {
        const sh = 0.93 + 0.07 * sm(0.0, 0.06, s1 - s2);
        r = 246 * sh; g = 247 * sh; b = 250 * sh;
        const gold = sm(0.03, 0.0, s1 - s2) * 0; // зарезервировано
        r -= gold;
      }
      r = 70 + (r - 70) * k; g = 74 + (g - 74) * k; b = 84 + (b - 84) * k;
      ci.data[o] = r; ci.data[o + 1] = g; ci.data[o + 2] = b; ci.data[o + 3] = 255;
      const bv = 255 * (0.25 + 0.75 * k);
      bi.data[o] = bi.data[o + 1] = bi.data[o + 2] = bv; bi.data[o + 3] = 255;
    }
  }
  cx.putImageData(ci, 0, 0); bx.putImageData(bi, 0, 0);
  const map = new THREE.CanvasTexture(cc); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(bc);
  _ball = {map, bump};
  return _ball;
}
let _ballMat = null;
export function ballMaterial() {
  if (_ballMat) return _ballMat;
  const {map, bump} = ballTextures();
  _ballMat = new THREE.MeshPhysicalMaterial({map, bumpMap: bump, bumpScale: 2.2, roughness: 0.34, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.1});
  return _ballMat;
}
export function makeBall(r, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 54), mat || ballMaterial());
  m.castShadow = true;
  return m;
}

// ---------- свечение, боке ----------
let _glow = null;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c); return _glow;
}
export function bokeh(n, {box = [40, 20, 40], center = [0, 8, 0], size = 0.6, colors = ['#ffd36a', '#6ac0ff', '#ffffff'], speed = 0.4, opacity = 0.65, seed = 3} = {}) {
  const R = rnd(seed);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), base = new Float32Array(n * 3), vel = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    base[i * 3] = center[0] + (R() - 0.5) * box[0]; base[i * 3 + 1] = (R()) * box[1]; base[i * 3 + 2] = center[2] + (R() - 0.5) * box[2];
    vel[i] = (0.3 + R()) * speed;
    const c = new THREE.Color(colors[Math.floor(R() * colors.length)]).multiplyScalar(0.5 + R() * 1.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({size, map: glowTexture(), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true});
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  pts.userData.update = (t) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.4 + i) * 0.6;
      pos[i * 3 + 1] = (base[i * 3 + 1] + vel[i] * t) % box[1];
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.3 + i * 1.3) * 0.6;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

// ---------- фон, пол, лучи ----------
export function gradientBackdrop(top, bottom, glow = '#000000', glowAmt = 0.6) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {top: {value: new THREE.Color(top)}, bottom: {value: new THREE.Color(bottom)}, glow: {value: new THREE.Color(glow)}, amt: {value: glowAmt}},
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,bottom,glow; uniform float amt; varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c=mix(bottom,top,smoothstep(-0.1,0.9,h)); c+=glow*amt*exp(-pow((h-0.02)*5.5,2.)); gl_FragColor=vec4(c,1.); }',
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), m);
  mesh.renderOrder = -10;
  return mesh;
}
let _radial = null;
function radialAlpha(center, edge) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  const a = Math.round(center * 255), b = Math.round(edge * 255);
  g.addColorStop(0, `rgb(${a},${a},${a})`); g.addColorStop(0.75, `rgb(${b},${b},${b})`); g.addColorStop(1, `rgb(${b},${b},${b})`);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
export function glossFloor({color = 0x04070f, radius = 90, reflect = 0.38, rough = 0.36, metal = 0.55} = {}) {
  const mat = new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, transparent: true, alphaMap: radialAlpha(1 - reflect, 1), envMapIntensity: 0.22});
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), mat);
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.renderOrder = 1;
  return m;
}
export function lightCone(color, radius, height, intensity = 0.35) {
  const geo = new THREE.ConeGeometry(radius, height, 40, 1, true);
  geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: {col: {value: new THREE.Color(color)}, k: {value: intensity}, h: {value: height}},
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); vY=position.y; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 col; uniform float k,h; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float nd=abs(dot(normalize(vN),vV)); float a=pow(nd,1.6)*pow(1.+vY/h,1.4)*k; gl_FragColor=vec4(col*a,a); }',
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5; m.frustumCulled = false;
  return m;
}
export function aimCone(cone, from, to) {
  cone.position.set(...from);
  const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
}

// зеркальное отражение: клон «рига» с scale.y=-1
export function makeMirror(rig) {
  const holder = new THREE.Group(); holder.scale.y = -1;
  const clone = rig.clone(true);
  holder.add(clone);
  const a = [], b = [];
  rig.traverse(o => a.push(o)); clone.traverse(o => b.push(o));
  holder.userData.sync = () => {
    for (let i = 0; i < a.length; i++) {
      b[i].position.copy(a[i].position); b[i].quaternion.copy(a[i].quaternion); b[i].scale.copy(a[i].scale); b[i].visible = a[i].visible;
      if (a[i].isInstancedMesh && b[i].isInstancedMesh) { b[i].count = a[i].count; b[i].instanceMatrix = a[i].instanceMatrix; if (a[i].instanceColor) b[i].instanceColor = a[i].instanceColor; }
    }
  };
  return holder;
}

// ---------- флаги ----------
const LEAF = [[0, -1], [.18, -.65], [.36, -.75], [.30, -.35], [.62, -.50], [.55, -.25], [.85, -.05], [.60, .10], [.65, .30], [.18, .20], [.20, .62], [.04, .58], [.04, .95], [-.04, .95], [-.04, .58], [-.20, .62], [-.18, .20], [-.65, .30], [-.60, .10], [-.85, -.05], [-.55, -.25], [-.62, -.50], [-.30, -.35], [-.36, -.75], [-.18, -.65]];
export function flagTexture(kind) {
  const w = 1200, h = 800, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (kind === 'usa') {
    const sh = h / 13;
    for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#bf1e3a'; x.fillRect(0, i * sh, w, sh + 1); }
    x.fillStyle = '#2a3c8c'; x.fillRect(0, 0, w * 0.42, sh * 7);
    x.fillStyle = '#fff';
    for (let r = 0; r < 9; r++) for (let q = 0; q < (r % 2 ? 5 : 6); q++) {
      const px = w * 0.42 * ((r % 2 ? 1.5 : 0.5) + q * 1) / 6.0 * 1.0 + (r % 2 ? 0 : 0), py = sh * 7 * (r + 0.6) / 9.2;
      x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 7 : 17; x.lineTo(px + rr * Math.cos(a), py + rr * Math.sin(a)); } x.fill();
    }
  } else if (kind === 'can') {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#d7242c';
    x.fillRect(0, 0, w * 0.25, h); x.fillRect(w * 0.75, 0, w * 0.25, h);
    x.beginPath(); LEAF.forEach(([a, b], i) => { const px = w / 2 + a * h * 0.36, py = h * 0.47 + b * h * 0.36; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.fill();
  } else {
    ['#006847', '#ffffff', '#ce1126'].forEach((col, i) => { x.fillStyle = col; x.fillRect(w * i / 3, 0, w / 3 + 1, h); });
    x.fillStyle = '#a07a3c'; x.beginPath(); x.ellipse(w / 2, h / 2, 70, 62, 0, 0, 7); x.fill();
    x.strokeStyle = '#006847'; x.lineWidth = 12; x.beginPath(); x.arc(w / 2, h / 2, 100, 0.4, 5.9); x.stroke();
    x.fillStyle = '#7a5528'; x.beginPath(); x.ellipse(w / 2, h / 2 - 8, 26, 24, 0, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function makeFlag(kind, w = 7.5, h = 5) {
  const seg = [60, 36];
  const geo = new THREE.PlaneGeometry(w, h, seg[0], seg[1]);
  const mat = new THREE.MeshStandardMaterial({map: flagTexture(kind), side: THREE.DoubleSide, roughness: 0.7, metalness: 0.0, color: 0xcfcfcf, emissiveMap: null});
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
  const p = geo.attributes.position, base = Float32Array.from(p.array);
  mesh.userData.wave = (t, amp = 0.55, ph = 0) => {
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], u = (x + w / 2) / w;
      p.array[i * 3 + 2] = Math.sin(u * 7.5 - t * 4.2 + y * 0.55 + ph) * amp * (0.15 + u) + Math.sin(u * 3.1 - t * 2.3 + ph) * amp * 0.35 * u;
      p.array[i * 3] = x - Math.pow(u, 2) * 0.15 * Math.sin(u * 7.5 - t * 4.2 + ph + 1.2);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  return mesh;
}

// ---------- фейерверки ----------
export class Fireworks {
  constructor(maxBursts = 12, per = 90, trail = 4) {
    this.bursts = []; this.per = per; this.trail = trail; this.max = maxBursts;
    const n = maxBursts * per * trail;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({size: 0.9, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true}));
    this.points.frustumCulled = false;
    this.dirs = [];
    const R = rnd(11);
    for (let i = 0; i < per; i++) { const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); this.dirs.push([s * Math.cos(a), u, s * Math.sin(a), 0.6 + 0.4 * R()]); }
  }
  add(t0, pos, color, speed = 9, life = 2.2) { this.bursts.push({t0, pos, color: new THREE.Color(color), speed, life}); }
  update(t) {
    const P = this.pos, C = this.col; let k = 0;
    for (const b of this.bursts) {
      const tau = t - b.t0;
      for (let i = 0; i < this.per; i++) {
        for (let j = 0; j < this.trail; j++) {
          const tt = tau - j * 0.045;
          if (tt < 0 || tt > b.life) { P[k * 3] = P[k * 3 + 1] = P[k * 3 + 2] = 1e5; C[k * 3] = C[k * 3 + 1] = C[k * 3 + 2] = 0; k++; continue; }
          const d = this.dirs[i], kk = 1.7, travel = (1 - Math.exp(-kk * tt)) / kk * b.speed * d[3];
          P[k * 3] = b.pos[0] + d[0] * travel; P[k * 3 + 1] = b.pos[1] + d[1] * travel - 1.8 * tt * tt * 0.5; P[k * 3 + 2] = b.pos[2] + d[2] * travel;
          const fade = Math.pow(1 - tt / b.life, 1.5) * (1 - j / this.trail) * (tau < 0.08 ? 3 : 1.6);
          C[k * 3] = b.color.r * fade; C[k * 3 + 1] = b.color.g * fade; C[k * 3 + 2] = b.color.b * fade; k++;
        }
      }
    }
    for (; k < this.pos.length / 3; k++) { P[k * 3] = P[k * 3 + 1] = P[k * 3 + 2] = 1e5; C[k * 3] = C[k * 3 + 1] = C[k * 3 + 2] = 0; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}

// ---------- конфетти ----------
export class Confetti {
  constructor(n = 500, palette = ['#ffc628', '#ffffff', '#ff4d5e', '#3d7bff', '#2ecc71', '#ffe9a0']) {
    this.n = n;
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.26), new THREE.MeshStandardMaterial({side: THREE.DoubleSide, roughness: 0.35, metalness: 0.5, emissive: 0x222222}), n);
    this.mesh.frustumCulled = false;
    const R = rnd(21); this.d = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      this.d.push({v: [(R() - 0.5) * 14, 7 + R() * 12, (R() - 0.5) * 14], s: [R() * 8, R() * 8, R() * 8], delay: R() * 0.4});
      c.set(palette[i % palette.length]); this.mesh.setColorAt(i, c);
    }
    this.o = new THREE.Object3D(); this.t0 = 1e9; this.origin = [0, 0, 0];
  }
  fire(t0, origin) { this.t0 = t0; this.origin = origin; }
  update(t) {
    const tau0 = t - this.t0;
    for (let i = 0; i < this.n; i++) {
      const d = this.d[i], tau = tau0 - d.delay;
      if (tau < 0 || tau > 9) { this.o.scale.setScalar(0); this.o.position.set(0, -100, 0); }
      else {
        const drag = 1 - Math.exp(-1.6 * tau), k = 1 / 1.6;
        this.o.position.set(this.origin[0] + d.v[0] * k * drag, this.origin[1] + d.v[1] * k * drag - 0.5 * 2.2 * tau * tau * (tau < 1.2 ? 0.3 : 1) - Math.max(0, tau - 1.2) * 1.2, this.origin[2] + d.v[2] * k * drag);
        this.o.rotation.set(d.s[0] * tau, d.s[1] * tau, d.s[2] * tau); this.o.scale.setScalar(1);
        if (this.o.position.y < 0.05) this.o.position.y = 0.05;
      }
      this.o.updateMatrix(); this.mesh.setMatrixAt(i, this.o.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function stdLights(scene, {key = 0xfff1de, keyI = 170, rim1 = 0x2f7bff, rim2 = 0xff8a30, shadow = true} = {}) {
  const k = new THREE.SpotLight(key, keyI, 80, 0.7, 0.7, 1.4); k.position.set(2, 16, 16); k.target.position.set(0, 3, 0);
  if (shadow) { k.castShadow = true; k.shadow.mapSize.set(1024, 1024); k.shadow.bias = -0.0004; k.shadow.camera.near = 5; k.shadow.camera.far = 60; }
  scene.add(k, k.target);
  const r1 = new THREE.PointLight(rim1, 70, 60, 1.6); r1.position.set(-12, 6, -8);
  const r2 = new THREE.PointLight(rim2, 55, 60, 1.6); r2.position.set(12, 5, -6);
  scene.add(r1, r2);
  return {k, r1, r2};
}

export function screen(cam, x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(cam);
  return [(v.x * 0.5 + 0.5) * 1280, (1 - (v.y * 0.5 + 0.5)) * 720, v.z];
}
export function baseScene(env, {top = '#07173a', bottom = '#010207', glow = '#0a5fa8', glowAmt = 0.5, fog = 0.01, envInt = 0.6, fov = 40} = {}) {
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = envInt;
  scene.add(gradientBackdrop(top, bottom, glow, glowAmt));
  if (fog) scene.fog = new THREE.FogExp2(new THREE.Color(bottom).lerp(new THREE.Color(top), 0.25), fog);
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 700);
  return {scene, camera};
}
export const glowSprite = (color, scale, op = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op, fog: false}));
  s.scale.set(scale, scale, 1); return s;
};

// ключевые кадры камеры: keys = [[t, [x,y,z], [lx,ly,lz]], ...]
export function kf(t, keys, ease = easeIO) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  const u = ease(prog(t, a[0], b[0]));
  return {pos: a[1].map((v, k) => lerp(v, b[1][k], u)), look: a[2].map((v, k) => lerp(v, b[2][k], u))};
}
export function beamMaterial(color, k = 1) {
  return new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    uniforms: {col: {value: new THREE.Color(color)}, k: {value: k}},
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 col; uniform float k; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e=pow(abs(dot(normalize(vN),vV)),1.5); float a=k*e*pow(1.-vUv.y,1.2); gl_FragColor=vec4(col*a,a); }'});
}
