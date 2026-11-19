import bpy, bmesh, math, random, numpy as np
from mathutils import Vector, Matrix
P=r"E:\3д Рилсики ЛоуПоли\my_avatar"
random.seed(7)
# clean factory scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
sc=bpy.context.scene
root=bpy.data.collections.new("Voxel_Avatar"); sc.collection.children.link(root)
def srgb(c): return tuple(((x+0.055)/1.055)**2.4 if x>0.04045 else x/12.92 for x in c)

# ---------------- materials: matte colour + light noise ----------------
MATS={}
def mat(name,rgb,rough=0.8,noise=0.06,use_attr=False):
    m=bpy.data.materials.new("VX_"+name); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    out=nt.nodes.new("ShaderNodeOutputMaterial"); bs=nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Roughness"].default_value=rough
    if "Specular IOR Level" in bs.inputs: bs.inputs["Specular IOR Level"].default_value=0.25
    nz=nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value=60.0; nz.inputs["Detail"].default_value=2.0
    mr=nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value=1-noise; mr.inputs["To Max"].default_value=1.0
    nt.links.new(nz.outputs["Fac"],mr.inputs["Value"])
    mul=nt.nodes.new("ShaderNodeMix"); mul.data_type='RGBA'; mul.blend_type='MULTIPLY'; mul.inputs["Factor"].default_value=1.0
    if use_attr:
        at=nt.nodes.new("ShaderNodeAttribute"); at.attribute_name="Col"; at.attribute_type='GEOMETRY'
        nt.links.new(at.outputs["Color"],mul.inputs["A"])
    else:
        mul.inputs["A"].default_value=(*srgb(rgb),1)
    nt.links.new(mr.outputs["Result"],mul.inputs["B"])
    nt.links.new(mul.outputs["Result"],bs.inputs["Base Color"]); nt.links.new(bs.outputs[0],out.inputs[0])
    MATS[name]=m; return m
SKIN=(0.93,0.72,0.60); HAIR=(0.30,0.19,0.12)
mat("skin",SKIN,0.7); mat("skin_dark",(0.86,0.62,0.52),0.7)
mat("hair",HAIR,0.75,0.05,True)
mat("tee",(0.075,0.075,0.085),0.9); mat("jeans",(0.21,0.31,0.48),0.85,0.10)
mat("belt",(0.14,0.09,0.06),0.6); mat("buckle",(0.6,0.6,0.62),0.35)
mat("shoe",(0.13,0.13,0.15),0.7); mat("sole",(0.90,0.90,0.88),0.6); mat("shoe_hi",(0.55,0.55,0.58),0.6)
mat("eye_w",(0.96,0.96,0.94),0.4,0.0); mat("pupil",(0.10,0.06,0.04),0.3,0.0)
mat("brow",(0.22,0.13,0.08),0.8,0.0); mat("mouth",(0.30,0.08,0.08),0.6,0.0); mat("teeth",(0.95,0.95,0.92),0.4,0.0)
mat("floor",(0.035,0.035,0.04),0.6,0.0)

def boxmesh(name,sx,sy,sz):
    bm=bmesh.new(); bmesh.ops.create_cube(bm,size=1.0)
    for v in bm.verts: v.co=Vector((v.co.x*sx,v.co.y*sy,v.co.z*sz))
    me=bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return me
def block(name,size,center,m,coll=root,bevel=None,rot=None):
    sx,sy,sz=size
    ob=bpy.data.objects.new(name,boxmesh(name,sx,sy,sz)); coll.objects.link(ob)
    ob.data.materials.append(MATS[m])
    M=Matrix.Translation(Vector(center))
    if rot: M=M@rot
    ob.matrix_world=M
    bw=bevel if bevel is not None else min(0.008,min(size)*0.18)
    bv=ob.modifiers.new("Bevel",'BEVEL'); bv.width=bw; bv.segments=2; bv.limit_method='NONE'
    for p in ob.data.polygons: p.use_smooth=True
    return ob
def wn(ob): return ob

