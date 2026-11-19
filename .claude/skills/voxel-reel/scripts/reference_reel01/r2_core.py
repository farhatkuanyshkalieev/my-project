"""Reel #1 v2 — core: timing, scene prep, street v2, NPCs, my body/face animation.  exec'd by reel2_build.py"""
import bpy, sys, os, json, math, random
from mathutils import Vector, Matrix, Quaternion, Euler
RP = r"E:\3д Рилсики ЛоуПоли\reel01"; DP = r"D:\3д Рилсики рендер\reel01"
sys.path.insert(0, RP + r"\scripts")
import anim_lib as A, lipsync_lib as L
exec(open(r"E:\3д Рилсики ЛоуПоли\my_avatar\scripts\reference_scene\vx_lib.py", encoding="utf-8").read())
exec(open(RP + r"\scripts\street_v2.py", encoding="utf-8").read())
exec(open(RP + r"\scripts\npc_build.py", encoding="utf-8").read())
exec(open(RP + r"\scripts\face_visemes.py", encoding="utf-8").read())
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
sc = bpy.context.scene; FPS = 30; random.seed(5)
T = json.load(open(RP + r"\audio\timing.json", encoding="utf-8")); env = L.Env(RP + r"\audio\voice_timeline.wav")
WD = T["words"]
def wf(lid, i, end=False): return int(round(WD[lid][i][2 if end else 1] * FPS))
SCN = {s[0][0]: (int(round(s[1] * FPS)), int(round(s[2] * FPS)) - 1) for s in T["scenes"]}
FEND = SCN["8"][1]; FR = range(0, FEND + 1)
EV = []
def ev(kind, f, **kw): EV.append(dict(kind=kind, f=int(f), **kw))
STEP_NUM = {1: wf("C2", 1), 2: wf("C3", 1), 3: wf("C4", 1), 4: wf("C5", 1), 5: wf("C6", 0), 6: wf("C7", 0), 7: wf("C8", 0),
            8: wf("C9", 0), 9: wf("C9", 2), 10: wf("C9", 4), 11: wf("C9", 6), 12: wf("C9", 10)}
STEP_SUBJ = {1: wf("C2", 3), 2: wf("C3", 3), 3: wf("C4", 2), 4: wf("C5", 2), 5: wf("C6", 1), 6: wf("C7", 1), 7: wf("C8", 1),
             8: wf("C9", 1), 9: wf("C9", 3), 10: wf("C9", 5), 11: wf("C9", 7), 12: wf("C9", 11)}
LABELS = ["Claude Code", "Blender", "Персонаж", "Скелет", "Эмоции", "Локация", "Материалы", "Свет", "Камера", "Озвучка", "Анимация", "Рендер"]
for n, f in STEP_NUM.items(): ev("counter", f, n=n)
F_HEADUP = wf("M1", 3) - 4; F_SPREAD = wf("M1", 4) - 3
F_CL_ARR = wf("C1", 0) - 3; F_STOP3 = F_CL_ARR + 6; F_FLASH = SCN["8"][0]; F_S8 = F_FLASH
F_LOC = STEP_SUBJ[6]                                            # "Локация": the Inception sequence starts here
F_FALL0, F_FALL1, F_LAND = F_LOC + 10, F_LOC + 30, F_LOC + 34   # chunks fly (wave) -> I fall -> land on the new street
F_REBUILT = F_LOC + 52
S1, S3 = SCN["1"], SCN["3"]

# ======================= scene prep =======================
rig = bpy.data.objects["VX_Rig"]; crig = bpy.data.objects["CL_Rig"]; pf = bpy.data.objects["PhotoFace"]
swv = bpy.data.objects["Chair_Swivel"]
sc.frame_set(1); bpy.context.view_layer.update()
M_SIT = rig.matrix_world.copy(); SITQ = {pb.name: pb.matrix_basis.to_quaternion() for pb in rig.pose.bones}
SWV0 = swv.matrix_basis.copy(); PIVOT = swv.matrix_world.translation.copy()
for ob in (rig, crig, swv, bpy.data.objects.get("Chair_Tilt")):
    if ob and ob.animation_data: ob.animation_data_clear()
for ob in (rig, crig):
    mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw; ob.rotation_mode = 'XYZ'
    for pb in ob.pose.bones:
        pb.matrix_basis = Matrix.Identity(4); pb.rotation_mode = 'QUATERNION'
        for c in list(pb.constraints): pb.constraints.remove(c)
if pf.data.shape_keys.animation_data: pf.data.shape_keys.animation_data_clear()
for o in crig.children:
    if o.animation_data: o.animation_data_clear()
for n in ("Room_Volume", "Window_Glass"):
    o = bpy.data.objects.get(n)
    if o: o.hide_render = True
fx = bpy.data.collections.get("FX")
if fx: fx.hide_render = True
build_photo_mouth(); talk = build_claude_mouth()
KB = pf.data.shape_keys.key_blocks
# chair turned 3/4 to the room for scene 8
S8_ROT = math.radians(180 - 22)
swv.rotation_euler.z += S8_ROT
M_S8 = Matrix.Translation(PIVOT) @ Matrix.Rotation(S8_ROT, 4, 'Z') @ Matrix.Translation(-PIVOT) @ M_SIT
rig.matrix_world = Matrix.Identity(4); bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); zmin = 1e9
for o in rig.children_recursive:
    if o.type == 'MESH' and not o.hide_render:
        oe = o.evaluated_get(dg)
        for v in oe.bound_box: zmin = min(zmin, (oe.matrix_world @ Vector(v)).z)
