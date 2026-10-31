"""Episode 03 «ДВЕРЬ 048» — master timeline (seconds). Shared by picture (ep03_shots.py) and sound (ep03_audio.py).
Series standard: references/standard/ (approved ep. 1 look, Arman's blue rim, Mom v3, Girl v3).
Continues straight from ep. 2 («ЭТО НЕ ОНА.»): Arman runs from the kitchen into the stairwell (ПОДЪЕЗД, кв. 048)."""
import math

FPS = 60
DURATION = 61.60
EPISODE = "03"
TITLE = "ДВЕРЬ 048"

# line id: take (ElevenLabs generation id, <raw_dir>/<take>.mp3), start (speech onset), who, fx
# M3 re-uses ep. 2's take of the same line (a deliberate callback: the same words, the same voice, behind the door).
LINES = {
    "M1": dict(take="1l0G6B8GulluFtOg3k0Q", t=0.45, who="mom", fx="room"),
    "A1": dict(take="HqgLEctwwBbLxGIiJhK5", t=3.55, who="arman", fx="room"),
    "M2": dict(take="NHNHxoetg1rLunrttMXc", t=6.15, who="mom", fx="uncanny"),
    "A2": dict(take="6Xtf24XqCOfrmxXXmxbQ", t=19.85, who="arman", fx="stair"),
    "G1": dict(take="LrcAmtRv9WSC0007kL2W", t=26.05, who="girl", fx="stair_off"),
    "A3": dict(take="5a5irp1g0Fqg4umQa6Bt", t=28.45, who="arman", fx="stair"),
    "G2": dict(take=None, t=31.45, who="girl", fx="stair"),
    "G3": dict(take=None, t=35.25, who="girl", fx="stair"),
    "M3": dict(take="OHYu55FlRlivTDQsAhTf", raw="ep02", t=42.45, who="mom", fx="behind_door"),
    "G4": dict(take=None, t=45.65, who="girl", fx="whisper"),
    "O1": dict(take=None, t=51.75, who="operator", fx="operator"),
}

SUBTITLES = [  # (line, text, red keywords, colour) — same style as ep. 1–2
    ("M1", "Сынок, ты чего? Садись.", (), "#ffffff"),
    ("A1", "Где моя мама?", (), "#ffffff"),
    ("M2", "Я здесь. Я всегда здесь.", ("всегда",), "#ffffff"),
    ("A2", "Так. Спокойно. Это просто… тот же этаж.", (), "#ffffff"),
    ("G1", "Ты тоже ходишь по кругу?", ("по", "кругу"), "#ffffff"),
    ("A3", "Ты… ты кто такая?", (), "#ffffff"),
    ("G2", "Я тут давно. Здесь все двери — твои.", ("твои",), "#ffffff"),
    ("G3", "Каждый раз ты убегаешь. И каждый раз возвращаешься.", ("возвращаешься",), "#ffffff"),
    ("M3", "Сынок, садись. Чай остывает.", (), "#ffffff"),
    ("G4", "Не заходи. Там уже есть ты.", ("уже", "есть", "ты"), "#ffffff"),
    ("O1", "Объект 048 вне зоны. Начинаю перезапуск.", ("перезапуск",), "#bfe3ff"),
]

