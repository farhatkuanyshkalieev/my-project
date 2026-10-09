"""Анимация «Чемпионат мира 2026»: рисует кадры (Pillow) и отдаёт их в ffmpeg.

Использование:  python3 render.py out_silent.mp4 [--frame N] [--preview DIR]
Длительности сцен берутся из audio/durations.json (т.е. из озвучки).
"""
import json, math, os, random, re, subprocess, sys
from functools import lru_cache
from multiprocessing import Pool

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, S = 1280, 720, 30, 2          # S — суперсэмплинг (рисуем в 2x и уменьшаем)
LEAD, TAIL = 0.5, 0.8                     # пауза до и после голоса в каждой сцене
FADE = 0.35

NAVY = (9, 22, 46)
WHITE = (255, 255, 255)
GOLD = (255, 198, 40)
RED = (226, 52, 62)
GREEN = (36, 168, 92)
BLUE = (52, 104, 214)
GRAY = (150, 165, 190)
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

NARR = {
    "title": "Чемпионат мира по футболу две тысячи двадцать шестого года. Самый масштабный турнир в истории.",
    "hosts": "Впервые мундиаль принимали сразу три страны: Соединённые Штаты, Канада и Мексика.",
    "numbers": "Вместо тридцати двух команд на поле выходили сорок восемь. А матчей было не шестьдесят четыре, а сто четыре.",
    "cities": "Игры прошли на шестнадцати стадионах: одиннадцать в США, три в Мексике и два в Канаде.",
    "opening": "Первый матч состоялся одиннадцатого июня на легендарном стадионе Ацтека в Мехико. Мексика стала первой страной, принявшей чемпионат мира в третий раз.",
    "format": "Сорок восемь команд разделили на двенадцать групп по четыре. Дальше проходили по две лучшие из каждой группы и восемь лучших из команд, занявших третьи места. Так сложилась сетка плей-офф из тридцати двух сборных.",
    "final": "Финал состоялся девятнадцатого июля на стадионе Метлайф в штате Нью-Джерси. Борьба за золотой кубок длилась больше месяца.",
    "outro": "Праздник футбола, который объединил миллионы болельщиков по всему миру. Футбол — игра, которая принадлежит всем.",
}
# Экранные субтитры (нормальные числа, а не прописью)
CAPTION = {
    "title": "Чемпионат мира по футболу 2026 года. Самый масштабный турнир в истории.",
    "hosts": "Впервые мундиаль принимали сразу три страны: США, Канада и Мексика.",
    "numbers": "Вместо 32 команд на поле выходили 48. А матчей было не 64, а 104.",
    "cities": "Игры прошли на 16 стадионах: 11 в США, 3 в Мексике и 2 в Канаде.",
    "opening": "Первый матч состоялся 11 июня на легендарном стадионе Ацтека в Мехико. Мексика стала первой страной, принявшей чемпионат мира в третий раз.",
    "format": "48 команд разделили на 12 групп по четыре. Дальше проходили по две лучшие из каждой группы и 8 лучших из команд, занявших третьи места. Так сложилась сетка плей-офф из 32 сборных.",
    "final": "Финал состоялся 19 июля на стадионе «Метлайф» в штате Нью-Джерси. Борьба за золотой кубок длилась больше месяца.",
    "outro": "Праздник футбола, который объединил миллионы болельщиков по всему миру. Футбол — игра, которая принадлежит всем.",
}

_dur = json.load(open(os.path.join(HERE, "audio", "durations.json")))
ORDER = _dur["scenes"]
SCENE_T = {n: LEAD + _dur["durations"][n] + TAIL for n in ORDER}
STARTS, _acc = {}, 0.0
for _n in ORDER:
    STARTS[_n] = _acc
    _acc += SCENE_T[_n]
TOTAL = _acc
NFRAMES = int(math.ceil(TOTAL * FPS))


# ---------- утилиты ----------
def sc(v):
    return int(round(v * S))


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, a, b):
    return clamp((t - a) / (b - a)) if b > a else float(t >= a)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_io(x):
    return x * x * (3 - 2 * x)


def ease_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def lerp(a, b, x):
    return a + (b - a) * x


def mix(c1, c2, x):
    return tuple(int(lerp(a, b, x)) for a, b in zip(c1, c2))


@lru_cache(maxsize=None)
def font(size):
    return ImageFont.truetype(FONT_PATH, max(4, int(size * S)))


CUR = {"im": None}


def text(d, x, y, s, size, fill=WHITE, anchor="mm", stroke=0, stroke_fill=NAVY):
    """Текст с учётом прозрачности fill (Pillow игнорирует альфу текста на RGB-кадре, поэтому через маску)."""
    alpha = fill[3] if len(fill) == 4 else 255
    if alpha <= 0:
        return
    xy = (sc(x), sc(y))
    if alpha >= 255:
        d.text(xy, s, font=font(size), fill=fill[:3], anchor=anchor, stroke_width=sc(stroke), stroke_fill=stroke_fill)
        return
    f, sw = font(size), sc(stroke)
    l, t_, r, b = d.textbbox(xy, s, font=f, anchor=anchor, stroke_width=sw)
    pad = 4
    ox, oy = int(l) - pad, int(t_) - pad
    size_ = (int(r - l) + 2 * pad, int(b - t_) + 2 * pad)
    im = CUR["im"]
    k = alpha / 255
    if sw:
        m = Image.new("L", size_, 0)
        ImageDraw.Draw(m).text((xy[0] - ox, xy[1] - oy), s, font=f, fill=255, anchor=anchor, stroke_width=sw, stroke_fill=255)
        im.paste(stroke_fill[:3], (ox, oy), m.point(lambda v: int(v * k)))
    m = Image.new("L", size_, 0)
    ImageDraw.Draw(m).text((xy[0] - ox, xy[1] - oy), s, font=f, fill=255, anchor=anchor)
    im.paste(fill[:3], (ox, oy), m.point(lambda v: int(v * k)))


