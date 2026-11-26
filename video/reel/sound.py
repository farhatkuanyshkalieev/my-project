import numpy as np, json, wave
from scipy.signal import butter, sosfilt
SR=48000; rng=np.random.default_rng(11)
def save(path,x):
    x=np.asarray(x,float)
    if x.ndim==1: x=np.stack([x,x],1)
    x=x/(np.abs(x).max()+1e-9)*0.9
    with wave.open(path,"wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype(np.int16).tobytes())
def T(d): return np.arange(int(d*SR))/SR
def lp(x,f,o=2): return sosfilt(butter(o,f,"low",fs=SR,output="sos"),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,"high",fs=SR,output="sos"),x)
def bp(x,a,b): return sosfilt(butter(2,[a,b],"band",fs=SR,output="sos"),x)
def sweep(x,f0,f1,seg=480):
    out=np.zeros_like(x); zi=None
    for i in range(0,len(x),seg):
        f=f0*(f1/f0)**(i/len(x)); lo=max(30,f*0.6); hi=min(SR/2-200,f*1.6)
        sos=butter(2,[lo,hi],"band",fs=SR,output="sos")
        if zi is None: zi=np.zeros((sos.shape[0],2))
        y,zi=sosfilt(sos,x[i:i+seg],zi=zi); out[i:i+seg]=y
    return out
def verb(x,mix=0.25,L=0.9):
    t=T(L); ir=lp(rng.standard_normal(len(t))*np.exp(-t*6),6000)
    w=np.convolve(x,ir); w/=np.abs(w).max()+1e-9; d=np.concatenate([x/(np.abs(x).max()+1e-9),np.zeros(len(w)-len(x))])
    return d*(1-mix)+w*mix
def st(x,a=0.3):
    n=len(x); p=0.5+a*np.sin(np.linspace(-np.pi/2,np.pi/2,n)); return np.stack([x*np.sqrt(1-p),x*np.sqrt(p)],1)
# fast whoosh
n=int(0.45*SR); e=np.sin(np.linspace(0,np.pi,n))**2; save("../public/reel/sfx/whoosh.wav", st(verb(sweep(rng.standard_normal(n),400,6000)*e,0.2,0.4)))
# boom (sub drop + punch)
t=T(1.6); f=40+110*np.exp(-t*14); b=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*2.2); cl=hp(rng.standard_normal(len(t)),2000)*np.exp(-t*60)*0.5
save("../public/reel/sfx/boom.wav", verb(b+cl,0.3,1.2))
# hit (short punchy)
t=T(0.5); f=60+160*np.exp(-t*30); h=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*8)+lp(rng.standard_normal(len(t)),3000)*np.exp(-t*40)*0.6
save("../public/reel/sfx/hit.wav", verb(h,0.15,0.4))
# pop
t=T(0.16); f=1300*np.exp(-t*12)+400; save("../public/reel/sfx/pop.wav", np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*40))
# bubble (comment pop, rising)
t=T(0.2); f=500+1500*(t/t[-1])**0.6; save("../public/reel/sfx/bubble.wav", verb(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*18),0.2,0.3))
# glitch
x=np.zeros(int(0.35*SR))
for k in range(9):
    s=int(rng.uniform(0,0.3)*SR); L=int(rng.uniform(0.01,0.04)*SR); fr=rng.choice([180,440,880,1760,3000])
    seg=np.sign(np.sin(2*np.pi*fr*np.arange(L)/SR))*0.5+rng.standard_normal(L)*0.3; x[s:s+L]+=seg[:len(x)-s]
save("../public/reel/sfx/glitch.wav", st(hp(x,150),0.4))
# notification ping
t=T(0.9); p=np.zeros(len(t))
for k,fr in enumerate([1567.98,2093]):
    s=int(k*0.11*SR); tt=t[:len(t)-s]; p[s:]+= (np.sin(2*np.pi*fr*tt)+0.3*np.sin(4*np.pi*fr*tt))*np.exp(-tt*7)
