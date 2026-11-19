"""Cut the six Flow faces out of the 2K grid and build 1024x1024 face textures with the same layout as my face
(face region U 0.20-0.80, V 0.10-0.90; everything else = that person's skin tone).  blender -b --python npc_faces.py"""
import bpy, numpy as np
D = r"D:\3д Рилсики рендер\reel01\faces"
def load(p):
    im = bpy.data.images.load(p); W, H = im.size; a = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(a)
    return a.reshape(H, W, 4)[::-1][..., :3].copy()
def save(p, rgb):
    H, W = rgb.shape[:2]; im = bpy.data.images.new("out", W, H); a = np.ones((H, W, 4), np.float32); a[..., :3] = rgb[::-1]
    im.pixels.foreach_set(a.ravel()); im.filepath_raw = p; im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
def resize(img, h, w):
    H, W = img.shape[:2]; ys = np.clip(((np.arange(h) + 0.5) * H / h).astype(int), 0, H - 1); xs = np.clip(((np.arange(w) + 0.5) * W / w).astype(int), 0, W - 1)
    return img[ys][:, xs]
def blur(x, r):
    for ax in (0, 1):
        p = np.pad(x, [(r, r) if i == ax else (0, 0) for i in range(x.ndim)], mode='edge')
        c = np.cumsum(p, axis=ax, dtype=np.float64); c = np.concatenate([np.zeros_like(np.take(c, [0], axis=ax)), c], axis=ax)
        x = ((np.take(c, np.arange(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, np.arange(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)).astype(np.float32)
    return x
g = load(D + r"\grid.jpg"); N = 1024; cell = g.shape[1] // 3; ch = g.shape[0] // 2
U0, U1, V0, V1 = int(0.20 * N), int(0.80 * N), int(0.10 * N), int(0.90 * N)
names = ["woman_stroller", "man_suit", "teen", "grandma", "scooter", "courier"]
for i, nm in enumerate(names):
    r, c = divmod(i, 3); cellimg = g[r * ch:(r + 1) * ch, c * cell:(c + 1) * cell]
    crop = cellimg[int(0.10 * ch):int(0.82 * ch), int(0.21 * cell):int(0.79 * cell)]
    face = resize(crop, V1 - V0, U1 - U0)
    # skin tone = median of the central cheek area
    h, w = face.shape[:2]; cand = face[int(h * 0.50):int(h * 0.72), int(w * 0.30):int(w * 0.70)].reshape(-1, 3); cand = cand[(cand[:, 0] - cand[:, 2]) > 0.06]; skin = np.median(cand, axis=0)
    tex = np.empty((N, N, 3), np.float32); tex[...] = skin
    yy, xx = np.mgrid[0:h, 0:w]; cy, cx = h * 0.50, w * 0.5
    oval = ((yy - cy) / (h * 0.56)) ** 2 + ((xx - cx) / (w * 0.50)) ** 2
    m = np.clip((1.08 - oval) / 0.25, 0, 1)[..., None]; m = blur(m, 6)
    tex[V0:V1, U0:U1] = face * m + skin * (1 - m)
    save(D + r"\face_%s_1024.png" % nm, tex)
    print("FACE", nm, tuple(round(float(x), 3) for x in skin))
print("FACES OK")
