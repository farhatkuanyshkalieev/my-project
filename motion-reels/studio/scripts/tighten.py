import sys, numpy as np, soundfile as sf
src, dst, maxgap = sys.argv[1], sys.argv[2], float(sys.argv[3])
y, sr = sf.read(src)
hop = int(sr*0.01); n = len(y)//hop
env = np.array([np.sqrt(np.mean(y[i*hop:(i+1)*hop]**2)+1e-12) for i in range(n)])
db = 20*np.log10(env)
noise = np.percentile(db, 10); thr = noise + 14
act = db > thr
# сглаживание: заполняем дырки < 120 мс, убираем всплески < 40 мс
def runs(a):
    r=[];s=None
    for i,v in enumerate(a):
        if v and s is None: s=i
        if not v and s is not None: r.append([s,i]); s=None
    if s is not None: r.append([s,len(a)])
    return r
seg = runs(act)
seg = [s for s in seg if s[1]-s[0] >= 4]
merged=[]
for s in seg:
    if merged and s[0]-merged[-1][1] < 12: merged[-1][1]=s[1]
    else: merged.append(s)
pad_l, pad_r = 6, 9  # 60 мс до, 90 мс после (хвосты согласных)
out=[]; fade=int(sr*0.008)
for i,(a,b) in enumerate(merged):
    a=max(0,a-pad_l)*hop; b=min(n,b+pad_r)*hop
    chunk=y[a:b].copy()
    chunk[:fade]*=np.linspace(0,1,fade); chunk[-fade:]*=np.linspace(1,0,fade)
    out.append(chunk)
    if i < len(merged)-1:
        gap = (merged[i+1][0]-pad_l - (b//hop))*0.01
        g = min(max(gap,0), maxgap)
        out.append(np.zeros(int(g*sr)))
res=np.concatenate(out)
sf.write(dst,res,sr)
print(f"{src.split('/')[-1]}: {len(y)/sr:.2f}s -> {len(res)/sr:.2f}s, {len(merged)} фраз, noise {noise:.1f}dB")
