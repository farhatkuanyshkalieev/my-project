'use strict';
// Parts II–V (19.85 s → 52 s): voiced kinetic typography → obstacle walls →
// breakthrough → ascent of a wireframe mountain → summit title.
// Everything is keyed to the voiceover's word timestamps (VO below, seconds
// from VO start; the VO starts at film time V0).

const V0 = 20.0;
const A = s => V0 + s;
const P2S = 19.85;
const DIVE = 19.0;

const VO = [
  ['Всё', 0.08, 0.40], ['начинается', 0.48, 1.20], ['с', 1.36, 1.44], ['точки.', 1.52, 2.12],
  ['Одна', 2.48, 2.80], ['искра', 2.96, 3.36], ['—', 3.52, 3.56],
  ['в', 3.60, 3.68], ['полной', 3.76, 4.16], ['темноте.', 4.24, 5.16],
  ['Идея', 5.36, 5.76], ['хрупкая…', 5.84, 6.64],
  ['её', 6.80, 7.04], ['легко', 7.16, 7.44], ['потерять.', 7.52, 8.32],
  ['Но', 8.467, 8.56], ['дай', 8.64, 8.80], ['ей', 8.88, 9.04], ['движение', 9.24, 9.84], ['—', 10.0, 10.04],
  ['и', 10.08, 10.12], ['она', 10.16, 10.40], ['становится', 10.48, 11.04], ['линией.', 11.12, 11.92],
  ['Формой.', 12.08, 12.80], ['Ритмом.', 12.96, 13.56],
  ['А', 14.0, 14.04], ['потом', 14.08, 14.56], ['—', 14.8, 14.84],
  ['стены.', 14.88, 15.6], ['Сомнения.', 15.76, 16.68], ['Дедлайны.', 16.8, 17.84], ['Хаос.', 18.0, 18.68],
  ['Но', 18.88, 18.96], ['движение', 19.16, 19.76], ['не', 19.84, 19.92], ['остановить.', 20.0, 20.84],
  ['Оно', 20.96, 21.20], ['проходит', 21.28, 21.76], ['СКВОЗЬ.', 21.92, 22.8],
  ['Выше.', 22.96, 23.6], ['Быстрее.', 23.76, 24.6], ['К', 24.72, 24.76], ['вершине.', 24.8, 25.64],
  ['От', 26.4, 26.48], ['идеи', 26.56, 27.12], ['—', 27.28, 27.32], ['к', 27.36, 27.44], ['движению.', 27.64, 28.48],
];
const WT = i => A(VO[i][1]);
const DISP = i => VO[i][0].replace(/[.…]/g, '');

const FN = '600 86px "Inter Display"';
const FK = '800 116px "Inter Display"';
const LINES = [
  { w: [0, 1, 2, 3], out: A(2.40), style: 'dot', key: 3 },
  { w: [4, 5], out: A(3.56), style: 'spark', key: 5 },
  { w: [7, 8, 9], out: A(5.26), style: 'dark', key: 9 },
  { w: [10, 11], out: A(6.74), style: 'crack', key: 11 },
  { w: [12, 13, 14], out: A(8.40), style: 'dissolve', key: 14 },
  { w: [15, 16, 17, 18], out: A(10.04), style: 'motion', key: 18 },
  { w: [20, 21, 22, 23], out: A(11.98), style: 'line', key: 23 },
  { w: [24], out: A(12.90), style: 'form', key: 24, font: '900 178px "Inter Display"' },
  { w: [25], out: A(13.80), style: 'rhythm', key: 25, font: '900 178px "Inter Display"' },
  { w: [26, 27], out: A(14.80), style: 'tension', key: -1, font: '500 64px "Inter Display"' },
  { w: [33, 34, 35, 36], out: A(20.90), style: 'front', key: 34 },
  { w: [37, 38], out: A(21.86), style: 'fast', key: -1, font: '700 76px "Inter Display"' },
];

// walls: nearest-last; each slams in on its word
const WALLS = [
  { word: 'СТЕНЫ', vi: 29, pat: 'bricks' },
  { word: 'СОМНЕНИЯ', vi: 30, pat: 'question' },
  { word: 'ДЕДЛАЙНЫ', vi: 31, pat: 'clock' },
  { word: 'ХАОС', vi: 32, pat: 'chaos' },
];
const WW = 1500, WH = 860, WF = 900;               // wall size, projection focal
const SMASH = [A(21.05), A(21.35), A(21.65), A(21.92)]; // ХАОС, ДЕДЛАЙНЫ, СОМНЕНИЯ, СТЕНЫ
const ASC = { start: A(22.55), climb0: A(22.45), summit: A(25.64), final: A(26.4) };

const SP = {}; // precomputed part-2 data