FOOT = -zmin; print("FOOT OFFSET", round(FOOT, 3))
# the whole street hangs under one root so the Inception sequence can lower it
ROOT = bpy.data.objects.new("Street_Root", None); sc.collection.objects.link(ROOT)
col = bpy.data.collections.new("Street"); sc.collection.children.link(col)
S = build(col)
for o in list(col.all_objects):
    if o.parent is None and o.name not in ("ST_SkyDome", "ST_Clouds", "ST_Haze") and not o.name.startswith("ST_Far"): o.parent = ROOT
MX = 5.0
def MEP(y=YS): return ST(MX, y, CURB + FOOT)
ME_C = MEP(YS) - Vector((0, 0, FOOT))                           # my feet on the sidewalk (street-root space, z offset applied later)

# ======================= NPCs =======================
NPC_CFG = {
 "NPC_Stroller": dict(kind="stroller", face="woman_stroller", k=1.02, skin="#DCAD96", top="#B84A5A", bottom="#2A2A34", hair="#2A1A12"),
 "NPC_Suit": dict(kind="suit", face="man_suit", k=1.08, skin="#C9917D", top="#1E2230", bottom="#1E2230", hair="#3A2616", shoe="#2A1A10"),
 "NPC_Teen": dict(kind="teen", face="teen", k=0.95, skin="#DFB29D", top="#4A4A8A", bottom="#2E3A4A", hair="#4A2E1A", shoe="#E8E8E8"),
 "NPC_Grandma": dict(kind="grandma", face="grandma", k=0.92, skin="#D6A994", top="#6A4A3A", bottom="#3A3A44", hair="#C8C4C0", shoe="#3A2A1E"),
 "NPC_Scooter": dict(kind="scooter", face="scooter", k=1.04, skin="#CC9982", top="#3A8A5A", bottom="#2A2A2E", hair="#2A1A12", shoe="#F2F2EE"),
 "NPC_Courier": dict(kind="courier", face="courier", k=1.0, skin="#CE997C", top="#E8C020", bottom="#2A2A34", hair="#141414"),
 "NPC_Bg1": dict(kind="bg", k=0.98, skin="#D8A890", top="#8A3A3A", bottom="#3A4A6A", hair="#3A2616"),
 "NPC_Bg2": dict(kind="bg", k=1.03, skin="#C8906F", top="#3A6A8A", bottom="#2A2A2E", hair="#1A1A1A", hairstyle="buzz"),
 "NPC_Bg3": dict(kind="bg", k=0.9, skin="#E0B8A0", top="#D88A3A", bottom="#5A3A6A", hair="#6A3A1A", hairstyle="pony"),
}
ncol = bpy.data.collections.new("NPC"); sc.collection.children.link(ncol); NPC = {}
for n, cfg in NPC_CFG.items():
    NPC[n] = build_npc(n, cfg, ncol, DP + r"\faces"); NPC[n]["rig"].parent = ROOT
# paths: (x, y0, speed m/s, yaw deg)  +y walkers face +y (yaw 0 = facing -y in rig space -> yaw 180 to walk +y)
NPC_PATH = {"NPC_Suit": (6.6, YS + 34, -1.5, 0), "NPC_Stroller": (6.7, YS - 20, 0.75, 180), "NPC_Grandma": (-5.0, YS + 10, -0.5, 0),
            "NPC_Teen": (-6.4, YS - 14, 1.0, 180), "NPC_Courier": (6.9, YS - 36, 1.4, 180), "NPC_Scooter": (-4.6, YS + 70, -3.4, 0),
            "NPC_Bg1": (-5.8, YS + 45, -0.9, 0), "NPC_Bg2": (6.2, YS + 60, -1.0, 0), "NPC_Bg3": (-6.8, YS - 40, 0.85, 180)}
# the two scene-2 close-ups stand still near me: teen (phone) and suit man (briefcase) -> they get a snap head turn
S2_STAND = {"NPC_Teen": (ST(3.85, YS - 3.4, CURB), 205), "NPC_Suit": (ST(6.9, YS + 2.6, CURB), 150)}
def npc_pos(n, f):
    if n in S2_STAND and f < SCN["4"][0] + 40: return S2_STAND[n][0], S2_STAND[n][1], 0.0
    x, y0, v, yaw = NPC_PATH[n]
    if n in S2_STAND:   # they start walking after scene 3
        t = max(0.0, (f - SCN["4"][0] - 40) / FPS); return S2_STAND[n][0] + Vector((0, v * 0.6 * t, 0)), S2_STAND[n][1], abs(v) * 0.6 * (1 if t > 0 else 0)
    return ST(x, y0 + v * f / FPS, CURB), yaw, abs(v)