save("../public/reel/sfx/notif.wav", verb(p,0.2,0.6))
# coins / cash
x=np.zeros(int(0.9*SR))
for k in range(7):
    s=int((0.03+k*0.07+rng.uniform(0,0.03))*SR); tt=T(0.35); fr=rng.uniform(2800,4200)
    c=sum(a*np.sin(2*np.pi*fr*m*tt) for m,a in [(1,1),(1.47,0.6),(2.09,0.4)])*np.exp(-tt*16); x[s:s+len(tt)]+=c[:len(x)-s]
save("../public/reel/sfx/coins.wav", verb(x,0.2,0.5))
# riser short
t=T(1.4); r=sweep(rng.standard_normal(len(t)),300,9000)*(t/t[-1])**2+0.3*np.sin(2*np.pi*np.cumsum(300*2**(t*2.2))/SR)*(t/t[-1])**2
save("../public/reel/sfx/riser.wav", verb(r,0.25,0.5))
# confetti / party popper
t=T(1.2); x=hp(rng.standard_normal(len(t)),1500)*np.exp(-t*25)
for k in range(40):
    s=int(rng.uniform(0.05,1.0)*SR); L=int(0.01*SR); x[s:s+L]+=hp(rng.standard_normal(L),4000)*rng.uniform(0.05,0.25)*np.exp(-s/SR*2)
save("../public/reel/sfx/confetti.wav", st(verb(x,0.2,0.4),0.3))
# ding bright
t=T(1.6); d=sum(a*np.sin(2*np.pi*1760*m*t)*np.exp(-t*k) for m,a,k in [(1,1,3),(2,0.4,5),(3.01,0.2,8)])
save("../public/reel/sfx/ding.wav", verb(d,0.3,1.0))
# tick
t=T(0.04); save("../public/reel/sfx/tick.wav", np.sin(2*np.pi*3000*t)*np.exp(-t*150))
# swipe
n=int(0.25*SR); save("../public/reel/sfx/swipe.wav", st(sweep(rng.standard_normal(n),2000,9000)*np.sin(np.linspace(0,np.pi,n))**1.5,0.4))

# ================= MUSIC =================
tl=json.load(open("../src/reel/reel.json")); FPS=tl["fps"]; total=tl["total"]/FPS+0.5
kz=next(l["start"] for l in tl["lines"] if l["scene"]=="kz")/FPS
BPM=124; beat=60/BPM; bar=4*beat; N=int(total*SR); M=np.zeros((N,2))
def mtof(m): return 440*2**((m-69)/12)
prog=[[57,60,64,67],[53,57,60,64],[48,52,55,60],[55,59,62,67]]  # Am F C G (vi IV I V of C)
roots=[45,41,36,43]
nb=int(total/beat)+1
# break: 2 beats before kz start drums out, + last 2 bars outro
kz_beat=int(round(kz/beat)); end_beat=int(total/beat)-6
def drums_on(b): return not (kz_beat-4<=b<kz_beat) and b<end_beat and b>=2
# sidechain envelope (pump) per beat
pump=np.ones(N)
for b in range(nb):
    if not drums_on(b): continue
    s=int(b*beat*SR); L=int(beat*SR); e=1-0.65*np.exp(-np.arange(L)/SR*9)
    pump[s:s+L]=e[:max(0,min(L,N-s))]
