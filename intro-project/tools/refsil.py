import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
im = np.array(Image.open('../scratchpad/ref/sil/g_1.6.png').convert('L')).astype(float)
m = (im < 110)
m = nd.binary_fill_holes(m)
lab, n = nd.label(m); sizes = nd.sum(m, lab, range(1, n+1)); m = lab == (np.argmax(sizes)+1)
m = nd.binary_fill_holes(m)
Image.fromarray((m*255).astype(np.uint8)).save('refmask.png')
ys, xs = np.where(m); print('bbox', xs.min(), xs.max(), ys.min(), ys.max(), m.shape)
for y in range(ys.min(), ys.max()+1, 8):
    r = np.where(m[y])[0]; print(y, r.min(), r.max())