NPC_FK = {n: A.FK(NPC[n]["rig"]) for n in NPC}
NPC_BONES = ["hips", "spine", "chest", "neck", "head", "upper_arm.L", "forearm.L", "hand.L", "upper_arm.R", "forearm.R", "hand.R", "thigh.L", "shin.L", "foot.L", "thigh.R", "shin.R", "foot.R"]
def npc_spec(n, f, speed, extra):
    kind = NPC[n]["kind"]; sp = {}
    # arms: natural, bent; kind-specific holds
    if kind == "stroller": sp.update({"upper_arm.L": ('aim', (0.1, -0.55, -0.8)), "forearm.L": ('aim', (0.0, -0.9, -0.3)), "upper_arm.R": ('aim', (-0.1, -0.55, -0.8)), "forearm.R": ('aim', (0.0, -0.9, -0.3))})
    elif kind == "grandma": sp.update({"upper_arm.L": ('aim', (0.15, -0.2, -0.95)), "forearm.L": ('aim', (0.05, -0.5, -0.85)), "upper_arm.R": ('aim', (-0.15, 0.2, -0.95)), "forearm.R": ('aim', (-0.05, 0.1, -1))})
    elif kind == "teen": sp.update({"upper_arm.L": ('aim', (0.2, -0.4, -0.9)), "forearm.L": ('aim', (-0.3, -0.7, 0.55)), "upper_arm.R": ('aim', (-0.15, 0.05, -1)), "forearm.R": ('aim', (-0.05, -0.3, -0.95))})
    elif kind == "scooter": sp.update({"upper_arm.L": ('aim', (0.15, -0.6, -0.75)), "forearm.L": ('aim', (0.0, -0.95, -0.2)), "upper_arm.R": ('aim', (-0.15, -0.6, -0.75)), "forearm.R": ('aim', (0.0, -0.95, -0.2))})
    else: sp.update({"upper_arm.L": ('aim', (0.15, 0.05, -1)), "forearm.L": ('aim', (0.08, -0.3, -0.95)), "upper_arm.R": ('aim', (-0.15, 0.05, -1)), "forearm.R": ('aim', (-0.08, -0.3, -0.95))})
    if kind == "suit": sp["upper_arm.R"] = ('aim', (-0.12, 0.02, -1)); sp["forearm.R"] = ('aim', (-0.05, -0.05, -1))
    if kind == "teen": sp["head"] = ('rot', (22, 0, 0))
    if speed > 0 and kind != "scooter":
        hz = 0.9 + speed * 0.35; ph = 2 * math.pi * f / FPS * hz + hash(n) % 7; a = math.radians(14 + 10 * min(1.5, speed)) * math.sin(ph)
        for side, s in (("L", 1), ("R", -1)):
            th = a * s; k = math.radians(8 + 30 * max(0.0, math.cos(ph + (0 if s > 0 else math.pi))))
            sp["thigh." + side] = ('aim', (0, -math.sin(th), -1)); sp["shin." + side] = ('aim', (0, -math.sin(th - k), -math.cos(th - k)))
            if kind in ("bg", "suit", "courier") and not (kind == "suit" and side == "R"):
                sp["upper_arm." + side] = ('aim', A.rot_dir(sp["upper_arm." + side][1], (1, 0, 0), -16 * math.sin(ph) * s))
    if kind == "scooter": sp["thigh.R"] = ('aim', (0, -0.25, -1)); sp["shin.R"] = ('aim', (0, 0.2, -1)); sp["spine"] = ('rot', (6, 0, 0))
    for k, v in extra.items(): A.add_rot(sp, k, v)
    return sp
F_ANIM = STEP_SUBJ[11]
S2_TURN = {"NPC_Teen": SCN["2"][0] + 3, "NPC_Suit": SCN["2"][0] + 15}
def sync_move(f):
    """everybody in the background does the same move on 'Анимация': arms up + hop"""
    return A.ease(min(1, max(0, (f - F_ANIM) / 4))) * (1 - A.ease(min(1, max(0, (f - F_ANIM - 16) / 5))))
for n in NPC:
    rg = NPC[n]["rig"]; prevq = {}
    for f in FR:
        pos, yaw, speed = npc_pos(n, f); k = NPC[n]["k"]
        extra = {}
        if n in S2_TURN and f >= S2_TURN[n]:
            u = min(1, (f - S2_TURN[n]) / 3)
            me = MEP(YS); d = me - pos; want = math.degrees(math.atan2(d.x, -d.y)) - yaw; want = (want + 180) % 360 - 180
            extra["head"] = (-20 * u, want * u, 0)                        # look up at me, brows handled by the tilt
            extra["chest"] = (0, -0.3 * want * u * 0.3, 0)
        sm = sync_move(f)
        if sm > 0: extra["upper_arm.L"] = (0, 0, 0);
        sp = npc_spec(n, f, speed, extra)
        if sm > 0:
            sp["upper_arm.L"] = ('aim', A.blend_specs([(1 - sm, {"a": sp["upper_arm.L"]}), (sm, {"a": ('aim', (0.3, 0, 1))})])["a"][1])
            sp["upper_arm.R"] = ('aim', A.blend_specs([(1 - sm, {"a": sp["upper_arm.R"]}), (sm, {"a": ('aim', (-0.3, 0, 1))})])["a"][1])
            sp["forearm.L"] = ('aim', (0.1, 0, 1)); sp["forearm.R"] = ('aim', (-0.1, 0, 1))
        Q = NPC_FK[n].solve(sp)
        for b in NPC_BONES:
            q = Q[b]
            if b in prevq and prevq[b].dot(q) < 0: q = -q
            prevq[b] = q; pb = rg.pose.bones[b]; pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=f)
        bob = 0.012 * abs(math.sin(2 * math.pi * f / FPS * (0.9 + speed * 0.35) * 2)) * (1 if speed > 0 and NPC[n]["kind"] != "scooter" else 0)
        hop = 0.10 * math.sin(math.pi * min(1, max(0, (f - F_ANIM) / 18))) if F_ANIM <= f <= F_ANIM + 18 else 0
        rg.location = pos + Vector((0, 0, bob + hop)); rg.rotation_euler = (0, 0, math.radians(yaw)); rg.keyframe_insert("location", frame=f); rg.keyframe_insert("rotation_euler", frame=f)
    A.set_interp(rg, 'BEZIER')
    # rolling wheels (stroller / trolley / scooter): spin by travelled distance
    for ob, bone in NPC[n]["props"]:
        if "Wheel" in ob.name or "Scooter" in ob.name or "Trolley" in ob.name: pass
