"""(EP=NN selects the episode) Build subtitles from the real dialogue timing: SRT + one transparent overlay PNG per cue."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from episode_paths import TL, LIPS, SUBS, SRT
from engine.core import new_surface, save_png
from engine.core import font
from engine.ui import render_subtitle, wrap_words, SUB_MAXW

lips = json.load(open(LIPS))


def cues():
    out = []
    for lid, text, red, col in TL.SUBTITLES:
        L = TL.LINES[lid]
        speech = len(lips[lid]["env"]) / 60.0
        a = L["t"] - 0.08
        b = max(a + 1.0, L["t"] + speech + 0.25)
        out.append(dict(id=lid, start=a, end=b, text=text, red=red, color=col, y=getattr(TL, "SUB_POS", {}).get(lid)))
    for i in range(len(out) - 1):          # never overlap the next cue
        out[i]["end"] = min(out[i]["end"], out[i + 1]["start"] - 0.04)
    out[-1]["end"] = min(out[-1]["end"], TL.EV["cut_black"])
    return out


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


if __name__ == "__main__":
    cs = cues()
    sub_dir = SUBS
    os.makedirs(os.path.join(sub_dir, "overlays"), exist_ok=True)
    with open(SRT, "w", encoding="utf-8") as f:
        for i, c in enumerate(cs, 1):
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")
    for c in cs:   # render_subtitle keeps at most 2 lines — refuse to silently drop words
        assert len(wrap_words(c["text"], font("inter-xbold", 60), SUB_MAXW)) <= 2, f"cue {c['id']} needs more than 2 lines"
        s = new_surface()
        kw = dict(y=c["y"]) if c.get("y") else {}
        render_subtitle(s.getCanvas(), c["text"], red_words=c["red"], color=c["color"], **kw)
        save_png(s, os.path.join(sub_dir, "overlays", f"{c['id']}.png"))
    json.dump(cs, open(os.path.join(sub_dir, "cues.json"), "w"), ensure_ascii=False, indent=1)
    print(open(SRT, encoding="utf-8").read())
