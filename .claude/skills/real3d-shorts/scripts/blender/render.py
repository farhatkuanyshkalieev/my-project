# Рендер ролика: animatic (Workbench, контроль движения) | final (EEVEE 1080×1920, полное качество) | keys (по кадру на шот).
#   blender -b <PROJECT>/scene.blend --python render.py -- <PROJECT> animatic|final|keys
# Кадры → <PROJECT>/renders/<mode>/f_####.jpg; перезапуск дорендеривает только недостающие.
import bpy, sys, json, subprocess
from pathlib import Path

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = Path(argv[0])
MODE = argv[1] if len(argv) > 1 else "animatic"
sc = bpy.context.scene
shots = json.loads((PROJECT / "audio" / "shots.json").read_text(encoding="utf-8"))
sc.frame_start, sc.frame_end = 1, shots["total"]
sc.render.fps = shots.get("fps", 30)
out = PROJECT / "renders" / MODE
out.mkdir(parents=True, exist_ok=True)
sc.render.image_settings.file_format = "JPEG"
sc.render.image_settings.quality = 92
sc.render.use_overwrite = False
sc.render.use_placeholder = True


def hide_volumes(flag):
    """Объёмы (пар, дымка) в Workbench рисуются сплошными шарами/кубом — прячем."""
    for o in bpy.data.objects:
        if o.get("volume") or o.name.startswith(("Puff.", "FogBox")):
            o.hide_render = flag


if MODE in ("animatic", "keys"):
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.render.resolution_x, sc.render.resolution_y = 720, 1280
    sc.render.resolution_percentage = 100
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "MATERIAL"           # цвета из material.diffuse_color (kit их проставляет)
    sh.show_shadows = True
    sh.show_cavity = True
    sh.show_object_outline = True
    sc.display.render_aa = "8"
    sc.render.use_motion_blur = False
    hide_volumes(True)
    if MODE == "keys":
        # по кадру из середины каждого шота → контактный лист checks/keys.jpg
        frames = [(s["start"] + s["end"]) // 2 for s in shots["shots"]]
        paths = []
        for f in frames:
            sc.frame_set(f)
            p = out / f"k_{f:04d}.jpg"
            sc.render.filepath = str(p)
            bpy.ops.render.render(write_still=True)
            paths.append(str(p))
        chk = PROJECT / "checks"
        chk.mkdir(exist_ok=True)
        args = ["ffmpeg", "-v", "error", "-y"]
        for p in paths:
            args += ["-i", p]
        n = len(paths)
        args += ["-filter_complex", "".join(f"[{i}]scale=270:480[v{i}];" for i in range(n)) + "".join(f"[v{i}]" for i in range(n))
                 + f"hstack={n}", str(chk / "keys.jpg")]
        subprocess.run(args)
        print("KEYS", chk / "keys.jpg")
        sys.exit(0)
else:
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.render.resolution_percentage = 100
    ee = sc.eevee
    ee.taa_render_samples = 32
    ee.volumetric_tile_size = "2"
    ee.volumetric_samples = 96
    ee.use_volumetric_shadows = True
    ee.volumetric_end = 40
    try:
        ee.use_raytracing = True
    except Exception:
        pass
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    hide_volumes(False)

sc.render.filepath = str(out / "f_")
bpy.ops.render.render(animation=True)
print("DONE", MODE, out)