for n in ("NPC_Stroller",):
    for ob, bone in NPC[n]["props"]:
        if "Wheel" in ob.name:
            me = ob.data; c = sum((Vector(v) for v in ob.bound_box), Vector()) / 8
            for v in me.vertices: v.co -= c
            ob.matrix_basis = ob.matrix_basis @ Matrix.Translation(c)
            for f in (0, FEND):
                _, _, v = npc_pos(n, f); ob.rotation_euler = (-(abs(NPC_PATH[n][2]) * f / FPS) / 0.09, 0, 0); ob.keyframe_insert("rotation_euler", frame=f)
            A.set_interp(ob, 'LINEAR')
print("NPC ANIM OK")
# pigeons (3) on the sidewalk, pecking; snap turn to me in scene 2
def pigeon(name):
    bb = BB(); m = gm("pigeon", "#8C929E", 0.8); bk = gm("beak", "#D08A6A", 0.6)
    bb.box((0, 0, 0.12), (0.14, 0.26, 0.13), m); bb.box((0, -0.05, 0.19), (0.12, 0.12, 0.08), gm("pigeon2", "#6A7A8A", 0.8))
    for sx in (-1, 1): bb.box((sx * 0.03, 0, 0.03), (0.02, 0.02, 0.06), bk)
    body = bb.obj(name + "_body", col, bw=0.004)
    bb = BB(); bb.box((0, -0.03, 0.03), (0.08, 0.09, 0.08), m); bb.box((0, -0.09, 0.02), (0.02, 0.04, 0.02), bk)
    for sx in (-1, 1): bb.box((sx * 0.03, -0.045, 0.045), (0.015, 0.012, 0.015), gm("eyeblk", "#101010", 0.5))
    head = bb.obj(name + "_head", col, bw=0.003); head.parent = body; head.location = (0, -0.12, 0.2)
    return body, head
PIG_POS = [ST(5.95, YS - 2.2, CURB), ST(6.25, YS - 1.85, CURB), ST(5.70, YS - 1.55, CURB)]
PIGS = []
for i in range(3):
    b, h = pigeon("Pigeon_%d" % i); b.parent = ROOT; b.location = PIG_POS[i]; b.rotation_euler = (0, 0, math.radians([30, -60, 150][i])); PIGS.append((b, h))
F_PIG = SCN["2"][0] + 27
for i, (b, h) in enumerate(PIGS):
    for f in FR:
        peck = max(0.0, math.sin(2 * math.pi * (f / FPS * 1.3 + i * 0.37))) ** 4
        if f >= F_PIG:
            d = MEP(YS) - PIG_POS[i]; want = math.atan2(d.x, -d.y) - math.radians([30, -60, 150][i]); want = (want + math.pi) % (2 * math.pi) - math.pi
            u = min(1, (f - F_PIG) / 2); h.rotation_euler = (0.9 * peck * (1 - u) - 0.5 * u, 0, -want * u)
        else: h.rotation_euler = (0.9 * peck, 0, 0)
        h.keyframe_insert("rotation_euler", frame=f)
for f in (S2_TURN["NPC_Teen"], S2_TURN["NPC_Suit"], F_PIG): ev("turn", f)
# the car driving by on the far lane during scene 3-4
cd_root, cd_wheels = [c for c in S["cars"] if c[0].name == "ST_CarDrive"][0]
for f in (0, FEND):
    cd_root.location = ST(-(ROAD - 1.8), YS + 160 - 9.0 * f / FPS, 0); cd_root.keyframe_insert("location", frame=f)
    for w in cd_wheels: w.rotation_euler = (-(9.0 * f / FPS) / 0.33, 0, 0); w.keyframe_insert("rotation_euler", frame=f)
A.set_interp(cd_root, 'LINEAR')
for w in cd_wheels: A.set_interp(w, 'LINEAR')

# ======================= my animation =======================
FK = A.FK(rig)
def mir(v): return (-v[0], v[1], v[2])
def arms(uaL, faL, uaR=None, faR=None):
    return {"upper_arm.L": ('aim', uaL), "forearm.L": ('aim', faL), "upper_arm.R": ('aim', uaR or mir(uaL)), "forearm.R": ('aim', faR or mir(faL))}
def body(chest=0, head=(0, 0, 0), neck=0, spine=0):
    return {"spine": ('rot', (spine, 0, 0)), "chest": ('rot', (chest, 0, 0)), "neck": ('rot', (neck, 0, 0)), "head": ('rot', head)}
SITLEGS = {b: ('quat', tuple(SITQ[b])) for b in ("hips", "thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R")}
FING = {}
for b in rig.data.bones:
    if any(s in b.name for s in ("index", "middle", "ring", "pinky")): FING[b.name] = ('rot', (38 if b.name.endswith(("01.L", "01.R")) else 45, 0, 0))
    elif "thumb" in b.name: FING[b.name] = ('rot', (12, 0, 0))
