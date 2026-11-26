// Перерендеривает битые кадры по одному и вклеивает их в готовое видео.
const {bundle} = require('@remotion/bundler');
const {renderStill, selectComposition} = require('@remotion/renderer');
const {execSync} = require('child_process');
const fs = require('fs');
const [,, video, ...frames] = process.argv;
const BROWSER = '/opt/pw-browsers/chromium';
(async () => {
  const dir = 'out/frames';
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  execSync(`ffmpeg -v error -i ${video} -start_number 0 ${dir}/%04d.png`);
  const serveUrl = await bundle({entryPoint: 'src/index.ts'});
  const composition = await selectComposition({serveUrl, id: 'Reference', browserExecutable: BROWSER});
  for (const f of frames.map(Number)) {
    await renderStill({serveUrl, composition, frame: f, output: `${dir}/${String(f).padStart(4, '0')}.png`, browserExecutable: BROWSER, overwrite: true});
    console.log('patched', f);
  }
  execSync(`ffmpeg -v error -y -framerate 30 -i ${dir}/%04d.png -i public/mix.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest out/reference_fixed.mp4`);
  fs.rmSync(dir, {recursive: true, force: true});
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
