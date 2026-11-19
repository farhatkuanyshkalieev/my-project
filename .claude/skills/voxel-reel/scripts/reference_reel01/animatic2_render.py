"""Animatic v2: Workbench render of reel2_scene.blend (photo faces kept so lip-sync reads), 540x960, to D:.
blender -b reel2_scene.blend --python animatic2_render.py"""
import bpy
D = r"D:\3д Рилсики рендер\reel01"
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_shadows = True; sh.shadow_intensity = 0.35; sh.show_cavity = True; sh.cavity_type = 'WORLD'; sh.show_object_outline = True
sc.display.render_aa = '8'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 540, 960, 100
sc.render.use_motion_blur = False; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'; sc.render.image_settings.compression = 30
sc.view_settings.view_transform = 'Standard'
for fc in (sc.animation_data.action.layers[0].strips[0].channelbags[0].fcurves if sc.animation_data and sc.animation_data.action else []):
    pass
sc.animation_data_clear(); sc.view_settings.exposure = 0.0
for m in bpy.data.materials:
    if tuple(m.diffuse_color)[:3] == (0.8, 0.8, 0.8): m.diffuse_color = (0.72, 0.72, 0.72, 1)
sc.render.use_overwrite = False; sc.render.use_placeholder = False
sc.render.filepath = D + r"\animatic2\a_"
bpy.ops.render.render(animation=True)
print("ANIMATIC2 DONE")