// ---------------------------------------------------------------- init
function initPart2() {
  const r = rng(4242);
  const c = tctx;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  for (const L of LINES) {
    L.items = L.w.filter(i => VO[i][0] !== '—').map(i => {
      const key = i === L.key;
      const font = L.font || (key ? FK : FN);
      c.font = font; c.letterSpacing = L.style === 'tension' ? '10px' : '0px';
      const txt = L.style === 'tension' ? DISP(i).toUpperCase() : DISP(i);
      const chars = [];
      for (let k = 0; k < txt.length; k++) chars.push({ ch: txt[k], x: c.measureText(txt.slice(0, k)).width });
      return { i, txt, font, key, w: c.measureText(txt).width, ta: WT(i) - 0.05, chars };
    });
    const G = 30, extra = L.style === 'dot' ? 46 : 0;
    L.lay = [];
    for (let k = 0; k <= L.items.length; k++) {
      let tot = extra;
      for (let j = 0; j < k; j++) tot += L.items[j].w + (j ? G : 0);
      let x = CX - tot / 2;
      const xs = [];
      for (let j = 0; j < L.items.length; j++) { xs.push(x); if (j < k) x += L.items[j].w + G; }
      L.lay.push({ xs, end: (k ? x - G : x) + 24 });
    }
  }
  // crack strips for «хрупкая»
  const ck = LINES[3].items[1];
  const cracks = [];
  for (let k = 1; k < 8; k++) {
    const pts = [];
    const bx = ck.w * k / 8 + (r() - 0.5) * ck.w / 14;
    for (let s = 0; s <= 6; s++) pts.push([bx + (r() - 0.5) * 26, -120 + s * 26]);
    cracks.push(pts);
  }
  const left = [[-30, -120], [-30, 36]], right = [[ck.w + 30, -120], [ck.w + 30, 36]];
  const bounds = [left, ...cracks, right];
  SP.strips = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    const a = bounds[k], b = bounds[k + 1];
    SP.strips.push({ poly: [...a, ...b.slice().reverse()], jx: (r() - 0.5) * 12, jy: (r() - 0.5) * 14, jr: (r() - 0.5) * 0.07, fall: 0.6 + r() * 0.8 });
  }
  SP.cracks = cracks;
  // glyph point cloud for «потерять»
  const dk = LINES[4].items[2];
  const gc = mk(Math.ceil(dk.w) + 40, 200), gx = gc.getContext('2d');
  gx.font = dk.font; gx.fillStyle = '#fff'; gx.fillText(dk.txt, 20, 150);
  const id = gx.getImageData(0, 0, gc.width, gc.height).data;
  SP.pts = [];
  for (let y = 0; y < gc.height; y += 3) for (let x = 0; x < gc.width; x += 3) {
    if (id[(y * gc.width + x) * 4 + 3] > 120) SP.pts.push({ x: x - 20, y: y - 150, vx: 50 + r() * 140, vy: 30 + r() * 130, ph: r() * TAU, s: 1 + r() * 1.6 });
  }
  // sparks
  SP.sparks = [...Array(90)].map(() => ({ u: r(), v: r(), a: -Math.PI / 2 + (r() - 0.5) * 2.6, sp: 250 + r() * 750, w: r() < 0.7, l: 0.6 + r() * 0.8 }));
  SP.speed = [...Array(70)].map(() => ({ y: r() * H, sp: 1400 + r() * 2600, l: 80 + r() * 380, ph: r(), a: 0.08 + r() * 0.22 }));
  SP.dust = [...Array(120)].map(() => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 1.4, p: r() * TAU }));
  SP.stars = [...Array(360)].map(() => ({ x: r() * 2 - 1, y: r(), s: 0.6 + r() * 1.6, p: r() * TAU }));

  // walls: cached content + shards
  SP.wall = WALLS.map((wd, k) => {
    const cv = mk(WW, WH), wc = cv.getContext('2d');
    drawWallStatic(wc, wd, k, rng(900 + k));
    const shards = [];
    const NX = 8, NY = 5, gr = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const edge = i === 0 || j === 0 || i === NX || j === NY;
      gr.push([-WW / 2 + WW * i / NX + (edge ? 0 : (r() - 0.5) * 120), -WH / 2 + WH * j / NY + (edge ? 0 : (r() - 0.5) * 100)]);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const p00 = gr[j * (NX + 1) + i], p10 = gr[j * (NX + 1) + i + 1], p01 = gr[(j + 1) * (NX + 1) + i], p11 = gr[(j + 1) * (NX + 1) + i + 1];
      for (const tri of (r() < 0.5 ? [[p00, p10, p11], [p00, p11, p01]] : [[p00, p10, p01], [p10, p11, p01]])) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const d = Math.hypot(cx, cy) + 1;
        const sp = 500 + r() * 1300;
        shards.push({ tri: tri.map(p => [p[0] - cx, p[1] - cy]), cx, cy, vx: cx / d * sp + (r() - 0.5) * 300, vy: cy / d * sp + (r() - 0.5) * 300 - 200, vz: -(300 + r() * 1300), vr: (r() - 0.5) * 8 });
      }
    }
    return { cv, shards };
  });

  // terrain
  const TX0 = -3600, TX1 = 3600, TZ0 = 0, TZ1 = 8400, TS = 150;
  SP.tx = []; for (let x = TX0; x <= TX1; x += TS) SP.tx.push(x);
  SP.tz = []; for (let z = TZ0; z <= TZ1; z += TS) SP.tz.push(z);
  SP.th = SP.tz.map(z => SP.tx.map(x => terrainH(x, z)));
  SP.path = [];
  for (let k = 0; k <= 400; k++) { const u = k / 400; const p = pathPoint(u); SP.path.push(p); }

  // final title layout
  c.font = '900 150px "Inter Display"'; c.letterSpacing = '6px';
  const l1 = 'ОТ ИДЕИ', l2 = 'К ДВИЖЕНИЮ';
  const w1 = c.measureText(l1).width, w2 = c.measureText(l2).width;
  const wx = (s, w, sub) => CX - w / 2 + c.measureText(s.slice(0, s.indexOf(sub))).width;
  SP.fin = {
    w1, w2,
    words: [
      { txt: 'ОТ', x: wx(l1, w1, 'ОТ'), y: 430, t: WT(44), w: c.measureText('ОТ').width },
      { txt: 'ИДЕИ', x: wx(l1, w1, 'ИДЕИ'), y: 430, t: WT(45), w: c.measureText('ИДЕИ').width },
      { txt: 'К', x: wx(l2, w2, 'К '), y: 600, t: WT(47), w: c.measureText('К').width },
      { txt: 'ДВИЖЕНИЮ', x: wx(l2, w2, 'ДВИЖЕНИЮ'), y: 600, t: WT(48), w: c.measureText('ДВИЖЕНИЮ').width, big: true },
    ],
  };
  c.font = '500 22px "Inter"'; c.letterSpacing = '9px';
  const st = 'MOTION DESIGN  ·  SHOWREEL 2026';
  const sw = c.measureText(st).width;
  SP.sub = [...st].map((ch, i) => ({ ch, x: CX - sw / 2 + c.measureText(st.slice(0, i)).width, st: A(28.7) + i * 0.022 + 0.18 }));
  c.restore();
  buildEvents2();
}

function terrainH(x, z) {
  const ZP = 5200;
  let h = 1650 * Math.exp(-((x / 1000) ** 2 + ((z - ZP) / 1700) ** 2));
  h += 760 * Math.exp(-(((x + 2300) / 760) ** 2 + ((z - 5900) / 1000) ** 2));
  h += 640 * Math.exp(-(((x - 2400) / 820) ** 2 + ((z - 5000) / 1000) ** 2));
  h += 420 * Math.exp(-(((x - 1300) / 600) ** 2 + ((z - 3300) / 800) ** 2));
  h += 380 * Math.exp(-(((x + 1500) / 650) ** 2 + ((z - 2800) / 900) ** 2));
  const rid = 1 - Math.abs(Math.sin(x * 0.0041 + Math.sin(z * 0.0023) * 1.7) * Math.cos(z * 0.0037 + x * 0.0011));
  h += 150 * rid * rid * (0.4 + h / 1650);
  h += 40 * Math.sin(x * 0.013 + z * 0.007) * Math.cos(z * 0.011);
  return h - 160;
}
function pathPoint(u) {
  const z = lerp(700, 5200, u);
  const x = 230 * Math.sin(z * 0.0016) * (1 - u) ** 0.7;
  return [x, terrainH(x, z) + 28, z];
}