SHOTS = [
    ("S01", 0.00, 3.20, "Кухня: КП мамы — слишком ровная улыбка, голова наклоняется чуть дальше нормы: «Сынок, ты чего? Садись.»"),
    ("S02", 3.20, 5.80, "ДКП Армана: пятится, свет телефона снизу: «Где моя мама?»"),
    ("S03", 5.80, 9.40, "КП мамы: «Я здесь. Я всегда здесь.» — лампа проседает, глаза медленно наливаются красным"),
    ("S04", 9.40, 11.60, "Коридор: Арман бежит к входной двери, она распахивается в холодный свет"),
    ("S05", 11.60, 14.60, "Подъезд: дверь 048 захлопывается, Арман прижимается к ней спиной, тяжело дышит"),
    ("S06", 14.60, 17.20, "Инсерт: «НЕ ВОЗВРАЩАЙСЯ. СПУСКАЙСЯ ВНИЗ.»"),
    ("S07", 17.20, 19.40, "Подъезд: Арман сбегает по лестнице вниз — и выходит на ту же площадку"),
    ("S08", 19.40, 23.20, "СП Армана перед той же дверью 048: «Так. Спокойно. Это просто… тот же этаж.»"),
    ("S09", 23.20, 25.80, "Общий подъезда: номера на всех дверях один за другим становятся «048»"),
    ("S10", 25.80, 28.00, "КП Армана; голос за кадром: «Ты тоже ходишь по кругу?» — резкий взгляд вверх"),
    ("S11", 28.00, 31.20, "Девочка сидит на ступеньках выше; Арман: «Ты… ты кто такая?»"),
    ("S12", 31.20, 35.00, "СП девочки: «Я тут давно. Здесь все двери — твои.»"),
    ("S13", 35.00, 39.60, "КП девочки, неожиданно серьёзно: «Каждый раз ты убегаешь. И каждый раз возвращаешься.»"),
    ("S14", 39.60, 42.00, "Инсерт: ручка двери 048 медленно поворачивается, из щели — тёплый свет"),
    ("S15", 42.00, 45.40, "Арман оборачивается; дверь приоткрыта, из кухни голос мамы: «Сынок, садись. Чай остывает.»"),
    ("S16", 45.40, 48.40, "Девочка хватает Армана за рукав, шёпотом: «Не заходи. Там уже есть ты.»"),
    ("S17", 48.40, 51.40, "Сквозь щель: за кухонным столом рядом с мамой сидит двойник — медленно поворачивается к двери"),
    ("S18", 51.40, 55.20, "Инсерт: экран телефона захвачен системой: «ОБЪЕКТ 048 · ВНЕ ЗОНЫ · ПЕРЕЗАПУСК»"),
    ("S19", 55.20, 57.80, "Общий подъезда: лампы гаснут одна за другой от дальней к ближней"),
    ("S20", 57.80, 58.10, "Чёрный"),
    ("S21", 58.10, 61.60, "Титр «СКОЛЬКО РАЗ ТЫ УЖЕ ЭТО ВИДЕЛ?»"),
]

EV = dict(
    head_tilt=1.6, eyes_red=7.4, chair_scrape=9.35, run=9.6, door_open=10.9, door_slam=11.75, buzz1=14.85, msg1=14.95,
    stairs_down=17.6, arrive=18.95, nums_flip=23.6, look_up=26.6, girl_reveal=28.0, handle=39.9, door_crack=41.2,
    grab=45.45, double_turn=49.3, sys_takeover=51.55, lights_out=55.4, cut_black=57.8, end_card=58.1, title2=59.6,
)
MSG1 = "НЕ ВОЗВРАЩАЙСЯ. СПУСКАЙСЯ ВНИЗ."
LAST_EP2_MSG = "ЭТО НЕ ОНА."                 # last message of ep. 2 (thread continuity)
LIGHTS_OUT = [55.45, 55.95, 56.45, 56.95]      # far → near, one smooth fade each (≤ 2 per second)

# per-cue subtitle baseline (px, last line) where the default SUB_Y=1395 would cross a face; 560 = above the heads and
# above the brass «048» plate in the door shots (the plate is a story element and must stay readable).
SUB_POS = {"A1": 560, "A2": 560, "G1": 560, "G3": 560, "M3": 560, "G4": 560}


def _dip(T, t0, depth, dur=0.16):
    u = (T - t0) / dur
    return depth * math.sin(math.pi * u) ** 2 if 0.0 <= u <= 1.0 else 0.0


def flicker(T):
    """Photosensitivity-safe lamp flicker (≤ 3 dips/s), same rule as ep. 1–2."""
    v = 1.0
    for t0, d, du in [(6.9, 0.3, 0.36), (8.2, 0.25, 0.3)]:
        v -= _dip(T, t0, d, du)
    return max(0.0, v)


def stair_light(T, i):
    """Brightness of stairwell lamp i (0 = far … 3 = near): steady, then a smooth 0.35 s fade-out at LIGHTS_OUT[i]."""
    t0 = LIGHTS_OUT[i]
    if T < t0:
        return 1.0
    u = min(1.0, (T - t0) / 0.35)
    return 1.0 - (3 * u * u - 2 * u * u * u)
