"""Reel #1, stage 2: lip-sync test. Heads only, C10 (Claude) + M5 (me), reel frame numbers, 540x960 split screen.
blender -b Template_Room.blend --python lipsync_test.py -- [render]"""
import bpy, sys, os, json, math, random
from mathutils import Vector, Matrix, Quaternion, Euler
R = r"E:\3д Рилсики ЛоуПоли\reel01"
sys.path.insert(0, R + r"\scripts")
import lipsync_lib as L
exec(open(R + r"\scripts\face_visemes.py", encoding="utf-8").read())
exec(open(r"E:\3д Рилсики ЛоуПоли\my_avatar\scripts\reference_scene\eevee_presets.py", encoding="utf-8").read())
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
sc = bpy.context.scene; FPS = 30; random.seed(7)
T = json.load(open(R + r"\audio\timing.json", encoding="utf-8"))
env = L.Env(R + r"\audio\voice_timeline.wav")
sched = {s[0]: (s[1], s[2]) for s in T["scenes"]}
W_C10, W_M5 = T["words"]["C10"], T["words"]["M5"]
F0 = int(round(sched["7 ПАУЗА"][0] * FPS)); F1 = int(round((W_M5[-1][2] + 0.6) * FPS))

rig = bpy.data.objects["VX_Rig"]; crig = bpy.data.objects["CL_Rig"]; pf = bpy.data.objects["PhotoFace"]
# ---------------- static poses from the approved animation (me: frame 100, Claude: frame 200) ----------------
def snapshot(ob, f):
    sc.frame_set(f); bpy.context.view_layer.update()
    return ob.matrix_basis.copy(), {pb.name: pb.matrix_basis.copy() for pb in ob.pose.bones}
ME_FRAME = int([a for a in argv if a.startswith("me=")][0][3:]) if any(a.startswith("me=") for a in argv) else 200
snap_me = snapshot(rig, ME_FRAME); chairs = {}
for n in ("Chair_Swivel", "Chair_Tilt"):
    o = bpy.data.objects.get(n)
    if o: chairs[n] = o.matrix_basis.copy()
snap_cl = snapshot(crig, 200)
for ob, (mb, bones) in ((rig, snap_me), (crig, snap_cl)):
    ob.animation_data_clear(); ob.matrix_basis = mb
    for pb in ob.pose.bones: pb.matrix_basis = bones[pb.name]
for n, mb in chairs.items():
    o = bpy.data.objects[n]; o.animation_data_clear(); o.matrix_basis = mb
if pf.data.shape_keys.animation_data: pf.data.shape_keys.animation_data_clear()
for kb in pf.data.shape_keys.key_blocks: kb.value = 0.0
for o in crig.children:
    if o.type == 'MESH' and o.animation_data: o.animation_data_clear()
for c in bpy.data.collections:
    if c.name.startswith("CL_Face_"):
        for o in c.objects:
            v = c.name == "CL_Face_Neutral"; o.hide_render = not v; o.hide_viewport = not v

build_photo_mouth(); talk = build_claude_mouth()
KB = pf.data.shape_keys.key_blocks
VIS = ["V_A", "V_O", "V_E", "V_REST", "V_MBP", "V_FV"]

def bake(target, path, fn, frames, index=-1):
    """per-frame Bezier keys (auto-clamped) of an eased track — never Linear"""
    for f in frames:
        v = fn(f)
        if index >= 0: getattr(target, path)[index] = v; target.keyframe_insert(path, index=index, frame=f)
        else: setattr(target, path, v); target.keyframe_insert(path, frame=f)

def ease(t): return t * t * (3 - 2 * t)
def track(keys):
    keys = sorted(keys)
    def f(x):
        if x <= keys[0][0]: return keys[0][1]
        for (a, va), (b, vb) in zip(keys, keys[1:]):
            if a <= x <= b: return va + (vb - va) * ease((x - a) / (b - a)) if b > a else vb
        return keys[-1][1]
    return f

# ---------------- my mouth: visemes keyed on events, held, smooth transitions ----------------
ph, wl = L.segments(W_M5, env); ev = L.frames(ph, W_M5)
def vis_val(cls, lv):
    if cls in ("A", "O", "E"): return min(1.1, max(0.6, 0.45 + 0.55 * lv))
    return 1.0
for i, (f, cls, lv) in enumerate(ev):
    nxt = ev[i + 1][0] if i + 1 < len(ev) else f + 8
    for k in VIS:
        KB[k].value = vis_val(cls, lv) if k == "V_" + cls else 0.0
        KB[k].keyframe_insert("value", frame=f)
        if nxt - f >= 5: KB[k].keyframe_insert("value", frame=nxt - 2)
for k in VIS:
    KB[k].value = 0.0; KB[k].keyframe_insert("value", frame=F0); KB[k].keyframe_insert("value", frame=ev[0][0] - 3)
