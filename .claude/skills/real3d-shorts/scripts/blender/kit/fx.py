# Эффекты: пар изо рта, снегопад, рентген-конечность с сосудами, «жар» на лице, иней на материале.
import bpy, bmesh, math, random
from mathutils import Vector
from .core import coll, link, fcurves
from . import mats

rng = random.Random(11)


# ───────── пар ─────────
def _puff_mat():
    m = bpy.data.materials.get("M_Puff") or bpy.data.materials.new("M_Puff")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (0.86, 0.9, 1.0, 1)
    pv.inputs["Anisotropy"].default_value = 0.3
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ln = nt.nodes.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    nt.links.new(tc.outputs["Object"], ln.inputs[0])
    fall = nt.nodes.new("ShaderNodeMapRange")
    fall.inputs["From Min"].default_value, fall.inputs["From Max"].default_value = 0.25, 1.0
    fall.inputs["To Min"].default_value, fall.inputs["To Max"].default_value = 1.0, 0.0
    nt.links.new(ln.outputs[1], fall.inputs["Value"])
    aw = nt.nodes.new("ShaderNodeAttribute")
    aw.attribute_type, aw.attribute_name = "OBJECT", "puff_w"
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "4D"
    noise.inputs["Scale"].default_value = 3.5
    noise.inputs["Detail"].default_value = 6
    noise.inputs["Roughness"].default_value = 0.6
    noise.inputs["Distortion"].default_value = 0.6
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(aw.outputs["Fac"], noise.inputs["W"])
    shp = nt.nodes.new("ShaderNodeMapRange")
    shp.inputs["From Min"].default_value, shp.inputs["From Max"].default_value = 0.38, 0.68
    nt.links.new(noise.outputs["Fac"], shp.inputs["Value"])
    m1 = nt.nodes.new("ShaderNodeMath")
    m1.operation = "MULTIPLY"
    nt.links.new(shp.outputs[0], m1.inputs[0])
    nt.links.new(fall.outputs[0], m1.inputs[1])
    af = nt.nodes.new("ShaderNodeAttribute")
    af.attribute_type, af.attribute_name = "OBJECT", "puff_fade"
    m2 = nt.nodes.new("ShaderNodeMath")
    m2.operation = "MULTIPLY"
    nt.links.new(m1.outputs[0], m2.inputs[0])
    nt.links.new(af.outputs["Fac"], m2.inputs[1])
    m3 = nt.nodes.new("ShaderNodeMath")
    m3.operation = "MULTIPLY"
    m3.inputs[1].default_value = 16.0
    nt.links.new(m2.outputs[0], m3.inputs[0])
    nt.links.new(m3.outputs[0], pv.inputs["Density"])
    nt.links.new(pv.outputs[0], out.inputs["Volume"])
    return m


def breath(rig, f0, f1, period=1.3, puffs_per_breath=3):
    """Пар: на каждый выдох — клубы у рта, летят вбок-вперёд (не в камеру!), растут и тают.
    Позиция рта берётся из позы на кадре выдоха → вызывай ПОСЛЕ анимации и переносов героя."""
    c = coll("VFX")
    for o in [o for o in bpy.data.objects if o.name.startswith("Puff.")]:
        bpy.data.objects.remove(o, do_unlink=True)
    mat = _puff_mat()
    sc = bpy.context.scene
    fps = sc.render.fps
    t, i = f0 / fps - 0.5, 0
    while t * fps < f1:
        start = t * fps
        for k in range(puffs_per_breath):
            fs = start + k * 3 + rng.uniform(-1, 1)
            sc.frame_set(max(1, min(f1, int(fs))))
            hm = rig.matrix_world @ rig.pose.bones["head"].matrix
            mouth = hm @ Vector((0, -0.05, 0.11))  # Y — вверх по кости головы, Z — вперёд
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=mouth)
            o = bpy.context.object
            o.name = f"Puff.{i:03d}"
            o["volume"] = True
            i += 1
            o.data.materials.append(mat)
            o["puff_w"], o["puff_fade"] = rng.uniform(0, 50), 0.0
            side = rng.choice((-1, 1)) * rng.uniform(0.55, 0.9)
            fwd = (hm.to_3x3() @ Vector((0, 0, 1))).normalized()
            dirv = (Vector((side, 0, 0.15)) + fwd * 0.55).normalized()
            life = rng.uniform(34, 46)
            w0 = o["puff_w"]
            for f, s, fade, dist, rise in ((fs - 1, 0.012, 0.0, 0.0, 0.0), (fs + 3, 0.04, 1.0, 0.03, 0.0),
                                          (fs + life * 0.45, 0.085, 0.85, 0.13, 0.03), (fs + life, 0.16, 0.0, 0.26, 0.08)):
                o.location = mouth + dirv * dist + Vector((0, 0, rise))
                o.scale = (s * 1.3, s, s * 0.9)
                o["puff_fade"], o["puff_w"] = fade, w0 + 0.02 * (f - fs)
                for p in ("location", "scale", '["puff_fade"]', '["puff_w"]'):
                    o.keyframe_insert(p, frame=f)
            link(o, c)
        t += period * rng.uniform(0.9, 1.1)
    sc.frame_set(1)
    return i


