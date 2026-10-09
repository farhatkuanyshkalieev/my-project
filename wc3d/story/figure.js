// Безликие стилизованные герои: скелет из капсул, тун-шейдинг, чернильный контур.
import * as THREE from 'three';

const grad = (() => { const d = new Uint8Array([70, 150, 210, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({color, gradientMap: grad, ...extra});
export const inkMat = new THREE.ShaderMaterial({side: THREE.BackSide, uniforms: {th: {value: 0.014}}, vertexShader: 'uniform float th; void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*th,1.); }', fragmentShader: 'void main(){ gl_FragColor=vec4(0.10,0.055,0.04,1.); }'});

export function mk(geo, mat, ink = true, th = 0.014) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  if (ink) { const o = new THREE.Mesh(geo, th === 0.014 ? inkMat : new THREE.ShaderMaterial({side: THREE.BackSide, uniforms: {th: {value: th}}, vertexShader: inkMat.vertexShader, fragmentShader: inkMat.fragmentShader})); m.add(o); }
  return m;
}
const limb = (r, len) => { const g = new THREE.CapsuleGeometry(r, len, 5, 12); g.translate(0, -len / 2, 0); return g; };

export function makeFigure(o) {
  const root = new THREE.Group(), J = {};
  const skin = toon(o.skin), shirt = toon(o.shirt), pants = toon(o.pants), shoe = toon(o.shoes || 0x222222), sleeve = toon(o.sleeve ?? o.shirt);
  const pelvis = new THREE.Group(); pelvis.position.y = 0.95; root.add(pelvis); J.pelvis = pelvis;
  const hipMesh = mk(new THREE.CapsuleGeometry(0.17, 0.12, 5, 12), pants); hipMesh.rotation.z = Math.PI / 2; pelvis.add(hipMesh);
  const spine = new THREE.Group(); pelvis.add(spine); J.spine = spine;
  const torso = mk(new THREE.CapsuleGeometry(0.2, 0.34, 6, 14), shirt); torso.position.y = 0.3; torso.scale.set(1.12, 1, 0.82); spine.add(torso);
  if (o.under) { const u = mk(new THREE.CapsuleGeometry(0.15, 0.3, 4, 10), toon(o.under), false); u.position.set(0, 0.3, 0.07); u.scale.set(0.9, 1, 0.6); spine.add(u); }
  const chest = new THREE.Group(); chest.position.y = 0.5; spine.add(chest); J.chest = chest;
  const neck = mk(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skin, false); neck.position.y = 0.12; chest.add(neck);
  const head = new THREE.Group(); head.position.y = 0.2; chest.add(head); J.head = head;
  const skull = mk(new THREE.SphereGeometry(0.125, 28, 20), skin); skull.position.y = 0.11; skull.scale.set(0.92, 1.08, 1); head.add(skull);
  if (o.hair) { const h = mk(new THREE.SphereGeometry(0.133, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), toon(o.hair), true, 0.01); h.position.set(0, 0.125, -0.012); h.scale.set(0.95, 1.08, 1.04); head.add(h); J.hair = h; }
  if (o.beard) { const b = mk(new THREE.SphereGeometry(0.1, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), toon(o.beard), true, 0.01); b.position.set(0, 0.075, 0.03); b.scale.set(1.0, 1.0, 1.0); head.add(b); }
  if (o.hat) {
    const hat = new THREE.Group(); hat.position.y = 0.2; head.add(hat); J.hat = hat;
    const brim = mk(new THREE.CylinderGeometry(0.22, 0.23, 0.025, 28), toon(o.hat), true, 0.01); brim.position.y = 0.0; hat.add(brim);
    const crown = mk(new THREE.CylinderGeometry(0.13, 0.17, 0.15, 24), toon(o.hat), true, 0.01); crown.position.y = 0.085; hat.add(crown);
    const band = mk(new THREE.CylinderGeometry(0.172, 0.172, 0.03, 24), toon(o.hatBand || 0x7a2d1f), false); band.position.y = 0.04; hat.add(band);
  }
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.285, 0.2, 0); chest.add(sh); const key = s < 0 ? 'L' : 'R';
    sh.add(mk(new THREE.SphereGeometry(0.085, 14, 10), sleeve, false));
    sh.add(mk(limb(0.072, 0.27), sleeve));
    const el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
    el.add(mk(limb(0.063, 0.24), o.longSleeve ? sleeve : skin));
    const hand = mk(new THREE.SphereGeometry(0.068, 14, 10), skin); hand.position.y = -0.34; hand.scale.set(0.95, 1.15, 0.85); el.add(hand);
    J['sh' + key] = sh; J['el' + key] = el; J['hand' + key] = hand;
    const hip = new THREE.Group(); hip.position.set(s * 0.1, -0.06, 0); pelvis.add(hip);
    hip.add(mk(limb(0.092, 0.36), pants));
    const kn = new THREE.Group(); kn.position.y = -0.45; hip.add(kn);
    kn.add(mk(limb(0.074, 0.34), pants));
    const foot = mk(new THREE.BoxGeometry(0.12, 0.08, 0.27), shoe); foot.position.set(0, -0.45, 0.05); kn.add(foot);
    J['hip' + key] = hip; J['kn' + key] = kn;
  }
  root.userData.J = J;
  return root;
}

// позы: углы в радианах; «вперёд» (+z) для рук/ног = отрицательный x
export function poseReset(f) { const J = f.userData.J; for (const k in J) { if (k.startsWith('hand') || k === 'hair' || k === 'hat') continue; J[k].rotation.set(0, 0, 0); } J.pelvis.position.y = 0.95; J.pelvis.position.x = 0; J.pelvis.position.z = 0; }
export function poseWalk(f, ph, amp = 1, lean = 0.05, carry = false) {
  poseReset(f); const J = f.userData.J, s = Math.sin(ph), c = Math.cos(ph);
  J.hipL.rotation.x = -s * 0.7 * amp; J.hipR.rotation.x = s * 0.7 * amp;
  J.knL.rotation.x = Math.max(0, -Math.cos(ph)) * 0.9 * amp * (s > -0.2 ? 1 : 0.4); J.knR.rotation.x = Math.max(0, Math.cos(ph)) * 0.9 * amp * (s < 0.2 ? 1 : 0.4);
  J.shL.rotation.x = s * 0.55 * amp; J.shR.rotation.x = -s * 0.55 * amp; J.elL.rotation.x = -0.25; J.elR.rotation.x = -0.25;
  J.pelvis.position.y = 0.95 - Math.abs(c) * 0.035 * amp; J.spine.rotation.x = lean; J.spine.rotation.y = s * 0.08 * amp;
  if (carry) poseCarry(f);
}
export function poseCarry(f, k = 1) { const J = f.userData.J; J.shR.rotation.set(-2.5 * k, 0, -0.25 * k); J.elR.rotation.x = -1.3 * k; J.shL.rotation.set(-0.9 * k, 0, 0.3 * k); J.elL.rotation.x = -0.9 * k; J.spine.rotation.z = -0.1 * k; J.head.rotation.z = 0.08 * k; }
export function poseIdle(f, t, breathe = 1) { poseReset(f); const J = f.userData.J; J.chest.rotation.x = Math.sin(t * 1.7) * 0.015 * breathe; J.head.rotation.y = Math.sin(t * 0.6) * 0.1; J.shL.rotation.z = 0.08; J.shR.rotation.z = -0.08; J.elL.rotation.x = -0.15; J.elR.rotation.x = -0.15; }
export function poseSwim(f, t, k = 1) { poseReset(f); const J = f.userData.J; J.shL.rotation.set(-2.3 + Math.sin(t * 7) * 0.5 * k, 0, 0.4); J.shR.rotation.set(-2.4 + Math.cos(t * 6.3) * 0.5 * k, 0, -0.4); J.elL.rotation.x = -0.6; J.elR.rotation.x = -0.5; J.head.rotation.x = -0.25; J.spine.rotation.x = Math.sin(t * 5) * 0.06; J.spine.rotation.z = Math.sin(t * 4.1) * 0.08; }
