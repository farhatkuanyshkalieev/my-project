"""Build subtitles from the real dialogue timing: SRT + one transparent overlay PNG per cue."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as TL
from engine.core import new_surface, save_png
from engine.ui import render_subtitle

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lips = json.load(open(os.path.join(ROOT, "compositions", "lipsync.json")))


def cues():
    out = []
    for lid, text, red, col in TL.SUBTITLES:
        L = TL.LINES[lid]
        speech = len(lips[lid]["env"]) / 60.0
        a = L["t"] - 0.08
        b = max(a + 1.0, L["t"] + speech + 0.25)
        out.append(dict(id=lid, start=a, end=b, text=text, red=red, color=col))
    for i in range(len(out) - 1):          # never overlap the next cue
        out[i]["end"] = min(out[i]["end"], out[i + 1]["start"] - 0.04)
    out[-1]["end"] = min(out[-1]["end"], TL.EV["cut_black"])
    return out


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


if __name__ == "__main__":
    cs = cues()
    sub_dir = os.path.join(ROOT, "subtitles")
    with open(os.path.join(sub_dir, "episode_01_subtitles.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(cs, 1):
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")
    for c in cs:
        s = new_surface()
        render_subtitle(s.getCanvas(), c["text"], red_words=c["red"], color=c["color"])
        save_png(s, os.path.join(sub_dir, "overlays", f"{c['id']}.png"))
    json.dump(cs, open(os.path.join(sub_dir, "cues.json"), "w"), ensure_ascii=False, indent=1)
    print(open(os.path.join(sub_dir, "episode_01_subtitles.srt"), encoding="utf-8").read())
