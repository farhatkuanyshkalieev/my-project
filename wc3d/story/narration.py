"""Озвучка притчи: по фразам (Piper, голос Ruslan), точные тайминги для монтажа.
python3 narration.py <папка модели ruslan> -> audio/voice.wav + audio/timeline.json"""
import glob, json, os, subprocess, sys, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "audio")
SR = 44100; LEAD = 1.2; GAP = 0.2; TAIL = 2.2
# (озвучка, подпись (**выделение**), пауза после, length_scale)
SCRIPT = [
    ("Он тащил на плечах целое состояние.", "Он тащил на плечах **ЦЕЛОЕ СОСТОЯНИЕ**", 0.10, 0.88),
    ("Золото, которое копил всю жизнь.", "Золото, которое копил **ВСЮ ЖИЗНЬ**", 0.10, 0.9),
    ("У реки его остановил старик.", "У реки его остановил **СТАРИК**", 0.15, 0.9),
    ("Брось мешок, — сказал старик. — Мост не выдержит.", "«Брось мешок», — сказал старик. «Мост **НЕ ВЫДЕРЖИТ**»", 0.15, 0.92),
    ("Я собирал это всю жизнь! Ни за что!", "«Я собирал это всю жизнь! **НИ ЗА ЧТО!**»", 0.2, 0.84),
    ("Он шагнул на мост. Доски затрещали.", "Он шагнул на мост. Доски **ЗАТРЕЩАЛИ**", 0.25, 0.9),
    ("Мешок тянул вниз. Всё сильнее. Всё глубже.", "Мешок тянул вниз. Всё **СИЛЬНЕЕ**. Всё **ГЛУБЖЕ**", 0.35, 0.95),
    ("И мост рухнул.", "И мост **РУХНУЛ**", 0.7, 0.95),
    ("Золото пошло ко дну, а вместе с ним — и он.", "Золото пошло ко дну, а вместе с ним — **И ОН**", 0.35, 0.95),
    ("Тогда старик протянул руку.", "Тогда старик **ПРОТЯНУЛ РУКУ**", 0.15, 0.92),
    ("Хватайся! Но сначала разожми пальцы.", "«Хватайся! Но сначала **РАЗОЖМИ ПАЛЬЦЫ**»", 0.5, 0.9),
    ("Парень разжал. Мешок исчез в тёмной воде. А он поднялся на берег.", "Парень разжал. Мешок исчез в тёмной воде. А он **ПОДНЯЛСЯ НА БЕРЕГ**", 0.5, 0.92),
    ("Всё, что ты держишь слишком крепко, однажды утянет тебя на дно.", "Всё, что ты держишь слишком крепко, однажды **УТЯНЕТ ТЕБЯ НА ДНО**", 0.5, 0.98),
    ("Отпусти лишнее. Сохрани себя.", "**ОТПУСТИ ЛИШНЕЕ.** Сохрани себя", 0.0, 1.0),
]

def main(model_dir):
    voice = PiperVoice.load(glob.glob(model_dir + "/*.onnx")[0], config_path=glob.glob(model_dir + "/*.onnx.json")[0])
    t = LEAD; chunks = []; ph = []
    for tts, cap, pause, ls in SCRIPT:
        cfg = SynthesisConfig(length_scale=ls, noise_scale=0.82, noise_w_scale=0.95)
        with wave.open(f"{OUT}/_p.wav", "wb") as w:
            voice.synthesize_wav(tts, w, syn_config=cfg)
        with wave.open(f"{OUT}/_p.wav") as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
        nz = np.where(np.abs(x) > 0.01)[0]; x = x[max(0, nz[0] - int(0.02 * sr)): nz[-1] + int(0.05 * sr)]
        d = len(x) / sr; chunks.append((t, x, sr))
        ph.append({"t0": round(t, 3), "t1": round(t + d, 3), "caption": cap, "text": tts})
        t += d + GAP + pause
    total = t + TAIL - GAP
    track = np.zeros(int((total + 1) * SR), np.float32)
    for t0, x, sr in chunks:
        y = np.interp(np.linspace(0, len(x) - 1, int(len(x) * SR / sr)), np.arange(len(x)), x); i = int(t0 * SR); track[i:i + len(y)] += y
    with wave.open(f"{OUT}/voice_raw.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((track / np.abs(track).max() * 0.9 * 32767).astype(np.int16).tobytes())
    chain = ("highpass=f=70,equalizer=f=130:t=q:w=1.0:g=2.5,equalizer=f=300:t=q:w=1.2:g=-1.5,equalizer=f=3200:t=q:w=1.0:g=3,"
             "equalizer=f=6800:t=q:w=2:g=-3.5,acompressor=threshold=-21dB:ratio=3.2:attack=4:release=90:makeup=5,alimiter=limit=0.95")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{OUT}/voice_raw.wav", "-af", chain, f"{OUT}/voice.wav"], check=True)
    os.remove(f"{OUT}/voice_raw.wav"); os.remove(f"{OUT}/_p.wav")
    json.dump({"total": round(total, 3), "phrases": ph}, open(f"{OUT}/timeline.json", "w"), ensure_ascii=False, indent=1)
    for i, p in enumerate(ph): print(i, p["t0"], p["t1"], p["text"][:40])
    print("TOTAL", round(total, 2))
main(sys.argv[1])
