"""Episode 3 cover 1080x1920: Arman and the girl at door 048, warm light in the gap (frame drawn by the
production renderer at T=47.2) + the «НЕ ВОЗВРАЩАЙСЯ.» notification + series title. Same layout as the ep. 1 cover."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia, numpy as np
from engine.core import W, H, new_surface, save_png, hexc, fill, stroke, font, draw_text, with_alpha, linear, rrect
from engine import sets as S
from engine.ui import _rich_line
from ep03_shots import render_frame

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
s = new_surface()
c = s.getCanvas()
bg = render_frame(47.2)
c.save(); c.translate(W / 2, H / 2); c.scale(1.12, 1.12); c.translate(-W / 2, -H / 2 + 80)
c.drawImage(skia.Image.fromarray(np.ascontiguousarray(bg)), 0, 0)
c.restore()
c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [with_alpha(hexc("#000"), 0.75), with_alpha(hexc("#000"), 0.0),
                                                                        with_alpha(hexc("#000"), 0.0), with_alpha(hexc("#000"), 0.7)], [0, 0.32, 0.62, 1])))
# notification bubble
f = font("rubik", 54, 700)
c.save(); c.translate(420, 1720); c.rotate(-4)
c.drawRRect(rrect(-10, 10, 640, 150, 36), fill(with_alpha(hexc("#000"), 0.5), blur=20))
c.drawRRect(rrect(0, 0, 620, 140, 36), fill(hexc("#eef1f6")))
_rich_line(c, "НЕ ВОЗВРАЩАЙСЯ.", 36, 90, f, hexc("#111"), red_words=("НЕ ВОЗВРАЩАЙСЯ",))
c.restore()
# title — same treatment as ep. 1
t1, t2 = font("russo", 150), font("russo", 168)
draw_text(c, "ТЕБЯ ЗДЕСЬ", 60, 250, t1, hexc("#ffffff"), shadow=(20, 6, with_alpha(hexc("#000"), 0.8)))
draw_text(c, "НЕ БЫЛО", 60, 430, t2, hexc("#ff2a3a"), shadow=(30, 0, with_alpha(hexc("#ff0010"), 0.6)))
p = skia.Path()
p.moveTo(70, 480); p.cubicTo(300, 455, 600, 470, 820, 448)
c.drawPath(p, stroke(hexc("#ffffff"), 10))
c.drawRRect(rrect(60, 530, 330, 70, 35), fill(hexc("#ff2a3a")))
draw_text(c, "СЕРИЯ 3", 225, 580, font("russo", 40), hexc("#ffffff"), align="center")
draw_text(c, "«ДВЕРЬ 048»", 420, 582, font("russo", 44), hexc("#ffffff"))
S.vignette(c, 0.3)
save_png(s, os.path.join(ROOT, "final", "episode_03_thumbnail.png"))
print("thumbnail ok")
