"""Episode 03 sound — same engine and chains as ep. 1–2 (audio_build.py): voices, lip-sync, SFX, score, mix."""
import json, os, sys
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import ep03_timeline as T
import voice_lib as V
import audio_build as A
from audio_build import (SR, db, write_wav, reverb, pan, IR_ROOM, IR_HALL, IR_BIG, sfx_vibe, sfx_glitch, sfx_tap, sfx_pop,
                         sfx_tick, sfx_heartbeat, sfx_boom, sfx_footstep, sfx_whoosh, sfx_reverse_swell, sfx_creak, sfx_cloth,
                         musicbox, piano, drone, pad, sub_pulse, harmonic, cluster, nf, sos, limiter, duck_key)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EP = os.path.join(ROOT, "ep03")
N = int(T.DURATION * SR)
E = T.EV
RNG = np.random.default_rng(3)


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


# ------------------------------------------------------------------ ep. 3 specific SFX (synthesised, same approach as audio_build)
def chair_scrape(dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = RNG.standard_normal(n)
    f = 260 + 380 * t / dur
    out = np.zeros(n)
    for k in (1, 2, 3):   # resonant squeal partials riding on filtered noise
        out += np.sin(2 * np.pi * np.cumsum(f * k) / SR) * (0.5 / k)
    x = signal.sosfilt(sos("band", [300, 2400], 2), x) * 0.6 + out * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    return x * np.sin(np.pi * t / dur) ** 0.6 * 0.5


def breath(dur=0.55, k=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = signal.sosfilt(sos("band", [500, 3800], 2), RNG.standard_normal(n))
    return x * np.sin(np.pi * t / dur) ** 1.5 * 0.12 * k


def door_slam():
    b = sfx_boom(1.6) * 0.9
    n = int(0.08 * SR)
    click = signal.sosfilt(sos("high", 1800, 2), RNG.standard_normal(n)) * np.exp(-np.arange(n) / (0.012 * SR)) * 0.5
    b[:n] += click
    return b


def clunk():
    """Relay clunk of a stairwell lamp going out + short electric fizz."""
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.05) * 0.6
    fizz = signal.sosfilt(sos("band", [2500, 7000], 2), RNG.standard_normal(n)) * np.exp(-t / 0.08) * 0.12
    return thump + fizz


def hum(dur, f=100.0, k=1.0):
    t = np.arange(int(dur * SR)) / SR
    x = (np.sin(2 * np.pi * f * t) * 0.5 + np.sin(2 * np.pi * 2 * f * t) * 0.3 + np.sin(2 * np.pi * 3 * f * t) * 0.15)
    x += signal.sosfilt(sos("band", [2000, 5000], 2), RNG.standard_normal(len(t))) * 0.05
    env = np.minimum(1, np.minimum(t / 0.5, (dur - t) / 0.5))
    return x * env * 0.06 * k


def beeps(n=5, gap=0.18, f=1760):
    out = np.zeros(int((n * gap + 0.2) * SR))
    for i in range(n):
        t = np.arange(int(0.06 * SR)) / SR
        b = np.sin(2 * np.pi * (f + 220 * (i % 2)) * t) * np.exp(-t / 0.03) * 0.25
        a = int(i * gap * SR)
        out[a:a + len(b)] += b
    return out


def voices():
    os.makedirs(os.path.join(EP, "voices", "processed"), exist_ok=True)
    os.makedirs(os.path.join(EP, "compositions"), exist_ok=True)
    clips, lips = {}, {}
    for lid, L in T.LINES.items():
        if not L["take"]:
            print("WARNING: no take yet for", lid)
            continue
        raw = os.path.join(ROOT, L.get("raw", "ep03"), "voices", "raw", L["take"] + ".mp3")
        x = V.process(raw, L["fx"], who=L["who"])
        clips[lid] = x
        write_wav(os.path.join(EP, "voices", "processed", lid + ".wav"), x)
        lips[lid] = dict(start=round(L["t"] - 0.06, 4), who=L["who"], env=V.lip_env(x))
    json.dump(lips, open(os.path.join(EP, "compositions", "lipsync.json"), "w"))
    return clips


def score():
    m = Bus()
    # cue 1 — the kitchen: deceptively warm pad + the series motif, slightly too slow
    m.add(0.0, pad([nf("A2"), nf("E3"), nf("B3"), nf("C4")], 9.6, 0.8, 1.2, 1300), -16)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        m.add(0.6 + i * 0.7, musicbox(nf(n_), 2.4), -14)
    m.add(E["eyes_red"] - 0.6, cluster(2.4), -14)
    m.add(E["eyes_red"], drone(nf("A1"), 2.4), -12)
    # cue 2 — the run: fast pulse into the slam, then silence
    beat = 60 / 132
    t = E["chair_scrape"]
    while t < E["door_slam"] - 0.05:
        m.add(t, sub_pulse(nf("A1"), beat * 0.8), -9)
        t += beat
    m.add(E["door_slam"] - 1.0, sfx_reverse_swell(1.0), -9)
    # cue 3 — the stairwell: cold drone + high harmonic, sparse
    m.add(E["door_slam"] + 0.6, drone(nf("D2"), 14.0, 0.06), -15)
    m.add(E["arrive"], harmonic(nf("A5"), 6.0), -19)
    m.add(E["nums_flip"] - 0.4, cluster(2.2), -15)
    # cue 4 — the girl: musicbox motif (softer, higher), piano
    for i, n_ in enumerate(["E6", "C6", "B5", "G#5"]):
        m.add(E["girl_reveal"] + 0.4 + i * 0.6, musicbox(nf(n_), 2.2), -16)
    for tt, n_ in [(31.4, "A3"), (33.0, "E4"), (35.3, "C4"), (37.0, "B3"), (38.6, "G#3")]:
        m.add(tt, piano(nf(n_), 3.4, 0.7), -16)
    m.add(35.0, pad([nf("A2"), nf("C3"), nf("E3"), nf("G#3")], 4.8, 1.5, 1.2, 900), -18)
    # cue 5 — the door: rising tension + heartbeats; sting on the double's turn
    m.add(E["handle"] - 0.2, drone(nf("D#2"), 9.5, 0.12), -13)
    m.add(E["handle"], harmonic(nf("E6"), 9.0), -18)
    m.add(E["double_turn"] - 1.0, sfx_reverse_swell(1.0), -8)
    m.add(E["double_turn"], sfx_boom(2.5), -7)
    # cue 6 — the system: digital drone, then the lights die; hard stop at the black
    m.add(E["sys_takeover"], drone(nf("A1"), E["cut_black"] - E["sys_takeover"] + 0.5, 0.25), -11)
    m.add(E["sys_takeover"] + 0.4, harmonic(nf("A6"), 3.8), -20)
    x = m.out()
    x[int(E["cut_black"] * SR):] = 0
    end = Bus()
    end.add(E["end_card"] + 0.05, piano(nf("E3"), 3.2, 1.0) + piano(nf("E2"), 3.2, 0.8), -6)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        end.add(E["end_card"] + 0.9 + i * 0.42, musicbox(nf(n_), 2.0), -9)
    wet = reverb(end.out()[:, 0], IR_BIG, 0.6)
    x[: len(wet)] += wet[: len(x)]
    write_wav(os.path.join(ROOT, "music", "ep03_score.wav"), x)
    return x


SPACE = {"room": (IR_ROOM, 0.12), "whisper": (IR_ROOM, 0.1), "uncanny": (IR_ROOM, 0.18), "stair": (IR_HALL, 0.22),
         "stair_off": (IR_HALL, 0.42), "behind_door": (IR_ROOM, 0.3), "operator": (IR_ROOM, 0.06)}


def main():
    clips = voices()
    dia, sfx, amb, sys_ = Bus(), Bus(), Bus(), Bus()
    for lid, x in clips.items():
        L = T.LINES[lid]
        ir, wet = SPACE[L["fx"]]
        st = reverb(x, ir, wet)
        if L["fx"] == "stair_off":
            st = st * np.array([[1.1, 0.8]])
        dia.add(L["t"] - 0.06, st)
    D = dia.out()
    # kitchen → run
    sfx.add(E["chair_scrape"], chair_scrape(), -8, -0.2)
    for i, tt in enumerate(np.arange(E["run"], E["door_open"], 0.192)):
        sfx.add(tt, sfx_footstep(), -6 - 0.6 * i, 0.1 * ((-1) ** i))
    sfx.add(E["door_open"] - 0.05, sfx_tap(0.8), -6)
    sfx.add(E["door_open"], sfx_whoosh(0.5), -10)
    sfx.add(E["door_slam"], door_slam(), -2)
    for i in range(5):     # panting against the door
        sfx.add(12.0 + i * 0.66, breath(0.5, 1.0 - 0.12 * i), -4)
    sfx.add(E["buzz1"], sfx_vibe(table=False), -8)
    sfx.add(E["msg1"], sfx_pop(), -9)
    for i, tt in enumerate(np.arange(E["stairs_down"], E["arrive"], 0.21)):
        sfx.add(tt, reverb(sfx_footstep(), IR_HALL, 0.35), -7, -0.2 + 0.05 * i)
    for i, tt in enumerate(np.arange(19.4, 20.0, 0.25)):
        sfx.add(tt, reverb(sfx_footstep(), IR_HALL, 0.3), -9)
    for i in range(4):     # the numbers flipping
        sfx.add(E["nums_flip"] + i * 0.32, sfx_glitch(0.18)[: int(0.25 * SR)], -14, (-0.6, 0.5, -0.3, 0.7)[i])
    sfx.add(E["look_up"] - 0.05, sfx_whoosh(0.3), -16)
    sfx.add(E["girl_reveal"] + 0.1, sfx_cloth(0.4), -16, 0.3)
    sfx.add(E["handle"], sfx_creak(0.9, 300), -8)
    sfx.add(E["door_crack"], sfx_creak(1.2, 220), -9)
    sfx.add(E["grab"], sfx_cloth(0.4), -8, -0.2)
    for i in range(3):
        sfx.add(46.6 + i * 0.8, sfx_heartbeat(), -12 + i)
    sys_.add(E["sys_takeover"], sfx_glitch(0.4), -8)
    sys_.add(E["sys_takeover"] + 1.0, beeps(5), -12)
    sys_.add(E["sys_takeover"] + 3.0, beeps(3, 0.3, 1320), -12)
    for t0 in T.LIGHTS_OUT:
        sfx.add(t0, clunk(), -5, 0.0)
    # ambience: kitchen room tone + clock (0–9.4), stairwell hum (cold), warm room leak while the door is open
    rt = A.room_tone(N)
    rt[int(E["cut_black"] * SR):] = 0
    amb.add(0.0, np.stack([rt, np.roll(rt, 2400)], 1), -6)
    for i in range(9):
        amb.add(0.5 + i, sfx_tick(i % 2 == 1), -22, -0.3)
    amb.add(E["door_slam"] + 0.2, hum(T.LIGHTS_OUT[-1] + 0.35 - E["door_slam"]), -6)
    for i in range(int(E["door_crack"]), int(E["sys_takeover"])):
        amb.add(i + 0.5, signal.sosfilt(sos("low", 1800, 2), sfx_tick(i % 2 == 1)), -20, 0.4)
    M = score()
    M = M - 0.5 * signal.sosfilt(sos("low", 110, 2), M, axis=0)
    M = signal.sosfilt(sos("high", 32, 2), M, axis=0) * db(-4)
    key = duck_key(D)
    SFX = (sfx.out() + sys_.out()) * db(-2) * (1 - 0.65 * key)[:, None]
    MUS = M * db(-3) * (1 - 0.72 * key)[:, None]
    mix = D + SFX + amb.out() + MUS
    mix = limiter(mix, db(-3))
    mix[int(E["cut_black"] * SR):int(E["end_card"] * SR)] = 0
    os.makedirs(os.path.join(ROOT, "renders", "ep03", "stems"), exist_ok=True)
    write_wav(os.path.join(ROOT, "renders", "ep03", "ep03_mix_premaster.wav"), mix)
    for nm, st in (("dialogue", D), ("sfx", SFX), ("music", MUS)):
        write_wav(os.path.join(ROOT, "renders", "ep03", "stems", f"ep03_stem_{nm}.wav"), st)
    print("mix peak dB", 20 * np.log10(np.abs(mix).max() + 1e-9))


if __name__ == "__main__":
    main()
