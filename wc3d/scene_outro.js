import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

export function buildOutro(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#050d26', bottom: '#010207', glow: '#1a4f9a', glowAmt: 0.4, fog: 0.004});
  scene.add(L.glossFloor({reflect: 0.0, color: 0x02040a, radius: 150}));
  const key = new THREE.SpotLight(0xfff1de, 55, 120, 0.7, 0.8, 1.3); key.position.set(4, 22, 26); key.target.position.set(0, 4, 0); scene.add(key, key.target);
  const l1 = new THREE.PointLight(0x3d7bff, 80, 80, 1.5); l1.position.set(-18, 8, 6); const l2 = new THREE.PointLight(0xffa13d, 70, 80, 1.5); l2.position.set(18, 8, 6); scene.add(l1, l2);
  // глобус из точек + дуги связи
  const globe = new THREE.Group(); globe.position.set(0, 6.5, -2); scene.add(globe);
  const N = 2600, R = 6.2, pos = [], col = [];
  const noise = (x, y, z) => Math.sin(x * 1.7 + 0.6) * Math.sin(y * 2.1 - 0.4) + Math.sin(z * 1.9 + x) * 0.6 + Math.sin((x + y) * 3.1) * 0.25;
  for (let i = 0; i < N; i++) {
    const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    const x = Math.cos(th) * r, z = Math.sin(th) * r; const land = noise(x, y, z) > 0.15;
    pos.push(x * R, y * R, z * R); const c = new THREE.Color(land ? 0x7cc4ff : 0x2a5aa0).multiplyScalar(land ? 3.0 : 1.3); col.push(c.r, c.g, c.b);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({size: 0.3, map: L.glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true})); globe.add(dots);
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshBasicMaterial({color: 0x040a1a, fog: false})); globe.add(core);
  const Rn = L.rnd(9), arcs = [];
  const pt = () => { const y = Rn() * 2 - 1, th = Rn() * 6.283, r = Math.sqrt(1 - y * y); return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R); };
  for (let i = 0; i < 16; i++) {
    const a = pt(), b = pt(), mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.35 + 0.2 * Rn()));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b); const geo = new THREE.TubeGeometry(curve, 64, 0.035, 6, false);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: L.HDR(i % 3 ? 0xffc233 : 0x58c6ff, 2.4), fog: false})); globe.add(m); arcs.push({m, geo, n: geo.index.count, t0: 0.5 + i * 0.28});
  }
  const hero = L.makeBall(1.7); hero.position.set(-9.5, 3.2, 8); scene.add(hero);
  const gold = new THREE.MeshPhysicalMaterial({color: 0xffc233, metalness: 1, roughness: 0.16, envMapIntensity: 2.2, emissive: 0xff9a00, emissiveIntensity: 0.15});
  const white = new THREE.MeshPhysicalMaterial({color: 0xf4f8ff, metalness: 0.2, roughness: 0.22, clearcoat: 1, envMapIntensity: 1.6});
  const w1 = L.textLetters('ОДИН МИР', {size: 2.3, depth: 0.8, mat: gold, spacing: 0.05}); w1.position.set(0, 12.8, 3); scene.add(w1);
  const w2 = L.textLetters('ОДНА ИГРА', {size: 1.5, depth: 0.5, mat: white, spacing: 0.08}); w2.position.set(0, 9.4, 3); scene.add(w2);
  [w1, w2].forEach(g => g.userData.letters.forEach(h => { h.userData.by = h.position.y; }));
  const fw = new L.Fireworks(16, 90, 4); scene.add(fw.points);
  const conf = new L.Confetti(420); scene.add(conf.mesh);
  const bk = L.bokeh(220, {box: [80, 30, 50], center: [0, 0, -6], size: 0.6, colors: ['#ffd36a', '#ffffff', '#6ab4ff']}); scene.add(bk);
  let init = false;

  const obj = {scene, camera, bloom: 0.85,
    update(t, T, P) {
      const A = P[0].t0, B = P[1].t0;
      if (!init) {
        const cols = [0xffc233, 0xff4d5e, 0x58c6ff, 0x22e07a, 0xffffff, 0xff9a3d];
        for (let i = 0; i < 16; i++) fw.add(A + 0.6 + i * 0.36, [(L.hash(i) - 0.5) * 50, 12 + L.hash(i + 9) * 14, -10 - L.hash(i + 3) * 10], cols[i % 6], 11, 2.2);
        conf.fire(B + 0.1, [0, 0.5, 6]); init = true;
      }
      globe.rotation.y = t * 0.28 + 0.6;
      const a = L.easeOut5(L.prog(t, 0, 1.2)); globe.scale.setScalar(Math.max(0.001, a));
      arcs.forEach(r => { const u = L.prog(t, r.t0, r.t0 + 1.2); r.geo.setDrawRange(0, Math.floor(r.n * L.easeIO(u) / 3) * 3); r.m.visible = u > 0; });
      hero.position.y = 2.2 + Math.abs(Math.sin(t * 2.2)) * 1.4 * L.prog(t, 0.2, 0.8); hero.position.x = -9.5 + Math.sin(t * 0.7) * 1.2; hero.rotation.y = t * 2; hero.rotation.x = t * 1.1;
      const e1 = L.prog(t, B - 0.1, B + 0.1);
      w1.userData.letters.forEach((h, i) => { const k = L.prog(t, B + 0.1 + i * 0.07, B + 0.65 + i * 0.07), e = L.easeBack(k); h.visible = k > 0; h.scale.setScalar(Math.max(0.001, e)); h.position.y = h.userData.by + (1 - L.easeOut(k)) * 5; h.rotation.x = (1 - L.easeOut(k)) * 2; });
      w2.userData.letters.forEach((h, i) => { const k = L.prog(t, B + 0.5 + i * 0.06, B + 1.0 + i * 0.06), e = L.easeBack(k); h.visible = k > 0; h.scale.setScalar(Math.max(0.001, e)); h.position.y = h.userData.by - (1 - L.easeOut(k)) * 4; });
      conf.update(t); bk.userData.update(t); fw.update(t);
      const c = L.kf(t, [[0, [0, 6.5, 30], [0, 6.5, 0]], [B, [-3, 6, 24], [0, 7.5, 0]], [T, [3, 7.5, 33], [0, 8.0, 0]]]);
      camera.position.set(...c.pos); camera.lookAt(...c.look);
    },
    hud(ctx, t, T, P) {
      const B = P[1].t0, a = L.easeOut(L.prog(t, B + 1.6, B + 2.2));
      if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = HUD.fm(30); ctx.letterSpacing = '12px'; ctx.fillStyle = '#fff'; ctx.fillText('ЧЕМПИОНАТ МИРА  ·  2026', 640, 560 - (1 - a) * 14); ctx.fillStyle = '#ffc628'; ctx.fillRect(640 - 160 * a, 578, 320 * a, 3); ctx.restore(); }
    },
  };
  return obj;
}
