// One-off: download the Google font files we use into public/fonts (render browser has no direct internet).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const want = [
  ["CormorantGaramond", "normal", ["400", "500"]],
  ["CormorantGaramond", "italic", ["400", "500"]],
  ["Manrope", "normal", ["400", "500", "600"]],
];
const out = [];
for (const [mod, style, weights] of want) {
  const { getInfo } = await import(`@remotion/google-fonts/${mod}`);
  const info = getInfo();
  for (const w of weights) for (const sub of ["latin", "cyrillic"]) {
    const url = info.fonts[style][w][sub];
    const file = `${mod}-${style}-${w}-${sub}.woff2`;
    execFileSync("curl", ["-sSfL", "-o", `public/fonts/${file}`, url]);
    out.push({ family: info.fontFamily, style, weight: w, file, range: info.unicodeRanges[sub] });
  }
}
fs.writeFileSync("src/fontManifest.json", JSON.stringify(out, null, 1));
console.log(out.length, "files");
