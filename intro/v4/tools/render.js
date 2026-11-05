/* Renders intro v3 from index.html (same engine as the prototype).
   node tools/render.js check [t ...]      контрольные кадры -> exports/qa/
   node tools/render.js video [fps] [name] MP4 1080x1920 -> exports/ (со звуком, если есть)
   Нужны Playwright (Chromium) и ffmpeg. three.js и шрифты берутся из ../concept/vendor. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, '..', 'concept', 'vendor');
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json'), 'utf8'));
const PAGE_URL = 'file://' + path.join(ROOT, 'index.html');
const mk = d => fs.mkdirSync(path.join(ROOT, d), { recursive: true });
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'];

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(180000);
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: path.join(VENDOR, 'three.r128.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ path: path.join(VENDOR, 'fonts/fonts.css'), contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: path.join(VENDOR, 'fonts', path.basename(new URL(r.request().url()).pathname)), contentType: 'font/woff2' }));
  await page.goto(PAGE_URL + '#render', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof window.__ready === 'function');
  if (!(await page.evaluate(() => window.__ready()))) throw new Error('3D scene did not start');
  await page.waitForTimeout(300);
  return page;
}
function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  return new Promise((res, rej) => p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
}
const WORKERS = Math.max(1, Math.min(4, os.cpus().length));
async function frames(fps) {
  const n = Math.round(TL.duration * fps);
  mk('exports/qa'); const dir = fs.mkdtempSync(path.join(ROOT, 'exports/qa', 'seq-'));
  const per = Math.ceil(n / WORKERS), procs = [], t0 = Date.now();
  try {
    await Promise.all(Array.from({ length: WORKERS }, (_, w) => new Promise((res, rej) => {
      const i0 = w * per, i1 = Math.min(n, i0 + per); if (i0 >= i1) return res();
      const p = spawn(process.execPath, [__filename, '_worker', i0, i1, fps, dir, w * 3000], { stdio: 'inherit' }); procs.push(p);
      p.on('close', c => c === 0 ? res() : rej(new Error('worker ' + w)));
    })));
  } catch (e) { procs.forEach(p => { try { p.kill(); } catch (_) {} }); fs.rmSync(dir, { recursive: true, force: true }); throw e; }
  console.log(`  ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return dir;
}

(async () => {
  const cmd = process.argv[2] || 'check';
  if (cmd === '_worker') {
    const [i0, i1, fps, dir, delay] = process.argv.slice(3);
    await new Promise(r => setTimeout(r, +delay || 0));
    const br = await chromium.launch({ args: ARGS }); const page = await open(br);
    for (let i = +i0; i < +i1; i++) {
      await page.evaluate(v => window.__seek(v), i / +fps);
      await page.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 97 });
      if ((i - i0) % 60 === 0) console.log(`  frame ${i}`);
    }
    await br.close(); return;
  }
  if (cmd === 'check') {
    mk('exports/qa');
    const br = await chromium.launch({ args: ARGS }); const page = await open(br);
    const list = process.argv.slice(3).map(Number);
    for (const t of list) { await page.evaluate(v => window.__seek(v), t); await page.screenshot({ path: path.join(ROOT, `exports/qa/qa_${t.toFixed(2)}.png`) }); }
    await br.close(); console.log('qa', list.length);
  }
  if (cmd === 'video') {
    const fps = +(process.argv[3] || TL.fps), name = process.argv[4] || `THERMINAL_intro_v4_1080x1920_${fps}fps.mp4`;
    mk('exports');
    const dir = await frames(fps);
    const wav = path.join(ROOT, 'exports/audio/THERMINAL_intro_v4_mix.wav');
    const audio = fs.existsSync(wav) ? ['-i', wav, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '320k', '-shortest'] : [];
    await ffmpeg(['-framerate', String(fps), '-i', path.join(dir, '%05d.jpg'), ...audio,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', path.join(ROOT, 'exports', name)]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('video', name);
  }
})().catch(e => { console.error(e); process.exit(1); });
