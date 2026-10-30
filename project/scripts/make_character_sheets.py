"""Character reference sheets — drawn by the production rig itself (guaranteed identical to the episode)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia
from engine.core import new_surface, save_png, hexc, fill, stroke, font, draw_text, with_alpha, linear, rrect
from engine.rig import RIGS, STYLES, emotion

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "characters")
SW, SH = 2400, 2000

INFO = {
    "arman": ("АРМАН — ГЛАВНЫЙ ГЕРОЙ", "24 года · любопытный, ироничный, импульсивный; шутит, когда страшно",
              "Голос: Egor (ElevenLabs), молодой, разговорный, лёгкая хрипотца"),
    "double": ("ДВОЙНИК АРМАНА", "Тот же силуэт · красный контур · красно-белые глаза · спокойные медленные движения",
               "Голос: тот же актёр, -1.3 полутона, сдержанно, без роботизации"),
    "mom": ("МАМА АРМАНА", "45-50 лет · тёплая, заботливая · каштановые волосы в пучке, карие глаза",
            "Голос: Soldani (ElevenLabs), зрелый, тёплый, лёгкий казахский акцент"),
    "girl": ("ДЕВОЧКА", "~10 лет · добрая, непосредственная, иногда неожиданно серьёзная",
             "Голос: естественный детский (кастинг к серии 2+)"),
    "barista": ("БАРИСТА", "20-30 лет · спокойный, ироничный · кепка и фартук · «как обычно?»",
                "Голос: дружелюбный, разговорный (кастинг к серии 2+)"),
    "operator": ("ОПЕРАТОР СИСТЕМЫ", "Тёмный силуэт, синие светящиеся глаза · только голос и экраны",
                 "Голос: ровный женский, слегка обработанный, разборчивый"),
}
EMOS = ["neutral", "joy", "surprise", "fear", "irritation", "suspicion"]
EMO_RU = {"neutral": "нейтрально", "joy": "радость", "surprise": "удивление", "fear": "страх",
          "irritation": "раздражение", "suspicion": "подозрение"}


def sheet(name):
    s = new_surface(SW, SH)
    c = s.getCanvas()
    c.drawRect(skia.Rect.MakeWH(SW, SH), fill(0, shader=linear(0, 0, 0, SH, [hexc("#2a2530"), hexc("#16141b")])))
    rig = RIGS[name]
    st = STYLES[name]
    title, desc, voice = INFO[name]
    draw_text(c, title, 70, 120, font("russo", 78), hexc("#ffffff"))
    draw_text(c, desc, 72, 185, font("rubik", 36, 400), hexc("#c9cfdd"))
    draw_text(c, voice, 72, 235, font("rubik", 32, 400), hexc("#8f97ab"))
    draw_text(c, "«ТЕБЯ ЗДЕСЬ НЕ БЫЛО» · reference sheet · v1", SW - 70, 120, font("rubik", 30, 500), hexc("#6f778b"), align="right")
    # turnaround
    lab = font("rubik", 30, 600)
    views = [("СПЕРЕДИ", dict(bt=0, ht=0)), ("3/4", dict(bt=0.45, ht=0.45)), ("СБОКУ", dict(bt=0.95, ht=0.93)),
             ("СЗАДИ", dict(bt=0, ht=0, back=True))]
    floor = 1060
    for i, (lb, v) in enumerate(views):
        x = 230 + i * 330
        c.drawLine(x - 140, floor + 2, x + 140, floor + 2, stroke(with_alpha(hexc("#ffffff"), 0.15), 3))
        rig.draw(c, dict(x=x, y=floor - 186 * st["height"], s=1.0, **v))
        draw_text(c, lb, x, floor + 60, lab, hexc("#c9cfdd"), align="center")
    # proportion guide
    gx = 1420
    R = 100 * st["height"]
    top = floor - 186 * st["height"] - 2.42 * R - R
    for k in range(6):
        y = top + k * R
        c.drawLine(gx - 20, y, gx + 20, y, stroke(with_alpha(hexc("#ffffff"), 0.3), 2))
    c.drawLine(gx, top, gx, floor, stroke(with_alpha(hexc("#ffffff"), 0.3), 2))
    draw_text(c, "ПРОПОРЦИИ", 1560, 900, lab, hexc("#ffffff"))
    draw_text(c, "рост ≈ 5.3 R  (R = радиус головы)", 1560, 945, font("rubik", 26, 400), hexc("#aab"))
    draw_text(c, "голова 2R · шея 0.12R · торс 1.25R", 1560, 985, font("rubik", 26, 400), hexc("#889"))
    draw_text(c, "рука 0.88R + 0.82R · нога 1.85R", 1560, 1025, font("rubik", 26, 400), hexc("#889"))
    # palette
    px, py = 1560, 330
    draw_text(c, "ПАЛИТРА", px, py, lab, hexc("#ffffff"))
    keys = [k for k in ("head", "rim", "eye", "iris", "hair", "top", "cardigan", "apron", "cap", "pants", "shoes") if st.get(k)]
    for j, k in enumerate(keys):
        yy = py + 30 + j * 46
        c.drawRRect(rrect(px, yy, 60, 36, 8), fill(hexc(st[k])))
        c.drawRRect(rrect(px, yy, 60, 36, 8), stroke(with_alpha(hexc("#fff"), 0.3), 2))
        draw_text(c, f"{k}  {st[k]}", px + 80, yy + 27, font("rubik", 26, 400), hexc("#c9cfdd"))
    # emotions (head close-ups)
    draw_text(c, "ЭМОЦИИ", 70, 1220, lab, hexc("#ffffff"))
    for i, e in enumerate(EMOS):
        x = 190 + i * 300
        y = 1700
        c.save()
        c.clipRect(skia.Rect.MakeXYWH(x - 148, 1250, 296, 420))
        rig.draw(c, dict(x=x, y=y + 120, s=1.1, ht=0.12 if i % 2 else -0.12, **emotion(e)), passes=("body", "head"))
        c.restore()
        draw_text(c, EMO_RU[e], x, 1720, font("rubik", 32, 500), hexc("#c9cfdd"), align="center")
    # poses
    draw_text(c, "Позы: сидя с телефоном · телефон у уха · стоя/шаг. Правило: форма головы, глаза, одежда и цвета не меняются между кадрами.", 70, 1860,
              font("rubik", 28, 400), hexc("#889"))
    # pose minis
    poses = [dict(sit=1, bt=0.7, ht=0.5, hand_a=(1.2, -0.75), hand_b=(1.05, -0.62), phone="a", phone_glow=1, phone_rot=-18),
             dict(hand_a=(-1.12, -2.12), phone="a", phone_rot=18, **emotion("fear")),
             dict(step=0.6, **emotion("calm_smirk"))]
    for i, p in enumerate(poses):
        x = 1900 + i * 190
        rig.draw(c, dict(x=x, y=1640 if p.get("sit") else 1580, s=0.6, **p))
    draw_text(c, "ПОЗЫ", 1830, 1220, lab, hexc("#ffffff"))
    save_png(s, os.path.join(OUT, f"{name}_reference_sheet.png"))


if __name__ == "__main__":
    for n in STYLES:
        sheet(n)
        print("sheet", n)
