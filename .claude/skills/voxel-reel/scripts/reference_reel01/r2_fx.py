"""Reel #1 v2 — effects: holograms with voxel icons, X-ray scan + skeleton, Inception city, light cycle, material wave,
film camera on a tripod, sound wave, synchronized NPC move.  exec'd after r2_claude."""
fxc = bpy.data.collections.new("FX2"); sc.collection.children.link(fxc)
def GZv(f): return Vector((0, 0, GZ(f) if f >= F_LAND else 0))
# ======================= hologram material =======================
def holo_mat():
    m = bpy.data.materials.new("HOLO"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Base Color"].default_value = (*lin("#5A2A18"), 1); bs.inputs["Roughness"].default_value = 0.4; bs.inputs["Alpha"].default_value = 0.32
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.6
    mixc = nt.nodes.new("ShaderNodeMix"); mixc.data_type = 'RGBA'; mixc.inputs["A"].default_value = (*lin("#FF7A3A"), 1); mixc.inputs["B"].default_value = (*lin("#5AD8FF"), 1)
    nt.links.new(lw.outputs["Facing"], mixc.inputs["Factor"])          # facing -> orange core, grazing -> cyan rim
    inv = nt.nodes.new("ShaderNodeMath"); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; nt.links.new(lw.outputs["Facing"], inv.inputs[1])
    # scanlines: world z stripes drifting with time + flicker
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sep.inputs[0])
    tval = nt.nodes.new("ShaderNodeValue"); tval.name = "HoloTime"; tval.outputs[0].default_value = 0.0
    m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = 'MULTIPLY'; m1.inputs[1].default_value = 180.0; nt.links.new(sep.outputs["Z"], m1.inputs[0])
    m2 = nt.nodes.new("ShaderNodeMath"); m2.operation = 'ADD'; nt.links.new(m1.outputs[0], m2.inputs[0]); nt.links.new(tval.outputs[0], m2.inputs[1])
    sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'; nt.links.new(m2.outputs[0], sn.inputs[0])
    sl = nt.nodes.new("ShaderNodeMapRange"); sl.inputs["From Min"].default_value = -1; sl.inputs["From Max"].default_value = 1; sl.inputs["To Min"].default_value = 0.75; sl.inputs["To Max"].default_value = 1.25
    nt.links.new(sn.outputs[0], sl.inputs["Value"])
    fl = nt.nodes.new("ShaderNodeValue"); fl.name = "HoloFlicker"; fl.outputs[0].default_value = 1.0
    st = nt.nodes.new("ShaderNodeMath"); st.operation = 'MULTIPLY'; nt.links.new(sl.outputs[0], st.inputs[0]); nt.links.new(fl.outputs[0], st.inputs[1])
    st2 = nt.nodes.new("ShaderNodeMath"); st2.operation = 'MULTIPLY'; st2.inputs[1].default_value = 1.4; nt.links.new(st.outputs[0], st2.inputs[0])
    nt.links.new(mixc.outputs["Result"], bs.inputs["Emission Color"]); nt.links.new(st2.outputs[0], bs.inputs["Emission Strength"])
    nt.links.new(bs.outputs[0], o.inputs["Surface"]); m.surface_render_method = 'BLENDED'; m.use_backface_culling = False
    m.diffuse_color = (*lin("#D97757"), 0.7)
    rng = random.Random(8)
    for f in range(0, FEND + 1, 2):
        tval.outputs[0].default_value = f * 0.9; tval.outputs[0].keyframe_insert("default_value", frame=f)
        fl.outputs[0].default_value = rng.uniform(0.82, 1.0) if rng.random() > 0.06 else 0.45; fl.outputs[0].keyframe_insert("default_value", frame=f)
    A.set_interp(nt, 'CONSTANT')
    return m