BONEOF={}   # object -> bone name
def at(ob,bone): BONEOF[ob]=bone; return ob

# ---------------- body proportions (head ~1/3 of height, total ~1.28 m) ----------------
HEAD_C=Vector((0,0,1.005)); HS=(0.40,0.38,0.40)
at(block("Head",HS,HEAD_C,"skin",bevel=0.014),"head")
at(block("Neck",(0.13,0.12,0.06),(0,0.005,0.79),"skin"),"neck")
at(block("Torso_Tee",(0.30,0.17,0.31),(0,0,0.625),"tee",bevel=0.012),"chest")
at(block("Hips_Jeans",(0.295,0.165,0.085),(0,0,0.445),"jeans"),"hips")
at(block("Belt",(0.302,0.170,0.018),(0,0,0.478),"belt",bevel=0.003),"hips")
at(block("Buckle",(0.035,0.006,0.016),(0,-0.0875,0.478),"buckle",bevel=0.001),"hips")
at(block("Tee_Hem",(0.305,0.175,0.016),(0,0,0.478+0.012),"tee",bevel=0.004),"spine")
# ears
for sx in (-1,1):
    at(block("Ear_"+("L" if sx>0 else "R"),(0.026,0.05,0.075),(sx*0.212,0.02,0.985),"skin_dark",bevel=0.006),"head")

# ---------------- arms + hands (A-pose ~22deg) ----------------
BONES={}
def arm(side):
    sx=1 if side=='L' else -1
    S=Vector((sx*0.195,0,0.755)); a=math.radians(22)
    R=Matrix.Rotation(-sx*a,4,'Y')
    def W(x,y,t): return S+(R@Vector((x,y,-t)))
    def B(name,size,x,y,t,m,bone,bev=None,extra=None):
        rot=R if extra is None else R@extra
        return at(block(name+"."+side,size,W(x,y,t),m,bevel=bev,rot=rot),bone)
    B("Sleeve",(0.105,0.105,0.10),0,0,0.045,"tee","upper_arm."+side)
    B("UpperArm",(0.086,0.086,0.185),0,0,0.0875,"skin","upper_arm."+side,0.004)
    B("Forearm",(0.082,0.082,0.170),0,0,0.250,"skin","forearm."+side,0.004)
    B("Palm",(0.046,0.100,0.092),0,0,0.366,"skin","hand."+side,0.006)
    BONES["upper_arm."+side]=(W(0,0,0),W(0,0,0.17),"chest")
    BONES["forearm."+side]=(W(0,0,0.17),W(0,0,0.33),"upper_arm."+side)
    BONES["hand."+side]=(W(0,0,0.33),W(0,0,0.41),"forearm."+side)
    for nm,y,l1,l2 in (("index",-0.036,0.034,0.028),("middle",-0.012,0.039,0.031),("ring",0.012,0.036,0.028),("pinky",0.036,0.029,0.023)):
        t0=0.408
        B(nm+"_01",(0.024,0.021,l1+0.004),0,y,t0+l1/2,"skin",nm+".01."+side,0.003)
        B(nm+"_02",(0.023,0.020,l2+0.002),0,y,t0+l1+l2/2,"skin",nm+".02."+side,0.003)
        BONES[nm+".01."+side]=(W(0,y,t0),W(0,y,t0+l1),"hand."+side)
        BONES[nm+".02."+side]=(W(0,y,t0+l1),W(0,y,t0+l1+l2),nm+".01."+side)
    # thumb: front edge of the palm, angled forward/down
    tr=Matrix.Rotation(math.radians(35),4,'X')
    p0=(0.0,-0.058,0.338); d=Vector((0,-math.sin(math.radians(35)),math.cos(math.radians(35))))
    p1=Vector(p0)+d*0.034; p2=p1+d*0.029
    for i,(a0,a1) in enumerate(((Vector(p0),p1),(p1,p2))):
        c=(a0+a1)/2
        B("thumb_0%d"%(i+1),(0.024,0.024,0.038 if i==0 else 0.031),c.x,c.y,c.z,"skin","thumb.0%d.%s"%(i+1,side),0.003,tr)
    BONES["thumb.01."+side]=(W(*p0),W(p1.x,p1.y,p1.z),"hand."+side)
    BONES["thumb.02."+side]=(W(p1.x,p1.y,p1.z),W(p2.x,p2.y,p2.z),"thumb.01."+side)
