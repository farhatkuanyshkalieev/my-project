import bpy, bmesh, math, numpy as np
from mathutils import Vector, Matrix
P=r"E:\3д Рилсики ЛоуПоли\my_avatar"
sc=bpy.context.scene
# hide every pixel-art face set (eyes, brows, nose, mouth)
for c in bpy.data.collections["Face_Expressions"].children:
    c.hide_render=True; c.hide_viewport=True

# ---- the photo face, stretched onto the front of the cube ----
img=bpy.data.images.load(P+r"\textures\ps2_head_256_v20.png")
m=bpy.data.materials.new("VX_PhotoFace"); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
o=nt.nodes.new("ShaderNodeOutputMaterial"); bs=nt.nodes.new("ShaderNodeBsdfPrincipled"); bs.inputs["Roughness"].default_value=0.65
tx=nt.nodes.new("ShaderNodeTexImage"); tx.image=img; tx.interpolation='Closest'
nt.links.new(tx.outputs[0],bs.inputs["Base Color"]); nt.links.new(bs.outputs[0],o.inputs[0])
W,H=0.372,0.388; ZT=1.199; Y=-0.19-0.0015; NG=28
U0,U1,T0,T1=0.20,0.80,0.10,0.86          # face region of the cylindrical head texture
bm=bmesh.new(); uvl=bm.loops.layers.uv.new("UVMap"); G={}
for j in range(NG+1):
    for i in range(NG+1):
        s=i/NG; t=j/NG
        G[(i,j)]=bm.verts.new((-W/2+s*W,Y,ZT-t*H))
for j in range(NG):
    for i in range(NG):
        q=[G[(i,j)],G[(i,j+1)],G[(i+1,j+1)],G[(i+1,j)]]
        f=bm.faces.new(q)
        for l in f.loops:
            ii,jj=[k for k,v in G.items() if v is l.vert][0]
            s=ii/NG; t=jj/NG
            l[uvl].uv=(U0+s*(U1-U0),1-(T0+t*(T1-T0)))
me=bpy.data.meshes.new("PhotoFace"); bm.to_mesh(me); bm.free()
pf=bpy.data.objects.new("PhotoFace",me); bpy.data.collections["Voxel_Avatar"].objects.link(pf)
me.materials.append(m)
for p in me.polygons: p.use_smooth=True
rig=bpy.data.objects["VX_Rig"]
pf.parent=rig; pf.parent_type='BONE'; pf.parent_bone="head"
pb=rig.pose.bones["head"]
pm=rig.matrix_world@pb.matrix@Matrix.Translation((0,pb.bone.length,0))
pf.matrix_parent_inverse=pm.inverted(); pf.matrix_basis=Matrix.Identity(4)

# ---- feature anchors in plane coords (s across, t down), from the texture layout ----
def st_of(u,imgy): return ((u-U0)/(U1-U0),(imgy-T0)/(T1-T0))
EYE_L=st_of(0.394,0.394); EYE_R=st_of(0.609,0.394)
BROW_L=st_of(0.394,0.335); BROW_R=st_of(0.609,0.335)
MOUTH=st_of(0.50,0.632); NOSE=st_of(0.50,0.54)
co0=np.array([[v.co.x,v.co.z] for v in me.vertices])
S=(co0[:,0]+W/2)/W; T=(ZT-co0[:,1])/H
def g(c,r): return np.exp(-(((S-c[0])/r[0])**2+((T-c[1])/r[1])**2))
def scale_at(c,r,ks,kt):
    w=g(c,r); return (S-c[0])*(ks-1)*w,(T-c[1])*(kt-1)*w
def shift_at(c,r,ds,dt):
    w=g(c,r); return ds*w,dt*w
pf.shape_key_add(name="Basis")
def key(name,parts):
    ds=np.zeros_like(S); dt=np.zeros_like(T)
    for a,b in parts: ds+=a; dt+=b
    kb=pf.shape_key_add(name=name,from_mix=False)
    for i,v in enumerate(kb.data):
        v.co=Vector((co0[i,0]+ds[i]*W, Y, co0[i,1]-dt[i]*H))
    return kb
E=(0.11,0.07)
key("Surprised",[scale_at(EYE_L,E,1.55,1.9),scale_at(EYE_R,E,1.55,1.9),
                 shift_at(BROW_L,(0.14,0.06),0,-0.07),shift_at(BROW_R,(0.14,0.06),0,-0.07),
                 scale_at(MOUTH,(0.13,0.08),0.8,2.4),shift_at(MOUTH,(0.16,0.10),0,0.03)])
key("Smile",[shift_at((MOUTH[0]-0.11,MOUTH[1]),(0.07,0.06),-0.04,-0.05),shift_at((MOUTH[0]+0.11,MOUTH[1]),(0.07,0.06),0.04,-0.05),
             scale_at(MOUTH,(0.16,0.07),1.35,1.0),scale_at(EYE_L,E,1.1,0.55),scale_at(EYE_R,E,1.1,0.55),
             shift_at((0.25,0.55),(0.10,0.08),0,-0.03),shift_at((0.75,0.55),(0.10,0.08),0,-0.03)])
key("Angry",[shift_at((0.44,0.31),(0.07,0.05),0.02,0.05),shift_at((0.56,0.31),(0.07,0.05),-0.02,0.05),
             scale_at(EYE_L,E,0.95,0.6),scale_at(EYE_R,E,0.95,0.6),
             shift_at((MOUTH[0]-0.10,MOUTH[1]),(0.06,0.05),0,0.04),shift_at((MOUTH[0]+0.10,MOUTH[1]),(0.06,0.05),0,0.04),
             scale_at(NOSE,(0.08,0.06),1.3,0.9)])