HOLO = holo_mat()
HOLO_TXT = vmat("HOLO_TXT", "#FFFFFF", 0.4, emis=6.0)
# voxel icons as 9x9 bitmaps ( '#' = orange, 'o' = cyan/white, '.' = empty )
ICON = {
 "Claude Code": ["#########", "#.......#", "#.oo....#", "#...oo..#", "#.oo....#", "#.......#", "#.ooooo.#", "#.......#", "#########"],
 "Blender":     ["....ooo..", "...o...o.", "..o.....o", ".o..###..", "o..#...#.", "...#.#.#.", "o..#...#.", ".o..###..", "..o......"],
 "Персонаж":    ["...###...", "...###...", "....#....", ".#######.", "#..###..#", "#..###..#", "...#.#...", "...#.#...", "..##.##.."],
 "Скелет":      ["oo.....oo", "ooo...ooo", "..ooooo..", "....o....", "....o....", "....o....", "..ooooo..", "ooo...ooo", "oo.....oo"],
 "Эмоции":      ["..#####..", ".#.....#.", "#..o.o..#", "#.......#", "#.o...o.#", "#..ooo..#", ".#.....#.", "..#####..", "........."],
 "Локация":     ["....#....", "...###...", "..#####..", ".#######.", "#########", "..#.o.#..", "..#.o.#..", "..#.o.#..", "..#####.."],
 "Материалы":   ["......oo.", ".....oooo", "....ooo..", "...###...", "..###....", ".###.....", "###......", "##.......", "#........"],
 "Свет":        ["...ooo...", "..o...o..", ".o.....o.", ".o.....o.", "..o...o..", "...ooo...", "...###...", "...###...", "....#...."],
 "Камера":      ["..##.##..", ".#######.", "#########", "#..ooo..#", "#.o...o.#", "#..ooo..#", "#########", "...#.#...", "..##.##.."],
 "Озвучка":     ["....#....", "...###...", "...###...", "...###...", "o..###..o", "oo.###.oo", "o.o.#.o.o", "....#....", "...###..."],
 "Анимация":    ["..#......", ".###.....", "..#..#...", "..#.###..", ".#.#..#.#", "#....#.##", "....#...#", "...#.....", "..#......"],
 "Рендер":      ["#########", "#.......#", "#.ooooo.#", "#.ooooo.#", "#.ooooo.#", "#.ooooo.#", "#.......#", "#########", "...oo...."],
}
font = bpy.data.fonts.load(r"C:\Windows\Fonts\arialbd.ttf", check_existing=True)
def make_holo(i, label):
    root = bpy.data.objects.new("Holo_%02d" % (i + 1), None); fxc.objects.link(root)
    bb = BB(); W, H = 0.9, 0.6
    for x in (-W / 2, W / 2): bb.box((x, 0, 0), (0.04, 0.02, H), HOLO)
    for z in (-H / 2, H / 2): bb.box((0, 0, z), (W, 0.02, 0.04), HOLO)
    for x in (-W / 2 + 0.08, W / 2 - 0.08):
        for z in (-H / 2 + 0.08, H / 2 - 0.08): bb.box((x, 0, z), (0.08, 0.025, 0.08), HOLO)
    bb.box((0, 0.01, 0), (W - 0.06, 0.004, H - 0.06), HOLO)                               # glass pane
    bb.box((0, 0, H / 2 - 0.07), (W - 0.08, 0.03, 0.06), HOLO)                             # title bar
    rows = ICON[label]; v = 0.045; x0 = -W / 2 + 0.10 + 4 * v; z0 = -0.02
    for r_, row in enumerate(rows):
        for c_, ch in enumerate(row):
            if ch == '.': continue
            bb.box((x0 - 4 * v + c_ * v, -0.02, z0 + (4 - r_) * v), (v * 0.92, 0.05, v * 0.92), HOLO if ch == '#' else HOLO_TXT)
    frame = bb.obj("Holo_%02d_frame" % (i + 1), fxc, bw=0.004); frame.parent = root
    cu = bpy.data.curves.new("HT_%02d" % (i + 1), 'FONT'); cu.body = label; cu.font = font; cu.align_x = 'LEFT'; cu.align_y = 'CENTER'
    cu.size = 0.125 if len(label) < 9 else 0.105; cu.extrude = 0.008
    tx = bpy.data.objects.new("Holo_%02d_text" % (i + 1), cu); fxc.objects.link(tx); cu.materials.append(HOLO_TXT)
    tx.parent = root; tx.location = (-W / 2 + 0.52, -0.03, -0.04); tx.rotation_euler = (math.radians(90), 0, 0)
    cu2 = bpy.data.curves.new("HN_%02d" % (i + 1), 'FONT'); cu2.body = "ШАГ %d" % (i + 1); cu2.font = font; cu2.align_x = 'LEFT'; cu2.align_y = 'CENTER'; cu2.size = 0.06; cu2.extrude = 0.004
    t2 = bpy.data.objects.new("Holo_%02d_num" % (i + 1), cu2); fxc.objects.link(t2); cu2.materials.append(HOLO_TXT)
    t2.parent = root; t2.location = (-W / 2 + 0.52, -0.03, 0.17); t2.rotation_euler = (math.radians(90), 0, 0)
    return root
HOL = [make_holo(i, l) for i, l in enumerate(LABELS)]
def face_to(yaw_deg): return Euler((0, 0, math.radians(yaw_deg)))
def pop(f, f0):
    d = f - f0
    if d < 0: return 0.0
    if d < 4: return 1.1 * A.ease_out(d / 4)
    if d < 6: return 1.1 - 0.1 * A.ease((d - 4) / 2)
    return 1.0
RING_T0 = SCN["5"][0]
def ring_pos(slot, f):
    th = math.radians(slot * 60 + 15 + 14 * (f - RING_T0) / FPS); z = 1.5 if slot % 2 == 0 else 1.9
    return ME_C + Vector((1.3 * math.cos(th), 1.3 * math.sin(th), z)), Euler((0.08 * math.sin(f / 9 + slot), 0, th + math.pi / 2)), 0.72
