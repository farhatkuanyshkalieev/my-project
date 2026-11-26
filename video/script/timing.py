import json, re, subprocess
lines=json.load(open("script/narration.json"))
durs=json.load(open("src/vo_durations.json"))
out=[]
for i,t in enumerate(lines):
    sents=[s.strip() for s in re.split(r'(?<=[.!?])\s+', t) if s.strip()]
    log=subprocess.run(["ffmpeg","-v","info","-i",f"public/vo/s{i+1:02d}.wav","-af","silencedetect=n=-38dB:d=0.25","-f","null","-"],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r"silence_start: ([\d.]+)",log)]
    en=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",log)]
    gaps=[(a,b) for a,b in zip(st,en) if a>0.2 and b<durs[i]-0.2]
    print(i+1, len(sents), "sents;", len(gaps), "gaps", [(round(a,2),round(b-a,2)) for a,b in gaps])
    out.append({"sents":sents,"gaps":gaps})
json.dump(out,open("/tmp/timing_raw.json","w"),ensure_ascii=False)
