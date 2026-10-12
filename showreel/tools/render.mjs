// Renders reel.html with Playwright.
//   node tools/render.mjs --stills          one frame per beat + contact sheet (out/stills)
//   node tools/render.mjs --at 3.2,7.45     specific times (out/stills/at_*.png)
//   node tools/render.mjs                   full render: 60 fps, 3 subframes/frame blended with tmix, audio muxed
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
const url = 'file://' + path.join(root, 'reel.html');
const FPS = 60, SUB = 3, DUR = 15;
const args = process.argv.slice(2);
const WORKERS = Number(process.env.WORKERS || 4);

const launch = () => chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--disable-gpu-vsync', '--force-device-scale-factor=1'] });
async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}
async function shot(page, t) {
  await page.evaluate((tt) => window.seek(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

async function stills(times, names) {
  const dir = path.join(out, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await launch();
  const page = await openPage(browser);
  for (let i = 0; i < times.length; i++) fs.writeFileSync(path.join(dir, names[i] + '.png'), await shot(page, times[i]));
  await browser.close();
  return dir;
}

function ffmpeg(argv, input) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  return { p, done };
}

async function full() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await launch();

  // soundtrack
  const ap = await openPage(browser);
  const b64 = await ap.evaluate(() => window.renderAudio());
  fs.writeFileSync(path.join(out, 'soundtrack.wav'), Buffer.from(b64, 'base64'));
  await ap.close();
  console.log('audio done');

  // frames: subframe s sits at t = (s - 1) / 180, so frame f averages f/60 - 1/180 … f/60 + 1/180 (wraps: it's a loop)
  const total = FPS * DUR * SUB;
  const per = Math.ceil(total / WORKERS / SUB) * SUB;
  const t0 = Date.now();
  let doneCount = 0;
  const chunks = [];
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per);
    if (a >= b) return;
    const file = path.join(out, `chunk_${w}.mkv`);
    chunks[w] = file;
    const ff = ffmpeg(['-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS * SUB), '-i', '-',
      '-vf', `tmix=frames=${SUB}:weights='1 1 1',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)`,
      '-r', String(FPS), '-c:v', 'ffv1', '-pix_fmt', 'yuv444p', file], true);
    const page = await openPage(browser);
    for (let s = a; s < b; s++) {
      const t = (((s - 1) / (FPS * SUB)) % DUR + DUR) % DUR;
      const png = await shot(page, t);
      if (!ff.p.stdin.write(png)) await new Promise((r) => ff.p.stdin.once('drain', r));
      if (++doneCount % 150 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${doneCount}/${total} subframes  ${el.toFixed(0)}s  eta ${((el / doneCount) * (total - doneCount)).toFixed(0)}s`);
      }
    }
    ff.p.stdin.end();
    await ff.done;
    await page.close();
  }));
  await browser.close();

  const list = path.join(out, 'chunks.txt');
  fs.writeFileSync(list, chunks.filter(Boolean).map((f) => `file '${f}'`).join('\n'));
  const final = path.join(out, 'fold-showreel.mp4');
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(out, 'soundtrack.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-r', String(FPS), '-c:a', 'aac', '-b:a', '320k', '-t', String(DUR), '-movflags', '+faststart', final]).done;
  chunks.filter(Boolean).forEach((f) => fs.unlinkSync(f));
  fs.unlinkSync(list);
  console.log('wrote', final, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

if (args[0] === '--stills') {
  const off = Number(args[1] ?? 0.3);
  const times = Array.from({ length: 30 }, (_, b) => b * 0.5 + off);
  const names = times.map((_, b) => `beat_${String(b + 1).padStart(2, '0')}`);
  const dir = await stills(times, names);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'beat_%02d.png'),
    '-vf', 'scale=480:270,drawtext=text=%{n}:x=8:y=8:fontsize=20:fontcolor=white@0.0,tile=6x5:padding=6:color=0x333333', '-frames:v', '1', path.join(dir, 'contact.png')]);
  console.log('stills in', dir);
} else if (args[0] === '--at') {
  const times = args[1].split(',').map(Number);
  await stills(times, times.map((t) => 'at_' + t.toFixed(3)));
} else {
  await full();
}
