"""Series-standard test: 5 s, Arman + the double in the corridor (real voices, lip-sync, 60 fps)."""
import math, os, subprocess, sys
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, skia
import ep01_shots as E
import voice_lib as V
from engine.core import W, H, new_surface, surface_rgba, hexc, fill, radial, with_alpha, lerp, ramp, clamp, fbm, ease_in_out
from engine.rig import emotion, blend_emotions
from engine import sets2 as S2
from engine.look import concept_look

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "ep02", "voices", "raw")
FPS, DUR = 60, 5.0
E.RIM_MODE = "standard"
LINES = {"A1": dict(take="DqPitd3KMSMK584okctZ", fx="whisper", who="arman", t=0.25),
         "D1": dict(take="ozuN4o8EWPkPAKyc7yr9", fx="double_hall", who="double", t=2.2)}
CLIPS = {k: V.process(os.path.join(RAW, v["take"] + ".mp3"), v["fx"]) for k, v in LINES.items()}
E.LIPS = {k: dict(start=v["t"] - 0.06, who=v["who"], env=V.lip_env(CLIPS[k])) for k, v in LINES.items()}
BUZZ = 2.6


def frame(i):
    T = i / FPS
    s = new_surface(); c = s.getCanvas()
    z = lerp(1.06, 1.14, ease_in_out(T / DUR))
    c.save()
    E.cam(c, 540, 1020, z, T=T, shake=2.5)
    S2.corridor_v2(c, T, 0.95 - 0.06 * math.sin(T * 1.7), red=0.55 + 0.35 * ramp(T, 4.0, 4.4))
    # the double: step forward, talk, point at the phone, eyes flare on «первым»
    stp = ramp(T, 1.0, 1.6)
    point = ramp(T, 2.45, 2.85, "back") * (1 - ramp(T, 4.55, 4.95))
    flare = ramp(T, 4.05, 4.3) * (1 - 0.5 * ramp(T, 4.6, 5.0))
    d = E.pose(dict(x=lerp(730, 700, stp), y=1405 + lerp(0, 18, stp), s=lerp(1.42, 1.48, stp), bt=-0.45, ht=-0.38,
                    key=(0, -1), rim_dir=(0.2, -1), rim_k=1.5, step=0.6 * math.sin(stp * math.pi),
                    hand_a=None, hand_b=(lerp(0.55, -1.15, point), lerp(-0.25, -1.55, point)), elbow_b=-1),
               emotion("calm_smirk", lid=0.3 - 0.12 * flare, smile=0.35 + 0.25 * point), E.life("double", T, 7), look=(-0.55, 0.05))
    d["tilt"] += -7 * ramp(T, 2.3, 2.9) + 5 * flare
    d["glow_k"] = 0.55 + 0.6 * flare
    c.drawOval(skia.Rect.MakeXYWH(d["x"] - 130, 1640, 260, 50), fill(with_alpha(hexc("#000"), 0.55), blur=12))
    E.DOUBLE.draw(c, d)
    # Arman (foreground, 3/4 towards the double), phone in the near hand
    fear = ramp(T, 0.1, 0.5)
    glance = ramp(T, 4.35, 4.6)
    a = E.pose(dict(x=250, y=1600, s=2.15, bt=0.62, ht=lerp(0.5, 0.62, glance), key=(0.4, -0.6), rim_dir=(0.9, -0.5), rim_k=1.2,
                    hand_a=(0.95, -0.95 - 0.04 * math.sin(T * 30) * (BUZZ < T < BUZZ + 0.45)), elbow_a=1, hand_b=None, phone="a",
                    phone_rot=-28, phone_glow=0.25 + 0.7 * ramp(T, BUZZ, BUZZ + 0.06) * (1 - 0.4 * ramp(T, 3.4, 5.0)),
                    lean=-4 * fear - 3 * ramp(T, 2.3, 2.6), uplight=0.4 * ramp(T, BUZZ, BUZZ + 0.1)),
               blend_emotions(emotion("fear", brow_raise=0.7, brow_angle=-0.6, mouth_open=0, smile=-0.3, pupil_k=0.7),
                              emotion("surprise", pupil_k=0.55, brow_raise=0.9, lid=-0.25), ramp(T, 4.1, 4.35)),
               E.life("arman", T, 1, extra_blinks=(1.95,)),
               look=(lerp(0.85, 0.55, glance), lerp(0.0, 0.75, glance)), nod=0.25 * glance)
    E.ARMAN.draw(c, a)
    E.light_multiply(c, "#7a8098", [(540, 820, 900, "#c8d6ff", 0.55), (d["x"], 1050, 520, "#ffb0b0", 0.4 + 0.25 * flare),
                                    (300, 1700, 700, "#ffcf9a", 0.35)])
    hx, hy, R = E.DOUBLE.head_pos(d)
    for ex in (-0.37, 0.37):
        S2.glow(c, hx + (ex + d["ht"] * 0.48) * R, hy + 0.2 * R, R * (0.3 + 0.2 * flare), hexc("#ff2030"), 0.3 + 0.4 * flare)
    c.restore()
    E.grade(c, T, cold=0.7, red=0.25 + 0.3 * flare, vig=0.85)
    rgb = concept_look(surface_rgba(s)[:, :, :3], t=T, warm=0.3, cold=1.0, sat=1.2, bloom=0.6, grain=0.025)
    return rgb.tobytes()


def build_audio(path):
    from audio_build import reverb, IR_ROOM, IR_HALL, sfx_vibe, sfx_pop, room_tone, drone, nf, write_wav, db
    SR = 48000
    n = int(DUR * SR)
    mix = np.zeros((n + SR, 2))
    for k, v in LINES.items():
        x = CLIPS[k]
        st = reverb(x, IR_ROOM, 0.12) if v["fx"] == "whisper" else reverb(x, IR_HALL, 0.32)
        i = int((v["t"] - 0.06) * SR)
        mix[i:i + len(st)] += st[: len(mix) - i]
    for sig, t0, g in ((sfx_vibe(), BUZZ, -9), (sfx_pop(), BUZZ + 0.05, -12)):
        i = int(t0 * SR); mix[i:i + len(sig)] += np.stack([sig, sig], 1)[: len(mix) - i] * db(g)
    rt = room_tone(n); mix[:n] += np.stack([rt, rt], 1) * db(-8)
    dr = drone(nf("A1"), DUR + 1)[:n]; mix[:n] += np.stack([dr, dr], 1) * db(-24)
    write_wav(path, mix[:n])


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "renders", "ep02", "ep02_corridor_test.mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    wav = out.replace(".mp4", ".wav"); build_audio(wav)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
                           "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", out],
                          stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for buf in pool.imap(frame, range(int(DUR * FPS)), chunksize=4):
            ff.stdin.write(buf)
    ff.stdin.close(); ff.wait()
    print("ok", out)
