import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

const KX = 0.34, KZ = 0.44;
const sx = lon => (lon + 97) * KX, sz = lat => -(lat - 35) * KZ;

const WEST = [[-124.7, 48.4], [-124, 46.2], [-124.4, 43], [-124.2, 40.3], [-123, 38], [-122.5, 37.5], [-121.9, 36.6], [-120.6, 34.6], [-118.5, 34], [-117.1, 32.5]];
const BORDER_M = [[-117.1, 32.5], [-114.7, 32.7], [-111, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-104.5, 29.6], [-102.7, 29.8], [-101, 29.4], [-99.5, 27.5], [-97.15, 25.95]];
const EAST = [[-97.4, 27.6], [-95, 29.2], [-93.8, 29.7], [-91, 29.2], [-89.5, 29.1], [-89.4, 30.2], [-87.5, 30.3], [-85.3, 29.7], [-84, 30.1], [-82.8, 28.9], [-82.6, 27.5], [-81.8, 26.1], [-81, 25.2], [-80.4, 25.2], [-80.05, 26.8], [-80.6, 28.4], [-81.4, 30.5], [-81, 31.9], [-79, 33.3], [-76.5, 34.7], [-75.6, 35.7], [-76, 37], [-75.2, 38.3], [-74.1, 39.5], [-74, 40.5], [-72, 41], [-70.8, 41.7], [-70, 41.7], [-70.7, 42.7], [-70.6, 43.1], [-69, 44], [-67, 44.8]];
const BORDER_C = [[-123.3, 49], [-95.15, 49], [-91, 48.2], [-88, 48], [-84.5, 46.5], [-82.5, 45.3], [-82.5, 43], [-79, 43.3], [-76.5, 44.1], [-75, 45], [-71.5, 45], [-70.8, 45.4], [-69.2, 47.4], [-67.8, 47.1], [-67, 44.9]];
const MEX_GULF = [[-97.7, 24], [-97.8, 22.2], [-97.2, 20.6], [-96.2, 19.2], [-94.7, 18.2], [-93, 18.4], [-91.5, 18.6], [-90.7, 19.4], [-90.4, 21], [-88, 21.5], [-87, 21.4], [-87.5, 18.5], [-88.4, 17.9], [-89.1, 17.9], [-90.9, 17.8], [-91.4, 17.2], [-92.2, 16.1], [-92.2, 14.55]];
const MEX_PAC = [[-94.5, 16.2], [-96.5, 15.7], [-99, 16.7], [-101.5, 17.8], [-103.5, 18.5], [-105.5, 20.2], [-105.4, 21.7], [-106.5, 23.2], [-108.8, 25.4], [-110.7, 27.7], [-112.5, 29.6], [-113.6, 31.1], [-114.8, 31.8]];
const BAJA = [[-114.4, 30.4], [-112.8, 28.2], [-111.6, 26], [-110.3, 24.2], [-109.5, 23.2], [-110, 22.9], [-112.2, 24.8], [-113, 26.8], [-114.2, 28.2], [-115.7, 30.3], [-116.6, 31.6]];
const CAN_E = [[-65.5, 43.8], [-60, 45.8], [-60.5, 47.2], [-64, 47.8], [-65.2, 49.2], [-66.5, 50], [-60, 50.5], [-57, 52], [-56, 56]];
const CAN_W = [[-128, 56], [-130, 54], [-127.5, 51], [-125, 49.8]];

const POLY = {
  usa: [...WEST, ...BORDER_M.slice(1), ...EAST, ...[...BORDER_C].reverse().slice(1)],
  mex: [...BORDER_M, ...MEX_GULF, ...MEX_PAC, ...BAJA],
  can: [...BORDER_C, ...CAN_E, ...CAN_W],
};
const COL = {usa: 0x2f6bff, mex: 0x1fd67c, can: 0xff3b4a};
const CITIES = [
  {k: 'usa', n: 'Сиэтл', lon: -122.3, lat: 47.6, d: [-40, -4]}, {k: 'usa', n: 'Сан-Франциско', lon: -122.0, lat: 37.4, d: [-70, 0]}, {k: 'usa', n: 'Лос-Анджелес', lon: -118.3, lat: 34.0, d: [-72, 6]},
  {k: 'usa', n: 'Даллас', lon: -97.0, lat: 32.8, d: [-44, 4]}, {k: 'usa', n: 'Хьюстон', lon: -95.4, lat: 29.7, d: [0, 22]}, {k: 'usa', n: 'Канзас-Сити', lon: -94.6, lat: 39.1, d: [-10, -6]},
  {k: 'usa', n: 'Атланта', lon: -84.4, lat: 33.7, d: [-4, 18]}, {k: 'usa', n: 'Майами', lon: -80.2, lat: 25.8, d: [36, 4]}, {k: 'usa', n: 'Бостон', lon: -71.2, lat: 42.1, d: [18, -26]},
  {k: 'usa', n: 'Филадельфия', lon: -75.2, lat: 39.9, d: [50, 6]}, {k: 'usa', n: 'Нью-Йорк', lon: -74.1, lat: 40.8, d: [50, -12]},
  {k: 'mex', n: 'Мехико', lon: -99.1, lat: 19.4, d: [-8, 26]}, {k: 'mex', n: 'Гвадалахара', lon: -103.3, lat: 20.7, d: [-74, 6]}, {k: 'mex', n: 'Монтеррей', lon: -100.3, lat: 25.7, d: [-62, 4]},
  {k: 'can', n: 'Ванкувер', lon: -123.1, lat: 49.3, d: [-50, -10]}, {k: 'can', n: 'Торонто', lon: -79.4, lat: 43.7, d: [4, -28]},
];
const ORDER = [14, 0, 1, 2, 11, 12, 13, 3, 4, 5, 6, 15, 7, 8, 9, 10];   // порядок появления (запад → восток)

function gridTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 3); x.fillRect(0, 0, 3, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

export function buildCities(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#07142e', bottom: '#010206', glow: '#0e4a8a', glowAmt: 0.4, fog: 0.006});
  scene.add(L.glossFloor({reflect: 0.0, color: 0x03060c, radius: 140}));
  const key = new THREE.DirectionalLight(0xbcd6ff, 1.2); key.position.set(-8, 20, 14); scene.add(key);
  const grid = gridTex();
  const lands = {};
  for (const k of ['usa', 'mex', 'can']) {
    const sh = new THREE.Shape();
    POLY[k].forEach(([lon, lat], i) => { const x = (lon + 97) * KX, y = (lat - 35) * KZ; i ? sh.lineTo(x, y) : sh.moveTo(x, y); });
    const geo = new THREE.ExtrudeGeometry(sh, {depth: 0.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2});
    const mat = new THREE.MeshStandardMaterial({color: 0x1a3566, metalness: 0.4, roughness: 0.4, emissive: COL[k], emissiveMap: grid, emissiveIntensity: 0.55, envMapIntensity: 0.4});
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.0; scene.add(mesh);
    mesh.castShadow = true; lands[k] = mesh;
  }
  // пины
  const pins = CITIES.map((c, i) => {
    const g = new THREE.Group(); g.position.set(sx(c.lon), 0.56, sz(c.lat)); scene.add(g);
    const beamGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 12, 1, true); beamGeo.translate(0, 0.5, 0);
    const beam = new THREE.Mesh(beamGeo, L.beamMaterial(COL[c.k], 1.6)); g.add(beam);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), new THREE.MeshBasicMaterial({color: L.HDR(COL[c.k], 3.2), fog: false})); g.add(orb);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({color: L.HDR(COL[c.k], 3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    const ball = L.makeBall(0.36); g.add(ball);
    return {c, g, beam, orb, ring, ball, t0: 0};
  });
  // дуга Ванкувер → Мехико
  const van = new THREE.Vector3(sx(-123.1), 0.6, sz(49.3)), mex = new THREE.Vector3(sx(-99.1), 0.6, sz(19.4));
  const curve = new THREE.CubicBezierCurve3(van, van.clone().add(new THREE.Vector3(-4, 9, 4)), mex.clone().add(new THREE.Vector3(-6, 10, -6)), mex);
  const tubeGeo = new THREE.TubeGeometry(curve, 160, 0.07, 8, false);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({color: L.HDR(0xffc233, 2), fog: false})); scene.add(tube);
  const tubeIdx = tubeGeo.index.count;
  const runner = L.makeBall(0.55); scene.add(runner);
  const bk = L.bokeh(200, {box: [60, 16, 50], center: [0, 0, 0], size: 0.4, colors: ['#6ab4ff', '#ffffff', '#ffd36a']}); scene.add(bk);
  const fw = new L.Fireworks(4, 60, 3); scene.add(fw.points);
  const active = {usa: 0, mex: 0, can: 0};

  const obj = {scene, camera, bloom: 0.75,
    update(t, T, P) {
      const k = Object.keys(lands);
      const grow = L.easeOut5(L.prog(t, 0.0, 1.1));
      k.forEach(n => { lands[n].scale.set(1, Math.max(0.001, grow), 1); });
      const hi = {usa: L.prog(t, P[1].t0, P[1].t0 + 0.4) * (1 - L.prog(t, P[2].t0, P[2].t0 + 0.3)), mex: L.prog(t, P[2].t0, P[2].t0 + 0.4) * (1 - L.prog(t, P[3].t0, P[3].t0 + 0.3)), can: L.prog(t, P[3].t0, P[3].t0 + 0.4) * (1 - L.prog(t, P[4].t0, P[4].t0 + 0.3))};
      k.forEach(n => { lands[n].material.emissiveIntensity = 0.55 + 1.0 * hi[n] * (0.8 + 0.2 * Math.sin(t * 6)); });
      pins.forEach((p, idx) => {
        const rank = ORDER.indexOf(idx), st = P[0].t0 + 0.35 + rank * 0.062, a = L.prog(t, st, st + 0.5);
        const h = 1 + 1.8 * hi[p.c.k];
        const H = 5.5 * L.easeOut5(a) * h;
        p.g.visible = a > 0;
        p.beam.scale.set(1, Math.max(0.001, H), 1); p.orb.position.y = H + 0.1; p.ball.position.y = H + 0.65; p.ball.rotation.y = t * 2; p.ball.rotation.x = t;
        p.ball.scale.setScalar(L.easeBack(a) * (1 + 0.5 * hi[p.c.k]));
        const tau = t - st, rs = 0.4 + Math.max(0, tau) * 5; p.ring.visible = tau > 0 && tau < 0.8; p.ring.scale.set(rs, rs, rs); p.ring.material.opacity = Math.pow(Math.max(0, 1 - tau / 0.8), 2);
        p.orb.scale.setScalar(1 + 0.5 * hi[p.c.k] + 0.15 * Math.sin(t * 6 + idx));
      });
      // дуга и «бегун»
      const ta = L.prog(t, P[4].t0 - 0.1, P[4].t1 - 0.2);
      tube.visible = ta > 0; tubeGeo.setDrawRange(0, Math.floor(tubeIdx * L.easeIO(ta) / 3) * 3);
      runner.visible = ta > 0; runner.position.copy(curve.getPoint(L.easeIO(ta))); runner.rotation.set(t * 5, t * 3, 0);
      if (!fw.bursts.length) fw.add(P[4].t1 - 0.1, [mex.x, 2, mex.z], 0x1fd67c, 8, 2); 
      bk.userData.update(t); fw.update(t);
      const vanP = [van.x, 0, van.z], mexP = [mex.x, 0, mex.z];
      const c = L.kf(t, [
        [0, [-14, 21, 26], [0, 0, -1]],
        [P[1].t0 - 0.1, [14, 16, 22], [0, 0, -1]],
        [P[2].t0 - 0.1, [2, 15, 20], [0, 0, -1.5]],
        [P[3].t0 - 0.1, [-3, 15, 17], [-1, 0, 5.5]],
        [P[4].t0 - 0.1, [0, 15, 4], [0, 0, -4.5]],
        [P[4].t0 + 0.9, [-12, 13, 4], [-8, 0, -3]],
        [P[4].t1 + 0.4, [-2, 16, 20], [-6, 0, 3.5]],
        [T, [4, 19, 25], [-5, 0, 3]]]);
      camera.position.set(...c.pos); camera.position.x += Math.sin(t * 0.6) * 0.4; camera.lookAt(...c.look);
    },
    hud(ctx, t, T, P) {
      const a0 = L.easeOut(L.prog(t, P[0].t0, P[0].t0 + 0.3)) * (1 - L.prog(t, P[1].t0 - 0.1, P[1].t0 + 0.2));
      const n = Math.round(16 * L.easeOut(L.prog(t, P[0].t0 + 0.2, P[0].t1)));
      HUD.stat(ctx, {x: 640, y: 168, value: n, label: 'ГОРОДОВ', a: a0, size: 140});
      // плашки стран справа
      [['usa', 'США', 11, 1], ['mex', 'МЕКСИКА', 3, 2], ['can', 'КАНАДА', 2, 3]].forEach(([kk, name, num, cue], i) => {
        const a = L.easeOut(L.prog(t, P[cue].t0 - 0.05, P[cue].t0 + 0.4));
        if (a <= 0) return;
        const col = '#' + COL[kk].toString(16).padStart(6, '0');
        const x = 52 - (1 - a) * 80, y = 190 + i * 74;
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(6,14,32,0.82)'; HUD.rr(ctx, x - 20, y - 36, 292, 62, 18); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = HUD.fm(26); ctx.fillStyle = '#fff'; ctx.fillText(name, x, y + 6);
        ctx.font = HUD.fo(48); ctx.fillStyle = '#ffc628'; ctx.textAlign = 'right'; ctx.fillText(String(Math.round(num * L.easeOut(L.prog(t, P[cue].t0, P[cue].t0 + 0.6)))), x + 262, y + 12);
        ctx.restore();
      });
      // подписи городов
      pins.forEach((p, idx) => {
        const cue = {usa: 1, mex: 2, can: 3}[p.c.k];
        const a = L.easeOut(L.prog(t, P[cue].t0 + 0.2, P[cue].t0 + 0.7)) * (t > P[4].t0 + 0.2 && p.c.k === 'usa' ? 0.0 : 1) * (1 - L.prog(t, P[4].t1 + 0.5, P[4].t1 + 0.9));
        if (a <= 0.01) return;
        const [x, y, z] = L.screen(camera, p.g.position.x, 0.6 + 5.5 * (1 + 1.8 * (t < P[cue + 1]?.t0 ? 1 : 0)) * 0.55, p.g.position.z);
        if (z > 1 || y < 125 || y > 640 || x < 40 || x > 1240) return;
        ctx.save(); ctx.globalAlpha = a * 0.95; ctx.font = HUD.fm(17); ctx.textAlign = 'center';
        const w = ctx.measureText(p.c.n).width + 18; const px = x + p.c.d[0], py = y + p.c.d[1];
        ctx.fillStyle = 'rgba(4,10,24,0.75)'; HUD.rr(ctx, px - w / 2, py - 15, w, 26, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(p.c.n, px, py + 4); ctx.restore();
      });
    },
  };
  return obj;
}
