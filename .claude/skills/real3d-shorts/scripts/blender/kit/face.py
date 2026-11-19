# Мимика на лицевых костях стандартного рига MPFB (MakeHuman default): веки, брови, глаза, челюсть, уголки губ.
# Калибровка (проверено на рендере): orbicularis03 X<0 — верхнее веко вниз (−38° закрыто), X>0 — глаза шире;
# jaw X>0 — рот открывается; oculi02 X>0 — брови хмурятся вниз, X<0 — вверх; risorius03 Z (±) — уголки губ.
# ВАЖНО: rig.pose_track() очищает анимацию рига → face_track() вызывай ПОСЛЕ него.
import bpy, math, random
from mathutils import Euler

rng = random.Random(17)

# Единицы мимики → (кость, ось, градусы при силе 1.0). Симметрия .L/.R задаётся знаком в MIRROR.
UNITS = {
    "lid_close":  [("orbicularis03.L", 0, -38), ("orbicularis03.R", 0, -38)],
    "lid_wide":   [("orbicularis03.L", 0, 14), ("orbicularis03.R", 0, 14)],
    "lower_lid":  [("orbicularis04.L", 0, 14), ("orbicularis04.R", 0, 14)],     # прищур снизу
    "brow_down":  [("oculi02.L", 0, 22), ("oculi02.R", 0, 22)],
    "brow_up":    [("oculi02.L", 0, -22), ("oculi02.R", 0, -22)],
    "jaw_open":   [("jaw", 0, 16)],
    "jaw_clench": [("jaw", 0, -4)],
    "smile":      [("risorius03.L", 2, 45), ("risorius03.R", 2, -45)],
    "grimace":    [("risorius03.L", 2, -35), ("risorius03.R", 2, 35)],
    "gaze_down":  [("eye.L", 0, 12), ("eye.R", 0, 12)],
    "gaze_up":    [("eye.L", 0, -10), ("eye.R", 0, -10)],
    "gaze_side":  [("eye.L", 2, 14), ("eye.R", 2, 14)],
}

# Выражения = смесь единиц (сила 0..1). Подбирай под эмоцию фразы.
EXPR = {
    "neutral":  {},
    "cold":     {"lid_close": 0.25, "lower_lid": 0.6, "brow_down": 0.45, "jaw_clench": 1.0, "grimace": 0.35},
    "pain":     {"lid_close": 0.45, "lower_lid": 0.9, "brow_down": 0.9, "jaw_open": 0.15, "grimace": 0.8},
    "fear":     {"lid_wide": 1.0, "brow_up": 0.9, "jaw_open": 0.35, "grimace": 0.3},
    "surprise": {"lid_wide": 1.0, "brow_up": 1.0, "jaw_open": 0.6},
    "drowsy":   {"lid_close": 0.55, "brow_up": 0.15, "jaw_open": 0.1, "gaze_down": 0.6},
    "relief":   {"lid_close": 0.35, "brow_up": 0.25, "smile": 0.35, "jaw_open": 0.08},
    "focus":    {"lower_lid": 0.5, "brow_down": 0.5, "jaw_clench": 0.6},
    "sad":      {"lid_close": 0.3, "brow_up": 0.5, "grimace": 0.4, "gaze_down": 0.7},
    "smile":    {"smile": 1.0, "lower_lid": 0.4, "brow_up": 0.15},
}
FACE_BONES = sorted({b for u in UNITS.values() for b, _, _ in u})

# Эмоции в жанре — ГИПЕРБОЛИЗИРОВАННЫЕ, а не реалистичные: зритель должен считать эмоцию за долю секунды
# даже на телефоне. Все выражения усиливаются этим множителем (1.0 — «как в жизни», 1.6–1.9 — норма жанра).
INTENSITY = 1.7
# Пределы, чтобы гипербола не ломала лицо (веки не выворачиваются, челюсть не вываливается).
LIMITS = {"orbicularis03.L": (-38, 24), "orbicularis03.R": (-38, 24), "jaw": (-6, 26),
          "oculi02.L": (-34, 34), "oculi02.R": (-34, 34)}


def _mix(expr, extra=None, intensity=None):
    k = INTENSITY if intensity is None else intensity
    out = {}
    base = EXPR[expr] if isinstance(expr, str) else expr
    for unit, w in {**base, **(extra or {})}.items():
        for b, ax, deg in UNITS[unit]:
            v = out.setdefault(b, [0.0, 0.0, 0.0])
            v[ax] += deg * w * k
    for b, (lo, hi) in LIMITS.items():
        if b in out:
            out[b][0] = max(lo, min(hi, out[b][0]))
    return out


def apply(rig, expr, extra=None):
    """Поставить выражение без ключей (для проверки кадра)."""
    m = _mix(expr, extra)
    for b in FACE_BONES:
        pb = rig.pose.bones.get(b)
        if pb:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = [math.radians(a) for a in m.get(b, (0, 0, 0))]


