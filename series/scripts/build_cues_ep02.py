"""Episode 2 cue sheet from voiceover word timings (see build_cues.py).

    python3 scripts/build_cues_ep02.py public/ep02/words.json src/episodes/ep02/cues.json
"""
import json
import sys

import build_cues
from build_cues import Words

OFFSET = 1.6  # three knocks play before the narration starts
build_cues.OFFSET = OFFSET


def build(words):
    W = Words(words)
    r = lambda v: round(v, 3)
    b = {}
    b["knocks"] = [0.15, 0.5, 0.85]
    b["peep"] = W.s("глазок")
    b["notPolice"] = W.seq("не", "полиция")
    b["admin"] = W.s("администратор")
    b["cleaning"] = W.s("уборка")
    b["exhale"] = W.s("выдыхаешь")
    b["peeked"] = W.s("заглянуть")
    b["bagsSeen"] = W.s("сумки")
    b["worse"] = W.s("теперь")
    b["question"] = W.s("куда")
    b["opt1"] = W.s("вариант", 1)
    b["bank"] = W.s("банк")
    b["deposit"] = W.s("взнос")
    b["overLine"] = W.s("десяти")
    b["report"] = W.s("отчёт")
    b["auto"] = W.s("автоматически")
    b["opt2"] = W.s("вариант", 2)
    b["storage"] = W.s("склад")
    b["passport"] = W.s("паспорту")
    b["cameras"] = W.s("камеры")
    b["opt3"] = W.s("вариант", 3)
    b["safe"] = W.s("банковская")
    b["chkPassport"] = W.s("паспорт")
    b["chkSign"] = W.s("подпись")
    b["chkCam"] = W.s("камера")
    b["again"] = W.s("снова")
    b["meanwhile"] = W.seq("а", "тем")
    b["analyst"] = W.s("аналитик")
    b["board"] = W.s("доску")
    b["pin1"] = W.s("купюра")
    b["pin2"] = W.s("мотель")
    b["pin3"] = W.s("парень")
    b["suddenly"] = W.seq("и", "вдруг")
    b["phoneOn"] = W.s("загорается")
    b["msg1"] = W.s("видел") - 0.25
    b["msg2"] = W.s("мне")
    b["msg3"] = W.seq("до", "утра")
    b["pay"] = W.s("платить")
    b["run"] = W.s("бежать")
    b["comments"] = W.s("пиши")
    b["ep3"] = W.s("третья")
    b["follow"] = b["ep3"] + 2.6
    b["tease"] = 57.3
    b["out"] = 59.55

    sc = {}
    sc["door"] = [0, b["notPolice"] - 0.2]
    sc["peephole"] = [sc["door"][1], b["exhale"] - 0.25]
    sc["relief"] = [sc["peephole"][1], W.seq("но", "он") - 0.1]
    sc["witness"] = [sc["relief"][1], b["worse"] - 0.05]
    sc["title"] = [sc["witness"][1], b["question"] - 0.1]
    sc["question"] = [sc["title"][1], b["opt1"] - 0.15]
    sc["options"] = [sc["question"][1], b["meanwhile"] - 0.2]
    sc["analyst"] = [sc["options"][1], b["suddenly"] - 0.15]
    sc["phone"] = [sc["analyst"][1], b["pay"] - 0.2]
    sc["choice"] = [sc["phone"][1], b["ep3"] - 0.15]
    sc["end"] = [sc["choice"][1], 60]

    sus = [[0, 97], [b["exhale"], 97], [b["exhale"] + 0.6, 38], [b["pin3"], 38], [b["pin3"] + 0.7, 61], [60, 61]]
    rr = lambda v: [r(x) for x in v] if isinstance(v, list) else r(v)
    return {
        "fps": 60,
        "duration": 60,
        "voOffset": OFFSET,
        "scenes": {k: rr(v) for k, v in sc.items()},
        "beats": {k: rr(v) for k, v in b.items()},
        "suspicion": [rr(p) for p in sus],
    }


if __name__ == "__main__":
    cues = build(json.load(open(sys.argv[1])))
    with open(sys.argv[2], "w") as f:
        json.dump(cues, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(cues["scenes"], ensure_ascii=False))
