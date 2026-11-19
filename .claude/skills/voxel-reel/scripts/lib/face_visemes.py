"""Reel #1: speaking faces. Run inside Blender on a copy of Template_Room.blend (never on the locked reference).
- PhotoFace (my photo on the cube): lips cut along the lip line, a dark mouth cavity with upper teeth behind it,
  viseme shape keys V_A / V_O / V_E / V_REST / V_MBP / V_FV made by warping the mouth zone of the same photo
  (lower lip + chin follow the jaw). Existing emotion keys are kept and stay additive.
- Claude: pixel mouth shapes (one object per viseme, switched on/off in steps) + a separate eye material for talk pulses."""
import bpy, bmesh, numpy as np
from mathutils import Vector, Matrix

NG, W, H, ZT, YF = 28, 0.372, 0.388, 1.199, -0.1915      # PhotoFace grid (see photoface.py)
TL = 0.669                                               # lip line on the photo, in face-height units from the top
ROW, I0, I1 = 19, 9, 19                                   # grid row moved onto the lip line; seam columns (mouth corners)
MC, HW = 0.505, 0.179                                     # mouth centre / half width (s units)

def build_photo_mouth():
    pf = bpy.data.objects["PhotoFace"]; me = pf.data
    if "V_A" in me.shape_keys.key_blocks: return pf
    KB = me.shape_keys.key_blocks
    # 1. put grid row 19 exactly on the lip line (position and UV together, so the photo does not shift)
    dz = (ROW / NG - TL) * H
    rowv = [ROW * (NG + 1) + i for i in range(NG + 1)]
    for kb in KB:
        for vi in rowv: kb.data[vi].co.z += dz
    for vi in rowv: me.vertices[vi].co.z += dz
    uv = me.uv_layers.active.data
    rs = set(rowv)
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            if vi in rs: uv[li].uv[1] = 0.9 - 0.8 * TL
    # 2. cut the lips between the mouth corners
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    seam = [e for e in bm.edges if {v.index for v in e.verts} in
            [{ROW * (NG + 1) + i, ROW * (NG + 1) + i + 1} for i in range(I0, I1)]]
    bmesh.ops.split_edges(bm, edges=seam)
    bm.to_mesh(me); bm.free(); me.update()
    # 3. which side of the cut each vertex belongs to
    co = np.array([v.co[:] for v in me.vertices])
    S = (co[:, 0] + W / 2) / W; T = (ZT - co[:, 2]) / H
    below = np.zeros(len(co), bool)
    for p in me.polygons:
        if (ZT - p.center.z) / H > TL:
            for vi in p.vertices: below[vi] = True
    above = np.zeros(len(co), bool)
    for p in me.polygons:
        if (ZT - p.center.z) / H < TL:
            for vi in p.vertices: above[vi] = True
    lower = below & ~(above & (np.abs(T - TL) < 1e-4))     # corners and uncut row stay shared
    lower |= T > TL + 1e-4
    upper = ~lower
    Lp = np.clip(1 - ((S - MC) / HW) ** 2, 0, 1) ** 0.8      # lip opening across the mouth, zero at the corners
    Jp = np.exp(-((S - MC) / 0.28) ** 2)                     # jaw / chin width
    def sm(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
    g = np.where(T <= 0.72, 1.0, sm((1 - T) / (1 - 0.72)))   # jaw motion fades out towards the bottom edge (chin compresses)
    wl = np.exp(-((T - TL) / 0.05) ** 2)
    wm = np.exp(-((S - MC) / 0.20) ** 2 - ((T - TL) / 0.07) ** 2)
    band_u = np.exp(-((T - TL) / 0.035) ** 2)
    def key(name, D=0.0, U=0.0, k=0.0, press=1.0, tuck=1.0):
        dt = np.zeros(len(co)); ds = np.zeros(len(co))
        prof = wl * Lp + (1 - wl) * Jp
        dt += np.where(lower, D * prof * g, 0.0)                         # lower lip + chin go down with the jaw
        dt += np.where(upper, -U * Lp * band_u, 0.0)                    # upper lip lifts a little (teeth show)
        ds += -(S - MC) * k * wm                                        # rounding (k>0) / widening (k<0)
        lipband = np.exp(-((T - TL) / 0.045) ** 2) * np.exp(-((S - MC) / 0.22) ** 2)
        dt += np.where(upper, (TL - T) * (1 - press) * lipband, 0.0)   # pressed lips: both lips thin towards the line
        dt += np.where(lower, -(T - TL) * (1 - press * tuck) * lipband, 0.0)
        kb = pf.shape_key_add(name=name, from_mix=False)
        for i, v in enumerate(kb.data):
            v.co = Vector((co[i, 0] + ds[i] * W, co[i, 1], co[i, 2] - dt[i] * H))
        kb.slider_max = 1.2
    key("V_A", D=0.055, U=0.008, k=-0.03)
    key("V_O", D=0.032, U=0.006, k=0.28)
    key("V_E", D=0.022, U=0.006, k=-0.10)
    key("V_REST", D=0.012, U=0.003)
    key("V_MBP", press=0.72)
    key("V_FV", U=0.013, press=1.0, tuck=0.55)
    # 4. mouth cavity + upper teeth, one plane between the photo and the head cube (no z-fighting)
    head = bpy.data.objects["Head"]
    inv = pf.matrix_world.inverted() @ head.matrix_world
    ys = [(inv @ Vector(c)).y for c in head.bound_box]
    yc = (YF + min(ys)) / 2 if min(ys) > YF else YF + 0.0008
    xs = [-W / 2 + s * W for s in (0.30, 0.39, 0.62, 0.71)]
    zs = [ZT - t * H for t in (TL - 0.03, TL + 0.004, TL + 0.09)]
    bm = bmesh.new(); V = [[bm.verts.new((x, yc, z)) for x in xs] for z in zs]
    cav = bpy.data.meshes.new("MouthCavity")
    for r in range(2):
        for c in range(3):
            f = bm.faces.new([V[r][c], V[r + 1][c], V[r + 1][c + 1], V[r][c + 1]])
            f.material_index = 1 if (r == 0 and c == 1) else 0
    bm.to_mesh(cav); bm.free()
    def mat(name, rgb, rough):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True; b = m.node_tree.nodes.get("Principled BSDF")
        b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
        return m
    cav.materials.append(mat("Mouth_Dark", (0.022, 0.006, 0.005), 0.9))
    cav.materials.append(mat("Mouth_Teeth", (0.42, 0.38, 0.33), 0.55))
    ob = bpy.data.objects.new("MouthCavity", cav)
    for c in pf.users_collection: c.objects.link(ob)
    ob.parent = pf; ob.matrix_parent_inverse = Matrix.Identity(4); ob.matrix_basis = Matrix.Identity(4)
    print("PHOTO MOUTH: seam verts", int((np.abs(T - TL) < 1e-4).sum()), "cavity y", round(yc, 4))
    return pf

# Claude pixel mouths: (w, h) in Claude's local units, px = 0.018; centred under the eyes like the joy mouth
CL_MOUTHS = {"A": [(0.090, 0.054, 0, -0.012)], "O": [(0.054, 0.054, 0, -0.012)],
             "E": [(0.090, 0.027, 0, 0.0)], "REST": [(0.054, 0.027, 0, 0.0)],
             "MBP": [(0.072, 0.010, 0, 0.004)],
             "FV": [(0.072, 0.012, 0, 0.008), (0.018, 0.016, 0, -0.008)]}

def build_claude_mouth():
    src = bpy.data.objects["CL_Joy_mouth"]
    col = bpy.data.collections.get("CL_Face_Talk")
    if col: return col
    col = bpy.data.collections.new("CL_Face_Talk")
    parent_col = [c for c in bpy.data.collections if "CL_Face_Joy" in c.children.keys()]
    (parent_col[0] if parent_col else bpy.context.scene.collection).children.link(col)
    base = src.matrix_basis.translation.copy()
    for vis, parts in CL_MOUTHS.items():
        for k, (w, h, x, z) in enumerate(parts):
            me = bpy.data.meshes.new("CLM_%s_%d" % (vis, k)); b = bmesh.new(); bmesh.ops.create_cube(b, size=1.0)
            for v in b.verts: v.co = Vector((v.co.x * w, v.co.y * 0.008, v.co.z * h))
            b.to_mesh(me); b.free()
            ob = src.copy(); ob.data = me; ob.name = "CLM_%s_%d" % (vis, k)
            if ob.animation_data: ob.animation_data_clear()
            me.materials.clear(); me.materials.append(src.data.materials[0])
            col.objects.link(ob)
            ob.matrix_basis = Matrix.Translation(base + Vector((x, 0, -0.005 + z)))
            ob["viseme"] = vis; ob.hide_render = True; ob.hide_viewport = True
    # eye material just for the neutral eyes, so talk pulses do not touch other face sets
    em = bpy.data.materials["CL_Eye"]
    et = bpy.data.materials.get("CL_Eye_Talk") or em.copy(); et.name = "CL_Eye_Talk"
    for o in bpy.data.collections["CL_Face_Neutral"].objects:
        o.material_slots[0].link = 'OBJECT'; o.material_slots[0].material = et
    return col
