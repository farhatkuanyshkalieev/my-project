"""NVIDIA reel — scene build.  blender -b Template_Room.blend --python nv_build.py -- [stills f,f,..] [res=540] [out=DIR] [nosave]
Claude-only narration: night room (gaming GPU) -> voxel data centre (money, quarter, aisle, x2 bars, chip, "?", green logo).
Reuses the skill libraries unchanged: vx_lib (blocks/materials), anim_lib (tracks/robo/noise), lipsync_lib (visemes),
face_visemes.build_claude_mouth (pixel mouth), eevee_presets."""
import bpy, sys, os, json, math, random, time
from mathutils import Vector, Matrix, Quaternion, Euler
t0 = time.time()
SK = "/root/.claude/skills/voxel-reel"; RP = "/home/user/my-project/reels/nvidia"; DP = RP + "/render"
sys.path.insert(0, SK + "/scripts/lib")
import anim_lib as A, lipsync_lib as L
exec(open(SK + "/scripts/lib/vx_lib.py", encoding="utf-8").read())
exec(open(SK + "/scripts/lib/face_visemes.py", encoding="utf-8").read())
exec(open(SK + "/scripts/lib/eevee_presets.py", encoding="utf-8").read())
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
sc = bpy.context.scene; FPS = 30; random.seed(11)
T = json.load(open(RP + "/audio/timing.json", encoding="utf-8")); env = L.Env(RP + "/audio/voice_timeline.wav")
WD = T["words"]
def wf(lid, i, end=False): return int(round(WD[lid][i][2 if end else 1] * FPS))
SCN = {s[0].split()[0]: (int(round(s[1] * FPS)), int(round(s[2] * FPS)) - 1) for s in T["scenes"]}
FEND = SCN["9"][1]; FR = range(0, FEND + 1)
EV = []
def ev(kind, f, **kw): EV.append(dict(kind=kind, f=int(f), **kw))
def bump(f, c, a, b):
    if f < c - a or f > c + b: return 0.0
    return A.ease((f - (c - a)) / a) if f < c else 1 - A.ease((f - c) / b)

# ======================= key frames from the words =======================
F_115 = wf("C1", 0); F_MONTH = wf("C1", 4)                        # "115" / "месяца"
F_NEVER = wf("C2", 1); F_EARN = wf("C2", 5); F_Q = wf("C2", 9)      # "невероятно" / "заработала" / "квартал"
F_GAMER = wf("C3", 10); F_CARDS = wf("C3", 8)                       # "геймеров" / "видеокартами"
F_CHANGE = wf("C4", 2); F_AI = wf("C4", 5)                          # "изменилось" / "искусственного"
F_DC = SCN["5"][0]                                                  # cut to the data centre
F_NN = wf("C5", 6); F_GPT = wf("C5", 8); F_BUILD = wf("C5", 10); F_DCW = wf("C5", 12)
F_GROW = wf("C6", 5)                                                # "расти"
F_REV = wf("C7", 4); F_X2 = wf("C7", 10); F_LAST = wf("C7", 16)    # "выручка" / "два" / "годом"
F_PLAYER = wf("C8", 6); F_IND = wf("C8", 9)                         # "игроков" / "индустрии"
F_NEW = wf("C9", 7); F_Q2 = wf("C10", 0); F_LEAD = wf("C10", 5)     # "этапом" / "Сможет" / "лидерство"
F_LOGO = wf("C11", 9)                                              # "логотипа" (зелёного = 9)
F_GREEN = wf("C11", 8)
F_END_FREE = int(round((T["total"] - 1.6) * FPS))                   # last 1.6 s stay free for the plate
for f in (F_115, F_Q, F_CARDS, F_AI, F_NN, F_GPT, F_DCW, F_GROW, F_X2, F_PLAYER, F_LEAD, F_GREEN): ev("pop", f)
GLITCH = [F_CHANGE - 1, F_CHANGE, F_CHANGE + 3, F_CHANGE + 4, F_DC - 2, F_DC - 1]
for g in GLITCH: ev("glitch", g)
ev("flash", F_DC); ev("whoosh", F_DC - 6); ev("impact", F_115); ev("impact", F_X2); ev("rise", F_REV - 10, dur=F_X2 - F_REV + 10)
ev("riser", F_GREEN - 40, dur=40); ev("impact", F_GREEN)

# ======================= scene prep =======================
crig = bpy.data.objects["CL_Rig"]
for ob in (crig,):
    if ob.animation_data: ob.animation_data_clear()
    mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw; ob.rotation_mode = 'XYZ'
    for pb in ob.pose.bones:
        pb.matrix_basis = Matrix.Identity(4); pb.rotation_mode = 'XYZ'
        for c in list(pb.constraints): pb.constraints.remove(c)
for o in crig.children_recursive:
    if o.animation_data: o.animation_data_clear()
for n in ("Room_Volume", "Window_Glass", "Cam_FaceCheck"):
    o = bpy.data.objects.get(n)
    if o: o.hide_render = True
for cn in ("FX", "Face_Expressions"):
    c = bpy.data.collections.get(cn)
    if c: c.hide_render = True; c.hide_viewport = True
# Claude_Companion lives inside Voxel_Avatar: hide only the hero's own objects
for o in bpy.data.collections["Voxel_Avatar"].objects: o.hide_render = True; o.hide_viewport = True
HERO_HIDDEN = set(bpy.data.collections["Voxel_Avatar"].objects)
# the chair stays (empty gaming chair); nothing of the hero is rendered
talk = build_claude_mouth()
ROOM_OBS = [o for o in bpy.data.objects if o.type in ('MESH', 'LIGHT', 'CURVE', 'FONT') and o.users_collection and
            not any(c.name in ("Claude_Companion", "Claude_Expressions") or c.name.startswith("CL_") for c in o.users_collection)
            and o.name != "Light_Claude_Inner" and not o.hide_render]
sc.frame_set(1)

# ======================= Claude look (from r2_claude) =======================
for o in crig.children_recursive:
    if o.name.startswith("Claude_Leg"): o.hide_render = True; o.hide_viewport = True
clb = bpy.data.materials["CL_Body"]
for n in clb.node_tree.nodes:
    if n.type == 'GROUP':
        n.inputs["Color"].default_value = (*lin("#D97757"), 1); n.inputs["Emission"].default_value = 0.35; n.inputs["Roughness"].default_value = 0.65
clb.diffuse_color = (*lin("#D97757"), 1)
li = bpy.data.objects.get("Light_Claude_Inner")
if li: li.data.energy = 1.2

# ======================= materials =======================
GREEN = "#76B900"
def holo_mat(name, col, strength=4.0, alpha=0.85):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); e = nt.nodes.new("ShaderNodeEmission"); tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader"); e.inputs["Color"].default_value = (*lin(col), 1); e.inputs["Strength"].default_value = strength
    # scanlines along world Z
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs["Scale"].default_value = 18
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = alpha * 0.75; mr.inputs["To Max"].default_value = alpha
    nt.links.new(wv.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], mx.inputs["Fac"]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], o.inputs["Surface"])
    m.surface_render_method = 'BLENDED'; m.use_transparency_overlap = False; m.diffuse_color = (*lin(col), 1)
    return m
