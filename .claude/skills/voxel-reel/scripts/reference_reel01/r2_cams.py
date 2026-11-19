"""Reel #1 v2 — cameras: never static (dolly/orbit/crane/push + hand-held noise), one new move per step,
whip pans <= 5 frames of blur.  Fills LOOK (where my head looks) and CAM_FACE (where Claude faces).  exec'd after r2_fx."""
CAMS = []
a_, b_ = 0, 1
def mkcam(name, lens=35):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36; cd.clip_start = 0.05; cd.clip_end = 2500
    cd.dof.use_dof = False
    co = bpy.data.objects.new(name, cd); sc.collection.objects.link(co); co.rotation_mode = 'XYZ'; return co
SHOTS = []
def shot(name, f0, f1, pos, tgt, lens, roll=lambda f: 0.0, shake=0.0, bursts=(), whip_out=False, whip_in=False, shift=lambda f: 0.0, seed=0, look=None, cl_face=None):
    SHOTS.append(dict(name=name, f0=f0, f1=f1, pos=pos, tgt=tgt, lens=lens, roll=roll, shake=shake, bursts=bursts, whip_out=whip_out, whip_in=whip_in, shift=shift, seed=seed))
    for f in range(f0, f1 + 1):
        if look == "cam": LOOK[f] = pos(f); LOOK_W[f] = 1.0
        if cl_face == "cam": CAM_FACE[f] = pos(f) - POS[f]
    if whip_in: ev("whoosh", f0 - 1)
def bake_cams():
    for s in SHOTS:
        co = mkcam(s["name"]); n1 = A.smooth_noise(s["seed"], s["shake"]); n2 = A.smooth_noise(s["seed"] + 1, s["shake"]); n3 = A.smooth_noise(s["seed"] + 2, s["shake"] * 0.6)
        bs = [A.burst(b[0], b[1], seed=s["seed"] + k) for k, b in enumerate(s["bursts"])]; prev = None; f0, f1 = s["f0"], s["f1"]
        for f in range(f0 - 1, f1 + 2):
            p = s["pos"](f); t = s["tgt"](f); q = (t - p).to_track_quat('-Z', 'Y') @ Quaternion((0, 0, 1), math.radians(s["roll"](f)))
            wy = 0.0
            if s["whip_out"] and f > f1 - 3: wy = -55 * A.ease_in((f - (f1 - 3)) / 3)
            if s["whip_in"] and f < f0 + 2: wy = 55 * (1 - A.ease_out((f - f0 + 1) / 3))
            b = sum(x(f) for x in bs)
            q = q @ Euler((math.radians(n1(f) + b), math.radians(n2(f) + wy + 0.6 * b), math.radians(n3(f))), 'XYZ').to_quaternion()
            e = q.to_euler('XYZ', prev) if prev else q.to_euler('XYZ'); prev = e
            co.location = p; co.rotation_euler = e; co.data.lens = s["lens"](f); co.data.shift_y = s["shift"](f)
            co.keyframe_insert("location", frame=f); co.keyframe_insert("rotation_euler", frame=f); co.data.keyframe_insert("lens", frame=f); co.data.keyframe_insert("shift_y", frame=f)
        mk = sc.timeline_markers.new(s["name"], frame=f0); mk.camera = co; CAMS.append((f0, f1, co))
        A.set_interp(co, 'BEZIER'); A.set_interp(co.data, 'BEZIER')
const = lambda v: (lambda f, a_=a_, b_=b_: v)
def me_at(f): return (MEP(YPATH[f]) if f < F_FLASH else M_S8.translation) - Vector((0, 0, FOOT)) + Vector((0, 0, fall_z(f) if f < F_FLASH else 0))
def head_at(f): return me_at(f) + Vector((0, 0, 1.08))
def cl_at(f): return POS[max(0, min(FEND, f))]
def blend_t(f, a, b, w): return a.lerp(b, w)
def drift(f, amp=0.03, per=4.0, seed=0.0):
    t = f / FPS; return Vector((amp * math.sin(2 * math.pi * t / per + seed), amp * 0.6 * math.cos(2 * math.pi * t / (per * 1.3) + seed), amp * 0.5 * math.sin(2 * math.pi * t / (per * 0.8) + seed * 2)))
