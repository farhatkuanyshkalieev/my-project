#!/usr/bin/env python3
"""
Text overlays via Pillow -> transparent PNG (this ffmpeg has no libass/drawtext,
so captions/watermark are rendered as images and composited with `overlay`).

Fonts: Liberation Sans (metric-compatible with Arial) first, DejaVu Sans as the
fallback; both cover Latin + full Cyrillic incl. Kazakh (Ә Ғ Қ Ң Ө Ұ Ү Һ І).
A font is only used for a text if it actually has a glyph for every character
(no tofu boxes); CJK text falls through to a CJK font. macOS Arial stays as a
last resort so the skill still renders on a Mac without Liberation installed.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

_DIRS = ("/usr/share/fonts/truetype/{d}/",       # Debian / Ubuntu
         "/usr/share/fonts/{d}/",                # Fedora (liberation-sans, dejavu-sans-fonts)
         "/usr/share/fonts/TTF/")                # Arch
_LIB = ("liberation", "liberation-sans", "liberation-sans-fonts")
_DJV = ("dejavu", "dejavu-sans-fonts")


def _cands(names, dirs):
    return [base.format(d=d) + n for n in names for d in dirs for base in _DIRS]


FONT_BOLD = (_cands(["LiberationSans-Bold.ttf"], _LIB)
             + _cands(["DejaVuSans-Bold.ttf"], _DJV)
             + ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/Library/Fonts/Arial Bold.ttf"])
FONT_REG = (_cands(["LiberationSans-Regular.ttf"], _LIB)
            + _cands(["DejaVuSans.ttf"], _DJV)
            + ["/System/Library/Fonts/Supplemental/Arial.ttf",
               "/Library/Fonts/Arial.ttf"])
# only reached when the text has glyphs the Latin/Cyrillic fonts lack (e.g. Chinese)
FONT_CJK = ["/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Bold.ttc",
            "/System/Library/Fonts/PingFang.ttc"]

CAPTION_STYLES = ("white", "paper")

# Caption sizing (fractions of min(W, H) -> px at 1080p). Documentary-style: big,
# bold, max 3 balanced lines; long narration shrinks toward the floor, not below.
CAPTION_SIZE = 0.060        # 65 px at 1080p
CAPTION_MIN_SIZE = 0.048    # 52 px floor
CAPTION_MAX_LINES = 3
WATERMARK_SIZE = 0.026      # 28 px at 1080p

_PROBE = 48
_cover_cache = {}


def _covers(path, text):
    """True if the font at `path` has a real glyph (not .notdef) for every char."""
    chars = {c for c in text if not c.isspace()}
    try:
        ent = _cover_cache.get(path)
        if ent is None:
            f = ImageFont.truetype(path, _PROBE)
            nd = f.getmask(chr(0xF0000))                  # private-use: never present
            ent = _cover_cache[path] = (f, (nd.size, bytes(nd)), {})
        f, notdef, seen = ent
        for c in chars:
            if c not in seen:
                m = f.getmask(c)
                seen[c] = (m.size, bytes(m)) != notdef
            if not seen[c]:
                return False
        return True
    except OSError:
        return False


def _font(paths, size, text=None):
    """First existing font in `paths` (+ CJK fallbacks) that can draw all of `text`."""
    chain = list(paths) + [p for p in FONT_CJK if p not in paths]
    existing = [p for p in chain if os.path.exists(p)]
    for p in existing:
        if text is None or _covers(p, text):
            return ImageFont.truetype(p, size)
    if existing:                       # nothing covers everything: best effort
        return ImageFont.truetype(existing[0], size)
    try:
        return ImageFont.load_default(size=size)       # Pillow >= 10.1: scalable
    except TypeError:
        return ImageFont.load_default()


def _wrap(draw, text, fnt, max_w):
    """Greedy word wrap; a token wider than max_w (e.g. unspaced CJK) breaks by char."""
    lines, cur = [], ""
    for w in text.split():
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
            continue
        if cur:
            lines.append(cur)
        cur = ""
        if draw.textlength(w, font=fnt) <= max_w:
            cur = w
            continue
        for ch in w:
            if draw.textlength(cur + ch, font=fnt) > max_w and cur:
                lines.append(cur)
                cur = ""
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def _wrap_balanced(draw, text, fnt, max_w):
    """Same line count as a greedy wrap, but lines of even length (no one-word
    orphan on the last line) -- the way broadcast/documentary subtitles break."""
    lines = _wrap(draw, text, fnt, max_w)
    if len(lines) < 2:
        return lines
    lo, hi, best = max_w * 0.4, max_w, lines
    for _ in range(14):
        mid = (lo + hi) / 2
        trial = _wrap(draw, text, fnt, mid)
        if len(trial) <= len(lines):
            best, hi = trial, mid
        else:
            lo = mid
    return best


def accent_color(image_path, default=(214, 64, 42)):
    """Sample a vibrant color from a keyframe so the caption keyline travels with
    each film's palette (Mexican -> pink/teal, Tang -> vermilion...). Fallback default.
    Only the `paper` caption style uses this."""
    try:
        im = Image.open(image_path).convert("RGB").resize((80, 80)).quantize(colors=24).convert("RGB")
    except Exception:
        return default
    best, best_score = None, -1.0
    for count, (r, g, b) in (im.getcolors(80 * 80) or []):
        mx, mn = max(r, g, b), min(r, g, b)
        if mx == 0:
            continue
        sat, val = (mx - mn) / mx, mx / 255.0
        if sat < 0.45 or val < 0.35 or val > 0.92:   # skip washed-out / too dark / too light
            continue
        score = sat * val * (count ** 0.3)
        if score > best_score:
            best, best_score = (r, g, b), score
    return best or default


def render_caption(text, out_path, W=1920, H=1080, margin_v=None, accent=None, style="white"):
    """Bottom-centered caption. `style` picks the look (default 'white'):
      white – plain white letters + dark edge + soft shadow, NO band. The clean,
              legible subtitle look from the original Tang film. Never gaudy.
      paper – cream cut-out paper letters + ink edge + soft shadow + optional per-beat
              colored keyline (the collage-styled look; `accent` is used ONLY here).
    Sized for legibility on a 1080p film (65 px, shrinking to >= 52 px so long
    narration stays within 3 balanced lines), anchored in the lower title-safe area
    so it reads clearly without covering the collage's centre."""
    if style not in CAPTION_STYLES:
        style = "white"
    text = " ".join(str(text).split())
    portrait = H > W
    if margin_v is None:               # portrait clears social-app UI at the bottom
        margin_v = int(H * (0.13 if portrait else 0.085))
    max_w = int(W * (0.86 if portrait else 0.78))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(img)
    base = min(W, H)
    size = round(base * CAPTION_SIZE)
    floor = round(base * CAPTION_MIN_SIZE)
    while True:
        fnt = _font(FONT_BOLD, size, text)
        lines = _wrap_balanced(d0, text, fnt, max_w)
        if len(lines) <= CAPTION_MAX_LINES:
            break
        if size <= floor:              # last resort before a 4th line: use more width
            wide = _wrap_balanced(d0, text, fnt, int(W * 0.88))
            if len(wide) < len(lines):
                lines = wide
            break
        size = max(floor, size - 2)
    ascent, descent = fnt.getmetrics()
    ow = max(3, round(size * 0.13 if style == "paper" else size * 0.08))   # outline
    if style == "paper" and accent:                          # + colored keyline
        ow += max(4, round(size * 0.14))
    lh = round(size * 1.24)                                  # baseline-to-baseline
    last_baseline = H - margin_v - descent - ow
    first_baseline = last_baseline - lh * (len(lines) - 1)
    # (x, y, text, width) per line; y = top of the ascender (Pillow's default anchor)
    pos = []
    for i, ln in enumerate(lines):
        w = d0.textlength(ln, font=fnt)
        pos.append((round((W - w) / 2), first_baseline + i * lh - ascent, ln, w))

    if style == "paper":
        _draw_paper(img, pos, fnt, size, accent)
    else:
        _draw_white(img, pos, fnt, size)
    img.save(out_path)
    return out_path


