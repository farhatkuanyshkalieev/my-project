// Qazaq Republic — 10 s vertical brand reel (1080×1920, 60 fps) for @qazaq.republic.
// A different style from the street reels: clean flat Swiss / Bauhaus motion
// graphics, no grain. The hero is the dot from the «qr.» wordmark: it bounces
// the logo together, then hops through a week in Latin Kazakh (one day per
// beat, each with its own colour from the brand's palette, its own kinetic
// type trick, its own wipe and a flat-drawn garment with the little blue
// «qr» label), turns into a Bauhaus tile grid for «jaqsy kúnder.», a
// «Bári jaqsy bolady» badge, and lands as the period of the logo.
// Pure 2D canvas; every frame is a function of t.

const W = 1080, H = 1920, CX = 540, CY = 960, FPS = 60, TAU = Math.PI * 2, DUR = 10.0;
// film time (120 BPM: beat = 0.5 s)
const T = { b1: 0.5, b2: 1.0, land: 1.5, week: 2.0, drop: 5.5, band: 5.75, jaqsy: 6.0, kunder: 6.5, badge: 7.0, fin: 7.5, finLand: 8.0, name: 8.25, tag: 8.5, handles: 8.75, label: 9.0 };
const P = { B: '#1815CF', Bd: '#0F0B8F', W: '#FFFFFF', OW: '#F5F5FD', Y: '#F2B705', Bur: '#7A1F2B', Mel: '#D7D7DB', Nv: '#16224D', Kh: '#5B6142', Cr: '#F4EFE3', Ink: '#111111', Brn: '#B9783A' };
const DAYS = [
  { name: 'DÚISENBI', ru: 'ПОНЕДЕЛЬНИК', bg: P.B, fg: P.W, acc: P.Y, anim: 'rise', item: 'tee', ic: P.W, ii: P.B },
  { name: 'SEISENBI', ru: 'ВТОРНИК', bg: P.Y, fg: P.Nv, acc: P.B, anim: 'flip', item: 'hoodie', ic: P.Mel, ii: P.B },
  { name: 'SÁRSENBI', ru: 'СРЕДА', bg: P.Bur, fg: P.Cr, acc: P.Y, anim: 'stretch', item: 'cap', ic: P.Cr, ii: P.Bur },
  { name: 'BEISENBI', ru: 'ЧЕТВЕРГ', bg: P.Mel, fg: P.B, acc: P.Bur, anim: 'outline', item: 'tote', ic: P.Nv, ii: P.W },
  { name: 'JUMA', ru: 'ПЯТНИЦА', bg: P.Nv, fg: P.Y, acc: P.W, anim: 'slice', item: 'sock', ic: P.Y, ii: P.Nv },
  { name: 'SENBI', ru: 'СУББОТА', bg: P.OW, fg: P.B, acc: P.Y, anim: 'drop', item: 'sweat', ic: P.B, ii: P.W },
  { name: 'JEKSENBI', ru: 'ВОСКРЕСЕНЬЕ', bg: P.Kh, fg: P.Cr, acc: P.Y, anim: 'spin', item: 'beanie', ic: P.Brn, ii: P.Cr },
];
const INIT = ['D', 'S', 'S', 'B', 'J', 'S', 'J'];
const dayT = i => T.week + i * 0.5;

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
  inQuad: x => x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const spring = (t, t0, f = 3.0, z = 0.3) => { if (t <= t0) return 0; const a = t - t0; return 1 - Math.exp(-z * TAU * f * a) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * a); };
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const DISP = s => `900 ${s}px "Inter Display"`;
const ITB = s => `italic 900 ${s}px "Inter"`;
const MONO = (w, s) => `${w} ${s}px "JB Mono"`;
const VAR = s => `400 ${s}px "Graduate"`;
const EVENTS = [];
const ev = (t, type, o = {}) => EVENTS.push(Object.assign({ t, type }, o));

const out = document.getElementById('c');
const ctx = out.getContext('2d');
const LAYER = mk(W, H), lctx = LAYER.getContext('2d');   // previous-shot layer for wipes
const tmp = mk(W, H), tctx = tmp.getContext('2d');

// ---------------------------------------------------------------- the «qr.» wordmark (vector, three parts)
const LOGO = { q: null, r: null, dot: null, dc: [41.49, 18.88], dr: 4.97 };
function logoPart(c, part, x0, y0, s, color) {   // x0,y0: top-left of the 47×32 box; s: px per unit
  c.save(); c.translate(x0, y0); c.scale(s, s); c.fillStyle = color; c.fill(LOGO[part]); c.restore();
}
function logo(c, cx, cy, w, color) {
  const s = w / 47, x0 = cx - w / 2, y0 = cy - 16 * s;
  logoPart(c, 'q', x0, y0, s, color); logoPart(c, 'r', x0, y0, s, color); logoPart(c, 'dot', x0, y0, s, color);
}
// little woven label, as sewn on every QR garment
function wovenLabel(c, x, y, w, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const h = w * 0.56; c.fillStyle = P.B; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.08); c.fill();
  logo(c, 0, 0, w * 0.62, P.W); c.restore();
}

// ---------------------------------------------------------------- background system
function grid(c, color, a = 0.08) {
  c.save(); c.strokeStyle = col(color, a); c.lineWidth = 2;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * 180, 0); c.lineTo(i * 180, H); c.stroke(); }
  for (let j = 1; j < 11; j++) { c.beginPath(); c.moveTo(0, j * 180); c.lineTo(W, j * 180); c.stroke(); }
  c.restore();
}
function hud(c, color, left, right, k = 1) {
  return;   // no corner captions: they read as a template
  c.save(); c.globalAlpha = k; c.font = MONO(700, 24); c.letterSpacing = '4px'; c.fillStyle = col(color, 0.8); c.textBaseline = 'alphabetic';
  c.textAlign = 'left'; c.fillText(left, 64, 110); c.textAlign = 'right'; c.fillText(right, W - 64, 110);
  c.strokeStyle = col(color, 0.5); c.lineWidth = 2;
  for (const [x, y] of [[64, 140], [W - 64, 140]]) { c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.moveTo(x, y - 12); c.lineTo(x, y + 12); c.stroke(); }
  c.restore();
}

