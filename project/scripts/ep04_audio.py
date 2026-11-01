"""Episode 04 sound — same engine and chains as ep. 1–3 (audio_build.py): voices, lip-sync, SFX, score, mix."""
import json, os, sys
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import ep04_timeline as T
import voice_lib as V
import audio_build as A
from audio_build import (SR, db, write_wav, reverb, pan, IR_ROOM, IR_HALL, IR_BIG, sfx_vibe, sfx_glitch, sfx_tap, sfx_pop,
                         sfx_tick, sfx_heartbeat, sfx_boom, sfx_footstep, sfx_whoosh, sfx_reverse_swell, sfx_creak, sfx_cloth,
                         sfx_clink, sfx_ping, sfx_swoosh, musicbox, piano, drone, pad, sub_pulse, harmonic, cluster, nf, sos,
                         limiter, duck_key)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EP = os.path.join(ROOT, "ep04")
N = int(T.DURATION * SR)
E = T.EV
RNG = np.random.default_rng(4)


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


# ------------------------------------------------------------------ SFX shared with ep. 3 (synthesised, same approach as audio_build)
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



def rain(dur, k=1.0, muffled=False):
    n = int(dur * SR)
    x = RNG.standard_normal(n)
    x = signal.sosfilt(sos("band", [400, 2500] if muffled else [700, 9000], 2), x)
    drops = np.zeros(n)
    idx = RNG.integers(0, n, int(dur * 60))
    drops[idx] = RNG.uniform(0.2, 1.0, len(idx))
    drops = signal.sosfilt(sos("band", [1500, 6000], 2), drops)
    t = np.arange(n) / SR
    env = np.minimum(1, np.minimum(t / 1.0, (dur - t) / 1.0))
    return (x * 0.05 + drops * 0.3) * env * k


def murmur(dur, k=1.0):
    """Café crowd murmur: band-limited noise with syllabic amplitude modulation."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = signal.sosfilt(sos("band", [250, 1600], 2), RNG.standard_normal(n))
    mod = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t + 1.0))
    env = np.minimum(1, np.minimum(t / 0.8, (dur - t) / 0.4))
    return x * mod * env * 0.05 * k


def dissolve(dur, up=True):
    """Digital erasure: a rising bit-crushed noise sweep."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = RNG.standard_normal(n)
    f0, f1 = (300, 5000) if up else (5000, 300)
    out = np.zeros(n)
    seg = int(0.05 * SR)
    for i in range(0, n, seg):
        f = f0 + (f1 - f0) * i / n
        out[i:i + seg] = signal.sosfilt(sos("band", [f * 0.7, f * 1.3], 2), x[i:i + seg])
    q = np.round(out * 8) / 8
    env = np.sin(np.pi * t / dur) ** 0.8
    return q * env * 0.25


def keytaps(n, gap=0.24):
    out = np.zeros(int((n * gap + 0.2) * SR))
    for i in range(n):
        tp = sfx_tap(0.6)
        a = int(i * gap * SR)
        out[a:a + len(tp)] += tp[: len(out) - a]
    return out


def voices():
    os.makedirs(os.path.join(EP, "voices", "processed"), exist_ok=True)
    os.makedirs(os.path.join(EP, "compositions"), exist_ok=True)
    clips, lips = {}, {}
    for lid, L in T.LINES.items():
        raw = os.path.join(ROOT, L.get("raw", "ep04"), "voices", "raw", L["take"] + ".mp3")
        x = V.process(raw, "operator" if L["who"] == "operator" else "room", who=L["who"])
        clips[lid] = x
        write_wav(os.path.join(EP, "voices", "processed", lid + ".wav"), x)
        lips[lid] = dict(start=round(L["t"] - 0.06, 4), who=L["who"], env=V.lip_env(x))
    json.dump(lips, open(os.path.join(EP, "compositions", "lipsync.json"), "w"))
    return clips


def score():
    m = Bus()
    # cue 1 — the café (deceptively cosy): soft pad + the series motif on a muted piano
    m.add(0.6, pad([nf("D3"), nf("F#3"), nf("A3"), nf("C#4")], 15.8, 1.5, 2.0, 1200), -18)
    for tt, n_ in [(3.2, "E4"), (4.0, "C4"), (4.8, "B3"), (5.6, "G#3")]:
        m.add(tt, piano(nf(n_), 2.6, 0.55), -17)
    m.add(12.4, harmonic(nf("E6"), 4.0), -22)
    # cue 2 — the message / memory: musicbox motif high
    for i, n_ in enumerate(["E6", "C6", "B5", "G#5"]):
        m.add(E["msg1"] + 0.2 + i * 0.5, musicbox(nf(n_), 2.0), -15)
    # cue 3 — observation room: cold digital drone + pulse
    m.add(21.6, drone(nf("A1"), 7.2, 0.25), -11)
    m.add(21.6, harmonic(nf("A6"), 7.0), -21)
    m.add(25.9, sfx_reverse_swell(0.6), -10)
    # cue 4 — erasure + escape: fast pulse
    beat = 60 / 128
    t = E["erase"]
    while t < 47.0:
        m.add(t, sub_pulse(nf("A1") if int((t - E["erase"]) / beat) % 8 < 6 else nf("F1"), beat * 0.8), -10)
        t += beat
    m.add(E["erase"], cluster(3.0), -15)
    m.add(37.4, drone(nf("D2"), 9.6, 0.15), -14)
    # cue 5 — «Я — свидетель»: the motif, slow and warm
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        m.add(47.4 + i * 0.75, musicbox(nf(n_), 2.4), -20)
    m.add(47.0, pad([nf("A2"), nf("E3"), nf("B3"), nf("C4")], 4.0, 1.0, 1.5, 1100), -17)
    # cue 6 — «Начинаю сбор»: sting, rising erasure, whiteout, silence
    m.add(E["sys_witness"], sfx_boom(2.5), -8)
    m.add(54.0, drone(nf("A1"), 3.6, 0.3), -9)
    m.add(E["white_peak"] - 1.0, sfx_reverse_swell(1.0), -7)
    x = m.out()
    x[int(E["cut_black"] * SR):] = 0
    end = Bus()
    end.add(E["end_card"] + 0.05, piano(nf("E3"), 3.2, 1.0) + piano(nf("E2"), 3.2, 0.8), -6)
    for i, n_ in enumerate(["E5", "C5", "B4", "G#4"]):
        end.add(E["end_card"] + 0.9 + i * 0.42, musicbox(nf(n_), 2.0), -9)
    wet = reverb(end.out()[:, 0], IR_BIG, 0.6)
    x[: len(wet)] += wet[: len(x)]
    write_wav(os.path.join(ROOT, "music", "ep04_score.wav"), x)
    return x