// ---------------------------------------------------------------- audio cue sheet for part 2
function buildEvents2() {
  const ev = EVENTS;
  ev.push({ t: DIVE, type: 'dive', end: P2S });
  ev.push({ t: P2S, type: 'cut' });
  ev.push({ t: V0, type: 'vo' });
  for (const L of LINES) for (const it of L.items) ev.push({ t: it.ta, type: it.key ? 'keyIn' : 'wordIn', s: L.style });
  for (const L of LINES) ev.push({ t: L.out, type: 'lineOut', s: L.style });
  ev.push({ t: A(2.96), type: 'spark' });
  ev.push({ t: A(4.24), type: 'darkFx', end: A(5.2) });
  ev.push({ t: A(6.12), type: 'crack' });
  ev.push({ t: A(6.74), type: 'fall' });
  ev.push({ t: A(7.70), type: 'dissolve', end: A(8.3) });
  ev.push({ t: A(9.19), type: 'zip' });
  ev.push({ t: A(11.07), type: 'laser' });
  ev.push({ t: A(11.55), type: 'lineExt' });
  LINES[7].items[0].chars.forEach((ch, k) => ev.push({ t: WT(24) - 0.05 + k * 0.045 + 0.2, type: 'drop', k }));
  ev.push({ t: A(12.91), type: 'stutter' });
  ev.push({ t: A(13.96), type: 'tension', end: A(14.84) });
  WALLS.forEach((wd, k) => ev.push({ t: WT(wd.vi), type: 'wall', k }));
  ev.push({ t: A(18.84), type: 'charge', end: A(20.96) });
  SMASH.forEach((s, k) => ev.push({ t: s, type: 'smash', k }));
  ev.push({ t: A(22.30), type: 'whiteout', end: A(22.55) });
  ev.push({ t: A(22.5), type: 'ascent', end: ASC.summit });
  [A(22.96), A(23.76), A(24.72)].forEach((t, k) => ev.push({ t, type: 'accent', k }));
  ev.push({ t: ASC.summit, type: 'summit' });
  SP.fin.words.forEach((w, k) => ev.push({ t: w.t, type: w.big ? 'finalHit' : 'slam', k }));
  SP.sub.forEach(s => { if (s.ch !== ' ') ev.push({ t: s.st, type: 'tick', g: 0.2 }); });
  ev.push({ t: A(29.4), type: 'shine', end: A(30.3) });
  ev.push({ t: A(27.64), type: 'pad2', end: 52.0 });
  ev.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- kinetic lines
function lineLayout(L, t) {
  let k = 0;
  for (const it of L.items) if (t >= it.ta) k++;
  const tk = k ? L.items[k - 1].ta : 0;
  const b = k ? E.outExpo(prog(t, tk, tk + 0.45)) : 1;
  const A0 = L.lay[Math.max(0, k - 1)], A1 = L.lay[k];
  return { k, xs: A1.xs.map((x, j) => lerp(A0.xs[j], x, b)), end: lerp(A0.end, A1.end, b) };
}
function txtAt(c, it, x, y, col, alpha, sc = 1, ls = '0px') {
  c.save();
  c.font = it.font; c.letterSpacing = ls;
  c.translate(x + it.w / 2, y); c.scale(sc, sc);
  c.fillStyle = rgba(col, alpha);
  c.fillText(it.txt, -it.w / 2, 0);
  c.restore();
}
const BASE = CY + 34;

function cursorDot(t) {
  // the warm dot rides at the end of lines 1–3, then goes out in «темноте»
  if (t < P2S || t > A(5.3)) return null;
  const L1 = LINES[0], L2 = LINES[1], L3 = LINES[2];
  const end = L => lineLayout(L, t).end;
  const by = BASE - 9;
  let x, y;
  if (t < L2.items[0].ta) {
    x = t < L1.items[0].ta ? CX : end(L1);
    y = lerp(CY, by, E.inOutCubic(prog(t, P2S + 0.05, L1.items[0].ta + 0.2)));
  } else if (t < L3.items[0].ta) {
    const l1end = L1.lay[L1.items.length].end;
    x = lerp(l1end, end(L2), E.outExpo(prog(t, L2.items[0].ta, L2.items[0].ta + 0.45))); y = by;
  } else {
    const l2end = L2.lay[L2.items.length].end;
    x = lerp(l2end, end(L3), E.outExpo(prog(t, L3.items[0].ta, L3.items[0].ta + 0.45))); y = by;
  }
  const fade = 1 - E.inCubic(prog(t, A(4.35), A(5.05)));
  const pop = t < P2S + 0.25 ? 1 + 0.6 * (1 - prog(t, P2S, P2S + 0.25)) : 1;
  const col = WT(3) <= t && t < L1.out ? 1 + 0.35 * Math.exp(-(t - WT(3)) * 8) : 1;
  return { x, y, r: 9 * pop * col, a: fade };
}

function drawLine(c, L, t) {
  const first = L.items[0].ta;
  if (t < first - 0.02 || t > L.out + 0.9) return;
  const lay = lineLayout(L, t);
  const by = L.style === 'front' ? CY + 330 : BASE;
  const n = L.items.length;
  const dot = cursorDot(t);
  L.items.forEach((it, j) => {
    if (t < it.ta) return;
    const age = t - it.ta;
    const a = prog(t, it.ta, it.ta + 0.3);
    const e = E.outExpo(a);
    let x = lay.xs[j], y = by + (1 - e) * 50, alpha = E.outCubic(a), sc = it.key ? lerp(1.2, 1, e) : 1;
    let col = it.key ? WHITE : [196, 212, 240];
    const xj = prog(t, L.out + j * 0.035, L.out + j * 0.035 + 0.26); // exit
    const st = L.style;
    if (st === 'dot') {
      if (t > L.out) { // collapse into the dot
        const q = E.inExpo(prog(t, L.out - 0.05, L.out + 0.22));
        const cxw = x + it.w / 2;
        c.save(); c.translate(lerp(cxw, dot ? dot.x : CX, q), lerp(y, dot ? dot.y : y, q)); c.scale(1 - 0.95 * q, 1 - 0.95 * q);
        c.font = it.font; c.fillStyle = rgba(mixc(col, WARM, q), alpha * (1 - q * 0.8)); c.fillText(it.txt, -it.w / 2, 0); c.restore();
        return;
      }
      txtAt(c, it, x, y, col, alpha, sc);
      return;
    }
    if (st === 'spark' && it.key) col = mixc(WARM, WHITE, prog(t, it.ta + 0.1, it.ta + 0.7));
    if (st === 'dark') {
      const dk = prog(t, A(4.3) + (n - 1 - j) * 0.12, A(4.95) + (n - 1 - j) * 0.12);
      alpha *= 1 - 0.85 * E.inOutSine(dk);
      col = mixc(col, STEEL, dk);
      if (it.key) { // tracking opens as the word sinks into darkness
        const ls = 22 * E.outCubic(dk);
        c.save(); c.font = it.font; c.letterSpacing = `${ls}px`;
        const ww = c.measureText(it.txt).width;
        c.fillStyle = rgba(col, alpha * (1 - xj));
        c.fillText(it.txt, x, y - 20 * xj);
        c.restore();
        return;
      }
    }
    if (st === 'crack' && it.key) { drawCrackWord(c, it, x, y, alpha, t, L); return; }
    if (st === 'dissolve' && it.key) { drawDissolveWord(c, it, x, y, alpha, t, L); return; }
    if (st === 'motion') {
      const drift = -46 * Math.max(0, t - WT(18));
      x += drift;
      if (it.key) {
        const ent = tt => (1 - E.outExpo(prog(tt, it.ta, it.ta + 0.42))) * 900;
        for (let g = 7; g >= 1; g--) {
          const off = ent(t - g * 0.014);
          if (off < 2) continue;
          txtAt(c, it, x + off, BASE, WHITE, 0.16 * (1 - g / 8) * (1 - xj));
        }
        x += ent(t);
        y = BASE;
        alpha = prog(t, it.ta, it.ta + 0.08);
      }
      if (t > L.out) { // zip off to the left with ghosts
        const zx = tt => -1700 * E.inExpo(prog(tt, L.out + j * 0.03, L.out + j * 0.03 + 0.3));
        for (let g = 1; g <= 6; g++) txtAt(c, it, x + zx(t - g * 0.012), y, col, 0.14 * (1 - g / 7));
        txtAt(c, it, x + zx(t), y, col, alpha);
        return;
      }
    }
    if (st === 'line' && it.key) { drawLineWord(c, it, x, y, alpha, t, L); return; }
    if (st === 'form') { drawFormWord(c, it, x, t, L); return; }
    if (st === 'rhythm') { drawRhythmWord(c, it, x, t, L); return; }
    if (st === 'tension') {
      col = STEEL;
      x += (hash(Math.floor(t * 60) + j) - 0.5) * 3;
      if (t > L.out) return;
      c.save(); c.globalAlpha = 0.35; c.font = it.font; c.letterSpacing = '10px';
      c.fillStyle = rgba(ICE, alpha); c.fillText(it.txt, x + 4, y + 1); c.restore();
      c.save(); c.font = it.font; c.letterSpacing = '10px'; c.fillStyle = rgba(col, alpha); c.fillText(it.txt, x, y); c.restore();
      return;
    }
    if (st === 'front') {
      if (t > L.out) { // blown outward by the launch
        const q = E.inCubic(prog(t, L.out, L.out + 0.35));
        txtAt(c, it, CX + (x + it.w / 2 - CX) * (1 + q * 1.4) - it.w / 2, y + q * 160, col, alpha * (1 - q), 1 + q * 1.2);
        return;
      }
    }
    if (st === 'fast') {
      const q = prog(t, it.ta, L.out + 0.2);
      const s2 = 1 + 0.9 * E.inCubic(q);
      txtAt(c, it, CX + (x + it.w / 2 - CX) * s2 - it.w / 2, CY + (y - CY) * s2, col, alpha * (1 - prog(t, L.out - 0.1, L.out + 0.15)), s2);
      return;
    }
    // default exit: lift and fade, staggered
    txtAt(c, it, x, y - 60 * E.inCubic(xj), col, alpha * (1 - xj), sc);
  });
  if (L.style === 'spark') drawSparks(c, L, t, lay);
  if (L.style === 'line') drawLineRules(c, L, t, lay);
}

function drawSparks(c, L, t, lay) {
  const it = L.items[1];
  const t0 = it.ta + 0.04;
  if (t < t0 || t > t0 + 1.6) return;
  const x0 = lay.xs[1];
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const s of SP.sparks) {
    const a = t - t0;
    if (a > s.l) continue;
    const px = x0 + s.u * it.w, py = BASE - 20 - s.v * 70;
    const vx = Math.cos(s.a) * s.sp, vy = Math.sin(s.a) * s.sp;
    const k = 2.2;
    const dx = vx * (1 - Math.exp(-k * a)) / k, dy = vy * (1 - Math.exp(-k * a)) / k + 420 * a * a;
    const vxx = vx * Math.exp(-k * a), vyy = vy * Math.exp(-k * a) + 840 * a;
    const al = 1 - a / s.l;
    c.strokeStyle = rgba(s.w ? WARM : HOT, al); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(px + dx, py + dy); c.lineTo(px + dx - vxx * 0.022, py + dy - vyy * 0.022); c.stroke();
  }
  c.restore();
}