# ---------- 1 HOOK: phone close-up over the shoulder -> crash zoom out to a wide -> crash in to medium on the shout ----------
F_PH1 = 13
def s1_pos(f):
    me = me_at(f)
    # the phone sits in my left hand in front of the chest: camera behind the right shoulder looking down at it
    cu_ = me + Vector((0.02, -0.62, 1.32)); wide = me + Vector((-2.6, -4.6, 3.9)); med = me + Vector((-0.55, -1.8, 1.55))
    if f < F_PH1: return PHONEPOS.get(f, me) + Vector((0.06, -0.56, 0.24)) + drift(f, 0.012, 2.5)
    if f < F_PH1 + 12: u = (f - F_PH1) / 12; k = 1.05 * A.ease_in(u) if u < 1 else 1.0; return cu_.lerp(wide, min(1.05, k)) + drift(f, 0.02, 2.5)
    if f < F_HEADUP: u = (f - F_PH1 - 12) / max(1, F_HEADUP - F_PH1 - 12); return wide + Vector((0.4 * u, 0.5 * u, -0.5 * u)) + drift(f, 0.03, 3)
    c = A.ease_in(min(1, (f - F_HEADUP) / 10)); over = 1.05 if f < F_HEADUP + 12 else 1.0 + 0.05 * (1 - A.ease(min(1, (f - F_HEADUP - 12) / 4)))
    return wide.lerp(med, min(1.05, c * over)) + Vector((-0.15 * (f - F_HEADUP) / 60, 0, 0)) + drift(f, 0.02, 2)
def s1_tgt(f):
    me = me_at(f)
    if f < F_PH1 + 12: u = min(1, max(0, (f - F_PH1) / 12)); return PHONEPOS.get(f, me + Vector((0.10, -0.27, 0.78))).lerp(me + Vector((0, 0, 0.6)), A.ease(u))
    if f < F_HEADUP: return me + Vector((0, 0, 0.6))
    return me + Vector((0, 0, 0.6)).lerp(Vector((0, 0, 0.85)), A.ease_in(min(1, (f - F_HEADUP) / 10)))
def s1_lens(f):
    if f < F_PH1: return 50
    if f < F_PH1 + 12: return 50 - 26 * A.ease_in((f - F_PH1) / 12)
    if f < F_HEADUP: return 24
    return 24 + 11 * A.ease_in(min(1, (f - F_HEADUP) / 10))
shot("Cam_S1", 0, SCN["1"][1], s1_pos, s1_tgt, s1_lens, shake=0.22, bursts=[(F_PH1 + 12, 1.6), (F_HEADUP + 10, 2.4)], whip_out=True, seed=1)
ev("crashzoom", F_PH1); ev("crashzoom", F_HEADUP)
for f in range(0, F_HEADUP): LOOK[f] = me_at(f) + Vector((0.05, -0.12, 0.98)); LOOK_W[f] = 0.0   # (the phone pose already looks down)
# ---------- 2 PASSERS-BY: three close-ups with push-ins, 4-frame whips ----------
s2 = SCN["2"]; cuts = [s2[0], s2[0] + 12, s2[0] + 24, s2[1]]
def npc_head(n, f):
    p, yaw, sp = npc_pos(n, f); return p + Vector((0, 0, 1.0 * NPC[n]["k"]))
def toward_me(hp, d, side_deg=12, dz=0.03):
    v = (MEP(YS) - hp); v.z = 0; v.normalize(); v = Quaternion((0, 0, 1), math.radians(side_deg)) @ v; return hp + v * d + Vector((0, 0, dz))
