import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

export function buildHosts(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#081a3c', bottom: '#010308', glow: '#124f8c', glowAmt: 0.45, fog: 0.009});
  scene.add(L.glossFloor({reflect: 0.5}));
  const key = new THREE.DirectionalLight(0xffffff, 0.22); key.position.set(4, 12, 14); scene.add(key);
  const rig = new THREE.Group(); scene.add(rig);

  const defs = [
    {kind: 'usa', x: -12, color: 0x3b6bff, name: 'США', matches: '78 МАТЧЕЙ', cue: 1},
    {kind: 'can', x: -3.5, color: 0xff3b4a, name: 'КАНАДА', matches: '13 МАТЧЕЙ', cue: 2},
    {kind: 'mex', x: 5, color: 0x22d37a, name: 'МЕКСИКА', matches: '13 МАТЧЕЙ', cue: 3},
  ];
  const steel = new THREE.MeshPhysicalMaterial({color: 0xdfe6f2, metalness: 1, roughness: 0.2, envMapIntensity: 1.3});
  const white = new THREE.MeshPhysicalMaterial({color: 0xf4f8ff, metalness: 0.2, roughness: 0.22, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0});
  const items = defs.map(d => {
    const g = new THREE.Group(); g.position.set(d.x, 0, 0); rig.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 9.2, 24), steel); pole.position.y = 4.6; pole.castShadow = true; g.add(pole);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), new THREE.MeshPhysicalMaterial({color: 0xffc233, metalness: 1, roughness: 0.15})); knob.position.y = 9.3; g.add(knob);
    const flag = L.makeFlag(d.kind, 7.5, 5); flag.position.set(3.75 + 0.1, 6.7, 0); g.add(flag);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.35, 40), new THREE.MeshPhysicalMaterial({color: 0x10151f, metalness: 0.9, roughness: 0.25})); base.position.y = 0.17; g.add(base);
    const label = L.textLetters(d.name, {size: 0.85, depth: 0.35, mat: white, spacing: 0.05}); label.position.set(3.8, 1.3, 3.4); g.add(label);
    const glow = L.glowSprite(L.HDR(d.color, 1.6), 30, 0.0); glow.position.set(3.7, 7, -6); scene.add(glow);
    const spot = new THREE.SpotLight(d.color, 0, 60, 0.45, 0.8, 1.2); spot.position.set(d.x + 3, 18, 14); spot.target.position.set(d.x + 3.7, 6, 0); scene.add(spot, spot.target);
    const cone = L.lightCone(d.color, 5, 30, 0.13); L.aimCone(cone, [d.x + 3, 24, 8], [d.x + 3.7, 0, 0.5]); scene.add(cone);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({color: L.HDR(d.color, 3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}));
    ring.rotation.x = -Math.PI / 2; ring.position.set(d.x, 0.04, 0); scene.add(ring);
    return {d, g, pole, flag, label, glow, spot, cone, ring, knob};
  });
  const ball = L.makeBall(0.95); rig.add(ball);
  const mirror = L.makeMirror(rig); scene.add(mirror);
  const bk = L.bokeh(220, {box: [70, 22, 40], center: [0, 0, -6], size: 0.5, colors: ['#8fb8ff', '#ffe08a', '#ffffff']}); scene.add(bk);
  const fw = new L.Fireworks(6, 70, 3); scene.add(fw.points);
  defs.forEach((d, i) => fw.add(0, [0, 0, 0], 0xffffff, 1, 0.01));
  items.forEach(it => it.label.userData.letters.forEach(h => { h.userData.by = h.position.y; }));
  let fwDone = false;

  const obj = {scene, camera, bloom: 0.7,
    update(t, T, P) {
      if (!fwDone) { fw.bursts.length = 0; defs.forEach((d, i) => fw.add(P[d.cue].t0 + 0.05, [d.x + 3.7, 11.5, -1], d.color, 10, 2.0)); fwDone = true; }
      items.forEach(it => {
        const t0 = P[it.d.cue].t0 - 0.12, a = L.prog(t, t0, t0 + 0.9), ap = L.easeOut5(L.prog(t, t0, t0 + 0.55));
        it.g.visible = a > 0;
        it.pole.scale.y = Math.max(0.001, ap); it.pole.position.y = 4.6 * ap;
        it.knob.position.y = 0.1 + 9.2 * ap;
        it.flag.position.y = 0.2 + (6.7 - 0.2) * L.easeOut5(L.prog(t, t0 + 0.1, t0 + 1.0)) - 0.0;
        it.flag.userData.wave(t, 0.25 + 0.4 * L.easeOut(L.prog(t, t0 + 0.2, t0 + 1.4)), it.d.x);
        it.label.children.forEach((h, k) => { const aa = L.easeBack(L.prog(t, t0 + 0.3 + k * 0.04, t0 + 0.75 + k * 0.04)); h.scale.setScalar(Math.max(0.001, aa)); h.position.y = h.userData.by - (1 - aa) * 1.2; });
        white.emissiveIntensity = 0.0;
        it.glow.material.opacity = 0.16 * L.easeOut(L.prog(t, t0, t0 + 1.0));
        it.spot.intensity = 16 * L.easeOut(L.prog(t, t0, t0 + 0.6)) * (1 + 0.1 * Math.sin(t * 3 + it.d.x));
        it.cone.material.uniforms.k.value = 0.08 * L.prog(t, t0, t0 + 0.8);
        const tau = t - (t0 + 0.1); it.ring.visible = tau > 0 && tau < 1.4; const s = 1 + Math.max(0, tau) * 14; it.ring.scale.set(s, s, s); it.ring.material.opacity = Math.pow(Math.max(0, 1 - tau / 1.4), 2);
      });
      // мяч катится по полу слева направо на последней фразе
      const k = L.easeIO(L.prog(t, P[4].t0 - 0.2, P[4].t1 + 0.3));
      ball.position.set(L.lerp(-17, 17, k), 0.95 + Math.abs(Math.sin(k * 26)) * 0.0, 5.2 - 1.2 * Math.sin(k * Math.PI));
      ball.rotation.z = -k * 36; ball.rotation.x = 0.2; ball.visible = k > 0 && k < 1;
      bk.userData.update(t); fw.update(t); mirror.userData.sync();
      // камера: общий план -> подъезд к каждому флагу -> общий
      const ks = [[0, 0.3], [P[1].t0 - 0.1, -8.3], [P[2].t0 - 0.1, 0.2], [P[3].t0 - 0.1, 8.7], [P[4].t0 - 0.1, 0.3]];
      let cx = 0.3; for (let i = 1; i < ks.length; i++) if (t >= ks[i - 1][0]) cx = L.lerp(ks[i - 1][1], ks[i][1], L.easeIO5(L.prog(t, ks[i - 1][0] + 0.05, ks[i][0] + 0.35)));
      const wide = L.easeIO(L.prog(t, P[4].t0 - 0.3, P[4].t0 + 1.2)), near = 1 - wide * 0.6;
      const k0 = t / T;
      camera.position.set(cx * 0.7 + Math.sin(t * 0.5) * 0.8, 3.0 + k0 * 1.6 + wide * 2.5, 22 - k0 * 3 + wide * 7);
      camera.lookAt(cx * 0.9, 3.6, 0);
    },
    hud(ctx, t, T, P) {
      items.forEach(it => {
        const a = L.easeOut(L.prog(t, P[it.d.cue].t0 + 0.55, P[it.d.cue].t0 + 0.95));
        if (a <= 0) return;
        const [sx, sy] = L.screen(camera, it.d.x + 3.7, 0.2, 3.2);
        HUD.pill(ctx, sx, sy + 56 - (1 - a) * 18, it.d.matches, a, '#' + it.d.color.toString(16).padStart(6, '0'));
      });
    },
  };
  return obj;
}
