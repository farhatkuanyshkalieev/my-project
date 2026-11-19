# Материалы: PBR из Poly Haven, ткани (пуховик, вязка, кожа), щетина, древесина.
import bpy
from .core import asset


def _img(path, non_color=False):
    im = bpy.data.images.load(path, check_existing=True)
    if non_color:
        im.colorspace_settings.name = "Non-Color"
    return im


def pbr_nodes(nt, tex, scale=1.0, tint=None, rough_mul=1.0, bump=0.3, coord="UV"):
    """Узлы PBR-набора Poly Haven (diff/nor/rough/disp) в дереве nt → Principled BSDF."""
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    nt.links.new(tc.outputs[coord], mp.inputs[0])

    def t(part, nc):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = _img(asset("textures", tex, part), nc)
        nt.links.new(mp.outputs[0], n.inputs[0])
        return n

    d = t("diff", False)
    if tint:
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.inputs[7].default_value = (*tint, 1)
        nt.links.new(d.outputs[0], mix.inputs[6])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    else:
        nt.links.new(d.outputs[0], bsdf.inputs["Base Color"])
    r = t("rough", True)
    rm = nt.nodes.new("ShaderNodeMath")
    rm.operation = "MULTIPLY"
    rm.inputs[1].default_value = rough_mul
    nt.links.new(r.outputs[0], rm.inputs[0])
    nt.links.new(rm.outputs[0], bsdf.inputs["Roughness"])
    n = t("nor", True)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(n.outputs[0], nm.inputs["Color"])
    disp = t("disp", True)
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = bump
    b.inputs["Distance"].default_value = 0.02
    nt.links.new(disp.outputs[0], b.inputs["Height"])
    nt.links.new(nm.outputs[0], b.inputs["Normal"])
    nt.links.new(b.outputs[0], bsdf.inputs["Normal"])
    return bsdf


