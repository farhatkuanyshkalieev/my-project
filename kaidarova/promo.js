// Kaidarova (@kaidarova.ethnic) — fashion promo «Завёрнутые в любовь». 18 s vertical (1080×1920, 60 fps).
// Built on the founder's own sentence: «Я хотела, чтобы девушки были завёрнуты в любовь» (Nagima Kaidarova).
// 0–4 s   the sentence slams in word by word and locks into a type poster; ЗАВЁРНУТЫ is filled with their photo;
//         a band of their knitted MAHABBAT wraps the frame.
// 4–9 s   MAHABBAT // JAÑA TÜS: their new colours (burgundy, red × beige, the coat and scarf), cut on the beat.
// 9–13.8  OYU: their reel «Наши кардиганы "Ою" — это про связь» — braids, hands with rings, three generations.
// 13.8–   the sentence returns over the family; the logo closes with the author's credit.
// Every frame is f(t); clip frames are loaded by window.prep(t) before each render.

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2;
export const DUR = 18.0;
const T = { hook: 0, drop: 4.0, oyu: 9.0, pay: 13.8, fin: 15.5 };
const C = { burg: '#5B1826', deep: '#22080D', red: '#D3252C', beige: '#E7D3BC', cream: '#F4EDE3', ink: '#17110F', grey: '#8B8E93', gold: '#D9B26A' };

// ---------------------------------------------------------------- utils
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const col = (h, a = 1) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(4)})`; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const OS = (w, s) => `${w} ${s}px "Oswald"`;
const CG = (w, s) => `italic ${w} ${s}px "Cormorant"`;
const JO = (w, s) => `${w} ${s}px "Jost"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));
const out = document.getElementById('c');
const ctx = out.getContext('2d');
const lay = mk(W, H), lctx = lay.getContext('2d');
const IMG = {};

// ---------------------------------------------------------------- drawing helpers
// cover-fit an image into a rect; fx/fy is the image point kept at the rect centre, z zooms, dx/dy pan
function cover(c, img, rx, ry, rw, rh, o = {}) {
  const iw = img.width, ih = img.height, s = Math.max(rw / iw, rh / ih) * (o.z ?? 1);
  const dw = iw * s, dh = ih * s;
  let x = rx + rw / 2 - (o.fx ?? 0.5) * dw + (o.dx ?? 0), y = ry + rh / 2 - (o.fy ?? 0.5) * dh + (o.dy ?? 0);
  x = Math.min(rx, Math.max(rx + rw - dw, x)); y = Math.min(ry, Math.max(ry + rh - dh, y));
  c.save(); if (!o.noclip) { c.beginPath(); c.rect(rx, ry, rw, rh); c.clip(); }
  c.drawImage(img, x + (o.ox ?? 0), y, dw, dh); c.restore();
}
// same, smeared horizontally (motion blur) by `blur` px
function coverBlur(c, img, rx, ry, rw, rh, o, blur) {
  if (Math.abs(blur) < 1) return cover(c, img, rx, ry, rw, rh, o);
  const n = 9;
  c.save(); c.beginPath(); c.rect(rx, ry, rw, rh); c.clip();
  for (let i = 0; i < n; i++) { c.globalAlpha = 1 / (i + 1); cover(c, img, rx, ry, rw, rh, Object.assign({}, o, { ox: (i / (n - 1) - 0.5) * blur, noclip: true })); }
  c.restore();
}
function shade(c, y0, y1, a, colr = '#000000') {   // vertical gradient for legibility
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, col(colr, 0)); g.addColorStop(1, col(colr, a));
  c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
}
// letters fade/rise in one after another
function line(c, txt, t, t0, x, y, font, color, o = {}) {
  if (t < t0) return;
  const outT = o.out ?? 1e9, ko = 1 - prog(t, outT, outT + 0.2); if (ko <= 0) return;
  c.save(); c.font = font; c.letterSpacing = (o.ls || 0) + 'px'; c.textBaseline = 'alphabetic';
  const ch = [...txt], ws = ch.map(s => c.measureText(s).width + (o.ls || 0)), tw = ws.reduce((a, b) => a + b, 0) - (o.ls || 0);
  let px = o.align === 'left' ? x : o.align === 'right' ? x - tw : x - tw / 2;
  if (o.shadow !== false) { c.shadowColor = o.shadow || 'rgba(0,0,0,0.55)'; c.shadowBlur = o.blur ?? 18; c.shadowOffsetY = 2; }
  for (let i = 0; i < ch.length; i++) {
    const k = prog(t, t0 + i * (o.stag ?? 0.018), t0 + i * (o.stag ?? 0.018) + 0.3), e = E.outCubic(k);
    c.globalAlpha = k * ko * (o.alpha ?? 1); c.fillStyle = color; c.fillText(ch[i], px, y + (o.dy ?? 22) * (1 - e)); px += ws[i];
  }
  c.restore();
}
function fitSize(c, txt, font, maxW, ls = 0) { c.save(); c.font = font(100); c.letterSpacing = ls + 'px'; const w = c.measureText(txt).width; c.restore(); return 100 * maxW / w; }

