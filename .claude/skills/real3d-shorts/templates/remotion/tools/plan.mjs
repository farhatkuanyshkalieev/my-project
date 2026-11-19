// План монтажа → src/plan.json: субтитры (текст script/voice_display.txt × тайминги whisper) + звуки из ../audio/cues.json.
//   node tools/plan.mjs
// cues.json (пишет film.py или Claude руками): [{"k": "sfx_thud", "f": 388, "v": 0.9}, …]
import fs from "node:fs";
import path from "node:path";

const FPS = 30;
const ROOT = path.resolve("..");
const words = JSON.parse(fs.readFileSync(path.join(ROOT, "audio", "words.json"), "utf8"));
const shots = JSON.parse(fs.readFileSync(path.join(ROOT, "audio", "shots.json"), "utf8"));
const dispFile = fs.existsSync(path.join(ROOT, "script", "voice_display.txt")) ? "voice_display.txt" : "voice.txt";
const disp = fs.readFileSync(path.join(ROOT, "script", dispFile), "utf8").split(/\s+/).filter((w) => w && w !== "—" && w !== "-");

// слово сценария i ↔ слово whisper j (пропорционально)
const scale = words.length / disp.length;
const timed = disp.map((t, i) => {
  const j = Math.min(words.length - 1, Math.floor(i * scale));
  const j2 = Math.min(words.length - 1, Math.max(j, Math.floor((i + 1) * scale) - 1));
  return { t, s: words[j].s, e: words[j2].e };
});
// группы по 2–3 слова, рвём на знаках препинания
const groups = [];
let cur = [];
const flush = () => {
  if (!cur.length) return;
  groups.push({ start: Math.round(cur[0].s * FPS), end: Math.round(cur[cur.length - 1].e * FPS), text: cur.map((w) => w.t).join(" ") });
  cur = [];
};
for (const w of timed) {
  cur.push(w);
  if (cur.length === 3 || /[.,:!?;]$/.test(w.t)) flush();
}
flush();
for (let i = 0; i < groups.length - 1; i++) groups[i].end = Math.max(groups[i].end, Math.min(groups[i + 1].start, groups[i].end + 12));
groups[0].start = 0;

const cuesFile = path.join(ROOT, "audio", "cues.json");
const sfx = fs.existsSync(cuesFile) ? JSON.parse(fs.readFileSync(cuesFile, "utf8")) : [];
const ambience = fs.existsSync("public/amb_wind.wav") ? "amb_wind.wav" : null;
const plan = { fps: FPS, total: shots.total, groups, sfx, musicVolume: 0.14, ambience, ambienceVolume: 0.28 };
fs.writeFileSync("src/plan.json", JSON.stringify(plan, null, 1));
console.log(`plan.json: ${groups.length} групп субтитров, ${sfx.length} звуков, ${shots.total} кадров`);