def chaos_pos(slot, f):
    """overload: holograms pile up around me chaotically, up to the neck, each one jittering"""
    r_ = random.Random(slot * 7 + 3); layer = min(2, slot // 5); k = slot % 5
    ph = math.radians(250 + k * 72 + 36 * layer + r_.uniform(-12, 12)); a = 0.92 + 0.12 * r_.random() + 0.10 * layer
    rot = Euler((math.radians(r_.uniform(-14, 14)), math.radians(r_.uniform(-10, 10)), ph + math.pi / 2 + r_.uniform(-0.3, 0.3)))
    jit_ = Vector((0.006 * math.sin(f * 1.7 + slot), 0.006 * math.cos(f * 1.3 + slot), 0.008 * math.sin(f * 2.1 + slot)))
    return ME_C + Vector((a * math.cos(ph), a * math.sin(ph), 0.30 + 0.33 * layer)) + jit_, rot, 0.85
def move(pa, pb, u):
    (la, ra, sa), (lb, rb, sb) = pa, pb; return la.lerp(lb, u), ra.to_quaternion().slerp(rb.to_quaternion(), u).to_euler(), sa + (sb - sa) * u
def drop(pa, pb, u):
    l, r, sc_ = move(pa, pb, u); out = (l - ME_C); out.z = 0
    if out.length > 1e-4: l = l + out.normalized() * 0.45 * math.sin(math.pi * u) + Vector((0, 0, 0.25 * math.sin(math.pi * u)))
    return l, r, sc_
S4p = {0: (Vector((1.05, -0.75, 1.65)) + Vector((0.55, -0.1, 0.15)), face_to(-15), 0.9), 1: (Vector((-1.05, -0.55, 1.75)) + Vector((-0.55, -0.15, 0.1)), face_to(15), 0.85),
       2: (Vector((-0.95, -0.9, 1.1)), face_to(25), 0.85)}
drop_frames = {1: SCN["6"][0] + 26, 2: SCN["6"][0] + 41, 3: SCN["6"][0] + 56, 4: SCN["6"][0] + 81, 5: SCN["6"][0] + 96, 6: SCN["6"][0] + 116, 0: SCN["6"][0] + 131}
slot_of = {}; nxt_slot = 0
for i, fd in sorted(list(drop_frames.items()) + [(i, STEP_NUM[i + 1] + 7) for i in range(7, 12)], key=lambda x: x[1]): slot_of[i] = nxt_slot; nxt_slot += 1
def holo_state(i, f):
    n = i + 1; fa = STEP_SUBJ[n] if n <= 7 else STEP_NUM[n] - 5
    if n <= 7:
        hover = Vector((0, 0, 0.012 * math.sin(2 * math.pi * f / 48 + i)))
        if i < 3:
            home = (ME_C + S4p[i][0] + hover, Euler((0, 0, S4p[i][1].z + 0.15 * math.sin(f / 25 + i))), S4p[i][2])
            cur = home if f < RING_T0 else (move(home, ring_pos(i, RING_T0 + 10), A.ease((f - RING_T0) / 10)) if f < RING_T0 + 10 else ring_pos(i, f))
        else: cur = ring_pos(i, f)
        fd = drop_frames[i]
        if f >= fd + 10: cur = chaos_pos(slot_of[i], f)
        elif f >= fd: cur = drop(cur, chaos_pos(slot_of[i], f), A.ease((f - fd) / 10))
        sc_ = pop(f, fa) * cur[2] if f < fa + 8 else cur[2]
        return cur[0] + GZv(f), cur[1], sc_
    fh = STEP_NUM[n]; hit = (ME_C + Vector((0, -0.78, 0.78)), face_to(0), 1.0)
    start = (ME_C + Vector((random.Random(n).uniform(-1.2, 1.2), -2.8, 1.5)), face_to(random.Random(n + 9).uniform(-40, 40)), 1.0)
    if f < fh - 5: return start[0] + GZv(f), start[1], 0.0
    if f < fh: l, r, s = move(start, hit, A.ease_in((f - (fh - 5)) / 5)); return l + GZv(f), r, s
    fd = fh + 7
    if f < fd: l, r, s = hit
    elif f < fd + 10: l, r, s = drop(hit, chaos_pos(slot_of[i], f), A.ease((f - fd) / 10))
    else: l, r, s = chaos_pos(slot_of[i], f)
    return l + GZv(f), r, s
def bake_holos():
  for i, p in enumerate(HOL):
    fa = STEP_SUBJ[i + 1] if i < 7 else STEP_NUM[i + 1] - 5
    ev("click", STEP_SUBJ[i + 1] if i < 7 else STEP_NUM[i + 1], panel=i + 1); ev("glitch", (STEP_SUBJ[i + 1] if i < 7 else STEP_NUM[i + 1]) + 1)
    if i >= 7: ev("hit", STEP_NUM[i + 1])
    prev = None
    for f in range(max(0, fa - 2), F_FLASH + 1):
        l, r, s = holo_state(i, f)
        cp = CAMPOS.get(f)
        if cp is not None: d = cp - l; r = Euler((0.15 * math.sin(f / 9 + i), 0, math.atan2(d.x, -d.y)))
        if prev is not None: r = r.copy(); r.make_compatible(prev)
        prev = r; p.location = l; p.rotation_euler = r; p.scale = (s, s, s)
        p.keyframe_insert("location", frame=f); p.keyframe_insert("rotation_euler", frame=f); p.keyframe_insert("scale", frame=f)
    for f, h in ((0, True), (fa - 1, False), (F_FLASH, True)):
        for c in p.children_recursive: c.hide_render = h; c.keyframe_insert("hide_render", frame=f)
    A.set_interp(p, 'BEZIER')
# Blender wire from the Claude Code hologram to the Blender one (step 2)
wcu = bpy.data.curves.new("FX_Wire", 'CURVE'); wcu.dimensions = '3D'; wcu.bevel_depth = 0.012
spl = wcu.splines.new('BEZIER'); spl.bezier_points.add(1)
pa_ = ME_C + S4p[0][0] + Vector((-0.45, 0, -0.1)); pb_ = ME_C + S4p[1][0] + Vector((0.45, 0, -0.1))
for bp, co, h in ((spl.bezier_points[0], pa_, Vector((-0.5, 0, -0.5))), (spl.bezier_points[1], pb_, Vector((0.5, 0, -0.5)))):
    bp.co = co; bp.handle_left = co - h; bp.handle_right = co + h
wire = bpy.data.objects.new("FX_Wire", wcu); fxc.objects.link(wire); wcu.materials.append(HOLO)
for f, v in ((STEP_SUBJ[2], 0.0), (STEP_SUBJ[2] + 8, 1.0), (RING_T0, 1.0), (RING_T0 + 6, 0.0)):
    wcu.bevel_factor_end = v; wcu.keyframe_insert("bevel_factor_end", frame=f)
ev("click", STEP_SUBJ[2] + 4)

# ======================= X-ray scan + voxel skeleton =======================
F_SCAN = STEP_SUBJ[3]; F_BONES = STEP_SUBJ[4]
XR = bpy.data.node_groups.new("XRayFX", 'ShaderNodeTree')
XR.interface.new_socket("Shader", in_out='INPUT', socket_type='NodeSocketShader'); XR.interface.new_socket("Shader", in_out='OUTPUT', socket_type='NodeSocketShader')
n_ = XR.nodes; L_ = XR.links; gi_ = n_.new("NodeGroupInput"); go_ = n_.new("NodeGroupOutput")
amt = n_.new("ShaderNodeValue"); amt.name = "Amount"; scz = n_.new("ShaderNodeValue"); scz.name = "ScanZ"
geo = n_.new("ShaderNodeNewGeometry"); sep = n_.new("ShaderNodeSeparateXYZ"); L_.new(geo.outputs["Position"], sep.inputs[0])
below = n_.new("ShaderNodeMapRange"); below.inputs["From Min"].default_value = -0.03; below.inputs["From Max"].default_value = 0.03; below.inputs["To Min"].default_value = 0; below.inputs["To Max"].default_value = 1
dz = n_.new("ShaderNodeMath"); dz.operation = 'SUBTRACT'; L_.new(sep.outputs["Z"], dz.inputs[0]); L_.new(scz.outputs[0], dz.inputs[1]); L_.new(dz.outputs[0], below.inputs["Value"])
fac = n_.new("ShaderNodeMath"); fac.operation = 'MULTIPLY'; L_.new(below.outputs[0], fac.inputs[0]); L_.new(amt.outputs[0], fac.inputs[1])
tr = n_.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (0.55, 0.8, 1.0, 1)
em = n_.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*lin("#5AD8FF"), 1); em.inputs["Strength"].default_value = 2.0
lw = n_.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.2
xm = n_.new("ShaderNodeMixShader"); L_.new(lw.outputs["Fresnel"], xm.inputs[0]); L_.new(tr.outputs[0], xm.inputs[1]); L_.new(em.outputs[0], xm.inputs[2])
out = n_.new("ShaderNodeMixShader"); L_.new(fac.outputs[0], out.inputs[0]); L_.new(gi_.outputs[0], out.inputs[1]); L_.new(xm.outputs[0], out.inputs[2]); L_.new(out.outputs[0], go_.inputs[0])
# glow band right at the scan line
band = n_.new("ShaderNodeMapRange"); band.inputs["From Min"].default_value = 0.0; band.inputs["From Max"].default_value = 0.06; band.inputs["To Min"].default_value = 1; band.inputs["To Max"].default_value = 0; band.clamp = True
ab = n_.new("ShaderNodeMath"); ab.operation = 'ABSOLUTE'; L_.new(dz.outputs[0], ab.inputs[0]); L_.new(ab.outputs[0], band.inputs["Value"])
bm_ = n_.new("ShaderNodeMath"); bm_.operation = 'MULTIPLY'; L_.new(band.outputs[0], bm_.inputs[0]); L_.new(amt.outputs[0], bm_.inputs[1])
eo = n_.new("ShaderNodeEmission"); eo.inputs["Color"].default_value = (*lin("#FFB070"), 1); eo.inputs["Strength"].default_value = 12.0
out2 = n_.new("ShaderNodeMixShader"); L_.new(bm_.outputs[0], out2.inputs[0]); L_.new(out.outputs[0], out2.inputs[1]); L_.new(eo.outputs[0], out2.inputs[2])
for l in list(XR.links):
    if l.to_node == go_: XR.links.remove(l)
