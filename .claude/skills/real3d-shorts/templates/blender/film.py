# ПРИМЕР ПОСТАНОВКИ (ролик «Ему стало жарко», 9 шотов) — копируй в <PROJECT>/film.py и переписывай под свой сценарий.
#   blender -b --python film.py -- <PROJECT> [--keys]
# Всё время берётся из <PROJECT>/audio/shots.json (границы фраз по голосу). Шот i = фраза i.
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = Path(argv[0]).resolve()
CFG = json.loads((PROJECT / "project.json").read_text(encoding="utf-8"))
sys.path.insert(0, str(Path(CFG["skill_dir"]) / "scripts" / "blender"))
from kit import core, mats, sets, people, rig as R, face, fx, cam  # noqa: E402

S, TOTAL, _ = core.shots_from_json(PROJECT)
FOREST = Vector((-30, 0, 0))     # вторая локация
XRAY = Vector((30, 0, 0))        # «студия» рентгена
sc = core.reset(CFG.get("fps", 30))

# ───────── 1. Миры ─────────
sets.world("rogland_moonlit_night", 0.05)
sets.fog_box()
sets.ground(flat_patch=(0, 0, 1.2))
sets.shed(origin=(0.6, 3.6, 0))
sets.woodpile((-0.05, -2.15, 0.0), 1.6, 0.45, 0.5, name="FrontLogs")      # передний план шота 1
sets.woodpile((-0.85, 2.75, 0.0), 0.7, 0.5, 0.45, name="SideLogs")        # передний план шота 8
sets.pines(count=16)
sets.forest(FOREST)
sets.night_lights((0, 0, 1.5))

# ───────── 2. Герой ─────────
rg, body = people.human("Hero", age=0.72, weight=0.58, muscle=0.6)
wear = people.outfit_winter(rg, body)
hands = R.ik_hands(rg)
R.cup_hands(rg)

# ───────── 3. Тело: позы, дрожь, переносы ─────────
shiver = lambda f: 1.0 if f <= S[4][0] else max(0.0, 1 - (f - S[4][0]) / 110)
sway = lambda f: 1.6 * math.sin(f / 30 * 2 * math.pi * 0.35) if S[4][0] + 80 < f < S[7][1] else 0.0
R.pose_track(rg, [(1, "cold", 1), (S[4][0] + 60, "still", 40), (S[8][0], "kneel", 90)], TOTAL, shiver, sway)

head = R.bone_rest(rg, "head")
mouth = head + Vector((0, -0.19, -0.19))
side = {"L": Vector((0.3, -0.08, 0.98)), "R": Vector((-0.3, -0.08, 0.98))}
hug = {"L": Vector((0.33, 2.34, 0.68)), "R": Vector((0.53, 2.32, 0.72))}
R.hand_path(hands["L"], R.rub_keys(mouth + Vector((0.04, 0, 0)), 1, S[3][0], 1) +
            [(S[3][0] + 6, Vector((0.24, -0.28, 1.02))), (S[3][0] + 40, Vector((0.27, -0.24, 0.96))),
             (S[4][0] + 40, side["L"]), (S[8][0] - 1, side["L"]), (S[8][0], hug["L"] + Vector((0, 0, 0.1))), (S[8][0] + 90, hug["L"])])
R.hand_path(hands["R"], R.rub_keys(mouth + Vector((-0.04, 0, 0)), 1, S[3][0] + 60, -1) +
            [(S[4][0] + 40, side["R"]), (S[7][0] + 6, side["R"]), (S[7][0] + 26, head + Vector((-0.06, -0.02, 0.17))),
             (S[7][0] + 50, Vector((-0.34, -0.2, 1.05))), (S[7][0] + 80, side["R"]), (S[8][0] - 1, side["R"]),
             (S[8][0], hug["R"] + Vector((0, 0, 0.1))), (S[8][0] + 90, hug["R"])])
movers = [rg, hands["L"], hands["R"], bpy.data.objects["ElbowPole.L"], bpy.data.objects["ElbowPole.R"]]
# шот 4 — в лесу; шот 8 — на коленях у дров (опущен на KNEEL_DROP), подползает
R.relocate(movers, [(S[4][0], FOREST), (S[4][1] + 1, Vector()), (S[8][0], Vector((0.45, 2.2, -R.KNEEL_DROP)))])
R.slide(movers, S[8][0], S[8][0] + 85, Vector((0.45, 2.2, -R.KNEEL_DROP)), Vector((0.45, 2.62, -R.KNEEL_DROP)))

