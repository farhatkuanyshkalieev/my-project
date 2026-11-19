"""Reel #1 audio: cut lines, tempo/robot FX, per-clip word timing, scene timeline, -14 LUFS."""
import subprocess, re, json, os, sys
W=os.path.dirname(os.path.abspath(__file__)); os.chdir(W)
FPS=30
M1_MODE=sys.argv[1] if len(sys.argv)>1 else "trim"     # "trim" = remove long pauses inside line 1 (no stretching), "asis" = keep as recorded, "fast13" = trim + x1.3
HOOK_NEW="E:/3д Рилсики ЛоуПоли/хук.ogg"               # re-recorded hook; used as-is when present
ME_TEMPO=1.12                                           # user-approved speed-up of my lines except the hook
def run(cmd): r=subprocess.run(cmd,capture_output=True,text=True,encoding="utf-8",errors="replace"); return r.stdout+r.stderr
def ff(*a): return run(["ffmpeg","-hide_banner","-y",*a])
def dur(f): return float(run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]).strip())
def islands(f,noise=-38,d=0.12):
    out=ff("-i",f,"-af",f"silencedetect=noise={noise}dB:d={d}","-f","null","-")
    S=[float(x) for x in re.findall(r"silence_start: ([\d.]+)",out)]; E=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",out)]
    T=dur(f); sil=list(zip(S,E+[T]*(len(S)-len(E)))); sp=[]; t=0.0
    for a,b in sil:
        if a>t+0.02: sp.append((t,a))
        t=max(t,b)
    if t<T-0.02: sp.append((t,T))
    return sp
def srt(path):
    txt=open(path,encoding="utf-8",errors="replace").read().replace("\r","")
    out=[]
    for bl in re.split(r"\n\n+",txt.strip()):
        L=bl.split("\n")
        if len(L)<3: continue
        m=re.findall(r"(\d+):(\d+):(\d+),(\d+)",L[1]); ts=[int(h)*3600+int(mi)*60+int(s)+int(ms)/1000 for h,mi,s,ms in m]
        out.append((ts[0],ts[1]," ".join(L[2:]).strip()))
    return out
# ---------------- script lines (exact text) and where they are in the source files ----------------
LINES=[
 ("M1","me","Да как они делают эти рилсы?!","me",[0]),
 ("C1","cl","Запрос получен. Показываю.","c1",[0]),
 ("C2","cl","Шаг один. Ставишь Claude Code.","c1",[1]),
 ("C3","cl","Шаг два. Подключаешь Blender.","c1",[2]),
 ("C4","cl","Шаг три. Персонаж по фото.","c1",[3]),
 ("M2","me","О, ну норм.","me",[1]),
 ("C5","cl","Шаг четыре. Скелет.","c1",[4]),
 ("C6","cl","Пять. Эмоции.","c1",[5]),
 ("C7","cl","Шесть. Локация.","c1",[6]),
 ("C8","cl","Семь. Материалы, шейдеры.","c1",[7]),
 ("M3","me","Подожди, подожди…","me",[2]),
 ("C9","cl","Восемь свет девять камера десять озвучка одиннадцать анимация под голос двенадцать рендер и правки.","c2",[0]),
 ("M4","me","…я просто хотел рилс.","me",[3]),
 ("C10","cl","Ты спросил, как они делают.","c2",[1]),
 ("M5","me","Короче. Чтобы не проходить все двенадцать шагов, мы с Клодом сделали скилл. Пишешь один короткий промпт, и он делает всё сам. Оставил в моём телеграм-канале.","me",[4,5,6]),
 ("C11","cl","Подтверждаю. Двенадцать шагов. Один промпт.","c2",[2,3]),
]
SEG={n:srt(f"{n}_seg.srt") for n in ("c1","c2","me")}
ISL={n:islands(f"{n}.wav") for n in ("c1","c2","me")}
def silences(f,noise=-35,d=0.06):
    out=ff("-i",f,"-af",f"silencedetect=noise={noise}dB:d={d}","-f","null","-")
    S=[float(x) for x in re.findall(r"silence_start: ([\d.]+)",out)]; E=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",out)]
    T=dur(f); return list(zip(S,E+[T]*(len(S)-len(E))))
SIL={n:silences(f"{n}.wav") for n in ("c1","c2","me")}
def span_for(src,segs):
    a=SEG[src][segs[0]][0]; b=SEG[src][segs[-1]][1]
    # line boundaries = the silences nearest to whisper's segment edges
    st=[e for s_,e in SIL[src] if e<=a+0.15]; en=[s_ for s_,e in SIL[src] if s_>=b-0.15]
    A=max(st) if st else a; B=min(en) if en else b
    if src=="me" and segs==[0]: A=0.45      # leading noise before "Да"
    sp=[(x,y) for x,y in ISL[src] if y>A and x<B]
    return (A,B,sp)