function drawCrackWord(c, it, x, y, alpha, t, L) {
  const tc = A(6.12);
  const d = E.outExpo(prog(t, tc, tc + 0.18));
  const fall = prog(t, L.out - 0.04, L.out + 0.7);
  c.save(); c.font = it.font;
  for (const s of SP.strips) {
    const fy = 1500 * fall * fall * s.fall, fr = s.jr * 14 * fall;
    c.save();
    c.translate(x + s.jx * d + (s.jx * 6) * fall, y + s.jy * d + fy);
    c.rotate(s.jr * d + fr);
    c.beginPath(); s.poly.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.clip();
    c.fillStyle = rgba(WHITE, alpha * (1 - fall));
    c.fillText(it.txt, 0, 0);
    c.restore();
  }
  // crack glints
  const g = (t > tc ? Math.exp(-(t - tc) * 4) : 0) * (1 - fall);
  if (g > 0.01) {
    c.strokeStyle = rgba(ICE, g); c.lineWidth = 1.5;
    for (const cr of SP.cracks) { c.beginPath(); cr.forEach((p, k) => (k ? c.lineTo(x + p[0], y + p[1]) : c.moveTo(x + p[0], y + p[1]))); c.stroke(); }
  }
  c.restore();
}

function drawDissolveWord(c, it, x, y, alpha, t, L) {
  const t0 = A(7.70), t1 = A(8.30);
  const f = lerp(-30, it.w + 30, prog(t, t0, t1));
  c.save();
  c.beginPath(); c.rect(x + f, 0, W, H); c.clip();
  c.font = it.font; c.fillStyle = rgba(WHITE, alpha); c.fillText(it.txt, x, y);
  c.restore();
  if (t < t0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const p of SP.pts) {
    if (p.x > f) continue;
    const tr = t0 + (p.x + 30) / (it.w + 60) * (t1 - t0);
    const age = t - tr;
    if (age < 0 || age > 1.3) continue;
    const px = x + p.x + p.vx * age + Math.sin(p.ph + age * 5) * 10 * age;
    const py = y + p.y - p.vy * age - 40 * age * age;
    const al = (1 - age / 1.3) * 0.9;
    c.fillStyle = rgba(age < 0.15 ? WHITE : ICE, al);
    c.fillRect(px, py, p.s, p.s);
  }
  c.restore();
}

function drawLineWord(c, it, x, y, alpha, t, L) {
  const d = E.inOutCubic(prog(t, it.ta, it.ta + 0.55));
  const fill = prog(t, it.ta + 0.35, it.ta + 0.7);
  const xj = prog(t, L.out, L.out + 0.26);
  c.save(); c.font = it.font;
  c.setLineDash([2200, 2200]); c.lineDashOffset = 2200 * (1 - d);
  c.strokeStyle = rgba(ICE, (1 - xj) * 0.95); c.lineWidth = 2;
  c.strokeText(it.txt, x, BASE - 60 * E.inCubic(xj));
  c.setLineDash([]);
  c.fillStyle = rgba(WHITE, fill * (1 - xj));
  c.fillText(it.txt, x, BASE - 60 * E.inCubic(xj));
  c.restore();
}
function drawLineRules(c, L, t, lay) {
  const it = L.items[3];
  const t0 = it.ta + 0.45;
  if (t < t0) return;
  const p = E.outExpo(prog(t, t0, t0 + 0.5));
  const q = E.inCubic(prog(t, L.out - 0.1, L.out + 0.3));
  const yy = BASE - 30;
  const xl = lay.xs[0] - 30, xr = lay.xs[3] + it.w + 30;
  c.strokeStyle = rgba(ICE, 0.8 * (1 - q)); c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(lerp(xl, CX, q), yy); c.lineTo(lerp(xl, -20, p) * (1 - q) + CX * q, yy);
  c.moveTo(lerp(xr, CX, q), yy); c.lineTo(lerp(xr, W + 20, p) * (1 - q) + CX * q, yy);
  c.stroke();
}

function drawFormWord(c, it, x, t, L) {
  const xj = E.inCubic(prog(t, L.out, L.out + 0.3));
  c.save(); c.font = it.font;
  it.chars.forEach((ch, k) => {
    const td = it.ta + k * 0.045;
    if (t < td) return;
    const p = prog(t, td, td + 0.42);
    const yy = lerp(-460, 0, E.outBack(p));
    c.fillStyle = rgba(WHITE, Math.min(1, p * 4) * (1 - xj));
    c.fillText(ch.ch, x + ch.x, BASE + 20 + yy - 80 * xj);
  });
  c.restore();
  // morphing frame: rectangle → ellipse → diamond
  const bw = it.w / 2 + 70, bh = 125;
  const N = 160;
  const rect = resample([[-bw, -bh], [bw, -bh], [bw, bh], [-bw, bh]], N);
  const ell = [...Array(N)].map((_, k) => { const a = -Math.PI * 3 / 4 + k / N * TAU; return [Math.cos(a) * bw * 1.08, Math.sin(a) * bh * 1.25]; });
  const dia = resample([[-bw * 1.1, 0], [0, -bh * 1.5], [bw * 1.1, 0], [0, bh * 1.5]], N);
  const shift = (arr, k) => arr.map((_, i) => arr[(i + k) % N]);
  const seq = [rect, shift(ell, 0), shift(dia, N - N / 8)];
  const m1 = E.inOutCubic(prog(t, it.ta + 0.28, it.ta + 0.48)), m2 = E.inOutCubic(prog(t, it.ta + 0.56, it.ta + 0.74));
  const pts = seq[0].map((p, i) => {
    const a = [lerp(p[0], seq[1][i][0], m1), lerp(p[1], seq[1][i][1], m1)];
    return [CX + lerp(a[0], seq[2][i][0], m2) * (1 + 0.6 * xj), BASE - 40 + lerp(a[1], seq[2][i][1], m2) * (1 + 0.6 * xj)];
  });
  c.strokeStyle = rgba(ICE, 0.85 * (1 - xj)); c.lineWidth = 2;
  strokePartial(c, pts, E.outCubic(prog(t, it.ta, it.ta + 0.3)));
  c.fillStyle = rgba(WHITE, 0.9 * (1 - xj));
  for (let k = 0; k < N; k += N / 4) { const p = pts[k]; c.fillRect(p[0] - 3, p[1] - 3, 6, 6); }
}

function drawRhythmWord(c, it, x, t, L) {
  const xj = E.inCubic(prog(t, L.out, L.out + 0.3));
  const env = prog(t, it.ta, it.ta + 0.12);
  c.save(); c.font = it.font;
  it.chars.forEach((ch, k) => {
    const b = Math.abs(Math.sin(Math.PI * (t - it.ta) / 0.25 - k * 0.42));
    const yy = -44 * b * env * (1 - prog(t, L.out - 0.2, L.out));
    c.fillStyle = rgba(WHITE, env * (1 - xj));
    c.fillText(ch.ch, x + ch.x, BASE + 20 + yy + 500 * xj * xj * (1 + k * 0.15));
  });
  c.restore();
  // equaliser
  const nb = 56, bw = 14, gx = CX - nb * (bw + 6) / 2, gy = BASE + 110;
  const beat = Math.exp(-(((t - it.ta) % 0.25) / 0.08));
  for (let k = 0; k < nb; k++) {
    const hh = (6 + 70 * hash(k * 7 + Math.floor(t * 30)) * (0.4 + 0.6 * beat) * (1 - Math.abs(k - nb / 2) / nb)) * env * (1 - xj);
    c.fillStyle = rgba(k % 7 === 0 ? WHITE : ICE, 0.75);
    c.fillRect(gx + k * (bw + 6), gy - hh, bw, hh);
  }
}

