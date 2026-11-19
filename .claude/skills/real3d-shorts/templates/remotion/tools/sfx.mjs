// Звуки синтезом через ffmpeg (резерв, если ElevenLabs Sound Effects недоступен) → public/*.wav
//   node tools/sfx.mjs [длительность_эмбиента_сек]
// amb_wind, sfx_thud (удар о снег/землю), sfx_puff (мягкое падение), sfx_heart (сердцебиение),
// sfx_whoosh (переход whip), sfx_hit (удар snap_zoom), sfx_riser (нарастание к повороту).
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const D = Number(process.argv[2] ?? 50);
fs.mkdirSync("public", { recursive: true });
const ff = (args, out) => { execFileSync("ffmpeg", ["-v", "error", "-y", ...args, `public/${out}.wav`]); console.log("✅", out); };
const st = "aformat=channel_layouts=stereo";

ff(["-f", "lavfi", "-i", `anoisesrc=d=${D}:c=brown:a=0.6:r=48000`, "-f", "lavfi", "-i", `anoisesrc=d=${D}:c=pink:a=0.05:r=48000`, "-filter_complex",
  `[0]bandpass=f=420:w=380,volume=1.6,tremolo=f=0.12:d=0.6,tremolo=f=0.31:d=0.35[w];[1]highpass=f=5000,volume=0.6[s];[w][s]amix=inputs=2:normalize=0,afade=t=in:d=1.5,afade=t=out:st=${D - 2}:d=2,${st}`], "amb_wind");
ff(["-f", "lavfi", "-i", "sine=f=62:d=0.45:r=48000", "-f", "lavfi", "-i", "anoisesrc=d=0.45:c=brown:a=0.8:r=48000", "-filter_complex",
  `[0]volume=1.2[a];[1]lowpass=f=700[b];[a][b]amix=inputs=2:normalize=0,afade=t=out:st=0.02:d=0.42:curve=exp,${st}`], "sfx_thud");
ff(["-f", "lavfi", "-i", "anoisesrc=d=0.35:c=pink:a=0.6:r=48000", "-af", `lowpass=f=1500,highpass=f=120,afade=t=in:d=0.01,afade=t=out:st=0.03:d=0.3:curve=exp,${st}`], "sfx_puff");
ff(["-f", "lavfi", "-i", "aevalsrc='0.9*sin(2*PI*48*t)*(exp(-28*mod(t,1.09))+0.7*exp(-28*mod(t-0.26,1.09))*gt(mod(t,1.09),0.26))':s=48000:d=7",
  "-af", `lowpass=f=180,afade=t=in:d=0.5,afade=t=out:st=6:d=1,${st}`], "sfx_heart");
ff(["-f", "lavfi", "-i", "anoisesrc=d=0.6:c=white:a=0.5:r=48000", "-af",
  `bandpass=f=900:w=1400,volume='if(lt(t,0.3),t/0.3,(0.6-t)/0.3)':eval=frame,afade=t=out:st=0.4:d=0.2,${st}`], "sfx_whoosh");
ff(["-f", "lavfi", "-i", "sine=f=48:d=0.8:r=48000", "-f", "lavfi", "-i", "anoisesrc=d=0.8:c=brown:a=0.9:r=48000", "-filter_complex",
  `[0]volume=1.6[a];[1]lowpass=f=400[b];[a][b]amix=inputs=2:normalize=0,afade=t=out:st=0.03:d=0.75:curve=exp,${st}`], "sfx_hit");
ff(["-f", "lavfi", "-i", "aevalsrc='0.4*sin(2*PI*(110+300*t*t/4)*t)':s=48000:d=2", "-f", "lavfi", "-i", "anoisesrc=d=2:c=pink:a=0.3:r=48000", "-filter_complex",
  `[1]highpass=f=2000[n];[0][n]amix=inputs=2:normalize=0,volume='t/2':eval=frame,${st}`], "sfx_riser");
