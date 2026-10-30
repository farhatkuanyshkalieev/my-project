"""Parametric 2.5D stickman rig.

Every character is drawn by the same rig from a fixed style sheet (proportions + palette), so proportions,
colours and features cannot drift between shots.  A pose is a plain dict; missing keys take defaults.
Units: R = head radius in pixels (100 * scale).  Local origin = pelvis.
"""
import math

import skia

from .core import (clamp, lerp, hexc, mix, with_alpha, shade, fill, stroke, radial, linear, path_poly)

# ----------------------------------------------------------------------------- style sheets
STYLES = {
    "arman": dict(
        name="Арман", head="#15161c", head_hi="#2c303d", head_edge="#050608", rim="#5aa8ff", rim_k=1.0,
        eye="#f5f7fc", iris=None, pupil="#0a0a0e", eye_rx=0.25, eye_ry=0.29, eye_dx=0.37, eye_y=0.02,
        brow="#000000", brow_edge="#3a4660", lid_base=0.16, lid_col="#15161c",
        mouth_line="#4a5878", mouth_in="#3a0d15", skin_hand="#121318",
        top="#1d2b4f", top_dark="#121c36", top_detail="#c9d6f2", hood=True, strings=True,
        pants="#22262f", shoes="#f2f2f2", shoe_sole="#b8bcc6", glow=None, height=1.0),
    "double": dict(
        name="Двойник", head="#121014", head_hi="#2a2226", head_edge="#040304", rim="#ff2b3a", rim_k=1.25,
        eye="#fff1f1", iris="#e0101e", iris_r=0.13, pupil="#2a0004", eye_rx=0.25, eye_ry=0.29, eye_dx=0.37,
        eye_y=0.02, brow="#000000", brow_edge="#5a1a22", lid_base=0.30, lid_col="#121014",
        mouth_line="#6a2a34", mouth_in="#2a0508", skin_hand="#100d10",
        top="#141016", top_dark="#09070a", top_detail="#a3121f", hood=True, strings=True,
        pants="#141418", shoes="#2a2a30", shoe_sole="#4a1a20", glow="#ff1a2a", height=1.0),
    "mom": dict(
        name="Мама", head="#f1d3b5", head_hi="#fde8d2", head_edge="#c99c7a", rim="#ffd9a0", rim_k=0.45,
        eye="#ffffff", iris="#6b3d22", iris_r=0.12, pupil="#1a0d06", eye_rx=0.2, eye_ry=0.235, eye_dx=0.34,
        eye_y=0.06, brow="#5a3420", brow_edge=None, lid_base=0.08, lid_col="#e2bb98", lashes="#2a160c",
        mouth_line="#8a4a3a", mouth_in="#5a1e1e", skin_hand="#efcfae", blush="#ff9a8a",
        hair="#6b3f26", hair_hi="#8e5a3a", bun=True,
        top="#d8b99a", top_dark="#b8957a", cardigan="#9e6e6a", hood=False, strings=False,
        pants="#6a5a56", shoes="#e9ddd2", shoe_sole="#b5a79a", glow=None, height=0.97),
    "girl": dict(
        name="Девочка", head="#f3d6ba", head_hi="#ffeedd", head_edge="#cfa07e", rim="#ffe0b0", rim_k=0.4,
        eye="#ffffff", iris="#5a3420", iris_r=0.14, pupil="#140a04", eye_rx=0.23, eye_ry=0.28, eye_dx=0.35,
        eye_y=0.08, brow="#5a3420", brow_edge=None, lid_base=0.0, lid_col="#e6c2a2", lashes="#2a160c",
        mouth_line="#8a4a3a", mouth_in="#6a2222", skin_hand="#f1d2b2", blush="#ff8f86",
        hair="#6e4128", hair_hi="#94603e", ponytail=True, bangs=True,
        top="#e9e2d6", top_dark="#c9c0b2", hood=False, strings=False, zipper=True,
        pants="#4a5a7a", shoes="#ff6b6b", shoe_sole="#c44", glow=None, height=0.72),
    "barista": dict(
        name="Бариста", head="#e9c7a3", head_hi="#f8dfc4", head_edge="#c09270", rim="#ffd29a", rim_k=0.4,
        eye="#ffffff", iris="#3b2a1e", iris_r=0.11, pupil="#0c0806", eye_rx=0.2, eye_ry=0.22, eye_dx=0.34,
        eye_y=0.1, brow="#2a1c14", brow_edge=None, lid_base=0.22, lid_col="#d8b08c",
        mouth_line="#7a4434", mouth_in="#4a1a1a", skin_hand="#e7c4a0",
        cap="#f1f1f1", cap_dark="#c8c8c8",
        top="#3a3a40", top_dark="#26262a", apron="#5a4030", hood=False, strings=False,
        pants="#2a2a2e", shoes="#ececec", shoe_sole="#aaa", glow=None, height=1.0),
    "operator": dict(
        name="Оператор", head="#0b0f1a", head_hi="#18203a", head_edge="#03050a", rim="#3d7bff", rim_k=0.8,
        eye="#bfe3ff", iris=None, pupil=None, eye_rx=0.22, eye_ry=0.12, eye_dx=0.33, eye_y=0.05,
        eye_glow="#3aa0ff", brow=None, brow_edge=None, lid_base=0.0, lid_col="#0b0f1a",
        mouth_line=None, mouth_in=None, skin_hand="#0b0f1a", headphones="#1c2236",
        top="#0e1322", top_dark="#070a14", hood=True, hood_up=True, strings=False,
        pants="#0e1322", shoes="#1a2030", shoe_sole="#0a0d18", glow="#2a6aff", height=1.0),
}

