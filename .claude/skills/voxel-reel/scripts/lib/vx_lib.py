# shared helpers for the reference room scene
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler
P=r"E:\3д Рилсики ЛоуПоли\my_avatar"
MOD=0.05      # 1 voxel = 5 cm
HALF=0.025    # half voxel

def hex2srgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def s2l(c): return tuple(((x+0.055)/1.055)**2.4 if x>0.04045 else x/12.92 for x in c)
def lin(h): return s2l(hex2srgb(h)) if isinstance(h,str) else s2l(h)

def coll(name,parent=None):
    c=bpy.data.collections.get(name)
    if not c:
        c=bpy.data.collections.new(name); (parent or bpy.context.scene.collection).children.link(c)
    return c

# ---------------- VoxelMat node group ----------------
def voxel_group():
    g=bpy.data.node_groups.get("VoxelMat")
    if g: return g
    g=bpy.data.node_groups.new("VoxelMat",'ShaderNodeTree')
    it=g.interface
    it.new_socket("Color",in_out='INPUT',socket_type='NodeSocketColor').default_value=(0.5,0.5,0.5,1)
    s=it.new_socket("Roughness",in_out='INPUT',socket_type='NodeSocketFloat'); s.default_value=0.7
    s=it.new_socket("Subsurface",in_out='INPUT',socket_type='NodeSocketFloat'); s.default_value=0.0
    s=it.new_socket("Metallic",in_out='INPUT',socket_type='NodeSocketFloat'); s.default_value=0.0
    s=it.new_socket("Emission",in_out='INPUT',socket_type='NodeSocketFloat'); s.default_value=0.0
    s=it.new_socket("Cell Jitter",in_out='INPUT',socket_type='NodeSocketFloat'); s.default_value=0.0
    s=it.new_socket("Cell Size",in_out='INPUT',socket_type='NodeSocketFloat'); s.default_value=0.25
    it.new_socket("BSDF",in_out='OUTPUT',socket_type='NodeSocketShader')
    n=g.nodes; L=g.links
    gi=n.new("NodeGroupInput"); go=n.new("NodeGroupOutput")
    # surface noise +-3%
    tc=n.new("ShaderNodeTexCoord")
    nz=n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value=40.0; nz.inputs["Detail"].default_value=2.0
    L.new(tc.outputs["Object"],nz.inputs["Vector"])
    mr=n.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value=0.3; mr.inputs["From Max"].default_value=0.7
    mr.inputs["To Min"].default_value=0.97; mr.inputs["To Max"].default_value=1.03
    L.new(nz.outputs["Fac"],mr.inputs["Value"])
    # per-block shade jitter (used by walls: snap object coords to the block grid -> white noise)
    snap=n.new("ShaderNodeVectorMath"); snap.operation='SNAP'
    L.new(tc.outputs["Object"],snap.inputs[0]); cmb=n.new("ShaderNodeCombineXYZ")
    for k in ("X","Y","Z"): L.new(gi.outputs["Cell Size"],cmb.inputs[k])
    L.new(cmb.outputs[0],snap.inputs[1])
    wn=n.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions='3D'; L.new(snap.outputs[0],wn.inputs["Vector"])
    jm=n.new("ShaderNodeMapRange"); jm.inputs["To Min"].default_value=-1.0; jm.inputs["To Max"].default_value=1.0
    L.new(wn.outputs["Value"],jm.inputs["Value"])
    jx=n.new("ShaderNodeMath"); jx.operation='MULTIPLY'; L.new(jm.outputs["Result"],jx.inputs[0]); L.new(gi.outputs["Cell Jitter"],jx.inputs[1])
    j1=n.new("ShaderNodeMath"); j1.operation='ADD'; j1.inputs[1].default_value=1.0; L.new(jx.outputs[0],j1.inputs[0])
    # AO in seams/corners, strength 0.25
    ao=n.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value=0.06; ao.samples=8
    aom=n.new("ShaderNodeMapRange"); aom.inputs["To Min"].default_value=0.75; aom.inputs["To Max"].default_value=1.0
    L.new(ao.outputs["AO"],aom.inputs["Value"])
    # bevel edges +5% via pointiness
    geo=n.new("ShaderNodeNewGeometry")
    pm=n.new("ShaderNodeMapRange"); pm.inputs["From Min"].default_value=0.5; pm.inputs["From Max"].default_value=0.6
    pm.inputs["To Min"].default_value=1.0; pm.inputs["To Max"].default_value=1.05; pm.clamp=True
    L.new(geo.outputs["Pointiness"],pm.inputs["Value"])
    f1=n.new("ShaderNodeMath"); f1.operation='MULTIPLY'; L.new(mr.outputs["Result"],f1.inputs[0]); L.new(j1.outputs[0],f1.inputs[1])
    f2=n.new("ShaderNodeMath"); f2.operation='MULTIPLY'; L.new(f1.outputs[0],f2.inputs[0]); L.new(aom.outputs["Result"],f2.inputs[1])
    f3=n.new("ShaderNodeMath"); f3.operation='MULTIPLY'; L.new(f2.outputs[0],f3.inputs[0]); L.new(pm.outputs["Result"],f3.inputs[1])
    mul=n.new("ShaderNodeMix"); mul.data_type='RGBA'; mul.blend_type='MULTIPLY'; mul.inputs["Factor"].default_value=1.0
    L.new(gi.outputs["Color"],mul.inputs["A"]); L.new(f3.outputs[0],mul.inputs["B"])
    bs=n.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Specular IOR Level"].default_value=0.3
    L.new(mul.outputs["Result"],bs.inputs["Base Color"]); L.new(gi.outputs["Roughness"],bs.inputs["Roughness"])
    L.new(gi.outputs["Metallic"],bs.inputs["Metallic"]); L.new(gi.outputs["Subsurface"],bs.inputs["Subsurface Weight"])
    bs.inputs["Subsurface Radius"].default_value=(0.01,0.004,0.002)
    L.new(mul.outputs["Result"],bs.inputs["Emission Color"]); L.new(gi.outputs["Emission"],bs.inputs["Emission Strength"])
    L.new(bs.outputs[0],go.inputs["BSDF"])
    return g