// ---------------------------------------------------------------- flat garments (original drawings, ~560 px tall)
function shade(c, path) { c.save(); path(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.09)'; c.fillRect(40, -400, 400, 900); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(-400, -400, 220, 900); c.restore(); }
function archText(c, txt, cx, cy, r, size, color, font = VAR) {
  c.save(); c.font = font(size); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const span = Math.min(1.5, txt.length * size * 0.62 / r);
  for (let i = 0; i < txt.length; i++) { const a = -Math.PI / 2 - span / 2 + span * (i + 0.5) / txt.length; c.save(); c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.rotate(a + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
  c.restore();
}
const ITEMS = {
  tee(c, d) {
    const p = () => { c.beginPath(); c.moveTo(-70, -300); c.quadraticCurveTo(-46, -256, 0, -256); c.quadraticCurveTo(46, -256, 70, -300); c.lineTo(178, -268); c.quadraticCurveTo(228, -204, 262, -100); c.lineTo(190, -60); c.quadraticCurveTo(176, -90, 164, -116); c.quadraticCurveTo(160, 90, 170, 290); c.quadraticCurveTo(0, 304, -170, 290); c.quadraticCurveTo(-160, 90, -164, -116); c.quadraticCurveTo(-176, -90, -190, -60); c.lineTo(-262, -100); c.quadraticCurveTo(-228, -204, -178, -268); c.closePath(); };
    p(); c.fillStyle = d.ic; c.fill(); shade(c, p);
    c.strokeStyle = col(d.ii, 0.25); c.lineWidth = 6; c.beginPath(); c.moveTo(-64, -296); c.quadraticCurveTo(-40, -246, 0, -246); c.quadraticCurveTo(40, -246, 64, -296); c.stroke();
    logo(c, 0, -110, 190, d.ii);
    c.font = MONO(700, 22); c.fillStyle = d.ii; c.textAlign = 'center'; c.letterSpacing = '5px'; c.fillText('DÚISENBI CLUB', 0, -20);
    wovenLabel(c, -120, 250, 46);
  },
  hoodie(c, d) {
    const p = () => { c.beginPath(); c.moveTo(-96, -250); c.quadraticCurveTo(-120, -360, 0, -372); c.quadraticCurveTo(120, -360, 96, -250); c.lineTo(178, -228); c.quadraticCurveTo(232, -180, 252, -60); c.lineTo(272, 210); c.lineTo(214, 222); c.quadraticCurveTo(196, 60, 168, -70); c.lineTo(172, 268); c.lineTo(166, 300); c.quadraticCurveTo(0, 312, -166, 300); c.lineTo(-172, 268); c.lineTo(-168, -70); c.quadraticCurveTo(-196, 60, -214, 222); c.lineTo(-272, 210); c.lineTo(-252, -60); c.quadraticCurveTo(-232, -180, -178, -228); c.closePath(); };
    p(); c.fillStyle = d.ic; c.fill(); shade(c, p);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.ellipse(0, -282, 70, 66, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-22, -220); c.lineTo(-28, -140); c.moveTo(22, -220); c.lineTo(28, -140); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.07)'; c.beginPath(); c.moveTo(-110, 110); c.lineTo(110, 110); c.lineTo(136, 230); c.lineTo(-136, 230); c.closePath(); c.fill();
    archText(c, 'QAZAQ', 0, 40, 200, 74, d.ii);
    c.font = VAR(30); c.fillStyle = d.ii; c.textAlign = 'center'; c.fillText('EST. 2016', 0, -40 + 40);
    wovenLabel(c, 130, 250, 46);
  },
  cap(c, d) {
    c.fillStyle = d.ic;
    c.beginPath(); c.moveTo(-250, 60); c.bezierCurveTo(-250, -260, 250, -260, 250, 60); c.closePath(); c.fill();
    c.save(); c.beginPath(); c.moveTo(-250, 60); c.bezierCurveTo(-250, -260, 250, -260, 250, 60); c.closePath(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(60, -300, 300, 400); c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -180); c.lineTo(0, 60); c.moveTo(-120, -150); c.quadraticCurveTo(-170, -40, -160, 60); c.moveTo(120, -150); c.quadraticCurveTo(170, -40, 160, 60); c.stroke();
    c.fillStyle = d.ic; c.beginPath(); c.ellipse(0, 70, 300, 66, 0, 0, Math.PI); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, 70, 300, 66, 0, 0, Math.PI); c.fill();
    c.fillStyle = d.ic; c.beginPath(); c.ellipse(0, 64, 292, 30, 0, 0, Math.PI); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(0, -184, 14, 0, TAU); c.fill();
    logo(c, 0, -50, 170, d.ii);
    wovenLabel(c, 196, 20, 40, -0.3);
  },
  tote(c, d) {
    c.strokeStyle = d.ic; c.lineWidth = 26; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-110, -150); c.bezierCurveTo(-110, -360, 110, -360, 110, -150); c.stroke();
    const p = () => { c.beginPath(); c.moveTo(-220, -170); c.lineTo(220, -170); c.lineTo(236, 290); c.lineTo(-236, 290); c.closePath(); };
    p(); c.fillStyle = d.ic; c.fill(); shade(c, p);
    c.font = ITB(118); c.fillStyle = d.ii; c.textAlign = 'center'; c.letterSpacing = '-3px'; c.fillText('sömke.', 0, 90);
    c.font = MONO(700, 22); c.letterSpacing = '5px'; c.fillText('BEISENBI EDITION', 0, 150);
    wovenLabel(c, 170, -120, 46);
  },
  sock(c, d) {
    const p = () => { c.beginPath(); c.moveTo(-90, -320); c.lineTo(90, -320); c.lineTo(90, 90); c.quadraticCurveTo(90, 150, 140, 170); c.lineTo(250, 210); c.quadraticCurveTo(320, 240, 290, 300); c.quadraticCurveTo(270, 340, 200, 320); c.lineTo(-30, 270); c.quadraticCurveTo(-90, 250, -90, 170); c.closePath(); };
    c.save(); c.translate(-80, 0); p(); c.fillStyle = d.ic; c.fill(); shade(c, p);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 4; for (let x = -76; x <= 76; x += 16) { c.beginPath(); c.moveTo(x, -320); c.lineTo(x, -230); c.stroke(); }
    c.fillStyle = d.ii; c.fillRect(-90, -210, 180, 16); c.fillRect(-90, -184, 180, 16);
    c.save(); c.translate(0, -40); c.rotate(-Math.PI / 2); c.font = DISP(110); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('JUMA', 0, 0); c.restore();
    c.fillStyle = 'rgba(0,0,0,0.1)'; c.beginPath(); c.ellipse(240, 270, 60, 40, 0.3, 0, TAU); c.fill();
    c.restore();
  },
  sweat(c, d) {
    const p = () => { c.beginPath(); c.moveTo(-66, -300); c.quadraticCurveTo(-40, -250, 0, -250); c.quadraticCurveTo(40, -250, 66, -300); c.lineTo(178, -268); c.quadraticCurveTo(236, -230, 252, -150); c.lineTo(282, 210); c.lineTo(222, 226); c.quadraticCurveTo(200, 50, 170, -60); c.lineTo(172, 270); c.lineTo(166, 304); c.quadraticCurveTo(0, 314, -166, 304); c.lineTo(-172, 270); c.lineTo(-170, -60); c.quadraticCurveTo(-200, 50, -222, 226); c.lineTo(-282, 210); c.lineTo(-252, -150); c.quadraticCurveTo(-236, -230, -178, -268); c.closePath(); };
    p(); c.fillStyle = d.ic; c.fill(); shade(c, p);
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(-166, 272, 332, 30); c.fillRect(-282, 196, 60, 28); c.fillRect(222, 196, 60, 28);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 8; c.beginPath(); c.moveTo(-60, -294); c.quadraticCurveTo(-36, -240, 0, -240); c.quadraticCurveTo(36, -240, 60, -294); c.stroke();
    archText(c, 'SENBI', 0, 30, 190, 84, d.ii);
    c.font = VAR(48); c.fillStyle = d.ii; c.textAlign = 'center'; c.fillText('CLUB', 0, 70);
    wovenLabel(c, -128, 260, 46);
  },
  beanie(c, d) {
    c.fillStyle = d.ic; c.beginPath(); c.moveTo(-220, 60); c.bezierCurveTo(-230, -300, 230, -300, 220, 60); c.closePath(); c.fill();
    c.save(); c.beginPath(); c.moveTo(-220, 60); c.bezierCurveTo(-230, -300, 230, -300, 220, 60); c.closePath(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.09)'; c.fillRect(60, -300, 300, 400);
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 6; for (let x = -200; x <= 200; x += 28) { c.beginPath(); c.moveTo(x, 60); c.quadraticCurveTo(x * 0.6, -150, x * 0.2, -230); c.stroke(); } c.restore();
    c.fillStyle = d.ic; c.beginPath(); c.roundRect(-240, 40, 480, 170, 30); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.roundRect(-240, 40, 480, 170, 30); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.14)'; c.lineWidth = 6; for (let x = -220; x <= 220; x += 22) { c.beginPath(); c.moveTo(x, 50); c.lineTo(x, 200); c.stroke(); }
    wovenLabel(c, 0, 125, 78);
  },
};
function drawItem(c, i, cx, cy, s, rot) {
  c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(s, s); ITEMS[DAYS[i].item](c, DAYS[i]); c.restore();
}

