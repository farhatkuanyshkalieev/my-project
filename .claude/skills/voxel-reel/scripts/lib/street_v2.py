"""Reel #1 street v2 — 5 cm voxel city on VoxelMat.  Street along +Y, x>0 = my side.  Origin SO.
Zones: NEAR (|y-YS|<=40 m) full detail, built as chunk objects (one per facade module per floor) so the
"Inception" scene can take the city apart; MID (<=130 m) windows/balconies; FAR (<=220 m) windows only; beyond
that silhouette layers + haze + sky dome.  exec'd after vx_lib; call build(col) -> dict."""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler
SO = Vector((300.0, 0.0, 0.0)); ROAD = 3.5; WALK = 7.5; CURB = 0.15; M = 0.05; YS = 8.25
def ST(x, y, z=0.0): return SO + Vector((x, y, z))
FACADES = ["#C9B79C", "#9FB3C8", "#D8A48F", "#A7B59A", "#B8A99A", "#8FA3B8", "#C9A48A", "#9AAE92", "#D9C3A5", "#A9B8C9"]
R = random.Random(21)
MATS = {}
def gm(key, hexc, rough=0.8, emis=0.0, metal=0.0, attr=None):
    if key not in MATS: MATS[key] = vmat("ST_" + key, hexc, rough, metal=metal, emis=emis, attr=attr)
    return MATS[key]
def wall_mat(hexc):
    key = "wall_" + hexc[1:]
    if key not in MATS: MATS[key] = vmat("ST_" + key, hexc, 0.85, attr="Col", jitter=0.05, cell=0.05)
    return MATS[key]
def glass_mat():
    if "glass" in MATS: return MATS["glass"]
    m = bpy.data.materials.new("ST_glass"); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin("#9AB8D8"), 1); b.inputs["Roughness"].default_value = 0.08; b.inputs["Alpha"].default_value = 0.38
    b.inputs["Specular IOR Level"].default_value = 0.6
    m.surface_render_method = 'BLENDED'; m.use_backface_culling = True; m.diffuse_color = (*lin("#9AB8D8"), 0.4); MATS["glass"] = m; return m
def jit(hexc, amt=0.06, r=R):
    c = Vector(lin(hexc)); j = 1 + r.uniform(-amt, amt); return (c.x * j, c.y * j, c.z * j)
class BB:
    """Blocks with a material list"""
    def __init__(self): self.B = Blocks(); self.mats = []
    def box(self, c, s, m, color=None, rot=None):
        if m not in self.mats: self.mats.append(m)
        self.B.box(c, s, color or m.diffuse_color[:3], rot=rot, mat=self.mats.index(m))
    def obj(self, name, col, bw=0.004, bevel=True):
        return self.B.obj(name, self.mats, col, bevel=bevel, bw=bw)
OUT = dict(chunks=[], tiles=[], road=[], lamps=[], lamp_lights=[], tlights=[], cars=[], trees=[], sky=None, far=[])

