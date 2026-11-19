"""Photo face -> 1024x1024 face texture in the layout used by the voxel characters (face region U .20-.80, V .10-.90,
everything else = the person's skin tone).  Input: a frontal photo, cropped from the top of the hair to the chin and from
ear to ear (ask the user for exactly that crop, or crop it yourself with ffmpeg).  Run inside Blender's python:
  blender -b --python face_from_photo.py -- in=photo.jpg out=face_<name>_1024.png"""
import bpy, sys, numpy as np
argv = sys.argv[sys.argv.index("--") + 1:]
def arg(k): return [a[len(k) + 1:] for a in argv if a.startswith(k + "=")][0]
def load(p):
    im = bpy.data.images.load(p); W, H = im.size; a = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(a)
    return a.reshape(H, W, 4)[::-1][..., :3].copy()
def save(p, rgb):
    H, W = rgb.shape[:2]; im = bpy.data.images.new("out", W, H); a = np.ones((H, W, 4), np.float32); a[..., :3] = rgb[::-1]
    im.pixels.foreach_set(a.ravel()); im.filepath_raw = p; im.file_format = 'PNG'; im.save()
def resize(img, h, w):
    H, W = img.shape[:2]; ys = np.clip(((np.arange(h) + 0.5) * H / h).astype(int), 0, H - 1); xs = np.clip(((np.arange(w) + 0.5) * W / w).astype(int), 0, W - 1)
    return img[ys][:, xs]
def blur(x, r):
    for ax in (0, 1):
        p = np.pad(x, [(r, r) if i == ax else (0, 0) for i in range(x.ndim)], mode='edge')
        c = np.cumsum(p, axis=ax, dtype=np.float64); c = np.concatenate([np.zeros_like(np.take(c, [0], axis=ax)), c], axis=ax)
        x = ((np.take(c, np.arange(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, np.arange(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)).astype(np.float32)
    return x
N = 1024; U0, U1, V0, V1 = int(0.20 * N), int(0.80 * N), int(0.10 * N), int(0.90 * N)
face = resize(load(arg("in")), V1 - V0, U1 - U0); h, w = face.shape[:2]
cand = face[int(h * 0.50):int(h * 0.72), int(w * 0.30):int(w * 0.70)].reshape(-1, 3); cand = cand[(cand[:, 0] - cand[:, 2]) > 0.06]
skin = np.median(cand if len(cand) else face.reshape(-1, 3), axis=0)
tex = np.empty((N, N, 3), np.float32); tex[...] = skin
yy, xx = np.mgrid[0:h, 0:w]; oval = ((yy - h * 0.5) / (h * 0.56)) ** 2 + ((xx - w * 0.5) / (w * 0.50)) ** 2
m = blur(np.clip((1.08 - oval) / 0.25, 0, 1)[..., None], 6)
tex[V0:V1, U0:U1] = face * m + skin * (1 - m)
save(arg("out"), tex); print("FACE OK skin", [round(float(x), 3) for x in skin], "-> hex #%02X%02X%02X" % tuple(int(round((x ** (1 / 2.2)) * 255)) for x in skin))
