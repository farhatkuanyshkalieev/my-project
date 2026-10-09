"""Озвучка: генерирует wav на каждую сцену (Piper, русский голос Denis)."""
import glob, json, os, sys, wave
from piper import PiperVoice

MODEL_DIR = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")

SCENES = [
    ("title",  "Чемпионат мира по футболу две тысячи двадцать шестого года. Самый масштабный турнир в истории."),
    ("hosts",  "Впервые мундиаль принимали сразу три страны: Соединённые Штаты, Канада и Мексика."),
    ("numbers","Вместо тридцати двух команд на поле выходили сорок восемь. А матчей было не шестьдесят четыре, а сто четыре."),
    ("cities", "Игры прошли на шестнадцати стадионах: одиннадцать в США, три в Мексике и два в Канаде."),
    ("opening","Первый матч состоялся одиннадцатого июня на легендарном стадионе Ацтека в Мехико. Мексика стала первой страной, принявшей чемпионат мира в третий раз."),
    ("format", "Сорок восемь команд разделили на двенадцать групп по четыре. Дальше проходили по две лучшие из каждой группы и восемь лучших из команд, занявших третьи места. Так сложилась сетка плей-офф из тридцати двух сборных."),
    ("final",  "Финал состоялся девятнадцатого июля на стадионе Метлайф в штате Нью-Джерси. Борьба за золотой кубок длилась больше месяца."),
    ("outro",  "Праздник футбола, который объединил миллионы болельщиков по всему миру. Футбол — игра, которая принадлежит всем."),
]

voice = PiperVoice.load(glob.glob(MODEL_DIR + "/*.onnx")[0], config_path=glob.glob(MODEL_DIR + "/*.onnx.json")[0])
from piper import SynthesisConfig
cfg = SynthesisConfig(length_scale=1.05)
durs = {}
for name, text in SCENES:
    path = f"{OUT}/{name}.wav"
    with wave.open(path, "wb") as w:
        voice.synthesize_wav(text, w, syn_config=cfg)
    with wave.open(path) as w:
        durs[name] = w.getnframes() / w.getframerate()
    print(name, round(durs[name], 2))
json.dump({"scenes": [s[0] for s in SCENES], "durations": durs}, open(f"{OUT}/durations.json", "w"), indent=1)
