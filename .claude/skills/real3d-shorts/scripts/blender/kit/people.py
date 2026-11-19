# Люди: MPFB (MakeHuman CC0) + одежда-оболочки кодом (пуховик, шапка с отворотом, шарф, перчатки, щетина).
# Грабли: фигура MPFB хранится в шейпкеях → оболочки снимаем со СМЕШАННЫХ координат; привязки к костям — в REST.
import bpy, bmesh, math, os
from mathutils import Vector
from .core import coll, HOME
from . import mats


def _mpfb():
    from bl_ext.blender_org.mpfb.services.humanservice import HumanService
    from bl_ext.blender_org.mpfb.services.targetservice import TargetService
    from bl_ext.blender_org.mpfb.services.locationservice import LocationService
    return HumanService, TargetService, LocationService


def _asset(kind, name, ext):
    _, _, LS = _mpfb()
    d = os.path.join(LS.get_user_data(), kind, name)
    for f in os.listdir(d):
        if f.endswith(ext):
            return os.path.join(d, f)
    raise FileNotFoundError(d)


def human(name="Hero", gender=1.0, age=0.72, weight=0.58, muscle=0.6, height=0.55, race=(0.0, 0.05, 0.95),
          skin="middleage_caucasian_male", hair="short02", brows="eyebrow001",
          clothes=("male_worksuit01", "shoes06"), collection="Hero"):
    """Человек MPFB с риггом. age: 0.5≈25 лет, 0.72≈43, 0.9≈70. race = (african, asian, caucasian).
    Скины/волосы/одежда — из пакета MakeHuman (см. setup.md). Возвращает (rig, body)."""
    HS, TS, _ = _mpfb()
    macro = TS.get_default_macro_info_dict()
    macro.update({"gender": gender, "age": age, "muscle": muscle, "weight": weight, "height": height, "proportions": 0.6})
    macro["race"] = {"african": race[0], "asian": race[1], "caucasian": race[2]}
    body = HS.create_human(macro_detail_dict=macro, feet_on_ground=True, scale=0.1)
    body.name = name
    HS.set_character_skin(_asset("skins", skin, ".mhmat"), body, skin_type="ENHANCED_SSS")
    HS.add_builtin_rig(body, "default")
    items = [("eyes", "high-poly", "Eyes"), ("eyebrows", brows, "Eyebrows"), ("eyelashes", "eyelashes02", "Eyelashes"),
             ("teeth", "teeth_base", "Teeth"), ("tongue", "tongue01", "Tongue")]
    if hair:
        items.append(("hair", hair, "Hair"))
    items += [("clothes", c, "Clothes") for c in clothes]
    for kind, nm, t in items:
        try:
            HS.add_mhclo_asset(_asset(kind, nm, ".mhclo"), body, asset_type=t, subdiv_levels=1)
        except Exception as e:
            print("asset fail", kind, nm, e)
    rig = body.parent
    rig.name = name + "Rig"
    c = coll(collection)
    for o in [rig] + list(rig.children_recursive):
        o["hero"] = name
        for uc in list(o.users_collection):
            uc.objects.unlink(o)
        c.objects.link(o)
    return rig, body


def mixed_coords(ob):
    me = ob.data
    co = [v.co.copy() for v in me.vertices]
    if me.shape_keys:
        basis = me.shape_keys.reference_key
        for kb in me.shape_keys.key_blocks:
            if kb == basis or kb.mute or kb.value == 0.0:
                continue
            for i, p in enumerate(kb.data):
                co[i] += (p.co - basis.data[i].co) * kb.value
    return co


def dominant_bones(ob, rig):
    names = {g.index: g.name for g in ob.vertex_groups}
    bones = {b.name for b in rig.data.bones}
    out = []
    for v in ob.data.vertices:
        best, bw = "", 0.0
        for g in v.groups:
            n = names[g.group]
            if n in bones and g.weight > bw:
                best, bw = n, g.weight
        out.append(best)
    return out


