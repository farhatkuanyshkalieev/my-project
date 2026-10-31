"""Episode 02 «НЕ СЛУШАЙ ЕГО» — master timeline (seconds). Shared by picture (ep02_shots.py) and sound (ep02_audio.py).
Series standard: references/standard/ (approved ep. 1 look, Arman's blue rim, Mom v3)."""
import math

FPS = 60
DURATION = 62.40
EPISODE = "02"
TITLE = "НЕ СЛУШАЙ ЕГО"

# line id: take (ElevenLabs generation id, ep02/voices/raw/<take>.mp3), start (speech onset), who, fx
LINES = {
    "A1": dict(take="DqPitd3KMSMK584okctZ", t=0.55, who="arman", fx="whisper"),
    "D1": dict(take="ozuN4o8EWPkPAKyc7yr9", t=3.45, who="double", fx="double_hall"),
    "A2": dict(take="IASzU8ZYUjkWj2IsEOzX", t=9.75, who="arman", fx="room"),
    "D2": dict(take="ZRStn9nb1Phq8iUOYIKa", t=12.75, who="double", fx="double_hall"),
    "D3": dict(take="td9aIZ2jc6gdHfbkqbDn", t=17.45, who="double", fx="double_hall"),
    "D4": dict(take="DPp8uJj6oQssHmtyWR6s", t=20.70, who="double", fx="double_offscreen"),
    "D5": dict(take="qK05TNbppUnIS2OnK3Ca", t=30.05, who="double", fx="double_hall"),
    "M1": dict(take="gJHoPysfEzcVNuVyCieR", t=34.45, who="mom_phone", fx="phone"),
    "A3": dict(take="lQo6HZUcIjVCYUELFgGa", t=38.95, who="arman", fx="room"),
    "M2": dict(take="qywC0xbdea9poDqDm1Kz", t=41.45, who="mom_phone", fx="phone"),
    "M3": dict(take="OHYu55FlRlivTDQsAhTf", t=49.45, who="mom", fx="room"),
}

SUBTITLES = [  # (line, text, red keywords, colour) — same style as ep. 1
    ("A1", "Ты… это я?", (), "#ffffff"),
    ("D1", "Видишь? Опять… первым.", ("первым",), "#ffd6d6"),
    ("A2", "Тогда кто из вас… мне пишет?", (), "#ffffff"),
    ("D2", "Я — это ты. Только я… уже ответил.", (), "#ffd6d6"),
    ("D3", "Посмотри на часы.", (), "#ffd6d6"),
    ("D4", "23:17. Каждую ночь.", (), "#ffd6d6"),
    ("D5", "Не отвечай.", ("не", "отвечай"), "#ffd6d6"),
    ("M1", "Арман? Ты почему не спишь?", (), "#cfe3ff"),
    ("A3", "Мам… ты где сейчас?", (), "#ffffff"),
    ("M2", "Дома. На кухне. Иди сюда.", (), "#cfe3ff"),
    ("M3", "Сынок, садись. Чай остывает.", (), "#ffffff"),
]

# per-cue subtitle baseline (px, last line) where the default SUB_Y=1395 would cross a face or the clock readout.
# 820 = dark zone above the heads in corridor close-ups; 440 = above the clock face. Both stay below the TikTok top bar.
SUB_POS = {"D1": 820, "A2": 820, "D2": 820, "D3": 820, "D4": 440, "D5": 820, "M1": 820, "A3": 820, "M2": 820}

SHOTS = [
    ("S01", 0.00, 3.20, "Коридор: двойник выходит из темноты; шёпот Армана «Ты… это я?»"),
    ("S02", 3.20, 6.40, "СКП двойника: «Видишь? Опять… первым.» — указывает на телефон"),
    ("S03", 6.40, 9.40, "Инсерт чат: «НЕ СЛУШАЙ ЕГО. ОН ХОЧЕТ ЗАНЯТЬ ТВОЁ МЕСТО.»"),
    ("S04", 9.40, 12.40, "КП Армана: «Тогда кто из вас… мне пишет?»"),
    ("S05", 12.40, 17.20, "КП двойника: «Я — это ты. Только я… уже ответил.»"),
    ("S06", 17.20, 19.80, "Двойник кивает в сторону кухни: «Посмотри на часы.»"),
    ("S07", 19.80, 24.00, "Инсерт часы: 23:17:59 → 23:18 → откат на 23:17; «Каждую ночь.»"),
    ("S08", 24.00, 26.60, "ДКП Армана: осознание, лампа на кухне мигает"),
    ("S09", 26.60, 29.60, "Инсерт: входящий «МАМА»"),
    ("S10", 29.60, 32.00, "КП двойника: «Не отвечай.»"),
    ("S11", 32.00, 34.00, "Инсерт: Арман всё равно отвечает"),
    ("S12", 34.00, 38.60, "Арман с телефоном у уха; оглядывается — коридор пуст"),
    ("S13", 38.60, 41.20, "КП Армана: «Мам… ты где сейчас?»"),
    ("S14", 41.20, 44.60, "Арман медленно поворачивается к свету кухни: «Дома. На кухне. Иди сюда.»"),
    ("S15", 44.60, 49.00, "Общий кухни через плечо Армана: мама за столом, пар от кружки"),
    ("S16", 49.00, 53.40, "КП мамы: «Сынок, садись. Чай остывает.» — красный проблеск в глазах"),
    ("S17", 53.40, 56.20, "Инсерт: «ЭТО НЕ ОНА.»"),
    ("S18", 56.20, 58.60, "ДКП Армана: взгляд с телефона на маму"),
    ("S19", 58.60, 58.90, "Резкая склейка в чёрный"),
    ("S20", 58.90, 62.40, "Титр «ТОГДА КТО ОНА?»"),
]

EV = dict(
    step=0.9, buzz1=3.95, msg1=6.75, clock_tick=20.2, clock_turn=21.0, clock_rewind=21.9, lamp_flick=24.6,
    ring_start=26.85, answer=33.2, double_gone=37.1, turn_kitchen=42.6, mug=46.0, mom_glitch=52.55,
    buzz2=53.75, msg2=53.85, music_drop=55.9, cut_black=58.6, end_card=58.9, title2=60.3,
)
MSG1 = "НЕ СЛУШАЙ ЕГО. ОН ХОЧЕТ ЗАНЯТЬ ТВОЁ МЕСТО."
MSG2 = "ЭТО НЕ ОНА."
PREV_MSG = "ТЫ. ТОЛЬКО Я УЖЕ ПРОХОДИЛ ЭТО."     # last message of ep. 1 (thread continuity)


def _dip(T, t0, depth, dur=0.16):
    u = (T - t0) / dur
    return depth * math.sin(math.pi * u) ** 2 if 0.0 <= u <= 1.0 else 0.0


def flicker(T):
    """Photosensitivity-safe lamp flicker (≤ 3 dips/s), same rule as ep. 1."""
    v = 1.0
    for t0, d, du in [(24.6, 0.35, 0.16), (24.95, 0.25, 0.14), (29.9, 0.3, 0.15), (52.51, 0.35, 0.36)]:
        v -= _dip(T, t0, d, du)
    return max(0.0, v)
