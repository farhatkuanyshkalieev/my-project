"""Reel #1: word timing per line, scene schedule, voice timeline (-14 LUFS / -1 dBTP), timing table."""
import json, re, os, subprocess
W=os.path.dirname(os.path.abspath(__file__)); os.chdir(W)
FPS=30
info=json.load(open("lines.json",encoding="utf-8"))
def run(cmd): r=subprocess.run(cmd,capture_output=True,text=True,encoding="utf-8",errors="replace"); return r.stdout+r.stderr
NUM={"1":"один","2":"два","3":"три","4":"четыре","5":"пять","6":"шесть","7":"семь","8":"восемь","9":"девять","10":"десять","11":"одиннадцать","12":"двенадцать"}
LAT={"claude":"клод","code":"код","blender":"блендер"}
def norm(s):
    s=s.lower().replace("ё","е")
    return re.sub(r"[^a-zа-я0-9]","",s)
def norm_word(w):
    n=norm(w); return LAT.get(n,n)
def tok_norm(t):
    n=norm(t); return NUM.get(n,n)
VOW=set("аеёиоуыэюяaeiouy")
def syl(w):
    n=norm_word(w); return max(1,sum(1 for c in n if c in VOW))
def words_for(lid):
    """whisper token times -> script words (char-proportional), then repair too-short words by syllables, keep starts out of silence."""
    L=info[lid]; script=[w for w in re.split(r"\s+",L["text"].strip()) if norm(w)]
    toks=[(a,b,tok_norm(t)) for a,b,t in L["tok"] if tok_norm(t)]
    ct=[]
    for a,b,t in toks:
        n=len(t)
        for i in range(n): ct.append((a+(b-a)*i/n, a+(b-a)*(i+1)/n))
    S=[norm_word(w) for w in script]; total=sum(len(x) for x in S); T=len(ct)
    out=[]; pos=0
    for w,x in zip(script,S):
        c0=int(round(pos/total*T)); c1=int(round((pos+len(x))/total*T))-1; pos+=len(x)
        c0=min(max(c0,0),T-1); c1=min(max(c1,c0),T-1)
        out.append([w,ct[c0][0],ct[c1][1]])
    isl=[(x,y) for x,y in L["isl"] if y-x>0.03]
    # clip to real speech span
    s0=isl[0][0]; s1=isl[-1][1]
    for w in out: w[1]=min(max(w[1],s0),s1); w[2]=min(max(w[2],s0),s1)
    for k in range(1,len(out)):
        if out[k][1]<out[k-1][2]: out[k][1]=out[k-1][2]
    # repair: words shorter than 3 frames share their neighbour's span by syllables
    MIN=3/FPS
    changed=True; guard=0
    while changed and guard<20:
        changed=False; guard+=1
        for k,w in enumerate(out):
            if w[2]-w[1]<MIN:
                j=k+1 if k+1<len(out) else k-1
                a,b=sorted([k,j]); A=out[a][1]; B=out[b][2]
                sa,sb=syl(out[a][0]),syl(out[b][0]); m=A+(B-A)*sa/(sa+sb)
                out[a][2]=m; out[b][1]=m; changed=True
                if B-A<2*MIN: out[b][2]=out[a][1]+2*MIN
    # a word may not start inside a silence
    for w in out:
        if not any(x-0.01<=w[1]<=y for x,y in isl):
            nxt=[x for x,y in isl if x>w[1]]
            if nxt and nxt[0]<w[2]-MIN: w[1]=nxt[0]
    for k in range(1,len(out)):                     # keep words strictly sequential
        if out[k][1]<out[k-1][2]: out[k][1]=out[k-1][2]
        out[k][2]=max(out[k][2],out[k][1]+MIN)
    out[-1][2]=max(out[-1][2],min(s1,out[-1][2]+0.15))
    return out
