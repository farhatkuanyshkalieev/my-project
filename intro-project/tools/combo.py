import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
K=4
R = np.array(Image.open('refmask.png'))
Hh, Ww = R.shape
R4 = cv2.resize(R, (Ww*K, Hh*K), interpolation=cv2.INTER_CUBIC)
R4 = (cv2.GaussianBlur(R4,(0,0),2.0) > 127)
U = np.array(Image.open('mask3.png'))
s = 0.48
M = np.float32([[s*K, 0, (142 - 473*s)*K], [0, s*K, (66 - 16*s)*K]])
U4 = cv2.warpAffine(U, M, (Ww*K, Hh*K), flags=cv2.INTER_CUBIC) > 140
yy, xx = np.mgrid[0:Hh*K, 0:Ww*K] / K
A = (yy < 150) | ((yy < 262) & (xx < 238))
A &= ~((yy > 225) & (xx > 238))  # не трогаем лицо/шею спереди
B = ~A | ((yy >= 225) & (yy < 262))
F = (U4 & A) | (R4 & B)
F[(yy >= 230) & (yy < 262) & (xx > 176) & (xx < 280)] |= R4[(yy >= 230) & (yy < 262) & (xx > 176) & (xx < 280)]
# сгладить шов и мелкий мусор
F = nd.binary_closing(F, structure=np.ones((9,9)))
F = nd.binary_fill_holes(F)
lab, n = nd.label(F); sz = nd.sum(F, lab, range(1,n+1)); F = lab == (np.argmax(sz)+1)
F8 = (F*255).astype(np.uint8)
F8 = cv2.GaussianBlur(F8, (0,0), 3.0)
F = F8 > 127
Image.fromarray(np.where(F,0,255).astype(np.uint8)).save('combo.png')
np.save('combo.npy', F)
ys, xs = np.where(F); print(xs.min(), xs.max(), ys.min(), ys.max())
# сравнение: реф | юзер-волосы | итог
cmp = np.concatenate([np.where(R4,0,255), np.where(U4,0,255), np.where(F,0,255)], axis=1).astype(np.uint8)
Image.fromarray(cmp).resize((cmp.shape[1]//3, cmp.shape[0]//3)).save('combo_cmp.png')
