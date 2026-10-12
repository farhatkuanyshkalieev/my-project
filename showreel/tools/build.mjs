// Inlines Geist (as @font-face data and as glyph outlines) into src/reel.html -> reel.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = opentype.loadSync(path.join(root, 'fonts/Geist-Black.ttf'));

const r = (v) => Math.round(v * 10) / 10;
const chars = {};
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+%') {
  const g = font.charToGlyph(ch);
  const cmds = g.getPath(0, 0, 1000).commands.map((c) => {
    if (c.type === 'M' || c.type === 'L') return [c.type, r(c.x), r(c.y)];
    if (c.type === 'Q') return ['Q', r(c.x1), r(c.y1), r(c.x), r(c.y)];
    if (c.type === 'C') return ['C', r(c.x1), r(c.y1), r(c.x2), r(c.y2), r(c.x), r(c.y)];
    return ['Z'];
  });
  const bb = g.getBoundingBox();
  chars[ch] = { cmds, adv: g.advanceWidth, bb: [bb.x1, -bb.y2, bb.x2, -bb.y1] };
}

const words = {};
for (const w of ['FOLD', 'ONE', 'SHAPE', 'INTO', 'ANY', 'FORM', 'FO', 'LD']) {
  const g = [];
  font.forEachGlyph(w, 0, 0, 1000, { kerning: true }, (glyph, x) => g.push([glyph.unicode ? String.fromCharCode(glyph.unicode) : '?', Math.round(x)]));
  words[w] = g;
}

const data = { cap: font.tables.os2.sCapHeight, chars, words };
const b64 = (f) => fs.readFileSync(path.join(root, 'fonts', f)).toString('base64');

let html = fs.readFileSync(path.join(root, 'src/reel.html'), 'utf8');
html = html
  .replace('__GEIST_BLACK__', b64('Geist-Black.woff2'))
  .replace('__GEIST_MEDIUM__', b64('Geist-Medium.woff2'))
  .replace('/*__GLYPHS__*/null', JSON.stringify(data));
fs.writeFileSync(path.join(root, 'reel.html'), html);
console.log('reel.html', (html.length / 1024).toFixed(0) + 'KB');