POSE = {   # no T/A pose anywhere: elbows bent, hands near the body
 "IDLE": {**arms((0.14, 0.06, -1), (0.10, -0.42, -0.9)), **body()},
 "PHONE": {**arms((0.18, -0.45, -0.85), (-0.42, -0.72, 0.5), (-0.22, -0.5, -0.8), (0.45, -0.62, 0.55)), **body(5, (26, 0, 0), 6)},
 "SHOUT": {**arms((0.42, -0.38, -0.82), (0.3, -0.72, 0.62)), **body(-8, (-14, 0, 0))},
 "SURPRISE": {**arms((0.4, -0.45, -0.8), (-0.05, -0.85, 0.5)), **body(-5, (-6, 0, 0))},
 "STOP": {**arms((0.3, -0.8, -0.5), (0.05, -0.98, 0.25)), **body(4, (3, 0, 0))},
 "DOOM": {**arms((0.12, 0.1, -1), (0.06, -0.1, -1)), **body(3, (6, 0, 0))},
 "SIT": {**SITLEGS, **arms((0.22, -0.45, -0.85), (0.0, -0.95, -0.25)), **body()},
 "POINT": {"upper_arm.L": ('aim', (0.85, -0.5, -0.1)), "forearm.L": ('aim', (0.9, -0.3, 0.3))},
 "SCRATCH": {"upper_arm.R": ('aim', (-0.6, -0.3, 0.3)), "forearm.R": ('aim', (0.75, -0.3, 0.6))},
 "POCKETS": {**arms((0.12, 0.12, -1), (0.1, -0.3, -0.95))},
 "SHOCK": {**arms((0.42, -0.3, 0.86), (0.25, -0.2, 0.95)), **body(-10, (-20, 0, 0))},
 "LAND": {**arms((0.5, -0.5, -0.6), (0.2, -0.85, 0.3)), **body(12, (6, 0, 0), 0, 10)},
 "GEST_A": {"upper_arm.L": ('aim', (0.35, -0.5, -0.75)), "forearm.L": ('aim', (0.2, -0.95, 0.2))},   # open hand toward the viewer
 "GEST_B": {"upper_arm.R": ('aim', (-0.3, -0.45, -0.8)), "forearm.R": ('aim', (-0.45, -0.75, 0.45))}, # hand to chest
}
W = {
 "PHONE": A.track([(0, 1), (F_HEADUP, 1), (F_HEADUP + 9, 0)]),
 "SHOUT": A.track([(F_HEADUP, 0), (F_SPREAD, 0.55), (F_SPREAD + 8, 1), (wf("M1", 5, True), 1), (S1[1] + 6, 0)]),
 "SURPRISE": A.track([(F_STOP3 - 2, 0), (F_STOP3 + 4, 1), (wf("C1", 2, True) - 5, 0.8), (S3[1] + 8, 0)]),
 "SCRATCH": A.track([(wf("C3", 0) - 6, 0), (wf("C3", 0) + 6, 1), (wf("C3", 3, True), 1), (wf("C3", 3, True) + 10, 0)]),
 "POCKETS": A.track([(wf("C4", 0) - 4, 0), (wf("C4", 0) + 8, 1), (STEP_SUBJ[3] - 6, 1), (STEP_SUBJ[3], 0)]),
 "GEST_A": A.track([(wf("M2", 0) - 4, 0), (wf("M2", 0) + 4, 1), (wf("M2", 2, True), 1), (wf("M2", 2, True) + 10, 0)]),
 "STOP": A.track([(wf("M3", 0) - 6, 0), (wf("M3", 0) + 2, 1), (wf("M3", 1, True) + 4, 1), (SCN["6"][0] + 2, 0)]),
 "SHOCK": A.track([(F_FALL0 - 2, 0), (F_FALL0 + 4, 1), (F_LAND - 2, 1), (F_LAND + 4, 0)]),
 "LAND": A.track([(F_LAND - 1, 0), (F_LAND + 3, 1), (F_LAND + 14, 0)]),
 "DOOM": A.track([(SCN["6"][0], 0), (SCN["6"][0] + 30, 0.6), (wf("M4", 0) - 10, 1), (SCN["7"][1], 1), (SCN["7"][1] + 1, 0)]),
 "SIT": lambda f: 1.0 if f >= F_FLASH else 0.0,
 "POINT": A.track([(wf("M5", 7) - 4, 0), (wf("M5", 7) + 4, 1), (wf("M5", 10, True), 1), (wf("M5", 11, True) + 4, 0)]),
 "GEST_B": A.track([(wf("M5", 0) - 3, 0), (wf("M5", 0) + 4, 1), (wf("M5", 1, True), 1), (wf("M5", 3), 0), (wf("M5", 12) - 3, 0), (wf("M5", 12) + 4, 1), (wf("M5", 15, True), 1), (wf("M5", 16, True) + 6, 0)]),
}
MAIN = ("PHONE", "SHOUT", "SURPRISE", "STOP", "DOOM", "SHOCK", "LAND")
def w_idle(f):
    if f >= F_FLASH: return 0.0
    return max(0.0, 1.0 - sum(W[k](f) for k in MAIN))
WALK = A.track([(0, 1), (F_HEADUP - 2, 1), (F_HEADUP + 10, 0), (S3[0] - 1, 0), (S3[0], 1), (F_STOP3 - 4, 1), (F_STOP3 + 4, 0)])
STEP_ASIDE = A.track([(STEP_NUM[7] - 2, 0), (STEP_NUM[7] + 12, 1)])          # a small step to the side on "Семь"
def walk_phase(f): return 2 * math.pi * f / FPS * 1.0
YPATH = {}; y = 10.0
for f in FR:
    YPATH[f] = y; y -= 0.6 / FPS * WALK(f)
