import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

export function makeTrophy() {
  const g = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({color: 0xffc233, metalness: 1, roughness: 0.13, envMapIntensity: 2.4, clearcoat: 0.5, emissive: 0xff8a00, emissiveIntensity: 0.0});
  const green = new THREE.MeshPhysicalMaterial({color: 0x0c6b3d, metalness: 0.2, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.6});
  const lathe = (pts, mat, twist = 0) => {
    const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 96);
    if (twist) { const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const r = Math.hypot(x, z), th = Math.atan2(z, x); const k = L.prog(y, 1.5, 2.2) * (1 - L.prog(y, 4.0, 4.6)); const rr = r * (1 + twist * k * Math.sin(3 * th + y * 2.2)); pa.setXYZ(i, rr * Math.cos(th), y, rr * Math.sin(th)); } geo.computeVertexNormals(); }
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
  };
  g.add(lathe([[0.001, 0], [1.25, 0], [1.25, 0.16], [1.1, 0.26], [1.08, 0.3]], gold));
  g.add(lathe([[1.08, 0.3], [1.1, 0.3], [1.1, 0.95], [1.08, 0.95]], green));
  g.add(lathe([[1.08, 0.95], [1.1, 0.95], [1.26, 1.02], [1.26, 1.14], [1.0, 1.28], [0.7, 1.4], [0.56, 1.75], [0.5, 2.2], [0.6, 2.7], [0.82, 3.15], [1.1, 3.6], [1.3, 4.0], [1.28, 4.4], [1.05, 4.65], [0.6, 4.7], [0.001, 4.7]], gold, 0.1));
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 48), gold); globe.position.y = 5.35; globe.scale.y = 0.98; globe.castShadow = true; g.add(globe);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.035, 12, 96), gold); ring.position.y = 5.35; ring.rotation.x = 0.35; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 12, 96), gold); ring2.position.y = 5.35; ring2.rotation.y = Math.PI / 2; ring2.rotation.x = -0.25; g.add(ring2);
  g.userData.gold = gold; g.userData.globe = globe;
  return g;
}

