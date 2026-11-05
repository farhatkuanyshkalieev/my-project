/* Renders the intro from index.html (the same engine as the prototype).
   node tools/render.js check            контрольные кадры по всему таймлайну -> exports/qa/
   node tools/render.js frames           кадры раскадровки -> assets/frames/
   node tools/render.js video            exports/THERMINAL_intro_v2_1080x1920.mp4 (+ звук, если есть)
   node tools/render.js layers           exports/layers/ (плейт, типографика и лист с альфой)
   node tools/render.js graphics         exports/graphics/ (SVG элементы, PNG профиля)
   Требуется: playwright (Chromium), ffmpeg. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json'), 'utf8'));
const PAGE_URL = 'file://' + path.join(ROOT, 'index.html');
const mk = d => fs.mkdirSync(path.join(ROOT, d), { recursive: true });

async function open(browser, mode, w = 1080, h = 1920) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(180000);
  page.on('pageerror', e => console.error('pageerror', e.message));
  // serve three.js and the fonts from vendor/ so rendering never waits on the network
  const V = path.join(ROOT, 'vendor');
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: path.join(V, 'three.r128.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ path: path.join(V, 'fonts/fonts.css'), contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: path.join(V, 'fonts', path.basename(new URL(r.request().url()).pathname)), contentType: 'font/woff2' }));
  await page.goto(PAGE_URL + '#' + mode, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof window.__ready === 'function', null, { timeout: 180000 });
  const ok = await page.evaluate(() => window.__ready());
  if (!ok) throw new Error('3D scene did not start (WebGL/three.js)');
  await page.waitForTimeout(300);
  return page;
}
async function shot(page, t, opts = {}) {
  await page.evaluate(v => window.__seek(v), t);
  return page.screenshot({ type: 'png', omitBackground: !!opts.alpha, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}
function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  return { stdin: p.stdin, done };
}
/* frames are rendered by parallel worker processes into a temp folder, then encoded */
const WORKERS = Math.max(1, Math.min(4, require('os').cpus().length));
async function frames(mode, t0, t1, fps, alpha) {
  const n = Math.round((t1 - t0) * fps);
  mk('exports/qa'); const dir = fs.mkdtempSync(path.join(ROOT, 'exports/qa', 'seq-'));
  const per = Math.ceil(n / WORKERS), started = Date.now();
  const procs = [];
  try {
    await Promise.all(Array.from({ length: WORKERS }, (_, w) => new Promise((res, rej) => {
      const i0 = w * per, i1 = Math.min(n, i0 + per);
      if (i0 >= i1) return res();
      const p = spawn(process.execPath, [__filename, '_worker', mode, i0, i1, t0, fps, dir, alpha ? 1 : 0, w * 4000], { stdio: 'inherit' });
      procs.push(p);
      p.on('close', c => c === 0 ? res() : rej(new Error('worker ' + w)));
    })));
  } catch (e) { procs.forEach(p => { try { p.kill(); } catch (_) {} }); cleanup(dir); throw e; }
  console.log(`  ${n} frames in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  return { dir, pattern: path.join(dir, alpha ? '%05d.png' : '%05d.jpg') };
}
const cleanup = d => fs.rmSync(d, { recursive: true, force: true });

(async () => {
  const cmd = process.argv[2] || 'check';
  if (cmd === '_worker') {
    const [mode, i0, i1, t0, fps, dir, alpha, delay] = process.argv.slice(3);
    await new Promise(r => setTimeout(r, +delay || 0));
    const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
    const page = await open(br, mode);
    for (let i = +i0; i < +i1; i++) {
      await page.evaluate(v => window.__seek(v), +t0 + i / +fps);
      const file = path.join(dir, String(i).padStart(5, '0') + (alpha === '1' ? '.png' : '.jpg'));
      await page.screenshot(alpha === '1' ? { path: file, type: 'png', omitBackground: true } : { path: file, type: 'jpeg', quality: 97 });
      if ((i - i0) % 30 === 0) console.log(`  [${mode}] frame ${i}`);
    }
    await br.close(); return;
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
  const fps = TL.fps, D = TL.duration;

  if (cmd === 'check') {
    mk('exports/qa');
    const page = await open(browser, 'render');
    const times = process.argv.slice(3).map(Number).filter(x => !isNaN(x));
    const list = times.length ? times : Array.from({ length: Math.round(D / 0.2) + 1 }, (_, i) => +(i * 0.2).toFixed(2));
    for (const t of list) fs.writeFileSync(path.join(ROOT, `exports/qa/qa_${t.toFixed(2)}.png`), await shot(page, t));
    console.log('qa frames', list.length);
  }

  if (cmd === 'frames') {
    mk('assets/frames');
    const page = await open(browser, 'render');
    const sb = JSON.parse(fs.readFileSync(path.join(ROOT, 'storyboard.json'), 'utf8'));
    for (const s of sb) {
      const t = parseFloat(s.t.replace(',', '.'));
      const png = path.join(ROOT, 'exports/qa', '_f.png'); mk('exports/qa');
      fs.writeFileSync(png, await shot(page, t));
      await ffmpeg(['-i', png, '-vf', 'scale=540:-1', '-q:v', '3', path.join(ROOT, 'assets/frames', s.frame)]).done;
      fs.unlinkSync(png);
    }
    console.log('storyboard frames', sb.length);
  }

  if (cmd === 'video') {
    mk('exports');
    const wav = path.join(ROOT, 'exports/audio/THERMINAL_intro_sfx_mix.wav');
    const out = path.join(ROOT, 'exports/THERMINAL_intro_v2_1080x1920.mp4');
    const seq = await frames('render', 0, D, fps, false);
    const audioArgs = fs.existsSync(wav) ? ['-i', wav, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '320k', '-shortest'] : [];
    await ffmpeg(['-framerate', String(fps), '-i', seq.pattern, ...audioArgs,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out]).done;
    cleanup(seq.dir);
    console.log('video', out);
  }

  if (cmd === 'layers') {
    mk('exports/layers');
    const cut = TL.transition.cut;
    let seq = await frames('layer-plate', 0, cut + 0.1, fps, false);
    await ffmpeg(['-framerate', String(fps), '-i', seq.pattern, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p',
      path.join(ROOT, 'exports/layers/L1_scene1_plate_3d_0-3.4s.mp4')]).done; cleanup(seq.dir);
    seq = await frames('layer-type', 0, 3.2, fps, true);
    await ffmpeg(['-framerate', String(fps), '-i', seq.pattern, '-c:v', 'qtrle', '-pix_fmt', 'argb',
      path.join(ROOT, 'exports/layers/L2_scene1_type_arrow_alpha_0-3.2s.mov')]).done; cleanup(seq.dir);
    seq = await frames('layer-sheet', cut, D, fps, true);
    await ffmpeg(['-framerate', String(fps), '-i', seq.pattern, '-c:v', 'qtrle', '-pix_fmt', 'argb',
      path.join(ROOT, `exports/layers/L3_scene2_sheet_alpha_${cut.toFixed(2)}-${D}s.mov`)]).done; cleanup(seq.dir);
    console.log('layers done');
  }

  if (cmd === 'graphics') {
    mk('exports/graphics');
    const page = await open(browser, 'layer-sheet');
    await page.evaluate(v => window.__seek(v), D);
    const head = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const css = await page.evaluate(() => [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }).filter(c => c.startsWith('.sheet')).join('\n'));
    let sheet = await page.evaluate(() => window.__svg());
    sheet = sheet.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" ').replace(/style="[^"]*"/g, '')
      .replace('>', `><style>${css.replace(/var\(--f-display\)/g, "'Montserrat', Arial, sans-serif")}</style><rect width="360" height="640" fill="#ffffff"/>`);
    fs.writeFileSync(path.join(ROOT, 'exports/graphics/sheet_final_6.6s.svg'), head + sheet);
    const tp = await open(browser, 'layer-type');
    await tp.evaluate(() => window.__seek(2.34));
    let arrow = await tp.evaluate(() => window.__arrowSvg());
    arrow = arrow.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" ').replace(/style="[^"]*"/g, '')
      .replace(/<path id="arw"/, '<path id="arw" fill="none" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round"')
      .replace(/<path id="arwh"/, '<path id="arwh" fill="none" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"');
    fs.writeFileSync(path.join(ROOT, 'exports/graphics/arrow_2.34s.svg'), head + arrow);
    const pp = await open(browser, 'still-profile');
    fs.writeFileSync(path.join(ROOT, 'exports/graphics/profile_viking90_3d_2.2s_alpha.png'), await shot(pp, 2.2, { alpha: true }));
    fs.writeFileSync(path.join(ROOT, 'exports/graphics/profile_viking90_3d_0.9s_alpha.png'), await shot(pp, 0.9, { alpha: true }));
    console.log('graphics done');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
