// Границы шотов по голосу: каждая фраза script/voice.txt (по строкам) = шот.
//   node tools/shots.mjs  → ../audio/shots.json {fps, total, shots:[{i, text, start, end}]}
// Слова сценария сопоставляются со словами whisper по порядку (устойчиво к ошибкам распознавания).
import fs from "node:fs";
import path from "node:path";

const FPS = 30;
const ROOT = path.resolve("..");
const words = JSON.parse(fs.readFileSync(path.join(ROOT, "audio", "words.json"), "utf8"));
const lines = fs.readFileSync(path.join(ROOT, "script", "voice.txt"), "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const count = (s) => s.split(/\s+/).map(norm).filter(Boolean).length;

// доля слов сценария → индекс слова whisper (если whisper слил/разбил слова — масштабируем)
const totalScript = lines.reduce((n, l) => n + count(l), 0);
const scale = words.length / totalScript;
let acc = 0;
const shots = lines.map((text, k) => {
  const a = Math.min(words.length - 1, Math.round(acc * scale));
  acc += count(text);
  const b = Math.min(words.length - 1, Math.max(a, Math.round(acc * scale) - 1));
  return { i: k + 1, text, s: words[a].s, e: words[b].e };
});
const lastEnd = shots[shots.length - 1].e;
const total = Math.ceil((lastEnd + 0.6) * FPS);
// шот начинается со своей фразы и длится до начала следующей (склейка — на начале фразы)
const out = shots.map((s, k) => ({
  i: s.i, text: s.text,
  start: k === 0 ? 1 : Math.round(s.s * FPS) + 1,
  end: k === shots.length - 1 ? total : Math.round(shots[k + 1].s * FPS),
}));
fs.writeFileSync(path.join(ROOT, "audio", "shots.json"), JSON.stringify({ fps: FPS, total, shots: out }, null, 1));
console.log(out.map((s) => `${s.i}: ${s.start}–${s.end} (${((s.end - s.start + 1) / FPS).toFixed(1)} с) ${s.text.slice(0, 40)}`).join("\n"));