// ---------------------------------------------------------------- kinetic type: a different trick for every day
function wordLayout(c, txt, size) { c.font = DISP(size); c.letterSpacing = '0px'; const ws = [...txt].map(ch => c.measureText(ch).width); return { ws, tw: ws.reduce((a, b) => a + b, 0) - (txt.length - 1) * size * 0.02 }; }
function drawWord(c, txt, anim, lt, cx, baseY, size, color, bg) {
  const { ws, tw } = wordLayout(c, txt, size);
  const capH = size * 0.73, tr = size * 0.02;
  c.save(); c.font = DISP(size); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = color;
  if (anim === 'stretch') {
    const k = E.outExpo(prog(lt, 0.03, 0.3));
    c.translate(cx, baseY); c.scale(lerp(0.6, 1, k), lerp(3.2, 1, k)); let x = -tw / 2; for (let i = 0; i < txt.length; i++) { c.fillText(txt[i], x, 0); x += ws[i] - tr; } c.restore(); return;
  }
  if (anim === 'slice') {
    const n = 6;
    for (let s = 0; s < n; s++) {
      const k = E.outExpo(prog(lt, 0.02 + s * 0.02, 0.26 + s * 0.02)), dx = (s % 2 ? 1 : -1) * 700 * (1 - k);
      c.save(); c.beginPath(); c.rect(0, baseY - capH + s * capH / n - 1, W, capH / n + 2); c.clip();
      let x = cx - tw / 2 + dx; for (let i = 0; i < txt.length; i++) { c.fillText(txt[i], x, baseY); x += ws[i] - tr; }
      c.restore();
    }
    c.restore(); return;
  }
  let x = cx - tw / 2;
  for (let i = 0; i < txt.length; i++) {
    const t0 = 0.03 + i * 0.026, k = prog(lt, t0, t0 + 0.22), e = E.outExpo(k);
    const lx = x + ws[i] / 2;
    c.save();
    if (anim === 'rise') { c.beginPath(); c.rect(0, baseY - capH - 30, W, capH + 60); c.clip(); c.translate(lx, baseY + (capH + 40) * (1 - e)); }
    else if (anim === 'flip') { c.translate(lx, baseY - capH / 2); c.scale(1, E.outBack(k) * (k > 0 ? 1 : 0)); c.translate(0, capH / 2); }
    else if (anim === 'drop') { const sp = spring(lt, t0, 2.6, 0.3); c.translate(lx, baseY - 600 * (1 - sp)); c.scale(1 + 0.15 * Math.max(0, sp - 1), 1 - 0.15 * Math.max(0, sp - 1)); }
    else if (anim === 'spin') { c.translate(lx, baseY - capH / 2); c.rotate(-Math.PI * (1 - e)); c.scale(e, e); c.translate(0, capH / 2); }
    else if (anim === 'outline') { c.translate(lx, baseY); }
    if (anim === 'outline') {
      const dk = prog(lt, 0.02 + i * 0.02, 0.22 + i * 0.02), fk = prog(lt, 0.2 + i * 0.015, 0.3 + i * 0.015);
      c.strokeStyle = color; c.lineWidth = 4; c.setLineDash([900 * dk, 2000]); c.strokeText(txt[i], -ws[i] / 2, 0);
      c.globalAlpha = fk; c.fillText(txt[i], -ws[i] / 2, 0);
    } else if (k > 0) c.fillText(txt[i], -ws[i] / 2, 0);
    c.restore();
    x += ws[i] - tr;
  }
  c.restore();
}

