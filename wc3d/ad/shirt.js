// Процедурная 3D-футболка: тело из двух листов, рукава-трубки, воротник и швы. Ткань: sheen + плетение.
import * as THREE from 'three';

const BW = 0.50, XW = 0.80, HB = -0.74, HT = 0.64, NH = 0.17, T0 = 0.16, TS = 0.07;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const shoulderY = x => HT - 0.10 * Math.pow(Math.abs(x) / BW, 1.4);
const neckDepth = (x, side) => { const d = side > 0 ? 0.23 : 0.055; const a = Math.abs(x); return a >= NH ? 0 : d * Math.pow(1 - (a / NH) ** 2, 0.55); };
function bodyT(x, v, side, yTop) {
  const taper = Math.pow(Math.max(0, 1 - (x / BW) ** 2), 0.5);
  const waist = 1 - 0.1 * Math.sin(Math.PI * v) * 0.0;
  const top = 1 - sm(0.86, 1.0, v) * sm(NH * 0.95, NH * 1.5, Math.abs(x));
  return T0 * taper * top * waist;
}
export function bodyPoint(side, x, v) {
  const yTop = shoulderY(x) - neckDepth(x, side), y = HB + (yTop - HB) * v;
  const hem = 1 + 0.035 * (1 - v) * Math.sin(x * 5);
  return new THREE.Vector3(x * (1 + 0.025 * Math.sin(Math.PI * v)), y, side * bodyT(x, v, side, yTop) * hem);
}
function sleeveFrame(s) { // s: 0..1 вдоль рукава
  const top = HT - 0.09, bot = 0.12, droop = 0.2 * Math.pow(s, 1.1);
  return {yc: (top + bot) / 2 - droop, hh: (top - bot) / 2 * (1 - 0.16 * s)};
}
const buildGrid = (nx, ny, fn) => { const P = [], UV = [], I = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const p = fn(i / nx, j / ny); P.push(p.x, p.y, p.z); UV.push(p.x * 3.2, p.y * 3.2); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + (nx + 1), d = c + 1; I.push(a, c, b, b, c, d); } return {P, UV, I}; };
function merge(parts) { const P = [], UV = [], I = []; let off = 0; for (const g of parts) { P.push(...g.P); UV.push(...g.UV); I.push(...g.I.map(i => i + off)); off += g.P.length / 3; } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals(); return geo; }

export function shirtGeometry() {
  const parts = [];
  for (const side of [1, -1]) parts.push(buildGrid(64, 54, (u, v) => bodyPoint(side, -BW + 2 * BW * u, v)));
  for (const sg of [1, -1]) parts.push(buildGrid(30, 40, (u, w) => {
    const s = u, x0 = BW - 0.05, x = x0 + (XW - x0) * s, ss = Math.max(0, (x - BW) / (XW - BW)), f = sleeveFrame(ss), a = w * Math.PI * 2;
    const ramp = sm(0, 0.3, s) * 0.88 + 0.12 * 0, th = TS * (1.05 - 0.2 * ss) * (0.15 + 0.85 * ramp);
    const sh = new THREE.Vector3(x * sg, f.yc + f.hh * Math.cos(a), th * Math.sin(a));
    return sh;
  }));
  return merge(parts);
}

function weaveTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) { const on = (i + j) % 2; x.fillStyle = on ? '#b8b8b8' : '#6e6e6e'; x.fillRect(i * 4, j * 4, 4, 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 8; return t;
}
let _weave = null, _geo = null;
export function makeShirt(color = 0xf4f1ea, animated = false) {
  _weave = _weave || weaveTex(); _geo = _geo || shirtGeometry();
  const geo = animated ? _geo.clone() : _geo;
  const col = new THREE.Color(color), light = col.clone().lerp(new THREE.Color(1, 1, 1), 0.35);
  const mat = new THREE.MeshPhysicalMaterial({color: col, roughness: 0.88, metalness: 0, sheen: 0.55, sheenRoughness: 0.5, sheenColor: light, bumpMap: _weave, bumpScale: 0.35, side: THREE.DoubleSide, envMapIntensity: 0.7});
  const g = new THREE.Group(); const body = new THREE.Mesh(geo, mat); body.castShadow = true; g.add(body);
  const trim = new THREE.MeshStandardMaterial({color: col.clone().multiplyScalar(0.8), roughness: 0.9});
  // воротник: рубчик по горловине спереди и сзади
  for (const side of [1, -1]) {
    const pts = []; for (let i = 0; i <= 30; i++) { const x = -NH + 2 * NH * i / 30, yT = shoulderY(x) - neckDepth(x, side); const p = bodyPoint(side, x, 1.0); pts.push(new THREE.Vector3(p.x, yT, side * (side > 0 ? 0.095 - 0.0 * x : 0.05) * (1 - 0.15 * (x / NH) ** 2) * 0.0 + p.z + side * 0.012)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.026, 8, false), trim); g.add(tube); g.userData['collar' + side] = tube;
  }
  g.userData.mat = mat; g.userData.trim = trim; g.userData.geo = geo; g.userData.body = body;
  if (animated) { const pa = geo.attributes.position, base = Float32Array.from(pa.array);
    g.userData.animate = (t, amp = 1) => { for (let i = 0; i < pa.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]; const wy = Math.min(1, Math.max(0, (0.25 - y) / 0.95)), sx = Math.abs(x) > BW - 0.02 ? 1 : 0;
      const breath = 1 + 0.07 * Math.sin(t * 2.3) * amp, fl = Math.sin(y * 6 + x * 4 + t * 4.2) * 0.045 * wy * amp + Math.sin(x * 7 - t * 3.1) * 0.03 * wy * amp;
      pa.array[i * 3] = x * (1 + 0.012 * Math.sin(t * 2.3) * amp); pa.array[i * 3 + 1] = y + (sx ? Math.sin(t * 3.4 + x * 4) * 0.02 * amp * (Math.abs(x) - BW) : 0) - wy * 0.015 * Math.sin(t * 2.3) * amp;
      pa.array[i * 3 + 2] = z * breath + (z >= 0 ? 1 : -1) * Math.abs(fl); } pa.needsUpdate = true; geo.computeVertexNormals(); }; }
  g.userData.setColor = c => { const k = new THREE.Color(c); mat.color.copy(k); mat.sheenColor.copy(k.clone().lerp(new THREE.Color(1, 1, 1), 0.35)); trim.color.copy(k.clone().multiplyScalar(0.8)); };
  return g;
}