for f in (-1, FEND + 1, FEND + 2): YPATH[f] = YPATH[0] if f < 0 else YPATH[FEND]
YS = YPATH[SCN["4"][0]]
ME_C = MEP(YS) - Vector((0, 0, FOOT))
def fall_z(f):
    """my height during the Inception fall: free fall from the old street to the new one 3 m lower, then a squash landing"""
    if f < F_FALL0: return 0.0
    if f < F_LAND: u = (f - F_FALL0) / (F_LAND - F_FALL0); return -3.0 * u * u
    return -3.0
def sway(f):
    """weight shift + small step during the street dialogue (never a statue)"""
    if f < SCN["4"][0] or f >= F_FLASH: return Vector((0, 0, 0)), 0.0
    t = (f - SCN["4"][0]) / FPS
    return Vector((0.025 * math.sin(2 * math.pi * t / 5.2) + 0.25 * STEP_ASIDE(f), 0.02 * math.sin(2 * math.pi * t / 7.1), 0)), 3.0 * math.sin(2 * math.pi * t / 5.2)
def my_root(f):
    if f >= F_FLASH: return M_S8.translation, M_S8.to_euler()
    wk = WALK(f); bob = 0.012 * abs(math.sin(walk_phase(f))) * wk
    off, _ = sway(f)
    return MEP(YPATH[f]) + Vector((0, 0, bob + fall_z(f))) + off, Euler((0, 0, 0))
# ---- head: look targets (phone, Claude while he talks, camera in the finale), nods, accents, recoils ----
CL_TALK = []
for lid in [k for k in WD if k.startswith("C")]: CL_TALK.append((int(WD[lid][0][1] * FPS) - 6, int(WD[lid][-1][2] * FPS) + 8))
def cl_talking(f): return any(a <= f <= b for a, b in CL_TALK)
LOOK = {}            # frame -> world point (filled by r2_claude / r2_cams); head aims at it with a weight
LOOK_W = {}
SPEECH = {lid: [(w, a, b) for w, a, b in WD[lid]] for lid in WD}
MY_LINES = ["M1", "M2", "M3", "M4", "M5"]
nod_keys = [(0, 0)]
for lid in MY_LINES:
    f = int(SPEECH[lid][0][1] * FPS); fe = int(SPEECH[lid][-1][2] * FPS)
    while f < fe: nod_keys.append((f, random.uniform(-2, 2))); f += random.randint(14, 22)
    nod_keys.append((fe + 8, 0))
NOD = A.track(sorted(nod_keys))
ACC = []
for lid in MY_LINES:
    ph, wl = L.segments(SPEECH[lid], env); ACC += [int(round(L.stress_vowel_time(w, a, b) * FPS)) - 1 for w, a, b, lv in L.stressed(wl)]
OK_NOD = wf("M2", 2)
def bump(f, c, up=3, down=7):
    d = f - c
    if -up <= d <= 0: return A.ease((d + up) / up)
    if 0 < d <= down: return 1 - A.ease(d / down)
    return 0.0
def accent(f): return max([bump(f, c) for c in ACC] + [0.0])
CRASH = [STEP_NUM[n] for n in (8, 9, 10, 11, 12)]
def recoil(f): return max([bump(f, c, 1, 9) for c in CRASH] + [0.0])
def head_to(target_world, f):
    """head yaw/pitch (deg) to look at a world point from the head position"""
    loc, rot = my_root(f); Mw = Matrix.Translation(loc) @ rot.to_matrix().to_4x4()
    hp = Mw @ (rig.data.bones["head"].head_local + Vector((0, 0, 0.19)))
    d = Mw.to_3x3().inverted() @ (target_world - hp)
    yaw = math.degrees(math.atan2(d.x, -d.y)); pitch = -math.degrees(math.atan2(d.z, math.hypot(d.x, d.y)))
    return max(-45, min(45, pitch)), max(-80, min(80, yaw))
def me_spec(f):
    items = [(W[k](f), POSE[k]) for k in W] + [(w_idle(f), POSE["IDLE"])]
    sp = A.blend_specs(items)
    for k, v in FING.items(): sp[k] = v
    wk = WALK(f)
    if wk > 0 and f < F_FLASH:
        ph = walk_phase(f); a = math.radians(25) * math.sin(ph)
        for side, s in (("L", 1), ("R", -1)):
            th = a * s; k = math.radians(8 + 32 * max(0.0, math.cos(ph + (0 if s > 0 else math.pi))))
            sp["thigh." + side] = ('aim', (0, -math.sin(th) * wk, -1)); sp["shin." + side] = ('aim', (0, -math.sin(th - k) * wk, -math.cos(th - k)))
            arm = "upper_arm." + side
            if W["PHONE"](f) < 0.3: sp[arm] = ('aim', A.rot_dir(sp[arm][1], (1, 0, 0), -14 * math.sin(ph) * s * wk))
    sa = STEP_ASIDE(f)
    if 0 < sa < 1 and f < F_FLASH:                                   # the side step: one stride
        ph = math.pi * sa; sp["thigh.L"] = ('aim', (0.35 * math.sin(ph), 0, -1)); sp["shin.L"] = ('aim', (0.1 * math.sin(ph), 0, -1))
    off, hipyaw = sway(f); A.add_rot(sp, "hips", (0, hipyaw, 0)); A.add_rot(sp, "chest", (0, -hipyaw * 0.6, 0))
    pitch, yaw = 0.0, 0.0
    if f in LOOK:
        p_, y_ = head_to(LOOK[f], f); w = LOOK_W.get(f, 1.0); pitch, yaw = p_ * w, y_ * w
    A.add_rot(sp, "head", (NOD(f) + 1.8 * accent(f) + 5 * bump(f, OK_NOD, 4, 8) - 6 * recoil(f) + pitch, yaw, 0))
    A.add_rot(sp, "chest", (-12 * recoil(f), 0, 0))
    return sp