// ---------------------------------------------------------------- textures from their knitwear
let KNIT = null, SCARF = null;
function buildTextures() {
  // the burgundy MAHABBAT knit (lower part of the hooded portrait)
  const f = IMG.burg_face; KNIT = mk(1024, 512);
  KNIT.getContext('2d').drawImage(f, 0, f.height * 0.70, f.width, f.height * 0.30, 0, 0, 1024, 512);
  // the beige/black MAHABBAT scarf (hanging strip in the coat shot)
  const s = IMG.scarf_coat; SCARF = mk(360, 1400);
  SCARF.getContext('2d').drawImage(s, s.width * SC.x0, s.height * SC.y0, s.width * (SC.x1 - SC.x0), s.height * (SC.y1 - SC.y0), 0, 0, 360, 1400);
}
const SC = { x0: 0.535, x1: 0.625, y0: 0.40, y1: 0.93 };     // scarf strip in scarf_coat (fractions)
// a band of knit, `w` wide, crossing the frame at angle `a` through (x, y), texture scrolling by `s`
function knitBand(c, x, y, a, w, s, tex = KNIT, dark = 0) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.rect(-1600, -w / 2, 3200, w); c.clip();
  const th = w, tw = tex.width * th / tex.height;
  for (let k = -1600 - ((s % tw) + tw) % tw; k < 1600; k += tw) c.drawImage(tex, k, -w / 2, tw + 1, th);
  if (dark) { c.fillStyle = `rgba(0,0,0,${dark})`; c.fillRect(-1600, -w / 2, 3200, w); }
  const g = c.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.12, 'rgba(0,0,0,0)'); g.addColorStop(0.88, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g; c.fillRect(-1600, -w / 2, 3200, w);
  c.restore();
}

