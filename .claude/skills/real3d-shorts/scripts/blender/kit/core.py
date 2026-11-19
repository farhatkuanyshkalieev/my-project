# Базовые утилиты: сцена, коллекции, ключи анимации, пути к ассетам, шоты из audio/shots.json.
import bpy, json, os
from pathlib import Path

HOME = Path(os.environ.get("REAL3D_HOME", Path.home() / ".real3d-shorts"))
PH = HOME / "polyhaven"


def asset(kind, name, part=None):
    """Путь к скачанному ассету Poly Haven: kind = textures|hdris|models."""
    if kind == "hdris":
        return str(PH / "hdris" / f"{name}.hdr")
    if kind == "textures":
        return str(PH / "textures" / name / f"{name}_{part}.jpg")
    return str(PH / "models" / name / f"{name}.gltf")


def reset(fps=30):
    """Пустая сцена с правильными настройками цвета и fps."""
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = fps
    sc.render.engine = "BLENDER_EEVEE"
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = -0.3
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    return sc


def coll(name, parent=None):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(c)
    return c


def link(obj, c):
    for uc in list(obj.users_collection):
        uc.objects.unlink(obj)
    c.objects.link(obj)
    return obj


def empty(name, loc=(0, 0, 0), size=0.04, collection="Rigging"):
    e = bpy.data.objects.get(name)
    if not e:
        e = bpy.data.objects.new(name, None)
        coll(collection).objects.link(e)
    e.empty_display_size = size
    e.parent = None
    e.animation_data_clear()
    e.location = loc
    return e


def fcurves(id_data):
    """Все F-кривые объекта (поддержка слоёв анимации Blender 5.x)."""
    ad = getattr(id_data, "animation_data", None)
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, "fcurves") and len(act.fcurves):
        return list(act.fcurves)
    out = []
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out


def keyset(ob, path, keys, interp="BEZIER"):
    """keys = [(frame, value), …] — ставит ключи и интерполяцию."""
    for f, v in keys:
        setattr(ob, path, v)
        ob.keyframe_insert(path, frame=f)
    for fc in fcurves(ob):
        if fc.data_path == path:
            for kp in fc.keyframe_points:
                kp.interpolation = interp


def const_keys(ob, path, keys):
    keyset(ob, path, keys, "CONSTANT")


def shots_from_json(project):
    """audio/shots.json → {номер: (кадр_начала, кадр_конца)}, total."""
    data = json.loads(Path(project, "audio", "shots.json").read_text(encoding="utf-8"))
    shots = {s["i"]: (s["start"], s["end"]) for s in data["shots"]}
    return shots, data["total"], data


def save(project, name="scene.blend"):
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(project, name)))
