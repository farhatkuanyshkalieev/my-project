"""Reel #1 animation helpers: eased tracks, robotic tracks, camera noise, FK pose solver for VX_Rig, keyframe utilities."""
import math, random
from mathutils import Vector, Matrix, Quaternion, Euler

FPS = 30

def ease(t): t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
def ease_in(t): t = min(1.0, max(0.0, t)); return t ** 3
def ease_out(t): t = min(1.0, max(0.0, t)); return 1 - (1 - t) ** 3

def track(keys, fn=ease):
    """keys [(frame, value)] -> eased piecewise function; value may be float or Vector"""
    keys = sorted(keys, key=lambda k: k[0])
    def f(x):
        if x <= keys[0][0]: return keys[0][1]
        for (a, va), (b, vb) in zip(keys, keys[1:]):
            if a <= x <= b: return va + (vb - va) * (fn((x - a) / (b - a)) if b > a else 1.0)
        return keys[-1][1]
    return f

def robo(keys, over=0.045, settle=4):
    """Mechanical move: keys [(start_frame, target, duration)]. Sharp ease-in-out, small overshoot, stepped settle."""
    keys = sorted(keys, key=lambda k: k[0])
    def f(x):
        v = keys[0][1]
        for i, (s, tgt, d) in enumerate(keys):
            if x < s: break
            prev = v
            if x < s + d:
                u = (x - s) / d; u = u * u * u * (u * (6 * u - 15) + 10)       # smootherstep: fast middle
                v = prev + (tgt - prev) * u * (1 + over)
                return v
            t = x - s - d
            if t < settle:                                                   # overshoot, then two small stepped corrections
                k = (1 + over) if t < settle * 0.34 else ((1 - over * 0.35) if t < settle * 0.67 else 1 + over * 0.1)
                return prev + (tgt - prev) * k
            v = tgt
        return v
    return f

def smooth_noise(seed, amp, freqs=(0.35, 0.8, 1.7)):
    r = random.Random(seed); ph = [(r.uniform(0, 6.283), r.uniform(0.8, 1.2) * fq) for fq in freqs]
    w = [1.0, 0.55, 0.25]
    def f(x):
        t = x / FPS
        return amp * sum(wi * math.sin(2 * math.pi * fq * t + p) for wi, (p, fq) in zip(w, ph)) / sum(w)
    return f

def burst(f0, amp, tau=6.0, hz=7.0, seed=0):
    """decaying shake started at frame f0"""
    r = random.Random(seed); p = r.uniform(0, 6.283)
    def f(x):
        if x < f0: return 0.0
        d = x - f0
        return amp * math.exp(-d / tau) * math.sin(2 * math.pi * hz * d / FPS + p)
    return f

# ---------------- FK solver ----------------
class FK:
    """Pose VX_Rig by armature-space aim directions ('aim'), local Euler degrees ('rot') or local quaternions ('quat')."""
    def __init__(self, rig):
        self.rig = rig; self.bones = sorted(rig.data.bones, key=lambda b: len(b.parent_recursive))
        self.R = {b.name: b.matrix_local.to_3x3() for b in self.bones}
    def solve(self, spec):
        P = {}; Q = {}
        for b in self.bones:
            n = b.name; Rb = self.R[n]
            base = (P[b.parent.name] @ self.R[b.parent.name].inverted() @ Rb) if b.parent else Rb.copy()
            e = spec.get(n)
            if e is None: q = Quaternion()
            elif e[0] == 'aim':
                d = Vector(e[1]).normalized(); Pb = Rb.col[1].rotation_difference(d).to_matrix() @ Rb
                if len(e) > 2: Pb = Quaternion(d, math.radians(e[2])).to_matrix() @ Pb      # twist around the bone
                q = (base.inverted() @ Pb).to_quaternion()
            elif e[0] == 'rot': q = Euler([math.radians(a) for a in e[1]], 'XYZ').to_quaternion()
            else: q = Quaternion(e[1])
            Q[n] = q; P[n] = base @ q.to_matrix()
        return Q

def blend_specs(items):
    """items [(weight, spec)] -> spec; aims are averaged as vectors, rots as angles, quats nlerped"""
    tot = sum(w for w, s in items if w > 1e-6)
    if tot <= 0: return {}
    out = {}; keys = set()
    for w, s in items:
        if w > 1e-6: keys |= set(s)
    for k in keys:
        kinds = [s[k][0] for w, s in items if w > 1e-6 and k in s]
        kind = kinds[0]
        if kind == 'aim':
            v = Vector(); tw = 0
            for w, s in items:
                if w > 1e-6 and k in s: v += Vector(s[k][1]).normalized() * w; tw += s[k][2] * w if len(s[k]) > 2 else 0
            out[k] = ('aim', tuple(v), tw / tot)
        elif kind == 'rot':
            v = Vector(); ws = 0
            for w, s in items:
                if w > 1e-6 and k in s: v += Vector(s[k][1]) * w; ws += w
            out[k] = ('rot', tuple(v / tot))   # missing entries count as 0 rotation
        else:
            acc = None
            for w, s in items:
                if w > 1e-6 and k in s:
                    q = Quaternion(s[k][1])
                    if acc is None: acc = q * w
                    else:
                        if acc.dot(q) < 0: q = -q
                        acc = acc + q * w
            acc.normalize(); out[k] = ('quat', tuple(acc))
    return out

def rot_dir(v, axis, deg):
    return tuple(Quaternion(Vector(axis), math.radians(deg)) @ Vector(v))

def add_rot(spec, bone, d):
    e = spec.get(bone, ('rot', (0, 0, 0)))
    if e[0] == 'rot': spec[bone] = ('rot', tuple(a + b for a, b in zip(e[1], d)))
    return spec

# ---------------- keyframe utilities ----------------
def fcurves_of(idb):
    ad = getattr(idb, "animation_data", None)
    if not ad or not ad.action: return []
    out = []
    for lay in ad.action.layers:
        for st in lay.strips:
            for cb in st.channelbags: out += list(cb.fcurves)
    return out

def set_interp(idb, mode, path_filter=None):
    for fc in fcurves_of(idb):
        if path_filter and not path_filter(fc.data_path): continue
        for kp in fc.keyframe_points:
            kp.interpolation = mode
            if mode == 'BEZIER': kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
        fc.update()