// ---------------------------------------------------------------- 0–4 · the sentence
const POSTER = [];   // words with their final place in the type poster
function buildPoster() {
  const c = lctx, maxW = 960;
  const rows = [
    { words: ['Я ХОТЕЛА,', 'ЧТОБЫ'], f: s => OS(700, s), ls: 2 },
    { words: ['ДЕВУШКИ', 'БЫЛИ'], f: s => OS(700, s), ls: 2 },
    { words: ['ЗАВЁРНУТЫ'], f: s => OS(700, s), ls: 2, photo: true },
    { words: ['в любовь'], f: s => CG(700, s), ls: 0, italic: true },
  ];
  let y = 0; const placed = [];
  rows.forEach((r, ri) => {
    const full = r.words.join(' '), size = Math.min(r.italic ? 230 : 400, fitSize(c, full, r.f, maxW, r.ls));
    c.save(); c.font = r.f(size); c.letterSpacing = r.ls + 'px';
    const tw = c.measureText(full).width; let x = CX - tw / 2;
    const asc = size * (r.italic ? 0.62 : 0.80);
    y += asc + (ri ? size * 0.10 : 0);
    r.words.forEach(wd => { const ww = c.measureText(wd).width; placed.push({ txt: wd, f: r.f, ls: r.ls, size, x: x + ww / 2, y, photo: r.photo, italic: r.italic }); x += ww + c.measureText(' ').width; });
    y += size * (r.italic ? 0.30 : 0.16);
    c.restore();
  });
  const off = CY - 60 - y / 2;
  placed.forEach((p, i) => { p.y += off; p.t0 = [0, 0.5, 1.0, 1.5, 2.0, 3.0][i]; POSTER.push(p); });
}
function wordAt(c, p, t) {
  if (t < p.t0) return;
  // it slams in big at the centre, holds, then settles into its place in the poster
  c.save(); c.font = p.f(100); c.letterSpacing = p.ls + 'px'; const w100 = c.measureText(p.txt).width; c.restore();
  const big = Math.min(p.italic ? 260 : 380, 100 * 1000 / w100);
  const hold = p.txt === 'ЗАВЁРНУТЫ' ? 0.55 : p.italic ? 0.32 : 0.24;
  const m = E.inOutCubic(prog(t, p.t0 + hold, p.t0 + hold + 0.26));
  const slam = E.outExpo(prog(t, p.t0, p.t0 + 0.16));
  const s = lerp(big / p.size, 1, m) * lerp(1.35, 1, slam);
  const x = lerp(CX, p.x, m), y = lerp(CY + big * 0.32, p.y, m);
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = clamp(slam * 1.6);
  c.font = p.f(p.size); c.letterSpacing = p.ls + 'px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  if (p.photo) {
    // their hooded portrait inside the letters
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H);
    lctx.save(); lctx.translate(x, y); lctx.scale(s, s); lctx.font = c.font; lctx.letterSpacing = c.letterSpacing; lctx.textAlign = 'center'; lctx.fillStyle = '#fff'; lctx.fillText(p.txt, 0, 0); lctx.restore();
    lctx.globalCompositeOperation = 'source-in';
    const z = lerp(1.35, 1.0, E.outCubic(prog(t, p.t0, p.t0 + 1.4)));
    cover(lctx, IMG.red_full, 0, y - 420 * s, W, 560 * s, { fy: 0.55, z });
    lctx.globalCompositeOperation = 'source-over';
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = clamp(slam * 1.6); c.drawImage(lay, 0, 0);
    c.translate(x, y); c.scale(s, s);
    c.strokeStyle = col(C.cream, 0.9); c.lineWidth = 2.5 / s; c.strokeText(p.txt, 0, 0);
  } else {
    c.fillStyle = p.italic ? '#FFB9A6' : C.cream; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 6; c.fillText(p.txt, 0, 0);
  }
  c.restore();
}
function hookBg(c, t) {
  // their knitted MAHABBAT, huge and dark, drifting
  const z = 1.25 + 0.04 * t;
  c.save(); c.translate(CX, CY); c.rotate(-0.12); c.scale(z, z); c.translate(-CX, -CY);
  const tw = 1400, th = tw / 2;
  for (let yy = -th; yy < H + th; yy += th) for (let xx = -tw; xx < W + tw; xx += tw) c.drawImage(KNIT, xx - (t * 40) % tw + ((yy / th) % 2) * tw / 2, yy, tw, th);
  c.restore();
  c.fillStyle = 'rgba(30,6,11,0.80)'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, CY, 200, CX, CY, 1200); g.addColorStop(0, 'rgba(120,30,45,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function shotHook(c, t) {
  hookBg(c, t);
  line(c, 'KAIDAROVA', t, 0.1, CX, 170, JO(600, 40), col(C.cream, 0.8), { ls: 22, stag: 0.02 });
  for (const p of POSTER) wordAt(c, p, t);
  line(c, '— НАГИМА КАЙДАРОВА, ОСНОВАТЕЛЬНИЦА', t, 3.3, CX, 1720, JO(500, 40), C.cream, { ls: 5, stag: 0.008 });
  // a band of their knit wraps the frame (3.62 → 4.0)
  const k = prog(t, 3.62, 4.0);
  if (k > 0) {
    const e = E.inCubic(k), wB = lerp(60, 2600, e);
    knitBand(c, lerp(-200, CX, E.outCubic(k)), CY, -0.32, wB, t * 2600);
  }
}

