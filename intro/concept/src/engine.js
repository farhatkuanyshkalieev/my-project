/* THERMINAL intro engine. Every time and position comes from TL (timeline.json).
   render(t) is a pure function of time: the prototype, the MP4 renderer and the layer exports
   all call it, so what you scrub here is what ends up in the video. */
(function () {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  let TL = JSON.parse(JSON.stringify(TL0));
  const hash = location.hash.replace('#', '');
  const MODE = ['render', 'layer-plate', 'layer-type', 'layer-sheet', 'still-profile'].includes(hash) ? hash : 'page';

  // ---------- easing
  const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const E = {
    out: x => 1 - Math.pow(1 - x, 3),
    in: x => x * x * x,
    inOut: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    sine: x => -(Math.cos(Math.PI * x) - 1) / 2,
    quadIn: x => x * x,
    quadOut: x => 1 - (1 - x) * (1 - x),
    expoOut: x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
  };
  const io = (t, a, b, f = E.out) => f(clamp((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpV = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

  // ---------- stage + mode setup
  const screen = $('screen'), stage = $('stage');
  if (MODE !== 'page') {
    document.body.classList.add('render');
    if (MODE === 'layer-type' || MODE === 'layer-sheet' || MODE === 'still-profile') document.body.classList.add('layer');
    document.body.appendChild(screen);
    $('wrap').hidden = true;
    screen.classList.add('full');
  }
  const show = {
    plate: MODE !== 'layer-type' && MODE !== 'layer-sheet',
    type: MODE === 'page' || MODE === 'render' || MODE === 'layer-type',
    sheet: MODE === 'page' || MODE === 'render' || MODE === 'layer-sheet',
    flash: MODE === 'page' || MODE === 'render',
    post: MODE !== 'still-profile'
  };
  if (!show.plate) $('view').hidden = true;
  if (!show.post) { $('glow').hidden = true; $('grain').hidden = true; document.querySelector('.vig').hidden = true; }

  // ---------- 3D profile
  const gl = $('gl'), glow = $('glow'), grain = $('grain');
  const gctx = glow.getContext('2d'), nctx = grain.getContext('2d');
  let P = null;
  try { if (window.THREE) P = createProfileScene(gl, SOLID, LINES, LOOK); } catch (e) { console.error(e); }
  let K = 1;
  function fit() {
    K = screen.clientWidth / 360;
    stage.style.transform = 'scale(' + K + ')';
    const dpr = MODE === 'page' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const w = Math.round(360 * K), h = Math.round(640 * K);
    if (P) P.setSize(w, h, dpr);
    glow.width = Math.round(w * dpr / 2); glow.height = Math.round(h * dpr / 2);
    grain.width = 270; grain.height = 480;
    render(T);
  }

  // ---------- scene 1 DOM: captions, small caption
  const capEl = $('cap'), smallEl = $('small');
  let capSpans = [], smallSpans = [];
  function buildType() {
    capEl.style.left = TL.captions.x + 'px'; capEl.style.top = TL.captions.y + 'px';
    capEl.innerHTML = ''; capSpans = TL.captions.words.map(w => { const s = document.createElement('span'); s.textContent = w.text; capEl.appendChild(s); return s; });
    smallEl.style.left = TL.small.x + 'px'; smallEl.style.top = TL.small.y + 'px';
    smallEl.innerHTML = ''; smallSpans = TL.small.text.map(l => { const s = document.createElement('span'); s.textContent = l; smallEl.appendChild(s); return s; });
  }

  // ---------- scene 2: drawing placement and generated SVG
  const DW = SOLID.w;
  let DK = 1, DX = 0, DY = 0;
  const X = px => DX + px * DK, Y = py => DY + py * DK;
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };

  // silhouette from the solid regions (same geometry as the 3D)
  $('sil').setAttribute('d', SOLID.shapes.map(s => [s.outer, ...s.holes].map(r => 'M' + r.map(p => p[0] + ',' + p[1]).join('L') + 'Z').join('')).join(''));

  // line schedule: outlines first, then chambers, then small details, constant pen speed
  const secPaths = [...document.querySelectorAll('#secLines path')];
  const meta = secPaths.map((p, i) => {
    const b = p.getBBox(), len = p.getTotalLength();
    p.setAttribute('pathLength', '1');
    const area = b.width * b.height;
    const group = area > 40000 || b.width > 300 ? 0 : area > 6000 ? 1 : 2;
    return { p, len, group, x: b.x, y: b.y };
  });
  let sched = [];
  function schedule() {
    const [a, b] = TL.sheet.draw, span = b - a, speed = TL.sheet.penSpeed;
    const wins = [[0, 0.55], [0.22, 0.82], [0.5, 1.0]];
    sched = [];
    [0, 1, 2].forEach(g => {
      const items = meta.filter(m => m.group === g).sort((m, n) => (m.x + m.y * 0.3) - (n.x + n.y * 0.3));
      const w0 = a + span * wins[g][0], w1 = a + span * wins[g][1];
      const durs = items.map(m => Math.min(0.62, Math.max(0.16, m.len / speed)));
      const n = items.length;
      items.forEach((m, i) => {
        const st = n > 1 ? lerp(w0, w1 - durs[i], i / (n - 1)) : w0;
        sched.push({ p: m.p, st, dur: durs[i] });
      });
    });
  }

  const dimsG = $('dims'), callG = $('callouts');
  let dimEls = [], callEls = [];
  function buildSheet() {
    const d = TL.sheet.drawing; DK = d.w / DW; DX = d.x; DY = d.y;
    dimsG.innerHTML = ''; dimEls = TL.dims.map(dm => {
      const g = el('g', {}, dimsG);
      const v = dm.axis === 'v';
      const ax = X(dm.from[0]), ay = Y(dm.from[1]), bx = X(dm.to[0]), by = Y(dm.to[1]);
      const off = dm.offset;
      // dimension line position
      const p1 = v ? [ax + off, ay] : [ax, ay + off], p2 = v ? [ax + off, by] : [bx, ay + off];
      const e1 = el('line', { class: 'ext', pathLength: 1 }, g), e2 = el('line', { class: 'ext', pathLength: 1 }, g);
      if (v) { e1.setAttribute('x1', ax - 2); e1.setAttribute('y1', ay); e1.setAttribute('x2', p1[0] - 3); e1.setAttribute('y2', ay);
               e2.setAttribute('x1', ax - 2); e2.setAttribute('y1', by); e2.setAttribute('x2', p2[0] - 3); e2.setAttribute('y2', by); }
      else   { e1.setAttribute('x1', ax); e1.setAttribute('y1', ay - 2); e1.setAttribute('x2', ax); e1.setAttribute('y2', p1[1] - 3);
               e2.setAttribute('x1', bx); e2.setAttribute('y1', ay - 2); e2.setAttribute('x2', bx); e2.setAttribute('y2', p2[1] - 3); }
      const ln = el('line', { class: 'dim', x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] }, g);
      const ah = 3.2, aw = 1.3;
      const head = (x, y, dir) => v
        ? `M${x - aw},${y + dir * ah} L${x},${y} L${x + aw},${y + dir * ah}`
        : `M${x + dir * ah},${y - aw} L${x},${y} L${x + dir * ah},${y + aw}`;
      const h1 = el('path', { class: 'dim', d: head(p1[0], p1[1], 1) }, g), h2 = el('path', { class: 'dim', d: head(p2[0], p2[1], -1) }, g);
      const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
      const tx = el('text', { class: 'dimtx', 'text-anchor': 'middle' }, g);
      tx.textContent = dm.label;
      if (v) { tx.setAttribute('x', mx - 3.5); tx.setAttribute('y', my); tx.setAttribute('transform', `rotate(-90 ${mx - 3.5} ${my})`); }
      else { tx.setAttribute('x', mx); tx.setAttribute('y', my - 3.5); }
      return { dm, v, e: [e1, e2], ln, h: [h1, h2], tx, p1, p2, mx, my };
    });
    callG.innerHTML = ''; callEls = TL.callouts.map(c => {
      const g = el('g', {}, callG);
      const pt = [X(c.point[0]), Y(c.point[1])], el1 = [X(c.elbow[0]), Y(c.elbow[1])], en = [X(c.end[0]), Y(c.end[1])];
      const ring = el('circle', { class: 'ring', cx: pt[0], cy: pt[1], r: 1.6 }, g);
      const dot = el('circle', { class: 'dot', cx: pt[0], cy: pt[1], r: 1.5 }, g);
      const ldr = el('path', { class: 'ldr', d: `M${pt[0]},${pt[1]} L${el1[0]},${el1[1]} L${en[0]},${en[1]}`, pathLength: 1 }, g);
      const lines = Array.isArray(c.label) ? c.label : [c.label];
      const horiz = Math.abs(en[1] - el1[1]) < 0.5 && Math.abs(en[0] - el1[0]) > 0.5;
      const tx = el('text', { class: 'lbl', x: en[0] + (horiz ? 4 : 0), y: en[1] + (horiz ? 2.6 : 2.6) }, g);
      lines.forEach((l, i) => { const ts = el('tspan', { x: en[0] + 4, dy: i ? 9.5 : 0 }, tx); ts.textContent = l; });
      return { c, ring, dot, ldr, tx, pt };
    });
    // spec block, top caption, stamp, logo
    const spec = $('spec'); spec.style.left = TL.spec.x + 'px'; spec.style.top = TL.spec.y + 'px'; spec.innerHTML = '';
    TL.spec.rows.forEach(r => { const a = document.createElement('span'); a.textContent = r[0]; const b = document.createElement('b'); b.textContent = r[1]; spec.append(a, b); });
    const wt = $('wtop'); wt.style.left = TL.topCaption.x + 'px'; wt.style.top = TL.topCaption.y + 'px'; wt.innerHTML = '';
    TL.topCaption.words.forEach(w => { const s = document.createElement('span'); s.textContent = w.text; wt.appendChild(s); });
    $('stampLine').setAttribute('y1', TL.stamp.y); $('stampLine').setAttribute('y2', TL.stamp.y);
    $('stampText').setAttribute('y', TL.stamp.y - 5); $('stampText').textContent = TL.stamp.text;
    $('mark').style.top = TL.logo.y + 'px';
    schedule();
  }

  // ---------- post: glow + grain
  let seed = 1;
  function grainFrame(f) {
    const w = grain.width, h = grain.height, img = nctx.createImageData(w, h);
    seed = (f * 9301 + 49297) % 233280 || 1;
    for (let i = 0; i < w * h; i++) { seed = (seed * 16807) % 2147483647; const v = 128 + ((seed / 2147483647) - .5) * 120; const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255; }
    nctx.putImageData(img, 0, 0);
  }

  // ---------- camera path
  function cameraAt(t) {
    const ks = TL.scene1.camera, a = ks[0], b = ks[1];
    const k = E.sine(clamp((t - a.t) / (b.t - a.t)));
    let pos = lerpV(a.pos, b.pos, k), target = lerpV(a.target, b.target, k), fov = lerp(a.fov, b.fov, k);
    const tr = TL.transition, kp = io(t, tr.push[0], tr.push[1], E.in);
    pos = lerpV(pos, tr.pose.pos, kp); target = lerpV(target, tr.pose.target, kp); fov = lerp(fov, tr.pose.fov, kp);
    return { pos, target, fov };
  }

  // ---------- the frame
  let T = 0, playing = false;
  const arw = $('arw'), arwh = $('arwh');
  function render(t) {
    T = t;
    const s1 = TL.scene1, tr = TL.transition;
    // ---- scene 1 visibility
    const inS1 = t < tr.cut + 0.05;
    $('s1').style.visibility = (inS1 || MODE === 'layer-plate' || MODE === 'still-profile') ? 'visible' : 'hidden';
    // ---- 3D
    if (P && show.plate && (inS1 || MODE === 'layer-plate' || MODE === 'still-profile')) {
      const cam = cameraAt(Math.min(t, tr.push[1]));
      const fade = io(t, s1.fadeIn[0], s1.fadeIn[1], E.sine);
      const expo = fade * (1 + (tr.exposure[2] - 1) * io(t, tr.exposure[0], tr.exposure[1], E.quadIn));
      const sweep = io(t, s1.sweep[0], s1.sweep[1], E.sine);
      const glint = s1.glint.max * Math.exp(-Math.pow((t - s1.glint.peak) / s1.glint.width, 2));
      P.render({ pos: cam.pos, target: cam.target, fov: cam.fov, exposure: Math.max(expo, 0.0001), sweep, glint });
      if (show.post) {
        gctx.clearRect(0, 0, glow.width, glow.height);
        gctx.filter = 'blur(' + Math.round(glow.width / 90) + 'px) brightness(1.15)';
        gctx.drawImage(gl, 0, 0, glow.width, glow.height);
        glow.style.opacity = Math.min(1, s1.glow + (1 - s1.glow) * io(t, tr.exposure[0], tr.exposure[1], E.quadIn));
        grainFrame(Math.floor(t * TL.fps));
        grain.style.opacity = s1.grain * 5;
      }
      const bl = tr.blur[2] * io(t, tr.blur[0], tr.blur[1], E.quadIn);
      $('view').style.filter = bl > 0.01 ? 'blur(' + bl.toFixed(2) + 'px)' : 'none';
    }
    // ---- captions
    const co = io(t, TL.captions.out[0], TL.captions.out[1], E.inOut);
    capSpans.forEach((s, i) => {
      const w = TL.captions.words[i], a = io(t, w.t, w.t + TL.captions.in, E.out);
      s.style.opacity = (a * (1 - co)).toFixed(3);
      s.style.filter = 'blur(' + (2.2 * (1 - a) + 1.6 * co).toFixed(2) + 'px)';
      s.style.transform = 'translateY(' + (4 * (1 - a) - 3 * co).toFixed(2) + 'px)';
    });
    $('cap').style.visibility = show.type ? 'visible' : 'hidden';
    // ---- arrow (end follows the cut face as the camera moves)
    const A = TL.arrow;
    if (P && show.type) {
      const cam = cameraAt(Math.min(t, tr.push[1]));
      P.setCam(cam);
      const q = P.project(A.target[0], A.target[1]);
      const ex = q[0] * 360, ey = q[1] * 640;
      const sx = A.start[0], sy = A.start[1];
      const c1 = [sx - 16, sy + 34], c2 = [ex - 48, ey + 2];
      let dx = ex - c2[0], dy = ey - c2[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const tip = [ex - dx * A.gap, ey - dy * A.gap];
      arw.setAttribute('d', `M${sx},${sy} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${tip[0].toFixed(2)},${tip[1].toFixed(2)}`);
      const pr = io(t, A.draw[0], A.draw[1], E.inOut), ao = 1 - io(t, A.out[0], A.out[1], E.inOut);
      arw.style.strokeDasharray = '1 1'; arw.style.strokeDashoffset = (1 - pr).toFixed(4);
      arw.style.opacity = ao.toFixed(3);
      const hl = 5.2, ang = 0.5, ca = Math.cos(ang), sa = Math.sin(ang);
      const b1 = [tip[0] - hl * (dx * ca - dy * sa), tip[1] - hl * (dy * ca + dx * sa)];
      const b2 = [tip[0] - hl * (dx * ca + dy * sa), tip[1] - hl * (dy * ca - dx * sa)];
      arwh.setAttribute('d', `M${b1[0].toFixed(2)},${b1[1].toFixed(2)} L${tip[0].toFixed(2)},${tip[1].toFixed(2)} L${b2[0].toFixed(2)},${b2[1].toFixed(2)}`);
      arwh.setAttribute('opacity', (io(t, A.draw[1] - 0.08, A.draw[1] + 0.06, E.out) * ao).toFixed(3));
    }
    arw.parentNode.style.visibility = show.type ? 'visible' : 'hidden';
    // ---- small caption
    const sm = TL.small, so = io(t, sm.out[0], sm.out[1], E.inOut);
    smallSpans.forEach((s, i) => {
      const a = io(t, sm.in[0] + i * 0.12, sm.in[1] + i * 0.12, E.out);
      s.style.opacity = (a * (1 - so)).toFixed(3);
      s.style.filter = 'blur(' + (1.6 * (1 - a) + 1.2 * so).toFixed(2) + 'px)';
      s.style.transform = 'translateY(' + (3 * (1 - a)).toFixed(2) + 'px)';
    });
    smallEl.style.visibility = show.type ? 'visible' : 'hidden';
    // ---- flash
    const fl = tr.flash;
    if (show.flash) {
      const up = io(t, fl[0], fl[1], E.quadIn), down = io(t, fl[1], fl[2], E.quadOut);
      $('flash').style.opacity = (up * (1 - down)).toFixed(3);
      // bloom grows out of the cut face the camera is pushing into
      const g = io(t, tr.push[0] + 0.04, fl[1], E.quadIn) * (1 - down);
      let cx = 45, cy = 58;
      if (P) { const q = P.project(SOLID.w * 0.42, SOLID.h * 0.5); cx = Math.max(10, Math.min(90, q[0] * 100)); cy = Math.max(10, Math.min(90, q[1] * 100)); }
      const r = 30 + 70 * g;
      $('flash2').style.background = `radial-gradient(${r}% ${r * 0.62}% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, rgba(255,255,255,${(0.98 * g).toFixed(3)}) 0%, rgba(255,255,255,${(0.55 * g).toFixed(3)}) 40%, rgba(255,255,255,0) 100%)`;
    } else { $('flash').style.opacity = 0; $('flash2').style.background = 'none'; }
    // ---- scene 2
    const sh = TL.sheet;
    $('s2').style.visibility = (show.sheet && t >= tr.cut - 0.25) ? 'visible' : 'hidden';
    if (show.sheet && t >= tr.cut - 0.25) {
      document.querySelectorAll('#frameLines line').forEach((l, i) => {
        l.style.strokeDasharray = '1 1'; l.style.strokeDashoffset = (1 - io(t, sh.frame[0] + i * 0.06, sh.frame[1] + i * 0.06, E.inOut)).toFixed(4);
      });
      const st = sh.settle, sc = 1 + (st[2] - 1) * (1 - io(t, st[0], st[1], E.out));
      const cx = DW / 2, cy = SOLID.h / 2;
      $('dwg').setAttribute('transform', `translate(${X(cx)} ${Y(cy)}) scale(${(DK * sc).toFixed(5)}) translate(${-cx} ${-cy})`);
      const si = sh.silhouette;
      $('sil').style.opacity = (io(t, si[0], si[1], E.out) * (1 - io(t, si[1], si[2], E.inOut))).toFixed(3);
      sched.forEach(s => { s.p.style.strokeDasharray = '1 1'; s.p.style.strokeDashoffset = (1 - io(t, s.st, s.st + s.dur, E.sine)).toFixed(4); });
      [...$('wtop').children].forEach((s, i) => {
        const w = TL.topCaption.words[i], a = io(t, w.t, w.t + TL.topCaption.in, E.out);
        s.style.opacity = a.toFixed(3); s.style.filter = 'blur(' + (1.8 * (1 - a)).toFixed(2) + 'px)'; s.style.transform = 'translateY(' + (3 * (1 - a)).toFixed(2) + 'px)';
      });
      dimEls.forEach(d => {
        const t0 = d.dm.t;
        d.e.forEach(e => { e.style.strokeDasharray = '1 1'; e.style.strokeDashoffset = (1 - io(t, t0, t0 + 0.2, E.out)).toFixed(4); });
        const k = io(t, t0 + 0.1, t0 + 0.42, E.inOut);
        const a = [lerp(d.mx, d.p1[0], k), lerp(d.my, d.p1[1], k)], b = [lerp(d.mx, d.p2[0], k), lerp(d.my, d.p2[1], k)];
        d.ln.setAttribute('x1', a[0]); d.ln.setAttribute('y1', a[1]); d.ln.setAttribute('x2', b[0]); d.ln.setAttribute('y2', b[1]);
        d.ln.style.opacity = k > 0 ? 1 : 0;
        const ha = io(t, t0 + 0.36, t0 + 0.5, E.out);
        d.h.forEach(h => h.style.opacity = ha.toFixed(3));
        const ta = io(t, t0 + 0.4, t0 + 0.7, E.out);
        d.tx.style.opacity = ta.toFixed(3);
      });
      callEls.forEach(c => {
        const t0 = c.c.t, a = io(t, t0, t0 + 0.16, E.out);
        c.dot.setAttribute('r', (1.5 * a).toFixed(3));
        const rp = clamp((t - t0) / 0.5);
        c.ring.setAttribute('r', (1.6 + 5 * E.out(rp)).toFixed(3)); c.ring.style.opacity = (t >= t0 ? 0.55 * (1 - rp) : 0).toFixed(3);
        c.ldr.style.strokeDasharray = '1 1'; c.ldr.style.strokeDashoffset = (1 - io(t, t0 + 0.08, t0 + 0.46, E.inOut)).toFixed(4);
        const la = io(t, t0 + 0.34, t0 + 0.66, E.out);
        c.tx.style.opacity = la.toFixed(3); c.tx.setAttribute('transform', `translate(${(2.5 * (1 - la)).toFixed(2)} 0)`);
      });
      [...$('spec').children].forEach((s, i) => {
        const a = io(t, TL.spec.t + Math.floor(i / 2) * 0.08, TL.spec.t + Math.floor(i / 2) * 0.08 + 0.36, E.out);
        s.style.opacity = a.toFixed(3);
      });
      $('stampLine').style.strokeDasharray = '1 1'; $('stampLine').style.strokeDashoffset = (1 - io(t, TL.stamp.t, TL.stamp.t + 0.4, E.inOut)).toFixed(4);
      $('stampText').style.opacity = io(t, TL.stamp.t + 0.18, TL.stamp.t + 0.5, E.out).toFixed(3);
      const la = io(t, TL.logo.t, TL.logo.t + 0.5, E.out);
      $('mark').style.opacity = la.toFixed(3);
      $('mark').style.transform = `translateY(${(3 * (1 - la)).toFixed(2)}px)`;
    }
    // ---- page UI
    if (MODE === 'page') {
      $('tc').textContent = t.toFixed(2).padStart(5, '0');
      $('time').textContent = t.toFixed(2).replace('.', ',') + ' с';
      $('scrub').value = Math.round(t * 1000);
    }
  }

  buildType(); buildSheet();
  new ResizeObserver(fit).observe(screen);

  // ---------- hooks for tools/render.js
  window.__seek = v => { playing = false; T = v; render(v); return true; };
  window.__ready = () => document.fonts.ready.then(() => { fit(); return !!P; });
  window.__svg = () => $('sheet').outerHTML;
  window.__arrowSvg = () => arw.parentNode.outerHTML;

  if (MODE !== 'page') { T = 0; fit(); return; }

  // ---------- playback
  const audio = $('sfx'), btn = $('play'), snd = $('snd');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = null, soundOn = false;
  playing = !reduce;
  T = reduce ? 6.0 : 0.0;
  const syncAudio = () => {
    if (!soundOn) return;
    if (playing) { if (Math.abs(audio.currentTime - T) > 0.06) audio.currentTime = T; if (audio.paused) audio.play().catch(() => {}); }
    else audio.pause();
  };
  const setPlaying = v => { playing = v; btn.textContent = v ? 'Пауза' : 'Пуск'; btn.setAttribute('aria-label', v ? 'Пауза' : 'Пуск'); last = null; syncAudio(); };
  setPlaying(playing);
  btn.addEventListener('click', () => setPlaying(!playing));
  snd.addEventListener('click', () => {
    soundOn = !soundOn; snd.textContent = soundOn ? 'Звук вкл' : 'Звук выкл'; snd.setAttribute('aria-pressed', soundOn);
    if (soundOn) { audio.currentTime = T; if (!playing) setPlaying(true); else syncAudio(); } else audio.pause();
  });
  $('scrub').addEventListener('input', e => { T = e.target.value / 1000; setPlaying(false); render(T); });
  document.querySelectorAll('.jump button').forEach(b => b.addEventListener('click', () => { T = b.dataset.t / 1000; render(T); if (soundOn) audio.currentTime = T; last = null; }));
  function tick(now) {
    if (playing) {
      if (last != null) { T += (now - last) / 1000; if (T > TL.duration + 0.5) { T = 0; if (soundOn) audio.currentTime = 0; } }
      last = now; render(Math.min(T, TL.duration)); syncAudio();
    }
    requestAnimationFrame(tick);
  }
  fit(); requestAnimationFrame(tick);

  // ---------- timing editor
  const EDIT = [
    ['«Это»', 'captions.words.0.t'], ['«дверная»', 'captions.words.1.t'], ['«система»', 'captions.words.2.t'], ['«VIKING 90»', 'captions.words.3.t'],
    ['Стрелка, начало', 'arrow.draw.0'], ['Стрелка, конец', 'arrow.draw.1'], ['Уход подписей', 'captions.out.0'],
    ['Малая подпись', 'small.in.0'], ['Наезд, начало', 'transition.push.0'], ['Наезд, конец', 'transition.push.1'],
    ['Засветка, пик', 'transition.flash.1'], ['Склейка в белый', 'transition.cut'],
    ['Прорисовка, начало', 'sheet.draw.0'], ['Прорисовка, конец', 'sheet.draw.1'],
    ['Подпись сверху, 1', 'topCaption.words.0.t'], ['Подпись сверху, 2', 'topCaption.words.1.t'],
    ['Размер: глубина', 'dims.0.t'], ['Размер: рама', 'dims.1.t'], ['Выноска: камеры', 'callouts.0.t'], ['Выноска: зона', 'callouts.1.t'],
    ['Табличка', 'spec.t'], ['Штамп', 'stamp.t'], ['Знак', 'logo.t']
  ];
  const getP = (o, p) => p.split('.').reduce((a, k) => a[k], o);
  const setP = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const grid = $('tgrid');
  function buildEditor() {
    grid.innerHTML = '';
    EDIT.forEach(([label, path], i) => {
      const l = document.createElement('label'); l.htmlFor = 'tl' + i;
      const s = document.createElement('span'); s.textContent = label;
      const inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.01'; inp.min = '0'; inp.max = String(TL.duration); inp.id = 'tl' + i; inp.value = getP(TL, path);
      inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (isNaN(v)) return; setP(TL, path, v); buildType(); buildSheet(); render(T); });
      l.append(s, inp); grid.appendChild(l);
    });
  }
  buildEditor();
  $('copyTL').addEventListener('click', () => {
    const txt = JSON.stringify(TL, null, 2), out = $('tlOut');
    navigator.clipboard.writeText(txt).then(() => { $('copyMsg').textContent = 'Скопировано'; }).catch(() => { out.hidden = false; out.value = txt; out.select(); $('copyMsg').textContent = 'Выделено, скопируйте вручную'; });
  });
  $('resetTL').addEventListener('click', () => { TL = JSON.parse(JSON.stringify(TL0)); buildType(); buildSheet(); buildEditor(); render(T); $('copyMsg').textContent = 'Сброшено'; });

  // ---------- cue sheet
  const tb = document.querySelector('#cues tbody');
  (typeof CUES !== 'undefined' ? CUES : []).forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td></td><td></td><td></td>';
    tr.children[0].textContent = c.t.toFixed(2).replace('.', ',') + (c.end ? '–' + c.end.toFixed(2).replace('.', ',') : '');
    tr.children[1].textContent = c.name; tr.children[2].textContent = c.stem;
    tb.appendChild(tr);
  });
})();
