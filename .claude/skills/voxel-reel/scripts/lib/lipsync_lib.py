"""Reel #1 lip-sync: script words with frame times -> viseme segments (shared by my photo face and Claude's pixel mouth)."""
import json, re, wave, numpy as np
FPS = 30
VOW = set("аеёиоуыэюя")
CLS = {**{c: "A" for c in "ая"}, **{c: "O" for c in "оуюё"}, **{c: "E" for c in "еэиы"},
       **{c: "MBP" for c in "мбп"}, **{c: "FV" for c in "фв"}}
LAT = {"claude": "клод", "code": "код", "blender": "блендер"}

def letters(word):
    w = word.lower().replace("ё", "ё")
    w = re.sub(r"[^a-zа-яё]", "", w)
    w = LAT.get(w, w)
    return [c for c in w if c not in "ьъ"]

class Env:
    """RMS envelope of the voice timeline, 10 ms hop."""
    def __init__(self, path):
        with wave.open(path) as f:
            sr = f.getframerate(); n = f.getnframes(); ch = f.getnchannels(); sw = f.getsampwidth()
            raw = f.readframes(n)
        dt = {2: np.int16, 4: np.int32}[sw]
        a = np.frombuffer(raw, dt).astype(np.float32) / np.iinfo(dt).max
        if ch > 1: a = a.reshape(-1, ch).mean(1)
        hop = sr // 100; k = len(a) // hop
        self.rms = np.sqrt((a[:k * hop].reshape(k, hop) ** 2).mean(1) + 1e-12)
        self.ref = np.percentile(self.rms[self.rms > 0.01], 75) if (self.rms > 0.01).any() else 0.1
    def level(self, t0, t1):
        i0 = max(0, int(t0 * 100)); i1 = max(i0 + 1, int(t1 * 100))
        return float(self.rms[i0:i1].max()) / self.ref

    def nuclei(self, a, b, n):
        """Syllable nuclei = the n strongest local loudness peaks in [a, b] (>= 60 ms apart), or None."""
        i0 = max(0, int(a * 100)); i1 = int(b * 100) + 1
        x = np.convolve(self.rms, np.ones(3) / 3, "same")[i0:i1]
        if len(x) < 3: return None
        pk = [i for i in range(1, len(x) - 1) if x[i] >= x[i - 1] and x[i] > x[i + 1] and x[i] > 0.25 * x.max()]
        pk.sort(key=lambda i: -x[i]); sel = []
        for i in pk:
            if all(abs(i - j) >= 6 for j in sel): sel.append(i)
        if len(sel) < n: return None
        return sorted((i0 + i) / 100 + 0.005 for i in sel[:n])

def segments(words, env):
    """words: [(word, t0, t1)] absolute seconds. Returns phone list [(cls, t0, t1, level)] and word levels.
    Vowel centres sit on the loudness peaks of the word (syllable nuclei); consonants fill the gaps between them."""
    out = []; wl = []
    for w, a, b in words:
        L = letters(w)
        if not L: continue
        wt = [2.0 if c in VOW else (0.5 if c == "й" else 1.0) for c in L]
        tot = sum(wt); acc = 0; cen = []
        for x in wt: cen.append(a + (b - a) * (acc + x / 2) / tot); acc += x
        vi = [i for i, c in enumerate(L) if c in VOW]
        nu = env.nuclei(a, b, len(vi)) if vi else None
        if nu:
            for i, t in zip(vi, nu): cen[i] = t
            anchors = [(-1, a)] + list(zip(vi, nu)) + [(len(L), b)]
            for (i0, t0), (i1, t1) in zip(anchors, anchors[1:]):
                k = i1 - i0
                for j in range(i0 + 1, i1): cen[j] = t0 + (t1 - t0) * (j - i0) / k
        bnd = [a] + [(cen[i] + cen[i + 1]) / 2 for i in range(len(L) - 1)] + [b]
        for i, c in enumerate(L):
            t0, t1 = bnd[i], bnd[i + 1]
            out.append([CLS.get(c, "REST"), t0, t1, env.level(t0, t1)])
        wl.append((w, a, b, env.level(a, b)))
    return out, wl