EMOTIONS = {
    "neutral":   dict(),
    "joy":       dict(smile=0.9, squint=0.35, brow_raise=0.35, brow_angle=-0.15, lid=-0.1, mouth_open=0.35),
    "surprise":  dict(brow_raise=1.0, lid=-0.3, mouth_open=0.55, smile=-0.1, pupil_k=0.75),
    "fear":      dict(brow_raise=0.7, brow_angle=-0.8, lid=-0.25, mouth_open=0.25, smile=-0.6, pupil_k=0.7),
    "irritation": dict(brow_raise=-0.45, brow_angle=0.9, lid=0.3, lid_angle=10, smile=-0.45),
    "suspicion": dict(brow_raise=-0.2, brow_angle=0.4, brow_asym=0.6, lid=0.38, lid_angle=4, smile=-0.15,
                      look=(0.55, 0.0)),
    "sad":       dict(brow_raise=0.25, brow_angle=-0.9, lid=0.25, smile=-0.5, look=(0, 0.4)),
    "worried":   dict(brow_raise=0.35, brow_angle=-0.7, lid=0.05, smile=-0.35),
    "calm_smirk": dict(lid=0.35, smile=0.35, brow_angle=0.15, brow_asym=0.3),
}


def emotion(name, **over):
    d = dict(EMOTIONS[name])
    d.update(over)
    return d


def blend_emotions(a, b, t):
    keys = set(a) | set(b)
    out = {}
    for k in keys:
        va, vb = a.get(k, DEFAULTS.get(k, 0.0)), b.get(k, DEFAULTS.get(k, 0.0))
        if isinstance(va, tuple):
            out[k] = tuple(lerp(x, y, t) for x, y in zip(va, vb))
        else:
            out[k] = lerp(va, vb, t)
    return out


DEFAULTS = dict(
    x=0.0, y=0.0, s=1.0, bt=0.0, lean=0.0, ht=0.0, tilt=0.0, nod=0.0, hdx=0.0, hdy=0.0,
    look=(0.0, 0.0), blink=0.0, lid=0.0, lid_angle=0.0, squint=0.0, pupil_k=1.0,
    brow_raise=0.0, brow_angle=0.0, brow_asym=0.0,
    mouth_open=0.0, smile=0.0, mouth_w=1.0,
    sit=0.0, step=0.0, squash=0.0, breath=0.0,
    hand_a=None, hand_b=None, elbow_a=1, elbow_b=-1,
    phone=None, phone_rot=0.0, phone_glow=0.0,
    back=False, alpha=1.0, key=(-0.45, -0.55), rim_dir=(1.0, -0.2), rim_k=1.0,
    uplight=0.0, uplight_col="#bcd8ff", warm=0.0, rim_col=None, glow_k=1.0,
)


def _ik(sx, sy, tx, ty, l1, l2, bend):
    dx, dy = tx - sx, ty - sy
    d = math.hypot(dx, dy)
    d = clamp(d, abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3)
    base = math.atan2(dy, dx)
    cosa = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)
    a = base + bend * math.acos(cosa)
    ex, ey = sx + l1 * math.cos(a), sy + l1 * math.sin(a)
    # recompute hand to respect reach
    hx, hy = sx + dx / max(math.hypot(dx, dy), 1e-6) * d, sy + dy / max(math.hypot(dx, dy), 1e-6) * d
    return ex, ey, hx, hy


