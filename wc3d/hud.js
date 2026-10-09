// 2D-слой моушн-графики: титры по словам, плашки глав, счётчики, прогресс.
import {clamp, prog, easeOut, easeBack, easeOut5, lerp} from './lib.js';

const FM = '800 {s}px HudM, sans-serif';
const FO = '700 {s}px HudO, sans-serif';
export const fm = s => FM.replace('{s}', s);
export const fo = s => FO.replace('{s}', s);
const GOLD = '#ffc628';

export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function wrapWords(ctx, words, maxW) {
  const lines = [[]]; let cur = 0;
  for (const w of words) {
    const ww = ctx.measureText(w + ' ').width;
    if (cur + ww > maxW && lines[lines.length - 1].length) { lines.push([]); cur = 0; }
    lines[lines.length - 1].push({w, ww}); cur += ww;
  }
  return lines;
}

export function caption(ctx, phrases, tl) {
  for (const ph of phrases) {
    const a0 = ph.t0 - 0.12, a1 = ph.t1 + 0.35;
    if (tl < a0 || tl > a1) continue;
    const fin = easeOut(prog(tl, a0, a0 + 0.28)), fout = 1 - prog(tl, ph.t1 + 0.05, a1);
    const al = Math.min(fin, fout);
    ctx.save();
    ctx.font = fm(36);
    const words = ph.caption.split(' ');
    const lines = wrapWords(ctx, words, 980);
    const lh = 50, h = lines.length * lh + 30;
    const maxw = Math.max(...lines.map(l => l.reduce((s, o) => s + o.ww, 0))) + 56;
    const yb = 690 + (1 - fin) * 24;
    ctx.globalAlpha = al * 0.92;
    const g = ctx.createLinearGradient(0, yb - h, 0, yb);
    g.addColorStop(0, 'rgba(8,16,36,0.78)'); g.addColorStop(1, 'rgba(3,7,18,0.88)');
    ctx.fillStyle = g; rr(ctx, 640 - maxw / 2, yb - h, maxw, h, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(255,198,40,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = GOLD; rr(ctx, 640 - maxw / 2 + 14, yb - h + 16, 5, h - 32, 3); ctx.fill();
    // пословная подсветка
    const tot = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const times = {};
    words.forEach((w, i) => { times[i] = ph.t0 + (acc / tot) * (ph.t1 - ph.t0); acc += w.length + 2; });
    let wi = 0;
    lines.forEach((ln, li) => {
      const lw = ln.reduce((s, o) => s + o.ww, 0); let x = 640 - lw / 2 + 8;
      ln.forEach(o => {
        const tw = times[wi], k = easeOut(prog(tl, tw - 0.05, tw + 0.16));
        const active = tl >= tw && tl < (times[wi + 1] ?? ph.t1 + 0.1);
        ctx.globalAlpha = al * (0.45 + 0.55 * k);
        ctx.fillStyle = active ? GOLD : '#fff';
        ctx.fillText(o.w, x, yb - h + 44 + li * lh - (1 - k) * 6);
        x += o.ww; wi++;
      });
    });
    ctx.restore();
  }
}

export function chapter(ctx, num, label, tl) {
  const a = easeOut5(prog(tl, 0.5, 1.1)), out = 1 - prog(tl, 99, 100);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(-(1 - a) * 60, 0);
  ctx.font = fo(64); ctx.lineWidth = 2; ctx.strokeStyle = GOLD; ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.strokeText(num, 52, 104);
  ctx.font = fm(22); ctx.fillStyle = '#fff';
  ctx.save(); ctx.letterSpacing = '6px'; ctx.fillText(label, 52 + 94, 86); ctx.restore();
  ctx.fillStyle = GOLD; ctx.fillRect(52 + 94, 98, 150 * a, 4);
  ctx.restore();
}

export function brand(ctx, tg, total) {
  ctx.save();
  ctx.font = fo(24); ctx.textAlign = 'right'; ctx.letterSpacing = '5px';
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('ЧМ · 2026', 1240, 68);
  ctx.fillStyle = GOLD; ctx.fillRect(1240 - 74, 80, 74, 3);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 716, 1280, 4);
  ctx.fillStyle = GOLD; ctx.fillRect(0, 716, 1280 * tg / total, 4);
}

// Крупный счётчик со «стеклянной» плашкой
export function stat(ctx, {x, y, value, label, sub, a = 1, size = 150, color = GOLD, align = 'center'}) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.textAlign = align;
  ctx.shadowColor = 'rgba(255,170,0,0.55)'; ctx.shadowBlur = 28;
  ctx.font = fo(size); ctx.fillStyle = color; ctx.fillText(String(value), x, y);
  ctx.shadowBlur = 0;
  if (label) { ctx.font = fm(30); ctx.fillStyle = '#fff'; ctx.letterSpacing = '4px'; ctx.fillText(label, x, y + 44); }
  if (sub) { ctx.font = fm(22); ctx.fillStyle = 'rgba(190,205,230,0.9)'; ctx.fillText(sub, x, y + 80); }
  ctx.restore();
}

export function pill(ctx, x, y, text, a = 1, color = GOLD) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.font = fm(26);
  const w = ctx.measureText(text).width + 44;
  ctx.fillStyle = 'rgba(6,14,32,0.82)'; rr(ctx, x - w / 2, y - 24, w, 48, 24); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x, y + 9);
  ctx.restore();
}