L_.new(out2.outputs[0], go_.inputs[0])
for m in [m for m in bpy.data.materials if m.name.startswith("CH_") or m.name in ("Face_Photo", "Mouth_Dark", "Mouth_Teeth")]:
    nt = m.node_tree; outn = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]; src = outn.inputs["Surface"].links[0].from_socket
    g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = XR; nt.links.new(src, g.inputs[0]); nt.links.new(g.outputs[0], outn.inputs["Surface"])
    m.surface_render_method = 'DITHERED'
def xr_key(f, a, z):
    amt.outputs[0].default_value = a; scz.outputs[0].default_value = z
    amt.outputs[0].keyframe_insert("default_value", frame=f); scz.outputs[0].keyframe_insert("default_value", frame=f)
ZTOP = ME_C.z + 1.45; ZBOT = ME_C.z - 0.1
xr_key(0, 0, ZTOP + 1); xr_key(F_SCAN - 1, 0, ZTOP + 1); xr_key(F_SCAN, 1, ZTOP)
xr_key(F_SCAN + 16, 1, ZBOT)                                      # the band sweeps down in 16 frames
GL = [F_SCAN + 19, F_SCAN + 26, F_SCAN + 33]
for k, g_ in enumerate(GL): xr_key(g_, 0, ZBOT); xr_key(g_ + 1, 1, ZBOT)
xr_key(F_BONES + 22, 1, ZBOT); xr_key(F_BONES + 34, 1, ZTOP + 0.2); xr_key(F_BONES + 36, 0, ZTOP + 1)   # the body comes back bottom-up
A.set_interp(XR, 'BEZIER', lambda p: "ScanZ" in p); A.set_interp(XR, 'CONSTANT', lambda p: "Amount" in p)
for g_ in GL: ev("glitch", g_); ev("crackle", g_)
ev("scanhum", F_SCAN, dur=18)
# skeleton: voxel bones inside me (cyan emissive), lit orange bottom-up on "Скелет"
BONE_M = bpy.data.materials.new("FX_BoneMat"); BONE_M.use_nodes = True; bnt = BONE_M.node_tree; bnt.nodes.clear()
bo = bnt.nodes.new("ShaderNodeOutputMaterial"); be = bnt.nodes.new("ShaderNodeEmission"); be.inputs["Strength"].default_value = 7.0
bmix = bnt.nodes.new("ShaderNodeMix"); bmix.data_type = 'RGBA'; bmix.inputs["A"].default_value = (*lin("#9AE8FF"), 1); bmix.inputs["B"].default_value = (*lin("#FF8A3A"), 1)
bnt.links.new(bmix.outputs["Result"], be.inputs["Color"])
# visibility follows the scan: alpha = Amount * below(scanZ) via the same math as XRayFX
bg_ = bnt.nodes.new("ShaderNodeGroup"); bg_.node_tree = XR
tr2 = bnt.nodes.new("ShaderNodeBsdfTransparent"); bnt.links.new(tr2.outputs[0], bg_.inputs[0])
# XRayFX turns Transparent into the x-ray look; for bones we want emission where x-ray is on: mix by a copy of the factor
geo2 = bnt.nodes.new("ShaderNodeNewGeometry"); sep2 = bnt.nodes.new("ShaderNodeSeparateXYZ"); bnt.links.new(geo2.outputs["Position"], sep2.inputs[0])
scz2 = bnt.nodes.new("ShaderNodeValue"); scz2.name = "ScanZ2"; amt2 = bnt.nodes.new("ShaderNodeValue"); amt2.name = "Amount2"
dz2 = bnt.nodes.new("ShaderNodeMath"); dz2.operation = 'SUBTRACT'; bnt.links.new(sep2.outputs["Z"], dz2.inputs[0]); bnt.links.new(scz2.outputs[0], dz2.inputs[1])
bl2 = bnt.nodes.new("ShaderNodeMapRange"); bl2.inputs["From Min"].default_value = -0.03; bl2.inputs["From Max"].default_value = 0.03; bl2.inputs["To Min"].default_value = 0; bl2.inputs["To Max"].default_value = 1
bnt.links.new(dz2.outputs[0], bl2.inputs["Value"]); f2 = bnt.nodes.new("ShaderNodeMath"); f2.operation = 'MULTIPLY'; bnt.links.new(bl2.outputs[0], f2.inputs[0]); bnt.links.new(amt2.outputs[0], f2.inputs[1])
bms = bnt.nodes.new("ShaderNodeMixShader"); bnt.links.new(f2.outputs[0], bms.inputs[0]); bnt.links.new(tr2.outputs[0], bms.inputs[1]); bnt.links.new(be.outputs[0], bms.inputs[2]); bnt.links.new(bms.outputs[0], bo.inputs["Surface"])
BONE_M.surface_render_method = 'DITHERED'; BONE_M.diffuse_color = (*lin("#9AE8FF"), 1)
bnt.nodes.remove(bg_)
for f, a, z in ((0, 0, ZTOP + 1), (F_SCAN - 1, 0, ZTOP + 1), (F_SCAN, 1, ZTOP), (F_SCAN + 16, 1, ZBOT), (F_BONES + 22, 1, ZBOT), (F_BONES + 34, 1, ZTOP + 0.2), (F_BONES + 36, 0, ZTOP + 1)):
    amt2.outputs[0].default_value = a; scz2.outputs[0].default_value = z; amt2.outputs[0].keyframe_insert("default_value", frame=f); scz2.outputs[0].keyframe_insert("default_value", frame=f)