arm("L"); arm("R")

# ---------------- legs + sneakers ----------------
def leg(side):
    sx=1 if side=='L' else -1
    x=sx*0.072
    at(block("Thigh."+side,(0.125,0.135,0.20),(x,0,0.325),"jeans"),"thigh."+side)
    at(block("Shin."+side,(0.115,0.125,0.17),(x,0,0.150),"jeans"),"shin."+side)
    at(block("Cuff."+side,(0.12,0.13,0.022),(x,0,0.072),"jeans",bevel=0.004),"shin."+side)
    at(block("Shoe."+side,(0.12,0.19,0.055),(x,-0.035,0.05),"shoe",bevel=0.012),"foot."+side)
    at(block("Sole."+side,(0.126,0.196,0.024),(x,-0.035,0.012),"sole",bevel=0.006),"foot."+side)
    at(block("ShoeStripe."+side,(0.124,0.08,0.012),(x,0.0,0.048),"shoe_hi",bevel=0.002),"foot."+side)
    at(block("Laces."+side,(0.06,0.06,0.006),(x,-0.075,0.079),"sole",bevel=0.002),"foot."+side)
    BONES["thigh."+side]=(Vector((x,0,0.425)),Vector((x,0,0.235)),"hips")
    BONES["shin."+side]=(Vector((x,0,0.235)),Vector((x,0,0.065)),"thigh."+side)
    BONES["foot."+side]=(Vector((x,0,0.065)),Vector((x,-0.12,0.03)),"shin."+side)
leg("L"); leg("R")

# ---------------- voxel hair (stepped, follows the real hairstyle) ----------------
V=0.04
HX0,HX1=-0.20,0.20; HY0,HY1=-0.19,0.19; HZ0,HZ1=0.805,1.205
occ=set()
def put(i,j,k): occ.add((i,j,k))
def cen(i,j,k): return Vector(((i+0.5)*V,(j+0.5)*V,HZ1+(k+0.5)*V))
for i in range(-6,6):
    for j in range(-6,6):
        x=(i+0.5)*V; y=(j+0.5)*V
        if abs(x)>0.245 or abs(y)>0.235: continue
        # top volume: thicker on the right (+x) where the hair is swept, a little lower at the back
        h=1+(1 if (x>0.0 and y<0.12) else 0)+(1 if (x>0.08 and -0.12<y<0.04 and random.random()<0.5) else 0)+(1 if random.random()<0.07 else 0)
        if abs(x)>0.22 or abs(y)>0.21: h=min(h,1)
        for k in range(-1,h): put(i,j,k)
        # shell around the head (sides/back/front), from the top down to a hairline that depends on where we are
        outside=(abs(x)>0.20) or (y>0.19) or (y<-0.19)
        if not outside: continue
        if y<-0.19:            # front: fringe swept toward +x, jagged pixel edge
            bottom=1.10+0.010*math.cos(x*9)
            if x>0.15: bottom=1.045
        elif abs(x)>0.20:      # sides: down to the top of the ears in front, lower behind
            bottom=1.02 if y<0.0 else 0.93-0.02*random.random()
        else:                  # back: covers to the nape
            bottom=0.88+(0.04 if random.random()<0.3 else 0)
        z=HZ1-V*0.5
        k=-1
        while HZ1+(k+0.5)*V>bottom-0.001:
            put(i,j,k); k-=1
# bangs tufts: a few hanging voxels at the fringe edge for the "pixel" look
for i,dz in ((-5,1),(4,1)):
    for kk in range(1,dz+1): put(i,-6,-int(round((HZ1-1.10)/V))-kk)
