"""Episode 2 score + sound design, built from the same instruments as episode 1 (score.py).

Usage: python3 audio/score_ep02.py src/episodes/ep02/cues.json public/ep02
"""
import json
import sys

import numpy as np
from scipy import signal

from score import (
    SR, Track, bass808, beep, braam, clap, click, ding, env_ad, glitch, hat, heartbeat, impact, keys,
    kick, knock, lp, midi, norm, pad, ping, pluck, pop, riser, saw, snare, stamp, t_axis, tick, type_burst,
    whoosh, write_wav,
)


def phone_buzz(dur=0.9):
    """Phone vibrating on a surface: low square rattle in two pulses."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = signal.square(2 * np.pi * 150 * t) * 0.5 + np.sin(2 * np.pi * 75 * t)
    gate = ((t % 0.45) < 0.32).astype(float)
    return lp(x, 900) * gate * 0.35


def rattle(dur=0.7):
    """Roll-up storage door rattle."""
    out = np.zeros(int(dur * SR) + SR // 10)
    tt = 0.0
    while tt < dur:
        n = int(0.02 * SR)
        k = signal.sawtooth(2 * np.pi * np.random.uniform(300, 600) * np.arange(n) / SR) * env_ad(n, 0.001, 0.015, 5)
        i = int(tt * SR)
        out[i:i + n] += k * 0.3
        tt += 0.028
    return lp(out, 3000)


def metal_clank():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((420, 9), (1130, 12), (2210, 16))) * 0.3


def shutter():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    a = np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 300)
    b = np.zeros(n)
    i = int(0.05 * SR)
    b[i:] = np.sin(2 * np.pi * 1900 * t[: n - i]) * np.exp(-t[: n - i] * 260)
    return (a + b) * 0.4


def boop(f0=520, f1=780):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / t[-1])
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.005, 0.2, 3) * 0.4


def descend():
    """Wanted level dropping: falling blips."""
    out = np.zeros(int(0.8 * SR))
    for k, f in enumerate((1400, 1180, 980, 820, 680)):
        b = beep(f, 0.07)
        i = int(k * 0.09 * SR)
        out[i:i + len(b)] += b
    return out


def build(cues):
    D = cues["duration"]
    B = cues["beats"]
    S = cues["scenes"]
    music = Track(D)
    sfx = Track(D)
    M = music.add
    X = sfx.add

    Dm, Bb, Gm, A = (50, 53, 57), (46, 50, 53), (43, 46, 50), (45, 49, 52)
    prog = [Dm, Bb, Gm, A]
    bar = 2.55
    beat = bar / 4

    # --- cold open: low drone under the knocks and the peephole, lifts on the reveal
    M(pad([midi(26), midi(33)], S["relief"][0] + 0.5, cutoff=260, attack=0.05), 0, 0.5)
    for i in range(int(S["relief"][0] / beat)):
        M(tick() * (1.0 if i % 2 == 0 else 0.55), 1.3 + i * beat, 0.35, pan=-0.3)
    M(keys([midi(m) for m in (53, 57, 60, 64)], 2.2), B["cleaning"] - 0.05, 0.28)
    # witness: tension swell
    M(pad([midi(38), midi(44), midi(45)], S["title"][0] - S["witness"][0] + 0.3, cutoff=900, attack=1.5), S["witness"][0], 0.35)
    M(riser(1.4), S["title"][0] - 1.4, 0.3)

    # --- title + question
    M(braam(3.0), B["worse"], 0.75)

    # --- main beat from the question to the phone
    beat_start, beat_end = S["question"][0] + 0.05, S["phone"][0]
    tense_from = S["analyst"][0]
    nbars = int(np.ceil((beat_end - beat_start) / bar))
    for b in range(nbars):
        t0 = beat_start + b * bar
        ch = prog[b % 4]
        tense = t0 >= tense_from - 0.01
        ln = min(bar, beat_end - t0)
        if ln <= 0:
            break
        M(pad([midi(m) for m in ch], ln + 0.3, cutoff=700 if not tense else 1100, attack=0.3), t0, 0.3)
        root = midi(ch[0] - 24)
        M(bass808(root, beat * 2.6, glide_from=root * 1.5 if b % 4 == 3 else None), t0, 0.75)
        if not tense:
            M(bass808(root, beat * 1.2), t0 + beat * 2.5, 0.6)
        for s in range(16):
            at = t0 + s * beat / 4
            if at >= beat_end:
                break
            if s in ((0, 7, 10) if not tense else (0, 6, 10)):
                M(kick(), at, 0.8)
            if s == 8:
                M(clap(), at, 0.55)
                M(snare(), at, 0.35)
            if s % 2 == 0 or (b % 2 == 1 and s >= 12):
                M(hat(), at, 0.32 if s % 4 else 0.42, pan=0.25)
        if not tense:
            mel = [ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[0] + 12]
            for k, m in enumerate(mel):
                M(pluck(midi(m), 0.9, 0.4), t0 + k * beat / 2, 0.2, pan=-0.35 + 0.1 * (k % 3))
        else:
            t = t_axis(ln)
            x = sum(saw(midi(m + 12), t, d) for m in ch for d in (-0.003, 0.003))
            x = lp(x / 6, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * np.clip(t / 0.2, 0, 1)
            M(x, t0, 0.12, pan=0.2)
    M(impact(0.6), S["analyst"][0], 0.35)

    # --- phone: music drops to a drone + heartbeat
    M(pad([midi(26)], S["choice"][0] - S["phone"][0], cutoff=170, attack=0.6), S["phone"][0], 0.5)

    # --- choice: half-time hits on the two options
    for at in (B["pay"], B["run"]):
        M(kick(1.0), at, 0.8)
        M(bass808(midi(26), 1.0), at, 0.7)
    M(pad([midi(m) for m in Dm], S["end"][0] - B["comments"], cutoff=1000, attack=0.2), B["comments"], 0.25)

    # --- end card outro
    end0 = B["ep3"] - 0.05
    M(pad([midi(50), midi(53), midi(57)], D - end0, cutoff=800, attack=0.2) * np.clip((D - end0 - t_axis(D - end0)) / 1.5, 0, 1), end0, 0.35)
    M(bass808(midi(26), 3.0), end0, 0.7)
    for k, m in enumerate([62, 65, 69, 67, 65, 62, 64, 61]):
        M(pluck(midi(m), 1.6, 0.35), end0 + 0.4 + k * 0.62, 0.2, pan=0.3 * np.sin(k))
    M(kick(0.8), end0, 0.6)

    # ================= SFX =================
    for k, at in enumerate(B["knocks"]):
        X(knock(), at, 1.0 if k != 1 else 0.9)
    X(whoosh(0.5, up=True), B["peep"] - 0.1, 0.45)
    X(impact(0.5), S["peephole"][0], 0.4)
    X(beep(880, 0.25) * 0.6, B["notPolice"] - 0.3, 0.3)
    X(stamp(), B["admin"] + 0.05, 0.55)
    X(type_burst(0.6), B["admin"] + 0.3, 0.3)
    X(pop(900), B["cleaning"], 0.6)
    X(boop(), B["cleaning"] + 0.05, 0.5)
    X(whoosh(0.9, up=False, bright=0.5), B["exhale"], 0.35)
    X(descend(), B["exhale"] + 0.1, 0.55)
    X(whoosh(0.35, bright=1.3), S["witness"][0] - 0.15, 0.45)
    X(impact(0.7), B["bagsSeen"], 0.6)
    X(stamp(), B["bagsSeen"] + 0.05, 0.6)
    X(impact(1.2), B["worse"], 0.75)
    X(glitch(0.3), B["worse"], 0.35)
    X(type_burst(0.9), B["worse"] + 0.3, 0.35)
    X(whoosh(0.5), S["question"][0] - 0.2, 0.45)
    X(stamp(), B["question"], 0.5)
    for k in range(3):
        X(pop(700 + 150 * k), S["question"][0] + 1.0 + k * 0.2, 0.55)
    X(whoosh(0.4), S["options"][0], 0.4)
    # option 1 — bank
    X(type_burst(0.5), B["opt1"], 0.3)
    X(stamp(), B["bank"], 0.55)
    X(type_burst(B["overLine"] - B["deposit"] + 0.3, 26), B["deposit"], 0.3)
    X(beep(1900, 0.1), B["overLine"] + 0.25, 0.5)
    X(whoosh(0.6, up=True, bright=1.2), B["report"] + 0.05, 0.4)
    X(stamp(), B["auto"], 0.85)
    X(impact(0.5), B["auto"], 0.4)
    # option 2 — storage
    X(whoosh(0.4), B["opt2"] - 0.15, 0.4)
    X(type_burst(0.5), B["opt2"], 0.3)
    X(stamp(), B["storage"], 0.55)
    X(rattle(0.7), B["storage"] + 0.4, 0.5)
    X(whoosh(0.35, bright=1.4), B["passport"] - 0.1, 0.4)
    X(stamp(), B["passport"] + 0.1, 0.4)
    for k in range(3):
        X(shutter(), B["cameras"] + k * 0.18, 0.7)
    X(beep(1500, 0.08), B["cameras"] + 0.45, 0.5)
    # option 3 — safe deposit box
    X(whoosh(0.4), B["opt3"] - 0.15, 0.4)
    X(type_burst(0.5), B["opt3"], 0.3)
    X(stamp(), B["safe"], 0.55)
    X(metal_clank(), B["safe"] + 0.45, 0.6)
    for at in (B["chkPassport"], B["chkSign"], B["chkCam"]):
        X(pop(1200), at, 0.6)
    X(impact(0.7), B["again"], 0.6)
    X(stamp(), B["again"] + 0.15, 0.8)
    # fail crosses (same times as Options.tsx)
    for at in (B["opt2"] - 0.25, B["opt3"] - 0.3, B["again"] + 0.35):
        X(beep(330, 0.16), at, 0.45)
        X(beep(220, 0.2), at + 0.12, 0.45)
    # analyst
    X(glitch(0.25), S["analyst"][0], 0.4)
    X(type_burst(1.6, 24), S["analyst"][0] + 0.3, 0.45)
    X(whoosh(0.4), B["board"] - 0.15, 0.4)
    for at in (B["pin1"], B["pin2"], B["pin3"]):
        X(stamp(), at, 0.55)
    for at in (B["pin2"] + 0.15, B["pin3"] + 0.15, B["pin3"] + 0.35):
        X(whoosh(0.4, up=True, bright=1.6), at, 0.25)
    X(impact(0.7), B["pin3"] + 0.6, 0.55)
    X(stamp(), B["pin3"] + 0.6, 0.7)
    # phone
    X(phone_buzz(0.9), B["phoneOn"], 0.9)
    X(heartbeat(70, 112, S["choice"][0] - B["phoneOn"]), B["phoneOn"] + 0.2, 0.5)
    for at in (B["msg1"], B["msg2"], B["msg3"]):
        X(ping() * 0.7, at, 0.5)
    X(stamp(), B["msg3"] + 0.3, 0.45)
    # choice
    X(impact(0.8), B["pay"], 0.6)
    X(whoosh(0.35, bright=1.3), B["pay"] - 0.15, 0.4)
    X(impact(0.8), B["run"], 0.6)
    X(whoosh(0.35, bright=1.3), B["run"] - 0.15, 0.4)
    X(pop(1000), B["run"] + 0.2, 0.5)
    X(whoosh(0.4), B["comments"], 0.35)
    # end card
    X(riser(1.0), B["ep3"] - 1.0, 0.3)
    X(impact(0.9), B["ep3"], 0.6)
    X(type_burst(0.9), B["ep3"] + 0.6, 0.3)
    X(click(), B["follow"], 0.8)
    X(ding(), B["follow"] + 0.25, 0.6)
    X(phone_buzz(0.8), B["tease"], 0.8)
    X(ping() * 0.7, B["tease"] + 0.1, 0.45)
    X(glitch(0.35), B["out"], 0.4)
    return music, sfx


if __name__ == "__main__":
    cues = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    music, sfx = build(cues)
    D = cues["duration"]
    write_wav(f"{out}/music.wav", norm(music.buf, 0.89), D)
    write_wav(f"{out}/sfx.wav", norm(sfx.buf, 0.89), D)
    print("ok")