for k, g_ in enumerate(GL):
    for ff, a in ((g_, 0), (g_ + 1, 1)): amt2.outputs[0].default_value = a; amt2.outputs[0].keyframe_insert("default_value", frame=ff)
A.set_interp(bnt, 'CONSTANT', lambda p: "Amount2" in p)
# orange lights up bottom-up on "Скелет" (bones ordered by height), then back to cyan
def bone_voxels(name, blocks, bone):
    bb = BB()
    for c, s in blocks: bb.box(c, s, BONE_M)
    ob = bb.obj("FX_Bone_" + name, fxc, bw=0.003); ob.parent = rig; ob.parent_type = 'BONE'; ob.parent_bone = bone; ob.matrix_parent_inverse = Matrix.Identity(4)
    return ob
bone_obs = []
def seg(bone, length, r=0.028, knob=0.045):
    return [((0, -length / 2, 0), (r, length - knob, r)), ((0, -length + knob / 2, 0), (knob, knob, knob)), ((0, -knob / 2, 0), (knob, knob, knob))]
for b in rig.data.bones:
    n = b.name
    if n in ("upper_arm.L", "upper_arm.R", "forearm.L", "forearm.R", "thigh.L", "thigh.R", "shin.L", "shin.R"): bone_obs.append(bone_voxels(n, seg(n, b.length, 0.035 if "thigh" in n or "shin" in n else 0.028), n))
    elif n in ("hand.L", "hand.R", "foot.L", "foot.R"): bone_obs.append(bone_voxels(n, [((0, -b.length / 2, 0), (0.05, b.length, 0.02))], n))
    elif n == "head": bone_obs.append(bone_voxels(n, [((0, -0.22, 0), (0.30, 0.30, 0.28)), ((-0.07, -0.19, -0.16), (0.07, 0.06, 0.04)), ((0.07, -0.19, -0.16), (0.07, 0.06, 0.04)), ((0, -0.33, -0.1), (0.2, 0.08, 0.05))], n))
    elif n in ("spine", "chest", "neck", "hips"):
        bl = [((0, -(k + 0.5) * 0.05, 0), (0.045, 0.04, 0.045)) for k in range(max(1, int(b.length / 0.05)))]
        if n == "chest":
            for k in range(3):
                for sx in (-1, 1): bl.append(((sx * 0.085, -0.03 - k * 0.045, -0.06), (0.12, 0.022, 0.022)))
        if n == "hips": bl += [((sx * 0.07, -0.03, 0.0), (0.09, 0.05, 0.08)) for sx in (-1, 1)]
        bone_obs.append(bone_voxels(n, bl, n))
# rig lines + joint dots flash on "Скелет" (orange), bones switch cyan->orange bottom-up
RIG_M = vmat("FX_RigLine", "#FF8A3A", 0.3, emis=8.0); rig_obs = []
for b in rig.data.bones:
    if any(s in b.name for s in ("index", "middle", "ring", "pinky", "thumb")): continue
    bb = BB(); bb.box((0, -b.length / 2, 0), (0.012, b.length, 0.012), RIG_M); bb.box((0, 0, 0), (0.035, 0.035, 0.035), RIG_M)
    ob = bb.obj("FX_RigL_" + b.name, fxc, bevel=False); ob.parent = rig; ob.parent_type = 'BONE'; ob.parent_bone = b.name; ob.matrix_parent_inverse = Matrix.Identity(4); rig_obs.append(ob)
    for f, h in ((0, True), (F_BONES, False), (F_BONES + 3, True), (F_BONES + 5, False), (F_BONES + 22, True)):
        ob.hide_render = ob.hide_viewport = h; ob.keyframe_insert("hide_render", frame=f); ob.keyframe_insert("hide_viewport", frame=f)
order_z = sorted(bone_obs, key=lambda o: rig.data.bones[o.parent_bone].head_local.z)
for k, ob in enumerate(order_z):
    m = BONE_M.copy(); m.name = "FX_BoneMat_%d" % k; ob.data.materials[0] = m
    mx_ = [n for n in m.node_tree.nodes if n.type == 'MIX' and n.data_type == 'RGBA'][0].inputs["Factor"]
    fk = F_BONES + 4 + int(k * 1.2)
    for f, v in ((0, 0), (fk - 1, 0), (fk, 1), (F_BONES + 22, 1), (F_BONES + 24, 0)): mx_.default_value = v; mx_.keyframe_insert("default_value", frame=f)
    A.set_interp(m.node_tree, 'CONSTANT')
