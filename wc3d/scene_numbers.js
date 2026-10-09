import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

export function buildNumbers(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#0a1a3d', bottom: '#010308', glow: '#7a4a10', glowAmt: 0.35, fog: 0.007});
  scene.add(L.glossFloor({reflect: 0.5}));
  const key = new THREE.SpotLight(0xfff1de, 85, 90, 0.9, 0.8, 1.3); key.position.set(0, 24, 22); key.target.position.set(0, 4, 0); scene.add(key, key.target);
  const fill1 = new THREE.PointLight(0x3d7bff, 40, 70, 1.5); fill1.position.set(-22, 8, 6);
  const fill2 = new THREE.PointLight(0xffa13d, 35, 70, 1.5); fill2.position.set(22, 8, 6); scene.add(fill1, fill2);
  const rig = new THREE.Group(); scene.add(rig);

  // ---- 48 мячей (8 x 6): 32 белых + 16 золотых
  const BX = -8.0, BY0 = 2.3;
  const ballGeo = new THREE.SphereGeometry(0.52, 44, 32);
  const balls = new THREE.InstancedMesh(ballGeo, L.ballMaterial(), 48);
  balls.frustumCulled = false; balls.castShadow = true; rig.add(balls);
  const gold = new THREE.Color(1.0, 0.72, 0.18), wht = new THREE.Color(1, 1, 1);
  const bpos = [], R = L.rnd(5);
  for (let i = 0; i < 48; i++) {
    const c = i % 8, r = Math.floor(i / 8);
    bpos.push(new THREE.Vector3(BX + (c - 3.5) * 1.24, BY0 + (5 - r) * 1.24 + 0.3, 0));
    balls.setColorAt(i, i < 32 ? wht : gold);
  }
  // ---- 104 плитки-«матча» (13 x 8): 64 белых + 40 золотых
  const TX = 8.6, TY0 = 2.0;
  const tileGeo = new THREE.BoxGeometry(0.8, 0.52, 0.14);
  const tileMat = new THREE.MeshPhysicalMaterial({color: 0xffffff, metalness: 0.4, roughness: 0.25, clearcoat: 1, envMapIntensity: 1.2});
  const tiles = new THREE.InstancedMesh(tileGeo, tileMat, 104); tiles.frustumCulled = false; tiles.castShadow = true; rig.add(tiles);
  const tpos = [];
  for (let i = 0; i < 104; i++) {
    const c = i % 13, r = Math.floor(i / 13);
    tpos.push(new THREE.Vector3(TX + (c - 6) * 0.93, TY0 + (7 - r) * 0.68, 0));
    tiles.setColorAt(i, i < 64 ? new THREE.Color(0.92, 0.95, 1.0) : new THREE.Color(1.0, 0.72, 0.16));
  }
  const mirror = L.makeMirror(rig); scene.add(mirror);
  const bk = L.bokeh(240, {box: [90, 24, 50], center: [0, 0, -8], size: 0.55, colors: ['#ffd36a', '#6ac0ff', '#ffffff']}); scene.add(bk);
  const fw = new L.Fireworks(6, 70, 3); scene.add(fw.points);
  const gl1 = L.glowSprite(L.HDR(0xffb020, 1.0), 20, 0); gl1.position.set(BX, 5, -3); scene.add(gl1);
  const gl2 = L.glowSprite(L.HDR(0xffb020, 1.0), 24, 0); gl2.position.set(TX, 5, -3); scene.add(gl2);
  const o = new THREE.Object3D();
  let fwDone = false;
  const hash = (i) => L.hash(i + 11);

  const obj = {scene, camera, bloom: 0.7,
    update(t, T, P) {
      const A0 = P[0].t0, B0 = P[1].t0, C0 = P[2].t0;
      if (!fwDone) { fw.add(A0 + 1.25, [BX, 5, 1], 0xffc233, 9, 2.0); fw.add(B0 + 1.5, [TX, 5.5, 1], 0xffc233, 10, 2.0); fw.add(C0 + 0.3, [0, 8, -2], 0x6ab4ff, 12, 2.4); fwDone = true; }
      // мячи: 32 белых влетают, затем 16 золотых
      for (let i = 0; i < 48; i++) {
        const gold_ = i >= 32, st = gold_ ? A0 + 0.95 + (i - 32) * 0.035 : A0 - 0.05 + i * 0.022;
        const a = L.prog(t, st, st + (gold_ ? 0.6 : 0.7)), e = L.easeOut5(a);
        const h1 = hash(i), h2 = hash(i + 50);
        o.position.set(bpos[i].x + (1 - e) * (h1 - 0.5) * 30, bpos[i].y + (1 - e) * (h2 * 14 + 4) * (gold_ ? 1.5 : 1), bpos[i].z + (1 - e) * (14 + h1 * 12));
        o.position.y += Math.sin(t * 1.6 + i * 0.7) * 0.07 * a;
        o.rotation.set(t * (1 + h1) + i, t * (1.5 + h2) , 0);
        // уход на втором этапе — уменьшаем и сдвигаем вдаль
        const away = L.easeIO(L.prog(t, C0 - 0.4, C0 + 0.5)) * 0;
        o.scale.setScalar(a > 0 ? 1 - away * 0.0 : 0.0001);
        o.updateMatrix(); balls.setMatrixAt(i, o.matrix);
      }
      balls.instanceMatrix.needsUpdate = true;
      // плитки: волна подъёма снизу; золотые прилетают сверху
      for (let i = 0; i < 104; i++) {
        const c = i % 13, r = Math.floor(i / 13), goldT = i >= 64;
        const st = B0 - 0.1 + (goldT ? 0.9 + (i - 64) * 0.03 : (c * 0.03 + (7 - r) * 0.045));
        const a = L.prog(t, st, st + 0.55), e = L.easeBack(a);
        o.position.set(tpos[i].x, tpos[i].y + (goldT ? (1 - L.easeOut5(a)) * 9 : -(1 - e) * 5), tpos[i].z + (goldT ? (1 - L.easeOut5(a)) * 6 : 0));
        o.rotation.set(goldT ? (1 - a) * 3 : (1 - a) * 1.2, Math.sin(t * 0.8 + i * 0.3) * 0.08, 0);
        o.scale.setScalar(a > 0 ? 1 : 0.0001);
        o.updateMatrix(); tiles.setMatrixAt(i, o.matrix);
      }
      tiles.instanceMatrix.needsUpdate = true;
      gl1.material.opacity = 0.55 * L.prog(t, A0, A0 + 1.2); gl2.material.opacity = 0.55 * L.prog(t, B0 + 0.4, B0 + 1.6);
      bk.userData.update(t); fw.update(t); mirror.userData.sync();
      // камера: слева -> whip вправо -> отъезд
      const tw = L.easeIO5(L.prog(t, B0 - 0.45, B0 + 0.1)), tp = L.easeIO(L.prog(t, C0 - 0.2, C0 + 1.6));
      const cx = L.lerp(BX + 0.6, TX - 0.6, tw) * (1 - tp), cz = L.lerp(20.5, 21.5, tw) + tp * 11, cy = L.lerp(5.4, 5.8, tw) + tp * 3.5;
      camera.position.set(cx + Math.sin(t * 0.45) * 0.9, cy + Math.sin(t * 0.3) * 0.3, cz);
      camera.lookAt(cx * 0.95, 7.7 + tp * 0.2, 0);
    },
    hud(ctx, t, T, P) {
      const A0 = P[0].t0, B0 = P[1].t0, C0 = P[2].t0;
      const n1 = Math.round(L.lerp(32, 48, L.easeOut(L.prog(t, A0 + 0.95, A0 + 1.9))));
      const n2 = Math.round(L.lerp(64, 104, L.easeOut(L.prog(t, B0 + 0.95, B0 + 2.1))));
      const a1 = L.easeOut(L.prog(t, A0 - 0.1, A0 + 0.35)) * (1 - L.prog(t, B0 - 0.45, B0 - 0.2));
      const a2 = L.easeOut(L.prog(t, B0 + 0.0, B0 + 0.4)) * (1 - L.prog(t, C0 - 0.3, C0 - 0.05));
      const pop = (k) => 1 + 0.18 * Math.exp(-k * 7);
      HUD.stat(ctx, {x: 640, y: 185, value: n1, label: 'КОМАНД', sub: 'раньше было 32', a: a1, size: 130 * (n1 === 48 ? pop(t - (A0 + 1.9)) : 1)});
      HUD.stat(ctx, {x: 640, y: 185, value: n2, label: 'МАТЧЕЙ', sub: 'раньше было 64', a: a2, size: 130 * (n2 === 104 ? pop(t - (B0 + 2.1)) : 1)});
      const a3 = L.easeOut(L.prog(t, C0 + 0.2, C0 + 0.7));
      if (a3 > 0) {
        HUD.stat(ctx, {x: 340, y: 200, value: 48, label: 'КОМАНД', a: a3, size: 100});
        HUD.stat(ctx, {x: 940, y: 200, value: 104, label: 'МАТЧЕЙ', a: a3, size: 100});
      }
    },
  };
  return obj;
}
