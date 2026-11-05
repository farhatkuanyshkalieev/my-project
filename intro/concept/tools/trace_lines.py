import cv2, numpy as np, sys
src, out = sys.argv[1], sys.argv[2]
K=3
im = cv2.imread(src, cv2.IMREAD_GRAYSCALE)
# crop to drawing bbox
ys,xs = np.where(im<200); x0,x1,y0,y1 = xs.min()-6, xs.max()+6, ys.min()-6, ys.max()+6
im = im[y0:y1, x0:x1]
big = cv2.resize(im, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
bw = (big<215).astype(np.uint8)*255
th = cv2.ximgproc.thinning(bw)
cnts,_ = cv2.findContours(th, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
paths=[]
for c in cnts:
    if cv2.arcLength(c, False) < 6*K: continue
    a = cv2.approxPolyDP(c, 0.9, False).reshape(-1,2)/K
    # contour of a 1px skeleton walks there and back: keep the first half if it retraces
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x,y in a)
    paths.append((cv2.arcLength(c,False), d))
paths.sort(key=lambda p:-p[0])
W,H = im.shape[1], im.shape[0]
with open(out,'w') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" data-src-crop="{x0},{y0}">\n')
    for _,d in paths: f.write(f'<path d="{d}"/>\n')
    f.write('</svg>\n')
print(W,H,len(paths), (x0,y0,x1,y1))
