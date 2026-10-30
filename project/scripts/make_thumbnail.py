"""Episode cover 1080x1920: Arman (front, fear, phone light) + the double in the corridor behind + title."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia
from engine.core import W, H, new_surface, save_png, hexc, fill, stroke, font, draw_text, with_alpha, radial, linear, rrect
from engine import sets as S
from engine.rig import RIGS, emotion
from engine.ui import Phone, _rich_line
import ep01_shots as E

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
s = new_surface()
c = s.getCanvas()
# background: corridor with the double, defocused
E.layer_blur(c, 5)
c.save()
E.cam(c, 540, 900, 1.12)
c.drawPicture(S.pic_corridor())
S.corridor_lights(c, 0, 0.9, red=0.6)
d = dict(x=760, y=1200, s=1.35, key=(0, -1), rim_dir=(0, -1), rim_k=1.6, glow_k=0.9, **emotion("calm_smirk", lid=0.25, smile=0.45))
RIGS["double"].draw(c, d)
E.light_multiply(c, "#3e4460", [(540, 330, 1000, "#c8d6ff", 0.5), (760, 900, 600, "#ffb0b0", 0.45)])
hx, hy, R = RIGS["double"].head_pos(d)
for ex in (-0.37, 0.37):
    S.glow(c, hx + ex * R, hy + 0.05 * R, R * 0.45, hexc("#ff2030"), 0.6)
c.restore()
c.restore()
c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=linear(0, 0, 0, H, [with_alpha(hexc("#000"), 0.55), with_alpha(hexc("#000"), 0.0), with_alpha(hexc("#000"), 0.0), with_alpha(hexc("#000"), 0.7)], [0, 0.3, 0.6, 1])))
# Arman foreground
a = dict(x=380, y=2200, s=3.2, ht=0.18, key=(0.4, -0.6), rim_dir=(1, -0.3), rim_k=1.3, uplight=1.0, phone="b",
         phone_glow=1.0, hand_b=(0.45, -0.95), phone_rot=-10, hand_a=None, look=(0.85, 0.0),
         **emotion("fear", brow_raise=0.8, brow_angle=-0.8, mouth_open=0.25, pupil_k=0.55))
RIGS["arman"].draw(c, a)
# notification bubble
f = font("rubik", 50, 700)
c.save()
c.translate(560, 1270)
c.rotate(-4)
c.drawRRect(rrect(-10, 10, 470, 200, 36), fill(with_alpha(hexc("#000"), 0.5), blur=20))
c.drawRRect(rrect(0, 0, 450, 190, 36), fill(hexc("#eef1f6")))
_rich_line(c, "НЕ ОТВЕЧАЙ", 32, 78, f, hexc("#111"))
_rich_line(c, "МАМЕ.", 32, 140, f, hexc("#111"))
c.restore()
# title
t1, t2 = font("russo", 150), font("russo", 168)
draw_text(c, "ТЕБЯ ЗДЕСЬ", 60, 250, t1, hexc("#ffffff"), shadow=(20, 6, with_alpha(hexc("#000"), 0.8)))
draw_text(c, "НЕ БЫЛО", 60, 430, t2, hexc("#ff2a3a"), shadow=(30, 0, with_alpha(hexc("#ff0010"), 0.6)))
p = skia.Path()
p.moveTo(70, 480); p.cubicTo(300, 455, 600, 470, 820, 448)
c.drawPath(p, stroke(hexc("#ffffff"), 10))
c.drawRRect(rrect(60, 530, 330, 70, 35), fill(hexc("#ff2a3a")))
draw_text(c, "СЕРИЯ 1", 225, 580, font("russo", 40), hexc("#ffffff"), align="center")
draw_text(c, "«НЕ ОТВЕЧАЙ»", 420, 582, font("russo", 44), hexc("#ffffff"))
S.vignette(c, 0.35)
save_png(s, os.path.join(ROOT, "final", "episode_01_thumbnail.png"))
print("thumb ok")
