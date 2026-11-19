"""Voxel passers-by built like my avatar (same proportions, 5 cm module blocks, VoxelMat, same bone names) + props.
Usage (inside Blender, after vx_lib is exec'd): build_npc(name, cfg, collection) -> dict(rig, parts, props)"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler

MOD = 0.05
def q(v): return round(v / MOD) * MOD                         # snap to the 5 cm module

class NPCBuilder:
    def __init__(self, name, col, k=1.0, seed=0):
        self.name, self.col, self.k = name, col, k; self.R = random.Random(seed)
        self.bones = {}; self.parts = {}                       # bone -> (Blocks, mats list)
        self.props = []
    def mat(self, key, hexcol, rough=0.75, emis=0.0, metal=0.0, attr=None):
        return vmat("NPC_%s_%s" % (self.name, key), hexcol, rough, metal=metal, emis=emis, attr=attr)
    def box(self, bone, center, size, m, rot=None):
        """block in the character's own space (metres at k=1); snapped to the module"""
        B, mats = self.parts.setdefault(bone, (Blocks(), []))
        if m not in mats: mats.append(m)
        c = Vector(center) * self.k; s = Vector(size) * self.k
        B.box(c, s, m.diffuse_color[:3], rot=rot, mat=mats.index(m))
    def bone(self, n, h, t, p): self.bones[n] = (Vector(h) * self.k, Vector(t) * self.k, p)
    # ---------------- body ----------------
    def body(self, skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.10, top_h=0.31, trouser=True, skirt=None, coat=False, tie=None, lapel=None, hoodie=False):
        k = 1
        self.box("head", (0, 0, 1.005), (0.40, 0.38, 0.40), skin)
        for sx in (-1, 1): self.box("head", (sx * 0.212, 0.02, 0.985), (0.026, 0.05, 0.075), skin_d)
        self.box("neck", (0, 0.005, 0.79), (0.13, 0.12, 0.06), skin)
        self.box("chest", (0, 0, 0.625), (0.30, 0.17, top_h), top)
        if coat: self.box("chest", (0, 0, 0.56), (0.32, 0.19, 0.20), top)
        if lapel:
            for sx in (-1, 1): self.box("chest", (sx * 0.06, -0.09, 0.70), (0.06, 0.012, 0.12), lapel, rot=Euler((0, sx * 0.3, 0)))
        if tie: self.box("chest", (0, -0.092, 0.66), (0.045, 0.012, 0.20), tie)
        if hoodie: self.box("chest", (0, 0.07, 0.78), (0.26, 0.10, 0.08), top)
        self.box("hips", (0, 0, 0.445), (0.295, 0.165, 0.085), bottom)
        self.box("spine", (0, 0, 0.49), (0.305, 0.175, 0.016), top)
        for side, sx in (("L", 1), ("R", -1)):
            S = Vector((sx * 0.195, 0, 0.755)); a = math.radians(14); R = Matrix.Rotation(-sx * a, 4, 'Y')
            W = lambda x, y, t: S + (R @ Vector((x, y, -t)))
            self.box("upper_arm." + side, W(0, 0, 0.045), (0.105, 0.105, sleeve_len), top, rot=R)
            self.box("upper_arm." + side, W(0, 0, 0.0875), (0.086, 0.086, 0.185), top if sleeve_len > 0.15 else skin, rot=R)
            self.box("forearm." + side, W(0, 0, 0.250), (0.082, 0.082, 0.170), top if sleeve_len > 0.15 else skin, rot=R)
            self.box("hand." + side, W(0, 0, 0.366), (0.046, 0.100, 0.092), skin, rot=R)
            # half-closed fingers: one block under the palm, thumb at the front
            self.box("hand." + side, W(0, 0, 0.43), (0.044, 0.095, 0.05), skin, rot=R)
            self.box("hand." + side, W(0, -0.055, 0.37), (0.024, 0.024, 0.06), skin, rot=R)
            self.bone("upper_arm." + side, W(0, 0, 0), W(0, 0, 0.17), "chest"); self.bone("forearm." + side, W(0, 0, 0.17), W(0, 0, 0.33), "upper_arm." + side)
            self.bone("hand." + side, W(0, 0, 0.33), W(0, 0, 0.41), "forearm." + side)
            x = sx * 0.072
            if skirt:
                if side == "L": self.box("hips", (0, 0, 0.33), (0.32, 0.20, 0.16), skirt)
                self.box("thigh." + side, (x, 0, 0.28), (0.12, 0.13, 0.10), skin if not trouser else bottom)
            else:
                self.box("thigh." + side, (x, 0, 0.325), (0.125, 0.135, 0.20), bottom if trouser else skin)
            self.box("shin." + side, (x, 0, 0.150), (0.115, 0.125, 0.17), bottom if trouser else skin)
            self.box("foot." + side, (x, -0.035, 0.05), (0.12, 0.19, 0.055), shoe); self.box("foot." + side, (x, -0.035, 0.012), (0.126, 0.196, 0.024), sole)
            self.bone("thigh." + side, (x, 0, 0.425), (x, 0, 0.235), "hips"); self.bone("shin." + side, (x, 0, 0.235), (x, 0, 0.065), "thigh." + side)
            self.bone("foot." + side, (x, 0, 0.065), (x, -0.12, 0.03), "shin." + side)
        self.bone("hips", (0, 0, 0.43), (0, 0, 0.50), None); self.bone("spine", (0, 0, 0.50), (0, 0, 0.62), "hips")
        self.bone("chest", (0, 0, 0.62), (0, 0, 0.77), "spine"); self.bone("neck", (0, 0, 0.77), (0, 0, 0.81), "chest"); self.bone("head", (0, 0, 0.81), (0, 0, 1.22), "neck")
    def hair(self, m, style="short", colhex="#3A2616"):
        V = 0.04; HZ1 = 1.205; R = self.R; base = Vector(lin(colhex)); B, mats = self.parts.setdefault("head", (Blocks(), []))
        if m not in mats: mats.append(m)
        mi = mats.index(m)
        def put(x, y, z, s=V):
            j = 0.9 + 0.2 * R.random(); B.box(Vector((x, y, z)) * self.k, Vector((s, s, s)) * self.k, (base.x * j, base.y * j, base.z * j), mat=mi)
        for i in range(-6, 6):
            for j in range(-6, 6):
                x = (i + 0.5) * V; y = (j + 0.5) * V
                if abs(x) > 0.245 or abs(y) > 0.235: continue
                h = 1 + (1 if style == "messy" and R.random() < 0.3 and abs(x) < 0.15 else 0) + (1 if style == "bun" and abs(x) < 0.08 and 0.06 < y < 0.16 else 0)
                if style == "buzz": h = 1
                for kk in range(-1, h): put(x, y, HZ1 + (kk + 0.5) * V)
                outside = abs(x) > 0.20 or y > 0.19 or y < -0.19
                if not outside: continue
                if y < -0.19: bottom = {"short": 1.10, "messy": 1.07, "bun": 1.12, "buzz": 1.13, "grey": 1.09, "pony": 1.11}[style] + (0.02 * R.random() if style == "messy" else 0)
                elif abs(x) > 0.20: bottom = 1.02 if y < 0 else 0.95
                else: bottom = {"short": 0.90, "messy": 0.88, "bun": 0.93, "buzz": 0.95, "grey": 0.86, "pony": 0.92}[style]
                kk = -1
                while HZ1 + (kk + 0.5) * V > bottom - 0.001: put(x, y, HZ1 + (kk + 0.5) * V); kk -= 1
        if style == "pony":
            for kk in range(6): put(0.0, 0.23 + 0.02 * kk, 1.08 - kk * 0.045, 0.06)
    def face(self, img_path, skin_hex):
        """photo face on the front of the head cube, same layout as mine (U .2-.8, V .1-.9 of a 1024 texture)"""
        W, H, ZT, Y = 0.372, 0.388, 1.199, -0.19 - 0.0015; NG = 8
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap"); G = {}
        for j in range(NG + 1):
            for i in range(NG + 1): G[(i, j)] = bm.verts.new(Vector((-W / 2 + i / NG * W, Y, ZT - j / NG * H)) * self.k)
        for j in range(NG):
            for i in range(NG):
                f = bm.faces.new([G[(i, j)], G[(i, j + 1)], G[(i + 1, j + 1)], G[(i + 1, j)]]); f.smooth = True
                for l in f.loops:
                    ii, jj = [kk for kk, v in G.items() if v is l.vert][0]
                    l[uvl].uv = (0.2 + ii / NG * 0.6, 1 - (0.1 + jj / NG * 0.8))
        me = bpy.data.meshes.new(self.name + "_Face"); bm.to_mesh(me); bm.free()
        src = bpy.data.materials["Face_Photo"]; m = src.copy(); m.name = "NPC_%s_Face" % self.name
        img = bpy.data.images.load(img_path, check_existing=True)
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE': n.image = img
            if n.type == 'MIX' and n.data_type == 'RGBA': n.inputs["B"].default_value = (*lin(skin_hex), 1)
            if n.type == 'BSDF_PRINCIPLED': n.inputs["Emission Strength"].default_value = 0.0
        me.materials.append(m); ob = bpy.data.objects.new(self.name + "_Face", me); self.col.objects.link(ob)
        self._face = ob; return ob
    # ---------------- props (built in character space, attached to a bone) ----------------
    def prop(self, bone, blocks, name, bevel=0.004):
        """blocks: list of (center, size, material, rot)"""
        B = Blocks(); mats = []
        for c, s, m, *r in blocks:
            if m not in mats: mats.append(m)
            B.box(Vector(c) * self.k, Vector(s) * self.k, m.diffuse_color[:3], rot=(r[0] if r else None), mat=mats.index(m))
        ob = B.obj(self.name + "_" + name, mats, self.col, bw=bevel); self.props.append((ob, bone)); return ob
    # ---------------- assemble ----------------
    def finish(self):
        ad = bpy.data.armatures.new(self.name + "_Rig"); rig = bpy.data.objects.new(self.name + "_Rig", ad); self.col.objects.link(rig)
        bpy.context.view_layer.objects.active = rig
        for o in bpy.context.view_layer.objects: o.select_set(o == rig)
        bpy.ops.object.mode_set(mode='EDIT')
        core = ["hips", "spine", "chest", "neck", "head"]; order = core + [k for k in self.bones if k not in core]
        for n in order:
            h, t, p = self.bones[n]; b = ad.edit_bones.new(n); b.head = h; b.tail = t
        for n in order:
            if self.bones[n][2]: ad.edit_bones[n].parent = ad.edit_bones[self.bones[n][2]]
        bpy.ops.object.mode_set(mode='OBJECT'); rig.hide_render = True
        objs = []
        for bone, (B, mats) in self.parts.items():
            ob = B.obj(self.name + "_" + bone, mats, self.col, bw=0.004); objs.append((ob, bone))
        objs += self.props
        if hasattr(self, "_face"): objs.append((self._face, "head"))
        bpy.context.view_layer.update()
        for ob, bn in objs:
            mw = ob.matrix_world.copy(); ob.parent = rig; ob.parent_type = 'BONE'; ob.parent_bone = bn
            pb = rig.pose.bones[bn]; pm = rig.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.bone.length, 0))
            ob.matrix_parent_inverse = pm.inverted(); ob.matrix_basis = mw
        for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
        return rig

