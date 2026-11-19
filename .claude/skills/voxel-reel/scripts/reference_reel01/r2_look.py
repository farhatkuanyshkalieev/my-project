"""Reel #1 v2 — final look: day sun + sky dome + lamps (with the day/night cycle keys from r2_fx), day room for the finale,
EEVEE preset FAST.  exec'd last."""
exec(open(r"E:\3д Рилсики ЛоуПоли\my_avatar\scripts\reference_scene\eevee_presets.py", encoding="utf-8").read())
for n in ("Light_Moon_Sun", "Light_Lamp_Spot", "Light_FloorBounce", "Light_Shelf_Spot") + tuple(o.name for o in bpy.data.objects if o.name.startswith("Light_Garland")):
    o = bpy.data.objects.get(n)
    if o: o.hide_render = True
for n in ("Moon", "City_Far_Lights", "Antenna_Light"):
    o = bpy.data.objects.get(n)
    if o: o.hide_render = True
for m in bpy.data.materials:
    if m.node_tree and any(s in m.name for s in ("Garland", "Bulb", "City_Window", "Windows_Lit", "Lamp_Bulb")):
        for n in m.node_tree.nodes:
            if n.type == 'GROUP' and "Emission" in n.inputs: n.inputs["Emission"].default_value = 0.0
            if n.type == 'EMISSION': n.inputs["Strength"].default_value = 0.0
            if n.type == 'BSDF_PRINCIPLED': n.inputs["Emission Strength"].default_value = 0.0
# ---- sun with the "свет" cycle ----
sd = bpy.data.lights.new("Sun_Day", 'SUN'); sun = bpy.data.objects.new("Sun_Day", sd); sc.collection.objects.link(sun); sd.angle = math.radians(1.5)
STREET_AZ = 200.0; ROOM_AZ = 192.0
def sunkey(f, elev, colr, energy, az):
    sun.rotation_euler = Euler((math.radians(90 - elev), 0, math.radians(az))); sd.color = colr; sd.energy = energy
    sun.keyframe_insert("rotation_euler", frame=f); sd.keyframe_insert("color", frame=f); sd.keyframe_insert("energy", frame=f)
sunkey(0, 50, (1.0, 0.93, 0.80), 4.0, STREET_AZ)
for f, el, cr, en, wmix in SUN_KEYS: sunkey(f, el, cr, en, STREET_AZ)
sunkey(F_FLASH - 1, 50, (1.0, 0.93, 0.80), 4.0, STREET_AZ); sunkey(F_FLASH, 50, (1.0, 0.95, 0.85), 5.0, ROOM_AZ)
# ---- world + sky dome day/night mix ----
wo = sc.world; wo.use_nodes = True; nt = wo.node_tree; nt.nodes.clear()
o = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground"); nt.links.new(bg.outputs[0], o.inputs["Surface"])
def wkey(f, c, s):
    bg.inputs["Color"].default_value = (*c, 1); bg.inputs["Strength"].default_value = s; bg.inputs["Color"].keyframe_insert("default_value", frame=f); bg.inputs["Strength"].keyframe_insert("default_value", frame=f)
DAYC = lin("#8FB8E8"); NIGHTC = lin("#0C1230"); SUNSETC = lin("#E8A070")
wkey(0, DAYC, 0.45)
for (f, el, cr, en, wmix) in SUN_KEYS: wkey(f, [a * wmix + b * (1 - wmix) for a, b in zip(DAYC if el > 20 else SUNSETC, NIGHTC)], 0.45 * wmix + 0.08)
wkey(F_FLASH - 1, DAYC, 0.45); wkey(F_FLASH, lin("#C8D8EE"), 0.35)
sky = S["sky"]; sm = sky.data.materials[0]; snt = sm.node_tree
emn = [n for n in snt.nodes if n.type == 'EMISSION'][0]
for (f, el, cr, en, wmix) in [(0, 50, None, None, 1.0)] + SUN_KEYS:
    emn.inputs["Strength"].default_value = 0.05 + 0.95 * wmix; emn.inputs["Strength"].keyframe_insert("default_value", frame=f)
