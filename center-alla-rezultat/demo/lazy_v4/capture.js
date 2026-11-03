// Render index.html frame by frame with Chromium and encode with ffmpeg.
// Usage: node capture.js OUT.mp4 AUDIO.wav [--frames 1.0,6.5,...  --outdir DIR]  (frames mode = PNG previews only)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30, DUR = 19.0;
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const frames = flag('--frames');
  if (frames) {
    const outdir = flag('--outdir');
    fs.mkdirSync(outdir, { recursive: true });
    for (const s of frames.split(',').map(Number)) {
      await page.evaluate(async (t) => { await window.render(t); }, s);
      await page.screenshot({ path: path.join(outdir, `f_${s.toFixed(1).padStart(4, '0')}.png`) });
    }
    await browser.close();
    return;
  }

  const [out, wav] = args;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', wav, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(FPS * DUR);
  for (let i = 0; i < n; i++) {
    await page.evaluate(async (t) => { await window.render(t); }, i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})();
