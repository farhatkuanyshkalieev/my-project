import numpy as np, cv2
from PIL import Image
m = (np.array(Image.open('mask_isnet-general-use.png')) > 128).astype(np.uint8)*255
H, W = m.shape
m[302:, :] = 0  # оставляем голову
def bez(p0,p1,p2,p3,n=40):
    t=np.linspace(0,1,n)[:,None]; return ((1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t**2*p2+t**3*p3)
P=lambda *a: np.array(a,float)
B=480
front = np.vstack([bez(P(436,286),P(424,300),P(410,318),P(408,345)),
                   bez(P(408,345),P(414,385),P(440,430),P(462,B))])
back  = np.vstack([bez(P(298,290),P(312,305),P(326,322),P(332,340)),
                   bez(P(332,340),P(280,368),P(190,395),P(140,425)),
                   bez(P(140,425),P(110,445),P(95,465),P(88,B))])
poly = np.vstack([front, [[462,B],[88,B]], back[::-1]]).astype(np.int32)
body = np.zeros_like(m); cv2.fillPoly(body,[poly],255)
m = np.maximum(m, body)
m[B:, :] = 0
x0,y0,x1,y1 = 70, 105, 560, B
m = m[y0:y1, x0:x1]
S=8
big = cv2.resize(m,(m.shape[1]*S,m.shape[0]*S),interpolation=cv2.INTER_CUBIC)
big = cv2.GaussianBlur(big,(0,0),S*2.4)
_,big = cv2.threshold(big,127,255,cv2.THRESH_BINARY)
cs,_ = cv2.findContours(big,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c = max(cs,key=cv2.contourArea)[:,0,:].astype(float)
c = cv2.approxPolyDP(c.astype(np.float32),3.5,True)[:,0,:]
# Catmull-Rom -> Bezier
n=len(c); d=f"M{c[0][0]:.1f} {c[0][1]:.1f}"
for i in range(n):
    p0,p1,p2,p3=c[i-1],c[i],c[(i+1)%n],c[(i+2)%n]
    c1=p1+(p2-p0)/6; c2=p2-(p3-p1)/6
    d+=f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
d+="Z"
vw,vh=big.shape[1],big.shape[0]
open('intro/src/bust.ts','w').write(f"export const BUST_W = {vw};\nexport const BUST_H = {vh};\nexport const BUST_PATH = '{d}';\n")
open('bust.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" width="{vw//8}" height="{vh//8}"><rect width="100%" height="100%" fill="white"/><path d="{d}"/></svg>')
print(vw,vh,len(c), len(d))
