// Мир притчи: долина, река, мост, небо, деревья, мешок с золотом, брызги и монеты.
import * as THREE from 'three';
import * as L from '../lib.js';
import {toon, mk, inkMat} from './figure.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const WATER_Y = -0.45;
export function terrainH(x, z) {
  const az = Math.abs(z);
  const n = Math.sin(x * 0.05 + 1.3) * Math.sin(z * 0.07) * 1.4 + Math.sin(x * 0.11) * Math.cos(z * 0.13 + 2) * 0.6 + Math.sin(x * 0.021 + z * 0.017) * 2.6;
  const g = 0.55 + 0.0022 * z * z * sm(8, 30, az) + n * sm(9, 55, az) * 0.8;
  const bank = sm(2.2, 5.4, az);
  return L.lerp(-2.4, g, bank) + (az > 5.4 ? Math.sin(x * 0.9) * Math.sin(z * 1.1) * 0.05 : 0);
}
const hash2 = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

export function buildTerrain() {
  const SIZE = 340, SEG = 220;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const sand = new THREE.Color(0xd9bf8c), dry = new THREE.Color(0xc2aa5c), grass = new THREE.Color(0x86a040), deep = new THREE.Color(0x5f8a3c), earth = new THREE.Color(0xb98b58), rock = new THREE.Color(0x9a8468), hill = new THREE.Color(0x8d8a4c);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainH(x, z); p.setY(i, h);
    const az = Math.abs(z), n = hash2(Math.floor(x * 1.7), Math.floor(z * 1.7));
    c.copy(grass).lerp(deep, sm(0.2, 0.8, Math.sin(x * 0.09 + z * 0.05) * 0.5 + 0.5)).lerp(dry, sm(0.3, 0.9, Math.sin(x * 0.04 - z * 0.08 + 1) * 0.5 + 0.5) * 0.7);
    c.lerp(hill, sm(25, 90, az));
    c.lerp(sand, 1 - sm(-0.1, 0.5, h));
    const path = (1 - sm(0.9, 1.9, Math.abs(x + 1.2 * Math.sin(z * 0.08) * sm(-8, -20, z)))) * (z < -6 ? 1 : 0);
    c.lerp(earth, path * 0.9);
    if (az > 70) c.lerp(rock, sm(70, 130, az) * 0.4);
    const k = 0.93 + n * 0.14; c.multiplyScalar(k);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toon(0xffffff, {vertexColors: true})); m.receiveShadow = true;
  return m;
}

export function buildWater() {
  const geo = new THREE.PlaneGeometry(340, 20, 120, 8); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {time: {value: 0}, sun: {value: new THREE.Vector3(-0.5, 0.6, -0.6).normalize()}}]),
    vertexShader: `varying vec3 vW; varying vec3 vP;
${THREE.ShaderChunk.fog_pars_vertex}
void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vP=position; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
${THREE.ShaderChunk.fog_vertex}
}`,
    fragmentShader: `uniform float time; uniform vec3 sun; varying vec3 vW; varying vec3 vP;
${THREE.ShaderChunk.fog_pars_fragment}
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 p=vW.xz; vec2 q=p*vec2(0.9,1.6)-vec2(time*1.1,0.);
        vec3 n=normalize(vec3(sin(q.x*2.1+q.y*1.3+time*1.5)*0.16+sin(q.x*5.3-time*2.)*0.07, 1., cos(q.y*2.4-q.x*1.1+time*1.2)*0.16+cos(q.y*6.1+time*1.7)*0.07));
        vec3 V=normalize(cameraPosition-vW); float fr=pow(1.-max(dot(n,V),0.),3.);
        vec3 deep=vec3(0.07,0.30,0.36), shal=vec3(0.30,0.62,0.62), sky=vec3(0.75,0.85,0.95);
        float edge=smoothstep(3.0,5.0,abs(vW.z));
        vec3 col=mix(deep,shal,0.35+0.35*sin(q.x*0.7)+edge*0.5); col=mix(col,sky,fr*0.55);
        vec3 R=reflect(-sun,n); float sp=pow(max(dot(R,V),0.),55.)*1.8+pow(max(dot(R,V),0.),10.)*0.12; col+=vec3(1.,0.88,0.65)*sp;
        float foam=smoothstep(0.78,0.95,sin(q.x*3.+sin(q.y*2.+time)*1.3)*0.5+0.5)*edge*0.5+smoothstep(3.9,4.7,abs(vW.z))*0.55*(0.6+0.4*sin(vW.x*2.+time*2.));
        col=mix(col,vec3(1.),clamp(foam,0.,0.8));
        gl_FragColor=vec4(col,0.86);
${THREE.ShaderChunk.fog_fragment}
      }`});
  const m = new THREE.Mesh(geo, mat); m.position.y = WATER_Y; m.renderOrder = 2; return m;
}