ev("bonelight", F_BONES)
# scan plane with glow + a few sparks
bb = BB(); bb.box((0, 0, 0), (0.95, 0.95, 0.012), vmat("FX_ScanGlow", "#FFB070", 0.3, emis=14.0)); scan = bb.obj("FX_ScanLine", fxc, bevel=False)
sparks = []
for k in range(24):
    bb = BB(); bb.box((0, 0, 0), (0.018, 0.018, 0.018), vmat("FX_Spark", "#FFD9A0", 0.3, emis=20.0)); sp_ = bb.obj("FX_Spark_%d" % k, fxc, bevel=False); sparks.append(sp_)
rs = random.Random(12)
for f in range(F_SCAN - 1, F_SCAN + 20):
    z = ZTOP - (ZTOP - ZBOT) * A.ease((f - F_SCAN) / 16) if f >= F_SCAN else ZTOP
    scan.location = Vector((ME_C.x, ME_C.y, z)); scan.keyframe_insert("location", frame=f)
    vis = F_SCAN <= f <= F_SCAN + 16; scan.hide_render = scan.hide_viewport = not vis; scan.keyframe_insert("hide_render", frame=f); scan.keyframe_insert("hide_viewport", frame=f)
    for k, sp_ in enumerate(sparks):
        a = rs.uniform(0, 6.3); sp_.location = Vector((ME_C.x + 0.4 * math.cos(a) * rs.uniform(0.3, 1.1), ME_C.y + 0.4 * math.sin(a) * rs.uniform(0.3, 1.1), z + rs.uniform(-0.05, 0.12)))
        sp_.keyframe_insert("location", frame=f); sp_.hide_render = sp_.hide_viewport = not vis; sp_.keyframe_insert("hide_render", frame=f); sp_.keyframe_insert("hide_viewport", frame=f)
for o in [scan] + sparks + rig_obs: A.set_interp(o, 'CONSTANT', lambda p: p.startswith("hide"))

# ======================= Inception: the city comes apart in a wave, I fall, it reassembles lower =======================
rr = random.Random(3)
PIECES = S["chunks"] + S["tiles"] + S["road"]
EXTRA = [o for o in col.objects if o.type == 'MESH' and o.parent is ROOT and o.name.startswith(("ST_Lamp", "ST_Tree", "ST_Bench", "ST_Bin", "ST_Bike", "ST_Sign", "ST_Car_", "ST_Bld_1_", "ST_Bld_-1_"))
         and (o.location - ME_C).length < 60]
def wave_u(f, dist):
    """0 -> 1 (apart) -> 0 (back) ; delay grows with distance, everything is back by F_REBUILT"""
    t0 = F_LOC + dist * 0.9; t1 = F_FALL1 + dist * 0.35                     # leave / return times (frames)
    if f < t0: return 0.0
    if f < t0 + 10: return A.ease_out((f - t0) / 10)
    if f < t1: return 1.0
    if f < t1 + 12: return 1 - A.ease_in((f - t1) / 12)
    return 0.0
for ob in PIECES + EXTRA:
    l0 = ob.location.copy(); r0 = Euler(ob.rotation_euler); dist = (l0 - ME_C).length
    if dist > 45: continue
    d = (l0 - ME_C); d.z = 0
    outv = d.normalized() if d.length > 0.1 else Vector((rr.uniform(-1, 1), rr.uniform(-1, 1), 0)).normalized()
    off = outv * rr.uniform(1.5, 6.0) + Vector((0, 0, rr.uniform(4.0, 14.0))); rot = Vector((rr.uniform(-1.2, 1.2), rr.uniform(-1.2, 1.2), rr.uniform(-1.5, 1.5)))
    fold = ob in S["tiles"] and (l0.y - ME_C.y) > 5 and (l0.y - ME_C.y) < 16 and abs(l0.x - ME_C.x) < 4    # the street ahead folds up like a wall
    last_u = None
    for f in range(F_LOC - 2, F_REBUILT + 14):
        u = wave_u(f, dist)
        if fold:
            ang = -math.pi / 2 * A.ease(min(1, max(0, (f - F_FALL0) / 14))) * (1 - A.ease(min(1, max(0, (f - F_FALL1 - 4) / 14))))
            piv = Vector((l0.x, ME_C.y + 5.0, l0.z)); rel = l0 - piv
            ob.location = piv + Matrix.Rotation(ang, 3, 'X') @ rel + off * u * 0.25; ob.rotation_euler = Euler((ang + rot.x * u * 0.3, 0, 0))
        else:
            ob.location = l0 + off * u; ob.rotation_euler = Euler(Vector(r0) + rot * u)
        if u == 0 and last_u == 0 and f > F_LOC + 2 and f < F_REBUILT: continue
        ob.keyframe_insert("location", frame=f); ob.keyframe_insert("rotation_euler", frame=f); last_u = u
# the whole street ends up 3 m lower (I fall onto the new street)
for f, z in ((F_FALL0 - 1, 0.0), (F_LAND, -3.0)):
    ROOT.location = (0, 0, z); ROOT.keyframe_insert("location", frame=f)
A.set_interp(ROOT, 'BEZIER')
# dust cubes at the landing
dust = []
for k in range(30):
    bb = BB(); bb.box((0, 0, 0), (0.05, 0.05, 0.05), gm("dust", "#B8B2A8", 0.9)); d_ = bb.obj("FX_Dust_%d" % k, fxc, bevel=False); dust.append(d_)