# ---------------- scene schedule (pauses as in the script; durations come from the audio) ----------------
SCENES=[
 ("1 ХУК",            [("pre",0.15),("M1",),("post",0.10)]),
 ("2 ПРОХОЖИЕ",       [("pre",1.20)]),
 ("3 CLAUDE ВЛЕТАЕТ", [("pre",0.55),("C1",),("post",0.30)]),
 ("4 ШАГИ 1–3",       [("pre",0.20),("C2",),("gap",0.35),("C3",),("gap",0.35),("C4",),("gap",0.65),("M2",),("post",0.25)]),
 ("5 ШАГИ 4–7",       [("pre",0.10),("C5",),("gap",0.20),("C6",),("gap",0.20),("C7",),("gap",1.00),("C8",),("gap",0.25),("M3",),("post",0.25)]),
 ("6 ПЕРЕГРУЗ",       [("pre",0.15),("C9",),("gap",0.50),("M4",),("post",0.35)]),
 ("7 ПАУЗА",          [("pre",0.50),("C10",),("post",0.30)]),
 ("8 ФИНАЛ",          [("pre",0.43),("M5",),("gap",0.30),("C11",),("post",1.50)]),
]
t=0.0; sched=[]; placed=[]
for name,items in SCENES:
    s0=t
    for it in items:
        if len(it)==2: t+=it[1]
        else:
            lid=it[0]; placed.append((lid,t)); t+=info[lid]["dur"]
    sched.append((name,s0,t))
TOTAL=t
# ---------------- mix the voice timeline ----------------
inp=[]; fc=[]
for i,(lid,st) in enumerate(placed):
    inp+=["-i",f"clips/{lid}.wav"]; d=int(round(st*1000)); fc.append(f"[{i}:a]adelay={d}|{d}[a{i}]")
fc.append("".join(f"[a{i}]" for i in range(len(placed)))+f"amix=inputs={len(placed)}:normalize=0:duration=longest,apad=whole_dur={TOTAL:.3f}[m]")
run(["ffmpeg","-hide_banner","-y",*inp,"-filter_complex",";".join(fc),"-map","[m]","-ar","48000","-ac","1","voice_raw.wav"])
meas=run(["ffmpeg","-hide_banner","-i","voice_raw.wav","-af","loudnorm=I=-14:TP=-1:LRA=11:print_format=json","-f","null","-"])
j=json.loads(meas[meas.rfind("{"):meas.rfind("}")+1])
run(["ffmpeg","-hide_banner","-y","-i","voice_raw.wav","-af",
     f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true",
     "-ar","48000","voice_timeline.wav"])
chk=run(["ffmpeg","-hide_banner","-i","voice_timeline.wav","-af","ebur128=peak=true","-f","null","-"])
I=re.findall(r"I:\s+(-?[\d.]+) LUFS",chk)[-1]; TP=re.findall(r"Peak:\s+(-?[\d.]+) dBFS",chk)[-1]
# ---------------- timing table ----------------
def fr(x): return int(round(x*FPS))
rows=[]; WORDS={}
for lid,st in placed:
    ws=words_for(lid); WORDS[lid]=[(w,st+a,st+b) for w,a,b in ws]
md=[f"# Таймлайн рилса №1 — {TOTAL:.2f} с = {fr(TOTAL)} кадров @ {FPS} fps\n",f"Голос: интегральная громкость **{I} LUFS**, true peak **{TP} dBTP** (цель −14 / ≤ −1).\n",
    "| Сцена | Кадры | Время, с | Длит., с |","|---|---|---|---|"]
for name,a,b in sched: md.append(f"| {name} | {fr(a)}–{fr(b)-1} | {a:.2f}–{b:.2f} | {b-a:.2f} |")
md.append("\n## Реплики и слова (кадр начала–конца слова)\n")
for name,a,b in sched:
    md.append(f"### Сцена {name}  (кадры {fr(a)}–{fr(b)-1})")
    for lid,st in placed:
        if a<=st<b:
            who="Я" if info[lid]["who"]=="me" else "Claude"
            ws=WORDS[lid]
            md.append(f"- **{lid} · {who}:** «{info[lid]['text']}» — кадры {fr(ws[0][1])}–{fr(ws[-1][2])}")
            md.append("  - "+" · ".join(f"{w} `{fr(x)}–{fr(y)}`" for w,x,y in ws))
    md.append("")
open("timing_table.md","w",encoding="utf-8").write("\n".join(md))
json.dump(dict(fps=FPS,total=TOTAL,scenes=sched,placed=placed,words={k:[(w,round(a,3),round(b,3)) for w,a,b in v] for k,v in WORDS.items()}),
          open("timing.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("TOTAL",round(TOTAL,2),"frames",fr(TOTAL),"LUFS",I,"TP",TP)