M_HG = holo_mat("Holo_Green", GREEN, 5.0); M_HO = holo_mat("Holo_Orange", "#D97757", 4.0); M_HW = holo_mat("Holo_White", "#EAF4E0", 3.0, 0.95)
M_RACK = vmat("DC_Rack", "#22252B", rough=0.45, metal=0.3, jitter=0.03, cell=0.1)
M_RACKF = vmat("DC_RackFront", "#15171B", rough=0.35, metal=0.4)
M_FLOOR = vmat("DC_Floor", "#3A3E46", rough=0.35, jitter=0.05, cell=0.6)
M_CEIL = vmat("DC_Ceil", "#1A1C20", rough=0.8)
M_TRAY = vmat("DC_Tray", "#5A6068", rough=0.5, metal=0.6)
M_LEDG = emat("DC_LED_G", GREEN, 18.0); M_LEDW = emat("DC_LED_W", "#CFE6FF", 10.0); M_LEDB = emat("DC_LED_B", "#4FB4FF", 12.0)
M_STRIP = emat("DC_Strip", "#E8F2FF", 6.0)
M_CASH = vmat("Cash", "#6F9E58", rough=0.75, jitter=0.05, cell=0.05); M_BAND = vmat("CashBand", "#E8D9A8", rough=0.6)
M_GPU = vmat("GPU_Shroud", "#2B2E33", rough=0.4, metal=0.5); M_GPUS = vmat("GPU_Silver", "#A9AEB5", rough=0.3, metal=0.8)
M_FAN = vmat("GPU_Fan", "#121316", rough=0.6); M_PCB = vmat("PCB", "#1E3B22", rough=0.6)
M_CHIPD = vmat("Chip_Die", "#0D0F10", rough=0.25, metal=0.6); M_GOLD = vmat("Pins", "#C9A24A", rough=0.3, metal=0.9)
M_GEM = emat("Green_Glow", GREEN, 12.0); M_RGB = emat("GPU_RGB", "#76B900", 8.0)
M_BAR0 = vmat("Bar_Old", "#59606B", rough=0.5, jitter=0.04, cell=0.1); M_BAR1 = vmat("Bar_New", "#5E9A1C", rough=0.45, emis=0.6, jitter=0.04, cell=0.1)
M_PED = vmat("Pedestal", "#2E3238", rough=0.4, metal=0.3); M_GREY = vmat("Grey_Block", "#4A4F57", rough=0.6, jitter=0.06, cell=0.1)

DCC = coll("DataCentre"); PROPS = coll("NV_Props"); HOLO = coll("NV_Holo")
def blocks_obj(name, items, mats, col, bevel=True, bw=0.004):
    b = Blocks()
    for it in items: b.box(*it)
    return b.obj(name, mats, col, bevel, bw)
def text_obj(name, body, size, mat, loc, rot=(90, 0, 0), extrude=0.02, align='CENTER', col=None):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = extrude; cu.align_x = align; cu.align_y = 'CENTER'
    cu.space_character = 1.05
    ob = bpy.data.objects.new(name, cu); (col or HOLO).objects.link(ob); cu.materials.append(mat)
    ob.location = Vector(loc); ob.rotation_euler = Euler([math.radians(a) for a in rot]); return ob