export function buildFinal(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#080b1c', bottom: '#010104', glow: '#6a3a0a', glowAmt: 0.25, fog: 0.012, envInt: 0.7});
  scene.add(L.glossFloor({reflect: 0.55, color: 0x05060c, radius: 90}));
  const rig = new THREE.Group(); scene.add(rig);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.3, 0.8, 72), new THREE.MeshPhysicalMaterial({color: 0x0d1018, metalness: 0.9, roughness: 0.22, clearcoat: 1})); ped.position.y = 0.4; ped.receiveShadow = true; rig.add(ped);
  const pedRing = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.05, 10, 128), new THREE.MeshBasicMaterial({color: L.HDR(0xffc233, 3), fog: false})); pedRing.rotation.x = Math.PI / 2; pedRing.position.y = 0.82; rig.add(pedRing);
  const trophy = makeTrophy(); trophy.position.y = 0.8; rig.add(trophy);
  // «ФИНАЛ» на заднем плане
  const white = new THREE.MeshPhysicalMaterial({color: 0x8d9bb8, metalness: 0.5, roughness: 0.3, clearcoat: 1, envMapIntensity: 1.0, emissive: 0x4a7dff, emissiveIntensity: 0});
  const word = L.textLetters('ФИНАЛ', {size: 3.4, depth: 0.9, mat: white, spacing: 0.08}); word.position.set(0, 5.4, -10); rig.add(word);
  word.userData.letters.forEach(h => { h.userData.by = h.position.y; h.userData.bz = h.position.z; });
  const mirror = L.makeMirror(rig); scene.add(mirror);
  // свет
  const spot = new THREE.SpotLight(0xfff0d0, 0, 60, 0.28, 0.6, 1.1); spot.position.set(0, 24, 8); spot.target.position.set(0, 3, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); scene.add(spot, spot.target);
  const rimA = new THREE.PointLight(0x3d7bff, 0, 50, 1.5); rimA.position.set(-9, 5, -4); const rimB = new THREE.PointLight(0xff8a30, 0, 50, 1.5); rimB.position.set(9, 5, -4); scene.add(rimA, rimB);
  const beams = [];
  for (let i = 0; i < 6; i++) { const c = L.lightCone(i % 2 ? 0xffd27a : 0x8fb8ff, 3.2, 40, 0); scene.add(c); beams.push(c); }
  const glow = L.glowSprite(L.HDR(0xffb020, 1.6), 22, 0); glow.position.set(0, 4.5, -2); scene.add(glow);
  const conf = new L.Confetti(520); scene.add(conf.mesh);
  const fw = new L.Fireworks(12, 80, 4); scene.add(fw.points);
  const bk = L.bokeh(200, {box: [50, 24, 40], center: [0, 0, -4], size: 0.5, colors: ['#ffd36a', '#ffffff', '#6ab4ff']}); scene.add(bk);
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({color: L.HDR(0xffd27a, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false})); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; scene.add(m); return m; });
  let init = false;

  const obj = {scene, camera, bloom: 0.85,
    update(t, T, P) {
      const A = P[0].t0, B = P[1].t0, C = P[2].t0, D = P[3].t0;
      if (!init) { conf.fire(D + 0.05, [0, 1.5, 1]); [[D + 0.1, [-6, 9, -2], 0xffc233], [D + 0.3, [6, 10, -2], 0xffffff], [D + 0.5, [0, 12, -3], 0xffc233], [D + 0.9, [-9, 8, 0], 0xff4d5e], [D + 1.1, [9, 8, 0], 0x58c6ff]].forEach(([tt, p, c]) => fw.add(tt, p, c, 11, 2.4)); init = true; }
      // старт: тёмная сцена, лучи по очереди
      beams.forEach((c, i) => {
        const a = L.prog(t, A + 0.2 + i * 0.18, A + 0.6 + i * 0.18);
        const ang = t * 0.5 + i * Math.PI / 3, r = 9 + 2 * Math.sin(t + i);
        L.aimCone(c, [Math.cos(ang) * 16, 30, Math.sin(ang) * 16 - 4], [Math.cos(ang) * 2.2, 0, Math.sin(ang) * 2.2 - 1]);
        c.material.uniforms.k.value = 0.1 * a * (0.7 + 0.3 * Math.sin(t * 3 + i * 2)) * (1 + 0.8 * L.prog(t, D, D + 0.2));
      });
      // «ФИНАЛ» вылетает на фразе 1
      word.userData.letters.forEach((h, i) => {
        const a = L.prog(t, B + i * 0.06, B + 0.45 + i * 0.06), e = L.easeOut5(a);
        h.visible = a > 0; h.position.z = h.userData.bz + (1 - e) * 26; h.position.y = h.userData.by + (1 - e) * 3; h.scale.setScalar(Math.max(0.001, 0.5 + 0.5 * e)); h.rotation.x = (1 - e) * -0.7;
      });
      white.emissiveIntensity = 0.35 * Math.exp(-Math.max(0, t - B - 0.3) * 1.8) * (t > B ? 1 : 0) + 0.04;
      // кубок поднимается из тени и вспыхивает на последней фразе
      const rise = L.easeIO(L.prog(t, C - 0.3, D));
      trophy.position.y = L.lerp(-6.2, 0.8, rise); trophy.rotation.y = t * (0.6 + 1.6 * L.prog(t, D, D + 1)) + 0.5;
      trophy.userData.gold.emissiveIntensity = 0.22 * Math.exp(-Math.max(0, t - D) * 1.4) * (t > D ? 1 : 0);
      const pk = L.prog(t, A + 0.1, A + 1.1);
      spot.intensity = (30 * pk + 120 * L.prog(t, C, D)) * (t > D ? 1 + 0.4 * Math.exp(-(t - D) * 3) : 1);
      rimA.intensity = 10 * pk + 45 * L.prog(t, C, D); rimB.intensity = 8 * pk + 40 * L.prog(t, C, D);
      glow.material.opacity = 0.28 * L.prog(t, C, D + 0.3);
      pedRing.scale.setScalar(1); 
      rings.forEach((m, i) => { const t0 = [B + 0.05, D, D + 0.35][i], tau = t - t0; m.visible = tau > 0 && tau < 1.5; const s = 1.5 + Math.max(0, tau) * 20; m.scale.set(s, s, s); m.material.opacity = Math.pow(Math.max(0, 1 - tau / 1.5), 2); });
      conf.update(t); bk.userData.update(t); fw.update(t); mirror.userData.sync();
      // камера: низкий облёт -> «слэм»-наезд -> медленный дрейф -> подъём
      const c = L.kf(t, [
        [0, [-6, 2.0, 22], [0, 4, 0]],
        [B - 0.1, [4, 3.2, 19], [0, 4.2, -1]],
        [B + 0.4, [2, 3.8, 15], [0, 4.4, -1]],
        [C, [-2, 3.5, 14.5], [0, 3.8, 0]],
        [D, [0, 3.4, 13.5], [0, 3.7, 0]],
        [D + 1.4, [3, 5.2, 16], [0, 3.9, 0]],
        [T, [5, 6, 18], [0, 3.9, 0]]]);
      camera.position.set(...c.pos); camera.lookAt(...c.look);
      const shake = Math.exp(-Math.max(0, t - B) * 7) * 0.2 * (t > B ? 1 : 0) + Math.exp(-Math.max(0, t - D) * 6) * 0.25 * (t > D ? 1 : 0);
      camera.position.x += Math.sin(t * 61) * shake; camera.position.y += Math.cos(t * 47) * shake;
    },
    hud(ctx, t, T, P) {
      const A = P[0].t0, B = P[1].t0, C = P[2].t0, D = P[3].t0;
      const a = L.easeOut(L.prog(t, A + 0.0, A + 0.55)) * (1 - L.prog(t, B - 0.1, B + 0.1));
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.font = HUD.fo(150); ctx.fillStyle = '#ffc628'; ctx.shadowColor = 'rgba(255,160,0,0.6)'; ctx.shadowBlur = 30; ctx.fillText('19 ИЮЛЯ', 640, 330 + (1 - a) * 30);
        ctx.shadowBlur = 0; ctx.font = HUD.fm(34); ctx.letterSpacing = '8px'; ctx.fillStyle = '#fff'; ctx.fillText('МЕТЛАЙФ · НЬЮ-ДЖЕРСИ', 640, 400); ctx.restore();
      }
      const b = L.easeOut(L.prog(t, C + 0.1, C + 0.55)) * (1 - L.prog(t, D - 0.05, D + 0.15));
      if (b > 0) { ctx.save(); ctx.globalAlpha = b; ctx.textAlign = 'center'; ctx.font = HUD.fo(96); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(80,140,255,0.8)'; ctx.shadowBlur = 24; ctx.fillText('1 ИГРА  ·  1 ШАНС', 640, 150 - (1 - b) * 20); ctx.restore(); }
      const c = L.easeOut(L.prog(t, D + 0.15, D + 0.6));
      if (c > 0) { ctx.save(); ctx.globalAlpha = c; ctx.textAlign = 'center'; ctx.font = HUD.fm(34); ctx.letterSpacing = '10px'; ctx.fillStyle = '#ffc628'; ctx.fillText('ЗОЛОТОЙ КУБОК', 640, 150 - (1 - c) * 16); ctx.restore(); }
    },
  };
  return obj;
}
