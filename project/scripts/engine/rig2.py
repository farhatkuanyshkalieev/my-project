"""Rig v2 — «concept» look, matched to the approved key art and the AI reference sheets
(references/concept/original_concept.png, references/v2/ai_canva/*_turnaround_canva_v1.png).

Same pose parameters as engine/rig.py (so all staging/animation code is reusable); only the design changes:
  * matte black head, crisp warm rim + bloom (rim colour comes from the scene light), hair fringe lines + tuft
  * white glowing eyes in the lower half of the head, flat heavy upper lids, small pupils
  * thin WHITE eyebrow lines, small dark frown mouth
  * black shirt with collar + beige tie (double: red rim, glowing white/red eyes, dark-red tie)
  * black gloved hands with fingers; dress shoes
  * Mom: porcelain face, dark-brown bun + side locks + ears, anime eyes with lashes, beige top + charcoal apron
"""
import math

import skia

from .core import clamp, lerp, hexc, mix, with_alpha, shade, fill, stroke, radial, linear, path_poly
from .rig import Rig, DEFAULTS, _ik, rrect_

CONCEPT = {
    "arman": dict(
        kind="stick", head=("#1a1918", "#0f0e0e", "#050505"), rim="#8fb8ff", rim_k=1.0,
        eye="#f6f3ec", eye_glow=0.18, eye_rx=0.31, eye_ry=0.25, eye_dx=0.36, eye_y=0.16, lid_base=0.16,
        lid_angle=16.0, pupil="#050505", pupil_r=0.115, iris=None,
        brow="#ece9e2", brow_w=0.075, brow_edge=None, mouth="#4a3f3b", mouth_in="#2a0c0e",
        hair_lines="#302d2b", tuft=True,
        shirt="#151414", shirt_hi="#2a2827", collar="#262423", tie="#b9a07c", tie_dark="#8d7657",
        pants="#121111", shoes="#0b0b0b", hand="#121111", height=1.0, glow=None),
    "double": dict(
        kind="stick", head=("#1e1414", "#110b0b", "#050303"), rim="#ff2a2a", rim_k=1.5,
        eye="#fff4f0", eye_glow=1.0, eye_glow_col="#ff2020", eye_rx=0.31, eye_ry=0.24, eye_dx=0.37, eye_y=0.2,
        lid_base=0.33, lid_angle=17.0, pupil=None, pupil_r=0.0, iris="#ff3a3a",
        brow="#1a0606", brow_w=0.05, brow_edge="#ff3030", mouth="#5a1c1c", mouth_in="#1a0304",
        hair_lines="#2a1414", tuft=True,
        shirt="#120d0d", shirt_hi="#2a1414", collar="#201414", tie="#8e1219", tie_dark="#5a0a0f",
        pants="#0f0b0b", shoes="#090707", hand="#100c0c", height=1.0, glow="#ff1a1a"),
    "mom": dict(   # SERIES STANDARD (v3): stickman 2.5D geometry, recognisable porcelain face + bun + apron
        kind="mom", head=("#e2cdb9", "#cdb39d", "#94735c"), rim="#ffd9a6", rim_k=0.75,
        eye="#fbf8f2", eye_rx=0.28, eye_ry=0.245, eye_dx=0.36, eye_y=0.16, lid_base=0.12, lid_angle=-5.0,
        iris="#5a3420", iris_r=0.125, pupil="#140906", lashes=None, lid_line="#2a1810",
        brow="#3a2418", brow_w=0.05, mouth="#8a4a3e", mouth_in="#4a1616", blush="#ff9c8c",
        hair="#33221a", hair_hi="#5a3e2e", ear=None, hair_strands=False,
        shirt="#4a3c38", shirt_hi="#655049", apron="#24202a", apron_hi="#3a3440",
        pants="#1d1a1c", shoes="#2a2324", hand="#cdb39d", height=0.97, glow=None),
    "mom_ep1": dict(
        kind="mom", head=("#e8d6c6", "#d9c3b0", "#a88a74"), rim="#ffd29a", rim_k=0.45,
        eye="#ffffff", eye_rx=0.2, eye_ry=0.25, eye_dx=0.33, eye_y=0.12, lid_base=0.06, lid_angle=0.0,
        iris="#3a2219", iris_r=0.16, pupil="#120806", lashes="#24140e",
        brow="#4a3026", brow_w=0.035, mouth="#9a5a4c", mouth_in="#5a1f1f", blush="#ff9c8c",
        hair="#3b2820", hair_hi="#5e4234", ear="#ead6c6",
        shirt="#b9ab9c", shirt_hi="#cfc2b4", apron="#2f2b2f", apron_hi="#47424a",
        pants="#3a3436", shoes="#cfc3b6", hand="#d9c3b0", height=0.97, glow=None),
}


