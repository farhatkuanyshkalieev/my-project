"""QA v2: (1) static camera runs > 6 frames (outside scene 7); (2) T/A-pose check on my arms (upper arm within 25 deg of
horizontal on both sides = flagged); (3) intersections holograms/Claude vs me (BVH, every 3rd frame); (4) Linear keys on me.
blender -b reel2_scene.blend --python qa_reel2.py"""
import bpy, json, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R = r"E:\3д Рилсики ЛоуПоли\reel01"; sc = bpy.context.scene
E = json.load(open(R + r"\animatic\events.json", encoding="utf-8")); SCN = {k: tuple(v) for k, v in E["scenes"].items()}
# 1 static camera
cam_of = {}
for a, b, n in E["cams"]:
    for f in range(a, b + 1): cam_of[f] = n
static = []; run = 0; prev = None
for f in range(0, E["fend"] + 1):
    sc.frame_set(f); co = bpy.data.objects[cam_of[f]]; st = (tuple(round(x, 4) for x in co.matrix_world.translation), tuple(round(x, 4) for x in co.matrix_world.to_euler()), round(co.data.lens, 2))
    if st == prev and cam_of[f] == cam_of.get(f - 1): run += 1
    else: run = 0
    if run > 6 and not (SCN["7"][0] <= f <= SCN["7"][1]): static.append(f)
    prev = st
# 2 T/A pose
rig = bpy.data.objects["VX_Rig"]; tpose = []
for f in range(0, E["fend"] + 1, 2):
    sc.frame_set(f); flat = 0
    for side in ("L", "R"):
        pb = rig.pose.bones["upper_arm." + side]; d = (rig.matrix_world @ pb.tail) - (rig.matrix_world @ pb.head); d.normalize()
        ang = math.degrees(math.asin(abs(d.z)))                 # 0 = horizontal, 90 = vertical
        if ang < 25: flat += 1
    if flat == 2: tpose.append(f)
# 3 intersections
dg = bpy.context.evaluated_depsgraph_get(); crig = bpy.data.objects["CL_Rig"]
me_obs = [o for o in rig.children_recursive if o.type == 'MESH' and not o.name.startswith(("FX_", "Me_Phone", "Me_PhoneScreen", "MouthCavity"))]
cl_obs = [o for o in crig.children_recursive if o.type == 'MESH' and o.name.startswith("Claude_") and not o.hide_render]
holo = [o for o in sc.objects if o.type == 'MESH' and o.name.startswith("Holo_") and o.name.endswith("_frame")]
def bvh(o):
    oe = o.evaluated_get(dg); m = oe.to_mesh(); mw = oe.matrix_world
    t = BVHTree.FromPolygons([mw @ v.co for v in m.vertices], [p.vertices[:] for p in m.polygons]); oe.to_mesh_clear(); return t
hits = {"holo_vs_me": [], "claude_vs_me": []}
for f in range(0, SCN["8"][0], 3):
    sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); mine = [(o, bvh(o)) for o in me_obs]
    for key, group in (("holo_vs_me", holo), ("claude_vs_me", cl_obs)):
        for o in group:
            if o.hide_render or o.matrix_world.to_scale().length < 0.05: continue
            t = bvh(o)
            for mo, mt in mine:
                if t.overlap(mt): hits[key].append((f, o.name, mo.name)); break
lin = 0
for idb in (rig, bpy.data.objects["PhotoFace"].data.shape_keys):
    for lay in idb.animation_data.action.layers:
        for st in lay.strips:
            for cb in st.channelbags:
                for fc in cb.fcurves: lin += sum(1 for k in fc.keyframe_points if k.interpolation == 'LINEAR')
out = dict(static_frames=static[:50], static_count=len(static), tpose_frames=tpose[:50], tpose_count=len(tpose),
           hits={k: v[:30] for k, v in hits.items()}, hit_counts={k: len(v) for k, v in hits.items()}, linear_keys_on_me=lin)
json.dump(out, open(R + r"\animatic\qa2.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("QA2", "static", len(static), "tpose", len(tpose), out["hit_counts"], "linear", lin)