# ───────── снег ─────────
def snow(f_end, center=(0, 1.5, 5.0), size=(14, 18), count=16000):
    c = coll("VFX")
    for n in ("SnowEmitter", "Flake"):
        o = bpy.data.objects.get(n)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.004, location=(0, 0, -50))
    fl = bpy.context.object
    fl.name = "Flake"
    fl.data.materials.append(mats.simple("M_Flake", (0.9, 0.94, 1.0), 0.5, emit=(0.7, 0.8, 1.0), strength=0.6))
    bpy.ops.mesh.primitive_plane_add(size=1, location=center)
    e = bpy.context.object
    e.name = "SnowEmitter"
    e.scale = (*size, 1)
    e.hide_render = True
    st = e.modifiers.new("Snow", "PARTICLE_SYSTEM").particle_system.settings
    st.count, st.frame_start, st.frame_end, st.lifetime = count, -260, f_end, 600
    st.emit_from, st.normal_factor, st.factor_random = "FACE", 0.0, 0.15
    st.effector_weights.gravity, st.brownian_factor = 0.035, 0.06
    st.render_type, st.instance_object = "OBJECT", fl
    st.size_random, st.use_rotations, st.rotation_factor_random = 0.6, True, 1.0
    link(fl, c)
    link(e, c)