def text_w(s, size):
    return font(size).getlength(s) / S


def text_spaced(d, x, y, s, size, fill=WHITE, gap=6, stroke=0):
    total = sum(text_w(c, size) + gap for c in s) - gap
    cx = x - total / 2
    for c in s:
        w = text_w(c, size)
        text(d, cx + w / 2, y, c, size, fill, stroke=stroke)
        cx += w + gap


def rrect(d, box, r, fill, outline=None, width=0):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([sc(x0), sc(y0), sc(x1), sc(y1)], radius=sc(r), fill=fill,
                        outline=outline, width=sc(width))


def ell(d, cx, cy, rx, ry, fill=None, outline=None, width=0):
    d.ellipse([sc(cx - rx), sc(cy - ry), sc(cx + rx), sc(cy + ry)], fill=fill,
              outline=outline, width=sc(width))


def poly(d, pts, fill, outline=None):
    d.polygon([(sc(x), sc(y)) for x, y in pts], fill=fill, outline=outline)


def line(d, pts, fill, width):
    d.line([(sc(x), sc(y)) for x, y in pts], fill=fill, width=sc(width), joint="curve")


def with_alpha(c, a):
    return (c[0], c[1], c[2], int(255 * clamp(a)))


# ---------- фон: газон с разметкой под тёмной вуалью ----------
def make_bg():
    im = Image.new("RGB", (W * S, H * S), (30, 120, 60))
    d = ImageDraw.Draw(im, "RGBA")
    n = 16
    for i in range(n):
        c = (28, 112, 58) if i % 2 == 0 else (34, 128, 66)
        d.rectangle([i * W * S // n, 0, (i + 1) * W * S // n, H * S], fill=c)
    lc = (255, 255, 255, 70)
    d.rectangle([sc(60), sc(60), sc(W - 60), sc(H - 60)], outline=lc, width=sc(4))
    d.line([(sc(W / 2), sc(60)), (sc(W / 2), sc(H - 60))], fill=lc, width=sc(4))
    ell(d, W / 2, H / 2, 110, 110, outline=lc, width=4)
    for sx in (60, W - 60 - 200):
        d.rectangle([sc(sx), sc(H / 2 - 160), sc(sx + 200), sc(H / 2 + 160)], outline=lc, width=sc(4))
    d.rectangle([0, 0, W * S, H * S], fill=(*NAVY, 150))
    # виньетка
    vig = Image.new("L", (W * S, H * S), 0)
    vd = ImageDraw.Draw(vig)
    for k in range(40):
        a = int(150 * (1 - k / 40) ** 2)
        vd.rectangle([sc(k * 5), sc(k * 3), W * S - sc(k * 5), H * S - sc(k * 3)], outline=a, width=sc(5))
    black = Image.new("RGB", im.size, (0, 0, 0))
    return Image.composite(black, im, vig)


BG = make_bg()


# ---------- мяч ----------
@lru_cache(maxsize=2048)
def ball_img(r, ang_q):
    n = sc(2 * r)
    base = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    c, R = n / 2, n / 2 - sc(1)
    ink = (22, 24, 30, 255)
    bd = ImageDraw.Draw(base)
    bd.ellipse([c - R, c - R, c + R, c + R], fill=(246, 246, 246, 255))
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).ellipse([c - R, c - R, c + R, c + R], fill=255)
    patch = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patch)
    ang = math.radians(ang_q * 3)
    lw = max(2, int(R * 0.045))

    def pent(cx, cy, rad, rot):
        pts = [(cx + rad * math.cos(rot + k * 2 * math.pi / 5), cy + rad * math.sin(rot + k * 2 * math.pi / 5)) for k in range(5)]
        pd.polygon(pts, fill=ink)
        return pts

    rot0 = ang - math.pi / 2
    cp = pent(c, c, 0.30 * R, rot0)
    for k in range(5):
        a = rot0 + k * 2 * math.pi / 5            # направление на вершину центрального пятиугольника
        v = cp[k]
        e = (c + 0.62 * R * math.cos(a), c + 0.62 * R * math.sin(a))
        pd.line([v, e], fill=ink, width=lw)
        # боковые рёбра «шестиугольников»
        for sgn in (-1, 1):
            a2 = a + sgn * math.pi / 5 * 0.85
            pd.line([e, (c + 0.98 * R * math.cos(a2), c + 0.98 * R * math.sin(a2))], fill=ink, width=lw)
        # внешние пятиугольники между вершинами
        am = a + math.pi / 5
        pent(c + 1.02 * R * math.cos(am), c + 1.02 * R * math.sin(am), 0.30 * R, am + math.pi)
    patch.putalpha(ImageChops.multiply(patch.getchannel("A"), mask))
    base.alpha_composite(patch)
    shade = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    shd = ImageDraw.Draw(shade)
    for j in range(8):                                     # объём: затемнение к краю
        rr = R * (1 - 0.03 * j)
        shd.ellipse([c - rr, c - rr, c + rr, c + rr], outline=(10, 20, 50, 16), width=max(1, int(R * 0.05)))
    shade.putalpha(ImageChops.multiply(shade.getchannel("A"), mask))
    base.alpha_composite(shade)
    sd = ImageDraw.Draw(base)
    sd.ellipse([c - R, c - R, c + R, c + R], outline=(30, 34, 44, 255), width=max(2, int(R * 0.04)))
    hl = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse([c - R * 0.6, c - R * 0.75, c - R * 0.1, c - R * 0.3], fill=(255, 255, 255, 70))
    hl.putalpha(ImageChops.multiply(hl.getchannel("A"), mask))
    base.alpha_composite(hl)
    return base