class Rig:
    def __init__(self, style):
        self.name = style
        self.st = STYLES[style]

    # ------------------------------------------------------------------ geometry
    def _geom(self, P):
        st = self.st
        R = 100.0 * P["s"] * st["height"]
        bt = P["bt"]
        g = dict(R=R)
        sq = 1.0 + P["squash"]
        torso_h = 1.25 * R * sq * (1 + 0.012 * math.sin(P["breath"] * 2 * math.pi))
        g["torso_h"] = torso_h
        g["sw"] = 0.56 * R * (1 - 0.42 * abs(bt))
        g["hw"] = 0.44 * R * (1 - 0.35 * abs(bt))
        g["cx"] = -bt * 0.05 * R
        g["neck"] = (g["cx"] + bt * 0.06 * R, -torso_h - 0.05 * R)
        hx = g["neck"][0] + P["hdx"] * R + bt * 0.12 * R
        hy = g["neck"][1] - 0.12 * R - 1.0 * R + P["hdy"] * R
        g["head"] = (hx, hy)
        return g

    # ------------------------------------------------------------------ public
    def draw(self, canvas, pose, passes=("legs", "body", "head", "arms")):
        P = dict(DEFAULTS)
        P.update(pose)
        if P["alpha"] <= 0.003:
            return
        canvas.save()
        canvas.translate(P["x"], P["y"])
        layered = P["alpha"] < 0.999
        if layered:
            canvas.saveLayerAlpha(None, int(255 * P["alpha"]))
        g = self._geom(P)
        for ps in passes:
            if ps == "legs":
                self._legs(canvas, P, g)
            elif ps == "body":
                canvas.save()
                canvas.rotate(P["lean"])
                self._arm(canvas, P, g, far=True)
                self._torso(canvas, P, g)
                canvas.restore()
            elif ps == "head":
                canvas.save()
                canvas.rotate(P["lean"])
                self._head(canvas, P, g)
                canvas.restore()
            elif ps == "arms":
                canvas.save()
                canvas.rotate(P["lean"])
                self._arm(canvas, P, g, far=False)
                canvas.restore()
            elif ps == "farm":
                canvas.save()
                canvas.rotate(P["lean"])
                self._arm(canvas, P, g, far=True)
                canvas.restore()
            elif ps == "torso":
                canvas.save()
                canvas.rotate(P["lean"])
                self._torso(canvas, P, g)
                canvas.restore()
        if layered:
            canvas.restore()
        canvas.restore()

    def head_pos(self, pose):
        P = dict(DEFAULTS)
        P.update(pose)
        g = self._geom(P)
        hx, hy = g["head"]
        a = math.radians(P["lean"])
        rx, ry = hx * math.cos(a) - hy * math.sin(a), hx * math.sin(a) + hy * math.cos(a)
        return P["x"] + rx, P["y"] + ry, g["R"]

    def shoulder_pos(self, pose, side="a"):
        P = dict(DEFAULTS)
        P.update(pose)
        g = self._geom(P)
        sx, sy = self._shoulder(P, g, side)
        a = math.radians(P["lean"])
        return (P["x"] + sx * math.cos(a) - sy * math.sin(a), P["y"] + sx * math.sin(a) + sy * math.cos(a), g["R"])

    # ------------------------------------------------------------------ parts
    def _legs(self, c, P, g):
        st, R, bt = self.st, g["R"], P["bt"]
        th = math.radians(bt * 80)
        fwd = math.sin(th)
        face = 1 if bt >= 0 else -1
        for side in ("far", "near"):
            # screen offset of the hip: in profile the far leg sits slightly towards the facing direction
            if abs(bt) > 0.05:
                off = (face if side == "far" else -face) * g["hw"] * 0.5
            else:
                off = (-1 if side == "far" else 1) * g["hw"] * 0.55
            hx, hy = g["cx"] + off, 0.0
            k = 1.0 if side == "near" else 0.78
            colc = shade(hexc(st["pants"]), k)
            p = skia.Path()
            p.moveTo(hx, hy)
            if P["sit"] > 0.5:
                kx = hx + fwd * 0.95 * R + (1 - abs(fwd)) * off * 0.5
                ky = hy + 0.1 * R + (1 - abs(fwd)) * 0.22 * R
                fx, fy = kx + fwd * 0.06 * R, ky + 0.98 * R
                p.lineTo(kx, ky)
                p.lineTo(fx, fy)
            else:
                stp = P["step"] * (1 if side == "near" else -0.35)
                kx = hx + fwd * 0.1 * R + stp * 0.22 * R
                ky = 0.93 * R
                fx, fy = hx + stp * 0.42 * R, 1.86 * R
                p.quadTo(kx, ky, fx, fy)
            c.drawPath(p, stroke(colc, 0.25 * R))
            # shoe: longer when seen from the side
            shoe = shade(hexc(st["shoes"]), 1.0 if side == "near" else 0.85)
            if abs(fwd) > 0.15:
                sl = 0.4 * R
                x0 = fx - sl * 0.3 if fwd > 0 else fx - sl * 0.7
            else:
                sl = 0.3 * R
                x0 = fx - sl / 2
            rect = skia.Rect.MakeXYWH(x0, fy - 0.07 * R, sl, 0.18 * R)
            c.drawRRect(skia.RRect.MakeRectXY(rect, 0.09 * R, 0.09 * R), fill(shoe))
            c.drawLine(rect.left() + 0.04 * R, rect.bottom() - 0.02 * R, rect.right() - 0.04 * R,
                       rect.bottom() - 0.02 * R, stroke(hexc(st["shoe_sole"]), 0.035 * R))

    def _shoulder(self, P, g, side):
        R, bt = g["R"], P["bt"]
        sgn = -1 if side == "a" else 1
        x = g["cx"] + sgn * g["sw"]
        # depth: far shoulder tucks behind
        near = (side == "a" and bt > 0.05) or (side == "b" and bt < -0.05)
        far = (side == "b" and bt > 0.05) or (side == "a" and bt < -0.05)
        if far:
            x -= sgn * abs(bt) * 0.18 * R
        if near:
            x += sgn * abs(bt) * 0.02 * R
        return x, -g["torso_h"] + 0.12 * R

    def _arm(self, c, P, g, far):
        st, R, bt = self.st, g["R"], P["bt"]
        for side in ("a", "b"):
            is_near = (side == "a" and bt > 0.05) or (side == "b" and bt < -0.05)
            is_far = (side == "b" and bt > 0.05) or (side == "a" and bt < -0.05)
            if far and not is_far:
                continue
            if not far and is_far:
                continue
            sx, sy = self._shoulder(P, g, side)
            tgt = P["hand_" + side]
            sgn = -1 if side == "a" else 1
            if tgt is None:
                tx, ty = sx + sgn * 0.1 * R, sy + 1.62 * R
            else:
                tx, ty = tgt[0] * R, tgt[1] * R
            bend = P["elbow_" + side]
            ex, ey, hx, hy = _ik(sx, sy, tx, ty, 0.88 * R, 0.82 * R, bend)
            k = 0.72 if is_far else 1.0
            sleeve = shade(hexc(st["top"]), k)
            if st.get("cardigan"):
                sleeve = shade(hexc(st["cardigan"]), k)
            p = skia.Path()
            p.moveTo(sx, sy)
            p.lineTo(ex, ey)
            p.lineTo(hx, hy)
            c.drawPath(p, stroke(sleeve, 0.27 * R))
            # cuff
            ux, uy = hx - ex, hy - ey
            n = math.hypot(ux, uy) or 1
            cx_, cy_ = hx - ux / n * 0.13 * R, hy - uy / n * 0.13 * R
            c.drawLine(cx_, cy_, hx - ux / n * 0.05 * R, hy - uy / n * 0.05 * R,
                       stroke(shade(sleeve, 0.7), 0.27 * R, cap="butt"))
            if P["phone"] == side:
                self._phone(c, P, hx, hy, R)
            hand = shade(hexc(st["skin_hand"]), 0.82 if is_far else 1.0)
            c.drawCircle(hx, hy, 0.13 * R, fill(hand))
            if P["phone"] == side:
                # thumb over the phone edge
                c.drawCircle(hx + 0.1 * R, hy - 0.08 * R, 0.07 * R, fill(hand))

    def _phone(self, c, P, hx, hy, R):
        c.save()
        c.translate(hx, hy - 0.05 * R)
        c.rotate(P["phone_rot"])
        w, h = 0.36 * R, 0.68 * R
        r = skia.Rect.MakeXYWH(-w / 2, -h * 0.75, w, h)
        c.drawRRect(skia.RRect.MakeRectXY(r, 0.06 * R, 0.06 * R), fill(hexc("#0c0d12")))
        c.drawRRect(skia.RRect.MakeRectXY(r, 0.06 * R, 0.06 * R), stroke(hexc("#3a3f4c"), 0.02 * R))
        if P["phone_glow"] > 0:
            g = P["phone_glow"]
            inner = skia.Rect.MakeXYWH(-w / 2 + 0.025 * R, -h * 0.75 + 0.025 * R, w - 0.05 * R, h - 0.05 * R)
            c.drawRRect(skia.RRect.MakeRectXY(inner, 0.04 * R, 0.04 * R), fill(with_alpha(hexc("#cfe2ff"), 0.85 * g)))
        c.restore()

    def _torso(self, c, P, g):
        st, R, bt = self.st, g["R"], P["bt"]
        th = g["torso_h"]
        cx = g["cx"]
        sw, hw = g["sw"], g["hw"]
        top = hexc(st["top"])
        p = skia.Path()
        p.moveTo(cx - sw, -th + 0.18 * R)
        p.quadTo(cx - sw, -th, cx - sw + 0.2 * R, -th - 0.02 * R)
        p.lineTo(cx + sw - 0.2 * R, -th - 0.02 * R)
        p.quadTo(cx + sw, -th, cx + sw, -th + 0.18 * R)
        p.quadTo(cx + sw + 0.04 * R, -0.4 * R, cx + hw, -0.02 * R)
        p.quadTo(cx, 0.1 * R, cx - hw, -0.02 * R)
        p.quadTo(cx - sw - 0.04 * R, -0.4 * R, cx - sw, -th + 0.18 * R)
        p.close()
        kx, ky = P["key"]
        sh = linear(cx + kx * sw, -th, cx - kx * sw, 0, [shade(top, 1.18), top, hexc(st["top_dark"])], [0, 0.5, 1])
        c.drawPath(p, fill(top, shader=sh))
        # hem band
        c.save()
        c.clipPath(p, doAntiAlias=True)
        c.drawRect(skia.Rect.MakeLTRB(cx - sw - R, -0.16 * R, cx + sw + R, 0.2 * R), fill(hexc(st["top_dark"])))
        if st.get("cardigan") and not P["back"]:
            card = hexc(st["cardigan"])
            for sgn in (-1, 1):
                q = path_poly([(cx + sgn * sw * 1.1, -th - 0.1 * R), (cx + sgn * 0.12 * R * (1 - abs(bt)), -th + 0.05 * R),
                               (cx + sgn * 0.22 * R * (1 - abs(bt)), 0.2 * R), (cx + sgn * sw * 1.3, 0.2 * R)])
                c.drawPath(q, fill(card))
        if st.get("apron") and not P["back"]:
            ap = hexc(st["apron"])
            c.drawRRect(rrect_(cx - hw * 0.8, -th * 0.62, hw * 1.6, th * 0.75, 0.1 * R), fill(ap))
            c.drawLine(cx - hw * 0.6, -th * 0.62, cx - sw * 0.6, -th, stroke(ap, 0.05 * R))
            c.drawLine(cx + hw * 0.6, -th * 0.62, cx + sw * 0.6, -th, stroke(ap, 0.05 * R))
        if st.get("zipper") and not P["back"] and abs(bt) < 0.7:
            c.drawLine(cx + bt * 0.2 * R, -th, cx + bt * 0.2 * R, 0.1 * R, stroke(shade(top, 0.7), 0.03 * R))
        # kangaroo pocket
        if st["hood"] and not P["back"] and abs(bt) < 0.75:
            pk = skia.Path()
            pw = hw * 0.75
            pcx = cx + bt * 0.15 * R
            pk.moveTo(pcx - pw, -0.18 * R)
            pk.lineTo(pcx - pw * 0.75, -0.55 * R)
            pk.lineTo(pcx + pw * 0.75, -0.55 * R)
            pk.lineTo(pcx + pw, -0.18 * R)
            c.drawPath(pk, stroke(shade(top, 0.72), 0.03 * R))
        c.restore()
        # hood behind neck / on back
        if st["hood"] and not st.get("hood_up"):
            hood = shade(top, 0.82)
            if P["back"]:
                hp = skia.Path()
                hp.addOval(skia.Rect.MakeXYWH(cx - 0.42 * R, -th - 0.12 * R, 0.84 * R, 0.62 * R))
                c.drawPath(hp, fill(hood))
                c.drawPath(hp, stroke(shade(top, 0.6), 0.03 * R))
            else:
                hp = skia.Path()
                hcx = cx - bt * 0.25 * R
                hp.addOval(skia.Rect.MakeXYWH(hcx - 0.5 * R, -th - 0.2 * R, 1.0 * R, 0.42 * R))
                c.drawPath(hp, fill(hood))
            if st["strings"] and not P["back"] and abs(bt) < 0.7:
                det = hexc(st["top_detail"])
                for sgn in (-1, 1):
                    x0 = cx + bt * 0.2 * R + sgn * 0.13 * R
                    c.drawLine(x0, -th + 0.05 * R, x0 + sgn * 0.02 * R, -th + 0.42 * R, stroke(det, 0.035 * R))
                    c.drawCircle(x0 + sgn * 0.02 * R, -th + 0.45 * R, 0.035 * R, fill(det))
        # neck
        nx, ny = g["neck"]
        c.drawLine(nx, ny + 0.08 * R, nx, ny - 0.14 * R, stroke(hexc(st["skin_hand"]), 0.2 * R))

    def _head(self, c, P, g):
        st, R = self.st, g["R"]
        hx, hy = g["head"]
        ht = clamp(P["ht"], -1, 1)
        c.save()
        c.translate(hx, hy)
        c.rotate(P["tilt"])
        base, hi, edge = hexc(st["head"]), hexc(st["head_hi"]), hexc(st["head_edge"])
        if P["warm"] > 0:
            hi = mix(hi, hexc("#ffb36b"), 0.35 * P["warm"])
        kx, ky = P["key"]
        # glow aura (double / operator)
        if st["glow"] and P["glow_k"] > 0:
            c.drawCircle(0, 0, R * 1.5, fill(0, shader=radial(0, 0, R * 1.5, [with_alpha(hexc(st["glow"]), 0.28 * P["glow_k"]),
                                                                         with_alpha(hexc(st["glow"]), 0.0)])))
        # back-of-head hair parts
        if st.get("bun"):
            bx = -ht * 0.55 * R
            by = -0.78 * R if not P["back"] else -0.55 * R
            c.drawCircle(bx, by, 0.42 * R, fill(hexc(st["hair"])))
            c.drawCircle(bx - 0.1 * R, by - 0.12 * R, 0.2 * R, fill(with_alpha(hexc(st["hair_hi"]), 0.5), blur=0.08 * R))
        if st.get("ponytail"):
            px = -ht * 0.95 * R - (0.0 if abs(ht) > 0.2 else 0.0)
            pp = skia.Path()
            side = -1 if ht >= 0 else 1
            pp.moveTo(px + side * 0.2 * R, -0.55 * R)
            pp.cubicTo(px + side * 1.2 * R, -0.7 * R, px + side * 1.1 * R, 0.3 * R, px + side * 0.75 * R, 0.55 * R)
            pp.cubicTo(px + side * 0.85 * R, 0.1 * R, px + side * 0.6 * R, -0.3 * R, px + side * 0.05 * R, -0.3 * R)
            pp.close()
            c.drawPath(pp, fill(hexc(st["hair"])))
            c.drawCircle(px + side * 0.25 * R, -0.5 * R, 0.1 * R, fill(hexc("#ff6b8a")))
        # skull
        sh = radial(kx * R * 0.55, ky * R * 0.55, R * 1.55, [hi, base, edge], [0.0, 0.5, 1.0])
        c.drawCircle(0, 0, R, fill(base, shader=sh))
        # hood up (operator)
        if st.get("hood_up"):
            hp = skia.Path()
            hp.addCircle(0, 0, R * 1.18)
            hole = skia.Path()
            hole.addOval(skia.Rect.MakeXYWH(-0.82 * R + ht * 0.3 * R, -0.62 * R, 1.64 * R, 1.5 * R))
            hp.setFillType(skia.PathFillType.kEvenOdd)
            hp.addPath(hole)
            c.drawPath(hp, fill(hexc(st["top"])))
            c.drawCircle(0, 0, R * 1.18, stroke(with_alpha(hexc(st["rim"]), 0.5), 0.03 * R))
        # uplight from phone / screen
        if P["uplight"] > 0:
            c.save()
            cp = skia.Path()
            cp.addCircle(0, 0, R)
            c.clipPath(cp, doAntiAlias=True)
            col = hexc(P["uplight_col"])
            c.drawCircle(ht * 0.3 * R, R * 1.15, R * 1.5,
                         fill(0, shader=radial(ht * 0.3 * R, R * 1.15, R * 1.5,
                                               [with_alpha(col, 0.55 * P["uplight"]), with_alpha(col, 0)]),
                              blend=skia.BlendMode.kScreen))
            c.restore()
        # rim light
        rdx, rdy = P["rim_dir"]
        rk = st["rim_k"] * P["rim_k"]
        rim = hexc(P["rim_col"]) if P["rim_col"] else hexc(st["rim"])
        if rk > 0:
            n = math.hypot(rdx, rdy) or 1
            rdx, rdy = rdx / n, rdy / n
            shr = linear(-rdx * R, -rdy * R, rdx * R, rdy * R,
                         [with_alpha(rim, 0), with_alpha(rim, 0.0), with_alpha(rim, min(1, 0.95 * rk))], [0, 0.45, 1])
            c.drawCircle(0, 0, R - 0.03 * R, stroke(rim, 0.07 * R, shader=shr, blur=0.012 * R))
            c.drawCircle(0, 0, R + 0.02 * R, stroke(rim, 0.07 * R, shader=shr, blur=0.07 * R))
        # mom/girl/barista hair cap & accessories over skull
        if st.get("hair") and not P["back"]:
            self._hair_front(c, P, R, ht)
        if st.get("hair") and P["back"]:
            c.drawCircle(0, 0, R * 1.01, fill(hexc(st["hair"])))
        if st.get("cap"):
            self._cap(c, P, R, ht)
        if st.get("headphones"):
            hpc = hexc(st["headphones"])
            c.drawArc(skia.Rect.MakeXYWH(-1.08 * R, -1.12 * R, 2.16 * R, 2.0 * R), 195, 150, False,
                      stroke(hpc, 0.12 * R))
            for sgn in (-1, 1):
                ex = sgn * (0.98 - 0.25 * max(0, sgn * ht)) * R
                c.drawRRect(rrect_(ex - 0.17 * R, -0.25 * R, 0.34 * R, 0.5 * R, 0.12 * R), fill(hpc))
                c.drawCircle(ex, 0, 0.06 * R, fill(hexc("#3aa0ff")))
        if not P["back"]:
            self._face(c, P, R, ht)
        c.restore()

    def _hair_front(self, c, P, R, ht):
        st = self.st
        hair = hexc(st["hair"])
        c.save()
        cp = skia.Path()
        cp.addCircle(0, 0, R * 1.02)
        c.clipPath(cp, doAntiAlias=True)
        hp = skia.Path()
        o = ht * 0.5 * R
        hp.moveTo(-1.2 * R, 0.1 * R)
        hp.lineTo(-1.2 * R, -1.2 * R)
        hp.lineTo(1.2 * R, -1.2 * R)
        hp.lineTo(1.2 * R, 0.1 * R)
        if st.get("bangs"):
            hp.cubicTo(0.9 * R + o, -0.25 * R, 0.4 * R + o, -0.45 * R, o + 0.1 * R, -0.42 * R)
            hp.cubicTo(-0.3 * R + o, -0.38 * R, -0.8 * R + o, -0.3 * R, -1.2 * R, 0.1 * R)
        else:
            hp.cubicTo(0.95 * R + o * 0.6, -0.55 * R, 0.5 * R + o, -0.62 * R, o, -0.5 * R)
            hp.cubicTo(-0.5 * R + o, -0.62 * R, -0.95 * R + o * 0.6, -0.55 * R, -1.2 * R, 0.1 * R)
        hp.close()
        c.drawPath(hp, fill(hair))
        c.drawPath(hp, fill(0, shader=radial(-0.35 * R, -0.75 * R, 0.7 * R, [with_alpha(hexc(st["hair_hi"]), 0.7),
                                                                          with_alpha(hexc(st["hair_hi"]), 0)])))
        # parting line
        c.drawLine(o * 0.9, -0.52 * R, o * 0.3, -1.05 * R, stroke(shade(hair, 0.75), 0.025 * R))
        c.restore()

    def _cap(self, c, P, R, ht):
        st = self.st
        cap, dark = hexc(st["cap"]), hexc(st["cap_dark"])
        c.save()
        cp = skia.Path()
        cp.addCircle(0, 0, R * 1.03)
        c.clipPath(cp, doAntiAlias=True)
        c.drawRect(skia.Rect.MakeLTRB(-1.2 * R, -1.2 * R, 1.2 * R, -0.42 * R), fill(cap))
        c.drawLine(-1.2 * R, -0.42 * R, 1.2 * R, -0.42 * R, stroke(dark, 0.05 * R))
        c.restore()
        bx = ht * 0.75 * R
        brim = skia.Path()
        dirx = 1 if ht >= 0 else -1
        w = 0.9 * R * (1 - 0.3 * abs(ht))
        brim.addOval(skia.Rect.MakeXYWH(bx - w + dirx * abs(ht) * 0.45 * R, -0.52 * R, 2 * w, 0.24 * R))
        c.drawPath(brim, fill(dark))
        c.drawCircle(0, -1.0 * R, 0.07 * R, fill(dark))

    def _face(self, c, P, R, ht):
        st = self.st
        nod = P["nod"]
        fx = ht * 0.48 * R
        fy = nod * 0.18 * R
        lx, ly = P["look"]
        blink = P["blink"]
        lid_base = st["lid_base"]
        for side in (-1, 1):
            # side -1 = screen-left eye
            far = (side < 0 and ht > 0) or (side > 0 and ht < 0)
            k = 1 - 0.38 * abs(ht) if far else 1 + 0.06 * abs(ht)
            if far and abs(ht) > 0.88:
                continue
            ex = fx + side * st["eye_dx"] * R * (1 - 0.35 * abs(ht)) - ht * 0.0
            ey = fy + st["eye_y"] * R
            rx, ry = st["eye_rx"] * R * k, st["eye_ry"] * R
            if st.get("eye_glow"):
                c.drawOval(skia.Rect.MakeXYWH(ex - rx * 1.8, ey - ry * 2.2, rx * 3.6, ry * 4.4),
                           fill(0, shader=radial(ex, ey, rx * 2, [with_alpha(hexc(st["eye_glow"]), 0.6),
                                                                  with_alpha(hexc(st["eye_glow"]), 0)])))
            ell = skia.Path()
            ell.addOval(skia.Rect.MakeXYWH(ex - rx, ey - ry, 2 * rx, 2 * ry))
            # lids carve the eye shape (so the shaded skull shows through, no seams)
            lid = clamp(lid_base + P["lid"], 0, 1)
            lid = max(lid, blink)
            ang = math.radians(P["lid_angle"]) * (-side)
            yl = ey - ry + 2 * ry * lid
            dy = math.tan(ang) * rx
            eye = ell
            if lid > 0.001:
                lp = path_poly([(ex - rx * 1.4, ey - ry * 1.6), (ex + rx * 1.4, ey - ry * 1.6),
                                (ex + rx * 1.4, yl + dy * 1.4), (ex - rx * 1.4, yl - dy * 1.4)])
                eye = skia.Op(eye, lp, skia.PathOp.kDifference_PathOp) or eye
            sq = clamp(P["squint"], 0, 1)
            if sq > 0.001:
                yb = ey + ry - 2 * ry * sq * 0.9
                bp = skia.Path()
                bp.moveTo(ex - rx * 1.4, ey + ry * 1.6)
                bp.lineTo(ex - rx * 1.4, yb + ry * 0.25)
                bp.quadTo(ex, yb - ry * 0.25, ex + rx * 1.4, yb + ry * 0.25)
                bp.lineTo(ex + rx * 1.4, ey + ry * 1.6)
                bp.close()
                eye = skia.Op(eye, bp, skia.PathOp.kDifference_PathOp) or eye
            if lid >= 0.985:
                eye = skia.Path()
            c.save()
            c.clipPath(eye, doAntiAlias=True)
            c.drawPath(ell, fill(hexc(st["eye"])))
            px = ex + lx * rx * 0.48
            py = ey + ly * ry * 0.42 + 0.05 * ry
            pk = P["pupil_k"]
            if st.get("iris"):
                ir = st["iris_r"] * R * pk ** 0.5
                c.drawCircle(px, py, ir, fill(hexc(st["iris"])))
                if self.name == "double":
                    c.drawCircle(px, py, ir * 1.6, fill(with_alpha(hexc(st["iris"]), 0.35), blur=ir * 0.5))
                c.drawCircle(px, py, ir * 0.48, fill(hexc(st["pupil"])))
                c.drawCircle(px - ir * 0.35, py - ir * 0.4, ir * 0.22, fill(hexc("#ffffff")))
            elif st.get("pupil"):
                pr = 0.105 * R * pk
                c.drawCircle(px, py, pr, fill(hexc(st["pupil"])))
                c.drawCircle(px - pr * 0.35, py - pr * 0.4, pr * 0.3, fill(hexc("#ffffff")))
            # soft inner shadow under the lid gives the eye volume
            c.drawPath(ell, stroke(with_alpha(hexc("#000000"), 0.18), 0.05 * R, blur=0.03 * R))
            c.restore()
            if st.get("lashes"):
                if lid >= 0.97:
                    c.drawLine(ex - rx, ey + ry * 0.4, ex + rx, ey + ry * 0.4, stroke(hexc(st["lashes"]), 0.04 * R))
                elif lid > 0.001:
                    c.save()
                    c.clipPath(ell, doAntiAlias=True)
                    c.drawLine(ex - rx * 1.4, yl - dy * 1.4, ex + rx * 1.4, yl + dy * 1.4,
                               stroke(hexc(st["lashes"]), 0.05 * R))
                    c.restore()
                else:
                    c.drawArc(skia.Rect.MakeXYWH(ex - rx, ey - ry, 2 * rx, 2 * ry), 200, 140, False,
                              stroke(hexc(st["lashes"]), 0.035 * R))
            # brows
            if st.get("brow"):
                raise_ = P["brow_raise"] + (P["brow_asym"] * 0.5 if side > 0 else -P["brow_asym"] * 0.15)
                by = ey - ry - 0.07 * R - raise_ * 0.16 * R + lid_base * 0.35 * ry
                inner = -side  # inner end direction (towards centre)
                ang_off = P["brow_angle"] * 0.11 * R
                bw = 0.23 * R * k
                x_in, x_out = ex + inner * bw * 0.85, ex - inner * bw * 1.15
                y_in = by + ang_off
                y_out = by - ang_off * 0.4
                bp = skia.Path()
                bp.moveTo(x_out, y_out)
                bp.quadTo(ex, min(y_in, y_out) - 0.06 * R, x_in, y_in)
                if st.get("brow_edge"):
                    c.drawPath(bp, stroke(with_alpha(hexc(st["brow_edge"]), 0.9), 0.13 * R))
                c.drawPath(bp, stroke(hexc(st["brow"]), 0.1 * R))
        # cheeks
        if st.get("blush"):
            for side in (-1, 1):
                far = (side < 0 and ht > 0) or (side > 0 and ht < 0)
                if far and abs(ht) > 0.7:
                    continue
                bx = fx + side * 0.52 * R * (1 - 0.35 * abs(ht))
                c.drawCircle(bx, fy + 0.35 * R, 0.14 * R, fill(with_alpha(hexc(st["blush"]), 0.28), blur=0.06 * R))
        # mouth
        if st.get("mouth_line"):
            self._mouth(c, P, R, fx, fy)

    def _mouth(self, c, P, R, fx, fy):
        st = self.st
        mo = clamp(P["mouth_open"], 0, 1)
        sm = clamp(P["smile"], -1, 1)
        w = 0.2 * R * P["mouth_w"] * (1 + 0.25 * sm) * (1 - 0.25 * mo)
        mx, my = fx * 1.05, fy + 0.5 * R
        curve = sm * 0.09 * R
        line = hexc(st["mouth_line"])
        if mo < 0.04:
            p = skia.Path()
            p.moveTo(mx - w, my - curve * 0.5)
            p.quadTo(mx, my + curve, mx + w, my - curve * 0.5)
            c.drawPath(p, stroke(line, 0.045 * R))
            return
        h = mo * 0.26 * R
        p = skia.Path()
        p.moveTo(mx - w, my - curve * 0.5)
        p.quadTo(mx, my - h * 0.35 + curve * 0.6, mx + w, my - curve * 0.5)
        p.quadTo(mx, my + h + curve, mx - w, my - curve * 0.5)
        p.close()
        c.drawPath(p, fill(hexc(st["mouth_in"])))
        c.save()
        c.clipPath(p, doAntiAlias=True)
        if mo > 0.3:
            c.drawRect(skia.Rect.MakeLTRB(mx - w, my - h, mx + w, my - h * 0.35 + curve * 0.6 + 0.045 * R),
                       fill(hexc("#f2f2f2")))
        c.drawCircle(mx, my + h * 0.95 + curve, w * 0.7, fill(hexc("#c2545e")))
        c.restore()
        c.drawPath(p, stroke(line, 0.04 * R))


def rrect_(x, y, w, h, r):
    return skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x, y, w, h), r, r)


RIGS = {k: Rig(k) for k in STYLES}