def build_npc(name, cfg, col, faces_dir):
    """cfg keys: k (height scale), skin, top, bottom, shoe, hair, hairstyle, kind, face"""
    b = NPCBuilder(name, col, cfg.get("k", 1.0), seed=hash(name) & 0xffff)
    skin = b.mat("skin", cfg["skin"], 0.6); skin_d = b.mat("skin_d", cfg.get("skin_d", cfg["skin"]), 0.6)
    top = b.mat("top", cfg["top"], 0.8); bottom = b.mat("bottom", cfg["bottom"], 0.8)
    shoe = b.mat("shoe", cfg.get("shoe", "#222226"), 0.6); sole = b.mat("sole", cfg.get("sole", "#E6E6E0"), 0.6)
    kind = cfg["kind"]; dark = b.mat("dark", "#1E1E22", 0.5); metal = b.mat("metal", "#9A9AA0", 0.35, metal=0.8)
    if kind == "stroller":
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.20, skirt=None)
        b.hair(b.mat("hair", cfg["hair"], 0.7), "bun", cfg["hair"])
        # stroller in front, pushed with both hands (handle at hand height)
        fab = b.mat("fab", "#3B5A8A", 0.85); whl = b.mat("wheel", "#2A2A2E", 0.6)
        bl = [((0, -0.62, 0.52), (0.42, 0.50, 0.26), fab), ((0, -0.78, 0.70), (0.42, 0.30, 0.22), fab), ((0, -0.56, 0.38), (0.30, 0.42, 0.04), dark),
              ((0, -0.42, 0.40), (0.03, 0.03, 0.38), metal, Euler((0.45, 0, 0))), ((0, -0.35, 0.57), (0.36, 0.03, 0.03), metal)]
        b.prop("hips", bl, "Stroller")
        for sx in (-1, 1):
            for yy in (-0.42, -0.80):
                b.prop("hips", [((sx * 0.19, yy, 0.09), (0.03, 0.18, 0.18), whl), ((sx * 0.21, yy, 0.09), (0.012, 0.06, 0.06), metal)], "Wheel_%d_%d" % (sx, int(-yy * 100)))
    elif kind == "suit":
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.20, lapel=b.mat("lapel", "#1A1A24", 0.7), tie=b.mat("tie", "#8A2A2A", 0.6))
        b.hair(b.mat("hair", cfg["hair"], 0.7), "short", cfg["hair"])
        b.prop("hand.R", [((-0.33, -0.12, 0.30), (0.06, 0.30, 0.24), b.mat("case", "#3B2A1E", 0.5)), ((-0.33, -0.12, 0.44), (0.02, 0.10, 0.03), metal)], "Briefcase")
    elif kind == "teen":
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.20, hoodie=True)
        b.hair(b.mat("hair", cfg["hair"], 0.7), "messy", cfg["hair"])
        hp = b.mat("hp", "#D94A3A", 0.5)
        b.prop("head", [((0, 0, 1.22), (0.38, 0.06, 0.03), hp)] + [((sx * 0.215, 0.0, 1.0), (0.03, 0.10, 0.12), hp) for sx in (-1, 1)], "Headphones")
        b.prop("hand.L", [((0.30, -0.16, 0.40), (0.07, 0.015, 0.13), dark), ((0.30, -0.168, 0.40), (0.06, 0.004, 0.11), b.mat("screen", "#9AD0FF", 0.3, emis=2.5))], "Phone")
    elif kind == "grandma":
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.20, coat=True, skirt=bottom)
        b.hair(b.mat("hair", cfg["hair"], 0.8), "grey", cfg["hair"])
        b.prop("chest", [((0, -0.095, 0.76), (0.24, 0.04, 0.06), b.mat("scarf", "#8A4A6A", 0.9))], "Scarf")
        bag = b.mat("bag", "#8A2A3A", 0.8)
        b.prop("hand.R", [((-0.40, 0.05, 0.25), (0.26, 0.20, 0.40), bag), ((-0.40, 0.12, 0.50), (0.025, 0.025, 0.28), metal, Euler((0.5, 0, 0)))] +
               [((-0.40 + sx * 0.12, 0.14, 0.05), (0.025, 0.08, 0.08), dark) for sx in (-1, 1)], "Trolley")
    elif kind == "scooter":
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.10, trouser=True)
        b.hair(b.mat("hair", cfg["hair"], 0.7), "short", cfg["hair"])
        cap = b.mat("cap", "#2A4A8A", 0.8)
        b.prop("head", [((0, 0.0, 1.215), (0.40, 0.38, 0.03), cap), ((0, -0.27, 1.20), (0.30, 0.18, 0.03), cap)], "Cap")
        deck = b.mat("deck", "#2A2A2E", 0.5)
        b.prop("hips", [((0, -0.05, 0.0), (0.16, 0.70, 0.03), deck), ((0, -0.42, 0.42), (0.03, 0.03, 0.84), metal), ((0, -0.42, 0.84), (0.40, 0.03, 0.03), metal),
                        ((0, -0.46, 0.06), (0.03, 0.10, 0.10), dark), ((0, 0.34, 0.06), (0.03, 0.10, 0.10), dark)], "Scooter")
    elif kind == "courier":
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.20)
        b.hair(b.mat("hair", cfg["hair"], 0.7), "buzz", cfg["hair"])
        b.prop("chest", [((0, 0.19, 0.62), (0.36, 0.22, 0.40), b.mat("thermo", "#E8C020", 0.7)), ((0, 0.31, 0.62), (0.30, 0.02, 0.30), b.mat("logo", "#1A1A1E", 0.6))] +
               [((sx * 0.11, 0.06, 0.70), (0.04, 0.10, 0.03), dark) for sx in (-1, 1)], "ThermoBag")
    else:   # simple background walker
        b.body(skin, skin_d, top, bottom, shoe, sole, sleeve_len=0.10)
        b.hair(b.mat("hair", cfg["hair"], 0.7), cfg.get("hairstyle", "short"), cfg["hair"])
    if cfg.get("face"): b.face(faces_dir + "\\face_%s_1024.png" % cfg["face"], cfg["skin"])
    else:   # pixel face (eyes + brows + mouth) for background walkers
        eye = b.mat("eye", "#1A1410", 0.5); mouth = b.mat("mouth", "#5A2A2A", 0.6)
        for sx in (-1, 1): b.box("head", (sx * 0.085, -0.194, 1.0), (0.05, 0.008, 0.05), eye); b.box("head", (sx * 0.085, -0.194, 1.058), (0.08, 0.008, 0.016), b.mat("brow", cfg["hair"], 0.7))
        b.box("head", (0, -0.194, 0.885), (0.08, 0.008, 0.016), mouth)
    rig = b.finish()
    return dict(rig=rig, props=b.props, kind=kind, k=cfg.get("k", 1.0))
