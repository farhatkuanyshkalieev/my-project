import json, re
raw=json.load(open("/tmp/timing_raw.json")); durs=json.load(open("src/vo_durations.json"))
REP=[("Ай-Эйч-Джи Уан Ривордс","IHG One Rewards"),("Ай-Эйч-Джи","IHG"),("ИнтерКонтиненталь","InterContinental"),("Холидей Инн Экспресс","Holiday Inn Express"),
("Холидей Инн","Holiday Inn"),("Пан Американ","Pan American"),("Сикс Сенсес","Six Senses"),("Риджент","Regent"),("Кимптон","Kimpton"),("Краун Плаза","Crowne Plaza"),
("Хотел Индиго","Hotel Indigo"),("Воко","voco"),("Хуалюкс","HUALUXE"),("Джорни ту Тумороу","Journey to Tomorrow"),
("мың тоғыз жүз қырық алтыншы жылы","1946 жылы"),("Мың тоғыз жүз елу екінші жылы","1952 жылы"),("екі мың үшінші жылы","2003 жылы"),
("алты мың алты жүзден астам","6 600-ден астам"),("жүзден астам","100-ден астам"),("бір миллион","1 миллион"),("екі мыңнан астам","2 000-нан астам"),
("жүз қырық миллионнан астам","145 миллионнан астам"),("Ай-Эйч-Джи,","IHG —")]
POST=[("стратегия,","стратегия —"),("Бүгінде IHG,","Бүгінде IHG —"),("Бұл, халықаралық","Бұл — халықаралық"),("IHG табысы,","IHG табысы —"),("Люкс деңгейінде,","Люкс деңгейінде:"),("Премиум сегментте,","Премиум сегментте:"),("негізгі сегментте,","негізгі сегментте:"),("Үлкен Қытай аймағы,","Үлкен Қытай аймағы —")]
def disp(s):
    for a,b in REP: s=s.replace(a,b)
    for a,b in POST: s=s.replace(a,b)
    return s
FPS=30; LEAD=0.6; TAIL=1.0
scenes=[]; cur=0
for i,(r,d) in enumerate(zip(raw,durs)):
    n=len(r["sents"]); gaps=sorted(sorted(r["gaps"],key=lambda g:g[1]-g[0],reverse=True)[:n-1])
    starts=[0]+[g[1] for g in gaps]; ends=[g[0] for g in gaps]+[d]
    subs=[]
    for s,a,b in zip(r["sents"],starts,ends):
        s=disp(s)
        # chunk long sentences at commas
        parts=[p for p in re.split(r'(?<=,)\s+',s)]
        chunks=[];c=""
        for p in parts:
            if c and len(c)>=28 and len(c)+len(p)>70: chunks.append(c); c=p
            else: c=(c+" "+p).strip()
        if c: chunks.append(c)
        tot=sum(len(x) for x in chunks); t=a
        for x in chunks:
            dt=(b-a)*len(x)/tot; subs.append({"text":x,"from":round((LEAD+t)*FPS),"to":round((LEAD+t+dt)*FPS)}); t+=dt
    total=round((LEAD+d+TAIL)*FPS)
    scenes.append({"start":cur,"duration":total,"voDuration":round(d*FPS),"sent":[round((LEAD+a)*FPS) for a in starts],"subs":subs})
    cur+=total
json.dump({"fps":FPS,"lead":round(LEAD*FPS),"total":cur,"scenes":scenes},open("src/timeline.json","w"),ensure_ascii=False,indent=1)
print(cur, cur/FPS)
for s in scenes: print(s["sent"], [x["text"] for x in s["subs"]][:3])