BONES = ["hips", "spine", "chest", "neck", "head", "upper_arm.L", "forearm.L", "hand.L", "upper_arm.R", "forearm.R", "hand.R",
         "thigh.L", "shin.L", "foot.L", "thigh.R", "shin.R", "foot.R"] + list(FING)
def bake_me():
    prevq = {}
    for f in FR:
        Q = FK.solve(me_spec(f))
        for b in BONES:
            q = Q[b]
            if b in prevq and prevq[b].dot(q) < 0: q = -q
            prevq[b] = q; pb = rig.pose.bones[b]; pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=f)
        loc, rot = my_root(f); rig.location = loc; rig.rotation_euler = rot; rig.keyframe_insert("location", frame=f); rig.keyframe_insert("rotation_euler", frame=f)
        sq = 1 - 0.12 * bump(f, F_LAND + 1, 1, 6)
        rig.scale = (1 / math.sqrt(sq), 1 / math.sqrt(sq), sq); rig.keyframe_insert("scale", frame=f)
        rig.pose.bones["head"].location = Vector((0, 0.010 * accent(f), 0)); rig.pose.bones["head"].keyframe_insert("location", frame=f)
    A.set_interp(rig, 'BEZIER')
# ---- phone with a lit, scrolling reels screen; glow on my face ----
bb = BB(); bb.box((0, 0, 0), (0.075, 0.012, 0.15), gm("phonebody", "#1A1A1E", 0.3)); bb.box((0, -0.0065, 0), (0.066, 0.002, 0.138), gm("phonescreen_bg", "#0A0A10", 0.2))
ph_ob = bb.obj("Me_Phone", col, bw=0.003)
PHONEPOS = {}
def bake_phone():
    for f in range(0, SCN["3"][0] + 1):
        sc.frame_set(f); hand = rig.matrix_world @ rig.pose.bones["hand.L"].tail
        ph_ob.location = hand + Vector((0.03, -0.03, 0.05)); ph_ob.rotation_euler = (math.radians(-50), 0, math.radians(12)); PHONEPOS[f] = ph_ob.location.copy()
        ph_ob.keyframe_insert("location", frame=f); ph_ob.keyframe_insert("rotation_euler", frame=f)
    A.set_interp(ph_ob, 'BEZIER')
screen = bpy.data.materials.new("Me_PhoneReels"); screen.use_nodes = True; nt = screen.node_tree; nt.nodes.clear()
o = nt.nodes.new("ShaderNodeOutputMaterial"); e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Strength"].default_value = 6.0
tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
mp.inputs["Scale"].default_value = (1, 3.2, 1)
snap = nt.nodes.new("ShaderNodeVectorMath"); snap.operation = 'SNAP'; snap.inputs[1].default_value = (1, 1, 1); nt.links.new(mp.outputs[0], snap.inputs[0])
wn = nt.nodes.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions = '3D'; nt.links.new(snap.outputs[0], wn.inputs["Vector"])
ramp = nt.nodes.new("ShaderNodeValToRGB")
for i, c in enumerate(("#E8406A", "#3A8AD9", "#F2D060", "#4AA85A", "#C04AD0")):
    el = ramp.color_ramp.elements[0] if i == 0 else (ramp.color_ramp.elements[1] if i == 4 else ramp.color_ramp.elements.new(i / 4)); el.position = i / 4; el.color = (*lin(c), 1)
ramp.color_ramp.interpolation = 'CONSTANT'; nt.links.new(wn.outputs["Color"], ramp.inputs[0])
fr = nt.nodes.new("ShaderNodeVectorMath"); fr.operation = 'FRACTION'; nt.links.new(mp.outputs[0], fr.inputs[0])
sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(fr.outputs[0], sep.inputs[0])
gap = nt.nodes.new("ShaderNodeMath"); gap.operation = 'GREATER_THAN'; gap.inputs[1].default_value = 0.08; nt.links.new(sep.outputs["Y"], gap.inputs[0])
mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.inputs["A"].default_value = (0.02, 0.02, 0.03, 1); nt.links.new(ramp.outputs["Color"], mix.inputs["B"]); nt.links.new(gap.outputs[0], mix.inputs["Factor"])
nt.links.new(mix.outputs["Result"], e.inputs["Color"]); nt.links.new(e.outputs[0], o.inputs["Surface"])
bm = bmesh.new(); vq = [bm.verts.new(Vector((x, -0.0075, z))) for x, z in ((-0.031, -0.066), (0.031, -0.066), (0.031, 0.066), (-0.031, 0.066))]
fc = bm.faces.new(vq); uvl = bm.loops.layers.uv.new("UVMap")
for l, uv in zip(fc.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uvl].uv = uv
me = bpy.data.meshes.new("Me_PhoneScreen"); bm.to_mesh(me); bm.free(); me.materials.append(screen)
scr = bpy.data.objects.new("Me_PhoneScreen", me); col.objects.link(scr); scr.parent = ph_ob
SWIPES = [8, 30, 54]                                              # thumb swipes -> the feed jumps one reel up
for f in (0,) + tuple(x for s_ in SWIPES for x in (s_, s_ + 4)):
    n_ = sum(1 for s_ in SWIPES if f >= s_ + 4) + (0.0 if not any(s_ <= f < s_ + 4 for s_ in SWIPES) else 0.0)
    mp.inputs["Location"].default_value = (0, -n_ * 1.0, 0); mp.inputs["Location"].keyframe_insert("default_value", frame=f)