def _draw_white(img, pos, fnt, size):
    """Clean white subtitle: white fill, dark keyline for legibility, soft shadow."""
    ow = max(3, round(size * 0.08))
    dx, dy = max(2, round(size * 0.035)), max(3, round(size * 0.05))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for x, y, t, _ in pos:
        sd.text((x + dx, y + dy), t, font=fnt, fill=(0, 0, 0, 185),
                stroke_width=ow, stroke_fill=(0, 0, 0, 185))
    blended = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(max(4, size * 0.07))))
    img.paste(blended, (0, 0))
    d = ImageDraw.Draw(img)
    for x, y, t, _ in pos:
        d.text((x, y), t, font=fnt, fill=(255, 255, 255, 255),
               stroke_width=ow, stroke_fill=(26, 20, 16, 235))


def _draw_paper(img, pos, fnt, size, accent):
    """Cream cut-out paper letters + ink edge + soft shadow + optional colored keyline."""
    W, H = img.size
    ow = max(3, round(size * 0.13))                       # ink edge
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))          # soft shadow halo
    sd = ImageDraw.Draw(sh)
    dx, dy = max(3, round(size * 0.045)), max(4, round(size * 0.06))
    for x, y, t, _ in pos:
        sd.text((x + dx, y + dy), t, font=fnt, fill=(8, 6, 3, 190),
                stroke_width=ow, stroke_fill=(8, 6, 3, 190))
    blended = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(max(5, size * 0.08))))
    img.paste(blended, (0, 0))
    d = ImageDraw.Draw(img)
    if accent:                                            # per-beat colored keyline
        a = tuple(accent[:3]) + (255,)
        kw = max(4, round(size * 0.14))
        for x, y, t, _ in pos:
            d.text((x, y), t, font=fnt, fill=a, stroke_width=ow + kw, stroke_fill=a)
    for x, y, t, _ in pos:                                # cream cut-out letters + ink edge
        d.text((x, y), t, font=fnt, fill=(252, 246, 232, 255),
               stroke_width=ow, stroke_fill=(32, 22, 18, 255))


