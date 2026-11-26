import json
L=json.load(open("lines.json")); V=json.load(open("vo.json"))
FPS=30; LEAD=0.35; GAP=0.08; SGAP=0.3; TAIL=1.6
MAP={"Ай-Эйч-Джи":"IHG","ИнтерКонтиненталь":"InterContinental","Пан":"Pan","Американ":"American","Холидей":"Holiday","Инн":"Inn","Сикс":"Six","Сенсес":"Senses",
"Хотел":"Hotel","Индиго":"Indigo","Краун":"Crowne","Плаза":"Plaza","Уан":"One","Ривордс":"Rewards","Джорни":"Journey","ту":"to","Тумороу":"Tomorrow",
"Кимптон":"Kimpton","Риджент":"Regent","Хуалюкс":"HUALUXE"}
t=LEAD; out=[]
for i,(l,v) in enumerate(zip(L,V)):
    words=[{"w":MAP.get(w,w),"from":round((t+o)*FPS),"to":round((t+o+d)*FPS)} for w,o,d in v["words"]]
    toks=l["tts"].split()
    assert len(toks)==len(words), (i, toks, [w["w"] for w in words])
    chunks=[];cur=[];phr=[0]
    for k,tok in enumerate(toks):
        cur.append(k)
        if tok[-1] in ".,!?:" or len(cur)==4: chunks.append(cur); cur=[]
        if tok[-1] in ".,!?:" and k+1<len(toks): phr.append(words[k+1]["from"]-round(t*FPS))
    if cur: chunks.append(cur)
    out.append({"chunks":chunks,"phr":phr,"start":round(t*FPS),"vo":round(v["dur"]*FPS),"scene":l["scene"],"mood":l["mood"],"shot":l["shot"],"words":words,"i":i})
    nxt=L[i+1]["scene"] if i+1<len(L) else None
    t+=v["dur"]+(GAP if nxt==l["scene"] else SGAP)
total=round((t-SGAP+TAIL)*FPS)
for i,s in enumerate(out):
    s["end"]=out[i+1]["start"] if i+1<len(out) else total
json.dump({"fps":FPS,"total":total,"lines":out},open("../src/reel/reel.json","w"),ensure_ascii=False)
print(total, total/FPS)
