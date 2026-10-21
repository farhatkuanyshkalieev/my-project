"""Episode 3 score + sound design, built from the same instruments as episodes 1-2.

Usage: python3 audio/score_ep03.py src/episodes/ep03/cues.json public/ep03
"""
import json
import sys

import numpy as np
from scipy import signal

from score import (
    SR, Track, bass808, beep, bp, braam, chaching, clap, click, ding, env_ad, glitch, hat, heartbeat, impact, keys,
    kick, lp, midi, noise, norm, pad, ping, pluck, pop, riser, saw, snare, stamp, t_axis, tick, type_burst,
    whoosh, write_wav,
)
from score_ep02 import phone_buzz


def dig():
    """Shovel biting into soil."""
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    crunch = bp(noise(n), 300, 2500) * env_ad(n, 0.002, 0.18, 4)
    thud = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 30)) * t) * env_ad(n, 0.002, 0.12, 4)
    return np.tanh((crunch * 0.8 + thud) * 1.6) * 0.8


def engine(dur=2.0):
    """Car idling closer: low pulsing rumble that swells."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 38 + 6 * (t / dur)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    x = lp(x, 400) + lp(noise(n), 200) * 0.3
    return x * np.clip(t / (dur * 0.7), 0, 1) * 0.5


def printer(dur=0.9):
    out = np.zeros(int(dur * SR) + SR // 10)
    tt = 0.0
    while tt < dur:
        n = int(0.03 * SR)
        k = signal.square(2 * np.pi * 1300 * np.arange(n) / SR) * env_ad(n, 0.001, 0.02, 5) * 0.15
        i = int(tt * SR)
        out[i:i + n] += k
        tt += 0.045
    return lp(out, 4000)


def build(cues):
    D = cues["duration"]
    B = cues["beats"]
    S = cues["scenes"]
    music = Track(D)
    sfx = Track(D)
    M = music.add
    X = sfx.add

    Dm, Bb, Gm, A = (50, 53, 57), (46, 50, 53), (43, 46, 50), (45, 49, 52)
    F_, C_ = (53, 57, 60), (48, 52, 55)
    bar = 2.55
    beat = bar / 4

    # --- cold open + choice: drone, clock ticks, tension
    M(pad([midi(26), midi(33)], S["dawn"][0] + 0.4, cutoff=260, attack=0.05), 0, 0.5)
    for i in range(int(S["dawn"][0] / beat)):
        M(tick() * (1.0 if i % 2 == 0 else 0.55), i * beat, 0.35, pan=-0.3)
    M(kick(0.9), B["pay"], 0.6)
    M(kick(0.9), B["run"], 0.6)
    M(braam(2.0) * 0.6, B["voteWin"], 0.5)

    # --- dawn: warm, uneasy keys; reveal sting
    dawn0 = S["dawn"][0]
    for k, ch in enumerate([F_, C_, Dm, Bb]):
        M(keys([midi(m) for m in ch], bar * 1.1), dawn0 + k * bar, 0.3)
    M(pad([midi(41), midi(48)], S["spree"][0] - dawn0, cutoff=500, attack=1.0), dawn0, 0.3)
    M(impact(0.8), B["reveal"], 0.45)

    # --- spree → forest: main trap beat, ironic "luxury" bars during the spree
    beat_start, beat_end = S["spree"][0], S["forest"][0] + (B["headlights"] - S["forest"][0])
    tense_from = S["thread"][0]
    prog = [Dm, Bb, Gm, A]
    nbars = int(np.ceil((beat_end - beat_start) / bar))
    for b in range(nbars):
        t0 = beat_start + b * bar
        ln = min(bar, beat_end - t0)
        if ln <= 0:
            break
        ch = prog[b % 4]
        tense = t0 >= tense_from - 0.01
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
    # forest: the beat drops out until the headlights
    M(pad([midi(26)], B["headlights"] - S["forest"][0] + 0.2, cutoff=170, attack=0.4), S["forest"][0], 0.5)
    M(braam(2.6), B["headlights"], 0.8)
    M(pad([midi(m) for m in Dm], S["choice2"][0] - B["followed"], cutoff=900, attack=0.6), B["followed"], 0.28)

    # --- choice + end
    for at in (B["share"], B["refuse"]):
        M(kick(1.0), at, 0.8)
        M(bass808(midi(26), 1.0), at, 0.7)
    end0 = B["ep4"] - 0.05
    M(pad([midi(50), midi(53), midi(57)], D - end0, cutoff=800, attack=0.2) * np.clip((D - end0 - t_axis(D - end0)) / 1.5, 0, 1), end0, 0.35)
    M(bass808(midi(26), 3.0), end0, 0.7)
    for k, m in enumerate([62, 65, 69, 67, 65, 62, 64, 61]):
        M(pluck(midi(m), 1.6, 0.35), end0 + 0.4 + k * 0.62, 0.2, pan=0.3 * np.sin(k))
    M(kick(0.8), end0, 0.6)

    # ================= SFX =================
    X(phone_buzz(0.8), 0.05, 0.7)
    X(ping() * 0.6, 0.1, 0.4)
    X(whoosh(0.35, bright=1.3), B["pay"] - 0.15, 0.4)
    X(impact(0.6), B["pay"], 0.45)
    X(whoosh(0.35, bright=1.3), B["run"] - 0.15, 0.4)
    X(impact(0.6), B["run"], 0.45)
    X(whoosh(0.4, bright=1.1), B["vote"] - 0.1, 0.35)
    X(riser(1.3) * 0.5, B["vote"], 0.3)
    for k in range(12):  # vote counter ticking
        X(tick(), B["vote"] + 0.1 + k * 0.1, 0.35)
    X(stamp(), B["voteWin"], 0.85)
    X(chaching(), B["voteWin"] + 0.05, 0.35)
    X(whoosh(0.6, up=False, bright=0.6), S["dawn"][0], 0.35)
    X(type_burst(0.7), B["dawn"], 0.3)
    X(phone_buzz(0.5) * 0.5, B["whoWrote"] + 0.3, 0.4)
    X(stamp(), B["name"], 0.55)
    X(type_burst(0.6), B["name"] + 0.1, 0.3)
    X(whoosh(0.5, up=True, bright=1.2), B["envelope"] + 0.1, 0.4)
    X(chaching(), B["envelope"] + 0.85, 0.5)
    X(whoosh(0.5), B["smile"] - 0.1, 0.35)
    X(ding() * 0.6, B["wide"], 0.5)
    X(glitch(0.25), S["spree"][0], 0.35)
    X(type_burst(0.6), B["twoDays"], 0.3)
    for at in (B["chain"], B["rims"], B["restaurant"]):
        X(whoosh(0.3, bright=1.4), at - 0.12, 0.45)
        X(chaching(), at + 0.05, 0.45)
    X(printer(0.9), B["restaurant"] + 0.1, 0.5)
    X(stamp(), B["allCash"], 0.9)
    X(impact(0.6), B["allCash"], 0.45)
    X(glitch(0.25), S["rule"][0], 0.35)
    X(type_burst(0.6), S["rule"][0] + 0.1, 0.3)
    X(pop(800), B["rule"], 0.5)
    X(pop(1000), B["over10k"], 0.5)
    X(whoosh(0.5, up=True), B["report"], 0.4)
    X(printer(0.6), B["report"] + 0.1, 0.4)
    X(stamp(), B["buyer"], 0.8)
    X(whoosh(0.4), S["account"][0], 0.4)
    X(type_burst(1.0, 26), B["analyst"], 0.4)
    X(beep(1500, 0.08), B["salary"], 0.5)
    X(type_burst(B["spentNum"] + 0.7 - B["spent"], 30), B["spent"], 0.35)
    X(beep(330, 0.16), B["spentNum"] + 0.6, 0.5)
    X(beep(220, 0.22), B["spentNum"] + 0.75, 0.5)
    X(whoosh(0.4), S["thread"][0], 0.4)
    for at in (B["thread"], B["t1"], B["t2"]):
        X(stamp(), at, 0.5)
    for at in (B["t1"] - 0.05, B["t2"] - 0.05, B["t3"] - 0.05):
        X(whoosh(0.4, up=True, bright=1.6), at, 0.25)
    X(impact(1.0), B["t3"], 0.7)
    X(stamp(), B["t3"], 0.8)
    # forest
    for k in range(int((B["headlights"] - S["forest"][0]) / 0.63)):
        X(dig(), S["forest"][0] + 0.32 + k * 0.63, 0.6)
    X(engine(B["headlights"] - B["suddenly"] + 2.4), B["suddenly"] - 0.4, 0.6)
    X(impact(1.1), B["headlights"], 0.7)
    X(heartbeat(80, 120, S["choice2"][0] - B["headlights"]), B["headlights"] + 0.2, 0.5)
    X(click(), B["followed"] + 0.3, 0.6)
    X(pop(700), B["split"], 0.5)
    X(whoosh(0.4, up=True), B["half"], 0.4)
    X(stamp(), B["half"] + 0.1, 0.5)
    # choice + end
    X(impact(0.8), B["share"], 0.6)
    X(whoosh(0.35, bright=1.3), B["share"] - 0.15, 0.4)
    X(impact(0.8), B["refuse"], 0.6)
    X(whoosh(0.35, bright=1.3), B["refuse"] - 0.15, 0.4)
    X(pop(1000), B["refuse"] + 0.2, 0.5)
    X(whoosh(0.4), B["comments"], 0.35)
    X(riser(1.0), B["ep4"] - 1.0, 0.3)
    X(impact(0.9), B["ep4"], 0.6)
    X(type_burst(0.9), B["ep4"] + 0.6, 0.3)
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
