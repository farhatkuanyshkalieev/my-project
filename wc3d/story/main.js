import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as L from '../lib.js';
import {makeFigure, poseWalk, poseCarry, poseIdle, poseSwim, poseReset, toon} from './figure.js';
import {buildTerrain, buildWater, buildSky, buildScenery, buildBridge, buildSack, Splash, Coins, terrainH, bridgeY, WATER_Y} from './world.js';

const W = 720, H = 1280;
const only = new URLSearchParams(location.search).get('t');
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('gl'), antialias: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const FX = {
  uniforms: {tDiffuse: {value: null}, blur: {value: 0}, aberr: {value: 0}, flash: {value: 0}, fade: {value: 1}, time: {value: 0}, shake: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float blur,aberr,flash,fade,time,shake; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vec2 uv=vUv; vec2 c=uv-0.5; float rad=length(c);
    vec2 ab=c*aberr*(0.4+rad);
    vec3 col=vec3(0.); float ws=0.;
    for(int i=0;i<9;i++){ float f=(float(i)/8.-0.5); vec2 u=uv+c*blur*f*1.6+vec2(blur*0.25*f,0.); float w=1.-abs(f)*1.1; col+=vec3(texture2D(tDiffuse,u+ab).r,texture2D(tDiffuse,u).g,texture2D(tDiffuse,u-ab).b)*w; ws+=w; }
    col/=ws;
    float lum=dot(col,vec3(0.299,0.587,0.114));
    col=mix(vec3(lum),col,1.08);
    col+=vec3(-0.010,0.004,0.020)*(1.-smoothstep(0.,0.5,lum))+vec3(0.025,0.012,-0.012)*smoothstep(0.35,1.3,lum);
    col*=1.-0.5*pow(rad*1.5,2.2);
    float g=h(floor(uv*vec2(720.,1280.)/1.6)+floor(time*24.));
    col+=(g-0.5)*0.04;
    col+=flash*vec3(1.,0.93,0.8);
    col*=fade; gl_FragColor=vec4(col,1.);
  }`,
};

async function init() {
  await Promise.all([L.loadFonts(), document.fonts.load('800 20px HudM', 'Ёё2026АаZz'), document.fonts.load('700 20px HudO', 'Ёё2026АаZz')]);
  const TL = await (await fetch('/story/audio/timeline.json')).json();
  const PH = TL.phrases, T_END = TL.total;
  const P = i => PH[i].t0, PE = i => PH[i].t1;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
  scene.fog = new THREE.FogExp2(0xeed3aa, 0.0042);
  const camera = new THREE.PerspectiveCamera(46, W / H, 0.05, 700);
  const sunDir = buildSky(scene);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0xc9985a, 0.8));
  const sun = new THREE.DirectionalLight(0xffdca8, 2.0); sun.position.copy(sunDir).multiplyScalar(60); sun.target.position.set(0, 0, -6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 5; sc.far = 140; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  scene.add(buildTerrain()); const water = buildWater(); scene.add(water); water.material.uniforms.sun.value.copy(sunDir); buildScenery(scene);
  const bridge = buildBridge(); scene.add(bridge.root);
  const splash = new Splash(); scene.add(splash.points); const coins = new Coins(); scene.add(coins.mesh);
  const dust = L.bokeh(160, {box: [50, 8, 60], center: [0, 0, -14], size: 0.1, colors: ['#ffe2a8', '#ffffff'], speed: 0.15, opacity: 0.7}); scene.add(dust);

  const youth = makeFigure({skin: 0xc58a62, shirt: 0x7f98c6, sleeve: 0x7f98c6, under: 0xf1efe8, pants: 0x20243a, shoes: 0x14141a, hair: 0x1b1210, longSleeve: true});
  const old = makeFigure({skin: 0xb27650, shirt: 0xc4573d, sleeve: 0xc4573d, pants: 0x1f7f7c, shoes: 0xe8e2d4, hat: 0xf2a54b, hatBand: 0x7a2d1f, beard: 0xece7dc, longSleeve: false});
  old.scale.setScalar(0.98); scene.add(youth, old);
  const sack = buildSack(); scene.add(sack);

  // ---- состояния героев ----
  const lerp = L.lerp, prog = L.prog, easeIO = L.easeIO;
  const xp = z => -1.2 * Math.sin(z * 0.08) * smooth(-8, -20, z);
  function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  const T_COL = P(7), T_REL = PE(10) + 0.5, T_HAUL = T_REL + 1.4, T_SIT = T_HAUL + 2.2, T_WALK = P(13) - 0.2;
  const waterY = WATER_Y - 1.65;
  const Y = {pos: new THREE.Vector3(), yaw: 0, pose: 'idle'};
  function youthState(t) {
    const s = Y;
    if (t < P(2) + 0.2) { const z = Math.min(-13.2, -29 + 1.65 * t); s.pos.set(xp(z), terrainH(xp(z), z), z); s.yaw = 0; s.pose = 'walkCarry'; s.ph = z * Math.PI / 0.85; s.amp = 0.7; }
    else if (t < P(5) - 0.4) { s.pos.set(xp(-13.2), terrainH(xp(-13.2), -13.2), -13.2); s.yaw = 0; s.pose = 'idleCarry'; }
    else if (t < T_COL) { const z = -13.2 + (t - (P(5) - 0.4)) * ((13.2 - 1.9) / (T_COL - (P(5) - 0.4))); const x0 = xp(-13.2) * (1 - smooth(-13.2, -9, z)); s.pos.set(x0, Math.max(terrainH(x0, z), bridgeY(z) + 0.065), z); s.yaw = 0; s.pose = 'walkCarry'; s.ph = z * Math.PI / 0.7; s.amp = 0.5; }
    else if (t < T_COL + 0.55) { const tau = t - T_COL, z = -1.9 - tau * 0.3; s.pos.set(0, Math.max(bridgeY(-1.9) + 0.065 - 4.9 * tau * tau, waterY + 0.9), z); s.yaw = 0.2; s.pose = 'fall'; s.fallT = tau; }
    else if (t < T_HAUL) { const k = prog(t, T_COL + 0.55, T_HAUL); const z = lerp(-2.2, -3.6, easeIO(prog(t, T_COL + 1, T_REL))); s.pos.set(Math.sin(t * 2.3) * 0.08 + 0.05, waterY + Math.sin(t * 3.1) * 0.07, z); s.yaw = Math.PI * 0.12; s.pose = 'swim'; }
    else if (t < T_SIT) { const u = easeIO(prog(t, T_HAUL, T_SIT - 0.3)); const z = lerp(-3.6, -6.1, u); s.pos.set(lerp(0.05, 0.9, u), lerp(waterY, terrainH(0.9, -6.1) + 0.0, u), z); s.yaw = lerp(Math.PI * 0.12, 0, u); s.pose = u < 0.9 ? 'swim' : 'sit'; }
    else if (t < T_WALK) { s.pos.set(0.9, terrainH(0.9, -6.1), -6.1); s.yaw = 0; s.pose = 'sit'; }
    else { const u = t - T_WALK, x = 0.9 + u * 1.5; s.pos.set(x, terrainH(x, -6.4), -6.4 - 0.0); s.yaw = Math.PI / 2; s.pose = 'walk'; s.ph = x * Math.PI / 0.8; s.amp = 0.8; }
    return s;
  }
  const O = {pos: new THREE.Vector3(), yaw: Math.PI, pose: 'idle'};
  function oldState(t) {
    const s = O;
    if (t < T_COL + 1.4) { s.pos.set(1.35, terrainH(1.35, -10.6), -10.6); s.yaw = Math.PI; s.pose = 'idle'; if (t > T_COL) { s.pose = 'alarm'; } }
    else if (t < P(9)) { s.pose = 'alarm'; s.pos.set(1.35, terrainH(1.35, -10.6), -10.6); s.yaw = Math.PI; }
    else if (t < P(9) + 0.75) { const u = (t - P(9)) / 0.75; const z = lerp(-10.6, -5.0, u); s.pos.set(lerp(1.35, 1.7, u), terrainH(1.5, z), z); s.yaw = 0; s.pose = 'run'; s.ph = t * 13; }
    else if (t < T_HAUL + 1.2) { s.pos.set(1.7, terrainH(1.7, -5.0) - 0.05, -5.0); s.yaw = 0; s.pose = 'kneel'; s.reach = easeIO(prog(t, P(9) + 0.7, P(9) + 1.1)); }
    else if (t < T_SIT) { s.pos.set(1.7, terrainH(1.7, -5.1), -5.1); s.yaw = 0; s.pose = 'kneel'; s.reach = 0; }
    else if (t < T_WALK) { s.pos.set(2.2, terrainH(2.2, -6.2), -6.2); s.yaw = -0.35; s.pose = 'sit'; }
    else { const u = t - T_WALK, x = 2.4 + u * 1.5; s.pos.set(x, terrainH(x, -6.0), -6.0); s.yaw = Math.PI / 2; s.pose = 'walk'; s.ph = x * Math.PI / 0.8 + 1; s.amp = 0.7; }
    return s;
  }
  function poseSit(f, t, hold) { poseReset(f); const J = f.userData.J; J.pelvis.position.y = 0.19; J.hipL.rotation.x = J.hipR.rotation.x = -1.75; J.knL.rotation.x = J.knR.rotation.x = 1.85; J.hipL.rotation.z = 0.15; J.hipR.rotation.z = -0.15; J.spine.rotation.x = 0.28; J.shL.rotation.x = J.shR.rotation.x = -0.8; J.elL.rotation.x = J.elR.rotation.x = -0.9; J.chest.rotation.x = Math.sin(t * (hold ? 4.6 : 1.6)) * (hold ? 0.06 : 0.015); J.head.rotation.x = 0.25; }
  function applyFigure(f, s, t, who) {
    f.position.copy(s.pos); f.rotation.set(0, s.yaw, 0); const J = f.userData.J;
    switch (s.pose) {
      case 'walk': poseWalk(f, s.ph, s.amp, 0.05); break;
      case 'walkCarry': poseWalk(f, s.ph, s.amp, 0.22, true); break;
      case 'idleCarry': poseIdle(f, t); poseCarry(f, 1); J.spine.rotation.x = 0.2; if (t > P(4) && t < PE(4) + 0.6) { J.head.rotation.y = Math.sin(t * 9) * 0.35 * (1 - prog(t, PE(4), PE(4) + 0.6)); J.shL.rotation.x = -1.2; J.elL.rotation.x = -1.3; } break;
      case 'fall': poseSwim(f, t * 2, 1.6); J.spine.rotation.x = 0.25 + s.fallT; break;
      case 'swim': poseSwim(f, t, 1); break;
      case 'sit': poseSit(f, t, t < T_SIT + 1.5 && who === 'y'); break;
      case 'idle': poseIdle(f, t);
        if (who === 'o') { const g = prog(t, P(3) - 0.1, P(3) + 0.5) * (1 - prog(t, PE(3) - 0.2, PE(3) + 0.3)); J.shR.rotation.set(-1.3 * g, 0, -0.1); J.elR.rotation.x = -0.5 * g - 0.15; J.spine.rotation.x = 0.1; J.head.rotation.x = 0.1; const nodG = prog(t, P(3), PE(3)); J.head.rotation.y = Math.sin(t * 2) * 0.1 * nodG; }
        break;
      case 'alarm': poseIdle(f, t); J.shL.rotation.set(-2.7, 0, 0.5); J.shR.rotation.set(-2.7, 0, -0.5); J.elL.rotation.x = -0.9; J.elR.rotation.x = -0.9; J.spine.rotation.x = -0.1; J.head.rotation.x = -0.2; break;
      case 'run': poseWalk(f, s.ph, 1.7, 0.3); break;
      case 'kneel': poseReset(f); J.pelvis.position.y = 0.55; J.hipL.rotation.x = -1.5; J.knL.rotation.x = 1.5; J.hipR.rotation.x = 0.3; J.knR.rotation.x = 1.9; J.spine.rotation.x = 0.45; J.shR.rotation.x = -(1.25 + 0.35 * (s.reach || 0)); J.shR.rotation.z = -0.05; J.elR.rotation.x = -0.15; J.shL.rotation.x = -0.6; J.elL.rotation.x = -0.7; J.head.rotation.x = 0.3; break;
    }
  }

  // ---- позиции для камеры ----
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const yw = (dx, dy, dz) => { const q = Y.pos.clone(); const c = Math.cos(Y.yaw), s = Math.sin(Y.yaw); return v3(q.x + dx * c + dz * s, q.y + dy, q.z - dx * s + dz * c); };
  const ow = (dx, dy, dz) => { const q = O.pos.clone(); const c = Math.cos(O.yaw), s = Math.sin(O.yaw); return v3(q.x + dx * c + dz * s, q.y + dy, q.z - dx * s + dz * c); };
  const A = (a) => a.toArray();

  const SHOTS = [
    {t: 0, fn: (t, u) => ({pos: v3(0.7 - u * 0.2, 0.7, -20.2 + u * 0.6), look: v3(Y.pos.x * 0.9, 1.15, Y.pos.z + 0.4), fov: 42 - u * 4})},
    {t: P(1) - 0.15, fn: (t, u) => { const a = 0.9 + u * 1.5; return {pos: yw(Math.sin(a) * 1.5, 0.55 + u * 0.25, Math.cos(a) * 1.5), look: yw(0.2, 1.55, 0), fov: 40}; }},
    {t: P(2) - 0.25, fn: (t, u) => ({pos: v3(5.8 - u * 1.4, 2.0 + u * 0.3, -5.6 + u * 0.2), look: v3(0.9 - u * 0.3, 1.1, -11.8), fov: 38})},
    {t: P(3) - 0.2, fn: (t, u) => ({pos: ow(-0.95 + u * 0.15, 0.55 + u * 0.1, 1.15 - u * 0.1), look: ow(0.05, 1.55, 0), fov: 36})},
    {t: P(4) - 0.2, fn: (t, u) => ({pos: yw(0.55, 1.55 + u * 0.05, 1.3 - u * 0.25), look: yw(-0.02, 1.58, 0), fov: 34 - u * 3})},
    {t: P(5) - 0.15, fn: (t, u) => ({pos: v3(0.35 + u * 0.1, 0.33, -10.2 + u * 0.4), look: yw(0, 0.7 + u * 0.3, 0.2), fov: 54})},
    {t: P(5) + 1.3, fn: (t, u) => ({pos: v3(-8.5 + u * 1.2, 1.5 + u * 0.4, -6.2), look: yw(0, 1.0, 0.8), fov: 38})},
    {t: P(6) - 0.05, fn: (t, u) => ({pos: v3(2.0 - u * 1.0 + Math.sin(t * 9) * 0.02 * u, 9.5 - u * 5.0, -8.0 + u * 2.5), look: yw(0, 0.4, 0), fov: 44})},
    {t: T_COL - 0.1, fn: (t, u) => ({pos: v3(-7.0 + u * 1.2, 1.35, -3.2), look: v3(0, 0.3 - u * 0.4, -2.0), fov: 40})},
    {t: T_COL + 0.9, fn: (t, u) => ({pos: v3(2.2 - u * 0.6, 0.15, -4.4), look: v3(0, -0.1 + u * 0.3, -2.3), fov: 46})},
    {t: P(8) - 0.15, fn: (t, u) => { const a = -0.9 + u * 0.9; return {pos: v3(Math.sin(a) * 2.8 + 0.1, -0.2 + u * 0.1, -3.0 + Math.cos(a) * 2.6 * -1), look: v3(Y.pos.x, -0.1, Y.pos.z), fov: 46 - u * 6}; }},
    {t: P(9) - 0.2, fn: (t, u) => ({pos: v3(3.6 - u * 0.4, 0.5, -8.6 + u * 0.8), look: ow(0, 0.75, 0.8), fov: 42 - u * 4})},
    {t: P(10) - 0.2, fn: (t, u) => { const h = v3(Y.pos.x + 0.25, -0.35, Y.pos.z + 0.2); return {pos: v3(h.x - 1.3 + u * 0.4, 0.2 + u * 0.1, h.z - 1.7 + u * 0.4), look: h, fov: 36 - u * 4}; }},
    {t: PE(10) + 0.3, fn: (t, u) => ({pos: v3(Y.pos.x - 0.7, 1.6 - u * 0.2, Y.pos.z - 2.4), look: v3(Y.pos.x + 0.3, -0.6, Y.pos.z + 0.2), fov: 38})},
    {t: T_HAUL - 0.2, fn: (t, u) => ({pos: v3(-5.2 + u * 1.5, 1.4, -8.4), look: v3(1.1, 0.5, -4.7), fov: 38})},
    {t: T_SIT - 0.1, fn: (t, u) => ({pos: yw(-0.6 - u * 0.2, 0.55, 1.0), look: yw(0, 0.75, 0), fov: 36})},
    {t: P(12) - 0.2, fn: (t, u) => ({pos: v3(0.2 + u * 0.8, 1.0 + u * 0.15, -1.1 + u * 0.6), look: v3(1.5, 1.1, -6.0), fov: 40 - u * 5})},
    {t: T_WALK + 0.4, fn: (t, u) => ({pos: v3(-1.5 + u * 5.0, 0.7 + u * 2.4, -12.8 + u * 1.5), look: v3(Y.pos.x + 3.2, 1.3 + u * 0.5, -6.2), fov: 42 + u * 4})},
  ];
  const SHOT_T = SHOTS.map(s => s.t);
  const cuts = SHOT_T.slice(1);

  // ---- композер ----
  const rt = new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType, samples: 4});
  const composer = new EffectComposer(renderer, rt);
  const rp = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.6, 0.88);
  const fxp = new ShaderPass(FX);
  composer.addPass(rp); composer.addPass(bloom); composer.addPass(fxp); composer.addPass(new OutputPass());
  const out = document.getElementById('out'), octx = out.getContext('2d'), glc = document.getElementById('gl');

  // ---- HUD: заголовок и субтитры по словам ----
  const fm = s => `800 ${s}px HudM, sans-serif`, fo = s => `700 ${s}px HudO, sans-serif`;
  const chunksCache = PH.map(p => {
    const toks = []; p.caption.split(/(\*\*[^*]+\*\*)/).forEach(seg => { if (!seg) return; const emph = seg.startsWith('**'); seg.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).forEach(w => toks.push({w, emph})); });
    const chunks = []; let cur = [];
    toks.forEach(tk => { const mixed = cur.length && cur[0].emph !== tk.emph; const len = cur.map(c => c.w).join(' ').length + tk.w.length; if (cur.length && (mixed || cur.length >= 3 || len > 22)) { chunks.push(cur); cur = []; } cur.push(tk); });
    if (cur.length) chunks.push(cur);
    const wts = chunks.map(c => c.map(x => x.w).join(' ').length + 3), tot = wts.reduce((a, b) => a + b, 0); let acc = 0;
    return chunks.map((c, i) => { const t0 = p.t0 + (acc / tot) * (p.t1 - p.t0); acc += wts[i]; return {c, t0, emph: c.some(x => x.emph)}; });
  });
  function drawCaption(ctx, t) {
    for (let pi = 0; pi < PH.length; pi++) {
      const chs = chunksCache[pi], p = PH[pi];
      if (t < p.t0 - 0.05 || t > p.t1 + 0.35) continue;
      let ci = -1; chs.forEach((c, i) => { if (t >= c.t0 - 0.02) ci = i; });
      if (ci < 0) continue; const ch = chs[ci], k = L.easeBack(L.prog(t, ch.t0, ch.t0 + 0.14)), fade = 1 - L.prog(t, p.t1 + 0.1, p.t1 + 0.35);
      const text = ch.c.map(x => x.w).join(' '); const isE = ch.emph, str = isE ? text.toUpperCase() : text;
      let size = isE ? 104 : 60; ctx.save(); ctx.font = isE ? fo(size) : fm(size);
      while (ctx.measureText(str).width > 640 && size > 30) { size -= 4; ctx.font = isE ? fo(size) : fm(size); }
      ctx.globalAlpha = fade * Math.min(1, k * 1.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.translate(360, 880); const sc2 = 0.82 + 0.18 * k; ctx.scale(sc2, sc2);
      ctx.shadowColor = 'rgba(20,8,0,0.85)'; ctx.shadowBlur = isE ? 22 : 16; ctx.shadowOffsetY = 4;
      if (isE) { const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#ffe2a0'); ctx.fillStyle = g; ctx.letterSpacing = '1px'; } else ctx.fillStyle = '#ffffff';
      ctx.fillText(str, 0, 0); ctx.restore();
    }
  }
  function drawHook(ctx, t) {
    const a = L.easeOut(L.prog(t, 0.15, 0.6)) * (1 - L.prog(t, 3.7, 4.1)); if (a <= 0) return;
    const lines = ['ЗОЛОТО ЧУТЬ НЕ', 'УТОПИЛО ЕГО'];
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((s, i) => {
      const k = L.easeBack(L.prog(t, 0.15 + i * 0.18, 0.7 + i * 0.18)); ctx.save(); ctx.globalAlpha = a * Math.min(1, k * 1.4); ctx.translate(360, 215 + i * 118 + (1 - k) * 30); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
      let fs = i ? 132 : 112; ctx.font = fo(fs); while (ctx.measureText(s).width > 620 && fs > 40) { fs -= 4; ctx.font = fo(fs); } ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 5;
      const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, '#fffdf2'); g.addColorStop(1, i ? '#ffd27a' : '#fff0c8'); ctx.fillStyle = g; ctx.fillText(s, 0, 0); ctx.restore();
    });
    ctx.restore();
  }
  function drawEnd(ctx, t) { }

  window.TOTAL = T_END; window.NFRAMES = Math.ceil(T_END * 30);
  const shake = (t, a) => v3(Math.sin(t * 13.1) * a, Math.cos(t * 11.3) * a, Math.sin(t * 9.7 + 1) * a);

  window.renderFrame = (t, jpeg = true) => {
    youthState(t); oldState(t); applyFigure(youth, Y, t, 'y'); applyFigure(old, O, t, 'o');
    youth.updateMatrixWorld(true); old.updateMatrixWorld(true);
    // мешок
    const J = youth.userData.J;
    if (t < T_COL + 0.55 || t < T_REL) {
      if (Y.pose === 'walkCarry' || Y.pose === 'idleCarry') { const p = new THREE.Vector3(); J.chest.localToWorld(p.set(0.22, 0.42, -0.2)); sack.position.copy(p); sack.rotation.set(0.1, Y.yaw, -0.25); }
      else if (Y.pose === 'fall') { const p = new THREE.Vector3(); J.chest.localToWorld(p.set(0.3, 0.1, 0.25)); sack.position.copy(p); sack.rotation.set(0, Y.yaw, 0.2 + Y.fallT); }
      else { sack.position.set(Y.pos.x + 0.3, WATER_Y - 0.55 - Math.min(0.6, (t - T_COL) * 0.05) + Math.sin(t * 3) * 0.04, Y.pos.z + 0.35); sack.rotation.set(0.3, 0, 0.5); }
    } else { const tau = t - T_REL + 0.5; const tt = Math.max(0, tau); sack.position.set(Y.pos.x + 0.3 + tt * 0.5, WATER_Y - 0.7 - tt * 0.9, Y.pos.z + 0.35 + tt * 0.2); sack.rotation.set(tt * 1.2, tt * 0.8, 0.5 + tt); const s = Math.max(0.01, 1 - tt * 0.18); sack.scale.setScalar(s); }
    if (t < T_REL - 0.5) sack.scale.setScalar(1);
    sack.userData.gold.emissiveIntensity = 1.1 + (t > T_REL - 0.5 ? 0.8 * Math.max(0, 1 - (t - T_REL) * 0.35) : 0);
    if (!splash.bursts.length) { splash.burst(T_COL + 0.38, [0.1, WATER_Y, -2.2], 1.4); splash.burst(T_COL + 0.45, [0.4, WATER_Y, -2.0], 0.9); coins.burst(T_COL + 0.4, [0.3, WATER_Y + 0.1, -2.1]); coins.burst(T_REL - 0.55, [Y.pos.x + 0.3, WATER_Y + 0.2, Y.pos.z + 0.35]); splash.burst(T_REL - 0.5, [Y.pos.x + 0.3, WATER_Y, Y.pos.z + 0.35], 0.6); splash.burst(T_HAUL + 1.0, [0.5, WATER_Y, -4.2], 0.8); }
    splash.update(t); coins.update(t);
    // мост
    const zY = Y.pose === 'walkCarry' && t > P(5) - 0.4 ? Y.pos.z : -1.9;
    bridge.units.forEach((b, i) => {
      const u = b.u;
      if (t < T_COL) {
        const load = (t > P(5) - 0.4 ? 1 : 0) * Math.exp(-(((b.z - zY) / 2.4) ** 2)), stress = prog(t, P(6), T_COL);
        u.position.y = b.base - load * (0.1 + 0.09 * stress) + Math.sin(t * 7 + i) * 0.012 * load * (1 + 2 * stress); u.rotation.set(Math.sin(t * 5 + i * 0.7) * 0.02 * load * (1 + 3 * stress), 0, Math.sin(t * 6.1 + i) * 0.018 * load * stress);
      } else {
        const tau = t - T_COL - Math.abs(b.z + 1.9) * 0.05;
        if (tau > 0) { const y = b.base - 0.5 * 9.8 * tau * tau; const sink = WATER_Y - 0.1; u.position.y = Math.max(y, sink - Math.max(0, tau - 0.55) * 0.5); u.position.x = Math.max(0, tau - 0.55) * 1.0; u.rotation.set(b.spin[0] * tau * 3, b.spin[1] * tau * 1.5, b.spin[2] * tau * 2); }
      }
    });
    water.material.uniforms.time.value = t;
    // камера
    let si = 0; for (let i = 0; i < SHOT_T.length; i++) if (t >= SHOT_T[i]) si = i;
    const shotT0 = SHOT_T[si], shotT1 = SHOT_T[si + 1] ?? T_END, u = L.clamp((t - shotT0) / (shotT1 - shotT0));
    const cam = SHOTS[si].fn(t, easeIO(u));
    camera.position.copy(cam.pos).add(shake(t, 0.012 + (t > P(6) && t < T_COL + 1.5 ? 0.025 * prog(t, P(6), T_COL) : 0)));
    { const gh = terrainH(camera.position.x, camera.position.z); if (camera.position.y < gh + 0.32) camera.position.y = gh + 0.32; }
    camera.lookAt(cam.look); camera.fov = cam.fov; const pulse = si > 0 ? Math.exp(-(t - shotT0) * 16) : 0; camera.fov -= pulse * 3; camera.updateProjectionMatrix();
    const u2 = fxp.uniforms; u2.blur.value = pulse * 0.05; u2.aberr.value = 0.003 + pulse * 0.012; u2.flash.value = pulse * 0.07 + Math.exp(-Math.abs(t - T_COL) * 12) * 0.25; u2.time.value = t;
    u2.fade.value = L.prog(t, 0, 0.5) * (1 - L.prog(t, T_END - 1.2, T_END - 0.2));
    bloom.strength = 0.5; dust.userData.update(t);
    composer.render();
    octx.drawImage(glc, 0, 0);
    drawHook(octx, t); drawCaption(octx, t);
    octx.fillStyle = `rgba(0,0,0,${1 - u2.fade.value})`; if (u2.fade.value < 1) octx.fillRect(0, 0, W, H);
    return jpeg ? out.toDataURL('image/jpeg', 0.94) : out.toDataURL('image/png');
  };
  window.ready = true;
}
init().catch(e => { console.error('INIT FAIL', e.stack || e); window.initError = String(e.stack || e); });