// ---------------------------------------------------------------- 0.00–2.00  the dot bounces the logo together
const LG = { w: 760, cx: 540, cy: 900 };
const LS = LG.w / 47, LX0 = LG.cx - LG.w / 2, LY0 = LG.cy - 16 * LS;
const DOTF = [LX0 + LOGO.dc[0] * LS, LY0 + LOGO.dc[1] * LS], DOTR = LOGO.dr * LS;
const QX = LX0 + 16 * LS, RX = LX0 + 30 * LS;   // where q and r stand
function dotIntro(t) {   // centre, squash
  const fy = DOTF[1];
  const hops = [[0.05, 540, -160, T.b1, QX, 0], [T.b1, QX, fy, T.b2, RX, 420], [T.b2, RX, fy, T.land, DOTF[0], 260]];
  for (const [a, x0, y0, b, x1, hgt] of hops) if (t < b) {
    const k = prog(t, a, b);
    if (hgt === 0) return { x: lerp(x0, x1, k), y: lerp(y0, fy, E.inQuad(k)), sx: 1 - 0.1 * k, sy: 1 + 0.25 * k };
    const y = lerp(y0, fy, k) - 4 * hgt * k * (1 - k);
    return { x: lerp(x0, x1, k), y, sx: 1 - 0.12 * Math.sin(Math.PI * k), sy: 1 + 0.18 * Math.sin(Math.PI * k) };
  }
  const sp = spring(t, T.land, 3.4, 0.28);
  return { x: DOTF[0], y: fy, sx: 1 + 0.25 * (1 - sp), sy: 1 - 0.3 * (1 - sp) };
}
function landSquash(t, tl) { if (t < tl) return [1, 1]; const sp = spring(t, tl, 3.4, 0.28); return [1 + 0.35 * (1 - sp), 1 - 0.4 * (1 - sp)]; }
function shotIntro(c, t) {
  c.fillStyle = P.OW; c.fillRect(0, 0, W, H);
  grid(c, P.B, 0.07);
  hud(c, P.B, 'QAZAQ REPUBLIC', 'EST. 2016 · ALMATY', prog(t, 0.05, 0.3));
  // q and r pop out of the floor where the dot hits
  for (const [part, tb, px] of [['q', T.b1, QX], ['r', T.b2, RX]]) {
    if (t < tb) continue;
    const sp = spring(t, tb, 2.8, 0.32);
    c.save(); c.translate(px, DOTF[1] + DOTR); c.scale(1 + 0.1 * (1 - sp), sp); c.translate(-px, -(DOTF[1] + DOTR));
    logoPart(c, part, LX0, LY0, LS, P.B); c.restore();
    // ring at the impact
    const rk = prog(t, tb, tb + 0.35); if (rk < 1) { c.strokeStyle = col(P.B, 1 - rk); c.lineWidth = 6 * (1 - rk) + 1; c.beginPath(); c.ellipse(px, DOTF[1] + DOTR, 60 + 200 * E.outExpo(rk), 14 + 40 * E.outExpo(rk), 0, 0, TAU); c.stroke(); }
  }
  // the dot + its shadow
  const d = dotIntro(t);
  const pre = 1 + 0.35 * E.inCubic(prog(t, 1.8, T.week));
  const sh = clamp(1 - (DOTF[1] - d.y) / 700);
  c.fillStyle = col(P.B, 0.18 * sh); c.beginPath(); c.ellipse(d.x, DOTF[1] + DOTR + 6, DOTR * (0.6 + 0.6 * sh), 12, 0, 0, TAU); c.fill();
  c.save(); c.translate(d.x, d.y + DOTR); c.scale(d.sx * pre, d.sy * pre); c.fillStyle = P.B; c.beginPath(); c.arc(0, -DOTR, DOTR, 0, TAU); c.fill(); c.restore();
  // caption once the logo is whole
  const ck = E.outCubic(prog(t, T.land + 0.05, T.land + 0.3));
  c.save(); c.globalAlpha = ck; c.font = MONO(700, 30); c.letterSpacing = '12px'; c.fillStyle = P.B; c.textAlign = 'center';
  c.fillText('JETI KÚN · 7 ДНЕЙ', CX, 1300 + 20 * (1 - ck)); c.restore();
}