def face_track(rig, segments, f_end, blinks=True, saccades=True, chatter=None, step=1):
    """Ключи мимики на весь ролик.
    segments = [(кадр, 'cold'|dict, кадров_на_переход), …] — смена выражения под фразы.
    blinks — моргание каждые 2–5 с (закрытие 3 кадра, открытие 4); saccades — мелкие движения глаз.
    chatter(f) -> 0..1 — стук зубов (челюсть 9–11 Гц), например при холоде."""
    for b in FACE_BONES:
        pb = rig.pose.bones.get(b)
        if pb:
            pb.rotation_mode = "XYZ"
    fps = bpy.context.scene.render.fps
    # моргания и саккады — заранее
    blink_at, f = [], rng.randint(20, 60)
    while f < f_end:
        blink_at.append(f)
        f += rng.randint(int(2 * fps), int(5 * fps))
    sacc, f, cur = [], 1, (0.0, 0.0)
    while f < f_end:
        sacc.append((f, cur))
        cur = (rng.uniform(-4, 4), rng.uniform(-6, 6))
        f += rng.randint(int(0.5 * fps), int(1.6 * fps))

    def expr_at(f):
        res = _mix("neutral")
        prev = {}
        for f0, e, blend in segments:
            if f < f0:
                break
            tgt = _mix(e)
            t = min(1.0, (f - f0) / max(1, blend))
            t = t * t * (3 - 2 * t)
            keys = set(prev) | set(tgt)
            res = {k: [a + (b - a) * t for a, b in zip(prev.get(k, (0, 0, 0)), tgt.get(k, (0, 0, 0)))] for k in keys}
            prev = {k: list(v) for k, v in res.items()}
        return res

    for f in range(1, f_end + 1, step):
        m = expr_at(f)
        # моргание поверх выражения
        if blinks:
            for b0 in blink_at:
                d = f - b0
                if 0 <= d <= 7:
                    k = d / 3 if d <= 3 else 1 - (d - 3) / 4
                    for b in ("orbicularis03.L", "orbicularis03.R"):
                        v = m.setdefault(b, [0, 0, 0])
                        v[0] = v[0] + (-38 - v[0]) * k
        if saccades:
            g = next((c for f0, c in reversed(sacc) if f0 <= f), (0, 0))
            for b in ("eye.L", "eye.R"):
                v = m.setdefault(b, [0, 0, 0])
                v[0] += g[0]
                v[2] += g[1]
        if chatter:
            c = chatter(f)
            if c > 0:
                v = m.setdefault("jaw", [0, 0, 0])
                v[0] += c * 3.5 * (0.5 + 0.5 * math.sin(f / fps * 2 * math.pi * 10))
        for b in FACE_BONES:
            pb = rig.pose.bones.get(b)
            if not pb:
                continue
            pb.rotation_euler = Euler([math.radians(a) for a in m.get(b, (0, 0, 0))])
            pb.keyframe_insert("rotation_euler", frame=f)


def face_test_grid(rig, out_path, exprs=("neutral", "cold", "pain", "fear", "drowsy", "relief", "smile", "surprise")):
    """Проверка мимики: рендер лица Workbench по каждому выражению → один лист. Смотри перед постановкой."""
    import os, subprocess
    from mathutils import Vector
    sc = bpy.context.scene
    hm = rig.matrix_world @ rig.pose.bones["head"].matrix
    face = hm @ Vector((0, 0.03, 0.12))
    cam = bpy.data.objects.get("FaceTestCam") or bpy.data.objects.new("FaceTestCam", bpy.data.cameras.new("FaceTestCam"))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    cam.location = face + Vector((0, -0.45, 0.02))
    cam.data.lens = 50
    cam.rotation_euler = (face - cam.location).to_track_quat("-Z", "Y").to_euler()
    keep = (sc.camera, sc.render.engine, sc.render.resolution_percentage, sc.render.filepath,
            sc.render.image_settings.file_format, [(m, m.camera) for m in sc.timeline_markers])
    sc.camera = cam
    for m in sc.timeline_markers:
        m.camera = cam
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_percentage = 25
    sc.render.image_settings.file_format = "PNG"
    tmp = []
    for e in exprs:
        apply(rig, e)
        p = os.path.join(os.path.dirname(out_path), f"_face_{e}.png")
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        tmp.append(p)
    apply(rig, "neutral")
    sc.camera, sc.render.engine, sc.render.resolution_percentage, sc.render.filepath, sc.render.image_settings.file_format, mk = keep
    for m, c in mk:
        m.camera = c
    args = ["ffmpeg", "-v", "error", "-y"]
    for p in tmp:
        args += ["-i", p]
    args += ["-filter_complex", "".join(f"[{i}]" for i in range(len(tmp))) + f"hstack={len(tmp)}", out_path]
    subprocess.run(args)
    return out_path