# build mesh of exposed faces with per-voxel colour variation
bm=bmesh.new(); colL=bm.loops.layers.color.new("Col")
base=Vector(srgb(HAIR))
dirs=[((1,0,0),(0,1,0),(0,0,1)),((-1,0,0),(0,0,1),(0,1,0)),((0,1,0),(0,0,1),(1,0,0)),((0,-1,0),(1,0,0),(0,0,1)),((0,0,1),(1,0,0),(0,1,0)),((0,0,-1),(0,1,0),(1,0,0))]
vcache={}
def vert(p):
    key=(round(p.x,5),round(p.y,5),round(p.z,5))
    if key not in vcache: vcache[key]=bm.verts.new(p)
    return vcache[key]
for (i,j,k) in occ:
    c=cen(i,j,k); f=0.88+0.22*random.random()
    if k>=1: f*=1.08
    colr=(base.x*f,base.y*f,base.z*f,1.0)
    for n,a,b in dirs:
        if (i+n[0],j+n[1],k+n[2]) in occ: continue
        n=Vector(n); a=Vector(a)*V/2; b=Vector(b)*V/2; fc=c+n*V/2
        pts=[fc-a-b,fc+a-b,fc+a+b,fc-a+b]
        try: face=bm.faces.new([vert(p) for p in pts])
        except ValueError: continue
        for l in face.loops: l[colL]=colr
bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
me=bpy.data.meshes.new("Hair"); bm.to_mesh(me); bm.free()
hair=bpy.data.objects.new("Hair",me); root.objects.link(hair); me.materials.append(MATS["hair"])
bv=hair.modifiers.new("Bevel",'BEVEL'); bv.width=0.004; bv.segments=2; bv.limit_method='ANGLE'
for p in me.polygons: p.use_smooth=False
at(hair,"head")

# ---------------- face: swappable pixel-art expressions ----------------
FY=-0.19-0.004
fcol=bpy.data.collections.new("Face_Expressions"); root.children.link(fcol)
EXPR={}
def fb(coll,name,size,x,z,m,dy=0.0,rot=None):
    ob=block(name,size,(x,FY-size[1]/2-dy,z),m,coll,bevel=min(0.003,min(size)*0.2),rot=rot)
    return at(ob,"head")
def eyes(coll,tag,h=0.05,pup_h=0.040,pup_dz=0.0,lid=0.0,closed=False):
    for sx in (-1,1):
        x=sx*0.085
        if closed:
            fb(coll,f"{tag}_eyeline_{sx}",(0.068,0.010,0.012),x,0.995,"pupil"); continue
        fb(coll,f"{tag}_eye_{sx}",(0.066,0.008,h),x,1.0,"eye_w")
        fb(coll,f"{tag}_pupil_{sx}",(0.032,0.006,pup_h),x-sx*0.010,1.0+pup_dz,"pupil",dy=0.004)
        if lid>0: fb(coll,f"{tag}_lid_{sx}",(0.070,0.008,lid),x,1.0+h/2-lid/2,"skin",dy=0.009)
def brows(coll,tag,z=1.058,ang=0.0,dz_in=0.0):
    for sx in (-1,1):
        r=Matrix.Rotation(sx*math.radians(ang),4,'Y')
        fb(coll,f"{tag}_brow_{sx}",(0.088,0.010,0.018),sx*0.085,z+dz_in,"brow",dy=0.0,rot=r)
def nose(coll,tag):
    ob=block(f"{tag}_nose",(0.044,0.032,0.036),(0,FY-0.012,0.952),"skin_dark",coll,bevel=0.006); at(ob,"head")
def make(tag,fn):
    c=bpy.data.collections.new("Face_"+tag); fcol.children.link(c); fn(c,tag); EXPR[tag]=c
    nose(c,tag)
def neutral(c,t):
    eyes(c,t); brows(c,t); fb(c,t+"_mouth",(0.090,0.008,0.018),0,0.885,"mouth")
def surprised(c,t):
    eyes(c,t,h=0.064,pup_h=0.034); brows(c,t,z=1.076)
    fb(c,t+"_mouth",(0.056,0.008,0.058),0,0.872,"mouth")