// ---------------------------------------------------------------- 2.00–5.50  the week
function calendar(c, i, t, d) {
  const y = 1650, xs = k => CX + (k - 3) * 128;
  for (let k = 0; k < 7; k++) {
    c.strokeStyle = col(d.fg, 0.5); c.lineWidth = 3; c.beginPath(); c.arc(xs(k), y, 40, 0, TAU); c.stroke();
    if (k < i) { c.fillStyle = col(d.fg, 0.16); c.beginPath(); c.arc(xs(k), y, 40, 0, TAU); c.fill(); }
    c.font = MONO(700, 26); c.fillStyle = col(d.fg, 0.75); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(INIT[k], xs(k), y + 1);
  }
  // the dot hops from yesterday to today
  const lt = t - dayT(i), k = E.inOutCubic(prog(lt, 0, 0.2));
  const x = i === 0 ? xs(0) : lerp(xs(i - 1), xs(i), k), yy = y - (i === 0 ? 0 : 110 * 4 * k * (1 - k));
  const [sx, sy] = landSquash(lt, 0.2);
  const s0 = i === 0 ? E.outBack(prog(lt, 0, 0.2)) : 1;
  c.save(); c.translate(x, yy + 40); c.scale(sx * s0, sy * s0); c.fillStyle = d.acc; c.beginPath(); c.arc(0, -40, 40, 0, TAU); c.fill(); c.restore();
  c.save(); c.globalAlpha = clamp((lt - 0.18) * 8); c.font = MONO(700, 26); c.fillStyle = d.bg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(INIT[i], xs(i), y + 1); c.restore();
  c.textBaseline = 'alphabetic';
}
function drawDay(c, i, t) {
  const d = DAYS[i], lt = t - dayT(i);
  c.fillStyle = d.bg; c.fillRect(0, 0, W, H);
  if (d.bg === P.Mel) { for (let k = 0; k < 900; k++) { c.fillStyle = hash(k * 3.1) < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)'; c.fillRect(hash(k) * W, hash(k + 0.3) * H, 3, 2); } }
  grid(c, d.fg, 0.08);
  hud(c, d.fg, 'QAZAQ REPUBLIC', `0${i + 1} / 07`);
  // the day
  const size = Math.min(250, 980 / (wordLayout(c, d.name, 100).tw / 100));
  drawWord(c, d.name, d.anim, lt, CX, 560, size, d.fg, d.bg);
  const sk = E.outCubic(prog(lt, 0.12, 0.3));
  c.save(); c.globalAlpha = sk; c.font = MONO(700, 30); c.letterSpacing = '10px'; c.fillStyle = d.fg; c.textAlign = 'center'; c.fillText(d.ru, CX, 650 + 16 * (1 - sk)); c.restore();
  // the garment
  const sp = spring(lt, 0.05, 2.4, 0.34);
  const s = 1.0 * (0.55 + 0.45 * sp), rot = (i % 2 ? 1 : -1) * 0.35 * (1 - sp) + 0.025 * Math.sin(t * 3 + i);
  c.fillStyle = col('#000000', 0.12 * sp); c.beginPath(); c.ellipse(CX, 1450, 250 * s, 26 * s, 0, 0, TAU); c.fill();
  if (lt > 0.04) drawItem(c, i, CX, 1110 + 50 * (1 - sp), s, rot);
  calendar(c, i, t, d);
}
function wipeClip(c, i, p) {   // the shape that reveals day i
  c.beginPath();
  const R = 2300 * p;
  switch (i) {
    case 0: c.arc(DOTF[0], DOTF[1], R, 0, TAU); break;
    case 1: c.rect(0, H * (1 - p), W, H * p); break;
    case 2: c.moveTo(0, 0); c.lineTo(2 * W * p + 400, 0); c.lineTo(2 * W * p - 900, H); c.lineTo(0, H); break;
    case 3: c.arc(CX + (3 - 3) * 128, 1650, R, 0, TAU); break;
    case 4: for (let k = 0; k < 6; k++) { const pk = clamp(p * 1.6 - k * 0.12); c.rect(k * 180, 0, 180, H * pk); } break;
    case 5: { const w = W * 1.4 * p, h = H * 1.2 * p; c.roundRect(CX - w / 2, CY - h / 2, w, h, Math.min(w, h) / 2 * (1 - p) + 1); } break;
    case 6: c.rect(W * (1 - p), 0, W * p, H); break;
  }
}
function shotWeek(c, t) {
  const i = Math.min(6, Math.floor((t - T.week) / 0.5));
  const lt = t - dayT(i), p = E.outExpo(prog(lt, 0, 0.2));
  if (p < 1) {
    if (i === 0) shotIntro(c, t); else drawDay(c, i - 1, t);
    c.save(); wipeClip(c, i, p); c.clip(); drawDay(c, i, t); c.restore();
  } else drawDay(c, i, t);
}

// ---------------------------------------------------------------- 5.50–7.50  Bauhaus tiles, «jaqsy kúnder.», the badge
const TILE_COLS = [P.B, P.Y, P.Bur, P.Mel, P.Nv, P.OW, P.Kh];
function tile(c, x, y, s, k, rot, i) {
  const bgc = TILE_COLS[Math.floor(hash(i * 1.7) * TILE_COLS.length)];
  let fgc = TILE_COLS[Math.floor(hash(i * 2.9 + 1) * TILE_COLS.length)]; if (fgc === bgc) fgc = bgc === P.OW ? P.B : P.OW;
  const m = Math.floor(hash(i * 5.3) * 6);
  c.save(); c.translate(x + s / 2, y + s / 2); c.scale(k, k); c.rotate(rot);
  c.fillStyle = bgc; c.fillRect(-s / 2, -s / 2, s, s); c.fillStyle = fgc;
  const h = s / 2;
  switch (m) {
    case 0: c.beginPath(); c.moveTo(-h, -h); c.arc(-h, -h, s, 0, Math.PI / 2); c.closePath(); c.fill(); break;
    case 1: c.beginPath(); c.arc(0, h, h, Math.PI, TAU); c.fill(); break;
    case 2: c.beginPath(); c.arc(0, 0, h * 0.78, 0, TAU); c.fill(); break;
    case 3: c.beginPath(); c.moveTo(-h, -h); c.lineTo(h, h); c.lineTo(-h, h); c.closePath(); c.fill(); break;
    case 4: for (let j = 0; j < 4; j++) c.fillRect(-h, -h + j * s / 4, s, s / 8); break;
    case 5: c.beginPath(); c.arc(-h, 0, h, -Math.PI / 2, Math.PI / 2); c.fill(); c.beginPath(); c.arc(h, 0, h, Math.PI / 2, Math.PI * 1.5); c.fill(); break;
  }
  c.restore();
}
function tiles(c, t) {
  const s = 180;
  for (let r = 0; r < 11; r++) for (let q = 0; q < 6; q++) {
    const x = q * s, y = r * s - 30, i = r * 6 + q;
    const dist = Math.hypot(x + s / 2 - CX, y + s / 2 - CY) / 1100;
    const k = E.outBack(prog(t, T.drop + dist * 0.28, T.drop + dist * 0.28 + 0.24));
    if (k <= 0) continue;
    let rot = Math.floor(hash(i * 7.1) * 4) * Math.PI / 2;
    for (const b of [T.jaqsy, T.kunder, T.badge]) rot += ((r + q) % 2 ? 1 : -1) * Math.PI / 2 * E.outBack(prog(t, b + dist * 0.12, b + dist * 0.12 + 0.2));
    tile(c, x, y, s, k, rot, i);
  }
}
function shotDrop(c, t) {
  c.fillStyle = P.OW; c.fillRect(0, 0, W, H);
  tiles(c, t);
  // the band: dot → pill → circle
  const grow = E.outExpo(prog(t, T.band, T.band + 0.25)), toCirc = E.inOutCubic(prog(t, T.badge, T.badge + 0.25));
  const bw = lerp(lerp(150, 1000, grow), 600, toCirc), bh = lerp(lerp(150, 300, grow), 600, toCirc);
  if (t >= T.band - 0.1) {
    const pop = E.outBack(prog(t, T.band - 0.1, T.band));
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.roundRect(CX - bw / 2 + 14, CY - bh / 2 + 18, bw * pop, bh * pop, bh / 2); c.fill();
    c.fillStyle = P.B; c.beginPath(); c.roundRect(CX - bw / 2 * pop, CY - bh / 2 * pop, bw * pop, bh * pop, bh / 2 * pop); c.fill();
  }
  // words inside the band
  c.save(); c.beginPath(); c.roundRect(CX - bw / 2, CY - bh / 2, bw, bh, bh / 2); c.clip();
  const word = (txt, t0, t1) => {
    if (t < t0 || t > t1 + 0.2) return;
    const kin = E.outExpo(prog(t, t0, t0 + 0.22)), kout = E.inExpo(prog(t, t1, t1 + 0.18));
    c.font = ITB(190); c.letterSpacing = '-6px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = P.W;
    c.fillText(txt, CX, CY + 66 + 260 * (1 - kin) - 300 * kout);
  };
  word('jaqsy', T.jaqsy, T.kunder - 0.02);
  word('kúnder.', T.kunder, T.badge - 0.05);
  c.restore();
  // the badge: rotating ring text around the dot
  if (t >= T.badge) {
    const k = E.outCubic(prog(t, T.badge + 0.1, T.badge + 0.35));
    c.save(); c.translate(CX, CY); c.rotate((t - T.badge) * 1.6 - 0.6 * (1 - k)); c.globalAlpha = k;
    const txt = 'BÁRI JAQSY BOLADY · BÁRI JAQSY BOLADY · '; c.font = MONO(700, 40); c.fillStyle = P.W; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < txt.length; i++) { const a = i / txt.length * TAU; c.save(); c.rotate(a); c.translate(0, -238); c.fillText(txt[i], 0, 0); c.restore(); }
    c.restore();
    const ds = E.outBack(prog(t, T.badge + 0.15, T.badge + 0.35)) * (1 + 0.06 * Math.sin((t - T.badge) * TAU * 2));
    c.fillStyle = P.W; c.beginPath(); c.arc(CX, CY, 92 * ds, 0, TAU); c.fill();
    c.save(); c.globalAlpha = k; c.font = MONO(700, 30); c.letterSpacing = '8px'; c.fillStyle = P.B; c.textAlign = 'center';
    c.fillStyle = P.Ink; c.restore();
  }
  // caption plate under the band
  const ck = E.outCubic(prog(t, T.jaqsy + 0.1, T.jaqsy + 0.3));
  if (ck > 0) {
    const txt = t < T.badge ? 'JAQSY KÚNDER' : 'BÁRI JAQSY BOLADY';
    c.save(); c.font = MONO(700, 30); c.letterSpacing = '10px'; const w = c.measureText(txt).width + 70;
    const y = t < T.badge ? CY + 230 : CY + 380;
    c.fillStyle = P.Ink; c.beginPath(); c.roundRect(CX - w / 2, y - 40, w * ck, 64, 10); c.fill();
    c.fillStyle = P.W; c.textAlign = 'center'; c.globalAlpha = ck; c.fillText(txt, CX + 5, y + 2); c.restore();
  }
}

