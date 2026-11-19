# Камеры: отдельная камера на шот, склейки маркерами, каталог движений (directing.md §2), ручная тряска.
import bpy, math
from mathutils import Vector
from .core import coll, empty, fcurves


def shot_camera(name, keys, focus=None, fstop=2.0, handheld=0.5, sensor=36):
    """keys = [(кадр, позиция, точка_взгляда, фокусное_мм), …].
    focus: имя объекта, или [(кадр, позиция)] для анимированного фокуса (rack focus), или None.
    handheld: 0 — штатив, 0.3 — спокойно, 1.0 — тревожно (шум на вращение поверх Track To)."""
    cam = bpy.data.objects.get(name)
    if not cam:
        cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
        coll("Cameras").objects.link(cam)
    cam.animation_data_clear()
    cam.data.animation_data_clear()
    cam.data.sensor_width = sensor
    aim = empty(name + ".Aim", (0, 0, 0), 0.03)
    for c in list(cam.constraints):
        cam.constraints.remove(c)
    tr = cam.constraints.new("TRACK_TO")
    tr.target, tr.track_axis, tr.up_axis = aim, "TRACK_NEGATIVE_Z", "UP_Y"
    for f, loc, look, lens in keys:
        cam.location = loc
        cam.keyframe_insert("location", frame=f)
        aim.location = look
        aim.keyframe_insert("location", frame=f)
        cam.data.lens = lens
        cam.data.keyframe_insert("lens", frame=f)
    cam.data.dof.use_dof = focus is not None
    cam.data.dof.aperture_fstop = fstop
    if isinstance(focus, str):
        cam.data.dof.focus_object = bpy.data.objects[focus]
    elif focus:
        fe = empty(name + ".Focus", (0, 0, 0), 0.02)
        for f, p in focus:
            fe.location = p
            fe.keyframe_insert("location", frame=f)
        cam.data.dof.focus_object = fe
    if handheld:
        # тряска: шум на вращении камеры поверх Track To — работает как «ручная» камера
        cam.rotation_mode = "XYZ"
        cam.keyframe_insert("rotation_euler", frame=keys[0][0])
        for fc in fcurves(cam):
            if fc.data_path == "rotation_euler":
                n = fc.modifiers.new("NOISE")
                n.scale, n.strength, n.phase = 22.0, 0.012 * handheld, fc.array_index * 13.7
    return cam


def bind_markers(shots, cams):
    """shots = {i: (start, end)}, cams = {i: camera} → маркеры S1…Sn со сменой камеры."""
    sc = bpy.context.scene
    sc.timeline_markers.clear()
    for i in sorted(shots):
        m = sc.timeline_markers.new(f"S{i}", frame=shots[i][0])
        m.camera = cams[i]
    sc.camera = cams[min(shots)]


def ease(a, b, t):
    t = t * t * (3 - 2 * t)
    return a.lerp(b, t)


def move(kind, f0, f1, subject, dist=1.0, height=0.0, lens=35, side=1, extra=None):
    """Ключи камеры по каталогу. subject — точка (Vector), на которую смотрим. Возвращает keys для shot_camera.
    kind: push_in | pull_back_down | crane_up | orbit | track_side | low_follow | snap_zoom | whip_out |
          xray_glide | dolly_zoom. Направление «перед героем» = −Y."""
    S = Vector(subject)
    fwd = Vector((0, -1, 0))
    rgt = Vector((side, 0, 0))
    e = extra or {}
    if kind == "push_in":
        return [(f0, S + fwd * dist * 1.35 + rgt * 0.12 + Vector((0, 0, height)), S, lens),
                (f1, S + fwd * dist + rgt * 0.08 + Vector((0, 0, height)), S, lens + 8)]
    if kind == "pull_back_down":
        return [(f0, S + fwd * dist * 0.6 + rgt * 0.12 + Vector((0, 0, 0.02)), S, lens),
                (f0 + (f1 - f0) // 3, S + fwd * dist * 1.1 + rgt * 0.18 + Vector((0, 0, -0.15)), S - Vector((0, 0, 0.12)), lens - 3),
                (f1, S + fwd * dist * 3.2 + rgt * 0.28 + Vector((0, 0, -S.z + 0.45)), S - Vector((0, 0, 0.55)), lens - 5)]
    if kind == "crane_up":
        return [(f0, S + fwd * dist + rgt * 0.4 + Vector((0, 0, -S.z + 0.6)), S, lens),
                (f0 + (f1 - f0) * 2 // 5, S + fwd * dist * 2.5 + rgt * 0.9 + Vector((0, 0, 1.2)), S, lens - 4),
                (f1, S + fwd * dist * 4.5 + rgt * 1.1 + Vector((0, 0, 2.6)), S + Vector((0, 0.3, -0.3)), lens - 6)]
    if kind == "orbit":
        a0, a1 = math.radians(e.get("from", -50)) * side, math.radians(e.get("to", 20)) * side
        keys = []
        for k in range(5):
            t = k / 4
            a = a0 + (a1 - a0) * (t * t * (3 - 2 * t))
            p = S + Vector((math.sin(a) * dist, -math.cos(a) * dist, height))
            keys.append((round(f0 + (f1 - f0) * t), p, S, lens))
        return keys
    if kind == "track_side":
        d = Vector(e.get("dir", (0, 1, 0))) * e.get("travel", 1.5)
        return [(f0, S + rgt * dist + Vector((0, 0, height)), S, lens),
                (f1, S + d + rgt * dist + Vector((0, 0, height)), S + d, lens)]
    if kind == "low_follow":
        land = Vector(e["land"])
        return [(f0, S + fwd * dist + rgt * dist * 0.6 + Vector((0, 0, -S.z + 0.35)), S, lens),
                (f1, land + fwd * dist * 0.7 + rgt * dist * 0.5 + Vector((0, 0, 0.12)), land, lens)]
    if kind == "snap_zoom":
        hit = e.get("hit", f0 + 8)
        # резкий наезд к «лицу целиком» (не к носу): итог ≈ 0.9·dist и +8 мм
        return [(f0, S + fwd * dist * 1.8 + Vector((0, 0, height)), S, lens),
                (hit, S + fwd * dist * 0.95 + Vector((0, 0, height)), S, lens + 6),
                (f1, S + fwd * dist * 0.9 + Vector((0, 0, height)), S, lens + 8)]
    if kind == "whip_out":
        # последние 6 кадров шота — резкий поворот взгляда в сторону (под звук whoosh), склейка на смазе
        away = S + rgt * e.get("swing", 2.5)
        return [(f0, S + fwd * dist + Vector((0, 0, height)), S, lens),
                (f1 - 6, S + fwd * dist * 0.92 + Vector((0, 0, height)), S, lens),
                (f1, S + fwd * dist * 0.9 + Vector((0, 0, height)), away, lens)]
    if kind == "xray_glide":
        a, b = Vector(e["start"]), Vector(e["end"])
        mid = a.lerp(b, 0.5)
        return [(f0, a + fwd * dist * 0.7 + Vector((0.1 * side, 0, 0.1)), a, lens),
                ((f0 + f1) // 2, mid + fwd * dist + Vector((0.05 * side, 0, 0.08)), mid, lens - 4),
                (f1, b + fwd * dist * 0.8 + Vector((0.1 * side, 0, 0.05)), b, lens)]
    if kind == "dolly_zoom":
        return [(f0, S + fwd * dist * 2.2 + Vector((0, 0, height)), S, lens + 20),
                (f1, S + fwd * dist * 0.9 + Vector((0, 0, height)), S, lens - 8)]
    raise ValueError(kind)
