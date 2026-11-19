"""Reel #1 v2 — Claude: no legs, constant brand colour, flies around me on every explanation, robotic moves,
stepped turns, pixel mouth + indicator eyes.  exec'd after r2_core."""
# ---- look: one colour everywhere (self-lit so sun/shade/room do not shift it), no legs ----
for o in crig.children_recursive:
    if o.name.startswith("Claude_Leg"): o.hide_render = True; o.hide_viewport = True
clb = bpy.data.materials["CL_Body"]
for n in clb.node_tree.nodes:
    if n.type == 'GROUP':
        n.inputs["Color"].default_value = (*lin("#D97757"), 1); n.inputs["Emission"].default_value = 0.8; n.inputs["Roughness"].default_value = 0.65
clb.diffuse_color = (*lin("#D97757"), 1)
li = bpy.data.objects.get("Light_Claude_Inner")
if li: li.data.energy = 1.2
CL_SIDE = Vector((0.78, -0.05, 1.22))
def GZ(f): return fall_z(f)                                     # global z offset after the Inception fall
def cl_head_s8(): return M_S8 @ (rig.data.bones["head"].head_local + Vector((0, 0, 0.2)))
CL_S8 = cl_head_s8() + Vector((0.62, -0.10, -0.10))
F_IN0 = F_CL_ARR - 16
# ---- waypoints (relative to my feet ME_C): (frame_start, frame_end, target, arc_height) ; circles separately ----
WP = [
 (F_IN0, F_CL_ARR, Vector((0.78, -0.05, 1.22)), 0.5),
 (STEP_SUBJ[1] - 8, STEP_SUBJ[1], Vector((1.05, -0.75, 1.65)), 0.2),                    # Claude Code: front-right, high
 (STEP_SUBJ[2] - 10, STEP_SUBJ[2] + 2, Vector((-1.05, -0.55, 1.75)), 0.7),              # Blender: over my head to the left
 (wf("M2", 0) - 8, wf("M2", 0), Vector((0.25, -1.0, 1.3)), 0.2),                        # "О, ну норм": in front of me
 (STEP_SUBJ[4] - 8, STEP_SUBJ[4] - 1, Vector((0.05, -0.85, 0.85)), 0.15),               # Скелет: in front of the chest
 (STEP_SUBJ[5] - 8, STEP_SUBJ[5] - 1, Vector((-0.75, -0.55, 1.35)), 0.3),               # Эмоции: close to my face
 (F_LOC - 6, F_LOC + 4, Vector((0.6, -0.7, 4.2)), 0.0),                                 # Локация: up high, conducting
 (F_LAND + 4, F_LAND + 16, Vector((0.9, -0.45, 1.5)), 0.6),                             # lands after me
 (STEP_SUBJ[7] - 6, STEP_SUBJ[7], Vector((1.7, -1.6, 2.0)), 0.3),                       # Материалы: sweep along the facade
 (STEP_SUBJ[7], wf("C8", 2, True), Vector((1.7, 2.4, 2.5)), 0.0),
 (wf("M3", 0) - 10, wf("M3", 0) - 2, Vector((0.3, -1.05, 1.3)), 0.4),                   # Подожди: in front
 (wf("M4", 0) - 6, wf("M4", 0), Vector((0.1, -1.15, 1.4)), 0.2),                        # "...я просто хотел рилс"
 (SCN["7"][0] - 4, SCN["7"][0] + 2, Vector((0.2, -1.25, 1.35)), 0.1),
]
CIRC = [  # (f0, f1, radius, z0, z_amp, revolutions, start_deg)
 (STEP_SUBJ[3] - 4, STEP_SUBJ[3] + 28, 0.95, 1.15, 0.25, 1.0, -100),      # scan: one full orbit around me
 (SCN["6"][0], wf("M4", 0) - 8, 1.35, 1.3, 0.3, 7.0, -90),                # overload: faster and faster (angle ~ t^2)
]
def cl_pos(f):
    if f >= F_S8: base = CL_S8
    else:
        base = None
        for f0, f1, r, z0, za, rev, a0 in CIRC:
            if f0 <= f <= f1:
                u = (f - f0) / (f1 - f0); ang = math.radians(a0) + 2 * math.pi * rev * (u * u if rev > 2 else u)
                base = ME_C + Vector((r * math.cos(ang), r * math.sin(ang), z0 + za * math.sin(ang * 1.5)))
        if base is None:
            cur = ME_C + Vector((6.0, -2.0, 2.6)); prev_t = None
            for f0, f1, tgt, arc in WP:
                tw = ME_C + tgt
                if f >= f1: cur = tw; prev_t = tw
                elif f >= f0:
                    u = (f - f0) / max(1, f1 - f0); u = u * u * u * (u * (6 * u - 15) + 10)
                    ov = 1 + 0.05 * math.sin(math.pi * min(1, u * 1.15)) * (1 if u > 0.85 else 0)
                    cur = cur.lerp(tw, min(1.04, u * ov)) + Vector((0, 0, arc * math.sin(math.pi * u))); break
            base = cur
        # excursions inside the overload circle: to the sun on "свет", to the tripod on "камера"
        rad = base - ME_C; rad.z = 0; rad = rad.normalized() if rad.length > 0.1 else Vector((1, 0, 0))
        base = base + (rad * 1.0 + Vector((0, 0, 2.8))) * bump(f, STEP_SUBJ[8] + 5, 5, 7)
        tp = ME_C + Vector((-1.45, -0.9, 1.4)); base = base + (tp - base) * bump(f, STEP_SUBJ[9] + 5, 5, 7)
        base = base + Vector((0, 0, GZ(f) if f >= F_LAND else 0))
    hover = 0.008 * math.sin(2 * math.pi * f / 52)
    return base + Vector((0, 0, hover))