def key_vis(ob, f_on, f_off=None, pop=6, s1=1.0):
    """scale pop-in (overshoot) at f_on, pop-out at f_off; hidden outside"""
    base = ob.scale.copy() if "base_s" not in ob else Vector(ob["base_s"]); ob["base_s"] = tuple(base)
    def put(f, k, vis):
        ob.scale = base * max(k, 0.001); ob.keyframe_insert("scale", frame=f)
        ob.hide_render = not vis; ob.keyframe_insert("hide_render", frame=f)
    put(0, 0.001, False); put(f_on - 1, 0.001, False); put(f_on, 0.25, True); put(f_on + pop // 2, 1.18 * s1, True); put(f_on + pop, s1, True)
    if f_off:
        put(f_off - 5, s1, True); put(f_off - 2, 1.1 * s1, True); put(f_off, 0.001, True); put(f_off + 1, 0.001, False)
    A.set_interp(ob, 'CONSTANT', lambda p: p == "hide_render")

# ======================= data centre =======================
DC = Vector((-60.0, 0.0, 0.0))          # far left of the room, never visible from it
HALL_X = 6.0
def dcv(x, y, z): return DC + Vector((x, y, z))
# floor: raised tiles 0.6 m, every 3rd perforated (slightly darker)
fb = Blocks()
for ix in range(-10, 11):
    for iy in range(-12, 60):
        x, y = ix * 0.6, iy * 0.6; dark = (ix + iy) % 3 == 0
        fb.box(dcv(x, y, -0.03), (0.585, 0.585, 0.06), "#30343B" if dark else "#3D424A")
F_FLOOR = fb.obj("DC_FloorTiles", [vmat("DC_TileVC", "#FFFFFF", rough=0.35, attr="Col")], DCC, bevel=False)
cb = Blocks(); cb.box(dcv(0, 17, 4.2), (13.0, 76.0, 0.2), "#1A1C20")
for y in range(-6, 36, 2):
    cb.box(dcv(-1.6, y, 3.6), (0.5, 1.95, 0.08), "#5A6068"); cb.box(dcv(1.6, y, 3.6), (0.5, 1.95, 0.08), "#5A6068")
CEIL = cb.obj("DC_Ceiling", [vmat("DC_CeilVC", "#FFFFFF", rough=0.6, metal=0.3, attr="Col")], DCC, bevel=False)
# light strips in the ceiling over the aisles
sb = Blocks()
for y in range(-6, 36, 3):
    for x in (-3.2, 0.0, 3.2): sb.box(dcv(x, y, 4.08), (0.12, 2.4, 0.04), (1, 1, 1))
sb.obj("DC_LightStrips", M_STRIP, DCC, bevel=False)
# walls (dark) so the hall closes
wb = Blocks()
wb.box(dcv(-6.6, 17, 2.1), (0.2, 76, 4.4), "#1C1E23"); wb.box(dcv(6.6, 17, 2.1), (0.2, 76, 4.4), "#1C1E23")
wb.box(dcv(0, -7.4, 2.1), (13.4, 0.2, 4.4), "#1C1E23"); wb.box(dcv(0, 35.4, 2.1), (13.4, 0.2, 4.4), "#121317")
wb.obj("DC_Walls", [vmat("DC_WallVC", "#FFFFFF", rough=0.8, attr="Col")], DCC, bevel=False)
# racks: two rows along the aisle (y 3..15) + rows framing the two halls
RACK_W, RACK_D, RACK_H = 0.6, 1.0, 2.1
RACKS = []
def rack_row(x, y0, n, face):     # face = +1: front looks to +x, -1: to -x
    for i in range(n): RACKS.append((x, y0 + i * (RACK_W + 0.02), face))
rack_row(-1.25, 3.0, 20, +1); rack_row(1.25, 3.0, 20, -1)
rack_row(-4.4, -6.0, 66, +1); rack_row(4.4, -6.0, 66, -1)
rb = Blocks(); frb = Blocks(); led = {"g": Blocks(), "w": Blocks(), "b": Blocks()}
rng = random.Random(3)
for x, y, face in RACKS:
    rb.box(dcv(x, y, RACK_H / 2), (RACK_D, RACK_W, RACK_H), "#22252B")
    fx = x + face * (RACK_D / 2 + 0.005)
    frb.box(dcv(fx, y, RACK_H / 2), (0.01, RACK_W - 0.06, RACK_H - 0.08), "#15171B")
    for k in range(14):                       # server units with LEDs
        z = 0.12 + k * 0.135
        frb.box(dcv(fx + face * 0.012, y, z), (0.014, RACK_W - 0.1, 0.1), "#2A2E35")
        for j in range(rng.randint(2, 5)):
            kind = rng.choices("gwb", (6, 2, 1))[0]
            led[kind].box(dcv(fx + face * 0.024, y - 0.22 + j * 0.05 + rng.uniform(-0.005, 0.005), z + rng.uniform(-0.02, 0.02)), (0.012, 0.022, 0.018), (1, 1, 1))
rb.obj("DC_Racks", M_RACK, DCC, bevel=False); frb.obj("DC_RackFronts", [vmat("DC_RackFrontVC", "#FFFFFF", rough=0.35, metal=0.4, attr="Col")], DCC, bevel=False)
LED_OBS = {k: v.obj("DC_LEDs_" + k, {"g": M_LEDG, "w": M_LEDW, "b": M_LEDB}[k], DCC, bevel=False) for k, v in led.items()}
# lights: cool area lights along the ceiling + green fill
DC_LIGHTS = []
def mklight(name, kind, loc, energy, color, size=1.0, rot=(0, 0, 0), spot=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = lin(color) if isinstance(color, str) else color
    if kind == 'AREA': ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = size * 3
    if kind == 'SPOT' and spot: ld.spot_size = math.radians(spot); ld.spot_blend = 0.6
    if kind in ('POINT', 'SPOT'): ld.shadow_soft_size = size
    ob = bpy.data.objects.new(name, ld); DCC.objects.link(ob); ob.location = Vector(loc); ob.rotation_euler = Euler([math.radians(a) for a in rot]); DC_LIGHTS.append(ob); return ob
for y in range(-6, 36, 6):
    mklight("DC_Area_%d" % y, 'AREA', dcv(0, y, 3.95), 260, "#DCEBFF", 1.4).data.use_shadow = False
mklight("DC_Green_A", 'POINT', dcv(0, -1.5, 0.6), 60, GREEN, 0.5)
mklight("DC_Green_B", 'POINT', dcv(0, 24, 0.8), 90, GREEN, 0.5)

# ---------- stage A (y -6..2): money stacks + three months ----------
STACKS = []
sb_rng = random.Random(9)
for ix in range(-4, 5):
    for iy in range(0, 4):
        if abs(ix) < 1 and iy < 1: continue
        b = Blocks(); h = sb_rng.randint(6, 16)
        for k in range(h):
            b.box((0, 0, 0.025 + k * 0.05), (0.32, 0.15, 0.045), "#6F9E58")
            if k % 4 == 1: b.box((0, 0, 0.025 + k * 0.05), (0.06, 0.155, 0.047), "#E8D9A8")
        ob = b.obj("Cash_%d_%d" % (ix, iy), [vmat("CashVC", "#FFFFFF", rough=0.75, attr="Col")], PROPS)
        ob.location = dcv(ix * 0.45, -2.2 + iy * 0.32, 0.0); ob.rotation_euler.z = math.radians(sb_rng.uniform(-6, 6))
        STACKS.append((ob, abs(ix) * 2 + iy * 3))
for ob, d in STACKS:                                   # grow up from the floor, wave from the centre, on "115"
    f0 = F_115 - 6 + d
    for f, k in ((0, 0.001), (f0, 0.001), (f0 + 5, 1.12), (f0 + 8, 0.96), (f0 + 10, 1.0)):
        ob.scale = (1, 1, k); ob.keyframe_insert("scale", frame=f)
    ob.scale = (1, 1, 1); ob.keyframe_insert("scale", frame=SCN["2"][1])
H_115 = text_obj("Holo_115", "$115 МЛРД", 0.36, M_HG, dcv(0, -1.35, 1.55)); key_vis(H_115, F_115, SCN["2"][0] + 20)
H_3M = text_obj("Holo_3M", "ЗА 3 МЕСЯЦА", 0.16, M_HW, dcv(0, -1.35, 1.22)); key_vis(H_3M, F_MONTH - 2, SCN["2"][0] + 20)
MONTHS = []
for i in range(3):
    ob = blocks_obj("Month_%d" % i, [(Vector((0, 0, 0.3)), (0.5, 0.5, 0.6), "#2E3238"), (Vector((0, -0.252, 0.3)), (0.4, 0.01, 0.4), "#76B900")],
                    [vmat("MonthVC", "#FFFFFF", rough=0.4, attr="Col")], PROPS)
    ob.location = dcv(-0.8 + i * 0.8, -1.6, 0.0); MONTHS.append(ob)
    t = text_obj("Holo_M%d" % i, "%d" % (i + 1), 0.3, M_HW, dcv(-0.8 + i * 0.8, -1.88, 0.3)); key_vis(t, F_EARN - 6 + i * 7, SCN["3"][0])
    key_vis(ob, F_EARN - 8 + i * 7, SCN["3"][0])
H_Q = text_obj("Holo_Q", "1 КВАРТАЛ", 0.26, M_HG, dcv(0, -1.6, 1.25)); key_vis(H_Q, F_Q - 2, SCN["3"][0])
# the cash stacks sink when the months come in
for ob, d in STACKS:
    f0 = F_EARN - 14 + d // 3
    ob.scale = (1, 1, 1); ob.keyframe_insert("scale", frame=f0); ob.scale = (1, 1, 0.001); ob.keyframe_insert("scale", frame=f0 + 8)

# ---------- room: the gaming graphics card (scene 3-4) ----------
CARD_C = Vector((0.55, 0.35, 1.18))        # floats above the rug, in front of the desk
CARD_PARTS = []
def card_part(name, items, mats):
    ob = blocks_obj(name, items, mats, PROPS); CARD_PARTS.append(ob); return ob
card_part("GPU_Shroud", [((0, 0, 0), (0.95, 0.13, 0.36), "#4A4F57"), ((0, -0.066, 0.15), (0.95, 0.01, 0.04), "#A9AEB5"),
                         ((0, -0.066, -0.15), (0.95, 0.01, 0.04), "#A9AEB5"), ((0.49, 0, 0), (0.03, 0.14, 0.3), "#A9AEB5")],
          [vmat("GPUVC", "#FFFFFF", rough=0.4, metal=0.5, attr="Col")])
card_part("GPU_PCB", [((0, 0.075, -0.01), (0.97, 0.02, 0.40), "#1E3B22"), ((-0.15, 0.075, -0.215), (0.45, 0.022, 0.03), "#C9A24A")],
          [vmat("PCBVC", "#FFFFFF", rough=0.6, attr="Col")])
card_part("GPU_RGBStrip", [((0, -0.07, 0.185), (0.8, 0.012, 0.012), (1, 1, 1))], M_RGB)
FANS = []
for i, x in enumerate((-0.3, 0.0, 0.3)):
    b = Blocks()
    b.box((0, 0, 0), (0.07, 0.03, 0.07), "#3A3D42")
    for k in range(7):
        a = k * 2 * math.pi / 7; R = Euler((0, a, 0)).to_matrix()
        b.box(R @ Vector((0.07, 0, 0)), (0.11, 0.012, 0.035), "#121316", rot=Euler((0, a + 0.35, 0)))
    ring = b
    for k in range(16):
        a = k * 2 * math.pi / 16
        ring.box(Vector((0.135 * math.cos(a), 0.004, 0.135 * math.sin(a))), (0.05, 0.016, 0.05), "#A9AEB5", rot=Euler((0, -a, 0)))
    ob = b.obj("GPU_Fan_%d" % i, [vmat("FanVC", "#FFFFFF", rough=0.6, attr="Col")], PROPS); ob.location = (x, -0.075, 0.0); FANS.append(ob); CARD_PARTS.append(ob)
ROOM_KEY = bpy.data.lights.new("NV_RoomKey", 'AREA'); ROOM_KEY.energy = 55; ROOM_KEY.size = 1.2; ROOM_KEY.color = lin("#FFE2C8")
rk = bpy.data.objects.new("NV_RoomKey", ROOM_KEY); PROPS.objects.link(rk); rk.location = CARD_C + Vector((-0.6, -1.6, 1.0)); look_at(rk, CARD_C)
RG = bpy.data.lights.new("NV_RoomGreen", 'POINT'); RG.energy = 25; RG.color = lin("#76B900"); RG.shadow_soft_size = 0.3
rg = bpy.data.objects.new("NV_RoomGreen", RG); PROPS.objects.link(rg); rg.location = CARD_C + Vector((0.3, -0.5, -0.35))
CARD = bpy.data.objects.new("GPU_Card", None); PROPS.objects.link(CARD); CARD.location = CARD_C
for ob in CARD_PARTS: ob.parent = CARD
H_GAME = text_obj("Holo_Gamers", "ДЛЯ ГЕЙМЕРОВ", 0.085, M_HO, CARD_C + Vector((0, -0.25, 0.34)), col=HOLO); key_vis(H_GAME, F_CARDS, SCN["4"][0] + 12)
H_AI = text_obj("Holo_AI", "ИИ", 0.24, M_HG, CARD_C + Vector((-0.15, -0.45, 0.62)), col=HOLO); key_vis(H_AI, F_AI - 1, F_DC)
# the card: hovers, slow yaw, fans spin; scene 4: rises, shakes, the parts fly apart in green
F_BREAK = F_AI + 12
for f in range(SCN["3"][0] - 2, F_DC + 2):
    t = f / FPS; up = 0.35 * A.ease_in(min(1, max(0, (f - F_CHANGE) / 20)))
    CARD.location = CARD_C + Vector((0, 0, 0.015 * math.sin(t * 2.2) + up)); CARD.keyframe_insert("location", frame=f)
    sh = (0.04 * math.sin(f * 2.7) if F_CHANGE + 10 < f < F_BREAK else 0)
    CARD.rotation_euler = (sh, 0.05 * math.sin(t * 1.3), math.radians(-18 + 14 * math.sin(t * 0.6))); CARD.keyframe_insert("rotation_euler", frame=f)
for i, fo in enumerate(FANS):
    for f in (SCN["3"][0] - 2, F_DC + 2):
        fo.rotation_euler = (0, (f - SCN["3"][0]) * 0.55 * (1 if i % 2 else -1), 0); fo.keyframe_insert("rotation_euler", frame=f)
    A.set_interp(fo, 'LINEAR')
rng2 = random.Random(4)
for ob in CARD_PARTS:
    base = ob.location.copy(); d = Vector((rng2.uniform(-1, 1), rng2.uniform(0.0, 1.0), rng2.uniform(-0.2, 1))).normalized() * rng2.uniform(0.6, 1.1)
    for f in (0, F_BREAK):
        ob.location = base; ob.keyframe_insert("location", frame=f); ob.rotation_euler = ob.rotation_euler; ob.keyframe_insert("rotation_euler", frame=f)
    ob.location = base + d; ob.keyframe_insert("location", frame=F_DC)
    ob.rotation_euler = Euler((rng2.uniform(-2, 2), rng2.uniform(-2, 2), rng2.uniform(-2, 2))); ob.keyframe_insert("rotation_euler", frame=F_DC)
# green voxel burst where the card breaks
BURST = []
bb = Blocks()
for k in range(90):
    v = Vector((rng2.gauss(0, 1), rng2.gauss(0, 1), rng2.gauss(0, 1))).normalized() * rng2.uniform(0.02, 0.15)
    bb.box(v, (0.05, 0.05, 0.05), (1, 1, 1))
BUR = bb.obj("GPU_Burst", M_GEM, PROPS, bevel=False)
for f, k, vis in ((0, 0.01, False), (F_BREAK - 1, 0.01, False), (F_BREAK, 0.3, True), (F_DC, 4.0, True), (F_DC + 1, 4.0, False)):
    BUR.location = CARD_C + Vector((0, 0, 0.35)); BUR.scale = (k, k, k); BUR.keyframe_insert("scale", frame=f); BUR.hide_render = not vis; BUR.keyframe_insert("hide_render", frame=f)
A.set_interp(BUR, 'CONSTANT', lambda p: p == "hide_render")

# ---------- aisle holograms (scene 5) ----------
AISLE_HOLO = [("Holo_NN", "НЕЙРОСЕТИ", F_NN - 1, 5.2), ("Holo_GPT", "ChatGPT", F_GPT - 1, 8.6), ("Holo_DCW", "ДАТА-ЦЕНТРЫ", F_DCW - 2, 12.0)]
for name, body, f, y in AISLE_HOLO:
    ob = text_obj(name, body, 0.26, M_HG, dcv(0, y, 2.35), rot=(90, 0, 0)); key_vis(ob, f, SCN["6"][0])
# "спрос растёт": green arrow up made of blocks, in the aisle
ab = Blocks()
for k in range(8): ab.box((0, 0, k * 0.1), (0.1, 0.1, 0.1), (1, 1, 1))
for r in range(1, 4):
    for s in (-1, 1): ab.box((s * r * 0.1, 0, 0.7 - r * 0.1), (0.1, 0.1, 0.1), (1, 1, 1))
ARROW = ab.obj("Holo_Arrow", M_HG, HOLO, bevel=False); ARROW.location = dcv(0, 15.2, 1.2); ARROW.rotation_euler = (0, 0, 0)
key_vis(ARROW, F_GROW - 8, SCN["6"][0] + 2)
for f in range(F_GROW - 8, SCN["6"][0] + 3):
    ARROW.location = dcv(0, 15.2, 1.0 + 0.6 * A.ease((f - F_GROW + 8) / 25)); ARROW.keyframe_insert("location", frame=f)

# ---------- stage B (y 18..34): bars x2, chip, "?", logo ----------
BAR_C = dcv(0, 20.0, 0)
def bar(name, h, mat_hex, x):
    b = Blocks()
    for k in range(int(h / 0.1)): b.box((0, 0, 0.05 + k * 0.1), (0.5, 0.5, 0.098), mat_hex)
    ob = b.obj(name, [vmat(name + "VC", "#FFFFFF", rough=0.45, attr="Col", emis=0.25 if "New" in name else 0.0)], PROPS); ob.location = BAR_C + Vector((x, 0, 0)); return ob
BAR_OLD = bar("Bar_Old", 1.0, "#59606B", -0.55); BAR_NEW = bar("Bar_New", 2.2, "#5E9A1C", 0.55)
key_vis(BAR_OLD, F_REV - 14, SCN["7"][0] + 4)
for f, k in ((0, 0.001), (F_REV - 6, 0.001), (F_REV + 2, 0.45), (F_X2 - 8, 0.48), (F_X2, 1.08), (F_X2 + 4, 0.98), (F_X2 + 7, 1.0), (SCN["7"][0], 1.0), (SCN["7"][0] + 6, 0.001)):
    BAR_NEW.scale = (1, 1, k); BAR_NEW.keyframe_insert("scale", frame=f)
BAR_NEW.hide_render = True; BAR_NEW.keyframe_insert("hide_render", frame=0); BAR_NEW.hide_render = False; BAR_NEW.keyframe_insert("hide_render", frame=F_REV - 6)
BAR_NEW.hide_render = True; BAR_NEW.keyframe_insert("hide_render", frame=SCN["7"][0] + 7); A.set_interp(BAR_NEW, 'CONSTANT', lambda p: p == "hide_render")
H_YA = text_obj("Holo_YearAgo", "ГОД НАЗАД", 0.11, M_HW, BAR_C + Vector((-0.55, -0.4, 0.18))); key_vis(H_YA, F_REV - 10, SCN["7"][0] + 4)
H_NOW = text_obj("Holo_Now", "СЕЙЧАС", 0.11, M_HW, BAR_C + Vector((0.55, -0.4, 0.18))); key_vis(H_NOW, F_REV - 4, SCN["7"][0] + 4)
H_X2 = text_obj("Holo_X2", "×2", 0.55, M_HG, BAR_C + Vector((0.0, -0.3, 2.75))); key_vis(H_X2, F_X2, SCN["7"][0] + 4)
# chip on a pedestal (scene 7), grey blocks around it
CHIP_C = dcv(0, 24.0, 0)
ped = blocks_obj("Pedestal", [((0, 0, 0.2), (0.9, 0.9, 0.4), "#2E3238"), ((0, 0, 0.42), (1.0, 1.0, 0.04), "#76B900")], [vmat("PedVC", "#FFFFFF", rough=0.4, metal=0.3, attr="Col")], PROPS)
ped.location = CHIP_C
cbk = Blocks()
cbk.box((0, 0, 0), (0.7, 0.7, 0.06), "#1E3B22"); cbk.box((0, 0, 0.05), (0.42, 0.42, 0.05), "#0D0F10")
for k in range(10):
    for s in (-1, 1):
        cbk.box((-0.3 + k * 0.066, s * 0.37, 0), (0.03, 0.06, 0.02), "#C9A24A"); cbk.box((s * 0.37, -0.3 + k * 0.066, 0), (0.06, 0.03, 0.02), "#C9A24A")
CHIP = cbk.obj("Chip", [vmat("ChipVC", "#FFFFFF", rough=0.3, metal=0.6, attr="Col")], PROPS)
die = blocks_obj("Chip_Glow", [((0, 0, 0.08), (0.3, 0.3, 0.012), (1, 1, 1))], M_GEM, PROPS, bevel=False); die.parent = CHIP
for f in range(SCN["7"][0] - 2, FEND + 1):
    u = A.ease(min(1, max(0, (f - SCN["7"][0] - 4) / 40)))
    CHIP.location = CHIP_C + Vector((0, 0, 0.5 + 0.9 * u + 0.02 * math.sin(f / 9)))
    CHIP.rotation_euler = (math.radians(70 * u), 0, math.radians(f * 0.9)); CHIP.keyframe_insert("location", frame=f); CHIP.keyframe_insert("rotation_euler", frame=f)
gb = Blocks(); g_rng = random.Random(21)
for k in range(26):
    a = k / 26 * 2 * math.pi; r = g_rng.uniform(1.3, 2.4)
    gb.box((r * math.cos(a), r * math.sin(a), 0.1 + g_rng.uniform(0, 0.35)), (0.25, 0.25, 0.2 + g_rng.uniform(0, 0.7)), "#4A4F57")
GREYS = gb.obj("Grey_Blocks", [vmat("GreyVC", "#FFFFFF", rough=0.6, attr="Col")], PROPS); GREYS.location = CHIP_C
rb2 = Blocks()
for k in range(36):
    a = k / 36 * 2 * math.pi; rb2.box((0.95 * math.cos(a), 0.95 * math.sin(a), 0), (0.06, 0.06, 0.06), (1, 1, 1))
RING = rb2.obj("Holo_Ring", M_HG, HOLO, bevel=False); RING.location = CHIP_C + Vector((0, 0, 1.4)); key_vis(RING, F_PLAYER - 2, SCN["8"][0] + 30)
for f in range(F_PLAYER - 2, SCN["8"][0] + 31):
    RING.rotation_euler = (0, 0, f * 0.05); RING.keyframe_insert("rotation_euler", frame=f)
H_TOP = text_obj("Holo_Top", "ГЛАВНЫЙ ИГРОК", 0.13, M_HG, CHIP_C + Vector((0, -0.9, 2.35))); key_vis(H_TOP, F_PLAYER, SCN["8"][0] + 6)
# big voxel "?" (scene 8)
QM = [".###.", "#...#", "....#", "...#.", "..#..", "..#..", ".....", "..#.."]
qb = Blocks()
for r, row in enumerate(QM):
    for c, ch in enumerate(row):
        if ch == "#": qb.box(((c - 2) * 0.16, 0, (len(QM) - 1 - r) * 0.16), (0.155, 0.155, 0.155), (1, 1, 1))
QMARK = qb.obj("Holo_Question", M_HO, HOLO, bevel=False); QMARK.location = CHIP_C + Vector((0.0, 1.4, 1.1))
key_vis(QMARK, F_Q2 - 4, SCN["9"][0] + 4)
for f in range(F_Q2 - 4, SCN["9"][0] + 5):
    QMARK.rotation_euler = (0, 0, math.radians(12 * math.sin(f / 14))); QMARK.keyframe_insert("rotation_euler", frame=f)
H_NEW = text_obj("Holo_NewStage", "НОВЫЙ ЭТАП", 0.14, M_HW, CHIP_C + Vector((0, -0.9, 2.35))); key_vis(H_NEW, F_NEW - 4, F_Q2 + 10)
H_LEAD = text_obj("Holo_Lead", "ЛИДЕРСТВО?", 0.13, M_HG, CHIP_C + Vector((0, -0.9, 2.35))); key_vis(H_LEAD, F_LEAD - 2, SCN["9"][0] + 4)
# green logo-sign on the far wall (scene 9): a glowing voxel chip emblem + name
LOGO_C = dcv(0, 33.8, 2.0)
lb = Blocks()
for ix in range(-6, 7):
    for iz in range(-6, 7):
        ring_ = max(abs(ix), abs(iz))
        if ring_ in (6, 3) or (ring_ < 3 and (ix + iz) % 2 == 0): lb.box((ix * 0.1, 0, iz * 0.1), (0.095, 0.08, 0.095), (1, 1, 1))
for k in range(-4, 5, 2):
    for s in (-1, 1): lb.box((k * 0.1, 0, s * 0.72), (0.05, 0.06, 0.12), (1, 1, 1)); lb.box((s * 0.72, 0, k * 0.1), (0.12, 0.06, 0.05), (1, 1, 1))
M_LOGO = emat("Logo_Glow", GREEN, 1.0)
LOGO = lb.obj("Logo_Emblem", M_LOGO, PROPS, bevel=False); LOGO.location = LOGO_C
H_NAME = text_obj("Logo_Name", "NVIDIA", 0.38, M_LOGO, LOGO_C + Vector((0, 0, -1.15)), extrude=0.04, col=PROPS)
logo_light = mklight("Logo_Light", 'AREA', LOGO_C + Vector((0, -0.6, 0)), 0.0, GREEN, 1.4, rot=(-90, 0, 0))
gem_node = [n for n in M_LOGO.node_tree.nodes if n.type == 'EMISSION'][0].inputs["Strength"]
for f, v in ((0, 0.4), (F_GREEN - 3, 0.6), (F_GREEN + 2, 40.0), (F_GREEN + 12, 14.0)):
    gem_node.default_value = v; gem_node.keyframe_insert("default_value", frame=f)
for f, v in ((0, 0), (F_GREEN - 1, 0), (F_GREEN + 3, 900), (F_GREEN + 12, 300)):
    logo_light.data.energy = v; logo_light.data.keyframe_insert("energy", frame=f)
# LEDs pulse: green LEDs dim and flash on beats in scene 8 ("стойки мигают") and on "растёт"
ledg = [n for n in M_LEDG.node_tree.nodes if n.type == 'EMISSION'][0].inputs["Strength"]
for f in range(0, FEND + 1, 3):
    v = 18.0
    if SCN["8"][0] <= f < SCN["9"][0]: v = 10 + 10 * (0.5 + 0.5 * math.sin(f / 6.0))
    if SCN["9"][0] <= f: v = 6.0 + 30 * bump(f, F_GREEN + 2, 2, 20)
    ledg.default_value = v; ledg.keyframe_insert("default_value", frame=f)

# ======================= location switch: room <-> data centre =======================
DC_ON = [(0, SCN["3"][0] - 1), (F_DC, FEND + 5)]
def in_dc(f): return any(a <= f <= b for a, b in DC_ON)
DC_OBS = [o for o in DCC.objects] + [o for o in PROPS.objects if not o.name.startswith(("GPU", "Holo_Gamers", "Holo_AI"))]
DC_OBS = [o for o in DC_OBS if o not in CARD_PARTS and o is not CARD and o is not BUR]
switch = sorted(set([0, SCN["3"][0], F_DC]))
for o in ROOM_OBS:
    for f in switch:
        vis = not in_dc(f)
        if o.type == 'LIGHT':
            o.hide_render = not vis; o.keyframe_insert("hide_render", frame=f)
        else:
            o.hide_render = not vis; o.keyframe_insert("hide_render", frame=f)
    A.set_interp(o, 'CONSTANT')
for o in DC_OBS:
    if o.animation_data and o.animation_data.action and any(fc.data_path == "hide_render" for fc in A.fcurves_of(o)): continue
    for f in switch:
        o.hide_render = not in_dc(f); o.keyframe_insert("hide_render", frame=f)
    A.set_interp(o, 'CONSTANT', lambda p: p == "hide_render")
for o in CARD_PARTS + [CARD, rk, rg]:
    for f in switch:
        o.hide_render = in_dc(f); o.keyframe_insert("hide_render", frame=f)
    A.set_interp(o, 'CONSTANT', lambda p: p == "hide_render")
# world: room world as is; in the data centre a little darker and cooler
wld = sc.world; bg = [n for n in wld.node_tree.nodes if n.type == 'BACKGROUND']
if bg:
    st = bg[0].inputs["Strength"]; c0 = st.default_value
    for f in switch:
        st.default_value = (c0 * 0.6) if in_dc(f) else c0; st.keyframe_insert("default_value", frame=f)
    A.set_interp(wld.node_tree, 'CONSTANT')

# ======================= Claude: route, robotic moves, stepped turns, face =======================
ROOM_CL = Vector((0.55, -0.15, 1.35))
CL_ROUTE = [  # (frame, world position)  — robotic hops between them
    (0, dcv(0.9, -4.6, 2.6)), (F_115 - 10, dcv(0.15, -2.75, 1.25)), (F_MONTH, dcv(-0.25, -2.85, 1.15)),
    (SCN["2"][0] + 6, dcv(-0.6, -2.6, 1.05)), (F_EARN - 4, dcv(-0.95, -2.35, 0.95)), (F_EARN + 10, dcv(0.0, -2.45, 1.0)), (F_Q - 4, dcv(0.85, -2.35, 1.05)),
    (SCN["3"][0], CARD_C + Vector((-0.75, -0.55, 0.15))), (F_CARDS - 6, CARD_C + Vector((-0.5, -0.6, 0.08))), (F_GAMER, CARD_C + Vector((0.5, -0.55, 0.12))),
    (SCN["4"][0] + 6, CARD_C + Vector((0.55, -0.6, 0.2))), (F_CHANGE + 6, CARD_C + Vector((0.7, -0.45, 0.55))), (F_AI + 6, CARD_C + Vector((0.75, -0.55, 0.15))),
    (F_DC, dcv(0.0, 2.4, 1.35)), (F_NN - 6, dcv(0.25, 4.6, 1.5)), (F_GPT - 6, dcv(-0.3, 8.0, 1.6)), (F_DCW - 6, dcv(0.25, 11.4, 1.5)),
    (F_GROW - 10, dcv(0.0, 14.4, 1.4)), (SCN["6"][0] + 4, BAR_C + Vector((-0.75, -1.7, 0.9))), (F_REV, BAR_C + Vector((-0.7, -1.6, 1.0))),
    (F_X2 - 12, BAR_C + Vector((0.15, -1.0, 1.3))), (F_X2 + 2, BAR_C + Vector((0.3, -1.0, 2.4))), (F_LAST, BAR_C + Vector((0.85, -1.5, 1.7))),
    (SCN["7"][0] + 8, CHIP_C + Vector((-0.9, -0.95, 1.2))), (F_PLAYER - 6, CHIP_C + Vector((1.3, -1.05, 1.75))), (F_IND, CHIP_C + Vector((0.8, -1.45, 1.6))),
    (SCN["8"][0] + 10, CHIP_C + Vector((-0.6, -1.25, 1.3))), (F_NEW, CHIP_C + Vector((-0.75, -1.0, 1.45))), (F_Q2, CHIP_C + Vector((-0.35, -1.25, 1.05))),
    (F_LEAD, CHIP_C + Vector((0.45, -1.2, 1.2))), (SCN["9"][0] - 30, CHIP_C + Vector((0.7, -0.9, 1.4))),
    (SCN["9"][0] + 6, LOGO_C + Vector((-0.55, -2.4, -0.75))), (F_GREEN - 6, LOGO_C + Vector((-0.6, -2.6, -0.65))), (F_END_FREE, LOGO_C + Vector((-0.7, -3.3, -0.6))),
]
def hop_time(f0, f1): return min(14, max(6, (f1 - f0) // 3))
def cl_pos_raw(f):
    keys = CL_ROUTE
    if f <= keys[0][0]: return keys[0][1]
    for (fa, pa), (fb, pb) in zip(keys, keys[1:]):
        if fa <= f < fb:
            if (fa < F_DC <= fb and fb == F_DC) or (fa < SCN["3"][0] <= fb and fb == SCN["3"][0]):
                return pa if f < fb else pb                     # location cut: jump
            ht = hop_time(fa, fb); s = fb - ht                   # hold, then a quick robotic hop with overshoot
            if f < s: return pa
            u = (f - s) / ht; u2 = u * u * u * (u * (6 * u - 15) + 10); ov = 1 + 0.06 * math.sin(math.pi * u) * (u > 0.6)
            return pa.lerp(pb, min(1.05, u2 * ov)) + Vector((0, 0, 0.12 * math.sin(math.pi * u)))
    return keys[-1][1]
# hold positions orbit a little (the "flies around while explaining" rule): small circle around each hold point
def cl_pos(f):
    p = cl_pos_raw(f)
    if SCN["9"][0] - 30 < f < SCN["9"][0] + 6 or SCN["3"][0] - 1 <= f <= SCN["3"][0] or F_DC - 1 <= f <= F_DC: pass
    t = f / FPS
    p = p + Vector((0.07 * math.sin(t * 1.9), 0.05 * math.cos(t * 1.4), 0.035 * math.sin(t * 2.6)))
    return p
POS = {f: cl_pos(f) for f in range(-2, FEND + 4)}
CAM_FACE = {}
def yaw_of(d): return math.degrees(math.atan2(d.x, -d.y))
CL_YAW = {}

# ======================= cameras =======================
CAMS = []; SHOTS = []
def mkcam(name, lens=35):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36; cd.clip_start = 0.03; cd.clip_end = 400
    cd.dof.use_dof = False
    co = bpy.data.objects.new(name, cd); sc.collection.objects.link(co); co.rotation_mode = 'XYZ'; return co
def shot(name, f0, f1, pos, tgt, lens, roll=lambda f: 0.0, shake=0.12, bursts=(), whip_out=False, whip_in=False, seed=0):
    SHOTS.append(dict(name=name, f0=f0, f1=f1, pos=pos, tgt=tgt, lens=lens if callable(lens) else (lambda f, v=lens: v), roll=roll, shake=shake, bursts=bursts, whip_out=whip_out, whip_in=whip_in, seed=seed))
    for f in range(f0, f1 + 1): CAM_FACE[f] = pos(f)
    if whip_in: ev("whoosh", f0 - 1)
def bake_cams():
    for s in SHOTS:
        co = mkcam(s["name"]); n1 = A.smooth_noise(s["seed"], s["shake"]); n2 = A.smooth_noise(s["seed"] + 1, s["shake"]); n3 = A.smooth_noise(s["seed"] + 2, s["shake"] * 0.6)
        bs = [A.burst(b[0], b[1], seed=s["seed"] + k) for k, b in enumerate(s["bursts"])]; prev = None; f0, f1 = s["f0"], s["f1"]
        for f in range(f0 - 1, f1 + 2):
            p = s["pos"](f); t = s["tgt"](f); q = (t - p).to_track_quat('-Z', 'Y') @ Quaternion((0, 0, 1), math.radians(s["roll"](f)))
            wy = 0.0
            if s["whip_out"] and f > f1 - 3: wy = -50 * A.ease_in((f - (f1 - 3)) / 3)
            if s["whip_in"] and f < f0 + 2: wy = 50 * (1 - A.ease_out((f - f0 + 1) / 3))
            b = sum(x(f) for x in bs)
            q = q @ Euler((math.radians(n1(f) + b), math.radians(n2(f) + wy + 0.6 * b), math.radians(n3(f))), 'XYZ').to_quaternion()
            e = q.to_euler('XYZ', prev) if prev else q.to_euler('XYZ'); prev = e
            co.location = p; co.rotation_euler = e; co.data.lens = s["lens"](f)
            co.keyframe_insert("location", frame=f); co.keyframe_insert("rotation_euler", frame=f); co.data.keyframe_insert("lens", frame=f)
        mk = sc.timeline_markers.new(s["name"], frame=f0); mk.camera = co; CAMS.append((f0, f1, co))
        A.set_interp(co, 'BEZIER'); A.set_interp(co.data, 'BEZIER')
def cl(f): return POS[max(-2, min(FEND + 3, f))]
def drift(f, amp=0.03, per=4.0, seed=0.0):
    t = f / FPS; return Vector((amp * math.sin(2 * math.pi * t / per + seed), amp * 0.6 * math.cos(2 * math.pi * t / (per * 1.3) + seed), amp * 0.5 * math.sin(2 * math.pi * t / (per * 0.8) + seed * 2)))
def lerpf(f, a, b): return min(1.0, max(0.0, (f - a) / max(1, b - a)))
S = SCN
# 1 HOOK: from darkness high above the stacks, crash zoom down onto Claude, then push in
def s1_pos(f):
    far = dcv(0.4, -6.6, 3.4); near = dcv(0.35, -4.15, 1.55)
    u = A.ease_in(lerpf(f, 0, 14)); k = min(1.04, u * 1.04) if f < 18 else 1.0
    p = far.lerp(near, k)
    return p + Vector((0.0, 0.45 * A.ease(lerpf(f, 18, S["1"][1])), -0.1 * lerpf(f, 18, S["1"][1]))) + drift(f, 0.02, 2.6)
def s1_tgt(f): return dcv(0, -2.2, 0.7).lerp(cl(f) + Vector((0, 0, -0.1)), A.ease(lerpf(f, 6, 24))).lerp(dcv(0, -1.4, 1.35), 0.35 * A.ease(lerpf(f, F_115, F_115 + 12)))
shot("Cam_S1", 0, S["1"][1], s1_pos, s1_tgt, lambda f: 18 + 10 * A.ease(lerpf(f, 0, 16)), shake=0.18, bursts=[(14, 1.6), (F_115, 2.2)], seed=1)
# 2 QUARTER: orbit 40 deg around the months + rise
def s2_pos(f):
    u = A.ease(lerpf(f, S["2"][0], S["2"][1])); a = math.radians(-115 + 40 * u); r = 3.0 - 0.4 * u
    c = dcv(0, -1.8, 0); return c + Vector((r * math.cos(a), r * math.sin(a), 1.05 + 0.6 * u)) + drift(f, 0.02, 3.1, 1)
def s2_tgt(f): return dcv(0, -1.7, 0.8).lerp(cl(f), 0.3)
shot("Cam_S2", S["2"][0], S["2"][1], s2_pos, s2_tgt, 30, shake=0.12, whip_out=True, seed=2)
# 3 GAMERS (room): dolly along the floating card, then down to a low angle
def s3_pos(f):
    u = A.ease(lerpf(f, S["3"][0], S["3"][1]))
    return CARD_C + Vector((-0.7 + 1.1 * u, -1.95 + 0.1 * u, 0.25 - 0.45 * u)) + drift(f, 0.015, 3.3, 2)
def s3_tgt(f): return CARD_C.lerp(cl(f), 0.5) + Vector((0, 0, 0.0))
shot("Cam_S3", S["3"][0], S["3"][1], s3_pos, s3_tgt, 32, shake=0.1, whip_in=True, seed=3)
# 4 CHANGED: crash-in on the card, shake, burst
def s4_pos(f):
    u = A.ease_in(lerpf(f, S["4"][0], F_CHANGE + 4)); w = CARD_C + Vector((0.9, -1.9, 0.2)); n = CARD_C + Vector((0.35, -1.25, 0.35))
    return w.lerp(n, min(1.04, u * 1.04)) + Vector((0, 0, 0.3 * A.ease(lerpf(f, F_CHANGE, F_DC)))) + drift(f, 0.02, 2.0, 3)
def s4_tgt(f): return (CARD_C + Vector((0, 0, 0.1 + 0.35 * A.ease_in(lerpf(f, F_CHANGE, F_CHANGE + 20))))).lerp(cl(f), 0.3)
shot("Cam_S4", S["4"][0], S["4"][1], s4_pos, s4_tgt, lambda f: 28 + 8 * A.ease_in(lerpf(f, S["4"][0], F_CHANGE + 4)), shake=0.2, bursts=[(F_CHANGE + 4, 2.0), (F_BREAK, 2.8)], seed=4)
# 5 AISLE: long dolly behind/beside Claude along the aisle, with a roll
def s5_pos(f): return Vector((cl(f).x - 0.35, cl(f).y - 1.15, cl(f).z + 0.2)).lerp(dcv(-0.3, cl(f).y - 1.2, 1.55), 0.5) + drift(f, 0.02, 3.5, 4)
def s5_tgt(f): return cl(f) + Vector((0, 1.4, 0.25))
shot("Cam_S5", S["5"][0], S["5"][1], s5_pos, s5_tgt, 24, roll=lambda f: 6 * math.sin((f - S["5"][0]) / 45), shake=0.12, whip_out=True, seed=5)
# 6 x2: crane up along the new bar
def s6_pos(f):
    u = A.ease(lerpf(f, S["6"][0], S["6"][1])); up = A.ease(lerpf(f, F_X2 - 14, F_X2 + 10))
    return BAR_C + Vector((1.1 - 0.6 * u, -3.2 + 0.4 * u, 0.6 + 1.6 * up)) + drift(f, 0.02, 3.0, 5)
def s6_tgt(f): return BAR_C + Vector((0, 0, 0.7 + 1.4 * A.ease(lerpf(f, F_X2 - 14, F_X2 + 6))))
shot("Cam_S6", S["6"][0], S["6"][1], s6_pos, s6_tgt, 28, shake=0.12, whip_in=True, bursts=[(F_X2, 1.8)], seed=6)
# 7 CHIP: orbit around the rising chip
def s7_pos(f):
    u = (f - S["7"][0]) / max(1, S["7"][1] - S["7"][0]); a = math.radians(-130 + 70 * A.ease(u))
    return CHIP_C + Vector((2.7 * math.cos(a), 2.7 * math.sin(a), 1.2 + 0.5 * u)) + drift(f, 0.02, 3.3, 6)
def s7_tgt(f): return CHIP_C + Vector((0, 0, 1.1 + 0.3 * A.ease(lerpf(f, S["7"][0], S["7"][0] + 40))))
shot("Cam_S7", S["7"][0], S["7"][1], s7_pos, s7_tgt, 30, shake=0.1, seed=7)
# 8 NEW STAGE?: slow push on Claude + drift, the "?" behind
def s8_pos(f):
    u = A.ease(lerpf(f, S["8"][0], S["8"][1]))
    return CHIP_C + Vector((0.9 - 1.0 * u, -3.3 + 0.9 * u, 1.35 - 0.1 * u)) + drift(f, 0.035, 4.2, 7)
def s8_tgt(f): return cl(f).lerp(CHIP_C + Vector((0, 1.0, 1.4)), 0.45)
shot("Cam_S8", S["8"][0], S["8"][1], s8_pos, s8_tgt, lambda f: 30 + 6 * A.ease(lerpf(f, S["8"][0], S["8"][1])), shake=0.12, whip_out=True, seed=8)
# 9 LOGO: pull back + rise from the emblem
def s9_pos(f):
    u = A.ease(lerpf(f, S["9"][0], FEND)); return LOGO_C + Vector((-0.4 + 0.5 * u, -2.9 - 1.6 * u, -0.9 + 0.5 * u)) + drift(f, 0.02, 3.6, 8)
def s9_tgt(f): return LOGO_C + Vector((0, 0, -0.35)).lerp(cl(f) - LOGO_C, 0.2 * (1 - A.ease(lerpf(f, F_GREEN - 10, F_GREEN + 10))))
shot("Cam_S9", S["9"][0], FEND, s9_pos, s9_tgt, lambda f: 30 - 6 * A.ease(lerpf(f, S["9"][0], FEND)), shake=0.1, whip_in=True, bursts=[(F_GREEN, 1.2)], seed=9)

# ======================= bake Claude =======================
SPEECH = {lid: [(w, a, b) for w, a, b in WD[lid]] for lid in WD}
POINTS = {F_115: "R", F_EARN: "L", F_CARDS: "R", F_NN: "R", F_GPT: "L", F_DCW: "R", F_X2: "both", F_PLAYER: "L", F_LEAD: "R", F_GREEN: "both"}
ARM_AX = {b.name: (b.matrix_local.to_3x3().inverted() @ Vector((0, -1, 0))).normalized() for b in crig.data.bones if b.name.startswith("arm")}
def bake_claude():
    cur = 0.0
    for f in FR:
        v = (POS[f + 1] - POS[f - 1]) * FPS / 2
        cam = CAM_FACE.get(f)
        if v.length > 0.9: d = Vector((v.x, v.y, 0)); tilt = min(25, v.length * 5)
        else:
            d = (cam - POS[f]) if cam is not None else Vector((0, -1, 0)); d = Vector((d.x, d.y, 0)); tilt = 0
            if SCN["8"][0] + 20 < f < F_Q2: d = Quaternion((0, 0, 1), math.radians(40)) @ d      # looks aside: thinking
        want = yaw_of(d) if d.length > 1e-4 else cur
        diff = (want - cur + 180) % 360 - 180
        if abs(diff) > 7.5 and f % 2 == 0: cur += math.copysign(min(abs(diff), 15.0 * (2 if abs(diff) > 60 else 1)), diff)
        CL_YAW[f] = cur
        crig.location = POS[f]; crig.keyframe_insert("location", frame=f)
        crig.rotation_euler = (math.radians(tilt), 0, math.radians(cur)); crig.keyframe_insert("rotation_euler", frame=f)
    A.set_interp(crig, 'CONSTANT', lambda p: p == "rotation_euler"); A.set_interp(crig, 'BEZIER', lambda p: p == "location")
    # arms: idle small swing, robotic point-ups on the key words (rotation around local Y of the arm bones)
    for f in FR:
        t = f / FPS
        for side, sg in (("L", 1), ("R", -1)):
            a = 10 * math.sin(t * 2.4 + (0 if side == "L" else 1.3))
            for c, kind in POINTS.items():
                if kind in (side, "both"): a += 70 * bump(f, c, 4, 14)
            for bn, k in (("arm.%s.01" % side, 1.0), ("arm.%s.02" % side, 0.4)):
                pb = crig.pose.bones[bn]; pb.rotation_mode = 'QUATERNION'; ax = ARM_AX[bn]
                pb.rotation_quaternion = Quaternion(ax, sg * math.radians(a * k)); pb.keyframe_insert("rotation_quaternion", frame=f)
    for c in POINTS: ev("servo", c - 4, dur=4)
bake_claude()
# hops make a servo sound
for (fa, pa), (fb, pb) in zip(CL_ROUTE, CL_ROUTE[1:]):
    if (pb - pa).length > 0.2 and fb not in (F_DC, SCN["3"][0]): ev("servo", fb - hop_time(fa, fb), dur=hop_time(fa, fb))
# eyes: neutral / blink / thinking; pixel mouth from the visemes
FACESETS = {n: list(bpy.data.collections[c].objects) for n, c in (("neutral", "CL_Face_Neutral"), ("blink", "CL_Face_Blink"), ("think", "CL_Face_Thinking"), ("shock", "CL_Face_Shock"))}
think_eyes = [o for o in FACESETS["think"] if "eye" in o.name]; shock_eyes = [o for o in FACESETS["shock"] if "eye" in o.name]
for k in ("think", "shock"): FACESETS[k] = [o for o in FACESETS[k] if "eye" in o.name]   # their mouths would fight the talk mouth
BLINKS = list(range(20, FEND, 83)) + [F_DC + 3, SCN["3"][0] + 3, SCN["9"][0] + 4]
def face_at(f):
    if any(0 <= f - b < 2 for b in BLINKS): return "blink"
    if SCN["8"][0] + 20 < f < F_Q2 + 6: return "think"
    if F_CHANGE <= f < F_CHANGE + 18 or F_X2 <= f < F_X2 + 10: return "shock"
    return "neutral"
for obs in FACESETS.values():
    for o in obs:
        if o.animation_data: o.animation_data_clear()
last = None
for f in FR:
    st = face_at(f)
    if st == last: continue
    for k, obs in FACESETS.items():
        for o in obs: o.hide_render = o.hide_viewport = (k != st); o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
    last = st
for b in BLINKS: ev("beep", b)
mouths = {}
for o in talk.objects: mouths.setdefault(o["viseme"], []).append(o)
def show(cls, f):
    for v, obs in mouths.items():
        for o in obs: o.hide_render = o.hide_viewport = (v != cls); o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
show("X", 0)
eye = bpy.data.materials["CL_Eye_Talk"]; gi = [n for n in eye.node_tree.nodes if n.type == 'GROUP'][0].inputs["Color"]
c0 = tuple(gi.default_value)
def eyecol(k): gi.default_value = (c0[0] * k, c0[1] * k, c0[2] * k, 1)
def eyekey(f): gi.keyframe_insert("default_value", frame=f)
eyecol(1); eyekey(0)
MOUTH_LOG = []
for lid in WD:
    ph, wl = L.segments(SPEECH[lid], env)
    tr = L.frames(ph, SPEECH[lid]); MOUTH_LOG += tr
    for w, a, b, lv in L.stressed(wl, 0.3):
        tv = int(round(L.stress_vowel_time(w, a, b) * FPS)) - 1; eyecol(5); eyekey(tv); eyecol(1); eyekey(tv + 3)
MOUTH_LOG.sort(key=lambda r: r[0]); clean = []
for r in MOUTH_LOG:                       # one track for the whole reel: later shapes win, nothing shorter than 2 frames
    while clean and clean[-1][0] >= r[0]: clean.pop()
    if clean and r[0] - clean[-1][0] < 2: clean[-1] = (clean[-1][0], r[1], r[2]); continue
    clean.append(r)
MOUTH_LOG = clean
for f, cls, lv in MOUTH_LOG: show(cls, f)
for o in [o for obs in mouths.values() for o in obs]: A.set_interp(o, 'CONSTANT')
A.set_interp(eye.node_tree, 'CONSTANT')
# thinking / shock eye sets reuse the talk-eye material? no: they keep CL_Eye. Done.
bake_cams()
print("t scene", round(time.time() - t0))

# ======================= look / render settings =======================
apply_preset("FAST")
e = sc.eevee; e.taa_render_samples = 8; e.use_shadows = True
sc.render.use_motion_blur = False
sc.frame_start, sc.frame_end = 0, FEND; sc.render.fps = FPS; sc.camera = CAMS[0][2]
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'
os.makedirs(DP, exist_ok=True); os.makedirs(RP + "/animatic", exist_ok=True)
json.dump(dict(events=EV, scenes={k: v for k, v in SCN.items()}, cams=[(a, b, c.name) for a, b, c in CAMS], fend=FEND, glitch=GLITCH, flash=[F_DC],
               free_from=F_END_FREE, mouth_min_hold=min(b[0] - a[0] for a, b in zip(MOUTH_LOG, MOUTH_LOG[1:]) if b[0] > a[0]) if len(MOUTH_LOG) > 1 else 0),
          open(RP + "/animatic/events.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if "dbg" in argv: exec(open("/tmp/claude-0/t/dbg4.py").read())
if "nosave" not in argv: bpy.ops.wm.save_as_mainfile(filepath=DP + "/nv_scene.blend")
print("SCENE OK frames", FEND + 1, "cams", len(CAMS), "t", round(time.time() - t0))
res = int([a for a in argv if a.startswith("res=")][0][4:]) if any(a.startswith("res=") for a in argv) else 540
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = res, res * 16 // 9, 100
if "stills" in argv:
    outd = [a[4:] for a in argv if a.startswith("out=")]; outd = outd[0] if outd else DP + "/stills"
    os.makedirs(outd, exist_ok=True)
    if "wb" in argv: sc.render.engine = 'BLENDER_WORKBENCH'
    for f in [int(x) for x in argv[argv.index("stills") + 1].split(",")]:
        sc.frame_set(f)
        for a, b, c in CAMS:
            if a <= f <= b: sc.camera = c
        sc.render.filepath = outd + "/s_%04d.png" % f; t1 = time.time(); bpy.ops.render.render(write_still=True); print("STILL", f, round(time.time() - t1, 1))
print("DONE")