def smile(c,t):
    eyes(c,t,h=0.040,pup_h=0.032,pup_dz=0.002); brows(c,t,z=1.064)
    fb(c,t+"_mouth",(0.074,0.008,0.016),0,0.874,"mouth")
    fb(c,t+"_teeth",(0.056,0.006,0.008),0,0.879,"teeth",dy=0.002)
    for sx in (-1,1): fb(c,f"{t}_corner_{sx}",(0.016,0.008,0.018),sx*0.045,0.889,"mouth")
def angry(c,t):
    eyes(c,t,h=0.040,pup_h=0.032,lid=0.012); brows(c,t,z=1.046,ang=-18)
    fb(c,t+"_mouth",(0.070,0.008,0.016),0,0.882,"mouth")
    for sx in (-1,1): fb(c,f"{t}_corner_{sx}",(0.016,0.008,0.016),sx*0.042,0.870,"mouth")
def tired(c,t):
    eyes(c,t,h=0.046,pup_h=0.030,pup_dz=-0.006,lid=0.024); brows(c,t,z=1.050,ang=10)
    fb(c,t+"_mouth",(0.050,0.008,0.014),0,0.884,"mouth")
def blink(c,t):
    eyes(c,t,closed=True); brows(c,t); fb(c,t+"_mouth",(0.090,0.008,0.018),0,0.885,"mouth")
def oops(c,t):
    # "oops": eyes look aside, one brow up, small mouth pulled to one side
    for sx in (-1,1):
        x=sx*0.085
        fb(c,f"{t}_eye_{sx}",(0.066,0.008,0.050),x,1.0,"eye_w")
        fb(c,f"{t}_pupil_{sx}",(0.030,0.006,0.038),x+0.016,0.996,"pupil",dy=0.004)
    fb(c,t+"_brow_-1",(0.088,0.010,0.018),-0.085,1.060,"brow",rot=Matrix.Rotation(math.radians(-8),4,'Y'))
    fb(c,t+"_brow_1",(0.088,0.010,0.018),0.085,1.078,"brow",rot=Matrix.Rotation(math.radians(10),4,'Y'))
    fb(c,t+"_mouth",(0.046,0.008,0.016),0.045,0.884,"mouth",rot=Matrix.Rotation(math.radians(-14),4,'Y'))
    fb(c,t+"_mouthc",(0.016,0.008,0.016),0.071,0.893,"mouth")
for tag,fn in (("Neutral",neutral),("Surprised",surprised),("Smile",smile),("Angry",angry),("Tired",tired),("Blink",blink),("Oops",oops)):
    make(tag,fn)
def show_expr(tag):
    for t,c in EXPR.items():
        c.hide_render=(t!=tag); c.hide_viewport=(t!=tag)
show_expr("Neutral")

# ---------------- armature (rigid bone-parented blocks) ----------------
BONES["hips"]=(Vector((0,0,0.43)),Vector((0,0,0.50)),None)
BONES["spine"]=(Vector((0,0,0.50)),Vector((0,0,0.62)),"hips")
BONES["chest"]=(Vector((0,0,0.62)),Vector((0,0,0.77)),"spine")
BONES["neck"]=(Vector((0,0,0.77)),Vector((0,0,0.81)),"chest")
BONES["head"]=(Vector((0,0,0.81)),Vector((0,0,1.22)),"neck")
ad=bpy.data.armatures.new("VX_Rig"); rig=bpy.data.objects.new("VX_Rig",ad); root.objects.link(rig)
bpy.context.view_layer.objects.active=rig
for o in bpy.context.view_layer.objects: o.select_set(o==rig)
bpy.ops.object.mode_set(mode='EDIT')
core=["hips","spine","chest","neck","head"]; order=core+[k for k in BONES if k not in core]
for n in order:
    h,t,p=BONES[n]; b=ad.edit_bones.new(n); b.head=h; b.tail=t
for n in order:
    if BONES[n][2]: ad.edit_bones[n].parent=ad.edit_bones[BONES[n][2]]
