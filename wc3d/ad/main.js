import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as L from '../lib.js';
import {makeShirt} from './shirt.js';

const W = 720, H = 1280;
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('gl'), antialias: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const FX = {
  uniforms: {tDiffuse: {value: null}, blur: {value: 0}, aberr: {value: 0}, flash: {value: 0}, fade: {value: 1}, time: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float blur,aberr,flash,fade,time; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){ vec2 uv=vUv; vec2 c=uv-0.5; float rad=length(c); vec2 ab=c*aberr*(0.4+rad); vec3 col=vec3(0.); float ws=0.;
    for(int i=0;i<9;i++){ float f=(float(i)/8.-0.5); vec2 u=uv+c*blur*f*1.6+vec2(blur*0.3*f,0.); float w=1.-abs(f)*1.1; col+=vec3(texture2D(tDiffuse,u+ab).r,texture2D(tDiffuse,u).g,texture2D(tDiffuse,u-ab).b)*w; ws+=w; }
    col/=ws; col*=1.-0.32*pow(rad*1.4,2.2); col+=(h(floor(uv*vec2(720.,1280.)/1.7)+floor(time*24.))-0.5)*0.028; col+=flash*vec3(1.,0.96,0.9); col*=fade; gl_FragColor=vec4(col,1.); }`,
};

const PAL = [
  {n: 'white', c: 0xf2eee6}, {n: 'black', c: 0x1d1d20}, {n: 'gray', c: 0x8d9096}, {n: 'navy', c: 0x203154},
  {n: 'beige', c: 0xd7c2a2}, {n: 'olive', c: 0x66723f}, {n: 'terra', c: 0xc2603e},
];
const HEX = c => '#' + c.toString(16).padStart(6, '0');

async function init() {
  await Promise.all([L.loadFonts(), document.fonts.load('800 20px HudM', 'Ёё2026АаZz'), document.fonts.load('700 20px HudO', 'Ёё2026АаZz')]);
  const TL = await (await fetch('/ad/audio/timeline.json')).json(); const PH = TL.phrases, T_END = TL.total; const P = i => PH[i].t0, PE = i => PH[i].t1;
  const scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.75;
  scene.background = new THREE.Color(0x1b1713);
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfae, 1.0));
  const key = new THREE.DirectionalLight(0xfff3e2, 2.4); key.position.set(2.5, 4.5, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 30; key.shadow.bias = -0.0004; key.shadow.radius = 6; key.shadow.normalBias = 0.02; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb9d3ff, 1.2); rim.position.set(-4, 2.5, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({opacity: 0.22})); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.45; floor.receiveShadow = true; scene.add(floor);

  const hero = makeShirt(PAL[0].c, true); scene.add(hero);
  // стена: 7 цветов × 3 штуки
  const wall = new THREE.Group(); scene.add(wall); const wallShirts = [];
  PAL.forEach((p, r) => { for (let c = 0; c < 3; c++) { const s = makeShirt(p.c); s.scale.setScalar(0.82); wall.add(s); wallShirts.push({s, r, c}); } });
  // дождь футболок для финала
  const rain = []; const R = L.rnd(9);
  for (let i = 0; i < 10; i++) { const s = makeShirt(PAL[i % 7].c); s.scale.setScalar(0.34 + R() * 0.14); scene.add(s); rain.push({s, x: (R() - 0.5) * 3.0, z: (R() - 0.5) * 1.2 + 0.4, r: [R() * 6, R() * 6, R() * 6], d: R() * 0.5, v: R()}); }
  const bk = L.bokeh(60, {box: [8, 7, 4], center: [0, -3, -2], size: 0.07, colors: ['#ffffff', '#ffe9c4'], speed: 0.12, opacity: 0.5}); scene.add(bk);

  // ---- 3D-текст «БАЗОВАЯ ФУТБОЛКА» за футболкой ----
  const ink = new THREE.MeshStandardMaterial({color: 0x17130f, roughness: 0.5, metalness: 0.1});
  const t1 = L.textLetters('БАЗОВАЯ', {size: 0.95, depth: 0.4, mat: ink, spacing: 0.04}); t1.position.set(0, 1.55, -1.6); scene.add(t1);
  const t2 = L.textLetters('ФУТБОЛКА', {size: 0.95, depth: 0.4, mat: ink, spacing: 0.04}); t2.position.set(0, -1.15, -1.6); scene.add(t2);
  [t1, t2].forEach(g => g.userData.letters.forEach(h => { h.userData.by = h.position.y; }));

  // ---- расписание цветов фона / футболки ----
  const BGC = {dark: 0x1b1713, sand: 0xe5d3b8, coral: 0xf0735a, sage: 0xa9bf9d, blush: 0xf3cbc2, sun: 0xf0c04f, sky: 0x9cc7e6, steel: 0xb8c4d0, cream: 0xf1e6d0, plum: 0x3a2447, teal: 0x1f4a47, mustard: 0xe0ab3a, navyBg: 0x182744, ruby: 0xb03a48};
  const tc = new THREE.Color(), tmpc = new THREE.Color();
  const wordT = (ph, frac0, frac1) => PH[ph].t0 + (PH[ph].t1 - PH[ph].t0) * frac0 + 0;
  const SEG = [
    {t: 0, bg: 'dark', col: 0}, {t: P(1) - 0.05, bg: 'sand', col: 0},
    {t: P(2) - 0.05, bg: 'sage', col: 2}, {t: wordT(2, 0.34), bg: 'blush', col: 4}, {t: wordT(2, 0.62), bg: 'sun', col: 3},
    {t: P(3) - 0.05, bg: 'cream', col: 0}, {t: wordT(3, 0.2), bg: 'mustard', col: 1}, {t: wordT(3, 0.37), bg: 'steel', col: 2},
    {t: wordT(3, 0.55), bg: 'sky', col: 3}, {t: wordT(3, 0.64), bg: 'sage', col: 4}, {t: wordT(3, 0.73), bg: 'blush', col: 5}, {t: wordT(3, 0.82), bg: 'sand', col: 6},
    {t: PE(3) - 0.3, bg: 'cream', col: 1},
    {t: P(4) - 0.05, bg: 'cream', col: 3},
    {t: P(5) - 0.05, bg: 'steel', col: 3}, {t: wordT(5, 0.26), bg: 'sun', col: 5}, {t: wordT(5, 0.52), bg: 'sky', col: 0}, {t: wordT(5, 0.76), bg: 'plum', col: 1},
    {t: P(6) - 0.05, bg: 'coral', col: 0},
  ];
  const segAt = t => { let k = 0; SEG.forEach((s, i) => { if (t >= s.t) k = i; }); return k; };
  const wallT0 = wordT(3, 0.83) + 0.05, wallT1 = P(4) - 0.1;

  // ---- композер ----
  const rt = new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType, samples: 4}); const composer = new EffectComposer(renderer, rt);
  const rp = new RenderPass(scene, camera); const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.12, 0.5, 0.95); const fxp = new ShaderPass(FX);
  composer.addPass(rp); composer.addPass(bloom); composer.addPass(fxp); composer.addPass(new OutputPass());
  const out = document.getElementById('out'), octx = out.getContext('2d'), glc = document.getElementById('gl');

  // ---- HUD ----
  const fm = s => `800 ${s}px HudM, sans-serif`, fo = s => `700 ${s}px HudO, sans-serif`;
  const chunksCache = PH.map(p => { const toks = []; p.caption.split(/(\*\*[^*]+\*\*)/).forEach(seg => { if (!seg) return; const emph = seg.startsWith('**'); seg.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).forEach(w => toks.push({w, emph})); });
    const chunks = []; let cur = []; toks.forEach(tk => { const mixed = cur.length && cur[0].emph !== tk.emph; const len = cur.map(c => c.w).join(' ').length + tk.w.length; if (cur.length && (mixed || cur.length >= 3 || len > 20)) { chunks.push(cur); cur = []; } cur.push(tk); }); if (cur.length) chunks.push(cur);
    const wts = chunks.map(c => c.map(x => x.w).join(' ').length + 3), tot = wts.reduce((a, b) => a + b, 0); let acc = 0; return chunks.map((c, i) => { const t0 = p.t0 + (acc / tot) * (p.t1 - p.t0); acc += wts[i]; return {c, t0, emph: c.some(x => x.emph)}; }); });
  function drawCaption(ctx, t) {
    for (let pi = 0; pi < PH.length; pi++) {
      const chs = chunksCache[pi], p = PH[pi]; if (t < p.t0 - 0.05 || t > p.t1 + 0.3) continue; let ci = -1; chs.forEach((c, i) => { if (t >= c.t0 - 0.02) ci = i; }); if (ci < 0) continue;
      const ch = chs[ci], k = L.easeBack(L.prog(t, ch.t0, ch.t0 + 0.14)), fade = 1 - L.prog(t, p.t1 + 0.08, p.t1 + 0.3), text = ch.c.map(x => x.w).join(' '), isE = ch.emph, str = isE ? text.toUpperCase() : text;
      let size = isE ? 100 : 58; ctx.save(); ctx.font = isE ? fo(size) : fm(size); while (ctx.measureText(str).width > 640 && size > 30) { size -= 4; ctx.font = isE ? fo(size) : fm(size); }
      ctx.globalAlpha = fade * Math.min(1, k * 1.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.translate(360, 1060); const s2 = 0.82 + 0.18 * k; ctx.scale(s2, s2);
      ctx.lineJoin = 'round'; ctx.lineWidth = isE ? 12 : 9; ctx.strokeStyle = 'rgba(18,12,8,0.92)'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; ctx.strokeText(str, 0, 0);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.fillStyle = isE ? '#ffe9a8' : '#ffffff'; ctx.fillText(str, 0, 0); ctx.restore();
    }
  }
  const wordsP5 = ['РАБОТА', 'ПРОГУЛКА', 'СПОРТ', 'ВЕЧЕР'];
  const dark = n => ['dark', 'plum', 'teal', 'navyBg', 'ruby'].includes(n);

  window.TOTAL = T_END; window.NFRAMES = Math.ceil(T_END * 30);
  const heroPos = new THREE.Vector3(), heroRot = new THREE.Euler();
  const cuts = SEG.slice(1).map(s => s.t);

  window.renderFrame = (t, jpeg = true) => {
    // --- фон и цвет героя
    const si = segAt(t), seg = SEG[si], prev = SEG[Math.max(0, si - 1)], k = si === 0 ? 1 : L.easeOut(L.prog(t, seg.t, seg.t + 0.1));
    tc.setHex(BGC[prev.bg]).lerp(tmpc.setHex(BGC[seg.bg]), k); scene.background.copy(tc);
    hero.userData.setColor(new THREE.Color(PAL[prev.col].c).lerp(new THREE.Color(PAL[seg.col].c), k));
    // --- герой: траектория
    let px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sc2 = 1, amp = 1;
    if (t < P(1) - 0.05) { const u = L.prog(t, 0.15, 1.5), e = L.easeOut5(u); py = (1 - e) * 5.5 + Math.sin(t * 2) * 0.05 * u; ry = (1 - e) * 2.6 + t * 0.35; rx = (1 - e) * 0.5; rz = (1 - e) * -0.35; amp = 1.6 - 0.8 * e; }
    else if (t < P(2) - 0.05) { const u = t - P(1); py = 0.1 + Math.sin(t * 2.2) * 0.04; ry = Math.sin(u * 3) * 0.4 + 0.1; sc2 = 0.78 + 0.14 * L.easeBack(L.prog(u, 0, 0.3)); amp = 1.1; }
    else if (t < P(3) - 0.05) { const u = t - P(2); ry = u * 4.2; py = 0.05 + Math.sin(u * 5) * 0.08; rz = Math.sin(u * 4) * 0.12; sc2 = 0.9 + 0.1 * Math.sin(u * 6); }
    else if (t < wallT0) { const u = t - P(3); ry = Math.sin(u * 4) * 0.45; py = 0.0 + Math.sin(u * 3) * 0.05; rz = Math.sin(u * 5) * 0.1; sc2 = 1 + 0.06 * Math.sin(u * 14); }
    else if (t < wallT1) { sc2 = 0.001; }
    else if (t < P(5) - 0.05) { const u = t - P(4); ry = Math.PI * L.easeIO(L.prog(u, 0.2, 2.4)) + 0.3; py = Math.sin(u * 1.6) * 0.04; sc2 = 1.05; amp = 0.7; }
    else if (t < P(6) - 0.05) { const u = t - P(5); const sg = Math.max(0, Math.floor(u / 0.8)); ry = [0.5, -0.6, 0.9, -0.3][Math.min(3, sg)] + (u % 0.8) * 0.5; py = 0.05; rz = Math.sin(u * 3) * 0.08; sc2 = 0.95 + 0.05 * Math.sin(u * 8); rx = -0.05; }
    else { const u = t - P(6); const e = L.easeBack(L.prog(u, 0.0, 0.5)); sc2 = 0.75 * e + 0.001; py = 0.1 + Math.sin(u * 2.4) * 0.05; ry = Math.sin(u * 1.5) * 0.35; }
    hero.position.set(px, py, pz); hero.rotation.set(rx, ry, rz); hero.scale.setScalar(Math.max(0.001, sc2)); hero.userData.animate(t, amp);
    hero.visible = sc2 > 0.002;
    // --- стена
    const wk = L.prog(t, wallT0, wallT0 + 0.5), wOut = 1 - L.prog(t, wallT1 - 0.15, wallT1);
    wall.visible = wk > 0 && wOut > 0;
    wallShirts.forEach(({s, r, c}) => { const a = L.easeBack(L.prog(t, wallT0 + (r * 3 + c) * 0.018, wallT0 + 0.35 + (r * 3 + c) * 0.018)) * wOut; s.position.set((c - 1) * 1.75, (3 - r) * 1.78, -2 + Math.sin(t * 2 + r) * 0.1); s.rotation.set(0, Math.sin(t * 1.8 + r * 0.8 + c) * 0.3, Math.sin(t * 2.1 + c) * 0.05); s.scale.setScalar(Math.max(0.001, 0.82 * a)); });
    // --- 3D-слова (P1)
    const w1 = P(1) - 0.05, wv = t >= w1 && t < P(2) - 0.05;
    [t1, t2].forEach((g, gi) => { g.visible = wv; g.userData.letters.forEach((h, i) => { const kk = L.prog(t, w1 + gi * 0.12 + i * 0.035, w1 + 0.4 + gi * 0.12 + i * 0.035), e = L.easeOut5(kk); h.position.y = h.userData.by + (1 - e) * (gi ? -3 : 3); h.scale.setScalar(Math.max(0.001, e)); h.rotation.z = (1 - e) * (gi ? 0.6 : -0.6); }); });
    // --- дождь футболок (финал)
    rain.forEach(r => { const u = t - P(6) - 0.15 - r.d; r.s.visible = u > 0; const g = 9.8, y = 6 - 0.5 * g * u * u; const floorY = -1.35 + r.v * 0.15; const hit = y <= floorY; const bounce = hit ? Math.abs(Math.sin((u - Math.sqrt(2 * (6 - floorY) / g)) * 5)) * 0.35 * Math.exp(-(u - Math.sqrt(2 * (6 - floorY) / g)) * 2.2) : 0; r.s.position.set(r.x, hit ? floorY + bounce : y, r.z); r.s.rotation.set(0.25 * Math.sin(r.r[0] + u * 1.5), 0.6 * Math.sin(r.r[1] + u * 1.2), 0.5 * Math.sin(r.r[2] + u * 1.4) * (hit ? 0.3 : 1)); });
    bk.userData.update(t);
    // --- камера
    let cp = [0, 0.15, 5.0], cl = [0, 0, 0], fov = 34;
    if (t < P(1) - 0.05) { cp = [0.1 * Math.sin(t), 0.25, 5.4 - 0.4 * L.prog(t, 0, 3)]; }
    else if (t < P(2) - 0.05) { const u = L.prog(t, P(1), P(2)); cp = [0.4 - u * 0.4, 0.1, 5.2 - u * 0.5]; fov = 36; }
    else if (t < P(3) - 0.05) { const u = t - P(2); const sg = Math.min(2, Math.max(0, Math.floor(u / 0.65))); const a = [[-1.3, 0.4, 4.4], [1.4, -0.3, 4.2], [0.0, 0.0, 3.5]][sg]; cp = a; fov = 34; }
    else if (t < wallT0) { const u = L.prog(t, P(3), wallT0); cp = [0, 0.1, 4.4 - u * 0.5]; }
    else if (t < wallT1) { const u = L.prog(t, wallT0, wallT1); cp = [0, 0.4 - u * 0.6, 22 - u * 4]; cl = [0, 0.2 - u * 0.4, 0]; fov = 36; }
    else if (t < P(5) - 0.05) { const u = t - P(4); const a = -0.55 + u * 0.5; cp = [Math.sin(a) * 4.4, 0.45 - u * 0.1, Math.cos(a) * 4.4]; cl = [0, 0.1, 0]; fov = 30; }
    else if (t < P(6) - 0.05) { const u = t - P(5), sg = Math.min(3, Math.max(0, Math.floor(u / 0.8))); cp = [[0.8, 0.2, 4.4], [-0.9, -0.1, 4.2], [0.0, 0.5, 4.0], [0.6, -0.2, 3.9]][sg]; cp[2] += (u % 0.8) * -0.25; }
    else { const u = t - P(6); cp = [0, 0.5 + u * 0.12, 6.0 + u * 0.35]; cl = [0, -0.4, 0]; fov = 36; }
    camera.position.set(cp[0] + Math.sin(t * 7) * 0.006, cp[1] + Math.cos(t * 6) * 0.006, cp[2]); camera.lookAt(cl[0], cl[1], cl[2]); camera.fov = fov;
    const lc = cuts.reduce((m, c) => (t >= c ? Math.max(m, c) : m), -9), pulse = lc > -9 ? Math.exp(-(t - lc) * 14) : 0; camera.fov -= pulse * 3; camera.updateProjectionMatrix();
    key.target.position.set(0, 0, 0); floor.position.y = t > P(6) - 0.05 ? -1.45 : -1.45;
    const u2 = fxp.uniforms; u2.blur.value = pulse * 0.05; u2.aberr.value = 0.0015 + pulse * 0.008; u2.flash.value = pulse * 0.05; u2.time.value = t;
    u2.fade.value = L.prog(t, 0, 0.35) * (1 - L.prog(t, T_END - 1.0, T_END - 0.15));
    bloom.strength = 0.12;
    composer.render(); octx.drawImage(glc, 0, 0);
    // --- HUD
    const bgName = seg.bg, inkc = dark(bgName) ? '#fff6e6' : '#17130f';
    // крючок (P0)
    const a0 = L.easeOut(L.prog(t, 0.5, 0.9)) * (1 - L.prog(t, P(1) - 0.2, P(1) - 0.05));
    if (a0 > 0) { ['ОДНА ВЕЩЬ', 'БЕЗ КОТОРОЙ', 'НЕ ОБОЙТИСЬ'].forEach((s, i) => { const kk = L.easeBack(L.prog(t, 0.5 + i * 0.22, 0.95 + i * 0.22)); octx.save(); octx.globalAlpha = Math.min(1, kk * 1.4) * (1 - L.prog(t, P(1) - 0.2, P(1) - 0.05)); octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.translate(360, 170 + i * 116 + (1 - kk) * 30); let fs = 116; octx.font = fo(fs); while (octx.measureText(s).width > 640) { fs -= 4; octx.font = fo(fs); } octx.fillStyle = '#fff6e6'; octx.shadowColor = 'rgba(0,0,0,0.5)'; octx.shadowBlur = 18; octx.fillText(s, 0, 0); octx.restore(); }); }
    // аннотации (P4)
    const an = [{n: 'ВОРОТНИК', x: 0, y: 0.5, z: 0.1, dx: -170, dy: -90, t0: P(4) + 0.2}, {n: 'ЧИСТЫЙ КРОЙ', x: 0.5, y: -0.1, z: 0, dx: 150, dy: 10, t0: P(4) + 0.9}, {n: 'АККУРАТНЫЙ ПОДГИБ', x: -0.3, y: -0.7, z: 0.1, dx: -80, dy: 120, t0: P(4) + 1.6}];
    if (t > P(4) - 0.1 && t < P(5) - 0.05) an.forEach(a => { const kk = L.easeOut(L.prog(t, a.t0, a.t0 + 0.35)) * (1 - L.prog(t, P(5) - 0.25, P(5) - 0.05)); if (kk <= 0) return; const v = new THREE.Vector3(a.x, a.y, a.z).applyEuler(hero.rotation).multiplyScalar(hero.scale.x).add(hero.position); const p = v.clone().project(camera); const sx = (p.x * 0.5 + 0.5) * W, sy = (1 - (p.y * 0.5 + 0.5)) * H; const ex = Math.max(120, Math.min(W - 120, sx + a.dx)), ey = sy + a.dy;
      octx.save(); octx.globalAlpha = kk; octx.strokeStyle = '#17130f'; octx.fillStyle = '#17130f'; octx.lineWidth = 3; octx.beginPath(); octx.moveTo(sx, sy); octx.lineTo(sx + (ex - sx) * kk, sy + (ey - sy) * kk); octx.stroke(); octx.beginPath(); octx.arc(sx, sy, 9, 0, 7); octx.fill(); octx.strokeStyle = '#fff'; octx.lineWidth = 3; octx.beginPath(); octx.arc(sx, sy, 15 + 4 * Math.sin(t * 6), 0, 7); octx.stroke();
      octx.font = fm(26); const tw = octx.measureText(a.n).width + 34; octx.fillStyle = '#17130f'; L.prog; octx.beginPath(); octx.roundRect(ex - tw / 2, ey - 24, tw, 48, 24); octx.fill(); octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(a.n, ex, ey + 2); octx.restore(); });
    // слова контекста (P5)
    if (t >= P(5) - 0.05 && t < P(6) - 0.05) { const u = t - P(5), sg = Math.min(3, Math.max(0, Math.floor(u / 0.8))), uu = (u % 0.8); const kk = L.easeBack(L.prog(uu, 0, 0.22)); octx.save(); octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.translate(360, 250 - (1 - kk) * 40); octx.globalAlpha = Math.min(1, kk * 1.5) * (1 - L.prog(uu, 0.7, 0.8) * 0.0); let fs = 200; octx.font = fo(fs); while (octx.measureText(wordsP5[sg]).width > 650) { fs -= 6; octx.font = fo(fs); } octx.fillStyle = inkc; octx.fillText(wordsP5[sg], 0, 0); octx.restore(); }
    // финал: заголовок и кнопка (P6)
    if (t >= P(6) - 0.05) { const u = t - P(6); ['БАЗОВЫЕ', 'ФУТБОЛКИ'].forEach((s, i) => { const kk = L.easeBack(L.prog(u, 0.1 + i * 0.15, 0.6 + i * 0.15)); octx.save(); octx.globalAlpha = Math.min(1, kk * 1.4); octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.translate(360, 190 + i * 150 + (1 - kk) * 40); let fz = i ? 168 : 150; octx.font = fo(fz); while (octx.measureText(s).width > 650) { fz -= 6; octx.font = fo(fz); } octx.fillStyle = '#fff6e6'; octx.shadowColor = 'rgba(70,20,10,0.5)'; octx.shadowBlur = 22; octx.fillText(s, 0, 0); octx.restore(); });
      const bk2 = L.easeBack(L.prog(u, 0.9, 1.4)); if (bk2 > 0) { octx.save(); octx.translate(360, 1170); const pl = 1 + 0.04 * Math.sin(u * 7); octx.scale(bk2 * pl, bk2 * pl); octx.fillStyle = '#17130f'; octx.shadowColor = 'rgba(0,0,0,0.4)'; octx.shadowBlur = 24; octx.beginPath(); octx.roundRect(-250, -48, 500, 96, 48); octx.fill(); octx.shadowBlur = 0; octx.fillStyle = '#fff'; octx.font = fm(36); octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText('ЗАКАЗАТЬ СЕГОДНЯ', 0, 3); octx.restore(); } }
    if (!(t >= P(6) - 0.05 && t > P(6) + 0.9)) drawCaption(octx, t); else if (t < PE(6) + 0.3) drawCaption(octx, t);
    octx.fillStyle = `rgba(0,0,0,${1 - u2.fade.value})`; if (u2.fade.value < 1) octx.fillRect(0, 0, W, H);
    return jpeg ? out.toDataURL('image/jpeg', 0.94) : out.toDataURL('image/png');
  };
  window.ready = true;
}
init().catch(e => { console.error('INIT FAIL', e.stack || e); window.initError = String(e.stack || e); });
