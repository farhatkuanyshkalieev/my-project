"""Derive an episode's cue sheet (scenes, beats, suspicion curve) from voiceover word timings.

Every beat is anchored to a spoken word, so a new take only needs a fresh words.json:
    python3 scripts/build_cues.py public/ep01/words.json src/episodes/ep01/cues.json
"""
import json
import re
import sys

OFFSET = 0.15  # voiceover starts this many seconds into the video
DURATION = 60
FPS = 60


def norm(w):
    return re.sub(r"[^а-яёa-z]", "", w.lower())


class Words:
    def __init__(self, words):
        self.words = words

    def find(self, text, nth=1):
        """Video-time (start, end) of the nth occurrence of a word."""
        k = 0
        for w in self.words:
            if norm(w["w"]) == norm(text):
                k += 1
                if k == nth:
                    return w["s"] + OFFSET, w["e"] + OFFSET
        raise KeyError(f"{text!r} #{nth} not in voiceover")

    def seq(self, first, second):
        """Video-time start of `first` when it is immediately followed by `second`."""
        for a, b in zip(self.words, self.words[1:]):
            if norm(a["w"]) == norm(first) and norm(b["w"]) == norm(second):
                return a["s"] + OFFSET
        raise KeyError(f"{first!r} {second!r} not in voiceover")

    def s(self, text, nth=1):
        return self.find(text, nth)[0]

    def e(self, text, nth=1):
        return self.find(text, nth)[1]


def build(words):
    W = Words(words)
    r = lambda v: round(v, 3)
    b = {}
    b["tenMillion"] = W.s("десять")
    b["cash"] = W.s("наличкой")
    b["bags"] = W.s("они")
    b["fourBags"] = W.s("четырёх")
    b["lifeIsGood"] = W.s("жизнь")
    b["shades"] = W.s("всё")
    b["freeze"] = W.s("но")
    b["worse"] = W.s("гораздо")
    b["p1Label"] = W.s("проблема", 1)
    b["p1Word"] = W.s("вес")
    b["gridStart"] = W.s("десять", 2)
    b["countStart"] = W.s("сто", 1) - 0.02
    b["countEnd"] = W.e("купюр", 1)
    b["kg"] = W.s("сто", 2)
    b["kgLand"] = b["kg"] + 0.32
    b["stairsFail"] = W.s("лестнице")
    b["p2Label"] = W.s("проблема", 2)
    b["p2Word"] = W.s("номера", 1)
    b["scanStart"] = W.s("банки")
    b["serialLock"] = W.s("серийные")
    b["dbStart"] = W.s("части") + 0.1
    b["marked"] = W.s("меченые")
    b["registerScan"] = W.s("одна") + 0.45
    b["registerAlert"] = W.s("кассе")
    b["hunted"] = W.seq("и", "тебя")
    b["p3Label"] = W.s("проблема", 3)
    b["youself"] = W.s("сам") - 0.3
    b["closeUp"] = b["youself"] + 0.75
    b["noSleep"] = W.s("спал") - 0.3
    b["siren"] = W.s("вздрагиваешь")
    b["flinch"] = b["siren"] + 0.7
    b["andThen"] = W.s("тут") - 0.2
    b["knockWord"] = W.s("стук")
    door_end = W.e("дверь")
    b["knocks"] = [r(door_end + d) for d in (0.3, 0.65, 1.0)]
    b["cut"] = b["knocks"][2] + 0.25
    b["who"] = W.s("кто")
    b["ep2"] = W.s("второй")
    b["follow"] = b["ep2"] + 2.05
    b["out"] = 59.55

    sc = {}
    sc["motel"] = [0, W.e("сумках") - 0.05]
    sc["rich"] = [sc["motel"][1] - 0.1, b["worse"]]
    weight0 = b["p1Label"] - 0.18
    sc["title"] = [b["worse"], weight0 + 0.15]
    stairs0 = W.seq("ты", "не") - 0.17
    sc["weight"] = [weight0, stairs0 + 0.15]
    serial0 = b["p2Label"] - 0.37
    sc["stairs"] = [stairs0, serial0 + 0.05]
    register0 = W.s("одна") - 0.2
    sc["serial"] = [serial0, register0 + 0.1]
    nerves0 = b["p3Label"] - 0.13
    sc["register"] = [register0, nerves0 + 0.05]
    door0 = W.seq("и", "тут") - 0.12
    sc["nerves"] = [nerves0, door0]
    sc["door"] = [door0, b["cut"]]
    sc["end"] = [b["cut"], DURATION]

    sus = [
        [0, 0],
        [b["registerAlert"], 0],
        [b["registerAlert"] + 0.55, 41],
        [b["siren"] + 0.2, 41],
        [b["siren"] + 0.8, 73],
        [b["knocks"][0], 73],
        [b["knocks"][0] + 0.8, 97],
    ]
    rr = lambda v: [r(x) for x in v] if isinstance(v, list) else r(v)
    return {
        "fps": FPS,
        "duration": DURATION,
        "voOffset": OFFSET,
        "scenes": {k: rr(v) for k, v in sc.items()},
        "beats": {k: rr(v) for k, v in b.items()},
        "suspicion": [rr(p) for p in sus],
    }


if __name__ == "__main__":
    words = json.load(open(sys.argv[1]))
    cues = build(words)
    with open(sys.argv[2], "w") as f:
        json.dump(cues, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(cues["scenes"], ensure_ascii=False))
