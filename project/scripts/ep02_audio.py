"""Episode 02 sound — same engine and chains as ep. 1 (audio_build.py): voices, lip-sync, SFX, score, mix."""
import json, os, sys
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import ep02_timeline as T
import voice_lib as V
import audio_build as A
from audio_build import (SR, db, write_wav, reverb, pan, IR_ROOM, IR_HALL, IR_BIG, sfx_ping, sfx_vibe, sfx_ringtone, sfx_glitch,
                         sfx_tap, sfx_pop, sfx_call_end, sfx_tick, sfx_heartbeat, sfx_boom, sfx_footstep, sfx_whoosh,
                         sfx_reverse_swell, sfx_clink, room_tone, lamp_buzz, musicbox, piano, drone, pad, sub_pulse, harmonic,
                         cluster, nf, sos, limiter, duck_key)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EP = os.path.join(ROOT, "ep02")
N = int(T.DURATION * SR)
E = T.EV


class Bus:
    def __init__(self):
        self.x = np.zeros((N + SR * 4, 2))

    def add(self, t, sig, g=0.0, p=0.0):
        sig = pan(sig, p) if sig.ndim == 1 else sig
        i = int(round(t * SR))
        j = min(len(self.x), i + len(sig))
        self.x[i:j] += sig[: j - i] * db(g)

    def out(self):
        return self.x[:N]


def voices():
    os.makedirs(os.path.join(EP, "voices", "processed"), exist_ok=True)
    os.makedirs(os.path.join(EP, "compositions"), exist_ok=True)
    clips, lips = {}, {}
    for lid, L in T.LINES.items():
        x = V.process(os.path.join(EP, "voices", "raw", L["take"] + ".mp3"), L["fx"])
        clips[lid] = x
        write_wav(os.path.join(EP, "voices", "processed", lid + ".wav"), x)
        lips[lid] = dict(start=round(L["t"] - 0.06, 4), who=L["who"], env=V.lip_env(x))
    json.dump(lips, open(os.path.join(EP, "compositions", "lipsync.json"), "w"))
    return clips


