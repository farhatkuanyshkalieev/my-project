/* THERMINAL intro v3 — shot-based engine. Everything is driven by TL (timeline.json):
   shots (3D / image / sheet / logo), texts, graphics (arrows, callouts, brackets), flashes.
   render(t) is a pure function of time; the prototype and tools/render.js both call it. */
(function () {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const TL = TL0;
  const MODE = location.hash.replace('#', '') === 'render' ? 'render' : 'page';

  // ---------- easing
  const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const E = {
    out: x => 1 - Math.pow(1 - x, 3), in: x => x * x * x,
    inOut: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    sine: x => -(Math.cos(Math.PI * x) - 1) / 2, quadIn: x => x * x, quadOut: x => 1 - (1 - x) * (1 - x),
    expoOut: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), lin: x => x
  };
  const io = (t, a, b, f = E.out) => f(clamp((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpV = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const shotAt = t => TL.shots.find(s => t >= s.from && t < s.to) || TL.shots[TL.shots.length - 1];
  const shotById = id => TL.shots.find(s => s.id === id);

  // ---------- stage
  const screen = $('screen'), stage = $('stage');
  if (MODE === 'render') { document.body.classList.add('render'); document.body.appendChild(screen); $('wrap').hidden = true; screen.classList.add('full'); }

  // ---------- 3D
  const gl = $('gl'), glow = $('glow'), grain = $('grain');
  const gctx = glow.getContext('2d'), nctx = grain.getContext('2d');
  let P = null;
  try { if (window.THREE) P = createProfileScene(gl, SOLID, LINES, LOOK); } catch (e) { console.error(e); }
  function camAt(s, t) {
    const ks = s.cam; let cur = { pos: ks[0].pos, target: ks[0].target, fov: ks[0].fov };
    // fill missing fields from the previous key
    const full = []; ks.forEach(k => { cur = { t: k.t, pos: k.pos || cur.pos, target: k.target || cur.target, fov: k.fov || cur.fov, ease: k.ease || 'sine' }; full.push(cur); });
    if (t <= full[0].t) return full[0];
    for (let i = 0; i < full.length - 1; i++) {
      const a = full[i], b = full[i + 1];
      if (t <= b.t) { const k = E[a.ease](clamp((t - a.t) / (b.t - a.t))); return { pos: lerpV(a.pos, b.pos, k), target: lerpV(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) }; }
    }
    return full[full.length - 1];
  }
  /* [[t, v], ...] keyframes -> value (smooth) */
  function keyed(ks, t, def) {
    if (!ks) return def;
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) return lerp(ks[i][1], ks[i + 1][1], E.sine(clamp((t - ks[i][0]) / (ks[i + 1][0] - ks[i][0]))));
    return ks[ks.length - 1][1];
  }
  /* object (profile) motion: [{t, pos, rot, ease}] */
  function objAt(s, t) {
    const ks = s.object; if (!ks) return { pos: [0, 0, 0], rot: [0, 0, 0] };
    if (t <= ks[0].t) return ks[0];
    for (let i = 0; i < ks.length - 1; i++) { const a = ks[i], b = ks[i + 1];
      if (t <= b.t) { const u = clamp((t - a.t) / (b.t - a.t)), k = E[a.ease || 'sine'](u), kr = E[a.rotEase || a.ease || 'sine'](u);
        return { pos: lerpV(a.pos, b.pos, k), rot: lerpV(a.rot, b.rot, kr) }; } }
    return ks[ks.length - 1];
  }
  // starfield for the fly-in (deterministic)
  const stars = $('stars'), sctx = stars.getContext('2d');
  function drawStars() {
    const W = stars.width = 1080, H = stars.height = 1920;
    const g = sctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04060c'); g.addColorStop(0.55, '#070b14'); g.addColorStop(1, '#020305');
    sctx.fillStyle = g; sctx.fillRect(0, 0, W, H);
    let sd = 7;
    const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 420; i++) {
      const x = r() * W, y = r() * H, big = r() > 0.94, rad = big ? 1.2 + r() * 1.4 : 0.4 + r() * 0.9, a = big ? 0.55 + r() * 0.4 : 0.12 + r() * 0.45;
      sctx.fillStyle = `rgba(225,232,245,${a.toFixed(3)})`; sctx.beginPath(); sctx.arc(x, y, rad, 0, Math.PI * 2); sctx.fill();
      if (big) { const gg = sctx.createRadialGradient(x, y, 0, x, y, rad * 6); gg.addColorStop(0, `rgba(200,215,240,${(a * 0.25).toFixed(3)})`); gg.addColorStop(1, 'rgba(200,215,240,0)'); sctx.fillStyle = gg; sctx.fillRect(x - rad * 6, y - rad * 6, rad * 12, rad * 12); }
    }
  }
  drawStars();
  function blurAt(s, t) {
    if (!s.blur) return 0; const b = s.blur;
    if (t <= b[0][0]) return b[0][1];
    for (let i = 0; i < b.length - 1; i++) if (t <= b[i + 1][0]) return lerp(b[i][1], b[i + 1][1], E.quadOut(clamp((t - b[i][0]) / (b[i + 1][0] - b[i][0]))));
    return b[b.length - 1][1];
  }

  // ---------- image shots
  const imgLayer = $('imgs');
  const imgEls = {};
  TL.shots.filter(s => s.type === 'image').forEach(s => {
    imgEls[s.id] = s.images.map(im => {
      const n = document.createElement('img'); n.src = im.src; n.alt = ''; n.className = 'shotimg';
      if (s.blend) n.style.mixBlendMode = s.blend;
      if (im.clipTop) n.style.clipPath = `inset(${(im.clipTop * 100).toFixed(2)}% 0 0 0)`;
      imgLayer.appendChild(n); return n;
    });
  });
  // quality guard: a raster never shows larger than its native pixels (stage px x3 = output px)
  const safeW = (im, w) => Math.min(w, im.native[0] / 3);
  function imgBox(s, i, t) {
    const im = s.images[i];
    const k = E.sine(clamp((t - s.from) / (s.to - s.from)));
    const w = safeW(im, lerp(im.w[0], im.w[1], k)), h = w * im.native[1] / im.native[0];
    let dx = 0, op = 1;
    if (im.enter) { const e = io(t, im.enter.t[0], im.enter.t[1], E.out); dx = im.enter.dx * (1 - e); op = io(t, im.enter.t[0], im.enter.t[0] + 0.12, E.lin); }
    const x = im.at[0] - im.anchor[0] * w + dx, y = im.at[1] - im.anchor[1] * h;
    return { x, y, w, h, op };
  }

  // ---------- anchors
  function anchor(a, t) {
    if (a.xy) return a.xy;
    if (a.p3d && P) { const q = P.project(a.p3d[0], a.p3d[1]); return [q[0] * 360, q[1] * 640]; }
    if (a.img) { const [sid, i, u, v] = a.img; const b = imgBox(shotById(sid), i, t); return [b.x + u * b.w, b.y + v * b.h]; }
    return [0, 0];
  }

  // ---------- texts
  const txtLayer = $('txt');
  const texts = TL.texts.map(tx => {
    const box = document.createElement('div'); box.className = 'tx ' + tx.style + ' c-' + tx.color;
    box.style.left = tx.x + 'px'; box.style.top = tx.y + 'px';
    if (tx.size) box.style.fontSize = tx.size + 'px';
    const spans = tx.words.map(w => { const s = document.createElement('span'); s.textContent = w.text; box.appendChild(s); return s; });
    txtLayer.appendChild(box); return { tx, box, spans };
  });
  function renderTexts(t) {
    texts.forEach(({ tx, box, spans }) => {
      const on = t >= tx.from && t < tx.to; box.style.visibility = on ? 'visible' : 'hidden'; if (!on) return;
      const o = tx.out ? io(t, tx.out[0], tx.out[1], E.inOut) : 0;
      spans.forEach((s, i) => {
        const w = tx.words[i], hook = tx.style === 'hook';
        const a = io(t, w.t, w.t + (hook ? 0.22 : 0.34), hook ? E.expoOut : E.out);
        s.style.opacity = (a * (1 - o)).toFixed(3);
        const bl = (hook ? 0 : 2.2 * (1 - a)) + 1.6 * o;
        s.style.filter = bl > 0.02 ? 'blur(' + bl.toFixed(2) + 'px)' : 'none';
        s.style.transform = hook ? `scale(${(1 + 0.12 * (1 - a)).toFixed(4)})` : `translateY(${(4 * (1 - a) - 3 * o).toFixed(2)}px)`;
      });
    });
  }

  // ---------- graphics (SVG overlay)
  const ovl = $('ovl');
  const graphics = TL.graphics.map(g => {
    const G = el('g', { class: 'gr c-' + (g.color || 'w') }, ovl);
    const o = { g, G };
    if (g.type === 'arrow') { o.path = el('path', { class: 'ln', pathLength: 1 }, G); o.head = el('path', { class: 'ln' }, G); }
    if (g.type === 'callout') {
      o.ring = el('circle', { class: 'ring', r: 1.6 }, G); o.dot = el('circle', { class: 'dot', r: 1.5 }, G);
      o.ldr = el('path', { class: 'ln thin', pathLength: 1 }, G);
      o.tx = el('text', { class: 'lbl' }, G);
      o.tspans = g.label.map((l, i) => { const s = el('tspan', { dy: i ? 9.4 : 0 }, o.tx); s.textContent = l; return s; });
    }
    if (g.type === 'brackets') o.corners = [0, 1, 2, 3].map(() => el('path', { class: 'ln' }, G));
    if (g.type === 'tagline') { o.tx = el('text', { class: 'tagl', x: g.x, y: g.y }, G); o.tx.textContent = g.text; o.line = el('line', { class: 'ln thin', x1: g.x, y1: g.y + 5, x2: g.x, y2: g.y + 5 }, G); }
    if (g.type === 'rule') o.line = el('line', { class: 'ln thin', y1: g.y, y2: g.y }, G);
    if (g.type === 'logo') { o.img = document.createElementNS(NS, 'image'); o.img.setAttribute('href', 'assets/logo.png'); G.appendChild(o.img); }
    return o;
  });
  function renderGraphics(t) {
    graphics.forEach(o => {
      const g = o.g, on = t >= g.from && t < g.to;
      o.G.style.visibility = on ? 'visible' : 'hidden'; if (!on) return;
      if (g.type === 'arrow') {
        const [sx, sy] = g.start, [ex, ey] = anchor(g.end, t);
        const c1 = [sx - 16, sy + 36], c2 = [ex - 50, ey + 2];
        let dx = ex - c2[0], dy = ey - c2[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const tip = [ex - dx * g.gap, ey - dy * g.gap];
        o.path.setAttribute('d', `M${sx},${sy} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${tip[0].toFixed(2)},${tip[1].toFixed(2)}`);
        const pr = io(t, g.draw[0], g.draw[1], E.inOut);
        o.path.style.strokeDasharray = '1 1'; o.path.style.strokeDashoffset = (1 - pr).toFixed(4);
        const ao = g.out ? 1 - io(t, g.out[0], g.out[1], E.inOut) : 1;
        o.path.style.opacity = pr > 0.002 ? ao : 0;
        const hl = 5.2, an = 0.5, ca = Math.cos(an), sa = Math.sin(an);
        const b1 = [tip[0] - hl * (dx * ca - dy * sa), tip[1] - hl * (dy * ca + dx * sa)], b2 = [tip[0] - hl * (dx * ca + dy * sa), tip[1] - hl * (dy * ca - dx * sa)];
        o.head.setAttribute('d', `M${b1[0].toFixed(2)},${b1[1].toFixed(2)} L${tip[0].toFixed(2)},${tip[1].toFixed(2)} L${b2[0].toFixed(2)},${b2[1].toFixed(2)}`);
        o.head.style.opacity = (io(t, g.draw[1] - 0.06, g.draw[1] + 0.05, E.out) * ao).toFixed(3);
      }
      if (g.type === 'callout') {
        const p = anchor(g.point, t), eb = [p[0] + g.elbow[0], p[1] + g.elbow[1]], en = [eb[0] + g.len, eb[1]];
        const a = io(t, g.t, g.t + 0.14, E.out);
        o.dot.setAttribute('cx', p[0]); o.dot.setAttribute('cy', p[1]); o.dot.setAttribute('r', (1.5 * a).toFixed(3));
        const rp = clamp((t - g.t) / 0.45);
        o.ring.setAttribute('cx', p[0]); o.ring.setAttribute('cy', p[1]); o.ring.setAttribute('r', (1.6 + 5 * E.out(rp)).toFixed(3)); o.ring.style.opacity = (t >= g.t ? 0.6 * (1 - rp) : 0).toFixed(3);
        o.ldr.setAttribute('d', `M${p[0]},${p[1]} L${eb[0]},${eb[1]} L${en[0]},${en[1]}`);
        const lp = io(t, g.t + 0.06, g.t + 0.36, E.inOut);
        o.ldr.style.strokeDasharray = '1 1'; o.ldr.style.strokeDashoffset = (1 - lp).toFixed(4); o.ldr.style.opacity = lp > 0.002 ? 1 : 0;
        const right = g.len >= 0;
        o.tx.setAttribute('text-anchor', right ? 'start' : 'end');
        const lx = en[0] + (right ? 3.5 : -3.5);
        o.tspans.forEach((s, i) => { s.setAttribute('x', lx); });
        o.tx.setAttribute('y', (en[1] + 2.6 - 4.7 * (g.label.length - 1)).toFixed(2));
        const la = io(t, g.t + 0.26, g.t + 0.52, E.out);
        o.tx.style.opacity = la.toFixed(3); o.tx.setAttribute('transform', `translate(${((right ? 2.5 : -2.5) * (1 - la)).toFixed(2)} 0)`);
      }
      if (g.type === 'brackets') {
        const a = anchor(g.a, t), b = anchor(g.b, t);
        const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
        const k = io(t, g.t, g.t + 0.3, E.out), L = 14 * k, pad = 6 + 6 * (1 - k);
        const c = [[x0 - pad, y0 - pad, 1, 1], [x1 + pad, y0 - pad, -1, 1], [x0 - pad, y1 + pad, 1, -1], [x1 + pad, y1 + pad, -1, -1]];
        o.corners.forEach((p, i) => { const [x, y, sx, sy] = c[i]; p.setAttribute('d', `M${x + sx * L},${y} L${x},${y} L${x},${y + sy * L}`); p.style.opacity = k.toFixed(3); });
      }
      if (g.type === 'tagline') {
        const a = io(t, g.t, g.t + 0.3, E.out); o.tx.style.opacity = a.toFixed(3);
        o.line.setAttribute('x2', g.x + 118 * io(t, g.t, g.t + 0.4, E.inOut));
      }
      if (g.type === 'rule') { const k = io(t, g.t, g.t + 0.4, E.inOut), cx = (g.x1 + g.x2) / 2; o.line.setAttribute('x1', lerp(cx, g.x1, k)); o.line.setAttribute('x2', lerp(cx, g.x2, k)); }
      if (g.type === 'logo') {
        const a = io(t, g.t, g.t + 0.45, E.out), w = g.w * (0.94 + 0.06 * a), h = w * 740 / 945;
        o.img.setAttribute('x', g.x - w / 2); o.img.setAttribute('y', g.y - h / 2); o.img.setAttribute('width', w); o.img.setAttribute('height', h);
        o.img.style.opacity = a.toFixed(3);
      }
    });
  }

  // ---------- sheet (shot s5)
  const SH = TL.shots.find(s => s.type === 'sheet');
  const DW = SOLID.w, DH = SOLID.h;
  const DK = SH.drawing.w / DW;
  $('sil').setAttribute('d', SOLID.shapes.map(s => [s.outer, ...s.holes].map(r => 'M' + r.map(p => p[0] + ',' + p[1]).join('L') + 'Z').join('')).join(''));
  const secPaths = [...document.querySelectorAll('#secLines path')];
  const meta = secPaths.map(p => { const b = p.getBBox(), len = p.getTotalLength(); p.setAttribute('pathLength', '1'); const area = b.width * b.height; return { p, len, g: area > 40000 || b.width > 300 ? 0 : area > 6000 ? 1 : 2, x: b.x, y: b.y }; });
  const sched = [];
  { const [a, b] = SH.draw, span = b - a, wins = [[0, .55], [.2, .85], [.45, 1]];
    [0, 1, 2].forEach(gi => { const it = meta.filter(m => m.g === gi).sort((m, n) => (m.x + m.y * .3) - (n.x + n.y * .3)); const w0 = a + span * wins[gi][0], w1 = a + span * wins[gi][1];
      it.forEach((m, i) => { const d = Math.min(0.4, Math.max(0.1, m.len / SH.penSpeed)); sched.push({ p: m.p, st: it.length > 1 ? lerp(w0, w1 - d, i / (it.length - 1)) : w0, d }); }); }); }
  // dimensions live inside the drawing group (drawing px), so they zoom with it
  const dimsG = $('sdims');
  const dimEls = SH.dims.map(dm => {
    const g = el('g', {}, dimsG), v = dm.axis === 'v', off = dm.offset / DK;
    const [ax, ay] = dm.from, [bx, by] = dm.to;
    const p1 = v ? [ax + off, ay] : [ax, ay + off], p2 = v ? [ax + off, by] : [bx, ay + off];
    const ext = [el('line', { class: 'ext', pathLength: 1 }, g), el('line', { class: 'ext', pathLength: 1 }, g)];
    if (v) { [[ay, ext[0]], [by, ext[1]]].forEach(([y, e]) => { e.setAttribute('x1', ax - 4); e.setAttribute('y1', y); e.setAttribute('x2', p1[0] - 8); e.setAttribute('y2', y); }); }
    else { [[ax, ext[0]], [bx, ext[1]]].forEach(([x, e]) => { e.setAttribute('x1', x); e.setAttribute('y1', ay - 4); e.setAttribute('x2', x); e.setAttribute('y2', p1[1] - 8); }); }
    const ln = el('line', { class: 'dim' }, g);
    const ah = 3.2 / DK, aw = 1.3 / DK;
    const head = (x, y, d) => v ? `M${x - aw},${y + d * ah} L${x},${y} L${x + aw},${y + d * ah}` : `M${x + d * ah},${y - aw} L${x},${y} L${x + d * ah},${y + aw}`;
    const h = [el('path', { class: 'dim', d: head(p1[0], p1[1], 1) }, g), el('path', { class: 'dim', d: head(p2[0], p2[1], -1) }, g)];
    const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
    const tx = el('text', { class: 'dimtx', 'text-anchor': 'middle', 'font-size': (6.8 / DK).toFixed(2) }, g); tx.textContent = dm.label;
    if (v) { tx.setAttribute('x', mx - 3.5 / DK); tx.setAttribute('y', my); tx.setAttribute('transform', `rotate(-90 ${mx - 3.5 / DK} ${my})`); } else { tx.setAttribute('x', mx); tx.setAttribute('y', my - 3.5 / DK); }
    return { dm, ext, ln, h, tx, p1, p2, mx, my, g };
  });
  function renderSheet(t) {
    const s = SH, Z = s.zoom;
    document.querySelectorAll('#frameLines line').forEach((l, i) => { l.style.strokeDasharray = '1 1'; l.style.strokeDashoffset = (1 - io(t, s.from + 0.02 + i * .05, s.from + 0.5 + i * .05, E.inOut)).toFixed(4); l.style.opacity = 1 - io(t, Z.from, Z.from + 0.2); });
    // placement: settle scale, then zoom into the central zone so it fills the frame (match cut to s6)
    const st = 1 + (s.settle[2] - 1) * (1 - io(t, s.settle[0], s.settle[1], E.out));
    const zk = io(t, Z.from, Z.to, E.in);
    const cx0 = DW / 2, cy0 = DH / 2;
    const sc = DK * st * lerp(1, Z.scale, zk);
    const fx = lerp(s.drawing.x + cx0 * DK, 180, zk), fy = lerp(s.drawing.y + cy0 * DK, 320, zk);
    const px = lerp(cx0, Z.center[0], zk), py = lerp(cy0, Z.center[1], zk);
    $('dwg').setAttribute('transform', `translate(${fx.toFixed(3)} ${fy.toFixed(3)}) scale(${sc.toFixed(5)}) translate(${-px.toFixed(3)} ${-py.toFixed(3)})`);
    $('sil').style.opacity = (io(t, s.from, s.from + 0.08) * (1 - io(t, s.draw[0] + 0.05, s.draw[1], E.inOut)) * 0.9).toFixed(3);
    sched.forEach(x => { x.p.style.strokeDasharray = '1 1'; x.p.style.strokeDashoffset = (1 - io(t, x.st, x.st + x.d, E.sine)).toFixed(4); });
    const dout = 1 - io(t, s.dimsOut[0], s.dimsOut[1], E.inOut);
    dimEls.forEach(d => {
      const t0 = d.dm.t;
      d.ext.forEach(e => { e.style.strokeDasharray = '1 1'; e.style.strokeDashoffset = (1 - io(t, t0, t0 + 0.14, E.out)).toFixed(4); });
      const k = io(t, t0 + 0.06, t0 + 0.28, E.inOut);
      d.ln.setAttribute('x1', lerp(d.mx, d.p1[0], k)); d.ln.setAttribute('y1', lerp(d.my, d.p1[1], k)); d.ln.setAttribute('x2', lerp(d.mx, d.p2[0], k)); d.ln.setAttribute('y2', lerp(d.my, d.p2[1], k));
      d.ln.style.opacity = k > 0 ? 1 : 0;
      d.h.forEach(h => h.style.opacity = io(t, t0 + 0.24, t0 + 0.34, E.out).toFixed(3));
      d.tx.style.opacity = io(t, t0 + 0.26, t0 + 0.46, E.out).toFixed(3);
      d.g.style.opacity = dout.toFixed(3);
    });
  }

  // ---------- post: glow + grain
  function grainFrame(f) {
    const w = grain.width, h = grain.height, img = nctx.createImageData(w, h);
    let sd = (f * 9301 + 49297) % 233280 || 1;
    for (let i = 0; i < w * h; i++) { sd = (sd * 16807) % 2147483647; const v = 128 + ((sd / 2147483647) - .5) * 110; const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255; }
    nctx.putImageData(img, 0, 0);
  }

  // ---------- frame
  let T = 0, playing = false;
  function render(t) {
    T = t;
    const s = shotAt(t);
    $('bg').style.background = s.bg || '#000';
    // 3D
    const is3d = s.type === '3d';
    $('view3d').style.visibility = is3d ? 'visible' : 'hidden';
    if (is3d && s.space) {
      stars.style.opacity = (1 - io(t, s.space[0], s.space[1], E.inOut)).toFixed(3);
      stars.style.transform = `scale(${(1 + 0.1 * io(t, s.from, s.space[1], E.out)).toFixed(4)})`;
    } else stars.style.opacity = 0;
    if (is3d && P) {
      const c = camAt(s, t), sw = s.sweep ? io(t, s.from, s.to, E.lin) : 0;
      const fade = s.fadeIn ? io(t, s.fadeIn[0], s.fadeIn[1], E.sine) : 1;
      const glint = s.glintKeys ? keyed(s.glintKeys, t, 0) : (s.glint || 0) * Math.sin(Math.PI * clamp((t - s.from) / (s.to - s.from)));
      P.setObject(objAt(s, t));
      P.render({ pos: c.pos, target: c.target, fov: c.fov, exposure: Math.max(0.0001, fade * keyed(s.light, t, 1)), sweep: s.sweep ? lerp(s.sweep[0], s.sweep[1], sw) : 0.5, glint });
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.filter = 'blur(' + Math.round(glow.width / 90) + 'px) brightness(1.15)';
      gctx.drawImage(gl, 0, 0, glow.width, glow.height);
      const bl = blurAt(s, t);
      $('view3d').style.filter = bl > 0.01 ? 'blur(' + bl.toFixed(2) + 'px)' : 'none';
    } else if (P) {
      // keep the camera of the nearest 3D shot so p3d anchors stay valid
    }
    // images
    TL.shots.filter(x => x.type === 'image').forEach(x => {
      imgEls[x.id].forEach((n, i) => {
        const on = x === s; n.style.visibility = on ? 'visible' : 'hidden'; if (!on) return;
        const b = imgBox(x, i, t);
        n.style.left = b.x.toFixed(3) + 'px'; n.style.top = b.y.toFixed(3) + 'px'; n.style.width = b.w.toFixed(3) + 'px'; n.style.opacity = b.op.toFixed(3);
      });
    });
    $('vig').style.opacity = (s.type === '3d' || (s.type === 'image' && s.bg && s.bg !== '#ffffff' && s.bg !== '#ececec')) ? 1 : 0;
    // sheet
    const isSheet = s.type === 'sheet';
    $('sheet').style.visibility = isSheet ? 'visible' : 'hidden';
    if (isSheet) renderSheet(t);
    // overlays
    if (P && is3d) { P.setCam(camAt(s, t)); P.setObject(objAt(s, t)); }
    renderTexts(t); renderGraphics(t);
    // flash
    let fo = 0; TL.flashes.forEach(f => { fo = Math.max(fo, io(t, f.t[0], f.t[1], E.quadIn) * (1 - io(t, f.t[1], f.t[2], E.quadOut))); });
    $('flash').style.opacity = fo.toFixed(3);
    // grain over everything, lighter on the white sheet
    grainFrame(Math.floor(t * TL.fps));
    grain.style.opacity = (isSheet || s.bg === '#ffffff' || s.bg === '#ececec' ? 0.18 : 0.32).toFixed(2);
    if (MODE === 'page') { $('tc').textContent = t.toFixed(2).padStart(5, '0') + ' · ' + s.id; $('time').textContent = t.toFixed(2).replace('.', ',') + ' с'; $('scrub').value = Math.round(t * 1000); }
  }

  let K = 1;
  function fit() {
    K = screen.clientWidth / 360; stage.style.transform = 'scale(' + K + ')';
    const dpr = MODE === 'page' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const w = Math.round(360 * K), h = Math.round(640 * K);
    if (P) P.setSize(w, h, dpr);
    glow.width = Math.round(w * dpr / 2); glow.height = Math.round(h * dpr / 2);
    grain.width = 270; grain.height = 480;
    render(T);
  }
  new ResizeObserver(fit).observe(screen);
  window.__seek = v => { playing = false; render(v); return true; };
  window.__ready = () => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode ? i.decode().catch(() => {}) : null)]).then(() => { fit(); return !!P; });
  if (MODE === 'render') { fit(); return; }

  // ---------- playback with music + sfx
  const audio = $('sfx'), btn = $('play'), snd = $('snd');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = null, soundOn = false;
  playing = !reduce; T = reduce ? 8.9 : 0;
  const sync = () => { if (!soundOn) return; if (playing) { if (Math.abs(audio.currentTime - T) > 0.06) audio.currentTime = T; if (audio.paused) audio.play().catch(() => {}); } else audio.pause(); };
  const setPlaying = v => { playing = v; btn.textContent = v ? 'Пауза' : 'Пуск'; last = null; sync(); };
  setPlaying(playing);
  btn.addEventListener('click', () => setPlaying(!playing));
  snd.addEventListener('click', () => { soundOn = !soundOn; snd.textContent = soundOn ? 'Звук вкл' : 'Звук выкл'; snd.setAttribute('aria-pressed', soundOn); if (soundOn) { audio.currentTime = T; if (!playing) setPlaying(true); else sync(); } else audio.pause(); });
  $('scrub').addEventListener('input', e => { T = e.target.value / 1000; setPlaying(false); render(T); });
  function tick(now) { if (playing) { if (last != null) { T += (now - last) / 1000; if (T > TL.duration + 0.4) { T = 0; if (soundOn) audio.currentTime = 0; } } last = now; render(Math.min(T, TL.duration - 0.001)); sync(); } requestAnimationFrame(tick); }
  fit(); requestAnimationFrame(tick);
})();
