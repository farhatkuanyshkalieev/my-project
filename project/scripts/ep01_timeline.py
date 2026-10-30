"""Episode 01 «НЕ ОТВЕЧАЙ» — master timeline (seconds). Shared by picture (ep01_shots.py) and sound (audio_build.py)."""

FPS = 60
DURATION = 63.40

# Selected takes (see voices/qc_report.json; chosen by Whisper match + delivery)
TAKES = {
    "A01": "dxkZy2smV7PsXicoE8Hk", "M01": "enNK2jipG9dRsXSnI0sX", "A02": "FyoLX8ZnUgjLXhpcyrEv",
    "M02": "velMDCa5HPRan3tLmh4i", "A03": "wFukqTF3TFtIgNp8hmWV", "M03": "4hV5a05DPaR5P1p1nb7B",
    "A04": "gCA8RvgJcrw59awF5ojt", "M04": "0AOkbfPSZE3JRc4JntL0", "A05": "sitgiGJwnqK4CQdD4JoP",
    "M05": "2hPDTHma3unYBUCVraGm", "A06": "8COFKsMoJHkAlfOPXJnJ", "D01": "o9dCFQfcORFLa7c7nQRK",
    "D02": "wQ03c2tcYuYvqmhZBkhG", "A07": "6tEFbmCvermI3AUqqpxG",
}

# speech onset time of each line in the episode; "fx" = processing chain
LINES = {
    "A01": dict(t=4.90, who="arman", fx="room"),
    "M01": dict(t=7.15, who="mom", fx="room"),
    "A02": dict(t=14.75, who="arman", fx="room"),
    "M02": dict(t=18.30, who="mom", fx="room_close"),
    "A03": dict(t=20.15, who="arman", fx="room"),
    "M03": dict(t=21.45, who="mom", fx="room_close"),
    "A04": dict(t=27.55, who="arman", fx="room"),
    "M04": dict(t=32.45, who="mom_phone", fx="phone"),
    "A05": dict(t=36.40, who="arman", fx="room"),
    "M05": dict(t=39.20, who="mom_phone", fx="phone"),
    "A06": dict(t=46.10, who="arman", fx="whisper"),
    "D01": dict(t=52.90, who="double", fx="double_offscreen"),
    "A07": dict(t=54.45, who="arman", fx="room"),
    "D02": dict(t=56.70, who="double", fx="double_hall"),
}

SUBTITLES = [  # (line, text, red keywords, colour)
    ("A01", "Мам… ты мне писала?", (), "#ffffff"),
    ("M01", "Нет. Что случилось?", (), "#ffffff"),
    ("A02", "Это что… прикол какой-то?", (), "#ffffff"),
    ("M02", "Не отвечай.", ("не", "отвечай"), "#ffffff"),
    ("A03", "Почему?", (), "#ffffff"),
    ("M03", "Потому что я тоже… ответила.", ("ответила",), "#ffffff"),
    ("A04", "Мам?", (), "#ffffff"),
    ("M04", "Сынок, я задерживаюсь. Буду через полчаса.", (), "#cfe3ff"),
    ("A05", "Ты же… только что здесь сидела.", (), "#ffffff"),
    ("M05", "Арман, я ещё на работе.", (), "#cfe3ff"),
    ("A06", "Кто… ты?", (), "#ffffff"),
    ("D01", "Не верь ему.", (), "#ffd6d6"),
    ("A07", "Ч-что?..", (), "#ffffff"),
    ("D02", "Он всегда пишет… первым.", ("первым",), "#ffd6d6"),
]

