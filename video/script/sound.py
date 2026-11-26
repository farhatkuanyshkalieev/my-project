import numpy as np, json, wave
from scipy.signal import butter, sosfilt, lfilter
SR=48000; rng=np.random.default_rng(7)
def save(path, x, stereo=None):
    x=np.asarray(x,np.float64)
    if x.ndim==1: x=np.stack([x,x],1)
    x=x/ (np.max(np.abs(x))+1e-9)*0.89
    with wave.open(path,"wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype(np.int16).tobytes())
def t(d): return np.arange(int(d*SR))/SR
def env(n, a, r):  # attack/release in samples (linear-ish)
    e=np.ones(n); a=max(1,int(a)); r=max(1,int(r))
    e[:a]=np.linspace(0,1,a); e[-r:]*=np.linspace(1,0,r)**2; return e
def sweep_filter(x, f0, f1, q=2.0, btype="band", seg=512):
    out=np.zeros_like(x); n=len(x); zi=None
    for i in range(0,n,seg):
        p=i/n; f=f0*(f1/f0)**p
        if btype=="band": sos=butter(2,[f/ (1+1/q), min(f*(1+1/q),SR/2-100)],btype="band",fs=SR,output="sos")
        else: sos=butter(2,min(f,SR/2-100),btype=btype,fs=SR,output="sos")
        if zi is None: zi=np.zeros((sos.shape[0],2))
        y,zi=sosfilt(sos,x[i:i+seg],zi=zi); out[i:i+seg]=y
    return out
def reverb(x, mix=0.3, length=1.2):
    ir_t=t(length); ir=rng.standard_normal(len(ir_t))*np.exp(-ir_t*5)
    ir=sosfilt(butter(2,5000,"low",fs=SR,output="sos"),ir)
    wet=np.convolve(x,ir); wet/=np.max(np.abs(wet))+1e-9
    dry=np.concatenate([x,np.zeros(len(wet)-len(x))])/ (np.max(np.abs(x))+1e-9)
    return dry*(1-mix)+wet*mix
def pan_stereo(x, lfo=0.3):
    n=len(x); p=0.5+0.35*np.sin(np.linspace(-np.pi/2,np.pi/2,n)*1.0)
    return np.stack([x*np.sqrt(1-p), x*np.sqrt(p)],1)
# whoosh
n=int(0.9*SR); x=rng.standard_normal(n); x=sweep_filter(x,300,4500,q=1.5)
e=np.sin(np.linspace(0,np.pi,n))**2.2; save("public/sfx/whoosh.wav", pan_stereo(reverb(x*e,0.25,0.6)))
# reverse-ish whoosh down
x=rng.standard_normal(n); x=sweep_filter(x,5000,250,q=1.5); save("public/sfx/whoosh2.wav", pan_stereo(reverb(x*e,0.25,0.6))[:, ::-1])
# impact
tt=t(1.8); f=45+90*np.exp(-tt*18); ph=2*np.pi*np.cumsum(f)/SR
boom=np.sin(ph)*np.exp(-tt*2.6); nz=sosfilt(butter(2,900,"low",fs=SR,output="sos"),rng.standard_normal(len(tt)))*np.exp(-tt*14)*0.6
save("public/sfx/impact.wav", reverb(boom+nz,0.35,1.8))
# riser
tt=t(2.6); x=sweep_filter(rng.standard_normal(len(tt)),200,7000,q=2.5); tone=np.sin(2*np.pi*np.cumsum(220*2**(tt*1.2))/SR)*0.25
save("public/sfx/riser.wav", reverb((x*0.8+tone)*(tt/tt[-1])**2.5,0.3,0.8))
# pop
tt=t(0.18); f=1100*np.exp(-tt*9)+350; pop=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*38); save("public/sfx/pop.wav", reverb(pop,0.15,0.3))
# tick
tt=t(0.05); tick=np.sin(2*np.pi*2400*tt)*np.exp(-tt*120)+0.3*rng.standard_normal(len(tt))*np.exp(-tt*300); save("public/sfx/tick.wav", tick)
# ding (bell)
tt=t(2.2); b=sum(a*np.sin(2*np.pi*1318*m*tt)*np.exp(-tt*dcy) for m,a,dcy in [(1,1,2.2),(2.0,0.5,3.5),(2.76,0.35,5),(5.4,0.15,8)])
save("public/sfx/ding.wav", reverb(b*env(len(tt),20,2000),0.3,1.5))
# shimmer (arpeggio chime)
out=np.zeros(int(3*SR))
for k,fr in enumerate([1174.7,1480,1760,2349.3]):
    tt=t(2.2); s=sum(a*np.sin(2*np.pi*fr*m*tt)*np.exp(-tt*dc) for m,a,dc in [(1,1,2.5),(2,0.3,4),(3.01,0.12,6)])
    i=int(k*0.09*SR); out[i:i+len(s)]+=s
