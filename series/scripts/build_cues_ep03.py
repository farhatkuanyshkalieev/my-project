"""Episode 3 cue sheet from voiceover word timings (see build_cues.py).

    python3 scripts/build_cues_ep03.py public/ep03/words.json src/episodes/ep03/cues.json
"""
import json
import sys

import build_cues
from build_cues import Words, norm

OFFSET = 1.0  # one second of phone screen before the narration
build_cues.OFFSET = OFFSET


class Words3(Words):
    def after(self, first, second):
        """Video-time start of `second` when it immediately follows `first`."""
        for a, b in zip(self.words, self.words[1:]):
            if norm(a["w"]) == norm(first) and norm(b["w"]) == norm(second):
                return b["s"] + OFFSET
        raise KeyError(f"{first!r} {second!r} not in voiceover")


def build(words):
    W = Words3(words)
    r = lambda v: round(v, 3)
    b = {}
    b["recap"] = W.s("пятьдесят")
    b["deadline"] = W.seq("до", "утра")
    b["pay"] = W.s("платить")
    b["run"] = W.s("бежать")
    b["both"] = W.seq("ты", "выбрал")
    b["bothStamp"] = W.s("другое")
    b["dawn"] = W.s("рассвет")
    b["backyard"] = W.s("задний")
    b["whoWrote"] = W.seq("и", "тот")
    b["reveal"] = W.s("администратор")
    b["name"] = W.s("гена", 1)
    b["envelope"] = W.s("отдаёшь")
    b["smile"] = W.s("улыбается")
    b["wide"] = W.s("широко")
    b["twoDays"] = W.seq("а", "через")
    b["chain"] = W.s("золотая")
    b["rims"] = W.s("диски")
    b["restaurant"] = W.s("ресторан")
    b["allCash"] = W.s("наличкой")
    b["rule"] = W.seq("но", "магазин")
    b["over10k"] = W.s("десяти")
    b["report"] = W.s("сообщить")
    b["buyer"] = W.s("покупателе")
    b["analyst"] = W.s("аналитик")
    b["account"] = W.s("счёт")
    b["salary"] = W.s("зарплата")
    b["spent"] = W.s("потрачено")
    b["spentNum"] = W.s("двадцать")
    b["thread"] = W.s("одна")
    b["t1"] = W.s("мотель")
    b["t2"] = W.s("номер")
    b["t3"] = W.after("семь", "ты")
    b["forest"] = W.seq("а", "ты")
    b["shovel"] = W.s("лопатой")
    b["suddenly"] = W.seq("и", "вдруг")
    b["headlights"] = W.s("фары")
    b["followed"] = W.s("гена", 2)
    b["split"] = W.s("давай")
    b["half"] = W.s("пополам")
    b["share"] = W.s("делиться")
    b["refuse"] = W.s("отказать")
    b["comments"] = W.s("пиши")
    vo_end = W.e("комментариях")
    b["ep4"] = vo_end + 0.45
    b["follow"] = b["ep4"] + 2.6
    b["tease"] = 57.2
    b["out"] = 59.55

    sc = {}
    sc["phone"] = [0, b["pay"] - 0.2]
    sc["choice1"] = [sc["phone"][1], b["dawn"] - 0.15]
    sc["dawn"] = [sc["choice1"][1], b["twoDays"] - 0.15]
    sc["spree"] = [sc["dawn"][1], b["rule"] - 0.15]
    sc["rule"] = [sc["spree"][1], b["analyst"] - 0.15]
    sc["account"] = [sc["rule"][1], b["thread"] - 0.15]
    sc["thread"] = [sc["account"][1], b["forest"] - 0.15]
    sc["forest"] = [sc["thread"][1], b["share"] - 0.2]
    sc["choice2"] = [sc["forest"][1], vo_end + 0.25]
    sc["end"] = [sc["choice2"][1], 60]

    sus = [
        [0, 61],
        [b["spent"], 61],
        [b["spentNum"] + 0.6, 70],
        [b["t3"], 70],
        [b["t3"] + 0.6, 84],
        [b["headlights"], 84],
        [b["headlights"] + 0.5, 91],
        [60, 91],
    ]
    cash = [[0, 10_000_000], [b["envelope"] + 0.4, 10_000_000], [b["envelope"] + 0.9, 9_950_000], [60, 9_950_000]]
    rr = lambda v: [r(x) for x in v] if isinstance(v, list) else r(v)
    return {
        "fps": 60,
        "duration": 60,
        "voOffset": OFFSET,
        "scenes": {k: rr(v) for k, v in sc.items()},
        "beats": {k: rr(v) for k, v in b.items()},
        "suspicion": [rr(p) for p in sus],
        "cash": [rr(p) for p in cash],
    }


if __name__ == "__main__":
    cues = build(json.load(open(sys.argv[1])))
    with open(sys.argv[2], "w") as f:
        json.dump(cues, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(cues["scenes"], ensure_ascii=False))