export function buildSky(scene) {
  scene.add(L.gradientBackdrop('#4f93cf', '#f4cf9e', '#ffb064', 1.0));
  const sunDir = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
  const s1 = L.glowSprite(L.HDR(0xfff0c8, 3.0), 90, 1); s1.position.copy(sunDir).multiplyScalar(260); scene.add(s1);
  const s2 = L.glowSprite(L.HDR(0xffa850, 1.4), 330, 0.65); s2.position.copy(sunDir).multiplyScalar(262); scene.add(s2);
  const R = L.rnd(4);
  for (let i = 0; i < 14; i++) { const c = L.glowSprite(new THREE.Color(1, 0.96, 0.9).multiplyScalar(1.0 + R() * 0.4), 60 + R() * 70, 0.22 + R() * 0.2); c.scale.y *= 0.28; const a = R() * 6.28; c.position.set(Math.cos(a) * 240, 55 + R() * 70, Math.sin(a) * 240); scene.add(c); }
  return sunDir;
}

export function buildScenery(scene) {
  const R = L.rnd(12), M = new THREE.Object3D();
  // деревья
  const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 8); trunkG.translate(0, 1.6, 0);
  const crownG = new THREE.IcosahedronGeometry(1.8, 1); crownG.translate(0, 4.2, 0);
  const NT = 90, trunks = new THREE.InstancedMesh(trunkG, toon(0x6b4a2e), NT), crowns = new THREE.InstancedMesh(crownG, toon(0xffffff), NT);
  trunks.castShadow = crowns.castShadow = true; const cc = new THREE.Color();
  for (let i = 0; i < NT; i++) {
    let x, z; do { x = (R() - 0.5) * 220; z = (R() < 0.5 ? -1 : 1) * (10 + R() * 90); } while (Math.abs(x) < 7 && z < 0);
    const s = 0.8 + R() * 1.6; M.position.set(x, terrainH(x, z), z); M.scale.set(s, s * (0.9 + R() * 0.5), s); M.rotation.y = R() * 6; M.updateMatrix(); trunks.setMatrixAt(i, M.matrix); crowns.setMatrixAt(i, M.matrix);
    cc.setHSL(0.22 + R() * 0.07, 0.45, 0.28 + R() * 0.14); crowns.setColorAt(i, cc);
  }
  scene.add(trunks, crowns);
  // камни
  const rockG = new THREE.DodecahedronGeometry(0.8, 0), NR = 70, rocks = new THREE.InstancedMesh(rockG, toon(0xffffff), NR); rocks.castShadow = rocks.receiveShadow = true;
  for (let i = 0; i < NR; i++) {
    const z = (R() - 0.5) * 120, x = (R() - 0.5) * 140; if (Math.abs(z) < 3.2 || (Math.abs(x) < 6 && z < -7 && z > -70)) { M.scale.setScalar(0.0001); } else { const s = 0.3 + R() * R() * 2.2; M.position.set(x, terrainH(x, z) + s * 0.25, z); M.scale.set(s * 1.2, s * 0.8, s); M.rotation.set(R(), R() * 6, R()); }
    M.updateMatrix(); rocks.setMatrixAt(i, M.matrix); cc.setHSL(0.09, 0.18, 0.4 + R() * 0.2); rocks.setColorAt(i, cc);
  }
  scene.add(rocks);
  // трава
  const bladeG = new THREE.ConeGeometry(0.06, 0.65, 4); bladeG.translate(0, 0.32, 0);
  const NG = 1800, blades = new THREE.InstancedMesh(bladeG, toon(0xffffff), NG);
  for (let i = 0; i < NG; i++) {
    const x = (R() - 0.5) * 60, z = -50 + R() * 46 + (R() < 0.3 ? R() * 40 : 0);
    if (Math.abs(z) < 6.6 || (Math.abs(x) < 3.6 && z < -7)) { M.scale.setScalar(0.0001); } else { const s = 0.45 + R() * 0.6; M.position.set(x, terrainH(x, z) - 0.02, z); M.scale.set(s, s * (0.7 + R() * 0.7), s); M.rotation.set((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4); }
    M.updateMatrix(); blades.setMatrixAt(i, M.matrix); cc.setHSL(0.17 + R() * 0.1, 0.5, 0.35 + R() * 0.2); blades.setColorAt(i, cc);
  }
  scene.add(blades);
  // дальние горы
  for (let i = 0; i < 12; i++) {
    const g = new THREE.ConeGeometry(30 + R() * 40, 45 + R() * 60, 7); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color: new THREE.Color().setHSL(0.58 + R() * 0.04, 0.25, 0.62 + R() * 0.08), fog: true}));
    const a = -0.6 - R() * 1.9 + Math.PI * 0.0; m.position.set(-250 + i * 46, 15, -230 - R() * 40); scene.add(m);
  }
}

