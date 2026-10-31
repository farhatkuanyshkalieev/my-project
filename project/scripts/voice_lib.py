"""Shared voice processing for all episodes (same chains as ep. 1: room / phone / whisper / double)."""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from audio_build import load_mp3, ff_filter, write_wav, db, SR  # noqa: E402

VOICES = {"arman": "g1G73EpCIdK4HUyDiLYF", "double": "g1G73EpCIdK4HUyDiLYF", "mom": "wlkyM0h4j74QgqHxZi4F"}
BASE = "highpass=f=75,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=2"


def speech_span(x, thr_k=0.06):
    env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, "same"))
    idx = np.where(env > max(env.max() * thr_k, 1e-3))[0]
    return (idx[0] / SR, idx[-1] / SR) if len(idx) else (0.0, len(x) / SR)


def process(mp3, fx):
    x = load_mp3(mp3)
    on, off = speech_span(x)
    a, b = max(0, int((on - 0.06) * SR)), min(len(x), int((off + 0.22) * SR))
    x = x[a:b]
    ramp = np.ones(len(x)); ramp[:480] = np.linspace(0, 1, 480); ramp[-960:] = np.linspace(1, 0, 960)
    x = x * ramp
    if fx == "phone":
        x = ff_filter(x, BASE + ",highpass=f=320,lowpass=f=3300,equalizer=f=1700:t=q:w=1.2:g=5,acrusher=bits=11:mix=0.25,volume=0.9")
    elif fx.startswith("double"):
        x = ff_filter(x, BASE + ",rubberband=pitch=0.928:formant=preserved,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=4200:t=q:w=1:g=-3")
    else:
        x = ff_filter(x, BASE)
    x = x / (np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) + 1e-9) * db(-19)
    if fx == "whisper":
        x *= db(-3)
    return x


def lip_env(x):
    hop = SR // 60
    fr = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    fr = np.clip(fr / (np.percentile(fr, 92) + 1e-9), 0, 1.2) ** 0.75
    sm = np.zeros_like(fr)
    for i in range(len(fr)):
        prev = sm[i - 1] if i else 0
        sm[i] = prev + (fr[i] - prev) * (0.65 if fr[i] > prev else 0.3)
    sm[sm < 0.08] = 0
    return [round(float(v), 3) for v in sm]
