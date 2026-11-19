"""Reel #1 v2 build.  blender -b Template_Room.blend --python reel2_build.py -- [stills f,f,..] [res=540] [out=D:\\...]"""
import time; t0 = time.time()
RP = r"E:\3д Рилсики ЛоуПоли\reel01"; DP = r"D:\3д Рилсики рендер\reel01"
exec(open(RP + r"\scripts\r2_core.py", encoding="utf-8").read()); print("t core", round(time.time() - t0))
exec(open(RP + r"\scripts\r2_claude.py", encoding="utf-8").read()); print("t claude", round(time.time() - t0))
exec(open(RP + r"\scripts\r2_fx.py", encoding="utf-8").read()); print("t fx", round(time.time() - t0))
exec(open(RP + r"\scripts\r2_cams.py", encoding="utf-8").read()); print("t cams", round(time.time() - t0))
bake_claude(); bake_me(); bake_phone(); bake_cams(); bake_holos(); print("t bake", round(time.time() - t0))
exec(open(RP + "/scripts/r2_end.py", encoding="utf-8").read()); print("t end", round(time.time() - t0))
exec(open(RP + r"\scripts\r2_look.py", encoding="utf-8").read()); print("t look", round(time.time() - t0))
sc.frame_start, sc.frame_end = 0, FEND; sc.render.fps = FPS; sc.camera = CAMS[0][2]
import json as _j
_j.dump(dict(events=EV, step_num=STEP_NUM, step_subj=STEP_SUBJ, scenes=SCN, cams=[(a, b, c.name) for a, b, c in CAMS], fend=FEND, glitch=GL, fall=[F_LOC, F_FALL0, F_LAND, F_REBUILT]),
        open(RP + r"\animatic\events.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=DP + r"\reel2_scene.blend")
print("SCENE2 OK frames", FEND + 1, "cams", len(CAMS), "t", round(time.time() - t0))
res = int([a for a in argv if a.startswith("res=")][0][4:]) if any(a.startswith("res=") for a in argv) else 540
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = res, res * 16 // 9, 100
if "stills" in argv:
    outd = [a[4:] for a in argv if a.startswith("out=")]; outd = outd[0] if outd else DP + r"\stills2"
    import os; os.makedirs(outd, exist_ok=True)
    for f in [int(x) for x in argv[argv.index("stills") + 1].split(",")]:
        sc.frame_set(f)
        for a, b, c in CAMS:
            if a <= f <= b: sc.camera = c
        sc.render.filepath = outd + r"\s_%04d.png" % f; t1 = time.time(); bpy.ops.render.render(write_still=True); print("STILL", f, round(time.time() - t1, 1))
print("DONE")