def _quilt_group(amp, period):
    name = f"GN_Quilt_{amp:.3f}_{period:.3f}"
    if name in bpy.data.node_groups:
        return bpy.data.node_groups[name]
    g = bpy.data.node_groups.new(name, "GeometryNodeTree")
    g.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    g.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = g.nodes, g.links
    gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")
    rest = N.new("GeometryNodeInputNamedAttribute")
    rest.data_type = "FLOAT_VECTOR"
    rest.inputs["Name"].default_value = "rest_position"
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(rest.outputs["Attribute"], sep.inputs[0])
    m = N.new("ShaderNodeMath")
    m.operation = "MULTIPLY"
    m.inputs[1].default_value = math.pi / period
    L.new(sep.outputs["Z"], m.inputs[0])
    s = N.new("ShaderNodeMath")
    s.operation = "SINE"
    L.new(m.outputs[0], s.inputs[0])
    a = N.new("ShaderNodeMath")
    a.operation = "ABSOLUTE"
    L.new(s.outputs[0], a.inputs[0])
    p = N.new("ShaderNodeMath")
    p.operation = "POWER"
    p.inputs[1].default_value = 0.55
    L.new(a.outputs[0], p.inputs[0])
    k = N.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    k.inputs[1].default_value = amp
    L.new(p.outputs[0], k.inputs[0])
    nrm = N.new("GeometryNodeInputNormal")
    sc = N.new("ShaderNodeVectorMath")
    sc.operation = "SCALE"
    L.new(nrm.outputs[0], sc.inputs[0])
    L.new(k.outputs[0], sc.inputs["Scale"])
    sp = N.new("GeometryNodeSetPosition")
    L.new(gi.outputs[0], sp.inputs["Geometry"])
    L.new(sc.outputs[0], sp.inputs["Offset"])
    L.new(sp.outputs[0], go.inputs[0])
    return g


def shell(body, rig, name, keep, offset, thick, mat, subsurf=1, smooth=0, quilt=None, mixed=None):
    """Оболочка-одежда: копия тела, оставлены вершины keep(co, bone, v); сглаживание → скелет → сдвиг → толщина."""
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    me = body.data.copy()
    me.name = name
    ob = bpy.data.objects.new(name, me)
    for c in body.users_collection:
        c.objects.link(ob)
    ob.parent = rig
    co = mixed or mixed_coords(body)
    dom = dominant_bones(body, rig)
    if me.shape_keys:
        ob.shape_key_clear()
    for i, v in enumerate(me.vertices):
        v.co = co[i]
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    hg = body.vertex_groups["body"].index
    kill = [v for v in bm.verts
            if not (any(g.group == hg and g.weight > 0.5 for g in body.data.vertices[v.index].groups)
                    and keep(co[v.index], dom[v.index], body.data.vertices[v.index]))]
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(mat)
    for p in me.polygons:
        p.material_index = 0
        p.use_smooth = True
    ob.add_rest_position_attribute = True
    if smooth:
        sm = ob.modifiers.new("Relax", "SMOOTH")
        sm.factor, sm.iterations = 0.9, smooth
    ob.modifiers.new("Armature", "ARMATURE").object = rig
    d = ob.modifiers.new("Offset", "DISPLACE")
    d.direction, d.mid_level, d.strength = "NORMAL", 0.0, offset
    if subsurf:
        s = ob.modifiers.new("Sub", "SUBSURF")
        s.levels = s.render_levels = subsurf
    if quilt:
        ob.modifiers.new("Quilt", "NODES").node_group = _quilt_group(*quilt)
    if thick:
        so = ob.modifiers.new("Thick", "SOLIDIFY")
        so.thickness, so.offset = thick, -1
    ob["hero"] = body.get("hero", body.name)
    return ob


def _bone_head(rig, n):
    return rig.matrix_world @ rig.data.bones[n].head_local


