"""V2 look test: 5 s, Arman at the kitchen table (key-art framing), true 60 fps -> renders/v2_test/*.mp4"""
import math, os, subprocess, sys
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, skia
from engine.core import (W, H, new_surface, surface_rgba, hexc, fill, stroke, radial, linear, with_alpha, shade, lerp, ramp,
                         clamp, fbm, blink_curve, ease_in_out, ease_out, ease_out_back)
from engine.rig import emotion, blend_emotions
from engine.rig2 import RIGS2
from engine import sets2 as S2
from engine.sets import draw_mug
from engine.look import concept_look

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FPS, DUR = 60, 5.0
ARMAN = RIGS2["arman"]
BUZZ = 1.2


def saccade(T, seed, amp=0.08, period=0.7):
    k = math.floor(T / period)
    f = T / period - k
    from engine.core import _hash
    a = (_hash(k * 7 + seed), _hash(k * 13 + seed))
    b = (_hash((k - 1) * 7 + seed), _hash((k - 1) * 13 + seed))
    u = clamp(f / 0.08)
    return lerp(b[0], a[0], u) * amp, lerp(b[1], a[1], u) * amp * 0.6


def arman_pose(T):
    # emotional beats
    sus = emotion("suspicion", look=(0.0, 0.0), brow_asym=0.25)
    wide = emotion("surprise", mouth_open=0.12, pupil_k=0.75, brow_raise=0.8, lid=-0.25)
    fear = emotion("fear", mouth_open=0.08, brow_raise=0.55, brow_angle=-0.7, lid=-0.1, smile=-0.3)
    ant = math.sin(clamp((T - BUZZ - 0.05) / 0.16) * math.pi) if BUZZ + 0.05 < T < BUZZ + 0.21 else 0.0
    e = sus
    e = blend_emotions(e, wide, ramp(T, BUZZ + 0.15, BUZZ + 0.35, "back"))
    e = blend_emotions(e, fear, ramp(T, 2.0, 2.6))
    e = blend_emotions(e, emotion("suspicion", brow_asym=0.4, lid=0.42), ramp(T, 4.35, 4.75))
    # gaze: phone (right/down) -> reading scan -> up-left towards Mom -> back to phone
    phone_look = (0.75, 0.55)
    read = (0.55 + 0.25 * math.sin((T - 1.9) * 9) * (1.9 < T < 2.8), 0.5)
    up = (-0.7, -0.05)
    lx = lerp(phone_look[0], read[0], ramp(T, 1.85, 1.95))
    ly = lerp(phone_look[1], read[1], ramp(T, 1.85, 1.95))
    u_up = ease_in_out(ramp(T, 2.85, 3.25)) * (1 - ease_in_out(ramp(T, 4.3, 4.55)))
    lx, ly = lerp(lx, up[0], u_up), lerp(ly, up[1], u_up)
    sx, sy = saccade(T, 3)
    p = dict(
        x=500, y=1880, s=3.65, bt=lerp(0.18, 0.05, u_up), ht=lerp(0.32, -0.22, u_up) + 0.03 * fbm(T * 0.4, 5),
        tilt=lerp(-6, 4, u_up) + 2.2 * fbm(T * 0.35, 9) - 4 * ant, nod=lerp(0.35, -0.05, u_up) + 0.15 * ant,
        hdx=0.02 * fbm(T * 0.3, 11), hdy=0.012 * fbm(T * 0.4, 13) + 0.05 * ant - 0.04 * ramp(T, BUZZ + 0.15, BUZZ + 0.4) * (1 - ramp(T, 2.0, 2.6))
             + 0.025 * math.exp(-max(0.0, T - 3.75) * 7) * (T > 3.75),
        look=(clamp(lx + sx, -1, 1), clamp(ly + sy, -1, 1)), blink=blink_curve(T, 4, period=3.1, extra=(3.0,)),
        breath=T * 0.27, phone="b", phone_glow=0.12 + 0.25 * ramp(T, BUZZ, BUZZ + 0.08) * (1 - 0.5 * ramp(T, 2.5, 4)),
        phone_rot=-22 + 2.5 * math.sin(T * 2 * math.pi * 24) * (BUZZ < T < BUZZ + 0.5),
        hand_b=(1.05 + 0.02 * fbm(T, 2), -0.98 + 0.05 * ant + 0.08 * u_up), elbow_b=1, hand_a=None, elbow_a=1,
        key=(0.3, -0.6), rim_dir=(-0.2, -1.0), rim_k=1.35, uplight=0.12 + 0.18 * ramp(T, BUZZ, BUZZ + 0.08) * (1 - ramp(T, 2.5, 4.5)),
        uplight_col="#b8d0ff", squash=-0.02 * ant,
    )
    p.update({k: v for k, v in e.items() if k not in ("look",)})
    return p