for k, (n, a, b, sd) in enumerate((("NPC_Teen", cuts[0], cuts[1] - 1, 14), ("NPC_Suit", cuts[1], cuts[2] - 1, -12))):
    hp = npc_head(n, a); p0 = toward_me(hp, 0.82, sd); p1 = toward_me(hp, 0.66, sd)
    shot("Cam_S2%s" % "ab"[k], a, b, (lambda f, a=a, b=b, p0=p0, p1=p1: p0.lerp(p1, A.ease((f - a) / (b - a))) + drift(f, 0.01, 1.5)), const(hp), const(50), shake=0.3, whip_out=True, seed=2 + k)
PG = PIG_POS[0] + Vector((0, 0, 0.2))
shot("Cam_S2c", cuts[2], cuts[3], (lambda f, a_=a_, b_=b_: toward_me(PG, 0.52 - 0.12 * A.ease((f - cuts[2]) / (cuts[3] - cuts[2])), 15, 0.06) + drift(f, 0.008, 1.5)), const(PG), const(50), shake=0.3, whip_out=True, seed=4)
# ---------- 3 CLAUDE FLIES IN: tracking back in front of me, the target slides to Claude as he brakes, small orbit ----------
PAN3 = A.track([(F_CL_ARR - 6, 0.0), (F_CL_ARR + 8, 0.75)])
def s3_pos(f):
    me = me_at(f); u = (f - S3[0]) / (S3[1] - S3[0]); a = math.radians(-8 + 26 * A.ease(u))
    return me + Vector((2.15 * math.sin(a), -2.15 * math.cos(a), 1.3 - 0.1 * u)) + drift(f, 0.02, 3)
def s3_tgt(f): return head_at(f).lerp(cl_at(f), PAN3(f)) - Vector((0, 0, 0.15))
shot("Cam_S3", SCN["3"][0], SCN["3"][1], s3_pos, s3_tgt, const(35), shake=0.2, bursts=[(F_CL_ARR, 1.4)], whip_in=True, seed=5)
for f in range(F_CL_ARR + 2, SCN["3"][1] + 1): LOOK[f] = cl_at(f); LOOK_W[f] = 1.0
# ---------- 4 STEPS 1-3: one slow 100-degree orbit + crane, target leans to Claude while he talks ----------
C4 = ME_C + Vector((0.2, 0, 1.05))
def s4_pos(f):
    u = (f - SCN["4"][0]) / (SCN["4"][1] - SCN["4"][0]); a = math.radians(-55 + 100 * A.ease(u))
    return C4 + Vector((2.3 * math.sin(a), -2.3 * math.cos(a), 0.25 + 0.5 * math.sin(math.pi * u))) + drift(f, 0.02, 4)
def s4_tgt(f): return C4.lerp(cl_at(f), 0.35 if cl_talking(f) else 0.1)
shot("Cam_S4", SCN["4"][0], SCN["4"][1], s4_pos, s4_tgt, const(35), shake=0.15, seed=6)
for f in range(SCN["4"][0], SCN["4"][1] + 1): LOOK[f] = cl_at(f); LOOK_W[f] = 1.0 if cl_talking(f) or f < wf("M2", 0) - 10 else 0.55
# ---------- 5 STEPS 4-7: a new angle and a new move on every step ----------
def snap(f0n, base): return lambda f: base * (1 + 0.10 * A.ease_out(min(1, max(0, (f - f0n) / 4))))
a_, b_ = SCN["5"][0], STEP_NUM[5] - 1      # Скелет: push-in to the chest, dutch 6
shot("Cam_S5a", a_, b_, (lambda f, a_=a_, b_=b_: ME_C + Vector((-1.3, -1.6, 1.0)).lerp(Vector((-0.6, -1.1, 0.95)), A.ease((f - a_) / (b_ - a_))) + drift(f, 0.015, 2)), const(ME_C + Vector((0, 0, 0.8))), snap(STEP_NUM[4], 30), roll=const(6), shake=0.4, seed=10)
a_, b_ = STEP_NUM[5], STEP_NUM[6] - 1      # Эмоции: fast orbit around the head, 45 mm
def s5b(f, a=a_, b=b_):
    u = (f - a) / (b - a); an = math.radians(-40 + 80 * u); return head_at(f) + Vector((0.95 * math.sin(an), -0.95 * math.cos(an), 0.08)) + drift(f, 0.01, 1.5)
