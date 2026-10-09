import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

export function buildTitle(env, meta) {
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.6;
  scene.add(L.gradientBackdrop('#07173a', '#010207', '#0a5fa8', 0.6));
  scene.fog = new THREE.FogExp2(0x030a18, 0.01);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 600);
  scene.add(L.glossFloor({reflect: 0.45}));
  const lights = L.stdLights(scene);
  const rig = new THREE.Group(); scene.add(rig);

  // неоновая разметка поля на полу
  const neon = new THREE.Group(); scene.add(neon);
  const nm = c => new THREE.MeshBasicMaterial({color: L.HDR(c, 2.6), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
  const ringMat = nm(0x58c6ff);
  const addRing = (r, w) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - w, r, 160), ringMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; neon.add(m); };
  addRing(9, 0.07); addRing(15, 0.05); addRing(23, 0.04);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 90), ringMat); line.rotation.x = -Math.PI / 2; line.position.y = 0.02; neon.add(line);
  for (const s of [-1, 1]) {
    const box = new THREE.Group();
    for (const [w, d, x, z] of [[0.06, 22, 0, 0], [12, 0.06, 6, 11], [12, 0.06, 6, -11], [0.06, 22, 12, 0]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ringMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); box.add(m);
    }
    box.position.x = s * 30; box.scale.x = -s; neon.add(box);
  }

  // золото 2026, белый заголовок, мяч
  const gold = new THREE.MeshPhysicalMaterial({color: 0xffc233, metalness: 1, roughness: 0.16, envMapIntensity: 1.5, clearcoat: 0.4, emissive: 0xff9a00, emissiveIntensity: 0});
  const white = new THREE.MeshPhysicalMaterial({color: 0xd5deef, metalness: 0.3, roughness: 0.3, clearcoat: 1, envMapIntensity: 0.9, emissive: 0x3a66e0, emissiveIntensity: 0});
  const digits = L.textLetters('2026', {size: 3.3, depth: 1.1, mat: gold});
  digits.position.set(0, 3.4, 0); rig.add(digits);
  const title = L.textLetters('ЧЕМПИОНАТ МИРА', {size: 0.82, depth: 0.34, mat: white, spacing: 0.07});
  title.position.set(0, 6.9, 0); rig.add(title);
  const ball = L.makeBall(1.15); rig.add(ball);
  const mirror = L.makeMirror(rig); scene.add(mirror);
  [digits, title].forEach(g => g.userData.letters.forEach(h => { h.userData.bx = h.position.x; h.userData.by = h.position.y; }));

  // лучи, боке, искры
  const c1 = L.lightCone(0x62b4ff, 5.5, 30, 0.2), c2 = L.lightCone(0xffc060, 5.0, 30, 0.17);
  L.aimCone(c1, [-16, 26, -6], [-3, 0, 2]); L.aimCone(c2, [16, 26, -8], [3, 0, 2]); scene.add(c1, c2);
  const bk = L.bokeh(260, {box: [60, 24, 50], center: [0, 0, -4], size: 0.55}); scene.add(bk);
  const fw = new L.Fireworks(8, 70, 3); scene.add(fw.points);
  fw.add(0.88, [0, 0.4, 2.5], 0xffe9a0, 6, 1.6);
  const rings = [0.88, 1.9].map(t0 => { const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({color: L.HDR(0xbfe4ff, 3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false})); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.05, 2.5); m.userData.t0 = t0; scene.add(m); return m; });

  const bounce = (t) => {  // падение и отскоки мяча, возвращает высоту центра
    const r = 1.15, g = 49.8, t0 = 0.88;
    if (t < t0) return r + 20 * (1 - (t / t0) ** 2);
    const hs = [6.0, 1.9, 0.5]; let tt = t - t0;
    for (const h of hs) { const T = 2 * Math.sqrt(2 * h / g); if (tt < T) { const u = tt / T; return r + h * 4 * u * (1 - u); } tt -= T; }
    return r;
  };

  const obj = {scene, camera, bloom: 0.8,
    update(t, T, P) {
      // мяч
      const by = bounce(t);
      const roll = L.prog(t, 2.6, 6.2);
      ball.position.set(L.lerp(0.0, 6.0, L.easeIO(roll)) * 1 + 0, by, L.lerp(3.6, 2.0, roll));
      ball.rotation.x = t * 7; ball.rotation.z = t * 3.2 + roll * 6;
      // цифры
      digits.userData.letters.forEach((h, i) => {
        const tt = t - (1.0 + i * 0.075), a = L.prog(tt, 0, 0.85), e = Math.max(0.0001, L.easeBack(a));
        h.scale.setScalar(e); h.rotation.y = (1 - L.easeOut(a)) * Math.PI * 1.1;
        h.position.y = h.userData.by + (1 - L.easeOut(a)) * -2.4 + Math.sin(t * 1.4 + i) * 0.06 * a;
        h.visible = a > 0;
      });
      gold.emissiveIntensity = 0.05 + 0.5 * Math.exp(-Math.max(0, t - 1.0) * 2.2) * (t > 1 ? 1 : 0) + 0.04;
      // заголовок: вылет букв из камеры со вспышкой свечения
      const ts = P[0].t1 - 0.55;
      title.userData.letters.forEach((h, i) => {
        const tt = t - (ts + i * 0.045), a = L.prog(tt, 0, 0.55);
        h.visible = a > 0; const e = L.easeOut5(a);
        h.position.z = (1 - e) * 22; h.position.y = h.userData.by + (1 - e) * 2.5;
        h.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * e)); h.rotation.x = (1 - e) * -0.9; h.rotation.y = (1 - e) * 0.6;
      });
      white.emissiveIntensity = 0.22 * Math.exp(-Math.max(0, t - ts - 0.4) * 1.5) * (t > ts ? 1 : 0);
      // кольца-ударные волны
      rings.forEach(m => { const tau = t - m.userData.t0; m.visible = tau > 0 && tau < 1.6; const s = 0.5 + Math.max(0, tau) * 24; m.scale.set(s, s, s); m.material.opacity = Math.pow(Math.max(0, 1 - tau / 1.6), 2); });
      const ng = 0.35 + 0.65 * L.easeOut(L.prog(t, 0.88, 2.4));
      neon.scale.setScalar(L.lerp(0.5, 1, L.easeOut(L.prog(t, 0.88, 2.6)))); ringMat.opacity = ng;
      // свет
      lights.r1.intensity = 70 + 30 * Math.sin(t * 1.3); lights.r2.intensity = 55 + 25 * Math.sin(t * 1.1 + 1);
      lights.k.intensity = 170 * L.easeOut(L.prog(t, 0.3, 1.0));
      c1.material.uniforms.k.value = 0.2 * L.prog(t, 0.2, 1.4); c2.material.uniforms.k.value = 0.17 * L.prog(t, 0.5, 1.7);
      bk.userData.update(t); fw.update(t);
      mirror.userData.sync();
      // камера: низкий старт, облёт и наезд
      const k = L.easeIO(t / T);
      const ang = L.lerp(-0.5, 0.33, k), rad = L.lerp(18, 14.2, L.easeOut(t / T)), hgt = L.lerp(1.4, 4.6, k);
      camera.position.set(Math.sin(ang) * rad, hgt, Math.cos(ang) * rad);
      const shake = Math.exp(-Math.max(0, t - 0.88) * 6) * 0.25 * (t > 0.88 ? 1 : 0);
      camera.position.x += Math.sin(t * 60) * shake; camera.position.y += Math.cos(t * 53) * shake;
      camera.lookAt(0, L.lerp(3.0, 4.0, k), 0);
    },
    hud(ctx, t, T, P) {
      const a = L.easeOut(L.prog(t, P[1].t0 - 0.05, P[1].t0 + 0.5));
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(-(1 - a) * 40, 0);
        ctx.font = HUD.fm(22); ctx.letterSpacing = '6px'; ctx.fillStyle = '#fff'; ctx.fillText('11 ИЮНЯ — 19 ИЮЛЯ', 52, 92);
        ctx.fillStyle = '#ffc628'; ctx.fillRect(52, 104, 190 * a, 4);
        ctx.restore();
      }
    },
  };
  return obj;
}