def draw_ball(im, d, x, y, r, ang=0.0, shadow_y=None, alpha=1.0):
    if shadow_y is not None:
        hgt = clamp((shadow_y - y) / 300)
        rw = r * (1.1 - 0.4 * hgt)
        ell(d, x, shadow_y + r * 0.9, rw, rw * 0.28, fill=(0, 0, 0, int(110 * (1 - 0.6 * hgt) * alpha)))
    b = ball_img(int(r), int((ang / 3) % 120))
    if alpha < 1:
        b = b.copy()
        b.putalpha(b.getchannel("A").point(lambda v: int(v * alpha)))
    im.paste(b, (sc(x) - b.width // 2, sc(y) - b.height // 2), b)


# ---------- флаги ----------
LEAF = [(0, -1), (.18, -.65), (.36, -.75), (.30, -.35), (.62, -.50), (.55, -.25), (.85, -.05), (.60, .10), (.65, .30),
        (.18, .20), (.20, .62), (.04, .58), (.04, .95), (-.04, .95), (-.04, .58), (-.20, .62), (-.18, .20), (-.65, .30),
        (-.60, .10), (-.85, -.05), (-.55, -.25), (-.62, -.50), (-.30, -.35), (-.36, -.75), (-.18, -.65)]


@lru_cache(maxsize=None)
def flag_img(kind, w, h):
    im = Image.new("RGBA", (sc(w), sc(h)), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    if kind == "usa":
        sh = sc(h) / 13
        for i in range(13):
            d.rectangle([0, i * sh, sc(w), (i + 1) * sh + 1], fill=(190, 30, 50) if i % 2 == 0 else (255, 255, 255))
        d.rectangle([0, 0, sc(w) * 0.42, sh * 7], fill=(40, 60, 140))
        for r_ in range(5):
            for c_ in range(6):
                d.ellipse([sc(w) * (0.04 + c_ * 0.065) - 4, sh * (0.9 + r_ * 1.25) - 4, sc(w) * (0.04 + c_ * 0.065) + 4, sh * (0.9 + r_ * 1.25) + 4], fill=WHITE)
    elif kind == "can":
        d.rectangle([0, 0, sc(w) * 0.25, sc(h)], fill=(215, 30, 40))
        d.rectangle([sc(w) * 0.75, 0, sc(w), sc(h)], fill=(215, 30, 40))
        s_ = sc(h) * 0.36
        d.polygon([(sc(w) / 2 + x * s_, sc(h) * 0.47 + y * s_) for x, y in LEAF], fill=(215, 30, 40))
    else:  # mex
        cols = [(0, 104, 71), (255, 255, 255), (206, 17, 38)]
        for i, c_ in enumerate(cols):
            d.rectangle([sc(w) * i / 3, 0, sc(w) * (i + 1) / 3 + 1, sc(h)], fill=c_)
        cx, cy, rr = sc(w) / 2, sc(h) / 2, sc(h) * 0.17
        d.ellipse([cx - rr, cy - rr * 0.9, cx + rr, cy + rr * 0.9], fill=(150, 110, 50))
        d.arc([cx - rr * 1.25, cy - rr * 1.15, cx + rr * 1.25, cy + rr * 1.15], 20, 340, fill=(0, 104, 71), width=max(3, sc(3)))
        d.ellipse([cx - rr * 0.35, cy - rr * 0.35, cx + rr * 0.35, cy + rr * 0.35], fill=(100, 70, 30))
    d.rectangle([0, 0, im.width - 1, im.height - 1], outline=(255, 255, 255, 120), width=3)
    return im


def draw_flag(im, kind, cx, cy, w, h, t, alpha=1.0, amp=7):
    f = flag_img(kind, w, h)
    sw = 6
    pad = sc(amp) + 2
    out = Image.new("RGBA", (f.width, f.height + 2 * pad), (0, 0, 0, 0))
    for x0 in range(0, f.width, sw):
        dy = int(sc(amp) * math.sin(x0 / sc(w) * 7 + t * 4))
        strip = f.crop((x0, 0, min(x0 + sw, f.width), f.height))
        shade = int(-30 * math.cos(x0 / sc(w) * 7 + t * 4))
        if shade:
            strip = strip.copy()
            ov = Image.new("RGBA", strip.size, (0, 0, 0, 0) if shade > 0 else (255, 255, 255, 0))
            strip = Image.blend(strip, Image.new("RGBA", strip.size, (0, 0, 0, 255) if shade < 0 else (255, 255, 255, 255)), abs(shade) / 255) if False else strip
        out.paste(strip, (x0, pad + dy))
    if alpha < 1:
        out.putalpha(out.getchannel("A").point(lambda v: int(v * alpha)))
    im.paste(out, (sc(cx - w / 2), sc(cy - h / 2) - pad), out)


# ---------- кубок ----------
def draw_trophy(im, d, cx, base_y, h, t=0.0, glow=1.0):
    for k in range(6):
        rr = h * (0.75 - k * 0.09)
        ell(d, cx, base_y - h * 0.5, rr, rr, fill=(255, 200, 60, int(14 * glow)))
    for k in range(10):                                          # лучи
        a0 = t * 0.25 + k * math.pi / 5
        poly(d, [(cx, base_y - h * 0.55), (cx + math.cos(a0) * h * 1.4, base_y - h * 0.55 + math.sin(a0) * h * 1.4),
                 (cx + math.cos(a0 + 0.12) * h * 1.4, base_y - h * 0.55 + math.sin(a0 + 0.12) * h * 1.4)], (255, 215, 90, int(22 * glow)))
    g1, g2, g3 = (255, 205, 60), (214, 150, 20), (255, 236, 150)

    def P(pts, fill):
        poly(d, [(cx + x * h, base_y + y * h) for x, y in pts], fill)

    P([(-.17, 0), (.17, 0), (.14, -.06), (-.14, -.06)], g2)
    P([(-.14, -.06), (.14, -.06), (.12, -.15), (-.12, -.15)], (22, 130, 76))
    P([(-.12, -.15), (.12, -.15), (.14, -.20), (-.14, -.20)], g2)
    body = [(-.10, -.20), (-.07, -.36), (-.15, -.52), (-.20, -.66), (-.13, -.74), (.13, -.74), (.20, -.66), (.15, -.52), (.07, -.36), (.10, -.20)]
    P(body, g1)
    P([(0, -.20), (.10, -.20), (.07, -.36), (.15, -.52), (.20, -.66), (.13, -.74), (0, -.74)], g2)
    P([(-.07, -.28), (-.04, -.40), (-.12, -.55), (-.16, -.66), (-.12, -.68), (-.08, -.56), (-.02, -.42)], g3)
    ell(d, cx, base_y - h * 0.80, h * 0.155, h * 0.155, fill=g1)
    ell(d, cx + h * 0.03, base_y - h * 0.80, h * 0.125, h * 0.145, fill=g2)
    ell(d, cx - h * 0.05, base_y - h * 0.85, h * 0.07, h * 0.07, fill=(255, 245, 190, 220))
    for k in (-0.05, 0.05):
        d.arc([sc(cx - h * 0.155), sc(base_y - h * 0.80 - h * 0.155), sc(cx + h * 0.155), sc(base_y - h * 0.80 + h * 0.155)], 200 + k * 200, 340 - k * 200, fill=(140, 90, 10), width=sc(1.5))


# ---------- общие блоки сцен ----------
def panel(d, box, alpha=150, r=22):
    rrect(d, box, r, (6, 14, 32, alpha), outline=(255, 255, 255, 60), width=2)


def heading(d, s, t, y=62, size=42):
    a = prog(t, 0.15, 0.6)
    text(d, W / 2, y + (1 - ease_out(a)) * 20, s, size, with_alpha(WHITE, a), stroke=3)
    w = text_w(s, size) * ease_out(a)
    d.rectangle([sc(W / 2 - w / 2), sc(y + size * 0.68), sc(W / 2 + w / 2), sc(y + size * 0.68 + 4)], fill=(*GOLD, int(255 * a)))


def caption(d, name, tl):
    sents = re.findall(r"[^.]+\.?", CAPTION[name])
    sents = [s.strip() for s in sents if s.strip()]
    dur = SCENE_T[name] - LEAD - TAIL
    tot = sum(len(s) for s in sents)
    acc = LEAD
    for s in sents:
        L = dur * len(s) / tot
        a0, a1 = acc, acc + L
        acc = a1
        if a0 - 0.05 <= tl <= a1 + 0.12:
            al = min(prog(tl, a0 - 0.05, a0 + 0.2), 1 - prog(tl, a1 - 0.02, a1 + 0.12))
            words, lines, cur = s.split(), [], ""
            for w_ in words:
                if text_w((cur + " " + w_).strip(), 27) > 1040 and cur:
                    lines.append(cur)
                    cur = w_
                else:
                    cur = (cur + " " + w_).strip()
            lines.append(cur)
            hh = 18 + 36 * len(lines)
            bw = max(text_w(l, 27) for l in lines) + 50
            y1 = H - 26
            rrect(d, (W / 2 - bw / 2, y1 - hh, W / 2 + bw / 2, y1), 16, (4, 10, 24, int(185 * al)))
            for i, l in enumerate(lines):
                text(d, W / 2, y1 - hh + 27 + i * 36, l, 27, with_alpha(WHITE, al))


# ---------- сцены ----------
def scene_title(im, d, t, T):
    # вращающиеся лучи
    for k in range(14):
        a0 = t * 0.18 + k * 2 * math.pi / 14
        poly(d, [(W / 2, 330), (W / 2 + math.cos(a0) * 900, 330 + math.sin(a0) * 900), (W / 2 + math.cos(a0 + 0.13) * 900, 330 + math.sin(a0 + 0.13) * 900)], (255, 210, 80, 22))
    ground = 585
    segs = [(0.0, 0.62, -120, ground, 0), (0.62, 1.12, ground, ground, 210), (1.12, 1.47, ground, ground, 85), (1.47, 1.72, ground, ground, 30)]
    by, bx = ground, W / 2
    for a, b, y0, y1, pk in segs:
        if a <= t < b:
            u = (t - a) / (b - a)
            by = lerp(y0, y1, u * u) if pk == 0 else ground - pk * 4 * u * (1 - u)
            break
    if t >= 1.72:
        by = ground
        bx = W / 2 + ease_io(prog(t, 1.72, T - 0.3)) * 380
    ang = t * 260 if t < 1.72 else 260 * 1.72 + (bx - W / 2) * 1.2
    draw_ball(im, d, bx, by, 42, ang, shadow_y=ground)

    s = "ЧЕМПИОНАТ МИРА"
    cx = W / 2 - (sum(text_w(c, 82) + 4 for c in s) - 4) / 2
    for i, c in enumerate(s):
        a = prog(t, 0.7 + i * 0.045, 1.0 + i * 0.045)
        w = text_w(c, 82)
        if c != " ":
            text(d, cx + w / 2, 160 + (1 - ease_back(a)) * -60, c, 82, with_alpha(WHITE, a), stroke=5)
        cx += w + 4
    k = ease_back(prog(t, 1.5, 2.1))
    sz = 215 * max(k, 0.01)
    text(d, W / 2, 335, "2026", sz, GOLD, stroke=8 * max(k, 0), stroke_fill=(120, 70, 0))
    a = prog(t, 2.5, 3.1)
    text_spaced(d, W / 2, 468, "FIFA WORLD CUP", 34, with_alpha((235, 242, 255), a), gap=8)
    rrect(d, (W / 2 - 250, 500, W / 2 + 250, 502), 1, (255, 255, 255, int(120 * a)))
    text(d, W / 2, 530, "США  ·  КАНАДА  ·  МЕКСИКА", 28, with_alpha(GOLD, a))


def scene_hosts(im, d, t, T):
    heading(d, "ТРИ СТРАНЫ — ОДИН ЧЕМПИОНАТ", t)
    items = [("usa", "США", "78 матчей", 0.34), ("can", "КАНАДА", "13 матчей", 0.50), ("mex", "МЕКСИКА", "13 матчей", 0.64)]
    xs = [225, 640, 1055]
    for (kind, name, cnt, u0), x in zip(items, xs):
        a = prog(t / T, u0 - 0.1, u0 + 0.04)
        if a <= 0:
            continue
        e = ease_back(a)
        y = 320 + (1 - e) * 260
        panel(d, (x - 175, y - 140, x + 175, y + 175), int(120 * a))
        draw_flag(im, kind, x, y - 20, 290, 190, t + x / 300, alpha=clamp(a * 1.5))
        text(d, x, y + 106, name, 38, with_alpha(WHITE, a), stroke=2)
        text(d, x, y + 148, cnt, 25, with_alpha(GOLD, a))
    # мяч ведёт по нижней дуге
    u = (t / T)
    bx = lerp(90, W - 90, ease_io(clamp(u * 1.05)))
    by = 585 + 18 * math.sin(t * 6)
    draw_ball(im, d, bx, by, 26, t * 380, shadow_y=605)


def scene_numbers(im, d, t, T):
    heading(d, "САМЫЙ БОЛЬШОЙ ЧЕМПИОНАТ В ИСТОРИИ", t, size=38)
    u = t / T
    # левая панель — команды
    panel(d, (50, 120, 620, 600), 140)
    text(d, 335, 165, "КОМАНДЫ", 34, GRAY)
    k = ease_io(prog(u, 0.42, 0.56))
    n = int(round(lerp(32, 48, k)))
    text(d, 335, 262, str(n), 118, GOLD if k > 0 else WHITE, stroke=4, stroke_fill=(70, 40, 0))
    text(d, 335, 333, "раньше — 32", 22, with_alpha(GRAY, 0.9))
    cols, rows = 8, 6
    for i in range(48):
        r_, c_ = divmod(i, cols)
        x, y = 140 + c_ * 52, 385 + r_ * 36
        if i < 32:
            a = prog(u, 0.08 + i * 0.004, 0.14 + i * 0.004)
            ell(d, x, y, 14 * ease_back(a), 14 * ease_back(a), fill=with_alpha((225, 235, 250), a))
        else:
            a = prog(u, 0.42 + (i - 32) * 0.007, 0.47 + (i - 32) * 0.007)
            e = ease_back(a)
            ell(d, x, y, 14 * e, 14 * e, fill=with_alpha(GOLD, a))
    # правая панель — матчи
    panel(d, (660, 120, 1230, 600), 140)
    text(d, 945, 165, "МАТЧИ", 34, GRAY)
    k2 = ease_io(prog(u, 0.66, 0.82))
    m = int(round(lerp(64, 104, k2)))
    text(d, 945, 262, str(m), 118, GOLD if k2 > 0 else WHITE, stroke=4, stroke_fill=(70, 40, 0))
    text(d, 945, 333, "раньше — 64", 22, with_alpha(GRAY, 0.9))
    bx0, bx1, by = 715, 1175, 440
    full = bx1 - bx0
    a0 = prog(u, 0.1, 0.25)
    rrect(d, (bx0, by, bx0 + full * 64 / 104 * ease_out(a0), by + 46), 12, with_alpha((225, 235, 250), a0))
    if k2 > 0:
        rrect(d, (bx0 + full * 64 / 104 - 6, by, bx0 + full * (64 + 40 * k2) / 104, by + 46), 12, GOLD)
    text(d, 945, 505, "+40 матчей", 30, with_alpha(GOLD, k2))
    text(d, 945, 552, "почти в полтора раза больше", 22, with_alpha(GRAY, k2))
    draw_ball(im, d, 640, 600 + 4 * math.sin(t * 5), 0, 0) if False else None


CITIES = [  # lon, lat, страна
    ("usa", -122.3, 47.6), ("usa", -122.0, 37.4), ("usa", -118.3, 34.0), ("usa", -97.0, 32.8), ("usa", -95.4, 29.7),
    ("usa", -94.6, 39.1), ("usa", -84.4, 33.7), ("usa", -80.2, 25.8), ("usa", -71.2, 42.1), ("usa", -75.2, 39.9), ("usa", -74.1, 40.8),
    ("mex", -99.1, 19.4), ("mex", -103.3, 20.7), ("mex", -100.3, 25.7),
    ("can", -123.1, 49.3), ("can", -79.4, 43.7),
]
OUTLINE = [(-128, 58), (-128, 52), (-125, 49), (-124, 43), (-122, 37), (-118, 34), (-117, 32.5), (-114.7, 31.7), (-112.5, 29), (-109.5, 25.5),
           (-105.5, 21.5), (-104, 19), (-101.5, 17.5), (-97, 16), (-94, 16.2), (-92, 14.8), (-91.5, 18), (-94, 18.2), (-96, 19), (-97.5, 22),
           (-97.3, 26), (-97.2, 27.8), (-94.5, 29.3), (-91, 29.2), (-89.2, 29), (-89.5, 30.2), (-86, 30.3), (-83.5, 29.7), (-82.7, 27.8),
           (-81.8, 26), (-80.5, 25.2), (-80, 26.8), (-81, 31.5), (-76, 35), (-75.5, 38), (-74, 40), (-72, 41), (-70, 41.7), (-70.5, 43.5),
           (-67, 44.8), (-66, 45.5), (-68, 48), (-70, 47.5), (-67, 50), (-64, 52), (-60, 55), (-66, 58)]
MX0, MY0, KX, KY = 56, 128, 9.4, 9.6


def proj(lon, lat):
    return MX0 + (lon + 128) * KX, MY0 + (58 - lat) * KY


BORDER_CAN = [(-123, 49), (-95, 49), (-89, 48), (-83, 46), (-82.5, 42.5), (-79, 43.2), (-75, 45), (-71.5, 45), (-67.8, 47), (-67, 45)]
BORDER_MEX = [(-117, 32.5), (-114.7, 32.5), (-111, 31.3), (-108.2, 31.3), (-106.5, 31.8), (-104.5, 29.5), (-102.5, 29.8), (-99.5, 27.5), (-97.2, 25.9)]
COUNTRY_COL = {"usa": BLUE, "mex": GREEN, "can": RED}


def scene_cities(im, d, t, T):
    heading(d, "16 ГОРОДОВ — 3 СТРАНЫ", t)
    panel(d, (40, 112, 690, 592), 130)
    a = prog(t, 0.2, 0.8)
    pts = [proj(*p) for p in OUTLINE]
    poly(d, pts, (52, 108, 84, int(255 * a)), outline=(160, 210, 180, int(255 * a)))
    for br in (BORDER_CAN, BORDER_MEX):
        line(d, [proj(*p) for p in br], (230, 245, 235, int(150 * a)), 2)
    u = t / T
    order = [0, 11, 14, 1, 2, 3, 12, 15, 4, 5, 13, 6, 7, 8, 9, 10]
    for rank, idx in enumerate(order):
        kind, lon, lat = CITIES[idx]
        t0 = 0.12 + rank * 0.05
        a = prog(u, t0, t0 + 0.04)
        if a <= 0:
            continue
        x, y = proj(lon, lat)
        col = COUNTRY_COL[kind]
        rr = 7 * ease_back(a)
        ell(d, x, y, rr + 4, rr + 4, fill=(255, 255, 255, int(255 * a)))
        ell(d, x, y, rr, rr, fill=col)
        rp = prog(u, t0, t0 + 0.09)
        if 0 < rp < 1:
            ell(d, x, y, 8 + 34 * rp, 8 + 34 * rp, outline=(*col, int(200 * (1 - rp))), width=3)
    panel(d, (730, 112, 1240, 592), 130)
    k = int(round(16 * ease_out(prog(u, 0.12, 0.85))))
    text(d, 985, 205, str(k), 120, GOLD, stroke=4, stroke_fill=(70, 40, 0))
    text(d, 985, 285, "стадионов", 30, GRAY)
    rows = [("США", "usa", 11, 0.30, 380), ("Мексика", "mex", 3, 0.58, 455), ("Канада", "can", 2, 0.72, 530)]
    for name, kind, cnt, u0, y in rows:
        a = prog(u, u0, u0 + 0.08)
        col = COUNTRY_COL[kind]
        xo = (1 - ease_out(a)) * 80
        rrect(d, (770 + xo, y - 28, 1200 + xo, y + 28), 14, (*col, int(70 * a)), outline=(*col, int(255 * a)), width=3)
        text(d, 800 + xo, y, name, 30, with_alpha(WHITE, a), anchor="lm")
        text(d, 1165 + xo, y, str(int(round(cnt * ease_out(a)))), 38, with_alpha(GOLD, a), anchor="rm")


def scene_opening(im, d, t, T):
    u = t / T
    cx, cy = 372, 345
    a = prog(t, 0.1, 0.9)
    rx, ry = 305 * ease_out(a), 235 * ease_out(a)
    ell(d, cx, cy, rx + 30, ry + 30, fill=(20, 28, 46, 235))
    cols = [(210, 70, 70), (230, 230, 240), (60, 150, 210), (240, 190, 60)]
    for ring in range(3):                                           # трибуны с живой толпой
        rr = ring / 3
        r1x, r1y = rx * (1 - 0.0 - rr * 0.1), ry * (1 - rr * 0.1)
        ell(d, cx, cy, r1x, r1y, fill=(34 + ring * 10, 44 + ring * 8, 70 + ring * 8, 255))
        n = 70 + ring * 12
        for j in range(n):
            ang = j / n * 2 * math.pi
            px, py = cx + (r1x - 8) * math.cos(ang), cy + (r1y - 8) * math.sin(ang)
            blink = (math.sin(t * 6 + j * 1.7 + ring) > 0.4)
            c = cols[(j * 7 + ring) % 4] if blink else (90, 100, 130)
            ell(d, px, py, 3.2, 3.2, fill=(*c, 230))
    px0, py0, px1, py1 = cx - 205 * a, cy - 145 * a, cx + 205 * a, cy + 145 * a
    rrect(d, (px0, py0, px1, py1), 6, (36, 140, 70))
    for i in range(8):
        d.rectangle([sc(px0 + i * 410 * a / 8), sc(py0), sc(px0 + (i + 1) * 410 * a / 8), sc(py1)], fill=(0, 0, 0, 0) if i % 2 else (255, 255, 255, 14))
    lc = (255, 255, 255, 150)
    if px1 - px0 > 16 and py1 - py0 > 16:
        d.rectangle([sc(px0 + 6), sc(py0 + 6), sc(px1 - 6), sc(py1 - 6)], outline=lc, width=sc(2))
    line(d, [(cx, py0 + 6), (cx, py1 - 6)], lc, 2)
    ell(d, cx, cy, 42 * a, 42 * a, outline=lc, width=2)
    # прожекторы
    for k, (sx, sy) in enumerate([(cx - rx * .8, cy - ry * .85), (cx + rx * .8, cy - ry * .85), (cx - rx * .8, cy + ry * .85), (cx + rx * .8, cy + ry * .85)]):
        sw = math.sin(t * 1.3 + k)
        poly(d, [(sx, sy), (cx + 60 * sw - 50, cy), (cx + 60 * sw + 50, cy)], (255, 245, 200, 26))
        ell(d, sx, sy, 6, 6, fill=(255, 250, 220, 255))
    # вспышки камер
    rnd = random.Random(int(t * 10))
    for _ in range(6):
        ang = rnd.random() * 6.28
        fx, fy = cx + (rx - 14) * math.cos(ang), cy + (ry - 14) * math.sin(ang)
        ell(d, fx, fy, 5, 5, fill=(255, 255, 255, 240))
    draw_ball(im, d, cx, cy - 5 + 6 * math.sin(t * 3), 17, t * 120)
    # правая часть
    a2 = prog(u, 0.12, 0.28)
    text(d, 960, 145 + (1 - ease_out(a2)) * 20, "11 ИЮНЯ 2026", 56, with_alpha(GOLD, a2), stroke=3, stroke_fill=(70, 40, 0))
    a3 = prog(u, 0.2, 0.36)
    text(d, 960, 212, "СТАДИОН АЦТЕКА", 38, with_alpha(WHITE, a3), stroke=2)
    text(d, 960, 254, "Мехико · Мексика", 27, with_alpha(GRAY, a3))
    a4 = prog(u, 0.52, 0.64)
    panel(d, (720, 305, 1230, 585), int(140 * a4))
    text(d, 975, 342, "МЕКСИКА — ПЕРВАЯ СТРАНА С ТРЕМЯ", 20, with_alpha(WHITE, a4))
    text(d, 975, 368, "ЧЕМПИОНАТАМИ МИРА", 20, with_alpha(WHITE, a4))
    for i, yr in enumerate(("1970", "1986", "2026")):
        a5 = prog(u, 0.62 + i * 0.1, 0.72 + i * 0.1)
        x = 805 + i * 170
        e = ease_back(a5)
        draw_ball(im, d, x, 460, max(1, int(40 * e)), t * 90 + i * 40, alpha=clamp(a5 * 1.4)) if a5 > 0 else None
        text(d, x, 535, yr, 34, with_alpha(GOLD if i == 2 else WHITE, a5), stroke=2)


def scene_format(im, d, t, T):
    u = t / T
    heading(d, "НОВЫЙ ФОРМАТ ТУРНИРА", t, size=40)
    bw, bh, gap = 185, 150, 15
    x0, y0 = 47, 118
    for g in range(12):
        r_, c_ = divmod(g, 6)
        x, y = x0 + c_ * (bw + gap), y0 + r_ * (bh + gap)
        a = prog(u, 0.05 + g * 0.012, 0.11 + g * 0.012)
        if a <= 0:
            continue
        e = ease_back(a)
        cxm, cym = x + bw / 2, y + bh / 2
        rrect(d, (cxm - bw / 2 * e, cym - bh / 2 * e, cxm + bw / 2 * e, cym + bh / 2 * e), 14, (8, 18, 40, int(200 * a)), outline=(255, 255, 255, int(90 * a)), width=2)
        if e < 0.9:
            continue
        text(d, x + 22, y + 24, chr(ord("A") + g), 24, with_alpha(GOLD, a), anchor="lm")
        q = prog(u, 0.34 + g * 0.006, 0.40 + g * 0.006)
        q3 = prog(u, 0.56 + g * 0.012, 0.62 + g * 0.012)
        for rk in range(4):
            yy = y + 56 + rk * 22
            col = (120, 135, 165)
            if rk < 2:
                col = mix(col, GREEN, q)
            if rk == 2 and g < 8:
                col = mix(col, GOLD, q3)
            elif rk == 2:
                col = mix(col, (70, 80, 100), q3)
            rrect(d, (x + 14, yy - 7, x + bw - 14, yy + 7), 7, (*col, 255))
    # итоговая «математика»
    a = prog(u, 0.30, 0.40)
    text(d, 330, 470, "12 групп × 4 команды = 48", 30, with_alpha(WHITE, prog(u, 0.12, 0.22)))
    text(d, 330, 515, "2 лучшие из группы = 24", 30, with_alpha(mix(WHITE, GREEN, 1), a))
    a = prog(u, 0.58, 0.66)
    text(d, 330, 560, "+ 8 лучших из третьих мест", 30, with_alpha(GOLD, a))
    a = prog(u, 0.78, 0.9)
    e = ease_back(a)
    panel(d, (760, 455, 1235, 590), int(170 * a))
    text(d, 905, 525, str(int(round(32 * ease_out(a)))), 100 * max(e, 0.01) if a > 0 else 4, GOLD, stroke=4, stroke_fill=(70, 40, 0))
    text(d, 1105, 505, "сборных", 30, with_alpha(WHITE, a))
    text(d, 1105, 545, "в плей-офф", 30, with_alpha(WHITE, a))


def scene_final(im, d, t, T):
    u = t / T
    heading(d, "ДОРОГА К ФИНАЛУ", t, size=40)
    labels = ["1/16", "1/8", "1/4", "1/2", "ФИНАЛ"]
    nums = [32, 16, 8, 4, 2]
    for i, (lab, n) in enumerate(zip(labels, nums)):
        a = prog(u, 0.08 + i * 0.07, 0.16 + i * 0.07)
        x = 180 + i * 230
        if i:
            line(d, [(x - 230 + 66, 160), (x - 66, 160)], (255, 255, 255, int(160 * a)), 3)
        e = ease_back(a)
        r = 58 * max(e, 0.01)
        last = i == 4
        ell(d, x, 160, r, r, fill=(GOLD if last else (14, 30, 66)) + (int(240 * a),), outline=(255, 255, 255, int(220 * a)), width=3)
        text(d, x, 150, str(n), 40 if not last else 40, with_alpha(NAVY if last else WHITE, a))
        text(d, x, 188, "команд" if n > 4 else "команды" if n == 4 else "команды", 15, with_alpha(NAVY if last else GRAY, a))
        text(d, x, 242, lab, 24, with_alpha(GOLD, a))
    ta = prog(u, 0.45, 0.65)
    draw_trophy(im, d, 360, 625 - (1 - ease_out(ta)) * 80, 330 * (0.4 + 0.6 * ease_out(ta)), t, glow=ta)
    a = prog(u, 0.58, 0.72)
    text(d, 900, 355 + (1 - ease_out(a)) * 20, "19 ИЮЛЯ", 80, with_alpha(GOLD, a), stroke=4, stroke_fill=(70, 40, 0))
    a = prog(u, 0.68, 0.82)
    text(d, 900, 435, "СТАДИОН «МЕТЛАЙФ»", 36, with_alpha(WHITE, a), stroke=2)
    text(d, 900, 480, "Нью-Джерси · США", 28, with_alpha(GRAY, a))
    a = prog(u, 0.82, 0.95)
    rrect(d, (700, 520, 1100, 575), 27, (255, 198, 40, int(60 * a)), outline=(255, 198, 40, int(255 * a)), width=3)
    text(d, 900, 548, "золотой кубок ФИФА", 25, with_alpha(GOLD, a))


def scene_outro(im, d, t, T):
    u = t / T
    # фейерверки
    for b in range(7):
        bt = 0.2 + b * 1.05
        lt = t - bt
        if 0 <= lt < 1.6:
            rnd = random.Random(b * 31 + 5)
            bx, by = rnd.uniform(160, 1120), rnd.uniform(120, 340)
            col = [(255, 210, 70), (255, 100, 110), (110, 190, 255), (120, 240, 170), (255, 160, 60), (230, 130, 255), (255, 255, 255)][b]
            for k in range(36):
                ang = k / 36 * 2 * math.pi
                sp = 150 + (k % 3) * 45
                r_ = sp * ease_out(lt / 1.6)
                x, y = bx + math.cos(ang) * r_, by + math.sin(ang) * r_ + 90 * (lt ** 2) * 0.45
                al = (1 - lt / 1.6)
                ell(d, x, y, 3.5, 3.5, fill=(*col, int(255 * al)))
    # конфетти
    rnd = random.Random(7)
    for i in range(70):
        sx, sp, ph = rnd.uniform(0, W), rnd.uniform(70, 160), rnd.uniform(0, 6)
        col = rnd.choice([GOLD, RED, BLUE, GREEN, WHITE])
        st = rnd.uniform(0.0, 1.0)
        y = ((t - st) * sp) % (H + 40) - 20
        x = sx + 25 * math.sin(t * 2 + ph)
        if t > st:
            poly(d, [(x, y), (x + 9 * math.cos(t * 5 + ph), y + 4), (x + 9, y + 11), (x, y + 9)], (*col, 230))
    a = prog(t, 0.4, 1.0)
    text(d, W / 2, 262 + (1 - ease_out(a)) * 30, "ФУТБОЛ", 120, with_alpha(WHITE, a), stroke=6)
    a = prog(t, 1.1, 1.8)
    text(d, W / 2, 380 + (1 - ease_out(a)) * 30, "ПРИНАДЛЕЖИТ ВСЕМ", 84, with_alpha(GOLD, a), stroke=5, stroke_fill=(90, 50, 0))
    a = prog(t, 2.2, 2.9)
    text_spaced(d, W / 2, 452, "ЧЕМПИОНАТ МИРА  ·  2026", 32, with_alpha((225, 235, 255), a), gap=6)
    by = 592 - abs(math.sin(t * 3.2)) * 55
    draw_ball(im, d, W / 2, by, 38, t * 300, shadow_y=630)


SCENES = {"title": scene_title, "hosts": scene_hosts, "numbers": scene_numbers, "cities": scene_cities,
          "opening": scene_opening, "format": scene_format, "final": scene_final, "outro": scene_outro}


def render_frame(i):
    t = i / FPS
    name = ORDER[-1]
    for n in ORDER:
        if t < STARTS[n] + SCENE_T[n] - 1e-9:
            name = n
            break
    tl = t - STARTS[name]
    T = SCENE_T[name]
    im = BG.copy()
    CUR["im"] = im
    d = ImageDraw.Draw(im, "RGBA")
    SCENES[name](im, d, tl, T)
    caption(d, name, tl)
    out = im.resize((W, H), Image.LANCZOS)
    fa = min(prog(tl, 0, FADE), 1 - prog(tl, T - FADE, T))
    if name == ORDER[0]:
        fa = min(1.0, fa + (1 - prog(tl, 0, FADE))) if tl < FADE else fa
    if fa < 1:
        out = Image.blend(Image.new("RGB", (W, H), NAVY), out, fa)
    return out


def _raw(i):
    return render_frame(i).tobytes()


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--preview" in args:
        outdir = args[args.index("--preview") + 1]
        os.makedirs(outdir, exist_ok=True)
        for n in ORDER:
            for frac in (0.35, 0.8):
                fi = int((STARTS[n] + SCENE_T[n] * frac) * FPS)
                render_frame(fi).save(f"{outdir}/{n}_{int(frac * 100)}.png")
        print("preview ok", TOTAL, NFRAMES)
        sys.exit()
    out = args[0]
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for k, buf in enumerate(pool.imap(_raw, range(NFRAMES), chunksize=6)):
            ff.stdin.write(buf)
            if k % 150 == 0:
                print(f"{k}/{NFRAMES}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("done", out)
