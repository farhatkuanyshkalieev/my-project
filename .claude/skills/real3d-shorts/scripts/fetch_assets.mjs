// Ассеты Poly Haven (CC0) в общий кэш ~/.real3d-shorts/polyhaven (2k).
//   node fetch_assets.mjs textures snow_02 pine_bark      → textures/<name>/<name>_{diff,nor,rough,disp}.jpg
//   node fetch_assets.mjs hdris rogland_moonlit_night     → hdris/<name>.hdr
//   node fetch_assets.mjs models <name>                   → models/<name>/<name>.gltf (+ bin, текстуры)
//   node fetch_assets.mjs search textures snow            → список подходящих имён (по имени/категориям/тегам)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.join(process.env.REAL3D_HOME || path.join(os.homedir(), ".real3d-shorts"), "polyhaven");
const API = "https://api.polyhaven.com";
const [kind, ...names] = process.argv.slice(2);
const get = async (u) => { const r = await fetch(u, { headers: { "User-Agent": "real3d-shorts" } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };
const save = async (u, f) => {
  if (fs.existsSync(f) && fs.statSync(f).size > 0) return;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Buffer.from(await (await get(u)).arrayBuffer()));
};

if (kind === "search") {
  const [type, word] = names;
  const all = await (await get(`${API}/assets?t=${type}`)).json();
  const w = (word || "").toLowerCase();
  const hits = Object.entries(all).filter(([id, a]) => id.includes(w) || (a.categories || []).some((c) => c.includes(w)) || (a.tags || []).some((t) => t.includes(w)));
  console.log(hits.slice(0, 60).map(([id]) => id).join("  ") || "ничего не найдено");
}

for (const name of kind === "search" ? [] : names) {
  const files = await (await get(`${API}/files/${name}`)).json();
  if (kind === "textures") {
    const map = { Diffuse: "diff", nor_gl: "nor", Rough: "rough", Displacement: "disp" };
    for (const [k, part] of Object.entries(map)) {
      const e = files[k]?.["2k"];
      if (!e) continue;
      const src = e.jpg || e.png;
      await save(src.url, path.join(ROOT, "textures", name, `${name}_${part}.jpg`));
    }
  } else if (kind === "hdris") {
    await save(files.hdri["2k"].hdr.url, path.join(ROOT, "hdris", `${name}.hdr`));
  } else if (kind === "models") {
    const g = files.gltf["2k"].gltf;
    const dir = path.join(ROOT, "models", name);
    await save(g.url, path.join(dir, `${name}.gltf`));
    for (const [rel, inc] of Object.entries(g.include || {})) await save(inc.url, path.join(dir, rel));
  } else {
    console.error("kind = textures | hdris | models | search");
    process.exit(1);
  }
  console.log("✅", kind, name);
}