def vmat(name,color,rough=0.7,sss=0.0,metal=0.0,attr=None,emis=0.0,jitter=0.0,cell=0.25):
    m=bpy.data.materials.get(name)
    if m: return m
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    o=nt.nodes.new("ShaderNodeOutputMaterial"); gn=nt.nodes.new("ShaderNodeGroup"); gn.node_tree=voxel_group()
    if attr:
        at=nt.nodes.new("ShaderNodeAttribute"); at.attribute_name=attr; at.attribute_type='GEOMETRY'
        nt.links.new(at.outputs["Color"],gn.inputs["Color"])
    else:
        gn.inputs["Color"].default_value=(*lin(color),1)
    gn.inputs["Roughness"].default_value=rough; gn.inputs["Subsurface"].default_value=sss
    gn.inputs["Metallic"].default_value=metal; gn.inputs["Emission"].default_value=emis
    gn.inputs["Cell Jitter"].default_value=jitter; gn.inputs["Cell Size"].default_value=cell
    nt.links.new(gn.outputs["BSDF"],o.inputs["Surface"])
    m.diffuse_color=(*lin(color),1) if not attr else (0.5,0.5,0.5,1)
    return m

def emat(name,color,strength,glossy=None):
    m=bpy.data.materials.get(name)
    if m: return m
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    o=nt.nodes.new("ShaderNodeOutputMaterial"); e=nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value=(*lin(color),1); e.inputs["Strength"].default_value=strength
    if glossy is not None:
        gl=nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value=glossy
        ad=nt.nodes.new("ShaderNodeAddShader"); nt.links.new(e.outputs[0],ad.inputs[0]); nt.links.new(gl.outputs[0],ad.inputs[1])
        nt.links.new(ad.outputs[0],o.inputs["Surface"])
    else:
        nt.links.new(e.outputs[0],o.inputs["Surface"])
    return m

def std_bevel(ob,width=0.004):
    bv=ob.modifiers.get("Bevel") or ob.modifiers.new("Bevel",'BEVEL')
    bv.width=width; bv.segments=2; bv.limit_method='ANGLE'; bv.angle_limit=math.radians(30); bv.harden_normals=True
    bv.miter_outer='MITER_ARC'
    return bv

# ---------------- block mesh builder ----------------
class Blocks:
    def __init__(self):
        self.bm=bmesh.new(); self.col=self.bm.loops.layers.color.new("Col"); self.mi=0
    def box(self,center,size,color=(1,1,1),rot=None,mat=0):
        c=Vector(center); sx,sy,sz=[s/2 for s in size]
        R=rot.to_matrix() if isinstance(rot,Euler) else (rot.to_3x3() if rot is not None else Matrix.Identity(3))
        vs=[]
        for dx,dy,dz in ((-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)):
            vs.append(self.bm.verts.new(c+R@Vector((dx*sx,dy*sy,dz*sz))))
        cl=(*lin(color),1.0) if isinstance(color,str) else (*color,1.0) if len(color)==3 else color
        for q in ((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)):
            f=self.bm.faces.new([vs[i] for i in q]); f.material_index=mat; f.smooth=True
            for l in f.loops: l[self.col]=cl
        return vs
    def obj(self,name,mats,collection,bevel=True,bw=0.004):
        me=bpy.data.meshes.new(name); self.bm.to_mesh(me); self.bm.free()
        ob=bpy.data.objects.new(name,me); collection.objects.link(ob)
        for m in (mats if isinstance(mats,(list,tuple)) else [mats]): me.materials.append(m)
        if bevel: std_bevel(ob,bw)
        else:
            for p in me.polygons: p.use_smooth=False
        return ob

def look_at(ob,target):
    d=Vector(target)-ob.location; ob.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
