#!/usr/bin/env python3
"""
Audio stage: per-beat narration (one consistent voice) + one instrumental BGM.

Narration uses xai/tts-v1 (a real multilingual TTS: named `voice_id` + language),
so every beat is spoken in the same voice — this sidesteps Omni's clip-to-clip
voice drift.

VOICE CLONING: set `voice.clone_ref` to a local audio sample and narration
switches to bytedance/seed-audio-1.0 with the sample as @audio1. Seed-Audio is a
general *sound* model — bare narration gives it wildly inconsistent lengths —
but with a pinned speaker AND the studio-clean directive baked into
CLONE_TEMPLATE below, timing is stable (validated 2026-07-17: 62 words in
19.3s, verbatim, one natural 0.5s pause). Per-beat generation keeps beat
alignment robust either way.

Usage: python3 audio.py <project_dir>   (default: out/tang-30s)
"""
import base64
import json
import os
import subprocess
import sys

from atlas_cloud import STOP_ERRORS
from project_io import atomic_write_json, check_media, file_sig, sig
from provider import get_provider, PaidItem, run_paid_items, print_summary

# xai/tts-v1 is a clean, predictable multilingual TTS (named voices + language
# select) — the default. Seed-Audio handles voice cloning (see CLONE_TEMPLATE)
# and SFX; never hand it bare narration without a pinned speaker.
VOICE_MODEL = "xai/tts-v1"
CLONE_MODEL = "bytedance/seed-audio-1.0"
MUSIC_MODEL = "minimax/music-2.6"

# `language` values xai/tts-v1 documents (Atlas Cloud model page, checked 2026-11-03):
# "auto" + these 20 codes. Kazakh ("kk") is NOT listed. Anything else is unconfirmed.
XAI_TTS_LANGUAGES = {"auto", "en", "zh", "ar-eg", "ar-sa", "ar-ae", "bn", "fr", "de", "hi", "id",
                     "it", "ja", "ko", "pt-br", "pt-pt", "ru", "es-mx", "es-es", "tr", "vi"}

# Music is chosen explicitly per film. "music": "<description>" is used as-is;
# "music": "neutral" picks this culture-neutral preset. With no "music" at all NO
# background music is generated (nothing random, nothing culture-specific by default;
# the old default was Chinese guzheng/erhu).
NEUTRAL_MUSIC = ("neutral modern documentary underscore, soft piano and warm synth pads over "
                 "light steady percussion, instrumental, no vocals, unobtrusive under narration")
MUSIC_KW = dict(is_instrumental=True, format="mp3")

# Letters used by Kazakh (and absent from Russian). If narration contains them while
# `language` is not an explicitly opted-in one, the text is treated as unconfirmed
# Kazakh even if `language` says "auto" or "ru" (both would pass the documented list).
KAZAKH_LETTERS = set("әғқңөұүһіӘҒҚҢӨҰҮҺІ")

# Every clause is load-bearing: the speaker pin + "clean dry studio vocal only"
# block is what makes seed-audio's timing beat-alignable (without it the model
# invents pauses and SFX). `persona` tunes delivery (documentary narrator,
# luxury voice-over, ...); default suits explainers.
CLONE_TEMPLATE = (
    "**Speaker A** @audio1 keeps their own vocal timbre and speaks fluent natural "
    "{language} with a neutral accent, upbeat pace, crisp articulation, friendly and "
    "energetic like a {persona}. Clean dry studio vocal only — no background music, "
    "no sound effects, no room noise or reverb. They say: \"{script}\""
)
# languages the original skill shipped clone prompts for (en is the validated one)
LANG_NAMES = {"en": "English", "zh": "Mandarin Chinese", "ja": "Japanese",
              "ko": "Korean", "es": "Spanish", "fr": "French", "de": "German"}
EXTRA_LANG_NAMES = {"ru": "Russian", "kk": "Kazakh"}      # named, but NOT validated for cloning


def probe_dur(path: str) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def voice_setup(doc):
    voice = doc.get("voice", {})
    v = {"voice": voice,
         "voice_id": voice.get("voice_id", "leo"),          # named male documentary-ish voice
         "language": voice.get("language", doc.get("language", "en")),
         "speed": float(voice.get("speed", 1.0)),
         "clone_ref": voice.get("clone_ref"),               # local audio sample -> clone
         "persona": voice.get("persona", "YouTube tutorial creator")}
    v["ref_sig"] = file_sig(v["clone_ref"]) if v["clone_ref"] else None
    return v


