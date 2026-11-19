"""Reel #1 v2 — ending: a voxel paper plane flies out of Claude on "телеграм-канале", the handle @snickopros assembles from
flying voxels (Telegram blue, glowing) above our heads, and in the last 1.5 s a hologram SKILL card pops up in the foreground.
exec'd after bake_cams (needs CAMPOS)."""
endc = bpy.data.collections.new("FX_End"); sc.collection.children.link(endc)
F_TG = wf("M5", 24) - 2                    # "телеграм-канале"
F_CARD = wf("C11", 4, True) + 2            # after "Один промпт." -> the last ~1.4 s
# ---- 5x7 pixel font for the handle ----
FONT5 = {
 "@": ["01110", "10001", "10111", "10101", "10111", "10000", "01110"],
 "s": ["00000", "01111", "10000", "01110", "00001", "11110", "00000"],
 "n": ["00000", "10110", "11001", "10001", "10001", "10001", "00000"],
 "i": ["00100", "00000", "01100", "00100", "00100", "01110", "00000"],
 "c": ["00000", "01110", "10001", "10000", "10001", "01110", "00000"],
 "k": ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
 "o": ["00000", "01110", "10001", "10001", "10001", "01110", "00000"],
 "p": ["00000", "11110", "10001", "10001", "11110", "10000", "10000"],
 "r": ["00000", "10110", "11001", "10000", "10000", "10000", "00000"],
}
TG_BLUE = vmat("FX_TgBlue", "#1E9BE0", 0.35, emis=1.8); TG_WHITE = vmat("FX_TgWhite", "#FFFFFF", 0.4, emis=3.0)
V = 0.0155; TEXT = "@snickopros"
# the camera of scene 8 looks at MID along -fwd; build the sign in a camera-facing frame above the heads
cam8 = [s_ for s_ in SHOTS if s_["name"] == "Cam_S8"][0]
def cam_frame(f):
    cp = cam8["pos"](f); look = (MID - cp).normalized(); right = look.cross(Vector((0, 0, 1))).normalized(); up = right.cross(look).normalized()
    return cp, look, right, up
cp0, look0, right0, up0 = cam_frame(F_TG + 30)
SIGN_C = MID + Vector((0, 0, 0.44)) - look0 * 0.12          # above both heads, slightly toward the camera
cols = sum(len(FONT5[ch][0]) + 1 for ch in TEXT) - 1; W_sign = cols * V
voxels = []   # (final world position, material, letter index)
x = -W_sign / 2
for li, ch in enumerate(TEXT):
    rows = FONT5[ch]
    for r_, row in enumerate(rows):
        for c_, bit in enumerate(row):
            if bit == "1":
                p = SIGN_C + right0 * (x + c_ * V + V / 2) + up0 * ((3 - r_) * V)
                voxels.append((p, TG_WHITE if ch == "@" else TG_BLUE, li))
    x += (len(rows[0]) + 1) * V
# one object per letter (so each can fly in), voxels as blocks
rv = random.Random(31); letters = []
for li, ch in enumerate(TEXT):
    bb = BB(); pts = [(p, m) for p, m, l in voxels if l == li]
    cen = sum((p for p, m in pts), Vector()) / len(pts)
    for p, m in pts: bb.box(p - cen, (V * 0.92, V * 0.92, V * 0.92), m)
    ob = bb.obj("FX_Tg_%02d" % li, endc, bw=0.003); letters.append((ob, cen))
# paper plane (voxel) flies from Claude to the sign, then the letters snap in one by one
bb = BB(); PL = vmat("FX_Plane", "#DDF2FF", 0.3, emis=2.0)
for r_, row in enumerate(["0000001", "0000111", "0011111", "1111111", "0011101", "0000110", "0000100"]):
    for c_, bit in enumerate(row):
        if bit == "1": bb.box(((c_ - 3) * 0.02, 0, (3 - r_) * 0.02), (0.019, 0.012, 0.019), PL)
plane = bb.obj("FX_TgPlane", endc, bw=0.002)
def key_vis(ob, f, vis):
    ob.hide_render = ob.hide_viewport = not vis; ob.keyframe_insert("hide_render", frame=f); ob.keyframe_insert("hide_viewport", frame=f)
F_PL0, F_PL1 = F_TG - 6, F_TG + 10
key_vis(plane, 0, False); key_vis(plane, F_PL0, True); key_vis(plane, F_PL1 + 16, False)
for f in range(F_PL0, F_PL1 + 17):
    u = min(1, max(0, (f - F_PL0) / (F_PL1 - F_PL0))); start = CL_S8 + Vector((0, 0, 0.12)); end = SIGN_C - right0 * (W_sign / 2 + 0.12)
    p = start.lerp(end, A.ease_in(u) if u < 1 else 1) + up0 * 0.25 * math.sin(math.pi * u)
    if f > F_PL1: p = end + right0 * 0.9 * A.ease_in((f - F_PL1) / 16) + up0 * 0.1 * ((f - F_PL1) / 16)
    plane.location = p; d = (end - start).normalized() if f <= F_PL1 else right0
    plane.rotation_euler = (right0.cross(d).to_track_quat('Y', 'Z').to_euler() if False else Euler((0, 0, math.atan2(-right0.x, right0.y) + math.pi / 2)))
    plane.keyframe_insert("location", frame=f); plane.keyframe_insert("rotation_euler", frame=f)