# ============================ facades ============================
def facade_module(bb, side, x_face, y0, w, z0, fh, colhex, level, ground, i_mod, bld_seed, win_mat, frame_mat, extras):
    """one module (w wide, one floor) of a facade at x = x_face (the wall plane), building depth goes outward (sign side)"""
    r = random.Random(bld_seed * 131 + i_mod * 17 + int(z0 * 10)); sx = side; o = -sx
    D = 0.40                                                    # facade wall thickness
    wall = wall_mat(colhex)
    yc = y0 + w / 2; zc = z0 + fh / 2
    def wbox(y, z, ww, hh, depth=D, col=None, m=None):
        bb.box((x_face + sx * depth / 2, y, z), (depth, ww, hh), m or wall, col or jit(colhex))
    # window opening: 1.1 x 1.3 (ground floor: shop window 1.8 x 2.0 or a door)
    if ground and i_mod % 3 == 1:                                  # door module
        dw, dh = 1.0, 2.2; dz = z0 + dh / 2
        wbox(yc - w / 2 + (w - dw) / 4, zc, (w - dw) / 2, fh); wbox(yc + w / 2 - (w - dw) / 4, zc, (w - dw) / 2, fh)
        wbox(yc, z0 + dh + (fh - dh) / 2, dw, fh - dh)
        bb.box((x_face + sx * 0.30, yc, dz), (0.08, dw - 0.1, dh - 0.05), gm("door", r.choice(["#5A3A22", "#2E4A3A", "#3A3A44"]), 0.5))
        for zz in (dz - 0.5, dz + 0.5): bb.box((x_face + sx * 0.24, yc, zz), (0.04, dw - 0.3, 0.05), gm("doorline", "#2A1A10", 0.6))
        bb.box((x_face + sx * 0.21, yc + 0.3, dz), (0.05, 0.05, 0.15), gm("handle", "#B8B8C0", 0.3, metal=0.8))
        bb.box((x_face + o * 0.3, yc, z0 + 0.05), (0.6, dw + 0.4, 0.10), gm("step", "#8A8580", 0.8))     # step
        bb.box((x_face + o * 0.1, yc, z0 + 0.1), (0.2, dw + 0.4, 0.10), gm("step", "#8A8580", 0.8))
        extras("door", yc, z0)
    elif ground:                                                   # shop window + goods + awning + sign
        gw, gh = w - 0.6, 2.0; gz = z0 + 0.3 + gh / 2
        wbox(yc - w / 2 + 0.15, zc, 0.3, fh); wbox(yc + w / 2 - 0.15, zc, 0.3, fh)
        wbox(yc, z0 + 0.15, gw, 0.30); wbox(yc, z0 + 0.3 + gh + (fh - gh - 0.3) / 2, gw, fh - gh - 0.3)
        bb.box((x_face + sx * 0.08, yc, gz), (0.03, gw, gh), win_mat)                              # glass
        for yy in (yc - gw / 2, yc + gw / 2):
            bb.box((x_face + o * 0.02, yy + (0.025 if yy < yc else -0.025), gz), (0.10, 0.05, gh), frame_mat)
        for zz in (gz - gh / 2 + 0.025, gz + gh / 2 - 0.025): bb.box((x_face + o * 0.02, yc, zz), (0.10, gw, 0.05), frame_mat)
        bb.box((x_face + sx * 0.25, yc, z0 + 0.35), (0.3, gw - 0.1, 0.05), gm("shelf", "#6A5040", 0.7))     # shelf with goods
        for k in range(int(gw / 0.25)):
            gcol = r.choice(["#D94A3A", "#3A8AD9", "#E8C020", "#4AA85A", "#E88A3A", "#8A4AD9"])
            bb.box((x_face + sx * 0.22, yc - gw / 2 + 0.15 + k * 0.25, z0 + 0.35 + 0.10), (0.10, 0.10, 0.15), gm("good_" + gcol[1:], gcol, 0.6))
            if r.random() < 0.5: bb.box((x_face + sx * 0.22, yc - gw / 2 + 0.15 + k * 0.25, z0 + 1.1), (0.10, 0.15, 0.10), gm("good_" + gcol[1:], gcol, 0.6))
        bb.box((x_face + sx * 0.25, yc, z0 + 0.95), (0.3, gw - 0.1, 0.05), gm("shelf", "#6A5040", 0.7))
        # awning: stripes
        aw = r.choice([("#D94A3A", "#F2EEE6"), ("#2A6A4A", "#F2EEE6"), ("#2A4A8A", "#F2EEE6")])
        for k in range(int((gw + 0.4) / 0.2)):
            bb.box((x_face + o * 0.45, yc - (gw + 0.4) / 2 + 0.1 + k * 0.2, z0 + 2.45 - 0.0), (0.9, 0.2, 0.05), gm("awn_" + aw[k % 2][1:], aw[k % 2], 0.8), rot=Euler((0, sx * 0.35, 0)))
        bb.box((x_face + o * 0.5, yc, z0 + 2.62), (0.9, gw + 0.4, 0.05), gm("awn_" + aw[0][1:], aw[0], 0.8), rot=Euler((0, sx * 0.35, 0)))
        # sign board above the awning with a glowing stripe
        bb.box((x_face + o * 0.15, yc, z0 + 2.8 + 0.05), (0.25, gw * 0.8, 0.45), gm("signbox", "#2A2A2E", 0.5))
        bb.box((x_face + o * 0.29, yc, z0 + 2.85), (0.03, gw * 0.6, 0.22), gm("signlit", r.choice(["#D97757", "#F2D060", "#6AC8E0", "#E86A8A"]), 0.4, emis=1.2))
        extras("shop", yc, z0)
    else:                                                          # ordinary window with frame, sill, lintel
        ww, wh = 1.1, 1.3; wz = z0 + 0.9 + wh / 2
        wbox(yc - w / 2 + (w - ww) / 4, zc, (w - ww) / 2, fh); wbox(yc + w / 2 - (w - ww) / 4, zc, (w - ww) / 2, fh)
        wbox(yc, z0 + 0.45, ww, 0.9); wbox(yc, z0 + 0.9 + wh + (fh - 0.9 - wh) / 2, ww, fh - 0.9 - wh)
        bb.box((x_face + sx * 0.12, yc, wz), (0.03, ww - 0.1, wh - 0.1), win_mat)
        for yy in (-1, 1): bb.box((x_face + o * 0.02, yc + yy * (ww / 2 - 0.025), wz), (0.10, 0.05, wh), frame_mat)
        for zz in (-1, 1): bb.box((x_face + o * 0.02, yc, wz + zz * (wh / 2 - 0.025)), (0.10, ww, 0.05), frame_mat)
        bb.box((x_face + o * 0.02, yc, wz), (0.08, 0.05, wh - 0.1), frame_mat)                     # mullion
        bb.box((x_face + o * 0.08, yc, z0 + 0.9 - 0.025 - 0.03), (0.2, ww + 0.2, 0.05), gm("sill", "#E8E2D8", 0.7))   # sill
        if level >= 1 and r.random() < 0.35: bb.box((x_face + o * 0.08, yc, z0 + 0.9 + wh + 0.05), (0.2, ww + 0.3, 0.12), gm("lintel", "#E8E2D8", 0.7))
        if level >= 2 and r.random() < 0.30:                                   # balcony with railing + flower box
            bz = z0 - 0.05
            bb.box((x_face + o * 0.55, yc, bz), (1.1, w - 0.3, 0.10), gm("slab", "#9A9590", 0.8))
            for k in range(int((w - 0.3) / 0.15) + 1):
                bb.box((x_face + o * 1.05, yc - (w - 0.3) / 2 + k * 0.15, bz + 0.5), (0.04, 0.04, 0.9), gm("rail", "#2A2A30", 0.5))
            bb.box((x_face + o * 1.05, yc, bz + 0.95), (0.05, w - 0.3, 0.05), gm("rail", "#2A2A30", 0.5))
            for k in range(3):
                fc = r.choice(["#E8406A", "#F2D060", "#E88A3A", "#C04AD0"])
                bb.box((x_face + o * 0.95, yc - 0.3 + k * 0.3, bz + 0.25), (0.20, 0.25, 0.20), gm("flbox", "#8A5A3A", 0.8))
                bb.box((x_face + o * 0.95, yc - 0.3 + k * 0.3, bz + 0.42), (0.18, 0.2, 0.14), gm("fl_" + fc[1:], fc, 0.7))
                bb.box((x_face + o * 0.95, yc - 0.3 + k * 0.3 + 0.06, bz + 0.46), (0.08, 0.08, 0.10), gm("leaf", "#4A8A3A", 0.7))
            if r.random() < 0.5: bb.box((x_face + o * 0.45, yc + 0.2, bz + 0.4), (0.4, 0.5, 0.8), gm("chair", "#3A3A44", 0.6))   # bistro chair
        elif level >= 2 and r.random() < 0.30:                                 # AC unit under the window
            bb.box((x_face + o * 0.28, yc + 0.35, z0 + 0.55), (0.45, 0.6, 0.45), gm("ac", "#D8D8D4", 0.6))
            bb.box((x_face + o * 0.51, yc + 0.35, z0 + 0.55), (0.03, 0.35, 0.35), gm("acgrid", "#8A8A88", 0.6))
            bb.box((x_face + o * 0.28, yc + 0.35, z0 + 0.3), (0.5, 0.05, 0.05), gm("rail", "#2A2A30", 0.5))
        elif level >= 1 and r.random() < 0.25:                                 # curtain / shutter colour inside
            bb.box((x_face + sx * 0.16, yc + r.choice([-0.3, 0.3]), wz), (0.02, 0.4, wh - 0.2), gm("curtain", r.choice(["#E8E0C8", "#C84A4A", "#4A6A9A"]), 0.9))
        extras("win", yc, z0)

