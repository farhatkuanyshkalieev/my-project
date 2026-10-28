"""Build src/timeline.json from the voiceover's word timestamps.

Every scene boundary and motion beat is anchored to a spoken word, so the
graphics stay in sync with the voice whatever the take's pacing is.

usage: python3 scripts/build_timeline.py public/audio/vo.words.json
"""
import json
import re
import sys

FPS = 30
VO_OFFSET = 0.6  # seconds of motion before the first word
TAIL = 2.0  # seconds held on the end card after the last word


def norm(w):
    return re.sub(r"[^а-яёa-z0-9]", "", w.lower())


words = json.load(open(sys.argv[1]))
for w in words:
    w["s"] += VO_OFFSET
    w["e"] += VO_OFFSET


def find(*tokens, after=0.0):
    """Start time (s) of the first word starting with any of `tokens` after `after`."""
    for w in words:
        if w["s"] >= after and any(norm(w["w"]).startswith(t) for t in tokens):
            return w["s"]
    raise SystemExit(f"anchor word not found: {tokens!r} after {after}")


f = lambda sec: int(round(sec * FPS))

t_name = find("атлантис", "atlantis")
t_impl = find("имплантац", after=t_name)
t_ther = find("терап", after=t_impl)
t_orth = find("ортодонт", after=t_ther)
t_all = find("всё", "все", after=t_orth)
t_surg = find("имплант", after=t_all + 0.5)
t_offer = find("выгодн", after=t_surg)
t_smile = find("улыбк", after=t_offer)
t_addr = find("ждём", "ждем", after=t_smile)
t_cta = find("записыв", after=t_addr)
t_wa = find("ватсап", "whatsapp", "вотсап", after=t_cta)
t_end = words[-1]["e"] + TAIL

# Cuts land a few frames before the anchor word so the picture leads the voice.
LEAD = 0.12
scenes = {
    "intro": [0, f(t_impl - LEAD)],
    "services": [f(t_impl - LEAD), f(t_surg - LEAD)],
    "surgery": [f(t_surg - LEAD), f(t_offer - LEAD)],
    "offer": [f(t_offer - LEAD), f(t_addr - LEAD)],
    "address": [f(t_addr - LEAD), f(t_cta - LEAD)],
    "cta": [f(t_cta - LEAD), f(t_end)],
}
marks = {
    "name": f(t_name),
    "implantation": f(t_impl),
    "therapy": f(t_ther),
    "ortho": f(t_orth),
    "all": f(t_all),
    "smile": f(t_smile),
    "whatsapp": f(t_wa),
}

sfx = []
add = lambda t, name, gain=1.0: sfx.append({"t": int(t), "name": name, "gain": gain})

# Intro: rise into the logo, impact as it lands, sparkle on the name.
add(0, "riser", 0.55)
add(f(0.45), "impact", 0.9)
add(marks["name"] + 4, "shine", 0.7)
add(f(VO_OFFSET + 1.4), "swoosh", 0.6)
# Scene changes get a whoosh that peaks on the cut.
for name in ("services", "surgery", "offer", "address", "cta"):
    add(scenes[name][0], "whoosh", 0.8)
# Service cards pop in word by word.
for k in ("implantation", "therapy", "ortho"):
    add(marks[k], "pop", 0.75)
add(marks["all"], "ding", 0.55)
# Implant assembles: screw, abutment, crown each click into place.
o = scenes["offer"][0]
add(o + 6, "drop", 0.6)
add(o + 14, "click", 0.7)
add(o + 22, "click", 0.7)
add(o + 26, "shine", 0.5)
add(marks["smile"], "cash", 0.7)
# Address pin drops.
add(scenes["address"][0] + 8, "drop", 0.7)
# CTA: chat bubble pops on "WhatsApp", button press.
add(marks["whatsapp"], "pop", 0.8)
add(marks["whatsapp"] + 14, "click", 0.8)
add(marks["whatsapp"] + 18, "shine", 0.6)

timeline = {
    "fps": FPS,
    "total": f(t_end),
    "voOffset": VO_OFFSET,
    "scenes": scenes,
    "marks": marks,
    "words": [{"w": w["w"].strip(), "s": f(w["s"]), "e": f(w["e"])} for w in words],
    "sfx": sorted(sfx, key=lambda x: x["t"]),
}
json.dump(timeline, open("src/timeline.json", "w"), ensure_ascii=False, indent=1)
print(f"total {t_end:.2f}s", {k: round(v[0] / FPS, 2) for k, v in scenes.items()})
