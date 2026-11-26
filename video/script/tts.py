import json, subprocess, sys, os
P=sys.argv[1]  # piper model
lines=json.load(open("script/narration.json"))
durs=[]
for i,t in enumerate(lines):
    raw=f"/tmp/vo_{i}.wav"; out=f"public/vo/s{i+1:02d}.wav"
    subprocess.run([sys.executable,"-m","piper","-m",P,"--speaker","1","--length-scale","0.9","--sentence-silence","0.35","-f",raw],input=t.encode(),check=True,capture_output=True)
    # light voice polish: highpass, gentle compression, normalize, 48k stereo
    subprocess.run(["ffmpeg","-y","-v","error","-i",raw,"-af","highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5:LRA=7","-ar","48000","-ac","2",out],check=True)
    d=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",out]))
    durs.append(round(d,3)); print(i+1, d)
json.dump(durs, open("src/vo_durations.json","w"))
print("total", sum(durs))