save("public/sfx/shimmer.wav", reverb(out,0.35,1.5))
# swipe (short UI swish)
n=int(0.35*SR); x=sweep_filter(rng.standard_normal(n),1500,8000,q=2); save("public/sfx/swipe.wav", x*np.sin(np.linspace(0,np.pi,n))**1.5)
# typing/data blips
out=np.zeros(int(1.2*SR))
for k in range(10):
    tt=t(0.04); fr=rng.choice([1800,2200,2600,3000]); s=np.sin(2*np.pi*fr*tt)*np.exp(-tt*90); i=int(k*0.11*SR); out[i:i+len(s)]+=s
save("public/sfx/data.wav", out)

# ---------------- MUSIC ----------------
tl=json.load(open("src/timeline.json")); total=tl["total"]/tl["fps"]+2
BPM=92; beat=60/BPM; bar=4*beat; N=int(total*SR); mus=np.zeros((N,2))
def mtof(m): return 440*2**((m-69)/12)
prog=[[47,50,54,59],[43,47,50,55],[50,54,57,62],[45,49,52,57]]  # Bm G D A
roots=[35,31,38,33]
def saw(fr,tt,det):
    s=np.zeros_like(tt)
    for h in range(1,9): s+=np.sin(2*np.pi*fr*det*h*tt+h)/h
    return s
chord_len=2*bar; nch=int(np.ceil(total/chord_len))
lp=butter(2,1400,"low",fs=SR,output="sos")
for c in range(nch):
    ch=prog[c%4]; st=int(c*chord_len*SR); L=int((chord_len+1.5)*SR); tt=np.arange(L)/SR
    pad=np.zeros(L)
    for m in ch:
        for det in (0.997,1.003): pad+=saw(mtof(m),tt,det)
    pad=sosfilt(lp,pad)*env(L,0.8*SR,1.6*SR)*0.10
    e=min(N,st+L)-st; mus[st:st+e,0]+=pad[:e]; mus[st:st+e,1]+=pad[:e]*0.95
    # bass
    for bb in range(2):
        for b in (0,2):
            bs=st+int((bb*bar+b*beat)*SR); BL=int(beat*1.8*SR); tb=np.arange(BL)/SR
            bas=(np.sin(2*np.pi*mtof(roots[c%4])*tb)+0.25*np.sin(4*np.pi*mtof(roots[c%4])*tb))*np.exp(-tb*1.6)*env(BL,200,4000)*0.22
            e=min(N,bs+BL)-bs
            if e>0: mus[bs:bs+e]+=bas[:e,None]
    # arp (starts after intro)
    if c>=1:
        notes=[ch[0]+12,ch[1]+12,ch[2]+12,ch[3]+12,ch[2]+12,ch[1]+12,ch[3]+12,ch[2]+24]
        for k in range(16):
            ns=st+int(k*beat/2*SR); AL=int(0.6*SR); ta=np.arange(AL)/SR; fr=mtof(notes[k%8])
            pl=(np.sin(2*np.pi*fr*ta)+0.3*np.sin(4*np.pi*fr*ta))*np.exp(-ta*7)*0.07
            e=min(N,ns+AL)-ns
            if e>0:
                pan=0.5+0.3*np.sin(k); mus[ns:ns+e,0]+=pl[:e]*(1-pan); mus[ns:ns+e,1]+=pl[:e]*pan
                d=ns+int(beat*0.75*SR); e2=min(N,d+AL)-d   # echo
                if e2>0: mus[d:d+e2,0]+=pl[:e2]*0.35*pan; mus[d:d+e2,1]+=pl[:e2]*0.35*(1-pan)
# drums from bar 4
kL=int(0.35*SR); tk=np.arange(kL)/SR; kick=np.sin(2*np.pi*np.cumsum(50+90*np.exp(-tk*30))/SR)*np.exp(-tk*9)*0.35
hL=int(0.08*SR); th=np.arange(hL)/SR; hat=sosfilt(butter(2,7000,"high",fs=SR,output="sos"),rng.standard_normal(hL))*np.exp(-th*60)*0.05
nb=int(total/beat)
for b in range(8*4//2, nb):
    s=int(b*beat*SR)
    if s+kL<N: mus[s:s+kL]+=kick[:,None]
    h=int((b+0.5)*beat*SR)
    if h+hL<N: mus[h:h+hL,0]+=hat*0.8; mus[h:h+hL,1]+=hat
# fades
fi=int(3*SR); fo=int(5*SR); mus[:fi]*=np.linspace(0,1,fi)[:,None]; mus[-fo:]*=np.linspace(1,0,fo)[:,None]**1.5
mus=np.tanh(mus*1.2)
save("public/music.wav", mus)
print("music sec", total)
