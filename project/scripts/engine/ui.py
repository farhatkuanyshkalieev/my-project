"""Phone UI (diegetic screens) and subtitle rendering."""
import math

import skia

from .core import (W, H, clamp, lerp, ramp, hexc, mix, with_alpha, shade, fill, stroke, radial, linear,
                   rrect, font, draw_text, wrap_words, ease_out_back, ease_out)

RED = "#ff3b44"
UI_BG = "#0b0d14"
BUBBLE_IN = "#2a2e3a"
BUBBLE_OUT = "#2f6bff"
KEYWORDS_RED = ("НЕ ОТВЕЧАЙ", "ПРОБЛЕМА", "ТЫ.")


def _rich_line(c, text, x, y, f, col, red_words=KEYWORDS_RED):
    """Draw a line where any red keyword is drawn in red."""
    i = 0
    cx = x
    while i < len(text):
        hit = None
        for kw in red_words:
            if text.startswith(kw, i):
                hit = kw
                break
        if hit:
            c.drawString(hit, cx, y, f, fill(hexc(RED)))
            cx += f.measureText(hit)
            i += len(hit)
        else:
            j = i + 1
            while j < len(text) and not any(text.startswith(kw, j) for kw in red_words):
                j += 1
            seg = text[i:j]
            c.drawString(seg, cx, y, f, fill(col))
            cx += f.measureText(seg)
            i = j


