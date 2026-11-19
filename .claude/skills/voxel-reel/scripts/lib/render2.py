"""Render reel2_scene.blend (EEVEE, preset FAST already applied) to PNG.  blender -b reel2_scene.blend --python render2.py -- res=540 out=DIR [range=a-b]"""
import bpy, sys, time
argv = sys.argv[sys.argv.index("--") + 1:]
def arg(k, d=None):
    v = [a[len(k) + 1:] for a in argv if a.startswith(k + "=")]; return v[0] if v else d
sc = bpy.context.scene; res = int(arg("res", "540")); out = arg("out")
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = res, res * 16 // 9, 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'; sc.render.image_settings.compression = 15
sc.render.use_overwrite = False; sc.render.use_placeholder = False
rg = arg("range")
if rg: sc.frame_start, sc.frame_end = map(int, rg.split("-"))
sc.render.filepath = out + "/f_"
t0 = time.time(); bpy.ops.render.render(animation=True)
print("RENDER2 DONE", res, rg, round(time.time() - t0))
