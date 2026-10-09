import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

export function buildFormat(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#081634', bottom: '#010308', glow: '#12508c', glowAmt: 0.35, fog: 0.006});
  scene.add(L.glossFloor({reflect: 0.35, radius: 120}));
  const key = new THREE.SpotLight(0xfff1de, 140, 120, 0.8, 0.8, 1.3); key.position.set(0, 26, 30); key.target.position.set(0, 5, 0); scene.add(key, key.target);
  const l1 = new THREE.PointLight(0x3d7bff, 60, 70, 1.5); l1.position.set(-20, 8, 10); const l2 = new THREE.PointLight(0xffa13d, 50, 70, 1.5); l2.position.set(20, 8, 10); scene.add(l1, l2);

  const goldM = new THREE.MeshPhysicalMaterial({color: 0xffc233, metalness: 1, roughness: 0.18, envMapIntensity: 1.6, emissive: 0xff9a00, emissiveIntensity: 0.1});
  const cardMat = new THREE.MeshPhysicalMaterial({color: 0x142a52, metalness: 0.55, roughness: 0.28, clearcoat: 1, envMapIntensity: 0.9});
  const edgeMat = new THREE.LineBasicMaterial({color: L.HDR(0x58a6ff, 1.8), transparent: true, opacity: 0.9});
  const cardGeo = new THREE.BoxGeometry(3.5, 2.55, 0.28), edgeGeo = new THREE.EdgesGeometry(cardGeo);
  const barGeo = new THREE.BoxGeometry(2.5, 0.27, 0.12);
  const rig = new THREE.Group(); scene.add(rig);
  const cards = [];
  for (let i = 0; i < 12; i++) {
    const c = i % 6, r = Math.floor(i / 6);
    const g = new THREE.Group(); g.position.set((c - 2.5) * 4.0, 7.4 - r * 3.3, 0); rig.add(g);
    const box = new THREE.Mesh(cardGeo, cardMat); box.castShadow = true; g.add(box); g.add(new THREE.LineSegments(edgeGeo, edgeMat));
    const letter = L.textLetters(String.fromCharCode(65 + i), {size: 0.8, depth: 0.14, mat: goldM}); letter.position.set(-1.38, 0.88, 0.2); g.add(letter);
    const bars = [];
    for (let b = 0; b < 4; b++) {
      const m = new THREE.MeshStandardMaterial({color: 0x7b8fb8, roughness: 0.4, metalness: 0.2, emissive: 0x000000, emissiveIntensity: 0});
      const bar = new THREE.Mesh(barGeo, m); bar.position.set(0, 0.28 - b * 0.46, 0.2); g.add(bar); bars.push(bar);
    }
    cards.push({g, box, bars, letter, i});
  }
  // 32 узла-«команды»
  const nodeGeo = new THREE.SphereGeometry(0.26, 20, 14);
  const nodes = [];
  const qual = [];  // какие бары проходят: [карточка, бар]
  for (let i = 0; i < 12; i++) { qual.push([i, 0], [i, 1]); }
  for (let i = 0; i < 8; i++) qual.push([i, 2]);
  const colorOf = (q) => q[1] < 2 ? 0x22e07a : 0xffc233;
  qual.forEach((q, j) => {
    const m = new THREE.MeshStandardMaterial({color: 0x222222, emissive: colorOf(q), emissiveIntensity: 2.2, roughness: 0.3});
    const n = new THREE.Mesh(nodeGeo, m); n.visible = false; scene.add(n); nodes.push({n, m, q, j, from: new THREE.Vector3()});
  });
  // сетка плей-офф: слева 16 → 8 → 4 → 2 → 1, справа зеркально
  const xs = [11.6, 8.8, 6.0, 3.2, 1.0];
  const pos = (side, round, idx) => { const cnt = 16 >> round, step = 0.78 * (1 << round); return new THREE.Vector3(side * xs[round], 5.6 + ((cnt - 1) / 2 - idx) * step, 0); };
  const slot = []; // для каждого узла 0..31 позиция в R32
  for (let j = 0; j < 32; j++) slot.push(pos(j < 16 ? -1 : 1, 0, j % 16));
  // соединители
  const lineMat = new THREE.MeshBasicMaterial({color: L.HDR(0x58c6ff, 1.8), transparent: true, opacity: 0.9});
  const links = [];
  const seg = (a, b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), lineMat); const d = b.clone().sub(a), len = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.x = len; m.rotation.z = Math.atan2(d.y, d.x); m.visible = false; scene.add(m); return m; };
  for (const side of [-1, 1]) for (let r = 0; r < 4; r++) for (let k = 0; k < (16 >> (r + 1)); k++) {
    const a = pos(side, r, 2 * k), b = pos(side, r, 2 * k + 1), w = pos(side, r + 1, k);
    const mid = side * (xs[r] + xs[r + 1]) / 2;
    const parts = [seg(a, new THREE.Vector3(mid, a.y, 0)), seg(b, new THREE.Vector3(mid, b.y, 0)), seg(new THREE.Vector3(mid, a.y, 0), new THREE.Vector3(mid, b.y, 0)), seg(new THREE.Vector3(mid, w.y, 0), w)];
    links.push({parts, r, side});
  }
  const finalBall = L.makeBall(1.0); finalBall.position.set(0, 5.6, 0); finalBall.visible = false; scene.add(finalBall);
  const glow = L.glowSprite(L.HDR(0xffc233, 1.6), 14, 0); glow.position.set(0, 5.6, -1); scene.add(glow);
  const mirror = L.makeMirror(rig); scene.add(mirror);
  const fw = new L.Fireworks(4, 70, 3); scene.add(fw.points);
  const bk = L.bokeh(180, {box: [70, 20, 40], center: [0, 0, -6], size: 0.5, colors: ['#8fb8ff', '#ffe08a', '#ffffff']}); scene.add(bk);
  let init = false;
  const RED = new THREE.Color(0xff3344), GRN = new THREE.Color(0x22e07a), GLD = new THREE.Color(0xffc233);
  const tmp = new THREE.Vector3(), wp = new THREE.Vector3();

  const obj = {scene, camera, bloom: 0.8,
    update(t, T, P) {
      const A = P[0].t0, B = P[1].t0, C = P[2].t0, D = P[3].t0;
      const rt = k => D + 0.9 + k * 0.62;               // моменты раундов
      if (!init) { fw.add(rt(4) + 0.3, [0, 8, 0], 0xffc233, 11, 2.4); fw.add(rt(4) + 0.6, [-6, 7, 0], 0xffffff, 9, 2); fw.add(rt(4) + 0.8, [6, 7, 0], 0xffc233, 9, 2); init = true; }
      // карточки: переворот
      cards.forEach(cd => {
        const st = A + cd.i * 0.09, a = L.prog(t, st, st + 0.65), e = L.easeBack(a);
        const drop = L.easeIn(L.prog(t, D - 0.1 + cd.i * 0.035, D + 0.8 + cd.i * 0.035));
        cd.g.visible = a > 0 && drop < 1;
        cd.g.rotation.y = (1 - L.easeOut5(a)) * Math.PI * 0.55; cd.g.scale.setScalar(Math.max(0.001, e) * (1 - drop * 0.4));
        cd.g.position.y = (7.4 - Math.floor(cd.i / 6) * 3.3) - drop * 9; cd.g.position.z = -drop * 6; cd.g.rotation.x = drop * 0.9;
        cd.letter.children.forEach(h => { h.rotation.y = Math.sin(t * 1.2 + cd.i) * 0.15; });
        cd.bars.forEach((bar, b) => {
          const m = bar.material; let em = 0, c = null, z = 0.2;
          if (b < 2) { const s = L.prog(t, B + 0.1 + cd.i * 0.075 + b * 0.05, B + 0.5 + cd.i * 0.075 + b * 0.05); if (s > 0) { em = 0.85 * L.easeOut(s); c = GRN; z = 0.2 + 0.28 * L.easeOut(s); } }
          if (b === 2) { const s = L.prog(t, C + 0.05 + cd.i * 0.11, C + 0.5 + cd.i * 0.11); if (s > 0) { if (cd.i < 8) { em = 0.9 * L.easeOut(s); c = GLD; z = 0.2 + 0.28 * L.easeOut(s); } else { em = 0.0; c = null; m.color.setHex(0x3a3f55); } } }
          m.emissive.copy(c || new THREE.Color(0x000000)); m.emissiveIntensity = em; bar.position.z = z;
          bar.scale.x = 1 + (c ? 0.0 : 0);
        });
      });
      // узлы летят в сетку, дальше проходят раунды: проигравший краснеет, победитель едет дальше
      nodes.forEach((nd, k) => {
        const st = D + 0.1 + k * 0.022, a = L.prog(t, st, st + 0.75);
        nd.n.visible = a > 0;
        if (a <= 0) return;
        if (nd.from.lengthSq() === 0) nd.from.set((nd.q[0] % 6 - 2.5) * 4.0, 7.4 - Math.floor(nd.q[0] / 6) * 3.3 + 0.28 - nd.q[1] * 0.46, 0.4);
        const side = k < 16 ? -1 : 1, p = k % 16;
        let lr = 4; for (let r = 0; r < 4; r++) if (((p >> r) & 1) === 1) { lr = r; break; }
        let cur = 0; for (let r = 0; r < lr; r++) if (t >= rt(r)) cur = r + 1;
        if (cur === 0) {
          tmp.copy(nd.from).lerp(slot[k], L.easeIO(a)); tmp.z += Math.sin(a * Math.PI) * 5; tmp.y += Math.sin(a * Math.PI) * 2;
        } else {
          const u = L.easeIO(L.prog(t, rt(cur - 1), rt(cur - 1) + 0.4));
          tmp.copy(pos(side, cur - 1, p >> (cur - 1))).lerp(pos(side, cur, p >> cur), u);
        }
        nd.n.position.copy(tmp);
        let s = 1, col = nd.q[1] < 2 ? GRN : GLD, em = 2.2;
        if (lr < 4 && t > rt(lr)) { const lt = L.prog(t, rt(lr), rt(lr) + 0.3); s = 1 - 0.7 * lt; col = col.clone().lerp(RED, lt); em = L.lerp(2.2, 0.5, lt); }
        else if (cur > 0) { s = 1 + 0.18 * cur; col = col.clone().lerp(GLD, cur / 4); em = 2.2 + cur * 0.4; }
        nd.n.scale.setScalar(Math.max(0.001, s * L.easeBack(Math.min(1, a * 1.2))));
        nd.m.emissive.copy(col); nd.m.emissiveIntensity = em;
      });
      links.forEach(lk => {
        const u = L.prog(t, rt(lk.r) + 0.05, rt(lk.r) + 0.4);
        lk.parts.forEach((p, i) => { p.visible = u > 0; });
      });
      const fin = L.prog(t, rt(4) - 0.1, rt(4) + 0.5);
      finalBall.visible = fin > 0; finalBall.scale.setScalar(L.easeBack(fin)); finalBall.rotation.y = t * 3; finalBall.rotation.x = t;
      glow.material.opacity = 0.6 * fin;
      bk.userData.update(t); fw.update(t); mirror.userData.sync();
      const k = L.kf(t, [[0, [0, 6.0, 25], [0, 5.5, 0]], [B, [0, 5.8, 23.5], [0, 5.5, 0]], [D - 0.2, [0, 6, 25], [0, 5.6, 0]], [D + 1.2, [0, 6.2, 23.5], [0, 5.6, 0]], [T, [0, 6.2, 22], [0, 5.6, 0]]]);
      camera.position.set(k.pos[0] + Math.sin(t * 0.5) * 0.7, k.pos[1], k.pos[2]); camera.lookAt(...k.look);
    },
    hud(ctx, t, T, P) {
      const A = P[0].t0, B = P[1].t0, C = P[2].t0, D = P[3].t0;
      const row = (txt, a, y, col = '#fff', size = 46) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = L.clamp(a); ctx.textAlign = 'center'; ctx.font = HUD.fo(size); ctx.fillStyle = col; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 12; ctx.fillText(txt, 640, y + (1 - L.clamp(a)) * 14); ctx.restore(); };
      row('12 ГРУПП × 4 КОМАНДЫ = 48', L.easeOut(L.prog(t, A + 0.5, A + 0.9)) * (1 - L.prog(t, B - 0.1, B + 0.1)), 140, '#ffffff');
      row('2 ЛУЧШИЕ ИЗ ГРУППЫ  =  24', L.easeOut(L.prog(t, B + 0.2, B + 0.6)) * (1 - L.prog(t, C - 0.1, C + 0.1)), 140, '#22e07a');
      row('24  +  8 ЛУЧШИХ ИЗ ТРЕТЬИХ  =  32', L.easeOut(L.prog(t, C + 0.2, C + 0.6)) * (1 - L.prog(t, D + 0.1, D + 0.4)), 140, '#ffc233');
      const aD = L.easeOut(L.prog(t, D + 0.5, D + 1.0));
      if (aD > 0) {
        row('ПЛЕЙ-ОФФ', aD, 150, '#ffffff', 64);
        const lose = L.prog(t, D + 1.6, D + 2.0);
        if (lose > 0) { ctx.save(); ctx.globalAlpha = lose; ctx.textAlign = 'center'; ctx.font = HUD.fm(26); ctx.letterSpacing = '6px'; ctx.fillStyle = '#ff4d5e'; ctx.fillText('ПРОИГРАЛ — ВЫЛЕТЕЛ', 640, 215); ctx.restore(); }
      }
    },
  };
  return obj;
}