A.set_interp(screen.node_tree, 'BEZIER')
pl = bpy.data.lights.new("Me_PhoneGlow", 'POINT'); pl.energy = 2.5; pl.color = (0.75, 0.85, 1.0); pl.shadow_soft_size = 0.08
plo = bpy.data.objects.new("Me_PhoneGlow", pl); col.objects.link(plo); plo.parent = ph_ob; plo.location = (0, -0.06, 0.02)
for f, h in ((0, False), (SCN["3"][0], True)):
    for o_ in (ph_ob, scr, plo): o_.hide_render = o_.hide_viewport = h; o_.keyframe_insert("hide_render", frame=f); o_.keyframe_insert("hide_viewport", frame=f)
THUMB = A.track([(0, 0)] + [(s_ - 3, 0) for s_ in SWIPES] + [(s_, 1) for s_ in SWIPES] + [(s_ + 4, 0) for s_ in SWIPES])
POSE["PHONE"]["thumb.01.R"] = ('rot', (20, 0, 0))
# ---- face: emotions, visemes, blinks ----
emo = {
 "Tired": A.track([(0, 0.3), (F_HEADUP, 0.3), (F_HEADUP + 6, 0), (wf("M4", 0) - 14, 0), (wf("M4", 0) - 4, 1), (SCN["6"][1], 1), (SCN["6"][1] + 1, 0),
                   (wf("M5", 0) - 6, 0), (wf("M5", 0) + 2, 0.3), (wf("M5", 1, True), 0.2), (wf("M5", 3, True), 0)]),
 "Angry": A.track([(F_HEADUP, 0), (F_HEADUP + 8, 0.85), (wf("M1", 5, True), 0.85), (S1[1] + 4, 0)]),
 "Surprised": A.track([(F_HEADUP, 0), (F_HEADUP + 8, 0.25), (wf("M1", 5, True), 0.25), (S1[1] + 4, 0), (F_STOP3 - 2, 0), (F_STOP3 + 3, 1), (wf("C1", 2, True), 0.8), (S3[1] + 6, 0),
                       (F_FALL0 - 2, 0), (F_FALL0 + 2, 1), (F_LAND + 6, 1), (F_LAND + 16, 0)]),
 "Smile": A.track([(wf("M2", 0) - 4, 0), (wf("M2", 0) + 3, 0.8), (SCN["4"][1], 0.6), (SCN["5"][0] + 10, 0), (wf("M5", 18) - 4, 0), (wf("M5", 18) + 6, 0.7), (FEND, 0.7)]),
 "Oops": A.track([(wf("M3", 0) - 6, 0), (wf("M3", 0) + 2, 0.9), (wf("M3", 1, True) + 6, 0.9), (SCN["6"][0] + 6, 0.3), (SCN["6"][0] + 20, 0)]),
}
EMO_CYCLE = ["Smile", "Surprised", "Angry", "Tired", "Oops"]; F_EMO = STEP_SUBJ[5]
def emo_val(k, f):
    v = emo[k](f) if k in emo else 0.0
    if F_EMO <= f < F_EMO + 15: v = 1.0 if EMO_CYCLE[(f - F_EMO) // 3] == k else 0.0
    if k == "Surprised": v = max(v, 0.7 * recoil(f))
    return v
blinks = []; t = random.randint(40, 80)
forced = [F_CL_ARR + 6, F_HEADUP + 9, F_STOP3 + 5, wf("M2", 0) + 4, wf("M3", 0) + 3, F_LAND + 4, F_FLASH + 6, wf("M5", 7) + 5, wf("M5", 18) + 6]
while t < FEND - 5:
    if all(abs(t - b) > 30 for b in forced): blinks.append(t)
    t += random.randint(60, 120)
blinks = sorted(b for b in blinks + forced if not (F_EMO - 3 <= b <= F_EMO + 16))
def blink(f):
    v = 0.0
    for b in blinks:
        d = f - b
        if 0 <= d <= 2: v = max(v, (0.85, 1.0, 0.45)[d])
    return v
for f in FR:
    for k in ("Tired", "Angry", "Surprised", "Smile", "Oops"): KB[k].value = emo_val(k, f); KB[k].keyframe_insert("value", frame=f)
    KB["Blink"].value = blink(f); KB["Blink"].keyframe_insert("value", frame=f)
VIS = ["V_A", "V_O", "V_E", "V_REST", "V_MBP", "V_FV"]
for k in VIS: KB[k].value = 0.0; KB[k].keyframe_insert("value", frame=0)
def vis_val(cls, lv): return min(1.1, max(0.6, 0.45 + 0.55 * lv)) if cls in ("A", "O", "E") else 1.0
for lid in MY_LINES:
    ph, wl = L.segments(SPEECH[lid], env); evs = L.frames(ph, SPEECH[lid])
    for k in VIS: KB[k].value = 0.0; KB[k].keyframe_insert("value", frame=evs[0][0] - 3)
    for i, (f, cls, lv) in enumerate(evs):
        nxt = evs[i + 1][0] if i + 1 < len(evs) else f + 8
        for k in VIS:
            KB[k].value = vis_val(cls, lv) if k == "V_" + cls else 0.0; KB[k].keyframe_insert("value", frame=f)
            if nxt - f >= 5: KB[k].keyframe_insert("value", frame=nxt - 2)
A.set_interp(pf.data.shape_keys, 'BEZIER')
print("CORE OK", "frames", FEND + 1)
