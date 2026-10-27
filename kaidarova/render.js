// Headless frame renderer.
//   node render.js stills <outDir> t1 t2 ...        -> PNG stills
//   node render.js segment <out.mp4> <f0> <f1>      -> encodes frames [f0, f1)
//   node render.js events <out.json>                -> audio cue sheet
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const FPS = 60, W = 1080, H = 1920;

const http = require('http');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve() { // static server so ES modules / importmaps work
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = u.startsWith('/@fonts/') ? path.join('/usr/share/fonts', u.slice(8)) : path.join(__dirname, u);
      fs.readFile(f, (e, d) => { if (e) { rsp.writeHead(404); rsp.end(); return; } rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); rsp.end(d); });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function open() {
  const browser = await chromium.launch({
    args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--disable-gpu-vsync', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => console.error('[page]', m.text()));
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  const scene = process.env.SCENE || 'kaidarova.html';
  { const srv = await serve(); browser.on('disconnected', () => srv.close()); await page.goto(`http://127.0.0.1:${srv.address().port}/${scene}`); }
  await page.waitForFunction(() => window.READY === true || window.BOOT_ERROR, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.BOOT_ERROR);
  if (err) throw new Error(err);
  return { browser, page };
}

async function grab(page, t) {
  await page.evaluate(tt => window.renderFrame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
}

(async () => {
  const [mode, a, ...rest] = process.argv.slice(2);
  const { browser, page } = await open();
  if (mode === 'stills') {
    fs.mkdirSync(a, { recursive: true });
    for (const s of rest) {
      const t = parseFloat(s);
      const buf = await grab(page, t);
      fs.writeFileSync(path.join(a, `t${t.toFixed(2).padStart(5, '0')}.png`), buf);
    }
  } else if (mode === 'events') {
    const ev = await page.evaluate(() => window.getEvents());
    fs.writeFileSync(a, JSON.stringify(ev, null, 1));
  } else if (mode === 'segment') {
    const f0 = parseInt(rest[0], 10), f1 = parseInt(rest[1], 10);
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'film', '-g', '60', '-bf', '2',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      a,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const buf = await grab(page, f / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.error(`seg ${f0}-${f1}: frame ${f} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  }
  await browser.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