def frames(phones, words, lead=1, min_len=2, gap_close=0.3):
    """Frame-quantised viseme track: list of (frame_start, cls, intensity). 'X' = closed/silent.
    Mouth leads the sound by `lead` frames; every shape holds >= `min_len` frames; pauses > gap_close s close the mouth."""
    PRI = {"REST": 1, "A": 2, "O": 2, "E": 2, "MBP": 3, "FV": 3}
    fr = {}
    # paint frames by priority: consonants first, then vowels, then lip closures; anything shorter than min_len
    # is widened to min_len around its centre so no vowel or closure can vanish
    for p in (1, 2, 3):
        for c, a, b, lv in phones:
            if PRI[c] != p: continue
            s, e = int(round(a * FPS)), int(round(b * FPS))
            if e - s < min_len:
                m = int(round((a + b) / 2 * FPS)); s, e = m - min_len // 2, m - min_len // 2 + min_len
            for f in range(s, e): fr[f] = (c, lv)
    # pauses longer than gap_close: mouth closed; shorter pauses inside a phrase keep the consonant shape
    for (w, a, b), nxt in zip(words, words[1:] + [None]):
        e = int(round(b * FPS))
        if nxt is None:
            fr[e] = ("X", 0.0); continue
        s2 = int(round(nxt[1] * FPS))
        for f in range(e, s2):
            if f not in fr: fr[f] = ("X", 0.0) if nxt[1] - b > gap_close else ("REST", 0.5)
    keys = sorted(fr)
    runs = []
    for f in range(keys[0], keys[-1] + 1):
        c, lv = fr.get(f, ("REST", 0.5))
        if runs and runs[-1][1] == c and f == runs[-1][3]:
            runs[-1][3] = f + 1; runs[-1][2] = max(runs[-1][2], lv)
        else:
            runs.append([f, c, lv, f + 1])
    # any run still shorter than min_len (overpainted edges) is merged into its longer neighbour
    changed = True
    while changed:
        changed = False
        for i, r in enumerate(runs):
            if r[3] - r[0] >= min_len or len(runs) == 1: continue
            j = i - 1 if i > 0 and (i + 1 >= len(runs) or PRI.get(runs[i - 1][1], 0) >= PRI.get(runs[i + 1][1], 0)) else i + 1
            if j < i: runs[j][3] = r[3]
            else: runs[j][0] = r[0]
            del runs[i]; changed = True; break
        k = []
        for r in runs:
            if k and k[-1][1] == r[1]: k[-1][3] = r[3]; k[-1][2] = max(k[-1][2], r[2])
            else: k.append(r)
        runs = k
    if runs[-1][1] != "X": runs.append([runs[-1][3], "X", 0.0, runs[-1][3] + min_len])
    return [(r[0] - lead, r[1], r[2]) for r in runs]

def stressed(words_lv, frac=0.3):
    """Loudest ~30 % of multi-syllable words: accents for head hops / Claude eye pulses."""
    cand = [w for w in words_lv if sum(1 for c in letters(w[0]) if c in VOW) >= 1]
    if not cand: return []
    thr = np.percentile([w[3] for w in cand], 100 * (1 - frac))
    return [w for w in cand if w[3] >= thr]

def stress_vowel_time(word, a, b):
    """Time of the (approximate) stressed vowel: the vowel nearest 45 % of the word."""
    L = letters(word); wt = [2.0 if c in VOW else 1.0 for c in L]; tot = sum(wt); t = a; best = None
    for c, x in zip(L, wt):
        d = (b - a) * x / tot
        if c in VOW:
            mid = t + d / 2
            if best is None or abs((mid - a) / (b - a) - 0.45) < abs((best - a) / (b - a) - 0.45): best = mid
        t += d
    return best if best is not None else (a + b) / 2