class ConceptRig(Rig):
    def __init__(self, name):
        self.name = name
        self.cs = CONCEPT[name]
        # keep a style dict compatible with the base class helpers
        self.st = dict(height=self.cs["height"], pants=self.cs["pants"], shoes=self.cs["shoes"],
                       shoe_sole="#2a2a2a" if self.cs["kind"] == "stick" else "#b5a79a",
                       skin_hand=self.cs["hand"], top=self.cs["shirt"], top_dark=self.cs["shirt"],
                       hood=False, strings=False, glow=self.cs.get("glow"))

    # ------------------------------------------------------------------ geometry (slightly broader torso)
    def _geom(self, P):
        g = super()._geom(P)
        R, bt = g["R"], P["bt"]
        g["sw"] = 0.66 * R * (1 - 0.45 * abs(bt))
        g["hw"] = 0.52 * R * (1 - 0.38 * abs(bt))
        # head sits on the collar (short, thick neck as in the key art)
        hx, hy = g["head"]
        g["head"] = (hx, hy + 0.24 * R)
        return g

    def _rim_paint(self, P, R, width, alpha=1.0, blur=0.0, dirv=None):
        cs = self.cs
        rim = hexc(P.get("rim_col") or cs["rim"])
        rdx, rdy = dirv or P["rim_dir"]
        n = math.hypot(rdx, rdy) or 1
        rdx, rdy = rdx / n, rdy / n
        k = min(1.0, cs["rim_k"] * P["rim_k"] * alpha)
        sh = linear(-rdx * R, -rdy * R, rdx * R, rdy * R,
                    [with_alpha(rim, 0.35 * k), with_alpha(rim, 0.55 * k), with_alpha(rim, k)], [0, 0.4, 1])
        return stroke(rim, width, shader=sh, blur=blur)

    # ------------------------------------------------------------------ legs
    def _legs(self, c, P, g):
        cs, R, bt = self.cs, g["R"], P["bt"]
        th = math.radians(bt * 80)
        fwd = math.sin(th)
        face = 1 if bt >= 0 else -1
        for side in ("far", "near"):
            off = ((face if side == "far" else -face) * g["hw"] * 0.5) if abs(bt) > 0.05 else \
                ((-1 if side == "far" else 1) * g["hw"] * 0.4)
            hx = g["cx"] + off
            k = 1.0 if side == "near" else 0.8
            p = skia.Path()
            p.moveTo(hx, 0)
            if P["sit"] > 0.5:
                kx = hx + fwd * 0.95 * R + (1 - abs(fwd)) * off * 0.5
                ky = 0.1 * R + (1 - abs(fwd)) * 0.22 * R
                fx, fy = kx + fwd * 0.06 * R, ky + 0.98 * R
                p.lineTo(kx, ky)
                p.lineTo(fx, fy)
            else:
                stp = P["step"] * (1 if side == "near" else -0.35)
                kx, ky = hx + fwd * 0.1 * R + stp * 0.22 * R, 0.93 * R
                fx, fy = hx + stp * 0.42 * R, 1.86 * R
                p.quadTo(kx, ky, fx, fy)
            c.drawPath(p, stroke(shade(hexc(cs["pants"]), k), 0.42 * R))
            # shoe
            if abs(fwd) > 0.15:
                sl, x0 = 0.5 * R, (fx - 0.5 * R * 0.3 if fwd > 0 else fx - 0.5 * R * 0.7)
            else:
                sl, x0 = 0.42 * R, fx - 0.21 * R
            rect = skia.Rect.MakeXYWH(x0, fy - 0.1 * R, sl, 0.2 * R)
            c.drawRRect(skia.RRect.MakeRectXY(rect, 0.09 * R, 0.08 * R), fill(shade(hexc(cs["shoes"]), k)))
            c.drawLine(rect.left() + 0.06 * R, rect.top() + 0.04 * R, rect.right() - 0.1 * R, rect.top() + 0.04 * R,
                       stroke(with_alpha(hexc("#ffffff"), 0.08 if cs["kind"] == "stick" else 0.3), 0.025 * R))

    # ------------------------------------------------------------------ torso: shirt + collar + tie (stick) / top + apron (mom)
    def _torso(self, c, P, g):
        cs, R, bt = self.cs, g["R"], P["bt"]
        th, cx, sw, hw = g["torso_h"], g["cx"], g["sw"], g["hw"]
        p = skia.Path()
        p.moveTo(cx - sw, -th + 0.2 * R)
        p.quadTo(cx - sw, -th, cx - sw + 0.24 * R, -th - 0.02 * R)
        p.lineTo(cx + sw - 0.24 * R, -th - 0.02 * R)
        p.quadTo(cx + sw, -th, cx + sw, -th + 0.2 * R)
        p.lineTo(cx + hw + 0.02 * R, -0.02 * R)
        p.quadTo(cx, 0.06 * R, cx - hw - 0.02 * R, -0.02 * R)
        p.close()
        base = hexc(cs["shirt"])
        kx, ky = P["key"]
        c.drawPath(p, fill(base, shader=linear(cx + kx * sw, -th, cx - kx * sw, 0,
                                                [hexc(cs["shirt_hi"]), base, shade(base, 0.6)], [0, 0.45, 1])))
        c.save()
        c.clipPath(p, doAntiAlias=True)
        fc = cx + bt * 0.22 * R   # front centre line (moves with body turn)
        if cs["kind"] == "stick":
            # shirt folds + belt
            for sgn in (-1, 1):
                c.drawLine(fc + sgn * 0.3 * R, -th + 0.35 * R, fc + sgn * 0.22 * R, -0.25 * R,
                           stroke(with_alpha(hexc("#000000"), 0.35), 0.03 * R))
            c.drawRect(skia.Rect.MakeLTRB(cx - sw - R, -0.14 * R, cx + sw + R, -0.04 * R), fill(hexc("#070707")))
            if abs(bt) < 0.8 and not P["back"]:
                c.drawRRect(rrect_(fc - 0.07 * R, -0.14 * R, 0.14 * R, 0.1 * R, 0.02 * R),
                            stroke(with_alpha(hexc("#8a7a60"), 0.5), 0.015 * R))
                # placket
                c.drawLine(fc, -th + 0.1 * R, fc, -0.14 * R, stroke(with_alpha(hexc("#000"), 0.5), 0.02 * R))
        else:
            if not P["back"]:
                ap = hexc(cs["apron"])
                aw = hw * 1.05 * (1 - 0.3 * abs(bt))
                apath = path_poly([(fc - aw * 0.75, -th * 0.72), (fc + aw * 0.75, -th * 0.72),
                                   (fc + aw * 1.1, 0.12 * R), (fc - aw * 1.1, 0.12 * R)])
                c.drawPath(apath, fill(ap, shader=linear(fc - aw, 0, fc + aw, 0, [hexc(cs["apron_hi"]), ap, shade(ap, 0.75)])))
                c.drawRRect(rrect_(fc - aw * 0.45, -th * 0.42, aw * 0.9, th * 0.22, 0.05 * R),
                            stroke(with_alpha(hexc("#000"), 0.35), 0.02 * R))
        c.restore()
        # body rim
        c.drawPath(p, self._rim_paint(P, R, 0.035 * R, 0.7, blur=0.01 * R))
        if cs["kind"] == "mom" and not P["back"]:
            ap = hexc(cs["apron"])
            for sgn in (-1, 1):  # apron straps
                c.drawLine(cx + bt * 0.22 * R + sgn * 0.22 * R * (1 - 0.3 * abs(bt)), -th * 0.72,
                           cx + sgn * sw * 0.55, -th + 0.02 * R, stroke(ap, 0.06 * R))
        # collar + tie
        nx, ny = g["neck"]
        if cs["kind"] == "stick" and not P["back"]:
            fc = cx + bt * 0.22 * R
            ct = -th - 0.02 * R
            if abs(bt) < 0.85:
                tie = hexc(cs["tie"])
                knot = path_poly([(fc - 0.055 * R, ct + 0.05 * R), (fc + 0.055 * R, ct + 0.05 * R),
                                  (fc + 0.035 * R, ct + 0.15 * R), (fc - 0.035 * R, ct + 0.15 * R)])
                blade = path_poly([(fc - 0.035 * R, ct + 0.15 * R), (fc + 0.035 * R, ct + 0.15 * R),
                                   (fc + 0.075 * R, -0.42 * R), (fc, -0.3 * R), (fc - 0.075 * R, -0.42 * R)])
                c.drawPath(blade, fill(tie, shader=linear(fc - 0.08 * R, 0, fc + 0.08 * R, 0,
                                                          [shade(tie, 1.12), tie, hexc(cs["tie_dark"])])))
                c.drawPath(knot, fill(hexc(cs["tie_dark"])))
            col = hexc(cs["collar"])
            for sgn in (-1, 1):
                if abs(bt) > 0.6 and sgn == (1 if bt > 0 else -1):
                    pass
                cp = path_poly([(fc + sgn * 0.02 * R, ct + 0.05 * R), (fc + sgn * 0.2 * R, ct - 0.03 * R),
                                (fc + sgn * 0.17 * R, ct + 0.17 * R)])
                c.drawPath(cp, fill(col))
                c.drawPath(cp, stroke(with_alpha(hexc("#000"), 0.6), 0.012 * R))
        elif cs["kind"] == "mom" and not P["back"]:
            c.drawArc(skia.Rect.MakeXYWH(nx - 0.2 * R, -th - 0.12 * R, 0.4 * R, 0.22 * R), 0, 180, False,
                      stroke(hexc(cs["shirt_hi"]), 0.04 * R))
        # neck
        c.drawLine(nx, ny + 0.06 * R, nx, ny - 0.08 * R,
                   stroke(hexc(self.cs["head"][1] if cs["kind"] == "stick" else cs["hand"]), 0.36 * R))

    # ------------------------------------------------------------------ arms with gloved hands + fingers
    def _arm(self, c, P, g, far):
        cs, R, bt = self.cs, g["R"], P["bt"]
        for side in ("a", "b"):
            is_near = (side == "a" and bt > 0.05) or (side == "b" and bt < -0.05)
            is_far = (side == "b" and bt > 0.05) or (side == "a" and bt < -0.05)
            if (far and not is_far) or (not far and is_far):
                continue
            sx, sy = self._shoulder(P, g, side)
            tgt = P["hand_" + side]
            sgn = -1 if side == "a" else 1
            tx, ty = (sx - sgn * 0.06 * R, sy + 1.6 * R) if tgt is None else (tgt[0] * R, tgt[1] * R)
            ex, ey, hx, hy = _ik(sx, sy, tx, ty, 0.88 * R, 0.82 * R, P["elbow_" + side])
            k = 0.72 if is_far else 1.0
            sleeve = shade(hexc(cs["shirt"]), k)
            p = skia.Path()
            p.moveTo(sx, sy)
            p.lineTo(ex, ey)
            p.lineTo(hx, hy)
            c.drawPath(p, stroke(sleeve, 0.29 * R))
            c.drawPath(p, stroke(with_alpha(hexc("#000000"), 0.0), 0.29 * R))
            ux, uy = hx - ex, hy - ey
            n = math.hypot(ux, uy) or 1
            ux, uy = ux / n, uy / n
            if P["phone"] == side:
                self._phone(c, P, hx, hy, R)
            self._hand(c, P, hx, hy, ux, uy, R, k, holding=(P["phone"] == side), side=sgn)

    def _hand(self, c, P, hx, hy, ux, uy, R, k, holding=False, side=1):
        cs = self.cs
        col = shade(hexc(cs["hand"]), k) if cs["kind"] == "stick" else shade(hexc(cs["hand"]), 0.92 + 0.08 * k)
        ang = math.degrees(math.atan2(uy, ux))
        c.save()
        c.translate(hx, hy)
        c.rotate(ang - 90)
        S = 1.75  # glove scale (key art: big mitten-like hands)
        hand = skia.Path()
        hand.addOval(skia.Rect.MakeXYWH(-0.13 * R * S, -0.06 * R * S, 0.26 * R * S, 0.26 * R * S))
        if holding:
            for i in range(4):   # fingers wrapped over the phone edge
                hand.addRRect(rrect_(0.04 * R * S, (-0.12 + i * 0.062) * R * S, 0.14 * R * S, 0.056 * R * S, 0.028 * R * S))
            hand.addRRect(rrect_(-0.2 * R * S, -0.13 * R * S, 0.08 * R * S, 0.19 * R * S, 0.04 * R * S))  # thumb
        else:
            for dx, ln in [(-0.075, 0.13), (-0.025, 0.155), (0.025, 0.15), (0.072, 0.12)]:
                hand.addRRect(rrect_((dx - 0.032) * R * S, 0.08 * R * S, 0.064 * R * S, ln * R * S, 0.032 * R * S))
            hand.addRRect(rrect_((side * 0.12 - 0.035) * R * S, -0.02 * R * S, 0.07 * R * S, 0.15 * R * S, 0.035 * R * S))
        hand.setFillType(skia.PathFillType.kWinding)
        c.drawPath(hand, fill(col))
        if cs["kind"] == "stick":
            c.drawPath(hand, stroke(with_alpha(hexc("#ffffff"), 0.06), 0.012 * R))
        c.restore()

    def _phone(self, c, P, hx, hy, R):
        c.save()
        c.translate(hx, hy - 0.05 * R)
        c.rotate(P["phone_rot"])
        w, h = 0.46 * R, 0.86 * R
        r = skia.Rect.MakeXYWH(-w / 2, -h * 0.78, w, h)
        c.drawRRect(skia.RRect.MakeRectXY(r, 0.06 * R, 0.06 * R), fill(hexc("#0a0b10")))
        c.drawRRect(skia.RRect.MakeRectXY(r, 0.06 * R, 0.06 * R), stroke(hexc("#4a4e5c"), 0.018 * R))
        if P["phone_glow"] > 0:
            gl = P["phone_glow"]
            inner = skia.Rect.MakeXYWH(-w / 2 + 0.025 * R, -h * 0.78 + 0.025 * R, w - 0.05 * R, h - 0.05 * R)
            c.drawRRect(skia.RRect.MakeRectXY(inner, 0.04 * R, 0.04 * R),
                        fill(0, shader=linear(0, inner.top(), 0, inner.bottom(),
                                              [with_alpha(hexc("#cfe0ff"), 0.95 * gl), with_alpha(hexc("#7fa6ff"), 0.85 * gl)])))
            c.drawCircle(0, -h * 0.3, R * 0.9, fill(0, shader=radial(0, -h * 0.3, R * 0.9, [with_alpha(hexc("#9fc0ff"), 0.22 * gl),
                                                                                     with_alpha(hexc("#9fc0ff"), 0)]),
                                                       blend=skia.BlendMode.kPlus))
        c.restore()

    # ------------------------------------------------------------------ head
    def _head(self, c, P, g):
        cs, R = self.cs, g["R"]
        hx, hy = g["head"]
        ht = clamp(P["ht"], -1, 1)
        c.save()
        c.translate(hx, hy)
        c.rotate(P["tilt"])
        if cs.get("glow") and P["glow_k"] > 0:
            c.drawCircle(0, 0, R * 1.55, fill(0, shader=radial(0, 0, R * 1.55, [with_alpha(hexc(cs["glow"]), 0.22 * P["glow_k"]),
                                                                           with_alpha(hexc(cs["glow"]), 0.0)])))
        if cs["kind"] == "mom":
            self._mom_back_hair(c, P, R, ht)
        hi, base, edge = (hexc(x) for x in cs["head"])
        if P["warm"] > 0 and cs["kind"] == "mom":
            hi = mix(hi, hexc("#ffc896"), 0.25 * P["warm"])
        kx, ky = P["key"]
        skull = skia.Path()
        skull.addCircle(0, 0, R)
        if cs.get("tuft") and not P["back"]:
            # side-swept tuft on the top-right silhouette (as in the key art)
            o = -ht * 0.35 * R
            tp = skia.Path()
            tp.moveTo(o + 0.2 * R, -0.97 * R)
            tp.quadTo(o + 0.55 * R, -1.06 * R, o + 0.72 * R, -0.86 * R)
            tp.quadTo(o + 0.6 * R, -0.88 * R, o + 0.66 * R, -0.75 * R)
            tp.close()
            skull = skia.Op(skull, tp, skia.PathOp.kUnion_PathOp) or skull
        c.drawPath(skull, fill(base, shader=radial(kx * R * 0.5, ky * R * 0.5, R * 1.55, [hi, base, edge], [0, 0.5, 1])))
        if cs["kind"] == "stick":
            # very soft specular sheen (matte)
            c.drawCircle(-0.3 * R, -0.42 * R, 0.5 * R, fill(with_alpha(hexc("#ffffff"), 0.035), blur=0.25 * R))
            if not P["back"]:
                self._hair_lines(c, P, R, ht)
        # uplight from the phone screen
        if P["uplight"] > 0:
            c.save()
            c.clipPath(skull, doAntiAlias=True)
            col = hexc(P["uplight_col"])
            c.drawCircle(ht * 0.3 * R, R * 1.2, R * 1.45,
                         fill(0, shader=radial(ht * 0.3 * R, R * 1.2, R * 1.45, [with_alpha(col, 0.32 * P["uplight"]),
                                                                                with_alpha(col, 0)]),
                              blend=skia.BlendMode.kScreen))
            c.restore()
        # rim: crisp line + bloom
        c.drawPath(skull, self._rim_paint(P, R, 0.03 * R, 1.0, blur=0.004 * R))
        c.drawPath(skull, self._rim_paint(P, R, 0.12 * R, 0.55, blur=0.09 * R))
        if cs["kind"] == "mom":
            self._mom_front_hair(c, P, R, ht)
        if not P["back"]:
            self._face(c, P, R, ht)
        c.restore()

    def _hair_lines(self, c, P, R, ht):
        """Side-swept fringe: a darker hair cap whose spiky edge crosses the forehead, edge-lit by the rim."""
        cs = self.cs
        o = -ht * 0.4 * R
        c.save()
        cp = skia.Path()
        cp.addCircle(0, 0, R * 0.997)
        c.clipPath(cp, doAntiAlias=True)
        cap = skia.Path()
        cap.moveTo(-1.1 * R, -0.05 * R)
        cap.lineTo(-1.1 * R, -1.2 * R)
        cap.lineTo(1.1 * R, -1.2 * R)
        cap.lineTo(1.1 * R, -0.25 * R)
        # fringe edge, swept to the viewer's right with three tips
        cap.lineTo(o + 0.88 * R, -0.18 * R)
        cap.quadTo(o + 0.72 * R, -0.36 * R, o + 0.66 * R, -0.5 * R)
        cap.lineTo(o + 0.5 * R, -0.3 * R)
        cap.quadTo(o + 0.38 * R, -0.5 * R, o + 0.22 * R, -0.58 * R)
        cap.quadTo(o - 0.1 * R, -0.62 * R, o - 0.45 * R, -0.7 * R)
        cap.quadTo(o - 0.85 * R, -0.62 * R, -1.1 * R, -0.25 * R)
        cap.close()
        c.drawPath(cap, fill(with_alpha(hexc("#000000"), 0.55)))
        rim = hexc(P.get("rim_col") or cs["rim"])
        c.drawPath(cap, stroke(with_alpha(rim, 0.35 * min(1.0, cs["rim_k"])), 0.018 * R))
        for x0, y0, x1, y1, cxp, cyp in [(-0.4, -0.9, 0.35, -0.5, 0.0, -0.85), (0.0, -0.95, 0.62, -0.52, 0.42, -0.85)]:
            p = skia.Path()
            p.moveTo(o + x0 * R, y0 * R)
            p.quadTo(o + cxp * R, cyp * R, o + x1 * R, y1 * R)
            c.drawPath(p, stroke(hexc(cs["hair_lines"]), 0.02 * R))
        c.restore()

    def _face(self, c, P, R, ht):
        cs = self.cs
        nod = P["nod"]
        fx = ht * 0.48 * R
        fy = nod * 0.16 * R
        lx, ly = P["look"]
        blink = P["blink"]
        for side in (-1, 1):
            far = (side < 0 and ht > 0) or (side > 0 and ht < 0)
            k = 1 - 0.4 * abs(ht) if far else 1 + 0.05 * abs(ht)
            if far and abs(ht) > 0.88:
                continue
            ex = fx + side * cs["eye_dx"] * R * (1 - 0.35 * abs(ht))
            ey = fy + cs["eye_y"] * R
            rx, ry = cs["eye_rx"] * R * k, cs["eye_ry"] * R
            ell = skia.Path()
            ell.addOval(skia.Rect.MakeXYWH(ex - rx, ey - ry, 2 * rx, 2 * ry))
            lid = clamp(cs["lid_base"] + P["lid"], 0, 1)
            lid = max(lid, blink)
            ang = math.radians(cs["lid_angle"] + P["lid_angle"]) * (-side)
            yl = ey - ry + 2 * ry * lid
            dy = math.tan(ang) * rx
            eye = ell
            if lid > 0.001:
                lp = path_poly([(ex - rx * 1.5, ey - ry * 1.8), (ex + rx * 1.5, ey - ry * 1.8),
                                (ex + rx * 1.5, yl + dy * 1.5), (ex - rx * 1.5, yl - dy * 1.5)])
                eye = skia.Op(eye, lp, skia.PathOp.kDifference_PathOp) or eye
            sq = clamp(P["squint"], 0, 1)
            if sq > 0.001:
                yb = ey + ry - 2 * ry * sq * 0.9
                bp = skia.Path()
                bp.moveTo(ex - rx * 1.5, ey + ry * 1.8)
                bp.lineTo(ex - rx * 1.5, yb + ry * 0.3)
                bp.quadTo(ex, yb - ry * 0.3, ex + rx * 1.5, yb + ry * 0.3)
                bp.lineTo(ex + rx * 1.5, ey + ry * 1.8)
                bp.close()
                eye = skia.Op(eye, bp, skia.PathOp.kDifference_PathOp) or eye
            if lid >= 0.985:
                eye = skia.Path()
            # glow behind the eye (key art: eyes read as light sources)
            if cs.get("eye_glow") and not eye.isEmpty():
                gcol = hexc(cs.get("eye_glow_col", "#fff4e0"))
                c.drawPath(eye, fill(with_alpha(gcol, 0.55 * cs["eye_glow"]), blur=0.09 * R * (1 + cs["eye_glow"])))
                if cs["eye_glow"] >= 0.9:
                    c.drawPath(eye, fill(with_alpha(gcol, 0.9), blur=0.05 * R))
                    c.drawPath(eye, fill(with_alpha(gcol, 0.35), blur=0.3 * R))
            c.save()
            c.clipPath(eye, doAntiAlias=True)
            if cs["kind"] == "stick" and cs.get("iris"):        # double: white-hot core, red edge
                c.drawPath(ell, fill(0, shader=radial(ex, ey + 0.2 * ry, rx * 1.15, [hexc("#ffffff"), hexc("#ffd0c8"), hexc(cs["iris"])],
                                                      [0, 0.45, 1])))
            else:
                c.drawPath(ell, fill(hexc(cs["eye"])))
            px = ex + lx * rx * 0.5
            py = ey + ly * ry * 0.4 + 0.12 * ry
            pk = P["pupil_k"]
            if cs["kind"] == "mom":
                ir = cs["iris_r"] * R * pk ** 0.4
                c.drawCircle(px, py, ir, fill(hexc(cs["iris"]), shader=radial(px, py - ir * 0.3, ir, [shade(hexc(cs["iris"]), 1.35), hexc(cs["iris"])])))
                c.drawCircle(px, py, ir * 0.5, fill(hexc(cs["pupil"])))
                c.drawCircle(px - ir * 0.38, py - ir * 0.42, ir * 0.26, fill(hexc("#ffffff")))
                c.drawCircle(px + ir * 0.35, py + ir * 0.35, ir * 0.1, fill(with_alpha(hexc("#ffffff"), 0.8)))
            elif cs.get("pupil"):
                pr = cs["pupil_r"] * R * pk
                c.drawCircle(px, py, pr, fill(hexc(cs["pupil"])))
                c.drawCircle(px - pr * 0.35, py - pr * 0.4, pr * 0.28, fill(with_alpha(hexc("#ffffff"), 0.85)))
            c.drawPath(ell, stroke(with_alpha(hexc("#000000"), 0.22), 0.045 * R, blur=0.03 * R))
            c.restore()
            if cs.get("lashes"):
                c.save()
                c.clipPath(ell, doAntiAlias=True)
                if lid > 0.001:
                    c.drawLine(ex - rx * 1.5, yl - dy * 1.5, ex + rx * 1.5, yl + dy * 1.5, stroke(hexc(cs["lashes"]), 0.06 * R))
                c.restore()
                if lid < 0.97:
                    c.drawArc(skia.Rect.MakeXYWH(ex - rx * 1.02, ey - ry * 1.02, 2.04 * rx, 2.04 * ry), 195, 150, False,
                              stroke(hexc(cs["lashes"]), 0.05 * R))
                    c.drawLine(ex + side * rx * 0.95, ey - ry * 0.55, ex + side * rx * 1.25, ey - ry * 0.85,
                               stroke(hexc(cs["lashes"]), 0.035 * R))
                else:
                    p = skia.Path()
                    p.moveTo(ex - rx, ey)
                    p.quadTo(ex, ey - ry * 0.6, ex + rx, ey)
                    c.drawPath(p, stroke(hexc(cs["lashes"]), 0.045 * R))
            if cs.get("lid_line"):
                lc = hexc(cs["lid_line"])
                if lid >= 0.97:
                    p = skia.Path()
                    p.moveTo(ex - rx, ey + ry * 0.2)
                    p.quadTo(ex, ey - ry * 0.45, ex + rx, ey + ry * 0.2)
                    c.drawPath(p, stroke(lc, 0.05 * R))
                else:
                    c.save()
                    big = skia.Path()
                    big.addOval(skia.Rect.MakeXYWH(ex - rx * 1.06, ey - ry * 1.06, 2.12 * rx, 2.12 * ry))
                    c.clipPath(big, doAntiAlias=True)
                    if lid > 0.001:
                        c.drawLine(ex - rx * 1.5, yl - dy * 1.5, ex + rx * 1.5, yl + dy * 1.5, stroke(lc, 0.055 * R))
                    else:
                        c.drawArc(skia.Rect.MakeXYWH(ex - rx, ey - ry, 2 * rx, 2 * ry), 200, 140, False, stroke(lc, 0.05 * R))
                    c.restore()
                    # small outer flick (graphic, not lash strokes)
                    yo = (yl + (dy if side > 0 else -dy)) if lid > 0.001 else ey - ry * 0.45
                    c.drawLine(ex + side * rx * 0.9, yo + 0.01 * R, ex + side * rx * 1.16, yo - 0.06 * R, stroke(lc, 0.035 * R))
            # brows
            raise_ = P["brow_raise"] + (P["brow_asym"] * 0.5 if side > 0 else -P["brow_asym"] * 0.15)
            by = ey - ry - 0.09 * R - raise_ * 0.13 * R + cs["lid_base"] * 0.45 * ry
            inner = -side
            ang_off = (P["brow_angle"] + (0.6 if cs["kind"] == "stick" else 0.0)) * 0.1 * R
            bw = 0.26 * R * k
            x_in, x_out = ex + inner * bw * 0.85, ex - inner * bw * 1.1
            y_in, y_out = by + ang_off, by - ang_off * 0.35
            bp = skia.Path()
            bp.moveTo(x_out, y_out + 0.02 * R)
            bp.quadTo(ex, min(y_in, y_out) - 0.07 * R, x_in, y_in)
            if cs.get("brow_edge"):
                c.drawPath(bp, stroke(with_alpha(hexc(cs["brow_edge"]), 0.6), cs["brow_w"] * R * 1.8, blur=0.02 * R))
            c.drawPath(bp, stroke(hexc(cs["brow"]), cs["brow_w"] * R, cap="round"))
            if cs["kind"] == "stick":   # tapered outer end like a brush stroke
                c.drawCircle(x_in, y_in, cs["brow_w"] * R * 0.62, fill(hexc(cs["brow"])))
        if cs.get("blush"):
            for side in (-1, 1):
                far = (side < 0 and ht > 0) or (side > 0 and ht < 0)
                if far and abs(ht) > 0.7:
                    continue
                c.drawCircle(fx + side * 0.5 * R * (1 - 0.35 * abs(ht)), fy + 0.4 * R, 0.13 * R,
                             fill(with_alpha(hexc(cs["blush"]), 0.3), blur=0.06 * R))
        self._mouth2(c, P, R, fx, fy)

    def _mouth2(self, c, P, R, fx, fy):
        cs = self.cs
        mo = clamp(P["mouth_open"], 0, 1)
        sm = clamp(P["smile"] - (0.25 if cs["kind"] == "stick" else 0.0), -1, 1)
        w = 0.085 * R * P["mouth_w"] * (1 + 0.3 * abs(sm)) * (1 - 0.2 * mo) * (1.25 if cs["kind"] == "mom" else 1.0)
        mx, my = fx * 1.05, fy + (0.66 if cs["kind"] == "stick" else 0.55) * R
        curve = sm * 0.06 * R
        line = hexc(cs["mouth"])
        if mo < 0.05:
            p = skia.Path()
            p.moveTo(mx - w, my - curve * 0.6)
            p.quadTo(mx, my + curve, mx + w, my - curve * 0.6)
            c.drawPath(p, stroke(line, 0.035 * R))
            return
        h = mo * 0.2 * R
        p = skia.Path()
        p.moveTo(mx - w, my - curve * 0.5)
        p.quadTo(mx, my - h * 0.35 + curve * 0.6, mx + w, my - curve * 0.5)
        p.quadTo(mx, my + h + curve, mx - w, my - curve * 0.5)
        p.close()
        c.drawPath(p, fill(hexc(cs["mouth_in"])))
        c.drawPath(p, stroke(line, 0.025 * R))

    # ------------------------------------------------------------------ Mom hair
    def _mom_back_hair(self, c, P, R, ht):
        cs = self.cs
        hair = hexc(cs["hair"])
        bx = -ht * 0.5 * R
        by = -0.82 * R if not P["back"] else -0.6 * R
        c.drawCircle(bx, by, 0.44 * R, fill(hair, shader=radial(bx - 0.12 * R, by - 0.15 * R, 0.5 * R, [hexc(cs["hair_hi"]), hair])))
        for i in range(4):  # bun strands
            a = i * 0.9
            c.drawArc(skia.Rect.MakeXYWH(bx - 0.36 * R, by - 0.36 * R, 0.72 * R, 0.72 * R), 200 + i * 35, 70, False,
                      stroke(shade(hair, 0.7), 0.02 * R))
        # side locks behind the face
        for sgn in (-1, 1):
            x0 = sgn * 0.88 * R - ht * 0.3 * R
            if cs.get("hair_strands", True):
                p = skia.Path()
                p.moveTo(x0, -0.2 * R)
                p.quadTo(x0 + sgn * 0.1 * R, 0.3 * R, x0 - sgn * 0.04 * R, 0.55 * R)
                c.drawPath(p, stroke(hair, 0.09 * R))
            else:   # solid tapered lock (stickman-simple silhouette)
                p = skia.Path()
                p.moveTo(x0 - sgn * 0.12 * R, -0.35 * R)
                p.quadTo(x0 + sgn * 0.16 * R, 0.0, x0 + sgn * 0.02 * R, 0.5 * R)
                p.quadTo(x0 - sgn * 0.08 * R, 0.1 * R, x0 - sgn * 0.18 * R, -0.1 * R)
                p.close()
                c.drawPath(p, fill(hair))
        # ears
        for sgn in (-1, 1):
            if not cs.get("ear"):
                break
            far = (sgn < 0 and ht > 0) or (sgn > 0 and ht < 0)
            if far and abs(ht) > 0.5:
                continue
            exx = sgn * (0.97 - 0.3 * max(0, sgn * ht)) * R - ht * 0.2 * R
            c.drawOval(skia.Rect.MakeXYWH(exx - 0.12 * R, 0.0, 0.24 * R, 0.3 * R), fill(hexc(cs["ear"])))
            c.drawOval(skia.Rect.MakeXYWH(exx - 0.06 * R, 0.07 * R, 0.12 * R, 0.16 * R),
                       stroke(with_alpha(hexc("#b88e78"), 0.6), 0.02 * R))

    def _mom_front_hair(self, c, P, R, ht):
        cs = self.cs
        hair = hexc(cs["hair"])
        if P["back"]:
            c.drawCircle(0, 0, R * 1.01, fill(hair))
            return
        c.save()
        cp = skia.Path()
        cp.addCircle(0, 0, R * 1.03)
        c.clipPath(cp, doAntiAlias=True)
        o = ht * 0.55 * R
        hp = skia.Path()
        hp.moveTo(-1.2 * R, 0.1 * R)
        hp.lineTo(-1.2 * R, -1.2 * R)
        hp.lineTo(1.2 * R, -1.2 * R)
        hp.lineTo(1.2 * R, 0.1 * R)
        hp.cubicTo(0.98 * R + o * 0.4, -0.25 * R, 0.62 * R + o * 0.8, -0.62 * R, o, -0.66 * R)   # hairline (parted)
        hp.cubicTo(-0.62 * R + o * 0.8, -0.62 * R, -0.98 * R + o * 0.4, -0.25 * R, -1.2 * R, 0.1 * R)
        hp.close()
        c.drawPath(hp, fill(hair, shader=radial(-0.25 * R + o * 0.3, -0.95 * R, 1.2 * R, [hexc(cs["hair_hi"]), hair])))
        for i in (range(5) if cs.get("hair_strands", True) else range(2)):  # strands combed back from the parting
            for sgn in (-1, 1):
                p = skia.Path()
                p.moveTo(o + sgn * 0.04 * R, -0.66 * R - i * 0.02 * R)
                p.quadTo(o + sgn * (0.25 + i * 0.12) * R, -(0.78 + i * 0.03) * R, o + sgn * (0.4 + i * 0.15) * R, -(1.05 - i * 0.07) * R)
                c.drawPath(p, stroke(shade(hair, 0.72), 0.016 * R))
        c.drawLine(o, -0.66 * R, o * 0.6, -1.0 * R, stroke(shade(hair, 0.6), 0.02 * R))
        c.restore()
        # rim light along the hair silhouette
        c.save()
        cp2 = skia.Path()
        cp2.addCircle(0, 0, R * 1.03)
        c.clipPath(cp2, doAntiAlias=True)
        c.drawPath(hp, self._rim_paint(P, R, 0.03 * R, 0.6, blur=0.01 * R))
        c.restore()
        if not cs.get("hair_strands", True):
            for sgn in (-1, 1):   # soft temple locks as filled shapes
                x0 = sgn * 0.66 * R + o * 0.5
                p = skia.Path()
                p.moveTo(x0 - sgn * 0.1 * R, -0.52 * R)
                p.cubicTo(x0 + sgn * 0.18 * R, -0.3 * R, x0 + sgn * 0.12 * R, 0.05 * R, x0 + sgn * 0.24 * R, 0.3 * R)
                p.cubicTo(x0 + sgn * 0.3 * R, 0.0, x0 + sgn * 0.3 * R, -0.35 * R, x0 + sgn * 0.08 * R, -0.62 * R)
                p.close()
                c.drawPath(p, fill(hair))
            return
        # soft temple strands in front of the face edge
        for sgn in (-1, 1):
            p = skia.Path()
            x0 = sgn * 0.62 * R + o * 0.5
            p.moveTo(x0, -0.5 * R)
            p.cubicTo(x0 + sgn * 0.2 * R, -0.25 * R, x0 + sgn * 0.12 * R, 0.1 * R, x0 + sgn * 0.2 * R, 0.32 * R)
            c.drawPath(p, stroke(hair, 0.045 * R))
            p2 = skia.Path()
            p2.moveTo(x0 + sgn * 0.05 * R, -0.45 * R)
            p2.cubicTo(x0 + sgn * 0.26 * R, -0.2 * R, x0 + sgn * 0.22 * R, 0.05 * R, x0 + sgn * 0.3 * R, 0.2 * R)
            c.drawPath(p2, stroke(shade(hair, 0.85), 0.025 * R))


RIGS2 = {k: ConceptRig(k) for k in CONCEPT}
