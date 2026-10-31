"""Series standard (approved ep. 1 v2 look): character sheets drawn by the production rig with the locked
standard parameters, plus one bible page built from frames extracted from final/episode_01_final.mp4.
Outputs characters/standard/*_standard_sheet.png and references/standard/series_standard_bible.png."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import skia
import make_v2_refs as V
from engine.core import new_surface, hexc, fill, stroke, font, draw_text, rrect, with_alpha

ROOT = V.ROOT
STD = os.path.join(ROOT, "references", "standard")

V.OUT_C = os.path.join(ROOT, "characters", "standard")
os.makedirs(V.OUT_C, exist_ok=True)
V.SUFFIX = "standard_sheet"
V.SOURCE = "Стандарт серии = утверждённая v2 серии 1 (final/episode_01_final.mp4) · кадры-эталоны: references/standard/frames/*"
V.INFO = {
    "arman": ("АРМАН · СТАНДАРТ СЕРИАЛА", "Матово-чёрная голова-круг · белые тонкие брови · «подозрительные» глаза (веко 16%, наклон 16°) · "
                                         "ВСЕГДА синий контур #8fb8ff"),
    "double": ("ДВОЙНИК · СТАНДАРТ СЕРИАЛА", "Силуэт Армана · красный контур и ореол · бело-красные светящиеся глаза (веко 33%) · "
                                             "медленные движения, взгляд в упор"),
    "mom": ("МАМА · СТАНДАРТ v3 (с серии 2)", "Геометрия Cinematic Stickman: голова-круг, глаза-овалы как у Армана, графичное веко · "
                                              "пучок, пробор, пряди у висков · бежево-коричневый верх, фартук"),
}
V.INFO["girl"] = ("ДЕВОЧКА · СТАНДАРТ v3 (с серии 3)", "Перенос листа v1 (characters/girl_reference_sheet.png) в геометрию стандарта: "
                                                    "хвостик, чёлка, светлая куртка на молнии, джинсы, красные кроссовки")
V.BG["girl"] = ("#2e3644", "#10141b", (0.6, -0.8), None)
V.RULES = {
    "arman": ["ПРАВИЛА:", "голова — круг R; рост ≈ 5.3R; торс 1.25R;", "шея короткая, голова сидит на воротнике;",
              "глаза в нижней половине головы,", "верхнее веко срезает 16%;", "контур — всегда синий #8fb8ff,",
              "в тёплой кухне и в холодном коридоре;", "руки — крупные перчатки с пальцами."],
    "double": ["ПРАВИЛА:", "тот же риг и пропорции, что у Армана;", "веко 33% — тяжёлый, неподвижный взгляд;",
               "красный контур + ореол, глаза светятся;", "двигается медленнее Армана;", "голос Армана −1.3 пт + зал."],
    "girl": ["ПРАВИЛА:", "рост 0.72 от Армана, торс короче (0.86);", "голова — круг, без ушей и ресниц;",
             "глаза-овалы чуть крупнее мамы (rx 0.29R), веко 5%;", "чёлка + высокий хвостик (резинка #e05a6a),",
             "хвостик качается вторичным движением;", "контур тёплый #ffe0b0."],
    "mom": ["ПРАВИЛА:", "голова — круг, без ушей и ресниц;", "глаза-овалы (rx 0.28R), карие, веко 12%;",
            "графичная линия века + короткий штрих;", "пробор по центру, пучок, сплошные пряди;", "контур тёплый #ffd9a6, мягкий;",
            "рост 0.97 от Армана."],
}

FR = lambda n: os.path.join(STD, "frames", n + ".png")
EP2 = lambda n: os.path.join(STD, "frames_ep02", n + ".png")


def img(path):
    return skia.Image.open(path)


def tile(c, path, x, y, w, h, label, crop=None):
    im = img(path)
    src = skia.Rect.MakeXYWH(*crop) if crop else skia.Rect.MakeWH(im.width(), im.height())
    c.save(); c.clipRRect(rrect(x, y, w, h, 18), True)
    c.drawImageRect(im, src, skia.Rect.MakeXYWH(x, y, w, h), skia.SamplingOptions(skia.FilterMode.kLinear))
    c.restore()
    c.drawRRect(rrect(x, y, w, h, 18), stroke(with_alpha(hexc("#ffffff"), 0.25), 2))
    draw_text(c, label, x + 4, y + h + 38, font("rubik", 28, 500), hexc("#d8d0c6"))


def bible():
    SW, SH = 3500, 3300
    s = new_surface(SW, SH); c = s.getCanvas()
    c.drawRect(skia.Rect.MakeWH(SW, SH), fill(hexc("#121014")))
    draw_text(c, "«ТЕБЯ ЗДЕСЬ НЕ БЫЛО» — СТАНДАРТ СЕРИАЛА", 80, 130, font("russo", 84), hexc("#ffffff"))
    draw_text(c, "Утверждён: серия 1 v2 (final/episode_01_final.mp4). Кадры извлечены из этого файла; плитки «с.2» — из серии 2 по стандарту. "
                 "Менять стиль, голоса и характеры нельзя.", 82, 190, font("rubik", 32, 400), hexc("#b9b0a6"))
    # row 1: characters (crops of the 1080x1920 frames). Ep. 2 tiles come from renders/ep02/ep02_picture_master.mp4.
    cw, ch = 440, 600
    row = [(FR("arman_warm_mcu"), "Арман · кухня · с.1 (тёплый)"), (FR("arman_cold_cu_phone"), "Арман · коридор · синий"),
           (EP2("arman_kitchen_ep2"), "Арман · кухня · с.2: синий"), (FR("double_corridor_full"), "Двойник · красный ореол"),
           (FR("double_eyes_flare"), "Двойник · глаза"), (FR("mom_cu_warm"), "Мама · серия 1"), (EP2("mom_v3_ep2"), "Мама · v3 (с.2)")]
    for i, (pth, lb) in enumerate(row):
        tile(c, pth, 80 + i * 482, 260, cw, ch, lb, crop=(90, 260, 900, 1227))
    # row 2: sets + light
    sw_, sh_ = 700, 1244
    row2 = [("kitchen_wide_warm", "Кухня · тёплый янтарь #ffb35c"), ("kitchen_wide_cold", "Кухня · ночь, холодный вариант"),
            ("corridor_cold", "Коридор · холодный синий"), ("kitchen_empty_chair", "Кухня · пустой стул")]
    for i, (n, lb) in enumerate(row2):
        tile(c, FR(n), 80 + i * 840, 960, 800, 711, lb, crop=(0, 260, 1080, 960))
    # row 3: UI + subtitles
    uw, uh = 450, 800
    row3 = [("phone_lock_notification", "Телефон · уведомление"), ("phone_chat_messages", "Чат · сообщения"),
            ("phone_incoming_call", "Входящий вызов"), ("subtitle_dialogue_red_keyword", "Субтитр · красное слово"),
            ("subtitle_double_pinkred", "Субтитр · двойник #ffd6d6"), ("subtitle_phone_voice_blue", "Субтитр · голос в трубке #cfe3ff")]
    for i, (n, lb) in enumerate(row3):
        tile(c, FR(n), 80 + i * 560, 1760, uw, uh, lb, crop=(0, 0, 1080, 1920))
    # text block: voices + rules
    y0 = 2680
    lines = [
        ("ГОЛОСА (ElevenLabs eleven_v4, те же, что в серии 1):", 700),
        ("Арман — Egor g1G73EpCIdK4HUyDiLYF · живой, молодой; шёпот −3 дБ.", 400),
        ("Двойник — тот же Egor, pitch ×0.928 с сохранением форманты + холодный зал; спокойно, уверенно.", 400),
        ("Мама — Soldani wlkyM0h4j74QgqHxZi4F · тёплая, усталая; в трубке: полоса 320–3300 Гц + лёгкий кодек.", 400),
        ("СУБТИТРЫ: белый жирный, ≤2 строк, обводка + тень, не на лицах и не в зоне интерфейса TikTok; ключевые слова — красные.", 700),
        ("СВЕТ: кухня — тёплый янтарь, лампа мигает плавно (≤3 провала/с); коридор — холодный синий, тёмный пол; look: bloom + бумага + зерно.", 700),
    ]
    for j, (t, w) in enumerate(lines):
        draw_text(c, t, 82, y0 + j * 52, font("rubik", 32, w), hexc("#ffffff" if w == 700 else "#cfc6bc"))
    s.makeImageSnapshot().save(os.path.join(STD, "series_standard_bible.png"), skia.kPNG)


if __name__ == "__main__":
    for n in ("arman", "double", "mom", "girl"):
        V.sheet(n); print("sheet", n)
    bible(); print("bible ok")
