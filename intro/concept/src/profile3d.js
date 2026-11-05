/* THERMINAL intro, scene 1: VIKING 90 door section extruded from the manufacturer drawing.
   The section geometry comes only from SOLID (material regions vectorised from the drawing on
   therminal.kz) and LINES (the traced drawing lines, used as seams on the cut face).
   Nothing here alters the outline; the extrusion length is the only free parameter. */
function createProfileScene(canvas, SOLID, LINES, cfg) {
  const T = window.THREE;
  const W = SOLID.w, H = SOLID.h, CX = W / 2, CY = H / 2;
  const L = cfg.length;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.exposure;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;   // lights and profile never move, only the camera does
  renderer.shadowMap.needsUpdate = true;
  renderer.setClearColor(0x000000, 0);

  const scene = new T.Scene();

  // ---- studio environment: softboxes rendered into a PMREM map; the sweep box moves over time
  const pmrem = new T.PMREMGenerator(renderer);
  const env = new T.Scene();
  const softbox = (w, h, pos, k) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k), side: T.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); env.add(m); return m;
  };
  softbox(7, 2.2, [-1.5, 6, 2.5], cfg.env.top);      // large overhead box
  softbox(0.7, 9, [-6, 1.5, 1.5], cfg.env.left);      // left strip
  softbox(0.7, 9, [5.5, 2, -4], cfg.env.rim);         // rear right rim strip
  softbox(12, 1.2, [0, -3, 7], cfg.env.fill);         // faint low fill
  softbox(9, 3.5, [0.5, 5, -5.5], cfg.env.back);      // high rear box: what the cut face reflects
  const sweepBox = softbox(0.55, 10, [0, 2, 6], cfg.env.sweep);
  // environment maps are cached per sweep step: the sweep box moves in ENV_STEPS positions
  const ENV_STEPS = cfg.envSteps || 64, envCache = new Map();
  let lastStep = -1;
  function updateEnv(s) {
    const step = Math.round(Math.min(1, Math.max(0, s)) * ENV_STEPS);
    if (step === lastStep) return;
    lastStep = step;
    if (!envCache.has(step)) {
      const k = step / ENV_STEPS;
      sweepBox.position.set(-7 + 14 * k, -1.2, 6.5 - 2 * Math.abs(k - 0.5));
      sweepBox.lookAt(0, 0, 0);
      envCache.set(step, pmrem.fromScene(env, 0.035));
    }
    scene.environment = envCache.get(step).texture;
  }

  // ---- textures
  function noiseCanvas(size, amp, blur) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size);
    let s = 1234567;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < size * size; i++) {
      const v = 128 + (rnd() - 0.5) * amp; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (blur) { g.filter = `blur(${blur}px)`; g.drawImage(c, 0, 0); }
    return c;
  }
  const grain = new T.CanvasTexture(noiseCanvas(512, 255, 0.6));
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.repeat.set(1 / 38, 1 / 38);

  // cut face: silver with saw arcs, plus the drawing's own lines as seams between parts
  const capCanvas = document.createElement('canvas');
  const CS = 2048 / W;
  capCanvas.width = 2048; capCanvas.height = Math.round(H * CS);
  {
    const g = capCanvas.getContext('2d');
    const grd = g.createLinearGradient(0, 0, capCanvas.width, capCanvas.height);
    grd.addColorStop(0, '#d4d6d9'); grd.addColorStop(0.5, '#c3c6ca'); grd.addColorStop(1, '#d0d2d5');
    g.fillStyle = grd; g.fillRect(0, 0, capCanvas.width, capCanvas.height);
    g.globalAlpha = 0.06; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
    for (let r = 300; r < 4200; r += 3.2) { g.beginPath(); g.arc(-900, capCanvas.height * 2.4, r, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 0.05; g.strokeStyle = '#000000';
    for (let r = 301.6; r < 4200; r += 5.1) { g.beginPath(); g.arc(-900, capCanvas.height * 2.4, r, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(40,42,46,0.85)'; g.lineWidth = 2.2; g.lineJoin = 'round';
    g.setTransform(CS, 0, 0, CS, 0, 0);
    g.lineWidth = 2.2 / CS;
    LINES.forEach(d => g.stroke(new Path2D(d)));
  }
  const capTex = new T.CanvasTexture(capCanvas);
  capTex.encoding = T.sRGBEncoding;
  capTex.anisotropy = 8;
  capTex.repeat.set(1 / W, 1 / H);
  capTex.offset.set(CX / W, (H - CY) / H);

  const sideMat = new T.MeshPhysicalMaterial({
    color: new T.Color(cfg.coat.color), metalness: cfg.coat.metalness, roughness: cfg.coat.roughness,
    clearcoat: cfg.coat.clearcoat, clearcoatRoughness: cfg.coat.clearcoatRoughness,
    bumpMap: grain, bumpScale: cfg.coat.bump, roughnessMap: grain
  });
  sideMat.envMapIntensity = cfg.coat.env;
  // depth falloff: surfaces fade to black below the cut, which also darkens the chamber interiors
  sideMat.onBeforeCompile = sh => {
    sh.uniforms.uFall = { value: cfg.coat.falloff };
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vWY = transformed.z;');
    sh.fragmentShader = 'varying float vWY;\nuniform float uFall;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>',
      'gl_FragColor.rgb *= mix(1.0, 0.0, smoothstep(0.0, uFall, -vWY));\n#include <tonemapping_fragment>');
  };
  const capMat = new T.MeshStandardMaterial({ color: 0xffffff, map: capTex, metalness: 1, roughness: cfg.cut.roughness, envMapIntensity: cfg.cut.env });

  // ---- geometry from the vectorised drawing
  const v = p => new T.Vector2(p[0] - CX, -(p[1] - CY));
  const shapes = SOLID.shapes.map(s => {
    const sh = new T.Shape(s.outer.map(v));
    s.holes.forEach(h => sh.holes.push(new T.Path(h.map(v))));
    return sh;
  });
  const geo = new T.ExtrudeGeometry(shapes, { depth: L, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geo.translate(0, 0, -L);
  const mesh = new T.Mesh(geo, [capMat, sideMat]);
  mesh.castShadow = mesh.receiveShadow = true;
  // stand the profile up like the brand renders: cut face on top (y = 0), extrusion going down
  mesh.rotation.x = -Math.PI / 2;
  const rig = new T.Group(); rig.add(mesh); scene.add(rig);

  // ---- lights
  const key = new T.DirectionalLight(0xffffff, cfg.light.key);
  key.position.set(-700, 1800, 600); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 100, far: 6000 });
  key.shadow.bias = -0.0008; key.shadow.normalBias = 1.5;
  scene.add(key); scene.add(key.target);
  const rim = new T.DirectionalLight(0xffffff, cfg.light.rim); rim.position.set(900, 400, -2000); scene.add(rim);
  const glint = new T.DirectionalLight(0xffffff, 0); scene.add(glint);

  const cam = new T.PerspectiveCamera(cfg.fov, 9 / 16, 20, 200000);

  function setSize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }

  const lerp = (a, b, k) => a + (b - a) * k;
  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  /* pose: {pos:[x,y,z], target:[x,y,z], fov} in drawing units (1 unit = 1 px of the 924 px drawing) */
  function setCam(state) {
    const p = state.pos, tg = state.target;
    cam.position.set(p[0], p[1], p[2]); cam.fov = state.fov; cam.updateProjectionMatrix(); cam.lookAt(tg[0], tg[1], tg[2]);
    cam.updateMatrixWorld();
  }
  function render(state) {
    setCam(state);
    renderer.toneMappingExposure = cfg.exposure * state.exposure;
    updateEnv(state.sweep);
    glint.intensity = state.glint;
    glint.position.set(lerp(-1800, 1800, state.sweep), 900, 1600);
    renderer.render(scene, cam);
  }
  /* project a point given in drawing px on the cut face (z = 0) to normalised screen coords */
  function project(px, py) {
    const q = new T.Vector3(px - CX, 0, py - CY).project(cam);
    return [(q.x + 1) / 2, (1 - q.y) / 2];
  }
  /* move the whole profile (fly-in); rot in radians (Euler XYZ), applied to the rig */
  let objKey = '';
  function setObject(o) {
    const p = o && o.pos || [0, 0, 0], r = o && o.rot || [0, 0, 0];
    const k = p.concat(r).map(v => v.toFixed(3)).join(',');
    if (k === objKey) return;
    objKey = k;
    rig.position.set(p[0], p[1], p[2]); rig.rotation.set(r[0], r[1], r[2]);
    rig.updateMatrixWorld(true);
    renderer.shadowMap.needsUpdate = true;
  }
  return { setSize, render, setCam, project, setObject };
}
