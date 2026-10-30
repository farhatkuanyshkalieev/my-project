"""Core helpers: easing, keyframe tracks, procedural noise, colours, skia drawing primitives."""
import math
import os
import functools

import numpy as np
import skia

W, H, FPS = 1080, 1920, 60

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONT_DIR = os.path.join(ROOT, "references", "fonts")


# ----------------------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_in_out(t):
    t = clamp(t)
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = clamp(t)
    return t * t * t


def ease_out_back(t, s=1.70158):
    t = clamp(t)
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2


def ease_out_elastic(t):
    t = clamp(t)
    if t in (0.0, 1.0):
        return t
    return 2 ** (-10 * t) * math.sin((t * 10 - 0.75) * (2 * math.pi / 3)) + 1


EASES = {
    "lin": lambda t: clamp(t),
    "io": ease_in_out,
    "s": smooth,
    "out": ease_out,
    "in": ease_in,
    "back": ease_out_back,
    "elastic": ease_out_elastic,
    "step": lambda t: 1.0 if t >= 1 else 0.0,
}


def ramp(t, t0, t1, ease="io"):
    """0 before t0, 1 after t1, eased between."""
    if t1 <= t0:
        return 1.0 if t >= t1 else 0.0
    return EASES[ease]((t - t0) / (t1 - t0))


class Track:
    """Keyframe track. keys: list of (time, value[, ease-into-this-key]). Values may be floats or tuples."""

    def __init__(self, *keys):
        self.keys = sorted([k if len(k) == 3 else (k[0], k[1], "io") for k in keys], key=lambda k: k[0])

    def __call__(self, t):
        ks = self.keys
        if t <= ks[0][0]:
            return ks[0][1]
        for i in range(1, len(ks)):
            if t <= ks[i][0]:
                t0, v0, _ = ks[i - 1]
                t1, v1, e = ks[i]
                u = EASES[e]((t - t0) / (t1 - t0)) if t1 > t0 else 1.0
                if isinstance(v0, tuple):
                    return tuple(lerp(a, b, u) for a, b in zip(v0, v1))
                return lerp(v0, v1, u)
        return ks[-1][1]


# ----------------------------------------------------------------------------- noise
def _hash(n):
    n = (n << 13) ^ n
    return 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7FFFFFFF) / 1073741824.0


def vnoise(x, seed=0):
    """Smooth 1D value noise in [-1, 1]."""
    i = math.floor(x)
    f = x - i
    a = _hash(int(i) + seed * 1013)
    b = _hash(int(i) + 1 + seed * 1013)
    return lerp(a, b, f * f * (3 - 2 * f))


def fbm(x, seed=0, octaves=3):
    v, amp, tot = 0.0, 1.0, 0.0
    for o in range(octaves):
        v += vnoise(x * (2 ** o), seed + o * 7) * amp
        tot += amp
        amp *= 0.5
    return v / tot


def blink_curve(t, seed=0, period=3.6, dur=0.16, extra=()):
    """Natural blinking: returns 0..1 lid closure. Pseudo-random interval per seed plus forced blinks."""
    best = 0.0
    k = math.floor(t / period)
    for j in (k - 1, k, k + 1):
        start = j * period + (0.5 + 0.45 * _hash(j * 31 + seed * 977)) * period * 0.8
        u = (t - start) / dur
        if 0 <= u <= 1:
            best = max(best, math.sin(u * math.pi) ** 0.7)
    for s in extra:
        u = (t - s) / dur
        if 0 <= u <= 1:
            best = max(best, math.sin(u * math.pi) ** 0.7)
    return best


# ----------------------------------------------------------------------------- colour
def hexc(h, a=1.0):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return skia.ColorSetARGB(int(clamp(a) * 255), r, g, b)


def rgb_of(c):
    return skia.ColorGetR(c), skia.ColorGetG(c), skia.ColorGetB(c), skia.ColorGetA(c)


def mix(c1, c2, t):
    r1, g1, b1, a1 = rgb_of(c1)
    r2, g2, b2, a2 = rgb_of(c2)
    t = clamp(t)
    return skia.ColorSetARGB(int(lerp(a1, a2, t)), int(lerp(r1, r2, t)), int(lerp(g1, g2, t)), int(lerp(b1, b2, t)))


def with_alpha(c, a):
    r, g, b, _ = rgb_of(c)
    return skia.ColorSetARGB(int(clamp(a) * 255), r, g, b)


def shade(c, k):
    """k<1 darker, k>1 lighter (towards white)."""
    r, g, b, a = rgb_of(c)
    if k <= 1:
        return skia.ColorSetARGB(a, int(r * k), int(g * k), int(b * k))
    t = k - 1
    return skia.ColorSetARGB(a, int(lerp(r, 255, t)), int(lerp(g, 255, t)), int(lerp(b, 255, t)))