// ---------------------------------------------------------------- 7.50–10.00  FINALE
const FL = { w: 640, cx: 540, cy: 860 };
const FS = FL.w / 47, FX0 = FL.cx - FL.w / 2, FY0 = FL.cy - 16 * FS;
const FDOT = [FX0 + LOGO.dc[0] * FS, FY0 + LOGO.dc[1] * FS], FDR = LOGO.dr * FS;
const CONF = [];
for (let i = 0; i < 70; i++) CONF.push({ a: -Math.PI / 2 + (hash(i * 3.3) - 0.5) * 2.6, v: 700 + 1300 * hash(i * 1.9), s: 10 + 22 * hash(i * 7.7), c: [P.Y, P.W, P.Mel, P.Bur, P.Cr][i % 5], m: i % 3, spin: (hash(i) - 0.5) * 14 });
function shotFin(c, t) {
  c.fillStyle = P.B; c.fillRect(0, 0, W, H);
  grid(c, P.W, 0.08);
  // confetti of brand shapes from the landing
  if (t >= T.finLand) {
    const d = t - T.finLand;
    for (const p of CONF) {
      const x = FDOT[0] + Math.cos(p.a) * p.v * (1 - Math.exp(-d * 3)) / 3 * 1.6, y = FDOT[1] + Math.sin(p.a) * p.v * (1 - Math.exp(-d * 3)) / 3 * 1.6 + 260 * d * d;
      if (y > H + 50) continue;
      c.save(); c.translate(x, y); c.rotate(p.spin * d); c.fillStyle = p.c; c.globalAlpha = clamp(2.2 - d);
      if (p.m === 0) { c.beginPath(); c.arc(0, 0, p.s / 2, 0, TAU); c.fill(); }
      else if (p.m === 1) { c.beginPath(); c.arc(0, 0, p.s / 2, 0, Math.PI); c.fill(); }
      else c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      c.restore();
    }
  }
  // q from the left, r from the right
  for (const [part, dir, t0] of [['q', -1, T.fin + 0.05], ['r', 1, T.fin + 0.12]]) {
    const k = E.outExpo(prog(t, t0, t0 + 0.3));
    if (k <= 0) continue;
    const off = dir * 900 * (1 - k);
    if (k < 0.95) for (let j = 1; j <= 3; j++) { c.save(); c.globalAlpha = 0.18; c.translate(off + dir * j * 60 * (1 - k), 0); logoPart(c, part, FX0, FY0, FS, P.W); c.restore(); }
    c.save(); c.translate(off, 0); logoPart(c, part, FX0, FY0, FS, P.W); c.restore();
  }
  // the dot drops in and lands as the period, on the beat
  if (t >= T.fin + 0.2) {
    let y, sx = 1, sy = 1;
    if (t < T.finLand) { const k = prog(t, T.fin + 0.2, T.finLand); y = lerp(-200, FDOT[1], E.inQuad(k)); sy = 1 + 0.3 * k; sx = 1 - 0.12 * k; }
    else { y = FDOT[1] - 120 * Math.max(0, Math.sin(Math.PI * prog(t, T.finLand + 0.02, T.name))) * (1 - prog(t, T.finLand, T.name)) ; [sx, sy] = landSquash(t, T.finLand); }
    const pulse = 1 + [9.0, 9.5].reduce((s, b) => s + (t >= b ? 0.12 * Math.exp(-(t - b) * 10) : 0), 0);
    c.save(); c.translate(FDOT[0], y + FDR); c.scale(sx * pulse, sy * pulse); c.fillStyle = P.W; c.beginPath(); c.arc(0, -FDR, FDR, 0, TAU); c.fill(); c.restore();
  }
  // type
  c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const n = 'Qazaq Republic';
  c.save(); c.beginPath(); c.rect(0, 1060, W, 130); c.clip(); c.font = DISP(86); c.letterSpacing = '-1px'; c.fillStyle = P.W;
  const wsN = [...n].map(ch => c.measureText(ch).width), twN = wsN.reduce((a, b) => a + b, 0); let x = CX - twN / 2; c.textAlign = 'left';
  for (let i = 0; i < n.length; i++) { const k = E.outExpo(prog(t, T.name + i * 0.02, T.name + 0.3 + i * 0.02)); c.fillText(n[i], x, 1150 + 120 * (1 - k)); x += wsN[i]; }
  c.restore();
  const tk = E.outBack(prog(t, T.tag, T.tag + 0.3));
  if (tk > 0) { c.save(); c.translate(CX, 1250); c.scale(tk, tk); c.fillStyle = P.Y; c.beginPath(); c.roundRect(-230, -52, 460, 82, 41); c.fill(); c.font = ITB(54); c.letterSpacing = '-1px'; c.fillStyle = P.B; c.textAlign = 'center'; c.fillText('jaqsy kúnder.', 0, 8); c.restore(); }
  const hk = E.outCubic(prog(t, T.handles, T.handles + 0.3));
  c.globalAlpha = hk; c.textAlign = 'center'; c.font = MONO(700, 36); c.letterSpacing = '2px'; c.fillStyle = P.W; c.fillText('@qazaq.republic', CX, 1690 + 20 * (1 - hk));
  c.font = MONO(500, 28); c.fillStyle = col(P.W, 0.7); c.fillText('qazaqrepublic.com', CX, 1740 + 20 * (1 - hk));
  c.restore();
  // woven label flips in
  const lk = prog(t, T.label, T.label + 0.3);
  if (lk > 0) {
    c.save(); c.translate(CX, 1450); c.scale(1, Math.max(0.02, Math.abs(Math.cos((1 - E.outBack(lk)) * Math.PI)))); c.rotate(-0.04);
    c.fillStyle = P.W; c.beginPath(); c.roundRect(-150, -60, 300, 120, 10); c.fill();
    c.strokeStyle = col(P.B, 0.35); c.setLineDash([8, 6]); c.lineWidth = 2; c.strokeRect(-138, -48, 276, 96); c.setLineDash([]);
    logo(c, -70, 0, 110, P.B);
    c.font = MONO(700, 18); c.fillStyle = P.B; c.textAlign = 'left'; c.letterSpacing = '2px'; c.fillText('ALMATY', 4, -6); c.fillText('EST. 2016', 4, 20);
    c.restore();
  }
  hud(c, P.W, 'QAZAQ REPUBLIC', 'JAQSY KÚNDER', prog(t, T.handles, T.handles + 0.3));
}

