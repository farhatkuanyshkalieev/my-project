// Пословные тайминги голоса (локальный whisper.cpp, бесплатно, без интернета после первой загрузки ~470 МБ).
//   node tools/whisper.mjs public/voice.mp3 <язык: ru|en|...>  → ../audio/words.json  [{t, s, e}]
// Грабли: в Windows установщик Remotion ломается на пробелах в пути (Expand-Archive) — поэтому распаковываем сами.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from "@remotion/install-whisper-cpp";

const src = path.resolve(process.argv[2] ?? "public/voice.mp3");
const lang = process.argv[3] ?? "ru";
const WDIR = path.join(os.homedir(), ".real3d-shorts", "whisper");   // без пробелов, общий для всех проектов
const MODEL = "small";
fs.mkdirSync(path.dirname(WDIR), { recursive: true });   // саму WDIR не создавать: установщик Remotion требует, чтобы её не было
const wav = path.join(os.tmpdir(), "real3d_voice_16k.wav");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", wav]);
const exe = process.platform === "win32" ? "main.exe" : "main";
if (!fs.existsSync(path.join(WDIR, exe))) {
  try {
    await installWhisperCpp({ to: WDIR, version: "1.5.5" });
  } catch (e) {
    const zip = fs.readdirSync(process.cwd()).find((f) => f.startsWith("whisper-bin") && f.endsWith(".zip"));
    if (process.platform === "win32" && zip) {
      execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${path.resolve(zip)}' -DestinationPath '${WDIR}'`]);
      fs.rmSync(zip);
    } else throw e;
  }
}
await downloadWhisperModel({ model: MODEL, folder: WDIR });
const { transcription } = await transcribe({ inputPath: wav, whisperPath: WDIR, model: MODEL, tokenLevelTimestamps: true, language: lang });
const { captions } = toCaptions({ whisperCppOutput: { transcription } });
// токены → слова (новое слово начинается с пробела)
const words = [];
for (const c of captions) {
  const s = c.text;
  if (!s.trim()) continue;
  if (/^[\s]*[.,!?:;%—-]+$/.test(s) && words.length) { words[words.length - 1].t += s.trim(); continue; }
  if (/^\s/.test(s) || !words.length) words.push({ t: s.trim(), s: +(c.startMs / 1000).toFixed(2), e: +(c.endMs / 1000).toFixed(2) });
  else { words[words.length - 1].t += s; words[words.length - 1].e = +(c.endMs / 1000).toFixed(2); }
}
fs.mkdirSync(path.resolve("../audio"), { recursive: true });
fs.writeFileSync(path.resolve("../audio/words.json"), JSON.stringify(words, null, 1));
console.log(words.length, "слов →", path.resolve("../audio/words.json"));
console.log(words.map((w) => w.s.toFixed(1) + " " + w.t).join(" | "));