POS = {f: cl_pos(f) for f in range(-2, FEND + 3)}
def cl_face_dir(f):
    """where Claude faces: the direction of flight when moving, otherwise me (or the camera in scenes 7-8)"""
    v = (POS[f + 1] - POS[f - 1]) * FPS / 2
    if f >= SCN["7"][0] or f >= F_S8: return None, 0.0        # the camera (r2_cams sets it)
    if v.length > 0.9: return Vector((v.x, v.y, 0)), min(28, v.length * 6)
    me = (MEP(YPATH[f]) if f < F_FLASH else M_S8.translation) + Vector((0, 0, 1.05 + GZ(f)))
    d = me - POS[f]; return Vector((d.x, d.y, 0)), 0.0
def yaw_of(d): return math.degrees(math.atan2(d.x, -d.y))
CL_YAW = {}; CL_PITCH = {}; cur_yaw = -20.0
CAM_FACE = {}      # frame -> world point to face (filled by r2_cams for scenes 7/8 before baking)
def bake_claude():
    global cur_yaw
    for f in FR:
        d, tilt = cl_face_dir(f)
        if d is None: d = CAM_FACE.get(f, Vector((0, -1, 0)))
        want = yaw_of(d) if d.length > 1e-4 else cur_yaw
        # stepped turn: 15-degree steps, one step every 2 frames
        diff = (want - cur_yaw + 180) % 360 - 180
        if abs(diff) > 7.5 and f % 2 == 0: cur_yaw += math.copysign(min(abs(diff), 15.0 * (2 if abs(diff) > 60 else 1)), diff)
        CL_YAW[f] = cur_yaw; CL_PITCH[f] = tilt
        crig.location = POS[f]; crig.keyframe_insert("location", frame=f)
        nod = 12 if any(0 <= f - c < 4 for c in NOD_C) else 0
        crig.rotation_euler = (math.radians(tilt + nod), 0, math.radians(cur_yaw)); crig.keyframe_insert("rotation_euler", frame=f)
    A.set_interp(crig, 'CONSTANT', lambda p: p == "rotation_euler"); A.set_interp(crig, 'BEZIER', lambda p: p == "location")
NOD_C = [wf("C11", i) for i in (0, 1, 3)]
for f0, f1, tgt, arc in WP: ev("servo", f0, dur=f1 - f0)
for f0, f1, r, z0, za, rev, a0 in CIRC: ev("servo", f0, dur=min(30, f1 - f0))
for c in NOD_C: ev("servo", c, dur=4)
# ---- eyes: indicator blinks (loading on arrival / thinking / the pause), neutral otherwise ----
neut = list(bpy.data.collections["CL_Face_Neutral"].objects); blk = list(bpy.data.collections["CL_Face_Blink"].objects)
CL_BLINKS = [F_CL_ARR + 6, F_CL_ARR + 10, F_CL_ARR + 14, wf("C2", 0) - 8, wf("C5", 0) - 6, STEP_SUBJ[4] + 2, STEP_SUBJ[4] + 6, SCN["7"][0] + 4, SCN["7"][0] + 9, SCN["7"][0] + 14,
             wf("C11", 0) - 10, SCN["8"][1] - 30] + [F_IN0 + k for k in range(0, 16, 4)]
def cl_blink(f): return any(0 <= f - b < 2 for b in CL_BLINKS)
for o in neut + blk:
    if o.animation_data: o.animation_data_clear()
last = None
for f in FR:
    b = cl_blink(f)
    if b == last: continue
    for o in neut: o.hide_render = o.hide_viewport = b; o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
    for o in blk: o.hide_render = o.hide_viewport = not b; o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
    last = b
for b in CL_BLINKS: ev("beep", b)
mouths = {}
for o in talk.objects: mouths.setdefault(o["viseme"], []).append(o)
def show(cls, f):
    for v, obs in mouths.items():
        for o in obs: o.hide_render = o.hide_viewport = (v != cls); o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
show("X", 0)
eye = bpy.data.materials["CL_Eye_Talk"]; gi = [n for n in eye.node_tree.nodes if n.type == 'GROUP'][0].inputs["Color"]
c0 = tuple(gi.default_value); dc0 = tuple(eye.diffuse_color)
def eyecol(k): gi.default_value = (c0[0] * k, c0[1] * k, c0[2] * k, 1); eye.diffuse_color = (min(1, dc0[0] * k), min(1, dc0[1] * k), min(1, dc0[2] * k), 1)
def eyekey(f): gi.keyframe_insert("default_value", frame=f); eye.keyframe_insert("diffuse_color", frame=f)
eyecol(1); eyekey(0)
for lid in [k for k in WD if k.startswith("C")]:
    ph, wl = L.segments(SPEECH[lid], env)
    for f, cls, lv in L.frames(ph, SPEECH[lid]): show(cls, f)
    for w, a, b, lv in L.stressed(wl, 0.4):
        tv = int(round(L.stress_vowel_time(w, a, b) * FPS)) - 1; eyecol(5); eyekey(tv); eyecol(1); eyekey(tv + 3)
for f in (STEP_SUBJ[4], STEP_SUBJ[4] + 12):   # "shines" on the skeleton
    eyecol(8 if f == STEP_SUBJ[4] else 1); eyekey(f)
for o in [o for obs in mouths.values() for o in obs]: A.set_interp(o, 'CONSTANT')
A.set_interp(eye.node_tree, 'CONSTANT'); A.set_interp(eye, 'CONSTANT')
print("CLAUDE OK")
