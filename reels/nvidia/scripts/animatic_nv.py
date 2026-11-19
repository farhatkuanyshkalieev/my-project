"""Workbench animatic of nv_scene.blend -> render/animatic2/a_%04d.png (camera switching via markers)."""
import bpy, sys
sc = bpy.context.scene; argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 270, 480, 100
sc.render.use_overwrite = False; sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = "/home/user/my-project/reels/nvidia/render/animatic2/a_"
sc.frame_step = 3; bpy.ops.render.render(animation=True); print("ANIMATIC DONE")