shot("Cam_S5b", a_, b_, s5b, (lambda f, a_=a_, b_=b_: head_at(f) + Vector((0, 0, 0.02))), snap(STEP_NUM[5], 45), roll=const(-6), shake=0.35, seed=11, look="cam")
a_, b_ = STEP_NUM[6], F_FALL0 - 1          # Локация: wide low from the road, the wave starts
shot("Cam_S5c", a_, b_, (lambda f, a_=a_, b_=b_: ME_C + Vector((-2.4, -3.6, 0.5)) + Vector((0.6, 0.4, 0.3)) * A.ease((f - a_) / (b_ - a_)) + drift(f, 0.02, 2)), (lambda f, a_=a_, b_=b_: ME_C + Vector((0.3, 0.6, 1.5))), const(24), roll=const(7), shake=0.4, seed=12)
a_, b_ = F_FALL0, F_LAND + 8               # the fall: the camera drops with me, rolling
def s5d(f, a=a_, b=b_):
    u = (f - a) / (b - a); return me_at(f) + Vector((-0.9 * math.cos(u * 2.0), -1.5 * math.sin(u * 2.0 + 0.6), 1.1 - 0.3 * u)) + drift(f, 0.03, 1.2)
shot("Cam_S5d", a_, b_, s5d, (lambda f, a_=a_, b_=b_: me_at(f) + Vector((0, 0, 0.85))), const(28), roll=(lambda f, a=a_, b=b_: 25 * math.sin(math.pi * (f - a) / (b - a))), shake=0.6, seed=13)
a_, b_ = F_LAND + 9, STEP_NUM[7] - 1       # new street reveal: crane up from the ground
shot("Cam_S5e", a_, b_, (lambda f, a_=a_, b_=b_: me_at(f) + Vector((1.7, -2.3, 0.25 + 1.5 * A.ease((f - a_) / (b_ - a_)))) + drift(f, 0.02, 2)), (lambda f, a_=a_, b_=b_: me_at(f) + Vector((0, 0, 0.9))), const(32), roll=const(-5), shake=0.3, seed=14)
a_, b_ = STEP_NUM[7], wf("M3", 0) - 7      # Материалы: lateral dolly along the facade following Claude's sweep
shot("Cam_S5f", a_, b_, (lambda f, a_=a_, b_=b_: me_at(f) + Vector((-2.7, -1.6 + 2.4 * A.ease((f - a_) / (b_ - a_)), 1.7)) + drift(f, 0.02, 2)), (lambda f, a_=a_, b_=b_: cl_at(f).lerp(me_at(f) + Vector((2.0, 1.0, 2.2)), 0.5)), snap(STEP_NUM[7], 28), roll=const(5), shake=0.35, seed=15)
a_, b_ = wf("M3", 0) - 6, SCN["5"][1]      # Подожди: push-in on me
shot("Cam_S5g", a_, b_, (lambda f, a_=a_, b_=b_: me_at(f) + Vector((0.3, -1.7, 1.2)).lerp(Vector((0.2, -1.25, 1.1)), A.ease((f - a_) / (b_ - a_))) + drift(f, 0.015, 2)), (lambda f, a_=a_, b_=b_: me_at(f) + Vector((0, 0, 0.95))), const(35), roll=const(-4), shake=0.4, seed=16)
for f in range(SCN["5"][0], SCN["5"][1] + 1):
    LOOK[f] = cl_at(f); LOOK_W[f] = 1.0 if cl_talking(f) else 0.5
    if F_FALL0 <= f <= F_LAND + 6: LOOK[f] = me_at(f) + Vector((0, -1, 2.5)); LOOK_W[f] = 1.0