def score():
    m = Bus()
    # cue 1 — cold open in the corridor: low drone + red cluster bed + motif
    m.add(0.0, drone(nf("A1"), 12.6), -12)
    m.add(0.0, cluster(3.2)[::-1] * 0.6, -16)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        m.add(6.7 + i * 0.45, musicbox(nf(n_), 2.2), -12)
    # cue 2 — pulse under the double's explanation
    beat = 60 / 88
    t = 12.4
    k = 0
    while t < 19.6:
        m.add(t, sub_pulse(nf("A1") if (k // 8) % 2 == 0 else nf("F1"), beat * 0.9), -10)
        t += beat
        k += 1
    m.add(12.4, pad([nf("A2"), nf("C3"), nf("E3"), nf("G#3")], 7.4, 2.0, 0.3, 900), -17)
    # cue 3 — the clock: music stops, only ticking; rewind = reverse swell
    m.add(E["clock_rewind"] - 1.0, sfx_reverse_swell(1.0), -8)
    # cue 4 — call / «Не отвечай»: tension harmonic + drone
    m.add(24.0, drone(nf("D#2"), 10.0, 0.07), -13)
    m.add(26.8, harmonic(nf("E6"), 6.0), -17)
    # cue 5 — mom on the phone: sparse piano motif (warm, unsettling)
    for tt, n_ in [(34.5, "E4"), (36.0, "C4"), (37.5, "B3"), (39.5, "G#3"), (41.5, "E4"), (43.3, "C4")]:
        m.add(tt, piano(nf(n_), 3.5, 0.75), -15)
    # cue 6 — the kitchen: deceptively warm pad, then the red flash and the drop
    m.add(44.6, pad([nf("A2"), nf("E3"), nf("B3"), nf("C4")], 8.4, 2.5, 1.0, 1300), -15)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        m.add(45.2 + i * 0.6, musicbox(nf(n_), 2.4), -13)
    m.add(E["mom_glitch"] - 0.05, sfx_glitch(0.25)[: int(0.4 * SR)], -10)
    m.add(E["msg2"], cluster(E["cut_black"] - E["msg2"] + 0.2), -10)
    m.add(E["msg2"], drone(nf("A1"), E["cut_black"] - E["msg2"] + 1), -11)
    x = m.out()
    x[int(E["cut_black"] * SR):] = 0
    end = Bus()
    end.add(E["end_card"] + 0.05, piano(nf("E3"), 3.2, 1.0) + piano(nf("E2"), 3.2, 0.8), -6)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        end.add(E["end_card"] + 0.9 + i * 0.42, musicbox(nf(n_), 2.0), -9)
    wet = reverb(end.out()[:, 0], IR_BIG, 0.6)
    x[: len(wet)] += wet[: len(x)]
    write_wav(os.path.join(ROOT, "music", "ep02_score.wav"), x)
    return x


def main():
    clips = voices()
    dia, sfx, ring, amb, clk = Bus(), Bus(), Bus(), Bus(), Bus()
    for lid, x in clips.items():
        L = T.LINES[lid]
        fx = L["fx"]
        if fx in ("room", "whisper"):
            st = reverb(x, IR_ROOM, 0.12)
        elif fx == "phone":
            st = pan(x, 0.0) * 0.9
        elif fx == "double_offscreen":
            st = reverb(x, IR_HALL, 0.55) * np.array([[0.8, 1.1]])
        else:
            st = reverb(x, IR_HALL, 0.32)
        dia.add(L["t"] - 0.06, st)
    D = dia.out()
    sfx.add(E["step"], sfx_footstep(), -6, 0.25)
    sfx.add(E["buzz1"], sfx_vibe(), -8)
    sfx.add(E["msg1"] - 0.02, sfx_vibe(), -7)
    sfx.add(E["msg1"], sfx_pop(), -9)
    # the clock: loud ticks, tick at 23:18, glitch + rewind whirr, ticks resume
    for i in range(6):
        tt = 19.85 + i
        if tt < E["clock_rewind"] or tt > E["clock_rewind"] + 0.5:
            clk.add(tt, sfx_tick(i % 2 == 1), -6)
    clk.add(E["clock_rewind"] - 0.04, sfx_glitch(0.45), -6)
    clk.add(E["clock_rewind"] + 0.05, sfx_whoosh(0.45)[::-1].copy(), -8)
    sfx.add(E["lamp_flick"], lamp_buzz(24.5, 25.3, T.flicker), 0)
    rg = sfx_ringtone(E["answer"] - E["ring_start"])
    ring.add(E["ring_start"], rg, -9)
    sfx.add(E["answer"] - 0.02, sfx_tap(1.0), -6)
    sfx.add(E["double_gone"], sfx_whoosh(0.4), -14, 0.3)
    sfx.add(44.2, sfx_call_end(), -10)
    sfx.add(E["mug"], sfx_clink(), -11, 0.2)
    sfx.add(E["buzz2"], sfx_vibe(), -7)
    sfx.add(E["msg2"], sfx_pop(), -8)
    for i in range(3):
        sfx.add(54.6 + i * 0.78, sfx_heartbeat(), -10 + i)
    # wall clock ticks in the quiet kitchen moments
    for i in range(int(44.6), int(E["cut_black"])):
        sfx.add(i + 0.5, sfx_tick(i % 2 == 1), -22, -0.2)
    rt = A.room_tone(N)
    rt[int(E["cut_black"] * SR):] = 0
    amb.add(0.0, np.stack([rt, np.roll(rt, 2400)], 1), -6)
    M = score()
    M = M - 0.5 * signal.sosfilt(sos("low", 110, 2), M, axis=0)
    M = signal.sosfilt(sos("high", 32, 2), M, axis=0) * db(-4)
    key = duck_key(D)
    SFX = sfx.out() * db(-2) * (1 - 0.6 * key)[:, None] + ring.out() * db(-2) * (1 - 0.82 * key)[:, None] \
        + clk.out() * db(-2) * (1 - 0.88 * key)[:, None]  # the clock sits under "Каждую ночь." — keep the line clear
    MUS = M * db(-3) * (1 - 0.72 * key)[:, None]
    mix = D + SFX + amb.out() + MUS
    mix = limiter(mix, db(-3))
    mix[int(E["cut_black"] * SR):int(E["end_card"] * SR)] = 0
    write_wav(os.path.join(ROOT, "renders", "ep02", "ep02_mix_premaster.wav"), mix)
    for nm, st in (("dialogue", D), ("sfx", SFX), ("music", MUS)):
        write_wav(os.path.join(ROOT, "renders", "ep02", "stems", f"ep02_stem_{nm}.wav"), st)
    print("mix peak dB", 20 * np.log10(np.abs(mix).max() + 1e-9))


if __name__ == "__main__":
    main()
