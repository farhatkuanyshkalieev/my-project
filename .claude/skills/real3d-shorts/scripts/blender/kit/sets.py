# Локации: мир/HDRI, дымка-бокс, земля, дровяник, поленницы, ели, лес, комната, модели Poly Haven, ночной свет.
import bpy, bmesh, math, random
from mathutils import Vector
from .core import asset, coll, link
from . import mats

rng = random.Random(7)


def world(hdri="rogland_moonlit_night", strength=0.06):
    """HDRI-окружение. Объём в мир НЕ ставим — он глушит объектные объёмы в EEVEE (см. fog_box)."""
    w = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(asset("hdris", hdri), check_existing=True)
    nt.links.new(env.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    return w


def fog_box(center=(0, 5, 4), size=(90, 60, 8), density=0.0045, color=(0.55, 0.68, 1.0)):
    old = bpy.data.objects.get("FogBox")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    b = bpy.context.object
    b.name = "FogBox"
    b.scale = size
    m = bpy.data.materials.get("M_Fog") or bpy.data.materials.new("M_Fog")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (*color, 1)
    vol.inputs["Density"].default_value = density
    vol.inputs["Anisotropy"].default_value = 0.4
    nt.links.new(vol.outputs[0], out.inputs["Volume"])
    b.data.materials.append(m)
    b.display_type = "WIRE"
    b.hide_viewport = False
    b["volume"] = True  # аниматик прячет объёмы
    return link(b, coll("Env"))


def ground(name="Ground", origin=(0, 0, 0), size=40, kind="snow", flat_patch=None):
    """Земля со снегом (+гравий пятнами) или любым PBR: kind = snow | <имя текстуры Poly Haven>."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=origin)
    g = bpy.context.object
    g.name = name
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.subdivide(number_cuts=100)
    bpy.ops.uv.unwrap()
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in g.data.vertices:
        x, y = v.co.x, v.co.y
        v.co.z = 0.05 * math.sin(x * 0.9 + 1.3) * math.cos(y * 0.7) + 0.03 * math.sin(x * 2.3 + y * 1.7)
        if flat_patch and abs(x - flat_patch[0]) < flat_patch[2] and abs(y - flat_patch[1]) < flat_patch[2]:
            v.co.z *= 0.2
    if kind == "snow":
        m = bpy.data.materials.get("M_Ground")
        if not m:
            m = bpy.data.materials.new("M_Ground")
            m.use_nodes = True
            nt = m.node_tree
            nt.nodes.clear()
            out = nt.nodes.new("ShaderNodeOutputMaterial")
            s = mats.pbr_nodes(nt, "snow_02", 6, (0.82, 0.88, 1.0), 1.0, 0.5)
            gr = mats.pbr_nodes(nt, "rocky_gravel", 8, (0.55, 0.55, 0.6), 1.0, 0.6)
            noise = nt.nodes.new("ShaderNodeTexNoise")
            noise.inputs["Scale"].default_value = 1.6
            noise.inputs["Detail"].default_value = 8
            ramp = nt.nodes.new("ShaderNodeValToRGB")
            ramp.color_ramp.elements[0].position = 0.36
            ramp.color_ramp.elements[1].position = 0.44
            nt.links.new(noise.outputs[0], ramp.inputs[0])
            mix = nt.nodes.new("ShaderNodeMixShader")
            nt.links.new(ramp.outputs[0], mix.inputs[0])
            nt.links.new(gr.outputs[0], mix.inputs[1])
            nt.links.new(s.outputs[0], mix.inputs[2])
            nt.links.new(mix.outputs[0], out.inputs[0])
            m.diffuse_color = (0.85, 0.88, 0.95, 1)
            mats.pbr("M_Snow", "snow_02", scale=6, tint=(0.82, 0.88, 1.0), bump=0.5)
    else:
        m = mats.pbr("M_" + kind, kind, scale=size / 4)
    g.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return link(g, coll("Env"))


def box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.004, c="Env"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.cube_project(cube_size=1.0)
    bpy.ops.object.mode_set(mode="OBJECT")
    if bevel:
        bv = o.modifiers.new("bev", "BEVEL")
        bv.width = bevel
        bv.segments = 2
    o.data.materials.append(mat)
    return link(o, coll(c))


def log_mesh(name, r, length, split=0):
    """Полено вдоль оси Y; split: 0 — целое, 1 — половинка, 2 — четвертинка. Слоты: кора / торец / раскол."""
    bm = bmesh.new()
    seg = 20
    a1 = {0: 2 * math.pi, 1: math.pi, 2: math.pi / 2}[split]
    full = split == 0
    rings = []
    for k, y in enumerate((-length / 2, length / 2)):
        ring = []
        cnt = seg if full else seg // (2 if split == 1 else 4) + 1
        for i in range(cnt):
            t = a1 * i / (cnt if full else cnt - 1)
            rr = r * (1 + 0.06 * math.sin(3 * t + k) + rng.uniform(-0.03, 0.03))
            ring.append(bm.verts.new((rr * math.cos(t), y, rr * math.sin(t))))
        if not full:
            ring.append(bm.verts.new((0, y, 0)))
        rings.append(ring)
    n = len(rings[0])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[1])
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.material_index = 1 if len(p.vertices) > 4 else 0
        if not full and len(p.vertices) == 4:
            cx = sum(me.vertices[v].co.x for v in p.vertices) / 4
            cz = sum(me.vertices[v].co.z for v in p.vertices) / 4
            if abs(cx) < r * 0.55 and abs(cz) < r * 0.55:
                p.material_index = 2
    return me


def woodpile(center, width, height, depth, name="Logs", snow_top=True, c="Env"):
    """Аккуратная поленница: торцы к ±Y, без случайных наклонов (иначе «хаос»)."""
    bark = mats.pbr("M_Bark", "pine_bark", scale=1.5, tint=(0.75, 0.68, 0.62), bump=0.6)
    eg, sw = mats.endgrain(), mats.splitwood()
    cx, cy, cz = center
    z = cz
    objs = []
    while z < cz + height:
        x = cx - width / 2
        while x < cx + width / 2:
            r = rng.uniform(0.065, 0.085)
            me = log_mesh(f"{name}_m", r, depth * rng.uniform(0.92, 1.0), rng.choice((0, 0, 1, 2)))
            for m in (bark, eg, sw):
                me.materials.append(m)
            o = bpy.data.objects.new(name, me)
            o.location = (x + r, cy + rng.uniform(-0.04, 0.04), z + r)
            o.rotation_euler = (rng.uniform(-0.01, 0.01), rng.choice((0.0, math.pi)) + rng.uniform(-0.25, 0.25), 0.0)
            coll(c).objects.link(o)
            objs.append(o)
            x += 2 * r * rng.uniform(0.92, 1.0)
        z += 0.155
    if snow_top:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, z + 0.02))
        s = bpy.context.object
        s.name = name + "_Snow"
        s.scale = (width * 1.02, depth * 1.05, 0.06)
        bpy.ops.object.transform_apply(scale=True)
        s.modifiers.new("sub", "SUBSURF").levels = 3
        tx = bpy.data.textures.get("SnowLumps") or bpy.data.textures.new("SnowLumps", "CLOUDS")
        tx.noise_scale = 0.15
        d = s.modifiers.new("disp", "DISPLACE")
        d.texture = tx
        d.strength = 0.05
        s.data.materials.append(bpy.data.materials.get("M_Snow") or mats.pbr("M_Snow", "snow_02", 6, (0.82, 0.88, 1.0)))
        bpy.ops.object.shade_smooth()
        link(s, coll(c))
    return objs


def shed(origin=(0.6, 3.6, 0), W=4.2, D=1.6, H=2.5, lantern=True):
    """Дровяник: стойки, обвязка, стена из досок, наклонная крыша со снегом и сосульками, дрова внутри, фонарь."""
    ox, oy, _ = origin
    planks = mats.pbr("M_Planks", "weathered_planks", scale=1.0, tint=(0.55, 0.5, 0.48), bump=0.4)
    beam = mats.pbr("M_Beam", "weathered_planks", scale=0.6, tint=(0.35, 0.3, 0.28), bump=0.4)
    for sx in (-1, 0, 1):
        for sy in (-1, 1):
            h = H if sy < 0 else H - 0.35
            box("Post", (0.12, 0.12, h), (ox + sx * W / 2, oy + sy * D / 2, h / 2), beam)
    for sy, h in ((-1, H), (1, H - 0.35)):
        box("Girt", (W + 0.3, 0.14, 0.16), (ox, oy + sy * D / 2, h - 0.08), beam)
    n = 18
    for i in range(n):
        z = 0.1 + i * (H - 0.5) / n
        box("Board", (W, 0.025, (H - 0.5) / n - 0.012), (ox, oy + D / 2 + 0.05, z + 0.06), planks,
            rot=(rng.uniform(-0.01, 0.01), 0, rng.uniform(-0.004, 0.004)))
    tilt = math.atan2(0.35, D)
    for i in range(14):
        box("Rafter", (0.06, D + 0.7, 0.12), (ox - W / 2 - 0.2 + i * (W + 0.4) / 13, oy, H - 0.12), beam, rot=(-tilt, 0, 0))
    box("RoofSheet", (W + 0.6, D + 0.8, 0.03), (ox, oy, H - 0.02), mats.simple("M_RoofSnow", (0.75, 0.8, 0.9), 0.7), rot=(-tilt, 0, 0), bevel=0.01)
    ice = mats.simple("M_Ice", (0.7, 0.85, 1.0), 0.05)
    ice.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 0.8
    for i in range(22):
        L = rng.uniform(0.05, 0.28)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.018, radius2=0.0, depth=L,
                                        location=(ox - W / 2 + rng.uniform(0, W), oy - D / 2 - 0.37, H - 0.06 - L / 2), rotation=(math.pi, 0, 0))
        o = bpy.context.object
        o.name = "Icicle"
        o.data.materials.append(ice)
        link(o, coll("Env"))
    woodpile((ox, oy + 0.1, 0.0), W - 0.4, 1.7, 1.1, name="ShedLogs")
    if lantern:
        lx, ly = ox - W / 2 + 0.12, oy - D / 2 - 0.1
        box("LampBody", (0.14, 0.14, 0.22), (lx, ly, 2.0), mats.simple("M_LampMetal", (0.04, 0.04, 0.045), 0.4), bevel=0.01)
        box("LampGlass", (0.1, 0.1, 0.16), (lx, ly, 2.0), mats.simple("M_LampGlow", (1, 0.7, 0.35), 0.3, emit=(1.0, 0.62, 0.28), strength=25.0), bevel=0)
        bpy.ops.object.light_add(type="POINT", location=(lx, ly - 0.15, 2.0))
        L = bpy.context.object
        L.name = "LanternLight"
        L.data.energy = 140
        L.data.color = (1.0, 0.6, 0.3)
        L.data.shadow_soft_size = 0.08
        link(L, coll("Lights"))


def pines(origin=(0, 0, 0), count=16, area=((-9, 10), (7, 16)), height=(5, 10), c="Env", trunks=False):
    """Ели из конусов с шумом; снег на верхних гранях лап."""
    pine = mats.simple("M_PineDark", (0.02, 0.04, 0.035), 0.9)
    snowm = bpy.data.materials.get("M_Snow") or mats.pbr("M_Snow", "snow_02", 6, (0.82, 0.88, 1.0))
    tx = bpy.data.textures.get("PineTex") or bpy.data.textures.new("PineTex", "CLOUDS")
    tx.noise_scale = 0.4
    trunk = mats.pbr("M_Trunk", "pine_bark", scale=2, tint=(0.5, 0.45, 0.42), bump=0.5) if trunks else None
    O = Vector(origin)
    for _ in range(count):
        x = rng.uniform(*area[0])
        y = rng.uniform(*area[1])
        h = rng.uniform(*height)
        base = O + Vector((x, y, 0))
        if trunk:
            bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=h * 0.025, depth=h * 0.5, location=base + Vector((0, 0, h * 0.25)))
            t = bpy.context.object
            t.name = "PineTrunk"
            t.data.materials.append(trunk)
            link(t, coll(c))
        for k in range(7):
            q = k / 7
            bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=h * 0.2 * (1 - q * 0.8), depth=h * 0.26,
                                            location=base + Vector((0, 0, h * 0.2 + q * h * 0.72)), rotation=(0, 0, rng.uniform(0, 6.3)))
            o = bpy.context.object
            o.name = "Pine"
            dm = o.modifiers.new("d", "DISPLACE")
            dm.texture = tx
            dm.strength = 0.3
            o.data.materials.append(pine)
            o.data.materials.append(snowm)
            for p in o.data.polygons:
                p.use_smooth = True
                p.material_index = 1 if p.normal.z > 0.55 and rng.random() < 0.7 else 0
            link(o, coll(c))


def forest(origin=(-30, 0, 0)):
    """Отдельная локация «ночной лес с тропой» — ставь героя туда через rig.relocate()."""
    O = Vector(origin)
    ground("ForestGround", origin=O, size=40)
    pines(origin=O, count=60, area=((-12, 12), (-14, 22)), height=(6, 13), c="Forest", trunks=True)
    for o in [o for o in coll("Forest").objects if o.name.startswith(("Pine", "PineTrunk"))]:
        if abs(o.location.x - O.x) < 2.2 and o.location.y - O.y < 6:
            bpy.data.objects.remove(o, do_unlink=True)  # чистая тропа перед камерой
    bpy.ops.object.light_add(type="AREA", location=O + Vector((-1.5, 4.0, 4.5)))
    r = bpy.context.object
    r.name = "ForestRim"
    r.data.energy, r.data.size, r.data.color, r.data.volume_factor = 900, 3, (0.6, 0.75, 1.0), 0.3
    r.rotation_euler = (O + Vector((0, 0, 1.4)) - r.location).to_track_quat("-Z", "Y").to_euler()
    link(r, coll("Lights"))


def room(origin, w=4, d=4, h=2.7, wall="plastered_wall", floor="wood_floor", window=True):
    """Простая комната (пол/стены/потолок) из текстур Poly Haven — скачай их fetch_assets.mjs заранее."""
    O = Vector(origin)
    fm = mats.pbr("M_Floor_" + floor, floor, scale=2)
    wm = mats.pbr("M_Wall_" + wall, wall, scale=2)
    box("Floor", (w, d, 0.05), O + Vector((0, 0, -0.025)), fm, bevel=0)
    box("Ceiling", (w, d, 0.05), O + Vector((0, 0, h)), wm, bevel=0)
    box("WallBack", (w, 0.1, h), O + Vector((0, d / 2, h / 2)), wm, bevel=0)
    box("WallL", (0.1, d, h), O + Vector((-w / 2, 0, h / 2)), wm, bevel=0)
    box("WallR", (0.1, d, h), O + Vector((w / 2, 0, h / 2)), wm, bevel=0)
    if window:
        box("WindowGlow", (1.2, 0.02, 1.0), O + Vector((-w / 2 + 1.0, d / 2 - 0.06, 1.5)),
            mats.simple("M_WindowGlow", (0.6, 0.7, 1.0), emit=(0.55, 0.68, 1.0), strength=4.0), bevel=0)


def poly_model(name, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, c="Env"):
    """Импорт glTF-модели Poly Haven (скачать: fetch_assets.mjs models <name>)."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=asset("models", name))
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    for o in roots:
        o.location = loc
        o.rotation_euler = rot
        o.scale = (scale, scale, scale)
    for o in new:
        link(o, coll(c))
    return roots


def night_lights(hero_center=(0, 0, 1.5)):
    """Ночной свет: луна (холодная), контровой area, слабый заполняющий, тёплый ключ «от фонаря»."""
    H = Vector(hero_center)
    lc = coll("Lights")
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(55), 0, math.radians(150)))
    s = bpy.context.object
    s.name, s.data.energy, s.data.color, s.data.angle = "Moon", 0.18, (0.6, 0.72, 1.0), math.radians(1.5)
    link(s, lc)
    for name, loc, energy, size, col, vf in (("Rim", (-1.2, 2.2, 3.0), 420, 1.5, (0.62, 0.78, 1.0), 0.15),
                                             ("Fill", (1.5, -2.5, 2.2), 25, 3.0, (0.75, 0.82, 1.0), 1.0)):
        bpy.ops.object.light_add(type="AREA", location=H + Vector(loc) - Vector((0, 0, 1.5)))
        o = bpy.context.object
        o.name, o.data.energy, o.data.size, o.data.color, o.data.volume_factor = name, energy, size, col, vf
        o.rotation_euler = (H - o.location).to_track_quat("-Z", "Y").to_euler()
        link(o, lc)
    bpy.ops.object.light_add(type="SPOT", location=H + Vector((-1.6, 0.4, 0.8)))
    k = bpy.context.object
    k.name, k.data.energy, k.data.color = "WarmKey", 160, (1.0, 0.68, 0.4)
    k.data.spot_size, k.data.spot_blend, k.data.shadow_soft_size = math.radians(50), 0.8, 0.25
    k.rotation_euler = (H - k.location).to_track_quat("-Z", "Y").to_euler()
    link(k, lc)
