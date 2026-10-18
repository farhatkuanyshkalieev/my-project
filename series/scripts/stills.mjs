// Render a set of stills (seconds) for quick visual QA: node scripts/stills.mjs out/qa 1.5 6.8 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const BROWSER = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const [outDir, ...times] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, browserExecutable: BROWSER, id: process.env.COMP ?? 'Ep1'});
for (const s of times) {
  const frame = Math.round(Number(s) * composition.fps);
  const output = path.join(outDir, `t${String(s).padStart(5, '0')}.jpg`);
  await renderStill({serveUrl, composition, frame, output, browserExecutable: BROWSER, chromiumOptions: {gl: 'swangle'}, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.5});
  console.log(output);
}
