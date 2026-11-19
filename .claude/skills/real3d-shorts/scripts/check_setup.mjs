// Проверка окружения перед стартом.   node scripts/check_setup.mjs
// Печатает ✅/❌ по каждому пункту и путь к Blender (его нужно записать в project.json → "blender").
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ok = (m) => console.log("✅", m), bad = (m) => console.log("❌", m), info = (m) => console.log("   ", m);
const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch { return null; } };

// Node.js
const nv = Number(process.versions.node.split(".")[0]);
nv >= 18 ? ok(`Node.js ${process.versions.node}`) : bad(`Node.js ${process.versions.node} — нужен 18+ (https://nodejs.org → LTS)`);

// ffmpeg
const ff = run("ffmpeg", ["-version"]);
ff ? ok("ffmpeg " + ff.split("\n")[0].split(" ")[2]) : bad("ffmpeg не найден. Windows: winget install Gyan.FFmpeg  ·  Mac: brew install ffmpeg");

// Blender
const cands = [];
if (process.platform === "win32") {
  const pf = process.env["ProgramFiles"] || "C:\\Program Files";
  const root = path.join(pf, "Blender Foundation");
  if (fs.existsSync(root)) for (const d of fs.readdirSync(root).sort().reverse()) cands.push(path.join(root, d, "blender.exe"));
  const steam = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe";
  cands.push(steam);
} else if (process.platform === "darwin") {
  cands.push("/Applications/Blender.app/Contents/MacOS/Blender", path.join(os.homedir(), "Applications/Blender.app/Contents/MacOS/Blender"));
} else cands.push("/usr/bin/blender", "/snap/bin/blender");
let blender = cands.find((p) => fs.existsSync(p));
if (blender) {
  const v = run(blender, ["--version"]);
  const ver = v ? v.split("\n")[0] : "?";
  const num = Number((ver.match(/Blender (\d+\.\d+)/) || [0, 0])[1]);
  num >= 5.1 ? ok(`${ver}  →  ${blender}`) : bad(`${ver} — нужен Blender 5.1 или новее (https://www.blender.org/download/)`);
  const t = run(blender, ["-b", "--factory-startup", "--python-expr",
    "import bpy; bpy.ops.mesh.primitive_uv_sphere_add(); print('SPHERE_OK', len(bpy.data.objects))"]);
  t && t.includes("SPHERE_OK") ? ok("Blender запускается из командной строки и создаёт шар") : bad("Blender не выполнил тестовый скрипт");
} else bad("Blender не найден. Скачайте 5.1+ с https://www.blender.org/download/ и установите в стандартную папку");

// Мост Blender ↔ Claude (необязательно, для живого просмотра): порт 9876 открыт, если Blender запущен и мост включён
await new Promise((res) => {
  const s = net.connect({ host: "127.0.0.1", port: 9876, timeout: 1500 }, () => { ok("Мост Blender ↔ Claude отвечает на порту 9876"); s.destroy(); res(); });
  s.on("error", () => { info("Мост Blender ↔ Claude не отвечает (это нормально, если Blender закрыт; для работы скилла мост не обязателен)"); res(); });
  s.on("timeout", () => { s.destroy(); info("Мост: нет ответа"); res(); });
});
if (blender) console.log("\nBLENDER_PATH=" + blender);

// MPFB (генератор людей) и пакет MakeHuman — нужны для героев
if (blender) {
  const m = run(blender, ["-b", "--python-expr",
    "import os\ntry:\n import bl_ext.blender_org.mpfb\n from bl_ext.blender_org.mpfb.services.locationservice import LocationService as L\n s=os.path.join(L.get_user_data(),'skins')\n print('MPFB_OK', len(os.listdir(s)) if os.path.isdir(s) else 0)\nexcept Exception as e:\n print('MPFB_NO')"]);
  const mm = m && m.match(/MPFB_OK (\d+)/);
  if (mm && +mm[1] > 0) ok(`MPFB установлен, пакет MakeHuman подключён (${mm[1]} скинов)`);
  else if (mm) bad("MPFB есть, но пакет MakeHuman не подключён → blender -b --python <SKILL>/scripts/blender/install_mpfb.py");
  else bad("MPFB не установлен → blender -b --python <SKILL>/scripts/blender/install_mpfb.py");
}
