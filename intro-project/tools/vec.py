import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
F = np.load('combo.npy'); K=4
# сгладить ступеньку на затылке: линейная левая граница между y=205 и y=268
y0, y1 = 205*K, 268*K
l0 = np.where(F[y0])[0].min(); l1 = np.where(F[y1])[0].min()
for y in range(y0, y1):
    lx = int(round(l0 + (l1-l0)*(y-y0)/(y1-y0)))
    r = np.where(F[y])[0].max()
    F[y, lx:r] = True
F = nd.binary_fill_holes(F)
# обрезаем рамку снизу ровно
ys, xs = np.where(F)
top, bot, left, right = ys.min(), ys.max(), xs.min(), xs.max()
pad = 20
F = F[max(0,top-pad):bot+1, max(0,left-pad):right+pad]
H, W = F.shape
S = 3
big = cv2.resize((F*255).astype(np.uint8), (W*S, H*S), interpolation=cv2.INTER_CUBIC)
big = cv2.GaussianBlur(big, (0,0), 2.0)
_, big = cv2.threshold(big, 127, 255, cv2.THRESH_BINARY)
cs, _ = cv2.findContours(big, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)
c = cv2.approxPolyDP(c, 1.6, True)[:,0,:].astype(float)
n = len(c); d = f"M{c[0][0]:.1f} {c[0][1]:.1f}"
for i in range(n):
    p0,p1,p2,p3 = c[i-1], c[i], c[(i+1)%n], c[(i+2)%n]
    c1 = p1+(p2-p0)/6; c2 = p2-(p3-p1)/6
    d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
d += "Z"
vw, vh = big.shape[1], big.shape[0]
# центр головы и точка шеи (нормированные)
m = big > 0
rows = np.where(m.any(1))[0]
headrows = m[: int(vh*0.62)]
yy, xx = np.nonzero(headrows)
hx, hy = xx.mean()/vw, yy.mean()/vh
# шея: самое узкое место в нижней трети
widths = [(m[y].sum(), y) for y in range(int(vh*0.62), int(vh*0.85))]
wy = min(widths)[1]; wxs = np.where(m[wy])[0]
px, py = (wxs.min()+wxs.max())/2/vw, wy/vh
open('intro/src/bust.ts','w').write(
  f"export const BUST_W = {vw};\nexport const BUST_H = {vh};\n"
  f"export const BUST_HEAD = {{x: {hx:.4f}, y: {hy:.4f}}};\nexport const BUST_NECK = {{x: {px:.4f}, y: {py:.4f}}};\n"
  f"export const BUST_PATH = '{d}';\n")
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" width="{vw//4}" height="{vh//4}"><rect width="100%" height="100%" fill="white"/><path d="{d}"/></svg>'
open('bust.svg','w').write(svg)
print(vw, vh, n, len(d), hx, hy, px, py)