bpy.ops.object.mode_set(mode='OBJECT')
rig.hide_render=True; ad.display_type='STICK'; rig.show_in_front=True
bpy.context.view_layer.update()
for ob,bn in BONEOF.items():
    mw=ob.matrix_world.copy()
    ob.parent=rig; ob.parent_type='BONE'; ob.parent_bone=bn
    pb=rig.pose.bones[bn]
    pm=rig.matrix_world@pb.matrix@Matrix.Translation((0,pb.bone.length,0))
    ob.matrix_parent_inverse=pm.inverted(); ob.matrix_basis=mw
print("BLOCKS",len(BONEOF),"BONES",len(ad.bones),"HAIRVOX",len(occ))

# ---------------- cinematic light, dark set, DOF ----------------
w=bpy.data.worlds.new("VX_World"); sc.world=w; w.use_nodes=True
bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=(0.006,0.007,0.010,1); bg.inputs[1].default_value=1.0
fl=bpy.data.objects.new("Floor",boxmesh("Floor",8,8,0.02)); root.objects.link(fl); fl.location=(0,0,-0.01); fl.data.materials.append(MATS["floor"])
def light(name,typ,loc,target,energy,color,size):
    L=bpy.data.lights.new(name,typ); L.energy=energy; L.color=color
    if typ=='AREA': L.size=size
    else: L.shadow_soft_size=size
    o=bpy.data.objects.new(name,L); root.objects.link(o); o.location=loc
    o.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler(); return o
light("Key",'AREA',(-1.4,-1.2,1.6),(0,0,0.8),220,(1.0,0.72,0.48),1.2)
light("Rim",'AREA',(1.3,1.4,1.5),(0,0,0.9),160,(0.55,0.70,1.0),0.8)
light("Fill",'AREA',(1.2,-1.6,0.6),(0,0,0.6),18,(0.85,0.88,1.0),2.0)
sc.render.engine='BLENDER_EEVEE'
e=sc.eevee
for a,v in (("taa_render_samples",64),("use_shadows",True),("use_raytracing",True),("use_gtao",True)):
    if hasattr(e,a): setattr(e,a,v)
sc.view_settings.view_transform='AgX'
try: sc.view_settings.look='AgX - Medium High Contrast'
except Exception: pass
sc.render.filter_size=1.5

def cam(name,loc,target,lens,fstop):
    c=bpy.data.cameras.new(name); c.lens=lens; c.dof.use_dof=True; c.dof.aperture_fstop=fstop
    o=bpy.data.objects.new(name,c); root.objects.link(o); o.location=loc
    o.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    c.dof.focus_distance=(Vector(target)-Vector(loc)).length; return o
def render(o,out,rx,ry):
    sc.camera=o; sc.render.resolution_x=rx; sc.render.resolution_y=ry; sc.render.filepath=out
    bpy.ops.render.render(write_still=True)
    im=bpy.data.images.load(out); W,H=im.size; a=np.empty(W*H*4,np.float32); im.pixels.foreach_get(a)
    return a.reshape(H,W,4)

# ================= Claude Code companion: flying voxel block =================
mat("claude",(0.90,0.43,0.27),0.75,0.05); mat("cl_eye",(0.09,0.06,0.05),0.5,0.0)
clc=bpy.data.collections.new("Claude_Companion"); root.children.link(clc)
CL_C=Vector((0.60,-0.06,0.86))          # hovers at my shoulder height, to my left side
ca=bpy.data.armatures.new("CL_Rig"); crig=bpy.data.objects.new("CL_Rig",ca); clc.objects.link(crig); crig.location=CL_C
bpy.context.view_layer.objects.active=crig
for o in bpy.context.view_layer.objects: o.select_set(o==crig)
bpy.ops.object.mode_set(mode='EDIT')
# proportions measured from the reference sprite (30x21 px body, 1 px ~ 0.0147 m)
CB={"body":((0,0,-0.155),(0,0,0.155),None)}
for side,sx in (("L",1),("R",-1)):
    CB["arm.%s.01"%side]=((sx*0.215,0,0.0),(sx*0.278,0,0.0),"body")
    CB["arm.%s.02"%side]=((sx*0.278,0,0.0),(sx*0.337,0,0.0),"arm.%s.01"%side)