class Phone:
    """Draws a phone (bezel + screen content) in a local frame where the screen is SW x SH."""
    SW, SH = 640, 1340

    def __init__(self):
        self.f_time = font("rubik", 150, 500)
        self.f_date = font("rubik", 38, 400)
        self.f_title = font("rubik", 40, 600)
        self.f_small = font("rubik", 30, 400)
        self.f_msg = font("rubik", 47, 600)
        self.f_call = font("rubik", 92, 600)
        self.f_key = font("rubik", 40, 400)
        self.f_bar = font("rubik", 30, 600)

    def body(self, c, glow=1.0):
        SW, SH = self.SW, self.SH
        c.drawRRect(rrect(-28, -28, SW + 56, SH + 56, 92), fill(with_alpha(hexc("#000"), 0.55), blur=30))
        c.drawRRect(rrect(-24, -24, SW + 48, SH + 48, 90), fill(hexc("#16181f"), shader=linear(-24, 0, SW + 24, 0, [hexc("#3a3e4a"), hexc("#0d0e12"), hexc("#2a2d36")])))
        c.drawRRect(rrect(-14, -14, SW + 28, SH + 28, 80), fill(hexc("#050608")))
        if glow > 0:
            c.drawRRect(rrect(-60, -60, SW + 120, SH + 120, 120), fill(with_alpha(hexc("#9cc2ff"), 0.10 * glow), blur=60))

    def screen_begin(self, c):
        c.save()
        clip = skia.Path()
        clip.addRRect(rrect(0, 0, self.SW, self.SH, 68))
        c.clipPath(clip, doAntiAlias=True)

    def screen_end(self, c, power=1.0):
        # glass reflection + island
        c.drawRect(skia.Rect.MakeWH(self.SW, self.SH), fill(0, shader=linear(0, 0, self.SW, self.SH * 0.6, [with_alpha(hexc("#ffffff"), 0.07), with_alpha(hexc("#ffffff"), 0.0)])))
        c.restore()
        c.drawRRect(rrect(self.SW / 2 - 90, 26, 180, 50, 25), fill(hexc("#000")))
        if power < 1:
            c.drawRRect(rrect(0, 0, self.SW, self.SH, 68), fill(with_alpha(hexc("#000"), 1 - power)))

    def status_bar(self, c, light=True):
        col = hexc("#ffffff") if light else hexc("#000")
        draw_text(c, "23:17", 70, 64, self.f_bar, col)
        for i in range(4):
            c.drawRRect(rrect(self.SW - 190 + i * 14, 62 - (i + 1) * 7, 9, (i + 1) * 7, 2), fill(col))
        c.drawRRect(rrect(self.SW - 118, 40, 56, 26, 7), stroke(col, 2.5))
        c.drawRRect(rrect(self.SW - 114, 44, 34, 18, 4), fill(col))

    # ------------------------------------------------------------------ lock screen with notification
    def lock(self, c, t, notif_t=None, msg="", sender="Неизвестный номер", shake=0.0):
        SW, SH = self.SW, self.SH
        c.drawRect(skia.Rect.MakeWH(SW, SH), fill(0, shader=linear(0, 0, SW, SH, [hexc("#1a2140"), hexc("#0b0f22"), hexc("#25103a")])))
        c.drawCircle(SW * 0.8, SH * 0.25, 420, fill(0, shader=radial(SW * 0.8, SH * 0.25, 420, [with_alpha(hexc("#3a5cff"), 0.35), with_alpha(hexc("#3a5cff"), 0)])))
        c.drawCircle(SW * 0.1, SH * 0.8, 420, fill(0, shader=radial(SW * 0.1, SH * 0.8, 420, [with_alpha(hexc("#a03aff"), 0.25), with_alpha(hexc("#a03aff"), 0)])))
        self.status_bar(c)
        draw_text(c, "пятница, 30 октября", SW / 2, 230, self.f_date, with_alpha(hexc("#ffffff"), 0.85), align="center")
        draw_text(c, "23:17", SW / 2, 395, self.f_time, hexc("#ffffff"), align="center")
        if notif_t is not None and notif_t > 0:
            u = ease_out_back(clamp(notif_t / 0.45))
            y = lerp(-260, 480, u)
            self.notification(c, 30, y, SW - 60, sender, msg, alpha=clamp(notif_t / 0.2))

    def notification(self, c, x, y, w, sender, msg, alpha=1.0):
        lines = wrap_words(msg, self.f_msg, w - 70)
        h = 130 + len(lines) * 60
        c.saveLayerAlpha(None, int(255 * alpha))
        c.drawRRect(rrect(x, y + 10, w, h, 40), fill(with_alpha(hexc("#000"), 0.5), blur=24))
        c.drawRRect(rrect(x, y, w, h, 40), fill(with_alpha(hexc("#e9ecf3"), 0.96)))
        c.drawRRect(rrect(x + 30, y + 28, 54, 54, 14), fill(hexc("#34c759")))
        p = skia.Path()
        p.addOval(skia.Rect.MakeXYWH(x + 41, y + 40, 32, 26))
        c.drawPath(p, fill(hexc("#fff")))
        draw_text(c, sender, x + 100, y + 66, font("rubik", 34, 600), hexc("#111318"))
        for i, ln in enumerate(lines):
            _rich_line(c, ln, x + 34, y + 140 + i * 60, self.f_msg, hexc("#111318"))
        c.restore()
        return h

    # ------------------------------------------------------------------ incoming call
    def call(self, c, t, caller="МАМА", answered_t=None):
        SW, SH = self.SW, self.SH
        c.drawRect(skia.Rect.MakeWH(SW, SH), fill(0, shader=linear(0, 0, 0, SH, [hexc("#2a3350"), hexc("#141a2c"), hexc("#0a0d16")])))
        self.status_bar(c)
        ans = 0.0 if answered_t is None else clamp(answered_t / 0.35)
        draw_text(c, "мобильный" if ans < 0.5 else "00:0%d" % min(9, int(max(0.0, answered_t or 0) + 1)), SW / 2, 330, self.f_small, with_alpha(hexc("#ffffff"), 0.75), align="center")
        draw_text(c, caller, SW / 2, 270, self.f_call, hexc("#ffffff"), align="center")
        # avatar: mini mom portrait
        ax, ay = SW / 2, 560
        pulse = 0.5 + 0.5 * math.sin(t * 6)
        if ans < 1:
            for k in range(3):
                ph = ((t * 0.9 + k / 3) % 1)
                c.drawCircle(ax, ay, 120 + ph * 120, stroke(with_alpha(hexc("#ffffff"), 0.25 * (1 - ph) * (1 - ans)), 3))
        c.drawCircle(ax, ay, 120, fill(hexc("#e8c9a8")))
        c.save()
        cp = skia.Path()
        cp.addCircle(ax, ay, 120)
        c.clipPath(cp, doAntiAlias=True)
        c.drawCircle(ax, ay + 10, 120, fill(hexc("#d9b08a")))
        c.drawCircle(ax, ay - 10, 78, fill(hexc("#f1d3b5")))
        c.drawCircle(ax, ay - 92, 34, fill(hexc("#6b3f26")))
        c.drawArc(skia.Rect.MakeXYWH(ax - 80, ay - 92, 160, 120), 180, 180, True, fill(hexc("#6b3f26")))
        for ex in (-28, 28):
            c.drawCircle(ax + ex, ay - 6, 13, fill(hexc("#fff")))
            c.drawCircle(ax + ex, ay - 4, 8, fill(hexc("#5a3420")))
        c.drawArc(skia.Rect.MakeXYWH(ax - 22, ay + 18, 44, 24), 10, 160, False, stroke(hexc("#8a4a3a"), 5))
        c.drawRect(skia.Rect.MakeXYWH(ax - 100, ay + 70, 200, 80), fill(hexc("#9e6e6a")))
        c.restore()
        # buttons
        by = SH - 250
        if ans < 1:
            a = 1 - ans
            c.saveLayerAlpha(None, int(255 * a))
            c.drawCircle(150, by, 72, fill(hexc("#ff3b30")))
            c.drawLine(118, by + 6, 182, by + 6, stroke(hexc("#fff"), 14))
            draw_text(c, "Отклонить", 150, by + 125, self.f_small, hexc("#fff"), align="center")
            draw_text(c, "Ответить", SW - 150, by + 125, self.f_small, hexc("#fff"), align="center")
            c.restore()
        gx = lerp(SW - 150, SW / 2, ans)
        gr = 72 + 8 * pulse * (1 - ans)
        gcol = mix(hexc("#34c759"), hexc("#ff3b30"), ans)
        c.drawCircle(gx, by, gr, fill(gcol))
        hp = skia.Path()
        c.save()
        c.translate(gx, by)
        c.rotate(-30 + ans * 165)
        hp.addRRect(rrect(-34, -12, 68, 24, 12))
        c.drawPath(hp, fill(hexc("#fff")))
        c.restore()

    # ------------------------------------------------------------------ chat
    def chat(self, c, t, items, typing_dots_t=None, input_text="", show_keyboard=0.0, pressed=None,
             caret=True, scroll=0.0):
        """items: list of dicts {side:'in'|'out', text, appear_t (seconds since appear) or None}."""
        SW, SH = self.SW, self.SH
        c.drawRect(skia.Rect.MakeWH(SW, SH), fill(hexc(UI_BG)))
        self.status_bar(c)
        # header
        c.drawRect(skia.Rect.MakeXYWH(0, 90, SW, 120), fill(hexc("#121522")))
        c.drawCircle(120, 150, 40, fill(hexc("#3a3f50")))
        draw_text(c, "?", 120, 166, self.f_title, hexc("#cfd5e6"), align="center")
        draw_text(c, "Неизвестный номер", 180, 145, self.f_title, hexc("#ffffff"))
        draw_text(c, "в сети" if typing_dots_t is None else "печатает…", 180, 185, self.f_small, hexc("#7ea4ff"))
        draw_text(c, "‹", 40, 168, font("rubik", 80, 400), hexc("#7ea4ff"))
        kb_h = 470 * show_keyboard
        bottom = SH - 120 - kb_h
        # layout bubbles from bottom up
        blocks = []
        for it in items:
            lines = wrap_words(it["text"], self.f_msg, SW - 210)
            bw = max(self.f_msg.measureText(l) for l in lines) + 60
            bh = len(lines) * 60 + 44
            blocks.append((it, lines, bw, bh))
        if typing_dots_t is not None:
            blocks.append(({"side": "in", "dots": True, "appear_t": typing_dots_t}, [], 150, 90))
        y = bottom - 24 + scroll
        c.save()
        c.clipRect(skia.Rect.MakeLTRB(0, 212, SW, bottom))
        for it, lines, bw, bh in reversed(blocks):
            at = it.get("appear_t")
            if at is not None and at < 0:
                continue
            u = 1.0 if at is None else ease_out_back(clamp(at / 0.35))
            a = 1.0 if at is None else clamp(at / 0.15)
            y -= bh
            x = 30 if it["side"] == "in" else SW - 30 - bw
            c.save()
            ox = x if it["side"] == "in" else x + bw
            c.translate(ox, y + bh)
            c.scale(lerp(0.6, 1, u), lerp(0.6, 1, u))
            c.translate(-ox, -(y + bh))
            c.saveLayerAlpha(None, int(255 * a))
            col = hexc(BUBBLE_IN if it["side"] == "in" else BUBBLE_OUT)
            c.drawRRect(rrect(x, y, bw, bh, 34), fill(col))
            if it.get("dots"):
                for k in range(3):
                    ph = math.sin(t * 8 - k * 0.8) * 0.5 + 0.5
                    c.drawCircle(x + 45 + k * 30, y + 45 - ph * 8, 10, fill(with_alpha(hexc("#ffffff"), 0.4 + 0.5 * ph)))
            for i, ln in enumerate(lines):
                _rich_line(c, ln, x + 30, y + 72 + i * 60, self.f_msg, hexc("#ffffff"),
                           red_words=() if it["side"] == "out" else KEYWORDS_RED)
            c.restore()
            c.restore()
            y -= 22
        c.restore()
        # input bar
        iy = SH - 110 - kb_h
        c.drawRect(skia.Rect.MakeXYWH(0, iy - 14, SW, 124 + kb_h), fill(hexc("#121522")))
        c.drawRRect(rrect(30, iy, SW - 150, 76, 38), fill(hexc("#1e2232")))
        if input_text:
            draw_text(c, input_text, 60, iy + 52, self.f_msg, hexc("#ffffff"))
            if caret and (t * 2) % 1 < 0.5:
                cx = 60 + self.f_msg.measureText(input_text) + 4
                c.drawRect(skia.Rect.MakeXYWH(cx, iy + 16, 4, 46), fill(hexc("#7ea4ff")))
        else:
            draw_text(c, "Сообщение", 60, iy + 52, self.f_small, hexc("#6a7088"))
        c.drawCircle(SW - 70, iy + 38, 38, fill(hexc(BUBBLE_OUT) if input_text else hexc("#2a2e3a")))
        c.drawPath(_arrow(SW - 70, iy + 38), fill(hexc("#fff")))
        if show_keyboard > 0:
            self.keyboard(c, SH - kb_h, pressed)

    def keyboard(self, c, y0, pressed=None):
        SW = self.SW
        c.drawRect(skia.Rect.MakeXYWH(0, y0, SW, 470), fill(hexc("#1b1e29")))
        rows = ["ЙЦУКЕНГШЩЗХ", "ФЫВАПРОЛДЖЭ", "ЯЧСМИТЬБЮ"]
        kw = SW / 11.6
        for r, row in enumerate(rows):
            off = (SW - len(row) * kw) / 2
            for i, ch in enumerate(row):
                x = off + i * kw + 4
                y = y0 + 22 + r * 100
                on = pressed == ch
                c.drawRRect(rrect(x, y, kw - 8, 84, 10), fill(hexc("#5a6178") if on else hexc("#343a4c")))
                draw_text(c, ch, x + (kw - 8) / 2, y + 56, self.f_key, hexc("#ffffff"), align="center")
                if on:
                    c.drawRRect(rrect(x - 8, y - 96, kw + 8, 96, 14), fill(hexc("#5a6178")))
                    draw_text(c, ch, x + (kw - 8) / 2, y - 30, font("rubik", 56, 500), hexc("#fff"), align="center")
        y = y0 + 22 + 3 * 100
        c.drawRRect(rrect(SW * 0.25, y, SW * 0.5, 84, 10), fill(hexc("#5a6178") if pressed == " " else hexc("#343a4c")))
        draw_text(c, "пробел", SW / 2, y + 54, self.f_small, hexc("#cfd5e6"), align="center")