# ---------- 6 OVERLOAD: low 24 mm, every cut pushes up, Claude circling, strong shake ----------
s6c = [SCN["6"][0], STEP_NUM[9] - 4, STEP_NUM[10] - 6, STEP_NUM[11] - 6, STEP_NUM[12] - 8, STEP_NUM[12] + 20, wf("M4", 0) - 6, wf("M4", 2), SCN["6"][1] + 1]
s6p = [(-0.9, -1.9, 0.33), (0.95, -1.75, 0.3), (-0.45, -1.55, 0.28), (1.15, -1.6, 0.35), (-1.0, -1.45, 0.3), (0.6, -1.35, 0.3), (-0.25, -1.2, 0.98), (0.3, -1.05, 1.02)]
for k in range(len(s6p)):
    a_, b_ = s6c[k], s6c[k + 1] - 1; p0 = Vector(s6p[k]); tz = 1.0 if k < 6 else 1.12
    def pos6(f, a=a_, b=b_, p0=p0): u = (f - a) / max(1, b - a); return me_at(f) + p0 + (Vector((-p0.x, -p0.y, 0))).normalized() * 0.2 * u + Vector((0, 0, 0.15 * u)) + drift(f, 0.02, 1.5)
    def tgt6(f, tz=tz): return (me_at(f) + Vector((0.15, 0, tz))).lerp(cl_at(f), 0.25 if cl_talking(f) else 0.0)
    shot("Cam_S6%s" % "abcdefgh"[k], a_, b_, pos6, tgt6, const(24), shake=0.9, bursts=[(h, 2.5) for h in CRASH if a_ <= h <= b_], seed=20 + k)
for f in range(SCN["6"][0], SCN["6"][1] + 1): LOOK[f] = cl_at(f); LOOK_W[f] = 0.6
ev("hum", SCN["6"][0], dur=SCN["6"][1] - SCN["6"][0])
# ---------- 7 PAUSE: Claude close-up, slow 3 % push-in only ----------
a_, b_ = SCN["7"][0], SCN["7"][1]
shot("Cam_S7", a_, b_, (lambda f, a_=a_, b_=b_: cl_at(f) + Vector((0.05, -0.86 + 0.026 * A.ease((f - a_) / (b_ - a_)), 0.03))), (lambda f, a_=a_, b_=b_: cl_at(f) + Vector((0, 0, -0.01))), const(50), shake=0.0, seed=30, cl_face="cam")
ev("silence", SCN["7"][0], dur=15)
# ---------- 8 FINAL: dolly-in 0.4 m + 12-degree orbit, 35 -> 40 mm, my eyes in the upper third, look into the lens ----------
EYES = cl_head_s8() + Vector((0, 0, 0.03)); MID = EYES + Vector((0.30, 0, -0.05))
fwd = (M_S8.to_3x3() @ Vector((0, -1, 0))).normalized()
DOLLY = A.track([(SCN["8"][0], 0.0), (SCN["8"][1], 1.0)])
def s8_pos(f):
    u = DOLLY(f); a = math.radians(-6 + 12 * u); d = fwd.copy(); d.rotate(Quaternion((0, 0, 1), a))
    return MID + d * (1.75 - 0.4 * u) + Vector((0, 0, 0.02)) + drift(f, 0.006, 5)
shot("Cam_S8", SCN["8"][0], SCN["8"][1], s8_pos, (lambda f, a_=a_, b_=b_: MID), (lambda f, a_=a_, b_=b_: 35 + 5 * DOLLY(f)), shake=0.04, shift=const(-0.1667), seed=31, look="cam", cl_face="cam")
for f in range(wf("M5", 7) - 3, wf("M5", 10, True) + 4): LOOK[f] = CL_S8; LOOK_W[f] = 1.0
ev("flash", F_FLASH); ev("psh", F_FLASH)
CAMPOS = {}
for s_ in SHOTS:
    for f in range(s_["f0"], s_["f1"] + 1): CAMPOS[f] = s_["pos"](f)
print("CAMS DEFINED", len(SHOTS))