# ----------------------------------------------------------------------------- paints
def fill(color, blur=0.0, shader=None, blend=None, alpha=None):
    # NB: paint alpha modulates the shader, so a shader paint must be opaque
    p = skia.Paint(AntiAlias=True, Color=0xFFFFFFFF if (shader is not None and skia.ColorGetA(color) == 0) else color)
    if shader is not None:
        p.setShader(shader)
    if blur > 0:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    if blend is not None:
        p.setBlendMode(blend)
    if alpha is not None:
        p.setAlphaf(alpha)
    return p


def stroke(color, width, cap="round", blur=0.0, shader=None, blend=None):
    if shader is not None and skia.ColorGetA(color) == 0:
        color = 0xFFFFFFFF
    p = skia.Paint(AntiAlias=True, Color=color, Style=skia.Paint.kStroke_Style, StrokeWidth=width)
    p.setStrokeCap({"round": skia.Paint.kRound_Cap, "butt": skia.Paint.kButt_Cap, "square": skia.Paint.kSquare_Cap}[cap])
    p.setStrokeJoin(skia.Paint.kRound_Join)
    if shader is not None:
        p.setShader(shader)
    if blur > 0:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    if blend is not None:
        p.setBlendMode(blend)
    return p


def radial(cx, cy, r, colors, pos=None):
    return skia.GradientShader.MakeRadial(skia.Point(cx, cy), max(r, 0.01), colors, pos)


def linear(x0, y0, x1, y1, colors, pos=None):
    return skia.GradientShader.MakeLinear([skia.Point(x0, y0), skia.Point(x1, y1)], colors, pos)


def glow(canvas, x, y, r, color, a=1.0):
    """Soft light pool (additive-ish)."""
    canvas.drawCircle(x, y, r, fill(0, shader=radial(x, y, r, [with_alpha(color, a), with_alpha(color, 0)]),
                                    blend=skia.BlendMode.kPlus))


def rrect(x, y, w, h, r):
    return skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x, y, w, h), r, r)


def path_poly(pts, close=True):
    p = skia.Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    return p


# ----------------------------------------------------------------------------- text
@functools.lru_cache(maxsize=64)
def typeface(name, weight=None):
    path = {
        "russo": os.path.join(FONT_DIR, "RussoOne-Regular.ttf"),
        "rubik": os.path.join(FONT_DIR, "Rubik-VF.ttf"),
        "oswald": os.path.join(FONT_DIR, "Oswald-VF.ttf"),
        "inter": "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
        "inter-semibold": "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
        "inter-bold": "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
        "inter-black": "/usr/share/fonts/opentype/inter/Inter-Black.otf",
        "inter-xbold": "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf",
    }[name]
    tf = skia.Typeface.MakeFromFile(path)
    if weight is not None:
        # variable font axis 'wght'
        tag = (ord('w') << 24) | (ord('g') << 16) | (ord('h') << 8) | ord('t')
        args = skia.FontArguments()
        coords = skia.FontArguments.VariationPosition.Coordinates([skia.FontArguments.VariationPosition.Coordinate(tag, weight)])
        args.setVariationDesignPosition(skia.FontArguments.VariationPosition(coords))
        tf = tf.makeClone(args)
    return tf


def font(name, size, weight=None):
    f = skia.Font(typeface(name, weight), size)
    f.setEdging(skia.Font.Edging.kAntiAlias)
    f.setSubpixel(True)
    return f


def text_width(s, f):
    return f.measureText(s)


def draw_text(canvas, s, x, y, f, color, align="left", shadow=None, outline=None):
    w = f.measureText(s)
    if align == "center":
        x -= w / 2
    elif align == "right":
        x -= w
    if shadow:
        blur, dy, col = shadow
        canvas.drawString(s, x, y + dy, f, fill(col, blur=blur))
    if outline:
        ow, ocol = outline
        canvas.drawString(s, x, y, f, stroke(ocol, ow))
    canvas.drawString(s, x, y, f, fill(color))
    return w


def wrap_words(s, f, maxw):
    words, lines, cur = s.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if f.measureText(t) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


# ----------------------------------------------------------------------------- surfaces
def new_surface(w=W, h=H):
    info = skia.ImageInfo.Make(w, h, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType)
    return skia.Surface.MakeRaster(info)


def surface_rgba(surface):
    img = surface.makeImageSnapshot()
    return np.asarray(img.toarray(colorType=skia.kRGBA_8888_ColorType, alphaType=skia.kUnpremul_AlphaType))


def save_png(surface, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    surface.makeImageSnapshot().save(path, skia.kPNG)