// ---------- мост ----------
export function bridgeY(z) { return 0.62 - 0.46 * (1 - (z / 8.4) ** 2); }
export function buildBridge() {
  const root = new THREE.Group(), units = [], N = 17;
  const wood = toon(0x9b6a3c), woodD = toon(0x7a502b), rope = toon(0xd8c08a);
  for (let i = 0; i < N; i++) {
    const z = -8 + i * 1.0, u = new THREE.Group(); u.position.set(0, bridgeY(z), z);
    const pl = mk(new THREE.BoxGeometry(2.5, 0.13, 0.86), i % 2 ? wood : woodD, true, 0.012); pl.receiveShadow = true; u.add(pl);
    for (const s of [-1, 1]) { // канат-поручень + подвес
      const h = mk(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), rope, false); h.position.set(s * 1.2, 0.5, 0); u.add(h);
      const zn = z + 1, dy = bridgeY(zn) - bridgeY(z), len = Math.hypot(1, dy);
      const r = mk(new THREE.CylinderGeometry(0.035, 0.035, len, 6), rope, true, 0.01); r.position.set(s * 1.2, 1.0 + dy / 2, 0.5); r.rotation.x = Math.atan2(1, dy) - Math.PI / 2 + Math.PI / 2 * 0; r.rotation.x = Math.PI / 2 - Math.atan2(dy, 1) * 0 ; r.lookAt(new THREE.Vector3(0, 0, 0)); u.add(r);
      r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, dy, 1).normalize()); r.position.set(s * 1.2, 1.0 + dy / 2, 0.5);
    }
    root.add(u); units.push({u, z, base: bridgeY(z), vel: 0, spin: [(Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)], fallen: false});
  }
  for (const [z, s] of [[-8.8, -1], [-8.8, 1], [8.8, -1], [8.8, 1]]) { const p = mk(new THREE.CylinderGeometry(0.12, 0.15, 2.0, 8), woodD, true, 0.014); p.position.set(s * 1.25, bridgeY(Math.sign(z) * 8) + 0.55, z); root.add(p); }
  return {root, units};
}