def outfit_winter(rig, body, parka_col=(0.075, 0.088, 0.04), hat_col=(0.16, 0.018, 0.028),
                  scarf_col=(0.09, 0.095, 0.11), pants_col=(0.03, 0.032, 0.04), stubble=True):
    """Зимний комплект: стёганый пуховик, шапка-бини с отворотом, шарф в два оборота, кожаные перчатки, щетина.
    Волосы прячутся (под шапкой). Возвращает dict объектов."""
    pp = rig.data.pose_position
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    co = mixed_coords(body)
    hg = body.vertex_groups["body"].index
    top = max(co[v.index].z for v in body.data.vertices if any(g.group == hg and g.weight > 0.5 for g in v.groups))
    neck_z = _bone_head(rig, "neck01").z
    ears = body.vertex_groups["ears"].index
    lips = body.vertex_groups["lips"].index
    torso = {"spine01", "spine02", "spine03", "spine04", "spine05", "breast.L", "breast.R", "clavicle.L", "clavicle.R",
             "shoulder01.L", "shoulder01.R", "pelvis.L", "pelvis.R", "root", "neck01"}
    arms = {f"{p}.{s}" for p in ("upperarm01", "upperarm02", "lowerarm01", "lowerarm02") for s in "LR"}
    is_ear = lambda v: any(g.group == ears and g.weight > 0.1 for g in v.groups)
    out = {}

    def parka_keep(c, b, v):
        return b in arms or ((b in torso or b.startswith("upperleg01")) and 0.84 < c.z < neck_z + 0.035)

    out["Parka"] = shell(body, rig, "Parka", parka_keep, 0.026, 0.005, mats.parka(col=parka_col), 2, 12, (0.011, 0.085), co)
    out["Gloves"] = shell(body, rig, "Gloves", lambda c, b, v: b.startswith(("wrist", "finger", "metacarpal")),
                          0.0035, 0.002, mats.leather(), 1, 2, None, co)
    hat = mats.knit("M_Beanie", hat_col, 260.0)

    def edge(c):
        back = min(max((c.y + 0.02) / 0.1, 0.0), 1.0)
        return top - 0.086 - 0.06 * back

    out["Beanie"] = shell(body, rig, "Beanie", lambda c, b, v: not is_ear(v) and c.z > edge(c), 0.03, 0.006, hat, 2, 4, None, co)
    out["BeanieCuff"] = shell(body, rig, "BeanieCuff", lambda c, b, v: not is_ear(v) and edge(c) - 0.004 < c.z < edge(c) + 0.05,
                              0.042, 0.01, hat, 2, 4, None, co)
    if stubble:
        out["Stubble"] = shell(body, rig, "Stubble",
                               lambda c, b, v: not is_ear(v) and not any(g.group == lips and g.weight > 0.1 for g in v.groups)
                               and c.y < 0.035 and top - 0.255 < c.z < top - 0.165 and not (c.y < -0.07 and c.z > top - 0.175),
                               0.0008, 0.0, mats.stubble(), 1, 0, None, co)
    # шарф: два сплющенных тора вокруг шеи, привязаны к кости шеи (в позе покоя!)
    sm = mats.knit("M_Scarf", scarf_col, 70.0)
    c = _bone_head(rig, "neck01")
    for nm, dz, tilt, rad, rz in (("Scarf", -0.01, -16, 0.112, 0), ("ScarfWrap2", 0.045, -7, 0.098, 40)):
        old = bpy.data.objects.get(nm)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
        bpy.ops.mesh.primitive_torus_add(major_radius=rad, minor_radius=0.036, major_segments=48, minor_segments=16,
                                         location=(c.x, c.y + 0.012, c.z - 0.02 + dz))
        o = bpy.context.object
        o.name = nm
        for v in o.data.vertices:
            r2 = Vector((v.co.x, v.co.y, 0))
            ring = r2.normalized() * rad if r2.length > 1e-6 else r2
            d = v.co - ring
            v.co = ring + Vector((d.x * 0.55, d.y * 0.55, d.z * 1.7))
        o.rotation_euler = (math.radians(tilt), 0, math.radians(rz))
        tx = bpy.data.textures.get("ScarfFolds") or bpy.data.textures.new("ScarfFolds", "STUCCI")
        tx.noise_scale = 0.06
        dm = o.modifiers.new("Folds", "DISPLACE")
        dm.texture, dm.strength = tx, 0.012
        s = o.modifiers.new("Sub", "SUBSURF")
        s.levels, s.render_levels = 1, 2
        o.data.materials.append(sm)
        for p in o.data.polygons:
            p.use_smooth = True
        bpy.context.view_layer.update()
        mw = o.matrix_world.copy()
        o.parent, o.parent_type, o.parent_bone = rig, "BONE", "neck01"
        o.matrix_world = mw
        for uc in list(o.users_collection):
            uc.objects.unlink(o)
        body.users_collection[0].objects.link(o)
        o["hero"] = body.get("hero", body.name)
        out[nm] = o
    # штаны (комбинезон из пакета) — тёмные; волосы под шапкой прячем
    for o in rig.children:
        if "worksuit" in o.name:
            o.data.materials.clear()
            o.data.materials.append(mats.simple("M_Pants", pants_col, 0.85))
        if o.name.endswith(("short02", "short01", "short03", "short04")):
            o.hide_render = True
    rig.data.pose_position = pp
    bpy.context.view_layer.update()
    return out