// ---------------------------------------------------------------- 4–9 · MAHABBAT // JAÑA TÜS
const LOOK = [
  { t0: 4.0, n: '01', big: 'қаңық бургунди', small: 'ГЛУБОКИЙ БОРДОВЫЙ' },
  { t0: 5.0, n: '02' },
  { t0: 5.5, n: '03', big: 'қызыл · беж', small: 'КРАСНЫЙ И МЯГКИЙ БЕЖ' },
  { t0: 6.5, n: '04' },
  { t0: 7.0, n: '05', big: 'шектеулі топтама', small: 'ЛИМИТ · ВСЕГО 3 ШТУКИ' },
  { t0: 8.0, n: '06', big: 'жүн · жібек', small: 'ШЕРСТЬ И ШЁЛКОВАЯ ПОДКЛАДКА' },
];
function lookPhoto(c, t, i) {
  const lt = t - LOOK[i].t0;
  if (i === 0) {
    cover(c, IMG.burg_full, 0, 0, W, H, { fy: 0.42, z: lerp(1.18, 1.04, E.outExpo(clamp(lt / 0.7))) });
    const sp = E.outExpo(prog(t, 4.5, 4.72));
    if (sp > 0) {
      c.fillStyle = C.deep; c.fillRect(lerp(W, 532, sp), 0, W, H);
      cover(c, IMG.burg_half, lerp(W + 8, 548, sp), 0, 532, H, { fy: 0.45, z: lerp(1.15, 1.0, E.outCubic(prog(t, 4.5, 5.0))) });
    }
  } else if (i === 1) {
    cover(c, IMG.burg_face, 0, 0, W, H, { fy: 0.40, z: lerp(1.30, 1.06, E.outExpo(clamp(lt / 0.35))) });
    // MAHABBAT running up the left edge
    c.save(); c.translate(150, H + 80 - 520 * E.outCubic(clamp(lt / 0.5))); c.rotate(-Math.PI / 2); c.font = OS(700, 210); c.letterSpacing = '6px';
    c.lineWidth = 3; c.strokeStyle = col(C.cream, 0.85); c.strokeText('MAHABBAT', 0, 0); c.restore();
  } else if (i === 2) {
    cover(c, IMG.red_full, 0, 0, W, H, { fy: 0.45, z: lerp(1.12, 1.02, E.outExpo(clamp(lt / 0.6))) });
    const pk = E.outExpo(prog(t, 6.0, 6.22));
    if (pk > 0) {
      c.save(); c.translate(lerp(W + 400, 760, pk), 1060); c.rotate(0.05 * (1 - pk) + 0.035);
      c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 40; c.shadowOffsetY = 16; c.fillStyle = C.cream; c.fillRect(-212, -312, 424, 624); c.shadowColor = 'transparent';
      cover(c, IMG.red_arms, -200, -300, 400, 600, { fy: 0.45 }); c.restore();
    }
  } else if (i === 3) {
    const ims = [IMG.red_full, IMG.red_arms, IMG.red_wide], ww = W / 3;
    c.fillStyle = C.red; c.fillRect(0, 0, W, H);
    ims.forEach((im, j) => { const k = E.outExpo(prog(t, 6.5 + j * 0.07, 6.5 + j * 0.07 + 0.2)); if (k > 0) cover(c, im, j * ww + 3, lerp(-H, 0, k), ww - 6, H, { fy: 0.45 }); });
  } else if (i === 4) {
    cover(c, IMG.scarf_coat, 0, 0, W, H, { fy: 0.42, fx: 0.52, z: lerp(1.0, 1.10, E.inOutSine(clamp(lt / 1.0))) });
  } else if (i === 5) {
    const a = E.outExpo(prog(t, 8.0, 8.22)), b = E.outExpo(prog(t, 8.08, 8.3));
    c.fillStyle = C.deep; c.fillRect(0, 0, W, H);
    cover(c, IMG.coat_full, 0, lerp(-H, 0, a), 532, H, { fy: 0.45 });
    cover(c, IMG.coat_back, 548, lerp(H, 0, b), 532, H, { fy: 0.45 });
  }
}
function shotLook(c, t) {
  let i = 0; for (let j = 0; j < LOOK.length; j++) if (t >= LOOK[j].t0) i = j;
  // whip between 02 → 03 (burgundy → red)
  const wk = prog(t, 5.42, 5.58);
  if (wk > 0 && wk < 1) {
    const e = E.inOutCubic(wk), sh = -W * e;
    c.save(); c.translate(sh, 0); lookBlur(c, t, 1, 260 * Math.sin(Math.PI * e)); c.restore();
    c.save(); c.translate(W + sh, 0); lookBlur(c, Math.max(t, 5.5), 2, 260 * Math.sin(Math.PI * e)); c.restore();
  } else lookPhoto(c, t, i);
  // legibility + editorial furniture
  shade(c, 300, 0, 0.45); shade(c, 1380, H, 0.75);
  line(c, 'MAHABBAT // JAÑA TÜS', t, 4.05, 64, 150, JO(600, 40), C.cream, { ls: 6, align: 'left', stag: 0.01, out: 8.9 });
  const L = LOOK[i];
  c.save(); c.font = OS(600, 64); c.fillStyle = C.cream; c.textAlign = 'right'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16;
  c.fillText(L.n, W - 64, 160); c.font = JO(500, 30); c.globalAlpha = 0.75; c.fillText('/06', W - 64, 200); c.restore();
  for (let j = 0; j < LOOK.length; j++) {
    const Lj = LOOK[j]; if (!Lj.big) continue;
    const end = j === 5 ? 8.95 : (LOOK.find(x => x.t0 > Lj.t0 && x.big) || { t0: 9 }).t0 - 0.12;
    line(c, Lj.big, t, Lj.t0 + 0.12, CX, 1690, CG(700, 112), C.cream, { out: end, stag: 0.012 });
    line(c, Lj.small, t, Lj.t0 + 0.22, CX, 1790, JO(500, 42), col(C.cream, 0.95), { ls: 8, out: end, stag: 0.008 });
  }
  // scarf wipe into OYU (8.55 → 9.0)
  const k = prog(t, 8.55, 9.0);
  if (k > 0) { const e = E.inCubic(k); knitBand(c, lerp(-300, CX, E.outCubic(k)), CY, Math.PI / 2 - 0.08, lerp(80, 2400, e), -t * 2400, SCARF); }
}
function lookBlur(c, t, i, b) {
  const map = { 1: [IMG.burg_face, { fy: 0.40, z: 1.06 }], 2: [IMG.red_full, { fy: 0.45, z: 1.12 }] };
  const [im, o] = map[i]; coverBlur(c, im, 0, 0, W, H, o, b);
}

