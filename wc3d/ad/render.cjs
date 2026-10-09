// Рендер кадров притчи (портрет 720x1280). node render.cjs preview OUT t1 t2 ... | node render.cjs video OUT [workers] [from] [to]
const {chromium} = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2'};
function serve() { return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'content-type': MIME[path.extname(f)] || 'application/octet-stream'}); r.end(d); }); }).listen(0, () => res(s)); }); }
const ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
async function open(browser, port) {
  const p = await browser.newPage({viewport: {width: 720, height: 1280}});
  p.on('console', m => { const t = m.text(); if (/error|fail|warn/i.test(t)) console.log('[page]', t.slice(0, 300)); }); p.on('pageerror', e => console.log('[pageerror]', String(e.message).slice(0, 400)));
  await p.goto(`http://localhost:${port}/ad/index.html`); await p.waitForFunction('window.ready||window.initError', null, {timeout: 180000});
  const err = await p.evaluate('window.initError'); if (err) throw new Error(err); return p;
}
const grab = async (p, t) => Buffer.from((await p.evaluate(`window.renderFrame(${t})`)).split(',')[1], 'base64');
(async () => {
  const [mode, dir, ...rest] = process.argv.slice(2); fs.mkdirSync(dir, {recursive: true});
  const srv = await serve(); const port = srv.address().port; const browser = await chromium.launch({args: ARGS});
  if (mode === 'preview') { const p = await open(browser, port); for (const t of rest.map(Number)) { const t0 = Date.now(); fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.jpg`), await grab(p, t)); console.log('t', t, Date.now() - t0, 'ms'); } }
  else {
    const workers = Number(rest[0] || 2), from = Number(rest[1] || 0), to = Number(rest[2] || 1e9);
    const pages = await Promise.all(Array.from({length: workers}, () => open(browser, port)));
    const N = Math.min(await pages[0].evaluate('window.NFRAMES'), to); let next = from, done = 0; const t0 = Date.now();
    await Promise.all(pages.map(async p => { while (true) { const i = next++; if (i >= N) break; const f = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`); if (!fs.existsSync(f)) fs.writeFileSync(f, await grab(p, i / 30)); if (++done % 30 === 0) console.log(`${done}/${N - from} frames, ${((Date.now() - t0) / 1000 / done).toFixed(2)} s/frame`); } }));
    console.log('video done');
  }
  await browser.close(); srv.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
