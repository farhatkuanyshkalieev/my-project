"""QA (adapted from qa_reel2.py): static camera runs > 6 frames; Claude vs props/holograms intersections (BVH, every 3rd frame);
Claude legs hidden; mouth shapes >= 2 frames.   blender -b render/nv_scene.blend --python qa_nv.py"""
import bpy, json
from mathutils.bvhtree import BVHTree
R = "/home/user/my-project/reels/nvidia"; sc = bpy.context.scene
E = json.load(open(R + "/animatic/events.json", encoding="utf-8"))
cam_of = {}
for a, b, n in E["cams"]:
    for f in range(a, b + 1): cam_of[f] = n
static = []; run = 0; prev = None
for f in range(0, E["fend"] + 1):
    sc.frame_set(f); co = bpy.data.objects[cam_of[f]]
    st = (tuple(round(x, 4) for x in co.matrix_world.translation), tuple(round(x, 4) for x in co.matrix_world.to_euler()), round(co.data.lens, 2))
    run = run + 1 if (st == prev and cam_of[f] == cam_of.get(f - 1)) else 0
    if run > 6: static.append(f)
    prev = st
crig = bpy.data.objects["CL_Rig"]
cl_obs = [o for o in crig.children_recursive if o.type == 'MESH' and o.name.startswith("Claude_") and not o.name.startswith("Claude_Leg")]
others = [o for o in sc.objects if o.type in ('MESH', 'FONT') and (o.name.startswith(("Holo_", "GPU_", "Cash_", "Month_", "Bar_", "Chip", "Pedestal", "Grey_", "Logo_", "DC_Racks")))]
def bvh(o, dg):
    oe = o.evaluated_get(dg); m = oe.to_mesh(); mw = oe.matrix_world
    t = BVHTree.FromPolygons([mw @ v.co for v in m.vertices], [p.vertices[:] for p in m.polygons]); oe.to_mesh_clear(); return t
hits = []
for f in range(0, E["fend"] + 1, 3):
    sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
    mine = [bvh(o, dg) for o in cl_obs]
    for o in others:
        if o.hide_render or o.matrix_world.to_scale().length < 0.05: continue
        t = bvh(o, dg)
        if any(t.overlap(m) for m in mine): hits.append((f, o.name))
legs = [o.name for o in crig.children_recursive if o.name.startswith("Claude_Leg") and not o.hide_render]
out = dict(static_frames=static[:50], static_count=len(static), claude_hits=hits[:40], hit_count=len(hits), legs_visible=legs,
           mouth_min_hold=E.get("mouth_min_hold"))
json.dump(out, open(R + "/animatic/qa.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("QA static", len(static), "hits", len(hits), hits[:12], "legs", legs, "mouth_min_hold", E.get("mouth_min_hold"))