// ---------------------------------------------------------------- 9–13.8 · OYU (their reel)
const CLIPS = [
  { id: 'braid', t0: 9.0, n: 27, fy: 0.5 },
  { id: 'profile', t0: 9.9, n: 24, fy: 0.45 },
  { id: 'hands', t0: 10.7, n: 24, fy: 0.5 },
  { id: 'aje', t0: 11.5, n: 24, fy: 0.4 },
  { id: 'family', t0: 12.3, n: 45, fy: 0.45 },
];
const FR = new Map();
function clipFrame(cl, t) { return Math.max(1, Math.min(cl.n, 1 + Math.floor((t - cl.t0) * 30))); }
function frameKey(cl, f) { return `/build/frames/${cl.id}/${String(f).padStart(4, '0')}.jpg`; }
function neededFrames(t) {
  const need = [];
  CLIPS.forEach((cl, i) => {
    const t1 = i + 1 < CLIPS.length ? CLIPS[i + 1].t0 : DUR;
    if (t >= cl.t0 - 0.12 && t < t1 + 0.01) need.push(frameKey(cl, clipFrame(cl, t)));
  });
  return need;
}
window.prep = async t => {
  const need = neededFrames(t);
  for (const k of need) if (!FR.has(k)) { try { FR.set(k, await loadImg(k)); } catch (e) { console.error('missing frame ' + k); } }
  if (FR.size > 24) for (const k of [...FR.keys()]) if (!need.includes(k) && FR.size > 12) FR.delete(k);
};
function drawClip(c, cl, t, z) {
  const im = FR.get(frameKey(cl, clipFrame(cl, t))); if (!im) return;
  cover(c, im, 0, 0, W, H, { fy: cl.fy, z });
}
function shotOyu(c, t) {
  let i = 0; for (let j = 0; j < CLIPS.length; j++) if (t >= CLIPS[j].t0) i = j;
  const cl = CLIPS[i], lt = t - cl.t0;
  drawClip(c, cl, t, 1.0 + 0.05 * lt);
  // a short dissolve with a warm light leak into the next clip
  const nx = CLIPS[i + 1];
  if (nx && t > nx.t0 - 0.12) { const k = prog(t, nx.t0 - 0.12, nx.t0); c.save(); c.globalAlpha = E.inOutSine(k); drawClip(c, nx, nx.t0, 1.0); c.restore(); }
  leak(c, t, [9.0, 9.9, 10.7, 11.5, 12.3]);
  shade(c, 380, 0, 0.5); shade(c, 1350, H, 0.78);
  // OYU — their cardigans
  const ok = E.outExpo(prog(t, 9.05, 9.5));
  if (ok > 0 && t < T.pay) {
    c.save(); c.globalAlpha = ok * (1 - prog(t, T.pay - 0.25, T.pay)); c.font = OS(700, 250); c.letterSpacing = '60px'; c.textAlign = 'center';
    c.lineWidth = 4; c.strokeStyle = C.cream; c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 20;
    c.strokeText('OYU', CX + 30, lerp(330, 300, ok)); c.restore();
  }
  line(c, 'кардиганы «Ою» —', t, 9.15, CX, 1640, CG(700, 100), C.cream, { out: 11.38, stag: 0.012 });
  line(c, 'это про связь', t, 9.95, CX, 1745, CG(700, 100), '#FFD9B8', { out: 11.38, stag: 0.014 });
  line(c, 'әже · ана · қыз', t, 11.55, CX, 1660, CG(700, 116), C.cream, { out: T.pay - 0.15, stag: 0.014 });
  line(c, 'БАБУШКА · МАМА · ДОЧЬ', t, 11.7, CX, 1765, JO(500, 44), col(C.cream, 0.95), { ls: 10, out: T.pay - 0.15, stag: 0.008 });
}
function leak(c, t, cuts) {
  for (const t0 of cuts) {
    const k = prog(t, t0 - 0.08, t0 + 0.35); if (k <= 0 || k >= 1) continue;
    const a = Math.sin(Math.PI * k) * 0.55, x = lerp(-200, W + 200, k);
    c.save(); c.globalCompositeOperation = 'screen';
    const g = c.createRadialGradient(x, 500, 50, x, 500, 900); g.addColorStop(0, `rgba(255,170,90,${a})`); g.addColorStop(0.5, `rgba(255,90,60,${a * 0.4})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
}

// ---------------------------------------------------------------- 13.8–15.5 · the sentence returns
function shotPay(c, t) {
  const cl = CLIPS[4], lt = t - cl.t0;
  drawClip(c, cl, t, 1.0 + 0.05 * lt);
  c.fillStyle = `rgba(20,6,9,${0.35 * E.inOutSine(prog(t, T.pay, T.pay + 0.6))})`; c.fillRect(0, 0, W, H);
  shade(c, 1150, H, 0.85);
  line(c, 'завёрнутые', t, T.pay + 0.05, CX, 1440, CG(700, 150), C.cream, { stag: 0.02 });
  line(c, 'в любовь', t, T.pay + 0.3, CX, 1580, CG(700, 150), '#FFB9A6', { stag: 0.025 });
  line(c, 'НАГИМА КАЙДАРОВА', t, T.pay + 0.6, CX, 1745, JO(500, 46), C.cream, { ls: 8, stag: 0.01 });
  line(c, 'С 2014 · АСТАНА', t, T.pay + 0.75, CX, 1810, JO(500, 40), col(C.cream, 0.9), { ls: 8, stag: 0.01 });
}

// ---------------------------------------------------------------- 15.5–18 · logo
let FEATHER = null, WORD = null, TAG = null; const FW = 141.5, FH = 407.5, WM = { w: 248.2, h: 56.2 }, TG = { w: 321.2, h: 18.5 };
function shotFin(c, t) {
  const t0 = T.fin;
  // a cream curtain rises, led by a band of their knit
  const up = E.inOutCubic(prog(t, t0 - 0.2, t0 + 0.3)), top = lerp(H + 140, -160, up);
  if (up < 1) shotPay(c, t);
  c.save(); c.beginPath(); c.rect(0, top, W, H - top + 10); c.clip();
  c.fillStyle = C.cream; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, 900, 300, CX, 900, 1300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,40,40,0.10)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // their feather + wordmark (vectorised from the avatar), big and held
  const fk = E.outBack(prog(t, t0 + 0.2, t0 + 0.7)), fh = 620;
  if (fk > 0) { c.save(); c.translate(CX, 620); c.scale(fk, fk); c.rotate(0.12 * (1 - fk)); const s = fh / FH; c.scale(s, s); c.translate(-FW / 2, -FH / 2); c.fillStyle = C.burg; c.fill(FEATHER); c.restore(); }
  const wk = E.outCubic(prog(t, t0 + 0.45, t0 + 0.9)), hold = E.inOutSine(prog(t, t0 + 0.9, DUR));
  if (wk > 0) { const s = 800 / WM.w * (1 + 0.02 * hold); c.save(); c.globalAlpha = wk; c.translate(CX - WM.w * s / 2, 1170 - WM.h * s / 2 + 30 * (1 - wk)); c.scale(s, s); c.fillStyle = C.ink; c.fill(WORD); c.restore(); }
  const tk = E.outCubic(prog(t, t0 + 0.7, t0 + 1.1));
  if (tk > 0) { const s = 760 / TG.w; c.save(); c.globalAlpha = tk; c.translate(CX - TG.w * s / 2, 1360 + 16 * (1 - tk)); c.scale(s, s); c.fillStyle = '#3a2a28'; c.fill(TAG); c.restore(); }
  line(c, '@kaidarova.ethnic', t, t0 + 0.9, CX, 1520, JO(500, 46), C.burg, { ls: 4, shadow: false });
  line(c, 'made by @f4rh4t._', t, t0 + 1.1, CX, 1800, JO(500, 42), col(C.ink, 0.85), { ls: 4, shadow: false });
  c.restore();
  if (up < 1) knitBand(c, CX, top, 0, 150, t * 900);
}

// ---------------------------------------------------------------- frame
function flashAt(t, t0, d = 0.14, a = 0.6) { return t >= t0 && t < t0 + d ? a * (1 - (t - t0) / d) ** 2 : 0; }
const HITS = [[0, 8, 0.15], [0.5, 8, 0.15], [1.0, 8, 0.15], [1.5, 8, 0.15], [2.0, 16, 0.22], [3.0, 6, 0.15], [T.drop, 22, 0.3], [4.5, 8, 0.15], [5.0, 10, 0.18], [6.0, 6, 0.15], [6.5, 8, 0.18], [7.0, 10, 0.18], [8.0, 8, 0.18], [T.oyu, 10, 0.2], [T.fin + 0.2, 6, 0.2]];
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of HITS) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d, f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const [sx, sy] = shakeAt(t); ctx.save(); ctx.translate(sx, sy); ctx.scale(1.02, 1.02); ctx.translate(-W * 0.01, -H * 0.01);
  if (t < T.drop) shotHook(ctx, t);
  else if (t < T.oyu) shotLook(ctx, t);
  else if (t < T.pay) shotOyu(ctx, t);
  else if (t < T.fin - 0.2) shotPay(ctx, t);
  else shotFin(ctx, t);
  ctx.restore();
  post(t);
}
function post(t) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  const fl = Math.max(flashAt(t, T.drop, 0.2, 0.9), flashAt(t, 2.0, 0.12, 0.25), flashAt(t, 5.0, 0.1, 0.35), flashAt(t, 6.5, 0.1, 0.3), flashAt(t, 7.0, 0.12, 0.45), flashAt(t, T.oyu, 0.18, 0.5));
  if (fl > 0) { c.fillStyle = `rgba(255,248,240,${fl})`; c.fillRect(0, 0, W, H); }
  const v = c.createRadialGradient(CX, CY, 700, CX, CY, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.28)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.07; c.globalCompositeOperation = 'overlay'; c.drawImage(GRAIN[Math.floor(t * 24) % GRAIN.length], 0, 0, W, H); c.restore();
  const k0 = 1 - prog(t, 0, 0.12); if (k0 > 0) { c.fillStyle = `rgba(0,0,0,${k0})`; c.fillRect(0, 0, W, H); }
  const k1 = prog(t, DUR - 0.3, DUR); if (k1 > 0) { c.fillStyle = `rgba(0,0,0,${k1})`; c.fillRect(0, 0, W, H); }
}
const GRAIN = [];
function buildGrain() {
  for (let g = 0; g < 6; g++) {
    const cv = mk(540, 960), x = cv.getContext('2d'), d = x.createImageData(540, 960);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.floor(hash(i * 0.37 + g * 101.3) * 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); GRAIN.push(cv);
  }
}

// ---------------------------------------------------------------- cue sheet
function buildEvents() {
  [0, 0.5, 1.0, 1.5].forEach(t => ev(t, 'word')); ev(2.0, 'big'); ev(3.0, 'soft');
  ev(3.62, 'band', { end: 4.0 }); ev(T.drop, 'drop');
  ev(4.5, 'slide'); ev(5.0, 'cut'); ev(5.42, 'whip'); ev(6.0, 'slide'); ev(6.5, 'tri'); ev(7.0, 'cut'); ev(8.0, 'slide');
  ev(8.55, 'scarf', { end: 9.0 }); ev(T.oyu, 'oyu');
  [9.9, 10.7, 11.5, 12.3].forEach(t => ev(t, 'clip'));
  ev(T.pay, 'pay'); ev(T.fin - 0.2, 'curtain'); ev(T.fin + 0.2, 'logo'); ev(T.fin + 0.9, 'handle');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function loadImg(src) { const im = new Image(); im.src = src; await im.decode(); return im; }
async function boot() {
  const faces = await (await fetch('/fonts/faces.json')).json();
  for (const f of faces) { const ff = new FontFace(f.family, `url(/fonts/${f.file})`, { weight: f.weight, style: f.style, unicodeRange: f.range }); await ff.load(); document.fonts.add(ff); }
  await document.fonts.load(OS(700, 40), 'ЗАВЁРНУТЫ MAHABBAT'); await document.fonts.load(CG(700, 40), 'в любовь әже қыз'); await document.fonts.load(JO(500, 30), 'НАГИМА JAÑA TÜS');
  const path = async f => new Path2D((await (await fetch(f)).text()).match(/ d="([^"]+)"/)[1]);
  FEATHER = await path('/assets/kaidarova_feather.svg'); WORD = await path('/assets/kaidarova_wordmark.svg'); TAG = await path('/assets/kaidarova_tagline.svg');
  for (const k of ['burg_face', 'burg_full', 'burg_half', 'scarf_coat', 'coat_full', 'coat_back', 'red_full', 'red_arms', 'red_wide']) IMG[k] = await loadImg(`/promo/img/${k}.jpg`);
  buildGrain(); buildTextures(); buildPoster(); buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
