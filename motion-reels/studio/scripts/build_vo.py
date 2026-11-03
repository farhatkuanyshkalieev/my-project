"""
Собирает дорожку голоса по плану и считает приглушение музыки под голосом.
  python3 scripts/build_vo.py src/reels/lishniy-ves.vo.json
План: { "clips": {"15": старт_сек, ...}, "cut": {"23": обрезать_после_сек}, "duration": сек }
Клипы: public/vo/clips/<id>.wav (после process_voice.sh)
Выход: public/vo/<name>.wav и src/reels/<name>.duck.json (громкость музыки по кадрам, 0..1)
"""
import json, sys, os
import numpy as np, soundfile as sf

plan_path = sys.argv[1]
plan = json.load(open(plan_path))
name = os.path.basename(plan_path).replace(".vo.json", "")
SR, FPS = 48000, 30
total = int(plan["duration"] * SR)
track = np.zeros(total)
for cid, start in plan["clips"].items():
    y, sr = sf.read(f"public/vo/clips/{cid}.wav")
    assert sr == SR, sr
    if y.ndim > 1: y = y.mean(1)
    if cid in plan.get("cut", {}):
        y = y[: int(plan["cut"][cid] * SR)]  # обрыв на полуслове — без фейда
    a = int(start * SR)
    b = min(total, a + len(y))
    track[a:b] += y[: b - a]
sf.write(f"public/vo/{name}.wav", track, SR, subtype="PCM_24")

# дакинг: где голос звучит — музыка 0.3, в паузах — 1.0; атака 2 кадра, отпускание 12 кадров
hop = SR // FPS
n = total // hop
rms = np.array([np.sqrt(np.mean(track[i*hop:(i+1)*hop] ** 2) + 1e-12) for i in range(n)])
active = 20 * np.log10(rms) > -42
# держим «голос активен» ещё 6 кадров, чтобы музыка не подпрыгивала между словами
hold = active.copy()
for i in range(n):
    if active[i]: hold[i:i+7] = True
g, out = 1.0, []
for i in range(n):
    target = 0.3 if hold[i] else 1.0
    g += (target - g) * (0.5 if target < g else 1 / 12)
    out.append(round(g, 3))
json.dump(out, open(f"src/reels/{name}.duck.json", "w"))
print(f"{name}: {plan['duration']}s, клипов {len(plan['clips'])}, кадров {n}")