key("Tired",[scale_at(EYE_L,E,1.0,0.35),scale_at(EYE_R,E,1.0,0.35),shift_at(EYE_L,E,0,0.015),shift_at(EYE_R,E,0,0.015),
             shift_at(BROW_L,(0.12,0.05),-0.01,0.03),shift_at(BROW_R,(0.12,0.05),0.01,0.03),
             scale_at(MOUTH,(0.12,0.06),0.8,0.8),shift_at(MOUTH,(0.18,0.12),0,0.03)])
key("Oops",[shift_at(MOUTH,(0.12,0.07),0.12,-0.015),scale_at(MOUTH,(0.12,0.07),0.6,1.2),
            shift_at(BROW_R,(0.12,0.05),0,-0.06),scale_at(EYE_R,E,1.25,1.3),shift_at(EYE_L,E,0.03,0),shift_at(EYE_R,E,0.03,0)])
key("Blink",[scale_at(EYE_L,(0.12,0.06),1.0,0.08),scale_at(EYE_R,(0.12,0.06),1.0,0.08)])
key("Squish",[(np.zeros_like(S),(T-0.5)*-0.12)])   # whole-face jelly squash for accents

# ---- emotion cycle animation ----
KB=pf.data.shape_keys.key_blocks
seq=[("Neutral",14),("Surprised",26),("Smile",26),("Angry",26),("Tired",26),("Oops",26),("Smile",18),("Blink",8),("Neutral",14)]
names=[k.name for k in KB if k.name!="Basis"]
f=1
def setkeys(frame,active,extra=None):
    for n in names:
        KB[n].value=(1.0 if n==active else 0.0)
        if extra and n in extra: KB[n].value=extra[n]
        KB[n].keyframe_insert("value",frame=frame)
for tag,dur in seq:
    setkeys(f,tag); setkeys(f+dur-6,tag); f+=dur
END=f-1
# accent: a wobbly squash right at each switch
for k in range(len(seq)):
    pass
setkeys(END,"Neutral")
# head wobble on every emotion change
pbh=rig.pose.bones["head"]; pbh.rotation_mode='XYZ'
f=1
for i,(tag,dur) in enumerate(seq):
    ang={"Surprised":(-8,0,0),"Smile":(0,6,4),"Angry":(6,0,-3),"Tired":(10,-5,0),"Oops":(0,-10,-6),"Blink":(0,0,0),"Neutral":(0,0,0)}[tag]
    pbh.rotation_euler=(math.radians(ang[0]),math.radians(ang[1]),math.radians(ang[2]))
    pbh.keyframe_insert("rotation_euler",frame=f+5); pbh.keyframe_insert("rotation_euler",frame=f+dur-6)
    f+=dur
sc.frame_start=1; sc.frame_end=END; sc.render.fps=24

# ---- close-up camera, video render ----
cam=bpy.data.objects.get("Cam_MeFace")
cam.location=(0.20,-1.05,1.04)
cam.rotation_euler=(Vector((0,-0.19,1.0))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.dof.focus_distance=(Vector((0,-0.19,1.0))-cam.location).length
sc.camera=cam
for o in bpy.data.collections["Claude_Companion"].all_objects: o.hide_render=False
sc.render.resolution_x=640; sc.render.resolution_y=640
if hasattr(sc.eevee,"taa_render_samples"): sc.eevee.taa_render_samples=16
# stills: one frame per emotion
stills=[]
f=1
for tag,dur in seq[:6]+[seq[7]]:
    mid=f+dur//2
    stills.append((tag,mid)); f+=dur if (tag,dur)!=seq[7] else 0
fs=[]; f=1
for tag,dur in seq:
    fs.append((tag,f+dur//2)); f+=dur
want=["Neutral","Surprised","Smile","Angry","Tired","Oops","Blink"]
tiles=[]
for t in want:
    fr=[fr for tg,fr in fs if tg==t][0]
    sc.frame_set(fr); sc.render.filepath=P+r"\renders\photoface_%s.png"%t.lower()
    sc.render.image_settings.file_format='PNG'
    bpy.ops.render.render(write_still=True)
    im=bpy.data.images.load(sc.render.filepath); Wd,Hd=im.size; a=np.empty(Wd*Hd*4,np.float32); im.pixels.foreach_get(a)
    a=a.reshape(Hd,Wd,4)[::2,::2]; tiles.append(a)
blank=np.zeros_like(tiles[0]); blank[...,3]=1
row1=np.hstack(tiles[0:4]); row2=np.hstack(tiles[4:7]+[blank])
C=np.vstack([row2,row1]); Hh,Ww=C.shape[:2]
o=bpy.data.images.new("grid",Ww,Hh); o.pixels.foreach_set(C.ravel())
o.filepath_raw=P+r"\renders\photoface_emotions_grid.png"; o.file_format='PNG'; o.save()
bpy.ops.wm.save_as_mainfile(filepath=P+r"\voxel_avatar_photoface.blend")
# video
ok=False
try:
    sc.render.image_settings.media_type='VIDEO'
except Exception: pass
try:
    sc.render.image_settings.file_format='FFMPEG'
    sc.render.ffmpeg.format='MPEG4'; sc.render.ffmpeg.codec='H264'; sc.render.ffmpeg.constant_rate_factor='HIGH'
    ok=True
except Exception as ex:
    print("NOFFMPEG",ex)
sc.render.filepath=P+r"\renders\photoface_emotions.mp4" if ok else P+r"\renders\photoface_frames\f_"
bpy.ops.render.render(animation=True)
print("DONE",END,ok)