LEGX=(-0.194,-0.081,0.081,0.194)
for i,x in enumerate(LEGX):
    CB["leg.%d"%(i+1)]=((x,0,-0.150),(x,0,-0.258),"body")
for n,(h,t,p) in CB.items():
    b=ca.edit_bones.new(n); b.head=h; b.tail=t
for n,(h,t,p) in CB.items():
    if p: ca.edit_bones[n].parent=ca.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')
crig.hide_render=True; ca.display_type='STICK'; crig.show_in_front=True
CLOF={}
def cblock(name,size,lc,m,bone,coll=clc,bev=None,rot=None):
    ob=block(name,size,CL_C+Vector(lc),m,coll,bevel=bev,rot=rot); CLOF[ob]=bone; return ob
cblock("Claude_Body",(0.44,0.26,0.31),(0,0,0),"claude","body",bev=0.014)
for side,sx in (("L",1),("R",-1)):
    cblock("Claude_Arm_%s_01"%side,(0.070,0.100,0.103),(sx*0.250,0,0.0),"claude","arm.%s.01"%side,bev=0.008)
    cblock("Claude_Arm_%s_02"%side,(0.066,0.096,0.100),(sx*0.305,0,0.0),"claude","arm.%s.02"%side,bev=0.008)
for i,x in enumerate(LEGX):
    cblock("Claude_Leg_%d"%(i+1),(0.044,0.060,0.108),(x,0,-0.203),"claude","leg.%d"%(i+1),bev=0.006)
CFY=-0.13-0.004
cfc=bpy.data.collections.new("Claude_Expressions"); clc.children.link(cfc)
CEXPR={}
def cf(coll,name,size,x,z,m="cl_eye"):
    return cblock(name,size,(x,CFY-size[1]/2,z),m,"body",coll,bev=min(0.003,min(size)*0.2))
EX,EZ=0.150,0.088
def c_neutral(c,t):
    for sx in (-1,1): cf(c,f"{t}_eye_{sx}",(0.059,0.008,0.073),sx*EX,EZ)
def c_joy(c,t):
    for sx in (-1,1):
        for dx,dz in ((-0.024,-0.010),(0.0,0.012),(0.024,-0.010)): cf(c,f"{t}_eye_{sx}_{dx}",(0.024,0.008,0.024),sx*EX+dx,EZ+dz)
    cf(c,t+"_mouth",(0.052,0.008,0.018),0,-0.045)
    for sx in (-1,1): cf(c,f"{t}_mc_{sx}",(0.018,0.008,0.018),sx*0.035,-0.029)
def c_shock(c,t):
    for sx in (-1,1): cf(c,f"{t}_eye_{sx}",(0.088,0.008,0.088),sx*EX,EZ-0.012)
    cf(c,t+"_mouth",(0.040,0.008,0.040),0,-0.060)
def c_think(c,t):
    cf(c,t+"_eye_-1",(0.050,0.008,0.060),-EX+0.025,EZ+0.012)
    cf(c,t+"_eye_1",(0.050,0.008,0.040),EX+0.025,EZ+0.020)
    cf(c,t+"_mouth",(0.036,0.008,0.014),0.055,-0.045)
for tag,fn in (("Neutral",c_neutral),("Joy",c_joy),("Shock",c_shock),("Thinking",c_think)):
    cc=bpy.data.collections.new("CL_Face_"+tag); cfc.children.link(cc); fn(cc,tag); CEXPR[tag]=cc
def show_cl(tag):
    for t,c in CEXPR.items(): c.hide_render=(t!=tag); c.hide_viewport=(t!=tag)
show_cl("Neutral")
bpy.context.view_layer.update()
for ob,bn in CLOF.items():
    mw=ob.matrix_world.copy()
    ob.parent=crig; ob.parent_type='BONE'; ob.parent_bone=bn
    pb=crig.pose.bones[bn]
    pm=crig.matrix_world@pb.matrix@Matrix.Translation((0,pb.bone.length,0))
    ob.matrix_parent_inverse=pm.inverted(); ob.matrix_basis=mw