# ───────── рентген ─────────
def _xskin():
    m = bpy.data.materials.get("M_XSkin") or bpy.data.materials.new("M_XSkin")
    m.use_nodes = True
    m.surface_render_method = "BLENDED"
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 1.6
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    heat = nt.nodes.new("ShaderNodeValue")
    heat.name = "Heat"
    cm = nt.nodes.new("ShaderNodeMix")
    cm.data_type = "RGBA"
    cm.inputs[6].default_value = (0.35, 0.65, 1.0, 1)
    cm.inputs[7].default_value = (1.0, 0.35, 0.18, 1)
    nt.links.new(heat.outputs[0], cm.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(cm.outputs[2], em.inputs["Color"])
    st = nt.nodes.new("ShaderNodeMath")
    st.operation = "MULTIPLY"
    st.inputs[1].default_value = 3.0
    nt.links.new(pw.outputs[0], st.inputs[0])
    nt.links.new(st.outputs[0], em.inputs["Strength"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader")
    al = nt.nodes.new("ShaderNodeMath")
    al.operation = "MULTIPLY"
    al.use_clamp = True
    al.inputs[1].default_value = 1.4
    nt.links.new(pw.outputs[0], al.inputs[0])
    nt.links.new(al.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    m.diffuse_color = (0.4, 0.65, 1.0, 0.35)
    return m


def _vessel_mat():
    m = bpy.data.materials.get("M_Vessel") or bpy.data.materials.new("M_Vessel")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["UV"], sep.inputs[0])
    flow = nt.nodes.new("ShaderNodeValue")
    flow.name = "Flow"
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 14.0
    nt.links.new(sep.outputs["X"], mul.inputs[0])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    nt.links.new(mul.outputs[0], add.inputs[0])
    nt.links.new(flow.outputs[0], add.inputs[1])
    sn = nt.nodes.new("ShaderNodeMath")
    sn.operation = "SINE"
    nt.links.new(add.outputs[0], sn.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["To Min"].default_value = -1, 0.35
    nt.links.new(sn.outputs[0], mr.inputs["Value"])
    glow = nt.nodes.new("ShaderNodeValue")
    glow.name = "Glow"
    st = nt.nodes.new("ShaderNodeMath")
    st.operation = "MULTIPLY"
    nt.links.new(mr.outputs[0], st.inputs[0])
    nt.links.new(glow.outputs[0], st.inputs[1])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.06, 0.04, 1)
    nt.links.new(st.outputs[0], em.inputs["Strength"])
    nt.links.new(em.outputs[0], out.inputs[0])
    m.diffuse_color = (1.0, 0.1, 0.06, 1)
    return m


def _curve(c, name, pts, depth, mat, origin, jitter=0.006):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth, cu.bevel_resolution, cu.use_fill_caps = depth, 3, True
    sp = cu.splines.new("NURBS")
    dense = []
    for a, b in zip(pts[:-1], pts[1:]):
        for k in range(4):
            p = a.lerp(b, k / 4)
            if dense:
                p += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * jitter
            dense.append(p)
    dense.append(pts[-1])
    sp.points.add(len(dense) - 1)
    for i, p in enumerate(dense):
        sp.points[i].co = (p.x, p.y, p.z, 1)
    sp.order_u, sp.use_endpoint_u = 3, True
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu)
    ob.location = origin
    c.objects.link(ob)
    return ob


def xray_limb(rig, body, side="R", origin=(30, 0, 0)):
    """Рентген-рука: полупрозрачная кожа (контур светится) + сосуды-кривые по костям + тёмный фон.
    Ставится в отдельную «студию» origin. Анимировать — xray_animate()."""
    c = coll("XRay")
    for o in list(c.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    O = Vector(origin)
    pp = rig.data.pose_position
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(body.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    rig.data.pose_position = pp
    bpy.context.view_layer.update()
    me.transform(body.matrix_world)
    sx = -1 if side == "R" else 1
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (v.co.x * sx > 0.12 and v.co.z > 0.95)], context="VERTS")
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(_xskin())
    for p in me.polygons:
        p.use_smooth = True
    arm = bpy.data.objects.new("XArm", me)
    arm.location = O
    arm.modifiers.new("Sub", "SUBSURF").render_levels = 2
    c.objects.link(arm)
    vm = _vessel_mat()
    B = rig.data.bones
    chain = lambda ns: [B[n].head_local.copy() for n in ns] + [B[ns[-1]].tail_local.copy()]
    trunk = chain([f"upperarm01.{side}", f"upperarm02.{side}", f"lowerarm01.{side}", f"lowerarm02.{side}", f"wrist.{side}"])
    vessels = [_curve(c, "VesselMain", [p + Vector((0.006 * -sx, -0.012, 0)) for p in trunk], 0.0075, vm, O),
               _curve(c, "VesselVein", [p + Vector((0.01 * sx, 0.012, 0.004)) for p in trunk], 0.005, vm, O)]
    for n in range(1, 6):
        names = ([f"metacarpal{n}.{side}"] if f"metacarpal{n}.{side}" in B else []) + [f"finger{n}-{k}.{side}" for k in (1, 2, 3)]
        vessels.append(_curve(c, f"VesselF{n}", [B[f"wrist.{side}"].head_local.copy()] + chain(names), 0.0032, vm, O, 0.003))
    for i in range(14):
        seg = rng.randrange(len(trunk) - 1)
        a = trunk[seg].lerp(trunk[seg + 1], rng.uniform(0.05, 0.95))
        d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized() * rng.uniform(0.03, 0.06)
        vessels.append(_curve(c, f"VesselB{i}", [a, a + d * 0.5 + Vector((0, 0, rng.uniform(-0.03, 0.03))), a + d], 0.0022, vm, O, 0.004))
    # фон-градиент
    bpy.ops.mesh.primitive_plane_add(size=6, location=O + Vector((0, 1.2, 1.2)), rotation=(math.radians(90), 0, 0))
    bd = bpy.context.object
    bd.name = "XBackdrop"
    bm_ = bpy.data.materials.get("M_XBack") or bpy.data.materials.new("M_XBack")
    bm_.use_nodes = True
    nt = bm_.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.45, 0.45, 0.45)
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    gr = nt.nodes.new("ShaderNodeTexGradient")
    gr.gradient_type = "SPHERICAL"
    nt.links.new(mp.outputs[0], gr.inputs[0])
    rp = nt.nodes.new("ShaderNodeValToRGB")
    rp.color_ramp.elements[0].color = (0, 0, 0, 1)
    rp.color_ramp.elements[1].color = (0.02, 0.05, 0.1, 1)
    nt.links.new(gr.outputs[0], rp.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(rp.outputs[0], em.inputs[0])
    nt.links.new(em.outputs[0], out.inputs[0])
    bm_.diffuse_color = (0.02, 0.04, 0.08, 1)
    bd.data.materials.append(bm_)
    link(bd, c)
    pts = {"shoulder": trunk[0] + O, "wrist": B[f"wrist.{side}"].head_local + O, "fingers": B[f"finger3-3.{side}"].tail_local + O}
    return arm, vessels, pts


def xray_animate(vessels, segments):
    """segments = [(кадр, heat 0..1, glow, flow_phase, толщина_множитель), …] — ключи всего рентгена."""
    heat = bpy.data.materials["M_XSkin"].node_tree.nodes["Heat"].outputs[0]
    vn = bpy.data.materials["M_Vessel"].node_tree.nodes
    glow, flow = vn["Glow"].outputs[0], vn["Flow"].outputs[0]
    base = {o.name: o.data.bevel_depth for o in vessels}
    for f, h, g, ph, k in segments:
        heat.default_value, glow.default_value, flow.default_value = h, g, ph
        for sock in (heat, glow, flow):
            sock.keyframe_insert("default_value", frame=f)
        for o in vessels:
            o.data.bevel_depth = base[o.name] * k
            o.data.keyframe_insert("bevel_depth", frame=f)


# ───────── «жар», иней ─────────
def flush_light(loc, keys):
    """Тёплый красный свет «изнутри» на лицо. keys = [(кадр, энергия), …]."""
    fl = bpy.data.objects.get("FlushLight")
    if not fl:
        bpy.ops.object.light_add(type="POINT")
        fl = bpy.context.object
        fl.name = "FlushLight"
        link(fl, coll("Lights"))
    fl.data.color, fl.data.shadow_soft_size, fl.location = (1.0, 0.35, 0.22), 0.2, loc
    fl.data.animation_data_clear()
    for f, e in keys:
        fl.data.energy = e
        fl.data.keyframe_insert("energy", frame=f)
    return fl


def frost(mat_name, keys):
    """Иней поверх материала (белые пятна по шуму). keys = [(кадр, 0..1), …]."""
    m = bpy.data.materials[mat_name]
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    base = tuple(b.inputs["Base Color"].default_value)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 90
    noise.inputs["Detail"].default_value = 10
    nt.links.new(tc.outputs["Object"], noise.inputs[0])
    val = nt.nodes.new("ShaderNodeValue")
    val.name = "FrostAmount"
    thr = nt.nodes.new("ShaderNodeMapRange")
    nt.links.new(noise.outputs[0], thr.inputs["Value"])
    nt.links.new(val.outputs[0], thr.inputs["From Max"])
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(thr.outputs[0], inv.inputs[1])
    cl = nt.nodes.new("ShaderNodeMath")
    cl.operation, cl.use_clamp = "MULTIPLY", True
    cl.inputs[1].default_value = 1.6
    nt.links.new(inv.outputs[0], cl.inputs[0])
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type = "RGBA"
    mx.inputs[6].default_value = base
    mx.inputs[7].default_value = (0.85, 0.9, 0.98, 1)
    nt.links.new(cl.outputs[0], mx.inputs[0])
    nt.links.new(mx.outputs[2], b.inputs["Base Color"])
    for f, v in keys:
        val.outputs[0].default_value = v
        val.outputs[0].keyframe_insert("default_value", frame=f)