def narration_request(v, text):
    """(model, submit kwargs without the reference audio, signature) for one beat."""
    if v["clone_ref"]:
        lang_name = LANG_NAMES.get(v["language"]) or EXTRA_LANG_NAMES.get(v["language"], v["language"])
        kw = dict(text=CLONE_TEMPLATE.format(language=lang_name, persona=v["persona"], script=text),
                  format="mp3", sample_rate=44100)
        return CLONE_MODEL, kw, sig(CLONE_MODEL, kw, v["ref_sig"])
    kw = dict(text=text, language=v["language"], voice_id=v["voice_id"], codec="mp3",
              sample_rate=44100, speed=v["speed"])
    return VOICE_MODEL, kw, sig(VOICE_MODEL, kw)


def music_choice(doc):
    """(prompt, None) for an explicit choice, or (None, reason) when none was made."""
    m = doc.get("music")
    if isinstance(m, str) and m.strip():
        return (NEUTRAL_MUSIC if m.strip().lower() == "neutral" else m.strip()), None
    return None, ("no music chosen: set \"music\" in beats.json to a description that fits the "
                  "film (e.g. \"warm dombra and soft strings, instrumental\"), or to \"neutral\" "
                  "for a culture-neutral documentary underscore")


def bgm_sig(prompt):
    return sig(MUSIC_MODEL, prompt, MUSIC_KW)


def _state(rec, field, path_field, signature, locked):
    """fresh | locked | stale | unverified | missing  for narration / bgm."""
    if locked:
        return "locked"
    ok = check_media(rec.get(path_field), "audio")[0]
    job = rec.get(field) or {}
    if job.get("sig"):
        if job["sig"] != signature:
            return "stale" if ok else "missing"
        return "fresh" if ok else "missing"
    return "unverified" if ok else "missing"


def narration_state(v, beat):
    model, kw, signature = narration_request(v, beat.get("narration", ""))
    return _state(beat, "narration_job", "narration_audio", signature,
                  beat.get("narration_locked")), (model, kw, signature)


def bgm_state(doc):
    prompt, why = music_choice(doc)
    if prompt is None:
        return ("locked" if doc.get("bgm_locked") else "no_music"), why
    return _state(doc, "bgm_job", "bgm_path", bgm_sig(prompt), doc.get("bgm_locked")), prompt


def language_gate(voice, language, clone_ref, texts=()):
    """None if the narration language is confirmed for the model in use, else a
    warning text. Unconfirmed languages need an explicit, deliberate opt-in
    ("voice": {"language_unverified_ok": true}) — set by the USER after a 1-beat test,
    never automatically."""
    lang = str(language).strip().lower()
    kk_text = any(KAZAKH_LETTERS & set(t or "") for t in texts)
    if clone_ref:
        model, known, ok = CLONE_MODEL, sorted(LANG_NAMES), lang in LANG_NAMES
    else:
        model, known, ok = VOICE_MODEL, sorted(XAI_TTS_LANGUAGES), lang in XAI_TTS_LANGUAGES
    shown = language
    if ok and kk_text:                      # e.g. "auto"/"ru" with Kazakh text
        ok, shown = False, f"{language} + Kazakh-specific letters in the text"
    if ok:
        return None
    if voice.get("language_unverified_ok") is True:
        print(f"WARNING: narration language \"{shown}\" is NOT confirmed for {model}; "
              f"proceeding because voice.language_unverified_ok is true (set by the user).")
        return None
    return (f"LANGUAGE NOT CONFIRMED: narration language \"{shown}\" is not in the documented "
            f"list for {model} ({', '.join(known)}); Kazakh is not documented by Atlas Cloud. "
            f"It may be rejected, ignored, or read with the wrong pronunciation. Nothing was "
            f"generated. Options: (1) use a documented language (e.g. \"ru\" with Russian text); "
            f"(2) the USER decides to test ONE beat (about $0.015) and listens; only then the "
            f"user sets \"voice\": {{\"language_unverified_ok\": true}} in beats.json.")


