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
TAIL = 1.8  # seconds held on the end card after the last word


def norm(w):
    return re.sub(r"[^а-яёa-z0-9]", "", w.lower())


words = json.load(open(sys.argv[1]))
for w in words:
    w["s"] += VO_OFFSET
    w["e"] += VO_OFFSET


def find(token, after=0.0):
    """Start time (s) of the first word starting with `token` after `after`."""
    for w in words:
        if w["s"] >= after and norm(w["w"]).startswith(token):
            return w["s"]
    raise SystemExit(f"anchor word not found: {token!r} after {after}")


f = lambda sec: int(round(sec * FPS))

t_impl = find("имплант")
t_vin = find("винир", t_impl)
t_brek = find("брекет", t_vin)
t_lech = find("лечен", t_brek)
t_all = find("всё", t_lech) if any(norm(w["w"]) == "всё" for w in words) else find("все", t_lech)
t_doc = find("врач", t_all)
t_more = find("более", t_doc)
t_exp = find("стаж", t_more)
t_promo = find("честь", t_exp) - 0.25  # "А в честь…" — start on the "А"
t_addr = find("проспект", t_promo)
t_cta = find("записыв", t_addr)
t_end = words[-1]["e"] + TAIL

# Cuts land a few frames before the anchor word so the picture leads the voice.
LEAD = 0.12
scenes = {
    "intro": [0, f(t_impl - LEAD)],
    "services": [f(t_impl - LEAD), f(t_doc - LEAD)],
    "doctors": [f(t_doc - LEAD), f(t_more - LEAD)],
    "patients": [f(t_more - LEAD), f(t_exp - LEAD)],
    "experience": [f(t_exp - LEAD), f(t_promo - LEAD)],
    "promo": [f(t_promo - LEAD), f(t_addr - LEAD)],
    "cta": [f(t_addr - LEAD), f(t_end)],
}
marks = {
    "implants": f(t_impl),
    "veneers": f(t_vin),
    "braces": f(t_brek),
    "treatment": f(t_lech),
    "all": f(t_all),
    "signup": f(t_cta),
    "dentline": f(find("dent")),
}

sfx = []
add = lambda t, name, gain=1.0: sfx.append({"t": int(t), "name": name, "gain": gain})

# Intro: rise into the tooth drop, impact on the title, shine on the logo.
add(0, "riser", 0.55)
add(f(0.45), "impact", 0.9)
add(f(VO_OFFSET + 0.9), "swoosh", 0.6)
add(f(find("dent") - 0.05), "shine", 0.7)
# Scene changes get a whoosh that peaks on the cut.
for name in ("services", "doctors", "patients", "experience", "promo", "cta"):
    add(scenes[name][0], "whoosh", 0.8)
# Service labels pop in word by word.
for k in ("implants", "veneers", "braces", "treatment"):
    add(marks[k], "pop", 0.75)
add(marks["all"], "ding", 0.55)
# Counter ticks while the number climbs, then a hit when it lands.
for i in range(0, 24, 2):
    add(scenes["patients"][0] + 4 + i, "tick", 0.35)
add(scenes["patients"][0] + 30, "impact", 0.55)
add(scenes["experience"][0] + 8, "pop", 0.6)
# Promo ticket prints out of the slot.
add(scenes["promo"][0] + 2, "print", 0.7)
add(scenes["promo"][0] + 18, "cash", 0.75)
# CTA: pin drops, button presses.
add(scenes["cta"][0] + 10, "drop", 0.7)
add(marks["signup"], "click", 0.8)
add(marks["signup"] + 4, "shine", 0.6)

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