os.makedirs("clips",exist_ok=True)
info={}
for lid,who,text,src,segs in LINES:
    a,b,sp=span_for(src,segs)
    raw=f"clips/{lid}_raw.wav"
    if lid=="M1" and os.path.exists(HOOK_NEW):
        ff("-i",HOOK_NEW,"-ac","1","-ar","48000","hook_new.wav")
        sl=silences("hook_new.wav",-35,0.1); Th=dur("hook_new.wav")
        h0=sl[0][1] if sl and sl[0][0]<0.01 else 0.0                       # speech starts after the leading silence
        tail=[a_ for a_,b_ in sl if b_>=Th-0.01]; h1=min([a_ for a_,b_ in sl if a_>Th-1.2 and a_>h0+0.5] or [Th])   # first silence of the trailing gap
        ff("-ss",f"{max(0,h0-0.05):.3f}","-to",f"{h1+0.06:.3f}","-i","hook_new.wav","-af","afade=t=in:d=0.01,areverse,afade=t=in:d=0.02,areverse",raw)
    elif lid=="M1" and M1_MODE in("trim","fast13"):
        # keep every speech island, collapse silences longer than 0.18 s to 0.18 s (words themselves untouched)
        parts=[]
        for i,(x,y) in enumerate(sp):
            ff("-ss",f"{max(0,x-0.04):.3f}","-to",f"{y+0.04:.3f}","-i",f"{src}.wav","-af","afade=t=in:d=0.01,areverse,afade=t=in:d=0.01,areverse",f"clips/M1_p{i}.wav")
            parts.append(f"clips/M1_p{i}.wav")
        lst=open("clips/m1.txt","w",encoding="utf-8")
        for i,p in enumerate(parts):
            lst.write(f"file '{os.path.basename(p)}'\n")
            if i<len(parts)-1:
                gap=min(0.18,sp[i+1][0]-sp[i][1]); ff("-f","lavfi","-i",f"anullsrc=r=48000:cl=mono","-t",f"{gap:.3f}",f"clips/M1_g{i}.wav"); lst.write(f"file 'M1_g{i}.wav'\n")
        lst.close(); ff("-f","concat","-safe","0","-i","clips/m1.txt","-c","copy",raw)
    else:
        ff("-ss",f"{max(0,a-0.05):.3f}","-to",f"{b+0.06:.3f}","-i",f"{src}.wav","-af","afade=t=in:d=0.01,areverse,afade=t=in:d=0.02,areverse",raw)
    clean=f"clips/{lid}_clean.wav"
    if lid=="C9": ff("-i",raw,"-af","atempo=1.4",clean)          # pitch-preserving speed-up
    elif lid=="M1" and M1_MODE=="fast13" and not os.path.exists(HOOK_NEW): ff("-i",raw,"-af","atempo=1.3",clean)
    elif who=="me" and lid!="M1": ff("-i",raw,"-af",f"atempo={ME_TEMPO}",clean)
    else: ff("-i",raw,"-c","copy",clean)
    final=f"clips/{lid}.wav"
    if who=="cl":
        # robot voice: HP 120 Hz, gentle compression, faint bitcrush + 12 % ring-mod, intelligibility first
        ff("-i",clean,"-f","lavfi","-i","sine=frequency=55:sample_rate=48000","-filter_complex",
           "[0:a]highpass=f=120,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,asplit=3[d][c][r];"
           "[c]acrusher=bits=11:mode=log:aa=1:samples=1:mix=1[cr];[r][1:a]amultiply[rm];"
           "[d][cr][rm]amix=inputs=3:weights=1 0.18 0.12:duration=first:normalize=0,loudnorm=I=-16:TP=-2:LRA=7",final)
    else:
        ff("-i",clean,"-af","loudnorm=I=-16:TP=-2:LRA=7",final)
    ff("-i",final,"-ar","48000","-ac","1",final.replace(".wav","_48.wav")); os.replace(final.replace(".wav","_48.wav"),final)
    # per-clip word timing (whisper tokens on the clean clip) refined with the clip's own speech islands
    ff("-i",clean,"-af","aresample=16000,whisper=model=m.bin:language=ru:queue=30:max_len=1:destination="+f"clips/{lid}_tok.srt:format=srt","-f","null","-")
    info[lid]=dict(who=who,text=text,dur=dur(final),isl=islands(clean,-38,0.08),tok=srt(f"clips/{lid}_tok.srt"))
json.dump(info,open("lines.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("CLIPS OK",{k:round(v["dur"],2) for k,v in info.items()})
