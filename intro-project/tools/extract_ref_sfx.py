import numpy as np, noisereduce as nr
from scipy.io import wavfile
sr, x = wavfile.read('ref.wav'); x = x.astype(np.float32) / 32768
def seg(a, b): return x[int(a*sr):int(b*sr)]
def fade(y, fi=0.005, fo=0.04):
    n=len(y); a=int(fi*sr); b=int(fo*sr)
    e=np.ones(n); e[:a]=np.linspace(0,1,a); e[-b:]=np.linspace(1,0,b)**2
    return y*e[:,None]
def clean(y, noise, strength=0.9):
    out=np.stack([nr.reduce_noise(y=y[:,c], sr=sr, y_noise=noise[:,c], prop_decrease=strength, stationary=True) for c in range(2)],1)
    return out
cuts = {
  # пузырьки (кольцо / прыжки точки)
  'ref_bloop_a': (2.83, 3.14, (3.16, 3.40)),
  'ref_bloop_b': (3.42, 3.68, (3.16, 3.40)),
  'ref_bloop_c': (4.02, 4.30, (3.16, 3.40)),
  # маллет-щипки на смене ролей
  'ref_mallet_a': (7.06, 7.40, (7.37, 7.53)),
  'ref_mallet_b': (7.55, 7.98, (7.37, 7.53)),
  'ref_mallet_c': (8.01, 8.32, (7.37, 7.53)),
  # мерцание логотипа
  'ref_logo': (8.33, 9.10, None),
}
for name,(a,b,nz) in cuts.items():
    y=seg(a,b)
    if nz: y=clean(y, seg(*nz))
    y=fade(y)
    y=y/ (np.max(np.abs(y))+1e-9) * 0.9
    wavfile.write(f'{name}.wav', sr, (y*32767).astype(np.int16))
    print(name, len(y)/sr)