SPACE = {"cafe": (IR_ROOM, 0.15), "cafe_dry": (IR_ROOM, 0.08), "operator_room": (IR_ROOM, 0.08), "street": (IR_ROOM, 0.05)}


def main():
    clips = voices()
    dia, sfx, amb = Bus(), Bus(), Bus()
    for lid, x in clips.items():
        L = T.LINES[lid]
        ir, wet = SPACE[L["fx"]]
        dia.add(L["t"] - 0.06, reverb(x, ir, wet))
    D = dia.out()
    # café
    sfx.add(E["wake"] - 0.05, breath(0.45, 2.2), -2)
    sfx.add(E["clink"], sfx_clink(), -8, -0.2)
    for i in range(3):
        sfx.add(5.6 + i * 0.3, reverb(sfx_footstep(), IR_ROOM, 0.2), -14, 0.4)
    sfx.add(E["msg1"] - 0.05, sfx_vibe(table=True), -8)
    sfx.add(E["msg1"], sfx_pop(), -9)
    sfx.add(E["typing"], keytaps(len(T.TYPED) + 1, (E["send"] - 0.3 - E["typing"]) / len(T.TYPED)), -10)
    sfx.add(E["send"], sfx_swoosh(0.3), -10)
    # observation room
    sfx.add(E["alert"], beeps(4, 0.16, 1320), -10)
    sfx.add(E["sys_witness"], beeps(4, 0.16, 1320), -10)
    # erasure
    sfx.add(E["erase"], dissolve(3.0), -6)
    for t0 in T.ERASE_ORDER:
        sfx.add(t0, sfx_glitch(0.35)[: int(0.4 * SR)], -14, 0.4)
    sfx.add(31.2, dissolve(4.0), -15)
    sfx.add(E["stand"], chair_scrape(0.35), -8)
    for i, tt in enumerate(np.arange(E["stand"] + 0.2, E["door"] + 0.4, 0.19)):
        sfx.add(tt, sfx_footstep(), -7, 0.1 + 0.08 * i)
    sfx.add(E["door"], sfx_ping(), -16, 0.7)
    # street: running, the erasure wave, whiteout
    for i, tt in enumerate(np.arange(40.6, 47.0, 0.192)):
        sfx.add(tt, sfx_footstep(), -9 + (1 if i % 2 else 0), 0.15 * ((-1) ** i))
    sfx.add(E["grab"], sfx_cloth(0.35), -10)
    sfx.add(52.0, dissolve(4.6), -6)
    sfx.add(E["white_peak"] - 0.1, sfx_boom(2.0), -6)
    # ambience: café rain behind glass + murmur (until erased), room hum, street rain + city
    amb.add(0.0, rain(E["erase"] + 1.5, 1.0, muffled=True), -10, -0.5)
    amb.add(0.3, murmur(E["erase"] + 0.6), -9, 0.3)
    amb.add(21.6, hum(7.0, 60.0, 1.2), -6)
    amb.add(51.0, hum(3.0, 60.0, 1.2), -6)
    amb.add(37.4, rain(E["cut_black"] - 37.4, 1.4), -6)
    amb.add(37.4, signal.sosfilt(sos("low", 220, 2), RNG.standard_normal(int((E["cut_black"] - 37.4) * SR))) * 0.06, -6)
    M = score()
    M = M - 0.5 * signal.sosfilt(sos("low", 110, 2), M, axis=0)
    M = signal.sosfilt(sos("high", 32, 2), M, axis=0) * db(-4)
    key = duck_key(D)
    SFX = sfx.out() * db(-2) * (1 - 0.65 * key)[:, None]
    MUS = M * db(-3) * (1 - 0.72 * key)[:, None]
    AMB = amb.out() * (1 - 0.5 * key)[:, None]
    mix = D + SFX + AMB + MUS
    mix = limiter(mix, db(-3))
    mix[int(E["cut_black"] * SR):int(E["end_card"] * SR)] = 0
    os.makedirs(os.path.join(ROOT, "renders", "ep04", "stems"), exist_ok=True)
    write_wav(os.path.join(ROOT, "renders", "ep04", "ep04_mix_premaster.wav"), mix)
    for nm, st in (("dialogue", D), ("sfx", SFX), ("music", MUS)):
        write_wav(os.path.join(ROOT, "renders", "ep04", "stems", f"ep04_stem_{nm}.wav"), st)
    print("mix peak dB", 20 * np.log10(np.abs(mix).max() + 1e-9))


if __name__ == "__main__":
    main()