def render_title(text, out_path, W=1080, H=1920, sub=None):
    """Big centered title (dark on transparent) for the ending assembly card."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    size = int(min(W, H) * 0.075)
    fnt = _font(FONT_BOLD, size, text)
    lines = _wrap(d, text, fnt, int(W * 0.86))
    lh = int(size * 1.2)
    y = int(H * 0.1)
    for ln in lines:
        w = d.textlength(ln, font=fnt)
        d.text(((W - w) / 2, y), ln, font=fnt, fill=(40, 30, 24, 255),
               stroke_width=2, stroke_fill=(255, 255, 255, 180))
        y += lh
    if sub:
        sf = _font(FONT_REG, int(size * 0.4), sub)
        sw = d.textlength(sub, font=sf)
        d.text(((W - sw) / 2, y + 6), sub, font=sf, fill=(150, 40, 30, 255))
    img.save(out_path)
    return out_path


def render_watermark(text, out_path, W=1920, H=1080):
    # cream text + ink edge (no black box), consistent across caption styles.
    # Bottom-right, inside the title-safe margin; 28 px bold at 1080p so it stays
    # readable after video compression yet much smaller than the captions.
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    size = round(min(W, H) * WATERMARK_SIZE)
    fnt = _font(FONT_BOLD, size, text)
    m = round(min(W, H) * 0.03)                       # 32 px at 1080p
    ow = max(2, round(size * 0.12))
    _, descent = fnt.getmetrics()
    d.text((W - m - ow, H - m - descent - ow), text, font=fnt, anchor="rs",
           fill=(250, 244, 232, 235), stroke_width=ow, stroke_fill=(18, 12, 8, 215))
    img.save(out_path)
    return out_path