# ───────── 4. Мимика (гиперболизированная) ─────────
face.face_track(rg, [(1, "cold", 1), (S[3][0], "pain", 12), (S[4][0] + 40, "drowsy", 40),
                     (S[5][0], "relief", 30), (S[7][0], "focus", 15), (S[8][0], "pain", 20)],
                TOTAL, chatter=lambda f: 1.0 if f < S[4][0] else 0.0)

# ───────── 5. Реквизит и эффекты ─────────
fx.snow(TOTAL)
fx.breath(rg, 1, S[6][1])
arm, vessels, X = fx.xray_limb(rg, body, "R", XRAY)
fx.xray_animate(vessels, [(S[2][0], 0, 6, 0, 1.0), (S[2][1], 0, 1.2, 30, 0.4), (S[6][0], 0, 1.2, 30, 0.4),
                          (S[6][0] + 40, 0.25, 4, 10, 1.0), (S[6][1], 0.9, 14, -40, 1.35)])
fx.flush_light(head + Vector((0.18, -0.55, 0)), [(1, 0), (S[5][0] + 20, 0), (S[5][1], 6), (S[7][1], 8), (S[8][0], 0)])
# полено (шот 3) и шапка (шот 7) — смотри историю проекта: копия полена с ключами, шапка-статика + скрыть оболочку

# ───────── 6. Камеры (тип движения меняется каждый шот) ─────────
faceP = head + Vector((0, -0.08, -0.02))
ff = core.empty("FocusFace", faceP, 0.02)
ff.parent, ff.parent_type, ff.parent_bone = rg, "BONE", "head"
ff.matrix_world.translation = faceP
C = {}
C[1] = cam.shot_camera("Cam1", cam.move("pull_back_down", S[1][0], S[1][1], faceP, dist=0.75, lens=35), "FocusFace", 2.0, 0.6)
C[2] = cam.shot_camera("Cam2", cam.move("xray_glide", S[2][0], S[2][1], X["fingers"], dist=0.6, lens=45,
                                         extra={"start": X["fingers"], "end": X["shoulder"]}), None, 4.0, 0.3)
C[3] = cam.shot_camera("Cam3", cam.move("low_follow", S[3][0], S[3][1], Vector((0.27, -0.27, 0.95)), dist=1.0, lens=30,
                                         extra={"land": (0.33, -0.22, 0.07)}),
                       [(S[3][0], Vector((0.25, -0.3, 0.98))), (S[3][0] + 52, Vector((0.31, -0.24, 0.1)))], 2.8, 0.8)
C[4] = cam.shot_camera("Cam4", cam.move("orbit", S[4][0], S[4][1], FOREST + Vector((0, 0, 1.2)), dist=2.8, lens=32,
                                         extra={"from": 40, "to": 10}), "FocusFace", 2.4, 0.4)
C[5] = cam.shot_camera("Cam5", cam.move("snap_zoom", S[5][0], S[5][1], faceP, dist=0.7, lens=40, extra={"hit": S[5][0] + 8}),
                       "FocusFace", 1.8, 0.5)
C[6] = cam.shot_camera("Cam6", cam.move("xray_glide", S[6][0], S[6][1], X["shoulder"], dist=0.65, lens=40, side=-1,
                                         extra={"start": X["shoulder"], "end": X["fingers"]}), None, 4.0, 0.3)
C[7] = cam.shot_camera("Cam7", cam.move("low_follow", S[7][0], S[7][1], head + Vector((0, 0, 0.1)), dist=1.5, lens=26,
                                         extra={"land": (0.2, -0.42, 0.05)}),
                       [(S[7][0], faceP), (S[7][0] + 50, faceP), (S[7][0] + 64, Vector((0.2, -0.42, 0.06)))], 2.0, 0.6)
C[8] = cam.shot_camera("Cam8", cam.move("track_side", S[8][0], S[8][1], Vector((0.45, 2.15, 0.6)), dist=1.6, lens=24, side=-1,
                                         extra={"dir": (0, 1, 0), "travel": 0.45}), "FocusFace", 2.8, 0.5)
C[9] = cam.shot_camera("Cam9", cam.move("crane_up", S[9][0], S[9][1], Vector((0.5, 2.6, 0.8)), dist=1.6, lens=32), None, 4.0, 0.3)
cam.bind_markers(S, C)

core.save(PROJECT)
if "--keys" in argv:
    import subprocess
    subprocess.run([bpy.app.binary_path, "-b", str(PROJECT / "scene.blend"), "--python",
                    str(Path(CFG["skill_dir"]) / "scripts" / "blender" / "render.py"), "--", str(PROJECT), "keys"])
print("FILM_OK", TOTAL, "frames")