# chords: supersaw stabs on offbeats + pad
for c in range(int(total/bar)+1):
    ch=prog[c%4]; s0=int(c*bar*SR)
    L=int((bar+0.5)*SR); t=np.arange(L)/SR; pad=np.zeros(L)
    for m in ch:
        for det in (0.993,1.0,1.007):
            ph=(mtof(m)*det*t+rng.random())%1; pad+=(2*ph-1)
    pad=lp(pad,2200)*np.minimum(1,t/0.05)*np.exp(-np.maximum(0,t-bar)*8)*0.05
    e=min(N,s0+L)-s0
    if e>0: M[s0:s0+e,0]+=pad[:e]; M[s0:s0+e,1]+=pad[:e]*0.97
    # bass: offbeat 8ths
    for k in range(8):
        bs=s0+int((k*beat/2+beat/4*0)*SR)
        if k%2==0: continue
        BL=int(beat/2*0.9*SR); tb=np.arange(BL)/SR; fr=mtof(roots[c%4])
        ph=(fr*tb)%1; bass=lp(2*ph-1,700)*np.exp(-tb*5)*0.32+np.sin(2*np.pi*fr/2*tb)*0.2*np.exp(-tb*4)
        e=min(N,bs+BL)-bs
        if e>0: M[bs:bs+e]+=bass[:e,None]
    # arp lead 16ths
    notes=[ch[0]+12,ch[2]+12,ch[1]+12,ch[3]+12,ch[2]+24,ch[1]+12,ch[3]+12,ch[0]+24]
    for k in range(16):
        ns=s0+int(k*beat/4*SR)
        AL=int(0.18*SR); ta=np.arange(AL)/SR; fr=mtof(notes[k%8])
        ph=(fr*ta)%1; pl=(np.where(ph<0.5,1,-1)*0.5+np.sin(2*np.pi*fr*ta))*np.exp(-ta*22)*0.035
        e=min(N,ns+AL)-ns
        if e>0:
            pn=0.5+0.35*np.sin(k*1.3); M[ns:ns+e,0]+=pl[:e]*(1-pn); M[ns:ns+e,1]+=pl[:e]*pn
M*=pump[:,None]
# drums
kL=int(0.4*SR); tk=np.arange(kL)/SR; kick=np.sin(2*np.pi*np.cumsum(48+120*np.exp(-tk*35))/SR)*np.exp(-tk*7)*0.6+hp(rng.standard_normal(kL),3000)*np.exp(-tk*200)*0.1
cL=int(0.25*SR); tc=np.arange(cL)/SR; clap=bp(rng.standard_normal(cL),900,5000)*(np.exp(-tc*30)+0.6*np.exp(-np.maximum(0,tc-0.012)*30)*(tc>0.012))*0.28
hL=int(0.05*SR); th=np.arange(hL)/SR; hat=hp(rng.standard_normal(hL),8000)*np.exp(-th*90)*0.09
oL=int(0.2*SR); to=np.arange(oL)/SR; ohat=hp(rng.standard_normal(oL),6500)*np.exp(-to*18)*0.07
def add(s,x,pan=0.5):
    e=min(N,s+len(x))-s
    if e>0: M[s:s+e,0]+=x[:e]*np.sqrt(1-pan)*1.2; M[s:s+e,1]+=x[:e]*np.sqrt(pan)*1.2
for b in range(nb):
    if not drums_on(b): continue
    s=int(b*beat*SR)
    add(s,kick); 
    if b%2==1: add(s,clap,0.5)
    add(int((b+0.5)*beat*SR),ohat,0.6)
    for k in (1,3): add(int((b+k/4)*beat*SR),hat*(0.6+0.4*rng.random()),0.35)
# riser + impact into kz drop and at start
def place(t0,path_x):
    s=int(t0*SR); e=min(N,s+len(path_x))-s
    if e>0: M[s:s+e]+=path_x[:e]
t=T(bar*1); r=sweep(rng.standard_normal(len(t)),200,8000)*(t/t[-1])**2*0.25
place(kz-bar,np.stack([r,r],1))
fi=int(0.05*SR); M[:fi]*=np.linspace(0,1,fi)[:,None]
fo=int(3*SR); M[-fo:]*=np.linspace(1,0,fo)[:,None]
M=np.tanh(M*1.4)
save("../public/reel/music.wav",M)
print("music",total,"kz",kz)