# ---------------- my emotions: weary "Короче." -> smile from "мы с Клодом" ----------------
wd = {w: (a, b) for w, a, b in W_M5}
t_kor = int(W_M5[0][1] * FPS); t_my = int([a for w, a, b in W_M5 if w.startswith("мы")][0] * FPS)
TIRED = track([(F0, 0), (t_kor - 8, 0), (t_kor, 0.35), (t_kor + 20, 0.3), (t_kor + 34, 0), (F1, 0)])
SMILE = track([(F0, 0), (t_my - 6, 0), (t_my + 6, 0.55), (F1 - 10, 0.6), (F1, 0.6)])
FR = range(F0, F1 + 1)
bake(KB["Tired"], "value", TIRED, FR); bake(KB["Smile"], "value", SMILE, FR)
# ---------------- blinks: every 2-4 s at random + on each emotion change ----------------
bl = [t_kor - 2, t_my - 4]; t = F0 + random.randint(20, 60)
while t < F1 - 6:
    if all(abs(t - b) > 25 for b in bl): bl.append(t)
    t += random.randint(60, 120)
def BLINK(f):
    v = 0.0
    for b in bl:
        d = f - b
        if 0 <= d <= 2: v = max(v, (0.85, 1.0, 0.45)[d])   # 3-frame blink
    return v
bake(KB["Blink"], "value", BLINK, FR)
# ---------------- head life while speaking: nods +-2 deg, accents (dip + 1 cm hop) on stressed words ----------------
ph_all = W_M5
nod_keys = [(F0, 0)]; f = int(W_M5[0][1] * FPS)
while f < int(W_M5[-1][2] * FPS):
    nod_keys.append((f, random.uniform(-2.0, 2.0))); f += random.randint(14, 22)
nod_keys += [(int(W_M5[-1][2] * FPS) + 8, 0), (F1, 0)]
NOD = track(nod_keys)
acc = [int(round(L.stress_vowel_time(w, a, b) * FPS)) - 1 for w, a, b, lv in L.stressed(wl)]
def bump(f, c, up, down):
    d = f - c
    if -up <= d <= 0: return ease((d + up) / up)
    if 0 < d <= down: return 1 - ease(d / down)
    return 0.0
def ACC(f): return max([bump(f, c, 3, 7) for c in acc] + [0.0])
YAW = track([(F0, 0), (t_kor - 6, 0), (t_kor + 4, -3), (t_my, -1), (t_my + 10, 2.5), (F1, 1.5)])
ph_ = rig.pose.bones["head"]; ph_.rotation_mode = 'QUATERNION'
q0 = snap_me[1]["head"].to_quaternion(); l0 = snap_me[1]["head"].to_translation()
rs = rig.matrix_world.to_scale()[0]
for f in FR:
    pitch = math.radians(NOD(f) + 1.8 * ACC(f)); yaw = math.radians(YAW(f))
    ph_.rotation_quaternion = q0 @ Euler((pitch, yaw, 0), 'XYZ').to_quaternion()
    ph_.location = l0 + Vector((0, 0.010 * ACC(f) / rs, 0))
    ph_.keyframe_insert("rotation_quaternion", frame=f); ph_.keyframe_insert("location", frame=f)

# ---------------- Claude: stepped pixel mouth, eye pulses on stressed syllables, gentle hover ----------------
cph, cwl = L.segments(W_C10, env); cev = L.frames(cph, W_C10)
mouths = {}
for o in talk.objects: mouths.setdefault(o["viseme"], []).append(o)
def show(cls, f):
    for v, obs in mouths.items():
        for o in obs:
            o.hide_render = o.hide_viewport = (v != cls)
            o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
show("X", F0)
for f, cls, lv in cev: show(cls, f)
eye = bpy.data.materials["CL_Eye_Talk"]; gi = [n for n in eye.node_tree.nodes if n.type == 'GROUP'][0].inputs["Color"]
c0 = tuple(gi.default_value)
def eyecol(k): return (c0[0] * k, c0[1] * k, c0[2] * k, 1)
gi.default_value = eyecol(1); gi.keyframe_insert("default_value", frame=F0)
for w, a, b, lv in L.stressed(cwl, 0.5):
    tv = int(round(L.stress_vowel_time(w, a, b) * FPS)) - 1
    gi.default_value = eyecol(5); gi.keyframe_insert("default_value", frame=tv)
    gi.default_value = eyecol(1); gi.keyframe_insert("default_value", frame=tv + 3)
crig_mb = crig.matrix_basis.copy()
HOV = lambda f: 0.008 * math.sin(2 * math.pi * (f - F0) / 52)
for f in FR:
    crig.location = crig_mb.translation + Vector((0, 0, HOV(f))); crig.keyframe_insert("location", frame=f)
# robotic steps for every Claude face channel
for idb in [eye.node_tree] + [o for obs in mouths.values() for o in obs]:
    ad = idb.animation_data
    if not ad or not ad.action: continue
    for lay in ad.action.layers:
        for st in lay.strips:
            for cb in st.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'
