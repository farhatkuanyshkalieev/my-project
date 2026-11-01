"""Episode 04 «КАК ОБЫЧНО?» — master timeline (seconds). Shared by picture (ep04_shots.py) and sound (ep04_audio.py).
Series standard: references/standard/. Continues from ep. 3 («ПЕРЕЗАПУСК»): the loop restarts Arman in the café at 23:17,
but he remembers. New in the standard (ported from the v1 sheets/backgrounds): barista, operator (on screen),
café, street, observation room (engine/sets4.py)."""
import math

FPS = 60
DURATION = 61.40
EPISODE = "04"
TITLE = "КАК ОБЫЧНО?"

LINES = {
    "B1": dict(take="9j5vKxoRExdlVutDP23j", t=6.30, who="barista", fx="cafe"),
    "A1": dict(take="Tz3MqnMqs38ENZKwwNcy", t=9.90, who="arman", fx="cafe"),
    "B2": dict(take="ExHU0UUU64UDzSKqAZYu", t=12.70, who="barista", fx="cafe"),
    "O1": dict(take="oqfuyt58a66kjiiOUbs8", t=22.60, who="operator", fx="operator_room"),
    "O2": dict(take="ON0zrO7f4stggyGFCNSo", t=26.00, who="operator", fx="operator_room"),
    "B3": dict(take="8WZ1cSGoYTeI34EK33zM", t=31.90, who="barista", fx="cafe_dry"),
    "G1": dict(take="cMrxckQFEMHEKnMWgAh2", t=37.80, who="girl", fx="street"),
    "A2": dict(take="SUK6cGyE0gKBWy7uf4kp", t=44.20, who="arman", fx="street"),
    "G2": dict(take="EJiTFDeHtdgqTNA1UD36", t=47.30, who="girl", fx="street"),
    "O3": dict(take="uCGsguniIRX9EHQx5xDZ", t=51.40, who="operator", fx="operator_room"),
}

SUBTITLES = [  # (line, text, red keywords, colour) — same style as ep. 1–3
    ("B1", "Как обычно? Двойной, без сахара.", ("обычно",), "#ffffff"),
    ("A1", "Я… давно здесь сижу?", (), "#ffffff"),
    ("B2", "Каждый вечер. Ровно в 23:17.", ("23:17",), "#ffffff"),
    ("O1", "Объект 048. Память сохранена.", ("память",), "#bfe3ff"),
    ("O2", "Удалите кафе. Немедленно.", ("удалите",), "#bfe3ff"),
    ("B3", "Тебе лучше уйти. Прямо сейчас.", (), "#ffffff"),
    ("G1", "Бежим! Пока они не стёрли улицу.", ("стёрли",), "#ffffff"),
    ("A2", "Кто «они»? Кто ты вообще такая?", (), "#ffffff"),
    ("G2", "Я — свидетель. Я помню все твои круги.", ("свидетель",), "#ffffff"),
    ("O3", "Свидетель найден. Начинаю сбор.", ("сбор",), "#bfe3ff"),
]
SPOKEN = {"B2": "Каждый вечер. Ровно в одиннадцать семнадцать.", "O1": "Объект ноль сорок восемь. Память сохранена."}

SHOTS = [
    ("S01", 0.00, 3.00, "Чёрный → резкий вдох: Арман просыпается за столиком кафе у окна; дождь, неон; часы 23:17"),
    ("S02", 3.00, 5.60, "КП Армана: озирается, не понимает, где он"),
    ("S03", 5.60, 9.60, "Бариста ставит чашку: «Как обычно? Двойной, без сахара.»"),
    ("S04", 9.60, 12.40, "КП Армана: «Я… давно здесь сижу?»"),
    ("S05", 12.40, 16.40, "СКП баристы: «Каждый вечер. Ровно в одиннадцать семнадцать.» — улыбка держится слишком долго"),
    ("S06", 16.40, 19.00, "Инсерт: чат пуст («Сообщений нет») → новое: «ТЫ ПОМНИШЬ?»"),
    ("S07", 19.00, 21.60, "Инсерт: Арман печатает «ПОМНЮ.» и отправляет"),
    ("S08", 21.60, 25.60, "Комната наблюдения: стена мониторов, на одном — Арман в кафе; «ПАМЯТЬ СОХРАНЕНА»"),
    ("S09", 25.60, 28.60, "КП оператора: «Удалите кафе.»"),
    ("S10", 28.60, 31.60, "Кафе стирается: посетители исчезают, окно белеет, бариста замирает"),
    ("S11", 31.60, 35.00, "КП баристы, тихо: «Тебе лучше уйти. Прямо сейчас.»"),
    ("S12", 35.00, 37.40, "Арман вскакивает и бежит к двери"),
    ("S13", 37.40, 40.60, "Улица: девочка под фонарём хватает его за руку: «Бежим! Пока они не стёрли улицу.»"),
    ("S14", 40.60, 44.00, "Общий улицы: они бегут, за спиной дома рассыпаются в белую сетку"),
    ("S15", 44.00, 47.00, "КП Армана на бегу: «Кто «они»? Кто ты вообще такая?»"),
    ("S16", 47.00, 51.00, "КП девочки под фонарём: «Я — свидетель. Я помню все твои круги.»"),
    ("S17", 51.00, 54.00, "Комната наблюдения: на мониторе девочка — «СВИДЕТЕЛЬ ОБНАРУЖЕН»: «Свидетель найден. Начинаю сбор.»"),
    ("S18", 54.00, 57.40, "Улица: белая пустота доходит до них; Арман тянет девочку — всё уходит в белое и гаснет"),
    ("S19", 57.40, 57.70, "Чёрный"),
    ("S20", 57.70, 61.40, "Титр «ЧТО ПОМНИШЬ ТЫ?»"),
]

EV = dict(
    wake=0.55, clink=6.05, msg1=17.2, typing=19.3, send=21.1, alert=22.0, erase=28.8, stand=35.3, door=36.6,
    grab=37.55, sys_witness=51.2, white_start=54.8, white_peak=56.0, cut_black=57.4, end_card=57.7, title2=59.2,
)
MSG1 = "ТЫ ПОМНИШЬ?"
TYPED = "ПОМНЮ."
ERASE_ORDER = [28.9, 29.3, 29.7]              # café customers vanish (smooth 0.4 s fades)

SUB_POS = {"G1": 560, "A2": 560}   # above the heads (street close shots)
SUB_SPLIT = {}


def _dip(T, t0, depth, dur=0.16):
    u = (T - t0) / dur
    return depth * math.sin(math.pi * u) ** 2 if 0.0 <= u <= 1.0 else 0.0


def flicker(T):
    """Photosensitivity-safe lamp flicker (≤ 3 dips/s): the café lamps sag while the café is being erased."""
    v = 1.0
    for t0, d, du in [(29.0, 0.25, 0.4), (30.2, 0.3, 0.4)]:
        v -= _dip(T, t0, d, du)
    return max(0.0, v)


def whiteness(T):
    """Erasure in the final street shot: smooth rise to white, then a smooth fall to near-black before the cut."""
    if T < EV["white_start"]:
        return 0.0
    if T < EV["white_peak"]:
        u = (T - EV["white_start"]) / (EV["white_peak"] - EV["white_start"])
        return 3 * u * u - 2 * u * u * u
    u = min(1.0, (T - EV["white_peak"]) / (EV["cut_black"] - EV["white_peak"]))
    return 1.0 - (3 * u * u - 2 * u * u * u)
