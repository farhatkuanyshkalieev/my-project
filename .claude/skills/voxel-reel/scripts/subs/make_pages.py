"""timing.json -> public/pages.json for the Remotion captions (<= 4 words per page, break on pauses > 0.35 s and punctuation,
pages never overlap).  python make_pages.py <project>/audio/timing.json <subs>/public/pages.json [ai_prefix=C]"""
import json, sys
T = json.load(open(sys.argv[1], encoding="utf-8")); out = []; ai_prefix = sys.argv[3] if len(sys.argv) > 3 else "C"
for lid, st in T["placed"]:
    who = "cl" if lid.startswith(ai_prefix) else "me"
    words = [dict(text=w, start=round(a, 3), end=round(b, 3)) for w, a, b in T["words"][lid]]
    pages = []; cur = []
    for w in words:
        if cur and (w["start"] - cur[-1]["end"] > 0.35 or len(cur) >= 4 or cur[-1]["text"].rstrip().endswith((".", ",", "?!", "…", "?"))): pages.append(cur); cur = []
        cur.append(w)
    if cur: pages.append(cur)
    m = []
    for p in pages:
        if m and len(p) == 1 and len(m[-1]) < 4 and not m[-1][-1]["text"].endswith((".", "?!", "…", "?")): m[-1] += p
        else: m.append(p)
    for p in m: out.append(dict(who=who, line=lid, start=p[0]["start"], end=p[-1]["end"] + 0.25, words=p))
out.sort(key=lambda p: p["start"])
for a, b in zip(out, out[1:]): a["end"] = min(a["end"], b["start"] - 0.03)
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1); print(len(out), "pages")