def run(project_dir: str):
    """Narration per beat + one BGM. Safe to re-run: audio whose file passes the
    integrity check and whose inputs (text, voice, language, speed / music prompt)
    are unchanged is reused; out-of-date audio is regenerated; recorded jobs are
    resumed instead of resubmitted; beats.json is saved atomically after every file.
    Audio with no recorded inputs (old project) is never reused or replaced silently:
    set "narration_locked"/"bgm_locked": true to keep it, or delete its path."""
    bpath = os.path.join(project_dir, "beats.json")
    with open(bpath) as f:
        doc = json.load(f)
    save = lambda: atomic_write_json(bpath, doc)
    adir = os.path.join(project_dir, "audio")
    os.makedirs(adir, exist_ok=True)

    prov = get_provider(doc.get("provider"))
    v = voice_setup(doc)
    warn = language_gate(v["voice"], v["language"], v["clone_ref"],
                         [b.get("narration", "") for b in doc["beats"]])
    if warn:
        print(warn)
        return None

    items, skipped, held = [], [], []
    ref_b64 = None
    if v["clone_ref"]:
        with open(v["clone_ref"], "rb") as f:
            ref_b64 = base64.b64encode(f.read()).decode()

    for beat in doc["beats"]:
        key, text = f"narr_{beat['id']}", beat.get("narration", "")
        if not text.strip():
            print(f"[{key}] no narration text in beats.json -> skipped")
            continue
        state, (model, kw, signature) = narration_state(v, beat)
        if state in ("fresh", "locked"):
            skipped.append(key)
            print(f"[{key}] reuse narration ({state})")
            continue
        if state == "unverified":
            held.append(key)
            print(f"[{key}] existing narration has no record of its text/voice (old project) -> "
                  f"not reused, not replaced. Keep it: \"narration_locked\": true; regenerate: "
                  f"delete \"narration_audio\"")
            continue
        if state == "stale":
            print(f"[{key}] narration is OUT OF DATE (text/voice changed) -> new audio")
        if ref_b64:
            kw = dict(kw, references=[{"audio_data": ref_b64}])

        def apply(url, dest, b=beat):
            b["narration_audio"] = dest
            b["narration_dur"] = round(probe_dur(dest), 2)
        items.append(PaidItem(key, beat, "narration_job", signature,
                              (lambda m=model, k=kw: prov.submit_audio(m, **k)),
                              os.path.join(adir, f"{key}.mp3"), apply))

    # BGM: only from an explicit "music" choice; regenerated only when that choice changes.
    state, info = bgm_state(doc)
    if state in ("fresh", "locked"):
        skipped.append("bgm")
        print(f"[bgm] reuse ({state}) {doc.get('bgm_path')}")
    elif state == "no_music":
        held.append("bgm")
        print(f"[bgm] NOT generated - {info}")
    elif state == "unverified":
        held.append("bgm")
        print("[bgm] existing music has no record of its prompt (old project) -> not reused, not "
              "replaced. Keep it: \"bgm_locked\": true; regenerate: delete \"bgm_path\"")
    else:
        if state == "stale":
            print("[bgm] \"music\" changed since the existing track -> new track")

        def apply_bgm(url, dest):
            doc["bgm_path"] = dest
            doc["bgm_dur"] = round(probe_dur(dest), 2)
        items.append(PaidItem("bgm", doc, "bgm_job", bgm_sig(info),
                              (lambda mp=info: prov.submit_audio(MUSIC_MODEL, prompt=mp, **MUSIC_KW)),
                              os.path.join(adir, "bgm.mp3"), apply_bgm))

    save()
    try:
        summary = run_paid_items(prov, items, save, poll_s=4, stall_s=150, deadline_s=600)
    except STOP_ERRORS as e:
        save()
        print(f"STOPPED: {e}\nProgress so far is saved in {bpath}.")
        raise
    summary["blocked"] += held
    save()
    print_summary("audio", summary, skipped)
    print("updated", bpath)
    return summary


if __name__ == "__main__":
    proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "out", "tang-30s")
    try:
        res = run(os.path.abspath(proj))
    except STOP_ERRORS:
        sys.exit(1)                       # message printed, progress saved
    if res and (res["failed"] or res["pending"] or res["blocked"]):
        sys.exit(3)                       # partial: re-run to continue