# lamps: emissive heads + point lights on at night
for head in S["lamps"]:
    m = head.data.materials[0]; g = [n for n in m.node_tree.nodes if n.type == 'GROUP'][0].inputs["Emission"]
    for f, v in ((0, 0.0), (LAMP_ON[0] - 1, 0.0), (LAMP_ON[0], 5.0), (LAMP_ON[1], 5.0), (LAMP_ON[1] + 1, 0.0)): g.default_value = v; g.keyframe_insert("default_value", frame=f)
    A.set_interp(m.node_tree, 'CONSTANT'); break
for lo in S["lamp_lights"]:
    for f, v in ((0, 0.0), (LAMP_ON[0] - 1, 0.0), (LAMP_ON[0], 500.0), (LAMP_ON[1], 500.0), (LAMP_ON[1] + 1, 0.0)): lo.data.energy = v; lo.data.keyframe_insert("energy", frame=f)
    A.set_interp(lo.data, 'CONSTANT')
# ---- the room by day: sun through the window, warm fill, lit laptop, city by day behind the window ----
ws = bpy.data.objects.get("Light_Window_Sky")
if ws: ws.data.color = (0.85, 0.90, 1.0); ws.data.energy = 70
fill = bpy.data.lights.new("Room_Fill", 'AREA'); fill.energy = 300; fill.color = (1.0, 0.86, 0.70); fill.size = 2.5; fill.shape = 'SQUARE'
fo = bpy.data.objects.new("Room_Fill", fill); sc.collection.objects.link(fo); fo.location = (0.0, -0.6, 2.55); fo.rotation_euler = (0, 0, 0)
face_l = bpy.data.lights.new("Room_FaceKey", 'AREA'); face_l.energy = 40; face_l.color = (1.0, 0.9, 0.78); face_l.size = 0.8
flo = bpy.data.objects.new("Room_FaceKey", face_l); sc.collection.objects.link(flo)
flo.location = MID + fwd * 1.3 + Vector((-0.5, 0, 0.6)); flo.rotation_euler = (MID - flo.location).to_track_quat('-Z', 'Y').to_euler()
for L_ in (fo, flo, ws):
    if L_: L_.hide_render = True; L_.keyframe_insert("hide_render", frame=0); L_.hide_render = False; L_.keyframe_insert("hide_render", frame=F_FLASH)
city = bpy.data.collections.get("City"); DAYC4 = [lin("#C9B79C"), lin("#9FB3C8"), lin("#D8A48F"), lin("#A7B59A")]
if city:
    for i, o_ in enumerate(city.all_objects):
        o_.visible_shadow = False
        for m in (o_.data.materials if hasattr(o_.data, "materials") else []):
            if not m or not m.node_tree: continue
            for n in m.node_tree.nodes:
                if n.type == 'GROUP' and "Emission" in n.inputs:
                    n.inputs["Emission"].default_value = 0.0
                    if "Window" in o_.name: n.inputs["Color"].default_value = (*lin("#5A6B7C"), 1)
                    elif o_.name != "Sky_Backdrop": n.inputs["Color"].default_value = (*DAYC4[i % 4], 1)
                if n.type == 'EMISSION': n.inputs["Strength"].default_value = 0.0
                if n.type == 'BSDF_PRINCIPLED': n.inputs["Emission Strength"].default_value = 0.0
sk = bpy.data.objects.get("Sky_Backdrop")
if sk and sk.data.materials:
    m = sk.data.materials[0]
    for n in m.node_tree.nodes:
        if n.type == 'GROUP': n.inputs["Color"].default_value = (*lin("#9CC2EC"), 1); n.inputs["Emission"].default_value = 2.4
# volumetric haze is on the street only; room: none
for f, x in ((0, 0.0), (F_FLASH - 1, 0.0), (F_FLASH, 0.5)):
    sc.view_settings.exposure = x; sc.view_settings.keyframe_insert("exposure", frame=f)
A.set_interp(sc, 'CONSTANT')
apply_preset("FAST"); sc.eevee.use_shadows = True; sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'; sc.render.image_settings.compression = 15
print("LOOK OK")