// ---------- мешок с золотом ----------
export function buildSack() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.42, 28, 22); const p = geo.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + Math.sin(x * 9 + y * 5) * 0.035 + Math.sin(z * 11 + y * 7) * 0.03 - (y > 0.25 ? (y - 0.25) * 0.9 : 0);
    p.setXYZ(i, x * k, y * 1.1, z * k); c.setHex(0xb98e55).multiplyScalar(0.85 + hash2(x * 9, y * 9 + z * 5) * 0.28); col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const body = mk(geo, toon(0xffffff, {vertexColors: true}), true, 0.016); g.add(body);
  const tie = mk(new THREE.TorusGeometry(0.1, 0.028, 8, 16), toon(0x5a3b20), false); tie.position.y = 0.43; tie.rotation.x = Math.PI / 2; g.add(tie);
  const gold = new THREE.MeshStandardMaterial({color: 0xffc83a, emissive: 0xffa010, emissiveIntensity: 1.1, metalness: 0.9, roughness: 0.25});
  const heap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), gold); heap.position.y = 0.44; heap.scale.set(1, 0.75, 1); g.add(heap);
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14), gold); d.position.set(Math.cos(a) * 0.1, 0.54 + (i % 3) * 0.02, Math.sin(a) * 0.1); d.rotation.set(Math.random() * 1.2, 0, Math.random() * 1.2); g.add(d); }
  g.userData.gold = gold;
  return g;
}

// ---------- брызги и монеты ----------
export class Splash {
  constructor(n = 220) {
    this.n = n; this.bursts = [];
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({size: 0.22, map: L.glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true}));
    this.points.frustumCulled = false;
    const R = L.rnd(31); this.v = []; for (let i = 0; i < n; i++) { const a = R() * 6.283, s = 1 + R() * 3.4; this.v.push([Math.cos(a) * s, 3 + R() * 5.5, Math.sin(a) * s, R()]); }
  }
  burst(t0, pos, k = 1) { this.bursts.push({t0, pos, k}); }
  update(t) {
    const P = this.pos, C = this.col;
    for (let i = 0; i < this.n; i++) {
      let on = false;
      for (const b of this.bursts) {
        const tau = t - b.t0 - this.v[i][3] * 0.04; if (tau < 0 || tau > 1.5) continue;
        const v = this.v[i]; P[i * 3] = b.pos[0] + v[0] * tau * b.k; P[i * 3 + 1] = b.pos[1] + v[1] * tau * b.k - 4.9 * tau * tau; P[i * 3 + 2] = b.pos[2] + v[2] * tau * b.k;
        const f = Math.pow(1 - tau / 1.5, 1.4) * 1.2; C[i * 3] = 0.8 * f; C[i * 3 + 1] = 0.95 * f; C[i * 3 + 2] = 1.0 * f; on = true;
      }
      if (!on) { P[i * 3 + 1] = -100; C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = 0; }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}
export class Coins {
  constructor(n = 70) {
    this.n = n; const gold = new THREE.MeshStandardMaterial({color: 0xffc83a, emissive: 0xff9a00, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.25});
    this.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.016, 14), gold, n); this.mesh.frustumCulled = false;
    const R = L.rnd(51); this.d = Array.from({length: n}, () => ({v: [(R() - 0.5) * 3.4, 2 + R() * 3.5, (R() - 0.5) * 3.4], s: [R() * 9, R() * 9, R() * 9], dl: R() * 0.12}));
    this.o = new THREE.Object3D(); this.bursts = [];
  }
  burst(t0, pos) { this.bursts.push({t0, pos}); }
  update(t) {
    for (let i = 0; i < this.n; i++) {
      let shown = false;
      for (const b of this.bursts) {
        const d = this.d[i], tau = t - b.t0 - d.dl; if (tau < 0 || tau > 4) continue;
        let y = b.pos[1] + d.v[1] * tau - 4.9 * tau * tau; const sink = y < WATER_Y; if (sink) y = WATER_Y - (tau - 0.5) * 0.35;
        this.o.position.set(b.pos[0] + d.v[0] * tau * (sink ? 0.35 : 1), Math.max(y, -1.2), b.pos[2] + d.v[2] * tau * (sink ? 0.35 : 1));
        this.o.rotation.set(d.s[0] * tau, d.s[1] * tau, d.s[2] * tau); this.o.scale.setScalar(Math.max(0.0001, 1 - Math.max(0, tau - 2.6) / 1.4)); shown = true;
      }
      if (!shown) { this.o.scale.setScalar(0.0001); this.o.position.set(0, -50, 0); }
      this.o.updateMatrix(); this.mesh.setMatrixAt(i, this.o.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