// ---------------------------------------------------------------- part II background
function drawBG2(c, t) {
  c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(CX, CY, 0, CX, CY, 1000);
  g.addColorStop(0, 'rgba(14,26,56,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const fin = prog(t, P2S + 0.1, P2S + 1.2);
  // parallax dot field
  const dx = -(t - P2S) * 14;
  c.fillStyle = rgba(ICE, 0.07 * fin);
  for (let x = ((dx % 80) + 80) % 80; x < W; x += 80) for (let y = 20; y < H; y += 80) c.fillRect(x - 1, y - 1, 2, 2);
  for (const d of SP.dust) {
    const x = ((d.x - (t - P2S) * 18 * d.z) % W + W) % W, y = ((d.y - (t - P2S) * 6 * d.z) % H + H) % H;
    c.fillStyle = rgba(ICE, 0.22 * fin * (0.5 + 0.5 * Math.sin(t * 1.3 + d.p)));
    c.fillRect(x, y, d.z * 1.4, d.z * 1.4);
  }
  // speed lines once «движение» arrives
  const sl = prog(t, WT(18), WT(18) + 0.3) * (1 - prog(t, A(11.9), A(12.3)));
  if (sl > 0) {
    for (const s of SP.speed) {
      const x = W - frac(s.ph + (t - WT(18)) * s.sp / (W + 600)) * (W + 600);
      c.fillStyle = rgba(ICE, s.a * sl); c.fillRect(x, s.y, s.l, 1.2);
    }
  }
}
function drawVoWave(c, t, alpha) {
  if (alpha <= 0) return;
  const f = Math.floor((t - V0) * FPS);
  const nb = 90, w = 4, gap = 3, x0 = CX - nb * (w + gap) / 2, y0 = H - 118;
  for (let k = 0; k < nb; k++) {
    const fi = f - (nb - 1 - k) * 2;
    const v = fi >= 0 && fi < VOENV.length ? VOENV[fi] : 0;
    const hh = 2 + 34 * v;
    c.fillStyle = rgba(k > nb - 4 ? WHITE : ICE, alpha * (0.25 + 0.6 * k / nb));
    c.fillRect(x0 + k * (w + gap), y0 - hh / 2, w, hh);
  }
  c.font = MONO(12); c.letterSpacing = '3px'; c.textAlign = 'center';
  c.fillStyle = rgba(STEEL, 0.7 * alpha);
  c.fillText('VOICE · ' + timecode(Math.max(0, t - V0)).slice(6), CX, y0 + 40);
  c.textAlign = 'left'; c.letterSpacing = '0px';
}

// ---------------------------------------------------------------- walls
function drawWallStatic(c, wd, k, r) {
  c.fillStyle = 'rgba(6,10,22,0.97)'; c.fillRect(0, 0, WW, WH);
  const g = c.createLinearGradient(0, 0, WW, WH);
  g.addColorStop(0, 'rgba(60,100,180,0.10)'); g.addColorStop(1, 'rgba(20,40,90,0.02)');
  c.fillStyle = g; c.fillRect(0, 0, WW, WH);
  c.lineWidth = 1;
  if (wd.pat === 'bricks') {
    c.strokeStyle = 'rgba(150,214,255,0.13)';
    for (let y = 0, row = 0; y < WH; y += 54, row++) for (let x = (row % 2) * -60; x < WW; x += 120) c.strokeRect(x + 3, y + 3, 114, 48);
  } else if (wd.pat === 'question') {
    c.font = '700 54px "Inter Display"';
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(150,214,255,${0.06 + r() * 0.14})`; c.save(); c.translate(r() * WW, r() * WH); c.rotate((r() - 0.5) * 0.8); c.fillText('?', 0, 0); c.restore(); }
  } else if (wd.pat === 'clock') {
    c.strokeStyle = 'rgba(150,214,255,0.16)';
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? 330 : 300; c.beginPath(); c.moveTo(WW / 2 + Math.cos(a) * r0, WH / 2 + Math.sin(a) * r0); c.lineTo(WW / 2 + Math.cos(a) * 350, WH / 2 + Math.sin(a) * 350); c.stroke(); }
    c.beginPath(); c.arc(WW / 2, WH / 2, 360, 0, TAU); c.stroke();
  } else {
    c.strokeStyle = 'rgba(150,214,255,0.12)';
    for (let i = 0; i < 120; i++) { c.beginPath(); c.moveTo(r() * WW, r() * WH); for (let s = 0; s < 4; s++) c.lineTo(r() * WW, r() * WH); c.stroke(); }
  }
  c.strokeStyle = 'rgba(150,214,255,0.75)'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, WW - 3, WH - 3);
  c.fillStyle = 'rgba(150,214,255,0.9)';
  for (const [x, y] of [[0, 0], [WW, 0], [WW, WH], [0, WH]]) c.fillRect(x - 7, y - 7, 14, 14);
  c.font = MONO(20); c.letterSpacing = '4px'; c.fillStyle = 'rgba(140,162,200,0.85)';
  c.fillText(`OBSTACLE ${String(k + 1).padStart(2, '0')} / 04`, 40, 52);
  c.textAlign = 'right'; c.fillText(['STATIC', 'UNCERTAIN', 'T-MINUS', 'ENTROPY'][k], WW - 40, 52);
  c.textAlign = 'center';
  c.font = `900 ${wd.word.length > 6 ? 196 : 250}px "Inter Display"`; c.letterSpacing = '8px';
  c.fillStyle = 'rgba(228,238,255,0.95)';
  c.fillText(wd.word, WW / 2, WH / 2 + (wd.word.length > 6 ? 70 : 90));
  c.textAlign = 'left'; c.letterSpacing = '0px';
}
function wallDyn(c, k, t) { // per-frame overlay, wall-local coords (centered)
  const wd = WALLS[k];
  if (wd.pat === 'clock') {
    const a = Math.floor((t - WT(wd.vi)) * 4) / 4 * TAU / 4 - Math.PI / 2;
    c.strokeStyle = 'rgba(228,238,255,0.6)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 300, Math.sin(a) * 300); c.stroke();
    const left = Math.max(0, 3.2 - (t - WT(wd.vi)));
    c.font = MONO(30); c.textAlign = 'center'; c.fillStyle = 'rgba(150,214,255,0.9)';
    c.fillText(`-00:00:0${Math.floor(left)}:${String(Math.floor(frac(left) * 60)).padStart(2, '0')}`, 0, WH / 2 - 50);
    c.textAlign = 'left';
  } else if (wd.pat === 'chaos') {
    const f = Math.floor(t * 30);
    c.strokeStyle = 'rgba(150,214,255,0.35)'; c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 0; i < 26; i++) { c.moveTo((hash(f + i) - 0.5) * WW, (hash(f * 3 + i) - 0.5) * WH); c.lineTo((hash(f * 7 + i) - 0.5) * WW, (hash(f * 5 + i) - 0.5) * WH); }
    c.stroke();
  } else if (wd.pat === 'question') {
    c.font = '800 80px "Inter Display"'; c.fillStyle = 'rgba(150,214,255,0.5)';
    const f = Math.floor(t * 8);
    for (let i = 0; i < 3; i++) c.fillText('?', (hash(f + i * 13) - 0.5) * WW * 0.9, (hash(f * 2 + i) - 0.5) * WH * 0.8);
  }
}
function wallZ(k, t) {
  let z = 300;
  for (let j = k + 1; j < WALLS.length; j++) z += 380 * E.outExpo(prog(t, WT(WALLS[j].vi), WT(WALLS[j].vi) + 0.5));
  return z;
}
function wallDrop(k, t) {
  const tk = WT(WALLS[k].vi);
  if (t < tk) return -1400 * (1 - E.inCubic(prog(t, tk - 0.2, tk)));
  return 22 * Math.exp(-(t - tk) * 9) * Math.sin((t - tk) * 42);
}
function camZAt(t) {
  const keys = [[A(18.86), 0], [A(20.9), -260], [SMASH[0], 0], [SMASH[1], 380], [SMASH[2], 760], [SMASH[3], 1140], [A(22.6), 2300]];
  if (t <= keys[0][0]) return 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, za] = keys[i], [tb, zb] = keys[i + 1];
    if (t <= tb) {
      const p = prog(t, ta, tb);
      const e = i === 0 ? E.outCubic(p) : i === 1 ? E.inCubic(p) : i === keys.length - 2 ? E.outCubic(p) : p;
      return lerp(za, zb, e);
    }
  }
  return keys[keys.length - 1][1];
}
const smashOf = k => SMASH[WALLS.length - 1 - k];   // wall k is broken at…

function drawWalls(c, t) {
  const camZ = camZAt(t);
  const order = [0, 1, 2, 3].sort((a, b) => wallZ(b, t) - wallZ(a, t)); // far → near
  const front = prog(t, WT(33) - 0.1, WT(33) + 0.3) * (1 - prog(t, A(20.9), A(21.1)));
  for (const k of order) {
    const tk = WT(WALLS[k].vi);
    if (t < tk - 0.2) continue;
    const Z = wallZ(k, t) - camZ;
    const sm = smashOf(k);
    if (t < sm) {
      if (Z < 30) continue;
      const s = WF / (WF + Z);
      c.save();
      c.translate(CX, CY + wallDrop(k, t) * s);
      c.scale(s, s);
      c.rotate(0.012 * Math.sin(t * 0.7 + k));
      c.drawImage(SP.wall[k].cv, -WW / 2, -WH / 2);
      wallDyn(c, k, t);
      if (front > 0) { c.fillStyle = `rgba(0,0,0,${0.4 * front})`; c.fillRect(-WW / 2, -WH / 2, WW, WH); }
      c.restore();
    } else {
      const a = t - sm;
      if (a > 1.4) continue;
      for (const sh of SP.wall[k].shards) {
        const z = wallZ(k, sm) + sh.vz * a - camZ;
        if (z < 40) continue;
        const s = WF / (WF + z);
        const px = sh.cx + sh.vx * a, py = sh.cy + sh.vy * a + 900 * a * a;
        c.save();
        c.translate(CX + px * s, CY + py * s);
        c.scale(s, s); c.rotate(sh.vr * a);
        c.beginPath(); sh.tri.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
        c.globalAlpha = clamp(1 - a / 1.3);
        c.save(); c.clip(); c.drawImage(SP.wall[k].cv, -WW / 2 - sh.cx, -WH / 2 - sh.cy); c.restore();
        c.strokeStyle = rgba(ICE, 0.9); c.lineWidth = 2 / s; c.stroke();
        c.restore();
      }
    }
  }
}

function drawCharge(c, t) {
  if (t < WT(33) - 0.1 || t > A(22.4)) return;
  const ch = prog(t, WT(33), A(20.96));
  const s = WF / (WF + 300);
  // converging rings
  if (t < A(21.0)) {
    for (let k = 0; k < 3; k++) {
      const ph = frac((t - WT(33)) * (1.2 + 2.2 * ch) + k / 3);
      const rr = lerp(340, 18, E.inCubic(ph));
      c.strokeStyle = rgba(WARM, 0.6 * ph * prog(t, WT(33), WT(33) + 0.3)); c.lineWidth = 2;
      c.beginPath(); c.arc(CX, CY, rr, 0, TAU); c.stroke();
    }
  }
  // launch streaks
  if (t > A(20.96)) {
    const sp = prog(t, A(20.96), A(21.2)) * (1 - prog(t, A(22.2), A(22.5)));
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const th = hash(i) * TAU, ph = frac(hash(i * 3) + (t - A(20.96)) * (1.4 + hash(i * 5) * 1.8));
      const r0 = 60 + ph * ph * 1300, r1 = r0 + 40 + 260 * ph;
      c.strokeStyle = rgba(i % 6 ? ICE : WARM, 0.5 * sp * ph); c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(CX + Math.cos(th) * r0, CY + Math.sin(th) * r0); c.lineTo(CX + Math.cos(th) * r1, CY + Math.sin(th) * r1); c.stroke();
    }
    c.restore();
  }
  // smash shock rings
  SMASH.forEach((sm, k) => {
    if (t < sm || t > sm + 0.7) return;
    const p = E.outExpo((t - sm) / 0.7);
    c.strokeStyle = rgba(mixc(WARM, ICE, p), (1 - p) * 0.9); c.lineWidth = 8 * (1 - p) + 1;
    c.beginPath(); c.arc(CX, CY, 30 + p * (k === 3 ? 1400 : 900), 0, TAU); c.stroke();
  });
  const pulse = 1 + 0.25 * Math.sin((t - WT(33)) * (8 + 26 * ch)) * ch;
  glowDot(c, CX, CY, (8 + 6 * ch) * s * pulse * 1.3, (90 + 160 * ch) * pulse, 1 + 0.5 * ch);
}

function drawSkvoz(c, t) {
  const t0 = WT(39) - 0.03;
  if (t < t0 || t > A(22.6)) return;
  const inP = E.outExpo(prog(t, t0, t0 + 0.22));
  const fly = E.inExpo(prog(t, A(22.2), A(22.58)));
  const s = lerp(1.7, 1, inP) * (1 + 5 * fly);
  c.save(); c.translate(CX, CY); c.scale(s, s);
  c.font = '900 300px "Inter Display"'; c.letterSpacing = '12px'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = rgba(WHITE, (1 - fly) * Math.min(1, inP * 2));
  c.fillText('СКВОЗЬ', 0, 10);
  c.strokeStyle = rgba(ICE, (1 - fly)); c.lineWidth = 2; c.strokeText('СКВОЗЬ', 0, 10);
  c.restore();
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.letterSpacing = '0px';
}

// ---------------------------------------------------------------- ascent: wireframe mountain
function ascentCam(t) {
  const p = prog(t, ASC.climb0, ASC.summit);
  const u = 0.32 * p + 0.68 * p * p;
  const dot = pathPoint(u);
  const look = pathPoint(Math.min(1, u + 0.12));
  let cam = [dot[0] * 0.6, dot[1] + 430, dot[2] - 1350];
  let tgt = [look[0] * 0.5, look[1] + 140, look[2] + 400];
  const top = pathPoint(1);
  const e = E.inOutCubic(prog(t, A(25.2), A(27.2)));
  const orbit = 0.10 * Math.max(0, t - A(26.0)) * (1 - 0.5 * prog(t, A(30), 52));
  const ce = [top[0] + Math.sin(orbit) * 2600, top[1] + 760, top[2] - Math.cos(orbit) * 2600];
  const te = [top[0], top[1] + 690, top[2]];
  cam = cam.map((v, i) => lerp(v, ce[i], e));
  tgt = tgt.map((v, i) => lerp(v, te[i], e));
  return { cam, tgt, u: t >= ASC.summit ? 1 : u, dot: t >= ASC.summit ? top : dot };
}
function mkView(cam, tgt, f = 1000) {
  const fw = norm3([tgt[0] - cam[0], tgt[1] - cam[1], tgt[2] - cam[2]]);
  const rt = norm3(cross3([0, 1, 0], fw));
  const up = cross3(fw, rt);
  return p => {
    const d = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
    const z = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2];
    const x = d[0] * rt[0] + d[1] * rt[1] + d[2] * rt[2];
    const y = d[0] * up[0] + d[1] * up[1] + d[2] * up[2];
    return [CX + x * f / z, CY - y * f / z, z];
  };
}
const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function drawAscent(c, t) {
  const { cam, tgt, u, dot } = ascentCam(t);
  const P = mkView(cam, tgt);
  // sky
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#01020a'); sky.addColorStop(0.6, '#081430'); sky.addColorStop(1, '#0c1d40');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  const yaw = Math.atan2(tgt[0] - cam[0], tgt[2] - cam[2]);
  const pitch = Math.atan2(tgt[1] - cam[1], Math.hypot(tgt[0] - cam[0], tgt[2] - cam[2]));
  for (const s of SP.stars) {
    const x = ((s.x * 1.6 - yaw * 0.9) % 2 + 3) % 2 * W - W / 2;
    const y = s.y * H * 1.4 - 300 + pitch * 1400;
    c.fillStyle = rgba(WHITE, 0.25 + 0.35 * Math.sin(t * 2 + s.p));
    c.fillRect(x, y, s.s, s.s);
  }
  // moon (callback to the room)
  const mx = W * 0.87 - yaw * 500, my = 210 + pitch * 1300;
  const mg = c.createRadialGradient(mx, my, 0, mx, my, 260);
  mg.addColorStop(0, 'rgba(190,215,255,0.35)'); mg.addColorStop(1, 'rgba(190,215,255,0)');
  c.fillStyle = mg; c.fillRect(mx - 260, my - 260, 520, 520);
  c.fillStyle = '#dbe7ff'; c.beginPath(); c.arc(mx, my, 34, 0, TAU); c.fill();
  // summit glow (behind the mountain)
  const top = pathPoint(1);
  const sp = P([top[0], top[1], top[2]]);
  const sumK = prog(t, ASC.summit - 0.6, ASC.summit + 0.3);
  if (sp[2] > 0) {
    const sg = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 900);
    sg.addColorStop(0, rgba(WARM, 0.22 * sumK)); sg.addColorStop(0.35, rgba([60, 110, 220], 0.12)); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    // god rays
    if (t > ASC.summit) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const rk = prog(t, ASC.summit, ASC.summit + 1.2);
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI / 2 + (i - 8.5) * 0.14 + 0.03 * Math.sin(t * 0.6 + i);
        const len = 1400 * rk;
        const gr = c.createLinearGradient(sp[0], sp[1], sp[0] + Math.cos(a) * len, sp[1] + Math.sin(a) * len);
        gr.addColorStop(0, rgba(i % 3 ? ICE : WARM, 0.10)); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr;
        c.beginPath(); c.moveTo(sp[0], sp[1]);
        c.lineTo(sp[0] + Math.cos(a - 0.03) * len, sp[1] + Math.sin(a - 0.03) * len);
        c.lineTo(sp[0] + Math.cos(a + 0.03) * len, sp[1] + Math.sin(a + 0.03) * len);
        c.closePath(); c.fill();
      }
      c.restore();
    }
  }
  // terrain, painter's order far → near, filled quads give occlusion
  const tx = SP.tx, tz = SP.tz, th = SP.th;
  const PR = tz.map((z, j) => tx.map((x, i) => P([x, th[j][i], z])));
  const camFar = cam[2] < 4000;
  const rows = [...Array(tz.length - 1).keys()];
  if (camFar) rows.reverse();
  else rows.sort((a, b) => Math.abs(tz[b] - cam[2]) - Math.abs(tz[a] - cam[2]));
  c.lineWidth = 1;
  for (const j of rows) {
    for (let i = 0; i < tx.length - 1; i++) {
      const a = PR[j][i], b = PR[j][i + 1], d = PR[j + 1][i], e2 = PR[j + 1][i + 1];
      if (a[2] < 60 || b[2] < 60 || d[2] < 60 || e2[2] < 60) continue;
      const zz = (a[2] + e2[2]) / 2;
      if (zz > 9000) continue;
      const minx = Math.min(a[0], b[0], d[0], e2[0]), maxx = Math.max(a[0], b[0], d[0], e2[0]);
      if (maxx < -50 || minx > W + 50) continue;
      const hgt = (th[j][i] + th[j + 1][i + 1]) / 2;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(e2[0], e2[1]); c.lineTo(d[0], d[1]); c.closePath();
      c.fillStyle = '#040813'; c.fill();
      const al = 0.55 * clamp(1 - zz / 9000) * clamp(zz / 400);
      c.strokeStyle = rgba(mixc(BLUE, ICE, clamp(hgt / 1500)), al * (0.5 + 0.5 * clamp(hgt / 1200)));
      c.stroke();
    }
  }
  // warm trail along the ridge path
  const n = Math.floor(u * 400);
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [lw, al] of [[9, 0.18], [3, 1]]) {
    c.strokeStyle = rgba(WARM, al); c.lineWidth = lw;
    c.beginPath(); let on = false;
    for (let k = 0; k <= n; k++) {
      const q = P(SP.path[k]);
      if (q[2] < 60) { on = false; continue; }
      on ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); on = true;
    }
    const q = P(dot); if (q[2] > 60) c.lineTo(q[0], q[1]);
    c.stroke();
  }
  c.restore();
  const dp = P(dot);
  if (dp[2] > 60) {
    const sk = t > ASC.summit ? Math.exp(-(t - ASC.summit) * 3) : 0;
    const br = t > A(26) ? 1 + 0.12 * Math.sin((t - A(26)) * 3) : 1;
    glowDot(c, dp[0], dp[1], (9 + 10 * sk) * br, (110 + 500 * sk) * br, 1 + 0.6 * sk);
    if (t > ASC.summit && t < ASC.summit + 1.2) {
      const p = E.outExpo((t - ASC.summit) / 1.2);
      c.strokeStyle = rgba(mixc(WARM, ICE, p), 1 - p); c.lineWidth = 6 * (1 - p) + 1;
      c.beginPath(); c.ellipse(dp[0], dp[1], 40 + 1200 * p, (40 + 1200 * p) * 0.32, 0, 0, TAU); c.stroke();
    }
  }
  return dp;
}

function drawAscentWords(c, t) {
  // ВЫШЕ — letters stack upward
  const w1 = WT(40) - 0.04;
  if (t > w1 && t < WT(41)) {
    const xo = E.inCubic(prog(t, WT(41) - 0.18, WT(41) + 0.02));
    c.save(); c.font = '900 200px "Inter Display"'; c.letterSpacing = '14px';
    const s = 'ВЫШЕ', ww = c.measureText(s).width;
    [...s].forEach((ch, k) => {
      const tk = w1 + k * 0.05, p = E.outExpo(prog(t, tk, tk + 0.35));
      const x = CX - ww / 2 + c.measureText(s.slice(0, k)).width;
      c.fillStyle = rgba(WHITE, p * (1 - xo));
      c.fillText(ch, x, 380 + (1 - p) * 220 - (t - w1) * 60 - 500 * xo);
    });
    c.restore();
  }
  // БЫСТРЕЕ — skewed, horizontal motion smear
  const w2 = WT(41) - 0.04;
  if (t > w2 && t < WT(42)) {
    const xo = E.inExpo(prog(t, WT(42) - 0.2, WT(42)));
    const ent = tt => (1 - E.outExpo(prog(tt, w2, w2 + 0.3))) * -1400 + 1900 * E.inExpo(prog(tt, WT(42) - 0.2, WT(42)));
    c.save(); c.font = '900 190px "Inter Display"'; c.letterSpacing = '4px';
    const ww = c.measureText('БЫСТРЕЕ').width;
    for (let g = 6; g >= 0; g--) {
      const x = CX - ww / 2 + ent(t - g * 0.012);
      c.save(); c.translate(x, 380); c.transform(1, 0, -0.28, 1, 0, 0);
      c.fillStyle = rgba(WHITE, g ? 0.12 * (1 - g / 7) : 1 - xo * 0.3);
      c.fillText('БЫСТРЕЕ', 0, 0); c.restore();
    }
    c.restore();
  }
  // К ВЕРШИНЕ — calm, wide tracking closing in
  const w3 = WT(42) - 0.04;
  if (t > w3 && t < A(26.3)) {
    const p = E.outExpo(prog(t, w3, w3 + 0.6));
    const xo = E.inCubic(prog(t, A(25.8), A(26.3)));
    c.save(); c.font = '800 150px "Inter Display"';
    c.letterSpacing = `${lerp(60, 10, p)}px`;
    c.textAlign = 'center';
    c.fillStyle = rgba(WHITE, Math.min(1, p * 1.5) * (1 - xo));
    c.fillText('К ВЕРШИНЕ', CX, 360 - 200 * xo);
    c.restore();
  }
}

function drawFinalTitle(c, t) {
  if (t < SP.fin.words[0].t - 0.05) return;
  const F = SP.fin;
  const push = 1 + 0.04 * E.inOutSine(prog(t, A(27.6), 52));
  c.save(); c.translate(CX, CY); c.scale(push, push); c.translate(-CX, -CY);
  c.font = '900 150px "Inter Display"'; c.letterSpacing = '6px';
  for (const w of F.words) {
    if (t < w.t - 0.04) continue;
    const p = E.outExpo(prog(t, w.t - 0.04, w.t + 0.3));
    const s = lerp(w.big ? 2.2 : 1.7, 1, p);
    c.save(); c.translate(w.x + w.w / 2, w.y - 50); c.scale(s, s);
    c.fillStyle = rgba(WHITE, Math.min(1, p * 2));
    c.fillText(w.txt, -w.w / 2, 50);
    c.restore();
  }
  // light sweep
  if (t > A(29.4) && t < A(30.3)) {
    const sp = E.inOutCubic(prog(t, A(29.4), A(30.3)));
    const sx = lerp(CX - F.w2 / 2 - 300, CX + F.w2 / 2 + 300, sp);
    const g = c.createLinearGradient(sx - 170, 0, sx + 170, 0);
    g.addColorStop(0, 'rgba(210,235,255,0)'); g.addColorStop(0.5, 'rgba(220,240,255,0.9)'); g.addColorStop(1, 'rgba(210,235,255,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g;
    for (const w of F.words) c.fillText(w.txt, w.x, w.y);
    c.restore();
  }
  // warm rule grows from the centre on «движению»
  const lt = F.words[3].t;
  if (t > lt) {
    const p = E.outExpo(prog(t, lt + 0.05, lt + 0.75));
    const half = (F.w2 / 2 + 40) * p;
    const g = c.createLinearGradient(CX - half, 0, CX + half, 0);
    g.addColorStop(0, rgba(WARM, 0.2)); g.addColorStop(0.5, rgba(WARM, 1)); g.addColorStop(1, rgba(WARM, 0.2));
    c.strokeStyle = g; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(CX - half, 648); c.lineTo(CX + half, 648); c.stroke(); c.lineCap = 'butt';
    for (const sx of [-1, 1]) glowDot(c, CX + sx * half, 648, 4, 26, p * (1 - 0.6 * prog(t, lt + 0.75, lt + 1.2)));
  }
  // subtitle decode
  c.font = '500 22px "Inter"'; c.letterSpacing = '0px';
  const fr = Math.floor(t * 30);
  SP.sub.forEach((s, i) => {
    if (s.ch === ' ' || t < s.st - 0.18) return;
    const done = t >= s.st;
    c.fillStyle = done ? rgba(STEEL, 0.95) : rgba(ICE, 0.7);
    c.fillText(done ? s.ch : scrambleChar(fr * 31 + i), s.x, 712);
  });
  c.restore();
}

// ---------------------------------------------------------------- part II–V frame
function renderPart2(t) {
  const c = ctx;
  c.save();
  c.lineCap = 'butt'; c.lineJoin = 'round'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.letterSpacing = '0px';
  const sh = shake2(t);
  c.translate(sh[0], sh[1]);
  if (t < ASC.start) {
    drawBG2(c, t);
    // darkness closing in on «темноте»
    const dk = E.inOutSine(prog(t, A(4.3), A(5.1))) * (1 - prog(t, A(5.25), A(5.7)));
    if (dk > 0) { c.fillStyle = `rgba(0,0,0,${0.55 * dk})`; c.fillRect(-50, -50, W + 100, H + 100); }
    // walls phase backdrop: tunnel floor lines
    const wp = prog(t, A(14.6), A(15.0));
    if (wp > 0) {
      c.fillStyle = `rgba(0,0,0,${0.35 * wp})`; c.fillRect(-50, -50, W + 100, H + 100);
      const camZ = camZAt(t);
      c.strokeStyle = rgba(BLUE, 0.22 * wp); c.lineWidth = 1;
      c.beginPath();
      for (let k = -8; k <= 8; k++) { c.moveTo(CX + k * 40, CY + 60); c.lineTo(CX + k * 900, H + 40); }
      for (let z = 0; z < 6; z++) {
        const zz = frac(z / 6 - camZ / 2400) * 2400 + 100, s = WF / (WF + zz), y = CY + 60 + (H - CY) * s * 1.6;
        if (y < H + 20) { c.moveTo(0, y); c.lineTo(W, y); }
      }
      c.stroke();
      drawWalls(c, t);
    }
    for (const L of LINES) drawLine(c, L, t);
    const dot = cursorDot(t);
    if (dot && dot.a > 0.01) glowDot(c, dot.x, dot.y, dot.r, 95 * dot.a + 20, dot.a);
    drawCharge(c, t);
    drawSkvoz(c, t);
    // small editorial HUD
    const ha = prog(t, A(0.3), A(1.0)) * (1 - prog(t, A(20.8), A(21.1)));
    drawVoWave(c, t, ha);
    if (ha > 0) {
      const li = LINES.findIndex(L => t >= L.items[0].ta - 0.05 && t < L.out + 0.3);
      c.font = MONO(13); c.letterSpacing = '3px'; c.fillStyle = rgba(STEEL, 0.6 * ha);
      c.fillText('SHOWREEL / 2026 — PART II', 64, 78);
      c.textAlign = 'right';
      c.fillText(li >= 0 ? `LINE ${String(li + 1).padStart(2, '0')} / ${LINES.length}` : '', W - 64, 78);
      c.textAlign = 'left'; c.letterSpacing = '0px';
      c.strokeStyle = rgba(ICE, 0.35 * ha); c.lineWidth = 1.2;
      brackets(c, 36, 36, W - 36, H - 36, 30, 1);
    }
  } else {
    const dp = drawAscent(c, t);
    drawAscentWords(c, t);
    drawFinalTitle(c, t);
  }
  c.restore();
}

function shake2(t) {
  let x = 0, y = 0;
  const add = (t0, amp, k) => { if (t < t0 || t > t0 + 1.5) return; const e = amp * Math.exp(-(t - t0) * k); x += e * Math.sin(t * 93 + t0 * 7); y += e * Math.cos(t * 71 + t0 * 3); };
  WALLS.forEach(w => add(WT(w.vi), 16, 9));
  SMASH.forEach((s, k) => add(s, k === 3 ? 30 : 18, 8));
  add(A(6.12), 5, 14);
  add(ASC.summit, 14, 6);
  add(WT(48), 10, 7);
  if (t > A(18.88) && t < A(20.96)) { const k = prog(t, A(18.88), A(20.96)) * 3; x += k * Math.sin(t * 120); y += k * Math.cos(t * 97); }
  return [x, y];
}

// post-processing hooks consumed by post() in scene.js
const FX2 = {
  zoom(t) {
    let z = 0;
    if (t > DIVE && t < P2S) z += 0.22 * E.inExpo(prog(t, DIVE, P2S));
    if (t > A(20.96) && t < A(22.6)) z += 0.07 * prog(t, A(20.96), A(21.2));
    SMASH.forEach(s => { if (t > s) z += 0.07 * Math.exp(-(t - s) * 12); });
    if (t > A(22.2) && t < A(22.6)) z += 0.2 * E.inExpo(prog(t, A(22.2), A(22.55)));
    if (t > ASC.summit) z += 0.06 * Math.exp(-(t - ASC.summit) * 6);
    return z;
  },
  glitch(t) {
    let g = 0;
    for (const s of [A(6.12), WT(30), WT(32), A(14.0), SMASH[0], SMASH[1], SMASH[2]]) if (t >= s && t < s + 0.09) g = Math.max(g, 1 - (t - s) / 0.09);
    return g;
  },
  flash(t) { // [color, alpha]
    let a = 0, col = [255, 214, 160];
    if (t >= P2S && t < P2S + 0.12) a = Math.max(a, 0.3 * (1 - (t - P2S) / 0.12));
    SMASH.forEach((s, k) => { const v = (k === 3 ? 0.95 : 0.3) * Math.exp(-(t - s) * (k === 3 ? 22 : 16)); if (t >= s && v > a) { a = v; col = [220, 235, 255]; } });
    const wo = Math.max(0, 1 - Math.abs(t - A(22.55)) / 0.14) ** 1.5;
    if (wo > 0) { a = Math.max(a, wo); col = [230, 240, 255]; }
    if (t >= ASC.summit) a = Math.max(a, 0.55 * Math.exp(-(t - ASC.summit) * 7));
    if (t >= WT(48)) a = Math.max(a, 0.35 * Math.exp(-(t - WT(48)) * 9));
    return [col, a];
  },
  bloom(t) { return t > ASC.final ? 0.6 : 0.85; },
};
