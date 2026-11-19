// Оригинальный эмбиент-подклад (синтез в чистом JS, без интернета) → public/music.wav
//   node tools/music.mjs <секунды> <cold|tense|warm|wonder>
// Пэды по аккордам + редкие «фелт-пиано» ноты + реверберация. Резерв, если ElevenLabs Music недоступен.
import fs from "node:fs";

const DUR = Number(process.argv[2] ?? 46), MOOD = process.argv[3] ?? "cold";
const SR = 48000, N = Math.floor(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MOODS = {
  cold:   { chords: [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [40, 52, 55, 59]], notes: [76, 72, 79, 77, 81], len: 8 },
  tense:  { chords: [[40, 52, 55, 58], [41, 53, 56, 60], [38, 50, 53, 57], [40, 52, 55, 59]], notes: [71, 70, 74, 72, 67], len: 6 },
  warm:   { chords: [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]], notes: [72, 76, 79, 74, 77], len: 8 },
  wonder: { chords: [[50, 62, 66, 69], [47, 59, 62, 66], [43, 59, 62, 67], [45, 57, 61, 64]], notes: [78, 74, 81, 76, 83], len: 7 },
};
const M = MOODS[MOOD] ?? MOODS.cold;
let rnd = 7; const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

for (let ci = 0; ci * M.len - 1 < DUR; ci++) {
  const ch = M.chords[ci % M.chords.length], t0 = ci * M.len - 1, len = M.len + 2;
  ch.forEach((m, k) => {
    const f = hz(m);
    for (let i = Math.max(0, t0 * SR); i < Math.min(N, (t0 + len) * SR); i++) {
      const t = i / SR - t0, env = Math.min(1, t / 3) * Math.min(1, (len - t) / 3);
      const v = (Math.sin(2 * Math.PI * f * (1 + 0.002 * Math.sin(1.2 * t + k)) * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * env * (k ? 0.03 : 0.05);
      L[i] += v * (k % 2 ? 0.8 : 1); R[i] += v * (k % 2 ? 1 : 0.8);
    }
  });
}
// ноты: реже в начале и в конце, чаще в середине (нарастание к повороту)
for (let t0 = 3; t0 < DUR - 3; ) {
  const m = M.notes[Math.floor(rand() * M.notes.length)], f = hz(m);
  for (let i = Math.floor(t0 * SR); i < Math.min(N, (t0 + 4) * SR); i++) {
    const t = i / SR - t0, env = Math.min(1, t / 0.008) * Math.exp(-t * 1.6);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * 2.01 * f * t) * Math.exp(-t * 4)) * env * 0.09;
    L[i] += v * 0.9; R[i] += v;
  }
  const mid = 1 - Math.abs(t0 / DUR - 0.55) * 1.6;
  t0 += 3.4 - 1.6 * Math.max(0, mid) + rand() * 0.8;
}
const oL = Float32Array.from(L), oR = Float32Array.from(R);
[[0.043, 0.35], [0.071, 0.3], [0.113, 0.26], [0.167, 0.2], [0.229, 0.16], [0.311, 0.12]].forEach(([d, g], k) => {
  const off = Math.floor(d * SR);
  for (let i = off; i < N; i++) { oL[i] += (k % 2 ? R : L)[i - off] * g; oR[i] += (k % 2 ? L : R)[i - off] * g; }
});
let peak = 0;
for (let i = 0; i < N; i++) { const t = i / SR, f = Math.min(1, t / 2) * Math.min(1, (DUR - t) / 3); oL[i] *= f; oR[i] *= f; peak = Math.max(peak, Math.abs(oL[i]), Math.abs(oR[i])); }
const g = 0.7 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oL[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oR[i] * g)) * 32767), 46 + i * 4); }
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/music.wav", buf);
console.log(`public/music.wav ${DUR} с, настроение ${MOOD}`);