SHOTS = [  # id, start, end, description
    ("S01", 0.00, 4.40, "ECU телефон: уведомление, перевод фокуса на маму"),
    ("S02", 4.40, 9.60, "Двухшотовый средний план за столом: «Мам, ты мне писала?»"),
    ("S03", 9.60, 11.90, "КП мамы через плечо Армана: читает сообщение, улыбка гаснет"),
    ("S04", 11.90, 14.40, "Инсерт: входящий звонок «МАМА»"),
    ("S05", 14.40, 17.90, "СКП Армана: «Это что, прикол какой-то?»"),
    ("S06", 17.90, 19.80, "КП мамы: «Не отвечай»"),
    ("S07", 19.80, 21.10, "КП Армана: «Почему?»"),
    ("S08", 21.10, 24.50, "КП мамы: «Потому что я тоже ответила»"),
    ("S09", 24.50, 26.90, "Общий: мигание света, мама исчезает"),
    ("S10", 26.90, 28.70, "КП Армана: «Мам?»"),
    ("S11", 28.70, 30.30, "POV: пустой стул, пар от кружки"),
    ("S12", 30.30, 32.00, "Инсерт: палец нажимает «Ответить»"),
    ("S13", 32.00, 36.20, "СКП Армана с телефоном у уха: мама по телефону"),
    ("S14", 36.20, 38.90, "КП Армана: «Ты же только что здесь сидела»"),
    ("S15", 38.90, 42.70, "Общий с наездом на пустой стул: «Я ещё на работе»"),
    ("S16", 42.70, 45.30, "Инсерт чат: «ТЫ ОТВЕТИЛ. ТЕПЕРЬ У НАС ПРОБЛЕМА»"),
    ("S17", 45.30, 48.30, "Инсерт: печатает «КТО ТЫ?»"),
    ("S18", 48.30, 51.50, "Инсерт: «ТЫ. ТОЛЬКО Я УЖЕ ПРОХОДИЛ ЭТО»"),
    ("S19", 51.50, 54.20, "ДКП глаз Армана; голос из коридора «Не верь ему»"),
    ("S20", 54.20, 55.70, "Арман резко оборачивается"),
    ("S21", 55.70, 59.90, "Коридор: двойник с красным контуром «Он всегда пишет первым»"),
    ("S22", 59.90, 60.20, "Резкая склейка в чёрный"),
    ("S23", 60.20, 63.40, "Титр «А КОМУ БЫ ПОВЕРИЛ ТЫ?»"),
]

# key story events used by both picture and sound
EV = dict(
    phone_wake=0.15, notif=0.32, mug_down=6.45, show_phone=8.95, read=9.9, smile_fade=10.7,
    ring_start=11.95, answer=31.25, flicker_a=11.5, flicker_b=18.0,
    flicker_start=24.6, vanish=26.0, vanish_end=26.35, startle=26.15,
    call_end=42.45, msg1=43.0, type_start=45.65, type_end=47.45, send=47.85, dots=48.6, msg2=49.55,
    music_drop=52.4, turn=54.25, reveal=55.7, step=56.35, cut_black=59.9, end_card=60.2, title2=61.6,
)
TYPED = "КТО ТЫ?"


# ------------------------------------------------------------------ lamp flicker (shared by picture and sound)
# Photosensitivity-safe: at most ~3 dips per second, smooth (eased) dips instead of a square-wave strobe.
def _dip(T, t0, depth, dur=0.16):
    import math
    u = (T - t0) / dur
    return depth * math.sin(math.pi * u) ** 2 if 0.0 <= u <= 1.0 else 0.0


FLICKER_DIPS = [  # (time, depth, duration)
    (11.50, 0.35, 0.16), (11.78, 0.22, 0.14),                       # first unease while Mom reads
    (18.05, 0.30, 0.15), (18.40, 0.18, 0.14),                       # «Не отвечай»
    (24.62, 0.30, 0.18), (24.98, 0.45, 0.18), (25.33, 0.55, 0.20),  # build-up before she vanishes
    (25.68, 0.70, 0.22),
]
BLACKOUT = (25.93, 26.30)   # lamp dies while Mom glitches out; comes back colder


def flicker(T):
    v = 1.0
    for t0, d, du in FLICKER_DIPS:
        v -= _dip(T, t0, d, du)
    b0, b1 = BLACKOUT
    if b0 - 0.06 <= T < b1 + 0.6:
        if T < b0:
            v = min(v, 1.0 - 0.8 * (T - (b0 - 0.06)) / 0.06)
        elif T < b1:
            v = 0.2
        else:  # recovers to a dimmer, colder level
            u = min(1.0, (T - b1) / 0.6)
            v = 0.2 + 0.65 * (1 - (1 - u) ** 3)
    elif T >= b1 + 0.6:
        v = 0.85
    return max(0.0, v)
