// Renders index.html frame by frame in headless Chromium and pipes PNGs to ffmpeg.
//   node render.cjs video out/video.mp4      -> silent H.264 video
//   node render.cjs stills out/ 0.5 6 12     -> PNG stills at the given seconds
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FPS = 30;

(async () => {
  const [mode = 'video', out = 'out/video.mp4', ...times] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.ready === true);
  const dur = await page.evaluate(() => window.DUR);

  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of times) {
      const b64 = await page.evaluate(t => window.frame(t), Number(t));
      fs.writeFileSync(path.join(out, `t${t}.png`), Buffer.from(b64, 'base64'));
    }
  } else {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(dur * FPS);
    for (let f = 0; f < n; f++) {
      const b64 = await page.evaluate(t => window.frame(t), f / FPS);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${n}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