rd = random.Random(5)
for k, d_ in enumerate(dust):
    a = rd.uniform(0, 6.3); sp_ = rd.uniform(1.5, 3.5); up = rd.uniform(1.0, 2.5)
    for f in range(F_LAND - 1, F_LAND + 22):
        t = max(0, f - F_LAND) / FPS
        d_.location = ME_C + Vector((0, 0, -3.0)) + Vector((sp_ * t * math.cos(a), sp_ * t * math.sin(a), max(0.02, up * t - 4.9 * t * t)))
        d_.keyframe_insert("location", frame=f); vis = F_LAND <= f <= F_LAND + 20; d_.hide_render = d_.hide_viewport = not vis
        d_.keyframe_insert("hide_render", frame=f); d_.keyframe_insert("hide_viewport", frame=f)
    A.set_interp(d_, 'CONSTANT', lambda p: p.startswith("hide"))
ev("crumble", F_LOC + 2); ev("fall", F_FALL0, dur=F_LAND - F_FALL0); ev("assemble", F_FALL1); ev("land", F_LAND)

# ======================= material wave on "Материалы, шейдеры" =======================
F_MAT = STEP_SUBJ[7]; MW = bpy.data.node_groups.new("MatWave", 'ShaderNodeTree')
MW.interface.new_socket("Color", in_out='INPUT', socket_type='NodeSocketColor')
for nm in ("Color",): MW.interface.new_socket(nm, in_out='OUTPUT', socket_type='NodeSocketColor')
for nm in ("Roughness", "Metallic"): MW.interface.new_socket(nm, in_out='OUTPUT', socket_type='NodeSocketFloat')
n_ = MW.nodes; L_ = MW.links; gi_ = n_.new("NodeGroupInput"); go_ = n_.new("NodeGroupOutput")
tv = n_.new("ShaderNodeValue"); tv.name = "WaveT"; tv.outputs[0].default_value = -1.0
geo = n_.new("ShaderNodeNewGeometry"); sub = n_.new("ShaderNodeVectorMath"); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = ME_C + Vector((0, 0, -3.0))
L_.new(geo.outputs["Position"], sub.inputs[0]); ln = n_.new("ShaderNodeVectorMath"); ln.operation = 'LENGTH'; L_.new(sub.outputs[0], ln.inputs[0])
dm = n_.new("ShaderNodeMath"); dm.operation = 'MULTIPLY'; dm.inputs[1].default_value = 0.06; L_.new(ln.outputs["Value"], dm.inputs[0])
st = n_.new("ShaderNodeMath"); st.operation = 'SUBTRACT'; L_.new(tv.outputs[0], st.inputs[0]); L_.new(dm.outputs[0], st.inputs[1])
cl_ = n_.new("ShaderNodeClamp"); cl_.inputs["Min"].default_value = 0; cl_.inputs["Max"].default_value = 4.999; L_.new(st.outputs[0], cl_.inputs["Value"])
fl_ = n_.new("ShaderNodeMath"); fl_.operation = 'FLOOR'; L_.new(cl_.outputs[0], fl_.inputs[0])
def stage_w(k):
    c = n_.new("ShaderNodeMath"); c.operation = 'COMPARE'; c.inputs[1].default_value = k; c.inputs[2].default_value = 0.1; L_.new(fl_.outputs[0], c.inputs[0]); return c.outputs[0]
w1, w2, w3, w4 = stage_w(1), stage_w(2), stage_w(3), stage_w(4)
nz = n_.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 6.0; L_.new(geo.outputs["Position"], nz.inputs["Vector"])
wood = n_.new("ShaderNodeMix"); wood.data_type = 'RGBA'; wood.inputs["A"].default_value = (*lin("#7A4A26"), 1); wood.inputs["B"].default_value = (*lin("#A8743E"), 1); L_.new(nz.outputs["Fac"], wood.inputs["Factor"])
stone = n_.new("ShaderNodeMix"); stone.data_type = 'RGBA'; stone.inputs["A"].default_value = (*lin("#6A6A66"), 1); stone.inputs["B"].default_value = (*lin("#9A9A94"), 1); L_.new(nz.outputs["Fac"], stone.inputs["Factor"])
def mixc(prev, w, colsock=None, colval=None):
    m = n_.new("ShaderNodeMix"); m.data_type = 'RGBA'; L_.new(w, m.inputs["Factor"]); L_.new(prev, m.inputs["A"])
    if colsock is not None: L_.new(colsock, m.inputs["B"])
    else: m.inputs["B"].default_value = colval
    return m.outputs["Result"]
c = mixc(gi_.outputs["Color"], w1, stone.outputs["Result"]); c = mixc(c, w2, colval=(*lin("#C8CCD4"), 1)); c = mixc(c, w3, colval=(*lin("#8AC8F0"), 1)); c = mixc(c, w4, wood.outputs["Result"])
L_.new(c, go_.inputs["Color"])
def mixf(vals):
    cur = None
    for w, v in vals:
        m = n_.new("ShaderNodeMix"); m.data_type = 'FLOAT'; L_.new(w, m.inputs["Factor"]); m.inputs["B"].default_value = v
        if cur is None: m.inputs["A"].default_value = 0.85
        else: L_.new(cur, m.inputs["A"])
        cur = m.outputs["Result"]
    return cur
L_.new(mixf([(w1, 0.95), (w2, 0.2), (w3, 0.04), (w4, 0.5)]), go_.inputs["Roughness"])
L_.new(mixf([(w2, 1.0), (w3, 0.35)]), go_.inputs["Metallic"])
for m in [m for m in bpy.data.materials if m.name.startswith("ST_wall_")]:
    nt = m.node_tree; vg = [n for n in nt.nodes if n.type == 'GROUP'][0]; at = [n for n in nt.nodes if n.type == 'ATTRIBUTE'][0]
    g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = MW; nt.links.new(at.outputs["Color"], g.inputs["Color"])
    for l in list(nt.links):
        if l.to_node == vg and l.to_socket.name == "Color": nt.links.remove(l)
    nt.links.new(g.outputs["Color"], vg.inputs["Color"]); nt.links.new(g.outputs["Roughness"], vg.inputs["Roughness"]); nt.links.new(g.outputs["Metallic"], vg.inputs["Metallic"])