def lamp_power(T):
    from ep01_timeline import _dip
    return 1.0 - _dip(T, 3.95, 0.25, 0.16) - _dip(T, 4.2, 0.12, 0.14)


def frame(i):
    T = i / FPS
    s = new_surface()
    c = s.getCanvas()
    pw = lamp_power(T)
    z = lerp(1.0, 1.07, ease_in_out(T / DUR))
    # background plate: defocused + slight parallax
    c.save()
    c.translate(W / 2, H / 2); c.scale(z * 0.97 * 1.15, z * 0.97 * 1.15); c.translate(-W / 2 + 270 - 10 * T, -H / 2 + 260)
    p = skia.Paint(); p.setImageFilter(skia.ImageFilters.Blur(5, 5))
    c.saveLayer(None, p)
    S2.kitchen_west_v2_bg(c, T, pw)
    wx0, wy0, wx1, wy1 = S2.WEST2["window"]
    c.drawCircle((wx0 + wx1) / 2, (wy0 + wy1) / 2 + 160, 560,
               fill(0, shader=radial((wx0 + wx1) / 2, (wy0 + wy1) / 2 + 160, 560, [with_alpha(hexc("#ffcf7a"), 0.85 * pw),
                                                                                  with_alpha(hexc("#ff9a3a"), 0.45 * pw),
                                                                                  with_alpha(hexc("#ff9a3a"), 0.0)], [0, 0.55, 1])),
               )
    c.drawRect(skia.Rect.MakeWH(W * 2, H * 2), fill(with_alpha(hexc("#ff8a2a"), 0.10 * pw), blend=skia.BlendMode.kPlus))
    c.restore()
    c.restore()
    # character + table
    c.save()
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2 + 60)
    a = arman_pose(T)
    hx, hy, R = ARMAN.head_pos(a)
    c.drawCircle(hx, hy, R * 1.9, fill(0, shader=radial(hx, hy, R * 1.9, [with_alpha(hexc("#ffb050"), 0.55 * pw), with_alpha(hexc("#ff8a2a"), 0.25 * pw),
                                                                          with_alpha(hexc("#ff8a2a"), 0)], [0.45, 0.62, 1]),
                                       blend=skia.BlendMode.kPlus))
    ARMAN.draw(c, a, passes=("legs", "body", "head"))
    ty = 2100
    wood = hexc("#5a3720")
    c.drawRect(skia.Rect.MakeLTRB(-300, ty, W + 300, H + 400), fill(wood, shader=linear(0, ty, 0, ty + 420, [hexc("#7a4a28"), hexc("#2a170b")])))
    c.drawRect(skia.Rect.MakeLTRB(-300, ty, W + 300, ty + 5), fill(with_alpha(hexc("#ffcf8f"), 0.5 * pw)))
    ARMAN.draw(c, a, passes=("arms",))
    # phone light on the table
    c.drawCircle(860, 1150, 320, fill(0, shader=radial(760, ty + 40, 260, [with_alpha(hexc("#9fc0ff"), 0.18 * a["uplight"]), with_alpha(hexc("#9fc0ff"), 0)]),
                                         blend=skia.BlendMode.kPlus))
    c.restore()
    # deep shadow falloff + warm key from left
    c.drawRect(skia.Rect.MakeWH(W, H), fill(0, shader=radial(540, 820, 1350, [with_alpha(hexc("#000"), 0.0), with_alpha(hexc("#000"), 0.2), with_alpha(hexc("#000"), 0.7)], [0, 0.55, 1])))
    rgb = surface_rgba(s)[:, :, :3]
    return concept_look(rgb, t=T, warm=1.0, cold=0.2, sat=1.3, bloom=0.6).tobytes()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "renders", "v2_test", "v2_test_arman_kitchen.mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    n = int(DUR * FPS)
    sfx = os.path.join(ROOT, "sound_effects", "vibe.wav")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-itsoffset", str(BUZZ), "-i", sfx, "-filter_complex", "[1:a]volume=0.7,apad[a]", "-map", "0:v", "-map", "[a]",
                           "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS),
                           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", str(DUR), "-movflags", "+faststart", out],
                          stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for buf in pool.imap(frame, range(n), chunksize=4):
            ff.stdin.write(buf)
    ff.stdin.close(); ff.wait()
    print("ok", out)