for li, (ob, cen) in enumerate(letters):
    f0 = F_PL1 + 1 + int(li * 1.4); off = Vector((rv.uniform(-0.6, 0.6), rv.uniform(-0.4, 0.4), rv.uniform(0.3, 0.9)))
    key_vis(ob, 0, False); key_vis(ob, f0 - 1, True)
    for f in range(f0 - 1, f0 + 9):
        u = A.ease_out(min(1, max(0, (f - f0) / 7))); ov = 1 + 0.06 * math.sin(math.pi * u) * (1 if u > 0.5 else 0)
        ob.location = cen + off * (1 - u) * (1 if u < 1 else 0); ob.scale = (ov, ov, ov)
        ob.rotation_euler = Euler((rv.uniform(-0.3, 0.3) * (1 - u), 0, rv.uniform(-0.6, 0.6) * (1 - u))) if u < 1 else Euler((0, 0, 0))
        ob.keyframe_insert("location", frame=f); ob.keyframe_insert("scale", frame=f); ob.keyframe_insert("rotation_euler", frame=f)
    # gentle float afterwards
    for f in range(f0 + 9, FEND + 1, 6):
        ob.location = cen + up0 * 0.006 * math.sin(f / 7 + li); ob.keyframe_insert("location", frame=f)
    ev("click", f0)
# the sign faces the camera: rotate the letters' objects? their geometry is already built in the camera frame of F_TG+30 (camera moves ~12 deg total: fine)
# a soft blue light for the glow on the faces
tl = bpy.data.lights.new("FX_TgLight", 'POINT'); tl.color = (0.35, 0.7, 1.0); tl.energy = 0.0; tl.shadow_soft_size = 0.4
tlo = bpy.data.objects.new("FX_TgLight", tl); endc.objects.link(tlo); tlo.location = SIGN_C - look0 * 0.2
for f, e in ((0, 0.0), (F_PL1, 0.0), (F_PL1 + 14, 30.0), (FEND, 30.0)): tl.energy = e; tl.keyframe_insert("energy", frame=f)
# ---- the SKILL card pops up in the foreground in the last 1.5 s ----
cpc, lookc, rightc, upc = cam_frame(F_CARD + 10)
CARD_C = cpc + lookc * 0.95 - upc * 0.26 - rightc * 0.14        # lower centre of the frame, below the faces
card = bpy.data.objects.new("FX_SkillCard", None); endc.objects.link(card)
HOLO_DARK = bpy.data.materials.new("HOLO_DARK"); HOLO_DARK.use_nodes = True; _b = HOLO_DARK.node_tree.nodes["Principled BSDF"]
_b.inputs["Base Color"].default_value = (*lin("#2A140C"), 1); _b.inputs["Alpha"].default_value = 0.72; _b.inputs["Roughness"].default_value = 0.6
_b.inputs["Emission Color"].default_value = (*lin("#3A1A10"), 1); _b.inputs["Emission Strength"].default_value = 0.6
HOLO_DARK.surface_render_method = 'BLENDED'; HOLO_DARK.diffuse_color = (*lin("#2A140C"), 0.8)
bb = BB(); Wc, Hc = 0.46, 0.30
for xx in (-Wc / 2, Wc / 2): bb.box((xx, 0, 0), (0.03, 0.02, Hc), HOLO)
for zz in (-Hc / 2, Hc / 2): bb.box((0, 0, zz), (Wc, 0.02, 0.03), HOLO)
bb.box((0, 0.01, 0), (Wc - 0.05, 0.004, Hc - 0.05), HOLO_DARK)
bb.box((0, 0, Hc / 2 - 0.04), (Wc - 0.05, 0.03, 0.04), HOLO)
# icon: a voxel lightning bolt / sparkle on the left
for r_, row in enumerate(["0001100", "0011000", "0110000", "1111110", "0001100", "0011000", "0110000"]):
    for c_, bit in enumerate(row):
        if bit == "1": bb.box((-Wc / 2 + 0.045 + c_ * 0.018, -0.015, 0.075 - r_ * 0.018), (0.017, 0.03, 0.017), HOLO_TXT)
frame_ob = bb.obj("FX_SkillCard_frame", endc, bw=0.003); frame_ob.parent = card
def txt(name, body, size, x, z, mat):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = font; cu.align_x = 'LEFT'; cu.align_y = 'CENTER'; cu.size = size; cu.extrude = 0.005
    t = bpy.data.objects.new(name, cu); endc.objects.link(t); cu.materials.append(mat); t.parent = card; t.location = (x, -0.025, z); t.rotation_euler = (math.radians(90), 0, 0); return t
txt("FX_SkillT1", "СКИЛЛ", 0.064, -Wc / 2 + 0.19, 0.045, HOLO_TXT)
txt("FX_SkillT2", "1 промпт → рилс", 0.038, -Wc / 2 + 0.19, -0.025, HOLO_TXT)
txt("FX_SkillT3", "@snickopros", 0.032, -Wc / 2 + 0.19, -0.078, HOLO_TXT)
txt("FX_SkillT4", "/skill", 0.03, -Wc / 2 + 0.035, Hc / 2 - 0.042, HOLO_TXT)
# orientation: the card's -y faces the camera
qf = (-lookc).to_track_quat('-Y', 'Z')
for c in card.children: key_vis(c, 0, False); key_vis(c, F_CARD - 1, True)
for f in range(F_CARD - 1, FEND + 1):
    s = pop(f, F_CARD); card.location = CARD_C + upc * 0.01 * math.sin(f / 6); card.rotation_euler = (qf @ Quaternion((0, 0, 1), 0.04 * math.sin(f / 9))).to_euler()
    card.scale = (s, s, s); card.keyframe_insert("location", frame=f); card.keyframe_insert("rotation_euler", frame=f); card.keyframe_insert("scale", frame=f)
ev("click", F_CARD); ev("glitch", F_CARD + 1)
for ob in [plane, tlo] + [o for o, c in letters] + list(card.children): A.set_interp(ob, 'CONSTANT', lambda p: p.startswith("hide"))
print("END OK", F_TG, F_CARD)
