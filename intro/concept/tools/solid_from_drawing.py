import cv2, numpy as np, sys, json
src, out_json, out_png = sys.argv[1:4]; K=4
im=cv2.imread(src,cv2.IMREAD_GRAYSCALE)[320:783,76:1000]
big=cv2.resize(im,None,fx=K,fy=K,interpolation=cv2.INTER_CUBIC)
lines=(big<215).astype(np.uint8)
linesd=cv2.dilate(lines,np.ones((3,3),np.uint8))
free=(1-linesd).astype(np.uint8)
n,lab,stats,_=cv2.connectedComponentsWithStats(free,connectivity=4)
border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
dist=cv2.distanceTransform(free,cv2.DIST_L2,5)
H,W=free.shape
inr=np.zeros(n); 
for i in range(1,n):
    inr[i]=dist[lab==i].max()/K
mat_ids=[i for i in range(1,n) if i not in border and 0.9<inr[i]<8.6 and stats[i,cv2.CC_STAT_AREA]/K/K>2]
air_ids=[i for i in range(1,n) if i not in border and inr[i]>=8.6]
mat=np.isin(lab,mat_ids).astype(np.uint8)
# lines that touch material become material: dilate material over line pixels only
grow=cv2.dilate(mat,np.ones((7,7),np.uint8))
mat=np.where((grow>0)&(linesd>0),1,mat).astype(np.uint8)
mat=cv2.morphologyEx(mat,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
cnts,hier=cv2.findContours(mat,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
hier=hier[0]
shapes=[]
def simp(c): 
    a=cv2.approxPolyDP(c,1.2,True).reshape(-1,2)/K
    return [[round(float(x),2),round(float(y),2)] for x,y in a]
for i,c in enumerate(cnts):
    if hier[i][3]!=-1: continue
    if cv2.contourArea(c)/K/K<3: continue
    holes=[]; j=hier[i][2]
    while j!=-1:
        if cv2.contourArea(cnts[j])/K/K>1.5: holes.append(simp(cnts[j]))
        j=hier[j][0]
    shapes.append({"outer":simp(c),"holes":holes,"area":round(cv2.contourArea(c)/K/K,1)})
json.dump({"w":924,"h":463,"shapes":shapes},open(out_json,'w'))
vis=cv2.cvtColor(big,cv2.COLOR_GRAY2BGR)
over=vis.copy(); over[mat>0]=(60,60,200)
for i in air_ids: over[lab==i]=(200,180,120)
vis=cv2.addWeighted(vis,0.45,over,0.55,0)
cv2.imwrite(out_png,cv2.resize(vis,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA))
print(len(shapes),[s['area'] for s in shapes],sum(len(s['holes']) for s in shapes))
