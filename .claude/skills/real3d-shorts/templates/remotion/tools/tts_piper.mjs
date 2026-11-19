// БЕСПЛАТНАЯ озвучка без регистрации: Piper (sherpa-onnx), работает офлайн на Windows/Mac.
// Звучит заметно «роботизированнее», чем ElevenLabs (честно), но разборчиво — годится для черновиков и
// роликов без монетизации. Голоса: ru_RU-dmitri-medium (муж.), ru_RU-irina-medium (жен.), en_US-ryan-high …
//   node tools/tts_piper.mjs ../script/voice.txt public/voice.wav [voice] [speed]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [, , txtFile, out = "public/voice.wav", voice = "ru_RU-dmitri-medium", speed = "1.08"] = process.argv;
const DIR = path.join(os.homedir(), ".real3d-shorts", "tts");
const vdir = path.join(DIR, `vits-piper-${voice}`);
if (!fs.existsSync(path.join(vdir, "tokens.txt"))) {
  fs.mkdirSync(DIR, { recursive: true });
  const name = `vits-piper-${voice}.tar.bz2`;
  console.log("↓ голос", voice, "(~70 МБ, один раз)");
  execFileSync("curl", ["-sL", "-f", "-o", name, `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${name}`], { cwd: DIR, stdio: "inherit" });
  const winTar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
  execFileSync(process.platform === "win32" && fs.existsSync(winTar) ? winTar : "tar", ["xjf", name], { cwd: DIR, stdio: "inherit" });
  fs.rmSync(path.join(DIR, name), { force: true });
}
const sherpa = require("sherpa-onnx-node");
const onnx = fs.readdirSync(vdir).find((f) => f.endsWith(".onnx"));
const tts = new sherpa.OfflineTts({
  model: { vits: { model: path.join(vdir, onnx), tokens: path.join(vdir, "tokens.txt"), dataDir: path.join(vdir, "espeak-ng-data"),
    noiseScale: 0.6, noiseScaleW: 0.7, lengthScale: 1.0 }, numThreads: 2, provider: "cpu" }, maxNumSentences: 1 });
// абзацы — с паузой 0.45 с между ними
const paras = fs.readFileSync(txtFile, "utf8").replace(/\[[^\]]+\]\s*/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const chunks = [];
let sr = 22050;
for (const p of paras) {
  const a = tts.generate({ text: p, sid: 0, speed: Number(speed) });
  sr = a.sampleRate;
  chunks.push(Float32Array.from(a.samples), new Float32Array(Math.floor(sr * 0.45)));
}
const total = chunks.reduce((s, c) => s + c.length, 0);
const all = new Float32Array(total);
let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const tmp = out.replace(/\.wav$/, "_raw.wav");
// сохраняем с реальной частотой модели, затем ffmpeg приводит к 44.1 кГц
const buf = Buffer.alloc(44 + total * 2);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(total * 2, 40);
for (let i = 0; i < total; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, all[i])) * 32767), 44 + i * 2);
fs.writeFileSync(tmp, buf);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-ar", "44100", out]);
fs.rmSync(tmp);
console.log("голос →", out, (total / sr).toFixed(1), "с");