# soft orange underglow that follows it (shows it is in the air)
gl=bpy.data.lights.new("Claude_Glow",'AREA'); gl.energy=160; gl.color=(1.0,0.50,0.24); gl.size=0.30
glo=bpy.data.objects.new("Claude_Glow",gl); clc.objects.link(glo); glo.parent=crig; glo.location=(0,0,-0.30)
# idle hover: slow up/down bob, looping
for f,dz in ((1,0.0),(36,0.035),(72,0.0)):
    crig.location=CL_C+Vector((0,0,dz)); crig.keyframe_insert("location",index=2,frame=f)
act=crig.animation_data.action
try: fcs=list(act.fcurves)
except Exception:
    fcs=[fc for l in act.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
for fc in fcs:
    for kp in fc.keyframe_points: kp.interpolation='SINE'
    fc.modifiers.new('CYCLES')
sc.frame_start=1; sc.frame_end=72; sc.render.fps=24
def pose_arm(side,deg):
    pb=crig.pose.bones["arm.%s.01"%side]; h=pb.bone.head_local
    sx=1 if side=="L" else -1
    R=Matrix.Translation(h)@Matrix.Rotation(-sx*math.radians(deg),4,'Y')@Matrix.Translation(-h)
    pb.matrix=R@pb.bone.matrix_local
    bpy.context.view_layer.update()
def reset_pose():
    for pb in crig.pose.bones: pb.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()

MY_OBS=list(BONEOF.keys())
CL_OBS=list(CLOF.keys())+[glo]
def solo(group_hide):
    for o in MY_OBS: o.hide_render=False
    for o in CL_OBS: o.hide_render=False
    for o in group_hide: o.hide_render=True
# ================= cameras + renders =================
RD=P+r"\renders\voxel_v8_"
sc.frame_set(18)
def look(name,loc,target,lens,fstop):
    return cam(name,loc,target,lens,fstop)
a=math.radians(-16)
cDuo=look("Cam_Duo",(0.24+2.25*math.sin(a),-2.25*math.cos(a),0.82),(0.24,0,0.62),40,4.5)
pose_arm("L",35)
Duo=render(cDuo,RD+"duo.png",960,960)
reset_pose()
af=math.radians(-10)
cMe=look("Cam_MeFace",(1.0*math.sin(af),-1.0*math.cos(af),1.02),(0,-0.19,1.0),50,2.8)
me_tiles=[]
solo(CL_OBS)
for tag in ("Angry","Tired","Blink","Oops"):
    show_expr(tag); me_tiles.append(render(cMe,RD+"me_%s.png"%tag.lower(),330,240))
show_expr("Neutral")
sc.frame_set(1)
clfront=CL_C+Vector((0,-0.13,-0.05))
cCl=look("Cam_ClaudeFace",(CL_C.x+1.25*math.sin(math.radians(8)),CL_C.y-1.25*math.cos(math.radians(8)),CL_C.z+0.02),clfront,50,2.8)
cl_tiles=[]
solo(MY_OBS)
for tag in ("Neutral","Joy","Shock","Thinking"):
    show_cl(tag)
    if tag=="Thinking": pose_arm("R",-70)
    if tag=="Joy": pose_arm("L",45); pose_arm("R",45)
    cl_tiles.append(render(cCl,RD+"claude_%s.png"%tag.lower(),330,240))
    reset_pose()
show_cl("Neutral"); solo([])
colA=np.vstack(me_tiles[::-1]); colB=np.vstack(cl_tiles[::-1])
C=np.hstack([Duo,colA,colB]); H,W=C.shape[:2]
o=bpy.data.images.new("combo",W,H); o.pixels.foreach_set(C.ravel())
o.filepath_raw=RD+"duo_emotions.png"; o.file_format='PNG'; o.save()
sc.camera=cDuo; sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=P+r"\voxel_avatar.blend")
print("DONE")
