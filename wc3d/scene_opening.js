import * as THREE from 'three';
import * as L from './lib.js';
import * as HUD from './hud.js';

const CROWD_FRAG = `
uniform float time; uniform vec2 grid; uniform float lit; varying vec2 vUv; varying float vH;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 cell=vec2(vUv.x*grid.x, vUv.y*grid.y); vec2 id=floor(cell); vec2 f=fract(cell);
  float r=h(id);
  float seat=smoothstep(0.52,0.36,max(abs(f.x-.5)*1.25,abs(f.y-.5)*1.7));
  vec3 pal[6]; pal[0]=vec3(0.0,0.55,0.28); pal[1]=vec3(0.85,0.12,0.14); pal[2]=vec3(0.9,0.9,0.95); pal[3]=vec3(0.06,0.1,0.2); pal[4]=vec3(1.0,0.72,0.1); pal[5]=vec3(0.15,0.35,0.85);
  int ci=int(floor(r*6.)); vec3 c=pal[0];
  for(int i=0;i<6;i++){ if(i==ci) c=pal[i]; }
  float wave=0.5+0.5*sin(vUv.x*6.2831*3.-time*2.4);
  float base=0.34+0.6*pow(wave,3.);
  float tw=0.8+0.2*sin(time*(2.+5.*h(id+3.))+r*40.);
  vec3 col=c*base*tw*lit;
  col=mix(vec3(0.02,0.03,0.06),col,seat);
  float fl=step(0.9972,h(id+floor(time*9.+h(id)*7.)));
  col+=vec3(5.,5.,4.5)*fl*seat;
  gl_FragColor=vec4(col,1.);
}`;