// ---------------------------------------------------------------- frame
const SHOTS = [[0, shotIntro], [T.week, shotWeek], [T.drop, shotDrop], [T.fin, shotFin]];
const HITS = [[T.b1, 8, 0.12], [T.b2, 8, 0.12], [T.land, 12, 0.16], ...DAYS.map((d, i) => [dayT(i), 7, 0.12]), [T.drop, 10, 0.16], [T.jaqsy, 9, 0.12], [T.kunder, 9, 0.12], [T.badge, 9, 0.12], [T.finLand, 16, 0.22]];
function shakeAt(t) {
  let x = 0, y = 0;
  for (const [t0, a, d] of HITS) if (t >= t0 && t < t0 + d) { const k = 1 - (t - t0) / d; const f = Math.floor(t * FPS); x += (hash(f * 1.7 + t0) - 0.5) * 2 * a * k * k; y += (hash(f * 2.3 + t0 + 9) - 0.5) * 2 * a * k * k; }
  return [x, y];
}
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  let idx = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) idx = i;
  const sh = shakeAt(t);
  ctx.save(); ctx.translate(sh[0], sh[1]);
  // circle wipes between the big sections: draw the previous section, reveal the new one
  const wipeFrom = (tb, prevFn, cx, cy, r0) => {
    const p = E.outExpo(prog(t, tb, tb + 0.24));
    if (p >= 1) return false;
    prevFn(ctx, t); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, lerp(r0, 2300, p), 0, TAU); ctx.clip(); SHOTS[idx][1](ctx, t); ctx.restore(); return true;
  };
  let done = false;
  if (idx === 2) done = wipeFrom(T.drop, (c, tt) => drawDay(c, 6, tt), 540 + 3 * 128, 1650, 40);
  if (idx === 3) done = wipeFrom(T.fin, shotDrop, CX, CY, 92);
  if (!done) SHOTS[idx][1](ctx, t);
  ctx.restore();
  // fill the shake edge
  if (sh[0] || sh[1]) { ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  post(t);
}
function post(t) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0);
  // a hint of motion blur on the fastest moves
  const k0 = 1 - prog(t, 0, 0.06);
  if (k0 > 0) { c.fillStyle = `rgba(245,245,253,${k0})`; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- audio cue sheet
function buildEvents() {
  ev(0.05, 'fall', { end: T.b1 });
  ev(T.b1, 'bounce', { i: 0 }); ev(T.b2, 'bounce', { i: 1 }); ev(T.land, 'bounce', { i: 2 });
  ev(T.b1, 'stamp', { i: 0 }); ev(T.b2, 'stamp', { i: 1 });
  ev(T.land + 0.05, 'caption');
  ev(1.8, 'swell', { end: T.week });
  DAYS.forEach((d, i) => { ev(dayT(i), 'day', { i, anim: d.anim }); ev(dayT(i) + 0.2, 'hop', { i }); ev(dayT(i) + 0.05, 'item', { i }); });
  ev(T.drop, 'tiles');
  ev(T.band - 0.1, 'band');
  ev(T.jaqsy, 'word', { i: 0 }); ev(T.kunder, 'word', { i: 1 });
  ev(T.badge, 'badge');
  ev(T.fin, 'wipe');
  ev(T.fin + 0.05, 'slide', { i: 0 }); ev(T.fin + 0.12, 'slide', { i: 1 });
  ev(T.fin + 0.2, 'dotFall', { end: T.finLand });
  ev(T.finLand, 'final');
  for (let i = 0; i < 14; i++) ev(T.name + i * 0.02, 'tick', { i });
  ev(T.tag, 'pop'); ev(T.handles, 'tick2'); ev(T.label, 'label');
  ev(9.0, 'pulse'); ev(9.5, 'pulse');
  EVENTS.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const faces = [
    ['Inter Display', '/@fonts/opentype/inter/InterDisplay-Black.otf', '900', 'normal'],
    ['Inter', '/@fonts/opentype/inter/Inter-BlackItalic.otf', '900', 'italic'],
    ['JB Mono', '/fonts/JetBrainsMono-Medium.ttf', '500', 'normal'],
    ['JB Mono', '/fonts/JetBrainsMono-Bold.ttf', '700', 'normal'],
    ['Graduate', '/fonts/Graduate-Regular.ttf', '400', 'normal'],
  ];
  for (const [fam, url, wt, st] of faces) { const f = new FontFace(fam, `url(${url})`, { weight: wt, style: st }); await f.load(); document.fonts.add(f); }
  const svg = await (await fetch('/assets/qr_logo.svg')).text();
  const ds = [...svg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  LOGO.q = new Path2D(ds[0]); LOGO.dot = new Path2D(ds[1]); LOGO.r = new Path2D(ds[2]);
  buildEvents();
  window.READY = true;
}
window.renderFrame = renderFrame;
window.getEvents = () => EVENTS;
boot().catch(e => { console.error(e); window.BOOT_ERROR = String(e && e.stack || e); });
