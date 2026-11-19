# Анимация героя: IK кистей, позы по фазам с дрожью/дыханием/покачиванием, колени, переносы между локациями.
import bpy, math
from mathutils import Vector, Euler
from .core import empty, fcurves

# Углы костей (X, Y, Z в градусах, локальные оси MPFB): X у ног/спины — сгиб вперёд-назад.
POSES = {
    "cold":  {"spine01": (8, 0, 0), "spine02": (6, 0, 0), "spine03": (4, 0, 0), "neck01": (3, 0, 0), "head": (2, 0, 0),
              "clavicle.L": (0, 0, 9), "clavicle.R": (0, 0, -9)},
    "still": {"spine01": (4, 0, 0), "spine02": (3, 0, 0), "spine03": (2, 0, 0), "neck01": (-4, 0, 0), "head": (-8, 0, 3),
              "clavicle.L": (0, 0, -3), "clavicle.R": (0, 0, 3)},
    "kneel": {"spine01": (22, 0, 4), "spine02": (18, 0, 0), "spine03": (12, 0, 0), "neck01": (14, 0, 0), "head": (22, 0, -10),
              "clavicle.L": (0, 0, 2), "clavicle.R": (0, 0, -2),
              "upperleg01.L": (-12, 0, -4), "upperleg01.R": (-12, 0, 4), "lowerleg01.L": (100, 0, 0),
              "lowerleg01.R": (100, 0, 0), "foot.L": (45, 0, 0), "foot.R": (45, 0, 0)},
    "neutral": {},
}
KNEEL_DROP = 0.45  # на сколько опустить героя (delta_location.z) в позе kneel


def bone_rest(rig, name, tail=False):
    """Мировая позиция кости в позе покоя (герой в начале координат) — для расчёта целей и камер."""
    b = rig.data.bones[name]
    return rig.matrix_world.to_3x3() @ (b.tail_local if tail else b.head_local) + rig.matrix_world.translation


def ik_hands(rig, prefix="HandIK"):
    """IK на предплечья (цепь 4 кости) + полюса локтей. Возвращает {'L': target, 'R': target}."""
    out = {}
    for s, sx in (("L", 1), ("R", -1)):
        t = empty(f"{prefix}.{s}", bone_rest(rig, f"wrist.{s}"))
        p = empty(f"ElbowPole.{s}", bone_rest(rig, f"lowerarm01.{s}") + Vector((sx * 0.35, 0.1, -0.35)))
        pb = rig.pose.bones[f"lowerarm02.{s}"]
        for c in list(pb.constraints):
            pb.constraints.remove(c)
        ik = pb.constraints.new("IK")
        ik.target, ik.pole_target, ik.pole_angle, ik.chain_count = t, p, math.radians(-90), 4
        out[s] = t
    return out


def cup_hands(rig, curl=22):
    """Кисти «лодочкой»: пальцы подогнуты, ладони к лицу."""
    for s, sx in (("L", 1), ("R", -1)):
        wb = rig.pose.bones[f"wrist.{s}"]
        wb.rotation_mode = "XYZ"
        wb.rotation_euler = (math.radians(10), math.radians(-25 * sx), math.radians(-35 * sx))
        for n in range(1, 6):
            for k in range(1, 4):
                fb = rig.pose.bones.get(f"finger{n}-{k}.{s}")
                if fb:
                    fb.rotation_mode = "XYZ"
                    fb.rotation_euler = (math.radians(curl if n > 1 else curl * 0.5), 0, 0)


def pose_track(rig, phases, f_end, shiver=None, sway=None, breathe=True, step=2):
    """Ключи поз по фазам с плавными переходами.
    phases = [(кадр_начала, 'cold'|'still'|'kneel'|dict, длительность_перехода), …]
    shiver(f) -> 0..1 амплитуда дрожи; sway(f) -> градусы покачивания корпуса."""
    names = sorted({n for _, p, _ in phases for n in (POSES[p] if isinstance(p, str) else p)})
    for n in names:
        rig.pose.bones[n].rotation_mode = "XYZ"
    if rig.animation_data:
        rig.animation_data_clear()
    fps = bpy.context.scene.render.fps

    def angles(n, f):
        cur = (0, 0, 0)
        prev = (0, 0, 0)
        for i, (f0, p, blend) in enumerate(phases):
            if f < f0:
                break
            d = POSES[p] if isinstance(p, str) else p
            prev, cur = cur, d.get(n, (0, 0, 0))
            t = min(1.0, (f - f0) / max(1, blend))
            t = t * t * (3 - 2 * t)
            cur = tuple(a + (b - a) * t for a, b in zip(prev, cur))
        return cur

    for f in range(1, f_end + 1, step):
        t = f / fps
        amp = shiver(f) if shiver else 0.0
        br = math.sin(2 * math.pi * t / 1.3) if breathe else 0.0
        sw = sway(f) if sway else 0.0
        for n in names:
            x, y, z = angles(n, f)
            h = hash(n) % 7
            sh = lambda a, ph: a * amp * (math.sin(t * 2 * math.pi * 9 + ph) * 0.6 + math.sin(t * 2 * math.pi * 13 + ph * 1.7) * 0.4)
            k = 1.0 + (0.3 * br if n.startswith("clav") else 0.0)
            pb = rig.pose.bones[n]
            pb.rotation_euler = Euler((math.radians(x * k + sh(0.6, h)), math.radians(y + sh(0.5, h)),
                                       math.radians(z * k + sh(0.7, h) + (sw if n.startswith("spine") else 0.0))))
            pb.keyframe_insert("rotation_euler", frame=f)


def hand_path(target, keys):
    """keys = [(кадр, Vector), …] — путь цели IK кисти."""
    target.animation_data_clear()
    for f, p in keys:
        target.location = p
        target.keyframe_insert("location", frame=f)


def rub_keys(center, f0, f1, side=1, fps=30):
    """Растирание ладоней у рта: вверх-вниз 2.2 Гц + мелкая дрожь."""
    out = []
    for f in range(f0, f1, 2):
        t = f / fps
        rub = math.sin(2 * math.pi * t * 2.2 + (0 if side > 0 else math.pi))
        out.append((f, center + Vector((0.004 * side * math.sin(t * 50), 0, 0.022 * rub))))
    return out


def relocate(objs, spans):
    """Телепорт героя (и его целей IK/полюсов) между локациями через delta_location с CONSTANT-ключами.
    spans = [(кадр_начала, Vector смещения), …] — смещение действует до следующего span."""
    for o in objs:
        o.delta_location = (0, 0, 0)
        keys = [(1, Vector())] + [(f, Vector(v)) for f, v in spans]
        for f, v in keys:
            o.delta_location = v
            o.keyframe_insert("delta_location", frame=f)
        for fc in fcurves(o):
            if fc.data_path == "delta_location":
                for kp in fc.keyframe_points:
                    kp.interpolation = "CONSTANT"


def slide(objs, f0, f1, start_off, end_off):
    """Плавное смещение (подползти, сделать шаг) поверх relocate — тоже через delta_location, BEZIER."""
    for o in objs:
        for f, v in ((f0, start_off), (f1, end_off)):
            o.delta_location = v
            o.keyframe_insert("delta_location", frame=f)
        for fc in fcurves(o):
            if fc.data_path == "delta_location":
                for kp in fc.keyframe_points:
                    if f0 <= kp.co.x <= f1:
                        kp.interpolation = "BEZIER"
