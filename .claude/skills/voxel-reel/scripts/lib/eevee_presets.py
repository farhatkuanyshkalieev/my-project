# EEVEE Next render presets for the voxel reference room.
# Usage inside Blender:  exec(open(path).read()); apply_preset("REFERENCE")  or  apply_preset("FAST")
import bpy

def adapt_scene_for_eevee(sc):
    """One-time tweaks so the Cycles-oriented scene behaves the same in EEVEE."""
    g=bpy.data.objects.get("Window_Glass")
    if g:
        g.visible_shadow=False                      # moonlight passes the glass
        m=g.data.materials[0]
        m.surface_render_method='DITHERED'; m.use_raytrace_refraction=True
    L=bpy.data.lights.get("Light_Claude_Inner")
    if L: L.use_shadow=False                        # glow leaves the opaque body (EEVEE has no shadow linking)
    st=bpy.data.materials.get("Steam")
    if st: st.surface_render_method='BLENDED'; st.use_transparent_shadow=True
    sc.render.engine='BLENDER_EEVEE'
    sc.render.use_motion_blur=True; sc.render.motion_blur_shutter=0.5
    try: sc.render.compositor_device='GPU'
    except Exception: pass

def _comp_lens(sc,enabled):
    nt=sc.compositing_node_group
    if not nt: return
    for n in nt.nodes:
        if n.bl_idname=="CompositorNodeLensdist": n.mute=not enabled

PRESETS={
 # "Эталон": target <= 2.5 s/frame at 1080x1920
 "REFERENCE":dict(samples=48,raytracing=True,rt_method='SCREEN',rt_res='2',rt_rough=0.5,
                  shadow_res=0.5,shadow_rays=1,shadow_steps=5,vol_tile='8',vol_samples=32,vol_shadows=True,vol_shadow_samples=8,
                  fast_gi=True,lens=True),
 # "Быстрый": target <= 0.7 s/frame for 30 s reels
 "FAST":dict(samples=12,raytracing=False,rt_method='SCREEN',rt_res='4',rt_rough=0.3,
             shadow_res=0.25,shadow_rays=1,shadow_steps=2,vol_tile='16',vol_samples=16,vol_shadows=True,vol_shadow_samples=4,
             fast_gi=False,lens=False),
}

def apply_preset(name,sc=None):
    sc=sc or bpy.context.scene; p=PRESETS[name]; e=sc.eevee
    adapt_scene_for_eevee(sc)
    e.taa_render_samples=p["samples"]
    e.use_raytracing=p["raytracing"]; e.ray_tracing_method=p["rt_method"]
    e.ray_tracing_options.resolution_scale=p["rt_res"]; e.ray_tracing_options.trace_max_roughness=p["rt_rough"]
    e.use_shadows=True; e.shadow_resolution_scale=p["shadow_res"]; e.shadow_ray_count=p["shadow_rays"]; e.shadow_step_count=p["shadow_steps"]
    e.volumetric_tile_size=p["vol_tile"]; e.volumetric_samples=p["vol_samples"]
    e.use_volumetric_shadows=p["vol_shadows"]; e.volumetric_shadow_samples=p["vol_shadow_samples"]
    e.use_fast_gi=p["fast_gi"]
    e.motion_blur_steps=1
    _comp_lens(sc,p["lens"])
    sc["render_preset"]=name

def _glass_for(name):
    g=bpy.data.objects.get("Window_Glass")
    if g: g.hide_render=(name=="FAST")   # FAST: no raytraced refraction, so drop the pane to keep the city visible

_apply_core=apply_preset
def apply_preset(name,sc=None):
    sc=sc or bpy.context.scene
    _apply_core(name,sc); _glass_for(name)
    sc.render.image_settings.compression=0 if name=="FAST" else 15