def _arrow(x, y):
    return skia.Path().moveTo(x - 14, y + 4).lineTo(x, y - 16).lineTo(x + 14, y + 4).lineTo(x + 5, y + 4) \
        .lineTo(x + 5, y + 18).lineTo(x - 5, y + 18).lineTo(x - 5, y + 4).close()


# ============================================================================== subtitles
SUB_Y = 1395            # baseline of the last line; stays above TikTok/Reels bottom UI (~y>1540)
SUB_MAXW = 800          # keeps clear of the right-hand action column


def render_subtitle(c, text, y=SUB_Y, red_words=(), color="#ffffff"):
    f = font("inter-xbold", 60)
    lines = wrap_words(text, f, SUB_MAXW)[:2]
    lh = 76
    y0 = y - (len(lines) - 1) * lh
    for i, ln in enumerate(lines):
        w = f.measureText(ln)
        x = W / 2 - w / 2
        yy = y0 + i * lh
        c.drawString(ln, x, yy + 4, f, fill(with_alpha(hexc("#000"), 0.75), blur=7))
        c.drawString(ln, x, yy, f, stroke(hexc("#000000"), 10))
        # rich colouring
        cx = x
        for word in ln.split(" "):
            core = word.strip(".,!?…«»")
            col = hexc(RED) if core.lower() in red_words else hexc(color)
            c.drawString(word, cx, yy, f, fill(col))
            cx += f.measureText(word + " ")