def building(col, side, y0, w, depth, floors, colhex, level, seed, near_col=None):
    """side +1 right (my side), -1 left.  Facade wall at x = sx*WALK.  Returns list of chunk objects (near) or one object."""
    sx = side; x_face = sx * WALK; fh = 2.9; r = random.Random(seed)
    win = glass_mat(); frame = gm("frame", r.choice(["#F0ECE4", "#2A2A2E", "#5A4030"]), 0.6)
    nm = max(1, int(w // 2.2)); mw = w / nm
    objs = []
    # body behind the facade (one block), roof edge, downpipes
    bb = BB(); wall = wall_mat(colhex)
    bb.box(ST(x_face + sx * (depth / 2 + 0.4), y0 + w / 2, floors * fh / 2), (depth - 0.4, w - 0.05, floors * fh), wall, jit(colhex, 0.02, r))
    bb.box(ST(x_face + sx * (depth / 2), y0 + w / 2, floors * fh + 0.12), (depth + 0.3, w + 0.1, 0.25), gm("roofedge", "#8A8580", 0.8))
    if level >= 1:
        for yy in (y0 + 0.15, y0 + w - 0.15):
            bb.box(ST(x_face - sx * 0.06, yy, floors * fh / 2), (0.08, 0.08, floors * fh), gm("pipe", "#3A3A3E", 0.5))
        for k in range(int(w // 3)):                                            # roof: chimney / antenna / water tank
            if r.random() < 0.4: bb.box(ST(x_face + sx * (1.5 + r.uniform(0, depth - 3)), y0 + 1 + k * 3, floors * fh + 0.6), (0.5, 0.5, 1.0), gm("chimney", "#7A6A5A", 0.8))
    objs.append(bb.obj("ST_Bld_%d_%d_body" % (side, int(y0)), near_col or col, bw=0.03))
    if level == 0:                                                              # FAR: windows as dark boxes only
        bb = BB()
        for f in range(floors):
            for i in range(nm):
                yc = y0 + i * mw + mw / 2; wz = f * fh + 1.55
                bb.box(ST(x_face + sx * 0.2, yc, f * fh + fh / 2), (0.4, mw - 0.05, fh), wall, jit(colhex, 0.03, r))
                bb.box(ST(x_face - sx * 0.02, yc, wz), (0.03, 1.1, 1.3), win)
        objs.append(bb.obj("ST_Bld_%d_%d_far" % (side, int(y0)), col, bevel=False)); return objs
    def noop(*a): pass
    if level >= 2:                                                              # NEAR: one chunk per module per floor
        for f in range(floors):
            for i in range(nm):
                bb = BB(); facade_module(bb, sx, 0, i * mw, mw, 0, fh, colhex, level, f == 0, i + int(y0), seed, win, frame, noop)
                ob = bb.obj("ST_Chunk_%d_%d_%d_%d" % (side, int(y0), f, i), near_col or col, bw=0.006)
                ob.location = ST(x_face, y0, f * fh); objs.append(ob); OUT["chunks"].append(ob)
    else:                                                                       # MID: one object per building
        bb = BB()
        for f in range(floors):
            for i in range(nm): facade_module(bb, sx, 0, i * mw, mw, f * fh, fh, colhex, level, f == 0, i + int(y0), seed, win, frame, noop)
        ob = bb.obj("ST_Bld_%d_%d_fac" % (side, int(y0)), col, bw=0.01); ob.location = ST(x_face, y0, 0); objs.append(ob)
    return objs

def cross_street(col, y_c, gap=12.0):
    """buildings along a side street at y_c (both x directions), so the gap never shows empty space"""
    for side in (-1, 1):
        x = WALK + 4.0; k = 0
        while x < 110:
            w = R.choice([7, 8, 9, 10]); d = R.choice([8, 10]); fl = R.choice([3, 4, 5, 6])
            for yy, sgn in ((y_c - gap / 2 - d, -1), (y_c + gap / 2, 1)):
                bb = BB(); colh = R.choice(FACADES); wall = gm("wall_%s" % colh[1:], colh, 0.85, attr="Col")
                bb.box(ST(side * (x + w / 2), yy + d / 2, fl * 2.9 / 2), (w - 0.05, d, fl * 2.9), wall, jit(colh, 0.03))
                glass = glass_mat()
                for f in range(fl):
                    for i in range(int(w // 2.2)):
                        bb.box(ST(side * (x + 1.1 + i * 2.2), yy + (d if sgn < 0 else 0) + sgn * 0.02 * -1, f * 2.9 + 1.55), (1.1, 0.03, 1.3), glass)
                bb.box(ST(side * (x + w / 2), yy + d / 2, fl * 2.9 + 0.12), (w + 0.1, d + 0.3, 0.25), gm("roofedge", "#8A8580", 0.8))
                OUT["far"].append(bb.obj("ST_Side_%d_%d_%d" % (side, int(y_c), k), col, bw=0.02))
            x += w + R.choice([0.0, 0.0, 3.0]); k += 1
        # side road surface
        bb = BB(); bb.box(ST(side * (WALK + 50), y_c, -0.05), (100, gap - 2, 0.1), gm("road", "#3B3B3F", 0.9)); OUT["far"].append(bb.obj("ST_SideRoad_%d_%d" % (side, int(y_c)), col, bevel=False))

# ============================ street surface ============================
def surface(col, near_col):
    road = gm("road", "#3B3B3F", 0.9); mark = gm("mark", "#E8E6E0", 0.7); curb = gm("curb", "#B5B1AA", 0.85)
    tA = gm("tileA", "#9A958E", 0.85, attr="Col"); tB = gm("tileB", "#8C877F", 0.85, attr="Col")
    # road in 4 m segments (near ones separate for the fall)
    y = -230.0
    while y < 230:
        seg = 4.0; near = abs(y + 2 - YS) < 40
        bb = BB(); bb.box(ST(0, y + seg / 2, -0.05), (2 * ROAD, seg - 0.01, 0.10), road)
        for k in range(2):
            if (int(y) // 4 + k) % 2 == 0: bb.box(ST(0, y + 1 + k * 2, 0.006), (0.15, 1.8, 0.012), mark)
        for sx in (-1, 1): bb.box(ST(sx * (ROAD + 0.1), y + seg / 2, (CURB + 0.02) / 2), (0.2, seg - 0.01, CURB + 0.02), curb)
        ob = bb.obj("ST_Road_%d" % int(y + 230), near_col if near else col, bevel=False); (OUT["road"] if near else []).append(ob)
        y += seg
    # sidewalk: 50 cm tiles; near zone as 1 m x 1 m chunk objects, outside as 20 m strips
    for sx in (-1, 1):
        y = -230.0
        while y < 230:
            near = abs(y - YS) < 40; L = 1.0 if near else 20.0
            bb = BB()
            for iy in range(int(L / 0.5)):
                for ix in range(8):
                    xc = sx * (ROAD + 0.2 + ix * 0.5 + 0.25); yc = y + iy * 0.5 + 0.25
                    m = tA if (ix + int(yc * 2)) % 2 == 0 else tB
                    bb.box(ST(xc, yc, CURB / 2 + 0.005), (0.49, 0.49, CURB + 0.01), m, jit(m.name == "ST_tileA" and "#9A958E" or "#8C877F", 0.05))
            ob = bb.obj("ST_Walk_%d_%d" % (sx, int(y + 230)), near_col if near else col, bevel=near, bw=0.004)
            if near: OUT["tiles"].append(ob)
            y += L
    # zebra + manholes at the crossings
    for yc in CROSS:
        bb = BB()
        for k in range(8): bb.box(ST(-ROAD + 0.45 + k * 0.9, yc - 8.0, 0.007), (0.5, 2.5, 0.014), mark)
        OUT["far"].append(bb.obj("ST_Zebra_%d" % int(yc), col, bevel=False))
    bb = BB()
    for yy in (YS - 12, YS + 9, YS + 31, YS - 35): bb.box(ST(R.uniform(-2, 2), yy, 0.004), (0.7, 0.7, 0.03), gm("manhole", "#4A4A4E", 0.6))
    OUT["far"].append(bb.obj("ST_Manholes", col, bw=0.01))

# ============================ props ============================
def lamp(col, x, y, side):
    bb = BB(); dark = gm("ironwork", "#2B2D31", 0.5)
    bb.box(ST(x, y, CURB + 1.9), (0.14, 0.14, 3.8), dark); bb.box(ST(x, y, CURB + 0.15), (0.3, 0.3, 0.3), dark)
    bb.box(ST(x - side * 0.35, y, CURB + 3.75), (0.7, 0.12, 0.10), dark)
    bb.box(ST(x - side * 0.7, y, CURB + 3.6), (0.4, 0.5, 0.22), dark)
    post = bb.obj("ST_Lamp_%d_%d" % (side, int(y + 230)), col, bw=0.01)
    bb = BB(); bb.box(ST(x - side * 0.7, y, CURB + 3.47), (0.34, 0.44, 0.05), gm("lamplit", "#FFE2A8", 0.4, emis=0.0))
    head = bb.obj("ST_LampLit_%d_%d" % (side, int(y + 230)), col, bevel=False); OUT["lamps"].append(head)
    if abs(y - YS) < 45:
        ld = bpy.data.lights.new("ST_LampL_%d_%d" % (side, int(y + 230)), 'POINT'); ld.energy = 0.0; ld.color = (1.0, 0.85, 0.6); ld.shadow_soft_size = 0.3
        lo = bpy.data.objects.new(ld.name, ld); col.objects.link(lo); lo.location = ST(x - side * 0.7, y, CURB + 3.3); OUT["lamp_lights"].append(lo)
    return post
def tree(col, x, y, seed):
    r = random.Random(seed); bb = BB(); trunk = gm("trunk", "#5A3A22", 0.85)
    bb.box(ST(x, y, CURB + 0.25), (0.8, 0.8, 0.5), gm("pot", "#9C7A5E", 0.8)); bb.box(ST(x, y, CURB + 0.52), (0.7, 0.7, 0.05), gm("soil", "#3A2A1E", 0.9))
    bb.box(ST(x, y, CURB + 1.1), (0.16, 0.16, 1.2), trunk)
    greens = ["#4E8A3E", "#5E9A48", "#3E7A32", "#6AA850"]
    for k in range(26):
        gx, gy, gz = r.gauss(0, 0.45), r.gauss(0, 0.45), 1.7 + r.gauss(0.6, 0.35)
        if gx * gx + gy * gy + (gz - 2.3) ** 2 * 0.6 > 1.2: continue
        s = r.choice([0.25, 0.30, 0.35, 0.40])
        bb.box(ST(x + gx, y + gy, CURB + gz), (s, s, s), gm("leaf_" + greens[k % 4][1:], greens[k % 4], 0.7))
    ob = bb.obj("ST_Tree_%d" % int(y + 230 + x), col, bw=0.01); OUT["trees"].append(ob); return ob
def bench(col, x, y, side):
    bb = BB(); wood = gm("bench", "#8A6A4A", 0.7); iron = gm("ironwork", "#2B2D31", 0.5)
    for k in range(4): bb.box(ST(x + side * (-0.15 + k * 0.1), y, CURB + 0.45), (0.08, 1.6, 0.04), wood)
    for k in range(3): bb.box(ST(x - side * 0.25, y, CURB + 0.65 + k * 0.12), (0.04, 1.6, 0.08), wood)
    for yy in (-0.7, 0.7): bb.box(ST(x, y + yy, CURB + 0.22), (0.45, 0.06, 0.44), iron)
    return bb.obj("ST_Bench_%d" % int(y + 230), col, bw=0.006)
def bin_(col, x, y):
    bb = BB(); bb.box(ST(x, y, CURB + 0.45), (0.42, 0.42, 0.9), gm("bin", "#2E5A3E", 0.6)); bb.box(ST(x, y, CURB + 0.92), (0.46, 0.46, 0.05), gm("ironwork", "#2B2D31", 0.5))
    bb.box(ST(x, y - 0.22, CURB + 0.7), (0.3, 0.02, 0.25), gm("binhole", "#101012", 0.8)); return bb.obj("ST_Bin_%d" % int(y + 230), col, bw=0.006)
def flowerbed(col, x, y, seed):
    r = random.Random(seed); bb = BB()
    bb.box(ST(x, y, CURB + 0.2), (1.2, 2.4, 0.4), gm("bedwall", "#8A8580", 0.85)); bb.box(ST(x, y, CURB + 0.42), (1.0, 2.2, 0.05), gm("soil", "#3A2A1E", 0.9))
    for k in range(16):
        fc = r.choice(["#E8406A", "#F2D060", "#E88A3A", "#C04AD0", "#F2F2F0"])
        bb.box(ST(x + r.uniform(-0.4, 0.4), y + r.uniform(-1.0, 1.0), CURB + 0.52), (0.12, 0.12, 0.14), gm("fl_" + fc[1:], fc, 0.7))
        bb.box(ST(x + r.uniform(-0.4, 0.4), y + r.uniform(-1.0, 1.0), CURB + 0.5), (0.10, 0.10, 0.10), gm("leaf", "#4A8A3A", 0.7))
    return bb.obj("ST_Bed_%d" % int(y + 230), col, bw=0.006)
def fence(col, x, y0, y1):
    bb = BB(); iron = gm("ironwork", "#2B2D31", 0.5)
    y = y0
    while y < y1:
        bb.box(ST(x, y, CURB + 0.5), (0.05, 0.05, 1.0), iron); y += 1.5
    bb.box(ST(x, (y0 + y1) / 2, CURB + 0.95), (0.05, y1 - y0, 0.05), iron); bb.box(ST(x, (y0 + y1) / 2, CURB + 0.55), (0.04, y1 - y0, 0.04), iron)
    return bb.obj("ST_Fence_%d" % int(y0 + 230), col, bw=0.006)
def sign(col, x, y, kind):
    bb = BB(); iron = gm("ironwork", "#2B2D31", 0.5); bb.box(ST(x, y, CURB + 1.2), (0.06, 0.06, 2.4), iron)
    if kind == "stop": bb.box(ST(x, y, CURB + 2.5), (0.04, 0.6, 0.6), gm("signred", "#C83A3A", 0.5)); bb.box(ST(x - 0.025, y, CURB + 2.5), (0.01, 0.4, 0.12), gm("mark", "#E8E6E0", 0.7))
    elif kind == "park": bb.box(ST(x, y, CURB + 2.5), (0.04, 0.5, 0.5), gm("signblue", "#2A5AC8", 0.5)); bb.box(ST(x - 0.025, y, CURB + 2.5), (0.01, 0.22, 0.3), gm("mark", "#E8E6E0", 0.7))
    else: bb.box(ST(x, y, CURB + 2.5), (0.04, 0.5, 0.5), gm("signyel", "#E8C020", 0.5), rot=Euler((math.radians(45), 0, 0)))
    return bb.obj("ST_Sign_%d" % int(y + 230), col, bw=0.004)
def traffic_light(col, x, y, side):
    bb = BB(); iron = gm("ironwork", "#2B2D31", 0.5); bb.box(ST(x, y, CURB + 2.0), (0.12, 0.12, 4.0), iron)
    bb.box(ST(x - side * 1.5, y, CURB + 3.9), (3.0, 0.1, 0.1), iron); bb.box(ST(x - side * 2.8, y, CURB + 3.3), (0.35, 0.3, 1.0), gm("tlbox", "#1A1A1E", 0.5))
    post = bb.obj("ST_TL_%d_%d" % (side, int(y + 230)), col, bw=0.01)
    lits = []
    for k, (cname, chex) in enumerate((("red", "#FF2A2A"), ("yel", "#FFC020"), ("grn", "#30E060"))):
        bb = BB(); bb.box(ST(x - side * 2.8, y - 0.16, CURB + 3.62 - k * 0.3), (0.22, 0.03, 0.22), gm("tl_" + cname, chex, 0.4, emis=(3.0 if k == 0 else 0.0)))
        lits.append(bb.obj("ST_TLlit_%s_%d_%d" % (cname, side, int(y + 230)), col, bevel=False))
    OUT["tlights"].append(lits); return post
def bike(col, x, y, side):
    bb = BB(); fr = gm("bikeframe", R.choice(["#C83A3A", "#2A5AC8", "#2A2A2E"]), 0.5); tire = gm("tire", "#1A1A1C", 0.8); rim = gm("rim", "#B8B8C0", 0.3, metal=0.8)
    for yy in (-0.5, 0.5):
        for a in range(12):
            an = a / 12 * 2 * math.pi
            bb.box(ST(x, y + yy + 0.33 * math.cos(an), CURB + 0.35 + 0.33 * math.sin(an)), (0.04, 0.12, 0.12), tire, rot=Euler((an, 0, 0)))
        bb.box(ST(x, y + yy, CURB + 0.35), (0.02, 0.5, 0.05), rim); bb.box(ST(x, y + yy, CURB + 0.35), (0.02, 0.05, 0.5), rim)
    bb.box(ST(x, y, CURB + 0.7), (0.04, 0.7, 0.05), fr, rot=Euler((0.4, 0, 0))); bb.box(ST(x, y - 0.1, CURB + 0.65), (0.04, 0.06, 0.6), fr, rot=Euler((0.3, 0, 0)))
    bb.box(ST(x, y + 0.45, CURB + 0.6), (0.04, 0.06, 0.6), fr, rot=Euler((-0.3, 0, 0))); bb.box(ST(x, y - 0.2, CURB + 0.95), (0.4, 0.05, 0.04), gm("ironwork", "#2B2D31", 0.5))
    bb.box(ST(x, y + 0.3, CURB + 0.92), (0.12, 0.25, 0.06), gm("saddle", "#3A2A1E", 0.6))
    return bb.obj("ST_Bike_%d" % int(y + 230), col, bw=0.004, bevel=True)
def car(col, x, y, kind, colhex, heading=1, name=None):
    """detailed voxel car; heading +1 faces +Y. Returns (root, wheels)"""
    r = random.Random(int(y * 7) + len(colhex)); bb = BB(); body = gm("car_" + colhex[1:], colhex, 0.35); dark = gm("cardark", "#1A1A1E", 0.5)
    glass = gm("carglass", "#6A8AA8", 0.1); chrome = gm("chrome", "#C8C8D0", 0.25, metal=0.9); tire = gm("tire", "#1A1A1C", 0.8); rim = gm("rim", "#B8B8C0", 0.3, metal=0.8)
    L, W, H = {"hatch": (3.9, 1.75, 0.55), "sedan": (4.6, 1.8, 0.55), "van": (4.8, 1.9, 0.75)}[kind]
    zb = 0.35
    bb.box((0, 0, zb + H / 2), (W, L, H), body)                                                 # lower body
    bb.box((0, 0, zb + 0.05), (W - 0.1, L + 0.15, 0.20), dark)                                  # sills / under
    bb.box((0, L / 2 + 0.05, zb + 0.25), (W - 0.05, 0.15, 0.3), gm("bumper", "#2A2A2E", 0.5)); bb.box((0, -L / 2 - 0.05, zb + 0.25), (W - 0.05, 0.15, 0.3), gm("bumper", "#2A2A2E", 0.5))
    if kind == "van": cab = (W - 0.1, L - 0.9, 0.8); cy = -0.3
    else: cab = (W - 0.2, L * 0.5, 0.65); cy = -0.15 if kind == "sedan" else -0.3
    bb.box((0, cy, zb + H + cab[2] / 2), cab, body)                                           # cabin
    bb.box((0, cy, zb + H + cab[2] / 2 + 0.03), (cab[0] - 0.1, cab[1] - 0.3, cab[2] - 0.12), dark)   # pillars dark inside
    for sy in (1, -1):  # windshields
        bb.box((0, cy + sy * (cab[1] / 2 - 0.03), zb + H + cab[2] / 2 + 0.02), (cab[0] - 0.3, 0.06, cab[2] - 0.2), glass, rot=Euler((sy * -0.35 * (1 if kind != "van" else 0.3), 0, 0)))
    for sx in (1, -1):  # side windows + mirrors + handles
        for k in range(2 if kind != "van" else 3):
            bb.box((sx * (cab[0] / 2 - 0.03), cy - cab[1] / 2 + 0.25 + k * (cab[1] / (2 if kind != "van" else 3)) + 0.2, zb + H + cab[2] / 2 + 0.02), (0.06, cab[1] / (2.3 if kind != "van" else 3.4), cab[2] - 0.22), glass)
        bb.box((sx * (W / 2 + 0.12), cy + cab[1] / 2 - 0.15, zb + H + 0.2), (0.2, 0.18, 0.12), body)
        bb.box((sx * (W / 2 + 0.02), cy - 0.2, zb + H - 0.1), (0.04, 0.2, 0.05), chrome); bb.box((sx * (W / 2 + 0.02), cy - 1.1, zb + H - 0.1), (0.04, 0.2, 0.05), chrome)
    for sx in (1, -1):  # lights
        bb.box((sx * (W / 2 - 0.3), L / 2 + 0.005, zb + H - 0.12), (0.4, 0.03, 0.2), gm("headlight", "#FFF2D0", 0.2, emis=0.3))
        bb.box((sx * (W / 2 - 0.3), -L / 2 - 0.005, zb + H - 0.12), (0.4, 0.03, 0.18), gm("taillight", "#D82020", 0.3, emis=0.4))
    bb.box((0, L / 2 + 0.01, zb + H - 0.12), (0.9, 0.03, 0.22), gm("grille", "#202024", 0.5))        # grille
    for k in range(4): bb.box((0, L / 2 + 0.03, zb + H - 0.2 + k * 0.055), (0.85, 0.02, 0.02), chrome)
    bb.box((0, L / 2 + 0.03, zb + 0.28), (0.5, 0.02, 0.12), gm("plate", "#F2F2EE", 0.5)); bb.box((0, -L / 2 - 0.03, zb + 0.28), (0.5, 0.02, 0.12), gm("plate", "#F2F2EE", 0.5))
    bb.box((0, L / 2 + 0.045, zb + 0.28), (0.3, 0.01, 0.04), dark)
    root = bb.obj(name or "ST_Car_%d" % int(y + 230), col, bw=0.012)
    wheels = []
    for sx in (1, -1):
        for yy in (L / 2 - 0.7, -L / 2 + 0.7):
            bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.33, radius2=0.33, depth=0.22)
            for v in bm.verts: v.co = Vector((v.co.z, v.co.y, v.co.x))
            me = bpy.data.meshes.new("wheel"); bm.to_mesh(me); bm.free(); me.materials.append(tire)
            wo = bpy.data.objects.new(root.name + "_w%d%d" % (sx > 0, yy > 0), me); col.objects.link(wo)
            for p in me.polygons: p.use_smooth = False
            bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.2, radius2=0.2, depth=0.24)
            for v in bm.verts: v.co = Vector((v.co.z, v.co.y, v.co.x))
            me2 = bpy.data.meshes.new("rim"); bm.to_mesh(me2); bm.free(); me2.materials.append(rim)
            ro = bpy.data.objects.new(wo.name + "_rim", me2); col.objects.link(ro); ro.parent = wo
            for k in range(5):
                sp = BB(); sp.box((0, 0, 0), (0.26, 0.04, 0.16), dark, rot=Euler((k * 2 * math.pi / 5, 0, 0))); so = sp.obj(wo.name + "_sp%d" % k, col, bevel=False); so.parent = wo
            wo.parent = root; wo.location = (sx * (W / 2 - 0.05), yy, 0.33); wheels.append(wo)
    root.location = ST(x, y, 0.0); root.rotation_euler = (0, 0, 0 if heading > 0 else math.pi)
    OUT["cars"].append((root, wheels)); return root, wheels

# ============================ sky, far layers, haze ============================
def sky(col):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=900)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    me = bpy.data.meshes.new("SkyDome"); bm.to_mesh(me); bm.free()
    m = bpy.data.materials.new("ST_SkyDome"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Strength"].default_value = 1.0
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = -30; mr.inputs["From Max"].default_value = 500; nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*lin("#D8E4EE"), 1); ramp.color_ramp.elements[1].color = (*lin("#4F8AD6"), 1)
    mid = ramp.color_ramp.elements.new(0.35); mid.color = (*lin("#9CC2EC"), 1)
    nt.links.new(mr.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs["Color"], e.inputs["Color"]); nt.links.new(e.outputs[0], o.inputs["Surface"])
    m.diffuse_color = (*lin("#8FB8E8"), 1)
    ob = bpy.data.objects.new("ST_SkyDome", me); col.objects.link(ob); ob.location = ST(0, 0, -20); me.materials.append(m)
    ob.visible_shadow = False; ob.visible_diffuse = False; ob.visible_glossy = False
    for p in me.polygons: p.use_smooth = True
    OUT["sky"] = ob
    # voxel clouds all over the dome
    r = random.Random(9); bb = BB(); cl = gm("cloud", "#F6F8FC", 0.95)
    for k in range(34):
        a = r.uniform(0, 2 * math.pi); d = r.uniform(120, 650); z = r.uniform(70, 160) + d * 0.12
        cx, cy = d * math.cos(a), d * math.sin(a); n = r.randint(6, 14); s = r.uniform(6, 14)
        for j in range(n):
            bb.box(ST(cx + r.gauss(0, s * 1.2), cy + r.gauss(0, s * 0.8), z + r.gauss(0, s * 0.25)), (s * r.uniform(0.8, 1.6), s * r.uniform(0.6, 1.2), s * r.uniform(0.3, 0.6)), cl)
    cob = bb.obj("ST_Clouds", col, bevel=False); cob.visible_shadow = False
    return ob
def far_layers(col):
    """silhouette blocks behind the near city: 3 layers, bluer with distance (aerial perspective on top of the haze)"""
    r = random.Random(5)
    for layer, (dist, hexc, hmax) in enumerate((((60, 130), "#8C97A6", 40), ((130, 260), "#9AA9BE", 70), ((260, 500), "#AFBFD6", 110))):
        bb = BB(); m = gm("far_%d" % layer, hexc, 1.0, attr="Col")
        for k in range(90 + layer * 40):
            a = r.uniform(0, 2 * math.pi); d = r.uniform(*dist); x, y = d * math.cos(a), d * math.sin(a)
            if abs(x) < WALK + 12 and -230 < y < 230: continue                      # keep the street corridor open
            if (SO.x + x) ** 2 + y ** 2 < 60 ** 2: continue                            # nothing around the room at the world origin
            w = r.uniform(8, 22); h = r.uniform(12, hmax)
            bb.box(ST(x, y, h / 2), (w, w * r.uniform(0.7, 1.4), h), m, jit(hexc, 0.05, r))
            if r.random() < 0.3: bb.box(ST(x, y, h + 3), (w * 0.4, w * 0.4, 6), m, jit(hexc, 0.05, r))
        ob = bb.obj("ST_Far_%d" % layer, col, bevel=False); ob.visible_shadow = layer == 0; OUT["far"].append(ob)
    # street ends: a turn — buildings across the road far away, and a hill of blocks behind them
    for yend in (-232, 232):
        bb = BB(); m = gm("far_0", "#8C97A6", 1.0, attr="Col")
        for k in range(6):
            x = -18 + k * 7; bb.box(ST(x, yend + (6 if yend > 0 else -6), 9), (7, 12, 18 + (k % 3) * 5), m, jit("#8C97A6", 0.05, r))
        OUT["far"].append(bb.obj("ST_End_%d" % (yend > 0), col, bevel=False))
def haze(col):
    m = bpy.data.materials.new("ST_HazeMat"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); v = nt.nodes.new("ShaderNodeVolumePrincipled")
    v.inputs["Color"].default_value = (*lin("#C8D8EE"), 1); v.inputs["Density"].default_value = 0.0022; v.inputs["Anisotropy"].default_value = 0.35
    nt.links.new(v.outputs[0], o.inputs["Volume"])
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for vv in bm.verts: vv.co = Vector((vv.co.x * 560, vv.co.y * 700, vv.co.z * 160))
    me = bpy.data.meshes.new("ST_Haze"); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = bpy.data.objects.new("ST_Haze", me); col.objects.link(ob); ob.location = ST(60, 0, 60); ob.display_type = 'WIRE'; return ob

CROSS = [YS + 47.0, YS - 58.0]
# ============================ build ============================
def build(col):
    near = bpy.data.collections.new("Street_Near"); col.children.link(near)
    surface(col, near)
    # buildings along the main street, both sides, -225..225 with two cross streets
    for side in (-1, 1):
        y = -225.0; i = 0
        while y < 225:
            w = R.choice([6.6, 8.8, 8.8, 11.0, 13.2]); fl = R.choice([3, 4, 4, 5, 5, 6]); d = R.choice([8.0, 10.0, 12.0])
            # cross streets: skip the gap
            skip = False
            for yc in CROSS:
                if y < yc + 6 and y + w > yc - 6: y = yc + 6; skip = True
            if skip: continue
            dist = abs(y + w / 2 - YS)
            level = 2 if dist <= 40 else (1 if dist <= 130 else 0)
            colh = FACADES[(i * 3 + (0 if side > 0 else 5)) % len(FACADES)]
            building(col, side, y, w, d, fl, colh, level, seed=i * 7 + (0 if side > 0 else 1000), near_col=near if level == 2 else None)
            y += w + (0.0 if R.random() < 0.7 else 1.5); i += 1
    for yc in CROSS: cross_street(col, yc)
    # lamps (my spot stays clear), trees, benches, bins, bikes, signs, fences, flowerbeds, traffic lights
    for side in (-1, 1):
        for y in range(-220, 225, 12):
            if side > 0 and 2.0 < y - YS + 8.25 - 8.25 + 0 and abs(y - YS) < 4: continue
            if side > 0 and abs(y - YS) < 5: continue
            lamp(col, side * (ROAD + 0.45), y, side)
        for y in range(-214, 225, 12):
            if side > 0 and abs(y + 6 - YS) < 6: continue
            if abs(y - YS) > 160 and R.random() < 0.5: continue
            tree(col, side * (ROAD + 0.95), y + 6, y + side)
    for y in (YS - 6, YS + 16, YS + 60, YS - 70, YS + 120): bench(col, WALK - 0.5, y, 1); bin_(col, WALK - 0.4, y + 1.3)
    for y in (YS + 28, YS - 30, YS + 90): bench(col, -(WALK - 0.5), y, -1); bin_(col, -(WALK - 0.4), y - 1.3)
    bike(col, WALK - 0.25, YS + 22, 1); bike(col, -(WALK - 0.25), YS - 14, -1)
    for yc in CROSS:
        for side in (-1, 1):
            traffic_light(col, side * (ROAD + 0.6), yc - 7.5 * side, side)
            sign(col, side * (ROAD + 0.5), yc + 9, "stop" if side > 0 else "park")
            fence(col, side * (ROAD + 0.3), yc + 8, yc + 20)
    sign(col, ROAD + 0.5, YS + 30, "warn"); sign(col, -(ROAD + 0.5), YS - 22, "park")
    flowerbed(col, ROAD + 1.3, YS + 38, 1); flowerbed(col, -(ROAD + 1.3), YS - 44, 2); flowerbed(col, ROAD + 1.3, YS - 90, 3)
    # parked cars on both sides + one car driving by on the far lane
    car(col, ROAD - 1.0, YS + 13, "hatch", "#C84A3A"); car(col, ROAD - 1.0, YS - 9, "sedan", "#2A4A8A"); car(col, -(ROAD - 1.0), YS + 24, "van", "#E8E4DC", -1)
    car(col, ROAD - 1.0, YS + 55, "sedan", "#3A3A3E"); car(col, -(ROAD - 1.0), YS - 40, "hatch", "#8AA838", -1); car(col, -(ROAD - 1.0), YS + 95, "van", "#2A6A8A", -1)
    car(col, -(ROAD - 1.8), YS + 160, "sedan", "#B8B8C0", -1, name="ST_CarDrive")
    sky(col); far_layers(col); haze(col)
    return OUT
