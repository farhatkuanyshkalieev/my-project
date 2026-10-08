"""Озвучка для 3D-ролика: по фразам, с точными таймингами для синхронизации анимации.
python3 narration.py <папка модели ruslan> -> audio/voice.wav + audio/timeline.json"""
import glob, json, os, subprocess, sys, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "audio")
SR = 44100
LEAD, TAIL, GAP = 0.45, 0.75, 0.16

# (озвучка прописью, экранная подпись)
SCRIPT = [
    ("title", [
        ("Две тысячи двадцать шестой.", "2026."),
        ("Самый грандиозный чемпионат мира в истории футбола!", "Самый грандиозный чемпионат мира в истории футбола!"),
    ]),
    ("hosts", [
        ("Впервые — три страны-хозяйки!", "Впервые — три страны-хозяйки!"),
        ("Америка.", "США."),
        ("Канада.", "Канада."),
        ("И Мексика!", "И Мексика!"),
        ("Один континент. Одна большая игра.", "Один континент. Одна большая игра."),
    ]),
    ("numbers", [
        ("Сорок восемь команд — вместо тридцати двух!", "48 команд — вместо 32!"),
        ("Сто четыре матча — вместо шестидесяти четырёх!", "104 матча — вместо 64!"),
        ("Таких масштабов футбол ещё не видел.", "Таких масштабов футбол ещё не видел."),
    ]),
    ("cities", [
        ("Шестнадцать городов.", "16 городов."),
        ("Одиннадцать — в США,", "11 — в США,"),
        ("три — в Мексике,", "3 — в Мексике,"),
        ("и два — в Канаде.", "и 2 — в Канаде."),
        ("От Ванкувера — до Мехико!", "От Ванкувера — до Мехико!"),
    ]),
    ("opening", [
        ("Одиннадцатого июня стадион Ацтека открыл турнир!", "11 июня стадион Ацтека открыл турнир!"),
        ("Мексика — первая страна в истории, которая принимает чемпионат мира в третий раз.",
         "Мексика — первая страна в истории, которая принимает чемпионат мира в третий раз."),
    ]),
    ("format", [
        ("Двенадцать групп по четыре команды.", "12 групп по четыре команды."),
        ("Две лучшие идут дальше,", "Две лучшие идут дальше,"),
        ("и ещё восемь лучших из третьих мест.", "и ещё 8 лучших из третьих мест."),
        ("А дальше — плей-офф. Проиграл — вылетел!", "А дальше — плей-офф. Проиграл — вылетел!"),
    ]),
    ("final", [
        ("Девятнадцатое июля. Стадион Метлайф, Нью-Джерси.", "19 июля. Стадион «Метлайф», Нью-Джерси."),
        ("Финал.", "Финал."),
        ("Одна игра. Один шанс.", "Одна игра. Один шанс."),
        ("И золотой кубок!", "И золотой кубок!"),
    ]),
    ("outro", [
        ("Чемпионат мира две тысячи двадцать шестого.", "Чемпионат мира 2026."),
        ("Футбол, который объединил весь мир!", "Футбол, который объединил весь мир!"),
    ]),
]


def main(model_dir):
    voice = PiperVoice.load(glob.glob(model_dir + "/*.onnx")[0], config_path=glob.glob(model_dir + "/*.onnx.json")[0])
    cfg = SynthesisConfig(length_scale=0.88, noise_scale=0.8, noise_w_scale=0.95)
    timeline, scenes, cursor = [], [], 0.0
    chunks = []  # (abs_start, samples@22050)
    for name, phrases in SCRIPT:
        t = cursor + LEAD
        ph = []
        for tts, cap in phrases:
            path = f"{OUT}/_p.wav"
            with wave.open(path, "wb") as w:
                voice.synthesize_wav(tts, w, syn_config=cfg)
            with wave.open(path) as w:
                x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
                sr = w.getframerate()
            # срезаем тишину по краям, чтобы темп был плотным
            nz = np.where(np.abs(x) > 0.01)[0]
            x = x[max(0, nz[0] - int(0.02 * sr)): nz[-1] + int(0.05 * sr)]
            d = len(x) / sr
            chunks.append((t, x, sr))
            ph.append({"t0": round(t, 3), "t1": round(t + d, 3), "caption": cap})
            t += d + GAP
        length = (t - GAP) + TAIL - cursor
        scenes.append({"name": name, "start": round(cursor, 3), "len": round(length, 3), "phrases": ph})
        cursor += length
    total = cursor
    track = np.zeros(int((total + 1) * SR), np.float32)
    for t0, x, sr in chunks:
        y = np.interp(np.linspace(0, len(x) - 1, int(len(x) * SR / sr)), np.arange(len(x)), x)
        i = int(t0 * SR)
        track[i:i + len(y)] += y
    raw = f"{OUT}/voice_raw.wav"
    with wave.open(raw, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((track / np.abs(track).max() * 0.9 * 32767).astype(np.int16).tobytes())
    # «радио» мастеринг: срез НЧ, тепло, присутствие, де-эссер, компрессия, нормализация
    chain = ("highpass=f=70,equalizer=f=130:t=q:w=1.0:g=2.5,equalizer=f=300:t=q:w=1.2:g=-1.5,"
             "equalizer=f=3200:t=q:w=1.0:g=3,equalizer=f=6800:t=q:w=2:g=-3.5,"
             "acompressor=threshold=-21dB:ratio=3.2:attack=4:release=90:makeup=5,"
             "alimiter=limit=0.95")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", chain, f"{OUT}/voice.wav"], check=True)
    os.remove(raw); os.remove(f"{OUT}/_p.wav")
    json.dump({"total": round(total, 3), "scenes": scenes}, open(f"{OUT}/timeline.json", "w"), ensure_ascii=False, indent=1)
    for s in scenes:
        print(f"{s['name']:8s} start={s['start']:6.2f} len={s['len']:5.2f} phrases={len(s['phrases'])}")
    print("TOTAL", round(total, 2))


main(sys.argv[1])
