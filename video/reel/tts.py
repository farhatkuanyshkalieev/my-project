import asyncio, json, ssl, subprocess
import edge_tts, edge_tts.communicate as ec
ec._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
MOOD={"wow":("+8%","+8Hz"),"excited":("+6%","+5Hz"),"question":("+3%","+4Hz"),"story":("+1%","+0Hz"),"reveal":("-3%","-2Hz")}
lines=json.load(open("lines.json"))
async def gen(i,l):
    rate,pitch=MOOD[l["mood"]]
    c=edge_tts.Communicate(l["tts"],"kk-KZ-DauletNeural",rate=rate,pitch=pitch,boundary="WordBoundary")
    words=[]; raw=f"/tmp/reel_{i}.mp3"
    with open(raw,"wb") as f:
        async for ch in c.stream():
            if ch["type"]=="audio": f.write(ch["data"])
            elif ch["type"]=="WordBoundary": words.append([ch["text"], round(ch["offset"]/1e7,3), round(ch["duration"]/1e7,3)])
    out=f"../public/reel/vo/l{i:02d}.wav"
    subprocess.run(["ffmpeg","-y","-v","error","-i",raw,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,highpass=f=80,equalizer=f=3500:t=q:w=1:g=3,acompressor=threshold=-18dB:ratio=3:attack=4:release=60,loudnorm=I=-14:TP=-1.2:LRA=6","-ar","48000","-ac","2",out],check=True)
    d=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",out]))
    # leading silence trimmed: shift words so first starts at 0
    off=words[0][1] if words else 0
    for w in words: w[1]=round(w[1]-off,3)
    return {"dur":round(d,3),"words":words}
async def main():
    res=[]
    for i,l in enumerate(lines):
        r=await gen(i,l); res.append(r); print(i, r["dur"], [w[0] for w in r["words"]][:8])
    json.dump(res,open("vo.json","w"),ensure_ascii=False)
    print("TOTAL", sum(r["dur"] for r in res))
asyncio.run(main())