def _fresh(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def pbr(name, tex, scale=1.0, tint=None, rough_mul=1.0, bump=0.3):
    m, nt, out = _fresh(name)
    b = pbr_nodes(nt, tex, scale, tint, rough_mul, bump)
    nt.links.new(b.outputs[0], out.inputs[0])
    return m


def simple(name, color, rough=0.6, emit=None, strength=0.0, metal=0.0):
    m, nt, out = _fresh(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = (*color, 1)  # цвет в Workbench-аниматике
    return m


def parka(name="M_Parka", col=(0.075, 0.088, 0.04), period=0.085):
    """Стёганый пуховик: тёмные швы по поясам, молния спереди, микроскладки (по позе покоя)."""
    m, nt, out = _fresh(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs["Roughness"].default_value = 0.6
    b.inputs["Sheen Weight"].default_value = 0.35
    b.inputs["Sheen Tint"].default_value = (0.5, 0.55, 0.4, 1)
    rest = nt.nodes.new("ShaderNodeAttribute")
    rest.attribute_name = "rest_position"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(rest.outputs["Vector"], sep.inputs[0])
    div = nt.nodes.new("ShaderNodeMath")
    div.operation = "DIVIDE"
    div.inputs[1].default_value = period
    nt.links.new(sep.outputs["Z"], div.inputs[0])
    pp = nt.nodes.new("ShaderNodeMath")
    pp.operation = "PINGPONG"
    pp.inputs[1].default_value = 0.5
    nt.links.new(div.outputs[0], pp.inputs[0])
    seam = nt.nodes.new("ShaderNodeMapRange")
    seam.inputs["From Max"].default_value = 0.08
    nt.links.new(pp.outputs[0], seam.inputs["Value"])
    ax = nt.nodes.new("ShaderNodeMath")
    ax.operation = "ABSOLUTE"
    nt.links.new(sep.outputs["X"], ax.inputs[0])
    zr = nt.nodes.new("ShaderNodeMapRange")
    zr.inputs["From Min"].default_value = 0.006
    zr.inputs["From Max"].default_value = 0.009
    nt.links.new(ax.outputs[0], zr.inputs["Value"])
    front = nt.nodes.new("ShaderNodeMath")
    front.operation = "LESS_THAN"
    nt.links.new(sep.outputs["Y"], front.inputs[0])
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(zr.outputs[0], inv.inputs[1])
    zm = nt.nodes.new("ShaderNodeMath")
    zm.operation = "MULTIPLY"
    nt.links.new(inv.outputs[0], zm.inputs[0])
    nt.links.new(front.outputs[0], zm.inputs[1])
    c1 = nt.nodes.new("ShaderNodeMix")
    c1.data_type = "RGBA"
    c1.inputs[6].default_value = (col[0] * 0.35, col[1] * 0.35, col[2] * 0.35, 1)
    c1.inputs[7].default_value = (*col, 1)
    nt.links.new(seam.outputs[0], c1.inputs[0])
    c2 = nt.nodes.new("ShaderNodeMix")
    c2.data_type = "RGBA"
    c2.inputs[7].default_value = (0.02, 0.02, 0.02, 1)
    nt.links.new(zm.outputs[0], c2.inputs[0])
    nt.links.new(c1.outputs[2], c2.inputs[6])
    nt.links.new(c2.outputs[2], b.inputs["Base Color"])
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 60
    nt.links.new(rest.outputs["Vector"], n.inputs[0])
    bu = nt.nodes.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = 0.08
    nt.links.new(n.outputs[0], bu.inputs["Height"])
    nt.links.new(bu.outputs[0], b.inputs["Normal"])
    m.diffuse_color = (*col, 1)
    return m


def knit(name, col, scale=200.0):
    """Вязка: петли (Voronoi до края) × рубчик, пушистость через Sheen."""
    m, nt, out = _fresh(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = 0.9
    b.inputs["Sheen Roughness"].default_value = 0.6
    b.inputs["Sheen Tint"].default_value = (min(1, col[0] * 3), min(1, col[1] * 3), min(1, col[2] * 3), 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale * 0.6)
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.feature = "DISTANCE_TO_EDGE"
    nt.links.new(mp.outputs[0], v.inputs[0])
    rib = nt.nodes.new("ShaderNodeTexWave")
    rib.wave_type = "BANDS"
    rib.bands_direction = "X"
    rib.inputs["Scale"].default_value = scale * 0.08
    nt.links.new(tc.outputs["Object"], rib.inputs[0])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(v.outputs["Distance"], mul.inputs[0])
    nt.links.new(rib.outputs[1], mul.inputs[1])
    bu = nt.nodes.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = 0.9
    nt.links.new(mul.outputs[0], bu.inputs["Height"])
    nt.links.new(bu.outputs[0], b.inputs["Normal"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 25
    cm = nt.nodes.new("ShaderNodeMix")
    cm.data_type = "RGBA"
    cm.blend_type = "MULTIPLY"
    cm.inputs[0].default_value = 0.35
    cm.inputs[6].default_value = (*col, 1)
    nt.links.new(nz.outputs[1], cm.inputs[7])
    nt.links.new(cm.outputs[2], b.inputs["Base Color"])
    m.diffuse_color = (*col, 1)
    return m


def leather(name="M_Gloves", col=(0.12, 0.06, 0.028)):
    m, nt, out = _fresh(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs["Base Color"].default_value = (*col, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.inputs["Scale"].default_value = 300
    nt.links.new(tc.outputs["Object"], v.inputs[0])
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 40
    nt.links.new(tc.outputs["Object"], n.inputs[0])
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value = 0.35
    r.inputs["To Max"].default_value = 0.75
    nt.links.new(n.outputs[0], r.inputs["Value"])
    nt.links.new(r.outputs[0], b.inputs["Roughness"])
    bu = nt.nodes.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = 0.1
    nt.links.new(v.outputs["Distance"], bu.inputs["Height"])
    nt.links.new(bu.outputs[0], b.inputs["Normal"])
    m.diffuse_color = (*col, 1)
    return m


def stubble(name="M_Stubble"):
    m, nt, out = _fresh(name)
    m.surface_render_method = "DITHERED"
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs["Base Color"].default_value = (0.03, 0.022, 0.017, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.inputs["Scale"].default_value = 900
    nt.links.new(tc.outputs["Object"], v.inputs[0])
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["From Max"].default_value = 0.22
    r.inputs["To Min"].default_value = 0.85
    r.inputs["To Max"].default_value = 0.0
    nt.links.new(v.outputs["Distance"], r.inputs["Value"])
    nt.links.new(r.outputs[0], b.inputs["Alpha"])
    return m


def endgrain(name="M_EndGrain"):
    """Торец полена: годичные кольца по расстоянию от оси Y объекта."""
    m, nt, out = _fresh(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs[0], comb.inputs[0])
    nt.links.new(sep.outputs[2], comb.inputs[1])
    ln = nt.nodes.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    nt.links.new(comb.outputs[0], ln.inputs[0])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 30
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "MULTIPLY_ADD"
    add.inputs[1].default_value = 0.006
    nt.links.new(noise.outputs[0], add.inputs[0])
    nt.links.new(ln.outputs[1], add.inputs[2])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 240
    nt.links.new(add.outputs[0], mul.inputs[0])
    wave = nt.nodes.new("ShaderNodeMath")
    wave.operation = "SINE"
    nt.links.new(mul.outputs[0], wave.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.42, 0.27, 0.15, 1)
    ramp.color_ramp.elements[1].color = (0.78, 0.6, 0.4, 1)
    nt.links.new(wave.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.85
    m.diffuse_color = (0.7, 0.52, 0.33, 1)
    return m


def splitwood(name="M_SplitWood"):
    m, nt, out = _fresh(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    w = nt.nodes.new("ShaderNodeTexWave")
    w.wave_type = "BANDS"
    w.bands_direction = "Y"
    w.inputs["Scale"].default_value = 2.0
    w.inputs["Distortion"].default_value = 9.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.5, 0.33, 0.18, 1)
    ramp.color_ramp.elements[1].color = (0.82, 0.64, 0.42, 1)
    nt.links.new(w.outputs[1], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.8
    m.diffuse_color = (0.75, 0.57, 0.36, 1)
    return m