# my channels: Bezier, auto-clamped
for idb in (rig, pf.data.shape_keys):
    ad = idb.animation_data
    for lay in ad.action.layers:
        for st in lay.strips:
            for cb in st.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
                    fc.update()

# ---------------- cameras: one per head ----------------
sc.frame_set(F0); bpy.context.view_layer.update()
def cam(name, center, normal, up, dist, lens):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36; cd.clip_start = 0.05
    co = bpy.data.objects.new(name, cd); sc.collection.objects.link(co)
    co.location = center + normal * dist
    co.rotation_euler = (center - co.location).to_track_quat('-Z', 'Y').to_euler()
    return co
R3 = pf.matrix_world.to_3x3().normalized()
c_me = pf.matrix_world @ Vector((0, YF, 0.985)); n_me = (R3 @ Vector((0, -1, 0))).normalized(); up_me = (R3 @ Vector((0, 0, 1))).normalized()
YAWC = float([a for a in argv if a.startswith("yaw=")][0][4:]) if any(a.startswith("yaw=") for a in argv) else 0.0
n_me = Quaternion(up_me, math.radians(YAWC)) @ n_me
cam_me = cam("Cam_LS_Me", c_me, (n_me + up_me * 0.06).normalized(), up_me, 0.80, 50)
eyes = list(bpy.data.collections["CL_Face_Neutral"].objects)
e_mid = (eyes[0].matrix_world.translation + eyes[1].matrix_world.translation) / 2
Re = eyes[0].matrix_world.to_3x3().normalized(); n_cl = (Re @ Vector((0, -1, 0))).normalized(); up_cl = (Re @ Vector((0, 0, 1))).normalized()
c_cl = e_mid - up_cl * 0.05
cam_cl = cam("Cam_LS_CL", c_cl, (n_cl + up_cl * 0.08).normalized(), up_cl, 0.48, 50)
def kin(root):
    out = set(); st = [root]
    while st:
        o = st.pop(); out.add(o); st += list(o.children)
    return out
KEEP_ME = kin(rig) | {bpy.data.objects.get(n) for n in ("Headphones", "Hair")}; KEEP_CL = kin(crig)
def clear_view(co, center, n, up, keep, rx, rz):
    """hide from THIS camera only (visible_camera) whatever sits between it and the head; light and shadows unchanged"""
    side = n.cross(up).normalized(); hid = []
    dg = bpy.context.evaluated_depsgraph_get()
    for a in (-1, -0.5, 0, 0.5, 1):
        for b in (-1, -0.5, 0, 0.5, 1):
            p = center + side * a * rx + up * b * rz + n * 0.03
            for _ in range(12):
                d = co.location - p; L_ = d.length
                ok, loc, nrm, idx, ob, mw = sc.ray_cast(dg, p, d.normalized(), distance=L_)
                if not ok: break
                orig = ob.original if hasattr(ob, "original") else ob
                if orig not in keep and orig.visible_camera and orig.name not in ("Room_Volume", "Lamp_Shade") and orig.type == 'MESH':
                    orig.visible_camera = False; hid.append(orig)
                p = loc + d.normalized() * 0.002
    return hid
print("CAMS me", tuple(round(x, 2) for x in cam_me.location), "cl", tuple(round(x, 2) for x in cam_cl.location))

apply_preset("FAST")
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 540, 480, 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'
sc.frame_start, sc.frame_end = F0, F1
bpy.ops.wm.save_as_mainfile(filepath=R + r"\lipsync_test.blend")
print("LS FRAMES", F0, F1, "me events", len(ev), "claude events", len(cev), "accents", len(acc), "blinks", sorted(bl))
VIEW = {"me": (cam_me, c_me, n_me, up_me, KEEP_ME, 0.24, 0.24), "cl": (cam_cl, c_cl, n_cl, up_cl, KEEP_CL, 0.2, 0.17)}
def pass_for(nm):
    co, c, n, u, keep, rx, rz = VIEW[nm]; sc.camera = co
    hid = clear_view(co, c, n, u, keep, rx, rz); print("HIDDEN for", nm, [o.name for o in hid]); return hid
def restore(hid):
    for o in hid: o.visible_camera = True
if "render" in argv:
    for nm in ("me", "cl"):
        hid = pass_for(nm); sc.render.filepath = R + r"\lipsync_test\%s_" % nm
        bpy.ops.render.render(animation=True); restore(hid)
elif "stills" in argv:
    fl = [int(x) for x in argv[argv.index("stills") + 1].split(",")]
    for nm in ("me", "cl"):
        hid = pass_for(nm)
        for f in fl:
            sc.frame_set(f); sc.render.filepath = R + r"\lipsync_test\still_%s_%04d.png" % (nm, f)
            bpy.ops.render.render(write_still=True)
        restore(hid)
print("LS DONE")