function ribbon(a, b, segs = 360) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const th = i / segs * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    pos.push(a[0] * c, a[2], a[1] * s, b[0] * c, b[2], b[1] * s); uv.push(i / segs, 0, i / segs, 1);
  }
  for (let i = 0; i < segs; i++) { const a0 = 2 * i, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3; idx.push(a0, b0, a1, b0, b1, a1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function pitchTexture() {
  const W = 2048, H = 1330, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? '#1f8a3e' : '#25a047'; x.fillRect(i * W / 14, 0, W / 14 + 1, H); }
  x.strokeStyle = '#fff'; x.lineWidth = 7; const m = 50;
  x.strokeRect(m, m, W - 2 * m, H - 2 * m); x.beginPath(); x.moveTo(W / 2, m); x.lineTo(W / 2, H - m); x.stroke();
  x.beginPath(); x.arc(W / 2, H / 2, 130, 0, 7); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, 9, 0, 7); x.fillStyle = '#fff'; x.fill();
  for (const s of [0, 1]) { const px = s ? W - m : m, dir = s ? -1 : 1; x.strokeRect(s ? W - m - 330 : m, H / 2 - 400, 330, 800); x.strokeRect(s ? W - m - 110 : m, H / 2 - 180, 110, 360); x.beginPath(); x.arc(px + dir * 220, H / 2, 130, s ? 2.2 : -0.93, s ? 4.08 : 0.93); x.stroke(); }
  const t = new THREE.CanvasTexture(x.canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildOpening(env, meta) {
  const {scene, camera} = L.baseScene(env, {top: '#050d22', bottom: '#010206', glow: '#173a6a', glowAmt: 0.3, fog: 0.0045, envInt: 0.25});
  // поле
  const pt = pitchTexture();
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(24, 15.6), new THREE.MeshStandardMaterial({map: pt, emissiveMap: pt, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.85, metalness: 0}));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
  const apron = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({color: 0x0a1a12, roughness: 0.9})); apron.rotation.x = -Math.PI / 2; apron.position.y = -0.05; scene.add(apron);
  // чаша
  const crowdMat = (gx, gy) => new THREE.ShaderMaterial({side: THREE.DoubleSide, uniforms: {time: {value: 0}, grid: {value: new THREE.Vector2(gx, gy)}, lit: {value: 1}},
    vertexShader: 'varying vec2 vUv; varying float vH; void main(){ vUv=uv; vH=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: CROWD_FRAG});
  const lowerM = crowdMat(1300, 30), upperM = crowdMat(1700, 34);
  scene.add(new THREE.Mesh(ribbon([17.5, 12.2, 0.3], [25, 19.5, 7.2]), lowerM));
  scene.add(new THREE.Mesh(ribbon([25.4, 20.0, 8.4], [33, 27.5, 17.5]), upperM));
  const wallMat = new THREE.MeshStandardMaterial({color: 0x10182a, roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide});
  scene.add(new THREE.Mesh(ribbon([25, 19.5, 7.2], [25.4, 20, 8.4], 200), wallMat));
  scene.add(new THREE.Mesh(ribbon([33, 27.5, 17.5], [35, 29.5, 0], 200), wallMat));
  scene.add(new THREE.Mesh(ribbon([17.5, 12.2, 0.3], [17.5, 12.2, -0.3], 200), wallMat));
  const ledMat = new THREE.MeshBasicMaterial({color: L.HDR(0xffc86a, 2.2), fog: false});
  const ellTube = (rx, rz, y, r, color, k) => {
    const pts = []; for (let i = 0; i < 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(rx * Math.cos(a), y, rz * Math.sin(a))); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, r, 6, true), new THREE.MeshBasicMaterial({color: L.HDR(color, k), fog: false})); scene.add(m); return m;
  };
  ellTube(33.2, 27.7, 17.7, 0.16, 0xffc86a, 1.8); ellTube(25.3, 19.9, 8.0, 0.1, 0x58c6ff, 1.8); ellTube(17.6, 12.3, 0.4, 0.07, 0xffffff, 1.4);
  // прожекторные мачты
  const towers = [[-37, -30], [37, -30], [-37, 30], [37, 30]].map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 30, 12), wallMat); mast.position.y = 15; g.add(mast);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), new THREE.MeshBasicMaterial({color: L.HDR(0xfff3d6, 5.5), side: THREE.DoubleSide, fog: false}));
    panel.position.y = 30.5; panel.lookAt(0, 6, 0); g.add(panel);
    const sp = new THREE.SpotLight(0xfff0d8, 0, 130, 0.42, 0.7, 1.2); sp.position.set(x, 30.5, z); sp.target.position.set(0, 0, 0); scene.add(sp, sp.target);
    const cone = L.lightCone(0xcfe0ff, 6.5, 70, 0.09); L.aimCone(cone, [x, 30.5, z], [0, 0, 0]); scene.add(cone);
    return {sp, cone};
  });
  // мяч и колонна света
  const ball = L.makeBall(1.3); ball.position.set(0, 4.2, 0); scene.add(ball);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 22, 40, 1, true), L.beamMaterial(0xffd27a, 1.0)); col.position.y = 11; col.geometry.translate(0, 0, 0); scene.add(col);
  col.material.side = THREE.DoubleSide;
  const gold = new THREE.MeshPhysicalMaterial({color: 0xffc233, metalness: 1, roughness: 0.16, envMapIntensity: 2.2, emissive: 0xff9a00, emissiveIntensity: 0.18});
  const white = new THREE.MeshPhysicalMaterial({color: 0xf4f8ff, metalness: 0.2, roughness: 0.22, clearcoat: 1, envMapIntensity: 2});
  const date = L.textLetters('11 ИЮНЯ', {size: 2.9, depth: 0.9, mat: gold, spacing: 0.04}); date.position.set(0, 9.2, 0); scene.add(date);
  const dateG = new THREE.Group(); scene.add(dateG);
  date.userData.letters.forEach(h => { h.userData.by = h.position.y; });
  const yrs = [['1970', -7.5], ['1986', 0], ['2026', 7.5]].map(([y, x], i) => {
    const g = new THREE.Group(); g.position.set(x, 5.3, 0); scene.add(g);
    const b = L.makeBall(1.25, new THREE.MeshPhysicalMaterial({color: i === 2 ? 0xffe08a : 0xffffff, map: L.ballTextures().map, bumpMap: L.ballTextures().bump, bumpScale: 2, roughness: 0.3, clearcoat: 1, emissive: i === 2 ? 0xffa800 : 0x000000, emissiveIntensity: i === 2 ? 0.35 : 0})); g.add(b);
    const tx = L.textLetters(y, {size: 1.2, depth: 0.4, mat: i === 2 ? gold : white, spacing: 0.04}); tx.position.set(0, -2.5, 0); g.add(tx);
    const gl = L.glowSprite(L.HDR(i === 2 ? 0xffb020 : 0x58c6ff, 1.3), 9, 0); g.add(gl);
    return {g, b, tx, gl, x};
  });
  const fw = new L.Fireworks(14, 90, 4); scene.add(fw.points);
  const bk = L.bokeh(160, {box: [100, 40, 100], center: [0, 0, 0], size: 0.7, speed: 0.6, colors: ['#ffd36a', '#ffffff', '#6ab4ff']}); scene.add(bk);
  let init = false;

  const obj = {scene, camera, bloom: 0.8,
    update(t, T, P) {
      const A = P[0].t0, B = P[1].t0;
      if (!init) {
        [[A + 0.2, [-14, 24, -6], 0x1fd67c], [A + 0.55, [16, 27, -10], 0xff4d5e], [A + 0.9, [0, 32, 4], 0xffe08a], [A + 1.35, [-22, 22, 10], 0xffffff], [A + 1.7, [22, 24, 8], 0x58c6ff], [A + 2.2, [0, 28, -14], 0xffc233],
         [B + 3.0, [-10, 24, -8], 0x1fd67c], [B + 3.4, [11, 26, -8], 0xff4d5e], [B + 3.8, [0, 30, 0], 0xffe08a]].forEach(([tt, p, c]) => fw.add(tt, p, c, 12, 2.4));
        init = true;
      }
      lowerM.uniforms.time.value = t; upperM.uniforms.time.value = t;
      const on = L.easeOut(L.prog(t, 0.0, 0.8));
      lowerM.uniforms.lit.value = 0.35 + 0.65 * on; upperM.uniforms.lit.value = 0.35 + 0.65 * on;
      towers.forEach((tw, i) => { const a = L.prog(t, 0.1 + i * 0.12, 0.45 + i * 0.12); tw.sp.intensity = 130 * a; tw.cone.material.uniforms.k.value = 0.05 * a; });
      ball.position.y = 4.2 + Math.sin(t * 1.6) * 0.25; ball.rotation.y = t * 1.3; ball.rotation.x = t * 0.5;
      const ballShow = 1 - L.easeIO(L.prog(t, B - 0.2, B + 0.3)); ball.scale.setScalar(Math.max(0.001, ballShow)); col.visible = ballShow > 0.01; col.material.uniforms.k.value = 0.12 * ballShow * L.prog(t, A + 1.0, A + 2.0);
      // дата: взрыв из центра в начале, уезжает на второй фразе
      date.userData.letters.forEach((h, i) => {
        const a = L.prog(t, A + i * 0.05, A + 0.7 + i * 0.05), e = Math.max(0.0001, L.easeBack(a));
        const out = L.easeIn(L.prog(t, B - 0.35, B + 0.15));
        h.scale.setScalar(e * (1 - out)); h.position.y = h.userData.by + (1 - L.easeOut(a)) * -3 + out * 6; h.rotation.x = (1 - L.easeOut(a)) * 1.6;
        h.visible = a > 0 && out < 1;
      });
      date.rotation.y = Math.atan2(camera.position.x, camera.position.z);
      yrs.forEach((o, i) => {
        const st = B + 1.5 + i * 1.0 + (i === 2 ? 0.2 : 0), a = L.prog(t, st, st + 0.7), e = Math.max(0.0001, L.easeBack(a));
        o.g.visible = a > 0; o.g.scale.setScalar(e); o.g.position.y = 5.3 + Math.sin(t * 1.5 + i) * 0.2; o.b.rotation.y = t * 1.5 + i; o.b.rotation.x = t * 0.6;
        o.gl.material.opacity = 0.6 * a * (i === 2 ? 1.3 : 0.6);
        o.g.rotation.y = Math.atan2(camera.position.x - o.x, camera.position.z) * 0.9;
      });
      bk.userData.update(t); fw.update(t);
      const c = L.kf(t, [
        [0, [66, 48, 58], [0, 7, 0]],
        [A + 1.4, [8, 27, 21], [0, 6, 0]],
        [B - 0.2, [-15, 10, 9], [0, 6, 0]],
        [B + 1.6, [-3, 7, 22], [0, 5, 0]],
        [T, [5, 7.5, 18], [0, 5.2, 0]]]);
      camera.position.set(...c.pos); camera.lookAt(...c.look);
    },
    hud(ctx, t, T, P) {
      const a = L.easeOut(L.prog(t, P[0].t0 + 0.6, P[0].t0 + 1.1)) * (1 - L.prog(t, P[1].t0 - 0.3, P[1].t0));
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.font = HUD.fm(40); ctx.letterSpacing = '8px'; ctx.fillStyle = '#fff'; ctx.fillText('СТАДИОН АЦТЕКА', 640, 600 - (1 - a) * 14);
        ctx.font = HUD.fm(24); ctx.fillStyle = '#ffc628'; ctx.fillText('МЕХИКО · МЕКСИКА', 640, 640 - 20 * 0);
        ctx.restore();
      }
      const a3 = L.easeOut(L.prog(t, P[1].t0 + 3.5, P[1].t0 + 4.1));
      if (a3 > 0) { const s = 1 + 0.25 * Math.exp(-(t - P[1].t0 - 3.5) * 6); HUD.stat(ctx, {x: 640, y: 150, value: '3-й раз', a: a3, size: 78 * s}); }
    },
  };
  return obj;
}