for f, v in ((0, -1.0), (F_MAT - 1, -1.0), (wf("C8", 2, True) + 6, 8.0), (wf("C8", 2, True) + 7, 99.0)):
    tv.outputs[0].default_value = v; tv.outputs[0].keyframe_insert("default_value", frame=f)
A.set_interp(MW, 'LINEAR')
for k in range(4): ev("swap", F_MAT + k * 7)

# ======================= light: day -> sunset -> night -> day on "свет" =======================
F_SKY = STEP_SUBJ[8]
SUN_KEYS = [(F_SKY - 1, 50, (1.0, 0.93, 0.80), 4.0, 1.0), (F_SKY + 8, 8, (1.0, 0.55, 0.25), 2.5, 0.45), (F_SKY + 14, -8, (0.3, 0.4, 0.8), 0.15, 0.06),
            (F_SKY + 24, -8, (0.3, 0.4, 0.8), 0.15, 0.06), (F_SKY + 34, 50, (1.0, 0.93, 0.80), 4.0, 1.0)]
LAMP_ON = (F_SKY + 11, F_SKY + 27)
# (the sun object + sky dome are created in r2_look; keys are stored for it)
# traffic lights cycle red->green near the crossing on "свет" too
for lits in S["tlights"]:
    for k, lit in enumerate(lits):
        m = lit.data.materials[0]
        if m.users > 1: m = m.copy(); lit.data.materials[0] = m
        g = [n for n in m.node_tree.nodes if n.type == 'GROUP'][0].inputs["Emission"]
        for f, on in ((0, k == 0), (F_SKY + 2, k == 2), (F_SKY + 30, k == 0)):
            g.default_value = 3.0 if on else 0.0; g.keyframe_insert("default_value", frame=f)
        A.set_interp(m.node_tree, 'CONSTANT')

# ======================= film camera on a tripod ("камера") =======================
F_CAMT = STEP_SUBJ[9]; trip = bpy.data.objects.new("FX_Tripod", None); fxc.objects.link(trip)
bb = BB(); blk_ = gm("tripod", "#2A2A2E", 0.5); chrome = gm("chrome", "#C8C8D0", 0.25, metal=0.9); body = gm("camerabody", "#3A3A44", 0.5)
for k in range(3):
    a = math.radians(k * 120 + 30); bb.box((0.22 * math.cos(a), 0.22 * math.sin(a), 0.5), (0.035, 0.035, 1.0), blk_, rot=Euler((0.22 * math.sin(a), -0.22 * math.cos(a), 0)))
    bb.box((0.40 * math.cos(a), 0.40 * math.sin(a), 0.03), (0.06, 0.06, 0.06), chrome)
bb.box((0, 0, 1.02), (0.12, 0.12, 0.08), blk_); bb.box((0, 0, 1.08), (0.20, 0.14, 0.05), chrome)
bb.box((0, 0.02, 1.28), (0.28, 0.44, 0.30), body); bb.box((0, -0.32, 1.28), (0.16, 0.22, 0.16), blk_); bb.box((0, -0.45, 1.28), (0.14, 0.05, 0.14), gm("lensglass", "#4A7AB8", 0.1))
for sy in (-0.1, 0.1): bb.box((0, sy, 1.55), (0.06, 0.22, 0.22), blk_); bb.box((0, sy, 1.55), (0.07, 0.10, 0.10), chrome)
bb.box((0.17, 0.0, 1.30), (0.06, 0.04, 0.12), chrome); bb.box((-0.17, 0.1, 1.20), (0.08, 0.14, 0.04), blk_)
tcam = bb.obj("FX_TripodCam", fxc, bw=0.004); tcam.parent = trip
bb = BB(); bb.box((0.1, -0.2, 1.42), (0.03, 0.03, 0.03), vmat("FX_RedLed", "#FF2020", 0.3, emis=0.0)); led = bb.obj("FX_TripodLed", fxc, bevel=False); led.parent = trip
ledm = led.data.materials[0]; lg = [n for n in ledm.node_tree.nodes if n.type == 'GROUP'][0].inputs["Emission"]
for f in range(F_CAMT, F_FLASH, 8): lg.default_value = 12.0 if (f // 8) % 2 == 0 else 0.0; lg.keyframe_insert("default_value", frame=f)
A.set_interp(ledm.node_tree, 'CONSTANT')
trip.location = ME_C + Vector((-1.45, -0.9, -3.0)); trip.rotation_euler = (0, 0, math.radians(-30))
for f in (0, F_CAMT - 1) + tuple(range(F_CAMT, F_CAMT + 8)) + (F_FLASH - 1, F_FLASH):
    s = pop(f, F_CAMT) if f < F_FLASH else 0.0; trip.scale = (s, s, max(s, 0.001)); trip.keyframe_insert("scale", frame=f)
ev("grow", F_CAMT)
# sound wave above Claude on "озвучка"
F_WAVE = STEP_SUBJ[10]; bars = []
for k in range(9):
    bb = BB(); bb.box((0, 0, 0), (0.05, 0.05, 0.3), vmat("FX_WaveBar", "#FF9A5A", 0.3, emis=6.0)); o = bb.obj("FX_Wave%d" % k, fxc, bevel=False); o.parent = crig
    o.location = ((k - 4) * 0.1 / 0.67, 0, 0.55 / 0.67); bars.append(o)
rw = random.Random(4)
for o in bars:
    for f in range(0, FEND + 1):
        if f in (0, F_WAVE - 1) or F_WAVE <= f <= F_WAVE + 24 or f == F_WAVE + 25:
            s = rw.uniform(0.25, 1.4) * (1 if F_WAVE <= f <= F_WAVE + 22 else 0.001); o.scale = (1, 1, s); o.keyframe_insert("scale", frame=f)
    A.set_interp(o, 'CONSTANT')
# render bar in the 3D world too? no — it runs across the whole frame in compose.py
print("FX OK", "pieces", len(PIECES), "extra", len(EXTRA))
